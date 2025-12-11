/**
 * Vacation Submodule
 * 
 * Vacation calendar planning functionality
 * Handles vacation requests, approvals, and balance tracking
 * 
 * @module vacation
 * @version 1.0.0
 */

import {
  getHrState,
  setHrState,
  createVacationRequest,
  approveVacationRequest,
  rejectVacationRequest
} from '../hrState.js';

import {
  validateVacation,
  formatDateDE,
  calculateWorkingDays,
  getStatusClass,
  getStatusText
} from '../hrUtils.js';

// Vacation types
export const VACATION_TYPE = {
  ANNUAL: 'annual',
  UNPAID: 'unpaid',
  SICK: 'sick',
  PARENTAL: 'parental',
  SABBATICAL: 'sabbatical',
  SPECIAL: 'special'
};

// Vacation status
export const VACATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

// Default annual vacation days (German standard)
export const DEFAULT_ANNUAL_VACATION_DAYS = 30;

// ============================================================
// Vacation Data Operations
// ============================================================

/**
 * Get all vacation requests
 * @returns {Array} Array of vacation requests
 */
export function getAllVacation() {
  const state = getHrState();
  return state.vacation;
}

/**
 * Get vacation request by ID
 * @param {string} vacationId - Vacation request ID
 * @returns {Object|null} Vacation request or null
 */
export function getVacationById(vacationId) {
  const state = getHrState();
  return state.vacation.find(v => v.id === vacationId) || null;
}

/**
 * Get vacation requests for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Array} Employee's vacation requests
 */
export function getVacationByEmployee(employeeId) {
  const state = getHrState();
  return state.vacation.filter(v => v.employeeId === employeeId);
}

/**
 * Get vacation requests by status
 * @param {string} status - Vacation status
 * @returns {Array} Vacation requests with the status
 */
export function getVacationByStatus(status) {
  const state = getHrState();
  return state.vacation.filter(v => v.status === status);
}

/**
 * Get pending vacation requests (awaiting approval)
 * @returns {Array} Pending vacation requests
 */
export function getPendingVacationRequests() {
  return getVacationByStatus(VACATION_STATUS.PENDING);
}

/**
 * Get vacation requests for a date range
 * @param {string} startDate - Range start
 * @param {string} endDate - Range end
 * @returns {Array} Vacation requests overlapping with range
 */
export function getVacationInRange(startDate, endDate) {
  const state = getHrState();
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  
  return state.vacation.filter(v => {
    const vacStart = new Date(v.startDate);
    const vacEnd = new Date(v.endDate);
    
    // Check for any overlap
    return vacStart <= rangeEnd && vacEnd >= rangeStart;
  });
}

/**
 * Get approved vacation for a date range
 * @param {string} startDate - Range start
 * @param {string} endDate - Range end
 * @returns {Array} Approved vacation in range
 */
export function getApprovedVacationInRange(startDate, endDate) {
  const vacations = getVacationInRange(startDate, endDate);
  return vacations.filter(v => v.status === VACATION_STATUS.APPROVED);
}

// ============================================================
// Vacation CRUD Operations
// ============================================================

/**
 * Create a new vacation request
 * @param {Object} vacationData - Vacation request data
 * @returns {Object} Result { success, request, errors }
 */
