/**
 * Contract Renderer Module (Phase 1 & Phase 3)
 * 
 * Handles UI rendering for the Contract Manager module
 * Provides functions to render contract lists, tables, and summaries
 * 
 * Phase 1 implements:
 * - Sheet selector rendering
 * - Column mapping UI rendering
 * - Import preview table rendering
 * - Contract list rendering (placeholder)
 * - Status indicators and progress
 * 
 * Phase 3 implements:
 * - Enhanced import panel with progress display
 * - Mapping table with editable column selection and hints
 * - Preview table with summary, errors, and row highlighting
 * - Contract list with search, filters, sorting, and actions
 * - Inline editing support
 */

import { getState, subscribe, setContractFilters } from '../state.js';
import { escapeHtml } from '../handlers.js';
import { getFilteredContracts, getContractStatistics, getUniqueFieldValues, sortContracts } from './contractRepository.js';
import { normalizeStatus, VALID_STATUS_VALUES, getContractSummary } from './contractUtils.js';

/**
 * Initialize contract UI and subscribe to state changes
 */
export function initializeContractUI() {
    console.log('Initializing Contract Manager UI...');

    // Subscribe to state changes for reactive updates
    subscribe((state) => {
        updateContractUI(state);
    });

    // Perform initial render
    const state = getState();
    updateContractUI(state);

    console.log('Contract Manager UI initialized');
}

/**
 * Update all contract UI components based on state
 * @param {Object} state - Current application state
 */
function updateContractUI(state) {
    const contractState = state.contracts;

    if (!contractState) {
        return;
    }

    // Update import section
    updateImportSection(contractState);

    // Update sheet selector
    updateSheetSelector(contractState);

    // Update mapping editor
    updateMappingEditor(contractState);

    // Update preview section (Phase 3)
    renderContractPreview(contractState);

    // Update statistics
    updateContractStatistics(contractState);

    // Update contract list with filters and sorting (Phase 3)
    renderContractList(contractState);
}

/**
 * Update the import section UI
 * @param {Object} contractState - Contracts state slice
 */
