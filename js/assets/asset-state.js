/**
 * asset-state.js
 * 
 * Centralized state management for the Assets module.
 * The Assets Manager serves as the source of truth for all asset-related data.
 * Manages assets and their related components: circuits, contracts, documents, pictures, protocols.
 * Persists state to localStorage and provides event-driven updates.
 * 
 * Export Pattern: ES6 Modules (export function)
 * State Access: Functions only (encapsulation)
 * Event System: Custom events via EventTarget
 * Persistence: localStorage with automatic debouncing
 */

// ============================================
// PRIVATE STATE (Not exported, encapsulated)
// ============================================

let state = {};
let stateListeners = {};
let saveTimer = null;
const SAVE_DELAY = 1000; // 1 second debounce
const STORAGE_KEY = 'asset_state';

// Asset status types
const ASSET_STATUSES = [
  'IN BETRIEB',
  'AKTIV',
  'INAKTIV',
  'STILLGELEGT'
];

// Asset types for distribution board equipment
const ASSET_TYPES = [
  'LVUM',
  'UV',
  'KV',
  'LV',
  'OTHER'
];

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize state from localStorage or defaults
 * Called once when app starts
 * @returns {void}
 */
export function init() {
  console.log('Initializing Asset State Management');
  
  // Try to load from localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (saved) {
    try {
      state = JSON.parse(saved);
      console.log('✓ Loaded Asset state from localStorage');
    } catch (error) {
      console.error('Failed to parse localStorage state:', error);
      initializeDefaults();
    }
  } else {
    initializeDefaults();
  }
  
  // Validate loaded state
  validateStateIntegrity();
  
  console.log('✓ Asset state initialized:', state);
}

/**
 * Set up default state structure
 * @returns {void}
 */
function initializeDefaults() {
  state = {
    assets: [],
    circuits: [],
    contracts: [],
    documents: [],
    pictures: [],
    protocols: [],
    formState: {
      editingAssetId: null,
      unsavedChanges: false,
      validationErrors: {},
      searchTerm: '',
      filterStatus: '',
      filterPlant: '',
      filterType: ''
    },
    importState: {
      isImporting: false,
      progress: 0,
      status: 'idle', // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      errors: [],
      warnings: []
    }
  };

  console.log('✓ Initialized default Asset state');
}

/**
 * Validate state structure after loading
 * @returns {void}
 */
function validateStateIntegrity() {
  // Check required top-level keys
  if (!state.assets) {
    console.warn('Missing assets array, reinitializing');
    state.assets = [];
  }

  if (!state.circuits) state.circuits = [];
  if (!state.contracts) state.contracts = [];
  if (!state.documents) state.documents = [];
  if (!state.pictures) state.pictures = [];
  if (!state.protocols) state.protocols = [];

  if (!state.formState) {
    state.formState = {
      editingAssetId: null,
      unsavedChanges: false,
      validationErrors: {},
      searchTerm: '',
      filterStatus: '',
      filterPlant: '',
      filterType: ''
    };
  }

  if (!state.importState) {
    state.importState = {
      isImporting: false,
      progress: 0,
      status: 'idle',
      message: '',
      errors: [],
      warnings: []
    };
  }

  // Validate assets array
  if (!Array.isArray(state.assets)) {
    console.warn('Assets not array, converting');
    state.assets = [];
  }

  console.log('✓ Asset state integrity validated');
}

// ============================================
// GETTERS (Read-only access)
// ============================================

/**
 * Get entire state (immutable copy)
 * @returns {Object} Deep copy of state
 */
