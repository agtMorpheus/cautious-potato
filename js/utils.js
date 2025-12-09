/**
 * Utility Functions Module (Phase 3)
 * 
 * Excel reading, writing, and data manipulation utilities
 * Uses SheetJS (xlsx) library for Excel operations
 * 
 * Phase 3 implements:
 * - Excel file reading with metadata
 * - Protokoll parsing and validation
 * - Position extraction and aggregation
 * - Template caching for performance
 * - Export workbook creation
 * - Comprehensive error handling
 */

// Configuration constants
const QUANTITY_COLUMN_FALLBACKS = ['X', 'B', 'C']; // Columns to check for quantity values

// Position number format pattern: DD.DD.DDDD (e.g., "01.01.0010")
const POSITION_NUMBER_PATTERN = /^\d{2}\.\d{2}\.\d{4}/;

// Template cache for performance optimization
// Cache the raw ArrayBuffer instead of parsed workbook to preserve formatting on clone
let cachedAbrechnungTemplateBuffer = null;

/**
 * Read Excel file from File object
 * Returns workbook object with file metadata for Phase 3 compatibility
 * @param {File} file - Excel file to read
 * @returns {Promise<Object>} Object containing workbook and metadata
 * @throws {Error} If file is not valid Excel or cannot be read
 */
