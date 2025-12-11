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
 * 
 * Phase 3.5 enhancements:
 * - Flexible cell mapping with fallbacks
 * - Pattern-based metadata search
 * - Runtime configuration updates
 */

import {
    METADATA_CELL_CONFIG,
    POSITION_CONFIG,
    ABRECHNUNG_CONFIG,
    PARSING_CONFIG
} from './config.js';

// Mutable configuration (can be updated at runtime)
let METADATA_CELL_MAP = { ...METADATA_CELL_CONFIG };

// Search patterns for finding metadata by content
const METADATA_SEARCH_PATTERNS = {
    protokollNr: /protokoll[-\s]?nr/i,
    auftragsNr: /auftrags[-\s]?nr|order[-\s]?number/i,
    anlage: /anlage|plant/i,
    einsatzort: /einsatzort|location/i,
    firma: /firma|company/i,
    auftraggeber: /auftraggeber|client/i
};

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
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    cellStyles: true  // Preserve cell formatting
                });
                
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
 * Parse protokoll workbook and extract metadata with flexible cell detection
 * @param {Object} workbook - SheetJS workbook object
 * @param {Object} options - Optional configuration { strictMode: boolean, searchRange: string }
 * @returns {Object} Metadata object with foundCells info
 */
export function parseProtokollMetadata(workbook, options = {}) {
    const { 
        strictMode = PARSING_CONFIG.strictMode, 
        searchRange = PARSING_CONFIG.metadataSearchRange 
    } = options;
    
    // Check if configured sheet exists
    const sheetName = PARSING_CONFIG.protokollSheetName;
    if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const metadata = {
        protokollNr: '',
        auftragsNr: '',
        anlage: '',
        einsatzort: '',
        firma: '',
        auftraggeber: '',
        datum: new Date().toISOString().split('T')[0]
    };
    
    const foundCells = {}; // Track where values were found
    
    // Try to find each metadata field using flexible approach
    for (const [field, cellAddresses] of Object.entries(METADATA_CELL_MAP)) {
        let value = null;
        let foundAt = null;
        
        // Strategy 1: Try predefined cell locations (fallbacks)
        for (const address of cellAddresses) {
            value = getCellValue(worksheet, address);
            if (value && String(value).trim()) {
                foundAt = address;
                break;
            }
        }
        
        // Strategy 2: If not found and not in strict mode, search by pattern
        if (!value && !strictMode && METADATA_SEARCH_PATTERNS[field]) {
            const searchResult = searchMetadataByPattern(
                worksheet, 
                METADATA_SEARCH_PATTERNS[field],
                searchRange
            );
            if (searchResult) {
                value = searchResult.value;
                foundAt = searchResult.address;
            }
        }
        
        metadata[field] = value ? String(value).trim() : '';
        foundCells[field] = foundAt;
    }
    
    // Validate required fields
    const requiredFields = ['auftragsNr', 'anlage'];
    const missingFields = requiredFields.filter(field => !metadata[field]);
    
    if (missingFields.length > 0) {
        const error = new Error(`Fehlende Pflichtfelder: ${missingFields.join(', ')}`);
        error.details = [
            'Versuchen Sie:',
            '1. Überprüfen Sie, ob die Werte in den erwarteten Zellen vorhanden sind',
            '2. Verwenden Sie parseProtokollMetadata(workbook, { strictMode: false }) für flexible Suche',
            `3. Erwartete Zellen: ${missingFields.map(f => METADATA_CELL_MAP[f].join(' oder ')).join(', ')}`
        ];
        throw error;
    }
    
    // Log where values were found for debugging
    console.log('Metadata gefunden in Zellen:', foundCells);
    
    return { ...metadata, _foundCells: foundCells };
}

/**
 * Extract positions from protokoll workbook
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Array} Array of position objects
 */
