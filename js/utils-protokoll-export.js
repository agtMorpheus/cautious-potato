/**
 * Protokoll Export Utility Functions
 * 
 * Implements Excel protokoll export functionality conforming to the
 * specifications in docs/vorlage/protokoll-mapping.md and 
 * docs/vorlage/protokoll-meseurements.md
 * 
 * Features:
 * - Complete protokoll template population
 * - Metadata mapping to specific cells
 * - Measurement data export across multiple pages
 * - Checkbox and form field handling
 * - Full formatting preservation using ExcelJS
 */

import { PROTOKOLL_CONFIG } from './config.js';

// Use configuration from config.js
const { sections: PROTOKOLL_MAPPING, measurements: MEASUREMENT_CONFIG } = PROTOKOLL_CONFIG;
const MEASUREMENT_PAGES = MEASUREMENT_CONFIG.pages;
const MEASUREMENT_COLUMNS = MEASUREMENT_CONFIG.columns;

/**
 * Load protokoll template using ExcelJS
 * @returns {Promise<ExcelJS.Workbook>} ExcelJS workbook object
 */
export async function loadProtokollTemplate() {
    try {
        const response = await fetch(PROTOKOLL_CONFIG.templatePath);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        console.log('Protokoll template loaded with ExcelJS');
        return workbook;
    } catch (error) {
        throw new Error(`Fehler beim Laden des Protokoll-Templates: ${error.message}`);
    }
}

/**
 * Fill protokoll grunddaten (basic data) section
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} grunddaten - Basic data object
 */
export function fillProtokollGrunddaten(workbook, grunddaten) {
    const worksheet = workbook.getWorksheet(PROTOKOLL_CONFIG.sheetName) || workbook.getWorksheet(1);
    
    if (!worksheet) {
        throw new Error('Protokoll worksheet nicht gefunden');
    }
    
    const mapping = PROTOKOLL_MAPPING.grunddaten;
    
    // Fill all grunddaten fields
    Object.entries(grunddaten).forEach(([field, value]) => {
        if (mapping[field] && value !== undefined && value !== null) {
            const cell = worksheet.getCell(mapping[field]);
            cell.value = value;
        }
    });
    
    console.log('Protokoll grunddaten filled');
}

/**
 * Set checkbox values in protokoll
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} checkboxData - Checkbox configuration object
 * @param {string} section - Section name (e.g., 'pruefenNach', 'pruefungsart')
 */
export function setProtokollCheckboxes(workbook, checkboxData, section) {
    const worksheet = workbook.getWorksheet(PROTOKOLL_CONFIG.sheetName) || workbook.getWorksheet(1);
    const mapping = PROTOKOLL_MAPPING[section];
    
    if (!mapping) {
        throw new Error(`Unknown protokoll section: ${section}`);
    }
    
    Object.entries(checkboxData).forEach(([field, checked]) => {
        if (mapping[field]) {
            const cellAddress = mapping[field];
            const cell = worksheet.getCell(cellAddress);
            
            // Set checkbox symbols: ☑ for checked, ○ for unchecked
            cell.value = checked ? '☑' : '○';
        }
    });
    
    console.log(`Protokoll checkboxes set for section: ${section}`);
}

/**
 * Set inspection/testing results with i.O./n.i.O. options
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} results - Results object with field: 'io'|'nio'|null values
 * @param {string} section - Section name ('besichtigung' or 'erproben')
 */
export function setProtokollResults(workbook, results, section) {
    const worksheet = workbook.getWorksheet(PROTOKOLL_CONFIG.sheetName) || workbook.getWorksheet(1);
    const mapping = PROTOKOLL_MAPPING[section];
    
    if (!mapping) {
        throw new Error(`Unknown protokoll section: ${section}`);
    }
    
    Object.entries(results).forEach(([field, result]) => {
        if (mapping[field] && result) {
            const cellMapping = mapping[field];
            
            // Clear both cells first
            worksheet.getCell(cellMapping.io).value = '○';
            worksheet.getCell(cellMapping.nio).value = '○';
            
            // Set the appropriate checkbox
            if (result === 'io') {
                worksheet.getCell(cellMapping.io).value = '☑';
            } else if (result === 'nio') {
                worksheet.getCell(cellMapping.nio).value = '☑';
            }
        }
    });
    
    console.log(`Protokoll results set for section: ${section}`);
}

