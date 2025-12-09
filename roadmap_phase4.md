# Phase 4: Event Handlers & UI Logic

## Overview

Phase 4 focuses on implementing the **event handling layer** and **UI update logic** that connects the state management (Phase 2) and utility functions (Phase 3) to the user interface. This phase typically covers **Weeks 4–5** and represents the core application logic that orchestrates user interactions.

The key goals of Phase 4 are:

- Implement **event handlers** that respond to user actions (import, generate, export)
- Create **UI update functions** that render state changes to the DOM
- Establish **reactive architecture** where state changes automatically update the UI
- Develop **error handling and user feedback** mechanisms
- Integrate all three modules (state, utils, DOM) into a cohesive system
- Ensure **loading states** and **progress indicators** during async operations

By the end of Phase 4, the application will have a fully functional, event-driven user interface where all three major components work together seamlessly.

---

## 4.1 Import Handler (`handlers.js`)

### Objective

Handle the file upload workflow: read Excel, extract metadata and positions, validate, and update application state.

### 4.1.1 `handleImportFile(event)`

#### Purpose
Process user file selection and parse the protokoll.xlsx file into the application state.

#### Implementation

```javascript
// js/handlers.js

import {
  readExcelFile,
  parseProtokoll,
  extractPositions,
  validateExtractedPositions,
  sumByPosition,
  getPositionSummary,
  safeReadAndParseProtokoll
} from './utils.js';

import {
  getState,
  setState,
  subscribe
} from './state.js';

/**
 * Handle file input change event - import and parse protokoll.xlsx
 * 
 * @param {Event} event - File input change event
 * @returns {Promise<void>}
 */
export async function handleImportFile(event) {
  const fileInput = event.target;
  const file = fileInput.files?.[0];

  if (!file) {
    console.log('File selection cancelled');
    return;
  }

  // Mark UI as loading
  setState({
    ui: {
      ...getState().ui,
      import: {
        status: 'pending',
        message: `Processing ${file.name}...`,
        fileName: file.name,
        fileSize: file.size,
        importedAt: null
      }
    }
  });

  try {
    console.log('Starting file import...', file.name);
    const startTime = performance.now();

    // Use safe wrapper function from utils
    const result = await safeReadAndParseProtokoll(file);

    if (!result.success) {
      throw new Error(result.errors[0] || 'Unknown import error');
    }

    const { metadata, positionen, positionSums } = result;
    const summary = getPositionSummary(positionSums);

    // Show any warnings to user
    if (result.warnings.length > 0) {
      console.warn('Import warnings:', result.warnings);
    }

    const elapsedMs = performance.now() - startTime;

    // Update state with imported data
    setState({
      protokollData: {
        metadata,
        positionen
      },
      ui: {
        ...getState().ui,
        import: {
          status: 'success',
          message: `Successfully imported ${file.name}`,
          fileName: file.name,
          fileSize: file.size,
          importedAt: new Date().toISOString()
        },
        generate: {
          ...getState().ui.generate,
          positionCount: positionen.length,
          uniquePositionCount: summary.uniquePositions
        }
      }
    });

    console.log('File import completed in', elapsedMs.toFixed(2), 'ms');
    console.log('Imported metadata:', metadata);
    console.log('Extracted positions:', summary);

  } catch (error) {
    console.error('Import failed:', error);

    setState({
      ui: {
        ...getState().ui,
        import: {
          status: 'error',
          message: `Import failed: ${error.message}`,
          fileName: file.name,
          fileSize: file.size,
          importedAt: null
        }
      }
    });

    // Optionally show error dialog to user
    showErrorAlert(
      'Import Error',
      `Failed to import file: ${error.message}`
    );
  }

  // Reset file input for re-selection
  fileInput.value = '';
}
```

