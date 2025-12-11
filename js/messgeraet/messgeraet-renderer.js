/**
 * messgeraet-renderer.js
 * 
 * Handles all UI rendering and updates for the Messgerät module.
 * Dynamically generates HTML and updates DOM based on state changes.
 * German interface language.
 *
 * Updated to support UI Standardization Guide (Phase 1-6).
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
        <div class="card stat-card">
          <div class="card__body" style="display: flex; align-items: center; gap: var(--space-16);">
            <div class="stat-icon" style="background: var(--color-primary-light); color: var(--color-primary); padding: var(--space-8); border-radius: var(--radius-std-md);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <div class="stat-value" style="font-size: var(--font-size-h2); font-weight: var(--font-weight-std-bold);">${devices.length}</div>
              <div class="stat-label" style="color: var(--color-text-secondary); font-size: var(--font-size-small);">Messgeräte</div>
            </div>
          </div>
        </div>

        <div class="card stat-card">
           <div class="card__body" style="display: flex; align-items: center; gap: var(--space-16);">
            <div class="stat-icon" style="background: rgba(33, 128, 141, 0.1); color: var(--color-success); padding: var(--space-8); border-radius: var(--radius-std-md);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div class="stat-value" style="font-size: var(--font-size-h2); font-weight: var(--font-weight-std-bold);">${state.getValidDevices().length}</div>
              <div class="stat-label" style="color: var(--color-text-secondary); font-size: var(--font-size-small);">Gültige Kalibrierung</div>
            </div>
          </div>
        </div>

        <div class="card stat-card">
           <div class="card__body" style="display: flex; align-items: center; gap: var(--space-16);">
            <div class="stat-icon" style="background: rgba(192, 21, 47, 0.1); color: var(--color-error); padding: var(--space-8); border-radius: var(--radius-std-md);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div class="stat-value" style="font-size: var(--font-size-h2); font-weight: var(--font-weight-std-bold);">${devices.length - state.getValidDevices().length}</div>
              <div class="stat-label" style="color: var(--color-text-secondary); font-size: var(--font-size-small);">Abgelaufen/Ohne Datum</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Header with Add Button -->
      <div class="messgeraet-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-16);">
        <h3 style="font-size: var(--font-size-h3); margin: 0;">Messgeräte-Verwaltung</h3>
        <button type="button" class="btn btn--primary" data-messgeraet-action="add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neues Messgerät
        </button>
      </div>

      <!-- Filters -->
      <div class="messgeraet-filters panel" style="display: flex; gap: var(--space-16); padding: var(--space-16); background: var(--color-surface); border: 1px solid var(--color-border-std); border-radius: var(--radius-std-lg); margin-bottom: var(--space-16);">
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <input 
            type="search" 
            id="messgeraet-search" 
            class="form-control"
            placeholder="Suche nach Name, Typ, Fabrikat oder ID..."
            value="${escapeHtml(formState.searchTerm || '')}"
            aria-label="Messgeräte suchen"
          >
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <select 
            id="messgeraet-type-filter" 
            class="form-control"
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
      <div class="messgeraet-list-container card" style="overflow: hidden;">
        ${filteredDevices.length === 0 ? `
          <div class="messgeraet-empty-state" style="padding: var(--space-32); text-align: center;">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" style="color: var(--color-text-secondary); opacity: 0.5; margin-bottom: var(--space-16);">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <p class="empty-title" style="font-weight: var(--font-weight-std-medium); margin-bottom: var(--space-8);">Keine Messgeräte vorhanden</p>
            <p class="empty-text" style="color: var(--color-text-secondary);">Fügen Sie ein neues Messgerät hinzu, um zu beginnen.</p>
          </div>
        ` : `
          <div class="table-responsive">
            <table class="table" role="grid" aria-label="Messgeräte-Liste">
              <thead class="table__head">
                <tr>
                  <th class="table__th" scope="col">Name</th>
                  <th class="table__th" scope="col">Typ</th>
                  <th class="table__th" scope="col">Fabrikat</th>
                  <th class="table__th" scope="col">Ident-Nr.</th>
                  <th class="table__th" scope="col">Nächste Kalibrierung</th>
                  <th class="table__th" scope="col">Status</th>
                  <th class="table__th" scope="col">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                ${filteredDevices.map(device => renderDeviceRow(device)).join('')}
              </tbody>
            </table>
          </div>
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
  const badgeClass = isExpired ? 'badge--error' : 'badge--success';
  const statusText = isExpired ? 'Abgelaufen' : 'Gültig';

  return `
    <tr class="table__tr" data-device-id="${escapeHtml(device.id)}">
      <td class="table__td">
        <div class="device-name">
          <strong>${escapeHtml(device.name)}</strong>
        </div>
      </td>
      <td class="table__td">${escapeHtml(device.type)}</td>
      <td class="table__td">${escapeHtml(device.fabrikat || '-')}</td>
      <td class="table__td"><code style="font-family: var(--font-family-std-mono); background: var(--color-secondary); padding: 2px 4px; border-radius: var(--radius-std-sm); font-size: var(--font-size-tiny);">${escapeHtml(device.identNr || '-')}</code></td>
      <td class="table__td">${device.calibrationDate ? formatDate(device.calibrationDate) : '-'}</td>
      <td class="table__td">
        <span class="badge ${badgeClass}">
          ${statusText}
        </span>
      </td>
      <td class="table__td">
        <div class="btn-group">
          <button 
            type="button" 
            class="btn btn--icon btn--ghost"
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
            class="btn btn--icon btn--ghost"
            style="color: var(--color-error);"
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
    <div id="${FORM_MODAL_ID}" class="modal is-open" role="dialog" aria-labelledby="messgeraet-modal-title" aria-modal="true">
      <div class="modal__overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;" data-messgeraet-action="cancel"></div>
      <div class="modal__content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1001; background: var(--color-surface); width: 100%; max-width: 500px; border-radius: var(--radius-std-lg); box-shadow: var(--shadow-std-xl);">
        <div class="modal__header" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-20); border-bottom: 1px solid var(--color-border-std);">
          <h3 id="messgeraet-modal-title" style="margin: 0; font-size: var(--font-size-h3);">${escapeHtml(title)}</h3>
          <button type="button" class="btn btn--icon btn--ghost" data-messgeraet-action="cancel" aria-label="Schließen">&times;</button>
        </div>
        <form id="messgeraetForm">
          <div class="modal__body" style="padding: var(--space-20);">
            <div class="form-group">
              <label for="device-name" class="form-label">Name <span style="color: var(--color-error);">*</span></label>
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
              <div class="form-error" id="error-name" role="alert" aria-live="polite" style="display: none; color: var(--color-error); font-size: var(--font-size-small); margin-top: var(--space-4);"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16);">
              <div class="form-group">
                <label for="device-type" class="form-label">Typ <span style="color: var(--color-error);">*</span></label>
                <select id="device-type" name="type" class="form-control" required>
                  <option value="">-- Typ auswählen --</option>
                  ${deviceTypes.map(type => `
                    <option value="${escapeHtml(type)}" ${device?.type === type ? 'selected' : ''}>
                      ${escapeHtml(type)}
                    </option>
                  `).join('')}
                </select>
                <div class="form-error" id="error-type" role="alert" aria-live="polite" style="display: none; color: var(--color-error); font-size: var(--font-size-small); margin-top: var(--space-4);"></div>
              </div>

              <div class="form-group">
                <label for="device-fabrikat" class="form-label">Fabrikat</label>
                <input
                  type="text"
                  id="device-fabrikat"
                  name="fabrikat"
                  class="form-control"
                  value="${escapeHtml(device?.fabrikat || '')}"
                  placeholder="z.B. Fluke"
                  autocomplete="off"
                >
                <div class="form-error" id="error-fabrikat" role="alert" aria-live="polite" style="display: none; color: var(--color-error); font-size: var(--font-size-small); margin-top: var(--space-4);"></div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-16);">
              <div class="form-group">
                <label for="device-identNr" class="form-label">Ident-Nr.</label>
                <input
                  type="text"
                  id="device-identNr"
                  name="identNr"
                  class="form-control"
                  value="${escapeHtml(device?.identNr || '')}"
                  placeholder="z.B. 4312061"
                  autocomplete="off"
                >
                <div class="form-error" id="error-identNr" role="alert" aria-live="polite" style="display: none; color: var(--color-error); font-size: var(--font-size-small); margin-top: var(--space-4);"></div>
              </div>

              <div class="form-group">
                <label for="device-calibrationDate" class="form-label">Nächste Kalibrierung</label>
                <input
                  type="date"
                  id="device-calibrationDate"
                  name="calibrationDate"
                  class="form-control"
                  value="${device?.calibrationDate || ''}"
                >
                <div class="form-error" id="error-calibrationDate" role="alert" aria-live="polite" style="display: none; color: var(--color-error); font-size: var(--font-size-small); margin-top: var(--space-4);"></div>
              </div>
            </div>
          </div>
          <div class="modal__footer" style="padding: var(--space-16) var(--space-20); border-top: 1px solid var(--color-border-std); display: flex; justify-content: flex-end; gap: var(--space-12);">
            <button type="button" class="btn btn--secondary" data-messgeraet-action="cancel">
              Abbrechen
            </button>
            <button type="submit" class="btn btn--primary">
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
    field.classList.add('is-invalid'); // Standard bootstrap-like class, but styles might need specific handling
    field.style.borderColor = 'var(--color-error)';
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
    field.classList.remove('is-invalid');
    field.style.borderColor = '';
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
    // Use toast container style if not globally defined, but we'll manually position it fixed
    container.style.position = 'fixed';
    container.style.top = 'var(--space-20)';
    container.style.right = 'var(--space-20)';
    container.style.zIndex = '1100';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = 'var(--space-12)';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const div = document.createElement('div');
  div.className = `toast toast--${type}`;
  div.setAttribute('role', type === 'error' ? 'alert' : 'status');

  // Icon based on type
  let iconHtml = '';
  if (type === 'success') {
     iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast__icon"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
  } else if (type === 'error') {
     iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast__icon"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
  } else if (type === 'warning') {
     iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast__icon"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  } else {
     iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast__icon"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  }

  const titleMap = {
    'success': 'Erfolg',
    'error': 'Fehler',
    'warning': 'Warnung',
    'info': 'Info'
  };

  div.innerHTML = `
    ${iconHtml}
    <div class="toast__content">
      <h4 class="toast__title">${titleMap[type] || 'Info'}</h4>
      <p class="toast__message">${escapeHtml(message)}</p>
    </div>
    <button type="button" class="toast__close" aria-label="Schließen">&times;</button>
  `;

  // Add close handler
  div.querySelector('.toast__close').addEventListener('click', () => {
    div.classList.add('toast--removing');
    setTimeout(() => div.remove(), 250); // wait for animation
  });

  container.appendChild(div);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (div.parentNode) {
      div.classList.add('toast--removing');
      setTimeout(() => {
        if (div.parentNode) div.remove();
      }, 250);
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