export function createVacation(vacationData) {
  // Validate
  const validation = validateVacation(vacationData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  // Calculate days requested
  const daysRequested = calculateWorkingDays(vacationData.startDate, vacationData.endDate);
  
  // Check for overlapping approved vacation
  const overlapping = checkVacationOverlap(
    vacationData.employeeId,
    vacationData.startDate,
    vacationData.endDate
  );
  
  if (overlapping.hasOverlap) {
    return { success: false, errors: ['Überschneidung mit bestehendem genehmigtem Urlaub'] };
  }
  
  const request = {
    id: `VAC${Date.now()}`,
    employeeId: vacationData.employeeId,
    startDate: vacationData.startDate,
    endDate: vacationData.endDate,
    daysRequested,
    vacationType: vacationData.vacationType || VACATION_TYPE.ANNUAL,
    status: VACATION_STATUS.PENDING,
    reason: vacationData.reason || '',
    replacementContact: vacationData.replacementContact || null,
    requestedAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
    notes: vacationData.notes || ''
  };
  
  createVacationRequest(request);
  
  return { success: true, request };
}

/**
 * Approve a vacation request
 * @param {string} vacationId - Vacation request ID
 * @param {string} approvedBy - Approver ID
 * @returns {Object} Result { success, errors }
 */
export function approveVacation(vacationId, approvedBy = 'HR_ADMIN') {
  const vacation = getVacationById(vacationId);
  if (!vacation) {
    return { success: false, errors: ['Urlaubsantrag nicht gefunden'] };
  }
  
  if (vacation.status !== VACATION_STATUS.PENDING) {
    return { success: false, errors: ['Nur ausstehende Anträge können genehmigt werden'] };
  }
  
  approveVacationRequest(vacationId, approvedBy);
  
  return { success: true };
}

/**
 * Reject a vacation request
 * @param {string} vacationId - Vacation request ID
 * @param {string} reason - Rejection reason
 * @returns {Object} Result { success, errors }
 */
export function rejectVacation(vacationId, reason = '') {
  const vacation = getVacationById(vacationId);
  if (!vacation) {
    return { success: false, errors: ['Urlaubsantrag nicht gefunden'] };
  }
  
  if (vacation.status !== VACATION_STATUS.PENDING) {
    return { success: false, errors: ['Nur ausstehende Anträge können abgelehnt werden'] };
  }
  
  rejectVacationRequest(vacationId, 'HR_ADMIN', reason);
  
  return { success: true };
}

/**
 * Cancel an approved vacation
 * @param {string} vacationId - Vacation request ID
 * @returns {Object} Result { success, errors }
 */
export function cancelVacation(vacationId) {
  const vacation = getVacationById(vacationId);
  if (!vacation) {
    return { success: false, errors: ['Urlaubsantrag nicht gefunden'] };
  }
  
  // Can only cancel pending or approved
  if (vacation.status === VACATION_STATUS.REJECTED || vacation.status === VACATION_STATUS.CANCELLED) {
    return { success: false, errors: ['Dieser Urlaub kann nicht storniert werden'] };
  }
  
  // Import setHrState to properly update vacation status
  // setHrState is imported at the top
  const state = getHrState();
  
  const updatedVacation = state.vacation.map(v => {
    if (v.id === vacationId) {
      return {
        ...v,
        status: VACATION_STATUS.CANCELLED,
        cancelledAt: new Date().toISOString()
      };
    }
    return v;
  });
  
  setHrState({ vacation: updatedVacation });
  
  return { success: true };
}

// ============================================================
// Vacation Balance & Calculations
// ============================================================

/**
 * Check for vacation overlap with existing approved vacation
 * @param {string} employeeId - Employee ID
 * @param {string} startDate - Request start date
 * @param {string} endDate - Request end date
 * @returns {Object} { hasOverlap, overlappingRequests }
 */
export function checkVacationOverlap(employeeId, startDate, endDate) {
  const employeeVacations = getVacationByEmployee(employeeId);
  const approved = employeeVacations.filter(v => v.status === VACATION_STATUS.APPROVED);
  
  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);
  
  const overlapping = approved.filter(v => {
    const vacStart = new Date(v.startDate);
    const vacEnd = new Date(v.endDate);
    return reqStart <= vacEnd && reqEnd >= vacStart;
  });
  
  return {
    hasOverlap: overlapping.length > 0,
    overlappingRequests: overlapping
  };
}

/**
 * Calculate vacation balance for an employee
 * @param {string} employeeId - Employee ID
 * @param {number} year - Year to calculate for
 * @param {number} totalDays - Total annual vacation days
 * @returns {Object} Vacation balance { total, used, pending, remaining }
 */
export function calculateVacationBalance(employeeId, year = new Date().getFullYear(), totalDays = DEFAULT_ANNUAL_VACATION_DAYS) {
  const employeeVacations = getVacationByEmployee(employeeId);
  
  // Filter for the given year
  const yearVacations = employeeVacations.filter(v => {
    const vacYear = new Date(v.startDate).getFullYear();
    return vacYear === year;
  });
  
  // Calculate used days (approved)
  const usedDays = yearVacations
    .filter(v => v.status === VACATION_STATUS.APPROVED && v.vacationType === VACATION_TYPE.ANNUAL)
    .reduce((sum, v) => sum + v.daysRequested, 0);
  
  // Calculate pending days
  const pendingDays = yearVacations
    .filter(v => v.status === VACATION_STATUS.PENDING && v.vacationType === VACATION_TYPE.ANNUAL)
    .reduce((sum, v) => sum + v.daysRequested, 0);
  
  return {
    total: totalDays,
    used: usedDays,
    pending: pendingDays,
    remaining: totalDays - usedDays,
    availableAfterPending: totalDays - usedDays - pendingDays
  };
}

