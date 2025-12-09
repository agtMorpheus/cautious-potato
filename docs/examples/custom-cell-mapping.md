# Custom Cell Mapping Examples

## Quick Start Examples

### Example 1: Simple Cell Location Change

Your Protokoll has the order number in cell `O5` instead of `N5`:

```javascript
// In js/config.js, update:
export const METADATA_CELL_CONFIG = {
    auftragsNr: ['O5', 'N5', 'M5'],  // Changed: O5 is now first
    // ... rest stays the same
};
```

### Example 2: Quantity in Different Column

Your quantities are in column `Y`:

```javascript
// In js/config.js, update:
export const POSITION_CONFIG = {
    positionNumberColumn: 'A',
    quantityColumns: ['Y', 'X', 'B'],  // Changed: Y is now first
    startRow: 30,
    endRow: 325,
    positionNumberPattern: /^\d{2}\.\d{2}\.\d{4}/
};
```

### Example 3: Different Sheet Name

Your Protokoll uses sheet `Daten` instead of `Vorlage`:

```javascript
// In js/config.js, update:
export const PARSING_CONFIG = {
    strictMode: false,
    metadataSearchRange: 'A1:Z50',
    protokollSheetName: 'Daten',  // Changed from 'Vorlage'
    minPositionsRequired: 1
};
```

### Example 4: Runtime Configuration

Update configuration without editing files:

```javascript
// In browser console or in your code:
import { updateMetadataCellMap } from './js/utils.js';

// Update where to look for order number
updateMetadataCellMap('auftragsNr', ['P5', 'O5', 'N5']);

// Now import your file - it will use the new configuration
```

## Advanced Examples

### Example 5: Complete Custom Template

For a completely different Excel template structure:

```javascript
// js/config.js - Full customization

export const METADATA_CELL_CONFIG = {
    protokollNr: ['AA5', 'Z5'],
    auftragsNr: ['C3', 'D3'],
    anlage: ['C5', 'D5'],
    einsatzort: ['C7', 'D7'],
    firma: ['C9', 'D9'],
    auftraggeber: ['C11', 'D11']
};

export const POSITION_CONFIG = {
    positionNumberColumn: 'B',      // Positions in column B
    quantityColumns: ['F', 'G'],    // Quantities in F or G
    startRow: 15,                   // Starts at row 15
    endRow: 200,                    // Ends at row 200
    positionNumberPattern: /^\d{2}\.\d{2}\.\d{4}/
};

export const ABRECHNUNG_CONFIG = {
    sheetName: 'Summary',           // Different sheet name
    header: {
        datum: 'C2',
        auftragsNr: 'C3',
        anlage: 'C4',
        einsatzort: 'C5'
    },
    positions: {
        positionNumberColumn: 'B',
        quantityColumn: 'C',
        startRow: 10,
        endRow: 400
    }
};

export const PARSING_CONFIG = {
    strictMode: false,
    metadataSearchRange: 'A1:AA100',  // Wider search range
    protokollSheetName: 'MainData',
    minPositionsRequired: 1
};
```

### Example 6: Using Pattern Search

Enable flexible pattern-based search for varying templates:

```javascript
// js/config.js
export const PARSING_CONFIG = {
    strictMode: false,              // Enable pattern search
    metadataSearchRange: 'A1:Z50',  // Search this range
    protokollSheetName: 'Vorlage',
    minPositionsRequired: 1
};

// Now the parser will:
// 1. Try predefined cells first
// 2. If not found, search for labels like "Auftrags-Nr:" 
// 3. Check adjacent cells for the actual value
```

### Example 7: Debugging Configuration

Check where values were actually found:

```javascript
import { safeReadAndParseProtokoll } from './js/utils.js';

const file = document.getElementById('fileInput').files[0];
const result = await safeReadAndParseProtokoll(file);

// Check where each field was found
console.log('Found cells:', result.metadata._foundCells);
// Output: { auftragsNr: 'N5', anlage: 'A10', einsatzort: 'T10', ... }

// This helps you understand which cells were used
// and adjust your configuration accordingly
```

