/**
 * Utility Functions Module
 * 
 * Excel reading, writing, and data manipulation utilities
 * Uses SheetJS (xlsx) library for Excel operations
 */

/**
 * Read Excel file from File object
 * @param {File} file - Excel file to read
 * @returns {Promise<Object>} SheetJS workbook object
 */
export async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Keine Datei ausgewählt'));
            return;
        }
        
        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            reject(new Error('Ungültiges Dateiformat. Bitte wählen Sie eine .xlsx Datei.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (error) {
                reject(new Error('Fehler beim Lesen der Excel-Datei: ' + error.message));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Fehler beim Laden der Datei'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse protokoll workbook and extract metadata
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Object} Metadata object
 */
export function parseProtokollMetadata(workbook) {
    // Check if 'Vorlage' sheet exists
    if (!workbook.Sheets['Vorlage']) {
        throw new Error('Sheet "Vorlage" nicht gefunden');
    }
    
    const worksheet = workbook.Sheets['Vorlage'];
    
    // Extract metadata from specific cells
    const metadata = {
        protokollNr: getCellValue(worksheet, 'U3') || '',
        auftragsNr: getCellValue(worksheet, 'N5') || '',
        anlage: getCellValue(worksheet, 'A10') || '',
        einsatzort: getCellValue(worksheet, 'T10') || '',
        firma: getCellValue(worksheet, 'T7') || '',
        auftraggeber: getCellValue(worksheet, 'A5') || '',
        datum: new Date().toISOString().split('T')[0] // Default to today
    };
    
    // Validate required fields
    const requiredFields = ['auftragsNr', 'anlage'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Fehlende Pflichtfelder: ${missingFields.join(', ')}`);
    }
    
    return metadata;
}

/**
 * Extract positions from protokoll workbook
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Array} Array of position objects
 */
export function extractPositions(workbook) {
    if (!workbook.Sheets['Vorlage']) {
        throw new Error('Sheet "Vorlage" nicht gefunden');
    }
    
    const worksheet = workbook.Sheets['Vorlage'];
    const positionen = [];
    
    // Scan rows 30-325 for position data
    for (let row = 30; row <= 325; row++) {
        const posNr = getCellValue(worksheet, `A${row}`);
        
        // Try multiple columns for quantity (X is mentioned in docs, but may vary)
        let menge = getCellValue(worksheet, `X${row}`) || 
                    getCellValue(worksheet, `B${row}`) ||
                    getCellValue(worksheet, `C${row}`);
        
        // Only include valid entries
        if (posNr && menge && !isNaN(menge)) {
            positionen.push({
                posNr: String(posNr).trim(),
                menge: Number(menge),
                row: row
            });
        }
    }
    
    return positionen;
}

/**
 * Sum positions by position number
 * @param {Array} positionen - Array of position objects
 * @returns {Object} Object with summed quantities by position number
 */
export function sumByPosition(positionen) {
    const summed = {};
    
    positionen.forEach(pos => {
        const key = pos.posNr;
        
        if (!summed[key]) {
            summed[key] = 0;
        }
        
        summed[key] += pos.menge;
    });
    
    return summed;
}

/**
 * Load abrechnung template from file
 * @returns {Promise<Object>} SheetJS workbook object
 */
export async function loadAbrechnungTemplate() {
    try {
        const response = await fetch('templates/abrechnung.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        return workbook;
    } catch (error) {
        throw new Error('Fehler beim Laden des Abrechnung-Templates: ' + error.message);
    }
}

/**
 * Fill abrechnung header with metadata
 * @param {Object} workbook - SheetJS workbook object
 * @param {Object} metadata - Metadata to fill
 * @returns {Object} Updated workbook
 */
export function fillAbrechnungHeader(workbook, metadata) {
    if (!workbook.Sheets['EAW']) {
        throw new Error('Sheet "EAW" nicht gefunden im Template');
    }
    
    const worksheet = workbook.Sheets['EAW'];
    
    // Fill header cells
    setCellValue(worksheet, 'B1', metadata.datum);
    setCellValue(worksheet, 'B2', metadata.auftragsNr);
    setCellValue(worksheet, 'B3', metadata.anlage);
    setCellValue(worksheet, 'B4', metadata.einsatzort);
    
    return workbook;
}

/**
 * Fill abrechnung positions with summed quantities
 * @param {Object} workbook - SheetJS workbook object
 * @param {Object} positionSums - Object with summed quantities
 * @returns {Object} Updated workbook
 */
export function fillAbrechnungPositions(workbook, positionSums) {
    if (!workbook.Sheets['EAW']) {
        throw new Error('Sheet "EAW" nicht gefunden im Template');
    }
    
    const worksheet = workbook.Sheets['EAW'];
    let filledCount = 0;
    
    // Scan template for position numbers and fill quantities
    for (let row = 9; row <= 500; row++) {
        const posNr = getCellValue(worksheet, `A${row}`);
        
        if (posNr && positionSums[posNr]) {
            setCellValue(worksheet, `B${row}`, positionSums[posNr]);
            filledCount++;
        }
    }
    
    console.log(`Filled ${filledCount} positions in abrechnung`);
    return workbook;
}

/**
 * Export workbook as Excel file
 * @param {Object} workbook - SheetJS workbook object
 * @param {string} filename - Filename for export
 */
export function exportToExcel(workbook, filename) {
    try {
        XLSX.writeFile(workbook, filename);
    } catch (error) {
        throw new Error('Fehler beim Exportieren: ' + error.message);
    }
}

/**
 * Get cell value safely
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} address - Cell address (e.g., 'A1')
 * @returns {*} Cell value or null
 */
function getCellValue(worksheet, address) {
    const cell = worksheet[address];
    return cell ? cell.v : null;
}

/**
 * Set cell value
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} address - Cell address (e.g., 'A1')
 * @param {*} value - Value to set
 */
function setCellValue(worksheet, address, value) {
    if (!worksheet[address]) {
        worksheet[address] = {};
    }
    worksheet[address].v = value;
    worksheet[address].t = typeof value === 'number' ? 'n' : 's';
}

/**
 * Generate filename for export
 * @param {string} auftragsNr - Order number
 * @returns {string} Formatted filename
 */
export function generateExportFilename(auftragsNr) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `Abrechnung_${auftragsNr}_${timestamp}.xlsx`;
}
