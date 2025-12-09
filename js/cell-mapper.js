/**
 * Cell Mapper Module
 * 
 * Interactive UI for mapping Excel cells to metadata fields
 * Allows users to preview and adjust cell mappings before import
 */

import { getMetadataCellMap, updateMetadataCellMap } from './utils.js';
import { PARSING_CONFIG } from './config.js';

/**
 * Preview cell values from workbook
 * @param {Object} workbook - SheetJS workbook
 * @param {Array<string>} cellAddresses - Cell addresses to preview
 * @returns {Object} Map of cell address to value
 */
export function previewCellValues(workbook, cellAddresses) {
    const sheetName = PARSING_CONFIG.protokollSheetName;
    
    if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const preview = {};
    
    for (const address of cellAddresses) {
        const cell = worksheet[address];
        preview[address] = cell ? cell.v : null;
    }
    
    return preview;
}

/**
 * Get all possible cell addresses for preview
 * @returns {Array<string>} All cell addresses from config
 */
export function getAllConfiguredCells() {
    const config = getMetadataCellMap();
    const allCells = new Set();
    
    for (const cellArray of Object.values(config)) {
        cellArray.forEach(cell => allCells.add(cell));
    }
    
    return Array.from(allCells).sort();
}

/**
 * Find best matching cell for a field based on preview values
 * @param {string} field - Field name
 * @param {Object} preview - Cell preview map
 * @returns {string|null} Best matching cell address
 */
export function findBestMatch(field, preview) {
    const config = getMetadataCellMap();
    const cellAddresses = config[field] || [];
    
    // Return first non-empty cell
    for (const address of cellAddresses) {
        const value = preview[address];
        if (value && String(value).trim()) {
            return address;
        }
    }
    
    return null;
}

/**
 * Create cell mapper dialog HTML
 * @param {Object} workbook - SheetJS workbook
 * @returns {HTMLElement} Dialog element
 */
export function createCellMapperDialog(workbook) {
    const config = getMetadataCellMap();
    const allCells = getAllConfiguredCells();
    const preview = previewCellValues(workbook, allCells);
    
    const dialog = document.createElement('div');
    dialog.className = 'cell-mapper-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'cell-mapper-title');
    dialog.setAttribute('aria-modal', 'true');
    
    const fields = [
        { key: 'protokollNr', label: 'Protokoll-Nr.', required: false },
        { key: 'auftragsNr', label: 'Auftrags-Nr.', required: true },
        { key: 'anlage', label: 'Anlage', required: true },
        { key: 'einsatzort', label: 'Einsatzort', required: false },
        { key: 'firma', label: 'Firma', required: false },
        { key: 'auftraggeber', label: 'Auftraggeber', required: false }
    ];
    
    let html = `
        <div class="cell-mapper-overlay"></div>
        <div class="cell-mapper-content">
            <div class="cell-mapper-header">
                <h2 id="cell-mapper-title">Zellenzuordnung überprüfen</h2>
                <p class="cell-mapper-description">
                    Überprüfen Sie die automatisch erkannten Werte und passen Sie die Zellenzuordnung bei Bedarf an.
                </p>
            </div>
            
            <div class="cell-mapper-body">
                <div class="cell-mapper-grid">
    `;
    
    // Create a row for each field
    for (const field of fields) {
        const bestMatch = findBestMatch(field.key, preview);
        const value = bestMatch ? preview[bestMatch] : '';
        const cellOptions = config[field.key] || [];
        
        html += `
            <div class="cell-mapper-row ${field.required ? 'required' : ''}">
                <div class="cell-mapper-label">
                    <label for="cell-select-${field.key}">
                        ${field.label}
                        ${field.required ? '<span class="required-mark">*</span>' : ''}
                    </label>
                </div>
                
                <div class="cell-mapper-select">
                    <select id="cell-select-${field.key}" data-field="${field.key}">
                        <option value="">-- Keine Zuordnung --</option>
        `;
        
        // Add options for each configured cell
        for (const cellAddr of cellOptions) {
            const cellValue = preview[cellAddr];
            const displayValue = cellValue ? String(cellValue).substring(0, 30) : '(leer)';
            const selected = cellAddr === bestMatch ? 'selected' : '';
            
            html += `
                <option value="${cellAddr}" ${selected} data-value="${cellValue || ''}">
                    ${cellAddr}: ${displayValue}
                </option>
            `;
        }
        
        html += `
                    </select>
                </div>
                
                <div class="cell-mapper-preview">
                    <input 
                        type="text" 
                        id="preview-${field.key}" 
                        value="${value || ''}" 
                        readonly 
                        placeholder="Kein Wert"
                        class="cell-preview-input"
                    />
                </div>
            </div>
        `;
    }
    
    html += `
                </div>
                
                <div class="cell-mapper-help">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>
                        Wählen Sie für jedes Feld die Zelle aus, die den richtigen Wert enthält.
                        Pflichtfelder sind mit <span class="required-mark">*</span> markiert.
                    </p>
                </div>
            </div>
            
            <div class="cell-mapper-footer">
                <button type="button" class="btn btn-secondary" id="cell-mapper-cancel">
                    Abbrechen
                </button>
                <button type="button" class="btn btn-primary" id="cell-mapper-confirm">
                    Zuordnung übernehmen
                </button>
            </div>
        </div>
    `;
    
    dialog.innerHTML = html;
    
    // Store preview data on dialog for later use
    dialog._previewData = preview;
    dialog._workbook = workbook;
    
    // Add event listeners
    attachCellMapperEvents(dialog);
    
    return dialog;
}

