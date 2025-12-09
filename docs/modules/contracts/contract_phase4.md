# Contract Manager Module – Phase 4: Testing, Optimization & Quality Assurance

**Duration:** Weeks 7–8  
**Status:** Planned  
**Last Updated:** December 9, 2025

---

## 1. Overview

Phase 4 focuses on **comprehensive testing, performance optimization, documentation, and quality assurance** of the complete Contract Manager module (Phases 1–3). This phase ensures the application is production-ready, performant, accessible, secure, and fully documented.

Phase 4 objectives:

1. **Unit Testing** – Test individual functions (parsers, validators, normalizers, handlers)
2. **Integration Testing** – Test workflows across phases (import → preview → save → list → edit)
3. **Performance Optimization** – Profile, benchmark, and optimize bottlenecks
4. **Accessibility & Usability** – Ensure WCAG compliance and keyboard navigation
5. **Security Review** – Validate file handling, XSS prevention, localStorage safety
6. **Documentation** – User guide, developer guide, API reference, troubleshooting
7. **Browser Compatibility** – Test on Chrome, Firefox, Safari, Edge
8. **Production Readiness** – Deploy checklist, monitoring setup, rollback plan

---

## 2. Unit Testing Strategy

### 2.1 Test Framework Setup

**Recommendation:** Use **Jest** with browser polyfills for DOM testing, or use simple **console-based manual tests** initially with a plan to migrate to Jest for future iterations.

**For MVP (Phase 4):**
- Manual test scenarios in browser console
- HTML test runner page (optional)
- Documentation of test cases for team QA

**For future scalability:**
- Jest + jsdom for unit tests
- Cypress for end-to-end tests

### 2.2 Unit Test Modules

#### 2.2.1 contractColumnMapper.js Tests

**File:** `tests/contractColumnMapper.test.js` (or run in browser console)

**Test Suite: `inferColumnType()`**

```javascript
// Test: Infer string type
const samples1 = ["ABC123", "DEF456", "GHI789"];
const result1 = inferColumnType(samples1, "");
assert(result1 === "string", "Should infer string type");

// Test: Infer date type
const samples2 = ["2025-06-02", "2025-06-03", "2025-06-04"];
const result2 = inferColumnType(samples2, "Sollstart");
assert(result2 === "date", "Should infer date type from values or header");

// Test: Infer date type (Excel serial)
const samples3 = [45500, 45501, 45502];
const result3 = inferColumnType(samples3, "");
assert(result3 === "date", "Should infer date from Excel serial numbers");

// Test: Infer number type
const samples4 = ["100", "200", "300"];
const result4 = inferColumnType(samples4, "Betrag");
assert(result4 === "number", "Should infer number type");

// Test: Mixed types (default to string)
const samples5 = ["ABC", 123, "DEF"];
const result5 = inferColumnType(samples5, "");
assert(result5 === "string", "Should default to string for mixed types");
```

**Test Suite: `discoverContractSheets()`**

```javascript
// Setup: Load real 1406-Auftrage-2025.xlsx
const file = await getTestFile("1406-Auftrage-2025.xlsx");
const wb = await contractUtils.readContractWorkbook(file);

// Test: Discover sheets
const discovered = discoverContractSheets(wb);
assert(discovered.sheets.length === 22, "Should discover 22 sheets");

// Test: First sheet properties
const sheet1 = discovered.sheets[0];
assert(sheet1.name === "Fertige Aufträge Komplett 1406", "Should have correct sheet name");
assert(sheet1.rowCount === 2909, "Should have correct row count");
assert(sheet1.columns.length === 27, "Should have 27 columns");

// Test: Column metadata
const colA = sheet1.columns.find(c => c.letter === "A");
assert(colA.header === "Auftrag", "Should have correct header");
assert(colA.inferredType === "string", "Should infer correct type");
assert(colA.visible === true, "Should mark as visible");
```

**Test Suite: `suggestContractColumnMapping()`**

