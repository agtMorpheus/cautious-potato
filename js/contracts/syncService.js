/**
 * Sync Service Module
 * 
 * Coordinates data synchronization between localStorage and server API.
 * Implements the hybrid approach recommended in docs/DATABASE_USAGE_ANALYSIS.md (Option 3):
 * - Uses localStorage as primary storage (fast, offline-capable)
 * - Optional server sync for backup and collaboration
 * - User can choose between "Local Only" and "Sync with Server" modes
 * 
 * Benefits:
 * - Maintains current offline-first experience
 * - Adds enterprise features for users who need data persistence
 * - Enables collaboration for users who choose server sync
 */

import { apiClient } from './contractApiClient.js';
import { 
    loadSyncConfig, 
    saveSyncConfig, 
    isSyncEnabled, 
    isAutoSyncEnabled,
    updateLastSyncTime,
    SyncStatus 
} from './syncConfig.js';
import { getState, setState } from '../state.js';

/**
 * Current sync status
 */
let syncStatus = SyncStatus.IDLE;

/**
 * Sync error message (if any)
 */
let syncError = null;

/**
 * Auto-sync interval ID
 */
let autoSyncIntervalId = null;

/**
 * Listeners for sync status changes
 */
const statusListeners = new Set();

/**
 * Configuration constants for sync performance
 */
const SYNC_CONFIG = {
    LARGE_DATASET_THRESHOLD: 500,  // Contracts count threshold for chunk size adjustment
    DEFAULT_CHUNK_SIZE_LARGE: 50,  // Chunk size for large datasets
    DEFAULT_CHUNK_SIZE_SMALL: 100  // Chunk size for smaller datasets
};

/**
 * Get current sync status
 * @returns {Object} Status object with status and error
 */
export function getSyncStatus() {
    return {
        status: syncStatus,
        error: syncError,
        isOnline: navigator.onLine
    };
}

/**
 * Subscribe to sync status changes
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribeSyncStatus(listener) {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
}

/**
 * Update sync status and notify listeners
 * @param {string} status - New status (SyncStatus enum)
 * @param {string|null} error - Error message if any
 */
function updateSyncStatus(status, error = null) {
    syncStatus = status;
    syncError = error;
    
    const statusInfo = getSyncStatus();
    
    // Notify listeners
    statusListeners.forEach(listener => {
        try {
            listener(statusInfo);
        } catch (e) {
            console.error('Sync status listener error:', e);
        }
    });
    
    // Dispatch DOM event
    window.dispatchEvent(new CustomEvent('syncStatusChanged', {
        detail: statusInfo
    }));
}

/**
 * Sync contracts from localStorage to server
 * @param {Object} options - Sync options { force: boolean, chunkSize: number, progressCallback: function }
 * @returns {Promise<Object>} Sync result
 */
export async function syncToServer(options = { force: false, chunkSize: 100 }) {
    // Check if sync is enabled
    if (!isSyncEnabled() && !options.force) {
        return { success: false, reason: 'sync_disabled' };
    }
    
    // Check if online
    if (!navigator.onLine) {
        updateSyncStatus(SyncStatus.OFFLINE);
        return { success: false, reason: 'offline' };
    }
    
    updateSyncStatus(SyncStatus.SYNCING);
    
    try {
        const state = getState();
        const contracts = state.contracts?.records || [];
        
        if (contracts.length === 0) {
            updateSyncStatus(SyncStatus.SYNCED);
            updateLastSyncTime();
            return { success: true, uploaded: 0 };
        }
        
        // Determine optimal chunk size based on dataset size
        const defaultChunkSize = contracts.length > SYNC_CONFIG.LARGE_DATASET_THRESHOLD 
            ? SYNC_CONFIG.DEFAULT_CHUNK_SIZE_LARGE 
            : SYNC_CONFIG.DEFAULT_CHUNK_SIZE_SMALL;
        const chunkSize = options.chunkSize || defaultChunkSize;
        
        let uploadedCount = 0;
        const errors = [];
        
        // Process contracts in chunks for better performance with large datasets
        for (let i = 0; i < contracts.length; i += chunkSize) {
            const chunk = contracts.slice(i, Math.min(i + chunkSize, contracts.length));
            
            // Process chunk with Promise.allSettled for better error handling
            const results = await Promise.allSettled(
                chunk.map(async (contract) => {
                    try {
                        // Check if contract exists on server (by ID)
                        const existing = await apiClient.getContract(contract.id).catch(() => null);
                        
                        if (existing) {
                            // Update existing contract
                            await apiClient.updateContract(contract.id, contract);
                        } else {
                            // Create new contract
                            await apiClient.createContract(contract);
                        }
                        return { success: true, contract: contract.id };
                    } catch (error) {
                        return { success: false, contract: contract.id, error: error.message };
                    }
                })
            );
            
            // Process results
            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        uploadedCount++;
                    } else {
                        errors.push({
                            contractId: result.value.contract,
                            error: result.value.error
                        });
                    }
                } else {
                    // Promise rejected
                    errors.push({
                        contractId: chunk[idx].id,
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });
            
            // Call progress callback if provided
            if (options.progressCallback) {
                const progress = Math.min(i + chunkSize, contracts.length);
                options.progressCallback({
                    current: progress,
                    total: contracts.length,
                    uploaded: uploadedCount,
                    errors: errors.length
                });
            }
        }
        
        if (errors.length === 0) {
            updateSyncStatus(SyncStatus.SYNCED);
        } else {
            updateSyncStatus(SyncStatus.ERROR, `${errors.length} contracts failed to sync`);
        }
        
        updateLastSyncTime();
        
        return {
            success: errors.length === 0,
            uploaded: uploadedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        updateSyncStatus(SyncStatus.ERROR, error.message);
        return {
            success: false,
            reason: 'sync_failed',
            error: error.message
        };
    }
}

