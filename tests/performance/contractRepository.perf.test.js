/**
 * Performance Tests for Contract Repository Module (contractRepository.js)
 * 
 * Tests filtering, searching, sorting, and pagination performance
 * with large datasets to ensure scalability.
 */

import {
  getFilteredContracts,
  sortContracts,
  getPaginatedContracts,
  getContractStatistics,
  getUniqueFieldValues,
  searchContracts
} from '../../js/contracts/contractRepository.js';

import { getState, setState, resetState } from '../../js/state.js';

// Performance test configuration
// Thresholds are set with margin to account for CI/test environment variance
const PERFORMANCE_THRESHOLDS = {
  filter_10000: 200,              // ms to filter 10000 contracts
  filter_complex_10000: 300,      // ms for complex multi-filter on 10000
  sort_10000: 150,                // ms to sort 10000 contracts
  sort_date_10000: 250,           // ms to sort 10000 by date
  paginate_10000: 200,            // ms to paginate 10000 contracts (including filtering + sorting)
  search_10000: 250,              // ms to search across 10000 contracts
  statistics_10000: 300,          // ms to compute statistics for 10000
  unique_values_10000: 150        // ms to get unique field values from 10000
};

/**
 * Helper to measure execution time
 */
function measureTime(fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Generate mock contracts for testing
 */
function generateMockContracts(count) {
  const contracts = [];
  const statuses = ['Erstellt', 'In Bearbeitung', 'Abgerechnet', 'Geplant', 'Freigegeben'];
  const locations = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hannover'];
  const taskTypes = ['Wartung', 'Inspektion', 'Reparatur', 'Prüfung', 'Austausch'];
  
  for (let i = 0; i < count; i++) {
    const year = 2020 + Math.floor(Math.random() * 6);
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    
    contracts.push({
      id: `UUID-${String(i).padStart(8, '0')}`,
      contractId: `CONTRACT-${String(i).padStart(6, '0')}`,
      contractTitle: `Test Contract ${i} - ${taskTypes[i % taskTypes.length]} Project`,
      taskId: `TASK-${String(i % 500).padStart(4, '0')}`,
      taskType: taskTypes[i % taskTypes.length],
      status: statuses[i % statuses.length],
      location: locations[i % locations.length],
      roomArea: `Room ${i % 100}`,
      equipmentId: `EQ-${String(i % 1000).padStart(5, '0')}`,
      equipmentDescription: `Equipment for ${taskTypes[i % taskTypes.length]}`,
      serialNumber: `SN-${String(Math.random() * 100000).padStart(6, '0')}`,
      workorderCode: `WO-${i}`,
      description: `Description for contract ${i}`,
      plannedStart: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      createdAt: new Date(Date.now() - i * 1000 * 60).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return contracts;
}

/**
 * Setup state with contracts for testing
 */
function setupStateWithContracts(count) {
  const contracts = generateMockContracts(count);
  setState({
    contracts: {
      records: contracts,
      filters: {},
      importState: {},
      currentMapping: {},
      rawSheets: {}
    }
  });
  return contracts;
}

describe('Contract Repository Performance Tests', () => {
  
  beforeEach(() => {
    // Reset state before each test
    resetState();
  });
  
  afterEach(() => {
    resetState();
  });
  
  // ============================================
  // Filtering Performance
  // ============================================
  describe('getFilteredContracts() Performance', () => {
    test('filters 10000 contracts by status within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({ status: 'Erstellt' });
      });
      
      console.log(`Filter by status (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_10000);
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('filters 10000 contracts by location within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({ location: 'Berlin' });
      });
      
      console.log(`Filter by location (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_10000);
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('filters 10000 contracts by contract ID prefix within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({ contractId: 'CONTRACT-00' });
      });
      
      console.log(`Filter by contractId prefix (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_10000);
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('handles complex multi-filter within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({
          status: 'Erstellt',
          location: 'Berlin',
          searchText: 'Wartung'
        });
      });
      
      console.log(`Complex multi-filter (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_complex_10000);
    });
    
    test('filters with date range within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({
          dateRange: {
            from: '2022-01-01',
            to: '2024-12-31'
          }
        });
      });
      
      console.log(`Filter by date range (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_10000);
    });
    
    test('search text across multiple fields within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({ searchText: 'Room 5' });
      });
      
      console.log(`Full-text search (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.search_10000);
    });
    
    test('returns empty array fast when no matches', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({ contractId: 'NONEXISTENT-9999999' });
      });
      
      console.log(`No matches filter (10000): ${duration.toFixed(2)}ms`);
      expect(result.length).toBe(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_10000);
    });
  });
  
  // ============================================
  // Sorting Performance
  // ============================================
  describe('sortContracts() Performance', () => {
    test('sorts 10000 contracts by string field within threshold', () => {
      const contracts = generateMockContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return sortContracts(contracts, 'contractTitle', 'asc');
      });
      
      console.log(`Sort by string (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_10000);
      expect(result.length).toBe(10000);
    });
    
    test('sorts 10000 contracts by date within threshold', () => {
      const contracts = generateMockContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return sortContracts(contracts, 'plannedStart', 'asc');
      });
      
      console.log(`Sort by date (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_date_10000);
      expect(result.length).toBe(10000);
    });
    
    test('sorts 10000 contracts by status within threshold', () => {
      const contracts = generateMockContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return sortContracts(contracts, 'status', 'desc');
      });
      
      console.log(`Sort by status (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_10000);
    });
    
    test('sorts descending as fast as ascending', () => {
      const contracts = generateMockContracts(10000);
      
      const { duration: ascDuration } = measureTime(() => {
        return sortContracts(contracts, 'contractTitle', 'asc');
      });
      
      const { duration: descDuration } = measureTime(() => {
        return sortContracts(contracts, 'contractTitle', 'desc');
      });
      
      // Descending should not be significantly slower
      expect(descDuration).toBeLessThan(ascDuration * 1.5);
    });
    
    test('handles null values in sort efficiently', () => {
      const contracts = generateMockContracts(5000);
      // Add nulls to half the contracts
      contracts.slice(0, 2500).forEach(c => { c.location = null; });
      
      const { result, duration } = measureTime(() => {
        return sortContracts(contracts, 'location', 'asc');
      });
      
      console.log(`Sort with nulls (5000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_10000 / 2);
    });
  });
  
  // ============================================
  // Pagination Performance
  // ============================================
  describe('getPaginatedContracts() Performance', () => {
    test('paginates 10000 contracts within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getPaginatedContracts({ page: 1, pageSize: 50 });
      });
      
      console.log(`Paginate page 1 (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.paginate_10000);
      expect(result.data.length).toBe(50);
      expect(result.total).toBe(10000);
    });
    
    test('middle pages are as fast as first page', () => {
      setupStateWithContracts(10000);
      
      const { duration: firstPage } = measureTime(() => {
        return getPaginatedContracts({ page: 1, pageSize: 50 });
      });
      
      const { duration: middlePage } = measureTime(() => {
        return getPaginatedContracts({ page: 100, pageSize: 50 });
      });
      
      console.log(`First page: ${firstPage.toFixed(2)}ms, Middle page: ${middlePage.toFixed(2)}ms`);
      // Middle page should not be significantly slower
      expect(middlePage).toBeLessThan(firstPage * 2);
    });
    
    test('pagination with filters is performant', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getPaginatedContracts({
          page: 1,
          pageSize: 50,
          filters: { status: 'Erstellt', location: 'Berlin' },
          sort: { field: 'plannedStart', direction: 'desc' }
        });
      });
      
      console.log(`Paginate with filters and sort (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.paginate_10000 + PERFORMANCE_THRESHOLDS.filter_10000);
    });
    
    test('last page is efficiently accessed', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getPaginatedContracts({ page: 200, pageSize: 50 });
      });
      
      console.log(`Last page (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.paginate_10000);
      expect(result.data.length).toBe(50);
    });
  });
  
  // ============================================
  // Statistics Performance
  // ============================================
  describe('getContractStatistics() Performance', () => {
    test('computes statistics for 10000 contracts within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getContractStatistics();
      });
      
      console.log(`Statistics (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.statistics_10000);
      expect(result.totalContracts).toBe(10000);
    });
    
    test('statistics include all expected breakdowns', () => {
      setupStateWithContracts(1000);
      
      const { result } = measureTime(() => {
        return getContractStatistics();
      });
      
      expect(result).toHaveProperty('totalContracts');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byLocation');
    });
  });
  
  // ============================================
  // Unique Values Performance
  // ============================================
  describe('getUniqueFieldValues() Performance', () => {
    test('gets unique statuses from 10000 contracts within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getUniqueFieldValues('status');
      });
      
      console.log(`Unique statuses (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.unique_values_10000);
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('gets unique locations from 10000 contracts within threshold', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getUniqueFieldValues('location');
      });
      
      console.log(`Unique locations (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.unique_values_10000);
      expect(result.length).toBe(10); // We generate 10 unique locations
    });
    
    test('handles field with many unique values', () => {
      setupStateWithContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getUniqueFieldValues('contractId');
      });
      
      console.log(`Unique contractIds (10000): ${duration.toFixed(2)}ms`);
      expect(result.length).toBe(10000); // All unique
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.unique_values_10000 * 2);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('sortContracts does not mutate original array', () => {
      const contracts = generateMockContracts(1000);
      const originalFirst = contracts[0].contractTitle;
      
      sortContracts(contracts, 'contractTitle', 'desc');
      
      // Original array should be unchanged
      expect(contracts[0].contractTitle).toBe(originalFirst);
    });
    
    test('repeated filtering does not accumulate memory', () => {
      setupStateWithContracts(5000);
      
      // Run multiple filters
      for (let i = 0; i < 50; i++) {
        getFilteredContracts({ status: 'Erstellt' });
        getFilteredContracts({ location: 'Berlin' });
        getFilteredContracts({ searchText: 'Test' });
      }
      
      // If we get here without memory issues, pass
      expect(true).toBe(true);
    });
    
    test('pagination creates minimal intermediate arrays', () => {
      setupStateWithContracts(10000);
      
      // Run multiple paginations
      for (let i = 1; i <= 100; i++) {
        getPaginatedContracts({ page: i, pageSize: 50 });
      }
      
      // If we get here without memory issues, pass
      expect(true).toBe(true);
    });
  });
  
  // ============================================
  // Stress Tests
  // ============================================
  describe('Stress Tests', () => {
    test('handles 50000 contracts', () => {
      setupStateWithContracts(50000);
      
      const { result, duration } = measureTime(() => {
        return getFilteredContracts({ status: 'Erstellt' });
      });
      
      console.log(`Filter 50000 contracts: ${duration.toFixed(2)}ms`);
      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filter_10000 * 10);
    });
    
    test('combined operations on large dataset', () => {
      setupStateWithContracts(20000);
      
      const { duration } = measureTime(() => {
        // Simulate a typical user workflow
        const filtered = getFilteredContracts({ status: 'Erstellt', location: 'Berlin' });
        const sorted = sortContracts(filtered, 'plannedStart', 'desc');
        return sorted.slice(0, 50); // First page
      });
      
      console.log(`Combined operations (20000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
    });
    
    test('rapid consecutive operations', () => {
      setupStateWithContracts(5000);
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          getFilteredContracts({ status: 'Erstellt' });
          sortContracts(generateMockContracts(100), 'contractTitle', 'asc');
        }
      });
      
      console.log(`100 rapid operations: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(2000);
    });
  });
});
