# Abrechnung Application - API Documentation

## Overview

This document provides comprehensive API documentation for all modules in the Abrechnung Application. Each function includes parameters, return values, error conditions, and usage examples.

---

## State Module (`js/state.js`)

### Core Functions

#### `getState() → Object`

Returns the current application state as a defensive copy.

**Returns:** Complete state object (new instance each call)

**Performance:** O(1) with structured cloning for safety

**Example:**
```javascript
const state = getState();
console.log(state.protokollData.metadata.orderNumber);

// Modifying returned state does not affect internal state
state.protokollData.metadata.orderNumber = 'MODIFIED';
const state2 = getState();
console.log(state2.protokollData.metadata.orderNumber); // Original value
```

---

#### `setState(updates: Object, options?: Object) → void`

Update state with new values using deep merge strategy.

**Parameters:**
- `updates` (Object): Partial state to merge with current state
- `options.persist` (boolean, default: true): Save to localStorage
- `options.silent` (boolean, default: false): Don't trigger listeners

**Triggers:** `stateChanged` event to all subscribers (unless silent)

**Side Effects:** 
- Updates `meta.lastUpdated` timestamp
- Persists to localStorage (unless persist: false)

**Example:**
```javascript
// Basic update with persistence and listeners
setState({
  ui: { 
    import: { 
      status: 'success', 
      message: 'File imported successfully',
      fileName: 'protokoll.xlsx',
      fileSize: 1024000,
      importedAt: new Date().toISOString()
    } 
  }
});

// Update without persistence
setState({
  protokollData: { metadata: { orderNumber: 'ORD-001' } }
}, { persist: false });

// Silent update (no listeners triggered)
setState({
  ui: { import: { status: 'pending' } }
}, { silent: true });
```

---

#### `subscribe(listener: Function) → Function`

Register a callback to be called whenever state changes.

**Parameters:**
- `listener(state: Object)`: Function called with updated state

**Returns:** Unsubscribe function

**Performance:** O(1) registration, O(n) notification where n = number of listeners

**Example:**
```javascript
// Register listener
const unsubscribe = subscribe((state) => {
  console.log('State changed:', state.ui.import.status);
  updateImportUI(state);
});

// Later, stop listening
unsubscribe();

// Multiple listeners
const unsubscribe1 = subscribe(updateImportUI);
const unsubscribe2 = subscribe(updateGenerateUI);
const unsubscribe3 = subscribe(updateExportUI);
```

---

#### `resetState(options?: Object) → void`

Clear all state back to initial values.

**Parameters:**
- `options.persist` (boolean, default: true): Also clear localStorage
- `options.silent` (boolean, default: false): Don't trigger listeners

**Side Effects:**
- Resets all state properties to initial values
- Clears localStorage if persist: true
- Triggers listeners unless silent: true

**Example:**
```javascript
// Full reset with localStorage clearing
resetState({ persist: true });

// Reset state only (keep localStorage)
resetState({ persist: false });

// Silent reset (no UI updates)
resetState({ persist: true, silent: true });
```

---

#### `loadStateFromStorage() → Object`

Manually load persisted state from localStorage.

**Returns:** Parsed state object or `{}` if not found/invalid

**Error Handling:** Returns empty object on JSON parse errors

**Note:** Automatically called during app initialization

**Example:**
```javascript
// Manual state loading (usually not needed)
const persistedState = loadStateFromStorage();
if (Object.keys(persistedState).length > 0) {
  setState(persistedState, { persist: false });
}
```

---

#### `clearPersistedState() → void`

Remove persisted state from localStorage.

**Side Effects:** Removes `abrechnungAppState_v1` key from localStorage

**Example:**
```javascript
// Clear persisted data without affecting current state
clearPersistedState();
```

---

### State Schema Reference

```javascript
// Complete state structure
{
  protokollData: {
    metadata: {
      protocolNumber: string,      // From cell U3
      orderNumber: string,         // From cell N5
      plant: string,               // From cell A10
      location: string,            // From cell T10
      company: string,             // From cell T7
      date: string                 // ISO 8601 format
    },
    positionen: [
      {
        posNr: string,             // Position number (e.g., "01.01.0010")
        menge: number,             // Quantity
        rowIndex: number           // Excel row number (30-325)
      }
    ]
  },
  
  abrechnungData: {
    header: {
      // Copy of protokollData.metadata
    },
    positionen: {
      [posNr]: totalMenge          // Aggregated quantities
    }
  },
  
  ui: {
    import: {
      status: 'idle' | 'pending' | 'success' | 'error',
      message: string,
      fileName: string,
      fileSize: number,
      importedAt: string | null    // ISO 8601 timestamp
    },
    generate: {
      status: 'idle' | 'pending' | 'success' | 'error',
      message: string,
      positionCount: number,
      uniquePositionCount: number,
      generationTimeMs: number
    },
    export: {
      status: 'idle' | 'pending' | 'success' | 'error',
      message: string,
      lastExportAt: string | null, // ISO 8601 timestamp
      lastExportSize: number
    }
  },
  
  meta: {
    version: string,               // Application version
    lastUpdated: number            // Timestamp of last state change
  }
}
```

