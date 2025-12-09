# Protokoll Manager Module – Phase 1: Analysis & Foundation

**Duration:** Weeks 1–2  
**Status:** Planned  
**Last Updated:** December 9, 2025

---

## 1. Overview

Phase 1 establishes the foundation for the Protokoll Manager module by analyzing the structure of `protokoll.xlsx`, defining data models, and preparing the development environment. This phase ensures the development team understands the Excel file format, business requirements, and architectural constraints before implementing parsing and import logic.

The Protokoll (inspection protocol) module is the **first step** in the Abrechnung application workflow. Users import inspection protocol data from `protokoll.xlsx`, which is then processed to generate billing documents.

---

## 2. Source File Analysis: protokoll.xlsx

### 2.1 File Structure

**Total Sheets:** 1 (primary)  
**Primary Data Sheet:** `Vorlage` (Template)  
**Purpose:** Inspection protocol for VDE 0100 testing of stationary installations

#### Sheet Inventory

| # | Sheet Name | Purpose | Priority |
|---|---|---|---|
| 1 | Vorlage | Inspection protocol template with metadata and position data | **HIGH** |

**Initial Focus:** Phase 1 concentrates on **Sheet "Vorlage"** as the primary data source.

---

### 2.2 Header Region: Metadata Cells (Rows 1-15)

Based on analysis of the Excel file structure, the following metadata fields are identified in specific cell locations:

#### Core Metadata Fields

| # | Cell | Field (German) | Key | Type | Priority | Purpose |
|---|------|---|---|---|---|---|
| 1 | D3 | Dokument-Typ | document_type | String | LOW | Document type (e.g., "Prüfung stationärer Anlagen, Prüfprotokoll VDE 0100") |
| 2 | U3 | Protokoll-Nr. | protocol_number | String | **HIGH** | Unique protocol identifier (e.g., "EDB101120250925") |
| 3 | AL3 | Blatt | sheet_number | String | LOW | Sheet number within protocol (e.g., "1 von 3") |
| 4 | A5 | Auftraggeber | client | String | MEDIUM | Client/customer (e.g., "Volkswagen AG, Werk Wolfsburg") |
| 5 | N5 | Auftrag Nr. | order_number | String | **HIGH** | Order/contract number (e.g., "A5937814") |
| 6 | Y5 | Kunden Nr. | customer_number | String/Number | MEDIUM | Customer number (e.g., "1406") |
| 7 | A7 | Ort | city | String | LOW | Location/city (e.g., "Volkswagen AG, Werk Wolfsburg") |
| 8 | D8 | Adresse | address | String | LOW | Street address (e.g., "Berliner Ring 2, 38436 Wolfsburg") |
| 9 | T7 | Firma | company | String | **HIGH** | Inspection company (e.g., "EAW Wolfsburg") |
| 10 | W8 | Firma Adresse | company_address | String | LOW | Company address (e.g., "Dieselstraße 27, 38446 Wolfsburg") |
| 11 | A10 | Anlage | plant | String | **HIGH** | Installation/system identifier (e.g., "LV-UM-Mb-55") |
| 12 | T10 | Einsatzort | location | String | **HIGH** | Deployment location (e.g., "Halle 3, Feld Mb55") |
| 13 | AH10 | INV | inventory_number | String | LOW | Inventory number (e.g., "E03150AP17000000226") |

**Note:** High-priority fields (protocol_number, order_number, company, plant, location) are required for the Abrechnung generation workflow. Other fields are optional but useful for documentation.

---

### 2.3 Data Region: Position Table (Rows 30-325)

The position data starts at approximately row 30 and can extend to row 325 or beyond.

#### Position Data Columns

| Column | Header (German) | Key | Type | Priority | Purpose |
|--------|---|---|---|---|---|
| A | Pos.Nr. | pos_nr | String | **HIGH** | Position number code (e.g., "01.01.0010.", "01.01.0020.") |
| B-W | (Various) | - | Various | LOW | Measurement data, test results, comments |
| X | Menge | quantity | Number | **HIGH** | Quantity/count for this position |
| (Fallback B) | Menge | quantity | Number | MEDIUM | Alternative quantity column |
| (Fallback C) | Menge | quantity | Number | MEDIUM | Alternative quantity column |

