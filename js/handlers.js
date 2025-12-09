/**
 * Event Handlers Module (Phase 4)
 * 
 * Handles user interactions and coordinates between UI, state, and utilities
 * Implements Phase 4 requirements with enhanced UI updates and error handling
 */

import { 
    getState, 
    setState, 
    resetState, 
    clearPersistedState,
    setImportStatus,
    setGenerateStatus,
    setExportStatus,
    updateProtokollData,
    updateAbrechnungPositions,
    updateAbrechnungHeader,
    subscribe
} from './state.js';
import * as utils from './utils.js';

// Store selected file reference (not persisted in state)
let selectedFile = null;

// Store generated workbook reference (not persisted in state - can't be serialized)
window._currentWorkbook = null;

/**
 * Handle file input change (Phase 4)
 * @param {Event} event - File input change event
 */
export function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileName');
    const importBtn = document.getElementById('import-button');
    
    if (file) {
        fileNameDisplay.textContent = file.name;
        importBtn.disabled = false;
        
        // Store file reference locally (not in state - files can't be serialized)
        selectedFile = file;
        
        // Update UI state with file info
        setImportStatus({
            fileName: file.name,
            fileSize: file.size,
            status: 'idle',
            message: ''
        });
    } else {
        fileNameDisplay.textContent = 'Keine Datei ausgewählt';
        importBtn.disabled = true;
        selectedFile = null;
        
        setImportStatus({
            fileName: '',
            fileSize: 0,
            status: 'idle',
            message: ''
        });
    }
}

/**
 * Handle file import - Phase 4.1.1 Implementation
 * @param {Event} event - File input change event or button click
 * @returns {Promise<void>}
 */
