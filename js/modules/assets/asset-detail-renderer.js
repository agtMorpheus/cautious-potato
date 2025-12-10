/**
 * asset-detail-renderer.js
 * 
 * Handles rendering of the individual asset detail page.
 * Shows asset information and tabs for managing documents, contracts, photos, and protocols.
 * Includes functionality to create a new protocol from asset data.
 */

import * as state from './asset-state.js';
import { handleCreateProtocolFromAsset } from './asset-handlers.js';

// ============================================
// CONSTANTS
// ============================================

const CONTAINER_ID = 'assetContainer';
const DETAIL_VIEW_ID = 'assetDetailView';
const TAB_CONTENT_ID = 'assetTabContent';

// Tab configuration
const TABS = [
  { id: 'overview', label: 'Übersicht', icon: 'info' },
  { id: 'documents', label: 'Dokumente', icon: 'file' },
  { id: 'contracts', label: 'Verträge', icon: 'document' },
  { id: 'photos', label: 'Fotos', icon: 'image' },
  { id: 'protocols', label: 'Protokolle', icon: 'clipboard' }
];

// Current state
let currentAssetId = null;
let currentTab = 'overview';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the detail renderer module
 * @returns {void}
 */
export function init() {
  console.log('Initializing Asset Detail Renderer');

  // Set up event listeners for detail view navigation
  setupEventListeners();

  console.log('✓ Asset Detail Renderer initialized');
}

/**
 * Set up event listeners
 * @returns {void}
 */
function setupEventListeners() {
  // Listen for navigation to detail view
  document.addEventListener('asset:showDetail', (e) => {
    const { assetId } = e.detail;
    if (assetId) {
      showAssetDetail(assetId);
    }
  });

  // Listen for back to list navigation
  document.addEventListener('asset:hideDetail', () => {
    hideAssetDetail();
  });

  // Event delegation for tab clicks and actions within detail view
  document.addEventListener('click', handleDetailClick);
}

// ============================================
// MAIN RENDERING FUNCTIONS
// ============================================

/**
 * Show asset detail view
 * @param {string} assetId - Asset ID to display
 * @returns {void}
 */
export function showAssetDetail(assetId) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const asset = state.getAsset(assetId);
  if (!asset) {
    console.error(`Asset not found: ${assetId}`);
    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'error', message: 'Asset nicht gefunden.' }
    }));
    return;
  }

  currentAssetId = assetId;
  currentTab = 'overview';

  const html = renderDetailView(asset);
  container.innerHTML = html;

  // Update tab content
  renderTabContent(asset, currentTab);
}

/**
 * Hide asset detail view and go back to list
 * @returns {void}
 */
export function hideAssetDetail() {
  currentAssetId = null;
  currentTab = 'overview';

  // Trigger re-render of asset list
  document.dispatchEvent(new CustomEvent('asset:renderAssets', {
    detail: { action: 'backToList' }
  }));
}

/**
 * Render the complete detail view
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderDetailView(asset) {
  return `
    <div id="${DETAIL_VIEW_ID}" class="asset-detail">
      <!-- Header with back button and asset info -->
      <div class="asset-detail-header">
        <button type="button" class="btn btn-secondary btn-back" data-asset-action="back-to-list">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück zur Liste
        </button>
        <div class="asset-detail-title">
          <h2>${escapeHtml(asset.name)}</h2>
          <code class="asset-id">${escapeHtml(asset.id)}</code>
          <span class="asset-status status-${getStatusClass(asset.status)}">${escapeHtml(asset.status)}</span>
        </div>
        <div class="asset-detail-actions">
          <button type="button" class="btn btn-primary" data-asset-action="create-protocol" data-asset-id="${escapeHtml(asset.id)}" title="Neues Protokoll aus Asset erstellen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Protokoll erstellen
          </button>
          <button type="button" class="btn btn-secondary" data-asset-action="edit" data-asset-id="${escapeHtml(asset.id)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Bearbeiten
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="asset-detail-tabs">
        ${TABS.map(tab => `
          <button 
            type="button" 
            class="asset-tab-btn ${tab.id === currentTab ? 'active' : ''}" 
            data-tab="${tab.id}"
          >
            ${getTabIcon(tab.icon)}
            <span>${escapeHtml(tab.label)}</span>
          </button>
        `).join('')}
      </div>

      <!-- Tab Content -->
      <div id="${TAB_CONTENT_ID}" class="asset-tab-content">
        <!-- Content rendered by renderTabContent -->
      </div>
    </div>
  `;
}

/**
 * Render tab content based on selected tab
 * @param {Object} asset - Asset object
 * @param {string} tabId - Tab identifier
 * @returns {void}
 */
