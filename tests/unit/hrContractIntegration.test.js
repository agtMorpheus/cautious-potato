/**
 * Unit tests for HR-Contract Integration Module
 */

import {
    getAvailableWorkers,
    getWorkerById,
    formatWorkerName,
    getWorkerNameById,
    clearWorkerCache,
    isHrIntegrationAvailable,
    getWorkersByDepartment
} from '../../js/contracts/hrContractIntegration.js';

// Mock the HR state module
jest.mock('../../js/modules/hr/hrState.js', () => {
    const mockEmployees = [
        {
            id: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            department: 'Engineering',
            position: 'Developer',
            employmentStatus: 'active',
            archived: false
        },
        {
            id: 'EMP002',
            firstName: 'Jane',
            lastName: 'Smith',
            department: 'Sales',
            position: 'Manager',
            employmentStatus: 'active',
            archived: false
        },
        {
            id: 'EMP003',
            firstName: 'Bob',
            lastName: 'Wilson',
            department: 'Engineering',
            position: 'Senior Developer',
            employmentStatus: 'inactive',
            archived: false
        },
        {
            id: 'EMP004',
            firstName: 'Alice',
            lastName: 'Brown',
            department: 'HR',
            position: 'HR Manager',
            employmentStatus: 'active',
            archived: true
        }
    ];

    return {
        getHrState: jest.fn(() => ({
            employees: mockEmployees
        })),
        subscribeHr: jest.fn((callback) => {
            // Return unsubscribe function
            return () => {};
        })
    };
});

describe('HR-Contract Integration (hrContractIntegration.js)', () => {
    beforeEach(() => {
        // Clear cache before each test
        clearWorkerCache();
    });

    describe('getAvailableWorkers()', () => {
        test('returns only active non-archived employees', () => {
            const workers = getAvailableWorkers();
            
            expect(workers).toHaveLength(2);
            expect(workers.map(w => w.id)).toEqual(['EMP001', 'EMP002']);
        });

        test('formats worker name as "LastName, FirstName"', () => {
            const workers = getAvailableWorkers();
            
            expect(workers[0].name).toBe('Doe, John');
            expect(workers[1].name).toBe('Smith, Jane');
        });

        test('includes department and position', () => {
            const workers = getAvailableWorkers();
            
            expect(workers[0].department).toBe('Engineering');
            expect(workers[0].position).toBe('Developer');
        });

        test('returns workers sorted by name', () => {
            const workers = getAvailableWorkers();
            
            // Should be sorted alphabetically by formatted name
            const names = workers.map(w => w.name);
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });
    });

    describe('getWorkerById()', () => {
        test('returns worker object for valid ID', () => {
            const worker = getWorkerById('EMP001');
            
            expect(worker).not.toBeNull();
            expect(worker.id).toBe('EMP001');
            expect(worker.name).toBe('Doe, John');
        });

        test('returns null for invalid ID', () => {
            const worker = getWorkerById('INVALID');
            
            expect(worker).toBeNull();
        });

        test('returns null for null/undefined input', () => {
            expect(getWorkerById(null)).toBeNull();
            expect(getWorkerById(undefined)).toBeNull();
        });

        test('returns null for inactive employee ID', () => {
            // EMP003 is inactive
            const worker = getWorkerById('EMP003');
            
            expect(worker).toBeNull();
        });
    });

    describe('formatWorkerName()', () => {
        test('formats name as "LastName, FirstName"', () => {
            const employee = { firstName: 'John', lastName: 'Doe' };
            
            expect(formatWorkerName(employee)).toBe('Doe, John');
        });

        test('handles missing firstName', () => {
            const employee = { lastName: 'Doe' };
            
            expect(formatWorkerName(employee)).toBe('Doe');
        });

        test('handles missing lastName', () => {
            const employee = { firstName: 'John' };
            
            expect(formatWorkerName(employee)).toBe('John');
        });

        test('returns employee ID as fallback when name is missing', () => {
            const employee = { id: 'EMP001' };
            
            expect(formatWorkerName(employee)).toBe('EMP001');
        });

        test('handles null/undefined input', () => {
            expect(formatWorkerName(null)).toBe('');
            expect(formatWorkerName(undefined)).toBe('');
        });
    });

    describe('getWorkerNameById()', () => {
        test('returns worker name for valid ID', () => {
            const name = getWorkerNameById('EMP001');
            
            expect(name).toBe('Doe, John');
        });

        test('returns empty string for invalid ID', () => {
            const name = getWorkerNameById('INVALID');
            
            expect(name).toBe('');
        });

        test('returns empty string for null/undefined input', () => {
            expect(getWorkerNameById(null)).toBe('');
            expect(getWorkerNameById(undefined)).toBe('');
        });
    });

    describe('isHrIntegrationAvailable()', () => {
        test('returns true when HR state is available', () => {
            expect(isHrIntegrationAvailable()).toBe(true);
        });
    });

    describe('getWorkersByDepartment()', () => {
        test('groups workers by department', () => {
            const grouped = getWorkersByDepartment();
            
            expect(grouped).toHaveProperty('Engineering');
            expect(grouped).toHaveProperty('Sales');
            expect(grouped.Engineering).toHaveLength(1);
            expect(grouped.Sales).toHaveLength(1);
        });

        test('does not include inactive or archived employees', () => {
            const grouped = getWorkersByDepartment();
            
            // HR department only had an archived employee
            expect(grouped).not.toHaveProperty('HR');
        });
    });

    describe('caching behavior', () => {
        test('cache is cleared by clearWorkerCache()', () => {
            // First call populates cache
            const workers1 = getAvailableWorkers();
            
            // Clear cache
            clearWorkerCache();
            
            // Second call should still work
            const workers2 = getAvailableWorkers();
            
            expect(workers1).toEqual(workers2);
        });
    });
});
