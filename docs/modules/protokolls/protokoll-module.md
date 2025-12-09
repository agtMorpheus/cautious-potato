# Protokoll Module - Comprehensive Implementation Guide

## Overview

The **Protokoll Module** is a new feature component for the Abrechnung application that provides users with an interactive form-based interface to fill out inspection protocols (Prüfprotokolle) and export them to both **protokoll.xlsx** and **abrechnung.xlsx** formats.

This module extends the existing application architecture by adding a fourth major workflow step that allows users to:
1. Fill out protocol metadata (customer info, facility details, inspection parameters)
2. Input circuit/position measurements and test results
3. Generate complete protokoll.xlsx files following VDE 0100 standards
4. Automatically generate abrechnung.xlsx billing documents from the same form

---

## Module Architecture

### File Structure

```
abrechnung-app/
├── js/
│   ├── protokoll/
│   │   ├── protokoll-state.js      # Protokoll-specific state management
│   │   ├── protokoll-handlers.js   # Event handlers for form inputs
│   │   ├── protokoll-renderer.js   # UI rendering and form generation
│   │   ├── protokoll-validator.js  # Form validation logic
│   │   └── protokoll-exporter.js   # Excel export functionality
│   ├── state.js                    # Existing central state management (updated)
│   ├── handlers.js                 # Existing event handlers (updated)
│   ├── utils.js                    # Existing utility functions
│   └── main.js                     # Application bootstrap (updated)
├── css/
│   ├── protokoll.css               # Protokoll-specific styling
│   └── styles.css                  # Existing global styles
├── templates/
│   ├── protokoll.xlsx              # Existing template
│   ├── abrechnung.xlsx             # Existing template
│   └── protokoll-template.json     # New: JSON schema for form structure
├── index.html                      # Updated with Protokoll section
└── ...
```

---

## Module Components

### 1. **protokoll-state.js** - State Management Layer

**Purpose:** Manage all protokoll-specific state data, maintaining separation from global application state.

**Key Responsibilities:**
- Store protokoll form data (metadata, positions, measurements)
- Manage form validation state
- Track unsaved changes
- Persist temporary data to localStorage
- Emit state change events

**Main Data Structure:**

```javascript
const protokollState = {
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
      prüfArt: '', // Array of selected inspection types
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
  
  positions: [
    {
      posNr: '',
      stromkreisNr: '',
      zielbezeichnung: '',
      leitung: {
        typ: '',
        anzahl: '',
        querschnitt: ''
      },
      spannung: {
        un: '', // Nennspannung
        fn: ''  // Frequenz
      },
      überstromschutz: {
        art: '',
        inNennstrom: '',
        zs: '',
        zn: '',
        ik: ''
      },
      messwerte: {
        riso: '',
        schutzleiterWiderstand: '',
        rcd: '',
        differenzstrom: '',
        auslösezeit: ''
      },
      prüfergebnis: {
        status: 'ok', // 'ok', 'mängel', 'nicht-geprüft'
        mängel: [],
        bemerkung: ''
      }
    }
  ],

  prüfungsergebnis: {
    mängelFestgestellt: false,
    plakette: 'ja',
    nächsterPrüfungstermin: new Date(Date.now() + 3*365*24*60*60*1000).toISOString(),
    bemerkung: ''
  },

  formState: {
    currentStep: 'metadata', // 'metadata', 'positions', 'results', 'review'
    positionCount: 0,
    unsavedChanges: false,
    validationErrors: {},
    isDirty: false
  }
};
```

**Key Methods:**

```javascript
// Getters
getMetadata()
getPositions()
getPosition(posNr)
getFormState()
getValidationErrors()

// Setters
setMetadata(metadata)
addPosition(position)
updatePosition(posNr, position)
deletePosition(posNr)
setFormStep(step)
markUnsaved()
clearUnsaved()

// Validators
validateMetadata()
validatePosition(posNr)
validateAllPositions()
validateForm()

// Persistence
saveToLocalStorage()
loadFromLocalStorage()
clearLocalStorage()

// Events
on(eventName, callback)
off(eventName, callback)
emit(eventName, data)
```

---

### 2. **protokoll-handlers.js** - Event Handler Layer

**Purpose:** Handle all user interactions with the protokoll form.

**Key Event Handlers:**

