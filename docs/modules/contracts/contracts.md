# General description for contracts module.

- full files: docs/modules/contracts

## Phase 1 – Understand & Model the Excel File

1. **Manually analyze `1406-Auftrage-2025.xlsx`**
   - Open it and identify:
     - Sheets (e.g. `Aufträge 2025`, `Archiv`, …).
     - Columns per row (e.g. Contract ID, Customer, Project, Start date, End date, Amount, Status, Notes, etc.).
     - Any special patterns: merged cells, summary rows, filters, headers in first N rows.
   - Decide what a **“contract record”** is in business terms (one row? multiple rows grouped by an ID?).

2. **Define a flexible contract schema**
   - Because you want to “identify and catalog data” flexibly, define:
     - A **raw columns** structure (what columns exist and their types).
     - A **normalized contract object** you want in your app.
   - Example (in comments for state.js / docs):
     ```js
     // Raw column info (per sheet)
     {
       sheetName: 'Auftraege2025',
       columns: [
         { key: 'auftragNr', header: 'Auftrag-Nr.', type: 'string' },
         { key: 'kunde', header: 'Kunde', type: 'string' },
         { key: 'projekt', header: 'Projekt', type: 'string' },
         { key: 'vertragsbeginn', header: 'Vertragsbeginn', type: 'date' },
         { key: 'vertragsende', header: 'Vertragsende', type: 'date' },
         { key: 'betrag', header: 'Betrag', type: 'number' },
         { key: 'status', header: 'Status', type: 'string' },
         // …
       ]
     }

     // Normalized Contract
     {
       id: string,          // internal UUID
       auftragNr: string,
       kunde: string,
       projekt: string,
       startDate: string,   // ISO
       endDate: string,     // ISO
       amount: number,
       status: 'open' | 'in_progress' | 'closed' | string,
       source: { fileName, importedAt, sheetName, rowIndex }
     }
     ```
   - Plan for **column mapping** so the user can map arbitrary Excel headers → these keys.

3. **Document field priorities**
   - Decide which fields are **mandatory** (e.g. Auftrag-Nr., Kunde, Betrag).
   - Decide what to do when data is missing or ambiguous (skip row, mark as “incomplete”, etc.).

Deliverable:  
A short internal document (or section in roadmap) describing:
- Excel structure
- Target contract schema
- Mandatory/optional fields
- Validation rules.

***

## Phase 2 – Extend State Layer (state.js)

1. **Add contract-specific state**
   - Extend your centralized state with a `contracts` slice:
     ```js
     const initialState = {
       // existing abrechnung / protokoll state…
       contracts: {
         importedFiles: [],   // metadata of each imported Excel
         rawSheets: {},       // optional: raw column metadata by sheet
         records: [],         // normalized contracts
         filters: {           // UI filters (year, status, customer)
           year: null,
           status: null,
           customer: null,
           search: ''
         }
       }
     };
     ```

2. **State API for contracts**
   - New functions in state.js:
     - `addImportedContractFile(fileMeta, rawSheets, normalizedContracts)`
     - `setContracts(records)`
     - `updateContract(id, partialUpdate)`
     - `setContractFilters(filters)`
   - These should:
     - Merge into existing state.
     - Emit `stateChanged` events with `detail: { path: 'contracts', ... }`.
     - Persist to localStorage (reusing your existing persistence methods).

3. **Validation & invariants**
   - Enforce:
     - Each contract has an internal `id`.
     - No duplicate internal IDs.
     - If Auftrag-Nr. is used as business key, decide how to handle duplicates.

Deliverable:  
Updated `state.js` with a clearly documented `contracts` slice and tests/manual checks confirming:
- State persists and reloads correctly.
- Events fire on contract updates.

***

## Phase 3 – Excel Utilities for Contract Manager (utils.js)

Use SheetJS like in your existing app, but now with **schema discovery and mapping**.

1. **Read any Excel and discover structure**
   - Implement:
     ```js
     export async function readContractWorkbook(file) {
       // uses SheetJS to read file and return workbook
     }

     export function discoverContractSheets(workbook) {
       // return array of { sheetName, columns: [ { address, header, columnIndex } ] }
     }
     ```
   - `discoverContractSheets`:
     - For each sheet, read the **first non-empty row** as header.
     - Build a list of columns: header text, column index, guessed type based on sampling a few rows.

2. **Column mapping logic**
   - Implement a helper that, given discovered columns + your desired schema, builds **mapping suggestions**:
     ```js
     export function suggestContractColumnMapping(discoveredColumns) {
       // returns default mapping, e.g. header matches 'Auftrag-Nr.' → auftragNr
     }
     ```
   - Use simple heuristics:
     - Fuzzy match on header string (“Auftrag”, “Auftrag-Nr.” → auftragNr).
     - Known patterns from `1406-Auftrage-2025.xlsx`.

3. **Normalize rows to contract objects**
   - Implement:
     ```js
     export function extractContractsFromSheet(workbook, sheetName, mappingConfig) {
       // mappingConfig: { auftragNr: 'B', kunde: 'C', ... } or indexes
       // returns [normalizedContract, ...] + errors/warnings
     }
     ```
   - Responsibilities:
     - Iterate data rows after header row.
     - For each row:
       - Read cells via mapping.
       - Convert types (string → date, number).
       - Validate mandatory fields; collect errors separately.
       - Create internal `id` (e.g. `crypto.randomUUID()` or concatenation + index).
   - Return structure:
     ```js
     {
       contracts: [...],
       errors: [
         { rowIndex, message, type: 'missing_field' | 'invalid_number' | ... }
       ]
     }
     ```