/**
 * Fill measurement data across multiple pages
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Array} measurements - Array of measurement objects
 */
export function fillProtokollMeasurements(workbook, measurements) {
    const worksheet = workbook.getWorksheet(PROTOKOLL_CONFIG.sheetName) || workbook.getWorksheet(1);
    
    if (!measurements || !Array.isArray(measurements)) {
        console.warn('No measurement data provided');
        return;
    }
    
    let measurementIndex = 0;
    
    // Iterate through each page
    for (const page of MEASUREMENT_PAGES) {
        const { startRow, endRow } = page;
        
        // Fill rows for this page
        for (let row = startRow; row <= endRow && measurementIndex < measurements.length; row++) {
            const measurement = measurements[measurementIndex];
            
            // Fill all measurement columns for this row
            Object.entries(MEASUREMENT_COLUMNS).forEach(([field, column]) => {
                if (measurement[field] !== undefined && measurement[field] !== null) {
                    const cellAddress = `${column}${row}`;
                    const cell = worksheet.getCell(cellAddress);
                    cell.value = measurement[field];
                }
            });
            
            measurementIndex++;
        }
        
        // Break if we've used all measurements
        if (measurementIndex >= measurements.length) {
            break;
        }
    }
    
    console.log(`Filled ${measurementIndex} measurements across ${MEASUREMENT_PAGES.length} pages`);
}

/**
 * Fill messgeräte (measuring equipment) information
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} messgeraete - Measuring equipment data
 */
export function fillProtokollMessgeraete(workbook, messgeraete) {
    const worksheet = workbook.getWorksheet(PROTOKOLL_CONFIG.sheetName) || workbook.getWorksheet(1);
    const mapping = PROTOKOLL_MAPPING.messgeraete;
    
    Object.entries(messgeraete).forEach(([field, value]) => {
        if (mapping[field] && value !== undefined && value !== null) {
            const cell = worksheet.getCell(mapping[field]);
            cell.value = value;
        }
    });
    
    console.log('Protokoll messgeräte information filled');
}

/**
 * Create a complete protokoll workbook ready for export
 * @param {Object} protokollData - Complete protokoll data object
 * @returns {Promise<Object>} Final workbook ready to write
 */
export async function createProtokollWorkbook(protokollData) {
    if (!protokollData || typeof protokollData !== 'object') {
        throw new Error('Ungültige protokollData');
    }
    
    try {
        // Load template
        const workbook = await loadProtokollTemplate();
        
        // Fill grunddaten
        if (protokollData.grunddaten) {
            fillProtokollGrunddaten(workbook, protokollData.grunddaten);
        }
        
        // Set checkboxes for various sections
        if (protokollData.pruefenNach) {
            setProtokollCheckboxes(workbook, protokollData.pruefenNach, 'pruefenNach');
        }
        
        if (protokollData.pruefungsart) {
            setProtokollCheckboxes(workbook, protokollData.pruefungsart, 'pruefungsart');
        }
        
        if (protokollData.netzform) {
            setProtokollCheckboxes(workbook, protokollData.netzform, 'netzinfo');
        }
        
        // Set inspection results
        if (protokollData.besichtigung) {
            setProtokollResults(workbook, protokollData.besichtigung, 'besichtigung');
        }
        
        // Set testing results
        if (protokollData.erproben) {
            setProtokollResults(workbook, protokollData.erproben, 'erproben');
        }
        
        // Fill measurements
        if (protokollData.measurements) {
            fillProtokollMeasurements(workbook, protokollData.measurements);
        }
        
        // Fill messgeräte
        if (protokollData.messgeraete) {
            fillProtokollMessgeraete(workbook, protokollData.messgeraete);
        }
        
        // Set simple checkbox fields
        const simpleCheckboxSections = ['messen', 'pruefungsergebnis', 'pruefplakette'];
        simpleCheckboxSections.forEach(section => {
            if (protokollData[section]) {
                setProtokollCheckboxes(workbook, protokollData[section], section);
            }
        });
        
        // Fill additional information
        if (protokollData.weitereInfo) {
            const worksheet = workbook.getWorksheet(PROTOKOLL_CONFIG.sheetName) || workbook.getWorksheet(1);
            const mapping = PROTOKOLL_MAPPING.weitereInfo;
            
            Object.entries(protokollData.weitereInfo).forEach(([field, value]) => {
                if (mapping[field] && value !== undefined && value !== null) {
                    const cell = worksheet.getCell(mapping[field]);
                    cell.value = value;
                }
            });
        }
        
        console.log('Protokoll workbook created successfully');
        return workbook;
    } catch (error) {
        throw new Error(`Fehler beim Erstellen des Protokoll-Workbooks: ${error.message}`);
    }
}