export async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Keine Datei ausgewählt'));
            return;
        }
        
        const fileName = file.name;
        
        // Validate file type - accept .xlsx files
        const validExtensions = ['.xlsx', '.xls'];
        const hasValidExtension = validExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
        
        if (!hasValidExtension) {
            reject(new Error('Ungültiges Dateiformat. Bitte wählen Sie eine .xlsx Datei.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('Arbeitsmappe enthält keine Arbeitsblätter');
                }
                
                // Return object with workbook and metadata (Phase 3 structure)
                resolve({
                    workbook,
                    metadata: {
                        fileName,
                        fileSize: file.size,
                        readAt: new Date().toISOString()
                    }
                });
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
        
        // Try configured columns for quantity
        let menge = null;
        for (const col of QUANTITY_COLUMN_FALLBACKS) {
            menge = getCellValue(worksheet, `${col}${row}`);
            if (menge && !isNaN(menge)) {
                break;
            }
        }
        
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
 * Sum positions by position number.
 * 
 * Note: This function throws errors for invalid input that prevents processing,
 * in contrast to validateExtractedPositions() which collects validation issues
 * for reporting. Use validateExtractedPositions() before this function to get
 * user-friendly validation feedback, or use safeReadAndParseProtokoll() for
 * complete error handling.
 * 
 * @param {Array} positionen - Array of position objects
 * @returns {Object} Object with summed quantities by position number
 * @throws {Error} If positionen is not an array or contains invalid objects
 */
export function sumByPosition(positionen) {
    if (!Array.isArray(positionen)) {
        throw new Error('Positionen muss ein Array sein');
    }
    
    const summed = {};
    
    positionen.forEach(pos => {
        if (!pos || typeof pos !== 'object') {
            throw new Error('Ungültiges Positionsobjekt im Array');
        }
        
        const { posNr, menge } = pos;
        
        if (!posNr || typeof posNr !== 'string') {
            throw new Error(`Ungültige Positionsnummer: ${posNr}`);
        }
        
        if (typeof menge !== 'number' || Number.isNaN(menge)) {
            throw new Error(`Ungültige Menge für Position ${posNr}: ${menge}`);
        }
        
        if (!summed[posNr]) {
            summed[posNr] = 0;
        }
        
        summed[posNr] += menge;
    });
    
    return summed;
}

/**
 * Validate extracted positions for common issues
 * @param {Array} positionen - Array of position objects
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
 */
export function validateExtractedPositions(positionen) {
    const errors = [];
    const warnings = [];
    
    if (!Array.isArray(positionen)) {
        return {
            valid: false,
            errors: ['Positionen ist kein Array'],
            warnings: []
        };
    }
    
    if (positionen.length === 0) {
        warnings.push('Keine Positionen wurden aus dem Protokoll extrahiert');
    }
    
    const posNrMap = new Map();
    
    positionen.forEach((pos, index) => {
        if (!pos || typeof pos !== 'object') {
            errors.push(`Position an Index ${index} ist kein Objekt`);
            return;
        }
        
        // Check for duplicate Pos.Nr.
        if (posNrMap.has(pos.posNr)) {
            warnings.push(`Position ${pos.posNr} erscheint mehrfach (Zeilen ${posNrMap.get(pos.posNr)} und ${pos.row})`);
        } else {
            posNrMap.set(pos.posNr, pos.row);
        }
        
        // Check for invalid Pos.Nr. format using named constant
        if (!POSITION_NUMBER_PATTERN.test(pos.posNr)) {
            warnings.push(`Position ${pos.posNr} in Zeile ${pos.row} hat unerwartetes Format`);
        }
        
        // Check for negative quantities
        if (pos.menge < 0) {
            errors.push(`Position ${pos.posNr} hat negative Menge (${pos.menge})`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Compute summary statistics for position sums
 * @param {Object} positionMap - Map of posNr → totalMenge
 * @returns {Object} { totalQuantity, uniquePositions, minQuantity, maxQuantity }
 */
export function getPositionSummary(positionMap) {
    if (!positionMap || typeof positionMap !== 'object') {
        return {
            totalQuantity: 0,
            uniquePositions: 0,
            minQuantity: 0,
            maxQuantity: 0
        };
    }
    
    const quantities = Object.values(positionMap).filter(q => typeof q === 'number');
    
    return {
        totalQuantity: quantities.reduce((sum, q) => sum + q, 0),
        uniquePositions: Object.keys(positionMap).length,
        minQuantity: quantities.length > 0 ? Math.min(...quantities) : 0,
        maxQuantity: quantities.length > 0 ? Math.max(...quantities) : 0
    };
}

/**
 * Load abrechnung template from file with caching
 * Template ArrayBuffer is cached in memory to avoid repeated file fetches.
 * The workbook is re-parsed from the ArrayBuffer each time to preserve
 * all Excel formatting (styles, merged cells, colors, etc.) that would be
 * lost with JSON serialization.
 * @returns {Promise<Object>} SheetJS workbook object
 * @throws {Error} If template cannot be loaded
 */
export async function loadAbrechnungTemplate() {
    try {
        // Fetch and cache the ArrayBuffer if not already cached
        if (!cachedAbrechnungTemplateBuffer) {
            const response = await fetch('templates/abrechnung.xlsx');
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Abrechnung-Template nicht gefunden. Bitte stellen Sie sicher, dass templates/abrechnung.xlsx existiert.');
                } else if (response.status >= 500) {
                    throw new Error('Server-Fehler beim Laden des Templates. Bitte versuchen Sie es später erneut.');
                } else {
                    throw new Error(`HTTP Fehler ${response.status}: ${response.statusText}`);
                }
            }
            
            cachedAbrechnungTemplateBuffer = await response.arrayBuffer();
            console.log('Abrechnung template ArrayBuffer loaded and cached');
        } else {
            console.log('Using cached abrechnung template ArrayBuffer');
        }
        
        // Parse a fresh workbook from the cached ArrayBuffer each time
        // to preserve all Excel formatting (cellStyles: true includes styles)
        const workbook = XLSX.read(cachedAbrechnungTemplateBuffer, { 
            type: 'array',
            cellStyles: true
        });
        
        if (!workbook || !workbook.SheetNames.includes('EAW')) {
            throw new Error('Template-Arbeitsmappe fehlt "EAW" Arbeitsblatt');
        }
        
        return workbook;
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error instanceof TypeError) {
            throw new Error('Netzwerkfehler: Konnte Template nicht laden. Stellen Sie sicher, dass der Server läuft und die Datei existiert.');
        }
        throw error;
    }
}

/**
 * Clear the cached template (useful for testing or when template changes)
 */
export function clearAbrechnungTemplateCache() {
    cachedAbrechnungTemplateBuffer = null;
    console.log('Abrechnung template cache cleared');
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
    let skippedCount = 0;
    
    // Scan template for position numbers and fill quantities
    for (let row = 9; row <= 500; row++) {
        const posNr = getCellValue(worksheet, `A${row}`);
        
        if (posNr && Object.prototype.hasOwnProperty.call(positionSums, posNr)) {
            setCellValue(worksheet, `B${row}`, positionSums[posNr]);
            filledCount++;
        } else if (posNr) {
            skippedCount++;
        }
    }
    
    console.log(`Filled ${filledCount} positions, skipped ${skippedCount} template positions`);
    return workbook;
}

/**
 * Validate that quantities have been properly written to abrechnung
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Object} { filledCount, emptyCount, errors, isValid }
 */
export function validateFilledPositions(workbook) {
    const sheetName = 'EAW';
    
    if (!workbook.Sheets[sheetName]) {
        return {
            filledCount: 0,
            emptyCount: 0,
            errors: ['Arbeitsblatt "EAW" nicht gefunden'],
            isValid: false
        };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const errors = [];
    let filledCount = 0;
    let emptyCount = 0;
    
    for (let rowIndex = 9; rowIndex <= 500; rowIndex++) {
        const cellAddress = `A${rowIndex}`;
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v) {
            const quantityCell = worksheet[`B${rowIndex}`];
            
            if (quantityCell && quantityCell.v !== undefined && quantityCell.v !== null) {
                filledCount++;
            } else {
                emptyCount++;
            }
        }
    }
    
    return {
        filledCount,
        emptyCount,
        errors,
        isValid: errors.length === 0
    };
}

/**
 * Create a complete abrechnung workbook ready for export
 * @param {Object} abrechnungData - Combined data object { header, positionen }
 * @returns {Promise<Object>} Final workbook ready to write
 * @throws {Error} If data is invalid or template cannot be loaded
 */
export async function createExportWorkbook(abrechnungData) {
    if (!abrechnungData || typeof abrechnungData !== 'object') {
        throw new Error('Ungültige abrechnungData');
    }
    
    const { header, positionen } = abrechnungData;
    
    if (!header || !positionen) {
        throw new Error('Header oder Positionen fehlen in abrechnungData');
    }
    
    try {
        // Load template (may use cache)
        const workbook = await loadAbrechnungTemplate();
        
        // Create legacy metadata format for fillAbrechnungHeader
        const legacyMetadata = {
            datum: header.date,
            auftragsNr: header.orderNumber,
            anlage: header.plant,
            einsatzort: header.location
        };
        
        // Fill header
        fillAbrechnungHeader(workbook, legacyMetadata);
        
        // Fill positions
        fillAbrechnungPositions(workbook, positionen);
        
        // Validate
        const validation = validateFilledPositions(workbook);
        if (!validation.isValid) {
            console.warn('Position validation warnings:', validation.errors);
        }
        
        console.log('Export workbook created successfully');
        return workbook;
    } catch (error) {
        throw new Error(`Fehler beim Erstellen des Export-Workbooks: ${error.message}`);
    }
}

/**
 * Wrap utility calls with standardized error handling for safe protokoll reading
 * @param {File} file - Excel file to read
 * @returns {Promise<Object>} { success, metadata, positionen, positionSums, errors, warnings }
 */
export async function safeReadAndParseProtokoll(file) {
    const errors = [];
    const warnings = [];
    
    try {
        // Step 1: Read file
        let result;
        try {
            result = await readExcelFile(file);
        } catch (e) {
            errors.push(`Datei-Lesefehler: ${e.message}`);
            throw e;
        }
        
        const { workbook } = result;
        
        // Step 2: Parse metadata
        let metadata;
        try {
            metadata = parseProtokollMetadata(workbook);
        } catch (e) {
            errors.push(`Metadaten-Parsefehler: ${e.message}`);
            if (e.details) {
                errors.push(...e.details);
            }
            throw e;
        }
        
        // Step 3: Extract positions
        let positionen;
        try {
            positionen = extractPositions(workbook);
        } catch (e) {
            errors.push(`Positions-Extraktionsfehler: ${e.message}`);
            throw e;
        }
        
        // Step 4: Validate positions
        const validation = validateExtractedPositions(positionen);
        if (!validation.valid) {
            errors.push(...validation.errors);
        }
        if (validation.warnings.length > 0) {
            warnings.push(...validation.warnings);
        }
        
        // Step 5: Aggregate
        const positionSums = sumByPosition(positionen);
        
        return {
            success: errors.length === 0,
            metadata,
            positionen,
            positionSums,
            errors,
            warnings
        };
    } catch (error) {
        return {
            success: false,
            metadata: null,
            positionen: [],
            positionSums: {},
            errors: errors.length > 0 ? errors : [error.message],
            warnings
        };
    }
}

/**
 * Export workbook as Excel file
 * @param {Object} workbook - SheetJS workbook object
 * @param {string} filename - Filename for export
 */
export function exportToExcel(workbook, metadata) {
    try {
        // Generate filename based on metadata
        let filename;
        if (metadata && metadata.orderNumber) {
            filename = generateExportFilename(metadata.orderNumber);
        } else if (typeof metadata === 'string') {
            // Backward compatibility: if metadata is a string, treat it as filename
            filename = metadata;
        } else {
            filename = generateExportFilename('Abrechnung');
        }
        
        // Write the file
        XLSX.writeFile(workbook, filename);
        
        // Return metadata for Phase 4
        return {
            fileName: filename,
            fileSize: 0 // Browser doesn't provide actual file size for downloads
        };
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
