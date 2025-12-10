/**
 * Measurement Validator Module
 * Circuit Measurement Validator for German Industrial Electrical Installations
 * 
 * This module provides real-time validation of electrical circuit designs
 * against DIN VDE 0100 series standards.
 * 
 * @module measurement-validator
 * @version 1.0.0
 */

// Libraries
export { CableLibrary, cableLibrary } from './libraries/cableLibrary.js';
export { ProtectionLibrary, protectionLibrary } from './libraries/protectionLibrary.js';
export { StandardsData, standardsData } from './libraries/standardsData.js';

// Validators
export { 
  validationRules,
  cableAmpacityRule,
  voltageDropRule,
  protectionDeviceSizingRule,
  loopImpedanceRule,
  voltageRangeRule,
  cableVoltageRatingRule,
  selectiveCoordinationRule,
  getRuleByCode,
  getRulesByCategory,
  getRulesBySeverity
} from './validators/validationRules.js';

// Engine
export { ValidationEngine, validationEngine } from './engine/validationEngine.js';

// Result Formatter
export {
  formatNonConformity,
  getSeverityLabel,
  generateMessage,
  formatDetails,
  formatRemediation,
  formatResultsSummary,
  formatBatchSummary,
  formatForExport,
  generateNonConformityHTML,
  generateStatusBadgeHTML
} from './engine/resultFormatter.js';

/**
 * ValidationDebouncer class for real-time validation with debouncing
 * Prevents excessive validation calls during rapid user input
 */
export class ValidationDebouncer {
  /**
   * Create a new ValidationDebouncer
   * @param {ValidationEngine} engine - Validation engine instance
   * @param {number} debounceMs - Debounce delay in milliseconds (default 300)
   */
  constructor(engine, debounceMs = 300) {
    this.engine = engine;
    this.debounceMs = debounceMs;
    this.pendingValidations = new Map();
  }

  /**
   * Schedule validation with debouncing
   * @param {string} circuitId - Circuit identifier
   * @param {Object} circuitData - Circuit data to validate
   * @param {Function} callback - Callback function for results (optional)
   * @returns {Promise} Promise that resolves with validation results
   */
  scheduleValidation(circuitId, circuitData, callback = null) {
    return new Promise((resolve) => {
      // Cancel previous timeout if exists
      if (this.pendingValidations.has(circuitId)) {
        clearTimeout(this.pendingValidations.get(circuitId).timeoutId);
      }

      // Schedule new validation
      const timeoutId = setTimeout(() => {
        const results = this.engine.validateCircuit(circuitData);
        
        // Call callback if provided
        if (callback) {
          callback(results);
        }
        
        // Dispatch event for UI update
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('validationComplete', {
              detail: { circuitId, results }
            })
          );
        }
        
        // Clean up
        this.pendingValidations.delete(circuitId);
        
        resolve(results);
      }, this.debounceMs);

      this.pendingValidations.set(circuitId, {
        timeoutId,
        circuitData
      });
    });
  }

  /**
   * Cancel pending validation for a circuit
   * @param {string} circuitId - Circuit identifier
   */
  cancelValidation(circuitId) {
    if (this.pendingValidations.has(circuitId)) {
      clearTimeout(this.pendingValidations.get(circuitId).timeoutId);
      this.pendingValidations.delete(circuitId);
    }
  }

  /**
   * Cancel all pending validations
   */
  cancelAll() {
    for (const [circuitId, pending] of this.pendingValidations) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingValidations.clear();
  }

  /**
   * Get count of pending validations
   * @returns {number} Number of pending validations
   */
  getPendingCount() {
    return this.pendingValidations.size;
  }

  /**
   * Check if a circuit has pending validation
   * @param {string} circuitId - Circuit identifier
   * @returns {boolean} True if validation is pending
   */
  isPending(circuitId) {
    return this.pendingValidations.has(circuitId);
  }
}

/**
 * Create a configured validation system
 * @param {Object} options - Configuration options
 * @returns {Object} Configured validation system
 */
export function createValidationSystem(options = {}) {
  const {
    debounceMs = 300,
    useCache = true,
    validateInputs = true
  } = options;

  const { ValidationEngine } = require('./engine/validationEngine.js');
  
  const engine = new ValidationEngine();
  const debouncer = new ValidationDebouncer(engine, debounceMs);

  return {
    engine,
    debouncer,
    
    /**
     * Validate a circuit with debouncing
     * @param {Object} circuitData - Circuit data
     * @param {Function} callback - Optional callback
     * @returns {Promise} Validation results
     */
    validate: (circuitData, callback) => {
      return debouncer.scheduleValidation(
        circuitData.id || 'default',
        circuitData,
        callback
      );
    },

    /**
     * Validate a circuit immediately (no debouncing)
     * @param {Object} circuitData - Circuit data
     * @returns {Object} Validation results
     */
    validateImmediate: (circuitData) => {
      return engine.validateCircuit(circuitData, { useCache, validateInputs });
    },

    /**
     * Validate all circuits
     * @param {Object[]} circuits - Array of circuit data
     * @returns {Object} Batch validation results
     */
    validateAll: (circuits) => {
      return engine.validateAllCircuits(circuits);
    },

    /**
     * Clear validation cache
     */
    clearCache: () => {
      engine.clearCache();
    },

    /**
     * Get validation metrics
     * @returns {Object} Metrics
     */
    getMetrics: () => {
      return engine.getMetrics();
    }
  };
}
