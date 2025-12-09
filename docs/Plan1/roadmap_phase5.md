# Phase 5 – Integration & Full Application (Weeks 5–6)

Phase 5 integrates all previously implemented modules – **state.js**, **utils.js**, **handlers.js**, and the HTML/CSS UI – into a fully working, end‑to‑end application. The focus is on wiring the modules together, finalizing the HTML structure, polishing styling, and validating that typical user workflows function reliably in a browser served via **XAMPP Portable**.

By the end of this phase, a non‑technical user should be able to:

- Open the app in a browser via XAMPP.
- Import a valid `protokoll.xlsx` file.
- Generate an `abrechnung` preview.
- Export the finished `abrechnung.xlsx` without manual Excel editing.
- See clear, accessible status and error messages throughout the workflow.

---

## 5.1 Main Module – `main.js` (Application Bootstrap)

### 5.1.1 Goals

- Serve as the **single entry point** for the application logic.
- Initialize **state**, **event listeners**, and **initial UI rendering**.
- Integrate the **stateChanged** subscription mechanism with the DOM update functions.
- Ensure the application starts correctly both on a **fresh load** and with **persisted localStorage state**.

### 5.1.2 Responsibilities of `main.js`

`main.js` should:

- Import and initialize the **state module** (`state.js`).
- Import **event handlers** (`handlers.js`).
- Import **UI update / renderer functions** (Phase 4 UI update helpers, or new `render/*.js` modules if you split them further).
- Bootstrap the application when the DOM is ready.
- Register `stateChanged` listeners and call the relevant UI update functions.
- Perform any **one‑time setup** (e.g., pre‑loading templates, sanity logs).

### 5.1.3 Recommended Module Imports

In `js/main.js`:

```javascript
// main.js

// State & persistence
import { loadStateFromStorage, subscribe, getState } from './state.js';

// Handlers (user interactions)
import {
  handleImportFile,
  handleGenerateAbrechnung,
  handleExportAbrechnung,
  handleResetApplication,
  initializeEventListeners
} from './handlers.js';

// UI update helpers (could also be in dedicated renderer modules)
import {
  updateImportUI,
  updateGenerateUI,
  updateExportUI,
  initializeStaticUI
} from './ui.js'; // or ./renderers.js depending on Phase 4 structure
```

Adapt the import paths to your actual Phase 4 layout. The key point is: **main.js does not contain low‑level logic**, it **orchestrates** modules.

### 5.1.4 Application Initialization Flow

Implement an `initializeApp` function that runs once when the DOM is loaded:

```javascript
async function initializeApp() {
  console.log('Abrechnung Application – Initializing (Phase 5)');

  // 1. Load persisted state (if any)
  const initialState = loadStateFromStorage();
  console.log('Initial state loaded', initialState);

  // 2. Initialize static UI (non‑dynamic DOM tweaks, ARIA, etc.)
  initializeStaticUI();

  // 3. Bind event listeners once
  initializeEventListeners({
    onImport: handleImportFile,
    onGenerate: handleGenerateAbrechnung,
    onExport: handleExportAbrechnung,
    onReset: handleResetApplication
  });

  // 4. Subscribe to state changes to keep UI reactive
  subscribe((nextState) => {
    updateImportUI(nextState);
    updateGenerateUI(nextState);
    updateExportUI(nextState);
  });

  // 5. Perform initial render based on loaded state
  const state = getState();
  updateImportUI(state);
  updateGenerateUI(state);
  updateExportUI(state);

  console.log('Abrechnung Application – Initialization complete');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
```

Key ideas:

- `initializeEventListeners` receives handler functions as arguments to keep **handlers.js** independent of the DOM query details if desired.
- `subscribe` is used once to update all UI sections whenever state changes.
- An **initial render** immediately reflects restored state (e.g., imported file info, generated data) after a page reload.

### 5.1.5 Cleanup & Testing Helpers

For testing or hot‑reload scenarios, optionally expose a cleanup hook:

```javascript
export function destroyApp() {
  // Future‑proof hook: remove listeners, timers, etc.
  // For now, you can track and remove any custom listeners if you add them.
  console.log('Abrechnung Application – Destroyed');
}
```

This is not strictly required but is useful for automated tests.

---

## 5.2 Complete HTML – `index.html`

Phase 1 produced a **basic skeleton**. Phase 5 upgrades it to the **final semantic, accessible structure** and ensures that all modules are loaded correctly as ES6 modules.

### 5.2.1 HTML Structure Requirements

`index.html` should include:

- A **semantic layout** using `<header>`, `<main>`, `<section>`, `<footer>`.
- Three main workflow sections:
  - **Import Protokoll**
  - **Generate Abrechnung**
  - **Export Abrechnung**
- A **Reset** control (button) for clearing state during testing.
- A **global message area** for error/success notifications.
- Proper **IDs** and **classes** to be referenced in `handlers.js` and UI updates.

