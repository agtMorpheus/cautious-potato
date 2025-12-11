/**
 * protokoll-handlers.js
 * 
 * Event handlers for user interactions with the protokoll form.
 * Coordinates between DOM events, validation, state management, and UI updates.
 */

import * as state from './protokoll-state.js';
import * as validator from './protokoll-validator.js';

// ============================================
// INITIALIZATION
// ============================================

let documentListenersAttached = false;

/**
 * Initialize event handlers
 * @returns {void}
 */
export function init() {
  console.log('Initializing Protokoll Handlers');
  
  // Delegate form events
  setupEventDelegation();
  
  // Listen to state changes
  setupStateListeners();
  
  console.log('✓ Event handlers initialized');
}

/**
 * Set up event delegation on the form container
 * @returns {void}
 */
function setupEventDelegation() {
  const container = document.getElementById('protokollFormContainer');
  if (!container) {
    console.warn('Protokoll form container not found');
    return;
  }

  // Listen for input changes
  // It's safe to add listeners to container as it's usually a new element in tests
  container.addEventListener('change', handleFieldChange);
  container.addEventListener('input', handleFieldInput);
  container.addEventListener('blur', handleFieldBlur, true);

  // Listen for button clicks (on document)
  // Only attach once to prevent duplicate listeners
  if (!documentListenersAttached) {
    document.addEventListener('click', handleButtonClick);
    documentListenersAttached = true;
  }
}

/**
 * Set up listeners for state change events
 * @returns {void}
 */
function setupStateListeners() {
  state.on('metadataFieldChanged', ({ fieldPath, value }) => {
    // Emit custom event for renderer to update field
    document.dispatchEvent(new CustomEvent('protokoll:updateField', {
      detail: { fieldPath, value }
    }));
  });

  state.on('positionAdded', ({ position }) => {
    document.dispatchEvent(new CustomEvent('protokoll:addPosition', {
      detail: { position }
    }));
  });

  state.on('positionUpdated', ({ posNr, position }) => {
    document.dispatchEvent(new CustomEvent('protokoll:updatePosition', {
      detail: { posNr, position }
    }));
  });

  state.on('positionDeleted', ({ posNr }) => {
    document.dispatchEvent(new CustomEvent('protokoll:removePosition', {
      detail: { posNr }
    }));
  });

  state.on('formStepChanged', ({ newStep }) => {
    document.dispatchEvent(new CustomEvent('protokoll:stepChanged', {
      detail: { step: newStep }
    }));
  });

  state.on('validationErrorChanged', ({ fieldPath, error }) => {
    document.dispatchEvent(new CustomEvent('protokoll:validationError', {
      detail: { fieldPath, error }
    }));
  });
}

// ============================================
// FIELD EVENT HANDLERS
// ============================================

/**
 * Handle field change events
 * @param {Event} e - Change event
 * @returns {void}
 */
function handleFieldChange(e) {
  const { target } = e;
  const fieldPath = target.getAttribute('data-field');
  
  if (!fieldPath) return;

  const value = target.type === 'checkbox' ? target.checked : target.value;

  // Route to appropriate handler
  if (fieldPath.startsWith('metadata.')) {
    handleMetadataChange(fieldPath, value);
  } else if (fieldPath.startsWith('position.')) {
    const posNr = target.closest('[data-pos-nr]')?.getAttribute('data-pos-nr');
    if (posNr) {
      handlePositionChange(posNr, fieldPath, value);
    }
  } else if (fieldPath.startsWith('results.')) {
    handleResultsChange(fieldPath, value);
  }
}

/**
 * Handle real-time input events for validation
 * @param {Event} e - Input event
 * @returns {void}
 */
