/**
 * ExcelJS-based Utility Functions
 * 
 * Alternative implementation using ExcelJS library which provides
 * FULL support for preserving Excel formatting including:
 * - Cell colors and backgrounds
 * - Fonts (bold, italic, size, color)
 * - Borders and merged cells
 * - Images and charts
 * - Column widths and row heights
 * - All other Excel features
 * 
 * To use this implementation:
 * 1. Install ExcelJS: npm install exceljs
 * 2. Add to index.html: <script src="https://cdn.jsdelivr.net/npm/exceljs@4/dist/exceljs.min.js"></script>
 * 3. Replace imports in handlers.js to use this file instead of utils.js
 */

import { ABRECHNUNG_CONFIG } from './config.js';

/**
 * Load abrechnung template using ExcelJS (preserves ALL formatting)
 * @returns {Promise<ExcelJS.Workbook>} ExcelJS workbook object
 */
export async function loadAbrechnungTemplateExcelJS() {
    try {
        const response = await fetch('templates/abrechnung.xlsx');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // ExcelJS preserves ALL formatting when loading
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        console.log('Template loaded with ExcelJS - all formatting preserved');
        return workbook;
    } catch (error) {
        throw new Error(`Fehler beim Laden des Templates: ${error.message}`);
    }
}

/**
 * Fill abrechnung header with metadata using ExcelJS
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} metadata - Metadata to fill
 */
export function fillAbrechnungHeaderExcelJS(workbook, metadata) {
    const sheetName = ABRECHNUNG_CONFIG.sheetName;
    const worksheet = workbook.getWorksheet(sheetName);
    
    if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden im Template`);
    }
    
    const { header } = ABRECHNUNG_CONFIG;
    
    // Fill header cells - ExcelJS preserves all existing formatting
    worksheet.getCell(header.datum).value = metadata.datum;
    worksheet.getCell(header.auftragsNr).value = metadata.auftragsNr;
    worksheet.getCell(header.anlage).value = metadata.anlage;
    worksheet.getCell(header.einsatzort).value = metadata.einsatzort;
    
    console.log('Header filled - formatting preserved');
}

/**
 * Fill abrechnung positions with summed quantities using ExcelJS
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} positionSums - Object with summed quantities
 */
export function fillAbrechnungPositionsExcelJS(workbook, positionSums) {
    const sheetName = ABRECHNUNG_CONFIG.sheetName;
    const worksheet = workbook.getWorksheet(sheetName);
    
    if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" nicht gefunden im Template`);
    }
    
    const { positions } = ABRECHNUNG_CONFIG;
    let filledCount = 0;
    
    // Scan template for position numbers and fill quantities
    for (let row = positions.startRow; row <= positions.endRow; row++) {
        const posNrCell = worksheet.getCell(`${positions.positionNumberColumn}${row}`);
        const posNr = posNrCell.value;
        
        if (posNr && Object.prototype.hasOwnProperty.call(positionSums, posNr)) {
            const quantityCell = worksheet.getCell(`${positions.quantityColumn}${row}`);
            // Set value - all formatting (colors, borders, fonts) is preserved
            quantityCell.value = positionSums[posNr];
            filledCount++;
        }
    }
    
    console.log(`Filled ${filledCount} positions - all formatting preserved`);
}

/**
 * Export workbook using ExcelJS (preserves ALL formatting)
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook object
 * @param {Object} metadata - Metadata for filename generation
 */
export async function exportToExcelExcelJS(workbook, metadata) {
    try {
        // Generate filename
        let filename;
        if (metadata && metadata.orderNumber) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            filename = `Abrechnung_${metadata.orderNumber}_${timestamp}.xlsx`;
        } else {
            filename = 'Abrechnung.xlsx';
        }
        
        // Write workbook to buffer - ALL formatting is preserved
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
        
        console.log('Export complete with full formatting preservation');
        
        return {
            fileName: filename,
            fileSize: buffer.byteLength
        };
    } catch (error) {
        throw new Error(`Fehler beim Exportieren: ${error.message}`);
    }
}

/**
 * Complete export workflow using ExcelJS
 * @param {Object} abrechnungData - Combined data object { header, positionen }
 * @returns {Promise<Object>} Export metadata
 */
export async function createAndExportAbrechnungExcelJS(abrechnungData) {
    const { header, positionen } = abrechnungData;
    
    // Load template with full formatting
    const workbook = await loadAbrechnungTemplateExcelJS();
    
    // Fill header
    const legacyMetadata = {
        datum: header.date,
        auftragsNr: header.orderNumber,
        anlage: header.plant,
        einsatzort: header.location
    };
    fillAbrechnungHeaderExcelJS(workbook, legacyMetadata);
    
    // Fill positions
    fillAbrechnungPositionsExcelJS(workbook, positionen);
    
    // Export with full formatting
    return await exportToExcelExcelJS(workbook, { orderNumber: header.orderNumber });
}