---

## Utilities Module (`js/utils.js`)

### Excel Reading Functions

#### `readExcelFile(file: File) → Promise<Object>`

Read an Excel file and return workbook object with metadata.

**Parameters:**
- `file` (File): File from input element or drag-drop

**Returns:** Promise resolving to:
```javascript
{
  workbook: Object,              // SheetJS workbook object
  metadata: {
    fileName: string,
    fileSize: number,
    readAt: string               // ISO 8601 timestamp
  }
}
```

**Throws:** 
- Error if file is not .xlsx format
- Error if file is too large (>50MB)
- Error if file cannot be read

**Example:**
```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

try {
  const { workbook, metadata } = await readExcelFile(file);
  console.log(`Read ${metadata.fileName} (${metadata.fileSize} bytes)`);
  console.log('Sheets:', workbook.SheetNames);
} catch (error) {
  console.error('Failed to read file:', error.message);
}
```

---

#### `parseProtokoll(workbook: Object) → Object`

Extract metadata from protokoll worksheet.

**Parameters:**
- `workbook` (Object): SheetJS workbook object

**Returns:** Metadata object:
```javascript
{
  protocolNumber: string,        // From cell U3
  orderNumber: string,           // From cell N5
  plant: string,                 // From cell A10
  location: string,              // From cell T10
  company: string,               // From cell T7
  date: string                   // Current date in ISO format
}
```

**Throws:** 
- Error if workbook is invalid
- Error if required cells are missing or empty

**Cell Mapping:**
- Protokoll-Nr. → U3
- Auftrags-Nr. → N5
- Anlage → A10
- Einsatzort → T10
- Firma → T7

**Example:**
```javascript
try {
  const metadata = parseProtokoll(workbook);
  console.log(`Order: ${metadata.orderNumber}`);
  console.log(`Plant: ${metadata.plant}`);
} catch (error) {
  console.error('Failed to parse metadata:', error.message);
}
```

---

#### `extractPositions(workbook: Object) → Array`

Extract position data from protokoll worksheet.

**Parameters:**
- `workbook` (Object): SheetJS workbook object

**Returns:** Array of position objects:
```javascript
[
  {
    posNr: string,               // Position number from column A
    menge: number,               // Quantity from column B
    rowIndex: number             // Excel row number (30-325)
  }
]
```

**Range:** Processes rows 30-325 (296 possible positions)

**Filtering:** Skips rows with empty position numbers or invalid quantities

**Example:**
```javascript
const positions = extractPositions(workbook);
console.log(`Extracted ${positions.length} positions`);

positions.forEach(pos => {
  console.log(`${pos.posNr}: ${pos.menge} (row ${pos.rowIndex})`);
});
```

---

#### `validateExtractedPositions(positions: Array) → Object`

Validate extracted position data for common issues.

**Parameters:**
- `positions` (Array): Position array from extractPositions

**Returns:** Validation result:
```javascript
{
  valid: boolean,                // Overall validation status
  errors: Array<string>,         // Critical errors (prevent processing)
  warnings: Array<string>        // Non-critical warnings
}
```

**Validation Rules:**
- **Errors:** Missing posNr, missing menge, negative quantities, invalid types
- **Warnings:** Duplicate position numbers, invalid position format, zero quantities

**Example:**
```javascript
const positions = extractPositions(workbook);
const validation = validateExtractedPositions(positions);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

---

### Data Processing Functions

#### `sumByPosition(positions: Array) → Object`

Aggregate quantities by position number.

**Parameters:**
- `positions` (Array): Position array with posNr and menge properties

**Returns:** Position map: `{ [posNr]: totalMenge }`

**Performance:** O(n) where n is number of positions

**Throws:**
- Error if positions is not an array
- Error if position objects are invalid
- Error if quantities are not numeric

**Example:**
```javascript
const positions = [
  { posNr: '01.01.0010', menge: 5 },
  { posNr: '01.01.0020', menge: 3 },
  { posNr: '01.01.0010', menge: 2 }  // Duplicate position
];

