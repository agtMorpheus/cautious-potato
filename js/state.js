/**
 * State Management Module (Phase 2)
 * 
 * Centralized application state with localStorage persistence
 * Implements event-driven architecture for reactive UI updates
 * 
 * Design Principles:
 * - Single Responsibility: Only manages data, not DOM or business logic
 * - Immutable Updates Pattern: Updates create new snapshots via merges
 * - Explicit Interfaces: Small, focused functions (getState, setState, resetState)
 * - Event-driven Updates: Consumers subscribe to stateChanged instead of polling
 * - Persistence-aware: State structure is JSON-serializable for localStorage
 */

import { validateStateStructure } from './validation.js';

// Storage key with version for backward compatibility
const STORAGE_KEY = 'abrechnungAppState_v1';

// Initial state structure - the single source of truth
const initialState = {
  protokollData: {
    metadata: {
      protocolNumber: null,   // e.g. "P-2025-001"
      orderNumber: null,      // e.g. "A-12345"
      plant: null,            // Anlage
      location: null,         // Einsatzort
      company: null,          // Firma
      date: null              // ISO string, e.g. "2025-12-09"
    },
    positionen: [
      // { posNr: string, menge: number }
    ]
  },
  abrechnungData: {
    header: {
      date: null,
      orderNumber: null,
      plant: null,
      location: null
    },
    positionen: {
      // key: posNr, value: totalMenge
      // e.g. "01.01.0010": 5
    }
  },
  // Contract Manager state slice (Phase 1)
  contracts: {
    // Import metadata for tracking imported files
    importedFiles: [
      // { fileName, size, importedAt, sheets, recordsImported, recordsWithErrors }
    ],
    // Discovered sheet metadata (for mapping UI)
    rawSheets: {
      // [sheetName]: { sheetName, rowCount, columns: [...], isEmpty }
    },
    // Current column mapping for active import
    currentMapping: {
      // fieldName: { excelColumn, type, required, detectedHeader }
    },
    // Normalized contract records
    records: [
      // Contract objects with full schema
    ],
    // UI state for filtering/searching
    filters: {
      contractId: null,
      status: null,
      location: null,
      equipmentId: null,
      dateRange: { from: null, to: null },
      searchText: ''
    },
    // Import state (for UI progress/feedback)
    importState: {
      isImporting: false,
      currentFile: null,
      currentSheet: null,
      fileSize: 0,
      progress: 0,
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      errors: [],
      warnings: []
    },
    // Phase 3: Last import result for preview before saving
    lastImportResult: null,    // { contracts, errors, warnings, summary }
    // Phase 3: UI state for contract manager
    ui: {
      activeTab: 'import',     // 'import' | 'preview' | 'list'
      sortKey: 'contractId',
      sortDir: 'asc'
    }
  },
  ui: {
    import: {
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      fileName: '',
      fileSize: 0,
      importedAt: null
    },
    generate: {
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      positionCount: 0,
      uniquePositionCount: 0,
      generationTimeMs: 0
    },
    export: {
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      lastExportAt: null,
      lastExportSize: 0
    }
  },
  meta: {
    version: '1.0.0',
    lastUpdated: null
  }
};

// Current mutable state
let currentState = structuredClone(initialState);

// Pub/sub listeners
const listeners = new Set();

/**
 * Notify all subscribed listeners of state change
 * Also dispatches a DOM CustomEvent for non-module consumers
 */
function notifyListeners() {
  const snapshot = getState();
  
  // Notify programmatic subscribers
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('State listener error:', err);
    }
  });

  // Dispatch DOM event for non-module consumers
  document.dispatchEvent(new CustomEvent('stateChanged', {
    detail: snapshot
  }));
}

/**
 * Get current application state (defensive copy)
 * @returns {Object} Read-only clone of current state
 */
export function getState() {
  return structuredClone(currentState);
}

/**
 * Update application state with partial updates
 * @param {Object} partialUpdates - Partial state updates to merge
 * @param {Object} options - Options { silent: boolean }
 * @returns {Object} New state snapshot
 */
export function setState(partialUpdates, options = { silent: false }) {
  const prevState = currentState;

  // Shallow-merge top-level keys
  currentState = {
    ...prevState,
    ...partialUpdates,
    meta: {
      ...prevState.meta,
      ...(partialUpdates.meta || {}),
      lastUpdated: new Date().toISOString()
    }
  };

  // Persist and notify unless silent
  if (!options.silent) {
    saveStateToStorage();
    notifyListeners();
  }

  return getState();
}

/**
 * Reset state to initial values
 * @param {Object} options - Options { persist: boolean, silent: boolean }
 * @returns {Object} Reset state snapshot
 */
export function resetState(options = { persist: true, silent: false }) {
  currentState = structuredClone(initialState);

  if (options.persist) {
    saveStateToStorage();
  }

  if (!options.silent) {
    notifyListeners();
  }

  return getState();
}

