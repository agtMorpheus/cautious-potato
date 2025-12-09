/**
 * Contract Utilities Module (Phase 1 & 2)
 * 
 * Provides utility functions for contract parsing, normalization, and validation
 * Uses SheetJS (xlsx) library for Excel operations
 * 
 * Phase 1 implements:
 * - Sheet discovery and column detection
 * - Column mapping suggestions (auto-mapping)
 * - Contract extraction and normalization
 * - Data validation and cleanup
 * 
 * Phase 2 adds:
 * - File reading and workbook parsing
 * - High-level import workflow
 * - Enhanced extraction with async support
 */

// Re-export Phase 2 modules for convenience
export {
    discoverContractSheets as discoverContractSheetsV2,
    suggestContractColumnMapping as suggestContractColumnMappingV2,
    inferColumnType
} from './contractColumnMapper.js';

export {
    parseExcelDate,
    parseRowWithMapping,
    validateContractRow,
    normalizeContractData,
    createContractObject,
    processContractRow
} from './contractNormalizer.js';

// Default column mapping configuration
// Maps contract object fields to expected Excel columns
export const DEFAULT_COLUMN_MAPPING = {
    // Required fields (import fails if missing)
    contractId: { excelColumn: 'A', type: 'string', required: true },
    contractTitle: { excelColumn: 'F', type: 'string', required: true },
    status: { excelColumn: 'M', type: 'string', required: true },

    // Recommended fields (import continues if missing, but marked as incomplete)
    location: { excelColumn: 'H', type: 'string', required: false },
    equipmentId: { excelColumn: 'J', type: 'string', required: false },
    plannedStart: { excelColumn: 'O', type: 'date', required: false },

    // Optional fields
    taskId: { excelColumn: 'B', type: 'string', required: false },
    taskType: { excelColumn: 'C', type: 'string', required: false },
    description: { excelColumn: 'G', type: 'string', required: false },
    roomArea: { excelColumn: 'I', type: 'string', required: false },
    equipmentDescription: { excelColumn: 'L', type: 'string', required: false },
    serialNumber: { excelColumn: 'P', type: 'string', required: false },
    workorderCode: { excelColumn: 'N', type: 'string', required: false },
    reportedBy: { excelColumn: 'D', type: 'string', required: false },
    reportedDate: { excelColumn: 'E', type: 'date', required: false }
};

// Valid status values for contracts
export const VALID_STATUS_VALUES = [
    'Erstellt',
    'Geplant',
    'Freigegeben',
    'In Bearbeitung',
    'Wochenende',
    'Steiger',
    'Nicht Auffindbar',
    'Noch geprueft',
    'Verschlossen',
    'Doppelt',
    'Demontiert',
    'Abgelehnt',
    'Genehmigt',
    'Bereit zur Abrechnung',
    'Abgerechnet',
    'Archiviert'
];

// Pattern for equipment ID format (e.g., "1100-00003-HG-B22")
const EQUIPMENT_ID_PATTERN = /^\d{4}-[\w]+-[\w]+-[\w]+$/;

/**
 * Generate a UUID v4 for contract records
 * @returns {string} UUID string
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Convert Excel column letter to index (A=0, B=1, ..., Z=25, AA=26, etc.)
 * @param {string} column - Column letter(s)
 * @returns {number} Zero-based column index
 */
export function columnLetterToIndex(column) {
    if (!column || typeof column !== 'string') {
        return -1;
    }

    let index = 0;
    const upperColumn = column.toUpperCase();

    for (let i = 0; i < upperColumn.length; i++) {
        const charCode = upperColumn.charCodeAt(i) - 64; // A=1, B=2, etc.
        index = index * 26 + charCode;
    }

    return index - 1; // Convert to zero-based
}

/**
 * Convert column index to Excel column letter
 * @param {number} index - Zero-based column index
 * @returns {string} Column letter(s)
 */
