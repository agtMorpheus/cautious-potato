/**
 * Unit Tests for Attendance Submodule (attendance.js)
 * Tests attendance tracking functionality
 */

import {
  ATTENDANCE_STATUS,
  ATTENDANCE_TYPE,
  getAllAttendance,
  getAttendanceById,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAttendanceByDateRange,
  getEmployeeAttendanceInRange,
  createAttendanceRecord,
  editAttendanceRecord,
  getDailyAttendanceSummary,
  getEmployeeAttendanceSummary,
  getMonthlyAttendanceReport,
  formatAttendanceForDisplay,
  getEmployeeAttendanceForDisplay,
  getTodayAttendance,
  hasAttendanceRecord
} from '../../js/modules/hr/submodules/attendance.js';

import { getHrState, recordAttendance, updateAttendance } from '../../js/modules/hr/hrState.js';
import {
  validateAttendance,
  formatDateDE,
  formatTimeDE,
  formatHours,
  calculateHoursWorked,
  getStatusClass,
  getStatusText,
  getDayName,
  getAttendanceSummary,
  groupAttendanceByEmployee
} from '../../js/modules/hr/hrUtils.js';

// Mock dependencies
jest.mock('../../js/modules/hr/hrState.js', () => ({
  getHrState: jest.fn(),
  recordAttendance: jest.fn(),
  updateAttendance: jest.fn()
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  validateAttendance: jest.fn(() => ({ valid: true, errors: [] })),
  formatDateDE: jest.fn((date) => date),
  formatTimeDE: jest.fn((time) => time || '-'),
  formatHours: jest.fn((hours) => `${hours}h`),
  calculateHoursWorked: jest.fn((entry, exit, breaks) => 8),
  getStatusClass: jest.fn((status) => `status-${status}`),
  getStatusText: jest.fn((status) => status),
  getDayName: jest.fn((date) => 'Montag'),
  getAttendanceSummary: jest.fn(() => ({
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    sickDays: 1,
    vacationDays: 1,
    totalHours: 144
  })),
  groupAttendanceByEmployee: jest.fn((records) => {
    const grouped = {};
    records.forEach(r => {
      if (!grouped[r.employeeId]) grouped[r.employeeId] = [];
      grouped[r.employeeId].push(r);
    });
    return grouped;
  })
}));

