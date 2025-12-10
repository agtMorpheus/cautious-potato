/**
 * Unit Tests for HR State Management Module (hrState.js)
 * Phase 2 - State Management & Data Layer
 */

import {
  getHrState,
  setHrState,
  resetHrState,
  subscribeHr,
  unsubscribeHr,
  loadHrStateFromStorage,
  clearHrPersistedState,
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
  filterEmployees,
  getEmployeeHistory,
  getDepartments,
  addDepartment,
  removeDepartment,
  setSuccess,
  clearMessages,
  setModalData,
  updatePendingApprovals,
  setDataIntegrity,
  addMigrationLog,
  createBackup,
  restoreFromBackup,
  exportState,
  importState,
  saveToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  triggerHrEvent
} from '../../js/modules/hr/hrState.js';

describe('HR State Management (hrState.js)', () => {
  beforeEach(() => {
    // Clear localStorage and reset state before each test
    localStorage.clear();
    resetHrState({ persist: false, silent: true });
  });

  describe('getHrState()', () => {
    test('returns initial state with expected structure', () => {
      const state = getHrState();
      expect(state).toHaveProperty('employees');
      expect(state).toHaveProperty('attendance');
      expect(state).toHaveProperty('schedules');
      expect(state).toHaveProperty('vacation');
      expect(state).toHaveProperty('departments');
      expect(state).toHaveProperty('filters');
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('metadata');
      expect(state).toHaveProperty('history');
    });

    test('returns empty arrays for data collections initially', () => {
      const state = getHrState();
      expect(state.employees).toEqual([]);
      expect(state.attendance).toEqual([]);
      expect(state.schedules).toEqual([]);
      expect(state.vacation).toEqual([]);
    });

    test('returns default departments', () => {
      const state = getHrState();
      expect(state.departments).toContain('Engineering');
      expect(state.departments).toContain('Human Resources');
      expect(state.departments.length).toBe(8);
    });

    test('returns a defensive copy (mutations do not affect internal state)', () => {
      const state1 = getHrState();
      state1.employees.push({ id: 'TEST' });
      
      const state2 = getHrState();
      expect(state2.employees).toEqual([]);
    });
  });

  describe('setHrState()', () => {
    test('updates state with new values', () => {
      setHrState({ 
        employees: [{ id: 'EMP001', firstName: 'John', lastName: 'Doe' }]
      }, { silent: true });
      
      const state = getHrState();
      expect(state.employees.length).toBe(1);
      expect(state.employees[0].firstName).toBe('John');
    });

    test('triggers listeners when not silent', () => {
      const listener = jest.fn();
      subscribeHr(listener);
      
      setHrState({ ui: { ...getHrState().ui, activeTab: 'attendance' } });
      
      expect(listener).toHaveBeenCalled();
    });

    test('does not trigger listeners when silent', () => {
      const listener = jest.fn();
      subscribeHr(listener);
      
      setHrState({ ui: { ...getHrState().ui, activeTab: 'attendance' } }, { silent: true });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('updates metadata.lastSync timestamp', () => {
      const beforeTime = new Date().toISOString();
      setHrState({ employees: [] }, { silent: true });
      const afterTime = new Date().toISOString();
      
      const state = getHrState();
      expect(state.metadata.lastSync).toBeDefined();
      expect(state.metadata.lastSync >= beforeTime).toBe(true);
      expect(state.metadata.lastSync <= afterTime).toBe(true);
    });
  });

  describe('resetHrState()', () => {
    test('clears all state back to initial values', () => {
      addEmployee({ firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      resetHrState({ persist: false, silent: true });
      
      const state = getHrState();
      expect(state.employees).toEqual([]);
    });

    test('triggers listeners when not silent', () => {
      const listener = jest.fn();
      subscribeHr(listener);
      
      resetHrState({ persist: false, silent: false });
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Employee Management', () => {
    test('addEmployee creates new employee with generated ID', () => {
      addEmployee({ 
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@test.com',
        employmentStatus: 'active'
      });
      
      const state = getHrState();
      expect(state.employees.length).toBe(1);
      expect(state.employees[0].id).toMatch(/^EMP/);
      expect(state.employees[0].createdAt).toBeDefined();
    });

    test('addEmployee updates metadata counters', () => {
      addEmployee({ 
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@test.com',
        employmentStatus: 'active'
      });
      
      const state = getHrState();
      expect(state.metadata.totalEmployees).toBe(1);
      expect(state.metadata.activeEmployees).toBe(1);
    });

    test('updateEmployee modifies existing employee', () => {
      addEmployee({ 
        id: 'EMP001',
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@test.com'
      });
      
      updateEmployee('EMP001', { firstName: 'Jane' });
      
      const state = getHrState();
      expect(state.employees[0].firstName).toBe('Jane');
      expect(state.employees[0].updatedAt).toBeDefined();
    });

    test('deleteEmployee removes employee from state', () => {
      addEmployee({ 
        id: 'EMP001',
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@test.com'
      });
      
      deleteEmployee('EMP001');
      
      const state = getHrState();
      expect(state.employees.length).toBe(0);
    });

    test('filterEmployees filters by department', () => {
      addEmployee({ 
        id: 'EMP001',
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@test.com',
        department: 'Engineering'
      });
      addEmployee({ 
        id: 'EMP002',
        firstName: 'Jane', 
        lastName: 'Smith', 
        email: 'jane@test.com',
        department: 'Sales'
      });
      
      const filtered = filterEmployees({ department: 'Engineering' });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('EMP001');
    });

    test('filterEmployees filters by search text', () => {
      addEmployee({ 
        id: 'EMP001',
        firstName: 'John', 
        lastName: 'Doe', 
        email: 'john@test.com'
      });
      addEmployee({ 
        id: 'EMP002',
        firstName: 'Jane', 
        lastName: 'Smith', 
        email: 'jane@test.com'
      });
      
      const filtered = filterEmployees({ searchText: 'Jane' });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('EMP002');
    });
  });

  describe('Attendance Management', () => {
    test('recordAttendance creates new attendance record', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      recordAttendance('EMP001', {
        date: '2025-12-10',
        status: 'present',
        entryTime: '09:00',
        exitTime: '17:00'
      });
      
      const state = getHrState();
      expect(state.attendance.length).toBe(1);
      expect(state.attendance[0].employeeId).toBe('EMP001');
      expect(state.attendance[0].id).toMatch(/^ATT/);
    });

    test('updateAttendance modifies existing record', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      recordAttendance('EMP001', {
        id: 'ATT001',
        date: '2025-12-10',
        status: 'present'
      });
      
      updateAttendance('ATT001', { status: 'sick_leave' });
      
      const state = getHrState();
      expect(state.attendance[0].status).toBe('sick_leave');
    });
  });

  describe('Schedule Management', () => {
    test('updateSchedule creates new schedule when no ID provided', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      updateSchedule(null, {
        employeeId: 'EMP001',
        weekStartDate: '2025-12-09',
        totalHours: 40
      });
      
      const state = getHrState();
      expect(state.schedules.length).toBe(1);
      expect(state.schedules[0].id).toMatch(/^SCHED/);
    });

    test('updateSchedule modifies existing schedule', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      // Create the schedule first
      updateSchedule(null, {
        employeeId: 'EMP001',
        weekStartDate: '2025-12-09',
        totalHours: 40
      });
      
      // Get the created schedule ID
      const state1 = getHrState();
      const scheduleId = state1.schedules[0].id;
      
      // Now update using the actual ID
      updateSchedule(scheduleId, { status: 'approved' });
      
      const state = getHrState();
      expect(state.schedules[0].status).toBe('approved');
    });
  });

  describe('Vacation Management', () => {
    test('createVacationRequest creates pending request', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      createVacationRequest({
        employeeId: 'EMP001',
        startDate: '2025-12-20',
        endDate: '2025-12-24'
      });
      
      const state = getHrState();
      expect(state.vacation.length).toBe(1);
      expect(state.vacation[0].status).toBe('pending');
      expect(state.vacation[0].id).toMatch(/^VAC/);
    });

    test('createVacationRequest increments pendingApprovals', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      createVacationRequest({
        employeeId: 'EMP001',
        startDate: '2025-12-20',
        endDate: '2025-12-24'
      });
      
      const state = getHrState();
      expect(state.metadata.pendingApprovals).toBe(1);
    });

    test('approveVacationRequest changes status and decrements pendingApprovals', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      createVacationRequest({
        id: 'VAC001',
        employeeId: 'EMP001',
        startDate: '2025-12-20',
        endDate: '2025-12-24'
      });
      
      approveVacationRequest('VAC001', 'HR_ADMIN');
      
      const state = getHrState();
      expect(state.vacation[0].status).toBe('approved');
      expect(state.vacation[0].approvedBy).toBe('HR_ADMIN');
      expect(state.metadata.pendingApprovals).toBe(0);
    });

    test('rejectVacationRequest changes status and decrements pendingApprovals', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      createVacationRequest({
        id: 'VAC001',
        employeeId: 'EMP001',
        startDate: '2025-12-20',
        endDate: '2025-12-24'
      });
      
      rejectVacationRequest('VAC001', 'HR_ADMIN', 'Insufficient coverage');
      
      const state = getHrState();
      expect(state.vacation[0].status).toBe('rejected');
      expect(state.vacation[0].rejectionReason).toBe('Insufficient coverage');
      expect(state.metadata.pendingApprovals).toBe(0);
    });
  });

  describe('Department Management', () => {
    test('getDepartments returns all departments', () => {
      const departments = getDepartments();
      expect(departments.length).toBe(8);
      expect(departments).toContain('Engineering');
    });

    test('addDepartment adds new department', () => {
      addDepartment('Research');
      
      const departments = getDepartments();
      expect(departments).toContain('Research');
    });

    test('addDepartment does not add duplicate', () => {
      addDepartment('Engineering');
      
      const departments = getDepartments();
      expect(departments.filter(d => d === 'Engineering').length).toBe(1);
    });

    test('removeDepartment removes department', () => {
      removeDepartment('Engineering');
      
      const departments = getDepartments();
      expect(departments).not.toContain('Engineering');
    });
  });

  describe('UI State Management', () => {
    test('setActiveTab changes active tab', () => {
      setActiveTab('attendance');
      
      const state = getHrState();
      expect(state.ui.activeTab).toBe('attendance');
    });

    test('setModalState opens and closes modal', () => {
      setModalState(true, 'employee');
      
      let state = getHrState();
      expect(state.ui.showModal).toBe(true);
      expect(state.ui.modalType).toBe('employee');
      
      setModalState(false, null);
      
      state = getHrState();
      expect(state.ui.showModal).toBe(false);
    });

    test('setError sets error message', () => {
      setError('Test error');
      
      const state = getHrState();
      expect(state.ui.error).toBe('Test error');
    });

    test('setSuccess sets success message and clears error', () => {
      setError('Test error');
      setSuccess('Test success');
      
      const state = getHrState();
      expect(state.ui.success).toBe('Test success');
      expect(state.ui.error).toBeNull();
    });

    test('clearMessages clears both error and success', () => {
      setError('Test error');
      setSuccess('Test success');
      clearMessages();
      
      const state = getHrState();
      expect(state.ui.error).toBeNull();
      expect(state.ui.success).toBeNull();
    });

    test('setModalData sets modal data', () => {
      setModalData({ id: 'EMP001', name: 'John' });
      
      const state = getHrState();
      expect(state.ui.modalData.id).toBe('EMP001');
    });
  });

  describe('Filter Management', () => {
    test('setFilters updates filter state', () => {
      setFilters({ department: 'Engineering', searchTerm: 'John' });
      
      const state = getHrState();
      expect(state.filters.department).toBe('Engineering');
      expect(state.filters.searchTerm).toBe('John');
    });

    test('resetFilters clears all filters', () => {
      setFilters({ department: 'Engineering', searchTerm: 'John' });
      resetFilters();
      
      const state = getHrState();
      expect(state.filters.department).toBeNull();
      expect(state.filters.searchTerm).toBe('');
    });
  });

  describe('Metadata Management', () => {
    test('updatePendingApprovals increments count', () => {
      updatePendingApprovals(1);
      
      const state = getHrState();
      expect(state.metadata.pendingApprovals).toBe(1);
    });

    test('updatePendingApprovals does not go negative', () => {
      updatePendingApprovals(-5);
      
      const state = getHrState();
      expect(state.metadata.pendingApprovals).toBe(0);
    });

    test('setDataIntegrity updates flag', () => {
      setDataIntegrity(false);
      
      const state = getHrState();
      expect(state.metadata.dataIntegrity).toBe(false);
    });

    test('addMigrationLog adds log entry', () => {
      addMigrationLog({ version: '1.0.0', action: 'Initial migration' });
      
      const state = getHrState();
      expect(state.metadata.migrationLog.length).toBe(1);
      expect(state.metadata.migrationLog[0].action).toBe('Initial migration');
      expect(state.metadata.migrationLog[0].timestamp).toBeDefined();
    });
  });

  describe('Backup and Restore', () => {
    test('createBackup creates backup with timestamp', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      const backup = createBackup();
      
      expect(backup.timestamp).toBeDefined();
      expect(backup.employees.length).toBe(1);
    });

    test('createBackup updates lastBackup in metadata', () => {
      createBackup();
      
      const state = getHrState();
      expect(state.metadata.lastBackup).toBeDefined();
    });

    test('restoreFromBackup restores state from backup', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      createBackup();
      
      // Add more employees after backup
      addEmployee({ id: 'EMP002', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' });
      
      restoreFromBackup();
      
      const state = getHrState();
      expect(state.employees.length).toBe(1);
      expect(state.employees[0].id).toBe('EMP001');
    });
  });

  describe('Export and Import', () => {
    test('exportState returns valid JSON', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      const exported = exportState();
      const parsed = JSON.parse(exported);
      
      expect(parsed.employees.length).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
    });

    test('importState restores state from JSON', () => {
      const jsonData = JSON.stringify({
        employees: [{ id: 'EMP001', firstName: 'John', lastName: 'Doe', employmentStatus: 'active' }],
        attendance: [],
        schedules: [],
        vacation: []
      });
      
      const result = importState(jsonData);
      
      expect(result.success).toBe(true);
      const state = getHrState();
      expect(state.employees.length).toBe(1);
    });

    test('importState returns error for invalid JSON', () => {
      const result = importState('invalid json');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('importState returns error for missing employees array', () => {
      const jsonData = JSON.stringify({ attendance: [] });
      
      const result = importState(jsonData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('employees');
    });
  });

  describe('History (Undo/Redo)', () => {
    test('saveToHistory adds state snapshot to stack', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      saveToHistory('Added employee');
      
      const state = getHrState();
      expect(state.history.stack.length).toBe(1);
      expect(state.history.stack[0].action).toBe('Added employee');
    });

    test('canUndo returns false when history is empty', () => {
      expect(canUndo()).toBe(false);
    });

    test('canRedo returns false when nothing to redo', () => {
      saveToHistory('Test action');
      expect(canRedo()).toBe(false);
    });

    test('undo restores previous state', () => {
      // Save initial state
      saveToHistory('Initial');
      
      // Add employee and save
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      saveToHistory('Added employee');
      
      // Undo should restore to state before adding employee
      const undone = undo();
      
      expect(undone).toBe(true);
      const state = getHrState();
      expect(state.employees.length).toBe(0);
    });

    test('redo restores undone state', () => {
      // Save initial state
      saveToHistory('Initial');
      
      // Add employee and save
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      saveToHistory('Added employee');
      
      // Undo
      undo();
      
      // Redo
      const redone = redo();
      
      expect(redone).toBe(true);
      const state = getHrState();
      expect(state.employees.length).toBe(1);
    });

    test('clearHistory empties the history stack', () => {
      saveToHistory('Test');
      clearHistory();
      
      const state = getHrState();
      expect(state.history.stack.length).toBe(0);
    });
  });

  describe('localStorage Integration', () => {
    test('loadHrStateFromStorage returns initial state when localStorage is empty', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const loaded = loadHrStateFromStorage();
      
      expect(loaded.employees).toEqual([]);
    });

    test('loadHrStateFromStorage handles corrupted JSON gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid json {');
      
      const loaded = loadHrStateFromStorage();
      
      // Should fall back to initial state
      expect(loaded.employees).toEqual([]);
    });

    test('clearHrPersistedState removes data from localStorage', () => {
      clearHrPersistedState();
      
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {
    test('subscribeHr registers listener and returns unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeHr(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      setHrState({ ui: { ...getHrState().ui, activeTab: 'test' } });
      
      expect(listener).toHaveBeenCalled();
    });

    test('unsubscribeHr removes listener', () => {
      const listener = jest.fn();
      subscribeHr(listener);
      unsubscribeHr(listener);
      
      setHrState({ ui: { ...getHrState().ui, activeTab: 'test' } });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('subscribeHr throws error if listener is not a function', () => {
      expect(() => subscribeHr('not a function')).toThrow('HR state listener must be a function');
    });

    test('triggerHrEvent dispatches custom event', () => {
      const handler = jest.fn();
      document.addEventListener('hrStateChanged', handler);
      
      triggerHrEvent('test:event', { data: 'test' });
      
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].detail.eventType).toBe('test:event');
      
      document.removeEventListener('hrStateChanged', handler);
    });
  });

  describe('getEmployeeHistory', () => {
    test('returns filtered history for employee', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      recordAttendance('EMP001', { date: '2025-12-10', status: 'present' });
      recordAttendance('EMP001', { date: '2025-12-11', status: 'present' });
      
      createVacationRequest({
        employeeId: 'EMP001',
        startDate: '2025-12-20',
        endDate: '2025-12-24'
      });
      
      const history = getEmployeeHistory('EMP001', { start: '2025-12-01', end: '2025-12-31' });
      
      expect(history.attendance.length).toBe(2);
      expect(history.vacation.length).toBe(1);
    });

    test('returns all history when no date range specified', () => {
      addEmployee({ id: 'EMP001', firstName: 'John', lastName: 'Doe', email: 'john@test.com' });
      
      recordAttendance('EMP001', { date: '2025-12-10', status: 'present' });
      
      const history = getEmployeeHistory('EMP001', { start: null, end: null });
      
      expect(history.attendance.length).toBe(1);
    });
  });
});
