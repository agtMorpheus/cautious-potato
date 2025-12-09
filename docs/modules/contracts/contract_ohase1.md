# Contract Manager Module – Phase 1: Analysis & Foundation

**Duration:** Weeks 1–2  
**Status:** Planned  
**Last Updated:** December 9, 2025

---

## 1. Overview

Phase 1 establishes the foundation for the Contract Manager module by analyzing the structure of `1406-Auftrage-2025.xlsx`, defining data models, and preparing the development environment. This phase ensures the development team understands the Excel file format, business requirements, and architectural constraints before implementing parsing and import logic.

---

## 2. Source File Analysis: 1406-Auftrage-2025.xlsx

### 2.1 File Structure

**Total Sheets:** 22 sheets  
**Primary Data Sheet:** `Fertige Aufträge Komplett 1406` (main contracts list)  
**Distribution Sheets:** Multiple "Verteiler" (distributor) sheets for specific contract categories

#### Sheet Inventory

| # | Sheet Name | Purpose | Priority |
|---|---|---|---|
| 1 | Fertige Aufträge Komplett 1406 | Complete finished contracts 1406 | **HIGH** |
| 2 | Alt Noch Offen 1406_1472_1614 | Legacy open contracts | MEDIUM |
| 3–13 | 1406 Verteiler \* | Distribution sheets for contract 1406 variants | MEDIUM |
| 14–16 | 1614 Verteiler \*, 1559 Verteiler \* | Distribution sheets for contracts 1614, 1559 | LOW |
| 17–21 | 1472 \* | Contract 1472 variants (01_25, 13_06, 09_07, NRA 2025, NRA 257308) | MEDIUM |
| 22 | Einzelauträge | Individual/single contracts | LOW |

**Initial Focus:** Phase 1 concentrates on **Sheet 1 (Fertige Aufträge Komplett 1406)** as the primary data source. Other sheets will be supported in Phase 2–3.

---

### 2.2 Discovered Column Headers (First Row)

Based on analysis of the Excel file structure, the following columns are identified. Each column has:
- A logical name (e.g., "Auftrag" = Order/Contract)
- Excel column letter (A, B, C, …)
- Inferred data type (string, date, number)
- Visibility status (visible or hidden)

#### Core Contract Fields

| # | Column | Header (German) | Key | Type | Visible | Priority | Purpose |
|---|--------|---|---|---|---|---|---|
| 1 | A | Auftrag | contract_id | String | Yes | **HIGH** | Unique contract number (Business Key) |
| 2 | B | Aufgabe | task_id | String | Hidden | MEDIUM | Task/subtask identifier |
| 3 | C | Aufgabenart | task_type | String | Hidden | MEDIUM | Type of task (e.g., "Prüfung", "Messung") |
| 4 | D | Melder | reporter | String | Hidden | MEDIUM | Who reported/created the contract |
| 5 | E | Meldedatum | reported_date | Date | Hidden | MEDIUM | Date of report |
| 6 | F | Auftragskopftitel | contract_title | String | Yes | **HIGH** | Main contract title/description |
| 7 | G | Beschreibung | description | String | Hidden | LOW | Detailed description |
| 8 | H | Standort | location | String | Yes | **HIGH** | Site/location where work is performed |
| 9 | I | Säule/Raum | room_area | String | Yes | **HIGH** | Room/area/sector designation |
| 10 | J | Anlagennummer | equipment_id | String | Yes | **HIGH** | Equipment/installation number |
| 11 | K | VASS | vass_code | String | Hidden | LOW | Internal system code |
| 12 | L | Anlagenbeschreibung | equipment_description | String | Yes | **HIGH** | Description of equipment |
| 13 | M | Status | status | String | Yes | **HIGH** | Contract status (e.g., "INBEARB", "fertig") |
| 14 | N | Workorder Kst. | workorder_code | String | Yes | MEDIUM | Work order cost center code |
| 15 | O | Sollstart | planned_start | Date | Yes | MEDIUM | Planned start date |
| 16 | P | Seriennummer | serial_number | String | Yes | MEDIUM | Serial number of equipment |
| 17 | Q | IH-Gruppe | ih_group | String | Hidden | LOW | Internal hierarchy group |
| 18 | R | Statusmemo | status_memo | String | Hidden | LOW | Status notes/comments |
| 19 | S | Anhänge vorhanden? | has_attachments | String | Hidden | LOW | Whether attachments exist |
| 20 | T | XML/IZY | xml_izy_flag | String | Hidden | LOW | XML/IZY integration flag |
| 21 | U | W/I-Plan | plan_flag | String | Hidden | LOW | Planning flag |
| 22 | V | Arbeitsplan | work_plan | String | Hidden | LOW | Work plan reference |
| 23 | W | In Ordnung? | is_ok | String | Hidden | LOW | OK/problem status |
| 24–27 | X–AA | (Numeric Codes) | (Various) | Number/String | Mixed | LOW | System-specific numeric codes |

