/**
 * Schedules Submodule
 * 
 * Weekly hours and points management functionality
 * Handles schedule creation, submission, and approval
 * 
 * @module schedules
 * @version 1.0.0
 */

import {
  getHrState,
  updateSchedule
} from '../hrState.js';

import {
  formatDateDE,
  formatHours,
  getWeekNumber,
  getWeekStart,
  getDayName,
  calculatePoints,
  getStatusClass,
  getStatusText
} from '../hrUtils.js';

// Schedule status options
export const SCHEDULE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Days of the week (German order - Monday first)
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const WEEKDAYS_DE = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag'
];

// ============================================================
// Schedule Data Operations
// ============================================================

/**
 * Get all schedules
 * @returns {Array} Array of schedule objects
 */
export function getAllSchedules() {
  const state = getHrState();
  return state.schedules;
}

/**
 * Get schedule by ID
 * @param {string} scheduleId - Schedule ID
 * @returns {Object|null} Schedule object or null
 */
export function getScheduleById(scheduleId) {
  const state = getHrState();
  return state.schedules.find(s => s.id === scheduleId) || null;
}

/**
 * Get schedules for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Array} Employee's schedules
 */
export function getSchedulesByEmployee(employeeId) {
  const state = getHrState();
  return state.schedules.filter(s => s.employeeId === employeeId);
}

/**
 * Get schedule for employee and week
 * @param {string} employeeId - Employee ID
 * @param {string} weekStartDate - Week start date (Monday)
 * @returns {Object|null} Schedule for the week or null
 */
export function getScheduleByEmployeeAndWeek(employeeId, weekStartDate) {
  const state = getHrState();
  return state.schedules.find(s => 
    s.employeeId === employeeId && s.weekStartDate === weekStartDate
  ) || null;
}

/**
 * Get schedules for a specific week
 * @param {string} weekStartDate - Week start date
 * @returns {Array} Schedules for the week
 */
export function getSchedulesByWeek(weekStartDate) {
  const state = getHrState();
  return state.schedules.filter(s => s.weekStartDate === weekStartDate);
}

/**
 * Get schedules by status
 * @param {string} status - Schedule status
 * @returns {Array} Schedules with the given status
 */
export function getSchedulesByStatus(status) {
  const state = getHrState();
  return state.schedules.filter(s => s.status === status);
}

/**
 * Get pending schedules (awaiting approval)
 * @returns {Array} Submitted schedules awaiting approval
 */
export function getPendingSchedules() {
  return getSchedulesByStatus(SCHEDULE_STATUS.SUBMITTED);
}

// ============================================================
// Schedule CRUD Operations
// ============================================================

/**
 * Create a new schedule
 * @param {string} employeeId - Employee ID
 * @param {string} weekStartDate - Week start date
 * @param {Object} scheduleData - Optional initial data
 * @returns {Object} Result { success, schedule, errors }
 */
export function createSchedule(employeeId, weekStartDate, scheduleData = {}) {
  // Check if schedule already exists
  const existing = getScheduleByEmployeeAndWeek(employeeId, weekStartDate);
  if (existing) {
    return { success: false, errors: ['Schedule für diese Woche existiert bereits'] };
  }
  
  const weekStart = new Date(weekStartDate);
  
  // Generate daily schedule structure
  const dailySchedule = WEEKDAYS.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    
    return {
      day,
      date: date.toISOString().split('T')[0],
      plannedHours: index < 5 ? 8 : 0, // Default 8 hours Mon-Fri
      plannedPoints: index < 5 ? 64 : 0,
      actualHours: 0,
      actualPoints: 0,
      notes: ''
    };
  });
  
  const schedule = {
    id: `SCHED${Date.now()}`,
    employeeId,
    weekStartDate,
    weekNumber: getWeekNumber(weekStart),
    year: weekStart.getFullYear(),
    totalHours: 40,
    totalPoints: 320,
    dailySchedule,
    status: SCHEDULE_STATUS.DRAFT,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    ...scheduleData
  };
  
  updateSchedule(null, schedule);
  
  return { success: true, schedule };
}

