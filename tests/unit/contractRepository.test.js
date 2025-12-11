/**
 * Unit Tests for Contract Repository Module (contractRepository.js)
 * Tests contract CRUD operations and filtering
 */

import {
  getAllContracts,
  getContractById,
  getContractsByContractId,
  getFilteredContracts,
  getPaginatedContracts,
  sortContracts
} from '../../js/contracts/contractRepository.js';
import { getState, setState } from '../../js/state.js';

// Mock state module
jest.mock('../../js/state.js', () => ({
  getState: jest.fn(),
  setState: jest.fn()
}));

// Mock syncService and syncConfig
jest.mock('../../js/contracts/syncService.js', () => ({
  syncToServer: jest.fn()
}));

jest.mock('../../js/contracts/syncConfig.js', () => ({
  isSyncEnabled: jest.fn(() => false),
  loadSyncConfig: jest.fn(() => ({ enabled: false }))
}));

describe('Contract Repository (contractRepository.js)', () => {
  const mockContracts = [
    {
      id: 'uuid-1',
      contractId: '1001',
      contractTitle: 'Test Contract 1',
      status: 'offen',
      location: 'Berlin',
      equipmentId: 'EQ-001',
      plannedStart: '2025-01-15',
      createdAt: '2025-01-01T10:00:00Z'
    },
    {
      id: 'uuid-2',
      contractId: '1002',
      contractTitle: 'Test Contract 2',
      status: 'inbearb',
      location: 'Munich',
      equipmentId: 'EQ-002',
      plannedStart: '2025-02-01',
      createdAt: '2025-01-02T10:00:00Z'
    },
    {
      id: 'uuid-3',
      contractId: '1003',
      contractTitle: 'Test Contract 3',
      status: 'fertig',
      location: 'Berlin',
      equipmentId: 'EQ-003',
      plannedStart: '2025-03-01',
      createdAt: '2025-01-03T10:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getState.mockReturnValue({
      contracts: {
        records: mockContracts,
        filters: {},
        importedFiles: []
      }
    });
  });

  describe('getAllContracts()', () => {
    test('returns all contracts from state', () => {
      const result = getAllContracts();
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockContracts);
    });

    test('returns empty array when no contracts exist', () => {
      getState.mockReturnValue({ contracts: {} });
      const result = getAllContracts();
      expect(result).toEqual([]);
    });

    test('returns empty array when contracts is null', () => {
      getState.mockReturnValue({ contracts: null });
      const result = getAllContracts();
      expect(result).toEqual([]);
    });
  });

  describe('getContractById()', () => {
    test('returns contract when found', () => {
      const result = getContractById('uuid-2');
      expect(result).not.toBeNull();
      expect(result.id).toBe('uuid-2');
      expect(result.contractTitle).toBe('Test Contract 2');
    });

    test('returns null when contract not found', () => {
      const result = getContractById('non-existent-id');
      expect(result).toBeNull();
    });

    test('returns null for empty contracts', () => {
      getState.mockReturnValue({ contracts: { records: [] } });
      const result = getContractById('uuid-1');
      expect(result).toBeNull();
    });
  });

  describe('getContractsByContractId()', () => {
    test('returns contracts matching business contract ID', () => {
      const result = getContractsByContractId('1001');
      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe('1001');
    });

    test('returns empty array when no match found', () => {
      const result = getContractsByContractId('9999');
      expect(result).toEqual([]);
    });

    test('returns multiple contracts with same business ID', () => {
      const contracts = [
        { id: 'uuid-1', contractId: '1001' },
        { id: 'uuid-2', contractId: '1001' },
        { id: 'uuid-3', contractId: '1002' }
      ];
      getState.mockReturnValue({ contracts: { records: contracts } });
      
      const result = getContractsByContractId('1001');
      expect(result).toHaveLength(2);
    });
  });

  describe('getFilteredContracts()', () => {
    test('returns all contracts when no filters applied', () => {
      const result = getFilteredContracts();
      expect(result).toHaveLength(3);
    });

    test('filters by contract ID', () => {
      const result = getFilteredContracts({ contractId: '1001' });
      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe('1001');
    });

    test('filters by partial contract ID', () => {
      const result = getFilteredContracts({ contractId: '100' });
      expect(result).toHaveLength(3);
    });

    test('filters by status', () => {
      const result = getFilteredContracts({ status: 'offen' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('offen');
    });

    test('filters by location (case insensitive)', () => {
      const result = getFilteredContracts({ location: 'berlin' });
      expect(result).toHaveLength(2);
    });

    test('filters by equipment ID (case insensitive)', () => {
      const result = getFilteredContracts({ equipmentId: 'eq-001' });
      expect(result).toHaveLength(1);
    });

    test('filters by date range - from date', () => {
      const result = getFilteredContracts({ 
        dateRange: { from: '2025-02-01' } 
      });
      expect(result).toHaveLength(2);
    });

    test('filters by date range - to date', () => {
      const result = getFilteredContracts({ 
        dateRange: { to: '2025-02-01' } 
      });
      expect(result).toHaveLength(2);
    });

    test('filters by date range - both dates', () => {
      const result = getFilteredContracts({ 
        dateRange: { from: '2025-01-20', to: '2025-02-15' } 
      });
      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe('1002');
    });

    test('filters by search text across multiple fields', () => {
      const result = getFilteredContracts({ searchText: 'Contract 2' });
      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe('1002');
    });

    test('filters by search text in equipment ID', () => {
      const result = getFilteredContracts({ searchText: 'EQ-003' });
      expect(result).toHaveLength(1);
      expect(result[0].contractId).toBe('1003');
    });

    test('handles empty search text', () => {
      const result = getFilteredContracts({ searchText: '   ' });
      expect(result).toHaveLength(3);
    });

    test('combines multiple filters', () => {
      const result = getFilteredContracts({ 
        status: 'offen', 
        location: 'Berlin' 
      });
      expect(result).toHaveLength(1);
    });

    test('uses state filters when no custom filters provided', () => {
      getState.mockReturnValue({
        contracts: {
          records: mockContracts,
          filters: { status: 'fertig' }
        }
      });
      
      const result = getFilteredContracts();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('fertig');
    });
  });

  describe('getPaginatedContracts()', () => {
    test('returns paginated results with default options', () => {
      const result = getPaginatedContracts();
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.page).toBe(1);
      expect(result.total).toBe(3);
    });

    test('respects page size', () => {
      const result = getPaginatedContracts({ pageSize: 2 });
      
      expect(result.data).toHaveLength(2);
      expect(result.totalPages).toBe(2);
    });

    test('returns correct page of data', () => {
      const result = getPaginatedContracts({ page: 2, pageSize: 2 });
      
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(2);
    });

    test('applies filters before pagination', () => {
      const result = getPaginatedContracts({ 
        filters: { location: 'Berlin' },
        pageSize: 10
      });
      
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    test('applies sorting', () => {
      const result = getPaginatedContracts({
        sort: { field: 'contractId', direction: 'asc' }
      });
      
      expect(result.data[0].contractId).toBe('1001');
      expect(result.data[2].contractId).toBe('1003');
    });

    test('handles empty results', () => {
      const result = getPaginatedContracts({
        filters: { status: 'non-existent' }
      });
      
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('sortContracts()', () => {
    test('sorts by string field ascending', () => {
      const result = sortContracts(mockContracts, 'contractId', 'asc');
      
      expect(result[0].contractId).toBe('1001');
      expect(result[2].contractId).toBe('1003');
    });

    test('sorts by string field descending', () => {
      const result = sortContracts(mockContracts, 'contractId', 'desc');
      
      expect(result[0].contractId).toBe('1003');
      expect(result[2].contractId).toBe('1001');
    });

    test('sorts by date field', () => {
      const result = sortContracts(mockContracts, 'plannedStart', 'asc');
      
      expect(result[0].plannedStart).toBe('2025-01-15');
      expect(result[2].plannedStart).toBe('2025-03-01');
    });

    test('sorts by createdAt field', () => {
      const result = sortContracts(mockContracts, 'createdAt', 'desc');
      
      expect(result[0].createdAt).toBe('2025-01-03T10:00:00Z');
    });

    test('handles null/undefined values in sorting', () => {
      const contractsWithNull = [
        { id: '1', name: 'B' },
        { id: '2', name: null },
        { id: '3', name: 'A' }
      ];
      
      // Null values are treated as empty strings for comparison purposes
      // They should sort to the beginning when ascending
      const result = sortContracts(contractsWithNull, 'name', 'asc');
      // The null value should come first (sorted as empty string)
      expect(result[0].name).toBeNull();
      expect(result[1].name).toBe('A');
      expect(result[2].name).toBe('B');
    });

    test('returns empty array for non-array input', () => {
      const result = sortContracts(null, 'field', 'asc');
      expect(result).toEqual([]);
      
      const result2 = sortContracts('not array', 'field', 'asc');
      expect(result2).toEqual([]);
    });

    test('does not mutate original array', () => {
      const original = [...mockContracts];
      sortContracts(mockContracts, 'contractId', 'desc');
      
      expect(mockContracts[0].contractId).toBe(original[0].contractId);
    });

    test('defaults to ascending sort', () => {
      const result = sortContracts(mockContracts, 'contractId');
      
      expect(result[0].contractId).toBe('1001');
    });
  });
});
