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
const MESSAGE_CONTAINER_ID = 'messageContainer';
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

/**
 * Initialize the renderer module
 * @returns {void}
 */
export function init() {
  console.log('Initializing Protokoll Renderer');
  
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error(`Container ${CONTAINER_ID} not found`);
    return;
  }

  // Subscribe to state changes
  setupStateSubscriptions();

  // Render initial form based on current state
  const currentStep = state.getCurrentStep();
  renderStep(currentStep);

  console.log('✓ Renderer initialized');
}

/**
 * Set up subscriptions to state change events
 * @returns {void}
 */
function setupStateSubscriptions() {
  // Listen for step changes
  document.addEventListener('protokoll:stepChanged', (e) => {
    renderStep(e.detail.step);
  });

  // Listen for validation errors
  document.addEventListener('protokoll:validationError', (e) => {
    const { fieldPath, error } = e.detail;
    if (error) {
      displayFieldError(fieldPath, error);
    } else {
      clearFieldError(fieldPath);
    }
  });

  // Listen for messages
  document.addEventListener('protokoll:message', (e) => {
    displayMessage(e.detail.type, e.detail.message);
  });

  // Listen for position additions
  document.addEventListener('protokoll:addPosition', (e) => {
    addPositionRow(e.detail.position);
  });

  // Listen for position removals
  document.addEventListener('protokoll:removePosition', (e) => {
    removePositionRow(e.detail.posNr);
  });

  // Listen for reset
  document.addEventListener('protokoll:reset', () => {
    renderStep('metadata');
  });
}

// ============================================
// MAIN RENDERING FUNCTIONS
// ============================================

/**
 * Render entire form for current step
 * @param {string} step - Step to render
 * @returns {void}
 */
export function renderStep(step) {
  console.log(`Rendering step: ${step}`);
  
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Hide all forms
  for (const formId of Object.values(FORM_IDS)) {
    const form = document.getElementById(formId);
    if (form) form.style.display = 'none';
  }

  // Render current form
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
    default:
      console.error(`Unknown step: ${step}`);
      renderMetadataForm();
  }

  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Render metadata form (Step 1)
 * @returns {void}
 */
export function renderMetadataForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const metadata = state.getMetadata();

  const html = `
    <form id="${FORM_IDS.metadata}" class="protokoll-form metadata-form">
      ${renderProgressIndicator('metadata')}

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

      <fieldset>
        <legend>Facility Information</legend>
        ${renderTextField('metadata.facility.name', 'Facility Name', metadata.facility.name, { required: true })}
        ${renderTextareaField('metadata.facility.address', 'Facility Address', metadata.facility.address, { required: true })}
        ${renderTextField('metadata.facility.anlage', 'Installation', metadata.facility.anlage)}
        ${renderTextField('metadata.facility.location', 'Location', metadata.facility.location)}
        ${renderTextField('metadata.facility.inventory', 'Inventory Number', metadata.facility.inventory)}
      </fieldset>

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

      <fieldset>
        <legend>Inspection Types</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('prüfArt-neuanlage', (metadata.facility.prüfArt || []).includes('Neuanlage'), 'New Installation')}
          ${renderCheckboxField('prüfArt-erweiterung', (metadata.facility.prüfArt || []).includes('Erweiterung'), 'Expansion')}
          ${renderCheckboxField('prüfArt-änderung', (metadata.facility.prüfArt || []).includes('Änderung'), 'Modification')}
          ${renderCheckboxField('prüfArt-instandsetzung', (metadata.facility.prüfArt || []).includes('Instandsetzung'), 'Repair')}
          ${renderCheckboxField('prüfArt-wiederholung', (metadata.facility.prüfArt || []).includes('Wiederholungsprüfung'), 'Periodic Inspection')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Inspector Information</legend>
        <div class="form-row">
          ${renderTextField('metadata.prüfer.name', 'Inspector Name', metadata.prüfer.name, { required: true })}
          ${renderTextField('metadata.prüfer.titel', 'Inspector Title', metadata.prüfer.titel)}
        </div>
      </fieldset>

      ${renderFormNavigation('metadata')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render positions form (Step 2)
 * @returns {void}
 */
export function renderPositionsForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const positions = state.getPositions();

  const html = `
    <form id="${FORM_IDS.positions}" class="protokoll-form positions-form">
      ${renderProgressIndicator('positions')}

      <div class="positions-section">
        <h3>Circuit Positions</h3>
        <div class="positions-table-wrapper">
          <table class="positions-table" role="grid" aria-label="Circuit positions table">
            <thead>
              <tr>
                <th scope="col">Circuit No.</th>
                <th scope="col">Description</th>
                <th scope="col">Cable Type</th>
                <th scope="col">Voltage (V)</th>
                <th scope="col">Frequency (Hz)</th>
                <th scope="col">Insulation (MΩ)</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
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
 * @returns {void}
 */