const sums = sumByPosition(positions);
console.log(sums);
// Output: { '01.01.0010': 7, '01.01.0020': 3 }
```

---

#### `getPositionSummary(positionMap: Object) → Object`

Compute statistics on aggregated position data.

**Parameters:**
- `positionMap` (Object): Position map from sumByPosition

**Returns:** Summary statistics:
```javascript
{
  totalQuantity: number,         // Sum of all quantities
  uniquePositions: number,       // Number of unique positions
  minQuantity: number,           // Smallest quantity
  maxQuantity: number,           // Largest quantity
  averageQuantity: number        // Average quantity per position
}
```

**Example:**
```javascript
const positionMap = { '01.01.0010': 5, '01.01.0020': 3, '01.01.0030': 8 };
const summary = getPositionSummary(positionMap);

console.log(`Total: ${summary.totalQuantity}`);           // 16
console.log(`Positions: ${summary.uniquePositions}`);     // 3
console.log(`Range: ${summary.minQuantity}-${summary.maxQuantity}`); // 3-8
console.log(`Average: ${summary.averageQuantity}`);       // 5.33
```

---

### Excel Writing Functions

#### `loadAbrechnungTemplate() → Promise<Object>`

Load and cache the abrechnung template workbook.

**Returns:** Promise resolving to SheetJS workbook object

**Caching:** Template is cached after first load for performance

**Throws:** Error if template file cannot be loaded

**Example:**
```javascript
try {
  const template = await loadAbrechnungTemplate();
  console.log('Template sheets:', template.SheetNames);
} catch (error) {
  console.error('Failed to load template:', error.message);
}
```

---

#### `fillAbrechnungHeader(workbook: Object, metadata: Object) → Object`

Populate header section of abrechnung template.

**Parameters:**
- `workbook` (Object): Template workbook
- `metadata` (Object): Metadata from parseProtokoll

**Returns:** Updated workbook with header data

**Cell Mapping:**
- Date → B1
- Order Number → B2
- Plant → B3
- Location → B4

**Throws:** Error if workbook or metadata is invalid

**Example:**
```javascript
const template = await loadAbrechnungTemplate();
const metadata = parseProtokoll(protokollWorkbook);

const updatedWorkbook = fillAbrechnungHeader(template, metadata);
```

---

#### `fillAbrechnungPositions(workbook: Object, positionSums: Object) → Object`

Populate position rows with aggregated quantities.

**Parameters:**
- `workbook` (Object): Template workbook with header filled
- `positionSums` (Object): Position map from sumByPosition

**Returns:** Updated workbook with position data

**Range:** Fills positions starting from row 10 in EAW sheet

**Example:**
```javascript
const positionSums = sumByPosition(positions);
const updatedWorkbook = fillAbrechnungPositions(workbook, positionSums);
```

---

#### `createExportWorkbook(abrechnungData: Object) → Promise<Object>`

Create complete export-ready workbook.

**Parameters:**
- `abrechnungData.header` (Object): Metadata
- `abrechnungData.positionen` (Object): Position sums

**Returns:** Promise resolving to complete workbook

**Process:**
1. Load template
2. Fill header data
3. Fill position data
4. Return complete workbook

**Example:**
```javascript
const abrechnungData = {
  header: metadata,
  positionen: positionSums
};

try {
  const workbook = await createExportWorkbook(abrechnungData);
  console.log('Export workbook ready');
} catch (error) {
  console.error('Failed to create workbook:', error.message);
}
```

---

#### `exportToExcel(workbook: Object, metadata: Object) → Object`

Trigger browser download of workbook.

**Parameters:**
- `workbook` (Object): Complete workbook to export
- `metadata` (Object): For filename generation

**Returns:** Export result:
```javascript
{
  fileName: string,              // Generated filename
  timestamp: string,             // ISO 8601 timestamp
  fileSize: number,              // Estimated file size
  success: boolean               // Export success status
}
```

**Side Effect:** Downloads file to user's browser

**Filename Format:** `Abrechnung_[OrderNumber]_[Date].xlsx`

**Example:**
```javascript
try {
  const result = exportToExcel(workbook, metadata);
  console.log(`Exported ${result.fileName} (${result.fileSize} bytes)`);
} catch (error) {
  console.error('Export failed:', error.message);
}
```

---

#### `generateAbrechnungFilename(metadata: Object) → string`

Generate descriptive filename for abrechnung export.

**Parameters:**
- `metadata` (Object): Metadata with orderNumber and date

**Returns:** Sanitized filename string

**Format:** `Abrechnung_[OrderNumber]_[Date].xlsx`

**Sanitization:** Removes invalid filename characters

**Example:**
```javascript
const metadata = { orderNumber: 'ORD-001', date: '2025-12-11' };
const filename = generateAbrechnungFilename(metadata);
// Returns: "Abrechnung_ORD-001_2025-12-11.xlsx"
```

---

## Handlers Module (`js/handlers.js`)

### Event Handlers

#### `handleImportFile(event: Event) → Promise<void>`

Process file input and import protokoll data.

**Parameters:**
- `event` (Event): File input change event

**Process:**
1. Validate file selection
2. Read and parse Excel file
3. Extract metadata and positions
4. Validate extracted data
5. Update state with results

**State Updates:**
- Sets `ui.import.status` to 'pending' → 'success'/'error'
- Updates `protokollData` with imported data

**Error Handling:** Shows user-friendly error messages

**Example:**
```javascript
// Bind to file input
document.getElementById('file-input').addEventListener('change', handleImportFile);

