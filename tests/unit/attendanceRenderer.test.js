/**
 * Unit Tests for Attendance Renderer (attendanceRenderer.js)
 * Tests UI rendering functions for attendance tracking
 */

import { jest } from '@jest/globals';

// Define mocks before imports
jest.mock('../../js/modules/hr/submodules/attendance.js');
jest.mock('../../js/modules/hr/hrUtils.js');

import {
  renderDailyAttendanceLog,
  renderAttendanceForm,
  renderAttendanceCalendar,
  renderAttendanceReport,
  bindAttendanceEvents
} from '../../js/modules/hr/renderers/attendanceRenderer.js';

import * as attendanceModule from '../../js/modules/hr/submodules/attendance.js';
import * as hrUtils from '../../js/modules/hr/hrUtils.js';

describe('Attendance Renderer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    jest.clearAllMocks();

    // Default mock implementations
    hrUtils.formatDateDE.mockImplementation(d => d);
    hrUtils.getStatusClass.mockImplementation(s => `status-${s}`);
    hrUtils.getStatusText.mockImplementation(s => s);
  });

  describe('renderDailyAttendanceLog', () => {
    test('renders daily log with records', () => {
      const records = [
        { id: '1', employeeId: 'emp1', entryTime: '09:00', exitTime: '17:00' }
      ];

      attendanceModule.getAttendanceByDate.mockReturnValue(records);
      attendanceModule.formatAttendanceForDisplay.mockImplementation(r => ({
        ...r,
        formattedEntryTime: r.entryTime,
        formattedExitTime: r.exitTime,
        formattedHours: '8.0h',
        statusClass: 'status-present',
        statusText: 'Present'
      }));
      attendanceModule.getDailyAttendanceSummary.mockReturnValue({
        dayOfWeek: 'Monday',
        presentDays: 1,
        absentDays: 0,
        sickDays: 0,
        vacationDays: 0
      });

      const employeeMap = new Map([
        ['emp1', { firstName: 'John', lastName: 'Doe' }]
      ]);

      renderDailyAttendanceLog(container, '2023-10-02', employeeMap);

      expect(container.innerHTML).toContain('Monday, 2023-10-02');
      expect(container.innerHTML).toContain('Doe, John');
      expect(container.innerHTML).toContain('09:00');
      expect(container.querySelector('.hr-data-table')).not.toBeNull();
    });

    test('renders empty state when no records', () => {
      attendanceModule.getAttendanceByDate.mockReturnValue([]);
      attendanceModule.getDailyAttendanceSummary.mockReturnValue({
        dayOfWeek: 'Monday',
        presentDays: 0,
        absentDays: 0,
        sickDays: 0,
        vacationDays: 0
      });

      renderDailyAttendanceLog(container, '2023-10-02');

      expect(container.innerHTML).toContain('Keine Einträge für diesen Tag');
    });
  });

  describe('renderAttendanceForm', () => {
    test('renders form for new entry', () => {
      const employees = [{ id: 'emp1', firstName: 'John', lastName: 'Doe' }];

      renderAttendanceForm(container, null, employees);

      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      expect(form.querySelector('select[name="employeeId"]')).not.toBeNull();
      expect(form.querySelector('button[type="submit"]').textContent).toContain('Hinzufügen');
    });

    test('renders form for editing entry', () => {
      const record = {
        id: '1',
        employeeId: 'emp1',
        date: '2023-10-02',
        entryTime: '09:00',
        exitTime: '17:00',
        status: 'present',
        type: 'work'
      };

      renderAttendanceForm(container, record, []);

      const form = container.querySelector('form');
      expect(form.querySelector('select[name="employeeId"]').disabled).toBe(true);
      expect(form.querySelector('input[name="date"]').value).toBe('2023-10-02');
      expect(form.querySelector('button[type="submit"]').textContent).toContain('Speichern');
    });
  });

  describe('renderAttendanceCalendar', () => {
    test('renders calendar grid', () => {
      attendanceModule.getAttendanceByDate.mockReturnValue([]);

      renderAttendanceCalendar(container, 2023, 10);

      expect(container.querySelector('.hr-attendance-calendar')).not.toBeNull();
      expect(container.querySelector('h3').textContent).toContain('Oktober 2023');
      expect(container.querySelectorAll('.hr-calendar-day').length).toBeGreaterThan(28);
    });

    test('renders indicators for attendance', () => {
      attendanceModule.getAttendanceByDate.mockImplementation((date) => {
        if (date === '2023-10-02') return [{ status: 'present' }];
        return [];
      });

      renderAttendanceCalendar(container, 2023, 10);

      const cell = container.querySelector('[data-date="2023-10-02"]');
      expect(cell.classList.contains('hr-calendar-has-record')).toBe(true);
      expect(cell.querySelector('.hr-calendar-count').textContent).toBe('1');
    });
  });

  describe('renderAttendanceReport', () => {
    test('renders monthly report', () => {
      attendanceModule.getMonthlyAttendanceReport.mockReturnValue({
        totalRecords: 20,
        overall: {
          presentDays: 18,
          totalHours: 144
        },
        employeeSummaries: [
          {
            employeeId: 'emp1',
            presentDays: 18,
            absentDays: 0,
            sickDays: 0,
            vacationDays: 0,
            totalHours: 144
          }
        ]
      });

      renderAttendanceReport(container, 2023, 10);

      expect(container.innerHTML).toContain('Anwesenheitsbericht: Oktober 2023');
      expect(container.innerHTML).toContain('144.0h');
      expect(container.innerHTML).toContain('emp1');
    });

    test('renders empty report state', () => {
      attendanceModule.getMonthlyAttendanceReport.mockReturnValue({
        totalRecords: 0,
        overall: { presentDays: 0, totalHours: 0 },
        employeeSummaries: []
      });

      renderAttendanceReport(container, 2023, 10);

      expect(container.innerHTML).toContain('Keine Daten für diesen Zeitraum');
    });
  });

  describe('bindAttendanceEvents', () => {
    test('binds navigation and action events', () => {
      const handlers = {
        onPrevDay: jest.fn(),
        onNextDay: jest.fn(),
        onAdd: jest.fn(),
        onEdit: jest.fn()
      };

      bindAttendanceEvents(container, handlers);

      const prevBtn = document.createElement('button');
      prevBtn.dataset.action = 'prev-day';
      container.appendChild(prevBtn);
      prevBtn.click();
      expect(handlers.onPrevDay).toHaveBeenCalled();

      const addBtn = document.createElement('button');
      addBtn.dataset.action = 'add-attendance';
      container.appendChild(addBtn);
      addBtn.click();
      expect(handlers.onAdd).toHaveBeenCalled();
    });

    test('binds date change event', () => {
      const handlers = {
        onDateChange: jest.fn()
      };

      container.innerHTML = '<input type="date" id="attendance-date" />';
      bindAttendanceEvents(container, handlers);

      const input = container.querySelector('#attendance-date');
      input.value = '2023-11-01';
      input.dispatchEvent(new Event('change'));

      expect(handlers.onDateChange).toHaveBeenCalledWith('2023-11-01');
    });
  });
});
