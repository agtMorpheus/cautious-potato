/**
 * HR Integration Module
 * 
 * Bridge module for integrating HR state with Abrechnung (billing) module
 * Provides data transformation and event coordination between modules
 * 
 * Phase 2: State Management & Data Layer
 * 
 * @module hrIntegration
 * @version 1.0.0
 */

import {
  getHrState,
  subscribeHr
} from './hrState.js';

import {
  formatEmployeeName,
  getAttendanceSummary
} from './hrUtils.js';

/**
 * HR Integration class for bridging HR and Abrechnung modules
 */
export class HRIntegration {
  /**
   * Create HR Integration instance
   * Automatically sets up event listeners
   */
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Get employee data formatted for Abrechnung (payroll)
   * @param {string} employeeId - Employee ID
   * @param {string} periodStart - Period start date (YYYY-MM-DD)
   * @param {string} periodEnd - Period end date (YYYY-MM-DD)
   * @returns {Object} Payroll data for employee
   */
  getPayrollData(employeeId, periodStart, periodEnd) {
    const state = getHrState();
    
    const employee = state.employees.find(emp => emp.id === employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Get schedules in date range
    const schedules = state.schedules.filter(s => {
      if (s.employeeId !== employeeId) return false;
      const schedDate = new Date(s.weekStartDate);
      return schedDate >= new Date(periodStart) && schedDate <= new Date(periodEnd);
    }).sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate));

