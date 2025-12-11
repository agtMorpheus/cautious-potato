# Agents & Module Architecture

## Overview

The Abrechnung Application is built on a **modular, event-driven architecture** with clear separation of concerns. Each JavaScript module is designed as an independent agent with a single responsibility, enabling easy testing, maintenance, and collaborative development.

---

## Core Agents

### 1. State Agent (`state.js`)

**Responsibility:** Centralized data management and persistence.

**Key Functions:**
- `getState()` — Returns a defensive copy of application state
- `setState(updates, options)` — Merges updates and triggers listeners
- `resetState(options)` — Resets state to initial values
- `subscribe(listener)` — Registers state change listeners
- `unsubscribe(listener)` — Unregisters listeners
- `loadStateFromStorage()` — Restores persisted state from localStorage
- `clearPersistedState()` — Removes stored state

**State Shape:**
```
protokollData
├── metadata (protocolNumber, orderNumber, plant, location, company, date)
└── positionen (array of {posNr, menge})

abrechnungData
├── header (date, orderNumber, plant, location)
└── positionen (object: posNr → totalMenge)

ui
├── import (status, message, fileName, fileSize, importedAt)
├── generate (status, message, positionCount, uniquePositionCount)
└── export (status, message, lastExportAt, lastExportSize)

meta (version, lastUpdated)
```

**Persistence:** Automatically saves to localStorage (key: `abrechnungAppState_v1`) on state changes.

---

### 2. Utils Agent (`utils.js`)

**Responsibility:** Excel processing and data transformation operations.

**Key Functions:**
- `readExcelFile(file)` — Reads Excel file and returns raw workbook
- `parseProtokoll(workbook)` — Extracts metadata from specified cells (U3, N5, etc.)
- `extractPositions(sheet, startRow, endRow)` — Extracts position data from rows 30–325
- `validateExtractedPositions(positions)` — Validates position structure and values
- `sumByPosition(positions)` — Aggregates quantities by position number
- `getPositionSummary(sums)` — Returns summary statistics
- `safeReadAndParseProtokoll(file)` — Safe wrapper with comprehensive error handling
- `loadAbrechnungTemplate(file)` — Loads abrechnung.xlsx template
- `fillAbrechnungPositions(ws, positionSums)` — Fills template with aggregated positions
- `generateAbrechnungFilename(metadata)` — Creates descriptive filename
- `exportAbrechnungFile(filename, workbook)` — Exports finished workbook to browser

**Error Handling:** Provides detailed error messages with recovery suggestions.

**No Side Effects:** Never modifies DOM or external state; all data transformations are pure functions.

---

### 3. Handlers Agent (`handlers.js`)

**Responsibility:** User interaction processing and orchestration.

**Key Functions:**
- `handleImportFile(event)` — Processes protokoll.xlsx upload
- `handleGenerateAbrechnung()` — Creates aggregated abrechnung from imported data
- `handleExportAbrechnung()` — Exports completed abrechnung.xlsx to user
- `handleResetApplication()` — Clears all data and resets state
- `initializeEventListeners(callbacks)` — Binds DOM events to handlers
- `showErrorAlert(title, message)` — Displays error messages
- `showSuccessAlert(title, message)` — Displays success messages
- `clearErrorAlerts()` — Removes all alert elements

**Responsibilities:**
- Updates UI status (pending → success/error) during operations
- Calls utils functions for data processing
- Updates state with results
- Manages loading states and user feedback
- Handles errors gracefully

**No Direct DOM Manipulation:** All rendering delegated to UI update functions.

---

### 4. Bootstrap Agent (`main.js`)

**Responsibility:** Application initialization and module orchestration.

**Key Functions:**
- `initializeApp()` — Runs once on DOM load:
  1. Loads persisted state
  2. Initializes static UI elements
  3. Binds event listeners
  4. Subscribes to state changes
  5. Performs initial render

**Exports:**
- `destroyApp()` — Cleanup hook for testing/hot-reload

**Flow:**
```
DOM Ready
  ↓
Load State from Storage
  ↓
Initialize UI & Event Listeners
  ↓
Subscribe to State Changes
  ↓
Application Ready
```

---

### 5. UI Renderers (Phase 4 - Future)

**Responsibility:** DOM updates based on state changes.

**Planned Functions:**
- `updateImportUI(state)` — Updates import section UI
- `updateGenerateUI(state)` — Updates generate section UI
- `updateExportUI(state)` — Updates export section UI
- `initializeStaticUI()` — Sets ARIA attributes and static content

**Pattern:** Called automatically when state changes via `subscribe()`.

---

## Communication Patterns

### Event-Driven Updates

```
User Action (Click)
  ↓
Handler (handlers.js)
  ↓
Utils Processing (utils.js)
  ↓
setState() (state.js)
  ↓
Notify Listeners
  ↓
UI Update (renderers)
```

### No Direct Module Coupling

- **state.js** knows nothing about handlers, utils, or UI
- **utils.js** never calls state or handlers
- **handlers.js** calls state and utils but not UI directly
- **UI** listens to state changes, never modifies state directly

### Async Pattern

Handlers manage async operations with state transitions:
```javascript
setState({ ui.import.status: 'pending' })  // Show loading
try {
  const result = await safeReadAndParseProtokoll(file)
  setState({ ...importedData, ui.import.status: 'success' })
} catch (error) {
  setState({ ui.import.status: 'error', message: error.message })
}
```

