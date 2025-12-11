/**
 * protokoll-state.js
 * 
 * Centralized state management for the Protokoll module.
 * Manages metadata, positions, inspection results, and form state.
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
const SAVE_DELAY = 3000; // 3 second debounce
const STORAGE_KEY = 'protokoll_state';
const MAX_DRAFTS = 5;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize state from localStorage or defaults
 * Called once when app starts
 * @returns {void}
 */
export function init() {
  console.log('Initializing Protokoll State Management');
  
  // Try to load from localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (saved) {
    try {
      state = JSON.parse(saved);
      console.log('✓ Loaded state from localStorage');
    } catch (error) {
      console.error('Failed to parse localStorage state:', error);
      initializeDefaults();
    }
  } else {
    initializeDefaults();
  }
  
  // Validate loaded state
  validateStateIntegrity();
  
  console.log('✓ State initialized:', state);
}

/**
 * Set up default state structure
 * Based on vorlage_protokoll.md - VDE 0100 Prüfprotokoll
 * @returns {void}
 */
function initializeDefaults() {
  state = {
    metadata: {
      // Kopfdaten (Header)
      protokollTitle: 'Prüfung stationärer Anlagen, Prüfprotokoll VDE 0100',
      protokollNumber: '',
      blatt: '1',
      blattVon: '3',
      datum: new Date().toISOString(),
      
      // Auftraggeber (Client)
      auftraggeber: '',
      auftragnummer: '',
      kundennummer: '',
      
      // Auftragnehmer (Contractor)
      auftragnehmer: '',
      auftragnehmerOrt: '',
      
      // Kunde (Customer)
      kunde: '',
      kundeOrt: '',
      
      // Firma (Company)
      firma: '',
      firmaOrt: '',
      
      // Anlage (Facility)
      facility: {
        anlage: '',
        ort: '',
        inv: '',
        prüfArt: [],
        netzspannung: '230 / 400 V',
        netzform: 'TN-S',
        netzbetreiber: ''
      },
      
      // Prüfen nach (Standards)
      prüfenNach: {
        dinVde0100Gruppe700: false,
        dinVde01000600: false,
        dinVde01050100: false
      },
      dguvV3: false,
      
      // Prüfungsart
      neuanlage: false,
      erweiterung: false,
      änderung: false,
      instandsetzung: false,
      wiederholungsprüfung: false,
      
      // Prüfer (Inspector)
      prüfer: {
        name: '',
        titel: '',
        ort: '',
        unterschrift: ''
      }
    },

    // Besichtigung (Visual Inspection)
    besichtigung: {
      auswahlBetriebsmittel: { io: false, nio: false },
      trennSchaltgeräte: { io: false, nio: false },
      brandabschottungen: { io: false, nio: false },
      gebäudesystemtechnik: { io: false, nio: false },
      kabelLeitungenStromschienen: { io: false, nio: false },
      kennzStromkrBetriebsmittel: { io: false, nio: false },
      kennzeichnungNPELeiter: { io: false, nio: false },
      leiterverbindungen: { io: false, nio: false },
      schutzÜberwachungseinrichtungen: { io: false, nio: false },
      basisschutzDirektBerühren: { io: false, nio: false },
      zugänglichkeit: { io: false, nio: false },
      schutzpotentialausgleich: { io: false, nio: false },
      zusÖrtlPotentialausgleich: { io: false, nio: false },
      dokumentation: { io: false, nio: false },
      reinigungSchaltschrank: { io: false, nio: false },
      ergänzungsblätter: false
    },

    // Erproben (Testing)
    erproben: {
      funktionsprüfungAnlage: { io: false, nio: false },
      rcdSchutzschalter: { io: false, nio: false },
      schraubverbKlemmstellen: { io: false, nio: false },
      funktionSchutzSicherheitsÜberwachung: { io: false, nio: false },
      drehrichtungMotoren: { io: false, nio: false },
      rechtsdrehfelderDrehstromsteckdose: { io: false, nio: false },
      gebäudesystemtechnikErproben: { io: false, nio: false }
    },

    // Messen (Measurement)
    messen: {
      durchgängigkeitPotentialausgleich: false,
      gebäudekonstruktion: false
    },

    // Messgeräte (Measurement Devices)
    messgeräte: {
      fabrikat: '',
      typ: '',
      nächsteKalibrierung: '',
      identNr: ''
    },

    // Einspeisung
    einspeisung: '',

    // Positionen / Stromkreise (Circuit Positions)
    positions: [],

    // Prüfungsergebnis (Inspection Results)
    prüfungsergebnis: {
      keineMängelFestgestellt: false,
      mängelFestgestellt: false,
      plaketteJa: false,
      plaketteNein: false,
      nächsterPrüfungstermin: '',
      bemerkung: ''
    },

    // Mängel (Defects)
    mängel: '',

    formState: {
      currentStep: 'metadata', // 'metadata'|'besichtigung'|'erproben'|'messen'|'positions'|'results'|'review'
      positionCount: 0,
      unsavedChanges: false,
      validationErrors: {}, // { fieldPath: 'error message' }
      isDirty: false
    }
  };

  console.log('✓ Initialized default state');
}