**Position Number Format:**
- Hierarchical codes: `01.`, `01.01.`, `01.01.0010.`
- Full position codes end with `.` and have 4+ digits in the last segment
- Parent categories (e.g., `01.`, `01.01.`) are used for grouping

**Quantity Column Detection:**
The application checks columns in this order: **X**, **B**, **C**. The first column with valid numeric data is used.

---

### 2.4 Data Sample & Patterns

**Example Metadata (Header Region):**

```
Cell U3:  "EDB101120250925"              (Protokoll-Nr.)
Cell N5:  "A5937814"                      (Auftrag Nr.)
Cell A10: "LV-UM-Mb-55"                   (Anlage)
Cell T10: "Halle 3, Feld Mb55"            (Einsatzort)
Cell T7:  "EAW Wolfsburg"                 (Firma)
Cell A5:  "Volkswagen AG, Werk Wolfsburg" (Auftraggeber)
```

**Example Position Data (Rows 30+):**

```
Row 30: Pos.Nr. "01.01.0010.", Menge: 2
Row 31: Pos.Nr. "01.01.0010.", Menge: 3    (same position, second measurement)
Row 32: Pos.Nr. "01.01.0020.", Menge: 1
Row 33: Pos.Nr. "01.01.0030.", Menge: 5
Row 34: Pos.Nr. "01.01.0030.", Menge: 7    (same position, second measurement)
...
```

**Observed Data Patterns:**

- **Position Numbers:** Hierarchical codes with trailing period (e.g., "01.01.0010.")
- **Multiple Rows per Position:** A single Pos.Nr. may appear multiple times (different measurements or tests)
- **Aggregation Required:** Sum all quantities for each unique Pos.Nr. before export
- **Empty Rows:** Some rows may be empty or contain only partial data; skip these
- **Non-Numeric Quantities:** Some cells may contain text or formulas; validate before parsing

---

### 2.5 Data Volume & Scale

- **Rows per Protocol:** Approximately 30–300 position entries
- **Total Columns:** ~50 (A–AZ)
- **Active Data Range:** Rows 30–325, Columns A–X primarily
- **File Size:** ~500KB–2MB (depending on formatting and embedded content)

**Implication:** File parsing must handle moderate data volume. Performance is not critical for typical protocols, but error handling for malformed data is important.

---

## 3. Business Requirements & Use Cases

### 3.1 Primary Use Case: Import Protokoll Data

**Actor:** Technician / Project Administrator  
**Goal:** Import inspection protocol data from `protokoll.xlsx` into the web application for billing document generation.

**Flow:**
1. User uploads a `protokoll.xlsx` file.
2. Application reads the `Vorlage` sheet.
3. Application extracts metadata from header cells.
4. Application extracts position data from data rows.
5. Application validates data and reports any issues.
6. User reviews import summary (metadata, position count, warnings).
7. User confirms import → protokoll data saved to local state.

### 3.2 Secondary Use Cases

- **Preview Data:** Display imported metadata and position summary before Abrechnung generation.
- **Re-import:** Clear existing data and import a new protokoll file.
- **Error Recovery:** Handle malformed files gracefully with clear error messages.

---

## 4. Data Model Definition

### 4.1 Normalized Protokoll Metadata Object

All imported protocol metadata is normalized into this standard schema for internal use:

