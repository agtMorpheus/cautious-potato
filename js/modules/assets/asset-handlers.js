/**
 * asset-handlers.js
 * 
 * Event handlers for user interactions with the Asset module.
 * Coordinates between DOM events, validation, state management, and UI updates.
 */

import * as state from './asset-state.js';
import db from './asset-db.js';
import { readAssetExcel, transformAssets, validateAssets } from './asset-utils.js';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize event handlers
 * @returns {void}
 */
export function init() {
  console.log('Initializing Asset Handlers');

  // Set up event delegation
  setupEventDelegation();

  // Set up state listeners
  setupStateListeners();

  console.log('✓ Asset event handlers initialized');
}

/**
 * Set up event delegation on the document
 * @returns {void}
 */
function setupEventDelegation() {
  // Delegate button click events
  document.addEventListener('click', handleButtonClick);
}

/**
 * Set up listeners for state change events
 * @returns {void}
 */
function setupStateListeners() {
  state.on('assetAdded', ({ asset }) => {
    document.dispatchEvent(new CustomEvent('asset:renderAssets', {
      detail: { action: 'added', asset }
    }));
  });

  state.on('assetUpdated', ({ assetId, asset }) => {
    document.dispatchEvent(new CustomEvent('asset:renderAssets', {
      detail: { action: 'updated', assetId, asset }
    }));
  });

  state.on('assetDeleted', ({ assetId }) => {
    document.dispatchEvent(new CustomEvent('asset:renderAssets', {
      detail: { action: 'deleted', assetId }
    }));
  });

  state.on('editingAssetChanged', ({ assetId }) => {
    document.dispatchEvent(new CustomEvent('asset:editingChanged', {
      detail: { assetId }
    }));
  });

  state.on('validationErrorChanged', ({ fieldName, error }) => {
    document.dispatchEvent(new CustomEvent('asset:validationError', {
      detail: { fieldName, error }
    }));
  });

  state.on('assetsImported', ({ total, successful, failed }) => {
    document.dispatchEvent(new CustomEvent('asset:importComplete', {
      detail: { total, successful, failed }
    }));
  });
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate asset data
 * @param {Object} asset - Asset data to validate
 * @returns {Object} Validation result {isValid, errors}
 */
export function validateAsset(asset) {
  const errors = {};

  // ID is required
  if (!asset.id || asset.id.trim() === '') {
    errors.id = 'Anlage-ID ist erforderlich';
  }

  // Name is required
  if (!asset.name || asset.name.trim() === '') {
    errors.name = 'Name ist erforderlich';
  } else if (asset.name.length > 100) {
    errors.name = 'Name darf maximal 100 Zeichen haben';
  }

  // Status is required and must be valid
  const validStatuses = state.getAssetStatuses();
  if (!asset.status || asset.status.trim() === '') {
    errors.status = 'Status ist erforderlich';
  } else if (!validStatuses.includes(asset.status)) {
    errors.status = `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`;
  }

  // Location validation (optional but if provided, should not be empty)
  if (asset.location && asset.location.trim() === '') {
    errors.location = 'Standort darf nicht leer sein';
  }

  // Plant validation (optional but if provided, should not be empty)
  if (asset.plant && asset.plant.trim() === '') {
    errors.plant = 'Werk darf nicht leer sein';
  }

  // Description length validation
  if (asset.description && asset.description.length > 500) {
    errors.description = 'Beschreibung darf maximal 500 Zeichen haben';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ============================================
// ASSET HANDLERS
// ============================================

/**
 * Handle adding a new asset
 * @param {Object} assetData - Asset data from form
 * @returns {Object|null} Added asset or null if validation failed
 */
export function handleAddAsset(assetData) {
  // Validate
  const validation = validateAsset(assetData);

  if (!validation.isValid) {
    // Set validation errors
    Object.entries(validation.errors).forEach(([field, error]) => {
      state.setValidationError(field, error);
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'error', message: 'Bitte korrigieren Sie die markierten Felder.' }
    }));

    return null;
  }

  // Clear any previous errors
  state.clearValidationErrors();

  // Add asset
  const asset = state.addAsset(assetData);

  if (asset) {
    // Also add to IndexedDB
    db.addAsset(asset).catch(err => {
      console.error('Failed to persist asset to IndexedDB:', err);
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'success', message: 'Asset erfolgreich hinzugefügt.' }
    }));

    // Clear editing state
    state.setEditingAsset(null);
  }

  return asset;
}

/**
 * Handle updating an asset
 * @param {string} assetId - Asset ID
 * @param {Object} assetData - Updated asset data
 * @returns {boolean} Success
 */
