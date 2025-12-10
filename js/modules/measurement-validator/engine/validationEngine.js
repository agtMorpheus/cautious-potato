/**
 * Validation Engine Module
 * Core validation orchestration for circuit measurement validation
 * 
 * Features:
 * - Rule execution with dependency checking
 * - Result caching for performance
 * - Real-time validation trigger support
 * - Performance metrics collection
 */

import { CableLibrary } from '../libraries/cableLibrary.js';
import { ProtectionLibrary } from '../libraries/protectionLibrary.js';
import { StandardsData } from '../libraries/standardsData.js';
import { validationRules } from '../validators/validationRules.js';

/**
 * ValidationEngine class - Core validation orchestration
 */
export class ValidationEngine {
  /**
   * Create a new ValidationEngine instance
   * @param {CableLibrary} cableLib - Cable library instance (optional, uses default)
   * @param {ProtectionLibrary} protectionLib - Protection library instance (optional)
   * @param {StandardsData} standardsData - Standards data instance (optional)
   */
  constructor(cableLib = null, protectionLib = null, standardsData = null) {
    this.cableLib = cableLib || new CableLibrary();
    this.protectionLib = protectionLib || new ProtectionLibrary();
    this.standardsData = standardsData || new StandardsData();
    
    // Register all rules
    this.rules = [...validationRules];
    
    // Result cache (LRU cache for performance)
    this.resultCache = new Map();
    this.maxCacheSize = 1000;
    
    // Execution metrics
    this.executionMetrics = {
      totalExecutions: 0,
      totalDuration: 0,
      avgDuration: 0,
      slowestExecution: 0,
      fastestExecution: Infinity,
    };
  }

  /**
   * Generate cache key for a circuit
   * @param {Object} circuitData - Circuit input data
   * @returns {string} Cache key
   */
  _generateCacheKey(circuitData) {
    // Create a deterministic key from circuit data
    const relevantFields = [
      'id', 'voltage', 'current', 'cableGauge', 'cableType',
      'distance', 'protectionCurrent', 'protectionDeviceType',
      'phasesCount', 'loadType', 'loopImpedance'
    ];
    
    const keyData = relevantFields
      .filter(field => circuitData[field] !== undefined)
      .map(field => `${field}:${circuitData[field]}`)
      .join('|');
    
    return keyData;
  }

  /**
   * Check if cached result is still valid
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result or null
   */
  _getCachedResult(cacheKey) {
    if (this.resultCache.has(cacheKey)) {
      const cached = this.resultCache.get(cacheKey);
      // Move to end (LRU behavior)
      this.resultCache.delete(cacheKey);
      this.resultCache.set(cacheKey, cached);
      return cached;
    }
    return null;
  }

  /**
   * Store result in cache with LRU eviction
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Result to cache
   */
  _setCachedResult(cacheKey, result) {
    // Evict oldest entry if cache is full
    if (this.resultCache.size >= this.maxCacheSize) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
    this.resultCache.set(cacheKey, result);
  }

  /**
   * Clear the result cache
   */
  clearCache() {
    this.resultCache.clear();
  }

  /**
   * Check if a rule can execute with available data
   * @param {Object} rule - Rule object
   * @param {Object} circuitData - Circuit input data
   * @returns {Object} Execution check result
   */
  canExecuteRule(rule, circuitData) {
    const missingFields = rule.triggers.requiredFields.filter(
      field => circuitData[field] === undefined || circuitData[field] === null
    );
    
    return {
      canExecute: missingFields.length === 0,
      missingFields,
      percentComplete: Number((
        ((rule.triggers.requiredFields.length - missingFields.length) /
        rule.triggers.requiredFields.length) * 100
      ).toFixed(0)),
    };
  }

