/**
 * messgeraet-renderer.js
 * 
 * Handles all UI rendering and updates for the Messgerät module.
 * Dynamically generates HTML and updates DOM based on state changes.
 * German interface language.
 */

import * as state from './messgeraet-state.js';
import * as handlers from './messgeraet-handlers.js';

// ============================================
// CONSTANTS
// ============================================

const CONTAINER_ID = 'messgeraetContainer';
const FORM_MODAL_ID = 'messgeraetFormModal';
const MESSAGE_CONTAINER_ID = 'messgeraetMessageContainer';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the renderer module
 * @returns {void}
 */
export function init() {
  console.log('Initializing Messgerät Renderer');

  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.warn(`Container ${CONTAINER_ID} not found - will be created when view is shown`);
  }

  // Subscribe to state changes
  setupStateSubscriptions();

  // Render initial view
  renderDeviceList();

  console.log('✓ Messgerät Renderer initialized');
}

/**
 * Set up subscriptions to state change events
 * @returns {void}
 */
function setupStateSubscriptions() {
  // Listen for render requests
  document.addEventListener('messgeraet:renderDevices', () => {
    renderDeviceList();
  });

  // Listen for form show requests
  document.addEventListener('messgeraet:showForm', (e) => {
    const { mode, deviceId } = e.detail;
    showDeviceForm(mode, deviceId);
  });

  // Listen for form hide requests
  document.addEventListener('messgeraet:hideForm', () => {
    hideDeviceForm();
  });

  // Listen for editing changes
  document.addEventListener('messgeraet:editingChanged', (e) => {
    const { deviceId } = e.detail;
    if (deviceId) {
      showDeviceForm('edit', deviceId);
    }
  });

  // Listen for validation errors
  document.addEventListener('messgeraet:validationError', (e) => {
    const { fieldName, error } = e.detail;
    if (error) {
      displayFieldError(fieldName, error);
    } else {
      clearFieldError(fieldName);
    }
  });

  // Listen for messages
  document.addEventListener('messgeraet:message', (e) => {
    displayMessage(e.detail.type, e.detail.message);
  });
}

// ============================================
// MAIN RENDERING FUNCTIONS
// ============================================

/**
 * Render the device list view
 * @returns {void}
 */
