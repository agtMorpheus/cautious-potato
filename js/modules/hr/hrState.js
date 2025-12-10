/**
 * HR Module State Management
 * 
 * Centralized state for HR Management Module
 * Implements event-driven architecture for reactive UI updates
 * 
 * @module hrState
 * @version 1.0.0
 */

// Storage key for HR module state persistence
const HR_STORAGE_KEY = 'hrModuleState_v1';

/**
 * Initial state structure for HR module
 * Single source of truth for all HR-related data
 */
const initialHrState = {
  employees: [],
  attendance: [],
  schedules: [],
  vacation: [],
  filters: {
    selectedEmployee: null,
    dateRange: {
      start: null,
      end: null
    },
    department: null,
    status: null
  },
  ui: {
    activeTab: 'employees',
    editingRecordId: null,
    showModal: false,
    modalType: null,
    isLoading: false,
    error: null
  },
  metadata: {
    lastSync: null,
    totalEmployees: 0,
    activeEmployees: 0,
    version: '1.0.0'
  }
};

// Current mutable state
let currentHrState = structuredClone(initialHrState);

// Pub/sub listeners for HR state changes
const hrListeners = new Set();

/**
 * Notify all subscribed listeners of state change
 * Also dispatches a DOM CustomEvent for non-module consumers
 */
function notifyHrListeners() {
  const snapshot = getHrState();
  
  // Notify programmatic subscribers
  hrListeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('HR state listener error:', err);
    }
  });

  // Dispatch DOM event for non-module consumers
  document.dispatchEvent(new CustomEvent('hrStateChanged', {
    detail: snapshot
  }));
}

/**
 * Get current HR module state (defensive copy)
 * @returns {Object} Read-only clone of current HR state
 */
export function getHrState() {
  return structuredClone(currentHrState);
}

/**
 * Update HR module state with partial updates
 * @param {Object} partialUpdates - Partial state updates to merge
 * @param {Object} options - Options { silent: boolean }
 * @returns {Object} New state snapshot
 */
export function setHrState(partialUpdates, options = { silent: false }) {
  const prevState = currentHrState;

  // Shallow-merge top-level keys
  currentHrState = {
    ...prevState,
    ...partialUpdates,
    metadata: {
      ...prevState.metadata,
      ...(partialUpdates.metadata || {}),
      lastSync: new Date().toISOString()
    }
  };

  // Persist and notify unless silent
  if (!options.silent) {
    saveHrStateToStorage();
    notifyHrListeners();
  }

  return getHrState();
}

/**
 * Reset HR state to initial values
 * @param {Object} options - Options { persist: boolean, silent: boolean }
 * @returns {Object} Reset state snapshot
 */
export function resetHrState(options = { persist: true, silent: false }) {
  currentHrState = structuredClone(initialHrState);

  if (options.persist) {
    saveHrStateToStorage();
  }

  if (!options.silent) {
    notifyHrListeners();
  }

  return getHrState();
}

/**
 * Subscribe to HR state changes
 * @param {Function} listener - Callback function (receives state snapshot)
 * @returns {Function} Unsubscribe function
 */
export function subscribeHr(listener) {
  if (typeof listener !== 'function') {
    throw new Error('HR state listener must be a function');
  }
  hrListeners.add(listener);

  // Return unsubscribe function
  return () => unsubscribeHr(listener);
}

/**
 * Unsubscribe a listener from HR state changes
 * @param {Function} listener - Listener to remove
 */
export function unsubscribeHr(listener) {
  hrListeners.delete(listener);
}

// ============================================================
// localStorage Persistence
// ============================================================

/**
 * Save current HR state to localStorage
 */
function saveHrStateToStorage() {
  try {
    const serialized = JSON.stringify(currentHrState);
    window.localStorage.setItem(HR_STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save HR state to localStorage:', error);
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Consider clearing old data.');
    }
  }
}

/**
 * Load HR state from localStorage
 * @returns {Object} Loaded state snapshot
 */
export function loadHrStateFromStorage() {
  try {
    const serialized = window.localStorage.getItem(HR_STORAGE_KEY);
    if (!serialized) {
      console.log('No saved HR state found in localStorage. Using initial state.');
      currentHrState = structuredClone(initialHrState);
      return getHrState();
    }

    const parsed = JSON.parse(serialized);
    
    // Merge with initial state to ensure all keys exist
    currentHrState = {
      ...structuredClone(initialHrState),
      ...parsed,
      metadata: {
        ...structuredClone(initialHrState).metadata,
        ...(parsed.metadata || {})
      }
    };

    console.log('HR state successfully loaded from localStorage');
    notifyHrListeners();
    return getHrState();
  } catch (error) {
    console.error('Failed to load HR state from localStorage. Resetting to initial state.', error);
    currentHrState = structuredClone(initialHrState);
    saveHrStateToStorage();
    notifyHrListeners();
    return getHrState();
  }
}

