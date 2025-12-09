# Excel Parsing Configuration Guide

## Overview

The Abrechnung application now supports flexible Excel parsing configuration. If your Protokoll files have metadata in different cell locations than the defaults, you can easily customize the parsing behavior.

## Configuration File

All parsing settings are centralized in `js/config.js`. This file contains four main configuration objects:

### 1. Metadata Cell Configuration

Defines where to look for metadata fields in the Protokoll Excel file. Each field has multiple fallback locations that are tried in order.

```javascript
export const METADATA_CELL_CONFIG = {
    protokollNr: ['U3', 'V3', 'W3', 'T3'],
    auftragsNr: ['N5', 'M5', 'O5', 'N4', 'N6'],
    anlage: ['A10', 'B10', 'A9', 'A11'],
    einsatzort: ['T10', 'S10', 'U10', 'T9', 'T11'],
    firma: ['T7', 'S7', 'U7', 'T6', 'T8'],
    auftraggeber: ['A5', 'B5', 'A4', 'A6']
};
```

**How it works:**
- The parser tries each cell address in order
- If a value is found in the first cell, it uses that
- If not, it tries the next fallback
- If no value is found in any fallback, it may trigger pattern-based search (if not in strict mode)

### 2. Position Data Configuration

Defines where to find position numbers and quantities:

```javascript
export const POSITION_CONFIG = {
    positionNumberColumn: 'A',      // Column with position numbers
    quantityColumns: ['X', 'B', 'C'], // Columns to check for quantities
    startRow: 30,                    // First row to scan
    endRow: 325,                     // Last row to scan
    positionNumberPattern: /^\d{2}\.\d{2}\.\d{4}/ // Validation pattern
};
```

### 3. Abrechnung Template Configuration

Defines where to write data in the output template:

```javascript
export const ABRECHNUNG_CONFIG = {
    sheetName: 'EAW',
    header: {
        datum: 'B1',
        auftragsNr: 'B2',
        anlage: 'B3',
        einsatzort: 'B4'
    },
    positions: {
        positionNumberColumn: 'A',
        quantityColumn: 'B',
        startRow: 9,
        endRow: 500
    }
};
```

### 4. Parsing Behavior Configuration

Controls how the parser behaves:

```javascript
export const PARSING_CONFIG = {
    strictMode: false,                    // Only use predefined cells
    metadataSearchRange: 'A1:Z50',       // Range for pattern search
    protokollSheetName: 'Vorlage',       // Sheet name to look for
    minPositionsRequired: 1              // Minimum valid positions
};
```

## Common Customization Scenarios

### Scenario 1: Order Number in Different Cell

If your Protokoll has the order number in cell `O5` instead of `N5`:

**Option A: Edit config.js (permanent)**
```javascript
auftragsNr: ['O5', 'N5', 'M5', 'N4', 'N6'],
```

**Option B: Runtime update (temporary)**
```javascript
import { updateMetadataCellMap } from './js/utils.js';
updateMetadataCellMap('auftragsNr', ['O5', 'N5']);
```

### Scenario 2: Quantities in Different Column

If quantities are in column `Y` instead of `X`:

```javascript
export const POSITION_CONFIG = {
    quantityColumns: ['Y', 'X', 'B', 'C'],
    // ... rest of config
};
```

### Scenario 3: Different Sheet Name

If your Protokoll uses sheet name `Data` instead of `Vorlage`:

```javascript
export const PARSING_CONFIG = {
    protokollSheetName: 'Data',
    // ... rest of config
};
```

### Scenario 4: Different Position Row Range

If positions are in rows 20-200:

```javascript
export const POSITION_CONFIG = {
    startRow: 20,
    endRow: 200,
    // ... rest of config
};
```

## Flexible Pattern-Based Search

When `strictMode: false` (default), the parser can search for metadata by looking for label patterns:

**How it works:**
1. Parser looks for cells containing text like "Auftrags-Nr", "Order Number", "Ort", etc.
2. When found, it checks adjacent cells (right, below, diagonal) for the actual value
3. Skips cells that also match the label pattern (to avoid returning another label)
4. Returns the first non-empty, non-label value found
5. This helps when cell locations vary between different Protokoll versions

**Example:**
```
Cell A5: "Ort:"        ← Label found by pattern
Cell B5: "Halle 3"     ← Value returned (right of label)
```