```javascript
// Setup
const discovered = discoverContractSheets(wb);
const suggested = suggestContractColumnMapping(discovered);

// Test: Mapping completeness
assert(suggested.mapping.contractId, "Should map contractId");
assert(suggested.mapping.contractTitle, "Should map contractTitle");
assert(suggested.mapping.status, "Should map status");

// Test: Confidence scores
assert(suggested.mapping.contractId.confidence === 1.0, "contractId should have high confidence");
assert(suggested.mapping.contractTitle.confidence >= 0.8, "contractTitle confidence >= 0.8");

// Test: Overall confidence level
assert(suggested.confidence === "high", "Overall confidence should be high for known file format");
assert(suggested.averageConfidence > 0.8, "Average confidence > 0.8");

// Test: Mapped columns
assert(suggested.mapping.contractId.excelColumn === "A", "contractId should map to column A");
assert(suggested.mapping.contractTitle.excelColumn === "F", "contractTitle should map to column F");
assert(suggested.mapping.status.excelColumn === "M", "status should map to column M");

// Test: Warnings for unmapped columns
assert(Array.isArray(suggested.unmappedColumns), "Should provide list of unmapped columns");
```

---

#### 2.2.2 contractNormalizer.js Tests

**File:** `tests/contractNormalizer.test.js`

**Test Suite: `parseExcelDate()`**

```javascript
// Test: ISO string date
const date1 = parseExcelDate("2025-06-02");
assert(date1 === "2025-06-02", "Should parse ISO string");

// Test: Excel serial date
const date2 = parseExcelDate(45500);
assert(date2 !== null && date2.includes("2024"), "Should parse Excel serial");

// Test: DD/MM/YYYY format
const date3 = parseExcelDate("02/06/2025");
assert(date3 === "2025-06-02", "Should parse DD/MM/YYYY format");

// Test: Invalid date
const date4 = parseExcelDate("invalid");
assert(date4 === null, "Should return null for invalid date");

// Test: Null/empty input
const date5 = parseExcelDate(null);
assert(date5 === null, "Should handle null input");
```

**Test Suite: `normalizeContractData()`**

```javascript
// Test: String fields trimmed
const rowData1 = {
  contractId: { raw: "  ABC123  ", type: "string" },
  contractTitle: { raw: "  Title  ", type: "string" }
};
const normalized1 = normalizeContractData(rowData1, []);
assert(normalized1.contractId === "ABC123", "Should trim whitespace from strings");

// Test: Required field validation
const rowData2 = {
  contractId: { raw: null, type: "string" },
  contractTitle: { raw: "", type: "string" },
  status: { raw: "fertig", type: "string" }
};
const validation = validateContractRow(rowData2, {});
assert(!validation.isValid, "Should mark as invalid when required fields empty");
assert(validation.missingFields.includes("contractId"), "Should identify missing contractId");

// Test: Date field conversion
const rowData3 = {
  plannedStart: { raw: "2025-06-02", type: "date" }
};
const normalized3 = normalizeContractData(rowData3, []);
assert(normalized3.plannedStart === "2025-06-02", "Should convert date field");

// Test: Number field conversion
const rowData4 = {
  amount: { raw: "1500.50", type: "number" }
};
const normalized4 = normalizeContractData(rowData4, []);
assert(normalized4.amount === 1500.50, "Should convert number field");

// Test: Invalid number handling
const warnings = [];
const rowData5 = {
  amount: { raw: "abc", type: "number" }
};
normalizeContractData(rowData5, warnings);
assert(warnings.some(w => w.type === "invalid_number"), "Should warn on invalid number");
```

**Test Suite: `createContractObject()`**

```javascript
// Test: UUID generation
const normalized = { contractId: "A123", status: "fertig" };
const contract1 = createContractObject(normalized, 2, "Sheet1", "test.xlsx");
assert(contract1.id, "Should have internal UUID");
assert(contract1.id.includes("-"), "Should have UUID format");

// Test: Metadata attachment
assert(contract1.sourceFile.fileName === "test.xlsx", "Should attach filename");
assert(contract1.sourceFile.rowIndex === 2, "Should attach row index");
assert(contract1.sourceFile.sheet === "Sheet1", "Should attach sheet name");

// Test: Timestamps
assert(contract1.createdAt, "Should have createdAt timestamp");
assert(contract1.updatedAt, "Should have updatedAt timestamp");

// Test: Complete flag
const complete = { contractId: "A123", location: "Loc", equipmentId: "E123", status: "fertig" };
const contract2 = createContractObject(complete, 3, "Sheet1", "test.xlsx");
assert(contract2.isComplete === true, "Should mark as complete when recommended fields present");
```