```javascript
{
  // Protocol identification
  protocolNumber: "EDB101120250925",        // From Cell U3 (unique protocol ID)
  orderNumber: "A5937814",                   // From Cell N5 (order/contract number)
  customerNumber: "1406",                    // From Cell Y5 (customer reference)
  
  // Location information
  plant: "LV-UM-Mb-55",                      // From Cell A10 (Anlage)
  location: "Halle 3, Feld Mb55",            // From Cell T10 (Einsatzort)
  inventoryNumber: "E03150AP17000000226",   // From Cell AH10 (INV)
  
  // Client information
  client: "Volkswagen AG, Werk Wolfsburg",  // From Cell A5 (Auftraggeber)
  city: "Volkswagen AG, Werk Wolfsburg",    // From Cell A7 (Ort)
  address: "Berliner Ring 2, 38436 Wolfsburg", // From Cell D8 (Adresse)
  
  // Inspection company
  company: "EAW Wolfsburg",                  // From Cell T7 (Firma)
  companyAddress: "Dieselstraße 27, 38446 Wolfsburg", // From Cell W8
  
  // Document metadata
  documentType: "Prüfung stationärer Anlagen, Prüfprotokoll VDE 0100", // From Cell D3
  sheetNumber: "1 von 3",                    // From Cell AL3 (Blatt)
  
  // Import tracking
  importedAt: "2025-12-09T16:30:00Z",       // ISO timestamp of import
  sourceFileName: "protokoll_A5937814.xlsx", // Original file name
  
  // Extracted date (if available)
  date: "2025-09-25"                         // ISO date (derived from protocol number or separate field)
}
```

### 4.2 Position Entry Object

Each position entry is normalized into this structure:

```javascript
{
  posNr: "01.01.0010.",                      // Position number code
  menge: 2,                                  // Quantity value (number)
  row: 30,                                   // Source row for traceability
  valid: true                                // Whether entry passed validation
}
```

### 4.3 State Slice: `protokollData`

The application state includes a `protokollData` section:

```javascript
state.protokollData = {
  // Extracted metadata from header cells
  metadata: {
    protocolNumber: "EDB101120250925",
    orderNumber: "A5937814",
    plant: "LV-UM-Mb-55",
    location: "Halle 3, Feld Mb55",
    company: "EAW Wolfsburg",
    client: "Volkswagen AG, Werk Wolfsburg",
    date: "2025-09-25",
    // ... other fields
    importedAt: "2025-12-09T16:30:00Z",
    sourceFileName: "protokoll_A5937814.xlsx"
  },
  
  // Array of extracted position entries
  positionen: [
    { posNr: "01.01.0010.", menge: 2, row: 30, valid: true },
    { posNr: "01.01.0010.", menge: 3, row: 31, valid: true },
    { posNr: "01.01.0020.", menge: 1, row: 32, valid: true },
    // ... more positions
  ]
}
```

### 4.4 Cell Reference Configuration

The cell reference configuration defines where to find metadata in the protokoll file:

```javascript
const PROTOKOLL_CELL_MAPPING = {
  // Required fields (import fails if missing)
  protocolNumber: { cell: "U3", type: "string", required: true },
  orderNumber: { cell: "N5", type: "string", required: true },
  plant: { cell: "A10", type: "string", required: true },
  location: { cell: "T10", type: "string", required: true },
  company: { cell: "T7", type: "string", required: true },
  
  // Optional fields (import continues if missing)
  client: { cell: "A5", type: "string", required: false },
  customerNumber: { cell: "Y5", type: "string", required: false },
  city: { cell: "A7", type: "string", required: false },
  address: { cell: "D8", type: "string", required: false },
  companyAddress: { cell: "W8", type: "string", required: false },
  documentType: { cell: "D3", type: "string", required: false },
  sheetNumber: { cell: "AL3", type: "string", required: false },
  inventoryNumber: { cell: "AH10", type: "string", required: false }
};

const PROTOKOLL_POSITION_CONFIG = {
  startRow: 30,                             // First data row
  endRow: 325,                              // Last data row (or scan until empty)
  posNrColumn: "A",                         // Column for position number
  quantityColumnFallbacks: ["X", "B", "C"]  // Columns to check for quantity (in order)
};
```

---

## 5. Validation Rules & Data Quality

### 5.1 Mandatory Field Validation

On import, these fields **must** have non-empty values:

| Field | Rule | Error Message |
|---|---|---|
| `protocolNumber` | Non-empty string | "Protokoll-Nr. ist erforderlich (Zelle U3)" |
| `orderNumber` | Non-empty string | "Auftrags-Nr. ist erforderlich (Zelle N5)" |
| `plant` | Non-empty string | "Anlage ist erforderlich (Zelle A10)" |
| `location` | Non-empty string | "Einsatzort ist erforderlich (Zelle T10)" |
| `company` | Non-empty string | "Firma ist erforderlich (Zelle T7)" |