export function getState() {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Get all assets
 * @returns {Array} Array of asset objects
 */
export function getAssets() {
  return JSON.parse(JSON.stringify(state.assets.filter(a => a.active !== false)));
}

/**
 * Get all assets including inactive
 * @returns {Array} Array of all asset objects
 */
export function getAllAssets() {
  return JSON.parse(JSON.stringify(state.assets));
}

/**
 * Get asset by ID
 * @param {string} assetId - Asset ID
 * @returns {Object|null} Asset object or null
 */
export function getAsset(assetId) {
  const asset = state.assets.find(a => a.id === assetId);
  return asset ? JSON.parse(JSON.stringify(asset)) : null;
}

/**
 * Get assets by status
 * @param {string} status - Asset status
 * @returns {Array} Array of asset objects
 */
export function getAssetsByStatus(status) {
  return JSON.parse(JSON.stringify(
    state.assets.filter(a => a.status === status && a.active !== false)
  ));
}

/**
 * Get assets by plant
 * @param {string} plant - Plant identifier
 * @returns {Array} Array of asset objects
 */
export function getAssetsByPlant(plant) {
  return JSON.parse(JSON.stringify(
    state.assets.filter(a => a.plant === plant && a.active !== false)
  ));
}

/**
 * Get assets by location
 * @param {string} location - Location code
 * @returns {Array} Array of asset objects
 */
export function getAssetsByLocation(location) {
  return JSON.parse(JSON.stringify(
    state.assets.filter(a => a.location === location && a.active !== false)
  ));
}

/**
 * Get assets by type
 * @param {string} type - Asset type
 * @returns {Array} Array of asset objects
 */
export function getAssetsByType(type) {
  return JSON.parse(JSON.stringify(
    state.assets.filter(a => a.type === type && a.active !== false)
  ));
}

/**
 * Search assets by query
 * @param {string} query - Search query
 * @returns {Array} Array of matching asset objects
 */
export function searchAssets(query) {
  const q = query.toLowerCase();
  return JSON.parse(JSON.stringify(
    state.assets.filter(asset =>
      asset.active !== false && (
        asset.id?.toLowerCase().includes(q) ||
        asset.name?.toLowerCase().includes(q) ||
        asset.description?.toLowerCase().includes(q) ||
        asset.location?.toLowerCase().includes(q) ||
        asset.plant?.toLowerCase().includes(q)
      )
    )
  ));
}

/**
 * Get assets formatted for dropdown selection
 * @returns {Array} Array of {id, label} objects for dropdowns
 */
export function getAssetsForDropdown() {
  return state.assets
    .filter(a => a.active !== false)
    .map(a => ({
      id: a.id,
      label: `${a.name} (${a.id})`,
      name: a.name,
      type: a.type,
      location: a.location,
      plant: a.plant,
      status: a.status
    }));
}

/**
 * Get form state
 * @returns {Object} Form state object
 */
export function getFormState() {
  return JSON.parse(JSON.stringify(state.formState));
}

/**
 * Get import state
 * @returns {Object} Import state object
 */
export function getImportState() {
  return JSON.parse(JSON.stringify(state.importState));
}

/**
 * Get validation errors
 * @returns {Object} Validation errors by field
 */
export function getValidationErrors() {
  return JSON.parse(JSON.stringify(state.formState.validationErrors));
}

/**
 * Check if there are unsaved changes
 * @returns {boolean} Has unsaved changes
 */
export function hasUnsavedChanges() {
  return state.formState.unsavedChanges;
}

/**
 * Get available asset statuses
 * @returns {Array} Array of status strings
 */
export function getAssetStatuses() {
  return [...ASSET_STATUSES];
}

/**
 * Get available asset types
 * @returns {Array} Array of type strings
 */
export function getAssetTypes() {
  return [...ASSET_TYPES];
}

/**
 * Get asset count
 * @returns {number} Number of active assets
 */
export function getAssetCount() {
  return state.assets.filter(a => a.active !== false).length;
}

/**
 * Get statistics about assets
 * @returns {Object} Statistics object with total, byStatus, byPlant, byType
 */
export function getStatistics() {
  const assets = state.assets.filter(a => a.active !== false);
  return {
    total: assets.length,
    byStatus: assets.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {}),
    byPlant: assets.reduce((acc, a) => {
      acc[a.plant] = (acc[a.plant] || 0) + 1;
      return acc;
    }, {}),
    byType: assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {}),
    hierarchical: assets.filter(a => a.parentId).length
  };
}

/**
 * Get hierarchy tree of assets
 * @returns {Array} Tree structure of assets with children
 */
export function getHierarchyTree() {
  const assets = state.assets.filter(a => a.active !== false);
  const roots = assets.filter(a => !a.parentId);
  
  const buildChildren = (parentId) => {
    const children = assets.filter(a => a.parentId === parentId);
    return children.map(child => ({
      ...child,
      children: buildChildren(child.id)
    }));
  };
  
  return roots.map(root => ({
    ...root,
    children: buildChildren(root.id)
  }));
}

// ============================================
// ASSET CRUD OPERATIONS
// ============================================

/**
 * Add a new asset
 * @param {Object} asset - Asset object with required fields
 * @returns {Object} Added asset with generated fields
 */
