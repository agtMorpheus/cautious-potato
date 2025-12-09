# Phase 3: Excel Utilities & Data Processing

## Overview

Phase 3 focuses on implementing the **core utility functions** that handle all Excel file operations and data transformations for the Abrechnung Application. This phase typically covers **Weeks 3–4** and builds directly on the state management foundation established in Phase 2.

The key goals of Phase 3 are:

- Implement **Excel file reading** using SheetJS to parse `protokoll.xlsx`
- Extract **metadata** and **position data** from the protokoll worksheet
- Develop **aggregation logic** to sum quantities by position number
- Create **Excel writing utilities** to populate the `abrechnung.xlsx` template
- Ensure **robust error handling** and edge-case management
- Validate and test all utilities thoroughly before Phase 4 integration

By the end of Phase 3, the application will have production-ready Excel I/O capabilities that can be seamlessly integrated with event handlers in Phase 4.

---

## 3.1 Excel Reading Utilities

### Objective

Implement functions in `js/utils.js` (or `js/excel.js`) that safely read, parse, and validate Excel files without depending on any state module or DOM manipulation.

### 3.1.1 `readExcelFile(file: File)`

#### Purpose
Read a raw Excel file and return the workbook object from SheetJS.

#### Implementation

```javascript
// js/utils.js

import { XLSX } from '../xlsx.full.min.js'; // Adjust path to your SheetJS library

/**
 * Read an Excel file and return a SheetJS workbook object.
 * 
 * @param {File} file - The Excel file from file input
 * @returns {Promise<Object>} Workbook object with sheets and metadata
 * @throws {Error} If file is not valid Excel or cannot be read
 */
export async function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    // Validate file exists and has correct type
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const fileName = file.name;
    const fileType = file.type;

    // Accept .xlsx files (MIME type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
    // Also accept application/octet-stream as a fallback for some browsers
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];

    if (!validMimeTypes.includes(fileType) && !fileName.endsWith('.xlsx')) {
      reject(new Error(`Invalid file type: ${fileType}. Only .xlsx files are supported.`));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Workbook has no sheets');
        }

        resolve({
          workbook,
          metadata: {
            fileName,
            fileSize: file.size,
            readAt: new Date().toISOString()
          }
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from disk'));
    };

    reader.readAsArrayBuffer(file);
  });
}
```

#### Verification Checklist
- [ ] Accepts only `.xlsx` files
- [ ] Rejects unsupported file types with clear error message
- [ ] Handles file read errors gracefully
- [ ] Returns workbook object with SheetNames array
- [ ] Includes file metadata (name, size, read timestamp)
- [ ] Handles network/disk errors from FileReader

---

### 3.1.2 `parseProtokoll(workbook)`

#### Purpose
Extract metadata from the protokoll worksheet (named `Vorlage` or similar) and return a structured metadata object.

#### Expected Cell Locations

Based on the specification:
- **Protocol-Nr.** → Cell U3
- **Auftrag-Nr.** → Cell N5
- **Anlage** → Cell A10
- **Einsatzort** → Cell T10
- **Firma** → Cell T7
- **Datum** → Cell A1 or another standard location

#### Implementation

