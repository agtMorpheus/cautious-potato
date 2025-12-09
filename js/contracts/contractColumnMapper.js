/**
 * Contract Column Mapper Module (Phase 2)
 * 
 * Provides Excel discovery and column mapping functionality for contract imports.
 * Implements intelligent header matching and type inference.
 * 
 * Phase 2 implements:
 * - Enhanced sheet discovery with column type inference
 * - Intelligent column mapping with confidence scores
 * - Pattern-based header matching for German and English headers
 */

/**
 * Infer the data type of a column based on header text and sample values
 * @param {Array} samples - Array of sample values from the column
 * @param {string} header - Column header text
 * @returns {string} Inferred type: 'string', 'number', or 'date'
 */
export function inferColumnType(samples, header) {
    // Check header keywords first
    const headerLower = (header || '').toLowerCase();
    
    // Date indicators in header
    if (headerLower.includes('datum') || headerLower.includes('date') ||
        headerLower.includes('start') || headerLower.includes('ende') ||
        headerLower.includes('zeit') || headerLower.includes('time')) {
        return 'date';
    }
    
    // Number indicators in header
    if (headerLower.includes('betrag') || headerLower.includes('preis') ||
        headerLower.includes('summe') || headerLower.includes('menge') ||
        headerLower.includes('anzahl') || headerLower.includes('count') ||
        headerLower.includes('amount') || headerLower.includes('price')) {
        return 'number';
    }
    
    // Analyze sample values
    let hasDate = 0;
    let hasNumber = 0;
    let hasString = 0;
    
    samples.forEach(val => {
        if (val === null || val === undefined || val === '') {
            return;
        }
        
        if (isValidDate(val)) {
            hasDate++;
        } else if (typeof val === 'number' || (!isNaN(val) && String(val).trim() !== '')) {
            hasNumber++;
        } else {
            hasString++;
        }
    });
    
    // Majority vote
    if (hasDate > hasNumber && hasDate > hasString) {
        return 'date';
    }
    if (hasNumber > hasString) {
        return 'number';
    }
    return 'string';
}

/**
 * Check if a value is a valid date
 * @param {*} val - Value to check
 * @returns {boolean} True if value is a valid date
 */
function isValidDate(val) {
    // Check if Excel serial date (number from 1/1/1900)
    if (typeof val === 'number' && val > 0 && val < 100000) {
        return true;
    }
    
    // Check if ISO date string or common date formats
    if (typeof val === 'string') {
        // ISO format: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
            return true;
        }
        // DD/MM/YYYY or MM/DD/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(val)) {
            return true;
        }
        // DD.MM.YYYY (German format)
        if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(val)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Convert Excel column index to column letter
 * @param {number} index - Zero-based column index
 * @returns {string} Column letter(s)
 */