4. **Import pipeline**
   - Implement:
     ```js
     export async function importContractFile(file, userMappingOverrides = null) {
       const workbook = await readContractWorkbook(file);
       const sheetInfo = discoverContractSheets(workbook);
       const suggestedMapping = suggestContractColumnMapping(sheetInfo);
       // UI will let user adjust mapping, then:
       const result = extractContractsFromSheet(workbook, chosenSheetName, finalMapping);
       return {
         fileMeta: { name: file.name, size: file.size, importedAt: new Date().toISOString() },
         sheetInfo,
         mapping: finalMapping,
         ...result
       };
     }
     ```

Deliverable:  
New utility functions with console-based manual tests:
- Import `1406-Auftrage-2025.xlsx` and log discovered columns and resulting contracts.
- Confirm type conversion and error handling.

***

## Phase 4 – Contract Manager UI & Handlers (handlers.js + renderer)

1. **UI layout (index.html / new section)**
   - Add a **“Contract Manager”** section:
     - File upload (accept `.xlsx`).
     - Step 1: Show **sheet list & discovered columns**.
     - Step 2: Mapping editor (dropdown per target field with available columns).
     - Step 3: Import preview (table of normalized contracts, errors).
     - Step 4: “Save to Contract DB” button.
   - Keep HTML simple; do actual logic in JS modules.

2. **Handlers**
   - In `handlers.js` (or a dedicated `contractHandlers.js` module) implement:
     - `handleContractFileInput(event)`
       - Validates file.
       - Calls `importContractFile(file)` to get sheetInfo + suggested mapping.
       - Updates state with `contracts.rawSheets`, `contracts.importedFiles` (pending), and `contracts.tempMapping`.
     - `handleContractMappingChange(event)`
       - When user changes mapping in UI, update mapping in state.
     - `handleContractImportConfirm()`
       - Uses current mapping + workbook to extract contracts.
       - Calls `addImportedContractFile(...)` & `setContracts(newContracts)`.
     - `handleContractFilterChange(event)`
       - Updates `contracts.filters` in state.
     - `handleContractInlineEdit(event)`
       - For editing a contract field in the UI, calls `updateContract(id, { field: newValue })`.

3. **Rendering logic**
   - Either:
     - Extend existing render module, or
     - Create `renderContracts.js`:
       - `renderContractImportPanel(state.contracts)` – mapping UI, errors.
       - `renderContractList(state.contracts)` – list with filters, sorting, etc.
   - Subscribe to `stateChanged` event in main.js and call both:
     - `renderContractImportPanel(getState().contracts)`
     - `renderContractList(getState().contracts)`

Deliverable:  
Interactive Contract Manager UI where:
- User uploads `1406-Auftrage-2025.xlsx`.
- Sees detected columns and mapping suggestions.
- Adjusts mapping.
- Confirms import and sees contracts in a table.

***

## Phase 5 – Local “DB” Persistence & Future DB Abstraction

1. **Local DB via state + localStorage (short term)**
   - You already persist `state` to localStorage.
   - Ensure contracts slice is included:
     - On load, `loadState` restores contracts.
     - UI renders previously imported contracts even after reload.

2. **Abstract data access for contracts**
   - Create a small module `contractRepository.js`:
     ```js
     // For now, wraps state.js
     export function getAllContracts() {
       return getState().contracts.records;
     }

     export function saveContracts(contracts) {
       setState({ contracts: { ...getState().contracts, records: contracts } });
     }

     export function addContracts(newContracts, fileMeta) {
       const state = getState().contracts;
       const next = {
         ...state,
         importedFiles: [...state.importedFiles, fileMeta],
         records: [...state.records, ...newContracts]
       };
       setState({ contracts: next });
     }
     ```
   - Later, you can replace internals with real DB calls (e.g. REST to PHP/MySQL) without changing UI logic.

3. **Future: Real DB**
   - Plan for:
     - REST endpoints (`/api/contracts`) served via XAMPP PHP.
     - Repository functions performing `fetch` calls instead of state mutation.
   - But keep everything behind `contractRepository` to avoid refactoring the UI.

Deliverable:  
Contracts persist across sessions. Repository layer exists and can be swapped to a real DB later.

***

## Phase 6 – Flexibility, Robustness & Testing

1. **Flexibility in reading Excel**
   - Handle:
     - Variable header row (first non-empty row).
     - Ignoring summary/footer rows.
     - Additional columns that do not map anywhere (keep them in `raw` if needed).
   - Implement **tolerant parsing**:
     - If a non-mapped column is present, ignore it.
     - If a mapped column is missing, mark mapping as invalid and block import with a clear message.

2. **Validation and user feedback**
   - On import:
     - Show number of contracts imported vs skipped.
     - Show list of errors (row + message).
   - In UI:
     - Use color/status components similar to your design system for success/error/warning.

3. **Unit / integration tests**
   - At least manual or simple assertion-based tests in the browser console:
     - Import `1406-Auftrage-2025.xlsx` → check number of discovered columns, contracts, errors.
     - Change mapping to wrong column → expect validation error.
     - Reload page → contracts still present.

Deliverable:  
Documented behaviors and test checklist; errors are handled gracefully.

***

## Phase 7 – Integration with Existing App & Documentation

1. **Integration**
   - Add navigation or tabs:
     - “Abrechnung” module
     - “Contract Manager” module
   - Ensure they share the same `state.js` and persistence logic.

2. **Documentation**
   - Extend your existing `roadmap.md` / docs with:
     - Contract Manager overview and workflow.
     - Schema definition.
     - How the mapping UI works.
     - How to extend mappings or adapt to a new version of `1406-Auftrage-2025.xlsx`.

***

If you want, next step I can:
- Draft the exact **state.js additions** for the `contracts` slice, or
- Draft the **SheetJS-based utilities** for `discoverContractSheets` and `extractContractsFromSheet` tailored to the real column names from your Excel once you describe or screenshot the header row.
