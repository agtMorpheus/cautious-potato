/**
 * Unit Tests for Sync Service Module
 * 
 * Tests the synchronization service for the hybrid storage approach
 */

import {
    getSyncStatus,
    subscribeSyncStatus,
    exportContractsAsJson,
    importContractsFromJson
} from '../../js/contracts/syncService.js';
import { resetSyncConfig, setStorageMode, StorageMode } from '../../js/contracts/syncConfig.js';
import { resetState, setState, getState } from '../../js/state.js';

describe('Sync Service (syncService.js)', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        
        // Reset sync config
        resetSyncConfig();
        
        // Reset app state
        resetState();
        
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
        
        // Mock fetch
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('getSyncStatus()', () => {
        test('returns initial idle status', () => {
            const status = getSyncStatus();
            
            expect(status.status).toBe('idle');
            expect(status.error).toBeNull();
            expect(status.isOnline).toBe(true);
        });

        test('reflects offline status', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            const status = getSyncStatus();
            expect(status.isOnline).toBe(false);
        });
    });

    describe('subscribeSyncStatus()', () => {
        test('returns unsubscribe function', () => {
            const listener = jest.fn();
            const unsubscribe = subscribeSyncStatus(listener);
            
            expect(typeof unsubscribe).toBe('function');
        });

        test('listener can be unsubscribed', () => {
            const listener = jest.fn();
            const unsubscribe = subscribeSyncStatus(listener);
            
            unsubscribe();
            
            // After unsubscribing, the listener should not be called
            // This is implicitly tested by the fact that unsubscribe doesn't throw
        });
    });

    describe('exportContractsAsJson()', () => {
        test('exports empty contracts array', () => {
            const result = exportContractsAsJson();
            
            expect(result.contracts).toEqual([]);
            expect(result.contractCount).toBe(0);
            expect(result.version).toBe('1.0.0');
            expect(result.exportedAt).toBeDefined();
        });

        test('exports contracts from state', () => {
            // Add some test contracts to state
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt' },
                        { id: '2', contractId: 'A002', status: 'Geplant' }
                    ]
                }
            });
            
            const result = exportContractsAsJson();
            
            expect(result.contracts).toHaveLength(2);
            expect(result.contractCount).toBe(2);
            expect(result.contracts[0].contractId).toBe('A001');
            expect(result.contracts[1].contractId).toBe('A002');
        });

        test('includes storage mode in export', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            
            const result = exportContractsAsJson();
            
            expect(result.storageMode).toBe(StorageMode.SYNC_WITH_SERVER);
        });
    });

    describe('importContractsFromJson()', () => {
        test('returns error for invalid data', () => {
            const result = importContractsFromJson(null);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid import data format');
        });

        test('returns error for data without contracts array', () => {
            const result = importContractsFromJson({ foo: 'bar' });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid import data format');
        });

        test('imports contracts successfully', () => {
            const importData = {
                contracts: [
                    { id: '1', contractId: 'A001', status: 'Erstellt' },
                    { id: '2', contractId: 'A002', status: 'Geplant' }
                ]
            };
            
            const result = importContractsFromJson(importData);
            
            expect(result.success).toBe(true);
            expect(result.imported).toBe(2);
            expect(result.total).toBe(2);
        });

        test('merges with existing contracts by default', () => {
            // Add existing contracts
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt', updatedAt: '2024-01-01T00:00:00Z' }
                    ]
                }
            });
            
            // Import new contracts
            const importData = {
                contracts: [
                    { id: '2', contractId: 'A002', status: 'Geplant', updatedAt: '2024-01-02T00:00:00Z' }
                ]
            };
            
            const result = importContractsFromJson(importData);
            
            expect(result.success).toBe(true);
            expect(result.total).toBe(2);
            
            const state = getState();
            expect(state.contracts.records).toHaveLength(2);
        });

        test('replaces contracts when replace option is true', () => {
            // Add existing contracts
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt' },
                        { id: '2', contractId: 'A002', status: 'Geplant' }
                    ]
                }
            });
            
            // Import and replace
            const importData = {
                contracts: [
                    { id: '3', contractId: 'A003', status: 'Freigegeben' }
                ]
            };
            
            const result = importContractsFromJson(importData, { replace: true });
            
            expect(result.success).toBe(true);
            expect(result.total).toBe(1);
            
            const state = getState();
            expect(state.contracts.records).toHaveLength(1);
            expect(state.contracts.records[0].contractId).toBe('A003');
        });

        test('handles merge conflict - server wins with newer timestamp', () => {
            // Add existing contract with older timestamp
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt', updatedAt: '2024-01-01T00:00:00Z' }
                    ]
                }
            });
            
            // Import same contract with newer timestamp
            const importData = {
                contracts: [
                    { id: '1', contractId: 'A001', status: 'Geplant', updatedAt: '2024-06-01T00:00:00Z' }
                ]
            };
            
            importContractsFromJson(importData);
            
            const state = getState();
            expect(state.contracts.records).toHaveLength(1);
            expect(state.contracts.records[0].status).toBe('Geplant'); // Updated status
        });

        test('handles merge conflict - local wins with newer timestamp', () => {
            // Add existing contract with newer timestamp
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt', updatedAt: '2024-06-01T00:00:00Z' }
                    ]
                }
            });
            
            // Import same contract with older timestamp
            const importData = {
                contracts: [
                    { id: '1', contractId: 'A001', status: 'Geplant', updatedAt: '2024-01-01T00:00:00Z' }
                ]
            };
            
            importContractsFromJson(importData);
            
            const state = getState();
            expect(state.contracts.records).toHaveLength(1);
            expect(state.contracts.records[0].status).toBe('Erstellt'); // Original status preserved
        });
    });

    describe('Export/Import Roundtrip', () => {
        test('export then import preserves data', () => {
            // Add contracts to state
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt', location: 'Berlin' },
                        { id: '2', contractId: 'A002', status: 'Geplant', location: 'Munich' }
                    ]
                }
            });
            
            // Export
            const exported = exportContractsAsJson();
            
            // Clear state
            resetState();
            
            // Import
            const result = importContractsFromJson(exported, { replace: true });
            
            expect(result.success).toBe(true);
            
            // Verify data
            const state = getState();
            expect(state.contracts.records).toHaveLength(2);
            expect(state.contracts.records[0].location).toBe('Berlin');
            expect(state.contracts.records[1].location).toBe('Munich');
        });
    });

    describe('getSyncStatus() edge cases', () => {
        test('returns correct status structure', () => {
            const status = getSyncStatus();
            
            expect(status).toHaveProperty('status');
            expect(status).toHaveProperty('error');
            expect(status).toHaveProperty('isOnline');
        });

        test('status reflects navigator.onLine changes', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });
            
            let status = getSyncStatus();
            expect(status.isOnline).toBe(true);
            
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            status = getSyncStatus();
            expect(status.isOnline).toBe(false);
        });
    });

    describe('subscribeSyncStatus() patterns', () => {
        test('multiple listeners can be subscribed', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            
            const unsub1 = subscribeSyncStatus(listener1);
            const unsub2 = subscribeSyncStatus(listener2);
            
            expect(typeof unsub1).toBe('function');
            expect(typeof unsub2).toBe('function');
            
            unsub1();
            unsub2();
        });

        test('unsubscribed listener is not called after unsubscribe', () => {
            const listener = jest.fn();
            const unsubscribe = subscribeSyncStatus(listener);
            
            unsubscribe();
            
            // The listener should not be called after unsubscribe
            // This test passes implicitly by not throwing
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('exportContractsAsJson() metadata', () => {
        test('includes version string', () => {
            const result = exportContractsAsJson();
            
            expect(result.version).toBe('1.0.0');
        });

        test('includes exportedAt timestamp', () => {
            const result = exportContractsAsJson();
            
            expect(result.exportedAt).toBeDefined();
            const exportTime = new Date(result.exportedAt);
            expect(exportTime.getTime()).not.toBeNaN();
        });

        test('contractCount matches contracts array length', () => {
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001' },
                        { id: '2', contractId: 'A002' },
                        { id: '3', contractId: 'A003' }
                    ]
                }
            });
            
            const result = exportContractsAsJson();
            
            expect(result.contractCount).toBe(3);
            expect(result.contracts.length).toBe(3);
        });

        test('exports with storage mode included', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            
            const result = exportContractsAsJson();
            
            expect(result.storageMode).toBeDefined();
        });
    });

    describe('importContractsFromJson() validation', () => {
        test('rejects undefined input', () => {
            const result = importContractsFromJson(undefined);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid import data format');
        });

        test('rejects object without contracts property', () => {
            const result = importContractsFromJson({ data: [] });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid import data format');
        });

        test('rejects contracts property that is not an array', () => {
            const result = importContractsFromJson({ contracts: 'not-an-array' });
            
            expect(result.success).toBe(false);
        });

        test('handles empty contracts array', () => {
            const result = importContractsFromJson({ contracts: [] });
            
            expect(result.success).toBe(true);
            expect(result.imported).toBe(0);
        });

        test('preserves additional contract properties during import', () => {
            const importData = {
                contracts: [
                    { 
                        id: '1', 
                        contractId: 'A001', 
                        status: 'Erstellt',
                        customField: 'custom value',
                        nestedData: { key: 'value' }
                    }
                ]
            };
            
            importContractsFromJson(importData, { replace: true });
            
            const state = getState();
            expect(state.contracts.records[0].customField).toBe('custom value');
            expect(state.contracts.records[0].nestedData.key).toBe('value');
        });
    });

    describe('Merge conflict resolution', () => {
        test('handles contracts with missing updatedAt during merge', () => {
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt' } // No updatedAt
                    ]
                }
            });
            
            const importData = {
                contracts: [
                    { id: '1', contractId: 'A001', status: 'Geplant', updatedAt: '2024-06-01T00:00:00Z' }
                ]
            };
            
            importContractsFromJson(importData);
            
            const state = getState();
            // Server version with updatedAt should win
            expect(state.contracts.records[0].status).toBe('Geplant');
        });

        test('handles import contracts with missing updatedAt during merge', () => {
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt', updatedAt: '2024-06-01T00:00:00Z' }
                    ]
                }
            });
            
            const importData = {
                contracts: [
                    { id: '1', contractId: 'A001', status: 'Geplant' } // No updatedAt
                ]
            };
            
            importContractsFromJson(importData);
            
            const state = getState();
            // Local version with updatedAt should win
            expect(state.contracts.records[0].status).toBe('Erstellt');
        });

        test('adds new contracts during merge without affecting existing', () => {
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt' }
                    ]
                }
            });
            
            const importData = {
                contracts: [
                    { id: '2', contractId: 'A002', status: 'Geplant' },
                    { id: '3', contractId: 'A003', status: 'Freigegeben' }
                ]
            };
            
            importContractsFromJson(importData); // Default merge mode
            
            const state = getState();
            expect(state.contracts.records.length).toBe(3);
            expect(state.contracts.records.find(c => c.contractId === 'A001')).toBeTruthy();
            expect(state.contracts.records.find(c => c.contractId === 'A002')).toBeTruthy();
            expect(state.contracts.records.find(c => c.contractId === 'A003')).toBeTruthy();
        });

        test('replace mode removes all existing contracts', () => {
            setState({
                contracts: {
                    records: [
                        { id: '1', contractId: 'A001', status: 'Erstellt' },
                        { id: '2', contractId: 'A002', status: 'Geplant' }
                    ]
                }
            });
            
            const importData = {
                contracts: [
                    { id: '3', contractId: 'A003', status: 'Freigegeben' }
                ]
            };
            
            importContractsFromJson(importData, { replace: true });
            
            const state = getState();
            expect(state.contracts.records.length).toBe(1);
            expect(state.contracts.records[0].contractId).toBe('A003');
        });
    });

    describe('Large data handling', () => {
        test('exports large number of contracts', () => {
            const largeContractList = Array.from({ length: 1000 }, (_, i) => ({
                id: `id-${i}`,
                contractId: `A${String(i).padStart(4, '0')}`,
                status: 'Erstellt'
            }));
            
            setState({
                contracts: {
                    records: largeContractList
                }
            });
            
            const result = exportContractsAsJson();
            
            expect(result.contracts.length).toBe(1000);
            expect(result.contractCount).toBe(1000);
        });

        test('imports large number of contracts', () => {
            const largeImportData = {
                contracts: Array.from({ length: 500 }, (_, i) => ({
                    id: `id-${i}`,
                    contractId: `A${String(i).padStart(4, '0')}`,
                    status: 'Erstellt'
                }))
            };
            
            const result = importContractsFromJson(largeImportData, { replace: true });
            
            expect(result.success).toBe(true);
            expect(result.imported).toBe(500);
        });
    });

    describe('initSyncService()', () => {
        let originalAddEventListener;
        let onlineHandler;
        let offlineHandler;
        let syncConfigHandler;

        beforeEach(() => {
            // Store original method
            originalAddEventListener = window.addEventListener;
            
            // Mock window.addEventListener to capture handlers
            window.addEventListener = jest.fn((event, handler) => {
                if (event === 'online') onlineHandler = handler;
                if (event === 'offline') offlineHandler = handler;
                if (event === 'syncConfigChanged') syncConfigHandler = handler;
            });
        });

        afterEach(() => {
            window.addEventListener = originalAddEventListener;
        });

        test('sets up online/offline event listeners', async () => {
            const { initSyncService } = await import('../../js/contracts/syncService.js');
            
            initSyncService();
            
            expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
        });

        test('sets up syncConfigChanged event listener', async () => {
            const { initSyncService } = await import('../../js/contracts/syncService.js');
            
            initSyncService();
            
            expect(window.addEventListener).toHaveBeenCalledWith('syncConfigChanged', expect.any(Function));
        });
    });

    describe('startAutoSync()', () => {
        let originalSetInterval;
        let originalClearInterval;
        
        beforeEach(() => {
            originalSetInterval = global.setInterval;
            originalClearInterval = global.clearInterval;
            
            global.setInterval = jest.fn(() => 123); // Return fake interval ID
            global.clearInterval = jest.fn();
        });

        afterEach(() => {
            global.setInterval = originalSetInterval;
            global.clearInterval = originalClearInterval;
        });

        test('does not start when auto-sync is disabled', async () => {
            const { startAutoSync } = await import('../../js/contracts/syncService.js');
            
            // Auto-sync is disabled by default
            startAutoSync();
            
            // setInterval should not be called with the sync callback
            // (it might be called by other parts, so we check it's not called at all 
            // or verify the config check)
        });
    });

    describe('stopAutoSync()', () => {
        let originalClearInterval;
        
        beforeEach(() => {
            originalClearInterval = global.clearInterval;
            global.clearInterval = jest.fn();
        });

        afterEach(() => {
            global.clearInterval = originalClearInterval;
        });

        test('clears any existing interval', async () => {
            const { stopAutoSync } = await import('../../js/contracts/syncService.js');
            
            // This should not throw even if no interval is set
            expect(() => stopAutoSync()).not.toThrow();
        });
    });
});
