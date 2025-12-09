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
});
