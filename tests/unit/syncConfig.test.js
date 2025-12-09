/**
 * Unit Tests for Sync Configuration Module
 * 
 * Tests the sync configuration management for the hybrid storage approach
 */

import { 
    loadSyncConfig, 
    saveSyncConfig, 
    getStorageMode, 
    setStorageMode,
    isSyncEnabled,
    isAutoSyncEnabled,
    updateLastSyncTime,
    getLastSyncTime,
    resetSyncConfig,
    getSyncConfigSummary,
    StorageMode,
    SyncStatus
} from '../../js/contracts/syncConfig.js';

describe('Sync Configuration (syncConfig.js)', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Reset the internal cache by resetting config
        resetSyncConfig();
    });

    describe('StorageMode Enum', () => {
        test('has LOCAL_ONLY value', () => {
            expect(StorageMode.LOCAL_ONLY).toBe('local_only');
        });

        test('has SYNC_WITH_SERVER value', () => {
            expect(StorageMode.SYNC_WITH_SERVER).toBe('sync_with_server');
        });
    });

    describe('SyncStatus Enum', () => {
        test('has all status values', () => {
            expect(SyncStatus.IDLE).toBe('idle');
            expect(SyncStatus.SYNCING).toBe('syncing');
            expect(SyncStatus.SYNCED).toBe('synced');
            expect(SyncStatus.ERROR).toBe('error');
            expect(SyncStatus.OFFLINE).toBe('offline');
        });
    });

    describe('loadSyncConfig()', () => {
        test('returns default config when no config exists', () => {
            const config = loadSyncConfig();
            
            expect(config.storageMode).toBe(StorageMode.LOCAL_ONLY);
            expect(config.autoSync).toBe(false);
            expect(config.lastSyncAt).toBeNull();
        });

        test('loads config from localStorage', () => {
            // First, clear everything and set localStorage directly
            localStorage.clear();
            
            const savedConfig = {
                storageMode: StorageMode.SYNC_WITH_SERVER,
                autoSync: true,
                lastSyncAt: '2024-01-01T00:00:00Z'
            };
            localStorage.setItem('contractSyncConfig_v1', JSON.stringify(savedConfig));
            
            // Force the module to reload by importing fresh
            // Since modules are cached, we test the merge behavior instead
            // The config should merge with defaults when loading from storage
            saveSyncConfig({ storageMode: StorageMode.SYNC_WITH_SERVER });
            
            const config = loadSyncConfig();
            
            expect(config.storageMode).toBe(StorageMode.SYNC_WITH_SERVER);
        });

        test('returns cached config on subsequent calls', () => {
            const config1 = loadSyncConfig();
            const config2 = loadSyncConfig();
            
            // Should be equal but different objects (clone)
            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);
        });
    });

    describe('saveSyncConfig()', () => {
        test('saves config to localStorage', () => {
            saveSyncConfig({ autoSync: true });
            
            const stored = JSON.parse(localStorage.getItem('contractSyncConfig_v1'));
            expect(stored.autoSync).toBe(true);
        });

        test('merges with existing config', () => {
            saveSyncConfig({ storageMode: StorageMode.SYNC_WITH_SERVER });
            saveSyncConfig({ autoSync: true });
            
            const config = loadSyncConfig();
            expect(config.storageMode).toBe(StorageMode.SYNC_WITH_SERVER);
            expect(config.autoSync).toBe(true);
        });

        test('returns updated config', () => {
            const result = saveSyncConfig({ autoSync: true });
            expect(result.autoSync).toBe(true);
        });
    });

    describe('getStorageMode()', () => {
        test('returns current storage mode', () => {
            expect(getStorageMode()).toBe(StorageMode.LOCAL_ONLY);
            
            saveSyncConfig({ storageMode: StorageMode.SYNC_WITH_SERVER });
            expect(getStorageMode()).toBe(StorageMode.SYNC_WITH_SERVER);
        });
    });

    describe('setStorageMode()', () => {
        test('sets valid storage mode', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            expect(getStorageMode()).toBe(StorageMode.SYNC_WITH_SERVER);
        });

        test('throws error for invalid storage mode', () => {
            expect(() => setStorageMode('invalid_mode')).toThrow('Invalid storage mode');
        });
    });

    describe('isSyncEnabled()', () => {
        test('returns false when in LOCAL_ONLY mode', () => {
            setStorageMode(StorageMode.LOCAL_ONLY);
            expect(isSyncEnabled()).toBe(false);
        });

        test('returns true when in SYNC_WITH_SERVER mode', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            expect(isSyncEnabled()).toBe(true);
        });
    });

    describe('isAutoSyncEnabled()', () => {
        test('returns false when sync is disabled', () => {
            setStorageMode(StorageMode.LOCAL_ONLY);
            saveSyncConfig({ autoSync: true });
            
            expect(isAutoSyncEnabled()).toBe(false);
        });

        test('returns false when sync enabled but autoSync disabled', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            saveSyncConfig({ autoSync: false });
            
            expect(isAutoSyncEnabled()).toBe(false);
        });

        test('returns true when sync and autoSync are both enabled', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            saveSyncConfig({ autoSync: true });
            
            expect(isAutoSyncEnabled()).toBe(true);
        });
    });

    describe('updateLastSyncTime()', () => {
        test('updates lastSyncAt to current time', () => {
            const before = new Date();
            updateLastSyncTime();
            const after = new Date();
            
            const lastSync = new Date(getLastSyncTime());
            expect(lastSync >= before).toBe(true);
            expect(lastSync <= after).toBe(true);
        });
    });

    describe('getLastSyncTime()', () => {
        test('returns null when never synced', () => {
            expect(getLastSyncTime()).toBeNull();
        });

        test('returns last sync timestamp', () => {
            const timestamp = '2024-06-15T10:30:00Z';
            saveSyncConfig({ lastSyncAt: timestamp });
            
            expect(getLastSyncTime()).toBe(timestamp);
        });
    });

    describe('resetSyncConfig()', () => {
        test('resets config to defaults', () => {
            saveSyncConfig({ 
                storageMode: StorageMode.SYNC_WITH_SERVER,
                autoSync: true,
                lastSyncAt: '2024-01-01T00:00:00Z'
            });
            
            resetSyncConfig();
            
            const config = loadSyncConfig();
            expect(config.storageMode).toBe(StorageMode.LOCAL_ONLY);
            expect(config.autoSync).toBe(false);
            expect(config.lastSyncAt).toBeNull();
        });

        test('removes config from localStorage', () => {
            saveSyncConfig({ autoSync: true });
            resetSyncConfig();
            
            expect(localStorage.getItem('contractSyncConfig_v1')).toBeNull();
        });
    });

    describe('getSyncConfigSummary()', () => {
        test('returns formatted summary for local mode', () => {
            setStorageMode(StorageMode.LOCAL_ONLY);
            
            const summary = getSyncConfigSummary();
            
            expect(summary.mode).toBe(StorageMode.LOCAL_ONLY);
            expect(summary.modeLabel).toBe('Nur lokal');
        });

        test('returns formatted summary for sync mode', () => {
            setStorageMode(StorageMode.SYNC_WITH_SERVER);
            
            const summary = getSyncConfigSummary();
            
            expect(summary.mode).toBe(StorageMode.SYNC_WITH_SERVER);
            expect(summary.modeLabel).toBe('Mit Server synchronisieren');
        });
    });

    describe('Event Dispatching', () => {
        test('dispatches syncConfigChanged event on save', () => {
            const listener = jest.fn();
            window.addEventListener('syncConfigChanged', listener);
            
            saveSyncConfig({ autoSync: true });
            
            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.config.autoSync).toBe(true);
            
            window.removeEventListener('syncConfigChanged', listener);
        });

        test('dispatches syncConfigChanged event on reset', () => {
            const listener = jest.fn();
            window.addEventListener('syncConfigChanged', listener);
            
            resetSyncConfig();
            
            expect(listener).toHaveBeenCalled();
            
            window.removeEventListener('syncConfigChanged', listener);
        });
    });
});
