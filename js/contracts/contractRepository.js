/**
 * Contract Repository Module (Phase 1)
 * 
 * Provides data access abstraction for contract records
 * Handles CRUD operations, filtering, and searching
 * 
 * Phase 1 implements:
 * - Record retrieval with filtering
 * - Search functionality
 * - Sorting and pagination (stubs)
 * - Data aggregation for reports
 */

import { getState, setState } from '../state.js';
import { normalizeStatus, getContractSummary } from './contractUtils.js';

/**
 * Get all contract records from state
 * @returns {Array} Array of contract records
 */
export function getAllContracts() {
    const state = getState();
    return state.contracts?.records || [];
}

/**
 * Get a single contract by ID
 * @param {string} id - Contract UUID
 * @returns {Object|null} Contract object or null if not found
 */
export function getContractById(id) {
    const contracts = getAllContracts();
    return contracts.find(c => c.id === id) || null;
}

/**
 * Get contracts by contract ID (business key, e.g., "1406")
 * @param {string} contractId - Business contract ID
 * @returns {Array} Array of matching contracts
 */
export function getContractsByContractId(contractId) {
    const contracts = getAllContracts();
    return contracts.filter(c => c.contractId === contractId);
}

/**
 * Get filtered contracts based on current filter state
 * @param {Object} customFilters - Optional custom filters to override state filters
 * @returns {Array} Filtered array of contracts
 */
export function getFilteredContracts(customFilters = null) {
    const state = getState();
    const contracts = state.contracts?.records || [];
    const filters = customFilters || state.contracts?.filters || {};
    
    let filtered = [...contracts];
    
    // Filter by contract ID
    if (filters.contractId) {
        filtered = filtered.filter(c => 
            c.contractId && c.contractId.includes(filters.contractId)
        );
    }
    
    // Filter by status
    if (filters.status) {
        const normalizedFilterStatus = normalizeStatus(filters.status);
        filtered = filtered.filter(c => 
            normalizeStatus(c.status) === normalizedFilterStatus
        );
    }
    
    // Filter by location
    if (filters.location) {
        const locationLower = filters.location.toLowerCase();
        filtered = filtered.filter(c => 
            c.location && c.location.toLowerCase().includes(locationLower)
        );
    }
    
    // Filter by equipment ID
    if (filters.equipmentId) {
        const equipmentLower = filters.equipmentId.toLowerCase();
        filtered = filtered.filter(c => 
            c.equipmentId && c.equipmentId.toLowerCase().includes(equipmentLower)
        );
    }
    
    // Filter by date range
    if (filters.dateRange) {
        const { from, to } = filters.dateRange;
        
        if (from) {
            const fromDate = new Date(from);
            filtered = filtered.filter(c => {
                if (!c.plannedStart) return false;
                const contractDate = new Date(c.plannedStart);
                return contractDate >= fromDate;
            });
        }
        
        if (to) {
            const toDate = new Date(to);
            filtered = filtered.filter(c => {
                if (!c.plannedStart) return false;
                const contractDate = new Date(c.plannedStart);
                return contractDate <= toDate;
            });
        }
    }
    
    // Filter by search text (searches across multiple fields)
    if (filters.searchText && filters.searchText.trim() !== '') {
        const searchLower = filters.searchText.toLowerCase().trim();
        filtered = filtered.filter(c => {
            const searchableFields = [
                c.contractId,
                c.contractTitle,
                c.taskId,
                c.location,
                c.roomArea,
                c.equipmentId,
                c.equipmentDescription,
                c.serialNumber,
                c.workorderCode,
                c.description
            ];
            
            return searchableFields.some(field => 
                field && String(field).toLowerCase().includes(searchLower)
            );
        });
    }
    
    return filtered;
}

/**
 * Get paginated contracts
 * @param {Object} options - Pagination options { page, pageSize, filters, sort }
 * @returns {Object} { data: Array, total: number, page: number, pageSize: number, totalPages: number }
 */
export function getPaginatedContracts(options = {}) {
    const {
        page = 1,
        pageSize = 50,
        filters = null,
        sort = { field: 'createdAt', direction: 'desc' }
    } = options;
    
    // Get filtered contracts
    let contracts = getFilteredContracts(filters);
    
    // Apply sorting
    contracts = sortContracts(contracts, sort.field, sort.direction);
    
    // Calculate pagination
    const total = contracts.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const data = contracts.slice(startIndex, endIndex);
    
    return {
        data,
        total,
        page,
        pageSize,
        totalPages
    };
}

/**
 * Sort contracts by a field
 * @param {Array} contracts - Array of contracts to sort
 * @param {string} field - Field name to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
export function sortContracts(contracts, field, direction = 'asc') {
    if (!Array.isArray(contracts)) {
        return [];
    }
    
    const sorted = [...contracts];
    const multiplier = direction === 'desc' ? -1 : 1;
    
    sorted.sort((a, b) => {
        let valueA = a[field];
        let valueB = b[field];
        
        // Handle null/undefined values
        if (valueA === null || valueA === undefined) valueA = '';
        if (valueB === null || valueB === undefined) valueB = '';
        
        // Handle date fields
        if (field === 'plannedStart' || field === 'createdAt' || field === 'updatedAt') {
            valueA = new Date(valueA).getTime() || 0;
            valueB = new Date(valueB).getTime() || 0;
            return (valueA - valueB) * multiplier;
        }
        
        // Handle string comparison
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return valueA.localeCompare(valueB) * multiplier;
        }
        
        // Handle number comparison
        return (valueA - valueB) * multiplier;
    });
    
    return sorted;
}

/**
 * Add a new contract record
 * @param {Object} contract - Contract object to add
 * @returns {Object} Added contract with generated ID
 */
