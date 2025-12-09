# Protokoll Module - Detailed Implementation Specifications

## Document Purpose

This document provides detailed technical specifications for implementing each module file in the Protokoll component. It serves as a reference guide for developers during the implementation phase.

---

## File 1: protokoll-state.js (State Management Module)

### Exports

```javascript
/**
 * Initialize protokoll state from localStorage or defaults
 * @returns {void}
 */
export function init() {}

/**
 * Get entire metadata object
 * @returns {Object} Metadata object
 */
export function getMetadata() {}

/**
 * Get entire positions array
 * @returns {Array} Positions array
 */
export function getPositions() {}

/**
 * Get single position by position number
 * @param {string} posNr - Position number
 * @returns {Object|null} Position object or null if not found
 */
export function getPosition(posNr) {}

/**
 * Get form state (current step, validation state, etc)
 * @returns {Object} Form state object
 */
export function getFormState() {}

/**
 * Get all current validation errors
 * @returns {Object} Validation errors indexed by field
 */
export function getValidationErrors() {}

/**
 * Update entire metadata section
 * @param {Object} metadata - New metadata object
 * @returns {void}
 */
export function setMetadata(metadata) {}

/**
 * Update single metadata field
 * @param {string} field - Field path (e.g., "facility.name")
 * @param {any} value - New value
 * @returns {void}
 */
export function setMetadataField(field, value) {}

/**
 * Add new position to positions array
 * @param {Object} position - Position object
 * @returns {string} Position number
 */
export function addPosition(position) {}

/**
 * Update existing position
 * @param {string} posNr - Position number
 * @param {Object} position - Updated position object
 * @returns {boolean} Success
 */
export function updatePosition(posNr, position) {}

/**
 * Delete position by position number
 * @param {string} posNr - Position number
 * @returns {boolean} Success
 */
export function deletePosition(posNr) {}

/**
 * Set current form step
 * @param {string} step - Step name: "metadata"|"positions"|"results"|"review"
 * @returns {void}
 */
export function setFormStep(step) {}

/**
 * Mark state as having unsaved changes
 * @returns {void}
 */
export function markUnsaved() {}

/**
 * Clear unsaved changes flag
 * @returns {void}
 */
export function clearUnsaved() {}

/**
 * Persist state to localStorage
 * @returns {void}
 */
export function saveToLocalStorage() {}

/**
 * Load state from localStorage
 * @returns {boolean} Success
 */
export function loadFromLocalStorage() {}

/**
 * Clear localStorage
 * @returns {void}
 */
export function clearLocalStorage() {}

/**
 * Subscribe to state change events
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function on(eventName, callback) {}

/**
 * Unsubscribe from state change events
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 * @returns {void}
 */
export function off(eventName, callback) {}

/**
 * Emit state change event
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @returns {void}
 */
export function emit(eventName, data) {}
```

### Data Structure Template

```javascript
const initialState = {
  metadata: {
    protokollNumber: '',
    datum: new Date().toISOString(),
    auftraggeber: '',
    auftraggaberAdresse: '',
    auftragnummer: '',
    kundennummer: '',
    auftragnehmer: '',
    auftragnehmerAdresse: '',
    facility: {
      name: '',
      address: '',
      anlage: '',
      location: '',
      inventory: '',
      prüfArt: [],
      netzspannung: '230/400',
      netzform: 'TN-S',
      netzbetreiber: ''
    },
    prüfer: {
      name: '',
      titel: '',
      unterschrift: ''
    },
    zeuge: {
      name: '',
      titel: '',
      unterschrift: ''
    }
  },

  positions: [],

  prüfungsergebnis: {
    mängelFestgestellt: false,
    plakette: 'ja',
    nächsterPrüfungstermin: '',
    bemerkung: ''
  },

  formState: {
    currentStep: 'metadata',
    positionCount: 0,
    unsavedChanges: false,
    validationErrors: {},
    isDirty: false
  }
};
```