---

#### 2.2.3 contractUtils.js Tests

**File:** `tests/contractUtils.test.js`

**Test Suite: `readContractWorkbook()`**

```javascript
// Test: Valid file
const file1 = new File(["..."], "1406-Auftrage-2025.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const wb1 = await readContractWorkbook(file1);
assert(wb1.SheetNames, "Should return workbook object");
assert(wb1.SheetNames.length > 0, "Should have sheets");

// Test: Invalid format
const file2 = new File(["..."], "data.txt", { type: "text/plain" });
try {
  await readContractWorkbook(file2);
  throw new Error("Should reject non-xlsx files");
} catch (err) {
  assert(err.message.includes("xlsx"), "Should reject non-xlsx format");
}

// Test: File size limit
const largeData = new ArrayBuffer(11 * 1024 * 1024);  // 11 MB
const file3 = new File([largeData], "large.xlsx");
try {
  await readContractWorkbook(file3);
  throw new Error("Should reject oversized files");
} catch (err) {
  assert(err.message.includes("exceeds"), "Should reject files > 10 MB");
}
```

**Test Suite: `extractContractsFromSheet()` – Real Data**

```javascript
// Setup: Load real file and discovered metadata
const file = await getTestFile("1406-Auftrage-2025.xlsx");
const wb = await contractUtils.readContractWorkbook(file);
const discovered = discoverContractSheets(wb);
const mapping = suggestContractColumnMapping(discovered).mapping;
const sheetName = discovered.sheets[0].name;

// Test: Full extraction
const result = await extractContractsFromSheet(wb, sheetName, mapping);

// Assertions
assert(result.contracts.length > 2800, "Should extract ~2850 contracts from 2909 rows");
assert(result.errors.length < 100, "Should have < 100 errors");
assert(result.summary.successCount === result.contracts.length, "Summary matches contract count");
assert(result.summary.importDuration < 2000, "Import should complete in < 2000ms");

// Test: Contract object structure
if (result.contracts.length > 0) {
  const contract = result.contracts[0];
  assert(contract.id, "Each contract should have id");
  assert(contract.contractId, "Each contract should have contractId");
  assert(contract.sourceFile, "Each contract should have source metadata");
}

// Test: Duplicate detection
if (result.summary.duplicateCount > 0) {
  console.log(`Found ${result.summary.duplicateCount} duplicates (expected)`);
}
```

---

### 2.3 Handler Function Tests

**File:** `tests/contractHandlers.test.js`

**Test Suite: Event Handler Logic (without DOM)**

```javascript
// Mock state and DOM for testing
const mockState = {
  contracts: {
    records: [],
    importedFiles: [],
    currentMapping: {},
    filters: {},
    importState: { isImporting: false }
  }
};

// Test: handleContractFilterChange
function testFilterChange() {
  const filters = {
    searchText: "A564",
    status: "fertig",
    dateRange: { from: "2025-06-01", to: "2025-06-30" }
  };

  const testContracts = [
    { contractId: "A5664159", status: "fertig", plannedStart: "2025-06-02" },
    { contractId: "B1234567", status: "inbearb", plannedStart: "2025-05-01" },
    { contractId: "A5664200", status: "fertig", plannedStart: "2025-06-15" }
  ];

  const filtered = applyContractFiltersAndSort(testContracts, filters);
  assert(filtered.length === 2, "Should filter by search, status, and date range");
  assert(filtered.every(c => c.contractId.includes("A564")), "All filtered should match search");
  assert(filtered.every(c => c.status === "fertig"), "All filtered should match status");
}

// Test: handleContractSort
function testSorting() {
  const contracts = [
    { contractId: "C123", contractTitle: "Zebra" },
    { contractId: "A123", contractTitle: "Apple" },
    { contractId: "B123", contractTitle: "Banana" }
  ];

  // Sort ascending by contractId
  const sortedAsc = contracts.sort((a, b) => a.contractId.localeCompare(b.contractId));
  assert(sortedAsc[0].contractId === "A123", "Should sort ascending");

  // Sort descending
  const sortedDesc = contracts.sort((a, b) => b.contractId.localeCompare(a.contractId));
  assert(sortedDesc[0].contractId === "C123", "Should sort descending");
}

testFilterChange();
testSorting();
```