export function renderDeviceList() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const devices = state.getDevices();
  const formState = state.getFormState();
  const deviceTypes = state.getDeviceTypes();

  // Filter devices based on search and type filter
  let filteredDevices = devices;

  if (formState.searchTerm) {
    const term = formState.searchTerm.toLowerCase();
    filteredDevices = filteredDevices.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.type.toLowerCase().includes(term) ||
      d.identNr?.toLowerCase().includes(term) ||
      d.fabrikat?.toLowerCase().includes(term)
    );
  }

  if (formState.filterType) {
    filteredDevices = filteredDevices.filter(d => d.type === formState.filterType);
  }

  const html = `
    <div class="messgeraet-module">
      <!-- Statistics -->
      <div class="messgeraet-stats-grid">
        <div class="messgeraet-stat-card">
          <div class="stat-icon devices">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span class="stat-value">${devices.length}</span>
          <span class="stat-label">Messgeräte</span>
        </div>
        <div class="messgeraet-stat-card">
          <div class="stat-icon valid">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="stat-value">${state.getValidDevices().length}</span>
          <span class="stat-label">Gültige Kalibrierung</span>
        </div>
        <div class="messgeraet-stat-card">
          <div class="stat-icon expired">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span class="stat-value">${devices.length - state.getValidDevices().length}</span>
          <span class="stat-label">Abgelaufen/Ohne Datum</span>
        </div>
      </div>

      <!-- Header with Add Button -->
      <div class="messgeraet-header">
        <h3>Messgeräte-Verwaltung</h3>
        <button type="button" class="btn btn-primary" data-messgeraet-action="add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neues Messgerät
        </button>
      </div>

      <!-- Filters -->
      <div class="messgeraet-filters">
        <div class="filter-group">
          <input 
            type="search" 
            id="messgeraet-search" 
            class="form-input"
            placeholder="Suche nach Name, Typ, Fabrikat oder ID..."
            value="${escapeHtml(formState.searchTerm || '')}"
            aria-label="Messgeräte suchen"
          >
        </div>
        <div class="filter-group">
          <select 
            id="messgeraet-type-filter" 
            class="form-select"
            aria-label="Nach Typ filtern"
          >
            <option value="">Alle Typen</option>
            ${deviceTypes.map(type => `
              <option value="${escapeHtml(type)}" ${formState.filterType === type ? 'selected' : ''}>
                ${escapeHtml(type)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Device List -->
      <div class="messgeraet-list-container">
        ${filteredDevices.length === 0 ? `
          <div class="messgeraet-empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <p class="empty-title">Keine Messgeräte vorhanden</p>
            <p class="empty-text">Fügen Sie ein neues Messgerät hinzu, um zu beginnen.</p>
          </div>
        ` : `
          <table class="messgeraet-table" role="grid" aria-label="Messgeräte-Liste">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Typ</th>
                <th scope="col">Fabrikat</th>
                <th scope="col">Ident-Nr.</th>
                <th scope="col">Nächste Kalibrierung</th>
                <th scope="col">Status</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDevices.map(device => renderDeviceRow(device)).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;
  attachListeners();
}

/**
 * Render a single device row
 * @param {Object} device - Device object
 * @returns {string} HTML string
 */
function renderDeviceRow(device) {
  const isExpired = isCalibrationExpired(device.calibrationDate);
  const statusClass = isExpired ? 'expired' : 'valid';
  const statusText = isExpired ? 'Abgelaufen' : 'Gültig';

  return `
    <tr data-device-id="${escapeHtml(device.id)}">
      <td>
        <div class="device-name">
          <strong>${escapeHtml(device.name)}</strong>
        </div>
      </td>
      <td>${escapeHtml(device.type)}</td>
      <td>${escapeHtml(device.fabrikat || '-')}</td>
      <td><code>${escapeHtml(device.identNr || '-')}</code></td>
      <td>${device.calibrationDate ? formatDate(device.calibrationDate) : '-'}</td>
      <td>
        <span class="calibration-status status-${statusClass}">
          ${statusText}
        </span>
      </td>
      <td>
        <div class="device-actions">
          <button 
            type="button" 
            class="btn-icon" 
            data-messgeraet-action="edit" 
            data-device-id="${escapeHtml(device.id)}"
            title="Bearbeiten"
            aria-label="Messgerät bearbeiten"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon btn-danger" 
            data-messgeraet-action="delete" 
            data-device-id="${escapeHtml(device.id)}"
            title="Löschen"
            aria-label="Messgerät löschen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ============================================
// FORM MODAL
// ============================================

/**
 * Show device form modal
 * @param {string} mode - 'add' or 'edit'
 * @param {string} deviceId - Device ID (for edit mode)
 * @returns {void}
 */
export function showDeviceForm(mode, deviceId = null) {
  // Remove existing modal if any
  hideDeviceForm();

  const device = deviceId ? state.getDevice(deviceId) : null;
  const title = mode === 'edit' ? 'Messgerät bearbeiten' : 'Neues Messgerät';
  const submitText = mode === 'edit' ? 'Aktualisieren' : 'Hinzufügen';
  const deviceTypes = state.getDeviceTypes();

  const modalHtml = `
    <div id="${FORM_MODAL_ID}" class="messgeraet-modal" role="dialog" aria-labelledby="messgeraet-modal-title" aria-modal="true">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="messgeraet-modal-title">${escapeHtml(title)}</h3>
          <button type="button" class="modal-close" data-messgeraet-action="cancel" aria-label="Schließen">&times;</button>
        </div>
        <form id="messgeraetForm" class="messgeraet-form">
          <div class="form-group">
            <label for="device-name">Name <span class="required">*</span></label>
            <input 
              type="text" 
              id="device-name" 
              name="name" 
              class="form-control" 
              value="${escapeHtml(device?.name || '')}"
              required
              placeholder="z.B. Fluke 1654b"
              autocomplete="off"
            >
            <div class="field-error" id="error-name" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="device-type">Typ <span class="required">*</span></label>
              <select id="device-type" name="type" class="form-control" required>
                <option value="">-- Typ auswählen --</option>
                ${deviceTypes.map(type => `
                  <option value="${escapeHtml(type)}" ${device?.type === type ? 'selected' : ''}>
                    ${escapeHtml(type)}
                  </option>
                `).join('')}
              </select>
              <div class="field-error" id="error-type" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="device-fabrikat">Fabrikat</label>
              <input 
                type="text" 
                id="device-fabrikat" 
                name="fabrikat" 
                class="form-control" 
                value="${escapeHtml(device?.fabrikat || '')}"
                placeholder="z.B. Fluke"
                autocomplete="off"
              >
              <div class="field-error" id="error-fabrikat" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="device-identNr">Ident-Nr.</label>
              <input 
                type="text" 
                id="device-identNr" 
                name="identNr" 
                class="form-control" 
                value="${escapeHtml(device?.identNr || '')}"
                placeholder="z.B. 4312061"
                autocomplete="off"
              >
              <div class="field-error" id="error-identNr" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="device-calibrationDate">Nächste Kalibrierung</label>
              <input 
                type="date" 
                id="device-calibrationDate" 
                name="calibrationDate" 
                class="form-control" 
                value="${device?.calibrationDate || ''}"
              >
              <div class="field-error" id="error-calibrationDate" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" data-messgeraet-action="cancel">
              Abbrechen
            </button>
            <button type="submit" class="btn btn-primary">
              ${escapeHtml(submitText)}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Attach form submit handler
  const form = document.getElementById('messgeraetForm');
  if (form) {
    form.addEventListener('submit', (e) => handlers.handleFormSubmit(e, form));
  }

  // Focus first input
  const firstInput = document.getElementById('device-name');
  if (firstInput) {
    firstInput.focus();
  }
}

/**
 * Hide device form modal
 * @returns {void}
 */
export function hideDeviceForm() {
  const modal = document.getElementById(FORM_MODAL_ID);
  if (modal) {
    modal.remove();
  }
  state.clearValidationErrors();
}

// ============================================
// ERROR DISPLAY
// ============================================

/**
 * Display field error
 * @param {string} fieldName - Field name
 * @param {string} errorMessage - Error message
 * @returns {void}
 */
export function displayFieldError(fieldName, errorMessage) {
  const errorDiv = document.getElementById(`error-${fieldName}`);
  const field = document.querySelector(`[name="${fieldName}"]`);

  if (errorDiv) {
    errorDiv.textContent = errorMessage;
    errorDiv.style.display = 'block';
  }

  if (field) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `error-${fieldName}`);
  }
}

/**
 * Clear field error
 * @param {string} fieldName - Field name
 * @returns {void}
 */
export function clearFieldError(fieldName) {
  const errorDiv = document.getElementById(`error-${fieldName}`);
  const field = document.querySelector(`[name="${fieldName}"]`);

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
    container.className = 'messgeraet-message-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.setAttribute('role', type === 'error' ? 'alert' : 'status');

  div.innerHTML = `
    <span class="message-text">${escapeHtml(message)}</span>
    <button type="button" class="message-close" aria-label="Schließen">&times;</button>
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
// EVENT LISTENERS
// ============================================

/**
 * Attach event listeners to rendered elements
 * @returns {void}
 */
function attachListeners() {
  // Search input
  const searchInput = document.getElementById('messgeraet-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handlers.handleSearchChange(e.target.value);
    });
  }

  // Type filter
  const typeFilter = document.getElementById('messgeraet-type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      handlers.handleFilterTypeChange(e.target.value);
    });
  }
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
 * Check if calibration date is expired
 * @param {string} dateStr - Date string
 * @returns {boolean} True if expired
 */
function isCalibrationExpired(dateStr) {
  if (!dateStr) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calibDate = new Date(dateStr);
  return calibDate < today;
}

console.log('✓ Messgerät Renderer module loaded');
