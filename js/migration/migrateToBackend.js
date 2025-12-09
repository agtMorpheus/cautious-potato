/**
 * Data Migration Module (Phase 5)
 * 
 * Handles migration of contract data from localStorage to the backend API.
 * This module is used during the transition from Phase 4 (localStorage-only)
 * to Phase 5 (full-stack with backend database).
 * 
 * Features:
 * - Batch migration of contracts
 * - Progress tracking
 * - Error handling and retry logic
 * - Migration status persistence
 */

import { getState, setState } from '../state.js';
import { apiClient } from '../contracts/contractApiClient.js';

/**
 * Migration status constants
 */
export const MigrationStatus = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PARTIAL: 'partial'
};

/**
 * Check if migration has been completed
 * @returns {boolean} True if migration is complete
 */
export function isMigrationComplete() {
    return localStorage.getItem('contract_manager_migrated') === 'true';
}

/**
 * Get migration status
 * @returns {Object} Migration status object
 */
export function getMigrationStatus() {
    const statusJson = localStorage.getItem('contract_manager_migration_status');
    if (statusJson) {
        return JSON.parse(statusJson);
    }
    return {
        status: MigrationStatus.NOT_STARTED,
        migratedCount: 0,
        failedCount: 0,
        totalCount: 0,
        lastAttempt: null,
        details: []
    };
}

/**
 * Save migration status to localStorage
 * @param {Object} status - Migration status object
 */
function saveMigrationStatus(status) {
    localStorage.setItem('contract_manager_migration_status', JSON.stringify(status));
}

/**
 * Map local contract schema to backend API schema
 * @param {Object} contract - Local contract object
 * @returns {Object} Backend API compatible contract
 */
function mapContractToApiSchema(contract) {
    return {
        id: contract.id,
        auftrag: contract.contractId,
        titel: contract.contractTitle || contract.title || '',
        standort: contract.location || '',
        saeule_raum: contract.roomArea || '',
        anlage_nr: contract.equipmentId || '',
        beschreibung: contract.description || '',
        status: mapStatusToBackend(contract.status),
        sollstart: contract.plannedStart || null,
        workorder_code: contract.workorderCode || '',
        melder: contract.reportedBy || '',
        seriennummer: contract.serialNumber || '',
        is_complete: contract.isComplete || false
    };
}

/**
 * Map local status value to backend enum
 * @param {string} status - Local status value
 * @returns {string} Backend status enum value
 */
function mapStatusToBackend(status) {
    const statusMap = {
        'open': 'offen',
        'offen': 'offen',
        'in_progress': 'inbearb',
        'inbearb': 'inbearb',
        'in-bearb': 'inbearb',
        'in bearb': 'inbearb',
        'in bearbeitung': 'inbearb',
        'completed': 'fertig',
        'fertig': 'fertig',
        'done': 'fertig',
        'closed': 'fertig'
    };
    
    const normalizedStatus = (status || '').toLowerCase().trim();
    return statusMap[normalizedStatus] || 'offen';
}

/**
 * Migrate contract data from localStorage to backend API
 * @param {Object} options - Migration options
 * @param {Function} options.onProgress - Progress callback (progress) => void
 * @param {number} options.batchSize - Number of contracts to migrate per batch (default: 50)
 * @returns {Promise<Object>} Migration result
 */