**Search patterns:**
```javascript
protokollNr: /protokoll[-\s]?nr/i
auftragsNr: /auftrags[-\s]?nr|order[-\s]?number/i
anlage: /anlage|plant/i
einsatzort: /einsatzort|location/i
firma: /firma|company/i
auftraggeber: /auftraggeber|client/i
```

**To disable pattern search:**
```javascript
export const PARSING_CONFIG = {
    strictMode: true,  // Only use predefined cell locations
    // ...
};
```

## Runtime Configuration API

You can also update configuration at runtime using these functions:

### Update Metadata Cell Map
```javascript
import { updateMetadataCellMap } from './js/utils.js';

// Add new fallback locations for a field
updateMetadataCellMap('auftragsNr', ['O5', 'P5', 'N5']);
```

### Get Current Configuration
```javascript
import { getMetadataCellMap } from './js/utils.js';

const currentConfig = getMetadataCellMap();
console.log(currentConfig);
```

### Reset to Defaults
```javascript
import { resetMetadataCellMap } from './js/utils.js';

resetMetadataCellMap();
```

## Debugging Tips

### Check Where Values Were Found

The parser returns `_foundCells` in the metadata object:

```javascript
const result = await safeReadAndParseProtokoll(file);
console.log('Values found in cells:', result.metadata._foundCells);
// Output: { auftragsNr: 'N5', anlage: 'A10', ... }
```

### Enable Console Logging

The parser logs helpful information:
```
Metadata gefunden in Zellen: { auftragsNr: 'N5', anlage: 'A10', ... }
Filled 45 positions, skipped 12 template positions
```

### Test with Different Options

```javascript
// Try strict mode
const result1 = await parseProtokollMetadata(workbook, { strictMode: true });

// Try wider search range
const result2 = await parseProtokollMetadata(workbook, { 
    strictMode: false, 
    searchRange: 'A1:AA100' 
});
```

## Best Practices

1. **Start with defaults**: Try importing without changes first
2. **Add fallbacks**: If a field is missing, add the correct cell as the first fallback
3. **Keep patterns broad**: Pattern search is forgiving, don't disable it unless necessary
4. **Document changes**: Comment your config.js changes for team members
5. **Test thoroughly**: Import a few Protokoll files after configuration changes

## Troubleshooting

### "Fehlende Pflichtfelder: auftragsNr, anlage"

**Cause:** Required fields not found in any configured cells

**Solutions:**
1. Check the actual cell locations in your Excel file
2. Add those cells to the fallback list in `METADATA_CELL_CONFIG`
3. Disable strict mode to enable pattern search
4. Check the error details for expected cell locations

### "Sheet 'Vorlage' nicht gefunden"

**Cause:** Sheet name doesn't match configuration

**Solution:** Update `PARSING_CONFIG.protokollSheetName` to match your sheet name

### "Keine Positionen wurden aus dem Protokoll extrahiert"

**Cause:** No valid positions found in configured row range

**Solutions:**
1. Check `POSITION_CONFIG.startRow` and `endRow`
2. Verify `positionNumberColumn` is correct
3. Check `quantityColumns` array includes the right column
4. Verify position number format matches `positionNumberPattern`

## Example: Complete Custom Configuration

```javascript
// js/config.js - Customized for Company XYZ templates

export const METADATA_CELL_CONFIG = {
    protokollNr: ['W5', 'U3'],           // Company XYZ uses W5
    auftragsNr: ['P7', 'N5'],            // Moved to P7
    anlage: ['B12', 'A10'],              // One row down
    einsatzort: ['U12', 'T10'],          // Adjusted
    firma: ['U9', 'T7'],                 // Adjusted
    auftraggeber: ['B7', 'A5']           // Adjusted
};

export const POSITION_CONFIG = {
    positionNumberColumn: 'A',
    quantityColumns: ['Z', 'Y', 'X'],    // Company XYZ uses column Z
    startRow: 25,                         // Starts earlier
    endRow: 300,                          // Ends earlier
    positionNumberPattern: /^\d{2}\.\d{2}\.\d{4}/
};

// Abrechnung and Parsing configs remain default
```

## Support

If you continue to have issues after configuration:
1. Check browser console for detailed error messages
2. Verify Excel file structure matches expectations
3. Review `docs/TROUBLESHOOTING.md` for common issues
4. Check `_foundCells` in metadata to see what was detected
