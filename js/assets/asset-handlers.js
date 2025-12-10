/**
 * asset-handlers.js
 * 
 * Event handlers for user interactions with the Assets module.
 * Coordinates between DOM events, validation, state management, and UI updates.
 */

import * as state from './asset-state.js';
import { 
  validateAssetForm, 
  processExcelImport, 
  exportAssetsToJson,
  filterAssets 
} from './asset-utils.js';

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

  state.on('importStateChanged', (importState) => {
    document.dispatchEvent(new CustomEvent('asset:importStateChanged', {
      detail: importState
    }));
  });

  state.on('assetsImported', ({ total, successful, failed }) => {
    document.dispatchEvent(new CustomEvent('asset:renderAssets', {
      detail: { action: 'imported', total, successful, failed }
    }));
  });
}

// ============================================
// FILE IMPORT HANDLERS
// ============================================

/**
 * Handle file import from Excel
 * @param {Event} event - File input change event
 * @returns {Promise<void>}
 */
export async function handleFileImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // Set import state to pending
    state.setImportState({
      isImporting: true,
      progress: 10,
      status: 'pending',
      message: 'Datei wird gelesen...',
      errors: [],
      warnings: []
    });

    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'info', message: 'Datei wird importiert...' }
    }));

    // Process the Excel file
    state.setImportState({ progress: 30, message: 'Daten werden verarbeitet...' });
    const result = await processExcelImport(file);

    state.setImportState({ progress: 60, message: 'Daten werden validiert...' });

    // Show validation results
    if (result.errors.length > 0) {
      state.setImportState({
        status: result.valid.length > 0 ? 'pending' : 'error',
        message: `${result.valid.length} gültige, ${result.invalid.length} ungültige Datensätze gefunden`,
        errors: result.errors,
        warnings: result.warnings
      });
    }

    // If there are valid assets, add them to state
    if (result.valid.length > 0) {
      state.setImportState({ progress: 80, message: 'Assets werden gespeichert...' });
      
      const addResult = state.addAssets(result.valid);
      state.save();

      state.setImportState({
        isImporting: false,
        progress: 100,
        status: 'success',
        message: `${addResult.successful.length} Assets erfolgreich importiert`,
        errors: result.errors,
        warnings: result.warnings
      });

      document.dispatchEvent(new CustomEvent('asset:message', {
        detail: { 
          type: 'success', 
          message: `${addResult.successful.length} Assets erfolgreich importiert` 
        }
      }));
    } else {
      state.setImportState({
        isImporting: false,
        progress: 100,
        status: 'error',
        message: 'Keine gültigen Assets gefunden',
        errors: result.errors,
        warnings: result.warnings
      });

      document.dispatchEvent(new CustomEvent('asset:message', {
        detail: { 
          type: 'error', 
          message: 'Import fehlgeschlagen: Keine gültigen Assets gefunden' 
        }
      }));
    }

    // Refresh UI
    document.dispatchEvent(new CustomEvent('asset:renderAssets', {
      detail: { action: 'imported' }
    }));

  } catch (error) {
    console.error('Import error:', error);
    
    state.setImportState({
      isImporting: false,
      progress: 0,
      status: 'error',
      message: `Import fehlgeschlagen: ${error.message}`,
      errors: [error.message],
      warnings: []
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
// ASSET CRUD HANDLERS
// ============================================

/**
 * Handle adding a new asset
 * @param {Object} assetData - Asset data from form
 * @returns {Object|null} Added asset or null if validation failed
 */
export function handleAddAsset(assetData) {
  // Validate
  const validation = validateAssetForm(assetData);

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
 * @returns {Object|null} Updated asset or null
 */
export function handleUpdateAsset(assetId, assetData) {
  // Validate
  const validation = validateAssetForm(assetData);

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

  // Update asset
  const asset = state.updateAsset(assetId, assetData);

  if (asset) {
    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'success', message: 'Asset erfolgreich aktualisiert.' }
    }));

    // Clear editing state
    state.setEditingAsset(null);
  }

  return asset;
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
// FILTER & SEARCH HANDLERS
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

/**
 * Handle clearing all filters
 * @returns {void}
 */
export function handleClearFilters() {
  state.setSearchTerm('');
  state.setFilterStatus('');
  state.setFilterPlant('');
  state.setFilterType('');
  document.dispatchEvent(new CustomEvent('asset:renderAssets', {
    detail: { action: 'filter' }
  }));
}

// ============================================
// EXPORT HANDLER
// ============================================

/**
 * Handle export button click
 * @returns {void}
 */
export function handleExport() {
  try {
    const assets = state.getAssets();
    const filename = `assets-export-${new Date().toISOString().split('T')[0]}.json`;
    exportAssetsToJson(assets, filename);
    
    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'success', message: 'Assets erfolgreich exportiert.' }
    }));
  } catch (error) {
    document.dispatchEvent(new CustomEvent('asset:message', {
      detail: { type: 'error', message: `Export fehlgeschlagen: ${error.message}` }
    }));
  }
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
      handleExport();
      break;

    case 'clear-filters':
      handleClearFilters();
      break;

    case 'save':
      // Form submission is handled by the form submit event
      break;

    default:
      console.warn(`Unknown asset action: ${action}`);
  }
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
    name: formData.get('name')?.trim() || '',
    description: formData.get('description')?.trim() || '',
    type: formData.get('type')?.trim() || 'OTHER',
    status: formData.get('status')?.trim() || 'AKTIV',
    location: formData.get('location')?.trim() || '',
    plant: formData.get('plant')?.trim() || '',
    parentId: formData.get('parentId')?.trim() || null,
    generalLedgerAccount: formData.get('generalLedgerAccount')?.trim() || '',
    vassKey: formData.get('vassKey')?.trim() || null,
    maintenanceWindowStart: formData.get('maintenanceWindowStart') || null,
    maintenanceWindowEnd: formData.get('maintenanceWindowEnd') || null,
    replacementPart: formData.get('replacementPart')?.trim() || null,
    damageClass: formData.get('damageClass')?.trim() || null
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
