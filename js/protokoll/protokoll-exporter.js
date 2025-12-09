/**
 * protokoll-exporter.js
 * 
 * Handles Excel file generation and export for Protokoll module.
 * Reads templates, fills data, and generates downloadable files.
 * Requires SheetJS library (XLSX) to be loaded globally.
 */

import * as state from './protokoll-state.js';
import * as validator from './protokoll-validator.js';

// ============================================
// CONFIGURATION
// ============================================

const TEMPLATE_PATHS = {
  protokoll: '/templates/protokoll.xlsx',
  abrechnung: '/templates/abrechnung.xlsx'
};

const CELL_MAPPING = {
  protokoll: {
    'metadata.protokollNumber': 'U3',
    'metadata.datum': 'AF3',
    'metadata.auftraggeber': 'C4',
    'metadata.auftragnummer': 'K4',
    'metadata.kundennummer': 'N4',
    'metadata.auftragnehmer': 'S4',
    'metadata.facility.name': 'C6',
    'metadata.facility.anlage': 'C9',
    'metadata.facility.inventory': 'U9',
    'metadata.facility.netzspannung': 'C11',
    'metadata.facility.netzform': 'K11',
    'metadata.prüfer.name': 'N16',
    'prüfungsergebnis.mängelFestgestellt': 'C20',
    'prüfungsergebnis.nächsterPrüfungstermin': 'AF20'
  },
  abrechnung: {
    'metadata.protokollNumber': 'D2',
    'metadata.auftraggeber': 'D3',
    'metadata.auftragnummer': 'D4',
    'metadata.facility.name': 'D5'
  }
};

// ============================================
// MAIN EXPORT FUNCTIONS
// ============================================

/**
 * Export protokoll.xlsx file
 * @returns {Promise<void>}
 */
