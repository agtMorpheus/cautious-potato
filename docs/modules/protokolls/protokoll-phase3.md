# Protokoll Module - Phase 3: UI Rendering Implementation

## Overview

**Phase 3** builds the user interface rendering system for the Protokoll Module. This phase dynamically generates HTML forms, manages UI updates, and provides visual feedback to users.

**Duration:** 2-3 weeks
**Deliverable:** Fully functional `protokoll-renderer.js` module with responsive design
**Dependencies:** Phase 1 (State), Phase 2 (Handlers & Validation)
**Blocks:** Phase 4, 5

---

## Phase 3 Objectives

1. ✓ Create dynamic form rendering system
2. ✓ Implement 4-step form workflow
3. ✓ Build position table with CRUD operations
4. ✓ Create error display system
5. ✓ Implement progress indicator
6. ✓ Add responsive CSS styling
7. ✓ Ensure accessibility compliance

---

## File Structure

```
js/protokoll/
├── protokoll-state.js
├── protokoll-handlers.js
├── protokoll-validator.js
├── protokoll-renderer.js      (← This phase)
└── test/
    └── protokoll-renderer.test.js

css/
└── protokoll.css             (← Styling for Phase 3)
```

---

## Part 1: Renderer Module - protokoll-renderer.js

### Implementation Guide (Condensed)