function handleFieldInput(e) {
  const { target } = e;
  const fieldPath = target.getAttribute('data-field');
  
  if (!fieldPath) return;

  const value = target.type === 'checkbox' ? target.checked : target.value;

  // Update state in real-time for text inputs
  if (target.type === 'text' || target.type === 'email' || target.type === 'tel') {
    // Route to appropriate handler
    if (fieldPath.startsWith('metadata.')) {
      handleMetadataChange(fieldPath, value);
    } else if (fieldPath.startsWith('position.')) {
      const posNr = target.closest('[data-pos-nr]')?.getAttribute('data-pos-nr');
      if (posNr) {
        handlePositionChange(posNr, fieldPath, value);
      }
    } else if (fieldPath.startsWith('results.')) {
      handleResultsChange(fieldPath, value);
    }
  } else {
    // For non-text inputs, just do validation
    const result = validator.validateField(fieldPath, value);

    if (!result.isValid) {
      state.setValidationError(fieldPath, result.error);
    } else {
      state.setValidationError(fieldPath, null);
    }
  }
}

/**
 * Handle field blur events for final validation
 * @param {Event} e - Blur event
 * @returns {void}
 */
function handleFieldBlur(e) {
  const { target } = e;
  const fieldPath = target.getAttribute('data-field');
  
  if (!fieldPath) return;

  // Final validation on blur
  const value = target.value;
  const result = validator.validateField(fieldPath, value);

  state.setValidationError(fieldPath, result.isValid ? null : result.error);
}

// ============================================
// METADATA HANDLERS
// ============================================

/**
 * Handle metadata field changes
 * @param {string} fieldPath - Field path
 * @param {any} value - New value
 * @returns {void}
 */
export function handleMetadataChange(fieldPath, value) {
  // Validate
  const result = validator.validateField(fieldPath, value);

  if (result.isValid) {
    // Update state - extract field name from path like "metadata.auftraggeber"
    const field = fieldPath.replace('metadata.', '');
    state.setMetadataField(field, value);
    
    // Clear error if any
    state.setValidationError(fieldPath, null);
  } else {
    // Show error
    state.setValidationError(fieldPath, result.error);
  }
}

/**
 * Handle inspection type toggle
 * @param {string} type - Inspection type
 * @param {boolean} isSelected - Whether selected
 * @returns {void}
 */
export function handleInspectionTypeToggle(type, isSelected) {
  const current = state.getMetadataField('facility.prüfArt') || [];
  
  if (isSelected) {
    if (!current.includes(type)) {
      current.push(type);
    }
  } else {
    const index = current.indexOf(type);
    if (index > -1) {
      current.splice(index, 1);
    }
  }

  state.setMetadataField('facility.prüfArt', current);
}

// ============================================
// POSITION HANDLERS
// ============================================

/**
 * Handle adding a new position
 * @param {Object} options - Optional position configuration
 * @param {string} options.phaseType - Phase type ('mono', 'bi', 'tri')
 * @param {string} options.parentCircuitId - Parent circuit ID for tree hierarchy
 * @returns {string} Position number of new position
 */
export function handleAddPosition(options = {}) {
  const newPosition = {
    stromkreisNr: '',
    zielbezeichnung: '',
    phaseType: options.phaseType || 'mono',
    parentCircuitId: options.parentCircuitId || null,
    leitung: { typ: '', anzahl: '', querschnitt: '' },
    spannung: { un: '', fn: 50 },
    überstromschutz: { art: '', inNennstrom: '' },
    messwerte: { riso: '', differenzstrom: '' },
    prüfergebnis: { status: 'nicht-geprüft', mängel: [] }
  };

  const posNr = state.addPosition(newPosition);
  return posNr;
}

/**
 * Handle deleting a position
 * @param {string} posNr - Position number to delete
 * @param {boolean} skipConfirm - Skip confirmation dialog
 * @returns {boolean} Success
 */
export function handleDeletePosition(posNr, skipConfirm = false) {
  if (!skipConfirm) {
    const position = state.getPosition(posNr);
    const positionLabel = position?.stromkreisNr || posNr;
    const confirmed = confirm(`Position "${positionLabel}" löschen?`);
    if (!confirmed) {
      return false;
    }
  }

  return state.deletePosition(posNr);
}

