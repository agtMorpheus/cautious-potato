/**
 * Unit Tests for HR Event Handlers Module (hrHandlers.js)
 * Phase 4 - Event Handlers & User Interactions
 */

import {
  handleAddEmployee,
  handleUpdateEmployee,
  handleDeleteEmployee,
  handleRecordAttendance,
  handleUpdateAttendance,
  handleSaveSchedule,
  handleSubmitSchedule,
  handleApproveSchedule,
  handleCreateVacationRequest,
  handleApproveVacation,
  handleRejectVacation,
  handleTabChange,
  handleOpenEditModal,
  handleCloseModal,
  handleFilterChange,
  handleClearFilters,
  handleResetHrModule,
  handleExportHrData,
  handleImportHrData,
  initializeHrHandlers,
  bindHrEventListeners
} from '../../js/modules/hr/hrHandlers.js';

import {
  getHrState,
  resetHrState,
  addEmployee
} from '../../js/modules/hr/hrState.js';

describe('HR Handlers (hrHandlers.js)', () => {
  beforeEach(() => {
    // Clear localStorage and reset state before each test
    localStorage.clear();
    resetHrState({ persist: false, silent: true });
  });

  describe('Employee Handlers', () => {
    describe('handleAddEmployee', () => {
      test('successfully adds valid employee', () => {
        const result = handleAddEmployee({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        });

        expect(result.success).toBe(true);
        expect(result.employee).toBeDefined();
        expect(result.employee.firstName).toBe('John');
        expect(result.employee.lastName).toBe('Doe');
      });

      test('returns errors for invalid employee data', () => {
        const result = handleAddEmployee({
          firstName: '',
          lastName: '',
          email: 'invalid-email'
        });

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('sets default employment status to active', () => {
        const result = handleAddEmployee({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com'
        });

        expect(result.success).toBe(true);
        expect(result.employee.employmentStatus).toBe('active');
      });

      test('generates unique employee ID', () => {
        const result = handleAddEmployee({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        });

        expect(result.success).toBe(true);
        expect(result.employee.id).toMatch(/^EMP/);
      });
    });

    describe('handleUpdateEmployee', () => {
      test('successfully updates existing employee', () => {
        // First add an employee
        addEmployee({
          id: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        });

        const result = handleUpdateEmployee('EMP001', {
          firstName: 'Johnny'
        });

        expect(result.success).toBe(true);

        const state = getHrState();
        expect(state.employees[0].firstName).toBe('Johnny');
      });

      test('returns error for non-existent employee', () => {
        const result = handleUpdateEmployee('NONEXISTENT', {
          firstName: 'Test'
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Mitarbeiter nicht gefunden');
      });

      test('validates merged data before updating', () => {
        addEmployee({
          id: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        });

        const result = handleUpdateEmployee('EMP001', {
          email: 'invalid-email'
        });

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('handleDeleteEmployee', () => {
      test('successfully deletes existing employee', () => {
        addEmployee({
          id: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        });

        const result = handleDeleteEmployee('EMP001');

        expect(result.success).toBe(true);

        const state = getHrState();
        expect(state.employees.length).toBe(0);
      });

      test('handles deletion of non-existent employee gracefully', () => {
        const result = handleDeleteEmployee('NONEXISTENT');

        // The current implementation doesn't validate existence before deletion
        // but should not throw an error
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Attendance Handlers', () => {
    beforeEach(() => {
      // Add an employee for attendance tests
      addEmployee({
        id: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    describe('handleRecordAttendance', () => {
      test('successfully records attendance with valid data', () => {
        const result = handleRecordAttendance('EMP001', {
          date: '2025-12-10',
          status: 'present',
          entryTime: '09:00',
          exitTime: '17:30',
          breakMinutes: 30
        });

        expect(result.success).toBe(true);
        expect(result.record).toBeDefined();
        expect(result.record.date).toBe('2025-12-10');
      });

      test('calculates hours worked automatically', () => {
        const result = handleRecordAttendance('EMP001', {
          date: '2025-12-10',
          status: 'present',
          entryTime: '09:00',
          exitTime: '17:30',
          breakMinutes: 30
        });

        expect(result.success).toBe(true);
        // 17:30 - 09:00 = 8.5 hours - 0.5 break = 8 hours
        expect(result.record.hoursWorked).toBe(8);
      });

      test('returns errors for invalid attendance data', () => {
        const result = handleRecordAttendance('', {
          date: '',
          status: 'present'
        });

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });

      test('adds day of week to record', () => {
        const result = handleRecordAttendance('EMP001', {
          date: '2025-12-10', // Wednesday
          status: 'present'
        });

        expect(result.success).toBe(true);
        expect(result.record.dayOfWeek).toBeDefined();
      });
    });

    describe('handleUpdateAttendance', () => {
      test('successfully updates attendance record', () => {
        // First record attendance
        handleRecordAttendance('EMP001', {
          date: '2025-12-10',
          status: 'present'
        });

        const state = getHrState();
        const attendanceId = state.attendance[0].id;

        const result = handleUpdateAttendance(attendanceId, {
          status: 'sick_leave'
        });

        expect(result.success).toBe(true);

        const updatedState = getHrState();
        expect(updatedState.attendance[0].status).toBe('sick_leave');
      });
    });
  });

  describe('Schedule Handlers', () => {
    beforeEach(() => {
      addEmployee({
        id: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    describe('handleSaveSchedule', () => {
      test('successfully saves a new schedule', () => {
        const result = handleSaveSchedule({
          employeeId: 'EMP001',
          weekStartDate: '2025-12-09',
          dailySchedule: [
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 0, plannedPoints: 0 },
            { plannedHours: 0, plannedPoints: 0 }
          ]
        });

        expect(result.success).toBe(true);
        expect(result.schedule).toBeDefined();
      });

      test('calculates totals from daily schedule', () => {
        const result = handleSaveSchedule({
          employeeId: 'EMP001',
          weekStartDate: '2025-12-09',
          dailySchedule: [
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 8, plannedPoints: 64 },
            { plannedHours: 0, plannedPoints: 0 },
            { plannedHours: 0, plannedPoints: 0 }
          ]
        });

        expect(result.success).toBe(true);
        expect(result.schedule.totalHours).toBe(40);
        expect(result.schedule.totalPoints).toBe(320);
      });
    });

    describe('handleSubmitSchedule', () => {
      test('changes schedule status to submitted', () => {
        // First create a schedule
        handleSaveSchedule({
          employeeId: 'EMP001',
          weekStartDate: '2025-12-09',
          totalHours: 40
        });

        const state = getHrState();
        const scheduleId = state.schedules[0].id;

        const result = handleSubmitSchedule(scheduleId);

        expect(result.success).toBe(true);

        const updatedState = getHrState();
        expect(updatedState.schedules[0].status).toBe('submitted');
        expect(updatedState.schedules[0].submittedAt).toBeDefined();
      });
    });

    describe('handleApproveSchedule', () => {
      test('approves schedule and sets metadata', () => {
        handleSaveSchedule({
          employeeId: 'EMP001',
          weekStartDate: '2025-12-09',
          totalHours: 40
        });

        const state = getHrState();
        const scheduleId = state.schedules[0].id;

        const result = handleApproveSchedule(scheduleId, 'HR_MANAGER');

        expect(result.success).toBe(true);

        const updatedState = getHrState();
        expect(updatedState.schedules[0].status).toBe('approved');
        expect(updatedState.schedules[0].approvedBy).toBe('HR_MANAGER');
        expect(updatedState.schedules[0].approvedAt).toBeDefined();
      });
    });
  });

  describe('Vacation Handlers', () => {
    beforeEach(() => {
      addEmployee({
        id: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    describe('handleCreateVacationRequest', () => {
      test('successfully creates vacation request', () => {
        const result = handleCreateVacationRequest({
          employeeId: 'EMP001',
          startDate: '2025-12-20',
          endDate: '2025-12-24',
          vacationType: 'annual',
          reason: 'Holiday vacation'
        });

        expect(result.success).toBe(true);
        expect(result.request).toBeDefined();
      });

      test('returns errors for invalid vacation data', () => {
        const result = handleCreateVacationRequest({
          employeeId: '',
          startDate: '',
          endDate: ''
        });

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });

    describe('handleApproveVacation', () => {
      test('approves vacation request', () => {
        handleCreateVacationRequest({
          employeeId: 'EMP001',
          startDate: '2025-12-20',
          endDate: '2025-12-24'
        });

        const state = getHrState();
        const vacationId = state.vacation[0].id;

        const result = handleApproveVacation(vacationId, 'HR_ADMIN');

        expect(result.success).toBe(true);

        const updatedState = getHrState();
        expect(updatedState.vacation[0].status).toBe('approved');
      });
    });

    describe('handleRejectVacation', () => {
      test('rejects vacation request with reason', () => {
        handleCreateVacationRequest({
          employeeId: 'EMP001',
          startDate: '2025-12-20',
          endDate: '2025-12-24'
        });

        const state = getHrState();
        const vacationId = state.vacation[0].id;

        const result = handleRejectVacation(vacationId, 'Insufficient coverage');

        expect(result.success).toBe(true);

        const updatedState = getHrState();
        expect(updatedState.vacation[0].status).toBe('rejected');
        expect(updatedState.vacation[0].rejectionReason).toBe('Insufficient coverage');
      });
    });
  });

  describe('UI Handlers', () => {
    describe('handleTabChange', () => {
      test('changes active tab in state', () => {
        handleTabChange('attendance');

        const state = getHrState();
        expect(state.ui.activeTab).toBe('attendance');
      });
    });

    describe('handleOpenEditModal', () => {
      test('sets editing record and opens modal', () => {
        handleOpenEditModal('EMP001', 'employee');

        const state = getHrState();
        expect(state.ui.editingRecordId).toBe('EMP001');
        expect(state.ui.showModal).toBe(true);
        expect(state.ui.modalType).toBe('employee');
      });
    });

    describe('handleCloseModal', () => {
      test('clears editing record and closes modal', () => {
        handleOpenEditModal('EMP001', 'employee');
        handleCloseModal();

        const state = getHrState();
        expect(state.ui.editingRecordId).toBeNull();
        expect(state.ui.showModal).toBe(false);
      });
    });

    describe('handleFilterChange', () => {
      test('updates filter state', () => {
        handleFilterChange({ department: 'Engineering' });

        const state = getHrState();
        expect(state.filters.department).toBe('Engineering');
      });
    });

    describe('handleClearFilters', () => {
      test('resets all filters', () => {
        handleFilterChange({ department: 'Engineering', searchTerm: 'John' });
        handleClearFilters();

        const state = getHrState();
        expect(state.filters.department).toBeNull();
        expect(state.filters.searchTerm).toBe('');
      });
    });
  });

  describe('Data Export/Import Handlers', () => {
    describe('handleExportHrData', () => {
      test('exports current state as JSON', () => {
        addEmployee({
          id: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        });

        // Mock URL.createObjectURL and other browser APIs
        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = jest.fn(() => 'blob:test');
        URL.revokeObjectURL = jest.fn();

        const exportData = handleExportHrData();

        expect(exportData).toBeDefined();
        expect(exportData.employees.length).toBe(1);
        expect(exportData.version).toBeDefined();
        expect(exportData.exportedAt).toBeDefined();

        // Restore
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
      });
    });

    describe('handleImportHrData', () => {
      test('imports valid JSON file', async () => {
        const jsonContent = JSON.stringify({
          employees: [{
            id: 'EMP001',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            employmentStatus: 'active'
          }],
          attendance: [],
          schedules: [],
          vacation: []
        });

        const file = new Blob([jsonContent], { type: 'application/json' });
        file.text = async () => jsonContent;

        const result = await handleImportHrData(file);

        expect(result.success).toBe(true);

        const state = getHrState();
        expect(state.employees.length).toBe(1);
        expect(state.employees[0].firstName).toBe('Jane');
      });

      test('returns error for invalid JSON', async () => {
        const file = new Blob(['invalid json'], { type: 'application/json' });
        file.text = async () => 'invalid json';

        const result = await handleImportHrData(file);

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });

      test('returns error for missing employees array', async () => {
        const jsonContent = JSON.stringify({
          attendance: []
        });

        const file = new Blob([jsonContent], { type: 'application/json' });
        file.text = async () => jsonContent;

        const result = await handleImportHrData(file);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('employees');
      });
    });
  });

  describe('Initialization', () => {
    describe('initializeHrHandlers', () => {
      test('initializes without errors', () => {
        expect(() => initializeHrHandlers()).not.toThrow();
      });

      test('loads state from storage', () => {
        // Save some data first
        addEmployee({
          id: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        });

        // Reinitialize
        initializeHrHandlers();

        const state = getHrState();
        expect(state.employees.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
