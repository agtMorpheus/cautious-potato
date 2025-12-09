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

  // Note: contracts section is optional (Phase 1 addition)
  // If present, validate its structure
  if (state.contracts) {
    const contractValidation = validateContractsSection(state.contracts);
    if (!contractValidation.valid) {
      errors.push(...contractValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================
// Contract Manager Validation Functions (Phase 1)
// ============================================================

/**
 * Validate contracts state section
 * @param {Object} contracts - Contracts state section
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateContractsSection(contracts) {
  const errors = [];

  if (!contracts || typeof contracts !== 'object') {
    return { valid: false, errors: ['Contracts section is missing or invalid'] };
  }

  // Validate importedFiles is an array
  if (contracts.importedFiles && !Array.isArray(contracts.importedFiles)) {
    errors.push('contracts.importedFiles must be an array');
  }

  // Validate records is an array
  if (contracts.records && !Array.isArray(contracts.records)) {
    errors.push('contracts.records must be an array');
  }

  // Validate filters structure if present
  if (contracts.filters && typeof contracts.filters !== 'object') {
    errors.push('contracts.filters must be an object');
  }

  // Validate importState structure if present
  if (contracts.importState && typeof contracts.importState !== 'object') {
    errors.push('contracts.importState must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single contract record
 * @param {Object} contract - Contract object to validate
 * @returns {Object} Validation result with valid flag, errors array, and warnings array
 */
export function validateContractRecord(contract) {
  const errors = [];
  const warnings = [];

  if (!contract || typeof contract !== 'object') {
    return { valid: false, errors: ['Contract must be an object'], warnings: [] };
  }

  // Required fields
  if (!contract.contractId || String(contract.contractId).trim() === '') {
    errors.push('Contract ID is required');
  }

  if (!contract.contractTitle || String(contract.contractTitle).trim() === '') {
    errors.push('Contract title is required');
  }

  if (!contract.status || String(contract.status).trim() === '') {
    errors.push('Status is required');
  }

  // Validate status value
  if (contract.status) {
    const validStatuses = ['inbearb', 'fertig', 'offen'];
    const normalizedStatus = String(contract.status).toLowerCase().trim();
    if (!validStatuses.includes(normalizedStatus)) {
      warnings.push(`Unknown status value: "${contract.status}"`);
    }
  }

  // Validate date format if present
  if (contract.plannedStart) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof contract.plannedStart === 'string' && !datePattern.test(contract.plannedStart)) {
      warnings.push('Planned start date has invalid format (expected YYYY-MM-DD)');
    }
  }

  // Validate UUID format for id if present
  if (contract.id) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(contract.id)) {
      warnings.push('Contract ID is not a valid UUID format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate contract column mapping configuration
 * @param {Object} mapping - Column mapping object
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateContractMapping(mapping) {
  const errors = [];
  const warnings = [];

  if (!mapping || typeof mapping !== 'object') {
    return { valid: false, errors: ['Mapping must be an object'], warnings: [] };
  }

  // Check required fields have mappings
  const requiredFields = ['contractId', 'contractTitle', 'status'];
  
  for (const field of requiredFields) {
    if (!mapping[field] || !mapping[field].excelColumn) {
      errors.push(`Required field "${field}" is not mapped to any column`);
    }
  }

  // Validate column letter format
  const columnPattern = /^[A-Z]{1,3}$/;
  for (const [field, config] of Object.entries(mapping)) {
    if (config && config.excelColumn) {
      if (!columnPattern.test(config.excelColumn)) {
        errors.push(`Invalid column format for field "${field}": ${config.excelColumn}`);
      }
    }
  }

  // Check for duplicate column mappings
  const usedColumns = new Map();
  for (const [field, config] of Object.entries(mapping)) {
    if (config && config.excelColumn) {
      if (usedColumns.has(config.excelColumn)) {
        warnings.push(`Column ${config.excelColumn} is mapped to multiple fields: ${usedColumns.get(config.excelColumn)} and ${field}`);
      } else {
        usedColumns.set(config.excelColumn, field);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate contract import file metadata
 * @param {Object} fileInfo - File metadata object
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateContractFileInfo(fileInfo) {
  const errors = [];

  if (!fileInfo || typeof fileInfo !== 'object') {
    return { valid: false, errors: ['File info must be an object'] };
  }

  if (!fileInfo.fileName || typeof fileInfo.fileName !== 'string') {
    errors.push('File name is required');
  }

  if (typeof fileInfo.size !== 'number' || fileInfo.size < 0) {
    errors.push('File size must be a non-negative number');
  }

  if (typeof fileInfo.recordsImported !== 'number' || fileInfo.recordsImported < 0) {
    errors.push('Records imported must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