**Note:** Columns B, C, D, E, G, K, Q, R, S, T, U, V, W are currently hidden in the Excel file. This is intentional. The visible columns (A, F, H, I, J, L, M, N, O, P) represent the user-facing contract view.

---

### 2.3 Data Sample & Patterns

**Example Data Row (Row 2):**

```
Auftrag:              "1406" (string)
Aufgabe:              "101473" (string)
Aufgabenart:          "Prüfen/Messen nach DGUV V3" (string)
Melder:               "MAXADMIN / 05361-9-0" (string)
Meldedatum:           (date)
Auftragskopftitel:    "EPRUF" (string)
Beschreibung:         "Prüfen/Messen nach DGUV V3" (string)
Standort:             "Straßenbeleuchtung" (string)
Säule/Raum:           "1100-0BV01-EG" (string)
Anlagennummer:        "1100-00003-HG-B22" (string)
Status:               "INBEARB" (string - appears to be: INBEARB, fertig, etc.)
Workorder Kst.:       "Kst. 1472 VL // DGUV V3 Prüfung" (string)
Sollstart:            2025-06-02 (date)
Seriennummer:         "FST Dormakaba ES200 2D 2" (string)
```

**Observed Data Patterns:**

- **Contract ID (Column A):** Numeric strings like "1406", "1472", "1614", "1559". These appear to be **project or contract category codes**, not unique IDs per row.
- **Status Values:** Observed values include "INBEARB" (in progress), "fertig" (finished). Likely enumerated.
- **Dates:** ISO format (YYYY-MM-DD), e.g., 2025-06-02.
- **Equipment/Location Fields:** Structured format with dashes, e.g., "1100-0BV01-EG", "1100-00003-HG-B22".
- **Multiple Rows per Contract:** A single contract (e.g., "1406") may have multiple rows representing different tasks or phases within that contract.

---

### 2.4 Data Volume & Scale

- **Rows per Sheet:** Approximately 1,000–5,000+ (to be verified during import testing).
- **Total Columns:** 27 (A–AA).
- **Shared Strings:** 12,507 shared string entries (text data pool).
- **File Size:** ~1.8 MB (typical for 22 sheets with formatting and external links).

**Implication:** File parsing must handle moderate data volume (1000–5000 rows × 27 cols). Performance is not critical for initial MVP, but should be monitored (Phase 6).

---

## 3. Business Requirements & Use Cases

### 3.1 Primary Use Case: Import & Catalog Contracts

**Actor:** Project Manager / Administrator  
**Goal:** Import contract data from `1406-Auftrage-2025.xlsx` into the web application for centralized management.

**Flow:**
1. User uploads an Excel file (any sheet from the workbook).
2. Application discovers and displays available sheets and columns.
3. User selects a sheet and (optionally) adjusts column mapping.
4. Application validates and normalizes data.
5. User reviews import preview (contracts, errors, warnings).
6. User confirms import → contracts saved to local DB.

### 3.2 Secondary Use Cases

- **Filter & Search:** Display contracts by status, location, equipment ID, date range.
- **Edit & Update:** Modify contract fields in the UI (status, notes, etc.).
- **Export:** Export filtered contract list back to Excel (optional, Phase 3+).
- **Reporting:** Generate summary reports (e.g., contracts by status, by location).

---

## 4. Data Model Definition

### 4.1 Normalized Contract Object

All imported contract records are normalized into this standard schema for internal use:

```javascript
{
  // Internal identifiers
  id: "550e8400-e29b-41d4-a716-446655440000",  // UUID (generated on import)
  internalKey: "1406_task_101473_row_2",        // Composite key for deduplication
  
  // Core contract data
  contractId: "1406",                            // From Column A (business key)
  contractTitle: "EPRUF",                        // From Column F
  taskId: "101473",                              // From Column B
  taskType: "Prüfen/Messen nach DGUV V3",       // From Column C
  
  // Location & equipment
  location: "Straßenbeleuchtung",                // From Column H
  roomArea: "1100-0BV01-EG",                    // From Column I
  equipmentId: "1100-00003-HG-B22",             // From Column J (unique per location)
  equipmentDescription: "FSA GEZE TS 5000...",  // From Column L
  serialNumber: "FS-657808",                    // From Column P
  
  // Contract management
  status: "INBEARB",                             // From Column M (enum)
  workorderCode: "Kst. 1472 VL // DGUV V3 Prüfung", // From Column N
  reportedBy: "MAXADMIN / 05361-9-0",           // From Column D
  plannedStart: "2025-06-02",                   // From Column O (ISO string)
  
  // Metadata for tracking
  sourceFile: {
    fileName: "1406-Auftrage-2025.xlsx",
    sheet: "Fertige Aufträge Komplett 1406",
    rowIndex: 2,
    importedAt: "2025-12-09T16:30:00Z"
  },
  
  // Audit trail
  createdAt: "2025-12-09T16:30:00Z",
  updatedAt: "2025-12-09T16:30:00Z",
  importVersion: 1
}
```

### 4.2 State Slice: `contracts`

The application state is extended with a `contracts` section:

```javascript
state.contracts = {
  // Import metadata
  importedFiles: [
    {
      fileName: "1406-Auftrage-2025.xlsx",
      size: 1826024,
      importedAt: "2025-12-09T16:30:00Z",
      sheets: ["Fertige Aufträge Komplett 1406", "Alt Noch Offen 1406_1472_1614"],
      recordsImported: 1250,
      recordsWithErrors: 3
    }
  ],
  
  // Discovered sheet metadata (for mapping UI)
  rawSheets: {
    "Fertige Aufträge Komplett 1406": {
      sheetName: "Fertige Aufträge Komplett 1406",
      rowCount: 1250,
      columns: [
        { index: 0, letter: "A", header: "Auftrag", type: "string", visible: true },
        { index: 1, letter: "B", header: "Aufgabe", type: "string", visible: false },
        // ... more columns
      ]
    }
  },
  
  // Current column mapping for active import
  currentMapping: {
    contractId: "A",           // Excel column letter
    contractTitle: "F",
    taskId: "B",
    status: "M",
    location: "H",
    // ... all mapped fields
  },
  
  // Normalized contract records
  records: [
    { id: "...", contractId: "1406", ... },
    // ... more contracts
  ],
  
  // UI state for filtering/searching
  filters: {
    contractId: null,           // Filter by contract ID (e.g., "1406", "1472")
    status: null,               // Filter by status (e.g., "INBEARB")
    location: null,             // Filter by location
    equipmentId: null,          // Filter by equipment
    dateRange: { from: null, to: null }, // Planned start date range
    searchText: ""              // Free-text search across all fields
  },
  
  // Import state (for UI progress/feedback)
  importState: {
    isImporting: false,
    currentFile: null,
    currentSheet: null,
    progress: 0,                // 0–100 (%)
    errors: [],
    warnings: []
  }
}
```

### 4.3 Column Mapping Configuration

The mapping configuration defines how discovered Excel columns map to contract object fields:

```javascript
const defaultColumnMapping = {
  // Required fields (import fails if missing)
  contractId: { excelColumn: "A", type: "string", required: true },
  contractTitle: { excelColumn: "F", type: "string", required: true },
  status: { excelColumn: "M", type: "string", required: true },
  
  // Recommended fields (import continues if missing, but marked as incomplete)
  location: { excelColumn: "H", type: "string", required: false },
  equipmentId: { excelColumn: "J", type: "string", required: false },
  plannedStart: { excelColumn: "O", type: "date", required: false },
  
  // Optional fields
  taskId: { excelColumn: "B", type: "string", required: false },
  taskType: { excelColumn: "C", type: "string", required: false },
  description: { excelColumn: "G", type: "string", required: false },
  roomArea: { excelColumn: "I", type: "string", required: false },
  equipmentDescription: { excelColumn: "L", type: "string", required: false },
  serialNumber: { excelColumn: "P", type: "string", required: false },
  workorderCode: { excelColumn: "N", type: "string", required: false },
  reportedBy: { excelColumn: "D", type: "string", required: false }
};
```

---

## 5. Validation Rules & Data Quality

### 5.1 Mandatory Field Validation

On import, these fields **must** have non-empty values:

| Field | Rule | Error Message |
|---|---|---|
| `contractId` | Non-empty string | "Contract ID is required" |
| `contractTitle` | Non-empty string | "Contract title is required" |
| `status` | One of: `INBEARB`, `fertig`, `offen` (extendable) | "Invalid status value" |

**If mandatory field is missing or invalid:**
- Row is marked with error.
- Entire contract record is skipped.
- Error logged with row number and field name.
- User can proceed with import (partial import).

### 5.2 Type Conversions

| Field | Source Type | Target Type | Conversion Rule | Fallback |
|---|---|---|---|---|
| `plannedStart` | Excel date (serial) | ISO 8601 string | `YYYY-MM-DD` | Skip field (optional) |
| `status` | String (any case) | Enum (lowercase) | Trim & lowercase | Original value + warning |
| `contractId` | Any | String | `toString()` | Empty string (error) |

### 5.3 Data Cleanup

- **Whitespace:** Trim leading/trailing spaces from all string fields.
- **Case normalization:** Status and enums converted to lowercase.
- **Null/empty handling:** Empty cells become `null` (except required fields).
- **Duplicate detection:** If same row (by all fields) appears twice, count as 1 record; warn user.

---

## 6. Development Environment Setup

### 6.1 Directory Structure

Extend the existing Abrechnung app structure with a `contracts` module:

```
project-root/
├── index.html                  (updated with Contract Manager section)
├── css/
│   ├── styles.css              (existing)
│   └── contracts.css           (NEW: Contract Manager styling)
├── js/
│   ├── state.js                (UPDATED: add contracts slice)
│   ├── handlers.js             (UPDATED: add contract handlers)
│   ├── utils.js                (UPDATED: add contract utilities)
│   ├── main.js                 (UPDATED: initialize contracts)
│   ├── contracts/              (NEW: Contract Manager module)
│   │   ├── contractHandlers.js (NEW: Contract-specific event handlers)
│   │   ├── contractUtils.js    (NEW: Contract parsing & normalization)
│   │   ├── contractRepository.js (NEW: Data access abstraction)
│   │   └── contractRenderer.js (NEW: UI rendering)
├── lib/
│   └── xlsx.min.js             (existing SheetJS library)
├── templates/                  (NEW: optional)
│   └── contractImportTemplate.html
├── data/
│   └── 1406-Auftrage-2025.xlsx (test file)
└── docs/
    ├── roadmap.md              (existing)
    └── contract_manager_phase1.md (this file)
```

### 6.2 External Dependencies

**No new external libraries.** Continue with existing stack:

- **SheetJS (XLSX):** Already integrated for Abrechnung module. Reuse for contract parsing.
- **JavaScript ES6 Modules:** Native browser modules (no build step required).
- **localStorage API:** Native browser persistence (same as Abrechnung).
- **HTML5 Fetch API:** For future REST API integration (Phase 2+).

### 6.3 Development Tools & Testing

**Browser Console Testing:**
- Simple manual tests using browser console.
- Log output from parsing functions.
- Inspect state mutations.

**Optional Tools (for developers):**
- VS Code with "Live Server" extension (local HTTP server for testing).
- Firefox/Chrome DevTools for debugging.
- Git for version control (same as Abrechnung).

---

## 7. Phase 1 Deliverables

### 7.1 Documentation

✓ **This document** (contract_manager_phase1.md)
- File structure analysis
- Data model definition
- Business requirements
- Validation rules

✓ **Internal Specification** (internal_spec_contracts.md – optional)
- Pseudo-code for parsing logic
- State mutation diagrams
- Error handling flowchart

### 7.2 Code Scaffolding

✓ **Updated state.js**
- Add `contracts` slice to initial state
- Implement state API: `addContractFile()`, `setContracts()`, `setContractFilters()`, etc.
- Add localStorage integration for contracts

✓ **Updated handlers.js**
- Stub event handlers: `handleContractFileInput()`, `handleContractMappingChange()`, `handleContractImportConfirm()`
- Wire up event listeners in `initializeEventListeners()`

✓ **New Module: contracts/contractUtils.js**
- Function stubs:
  - `discoverContractSheets(workbook)` – identify sheets and columns
  - `suggestContractColumnMapping(discoveredColumns)` – auto-map columns
  - `extractContractsFromSheet(workbook, sheetName, mapping)` – parse and normalize data

✓ **Updated index.html**
- Add "Contract Manager" section (disabled/placeholder)
- File input, sheet selector, mapping UI (basic)
- Preview table placeholder