export function indexToColumnLetter(index) {
    if (typeof index !== 'number' || index < 0) {
        return '';
    }

    let letter = '';
    let temp = index + 1; // Convert to 1-based

    while (temp > 0) {
        const remainder = (temp - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        temp = Math.floor((temp - 1) / 26);
    }

    return letter;
}

/**
 * Get cell value safely from worksheet
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} address - Cell address (e.g., 'A1')
 * @returns {*} Cell value or null
 */
function getCellValue(worksheet, address) {
    const cell = worksheet[address];
    return cell ? cell.v : null;
}

/**
 * Discover all sheets in a workbook and extract metadata
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Object} Object containing sheet metadata
 */
export function discoverContractSheets(workbook) {
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Workbook enthält keine Arbeitsblätter');
    }

    const sheets = {};

    workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            return;
        }

        // Get the range of the worksheet
        const range = worksheet['!ref'];
        if (!range) {
            sheets[sheetName] = {
                sheetName,
                rowCount: 0,
                columns: [],
                isEmpty: true
            };
            return;
        }

        // Parse range to get dimensions
        const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!rangeMatch) {
            sheets[sheetName] = {
                sheetName,
                rowCount: 0,
                columns: [],
                isEmpty: true
            };
            return;
        }

        const startCol = rangeMatch[1];
        const startRow = parseInt(rangeMatch[2], 10);
        const endCol = rangeMatch[3];
        const endRow = parseInt(rangeMatch[4], 10);

        const rowCount = endRow - startRow + 1;

        // Extract column headers from first row
        const columns = [];
        const startColIndex = columnLetterToIndex(startCol);
        const endColIndex = columnLetterToIndex(endCol);

        for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex++) {
            const colLetter = indexToColumnLetter(colIndex);
            const headerAddress = `${colLetter}1`;
            const headerValue = getCellValue(worksheet, headerAddress);

            // Determine data type from sample data (row 2)
            const sampleAddress = `${colLetter}2`;
            const sampleValue = getCellValue(worksheet, sampleAddress);
            let dataType = 'string';

            if (sampleValue !== null) {
                if (typeof sampleValue === 'number') {
                    dataType = 'number';
                } else if (sampleValue instanceof Date ||
                    (typeof sampleValue === 'number' && sampleValue > 40000 && sampleValue < 50000)) {
                    // Excel date serial numbers are typically in this range
                    dataType = 'date';
                }
            }

            columns.push({
                index: colIndex,
                letter: colLetter,
                header: headerValue ? String(headerValue).trim() : null,
                type: dataType,
                visible: true // Default to visible; hidden column detection would require additional processing
            });
        }

        sheets[sheetName] = {
            sheetName,
            rowCount: rowCount - 1, // Exclude header row
            columns,
            isEmpty: rowCount <= 1
        };
    });

    return sheets;
}

/**
 * Suggest column mapping based on discovered columns
 * Matches header names to expected contract fields
 * @param {Array} columns - Array of column metadata from discoverContractSheets
 * @returns {Object} Suggested mapping { fieldName: columnLetter }
 */
export function suggestContractColumnMapping(columns) {
    if (!Array.isArray(columns) || columns.length === 0) {
        return { ...DEFAULT_COLUMN_MAPPING };
    }

    const mapping = {};

    // Header name patterns for auto-detection (German headers)
    const headerPatterns = {
        contractId: ['auftrag', 'auftragsnr', 'auftragsnummer', 'contract'],
        contractTitle: ['auftragskopftitel', 'titel', 'title', 'bezeichnung'],
        taskId: ['aufgabe', 'aufgabennr', 'task'],
        taskType: ['aufgabenart', 'typ', 'type'],
        reportedBy: ['melder', 'ersteller', 'reporter'],
        reportedDate: ['meldedatum', 'datum', 'date'],
        description: ['beschreibung', 'description', 'details'],
        location: ['standort', 'location', 'ort'],
        roomArea: ['säule', 'raum', 'room', 'area'],
        equipmentId: ['anlagennummer', 'anlage', 'equipment'],
        equipmentDescription: ['anlagenbeschreibung', 'equipmentdescription'],
        status: ['status', 'zustand', 'state'],
        workorderCode: ['workorder', 'kst', 'kostenstelle'],
        plannedStart: ['sollstart', 'startdatum', 'planned'],
        serialNumber: ['seriennummer', 'serial', 'sn']
    };

    // First pass: match by header name
    for (const [field, patterns] of Object.entries(headerPatterns)) {
        for (const col of columns) {
            if (!col.header) continue;

            const normalizedHeader = col.header.toLowerCase().replace(/[\s\-_]/g, '');

            for (const pattern of patterns) {
                if (normalizedHeader.includes(pattern.toLowerCase())) {
                    mapping[field] = {
                        excelColumn: col.letter,
                        type: DEFAULT_COLUMN_MAPPING[field]?.type || 'string',
                        required: DEFAULT_COLUMN_MAPPING[field]?.required || false,
                        detectedHeader: col.header
                    };
                    break;
                }
            }

            if (mapping[field]) break;
        }
    }

    // Second pass: fill in missing required fields with defaults
    for (const [field, config] of Object.entries(DEFAULT_COLUMN_MAPPING)) {
        if (!mapping[field]) {
            mapping[field] = { ...config, detectedHeader: null };
        }
    }

    return mapping;
}

