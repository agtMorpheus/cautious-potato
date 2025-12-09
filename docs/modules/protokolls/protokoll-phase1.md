# Protokoll Module - Phase 1: State Management Implementation

## Overview

**Phase 1** focuses on building the foundational state management layer for the Protokoll Module. This phase establishes the centralized data store, event system, and persistence mechanism that all other modules depend on.

**Duration:** 1-2 weeks
**Deliverable:** Fully functional `protokoll-state.js` module with complete test coverage
**Dependencies:** None (standalone module)
**Blocks:** Phase 2, 3, 4, 5

---

## Phase 1 Objectives

1. ✓ Create modular state management system
2. ✓ Implement hierarchical data structure
3. ✓ Build event-driven architecture (pub/sub)
4. ✓ Add localStorage persistence
5. ✓ Create comprehensive test suite
6. ✓ Document all exported APIs

---

## File Structure

```
js/protokoll/
└── protokoll-state.js          (← This phase)

js/
└── test/
    └── protokoll-state.test.js (← Unit tests)
```

---

## Detailed Implementation Guide

### Step 1: Set Up Module Skeleton

Create `js/protokoll/protokoll-state.js` with initial structure:

```javascript
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

// EventTarget for pub/sub pattern
const eventEmitter = new EventTarget();

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
 * @returns {void}
 */
function initializeDefaults() {
  state = {
    metadata: {
      protokollNumber: '',
      datum: new Date().toISOString(),
      auftraggeber: '',
      auftraggaberAdresse: '',
      auftragnummer: '',
      kundennummer: '',
      auftragnehmer: '',
      auftragnehmerAdresse: '',
      facility: {
        name: '',
        address: '',
        anlage: '',
        location: '',
        inventory: '',
        prüfArt: [],
        netzspannung: '230/400',
        netzform: 'TN-S',
        netzbetreiber: ''
      },
      prüfer: {
        name: '',
        titel: '',
        unterschrift: ''
      },
      zeuge: {
        name: '',
        titel: '',
        unterschrift: ''
      }
    },

    positions: [],

    prüfungsergebnis: {
      mängelFestgestellt: false,
      plakette: 'ja',
      nächsterPrüfungstermin: '',
      bemerkung: ''
    },

    formState: {
      currentStep: 'metadata', // 'metadata'|'positions'|'results'|'review'
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
 * Get inspection results
 * @returns {Object} Prüfungsergebnis object
 */
export function getPrüfungsergebnis() {
  return JSON.parse(JSON.stringify(state.prüfungsergebnis));
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
    posNr: position.posNr || generatePositionNumber(),
    stromkreisNr: position.stromkreisNr || '',
    zielbezeichnung: position.zielbezeichnung || '',
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
 * Set current form step
 * @param {string} step - Step: 'metadata'|'positions'|'results'|'review'
 * @returns {void}
 */
export function setFormStep(step) {
  const validSteps = ['metadata', 'positions', 'results', 'review'];
  
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
  
  // Navigate to parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    if (!(key in current)) {
      current[key] = {};
    }
    
    current = current[key];
  }
  
  // Set final value
  current[keys[keys.length - 1]] = value;
}

/**
 * Generate unique position number
 * @returns {string} Position number
 */
function generatePositionNumber() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// MODULE EXPORT (end of file)
// ============================================

console.log('✓ Protokoll State module loaded');
```

### Step 2: Add Comprehensive Unit Tests

Create `js/test/protokoll-state.test.js`:

```javascript
/**
 * protokoll-state.test.js
 * Comprehensive unit tests for state management module
 */

import * as state from '../protokoll/protokoll-state.js';

describe('Protokoll State Management', () => {
  
  beforeEach(() => {
    // Clear state before each test
    localStorage.clear();
    state.reset();
  });

  // ========== INITIALIZATION ==========
  describe('init()', () => {
    test('should initialize with default state', () => {
      state.init();
      const current = state.getState();
      
      expect(current.metadata).toBeDefined();
      expect(current.positions).toEqual([]);
      expect(current.formState.currentStep).toBe('metadata');
    });

    test('should load existing state from localStorage', () => {
      // Pre-populate localStorage
      const saved = {
        metadata: { auftraggeber: 'Test Company' },
        positions: [],
        prüfungsergebnis: {},
        formState: { currentStep: 'positions' }
      };
      localStorage.setItem('protokoll_state', JSON.stringify(saved));
      
      state.init();
      const current = state.getState();
      
      expect(current.formState.currentStep).toBe('positions');
    });
  });

  // ========== METADATA ==========
  describe('Metadata Operations', () => {
    beforeEach(() => {
      state.init();
    });

    test('getMetadata() returns copy', () => {
      const metadata = state.getMetadata();
      metadata.auftraggeber = 'Modified';
      
      const current = state.getMetadata();
      expect(current.auftraggeber).toBe('');
    });

    test('setMetadata() updates entire metadata', () => {
      const newMetadata = { auftraggeber: 'New Company' };
      state.setMetadata(newMetadata);
      
      const current = state.getMetadata();
      expect(current.auftraggeber).toBe('New Company');
    });

    test('setMetadataField() updates single field', () => {
      state.setMetadataField('auftraggeber', 'Test AG');
      
      const value = state.getMetadataField('auftraggeber');
      expect(value).toBe('Test AG');
    });

    test('getMetadataField() supports nested paths', () => {
      state.setMetadataField('facility.name', 'Test Facility');
      
      const value = state.getMetadataField('facility.name');
      expect(value).toBe('Test Facility');
    });
  });

  // ========== POSITIONS ==========
  describe('Position Operations', () => {
    beforeEach(() => {
      state.init();
    });

    test('addPosition() creates new position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit'
      });
      
      expect(posNr).toBeDefined();
      const positions = state.getPositions();
      expect(positions.length).toBe(1);
    });

    test('getPosition() returns specific position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test'
      });
      
      const position = state.getPosition(posNr);
      expect(position.stromkreisNr).toBe('F1');
    });

    test('updatePosition() modifies position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test'
      });
      
      state.updatePosition(posNr, {
        zielbezeichnung: 'Updated'
      });
      
      const position = state.getPosition(posNr);
      expect(position.zielbezeichnung).toBe('Updated');
    });

    test('deletePosition() removes position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1'
      });
      
      state.deletePosition(posNr);
      
      const positions = state.getPositions();
      expect(positions.length).toBe(0);
    });

    test('getPosition() returns null for non-existent position', () => {
      const position = state.getPosition('nonexistent');
      expect(position).toBeNull();
    });
  });

  // ========== VALIDATION ERRORS ==========
  describe('Validation Errors', () => {
    beforeEach(() => {
      state.init();
    });

    test('setValidationError() adds error', () => {
      state.setValidationError('metadata.auftraggeber', 'Required field');
      
      const errors = state.getValidationErrors();
      expect(errors['metadata.auftraggeber']).toBe('Required field');
    });

    test('setValidationError() with null clears error', () => {
      state.setValidationError('metadata.auftraggeber', 'Error');
      state.setValidationError('metadata.auftraggeber', null);
      
      const errors = state.getValidationErrors();
      expect(errors['metadata.auftraggeber']).toBeUndefined();
    });

    test('clearValidationErrors() removes all errors', () => {
      state.setValidationError('field1', 'Error 1');
      state.setValidationError('field2', 'Error 2');
      state.clearValidationErrors();
      
      const errors = state.getValidationErrors();
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  // ========== FORM STATE ==========
  describe('Form State', () => {
    beforeEach(() => {
      state.init();
    });

    test('setFormStep() changes step', () => {
      state.setFormStep('positions');
      
      expect(state.getCurrentStep()).toBe('positions');
    });

    test('setFormStep() rejects invalid step', () => {
      state.setFormStep('invalid');
      
      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('markUnsaved() sets flag', () => {
      state.markUnsaved();
      
      expect(state.hasUnsavedChanges()).toBe(true);
      expect(state.isDirty()).toBe(true);
    });

    test('clearUnsaved() clears flag', () => {
      state.markUnsaved();
      state.clearUnsaved();
      
      expect(state.hasUnsavedChanges()).toBe(false);
    });
  });

  // ========== EVENTS ==========
  describe('Event System', () => {
    beforeEach(() => {
      state.init();
    });

    test('on() subscribes to events', (done) => {
      state.on('testEvent', (data) => {
        expect(data.value).toBe(42);
        done();
      });
      
      state.emit('testEvent', { value: 42 });
    });

    test('off() unsubscribes from events', () => {
      const callback = jest.fn();
      state.on('testEvent', callback);
      state.off('testEvent', callback);
      
      state.emit('testEvent', {});
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('metadata changes emit events', (done) => {
      state.on('metadataFieldChanged', (data) => {
        expect(data.fieldPath).toBe('auftraggeber');
        expect(data.value).toBe('Test');
        done();
      });
      
      state.setMetadataField('auftraggeber', 'Test');
    });

    test('position changes emit events', (done) => {
      state.on('positionAdded', (data) => {
        expect(data.position).toBeDefined();
        done();
      });
      
      state.addPosition({ stromkreisNr: 'F1' });
    });
  });

  // ========== PERSISTENCE ==========
  describe('localStorage Persistence', () => {
    beforeEach(() => {
      localStorage.clear();
      state.init();
    });

    test('forceSave() writes to localStorage', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      
      const saved = JSON.parse(localStorage.getItem('protokoll_state'));
      expect(saved.metadata.auftraggeber).toBe('Test');
    });

    test('loadFromLocalStorage() restores state', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      
      // Create new instance (simulating page reload)
      state.reset();
      state.loadFromLocalStorage();
      
      expect(state.getMetadataField('auftraggeber')).toBe('Test');
    });

    test('clearLocalStorage() removes data', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      state.clearLocalStorage();
      
      const saved = localStorage.getItem('protokoll_state');
      expect(saved).toBeNull();
    });
  });

  // ========== IMMUTABILITY ==========
  describe('State Immutability', () => {
    beforeEach(() => {
      state.init();
    });

    test('getState() returns immutable copy', () => {
      const copy = state.getState();
      copy.metadata.auftraggeber = 'Modified';
      
      const current = state.getState();
      expect(current.metadata.auftraggeber).toBe('');
    });

    test('modifications through getters don\'t affect state', () => {
      const metadata = state.getMetadata();
      metadata.auftraggeber = 'Modified';
      
      const current = state.getMetadata();
      expect(current.auftraggeber).toBe('');
    });
  });

  // ========== EDGE CASES ==========
  describe('Edge Cases', () => {
    beforeEach(() => {
      state.init();
    });

    test('handles null metadata gracefully', () => {
      expect(() => {
        state.setMetadata(null);
      }).not.toThrow();
    });

    test('handles invalid positions gracefully', () => {
      const result = state.addPosition(null);
      expect(result).toBeNull();
    });

    test('handles duplicate position deletion', () => {
      const posNr = state.addPosition({ stromkreisNr: 'F1' });
      state.deletePosition(posNr);
      
      const result = state.deletePosition(posNr);
      expect(result).toBe(false);
    });

    test('handles deeply nested metadata paths', () => {
      state.setMetadataField('facility.custom.deep.value', 'test');
      
      const value = state.getMetadataField('facility.custom.deep.value');
      expect(value).toBe('test');
    });
  });
});
```

