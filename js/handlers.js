/**
 * Event Handlers Module (Phase 2)
 * 
 * Handles user interactions and coordinates between UI, state, and utilities
 * Uses Phase 2 state management with domain-specific helper functions
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
    updateAbrechnungHeader
} from './state.js';
import * as utils from './utils.js';

// Store selected file reference (not persisted in state)
let selectedFile = null;

// Store generated workbook reference (not persisted in state - can't be serialized)
let generatedWorkbook = null;

/**
 * Handle file input change (Phase 2)
 * @param {Event} event - File input change event
 */
export function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileName');
    const importBtn = document.getElementById('importBtn');
    
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
 * Handle protokoll import (Phase 2)
 */
export async function handleImportProtokoll() {
    const statusElement = document.getElementById('importStatus');
    const previewElement = document.getElementById('importPreview');
    
    if (!selectedFile) {
        showStatus(statusElement, 'Bitte wählen Sie zuerst eine Datei aus', 'error');
        setImportStatus({ status: 'error', message: 'Keine Datei ausgewählt' });
        return;
    }
    
    const startTime = Date.now();
    
    try {
        // Update UI state to pending
        setImportStatus({ status: 'pending', message: 'Protokoll wird importiert...' });
        showStatus(statusElement, 'Protokoll wird importiert...', 'info');
        previewElement.classList.remove('show');
        
        // Read Excel file
        const workbook = await utils.readExcelFile(selectedFile);
        
        // Parse metadata
        const metadata = utils.parseProtokollMetadata(workbook);
        
        // Extract positions
        const positionen = utils.extractPositions(workbook);
        
        if (positionen.length === 0) {
            throw new Error('Keine Positionen im Protokoll gefunden');
        }
        
        // Update state with imported data using Phase 2 helpers
        // Map legacy metadata fields to Phase 2 structure
        updateProtokollData({
            metadata: {
                protocolNumber: metadata.protokollNr,
                orderNumber: metadata.auftragsNr,
                plant: metadata.anlage,
                location: metadata.einsatzort,
                company: metadata.firma,
                date: metadata.datum
            },
            positionen: positionen
        });
        
        // Update import status to success
        setImportStatus({
            status: 'success',
            message: `Protokoll erfolgreich importiert (${positionen.length} Positionen)`,
            importedAt: new Date().toISOString()
        });
        
        // Reset generate and export status since we have new data
        setGenerateStatus({ status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0 });
        setExportStatus({ status: 'idle', message: '' });
        
        // Show success message
        showStatus(
            statusElement,
            `✓ Protokoll erfolgreich importiert (${positionen.length} Positionen)`,
            'success'
        );
        
        // Show preview using legacy metadata format for display
        showImportPreview(metadata, positionen);
        
    } catch (error) {
        console.error('Import error:', error);
        setImportStatus({ status: 'error', message: error.message });
        showStatus(statusElement, `✗ Fehler: ${error.message}`, 'error');
    }
}

/**
 * Handle abrechnung generation (Phase 2)
 */
