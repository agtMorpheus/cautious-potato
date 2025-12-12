/**
 * Logs Module - Index
 * 
 * Central export for all Logs module components.
 * This module provides logging functionality with UI integration,
 * including log storage, filtering, and export capabilities.
 */

// In-memory log storage
let logs = [];
const MAX_LOGS = 1000;
let subscribers = [];

/**
 * Initialize the logs module
 */
export function initLogsModule() {
    console.log('Logs Module: Initializing...');
    
    // Setup UI event handlers
    setupLogEventHandlers();
    
    // Setup global error handlers
    setupGlobalErrorHandlers();
    
    // Initial render
    renderLogs();
    
    console.log('✓ Logs Module initialized');
}

/**
 * Add a log entry
 * @param {string} message - Log message
 * @param {string} level - Log level (info, success, warn, error, debug)
 */
export function addLog(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message
    };
    
    // Add to logs array
    logs.unshift(logEntry); // Add to beginning
    
    // Keep only MAX_LOGS entries
    if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
    }
    
    // Console output for development
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`);
    
    // Notify subscribers
    notifySubscribers();
    
    // Update UI
    renderLogs();
}

/**
 * Get all logs
 * @returns {Array} Array of log entries
 */
export function getLogs() {
    return [...logs];
}

/**
 * Clear all logs
 */
export function clearLogs() {
    logs = [];
    notifySubscribers();
    renderLogs();
}

/**
 * Subscribe to log changes
 * @param {Function} callback - Callback function to call when logs change
 * @returns {Function} Unsubscribe function
 */
export function subscribeToLogs(callback) {
    subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
        subscribers = subscribers.filter(cb => cb !== callback);
    };
}

/**
 * Notify all subscribers of log changes
 */
function notifySubscribers() {
    subscribers.forEach(callback => {
        try {
            callback(logs);
        } catch (error) {
            console.error('Error in log subscriber:', error);
        }
    });
}

/**
 * Convenience methods for different log levels
 */
export function logDebug(message) {
    addLog(message, 'debug');
}

export function logInfo(message) {
    addLog(message, 'info');
}

export function logWarn(message) {
    addLog(message, 'warn');
}

export function logError(message) {
    addLog(message, 'error');
}

export function logSuccess(message) {
    addLog(message, 'success');
}

/**
 * Setup UI event handlers
 */
function setupLogEventHandlers() {
    // Clear logs button
    const clearBtn = document.getElementById('log-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Möchten Sie wirklich alle Logs löschen?')) {
                clearLogs();
                addLog('Logs cleared by user', 'info');
            }
        });
    }
    
    // Export logs button
    const exportBtn = document.getElementById('log-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportLogs);
    }
    
    // Search input
    const searchInput = document.getElementById('log-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderLogs);
    }
    
    // Level filter
    const levelFilter = document.getElementById('log-level-filter');
    if (levelFilter) {
        levelFilter.addEventListener('change', renderLogs);
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('log-clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (levelFilter) levelFilter.value = '';
            renderLogs();
        });
    }
}

/**
 * Render logs to the table
 */
function renderLogs() {
    const tableBody = document.getElementById('log-table-body');
    if (!tableBody) return;
    
    // Get filter values
    const searchInput = document.getElementById('log-search-input');
    const levelFilter = document.getElementById('log-level-filter');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const levelValue = levelFilter ? levelFilter.value : '';
    
    // Filter logs
    let filteredLogs = logs;
    
    if (searchTerm) {
        filteredLogs = filteredLogs.filter(log => 
            log.message.toLowerCase().includes(searchTerm)
        );
    }
    
    if (levelValue) {
        filteredLogs = filteredLogs.filter(log => log.level === levelValue);
    }
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Render logs
    if (filteredLogs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: var(--space-lg); color: var(--c-text-secondary);">
                    Keine Logs gefunden
                </td>
            </tr>
        `;
        return;
    }
    
    filteredLogs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        // Format timestamp
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        const dateStr = date.toLocaleDateString('de-DE');
        
        // Get level badge color
        const levelClass = getLevelClass(log.level);
        
        row.innerHTML = `
            <td class="table__td">
                <div style="font-size: 0.875rem;">
                    <div>${timeStr}</div>
                    <div style="color: var(--c-text-secondary); font-size: 0.75rem;">${dateStr}</div>
                </div>
            </td>
            <td class="table__td">
                <span class="badge badge-${levelClass}">${log.level}</span>
            </td>
            <td class="table__td">
                <span style="font-family: var(--font-mono); font-size: 0.875rem;">${escapeHtml(log.message)}</span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Get CSS class for log level
 * @param {string} level - Log level
 * @returns {string} CSS class name
 */
function getLevelClass(level) {
    const levelMap = {
        'debug': 'secondary',
        'info': 'primary',
        'success': 'success',
        'warn': 'warning',
        'warning': 'warning',
        'error': 'danger'
    };
    return levelMap[level] || 'secondary';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Export logs to JSON file
 */
function exportLogs() {
    if (logs.length === 0) {
        alert('Keine Logs zum Exportieren vorhanden.');
        return;
    }
    
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `logs-${timestamp}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    addLog(`Exported ${logs.length} logs to file`, 'success');
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
        addLog(`Unhandled error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`, 'error');
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        addLog(`Unhandled promise rejection: ${event.reason}`, 'error');
    });
}

// Export default
export default {
    initLogsModule,
    addLog,
    getLogs,
    clearLogs,
    subscribeToLogs,
    logDebug,
    logInfo,
    logWarn,
    logError,
    logSuccess
};