```javascript
// Metadata handlers
handleMetadataChange(field, value)
handleFacilityChange(field, value)
handleInspectionTypeToggle(type, isSelected)

// Position handlers
handleAddPosition()
handleDeletePosition(posNr)
handlePositionDataChange(posNr, field, value)
handlePositionMeasurement(posNr, measurement, value)
handlePositionResult(posNr, status, mängel)

// Form navigation
handlePreviousStep()
handleNextStep()
handleSaveAsDraft()
handleDiscardDraft()

// Export handlers
handleGenerateProtokoll()
handleGenerateAbrechnung()
handleExportBoth()
handlePreview()

// Validation handlers
handleValidation()
handleValidationError(error)
```

**Handler Pattern Example:**

```javascript
function handleMetadataChange(field, value) {
  // Validate input
  const validationResult = protokollValidator.validateField(field, value);
  
  if (validationResult.isValid) {
    // Update state
    protokollState.setMetadata({
      ...protokollState.getMetadata(),
      [field]: value
    });
    
    // Mark unsaved
    protokollState.markUnsaved();
    
    // Render UI update
    protokollRenderer.updateMetadataField(field, value);
    
    // Clear validation error if any
    protokollRenderer.clearFieldError(field);
  } else {
    // Display validation error
    protokollRenderer.displayFieldError(field, validationResult.error);
  }
  
  // Emit event for integration with main app
  document.dispatchEvent(new CustomEvent('protokollChanged', {
    detail: { field, value, isValid: validationResult.isValid }
  }));
}
```

---

### 3. **protokoll-renderer.js** - UI Rendering Layer

**Purpose:** Manage all UI rendering and form generation for the protokoll module.

**Key Rendering Methods:**

```javascript
// Form rendering
renderMetadataForm()
renderPositionForm()
renderResultsForm()
renderReviewForm()
renderProgressIndicator(currentStep)

// Field rendering
renderTextField(field, value, isRequired, validation)
renderDateField(field, value)
renderSelectField(field, options, selected)
renderMultiSelectField(field, options, selected)
renderNumberField(field, value, min, max)
renderCheckboxField(field, checked, label)
renderRadioButtonGroup(field, options, selected)

// Position table rendering
renderPositionTable()
renderPositionRow(position)
addPositionRow()
removePositionRow(posNr)
updatePositionRow(posNr, position)

// Status and messages
displayMessage(type, message)
displayFieldError(field, errorMessage)
clearFieldError(field)
displayValidationErrors(errors)
displaySuccessMessage(message)
displayErrorMessage(error)

// Preview and summary
renderFormSummary()
renderExportPreview()
showLoadingSpinner()
hideLoadingSpinner()
```

**Form Structure (HTML-like pseudocode):**

```html
<section id="protokollSection" class="section panel">
  <div class="section-header">
    <h2>Step 4: Create Inspection Protocol</h2>
    <p class="section-description">Fill out a complete VDE 0100 inspection protocol</p>
  </div>

  <div class="section-content">
    <!-- Progress Indicator -->
    <div id="protokollProgress" class="progress-indicator">
      <div class="progress-step active" data-step="metadata">Metadata</div>
      <div class="progress-step" data-step="positions">Positions</div>
      <div class="progress-step" data-step="results">Results</div>
      <div class="progress-step" data-step="review">Review</div>
    </div>

    <!-- Metadata Form -->
    <form id="metadataForm" class="protokoll-form metadata-form">
      <fieldset>
        <legend>Protocol Information</legend>
        <!-- Metadata fields -->
      </fieldset>
      <fieldset>
        <legend>Facility Details</legend>
        <!-- Facility fields -->
      </fieldset>
      <fieldset>
        <legend>Inspector Information</legend>
        <!-- Inspector fields -->
      </fieldset>
    </form>

    <!-- Positions Form -->
    <form id="positionsForm" class="protokoll-form positions-form" style="display: none;">
      <div id="positionsTable" class="positions-table">
        <!-- Dynamic position rows -->
      </div>
      <button type="button" class="btn btn-secondary" id="addPositionBtn">
        Add Position
      </button>
    </form>

    <!-- Results Form -->
    <form id="resultsForm" class="protokoll-form results-form" style="display: none;">
      <!-- Inspection results and measurement data -->
    </form>

    <!-- Review Form -->
    <div id="reviewForm" class="protokoll-form review-form" style="display: none;">
      <div class="form-summary">
        <!-- Summary of all entered data -->
      </div>
    </div>

    <!-- Form Navigation -->
    <div class="form-navigation">
      <button id="protokollPrevBtn" class="btn btn-secondary" disabled>
        Previous
      </button>
      <button id="protokollNextBtn" class="btn btn-primary">
        Next
      </button>
      <button id="protokollSaveBtn" class="btn btn-success" style="display: none;">
        Save and Export
      </button>
    </div>

    <!-- Status Messages -->
    <div id="protokollMessages" class="message-container"></div>
  </div>
</section>
```