export function extractPositions(workbook) {
    const sheetName = PARSING_CONFIG.protokollSheetName;
    if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const positionen = [];
    
    const { positionNumberColumn, quantityColumns, startRow, endRow } = POSITION_CONFIG;
    
    console.log(`Extracting positions from column ${positionNumberColumn}, rows ${startRow}-${endRow}`);
    console.log(`Looking for quantities in columns: ${quantityColumns.join(', ')}`);
    
    // Scan configured row range for position data
    let foundCount = 0;
    let skippedCount = 0;
    
    for (let row = startRow; row <= endRow; row++) {
        const cellValue = getCellValue(worksheet, `${positionNumberColumn}${row}`);
        
        // Extract position number from cell (might contain extra text)
        let posNr = null;
        if (cellValue) {
            const cellStr = String(cellValue).trim();
            // Try to extract position number pattern from the cell
            const match = cellStr.match(POSITION_CONFIG.positionNumberPattern);
            if (match) {
                posNr = match[0]; // Use the matched position number
            } else if (cellStr) {
                // If no pattern match but cell has value, use it as-is
                // This handles cases where the format is different
                posNr = cellStr;
            }
        }
        
        // Try configured columns for quantity
        let menge = null;
        let foundInColumn = null;
        for (const col of quantityColumns) {
            menge = getCellValue(worksheet, `${col}${row}`);
            if (menge && !isNaN(menge)) {
                foundInColumn = col;
                break;
            }
        }
        
        // Debug: Log first few rows to help troubleshoot
        if (row <= startRow + 5) {
            console.log(`Row ${row}: posNr="${cellValue}" → extracted="${posNr}", menge=${menge} (col ${foundInColumn})`);
        }
        
        // Only include valid entries (must have both position number and quantity)
        if (posNr && menge && !isNaN(menge)) {
            positionen.push({
                posNr: String(posNr).trim(),
                menge: Number(menge),
                row: row,
                column: foundInColumn
            });
            foundCount++;
        } else if (cellValue || menge) {
            skippedCount++;
        }
    }
    
    console.log(`Position extraction complete: Found ${foundCount} positions, skipped ${skippedCount} rows`);
    
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
        
        // Check for invalid Pos.Nr. format using configured pattern
        if (!POSITION_CONFIG.positionNumberPattern.test(pos.posNr)) {
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
    
    // Use single iteration for better performance with large datasets
    let totalQuantity = 0;
    let minQuantity = Infinity;
    let maxQuantity = -Infinity;
    let count = 0;
    
    for (const key in positionMap) {
        if (Object.prototype.hasOwnProperty.call(positionMap, key)) {
            const q = positionMap[key];
            if (typeof q === 'number') {
                totalQuantity += q;
                if (q < minQuantity) minQuantity = q;
                if (q > maxQuantity) maxQuantity = q;
                count++;
            }
        }
    }
    
    return {
        totalQuantity,
        uniquePositions: Object.keys(positionMap).length,
        minQuantity: count > 0 ? minQuantity : 0,
        maxQuantity: count > 0 ? maxQuantity : 0
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
 * Uses minimal cell updates to preserve all Excel formatting
 * @param {Object} workbook - SheetJS workbook object
 * @param {Object} metadata - Metadata to fill
 * @returns {Object} Updated workbook
 */
export function fillAbrechnungHeader(workbook, metadata) {
    const sheetName = ABRECHNUNG_CONFIG.sheetName;
    if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden im Template`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const { header } = ABRECHNUNG_CONFIG;
    
    // Fill header cells using configuration
    // Only update values, preserve all formatting
    const headerData = {
        [header.datum]: metadata.datum,
        [header.auftragsNr]: metadata.auftragsNr,
        [header.anlage]: metadata.anlage,
        [header.einsatzort]: metadata.einsatzort
    };
    
    for (const [address, value] of Object.entries(headerData)) {
        if (!worksheet[address]) {
            worksheet[address] = { t: 's' };
        }
        worksheet[address].v = value;
        worksheet[address].t = typeof value === 'number' ? 'n' : 's';
        if (typeof value === 'string') {
            worksheet[address].w = value;
        }
    }
    
    return workbook;
}

/**
 * Fill abrechnung positions with summed quantities
 * Uses minimal cell updates to preserve all Excel formatting
 * @param {Object} workbook - SheetJS workbook object
 * @param {Object} positionSums - Object with summed quantities
 * @returns {Object} Updated workbook
 */
export function fillAbrechnungPositions(workbook, positionSums) {
    const sheetName = ABRECHNUNG_CONFIG.sheetName;
    if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden im Template`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const { positions } = ABRECHNUNG_CONFIG;
    let filledCount = 0;
    let skippedCount = 0;
    
    // Scan template for position numbers and fill quantities
    // Only update cell values, never delete or recreate cells
    for (let row = positions.startRow; row <= positions.endRow; row++) {
        const posNrAddress = `${positions.positionNumberColumn}${row}`;
        const posNr = getCellValue(worksheet, posNrAddress);
        
        if (posNr && Object.prototype.hasOwnProperty.call(positionSums, posNr)) {
            const quantityAddress = `${positions.quantityColumn}${row}`;
            const quantity = positionSums[posNr];
            
            // Preserve existing cell object if it exists (keeps formatting)
            if (!worksheet[quantityAddress]) {
                worksheet[quantityAddress] = { t: 'n' };
            }
            
            // Only update the value, keep everything else
            worksheet[quantityAddress].v = quantity;
            worksheet[quantityAddress].t = 'n';
            worksheet[quantityAddress].w = String(quantity);
            
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
    const sheetName = ABRECHNUNG_CONFIG.sheetName;
    
    if (!workbook.Sheets[sheetName]) {
        return {
            filledCount: 0,
            emptyCount: 0,
            errors: [`Arbeitsblatt "${sheetName}" nicht gefunden`],
            isValid: false
        };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const { positions } = ABRECHNUNG_CONFIG;
    const errors = [];
    let filledCount = 0;
    let emptyCount = 0;
    
    for (let rowIndex = positions.startRow; rowIndex <= positions.endRow; rowIndex++) {
        const cellAddress = `${positions.positionNumberColumn}${rowIndex}`;
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v) {
            const quantityCell = worksheet[`${positions.quantityColumn}${rowIndex}`];
            
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
 * Export workbook as Excel file with maximum format preservation
 * 
 * NOTE: SheetJS Community Edition has limited support for preserving complex
 * formatting (colors, images, etc.). For full format preservation, consider:
 * 1. Using SheetJS Pro (commercial license)
 * 2. Using a server-side solution with libraries like ExcelJS or python-openpyxl
 * 3. Using Office.js API if running in Office context
 * 
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
        
        // Write the file with all available preservation options
        // Note: cellStyles option in Community Edition has limited effect
        // It primarily preserves number formats, not colors/images/etc.
        XLSX.writeFile(workbook, filename, {
            bookType: 'xlsx',
            bookSST: true,
            cellStyles: true,
            compression: true
        });
        
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
 * Search for metadata value by pattern in worksheet
 * Looks for a label cell matching the pattern, then checks adjacent cells for the value
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {RegExp} pattern - Pattern to match label
 * @param {string} searchRange - Range to search (e.g., 'A1:Z50')
 * @returns {Object|null} { value, address } or null if not found
 */
function searchMetadataByPattern(worksheet, pattern, searchRange = 'A1:Z50') {
    const range = XLSX.utils.decode_range(searchRange);
    
    // Scan all cells in range for label
    for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cellValue = getCellValue(worksheet, cellAddress);
            
            if (cellValue && pattern.test(String(cellValue))) {
                // Found label cell, now look for the actual value in adjacent cells
                // Priority: Right (most common), Two cells right, Below, Diagonal, Left
                const adjacentCells = [
                    { r: row, c: col + 1 },     // Right (most common: Label | Value)
                    { r: row, c: col + 2 },     // Two cells right
                    { r: row + 1, c: col },     // Below
                    { r: row + 1, c: col + 1 }, // Diagonal
                    { r: row, c: col - 1 }      // Left (less common)
                ];
                
                for (const pos of adjacentCells) {
                    if (pos.r >= range.s.r && pos.r <= range.e.r && 
                        pos.c >= range.s.c && pos.c <= range.e.c) {
                        const adjAddress = XLSX.utils.encode_cell(pos);
                        const adjValue = getCellValue(worksheet, adjAddress);
                        
                        // Make sure we found a value AND it's not another label
                        // (i.e., it doesn't match the same pattern)
                        if (adjValue && String(adjValue).trim() && !pattern.test(String(adjValue))) {
                            console.log(`Pattern search: Found "${cellValue}" at ${cellAddress}, value "${adjValue}" at ${adjAddress}`);
                            return { value: adjValue, address: adjAddress };
                        }
                    }
                }
                
                // If we found the label but no adjacent value, log it for debugging
                console.warn(`Pattern search: Found label "${cellValue}" at ${cellAddress} but no adjacent value`);
            }
        }
    }
    
    return null;
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
 * Set cell value while preserving existing cell formatting
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} address - Cell address (e.g., 'A1')
 * @param {*} value - Value to set
 */
function setCellValue(worksheet, address, value) {
    // If cell doesn't exist, create it with basic structure
    if (!worksheet[address]) {
        worksheet[address] = {};
    }
    
    // Preserve existing cell properties (formatting, styles, etc.)
    // Only update the value and type
    const cell = worksheet[address];
    cell.v = value;
    cell.t = typeof value === 'number' ? 'n' : 's';
    
    // If it's a number, also set the raw value
    if (typeof value === 'number') {
        cell.w = String(value); // formatted text
    }
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

/**
 * Update metadata cell mapping configuration
 * Allows runtime customization of where to look for metadata fields
 * @param {string} field - Field name (e.g., 'auftragsNr')
 * @param {Array<string>} cellAddresses - Array of cell addresses to try (e.g., ['N5', 'M5'])
 */
export function updateMetadataCellMap(field, cellAddresses) {
    if (!Array.isArray(cellAddresses) || cellAddresses.length === 0) {
        throw new Error('cellAddresses muss ein nicht-leeres Array sein');
    }
    
    METADATA_CELL_MAP[field] = cellAddresses;
    console.log(`Metadata cell map aktualisiert: ${field} → ${cellAddresses.join(', ')}`);
}

/**
 * Get current metadata cell mapping configuration
 * @returns {Object} Current cell mapping configuration
 */
export function getMetadataCellMap() {
    return { ...METADATA_CELL_MAP };
}

/**
 * Reset metadata cell mapping to defaults
 */
export function resetMetadataCellMap() {
    METADATA_CELL_MAP = { ...METADATA_CELL_CONFIG };
    console.log('Metadata cell map auf Standard zurückgesetzt');
}
