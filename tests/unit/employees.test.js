/**
 * Unit Tests for Employees Submodule (employees.js)
 * Tests employee roster management functionality
 */

import {
  getAllEmployees,
  getEmployeeById,
  getEmployeesByDepartment,
  getActiveEmployees,
  searchEmployees,
  getEmployeeStatistics,
  createEmployee,
  editEmployee,
  removeEmployee,
  archiveEmployee,
  getUniqueDepartments,
  getUniquePositions,
  formatEmployeeForDisplay,
  getEmployeeListForDisplay
} from '../../js/modules/hr/submodules/employees.js';

import {
  getHrState,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  filterEmployees
} from '../../js/modules/hr/hrState.js';

import {
  validateEmployee,
  formatEmployeeName,
  formatDateDE,
  getStatusClass,
  getStatusText,
  generateEmployeeId,
  sortEmployees
} from '../../js/modules/hr/hrUtils.js';

// Mock dependencies
jest.mock('../../js/modules/hr/hrState.js', () => ({
  getHrState: jest.fn(),
  addEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn(),
  filterEmployees: jest.fn()
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  validateEmployee: jest.fn(() => ({ valid: true, errors: [] })),
  formatEmployeeName: jest.fn((emp) => `${emp.lastName}, ${emp.firstName}`),
  formatDateDE: jest.fn((date) => date),
  getStatusClass: jest.fn((status) => `status-${status}`),
  getStatusText: jest.fn((status) => status),
  generateEmployeeId: jest.fn(() => `EMP${Date.now()}`),
  sortEmployees: jest.fn((employees) => employees)
}));