#### Verification Checklist
- [ ] Reads file from input element
- [ ] Shows pending status during processing
- [ ] Calls safe parsing function from utils
- [ ] Updates state with metadata and positions
- [ ] Tracks import statistics (count, summary)
- [ ] Handles errors gracefully
- [ ] Updates UI status with success/error messages
- [ ] Resets file input for re-selection
- [ ] Preserves existing generate/export state

---

### 4.1.2 `handleGenerateAbrechnung()`

#### Purpose
Generate the abrechnung from imported protokoll data by aggregating positions and populating the template.

#### Implementation

```javascript
/**
 * Handle "Generate" button click - create abrechnung from protokoll data
 * 
 * @returns {Promise<void>}
 */
export async function handleGenerateAbrechnung() {
  const state = getState();

  // Validate preconditions
  if (!state.protokollData || !state.protokollData.metadata) {
    showErrorAlert(
      'No Data',
      'Please import a protokoll.xlsx file first.'
    );
    return;
  }

  // Mark UI as loading
  setState({
    ui: {
      ...state.ui,
      generate: {
        ...state.ui.generate,
        status: 'pending',
        message: 'Generating abrechnung...'
      }
    }
  });

  try {
    console.log('Starting abrechnung generation...');
    const startTime = performance.now();

    const { metadata, positionen } = state.protokollData;

    // Step 1: Aggregate positions
    const positionSums = sumByPosition(positionen);
    const summary = getPositionSummary(positionSums);

    console.log('Position aggregation complete:', summary);

    // Step 2: Create export workbook
    // Import these utilities
    const {
      createExportWorkbook,
      validateFilledPositions
    } = await import('./utils.js');

    const abrechnungData = {
      header: {
        date: metadata.date,
        orderNumber: metadata.orderNumber,
        plant: metadata.plant,
        location: metadata.location
      },
      positionen: positionSums
    };

    const workbook = await createExportWorkbook(abrechnungData);
    const validation = validateFilledPositions(workbook);

    console.log('Workbook creation validation:', validation);

    const elapsedMs = performance.now() - startTime;

    // Update state
    setState({
      abrechnungData,
      ui: {
        ...state.ui,
        generate: {
          status: 'success',
          message: 'Abrechnung generated successfully',
          positionCount: summary.uniquePositions,
          uniquePositionCount: summary.uniquePositions,
          generationTimeMs: Math.round(elapsedMs)
        }
      }
    });

    // Store workbook in window for export step (Phase 4)
    window._currentWorkbook = workbook;

    console.log('Generation completed in', elapsedMs.toFixed(2), 'ms');
    console.log('Abrechnung data:', abrechnungData);

  } catch (error) {
    console.error('Generation failed:', error);

    setState({
      ui: {
        ...state.ui,
        generate: {
          status: 'error',
          message: `Generation failed: ${error.message}`,
          positionCount: 0,
          uniquePositionCount: 0,
          generationTimeMs: 0
        }
      }
    });

    showErrorAlert(
      'Generation Error',
      `Failed to generate abrechnung: ${error.message}`
    );
  }
}
```

#### Verification Checklist
- [ ] Validates protokollData exists before generating
- [ ] Shows pending status during generation
- [ ] Aggregates positions using sumByPosition
- [ ] Creates export workbook with metadata and position sums
- [ ] Validates populated workbook
- [ ] Updates state with abrechnungData
- [ ] Stores workbook reference for export
- [ ] Tracks generation time and statistics
- [ ] Handles errors gracefully
- [ ] Shows user-friendly error messages

---

### 4.1.3 `handleExportAbrechnung()`

#### Purpose
Export the generated abrechnung workbook as an Excel file to the user's downloads folder.

#### Implementation