---

### 4. **protokoll-validator.js** - Validation Layer

**Purpose:** Validate form data according to VDE 0100 standards and application requirements.

**Validation Rules:**

```javascript
const validationRules = {
  metadata: {
    protokollNumber: { required: true, pattern: /^[A-Z0-9]{3,20}$/, message: 'Valid protocol number required' },
    auftraggeber: { required: true, minLength: 3, maxLength: 100 },
    auftragnummer: { required: false, pattern: /^[A-Z0-9]{1,20}$/ },
    facility: {
      name: { required: true, minLength: 3 },
      address: { required: true, minLength: 5 },
      netzspannung: { required: true, enum: ['230/400', '400/230', '230V', '400V'] },
      netzform: { required: true, enum: ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'] }
    },
    prüfer: {
      name: { required: true, minLength: 2 },
      titel: { required: false }
    }
  },
  
  position: {
    stromkreisNr: { required: true, pattern: /^[F0-9]{1,3}$/ },
    zielbezeichnung: { required: true, minLength: 3 },
    spannung: {
      un: { required: true, min: 0, max: 1000 },
      fn: { required: true, enum: [50, 60] }
    },
    messwerte: {
      riso: { required: true, min: 0 },
      differenzstrom: { required: false, min: 0, max: 500 }
    }
  }
};
```

**Key Validation Methods:**

```javascript
validateField(field, value)
validatePosition(position)
validateAllPositions()
validateMetadata(metadata)
validateForm(formData)
checkForDuplicatePositions()
validateMeasurements(measurements)
getValidationSummary()
```

---

### 5. **protokoll-exporter.js** - Export Layer

**Purpose:** Generate and export protokoll.xlsx and abrechnung.xlsx files from form data.

**Export Methods:**

```javascript
// Main export functions
async exportProtokoll()
async exportAbrechnung()
async exportBoth()

// Helper functions
async loadProtokollTemplate()
async loadAbrechnungTemplate()
fillProtokollTemplate(templateWorkbook, formData)
fillAbrechnungTemplate(templateWorkbook, formData, positions)
validateBeforeExport(formData)
generateFilename(type) // Returns: 'Protokoll_EDB101120250925_2025-12-09.xlsx'
```

**Export Process:**

1. **Validate Form Data**
   - Ensure all required fields are filled
   - Check validation rules
   - Report any errors

2. **Load Templates**
   - Fetch protokoll.xlsx template
   - Fetch abrechnung.xlsx template

3. **Fill Template Data**
   - Map form metadata to template cells
   - Insert position measurements and results
   - Calculate totals and summaries
   - Apply formatting

4. **Generate Files**
   - Create workbook using SheetJS
   - Set proper Excel formatting
   - Generate downloadable files

5. **Export Files**
   - Trigger browser download
   - Generate unique filenames with timestamp
   - Track export history

---

## Integration with Existing Application

### Updates to `index.html`

Add new section before utilities:

```html
<!-- PROTOKOLL SECTION (NEW) -->
<section id="protokollSection" class="section panel">
  <div class="section-header">
    <h2>Step 4: Create Inspection Protocol</h2>
    <p class="section-description">Fill out a complete VDE 0100 inspection protocol and export to Excel</p>
  </div>
  <div class="section-content">
    <!-- Form will be rendered here by protokoll-renderer.js -->
    <div id="protokollFormContainer"></div>
  </div>
</section>
```

### Updates to `main.js`

```javascript
// Import new Protokoll modules
import * as protokollState from './protokoll/protokoll-state.js';
import * as protokollHandlers from './protokoll/protokoll-handlers.js';
import * as protokollRenderer from './protokoll/protokoll-renderer.js';
import * as protokollValidator from './protokoll/protokoll-validator.js';
import * as protokollExporter from './protokoll/protokoll-exporter.js';

// Initialize Protokoll module
function initializeProtokollModule() {
  console.log('Initializing Protokoll Module...');
  
  // Initialize state
  protokollState.init();
  
  // Register event handlers
  document.getElementById('protokollFormContainer').addEventListener('change', (e) => {
    protokollHandlers.handleFormChange(e);
  });
  
  // Render initial form
  protokollRenderer.renderMetadataForm();
  
  console.log('✓ Protokoll Module initialized');
}

// Call in main initialization
initializeProtokollModule();
```

