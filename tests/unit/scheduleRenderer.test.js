/**
 * Unit Tests for Schedule Renderer (scheduleRenderer.js)
 * Tests UI rendering functions for schedule management
 */

import { jest } from '@jest/globals';

// Define mocks before imports
jest.mock('../../js/modules/hr/submodules/schedules.js', () => ({
  __esModule: true,
  WEEKDAYS_DE: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  SCHEDULE_STATUS: { DRAFT: 'draft', APPROVED: 'approved' },
  getAllSchedules: jest.fn(),
  getScheduleById: jest.fn(),
  getSchedulesByWeek: jest.fn(),
  getPendingSchedules: jest.fn(),
  getCurrentWeekSchedule: jest.fn(),
  formatScheduleForDisplay: jest.fn(),
  getScheduleGridData: jest.fn(),
  getScheduleHistory: jest.fn(),
  calculateWeeklyTotals: jest.fn()
}));

jest.mock('../../js/modules/hr/hrUtils.js');

import {
  renderWeeklyScheduleGrid,
  renderScheduleForm,
  renderPendingApprovals,
  renderScheduleHistory,
  bindScheduleEvents
} from '../../js/modules/hr/renderers/scheduleRenderer.js';

import * as schedulesModule from '../../js/modules/hr/submodules/schedules.js';
import * as hrUtils from '../../js/modules/hr/hrUtils.js';

describe('Schedule Renderer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    jest.clearAllMocks();

    // Default mock implementations
    hrUtils.formatDateDE.mockImplementation(d => d);
    hrUtils.formatHours.mockImplementation(h => h + 'h');
    hrUtils.getWeekNumber.mockReturnValue(40);
    hrUtils.getWeekStart.mockReturnValue(new Date('2023-10-02'));
    hrUtils.getStatusClass.mockImplementation(s => `status-${s}`);
    hrUtils.getStatusText.mockImplementation(s => s);
  });

  describe('renderWeeklyScheduleGrid', () => {
    test('renders grid with schedules', () => {
      const gridData = {
        weekLabel: 'KW 40/2023',
        rows: [
          {
            employee: { id: 'emp1', firstName: 'John', lastName: 'Doe' },
            hasSchedule: true,
            schedule: {
              id: 'sch1',
              status: 'approved',
              dailySchedule: Array(7).fill({ plannedHours: 8, actualHours: 8 })
            }
          }
        ]
      };

      schedulesModule.getScheduleGridData.mockReturnValue(gridData);
      schedulesModule.calculateWeeklyTotals.mockReturnValue({ plannedHours: 40, plannedPoints: 320 });

      renderWeeklyScheduleGrid(container, '2023-10-02', []);

      expect(container.innerHTML).toContain('KW 40/2023');
      expect(container.innerHTML).toContain('Doe, John');
      expect(container.innerHTML).toContain('320 Pkt');
      expect(container.querySelector('.hr-schedule-table')).not.toBeNull();
    });

    test('renders grid without schedules (create button)', () => {
      const gridData = {
        weekLabel: 'KW 40/2023',
        rows: [
          {
            employee: { id: 'emp2', firstName: 'Jane', lastName: 'Smith' },
            hasSchedule: false,
            schedule: null
          }
        ]
      };

      schedulesModule.getScheduleGridData.mockReturnValue(gridData);

      renderWeeklyScheduleGrid(container, '2023-10-02', []);

      expect(container.innerHTML).toContain('Smith, Jane');
      expect(container.querySelector('button[data-action="create-schedule"]')).not.toBeNull();
    });
  });

  describe('renderScheduleForm', () => {
    test('renders form for new schedule', () => {
      const employee = { id: 'emp1', firstName: 'John', lastName: 'Doe' };

      renderScheduleForm(container, null, employee);

      expect(container.querySelector('form')).not.toBeNull();
      expect(container.innerHTML).toContain('Wochenplan: Doe, John');
      expect(container.querySelectorAll('.hr-schedule-day-editor').length).toBe(7);
    });

    test('renders form for editing schedule', () => {
      const employee = { id: 'emp1', firstName: 'John', lastName: 'Doe' };
      const schedule = {
        id: 'sch1',
        weekStartDate: '2023-10-02',
        status: 'draft',
        totalHours: 40,
        totalPoints: 320,
        dailySchedule: Array(7).fill({
          day: 'Mo', plannedHours: 8, plannedPoints: 64, actualHours: 0, actualPoints: 0
        })
      };

      renderScheduleForm(container, schedule, employee);

      expect(container.querySelector('button[data-action="submit"]')).not.toBeNull();
      expect(container.querySelector('#total-planned-hours').textContent).toContain('40h');
    });
  });

  describe('renderPendingApprovals', () => {
    test('renders pending approvals list', () => {
      const pending = [
        {
          id: 'sch1',
          employeeId: 'emp1',
          weekLabel: 'KW 40',
          totalPoints: 320,
          submittedAt: '2023-10-01',
          formattedTotalHours: '40h'
        }
      ];

      schedulesModule.getPendingSchedules.mockReturnValue(pending);
      schedulesModule.formatScheduleForDisplay.mockImplementation(s => s);

      const employeeMap = new Map([
        ['emp1', { firstName: 'John', lastName: 'Doe' }]
      ]);

      renderPendingApprovals(container, employeeMap);

      expect(container.querySelector('.hr-approval-card')).not.toBeNull();
      expect(container.innerHTML).toContain('Doe, John');
      expect(container.innerHTML).toContain('KW 40');
    });

    test('renders empty state', () => {
      schedulesModule.getPendingSchedules.mockReturnValue([]);

      renderPendingApprovals(container);

      expect(container.innerHTML).toContain('Keine ausstehenden Genehmigungen');
    });
  });

  describe('renderScheduleHistory', () => {
    test('renders history table', () => {
      const history = [
        {
          id: 'sch1',
          weekLabel: 'KW 40',
          formattedTotalHours: '40h',
          formattedActualHours: '40h',
          totalPoints: 320,
          statusText: 'Approved',
          statusClass: 'status-approved'
        }
      ];

      schedulesModule.getScheduleHistory.mockReturnValue(history);

      renderScheduleHistory(container, 'emp1');

      expect(container.querySelector('.hr-data-table')).not.toBeNull();
      expect(container.innerHTML).toContain('KW 40');
      expect(container.innerHTML).toContain('320');
    });
  });

  describe('bindScheduleEvents', () => {
    test('binds navigation and action events', () => {
      const handlers = {
        onPrevWeek: jest.fn(),
        onCreate: jest.fn(),
        onApprove: jest.fn()
      };

      bindScheduleEvents(container, handlers);

      const prevBtn = document.createElement('button');
      prevBtn.dataset.action = 'prev-week';
      container.appendChild(prevBtn);
      prevBtn.click();
      expect(handlers.onPrevWeek).toHaveBeenCalled();

      const createBtn = document.createElement('button');
      createBtn.dataset.action = 'create-schedule';
      createBtn.dataset.employee = 'emp1';
      createBtn.dataset.week = '2023-10-02';
      container.appendChild(createBtn);
      createBtn.click();
      expect(handlers.onCreate).toHaveBeenCalledWith('emp1', '2023-10-02');
    });

    test('binds input change event for hours', () => {
      const handlers = {
        onHoursChange: jest.fn()
      };

      bindScheduleEvents(container, handlers);

      const input = document.createElement('input');
      input.className = 'hr-input-hours';
      container.appendChild(input);

      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(handlers.onHoursChange).toHaveBeenCalledWith(input);
    });
  });
});
