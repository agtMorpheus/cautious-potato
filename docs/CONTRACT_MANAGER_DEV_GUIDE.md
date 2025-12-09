# Contract Manager Developer Guide

**Version:** 1.0  
**Last Updated:** December 2025

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Reference](#2-module-reference)
3. [Adding Features](#3-adding-features)
4. [Testing](#4-testing)
5. [Debugging](#5-debugging)

---

## 1. Architecture Overview

### 1.1 Phase Summary

The Contract Manager was developed across multiple phases:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core utilities, state management, repository | Complete |
| Phase 2 | Excel parsing, column mapping, normalization | Complete |
| Phase 3 | UI rendering, handlers, preview, filtering | Complete |
| Phase 4 | Testing, optimization, documentation | Complete |

### 1.2 Module Responsibilities

```
js/contracts/
├── contractUtils.js       # Core utilities, Excel I/O, extraction
├── contractColumnMapper.js # Sheet discovery, column mapping
├── contractNormalizer.js   # Data normalization, validation
├── contractHandlers.js     # Event handlers, user interactions
├── contractRepository.js   # Data access, CRUD operations
└── contractRenderer.js     # UI rendering, DOM updates
```

### 1.3 Data Flow Diagram

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Excel File  │───>│ contractUtils│───>│ columnMapper │
└──────────────┘    │ (SheetJS)    │    │ (discovery)  │
                    └──────────────┘    └──────────────┘
                                               │
                                               ▼
                    ┌──────────────┐    ┌──────────────┐
                    │  normalizer  │<───│ Suggested    │
                    │ (validation) │    │   Mapping    │
                    └──────────────┘    └──────────────┘
                           │
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    State     │<───│  repository  │<───│  Contracts   │
│ (contracts)  │    │   (CRUD)     │    │   Array      │
└──────────────┘    └──────────────┘    └──────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│   renderer   │───>│     DOM      │
│ (UI updates) │    │  (HTML/CSS)  │
└──────────────┘    └──────────────┘
```

### 1.4 State Management Overview

The application uses a centralized state with reactive updates:

```javascript
// State structure for contracts
state.contracts = {
    records: [],           // Array of contract objects
    importedFiles: [],     // List of imported file metadata
    rawSheets: {},         // Discovered sheet metadata
    currentMapping: {},    // Active column mapping
    filters: {},           // Current filter settings
    ui: {},                // UI state (sort, pagination)
    importState: {},       // Import progress/status
    lastImportResult: null // Preview data before save
};
```

---

## 2. Module Reference

### 2.1 contractUtils.js

**Purpose:** Core utilities and high-level import functions

**Key Exports:**

```javascript
// Constants
export const DEFAULT_COLUMN_MAPPING = {...};
export const VALID_STATUS_VALUES = ['inbearb', 'fertig', 'offen'];

// Utility Functions
export function generateUUID(): string
export function columnLetterToIndex(column: string): number
export function indexToColumnLetter(index: number): string

// Sheet Operations
export function discoverContractSheets(workbook): Object
export function suggestContractColumnMapping(columns): Object
export function extractContractsFromSheet(workbook, sheetName, mapping): Object

// Validation
export function validateContractRecord(contract): Object
export function normalizeStatus(status): string
export function getContractSummary(contracts): Object

// File I/O (Phase 2)
export async function readContractWorkbook(file): Promise<Object>
export async function extractContractsFromSheetAsync(workbook, sheet, mapping, options): Promise<Object>
export async function importContractFile(file, overrides, options): Promise<Object>
```

### 2.2 contractColumnMapper.js

**Purpose:** Intelligent column mapping and type inference

**Key Exports:**

```javascript
// Type Inference
export function inferColumnType(samples: Array, header: string): string
// Returns: 'string' | 'number' | 'date'

// Sheet Discovery
export function discoverContractSheets(workbook): Object
// Returns: { sheets: [{ name, rowCount, columns, isEmpty }] }

// Mapping Suggestion
export function suggestContractColumnMapping(discoveredSheets): Object
// Returns: { mapping, confidence, averageConfidence, suggestions, unmappedColumns }
```

**Mapping Rules:**

The module uses pattern matching to map headers to fields:

```javascript
const MAPPING_RULES = {
    contractId: { patterns: ['auftrag', 'contract', ...], required: true },
    contractTitle: { patterns: ['titel', 'title', ...], required: true },
    status: { patterns: ['status', 'state', ...], required: true },
    // ... more fields
};
```

### 2.3 contractNormalizer.js

**Purpose:** Data normalization and validation

**Key Exports:**

```javascript
// Date Parsing
export function parseExcelDate(value): string | null
// Handles: Excel serial dates, ISO strings, DD/MM/YYYY, DD.MM.YYYY

// Row Processing
export function parseRowWithMapping(row, mapping, headerRow): Object
export function validateContractRow(rowData, mapping): Object
export function normalizeContractData(rowData, warnings): Object
export function createContractObject(normalized, rowIndex, sheetName, fileName): Object

// Combined Processing
export function processContractRow(row, mapping, rowIndex, sheetName, fileName): Object
// Returns: { contract, errors, warnings }
```

### 2.4 contractHandlers.js

**Purpose:** Event handling and user interaction logic

**Key Exports:**

```javascript
// File Handling
export function handleContractFileSelect(event): void
export function handleContractSheetSelect(event): void
export function handleContractMappingChange(field, column): void

// Import Flow
export async function handleContractMappingConfirm(): Promise<void>
export async function handleContractImportSave(): Promise<void>
export function handleContractCancelPreview(): void

// Filtering & Sorting
export function handleContractFilterChange(filterName, value): void
export function handleContractSearch(searchText): void
export function handleClearContractFilters(): void
export function handleContractSort(sortKey): void
export function handleContractDateRangeChange(type, value): void

// Actions
export function handleContractActionClick(action, contractId): void
export function handleContractEdit(contractId): void
export function handleContractDelete(contractId): void

// Reset
export function handleResetContracts(): void

// Initialization
export function initializeContractEventListeners(): void
```

### 2.5 contractRepository.js

**Purpose:** Data access abstraction layer

**Key Exports:**

```javascript
// Read Operations
export function getAllContracts(): Array
export function getContractById(id): Object | null
export function getContractsByContractId(contractId): Array
export function getFilteredContracts(customFilters): Array
export function getPaginatedContracts(options): Object
export function searchContracts(query): Array
export function getContractsGroupedBy(field): Object

// Write Operations
export function addContract(contract): Object
export function addContracts(contracts, metadata): Object
export function updateContract(id, updates): Object | null
export function deleteContract(id): boolean

// Utilities
export function getUniqueFieldValues(field): Array
export function getContractStatistics(): Object
export function sortContracts(contracts, field, direction): Array
export function hasContracts(): boolean
export function getContractCount(filters): number
```

### 2.6 contractRenderer.js

**Purpose:** UI rendering and DOM manipulation

**Key Exports:**

```javascript
// Initialization
export function initializeContractUI(): void

// Preview Rendering
export function renderContractPreview(contractState): void
export function highlightPreviewRow(rowIndex): void

// List Rendering
export function renderContractList(contractState): void
export function renderContractFilters(): string
export function renderImportSummary(importResult): string
```

---

## 3. Adding Features

### 3.1 Adding a New Contract Field

**Step 1:** Update DEFAULT_COLUMN_MAPPING in `contractUtils.js`:

```javascript
export const DEFAULT_COLUMN_MAPPING = {
    // ... existing fields
    newField: { excelColumn: 'X', type: 'string', required: false }
};
```

**Step 2:** Add mapping rule in `contractColumnMapper.js`:

```javascript
const MAPPING_RULES = {
    // ... existing rules
    newField: { 
        patterns: ['new.*field', 'neues.*feld'], 
        required: false 
    }
};
```

**Step 3:** Update `createContractObject()` in `contractNormalizer.js`:

```javascript
return {
    // ... existing fields
    newField: normalized.newField || null,
    // ...
};
```

**Step 4:** Update renderer to display the field.

### 3.2 Adding a New Filter

**Step 1:** Add filter to initial state in `state.js`:

```javascript
contracts: {
    filters: {
        // ... existing filters
        newFilter: null
    }
}
```

**Step 2:** Add handler in `contractHandlers.js`:

```javascript
export function handleNewFilterChange(value) {
    handleContractFilterChange('newFilter', value);
}
```

**Step 3:** Add filter logic in `contractRepository.js`:

```javascript
if (filters.newFilter) {
    filtered = filtered.filter(c => 
        c.newField === filters.newFilter
    );
}
```

**Step 4:** Add filter UI in `contractRenderer.js`.

### 3.3 Adding Inline Editing for a New Field

**Step 1:** Update `handleContractEdit()` in `contractHandlers.js`:

```javascript
export function handleContractEdit(contractId) {
    // ... existing logic
    const newValue = prompt(`Edit field for ${contract.contractId}:`, 
        contract.fieldName || '');
    
    if (newValue !== null) {
        updateContract(contractId, { fieldName: newValue });
    }
}
```

### 3.4 Integrating with a Backend Database

**Step 1:** Create API client module:

```javascript
// js/contracts/contractApi.js
export async function fetchContracts() {
    const response = await fetch('/api/contracts');
    return response.json();
}

export async function saveContract(contract) {
    const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract)
    });
    return response.json();
}
```

**Step 2:** Update repository to use API:

```javascript
// In contractRepository.js
import { fetchContracts, saveContract } from './contractApi.js';

export async function loadContractsFromServer() {
    const contracts = await fetchContracts();
    setState({ contracts: { records: contracts } });
}
```

---

## 4. Testing

### 4.1 Running Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/contractColumnMapper.test.js

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 4.2 Adding New Test Cases

**File location:** `tests/unit/contract*.test.js`

**Example test:**

```javascript
describe('My New Feature', () => {
    beforeEach(() => {
        resetState(true);
    });

    test('does something expected', () => {
        // Arrange
        const input = { ... };
        
        // Act
        const result = myFunction(input);
        
        // Assert
        expect(result).toBe(expected);
    });
});
```

### 4.3 Running Integration Tests

Integration tests require a browser environment:

```javascript
// In browser console:
console.log("Testing import workflow...");

// Step 1: Upload file
const testFile = await getTestFile("1406-Auftrage-2025.xlsx");
handleContractFileSelect({ target: { files: [testFile] } });

// Step 2: Verify sheets discovered
const state = getState();
console.assert(state.contracts.rawSheets !== null);

// Step 3: Continue workflow...
```

### 4.4 Performance Profiling

```javascript
console.time("Full Import");

const file = ...; // Your test file
const wb = await contractUtils.readContractWorkbook(file);

console.time("Discovery");
const discovered = discoverContractSheets(wb);
console.timeEnd("Discovery");

console.time("Mapping");
const mapping = suggestContractColumnMapping(discovered);
console.timeEnd("Mapping");

console.time("Extraction");
const result = await extractContractsFromSheetAsync(wb, sheet, mapping);
console.timeEnd("Extraction");

console.timeEnd("Full Import");
```

---

## 5. Debugging

### 5.1 Browser Console Tricks

**Inspect current state:**
```javascript
console.log(getState().contracts);
```

**Check imported contracts:**
```javascript
const contracts = getAllContracts();
console.table(contracts.slice(0, 10));
```

**View contract by ID:**
```javascript
const contract = getContractById('uuid-here');
console.log(JSON.stringify(contract, null, 2));
```

### 5.2 State Inspection

**Get current filters:**
```javascript
console.log(getState().contracts.filters);
```

**Get import state:**
```javascript
console.log(getState().contracts.importState);
```

**Check mapping:**
```javascript
console.log(getState().contracts.currentMapping);
```

### 5.3 localStorage Inspection

**View stored state:**
```javascript
const stored = localStorage.getItem('abrechnungState');
console.log(JSON.parse(stored).contracts);
```

**Clear stored state:**
```javascript
localStorage.removeItem('abrechnungState');
location.reload();
```

### 5.4 Common Issues & Fixes

**Issue:** State not updating after import
```javascript
// Force state notification
setState({ contracts: { ...getState().contracts } });
```

**Issue:** Filters not applying
```javascript
// Check filter values
console.log(getState().contracts.filters);
// Verify filter logic in repository
```

**Issue:** Column mapping incorrect
```javascript
// Debug mapping suggestion
const discovered = discoverContractSheets(workbook);
console.log(discovered.sheets[0].columns);
const suggested = suggestContractColumnMapping(discovered);
console.log(suggested);
```

**Issue:** Date parsing errors
```javascript
// Test date parsing
import { parseExcelDate } from './contractNormalizer.js';
console.log(parseExcelDate(45500)); // Excel serial
console.log(parseExcelDate('2025-06-15')); // ISO
console.log(parseExcelDate('15.06.2025')); // German
```

---

## Appendix A: Contract Object Schema

```typescript
interface Contract {
    // Identifiers
    id: string;              // Internal UUID
    internalKey: string;     // Deduplication key
    
    // Core Fields
    contractId: string;      // Business contract ID
    contractTitle: string;   // Contract title
    taskId: string | null;   // Task number
    taskType: string | null; // Task type
    description: string | null;
    
    // Location & Equipment
    location: string | null;
    roomArea: string | null;
    equipmentId: string | null;
    equipmentDescription: string | null;
    serialNumber: string | null;
    
    // Management
    status: string;          // 'fertig' | 'inbearb' | 'offen'
    workorderCode: string | null;
    reportedBy: string | null;
    plannedStart: string | null; // ISO date
    reportedDate: string | null;
    
    // Metadata
    sourceFile: {
        fileName: string;
        sheet: string;
        rowIndex: number;
        importedAt: string;
    };
    
    // Audit
    createdAt: string;
    updatedAt: string;
    importVersion: number;
    isComplete: boolean;
}
```

---

**Document Version:** 1.0  
**Created:** December 2025  
**Author:** Contract Manager Development Team