/**
 * Export protokoll workbook as Excel file
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {string} filename - Optional filename
 * @returns {Promise<Object>} Export metadata
 */
export async function exportProtokollToExcel(workbook, filename) {
    try {
        // Generate filename if not provided
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            filename = `Protokoll_${timestamp}.xlsx`;
        }
        
        // Write workbook to buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Create blob and download
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        
        console.log('Protokoll export complete:', filename);
        
        return {
            fileName: filename,
            fileSize: buffer.byteLength
        };
    } catch (error) {
        throw new Error(`Fehler beim Exportieren des Protokolls: ${error.message}`);
    }
}

/**
 * Complete protokoll export workflow
 * @param {Object} protokollData - Complete protokoll data object
 * @param {string} filename - Optional filename
 * @returns {Promise<Object>} Export metadata
 */
export async function createAndExportProtokoll(protokollData, filename) {
    try {
        // Create workbook
        const workbook = await createProtokollWorkbook(protokollData);
        
        // Export
        return await exportProtokollToExcel(workbook, filename);
    } catch (error) {
        throw new Error(`Protokoll export failed: ${error.message}`);
    }
}

/**
 * Generate filename for protokoll export
 * @param {Object} grunddaten - Basic data containing protokoll info
 * @returns {string} Generated filename
 */
export function generateProtokollFilename(grunddaten) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    if (grunddaten && grunddaten.protokollNr) {
        return `Protokoll_${grunddaten.protokollNr}_${timestamp}.xlsx`;
    } else if (grunddaten && grunddaten.auftragsNr) {
        return `Protokoll_${grunddaten.auftragsNr}_${timestamp}.xlsx`;
    } else {
        return `Protokoll_${timestamp}.xlsx`;
    }
}

/**
 * Validate protokoll data structure
 * @param {Object} protokollData - Protokoll data to validate
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
 */
export function validateProtokollData(protokollData) {
    const errors = [];
    const warnings = [];
    
    if (!protokollData || typeof protokollData !== 'object') {
        return {
            valid: false,
            errors: ['Protokoll data must be an object'],
            warnings: []
        };
    }
    
    // Check required sections
    const requiredSections = ['grunddaten'];
    requiredSections.forEach(section => {
        if (!protokollData[section]) {
            errors.push(`Missing required section: ${section}`);
        }
    });
    
    // Validate grunddaten
    if (protokollData.grunddaten) {
        const requiredFields = ['protokollNr', 'auftragsNr', 'anlage'];
        requiredFields.forEach(field => {
            if (!protokollData.grunddaten[field]) {
                warnings.push(`Missing recommended field in grunddaten: ${field}`);
            }
        });
    }
    
    // Validate measurements if present
    if (protokollData.measurements) {
        if (!Array.isArray(protokollData.measurements)) {
            errors.push('Measurements must be an array');
        } else if (protokollData.measurements.length > 132) { // 6 pages * 22 rows max
            warnings.push(`Too many measurements (${protokollData.measurements.length}), some may be truncated`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}