export async function handleGenerateAbrechnung() {
    const state = getState();
    const statusElement = document.getElementById('generateStatus');
    const previewElement = document.getElementById('generatePreview');
    
    // Check if protokollData has positions
    if (!state.protokollData?.positionen?.length) {
        showStatus(statusElement, 'Bitte importieren Sie zuerst ein Protokoll', 'error');
        setGenerateStatus({ status: 'error', message: 'Kein Protokoll importiert' });
        return;
    }
    
    const startTime = Date.now();
    
    try {
        // Update UI state to pending
        setGenerateStatus({ status: 'pending', message: 'Abrechnung wird generiert...' });
        showStatus(statusElement, 'Abrechnung wird generiert...', 'info');
        previewElement.classList.remove('show');
        
        // Load template
        const workbook = await utils.loadAbrechnungTemplate();
        
        // Create legacy metadata format for utils
        const legacyMetadata = {
            protokollNr: state.protokollData.metadata.protocolNumber,
            auftragsNr: state.protokollData.metadata.orderNumber,
            anlage: state.protokollData.metadata.plant,
            einsatzort: state.protokollData.metadata.location,
            firma: state.protokollData.metadata.company,
            datum: state.protokollData.metadata.date
        };
        
        // Fill header
        utils.fillAbrechnungHeader(workbook, legacyMetadata);
        
        // Sum positions
        const positionSums = utils.sumByPosition(state.protokollData.positionen);
        
        // Fill positions
        utils.fillAbrechnungPositions(workbook, positionSums);
        
        const generationTimeMs = Date.now() - startTime;
        
        // Update abrechnung data using Phase 2 helpers
        updateAbrechnungHeader({
            date: state.protokollData.metadata.date,
            orderNumber: state.protokollData.metadata.orderNumber,
            plant: state.protokollData.metadata.plant,
            location: state.protokollData.metadata.location
        });
        updateAbrechnungPositions(positionSums);
        
        // Store workbook reference for export (not in state - can't be serialized)
        // We'll need to regenerate it on export if needed
        generatedWorkbook = workbook;
        
        // Update generate status to success
        const positionCount = Object.keys(positionSums).length;
        setGenerateStatus({
            status: 'success',
            message: `Abrechnung erfolgreich generiert (${positionCount} Positionen)`,
            positionCount: state.protokollData.positionen.length,
            uniquePositionCount: positionCount,
            generationTimeMs: generationTimeMs
        });
        
        // Reset export status
        setExportStatus({ status: 'idle', message: '' });
        
        // Show success message
        showStatus(
            statusElement,
            `✓ Abrechnung erfolgreich generiert (${positionCount} Positionen)`,
            'success'
        );
        
        // Show preview using legacy metadata for display
        showGeneratePreview(legacyMetadata, positionSums);
        
    } catch (error) {
        console.error('Generation error:', error);
        setGenerateStatus({ status: 'error', message: error.message });
        showStatus(statusElement, `✗ Fehler: ${error.message}`, 'error');
    }
}

/**
 * Handle abrechnung export (Phase 2)
 */
export async function handleExportAbrechnung() {
    const state = getState();
    const statusElement = document.getElementById('exportStatus');
    
    // Check if abrechnung has positions
    const hasPositions = Object.keys(state.abrechnungData?.positionen || {}).length > 0;
    
    if (!hasPositions) {
        showStatus(statusElement, 'Bitte generieren Sie zuerst eine Abrechnung', 'error');
        setExportStatus({ status: 'error', message: 'Keine Abrechnung generiert' });
        return;
    }
    
    try {
        // Update export status to pending
        setExportStatus({ status: 'pending', message: 'Abrechnung wird exportiert...' });
        
        // If we don't have a workbook reference, regenerate it
        if (!generatedWorkbook) {
            const workbook = await utils.loadAbrechnungTemplate();
            
            // Create legacy metadata format for utils
            const legacyMetadata = {
                protokollNr: state.protokollData?.metadata?.protocolNumber,
                auftragsNr: state.protokollData?.metadata?.orderNumber || state.abrechnungData.header.orderNumber,
                anlage: state.protokollData?.metadata?.plant || state.abrechnungData.header.plant,
                einsatzort: state.protokollData?.metadata?.location || state.abrechnungData.header.location,
                firma: state.protokollData?.metadata?.company,
                datum: state.protokollData?.metadata?.date || state.abrechnungData.header.date
            };
            
            utils.fillAbrechnungHeader(workbook, legacyMetadata);
            utils.fillAbrechnungPositions(workbook, state.abrechnungData.positionen);
            generatedWorkbook = workbook;
        }
        
        const filename = utils.generateExportFilename(
            state.abrechnungData.header.orderNumber || 'Abrechnung'
        );
        utils.exportToExcel(generatedWorkbook, filename);
        
        // Update export status to success
        setExportStatus({
            status: 'success',
            message: `Abrechnung erfolgreich exportiert: ${filename}`,
            lastExportAt: new Date().toISOString()
        });
        
        showStatus(statusElement, `✓ Abrechnung erfolgreich exportiert: ${filename}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        setExportStatus({ status: 'error', message: error.message });
        showStatus(statusElement, `✗ Fehler beim Export: ${error.message}`, 'error');
    }
}

/**
 * Handle application reset (Phase 2)
 */
export function handleReset() {
    if (confirm('Möchten Sie wirklich alle Daten löschen und die Anwendung zurücksetzen?')) {
        // Reset state to initial values and clear localStorage
        resetState({ persist: true, silent: false });
        clearPersistedState();
        
        // Clear local file and workbook references
        selectedFile = null;
        generatedWorkbook = null;
        
        // Reset UI elements
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