/**
 * Sync contracts from server to localStorage
 * @param {Object} options - Sync options { merge: boolean }
 * @returns {Promise<Object>} Sync result
 */
export async function syncFromServer(options = { merge: true }) {
    // Check if sync is enabled
    if (!isSyncEnabled()) {
        return { success: false, reason: 'sync_disabled' };
    }
    
    // Check if online
    if (!navigator.onLine) {
        updateSyncStatus(SyncStatus.OFFLINE);
        return { success: false, reason: 'offline' };
    }
    
    updateSyncStatus(SyncStatus.SYNCING);
    
    try {
        // Fetch contracts from server
        // Expected API response formats:
        // 1. { contracts: [...] } - Standard paginated response
        // 2. [...] - Direct array response (simple API)
        const serverResponse = await apiClient.listContracts();
        
        let serverContracts;
        if (serverResponse && Array.isArray(serverResponse.contracts)) {
            // Standard paginated response format
            serverContracts = serverResponse.contracts;
        } else if (Array.isArray(serverResponse)) {
            // Direct array response format
            serverContracts = serverResponse;
        } else {
            throw new Error('Invalid server response format: expected array or object with contracts property');
        }
        
        const state = getState();
        const localContracts = state.contracts?.records || [];
        
        let mergedContracts;
        
        if (options.merge) {
            // Merge server contracts with local contracts
            mergedContracts = mergeContracts(localContracts, serverContracts);
        } else {
            // Replace local contracts with server contracts
            mergedContracts = serverContracts;
        }
        
        // Update state with merged contracts
        setState({
            contracts: {
                ...state.contracts,
                records: mergedContracts
            }
        });
        
        updateSyncStatus(SyncStatus.SYNCED);
        updateLastSyncTime();
        
        return {
            success: true,
            downloaded: serverContracts.length,
            merged: mergedContracts.length
        };
    } catch (error) {
        updateSyncStatus(SyncStatus.ERROR, error.message);
        return {
            success: false,
            reason: 'sync_failed',
            error: error.message
        };
    }
}

/**
 * Perform bidirectional sync
 * @returns {Promise<Object>} Sync result
 */
export async function performFullSync() {
    // Check if sync is enabled
    if (!isSyncEnabled()) {
        return { success: false, reason: 'sync_disabled' };
    }
    
    // Check if online
    if (!navigator.onLine) {
        updateSyncStatus(SyncStatus.OFFLINE);
        return { success: false, reason: 'offline' };
    }
    
    updateSyncStatus(SyncStatus.SYNCING);
    
    try {
        // First, download from server
        const downloadResult = await syncFromServer({ merge: true });
        
        // Then, upload local changes
        const uploadResult = await syncToServer({ force: true });
        
        if (downloadResult.success && uploadResult.success) {
            updateSyncStatus(SyncStatus.SYNCED);
        } else {
            // Build detailed error message
            const messages = [];
            
            if (!downloadResult.success) {
                const reason = downloadResult.error || downloadResult.reason || 'Unknown error';
                messages.push(`Download: ${reason}`);
            } else {
                messages.push(`Download: ${downloadResult.downloaded || 0} contracts`);
            }
            
            if (!uploadResult.success) {
                const errorCount = uploadResult.errors?.length || 0;
                if (errorCount > 0) {
                    messages.push(`Upload: ${errorCount} failed`);
                } else {
                    const reason = uploadResult.error || uploadResult.reason || 'Unknown error';
                    messages.push(`Upload: ${reason}`);
                }
            } else {
                messages.push(`Upload: ${uploadResult.uploaded || 0} contracts`);
            }
            
            const errorMessage = messages.join(' | ');
            updateSyncStatus(SyncStatus.ERROR, errorMessage);
        }
        
        return {
            success: downloadResult.success && uploadResult.success,
            download: downloadResult,
            upload: uploadResult
        };
    } catch (error) {
        updateSyncStatus(SyncStatus.ERROR, error.message);
        return {
            success: false,
            reason: 'sync_failed',
            error: error.message
        };
    }
}

