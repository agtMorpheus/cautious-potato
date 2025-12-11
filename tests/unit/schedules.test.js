/**
 * Unit Tests for Schedules Submodule (schedules.js)
 * Tests weekly hours and points management functionality
 */

import {
  SCHEDULE_STATUS,
  WEEKDAYS,
  WEEKDAYS_DE,
  getAllSchedules,
  getScheduleById,
  getSchedulesByEmployee,
  getScheduleByEmployeeAndWeek,
  getSchedulesByWeek,
  getSchedulesByStatus,
  getPendingSchedules,
  createSchedule,
  editSchedule,
  updateDaySchedule,
  submitSchedule,
  approveSchedule,
  rejectSchedule,
  calculateWeeklyTotals,
  getCurrentWeekSchedule,
  formatScheduleForDisplay,
  getScheduleGridData,
  getScheduleHistory
} from '../../js/modules/hr/submodules/schedules.js';

import { getHrState, updateSchedule } from '../../js/modules/hr/hrState.js';
import {
  formatDateDE,
  formatHours,
  getWeekNumber,
  getWeekStart,
  getDayName,
  calculatePoints,
  getStatusClass,
  getStatusText
} from '../../js/modules/hr/hrUtils.js';

// Mock dependencies
jest.mock('../../js/modules/hr/hrState.js', () => ({
  getHrState: jest.fn(),
  updateSchedule: jest.fn()
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  formatDateDE: jest.fn((date) => date),
  formatHours: jest.fn((hours) => `${hours}h`),
  getWeekNumber: jest.fn((date) => 1),
  getWeekStart: jest.fn((date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }),
  getDayName: jest.fn((date) => 'Monday'),
  calculatePoints: jest.fn((hours) => hours * 8),
  getStatusClass: jest.fn((status) => `status-${status}`),
  getStatusText: jest.fn((status) => status)
}));

