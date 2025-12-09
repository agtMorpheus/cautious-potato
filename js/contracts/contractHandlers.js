/**
 * Contract Handlers Module (Phase 1)
 * 
 * Handles user interactions for the Contract Manager module
 * Coordinates between UI, state, and utilities
 * 
 * Phase 1 implements:
 * - File input handling for contract Excel files
 * - Sheet selection and column mapping change handlers
 * - Import confirmation handler
 * - Filter change handlers
 */

import { getState, setState } from '../state.js';
import {
    discoverContractSheets,
    suggestContractColumnMapping,
    extractContractsFromSheet,
    getContractSummary,
    DEFAULT_COLUMN_MAPPING
} from './contractUtils.js';
import { showErrorAlert, showSuccessAlert, escapeHtml } from '../handlers.js';

// Store selected contract file reference (not persisted in state)
let selectedContractFile = null;

/**
 * Handle contract file input change
 * @param {Event} event - File input change event
 */
export function handleContractFileSelect(event) {
    const file = event.target.files[0];
    const importBtn = document.getElementById('contract-import-button');
    
    if (file) {
        // Validate file type
        const validExtensions = ['.xlsx', '.xls'];
        const hasValidExtension = validExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
            showErrorAlert(
                'Ungültiges Dateiformat',
                'Bitte wählen Sie eine .xlsx oder .xls Datei.'
            );
            selectedContractFile = null;
            if (importBtn) {
                importBtn.disabled = true;
            }
            return;
        }
        
        // Store file reference locally
        selectedContractFile = file;
        
        // Update state with file info
        updateContractImportStatus({
            currentFile: file.name,
            fileSize: file.size,
            status: 'idle',
            message: '',
            progress: 0
        });
        
        // Enable import button
        if (importBtn) {
            importBtn.disabled = false;
        }
        
        // Automatically discover sheets
        handleDiscoverSheets(file);
        
    } else {
        // Reset state
        selectedContractFile = null;
        
        if (importBtn) {
            importBtn.disabled = true;
        }
        
        updateContractImportStatus({
            currentFile: null,
            fileSize: 0,
            status: 'idle',
            message: '',
            progress: 0
        });
    }
}

/**
 * Discover sheets in the uploaded file
 * @param {File} file - Excel file to analyze
 */
async function handleDiscoverSheets(file) {
    try {
        updateContractImportStatus({
            status: 'pending',
            message: `Analysiere ${file.name}...`,
            progress: 10
        });
        
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Discover sheets and columns
        const discoveredSheets = discoverContractSheets(workbook);
        
        // Update state with discovered sheets
        const state = getState();
        setState({
            contracts: {
                ...state.contracts,
                rawSheets: discoveredSheets,
                importState: {
                    ...state.contracts?.importState,
                    status: 'idle',
                    message: `${Object.keys(discoveredSheets).length} Arbeitsblätter gefunden`,
                    progress: 100
                }
            }
        });
        
        // Store workbook reference for later use
        window._contractWorkbook = workbook;
        
        console.log('Contract sheets discovered:', Object.keys(discoveredSheets));
        
    } catch (error) {
        console.error('Error discovering sheets:', error);
        showErrorAlert(
            'Analysefehler',
            `Fehler beim Analysieren der Datei: ${error.message}`
        );
        
        updateContractImportStatus({
            status: 'error',
            message: `Fehler: ${error.message}`,
            progress: 0
        });
    }
}

/**
 * Handle sheet selection change
 * @param {Event} event - Select change event
 */
export function handleContractSheetSelect(event) {
    const selectedSheet = event.target.value;
    
    if (!selectedSheet) {
        return;
    }
    
    const state = getState();
    const rawSheets = state.contracts?.rawSheets || {};
    const sheetInfo = rawSheets[selectedSheet];
    
    if (!sheetInfo) {
        console.warn('Selected sheet not found in discovered sheets');
        return;
    }
    
    // Suggest column mapping based on discovered columns
    const suggestedMapping = suggestContractColumnMapping(sheetInfo.columns);
    
    // Update state with current mapping
    setState({
        contracts: {
            ...state.contracts,
            currentMapping: suggestedMapping,
            importState: {
                ...state.contracts?.importState,
                currentSheet: selectedSheet,
                message: `${sheetInfo.rowCount} Zeilen in "${selectedSheet}"`
            }
        }
    });
    
    console.log('Sheet selected:', selectedSheet, 'with', sheetInfo.rowCount, 'rows');
    console.log('Suggested mapping:', suggestedMapping);
}

