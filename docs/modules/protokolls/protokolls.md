# General description for protokolls module.

- full files: docs/modules/protokolls

## Phase 1 – Understand & Model the Protokoll File

1. **Manually analyze `protokoll.xlsx`**
   - Open it and identify:
     - Sheet (Vorlage = Template).
     - Header rows (e.g., protocol metadata in rows 3-10).
     - Position data (Pos.Nr. codes with associated quantities).
     - Any special patterns: merged cells, formula rows, multi-row positions.
   - Decide what a **"protocol record"** is in business terms (metadata + positionen).

2. **Define a flexible protokoll schema**
   - Because you want to "identify and catalog data" flexibly, define:
     - A **raw columns** structure (what columns exist and their types).
     - A **normalized protocol object** you want in your app.
   - Example (in comments for state.js / docs):
     ```js
     // Raw column info (per sheet)
     {
       sheetName: 'Vorlage',
       columns: [
         { key: 'posNr', header: 'Pos.Nr.', type: 'string', column: 'A' },
         { key: 'menge', header: 'Menge', type: 'number', column: 'X' },
         // …
       ]
     }

     // Normalized Protokoll Metadata
     {
       protocolNumber: string,     // Cell U3
       orderNumber: string,        // Cell N5
       plant: string,              // Cell A10 (Anlage)
       location: string,           // Cell T10 (Einsatzort)
       company: string,            // Cell T7 (Firma)
       client: string,             // Cell A5 (Auftraggeber)
       date: string                // ISO date
     }

     // Position Entry
     {
       posNr: string,              // e.g., "01.01.0010."
       menge: number,              // quantity value
       row: number                 // source row for traceability
     }
     ```
   - Plan for **column mapping** so the app can adapt to varying column positions.

3. **Document field priorities**
   - Decide which fields are **mandatory** (e.g., Protokoll-Nr., Pos.Nr., Menge).
   - Decide what to do when data is missing or ambiguous (skip row, mark as "incomplete", etc.).

Deliverable:  
A short internal document (or section in roadmap) describing:
- Excel structure
- Target protokoll schema
- Mandatory/optional fields
- Validation rules.

***

## Phase 2 – Extend State Layer (state.js)

1. **Add protokoll-specific state**
   - Extend your centralized state with a `protokollData` slice:
     ```js
     const initialState = {
       protokollData: {
         metadata: { /* ... */ },
         positionen: [ /* ... */ ]
       },
       // existing abrechnung state…
     };
     ```

2. **State API for protokoll**
   - Functions in state.js:
     - `setProtokollData(metadata, positionen)`
     - `clearProtokollData()`
     - `getProtokollData()`
   - These should:
     - Merge into existing state.
     - Emit `stateChanged` events with `detail: { path: 'protokollData', ... }`.
     - Persist to localStorage.

3. **Validation & invariants**
   - Enforce:
     - Each position has a posNr and menge.
     - Metadata has required fields (protocolNumber, orderNumber).

Deliverable:  
Updated `state.js` with a clearly documented `protokollData` slice and tests/manual checks confirming:
- State persists and reloads correctly.
- Events fire on protokoll updates.

***

## Phase 3 – Excel Utilities for Protokoll Reader (utils.js)

Use SheetJS like in your existing app, with **cell reference-based extraction**.

1. **Read Protokoll Excel file**
   - Implement:
     ```js
     export async function readProtokollFile(file) {
       // uses SheetJS to read file and return workbook
     }
     ```

2. **Extract metadata from header cells**
   - Implement:
     ```js
     export function extractProtokollMetadata(workbook) {
       // Extract from specific cells: U3, N5, A10, T10, T7, A5
       // Return normalized metadata object
     }
     ```

3. **Extract positions with quantities**
   - Implement:
     ```js
     export function extractProtokollPositionen(workbook, quantityColumnFallbacks = ['X', 'B', 'C']) {
       // Scan rows 30-325 for position data
       // Column A for Pos.Nr., configurable column for Menge
       // Return array of { posNr, menge, row } objects
     }
     ```

