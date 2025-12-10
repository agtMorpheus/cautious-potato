/**
 * HR-Contract Integration Module
 * 
 * Provides a bridge between the HR module and Contract module
 * Allows contracts to be assigned to workers (employees) from the HR system
 * 
 * @module hrContractIntegration
 * @version 1.0.0
 */

import { getHrState, subscribeHr } from '../modules/hr/hrState.js';

/**
 * Cache for employee list to avoid frequent state access
 */
let employeeCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // 5 seconds cache TTL

/**
 * Get all active employees from HR module for worker selection
 * Returns a simplified list suitable for dropdown population
 * 
 * @returns {Array} Array of employee objects with id, name, department
 */
export function getAvailableWorkers() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (employeeCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return employeeCache;
    }
    
    try {
        const hrState = getHrState();
        const employees = hrState.employees || [];
        
        // Filter to active employees only and map to simplified format
        const workers = employees
            .filter(emp => emp.employmentStatus === 'active' && !emp.archived)
            .map(emp => ({
                id: emp.id,
                name: formatWorkerName(emp),
                firstName: emp.firstName || '',
                lastName: emp.lastName || '',
                department: emp.department || '',
                position: emp.position || ''
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Update cache
        employeeCache = workers;
        cacheTimestamp = now;
        
        return workers;
    } catch (error) {
        console.warn('HR module not available, returning empty worker list:', error);
        return [];
    }
}

/**
 * Get a specific worker by ID
 * 
 * @param {string} workerId - Worker/Employee ID
 * @returns {Object|null} Worker object or null if not found
 */
export function getWorkerById(workerId) {
    if (!workerId) {
        return null;
    }
    
    const workers = getAvailableWorkers();
    return workers.find(w => w.id === workerId) || null;
}

/**
 * Format worker name for display
 * 
 * @param {Object} employee - Employee object from HR state
 * @returns {string} Formatted name "LastName, FirstName"
 */
export function formatWorkerName(employee) {
    if (!employee) {
        return '';
    }
    
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    
    if (lastName && firstName) {
        return `${lastName}, ${firstName}`;
    }
    
    return lastName || firstName || employee.id || 'Unbekannt';
}

/**
 * Get worker name by ID (for display in tables)
 * 
 * @param {string} workerId - Worker/Employee ID
 * @returns {string} Worker name or empty string if not found
 */
export function getWorkerNameById(workerId) {
    if (!workerId) {
        return '';
    }
    
    const worker = getWorkerById(workerId);
    return worker ? worker.name : '';
}

/**
 * Subscribe to HR employee changes
 * Useful for updating the UI when employees are added/removed
 * 
 * @param {Function} callback - Callback function receiving updated worker list
 * @returns {Function} Unsubscribe function
 */
export function subscribeToWorkerChanges(callback) {
    return subscribeHr((hrState) => {
        // Invalidate cache on HR state change
        employeeCache = null;
        cacheTimestamp = 0;
        
        // Get fresh worker list and notify
        const workers = getAvailableWorkers();
        callback(workers);
    });
}

/**
 * Clear the employee cache
 * Call this when you need fresh data
 */
export function clearWorkerCache() {
    employeeCache = null;
    cacheTimestamp = 0;
}

/**
 * Check if HR integration is available
 * 
 * @returns {boolean} True if HR module is available
 */
export function isHrIntegrationAvailable() {
    try {
        const hrState = getHrState();
        return hrState !== null && typeof hrState === 'object';
    } catch {
        return false;
    }
}

/**
 * Get workers grouped by department
 * Useful for organized dropdown options
 * 
 * @returns {Object} Object with department names as keys and worker arrays as values
 */
export function getWorkersByDepartment() {
    const workers = getAvailableWorkers();
    const grouped = {};
    
    workers.forEach(worker => {
        const dept = worker.department || 'Ohne Abteilung';
        if (!grouped[dept]) {
            grouped[dept] = [];
        }
        grouped[dept].push(worker);
    });
    
    return grouped;
}
