# Abrechnung Application - API Documentation

## State Module (`js/state.js`)

### Core Functions

#### `getState() → Object`
Returns the current application state as a defensive copy.

**Returns**: Complete state object

**Example**:
```javascript
const state = getState();
console.log(state.protokollData.metadata.orderNumber);
```

---

#### `setState(updates: Object, options?: Object) → Object`
Update state with new values using shallow merge.

**Parameters**:
- `updates` (Object): Partial state to merge
- `options.silent` (boolean): Don't trigger listeners (default: false)

**Returns**: New state snapshot

**Triggers**: `stateChanged` event (unless silent)

**Example**:
```javascript
setState({
  ui: { 
    import: { status: 'success', message: 'File imported', fileName: 'test.xlsx', fileSize: 1024, importedAt: null }
  }
});
```

---

#### `resetState(options?: Object) → Object`
Clear all state back to initial values.

**Parameters**:
- `options.persist` (boolean): Also clear localStorage (default: true)
- `options.silent` (boolean): Don't trigger listeners (default: false)

**Returns**: Reset state snapshot

**Example**:
```javascript
resetState({ persist: true, silent: false });
```

---

#### `subscribe(listener: Function) → Function`
Register a callback to be called whenever state changes.

**Parameters**:
- `listener(state: Object)`: Function called with updated state

**Returns**: Unsubscribe function

**Example**:
```javascript
const unsubscribe = subscribe((state) => {
  console.log('State changed:', state);
});

// Later, to stop listening:
unsubscribe();
```

---

#### `loadStateFromStorage() → Object`
Load persisted state from localStorage.

**Returns**: Parsed state object or initial state if not found

**Note**: Automatically called during app initialization

---

#### `clearPersistedState() → void`
Remove persisted state from localStorage.

---

### Domain-Specific Helper Functions

#### `setImportStatus(partial: Object) → Object`
Update import UI status.

**Example**:
```javascript
setImportStatus({ status: 'success', message: 'File imported' });
```

---

#### `setGenerateStatus(partial: Object) → Object`
Update generate UI status.

**Example**:
```javascript
setGenerateStatus({ status: 'success', positionCount: 10 });
```

---

#### `setExportStatus(partial: Object) → Object`
Update export UI status.

**Example**:
```javascript
setExportStatus({ status: 'success', lastExportAt: '2025-12-09T12:00:00Z' });
```

---

#### `updateProtokollData({ metadata, positionen }: Object) → Object`
Update protokoll data with validation.

**Example**:
```javascript
updateProtokollData({
  metadata: { orderNumber: 'ORD-001', protocolNumber: 'PROT-001' },
  positionen: [{ posNr: '01.01.0010', menge: 5 }]
});
```

---

#### `updateAbrechnungPositions(positionMap: Object) → Object`
Update abrechnung positions.

**Example**:
```javascript
updateAbrechnungPositions({ '01.01.0010': 7, '01.01.0020': 3 });
```

---

#### `updateAbrechnungHeader(headerData: Object) → Object`
Update abrechnung header.

**Example**:
```javascript
updateAbrechnungHeader({ 
  date: '2025-12-09',
  orderNumber: 'ORD-001',
  plant: 'Factory A'
});
```

---

## Utilities Module (`js/utils.js`)

### Excel Reading Functions

#### `readExcelFile(file: File) → Promise<Object>`
Read an Excel file and return workbook object with metadata.

**Parameters**:
- `file` (File): File from input element

**Returns**: Promise resolving to `{ workbook, metadata: { fileName, fileSize, readAt } }`

**Throws**: Error if file is invalid or cannot be read

**Example**:
```javascript
const fileInput = document.querySelector('input[type="file"]');
const fileData = await readExcelFile(fileInput.files[0]);
console.log(fileData.workbook.SheetNames);
```

---

#### `parseProtokollMetadata(workbook: Object) → Object`
Extract metadata from protokoll worksheet.

**Parameters**:
- `workbook` (Object): SheetJS workbook object

**Returns**: 
```javascript
{ 
  protokollNr, 
  auftragsNr, 
  anlage, 
  einsatzort, 
  firma, 
  auftraggeber, 
  datum 
}
```

**Throws**: Error if required fields are missing or sheet not found

**Cell References**:
- Protokoll-Nr. → U3
- Auftrags-Nr. → N5
- Anlage → A10
- Einsatzort → T10
- Firma → T7
- Auftraggeber → A5

---

#### `extractPositions(workbook: Object) → Array`
Extract position data from protokoll.

**Parameters**:
- `workbook` (Object): SheetJS workbook object

**Returns**: Array of `{ posNr, menge, row }`

**Range**: Scans rows 30-325

**Quantity Columns**: Tries X, B, C in order

---

#### `sumByPosition(positionen: Array) → Object`
Aggregate quantities by position number.

**Parameters**:
- `positionen` (Array): Position array from extractPositions

**Returns**: `{ [posNr]: totalMenge }`

**Throws**: Error if input is invalid

**Example**:
```javascript
const positions = [
  { posNr: '01.01.0010', menge: 5 },
  { posNr: '01.01.0010', menge: 2 }
];
const sums = sumByPosition(positions);
// Result: { '01.01.0010': 7 }
```

---

#### `validateExtractedPositions(positions: Array) → Object`
Validate extracted position data.

**Returns**: `{ valid: boolean, errors: Array, warnings: Array }`

**Checks**:
- Duplicate position numbers (warning)
- Invalid position number format (warning)
- Negative quantities (error)
- Invalid objects (error)

---

#### `getPositionSummary(positionMap: Object) → Object`
Compute statistics on position sums.

**Returns**: `{ totalQuantity, uniquePositions, minQuantity, maxQuantity }`

---

### Excel Writing Functions