**If mandatory field is missing or invalid:**
- Import continues with warning.
- Missing fields displayed to user.
- User can proceed but is warned about incomplete data.

### 5.2 Position Entry Validation

| Field | Rule | Error Message | Handling |
|---|---|---|---|
| `posNr` | Non-empty string matching pattern | "Ungültige Pos.Nr. in Zeile {row}" | Skip row |
| `menge` | Numeric value ≥ 0 | "Ungültige Menge in Zeile {row}" | Skip row |
| `posNr` format | Matches `\d{2}\.\d{2}\.\d{4}\.` pattern | "Pos.Nr. Format ungültig in Zeile {row}" | Include with warning |

**Valid Position Number Patterns:**
- `01.01.0010.` - Full position code (primary)
- `01.01.0020.` - Full position code
- `01.` - Category header (skip for aggregation)
- `01.01.` - Subcategory header (skip for aggregation)

### 5.3 Type Conversions

| Field | Source Type | Target Type | Conversion Rule | Fallback |
|---|---|---|---|---|
| `menge` | Excel number/string | JavaScript number | `parseFloat()` with validation | 0 (skip row) |
| `protocolNumber` | Any | String | `toString().trim()` | Empty string (error) |
| `date` | Excel date or string | ISO 8601 string | `YYYY-MM-DD` | null (optional) |

### 5.4 Data Cleanup

- **Whitespace:** Trim leading/trailing spaces from all string fields.
- **Position Number:** Normalize trailing period (add if missing).
- **Quantity:** Round to 2 decimal places if not integer.
- **Empty Rows:** Skip rows where both posNr and menge are empty.

---

## 6. Development Environment Setup

### 6.1 Directory Structure

The Protokoll module uses the existing Abrechnung app structure:

```
project-root/
├── index.html                  (includes import section)
├── css/
│   └── styles.css              (existing)
├── js/
│   ├── state.js                (includes protokollData slice)
│   ├── handlers.js             (includes protokoll handlers)
│   ├── utils.js                (includes protokoll utilities)
│   ├── ui.js                   (includes import UI rendering)
│   ├── validation.js           (includes protokoll validation)
│   └── main.js                 (initialization)
├── lib/
│   └── xlsx.min.js             (SheetJS library)
├── templates/
│   ├── protokoll.xlsx          (reference template)
│   ├── abrechnung.xlsx         (billing template)
│   └── README.md               (template documentation)
├── tests/
│   ├── unit/
│   │   └── utils.test.js       (protokoll utility tests)
│   └── integration/            (workflow tests)
└── docs/
    ├── description.md          (app description)
    ├── ARCHITECTURE.md         (architecture overview)
    └── modules/
        └── protokolls/
            ├── protokolls.md           (module overview)
            └── protokoll_phase1.md     (this file)
```

### 6.2 External Dependencies

**No new external libraries.** Continue with existing stack:

- **SheetJS (XLSX):** Already integrated for Excel I/O. Reuse for protokoll parsing.
- **JavaScript ES6 Modules:** Native browser modules (no build step required).
- **localStorage API:** Native browser persistence for state.
- **FileReader API:** For reading uploaded files.

### 6.3 Development Tools & Testing

**Browser Console Testing:**
- Simple manual tests using browser console.
- Log output from parsing functions.
- Inspect state mutations.

**Jest Unit Tests:**
- Test utility functions in isolation.
- Mock SheetJS workbook objects.
- Verify extraction and validation logic.

---

## 7. Phase 1 Deliverables

### 7.1 Documentation

✓ **This document** (protokoll_phase1.md)
- File structure analysis
- Data model definition
- Business requirements
- Validation rules

✓ **Module overview** (protokolls.md)
- Phase descriptions
- Development roadmap
- Integration points

### 7.2 Code Scaffolding

✓ **Existing state.js**
- Already contains `protokollData` slice
- State API: `setState()`, `getState()`, events

✓ **Existing handlers.js**
- Event handlers: `handleImportFile()`
- UI update functions

