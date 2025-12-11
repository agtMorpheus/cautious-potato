/**
 * Contract Handlers Module (Phase 1 & Phase 3)
 * 
 * Handles user interactions for the Contract Manager module
 * Coordinates between UI, state, and utilities
 * 
 * Phase 1 implements:
 * - File input handling for contract Excel files
 * - Sheet selection and column mapping change handlers
 * - Import confirmation handler
 * - Filter change handlers
 * 
 * Phase 3 implements:
 * - Preview generation (handleContractMappingConfirm)
 * - Final import save (handleContractImportSave)
 * - Filter changes with date range (handleContractFilterChange)
 * - Table sorting (handleContractSort)
 * - Action clicks for inline editing (handleContractActionClick)
 */

import { getState, setState, setLastImportResult, setContractUIState, setContractFilters } from '../state.js';
import {
    discoverContractSheets,
    suggestContractColumnMapping,
    extractContractsFromSheet,
    extractContractsFromSheetAsync,
    getContractSummary,
    DEFAULT_COLUMN_MAPPING,
    normalizeStatus,
    VALID_STATUS_VALUES
} from './contractUtils.js';
import { addContracts, updateContract } from './contractRepository.js';
import { showErrorAlert, showSuccessAlert, escapeHtml, setupDragAndDrop, setupClickAndKeyboard } from '../handlers.js';
import { highlightPreviewRow, openContractModal } from './contractRenderer.js';

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
 * Handle contract subview change (Import vs List)
 * @param {string} subview - 'list' or 'import'
 */
export function handleContractSubviewChange(subview) {
    // Update UI active state for buttons
    const buttons = document.querySelectorAll('.sub-nav-btn');
    buttons.forEach(btn => {
        if (btn.dataset.subview === subview) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update visibility of subview containers
    const containers = document.querySelectorAll('.subview-container');
    containers.forEach(container => {
        container.classList.remove('active');
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => {
            if (container.id === `contract-subview-${subview}`) {
                container.classList.add('active');
            }
        }, 10);
    });

    // Explicitly show the target container immediately to prevent flickering
    const targetContainer = document.getElementById(`contract-subview-${subview}`);
    if (targetContainer) {
        targetContainer.classList.add('active');
    }

    console.log(`Switched to contract subview: ${subview}`);
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

    // Enhance Contract File Drop Zone
    setupDragAndDrop('contract-file-drop-zone', 'contract-file-input');
    setupClickAndKeyboard('contract-file-drop-zone', 'contract-file-input');

    // Sheet selector handler
    const sheetSelector = document.getElementById('contract-sheet-select');
    if (sheetSelector) {
        sheetSelector.addEventListener('change', handleContractSheetSelect);
        console.log('✓ Contract sheet selector listener bound');
    }

    // Import button handler (now generates preview)
    const importButton = document.getElementById('contract-import-button');
    if (importButton) {
        importButton.addEventListener('click', handleContractMappingConfirm);
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

    // Date range filter handlers (Phase 3)
    const filterFrom = document.getElementById('contract-filter-from');
    if (filterFrom) {
        filterFrom.addEventListener('change', (e) => handleContractDateRangeChange('from', e.target.value));
        console.log('✓ Contract date from filter listener bound');
    }

    const filterTo = document.getElementById('contract-filter-to');
    if (filterTo) {
        filterTo.addEventListener('change', (e) => handleContractDateRangeChange('to', e.target.value));
        console.log('✓ Contract date to filter listener bound');
    }

    // Clear filters button handler
    const clearFiltersBtn = document.getElementById('contract-clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', handleClearContractFilters);
        console.log('✓ Contract clear filters button listener bound');
    }

    // Set up global handler references for dynamically rendered elements (Phase 3)
    window._handleContractSort = handleContractSort;
    window._handleContractActionClick = handleContractActionClick;
    window._handleContractImportSave = handleContractImportSave;
    window._handleContractCancelPreview = handleContractCancelPreview;
    window._highlightPreviewRow = highlightPreviewRow;
    window._handleContractStatusChange = handleContractStatusChange;
    window._handleContractWorkerChange = handleContractWorkerChange;

    // Sub-nav tab handlers
    const subNavButtons = document.querySelectorAll('.sub-nav-btn');
    subNavButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const subview = btn.dataset.subview;
            if (subview) {
                handleContractSubviewChange(subview);
            }
        });
    });
    console.log(`✓ Contract sub-nav listeners bound (${subNavButtons.length})`);

    // Refresh button handler
    const refreshBtn = document.getElementById('contract-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Re-render the table using current state
            // We can trigger a filter update to force refresh
            const state = getState();
            const currentFilters = state.contracts?.filters || {};
            // Triggering a "fake" filter change to re-render
            setContractFilters({ ...currentFilters });
            console.log('Refreshing contract list...');
        });
        console.log('✓ Contract refresh button listener bound');
    }

    console.log('Contract event listeners initialized (Phase 3)');
}

// ============================================================
// Phase 3: Preview & Import Save Handlers
// ============================================================

/**
 * Handle mapping confirmation and generate preview (Phase 3)
 * Replaces direct import with a preview step
 */