---

### 2.4 Test Coverage Matrix

| Module | Function | Coverage | Status |
|--------|----------|----------|--------|
| contractColumnMapper | inferColumnType | 5 test cases | ☐ |
| contractColumnMapper | discoverContractSheets | 3 test cases | ☐ |
| contractColumnMapper | suggestContractColumnMapping | 4 test cases | ☐ |
| contractNormalizer | parseExcelDate | 5 test cases | ☐ |
| contractNormalizer | normalizeContractData | 5 test cases | ☐ |
| contractNormalizer | validateContractRow | 2 test cases | ☐ |
| contractNormalizer | createContractObject | 4 test cases | ☐ |
| contractUtils | readContractWorkbook | 3 test cases | ☐ |
| contractUtils | extractContractsFromSheet | 4 test cases (real data) | ☐ |
| contractHandlers | Filter & Sort logic | 2 integration tests | ☐ |
| state | setContracts, addContracts | 2 test cases | ☐ |
| repository | addContracts, updateContract, deleteContract | 3 test cases | ☐ |
| **TOTAL** | | **45+ test cases** | |

---

## 3. Integration Testing

### 3.1 End-to-End Workflows

#### Workflow 1: Complete Import Cycle

```javascript
// Setup
const testFile = await getTestFile("1406-Auftrage-2025.xlsx");

// Step 1: Upload
const uploadEvent = new Event('change');
uploadEvent.target.files = [testFile];
handleContractFileInput(uploadEvent);
// Assert: state.contracts.discoveredSheets populated, UI shows sheet selector

// Step 2: Sheet selection (automatic or user selects)
const sheetChangeEvent = new Event('change');
sheetChangeEvent.target.value = "Fertige Aufträge Komplett 1406";
handleContractSheetChange(sheetChangeEvent);
// Assert: state.contracts.importState.currentSheet updated

// Step 3: Mapping confirmation (auto-suggested)
handleContractMappingConfirm();
// Assert: state.contracts.lastImportResult populated, preview shows contracts

// Step 4: Save to DB
handleContractImportSave();
// Assert: state.contracts.records now contains imported contracts
// Assert: localStorage persisted

// Step 5: Verify list rendering
const listState = getState().contracts;
// Assert: >2800 contracts in listState.records

// Step 6: Apply filters
const filters = { status: "fertig", searchText: "A564" };
setContractFilters(filters);
// Assert: filtered list shows subset of contracts

// Step 7: Reload and verify persistence
clearState();  // Clear in-memory state
loadState();   // Load from localStorage
// Assert: contracts still present
```

#### Workflow 2: Mapping Correction

```javascript
// Setup: After upload, suppose mapping is wrong
const wrongMapping = {
  ...suggestedMapping,
  status: { excelColumn: "B" }  // Wrong! Should be "M"
};

// Step 1: User adjusts mapping
const mappingChangeEvent = new Event('change');
mappingChangeEvent.target.dataset.fieldName = 'status';
mappingChangeEvent.target.value = 'M';
handleContractMappingChange(mappingChangeEvent);
// Assert: state.contracts.currentMapping.status.excelColumn === "M"

// Step 2: Re-extract with corrected mapping
handleContractMappingConfirm();
// Assert: result.errors reduced, status field populated correctly
```

#### Workflow 3: Edit & Update

```javascript
// Setup: Contracts already imported
const contractId = getState().contracts.records[0].id;

// Step 1: Open edit (click "Bearbeiten")
const editEvent = new Event('click');
editEvent.target.dataset.contractId = contractId;
// (In real scenario, this opens an edit modal or inline editor)

// Step 2: Update field
const newStatus = "fertig";
handleContractActionClick(editEvent);  // Opens editor
// User changes status and clicks save

// Step 3: Save change
contractRepository.updateContract(contractId, { status: newStatus });
// Assert: state.contracts.records[0].status === "fertig"
// Assert: state.contracts.records[0].updatedAt updated
// Assert: localStorage persisted
```

### 3.2 Integration Test Checklist

