/**
 * Contract Utilities Module (Phase 1)
 * 
 * Provides utility functions for contract parsing, normalization, and validation
 * Uses SheetJS (xlsx) library for Excel operations
 * 
 * Phase 1 implements:
 * - Sheet discovery and column detection
 * - Column mapping suggestions (auto-mapping)
 * - Contract extraction and normalization
 * - Data validation and cleanup
 */

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
export const VALID_STATUS_VALUES = ['inbearb', 'fertig', 'offen'];

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
 * Normalize status value to lowercase enum
 * @param {string} status - Raw status string
 * @returns {string} Normalized status
 */
export function normalizeStatus(status) {
    if (!status || typeof status !== 'string') {
        return '';
    }
    
    const normalized = status.toLowerCase().trim();
    
    // Map common variations
    const statusMap = {
        'in bearbeitung': 'inbearb',
        'in arbeit': 'inbearb',
        'offen': 'offen',
        'open': 'offen',
        'fertig': 'fertig',
        'abgeschlossen': 'fertig',
        'done': 'fertig',
        'complete': 'fertig',
        'completed': 'fertig'
    };
    
    return statusMap[normalized] || normalized;
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