/**
 * Extract contracts from a worksheet using the specified column mapping
 * @param {Object} workbook - SheetJS workbook object
 * @param {string} sheetName - Name of the sheet to extract from
 * @param {Object} mapping - Column mapping configuration
 * @returns {Object} { contracts: Array, errors: Array, warnings: Array }
 */
export function extractContractsFromSheet(workbook, sheetName, mapping) {
    if (!workbook || !workbook.Sheets || !workbook.Sheets[sheetName]) {
        return {
            contracts: [],
            errors: [`Sheet "${sheetName}" nicht gefunden`],
            warnings: []
        };
    }

    const worksheet = workbook.Sheets[sheetName];
    const contracts = [];
    const errors = [];
    const warnings = [];

    // Get the range of the worksheet
    const range = worksheet['!ref'];
    if (!range) {
        return {
            contracts: [],
            errors: ['Arbeitsblatt ist leer'],
            warnings: []
        };
    }

    // Parse range to get dimensions
    const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!rangeMatch) {
        return {
            contracts: [],
            errors: ['Ungültiger Bereich im Arbeitsblatt'],
            warnings: []
        };
    }

    const startRow = 2; // Skip header row
    const endRow = parseInt(rangeMatch[4], 10);

    // Process each row
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
        const rowResult = extractContractFromRow(worksheet, rowIndex, mapping, sheetName);

        if (rowResult.error) {
            errors.push(`Zeile ${rowIndex}: ${rowResult.error}`);
            continue;
        }

        if (rowResult.warning) {
            warnings.push(`Zeile ${rowIndex}: ${rowResult.warning}`);
        }

        if (rowResult.contract) {
            contracts.push(rowResult.contract);
        }
    }

    return { contracts, errors, warnings };
}

/**
 * Extract a single contract from a worksheet row
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {number} rowIndex - Row number (1-based)
 * @param {Object} mapping - Column mapping configuration
 * @param {string} sheetName - Name of the sheet
 * @returns {Object} { contract: Object|null, error: string|null, warning: string|null }
 */