- [ ] Import real file (2909 rows) successfully
- [ ] Discover 22 sheets correctly
- [ ] Suggest mapping with >90% confidence
- [ ] Extract >2800 valid contracts
- [ ] Preview table renders correctly
- [ ] Error list is actionable (click to highlight row)
- [ ] Save imports contracts to state + localStorage
- [ ] Reload page: contracts persist
- [ ] Filter by status, date range, search text
- [ ] Sort by any column (ascending/descending)
- [ ] Edit contract fields inline
- [ ] Update persists to state and localStorage
- [ ] Delete contract removes from state
- [ ] Multiple imports append contracts (no duplicates)

---

## 4. Performance Optimization

### 4.1 Profiling Targets & Results

**Target Benchmarks (from Phase 2):**

| Operation | Target | Notes |
|---|---|---|
| File read (1.8 MB) | < 500 ms | Browser FileReader + SheetJS |
| Sheet discovery | < 200 ms | Metadata extraction |
| Column mapping | < 100 ms | Header matching algorithm |
| Data extraction (2909 rows) | < 2000 ms | Parsing + normalization |
| **Total import** | **< 3000 ms** | End-to-end (excluding UI renders) |

**Phase 4 Profiling:**

Use browser DevTools Performance tab to measure:

```javascript
console.time("Full Import");

const file = ...; // 1406-Auftrage-2025.xlsx
const wb = await contractUtils.readContractWorkbook(file);
console.time("Discovery");
const discovered = contractUtils.discoverContractSheets(wb);
console.timeEnd("Discovery");

console.time("Mapping");
const mapping = contractUtils.suggestContractColumnMapping(discovered).mapping;
console.timeEnd("Mapping");

console.time("Extraction");
const result = await contractUtils.extractContractsFromSheet(wb, discovered.sheets[0].name, mapping);
console.timeEnd("Extraction");

console.timeEnd("Full Import");

// Expected output:
// Discovery: 180-250ms
// Mapping: 50-100ms
// Extraction: 1500-2000ms
// Full Import: 2500-3000ms
```

### 4.2 Optimization Strategies

#### 4.2.1 Excel Parsing Optimization

**Current approach (Phase 2):**
- SheetJS `sheet_to_json` reads all rows at once

**Optimization:**
- For large files (>10K rows), implement chunked reading:
  ```javascript
  const CHUNK_SIZE = 500;
  for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    processChunk(chunk);
    yield progress();  // Emit progress event
  }
  ```

#### 4.2.2 UI Rendering Optimization

**Current approach (Phase 3):**
- Render full contract list immediately

**Optimization:**
- Virtualize list (render only visible rows):
  ```javascript
  const visibleStart = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleCount = Math.ceil(viewport.height / ROW_HEIGHT);
  const visibleRows = contracts.slice(visibleStart, visibleStart + visibleCount);
  renderOnlyVisibleRows(visibleRows);
  ```

#### 4.2.3 Preview Table Optimization

**Current approach (Phase 3):**
- Render all preview rows (capped at 100)

**Optimization:**
- Already capped at 100 rows for performance
- Consider pagination if needed later

#### 4.2.4 Memory Management

**Issue:** Temporary workbook stored in state during import

**Optimization:**
```javascript
// After import confirmation, immediately discard workbook
setState({
  contracts: {
    ...getState().contracts,
    tempWorkbook: null,  // Clear
    importState: { isImporting: false }
  }
});
```

---

### 4.3 Optimization Results & Metrics

After optimization, document:

| Operation | Before | After | Improvement |
|---|---|---|---|
| Discovery | 280 ms | 180 ms | 36% faster |
| Extraction | 2200 ms | 1650 ms | 25% faster |
| List render (100 contracts) | 150 ms | 50 ms | 67% faster (with virtualization) |
| Total import | 3100 ms | 2100 ms | 32% faster |

---

## 5. Accessibility & Usability Testing

### 5.1 WCAG 2.1 Level AA Checklist

| Criterion | Test | Status |
|-----------|------|--------|
| **1.4.3 Contrast** | Color contrast ≥ 4.5:1 for text, ≥ 3:1 for UI | ☐ |
| **2.1.1 Keyboard** | All controls reachable/operable via keyboard | ☐ |
| **2.4.1 Bypass** | Skip links for navigation | ☐ |
| **2.4.3 Focus Order** | Logical tab order throughout UI | ☐ |
| **2.4.7 Focus Visible** | Focus indicators clearly visible | ☐ |
| **3.2.1 On Focus** | No unexpected context changes on focus | ☐ |
| **3.3.1 Error ID** | Error messages identify problematic field | ☐ |
| **4.1.2 Name/Role/Value** | Form controls have proper labels & ARIA | ☐ |