✓ **Unit Test Plan** (testplan_contracts_phase1.md – optional)
- Test scenarios for parsing, validation, state management
- Manual test checklist for browser console

### 7.3 Validation Checklist

- [ ] File `1406-Auftrage-2025.xlsx` analyzed; all 22 sheets cataloged
- [ ] Column headers extracted; mapping configuration defined
- [ ] Data model (contract object) finalized and documented
- [ ] State slice (`contracts`) integrated into `state.js`
- [ ] Event handler stubs created and wired
- [ ] Sample contracts from Excel successfully logged to browser console
- [ ] Project directory structure ready for Phase 2
- [ ] All team members understand the contract data format

---

## 8. Handoff to Phase 2

**Phase 1 Exit Criteria:**

1. **Documentation Complete:** Architecture, data model, and business rules documented and approved.
2. **Environment Ready:** File structure set up; SheetJS library verified working.
3. **State Layer Extended:** `contracts` slice integrated; tests pass.
4. **Parsing Stub Ready:** `contractUtils.js` stubs compile; SheetJS integration confirmed.
5. **HTML Placeholder Ready:** Index.html updated with Contract Manager section placeholder.

**Phase 2 Focus:**
- Implement `discoverContractSheets()` and `suggestContractColumnMapping()` (Excel discovery).
- Implement `extractContractsFromSheet()` (data parsing and normalization).
- Add column mapping UI allowing user to adjust auto-detected mappings.
- Add import preview table showing validated contracts and errors.

---

## 9. Risk Assessment & Mitigations (Phase 1)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Excel file structure changes in future | Medium | High | Document expected format; version control templates; validate on import |
| Multiple contract ID interpretations (business key vs row identifier) | Low | High | Clarify with business stakeholder which field is primary key |
| Performance issues with 5000+ rows | Low | Medium | Profile in Phase 6; implement lazy-loading if needed |
| Hidden columns cause confusion | Low | Low | Document visible vs hidden columns clearly; test with unhiding |

---

## 10. References & Appendix

### 10.1 Related Documents

- `roadmap.md` – Overall app roadmap (Abrechnung + Contract Manager)
- `description.md` – Abrechnung app technical overview
- Phase 2 Roadmap (TBD) – Parser implementation
- Phase 3 Roadmap (TBD) – UI & database integration

### 10.2 External References

- [SheetJS Documentation](https://sheetjs.com/docs/) – Excel parsing library
- [ES6 Modules in Browsers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### 10.3 Glossary

| Term | Definition |
|---|---|
| **Contract** | A service or work order (e.g., "1406", "1472") with associated tasks and equipment |
| **Task** | A subtask within a contract (e.g., "101473") representing a specific inspection or measurement |
| **Equipment ID** | Unique identifier for a device or location (e.g., "1100-00003-HG-B22") |
| **Status** | State of the contract (e.g., "INBEARB" = in progress, "fertig" = finished) |
| **Mapping** | Configuration defining how Excel columns map to contract object fields |
| **Normalization** | Process of converting raw Excel data into standardized contract objects |
| **Local DB** | Browser localStorage used for persistent state (Phase 1–2); future: REST API + backend DB |

### 10.4 Example: Full Import Flow (Phase 1–2 Preview)

```
User uploads "1406-Auftrage-2025.xlsx"
  ↓
contractUtils.discoverContractSheets()
  → Identifies sheets, columns, data types
  ↓
contractUtils.suggestContractColumnMapping()
  → Auto-maps columns (A→contractId, F→contractTitle, etc.)
  ↓
UI shows mapping editor
User confirms (or adjusts) mapping
  ↓
contractUtils.extractContractsFromSheet()
  → Parses rows, normalizes data, validates
  → Returns: { contracts: [...], errors: [...], warnings: [...] }
  ↓
UI shows import preview (success count, error list)
User confirms import
  ↓
handlers.handleContractImportConfirm()
  → state.addImportedContractFile(...)
  → state.setContracts(...)
  ↓
state.saveState() to localStorage
  ↓
UI displays: "1250 contracts imported successfully"
UI renders contract list with filters
```

---

## 11. Sign-Off

**Document Version:** 1.0  
**Created:** December 9, 2025  
**Status:** Ready for Implementation  
**Author:** AI Research Agent  
**Approval:** (Pending stakeholder review)

---

**End of Phase 1 Specification**
