/**
 * Validation Module
 * 
 * Provides validation functions for state data structures
 * Ensures data integrity before storing in state or localStorage
 */

/**
 * Validate protokoll metadata
 * @param {Object} metadata - Metadata object to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateMetadata(metadata) {
  const errors = [];

  if (!metadata) {
    errors.push('Metadata is missing');
    return { valid: false, errors };
  }

  if (!metadata.protocolNumber) {
    errors.push('Protocol number is required');
  }

  if (!metadata.orderNumber) {
    errors.push('Order number is required');
  }

  if (!metadata.plant) {
    errors.push('Plant (Anlage) is required');
  }

  if (!metadata.location) {
    errors.push('Location (Einsatzort) is required');
  }

  if (!metadata.company) {
    errors.push('Company (Firma) is required');
  }

  if (!metadata.date) {
    errors.push('Date is required');
  } else if (isNaN(Date.parse(metadata.date))) {
    errors.push('Date must be a valid date string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate protokoll positions array
 * @param {Array} positionen - Array of position objects to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validatePositions(positionen) {
  const errors = [];

  if (!Array.isArray(positionen)) {
    return {
      valid: false,
      errors: ['Positions must be an array']
    };
  }

  positionen.forEach((pos, index) => {
    if (!pos || typeof pos !== 'object') {
      errors.push(`Position at index ${index} is not an object`);
      return;
    }

    if (!pos.posNr || typeof pos.posNr !== 'string') {
      errors.push(`Position at index ${index} has invalid posNr`);
    }

    if (typeof pos.menge !== 'number' || !Number.isFinite(pos.menge)) {
      errors.push(`Position at index ${index} has invalid menge`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate abrechnung data structure
 * @param {Object} abrechnungData - Abrechnung data object to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateAbrechnungData(abrechnungData) {
  const errors = [];

  if (!abrechnungData || typeof abrechnungData !== 'object') {
    return { valid: false, errors: ['abrechnungData is missing or invalid'] };
  }

  if (!abrechnungData.header) {
    errors.push('Abrechnung header is missing');
  }

  if (!abrechnungData.positionen || typeof abrechnungData.positionen !== 'object') {
    errors.push('Abrechnung positions must be an object map');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate UI status value
 * @param {string} status - Status value to validate
 * @returns {boolean} True if status is valid
 */
export function validateUIStatus(status) {
  const validStatuses = ['idle', 'pending', 'success', 'error'];
  return validStatuses.includes(status);
}

/**
 * Validate entire state structure for localStorage loading
 * @param {Object} state - State object to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateStateStructure(state) {
  const errors = [];

  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['State is missing or not an object'] };
  }

  // Check for required top-level keys
  const requiredKeys = ['protokollData', 'abrechnungData', 'ui', 'meta'];
  for (const key of requiredKeys) {
    if (!(key in state)) {
      errors.push(`Missing required state key: ${key}`);
    }
  }

  // Validate meta section
  if (state.meta) {
    if (!state.meta.version) {
      errors.push('State meta.version is missing');
    }
  }

  // Validate UI section structure
  if (state.ui) {
    const uiSections = ['import', 'generate', 'export'];
    for (const section of uiSections) {
      if (!state.ui[section] || typeof state.ui[section] !== 'object') {
        errors.push(`UI section '${section}' is missing or invalid`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
