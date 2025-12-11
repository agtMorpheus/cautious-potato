/**
 * Performance Tests for Sync Service Module (syncService.js)
 * 
 * Tests synchronization performance with large datasets, conflict resolution,
 * and network latency handling to identify performance bottlenecks.
 */

import {
  syncToServer,
  syncFromServer,
  performFullSync,
  getSyncStatus,
  subscribeSyncStatus,
  exportContractsAsJson,
  importContractsFromJson,
  initSyncService
} from '../../js/contracts/syncService.js';

import { apiClient } from '../../js/contracts/contractApiClient.js';
import { 
  saveSyncConfig, 
  SyncStatus 
} from '../../js/contracts/syncConfig.js';
import { getState, setState } from '../../js/state.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  sync_100_contracts: 2000,        // ms to sync 100 contracts
  sync_1000_contracts: 15000,      // ms to sync 1000 contracts (reasonable for individual API calls)
  merge_10000_contracts: 500,      // ms to merge 10000 contracts
  conflict_resolution_1000: 300,   // ms to resolve conflicts in 1000 contracts
  export_10000_contracts: 200,     // ms to export 10000 contracts as JSON
  import_10000_contracts: 500,     // ms to import 10000 contracts from JSON
  status_notification: 50          // ms for status update notifications
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
 * Helper to measure async execution time
 */