describe('Schedules Submodule (schedules.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock state
    getHrState.mockReturnValue({
      schedules: [
        {
          id: 'sched-1',
          employeeId: 'emp-1',
          weekStartDate: '2025-01-06',
          weekNumber: 2,
          year: 2025,
          totalHours: 40,
          totalPoints: 320,
          status: 'draft',
          dailySchedule: [
            { day: 'Monday', date: '2025-01-06', plannedHours: 8, plannedPoints: 64 },
            { day: 'Tuesday', date: '2025-01-07', plannedHours: 8, plannedPoints: 64 },
            { day: 'Wednesday', date: '2025-01-08', plannedHours: 8, plannedPoints: 64 },
            { day: 'Thursday', date: '2025-01-09', plannedHours: 8, plannedPoints: 64 },
            { day: 'Friday', date: '2025-01-10', plannedHours: 8, plannedPoints: 64 },
            { day: 'Saturday', date: '2025-01-11', plannedHours: 0, plannedPoints: 0 },
            { day: 'Sunday', date: '2025-01-12', plannedHours: 0, plannedPoints: 0 }
          ]
        },
        {
          id: 'sched-2',
          employeeId: 'emp-2',
          weekStartDate: '2025-01-06',
          weekNumber: 2,
          year: 2025,
          totalHours: 40,
          totalPoints: 320,
          status: 'submitted',
          submittedAt: '2025-01-05T10:00:00Z',
          dailySchedule: []
        },
        {
          id: 'sched-3',
          employeeId: 'emp-1',
          weekStartDate: '2025-01-13',
          weekNumber: 3,
          year: 2025,
          totalHours: 32,
          totalPoints: 256,
          status: 'approved',
          approvedBy: 'HR_ADMIN',
          approvedAt: '2025-01-10T15:00:00Z',
          dailySchedule: []
        }
      ]
    });
  });

  describe('Constants', () => {
    test('SCHEDULE_STATUS has expected values', () => {
      expect(SCHEDULE_STATUS.DRAFT).toBe('draft');
      expect(SCHEDULE_STATUS.SUBMITTED).toBe('submitted');
      expect(SCHEDULE_STATUS.APPROVED).toBe('approved');
      expect(SCHEDULE_STATUS.REJECTED).toBe('rejected');
    });

    test('WEEKDAYS has 7 days', () => {
      expect(WEEKDAYS.length).toBe(7);
      expect(WEEKDAYS[0]).toBe('Monday');
      expect(WEEKDAYS[6]).toBe('Sunday');
    });

    test('WEEKDAYS_DE has 7 German days', () => {
      expect(WEEKDAYS_DE.length).toBe(7);
      expect(WEEKDAYS_DE[0]).toBe('Montag');
      expect(WEEKDAYS_DE[6]).toBe('Sonntag');
    });
  });

  describe('getAllSchedules()', () => {
    test('returns all schedules', () => {
      const result = getAllSchedules();
      
      expect(result.length).toBe(3);
    });

    test('returns empty array when no schedules', () => {
      getHrState.mockReturnValueOnce({ schedules: [] });
      
      const result = getAllSchedules();
      
      expect(result).toEqual([]);
    });
  });

  describe('getScheduleById()', () => {
    test('returns schedule by ID', () => {
      const result = getScheduleById('sched-1');
      
      expect(result.id).toBe('sched-1');
      expect(result.employeeId).toBe('emp-1');
    });

    test('returns null for non-existent ID', () => {
      const result = getScheduleById('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('getSchedulesByEmployee()', () => {
    test('returns schedules for employee', () => {
      const result = getSchedulesByEmployee('emp-1');
      
      expect(result.length).toBe(2);
      result.forEach(s => {
        expect(s.employeeId).toBe('emp-1');
      });
    });

    test('returns empty array for employee with no schedules', () => {
      const result = getSchedulesByEmployee('emp-none');
      
      expect(result).toEqual([]);
    });
  });

  describe('getScheduleByEmployeeAndWeek()', () => {
    test('returns schedule for employee and week', () => {
      const result = getScheduleByEmployeeAndWeek('emp-1', '2025-01-06');
      
      expect(result.id).toBe('sched-1');
    });

    test('returns null when no schedule for week', () => {
      const result = getScheduleByEmployeeAndWeek('emp-1', '2025-02-01');
      
      expect(result).toBeNull();
    });
  });

  describe('getSchedulesByWeek()', () => {
    test('returns schedules for week', () => {
      const result = getSchedulesByWeek('2025-01-06');
      
      expect(result.length).toBe(2);
    });
  });

  describe('getSchedulesByStatus()', () => {
    test('returns schedules by status', () => {
      const result = getSchedulesByStatus('draft');
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('draft');
    });
  });

  describe('getPendingSchedules()', () => {
    test('returns submitted schedules', () => {
      const result = getPendingSchedules();
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('submitted');
    });
  });

  describe('createSchedule()', () => {
    test('creates new schedule', () => {
      const result = createSchedule('emp-new', '2025-02-03');
      
      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      expect(result.schedule.employeeId).toBe('emp-new');
      expect(updateSchedule).toHaveBeenCalled();
    });

    test('returns error if schedule already exists', () => {
      const result = createSchedule('emp-1', '2025-01-06');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Schedule für diese Woche existiert bereits');
    });

    test('generates daily schedule with defaults', () => {
      const result = createSchedule('emp-new', '2025-02-03');
      
      expect(result.schedule.dailySchedule.length).toBe(7);
      expect(result.schedule.dailySchedule[0].plannedHours).toBe(8); // Monday
      expect(result.schedule.dailySchedule[5].plannedHours).toBe(0); // Saturday
    });

    test('sets initial status to draft', () => {
      const result = createSchedule('emp-new', '2025-02-03');
      
      expect(result.schedule.status).toBe('draft');
    });

    test('calculates total hours', () => {
      const result = createSchedule('emp-new', '2025-02-03');
      
      expect(result.schedule.totalHours).toBe(40);
    });
  });

  describe('editSchedule()', () => {
    test('updates existing schedule', () => {
      const result = editSchedule('sched-1', { totalHours: 35 });
      
      expect(result.success).toBe(true);
      expect(updateSchedule).toHaveBeenCalledWith('sched-1', expect.objectContaining({
        totalHours: 35
      }));
    });

    test('returns error for non-existent schedule', () => {
      const result = editSchedule('non-existent', { totalHours: 35 });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Schedule nicht gefunden');
    });

    test('prevents editing approved schedules', () => {
      const result = editSchedule('sched-3', { totalHours: 35 });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Genehmigte Schedules können nicht bearbeitet werden');
    });

    test('allows editing approved schedules with forceUpdate', () => {
      const result = editSchedule('sched-3', { totalHours: 35, forceUpdate: true });
      
      expect(result.success).toBe(true);
    });

    test('recalculates totals when dailySchedule changes', () => {
      const newDailySchedule = [
        { plannedHours: 6, plannedPoints: 48 },
        { plannedHours: 6, plannedPoints: 48 },
        { plannedHours: 6, plannedPoints: 48 },
        { plannedHours: 6, plannedPoints: 48 },
        { plannedHours: 6, plannedPoints: 48 },
        { plannedHours: 0, plannedPoints: 0 },
        { plannedHours: 0, plannedPoints: 0 }
      ];
      
      editSchedule('sched-1', { dailySchedule: newDailySchedule });
      
      expect(updateSchedule).toHaveBeenCalledWith('sched-1', expect.objectContaining({
        totalHours: 30,
        totalPoints: 240
      }));
    });
  });

  describe('updateDaySchedule()', () => {
    test('updates specific day in schedule', () => {
      const result = updateDaySchedule('sched-1', 0, { plannedHours: 6 });
      
      expect(result.success).toBe(true);
    });

    test('returns error for non-existent schedule', () => {
      const result = updateDaySchedule('non-existent', 0, { plannedHours: 6 });
      
      expect(result.success).toBe(false);
    });

    test('recalculates points', () => {
      updateDaySchedule('sched-1', 0, { plannedHours: 6 });
      
      expect(calculatePoints).toHaveBeenCalled();
    });
  });

  describe('submitSchedule()', () => {
    test('submits draft schedule', () => {
      const result = submitSchedule('sched-1');
      
      expect(result.success).toBe(true);
      expect(updateSchedule).toHaveBeenCalledWith('sched-1', expect.objectContaining({
        status: 'submitted'
      }));
    });

    test('returns error for non-existent schedule', () => {
      const result = submitSchedule('non-existent');
      
      expect(result.success).toBe(false);
    });

    test('returns error if not in draft status', () => {
      const result = submitSchedule('sched-2');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Nur Entwürfe können eingereicht werden');
    });

    test('sets submittedAt timestamp', () => {
      submitSchedule('sched-1');
      
      expect(updateSchedule).toHaveBeenCalledWith('sched-1', expect.objectContaining({
        submittedAt: expect.any(String)
      }));
    });
  });

  describe('approveSchedule()', () => {
    test('approves submitted schedule', () => {
      const result = approveSchedule('sched-2', 'HR_MANAGER');
      
      expect(result.success).toBe(true);
      expect(updateSchedule).toHaveBeenCalledWith('sched-2', expect.objectContaining({
        status: 'approved',
        approvedBy: 'HR_MANAGER'
      }));
    });

    test('returns error for non-existent schedule', () => {
      const result = approveSchedule('non-existent');
      
      expect(result.success).toBe(false);
    });

    test('returns error if not in submitted status', () => {
      const result = approveSchedule('sched-1');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Nur eingereichte Schedules können genehmigt werden');
    });

    test('uses default approver', () => {
      approveSchedule('sched-2');
      
      expect(updateSchedule).toHaveBeenCalledWith('sched-2', expect.objectContaining({
        approvedBy: 'HR_ADMIN'
      }));
    });

    test('sets approvedAt timestamp', () => {
      approveSchedule('sched-2');
      
      expect(updateSchedule).toHaveBeenCalledWith('sched-2', expect.objectContaining({
        approvedAt: expect.any(String)
      }));
    });
  });

  describe('rejectSchedule()', () => {
    test('rejects schedule with reason', () => {
      const result = rejectSchedule('sched-2', 'Hours exceed limit');
      
      expect(result.success).toBe(true);
      expect(updateSchedule).toHaveBeenCalledWith('sched-2', expect.objectContaining({
        status: 'rejected',
        rejectionReason: 'Hours exceed limit'
      }));
    });

    test('returns error for non-existent schedule', () => {
      const result = rejectSchedule('non-existent');
      
      expect(result.success).toBe(false);
    });

    test('allows empty rejection reason', () => {
      const result = rejectSchedule('sched-2');
      
      expect(result.success).toBe(true);
    });

    test('sets rejectedAt timestamp', () => {
      rejectSchedule('sched-2');
      
      expect(updateSchedule).toHaveBeenCalledWith('sched-2', expect.objectContaining({
        rejectedAt: expect.any(String)
      }));
    });
  });

  describe('calculateWeeklyTotals()', () => {
    test('calculates totals from daily schedule', () => {
      const schedule = {
        dailySchedule: [
          { plannedHours: 8, plannedPoints: 64, actualHours: 8, actualPoints: 64 },
          { plannedHours: 8, plannedPoints: 64, actualHours: 7, actualPoints: 56 },
          { plannedHours: 8, plannedPoints: 64, actualHours: 8, actualPoints: 64 },
          { plannedHours: 8, plannedPoints: 64, actualHours: 8, actualPoints: 64 },
          { plannedHours: 8, plannedPoints: 64, actualHours: 9, actualPoints: 72 },
          { plannedHours: 0, plannedPoints: 0, actualHours: 0, actualPoints: 0 },
          { plannedHours: 0, plannedPoints: 0, actualHours: 0, actualPoints: 0 }
        ]
      };
      
      const result = calculateWeeklyTotals(schedule);
      
      expect(result.plannedHours).toBe(40);
      expect(result.plannedPoints).toBe(320);
      expect(result.actualHours).toBe(40);
      expect(result.actualPoints).toBe(320);
    });

    test('returns zeros for null schedule', () => {
      const result = calculateWeeklyTotals(null);
      
      expect(result.plannedHours).toBe(0);
      expect(result.plannedPoints).toBe(0);
    });

    test('returns zeros for schedule without dailySchedule', () => {
      const result = calculateWeeklyTotals({});
      
      expect(result.plannedHours).toBe(0);
    });
  });

  describe('getCurrentWeekSchedule()', () => {
    test('returns current week schedule for employee', () => {
      // This test depends on current date, mock getWeekStart
      const result = getCurrentWeekSchedule('emp-1');
      
      expect(getWeekStart).toHaveBeenCalled();
    });
  });

  describe('formatScheduleForDisplay()', () => {
    test('formats schedule for display', () => {
      const schedule = getAllSchedules()[0];
      
      const result = formatScheduleForDisplay(schedule);
      
      expect(formatDateDE).toHaveBeenCalledWith('2025-01-06');
      expect(result.weekLabel).toContain('KW');
      expect(result.statusClass).toBeDefined();
      expect(result.statusText).toBeDefined();
    });

    test('includes variance calculation', () => {
      const schedule = {
        weekStartDate: '2025-01-06',
        weekNumber: 2,
        year: 2025,
        status: 'approved',
        dailySchedule: [
          { plannedHours: 8, actualHours: 9 }
        ]
      };
      
      const result = formatScheduleForDisplay(schedule);
      
      expect(typeof result.variance).toBe('number');
    });

    test('formats daily schedule with German day names', () => {
      const schedule = getAllSchedules()[0];
      
      const result = formatScheduleForDisplay(schedule);
      
      expect(result.dailyScheduleFormatted).toBeDefined();
      expect(result.dailyScheduleFormatted[0].dayNameDE).toBe('Montag');
    });
  });

  describe('getScheduleGridData()', () => {
    test('returns grid data for weekly view', () => {
      const employees = [
        { id: 'emp-1', firstName: 'John', lastName: 'Doe' },
        { id: 'emp-2', firstName: 'Jane', lastName: 'Smith' }
      ];
      
      const result = getScheduleGridData('2025-01-06', employees);
      
      expect(result.weekStartDate).toBe('2025-01-06');
      expect(result.days).toEqual(WEEKDAYS_DE);
      expect(result.rows.length).toBe(2);
    });

    test('indicates which employees have schedules', () => {
      const employees = [
        { id: 'emp-1', firstName: 'John', lastName: 'Doe' },
        { id: 'emp-99', firstName: 'No', lastName: 'Schedule' }
      ];
      
      const result = getScheduleGridData('2025-01-06', employees);
      
      expect(result.rows[0].hasSchedule).toBe(true);
      expect(result.rows[1].hasSchedule).toBe(false);
    });
  });

  describe('getScheduleHistory()', () => {
    test('returns schedule history for employee', () => {
      const result = getScheduleHistory('emp-1', 12);
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('limits results to specified weeks', () => {
      const result = getScheduleHistory('emp-1', 1);
      
      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('sorts by date descending', () => {
      const result = getScheduleHistory('emp-1', 12);
      
      if (result.length > 1) {
        const date1 = new Date(result[0].weekStartDate).getTime();
        const date2 = new Date(result[1].weekStartDate).getTime();
        expect(date1).toBeGreaterThanOrEqual(date2);
      }
    });

    test('uses default of 12 weeks', () => {
      // We have 2 schedules for emp-1, so should return both
      const result = getScheduleHistory('emp-1');
      
      expect(result.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty schedules array', () => {
      getHrState.mockReturnValue({ schedules: [] });
      
      expect(getAllSchedules()).toEqual([]);
      expect(getPendingSchedules()).toEqual([]);
    });

    test('handles schedule with missing dailySchedule', () => {
      const schedule = { weekStartDate: '2025-01-06', status: 'draft' };
      
      const totals = calculateWeeklyTotals(schedule);
      
      expect(totals.plannedHours).toBe(0);
    });
  });
});