/**
 * Subscribe to state changes
 * @param {Function} listener - Callback function (receives state snapshot)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
  if (typeof listener !== 'function') {
    throw new Error('State listener must be a function');
  }
  listeners.add(listener);

  // Return unsubscribe function
  return () => unsubscribe(listener);
}

/**
 * Unsubscribe a listener from state changes
 * @param {Function} listener - Listener to remove
 */
export function unsubscribe(listener) {
  listeners.delete(listener);
}

// ============================================================
// localStorage Persistence
// ============================================================

/**
 * Save current state to localStorage
 */
function saveStateToStorage() {
  try {
    const serialized = JSON.stringify(currentState);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    // Handle quota exceeded
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Consider clearing old data.');
    }
  }
}

/**
 * Load state from localStorage
 * @returns {Object} Loaded state snapshot
 */
export function loadStateFromStorage() {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      console.log('No saved state found in localStorage. Using initial state.');
      currentState = structuredClone(initialState);
      return getState();
    }

    const parsed = JSON.parse(serialized);
    
    // Validate critical sections before accepting
    const validation = validateStateStructure(parsed);
    if (!validation.valid) {
      console.warn('Persisted state failed validation. Resetting to initial state.', validation.errors);
      currentState = structuredClone(initialState);
      saveStateToStorage();
      notifyListeners();
      return getState();
    }

    // Merge with initial state to ensure all keys exist
    currentState = {
      ...structuredClone(initialState),
      ...parsed,
      meta: {
        ...structuredClone(initialState).meta,
        ...(parsed.meta || {})
      }
    };

    console.log('State successfully loaded from localStorage');
    notifyListeners();
    return getState();
  } catch (error) {
    console.error('Failed to load state from localStorage. Resetting to initial state.', error);
    currentState = structuredClone(initialState);
    saveStateToStorage();
    notifyListeners();
    return getState();
  }
}

/**
 * Clear persisted state from localStorage
 */
export function clearPersistedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    console.log('Persisted state cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear persisted state from localStorage:', error);
  }
}

// ============================================================
// Domain-Specific Helper Functions
// ============================================================

/**
 * Update import UI status
 * @param {Object} partial - Partial import status updates
 * @returns {Object} New state snapshot
 */
export function setImportStatus(partial) {
  return setState({
    ui: {
      ...currentState.ui,
      import: {
        ...currentState.ui.import,
        ...partial
      }
    }
  });
}

/**
 * Update generate UI status
 * @param {Object} partial - Partial generate status updates
 * @returns {Object} New state snapshot
 */
export function setGenerateStatus(partial) {
  return setState({
    ui: {
      ...currentState.ui,
      generate: {
        ...currentState.ui.generate,
        ...partial
      }
    }
  });
}

/**
 * Update export UI status
 * @param {Object} partial - Partial export status updates
 * @returns {Object} New state snapshot
 */
export function setExportStatus(partial) {
  return setState({
    ui: {
      ...currentState.ui,
      export: {
        ...currentState.ui.export,
        ...partial
      }
    }
  });
}

/**
 * Update protokoll data with validation
 * @param {Object} data - Object containing metadata and positionen
 * @returns {Object} New state snapshot
 */
export function updateProtokollData({ metadata, positionen }) {
  return setState({
    protokollData: {
      metadata: {
        ...currentState.protokollData.metadata,
        ...metadata
      },
      positionen: positionen || currentState.protokollData.positionen
    }
  });
}

/**
 * Update abrechnung positions
 * @param {Object} positionMap - Map of position numbers to quantities
 * @returns {Object} New state snapshot
 */
export function updateAbrechnungPositions(positionMap) {
  return setState({
    abrechnungData: {
      ...currentState.abrechnungData,
      positionen: positionMap
    }
  });
}

/**
 * Update abrechnung header
 * @param {Object} headerData - Header data to update
 * @returns {Object} New state snapshot
 */
export function updateAbrechnungHeader(headerData) {
  return setState({
    abrechnungData: {
      ...currentState.abrechnungData,
      header: {
        ...currentState.abrechnungData.header,
        ...headerData
      }
    }
  });
}

// ============================================================
// Contract Manager Helper Functions (Phase 1)
// ============================================================

/**
 * Add an imported contract file to the list
 * @param {Object} fileInfo - File metadata { fileName, size, sheets, recordsImported, recordsWithErrors }
 * @returns {Object} New state snapshot
 */
export function addContractFile(fileInfo) {
  const newFile = {
    ...fileInfo,
    importedAt: new Date().toISOString()
  };
  
  return setState({
    contracts: {
      ...currentState.contracts,
      importedFiles: [...(currentState.contracts?.importedFiles || []), newFile]
    }
  });
}