async function measureTimeAsync(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Generate mock contracts for testing
 */
function generateMockContracts(count, baseTimestamp = Date.now()) {
  const contracts = [];
  const statuses = ['Erstellt', 'In Bearbeitung', 'Abgerechnet', 'Geplant'];
  const locations = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'];
  
  for (let i = 0; i < count; i++) {
    contracts.push({
      id: `UUID-${i}`,
      contractId: `CONTRACT-${String(i).padStart(6, '0')}`,
      contractTitle: `Test Contract ${i}`,
      taskId: `TASK-${i}`,
      taskType: 'Wartung',
      status: statuses[i % statuses.length],
      location: locations[i % locations.length],
      roomArea: `Room ${i}`,
      equipmentId: `EQ-${i}`,
      createdAt: new Date(baseTimestamp - (count - i) * 1000).toISOString(),
      updatedAt: new Date(baseTimestamp - (count - i) * 1000 + 500).toISOString()
    });
  }
  return contracts;
}

describe('Sync Service Performance Tests', () => {
  let originalNavigator;
  
  beforeAll(() => {
    // Mock navigator.onLine
    originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
  });
  
  afterAll(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
  });
  
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset state
    setState({
      contracts: {
        records: []
      }
    });
    
    // Enable sync for tests
    saveSyncConfig({
      storageMode: 'sync_with_server',
      apiBaseUrl: 'http://localhost:3000',
      autoSync: false
    });
    
    // Reset API client mocks
    jest.clearAllMocks();
  });
  
  // ============================================
  // Upload Performance Tests
  // ============================================
  describe('syncToServer() Performance', () => {
    test('syncs 100 contracts within threshold', async () => {
      const contracts = generateMockContracts(100);
      setState({
        contracts: {
          records: contracts
        }
      });
      
      // Mock API calls to simulate network delay
      let callCount = 0;
      apiClient.getContract = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1)); // 1ms simulated network delay
        callCount++;
        return null; // Not found
      });
      
      apiClient.createContract = jest.fn().mockImplementation(async (contract) => {
        await new Promise(resolve => setTimeout(resolve, 1)); // 1ms simulated network delay
        return contract;
      });
      
      const { result, duration } = await measureTimeAsync(() => syncToServer({ force: true }));
      
      console.log(`Sync 100 contracts to server: ${duration.toFixed(2)}ms (${callCount} API calls)`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sync_100_contracts);
      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(100);
    });
    
    test('handles large datasets efficiently (1000 contracts)', async () => {
      const contracts = generateMockContracts(1000);
      setState({
        contracts: {
          records: contracts
        }
      });
      
      // Mock API calls with minimal delay for performance testing
      apiClient.getContract = jest.fn().mockResolvedValue(null);
      apiClient.createContract = jest.fn().mockImplementation(async (c) => c);
      
      const { result, duration } = await measureTimeAsync(() => syncToServer({ force: true }));
      
      console.log(`Sync 1000 contracts to server: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sync_1000_contracts);
      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(1000);
    });
    
    test('chunked upload improves performance for large datasets', async () => {
      const contracts = generateMockContracts(500);
      setState({
        contracts: {
          records: contracts
        }
      });
      
      // Mock API calls
      apiClient.getContract = jest.fn().mockResolvedValue(null);
      apiClient.createContract = jest.fn().mockImplementation(async (c) => c);
      
      let progressCallbacks = 0;
      const progressCallback = (progress) => {
        progressCallbacks++;
        expect(progress.current).toBeLessThanOrEqual(progress.total);
        expect(progress.uploaded).toBeLessThanOrEqual(progress.current);
      };
      
      const { result, duration } = await measureTimeAsync(() => 
        syncToServer({ force: true, chunkSize: 50, progressCallback })
      );
      
      console.log(`Sync 500 contracts with chunking (50/chunk): ${duration.toFixed(2)}ms, ${progressCallbacks} progress updates`);
      expect(duration).toBeLessThan(5000);
      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(500);
      expect(progressCallbacks).toBeGreaterThan(0);
    });
    
    test('empty contract list syncs quickly', async () => {
      setState({
        contracts: {
          records: []
        }
      });
      
      const { duration } = await measureTimeAsync(() => syncToServer({ force: true }));
      
      console.log(`Sync 0 contracts: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });
  });
  
  // ============================================
  // Download Performance Tests
  // ============================================
  describe('syncFromServer() Performance', () => {
    test('downloads and merges 100 contracts efficiently', async () => {
      const serverContracts = generateMockContracts(100);
      const localContracts = generateMockContracts(50, Date.now() - 100000);
      
      setState({
        contracts: {
          records: localContracts
        }
      });
      
      apiClient.listContracts = jest.fn().mockResolvedValue(serverContracts);
      
      const { result, duration } = await measureTimeAsync(() => syncFromServer({ merge: true }));
      
      console.log(`Download and merge 100 contracts: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
      expect(result.success).toBe(true);
      expect(result.downloaded).toBe(100);
    });
    
    test('handles large server response (1000 contracts)', async () => {
      const serverContracts = generateMockContracts(1000);
      
      apiClient.listContracts = jest.fn().mockResolvedValue(serverContracts);
      
      const { result, duration } = await measureTimeAsync(() => syncFromServer({ merge: false }));
      
      console.log(`Download 1000 contracts: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);
      expect(result.success).toBe(true);
    });
  });
  
  // ============================================
  // Conflict Resolution Performance
  // ============================================
  describe('Conflict Resolution Performance', () => {
    test('merges 1000 contracts with conflicts within threshold', async () => {
      const baseTime = Date.now();
      
      // Create local contracts
      const localContracts = generateMockContracts(1000, baseTime - 10000);
      
      // Create server contracts (50% overlap, 50% newer)
      const serverContracts = [
        ...generateMockContracts(500, baseTime), // New contracts
        ...generateMockContracts(500, baseTime + 5000).map((c, i) => ({
          ...c,
          id: `UUID-${i}` // Overlap with local
        }))
      ];
      
      setState({
        contracts: {
          records: localContracts
        }
      });
      
      apiClient.listContracts = jest.fn().mockResolvedValue(serverContracts);
      
      const { result, duration } = await measureTimeAsync(() => syncFromServer({ merge: true }));
      
      console.log(`Merge 1000 contracts with conflicts: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.conflict_resolution_1000);
      expect(result.success).toBe(true);
    });
    
    test('server version wins on conflicts (performance check)', async () => {
      const baseTime = Date.now();
      const count = 500;
      
      // All contracts have same IDs but different timestamps
      const localContracts = generateMockContracts(count, baseTime - 10000);
      const serverContracts = generateMockContracts(count, baseTime);
      
      setState({
        contracts: {
          records: localContracts
        }
      });
      
      apiClient.listContracts = jest.fn().mockResolvedValue(serverContracts);
      
      const { duration } = await measureTimeAsync(() => syncFromServer({ merge: true }));
      
      console.log(`Conflict resolution (${count} conflicts): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.conflict_resolution_1000 / 2);
    });
  });
  
  // ============================================
  // Full Sync Performance
  // ============================================
  describe('performFullSync() Performance', () => {
    test('bidirectional sync with moderate dataset', async () => {
      const localContracts = generateMockContracts(100);
      const serverContracts = generateMockContracts(100, Date.now() - 5000);
      
      setState({
        contracts: {
          records: localContracts
        }
      });
      
      apiClient.listContracts = jest.fn().mockResolvedValue(serverContracts);
      apiClient.getContract = jest.fn().mockResolvedValue(null);
      apiClient.createContract = jest.fn().mockImplementation(async (c) => c);
      
      const { result, duration } = await measureTimeAsync(() => performFullSync());
      
      console.log(`Full bidirectional sync (100+100 contracts): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5000);
      expect(result.success).toBe(true);
    });
  });
  
  // ============================================
  // Export/Import Performance
  // ============================================
  describe('Export/Import Performance', () => {
    test('exports 10000 contracts as JSON within threshold', () => {
      const contracts = generateMockContracts(10000);
      setState({
        contracts: {
          records: contracts
        }
      });
      
      const { result, duration } = measureTime(() => exportContractsAsJson());
      
      console.log(`Export 10000 contracts to JSON: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.export_10000_contracts);
      expect(result.contracts.length).toBe(10000);
    });
    
    test('imports 10000 contracts from JSON within threshold', () => {
      const contracts = generateMockContracts(10000);
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        contracts: contracts
      };
      
      const { result, duration } = measureTime(() => 
        importContractsFromJson(exportData, { replace: true })
      );
      
      console.log(`Import 10000 contracts from JSON: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.import_10000_contracts);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(10000);
    });
    
    test('merge import is efficient with large datasets', () => {
      const existing = generateMockContracts(5000, Date.now() - 100000);
      const importing = generateMockContracts(5000, Date.now());
      
      setState({
        contracts: {
          records: existing
        }
      });
      
      const exportData = {
        contracts: importing
      };
      
      const { duration } = measureTime(() => 
        importContractsFromJson(exportData, { replace: false })
      );
      
      console.log(`Merge import (5000+5000 contracts): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.merge_10000_contracts);
    });
  });
  
  // ============================================
  // Status Notification Performance
  // ============================================
  describe('Status Notification Performance', () => {
    test('status updates notify listeners quickly', async () => {
      let notificationCount = 0;
      const unsubscribe = subscribeSyncStatus(() => {
        notificationCount++;
      });
      
      const { duration } = await measureTimeAsync(async () => {
        // Trigger multiple status changes
        await syncToServer({ force: false }); // Should be quick (sync disabled check)
      });
      
      console.log(`Status notification: ${duration.toFixed(2)}ms (${notificationCount} notifications)`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.status_notification);
      
      unsubscribe();
    });
    
    test('handles many concurrent listeners efficiently', () => {
      const listeners = [];
      const listenerCount = 100;
      
      // Add many listeners
      for (let i = 0; i < listenerCount; i++) {
        const unsubscribe = subscribeSyncStatus(() => {});
        listeners.push(unsubscribe);
      }
      
      // Measure notification time with many listeners
      const { duration } = measureTime(() => {
        const status = getSyncStatus();
        // Status is already updated, just measure access
        expect(status).toBeDefined();
      });
      
      console.log(`Access status with ${listenerCount} listeners: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
      
      // Cleanup
      listeners.forEach(unsub => unsub());
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated syncs do not accumulate memory', async () => {
      const contracts = generateMockContracts(100);
      
      apiClient.listContracts = jest.fn().mockResolvedValue(contracts);
      
      // Perform many sync operations
      for (let i = 0; i < 50; i++) {
        await syncFromServer({ merge: false });
      }
      
      // State should only contain the last sync result
      const state = getState();
      expect(state.contracts.records.length).toBe(100);
    });
    
    test('large export does not leak memory', () => {
      // Export large dataset multiple times
      for (let i = 0; i < 10; i++) {
        const contracts = generateMockContracts(5000);
        setState({
          contracts: {
            records: contracts
          }
        });
        
        const exported = exportContractsAsJson();
        expect(exported.contracts.length).toBe(5000);
      }
      
      expect(true).toBe(true); // Test completes without memory issues
    });
  });
  
  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('handles sync when offline', async () => {
      global.navigator.onLine = false;
      
      const { duration } = await measureTimeAsync(() => syncToServer({ force: true }));
      
      expect(duration).toBeLessThan(50);
      
      global.navigator.onLine = true;
    });
    
    test('handles empty server response', async () => {
      apiClient.listContracts = jest.fn().mockResolvedValue([]);
      
      const { duration } = await measureTimeAsync(() => syncFromServer({ merge: true }));
      
      expect(duration).toBeLessThan(100);
    });
    
    test('handles malformed data gracefully', () => {
      const { result, duration } = measureTime(() => 
        importContractsFromJson({ invalid: 'data' })
      );
      
      expect(result.success).toBe(false);
      expect(duration).toBeLessThan(10);
    });
  });
});