### 5.2 Keyboard Navigation Tests

```javascript
// Test all controls are keyboard-accessible
// 1. Tab through all buttons, inputs, and interactive elements
// 2. Verify focus order is logical (top-to-bottom, left-to-right)
// 3. Test Enter/Space to activate buttons
// 4. Test arrow keys in dropdowns and tables
// 5. Test Escape to close modals

// Expected behavior:
// ✓ Tab cycles through all interactive elements
// ✓ Focus indicators always visible
// ✓ No keyboard traps (elements that can't be escaped)
// ✓ Shortcuts documented (e.g., Ctrl+S to save)
```

### 5.3 Screen Reader Testing

- Test with NVDA (Windows) or JAWS
- Verify table headers are marked with `<th>`
- Verify form labels associated with inputs
- Verify ARIA live regions for dynamic content (status messages)
- Document any manual screen reader workarounds needed

---

## 6. Security Review

### 6.1 Input Validation & Sanitization

**Threat:** Malicious Excel files could execute code or expose data

**Mitigations:**

| Check | Implementation | Status |
|-------|---|---|
| File type validation | Check MIME type & .xlsx extension | ☐ |
| File size limit | Reject files > 10 MB | ☐ |
| Excel formula injection | Strip/escape formula prefixes (=, @, +, -) | ☐ |
| XML bomb prevention | Limit entity expansion in ZIP parsing | ☐ |

**Example: Formula Injection Prevention**

```javascript
function sanitizeFormulaContent(value) {
  if (typeof value !== "string") return value;
  // Escape formula prefixes
  if (value.startsWith("=") || value.startsWith("@") || 
      value.startsWith("+") || value.startsWith("-")) {
    return "'" + value;  // Prefix with quote to treat as text
  }
  return value;
}
```

### 6.2 localStorage Security

**Threat:** Sensitive contract data in localStorage could be accessed by other scripts

**Mitigations:**

| Measure | Status |
|---------|--------|
| No passwords in localStorage | ☐ |
| Clear sensitive fields on logout | ☐ |
| Warn user about XSS risks | ☐ |
| Document localStorage limitations | ☐ |

### 6.3 XSS Prevention

**Threat:** Malicious contract titles could inject scripts

**Mitigations:**

```javascript
// Always use textContent for dynamic content (never innerHTML without sanitization)
const td = document.createElement('td');
td.textContent = contract.contractTitle;  // Safe: auto-escaped
// NOT: td.innerHTML = contract.contractTitle;  // Unsafe!
```

### 6.4 CSRF Prevention

For Phase 4 (localStorage only): No CSRF concerns (no state-changing HTTP requests)

For future phases (backend): Implement CSRF tokens

---

## 7. Browser Compatibility Testing

### 7.1 Target Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest 2 versions | ☐ |
| Firefox | Latest 2 versions | ☐ |
| Safari | Latest 2 versions | ☐ |
| Edge | Latest 2 versions | ☐ |

### 7.2 Compatibility Issues & Workarounds

**Issue:** `crypto.randomUUID()` not supported in older browsers

**Workaround:**
```javascript
// Use polyfill function (already in Phase 2 code)
const id = crypto.randomUUID?.() || generateUUID();
```

**Issue:** `FileReader` API variations

**Testing:**
```javascript
if (typeof FileReader === "undefined") {
  console.warn("FileReader not supported");
  // Disable import feature
}
```

**Issue:** `localStorage` disabled in private mode (Safari)

**Testing:**
```javascript
function isLocalStorageAvailable() {
  try {
    const test = "__test";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
```

### 7.3 Compatibility Test Checklist

- [ ] File upload works on all browsers
- [ ] SheetJS parsing works (all support same XLSX API)
- [ ] DOM manipulation works (std HTML5 APIs)
- [ ] Event listeners work (std DOM events)
- [ ] localStorage works (with fallback for private mode)
- [ ] CSS grid/flexbox renders correctly
- [ ] No console errors on any browser