### Step 3: Create Documentation

Create `docs/state-api.md`:

```markdown
# Protokoll State API Documentation

## Overview

The `protokoll-state.js` module provides centralized state management for the Protokoll module using ES6 modules and a pub/sub event system.

## State Structure

```javascript
{
  metadata: {
    protokollNumber: string,
    datum: ISO-string,
    auftraggeber: string,
    facility: { ... },
    prüfer: { ... },
    // ... other fields
  },
  positions: [
    {
      posNr: string,
      stromkreisNr: string,
      messwerte: { ... },
      // ... other fields
    }
  ],
  prüfungsergebnis: {
    mängelFestgestellt: boolean,
    plakette: string,
    // ... other fields
  },
  formState: {
    currentStep: string,
    unsavedChanges: boolean,
    validationErrors: object,
    isDirty: boolean
  }
}
```

## API Methods

### Initialization
- `init()` - Initialize state
- `reset()` - Reset to defaults

### Metadata
- `getMetadata()` - Get entire metadata
- `setMetadata(metadata)` - Replace metadata
- `getMetadataField(path)` - Get single field
- `setMetadataField(path, value)` - Set single field

### Positions
- `getPositions()` - Get all positions
- `addPosition(position)` - Add new position
- `getPosition(posNr)` - Get specific position
- `updatePosition(posNr, updates)` - Update position
- `deletePosition(posNr)` - Delete position

### Persistence
- `saveToLocalStorage()` - Debounced save
- `forceSave()` - Immediate save
- `loadFromLocalStorage()` - Load from storage
- `clearLocalStorage()` - Clear all storage

### Events
- `on(eventName, callback)` - Subscribe
- `off(eventName, callback)` - Unsubscribe
- `emit(eventName, data)` - Emit event

## Event Types

- `metadataChanged`
- `metadataFieldChanged`
- `positionAdded`
- `positionUpdated`
- `positionDeleted`
- `formStepChanged`
- `validationErrorChanged`
- `stateSaved`
- `stateLoaded`
```

---

## Phase 1 Completion Criteria

✓ All functions implemented with JSDoc
✓ 100% test coverage (40+ unit tests)
✓ No console errors on initialization
✓ localStorage persistence working
✓ Event system fully functional
✓ Immutability enforced (deep copies)
✓ Complete API documentation
✓ Error handling for edge cases

---

## Phase 1 Deliverables

1. **`js/protokoll/protokoll-state.js`** - Complete state management module
2. **`js/test/protokoll-state.test.js`** - Comprehensive unit tests
3. **`docs/state-api.md`** - Complete API documentation
4. **Test Results** - All tests passing
5. **Code Review** - Ready for Phase 2 dependencies

---

## Next Phase: Phase 2 - Event Handlers

Once Phase 1 is complete, Phase 2 will build the handlers module that uses this state management system to handle user interactions.

---

## Testing Instructions

```bash
# Run tests
npm test -- protokoll-state.test.js

# Run with coverage
npm test -- --coverage protokoll-state.test.js

# Watch mode
npm test -- --watch protokoll-state.test.js
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| State not persisting | localStorage quota | Clear old drafts |
| Events not firing | Listener not registered | Check event name spelling |
| Nested values undefined | Wrong path syntax | Use dot notation: "a.b.c" |
| Performance slow | Too many listeners | Unsubscribe unused listeners |

---

**Phase 1 Status:** ✓ Ready for Implementation
