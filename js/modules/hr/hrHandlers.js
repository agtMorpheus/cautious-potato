/**
 * HR Module Event Handlers
 * 
 * Handles user interactions and coordinates between UI, state, and utilities
 * Implements event-driven architecture for HR module
 * 
 * @module hrHandlers
 * @version 1.0.0
 */

import {
  getHrState,
  setHrState,
  resetHrState,
  loadHrStateFromStorage,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  recordAttendance,
  updateAttendance,
  updateSchedule,
  createVacationRequest,
  approveVacationRequest,
  rejectVacationRequest,
  setActiveTab,
  setEditingRecord,
  setModalState,
  setLoading,
  setError,
  setFilters,
  resetFilters,
  subscribeHr
} from './hrState.js';

import {
  validateEmployee,
  validateAttendance,
  validateVacation,
  formatEmployeeName,
  formatDateDE,
  calculateHoursWorked,
  calculatePoints,
  getStatusClass,
  getStatusText,
  generateEmployeeId
} from './hrUtils.js';

// ============================================================
// Employee Handlers
// ============================================================

/**
 * Handle adding a new employee
 * @param {Object} employeeData - Employee form data
 * @returns {Object} Result { success, employee, errors }
 */
export function handleAddEmployee(employeeData) {
  setLoading(true);
  setError(null);
  
  try {
    // Validate employee data
    const validation = validateEmployee(employeeData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }
    
    // Add employee with generated ID
    const newEmployee = {
      ...employeeData,
      id: generateEmployeeId(),
      employmentStatus: employeeData.employmentStatus || 'active'
    };
    
    const state = addEmployee(newEmployee);
    
    console.log('Employee added:', newEmployee.id);
    return { success: true, employee: newEmployee };
    
  } catch (error) {
    console.error('Error adding employee:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle updating an existing employee
 * @param {string} employeeId - Employee ID to update
 * @param {Object} updates - Partial updates to apply
 * @returns {Object} Result { success, errors }
 */
export function handleUpdateEmployee(employeeId, updates) {
  setLoading(true);
  setError(null);
  
  try {
    const state = getHrState();
    const existingEmployee = state.employees.find(e => e.id === employeeId);
    
    if (!existingEmployee) {
      throw new Error('Mitarbeiter nicht gefunden');
    }
    
    // Validate merged data
    const mergedData = { ...existingEmployee, ...updates };
    const validation = validateEmployee(mergedData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }
    
    updateEmployee(employeeId, updates);
    
    console.log('Employee updated:', employeeId);
    return { success: true };
    
  } catch (error) {
    console.error('Error updating employee:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle deleting an employee
 * @param {string} employeeId - Employee ID to delete
 * @returns {Object} Result { success, errors }
 */
export function handleDeleteEmployee(employeeId) {
  setLoading(true);
  setError(null);
  
  try {
    deleteEmployee(employeeId);
    console.log('Employee deleted:', employeeId);
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting employee:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

// ============================================================
// Attendance Handlers
// ============================================================

/**
 * Handle recording attendance
 * @param {string} employeeId - Employee ID
 * @param {Object} attendanceData - Attendance data
 * @returns {Object} Result { success, record, errors }
 */
export function handleRecordAttendance(employeeId, attendanceData) {
  setLoading(true);
  setError(null);
  
  try {
    // Validate attendance data
    const validation = validateAttendance({ employeeId, ...attendanceData });
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }
    
    // Calculate hours worked if entry/exit times provided
    let hoursWorked = attendanceData.hoursWorked;
    if (attendanceData.entryTime && attendanceData.exitTime && !hoursWorked) {
      hoursWorked = calculateHoursWorked(
        attendanceData.entryTime,
        attendanceData.exitTime,
        attendanceData.breakMinutes || 0
      );
    }
    
    const fullRecord = {
      ...attendanceData,
      hoursWorked,
      dayOfWeek: new Date(attendanceData.date).toLocaleDateString('de-DE', { weekday: 'long' }),
      manuallyRecorded: true,
      recordedBy: employeeId
    };
    
    recordAttendance(employeeId, fullRecord);
    
    console.log('Attendance recorded for:', employeeId);
    return { success: true, record: fullRecord };
    
  } catch (error) {
    console.error('Error recording attendance:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle updating an attendance record
 * @param {string} attendanceId - Attendance record ID
 * @param {Object} updates - Partial updates
 * @returns {Object} Result { success, errors }
 */
export function handleUpdateAttendance(attendanceId, updates) {
  setLoading(true);
  setError(null);
  
  try {
    updateAttendance(attendanceId, updates);
    console.log('Attendance updated:', attendanceId);
    return { success: true };
    
  } catch (error) {
    console.error('Error updating attendance:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

// ============================================================
// Schedule Handlers
// ============================================================

/**
 * Handle creating or updating a schedule
 * @param {Object} scheduleData - Schedule data
 * @returns {Object} Result { success, schedule, errors }
 */
export function handleSaveSchedule(scheduleData) {
  setLoading(true);
  setError(null);
  
  try {
    // Calculate totals if daily schedule provided
    let totalHours = scheduleData.totalHours || 0;
    let totalPoints = scheduleData.totalPoints || 0;
    
    if (scheduleData.dailySchedule && Array.isArray(scheduleData.dailySchedule)) {
      totalHours = scheduleData.dailySchedule.reduce((sum, day) => sum + (day.plannedHours || 0), 0);
      totalPoints = scheduleData.dailySchedule.reduce((sum, day) => sum + (day.plannedPoints || 0), 0);
    }
    
    const fullSchedule = {
      ...scheduleData,
      totalHours,
      totalPoints
    };
    
    updateSchedule(scheduleData.id, fullSchedule);
    
    console.log('Schedule saved:', scheduleData.id || 'new');
    return { success: true, schedule: fullSchedule };
    
  } catch (error) {
    console.error('Error saving schedule:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle submitting a schedule for approval
 * @param {string} scheduleId - Schedule ID
 * @returns {Object} Result { success, errors }
 */
export function handleSubmitSchedule(scheduleId) {
  setLoading(true);
  setError(null);
  
  try {
    updateSchedule(scheduleId, {
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
    
    console.log('Schedule submitted:', scheduleId);
    return { success: true };
    
  } catch (error) {
    console.error('Error submitting schedule:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle approving a schedule
 * @param {string} scheduleId - Schedule ID
 * @param {string} approvedBy - Approver ID
 * @returns {Object} Result { success, errors }
 */
export function handleApproveSchedule(scheduleId, approvedBy = 'HR_ADMIN') {
  setLoading(true);
  setError(null);
  
  try {
    updateSchedule(scheduleId, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString()
    });
    
    console.log('Schedule approved:', scheduleId);
    return { success: true };
    
  } catch (error) {
    console.error('Error approving schedule:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

// ============================================================
// Vacation Handlers
// ============================================================

/**
 * Handle creating a vacation request
 * @param {Object} vacationData - Vacation request data
 * @returns {Object} Result { success, request, errors }
 */
export function handleCreateVacationRequest(vacationData) {
  setLoading(true);
  setError(null);
  
  try {
    // Validate vacation data
    const validation = validateVacation(vacationData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return { success: false, errors: validation.errors };
    }
    
    createVacationRequest(vacationData);
    
    console.log('Vacation request created for:', vacationData.employeeId);
    return { success: true, request: vacationData };
    
  } catch (error) {
    console.error('Error creating vacation request:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle approving a vacation request
 * @param {string} vacationId - Vacation request ID
 * @param {string} approvedBy - Approver ID
 * @returns {Object} Result { success, errors }
 */
export function handleApproveVacation(vacationId, approvedBy = 'HR_ADMIN') {
  setLoading(true);
  setError(null);
  
  try {
    approveVacationRequest(vacationId, approvedBy);
    console.log('Vacation approved:', vacationId);
    return { success: true };
    
  } catch (error) {
    console.error('Error approving vacation:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

/**
 * Handle rejecting a vacation request
 * @param {string} vacationId - Vacation request ID
 * @param {string} reason - Rejection reason
 * @returns {Object} Result { success, errors }
 */
export function handleRejectVacation(vacationId, reason = '') {
  setLoading(true);
  setError(null);
  
  try {
    rejectVacationRequest(vacationId, 'HR_ADMIN', reason);
    console.log('Vacation rejected:', vacationId);
    return { success: true };
    
  } catch (error) {
    console.error('Error rejecting vacation:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

// ============================================================
// UI Event Handlers
// ============================================================

/**
 * Handle tab navigation
 * @param {string} tabName - Tab to navigate to
 */
export function handleTabChange(tabName) {
  setActiveTab(tabName);
  console.log('Tab changed to:', tabName);
}

/**
 * Handle opening edit modal for a record
 * @param {string} recordId - Record ID to edit
 * @param {string} modalType - Type of modal ('employee', 'attendance', 'schedule', 'vacation')
 */
export function handleOpenEditModal(recordId, modalType) {
  setEditingRecord(recordId);
  setModalState(true, modalType);
}

/**
 * Handle closing modal
 */
export function handleCloseModal() {
  setEditingRecord(null);
  setModalState(false, null);
}

/**
 * Handle filter changes
 * @param {Object} filterChanges - Filter updates
 */
export function handleFilterChange(filterChanges) {
  setFilters(filterChanges);
}

/**
 * Handle clearing all filters
 */
export function handleClearFilters() {
  resetFilters();
}

/**
 * Handle resetting the entire HR module
 * @returns {boolean} True if reset confirmed and executed
 */
export function handleResetHrModule() {
  const confirmed = confirm(
    'Sind Sie sicher, dass Sie alle HR-Daten zurücksetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden.'
  );
  
  if (confirmed) {
    resetHrState({ persist: true, silent: false });
    console.log('HR module reset complete');
    return true;
  }
  
  return false;
}

// ============================================================
// Data Import/Export Handlers
// ============================================================

/**
 * Handle exporting HR data to JSON
 * @returns {Object} Exported data
 */
export function handleExportHrData() {
  const state = getHrState();
  
  const exportData = {
    version: state.metadata.version,
    exportedAt: new Date().toISOString(),
    employees: state.employees,
    attendance: state.attendance,
    schedules: state.schedules,
    vacation: state.vacation
  };
  
  // Create and download JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hr-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('HR data exported');
  return exportData;
}

/**
 * Handle importing HR data from JSON
 * @param {File} file - JSON file to import
 * @returns {Promise<Object>} Result { success, errors }
 */
export async function handleImportHrData(file) {
  setLoading(true);
  setError(null);
  
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // Validate imported data structure
    if (!importData.employees || !Array.isArray(importData.employees)) {
      throw new Error('Ungültiges Import-Format: employees Array fehlt');
    }
    
    // Import data into state
    setHrState({
      employees: importData.employees || [],
      attendance: importData.attendance || [],
      schedules: importData.schedules || [],
      vacation: importData.vacation || [],
      metadata: {
        ...getHrState().metadata,
        totalEmployees: (importData.employees || []).length,
        activeEmployees: (importData.employees || []).filter(e => e.employmentStatus === 'active').length
      }
    });
    
    console.log('HR data imported successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error importing HR data:', error);
    setError(error.message);
    return { success: false, errors: [error.message] };
  } finally {
    setLoading(false);
  }
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize HR module handlers
 * Sets up event listeners and loads persisted state
 */
export function initializeHrHandlers() {
  console.log('Initializing HR module handlers...');
  
  // Load persisted state
  loadHrStateFromStorage();
  
  // Subscribe to state changes for logging
  subscribeHr((state) => {
    console.log('HR state updated:', {
      employees: state.employees.length,
      attendance: state.attendance.length,
      schedules: state.schedules.length,
      vacation: state.vacation.length
    });
  });
  
  console.log('HR module handlers initialized');
}

/**
 * Bind DOM event listeners for HR module
 * Should be called when HR dashboard is rendered
 */
export function bindHrEventListeners() {
  // Tab navigation
  const tabButtons = document.querySelectorAll('[data-hr-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.currentTarget.dataset.hrTab;
      handleTabChange(tabName);
    });
  });
  
  // Add employee button
  const addEmployeeBtn = document.getElementById('hr-add-employee-btn');
  if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener('click', () => {
      handleOpenEditModal(null, 'employee');
    });
  }
  
  // Filter inputs
  const filterInputs = document.querySelectorAll('[data-hr-filter]');
  filterInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const filterName = e.currentTarget.dataset.hrFilter;
      handleFilterChange({ [filterName]: e.currentTarget.value });
    });
  });
  
  // Clear filters button
  const clearFiltersBtn = document.getElementById('hr-clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', handleClearFilters);
  }
  
  console.log('HR event listeners bound');
}