export function renderResultsForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const results = state.getPrüfungsergebnis();

  const html = `
    <form id="${FORM_IDS.results}" class="protokoll-form results-form">
      ${renderProgressIndicator('results')}

      <fieldset>
        <legend>Inspection Results</legend>
        <div class="radio-group">
          ${renderRadioButtonGroup('results.mängelFestgestellt', 
            [
              { value: 'false', label: 'No defects found' },
              { value: 'true', label: 'Defects found' }
            ],
            String(results.mängelFestgestellt)
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
 * @returns {void}
 */
export function renderReviewForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

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
          <dl class="review-dl">
            <dt>Protocol Number:</dt>
            <dd>${escapeHtml(metadata.protokollNumber || '-')}</dd>
            <dt>Client:</dt>
            <dd>${escapeHtml(metadata.auftraggeber || '-')}</dd>
            <dt>Facility:</dt>
            <dd>${escapeHtml(metadata.facility.name || '-')}</dd>
            <dt>Address:</dt>
            <dd>${escapeHtml(metadata.facility.address || '-')}</dd>
            <dt>Inspector:</dt>
            <dd>${escapeHtml(metadata.prüfer.name || '-')}</dd>
          </dl>
        </div>

        <div class="review-block">
          <h4>Positions (${positions.length})</h4>
          ${positions.length > 0 ? `
            <table class="review-table" role="grid" aria-label="Positions review table">
              <thead>
                <tr>
                  <th scope="col">No.</th>
                  <th scope="col">Circuit</th>
                  <th scope="col">Description</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                ${positions.map((pos, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(pos.stromkreisNr || '-')}</td>
                    <td>${escapeHtml(pos.zielbezeichnung || '-')}</td>
                    <td><span class="status-badge status-${pos.prüfergebnis?.status || 'nicht-geprüft'}">${escapeHtml(pos.prüfergebnis?.status || 'nicht-geprüft')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p class="no-positions">No positions added yet.</p>'}
        </div>

        <div class="review-block">
          <h4>Results</h4>
          <dl class="review-dl">
            <dt>Defects Found:</dt>
            <dd>${results.mängelFestgestellt ? 'Yes' : 'No'}</dd>
            <dt>Certificate:</dt>
            <dd>${results.plakette === 'ja' ? 'Yes' : 'No'}</dd>
            <dt>Next Inspection:</dt>
            <dd>${escapeHtml(results.nächsterPrüfungstermin ? formatDate(results.nächsterPrüfungstermin) : '-')}</dd>
            ${results.bemerkung ? `<dt>Remarks:</dt><dd>${escapeHtml(results.bemerkung)}</dd>` : ''}
          </dl>
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

/**
 * Render a text input field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
function renderTextField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required aria-required="true"' : '';
  const pattern = options.pattern ? `pattern="${options.pattern}"` : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <input
        type="text"
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${escapeHtml(value || '')}"
        ${required}
        ${pattern}
        ${options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : ''}
        class="form-control"
        autocomplete="off"
      >
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a date input field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {string} value - Current value (ISO string)
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
function renderDateField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required aria-required="true"' : '';
  const dateValue = value ? value.split('T')[0] : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <input
        type="date"
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${dateValue}"
        ${required}
        class="form-control"
      >
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a textarea field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
function renderTextareaField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required aria-required="true"' : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <textarea
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        ${required}
        rows="3"
        class="form-control"
      >${escapeHtml(value || '')}</textarea>
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a select field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {Array} options - Select options
 * @param {string} selected - Currently selected value
 * @returns {string} HTML string
 */
function renderSelectField(fieldPath, label, options, selected) {
  const id = fieldPath.replace(/\./g, '-');
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}</label>
      <select id="${id}" name="${fieldPath}" data-field="${fieldPath}" class="form-control">
        <option value="">-- Select --</option>
        ${options.map(opt => `
          <option value="${escapeHtml(String(opt))}" ${opt === selected ? 'selected' : ''}>
            ${escapeHtml(String(opt))}
          </option>
        `).join('')}
      </select>
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a checkbox field
 * @param {string} fieldId - Field ID
 * @param {boolean} checked - Whether checked
 * @param {string} label - Field label
 * @returns {string} HTML string
 */
function renderCheckboxField(fieldId, checked, label) {
  return `
    <div class="checkbox-group-item">
      <input
        type="checkbox"
        id="${fieldId}"
        data-field="${fieldId}"
        ${checked ? 'checked' : ''}
        class="form-checkbox"
      >
      <label for="${fieldId}">${escapeHtml(label)}</label>
    </div>
  `;
}

/**
 * Render a radio button group
 * @param {string} fieldPath - Field path for data binding
 * @param {Array} options - Radio options with value and label
 * @param {string} selected - Currently selected value
 * @returns {string} HTML string
 */
function renderRadioButtonGroup(fieldPath, options, selected) {
  const id = fieldPath.replace(/\./g, '-');
  
  return options.map((opt, idx) => `
    <div class="radio-group-item">
      <input
        type="radio"
        id="${id}-${idx}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${escapeHtml(String(opt.value))}"
        ${String(opt.value) === String(selected) ? 'checked' : ''}
        class="form-radio"
      >
      <label for="${id}-${idx}">${escapeHtml(opt.label)}</label>
    </div>
  `).join('');
}

// ============================================
// POSITION ROW RENDERING
// ============================================

/**
 * Render a single position row
 * @param {Object} position - Position object
 * @param {number} index - Row index
 * @returns {string} HTML string
 */
function renderPositionRow(position, index) {
  const status = position.prüfergebnis?.status || 'nicht-geprüft';
  
  return `
    <tr class="position-row" data-pos-nr="${escapeHtml(position.posNr)}">
      <td>${escapeHtml(position.stromkreisNr || '-')}</td>
      <td>${escapeHtml(position.zielbezeichnung || '-')}</td>
      <td>${escapeHtml(position.leitung?.typ || '-')}</td>
      <td>${position.spannung?.un || '-'}</td>
      <td>${position.spannung?.fn || '-'}</td>
      <td>${position.messwerte?.riso || '-'}</td>
      <td><span class="status-badge status-${status}">${escapeHtml(status)}</span></td>
      <td class="position-actions">
        <button type="button" class="btn-icon" data-action="edit-position" data-pos-nr="${escapeHtml(position.posNr)}" title="Edit" aria-label="Edit position">✎</button>
        <button type="button" class="btn-icon btn-danger" data-action="delete-position" data-pos-nr="${escapeHtml(position.posNr)}" title="Delete" aria-label="Delete position">✕</button>
      </td>
    </tr>
  `;
}

/**
 * Add new position row to table
 * @param {Object} position - Position object
 * @returns {void}
 */
export function addPositionRow(position) {
  const tbody = document.getElementById('positionsTableBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = 'position-row';
  tr.setAttribute('data-pos-nr', position.posNr);
  
  // Get inner HTML from renderPositionRow, removing outer tr tags
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = renderPositionRow(position, tbody.children.length);
  const newRow = tempContainer.querySelector('tr');
  if (newRow) {
    tr.innerHTML = newRow.innerHTML;
  }
  
  tbody.appendChild(tr);
  attachPositionListeners();
}

/**
 * Remove position row from table
 * @param {string} posNr - Position number
 * @returns {void}
 */
export function removePositionRow(posNr) {
  const row = document.querySelector(`tr[data-pos-nr="${posNr}"]`);
  if (row) {
    row.remove();
  }
}

/**
 * Update position row
 * @param {string} posNr - Position number
 * @param {Object} position - Updated position object
 * @returns {void}
 */
export function updatePositionRow(posNr, position) {
  const row = document.querySelector(`tr[data-pos-nr="${posNr}"]`);
  if (!row) return;

  const status = position.prüfergebnis?.status || 'nicht-geprüft';
  const cells = row.querySelectorAll('td');
  
  if (cells.length >= 7) {
    cells[0].textContent = position.stromkreisNr || '-';
    cells[1].textContent = position.zielbezeichnung || '-';
    cells[2].textContent = position.leitung?.typ || '-';
    cells[3].textContent = position.spannung?.un || '-';
    cells[4].textContent = position.spannung?.fn || '-';
    cells[5].textContent = position.messwerte?.riso || '-';
    
    const statusBadge = cells[6].querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge status-${status}`;
      statusBadge.textContent = status;
    }
  }
}

// ============================================
// HELPER RENDERING FUNCTIONS
// ============================================

/**
 * Render progress indicator
 * @param {string} currentStep - Current active step
 * @returns {string} HTML string
 */
function renderProgressIndicator(currentStep) {
  return `
    <nav class="progress-indicator" aria-label="Form progress">
      ${STEPS.map((step, idx) => {
        const isActive = step === currentStep;
        const isCompleted = STEPS.indexOf(step) < STEPS.indexOf(currentStep);
        const stepLabel = step.charAt(0).toUpperCase() + step.slice(1);
        
        return `
          <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
               data-step="${step}"
               role="button"
               tabindex="0"
               aria-current="${isActive ? 'step' : 'false'}"
               aria-label="${stepLabel}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}">
            <span class="step-number">${idx + 1}</span>
            <span class="step-label">${stepLabel}</span>
          </div>
        `;
      }).join('')}
    </nav>
  `;
}

/**
 * Update progress indicator
 * @param {string} currentStep - Current active step
 * @returns {void}
 */
export function updateProgressIndicator(currentStep) {
  document.querySelectorAll('.progress-step').forEach(stepEl => {
    const stepName = stepEl.getAttribute('data-step');
    stepEl.classList.remove('active', 'completed');
    stepEl.setAttribute('aria-current', 'false');
    
    if (stepName === currentStep) {
      stepEl.classList.add('active');
      stepEl.setAttribute('aria-current', 'step');
    } else if (STEPS.indexOf(stepName) < STEPS.indexOf(currentStep)) {
      stepEl.classList.add('completed');
    }
  });
}

/**
 * Render form navigation buttons
 * @param {string} currentStep - Current step
 * @returns {string} HTML string
 */
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
 * @param {string} fieldPath - Field path
 * @param {string} errorMessage - Error message
 * @returns {void}
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
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `error-${id}`);
  }
}

/**
 * Clear field error
 * @param {string} fieldPath - Field path
 * @returns {void}
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
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }
}

/**
 * Clear all field errors
 * @returns {void}
 */
export function clearAllFieldErrors() {
  document.querySelectorAll('.field-error').forEach(errorDiv => {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  });

  document.querySelectorAll('.form-control.error').forEach(field => {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  });
}

// ============================================
// MESSAGE DISPLAY
// ============================================

/**
 * Display a message to the user
 * @param {string} type - Message type ('success', 'error', 'info', 'warning')
 * @param {string} message - Message text
 * @returns {void}
 */
export function displayMessage(type, message) {
  let container = document.getElementById(MESSAGE_CONTAINER_ID);
  
  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = MESSAGE_CONTAINER_ID;
    container.className = 'message-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.setAttribute('role', type === 'error' ? 'alert' : 'status');
  
  div.innerHTML = `
    <span class="message-text">${escapeHtml(message)}</span>
    <button type="button" class="message-close" aria-label="Close message">&times;</button>
  `;

  // Add close handler
  div.querySelector('.message-close').addEventListener('click', () => {
    div.remove();
  });

  container.appendChild(div);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (div.parentNode) {
      div.remove();
    }
  }, 5000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  // Escape HTML entities including quotes for safe use in attributes
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Attach field event listeners
 * @returns {void}
 */
function attachFieldListeners() {
  const form = document.querySelector('.protokoll-form');
  if (!form) return;

  // Change event for form fields
  form.addEventListener('change', (e) => {
    const target = e.target;
    const fieldPath = target.getAttribute('data-field');
    
    if (fieldPath) {
      const value = target.type === 'checkbox' ? target.checked : target.value;
      handlers.handleMetadataChange(fieldPath, value);
    }
  });

  // Navigation button clicks
  form.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    
    switch (action) {
      case 'previous-step':
        handlers.handlePreviousStep();
        break;
      case 'next-step':
        handlers.handleNextStep();
        break;
      case 'add-position':
        handlers.handleAddPosition();
        break;
      case 'export':
      case 'export-both':
        handlers.handleExport();
        break;
    }
  });

  // Progress step clicks
  document.querySelectorAll('.progress-step').forEach(step => {
    step.addEventListener('click', () => {
      const stepName = step.getAttribute('data-step');
      handlers.handleGoToStep(stepName);
    });

    step.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const stepName = step.getAttribute('data-step');
        handlers.handleGoToStep(stepName);
      }
    });
  });
}

/**
 * Attach position-specific event listeners using event delegation
 * @returns {void}
 */
function attachPositionListeners() {
  const tbody = document.getElementById('positionsTableBody');
  if (!tbody) return;

  // Remove any existing delegated listener by using a named handler
  // We store the handler reference on the element to allow removal
  if (tbody._positionClickHandler) {
    tbody.removeEventListener('click', tbody._positionClickHandler);
  }

  // Create a delegated event handler
  tbody._positionClickHandler = function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const posNr = btn.getAttribute('data-pos-nr');

    if (!posNr) return;

    e.preventDefault();

    switch (action) {
      case 'delete-position':
        handlers.handleDeletePosition(posNr);
        break;
      case 'edit-position':
        // For now, log - edit functionality can be expanded
        console.log('Edit position:', posNr);
        break;
    }
  };

  tbody.addEventListener('click', tbody._positionClickHandler);
}

/**
 * Attach export button listeners
 * @returns {void}
 */
function attachExportListeners() {
  document.querySelectorAll('[data-action^="export-"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handlers.handleExport();
    });
  });

  // Navigation buttons
  attachFieldListeners();
}

console.log('✓ Protokoll Renderer module loaded');