### Event Types to Emit

- `metadataChanged` - When metadata is updated
- `positionAdded` - When new position added
- `positionUpdated` - When position updated
- `positionDeleted` - When position deleted
- `formStepChanged` - When form step changes
- `validationError` - When validation error occurs
- `stateSaved` - When state saved to localStorage
- `stateLoaded` - When state loaded from localStorage
- `unsavedChanges` - When unsaved changes detected

### localStorage Key Structure

```
Key: 'protokoll_draft_[timestamp]'
Value: {
  savedAt: '2025-12-09T19:21:00Z',
  metadata: { /* ... */ },
  positions: [ /* ... */ ],
  prüfungsergebnis: { /* ... */ },
  formState: { /* ... */ }
}

Key: 'protokoll_exports'
Value: [
  { timestamp, filename, type, size, status },
  ...
]
```

### Auto-save Strategy

- Trigger: On every state change
- Debounce: 3 seconds after last change
- Frequency: Maximum 1 save per 3 seconds
- Cleanup: Keep only last 5 auto-saves
- Fallback: Save immediately on navigation away

---

## File 2: protokoll-handlers.js (Event Handlers)

### Core Handler Functions

```javascript
/**
 * Initialize event listeners
 * @returns {void}
 */
export function init() {}

/**
 * Handle metadata field changes
 * @param {string} field - Field path
 * @param {any} value - New value
 * @returns {Promise}
 */
export async function handleMetadataChange(field, value) {}

/**
 * Handle facility information changes
 * @param {string} field - Field name
 * @param {any} value - New value
 * @returns {Promise}
 */
export async function handleFacilityChange(field, value) {}

/**
 * Toggle inspection type selection
 * @param {string} type - Inspection type name
 * @param {boolean} isSelected - Whether selected
 * @returns {Promise}
 */
export async function handleInspectionTypeToggle(type, isSelected) {}

/**
 * Handle adding new position
 * @returns {Promise}
 */
export async function handleAddPosition() {}

/**
 * Handle deleting position
 * @param {string} posNr - Position number
 * @returns {Promise<boolean>} Success
 */
export async function handleDeletePosition(posNr) {}

/**
 * Handle position data change
 * @param {string} posNr - Position number
 * @param {string} field - Field path
 * @param {any} value - New value
 * @returns {Promise}
 */
export async function handlePositionDataChange(posNr, field, value) {}

/**
 * Handle measurement value input
 * @param {string} posNr - Position number
 * @param {string} measurement - Measurement field name
 * @param {any} value - New value
 * @returns {Promise}
 */
export async function handlePositionMeasurement(posNr, measurement, value) {}

/**
 * Handle position result selection
 * @param {string} posNr - Position number
 * @param {string} status - Result status (ok|mängel|nicht-geprüft)
 * @param {Array} mängel - List of defects if status=mängel
 * @returns {Promise}
 */
export async function handlePositionResult(posNr, status, mängel) {}

/**
 * Move to previous form step
 * @returns {Promise}
 */
export async function handlePreviousStep() {}

/**
 * Move to next form step
 * @returns {Promise}
 */
export async function handleNextStep() {}

/**
 * Save form as draft and close
 * @returns {Promise}
 */
export async function handleSaveAsDraft() {}

/**
 * Discard unsaved changes
 * @returns {Promise}
 */
export async function handleDiscardDraft() {}

/**
 * Generate protokoll Excel file
 * @returns {Promise}
 */
export async function handleGenerateProtokoll() {}

/**
 * Generate abrechnung Excel file
 * @returns {Promise}
 */
export async function handleGenerateAbrechnung() {}

/**
 * Generate both protokoll and abrechnung files
 * @returns {Promise}
 */
export async function handleExportBoth() {}

/**
 * Preview form data before export
 * @returns {Promise}
 */
export async function handlePreview() {}

/**
 * Handle form validation errors
 * @param {Object} errors - Validation error object
 * @returns {void}
 */
export function handleValidationError(errors) {}

/**
 * Handle general form validation
 * @returns {Promise<boolean>} Is valid
 */
export async function handleValidation() {}
```