/**
 * Clear persisted HR state from localStorage
 */
export function clearHrPersistedState() {
  try {
    window.localStorage.removeItem(HR_STORAGE_KEY);
    console.log('Persisted HR state cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear persisted HR state from localStorage:', error);
  }
}

// ============================================================
// Employee Helper Functions
// ============================================================

/**
 * Add a new employee to the state
 * @param {Object} employeeData - Employee data object
 * @returns {Object} New state snapshot
 */
export function addEmployee(employeeData) {
  const newEmployee = {
    ...employeeData,
    id: employeeData.id || `EMP${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return setHrState({
    employees: [...currentHrState.employees, newEmployee],
    metadata: {
      ...currentHrState.metadata,
      totalEmployees: currentHrState.employees.length + 1,
      activeEmployees: currentHrState.employees.filter(e => e.employmentStatus === 'active').length + 
                       (newEmployee.employmentStatus === 'active' ? 1 : 0)
    }
  });
}

/**
 * Update an existing employee
 * @param {string} employeeId - Employee ID to update
 * @param {Object} updates - Partial updates to apply
 * @returns {Object} New state snapshot
 */
export function updateEmployee(employeeId, updates) {
  const employees = currentHrState.employees.map(emp => {
    if (emp.id === employeeId) {
      return {
        ...emp,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }
    return emp;
  });
  
  return setHrState({
    employees,
    metadata: {
      ...currentHrState.metadata,
      activeEmployees: employees.filter(e => e.employmentStatus === 'active').length
    }
  });
}

/**
 * Delete an employee from the state
 * @param {string} employeeId - Employee ID to delete
 * @returns {Object} New state snapshot
 */
export function deleteEmployee(employeeId) {
  const employees = currentHrState.employees.filter(emp => emp.id !== employeeId);
  
  return setHrState({
    employees,
    metadata: {
      ...currentHrState.metadata,
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.employmentStatus === 'active').length
    }
  });
}

// ============================================================
// Attendance Helper Functions
// ============================================================

/**
 * Record attendance for an employee
 * @param {string} employeeId - Employee ID
 * @param {Object} attendanceData - Attendance record data
 * @returns {Object} New state snapshot
 */
export function recordAttendance(employeeId, attendanceData) {
  const newRecord = {
    ...attendanceData,
    id: attendanceData.id || `ATT${Date.now()}`,
    employeeId,
    recordedAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  
  return setHrState({
    attendance: [...currentHrState.attendance, newRecord]
  });
}

/**
 * Update an existing attendance record
 * @param {string} attendanceId - Attendance record ID
 * @param {Object} updates - Partial updates to apply
 * @returns {Object} New state snapshot
 */
export function updateAttendance(attendanceId, updates) {
  const attendance = currentHrState.attendance.map(record => {
    if (record.id === attendanceId) {
      return {
        ...record,
        ...updates,
        lastModified: new Date().toISOString()
      };
    }
    return record;
  });
  
  return setHrState({ attendance });
}

// ============================================================
// Schedule Helper Functions
// ============================================================

/**
 * Update or create a schedule record
 * @param {string} scheduleId - Schedule ID (or null for new)
 * @param {Object} scheduleData - Schedule data
 * @returns {Object} New state snapshot
 */
export function updateSchedule(scheduleId, scheduleData) {
  let schedules;
  
  if (scheduleId) {
    // Update existing
    schedules = currentHrState.schedules.map(sched => {
      if (sched.id === scheduleId) {
        return {
          ...sched,
          ...scheduleData
        };
      }
      return sched;
    });
  } else {
    // Create new
    const newSchedule = {
      ...scheduleData,
      id: `SCHED${Date.now()}`,
      status: scheduleData.status || 'draft'
    };
    schedules = [...currentHrState.schedules, newSchedule];
  }
  
  return setHrState({ schedules });
}

// ============================================================
// Vacation Helper Functions
// ============================================================

/**
 * Create a new vacation request
 * @param {Object} vacationData - Vacation request data
 * @returns {Object} New state snapshot
 */
export function createVacationRequest(vacationData) {
  const newRequest = {
    ...vacationData,
    id: vacationData.id || `VAC${Date.now()}`,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };
  
  return setHrState({
    vacation: [...currentHrState.vacation, newRequest]
  });
}

/**
 * Approve a vacation request
 * @param {string} vacationId - Vacation request ID
 * @param {string} approvedBy - ID of approver
 * @returns {Object} New state snapshot
 */
export function approveVacationRequest(vacationId, approvedBy = 'HR_ADMIN') {
  const vacation = currentHrState.vacation.map(req => {
    if (req.id === vacationId) {
      return {
        ...req,
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString()
      };
    }
    return req;
  });
  
  return setHrState({ vacation });
}

/**
 * Reject a vacation request
 * @param {string} vacationId - Vacation request ID
 * @param {string} rejectedBy - ID of rejector
 * @param {string} reason - Rejection reason
 * @returns {Object} New state snapshot
 */
export function rejectVacationRequest(vacationId, rejectedBy = 'HR_ADMIN', reason = '') {
  const vacation = currentHrState.vacation.map(req => {
    if (req.id === vacationId) {
      return {
        ...req,
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason
      };
    }
    return req;
  });
  
  return setHrState({ vacation });
}

// ============================================================
// Filter Helper Functions
// ============================================================

/**
 * Filter employees by criteria
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered employees array
 */
export function filterEmployees(criteria) {
  let filtered = [...currentHrState.employees];
  
  if (criteria.department) {
    filtered = filtered.filter(emp => emp.department === criteria.department);
  }
  
  if (criteria.status) {
    filtered = filtered.filter(emp => emp.employmentStatus === criteria.status);
  }
  
  if (criteria.searchText) {
    const searchLower = criteria.searchText.toLowerCase();
    filtered = filtered.filter(emp => 
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.personalNumber?.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

/**
 * Get employee history (attendance, schedules, vacation) for a date range
 * @param {string} employeeId - Employee ID
 * @param {Object} dateRange - { start, end } date range
 * @returns {Object} Employee history object
 */
export function getEmployeeHistory(employeeId, dateRange) {
  const { start, end } = dateRange;
  
  const attendance = currentHrState.attendance.filter(record => {
    if (record.employeeId !== employeeId) return false;
    if (!start && !end) return true;
    const recordDate = new Date(record.date);
    if (start && recordDate < new Date(start)) return false;
    if (end && recordDate > new Date(end)) return false;
    return true;
  });
  
  const schedules = currentHrState.schedules.filter(sched => {
    if (sched.employeeId !== employeeId) return false;
    if (!start && !end) return true;
    const schedDate = new Date(sched.weekStartDate);
    if (start && schedDate < new Date(start)) return false;
    if (end && schedDate > new Date(end)) return false;
    return true;
  });
  
  const vacation = currentHrState.vacation.filter(vac => {
    if (vac.employeeId !== employeeId) return false;
    if (!start && !end) return true;
    const vacStart = new Date(vac.startDate);
    const vacEnd = new Date(vac.endDate);
    if (start && vacEnd < new Date(start)) return false;
    if (end && vacStart > new Date(end)) return false;
    return true;
  });
  
  return { attendance, schedules, vacation };
}

// ============================================================
// UI State Helper Functions
// ============================================================

/**
 * Set active tab in HR module
 * @param {string} tabName - Tab name to activate
 * @returns {Object} New state snapshot
 */
export function setActiveTab(tabName) {
  return setHrState({
    ui: {
      ...currentHrState.ui,
      activeTab: tabName
    }
  });
}

/**
 * Set editing record ID
 * @param {string|null} recordId - Record ID being edited
 * @returns {Object} New state snapshot
 */
export function setEditingRecord(recordId) {
  return setHrState({
    ui: {
      ...currentHrState.ui,
      editingRecordId: recordId
    }
  });
}

/**
 * Set modal visibility and type
 * @param {boolean} show - Whether to show modal
 * @param {string|null} modalType - Type of modal to show
 * @returns {Object} New state snapshot
 */
export function setModalState(show, modalType = null) {
  return setHrState({
    ui: {
      ...currentHrState.ui,
      showModal: show,
      modalType
    }
  });
}

/**
 * Set loading state
 * @param {boolean} isLoading - Loading state
 * @returns {Object} New state snapshot
 */
export function setLoading(isLoading) {
  return setHrState({
    ui: {
      ...currentHrState.ui,
      isLoading
    }
  });
}

/**
 * Set error state
 * @param {string|null} error - Error message or null to clear
 * @returns {Object} New state snapshot
 */
export function setError(error) {
  return setHrState({
    ui: {
      ...currentHrState.ui,
      error
    }
  });
}

/**
 * Update filter state
 * @param {Object} filterUpdates - Partial filter updates
 * @returns {Object} New state snapshot
 */
export function setFilters(filterUpdates) {
  return setHrState({
    filters: {
      ...currentHrState.filters,
      ...filterUpdates
    }
  });
}

/**
 * Reset filters to default values
 * @returns {Object} New state snapshot
 */
export function resetFilters() {
  return setHrState({
    filters: structuredClone(initialHrState.filters)
  });
}