function extractContractFromRow(worksheet, rowIndex, mapping, sheetName) {
    const contract = {
        id: generateUUID(),
        sourceFile: {
            sheet: sheetName,
            rowIndex,
            importedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        importVersion: 1
    };

    // Extract values based on mapping
    for (const [field, config] of Object.entries(mapping)) {
        const cellAddress = `${config.excelColumn}${rowIndex}`;
        let value = getCellValue(worksheet, cellAddress);

        // Apply type conversion
        if (value !== null && value !== undefined) {
            value = convertValue(value, config.type);
        }

        // Apply cleanup
        if (typeof value === 'string') {
            value = cleanupStringValue(value);
        }

        contract[field] = value;
    }

    // Validate required fields
    const validation = validateContractRecord(contract);

    if (!validation.valid) {
        // Check if this is just an empty row
        const hasAnyData = Object.entries(contract)
            .filter(([key]) => !['id', 'sourceFile', 'createdAt', 'updatedAt', 'importVersion'].includes(key))
            .some(([_, value]) => value !== null && value !== undefined && value !== '');

        if (!hasAnyData) {
            return { contract: null, error: null, warning: null }; // Skip empty rows
        }

        return { contract: null, error: validation.errors.join(', '), warning: null };
    }

    // Generate internal key for deduplication
    contract.internalKey = generateInternalKey(contract, rowIndex);

    return {
        contract,
        error: null,
        warning: validation.warnings.length > 0 ? validation.warnings.join(', ') : null
    };
}

/**
 * Convert a value to the specified type
 * @param {*} value - Value to convert
 * @param {string} type - Target type ('string', 'date', 'number')
 * @returns {*} Converted value
 */
function convertValue(value, type) {
    if (value === null || value === undefined) {
        return null;
    }

    switch (type) {
        case 'date':
            // Handle Excel serial date numbers
            if (typeof value === 'number') {
                // Excel serial date conversion (days since 1900-01-01)
                const date = new Date((value - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0]; // YYYY-MM-DD
                }
            }
            // Handle string dates
            if (typeof value === 'string') {
                const parsedDate = new Date(value);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0];
                }
            }
            return null;

        case 'number':
            const num = Number(value);
            return isNaN(num) ? null : num;

        case 'string':
        default:
            return String(value);
    }
}

/**
 * Clean up a string value
 * @param {string} value - String to clean
 * @returns {string} Cleaned string
 */
function cleanupStringValue(value) {
    if (typeof value !== 'string') {
        return value;
    }

    // Trim whitespace
    let cleaned = value.trim();

    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned || null; // Return null for empty strings
}

/**
 * Generate an internal key for contract deduplication
 * @param {Object} contract - Contract object
 * @param {number} rowIndex - Row index from source
 * @returns {string} Internal key string
 */
function generateInternalKey(contract, rowIndex) {
    const parts = [
        contract.contractId || '',
        'task',
        contract.taskId || '',
        'row',
        rowIndex.toString()
    ];
    return parts.join('_');
}

/**
 * Validate a contract record
 * @param {Object} contract - Contract object to validate
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
 */