export function addAsset(asset) {
  if (!asset || typeof asset !== 'object') {
    console.error('Invalid asset:', asset);
    return null;
  }

  // Use provided ID or generate one
  const newAsset = {
    id: asset.id || generateAssetId(),
    name: asset.name || '',
    description: asset.description || '',
    type: asset.type || 'OTHER',
    status: asset.status || 'AKTIV',
    location: asset.location || '',
    parentId: asset.parentId || null,
    replacementPart: asset.replacementPart || null,
    damageClass: asset.damageClass || null,
    maintenanceWindowStart: asset.maintenanceWindowStart || null,
    maintenanceWindowEnd: asset.maintenanceWindowEnd || null,
    generalLedgerAccount: asset.generalLedgerAccount || '',
    plant: asset.plant || '',
    vassKey: asset.vassKey || null,
    circuits: asset.circuits || [],
    contracts: asset.contracts || [],
    documents: asset.documents || [],
    pictures: asset.pictures || [],
    protocols: asset.protocols || [],
    active: true,
    importedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  state.assets.push(newAsset);
  markUnsaved();
  emit('assetAdded', { asset: JSON.parse(JSON.stringify(newAsset)) });
  saveToLocalStorage();

  return JSON.parse(JSON.stringify(newAsset));
}

/**
 * Add multiple assets (batch operation)
 * @param {Array} assets - Array of asset objects
 * @returns {Object} Result with successful and failed imports
 */
export function addAssets(assets) {
  const results = {
    successful: [],
    failed: [],
    total: assets.length
  };

  for (const asset of assets) {
    try {
      const added = addAsset(asset);
      if (added) {
        results.successful.push(added);
      } else {
        results.failed.push({ asset, error: 'Failed to add asset' });
      }
    } catch (error) {
      console.error(`Failed to add asset ${asset.id}:`, error);
      results.failed.push({ asset, error: error.message });
    }
  }

  emit('assetsImported', { 
    total: assets.length, 
    successful: results.successful.length,
    failed: results.failed.length 
  });

  return results;
}

/**
 * Update an existing asset
 * @param {string} assetId - Asset ID
 * @param {Object} updates - Updated fields
 * @returns {Object|null} Updated asset or null
 */
export function updateAsset(assetId, updates) {
  const index = state.assets.findIndex(a => a.id === assetId);

  if (index === -1) {
    console.error(`Asset not found: ${assetId}`);
    return null;
  }

  // Merge updates
  state.assets[index] = {
    ...state.assets[index],
    ...updates,
    lastUpdated: new Date().toISOString()
  };

  markUnsaved();
  emit('assetUpdated', { assetId, asset: getAsset(assetId) });
  saveToLocalStorage();

  return getAsset(assetId);
}

/**
 * Delete (soft-delete) an asset
 * @param {string} assetId - Asset ID
 * @returns {boolean} Success
 */
export function deleteAsset(assetId) {
  const index = state.assets.findIndex(a => a.id === assetId);

  if (index === -1) {
    console.error(`Asset not found: ${assetId}`);
    return false;
  }

  // Soft delete
  state.assets[index].active = false;
  state.assets[index].lastUpdated = new Date().toISOString();
  
  markUnsaved();
  emit('assetDeleted', { assetId });
  saveToLocalStorage();

  return true;
}

/**
 * Permanently remove an asset
 * @param {string} assetId - Asset ID
 * @returns {boolean} Success
 */
export function removeAsset(assetId) {
  const index = state.assets.findIndex(a => a.id === assetId);

  if (index === -1) {
    console.error(`Asset not found: ${assetId}`);
    return false;
  }

  state.assets.splice(index, 1);
  markUnsaved();
  emit('assetRemoved', { assetId });
  saveToLocalStorage();

  return true;
}

// ============================================
// CIRCUIT MANAGEMENT
// ============================================

/**
 * Add a circuit to an asset
 * @param {string} assetId - Parent asset ID
 * @param {Object} circuit - Circuit object
 * @returns {string|null} Circuit ID or null
 */
export function addCircuit(assetId, circuit) {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset) {
    console.error(`Asset not found: ${assetId}`);
    return null;
  }

  const newCircuit = {
    id: circuit.id || generateCircuitId(),
    assetId,
    circuitNumber: circuit.circuitNumber || '',
    description: circuit.description || '',
    type: circuit.type || 'POWER',
    ratedCurrent: circuit.ratedCurrent || null,
    protectionDevice: circuit.protectionDevice || '',
    cableType: circuit.cableType || '',
    length: circuit.length || null,
    installationDate: circuit.installationDate || null,
    lastInspectionDate: circuit.lastInspectionDate || null,
    status: circuit.status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  state.circuits.push(newCircuit);
  
  // Add reference to asset
  if (!asset.circuits) asset.circuits = [];
  asset.circuits.push(newCircuit.id);

  markUnsaved();
  emit('circuitAdded', { circuit: newCircuit, assetId });
  saveToLocalStorage();

  return newCircuit.id;
}

/**
 * Get circuits by asset
 * @param {string} assetId - Asset ID
 * @returns {Array} Array of circuit objects
 */
export function getCircuitsByAsset(assetId) {
  return JSON.parse(JSON.stringify(
    state.circuits.filter(c => c.assetId === assetId)
  ));
}

/**
 * Update a circuit
 * @param {string} circuitId - Circuit ID
 * @param {Object} updates - Updated fields
 * @returns {boolean} Success
 */
export function updateCircuit(circuitId, updates) {
  const index = state.circuits.findIndex(c => c.id === circuitId);
  if (index === -1) return false;

  state.circuits[index] = {
    ...state.circuits[index],
    ...updates,
    lastUpdated: new Date().toISOString()
  };

  markUnsaved();
  emit('circuitUpdated', { circuitId });
  saveToLocalStorage();

  return true;
}

/**
 * Delete a circuit
 * @param {string} circuitId - Circuit ID
 * @returns {boolean} Success
 */
export function deleteCircuit(circuitId) {
  const circuit = state.circuits.find(c => c.id === circuitId);
  if (!circuit) return false;

  // Remove from asset's circuit array
  const asset = state.assets.find(a => a.id === circuit.assetId);
  if (asset && asset.circuits) {
    asset.circuits = asset.circuits.filter(id => id !== circuitId);
  }

  // Remove circuit
  state.circuits = state.circuits.filter(c => c.id !== circuitId);

  markUnsaved();
  emit('circuitDeleted', { circuitId });
  saveToLocalStorage();

  return true;
}

// ============================================
// FORM STATE MANAGEMENT
// ============================================

/**
 * Set the asset being edited
 * @param {string|null} assetId - Asset ID or null to clear
 * @returns {void}
 */
export function setEditingAsset(assetId) {
  state.formState.editingAssetId = assetId;
  emit('editingAssetChanged', { assetId });
}

/**
 * Set search term for filtering
 * @param {string} term - Search term
 * @returns {void}
 */
export function setSearchTerm(term) {
  state.formState.searchTerm = term;
  emit('searchTermChanged', { term });
}

/**
 * Set filter by status
 * @param {string} status - Status to filter by
 * @returns {void}
 */
export function setFilterStatus(status) {
  state.formState.filterStatus = status;
  emit('filterStatusChanged', { status });
}

/**
 * Set filter by plant
 * @param {string} plant - Plant to filter by
 * @returns {void}
 */
export function setFilterPlant(plant) {
  state.formState.filterPlant = plant;
  emit('filterPlantChanged', { plant });
}

/**
 * Set filter by type
 * @param {string} type - Type to filter by
 * @returns {void}
 */
export function setFilterType(type) {
  state.formState.filterType = type;
  emit('filterTypeChanged', { type });
}

/**
 * Set validation error for a field
 * @param {string} fieldName - Field name
 * @param {string|null} error - Error message or null to clear
 * @returns {void}
 */
export function setValidationError(fieldName, error) {
  if (error) {
    state.formState.validationErrors[fieldName] = error;
  } else {
    delete state.formState.validationErrors[fieldName];
  }

  emit('validationErrorChanged', { fieldName, error });
}

/**
 * Clear all validation errors
 * @returns {void}
 */
export function clearValidationErrors() {
  state.formState.validationErrors = {};
  emit('validationErrorsCleared', {});
}

// ============================================
// IMPORT STATE MANAGEMENT
// ============================================

/**
 * Set import state
 * @param {Object} importState - Import state updates
 * @returns {void}
 */
export function setImportState(importState) {
  state.importState = {
    ...state.importState,
    ...importState
  };
  emit('importStateChanged', state.importState);
}

/**
 * Reset import state
 * @returns {void}
 */
export function resetImportState() {
  state.importState = {
    isImporting: false,
    progress: 0,
    status: 'idle',
    message: '',
    errors: [],
    warnings: []
  };
  emit('importStateChanged', state.importState);
}

// ============================================
// STATE MANAGEMENT HELPERS
// ============================================

/**
 * Mark state as having unsaved changes
 * @returns {void}
 */
export function markUnsaved() {
  state.formState.unsavedChanges = true;
}

/**
 * Clear unsaved changes flag
 * @returns {void}
 */
export function clearUnsaved() {
  state.formState.unsavedChanges = false;
}

/**
 * Reset entire state to defaults
 * @returns {void}
 */
export function reset() {
  initializeDefaults();
  clearLocalStorage();
  emit('stateReset', {});
}

/**
 * Export state as JSON
 * @returns {Object} Exportable state object
 */
export function exportState() {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    assets: state.assets.filter(a => a.active !== false),
    circuits: state.circuits,
    contracts: state.contracts,
    documents: state.documents,
    pictures: state.pictures,
    protocols: state.protocols
  };
}

