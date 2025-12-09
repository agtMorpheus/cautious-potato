# Contract Manager API Reference

**Version:** 1.0  
**Last Updated:** December 2025

This document provides detailed API documentation for all exported functions in the Contract Manager module.

---

## Table of Contents

1. [contractUtils.js](#contractutilsjs)
2. [contractColumnMapper.js](#contractcolumnmapperjs)
3. [contractNormalizer.js](#contractnormalizerjs)
4. [contractRepository.js](#contractrepositoryjs)
5. [contractHandlers.js](#contracthandlersjs)
6. [contractRenderer.js](#contractrendererjs)

---

## contractUtils.js

### Constants

#### `DEFAULT_COLUMN_MAPPING`

Default mapping configuration for Excel columns to contract fields.

```javascript
{
    contractId: { excelColumn: 'A', type: 'string', required: true },
    contractTitle: { excelColumn: 'F', type: 'string', required: true },
    status: { excelColumn: 'M', type: 'string', required: true },
    location: { excelColumn: 'H', type: 'string', required: false },
    equipmentId: { excelColumn: 'J', type: 'string', required: false },
    plannedStart: { excelColumn: 'O', type: 'date', required: false },
    taskId: { excelColumn: 'B', type: 'string', required: false },
    // ... additional fields
}
```

#### `VALID_STATUS_VALUES`

Array of valid status values.

```javascript
['inbearb', 'fertig', 'offen']
```

---

### Functions

#### `generateUUID()`

Generates a UUID v4 string.

**Returns:** `string` - UUID in format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

**Example:**
```javascript
const id = generateUUID();
// "550e8400-e29b-41d4-a716-446655440000"
```

---

#### `columnLetterToIndex(column)`

Converts Excel column letter(s) to zero-based index.

**Parameters:**
- `column` (string): Column letter(s), e.g., "A", "AA", "AB"

**Returns:** `number` - Zero-based column index, or -1 if invalid

**Example:**
```javascript
columnLetterToIndex('A');  // 0
columnLetterToIndex('B');  // 1
columnLetterToIndex('Z');  // 25
columnLetterToIndex('AA'); // 26
columnLetterToIndex('AB'); // 27
columnLetterToIndex(null); // -1
```

---

#### `indexToColumnLetter(index)`

Converts zero-based index to Excel column letter(s).

**Parameters:**
- `index` (number): Zero-based column index

**Returns:** `string` - Column letter(s), or empty string if invalid

**Example:**
```javascript
indexToColumnLetter(0);  // 'A'
indexToColumnLetter(25); // 'Z'
indexToColumnLetter(26); // 'AA'
indexToColumnLetter(-1); // ''
```

---

#### `discoverContractSheets(workbook)`

Discovers all sheets in a workbook and extracts metadata.

**Parameters:**
- `workbook` (Object): SheetJS workbook object

**Returns:** `Object` - Sheet metadata keyed by sheet name

**Example:**
```javascript
const sheets = discoverContractSheets(workbook);
// {
//   "Sheet1": { sheetName: "Sheet1", rowCount: 100, columns: [...], isEmpty: false },
//   "Sheet2": { sheetName: "Sheet2", rowCount: 0, columns: [], isEmpty: true }
// }
```

**Throws:** Error if workbook is null or has no sheets

---

#### `suggestContractColumnMapping(columns)`

Suggests column mapping based on header names.

**Parameters:**
- `columns` (Array): Array of column metadata objects

**Returns:** `Object` - Mapping configuration

**Example:**
```javascript
const columns = [
    { letter: 'A', header: 'Auftrag' },
    { letter: 'B', header: 'Status' }
];
const mapping = suggestContractColumnMapping(columns);
// {
//   contractId: { excelColumn: 'A', type: 'string', required: true },
//   status: { excelColumn: 'B', type: 'string', required: true },
//   ...
// }
```

---

#### `extractContractsFromSheet(workbook, sheetName, mapping)`

Extracts contracts from a worksheet using column mapping.

**Parameters:**
- `workbook` (Object): SheetJS workbook object
- `sheetName` (string): Name of the sheet to extract from
- `mapping` (Object): Column mapping configuration

**Returns:** `Object` - Extraction result
```javascript
{
    contracts: Array,  // Successfully extracted contracts
    errors: Array,     // Error messages
    warnings: Array    // Warning messages
}
```

**Example:**
```javascript
const result = extractContractsFromSheet(workbook, "Sheet1", mapping);
console.log(`Extracted ${result.contracts.length} contracts`);
console.log(`${result.errors.length} errors`);
```

---

#### `validateContractRecord(contract)`

Validates a contract object for required fields.

**Parameters:**
- `contract` (Object): Contract object to validate

**Returns:** `Object` - Validation result
```javascript
{
    valid: boolean,
    errors: Array<string>,
    warnings: Array<string>
}
```

**Example:**
```javascript
const contract = { contractId: '1406', contractTitle: 'Test', status: 'fertig' };
const result = validateContractRecord(contract);
// { valid: true, errors: [], warnings: [] }

const invalid = { contractId: '', status: '' };
const result2 = validateContractRecord(invalid);
// { valid: false, errors: ['Contract ID ist erforderlich', ...], warnings: [] }
```

---

#### `normalizeStatus(status)`

Normalizes status value to standard lowercase form.

**Parameters:**
- `status` (string): Raw status value

**Returns:** `string` - Normalized status

**Example:**
```javascript
normalizeStatus('INBEARB');        // 'inbearb'
normalizeStatus('fertig');         // 'fertig'
normalizeStatus('in bearbeitung'); // 'inbearb'
normalizeStatus('abgeschlossen');  // 'fertig'
normalizeStatus('done');           // 'fertig'
normalizeStatus(null);             // ''
```

---

#### `getContractSummary(contracts)`

Computes summary statistics for a contracts array.

**Parameters:**
- `contracts` (Array): Array of contract objects

**Returns:** `Object` - Summary statistics
```javascript
{
    totalContracts: number,
    uniqueContractIds: number,
    byStatus: { [status: string]: number },
    byLocation: { [location: string]: number },
    dateRange: { earliest: string|null, latest: string|null }
}
```

---

#### `readContractWorkbook(file)`

Reads an Excel file and returns a SheetJS workbook object.

**Parameters:**
- `file` (File): File object from file input

**Returns:** `Promise<Object>` - SheetJS workbook object

**Throws:** 
- Error if file is not .xlsx or .xls
- Error if file exceeds 10 MB
- Error if file cannot be parsed

**Example:**
```javascript
const file = document.getElementById('fileInput').files[0];
const workbook = await readContractWorkbook(file);
console.log(workbook.SheetNames);
```

---

#### `extractContractsFromSheetAsync(workbook, sheetName, mapping, options)`

Async extraction with progress callback support.

**Parameters:**
- `workbook` (Object): SheetJS workbook object
- `sheetName` (string): Sheet name
- `mapping` (Object): Column mapping
- `options` (Object): Optional settings
  - `skipInvalidRows` (boolean): Skip rows with errors (default: true)
  - `maxRows` (number|null): Limit rows to process
  - `onProgress` (function|null): Progress callback

**Returns:** `Promise<Object>` - Extraction result with summary
```javascript
{
    contracts: Array,
    errors: Array,
    warnings: Array,
    summary: {
        totalRows: number,
        successCount: number,
        errorCount: number,
        warningCount: number,
        duplicateCount: number,
        importDuration: number
    }
}
```

---

#### `importContractFile(file, userMappingOverrides, options)`

High-level import function combining all steps.

**Parameters:**
- `file` (File): Excel file
- `userMappingOverrides` (Object|null): Custom mapping overrides
- `options` (Object): Import options

**Returns:** `Promise<Object>` - Complete import result

---

## contractColumnMapper.js

### Functions

#### `inferColumnType(samples, header)`

Infers data type from sample values and header text.

**Parameters:**
- `samples` (Array): Sample values from column
- `header` (string): Column header text

**Returns:** `string` - Inferred type: 'string', 'number', or 'date'

**Type Detection Logic:**
1. Header keywords (e.g., "datum", "betrag")
2. Excel serial numbers (40000-50000 range)
3. Date string patterns
4. Numeric values

**Example:**
```javascript
inferColumnType(['2025-01-01', '2025-02-01'], 'Datum'); // 'date'
inferColumnType([100, 200, 300], 'Betrag');             // 'number'
inferColumnType(['ABC', 'DEF'], 'Name');                // 'string'
inferColumnType([45500, 45600], '');                    // 'date' (Excel serial)
```

---

#### `discoverContractSheets(workbook)`

Enhanced sheet discovery with type inference.

**Parameters:**
- `workbook` (Object): SheetJS workbook object

**Returns:** `Object` - Discovery result
```javascript
{
    sheets: [
        {
            name: string,
            sheetId: number,
            rowCount: number,
            dataStartRow: number,
            isEmpty: boolean,
            columns: [
                {
                    index: number,
                    letter: string,
                    header: string,
                    inferredType: string,
                    visible: boolean,
                    sampleValues: Array
                }
            ]
        }
    ]
}
```

---

#### `suggestContractColumnMapping(discoveredSheets)`

Suggests mapping with confidence scores.

**Parameters:**
- `discoveredSheets` (Object): Result from discoverContractSheets()

**Returns:** `Object` - Mapping suggestion
```javascript
{
    sheetName: string,
    mapping: {
        [fieldName]: {
            excelColumn: string,
            confidence: number,      // 0.0 - 1.0
            headerText: string,
            type: string
        }
    },
    unmappedColumns: Array<string>,
    confidence: string,              // 'high' | 'medium' | 'low'
    averageConfidence: number,
    suggestions: Array<string>,
    missingRequired: Array<string>
}
```

---

## contractNormalizer.js

### Functions

#### `parseExcelDate(value)`

Parses various date formats to ISO string.

**Parameters:**
- `value` (any): Date value to parse

**Returns:** `string|null` - ISO date string (YYYY-MM-DD) or null

**Supported Formats:**
- Excel serial numbers (e.g., 45500)
- ISO strings (e.g., "2025-06-15")
- ISO datetime (e.g., "2025-06-15T12:00:00Z")
- DD/MM/YYYY (e.g., "15/06/2025")
- DD.MM.YYYY German (e.g., "15.06.2025")
- JavaScript Date objects

**Example:**
```javascript
parseExcelDate(45658);              // '2025-01-01' (approx)
parseExcelDate('2025-06-15');       // '2025-06-15'
parseExcelDate('15/06/2025');       // '2025-06-15'
parseExcelDate('15.06.2025');       // '2025-06-15'
parseExcelDate(new Date(2025,5,15)); // '2025-06-15'
parseExcelDate('invalid');          // null
parseExcelDate(0);                  // null (treated as no date)
```

---

#### `parseRowWithMapping(row, mapping, headerRow)`

Extracts values from row based on mapping.

**Parameters:**
- `row` (Array): Array of cell values
- `mapping` (Object): Column mapping configuration
- `headerRow` (Array|null): Optional header row

**Returns:** `Object` - Parsed row data
```javascript
{
    [fieldName]: {
        raw: any,
        columnLetter: string,
        columnIndex: number,
        type: string
    }
}
```

---

#### `validateContractRow(rowData, mapping)`

Validates parsed row for required fields.

**Parameters:**
- `rowData` (Object): Parsed row from parseRowWithMapping()
- `mapping` (Object): Column mapping configuration

**Returns:** `Object` - Validation result
```javascript
{
    isValid: boolean,
    missingFields: Array<string>,
    warnings: Array<{ type: string, field: string, message: string }>
}
```

---

#### `normalizeContractData(rowData, warnings)`

Normalizes raw values to typed values.

**Parameters:**
- `rowData` (Object): Parsed row data
- `warnings` (Array): Array to collect warnings

**Returns:** `Object` - Normalized data with converted values

**Normalization Rules:**
- Strings: trimmed, empty becomes null
- Dates: converted via parseExcelDate()
- Numbers: parsed with Number(), NaN becomes null

---

#### `createContractObject(normalized, rowIndex, sheetName, fileName)`

Creates a complete contract object with metadata.

**Parameters:**
- `normalized` (Object): Normalized data
- `rowIndex` (number): Excel row number (1-indexed)
- `sheetName` (string): Source sheet name
- `fileName` (string): Source file name

**Returns:** `Object` - Complete contract object

---

#### `processContractRow(row, mapping, rowIndex, sheetName, fileName)`

Combined row processing: parse, validate, normalize, create.

**Parameters:**
- `row` (Array): Row data array
- `mapping` (Object): Column mapping
- `rowIndex` (number): Row number
- `sheetName` (string): Sheet name
- `fileName` (string): File name

**Returns:** `Object` - Processing result
```javascript
{
    contract: Object|null,
    errors: Array,
    warnings: Array
}
```

---

## contractRepository.js

### Functions

#### `getAllContracts()`

Returns all contract records from state.

**Returns:** `Array` - Array of contract objects

---

#### `getContractById(id)`

Gets a single contract by internal UUID.

**Parameters:**
- `id` (string): Contract UUID

**Returns:** `Object|null` - Contract or null

---

#### `getContractsByContractId(contractId)`

Gets contracts by business contract ID.

**Parameters:**
- `contractId` (string): Business contract ID (e.g., "1406")

**Returns:** `Array` - Matching contracts

---

#### `getFilteredContracts(customFilters)`

Returns contracts matching filter criteria.

**Parameters:**
- `customFilters` (Object|null): Filter configuration
  - `contractId` (string): Partial match on contract ID
  - `status` (string): Exact status match
  - `location` (string): Partial match on location
  - `equipmentId` (string): Partial match
  - `dateRange` (Object): { from: string, to: string }
  - `searchText` (string): Full-text search

**Returns:** `Array` - Filtered contracts

---

#### `getPaginatedContracts(options)`

Returns paginated contracts.

**Parameters:**
- `options` (Object):
  - `page` (number): Page number (default: 1)
  - `pageSize` (number): Items per page (default: 50)
  - `filters` (Object|null): Filter configuration
  - `sort` (Object): { field: string, direction: 'asc'|'desc' }

**Returns:** `Object` - Pagination result
```javascript
{
    data: Array,
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
}
```

---

#### `sortContracts(contracts, field, direction)`

Sorts contracts array by field.

**Parameters:**
- `contracts` (Array): Contracts to sort
- `field` (string): Field name to sort by
- `direction` (string): 'asc' or 'desc'

**Returns:** `Array` - Sorted contracts (new array)

---

#### `addContract(contract)`

Adds a single contract.

**Parameters:**
- `contract` (Object): Contract to add

**Returns:** `Object` - Added contract with generated ID

**Side Effects:**
- Updates state.contracts.records
- Persists to localStorage

---

#### `addContracts(contracts, importMetadata)`

Adds multiple contracts in bulk.

**Parameters:**
- `contracts` (Array): Contracts to add
- `importMetadata` (Object|null): Optional metadata
  - `fileName` (string)
  - `size` (number)
  - `importedAt` (string)
  - `recordsImported` (number)
  - `recordsWithErrors` (number)

**Returns:** `Object` - { addedCount: number, contracts: Array }

---

#### `updateContract(id, updates)`

Updates an existing contract.

**Parameters:**
- `id` (string): Contract UUID
- `updates` (Object): Partial updates to apply

**Returns:** `Object|null` - Updated contract or null if not found

**Side Effects:**
- Updates state.contracts.records
- Sets updatedAt timestamp
- Persists to localStorage

---

#### `deleteContract(id)`

Deletes a contract by ID.

**Parameters:**
- `id` (string): Contract UUID

**Returns:** `boolean` - True if deleted, false if not found

---

#### `getUniqueFieldValues(field)`

Gets unique values for a field (for filter dropdowns).

**Parameters:**
- `field` (string): Field name

**Returns:** `Array<string>` - Sorted unique values

---

#### `getContractStatistics()`

Returns statistics for dashboard.

**Returns:** `Object` - Statistics
```javascript
{
    totalContracts: number,
    uniqueContractIds: number,
    byStatus: Object,
    byLocation: Object,
    dateRange: Object,
    totalImportedFiles: number,
    lastImportDate: string|null
}
```

---

#### `searchContracts(query)`

Full-text search across all fields.

**Parameters:**
- `query` (string): Search query

**Returns:** `Array` - Matching contracts

---

#### `getContractsGroupedBy(field)`

Groups contracts by field value.

**Parameters:**
- `field` (string): Field name to group by

**Returns:** `Object` - Grouped contracts
```javascript
{
    [fieldValue]: Array<Contract>
}
```

---

#### `hasContracts()`

Checks if any contracts exist.

**Returns:** `boolean`

---

#### `getContractCount(filters)`

Returns count of contracts matching filters.

**Parameters:**
- `filters` (Object|null): Optional filters

**Returns:** `number`

---

## contractHandlers.js

### Event Handlers

#### `handleContractFileSelect(event)`

Handles file input change event.

**Parameters:**
- `event` (Event): File input change event

**Side Effects:**
- Validates file type and size
- Triggers sheet discovery
- Updates import state

---

#### `handleContractSheetSelect(event)`

Handles worksheet selection change.

**Parameters:**
- `event` (Event): Select change event

**Side Effects:**
- Suggests column mapping
- Updates currentMapping in state

---

#### `handleContractMappingChange(field, column)`

Handles manual mapping adjustment.

**Parameters:**
- `field` (string): Field name
- `column` (string): Excel column letter

---

#### `handleContractMappingConfirm()`

Generates preview after mapping confirmation.

**Returns:** `Promise<void>`

**Side Effects:**
- Extracts contracts with current mapping
- Stores result in lastImportResult
- Shows preview container

---

#### `handleContractImportSave()`

Saves previewed contracts to state.

**Returns:** `Promise<void>`

**Side Effects:**
- Adds contracts via repository
- Clears preview
- Updates import statistics

---

#### `handleContractCancelPreview()`

Cancels import preview.

**Side Effects:**
- Clears lastImportResult
- Hides preview container

---

#### `handleContractFilterChange(filterName, value)`

Updates a single filter.

**Parameters:**
- `filterName` (string): Filter name
- `value` (any): Filter value

---

#### `handleContractSearch(searchText)`

Updates search text filter.

**Parameters:**
- `searchText` (string): Search query

---

#### `handleClearContractFilters()`

Resets all filters to default.

---

#### `handleContractSort(sortKey)`

Toggles sort on a column.

**Parameters:**
- `sortKey` (string): Field name to sort by

**Behavior:**
- Clicking same column toggles direction
- Clicking different column sorts ascending

---

#### `handleContractDateRangeChange(type, value)`

Updates date range filter.

**Parameters:**
- `type` (string): 'from' or 'to'
- `value` (string): Date string

---

#### `handleContractActionClick(action, contractId)`

Routes action clicks.

**Parameters:**
- `action` (string): 'edit' or 'delete'
- `contractId` (string): Contract UUID

---

#### `handleContractEdit(contractId)`

Opens edit dialog for contract.

**Parameters:**
- `contractId` (string): Contract UUID

---

#### `handleResetContracts()`

Resets all contract data with confirmation.

---

#### `initializeContractEventListeners()`

Sets up all event listeners. Call from main.js.

---

## contractRenderer.js

### Functions

#### `initializeContractUI()`

Initializes UI and subscribes to state changes.

---

#### `renderContractPreview(contractState)`

Renders import preview with summary and errors.

**Parameters:**
- `contractState` (Object): contracts state slice

---

#### `highlightPreviewRow(rowIndex)`

Highlights a row in preview table.

**Parameters:**
- `rowIndex` (number): Row index to highlight

---

#### `renderContractList(contractState)`

Renders main contract list with filters and sorting.

**Parameters:**
- `contractState` (Object): contracts state slice

---

#### `renderImportSummary(importResult)`

Renders post-import summary card.

**Parameters:**
- `importResult` (Object): Import result with contracts, errors, warnings

**Returns:** `string` - HTML string

---

#### `renderContractFilters()`

Renders filter section HTML.

**Returns:** `string` - HTML string

---

**Document Version:** 1.0  
**Created:** December 2025  
**Author:** Contract Manager Development Team
