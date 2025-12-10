/**
 * HR Module Utility Functions
 * 
 * Common utility functions for HR module operations
 * Includes validation, formatting, and calculation helpers
 * 
 * @module hrUtils
 * @version 1.0.0
 */

// ============================================================
// Date & Time Utilities
// ============================================================

/**
 * Format date to German locale string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string (e.g., "10.12.2025")
 */
export function formatDateDE(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format time to German locale string
 * @param {string} time - Time string (HH:MM format)
 * @returns {string} Formatted time string
 */
export function formatTimeDE(time) {
  if (!time) return '';
  return time;
}

/**
 * Get ISO week number from date
 * @param {Date} date - Date object
 * @returns {number} Week number (1-53)
 */
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get start of week (Monday) for a given date
 * @param {Date} date - Date object
 * @returns {Date} Monday of that week
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get day name from date
 * @param {Date|string} date - Date to get day name for
 * @returns {string} Day name in German
 */
export function getDayName(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', { weekday: 'long' });
}

/**
 * Calculate working days between two dates (excluding weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of working days
 */
export function calculateWorkingDays(startDate, endDate) {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// ============================================================
// Time Calculation Utilities
// ============================================================

/**
 * Convert decimal hours to hours and minutes
 * @param {number} decimalHours - Decimal hours (e.g., 8.5)
 * @returns {Object} { hours: number, minutes: number }
 */
export function decimalToHoursMinutes(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return { hours, minutes };
}

/**
 * Convert hours and minutes to decimal hours
 * @param {number} hours - Hours
 * @param {number} minutes - Minutes
 * @returns {number} Decimal hours
 */
export function hoursMinutesToDecimal(hours, minutes) {
  return hours + (minutes / 60);
}

/**
 * Calculate hours worked from entry and exit time
 * @param {string} entryTime - Entry time (HH:MM)
 * @param {string} exitTime - Exit time (HH:MM)
 * @param {number} breakMinutes - Break duration in minutes
 * @returns {number} Hours worked (decimal)
 */
export function calculateHoursWorked(entryTime, exitTime, breakMinutes = 0) {
  if (!entryTime || !exitTime) return 0;
  
  const [entryHours, entryMins] = entryTime.split(':').map(Number);
  const [exitHours, exitMins] = exitTime.split(':').map(Number);
  
  const entryDecimal = hoursMinutesToDecimal(entryHours, entryMins);
  const exitDecimal = hoursMinutesToDecimal(exitHours, exitMins);
  
  const totalHours = exitDecimal - entryDecimal - (breakMinutes / 60);
  
  return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate points from hours (default: 8 points per hour)
 * @param {number} hours - Hours worked
 * @param {number} pointsPerHour - Points per hour (default 8)
 * @returns {number} Total points
 */
export function calculatePoints(hours, pointsPerHour = 8) {
  return Math.round(hours * pointsPerHour);
}

// ============================================================
// Validation Utilities
// ============================================================

/**
 * Validate employee data
 * @param {Object} employee - Employee data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateEmployee(employee) {
  const errors = [];
  
  if (!employee.firstName || employee.firstName.trim() === '') {
    errors.push('Vorname ist erforderlich');
  }
  
  if (!employee.lastName || employee.lastName.trim() === '') {
    errors.push('Nachname ist erforderlich');
  }
  
  if (!employee.email || !isValidEmail(employee.email)) {
    errors.push('Gültige E-Mail-Adresse ist erforderlich');
  }
  
  if (employee.hoursPerWeek && (employee.hoursPerWeek < 0 || employee.hoursPerWeek > 60)) {
    errors.push('Wochenstunden müssen zwischen 0 und 60 liegen');
  }
  
  if (employee.startDate && !isValidDate(employee.startDate)) {
    errors.push('Ungültiges Startdatum');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate attendance record
 * @param {Object} attendance - Attendance data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateAttendance(attendance) {
  const errors = [];
  
  if (!attendance.employeeId) {
    errors.push('Mitarbeiter-ID ist erforderlich');
  }
  
  if (!attendance.date || !isValidDate(attendance.date)) {
    errors.push('Gültiges Datum ist erforderlich');
  }
  
  if (attendance.entryTime && !isValidTime(attendance.entryTime)) {
    errors.push('Ungültige Eintrittszeit');
  }
  
  if (attendance.exitTime && !isValidTime(attendance.exitTime)) {
    errors.push('Ungültige Austrittszeit');
  }
  
  if (attendance.entryTime && attendance.exitTime) {
    const hours = calculateHoursWorked(attendance.entryTime, attendance.exitTime);
    if (hours < 0) {
      errors.push('Austrittszeit muss nach Eintrittszeit liegen');
    }
    if (hours > 14) {
      errors.push('Arbeitszeit überschreitet 14 Stunden (Arbeitszeitgesetz)');
    }
  }
  
  if (attendance.breakMinutes && (attendance.breakMinutes < 0 || attendance.breakMinutes > 120)) {
    errors.push('Pausenzeit muss zwischen 0 und 120 Minuten liegen');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate vacation request
 * @param {Object} vacation - Vacation data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateVacation(vacation) {
  const errors = [];
  
  if (!vacation.employeeId) {
    errors.push('Mitarbeiter-ID ist erforderlich');
  }
  
  if (!vacation.startDate || !isValidDate(vacation.startDate)) {
    errors.push('Gültiges Startdatum ist erforderlich');
  }
  
  if (!vacation.endDate || !isValidDate(vacation.endDate)) {
    errors.push('Gültiges Enddatum ist erforderlich');
  }
  
  if (vacation.startDate && vacation.endDate) {
    const start = new Date(vacation.startDate);
    const end = new Date(vacation.endDate);
    if (end < start) {
      errors.push('Enddatum muss nach Startdatum liegen');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if date string is valid ISO format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Check if time string is valid HH:MM format
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} True if valid
 */
export function isValidTime(timeStr) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeStr);
}

/**
 * Check if German IBAN is valid (basic format check)
 * Note: Only validates German IBAN format (DE + 2 check digits + 18 digits)
 * @param {string} iban - IBAN to validate
 * @returns {boolean} True if valid German IBAN format
 */
export function isValidGermanIBAN(iban) {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // German IBAN format: DE + 2 check digits + 18 digits (bank code 8 + account 10)
  const ibanRegex = /^DE[0-9]{20}$/;
  return ibanRegex.test(cleaned);
}

// Alias for backwards compatibility
export const isValidIBAN = isValidGermanIBAN;

/**
 * Check if German tax ID is valid format
 * @param {string} taxId - Tax ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidTaxId(taxId) {
  if (!taxId) return false;
  // German tax ID is 11 digits
  const taxIdRegex = /^[0-9]{11}$/;
  return taxIdRegex.test(taxId.replace(/\s/g, ''));
}

// ============================================================
// Formatting Utilities
// ============================================================

/**
 * Format employee name
 * @param {Object} employee - Employee object
 * @returns {string} Formatted name (Last, First)
 */
export function formatEmployeeName(employee) {
  if (!employee) return '';
  return `${employee.lastName}, ${employee.firstName}`;
}

/**
 * Format hours as string (e.g., "8h 30m")
 * @param {number} decimalHours - Decimal hours
 * @returns {string} Formatted hours string
 */
export function formatHours(decimalHours) {
  const { hours, minutes } = decimalToHoursMinutes(decimalHours);
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Format currency (EUR)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Get status badge class based on status
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
export function getStatusClass(status) {
  const statusMap = {
    present: 'hr-status-present',
    absent: 'hr-status-absent',
    vacation: 'hr-status-vacation',
    sick_leave: 'hr-status-sick',
    home_office: 'hr-status-home',
    unpaid_leave: 'hr-status-unpaid',
    public_holiday: 'hr-status-holiday',
    approved: 'hr-status-approved',
    pending: 'hr-status-pending',
    rejected: 'hr-status-rejected',
    active: 'hr-status-active',
    inactive: 'hr-status-inactive',
    draft: 'hr-status-draft',
    submitted: 'hr-status-submitted'
  };
  
  return statusMap[status] || 'hr-status-default';
}

/**
 * Get status display text in German
 * @param {string} status - Status value
 * @returns {string} German status text
 */
export function getStatusText(status) {
  const statusTextMap = {
    present: 'Anwesend',
    absent: 'Abwesend',
    vacation: 'Urlaub',
    sick_leave: 'Krankheit',
    home_office: 'Home Office',
    unpaid_leave: 'Unbezahlter Urlaub',
    public_holiday: 'Feiertag',
    approved: 'Genehmigt',
    pending: 'Ausstehend',
    rejected: 'Abgelehnt',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    draft: 'Entwurf',
    submitted: 'Eingereicht',
    annual: 'Jahresurlaub',
    unpaid: 'Unbezahlt',
    sick: 'Krankheit',
    parental: 'Elternzeit',
    sabbatical: 'Sabbatical',
    special: 'Sonderurlaub',
    fulltime: 'Vollzeit',
    parttime: 'Teilzeit',
    minijob: 'Minijob',
    intern: 'Praktikant',
    temporary: 'Befristet'
  };
  
  return statusTextMap[status] || status;
}

// ============================================================
// ID Generation Utilities
// ============================================================

/**
 * Generate a unique employee ID
 * @param {string} prefix - ID prefix (default: 'EMP')
 * @returns {string} Generated ID
 */
export function generateEmployeeId(prefix = 'EMP') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate a unique attendance record ID
 * @returns {string} Generated ID
 */
export function generateAttendanceId() {
  return `ATT${Date.now()}`;
}

/**
 * Generate a unique schedule ID
 * @returns {string} Generated ID
 */
export function generateScheduleId() {
  return `SCHED${Date.now()}`;
}

/**
 * Generate a unique vacation request ID
 * @returns {string} Generated ID
 */
export function generateVacationId() {
  return `VAC${Date.now()}`;
}

// ============================================================
// Data Transformation Utilities
// ============================================================

/**
 * Group attendance records by employee
 * @param {Array} attendance - Attendance records array
 * @returns {Object} Grouped by employeeId
 */
export function groupAttendanceByEmployee(attendance) {
  return attendance.reduce((groups, record) => {
    const empId = record.employeeId;
    if (!groups[empId]) {
      groups[empId] = [];
    }
    groups[empId].push(record);
    return groups;
  }, {});
}

/**
 * Calculate total hours for an array of attendance records
 * @param {Array} attendance - Attendance records
 * @returns {number} Total hours worked
 */
export function calculateTotalHours(attendance) {
  return attendance.reduce((total, record) => {
    return total + (record.hoursWorked || 0);
  }, 0);
}

/**
 * Get attendance summary for a period
 * @param {Array} attendance - Attendance records
 * @returns {Object} Summary { totalDays, presentDays, absentDays, sickDays, vacationDays }
 */
export function getAttendanceSummary(attendance) {
  const summary = {
    totalDays: attendance.length,
    presentDays: 0,
    absentDays: 0,
    sickDays: 0,
    vacationDays: 0,
    homeOfficeDays: 0,
    totalHours: 0
  };
  
  attendance.forEach(record => {
    switch (record.status) {
      case 'present':
        summary.presentDays++;
        break;
      case 'absent':
        summary.absentDays++;
        break;
      case 'sick_leave':
        summary.sickDays++;
        break;
      case 'vacation':
        summary.vacationDays++;
        break;
      case 'home_office':
        summary.homeOfficeDays++;
        summary.presentDays++; // Count as present
        break;
    }
    summary.totalHours += record.hoursWorked || 0;
  });
  
  return summary;
}

/**
 * Sort employees by a given field
 * @param {Array} employees - Employees array
 * @param {string} field - Field to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted employees array
 */
export function sortEmployees(employees, field = 'lastName', direction = 'asc') {
  return [...employees].sort((a, b) => {
    let valueA = a[field];
    let valueB = b[field];
    
    // Handle string comparison
    if (typeof valueA === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}
