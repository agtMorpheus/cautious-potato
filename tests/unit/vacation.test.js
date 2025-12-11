/**
 * Unit Tests for Vacation Submodule (vacation.js)
 * Tests vacation request management functionality
 */

import {
  getAllVacation,
  getVacationById,
  getVacationByEmployee,
  getVacationByStatus,
  getPendingVacationRequests,
  getVacationInRange,
  getApprovedVacationInRange,
  createVacation,
  approveVacation,
  rejectVacation,
  cancelVacation,
  checkVacationOverlap,
  calculateVacationBalance,
  getTeamVacationStats,
  formatVacationForDisplay,
  getVacationCalendarData,
  getUpcomingVacation,
  getTeamCoverageView,
  VACATION_TYPE,
  VACATION_STATUS,
  DEFAULT_ANNUAL_VACATION_DAYS
} from '../../js/modules/hr/submodules/vacation.js';

import {
  getHrState,
  setHrState,
  createVacationRequest,
  approveVacationRequest,
  rejectVacationRequest
} from '../../js/modules/hr/hrState.js';

import {
  validateVacation,
  formatDateDE,
  calculateWorkingDays,
  getStatusClass,
  getStatusText
} from '../../js/modules/hr/hrUtils.js';

// Mock dependencies
jest.mock('../../js/modules/hr/hrState.js', () => ({
  getHrState: jest.fn(),
  setHrState: jest.fn(),
  createVacationRequest: jest.fn(),
  approveVacationRequest: jest.fn(),
  rejectVacationRequest: jest.fn()
}));

jest.mock('../../js/modules/hr/hrUtils.js', () => ({
  validateVacation: jest.fn(() => ({ valid: true, errors: [] })),
  formatDateDE: jest.fn((date) => date),
  calculateWorkingDays: jest.fn(() => 5),
  getStatusClass: jest.fn((status) => `status-${status}`),
  getStatusText: jest.fn((status) => status)
}));