/**
 * Set contract records (replaces existing)
 * @param {Array} records - Array of contract objects
 * @returns {Object} New state snapshot
 */
export function setContracts(records) {
  return setState({
    contracts: {
      ...currentState.contracts,
      records: records || []
    }
  });
}

/**
 * Add contracts to existing records
 * @param {Array} newRecords - Array of new contract objects to add
 * @returns {Object} New state snapshot
 */
export function addContracts(newRecords) {
  const existingRecords = currentState.contracts?.records || [];
  return setState({
    contracts: {
      ...currentState.contracts,
      records: [...existingRecords, ...newRecords]
    }
  });
}

/**
 * Update contract filters
 * @param {Object} filters - Filter object to merge with existing filters
 * @returns {Object} New state snapshot
 */
export function setContractFilters(filters) {
  return setState({
    contracts: {
      ...currentState.contracts,
      filters: {
        ...currentState.contracts?.filters,
        ...filters
      }
    }
  });
}

/**
 * Reset contract filters to defaults
 * @returns {Object} New state snapshot
 */
export function resetContractFilters() {
  return setState({
    contracts: {
      ...currentState.contracts,
      filters: {
        contractId: null,
        status: null,
        location: null,
        equipmentId: null,
        dateRange: { from: null, to: null },
        searchText: ''
      }
    }
  });
}

/**
 * Update contract import state
 * @param {Object} partial - Partial import state updates
 * @returns {Object} New state snapshot
 */
export function setContractImportState(partial) {
  return setState({
    contracts: {
      ...currentState.contracts,
      importState: {
        ...currentState.contracts?.importState,
        ...partial
      }
    }
  });
}

/**
 * Set discovered sheets from contract file analysis
 * @param {Object} sheets - Object with sheet metadata
 * @returns {Object} New state snapshot
 */
export function setContractRawSheets(sheets) {
  return setState({
    contracts: {
      ...currentState.contracts,
      rawSheets: sheets || {}
    }
  });
}

/**
 * Set current column mapping for contract import
 * @param {Object} mapping - Column mapping configuration
 * @returns {Object} New state snapshot
 */
export function setContractMapping(mapping) {
  return setState({
    contracts: {
      ...currentState.contracts,
      currentMapping: mapping || {}
    }
  });
}

/**
 * Clear all contract data (reset contract module)
 * @returns {Object} New state snapshot
 */
export function clearContracts() {
  return setState({
    contracts: {
      importedFiles: [],
      rawSheets: {},
      currentMapping: {},
      records: [],
      filters: {
        contractId: null,
        status: null,
        location: null,
        equipmentId: null,
        dateRange: { from: null, to: null },
        searchText: ''
      },
      importState: {
        isImporting: false,
        currentFile: null,
        currentSheet: null,
        fileSize: 0,
        progress: 0,
        status: 'idle',
        message: '',
        errors: [],
        warnings: []
      },
      lastImportResult: null,
      ui: {
        activeTab: 'import',
        sortKey: 'contractId',
        sortDir: 'asc'
      }
    }
  });
}

/**
 * Set last import result for preview (Phase 3)
 * @param {Object} result - Import result { contracts, errors, warnings, summary }
 * @returns {Object} New state snapshot
 */
export function setLastImportResult(result) {
  return setState({
    contracts: {
      ...currentState.contracts,
      lastImportResult: result
    }
  });
}

/**
 * Set contract UI state (Phase 3)
 * @param {Object} uiState - UI state updates { activeTab, sortKey, sortDir }
 * @returns {Object} New state snapshot
 */
export function setContractUIState(uiState) {
  return setState({
    contracts: {
      ...currentState.contracts,
      ui: {
        ...(currentState.contracts?.ui || {}),
        ...uiState
      }
    }
  });
}

// ============================================================
// Legacy Compatibility Functions
// ============================================================

/**
 * Clear all state and localStorage (legacy compatibility)
 * @deprecated Use resetState() instead
 */
export function clearState() {
  resetState({ persist: true, silent: false });
  clearPersistedState();
}

/**
 * Load state from localStorage (legacy compatibility)
 * @returns {boolean} True if state was loaded successfully
 * @deprecated Use loadStateFromStorage() instead
 */
export function loadState() {
  const result = loadStateFromStorage();
  // Return true if we have any protokollData or abrechnungData loaded
  return !!(result.protokollData?.positionen?.length || 
            Object.keys(result.abrechnungData?.positionen || {}).length);
}

/**
 * Save current state to localStorage (legacy compatibility)
 * @deprecated setState automatically saves state
 */
export function saveState() {
  saveStateToStorage();
}

/**
 * Get formatted state for debugging
 * @returns {string} Formatted state string
 */
export function debugState() {
  return JSON.stringify(currentState, null, 2);
}