### Event Delegation Pattern

```javascript
// Attach single delegated listener to form container
document.getElementById('protokollFormContainer').addEventListener('change', async (e) => {
  const { target } = e;
  
  // Determine field path from element attributes/name
  const fieldPath = target.getAttribute('data-field');
  const value = target.type === 'checkbox' ? target.checked : target.value;
  
  // Call appropriate handler based on field
  if (fieldPath.startsWith('metadata.')) {
    await handleMetadataChange(fieldPath, value);
  } else if (fieldPath.startsWith('position.')) {
    // Parse posNr and field from path
    await handlePositionDataChange(posNr, field, value);
  }
});
```

---

## File 3: protokoll-renderer.js (UI Rendering)

### Core Rendering Functions

```javascript
/**
 * Initialize renderer
 * @returns {void}
 */
export function init() {}

/**
 * Render entire metadata form
 * @returns {void}
 */
export function renderMetadataForm() {}

/**
 * Render positions table and form
 * @returns {void}
 */
export function renderPositionForm() {}

/**
 * Render inspection results form
 * @returns {void}
 */
export function renderResultsForm() {}

/**
 * Render review/summary form
 * @returns {void}
 */
export function renderReviewForm() {}

/**
 * Update progress indicator
 * @param {string} currentStep - Current step name
 * @returns {void}
 */
export function updateProgressIndicator(currentStep) {}

/**
 * Render single text input field
 * @param {string} fieldPath - Field path
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {Object} options - Rendering options
 * @returns {HTMLElement}
 */
export function renderTextField(fieldPath, label, value, options = {}) {}

/**
 * Render date picker field
 * @param {string} fieldPath - Field path
 * @param {string} label - Field label
 * @param {string} value - Current value (ISO date)
 * @param {Object} options - Rendering options
 * @returns {HTMLElement}
 */
export function renderDateField(fieldPath, label, value, options = {}) {}

/**
 * Render select dropdown
 * @param {string} fieldPath - Field path
 * @param {string} label - Field label
 * @param {Array} options - Select options: [{value, label}, ...]
 * @param {string} selected - Currently selected value
 * @returns {HTMLElement}
 */
export function renderSelectField(fieldPath, label, options, selected) {}

/**
 * Render multi-select checkboxes
 * @param {string} fieldPath - Field path
 * @param {string} label - Field label
 * @param {Array} options - Checkbox options: [{value, label}, ...]
 * @param {Array} selected - Currently selected values
 * @returns {HTMLElement}
 */
export function renderMultiSelectField(fieldPath, label, options, selected) {}

/**
 * Render number input field
 * @param {string} fieldPath - Field path
 * @param {string} label - Field label
 * @param {number} value - Current value
 * @param {Object} options - {min, max, step, unit}
 * @returns {HTMLElement}
 */
export function renderNumberField(fieldPath, label, value, options = {}) {}

/**
 * Render checkbox field
 * @param {string} fieldPath - Field path
 * @param {boolean} checked - Is checked
 * @param {string} label - Field label
 * @returns {HTMLElement}
 */
export function renderCheckboxField(fieldPath, checked, label) {}

/**
 * Render radio button group
 * @param {string} fieldPath - Field path
 * @param {Array} options - Radio options: [{value, label}, ...]
 * @param {string} selected - Currently selected value
 * @returns {HTMLElement}
 */
export function renderRadioButtonGroup(fieldPath, options, selected) {}

/**
 * Render positions table
 * @param {Array} positions - Positions array
 * @returns {HTMLElement}
 */
export function renderPositionTable(positions) {}

/**
 * Render single position row in table
 * @param {Object} position - Position object
 * @param {number} index - Row index
 * @returns {HTMLElement}
 */
export function renderPositionRow(position, index) {}

/**
 * Add new position row to table
 * @param {Object} position - New position object
 * @returns {HTMLElement}
 */
export function addPositionRow(position) {}

/**
 * Remove position row from table
 * @param {string} posNr - Position number
 * @returns {void}
 */
export function removePositionRow(posNr) {}

/**
 * Update existing position row
 * @param {string} posNr - Position number
 * @param {Object} position - Updated position object
 * @returns {void}
 */
export function updatePositionRow(posNr, position) {}

/**
 * Display message (success, error, warning, info)
 * @param {string} type - Message type
 * @param {string} message - Message text
 * @param {Object} options - Display options
 * @returns {HTMLElement}
 */
export function displayMessage(type, message, options = {}) {}

/**
 * Display field-level error
 * @param {string} fieldPath - Field path
 * @param {string} errorMessage - Error message
 * @returns {void}
 */
export function displayFieldError(fieldPath, errorMessage) {}

/**
 * Clear field error
 * @param {string} fieldPath - Field path
 * @returns {void}
 */
export function clearFieldError(fieldPath) {}

/**
 * Display all validation errors at once
 * @param {Object} errors - Validation errors by field
 * @returns {void}
 */
export function displayValidationErrors(errors) {}

/**
 * Display success message
 * @param {string} message - Success message
 * @returns {void}
 */
export function displaySuccessMessage(message) {}

/**
 * Display error message
 * @param {string} error - Error message
 * @returns {void}
 */
export function displayErrorMessage(error) {}

/**
 * Render form summary for review step
 * @returns {HTMLElement}
 */
export function renderFormSummary() {}

/**
 * Render export preview
 * @returns {HTMLElement}
 */
export function renderExportPreview() {}

/**
 * Show loading spinner
 * @returns {void}
 */
export function showLoadingSpinner() {}

/**
 * Hide loading spinner
 * @returns {void}
 */
export function hideLoadingSpinner() {}

/**
 * Update single field in UI
 * @param {string} fieldPath - Field path
 * @param {any} value - New value
 * @returns {void}
 */
export function updateFieldValue(fieldPath, value) {}

/**
 * Enable/disable form submission
 * @param {boolean} enabled - Enable form
 * @returns {void}
 */
export function setFormEnabled(enabled) {}
```

