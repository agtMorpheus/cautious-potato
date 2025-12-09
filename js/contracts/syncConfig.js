/**
 * Sync Configuration Module
 * 
 * Manages the hybrid storage approach settings:
 * - Local Only: All data stored in localStorage (current behavior)
 * - Sync with Server: Uses localStorage as cache with optional server sync
 * 
 * This module provides the configuration layer for the hybrid approach
 * recommended in docs/DATABASE_USAGE_ANALYSIS.md (Option 3).
 */

// Storage key for sync configuration
const SYNC_CONFIG_KEY = 'contractSyncConfig_v1';

/**
 * Storage mode options
 * @enum {string}
 */
export const StorageMode = {
    LOCAL_ONLY: 'local_only',
    SYNC_WITH_SERVER: 'sync_with_server'
};

/**
 * Sync status values
 * @enum {string}
 */
export const SyncStatus = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SYNCED: 'synced',
    ERROR: 'error',
    OFFLINE: 'offline'
};

/**
 * Default sync configuration
 */
const defaultConfig = {
    storageMode: StorageMode.LOCAL_ONLY,
    apiBaseUrl: '/api',
    autoSync: false,
    syncIntervalMs: 30000, // 30 seconds
    lastSyncAt: null,
    syncOnLoad: false,
    syncOnSave: false
};

/**
 * Current sync configuration (in-memory cache)
 */
let currentConfig = null;

/**
 * Load sync configuration from localStorage
 * @returns {Object} Sync configuration object
 */
export function loadSyncConfig() {
    if (currentConfig) {
        return { ...currentConfig };
    }
    
    try {
        const stored = window.localStorage.getItem(SYNC_CONFIG_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            currentConfig = { ...defaultConfig, ...parsed };
        } else {
            currentConfig = { ...defaultConfig };
        }
    } catch (error) {
        console.warn('Failed to load sync config, using defaults:', error);
        currentConfig = { ...defaultConfig };
    }
    
    return { ...currentConfig };
}

/**
 * Save sync configuration to localStorage
 * @param {Object} config - Configuration updates to apply
 * @returns {Object} Updated configuration
 */
export function saveSyncConfig(config) {
    currentConfig = {
        ...loadSyncConfig(),
        ...config
    };
    
    try {
        window.localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(currentConfig));
    } catch (error) {
        console.error('Failed to save sync config:', error);
    }
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('syncConfigChanged', {
        detail: { config: { ...currentConfig } }
    }));
    
    return { ...currentConfig };
}

/**
 * Get current storage mode
 * @returns {string} Current storage mode (StorageMode enum value)
 */
export function getStorageMode() {
    const config = loadSyncConfig();
    return config.storageMode;
}

/**
 * Set storage mode
 * @param {string} mode - Storage mode (StorageMode enum value)
 * @returns {Object} Updated configuration
 */
export function setStorageMode(mode) {
    if (!Object.values(StorageMode).includes(mode)) {
        throw new Error(`Invalid storage mode: ${mode}`);
    }
    return saveSyncConfig({ storageMode: mode });
}

/**
 * Check if server sync is enabled
 * @returns {boolean} True if sync with server is enabled
 */
export function isSyncEnabled() {
    const config = loadSyncConfig();
    return config.storageMode === StorageMode.SYNC_WITH_SERVER;
}

/**
 * Check if auto-sync is enabled
 * @returns {boolean} True if auto-sync is enabled
 */
export function isAutoSyncEnabled() {
    const config = loadSyncConfig();
    return config.storageMode === StorageMode.SYNC_WITH_SERVER && config.autoSync;
}

/**
 * Update last sync timestamp
 * @returns {Object} Updated configuration
 */
export function updateLastSyncTime() {
    return saveSyncConfig({ lastSyncAt: new Date().toISOString() });
}

/**
 * Get last sync timestamp
 * @returns {string|null} ISO timestamp or null if never synced
 */
export function getLastSyncTime() {
    const config = loadSyncConfig();
    return config.lastSyncAt;
}

/**
 * Reset sync configuration to defaults
 * @returns {Object} Default configuration
 */
export function resetSyncConfig() {
    currentConfig = { ...defaultConfig };
    
    try {
        window.localStorage.removeItem(SYNC_CONFIG_KEY);
    } catch (error) {
        console.error('Failed to clear sync config:', error);
    }
    
    window.dispatchEvent(new CustomEvent('syncConfigChanged', {
        detail: { config: { ...currentConfig } }
    }));
    
    return { ...currentConfig };
}

/**
 * Get configuration summary for debugging/display
 * @returns {Object} Configuration summary
 */
export function getSyncConfigSummary() {
    const config = loadSyncConfig();
    return {
        mode: config.storageMode,
        modeLabel: config.storageMode === StorageMode.LOCAL_ONLY 
            ? 'Nur lokal' 
            : 'Mit Server synchronisieren',
        autoSync: config.autoSync,
        lastSyncAt: config.lastSyncAt,
        syncOnLoad: config.syncOnLoad,
        syncOnSave: config.syncOnSave
    };
}