### Updates to `state.js`

Keep global state separate but add references:

```javascript
const globalState = {
  // Existing state...
  protokoll: null // Reference to protokoll module state
};

// Add method to link protokoll state
function linkProtokollState(protokollStateModule) {
  globalState.protokoll = protokollStateModule;
}
```

---

## Form Structure and Fields

### Step 1: Metadata Form

**Section: Protocol Information**
- Protocol Number (required): Text input, pattern validation
- Date (required): Date picker, defaults to today
- Inspector Name (required): Text input
- Inspector Title (optional): Text input

**Section: Facility Details**
- Facility Name (required): Text input
- Facility Address (required): Textarea
- Facility Location (required): Text input
- Inventory Number (optional): Text input
- Installation (required): Text input

**Section: Inspection Type Selection**
- Checkboxes for:
  - Initial Inspection (Neuanlage)
  - Expansion (Erweiterung)
  - Modification (Änderung)
  - Repair (Instandsetzung)
  - Periodic Inspection (Wiederholungsprüfung)

**Section: Network Information**
- Network Voltage (select): 230/400V, 400/230V, etc.
- Network Form (select): TN-C, TN-S, TN-C-S, TT, IT
- Network Provider (optional): Text input

**Section: Inspector Signature**
- Name (required): Text input
- Title (optional): Text input
- Signature Date: Date picker

---

### Step 2: Positions Form

**Dynamic Table Structure**

Columns:
- Position Number
- Circuit Number
- Target Description
- Cable Type
- Conductors (count)
- Cross-section (mm²)
- Voltage (V)
- Frequency (Hz)
- Protection Type
- Rated Current (A)
- Impedance L-PE (Ω)
- Impedance L-N (Ω)
- Short-circuit Current (kA)
- Actions (Edit/Delete)

**Add Position Button** - Opens inline editor or modal for new position entry

**Edit Features:**
- Inline editing or dedicated form
- Auto-validation on field change
- Save/Cancel buttons per row
- Duplicate position option

---

### Step 3: Results Form

**Section: Inspection Results**
- No defects found (radio button)
- Defects found (radio button)
- Remarks (textarea)

**Section: Test Certificate**
- Certificate placed (Yes/No)
- Next inspection date (date picker)

**Section: Grounding Resistance**
- RE value (Ω): Number input

**Section: Signatures**
- Inspector Name & Signature
- Witness Name & Signature (if required)

---

### Step 4: Review Form

**Summary Section**
- Display all entered data in read-only format
- Organized by sections (metadata, positions, results)
- Visual indicators for completeness

**Export Options:**
- Export Protokoll.xlsx only
- Export Abrechnung.xlsx only
- Export Both files
- Preview before export

---

## CSS Styling (protokoll.css)

```css
/* Protocol Form Styles */
.protokoll-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.protokoll-form fieldset {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background-color: #f8f9fa;
}

.protokoll-form fieldset legend {
  padding: 0 10px;
  font-weight: 600;
  font-size: 1.1rem;
  color: #333;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.form-group label {
  font-weight: 500;
  font-size: 0.95rem;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Progress Indicator */
.progress-indicator {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.progress-step {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #999;
  background-color: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.progress-step.active {
  color: #fff;
  background-color: #667eea;
  transform: scale(1.05);
}

.progress-step.completed {
  color: #fff;
  background-color: #28a745;
}

/* Positions Table */
.positions-table {
  overflow-x: auto;
  margin-bottom: 20px;
}

.positions-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.positions-table th {
  background-color: #f0f0f0;
  padding: 12px;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
  text-align: left;
}

.positions-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.positions-table tr:hover {
  background-color: #f9f9f9;
}

/* Form Navigation */
.form-navigation {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  justify-content: flex-end;
}

.form-navigation .btn {
  flex: 0 1 auto;
}

@media (max-width: 768px) {
  .progress-indicator {
    flex-direction: column;
    gap: 10px;
  }
  
  .progress-step {
    width: 100%;
  }
  
  .positions-table {
    font-size: 0.75rem;
  }
  
  .form-navigation {
    flex-direction: column;
  }
}
```

---

## Data Flow Diagram

```
User Form Input
       ↓
protokoll-handlers.js
(Event handler)
       ↓
protokoll-validator.js
(Validation check)
       ↓
protokoll-state.js
(State update + localStorage)
       ↓
protokoll-renderer.js
(UI update)
       ↓
User sees updated form
```

## Export Flow

