/**
 * Unit Tests for Vacation Renderer (vacationRenderer.js)
 * Tests UI rendering functions for vacation management
 */

import {
  renderVacationCalendar,
  renderVacationForm,
  renderPendingVacationApprovals,
  renderVacationBalance,
  renderTeamCoverage,
  renderVacationList,
  bindVacationEvents
} from '../../js/modules/hr/renderers/vacationRenderer.js';

import * as vacationModule from '../../js/modules/hr/submodules/vacation.js';
import * as hrUtils from '../../js/modules/hr/hrUtils.js';

// Mock dependencies
jest.mock('../../js/modules/hr/submodules/vacation.js', () => ({
  getAllVacation: jest.fn(),
  getVacationById: jest.fn(),
  getVacationByEmployee: jest.fn(),
  getPendingVacationRequests: jest.fn(),
  getVacationCalendarData: jest.fn(),
  getUpcomingVacation: jest.fn(),
  getTeamCoverageView: jest.fn(),
  calculateVacationBalance: jest.fn(),
  formatVacationForDisplay: jest.fn(),
  VACATION_TYPE: { ANNUAL: 'annual', SICK: 'sick' },
  VACATION_STATUS: { PENDING: 'pending', APPROVED: 'approved' }
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  formatDateDE: jest.fn((date) => date),
  getStatusClass: jest.fn((status) => `status-${status}`),
  getStatusText: jest.fn((status) => status),
  calculateWorkingDays: jest.fn(() => 5)
}));

