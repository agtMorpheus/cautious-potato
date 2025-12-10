/**
 * asset-state.js
 * 
 * Centralized state management for the Assets module.
 * Manages distribution board asset data: name, type, status, location, plant.
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
const STORAGE_KEY = 'asset_management_state';

// Asset status options
const ASSET_STATUSES = [
  'IN BETRIEB',
  'AKTIV',
  'INAKTIV',
  'STILLGELEGT'
];

// Asset types for distribution boards
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
    // Component collections (managed by Assets Manager)
    circuits: [],
    contracts: [],
    documents: [],
    pictures: [],
    protocols: [],
    // Form and UI state
    formState: {
      editingAssetId: null,
      unsavedChanges: false,
      validationErrors: {},
      searchTerm: '',
      filterStatus: '',
      filterPlant: '',
      filterType: ''
    },
    // Import state
    importState: {
      isImporting: false,
      progress: 0,
      lastImportAt: null,
      lastImportCount: 0,
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

  if (!state.circuits) {
    state.circuits = [];
  }

  if (!state.contracts) {
    state.contracts = [];
  }

  if (!state.documents) {
    state.documents = [];
  }

  if (!state.pictures) {
    state.pictures = [];
  }

  if (!state.protocols) {
    state.protocols = [];
  }

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
      lastImportAt: null,
      lastImportCount: 0,
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
export function getAllAssets() {
  return JSON.parse(JSON.stringify(state.assets.filter(a => a.active !== false)));
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
 * @param {string} type - Asset type (LVUM, UV, KV, LV, OTHER)
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
  if (!query || query.trim() === '') {
    return getAllAssets();
  }
  
  const q = query.toLowerCase().trim();
  return JSON.parse(JSON.stringify(
    state.assets.filter(a => 
      a.active !== false && (
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.location && a.location.toLowerCase().includes(q)) ||
        (a.plant && a.plant.toLowerCase().includes(q))
      )
    )
  ));
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
 * @returns {Object} Statistics object
 */
export function getStatistics() {
  const assets = state.assets.filter(a => a.active !== false);
  
  const byStatus = {};
  const byPlant = {};
  const byType = {};
  
  assets.forEach(asset => {
    // By status
    byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
    // By plant
    if (asset.plant) {
      byPlant[asset.plant] = (byPlant[asset.plant] || 0) + 1;
    }
    // By type
    if (asset.type) {
      byType[asset.type] = (byType[asset.type] || 0) + 1;
    }
  });
  
  return {
    total: assets.length,
    byStatus,
    byPlant,
    byType,
    hierarchical: assets.filter(a => a.parentId).length
  };
}

/**
 * Get hierarchy tree of assets
 * @returns {Array} Array of root assets with children nested
 */