4. **Aggregate quantities by position**
   - Implement:
     ```js
     export function sumByPosition(positionen) {
       // Group by posNr, sum menge values
       // Return { "01.01.0010": 5, "01.01.0020": 3, ... }
     }
     ```

Deliverable:  
New utility functions with console-based manual tests:
- Import `protokoll.xlsx` and log discovered metadata and positions.
- Confirm type conversion and error handling.

***

## Phase 4 – Protokoll Import UI & Handlers (handlers.js + renderer)

1. **UI layout (index.html / import section)**
   - Import section:
     - File upload (accept `.xlsx`).
     - Import button.
     - Status display (success/error/pending).
     - Imported data summary (metadata preview, position count).

2. **Handlers**
   - In `handlers.js` implement:
     - `handleProtokollFileInput(event)`
       - Validates file.
       - Calls `readProtokollFile(file)`.
       - Calls `extractProtokollMetadata()` and `extractProtokollPositionen()`.
       - Updates state with `setProtokollData()`.
     - `handleProtokollImportReset()`
       - Clears protokoll data from state.

3. **Rendering logic**
   - Create `renderImportSection(state.protokollData, state.ui.import)`:
     - Show file name, import status.
     - Display metadata preview.
     - Show position count and any errors.
   - Subscribe to `stateChanged` event in main.js.

Deliverable:  
Interactive Protokoll Import UI where:
- User uploads `protokoll.xlsx`.
- Sees extracted metadata and position count.
- Can reset and re-import.

***

## Phase 5 – Local Persistence & Workflow Integration

1. **Local persistence via state + localStorage**
   - Ensure protokollData slice is included in localStorage:
     - On load, `loadState` restores protokollData.
     - UI renders previously imported protokoll data after reload.

2. **Workflow integration**
   - Protokoll import is **Step 1** in the workflow.
   - "Generate Abrechnung" button enabled only when protokollData exists.
   - Show clear workflow status indicators.

Deliverable:  
Protokoll data persists across sessions. Workflow buttons reflect current state.

***

## Phase 6 – Flexibility, Robustness & Testing

1. **Flexibility in reading Excel**
   - Handle:
     - Variable quantity column (check X, then B, then C).
     - Variable row ranges (scan until empty).
     - Missing metadata (warn but continue).
   - Implement **tolerant parsing**:
     - If quantity column not found, try fallbacks.
     - If metadata cell empty, use placeholder.

2. **Validation and user feedback**
   - On import:
     - Show number of positions imported vs skipped.
     - Show list of warnings (missing data, invalid values).
   - In UI:
     - Use color/status components for success/error/warning.

3. **Unit / integration tests**
   - At least manual or simple assertion-based tests:
     - Import `protokoll.xlsx` → check metadata extracted, positions counted.
     - Import file with missing data → expect warnings.
     - Reload page → protokoll data still present.

Deliverable:  
Documented behaviors and test checklist; errors are handled gracefully.

***

## Phase 7 – Integration with Abrechnung Generation & Documentation

1. **Integration**
   - Protokoll data feeds into Abrechnung generation:
     - `sumByPosition()` aggregates quantities from protokoll.
     - Aggregated data fills Abrechnung template.
   - Full workflow: Import Protokoll → Generate Abrechnung → Export Abrechnung.

2. **Documentation**
   - Extend your existing docs with:
     - Protokoll module overview and workflow.
     - Schema definition.
     - Cell reference mapping.
     - How to adapt to new protokoll.xlsx versions.

***

If you want, next step I can:
- Draft the exact **state.js additions** for the `protokollData` slice, or
- Draft the **SheetJS-based utilities** for `extractProtokollMetadata` and `extractProtokollPositionen` tailored to the cell references from your Excel template.