function renderTabContent(asset, tabId) {
  const container = document.getElementById(TAB_CONTENT_ID);
  if (!container) return;

  let html = '';

  switch (tabId) {
    case 'overview':
      html = renderOverviewTab(asset);
      break;
    case 'documents':
      html = renderDocumentsTab(asset);
      break;
    case 'contracts':
      html = renderContractsTab(asset);
      break;
    case 'photos':
      html = renderPhotosTab(asset);
      break;
    case 'protocols':
      html = renderProtocolsTab(asset);
      break;
    default:
      html = renderOverviewTab(asset);
  }

  container.innerHTML = html;
}

// ============================================
// TAB CONTENT RENDERERS
// ============================================

/**
 * Render overview tab content
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderOverviewTab(asset) {
  return `
    <div class="asset-overview">
      <div class="asset-info-grid">
        <div class="asset-info-card">
          <h4>Allgemeine Informationen</h4>
          <dl class="asset-info-list">
            <div class="info-row">
              <dt>Anlage-ID</dt>
              <dd><code>${escapeHtml(asset.id)}</code></dd>
            </div>
            <div class="info-row">
              <dt>Name</dt>
              <dd>${escapeHtml(asset.name)}</dd>
            </div>
            <div class="info-row">
              <dt>Beschreibung</dt>
              <dd>${escapeHtml(asset.description || '-')}</dd>
            </div>
            <div class="info-row">
              <dt>Typ</dt>
              <dd><span class="asset-type">${escapeHtml(asset.type || 'OTHER')}</span></dd>
            </div>
            <div class="info-row">
              <dt>Status</dt>
              <dd><span class="asset-status status-${getStatusClass(asset.status)}">${escapeHtml(asset.status)}</span></dd>
            </div>
          </dl>
        </div>

        <div class="asset-info-card">
          <h4>Standort</h4>
          <dl class="asset-info-list">
            <div class="info-row">
              <dt>Standort</dt>
              <dd>${escapeHtml(asset.location || '-')}</dd>
            </div>
            <div class="info-row">
              <dt>Werk</dt>
              <dd>${escapeHtml(asset.plant || '-')}</dd>
            </div>
            <div class="info-row">
              <dt>Übergeordnetes Asset</dt>
              <dd>${asset.parentId ? `<code>${escapeHtml(asset.parentId)}</code>` : '-'}</dd>
            </div>
          </dl>
        </div>

        <div class="asset-info-card">
          <h4>Technische Daten</h4>
          <dl class="asset-info-list">
            <div class="info-row">
              <dt>Ersatzteil</dt>
              <dd>${escapeHtml(asset.replacementPart || '-')}</dd>
            </div>
            <div class="info-row">
              <dt>Schadensklasse</dt>
              <dd>${escapeHtml(asset.damageClass || '-')}</dd>
            </div>
            <div class="info-row">
              <dt>Wartungsfenster</dt>
              <dd>${asset.maintenanceWindowStart && asset.maintenanceWindowEnd 
                ? `${escapeHtml(asset.maintenanceWindowStart)} - ${escapeHtml(asset.maintenanceWindowEnd)}`
                : '-'}</dd>
            </div>
            <div class="info-row">
              <dt>Sachkonto</dt>
              <dd>${escapeHtml(asset.generalLedgerAccount || '-')}</dd>
            </div>
            <div class="info-row">
              <dt>VASS-Key</dt>
              <dd>${escapeHtml(asset.vassKey || '-')}</dd>
            </div>
          </dl>
        </div>

        <div class="asset-info-card">
          <h4>Metadaten</h4>
          <dl class="asset-info-list">
            <div class="info-row">
              <dt>Importiert am</dt>
              <dd>${asset.importedAt ? formatDate(asset.importedAt) : '-'}</dd>
            </div>
            <div class="info-row">
              <dt>Letzte Aktualisierung</dt>
              <dd>${asset.lastUpdated ? formatDate(asset.lastUpdated) : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render documents tab content
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderDocumentsTab(asset) {
  const documents = asset.documents || [];

  return `
    <div class="asset-documents">
      <div class="tab-header">
        <h4>Dokumente</h4>
        <button type="button" class="btn btn-primary btn-sm" data-asset-action="add-document" data-asset-id="${escapeHtml(asset.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Dokument hinzufügen
        </button>
      </div>
      
      ${documents.length === 0 ? `
        <div class="empty-tab-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Keine Dokumente vorhanden</p>
          <p class="text-muted">Fügen Sie Dokumente hinzu, um diese hier zu verwalten.</p>
        </div>
      ` : `
        <div class="documents-list">
          ${documents.map(doc => `
            <div class="document-item" data-document-id="${escapeHtml(doc.id)}">
              <div class="document-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="document-info">
                <span class="document-name">${escapeHtml(doc.name)}</span>
                <span class="document-date">${doc.createdAt ? formatDate(doc.createdAt) : '-'}</span>
              </div>
              <div class="document-actions">
                <button type="button" class="btn-icon" data-action="view-document" data-document-id="${escapeHtml(doc.id)}" title="Anzeigen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button type="button" class="btn-icon btn-danger" data-action="delete-document" data-document-id="${escapeHtml(doc.id)}" title="Löschen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Render contracts tab content
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderContractsTab(asset) {
  const contracts = asset.contracts || [];

  return `
    <div class="asset-contracts">
      <div class="tab-header">
        <h4>Verträge</h4>
        <button type="button" class="btn btn-primary btn-sm" data-asset-action="add-contract" data-asset-id="${escapeHtml(asset.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Vertrag verknüpfen
        </button>
      </div>
      
      ${contracts.length === 0 ? `
        <div class="empty-tab-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Keine Verträge verknüpft</p>
          <p class="text-muted">Verknüpfen Sie Verträge mit diesem Asset.</p>
        </div>
      ` : `
        <div class="contracts-list">
          ${contracts.map(contract => `
            <div class="contract-item" data-contract-id="${escapeHtml(contract.id || contract)}">
              <div class="contract-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="contract-info">
                <span class="contract-name">${escapeHtml(contract.title || contract.id || contract)}</span>
                <span class="contract-id">${escapeHtml(contract.contractId || '')}</span>
              </div>
              <div class="contract-actions">
                <button type="button" class="btn-icon btn-danger" data-action="unlink-contract" data-contract-id="${escapeHtml(contract.id || contract)}" title="Verknüpfung aufheben">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Render photos tab content
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderPhotosTab(asset) {
  const pictures = asset.pictures || [];

  return `
    <div class="asset-photos">
      <div class="tab-header">
        <h4>Fotos</h4>
        <button type="button" class="btn btn-primary btn-sm" data-asset-action="add-photo" data-asset-id="${escapeHtml(asset.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Foto hinzufügen
        </button>
      </div>
      
      ${pictures.length === 0 ? `
        <div class="empty-tab-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>Keine Fotos vorhanden</p>
          <p class="text-muted">Fügen Sie Fotos hinzu, um diese hier zu verwalten.</p>
        </div>
      ` : `
        <div class="photos-grid">
          ${pictures.map(photo => `
            <div class="photo-item" data-photo-id="${escapeHtml(photo.id)}">
              <div class="photo-preview">
                ${photo.thumbnail || photo.url 
                  ? `<img src="${escapeHtml(photo.thumbnail || photo.url)}" alt="${escapeHtml(photo.name || 'Foto')}" />`
                  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>`
                }
              </div>
              <div class="photo-info">
                <span class="photo-name">${escapeHtml(photo.name || 'Unbenannt')}</span>
                <span class="photo-date">${photo.createdAt ? formatDate(photo.createdAt) : ''}</span>
              </div>
              <div class="photo-actions">
                <button type="button" class="btn-icon btn-danger" data-action="delete-photo" data-photo-id="${escapeHtml(photo.id)}" title="Löschen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Render protocols tab content
 * @param {Object} asset - Asset object
 * @returns {string} HTML string
 */