/**
 * Validate state structure after loading
 * @returns {void}
 */
function validateStateIntegrity() {
  // Check required top-level keys
  const required = ['metadata', 'positions', 'prüfungsergebnis', 'formState'];
  
  for (const key of required) {
    if (!state[key]) {
      console.warn(`Missing state key: ${key}, reinitializing`);
      initializeDefaults();
      return;
    }
  }
  
  // Validate positions array
  if (!Array.isArray(state.positions)) {
    console.warn('Positions not array, converting');
    state.positions = [];
  }
  
  // Validate formState
  if (!state.formState.validationErrors) {
    state.formState.validationErrors = {};
  }
  
  console.log('✓ State integrity validated');
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
 * Get metadata object
 * @returns {Object} Metadata object
 */
export function getMetadata() {
  return JSON.parse(JSON.stringify(state.metadata));
}

/**
 * Get single metadata field
 * @param {string} fieldPath - Path like "facility.name"
 * @returns {any} Field value or undefined
 */
export function getMetadataField(fieldPath) {
  return getNestedValue(state.metadata, fieldPath);
}

/**
 * Get positions array
 * @returns {Array} Array of position objects
 */
export function getPositions() {
  return JSON.parse(JSON.stringify(state.positions));
}

/**
 * Get single position by number
 * @param {string} posNr - Position number
 * @returns {Object|null} Position object or null
 */
export function getPosition(posNr) {
  const position = state.positions.find(p => p.posNr === posNr);
  return position ? JSON.parse(JSON.stringify(position)) : null;
}

/**
 * Get child circuits of a parent circuit (for circuit tree management)
 * @param {string|null} parentId - Parent circuit posNr, or null for root circuits
 * @returns {Array} Array of child position objects
 */
export function getChildCircuits(parentId = null) {
  const children = state.positions.filter(p => p.parentCircuitId === parentId);
  return JSON.parse(JSON.stringify(children));
}

/**
 * Get the parent circuit of a given circuit
 * @param {string} posNr - Position number of the circuit
 * @returns {Object|null} Parent position object or null
 */
export function getParentCircuit(posNr) {
  const position = state.positions.find(p => p.posNr === posNr);
  if (!position || !position.parentCircuitId) return null;
  return getPosition(position.parentCircuitId);
}

/**
 * Get circuit ancestry path (for breadcrumb navigation in tree view)
 * @param {string} posNr - Position number of the circuit
 * @returns {Array} Array of parent circuits from root to immediate parent
 */
export function getCircuitAncestry(posNr) {
  const ancestry = [];
  const visited = new Set(); // Track visited circuits to prevent infinite loops
  let current = getPosition(posNr);
  
  while (current && current.parentCircuitId) {
    // Prevent infinite loop from circular references
    if (visited.has(current.parentCircuitId)) {
      console.warn('Circular reference detected in circuit tree:', current.parentCircuitId);
      break;
    }
    visited.add(current.parentCircuitId);
    
    const parent = getPosition(current.parentCircuitId);
    if (parent) {
      ancestry.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }
  
  return ancestry;
}

/**
 * Get inspection results
 * @returns {Object} Prüfungsergebnis object
 */
export function getPrüfungsergebnis() {
  return JSON.parse(JSON.stringify(state.prüfungsergebnis));
}

/**
 * Get Besichtigung (Visual Inspection) data
 * @returns {Object} Besichtigung object
 */
export function getBesichtigung() {
  return JSON.parse(JSON.stringify(state.besichtigung || {}));
}

/**
 * Get Erproben (Testing) data
 * @returns {Object} Erproben object
 */
export function getErproben() {
  return JSON.parse(JSON.stringify(state.erproben || {}));
}

/**
 * Get Messen (Measurement) data
 * @returns {Object} Messen object
 */
export function getMessen() {
  return JSON.parse(JSON.stringify(state.messen || {}));
}

/**
 * Get Messgeräte (Measurement Devices) data
 * @returns {Object} Messgeräte object
 */
export function getMessgeräte() {
  return JSON.parse(JSON.stringify(state.messgeräte || {}));
}

/**
 * Get Einspeisung
 * @returns {string} Einspeisung value
 */
export function getEinspeisung() {
  return state.einspeisung || '';
}

/**
 * Get Mängel (Defects)
 * @returns {string} Mängel value
 */
export function getMängel() {
  return state.mängel || '';
}

/**
 * Get form state
 * @returns {Object} Form state object
 */
export function getFormState() {
  return JSON.parse(JSON.stringify(state.formState));
}

/**
 * Get current form step
 * @returns {string} Current step name
 */
export function getCurrentStep() {
  return state.formState.currentStep;
}

/**
 * Get validation errors
 * @returns {Object} Validation errors by field
 */
export function getValidationErrors() {
  return JSON.parse(JSON.stringify(state.formState.validationErrors));
}

/**
 * Check if state has unsaved changes
 * @returns {boolean} Has unsaved changes
 */
export function hasUnsavedChanges() {
  return state.formState.unsavedChanges;
}

/**
 * Check if state is dirty (modified)
 * @returns {boolean} Is dirty
 */
export function isDirty() {
  return state.formState.isDirty;
}

// ============================================
// SETTERS (Modifying state)
// ============================================

/**
 * Set entire metadata object
 * @param {Object} metadata - New metadata
 * @returns {void}
 */
export function setMetadata(metadata) {
  if (typeof metadata !== 'object' || !metadata) {
    console.error('Invalid metadata:', metadata);
    return;
  }
  
  state.metadata = JSON.parse(JSON.stringify(metadata));
  markUnsaved();
  emit('metadataChanged', { metadata: getMetadata() });
  saveToLocalStorage();
}

/**
 * Set single metadata field
 * @param {string} fieldPath - Path like "facility.name"
 * @param {any} value - New value
 * @returns {void}
 */
export function setMetadataField(fieldPath, value) {
  try {
    setNestedValue(state.metadata, fieldPath, value);
    markUnsaved();
    emit('metadataFieldChanged', { fieldPath, value });
    saveToLocalStorage();
  } catch (error) {
    console.error(`Failed to set metadata field ${fieldPath}:`, error);
  }
}

/**
 * Add new position to array
 * @param {Object} position - Position object
 * @returns {string} Position number
 */
export function addPosition(position) {
  if (!position || typeof position !== 'object') {
    console.error('Invalid position:', position);
    return null;
  }
  
  // Ensure position has all required fields
  const newPosition = {
    posNr: position.posNr || generateCircuitId(),
    stromkreisNr: position.stromkreisNr || generatePositionNumber(),
    zielbezeichnung: position.zielbezeichnung || '',
    // Phase type: 'mono' (1-phase), 'bi' (2-phase), 'tri' (3-phase)
    phaseType: position.phaseType || 'mono',
    // Parent circuit reference for circuit tree hierarchy
    parentCircuitId: position.parentCircuitId || null,
    leitung: {
      typ: position.leitung?.typ || '',
      anzahl: position.leitung?.anzahl || '',
      querschnitt: position.leitung?.querschnitt || ''
    },
    spannung: {
      un: position.spannung?.un || '',
      fn: position.spannung?.fn || ''
    },
    überstromschutz: {
      art: position.überstromschutz?.art || '',
      inNennstrom: position.überstromschutz?.inNennstrom || '',
      zs: position.überstromschutz?.zs || '',
      zn: position.überstromschutz?.zn || '',
      ik: position.überstromschutz?.ik || ''
    },
    messwerte: {
      riso: position.messwerte?.riso || '',
      schutzleiterWiderstand: position.messwerte?.schutzleiterWiderstand || '',
      rcd: position.messwerte?.rcd || '',
      differenzstrom: position.messwerte?.differenzstrom || '',
      auslösezeit: position.messwerte?.auslösezeit || ''
    },
    prüfergebnis: {
      status: position.prüfergebnis?.status || 'nicht-geprüft',
      mängel: position.prüfergebnis?.mängel || [],
      bemerkung: position.prüfergebnis?.bemerkung || ''
    }
  };
  
  state.positions.push(newPosition);
  state.formState.positionCount = state.positions.length;
  markUnsaved();
  emit('positionAdded', { position: newPosition });
  saveToLocalStorage();
  
  return newPosition.posNr;
}

/**
 * Update existing position
 * @param {string} posNr - Position number
 * @param {Object} updates - Updated fields
 * @returns {boolean} Success
 */
export function updatePosition(posNr, updates) {
  const index = state.positions.findIndex(p => p.posNr === posNr);
  
  if (index === -1) {
    console.error(`Position not found: ${posNr}`);
    return false;
  }
  
  // Merge updates
  state.positions[index] = {
    ...state.positions[index],
    ...updates
  };
  
  markUnsaved();
  emit('positionUpdated', { posNr, position: getPosition(posNr) });
  saveToLocalStorage();
  
  return true;
}

/**
 * Delete position by number
 * @param {string} posNr - Position number
 * @returns {boolean} Success
 */
export function deletePosition(posNr) {
  const index = state.positions.findIndex(p => p.posNr === posNr);
  
  if (index === -1) {
    console.error(`Position not found: ${posNr}`);
    return false;
  }
  
  state.positions.splice(index, 1);
  state.formState.positionCount = state.positions.length;
  markUnsaved();
  emit('positionDeleted', { posNr });
  saveToLocalStorage();
  
  return true;
}

/**
 * Set inspection results
 * @param {Object} results - Results object
 * @returns {void}
 */
export function setPrüfungsergebnis(results) {
  state.prüfungsergebnis = {
    ...state.prüfungsergebnis,
    ...results
  };
  
  markUnsaved();
  emit('prüfungsergebnisChanged', { results: getPrüfungsergebnis() });
  saveToLocalStorage();
}

/**
 * Set Besichtigung (Visual Inspection) data
 * @param {Object} besichtigung - Besichtigung object
 * @returns {void}
 */
export function setBesichtigung(besichtigung) {
  state.besichtigung = {
    ...state.besichtigung,
    ...besichtigung
  };
  
  markUnsaved();
  emit('besichtigungChanged', { besichtigung: getBesichtigung() });
  saveToLocalStorage();
}

/**
 * Set Erproben (Testing) data
 * @param {Object} erproben - Erproben object
 * @returns {void}
 */
export function setErproben(erproben) {
  state.erproben = {
    ...state.erproben,
    ...erproben
  };
  
  markUnsaved();
  emit('erprobenChanged', { erproben: getErproben() });
  saveToLocalStorage();
}

/**
 * Set Messen (Measurement) data
 * @param {Object} messen - Messen object
 * @returns {void}
 */
export function setMessen(messen) {
  state.messen = {
    ...state.messen,
    ...messen
  };
  
  markUnsaved();
  emit('messenChanged', { messen: getMessen() });
  saveToLocalStorage();
}

/**
 * Set Messgeräte (Measurement Devices) data
 * @param {Object} messgeräte - Messgeräte object
 * @returns {void}
 */
export function setMessgeräte(messgeräte) {
  state.messgeräte = {
    ...state.messgeräte,
    ...messgeräte
  };
  
  markUnsaved();
  emit('messgeräteChanged', { messgeräte: getMessgeräte() });
  saveToLocalStorage();
}

/**
 * Set Einspeisung
 * @param {string} einspeisung - Einspeisung value
 * @returns {void}
 */
export function setEinspeisung(einspeisung) {
  state.einspeisung = einspeisung;
  
  markUnsaved();
  emit('einspeisungChanged', { einspeisung });
  saveToLocalStorage();
}

/**
 * Set Mängel (Defects)
 * @param {string} mängel - Mängel value
 * @returns {void}
 */
export function setMängel(mängel) {
  state.mängel = mängel;
  
  markUnsaved();
  emit('mängelChanged', { mängel });
  saveToLocalStorage();
}

/**
 * Load data from a contract object to pre-fill the protokoll form
 * @param {Object} contract - Contract object from contract list
 * @returns {void}
 */
export function loadFromContract(contract) {
  if (!contract || typeof contract !== 'object') {
    console.error('Invalid contract data:', contract);
    return;
  }
  
  console.log('Loading protokoll data from contract:', contract);
  
  // Map contract fields to protokoll metadata
  state.metadata.auftragnummer = contract.contractId || '';
  state.metadata.auftraggeber = contract.contractTitle || '';
  state.metadata.kundennummer = contract.contractId || '';
  
  // Map location information
  if (contract.location) {
    state.metadata.facility.ort = contract.location;
  }
  
  if (contract.equipmentId) {
    state.metadata.facility.inv = contract.equipmentId;
  }
  
  if (contract.equipmentDescription) {
    state.metadata.facility.anlage = contract.equipmentDescription;
  }
  
  if (contract.roomArea) {
    state.metadata.facility.anlage = state.metadata.facility.anlage 
      ? `${state.metadata.facility.anlage} - ${contract.roomArea}`
      : contract.roomArea;
  }
  
  // Set the current date
  state.metadata.datum = new Date().toISOString();
  
  // Reset form state
  state.formState.currentStep = 'metadata';
  state.formState.isDirty = true;
  state.formState.unsavedChanges = true;
  
  emit('contractLoaded', { contract });
  emit('metadataChanged', { metadata: getMetadata() });
  saveToLocalStorage();
  
  console.log('✓ Contract data loaded into protokoll');
}

/**
 * Load data from an asset object to pre-fill the protokoll form
 * Links the protocol to the asset for traceability
 * @param {Object} assetData - Asset data object from Asset Management
 * @returns {void}
 */
export function loadFromAsset(assetData) {
  if (!assetData || typeof assetData !== 'object') {
    console.error('Invalid asset data:', assetData);
    return;
  }
  
  console.log('Loading protokoll data from asset:', assetData);
  
  // Map asset fields to protokoll metadata
  // Store asset reference for linking
  state.metadata.linkedAssetId = assetData.assetId || '';
  state.metadata.linkedAssetName = assetData.assetName || '';
  
  // Map facility information from asset
  if (assetData.assetName) {
    state.metadata.facility.anlage = assetData.assetName;
  }
  
  if (assetData.description) {
    // Append description if facility already has a name
    state.metadata.facility.anlage = state.metadata.facility.anlage
      ? `${state.metadata.facility.anlage} - ${assetData.description}`
      : assetData.description;
  }
  
  if (assetData.location) {
    state.metadata.facility.ort = assetData.location;
  }
  
  if (assetData.assetId) {
    state.metadata.facility.inv = assetData.assetId;
  }
  
  // Map plant information
  if (assetData.plant) {
    state.metadata.firmaOrt = assetData.plant;
  }
  
  // Set asset type information for reference
  if (assetData.assetType) {
    // Store type info in facility description or as additional metadata
    const typeInfo = `Verteilertyp: ${assetData.assetType}`;
    state.metadata.facility.anlage = state.metadata.facility.anlage
      ? `${state.metadata.facility.anlage} (${typeInfo})`
      : typeInfo;
  }
  
  // Set the current date
  state.metadata.datum = new Date().toISOString();
  
  // Reset form state and start fresh
  state.formState.currentStep = 'metadata';
  state.formState.isDirty = true;
  state.formState.unsavedChanges = true;
  
  emit('assetLoaded', { assetData });
  emit('metadataChanged', { metadata: getMetadata() });
  saveToLocalStorage();
  
  console.log('✓ Asset data loaded into protokoll');
}

/**
 * Set current form step
 * @param {string} step - Step: 'metadata'|'besichtigung'|'erproben'|'messen'|'positions'|'results'|'review'
 * @returns {void}
 */
export function setFormStep(step) {
  const validSteps = ['metadata', 'besichtigung', 'erproben', 'messen', 'positions', 'results', 'review'];
  
  if (!validSteps.includes(step)) {
    console.error(`Invalid step: ${step}`);
    return;
  }
  
  const oldStep = state.formState.currentStep;
  state.formState.currentStep = step;
  
  emit('formStepChanged', { oldStep, newStep: step });
  saveToLocalStorage();
}

/**
 * Set validation errors for a field
 * @param {string} fieldPath - Field path
 * @param {string|null} error - Error message or null to clear
 * @returns {void}
 */
export function setValidationError(fieldPath, error) {
  if (error) {
    state.formState.validationErrors[fieldPath] = error;
  } else {
    delete state.formState.validationErrors[fieldPath];
  }
  
  emit('validationErrorChanged', { fieldPath, error });
}

/**
 * Set all validation errors at once
 * @param {Object} errors - Object with fieldPath: errorMessage pairs
 * @returns {void}
 */
export function setValidationErrors(errors) {
  state.formState.validationErrors = { ...errors };
  emit('validationErrorsChanged', { errors });
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
// STATE MANAGEMENT HELPERS
// ============================================

/**
 * Mark state as having unsaved changes
 * @returns {void}
 */
export function markUnsaved() {
  state.formState.unsavedChanges = true;
  state.formState.isDirty = true;
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
  
  // Debounce: wait 3 seconds before saving
  saveTimer = setTimeout(() => {
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, json);
      
      // Track export history
      trackExportHistory();
      
      emit('stateSaved', { timestamp: new Date().toISOString() });
      console.log('✓ State saved to localStorage');
    } catch (error) {
      console.error('Failed to save state:', error);
      
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old drafts');
        clearOldDrafts();
        // Retry save
        saveToLocalStorage();
      }
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
    console.log('✓ State force-saved to localStorage');
  } catch (error) {
    console.error('Failed to force save:', error);
  }
}

/**
 * Load state from localStorage
 * @returns {boolean} Success
 */
export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (!saved) {
      console.log('No saved state in localStorage');
      return false;
    }
    
    state = JSON.parse(saved);
    validateStateIntegrity();
    emit('stateLoaded', { state: getState() });
    console.log('✓ State loaded from localStorage');
    return true;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return false;
  }
}