describe('Employees Submodule (employees.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock state
    getHrState.mockReturnValue({
      employees: [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          department: 'Engineering',
          position: 'Developer',
          contractType: 'fulltime',
          startDate: '2020-01-15',
          endDate: null,
          hoursPerWeek: 40,
          employmentStatus: 'active'
        },
        {
          id: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          department: 'Engineering',
          position: 'Manager',
          contractType: 'fulltime',
          startDate: '2019-06-01',
          endDate: null,
          hoursPerWeek: 40,
          employmentStatus: 'active'
        },
        {
          id: 'emp-3',
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          department: 'Sales',
          position: 'Representative',
          contractType: 'parttime',
          startDate: '2021-03-10',
          endDate: '2024-01-31',
          hoursPerWeek: 20,
          employmentStatus: 'inactive'
        }
      ]
    });
    
    filterEmployees.mockImplementation((filters) => {
      const state = getHrState();
      let result = state.employees;
      
      if (filters.department) {
        result = result.filter(e => e.department === filters.department);
      }
      if (filters.status) {
        result = result.filter(e => e.employmentStatus === filters.status);
      }
      if (filters.searchText) {
        const term = filters.searchText.toLowerCase();
        result = result.filter(e => 
          e.firstName.toLowerCase().includes(term) ||
          e.lastName.toLowerCase().includes(term)
        );
      }
      
      return result;
    });
  });

  describe('getAllEmployees()', () => {
    test('returns all employees from state', () => {
      const result = getAllEmployees();
      
      expect(result.length).toBe(3);
    });

    test('returns empty array when no employees', () => {
      getHrState.mockReturnValueOnce({ employees: [] });
      
      const result = getAllEmployees();
      
      expect(result).toEqual([]);
    });
  });

  describe('getEmployeeById()', () => {
    test('returns employee by ID', () => {
      const result = getEmployeeById('emp-1');
      
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    test('returns null for non-existent ID', () => {
      const result = getEmployeeById('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('getEmployeesByDepartment()', () => {
    test('returns employees for department', () => {
      const result = getEmployeesByDepartment('Engineering');
      
      expect(filterEmployees).toHaveBeenCalledWith({ department: 'Engineering' });
    });

    test('returns empty for non-existent department', () => {
      filterEmployees.mockReturnValueOnce([]);
      
      const result = getEmployeesByDepartment('NonExistent');
      
      expect(result).toEqual([]);
    });
  });

  describe('getActiveEmployees()', () => {
    test('filters by active status', () => {
      const result = getActiveEmployees();
      
      expect(filterEmployees).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('searchEmployees()', () => {
    test('searches by text', () => {
      const result = searchEmployees('John');
      
      expect(filterEmployees).toHaveBeenCalledWith({ searchText: 'John' });
    });
  });

  describe('getEmployeeStatistics()', () => {
    test('returns total count', () => {
      const result = getEmployeeStatistics();
      
      expect(result.total).toBe(3);
    });

    test('returns count by department', () => {
      const result = getEmployeeStatistics();
      
      expect(result.byDepartment['Engineering']).toBe(2);
      expect(result.byDepartment['Sales']).toBe(1);
    });

    test('returns count by status', () => {
      const result = getEmployeeStatistics();
      
      expect(result.byStatus['active']).toBe(2);
      expect(result.byStatus['inactive']).toBe(1);
    });

    test('returns count by contract type', () => {
      const result = getEmployeeStatistics();
      
      expect(result.byContractType['fulltime']).toBe(2);
      expect(result.byContractType['parttime']).toBe(1);
    });

    test('handles employees with missing department', () => {
      getHrState.mockReturnValueOnce({
        employees: [{ id: 'emp-x', firstName: 'Test', employmentStatus: 'active' }]
      });
      
      const result = getEmployeeStatistics();
      
      expect(result.byDepartment['Unzugewiesen']).toBe(1);
    });
  });

  describe('createEmployee()', () => {
    test('creates new employee with valid data', () => {
      const data = {
        firstName: 'New',
        lastName: 'Employee',
        email: 'new@example.com',
        department: 'HR'
      };
      
      const result = createEmployee(data);
      
      expect(result.success).toBe(true);
      expect(result.employee).toBeDefined();
      expect(addEmployee).toHaveBeenCalled();
    });

    test('returns errors when validation fails', () => {
      validateEmployee.mockReturnValueOnce({
        valid: false,
        errors: ['First name is required']
      });
      
      const result = createEmployee({});
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('First name is required');
    });

    test('sets default values', () => {
      const data = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      };
      
      const result = createEmployee(data);
      
      expect(result.employee.contractType).toBe('fulltime');
      expect(result.employee.hoursPerWeek).toBe(40);
      expect(result.employee.employmentStatus).toBe('active');
    });

    test('generates unique ID', () => {
      const data = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      };
      
      createEmployee(data);
      
      expect(generateEmployeeId).toHaveBeenCalled();
    });

    test('includes address with defaults', () => {
      const result = createEmployee({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      });
      
      expect(result.employee.address.country).toBe('Germany');
    });

    test('includes tax with defaults', () => {
      const result = createEmployee({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      });
      
      expect(result.employee.tax.taxClass).toBe('I');
    });
  });

  describe('editEmployee()', () => {
    test('updates existing employee', () => {
      const result = editEmployee('emp-1', { position: 'Senior Developer' });
      
      expect(result.success).toBe(true);
      expect(updateEmployee).toHaveBeenCalledWith('emp-1', { position: 'Senior Developer' });
    });

    test('returns error for non-existent employee', () => {
      const result = editEmployee('non-existent', { position: 'Test' });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Mitarbeiter nicht gefunden');
    });

    test('validates merged data', () => {
      editEmployee('emp-1', { firstName: 'Updated' });
      
      expect(validateEmployee).toHaveBeenCalled();
    });

    test('returns errors when validation fails', () => {
      validateEmployee.mockReturnValueOnce({ valid: true, errors: [] })
        .mockReturnValueOnce({ valid: false, errors: ['Invalid email'] });
      
      const result = editEmployee('emp-1', { email: 'invalid' });
      
      expect(result.success).toBe(false);
    });
  });

  describe('removeEmployee()', () => {
    test('removes existing employee', () => {
      const result = removeEmployee('emp-1');
      
      expect(result.success).toBe(true);
      expect(deleteEmployee).toHaveBeenCalledWith('emp-1');
    });

    test('returns error for non-existent employee', () => {
      const result = removeEmployee('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Mitarbeiter nicht gefunden');
    });
  });

  describe('archiveEmployee()', () => {
    test('sets status to inactive', () => {
      archiveEmployee('emp-1');
      
      expect(updateEmployee).toHaveBeenCalledWith('emp-1', expect.objectContaining({
        employmentStatus: 'inactive'
      }));
    });

    test('sets end date to today', () => {
      const today = new Date().toISOString().split('T')[0];
      
      archiveEmployee('emp-1');
      
      expect(updateEmployee).toHaveBeenCalledWith('emp-1', expect.objectContaining({
        endDate: today
      }));
    });
  });

  describe('getUniqueDepartments()', () => {
    test('returns unique departments', () => {
      const result = getUniqueDepartments();
      
      expect(result).toContain('Engineering');
      expect(result).toContain('Sales');
    });

    test('returns sorted array', () => {
      const result = getUniqueDepartments();
      
      expect(result).toEqual([...result].sort());
    });

    test('excludes empty departments', () => {
      getHrState.mockReturnValueOnce({
        employees: [
          { department: 'HR' },
          { department: '' },
          { department: null }
        ]
      });
      
      const result = getUniqueDepartments();
      
      expect(result).toEqual(['HR']);
    });
  });

  describe('getUniquePositions()', () => {
    test('returns unique positions', () => {
      const result = getUniquePositions();
      
      expect(result).toContain('Developer');
      expect(result).toContain('Manager');
      expect(result).toContain('Representative');
    });

    test('returns sorted array', () => {
      const result = getUniquePositions();
      
      expect(result).toEqual([...result].sort());
    });
  });

  describe('formatEmployeeForDisplay()', () => {
    test('formats employee data', () => {
      const employee = {
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        startDate: '2020-01-15',
        endDate: null,
        employmentStatus: 'active',
        contractType: 'fulltime'
      };
      
      const result = formatEmployeeForDisplay(employee);
      
      expect(formatEmployeeName).toHaveBeenCalledWith(employee);
      expect(formatDateDE).toHaveBeenCalledWith('2020-01-15');
      expect(getStatusClass).toHaveBeenCalledWith('active');
      expect(getStatusText).toHaveBeenCalledWith('active');
      expect(getStatusText).toHaveBeenCalledWith('fulltime');
    });

    test('shows dash for null end date', () => {
      const employee = {
        startDate: '2020-01-15',
        endDate: null,
        employmentStatus: 'active'
      };
      
      const result = formatEmployeeForDisplay(employee);
      
      expect(result.formattedEndDate).toBe('-');
    });

    test('formats end date when present', () => {
      const employee = {
        startDate: '2020-01-15',
        endDate: '2024-01-31',
        employmentStatus: 'inactive'
      };
      
      const result = formatEmployeeForDisplay(employee);
      
      expect(formatDateDE).toHaveBeenCalledWith('2024-01-31');
    });
  });

  describe('getEmployeeListForDisplay()', () => {
    test('returns sorted and formatted employees', () => {
      const result = getEmployeeListForDisplay();
      
      expect(sortEmployees).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    test('uses default sort options', () => {
      getEmployeeListForDisplay();
      
      expect(sortEmployees).toHaveBeenCalledWith(
        expect.any(Array),
        'lastName',
        'asc'
      );
    });

    test('uses custom sort options', () => {
      getEmployeeListForDisplay({ sortBy: 'firstName', direction: 'desc' });
      
      expect(sortEmployees).toHaveBeenCalledWith(
        expect.any(Array),
        'firstName',
        'desc'
      );
    });
  });

  describe('Edge Cases', () => {
    test('handles empty employee list', () => {
      getHrState.mockReturnValue({ employees: [] });
      
      const stats = getEmployeeStatistics();
      
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
    });

    test('handles employees with missing optional fields', () => {
      getHrState.mockReturnValueOnce({
        employees: [{
          id: 'emp-minimal',
          firstName: 'Min',
          lastName: 'Imal'
        }]
      });
      
      const result = formatEmployeeForDisplay(getAllEmployees()[0]);
      
      expect(result).toBeDefined();
    });
  });
});
