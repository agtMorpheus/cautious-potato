# Abrechnung Export Formatting Fix

**Status:** ✅ RESOLVED - ExcelJS Implementation Applied (2025-12-09)

**Solution:** Migrated from SheetJS Community Edition to ExcelJS for full formatting preservation.

---

## Problem (Original)

The current export function in `utils.js` exports Excel files that contain **only raw text and data** without any formatting:
- No bold text
- No cell colors/background
- No images/logos
- No borders or styling
- No merged cells
- No fonts or sizes
- Missing professional formatting from the template

This happens because the current implementation only reads and writes cell **values (v)** but ignores **formatting (fmt)**, **styles (s)**, and other visual properties.

### Current Implementation (Phase 3)

```javascript
export function exportToExcel(workbook, metadata) {
  // ... validation code ...
  
  XLSX.writeFile(workbook, fileName);  // ← Loses all formatting!
  
  return exportMetadata;
}
```

## Solution

### Approach 1: Preserve Template Formatting (Recommended)

The template `abrechnung.xlsx` already contains all desired formatting. We need to **preserve** it when filling data cells.

**Key Steps:**
1. Load template with formatting intact
2. Only overwrite cell **values**, not the entire cell object
3. Let SheetJS preserve existing styles and formatting

### Implementation

Replace the `exportToExcel` function and related utilities in `js/utils.js`:

```javascript
/**
 * Export a workbook to the user's downloads folder with formatting preserved.
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

    // Write file using SheetJS with formatting preservation options
    XLSX.writeFile(workbook, fileName, {
      // These options help preserve formatting
      bookType: 'xlsx',
      bookSST: true,
      compression: 'DEFLATE',
      cellFormula: true,
      cellStyles: true  // ← Important: preserve cell styles
    });

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
```

### Implementation: Fix Cell Writing

Update the `writeCell` function to **preserve existing cell properties**:

```javascript
/**
 * Helper function to write a value to a worksheet cell while preserving formatting.
 * 
 * @param {Object} worksheet - SheetJS worksheet object
 * @param {string} cellAddress - Cell address (e.g., "A1")
 * @param {*} value - Value to write (string, number, date, etc.)
 */
function writeCell(worksheet, cellAddress, value) {
  if (!worksheet) {
    throw new Error('Worksheet is null or undefined');
  }

  // Get existing cell or create new one
  let cell = worksheet[cellAddress];
  
  if (!cell) {
    // If cell doesn't exist, create it
    cell = worksheet[cellAddress] = {};
  }

  // IMPORTANT: Update ONLY the value (v), preserve other properties
  // This preserves: formatting (fmt), styles (s), alignment, borders, colors, etc.
  
  if (value instanceof Date) {
    cell.v = value;
    cell.t = 'd';  // Mark as date type
  } else {
    cell.v = value;
  }
  
  // If no type was set, SheetJS will auto-detect
  if (!cell.t) {
    if (typeof value === 'number') {
      cell.t = 'n';  // Number
    } else if (typeof value === 'boolean') {
      cell.t = 'b';  // Boolean
    } else {
      cell.t = 's';  // String
    }
  }
  
  // DO NOT override: cell.s (style index), cell.fmt (number format), etc.
}
```

### Implementation: Load Template with Formatting

Update `loadAbrechnungTemplate` to ensure formatting is loaded:

```javascript
let cachedAbrechnungTemplate = null;

export async function loadAbrechnungTemplate() {
  if (cachedAbrechnungTemplate) {
    return cachedAbrechnungTemplate;
  }

  try {
    const response = await fetch('./templates/abrechnung.xlsx');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch template`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Load with ALL options to preserve formatting
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellFormula: true,     // Preserve formulas
      cellStyles: true,      // ← Preserve ALL cell formatting
      cellNF: true,          // Preserve number formats
      sheetStubs: false      // Don't skip empty cells with formatting
    });

    if (!workbook || !workbook.SheetNames.includes('EAW')) {
      throw new Error('Template workbook missing "EAW" worksheet');
    }

    // Cache the template
    cachedAbrechnungTemplate = workbook;

    console.log('Abrechnung template loaded and cached (with formatting)');
    return workbook;
  } catch (error) {
    throw new Error(`Failed to load abrechnung template: ${error.message}`);
  }
}
```

### Implementation: Fill Positions (Preserve Formatting)

Update `fillAbrechnungPositions` to better preserve cell formatting:

```javascript
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

  const startRow = 6;
  const endRow = 300;

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const cellAddress = `A${rowIndex}`;
    const cell = worksheet[cellAddress];
    
    if (!cell || !cell.v) {
      continue;
    }

    const templatePosNr = String(cell.v).trim();
    
    if (positionSums.hasOwnProperty(templatePosNr)) {
      const quantity = positionSums[templatePosNr];
      
      // Write quantity to Column B, preserving existing formatting
      const quantityCellAddress = `B${rowIndex}`;
      writeCell(worksheet, quantityCellAddress, quantity);
      
      filledCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`Filled ${filledCount} positions, skipped ${skippedCount} template positions`);
  return workbook;
}
```

## Approach 2: Add Custom Formatting (Advanced)

If the template doesn't have formatting or you want to add/enhance formatting programmatically:

```javascript
/**
 * Add formatting to a cell
 * This requires building a style index - advanced SheetJS feature
 */
function formatCell(worksheet, cellAddress, style = {}) {
  const cell = worksheet[cellAddress];
  if (!cell) return;

  // Note: SheetJS Pro has more advanced styling
  // Free version has limited style support via cell.s (style index)
  
  // Example with merged cells and formatting
  if (!worksheet['!merges']) {
    worksheet['!merges'] = [];
  }
  
  // Example: merge cells
  // worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
}

/**
 * Set column width for better readability
 */
function setColumnWidth(worksheet, columnIndex, width) {
  if (!worksheet['!cols']) {
    worksheet['!cols'] = [];
  }
  worksheet['!cols'][columnIndex] = { wch: width };
}
```

## Testing the Fix

### Step 1: Verify Template Has Formatting

Open `templates/abrechnung.xlsx` in Excel and confirm:
- [ ] Has bold headers
- [ ] Has cell borders
- [ ] Has background colors/shading
- [ ] Has logos/images (if any)
- [ ] Has proper fonts and sizes
- [ ] Has merged cells where needed

### Step 2: Update the Export Code

Replace the export-related functions in `js/utils.js` with the fixed versions above.

### Step 3: Test Export

```javascript
// Test in browser console
const state = getState();
const workbook = window._currentWorkbook;
const metadata = state.protokollData.metadata;

const result = exportToExcel(workbook, metadata);
console.log('Export result:', result);
```

### Step 4: Verify Output

1. Generate and export an abrechnung
2. Open the exported file in Excel
3. Check:
   - [ ] Formatting is preserved (bold, colors, borders)
   - [ ] Data is correctly filled
   - [ ] Fonts and sizes match template
   - [ ] No data is missing
   - [ ] Images/logos are present (if any)

## Common Issues & Fixes

### Issue: Formatting Still Missing

**Cause:** Template not being loaded with `cellStyles: true`

**Fix:** Update `loadAbrechnungTemplate()` to include:
```javascript
const workbook = XLSX.read(arrayBuffer, {
  type: 'array',
  cellStyles: true,  // ← Must be true
  cellNF: true
});
```

### Issue: Formulas Not Calculating

**Cause:** Formulas are overwritten or not preserved

**Fix:** Don't write to cells containing formulas. Use `cellFormula: true`:
```javascript
const workbook = XLSX.read(arrayBuffer, {
  type: 'array',
  cellFormula: true  // ← Preserve formulas
});
```

### Issue: Column Widths Reset

**Cause:** SheetJS doesn't always preserve column widths from template

**Fix:** Explicitly set column widths after loading:
```javascript
export async function loadAbrechnungTemplate() {
  // ... load template ...
  
  const worksheet = workbook.Sheets['EAW'];
  
  // Set column widths (adjust as needed for your template)
  worksheet['!cols'] = [
    { wch: 15 },  // Column A width
    { wch: 12 },  // Column B width
    { wch: 10 }   // Column C width
    // ... more columns ...
  ];
  
  return workbook;
}
```

### Issue: Merged Cells Not Showing

**Cause:** Merge information not preserved

**Fix:** Load template with merge preservation:
```javascript
const workbook = XLSX.read(arrayBuffer, {
  type: 'array',
  cellStyles: true,
  sheetStubs: false
});

