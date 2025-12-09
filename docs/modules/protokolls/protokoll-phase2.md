# Protokoll Module - Phase 2: Event Handlers & Validation Implementation

## Overview

**Phase 2** builds the event handling layer and validation system for the Protokoll Module. This phase connects user interactions to state management and ensures data integrity through comprehensive validation.

**Duration:** 1-2 weeks
**Deliverable:** Fully functional `protokoll-handlers.js` and `protokoll-validator.js` modules with complete test coverage
**Dependencies:** Phase 1 (State Management)
**Blocks:** Phase 3, 4, 5

---

## Phase 2 Objectives

1. ✓ Create event handler system
2. ✓ Implement comprehensive validation rules
3. ✓ Wire up form event listeners
4. ✓ Handle user interactions
5. ✓ Display validation errors
6. ✓ Coordinate between state and renderer

---

## File Structure

```
js/protokoll/
├── protokoll-state.js          (from Phase 1)
├── protokoll-handlers.js       (← This phase)
├── protokoll-validator.js      (← This phase)
└── test/
    ├── protokoll-handlers.test.js
    └── protokoll-validator.test.js
```

---

## Part 1: Validation Layer - protokoll-validator.js

### Implementation Guide

```javascript
/**
 * protokoll-validator.js
 * 
 * Validation rules and logic for the Protokoll module.
 * Handles field-level, position-level, and form-wide validation.
 * Returns detailed error messages and validation state.
 */

import * as state from './protokoll-state.js';

// ============================================
// VALIDATION RULES CONFIGURATION
// ============================================

const VALIDATION_RULES = {
  // Metadata validation rules
  'metadata.protokollNumber': {
    required: true,
    pattern: /^[A-Z0-9]{3,20}$/,
    message: 'Protocol number must be 3-20 alphanumeric characters'
  },

  'metadata.datum': {
    required: true,
    type: 'date',
    message: 'Date is required'
  },

  'metadata.auftraggeber': {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Client name must be 3-100 characters'
  },

  'metadata.auftragnummer': {
    required: false,
    pattern: /^[A-Z0-9]*$/,
    message: 'Order number must be alphanumeric'
  },

  'metadata.facility.name': {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Facility name must be 2-100 characters'
  },

  'metadata.facility.address': {
    required: true,
    minLength: 5,
    message: 'Address is required'
  },

  'metadata.facility.netzspannung': {
    required: true,
    enum: ['230/400', '400/230', '230V', '400V'],
    message: 'Select a valid network voltage'
  },

  'metadata.facility.netzform': {
    required: true,
    enum: ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'],
    message: 'Select a valid network form'
  },

  'metadata.prüfer.name': {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Inspector name is required'
  },

  // Position validation rules
  'position.stromkreisNr': {
    required: true,
    pattern: /^[F0-9]{1,3}$/,
    message: 'Circuit number must be 1-3 alphanumeric characters'
  },

  'position.zielbezeichnung': {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Target designation must be 3-100 characters'
  },

  'position.spannung.un': {
    required: true,
    type: 'number',
    min: 0,
    max: 1000,
    message: 'Voltage must be 0-1000V'
  },

  'position.spannung.fn': {
    required: true,
    enum: [50, 60],
    message: 'Frequency must be 50 or 60 Hz'
  },

  'position.messwerte.riso': {
    required: true,
    type: 'number',
    min: 0,
    message: 'Insulation resistance must be >= 0'
  },

  // Results validation
  'prüfungsergebnis.nächsterPrüfungstermin': {
    required: true,
    type: 'date',
    future: true,
    message: 'Next inspection date must be in the future'
  }
};

// ============================================
// FIELD-LEVEL VALIDATION
// ============================================

/**
 * Validate single field value
 * @param {string} fieldPath - Field path
 * @param {any} value - Value to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateField(fieldPath, value) {
  const rules = VALIDATION_RULES[fieldPath];
  
  // No rules defined for this field
  if (!rules) {
    return { isValid: true, error: null };
  }

  // Check required
  if (rules.required && isEmpty(value)) {
    return {
      isValid: false,
      error: `${fieldPath.split('.').pop()} is required`
    };
  }

  // Skip other checks if not required and empty
  if (!rules.required && isEmpty(value)) {
    return { isValid: true, error: null };
  }

  // Check type
  if (rules.type === 'number' && isNaN(value)) {
    return {
      isValid: false,
      error: 'Must be a number'
    };
  }

  if (rules.type === 'date') {
    if (isNaN(Date.parse(value))) {
      return {
        isValid: false,
        error: 'Must be a valid date'
      };
    }

    if (rules.future && new Date(value) <= new Date()) {
      return {
        isValid: false,
        error: 'Date must be in the future'
      };
    }
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(String(value))) {
    return {
      isValid: false,
      error: rules.message || 'Invalid format'
    };
  }

  // Check min/max for numbers
  if (rules.min !== undefined && Number(value) < rules.min) {
    return {
      isValid: false,
      error: `Must be at least ${rules.min}`
    };
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return {
      isValid: false,
      error: `Must be at most ${rules.max}`
    };
  }

  // Check min/max length
  if (rules.minLength && String(value).length < rules.minLength) {
    return {
      isValid: false,
      error: `Must be at least ${rules.minLength} characters`
    };
  }

  if (rules.maxLength && String(value).length > rules.maxLength) {
    return {
      isValid: false,
      error: `Must be at most ${rules.maxLength} characters`
    };
  }

  // Check enum
  if (rules.enum && !rules.enum.includes(value)) {
    return {
      isValid: false,
      error: rules.message || 'Invalid selection'
    };
  }

  return { isValid: true, error: null };
}

// ============================================
// POSITION-LEVEL VALIDATION
// ============================================

/**
 * Validate single position object
 * @param {Object} position - Position object
 * @returns {{isValid: boolean, errors: Object}}
 */
export function validatePosition(position) {
  const errors = {};

  if (!position || typeof position !== 'object') {
    return {
      isValid: false,
      errors: { position: 'Invalid position object' }
    };
  }

  // Validate required fields
  const requiredFields = [
    'stromkreisNr',
    'zielbezeichnung',
    'spannung.un',
    'spannung.fn',
    'messwerte.riso'
  ];

  for (const field of requiredFields) {
    const value = getNestedValue(position, field);
    const result = validateField(`position.${field}`, value);

    if (!result.isValid) {
      errors[field] = result.error;
    }
  }

  // Check for duplicate circuit numbers
  const allPositions = state.getPositions();
  const duplicates = allPositions.filter(p => 
    p.stromkreisNr === position.stromkreisNr &&
    p.posNr !== position.posNr
  );

  if (duplicates.length > 0) {
    errors.stromkreisNr = 'Duplicate circuit number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate all positions
 * @param {Array} positions - Positions array
 * @returns {{isValid: boolean, errors: Array}}
 */
export function validateAllPositions(positions) {
  if (!Array.isArray(positions) || positions.length === 0) {
    return {
      isValid: false,
      errors: [{ message: 'At least one position is required' }]
    };
  }

  const errors = [];

  for (let i = 0; i < positions.length; i++) {
    const result = validatePosition(positions[i]);
    if (!result.isValid) {
      errors.push({
        posNr: positions[i].posNr,
        errors: result.errors
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================
// STEP-LEVEL VALIDATION
// ============================================

/**
 * Validate metadata step
 * @returns {{isValid: boolean, errors: Object}}
 */
export function validateMetadataStep() {
  const metadata = state.getMetadata();
  const errors = {};

  const requiredFields = [
    'protokollNumber',
    'auftraggeber',
    'facility.name',
    'facility.address',
    'facility.netzform',
    'prüfer.name'
  ];

  for (const field of requiredFields) {
    const value = getNestedValue(metadata, field);
    const result = validateField(`metadata.${field}`, value);

    if (!result.isValid) {
      errors[field] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate positions step
 * @returns {{isValid: boolean, errors: Array}}
 */
export function validatePositionsStep() {
  const positions = state.getPositions();
  return validateAllPositions(positions);
}

/**
 * Validate results step
 * @returns {{isValid: boolean, errors: Object}}
 */
export function validateResultsStep() {
  const results = state.getPrüfungsergebnis();
  const errors = {};

  const result = validateField('prüfungsergebnis.nächsterPrüfungstermin',
    results.nächsterPrüfungstermin
  );

  if (!result.isValid) {
    errors.nächsterPrüfungstermin = result.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate entire form before export
 * @returns {{isValid: boolean, errors: Object, summary: string}}
 */
export function validateForm() {
  const metadataValid = validateMetadataStep();
  const positionsValid = validatePositionsStep();
  const resultsValid = validateResultsStep();

  const allValid = metadataValid.isValid && 
                   positionsValid.isValid && 
                   resultsValid.isValid;

  const errorCount = 
    Object.keys(metadataValid.errors).length +
    positionsValid.errors.length +
    Object.keys(resultsValid.errors).length;

  return {
    isValid: allValid,
    errors: {
      metadata: metadataValid.errors,
      positions: positionsValid.errors,
      results: resultsValid.errors
    },
    summary: allValid ? 
      'Form is valid - ready to export' :
      `Form has ${errorCount} error(s) - please correct and retry`
  };
}

// ============================================
// SPECIAL VALIDATORS
// ============================================

/**
 * Validate measurement values for physics compliance
 * @param {Object} measurements - Measurement values
 * @returns {{isValid: boolean, warnings: Array}}
 */
export function validateMeasurements(measurements) {
  const warnings = [];

  // Check for suspiciously high insulation resistance
  if (measurements.riso === '>999' || measurements.riso > 999) {
    warnings.push('Insulation resistance exceeds 999 MΩ - verify measurement');
  }

  // Check for suspiciously low current
  if (measurements.differenzstrom < 0.01) {
    warnings.push('Differential current very low - verify measurement');
  }

  // Check for measurement consistency
  if (measurements.riso && measurements.differenzstrom) {
    const expectedCurrent = 230 / measurements.riso; // Basic Ohm's law
    if (Math.abs(expectedCurrent - measurements.differenzstrom) > 10) {
      warnings.push('Measurements may be inconsistent - verify values');
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Check for duplicate position numbers
 * @param {Array} positions - Positions array
 * @returns {Array} Array of duplicate position numbers
 */
export function checkForDuplicatePositions(positions) {
  const seen = new Set();
  const duplicates = [];

  for (const position of positions) {
    if (seen.has(position.stromkreisNr)) {
      duplicates.push(position.stromkreisNr);
    } else {
      seen.add(position.stromkreisNr);
    }
  }

  return duplicates;
}

/**
 * Get validation summary report
 * @returns {{totalErrors: number, errorsByField: Object, warnings: Array}}
 */
export function getValidationSummary() {
  const validation = validateForm();
  const errorCount = Object.keys(validation.errors.metadata).length +
                     validation.errors.positions.length +
                     Object.keys(validation.errors.results).length;

  return {
    totalErrors: errorCount,
    errorsByField: validation.errors,
    warnings: [],
    isValid: validation.isValid
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean} Is empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Get nested value using dot notation
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

console.log('✓ Protokoll Validator module loaded');
```