/**
 * Import state from JSON
 * @param {Object} data - Imported data
 * @param {boolean} replace - Replace existing data or merge
 * @returns {Object} Import result
 */
export function importState(data, replace = false) {
  try {
    if (replace) {
      state.assets = data.assets || [];
      state.circuits = data.circuits || [];
      state.contracts = data.contracts || [];
      state.documents = data.documents || [];
      state.pictures = data.pictures || [];
      state.protocols = data.protocols || [];
    } else {
      // Merge - avoid duplicates by ID
      const existingIds = new Set(state.assets.map(a => a.id));
      const newAssets = (data.assets || []).filter(a => !existingIds.has(a.id));
      state.assets = [...state.assets, ...newAssets];
      
      // Similar merge for other collections
      const existingCircuitIds = new Set(state.circuits.map(c => c.id));
      const newCircuits = (data.circuits || []).filter(c => !existingCircuitIds.has(c.id));
      state.circuits = [...state.circuits, ...newCircuits];
    }

    markUnsaved();
    saveToLocalStorage();
    emit('stateImported', { assetCount: state.assets.length });

    return { success: true, imported: data.assets?.length || 0 };
  } catch (error) {
    console.error('Failed to import state:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// PERSISTENCE (localStorage)
// ============================================

/**
 * Save state to localStorage with debouncing
 * @returns {void}
 */
export function saveToLocalStorage() {
  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // Debounce: wait before saving
  saveTimer = setTimeout(() => {
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, json);
      
      emit('stateSaved', { timestamp: new Date().toISOString() });
      console.log('✓ Asset state saved to localStorage');
    } catch (error) {
      console.error('Failed to save Asset state:', error);
    }
  }, SAVE_DELAY);
}

/**
 * Force immediate save (bypasses debounce)
 * @returns {void}
 */
export function forceSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
    emit('stateSaved', { timestamp: new Date().toISOString(), forced: true });
    console.log('✓ Asset state force-saved to localStorage');
  } catch (error) {
    console.error('Failed to force save Asset state:', error);
  }
}

