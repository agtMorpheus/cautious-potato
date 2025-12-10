/**
 * asset-renderer.js
 * 
 * Handles all UI rendering and updates for the Asset module.
 * Dynamically generates HTML and updates DOM based on state changes.
 * German interface language.
 */

import * as state from './asset-state.js';
import * as handlers from './asset-handlers.js';

// ============================================
// CONSTANTS
// ============================================

const CONTAINER_ID = 'assetContainer';
const FORM_MODAL_ID = 'assetFormModal';
const MESSAGE_CONTAINER_ID = 'assetMessageContainer';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the renderer module
 * @returns {void}
 */
export function init() {
  console.log('Initializing Asset Renderer');

  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.warn(`Container ${CONTAINER_ID} not found - will be created when view is shown`);
  }

  // Subscribe to state changes
  setupStateSubscriptions();

  // Render initial view
  renderAssetList();

  console.log('✓ Asset Renderer initialized');
}

/**
 * Set up subscriptions to state change events
 * @returns {void}
 */
function setupStateSubscriptions() {
  // Listen for render requests
  document.addEventListener('asset:renderAssets', () => {
    renderAssetList();
  });

  // Listen for form show requests
  document.addEventListener('asset:showForm', (e) => {
    const { mode, assetId } = e.detail;
    showAssetForm(mode, assetId);
  });

  // Listen for form hide requests
  document.addEventListener('asset:hideForm', () => {
    hideAssetForm();
  });

  // Listen for editing changes
  document.addEventListener('asset:editingChanged', (e) => {
    const { assetId } = e.detail;
    if (assetId) {
      showAssetForm('edit', assetId);
    }
  });

  // Listen for validation errors
  document.addEventListener('asset:validationError', (e) => {
    const { fieldName, error } = e.detail;
    if (error) {
      displayFieldError(fieldName, error);
    } else {
      clearFieldError(fieldName);
    }
  });

  // Listen for messages
  document.addEventListener('asset:message', (e) => {
    displayMessage(e.detail.type, e.detail.message);
  });

  // Listen for import results
  document.addEventListener('asset:importResults', (e) => {
    showImportResults(e.detail);
  });
}

// ============================================
// MAIN RENDERING FUNCTIONS
// ============================================

/**
 * Render the asset list view
 * @returns {void}
 */
