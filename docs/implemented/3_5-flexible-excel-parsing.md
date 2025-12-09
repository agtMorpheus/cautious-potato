# Task 3.5: Flexible Excel Parsing Configuration

**Date:** 2024-12-09 | **Session:** flexible-cell-mapping

## Overview

Enhanced the Excel parsing system to support flexible cell mapping and pattern-based metadata search with an interactive pre-import dialog. The previous implementation had hardcoded cell references (e.g., U3, N5, A10) which made it inflexible when Protokoll files had different layouts.

## Problem Solved

Users reported issues when their Protokoll Excel files had metadata in different cell locations than the hardcoded defaults. The rigid cell mapping caused import failures with "Fehlende Pflichtfelder" errors even when the data existed in the file.

## Solution Implemented

### 1. Configuration-Based Cell Mapping
- Created centralized `js/config.js` with all parsing settings
- Each metadata field now has multiple fallback cell locations
- Parser tries each location in order until a value is found

### 2. Pattern-Based Search
- Added intelligent search that looks for label patterns (e.g., "Auftrags-Nr:")
- When found, checks adjacent cells for the actual value
- Helps handle varying template layouts automatically

### 3. Runtime Configuration API
- Functions to update cell mappings without editing files
- Get/set/reset configuration at runtime
- Useful for handling multiple Protokoll formats

## Files Created

- `js/config.js` - Centralized configuration module
- `js/cell-mapper.js` - Interactive cell mapping dialog
- `css/cell-mapper.css` - Cell mapper dialog styles
- `docs/CONFIGURATION.md` - Complete configuration guide
- `docs/examples/custom-cell-mapping.md` - Practical examples
- `docs/examples/cell-mapping-visual-guide.md` - Visual Excel grid guide
- `docs/examples/test-flexible-parsing.html` - Interactive test page
- `docs/examples/README.md` - Examples overview
- `docs/implemented/3_5-flexible-excel-parsing.md` - This summary

## Files Modified

- `js/utils.js` - Updated all parsing functions to use configuration
  - `parseProtokollMetadata()` - Now accepts options, uses fallbacks and pattern search
  - `extractPositions()` - Uses configured columns and row ranges
  - `fillAbrechnungHeader()` - Uses configured cell locations
  - `fillAbrechnungPositions()` - Uses configured ranges
  - `validateFilledPositions()` - Uses configured ranges
  - Added `searchMetadataByPattern()` helper function
  - Added `updateMetadataCellMap()`, `getMetadataCellMap()`, `resetMetadataCellMap()` API functions

- `js/handlers.js` - Enhanced import handler with cell mapper dialog
  - `handleImportFile()` - Now shows cell mapper dialog before parsing
  - Imports and uses `showCellMapperDialog()` and `applyMapping()`

- `index.html` - Added cell-mapper.css stylesheet link

## Key Features

### Interactive Cell Mapper Dialog

**Pre-Import Verification:**
- Shows dialog before importing with all detected cell values
- User can see what value is in each configured cell
- Dropdown selects show cell address and preview of value
- Required fields are highlighted
- Real-time preview updates as user changes selections
- Validates required fields before allowing import

**User Experience:**
- Clean, modern dialog with overlay
- Keyboard navigation support (Tab, Escape)
- Mobile-responsive design
- Clear visual feedback for required fields
- Error messages if required fields missing
- Cancel option to abort import

### Configuration Objects

1. **METADATA_CELL_CONFIG**: Where to find metadata fields
   - Each field has array of fallback cells
   - Example: `auftragsNr: ['N5', 'M5', 'O5', 'N4', 'N6']`

2. **POSITION_CONFIG**: Position data extraction settings
   - Column for position numbers
   - Multiple quantity column fallbacks
   - Row range to scan
   - Position number validation pattern

3. **ABRECHNUNG_CONFIG**: Output template settings
   - Sheet name
   - Header cell locations
   - Position data area configuration

4. **PARSING_CONFIG**: Behavior settings
   - Strict mode toggle
   - Pattern search range
   - Sheet name to look for
   - Minimum positions required

### Flexible Parsing Strategies

**Strategy 1: Fallback Chain**
```javascript
auftragsNr: ['N5', 'M5', 'O5']  // Tries N5, then M5, then O5
```

**Strategy 2: Pattern Search** (when strictMode: false)
- Searches for label patterns in configured range
- Checks adjacent cells for values
- Handles varying layouts automatically

**Strategy 3: Runtime Updates**
```javascript
updateMetadataCellMap('auftragsNr', ['P5', 'O5', 'N5']);
```

### Debugging Support

- Returns `_foundCells` in metadata showing where values were found
- Console logs indicate which cells were used
- Detailed error messages with expected cell locations

## Usage Examples

### Basic: Update Cell Location
```javascript
// In js/config.js
export const METADATA_CELL_CONFIG = {
    auftragsNr: ['O5', 'N5'],  // Try O5 first
    // ...
};
```

### Advanced: Runtime Configuration
```javascript
import { updateMetadataCellMap } from './js/utils.js';
updateMetadataCellMap('auftragsNr', ['P5', 'O5']);
```

### Debugging: Check Found Cells
```javascript
const result = await safeReadAndParseProtokoll(file);
console.log(result.metadata._foundCells);
// { auftragsNr: 'N5', anlage: 'A10', ... }
```

## Backward Compatibility

- Default configuration matches original hardcoded values
- Existing code works without changes
- Optional parameters maintain original behavior
- Pattern search is opt-in (can be disabled with strictMode: true)

## Testing Recommendations

1. Test with original Protokoll format (should work unchanged)
2. Test with modified cell locations
3. Test pattern search with varying layouts
4. Test runtime configuration updates
5. Verify error messages are helpful

## Performance Impact

- Minimal: Fallback checking is fast (tries 3-5 cells per field)
- Pattern search only runs if fallbacks fail and strictMode is false
- Configuration is loaded once at module import
- No impact on position extraction (same algorithm, just configurable)

## Documentation

- **CONFIGURATION.md**: Complete guide with all settings explained
- **custom-cell-mapping.md**: 8 practical examples
- **TROUBLESHOOTING.md**: Should be updated with new error scenarios (future task)

## Future Enhancements

1. Visual cell mapper tool in UI
2. Auto-detect cell locations from sample file
3. Save/load configuration profiles
4. Template validation tool
5. Cell location hints in error messages

## Notes

- Configuration uses ES6 module exports for clean imports
- Mutable METADATA_CELL_MAP allows runtime updates
- Pattern search uses regex for flexible label matching
- All original functionality preserved with enhanced flexibility
- No breaking changes to existing API