describe('Vacation Renderer (vacationRenderer.js)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    jest.clearAllMocks();
  });

  describe('renderVacationCalendar', () => {
    test('renders calendar structure', () => {
      vacationModule.getVacationCalendarData.mockReturnValue({
        year: 2023,
        month: 6,
        vacationsByDate: {
          '2023-06-01': [{ employeeId: 'emp-1' }]
        }
      });

      const employeeMap = new Map([
        ['emp-1', { firstName: 'John', lastName: 'Doe' }]
      ]);

      renderVacationCalendar(container, 2023, 6, employeeMap);

      expect(container.querySelector('.hr-vacation-calendar')).toBeTruthy();
      expect(container.querySelector('.hr-vacation-calendar-header h3')).toBeTruthy();
      expect(container.querySelectorAll('.hr-vacation-cell').length).toBeGreaterThan(28);
    });

    test('renders indicators for vacations', () => {
      vacationModule.getVacationCalendarData.mockReturnValue({
        year: 2023,
        month: 6,
        vacationsByDate: {
          '2023-06-01': [{ employeeId: 'emp-1' }]
        }
      });

      renderVacationCalendar(container, 2023, 6);

      // We expect the cell for 2023-06-01 to have indicators
      const cell = container.querySelector('[data-date="2023-06-01"]');
      expect(cell).toBeTruthy();
      expect(cell.querySelector('.hr-vacation-indicators')).toBeTruthy();
    });
  });

  describe('renderVacationForm', () => {
    test('renders form for new request', () => {
      const employees = [{ id: 'emp-1', firstName: 'John', lastName: 'Doe' }];

      renderVacationForm(container, null, employees);

      expect(container.querySelector('form')).toBeTruthy();
      expect(container.querySelector('button[type="submit"]').textContent).toContain('Antrag einreichen');
      expect(container.querySelector('select[name="employeeId"] option[value="emp-1"]')).toBeTruthy();
    });

    test('renders form for editing request', () => {
      const request = {
        employeeId: 'emp-1',
        vacationType: 'annual',
        startDate: '2023-06-01',
        endDate: '2023-06-05',
        daysRequested: 5,
        reason: 'Holiday',
        replacementContact: 'emp-2'
      };

      const employees = [
        { id: 'emp-1', firstName: 'John', lastName: 'Doe' },
        { id: 'emp-2', firstName: 'Jane', lastName: 'Smith' }
      ];

      renderVacationForm(container, request, employees);

      expect(container.querySelector('button[type="submit"]').textContent).toContain('Speichern');
      expect(container.querySelector('select[name="employeeId"]').disabled).toBe(true);
      expect(container.querySelector('textarea').value).toBe('Holiday');
    });

    test('updates days calculation on date change', () => {
      renderVacationForm(container);

      const startInput = container.querySelector('#vac-start');
      const endInput = container.querySelector('#vac-end');
      const display = container.querySelector('#vac-days-count');

      hrUtils.calculateWorkingDays.mockReturnValue(10);

      startInput.value = '2023-06-01';
      endInput.value = '2023-06-15';
      startInput.dispatchEvent(new Event('change'));

      expect(hrUtils.calculateWorkingDays).toHaveBeenCalled();
      expect(display.textContent).toBe('10');
    });
  });

  describe('renderPendingVacationApprovals', () => {
    test('renders pending requests', () => {
      const requests = [
        {
          id: 'vac-1',
          employeeId: 'emp-1',
          startDate: '2023-06-01',
          endDate: '2023-06-05',
          status: 'pending'
        }
      ];

      vacationModule.getPendingVacationRequests.mockReturnValue(requests);
      vacationModule.formatVacationForDisplay.mockImplementation(r => ({
        ...r,
        formattedStartDate: r.startDate,
        formattedEndDate: r.endDate,
        statusClass: 'status-pending',
        statusText: 'pending',
        typeText: 'Annual',
        duration: '5 days'
      }));

      renderPendingVacationApprovals(container);

      expect(container.querySelectorAll('.hr-vacation-approval-card').length).toBe(1);
      expect(container.querySelector('[data-action="approve"]')).toBeTruthy();
      expect(container.querySelector('[data-action="reject"]')).toBeTruthy();
    });

    test('renders empty state', () => {
      vacationModule.getPendingVacationRequests.mockReturnValue([]);

      renderPendingVacationApprovals(container);

      expect(container.querySelector('.hr-empty-state')).toBeTruthy();
    });
  });

  describe('renderVacationBalance', () => {
    test('renders balance cards', () => {
      vacationModule.calculateVacationBalance.mockReturnValue({
        total: 30,
        used: 10,
        pending: 5,
        remaining: 15
      });
      vacationModule.getUpcomingVacation.mockReturnValue([]);

      renderVacationBalance(container, 'emp-1', 2023);

      expect(container.querySelector('.hr-vacation-balance')).toBeTruthy();
      expect(container.querySelectorAll('.hr-balance-card').length).toBe(4);
      expect(container.innerHTML).toContain('30'); // total
      expect(container.innerHTML).toContain('15'); // remaining
    });

    test('renders upcoming vacation list', () => {
      vacationModule.calculateVacationBalance.mockReturnValue({ total: 30, used: 0, pending: 0, remaining: 30 });
      vacationModule.getUpcomingVacation.mockReturnValue([
        {
          formattedStartDate: '2023-06-01',
          formattedEndDate: '2023-06-05',
          duration: '5 days'
        }
      ]);

      renderVacationBalance(container, 'emp-1');

      expect(container.querySelector('.hr-upcoming-list')).toBeTruthy();
      expect(container.innerHTML).toContain('2023-06-01');
    });
  });

  describe('renderTeamCoverage', () => {
    test('renders coverage grid', () => {
      vacationModule.getTeamCoverageView.mockReturnValue({
        teamSize: 10,
        dailyCoverage: {
          '2023-06-01': { coveragePercent: 90, presentCount: 9 },
          '2023-06-02': { coveragePercent: 40, presentCount: 4 }
        }
      });

      renderTeamCoverage(container, ['emp-1'], '2023-06-01', '2023-06-02');

      expect(container.querySelector('.hr-team-coverage')).toBeTruthy();
      expect(container.querySelectorAll('.hr-coverage-day').length).toBe(2);
      expect(container.querySelector('.hr-coverage-good')).toBeTruthy(); // 90%
      expect(container.querySelector('.hr-coverage-critical')).toBeTruthy(); // 40%
    });
  });

  describe('renderVacationList', () => {
    test('renders list of vacations', () => {
      const vacations = [
        {
          id: 'vac-1',
          startDate: '2023-06-01',
          status: 'approved'
        }
      ];

      vacationModule.getVacationByEmployee.mockReturnValue(vacations);
      vacationModule.formatVacationForDisplay.mockImplementation(r => ({
        ...r,
        formattedStartDate: r.startDate,
        formattedEndDate: r.startDate,
        statusText: 'Approved',
        typeText: 'Annual',
        daysRequested: 5,
        formattedRequestedAt: '2023-01-01'
      }));

      renderVacationList(container, 'emp-1');

      expect(container.querySelector('table')).toBeTruthy();
      expect(container.querySelectorAll('tbody tr').length).toBe(1);
    });

    test('renders empty state', () => {
      vacationModule.getVacationByEmployee.mockReturnValue([]);

      renderVacationList(container, 'emp-1');

      expect(container.querySelector('.hr-empty-state')).toBeTruthy();
    });
  });

  describe('bindVacationEvents', () => {
    test('binds calendar navigation events', () => {
      const handlers = {
        onPrevMonth: jest.fn(),
        onNextMonth: jest.fn(),
        onNewRequest: jest.fn()
      };

      bindVacationEvents(container, handlers);

      // Simulate button clicks
      const prevBtn = document.createElement('button');
      prevBtn.dataset.action = 'prev-month';
      container.appendChild(prevBtn);

      prevBtn.click();
      expect(handlers.onPrevMonth).toHaveBeenCalled();
    });

    test('binds approval actions', () => {
      const handlers = {
        onApprove: jest.fn(),
        onReject: jest.fn()
      };

      bindVacationEvents(container, handlers);

      const approveBtn = document.createElement('button');
      approveBtn.dataset.action = 'approve';
      approveBtn.dataset.id = 'vac-1';
      container.appendChild(approveBtn);

      approveBtn.click();
      expect(handlers.onApprove).toHaveBeenCalledWith('vac-1');
    });

    test('binds date click', () => {
      const handlers = {
        onDateClick: jest.fn()
      };

      bindVacationEvents(container, handlers);

      const cell = document.createElement('div');
      cell.dataset.date = '2023-06-01';
      container.appendChild(cell);

      cell.click();
      expect(handlers.onDateClick).toHaveBeenCalledWith('2023-06-01');
    });
  });
});
