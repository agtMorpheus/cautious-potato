/**
 * Contract Normalizer Module (Phase 2)
 * 
 * Provides data normalization and validation functions for contract imports.
 * Handles row parsing, data conversion, validation, and contract object creation.
 * 
 * Phase 2 implements:
 * - Row parsing with column mapping
 * - Data type conversion and normalization
 * - Required field validation
 * - Contract object creation with metadata
 */

/**
 * Parse Excel date value to ISO string format
 * Handles Excel serial dates and common string formats
 * 
 * @param {*} value - Date value to parse
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseExcelDate(value) {
    if (!value && value !== 0) {
        return null;
    }
    
    // Treat 0 as "no date" since it represents the Excel epoch which is rarely intentional
    if (value === 0) {
        return null;
    }
    
    // Excel serial date (number from 1/1/1900)
    if (typeof value === 'number') {
        // Excel uses 1900 date system (days since Jan 1, 1900)
        // Excel incorrectly treats 1900 as a leap year, so dates after Feb 28, 1900 
        // are off by 1 day. We use the standard conversion.
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        return null;
    }
    
    // Handle string dates
    if (typeof value === 'string') {
        // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            return value.substring(0, 10);
        }
        
        // DD/MM/YYYY format
        const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
            const [_, day, month, year] = slashMatch;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        // DD.MM.YYYY format (German)
        const dotMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (dotMatch) {
            const [_, day, month, year] = dotMatch;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        // Try native Date parsing as fallback
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
    }
    
    // Handle Date objects
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString().split('T')[0];
    }
    
    return null;
}

/**
 * Convert Excel column letter to zero-based index
 * @param {string} column - Column letter(s)
 * @returns {number} Zero-based column index
 */
function columnLetterToIndex(column) {
    if (!column || typeof column !== 'string') {
        return -1;
    }
    
    let index = 0;
    const upperColumn = column.toUpperCase();
    
    for (let i = 0; i < upperColumn.length; i++) {
        const charCode = upperColumn.charCodeAt(i) - 64;
        index = index * 26 + charCode;
    }
    
    return index - 1;
}

/**
 * Parse a row of data using the column mapping
 * Extracts cell values based on the mapping configuration
 * 
 * @param {Array} row - Array of cell values from the row
 * @param {Object} mapping - Column mapping { fieldName: { excelColumn, type, ... } }
 * @param {Array} headerRow - Header row for reference (optional)
 * @returns {Object} Parsed row data { fieldName: { raw, columnLetter, columnIndex, type } }
 */
export function parseRowWithMapping(row, mapping, headerRow = null) {
    const rowData = {};
    
    Object.entries(mapping).forEach(([fieldName, columnInfo]) => {
        const columnLetter = columnInfo.excelColumn;
        const columnIndex = columnLetterToIndex(columnLetter);
        
        // Get raw value from row array
        const rawValue = columnIndex >= 0 && columnIndex < row.length 
            ? row[columnIndex] 
            : null;
        
        rowData[fieldName] = {
            raw: rawValue !== undefined ? rawValue : null,
            columnLetter,
            columnIndex,
            type: columnInfo.type || 'string'
        };
    });
    
    return rowData;
}

/**
 * Validate a parsed contract row
 * Checks required fields and collects validation warnings
 * 
 * @param {Object} rowData - Parsed row data from parseRowWithMapping
 * @param {Object} mapping - Column mapping configuration
 * @returns {Object} Validation result { isValid, missingFields, warnings }
 */
export function validateContractRow(rowData, mapping) {
    const missingFields = [];
    const warnings = [];
    
    // Required fields that must have non-empty values
    const requiredFields = ['contractId', 'contractTitle', 'status'];
    
    requiredFields.forEach(field => {
        const fieldData = rowData[field];
        const value = fieldData?.raw;
        
        if (value === null || value === undefined || String(value).trim() === '') {
            missingFields.push(field);
        }
    });
    
    // Additional validations for specific fields
    const statusValue = rowData.status?.raw;
    if (statusValue) {
        const normalizedStatus = String(statusValue).toLowerCase().trim();
        const validStatuses = ['inbearb', 'fertig', 'offen', 'in bearbeitung', 'abgeschlossen', 'done', 'open'];
        if (!validStatuses.some(s => normalizedStatus.includes(s))) {
            warnings.push({
                type: 'unknown_status',
                field: 'status',
                message: `Unknown status value: "${statusValue}"`
            });
        }
    }
    
    return {
        isValid: missingFields.length === 0,
        missingFields,
        warnings
    };
}

/**
 * Normalize contract data by converting raw values to typed values
 * Handles type conversion, trimming, and cleanup
 * 
 * @param {Object} rowData - Parsed row data from parseRowWithMapping
 * @param {Array} warnings - Array to collect warnings during normalization
 * @returns {Object} Normalized data { fieldName: normalizedValue }
 */