/**
 * Merge local and server contracts
 * Server contracts take precedence for conflicts (based on updatedAt)
 * @param {Array} localContracts - Local contract records
 * @param {Array} serverContracts - Server contract records
 * @returns {Array} Merged contracts
 */
function mergeContracts(localContracts, serverContracts) {
    const contractMap = new Map();
    
    // Add local contracts first
    for (const contract of localContracts) {
        contractMap.set(contract.id, contract);
    }
    
    // Merge server contracts using "server wins on conflict" strategy.
    // Rationale: The server is the source of truth for shared data, and 
    // server timestamps are more reliable for determining the canonical version.
    // On equal timestamps, server wins to ensure consistency across clients.
    for (const serverContract of serverContracts) {
        const local = contractMap.get(serverContract.id);
        
        if (!local) {
            // New contract from server
            contractMap.set(serverContract.id, serverContract);
        } else {
            // Conflict resolution: compare updatedAt timestamps
            // Server version wins if it's newer or has the same timestamp
            const localUpdated = new Date(local.updatedAt || 0);
            const serverUpdated = new Date(serverContract.updatedAt || 0);
            
            if (serverUpdated >= localUpdated) {
                // Server version is newer or same - use server version
                contractMap.set(serverContract.id, serverContract);
            }
            // Otherwise keep local version (local is newer)
        }
    }
    
    return Array.from(contractMap.values());
}

/**
 * Start auto-sync if enabled
 */
export function startAutoSync() {
    stopAutoSync(); // Clear any existing interval
    
    if (!isAutoSyncEnabled()) {
        return;
    }
    
    const config = loadSyncConfig();
    const intervalMs = config.syncIntervalMs || 30000;
    
    autoSyncIntervalId = setInterval(async () => {
        if (navigator.onLine && isSyncEnabled()) {
            await performFullSync();
        }
    }, intervalMs);
    
    console.log(`Auto-sync started with interval: ${intervalMs}ms`);
}

/**
 * Stop auto-sync
 */
export function stopAutoSync() {
    if (autoSyncIntervalId) {
        clearInterval(autoSyncIntervalId);
        autoSyncIntervalId = null;
        console.log('Auto-sync stopped');
    }
}

/**
 * Initialize sync service
 * Sets up online/offline listeners and starts auto-sync if enabled
 */
export function initSyncService() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
        if (syncStatus === SyncStatus.OFFLINE) {
            updateSyncStatus(SyncStatus.IDLE);
        }
        // Trigger sync when coming back online
        if (isSyncEnabled()) {
            performFullSync();
        }
    });
    
    window.addEventListener('offline', () => {
        updateSyncStatus(SyncStatus.OFFLINE);
    });
    
    // Listen for config changes
    window.addEventListener('syncConfigChanged', (event) => {
        const config = event.detail?.config;

        // Update API Base URL
        if (config?.apiBaseUrl) {
            apiClient.setBaseUrl(config.apiBaseUrl);
        }

        if (config?.autoSync && config?.storageMode === 'sync_with_server') {
            startAutoSync();
        } else {
            stopAutoSync();
        }
    });
    
    // Set initial status
    if (!navigator.onLine) {
        updateSyncStatus(SyncStatus.OFFLINE);
    }
    
    // Initialize API URL from config
    const config = loadSyncConfig();
    if (config.apiBaseUrl) {
        apiClient.setBaseUrl(config.apiBaseUrl);
    }

    // Start auto-sync if enabled
    if (isAutoSyncEnabled()) {
        startAutoSync();
    }
    
    console.log('Sync service initialized');
}

/**
 * Export contracts as JSON backup (works in any mode)
 * @returns {Object} Export data with contracts and metadata
 */
export function exportContractsAsJson() {
    const state = getState();
    const contracts = state.contracts?.records || [];
    const config = loadSyncConfig();
    
    return {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        storageMode: config.storageMode,
        contractCount: contracts.length,
        contracts: contracts
    };
}

/**
 * Import contracts from JSON backup
 * @param {Object} data - Import data with contracts array
 * @param {Object} options - Import options { replace: boolean }
 * @returns {Object} Import result
 */
export function importContractsFromJson(data, options = { replace: false }) {
    if (!data || !Array.isArray(data.contracts)) {
        return { success: false, error: 'Invalid import data format' };
    }
    
    const state = getState();
    let contracts;
    
    if (options.replace) {
        contracts = data.contracts;
    } else {
        // Merge with existing contracts
        const existing = state.contracts?.records || [];
        contracts = mergeContracts(existing, data.contracts);
    }
    
    setState({
        contracts: {
            ...state.contracts,
            records: contracts
        }
    });
    
    return {
        success: true,
        imported: data.contracts.length,
        total: contracts.length
    };
}