/**
 * Clear localStorage completely
 * @returns {void}
 */
export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('protokoll_exports');
    emit('storageCleared', {});
    console.log('✓ localStorage cleared');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Track export for history
 * @returns {void}
 */
function trackExportHistory() {
  try {
    const key = 'protokoll_exports';
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Add new export entry
    history.push({
      timestamp: new Date().toISOString(),
      protokollNumber: state.metadata.protokollNumber,
      positionCount: state.positions.length
    });
    
    // Keep only last 10 exports
    while (history.length > 10) {
      history.shift();
    }
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to track export history:', error);
  }
}

/**
 * Clear old draft backups if storage is full
 * @returns {void}
 */
function clearOldDrafts() {
  try {
    const key = 'protokoll_exports';
    let history = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Remove oldest entries
    while (history.length > MAX_DRAFTS / 2) {
      history.shift();
    }
    
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to clear old drafts:', error);
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
    document.dispatchEvent(new CustomEvent(`protokoll:${eventName}`, {
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
 * Get nested object value using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Path like "facility.name"
 * @returns {any} Value or undefined
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Set nested object value using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Path like "facility.name"
 * @param {any} value - Value to set
 * @returns {void}
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  // Guard against prototype pollution
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  
  // Navigate to parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    // Prevent prototype pollution
    if (forbiddenKeys.includes(key)) {
      console.error(`Invalid path key: ${key}`);
      return;
    }
    
    if (!(key in current)) {
      current[key] = {};
    }
    
    current = current[key];
  }
  
  // Guard final key against prototype pollution
  const finalKey = keys[keys.length - 1];
  if (forbiddenKeys.includes(finalKey)) {
    console.error(`Invalid path key: ${finalKey}`);
    return;
  }
  
  // Set final value
  current[finalKey] = value;
}

/**
 * Generate unique circuit ID (internal identifier)
 * @returns {string} Circuit ID
 */
function generateCircuitId() {
  return `circuit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate next position number in format XX.XX.XXXX
 * @returns {string} Position number
 */
function generatePositionNumber() {
  const existingNumbers = state.positions
    .map(p => p.stromkreisNr)
    .filter(nr => nr && /^\d{2}\.\d{2}\.\d{4}$/.test(nr))
    .map(nr => {
      const parts = nr.split('.');
      return parseInt(parts[0]) * 1000000 + parseInt(parts[1]) * 10000 + parseInt(parts[2]);
    })
    .sort((a, b) => a - b);

  let nextNumber = 1010010; // Start with 01.01.0010
  
  for (const num of existingNumbers) {
    if (num === nextNumber) {
      nextNumber += 10; // Increment by 10 (e.g., 01.01.0010 -> 01.01.0020)
    } else {
      break;
    }
  }

  const major = Math.floor(nextNumber / 1000000);
  const minor = Math.floor((nextNumber % 1000000) / 10000);
  const patch = nextNumber % 10000;

  return `${major.toString().padStart(2, '0')}.${minor.toString().padStart(2, '0')}.${patch.toString().padStart(4, '0')}`;
}

// ============================================
// MODULE EXPORT (end of file)
// ============================================

console.log('✓ Protokoll State module loaded');