/**
 * Get vacation statistics for a team/department
 * @param {Array} employeeIds - Array of employee IDs
 * @param {number} year - Year
 * @returns {Object} Team vacation statistics
 */
export function getTeamVacationStats(employeeIds, year = new Date().getFullYear()) {
  return employeeIds.map(empId => ({
    employeeId: empId,
    balance: calculateVacationBalance(empId, year)
  }));
}

// ============================================================
// Vacation Calendar & Display
// ============================================================

/**
 * Format vacation request for display
 * @param {Object} vacation - Vacation request
 * @returns {Object} Formatted vacation request
 */
export function formatVacationForDisplay(vacation) {
  return {
    ...vacation,
    formattedStartDate: formatDateDE(vacation.startDate),
    formattedEndDate: formatDateDE(vacation.endDate),
    formattedRequestedAt: formatDateDE(vacation.requestedAt),
    statusClass: getStatusClass(vacation.status),
    statusText: getStatusText(vacation.status),
    typeText: getStatusText(vacation.vacationType),
    duration: `${vacation.daysRequested} Tag${vacation.daysRequested === 1 ? '' : 'e'}`
  };
}

/**
 * Get vacation calendar data for a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Object} Calendar data
 */
export function getVacationCalendarData(year, month) {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  const vacations = getApprovedVacationInRange(startDate, endDate);
  
  // Group by date
  const byDate = {};
  vacations.forEach(v => {
    const vStart = new Date(v.startDate);
    const vEnd = new Date(v.endDate);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    // Iterate through each day of the vacation that falls in the month
    const current = new Date(Math.max(vStart, monthStart));
    const end = new Date(Math.min(vEnd, monthEnd));
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (!byDate[dateStr]) {
        byDate[dateStr] = [];
      }
      byDate[dateStr].push(v);
      current.setDate(current.getDate() + 1);
    }
  });
  
  return {
    year,
    month,
    startDate,
    endDate,
    vacationsByDate: byDate,
    totalVacations: vacations.length
  };
}

/**
 * Get upcoming vacation for an employee
 * @param {string} employeeId - Employee ID
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Upcoming vacation requests
 */
export function getUpcomingVacation(employeeId, days = 90) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  const employeeVacations = getVacationByEmployee(employeeId);
  
  return employeeVacations
    .filter(v => {
      const startDate = new Date(v.startDate);
      return startDate >= today && startDate <= futureDate && v.status === VACATION_STATUS.APPROVED;
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map(formatVacationForDisplay);
}

/**
 * Get team coverage view for vacation planning
 * @param {Array} employeeIds - Array of employee IDs
 * @param {string} startDate - Period start
 * @param {string} endDate - Period end
 * @returns {Object} Team coverage data
 */
export function getTeamCoverageView(employeeIds, startDate, endDate) {
  const vacations = getApprovedVacationInRange(startDate, endDate);
  
  // Build coverage map
  const coverage = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const absentEmployees = vacations
      .filter(v => {
        const vStart = new Date(v.startDate);
        const vEnd = new Date(v.endDate);
        return current >= vStart && current <= vEnd;
      })
      .map(v => v.employeeId);
    
    coverage[dateStr] = {
      date: dateStr,
      absentCount: absentEmployees.length,
      presentCount: employeeIds.length - absentEmployees.length,
      absentEmployees,
      presentEmployees: employeeIds.filter(id => !absentEmployees.includes(id)),
      coveragePercent: ((employeeIds.length - absentEmployees.length) / employeeIds.length) * 100
    };
    
    current.setDate(current.getDate() + 1);
  }
  
  return {
    startDate,
    endDate,
    teamSize: employeeIds.length,
    dailyCoverage: coverage
  };
}