### HTML Generation Helpers

```javascript
/**
 * Create form group wrapper
 * @param {HTMLElement} label - Label element
 * @param {HTMLElement} input - Input element
 * @param {string} errorMessage - Optional error message
 * @returns {HTMLElement}
 */
function createFormGroup(label, input, errorMessage = '') {}

/**
 * Create fieldset with legend
 * @param {string} legend - Legend text
 * @param {Array<HTMLElement>} fields - Field elements
 * @returns {HTMLElement}
 */
function createFieldset(legend, fields) {}

/**
 * Create message box
 * @param {string} type - Type: 'success'|'error'|'warning'|'info'
 * @param {string} message - Message text
 * @param {boolean} dismissible - Show close button
 * @returns {HTMLElement}
 */
function createMessageBox(type, message, dismissible = true) {}
```

---

## File 4: protokoll-validator.js (Validation)

### Validation Rule Definition

```javascript
/**
 * Validate single field
 * @param {string} fieldPath - Field path
 * @param {any} value - Value to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateField(fieldPath, value) {}

/**
 * Validate single position
 * @param {Object} position - Position object
 * @returns {{isValid: boolean, errors: Object}}
 */
export function validatePosition(position) {}

/**
 * Validate all positions
 * @param {Array} positions - Positions array
 * @returns {{isValid: boolean, errors: Array}}
 */
export function validateAllPositions(positions) {}

/**
 * Validate entire metadata section
 * @param {Object} metadata - Metadata object
 * @returns {{isValid: boolean, errors: Object}}
 */
export function validateMetadata(metadata) {}

/**
 * Validate entire form before export
 * @param {Object} formData - Complete form data
 * @returns {{isValid: boolean, errors: Object, summary: string}}
 */
export function validateForm(formData) {}

/**
 * Check for duplicate position numbers
 * @param {Array} positions - Positions array
 * @returns {Array} Array of duplicate pos numbers, empty if none
 */
export function checkForDuplicatePositions(positions) {}

/**
 * Validate measurement values (special physics checks)
 * @param {Object} measurements - Measurement object
 * @returns {{isValid: boolean, warnings: Array}}
 */
export function validateMeasurements(measurements) {}

/**
 * Get validation summary/report
 * @returns {{totalErrors: number, errorsByField: Object, warnings: Array}}
 */
export function getValidationSummary() {}
```