### 5.2.2 Example Final Structure

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Abrechnung aus Protokoll</title>
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <header class="app-header">
      <h1>Abrechnung aus Prüfprotokoll</h1>
      <p class="app-tagline">
        Excel‑basierte Abrechnungserstellung aus <code>protokoll.xlsx</code> – vollständig im Browser.
      </p>
    </header>

    <main class="app-main" aria-live="polite">
      <!-- Global message container -->
      <div id="global-messages" class="messages" aria-live="assertive"></div>

      <!-- Import Section -->
      <section id="import-section" class="panel" aria-labelledby="import-heading">
        <header class="panel-header">
          <h2 id="import-heading">1. Protokoll importieren</h2>
          <p class="panel-description">
            Laden Sie ein gültiges <code>protokoll.xlsx</code> aus der Vorlage.
          </p>
        </header>

        <div class="panel-body">
          <div class="form-row">
            <label for="file-input">Protokoll-Datei (.xlsx)</label>
            <input
              id="file-input"
              type="file"
              accept=".xlsx"
              aria-describedby="file-help"
            />
            <p id="file-help" class="hint">
              Die Datei wird nur lokal im Browser verarbeitet und nicht hochgeladen.
            </p>
          </div>

          <div class="actions">
            <button id="import-button" type="button">Datei importieren</button>
          </div>

          <div class="status-row">
            <span class="status-indicator status-idle" id="import-status"></span>
            <p id="import-message" class="status-message">Noch keine Datei importiert.</p>
          </div>

          <div id="import-summary" class="summary" aria-live="polite" hidden></div>
        </div>
      </section>

      <!-- Generate Section -->
      <section id="generate-section" class="panel" aria-labelledby="generate-heading">
        <header class="panel-header">
          <h2 id="generate-heading">2. Abrechnung erzeugen</h2>
          <p class="panel-description">
            Positionen werden aggregiert und in die Abrechnungsvorlage übernommen.
          </p>
        </header>

        <div class="panel-body">
          <div class="actions">
            <button id="generate-button" type="button" disabled>
              Abrechnung erzeugen
            </button>
          </div>

          <div class="status-row">
            <span class="status-indicator status-idle" id="generate-status"></span>
            <p id="generate-message" class="status-message">Noch keine Abrechnung erzeugt.</p>
          </div>

          <div id="generate-summary" class="summary" aria-live="polite" hidden></div>
        </div>
      </section>

      <!-- Export Section -->
      <section id="export-section" class="panel" aria-labelledby="export-heading">
        <header class="panel-header">
          <h2 id="export-heading">3. Abrechnung exportieren</h2>
          <p class="panel-description">
            Laden Sie die fertige <code>abrechnung.xlsx</code> herunter.
          </p>
        </header>

        <div class="panel-body">
          <div class="actions">
            <button id="export-button" type="button" disabled>
              Abrechnung herunterladen
            </button>
          </div>

          <div class="status-row">
            <span class="status-indicator status-idle" id="export-status"></span>
            <p id="export-message" class="status-message">Noch keine Datei exportiert.</p>
          </div>

          <dl id="export-summary" class="summary" aria-live="polite" hidden>
            <div class="summary-item">
              <dt>Letzter Export</dt>
              <dd id="export-last-date">–</dd>
            </div>
            <div class="summary-item">
              <dt>Dateigröße</dt>
              <dd id="export-last-size">–</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Reset / Debug Section -->
      <section id="reset-section" class="panel panel-secondary" aria-label="Anwendung zurücksetzen">
        <div class="panel-body inline">
          <button id="reset-button" type="button" class="secondary">
            Anwendung zurücksetzen
          </button>
          <p class="hint">Löscht importierte Daten, generierte Abrechnung und lokale Speicherung.</p>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>
        Läuft lokal über XAMPP. Excel‑Verarbeitung mit SheetJS, Zustand mit ES6‑Modulen und localStorage.
      </p>
    </footer>

    <!-- SheetJS Library -->
    <script src="js/libs/xlsx.min.js"></script>

    <!-- Application Modules -->
    <script type="module" src="js/main.js"></script>
  </body>
</html>
```

Align IDs and classes with the expectations in **Phase 4** (`handlers.js` and UI update functions). If Phase 4 already defined specific selectors, adjust the HTML accordingly.

### 5.2.3 Accessibility Checklist

Ensure:

- **Semantic elements**: `<header>`, `<main>`, `<section>`, `<footer>` are used appropriately.
- All interactive elements (`<button>`, `<input>`) have **associated labels**.
- Status areas use `aria-live` for **screen reader** announcements.
- Buttons are reachable and usable with the **keyboard** (Tab, Enter, Space).
- Contrast ratios for text vs. background meet **WCAG AA**.

---

## 5.3 CSS Styling – `styles.css`

Phase 5 gives the app a **clean, professional look** and ensures it works well on desktop and mobile screens.

### 5.3.1 Design Goals

- Simple, **card‑based layout** for each workflow section.
- Clear **visual hierarchy** and spacing.
- **Responsive** design for mobile, tablet, and desktop.
- Distinct **status colors** for idle, pending, success, and error.
- Visually obvious **enabled/disabled button states**.

### 5.3.2 Recommended Style Structure

In `css/styles.css`:

- Base styles: `body`, typography, colors.
- Layout: `.app-header`, `.app-main`, `.panel`, `.panel-header`, `.panel-body`.
- Forms: `.form-row`, `label`, `input[type="file"]`.
- Buttons: default, hover, active, disabled, secondary.
- Status indicators: `.status-indicator`, `.status-idle`, `.status-pending`, `.status-success`, `.status-error`.
- Summaries: `.summary`, `.summary-item`.

Example (abbreviated):

```css
:root {
  --color-bg: #f5f7fa;
  --color-panel: #ffffff;
  --color-border: #d0d7e2;
  --color-primary: #0059b3;
  --color-primary-hover: #004494;
  --color-text: #1f2933;
  --color-muted: #6b7280;
  --color-success: #16a34a;
  --color-error: #dc2626;
  --color-pending: #f59e0b;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
}