export function handleUpdateAsset(assetId, assetData) {
  // Validate
  const validation = validateAsset({ ...assetData, id: assetId });

  if (!validation.isValid) {
    // Set validation errors
    Object.entries(validation.errors).forEach(([field, error]) => {
      state.setValidationError(field, error);
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'error', message: 'Bitte korrigieren Sie die markierten Felder.' }
    }));

    return false;
  }

  // Clear any previous errors
  state.clearValidationErrors();

  // Update asset
  const success = state.updateAsset(assetId, assetData);

  if (success) {
    // Also update in IndexedDB
    db.updateAsset(assetId, assetData).catch(err => {
      console.error('Failed to update asset in IndexedDB:', err);
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'success', message: 'Asset erfolgreich aktualisiert.' }
    }));

    // Clear editing state
    state.setEditingAsset(null);
  }

  return success;
}

/**
 * Handle deleting an asset
 * @param {string} assetId - Asset ID
 * @param {boolean} skipConfirm - Skip confirmation dialog
 * @returns {boolean} Success
 */
export function handleDeleteAsset(assetId, skipConfirm = false) {
  if (!skipConfirm) {
    const asset = state.getAsset(assetId);
    const assetName = asset?.name || assetId;
    const confirmed = confirm(`Möchten Sie das Asset "${assetName}" wirklich löschen?`);
    if (!confirmed) {
      return false;
    }
  }

  const success = state.deleteAsset(assetId);

  if (success) {
    // Also delete from IndexedDB
    db.deleteAsset(assetId).catch(err => {
      console.error('Failed to delete asset from IndexedDB:', err);
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'success', message: 'Asset erfolgreich gelöscht.' }
    }));
  }

  return success;
}

/**
 * Handle starting to edit an asset
 * @param {string} assetId - Asset ID
 * @returns {void}
 */
export function handleEditAsset(assetId) {
  state.setEditingAsset(assetId);
}

/**
 * Handle canceling edit
 * @returns {void}
 */
export function handleCancelEdit() {
  state.setEditingAsset(null);
  state.clearValidationErrors();
}

// ============================================
// FILE IMPORT HANDLERS
// ============================================

/**
 * Handle Excel file import
 * @param {Event} event - File input change event
 * @returns {Promise<void>}
 */
export async function handleFileImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // Update import state
    state.setImportState({
      isImporting: true,
      progress: 0,
      errors: [],
      warnings: []
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'info', message: 'Importiere Assets...' }
    }));

    // Read Excel file
    state.setImportState({ progress: 20 });
    const rawData = await readAssetExcel(file);

    // Transform to standardized format
    state.setImportState({ progress: 40 });
    const transformed = transformAssets(rawData);

    // Validate each asset
    state.setImportState({ progress: 60 });
    const { valid, invalid } = validateAssets(transformed);

    // Add valid assets to state
    state.setImportState({ progress: 80 });
    const result = state.addAssets(valid);
    state.forceSave();

    // Also add to IndexedDB
    if (valid.length > 0) {
      try {
        await db.addAssets(valid);
      } catch (err) {
        console.error('Failed to persist assets to IndexedDB:', err);
      }
    }

    // Complete import
    state.setImportState({
      isImporting: false,
      progress: 100,
      lastImportAt: new Date().toISOString(),
      lastImportCount: valid.length,
      errors: invalid.map(i => `Zeile ${i.row}: ${i.error}`),
      warnings: []
    });

    // Show results
    document.dispatchEvent(new CustomEvent('asset:importResults', {
      detail: {
        total: rawData.length,
        successful: valid.length,
        failed: invalid.length,
        errors: invalid
      }
    }));

    // Update UI
    document.dispatchEvent(new CustomEvent('asset:renderAssets', {
      detail: { action: 'import' }
    }));

    // Show success message
    const message = invalid.length > 0
      ? `Import abgeschlossen: ${valid.length} von ${rawData.length} Assets importiert. ${invalid.length} Fehler.`
      : `Import erfolgreich: ${valid.length} Assets importiert.`;

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { 
        type: invalid.length > 0 ? 'warning' : 'success', 
        message 
      }
    }));

  } catch (error) {
    console.error('Import failed:', error);
    
    state.setImportState({
      isImporting: false,
      progress: 0,
      errors: [error.message]
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'error', message: `Import fehlgeschlagen: ${error.message}` }
    }));
  } finally {
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  }
}

// ============================================
// SEARCH AND FILTER HANDLERS
// ============================================

/**
 * Handle search input change
 * @param {string} term - Search term
 * @returns {void}
 */
export function handleSearchChange(term) {
  state.setSearchTerm(term);
  document.dispatchEvent(new CustomEvent('asset:renderAssets', {
    detail: { action: 'filter' }
  }));
}

/**
 * Handle status filter change
 * @param {string} status - Status to filter
 * @returns {void}
 */
export function handleStatusFilterChange(status) {
  state.setFilterStatus(status);
  document.dispatchEvent(new CustomEvent('asset:renderAssets', {
    detail: { action: 'filter' }
  }));
}

/**
 * Handle plant filter change
 * @param {string} plant - Plant to filter
 * @returns {void}
 */
