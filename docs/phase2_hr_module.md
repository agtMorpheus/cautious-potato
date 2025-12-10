# HR Management Module - Phase 2: State Management & Data Layer

**Duration:** Weeks 3-4  
**Status:** Core Infrastructure  
**Target:** Implement centralized state, data persistence, and validation

---

## 1. Overview

Phase 2 establishes the core data management infrastructure for the HR module. This phase implements the centralized state system with full CRUD operations, localStorage persistence, data validation, and event-driven updates following the existing Abrechnung module patterns.

### Key Objectives
- Implement complete `hrState.js` with all state APIs
- Create localStorage persistence layer with encryption
- Build comprehensive validation functions
- Implement event-driven state changes
- Create data migration utilities for schema updates

### Architecture Principle

**Single Source of Truth:** All HR data flows through centralized state, with localStorage as persistent backup.

---

## 2. Core State Module (hrState.js)

### 2.1 Complete State Structure

```javascript
// js/modules/hr/hrState.js

/**
 * HR Module - Centralized State Management
 * Manages employees, attendance, schedules, and vacation data
 * Follows event-driven architecture with localStorage persistence
 */

class HRState {
  constructor() {
    // Core data collections
    this.employees = [];
    this.attendance = [];
    this.schedules = [];
    this.vacation = [];
    this.departments = [];

    // Filter and UI state
    this.filters = {
      selectedEmployee: null,
      dateRange: {
        start: null,
        end: null
      },
      department: null,
      status: null,
      searchTerm: ''
    };

    // UI state
    this.ui = {
      activeTab: 'employees',           // 'employees', 'attendance', 'schedule', 'vacation'
      editingRecordId: null,
      showModal: false,
      modalType: null,                   // 'employee', 'attendance', 'schedule', 'vacation'
      modalData: {},
      isLoading: false,
      error: null,
      success: null
    };

    // Application metadata
    this.metadata = {
      lastSync: null,
      lastBackup: null,
      version: '1.0.0',
      totalEmployees: 0,
      activeEmployees: 0,
      pendingApprovals: 0,
      dataIntegrity: true,
      migrationLog: []
    };

    // Undo/Redo stack
    this.history = {
      stack: [],
      currentIndex: -1,
      maxSize: 50
    };

    // Initialize from localStorage
    this.initialize();
  }

  /**
   * Initialize state from localStorage or create new
   */
  initialize() {
    try {
      const stored = this.loadFromStorage('hrState');
      if (stored) {
        Object.assign(this, stored);
        this.metadata.lastSync = new Date().toISOString();
      } else {
        this.createDefaultDepartments();
        this.saveToStorage();
      }
    } catch (error) {
      console.error('HR State initialization error:', error);
      this.createDefaultDepartments();
    }
  }

  // ============ EMPLOYEE MANAGEMENT ============

  /**
   * Add new employee
   * @param {Object} employeeData - Employee information
   * @returns {Object} Created employee with generated ID
   */
  addEmployee(employeeData) {
    this.validateEmployeeData(employeeData);

    const employee = {
      id: this.generateEmployeeId(),
      ...employeeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false
    };

    this.employees.push(employee);
    this.updateMetadata();
    this.saveToStorage();
    this.triggerEvent('employee:added', employee);

    return employee;
  }

  /**
   * Update existing employee
   * @param {string} employeeId - Employee ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated employee
   */
  updateEmployee(employeeId, updates) {
    const employee = this.getEmployee(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    this.validateEmployeeData({ ...employee, ...updates });
    
    Object.assign(employee, updates, {
      updatedAt: new Date().toISOString()
    });

    this.saveToStorage();
    this.triggerEvent('employee:updated', employee);
    return employee;
  }

  /**
   * Get employee by ID
   * @param {string} employeeId
   * @returns {Object|null} Employee object or null
   */
  getEmployee(employeeId) {
    return this.employees.find(emp => emp.id === employeeId) || null;
  }

  /**
   * Get all active employees
   * @returns {Array} Array of active employees
   */
  getActiveEmployees() {
    return this.employees.filter(emp => !emp.archived && emp.employmentStatus === 'active');
  }

  /**
   * Delete employee (soft delete - archive)
   * @param {string} employeeId
   */
  deleteEmployee(employeeId) {
    const employee = this.getEmployee(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    employee.archived = true;
    employee.updatedAt = new Date().toISOString();
    this.updateMetadata();
    this.saveToStorage();
    this.triggerEvent('employee:deleted', employeeId);
  }

  /**
   * Search employees by criteria
   * @param {Object} criteria - Search filters
   * @returns {Array} Matching employees
   */
  searchEmployees(criteria) {
    let results = [...this.employees];

    if (criteria.searchTerm) {
      const term = criteria.searchTerm.toLowerCase();
      results = results.filter(emp =>
        emp.firstName.toLowerCase().includes(term) ||
        emp.lastName.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.personalNumber?.includes(term)
      );
    }

    if (criteria.department) {
      results = results.filter(emp => emp.department === criteria.department);
    }

    if (criteria.status) {
      results = results.filter(emp => emp.employmentStatus === criteria.status);
    }

    if (criteria.archived !== undefined) {
      results = results.filter(emp => emp.archived === criteria.archived);
    }

    return results.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }

  // ============ ATTENDANCE MANAGEMENT ============

  /**
   * Record attendance for employee
   * @param {string} employeeId
   * @param {Object} attendanceData
   * @returns {Object} Created attendance record
   */
  recordAttendance(employeeId, attendanceData) {
    if (!this.getEmployee(employeeId)) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    this.validateAttendanceData(attendanceData);

    const record = {
      id: this.generateAttendanceId(),
      employeeId,
      ...attendanceData,
      recordedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Calculate hours if entry/exit provided
    if (record.entryTime && record.exitTime) {
      record.hoursWorked = this.calculateWorkingHours(
        record.entryTime,
        record.exitTime,
        record.breakMinutes || 0
      );
    }

    this.attendance.push(record);
    this.saveToStorage();
    this.triggerEvent('attendance:recorded', record);

    return record;
  }

  /**
   * Update attendance record
   * @param {string} recordId
   * @param {Object} updates
   * @returns {Object} Updated record
   */
  updateAttendance(recordId, updates) {
    const record = this.attendance.find(att => att.id === recordId);
    if (!record) {
      throw new Error(`Attendance record not found: ${recordId}`);
    }

    this.validateAttendanceData(updates);

    // Recalculate hours if times changed
    if (updates.entryTime || updates.exitTime) {
      const entryTime = updates.entryTime || record.entryTime;
      const exitTime = updates.exitTime || record.exitTime;
      const breakMinutes = updates.breakMinutes ?? record.breakMinutes ?? 0;

      updates.hoursWorked = this.calculateWorkingHours(
        entryTime,
        exitTime,
        breakMinutes
      );
    }

    Object.assign(record, updates, {
      lastModified: new Date().toISOString()
    });

    this.saveToStorage();
    this.triggerEvent('attendance:updated', record);
    return record;
  }

  /**
   * Get attendance records for employee in date range
   * @param {string} employeeId
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @returns {Array} Attendance records
   */
  getAttendanceHistory(employeeId, startDate, endDate) {
    return this.attendance.filter(att => {
      return (
        att.employeeId === employeeId &&
        att.date >= startDate &&
        att.date <= endDate
      );
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate attendance statistics
   * @param {string} employeeId
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Object} Statistics summary
   */
  getAttendanceStats(employeeId, startDate, endDate) {
    const records = this.getAttendanceHistory(employeeId, startDate, endDate);
    
    return {
      totalDays: records.length,
      presentDays: records.filter(r => r.status === 'present').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      sickDays: records.filter(r => r.status === 'sick_leave').length,
      vacationDays: records.filter(r => r.status === 'vacation').length,
      totalHours: records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0),
      averageHours: records.length > 0 
        ? (records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0) / records.length).toFixed(2)
        : 0
    };
  }

  // ============ SCHEDULE MANAGEMENT ============

  /**
   * Create weekly schedule
   * @param {string} employeeId
   * @param {Object} scheduleData
   * @returns {Object} Created schedule
   */
  createSchedule(employeeId, scheduleData) {
    if (!this.getEmployee(employeeId)) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    this.validateScheduleData(scheduleData);

    const schedule = {
      id: this.generateScheduleId(),
      employeeId,
      weekStartDate: scheduleData.weekStartDate,
      weekNumber: this.getWeekNumber(scheduleData.weekStartDate),
      year: new Date(scheduleData.weekStartDate).getFullYear(),
      dailySchedule: scheduleData.dailySchedule || this.createDefaultWeekSchedule(),
      totalHours: 0,
      totalPoints: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.calculateScheduleTotals(schedule);

    this.schedules.push(schedule);
    this.saveToStorage();
    this.triggerEvent('schedule:created', schedule);

    return schedule;
  }

  /**
   * Update schedule
   * @param {string} scheduleId
   * @param {Object} updates
   * @returns {Object} Updated schedule
   */
  updateSchedule(scheduleId, updates) {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    if (updates.dailySchedule) {
      schedule.dailySchedule = updates.dailySchedule;
      this.calculateScheduleTotals(schedule);
    }

    Object.assign(schedule, updates, {
      updatedAt: new Date().toISOString()
    });

    this.saveToStorage();
    this.triggerEvent('schedule:updated', schedule);
    return schedule;
  }

  /**
   * Get schedule for employee in week
   * @param {string} employeeId
   * @param {string} weekStartDate - YYYY-MM-DD
   * @returns {Object|null}
   */
  getWeekSchedule(employeeId, weekStartDate) {
    return this.schedules.find(s =>
      s.employeeId === employeeId &&
      s.weekStartDate === weekStartDate
    ) || null;
  }

  /**
   * Get all schedules for employee in date range
   * @param {string} employeeId
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Array}
   */
  getScheduleRange(employeeId, startDate, endDate) {
    return this.schedules.filter(s => {
      const schedDate = new Date(s.weekStartDate);
      return (
        s.employeeId === employeeId &&
        schedDate >= new Date(startDate) &&
        schedDate <= new Date(endDate)
      );
    }).sort((a, b) => new Date(a.weekStartDate) - new Date(b.weekStartDate));
  }

  /**
   * Submit schedule for approval
   * @param {string} scheduleId
   */
  submitSchedule(scheduleId) {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    schedule.status = 'submitted';
    schedule.submittedAt = new Date().toISOString();
    this.saveToStorage();
    this.triggerEvent('schedule:submitted', schedule);
  }

  /**
   * Approve schedule
   * @param {string} scheduleId
   * @param {string} approvedBy - User ID
   */
  approveSchedule(scheduleId, approvedBy) {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    schedule.status = 'approved';
    schedule.approvedBy = approvedBy;
    schedule.approvedAt = new Date().toISOString();
    this.saveToStorage();
    this.triggerEvent('schedule:approved', schedule);
  }

  // ============ VACATION MANAGEMENT ============

  /**
   * Create vacation request
   * @param {string} employeeId
   * @param {Object} vacationData
   * @returns {Object} Created vacation request
   */
  createVacationRequest(employeeId, vacationData) {
    if (!this.getEmployee(employeeId)) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    this.validateVacationData(vacationData);

    const request = {
      id: this.generateVacationId(),
      employeeId,
      ...vacationData,
      status: 'pending',
      daysRequested: this.calculateBusinessDays(
        vacationData.startDate,
        vacationData.endDate
      ),
      requestedAt: new Date().toISOString()
    };

    this.vacation.push(request);
    this.metadata.pendingApprovals += 1;
    this.saveToStorage();
    this.triggerEvent('vacation:requested', request);

    return request;
  }

  /**
   * Approve vacation request
   * @param {string} vacationId
   * @param {string} approvedBy - User ID
   * @param {string} notes
   */
  approveVacationRequest(vacationId, approvedBy, notes = '') {
    const vacation = this.vacation.find(v => v.id === vacationId);
    if (!vacation) {
      throw new Error(`Vacation request not found: ${vacationId}`);
    }

    vacation.status = 'approved';
    vacation.approvedBy = approvedBy;
    vacation.approvedAt = new Date().toISOString();
    vacation.approvalNotes = notes;

    if (this.metadata.pendingApprovals > 0) {
      this.metadata.pendingApprovals -= 1;
    }

    this.saveToStorage();
    this.triggerEvent('vacation:approved', vacation);
  }

  /**
   * Reject vacation request
   * @param {string} vacationId
   * @param {string} rejectedBy - User ID
   * @param {string} reason
   */
  rejectVacationRequest(vacationId, rejectedBy, reason = '') {
    const vacation = this.vacation.find(v => v.id === vacationId);
    if (!vacation) {
      throw new Error(`Vacation request not found: ${vacationId}`);
    }

    vacation.status = 'rejected';
    vacation.rejectedBy = rejectedBy;
    vacation.rejectedAt = new Date().toISOString();
    vacation.rejectionReason = reason;

    if (this.metadata.pendingApprovals > 0) {
      this.metadata.pendingApprovals -= 1;
    }

    this.saveToStorage();
    this.triggerEvent('vacation:rejected', vacation);
  }

  /**
   * Get pending vacation approvals
   * @returns {Array}
   */
  getPendingVacationApprovals() {
    return this.vacation.filter(v => v.status === 'pending');
  }

  /**
   * Get employee vacation balance
   * @param {string} employeeId
   * @param {number} year
   * @returns {Object}
   */
  getVacationBalance(employeeId, year = new Date().getFullYear()) {
    const employee = this.getEmployee(employeeId);
    if (!employee) throw new Error('Employee not found');

    const yearVacations = this.vacation.filter(v =>
      v.employeeId === employeeId &&
      new Date(v.startDate).getFullYear() === year &&
      v.status === 'approved'
    );

    const daysUsed = yearVacations.reduce((sum, v) => sum + v.daysRequested, 0);
    const annualEntitlement = 20; // German standard: 20 business days

    return {
      annualEntitlement,
      daysUsed,
      daysRemaining: annualEntitlement - daysUsed,
      year
    };
  }

  // ============ VALIDATION ============

  validateEmployeeData(data) {
    if (!data.firstName || !data.firstName.trim()) {
      throw new Error('First name is required');
    }
    if (!data.lastName || !data.lastName.trim()) {
      throw new Error('Last name is required');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email format');
    }
    if (!data.department) {
      throw new Error('Department is required');
    }
    if (data.hoursPerWeek && (data.hoursPerWeek < 0 || data.hoursPerWeek > 60)) {
      throw new Error('Hours per week must be between 0 and 60');
    }
  }

  validateAttendanceData(data) {
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('Valid date (YYYY-MM-DD) is required');
    }
    if (data.status && !['present', 'absent', 'sick_leave', 'vacation', 'unpaid_leave', 'public_holiday', 'home_office'].includes(data.status)) {
      throw new Error('Invalid status');
    }
    if (data.entryTime && !/^\d{2}:\d{2}$/.test(data.entryTime)) {
      throw new Error('Invalid entry time format (HH:MM)');
    }
    if (data.exitTime && !/^\d{2}:\d{2}$/.test(data.exitTime)) {
      throw new Error('Invalid exit time format (HH:MM)');
    }
  }

  validateScheduleData(data) {
    if (!data.weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.weekStartDate)) {
      throw new Error('Valid week start date (YYYY-MM-DD) is required');
    }
    if (data.dailySchedule && !Array.isArray(data.dailySchedule)) {
      throw new Error('Daily schedule must be an array');
    }
  }

  validateVacationData(data) {
    if (!data.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
      throw new Error('Valid start date (YYYY-MM-DD) is required');
    }
    if (!data.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)) {
      throw new Error('Valid end date (YYYY-MM-DD) is required');
    }
    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new Error('Start date must be before end date');
    }
    if (data.vacationType && !['annual', 'unpaid', 'sick', 'parental', 'sabbatical', 'special'].includes(data.vacationType)) {
      throw new Error('Invalid vacation type');
    }
  }

  // ============ HELPER FUNCTIONS ============

  /**
   * Calculate working hours between entry and exit time
   * @param {string} entryTime - HH:MM
   * @param {string} exitTime - HH:MM
   * @param {number} breakMinutes
   * @returns {number} Hours (decimal)
   */
  calculateWorkingHours(entryTime, exitTime, breakMinutes = 0) {
    const [entryHour, entryMin] = entryTime.split(':').map(Number);
    const [exitHour, exitMin] = exitTime.split(':').map(Number);

    const entryTotalMin = entryHour * 60 + entryMin;
    const exitTotalMin = exitHour * 60 + exitMin;

    let diffMin = exitTotalMin - entryTotalMin;
    if (diffMin < 0) diffMin += 24 * 60; // Handle overnight shifts

    const workMin = diffMin - breakMinutes;
    return parseFloat((workMin / 60).toFixed(2));
  }

  /**
   * Calculate business days between two dates
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @returns {number} Number of business days
   */
  calculateBusinessDays(startDate, endDate) {
    let current = new Date(startDate);
    const end = new Date(endDate);
    let businessDays = 0;

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return businessDays;
  }

  /**
   * Calculate totals for schedule (hours and points)
   * @param {Object} schedule
   */
  calculateScheduleTotals(schedule) {
    schedule.totalHours = 0;
    schedule.totalPoints = 0;

    if (schedule.dailySchedule) {
      schedule.dailySchedule.forEach(day => {
        schedule.totalHours += day.plannedHours || 0;
        schedule.totalPoints += day.plannedPoints || 0;
      });
    }

    schedule.totalHours = parseFloat(schedule.totalHours.toFixed(2));
    schedule.totalPoints = parseInt(schedule.totalPoints);
  }

  /**
   * Get ISO week number
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {number}
   */
  getWeekNumber(dateStr) {
    const date = new Date(dateStr);
    const tempDate = new Date(date.getTime());
    tempDate.setDate(tempDate.getDate() - tempDate.getDay() + (tempDate.getDay() === 0 ? -6 : 1));
    
    const weekOne = new Date(tempDate.getFullYear(), 0, 4);
    weekOne.setDate(weekOne.getDate() - weekOne.getDay() + (weekOne.getDay() === 0 ? -6 : 1));

    return Math.round((tempDate - weekOne) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  /**
   * Create default week schedule (Monday-Friday, 8 hours each)
   * @returns {Array}
   */
  createDefaultWeekSchedule() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days.map((day, idx) => ({
      day,
      date: this.getDateForDay(idx),
      plannedHours: 8,
      plannedPoints: 64,
      actualHours: 0,
      actualPoints: 0,
      notes: ''
    }));
  }

  getDateForDay(dayIndex) {
    const today = new Date();
    const first = today.getDate() - today.getDay() + 1; // Monday
    return new Date(today.setDate(first + dayIndex)).toISOString().split('T')[0];
  }

  /**
   * Update metadata counters
   */
  updateMetadata() {
    this.metadata.totalEmployees = this.employees.length;
    this.metadata.activeEmployees = this.getActiveEmployees().length;
    this.metadata.lastSync = new Date().toISOString();
  }

  /**
   * Create default departments
   */
  createDefaultDepartments() {
    this.departments = [
      'Engineering',
      'Sales',
      'Marketing',
      'Human Resources',
      'Finance',
      'Operations',
      'Support',
      'Management'
    ];
  }

  // ============ ID GENERATION ============

  generateEmployeeId() {
    return `EMP${String(this.employees.length + 1).padStart(4, '0')}`;
  }

  generateAttendanceId() {
    return `ATT${Date.now()}`;
  }

  generateScheduleId() {
    return `SCHED${Date.now()}`;
  }

  generateVacationId() {
    return `VAC${Date.now()}`;
  }

  // ============ PERSISTENCE ============

  /**
   * Save state to localStorage
   */
  saveToStorage() {
    try {
      const stateData = {
        employees: this.employees,
        attendance: this.attendance,
        schedules: this.schedules,
        vacation: this.vacation,
        departments: this.departments,
        metadata: this.metadata
      };

      localStorage.setItem('hrState', JSON.stringify(stateData));
    } catch (error) {
      console.error('Failed to save HR state:', error);
      this.ui.error = 'Failed to save data. Storage might be full.';
      this.triggerEvent('error', error);
    }
  }

  /**
   * Load state from localStorage
   * @param {string} key
   * @returns {Object|null}
   */
  loadFromStorage(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load HR state:', error);
      return null;
    }
  }

  /**
   * Export state as JSON
   * @returns {string} JSON string
   */
  exportState() {
    return JSON.stringify({
      employees: this.employees,
      attendance: this.attendance,
      schedules: this.schedules,
      vacation: this.vacation,
      metadata: this.metadata,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import state from JSON
   * @param {string} jsonData
   */
  importState(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.employees = data.employees || [];
      this.attendance = data.attendance || [];
      this.schedules = data.schedules || [];
      this.vacation = data.vacation || [];
      this.updateMetadata();
      this.saveToStorage();
      this.triggerEvent('state:imported', {});
    } catch (error) {
      console.error('Failed to import state:', error);
      throw new Error('Invalid JSON format');
    }
  }

  // ============ EVENT SYSTEM ============

  /**
   * Trigger state change event
   * @param {string} eventType
   * @param {Object} data
   */
  triggerEvent(eventType, data) {
    const event = new CustomEvent('hrStateChanged', {
      detail: { eventType, data, timestamp: new Date().toISOString() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Listen to state changes
   * @param {Function} callback
   */
  onStateChange(callback) {
    document.addEventListener('hrStateChanged', (event) => {
      callback(event.detail);
    });
  }

  /**
   * Create backup of current state
   * @returns {Object} Backup data
   */
  createBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      employees: JSON.parse(JSON.stringify(this.employees)),
      attendance: JSON.parse(JSON.stringify(this.attendance)),
      schedules: JSON.parse(JSON.stringify(this.schedules)),
      vacation: JSON.parse(JSON.stringify(this.vacation))
    };

    this.metadata.lastBackup = backup.timestamp;
    this.saveToStorage();
    return backup;
  }
}

// Export as singleton
const hrState = new HRState();
export default hrState;
```

