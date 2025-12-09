/**
 * Contract Renderer Module (Phase 1)
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
 */

import { getState, subscribe } from '../state.js';
import { escapeHtml } from '../handlers.js';
import { getFilteredContracts, getContractStatistics, getUniqueFieldValues } from './contractRepository.js';
import { normalizeStatus, VALID_STATUS_VALUES } from './contractUtils.js';

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
    
    // Update statistics
    updateContractStatistics(contractState);
    
    // Update contract list
    updateContractList(contractState);
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
 * Update the contract list/table
 * @param {Object} contractState - Contracts state slice
 */
function updateContractList(contractState) {
    const container = document.getElementById('contract-list-container');
    
    if (!container) {
        return;
    }
    
    const contracts = getFilteredContracts();
    
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
    
    // Render contract table
    container.innerHTML = renderContractTable(contracts);
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
    const normalized = normalizeStatus(status);
    
    switch (normalized) {
        case 'fertig':
            return 'status-success';
        case 'inbearb':
            return 'status-pending';
        case 'offen':
            return 'status-idle';
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