export function handlePlantFilterChange(plant) {
  state.setFilterPlant(plant);
  document.dispatchEvent(new CustomEvent('asset:renderAssets', {
    detail: { action: 'filter' }
  }));
}

/**
 * Handle type filter change
 * @param {string} type - Type to filter
 * @returns {void}
 */
export function handleTypeFilterChange(type) {
  state.setFilterType(type);
  document.dispatchEvent(new CustomEvent('asset:renderAssets', {
    detail: { action: 'filter' }
  }));
}

// ============================================
// EXPORT HANDLERS
// ============================================

/**
 * Handle JSON export
 * @returns {void}
 */
export function handleExportJson() {
  const data = state.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `assets-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  document.dispatchEvent(new CustomEvent('asset:message', {
    detail: { type: 'success', message: 'Assets erfolgreich exportiert.' }
  }));
}

// ============================================
// BUTTON CLICK HANDLER
// ============================================

/**
 * Handle button click events via delegation
 * @param {Event} e - Click event
 * @returns {void}
 */
function handleButtonClick(e) {
  const button = e.target.closest('[data-asset-action]');
  if (!button) return;

  const action = button.getAttribute('data-asset-action');
  const assetId = button.getAttribute('data-asset-id');

  switch (action) {
    case 'add':
      // Open add form
      state.setEditingAsset(null);
      document.dispatchEvent(new CustomEvent('asset:showForm', {
        detail: { mode: 'add' }
      }));
      break;

    case 'edit':
      if (assetId) {
        handleEditAsset(assetId);
        document.dispatchEvent(new CustomEvent('asset:showForm', {
          detail: { mode: 'edit', assetId }
        }));
      }
      break;

    case 'delete':
      if (assetId) {
        handleDeleteAsset(assetId);
      }
      break;

    case 'cancel':
      handleCancelEdit();
      document.dispatchEvent(new CustomEvent('asset:hideForm', {}));
      break;

    case 'export':
      handleExportJson();
      break;

    case 'save':
      // Form submission is handled by the form submit event
      break;

    case 'view-detail':
      // Prevent default link behavior if it's a link
      e.preventDefault();
      if (assetId) {
        handleViewAssetDetail(assetId);
      }
      break;

    case 'create-protocol':
      if (assetId) {
        handleCreateProtocolFromAsset(assetId);
      }
      break;

    case 'back-to-list':
      handleBackToList();
      break;

    default:
      console.warn(`Unknown asset action: ${action}`);
  }
}

// ============================================
// DETAIL VIEW HANDLERS
// ============================================

/**
 * Handle navigating to asset detail view
 * @param {string} assetId - Asset ID
 * @returns {void}
 */
export function handleViewAssetDetail(assetId) {
  document.dispatchEvent(new CustomEvent('asset:showDetail', {
    detail: { assetId }
  }));
}

/**
 * Handle going back to asset list from detail view
 * @returns {void}
 */
export function handleBackToList() {
  document.dispatchEvent(new CustomEvent('asset:hideDetail', {}));
}

/**
 * Handle creating a new protocol from an asset
 * @param {string} assetId - Asset ID
 * @returns {void}
 */
export function handleCreateProtocolFromAsset(assetId) {
  const asset = state.getAsset(assetId);
  if (!asset) {
    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'error', message: 'Asset nicht gefunden.' }
    }));
    return;
  }

  // Prepare asset data for protokoll
  const assetData = {
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    location: asset.location,
    plant: asset.plant,
    description: asset.description,
    parentId: asset.parentId
  };

  // Dispatch event to create protokoll from asset
  document.dispatchEvent(new CustomEvent('asset:createProtocol', {
    detail: { assetData }
  }));

  document.dispatchEvent(new CustomEvent('asset:message', {
    detail: { type: 'info', message: 'Protokoll wird erstellt...' }
  }));
}

/**
 * Handle form submission
 * @param {Event} e - Submit event
 * @param {HTMLFormElement} form - Form element
 * @returns {void}
 */
export function handleFormSubmit(e, form) {
  e.preventDefault();

  const formData = new FormData(form);
  const assetData = {
    id: formData.get('id')?.trim() || '',
    name: formData.get('name')?.trim() || '',
    description: formData.get('description')?.trim() || '',
    type: formData.get('type')?.trim() || 'OTHER',
    status: formData.get('status')?.trim() || 'AKTIV',
    location: formData.get('location')?.trim() || '',
    plant: formData.get('plant')?.trim() || '',
    parentId: formData.get('parentId')?.trim() || null
  };

  const formState = state.getFormState();

  if (formState.editingAssetId) {
    // Update existing asset
    handleUpdateAsset(formState.editingAssetId, assetData);
  } else {
    // Add new asset
    handleAddAsset(assetData);
  }
}

console.log('✓ Asset Handlers module loaded');