```javascript
/**
 * Handle "Export" button click - download abrechnung.xlsx file
 * 
 * @returns {Promise<void>}
 */
export async function handleExportAbrechnung() {
  const state = getState();

  // Validate preconditions
  if (!state.abrechnungData || !state.abrechnungData.header) {
    showErrorAlert(
      'No Data',
      'Please generate an abrechnung first.'
    );
    return;
  }

  if (!window._currentWorkbook) {
    showErrorAlert(
      'No Workbook',
      'Workbook not found in memory. Please regenerate.'
    );
    return;
  }

  // Mark UI as loading
  setState({
    ui: {
      ...state.ui,
      export: {
        ...state.ui.export,
        status: 'pending',
        message: 'Preparing download...'
      }
    }
  });

  try {
    console.log('Starting abrechnung export...');

    const { exportToExcel } = await import('./utils.js');

    const metadata = state.protokollData.metadata;
    const workbook = window._currentWorkbook;

    // Export the workbook
    const exportMetadata = exportToExcel(workbook, metadata);

    // Update state
    setState({
      ui: {
        ...state.ui,
        export: {
          status: 'success',
          message: `Downloaded: ${exportMetadata.fileName}`,
          lastExportAt: new Date().toISOString(),
          lastExportSize: exportMetadata.fileSize
        }
      }
    });

    console.log('Export successful:', exportMetadata);

  } catch (error) {
    console.error('Export failed:', error);

    setState({
      ui: {
        ...state.ui,
        export: {
          status: 'error',
          message: `Export failed: ${error.message}`,
          lastExportAt: null,
          lastExportSize: 0
        }
      }
    });

    showErrorAlert(
      'Export Error',
      `Failed to export file: ${error.message}`
    );
  }
}
```

#### Verification Checklist
- [ ] Validates abrechnungData exists
- [ ] Checks for cached workbook in memory
- [ ] Shows pending status during export
- [ ] Calls exportToExcel from utils
- [ ] Updates state with export metadata
- [ ] Shows user-friendly success message
- [ ] Handles errors gracefully
- [ ] Works in all major browsers
- [ ] File downloads with correct name and format

---

### 4.1.4 `handleResetApplication()`

#### Purpose
Clear all data and state for a fresh start or testing.

#### Implementation

```javascript
/**
 * Handle "Reset" button click - clear all application data
 * 
 * @returns {void}
 */
export function handleResetApplication() {
  const confirmed = confirm(
    'Are you sure you want to reset? This will clear all imported data and generated files.'
  );

  if (!confirmed) {
    console.log('Reset cancelled by user');
    return;
  }

  try {
    const { resetState, clearPersistedState } = await import('./state.js');

    // Clear UI
    clearErrorAlerts();

    // Clear state and storage
    resetState({ persist: true, silent: false });
    clearPersistedState();

    // Clear file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }

    // Clear workbook from window
    delete window._currentWorkbook;

    console.log('Application reset complete');

  } catch (error) {
    console.error('Reset failed:', error);
    showErrorAlert(
      'Reset Error',
      'Failed to reset application'
    );
  }
}
```

#### Verification Checklist
- [ ] Confirms user intent before clearing
- [ ] Resets application state
- [ ] Clears persisted storage
- [ ] Resets file input
- [ ] Clears UI elements
- [ ] Removes cached workbook
- [ ] Logs completion

---

## 4.2 UI Update Handlers

### Objective

Implement functions that react to state changes and update the DOM accordingly.

### 4.2.1 `updateImportUI(state)`

#### Purpose
Update the import section UI based on current import state.

#### Implementation