### Part 1.5: Validator Tests

```javascript
/**
 * protokoll-validator.test.js
 * Comprehensive validation tests
 */

import * as validator from '../protokoll/protokoll-validator.js';
import * as state from '../protokoll/protokoll-state.js';

describe('Protokoll Validator', () => {
  
  beforeEach(() => {
    state.init();
  });

  // ===== FIELD VALIDATION =====
  describe('Field Validation', () => {
    test('validates required fields', () => {
      const result = validator.validateField('metadata.auftraggeber', '');
      expect(result.isValid).toBe(false);
    });

    test('validates pattern matching', () => {
      const result = validator.validateField('metadata.protokollNumber', 'EDB101120250925');
      expect(result.isValid).toBe(true);
    });

    test('validates min/max length', () => {
      const result = validator.validateField('metadata.auftraggeber', 'AB');
      expect(result.isValid).toBe(false);
    });

    test('validates enum values', () => {
      const result = validator.validateField('metadata.facility.netzform', 'TN-S');
      expect(result.isValid).toBe(true);
    });

    test('validates number ranges', () => {
      const result = validator.validateField('position.spannung.un', 230);
      expect(result.isValid).toBe(true);
    });
  });

  // ===== POSITION VALIDATION =====
  describe('Position Validation', () => {
    test('validates complete position', () => {
      const position = {
        posNr: '001',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      };

      const result = validator.validatePosition(position);
      expect(result.isValid).toBe(true);
    });

    test('catches missing required fields', () => {
      const position = {
        posNr: '001',
        stromkreisNr: 'F1'
        // Missing zielbezeichnung
      };

      const result = validator.validatePosition(position);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length > 0).toBe(true);
    });
  });

  // ===== STEP VALIDATION =====
  describe('Step Validation', () => {
    test('validates metadata step', () => {
      state.setMetadataField('auftraggeber', 'Test Company');
      state.setMetadataField('facility.name', 'Test Facility');

      const result = validator.validateMetadataStep();
      expect(result.isValid).toBe(false); // Missing other required fields
    });

    test('validates form ready for export', () => {
      // Populate all required fields
      state.setMetadata({
        protokollNumber: 'EDB101120250925',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 1',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      // Add positions
      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      // Set results
      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365*24*60*60*1000).toISOString()
      });

      const result = validator.validateForm();
      expect(result.isValid).toBe(true);
    });
  });

  // ===== DUPLICATE DETECTION =====
  describe('Duplicate Detection', () => {
    test('detects duplicate circuit numbers', () => {
      state.addPosition({
        posNr: '001',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1'
      });

      state.addPosition({
        posNr: '002',
        stromkreisNr: 'F1', // Duplicate
        zielbezeichnung: 'Circuit 2'
      });

      const positions = state.getPositions();
      const duplicates = validator.checkForDuplicatePositions(positions);
      expect(duplicates).toContain('F1');
    });
  });
});
```