// Manual call (for testing)
const mockEvent = { target: { files: [file] } };
await handleImportFile(mockEvent);
```

---

#### `handleGenerateAbrechnung() → Promise<void>`

Generate abrechnung from imported protokoll data.

**Preconditions:** 
- `protokollData.metadata` must exist
- `protokollData.positionen` must contain valid positions

**Process:**
1. Validate preconditions
2. Aggregate positions by position number
3. Load abrechnung template
4. Fill template with data
5. Cache workbook for export

**State Updates:**
- Sets `ui.generate.status` to 'pending' → 'success'/'error'
- Updates `abrechnungData` with aggregated data
- Caches workbook in `window._currentWorkbook`

**Example:**
```javascript
// Bind to generate button
document.getElementById('generate-button').addEventListener('click', handleGenerateAbrechnung);

// Check preconditions
const state = getState();
if (state.protokollData.positionen.length > 0) {
  await handleGenerateAbrechnung();
}
```

---

#### `handleExportAbrechnung() → Promise<void>`

Export abrechnung workbook to file.

**Preconditions:** 
- `abrechnungData` must exist
- `window._currentWorkbook` must be cached

**Process:**
1. Validate preconditions
2. Generate filename from metadata
3. Export workbook to browser download
4. Update export statistics

**State Updates:**
- Sets `ui.export.status` to 'pending' → 'success'/'error'
- Updates export timestamp and file size

**Example:**
```javascript
// Bind to export button
document.getElementById('export-button').addEventListener('click', handleExportAbrechnung);

// Check if export is ready
const state = getState();
if (state.abrechnungData.positionen && window._currentWorkbook) {
  await handleExportAbrechnung();
}
```

---

#### `handleResetApplication() → Promise<void>`

Clear all application data and reset to initial state.

**Process:**
1. Show confirmation dialog
2. Clear application state
3. Clear localStorage
4. Reset file input
5. Clear cached workbook
6. Update UI to initial state

**Confirmation:** Requires user confirmation before proceeding

**State Updates:** Resets all state to initial values

**Example:**
```javascript
// Bind to reset button
document.getElementById('reset-button').addEventListener('click', handleResetApplication);

// Programmatic reset (skips confirmation)
await handleResetApplication();
```

---

### UI Update Functions

#### `updateImportUI(state: Object) → void`

Update import section UI based on current state.

**Parameters:**
- `state` (Object): Current application state

**Updates:**
- Status indicator and message
- File information display
- Import summary (positions count)
- Button enabled/disabled states

**Example:**
```javascript
// Called automatically via state subscription
subscribe(updateImportUI);

// Manual call
const state = getState();
updateImportUI(state);
```

---

#### `updateGenerateUI(state: Object) → void`

Update generate section UI based on current state.

**Parameters:**
- `state` (Object): Current application state

**Updates:**
- Generate button state
- Position count display
- Generation time display
- Status messages

---

#### `updateExportUI(state: Object) → void`

Update export section UI based on current state.

**Parameters:**
- `state` (Object): Current application state

**Updates:**
- Export button state
- Last export information
- File size display
- Download status

---

### Alert Functions

#### `showErrorAlert(title: string, message: string) → void`

Display error alert to user with auto-dismiss.

**Parameters:**
- `title` (string): Alert title
- `message` (string): Alert message

**Features:**
- Auto-dismisses after 8 seconds
- Has close button for manual dismiss
- Escapes HTML to prevent XSS
- Logs to console for debugging

**Example:**
```javascript
showErrorAlert('Import Failed', 'File must be in .xlsx format');
showErrorAlert('Network Error', 'Could not load template file');
```

---

#### `showSuccessAlert(title: string, message: string) → void`

Display success alert to user.

**Parameters:**
- `title` (string): Alert title
- `message` (string): Alert message

**Features:** Similar to error alerts but with success styling

---

#### `clearErrorAlerts() → void`

Remove all alert elements from DOM.

**Use Case:** Clear alerts before showing new ones

---

## Main Module (`js/main.js`)

### Bootstrap Functions

#### `initializeApp() → Promise<void>`

Bootstrap the application on DOM ready.

**Process:**
1. Load persisted state from localStorage
2. Initialize static UI elements
3. Bind event listeners to DOM elements
4. Subscribe to state changes for reactive updates
5. Perform initial render based on current state

**Called:** Automatically when DOM is ready

**Example:**
```javascript
// Automatic initialization
document.addEventListener('DOMContentLoaded', initializeApp);