```
User clicks Export
       ↓
protokoll-handlers.handleGenerateProtokoll()
       ↓
protokoll-validator.validateForm()
       ↓
protokoll-exporter.loadProtokollTemplate()
       ↓
protokoll-exporter.fillProtokollTemplate()
       ↓
generateFilename() + trigger download
       ↓
Display success message
```

---

## Error Handling

**Validation Errors:**
- Display field-level errors in red below field
- Show validation summary at top of form
- Prevent export if validation fails

**Export Errors:**
- Template loading failures
- File generation errors
- Download failures

**Recovery:**
- Autosave to localStorage every 30 seconds
- Offer to restore from draft on app reload
- Clear cache button in utilities section

---

## localStorage Schema

```javascript
// Key: 'protokoll_draft_[timestamp]'
{
  "savedAt": "2025-12-09T19:21:00Z",
  "metadata": { /* ... */ },
  "positions": [ /* ... */ ],
  "prüfungsergebnis": { /* ... */ },
  "formState": { /* ... */ }
}

// Key: 'protokoll_exports'
[
  {
    "timestamp": "2025-12-09T19:30:00Z",
    "filename": "Protokoll_EDB101120250925_2025-12-09.xlsx",
    "type": "both", // 'protokoll', 'abrechnung', 'both'
    "size": 125000,
    "status": "success"
  }
]
```

---

## Testing Checklist

### Unit Tests
- [ ] Metadata validation tests
- [ ] Position validation tests
- [ ] Field-level validation
- [ ] Form state management
- [ ] localStorage persistence

### Integration Tests
- [ ] Form navigation flow
- [ ] Event handler chain
- [ ] State updates trigger UI renders
- [ ] Export functionality
- [ ] File download generation

### UI/UX Tests
- [ ] Form renders correctly on all screen sizes
- [ ] Progress indicator updates correctly
- [ ] Validation errors display clearly
- [ ] Export success message shows
- [ ] Unsaved changes warning works

### Excel Export Tests
- [ ] Protokoll.xlsx generated with correct data
- [ ] Abrechnung.xlsx generated correctly
- [ ] Files are downloadable
- [ ] Filenames include timestamp
- [ ] Template data maps correctly

---

## Performance Considerations

- **Large Position Lists:** Implement virtual scrolling for tables with 100+ positions
- **localStorage Size:** Limit drafts to last 5 autosaves
- **Template Loading:** Cache templates after first load
- **Form Rendering:** Lazy-load steps instead of rendering all at once
- **Validation:** Debounce real-time validation to avoid excessive checks

---

## Accessibility Standards

- All form fields have associated `<label>` elements
- ARIA attributes for complex components
- Keyboard navigation support (Tab through fields)
- Color not the only indicator (use icons + text)
- Sufficient color contrast (WCAG AA)
- Error messages linked to form fields via aria-describedby
- Landmark elements (form, section, navigation)

---

## Future Enhancements

1. **Digital Signatures:** Integrate signature pad for inspector signatures
2. **Photo Uploads:** Attach photos of measurement devices and installation
3. **Offline Support:** Service Worker for offline form filling
4. **Multi-language:** Support German, English, French
5. **PDF Export:** Generate PDF version of protokoll
6. **API Integration:** Send data to backend for archival
7. **Mobile App:** Native mobile version with camera integration
8. **Barcode Scanning:** Quick position entry via QR codes
9. **Templates Library:** Save/load common position sets
10. **Merge Multiple Protocols:** Combine several protocols into one abrechnung

---

## File Size Estimates

- protokoll-state.js: ~8 KB
- protokoll-handlers.js: ~12 KB
- protokoll-renderer.js: ~20 KB
- protokoll-validator.js: ~10 KB
- protokoll-exporter.js: ~15 KB
- protokoll.css: ~8 KB
- **Total Module Size:** ~73 KB (uncompressed)

---

## Documentation Structure

Each module should include:
```javascript
/**
 * Module: protokoll-state.js
 * Description: State management for inspection protocol forms
 * 
 * Key Exports:
 * - init()
 * - getMetadata()
 * - setMetadata()
 * - addPosition()
 * - validateForm()
 * - saveToLocalStorage()
 */
```

---

## Conclusion

The Protokoll Module provides a complete form-based interface for creating VDE 0100-compliant inspection protocols. By maintaining separation of concerns across state, handlers, rendering, validation, and export layers, the module integrates seamlessly with the existing Abrechnung application architecture while remaining independently testable and maintainable.

The module leverages the established SheetJS library for Excel operations and follows the same modular ES6 patterns established in the Phase 1-5 roadmap.