### Validation Rules Configuration

```javascript
const VALIDATION_RULES = {
  'metadata.protokollNumber': {
    required: true,
    pattern: /^[A-Z0-9]{3,20}$/,
    message: 'Protocol number must be 3-20 alphanumeric characters'
  },
  
  'metadata.auftraggeber': {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Client name must be 3-100 characters'
  },
  
  'metadata.facility.netzform': {
    required: true,
    enum: ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'],
    message: 'Select a valid network form'
  },
  
  'position.stromkreisNr': {
    required: true,
    pattern: /^[F0-9]{1,3}$/,
    message: 'Circuit number must be alphanumeric, max 3 characters'
  },
  
  'position.spannung.un': {
    required: true,
    type: 'number',
    min: 0,
    max: 1000,
    message: 'Voltage must be between 0-1000V'
  }
};
```

---

## File 5: protokoll-exporter.js (Excel Export)

### Export Functions

```javascript
/**
 * Export protokoll.xlsx file
 * @returns {Promise}
 */
export async function exportProtokoll() {}

/**
 * Export abrechnung.xlsx file
 * @returns {Promise}
 */
export async function exportAbrechnung() {}

/**
 * Export both protokoll and abrechnung files
 * @returns {Promise}
 */
export async function exportBoth() {}

/**
 * Load protokoll template from file
 * @returns {Promise<Workbook>}
 */
async function loadProtokollTemplate() {}

/**
 * Load abrechnung template from file
 * @returns {Promise<Workbook>}
 */
async function loadAbrechnungTemplate() {}

/**
 * Fill protokoll template with form data
 * @param {Workbook} templateWb - Template workbook
 * @param {Object} formData - Form data object
 * @returns {Workbook} Filled workbook
 */
function fillProtokollTemplate(templateWb, formData) {}

/**
 * Fill abrechnung template with form data
 * @param {Workbook} templateWb - Template workbook
 * @param {Object} formData - Form data object
 * @returns {Workbook} Filled workbook
 */
function fillAbrechnungTemplate(templateWb, formData) {}

/**
 * Validate form data before export
 * @param {Object} formData - Form data to validate
 * @returns {{isValid: boolean, errors: Array}}
 */
function validateBeforeExport(formData) {}

/**
 * Generate filename with timestamp
 * @param {string} type - File type: 'protokoll'|'abrechnung'
 * @returns {string} Generated filename
 */
function generateFilename(type) {}

/**
 * Trigger browser download
 * @param {Blob} blob - File blob
 * @param {string} filename - Filename
 * @returns {Promise}
 */
async function triggerDownload(blob, filename) {}
```

### Template Cell Mapping

