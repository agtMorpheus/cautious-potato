/**
 * Unit Tests for Employee Renderer (employeeRenderer.js)
 * Tests UI rendering functions for employee management
 */

import { jest } from '@jest/globals';

// Define mocks before imports
jest.mock('../../js/modules/hr/submodules/employees.js');
jest.mock('../../js/modules/hr/hrUtils.js');

import {
  renderEmployeeList,
  renderEmployeeForm,
  renderEmployeeDetail,
  renderEmployeeStats,
  bindEmployeeListEvents
} from '../../js/modules/hr/renderers/employeeRenderer.js';

import * as employeesModule from '../../js/modules/hr/submodules/employees.js';
import * as hrUtils from '../../js/modules/hr/hrUtils.js';

describe('Employee Renderer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    jest.clearAllMocks();

    // Default mock implementations
    hrUtils.getStatusClass.mockImplementation(s => `status-${s}`);
    hrUtils.getStatusText.mockImplementation(s => s);
  });

  describe('renderEmployeeList', () => {
    test('renders list with employees', () => {
      const employees = [
        {
          id: 'emp1',
          personalNumber: '123',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'Doe, John',
          email: 'john@example.com',
          department: 'IT',
          position: 'Dev',
          statusClass: 'status-active',
          statusText: 'Active',
          hoursPerWeek: 40
        }
      ];

      employeesModule.getEmployeeListForDisplay.mockReturnValue(employees);

      renderEmployeeList(container);

      expect(container.querySelector('table')).not.toBeNull();
      expect(container.innerHTML).toContain('Doe, John');
      expect(container.innerHTML).toContain('john@example.com');
      expect(container.innerHTML).toContain('IT');
    });

    test('renders empty state when no employees', () => {
      employeesModule.getEmployeeListForDisplay.mockReturnValue([]);

      renderEmployeeList(container);

      expect(container.innerHTML).toContain('Keine Mitarbeiter vorhanden');
    });
  });

  describe('renderEmployeeForm', () => {
    test('renders form for new employee', () => {
      employeesModule.getUniqueDepartments.mockReturnValue(['IT', 'HR']);
      employeesModule.getUniquePositions.mockReturnValue(['Dev', 'Manager']);

      renderEmployeeForm(container, null);

      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      expect(form.innerHTML).toContain('Vorname *');
      expect(form.querySelector('button[type="submit"]').textContent).toContain('Hinzufügen');
    });

    test('renders form for editing employee', () => {
      const employee = {
        id: 'emp1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        contractType: 'fulltime',
        employmentStatus: 'active'
      };

      employeesModule.getUniqueDepartments.mockReturnValue(['IT']);
      employeesModule.getUniquePositions.mockReturnValue(['Dev']);

      renderEmployeeForm(container, employee);

      const form = container.querySelector('form');
      expect(form.querySelector('input[name="firstName"]').value).toBe('John');
      expect(form.querySelector('select[name="contractType"]').value).toBe('fulltime');
      expect(form.querySelector('button[type="submit"]').textContent).toContain('Speichern');
    });
  });

  describe('renderEmployeeDetail', () => {
    test('renders employee details', () => {
      const employee = {
        id: 'emp1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        hoursPerWeek: 40
      };

      const formatted = {
        fullName: 'Doe, John',
        statusClass: 'status-active',
        statusText: 'Active',
        contractTypeText: 'Full-time',
        formattedStartDate: '01.01.2023'
      };

      employeesModule.getEmployeeById.mockReturnValue(employee);
      employeesModule.formatEmployeeForDisplay.mockReturnValue(formatted);

      renderEmployeeDetail(container, 'emp1');

      expect(container.innerHTML).toContain('Doe, John');
      expect(container.innerHTML).toContain('john@example.com');
      expect(container.innerHTML).toContain('Full-time');
    });

    test('renders error state when employee not found', () => {
      employeesModule.getEmployeeById.mockReturnValue(null);

      renderEmployeeDetail(container, 'invalid');

      expect(container.innerHTML).toContain('Mitarbeiter nicht gefunden');
    });
  });

  describe('renderEmployeeStats', () => {
    test('renders statistics cards', () => {
      const stats = {
        total: 10,
        active: 8,
        inactive: 2,
        byDepartment: { 'IT': 5, 'HR': 5 }
      };

      employeesModule.getEmployeeStatistics.mockReturnValue(stats);

      renderEmployeeStats(container);

      expect(container.querySelectorAll('.hr-stat-card').length).toBe(4);
      expect(container.innerHTML).toContain('10'); // total
      expect(container.innerHTML).toContain('8'); // active
    });
  });

  describe('bindEmployeeListEvents', () => {
    test('binds view and edit actions', () => {
      const handlers = {
        onView: jest.fn(),
        onEdit: jest.fn()
      };

      bindEmployeeListEvents(container, handlers);

      const viewBtn = document.createElement('button');
      viewBtn.dataset.action = 'view';
      viewBtn.dataset.id = 'emp1';
      container.appendChild(viewBtn);
      viewBtn.click();
      expect(handlers.onView).toHaveBeenCalledWith('emp1');

      const editBtn = document.createElement('button');
      editBtn.dataset.action = 'edit';
      editBtn.dataset.id = 'emp1';
      container.appendChild(editBtn);
      editBtn.click();
      expect(handlers.onEdit).toHaveBeenCalledWith('emp1');
    });

    test('binds delete action with confirmation', () => {
      const handlers = {
        onDelete: jest.fn()
      };

      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      bindEmployeeListEvents(container, handlers);

      const deleteBtn = document.createElement('button');
      deleteBtn.dataset.action = 'delete';
      deleteBtn.dataset.id = 'emp1';
      container.appendChild(deleteBtn);

      deleteBtn.click();

      expect(confirmSpy).toHaveBeenCalled();
      expect(handlers.onDelete).toHaveBeenCalledWith('emp1');

      confirmSpy.mockRestore();
    });

    test('cancels delete action when not confirmed', () => {
      const handlers = {
        onDelete: jest.fn()
      };

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      bindEmployeeListEvents(container, handlers);

      const deleteBtn = document.createElement('button');
      deleteBtn.dataset.action = 'delete';
      deleteBtn.dataset.id = 'emp1';
      container.appendChild(deleteBtn);

      deleteBtn.click();

      expect(confirmSpy).toHaveBeenCalled();
      expect(handlers.onDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });
});
