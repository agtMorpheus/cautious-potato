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