```javascript
/**
 * Parse metadata from the protokoll worksheet.
 * 
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Object} Metadata object with protocol number, order number, etc.
 * @throws {Error} If worksheet is missing or required fields are empty
 */
export function parseProtokoll(workbook) {
  if (!workbook || !workbook.SheetNames) {
    throw new Error('Invalid workbook object');
  }

  // Find the 'Vorlage' worksheet
  const sheetName = 'Vorlage';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Worksheet "${sheetName}" not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`);
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Unable to access worksheet "${sheetName}"`);
  }

  // Extract metadata from specified cells
  const metadata = {
    protocolNumber: readCell(worksheet, 'U3'),
    orderNumber: readCell(worksheet, 'N5'),
    plant: readCell(worksheet, 'A10'),
    location: readCell(worksheet, 'T10'),
    company: readCell(worksheet, 'T7'),
    date: readCell(worksheet, 'A1') || new Date().toISOString().split('T')[0]
  };

  // Validate required fields
  const errors = [];

  if (!metadata.protocolNumber) {
    errors.push('Protocol number (U3) is missing');
  }

  if (!metadata.orderNumber) {
    errors.push('Order number (N5) is missing');
  }

  if (!metadata.plant) {
    errors.push('Plant/Anlage (A10) is missing');
  }

  if (!metadata.location) {
    errors.push('Location/Einsatzort (T10) is missing');
  }

  if (!metadata.company) {
    errors.push('Company/Firma (T7) is missing');
  }

  if (errors.length > 0) {
    const error = new Error('Missing required metadata fields');
    error.details = errors;
    throw error;
  }

  // Normalize date format (ensure ISO string)
  if (metadata.date && typeof metadata.date === 'string') {
    try {
      metadata.date = new Date(metadata.date).toISOString().split('T')[0];
    } catch (e) {
      console.warn(`Invalid date format: ${metadata.date}. Using current date.`);
      metadata.date = new Date().toISOString().split('T')[0];
    }
  }

  return metadata;
}

/**
 * Helper function to read a cell value from a worksheet.
 * 
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} cellAddress - Cell address (e.g., "A1", "U3")
 * @returns {string | number | null} Cell value or null if empty
 */
function readCell(worksheet, cellAddress) {
  if (!worksheet || !cellAddress) {
    return null;
  }

  const cell = worksheet[cellAddress];
  if (!cell || cell.v === undefined || cell.v === null) {
    return null;
  }

  return String(cell.v).trim();
}
```

#### Verification Checklist
- [ ] Locates `Vorlage` worksheet
- [ ] Extracts all 6 metadata fields from correct cells
- [ ] Returns null for missing optional fields (e.g., date)
- [ ] Throws clear error for missing required fields
- [ ] Normalizes date to ISO string format
- [ ] Handles malformed cell data gracefully

---

### 3.1.3 `extractPositions(workbook)`

#### Purpose
Parse all position rows from the protokoll worksheet and return an array of position objects with position number and quantity.

#### Expected Data Layout

- **Data range:** Rows 30–325 (typically)
- **Pos.Nr. column:** Column A
- **Menge (quantity) column:** Column B (or dynamically determined)
- **Skip empty rows:** If Pos.Nr. is empty, skip the row

#### Implementation

```javascript
/**
 * Extract position data from the protokoll worksheet.
 * 
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Array} Array of { posNr, menge } objects
 * @throws {Error} If worksheet is missing or cannot be parsed
 */
export function extractPositions(workbook) {
  if (!workbook || !workbook.SheetNames) {
    throw new Error('Invalid workbook object');
  }

  const sheetName = 'Vorlage';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Worksheet "${sheetName}" not found`);
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Unable to access worksheet "${sheetName}"`);
  }

  const positionen = [];
  const startRow = 30;
  const endRow = 325;

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const posNr = readCell(worksheet, `A${rowIndex}`);
    const mengeStr = readCell(worksheet, `B${rowIndex}`);

    // Skip if Pos.Nr. is empty
    if (!posNr) {
      continue;
    }

    // Parse quantity, default to 0 if invalid
    let menge = 0;
    if (mengeStr) {
      const parsed = parseFloat(mengeStr);
      if (!Number.isNaN(parsed)) {
        menge = parsed;
      }
    }

    // Only add if menge is positive or explicitly 0 (valid entry)
    if (menge >= 0) {
      positionen.push({
        posNr: posNr,
        menge: menge,
        rowIndex: rowIndex  // For debugging/tracing
      });
    }
  }

  if (positionen.length === 0) {
    console.warn('No positions found in protokoll');
  }

  return positionen;
}
```

#### Error Handling

