/**
 * Cell Mapper Module
 * 
 * Interactive UI for mapping Excel cells to metadata fields
 * Allows users to preview and adjust cell mappings before import
 * 
 * Note: Requires XLSX library (SheetJS) to be loaded globally
 */

import { getMetadataCellMap, updateMetadataCellMap } from './utils.js';
import { PARSING_CONFIG } from './config.js';

// XLSX is loaded globally from CDN in index.html
/* global XLSX */

/**
 * Preview cell values from workbook
 * Expands search to include adjacent cells to catch label/value pairs
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
    
    // For each configured cell, also check adjacent cells
    // This helps when the configured cell contains a label instead of the value
    for (const address of cellAddresses) {
        const cell = worksheet[address];
        preview[address] = cell ? cell.v : null;
        
        // Also preview adjacent cells (right, left, below)
        const adjacentAddresses = getAdjacentCells(address);
        for (const adjAddr of adjacentAddresses) {
            if (!preview[adjAddr]) { // Don't overwrite if already in list
                const adjCell = worksheet[adjAddr];
                preview[adjAddr] = adjCell ? adjCell.v : null;
            }
        }
    }
    
    return preview;
}

/**
 * Get adjacent cell addresses for a given cell
 * @param {string} address - Cell address (e.g., 'A5')
 * @returns {Array<string>} Adjacent cell addresses
 */
function getAdjacentCells(address) {
    // Parse cell address using SheetJS utility
    const decoded = XLSX.utils.decode_cell(address);
    const row = decoded.r;
    const col = decoded.c;
    
    const adjacent = [];
    
    // Right (most common for label: value pairs)
    if (col < 16383) { // Max Excel column
        adjacent.push(XLSX.utils.encode_cell({ r: row, c: col + 1 }));
    }
    
    // Left
    if (col > 0) {
        adjacent.push(XLSX.utils.encode_cell({ r: row, c: col - 1 }));
    }
    
    // Below
    if (row < 1048575) { // Max Excel row
        adjacent.push(XLSX.utils.encode_cell({ r: row + 1, c: col }));
    }
    
    // Two cells right (for wider layouts)
    if (col < 16382) {
        adjacent.push(XLSX.utils.encode_cell({ r: row, c: col + 2 }));
    }
    
    return adjacent;
}

/**
 * Get all possible cell addresses for preview
 * Includes configured cells and their adjacent cells
 * @returns {Array<string>} All cell addresses from config plus adjacent cells
 */
export function getAllConfiguredCells() {
    const config = getMetadataCellMap();
    const allCells = new Set();
    
    // Add all configured cells
    for (const cellArray of Object.values(config)) {
        cellArray.forEach(cell => {
            allCells.add(cell);
            // Also add adjacent cells to catch label/value pairs
            getAdjacentCells(cell).forEach(adj => allCells.add(adj));
        });
    }
    
    return Array.from(allCells).sort();
}

/**
 * Find best matching cell for a field based on preview values
 * Tries to detect if a cell contains a label vs actual data
 * @param {string} field - Field name
 * @param {Object} preview - Cell preview map
 * @returns {string|null} Best matching cell address
 */
export function findBestMatch(field, preview) {
    const config = getMetadataCellMap();
    const cellAddresses = config[field] || [];
    
    // Common label patterns that indicate this is a label cell, not data
    const labelPatterns = [
        /^(auftrags?[-\s]?nr|order[-\s]?number|auftrag)[:.]?\s*$/i,
        /^(protokoll[-\s]?nr|protocol[-\s]?number)[:.]?\s*$/i,
        /^(anlage|plant|facility)[:.]?\s*$/i,
        /^(einsatzort|ort|location|standort)[:.]?\s*$/i,
        /^(firma|company|unternehmen)[:.]?\s*$/i,
        /^(auftraggeber|client|kunde|customer)[:.]?\s*$/i
    ];
    
    // Strategy 1: Try configured cells, but skip if they look like labels
    for (const address of cellAddresses) {
        const value = preview[address];
        if (value && String(value).trim()) {
            const valueStr = String(value).trim();
            
            // Check if this looks like a label
            const isLabel = labelPatterns.some(pattern => pattern.test(valueStr));
            
            if (!isLabel) {
                // This looks like actual data, use it
                return address;
            } else {
                // This is a label, check adjacent cells for the actual value
                console.log(`Cell ${address} contains label "${valueStr}", checking adjacent cells`);
                const adjacentCells = getAdjacentCells(address);
                
                for (const adjAddr of adjacentCells) {
                    const adjValue = preview[adjAddr];
                    if (adjValue && String(adjValue).trim()) {
                        const adjStr = String(adjValue).trim();
                        const adjIsLabel = labelPatterns.some(pattern => pattern.test(adjStr));
                        
                        if (!adjIsLabel) {
                            console.log(`Found value "${adjStr}" in adjacent cell ${adjAddr}`);
                            return adjAddr;
                        }
                    }
                }
            }
        }
    }
    
    // Strategy 2: If no match found, return first non-empty cell (fallback)
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
        
        // Get configured cells plus their adjacent cells for this field
        const configuredCells = config[field.key] || [];
        const expandedCellOptions = new Set(configuredCells);
        
        // Add adjacent cells to options
        for (const cell of configuredCells) {
            getAdjacentCells(cell).forEach(adj => expandedCellOptions.add(adj));
        }
        
        // Convert to array, filter out empty cells, and sort
        const cellOptions = Array.from(expandedCellOptions)
            .filter(addr => {
                const cellValue = preview[addr];
                return cellValue && String(cellValue).trim(); // Only include non-empty cells
            })
            .sort();
        
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
        
        // Add options for each non-empty cell
        for (const cellAddr of cellOptions) {
            const cellValue = preview[cellAddr];
            const displayValue = String(cellValue).substring(0, 30);
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