export async function handleContractMappingConfirm() {
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
            message: `Vorschau wird generiert für "${currentSheet}"...`,
            progress: 10
        });

        const startTime = performance.now();

        // Use async extraction with progress callback
        const result = await extractContractsFromSheetAsync(
            workbook,
            currentSheet,
            currentMapping,
            {
                skipInvalidRows: true,
                onProgress: (progress) => {
                    const percent = Math.round((progress.processed / progress.total) * 80) + 10;
                    updateContractImportStatus({ progress: percent });
                }
            }
        );

        const elapsedMs = performance.now() - startTime;

        // Store preview result in state (don't save to records yet)
        setState({
            contracts: {
                ...state.contracts,
                lastImportResult: result,
                importState: {
                    ...state.contracts?.importState,
                    status: 'success',
                    message: `Vorschau: ${result.contracts.length} Verträge, ${result.errors.length} Fehler`,
                    progress: 100
                }
            }
        });

        console.log(`Preview generated in ${elapsedMs.toFixed(2)}ms`);
        console.log(`Contracts: ${result.contracts.length}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);

        // Show preview container
        const previewContainer = document.getElementById('contract-preview-container');
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }

    } catch (error) {
        console.error('Preview generation failed:', error);

        updateContractImportStatus({
            status: 'error',
            message: `Vorschau fehlgeschlagen: ${error.message}`,
            progress: 0,
            errors: [error.message]
        });

        showErrorAlert(
            'Vorschau-Fehler',
            `Die Vorschau konnte nicht generiert werden: ${error.message}`
        );
    }
}

/**
 * Handle final import save after preview confirmation (Phase 3)
 */
export async function handleContractImportSave() {
    const state = getState();
    const lastImportResult = state.contracts?.lastImportResult;

    if (!lastImportResult || !lastImportResult.contracts || lastImportResult.contracts.length === 0) {
        showErrorAlert(
            'Keine Verträge',
            'Es gibt keine Verträge zum Speichern.'
        );
        return;
    }

    try {
        updateContractImportStatus({
            status: 'pending',
            message: 'Verträge werden gespeichert...',
            progress: 50
        });

        // Get file metadata
        const fileMeta = {
            fileName: state.contracts?.importState?.currentFile || 'unknown.xlsx',
            size: state.contracts?.importState?.fileSize || 0,
            importedAt: new Date().toISOString(),
            recordsImported: lastImportResult.contracts.length,
            recordsWithErrors: lastImportResult.errors.length
        };

        // Save contracts using repository
        const addResult = addContracts(lastImportResult.contracts, fileMeta);

        // Update import state to show success
        updateContractImportStatus({
            isImporting: false,
            status: 'success',
            message: `${addResult.addedCount} Verträge erfolgreich gespeichert`,
            progress: 100,
            errors: [],
            warnings: []
        });

        // Clear the preview result (contracts are already saved by addContracts)
        const currentState = getState();
        setState({
            contracts: {
                ...currentState.contracts,
                lastImportResult: null
            }
        });

        // Clear workbook reference
        delete window._contractWorkbook;

        // Hide preview container
        const previewContainer = document.getElementById('contract-preview-container');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }

        // Reset file input
        const fileInput = document.getElementById('contract-file-input');
        if (fileInput) {
            fileInput.value = '';
        }

        showSuccessAlert(
            'Import erfolgreich',
            `${addResult.addedCount} Verträge wurden erfolgreich importiert.`
        );

        console.log(`Import completed: ${addResult.addedCount} contracts saved`);

    } catch (error) {
        console.error('Import save failed:', error);

        updateContractImportStatus({
            status: 'error',
            message: `Speichern fehlgeschlagen: ${error.message}`,
            progress: 0
        });

        showErrorAlert(
            'Speicher-Fehler',
            `Die Verträge konnten nicht gespeichert werden: ${error.message}`
        );
    }
}

/**
 * Handle preview cancellation (Phase 3)
 */
export function handleContractCancelPreview() {
    const state = getState();

    setState({
        contracts: {
            ...state.contracts,
            lastImportResult: null,
            importState: {
                ...state.contracts?.importState,
                status: 'idle',
                message: 'Import abgebrochen',
                progress: 0
            }
        }
    });

    // Hide preview container
    const previewContainer = document.getElementById('contract-preview-container');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    console.log('Import preview cancelled');
}

// ============================================================
// Phase 3: Sorting & Actions Handlers
// ============================================================

/**
 * Handle contract table sorting (Phase 3)
 * @param {string} sortKey - Field name to sort by
 */
export function handleContractSort(sortKey) {
    const state = getState();
    const currentSortKey = state.contracts?.ui?.sortKey || 'contractId';
    const currentSortDir = state.contracts?.ui?.sortDir || 'asc';

    // Toggle direction if clicking same column
    let newSortDir = 'asc';
    if (sortKey === currentSortKey) {
        newSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    }

    setState({
        contracts: {
            ...state.contracts,
            ui: {
                ...state.contracts?.ui,
                sortKey,
                sortDir: newSortDir
            }
        }
    });

    console.log(`Sort changed: ${sortKey} ${newSortDir}`);
}

/**
 * Handle contract action click (Phase 3)
 * @param {string} action - Action type ('edit', 'delete', etc.)
 * @param {string} contractId - Contract ID
 */
export function handleContractActionClick(action, contractId) {
    console.log(`Contract action: ${action} for ${contractId}`);

    switch (action) {
        case 'view':
            handleContractView(contractId);
            break;
        case 'edit':
            handleContractEdit(contractId);
            break;
        case 'delete':
            handleContractDelete(contractId);
            break;
        default:
            console.warn(`Unknown contract action: ${action}`);
    }
}

/**
 * Handle contract view (Phase 6 - Detail Modal)
 * @param {string} contractId - Contract ID
 */
export function handleContractView(contractId) {
    const state = getState();
    const contracts = state.contracts?.records || [];
    const contract = contracts.find(c => c.id === contractId);

    if (!contract) {
        showErrorAlert('Fehler', 'Vertrag nicht gefunden');
        return;
    }

    openContractModal(contract);
}

/**
 * Handle contract edit (Phase 3)
 * Opens inline editor or modal for editing contract fields
 * @param {string} contractId - Contract ID to edit
 */
export function handleContractEdit(contractId) {
    const state = getState();
    const contracts = state.contracts?.records || [];
    const contract = contracts.find(c => c.id === contractId);

    if (!contract) {
        showErrorAlert('Fehler', 'Vertrag nicht gefunden');
        return;
    }

    // Simple inline editing via prompt (can be enhanced with modal later)
    const newStatus = prompt(
        `Status bearbeiten für Vertrag ${contract.contractId}:`,
        contract.status || ''
    );

    if (newStatus !== null && newStatus !== contract.status) {
        // Normalize the status value using the existing normalizeStatus function
        const normalizedStatus = normalizeStatus(newStatus);

        // Update contract via repository
        const updated = updateContract(contractId, { status: normalizedStatus });

        if (updated) {
            showSuccessAlert('Aktualisiert', `Status wurde auf "${normalizedStatus}" geändert.`);
            console.log(`Contract ${contractId} updated: status = ${normalizedStatus}`);
        } else {
            showErrorAlert('Fehler', 'Vertrag konnte nicht aktualisiert werden.');
        }
    }
}

/**
 * Handle contract delete (Phase 3 - placeholder for future implementation)
 * @param {string} contractId - Contract ID to delete
 */
export function handleContractDelete(contractId) {
    // Placeholder - deletion would require confirmation dialog
    console.log(`Delete contract ${contractId} - not implemented yet`);
    showErrorAlert('Nicht verfügbar', 'Löschen ist in dieser Version nicht verfügbar.');
}

/**
 * Handle date range filter change (Phase 3)
 * @param {string} type - 'from' or 'to'
 * @param {string} value - Date string
 */
export function handleContractDateRangeChange(type, value) {
    const state = getState();
    const currentDateRange = state.contracts?.filters?.dateRange || { from: null, to: null };

    setState({
        contracts: {
            ...state.contracts,
            filters: {
                ...state.contracts?.filters,
                dateRange: {
                    ...currentDateRange,
                    [type]: value || null
                }
            }
        }
    });

    console.log(`Date range filter changed: ${type} = ${value}`);
}

/**
 * Handle contract status change from dropdown (Phase 3)
 * @param {string} contractId - Contract UUID
 * @param {string} newStatus - New status value
 */
export function handleContractStatusChange(contractId, newStatus) {
    console.log(`Status change: ${contractId} -> ${newStatus}`);

    // Validate status value (VALID_STATUS_VALUES is imported from contractUtils.js at top of file)
    if (!VALID_STATUS_VALUES.includes(newStatus)) {
        showErrorAlert('Ungültiger Status', `Der Status "${newStatus}" ist nicht gültig.`);
        return;
    }

    // Update contract via repository
    const updated = updateContract(contractId, { status: newStatus });

    if (updated) {
        console.log(`Contract ${contractId} status updated to: ${newStatus}`);
        // No need to show success alert for every status change (too intrusive)
        // The UI will update automatically via state subscription
    } else {
        showErrorAlert('Fehler', 'Vertrag konnte nicht aktualisiert werden.');
    }
}

/**
 * Handle contract worker assignment change from dropdown
 * Assigns or unassigns a worker (employee) to/from a contract
 * @param {string} contractId - Contract UUID
 * @param {string} workerId - Worker/Employee ID (empty string to unassign)
 */
export function handleContractWorkerChange(contractId, workerId) {
    console.log(`Worker assignment change: ${contractId} -> ${workerId || '(unassigned)'}`);

    // Allow empty string to unassign worker
    const assignedWorkerId = workerId || null;

    // Update contract via repository
    const updated = updateContract(contractId, { assignedWorkerId });

    if (updated) {
        console.log(`Contract ${contractId} worker updated to: ${assignedWorkerId || '(none)'}`);
        // No need to show success alert for every assignment change (too intrusive)
        // The UI will update automatically via state subscription
    } else {
        showErrorAlert('Fehler', 'Mitarbeiterzuweisung konnte nicht aktualisiert werden.');
    }
}