```javascript
const PROTOKOLL_CELL_MAP = {
  'metadata.protokollNumber': 'U3',
  'metadata.datum': 'AF3',
  'metadata.auftraggeber': 'C4',
  'metadata.auftragnummer': 'K4',
  'metadata.kundennummer': 'N4',
  'metadata.auftragnehmer': 'S4',
  'metadata.auftragnehmerAdresse': 'S5:S6',
  
  'metadata.facility.name': 'C6',
  'metadata.facility.address': 'C7:C8',
  'metadata.facility.anlage': 'C9',
  'metadata.facility.inventory': 'U9',
  
  // Positions: Dynamic rows starting at row 30
  // position[i].stromkreisNr -> Column C, Row 30+i
  // position[i].zielbezeichnung -> Column D, Row 30+i
  // ... etc
};
```

### Error Handling

```javascript
/**
 * Handle file generation errors
 * @param {Error} error - Original error
 * @param {string} fileType - File type being generated
 * @returns {string} User-friendly error message
 */
function handleExportError(error, fileType) {}

/**
 * Retry export with exponential backoff
 * @param {Function} exportFn - Export function to retry
 * @param {number} maxRetries - Max retry attempts
 * @returns {Promise}
 */
async function retryWithBackoff(exportFn, maxRetries = 3) {}
```

---

## Implementation Checklist

### Phase 1: Core Setup
- [ ] Create `js/protokoll/` directory structure
- [ ] Create all 5 module files with JSDoc comments
- [ ] Set up ES6 module exports/imports
- [ ] Update `main.js` to import protokoll modules
- [ ] Update `index.html` with protokoll section

### Phase 2: State Management
- [ ] Implement `protokoll-state.js` complete
- [ ] Test state initialization
- [ ] Test state updates
- [ ] Test localStorage persistence
- [ ] Test event emission

### Phase 3: Handlers
- [ ] Implement `protokoll-handlers.js` complete
- [ ] Wire up event listeners
- [ ] Test form input handling
- [ ] Test form navigation
- [ ] Test error handling

### Phase 4: Rendering
- [ ] Implement `protokoll-renderer.js` complete
- [ ] Render metadata form
- [ ] Render positions table
- [ ] Render results form
- [ ] Render review form
- [ ] Test responsive design

### Phase 5: Validation
- [ ] Implement `protokoll-validator.js` complete
- [ ] Define all validation rules
- [ ] Test field validation
- [ ] Test form-level validation
- [ ] Test error message display

### Phase 6: Export
- [ ] Implement `protokoll-exporter.js` complete
- [ ] Test template loading
- [ ] Test template filling
- [ ] Test file generation
- [ ] Test browser download
- [ ] Test error recovery

### Phase 7: Integration & Testing
- [ ] Full end-to-end form workflow
- [ ] Mobile responsiveness
- [ ] Accessibility compliance
- [ ] Performance optimization
- [ ] Documentation
- [ ] Unit tests for each module
- [ ] Integration tests
- [ ] UI/UX testing

---

## API Integration Points

### With existing `state.js`
```javascript
// After protokoll export, update global state
globalState.protokoll = {
  lastExported: timestamp,
  exportedFile: filename,
  exportFormat: type
};
```

### With existing `handlers.js`
```javascript
// Global handlers may trigger protokoll handlers
if (currentStep === 'protokoll') {
  protokollHandlers.handleExport();
}
```

### With existing `utils.js`
```javascript
// May reuse Excel utilities for reading templates
const wb = XLSX.read(templateBuffer, { type: 'array' });
```

---

## Performance Targets

- Form render time: < 500ms
- Field validation: < 100ms
- Template load: < 200ms
- File generation: < 2000ms
- Total export flow: < 3000ms
- Page resize responsive: < 60ms (60fps)
- localStorage operations: < 50ms

---

## Browser Compatibility

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS 12+, Android 8+

### Required APIs
- `localStorage` - For state persistence
- `Blob` - For file generation
- `URL.createObjectURL()` - For downloads
- `FileReader` - For template loading
- ES6 Modules - For code organization
- Modern CSS Grid/Flexbox - For layout
- `Promise`/`async-await` - For async operations

---

This specification document provides all the details needed to implement the Protokoll module following the existing Abrechnung application architecture.