export async function handleImportFile(event) {
    const file = selectedFile;
    
    if (!file) {
        console.log('File selection cancelled');
        return;
    }
    
    // Mark UI as loading
    setState({
        ui: {
            ...getState().ui,
            import: {
                status: 'pending',
                message: `Processing ${file.name}...`,
                fileName: file.name,
                fileSize: file.size,
                importedAt: null
            }
        }
    });
    
    try {
        console.log('Starting file import...', file.name);
        const startTime = performance.now();
        
        // Use safe wrapper function from utils
        const result = await utils.safeReadAndParseProtokoll(file);
        
        if (!result.success) {
            throw new Error(result.errors[0] || 'Unknown import error');
        }
        
        const { metadata, positionen, positionSums } = result;
        const summary = utils.getPositionSummary(positionSums);
        
        // Show any warnings to user
        if (result.warnings.length > 0) {
            console.warn('Import warnings:', result.warnings);
        }
        
        const elapsedMs = performance.now() - startTime;
        
        // Update state with imported data
        setState({
            protokollData: {
                metadata,
                positionen
            },
            ui: {
                ...getState().ui,
                import: {
                    status: 'success',
                    message: `Successfully imported ${file.name}`,
                    fileName: file.name,
                    fileSize: file.size,
                    importedAt: new Date().toISOString()
                },
                generate: {
                    ...getState().ui.generate,
                    positionCount: positionen.length,
                    uniquePositionCount: summary.uniquePositions
                }
            }
        });
        
        console.log('File import completed in', elapsedMs.toFixed(2), 'ms');
        console.log('Imported metadata:', metadata);
        console.log('Extracted positions:', summary);
        
    } catch (error) {
        console.error('Import failed:', error);
        
        setState({
            ui: {
                ...getState().ui,
                import: {
                    status: 'error',
                    message: `Import failed: ${error.message}`,
                    fileName: file.name,
                    fileSize: file.size,
                    importedAt: null
                }
            }
        });
        
        // Show error dialog to user
        showErrorAlert(
            'Import Error',
            `Failed to import file: ${error.message}`
        );
    }
    
    // Reset file input for re-selection
    const fileInput = document.querySelector('#file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * Handle "Generate" button click - Phase 4.1.2 Implementation
 * @returns {Promise<void>}
 */
export async function handleGenerateAbrechnung() {
    const state = getState();
    
    // Validate preconditions
    if (!state.protokollData || !state.protokollData.metadata) {
        showErrorAlert(
            'No Data',
            'Please import a protokoll.xlsx file first.'
        );
        return;
    }
    
    // Mark UI as loading
    setState({
        ui: {
            ...state.ui,
            generate: {
                ...state.ui.generate,
                status: 'pending',
                message: 'Generating abrechnung...'
            }
        }
    });
    
    try {
        console.log('Starting abrechnung generation...');
        const startTime = performance.now();
        
        const { metadata, positionen } = state.protokollData;
        
        // Step 1: Aggregate positions
        const positionSums = utils.sumByPosition(positionen);
        const summary = utils.getPositionSummary(positionSums);
        
        console.log('Position aggregation complete:', summary);
        
        // Step 2: Create export workbook
        const workbook = await utils.createExportWorkbook({
            header: {
                date: metadata.date,
                orderNumber: metadata.orderNumber,
                plant: metadata.plant,
                location: metadata.location
            },
            positionen: positionSums
        });
        
        const validation = utils.validateFilledPositions(workbook);
        console.log('Workbook creation validation:', validation);
        
        const elapsedMs = performance.now() - startTime;
        
        // Update state
        setState({
            abrechnungData: {
                header: {
                    date: metadata.date,
                    orderNumber: metadata.orderNumber,
                    plant: metadata.plant,
                    location: metadata.location
                },
                positionen: positionSums
            },
            ui: {
                ...state.ui,
                generate: {
                    status: 'success',
                    message: 'Abrechnung generated successfully',
                    positionCount: summary.uniquePositions,
                    uniquePositionCount: summary.uniquePositions,
                    generationTimeMs: Math.round(elapsedMs)
                }
            }
        });
        
        // Store workbook in window for export step
        window._currentWorkbook = workbook;
        
        console.log('Generation completed in', elapsedMs.toFixed(2), 'ms');
        
    } catch (error) {
        console.error('Generation failed:', error);
        
        setState({
            ui: {
                ...state.ui,
                generate: {
                    status: 'error',
                    message: `Generation failed: ${error.message}`,
                    positionCount: 0,
                    uniquePositionCount: 0,
                    generationTimeMs: 0
                }
            }
        });
        
        showErrorAlert(
            'Generation Error',
            `Failed to generate abrechnung: ${error.message}`
        );
    }
}

/**
 * Handle "Export" button click - Phase 4.1.3 Implementation
 * @returns {Promise<void>}
 */
export async function handleExportAbrechnung() {
    const state = getState();
    
    // Validate preconditions
    if (!state.abrechnungData || !state.abrechnungData.header) {
        showErrorAlert(
            'No Data',
            'Please generate an abrechnung first.'
        );
        return;
    }
    
    if (!window._currentWorkbook) {
        showErrorAlert(
            'No Workbook',
            'Workbook not found in memory. Please regenerate.'
        );
        return;
    }
    
    // Mark UI as loading
    setState({
        ui: {
            ...state.ui,
            export: {
                ...state.ui.export,
                status: 'pending',
                message: 'Preparing download...'
            }
        }
    });
    
    try {
        console.log('Starting abrechnung export...');
        
        const metadata = state.protokollData.metadata;
        const workbook = window._currentWorkbook;
        
        // Export the workbook
        const exportMetadata = utils.exportToExcel(workbook, metadata);
        
        // Update state
        setState({
            ui: {
                ...state.ui,
                export: {
                    status: 'success',
                    message: `Downloaded: ${exportMetadata.fileName}`,
                    lastExportAt: new Date().toISOString(),
                    lastExportSize: exportMetadata.fileSize
                }
            }
        });
        
        console.log('Export successful:', exportMetadata);
        
    } catch (error) {
        console.error('Export failed:', error);
        
        setState({
            ui: {
                ...state.ui,
                export: {
                    status: 'error',
                    message: `Export failed: ${error.message}`,
                    lastExportAt: null,
                    lastExportSize: 0
                }
            }
        });
        
        showErrorAlert(
            'Export Error',
            `Failed to export file: ${error.message}`
        );
    }
}

/**
 * Handle "Reset" button click - Phase 4.1.4 Implementation
 * @returns {void}
 */
export async function handleResetApplication() {
    const confirmed = confirm(
        'Are you sure you want to reset? This will clear all imported data and generated files.'
    );
    
    if (!confirmed) {
        console.log('Reset cancelled by user');
        return;
    }
    
    try {
        // Clear UI
        clearErrorAlerts();
        
        // Clear state and storage
        resetState({ persist: true, silent: false });
        clearPersistedState();
        
        // Clear file input
        const fileInput = document.querySelector('#file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Reset file name display
        const fileNameDisplay = document.getElementById('fileName');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'Keine Datei ausgewählt';
        }
        
        // Clear workbook from window
        delete window._currentWorkbook;
        
        // Clear local references
        selectedFile = null;
        
        console.log('Application reset complete');
        
    } catch (error) {
        console.error('Reset failed:', error);
        showErrorAlert(
            'Reset Error',
            'Failed to reset application'
        );
    }
}

// ==================== Phase 4.4: UI Helper Functions ====================

/**
 * Display an error alert to the user - Phase 4.4
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @returns {void}
 */
export function showErrorAlert(title, message) {
    const alertContainer = document.querySelector('#alert-container');
    
    if (!alertContainer) {
        console.warn('Alert container not found. Falling back to alert()');
        alert(`${title}: ${message}`);
        return;
    }
    
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-error';
    alertElement.role = 'alert';
    alertElement.innerHTML = `
        <div class="alert-header">
            <strong>${escapeHtml(title)}</strong>
            <button class="alert-close" aria-label="Close alert">&times;</button>
        </div>
        <div class="alert-body">
            ${escapeHtml(message)}
        </div>
    `;
    
    // Close button handler
    alertElement.querySelector('.alert-close').addEventListener('click', () => {
        alertElement.remove();
    });
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 8000);
    
    alertContainer.appendChild(alertElement);
    console.error(`${title}: ${message}`);
}

/**
 * Display a success alert to the user - Phase 4.4
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @returns {void}
 */
export function showSuccessAlert(title, message) {
    const alertContainer = document.querySelector('#alert-container');
    
    if (!alertContainer) {
        console.log(`${title}: ${message}`);
        return;
    }
    
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-success';
    alertElement.role = 'status';
    alertElement.innerHTML = `
        <div class="alert-header">
            <strong>${escapeHtml(title)}</strong>
            <button class="alert-close" aria-label="Close alert">&times;</button>
        </div>
        <div class="alert-body">
            ${escapeHtml(message)}
        </div>
    `;
    
    // Close button handler
    alertElement.querySelector('.alert-close').addEventListener('click', () => {
        alertElement.remove();
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, 5000);
    
    alertContainer.appendChild(alertElement);
    console.log(`${title}: ${message}`);
}

/**
 * Clear all alert messages from the container - Phase 4.4
 * @returns {void}
 */
export function clearErrorAlerts() {
    const alertContainer = document.querySelector('#alert-container');
    if (alertContainer) {
        alertContainer.innerHTML = '';
    }
}

/**
 * Escape HTML special characters to prevent XSS - Phase 4.4
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') {
        return String(text);
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Show/hide loading spinner - Phase 4.4
 * @param {boolean} show - Whether to show spinner
 * @param {string} message - Optional message to display
 * @returns {void}
 */
export function setLoadingSpinner(show, message = '') {
    const spinner = document.querySelector('#loading-spinner');
    const message_el = document.querySelector('#loading-message');
    
    if (!spinner) {
        return;
    }
    
    if (show) {
        spinner.style.display = 'flex';
        if (message_el) {
            message_el.textContent = message;
        }
    } else {
        spinner.style.display = 'none';
    }
}

/**
 * Format file size for display - Phase 4.4
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ==================== Phase 4.2: UI Update Handlers ====================

/**
 * Update import section UI based on state - Phase 4.2.1
 * @param {Object} state - Current application state
 * @returns {void}
 */
export function updateImportUI(state) {
    const {
        ui: { import: importState },
        protokollData
    } = state;
    
    // Select DOM elements
    const fileInput = document.querySelector('#file-input');
    const importButton = document.querySelector('#import-button');
    const importStatus = document.querySelector('#import-status');
    const importMessage = document.querySelector('#import-message');
    const importSummary = document.querySelector('#import-summary');
    const generateButton = document.querySelector('#generate-button');
    
    if (!fileInput || !importStatus) {
        console.warn('Import UI elements not found in DOM');
        return;
    }
    
    // Update status indicator
    updateStatusIndicator(importStatus, importState.status);
    
    // Update message
    if (importMessage) {
        importMessage.textContent = importState.message;
        importMessage.className = `import-message status-${importState.status}`;
    }
    
    // Update summary display
    if (importSummary && protokollData && protokollData.metadata) {
        const { metadata, positionen } = protokollData;
        
        importSummary.innerHTML = `
            <div class="summary-item">
                <span class="label">Order Number:</span>
                <span class="value">${escapeHtml(metadata.orderNumber || 'N/A')}</span>
            </div>
            <div class="summary-item">
                <span class="label">Protocol Number:</span>
                <span class="value">${escapeHtml(metadata.protocolNumber || 'N/A')}</span>
            </div>
            <div class="summary-item">
                <span class="label">Plant (Anlage):</span>
                <span class="value">${escapeHtml(metadata.plant || 'N/A')}</span>
            </div>
            <div class="summary-item">
                <span class="label">Location (Einsatzort):</span>
                <span class="value">${escapeHtml(metadata.location || 'N/A')}</span>
            </div>
            <div class="summary-item">
                <span class="label">Date:</span>
                <span class="value">${escapeHtml(metadata.date || 'N/A')}</span>
            </div>
            <div class="summary-item">
                <span class="label">Positions Extracted:</span>
                <span class="value">${positionen.length}</span>
            </div>
        `;
        importSummary.style.display = 'block';
    } else if (importSummary) {
        importSummary.style.display = 'none';
    }
    
    // Update button states
    if (importButton) {
        importButton.disabled = importState.status === 'pending';
        importButton.textContent = importState.status === 'pending'
            ? 'Processing...'
            : 'Import File';
    }
    
    // Enable/disable generate button based on successful import
    if (generateButton) {
        generateButton.disabled = !protokollData || !protokollData.metadata;
    }
}

/**
 * Update generate section UI based on state - Phase 4.2.2
 * @param {Object} state - Current application state
 * @returns {void}
 */
export function updateGenerateUI(state) {
    const {
        ui: { generate: generateState },
        abrechnungData
    } = state;
    
    // Select DOM elements
    const generateButton = document.querySelector('#generate-button');
    const generateStatus = document.querySelector('#generate-status');
    const generateMessage = document.querySelector('#generate-message');
    const generateSummary = document.querySelector('#generate-summary');
    const exportButton = document.querySelector('#export-button');
    
    if (!generateButton || !generateStatus) {
        console.warn('Generate UI elements not found in DOM');
        return;
    }
    
    // Update status indicator
    updateStatusIndicator(generateStatus, generateState.status);
    
    // Update message
    if (generateMessage) {
        generateMessage.textContent = generateState.message;
        generateMessage.className = `generate-message status-${generateState.status}`;
    }
    
    // Update generation summary
    if (generateSummary && abrechnungData && abrechnungData.header) {
        const { header, positionen } = abrechnungData;
        const totalQuantity = Object.values(positionen).reduce((sum, q) => sum + q, 0);
        
        generateSummary.innerHTML = `
            <div class="summary-item">
                <span class="label">Unique Positions:</span>
                <span class="value">${Object.keys(positionen).length}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Quantity:</span>
                <span class="value">${totalQuantity.toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Generation Time:</span>
                <span class="value">${generateState.generationTimeMs}ms</span>
            </div>
            <div class="summary-item">
                <span class="label">Status:</span>
                <span class="value status-${generateState.status}">${generateState.status}</span>
            </div>
        `;
        generateSummary.style.display = 'block';
    } else if (generateSummary) {
        generateSummary.style.display = 'none';
    }
    
    // Update button states
    if (generateButton) {
        generateButton.disabled = generateState.status === 'pending';
        generateButton.textContent = generateState.status === 'pending'
            ? 'Generating...'
            : 'Generate Abrechnung';
    }
    
    // Enable/disable export button based on successful generation
    if (exportButton) {
        exportButton.disabled = !abrechnungData || !abrechnungData.header;
    }
}

/**
 * Update export section UI based on state - Phase 4.2.3
 * @param {Object} state - Current application state
 * @returns {void}
 */
export function updateExportUI(state) {
    const {
        ui: { export: exportState }
    } = state;
    
    // Select DOM elements
    const exportButton = document.querySelector('#export-button');
    const exportStatus = document.querySelector('#export-status');
    const exportMessage = document.querySelector('#export-message');
    const exportHistory = document.querySelector('#export-history');
    
    if (!exportButton || !exportStatus) {
        console.warn('Export UI elements not found in DOM');
        return;
    }
    
    // Update status indicator
    updateStatusIndicator(exportStatus, exportState.status);
    
    // Update message
    if (exportMessage) {
        exportMessage.textContent = exportState.message;
        exportMessage.className = `export-message status-${exportState.status}`;
    }
    
    // Update export history
    if (exportHistory && exportState.lastExportAt) {
        const exportDate = new Date(exportState.lastExportAt);
        const dateStr = exportDate.toLocaleString();
        const sizeKB = (exportState.lastExportSize / 1024).toFixed(2);
        
        exportHistory.innerHTML = `
            <div class="export-item">
                <span class="label">Last Export:</span>
                <span class="value">${dateStr}</span>
            </div>
            <div class="export-item">
                <span class="label">File Size:</span>
                <span class="value">${sizeKB} KB</span>
            </div>
        `;
        exportHistory.style.display = 'block';
    } else if (exportHistory) {
        exportHistory.style.display = 'none';
    }
    
    // Update button state
    if (exportButton) {
        exportButton.disabled = exportState.status === 'pending';
        exportButton.textContent = exportState.status === 'pending'
            ? 'Exporting...'
            : 'Export to Excel';
    }
}

/**
 * Helper to update status indicator element - Phase 4.2
 * @param {HTMLElement} element - Status element to update
 * @param {string} status - Status value ('idle', 'pending', 'success', 'error')
 */
function updateStatusIndicator(element, status) {
    // Remove all status classes
    element.className = 'status-indicator';
    
    // Add current status class
    element.classList.add(`status-${status}`);
    
    // Set indicator text
    const statusText = {
        idle: '○',
        pending: '⟳',
        success: '✓',
        error: '✕'
    };
    
    element.textContent = statusText[status] || '○';
    element.title = status.charAt(0).toUpperCase() + status.slice(1);
}

// ==================== Phase 4.3: Event Binding & Initialization ====================

/**
 * Initialize all event listeners for user interactions and state changes - Phase 4.3.1
 * @returns {void}
 */
export function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // File input handler
    const fileInput = document.querySelector('#file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✓ File input listener bound');
    } else {
        console.warn('File input (#file-input) not found in DOM');
    }
    
    // Generate button handler
    const generateButton = document.querySelector('#generate-button');
    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateAbrechnung);
        console.log('✓ Generate button listener bound');
    } else {
        console.warn('Generate button (#generate-button) not found in DOM');
    }
    
    // Export button handler
    const exportButton = document.querySelector('#export-button');
    if (exportButton) {
        exportButton.addEventListener('click', handleExportAbrechnung);
        console.log('✓ Export button listener bound');
    } else {
        console.warn('Export button (#export-button) not found in DOM');
    }
    
    // Reset button handler (optional)
    const resetButton = document.querySelector('#reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', handleResetApplication);
        console.log('✓ Reset button listener bound');
    }
    
    // Import button handler - trigger import when button is clicked
    const importButton = document.querySelector('#import-button');
    if (importButton) {
        importButton.addEventListener('click', handleImportFile);
        console.log('✓ Import button listener bound');
    }
    
    // State change listener - updates UI reactively
    subscribe((state) => {
        console.log('State changed - updating UI');
        updateImportUI(state);
        updateGenerateUI(state);
        updateExportUI(state);
    });
    
    console.log('Event listeners initialized');
}