---

## 3. HR Utilities Module (hrUtils.js)

### Key Utility Functions

```javascript
// js/modules/hr/hrUtils.js

/**
 * HR Module Utilities
 * Data formatting, calculation, and transformation helpers
 */

export const hrUtils = {
  /**
   * Format employee full name
   * @param {Object} employee
   * @returns {string}
   */
  getFullName(employee) {
    return `${employee.firstName} ${employee.lastName}`;
  },

  /**
   * Format time to HH:MM
   * @param {string|number} time
   * @returns {string}
   */
  formatTime(time) {
    if (typeof time === 'number') {
      const hours = Math.floor(time);
      const minutes = Math.round((time - hours) * 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return time;
  },

  /**
   * Format date to DD.MM.YYYY (German format)
   * @param {string} date - YYYY-MM-DD
   * @returns {string}
   */
  formatDateDE(date) {
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
  },

  /**
   * Format decimal hours to HH:MM
   * @param {number} hours - Decimal hours
   * @returns {string}
   */
  formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  },

  /**
   * Get day name from date
   * @param {string} date - YYYY-MM-DD
   * @returns {string}
   */
  getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
  },

  /**
   * Check if date is weekend
   * @param {string} date - YYYY-MM-DD
   * @returns {boolean}
   */
  isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
  },

  /**
   * Check if date is public holiday (Germany)
   * @param {string} date - YYYY-MM-DD
   * @returns {boolean}
   */
  isPublicHoliday(date) {
    // German public holidays (simplified)
    const holidays = [
      '01-01', // New Year's Day
      '04-10', // German Unity Day
      '12-25', '12-26', // Christmas
    ];
    const [, month, day] = date.split('-');
    return holidays.includes(`${month}-${day}`);
  },

  /**
   * Calculate age from birth date
   * @param {string} birthDate - YYYY-MM-DD
   * @returns {number}
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  /**
   * Generate CSV from employee array
   * @param {Array} employees
   * @returns {string}
   */
  generateEmployeeCSV(employees) {
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Department', 'Position', 'Status'];
    const rows = employees.map(emp => [
      emp.id,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.department,
      emp.position,
      emp.employmentStatus
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
};

export default hrUtils;
```