function encodeCol(index) {
    let letter = '';
    let temp = index + 1;
    
    while (temp > 0) {
        const remainder = (temp - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        temp = Math.floor((temp - 1) / 26);
    }
    
    return letter;
}

/**
 * Discover all sheets in a workbook and extract detailed metadata
 * Enhanced version with type inference and sample value extraction
 * 
 * @param {Object} workbook - SheetJS workbook object from XLSX.read()
 * @returns {Object} Object containing sheets array with metadata
 */
export function discoverContractSheets(workbook) {
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Workbook enthält keine Arbeitsblätter');
    }
    
    const sheets = [];
    
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
            return;
        }
        
        // Get the range of the worksheet
        const range = worksheet['!ref'];
        if (!range) {
            sheets.push({
                name: sheetName,
                sheetId: sheetIndex,
                rowCount: 0,
                dataStartRow: 2,
                columns: [],
                isEmpty: true
            });
            return;
        }
        
        // Parse range to get dimensions (e.g., "A1:AA2909")
        const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!rangeMatch) {
            sheets.push({
                name: sheetName,
                sheetId: sheetIndex,
                rowCount: 0,
                dataStartRow: 2,
                columns: [],
                isEmpty: true
            });
            return;
        }
        
        const startCol = rangeMatch[1];
        const startRow = parseInt(rangeMatch[2], 10);
        const endCol = rangeMatch[3];
        const endRow = parseInt(rangeMatch[4], 10);
        
        const rowCount = endRow - startRow + 1;
        
        // Calculate column indices
        const startColIndex = columnLetterToIndex(startCol);
        const endColIndex = columnLetterToIndex(endCol);
        
        // Extract column information
        const columns = [];
        
        for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex++) {
            const colLetter = encodeCol(colIndex);
            const headerAddress = `${colLetter}1`;
            const headerCell = worksheet[headerAddress];
            const headerValue = headerCell ? headerCell.v : null;
            
            // Collect sample values (rows 2-6, up to 5 samples)
            const sampleValues = [];
            for (let rowIdx = 2; rowIdx <= Math.min(6, endRow); rowIdx++) {
                const sampleAddress = `${colLetter}${rowIdx}`;
                const cell = worksheet[sampleAddress];
                if (cell && cell.v !== null && cell.v !== undefined) {
                    sampleValues.push(cell.v);
                }
            }
            
            // Infer type from samples and header
            const inferredType = inferColumnType(sampleValues, headerValue);
            
            columns.push({
                index: colIndex,
                letter: colLetter,
                header: headerValue ? String(headerValue).trim() : `Column ${colLetter}`,
                inferredType,
                visible: true,
                sampleValues: sampleValues.slice(0, 5) // Limit to 5 samples
            });
        }
        
        sheets.push({
            name: sheetName,
            sheetId: sheetIndex,
            rowCount: rowCount - 1, // Exclude header row
            dataStartRow: 2, // First row after header (1-indexed)
            columns,
            isEmpty: rowCount <= 1
        });
    });
    
    return { sheets };
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
 * Mapping rules for auto-detecting column mappings
 * Maps contract field names to patterns found in Excel headers
 */
const MAPPING_RULES = {
    contractId: { 
        patterns: ['auftrag', 'contract', 'auftrags.*nr', 'auftrags.*nummer', 'order.*id'], 
        required: true 
    },
    contractTitle: { 
        patterns: ['auftragskopftitel', 'kopftitel', 'titel', 'title', 'name', 'bezeichnung', 'beschreibung'], 
        required: true 
    },
    taskId: { 
        patterns: ['aufgabe', 'task', 'aufgaben.*nr', 'task.*id'], 
        required: false 
    },
    taskType: { 
        patterns: ['aufgabenart', 'task.*type', 'art', 'typ'], 
        required: false 
    },
    description: { 
        patterns: ['beschreibung', 'description', 'detail', 'kommentar', 'notes'], 
        required: false 
    },
    location: { 
        patterns: ['standort', 'location', 'site', 'ort', 'einsatzort'], 
        required: false 
    },
    roomArea: { 
        patterns: ['säule', 'raum', 'room', 'area', 'sector', 'zone', 'bereich'], 
        required: false 
    },
    equipmentId: { 
        patterns: ['anlagennummer', 'anlage.*nr', 'equipment', 'anlage', 'geräte.*nr'], 
        required: false 
    },
    equipmentDescription: { 
        patterns: ['anlagenbeschreibung', 'equipment.*desc', 'anlagen.*bezeichnung'], 
        required: false 
    },
    serialNumber: { 
        patterns: ['seriennummer', 'serial', 'sn', 'serien.*nr'], 
        required: false 
    },
    status: { 
        patterns: ['status', 'state', 'zustand'], 
        required: true 
    },
    workorderCode: { 
        patterns: ['workorder', 'kst', 'kostenstelle', 'work.*order', 'wo'], 
        required: false 
    },
    plannedStart: { 
        patterns: ['sollstart', 'planned.*start', 'start.*datum', 'geplant'], 
        required: false 
    },
    reportedBy: { 
        patterns: ['melder', 'reporter', 'reported.*by', 'ersteller', 'creator'], 
        required: false 
    },
    reportedDate: { 
        patterns: ['meldedatum', 'reported.*date', 'melde.*datum', 'erstellt.*am'], 
        required: false 
    }
};

