/**
 * Attendance Submodule
 * 
 * Manual attendance tracking functionality
 * Handles daily attendance records and reporting
 * 
 * @module attendance
 * @version 1.0.0
 */

import {
  getHrState,
  recordAttendance,
  updateAttendance
} from '../hrState.js';

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
} from '../hrUtils.js';

// Attendance status options
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  SICK_LEAVE: 'sick_leave',
  VACATION: 'vacation',
  UNPAID_LEAVE: 'unpaid_leave',
  PUBLIC_HOLIDAY: 'public_holiday',
  HOME_OFFICE: 'home_office'
};

// Attendance type options
export const ATTENDANCE_TYPE = {
  REGULAR: 'regular',
  OVERTIME: 'overtime',
  HALF_DAY: 'half_day',
  TRAINING: 'training',
  TRAVEL: 'travel'
};

// ============================================================
// Attendance Data Operations
// ============================================================

/**
 * Get all attendance records
 * @returns {Array} Array of attendance records
 */
export function getAllAttendance() {
  const state = getHrState();
  return state.attendance;
}

/**
 * Get attendance record by ID
 * @param {string} attendanceId - Attendance record ID
 * @returns {Object|null} Attendance record or null
 */
export function getAttendanceById(attendanceId) {
  const state = getHrState();
  return state.attendance.find(a => a.id === attendanceId) || null;
}

/**
 * Get attendance records for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Array} Attendance records for the employee
 */
export function getAttendanceByEmployee(employeeId) {
  const state = getHrState();
  return state.attendance.filter(a => a.employeeId === employeeId);
}

/**
 * Get attendance records for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Array} Attendance records for the date
 */
export function getAttendanceByDate(date) {
  const state = getHrState();
  return state.attendance.filter(a => a.date === date);
}

/**
 * Get attendance records for a date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array} Attendance records in range
 */
export function getAttendanceByDateRange(startDate, endDate) {
  const state = getHrState();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return state.attendance.filter(a => {
    const date = new Date(a.date);
    return date >= start && date <= end;
  });
}

/**
 * Get attendance records for an employee in a date range
 * @param {string} employeeId - Employee ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array} Filtered attendance records
 */
export function getEmployeeAttendanceInRange(employeeId, startDate, endDate) {
  const records = getAttendanceByDateRange(startDate, endDate);
  return records.filter(a => a.employeeId === employeeId);
}

// ============================================================
// Attendance CRUD Operations
// ============================================================

/**
 * Create a new attendance record
 * @param {string} employeeId - Employee ID
 * @param {Object} attendanceData - Attendance data
 * @returns {Object} Result { success, record, errors }
 */