export async function exportProtokoll() {
  console.log('Exporting Protokoll...');
  
  try {
    // Validate form
    const validation = validator.validateForm();
    if (!validation.isValid) {
      throw new Error(validation.summary);
    }

    // Get form data
    const formData = state.getState();

    // Load template
    const workbook = await loadTemplate('protokoll');
    if (!workbook) {
      throw new Error('Failed to load protokoll template');
    }

    // Fill template
    fillProtokollTemplate(workbook, formData);

    // Generate and download
    const filename = generateFilename('protokoll', formData);
    await generateAndDownload(workbook, filename);

    console.log('✓ Protokoll exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Export abrechnung.xlsx file
 * @returns {Promise<void>}
 */
export async function exportAbrechnung() {
  console.log('Exporting Abrechnung...');
  
  try {
    // Validate form
    const validation = validator.validateForm();
    if (!validation.isValid) {
      throw new Error(validation.summary);
    }

    // Get form data
    const formData = state.getState();

    // Load template
    const workbook = await loadTemplate('abrechnung');
    if (!workbook) {
      throw new Error('Failed to load abrechnung template');
    }

    // Fill template
    fillAbrechnungTemplate(workbook, formData);

    // Generate and download
    const filename = generateFilename('abrechnung', formData);
    await generateAndDownload(workbook, filename);

    console.log('✓ Abrechnung exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Export both protokoll and abrechnung files
 * @returns {Promise<void>}
 */
export async function exportBoth() {
  console.log('Exporting Both files...');
  
  try {
    // Export protokoll
    await exportProtokoll();

    // Small delay between exports
    await delay(1000);

    // Export abrechnung
    await exportAbrechnung();

    console.log('✓ Both files exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// ============================================
// TEMPLATE HANDLING
// ============================================

/**
 * Load Excel template from file
 * @param {string} type - Type: 'protokoll' or 'abrechnung'
 * @returns {Promise<object|null>} Workbook object or null
 */
async function loadTemplate(type) {
  const path = TEMPLATE_PATHS[type];
  
  if (!path) {
    console.error(`Unknown template type: ${type}`);
    return null;
  }

  try {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS library not loaded');
    }

    // Fetch template file
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status}`);
    }

    // Read as ArrayBuffer
    const buffer = await response.arrayBuffer();

    // Parse with SheetJS
    const workbook = XLSX.read(buffer, { type: 'array' });

    console.log(`✓ Template loaded: ${type}`);
    return workbook;
  } catch (error) {
    console.error(`Failed to load template ${type}:`, error);
    return null;
  }
}

/**
 * Fill protokoll template with form data
 * @param {object} workbook - Workbook object
 * @param {object} formData - Form data object
 * @returns {void}
 */
function fillProtokollTemplate(workbook, formData) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!sheet) {
    console.warn('No sheet found in workbook');
    return;
  }

  // Fill metadata fields
  setCellValue(sheet, 'U3', formData.metadata.protokollNumber);
  setCellValue(sheet, 'C4', formData.metadata.auftraggeber);
  setCellValue(sheet, 'K4', formData.metadata.auftragnummer);
  setCellValue(sheet, 'N4', formData.metadata.kundennummer);
  setCellValue(sheet, 'S4', formData.metadata.auftragnehmer);
  setCellValue(sheet, 'C6', formData.metadata.facility.name);
  setCellValue(sheet, 'C9', formData.metadata.facility.anlage);
  setCellValue(sheet, 'U9', formData.metadata.facility.inventory);
  setCellValue(sheet, 'N16', formData.metadata.prüfer.name);

  // Fill positions (starting at row 30)
  let rowOffset = 30;
  for (let i = 0; i < formData.positions.length && i < 100; i++) {
    const position = formData.positions[i];
    const row = rowOffset + i;

    // Format: Position[row].Column = Value
    setCellValue(sheet, `C${row}`, position.stromkreisNr);
    setCellValue(sheet, `D${row}`, position.zielbezeichnung);
    setCellValue(sheet, `E${row}`, position.leitung?.typ || '');
    setCellValue(sheet, `F${row}`, position.leitung?.anzahl || '');
    setCellValue(sheet, `G${row}`, position.leitung?.querschnitt || '');
    setCellValue(sheet, `H${row}`, position.spannung?.un || '');
    setCellValue(sheet, `I${row}`, position.spannung?.fn || '');
    setCellValue(sheet, `M${row}`, position.messwerte?.riso || '');
  }

  // Fill results
  setCellValue(sheet, 'C20', formData.prüfungsergebnis.mängelFestgestellt ? 'Ja' : 'Nein');
  setCellValue(sheet, 'AF20', formData.prüfungsergebnis.nächsterPrüfungstermin);

  console.log('✓ Protokoll template filled');
}

/**
 * Fill abrechnung template with form data
 * @param {object} workbook - Workbook object
 * @param {object} formData - Form data object
 * @returns {void}
 */
function fillAbrechnungTemplate(workbook, formData) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!sheet) {
    console.warn('No sheet found in workbook');
    return;
  }

  // Fill header information
  setCellValue(sheet, 'D2', formData.metadata.protokollNumber);
  setCellValue(sheet, 'D3', formData.metadata.auftraggeber);
  setCellValue(sheet, 'D4', formData.metadata.auftragnummer);
  setCellValue(sheet, 'D5', formData.metadata.facility.name);

  // Fill position aggregation
  // For abrechnung, we typically aggregate positions by type
  const aggregated = aggregatePositions(formData.positions);
  
  let rowOffset = 10;
  for (let i = 0; i < aggregated.length; i++) {
    const agg = aggregated[i];
    const row = rowOffset + i;

    setCellValue(sheet, `B${row}`, agg.positionType);
    setCellValue(sheet, `D${row}`, agg.quantity);
    setCellValue(sheet, `E${row}`, agg.unitPrice || '');
    setCellValue(sheet, `F${row}`, (agg.quantity * (agg.unitPrice || 0)).toFixed(2));
  }

  console.log('✓ Abrechnung template filled');
}

/**
 * Aggregate positions for billing
 * @param {Array} positions - Positions array
 * @returns {Array} Aggregated positions
 */
function aggregatePositions(positions) {
  const agg = {};

  for (const position of positions) {
    const key = position.zielbezeichnung;
    
    if (!agg[key]) {
      agg[key] = {
        positionType: key,
        quantity: 0
      };
    }

    // Count as 1 per position
    agg[key].quantity += 1;
  }

  return Object.values(agg);
}

/**
 * Set cell value in worksheet
 * @param {object} sheet - Worksheet object
 * @param {string} cellRef - Cell reference (e.g., 'A1', 'U3')
 * @param {any} value - Value to set
 * @returns {void}
 */
function setCellValue(sheet, cellRef, value) {
  if (!sheet[cellRef]) {
    sheet[cellRef] = {};
  }

  sheet[cellRef].v = value;

  // Infer type
  if (typeof value === 'number') {
    sheet[cellRef].t = 'n';
  } else if (typeof value === 'boolean') {
    sheet[cellRef].t = 'b';
  } else if (value instanceof Date) {
    sheet[cellRef].t = 'd';
    sheet[cellRef].v = value.toISOString().split('T')[0];
  } else {
    sheet[cellRef].t = 's'; // String
  }
}

/**
 * Generate filename with timestamp
 * @param {string} type - Type: 'protokoll' or 'abrechnung'
 * @param {object} formData - Form data
 * @returns {string} Filename
 */
function generateFilename(type, formData) {
  const timestamp = new Date().toISOString().split('T')[0];
  const protokollNum = formData.metadata.protokollNumber || 'protokoll';
  
  const prefix = type === 'protokoll' ? 'Protokoll' : 'Abrechnung';
  
  return `${prefix}_${protokollNum}_${timestamp}.xlsx`;
}

/**
 * Generate file and trigger browser download
 * @param {object} workbook - Workbook object
 * @param {string} filename - Filename for download
 * @returns {Promise<void>}
 */
async function generateAndDownload(workbook, filename) {
  try {
    // Generate Excel file
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Create blob
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

    console.log(`✓ File downloaded: ${filename}`);
  } catch (error) {
    console.error('Failed to generate file:', error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Delay execution
 * @param {number} ms - Milliseconds
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export functions for testing
export {
  loadTemplate,
  fillProtokollTemplate,
  fillAbrechnungTemplate,
  aggregatePositions,
  setCellValue,
  generateFilename,
  generateAndDownload,
  TEMPLATE_PATHS,
  CELL_MAPPING
};

console.log('✓ Protokoll Exporter module loaded');