```javascript
/**
 * Update import section UI based on state
 * 
 * @param {Object} state - Current application state
 * @returns {void}
 */
export function updateImportUI(state) {
  const {
    ui: { import: importState },
    protokollData
  } = state;

  // Select DOM elements
  const fileInput = document.querySelector('#file-input');
  const importButton = document.querySelector('#import-button');
  const importStatus = document.querySelector('#import-status');
  const importMessage = document.querySelector('#import-message');
  const importSummary = document.querySelector('#import-summary');
  const generateButton = document.querySelector('#generate-button');

  if (!fileInput || !importStatus) {
    console.warn('Import UI elements not found in DOM');
    return;
  }

  // Update status indicator
  updateStatusIndicator(importStatus, importState.status);

  // Update message
  if (importMessage) {
    importMessage.textContent = importState.message;
    importMessage.className = `import-message status-${importState.status}`;
  }

  // Update summary display
  if (importSummary && protokollData && protokollData.metadata) {
    const { metadata, positionen } = protokollData;

    importSummary.innerHTML = `
      <div class="summary-item">
        <span class="label">Order Number:</span>
        <span class="value">${escapeHtml(metadata.orderNumber || 'N/A')}</span>
      </div>
      <div class="summary-item">
        <span class="label">Protocol Number:</span>
        <span class="value">${escapeHtml(metadata.protocolNumber || 'N/A')}</span>
      </div>
      <div class="summary-item">
        <span class="label">Plant (Anlage):</span>
        <span class="value">${escapeHtml(metadata.plant || 'N/A')}</span>
      </div>
      <div class="summary-item">
        <span class="label">Location (Einsatzort):</span>
        <span class="value">${escapeHtml(metadata.location || 'N/A')}</span>
      </div>
      <div class="summary-item">
        <span class="label">Date:</span>
        <span class="value">${escapeHtml(metadata.date || 'N/A')}</span>
      </div>
      <div class="summary-item">
        <span class="label">Positions Extracted:</span>
        <span class="value">${positionen.length}</span>
      </div>
    `;
    importSummary.style.display = 'block';
  } else {
    importSummary.style.display = 'none';
  }

  // Update button states
  if (importButton) {
    importButton.disabled = importState.status === 'pending';
    importButton.textContent = importState.status === 'pending'
      ? 'Processing...'
      : 'Import File';
  }

  // Enable/disable generate button based on successful import
  if (generateButton) {
    generateButton.disabled = !protokollData || !protokollData.metadata;
  }
}

/**
 * Helper to update status indicator element
 * 
 * @param {HTMLElement} element - Status element to update
 * @param {string} status - Status value ('idle', 'pending', 'success', 'error')
 */
function updateStatusIndicator(element, status) {
  // Remove all status classes
  element.className = 'status-indicator';

  // Add current status class
  element.classList.add(`status-${status}`);

  // Set indicator text
  const statusText = {
    idle: '○',
    pending: '⟳',
    success: '✓',
    error: '✕'
  };

  element.textContent = statusText[status] || '○';
  element.title = status.charAt(0).toUpperCase() + status.slice(1);
}
```

#### Verification Checklist
- [ ] Updates status indicator with correct icon and color
- [ ] Displays import message with appropriate styling
- [ ] Shows extracted metadata in summary panel
- [ ] Displays position count
- [ ] Enables/disables buttons based on state
- [ ] Handles missing DOM elements gracefully
- [ ] Escapes user-provided text to prevent XSS
- [ ] Updates reactively on state changes

---

### 4.2.2 `updateGenerateUI(state)`

#### Purpose
Update the generate section UI based on current generation state.

#### Implementation

