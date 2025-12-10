/**
 * Employees Submodule
 * 
 * Employee roster management functionality
 * Handles employee CRUD operations and data management
 * 
 * @module employees
 * @version 1.0.0
 */

import {
  getHrState,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  filterEmployees
} from '../hrState.js';

import {
  validateEmployee,
  formatEmployeeName,
  formatDateDE,
  getStatusClass,
  getStatusText,
  generateEmployeeId,
  sortEmployees
} from '../hrUtils.js';

// ============================================================
// Employee Data Operations
// ============================================================

/**
 * Get all employees from state
 * @returns {Array} Array of employee objects
 */
export function getAllEmployees() {
  const state = getHrState();
  return state.employees;
}

/**
 * Get employee by ID
 * @param {string} employeeId - Employee ID
 * @returns {Object|null} Employee object or null if not found
 */
export function getEmployeeById(employeeId) {
  const state = getHrState();
  return state.employees.find(e => e.id === employeeId) || null;
}

/**
 * Get employees by department
 * @param {string} department - Department name
 * @returns {Array} Filtered employees
 */
export function getEmployeesByDepartment(department) {
  return filterEmployees({ department });
}

/**
 * Get active employees
 * @returns {Array} Active employees
 */
export function getActiveEmployees() {
  return filterEmployees({ status: 'active' });
}

/**
 * Search employees by text
 * @param {string} searchText - Search query
 * @returns {Array} Matching employees
 */
export function searchEmployees(searchText) {
  return filterEmployees({ searchText });
}

/**
 * Get employee statistics
 * @returns {Object} Employee statistics
 */
export function getEmployeeStatistics() {
  const employees = getAllEmployees();
  
  const byDepartment = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Unzugewiesen';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  
  const byStatus = employees.reduce((acc, emp) => {
    const status = emp.employmentStatus || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const byContractType = employees.reduce((acc, emp) => {
    const type = emp.contractType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total: employees.length,
    active: byStatus.active || 0,
    inactive: byStatus.inactive || 0,
    byDepartment,
    byStatus,
    byContractType
  };
}

// ============================================================
// Employee CRUD Operations
// ============================================================

/**
 * Create a new employee
 * @param {Object} employeeData - Employee data
 * @returns {Object} Result { success, employee, errors }
 */
export function createEmployee(employeeData) {
  // Validate
  const validation = validateEmployee(employeeData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  // Create with defaults
  const newEmployee = {
    id: generateEmployeeId(),
    firstName: employeeData.firstName,
    lastName: employeeData.lastName,
    email: employeeData.email,
    department: employeeData.department || '',
    position: employeeData.position || '',
    contractType: employeeData.contractType || 'fulltime',
    startDate: employeeData.startDate || new Date().toISOString().split('T')[0],
    endDate: employeeData.endDate || null,
    hoursPerWeek: employeeData.hoursPerWeek || 40,
    employmentStatus: employeeData.employmentStatus || 'active',
    personalNumber: employeeData.personalNumber || '',
    socialSecurityNumber: employeeData.socialSecurityNumber || '',
    bankAccount: employeeData.bankAccount || {
      iban: '',
      bic: ''
    },
    address: employeeData.address || {
      street: '',
      zipCode: '',
      city: '',
      country: 'Germany'
    },
    tax: employeeData.tax || {
      taxClass: 'I',
      churchTax: false,
      taxId: ''
    },
    socialInsurance: employeeData.socialInsurance || {
      healthInsurance: '',
      pensionFund: '',
      accidentInsurance: ''
    },
    emergencyContact: employeeData.emergencyContact || {
      name: '',
      phone: '',
      relationship: ''
    },
    notes: employeeData.notes || ''
  };
  
  addEmployee(newEmployee);
  
  return { success: true, employee: newEmployee };
}

/**
 * Edit an existing employee
 * @param {string} employeeId - Employee ID
 * @param {Object} updates - Updates to apply
 * @returns {Object} Result { success, errors }
 */
export function editEmployee(employeeId, updates) {
  const existing = getEmployeeById(employeeId);
  if (!existing) {
    return { success: false, errors: ['Mitarbeiter nicht gefunden'] };
  }
  
  // Validate merged data
  const merged = { ...existing, ...updates };
  const validation = validateEmployee(merged);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  updateEmployee(employeeId, updates);
  
  return { success: true };
}

/**
 * Remove an employee
 * @param {string} employeeId - Employee ID
 * @returns {Object} Result { success, errors }
 */
export function removeEmployee(employeeId) {
  const existing = getEmployeeById(employeeId);
  if (!existing) {
    return { success: false, errors: ['Mitarbeiter nicht gefunden'] };
  }
  
  deleteEmployee(employeeId);
  
  return { success: true };
}

/**
 * Archive an employee (soft delete)
 * @param {string} employeeId - Employee ID
 * @returns {Object} Result { success, errors }
 */
export function archiveEmployee(employeeId) {
  return editEmployee(employeeId, {
    employmentStatus: 'inactive',
    endDate: new Date().toISOString().split('T')[0]
  });
}

// ============================================================
// Employee Data Helpers
// ============================================================

/**
 * Get unique departments from employee list
 * @returns {Array} List of unique department names
 */
export function getUniqueDepartments() {
  const employees = getAllEmployees();
  const departments = new Set(employees.map(e => e.department).filter(Boolean));
  return Array.from(departments).sort();
}

/**
 * Get unique positions from employee list
 * @returns {Array} List of unique position titles
 */
export function getUniquePositions() {
  const employees = getAllEmployees();
  const positions = new Set(employees.map(e => e.position).filter(Boolean));
  return Array.from(positions).sort();
}

/**
 * Format employee data for display
 * @param {Object} employee - Employee object
 * @returns {Object} Formatted employee data
 */
export function formatEmployeeForDisplay(employee) {
  return {
    ...employee,
    fullName: formatEmployeeName(employee),
    formattedStartDate: formatDateDE(employee.startDate),
    formattedEndDate: employee.endDate ? formatDateDE(employee.endDate) : '-',
    statusClass: getStatusClass(employee.employmentStatus),
    statusText: getStatusText(employee.employmentStatus),
    contractTypeText: getStatusText(employee.contractType)
  };
}

/**
 * Get sorted and formatted employee list for display
 * @param {Object} options - Sort options { sortBy, direction }
 * @returns {Array} Sorted and formatted employee list
 */
export function getEmployeeListForDisplay(options = {}) {
  const { sortBy = 'lastName', direction = 'asc' } = options;
  const employees = getAllEmployees();
  const sorted = sortEmployees(employees, sortBy, direction);
  return sorted.map(formatEmployeeForDisplay);
}