export function validateContractRecord(contract) {
    const errors = [];
    const warnings = [];

    if (!contract || typeof contract !== 'object') {
        return { valid: false, errors: ['Ungültiges Contract-Objekt'], warnings: [] };
    }

    // Validate required fields
    if (!contract.contractId || String(contract.contractId).trim() === '') {
        errors.push('Contract ID ist erforderlich');
    }

    if (!contract.contractTitle || String(contract.contractTitle).trim() === '') {
        errors.push('Contract-Titel ist erforderlich');
    }

    if (!contract.status || String(contract.status).trim() === '') {
        errors.push('Status ist erforderlich');
    } else {
        // Validate status value
        const normalizedStatus = String(contract.status).toLowerCase().trim();
        if (!VALID_STATUS_VALUES.includes(normalizedStatus)) {
            warnings.push(`Unbekannter Status-Wert: "${contract.status}"`);
        }
    }

    // Validate optional fields if present
    if (contract.plannedStart && typeof contract.plannedStart === 'string') {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(contract.plannedStart)) {
            warnings.push('Geplantes Startdatum hat ungültiges Format');
        }
    }

    if (contract.equipmentId && typeof contract.equipmentId === 'string') {
        // Only warn if it doesn't match the expected pattern
        if (!EQUIPMENT_ID_PATTERN.test(contract.equipmentId) && contract.equipmentId.length > 0) {
            // This is just informational, not a validation failure
            // Some equipment IDs might have different formats
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Normalize status value to standard format
 * @param {string} status - Raw status string
 * @returns {string} Normalized status
 */
export function normalizeStatus(status) {
    if (!status || typeof status !== 'string') {
        return '';
    }

    const normalized = status.trim();

    // Map old status values to new equivalents for backward compatibility
    const statusMap = {
        'inbearb': 'In Bearbeitung',
        'in bearbeitung': 'In Bearbeitung',
        'in arbeit': 'In Bearbeitung',
        'offen': 'Erstellt',
        'open': 'Erstellt',
        'fertig': 'Abgerechnet',
        'abgeschlossen': 'Abgerechnet',
        'done': 'Abgerechnet',
        'complete': 'Abgerechnet',
        'completed': 'Abgerechnet'
    };

    const lowerNormalized = normalized.toLowerCase();

    // Check if it's an old value that needs mapping
    if (statusMap[lowerNormalized]) {
        return statusMap[lowerNormalized];
    }

    // Check if it's already a valid new status value
    if (VALID_STATUS_VALUES.includes(normalized)) {
        return normalized;
    }

    // Return as-is if not found (will be caught by validation)
    return normalized;
}

/**
 * Get summary statistics for imported contracts
 * @param {Array} contracts - Array of contract objects
 * @returns {Object} Summary statistics
 */
export function getContractSummary(contracts) {
    if (!Array.isArray(contracts) || contracts.length === 0) {
        return {
            totalContracts: 0,
            uniqueContractIds: 0,
            byStatus: {},
            byLocation: {},
            dateRange: { earliest: null, latest: null }
        };
    }

    const uniqueContractIds = new Set();
    const byStatus = {};
    const byLocation = {};
    let earliestDate = null;
    let latestDate = null;

    contracts.forEach(contract => {
        // Count unique contract IDs
        if (contract.contractId) {
            uniqueContractIds.add(contract.contractId);
        }

        // Group by status
        const status = normalizeStatus(contract.status) || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Group by location
        const location = contract.location || 'Unbekannt';
        byLocation[location] = (byLocation[location] || 0) + 1;

        // Track date range
        if (contract.plannedStart) {
            const date = new Date(contract.plannedStart);
            if (!isNaN(date.getTime())) {
                if (!earliestDate || date < earliestDate) {
                    earliestDate = date;
                }
                if (!latestDate || date > latestDate) {
                    latestDate = date;
                }
            }
        }
    });

    return {
        totalContracts: contracts.length,
        uniqueContractIds: uniqueContractIds.size,
        byStatus,
        byLocation,
        dateRange: {
            earliest: earliestDate ? earliestDate.toISOString().split('T')[0] : null,
            latest: latestDate ? latestDate.toISOString().split('T')[0] : null
        }
    };
}

// ============================================================
// Phase 2: File I/O and High-Level Import Functions
// ============================================================

/**
 * Read an uploaded Excel file and return a SheetJS workbook object
 * 
 * @param {File} file - File object from file input
 * @returns {Promise<Object>} SheetJS workbook object
 * @throws {Error} If file is invalid or cannot be parsed
 */
export async function readContractWorkbook(file) {
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!file || !file.name) {
            reject(new Error('Keine Datei ausgewählt'));
            return;
        }

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            reject(new Error('Datei muss im .xlsx oder .xls Format sein'));
            return;
        }

        // Validate file size (10 MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error('Datei überschreitet die maximale Größe von 10 MB'));
            return;
        }

        // Read file
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = event.target.result;
                // XLSX is expected to be available globally (loaded via script tag)
                const workbook = XLSX.read(data, { type: 'array' });

                // Attach file metadata to workbook
                workbook.fileName = file.name;
                workbook.fileSize = file.size;

                resolve(workbook);
            } catch (err) {
                reject(new Error(`Fehler beim Parsen der Excel-Datei: ${err.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Fehler beim Lesen der Datei'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Extract contracts from a worksheet using enhanced Phase 2 extraction
 * Async version with progress callback support
 * 
 * @param {Object} workbook - SheetJS workbook object
 * @param {string} sheetName - Name of the sheet to extract from
 * @param {Object} mapping - Column mapping configuration
 * @param {Object} options - Options { skipInvalidRows, maxRows, onProgress }
 * @returns {Promise<Object>} { contracts, errors, warnings, summary }
 */
export async function extractContractsFromSheetAsync(workbook, sheetName, mapping, options = {}) {
    const {
        skipInvalidRows = true,
        maxRows = null,
        onProgress = null
    } = options;

    const startTime = performance.now();
    const contracts = [];
    const errors = [];
    const warnings = [];
    const seen = new Set(); // For deduplication

    try {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            throw new Error(`Arbeitsblatt "${sheetName}" nicht gefunden`);
        }

        // Get worksheet range
        const range = worksheet['!ref'];
        if (!range) {
            throw new Error('Arbeitsblatt ist leer');
        }

        // Parse range
        const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!rangeMatch) {
            throw new Error('Ungültiger Bereich im Arbeitsblatt');
        }

        const endRow = parseInt(rangeMatch[4], 10);
        const startRow = 2; // Skip header row

        // Read all rows as array of arrays
        const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (allRows.length < 2) {
            throw new Error('Arbeitsblatt enthält keine Datenzeilen (nur Kopfzeile)');
        }

        const dataRows = allRows.slice(1); // Skip header
        const limitedRows = maxRows ? dataRows.slice(0, maxRows) : dataRows;
        const totalRows = limitedRows.length;

        // Process each row
        for (let i = 0; i < totalRows; i++) {
            const row = limitedRows[i];
            const excelRowNumber = i + 2; // +2: header row + 0-index

            // Report progress every 100 rows
            if (onProgress && i % 100 === 0) {
                onProgress({ processed: i, total: totalRows });
            }

            try {
                // Check if row is empty
                const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
                if (!hasData) {
                    continue; // Skip empty rows
                }

                // Parse row using mapping
                const rowData = {};
                Object.entries(mapping).forEach(([fieldName, columnInfo]) => {
                    const colLetter = columnInfo.excelColumn || columnInfo;
                    const colIndex = columnLetterToIndex(typeof colLetter === 'string' ? colLetter : colLetter.excelColumn);
                    const rawValue = colIndex >= 0 && colIndex < row.length ? row[colIndex] : null;

                    rowData[fieldName] = {
                        raw: rawValue !== undefined ? rawValue : null,
                        type: columnInfo.type || 'string'
                    };
                });

                // Validate required fields
                const missingFields = [];
                ['contractId', 'contractTitle', 'status'].forEach(field => {
                    const value = rowData[field]?.raw;
                    if (value === null || value === undefined || String(value).trim() === '') {
                        missingFields.push(field);
                    }
                });

                if (missingFields.length > 0) {
                    errors.push({
                        rowIndex: excelRowNumber,
                        contractId: rowData.contractId?.raw || '(unbekannt)',
                        type: 'missing_required_field',
                        missingFields,
                        message: `Fehlende Pflichtfelder: ${missingFields.join(', ')}`
                    });

                    if (skipInvalidRows) continue;
                }

                // Normalize and convert values
                const normalized = {};
                Object.entries(rowData).forEach(([field, data]) => {
                    const { raw, type } = data;

                    if (type === 'date') {
                        // Convert Excel date
                        if (typeof raw === 'number') {
                            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                            const date = new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000);
                            normalized[field] = !isNaN(date.getTime())
                                ? date.toISOString().split('T')[0]
                                : null;
                        } else if (raw) {
                            normalized[field] = String(raw).trim() || null;
                        } else {
                            normalized[field] = null;
                        }
                    } else if (type === 'number') {
                        normalized[field] = raw !== null && raw !== '' ? Number(raw) : null;
                        if (isNaN(normalized[field])) normalized[field] = null;
                    } else {
                        normalized[field] = raw !== null && raw !== undefined
                            ? String(raw).trim() || null
                            : null;
                    }
                });

                // Create contract object
                const contract = {
                    id: generateUUID(),
                    internalKey: `${normalized.contractId || 'unknown'}_row_${excelRowNumber}`,

                    // Core fields
                    contractId: normalized.contractId,
                    contractTitle: normalized.contractTitle,
                    taskId: normalized.taskId || null,
                    taskType: normalized.taskType || null,
                    description: normalized.description || null,

                    // Location & equipment
                    location: normalized.location || null,
                    roomArea: normalized.roomArea || null,
                    equipmentId: normalized.equipmentId || null,
                    equipmentDescription: normalized.equipmentDescription || null,
                    serialNumber: normalized.serialNumber || null,

                    // Management
                    status: normalized.status ? String(normalized.status).toLowerCase() : null,
                    workorderCode: normalized.workorderCode || null,
                    reportedBy: normalized.reportedBy || null,
                    plannedStart: normalized.plannedStart || null,

                    // Metadata
                    sourceFile: {
                        fileName: workbook.fileName || 'unknown.xlsx',
                        sheet: sheetName,
                        rowIndex: excelRowNumber,
                        importedAt: new Date().toISOString()
                    },

                    // Audit
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    importVersion: 1,
                    // Contract is "complete" if at least 2 of 3 recommended fields are present
                    isComplete: [normalized.location, normalized.equipmentId, normalized.plannedStart]
                        .filter(v => v !== null && v !== undefined).length >= 2
                };

                // Check for duplicates
                if (seen.has(contract.internalKey)) {
                    warnings.push({
                        rowIndex: excelRowNumber,
                        contractId: contract.contractId,
                        type: 'duplicate_record',
                        message: 'Doppelter Datensatz (gleiche contractId); übersprungen'
                    });
                    continue;
                }

                seen.add(contract.internalKey);
                contracts.push(contract);

            } catch (rowError) {
                errors.push({
                    rowIndex: excelRowNumber,
                    type: 'parse_error',
                    message: rowError.message
                });
            }
        }

        const endTime = performance.now();
        const summary = {
            totalRows: totalRows,
            successCount: contracts.length,
            errorCount: errors.length,
            warningCount: warnings.length,
            duplicateCount: warnings.filter(w => w.type === 'duplicate_record').length,
            importDuration: Math.round(endTime - startTime)
        };

        return { contracts, errors, warnings, summary };

    } catch (err) {
        return {
            contracts: [],
            errors: [{
                type: 'fatal_error',
                message: err.message
            }],
            warnings: [],
            summary: {
                totalRows: 0,
                successCount: 0,
                errorCount: 1,
                warningCount: 0,
                duplicateCount: 0,
                importDuration: 0
            }
        };
    }
}

/**
 * High-level import function combining discovery, mapping, and extraction
 * 
 * @param {File} file - File object from file input
 * @param {Object|null} userMappingOverrides - Optional user-provided mapping overrides
 * @param {Object} options - Import options { skipInvalidRows, maxRows, onProgress }
 * @returns {Promise<Object>} Complete import result
 */
export async function importContractFile(file, userMappingOverrides = null, options = {}) {
    try {
        // Step 1: Read workbook
        const workbook = await readContractWorkbook(file);

        // Step 2: Discover sheets and columns
        const discoveredSheets = discoverContractSheets(workbook);

        // Step 3: Suggest mapping (use first sheet)
        // Note: discoveredSheets has { sheets: [...] } format (Phase 2)
        if (!discoveredSheets.sheets || discoveredSheets.sheets.length === 0) {
            throw new Error('Keine Arbeitsblätter gefunden');
        }

        const firstSheetInfo = discoveredSheets.sheets[0];
        const firstSheet = firstSheetInfo.name;
        const suggested = suggestContractColumnMapping(discoveredSheets);

        // Step 4: Apply user overrides if provided
        const finalMapping = userMappingOverrides || suggested.mapping;

        // Step 5: Extract contracts
        const extractResult = await extractContractsFromSheetAsync(
            workbook,
            firstSheet,
            finalMapping,
            options
        );

        return {
            fileName: file.name,
            fileSize: file.size,
            discoveredSheets,
            suggestedMapping: suggested,
            finalMapping,
            selectedSheet: firstSheet,
            ...extractResult
        };

    } catch (err) {
        return {
            fileName: file.name,
            errors: [{ type: 'import_error', message: err.message }],
            contracts: [],
            warnings: [],
            summary: {
                totalRows: 0,
                successCount: 0,
                errorCount: 1,
                warningCount: 0,
                duplicateCount: 0,
                importDuration: 0
            }
        };
    }
}