/**
 * Attach event listeners to cell mapper dialog
 * @param {HTMLElement} dialog - Dialog element
 */
function attachCellMapperEvents(dialog) {
    const preview = dialog._previewData;
    
    // Update preview when selection changes
    const selects = dialog.querySelectorAll('select[data-field]');
    selects.forEach(select => {
        select.addEventListener('change', (e) => {
            const field = e.target.dataset.field;
            const cellAddr = e.target.value;
            const previewInput = dialog.querySelector(`#preview-${field}`);
            
            if (previewInput) {
                const value = cellAddr ? preview[cellAddr] : '';
                previewInput.value = value || '';
            }
        });
    });
    
    // Cancel button
    const cancelBtn = dialog.querySelector('#cell-mapper-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            dialog.dispatchEvent(new CustomEvent('cell-mapper-cancel'));
        });
    }
    
    // Confirm button
    const confirmBtn = dialog.querySelector('#cell-mapper-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const mapping = extractMapping(dialog);
            
            // Validate required fields
            const validation = validateMapping(mapping);
            if (!validation.valid) {
                showMappingError(dialog, validation.errors);
                return;
            }
            
            dialog.dispatchEvent(new CustomEvent('cell-mapper-confirm', {
                detail: { mapping, workbook: dialog._workbook }
            }));
        });
    }
    
    // Close on overlay click
    const overlay = dialog.querySelector('.cell-mapper-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            dialog.dispatchEvent(new CustomEvent('cell-mapper-cancel'));
        });
    }
    
    // Close on Escape key
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dialog.dispatchEvent(new CustomEvent('cell-mapper-cancel'));
        }
    });
}

/**
 * Extract mapping from dialog
 * @param {HTMLElement} dialog - Dialog element
 * @returns {Object} Field to cell address mapping
 */
function extractMapping(dialog) {
    const mapping = {};
    const selects = dialog.querySelectorAll('select[data-field]');
    
    selects.forEach(select => {
        const field = select.dataset.field;
        const cellAddr = select.value;
        if (cellAddr) {
            mapping[field] = cellAddr;
        }
    });
    
    return mapping;
}

/**
 * Validate mapping has required fields
 * @param {Object} mapping - Field to cell mapping
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateMapping(mapping) {
    const requiredFields = ['auftragsNr', 'anlage'];
    const errors = [];
    
    for (const field of requiredFields) {
        if (!mapping[field]) {
            const label = field === 'auftragsNr' ? 'Auftrags-Nr.' : 'Anlage';
            errors.push(`${label} ist ein Pflichtfeld`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Show validation errors in dialog
 * @param {HTMLElement} dialog - Dialog element
 * @param {Array<string>} errors - Error messages
 */
function showMappingError(dialog, errors) {
    // Remove existing error display
    const existingError = dialog.querySelector('.cell-mapper-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'cell-mapper-error';
    errorDiv.setAttribute('role', 'alert');
    
    errorDiv.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
            <strong>Zuordnung unvollständig</strong>
            <ul>
                ${errors.map(err => `<li>${err}</li>`).join('')}
            </ul>
        </div>
    `;
    
    const footer = dialog.querySelector('.cell-mapper-footer');
    footer.parentNode.insertBefore(errorDiv, footer);
}

/**
 * Apply mapping to configuration
 * @param {Object} mapping - Field to cell address mapping
 */
export function applyMapping(mapping) {
    for (const [field, cellAddr] of Object.entries(mapping)) {
        // Put selected cell first in the fallback array
        updateMetadataCellMap(field, [cellAddr]);
    }
}

/**
 * Show cell mapper dialog and return promise
 * @param {Object} workbook - SheetJS workbook
 * @returns {Promise<Object>} Resolves with { mapping, workbook } or rejects on cancel
 */
export function showCellMapperDialog(workbook) {
    return new Promise((resolve, reject) => {
        const dialog = createCellMapperDialog(workbook);
        
        dialog.addEventListener('cell-mapper-confirm', (e) => {
            document.body.removeChild(dialog);
            resolve(e.detail);
        });
        
        dialog.addEventListener('cell-mapper-cancel', () => {
            document.body.removeChild(dialog);
            reject(new Error('Zuordnung abgebrochen'));
        });
        
        document.body.appendChild(dialog);
        
        // Focus first select
        const firstSelect = dialog.querySelector('select');
        if (firstSelect) {
            setTimeout(() => firstSelect.focus(), 100);
        }
    });
}