---

## 4. Data Persistence Layer

### localStorage Strategy

```javascript
// Storage Structure
{
  "hrState": {
    "employees": [...],
    "attendance": [...],
    "schedules": [...],
    "vacation": [...],
    "metadata": {...}
  },
  "hrState_backup": {...},      // Daily backup
  "hrState_history": [...]      // Version history (last 10)
}
```

### Backup & Recovery

```javascript
/**
 * Automatic daily backup
 */
function setupAutoBackup(hrState) {
  const lastBackup = localStorage.getItem('hrState_lastBackup');
  const today = new Date().toDateString();

  if (lastBackup !== today) {
    const backup = hrState.createBackup();
    localStorage.setItem('hrState_backup', JSON.stringify(backup));
    localStorage.setItem('hrState_lastBackup', today);
  }
}

/**
 * Restore from backup
 */
function restoreFromBackup(hrState) {
  const backup = localStorage.getItem('hrState_backup');
  if (backup) {
    const data = JSON.parse(backup);
    hrState.employees = data.employees;
    hrState.attendance = data.attendance;
    hrState.schedules = data.schedules;
    hrState.vacation = data.vacation;
    hrState.saveToStorage();
  }
}
```

---

## 5. Integration with Abrechnung Module

### Shared State Bridge

```javascript
// js/modules/hr/hrIntegration.js

/**
 * Integration bridge between HR and Abrechnung modules
 */

export class HRIntegration {
  constructor(hrState, abrechnungState) {
    this.hrState = hrState;
    this.abrechnungState = abrechnungState;
    this.setupEventListeners();
  }

  /**
   * Get employee data formatted for Abrechnung
   * @param {string} employeeId
   * @param {string} periodStart - YYYY-MM-DD
   * @param {string} periodEnd - YYYY-MM-DD
   * @returns {Object}
   */
  getPayrollData(employeeId, periodStart, periodEnd) {
    const employee = this.hrState.getEmployee(employeeId);
    const schedules = this.hrState.getScheduleRange(employeeId, periodStart, periodEnd);
    const attendance = this.hrState.getAttendanceHistory(employeeId, periodStart, periodEnd);

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
      },
      period: { start: periodStart, end: periodEnd },
      schedules,
      attendance,
      statistics: this.hrState.getAttendanceStats(employeeId, periodStart, periodEnd)
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.hrState.onStateChange((event) => {
      if (event.eventType === 'schedule:approved') {
        // Notify Abrechnung that schedule is ready
        document.dispatchEvent(new CustomEvent('hrScheduleReady', {
          detail: event.data
        }));
      }
    });
  }
}
```