describe('Vacation Submodule (vacation.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock state
    getHrState.mockReturnValue({
      vacation: [
        {
          id: 'vac-1',
          employeeId: 'emp-1',
          startDate: '2023-06-01',
          endDate: '2023-06-05',
          daysRequested: 5,
          vacationType: 'annual',
          status: 'approved',
          requestedAt: '2023-05-01'
        },
        {
          id: 'vac-2',
          employeeId: 'emp-1',
          startDate: '2023-12-20',
          endDate: '2023-12-31',
          daysRequested: 8,
          vacationType: 'annual',
          status: 'pending',
          requestedAt: '2023-11-01'
        },
        {
          id: 'vac-3',
          employeeId: 'emp-2',
          startDate: '2023-07-10',
          endDate: '2023-07-14',
          daysRequested: 5,
          vacationType: 'annual',
          status: 'rejected',
          requestedAt: '2023-06-01'
        }
      ]
    });
  });

  describe('Data Retrieval Operations', () => {
    test('getAllVacation returns all requests', () => {
      const result = getAllVacation();
      expect(result.length).toBe(3);
    });

    test('getVacationById returns correct vacation', () => {
      const result = getVacationById('vac-1');
      expect(result.employeeId).toBe('emp-1');
    });

    test('getVacationById returns null for invalid ID', () => {
      const result = getVacationById('invalid');
      expect(result).toBeNull();
    });

    test('getVacationByEmployee returns requests for employee', () => {
      const result = getVacationByEmployee('emp-1');
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('vac-1');
      expect(result[1].id).toBe('vac-2');
    });

    test('getVacationByStatus returns requests with status', () => {
      const result = getVacationByStatus('approved');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('vac-1');
    });

    test('getPendingVacationRequests returns pending requests', () => {
      const result = getPendingVacationRequests();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('vac-2');
    });
  });

  describe('Date Range Operations', () => {
    test('getVacationInRange returns overlapping requests', () => {
      // Overlaps with vac-1 (June 1-5)
      const result = getVacationInRange('2023-06-03', '2023-06-10');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('vac-1');
    });

    test('getVacationInRange returns empty if no overlap', () => {
      const result = getVacationInRange('2023-01-01', '2023-01-31');
      expect(result.length).toBe(0);
    });

    test('getApprovedVacationInRange returns only approved overlapping requests', () => {
      // vac-2 is pending (Dec 20-31), vac-1 is approved (June 1-5)

      // Check June overlap
      const result1 = getApprovedVacationInRange('2023-06-01', '2023-06-30');
      expect(result1.length).toBe(1);
      expect(result1[0].id).toBe('vac-1');

      // Check Dec overlap
      const result2 = getApprovedVacationInRange('2023-12-01', '2023-12-31');
      expect(result2.length).toBe(0);
    });
  });

  describe('CRUD Operations', () => {
    describe('createVacation', () => {
      test('creates vacation when valid', () => {
        const data = {
          employeeId: 'emp-1',
          startDate: '2023-08-01',
          endDate: '2023-08-05'
        };

        const result = createVacation(data);

        expect(result.success).toBe(true);
        expect(createVacationRequest).toHaveBeenCalled();
        expect(result.request.status).toBe('pending');
      });

      test('fails when validation fails', () => {
        validateVacation.mockReturnValueOnce({ valid: false, errors: ['Error'] });
        const result = createVacation({});

        expect(result.success).toBe(false);
        expect(createVacationRequest).not.toHaveBeenCalled();
      });

      test('fails when overlapping with approved vacation', () => {
        // Overlap with vac-1 (June 1-5)
        const data = {
          employeeId: 'emp-1',
          startDate: '2023-06-03',
          endDate: '2023-06-07'
        };

        const result = createVacation(data);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Überschneidung');
        expect(createVacationRequest).not.toHaveBeenCalled();
      });
    });

    describe('approveVacation', () => {
      test('approves pending vacation', () => {
        const result = approveVacation('vac-2', 'admin');

        expect(result.success).toBe(true);
        expect(approveVacationRequest).toHaveBeenCalledWith('vac-2', 'admin');
      });

      test('fails if vacation not found', () => {
        const result = approveVacation('invalid');
        expect(result.success).toBe(false);
      });

      test('fails if not pending', () => {
        // vac-1 is already approved
        const result = approveVacation('vac-1');
        expect(result.success).toBe(false);
      });
    });

    describe('rejectVacation', () => {
      test('rejects pending vacation', () => {
        const result = rejectVacation('vac-2', 'reason');

        expect(result.success).toBe(true);
        expect(rejectVacationRequest).toHaveBeenCalledWith('vac-2', 'HR_ADMIN', 'reason');
      });

      test('fails if vacation not found', () => {
        const result = rejectVacation('invalid');
        expect(result.success).toBe(false);
      });

      test('fails if not pending', () => {
        const result = rejectVacation('vac-1');
        expect(result.success).toBe(false);
      });
    });

    describe('cancelVacation', () => {
      test('cancels approved vacation', () => {
        const result = cancelVacation('vac-1');

        expect(result.success).toBe(true);
        expect(setHrState).toHaveBeenCalled();
      });

      test('cancels pending vacation', () => {
        const result = cancelVacation('vac-2');

        expect(result.success).toBe(true);
        expect(setHrState).toHaveBeenCalled();
      });

      test('fails if rejected', () => {
        const result = cancelVacation('vac-3');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Calculations', () => {
    describe('checkVacationOverlap', () => {
      test('detects overlap', () => {
        const result = checkVacationOverlap('emp-1', '2023-06-03', '2023-06-07');
        expect(result.hasOverlap).toBe(true);
      });

      test('detects no overlap', () => {
        const result = checkVacationOverlap('emp-1', '2023-08-01', '2023-08-05');
        expect(result.hasOverlap).toBe(false);
      });
    });

    describe('calculateVacationBalance', () => {
      test('calculates balance correctly', () => {
        // vac-1: 5 days approved in 2023
        // vac-2: 8 days pending in 2023
        // vac-3: rejected (ignored)

        const result = calculateVacationBalance('emp-1', 2023, 30);

        expect(result.total).toBe(30);
        expect(result.used).toBe(5);
        expect(result.pending).toBe(8);
        expect(result.remaining).toBe(25); // 30 - 5
        expect(result.availableAfterPending).toBe(17); // 30 - 5 - 8
      });
    });

    describe('getTeamVacationStats', () => {
      test('returns stats for multiple employees', () => {
        const result = getTeamVacationStats(['emp-1', 'emp-2'], 2023);

        expect(result.length).toBe(2);
        expect(result[0].employeeId).toBe('emp-1');
        expect(result[0].balance.used).toBe(5);
      });
    });
  });

  describe('Display Helpers', () => {
    describe('formatVacationForDisplay', () => {
      test('formats vacation object', () => {
        const vac = {
          startDate: '2023-01-01',
          endDate: '2023-01-05',
          requestedAt: '2022-12-01',
          status: 'approved',
          vacationType: 'annual',
          daysRequested: 5
        };

        const result = formatVacationForDisplay(vac);

        expect(result.formattedStartDate).toBeDefined();
        expect(result.statusClass).toBe('status-approved');
        expect(result.duration).toBe('5 Tage');
      });
    });

    describe('getVacationCalendarData', () => {
      test('returns calendar data', () => {
        // June 2023 contains vac-1 (June 1-5)
        const result = getVacationCalendarData(2023, 6);

        expect(result.year).toBe(2023);
        expect(result.month).toBe(6);
        expect(result.totalVacations).toBe(1);
        expect(result.vacationsByDate['2023-06-01']).toBeDefined();
      });
    });

    describe('getUpcomingVacation', () => {
      test('returns upcoming approved vacation', () => {
        // We need to mock Date to make "upcoming" work deterministically
        // Assuming "today" is before June 2023
        jest.useFakeTimers().setSystemTime(new Date('2023-01-01'));

        const result = getUpcomingVacation('emp-1', 365);

        expect(result.length).toBe(1);
        expect(result[0].id).toBe('vac-1');

        jest.useRealTimers();
      });
    });

    describe('getTeamCoverageView', () => {
       test('returns team coverage', () => {
         const result = getTeamCoverageView(['emp-1', 'emp-2'], '2023-06-01', '2023-06-02');

         expect(result.dailyCoverage['2023-06-01'].absentCount).toBe(1); // emp-1 is away
         expect(result.dailyCoverage['2023-06-01'].presentCount).toBe(1); // emp-2 is present
       });
    });
  });
});