```javascript
/**
 * Validate extracted positions for common issues.
 * 
 * @param {Array} positionen - Array of position objects
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
 */
export function validateExtractedPositions(positionen) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(positionen)) {
    return {
      valid: false,
      errors: ['Positions is not an array'],
      warnings: []
    };
  }

  if (positionen.length === 0) {
    warnings.push('No positions were extracted from protokoll');
  }

  const posNrMap = new Map();

  positionen.forEach((pos, index) => {
    // Check for duplicate Pos.Nr.
    if (posNrMap.has(pos.posNr)) {
      warnings.push(`Position ${pos.posNr} appears multiple times (rows ${posNrMap.get(pos.posNr)} and ${pos.rowIndex})`);
    } else {
      posNrMap.set(pos.posNr, pos.rowIndex);
    }

    // Check for invalid Pos.Nr. format (should be like "01.01.0010")
    if (!/^\d{2}\.\d{2}\.\d{4}/.test(pos.posNr)) {
      warnings.push(`Position ${pos.posNr} at row ${pos.rowIndex} has unexpected format`);
    }

    // Check for negative quantities
    if (pos.menge < 0) {
      errors.push(`Position ${pos.posNr} has negative quantity (${pos.menge})`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

#### Verification Checklist
- [ ] Scans rows 30–325 correctly
- [ ] Extracts Pos.Nr. from Column A
- [ ] Extracts Menge from Column B
- [ ] Skips empty rows
- [ ] Handles non-numeric quantities gracefully
- [ ] Returns array of valid position objects
- [ ] Detects and warns about duplicates
- [ ] Validates position code format

---

### 3.1.4 `sumByPosition(positionen: Array)`

#### Purpose
Aggregate quantities by position number, handling duplicates and invalid entries.

#### Implementation

```javascript
/**
 * Sum quantities grouped by position number.
 * 
 * @param {Array} positionen - Array of { posNr, menge } objects
 * @returns {Object} Map of posNr → totalMenge, e.g. { "01.01.0010": 5, "01.01.0020": 3 }
 * @throws {Error} If positionen is invalid
 */
export function sumByPosition(positionen) {
  if (!Array.isArray(positionen)) {
    throw new Error('Positions must be an array');
  }

  const positionMap = {};

  positionen.forEach((pos) => {
    if (!pos || typeof pos !== 'object') {
      throw new Error('Invalid position object in array');
    }

    const { posNr, menge } = pos;

    if (!posNr || typeof posNr !== 'string') {
      throw new Error(`Invalid position number: ${posNr}`);
    }

    if (typeof menge !== 'number' || Number.isNaN(menge)) {
      throw new Error(`Invalid quantity for position ${posNr}: ${menge}`);
    }

    // Sum quantities for this position
    if (positionMap[posNr] === undefined) {
      positionMap[posNr] = 0;
    }

    positionMap[posNr] += menge;
  });

  return positionMap;
}

/**
 * Compute summary statistics for position sums.
 * 
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
```

#### Verification Checklist
- [ ] Groups positions by Pos.Nr. correctly
- [ ] Sums quantities for duplicate Pos.Nr. entries
- [ ] Handles empty array (returns empty map)
- [ ] Throws error on invalid input
- [ ] `getPositionSummary` provides useful statistics

#### Testing Examples

```javascript
// Test Case 1: Normal aggregation
const positions1 = [
  { posNr: "01.01.0010", menge: 5 },
  { posNr: "01.01.0020", menge: 3 },
  { posNr: "01.01.0010", menge: 2 }
];
const result1 = sumByPosition(positions1);
// Expected: { "01.01.0010": 7, "01.01.0020": 3 }

// Test Case 2: Empty array
const result2 = sumByPosition([]);
// Expected: {}

// Test Case 3: Large numbers
const positions3 = [
  { posNr: "01.01.0010", menge: 1000 },
  { posNr: "01.01.0010", menge: 2000 }
];
const result3 = sumByPosition(positions3);
// Expected: { "01.01.0010": 3000 }
```

---

## 3.2 Excel Writing Utilities

### Objective

Implement functions to load the `abrechnung.xlsx` template, populate it with metadata and calculated position sums, and prepare it for export.

### 3.2.1 `loadAbrechnungTemplate()`

#### Purpose
Read the abrechnungTemplate.xlsx file and cache it in memory for reuse.

#### Implementation

```javascript
// Cache template in module scope
let cachedAbrechnungTemplate = null;

/**
 * Load the abrechnung template from file system.
 * Template is cached in memory to avoid repeated disk reads.
 * 
 * @returns {Promise<Object>} Workbook object of the template
 * @throws {Error} If template cannot be loaded
 */