/**
 * Update a schedule
 * @param {string} scheduleId - Schedule ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} Result { success, errors }
 */
export function editSchedule(scheduleId, updates) {
  const existing = getScheduleById(scheduleId);
  if (!existing) {
    return { success: false, errors: ['Schedule nicht gefunden'] };
  }
  
  // Prevent editing approved schedules
  if (existing.status === SCHEDULE_STATUS.APPROVED && !updates.forceUpdate) {
    return { success: false, errors: ['Genehmigte Schedules können nicht bearbeitet werden'] };
  }
  
  // Recalculate totals if daily schedule changed
  if (updates.dailySchedule) {
    updates.totalHours = updates.dailySchedule.reduce((sum, day) => sum + (day.plannedHours || 0), 0);
    updates.totalPoints = updates.dailySchedule.reduce((sum, day) => sum + (day.plannedPoints || 0), 0);
  }
  
  updateSchedule(scheduleId, updates);
  
  return { success: true };
}

/**
 * Update daily schedule entry
 * @param {string} scheduleId - Schedule ID
 * @param {number} dayIndex - Day index (0-6, Monday-Sunday)
 * @param {Object} dayUpdates - Updates for the day
 * @returns {Object} Result { success, errors }
 */
export function updateDaySchedule(scheduleId, dayIndex, dayUpdates) {
  const schedule = getScheduleById(scheduleId);
  if (!schedule) {
    return { success: false, errors: ['Schedule nicht gefunden'] };
  }
  
  const dailySchedule = [...schedule.dailySchedule];
  dailySchedule[dayIndex] = {
    ...dailySchedule[dayIndex],
    ...dayUpdates,
    plannedPoints: calculatePoints(dayUpdates.plannedHours || dailySchedule[dayIndex].plannedHours)
  };
  
  return editSchedule(scheduleId, { dailySchedule });
}

/**
 * Submit schedule for approval
 * @param {string} scheduleId - Schedule ID
 * @returns {Object} Result { success, errors }
 */
export function submitSchedule(scheduleId) {
  const schedule = getScheduleById(scheduleId);
  if (!schedule) {
    return { success: false, errors: ['Schedule nicht gefunden'] };
  }
  
  if (schedule.status !== SCHEDULE_STATUS.DRAFT) {
    return { success: false, errors: ['Nur Entwürfe können eingereicht werden'] };
  }
  
  return editSchedule(scheduleId, {
    status: SCHEDULE_STATUS.SUBMITTED,
    submittedAt: new Date().toISOString()
  });
}

/**
 * Approve a schedule
 * @param {string} scheduleId - Schedule ID
 * @param {string} approvedBy - Approver ID
 * @returns {Object} Result { success, errors }
 */
export function approveSchedule(scheduleId, approvedBy = 'HR_ADMIN') {
  const schedule = getScheduleById(scheduleId);
  if (!schedule) {
    return { success: false, errors: ['Schedule nicht gefunden'] };
  }
  
  if (schedule.status !== SCHEDULE_STATUS.SUBMITTED) {
    return { success: false, errors: ['Nur eingereichte Schedules können genehmigt werden'] };
  }
  
  return editSchedule(scheduleId, {
    status: SCHEDULE_STATUS.APPROVED,
    approvedBy,
    approvedAt: new Date().toISOString(),
    forceUpdate: true
  });
}

/**
 * Reject a schedule
 * @param {string} scheduleId - Schedule ID
 * @param {string} reason - Rejection reason
 * @returns {Object} Result { success, errors }
 */
export function rejectSchedule(scheduleId, reason = '') {
  const schedule = getScheduleById(scheduleId);
  if (!schedule) {
    return { success: false, errors: ['Schedule nicht gefunden'] };
  }
  
  return editSchedule(scheduleId, {
    status: SCHEDULE_STATUS.REJECTED,
    rejectionReason: reason,
    rejectedAt: new Date().toISOString(),
    forceUpdate: true
  });
}