  /**
   * Validate input value constraints
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @returns {Object} Validation result
   */
  validateInputValue(fieldName, value) {
    const constraints = {
      voltage: { min: 100, max: 1000, type: 'number' },
      current: { min: 0.1, max: 6300, type: 'number' },
      distance: { min: 0.1, max: 10000, type: 'number' },
      cableGauge: { 
        validValues: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240] 
      },
      protectionCurrent: { 
        validValues: [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250] 
      },
      phasesCount: { validValues: [1, 3] },
      loopImpedance: { min: 0.001, max: 100, type: 'number' },
      ambientTemp: { min: -40, max: 100, type: 'number' },
      powerFactor: { min: 0.1, max: 1.0, type: 'number' },
    };
    
    const constraint = constraints[fieldName];
    if (!constraint) return { valid: true };
    
    if (constraint.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: 'Must be a number' };
      }
      if (num < constraint.min) {
        return { valid: false, error: `Minimum value: ${constraint.min}` };
      }
      if (num > constraint.max) {
        return { valid: false, error: `Maximum value: ${constraint.max}` };
      }
    }
    
    if (constraint.validValues) {
      if (!constraint.validValues.includes(Number(value))) {
        return { 
          valid: false, 
          error: `Must be one of: ${constraint.validValues.join(', ')}` 
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * Validate a single circuit
   * @param {Object} circuitData - Circuit input data
   * @param {Object} options - Validation options { useCache: boolean, validateInputs: boolean }
   * @returns {Object} Validation results with non-conformities
   */
  validateCircuit(circuitData, { useCache = true, validateInputs = true } = {}) {
    const startTime = performance.now();
    
    // Check cache first
    if (useCache) {
      const cacheKey = this._generateCacheKey(circuitData);
      const cachedResult = this._getCachedResult(cacheKey);
      if (cachedResult) {
        return {
          ...cachedResult,
          fromCache: true
        };
      }
    }
    
    const results = {
      circuitId: circuitData.id || 'unknown',
      circuitName: circuitData.name || '',
      timestamp: new Date().toISOString(),
      nonConformities: [],
      inputErrors: [],
      summary: {
        totalRules: this.rules.length,
        rulesApplicable: 0,
        rulesExecuted: 0,
        compliant: [],
        nonCompliant: [],
        skipped: [],
      },
    };
    
    // Validate inputs if requested
    if (validateInputs) {
      for (const [field, value] of Object.entries(circuitData)) {
        const validation = this.validateInputValue(field, value);
        if (!validation.valid) {
          results.inputErrors.push({
            field,
            value,
            error: validation.error
          });
        }
      }
    }
    
    // Execute each rule
    for (const rule of this.rules) {
      try {
        // Check if rule can execute
        const executionCheck = this.canExecuteRule(rule, circuitData);
        
        if (!executionCheck.canExecute) {
          results.summary.skipped.push({
            code: rule.code,
            missingFields: executionCheck.missingFields
          });
          continue;
        }
        
        results.summary.rulesApplicable++;
        
        // Execute rule calculation
        const ruleResult = rule.calculate(
          circuitData,
          this.cableLib,
          this.protectionLib,
          this.standardsData
        );
        
        results.summary.rulesExecuted++;
        
        if (ruleResult.error) {
          // Rule execution error
          results.nonConformities.push({
            code: 'VALIDATION_ERROR',
            name: 'Validation execution error',
            severity: 'INFO',
            category: rule.category,
            message: ruleResult.error,
            ruleCode: rule.code
          });
          continue;
        }
        
        if (!ruleResult.compliant) {
          // Create non-conformity report
          const remedies = typeof rule.remedyOptions === 'function'
            ? rule.remedyOptions(ruleResult, circuitData, this.cableLib)
            : rule.remedyOptions || [];
          
          const nonConformity = {
            code: rule.code,
            name: rule.name,
            category: rule.category,
            severity: rule.severity,
            description: rule.description,
            actual: ruleResult.actual,
            limit: ruleResult.limit,
            unit: ruleResult.unit || '',
            compliant: false,
            normReference: rule.normReference,
            remedyOptions: remedies,
            calculationDetails: ruleResult,
          };
          
          results.nonConformities.push(nonConformity);
          results.summary.nonCompliant.push(rule.code);
        } else {
          results.summary.compliant.push(rule.code);
        }
      } catch (error) {
        results.nonConformities.push({
          code: 'VALIDATION_ERROR',
          name: 'Validation execution error',
          severity: 'CRITICAL',
          message: error.message,
          ruleCode: rule.code,
          stack: error.stack
        });
      }
    }
    
    // Calculate execution metrics
    const duration = performance.now() - startTime;
    this.executionMetrics.totalExecutions++;
    this.executionMetrics.totalDuration += duration;
    this.executionMetrics.avgDuration = 
      this.executionMetrics.totalDuration / this.executionMetrics.totalExecutions;
    this.executionMetrics.slowestExecution = 
      Math.max(this.executionMetrics.slowestExecution, duration);
    this.executionMetrics.fastestExecution = 
      Math.min(this.executionMetrics.fastestExecution, duration);
    
    results.performance = {
      executionTime: Number(duration.toFixed(2)),
      executionTimeUnit: 'ms',
    };
    
    // Determine overall validity
    results.isValid = results.nonConformities.filter(
      nc => nc.severity === 'CRITICAL'
    ).length === 0;
    
    results.hasWarnings = results.nonConformities.filter(
      nc => nc.severity === 'WARNING'
    ).length > 0;
    
    // Cache result
    if (useCache) {
      const cacheKey = this._generateCacheKey(circuitData);
      this._setCachedResult(cacheKey, results);
    }
    
    return results;
  }

  /**
   * Validate entire circuit table
   * @param {Object[]} circuitTable - Array of circuit data objects
   * @returns {Object} Batch validation results
   */
  validateAllCircuits(circuitTable) {
    const startTime = performance.now();
    
    const results = {
      timestamp: new Date().toISOString(),
      totalCircuits: circuitTable.length,
      validCircuits: 0,
      circuitsWithIssues: 0,
      criticalIssues: 0,
      warnings: 0,
      circuitResults: [],
    };
    
    for (const circuit of circuitTable) {
      const circuitResult = this.validateCircuit(circuit);
      results.circuitResults.push(circuitResult);
      
      if (circuitResult.nonConformities.length === 0) {
        results.validCircuits++;
      } else {
        results.circuitsWithIssues++;
        
        const criticalCount = circuitResult.nonConformities.filter(
          nc => nc.severity === 'CRITICAL'
        ).length;
        results.criticalIssues += criticalCount;
        
        const warningCount = circuitResult.nonConformities.filter(
          nc => nc.severity === 'WARNING'
        ).length;
        results.warnings += warningCount;
      }
    }
    
    const duration = performance.now() - startTime;
    results.performance = {
      totalTime: Number(duration.toFixed(2)),
      avgTimePerCircuit: Number((duration / circuitTable.length).toFixed(2)),
      unit: 'ms'
    };
    
    return results;
  }

  /**
   * Get rules applicable to circuit state
   * @param {Object} circuitData - Circuit input data
   * @returns {Object[]} Array of applicable rules
   */
  getApplicableRules(circuitData) {
    return this.rules.filter(rule => {
      const check = this.canExecuteRule(rule, circuitData);
      return check.canExecute;
    });
  }

  /**
   * Get rules that would be applicable with additional data
   * @param {Object} circuitData - Circuit input data
   * @returns {Object[]} Array of rules with missing fields info
   */
  getPendingRules(circuitData) {
    return this.rules
      .map(rule => {
        const check = this.canExecuteRule(rule, circuitData);
        if (!check.canExecute && check.percentComplete > 0) {
          return {
            rule,
            missingFields: check.missingFields,
            percentComplete: check.percentComplete
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  /**
   * Get execution metrics
   * @returns {Object} Execution metrics
   */
  getMetrics() {
    return { ...this.executionMetrics };
  }

  /**
   * Reset execution metrics
   */
  resetMetrics() {
    this.executionMetrics = {
      totalExecutions: 0,
      totalDuration: 0,
      avgDuration: 0,
      slowestExecution: 0,
      fastestExecution: Infinity,
    };
  }
}

// Export singleton instance for convenience
export const validationEngine = new ValidationEngine();