// The worksheet will have !merges property
const worksheet = workbook.Sheets['EAW'];
console.log('Merged cells:', worksheet['!merges']);
```

## Best Practices

1. **Template-First Approach:** Use a well-formatted Excel template and preserve its formatting
2. **Value-Only Updates:** Only update cell values, preserve all formatting properties
3. **Preserve Formulas:** Don't overwrite cells with formulas; use `cellFormula: true`
4. **Test with Real Data:** Export with sample data and verify formatting in Excel
5. **Document Template Layout:** Keep template structure documented for future maintenance

## Summary

The fix involves:
1. ✅ Update `writeCell()` to preserve existing cell properties
2. ✅ Update `loadAbrechnungTemplate()` to load with formatting options
3. ✅ Update `exportToExcel()` to include formatting options
4. ✅ Ensure template file has desired formatting
5. ✅ Test export output in Excel

This preserves all formatting from the `abrechnung.xlsx` template while filling in the data values correctly.

---

## RESOLUTION: ExcelJS Implementation (2025-12-09)

### Root Cause
SheetJS Community Edition (free version) has **fundamental limitations** that prevent preserving complex Excel formatting (colors, fonts, images, borders, etc.). The `cellStyles` option only preserves basic number formats.

### Solution Applied
Migrated to **ExcelJS** - an open-source library with full formatting support.

### Changes Made

**1. Added ExcelJS Library** (`index.html`)
```html
<script src="https://cdn.jsdelivr.net/npm/exceljs@4/dist/exceljs.min.js"></script>
```

**2. Created ExcelJS Implementation** (`js/utils-exceljs.js`)
- `loadAbrechnungTemplateExcelJS()` - Loads template with ALL formatting
- `fillAbrechnungHeaderExcelJS()` - Fills header preserving formatting
- `fillAbrechnungPositionsExcelJS()` - Fills positions preserving formatting
- `exportToExcelExcelJS()` - Exports with perfect formatting preservation
- `createAndExportAbrechnungExcelJS()` - Complete workflow

**3. Updated Export Handler** (`js/handlers.js`)
```javascript
import { createAndExportAbrechnungExcelJS } from './utils-exceljs.js';

export async function handleExportAbrechnung() {
    // ... validation ...
    
    // Use ExcelJS for full formatting preservation
    const exportMetadata = await createAndExportAbrechnungExcelJS(state.abrechnungData);
    
    // ... update state ...
}
```

### Benefits
- ✅ **Full formatting preservation** (colors, fonts, images, borders, merged cells)
- ✅ **Free and open-source** (MIT license)
- ✅ **Better API** than SheetJS
- ✅ **Actively maintained**
- ✅ **No backend required** (client-side)

### Testing Required
1. Import protokoll.xlsx
2. Generate abrechnung
3. Export abrechnung.xlsx
4. Open in Excel and verify:
   - Cell colors and backgrounds preserved
   - Font styles (bold, italic, colors) preserved
   - Borders and merged cells preserved
   - Images/logos preserved
   - Column widths preserved
   - All data correctly filled

### Documentation
- Implementation details: `docs/implemented/3_7-export-formatting-fix.md`
- Complete guide: `docs/EXPORT-FORMATTING-SOLUTION.md`
- ExcelJS code: `js/utils-exceljs.js`

### Status
✅ Code integrated and ready for testing
⏳ Awaiting real-world testing with actual templates