export function createAttendanceRecord(employeeId, attendanceData) {
  const fullData = { employeeId, ...attendanceData };
  
  // Validate
  const validation = validateAttendance(fullData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  // Calculate hours if times provided
  let hoursWorked = attendanceData.hoursWorked || 0;
  if (attendanceData.entryTime && attendanceData.exitTime) {
    hoursWorked = calculateHoursWorked(
      attendanceData.entryTime,
      attendanceData.exitTime,
      attendanceData.breakMinutes || 0
    );
  }
  
  // Create record with defaults
  const record = {
    id: `ATT${Date.now()}`,
    employeeId,
    date: attendanceData.date,
    dayOfWeek: getDayName(attendanceData.date),
    entryTime: attendanceData.entryTime || null,
    exitTime: attendanceData.exitTime || null,
    breakMinutes: attendanceData.breakMinutes || 30,
    hoursWorked,
    status: attendanceData.status || ATTENDANCE_STATUS.PRESENT,
    type: attendanceData.type || ATTENDANCE_TYPE.REGULAR,
    notes: attendanceData.notes || '',
    manuallyRecorded: true,
    recordedBy: employeeId,
    recordedAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  
  recordAttendance(employeeId, record);
  
  return { success: true, record };
}

/**
 * Update an existing attendance record
 * @param {string} attendanceId - Attendance record ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} Result { success, errors }
 */
export function editAttendanceRecord(attendanceId, updates) {
  const existing = getAttendanceById(attendanceId);
  if (!existing) {
    return { success: false, errors: ['Anwesenheitseintrag nicht gefunden'] };
  }
  
  // Recalculate hours if times changed
  let hoursWorked = updates.hoursWorked;
  const entryTime = updates.entryTime || existing.entryTime;
  const exitTime = updates.exitTime || existing.exitTime;
  const breakMinutes = updates.breakMinutes ?? existing.breakMinutes;
  
  if (entryTime && exitTime && (updates.entryTime || updates.exitTime || updates.breakMinutes !== undefined)) {
    hoursWorked = calculateHoursWorked(entryTime, exitTime, breakMinutes);
  }
  
  updateAttendance(attendanceId, {
    ...updates,
    hoursWorked: hoursWorked ?? existing.hoursWorked
  });
  
  return { success: true };
}

// ============================================================
// Attendance Reporting
// ============================================================

/**
 * Get daily attendance summary
 * @param {string} date - Date to summarize
 * @returns {Object} Daily summary
 */
export function getDailyAttendanceSummary(date) {
  const records = getAttendanceByDate(date);
  return {
    date,
    dayOfWeek: getDayName(date),
    totalRecords: records.length,
    ...getAttendanceSummary(records)
  };
}

/**
 * Get employee attendance summary for a period
 * @param {string} employeeId - Employee ID
 * @param {string} startDate - Period start
 * @param {string} endDate - Period end
 * @returns {Object} Employee attendance summary
 */
export function getEmployeeAttendanceSummary(employeeId, startDate, endDate) {
  const records = getEmployeeAttendanceInRange(employeeId, startDate, endDate);
  return {
    employeeId,
    periodStart: startDate,
    periodEnd: endDate,
    ...getAttendanceSummary(records)
  };
}

/**
 * Get attendance report by month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Object} Monthly attendance report
 */
export function getMonthlyAttendanceReport(year, month) {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  const records = getAttendanceByDateRange(startDate, endDate);
  const byEmployee = groupAttendanceByEmployee(records);
  
  const employeeSummaries = Object.entries(byEmployee).map(([empId, empRecords]) => ({
    employeeId: empId,
    ...getAttendanceSummary(empRecords)
  }));
  
  return {
    year,
    month,
    startDate,
    endDate,
    totalRecords: records.length,
    employeeSummaries,
    overall: getAttendanceSummary(records)
  };
}

// ============================================================
// Attendance Display Helpers
// ============================================================

/**
 * Format attendance record for display
 * @param {Object} record - Attendance record
 * @returns {Object} Formatted record
 */
export function formatAttendanceForDisplay(record) {
  return {
    ...record,
    formattedDate: formatDateDE(record.date),
    formattedEntryTime: formatTimeDE(record.entryTime) || '-',
    formattedExitTime: formatTimeDE(record.exitTime) || '-',
    formattedHours: formatHours(record.hoursWorked),
    statusClass: getStatusClass(record.status),
    statusText: getStatusText(record.status),
    typeText: getStatusText(record.type)
  };
}

/**
 * Get attendance list for employee display
 * @param {string} employeeId - Employee ID
 * @param {number} limit - Number of records to return
 * @returns {Array} Formatted attendance records
 */
export function getEmployeeAttendanceForDisplay(employeeId, limit = 10) {
  const records = getAttendanceByEmployee(employeeId);
  
  // Sort by date descending
  const sorted = records.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Limit and format
  return sorted.slice(0, limit).map(formatAttendanceForDisplay);
}

/**
 * Get today's attendance status for all employees
 * @returns {Array} Today's attendance records
 */
export function getTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  return getAttendanceByDate(today).map(formatAttendanceForDisplay);
}

/**
 * Check if employee has attendance record for date
 * @param {string} employeeId - Employee ID
 * @param {string} date - Date to check
 * @returns {boolean} True if record exists
 */
export function hasAttendanceRecord(employeeId, date) {
  const records = getAttendanceByDate(date);
  return records.some(r => r.employeeId === employeeId);
}