export async function loadAbrechnungTemplate() {
  // Return cached template if available
  if (cachedAbrechnungTemplate) {
    return cachedAbrechnungTemplate;
  }

  try {
    // Fetch the template file from the /templates directory
    const response = await fetch('./templates/abrechnung.xlsx');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch template`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook || !workbook.SheetNames.includes('EAW')) {
      throw new Error('Template workbook missing "EAW" worksheet');
    }

    // Cache the template
    cachedAbrechnungTemplate = workbook;

    console.log('Abrechnung template loaded and cached');
    return workbook;
  } catch (error) {
    throw new Error(`Failed to load abrechnung template: ${error.message}`);
  }
}

/**
 * Clear the cached template (useful for testing).
 */
export function clearAbrechnungTemplateCache() {
  cachedAbrechnungTemplate = null;
}
```

#### Verification Checklist
- [ ] Fetches template from `./templates/abrechnung.xlsx`
- [ ] Caches workbook for reuse
- [ ] Throws clear error if template is missing
- [ ] Validates that `EAW` worksheet exists
- [ ] Returns consistent workbook object on subsequent calls

---

### 3.2.2 `fillAbrechnungHeader(workbook, metadata)`

#### Purpose
Populate the header section of the abrechnung worksheet with extracted metadata.

#### Implementation

```javascript
/**
 * Fill the abrechnung header with metadata.
 * 
 * @param {Object} workbook - SheetJS workbook object (from template)
 * @param {Object} metadata - Metadata object from parseProtokoll
 * @returns {Object} Updated workbook
 * @throws {Error} If workbook or metadata is invalid
 */
export function fillAbrechnungHeader(workbook, metadata) {
  if (!workbook || !workbook.Sheets) {
    throw new Error('Invalid workbook object');
  }

  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Invalid metadata object');
  }

  const sheetName = 'EAW';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Worksheet "${sheetName}" not found in workbook`);
  }

  const worksheet = workbook.Sheets[sheetName];

  // Write header values to specific cells
  // Adjust cell addresses based on your template layout
  const headerMap = {
    'B1': 'date',          // Datum
    'B2': 'orderNumber',   // Auftrags-Nr.
    'B3': 'plant',         // Anlage
    'B4': 'location'       // Einsatzort
  };

  try {
    Object.entries(headerMap).forEach(([cellAddress, metaKey]) => {
      const value = metadata[metaKey];
      
      if (value !== undefined && value !== null) {
        writeCell(worksheet, cellAddress, value);
      } else {
        console.warn(`Metadata field "${metaKey}" is missing. Leaving cell ${cellAddress} empty.`);
      }
    });

    console.log('Abrechnung header filled successfully');
    return workbook;
  } catch (error) {
    throw new Error(`Failed to fill abrechnung header: ${error.message}`);
  }
}

/**
 * Helper function to write a value to a worksheet cell.
 * 
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} cellAddress - Cell address (e.g., "A1")
 * @param {*} value - Value to write (string, number, date, etc.)
 */
function writeCell(worksheet, cellAddress, value) {
  if (!worksheet) {
    throw new Error('Worksheet is null or undefined');
  }

  // Initialize cell if it doesn't exist
  if (!worksheet[cellAddress]) {
    worksheet[cellAddress] = {};
  }

  // Set the value
  if (value instanceof Date) {
    worksheet[cellAddress].v = value;
    worksheet[cellAddress].t = 'd';  // Mark as date type
  } else {
    worksheet[cellAddress].v = value;
  }
}
```

#### Verification Checklist
- [ ] Writes Datum to B1
- [ ] Writes Auftrags-Nr. to B2
- [ ] Writes Anlage to B3
- [ ] Writes Einsatzort to B4
- [ ] Preserves existing formulas and formatting in other cells
- [ ] Throws error for invalid workbook/metadata
- [ ] Handles missing metadata gracefully

---

### 3.2.3 `fillAbrechnungPositions(workbook, positionSums)`

#### Purpose
Populate the position rows of the abrechnung worksheet with aggregated quantities.

#### Implementation

```javascript
/**
 * Fill position rows in the abrechnung worksheet with quantities.
 * 
 * @param {Object} workbook - SheetJS workbook object
 * @param {Object} positionSums - Map of posNr → totalMenge from sumByPosition()
 * @returns {Object} Updated workbook
 * @throws {Error} If workbook or positionSums is invalid
 */
