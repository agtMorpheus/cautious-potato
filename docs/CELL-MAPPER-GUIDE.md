# Cell Mapper Dialog - User Guide

## What is the Cell Mapper?

The Cell Mapper is an interactive dialog that appears when you import a Protokoll Excel file. It helps you verify and adjust which cells contain your metadata fields, making the import process more flexible and reliable.

## When Does It Appear?

The Cell Mapper dialog automatically appears:
1. After you select a Protokoll file
2. Click the "Import" button
3. The file is read successfully

## How It Works

### Step 1: Automatic Detection

The system automatically:
- Reads your Excel file
- Checks all configured cell locations
- Finds the first non-empty cell for each field
- Pre-selects the best match

### Step 2: Review and Adjust

The dialog shows you:
- **Field Name**: What data we're looking for (e.g., "Auftrags-Nr.")
- **Cell Dropdown**: All possible cell locations with their values
- **Preview**: The actual value from the selected cell

**Required fields** are marked with a red asterisk (*):
- Auftrags-Nr. (Order Number)
- Anlage (Plant/Facility)

### Step 3: Make Changes (If Needed)

If the automatic selection is wrong:
1. Click the dropdown for that field
2. See all available cells with their values
3. Select the cell that has the correct value
4. The preview updates immediately

### Step 4: Confirm or Cancel

- **"Zuordnung übernehmen"** (Apply Mapping): Proceed with import using your selections
- **"Abbrechen"** (Cancel): Cancel the import and return to the main screen

## Example Scenario

### Scenario: Order Number in Wrong Cell

**What you see:**
```
Auftrags-Nr. *
[Dropdown: N5: (leer)]
[Preview: ]
```

**What to do:**
1. Click the dropdown
2. See options:
   - N5: (leer)
   - M5: (leer)
   - O5: 12345 ← This looks right!
3. Select "O5: 12345"
4. Preview updates to show "12345"
5. Click "Zuordnung übernehmen"

## Understanding the Dropdown Options

Each dropdown option shows:
```
[Cell Address]: [Value Preview]
```

Examples:
- `N5: 12345` - Cell N5 contains "12345"
- `A10: Plant A` - Cell A10 contains "Plant A"
- `T7: (leer)` - Cell T7 is empty

## Tips for Success

### ✅ Do This:
- **Check required fields first** - Make sure Auftrags-Nr. and Anlage have values
- **Look for familiar values** - You know what your order numbers look like
- **Use the preview** - It shows exactly what will be imported
- **Take your time** - The dialog waits for you

### ❌ Avoid This:
- **Don't select empty cells** - Choose cells with actual values
- **Don't rush** - Verify each field is correct
- **Don't ignore warnings** - Red asterisks mean required fields

## Common Issues

### Issue: "Zuordnung unvollständig" Error

**Cause:** Required fields (Auftrags-Nr. or Anlage) are not selected or are empty

**Solution:**
1. Check fields marked with *
2. Select a cell that has a value
3. Make sure the preview shows the correct data

### Issue: All Cells Show "(leer)"

**Cause:** The data might be in different cells than configured

**Solution:**
1. Cancel the import
2. Open your Excel file
3. Note which cells contain your data
4. Edit `js/config.js` to add those cells
5. Try importing again

### Issue: Wrong Value Selected

**Cause:** Automatic detection picked the wrong cell

**Solution:**
1. Click the dropdown for that field
2. Look through all options
3. Select the cell with the correct value
4. Verify in the preview

## Keyboard Shortcuts

- **Tab**: Move between dropdowns
- **Enter**: Open dropdown / Select option
- **Escape**: Cancel and close dialog
- **Arrow Keys**: Navigate dropdown options

## Visual Guide

### Dialog Layout

```
┌─────────────────────────────────────────────┐
│ Zellenzuordnung überprüfen                  │
│ Überprüfen Sie die automatisch erkannten... │
├─────────────────────────────────────────────┤
│                                             │
│ Protokoll-Nr.                               │
│ [U3: 2024-001 ▼]  [2024-001]               │
│                                             │
│ Auftrags-Nr. *                              │
│ [N5: 12345 ▼]     [12345]                  │
│                                             │
│ Anlage *                                    │
│ [A10: Plant A ▼]  [Plant A]                │
│                                             │
│ ... (more fields)                           │
│                                             │
│ ℹ️ Wählen Sie für jedes Feld die Zelle...  │
│                                             │
├─────────────────────────────────────────────┤
│                    [Abbrechen] [Übernehmen] │
└─────────────────────────────────────────────┘
```

### Field States

**Normal Field:**
```
┌─────────────────────────────────────────────┐
│ Firma                                       │
│ [T7: Company XYZ ▼]  [Company XYZ]         │
└─────────────────────────────────────────────┘
```

**Required Field (with value):**
```
┌─────────────────────────────────────────────┐
│ Auftrags-Nr. *                              │
│ [N5: 12345 ▼]     [12345]                  │
└─────────────────────────────────────────────┘
Yellow background indicates required field
```

**Required Field (empty - ERROR):**
```
┌─────────────────────────────────────────────┐
│ Anlage *                                    │
│ [-- Keine Zuordnung -- ▼]  []              │
└─────────────────────────────────────────────┘
Must select a cell with a value!
```

## Advanced Usage

### Saving Your Preferences

The cell mapper doesn't permanently save your choices. If you frequently use files with the same layout:

1. Note which cells you select
2. Edit `js/config.js`
3. Put your cells first in the fallback arrays
4. Next time, they'll be auto-selected

Example:
```javascript
// If you always use O5 for order number:
auftragsNr: ['O5', 'N5', 'M5'],  // O5 will be tried first
```

### Multiple File Formats

If you work with different Protokoll formats:
1. Use the cell mapper each time
2. It adapts to whatever cells have values
3. No need to change configuration files

## Need Help?

- **Configuration Guide**: See `docs/CONFIGURATION.md` for permanent settings
- **Visual Cell Guide**: See `docs/examples/cell-mapping-visual-guide.md`
- **Examples**: See `docs/examples/custom-cell-mapping.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`

## Feedback

The cell mapper is designed to make imports easier. If you have suggestions or encounter issues, please document them for the development team.
