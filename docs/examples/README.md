# Configuration Examples

This folder contains practical examples and test files for the flexible Excel parsing configuration.

## Files

### 📖 Documentation

- **custom-cell-mapping.md** - 8 practical examples showing how to customize cell mappings for different Excel layouts
- **cell-mapping-visual-guide.md** - Visual guide with Excel grid diagrams showing cell references and common variations

### 🧪 Testing

- **test-flexible-parsing.html** - Interactive test page to verify configuration and test file imports

## Quick Start

### 1. Read the Visual Guide

Start with `cell-mapping-visual-guide.md` to understand:
- How Excel cell references work (A1, B5, N5, etc.)
- Default Protokoll layout
- Common variations
- How to find your cell locations

### 2. Try the Examples

Open `custom-cell-mapping.md` for:
- Simple cell location changes
- Quantity column adjustments
- Different sheet names
- Complete custom templates
- Runtime configuration
- Debugging techniques

### 3. Test Your Configuration

Open `test-flexible-parsing.html` in your browser to:
- Verify configuration loads correctly
- Test runtime updates
- Check fallback chains
- Upload and parse actual Protokoll files
- See which cells were used

## Common Use Cases

### Use Case 1: Order Number in Different Cell

Your Protokoll has order number in `O5` instead of `N5`:

```javascript
// In js/config.js
export const METADATA_CELL_CONFIG = {
    auftragsNr: ['O5', 'N5', 'M5'],  // Try O5 first
    // ... rest unchanged
};
```

### Use Case 2: Quantities in Column Y

Your quantities are in column `Y` instead of `X`:

```javascript
// In js/config.js
export const POSITION_CONFIG = {
    quantityColumns: ['Y', 'X', 'B'],  // Try Y first
    // ... rest unchanged
};
```

### Use Case 3: Different Row Range

Your positions are in rows 20-200:

```javascript
// In js/config.js
export const POSITION_CONFIG = {
    startRow: 20,
    endRow: 200,
    // ... rest unchanged
};
```

## Testing Workflow

1. **Identify your layout**
   - Open your Protokoll in Excel
   - Note cell locations for each metadata field
   - Note position data column and row range

2. **Update configuration**
   - Edit `js/config.js`
   - Add your cells to the beginning of fallback arrays
   - Save the file

3. **Test with test page**
   - Open `test-flexible-parsing.html`
   - Run configuration tests
   - Upload your Protokoll file
   - Check which cells were found

4. **Verify in application**
   - Open main application
   - Import your Protokoll
   - Check browser console for "Metadata gefunden in Zellen"
   - Verify imported data is correct

## Debugging Tips

### Check Console Logs

After importing, look for:
```
Metadata gefunden in Zellen: { auftragsNr: 'N5', anlage: 'A10', ... }
```

This shows exactly which cells were used.

### Check Found Cells

```javascript
const result = await safeReadAndParseProtokoll(file);
console.log(result.metadata._foundCells);
```

### Enable Pattern Search

If strict mode is causing issues:

```javascript
// In js/config.js
export const PARSING_CONFIG = {
    strictMode: false,  // Enable flexible pattern search
    // ...
};
```

## Need More Help?

- See `docs/CONFIGURATION.md` for complete documentation
- Check `docs/TROUBLESHOOTING.md` for common issues
- Review `docs/implemented/3_5-flexible-excel-parsing.md` for technical details

## Contributing Examples

If you have a unique Excel layout that required custom configuration:
1. Document your cell mappings
2. Add an example to `custom-cell-mapping.md`
3. Include screenshots if helpful
4. Share your configuration snippet