---

## Part 2: Event Handlers - protokoll-handlers.js

### Implementation Guide

```javascript
/**
 * protokoll-handlers.js
 * 
 * Event handlers for user interactions with the protokoll form.
 * Coordinates between DOM events, validation, state management, and UI updates.
 */

import * as state from './protokoll-state.js';
import * as validator from './protokoll-validator.js';
import * as renderer from './protokoll-renderer.js';

// ============================================
// INITIALIZATION
// ============================================

export function init() {
  console.log('Initializing Protokoll Handlers');
  
  // Delegate form events
  setupEventDelegation();
  
  // Listen to state changes
  setupStateListeners();
  
  console.log('✓ Event handlers initialized');
}

function setupEventDelegation() {
  const container = document.getElementById('protokollFormContainer');
  if (!container) {
    console.warn('Protokoll form container not found');
    return;
  }

  // Listen for input changes
  container.addEventListener('change', handleFieldChange);
  container.addEventListener('input', handleFieldInput);
  container.addEventListener('blur', handleFieldBlur);

  // Listen for button clicks
  document.addEventListener('click', handleButtonClick);
}

function setupStateListeners() {
  state.on('metadataFieldChanged', ({ fieldPath, value }) => {
    renderer.updateFieldValue(fieldPath, value);
  });

  state.on('positionAdded', ({ position }) => {
    renderer.addPositionRow(position);
  });

  state.on('positionUpdated', ({ posNr, position }) => {
    renderer.updatePositionRow(posNr, position);
  });

  state.on('positionDeleted', ({ posNr }) => {
    renderer.removePositionRow(posNr);
  });

  state.on('formStepChanged', ({ newStep }) => {
    renderer.renderStep(newStep);
  });

  state.on('validationErrorChanged', ({ fieldPath, error }) => {
    if (error) {
      renderer.displayFieldError(fieldPath, error);
    } else {
      renderer.clearFieldError(fieldPath);
    }
  });
}

// ============================================
// FIELD EVENT HANDLERS
// ============================================

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

function handleFieldInput(e) {
  const { target } = e;
  const fieldPath = target.getAttribute('data-field');
  
  if (!fieldPath) return;

  // Real-time validation
  const value = target.value;
  const result = validator.validateField(fieldPath, value);

  if (!result.isValid) {
    state.setValidationError(fieldPath, result.error);
  } else {
    state.setValidationError(fieldPath, null);
  }
}

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

export function handleMetadataChange(fieldPath, value) {
  // Validate
  const result = validator.validateField(fieldPath, value);

  if (result.isValid) {
    // Update state
    state.setMetadataField(fieldPath, value);
    
    // Clear error if any
    state.setValidationError(fieldPath, null);
  } else {
    // Show error
    state.setValidationError(fieldPath, result.error);
  }
}

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

export function handleAddPosition() {
  const newPosition = {
    stromkreisNr: '',
    zielbezeichnung: '',
    leitung: { typ: '', anzahl: '', querschnitt: '' },
    spannung: { un: '', fn: 50 },
    überstromschutz: { art: '', inNennstrom: '' },
    messwerte: { riso: '', differenzstrom: '' },
    prüfergebnis: { status: 'nicht-geprüft', mängel: [] }
  };

  const posNr = state.addPosition(newPosition);
  renderer.addPositionRow(state.getPosition(posNr));
}

export function handleDeletePosition(posNr) {
  const confirmed = confirm(`Delete position ${posNr}?`);
  
  if (confirmed) {
    state.deletePosition(posNr);
    renderer.removePositionRow(posNr);
  }
}

export function handlePositionChange(posNr, fieldPath, value) {
  const position = state.getPosition(posNr);
  if (!position) return;

  // Extract nested field
  const field = fieldPath.replace('position.', '');
  
  // Set nested value
  setNestedValue(position, field, value);
  
  // Validate position
  const result = validator.validatePosition(position);
  
  if (result.isValid) {
    state.updatePosition(posNr, position);
    state.setValidationError(fieldPath, null);
  } else {
    state.setValidationError(fieldPath, result.errors[field]);
  }
}

// ============================================
// RESULTS HANDLERS
// ============================================

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

export function handlePreviousStep() {
  const current = state.getCurrentStep();
  const steps = ['metadata', 'positions', 'results', 'review'];
  const currentIndex = steps.indexOf(current);

  if (currentIndex > 0) {
    state.setFormStep(steps[currentIndex - 1]);
  }
}

export function handleNextStep() {
  const current = state.getCurrentStep();
  const steps = ['metadata', 'positions', 'results', 'review'];
  const currentIndex = steps.indexOf(current);

  // Validate current step before advancing
  let isValid = false;

  if (current === 'metadata') {
    const result = validator.validateMetadataStep();
    isValid = result.isValid;
    if (!isValid) {
      state.setValidationErrors(result.errors);
      renderer.displayValidationErrors(result.errors);
      return;
    }
  } else if (current === 'positions') {
    const result = validator.validatePositionsStep();
    isValid = result.isValid;
    if (!isValid) {
      renderer.displayPositionErrors(result.errors);
      return;
    }
  } else if (current === 'results') {
    const result = validator.validateResultsStep();
    isValid = result.isValid;
    if (!isValid) {
      state.setValidationErrors(result.errors);
      return;
    }
  }

  // Move to next step
  if (currentIndex < steps.length - 1) {
    state.setFormStep(steps[currentIndex + 1]);
  }
}

// ============================================
// EXPORT HANDLERS
// ============================================

export async function handleExport() {
  // Validate entire form
  const validation = validator.validateForm();

  if (!validation.isValid) {
    renderer.displayMessage('error', validation.summary);
    renderer.displayValidationErrors(validation.errors);
    return;
  }

  // Show loading state
  renderer.showLoadingSpinner();

  try {
    // Export logic will be handled in Phase 3 (Exporter)
    // For now, just emit event
    document.dispatchEvent(new CustomEvent('protokoll:export', {
      detail: { state: state.getState() }
    }));

    renderer.hideLoadingSpinner();
    renderer.displayMessage('success', 'Export successful!');
  } catch (error) {
    console.error('Export failed:', error);
    renderer.hideLoadingSpinner();
    renderer.displayMessage('error', `Export failed: ${error.message}`);
  }
}

// ============================================
// BUTTON CLICK HANDLER
// ============================================

function handleButtonClick(e) {
  const button = e.target.closest('[data-action]');
  if (!button) return;

  const action = button.getAttribute('data-action');

  switch (action) {
    case 'add-position':
      handleAddPosition();
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

export function handleReset() {
  const confirmed = confirm(
    'This will clear all form data. Are you sure?'
  );

  if (confirmed) {
    state.reset();
    renderer.clearAllFields();
    renderer.renderMetadataForm();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

console.log('✓ Protokoll Handlers module loaded');
```