export function addContract(contract) {
    const state = getState();
    const records = state.contracts?.records || [];
    
    // Ensure contract has required fields
    const newContract = {
        ...contract,
        id: contract.id || generateUUID(),
        createdAt: contract.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    setState({
        contracts: {
            ...state.contracts,
            records: [...records, newContract]
        }
    });
    
    return newContract;
}

/**
 * Add multiple contract records in bulk
 * More efficient than calling addContract for each record
 * 
 * @param {Array} contracts - Array of contract objects to add
 * @param {Object} importMetadata - Optional import metadata { fileName, importedAt, recordsImported, recordsWithErrors }
 * @returns {Object} Result { addedCount, contracts }
 */
export function addContracts(contracts, importMetadata = null) {
    if (!Array.isArray(contracts) || contracts.length === 0) {
        return { addedCount: 0, contracts: [] };
    }
    
    const state = getState();
    const existingRecords = state.contracts?.records || [];
    const existingFiles = state.contracts?.importedFiles || [];
    
    const now = new Date().toISOString();
    
    // Process all contracts
    const newContracts = contracts.map(contract => ({
        ...contract,
        id: contract.id || generateUUID(),
        createdAt: contract.createdAt || now,
        updatedAt: now
    }));
    
    // Build updated state
    const updatedState = {
        contracts: {
            ...state.contracts,
            records: [...existingRecords, ...newContracts]
        }
    };
    
    // Add import metadata if provided
    if (importMetadata) {
        const newFileEntry = {
            fileName: importMetadata.fileName || 'unknown',
            size: importMetadata.size || 0,
            importedAt: importMetadata.importedAt || now,
            recordsImported: importMetadata.recordsImported || newContracts.length,
            recordsWithErrors: importMetadata.recordsWithErrors || 0
        };
        
        updatedState.contracts.importedFiles = [...existingFiles, newFileEntry];
    }
    
    setState(updatedState);
    
    return {
        addedCount: newContracts.length,
        contracts: newContracts
    };
}

/**
 * Update an existing contract record
 * @param {string} id - Contract UUID
 * @param {Object} updates - Partial updates to apply
 * @returns {Object|null} Updated contract or null if not found
 */
export function updateContract(id, updates) {
    const state = getState();
    const records = state.contracts?.records || [];
    const index = records.findIndex(c => c.id === id);
    
    if (index === -1) {
        console.warn(`Contract not found: ${id}`);
        return null;
    }
    
    const updatedContract = {
        ...records[index],
        ...updates,
        id: records[index].id, // Preserve original ID
        createdAt: records[index].createdAt, // Preserve original creation date
        updatedAt: new Date().toISOString()
    };
    
    const newRecords = [...records];
    newRecords[index] = updatedContract;
    
    setState({
        contracts: {
            ...state.contracts,
            records: newRecords
        }
    });
    
    return updatedContract;
}

/**
 * Delete a contract record
 * @param {string} id - Contract UUID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteContract(id) {
    const state = getState();
    const records = state.contracts?.records || [];
    const index = records.findIndex(c => c.id === id);
    
    if (index === -1) {
        console.warn(`Contract not found: ${id}`);
        return false;
    }
    
    const newRecords = records.filter(c => c.id !== id);
    
    setState({
        contracts: {
            ...state.contracts,
            records: newRecords
        }
    });
    
    return true;
}

/**
 * Get unique values for a field (useful for filter dropdowns)
 * @param {string} field - Field name to get unique values for
 * @returns {Array} Array of unique values
 */
export function getUniqueFieldValues(field) {
    const contracts = getAllContracts();
    const values = new Set();
    
    contracts.forEach(contract => {
        const value = contract[field];
        if (value !== null && value !== undefined && value !== '') {
            values.add(String(value));
        }
    });
    
    return Array.from(values).sort();
}

/**
 * Get contract statistics for dashboard
 * @returns {Object} Statistics object
 */
export function getContractStatistics() {
    const contracts = getAllContracts();
    const summary = getContractSummary(contracts);
    
    // Additional statistics
    const state = getState();
    const importedFiles = state.contracts?.importedFiles || [];
    
    return {
        ...summary,
        totalImportedFiles: importedFiles.length,
        lastImportDate: importedFiles.length > 0 
            ? importedFiles[importedFiles.length - 1].importedAt 
            : null
    };
}

/**
 * Search contracts with full-text search across all fields
 * @param {string} query - Search query
 * @returns {Array} Matching contracts
 */
export function searchContracts(query) {
    if (!query || query.trim() === '') {
        return getAllContracts();
    }
    
    return getFilteredContracts({ searchText: query });
}

/**
 * Get contracts grouped by a field
 * @param {string} field - Field to group by
 * @returns {Object} Object with field values as keys and arrays of contracts as values
 */
export function getContractsGroupedBy(field) {
    const contracts = getAllContracts();
    const groups = {};
    
    contracts.forEach(contract => {
        let key = contract[field];
        if (key === null || key === undefined || key === '') {
            key = 'Unbekannt';
        }
        
        // Normalize status values
        if (field === 'status') {
            key = normalizeStatus(key) || 'unbekannt';
        }
        
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(contract);
    });
    
    return groups;
}

/**
 * Check if any contracts exist
 * @returns {boolean} True if contracts exist
 */
export function hasContracts() {
    return getAllContracts().length > 0;
}

/**
 * Get the count of contracts matching filters
 * @param {Object} filters - Optional filters
 * @returns {number} Count of matching contracts
 */
export function getContractCount(filters = null) {
    return getFilteredContracts(filters).length;
}

// Helper function for UUID generation (imported from contractUtils or defined here)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