---

## 8. Documentation

### 8.1 User Guide (end-user documentation)

**File:** `docs/CONTRACT_MANAGER_USER_GUIDE.md`

**Sections:**

1. **Getting Started**
   - System requirements (browser, file format)
   - How to access Contract Manager
   - Overview of steps (Import → Mapping → Preview → Save → List)

2. **Importing Contracts**
   - Step-by-step walkthrough with screenshots
   - Supported Excel format (`.xlsx` only)
   - Sheet selection
   - Column mapping explained
   - Error resolution tips

3. **Reviewing & Correcting Mappings**
   - How to change column mappings
   - What each field means
   - Required vs optional fields
   - Confidence scores explained

4. **Preview & Error Handling**
   - How to read the preview table
   - How to interpret error messages
   - Common errors and solutions
   - How to click errors to highlight preview rows

5. **Working with Contracts**
   - Viewing all imported contracts
   - Filtering by status, date, location
   - Searching by contract ID or title
   - Sorting by any column
   - Editing a contract (if Phase 3 includes inline editing)

6. **Troubleshooting**
   - "File is too large" → Split into multiple files
   - "Required field not found" → Adjust mapping
   - "Contracts not saving" → Check browser storage limits
   - "Import takes too long" → Use smaller file or split import

### 8.2 Developer Guide (developer documentation)

**File:** `docs/CONTRACT_MANAGER_DEV_GUIDE.md`

**Sections:**

1. **Architecture Overview**
   - Phase 1–4 summary
   - Module responsibilities
   - Data flow diagram
   - State management overview

2. **Module Reference**
   - `contractColumnMapper.js` API
   - `contractUtils.js` API
   - `contractNormalizer.js` API
   - `contractHandlers.js` API
   - `contractRepository.js` API
   - `contractRenderer.js` API

3. **Adding Features**
   - How to add a new contract field
   - How to add a new filter
   - How to add inline editing for a new field
   - How to integrate with a backend DB

4. **Testing**
   - How to run unit tests
   - How to add new test cases
   - How to run integration tests
   - Performance profiling steps

5. **Debugging**
   - Browser console tricks
   - State inspection
   - localStorage inspection
   - Common issues & fixes

### 8.3 API Reference

**File:** `docs/CONTRACT_MANAGER_API.md`

**Example:**

```markdown
## contractRepository.updateContract(id, patch)

Updates a single contract record.

**Parameters:**
- `id` (string): Internal contract UUID
- `patch` (object): Fields to update (shallow merge)

**Example:**
```javascript
contractRepository.updateContract(
  "550e8400-e29b-41d4-a716-446655440000",
  { status: "fertig", updatedAt: new Date().toISOString() }
);
```

**Side Effects:**
- Mutates `state.contracts.records`
- Triggers `stateChanged` event
- Persists changes to localStorage
```

---

## 9. Production Readiness Checklist

### 9.1 Pre-Launch Verification

- [ ] All unit tests pass (45+ test cases)
- [ ] All integration workflows tested end-to-end
- [ ] Performance benchmarks met (import < 3000 ms)
- [ ] No critical security issues identified
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] All target browsers tested
- [ ] Documentation complete & accurate
- [ ] No console errors or warnings
- [ ] localStorage size estimated (< 5 MB for typical dataset)

### 9.2 Monitoring & Logging Setup

```javascript
// Add basic error logging for production
function logError(context, error) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack
  };
  console.error(logEntry);
  // In future: send to external logging service
}

// Wrap critical functions
try {
  await importContractFile(file);
} catch (err) {
  logError("contract_import", err);
  showUserError("Import failed. Please try again or contact support.");
}
```

### 9.3 Rollback Plan

- Keep previous version accessible as backup
- Document known issues and workarounds
- Have process to revert to Phase 3 if critical bugs discovered

---

## 10. Phase 4 Deliverables Checklist

### Testing

- [ ] 45+ unit test cases defined and passing
- [ ] 3 major integration workflows tested
- [ ] Test documentation & scripts provided
- [ ] Performance profiling results documented
- [ ] Performance optimizations implemented

### Quality Assurance

- [ ] Accessibility audit completed (WCAG 2.1 AA)
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Security review completed
- [ ] Browser compatibility verified (4 browsers)

