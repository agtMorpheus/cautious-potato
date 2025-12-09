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
// NOTE: Using window global as specified in roadmap_phase4.md line 259:
// "Store workbook in window for export step (Phase 4)"
// This is required because workbooks can't be serialized to state/localStorage
window._currentWorkbook = null;

/**
 * Handle file input change (Phase 5)
 * @param {Event} event - File input change event
 */
export function handleFileSelect(event) {
    const file = event.target.files[0];
    const importBtn = document.getElementById('import-button');
    
    if (file) {
        // Enable import button
        if (importBtn) {
            importBtn.disabled = false;
        }
        
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
        // Disable import button
        if (importBtn) {
            importBtn.disabled = true;
        }
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
        // Map German field names from parseProtokollMetadata to English field names expected by createExportWorkbook
        const workbook = await utils.createExportWorkbook({
            header: {
                date: metadata.datum,
                orderNumber: metadata.auftragsNr,
                plant: metadata.anlage,
                location: metadata.einsatzort
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
                    date: metadata.datum,
                    orderNumber: metadata.auftragsNr,
                    plant: metadata.anlage,
                    location: metadata.einsatzort
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

// ==================== Phase 4.3 / Phase 5: Event Binding & Initialization ====================

/**
 * Initialize all event listeners for user interactions and state changes
 * Phase 5: Accepts optional handlers object for flexibility
 * @param {Object} handlers - Optional object containing handler functions
 * @returns {void}
 */
export function initializeEventListeners(handlers = {}) {
    console.log('Initializing event listeners...');
    
    // Use provided handlers or fall back to module functions
    const {
        onImport = handleImportFile,
        onGenerate = handleGenerateAbrechnung,
        onExport = handleExportAbrechnung,
        onReset = handleResetApplication
    } = handlers;
    
    // File input handler
    const fileInput = document.querySelector('#file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✓ File input listener bound');
    } else {
        console.warn('File input (#file-input) not found in DOM');
    }
    
    // Import button handler
    const importButton = document.querySelector('#import-button');
    if (importButton) {
        importButton.addEventListener('click', onImport);
        console.log('✓ Import button listener bound');
    } else {
        console.warn('Import button (#import-button) not found in DOM');
    }
    
    // Generate button handler
    const generateButton = document.querySelector('#generate-button');
    if (generateButton) {
        generateButton.addEventListener('click', onGenerate);
        console.log('✓ Generate button listener bound');
    } else {
        console.warn('Generate button (#generate-button) not found in DOM');
    }
    
    // Export button handler
    const exportButton = document.querySelector('#export-button');
    if (exportButton) {
        exportButton.addEventListener('click', onExport);
        console.log('✓ Export button listener bound');
    } else {
        console.warn('Export button (#export-button) not found in DOM');
    }
    
    // Reset button handler
    const resetButton = document.querySelector('#reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', onReset);
        console.log('✓ Reset button listener bound');
    } else {
        console.warn('Reset button (#reset-button) not found in DOM');
    }
    
    console.log('Event listeners initialized');
}
