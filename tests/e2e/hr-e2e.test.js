/**
 * E2E Test: HR Module Complete User Journey
 * Tests the complete end-to-end user workflow for managing employees, attendance, and schedules
 */

import * as hrState from '../../js/modules/hr/hrState.js';

describe('HR E2E - Complete User Journey', () => {
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    
    // Initialize HR state
    hrState.initHrState();
    
    // Setup complete DOM structure
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="hr-container">
          <!-- Tabs -->
          <div id="hr-tabs">
            <button id="tab-employees" class="active">Employees</button>
            <button id="tab-attendance">Attendance</button>
            <button id="tab-schedules">Schedules</button>
            <button id="tab-vacation">Vacation</button>
          </div>
          
          <!-- Employee Management -->
          <div id="employees-section">
            <div id="employee-filters">
              <input id="employee-search" type="text" placeholder="Search employees..." />
              <select id="filter-department">
                <option value="">All Departments</option>
              </select>
              <select id="filter-status">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div id="employee-list"></div>
            <button id="add-employee-btn">Add Employee</button>
          </div>
          
          <!-- Attendance Management -->
          <div id="attendance-section" style="display: none;">
            <div id="attendance-filters">
              <input id="attendance-date-start" type="date" />
              <input id="attendance-date-end" type="date" />
            </div>
            <div id="attendance-list"></div>
            <button id="add-attendance-btn">Record Attendance</button>
          </div>
          
          <!-- Schedule Management -->
          <div id="schedules-section" style="display: none;">
            <div id="schedule-calendar"></div>
            <button id="add-schedule-btn">Add Schedule</button>
          </div>
          
          <!-- Vacation Management -->
          <div id="vacation-section" style="display: none;">
            <div id="vacation-list"></div>
            <button id="add-vacation-btn">Request Vacation</button>
          </div>
          
          <!-- Modal -->
          <div id="hr-modal" style="display: none;">
            <div id="modal-content"></div>
            <button id="close-modal">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('User Journey: Employee Management', () => {
    test('should add a new employee', () => {
      // User creates a new employee
      const employee = hrState.addEmployee({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        position: 'Software Engineer',
        employeeId: 'EMP-001',
        startDate: '2024-01-15',
        status: 'active'
      });
      
      expect(employee).toBeTruthy();
      expect(employee.id).toBeTruthy();
      expect(employee.firstName).toBe('John');
      expect(employee.lastName).toBe('Doe');
      expect(employee.email).toBe('john.doe@company.com');
      
      // Verify it's in the state
      const state = hrState.getHrState();
      expect(state.employees).toHaveLength(1);
      expect(state.metadata.totalEmployees).toBe(1);
      expect(state.metadata.activeEmployees).toBe(1);
    });

    test('should update an existing employee', () => {
      // Add employee
      const employee = hrState.addEmployee({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        department: 'Sales',
        position: 'Sales Representative',
        status: 'active'
      });
      
      // User updates the employee
      const updated = hrState.updateEmployee(employee.id, {
        position: 'Senior Sales Representative',
        department: 'Sales',
        salary: 75000
      });
      
      expect(updated).toBeTruthy();
      
      // Verify updates
      const retrieved = hrState.getEmployee(employee.id);
      expect(retrieved.position).toBe('Senior Sales Representative');
      expect(retrieved.salary).toBe(75000);
      expect(retrieved.department).toBe('Sales');
    });

    test('should delete an employee', () => {
      // Add employees
      const emp1 = hrState.addEmployee({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@company.com',
        status: 'active'
      });
      
      const emp2 = hrState.addEmployee({
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob@company.com',
        status: 'active'
      });
      
      const state = hrState.getHrState();
      expect(state.employees).toHaveLength(2);
      
      // User deletes second employee (soft delete)
      const deleted = hrState.deleteEmployee(emp2.id);
      expect(deleted).toBe(true);
      
      // Verify employee is archived/inactive
      const remaining = hrState.getActiveEmployees();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(emp1.id);
    });

    test('should archive an employee instead of hard delete', () => {
      const employee = hrState.addEmployee({
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@company.com',
        status: 'active'
      });
      
      // Archive employee
      const archived = hrState.archiveEmployee(employee.id);
      expect(archived).toBeTruthy();
      
      // Verify still in system but inactive
      const allEmployees = hrState.getHrState().employees;
      expect(allEmployees).toHaveLength(1);
      
      const activeEmployees = hrState.getActiveEmployees();
      expect(activeEmployees).toHaveLength(0);
    });
  });

  describe('User Journey: Search and Filter Employees', () => {
    beforeEach(() => {
      // Add test employees
      hrState.addEmployee({
        firstName: 'Alice',
        lastName: 'Engineer',
        email: 'alice.engineer@company.com',
        department: 'Engineering',
        position: 'Senior Engineer',
        status: 'active'
      });
      
      hrState.addEmployee({
        firstName: 'Bob',
        lastName: 'Sales',
        email: 'bob.sales@company.com',
        department: 'Sales',
        position: 'Sales Manager',
        status: 'active'
      });
      
      hrState.addEmployee({
        firstName: 'Carol',
        lastName: 'Engineer',
        email: 'carol.engineer@company.com',
        department: 'Engineering',
        position: 'Junior Engineer',
        status: 'active'
      });
      
      hrState.addEmployee({
        firstName: 'David',
        lastName: 'Marketing',
        email: 'david.marketing@company.com',
        department: 'Marketing',
        position: 'Marketing Specialist',
        status: 'inactive'
      });
    });

    test('should filter employees by department', () => {
      const engineering = hrState.getEmployeesByDepartment('Engineering');
      
      expect(engineering).toHaveLength(2);
      expect(engineering.every(e => e.department === 'Engineering')).toBe(true);
    });

    test('should filter employees by status', () => {
      const active = hrState.getActiveEmployees();
      
      expect(active).toHaveLength(3);
      expect(active.every(e => e.status === 'active')).toBe(true);
    });

    test('should search employees by name', () => {
      hrState.setFilter('searchTerm', 'Engineer');
      
      const results = hrState.getFilteredEmployees();
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.lastName === 'Engineer')).toBe(true);
    });

    test('should filter with multiple criteria', () => {
      hrState.setFilter('department', 'Engineering');
      hrState.setFilter('status', 'active');
      
      const filtered = hrState.getFilteredEmployees();
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.department === 'Engineering' && e.status === 'active')).toBe(true);
    });

    test('should clear all filters', () => {
      // Apply filters
      hrState.setFilter('department', 'Engineering');
      hrState.setFilter('searchTerm', 'Alice');
      
      // Clear filters
      hrState.clearFilters();
      
      // Verify all active employees returned
      const state = hrState.getHrState();
      expect(state.filters.department).toBeNull();
      expect(state.filters.searchTerm).toBe('');
    });
  });

  describe('User Journey: Attendance Management', () => {
    let testEmployee;

    beforeEach(() => {
      testEmployee = hrState.addEmployee({
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@company.com',
        status: 'active'
      });
    });

    test('should record attendance for an employee', () => {
      const attendance = hrState.addAttendance({
        employeeId: testEmployee.id,
        date: '2024-01-15',
        checkIn: '09:00',
        checkOut: '17:30',
        status: 'present',
        notes: 'On time'
      });
      
      expect(attendance).toBeTruthy();
      expect(attendance.employeeId).toBe(testEmployee.id);
      
      const state = hrState.getHrState();
      expect(state.attendance).toHaveLength(1);
    });

    test('should record absence', () => {
      const absence = hrState.addAttendance({
        employeeId: testEmployee.id,
        date: '2024-01-16',
        status: 'absent',
        reason: 'Sick leave',
        approved: true
      });
      
      expect(absence).toBeTruthy();
      expect(absence.status).toBe('absent');
      
      const employeeAttendance = hrState.getAttendanceByEmployee(testEmployee.id);
      expect(employeeAttendance).toHaveLength(1);
    });

    test('should update attendance record', () => {
      const attendance = hrState.addAttendance({
        employeeId: testEmployee.id,
        date: '2024-01-15',
        checkIn: '09:00',
        status: 'present'
      });
      
      // Update check-out time
      const updated = hrState.updateAttendance(attendance.id, {
        checkOut: '17:30',
        notes: 'Updated check-out time'
      });
      
      expect(updated).toBeTruthy();
      expect(updated.checkOut).toBe('17:30');
    });

    test('should get attendance for date range', () => {
      // Add multiple attendance records
      hrState.addAttendance({
        employeeId: testEmployee.id,
        date: '2024-01-15',
        status: 'present'
      });
      
      hrState.addAttendance({
        employeeId: testEmployee.id,
        date: '2024-01-16',
        status: 'present'
      });
      
      hrState.addAttendance({
        employeeId: testEmployee.id,
        date: '2024-01-20',
        status: 'absent'
      });
      
      const rangeAttendance = hrState.getAttendanceByDateRange('2024-01-15', '2024-01-16');
      expect(rangeAttendance).toHaveLength(2);
    });
  });

  describe('User Journey: Schedule Management', () => {
    let testEmployee;

    beforeEach(() => {
      testEmployee = hrState.addEmployee({
        firstName: 'Schedule',
        lastName: 'Test',
        email: 'schedule@company.com',
        status: 'active'
      });
    });

    test('should create a work schedule', () => {
      const schedule = hrState.addSchedule({
        employeeId: testEmployee.id,
        date: '2024-01-22',
        shift: 'morning',
        startTime: '08:00',
        endTime: '16:00',
        location: 'Office'
      });
      
      expect(schedule).toBeTruthy();
      expect(schedule.employeeId).toBe(testEmployee.id);
      
      const state = hrState.getHrState();
      expect(state.schedules).toHaveLength(1);
    });

    test('should update a schedule', () => {
      const schedule = hrState.addSchedule({
        employeeId: testEmployee.id,
        date: '2024-01-22',
        shift: 'morning',
        startTime: '08:00'
      });
      
      // Change shift time
      const updated = hrState.updateSchedule(schedule.id, {
        startTime: '09:00',
        endTime: '17:00'
      });
      
      expect(updated).toBeTruthy();
      expect(updated.startTime).toBe('09:00');
    });

    test('should get schedules for an employee', () => {
      hrState.addSchedule({
        employeeId: testEmployee.id,
        date: '2024-01-22',
        shift: 'morning'
      });
      
      hrState.addSchedule({
        employeeId: testEmployee.id,
        date: '2024-01-23',
        shift: 'afternoon'
      });
      
      const employeeSchedules = hrState.getSchedulesByEmployee(testEmployee.id);
      expect(employeeSchedules).toHaveLength(2);
    });

    test('should delete a schedule', () => {
      const schedule = hrState.addSchedule({
        employeeId: testEmployee.id,
        date: '2024-01-22',
        shift: 'morning'
      });
      
      const deleted = hrState.deleteSchedule(schedule.id);
      expect(deleted).toBe(true);
      
      const state = hrState.getHrState();
      expect(state.schedules).toHaveLength(0);
    });
  });

  describe('User Journey: Vacation Management', () => {
    let testEmployee;

    beforeEach(() => {
      testEmployee = hrState.addEmployee({
        firstName: 'Vacation',
        lastName: 'Test',
        email: 'vacation@company.com',
        status: 'active'
      });
    });

    test('should request vacation', () => {
      const vacation = hrState.addVacation({
        employeeId: testEmployee.id,
        startDate: '2024-07-01',
        endDate: '2024-07-14',
        type: 'annual',
        status: 'pending',
        notes: 'Summer vacation'
      });
      
      expect(vacation).toBeTruthy();
      expect(vacation.status).toBe('pending');
      
      const state = hrState.getHrState();
      expect(state.vacation).toHaveLength(1);
      expect(state.metadata.pendingApprovals).toBeGreaterThan(0);
    });

    test('should approve vacation request', () => {
      const vacation = hrState.addVacation({
        employeeId: testEmployee.id,
        startDate: '2024-07-01',
        endDate: '2024-07-14',
        status: 'pending'
      });
      
      const approved = hrState.approveVacation(vacation.id);
      
      expect(approved).toBeTruthy();
      expect(approved.status).toBe('approved');
    });

    test('should reject vacation request', () => {
      const vacation = hrState.addVacation({
        employeeId: testEmployee.id,
        startDate: '2024-07-01',
        endDate: '2024-07-14',
        status: 'pending'
      });
      
      const rejected = hrState.rejectVacation(vacation.id, 'Insufficient leave balance');
      
      expect(rejected).toBeTruthy();
      expect(rejected.status).toBe('rejected');
    });

    test('should get vacation by employee', () => {
      hrState.addVacation({
        employeeId: testEmployee.id,
        startDate: '2024-07-01',
        endDate: '2024-07-14',
        status: 'approved'
      });
      
      hrState.addVacation({
        employeeId: testEmployee.id,
        startDate: '2024-12-20',
        endDate: '2024-12-31',
        status: 'pending'
      });
      
      const employeeVacation = hrState.getVacationByEmployee(testEmployee.id);
      expect(employeeVacation).toHaveLength(2);
    });
  });

  describe('User Journey: Data Persistence', () => {
    test('should persist HR state to localStorage', () => {
      // Create employee
      hrState.addEmployee({
        firstName: 'Persist',
        lastName: 'Test',
        email: 'persist@company.com',
        status: 'active'
      });
      
      // Force save
      hrState.saveHrState();
      
      // Verify localStorage has data
      const saved = localStorage.getItem('hrModuleState_v1');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved);
      expect(parsed.employees).toHaveLength(1);
    });

    test('should restore HR state after reload', () => {
      // Create and save employee
      hrState.addEmployee({
        firstName: 'Reload',
        lastName: 'Test',
        email: 'reload@company.com',
        status: 'active'
      });
      
      hrState.saveHrState();
      
      // Simulate reload by reinitializing
      hrState.initHrState();
      
      // Verify data restored
      const state = hrState.getHrState();
      expect(state.employees).toHaveLength(1);
      expect(state.employees[0].firstName).toBe('Reload');
    });

    test('should clear all HR data when requested', () => {
      // Create data
      hrState.addEmployee({
        firstName: 'Clear',
        lastName: 'Test',
        email: 'clear@company.com',
        status: 'active'
      });
      
      hrState.saveHrState();
      
      // Reset all
      hrState.resetHrState();
      
      // Verify all cleared
      const state = hrState.getHrState();
      expect(state.employees).toHaveLength(0);
      
      // Verify localStorage cleared
      const saved = localStorage.getItem('hrModuleState_v1');
      expect(saved).toBeNull();
    });
  });

  describe('User Journey: Undo/Redo Support', () => {
    test('should support undo operation', () => {
      const employee = hrState.addEmployee({
        firstName: 'Undo',
        lastName: 'Test',
        email: 'undo@company.com',
        status: 'active'
      });
      
      // Make a change
      hrState.updateEmployee(employee.id, { firstName: 'Changed' });
      
      // Undo the change
      hrState.undo();
      
      const current = hrState.getEmployee(employee.id);
      expect(current.firstName).toBe('Undo');
    });

    test('should support redo operation', () => {
      const employee = hrState.addEmployee({
        firstName: 'Redo',
        lastName: 'Test',
        email: 'redo@company.com',
        status: 'active'
      });
      
      // Make a change
      hrState.updateEmployee(employee.id, { firstName: 'Changed' });
      
      // Undo
      hrState.undo();
      
      // Redo
      hrState.redo();
      
      const current = hrState.getEmployee(employee.id);
      expect(current.firstName).toBe('Changed');
    });
  });

  describe('User Journey: Performance with Large Dataset', () => {
    test('should handle 100+ employees efficiently', () => {
      const startTime = performance.now();
      
      // Add 100 employees
      for (let i = 1; i <= 100; i++) {
        hrState.addEmployee({
          firstName: `Employee${i}`,
          lastName: `Test${i}`,
          email: `employee${i}@company.com`,
          department: i % 5 === 0 ? 'Engineering' : 'Sales',
          status: 'active'
        });
      }
      
      const addTime = performance.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Test retrieval performance
      const retrieveStart = performance.now();
      const all = hrState.getHrState().employees;
      const retrieveTime = performance.now() - retrieveStart;
      
      expect(all).toHaveLength(100);
      expect(retrieveTime).toBeLessThan(100); // Should be very fast
    });

    test('should filter large dataset efficiently', () => {
      // Add many employees
      for (let i = 1; i <= 100; i++) {
        hrState.addEmployee({
          firstName: `Employee${i}`,
          lastName: `Test${i}`,
          email: `employee${i}@company.com`,
          department: i % 2 === 0 ? 'Engineering' : 'Sales',
          status: 'active'
        });
      }
      
      const startTime = performance.now();
      
      const engineering = hrState.getEmployeesByDepartment('Engineering');
      
      const filterTime = performance.now() - startTime;
      
      expect(engineering).toHaveLength(50);
      expect(filterTime).toBeLessThan(100);
    });
  });
});