/**
 * Add child position to a parent circuit
 * @param {string} parentPosNr - Parent position number
 * @returns {string} Position number of new child position
 */
export function handleAddChildPosition(parentPosNr) {
  const parentPosition = state.getPosition(parentPosNr);
  if (!parentPosition) {
    console.error(`Parent position not found: ${parentPosNr}`);
    return null;
  }

  const newPosition = {
    stromkreisNr: '', // Will be auto-generated
    zielbezeichnung: '',
    phaseType: 'mono',
    parentCircuitId: parentPosNr,
    leitung: {
      typ: '',
      anzahl: '',
      querschnitt: ''
    },
    spannung: {
      un: '',
      fn: ''
    },
    überstromschutz: {
      art: '',
      inNennstrom: '',
      zs: '',
      zn: '',
      ik: ''
    },
    messwerte: {
      riso: '',
      schutzleiterWiderstand: '',
      rcd: '',
      differenzstrom: '',
      auslösezeit: ''
    },
    prüfergebnis: {
      status: 'nicht-geprüft',
      mängel: [],
      bemerkung: ''
    }
  };

  return state.addPosition(newPosition);
}

/**
 * Handle position field changes
 * @param {string} posNr - Position number
 * @param {string} fieldPath - Field path
 * @param {any} value - New value
 * @returns {void}
 */
export function handlePositionChange(posNr, fieldPath, value) {
  const position = state.getPosition(posNr);
  if (!position) return;

  // Extract nested field
  const field = fieldPath.replace('position.', '');
  
  // Set nested value
  setNestedValue(position, field, value);
  
  // Always update the position in state
  state.updatePosition(posNr, position);
  
  // Validate the specific field
  const fieldResult = validator.validateField(fieldPath, value);
  
  if (fieldResult.isValid) {
    state.setValidationError(fieldPath, null);
  } else {
    state.setValidationError(fieldPath, fieldResult.error);
  }
}

// ============================================
// RESULTS HANDLERS
// ============================================

/**
 * Handle results field changes
 * @param {string} fieldPath - Field path
 * @param {any} value - New value
 * @returns {void}
 */
export function handleResultsChange(fieldPath, value) {
  const field = fieldPath.replace('results.', '');
  
  const result = validator.validateField(`prüfungsergebnis.${field}`, value);

  if (result.isValid) {
    state.setPrüfungsergebnis({ [field]: value });
    state.setValidationError(fieldPath, null);
  } else {
    state.setValidationError(fieldPath, result.error);
  }
}

// ============================================
// FORM NAVIGATION
// ============================================

const FORM_STEPS = ['metadata', 'besichtigung', 'erproben', 'messen', 'positions', 'results', 'review'];

/**
 * Handle going to previous step
 * @returns {boolean} Success
 */
export function handlePreviousStep() {
  const current = state.getCurrentStep();
  const currentIndex = FORM_STEPS.indexOf(current);

  if (currentIndex > 0) {
    state.setFormStep(FORM_STEPS[currentIndex - 1]);
    return true;
  }
  
  return false;
}

/**
 * Handle going to next step
 * @returns {boolean} Success
 */
export function handleNextStep() {
  const current = state.getCurrentStep();
  const currentIndex = FORM_STEPS.indexOf(current);

  // Validate current step before advancing
  let validationResult;

  if (current === 'metadata') {
    validationResult = validator.validateMetadataStep();
    if (!validationResult.isValid) {
      state.setValidationErrors(validationResult.errors);
      document.dispatchEvent(new CustomEvent('protokoll:validationFailed', {
        detail: { step: 'metadata', errors: validationResult.errors }
      }));
      return false;
    }
  } else if (current === 'positions') {
    validationResult = validator.validatePositionsStep();
    if (!validationResult.isValid) {
      document.dispatchEvent(new CustomEvent('protokoll:validationFailed', {
        detail: { step: 'positions', errors: validationResult.errors }
      }));
      return false;
    }
  } else if (current === 'results') {
    validationResult = validator.validateResultsStep();
    if (!validationResult.isValid) {
      state.setValidationErrors(validationResult.errors);
      document.dispatchEvent(new CustomEvent('protokoll:validationFailed', {
        detail: { step: 'results', errors: validationResult.errors }
      }));
      return false;
    }
  }
  // Note: besichtigung, erproben, messen steps don't require strict validation

  // Move to next step
  if (currentIndex < FORM_STEPS.length - 1) {
    state.setFormStep(FORM_STEPS[currentIndex + 1]);
    return true;
  }
  
  return false;
}