#### `loadAbrechnungTemplate() → Promise<Object>`
Load and cache the abrechnung template.

**Returns**: Promise resolving to workbook object

**Note**: Template is cached after first load for performance

**Throws**: Error if template cannot be loaded (404, network error, etc.)

---

#### `clearAbrechnungTemplateCache() → void`
Clear the cached template (useful for testing or when template changes).

---

#### `fillAbrechnungHeader(workbook: Object, metadata: Object) → Object`
Populate header section of abrechnung template.

**Parameters**:
- `workbook` (Object): Template workbook
- `metadata` (Object): Metadata from parseProtokollMetadata

**Returns**: Updated workbook

**Cell References**:
- B1: datum
- B2: auftragsNr
- B3: anlage
- B4: einsatzort

---

#### `fillAbrechnungPositions(workbook: Object, positionSums: Object) → Object`
Populate position rows with aggregated quantities.

**Parameters**:
- `workbook` (Object): Template workbook
- `positionSums` (Object): Position map from sumByPosition

**Returns**: Updated workbook

**Range**: Scans rows 9-500 for matching position numbers

---

#### `createExportWorkbook(abrechnungData: Object) → Promise<Object>`
Create complete export-ready workbook.

**Parameters**:
```javascript
{
  header: { datum, auftragsNr, anlage, einsatzort },
  positionen: { [posNr]: totalMenge }
}
```

**Returns**: Promise resolving to complete workbook

---

#### `exportToExcel(workbook: Object, fileName: string) → void`
Trigger browser download of workbook.

**Parameters**:
- `workbook` (Object): Workbook to export
- `fileName` (string): Filename for download

**Side Effect**: Downloads file to user's browser

---

### Utility Functions

#### `getCellValue(worksheet: Object, cellAddress: string) → any`
Get value from a worksheet cell.

**Example**:
```javascript
const value = getCellValue(worksheet, 'A10');
```

---

#### `setCellValue(worksheet: Object, cellAddress: string, value: any) → void`
Set value in a worksheet cell.

**Example**:
```javascript
setCellValue(worksheet, 'B1', '2025-12-09');
```

---

## Handlers Module (`js/handlers.js`)

### Event Handlers

#### `handleImportFile(event: Event) → Promise<void>`
Process file input and import protokoll data.

**Workflow**:
1. Read file using readExcelFile()
2. Parse metadata using parseProtokollMetadata()
3. Extract positions using extractPositions()
4. Validate positions
5. Update state with data
6. Update UI

**Error Handling**: Shows user-friendly error message, preserves state

---

#### `handleGenerateAbrechnung() → Promise<void>`
Generate abrechnung from imported data.

**Preconditions**: protokollData must exist in state

**Workflow**:
1. Validate protokollData exists
2. Aggregate positions using sumByPosition()
3. Load template using loadAbrechnungTemplate()
4. Fill header using fillAbrechnungHeader()
5. Fill positions using fillAbrechnungPositions()
6. Update state with abrechnungData
7. Cache workbook for export

---

#### `handleExportAbrechnung() → Promise<void>`
Export abrechnung workbook to file.

**Preconditions**: abrechnungData must exist, workbook must be cached

**Workflow**:
1. Validate abrechnungData exists
2. Retrieve cached workbook
3. Generate filename with timestamp
4. Export using exportToExcel()
5. Update export status

---

#### `handleResetApplication() → void`
Clear all state and cached data.

**Preconditions**: Confirms with user before proceeding

**Actions**:
- Resets state to initial
- Clears localStorage
- Clears template cache
- Resets file input
- Updates UI

---

## UI Module (`js/ui.js`)

### UI Update Functions

#### `updateImportUI(state: Object) → void`
Update import section UI based on state.

**Updates**:
- Status indicator class
- Status message text
- Import summary display
- Button enabled/disabled states

---

#### `updateGenerateUI(state: Object) → void`
Update generate section UI based on state.

---

#### `updateExportUI(state: Object) → void`
Update export section UI based on state.

---

### Message Functions

#### `showGlobalMessage(type: string, title: string, message: string) → void`
Display a global message to the user.

**Parameters**:
- `type`: 'success', 'error', 'warning', 'info'
- `title`: Message title
- `message`: Message content

**Features**:
- Auto-dismisses after 8 seconds
- Has close button
- Escapes HTML to prevent XSS

---

#### `clearGlobalMessages() → void`
Remove all global message elements from DOM.

---

## Validation Module (`js/validation.js`)

#### `validateStateStructure(state: Object) → Object`
Validate that state has the required structure.

**Returns**: `{ valid: boolean, errors: Array }`

---

#### `validateMetadata(metadata: Object) → Object`
Validate protokoll metadata completeness.

**Returns**: `{ valid: boolean, errors: Array }`

---

## Main Module (`js/main.js`)

#### `initializeApp() → Promise<void>`
Bootstrap the application.

**Steps**:
1. Load persisted state from localStorage
2. Initialize static UI elements
3. Bind event listeners to buttons
4. Subscribe to state changes
5. Perform initial render based on loaded state

**Called**: When DOM is ready (DOMContentLoaded event)

---

## Best Practices for Extending

### Adding a New Utility Function

1. Add to utils.js with clear JSDoc
2. Export it from the module
3. Write unit tests in `tests/unit/utils.test.js`
4. Document in this API.md file

### Adding a New UI Section

1. Add HTML structure to index.html with appropriate IDs
2. Create update function in ui.js (e.g., `updateMyUI`)
3. Call from state subscribe callback in main.js
4. Write tests for the update function

### Adding State Properties

1. Initialize in initial state object in state.js
2. Document in ARCHITECTURE.md State Schema
3. Update tests to cover new properties
4. Add validation if needed

---

**API Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Complete