/**
 * Handle column mapping change
 * @param {string} field - Field name being mapped
 * @param {string} column - Excel column letter
 */
export function handleContractMappingChange(field, column) {
    const state = getState();
    const currentMapping = state.contracts?.currentMapping || { ...DEFAULT_COLUMN_MAPPING };
    
    // Update the mapping for this field
    currentMapping[field] = {
        ...currentMapping[field],
        excelColumn: column
    };
    
    setState({
        contracts: {
            ...state.contracts,
            currentMapping
        }
    });
    
    console.log(`Mapping changed: ${field} -> ${column}`);
}

/**
 * Handle contract import confirmation
 * @returns {Promise<void>}
 */
export async function handleContractImportConfirm() {
    const state = getState();
    const workbook = window._contractWorkbook;
    
    if (!workbook) {
        showErrorAlert(
            'Keine Datei',
            'Bitte laden Sie zuerst eine Excel-Datei hoch.'
        );
        return;
    }
    
    const currentSheet = state.contracts?.importState?.currentSheet;
    
    if (!currentSheet) {
        showErrorAlert(
            'Kein Arbeitsblatt',
            'Bitte wählen Sie ein Arbeitsblatt aus.'
        );
        return;
    }
    
    const currentMapping = state.contracts?.currentMapping || DEFAULT_COLUMN_MAPPING;
    
    try {
        updateContractImportStatus({
            status: 'pending',
            message: `Importiere Verträge aus "${currentSheet}"...`,
            progress: 20
        });
        
        const startTime = performance.now();
        
        // Extract contracts using the mapping
        const result = extractContractsFromSheet(workbook, currentSheet, currentMapping);
        
        updateContractImportStatus({ progress: 60 });
        
        // Get summary statistics
        const summary = getContractSummary(result.contracts);
        
        const elapsedMs = performance.now() - startTime;
        
        // Update state with imported contracts
        const existingRecords = state.contracts?.records || [];
        const newRecords = [...existingRecords, ...result.contracts];
        
        // Update imported files list
        const existingFiles = state.contracts?.importedFiles || [];
        const newFileEntry = {
            fileName: state.contracts?.importState?.currentFile || 'unknown',
            size: state.contracts?.importState?.fileSize || 0,
            importedAt: new Date().toISOString(),
            sheets: [currentSheet],
            recordsImported: result.contracts.length,
            recordsWithErrors: result.errors.length
        };
        
        setState({
            contracts: {
                ...state.contracts,
                importedFiles: [...existingFiles, newFileEntry],
                records: newRecords,
                importState: {
                    ...state.contracts?.importState,
                    isImporting: false,
                    status: 'success',
                    message: `${result.contracts.length} Verträge importiert`,
                    progress: 100,
                    errors: result.errors,
                    warnings: result.warnings
                }
            }
        });
        
        // Log results
        console.log(`Import completed in ${elapsedMs.toFixed(2)}ms`);
        console.log(`Imported: ${result.contracts.length}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
        console.log('Summary:', summary);
        
        // Show success message
        if (result.errors.length > 0) {
            showSuccessAlert(
                'Import mit Warnungen',
                `${result.contracts.length} Verträge importiert, ${result.errors.length} Fehler`
            );
        } else {
            showSuccessAlert(
                'Import erfolgreich',
                `${result.contracts.length} Verträge wurden importiert`
            );
        }
        
        // Clear workbook reference
        delete window._contractWorkbook;
        
    } catch (error) {
        console.error('Import failed:', error);
        
        updateContractImportStatus({
            status: 'error',
            message: `Import fehlgeschlagen: ${error.message}`,
            progress: 0,
            errors: [error.message]
        });
        
        showErrorAlert(
            'Import-Fehler',
            `Der Import ist fehlgeschlagen: ${error.message}`
        );
    }
}

/**
 * Handle filter change for contract list
 * @param {string} filterName - Name of the filter (e.g., 'status', 'contractId')
 * @param {*} value - Filter value
 */
export function handleContractFilterChange(filterName, value) {
    const state = getState();
    const currentFilters = state.contracts?.filters || {};
    
    setState({
        contracts: {
            ...state.contracts,
            filters: {
                ...currentFilters,
                [filterName]: value || null
            }
        }
    });
    
    console.log(`Filter changed: ${filterName} = ${value}`);
}

/**
 * Handle search text change
 * @param {string} searchText - Search query text
 */
export function handleContractSearch(searchText) {
    handleContractFilterChange('searchText', searchText);
}

/**
 * Clear all contract filters
 */
export function handleClearContractFilters() {
    const state = getState();
    
    setState({
        contracts: {
            ...state.contracts,
            filters: {
                contractId: null,
                status: null,
                location: null,
                equipmentId: null,
                dateRange: { from: null, to: null },
                searchText: ''
            }
        }
    });
    
    console.log('All contract filters cleared');
}

/**
 * Reset contract module state
 */
export function handleResetContracts() {
    const confirmed = confirm(
        'Möchten Sie wirklich alle importierten Verträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
    );
    
    if (!confirmed) {
        console.log('Contract reset cancelled by user');
        return;
    }
    
    const state = getState();
    
    setState({
        contracts: {
            importedFiles: [],
            rawSheets: {},
            currentMapping: { ...DEFAULT_COLUMN_MAPPING },
            records: [],
            filters: {
                contractId: null,
                status: null,
                location: null,
                equipmentId: null,
                dateRange: { from: null, to: null },
                searchText: ''
            },
            importState: {
                isImporting: false,
                currentFile: null,
                currentSheet: null,
                progress: 0,
                status: 'idle',
                message: '',
                errors: [],
                warnings: []
            }
        }
    });
    
    // Clear workbook reference
    delete window._contractWorkbook;
    selectedContractFile = null;
    
    console.log('Contract module reset complete');
}

/**
 * Helper function to update contract import status
 * @param {Object} partial - Partial import status updates
 */
function updateContractImportStatus(partial) {
    const state = getState();
    
    setState({
        contracts: {
            ...state.contracts,
            importState: {
                ...state.contracts?.importState,
                ...partial
            }
        }
    });
}

/**
 * Initialize contract event listeners
 * Should be called from main.js during app initialization
 */
export function initializeContractEventListeners() {
    console.log('Initializing contract event listeners...');
    
    // File input handler
    const fileInput = document.getElementById('contract-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleContractFileSelect);
        console.log('✓ Contract file input listener bound');
    }
    
    // Sheet selector handler
    const sheetSelector = document.getElementById('contract-sheet-select');
    if (sheetSelector) {
        sheetSelector.addEventListener('change', handleContractSheetSelect);
        console.log('✓ Contract sheet selector listener bound');
    }
    
    // Import button handler
    const importButton = document.getElementById('contract-import-button');
    if (importButton) {
        importButton.addEventListener('click', handleContractImportConfirm);
        console.log('✓ Contract import button listener bound');
    }
    
    // Reset button handler
    const resetButton = document.getElementById('contract-reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', handleResetContracts);
        console.log('✓ Contract reset button listener bound');
    }
    
    // Search input handler
    const searchInput = document.getElementById('contract-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleContractSearch(e.target.value));
        console.log('✓ Contract search input listener bound');
    }
    
    // Status filter handler
    const statusFilter = document.getElementById('contract-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => handleContractFilterChange('status', e.target.value));
        console.log('✓ Contract status filter listener bound');
    }
    
    // Clear filters button handler
    const clearFiltersBtn = document.getElementById('contract-clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', handleClearContractFilters);
        console.log('✓ Contract clear filters button listener bound');
    }
    
    console.log('Contract event listeners initialized');
}