✓ **Existing utils.js**
- Function implementations:
  - `readExcelFile(file)` – read Excel file
  - `parseProtokoll(workbook)` – extract metadata
  - `extractPositions(workbook)` – extract position data
  - `sumByPosition(positionen)` – aggregate quantities

✓ **Existing index.html**
- Import section with file input
- Status display
- Metadata preview

### 7.3 Validation Checklist

- [x] File `protokoll.xlsx` template analyzed
- [x] Cell references for metadata documented
- [x] Position data row range identified
- [x] Data model (metadata + positionen) defined
- [x] State slice (`protokollData`) documented
- [x] Validation rules specified
- [x] Project directory structure documented
- [ ] Sample protokoll successfully parsed (manual test)
- [ ] All team members understand the protokoll data format

---

## 8. Handoff to Phase 2

**Phase 1 Exit Criteria:**

1. **Documentation Complete:** Cell references, data model, and validation rules documented.
2. **Environment Ready:** SheetJS library working; templates accessible.
3. **Data Model Understood:** Team understands protokoll structure and extraction requirements.

**Phase 2 Focus:**
- Implement robust error handling for malformed files.
- Add unit tests for extraction functions.
- Enhance UI feedback for import status.
- Profile performance with large protokoll files.

---

## 9. Risk Assessment & Mitigations (Phase 1)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Excel cell references change in new templates | Medium | High | Document expected cell locations; make configurable |
| Quantity column varies between protocols | Medium | Medium | Implement fallback column detection (X → B → C) |
| Position number format varies | Low | Medium | Use flexible regex pattern; log unmatched formats |
| Large protokoll files (>300 positions) | Low | Low | Profile performance; optimize if needed |

---

## 10. References & Appendix

### 10.1 Related Documents

- `description.md` – Abrechnung app technical overview
- `ARCHITECTURE.md` – Module architecture and data flow
- `templates/README.md` – Template file specifications
- `roadmap.md` – Overall project roadmap

### 10.2 External References

- [SheetJS Documentation](https://sheetjs.com/docs/) – Excel parsing library
- [VDE 0100 Standard](https://www.vde.com/) – Electrical installation testing standard

### 10.3 Glossary

| Term | Definition |
|---|---|
| **Protokoll** | Inspection protocol document (protokoll.xlsx) containing test data |
| **Vorlage** | German for "Template"; the sheet name in protokoll.xlsx |
| **Pos.Nr.** | Position number; hierarchical code for billing items (e.g., "01.01.0010.") |
| **Menge** | German for "Quantity"; the count of items for each position |
| **Anlage** | German for "Installation" or "Plant"; system identifier |
| **Einsatzort** | German for "Deployment location"; where the inspection occurred |
| **Abrechnung** | German for "Billing" or "Invoice"; the output document |

### 10.4 Example: Full Import Flow

```
User uploads "protokoll_A5937814.xlsx"
  ↓
utils.readExcelFile(file)
  → Returns SheetJS workbook object
  ↓
utils.parseProtokoll(workbook)
  → Extracts metadata from cells U3, N5, A10, T10, T7, etc.
  → Returns: { protocolNumber, orderNumber, plant, location, company, ... }
  ↓
utils.extractPositions(workbook)
  → Scans rows 30-325 for Pos.Nr. (Column A) and Menge (Column X or fallback)
  → Returns: [{ posNr: "01.01.0010.", menge: 2, row: 30 }, ...]
  ↓
handlers.handleImportFile()
  → Validates data
  → Calls setState({ protokollData: { metadata, positionen } })
  ↓
state.saveState() to localStorage
  ↓
UI updates:
  → Import section shows: "✓ protokoll_A5937814.xlsx importiert"
  → Metadata preview: "Auftrags-Nr.: A5937814, Anlage: LV-UM-Mb-55"
  → Position count: "48 Positionen gefunden"
  ↓
"Generate Abrechnung" button enabled
```

---

## 11. Sign-Off

**Document Version:** 1.0  
**Created:** December 9, 2025  
**Status:** Ready for Implementation  
**Author:** Copilot Agent  
**Approval:** (Pending stakeholder review)

---

**End of Phase 1 Specification**