export function fillAbrechnungPositions(workbook, positionSums) {
  if (!workbook || !workbook.Sheets) {
    throw new Error('Invalid workbook object');
  }

  if (!positionSums || typeof positionSums !== 'object') {
    throw new Error('Invalid positionSums object');
  }

  const sheetName = 'EAW';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Worksheet "${sheetName}" not found in workbook`);
  }

  const worksheet = workbook.Sheets[sheetName];

  let filledCount = 0;
  let skippedCount = 0;

  // Iterate through position rows (adjust range as needed)
  const startRow = 6;
  const endRow = 300;

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const cellAddress = `A${rowIndex}`;
    const cell = worksheet[cellAddress];
    
    if (!cell || !cell.v) {
      continue;  // Skip empty rows
    }

    const templatePosNr = String(cell.v).trim();
    
    // Check if this template position has a quantity in our sums
    if (positionSums.hasOwnProperty(templatePosNr)) {
      const quantity = positionSums[templatePosNr];
      
      // Write quantity to Column B
      const quantityCellAddress = `B${rowIndex}`;
      writeCell(worksheet, quantityCellAddress, quantity);
      
      filledCount++;
    } else {
      // Position in template not found in sums; leave it empty or 0
      skippedCount++;
    }
  }

  console.log(`Filled ${filledCount} positions, skipped ${skippedCount} template positions`);

  return workbook;
}

/**
 * Validate that quantities have been properly written.
 * 
 * @param {Object} workbook - SheetJS workbook object
 * @returns {Object} { filledCount, emptyCount, errors }
 */
export function validateFilledPositions(workbook) {
  const sheetName = 'EAW';
  const worksheet = workbook.Sheets[sheetName];
  const errors = [];

  let filledCount = 0;
  let emptyCount = 0;

  for (let rowIndex = 6; rowIndex <= 300; rowIndex++) {
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
```

#### Verification Checklist
- [ ] Iterates through template position rows
- [ ] Matches position numbers from template with positionSums
- [ ] Writes quantities to Column B
- [ ] Preserves formulas in other columns (e.g., Column F for totals)
- [ ] Handles missing positions gracefully
- [ ] Returns count of filled/skipped positions
- [ ] Reports validation errors clearly

---

### 3.2.4 `createExportWorkbook(abrechnungData)`

#### Purpose
Build a clean, final workbook from the template with all data populated.

#### Implementation

```javascript
/**
 * Create a complete abrechnung workbook ready for export.
 * 
 * @param {Object} abrechnungData - Combined data object { header, positionen }
 * @returns {Promise<Object>} Final workbook ready to write
 * @throws {Error} If data is invalid or template cannot be loaded
 */
export async function createExportWorkbook(abrechnungData) {
  if (!abrechnungData || typeof abrechnungData !== 'object') {
    throw new Error('Invalid abrechnungData');
  }

  const { header, positionen } = abrechnungData;

  if (!header || !positionen) {
    throw new Error('Missing header or positionen in abrechnungData');
  }

  try {
    // Load template
    const workbook = await loadAbrechnungTemplate();

    // Fill header
    fillAbrechnungHeader(workbook, header);

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
    throw new Error(`Failed to create export workbook: ${error.message}`);
  }
}
```

#### Verification Checklist
- [ ] Loads and uses the cached template
- [ ] Calls fillAbrechnungHeader with correct metadata
- [ ] Calls fillAbrechnungPositions with correct sums
- [ ] Validates the result
- [ ] Throws clear errors on failure
- [ ] Returns a valid, complete workbook

---

### 3.2.5 `exportToExcel(workbook, metadata)`

#### Purpose
Trigger a browser download of the generated abrechnung file with an appropriate filename.

#### Implementation

```javascript
/**
 * Export a workbook to the user's downloads folder.
 * 
 * @param {Object} workbook - SheetJS workbook object to export
 * @param {Object} metadata - Metadata for filename generation { orderNumber, date }
 * @returns {Object} Export metadata { fileName, timestamp, success }
 * @throws {Error} If export fails
 */
export function exportToExcel(workbook, metadata) {
  if (!workbook) {
    throw new Error('Workbook is required');
  }

  if (!metadata || !metadata.orderNumber) {
    throw new Error('Metadata with orderNumber is required');
  }

  try {
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const orderNum = String(metadata.orderNumber).replace(/\s+/g, '_');
    const fileName = `abrechnung_${orderNum}_${timestamp}.xlsx`;

    // Write file using SheetJS
    XLSX.writeFile(workbook, fileName);

    const exportMetadata = {
      fileName,
      timestamp,
      fileSize: estimateWorkbookSize(workbook),
      success: true
    };

    console.log(`File exported: ${fileName}`);
    return exportMetadata;
  } catch (error) {
    throw new Error(`Failed to export Excel file: ${error.message}`);
  }
}

/**
 * Estimate the size of a workbook when written.
 * 
 * @param {Object} workbook - SheetJS workbook
 * @returns {number} Approximate size in bytes
 */
function estimateWorkbookSize(workbook) {
  try {
    const buffer = XLSX.write(workbook, { type: 'array' });
    return buffer.length;
  } catch (e) {
    return 0;  // If estimation fails, return 0
  }
}
```

#### Verification Checklist
- [ ] Generates filename with pattern: `abrechnung_[orderNum]_[timestamp].xlsx`
- [ ] Triggers browser file download
- [ ] Returns export metadata
- [ ] Throws error on failure
- [ ] Handles special characters in order number
- [ ] Works in major browsers (Chrome, Firefox, Safari, Edge)

---

## 3.3 Data Transformation Pipeline

### End-to-End Workflow

The following diagram illustrates how all utility functions work together:

```
User Imports protokoll.xlsx
        ↓
readExcelFile(file)
        ↓
parseProtokoll(workbook) → metadata
        ↓
extractPositions(workbook) → positionen[]
        ↓
validateExtractedPositions(positionen)
        ↓
sumByPosition(positionen) → positionSums
        ↓
User Clicks "Generate"
        ↓
loadAbrechnungTemplate()
        ↓
fillAbrechnungHeader(workbook, metadata)
        ↓
fillAbrechnungPositions(workbook, positionSums)
        ↓
createExportWorkbook(abrechnungData)
        ↓
User Clicks "Export"
        ↓
exportToExcel(workbook, metadata)
        ↓
abrechnung_[OrderNum]_[timestamp].xlsx downloaded
```

### Integration Points

These utility functions will be called from **Phase 4 handlers** (`handlers.js`) as follows:

```javascript
// Example from Phase 4: handlers.js

import {
  readExcelFile,
  parseProtokoll,
  extractPositions,
  sumByPosition,
  loadAbrechnungTemplate,
  fillAbrechnungHeader,
  fillAbrechnungPositions,
  createExportWorkbook,
  exportToExcel
} from './utils.js';

import { setState, updateProtokollData } from './state.js';

async function handleImportFile(event) {
  const file = event.target.files[0];
  
  try {
    // Read Excel
    const { workbook, metadata: fileMetadata } = await readExcelFile(file);
    
    // Parse metadata and positions
    const metadata = parseProtokoll(workbook);
    const positionen = extractPositions(workbook);
    
    // Validate
    const validation = validateExtractedPositions(positionen);
    if (!validation.valid) {
      throw new Error(`Invalid positions: ${validation.errors.join('; ')}`);
    }
    
    // Update state
    setState({
      protokollData: { metadata, positionen },
      ui: { import: { status: 'success', fileName: file.name } }
    });
  } catch (error) {
    setState({
      ui: { import: { status: 'error', message: error.message } }
    });
  }
}
```

---

## 3.4 Error Handling Strategy

### Common Errors & Recovery

| Error Scenario | Root Cause | User Message | Recovery |
|---|---|---|---|
| File is not Excel | Wrong file type selected | "Only .xlsx files are supported" | Allow user to re-select file |
| Worksheet "Vorlage" missing | File is not a valid protokoll | "Selected file is not a valid protokoll.xlsx" | Provide template example |
| Metadata field empty | File incomplete or corrupted | "Required field [fieldname] is missing" | Show which cell needs data |
| Large file (>10MB) | File size exceeds expectations | "File is too large to process" | Suggest checking file integrity |
| localStorage full | Browser storage quota exceeded | "Application memory is full. Please reset." | Provide reset/clear button |
| Export fails | SheetJS error or browser restriction | "Failed to download file. Check browser settings." | Try incognito/private mode |

### Implementation Pattern

```javascript
/**
 * Wrap utility calls with standardized error handling.
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
      errors.push(`File read error: ${e.message}`);
      throw e;
    }

    const { workbook } = result;

    // Step 2: Parse metadata
    let metadata;
    try {
      metadata = parseProtokoll(workbook);
    } catch (e) {
      errors.push(`Metadata parse error: ${e.message}`);
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
      errors.push(`Position extract error: ${e.message}`);
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
```

---

## 3.5 Unit Testing & Verification

### Manual Testing Checklist

Before Phase 4 integration, manually test each function:

#### Reading Utilities

```javascript
// 1. Test readExcelFile with valid and invalid files
const validFile = document.querySelector('input[type="file"]').files[0];
const result = await readExcelFile(validFile);
console.assert(result.workbook, 'Workbook loaded');
console.assert(result.metadata.fileName, 'File metadata captured');

// 2. Test parseProtokoll
const metadata = parseProtokoll(result.workbook);
console.assert(metadata.protocolNumber, 'Protocol number extracted');
console.assert(metadata.orderNumber, 'Order number extracted');

// 3. Test extractPositions
const positionen = extractPositions(result.workbook);
console.assert(Array.isArray(positionen), 'Positions is array');
console.assert(positionen.length > 0, 'Positions found');

// 4. Test sumByPosition
const sums = sumByPosition(positionen);
console.assert(typeof sums === 'object', 'Sums is object');
console.assert(Object.keys(sums).length > 0, 'Position sums computed');
```

#### Writing Utilities

```javascript
// 5. Test loadAbrechnungTemplate
const template = await loadAbrechnungTemplate();
console.assert(template.SheetNames.includes('EAW'), 'EAW worksheet found');

// 6. Test fillAbrechnungHeader
const filled = fillAbrechnungHeader(template, metadata);
const eawSheet = filled.Sheets['EAW'];
console.assert(eawSheet['B1'].v, 'Date written to B1');

// 7. Test fillAbrechnungPositions
const filled2 = fillAbrechnungPositions(filled, sums);
console.log('Positions filled in template');

// 8. Test exportToExcel
const exportMeta = exportToExcel(filled2, metadata);
console.assert(exportMeta.fileName.includes('abrechnung'), 'Export filename generated');
console.assert(exportMeta.success, 'Export marked successful');
```

### Sample Test Data

Create a sample `test_protokoll.xlsx` with:

```
Vorlage sheet:
- U3: "P-2025-001"
- N5: "A-12345"
- A10: "Facility A"
- T10: "Building B"
- T7: "Company Inc."
- A1: "2025-12-09"

Rows 30-40:
- A30: "01.01.0010", B30: 5
- A31: "01.01.0020", B31: 3
- A32: "01.01.0010", B32: 2
- (rest empty)
```

Expected Results:

```javascript
parseProtokoll() → {
  protocolNumber: "P-2025-001",
  orderNumber: "A-12345",
  plant: "Facility A",
  location: "Building B",
  company: "Company Inc.",
  date: "2025-12-09"
}

extractPositions() → [
  { posNr: "01.01.0010", menge: 5, rowIndex: 30 },
  { posNr: "01.01.0020", menge: 3, rowIndex: 31 },
  { posNr: "01.01.0010", menge: 2, rowIndex: 32 }
]

sumByPosition() → {
  "01.01.0010": 7,
  "01.01.0020": 3
}
```

---

## 3.6 Performance Considerations

### Optimization Tips

1. **Template Caching:** Load template once and reuse across multiple generations (implemented in `loadAbrechnungTemplate`)
2. **Lazy Loading:** Don't load template until "Generate" is clicked
3. **Batch Writes:** Write all cells in a single pass rather than individual updates
4. **Large File Handling:** For protokolls > 10,000 rows, consider pagination or streaming
5. **Memory Management:** Clear references after export to allow garbage collection

### Benchmarking Targets

- File read (1MB): < 500ms
- Metadata parse: < 50ms
- Position extract (1000 rows): < 200ms
- Aggregation: < 100ms
- Header fill: < 50ms
- Position fill: < 200ms
- Export generation: < 100ms

**Total workflow target: < 2 seconds**

---

## Phase 3 Deliverables

At the end of Phase 3, the following should be complete and tested:

1. **Excel Reading Module (`utils.js` - Reading Functions)**
   - `readExcelFile()` — reads and validates Excel files
   - `parseProtokoll()` — extracts metadata
   - `extractPositions()` — extracts position data
   - `validateExtractedPositions()` — validates extracted data
   - `sumByPosition()` — aggregates quantities by position

2. **Excel Writing Module (`utils.js` - Writing Functions)**
   - `loadAbrechnungTemplate()` — loads and caches template
   - `fillAbrechnungHeader()` — writes metadata to template
   - `fillAbrechnungPositions()` — writes aggregated quantities
   - `validateFilledPositions()` — validates filled workbook
   - `createExportWorkbook()` — creates complete export workbook
   - `exportToExcel()` — triggers file download

3. **Data Transformation Utilities**
   - `getPositionSummary()` — computes position statistics
   - `safeReadAndParseProtokoll()` — comprehensive error-safe wrapper
   - Error handling patterns documented and implemented

4. **Testing & Documentation**
   - All functions manually tested with sample data
   - Error scenarios documented and handled
   - Performance benchmarked against targets
   - Code commented and documented

### Success Criteria for Phase 3

- ✓ Can read any valid `protokoll.xlsx` file without crashes
- ✓ Extracts all required metadata fields correctly
- ✓ Aggregates position quantities by position number accurately
- ✓ Loads `abrechnung.xlsx` template without errors
- ✓ Populates template with metadata and quantities
- ✓ Exports valid, readable Excel files
- ✓ All error scenarios handled with user-friendly messages
- ✓ Performance within acceptable limits
- ✓ Code is clean, documented, and testable

---

## Next Steps: Preparation for Phase 4

With Phase 3 complete, all Excel I/O capabilities are ready. Phase 4 will focus on:

- Creating **event handlers** in `handlers.js` that use these utilities
- **Updating UI** based on operation results
- **Integrating with state** management from Phase 2
- **User-facing error messages** and progress indicators

The utility functions from Phase 3 will be imported and called from handlers without modification.

---

## References & Resources

### SheetJS Documentation
- [SheetJS Getting Started](https://sheetjs.com/docs/getting-started)
- [Reading Files](https://sheetjs.com/docs/solutions/input)
- [Writing Files](https://sheetjs.com/docs/solutions/output)
- [Cell References](https://sheetjs.com/docs/csf/)

### Excel Concepts
- Cell Addressing: A1-style notation (column letter + row number)
- Workbook: Container for multiple sheets
- Worksheet: A grid of cells with rows and columns
- Cell Value (v) vs Type (t): SheetJS distinguishes between data and formatting

### Browser APIs
- [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) — reading user files
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) — loading resources
- [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) — binary data representation

---

**Phase 3 Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Ready for Implementation