---

## Module Dependencies

```
main.js
├── imports: state.js, handlers.js, renderers
├── calls: loadStateFromStorage(), initializeEventListeners()
└── subscribes: subscribe()

handlers.js
├── imports: state.js, utils.js
├── calls: getState(), setState(), utils functions
└── updates: UI status via state changes

utils.js
├── imports: (none)
├── pure functions only
└── no side effects

state.js
├── imports: (none)
├── manages: localStorage
└── notifies: listeners on changes

renderers.js
├── imports: (none)
├── called by: main.js subscription
└── updates: DOM elements
```

---

## Data Flow Diagram

```
┌─────────────────┐
│   User Action   │
│   (File Upload) │
└────────┬────────┘
         │
         ↓
┌──────────────────────────┐
│   Handler                │
│   handleImportFile()     │
│   - Update UI pending    │
│   - Call utils functions │
│   - Update state success │
└────────┬─────────────────┘
         │
         ├──→ ┌──────────────┐
         │    │ setState()   │
         │    │ (state.js)   │
         │    └──────┬───────┘
         │           │
         │           ├→ Save to localStorage
         │           └→ Notify listeners
         │
         └──→ ┌─────────────────────┐
              │ Utils Functions     │
              │ readExcelFile()     │
              │ parseProtokoll()    │
              │ extractPositions()  │
              └──────┬──────────────┘
                     │
                     ↓
         ┌─────────────────────────┐
         │ State Listener Called    │
         │ updateImportUI()        │
         │ updateGenerateUI()      │
         │ updateExportUI()        │
         └──────────┬──────────────┘
                    │
                    ↓
         ┌─────────────────────────┐
         │ DOM Updated             │
         │ - Status messages       │
         │ - Button states         │
         │ - File info displayed   │
         └─────────────────────────┘
```

---

## Testing Strategy

Each agent can be tested independently:

- **state.js:** Test state mutations, persistence, listeners
- **utils.js:** Test Excel parsing, aggregation, validation with real/mock files
- **handlers.js:** Test event handling, state updates, error paths
- **main.js:** Test initialization sequence, module wiring
- **renderers.js:** Test DOM updates for each state shape

---

## Best Practices

1. **Single Responsibility:** Each module has one clear purpose
2. **No Global Variables:** Except module-scoped state management
3. **Error Handling:** Comprehensive try/catch with user-friendly messages
4. **Pure Functions:** Utils functions never have side effects
5. **Immutability:** State updates create new snapshots, not mutations
6. **Logging:** Debug logs for troubleshooting without affecting behavior
7. **Defensive Copying:** `getState()` returns clones to prevent external mutations
8. **Event-Driven:** Loose coupling via state subscriptions

---

## Visual Consistency Guidelines

**Goal:** Maintain unified design language across all pages using the dashboard as source of truth.

### CSS Variable Usage

Always use CSS variables from `css/variables.css`:

```css
/* ✓ Correct */
color: var(--primary-main);
padding: var(--space-md);
border-radius: var(--radius-md);

/* ✗ Avoid */
color: #3b82f6;
padding: 16px;
border-radius: 8px;
```

### Design Token Reference

| Category | Variables |
|----------|-----------|
| Colors | `--primary-main`, `--c-success`, `--c-warning`, `--c-danger`, `--c-info` |
| Backgrounds | `--bg-app`, `--bg-surface`, `--bg-card`, `--bg-hover`, `--bg-glass` |
| Text | `--text-main`, `--text-muted`, `--text-secondary` |
| Spacing | `--space-xs` (4px), `--space-sm` (8px), `--space-md` (16px), `--space-lg` (24px), `--space-xl` (32px) |
| Borders | `--border-base`, `--border-highlight`, `--radius-sm/md/lg` |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Transitions | `--duration-fast` (150ms), `--duration-normal` (250ms) |

### Component Patterns

Follow dashboard component styling:
- **Cards:** Use `.card` class with `--bg-card`, `--border-base`, `--radius-lg`
- **Buttons:** Use `.btn .btn-primary` or `.btn .btn-secondary`
- **Inputs:** Use `.form-input` with `--border-base`, `--radius-md`
- **Typography:** Use `--font-family-base` for text, monospace for code/metrics

### Validation Tools

```bash
npm run test:visual    # Run visual consistency tests
npm run audit:visual   # Detect hardcoded values
```

### Checklist for New Pages

- [ ] Import `variables.css` before other stylesheets
- [ ] No hardcoded colors (use `--*` variables)
- [ ] No hardcoded spacing (use `--space-*`)
- [ ] Components match dashboard styling
- [ ] Dark mode support via `[data-theme="dark"]`
- [ ] Run `npm run audit:visual` before commit

---

## Performance Considerations

- **State Cloning:** `structuredClone()` is fast for small state objects (<10KB)
- **localStorage:** Automatic persistence has negligible overhead
- **Excel Processing:** SheetJS handles files <10MB efficiently in-browser
- **DOM Updates:** Batch updates via single state change when possible

---

## Future Extensibility

- Add new handlers without modifying existing modules
- Split renderers into separate files per UI section
- Add analytics/logging middleware via state subscriptions
- Implement undo/redo by keeping state snapshots
- Add offline sync when backend becomes available