export function normalizeContractData(rowData, warnings = []) {
    const normalized = {};
    
    Object.entries(rowData).forEach(([field, data]) => {
        const { raw, type } = data;
        let normalizedValue = null;
        
        try {
            switch (type) {
                case 'string':
                    normalizedValue = raw !== null && raw !== undefined
                        ? String(raw).trim() || null
                        : null;
                    break;
                    
                case 'date':
                    normalizedValue = parseExcelDate(raw);
                    if (!normalizedValue && raw !== null && raw !== undefined && raw !== '') {
                        warnings.push({
                            type: 'invalid_date',
                            field,
                            message: `Date value "${raw}" could not be parsed`
                        });
                    }
                    break;
                    
                case 'number':
                    if (raw === null || raw === undefined || raw === '') {
                        normalizedValue = null;
                    } else {
                        const num = Number(raw);
                        normalizedValue = isNaN(num) ? null : num;
                        if (normalizedValue === null && raw !== '' && raw !== null) {
                            warnings.push({
                                type: 'invalid_number',
                                field,
                                message: `Value "${raw}" is not a valid number`
                            });
                        }
                    }
                    break;
                    
                default:
                    // Default to string conversion
                    normalizedValue = raw !== null && raw !== undefined
                        ? String(raw).trim() || null
                        : null;
            }
        } catch (err) {
            warnings.push({
                type: 'conversion_error',
                field,
                message: `Could not convert "${raw}" to ${type}: ${err.message}`
            });
            normalizedValue = null;
        }
        
        normalized[field] = normalizedValue;
    });
    
    return normalized;
}

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Check if a contract has sufficient completeness
 * @param {Object} normalized - Normalized contract data
 * @returns {boolean} True if contract is considered complete
 */
function checkCompleteness(normalized) {
    // Contract is "complete" if at least 2 of 3 recommended fields are present
    const recommendedFields = ['location', 'equipmentId', 'plannedStart'];
    const present = recommendedFields.filter(f => 
        normalized[f] !== null && normalized[f] !== undefined
    );
    return present.length >= 2;
}

/**
 * Create a complete contract object with metadata
 * 
 * @param {Object} normalized - Normalized data from normalizeContractData
 * @param {number} rowIndex - Excel row number (1-indexed)
 * @param {string} sheetName - Name of the source sheet
 * @param {string} fileName - Name of the source file
 * @returns {Object} Complete contract object
 */
export function createContractObject(normalized, rowIndex, sheetName, fileName) {
    // Generate internal key for deduplication
    const internalKey = `${normalized.contractId || 'unknown'}_row_${rowIndex}`;
    
    const now = new Date().toISOString();
    
    return {
        // Unique identifiers
        id: generateUUID(),
        internalKey,
        
        // Core contract fields
        contractId: normalized.contractId || null,
        contractTitle: normalized.contractTitle || null,
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
        status: normalized.status ? normalized.status.toLowerCase() : null,
        workorderCode: normalized.workorderCode || null,
        reportedBy: normalized.reportedBy || null,
        plannedStart: normalized.plannedStart || null,
        reportedDate: normalized.reportedDate || null,
        
        // Metadata
        sourceFile: {
            fileName,
            sheet: sheetName,
            rowIndex,
            importedAt: now
        },
        
        // Audit
        createdAt: now,
        updatedAt: now,
        importVersion: 1,
        isComplete: checkCompleteness(normalized)
    };
}

/**
 * Process a single row and create a contract object
 * Combines parsing, validation, normalization, and creation
 * 
 * @param {Array} row - Row data array
 * @param {Object} mapping - Column mapping
 * @param {number} rowIndex - Excel row number
 * @param {string} sheetName - Sheet name
 * @param {string} fileName - File name
 * @returns {Object} Result { contract, errors, warnings }
 */
export function processContractRow(row, mapping, rowIndex, sheetName, fileName) {
    const errors = [];
    const warnings = [];
    
    try {
        // Parse row
        const rowData = parseRowWithMapping(row, mapping);
        
        // Validate
        const validation = validateContractRow(rowData, mapping);
        
        if (!validation.isValid) {
            return {
                contract: null,
                errors: [{
                    rowIndex,
                    type: 'validation_error',
                    missingFields: validation.missingFields,
                    message: `Missing required fields: ${validation.missingFields.join(', ')}`
                }],
                warnings: validation.warnings
            };
        }
        
        // Normalize
        const normalized = normalizeContractData(rowData, warnings);
        warnings.push(...validation.warnings);
        
        // Create contract object
        const contract = createContractObject(normalized, rowIndex, sheetName, fileName);
        
        return { contract, errors, warnings };
        
    } catch (err) {
        return {
            contract: null,
            errors: [{
                rowIndex,
                type: 'processing_error',
                message: err.message
            }],
            warnings
        };
    }
}