function renderProtocolsTab(asset) {
  const protocols = asset.protocols || [];

  return `
    <div class="asset-protocols">
      <div class="tab-header">
        <h4>Protokolle</h4>
        <button type="button" class="btn btn-primary btn-sm" data-asset-action="create-protocol" data-asset-id="${escapeHtml(asset.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neues Protokoll erstellen
        </button>
      </div>
      
      ${protocols.length === 0 ? `
        <div class="empty-tab-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p>Keine Protokolle vorhanden</p>
          <p class="text-muted">Erstellen Sie ein neues Protokoll für dieses Asset.</p>
        </div>
      ` : `
        <div class="protocols-list">
          ${protocols.map(protocol => `
            <div class="protocol-item" data-protocol-id="${escapeHtml(protocol.id || protocol)}">
              <div class="protocol-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div class="protocol-info">
                <span class="protocol-name">${escapeHtml(protocol.protokollNumber || protocol.id || protocol)}</span>
                <span class="protocol-date">${protocol.datum ? formatDate(protocol.datum) : ''}</span>
                ${protocol.prüfungsergebnis ? `
                  <span class="protocol-result ${protocol.prüfungsergebnis.keineMängelFestgestellt ? 'result-ok' : 'result-fail'}">
                    ${protocol.prüfungsergebnis.keineMängelFestgestellt ? 'Keine Mängel' : 'Mängel festgestellt'}
                  </span>
                ` : ''}
              </div>
              <div class="protocol-actions">
                <button type="button" class="btn-icon" data-action="view-protocol" data-protocol-id="${escapeHtml(protocol.id || protocol)}" title="Anzeigen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ============================================
// EVENT HANDLING
// ============================================

/**
 * Handle click events within detail view
 * @param {Event} e - Click event
 * @returns {void}
 */
function handleDetailClick(e) {
  // Handle tab clicks
  const tabBtn = e.target.closest('.asset-tab-btn');
  if (tabBtn) {
    const tabId = tabBtn.getAttribute('data-tab');
    if (tabId && currentAssetId) {
      switchTab(tabId);
    }
    return;
  }

  // Handle action buttons
  const actionBtn = e.target.closest('[data-asset-action]');
  if (actionBtn) {
    const action = actionBtn.getAttribute('data-asset-action');
    const assetId = actionBtn.getAttribute('data-asset-id');

    switch (action) {
      case 'back-to-list':
        hideAssetDetail();
        break;
      case 'create-protocol':
        if (assetId) {
          handleCreateProtocolFromAsset(assetId);
        }
        break;
      // Note: 'view-detail' and 'edit' actions are handled by asset-handlers.js
    }
  }
}

/**
 * Switch to a different tab
 * @param {string} tabId - Tab identifier
 * @returns {void}
 */
function switchTab(tabId) {
  if (!currentAssetId) return;

  currentTab = tabId;

  // Update tab button states
  const tabBtns = document.querySelectorAll('.asset-tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Re-render tab content
  const asset = state.getAsset(currentAssetId);
  if (asset) {
    renderTabContent(asset, tabId);
  }
}

/**
 * Get the currently displayed asset ID
 * @returns {string|null} Current asset ID or null
 */
export function getCurrentAssetId() {
  return currentAssetId;
}

/**
 * Check if detail view is currently shown
 * @returns {boolean} True if detail view is shown
 */
export function isDetailViewActive() {
  return currentAssetId !== null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get tab icon SVG
 * @param {string} iconName - Icon name
 * @returns {string} SVG HTML string
 */
function getTabIcon(iconName) {
  const icons = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
  };
  return icons[iconName] || icons.info;
}

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
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

console.log('✓ Asset Detail Renderer module loaded');
