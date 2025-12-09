/**
 * UI Module (Phase 5)
 * 
 * Responsible for UI initialization and updates
 * Separates UI concerns from handlers and state management
 */

import { escapeHtml } from './handlers.js';

/**
 * Initialize static UI elements - Phase 5.1.4
 * Performs one-time setup of non-dynamic DOM elements
 * @returns {void}
 */
export function initializeStaticUI() {
    console.log('Initializing static UI elements...');
    
    // Add any one-time UI setup here
    // For example: set up ARIA attributes, initialize tooltips, etc.
    
    // Set initial aria-live regions
    const globalMessages = document.getElementById('global-messages');
    if (globalMessages) {
        globalMessages.setAttribute('aria-live', 'assertive');
        globalMessages.setAttribute('role', 'alert');
    }
    
    const mainElement = document.querySelector('.app-main');
    if (mainElement) {
        mainElement.setAttribute('aria-live', 'polite');
    }
    
    console.log('Static UI initialized');
}

/**
 * Update import section UI based on state - Phase 5
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
        importMessage.textContent = importState.message || 'Noch keine Datei importiert.';
        importMessage.className = `status-message status-${importState.status}`;
    }
    
    // Update summary display
    if (importSummary && protokollData && protokollData.metadata && protokollData.positionen.length > 0) {
        const { metadata, positionen } = protokollData;
        
        importSummary.innerHTML = `
            <dl class="summary-list">
                <div class="summary-item">
                    <dt>Auftrags-Nr.</dt>
                    <dd>${escapeHtml(metadata.auftragsNr || 'N/A')}</dd>
                </div>
                <div class="summary-item">
                    <dt>Protokoll-Nr.</dt>
                    <dd>${escapeHtml(metadata.protokollNr || 'N/A')}</dd>
                </div>
                <div class="summary-item">
                    <dt>Anlage</dt>
                    <dd>${escapeHtml(metadata.anlage || 'N/A')}</dd>
                </div>
                <div class="summary-item">
                    <dt>Einsatzort</dt>
                    <dd>${escapeHtml(metadata.einsatzort || 'N/A')}</dd>
                </div>
                <div class="summary-item">
                    <dt>Datum</dt>
                    <dd>${escapeHtml(metadata.datum || 'N/A')}</dd>
                </div>
                <div class="summary-item">
                    <dt>Positionen extrahiert</dt>
                    <dd>${positionen.length}</dd>
                </div>
            </dl>
        `;
        importSummary.removeAttribute('hidden');
    } else if (importSummary) {
        importSummary.setAttribute('hidden', '');
    }
    
    // Update button states
    if (importButton) {
        importButton.disabled = importState.status === 'pending';
        importButton.textContent = importState.status === 'pending'
            ? 'Importiere...'
            : 'Datei importieren';
    }
}

/**
 * Update generate section UI based on state - Phase 5
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
        generateMessage.textContent = generateState.message || 'Noch keine Abrechnung erzeugt.';
        generateMessage.className = `status-message status-${generateState.status}`;
    }
    
    // Update generation summary
    if (generateSummary && abrechnungData && abrechnungData.header && Object.keys(abrechnungData.positionen || {}).length > 0) {
        const { positionen } = abrechnungData;
        const totalQuantity = Object.values(positionen).reduce((sum, q) => sum + q, 0);
        
        generateSummary.innerHTML = `
            <dl class="summary-list">
                <div class="summary-item">
                    <dt>Eindeutige Positionen</dt>
                    <dd>${Object.keys(positionen).length}</dd>
                </div>
                <div class="summary-item">
                    <dt>Gesamtmenge</dt>
                    <dd>${totalQuantity.toFixed(2)}</dd>
                </div>
                <div class="summary-item">
                    <dt>Generierungszeit</dt>
                    <dd>${generateState.generationTimeMs || 0}ms</dd>
                </div>
            </dl>
        `;
        generateSummary.removeAttribute('hidden');
    } else if (generateSummary) {
        generateSummary.setAttribute('hidden', '');
    }
    
    // Update button states
    // Button should be disabled if: (1) generation is pending, OR (2) there's no valid imported data
    if (generateButton) {
        const isPending = generateState.status === 'pending';
        // Check if we have valid protokollData from state
        const protokollData = state.protokollData;
        const hasValidInput = protokollData && 
                            protokollData.metadata && 
                            protokollData.metadata.auftragsNr && 
                            protokollData.positionen && 
                            protokollData.positionen.length > 0;
        
        generateButton.disabled = isPending || !hasValidInput;
        generateButton.textContent = isPending
            ? 'Erzeuge...'
            : 'Abrechnung erzeugen';
    }
}

/**
 * Update export section UI based on state - Phase 5
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
    const exportSummary = document.querySelector('#export-summary');
    
    if (!exportButton || !exportStatus) {
        console.warn('Export UI elements not found in DOM');
        return;
    }
    
    // Update status indicator
    updateStatusIndicator(exportStatus, exportState.status);
    
    // Update message
    if (exportMessage) {
        exportMessage.textContent = exportState.message || 'Noch keine Datei exportiert.';
        exportMessage.className = `status-message status-${exportState.status}`;
    }
    
    // Update export summary
    if (exportSummary && exportState.lastExportAt) {
        const exportDate = new Date(exportState.lastExportAt);
        const dateStr = exportDate.toLocaleString('de-DE');
        const sizeKB = (exportState.lastExportSize && exportState.lastExportSize > 0)
            ? (exportState.lastExportSize / 1024).toFixed(2) + ' KB'
            : '–';
        
        const lastDateElement = document.getElementById('export-last-date');
        const lastSizeElement = document.getElementById('export-last-size');
        
        if (lastDateElement) {
            lastDateElement.textContent = dateStr;
        }
        
        if (lastSizeElement) {
            lastSizeElement.textContent = sizeKB;
        }
        
        exportSummary.removeAttribute('hidden');
    } else if (exportSummary) {
        exportSummary.setAttribute('hidden', '');
    }
    
    // Update button state
    // Button should be disabled if: (1) export is pending, OR (2) there's no valid abrechnung data
    if (exportButton) {
        const isPending = exportState.status === 'pending';
        // Check if we have valid abrechnungData from state
        const abrechnungData = state.abrechnungData;
        const hasValidAbrechnung = abrechnungData && 
                                  abrechnungData.header && 
                                  abrechnungData.header.orderNumber &&
                                  abrechnungData.positionen && 
                                  Object.keys(abrechnungData.positionen).length > 0;
        
        exportButton.disabled = isPending || !hasValidAbrechnung;
        exportButton.textContent = isPending
            ? 'Exportiere...'
            : 'Abrechnung herunterladen';
    }
}

/**
 * Helper to update status indicator element - Phase 5
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