/**
 * Clear localStorage
 * @returns {void}
 */
export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit('storageCleared', {});
    console.log('✓ Asset localStorage cleared');
  } catch (error) {
    console.error('Failed to clear Asset localStorage:', error);
  }
}

// ============================================
// EVENT SYSTEM (pub/sub pattern)
// ============================================

/**
 * Subscribe to state change events
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function on(eventName, callback) {
  if (!stateListeners[eventName]) {
    stateListeners[eventName] = [];
  }

  stateListeners[eventName].push(callback);

  // Return unsubscribe function
  return () => off(eventName, callback);
}

/**
 * Unsubscribe from state change events
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 * @returns {void}
 */
export function off(eventName, callback) {
  if (!stateListeners[eventName]) return;

  const index = stateListeners[eventName].indexOf(callback);
  if (index > -1) {
    stateListeners[eventName].splice(index, 1);
  }
}

/**
 * Emit state change event
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @returns {void}
 */
export function emit(eventName, data = {}) {
  // Call registered listeners
  if (stateListeners[eventName]) {
    stateListeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  // Also dispatch browser event for cross-module communication
  try {
    document.dispatchEvent(new CustomEvent(`asset:${eventName}`, {
      detail: data,
      bubbles: true,
      cancelable: false
    }));
  } catch (error) {
    console.warn('Failed to dispatch custom event:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate unique asset ID
 * @returns {string} Asset ID
 */
function generateAssetId() {
  return `A-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique circuit ID
 * @returns {string} Circuit ID
 */
function generateCircuitId() {
  return `C-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// MODULE EXPORT (end of file)
// ============================================

console.log('✓ Asset State module loaded');