```javascript
/**
 * protokoll-renderer.js
 * 
 * Handles all UI rendering and updates for the Protokoll module.
 * Dynamically generates form HTML and updates DOM based on state changes.
 */

import * as state from './protokoll-state.js';
import * as handlers from './protokoll-handlers.js';

// ============================================
// CONSTANTS
// ============================================

const CONTAINER_ID = 'protokollFormContainer';
const STEPS = ['metadata', 'positions', 'results', 'review'];
const FORM_IDS = {
  metadata: 'metadataForm',
  positions: 'positionsForm',
  results: 'resultsForm',
  review: 'reviewForm'
};

// ============================================
// INITIALIZATION
// ============================================

export function init() {
  console.log('Initializing Protokoll Renderer');
  
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error(`Container ${CONTAINER_ID} not found`);
    return;
  }

  // Render initial form
  renderMetadataForm();
  console.log('✓ Renderer initialized');
}

// ============================================
// MAIN RENDERING FUNCTIONS
// ============================================

/**
 * Render entire form for current step
 * @param {string} step - Step to render
 */
export function renderStep(step) {
  console.log(`Rendering step: ${step}`);
  
  // Update progress
  updateProgressIndicator(step);

  // Hide all forms
  for (const formId of Object.values(FORM_IDS)) {
    const form = document.getElementById(formId);
    if (form) form.style.display = 'none';
  }

  // Show current form
  switch (step) {
    case 'metadata':
      renderMetadataForm();
      break;
    case 'positions':
      renderPositionsForm();
      break;
    case 'results':
      renderResultsForm();
      break;
    case 'review':
      renderReviewForm();
      break;
  }

  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Render metadata form (Step 1)
 */
export function renderMetadataForm() {
  const container = document.getElementById(CONTAINER_ID);
  const metadata = state.getMetadata();

  const html = `
    <form id="${FORM_IDS.metadata}" class="protokoll-form metadata-form">
      <!-- Progress -->
      ${renderProgressIndicator('metadata')}

      <!-- Protocol Information -->
      <fieldset>
        <legend>Protocol Information</legend>
        <div class="form-row">
          ${renderTextField('metadata.protokollNumber', 'Protocol Number', metadata.protokollNumber, {
            required: true,
            pattern: '^[A-Z0-9]{3,20}$',
            placeholder: 'e.g., EDB101120250925'
          })}
          ${renderDateField('metadata.datum', 'Date', metadata.datum, { required: true })}
        </div>
        ${renderTextField('metadata.auftraggeber', 'Client', metadata.auftraggeber, { required: true })}
        ${renderTextareaField('metadata.auftraggaberAdresse', 'Client Address', metadata.auftraggaberAdresse)}
        <div class="form-row">
          ${renderTextField('metadata.auftragnummer', 'Order Number', metadata.auftragnummer)}
          ${renderTextField('metadata.kundennummer', 'Customer Number', metadata.kundennummer)}
        </div>
      </fieldset>

      <!-- Facility Details -->
      <fieldset>
        <legend>Facility Information</legend>
        ${renderTextField('metadata.facility.name', 'Facility Name', metadata.facility.name, { required: true })}
        ${renderTextareaField('metadata.facility.address', 'Facility Address', metadata.facility.address, { required: true })}
        ${renderTextField('metadata.facility.anlage', 'Installation', metadata.facility.anlage)}
        ${renderTextField('metadata.facility.location', 'Location', metadata.facility.location)}
        ${renderTextField('metadata.facility.inventory', 'Inventory Number', metadata.facility.inventory)}
      </fieldset>

      <!-- Network Information -->
      <fieldset>
        <legend>Network Information</legend>
        <div class="form-row">
          ${renderSelectField('metadata.facility.netzspannung', 'Network Voltage', 
            ['230/400', '400/230', '230V', '400V'], 
            metadata.facility.netzspannung
          )}
          ${renderSelectField('metadata.facility.netzform', 'Network Form',
            ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'],
            metadata.facility.netzform
          )}
        </div>
        ${renderTextField('metadata.facility.netzbetreiber', 'Network Provider', metadata.facility.netzbetreiber)}
      </fieldset>

      <!-- Inspection Types -->
      <fieldset>
        <legend>Inspection Types</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('prüfArt-neuanlage', metadata.facility.prüfArt.includes('Neuanlage'), 'New Installation')}
          ${renderCheckboxField('prüfArt-erweiterung', metadata.facility.prüfArt.includes('Erweiterung'), 'Expansion')}
          ${renderCheckboxField('prüfArt-änderung', metadata.facility.prüfArt.includes('Änderung'), 'Modification')}
          ${renderCheckboxField('prüfArt-instandsetzung', metadata.facility.prüfArt.includes('Instandsetzung'), 'Repair')}
          ${renderCheckboxField('prüfArt-wiederholung', metadata.facility.prüfArt.includes('Wiederholungsprüfung'), 'Periodic Inspection')}
        </div>
      </fieldset>

      <!-- Inspector Information -->
      <fieldset>
        <legend>Inspector Information</legend>
        <div class="form-row">
          ${renderTextField('metadata.prüfer.name', 'Inspector Name', metadata.prüfer.name, { required: true })}
          ${renderTextField('metadata.prüfer.titel', 'Inspector Title', metadata.prüfer.titel)}
        </div>
      </fieldset>

      <!-- Navigation -->
      ${renderFormNavigation('metadata')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render positions form (Step 2)
 */
export function renderPositionsForm() {
  const container = document.getElementById(CONTAINER_ID);
  const positions = state.getPositions();

  const html = `
    <form id="${FORM_IDS.positions}" class="protokoll-form positions-form">
      ${renderProgressIndicator('positions')}

      <div class="positions-section">
        <h3>Circuit Positions</h3>
        <div class="positions-table-wrapper">
          <table class="positions-table">
            <thead>
              <tr>
                <th>Circuit No.</th>
                <th>Description</th>
                <th>Cable Type</th>
                <th>Voltage (V)</th>
                <th>Frequency (Hz)</th>
                <th>Insulation (MΩ)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="positionsTableBody">
              ${positions.map((pos, idx) => renderPositionRow(pos, idx)).join('')}
            </tbody>
          </table>
        </div>

        <button type="button" class="btn btn-secondary" data-action="add-position">
          + Add Position
        </button>
      </div>

      ${renderFormNavigation('positions')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
  attachPositionListeners();
}

/**
 * Render results form (Step 3)
 */
export function renderResultsForm() {
  const container = document.getElementById(CONTAINER_ID);
  const results = state.getPrüfungsergebnis();

  const html = `
    <form id="${FORM_IDS.results}" class="protokoll-form results-form">
      ${renderProgressIndicator('results')}

      <fieldset>
        <legend>Inspection Results</legend>
        <div class="radio-group">
          ${renderRadioButtonGroup('results.mängelFestgestellt', 
            [
              { value: false, label: 'No defects found' },
              { value: true, label: 'Defects found' }
            ],
            results.mängelFestgestellt
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Testing Certificate</legend>
        <div class="radio-group">
          ${renderRadioButtonGroup('results.plakette',
            [
              { value: 'ja', label: 'Certificate placed' },
              { value: 'nein', label: 'No certificate' }
            ],
            results.plakette
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Next Inspection Date</legend>
        ${renderDateField('results.nächsterPrüfungstermin', 'Date', results.nächsterPrüfungstermin, { 
          required: true,
          future: true 
        })}
      </fieldset>

      <fieldset>
        <legend>Remarks</legend>
        ${renderTextareaField('results.bemerkung', 'Additional Remarks', results.bemerkung)}
      </fieldset>

      ${renderFormNavigation('results')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render review form (Step 4)
 */
export function renderReviewForm() {
  const container = document.getElementById(CONTAINER_ID);
  const metadata = state.getMetadata();
  const positions = state.getPositions();
  const results = state.getPrüfungsergebnis();

  const html = `
    <div id="${FORM_IDS.review}" class="protokoll-form review-form">
      ${renderProgressIndicator('review')}

      <div class="review-section">
        <h3>Review Your Protocol</h3>
        
        <div class="review-block">
          <h4>Protocol Information</h4>
          <dl>
            <dt>Protocol Number:</dt>
            <dd>${escapeHtml(metadata.protokollNumber)}</dd>
            <dt>Client:</dt>
            <dd>${escapeHtml(metadata.auftraggeber)}</dd>
            <dt>Facility:</dt>
            <dd>${escapeHtml(metadata.facility.name)}</dd>
          </dl>
        </div>

        <div class="review-block">
          <h4>Positions (${positions.length})</h4>
          <table class="review-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Circuit</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${positions.map((pos, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${escapeHtml(pos.stromkreisNr)}</td>
                  <td>${escapeHtml(pos.zielbezeichnung)}</td>
                  <td><span class="status-${pos.prüfergebnis.status}">${pos.prüfergebnis.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="review-block">
          <h4>Results</h4>
          <p>
            <strong>Defects Found:</strong> ${results.mängelFestgestellt ? 'Yes' : 'No'}<br>
            <strong>Certificate:</strong> ${results.plakette === 'ja' ? 'Yes' : 'No'}<br>
            <strong>Next Inspection:</strong> ${results.nächsterPrüfungstermin}
          </p>
        </div>
      </div>

      <div class="export-section">
        <h3>Export Your Protocol</h3>
        <div class="export-buttons">
          <button type="button" class="btn btn-primary" data-action="export-protokoll">
            Export Protokoll.xlsx
          </button>
          <button type="button" class="btn btn-primary" data-action="export-abrechnung">
            Export Abrechnung.xlsx
          </button>
          <button type="button" class="btn btn-success" data-action="export-both">
            Export Both Files
          </button>
        </div>
      </div>

      ${renderFormNavigation('review')}
    </div>
  `;

  container.innerHTML = html;
  attachExportListeners();
}

// ============================================
// FIELD RENDERING FUNCTIONS
// ============================================

function renderTextField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required' : '';
  const pattern = options.pattern ? `pattern="${options.pattern}"` : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${label}${options.required ? ' <span class="required">*</span>' : ''}</label>
      <input
        type="text"
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${escapeHtml(value || '')}"
        ${required}
        ${pattern}
        ${options.placeholder ? `placeholder="${options.placeholder}"` : ''}
        class="form-control"
      >
      <div class="field-error" id="error-${id}"></div>
    </div>
  `;
}

function renderDateField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required' : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${label}${options.required ? ' <span class="required">*</span>' : ''}</label>
      <input
        type="date"
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${value ? value.split('T')[0] : ''}"
        ${required}
        class="form-control"
      >
      <div class="field-error" id="error-${id}"></div>
    </div>
  `;
}

function renderTextareaField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required' : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <textarea
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        ${required}
        rows="3"
        class="form-control"
      >${escapeHtml(value || '')}</textarea>
      <div class="field-error" id="error-${id}"></div>
    </div>
  `;
}

function renderSelectField(fieldPath, label, options, selected) {
  const id = fieldPath.replace(/\./g, '-');
  
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${fieldPath}" data-field="${fieldPath}" class="form-control">
        <option value="">-- Select --</option>
        ${options.map(opt => `
          <option value="${opt}" ${opt === selected ? 'selected' : ''}>
            ${escapeHtml(String(opt))}
          </option>
        `).join('')}
      </select>
      <div class="field-error" id="error-${id}"></div>
    </div>
  `;
}

function renderCheckboxField(fieldId, checked, label) {
  return `
    <div class="checkbox-group-item">
      <input
        type="checkbox"
        id="${fieldId}"
        ${checked ? 'checked' : ''}
        class="form-checkbox"
      >
      <label for="${fieldId}">${label}</label>
    </div>
  `;
}

function renderRadioButtonGroup(fieldPath, options, selected) {
  const id = fieldPath.replace(/\./g, '-');
  
  return options.map((opt, idx) => `
    <div class="radio-group-item">
      <input
        type="radio"
        id="${id}-${idx}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${opt.value}"
        ${opt.value === selected ? 'checked' : ''}
        class="form-radio"
      >
      <label for="${id}-${idx}">${opt.label}</label>
    </div>
  `).join('');
}

// ============================================
// POSITION ROW RENDERING
// ============================================

function renderPositionRow(position, index) {
  const status = position.prüfergebnis?.status || 'nicht-geprüft';
  
  return `
    <tr class="position-row" data-pos-nr="${position.posNr}">
      <td>${escapeHtml(position.stromkreisNr)}</td>
      <td>${escapeHtml(position.zielbezeichnung)}</td>
      <td>${escapeHtml(position.leitung?.typ || '')}</td>
      <td>${position.spannung?.un || '-'}</td>
      <td>${position.spannung?.fn || '-'}</td>
      <td>${position.messwerte?.riso || '-'}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td class="position-actions">
        <button type="button" class="btn-icon" data-action="edit-position" title="Edit">✎</button>
        <button type="button" class="btn-icon btn-danger" data-action="delete-position" title="Delete">✕</button>
      </td>
    </tr>
  `;
}

/**
 * Add new position row to table
 */
export function addPositionRow(position) {
  const tbody = document.getElementById('positionsTableBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = 'position-row';
  tr.setAttribute('data-pos-nr', position.posNr);
  tr.innerHTML = renderPositionRow(position, tbody.children.length).replace('<tr class="position-row" data-pos-nr="' + position.posNr + '">', '').replace('</tr>', '');
  
  tbody.appendChild(tr);
  attachPositionListeners();
}

/**
 * Remove position row from table
 */
export function removePositionRow(posNr) {
  const row = document.querySelector(`[data-pos-nr="${posNr}"]`);
  if (row) {
    row.remove();
  }
}

/**
 * Update position row
 */
export function updatePositionRow(posNr, position) {
  const row = document.querySelector(`[data-pos-nr="${posNr}"]`);
  if (row) {
    const status = position.prüfergebnis?.status || 'nicht-geprüft';
    row.querySelector('td:nth-child(2)').textContent = position.stromkreisNr;
    row.querySelector('td:nth-child(3)').textContent = position.zielbezeichnung;
    row.querySelector('td:nth-child(4)').textContent = position.leitung?.typ || '';
    row.querySelector('td:nth-child(5)').textContent = position.spannung?.un || '-';
    row.querySelector('td:nth-child(6)').textContent = position.spannung?.fn || '-';
    row.querySelector('td:nth-child(7)').textContent = position.messwerte?.riso || '-';
    row.querySelector('.status-badge').className = `status-badge status-${status}`;
    row.querySelector('.status-badge').textContent = status;
  }
}

// ============================================
// HELPER RENDERING FUNCTIONS
// ============================================

function renderProgressIndicator(currentStep) {
  return `
    <div class="progress-indicator">
      ${STEPS.map((step, idx) => {
        const isActive = step === currentStep;
        const isCompleted = STEPS.indexOf(step) < STEPS.indexOf(currentStep);
        
        return `
          <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
               data-step="${step}">
            ${idx + 1}. ${step.charAt(0).toUpperCase() + step.slice(1)}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function updateProgressIndicator(currentStep) {
  document.querySelectorAll('.progress-step').forEach(step => {
    const stepName = step.getAttribute('data-step');
    step.classList.remove('active', 'completed');
    
    if (stepName === currentStep) {
      step.classList.add('active');
    } else if (STEPS.indexOf(stepName) < STEPS.indexOf(currentStep)) {
      step.classList.add('completed');
    }
  });
}

function renderFormNavigation(currentStep) {
  const currentIndex = STEPS.indexOf(currentStep);
  const showPrevious = currentIndex > 0;
  const showNext = currentIndex < STEPS.length - 1;
  const showExport = currentIndex === STEPS.length - 1;

  return `
    <div class="form-navigation">
      ${showPrevious ? '<button type="button" class="btn btn-secondary" data-action="previous-step">← Previous</button>' : '<div></div>'}
      <div></div>
      ${showNext ? '<button type="button" class="btn btn-primary" data-action="next-step">Next →</button>' : ''}
      ${showExport ? '<button type="button" class="btn btn-success" data-action="export-both">Export →</button>' : ''}
    </div>
  `;
}

// ============================================
// ERROR DISPLAY
// ============================================

/**
 * Display field error
 */
export function displayFieldError(fieldPath, errorMessage) {
  const id = fieldPath.replace(/\./g, '-');
  const errorDiv = document.getElementById(`error-${id}`);
  const field = document.querySelector(`[data-field="${fieldPath}"]`);

  if (errorDiv) {
    errorDiv.textContent = errorMessage;
    errorDiv.style.display = 'block';
  }

  if (field) {
    field.classList.add('error');
  }
}

/**
 * Clear field error
 */
export function clearFieldError(fieldPath) {
  const id = fieldPath.replace(/\./g, '-');
  const errorDiv = document.getElementById(`error-${id}`);
  const field = document.querySelector(`[data-field="${fieldPath}"]`);

  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }

  if (field) {
    field.classList.remove('error');
  }
}

// ============================================
// MESSAGE DISPLAY
// ============================================

export function displayMessage(type, message) {
  const container = document.getElementById('messageContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.textContent = message;

  container.appendChild(div);

  // Auto-remove after 5 seconds
  setTimeout(() => div.remove(), 5000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachFieldListeners() {
  const form = document.querySelector('.protokoll-form');
  if (!form) return;

  form.addEventListener('change', (e) => {
    handlers.handleFieldChange(e);
  });

  form.addEventListener('blur', (e) => {
    handlers.handleFieldBlur(e);
  }, true);
}

function attachPositionListeners() {
  document.querySelectorAll('[data-action="delete-position"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const posNr = btn.closest('[data-pos-nr]').getAttribute('data-pos-nr');
      handlers.handleDeletePosition(posNr);
    });
  });
}

function attachExportListeners() {
  document.querySelectorAll('[data-action^="export-"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handlers.handleExport();
    });
  });
}

console.log('✓ Protokoll Renderer module loaded');
```

---

## Part 2: Styling - css/protokoll.css

### Implementation Guide (Key Sections)

```css
/* ============================================
   FORM STYLING
   ============================================ */

.protokoll-form {
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  font-size: 0.95rem;
  color: #333;
}

.form-control {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-control.error {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

/* ============================================
   PROGRESS INDICATOR
   ============================================ */

.progress-indicator {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.progress-step {
  flex: 1;
  padding: 10px;
  text-align: center;
  border-radius: 4px;
  font-weight: 500;
  color: #999;
  background-color: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.progress-step.active {
  color: white;
  background-color: #667eea;
  transform: scale(1.05);
}

.progress-step.completed {
  color: white;
  background-color: #28a745;
}

/* ============================================
   POSITIONS TABLE
   ============================================ */

.positions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin: 20px 0;
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

/* ============================================
   STATUS BADGES
   ============================================ */

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-ok {
  background-color: #d4edda;
  color: #155724;
}

.status-mängel {
  background-color: #f8d7da;
  color: #721c24;
}

.status-nicht-geprüft {
  background-color: #e2e3e5;
  color: #383d41;
}

/* ============================================
   ERROR MESSAGES
   ============================================ */

.field-error {
  display: none;
  color: #dc3545;
  font-size: 0.85rem;
  margin-top: 4px;
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

@media (max-width: 768px) {
  .progress-indicator {
    flex-direction: column;
    gap: 10px;
  }

  .progress-step {
    width: 100%;
  }

  .form-row {
    flex-direction: column;
  }

  .positions-table {
    font-size: 0.75rem;
  }

  .form-navigation {
    flex-direction: column;
  }

  .form-navigation .btn {
    width: 100%;
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */

.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

label {
  display: block;
}

[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## Phase 3 Completion Criteria

✓ All form steps rendering correctly
✓ Dynamic form generation working
✓ Position table with add/edit/delete
✓ Progress indicator updating
✓ Error display working
✓ Responsive design on all breakpoints
✓ Accessibility standards met (WCAG AA)
✓ Form validation visual feedback

---

## Phase 3 Deliverables

1. **`js/protokoll/protokoll-renderer.js`** - Complete rendering engine
2. **`css/protokoll.css`** - Styling for all forms
3. **`js/test/protokoll-renderer.test.js`** - Renderer tests (30+ tests)
4. **Visual Testing Report** - Screenshots of all forms
5. **Responsive Testing Report** - Mobile/tablet/desktop verification
6. **Accessibility Report** - WCAG compliance verification
7. **Test Results** - All tests passing

---

## Next Phase: Phase 4 - Excel Export

Once Phase 3 is complete, Phase 4 will implement the export functionality to generate Excel files.

---

**Phase 3 Status:** ✓ Ready for Implementation