```javascript
/**
 * Update generate section UI based on state
 * 
 * @param {Object} state - Current application state
 * @returns {void}
 */
export function updateGenerateUI(state) {
  const {
    ui: { generate: generateState },
    abrechnungData
  } = state;

  // Select DOM elements
  const generateButton = document.querySelector('#generate-button');
  const generateStatus = document.querySelector('#generate-status');
  const generateMessage = document.querySelector('#generate-message');
  const generateSummary = document.querySelector('#generate-summary');
  const exportButton = document.querySelector('#export-button');

  if (!generateButton || !generateStatus) {
    console.warn('Generate UI elements not found in DOM');
    return;
  }

  // Update status indicator
  updateStatusIndicator(generateStatus, generateState.status);

  // Update message
  if (generateMessage) {
    generateMessage.textContent = generateState.message;
    generateMessage.className = `generate-message status-${generateState.status}`;
  }

  // Update generation summary
  if (generateSummary && abrechnungData && abrechnungData.header) {
    const { header, positionen } = abrechnungData;
    const totalQuantity = Object.values(positionen).reduce((sum, q) => sum + q, 0);

    generateSummary.innerHTML = `
      <div class="summary-item">
        <span class="label">Unique Positions:</span>
        <span class="value">${Object.keys(positionen).length}</span>
      </div>
      <div class="summary-item">
        <span class="label">Total Quantity:</span>
        <span class="value">${totalQuantity.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <span class="label">Generation Time:</span>
        <span class="value">${generateState.generationTimeMs}ms</span>
      </div>
      <div class="summary-item">
        <span class="label">Status:</span>
        <span class="value status-${generateState.status}">${generateState.status}</span>
      </div>
    `;
    generateSummary.style.display = 'block';
  } else {
    generateSummary.style.display = 'none';
  }

  // Update button states
  if (generateButton) {
    generateButton.disabled = generateState.status === 'pending';
    generateButton.textContent = generateState.status === 'pending'
      ? 'Generating...'
      : 'Generate Abrechnung';
  }

  // Enable/disable export button based on successful generation
  if (exportButton) {
    exportButton.disabled = !abrechnungData || !abrechnungData.header;
  }
}
```

#### Verification Checklist
- [ ] Updates status indicator
- [ ] Displays generation message
- [ ] Shows position count and total quantity
- [ ] Shows generation time
- [ ] Enables/disables export button based on success
- [ ] Handles missing DOM elements gracefully
- [ ] Updates reactively on state changes

---

### 4.2.3 `updateExportUI(state)`

#### Purpose
Update the export section UI based on current export state.

#### Implementation

```javascript
/**
 * Update export section UI based on state
 * 
 * @param {Object} state - Current application state
 * @returns {void}
 */
export function updateExportUI(state) {
  const {
    ui: { export: exportState }
  } = state;

  // Select DOM elements
  const exportButton = document.querySelector('#export-button');
  const exportStatus = document.querySelector('#export-status');
  const exportMessage = document.querySelector('#export-message');
  const exportHistory = document.querySelector('#export-history');

  if (!exportButton || !exportStatus) {
    console.warn('Export UI elements not found in DOM');
    return;
  }

  // Update status indicator
  updateStatusIndicator(exportStatus, exportState.status);

  // Update message
  if (exportMessage) {
    exportMessage.textContent = exportState.message;
    exportMessage.className = `export-message status-${exportState.status}`;
  }

  // Update export history
  if (exportHistory && exportState.lastExportAt) {
    const exportDate = new Date(exportState.lastExportAt);
    const dateStr = exportDate.toLocaleString();
    const sizeKB = (exportState.lastExportSize / 1024).toFixed(2);

    exportHistory.innerHTML = `
      <div class="export-item">
        <span class="label">Last Export:</span>
        <span class="value">${dateStr}</span>
      </div>
      <div class="export-item">
        <span class="label">File Size:</span>
        <span class="value">${sizeKB} KB</span>
      </div>
    `;
    exportHistory.style.display = 'block';
  } else {
    exportHistory.style.display = 'none';
  }

  // Update button state
  if (exportButton) {
    exportButton.disabled = exportState.status === 'pending';
    exportButton.textContent = exportState.status === 'pending'
      ? 'Exporting...'
      : 'Export to Excel';
  }
}
```

#### Verification Checklist
- [ ] Updates status indicator
- [ ] Displays export message
- [ ] Shows last export timestamp
- [ ] Shows file size information
- [ ] Updates button state appropriately
- [ ] Handles missing DOM elements gracefully

---

## 4.3 Event Binding & Initialization

### Objective

Set up all event listeners and wire handlers to DOM elements.

### 4.3.1 `initializeEventListeners()`

#### Purpose
Bind all handlers to their corresponding DOM elements and state change events.

#### Implementation

```javascript
/**
 * Initialize all event listeners for user interactions and state changes
 * 
 * @returns {void}
 */
export function initializeEventListeners() {
  console.log('Initializing event listeners...');

  // File input handler
  const fileInput = document.querySelector('#file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleImportFile);
    console.log('✓ File input listener bound');
  } else {
    console.warn('File input (#file-input) not found in DOM');
  }

  // Generate button handler
  const generateButton = document.querySelector('#generate-button');
  if (generateButton) {
    generateButton.addEventListener('click', handleGenerateAbrechnung);
    console.log('✓ Generate button listener bound');
  } else {
    console.warn('Generate button (#generate-button) not found in DOM');
  }

  // Export button handler
  const exportButton = document.querySelector('#export-button');
  if (exportButton) {
    exportButton.addEventListener('click', handleExportAbrechnung);
    console.log('✓ Export button listener bound');
  } else {
    console.warn('Export button (#export-button) not found in DOM');
  }

  // Reset button handler (optional)
  const resetButton = document.querySelector('#reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', handleResetApplication);
    console.log('✓ Reset button listener bound');
  }

  // State change listener - updates UI reactively
  subscribe((state) => {
    console.log('State changed - updating UI');
    updateImportUI(state);
    updateGenerateUI(state);
    updateExportUI(state);
  });

  console.log('Event listeners initialized');
}
```

#### Verification Checklist
- [ ] Binds file input change event
- [ ] Binds generate button click event
- [ ] Binds export button click event
- [ ] Binds reset button click event (if present)
- [ ] Subscribes to state changes
- [ ] Logs each binding for debugging
- [ ] Handles missing DOM elements gracefully
- [ ] All listeners work independently

---

## 4.4 UI Helper Functions

### Objective

Provide utility functions for common UI operations.

### Implementation

```javascript
/**
 * Display an error alert to the user
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @returns {void}
 */
export function showErrorAlert(title, message) {
  const alertContainer = document.querySelector('#alert-container');
  
  if (!alertContainer) {
    console.warn('Alert container not found. Falling back to alert()');
    alert(`${title}: ${message}`);
    return;
  }

  const alertElement = document.createElement('div');
  alertElement.className = 'alert alert-error';
  alertElement.role = 'alert';
  alertElement.innerHTML = `
    <div class="alert-header">
      <strong>${escapeHtml(title)}</strong>
      <button class="alert-close" aria-label="Close alert">&times;</button>
    </div>
    <div class="alert-body">
      ${escapeHtml(message)}
    </div>
  `;

  // Close button handler
  alertElement.querySelector('.alert-close').addEventListener('click', () => {
    alertElement.remove();
  });

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (alertElement.parentElement) {
      alertElement.remove();
    }
  }, 8000);

  alertContainer.appendChild(alertElement);
  console.error(`${title}: ${message}`);
}

/**
 * Display a success alert to the user
 * 
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @returns {void}
 */
export function showSuccessAlert(title, message) {
  const alertContainer = document.querySelector('#alert-container');
  
  if (!alertContainer) {
    console.log(`${title}: ${message}`);
    return;
  }

  const alertElement = document.createElement('div');
  alertElement.className = 'alert alert-success';
  alertElement.role = 'status';
  alertElement.innerHTML = `
    <div class="alert-header">
      <strong>${escapeHtml(title)}</strong>
      <button class="alert-close" aria-label="Close alert">&times;</button>
    </div>
    <div class="alert-body">
      ${escapeHtml(message)}
    </div>
  `;

  // Close button handler
  alertElement.querySelector('.alert-close').addEventListener('click', () => {
    alertElement.remove();
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (alertElement.parentElement) {
      alertElement.remove();
    }
  }, 5000);

  alertContainer.appendChild(alertElement);
  console.log(`${title}: ${message}`);
}

/**
 * Clear all alert messages from the container
 * 
 * @returns {void}
 */
export function clearErrorAlerts() {
  const alertContainer = document.querySelector('#alert-container');
  if (alertContainer) {
    alertContainer.innerHTML = '';
  }
}

/**
 * Escape HTML special characters to prevent XSS
 * 
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text);
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Show/hide loading spinner
 * 
 * @param {boolean} show - Whether to show spinner
 * @param {string} message - Optional message to display
 * @returns {void}
 */
export function setLoadingSpinner(show, message = '') {
  const spinner = document.querySelector('#loading-spinner');
  const message_el = document.querySelector('#loading-message');

  if (!spinner) {
    return;
  }

  if (show) {
    spinner.style.display = 'flex';
    if (message_el) {
      message_el.textContent = message;
    }
  } else {
    spinner.style.display = 'none';
  }
}

/**
 * Format file size for display
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
```

#### Verification Checklist
- [ ] Error alerts display and auto-dismiss
- [ ] Success alerts display and auto-dismiss
- [ ] Alerts can be manually closed
- [ ] HTML is escaped to prevent XSS
- [ ] Loading spinner shows/hides correctly
- [ ] File size formatted appropriately
- [ ] All UI helpers work consistently

---

## 4.5 Integration Flow

### Complete Event Flow Diagram

```
User Action (DOM)
    ↓
Event Listener Triggered
    ↓
Handler Function Called
    ├─→ Call Utility Functions (Phase 3)
    │   ├─→ readExcelFile()
    │   ├─→ parseProtokoll()
    │   ├─→ extractPositions()
    │   └─→ sumByPosition()
    ↓
State Updated (Phase 2)
    setState({ ... })
    ↓
State Change Event Fired
    ↓
UI Update Functions Called
    ├─→ updateImportUI(state)
    ├─→ updateGenerateUI(state)
    └─→ updateExportUI(state)
    ↓
DOM Updated
    ↓
User Sees Result
```

### State Transitions

```
Initial State:
  protokollData: { metadata: null, positionen: [] }
  abrechnungData: { header: null, positionen: {} }
  ui.import.status: 'idle'
  ui.generate.status: 'idle'
  ui.export.status: 'idle'

After Import:
  protokollData: { metadata: {...}, positionen: [...] }
  abrechnungData: { header: null, positionen: {} }
  ui.import.status: 'success'
  ui.generate.status: 'idle'  (now enabled)
  ui.export.status: 'idle'

After Generate:
  protokollData: { metadata: {...}, positionen: [...] }
  abrechnungData: { header: {...}, positionen: {...} }
  ui.import.status: 'success'
  ui.generate.status: 'success'
  ui.export.status: 'idle'  (now enabled)

After Export:
  (all data remains)
  ui.export.status: 'success'
  ui.export.lastExportAt: (timestamp)
```

---

## 4.6 Error Handling Strategy

### Common Scenarios & Recovery

| Scenario | Error | User Message | Recovery |
|----------|-------|--------------|----------|
| No file selected | N/A | N/A | Return early, no action |
| Invalid file format | readExcelFile rejects | "Only .xlsx files are supported" | Allow re-selection |
| Missing metadata | parseProtokoll throws | "Required field [name] is missing" | Suggest valid template |
| No import before generate | Precondition check | "Please import a protokoll.xlsx file first" | Navigate to import section |
| Large file processing | Timeout | "Processing is taking longer than expected" | Allow user to try again |
| Export fails | exportToExcel throws | "Failed to export file: [reason]" | Suggest browser restart |

### Error Handling Pattern

```javascript
// Standard error handling pattern used in all handlers

try {
  // 1. Validate preconditions
  if (!state.protokollData) {
    throw new Error('No data available');
  }

  // 2. Mark as loading
  setState({ ui: { ...state.ui, status: 'pending' } });

  // 3. Call utility functions
  const result = await someUtilityFunction();

  // 4. Validate result
  if (!result) {
    throw new Error('Invalid result');
  }

  // 5. Update state with success
  setState({ 
    ...state,
    ui: { ...state.ui, status: 'success', message: 'Success!' }
  });

} catch (error) {
  console.error('Operation failed:', error);

  // Update state with error
  setState({
    ...state,
    ui: { ...state.ui, status: 'error', message: error.message }
  });

  // Show user-friendly alert
  showErrorAlert('Operation Failed', error.message);
}
```

---

## Phase 4 Deliverables

At the end of Phase 4, the following should be complete and tested:

1. **Event Handlers (`handlers.js`)**
   - `handleImportFile()` — processes Excel upload
   - `handleGenerateAbrechnung()` — generates billing document
   - `handleExportAbrechnung()` — exports to file
   - `handleResetApplication()` — clears all data

2. **UI Update Functions**
   - `updateImportUI()` — updates import section
   - `updateGenerateUI()` — updates generate section
   - `updateExportUI()` — updates export section
   - Helper status indicator and message updates

3. **Event Binding**
   - `initializeEventListeners()` — binds all handlers
   - File input change listener
   - Button click listeners
   - State change subscriber

4. **UI Helper Functions**
   - `showErrorAlert()` — displays error messages
   - `showSuccessAlert()` — displays success messages
   - `clearErrorAlerts()` — removes all alerts
   - `escapeHtml()` — prevents XSS
   - `setLoadingSpinner()` — shows/hides loading indicator
   - `formatFileSize()` — formats file sizes

5. **Reactive Architecture**
   - All UI updates triggered by state changes
   - No direct DOM manipulation from utilities or state
   - Clean separation of concerns
   - Event-driven data flow

### Success Criteria for Phase 4

- ✓ All user interactions (import, generate, export, reset) work correctly
- ✓ UI updates reactively to state changes
- ✓ Error messages are clear and user-friendly
- ✓ Loading states are properly shown/hidden
- ✓ Buttons are enabled/disabled appropriately
- ✓ Summary information displays correctly
- ✓ All file operations complete without errors
- ✓ No console errors on happy path
- ✓ XSS prevention implemented
- ✓ Accessible markup and ARIA attributes used

---

## Phase 4 Testing Checklist

### Manual Testing

```
1. Import Workflow
  [ ] Select valid protokoll.xlsx file
  [ ] Observe status change to "pending"
  [ ] Observe status change to "success"
  [ ] Verify metadata is displayed
  [ ] Verify position count is shown
  [ ] Verify generate button becomes enabled

2. Generate Workflow
  [ ] Click generate button
  [ ] Observe status changes through "pending" → "success"
  [ ] Verify position sums are calculated
  [ ] Verify generation time is displayed
  [ ] Verify export button becomes enabled

3. Export Workflow
  [ ] Click export button
  [ ] Observe status changes through "pending" → "success"
  [ ] Verify file is downloaded with correct name
  [ ] Verify file can be opened in Excel
  [ ] Verify file contains correct data

4. Error Scenarios
  [ ] Try to generate without importing (shows error)
  [ ] Try to export without generating (shows error)
  [ ] Select invalid file type (shows error)
  [ ] Try corrupted Excel file (shows error)

5. State Persistence
  [ ] Complete full workflow
  [ ] Refresh page
  [ ] Verify state is restored from localStorage
  [ ] Verify data persists

6. UI Responsiveness
  [ ] Monitor console for errors
  [ ] Check all buttons disable during operations
  [ ] Verify spinners show during pending operations
  [ ] Check status indicators update correctly
```

---

## Next Steps: Preparation for Phase 5

With Phase 4 complete, the application logic is fully functional. Phase 5 will focus on:

- Creating the complete **HTML structure** with semantic elements
- Implementing **CSS styling** for professional appearance
- Performing **full end-to-end testing** with real data
- Preparing for **deployment and launch**

The event handlers and UI logic from Phase 4 will integrate seamlessly with the HTML and CSS created in Phase 5.

---

**Phase 4 Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Ready for Implementation