describe('Attendance Submodule (attendance.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock state
    getHrState.mockReturnValue({
      attendance: [
        {
          id: 'att-1',
          employeeId: 'emp-1',
          date: '2025-01-06',
          entryTime: '08:00',
          exitTime: '17:00',
          breakMinutes: 60,
          hoursWorked: 8,
          status: 'present',
          type: 'regular'
        },
        {
          id: 'att-2',
          employeeId: 'emp-1',
          date: '2025-01-07',
          entryTime: '08:30',
          exitTime: '17:30',
          breakMinutes: 60,
          hoursWorked: 8,
          status: 'present',
          type: 'regular'
        },
        {
          id: 'att-3',
          employeeId: 'emp-2',
          date: '2025-01-06',
          entryTime: null,
          exitTime: null,
          breakMinutes: 0,
          hoursWorked: 0,
          status: 'sick_leave',
          type: 'regular'
        }
      ]
    });
  });

  describe('Constants', () => {
    test('ATTENDANCE_STATUS has expected values', () => {
      expect(ATTENDANCE_STATUS.PRESENT).toBe('present');
      expect(ATTENDANCE_STATUS.ABSENT).toBe('absent');
      expect(ATTENDANCE_STATUS.SICK_LEAVE).toBe('sick_leave');
      expect(ATTENDANCE_STATUS.VACATION).toBe('vacation');
      expect(ATTENDANCE_STATUS.UNPAID_LEAVE).toBe('unpaid_leave');
      expect(ATTENDANCE_STATUS.PUBLIC_HOLIDAY).toBe('public_holiday');
      expect(ATTENDANCE_STATUS.HOME_OFFICE).toBe('home_office');
    });

    test('ATTENDANCE_TYPE has expected values', () => {
      expect(ATTENDANCE_TYPE.REGULAR).toBe('regular');
      expect(ATTENDANCE_TYPE.OVERTIME).toBe('overtime');
      expect(ATTENDANCE_TYPE.HALF_DAY).toBe('half_day');
      expect(ATTENDANCE_TYPE.TRAINING).toBe('training');
      expect(ATTENDANCE_TYPE.TRAVEL).toBe('travel');
    });
  });

  describe('getAllAttendance()', () => {
    test('returns all attendance records', () => {
      const result = getAllAttendance();
      
      expect(result.length).toBe(3);
    });

    test('returns empty array when no records', () => {
      getHrState.mockReturnValueOnce({ attendance: [] });
      
      const result = getAllAttendance();
      
      expect(result).toEqual([]);
    });
  });

  describe('getAttendanceById()', () => {
    test('returns attendance record by ID', () => {
      const result = getAttendanceById('att-1');
      
      expect(result.id).toBe('att-1');
      expect(result.employeeId).toBe('emp-1');
    });

    test('returns null for non-existent ID', () => {
      const result = getAttendanceById('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('getAttendanceByEmployee()', () => {
    test('returns records for specific employee', () => {
      const result = getAttendanceByEmployee('emp-1');
      
      expect(result.length).toBe(2);
      result.forEach(r => {
        expect(r.employeeId).toBe('emp-1');
      });
    });

    test('returns empty array for employee with no records', () => {
      const result = getAttendanceByEmployee('emp-none');
      
      expect(result).toEqual([]);
    });
  });

  describe('getAttendanceByDate()', () => {
    test('returns records for specific date', () => {
      const result = getAttendanceByDate('2025-01-06');
      
      expect(result.length).toBe(2);
      result.forEach(r => {
        expect(r.date).toBe('2025-01-06');
      });
    });

    test('returns empty array for date with no records', () => {
      const result = getAttendanceByDate('2020-01-01');
      
      expect(result).toEqual([]);
    });
  });

  describe('getAttendanceByDateRange()', () => {
    test('returns records within date range', () => {
      const result = getAttendanceByDateRange('2025-01-06', '2025-01-07');
      
      expect(result.length).toBe(3);
    });

    test('includes boundary dates', () => {
      const result = getAttendanceByDateRange('2025-01-06', '2025-01-06');
      
      expect(result.length).toBe(2);
    });

    test('returns empty array for range with no records', () => {
      const result = getAttendanceByDateRange('2020-01-01', '2020-12-31');
      
      expect(result).toEqual([]);
    });
  });

  describe('getEmployeeAttendanceInRange()', () => {
    test('returns employee records within date range', () => {
      const result = getEmployeeAttendanceInRange('emp-1', '2025-01-06', '2025-01-07');
      
      expect(result.length).toBe(2);
      result.forEach(r => {
        expect(r.employeeId).toBe('emp-1');
      });
    });

    test('returns empty for employee not in range', () => {
      const result = getEmployeeAttendanceInRange('emp-2', '2025-01-07', '2025-01-07');
      
      expect(result).toEqual([]);
    });
  });

  describe('createAttendanceRecord()', () => {
    test('creates new attendance record', () => {
      const data = {
        date: '2025-01-08',
        entryTime: '09:00',
        exitTime: '18:00',
        breakMinutes: 60,
        status: 'present'
      };
      
      const result = createAttendanceRecord('emp-1', data);
      
      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(recordAttendance).toHaveBeenCalled();
    });

    test('returns errors when validation fails', () => {
      validateAttendance.mockReturnValueOnce({
        valid: false,
        errors: ['Invalid date']
      });
      
      const result = createAttendanceRecord('emp-1', { date: 'invalid' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid date');
    });

    test('calculates hours when times provided', () => {
      const data = {
        date: '2025-01-08',
        entryTime: '08:00',
        exitTime: '16:00',
        breakMinutes: 30
      };
      
      createAttendanceRecord('emp-1', data);
      
      expect(calculateHoursWorked).toHaveBeenCalledWith('08:00', '16:00', 30);
    });

    test('uses provided hoursWorked when no times', () => {
      const data = {
        date: '2025-01-08',
        hoursWorked: 4,
        status: 'present'
      };
      
      const result = createAttendanceRecord('emp-1', data);
      
      expect(result.record.hoursWorked).toBeDefined();
    });

    test('sets default values', () => {
      const data = {
        date: '2025-01-08'
      };
      
      const result = createAttendanceRecord('emp-1', data);
      
      expect(result.record.breakMinutes).toBe(30);
      expect(result.record.status).toBe('present');
      expect(result.record.type).toBe('regular');
      expect(result.record.manuallyRecorded).toBe(true);
    });

    test('generates unique ID', () => {
      const data = { date: '2025-01-08' };
      
      const result = createAttendanceRecord('emp-1', data);
      
      expect(result.record.id).toMatch(/^ATT\d+$/);
    });

    test('includes dayOfWeek', () => {
      const data = { date: '2025-01-08' };
      
      createAttendanceRecord('emp-1', data);
      
      expect(getDayName).toHaveBeenCalledWith('2025-01-08');
    });
  });

  describe('editAttendanceRecord()', () => {
    test('updates existing record', () => {
      const result = editAttendanceRecord('att-1', { hoursWorked: 9 });
      
      expect(result.success).toBe(true);
      expect(updateAttendance).toHaveBeenCalledWith('att-1', expect.objectContaining({
        hoursWorked: 9
      }));
    });

    test('returns error for non-existent record', () => {
      const result = editAttendanceRecord('non-existent', { hoursWorked: 9 });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Anwesenheitseintrag nicht gefunden');
    });

    test('recalculates hours when times change', () => {
      calculateHoursWorked.mockReturnValueOnce(7.5);
      
      editAttendanceRecord('att-1', { entryTime: '09:00' });
      
      expect(calculateHoursWorked).toHaveBeenCalled();
    });

    test('recalculates hours when breakMinutes changes', () => {
      editAttendanceRecord('att-1', { breakMinutes: 30 });
      
      expect(calculateHoursWorked).toHaveBeenCalled();
    });
  });

  describe('getDailyAttendanceSummary()', () => {
    test('returns summary for date', () => {
      const result = getDailyAttendanceSummary('2025-01-06');
      
      expect(result.date).toBe('2025-01-06');
      expect(result.totalRecords).toBe(2);
      expect(getDayName).toHaveBeenCalledWith('2025-01-06');
    });

    test('includes attendance summary stats', () => {
      const result = getDailyAttendanceSummary('2025-01-06');
      
      expect(getAttendanceSummary).toHaveBeenCalled();
      expect(result.totalDays).toBe(20);
    });
  });

  describe('getEmployeeAttendanceSummary()', () => {
    test('returns summary for employee in period', () => {
      const result = getEmployeeAttendanceSummary('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.employeeId).toBe('emp-1');
      expect(result.periodStart).toBe('2025-01-01');
      expect(result.periodEnd).toBe('2025-01-31');
    });

    test('includes attendance summary stats', () => {
      const result = getEmployeeAttendanceSummary('emp-1', '2025-01-01', '2025-01-31');
      
      expect(result.totalDays).toBe(20);
      expect(result.presentDays).toBe(18);
    });
  });

  describe('getMonthlyAttendanceReport()', () => {
    test('returns report for month', () => {
      const result = getMonthlyAttendanceReport(2025, 1);
      
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-31');
    });

    test('includes employee summaries', () => {
      const result = getMonthlyAttendanceReport(2025, 1);
      
      expect(result.employeeSummaries).toBeDefined();
      expect(Array.isArray(result.employeeSummaries)).toBe(true);
    });

    test('includes overall summary', () => {
      const result = getMonthlyAttendanceReport(2025, 1);
      
      expect(result.overall).toBeDefined();
    });

    test('calculates correct dates for different months', () => {
      // February (non-leap year)
      const febResult = getMonthlyAttendanceReport(2025, 2);
      expect(febResult.endDate).toBe('2025-02-28');
      
      // December
      const decResult = getMonthlyAttendanceReport(2025, 12);
      expect(decResult.endDate).toBe('2025-12-31');
    });
  });

  describe('formatAttendanceForDisplay()', () => {
    test('formats attendance record for display', () => {
      const record = {
        id: 'att-1',
        date: '2025-01-06',
        entryTime: '08:00',
        exitTime: '17:00',
        hoursWorked: 8,
        status: 'present',
        type: 'regular'
      };
      
      const result = formatAttendanceForDisplay(record);
      
      expect(formatDateDE).toHaveBeenCalledWith('2025-01-06');
      expect(formatTimeDE).toHaveBeenCalledWith('08:00');
      expect(formatTimeDE).toHaveBeenCalledWith('17:00');
      expect(formatHours).toHaveBeenCalledWith(8);
      expect(getStatusClass).toHaveBeenCalledWith('present');
      expect(getStatusText).toHaveBeenCalledWith('present');
    });

    test('handles null times', () => {
      const record = {
        id: 'att-3',
        date: '2025-01-06',
        entryTime: null,
        exitTime: null,
        hoursWorked: 0,
        status: 'sick_leave',
        type: 'regular'
      };
      
      const result = formatAttendanceForDisplay(record);
      
      expect(result.formattedEntryTime).toBe('-');
      expect(result.formattedExitTime).toBe('-');
    });
  });

  describe('getEmployeeAttendanceForDisplay()', () => {
    test('returns formatted records for employee', () => {
      const result = getEmployeeAttendanceForDisplay('emp-1', 10);
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('limits number of results', () => {
      const result = getEmployeeAttendanceForDisplay('emp-1', 1);
      
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('sorts by date descending', () => {
      const result = getEmployeeAttendanceForDisplay('emp-1', 10);
      
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const date1 = new Date(result[i].date).getTime();
          const date2 = new Date(result[i + 1].date).getTime();
          expect(date1).toBeGreaterThanOrEqual(date2);
        }
      }
    });

    test('uses default limit when not specified', () => {
      const result = getEmployeeAttendanceForDisplay('emp-1');
      
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getTodayAttendance()', () => {
    test('returns today\'s attendance records formatted', () => {
      const today = new Date().toISOString().split('T')[0];
      
      getHrState.mockReturnValueOnce({
        attendance: [
          {
            id: 'att-today',
            employeeId: 'emp-1',
            date: today,
            entryTime: '08:00',
            exitTime: null,
            hoursWorked: 0,
            status: 'present',
            type: 'regular'
          }
        ]
      });
      
      const result = getTodayAttendance();
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns empty array when no records today', () => {
      getHrState.mockReturnValueOnce({ attendance: [] });
      
      const result = getTodayAttendance();
      
      expect(result).toEqual([]);
    });
  });

  describe('hasAttendanceRecord()', () => {
    test('returns true when employee has record for date', () => {
      const result = hasAttendanceRecord('emp-1', '2025-01-06');
      
      expect(result).toBe(true);
    });

    test('returns false when employee has no record for date', () => {
      const result = hasAttendanceRecord('emp-1', '2020-01-01');
      
      expect(result).toBe(false);
    });

    test('returns false for non-existent employee', () => {
      const result = hasAttendanceRecord('non-existent', '2025-01-06');
      
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty attendance array', () => {
      getHrState.mockReturnValue({ attendance: [] });
      
      expect(getAllAttendance()).toEqual([]);
      expect(getAttendanceById('any')).toBeNull();
      expect(getAttendanceByEmployee('any')).toEqual([]);
    });

    test('handles records with missing optional fields', () => {
      getHrState.mockReturnValueOnce({
        attendance: [{
          id: 'att-minimal',
          employeeId: 'emp-1',
          date: '2025-01-06',
          status: 'present'
        }]
      });
      
      const result = formatAttendanceForDisplay(getAllAttendance()[0]);
      
      expect(result).toBeDefined();
    });
  });
});