export function renderAssetList() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const assets = state.getAllAssets();
  const formState = state.getFormState();
  const statistics = state.getStatistics();
  const assetStatuses = state.getAssetStatuses();
  const assetTypes = state.getAssetTypes();
  const plants = state.getUniquePlants();

  // Filter assets based on current filters
  let filteredAssets = assets;

  if (formState.searchTerm) {
    const term = formState.searchTerm.toLowerCase();
    filteredAssets = filteredAssets.filter(a =>
      (a.id && a.id.toLowerCase().includes(term)) ||
      (a.name && a.name.toLowerCase().includes(term)) ||
      (a.description && a.description.toLowerCase().includes(term)) ||
      (a.location && a.location.toLowerCase().includes(term)) ||
      (a.plant && a.plant.toLowerCase().includes(term))
    );
  }

  if (formState.filterStatus) {
    filteredAssets = filteredAssets.filter(a => a.status === formState.filterStatus);
  }

  if (formState.filterPlant) {
    filteredAssets = filteredAssets.filter(a => a.plant === formState.filterPlant);
  }

  if (formState.filterType) {
    filteredAssets = filteredAssets.filter(a => a.type === formState.filterType);
  }

  const html = `
    <div class="asset-module">
      <!-- Statistics -->
      <div class="asset-stats-grid">
        <div class="asset-stat-card">
          <div class="stat-icon assets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span class="stat-value">${statistics.total}</span>
          <span class="stat-label">Assets gesamt</span>
        </div>
        <div class="asset-stat-card">
          <div class="stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="stat-value">${statistics.byStatus['IN BETRIEB'] || 0}</span>
          <span class="stat-label">In Betrieb</span>
        </div>
        <div class="asset-stat-card">
          <div class="stat-icon plants">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="stat-value">${Object.keys(statistics.byPlant).length}</span>
          <span class="stat-label">Werke</span>
        </div>
        <div class="asset-stat-card">
          <div class="stat-icon hierarchy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <span class="stat-value">${statistics.hierarchical}</span>
          <span class="stat-label">Hierarchisch</span>
        </div>
      </div>

      <!-- Header with Actions -->
      <div class="asset-header">
        <h3>Asset-Verwaltung</h3>
        <div class="asset-header-actions">
          <label class="btn btn-secondary" for="asset-file-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Excel importieren
          </label>
          <input type="file" id="asset-file-input" accept=".xlsx,.xls" style="display: none;" />
          <button type="button" class="btn btn-secondary" data-asset-action="export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportieren
          </button>
          <button type="button" class="btn btn-primary" data-asset-action="add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Neues Asset
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="asset-filters">
        <div class="filter-group filter-group--search">
          <input 
            type="search" 
            id="asset-search" 
            class="form-input"
            placeholder="Suche nach ID, Name, Standort..."
            value="${escapeHtml(formState.searchTerm || '')}"
            aria-label="Assets suchen"
          >
        </div>
        <div class="filter-group">
          <select 
            id="asset-status-filter" 
            class="form-select"
            aria-label="Nach Status filtern"
          >
            <option value="">Alle Status</option>
            ${assetStatuses.map(status => `
              <option value="${escapeHtml(status)}" ${formState.filterStatus === status ? 'selected' : ''}>
                ${escapeHtml(status)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="filter-group">
          <select 
            id="asset-plant-filter" 
            class="form-select"
            aria-label="Nach Werk filtern"
          >
            <option value="">Alle Werke</option>
            ${plants.map(plant => `
              <option value="${escapeHtml(plant)}" ${formState.filterPlant === plant ? 'selected' : ''}>
                ${escapeHtml(plant)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="filter-group">
          <select 
            id="asset-type-filter" 
            class="form-select"
            aria-label="Nach Typ filtern"
          >
            <option value="">Alle Typen</option>
            ${assetTypes.map(type => `
              <option value="${escapeHtml(type)}" ${formState.filterType === type ? 'selected' : ''}>
                ${escapeHtml(type)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Asset List -->
      <div class="asset-list-container">
        ${filteredAssets.length === 0 ? `
          <div class="asset-empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p class="empty-title">Keine Assets vorhanden</p>
            <p class="empty-text">Importieren Sie eine Excel-Datei oder fügen Sie ein neues Asset hinzu.</p>
          </div>
        ` : `
          <table class="asset-table" role="grid" aria-label="Asset-Liste">
            <thead>
              <tr>
                <th scope="col">Anlage-ID</th>
                <th scope="col">Name</th>
                <th scope="col">Typ</th>
                <th scope="col">Status</th>
                <th scope="col">Standort</th>
                <th scope="col">Werk</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAssets.map(asset => renderAssetRow(asset)).join('')}
            </tbody>
          </table>
          <div class="asset-list-footer">
            <span class="asset-count">${filteredAssets.length} von ${assets.length} Assets</span>
          </div>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;
  attachListeners();
}

/**
 * Render a single asset row
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderAssetRow(asset) {
  const statusClass = getStatusClass(asset.status);

  return `
    <tr data-asset-id="${escapeHtml(asset.id)}">
      <td>
        <code class="asset-id">${escapeHtml(asset.id)}</code>
      </td>
      <td>
        <div class="asset-name">
          <a href="#" class="asset-name-link" data-asset-action="view-detail" data-asset-id="${escapeHtml(asset.id)}">
            <strong>${escapeHtml(asset.name)}</strong>
          </a>
          ${asset.description && asset.description !== asset.name ? `
            <span class="asset-description">${escapeHtml(truncate(asset.description, 60))}</span>
          ` : ''}
        </div>
      </td>
      <td><span class="asset-type">${escapeHtml(asset.type || 'OTHER')}</span></td>
      <td>
        <span class="asset-status status-${statusClass}">
          ${escapeHtml(asset.status)}
        </span>
      </td>
      <td>${escapeHtml(asset.location || '-')}</td>
      <td>${escapeHtml(asset.plant || '-')}</td>
      <td>
        <div class="asset-actions">
          <button 
            type="button" 
            class="btn-icon" 
            data-asset-action="view-detail" 
            data-asset-id="${escapeHtml(asset.id)}"
            title="Details anzeigen"
            aria-label="Asset-Details anzeigen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon btn-protocol" 
            data-asset-action="create-protocol" 
            data-asset-id="${escapeHtml(asset.id)}"
            title="Neues Protokoll erstellen"
            aria-label="Neues Protokoll aus Asset erstellen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon" 
            data-asset-action="edit" 
            data-asset-id="${escapeHtml(asset.id)}"
            title="Bearbeiten"
            aria-label="Asset bearbeiten"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon btn-danger" 
            data-asset-action="delete" 
            data-asset-id="${escapeHtml(asset.id)}"
            title="Löschen"
            aria-label="Asset löschen"
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
 * Show asset form modal
 * @param {string} mode - 'add' or 'edit'
 * @param {string} assetId - Asset ID (for edit mode)
 * @returns {void}
 */
export function showAssetForm(mode, assetId = null) {
  // Remove existing modal if any
  hideAssetForm();

  const asset = assetId ? state.getAsset(assetId) : null;
  const title = mode === 'edit' ? 'Asset bearbeiten' : 'Neues Asset';
  const submitText = mode === 'edit' ? 'Aktualisieren' : 'Hinzufügen';
  const assetStatuses = state.getAssetStatuses();
  const assetTypes = state.getAssetTypes();

  const modalHtml = `
    <div id="${FORM_MODAL_ID}" class="asset-modal" role="dialog" aria-labelledby="asset-modal-title" aria-modal="true">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="asset-modal-title">${escapeHtml(title)}</h3>
          <button type="button" class="modal-close" data-asset-action="cancel" aria-label="Schließen">&times;</button>
        </div>
        <form id="assetForm" class="asset-form">
          <div class="form-row">
            <div class="form-group">
              <label for="asset-id">Anlage-ID <span class="required">*</span></label>
              <input 
                type="text" 
                id="asset-id" 
                name="id" 
                class="form-control" 
                value="${escapeHtml(asset?.id || '')}"
                ${mode === 'edit' ? 'readonly' : 'required'}
                placeholder="z.B. E03150AP17000000001"
              >
              <div class="field-error" id="error-id" role="alert" aria-live="polite"></div>
            </div>
            <div class="form-group">
              <label for="asset-name">Name <span class="required">*</span></label>
              <input 
                type="text" 
                id="asset-name" 
                name="name" 
                class="form-control" 
                value="${escapeHtml(asset?.name || '')}"
                required
                placeholder="z.B. LVUM-17"
              >
              <div class="field-error" id="error-name" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="form-group">
            <label for="asset-description">Beschreibung</label>
            <textarea 
              id="asset-description" 
              name="description" 
              class="form-control" 
              rows="2"
              placeholder="Optionale Beschreibung des Assets"
            >${escapeHtml(asset?.description || '')}</textarea>
            <div class="field-error" id="error-description" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="asset-type">Typ</label>
              <select id="asset-type" name="type" class="form-control">
                ${assetTypes.map(type => `
                  <option value="${escapeHtml(type)}" ${asset?.type === type ? 'selected' : ''}>
                    ${escapeHtml(type)}
                  </option>
                `).join('')}
              </select>
              <div class="field-error" id="error-type" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="asset-status">Status <span class="required">*</span></label>
              <select id="asset-status" name="status" class="form-control" required>
                ${assetStatuses.map(status => `
                  <option value="${escapeHtml(status)}" ${asset?.status === status ? 'selected' : ''}>
                    ${escapeHtml(status)}
                  </option>
                `).join('')}
              </select>
              <div class="field-error" id="error-status" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="asset-location">Standort</label>
              <input 
                type="text" 
                id="asset-location" 
                name="location" 
                class="form-control" 
                value="${escapeHtml(asset?.location || '')}"
                placeholder="z.B. 1100-0BT01-00"
              >
              <div class="field-error" id="error-location" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="asset-plant">Werk</label>
              <input 
                type="text" 
                id="asset-plant" 
                name="plant" 
                class="form-control" 
                value="${escapeHtml(asset?.plant || '')}"
                placeholder="z.B. 1100"
              >
              <div class="field-error" id="error-plant" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="form-group">
            <label for="asset-parentId">Übergeordnetes Asset</label>
            <input 
              type="text" 
              id="asset-parentId" 
              name="parentId" 
              class="form-control" 
              value="${escapeHtml(asset?.parentId || '')}"
              placeholder="ID des übergeordneten Assets (optional)"
            >
            <div class="field-error" id="error-parentId" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" data-asset-action="cancel">
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
  const form = document.getElementById('assetForm');
  if (form) {
    form.addEventListener('submit', (e) => handlers.handleFormSubmit(e, form));
  }

  // Focus first input
  const firstInput = document.getElementById(mode === 'edit' ? 'asset-name' : 'asset-id');
  if (firstInput) {
    firstInput.focus();
  }
}

/**
 * Hide asset form modal
 * @returns {void}
 */
export function hideAssetForm() {
  const modal = document.getElementById(FORM_MODAL_ID);
  if (modal) {
    modal.remove();
  }
  state.clearValidationErrors();
}

// ============================================
// IMPORT RESULTS
// ============================================

/**
 * Show import results dialog
 * @param {Object} results - Import results
 * @returns {void}
 */
export function showImportResults(results) {
  const { total, successful, failed, errors } = results;

  let errorHtml = '';
  if (errors && errors.length > 0) {
    errorHtml = `
      <div class="import-errors">
        <h4>Fehlerhafte Zeilen:</h4>
        <ul>
          ${errors.slice(0, 10).map(err => `
            <li>Zeile ${err.row}: ${escapeHtml(err.error)}</li>
          `).join('')}
          ${errors.length > 10 ? `<li>... und ${errors.length - 10} weitere Fehler</li>` : ''}
        </ul>
      </div>
    `;
  }

  const modalHtml = `
    <div id="asset-import-results-modal" class="asset-modal" role="dialog" aria-labelledby="import-results-title" aria-modal="true">
      <div class="modal-overlay"></div>
      <div class="modal-content modal-content--sm">
        <div class="modal-header">
          <h3 id="import-results-title">Import-Ergebnis</h3>
          <button type="button" class="modal-close" onclick="this.closest('.asset-modal').remove()" aria-label="Schließen">&times;</button>
        </div>
        <div class="modal-body">
          <div class="import-summary">
            <div class="import-stat">
              <span class="import-stat-value">${total}</span>
              <span class="import-stat-label">Zeilen verarbeitet</span>
            </div>
            <div class="import-stat import-stat--success">
              <span class="import-stat-value">${successful}</span>
              <span class="import-stat-label">Erfolgreich</span>
            </div>
            <div class="import-stat import-stat--error">
              <span class="import-stat-value">${failed}</span>
              <span class="import-stat-label">Fehlerhaft</span>
            </div>
          </div>
          ${errorHtml}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onclick="this.closest('.asset-modal').remove()">
            Schließen
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
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
    container.className = 'asset-message-container';
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
  const searchInput = document.getElementById('asset-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handlers.handleSearchChange(e.target.value);
    });
  }

  // Status filter
  const statusFilter = document.getElementById('asset-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      handlers.handleStatusFilterChange(e.target.value);
    });
  }

  // Plant filter
  const plantFilter = document.getElementById('asset-plant-filter');
  if (plantFilter) {
    plantFilter.addEventListener('change', (e) => {
      handlers.handlePlantFilterChange(e.target.value);
    });
  }

  // Type filter
  const typeFilter = document.getElementById('asset-type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      handlers.handleTypeFilterChange(e.target.value);
    });
  }

  // File input
  const fileInput = document.getElementById('asset-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handlers.handleFileImport);
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
 * Get CSS class for status
 * @param {string} status - Asset status
 * @returns {string} CSS class
 */
function getStatusClass(status) {
  const statusClasses = {
    'IN BETRIEB': 'active',
    'AKTIV': 'active',
    'INAKTIV': 'inactive',
    'STILLGELEGT': 'decommissioned'
  };
  return statusClasses[status] || 'default';
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

console.log('✓ Asset Renderer module loaded');