/**
 * Handle jumping to a specific step
 * @param {string} step - Step to jump to
 * @returns {boolean} Success
 */
export function handleGoToStep(step) {
  if (!FORM_STEPS.includes(step)) {
    console.error(`Invalid step: ${step}`);
    return false;
  }
  
  state.setFormStep(step);
  return true;
}

// ============================================
// EXPORT HANDLERS
// ============================================

/**
 * Handle export action
 * @returns {Promise<boolean>} Success
 */
export async function handleExport() {
  // Validate entire form
  const validation = validator.validateForm();

  if (!validation.isValid) {
    document.dispatchEvent(new CustomEvent('protokoll:message', {
      detail: { type: 'error', message: validation.summary }
    }));
    document.dispatchEvent(new CustomEvent('protokoll:validationFailed', {
      detail: { errors: validation.errors }
    }));
    return false;
  }

  // Show loading state
  document.dispatchEvent(new CustomEvent('protokoll:loading', {
    detail: { loading: true }
  }));

  try {
    // Export logic will be handled in Phase 3 (Exporter)
    // For now, just emit event
    document.dispatchEvent(new CustomEvent('protokoll:export', {
      detail: { state: state.getState() }
    }));

    document.dispatchEvent(new CustomEvent('protokoll:loading', {
      detail: { loading: false }
    }));
    document.dispatchEvent(new CustomEvent('protokoll:message', {
      detail: { type: 'success', message: 'Export successful!' }
    }));
    
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    document.dispatchEvent(new CustomEvent('protokoll:loading', {
      detail: { loading: false }
    }));
    document.dispatchEvent(new CustomEvent('protokoll:message', {
      detail: { type: 'error', message: `Export failed: ${error.message}` }
    }));
    
    return false;
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
  const button = e.target.closest('[data-action]');
  if (!button) return;

  const action = button.getAttribute('data-action');

  switch (action) {
    case 'add-position':
      handleAddPosition();
      break;
    case 'add-child-position':
      const parentPosNr = button.getAttribute('data-pos-nr');
      if (parentPosNr) {
        handleAddChildPosition(parentPosNr);
      }
      break;
    case 'delete-position':
      const deletePosNr = button.getAttribute('data-pos-nr');
      if (deletePosNr) {
        handleDeletePosition(deletePosNr);
      }
      break;
    case 'previous-step':
      handlePreviousStep();
      break;
    case 'next-step':
      handleNextStep();
      break;
    case 'export':
      handleExport();
      break;
    case 'reset':
      handleReset();
      break;
  }
}

/**
 * Handle form reset
 * @param {boolean} skipConfirm - Skip confirmation dialog
 * @returns {boolean} Success
 */
export function handleReset(skipConfirm = false) {
  if (!skipConfirm) {
    const confirmed = confirm(
      'This will clear all form data. Are you sure?'
    );
    if (!confirmed) {
      return false;
    }
  }

  state.reset();
  document.dispatchEvent(new CustomEvent('protokoll:reset', {}));
  
  return true;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Set nested value in an object using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {any} value - Value to set
 * @returns {void}
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  // Guard against prototype pollution
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];

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

  current[finalKey] = value;
}

console.log('✓ Protokoll Handlers module loaded');