.app-header,
.app-footer {
  padding: 1.5rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid var(--color-border);
}

.app-main {
  max-width: 960px;
  margin: 1.5rem auto 2rem;
  padding: 0 1rem;
}

.panel {
  background: var(--color-panel);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.panel-secondary {
  background: #f9fafb;
}

button {
  border-radius: 0.375rem;
  border: none;
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
  cursor: pointer;
  background: var(--color-primary);
  color: white;
}

button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.status-indicator {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  background: var(--color-muted);
}

.status-success {
  background: var(--color-success);
}

.status-error {
  background: var(--color-error);
}

.status-pending {
  background: var(--color-pending);
}

.summary[hidden] {
  display: none;
}

@media (min-width: 768px) {
  .app-main {
    padding: 0;
  }
}
```

Extend this base with whatever visual refinements are needed. Focus on **clarity over complexity**.

### 5.3.3 File Input & Messages

- Style `input[type="file"]` so it fits into the overall design.
- Use `.messages` and message variants (e.g., `.message-error`, `.message-success`) for global alerts configured in Phase 4.

---

## 5.4 Integration Testing (End‑to‑End)

With HTML, CSS, state, utilities, and handlers in place, Phase 5 concludes with **manual end‑to‑end testing** of realistic workflows.

### 5.4.1 Happy Path Workflow

Test the core workflow thoroughly:

1. Open `http://localhost/abrechnung-app` via XAMPP.
2. In the **Import** section:
   - Select a valid `protokoll.xlsx` (template or sample file).
   - Click **„Datei importieren“**.
   - Verify status changes: idle → pending → success.
   - Check that metadata (Auftrags‑Nr., Protokoll‑Nr., Anlage, Einsatzort, Firma, Datum) appears in the summary.
   - Confirm **Generate** button becomes enabled.
3. In the **Generate** section:
   - Click **„Abrechnung erzeugen“**.
   - Verify status changes and any generation time information.
   - Confirm the summary shows number of positions and unique positions.
   - Ensure **Export** button becomes enabled.
4. In the **Export** section:
   - Click **„Abrechnung herunterladen“**.
   - Confirm an Excel file is downloaded with the expected filename pattern.
   - Open it in Excel and verify that header fields and positions are correctly filled.

### 5.4.2 Error & Edge Case Scenarios

Test at least the following:

- Import **no file** and click import (handler should ignore or show a friendly hint).
- Import **invalid file type** (`.txt`, `.pdf`) – expect a clear error.
- Import a **corrupted or malformed** `protokoll.xlsx` – expect an error and no state corruption.
- Click **Generate** without importing – expect a blocking error message.
- Click **Export** without generating – expect a blocking error message.
- Use **Reset** and confirm:
  - State is cleared.
  - UI returns to initial “idle” state.
  - localStorage is cleared.

### 5.4.3 Persistence Tests

- Complete a full workflow (import → generate → do NOT export yet).
- **Reload** the page.
- Verify that:
  - Import summary is still visible.
  - Generate summary or at least the ready‑to‑generate state is preserved as designed.
  - Buttons reflect the correct enabled/disabled state according to persisted state.

### 5.4.4 Performance Sanity Check

- Import a protokoll with **many rows** (close to the 300+ specified in the description).
- Measure user‑perceived time:
  - Import completed in well under 5 seconds on a typical office PC.
  - Generate step remains responsive.

If performance is poor, capture console timings (already added in utilities and handlers) and note them for **Phase 6 optimization**.

---

## 5.5 Deliverables & Exit Criteria for Phase 5

To consider Phase 5 complete, ensure the following:

- `index.html` contains the **final semantic structure** with all required IDs, ARIA attributes, and script tags.
- `css/styles.css` (and optionally extra CSS files) provide a **consistent, responsive design**.
- `main.js` bootstraps the application, subscribes to state changes, and performs the initial render.
- All core workflows (import, generate, export, reset) work end‑to‑end in a browser via XAMPP, with no console errors.
- State persistence with localStorage behaves as expected.
- Error handling and status messages are clear for non‑technical users.

Once these criteria are met, the project is ready for **Phase 6: Testing, Documentation & Optimization**, where the focus shifts to deeper automated tests, performance tuning, and formal user/developer documentation.
