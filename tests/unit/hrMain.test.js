/**
 * HR Main Module Tests
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../js/modules/hr/hrState.js', () => ({
  getHrState: jest.fn(() => ({
    filters: {},
    attendance: [],
    vacation: [],
    schedules: []
  })),
  subscribeHr: jest.fn(),
  setActiveTab: jest.fn(),
  setModalState: jest.fn(),
  setFilters: jest.fn(),
  resetFilters: jest.fn()
}));

jest.mock('../../js/modules/hr/hrHandlers.js', () => ({
  handleAddEmployee: jest.fn(() => ({ success: true })),
  handleUpdateEmployee: jest.fn(() => ({ success: true })),
  handleDeleteEmployee: jest.fn(() => ({ success: true })),
  handleRecordAttendance: jest.fn(() => ({ success: true })),
  handleUpdateAttendance: jest.fn(() => ({ success: true })),
  handleSaveSchedule: jest.fn(() => ({ success: true })),
  handleSubmitSchedule: jest.fn(() => ({ success: true })),
  handleApproveSchedule: jest.fn(() => ({ success: true })),
  handleCreateVacationRequest: jest.fn(() => ({ success: true })),
  handleApproveVacation: jest.fn(() => ({ success: true })),
  handleRejectVacation: jest.fn(() => ({ success: true })),
  handleExportHrData: jest.fn(),
  initializeHrHandlers: jest.fn()
}));

jest.mock('../../js/modules/hr/renderers/employeeRenderer.js', () => ({
  renderEmployeeList: jest.fn(),
  renderEmployeeForm: jest.fn(),
  renderEmployeeDetail: jest.fn(),
  renderEmployeeStats: jest.fn(),
  bindEmployeeListEvents: jest.fn()
}));

jest.mock('../../js/modules/hr/renderers/attendanceRenderer.js', () => ({
  renderDailyAttendanceLog: jest.fn(),
  renderAttendanceForm: jest.fn(),
  renderAttendanceCalendar: jest.fn(),
  renderAttendanceReport: jest.fn(),
  bindAttendanceEvents: jest.fn()
}));

jest.mock('../../js/modules/hr/renderers/scheduleRenderer.js', () => ({
  renderWeeklyScheduleGrid: jest.fn(),
  renderScheduleForm: jest.fn(),
  renderPendingApprovals: jest.fn(),
  renderScheduleHistory: jest.fn(),
  bindScheduleEvents: jest.fn()
}));

jest.mock('../../js/modules/hr/renderers/vacationRenderer.js', () => ({
  renderVacationCalendar: jest.fn(),
  renderVacationForm: jest.fn(),
  renderPendingVacationApprovals: jest.fn(),
  renderVacationBalance: jest.fn(),
  renderTeamCoverage: jest.fn(),
  renderVacationList: jest.fn(),
  bindVacationEvents: jest.fn()
}));

jest.mock('../../js/modules/hr/submodules/employees.js', () => ({
  getAllEmployees: jest.fn(() => [{ id: 'emp1', firstName: 'John', lastName: 'Doe' }]),
  getActiveEmployees: jest.fn(() => [{ id: 'emp1', firstName: 'John', lastName: 'Doe' }]),
  getEmployeeById: jest.fn((id) => ({ id, firstName: 'John', lastName: 'Doe' }))
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  getWeekStart: jest.fn(() => new Date('2023-01-02')), // Monday
  getWeekNumber: jest.fn(() => 1),
  formatDateDE: jest.fn(d => d)
}));

// Import module under test
import * as hrMain from '../../js/modules/hr/main.js';
import * as hrState from '../../js/modules/hr/hrState.js';
import * as hrHandlers from '../../js/modules/hr/hrHandlers.js';

describe('HR Main Module', () => {
  // DOM setup
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="main-content">
        <button class="hr-nav-btn" data-tab="employees">Employees</button>
        <button class="hr-nav-btn" data-tab="attendance">Attendance</button>
        <button class="hr-nav-btn" data-tab="schedule">Schedule</button>
        <button class="hr-nav-btn" data-tab="vacation">Vacation</button>

        <div id="employees-tab" class="hr-tab"></div>
        <div id="attendance-tab" class="hr-tab"></div>
        <div id="schedule-tab" class="hr-tab"></div>
        <div id="vacation-tab" class="hr-tab"></div>

        <!-- Employees Tab Elements -->
        <div id="employee-stats-container"></div>
        <div id="employee-list-container"></div>
        <div id="employees-empty" class="hidden"></div>
        <button id="add-employee-btn"></button>
        <button id="add-employee-empty"></button>
        <input id="employee-search" />
        <select id="department-filter"></select>
        <select id="status-filter"></select>

        <!-- Attendance Tab Elements -->
        <div id="attendance-calendar-container"></div>
        <div id="attendance-stats-container"></div>
        <select id="attendance-employee-filter"></select>
        <button id="record-attendance-btn"></button>
        <button id="attendance-filter-btn"></button>
        <input id="attendance-start-date" />
        <input id="attendance-end-date" />

        <!-- Schedule Tab Elements -->
        <div id="schedule-grid-container"></div>
        <div id="pending-approvals-container"></div>
        <select id="schedule-employee-select"></select>
        <input id="week-start-date" />
        <button id="create-schedule-btn"></button>
        <button id="prev-week-btn"></button>
        <button id="next-week-btn"></button>
        <button id="submit-schedule-btn"></button>

        <!-- Vacation Tab Elements -->
        <div id="vacation-calendar-container"></div>
        <div id="vacation-requests-container"></div>
        <div id="vacation-balance-container"></div>
        <button id="request-vacation-btn"></button>

        <!-- Modals -->
        <div id="employee-modal" class="hr-modal hidden">
          <div id="employee-form-container">
            <h2 id="employee-modal-title"></h2>
            <form id="hr-employee-form">
              <input name="firstName" value="New" />
              <button type="submit">Save</button>
              <button data-action="cancel">Cancel</button>
            </form>
          </div>
          <button class="hr-modal__close"></button>
          <div class="hr-modal__overlay"></div>
        </div>

        <div id="attendance-modal" class="hr-modal hidden">
          <div id="attendance-form-container">
            <form id="hr-attendance-form">
              <input name="employeeId" value="emp1" />
              <button type="submit">Save</button>
              <button data-action="cancel">Cancel</button>
            </form>
          </div>
        </div>

        <div id="schedule-modal" class="hr-modal hidden">
          <div id="schedule-form-container">
            <form id="hr-schedule-form">
              <input name="planned_0" value="8" />
              <button type="submit">Save</button>
              <button data-action="submit">Submit</button>
              <button data-action="cancel">Cancel</button>
            </form>
          </div>
        </div>

        <div id="vacation-modal" class="hr-modal hidden">
          <div id="vacation-form-container">
            <form id="hr-vacation-form">
              <button type="submit">Save</button>
              <button data-action="cancel">Cancel</button>
            </form>
          </div>
        </div>

        <!-- Alerts -->
        <div id="hr-success-alert" class="hr-alert hidden">
          <span class="hr-alert__message"></span>
          <button class="hr-alert__close"></button>
        </div>
        <div id="hr-error-alert" class="hr-alert hidden">
          <span class="hr-alert__message"></span>
        </div>

        <div id="hr-loading" class="hidden"></div>

        <button id="sync-btn"></button>
        <button id="export-btn"></button>
      </div>
    `;

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('initializeHrDashboard initializes handlers and renders default tab', () => {
      hrMain.initializeHrDashboard();

      expect(hrHandlers.initializeHrHandlers).toHaveBeenCalled();
      expect(hrState.subscribeHr).toHaveBeenCalled();

      // Default tab is employees
      const employeeTab = document.querySelector('[data-tab="employees"]');
      // Note: active class logic depends on switchTab implementation which updates dashboardState
      // We can verify renderEmployeesTab was called indirectly via renderEmployeeList
      const employeeListRenderer = require('../../js/modules/hr/renderers/employeeRenderer.js').renderEmployeeList;
      expect(employeeListRenderer).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    test('switchTab changes active tab and renders content', () => {
      hrMain.initializeHrDashboard();
      hrMain.switchTab('attendance');

      expect(hrState.setActiveTab).toHaveBeenCalledWith('attendance');

      // Check UI updates
      const attendanceBtn = document.querySelector('[data-tab="attendance"]');
      expect(attendanceBtn.classList.contains('active')).toBe(true);

      const attendanceRenderer = require('../../js/modules/hr/renderers/attendanceRenderer.js').renderAttendanceCalendar;
      expect(attendanceRenderer).toHaveBeenCalled();
    });

    test('Nav buttons trigger switchTab', () => {
      hrMain.initializeHrDashboard();

      const scheduleBtn = document.querySelector('[data-tab="schedule"]');
      scheduleBtn.click();

      expect(hrState.setActiveTab).toHaveBeenCalledWith('schedule');
    });
  });

  describe('Modals', () => {
    test('openModal shows modal', () => {
      hrMain.openModal('employee-modal');
      const modal = document.getElementById('employee-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(modal.getAttribute('aria-hidden')).toBe('false');
    });

    test('closeModal hides modal', () => {
      const modal = document.getElementById('employee-modal');
      modal.classList.remove('hidden');

      hrMain.closeModal('employee-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(modal.getAttribute('aria-hidden')).toBe('true');
    });

    test('Escape key closes modals', () => {
      hrMain.initializeHrDashboard();
      hrMain.openModal('employee-modal');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      const modal = document.getElementById('employee-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Employee Management', () => {
    test('Add employee button opens modal', () => {
      hrMain.initializeHrDashboard();

      const btn = document.getElementById('add-employee-btn');
      btn.click();

      const modal = document.getElementById('employee-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
      const title = document.getElementById('employee-modal-title');
      expect(title.textContent).toBe('Add Employee');
    });

    test('Employee form submit calls handler', () => {
      hrMain.initializeHrDashboard();
      // Use button click to ensure event listeners are bound
      const btn = document.getElementById('add-employee-btn');
      btn.click();

      const form = document.getElementById('hr-employee-form');
      form.dispatchEvent(new Event('submit'));

      expect(hrHandlers.handleAddEmployee).toHaveBeenCalled();
      const modal = document.getElementById('employee-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('Employee search updates filters', () => {
      hrMain.initializeHrDashboard();

      const input = document.getElementById('employee-search');
      input.value = 'Smith';
      input.dispatchEvent(new Event('input'));

      expect(hrState.setFilters).toHaveBeenCalledWith({ searchTerm: 'Smith' });
    });
  });

  describe('Attendance', () => {
    test('Record attendance button opens modal', () => {
      hrMain.initializeHrDashboard();
      hrMain.switchTab('attendance');

      const btn = document.getElementById('record-attendance-btn');
      btn.click();

      const modal = document.getElementById('attendance-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('Attendance form submit calls handler', () => {
      hrMain.initializeHrDashboard();
      // Need to open modal to bind events to the form inside renderAttendanceForm logic?
      // Wait, renderAttendanceForm is mocked, so it won't render the form HTML.
      // But the test DOM has the form. The logic in main.js calls renderAttendanceForm then binds events.
      // Since renderAttendanceForm is mocked, the form element in DOM remains as is (from beforeEach).
      // main.js finds the form and adds listener.

      // We need to simulate opening modal which triggers event binding
      // openAttendanceModal calls renderAttendanceForm (mocked) and then adds listeners

      // Need to make sure switchTab('attendance') sets up the environment?
      // No, openAttendanceModal is called by click.

      // Manually trigger the "open" logic via button click or direct call if exported (it's not exported directly, but openModal is)
      // Actually openAttendanceModal is not exported, but used in event listener.

      const btn = document.getElementById('record-attendance-btn');
      btn.click();

      const form = document.getElementById('hr-attendance-form');
      form.dispatchEvent(new Event('submit'));

      expect(hrHandlers.handleRecordAttendance).toHaveBeenCalled();
    });
  });

  describe('Schedule', () => {
    test('Create schedule button opens modal', () => {
      hrMain.initializeHrDashboard();
      hrMain.switchTab('schedule');

      const select = document.getElementById('schedule-employee-select');
      select.value = 'emp1';

      const btn = document.getElementById('create-schedule-btn');
      btn.click();

      const modal = document.getElementById('schedule-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('Week navigation updates state', () => {
      hrMain.initializeHrDashboard();
      hrMain.switchTab('schedule');

      const nextBtn = document.getElementById('next-week-btn');
      nextBtn.click();

      const renderer = require('../../js/modules/hr/renderers/scheduleRenderer.js').renderWeeklyScheduleGrid;
      expect(renderer).toHaveBeenCalledTimes(3); // Initial render + switchTab + after click
    });
  });

  describe('Vacation', () => {
    test('Request vacation button opens modal', () => {
      hrMain.initializeHrDashboard();
      hrMain.switchTab('vacation');

      const btn = document.getElementById('request-vacation-btn');
      btn.click();

      const modal = document.getElementById('vacation-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Alerts', () => {
    test('showAlert shows alert', () => {
      hrMain.showAlert('success', 'Test Message');

      const alert = document.getElementById('hr-success-alert');
      expect(alert.classList.contains('hidden')).toBe(false);
      expect(alert.querySelector('.hr-alert__message').textContent).toBe('Test Message');
    });

    test('hideAlert hides alert', () => {
      const alert = document.getElementById('hr-success-alert');
      alert.classList.remove('hidden');

      hrMain.hideAlert('hr-success-alert');
      expect(alert.classList.contains('hidden')).toBe(true);
    });
  });
});