    // Get attendance records in date range
    const attendance = state.attendance.filter(att => {
      if (att.employeeId !== employeeId) return false;
      return att.date >= periodStart && att.date <= periodEnd;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate statistics
    const statistics = getAttendanceSummary(attendance);

    return {
      employee: {
        id: employee.id,
        name: formatEmployeeName(employee),
        email: employee.email,
        department: employee.department,
        position: employee.position,
        hoursPerWeek: employee.hoursPerWeek || 40
      },
      period: {
        start: periodStart,
        end: periodEnd
      },
      schedules,
      attendance,
      statistics
    };
  }

  /**
   * Get all employees formatted for payroll processing
   * @param {string} periodStart - Period start date (YYYY-MM-DD)
   * @param {string} periodEnd - Period end date (YYYY-MM-DD)
   * @returns {Array} Array of payroll data for all active employees
   */
  getAllPayrollData(periodStart, periodEnd) {
    const state = getHrState();
    const activeEmployees = state.employees.filter(emp => 
      !emp.archived && emp.employmentStatus === 'active'
    );

    return activeEmployees.map(emp => 
      this.getPayrollData(emp.id, periodStart, periodEnd)
    );
  }

  /**
   * Get schedule summary for department
   * @param {string} department - Department name
   * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
   * @returns {Object} Department schedule summary
   */
  getDepartmentScheduleSummary(department, weekStartDate) {
    const state = getHrState();
    
    // Get employees in department
    const deptEmployees = state.employees.filter(emp => 
      emp.department === department && !emp.archived
    );

    // Get schedules for the week
    const schedules = state.schedules.filter(s => 
      s.weekStartDate === weekStartDate &&
      deptEmployees.some(emp => emp.id === s.employeeId)
    );

    return {
      department,
      weekStartDate,
      employeeCount: deptEmployees.length,
      scheduledCount: schedules.length,
      totalPlannedHours: schedules.reduce((sum, s) => sum + (s.totalHours || 0), 0),
      totalPlannedPoints: schedules.reduce((sum, s) => sum + (s.totalPoints || 0), 0),
      schedules: schedules.map(s => {
        const employee = deptEmployees.find(e => e.id === s.employeeId);
        return {
          ...s,
          employeeName: employee ? formatEmployeeName(employee) : 'Unknown'
        };
      })
    };
  }

  /**
   * Get vacation conflicts for a date range
   * @param {string} department - Department name (optional)
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Array} Array of approved vacations in date range
   */
  getVacationConflicts(department, startDate, endDate) {
    const state = getHrState();
    
    let employees = state.employees.filter(emp => !emp.archived);
    if (department) {
      employees = employees.filter(emp => emp.department === department);
    }

    const employeeIds = new Set(employees.map(emp => emp.id));

    return state.vacation.filter(v => {
      if (!employeeIds.has(v.employeeId)) return false;
      if (v.status !== 'approved') return false;
      
      // Check if vacation overlaps with date range
      return v.startDate <= endDate && v.endDate >= startDate;
    }).map(v => {
      const employee = employees.find(e => e.id === v.employeeId);
      return {
        ...v,
        employeeName: employee ? formatEmployeeName(employee) : 'Unknown',
        department: employee?.department
      };
    });
  }

  /**
   * Get attendance report for a period
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} department - Department filter (optional)
   * @returns {Object} Attendance report
   */
  getAttendanceReport(startDate, endDate, department = null) {
    const state = getHrState();
    
    let employees = state.employees.filter(emp => !emp.archived);
    if (department) {
      employees = employees.filter(emp => emp.department === department);
    }

    const report = {
      period: { start: startDate, end: endDate },
      department: department || 'All',
      employeeCount: employees.length,
      employees: []
    };

    employees.forEach(emp => {
      const attendance = state.attendance.filter(att => 
        att.employeeId === emp.id &&
        att.date >= startDate &&
        att.date <= endDate
      );

      report.employees.push({
        id: emp.id,
        name: formatEmployeeName(emp),
        department: emp.department,
        ...getAttendanceSummary(attendance)
      });
    });

    // Calculate totals
    report.totals = {
      totalDays: report.employees.reduce((sum, e) => sum + e.totalDays, 0),
      presentDays: report.employees.reduce((sum, e) => sum + e.presentDays, 0),
      absentDays: report.employees.reduce((sum, e) => sum + e.absentDays, 0),
      sickDays: report.employees.reduce((sum, e) => sum + e.sickDays, 0),
      vacationDays: report.employees.reduce((sum, e) => sum + e.vacationDays, 0),
      totalHours: report.employees.reduce((sum, e) => sum + e.totalHours, 0)
    };

    return report;
  }

  /**
   * Setup event listeners for HR state changes
   * Dispatches custom events for Abrechnung module integration
   */
  setupEventListeners() {
    // Subscribe to HR state changes
    subscribeHr((state) => {
      // Dispatch general HR data update event
      document.dispatchEvent(new CustomEvent('hrDataUpdated', {
        detail: {
          employeeCount: state.employees.length,
          activeEmployeeCount: state.employees.filter(e => e.employmentStatus === 'active' && !e.archived).length,
          pendingApprovals: state.metadata.pendingApprovals,
          timestamp: new Date().toISOString()
        }
      }));
    });

    // Listen for schedule approval events
    document.addEventListener('hrStateChanged', (event) => {
      if (event.detail && event.detail.eventType === 'schedule:approved') {
        // Notify Abrechnung module that schedule is ready for processing
        document.dispatchEvent(new CustomEvent('hrScheduleReady', {
          detail: event.detail.data
        }));
      }
    });
  }

  /**
   * Register callback for when HR data is updated
   * @param {Function} callback - Callback function (receives update data)
   * @returns {Function} Unsubscribe function
   */
  onHrDataUpdate(callback) {
    const handler = (event) => callback(event.detail);
    document.addEventListener('hrDataUpdated', handler);
    return () => document.removeEventListener('hrDataUpdated', handler);
  }

  /**
   * Register callback for when schedule is approved
   * @param {Function} callback - Callback function (receives schedule data)
   * @returns {Function} Unsubscribe function
   */
  onScheduleReady(callback) {
    const handler = (event) => callback(event.detail);
    document.addEventListener('hrScheduleReady', handler);
    return () => document.removeEventListener('hrScheduleReady', handler);
  }
}

// Export singleton instance
export const hrIntegration = new HRIntegration();

export default hrIntegration;