// ============================================================
// Schedule Calculations
// ============================================================

/**
 * Calculate weekly totals for a schedule
 * @param {Object} schedule - Schedule object
 * @returns {Object} Weekly totals { plannedHours, plannedPoints, actualHours, actualPoints }
 */
export function calculateWeeklyTotals(schedule) {
  if (!schedule || !schedule.dailySchedule) {
    return { plannedHours: 0, plannedPoints: 0, actualHours: 0, actualPoints: 0 };
  }
  
  return schedule.dailySchedule.reduce((totals, day) => ({
    plannedHours: totals.plannedHours + (day.plannedHours || 0),
    plannedPoints: totals.plannedPoints + (day.plannedPoints || 0),
    actualHours: totals.actualHours + (day.actualHours || 0),
    actualPoints: totals.actualPoints + (day.actualPoints || 0)
  }), { plannedHours: 0, plannedPoints: 0, actualHours: 0, actualPoints: 0 });
}

/**
 * Get current week's schedule for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Object|null} Current week's schedule or null
 */
export function getCurrentWeekSchedule(employeeId) {
  const today = new Date();
  const weekStart = getWeekStart(today);
  const weekStartDate = weekStart.toISOString().split('T')[0];
  
  return getScheduleByEmployeeAndWeek(employeeId, weekStartDate);
}

// ============================================================
// Schedule Display Helpers
// ============================================================

/**
 * Format schedule for display
 * @param {Object} schedule - Schedule object
 * @returns {Object} Formatted schedule
 */
export function formatScheduleForDisplay(schedule) {
  const totals = calculateWeeklyTotals(schedule);
  
  return {
    ...schedule,
    formattedWeekStart: formatDateDE(schedule.weekStartDate),
    weekLabel: `KW ${schedule.weekNumber}/${schedule.year}`,
    statusClass: getStatusClass(schedule.status),
    statusText: getStatusText(schedule.status),
    formattedTotalHours: formatHours(totals.plannedHours),
    formattedActualHours: formatHours(totals.actualHours),
    variance: totals.actualHours - totals.plannedHours,
    dailyScheduleFormatted: schedule.dailySchedule?.map((day, index) => ({
      ...day,
      dayNameDE: WEEKDAYS_DE[index],
      formattedDate: formatDateDE(day.date),
      formattedPlannedHours: formatHours(day.plannedHours),
      formattedActualHours: formatHours(day.actualHours)
    }))
  };
}

/**
 * Get schedule grid data for weekly view
 * @param {string} weekStartDate - Week start date
 * @param {Array} employees - List of employees
 * @returns {Object} Grid data for rendering
 */
export function getScheduleGridData(weekStartDate, employees) {
  const schedules = getSchedulesByWeek(weekStartDate);
  
  return {
    weekStartDate,
    weekLabel: `KW ${getWeekNumber(new Date(weekStartDate))}`,
    days: WEEKDAYS_DE,
    rows: employees.map(emp => {
      const schedule = schedules.find(s => s.employeeId === emp.id);
      return {
        employee: emp,
        schedule: schedule ? formatScheduleForDisplay(schedule) : null,
        hasSchedule: !!schedule
      };
    })
  };
}

/**
 * Get schedule history for an employee
 * @param {string} employeeId - Employee ID
 * @param {number} weeks - Number of weeks to retrieve
 * @returns {Array} Schedule history
 */
export function getScheduleHistory(employeeId, weeks = 12) {
  const schedules = getSchedulesByEmployee(employeeId);
  
  // Sort by week start date descending
  const sorted = schedules.sort((a, b) => 
    new Date(b.weekStartDate) - new Date(a.weekStartDate)
  );
  
  return sorted.slice(0, weeks).map(formatScheduleForDisplay);
}