export function getHierarchyTree() {
  const assets = getAllAssets();
  const assetMap = new Map();
  const roots = [];
  
  // First pass: create map
  assets.forEach(asset => {
    assetMap.set(asset.id, { ...asset, children: [] });
  });
  
  // Second pass: build tree
  assets.forEach(asset => {
    const node = assetMap.get(asset.id);
    if (asset.parentId && assetMap.has(asset.parentId)) {
      assetMap.get(asset.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
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
 * Get unique plants from existing assets
 * @returns {Array} Array of unique plant identifiers
 */
export function getUniquePlants() {
  const plants = new Set();
  state.assets.forEach(asset => {
    if (asset.plant && asset.active !== false) {
      plants.add(asset.plant);
    }
  });
  return Array.from(plants).sort();
}

// ============================================
// SETTERS (Modifying state)
// ============================================

/**
 * Add a new asset
 * @param {Object} asset - Asset object
 * @returns {Object} Added asset with generated ID and timestamps
 */
export function addAsset(asset) {
  if (!asset || typeof asset !== 'object') {
    console.error('Invalid asset:', asset);
    return null;
  }

  // Generate unique ID if not provided
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
    // Related component references
    circuits: asset.circuits || [],
    contracts: asset.contracts || [],
    documents: asset.documents || [],
    pictures: asset.pictures || [],
    protocols: asset.protocols || [],
    // Metadata
    importedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    active: true
  };

  state.assets.push(newAsset);
  markUnsaved();
  emit('assetAdded', { asset: newAsset });
  saveToLocalStorage();

  return JSON.parse(JSON.stringify(newAsset));
}

/**
 * Add multiple assets (batch import)
 * @param {Array} assets - Array of asset objects
 * @returns {Object} Result with successful and failed imports
 */
export function addAssets(assets) {
  if (!Array.isArray(assets)) {
    return { successful: [], failed: [{ error: 'Input must be an array' }] };
  }

  const successful = [];
  const failed = [];

  assets.forEach((asset, index) => {
    try {
      const added = addAsset(asset);
      if (added) {
        successful.push(added);
      } else {
        failed.push({ index, asset, error: 'Failed to add asset' });
      }
    } catch (error) {
      failed.push({ index, asset, error: error.message });
    }
  });

  emit('assetsImported', { 
    total: assets.length, 
    successful: successful.length, 
    failed: failed.length 
  });

  return { successful, failed };
}

/**
 * Update an existing asset
 * @param {string} assetId - Asset ID
 * @param {Object} updates - Updated fields
 * @returns {boolean} Success
 */
export function updateAsset(assetId, updates) {
  const index = state.assets.findIndex(a => a.id === assetId);

  if (index === -1) {
    console.error(`Asset not found: ${assetId}`);
    return false;
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

  return true;
}

/**
 * Delete an asset (soft delete)
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

/**
 * Update import state
 * @param {Object} updates - Import state updates
 * @returns {void}
 */
export function setImportState(updates) {
  state.importState = {
    ...state.importState,
    ...updates
  };
  emit('importStateChanged', { importState: getImportState() });
}

// ============================================
// COMPONENT MANAGEMENT (Circuits, Contracts, etc.)
// ============================================

/**
 * Add a circuit to an asset
 * @param {string} assetId - Asset ID
 * @param {Object} circuit - Circuit data
 * @returns {string|null} Circuit ID
 */
export function addCircuit(assetId, circuit) {
  const asset = state.assets.find(a => a.id === assetId);
  if (!asset) {
    console.error(`Asset not found: ${assetId}`);
    return null;
  }

  const newCircuit = {
    id: generateComponentId('C'),
    assetId,
    ...circuit,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  state.circuits.push(newCircuit);
  
  // Update asset reference
  if (!asset.circuits) asset.circuits = [];
  asset.circuits.push(newCircuit.id);
  
  markUnsaved();
  emit('circuitAdded', { circuit: newCircuit, assetId });
  saveToLocalStorage();

  return newCircuit.id;
}

/**
 * Get circuits by asset ID
 * @param {string} assetId - Asset ID
 * @returns {Array} Array of circuit objects
 */
export function getCircuitsByAsset(assetId) {
  return JSON.parse(JSON.stringify(
    state.circuits.filter(c => c.assetId === assetId)
  ));
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
 * @returns {Object} Export data
 */
export function exportData() {
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
 * @param {Object} data - Import data
 * @returns {Object} Import result
 */
export function importData(data) {
  if (!data || !data.assets) {
    return { success: false, error: 'Invalid import data' };
  }

  try {
    const result = addAssets(data.assets);
    
    // Import related components if present
    if (data.circuits && Array.isArray(data.circuits)) {
      state.circuits.push(...data.circuits);
    }
    
    saveToLocalStorage();
    
    return { 
      success: true, 
      imported: result.successful.length,
      failed: result.failed.length
    };
  } catch (error) {
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
  return `AST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique component ID
 * @param {string} prefix - Component prefix (C for circuit, etc.)
 * @returns {string} Component ID
 */
function generateComponentId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// MODULE EXPORT (end of file)
// ============================================

console.log('✓ Asset State module loaded');