/**
 * Suggest column mapping based on discovered sheet columns
 * Auto-detects mappings using header pattern matching
 * 
 * @param {Object} discoveredSheets - Result from discoverContractSheets()
 * @returns {Object} Mapping result with confidence scores and suggestions
 */
export function suggestContractColumnMapping(discoveredSheets) {
    if (!discoveredSheets || !discoveredSheets.sheets || discoveredSheets.sheets.length === 0) {
        return { error: 'No sheets discovered' };
    }
    
    // Use first sheet by default
    const sheet = discoveredSheets.sheets[0];
    
    const mapping = {};
    const unmappedColumns = [];
    const suggestions = [];
    
    // Track which columns have been assigned
    const assignedColumns = new Set();
    
    // For each column, find matching fields
    const columnMatches = sheet.columns.map(col => {
        const headerLower = (col.header || '').toLowerCase().replace(/[\s\-_]/g, '');
        const matches = [];
        
        Object.entries(MAPPING_RULES).forEach(([field, rule]) => {
            const matched = rule.patterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(headerLower);
            });
            
            if (matched) {
                // Exact match scores higher
                const isExactMatch = rule.patterns.some(p => {
                    const cleanPattern = p.replace(/[.*+?^${}()|[\]\\]/g, '');
                    return headerLower.includes(cleanPattern);
                });
                const confidence = isExactMatch ? 1.0 : 0.8;
                matches.push({ field, confidence });
            }
        });
        
        return {
            column: col,
            matches: matches.sort((a, b) => b.confidence - a.confidence)
        };
    });
    
    // Assign each field to best available column (greedy matching)
    Object.keys(MAPPING_RULES).forEach(field => {
        const candidates = columnMatches.filter(cm =>
            cm.matches.some(m => m.field === field) && !assignedColumns.has(cm.column.letter)
        );
        
        if (candidates.length > 0) {
            // Pick best match
            const best = candidates.reduce((a, b) => {
                const aMatch = a.matches.find(m => m.field === field);
                const bMatch = b.matches.find(m => m.field === field);
                const aScore = aMatch ? aMatch.confidence : 0;
                const bScore = bMatch ? bMatch.confidence : 0;
                return aScore > bScore ? a : b;
            });
            
            const matchInfo = best.matches.find(m => m.field === field);
            const confidence = matchInfo ? matchInfo.confidence : 0.5;
            
            mapping[field] = {
                excelColumn: best.column.letter,
                confidence,
                headerText: best.column.header,
                type: best.column.inferredType || 'string'
            };
            assignedColumns.add(best.column.letter);
        }
    });
    
    // Identify unmapped columns
    sheet.columns.forEach(col => {
        if (!assignedColumns.has(col.letter)) {
            unmappedColumns.push(col.letter);
        }
    });
    
    // Calculate average confidence
    const confidenceScores = Object.values(mapping).map(m => m.confidence);
    const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;
    
    const confidenceLevel = avgConfidence > 0.8 ? 'high' : avgConfidence > 0.5 ? 'medium' : 'low';
    
    // Generate suggestions
    if (avgConfidence < 0.9) {
        suggestions.push(`Confidence level is ${confidenceLevel} (${(avgConfidence * 100).toFixed(0)}%). ` +
            `Please verify mappings in the UI before importing.`);
    }
    
    if (unmappedColumns.length > 3) {
        suggestions.push(`${unmappedColumns.length} columns are unmapped. ` +
            `These will be ignored during import.`);
    }
    
    // Check for required field coverage
    const requiredFields = Object.entries(MAPPING_RULES)
        .filter(([_, rule]) => rule.required)
        .map(([field]) => field);
    
    const missingRequired = requiredFields.filter(field => !mapping[field]);
    if (missingRequired.length > 0) {
        suggestions.push(`⚠ Required fields missing: ${missingRequired.join(', ')}. ` +
            `Import may fail.`);
    }
    
    return {
        sheetName: sheet.name,
        mapping,
        unmappedColumns,
        confidence: confidenceLevel,
        averageConfidence: avgConfidence,
        suggestions,
        missingRequired
    };
}