// Manual initialization (for testing)
await initializeApp();
```

---

#### `destroyApp() → void`

Cleanup application for testing or hot-reload.

**Process:**
1. Unsubscribe all state listeners
2. Remove event listeners
3. Clear cached data
4. Reset DOM to initial state

**Use Case:** Testing cleanup, hot-reload scenarios

---

## Phase 4: Enhanced Accessibility & Dark Mode (`js/phase4-accessibility.js`)

### Accessibility Manager

#### `AccessibilityManager.announce(message: string, priority?: string) → void`

Make screen reader announcements.

**Parameters:**
- `message` (string): Message to announce
- `priority` ('polite' | 'assertive', default: 'polite'): Announcement priority

**Example:**
```javascript
AccessibilityManager.announce('File imported successfully', 'polite');
AccessibilityManager.announce('Error occurred', 'assertive');
```

---

#### `AccessibilityManager.updateButtonLoadingState(button: Element, loading: boolean, message?: string) → void`

Update button loading state with accessibility support.

**Parameters:**
- `button` (Element): Button element
- `loading` (boolean): Loading state
- `message` (string, optional): Loading message

**Example:**
```javascript
const button = document.getElementById('import-button');
AccessibilityManager.updateButtonLoadingState(button, true, 'Importing file...');
```

---

### Enhanced Dark Mode Manager

#### `EnhancedDarkModeManager.applyTheme(theme: string) → void`

Apply theme with accessibility announcements.

**Parameters:**
- `theme` ('light' | 'dark' | 'auto'): Theme to apply

**Example:**
```javascript
EnhancedDarkModeManager.applyTheme('dark');
EnhancedDarkModeManager.applyTheme('auto'); // Follow system preference
```

---

#### `EnhancedDarkModeManager.getThemeInfo() → Object`

Get current theme information.

**Returns:**
```javascript
{
  userPreference: string,        // User's chosen theme
  effectiveTheme: string,        // Currently applied theme
  systemPreference: string,      // System's preferred theme
  isAuto: boolean               // Whether auto mode is active
}
```

---

## Error Handling Patterns

### Standard Error Response

All async functions follow this error handling pattern:

```javascript
try {
  // Set pending status
  setState({ ui: { [section]: { status: 'pending' } } });
  
  // Perform operation
  const result = await someOperation();
  
  // Set success status
  setState({ 
    ui: { [section]: { status: 'success', message: 'Operation completed' } },
    // ... result data
  });
} catch (error) {
  // Set error status
  setState({ 
    ui: { [section]: { status: 'error', message: error.message } }
  });
  
  // Show user alert
  showErrorAlert('Operation Failed', error.message);
  
  // Log for debugging
  console.error('Operation failed:', error);
}
```

### Error Types

1. **ValidationError:** User input validation failures
2. **FileError:** File reading/writing failures  
3. **NetworkError:** Template loading failures
4. **ProcessingError:** Data processing failures

---

## Performance Guidelines

### Function Performance Targets

- **State operations:** < 10ms
- **File reading:** < 2s for 1000-row files
- **Position aggregation:** < 1s for 10,000 positions
- **UI updates:** < 16ms (60 FPS)

### Memory Management

- Use defensive copying for state
- Clear large objects after processing
- Avoid memory leaks in event listeners
- Monitor memory usage in DevTools

---

## Testing API

### Test Utilities

```javascript
// State testing
const testState = { protokollData: { metadata: { orderNumber: 'TEST' } } };
setState(testState, { persist: false, silent: true });

// Mock file creation
const mockFile = new File(['content'], 'test.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});

// Event simulation
const mockEvent = { target: { files: [mockFile] } };
await handleImportFile(mockEvent);
```

---

**Last Updated:** December 11, 2025  
**Version:** 2.0 - Phase 6 API Documentation  
**Coverage:** All public APIs with examples and error handling