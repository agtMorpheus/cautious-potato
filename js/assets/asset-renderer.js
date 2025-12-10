/**
 * asset-renderer.js
 * 
 * Handles all UI rendering and updates for the Assets module.
 * Dynamically generates HTML and updates DOM based on state changes.
 * German interface language.
 */

import * as state from './asset-state.js';
import * as handlers from './asset-handlers.js';
import { escapeHtml, formatDate, filterAssets, getUniqueValues } from './asset-utils.js';

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

  // Listen for import state changes
  document.addEventListener('asset:importStateChanged', (e) => {
    renderImportProgress(e.detail);
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

  const assets = state.getAssets();
  const formState = state.getFormState();
  const statistics = state.getStatistics();

  // Apply filters
  const filteredAssets = filterAssets(assets, {
    searchTerm: formState.searchTerm,
    status: formState.filterStatus,
    plant: formState.filterPlant,
    type: formState.filterType
  });

  // Get unique values for filter dropdowns
  const uniquePlants = getUniqueValues(assets, 'plant');
  const uniqueTypes = getUniqueValues(assets, 'type');

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
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span class="stat-value">${Object.keys(statistics.byPlant).length}</span>
          <span class="stat-label">Werke</span>
        </div>
        <div class="asset-stat-card">
          <div class="stat-icon hierarchy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
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
          <label for="asset-file-input" class="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Excel importieren
          </label>
          <input type="file" id="asset-file-input" accept=".xlsx,.xls" class="file-input-hidden" />
          
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

      <!-- Import Progress -->
      <div id="asset-import-progress" class="asset-import-progress" style="display: none;"></div>

      <!-- Filters -->
      <div class="asset-filters">
        <div class="filter-group filter-group--search">
          <input 
            type="search" 
            id="asset-search" 
            class="form-input"
            placeholder="Suche nach ID, Name, Beschreibung, Standort..."
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
            ${state.getAssetStatuses().map(status => `
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
            ${uniquePlants.map(plant => `
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
            ${uniqueTypes.map(type => `
              <option value="${escapeHtml(type)}" ${formState.filterType === type ? 'selected' : ''}>
                ${escapeHtml(type)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="filter-group">
          <button type="button" class="btn btn-secondary btn-sm" data-asset-action="clear-filters">
            Filter zurücksetzen
          </button>
        </div>
      </div>

      <!-- Results count -->
      <div class="asset-results-info">
        ${filteredAssets.length === assets.length 
          ? `<span>${assets.length} Assets</span>`
          : `<span>${filteredAssets.length} von ${assets.length} Assets</span>`
        }
      </div>

      <!-- Asset List -->
      <div class="asset-list-container">
        ${filteredAssets.length === 0 ? `
          <div class="asset-empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p class="empty-title">${assets.length === 0 ? 'Keine Assets vorhanden' : 'Keine Assets gefunden'}</p>
            <p class="empty-text">${assets.length === 0 
              ? 'Importieren Sie eine Excel-Datei oder fügen Sie ein neues Asset hinzu.'
              : 'Passen Sie Ihre Filterkriterien an oder setzen Sie die Filter zurück.'
            }</p>
          </div>
        ` : `
          <table class="asset-table" role="grid" aria-label="Asset-Liste">
            <thead>
              <tr>
                <th scope="col">Asset-ID</th>
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
          <strong>${escapeHtml(asset.name)}</strong>
          ${asset.description ? `<small class="asset-desc">${escapeHtml(asset.description.substring(0, 50))}${asset.description.length > 50 ? '...' : ''}</small>` : ''}
        </div>
      </td>
      <td>${escapeHtml(asset.type || '-')}</td>
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

/**
 * Get CSS class for status
 * @param {string} status - Asset status
 * @returns {string} CSS class
 */
function getStatusClass(status) {
  const statusMap = {
    'IN BETRIEB': 'active',
    'AKTIV': 'active',
    'INAKTIV': 'inactive',
    'STILLGELEGT': 'decommissioned'
  };
  return statusMap[status] || 'unknown';
}

// ============================================
// IMPORT PROGRESS
// ============================================

/**
 * Render import progress
 * @param {Object} importState - Import state object
 * @returns {void}
 */
function renderImportProgress(importState) {
  const container = document.getElementById('asset-import-progress');
  if (!container) return;

  if (!importState.isImporting && importState.status === 'idle') {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const statusClass = importState.status === 'success' ? 'success' : 
                      importState.status === 'error' ? 'error' : 'pending';

  container.innerHTML = `
    <div class="import-progress import-progress--${statusClass}">
      <div class="import-progress-header">
        <span class="import-progress-title">Import ${importState.status === 'pending' ? 'läuft...' : importState.status === 'success' ? 'abgeschlossen' : 'fehlgeschlagen'}</span>
        <span class="import-progress-value">${importState.progress}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar progress-bar--${statusClass}" style="width: ${importState.progress}%;" role="progressbar" aria-valuenow="${importState.progress}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <p class="import-progress-message">${escapeHtml(importState.message)}</p>
      ${importState.errors.length > 0 ? `
        <div class="import-errors">
          <strong>Fehler:</strong>
          <ul>
            ${importState.errors.slice(0, 5).map(e => `<li>${escapeHtml(e)}</li>`).join('')}
            ${importState.errors.length > 5 ? `<li>... und ${importState.errors.length - 5} weitere Fehler</li>` : ''}
          </ul>
        </div>
      ` : ''}
    </div>
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
  const assets = state.getAssets();
  const assetTypes = state.getAssetTypes();
  const assetStatuses = state.getAssetStatuses();

  const modalHtml = `
    <div id="${FORM_MODAL_ID}" class="asset-modal" role="dialog" aria-labelledby="asset-modal-title" aria-modal="true">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="asset-modal-title">${escapeHtml(title)}</h3>
          <button type="button" class="modal-close" data-asset-action="cancel" aria-label="Schließen">&times;</button>
        </div>
        <form id="assetForm" class="asset-form">
          <div class="form-section">
            <h4 class="form-section-title">Grunddaten</h4>
            
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
                autocomplete="off"
              >
              <div class="field-error" id="error-name" role="alert" aria-live="polite"></div>
            </div>

            <div class="form-group">
              <label for="asset-description">Beschreibung</label>
              <textarea 
                id="asset-description" 
                name="description" 
                class="form-control" 
                rows="2"
                placeholder="Vollständige Beschreibung des Assets"
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
          </div>

          <div class="form-section">
            <h4 class="form-section-title">Standort</h4>

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
              <select id="asset-parentId" name="parentId" class="form-control">
                <option value="">-- Kein übergeordnetes Asset --</option>
                ${assets.filter(a => a.id !== asset?.id).map(a => `
                  <option value="${escapeHtml(a.id)}" ${asset?.parentId === a.id ? 'selected' : ''}>
                    ${escapeHtml(a.name)} (${escapeHtml(a.id)})
                  </option>
                `).join('')}
              </select>
              <div class="field-error" id="error-parentId" role="alert" aria-live="polite"></div>
            </div>
          </div>

          <div class="form-section">
            <h4 class="form-section-title">Zusätzliche Informationen</h4>

            <div class="form-row">
              <div class="form-group">
                <label for="asset-generalLedgerAccount">Hauptbuchkonto</label>
                <input 
                  type="text" 
                  id="asset-generalLedgerAccount" 
                  name="generalLedgerAccount" 
                  class="form-control" 
                  value="${escapeHtml(asset?.generalLedgerAccount || '')}"
                  placeholder="z.B. 0045011000-0001114060"
                >
              </div>

              <div class="form-group">
                <label for="asset-vassKey">VASS-Schlüssel</label>
                <input 
                  type="text" 
                  id="asset-vassKey" 
                  name="vassKey" 
                  class="form-control" 
                  value="${escapeHtml(asset?.vassKey || '')}"
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="asset-maintenanceWindowStart">Wartungsfenster Start</label>
                <input 
                  type="date" 
                  id="asset-maintenanceWindowStart" 
                  name="maintenanceWindowStart" 
                  class="form-control" 
                  value="${asset?.maintenanceWindowStart || ''}"
                >
                <div class="field-error" id="error-maintenanceWindowStart" role="alert" aria-live="polite"></div>
              </div>

              <div class="form-group">
                <label for="asset-maintenanceWindowEnd">Wartungsfenster Ende</label>
                <input 
                  type="date" 
                  id="asset-maintenanceWindowEnd" 
                  name="maintenanceWindowEnd" 
                  class="form-control" 
                  value="${asset?.maintenanceWindowEnd || ''}"
                >
                <div class="field-error" id="error-maintenanceWindowEnd" role="alert" aria-live="polite"></div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="asset-replacementPart">Tauschartikel</label>
                <input 
                  type="text" 
                  id="asset-replacementPart" 
                  name="replacementPart" 
                  class="form-control" 
                  value="${escapeHtml(asset?.replacementPart || '')}"
                >
              </div>

              <div class="form-group">
                <label for="asset-damageClass">Schadensklasse</label>
                <input 
                  type="text" 
                  id="asset-damageClass" 
                  name="damageClass" 
                  class="form-control" 
                  value="${escapeHtml(asset?.damageClass || '')}"
                >
              </div>
            </div>
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
  const firstInput = document.getElementById('asset-name');
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

/**
 * Render statistics panel
 * @param {Object} stats - Statistics object
 * @returns {void}
 */
export function renderStatistics(stats) {
  const statsContainer = document.getElementById('asset-stats');
  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="stats-summary">
      <span>Gesamt: ${stats.total}</span>
      <span>In Betrieb: ${stats.byStatus['IN BETRIEB'] || 0}</span>
      <span>Aktiv: ${stats.byStatus['AKTIV'] || 0}</span>
      <span>Inaktiv: ${stats.byStatus['INAKTIV'] || 0}</span>
    </div>
  `;
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Attach event listeners to rendered elements
 * @returns {void}
 */
function attachListeners() {
  // File input
  const fileInput = document.getElementById('asset-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handlers.handleFileImport);
  }

  // Search input
  const searchInput = document.getElementById('asset-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handlers.handleSearchChange(e.target.value);
      }, 300); // Debounce search
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
}

console.log('✓ Asset Renderer module loaded');