### Documentation

- [ ] User Guide (`CONTRACT_MANAGER_USER_GUIDE.md`)
- [ ] Developer Guide (`CONTRACT_MANAGER_DEV_GUIDE.md`)
- [ ] API Reference (`CONTRACT_MANAGER_API.md`)
- [ ] Test documentation
- [ ] Deployment checklist
- [ ] Known issues & limitations documented

### Code Quality

- [ ] All functions documented with JSDoc comments
- [ ] Consistent code style applied (same as Abrechnung)
- [ ] No TODO or FIXME comments left behind
- [ ] Error messages are user-friendly
- [ ] No memory leaks detected

---

## 11. Known Limitations & Future Enhancements

### 11.1 Phase 4 Limitations

1. **localStorage Limits**
   - Max ~5-10 MB per origin (browser-dependent)
   - Not suitable for 10,000+ contracts long-term
   - **Solution:** Implement backend DB in Phase 5+

2. **No Multi-File Import**
   - Can only import one file at a time
   - **Solution:** Batch import UI (future phase)

3. **No Contract Deletion UI**
   - Only available via API/console
   - **Solution:** Add delete button with confirmation dialog (Phase 5+)

4. **No Export Functionality**
   - Can import but not export contracts to Excel
   - **Solution:** Add export feature (Phase 5+)

5. **No Change History**
   - No audit trail of edits
   - **Solution:** Implement versioning (Phase 5+)

### 11.2 Future Enhancements (Post-Phase 4)

- [ ] Backend database integration (REST API)
- [ ] User authentication & authorization
- [ ] Advanced filtering (nested conditions)
- [ ] Bulk operations (update multiple contracts)
- [ ] Export to Excel/CSV
- [ ] Report generation
- [ ] Change history & audit log
- [ ] Batch import multiple files
- [ ] Contract linking & relationships
- [ ] Workflow/approval states
- [ ] Mobile app / Progressive Web App (PWA)

---

## 12. Sign-Off & Release Notes

### 12.1 Release v1.0 (Phase 4 Complete)

**Version:** 1.0  
**Release Date:** December 2025  
**Status:** Production-Ready

**Features:**
- ✓ Import contracts from Excel files
- ✓ Auto-detect and adjust column mappings
- ✓ Validate data before import
- ✓ Preview import results
- ✓ Save contracts to browser storage
- ✓ Filter, search, and sort contracts
- ✓ Edit individual contracts
- ✓ 45+ automated tests
- ✓ Full documentation

**Browser Support:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Limitations:**
- localStorage limited to ~5-10 MB
- Single file import only
- No export functionality
- No change history

**Known Issues:**
- None critical

---

## 13. Appendix: Test Execution Guide

### 13.1 Running Unit Tests Manually

**Setup:**
```bash
# No build required; tests run in browser console
# Open any page with Contract Manager loaded
```

**Execute:**
```javascript
// In browser console:
Object.keys(window)  // Should include contractUtils, contractColumnMapper, etc.

// Run individual tests:
console.log("Testing inferColumnType...");
testInferColumnType();  // Runs test suite

console.log("Testing discoverContractSheets...");
testDiscoverContractSheets();  // Runs test suite

// View results
// ✓ test passed
// ✗ test failed (assertion error shown)
```

### 13.2 Performance Profiling

**Using DevTools:**

1. Open DevTools → Performance tab
2. Click record
3. Execute import workflow
4. Stop recording
5. Analyze timeline

**Checklist:**
- [ ] File read: < 500 ms
- [ ] Discovery: < 200 ms
- [ ] Extraction: < 2000 ms
- [ ] Total: < 3000 ms
- [ ] No long tasks (> 50 ms)

### 13.3 Accessibility Testing

**Using WAVE (WebAIM):**
1. Install WAVE browser extension
2. Open Contract Manager page
3. Run WAVE scan
4. Review errors & warnings
5. Document any false positives

---

## 14. Sign-Off

**Document Version:** 1.0  
**Created:** December 9, 2025  
**Status:** Ready for Implementation  
**Author:** AI Research Agent  
**Approval:** (Pending stakeholder review)

---

**End of Phase 4 Specification**

**End of Complete Contract Manager Module Specification (Phases 1–4)**