---

## Phase 2 Completion Criteria

✓ All validation rules implemented (50+ rules)
✓ Comprehensive test coverage (50+ tests)
✓ Field-level validation working
✓ Form-wide validation working
✓ Event delegation properly set up
✓ Error handling for all edge cases
✓ Complete API documentation
✓ No console errors on form interaction

---

## Phase 2 Deliverables

1. **`js/protokoll/protokoll-validator.js`** - Validation engine
2. **`js/protokoll/protokoll-handlers.js`** - Event handling system
3. **`js/test/protokoll-validator.test.js`** - Validator tests (40+ tests)
4. **`js/test/protokoll-handlers.test.js`** - Handler tests (30+ tests)
5. **`docs/validation-rules.md`** - Validation documentation
6. **`docs/handlers-api.md`** - Handler API documentation
7. **Test Results** - All tests passing
8. **Code Review** - Ready for Phase 3

---

## Phase 2 Integration Notes

- Requires Phase 1: State Management ✓
- Blocks Phase 3: Rendering
- Blocks Phase 4: Export
- Blocks Phase 5: Integration

---

## Next Phase: Phase 3 - Rendering & UI

Once Phase 2 is complete, Phase 3 will build the UI renderer that displays forms based on state and validation.

---

**Phase 2 Status:** ✓ Ready for Implementation
