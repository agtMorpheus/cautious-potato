/**
 * Event Handlers Module
 * 
 * Handles user interactions and coordinates between UI, state, and utilities
 */

import { getState, setState } from './state.js';
import * as utils from './utils.js';

/**
 * Handle file input change
 * @param {Event} event - File input change event
 */
export function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileName');
    const importBtn = document.getElementById('importBtn');
    
    if (file) {
        fileNameDisplay.textContent = file.name;
        importBtn.disabled = false;
        
        // Store file reference in state
        setState({ selectedFile: file });
    } else {
        fileNameDisplay.textContent = 'Keine Datei ausgewählt';
        importBtn.disabled = true;
        setState({ selectedFile: null });
    }
}

/**
 * Handle protokoll import
 */
export async function handleImportProtokoll() {
    const state = getState();
    const file = state.selectedFile;
    const statusElement = document.getElementById('importStatus');
    const previewElement = document.getElementById('importPreview');
    
    if (!file) {
        showStatus(statusElement, 'Bitte wählen Sie zuerst eine Datei aus', 'error');
        return;
    }
    
    try {
        // Update UI state
        setState({ status: 'importing' });
        showStatus(statusElement, 'Protokoll wird importiert...', 'info');
        previewElement.classList.remove('show');
        
        // Read Excel file
        const workbook = await utils.readExcelFile(file);
        
        // Parse metadata
        const metadata = utils.parseProtokollMetadata(workbook);
        
        // Extract positions
        const positionen = utils.extractPositions(workbook);
        
        if (positionen.length === 0) {
            throw new Error('Keine Positionen im Protokoll gefunden');
        }
        
        // Update state with imported data
        setState({
            protokollData: {
                metadata,
                positionen
            },
            status: 'imported'
        });
        
        // Show success message
        showStatus(
            statusElement,
            `✓ Protokoll erfolgreich importiert (${positionen.length} Positionen)`,
            'success'
        );
        
        // Show preview
        showImportPreview(metadata, positionen);
        
    } catch (error) {
        console.error('Import error:', error);
        setState({ status: 'error' });
        showStatus(statusElement, `✗ Fehler: ${error.message}`, 'error');
    }
}

/**
 * Handle abrechnung generation
 */
export async function handleGenerateAbrechnung() {
    const state = getState();
    const statusElement = document.getElementById('generateStatus');
    const previewElement = document.getElementById('generatePreview');
    
    if (!state.protokollData) {
        showStatus(statusElement, 'Bitte importieren Sie zuerst ein Protokoll', 'error');
        return;
    }
    
    try {
        // Update UI state
        setState({ status: 'generating' });
        showStatus(statusElement, 'Abrechnung wird generiert...', 'info');
        previewElement.classList.remove('show');
        
        // Load template
        const workbook = await utils.loadAbrechnungTemplate();
        
        // Fill header
        utils.fillAbrechnungHeader(workbook, state.protokollData.metadata);
        
        // Sum positions
        const positionSums = utils.sumByPosition(state.protokollData.positionen);
        
        // Fill positions
        utils.fillAbrechnungPositions(workbook, positionSums);
        
        // Update state with generated data
        setState({
            abrechnungData: {
                header: state.protokollData.metadata,
                positionen: positionSums,
                workbook: workbook
            },
            status: 'generated'
        });
        
        // Show success message
        const positionCount = Object.keys(positionSums).length;
        showStatus(
            statusElement,
            `✓ Abrechnung erfolgreich generiert (${positionCount} Positionen)`,
            'success'
        );
        
        // Show preview
        showGeneratePreview(state.protokollData.metadata, positionSums);
        
    } catch (error) {
        console.error('Generation error:', error);
        setState({ status: 'error' });
        showStatus(statusElement, `✗ Fehler: ${error.message}`, 'error');
    }
}

/**
 * Handle abrechnung export
 */
export function handleExportAbrechnung() {
    const state = getState();
    const statusElement = document.getElementById('exportStatus');
    
    if (!state.abrechnungData || !state.abrechnungData.workbook) {
        showStatus(statusElement, 'Bitte generieren Sie zuerst eine Abrechnung', 'error');
        return;
    }
    
    try {
        const filename = utils.generateExportFilename(state.abrechnungData.header.auftragsNr);
        utils.exportToExcel(state.abrechnungData.workbook, filename);
        
        showStatus(statusElement, `✓ Abrechnung erfolgreich exportiert: ${filename}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showStatus(statusElement, `✗ Fehler beim Export: ${error.message}`, 'error');
    }
}

/**
 * Handle application reset
 */
export async function handleReset() {
    if (confirm('Möchten Sie wirklich alle Daten löschen und die Anwendung zurücksetzen?')) {
        // Clear state
        const { clearState } = await import('./state.js');
        clearState();
        
        // Reset UI
        document.getElementById('fileInput').value = '';
        document.getElementById('fileName').textContent = 'Keine Datei ausgewählt';
        document.getElementById('importBtn').disabled = true;
        document.getElementById('importStatus').textContent = '';
        document.getElementById('importStatus').classList.remove('show', 'success', 'error', 'info');
        document.getElementById('importPreview').classList.remove('show');
        document.getElementById('generateStatus').textContent = '';
        document.getElementById('generateStatus').classList.remove('show', 'success', 'error', 'info');
        document.getElementById('generatePreview').classList.remove('show');
        document.getElementById('exportStatus').textContent = '';
        document.getElementById('exportStatus').classList.remove('show', 'success', 'error', 'info');
        
        alert('Anwendung wurde zurückgesetzt');
    }
}

/**
 * Show status message
 * @param {HTMLElement} element - Status element
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error, info)
 */
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status-message show ' + type;
}

/**
 * Show import preview
 * @param {Object} metadata - Imported metadata
 * @param {Array} positionen - Imported positions
 */
function showImportPreview(metadata, positionen) {
    const previewElement = document.getElementById('importPreview');
    
    const html = `
        <h3>Importierte Daten</h3>
        <div class="metadata">
            <p><strong>Auftrags-Nr.:</strong> ${metadata.auftragsNr}</p>
            <p><strong>Anlage:</strong> ${metadata.anlage}</p>
            <p><strong>Einsatzort:</strong> ${metadata.einsatzort}</p>
            <p><strong>Firma:</strong> ${metadata.firma}</p>
            <p><strong>Positionen:</strong> ${positionen.length}</p>
        </div>
    `;
    
    previewElement.innerHTML = html;
    previewElement.classList.add('show');
}

/**
 * Show generate preview
 * @param {Object} metadata - Metadata
 * @param {Object} positionSums - Summed positions
 */
function showGeneratePreview(metadata, positionSums) {
    const previewElement = document.getElementById('generatePreview');
    
    // Create table of first 10 positions
    const positions = Object.entries(positionSums).slice(0, 10);
    const tableRows = positions.map(([posNr, menge]) => 
        `<tr><td>${posNr}</td><td>${menge}</td></tr>`
    ).join('');
    
    const html = `
        <h3>Generierte Abrechnung - Vorschau</h3>
        <div class="metadata">
            <p><strong>Auftrags-Nr.:</strong> ${metadata.auftragsNr}</p>
            <p><strong>Anlage:</strong> ${metadata.anlage}</p>
            <p><strong>Gefüllte Positionen:</strong> ${Object.keys(positionSums).length}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Position</th>
                    <th>Menge</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        ${Object.keys(positionSums).length > 10 ? '<p><em>... und weitere</em></p>' : ''}
    `;
    
    previewElement.innerHTML = html;
    previewElement.classList.add('show');
}