function updateImportSection(contractState) {
    const importState = contractState.importState || {};

    // Update status indicator
    const statusIndicator = document.getElementById('contract-import-status');
    if (statusIndicator) {
        updateStatusIndicator(statusIndicator, importState.status || 'idle');
    }

    // Update status message
    const statusMessage = document.getElementById('contract-import-message');
    if (statusMessage) {
        statusMessage.textContent = importState.message || 'Keine Datei ausgewählt';
    }

    // Update progress bar
    const progressBar = document.getElementById('contract-import-progress');
    if (progressBar) {
        progressBar.style.width = `${importState.progress || 0}%`;
        progressBar.setAttribute('aria-valuenow', importState.progress || 0);
    }

    // Show/hide progress container
    const progressContainer = document.getElementById('contract-progress-container');
    if (progressContainer) {
        progressContainer.style.display = importState.status === 'pending' ? 'block' : 'none';
    }

    // Update import button state
    const importButton = document.getElementById('contract-import-button');
    if (importButton) {
        const hasSheet = importState.currentSheet;
        importButton.disabled = !hasSheet || importState.status === 'pending';
    }

    // Show errors if any
    const errorContainer = document.getElementById('contract-import-errors');
    if (errorContainer) {
        if (importState.errors && importState.errors.length > 0) {
            errorContainer.innerHTML = `
                <div class="alert alert-error">
                    <strong>${importState.errors.length} Fehler beim Import:</strong>
                    <ul>
                        ${importState.errors.slice(0, 5).map(e => `<li>${escapeHtml(e)}</li>`).join('')}
                        ${importState.errors.length > 5 ? `<li>... und ${importState.errors.length - 5} weitere</li>` : ''}
                    </ul>
                </div>
            `;
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }
}

/**
 * Update the sheet selector dropdown
 * @param {Object} contractState - Contracts state slice
 */
function updateSheetSelector(contractState) {
    const selector = document.getElementById('contract-sheet-select');

    if (!selector) {
        return;
    }

    const rawSheets = contractState.rawSheets || {};
    const currentSheet = contractState.importState?.currentSheet;
    const sheetNames = Object.keys(rawSheets);

    // Clear existing options (except placeholder)
    while (selector.options.length > 1) {
        selector.remove(1);
    }

    // Add sheet options
    sheetNames.forEach(sheetName => {
        const sheetInfo = rawSheets[sheetName];
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = `${sheetName} (${sheetInfo.rowCount} Zeilen)`;
        option.selected = sheetName === currentSheet;
        selector.appendChild(option);
    });

    // Enable/disable selector
    selector.disabled = sheetNames.length === 0;
}

/**
 * Update the column mapping editor
 * @param {Object} contractState - Contracts state slice
 */
function updateMappingEditor(contractState) {
    const container = document.getElementById('contract-mapping-editor');

    if (!container) {
        return;
    }

    const currentMapping = contractState.currentMapping || {};
    const currentSheet = contractState.importState?.currentSheet;
    const rawSheets = contractState.rawSheets || {};
    const sheetInfo = currentSheet ? rawSheets[currentSheet] : null;

    // Hide if no sheet selected
    if (!sheetInfo) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    const availableColumns = sheetInfo.columns || [];

    // Build mapping editor HTML
    const mappingFields = [
        { key: 'contractId', label: 'Auftrag (Contract ID)', required: true },
        { key: 'contractTitle', label: 'Auftragskopftitel (Title)', required: true },
        { key: 'status', label: 'Status', required: true },
        { key: 'location', label: 'Standort (Location)', required: false },
        { key: 'equipmentId', label: 'Anlagennummer (Equipment ID)', required: false },
        { key: 'plannedStart', label: 'Sollstart (Planned Start)', required: false },
        { key: 'taskId', label: 'Aufgabe (Task ID)', required: false },
        { key: 'equipmentDescription', label: 'Anlagenbeschreibung', required: false }
    ];

    let html = '<div class="mapping-grid">';

    mappingFields.forEach(field => {
        const mapping = currentMapping[field.key] || {};
        const currentColumn = mapping.excelColumn || '';
        const detectedHeader = mapping.detectedHeader || '';

        html += `
            <div class="mapping-row ${field.required ? 'required' : ''}">
                <label for="mapping-${field.key}" class="mapping-label">
                    ${escapeHtml(field.label)}
                    ${field.required ? '<span class="required-mark">*</span>' : ''}
                </label>
                <select id="mapping-${field.key}" 
                        class="mapping-select" 
                        data-field="${field.key}"
                        onchange="window._handleMappingChange && window._handleMappingChange('${field.key}', this.value)">
                    <option value="">-- Nicht zugeordnet --</option>
                    ${availableColumns.map(col => `
                        <option value="${col.letter}" ${col.letter === currentColumn ? 'selected' : ''}>
                            ${col.letter}: ${col.header ? escapeHtml(col.header) : '(keine Überschrift)'}
                        </option>
                    `).join('')}
                </select>
                ${detectedHeader ? `<span class="detected-hint">Erkannt: ${escapeHtml(detectedHeader)}</span>` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Update contract statistics display
 * @param {Object} contractState - Contracts state slice
 */
function updateContractStatistics(contractState) {
    const stats = getContractStatistics();

    // Update stat cards
    const totalContractsEl = document.getElementById('stat-total-contracts');
    if (totalContractsEl) {
        totalContractsEl.textContent = stats.totalContracts.toString();
    }

    const uniqueIdsEl = document.getElementById('stat-unique-contract-ids');
    if (uniqueIdsEl) {
        uniqueIdsEl.textContent = stats.uniqueContractIds.toString();
    }

    const importedFilesEl = document.getElementById('stat-imported-files');
    if (importedFilesEl) {
        importedFilesEl.textContent = stats.totalImportedFiles.toString();
    }

    // Update status breakdown
    const statusBreakdownEl = document.getElementById('contract-status-breakdown');
    if (statusBreakdownEl && stats.byStatus) {
        const statusItems = Object.entries(stats.byStatus)
            .map(([status, count]) => `
                <div class="status-item">
                    <span class="status-badge status-${status}">${escapeHtml(status)}</span>
                    <span class="status-count">${count}</span>
                </div>
            `)
            .join('');
        statusBreakdownEl.innerHTML = statusItems || '<p class="text-muted">Keine Daten</p>';
    }
}

/**
 * Render contract preview table (Phase 3)
 * Shows imported contracts before final save with error highlighting
 * @param {Object} contractState - Contracts state slice
 */
export function renderContractPreview(contractState) {
    const previewContainer = document.getElementById('contract-preview-container');
    const previewCard = document.getElementById('contract-preview-card');

    if (!previewContainer) {
        return;
    }

    const preview = contractState.lastImportResult;

    if (!preview) {
        previewContainer.style.display = 'none';
        if (previewCard) {
            previewCard.style.display = 'none';
        }
        return;
    }

    previewContainer.style.display = 'block';
    if (previewCard) {
        previewCard.style.display = 'block';
    }

    const { contracts, errors, warnings, summary } = preview;

    // Build summary section
    const summaryHtml = `
        <div class="cm-preview-summary">
            <span class="cm-summary-item cm-summary-total">
                <strong>${summary?.successCount || contracts.length}</strong> von ${summary?.totalRows || contracts.length} Verträge
            </span>
            <span class="cm-summary-item cm-summary-errors ${errors.length > 0 ? 'has-errors' : ''}">
                <strong>${errors.length}</strong> Fehler
            </span>
            <span class="cm-summary-item cm-summary-warnings ${warnings.length > 0 ? 'has-warnings' : ''}">
                <strong>${warnings.length}</strong> Hinweise
            </span>
        </div>
    `;

    // Build preview table (limit to 100 rows for performance)
    const maxPreviewRows = 100;
    const previewRows = contracts.slice(0, maxPreviewRows);

    let tableHtml = '';
    if (previewRows.length === 0) {
        tableHtml = `
            <div class="cm-preview-empty">
                <p>Keine gültigen Verträge gefunden.</p>
            </div>
        `;
    } else {
        tableHtml = `
            <div class="data-table-container cm-preview-table-wrapper">
                <table class="data-table cm-preview-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Auftrag</th>
                            <th>Titel</th>
                            <th>Standort</th>
                            <th>Säule/Raum</th>
                            <th>Anlage</th>
                            <th>Status</th>
                            <th>Sollstart</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map((c, index) => {
            const statusClass = getStatusClass(c.status);
            const rowIndex = c.sourceFile?.rowIndex || index + 2;
            return `
                                <tr data-row-index="${rowIndex}">
                                    <td>${index + 1}</td>
                                    <td>${escapeHtml(c.contractId || '-')}</td>
                                    <td>${escapeHtml(c.contractTitle || '-')}</td>
                                    <td>${escapeHtml(c.location || '-')}</td>
                                    <td>${escapeHtml(c.roomArea || '-')}</td>
                                    <td>${escapeHtml(c.equipmentId || '-')}</td>
                                    <td><span class="status-badge ${statusClass}">${escapeHtml(c.status || '-')}</span></td>
                                    <td>${escapeHtml(c.plannedStart || '-')}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        if (contracts.length > maxPreviewRows) {
            tableHtml += `<p class="table-footer">Zeige ${maxPreviewRows} von ${contracts.length} Verträgen</p>`;
        }
    }

    // Build error list
    let errorListHtml = '';
    if (errors.length > 0) {
        errorListHtml = `
            <div class="cm-error-list">
                <h4>Fehler (${errors.length}):</h4>
                <ul>
                    ${errors.slice(0, 20).map(err => {
            const rowIndex = err.rowIndex || 'Unbekannt';
            const message = err.message || JSON.stringify(err);
            return `
                            <li class="cm-error-item" data-row-index="${rowIndex}" onclick="window._highlightPreviewRow && window._highlightPreviewRow(${rowIndex})">
                                <span class="cm-error-row">Zeile ${rowIndex}:</span>
                                <span class="cm-error-message">${escapeHtml(message)}</span>
                            </li>
                        `;
        }).join('')}
                    ${errors.length > 20 ? `<li class="cm-error-more">... und ${errors.length - 20} weitere Fehler</li>` : ''}
                </ul>
            </div>
        `;
    }

    // Build save button
    const saveButtonHtml = `
        <div class="cm-preview-actions">
            <button id="contract-save-button" class="btn btn-primary" ${contracts.length === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 8px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Verträge speichern (${contracts.length})
            </button>
            <button id="contract-cancel-preview" class="btn btn-secondary">
                Abbrechen
            </button>
        </div>
    `;

    previewContainer.innerHTML = `
        ${summaryHtml}
        ${tableHtml}
        ${errorListHtml}
        ${saveButtonHtml}
    `;

    // Wire up save and cancel buttons
    const saveBtn = document.getElementById('contract-save-button');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (window._handleContractImportSave) {
                window._handleContractImportSave();
            }
        });
    }

    const cancelBtn = document.getElementById('contract-cancel-preview');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (window._handleContractCancelPreview) {
                window._handleContractCancelPreview();
            }
        });
    }
}

/**
 * Highlight a preview row by row index (Phase 3)
 * @param {number} rowIndex - Row index to highlight
 */
export function highlightPreviewRow(rowIndex) {
    const rows = document.querySelectorAll('.cm-preview-table tbody tr');
    rows.forEach(row => {
        const r = row.dataset.rowIndex;
        row.classList.toggle('cm-row--highlight', Number(r) === Number(rowIndex));
    });

    // Scroll to the highlighted row
    const highlightedRow = document.querySelector('.cm-preview-table tbody tr.cm-row--highlight');
    if (highlightedRow) {
        highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Render the contract list with filters, sorting, and actions (Phase 3)
 * @param {Object} contractState - Contracts state slice
 */
export function renderContractList(contractState) {
    const container = document.getElementById('contract-list-container');

    if (!container) {
        return;
    }

    const filters = contractState.filters || {};
    const uiState = contractState.ui || {};
    const sortKey = uiState.sortKey || 'contractId';
    const sortDir = uiState.sortDir || 'asc';

    // Get filtered contracts
    let contracts = getFilteredContracts(filters);

    // Apply sorting
    contracts = applyContractFiltersAndSort(contracts, { ...filters, sortKey, sortDir });

    if (contracts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="empty-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Keine Verträge vorhanden</p>
                <p class="text-muted">Importieren Sie eine Excel-Datei, um Verträge anzuzeigen.</p>
            </div>
        `;
        return;
    }

    // Render contract table with sortable headers
    container.innerHTML = renderContractTableWithActions(contracts, sortKey, sortDir);
}

/**
 * Apply filters and sorting to contracts (Phase 3)
 * @param {Array} contracts - Array of contracts
 * @param {Object} filters - Filter configuration including sort options
 * @returns {Array} Sorted and filtered contracts
 */
function applyContractFiltersAndSort(contracts, filters) {
    let result = [...contracts];

    // Sorting (default: by contractId)
    const sortKey = filters.sortKey || 'contractId';
    const sortDir = filters.sortDir || 'asc';

    result.sort((a, b) => {
        let va = a[sortKey];
        let vb = b[sortKey];

        // Handle null/undefined
        if (va === null || va === undefined) va = '';
        if (vb === null || vb === undefined) vb = '';

        // Handle date fields
        if (sortKey === 'plannedStart') {
            va = va ? new Date(va).getTime() : 0;
            vb = vb ? new Date(vb).getTime() : 0;
            return sortDir === 'asc' ? va - vb : vb - va;
        }

        // String comparison
        const strA = String(va).toLowerCase();
        const strB = String(vb).toLowerCase();

        if (strA < strB) return sortDir === 'asc' ? -1 : 1;
        if (strA > strB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
}

/**
 * Render contract table with sortable headers and actions (Phase 3)
 * @param {Array} contracts - Array of contract objects
 * @param {string} sortKey - Current sort key
 * @param {string} sortDir - Current sort direction
 * @returns {string} HTML string
 */
function renderContractTableWithActions(contracts, sortKey, sortDir) {
    const displayContracts = contracts.slice(0, 100); // Limit to 100 for performance

    const getSortIcon = (key) => {
        if (key !== sortKey) return '';
        return sortDir === 'asc'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sort-icon"><path d="M5 15l7-7 7 7"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sort-icon"><path d="M19 9l-7 7-7-7"/></svg>';
    };

    let html = `
        <div class="data-table-container">
            <table class="data-table cm-contract-table">
                <thead>
                    <tr>
                        <th class="sortable" data-sort="contractId" onclick="window._handleContractSort && window._handleContractSort('contractId')">
                            Auftrag ${getSortIcon('contractId')}
                        </th>
                        <th class="sortable" data-sort="contractTitle" onclick="window._handleContractSort && window._handleContractSort('contractTitle')">
                            Titel ${getSortIcon('contractTitle')}
                        </th>
                        <th class="sortable" data-sort="location" onclick="window._handleContractSort && window._handleContractSort('location')">
                            Standort ${getSortIcon('location')}
                        </th>
                        <th class="sortable" data-sort="roomArea" onclick="window._handleContractSort && window._handleContractSort('roomArea')">
                            Säule/Raum ${getSortIcon('roomArea')}
                        </th>
                        <th class="sortable" data-sort="equipmentId" onclick="window._handleContractSort && window._handleContractSort('equipmentId')">
                            Anlage ${getSortIcon('equipmentId')}
                        </th>
                        <th class="sortable" data-sort="status" onclick="window._handleContractSort && window._handleContractSort('status')">
                            Status ${getSortIcon('status')}
                        </th>
                        <th class="sortable" data-sort="plannedStart" onclick="window._handleContractSort && window._handleContractSort('plannedStart')">
                            Sollstart ${getSortIcon('plannedStart')}
                        </th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
    `;

    displayContracts.forEach(contract => {
        const statusClass = getStatusClass(contract.status);
        const rowClass = getRowClassForStatus(contract.status);
        const contractDataJson = escapeHtml(JSON.stringify({
            contractId: contract.contractId,
            contractTitle: contract.contractTitle,
            location: contract.location,
            equipmentId: contract.equipmentId,
            equipmentDescription: contract.equipmentDescription,
            roomArea: contract.roomArea
        }));

        html += `
            <tr data-contract-id="${escapeHtml(contract.id)}" class="${rowClass}">
                <td>${escapeHtml(contract.contractId || '-')}</td>
                <td>${escapeHtml(contract.contractTitle || '-')}</td>
                <td>${escapeHtml(contract.location || '-')}</td>
                <td>${escapeHtml(contract.roomArea || '-')}</td>
                <td>${escapeHtml(contract.equipmentId || '-')}</td>
                <td>
                    <select 
                        class="status-select ${statusClass}" 
                        data-contract-id="${escapeHtml(contract.id)}"
                        onchange="window._handleContractStatusChange && window._handleContractStatusChange('${escapeHtml(contract.id)}', this.value)">
                        ${VALID_STATUS_VALUES.map(status => `
                            <option value="${escapeHtml(status)}" ${contract.status === status ? 'selected' : ''}>
                                ${escapeHtml(status)}
                            </option>
                        `).join('')}
                    </select>
                </td>
                <td>${escapeHtml(contract.plannedStart || '-')}</td>
                <td class="contract-actions">
                    <button 
                        type="button" 
                        class="btn btn-sm btn-primary create-protokoll-btn"
                        data-contract='${contractDataJson}'
                        onclick="window._handleCreateProtokollFromContract && window._handleCreateProtokollFromContract(this.dataset.contract)"
                        title="Neues Protokoll erstellen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Protokoll
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    if (contracts.length > 100) {
        html += `<p class="table-footer">Zeige 100 von ${contracts.length} Verträgen</p>`;
    }

    return html;
}

/**
 * Get CSS class for row background based on status
 * @param {string} status 
 * @returns {string} CSS class name
 */
function getRowClassForStatus(status) {
    if (!status) return '';

    switch (status) {
        // Blue - Info
        case 'Wochenende':
        case 'Steiger':
            return 'row-status-info';

        // Red - Danger/Alert
        case 'Nicht Auffindbar':
        case 'Noch geprueft':
        case 'Verschlossen':
        case 'Doppelt':
        case 'Demontiert':
            return 'row-status-danger';

        // Yellow - Warning/Attention
        case 'Abgelehnt':
        case 'Genehmigt':
            return 'row-status-warning';

        // Green - Success/Final
        case 'Bereit zur Abrechnung':
        case 'Abgerechnet':
            return 'row-status-success';

        // Faded - Archived
        case 'Archiviert':
            return 'row-status-archived';

        // White - Default
        // Erstellt, Geplant, Freigegeben, In Bearbeitung
        default:
            return '';
    }
}

/**
 * Update the contract list/table (legacy, for backward compatibility)
 * @param {Object} contractState - Contracts state slice
 */
function updateContractList(contractState) {
    // Delegate to the new renderContractList function
    renderContractList(contractState);
}

/**
 * Render a contract table
 * @param {Array} contracts - Array of contract objects
 * @returns {string} HTML string
 */
function renderContractTable(contracts) {
    const displayContracts = contracts.slice(0, 100); // Limit to 100 for performance

    let html = `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Auftrag</th>
                        <th>Titel</th>
                        <th>Status</th>
                        <th>Standort</th>
                        <th>Anlage</th>
                        <th>Geplant</th>
                    </tr>
                </thead>
                <tbody>
    `;

    displayContracts.forEach(contract => {
        const statusClass = getStatusClass(contract.status);

        html += `
            <tr data-id="${escapeHtml(contract.id)}">
                <td>${escapeHtml(contract.contractId || '-')}</td>
                <td>${escapeHtml(contract.contractTitle || '-')}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${escapeHtml(contract.status || '-')}
                    </span>
                </td>
                <td>${escapeHtml(contract.location || '-')}</td>
                <td>${escapeHtml(contract.equipmentId || '-')}</td>
                <td>${escapeHtml(contract.plannedStart || '-')}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    if (contracts.length > 100) {
        html += `<p class="table-footer">Zeige 100 von ${contracts.length} Verträgen</p>`;
    }

    return html;
}

/**
 * Get CSS class for status badge
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
    if (!status) return 'status-default';

    // Status Grouping based on User Request
    switch (status) {
        // White (Default)
        case 'Erstellt':
        case 'Geplant':
        case 'Freigegeben':
            return 'status-default';

        // Blue (Info)
        case 'Wochenende':
        case 'Steiger':
            return 'status-info';

        // Red (Danger)
        case 'Nicht Auffindbar':
        case 'Noch geprueft':
        case 'Verschlossen':
        case 'Doppelt':
        case 'Demontiert':
            return 'status-danger';

        // Yellow (Warning)
        case 'Abgelehnt':
        case 'Genehmigt':
        case 'In Bearbeitung':
            return 'status-warning';

        // Green (Success)
        case 'Bereit zur Abrechnung':
        case 'Abgerechnet':
            return 'status-success';

        // Opacity Reduced (Archived)
        case 'Archiviert':
            return 'status-archived';

        default:
            return 'status-unknown';
    }
}

/**
 * Helper to update status indicator element
 * @param {HTMLElement} element - Status element to update
 * @param {string} status - Status value ('idle', 'pending', 'success', 'error')
 */
function updateStatusIndicator(element, status) {
    if (!element) return;

    // Remove all status classes
    element.className = 'status-indicator';

    // Add current status class
    element.classList.add(`status-${status}`);

    // Set ARIA label for accessibility
    element.setAttribute('aria-label', `Status: ${status}`);
}

/**
 * Render import summary after successful import
 * @param {Object} importResult - Import result object
 * @returns {string} HTML string
 */
export function renderImportSummary(importResult) {
    const { contracts, errors, warnings } = importResult;
    const summary = getContractSummary ? getContractSummary(contracts) : {};

    return `
        <div class="import-summary">
            <div class="summary-header">
                <h4>Import abgeschlossen</h4>
            </div>
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="stat-value">${contracts.length}</span>
                    <span class="stat-label">Verträge importiert</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value">${summary.uniqueContractIds || 0}</span>
                    <span class="stat-label">Eindeutige Aufträge</span>
                </div>
                <div class="summary-stat ${errors.length > 0 ? 'has-errors' : ''}">
                    <span class="stat-value">${errors.length}</span>
                    <span class="stat-label">Fehler</span>
                </div>
                <div class="summary-stat ${warnings.length > 0 ? 'has-warnings' : ''}">
                    <span class="stat-value">${warnings.length}</span>
                    <span class="stat-label">Warnungen</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render filter section for contract list
 * @returns {string} HTML string
 */
export function renderContractFilters() {
    const statusValues = VALID_STATUS_VALUES;
    const locations = getUniqueFieldValues('location');

    return `
        <div class="filter-section">
            <div class="filter-row">
                <div class="filter-group">
                    <label for="contract-search-input">Suche</label>
                    <input type="text" 
                           id="contract-search-input" 
                           placeholder="Suche in allen Feldern..."
                           class="form-input">
                </div>
                <div class="filter-group">
                    <label for="contract-status-filter">Status</label>
                    <select id="contract-status-filter" class="form-select">
                        <option value="">Alle Status</option>
                        ${statusValues.map(s => `<option value="${s}">${escapeHtml(s)}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="contract-location-filter">Standort</label>
                    <select id="contract-location-filter" class="form-select">
                        <option value="">Alle Standorte</option>
                        ${locations.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('')}
                    </select>
                </div>
                <button type="button" id="contract-clear-filters" class="btn btn-secondary btn-sm">
                    Filter zurücksetzen
                </button>
            </div>
        </div>
    `;
}