export async function migrateLocalStorageToBackend(options = {}) {
    const {
        onProgress = () => {},
        batchSize = 50
    } = options;

    const state = getState();
    const contracts = state.contracts?.records || [];

    if (contracts.length === 0) {
        console.log('No contracts to migrate');
        const status = {
            status: MigrationStatus.COMPLETED,
            migratedCount: 0,
            failedCount: 0,
            totalCount: 0,
            lastAttempt: new Date().toISOString(),
            details: []
        };
        saveMigrationStatus(status);
        localStorage.setItem('contract_manager_migrated', 'true');
        return { success: true, migratedCount: 0 };
    }

    console.log(`Starting migration of ${contracts.length} contracts...`);
    
    const migrationStatus = {
        status: MigrationStatus.IN_PROGRESS,
        migratedCount: 0,
        failedCount: 0,
        totalCount: contracts.length,
        lastAttempt: new Date().toISOString(),
        details: []
    };
    saveMigrationStatus(migrationStatus);

    const results = [];
    const batches = chunkArray(contracts, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Process batch
        for (const contract of batch) {
            try {
                const apiContract = mapContractToApiSchema(contract);
                await apiClient.createContract(apiContract);
                
                results.push({ success: true, contractId: contract.id });
                migrationStatus.migratedCount++;
                console.log(`✓ Migrated ${contract.contractId}`);

            } catch (err) {
                // Handle duplicate key error (contract already exists)
                if (err.status === 409 || err.code === 'duplicate_entry') {
                    console.log(`⚠ Contract ${contract.contractId} already exists, skipping`);
                    results.push({ success: true, contractId: contract.id, skipped: true });
                    migrationStatus.migratedCount++;
                } else {
                    results.push({
                        success: false,
                        contractId: contract.id,
                        error: err.message
                    });
                    migrationStatus.failedCount++;
                    migrationStatus.details.push({
                        contractId: contract.id,
                        error: err.message
                    });
                    console.error(`✗ Failed to migrate ${contract.id}:`, err);
                }
            }
        }

        // Update progress
        const progress = {
            processed: (batchIndex + 1) * batchSize,
            total: contracts.length,
            percent: Math.round(((batchIndex + 1) / batches.length) * 100),
            migratedCount: migrationStatus.migratedCount,
            failedCount: migrationStatus.failedCount
        };
        onProgress(progress);
        saveMigrationStatus(migrationStatus);

        // Small delay between batches to avoid overwhelming the server
        if (batchIndex < batches.length - 1) {
            await delay(100);
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Update final status
    migrationStatus.status = failCount === 0 ? MigrationStatus.COMPLETED : MigrationStatus.PARTIAL;
    migrationStatus.lastAttempt = new Date().toISOString();
    saveMigrationStatus(migrationStatus);

    console.log(`Migration complete: ${successCount} success, ${failCount} failed`);

    if (failCount === 0) {
        localStorage.setItem('contract_manager_migrated', 'true');
    }

    return {
        success: failCount === 0,
        migratedCount: successCount,
        failedCount: failCount,
        details: results
    };
}

/**
 * Clear local storage data after successful migration
 * @param {boolean} keepBackup - Whether to keep a backup of local data
 */
export function clearLocalDataAfterMigration(keepBackup = true) {
    const state = getState();
    
    if (keepBackup) {
        // Store backup before clearing
        const backupData = {
            contracts: state.contracts?.records || [],
            importedFiles: state.contracts?.importedFiles || [],
            backupDate: new Date().toISOString()
        };
        localStorage.setItem('contract_manager_backup', JSON.stringify(backupData));
        console.log('Backup created in localStorage');
    }
    
    // Clear contract records from state
    setState({
        contracts: {
            ...state.contracts,
            records: [],
            importedFiles: []
        }
    });
    
    console.log('Local contract data cleared');
}

/**
 * Restore local data from backup (in case of migration failure)
 * @returns {boolean} True if restore was successful
 */
export function restoreFromBackup() {
    const backupJson = localStorage.getItem('contract_manager_backup');
    
    if (!backupJson) {
        console.warn('No backup found');
        return false;
    }
    
    try {
        const backup = JSON.parse(backupJson);
        const state = getState();
        
        setState({
            contracts: {
                ...state.contracts,
                records: backup.contracts || [],
                importedFiles: backup.importedFiles || []
            }
        });
        
        // Clear migration flag
        localStorage.removeItem('contract_manager_migrated');
        
        console.log(`Restored ${backup.contracts.length} contracts from backup`);
        return true;
    } catch (err) {
        console.error('Failed to restore from backup:', err);
        return false;
    }
}

/**
 * Reset migration status (for testing or retry)
 */
export function resetMigrationStatus() {
    localStorage.removeItem('contract_manager_migrated');
    localStorage.removeItem('contract_manager_migration_status');
    console.log('Migration status reset');
}

/**
 * Initialize app with migration check
 * Call this during app initialization to handle migration
 * @returns {Promise<Object>} Migration result or null if already migrated
 */
export async function initializeWithMigration() {
    // Check if user is logged in
    const currentUser = await apiClient.getCurrentUser();
    
    if (!currentUser) {
        console.log('User not logged in, skipping migration check');
        return null;
    }
    
    // Check if already migrated
    if (isMigrationComplete()) {
        console.log('Migration already completed');
        return null;
    }
    
    const state = getState();
    const localContracts = state.contracts?.records || [];
    
    if (localContracts.length === 0) {
        console.log('No local contracts to migrate');
        localStorage.setItem('contract_manager_migrated', 'true');
        return { success: true, migratedCount: 0 };
    }
    
    console.log(`Found ${localContracts.length} local contracts, starting migration...`);
    
    // Perform migration
    const result = await migrateLocalStorageToBackend({
        onProgress: (progress) => {
            console.log(`Migration progress: ${progress.percent}% (${progress.migratedCount}/${progress.total})`);
        }
    });
    
    if (result.success) {
        // Clear local data but keep backup
        clearLocalDataAfterMigration(true);
        
        // Reload contracts from server
        try {
            const contracts = await apiClient.listContracts();
            setState({
                contracts: {
                    ...getState().contracts,
                    records: contracts || []
                }
            });
        } catch (err) {
            console.error('Failed to reload contracts from server:', err);
        }
    } else {
        console.warn(`Migration incomplete: ${result.failedCount} contracts failed`);
    }
    
    return result;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Split array into chunks
 * @param {Array} array - Array to split
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Array of chunks
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
    migrateLocalStorageToBackend,
    isMigrationComplete,
    getMigrationStatus,
    clearLocalDataAfterMigration,
    restoreFromBackup,
    resetMigrationStatus,
    initializeWithMigration,
    MigrationStatus
};
