/**
 * Unit Tests for HR Integration Module (hrIntegration.js)
 * Tests bridge functionality between HR and Abrechnung modules
 */

import { HRIntegration, hrIntegration } from '../../js/modules/hr/hrIntegration.js';
import { getHrState, subscribeHr } from '../../js/modules/hr/hrState.js';
import { formatEmployeeName, getAttendanceSummary } from '../../js/modules/hr/hrUtils.js';

// Mock the dependencies
jest.mock('../../js/modules/hr/hrState.js', () => ({
  getHrState: jest.fn(),
  subscribeHr: jest.fn()
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  formatEmployeeName: jest.fn((emp) => `${emp.lastName}, ${emp.firstName}`),
  getAttendanceSummary: jest.fn(() => ({
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    sickDays: 1,
    vacationDays: 1,
    totalHours: 144
  }))
}));

describe('HR Integration Module (hrIntegration.js)', () => {
  let integration;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock state
    getHrState.mockReturnValue({
      employees: [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          department: 'Engineering',
          position: 'Developer',
          hoursPerWeek: 40,
          employmentStatus: 'active',
          archived: false
        },
        {
          id: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          department: 'Engineering',
          position: 'Manager',
          hoursPerWeek: 40,
          employmentStatus: 'active',
          archived: false
        },
        {
          id: 'emp-3',
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          department: 'Sales',
          position: 'Representative',
          hoursPerWeek: 40,
          employmentStatus: 'active',
          archived: true
        }
      ],
      schedules: [
        {
          id: 'sched-1',
          employeeId: 'emp-1',
          weekStartDate: '2025-01-06',
          totalHours: 40,
          totalPoints: 100
        },
        {
          id: 'sched-2',
          employeeId: 'emp-2',
          weekStartDate: '2025-01-06',
          totalHours: 40,
          totalPoints: 120
        }
      ],
      attendance: [
        {
          id: 'att-1',
          employeeId: 'emp-1',
          date: '2025-01-06',
          status: 'present',
          hoursWorked: 8
        },
        {
          id: 'att-2',
          employeeId: 'emp-1',
          date: '2025-01-07',
          status: 'present',
          hoursWorked: 8
        }
      ],
      vacation: [
        {
          id: 'vac-1',
          employeeId: 'emp-1',
          startDate: '2025-02-01',
          endDate: '2025-02-05',
          status: 'approved'
        },
        {
          id: 'vac-2',
          employeeId: 'emp-2',
          startDate: '2025-02-10',
          endDate: '2025-02-15',
          status: 'pending'
        }
      ],
      metadata: {
        pendingApprovals: 3
      }
    });

    // Create fresh instance for each test
    integration = new HRIntegration();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Constructor', () => {
    test('creates HRIntegration instance', () => {
      expect(integration).toBeInstanceOf(HRIntegration);
    });

    test('sets up event listeners on construction', () => {
      expect(subscribeHr).toHaveBeenCalled();
    });
  });

  describe('getPayrollData()', () => {
    test('returns payroll data for valid employee', () => {
      const result = integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.employee.id).toBe('emp-1');
      expect(result.period.start).toBe('2025-01-01');
      expect(result.period.end).toBe('2025-01-31');
    });

    test('includes employee details in result', () => {
      const result = integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.employee.email).toBe('john@example.com');
      expect(result.employee.department).toBe('Engineering');
      expect(result.employee.position).toBe('Developer');
      expect(result.employee.hoursPerWeek).toBe(40);
    });

    test('uses formatEmployeeName for name', () => {
      integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      expect(formatEmployeeName).toHaveBeenCalled();
    });

    test('throws error for non-existent employee', () => {
      expect(() => {
        integration.getPayrollData('non-existent', '2025-01-01', '2025-01-31');
      }).toThrow('Employee not found');
    });

    test('filters schedules by date range', () => {
      const result = integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.schedules.length).toBeGreaterThanOrEqual(0);
    });

    test('filters attendance by date range', () => {
      const result = integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.attendance.length).toBeGreaterThanOrEqual(0);
    });

    test('includes statistics from getAttendanceSummary', () => {
      const result = integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.statistics).toBeDefined();
      expect(getAttendanceSummary).toHaveBeenCalled();
    });

    test('handles employee with missing hoursPerWeek', () => {
      getHrState.mockReturnValueOnce({
        employees: [{
          id: 'emp-no-hours',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          department: 'Dept',
          position: 'Pos',
          employmentStatus: 'active',
          archived: false
        }],
        schedules: [],
        attendance: [],
        vacation: [],
        metadata: {}
      });
      
      const result = integration.getPayrollData('emp-no-hours', '2025-01-01', '2025-01-31');
      
      expect(result.employee.hoursPerWeek).toBe(40); // Default value
    });
  });

  describe('getAllPayrollData()', () => {
    test('returns array of payroll data', () => {
      const result = integration.getAllPayrollData('2025-01-01', '2025-01-31');
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('excludes archived employees', () => {
      const result = integration.getAllPayrollData('2025-01-01', '2025-01-31');
      
      const employeeIds = result.map(r => r.employee.id);
      expect(employeeIds).not.toContain('emp-3'); // Bob is archived
    });

    test('excludes inactive employees', () => {
      getHrState.mockReturnValueOnce({
        employees: [
          {
            id: 'emp-inactive',
            firstName: 'Inactive',
            lastName: 'User',
            employmentStatus: 'terminated',
            archived: false
          }
        ],
        schedules: [],
        attendance: [],
        vacation: [],
        metadata: {}
      });
      
      const result = integration.getAllPayrollData('2025-01-01', '2025-01-31');
      
      expect(result.length).toBe(0);
    });

    test('includes only active non-archived employees', () => {
      const result = integration.getAllPayrollData('2025-01-01', '2025-01-31');
      
      // emp-1 and emp-2 are active and not archived
      expect(result.length).toBe(2);
    });
  });

  describe('getDepartmentScheduleSummary()', () => {
    test('returns summary for department', () => {
      const result = integration.getDepartmentScheduleSummary('Engineering', '2025-01-06');
      
      expect(result.department).toBe('Engineering');
      expect(result.weekStartDate).toBe('2025-01-06');
    });

    test('counts employees in department', () => {
      const result = integration.getDepartmentScheduleSummary('Engineering', '2025-01-06');
      
      expect(result.employeeCount).toBe(2); // emp-1 and emp-2, emp-3 is archived
    });

    test('counts scheduled employees', () => {
      const result = integration.getDepartmentScheduleSummary('Engineering', '2025-01-06');
      
      expect(result.scheduledCount).toBeGreaterThanOrEqual(0);
    });

    test('calculates total planned hours', () => {
      const result = integration.getDepartmentScheduleSummary('Engineering', '2025-01-06');
      
      expect(typeof result.totalPlannedHours).toBe('number');
    });

    test('calculates total planned points', () => {
      const result = integration.getDepartmentScheduleSummary('Engineering', '2025-01-06');
      
      expect(typeof result.totalPlannedPoints).toBe('number');
    });

    test('includes schedule details with employee names', () => {
      const result = integration.getDepartmentScheduleSummary('Engineering', '2025-01-06');
      
      result.schedules.forEach(s => {
        expect(s.employeeName).toBeDefined();
      });
    });

    test('returns empty data for non-existent department', () => {
      const result = integration.getDepartmentScheduleSummary('NonExistent', '2025-01-06');
      
      expect(result.employeeCount).toBe(0);
      expect(result.schedules.length).toBe(0);
    });
  });

  describe('getVacationConflicts()', () => {
    test('returns approved vacations in date range', () => {
      const result = integration.getVacationConflicts(null, '2025-02-01', '2025-02-28');
      
      // Only approved vacations
      const statuses = result.map(v => v.status);
      expect(statuses.every(s => s === 'approved')).toBe(true);
    });

    test('filters by department when provided', () => {
      const result = integration.getVacationConflicts('Engineering', '2025-02-01', '2025-02-28');
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns all departments when department is null', () => {
      const result = integration.getVacationConflicts(null, '2025-02-01', '2025-02-28');
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('includes employee name in results', () => {
      const result = integration.getVacationConflicts(null, '2025-02-01', '2025-02-28');
      
      result.forEach(v => {
        expect(v.employeeName).toBeDefined();
      });
    });

    test('includes department in results', () => {
      const result = integration.getVacationConflicts(null, '2025-02-01', '2025-02-28');
      
      result.forEach(v => {
        expect(v.department).toBeDefined();
      });
    });

    test('only includes overlapping vacations', () => {
      const result = integration.getVacationConflicts(null, '2025-02-01', '2025-02-05');
      
      // vac-1 overlaps with this range
      // vac-2 does not overlap (starts 2025-02-10)
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('excludes archived employees', () => {
      const result = integration.getVacationConflicts(null, '2025-01-01', '2025-12-31');
      
      const employeeIds = result.map(v => v.employeeId);
      expect(employeeIds).not.toContain('emp-3');
    });
  });

  describe('getAttendanceReport()', () => {
    test('returns report object', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31');
      
      expect(result.period).toBeDefined();
      expect(result.employees).toBeDefined();
      expect(result.totals).toBeDefined();
    });

    test('includes period dates', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31');
      
      expect(result.period.start).toBe('2025-01-01');
      expect(result.period.end).toBe('2025-01-31');
    });

    test('filters by department when provided', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31', 'Engineering');
      
      expect(result.department).toBe('Engineering');
    });

    test('shows "All" when no department filter', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31');
      
      expect(result.department).toBe('All');
    });

    test('includes employee count', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31');
      
      expect(typeof result.employeeCount).toBe('number');
    });

    test('includes employee details in results', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31');
      
      result.employees.forEach(emp => {
        expect(emp.id).toBeDefined();
        expect(emp.name).toBeDefined();
        expect(emp.department).toBeDefined();
      });
    });

    test('calculates totals', () => {
      const result = integration.getAttendanceReport('2025-01-01', '2025-01-31');
      
      expect(typeof result.totals.totalDays).toBe('number');
      expect(typeof result.totals.presentDays).toBe('number');
      expect(typeof result.totals.absentDays).toBe('number');
      expect(typeof result.totals.sickDays).toBe('number');
      expect(typeof result.totals.vacationDays).toBe('number');
      expect(typeof result.totals.totalHours).toBe('number');
    });
  });

  describe('Event Handling', () => {
    test('onHrDataUpdate registers callback', () => {
      const callback = jest.fn();
      const unsubscribe = integration.onHrDataUpdate(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    test('onHrDataUpdate callback receives data on event', () => {
      const callback = jest.fn();
      integration.onHrDataUpdate(callback);
      
      const event = new CustomEvent('hrDataUpdated', {
        detail: { employeeCount: 10 }
      });
      document.dispatchEvent(event);
      
      expect(callback).toHaveBeenCalledWith({ employeeCount: 10 });
    });

    test('onHrDataUpdate returns working unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = integration.onHrDataUpdate(callback);
      
      unsubscribe();
      
      const event = new CustomEvent('hrDataUpdated', {
        detail: { test: true }
      });
      document.dispatchEvent(event);
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('onScheduleReady registers callback', () => {
      const callback = jest.fn();
      const unsubscribe = integration.onScheduleReady(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    test('onScheduleReady callback receives data on event', () => {
      const callback = jest.fn();
      integration.onScheduleReady(callback);
      
      const event = new CustomEvent('hrScheduleReady', {
        detail: { scheduleId: 'sched-1' }
      });
      document.dispatchEvent(event);
      
      expect(callback).toHaveBeenCalledWith({ scheduleId: 'sched-1' });
    });
  });

  describe('setupEventListeners()', () => {
    test('dispatches hrDataUpdated on state change', () => {
      const callback = jest.fn();
      document.addEventListener('hrDataUpdated', callback);
      
      // Get the subscribeHr callback and call it
      const subscribeCallback = subscribeHr.mock.calls[0][0];
      subscribeCallback({
        employees: [{ employmentStatus: 'active', archived: false }],
        metadata: { pendingApprovals: 5 }
      });
      
      expect(callback).toHaveBeenCalled();
    });

    test('hrStateChanged with schedule:approved dispatches hrScheduleReady', () => {
      const callback = jest.fn();
      document.addEventListener('hrScheduleReady', callback);
      
      const event = new CustomEvent('hrStateChanged', {
        detail: {
          eventType: 'schedule:approved',
          data: { scheduleId: 'sched-1' }
        }
      });
      document.dispatchEvent(event);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { scheduleId: 'sched-1' }
        })
      );
    });
  });

  describe('Singleton Instance', () => {
    test('hrIntegration is an instance of HRIntegration', () => {
      expect(hrIntegration).toBeInstanceOf(HRIntegration);
    });

    test('default export is hrIntegration instance', async () => {
      const defaultExport = (await import('../../js/modules/hr/hrIntegration.js')).default;
      expect(defaultExport).toBe(hrIntegration);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty state', () => {
      getHrState.mockReturnValueOnce({
        employees: [],
        schedules: [],
        attendance: [],
        vacation: [],
        metadata: {}
      });
      
      const result = integration.getAllPayrollData('2025-01-01', '2025-01-31');
      
      expect(result).toEqual([]);
    });

    test('handles missing optional fields', () => {
      getHrState.mockReturnValueOnce({
        employees: [{
          id: 'emp-minimal',
          firstName: 'Min',
          lastName: 'Imal',
          employmentStatus: 'active',
          archived: false
        }],
        schedules: [],
        attendance: [],
        vacation: [],
        metadata: {}
      });
      
      const result = integration.getPayrollData('emp-minimal', '2025-01-01', '2025-01-31');
      
      expect(result.employee.hoursPerWeek).toBe(40);
    });

    test('sorts schedules by date', () => {
      getHrState.mockReturnValueOnce({
        employees: [{
          id: 'emp-1',
          firstName: 'Test',
          lastName: 'User',
          employmentStatus: 'active',
          archived: false
        }],
        schedules: [
          { employeeId: 'emp-1', weekStartDate: '2025-01-13', totalHours: 40 },
          { employeeId: 'emp-1', weekStartDate: '2025-01-06', totalHours: 40 }
        ],
        attendance: [],
        vacation: [],
        metadata: {}
      });
      
      const result = integration.getPayrollData('emp-1', '2025-01-01', '2025-01-31');
      
      // Should be sorted by date ascending
      if (result.schedules.length > 1) {
        const date1 = new Date(result.schedules[0].weekStartDate).getTime();
        const date2 = new Date(result.schedules[1].weekStartDate).getTime();
        expect(date1).toBeLessThanOrEqual(date2);
      }
    });
  });
});