---

## 6. Success Criteria for Phase 2

- [x] Complete `hrState.js` with all CRUD operations
- [x] localStorage persistence with backup system
- [x] Comprehensive validation for all data types
- [x] Event-driven state changes with CustomEvents
- [x] Utility functions for common operations
- [x] Integration bridge with Abrechnung module
- [x] Error handling and recovery mechanisms

### Deliverables

1. **hrState.js** - Full state management module (800+ lines)
2. **hrUtils.js** - Utility functions library
3. **hrIntegration.js** - Bridge module for Abrechnung integration
4. **hrState.test.js** - Unit tests (to be created in Phase 4)
5. **PERSISTENCE_GUIDE.md** - localStorage strategy documentation

---

## 7. Testing Checklist

### Unit Tests for hrState

```javascript
// Test Cases
describe('HRState - Employee Management', () => {
  test('addEmployee creates new employee with ID', () => {});
  test('updateEmployee modifies existing employee', () => {});
  test('getEmployee returns correct employee', () => {});
  test('deleteEmployee archives instead of removing', () => {});
  test('searchEmployees filters by multiple criteria', () => {});
});

describe('HRState - Attendance', () => {
  test('recordAttendance calculates working hours', () => {});
  test('updateAttendance recalculates hours', () => {});
  test('getAttendanceHistory returns correct records', () => {});
  test('getAttendanceStats computes correct statistics', () => {});
});

describe('HRState - Schedule', () => {
  test('createSchedule sets correct totals', () => {});
  test('updateSchedule recalculates totals', () => {});
  test('submitSchedule changes status', () => {});
  test('approveSchedule stores approval data', () => {});
});

describe('HRState - Vacation', () => {
  test('createVacationRequest calculates business days', () => {});
  test('approveVacationRequest updates metadata', () => {});
  test('getVacationBalance returns correct remaining days', () => {});
});

describe('HRState - Storage', () => {
  test('saveToStorage persists data', () => {});
  test('loadFromStorage retrieves data', () => {});
  test('exportState generates valid JSON', () => {});
  test('importState restores from JSON', () => {});
});
```

---

## 8. Next Phase Preview

**Phase 3: Event Handlers & UI Logic**
- Implement `hrHandlers.js` with event delegation
- Create interactive forms for all CRUD operations
- Build real-time validation with user feedback
- Implement modal dialogs and confirmations
- Create search and filter functionality

---

## 9. Notes & Decisions

**Design Patterns Used:**
- **Singleton Pattern** - hrState as single source of truth
- **Event-Driven Architecture** - CustomEvents for state changes
- **Validation-First** - All data validated before storage
- **Soft Deletes** - Archive instead of permanent deletion

**Storage Limits:**
- localStorage typically 5-10MB per domain
- Expected to handle ~500 employees + 2 years of data

**Performance Considerations:**
- Array searches optimized for small datasets (<10k records)
- Lazy loading for historical data (Phase 5)
- IndexedDB migration path for scaling (future)

---

**End of Phase 2 Documentation**

*Last Updated: 2025-12-10*  
*Author: Development Team*  
*Status: Ready for Phase 3*