### Example 8: Multiple Protokoll Formats

Handle two different Protokoll formats in the same application:

```javascript
import { 
    updateMetadataCellMap, 
    resetMetadataCellMap,
    safeReadAndParseProtokoll 
} from './js/utils.js';

async function importProtokollFlexible(file) {
    // Try format A first
    resetMetadataCellMap(); // Use defaults
    let result = await safeReadAndParseProtokoll(file);
    
    if (!result.success) {
        console.log('Format A failed, trying Format B...');
        
        // Try format B
        updateMetadataCellMap('auftragsNr', ['P5', 'O5']);
        updateMetadataCellMap('anlage', ['B12', 'A12']);
        
        result = await safeReadAndParseProtokoll(file);
    }
    
    if (result.success) {
        console.log('Successfully parsed with:', result.metadata._foundCells);
    } else {
        console.error('Both formats failed:', result.errors);
    }
    
    return result;
}
```

## Testing Your Configuration

### Step 1: Check Browser Console

After importing a file, check the console for:
```
Metadata gefunden in Zellen: { auftragsNr: 'N5', anlage: 'A10', ... }
```

### Step 2: Verify Extracted Data

```javascript
import { getState } from './js/state.js';

const state = getState();
console.log('Imported metadata:', state.protokollData.metadata);
console.log('Position count:', state.protokollData.positionen.length);
```

### Step 3: Test with Sample File

1. Open your Protokoll Excel file
2. Note the exact cell locations of each field
3. Update `js/config.js` with those locations
4. Import the file
5. Check console logs and imported data

## Common Patterns

### Pattern 1: Metadata in Two-Column Layout

```
A          B
Label      Value
-----------------
Auftrag:   12345
Anlage:    Plant A
```

Configuration:
```javascript
export const METADATA_CELL_CONFIG = {
    auftragsNr: ['B5', 'B6', 'B7'],  // Value column
    anlage: ['B8', 'B9', 'B10'],
    // ...
};
```

### Pattern 2: Metadata Scattered Across Sheet

```
Top-left: Anlage
Top-right: Auftrag, Einsatzort
Middle: Firma
```

Configuration:
```javascript
export const METADATA_CELL_CONFIG = {
    anlage: ['A10', 'B10'],           // Top-left
    auftragsNr: ['N5', 'O5', 'P5'],   // Top-right
    einsatzort: ['T10', 'U10'],       // Top-right
    firma: ['J20', 'K20'],            // Middle
    // ...
};
```

### Pattern 3: Positions with Multiple Quantity Columns

Some rows have quantities in column X, others in column Y:

```javascript
export const POSITION_CONFIG = {
    quantityColumns: ['X', 'Y', 'Z'],  // Try all three
    // ...
};
```

The parser will use the first non-empty column for each row.

## Troubleshooting Tips

### Issue: "Fehlende Pflichtfelder: auftragsNr"

**Solution:**
1. Open your Excel file
2. Find where the order number actually is
3. Add that cell to the beginning of the fallback array:
   ```javascript
   auftragsNr: ['YOUR_CELL', 'N5', 'M5'],
   ```

### Issue: No positions extracted

**Solution:**
1. Check which column has quantities
2. Update `quantityColumns`:
   ```javascript
   quantityColumns: ['YOUR_COLUMN', 'X', 'B'],
   ```

### Issue: Wrong sheet name

**Solution:**
```javascript
export const PARSING_CONFIG = {
    protokollSheetName: 'YOUR_SHEET_NAME',
    // ...
};
```

## Best Practices

1. **Always add fallbacks**: Don't remove default cells, add yours first
2. **Test incrementally**: Change one setting at a time
3. **Use console logs**: Check `_foundCells` to verify
4. **Document changes**: Add comments explaining why you changed cells
5. **Keep backups**: Save original config before major changes
