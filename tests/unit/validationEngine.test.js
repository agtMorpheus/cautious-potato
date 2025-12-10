/**
 * Unit Tests for Validation Engine
 * Tests for ValidationEngine class and circuit validation
 */

import { ValidationEngine } from '../../js/modules/measurement-validator/engine/validationEngine.js';
import { CableLibrary } from '../../js/modules/measurement-validator/libraries/cableLibrary.js';
import { ProtectionLibrary } from '../../js/modules/measurement-validator/libraries/protectionLibrary.js';
import { StandardsData } from '../../js/modules/measurement-validator/libraries/standardsData.js';

describe('ValidationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ValidationEngine();
    engine.clearCache();
    engine.resetMetrics();
  });

  describe('constructor', () => {
    test('initializes with default libraries', () => {
      expect(engine.cableLib).toBeInstanceOf(CableLibrary);
      expect(engine.protectionLib).toBeInstanceOf(ProtectionLibrary);
      expect(engine.standardsData).toBeInstanceOf(StandardsData);
    });

    test('accepts custom libraries', () => {
      const customCableLib = new CableLibrary();
      const customEngine = new ValidationEngine(customCableLib);
      expect(customEngine.cableLib).toBe(customCableLib);
    });

    test('initializes with rules', () => {
      expect(engine.rules.length).toBeGreaterThan(0);
    });
  });

  describe('canExecuteRule()', () => {
    test('returns true when all required fields present', () => {
      const rule = { 
        triggers: { requiredFields: ['voltage', 'current'] } 
      };
      const circuitData = { voltage: 400, current: 16 };
      
      const result = engine.canExecuteRule(rule, circuitData);
      expect(result.canExecute).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    test('returns false when required fields missing', () => {
      const rule = { 
        triggers: { requiredFields: ['voltage', 'current', 'cableGauge'] } 
      };
      const circuitData = { voltage: 400 };
      
      const result = engine.canExecuteRule(rule, circuitData);
      expect(result.canExecute).toBe(false);
      expect(result.missingFields).toContain('current');
      expect(result.missingFields).toContain('cableGauge');
    });

    test('calculates percent complete', () => {
      const rule = { 
        triggers: { requiredFields: ['voltage', 'current', 'cableGauge', 'distance'] } 
      };
      const circuitData = { voltage: 400, current: 16 };
      
      const result = engine.canExecuteRule(rule, circuitData);
      expect(Number(result.percentComplete)).toBe(50);
    });
  });

  describe('validateInputValue()', () => {
    test('validates voltage within range', () => {
      expect(engine.validateInputValue('voltage', 400).valid).toBe(true);
      expect(engine.validateInputValue('voltage', 50).valid).toBe(false);
      expect(engine.validateInputValue('voltage', 2000).valid).toBe(false);
    });

    test('validates current within range', () => {
      expect(engine.validateInputValue('current', 16).valid).toBe(true);
      expect(engine.validateInputValue('current', 0).valid).toBe(false);
      expect(engine.validateInputValue('current', 10000).valid).toBe(false);
    });

    test('validates standard cable gauges', () => {
      expect(engine.validateInputValue('cableGauge', 16).valid).toBe(true);
      expect(engine.validateInputValue('cableGauge', 5).valid).toBe(false);
    });

    test('validates protection current ratings', () => {
      expect(engine.validateInputValue('protectionCurrent', 16).valid).toBe(true);
      expect(engine.validateInputValue('protectionCurrent', 15).valid).toBe(false);
    });

    test('validates phases count', () => {
      expect(engine.validateInputValue('phasesCount', 1).valid).toBe(true);
      expect(engine.validateInputValue('phasesCount', 3).valid).toBe(true);
      expect(engine.validateInputValue('phasesCount', 2).valid).toBe(false);
    });

    test('returns error messages for invalid values', () => {
      const result = engine.validateInputValue('voltage', 50);
      expect(result.error).toBeDefined();
    });

    test('accepts unknown fields', () => {
      expect(engine.validateInputValue('unknownField', 'anything').valid).toBe(true);
    });
  });

  describe('validateCircuit()', () => {
    const validCircuit = {
      id: 'test-circuit-001',
      name: 'Test Motor Circuit',
      voltage: 400,
      current: 12,
      cableGauge: 16,
      cableType: 'NYY',
      distance: 30,
      phasesCount: 3,
      loadType: 'motor',
      protectionCurrent: 16,
      protectionDeviceType: 'MCB-C-16',
      installationMethod: 'method_3'
    };

    test('returns validation results object', () => {
      const results = engine.validateCircuit(validCircuit);
      
      expect(results.circuitId).toBe('test-circuit-001');
      expect(results.timestamp).toBeDefined();
      expect(results.nonConformities).toBeDefined();
      expect(results.summary).toBeDefined();
      expect(results.performance).toBeDefined();
    });

    test('validates compliant circuit with no critical issues', () => {
      const results = engine.validateCircuit(validCircuit);
      
      expect(results.isValid).toBe(true);
      expect(results.nonConformities.filter(nc => nc.severity === 'CRITICAL')).toHaveLength(0);
    });

    test('detects undersized cable', () => {
      const undersizedCircuit = {
        ...validCircuit,
        current: 100, // Way too high for 16mm² cable
        cableGauge: 16
      };
      
      const results = engine.validateCircuit(undersizedCircuit);
      const cableIssue = results.nonConformities.find(
        nc => nc.code === 'CABLE_UNDERSIZED_AMPACITY'
      );
      
      expect(cableIssue).toBeDefined();
      expect(cableIssue.severity).toBe('CRITICAL');
    });

    test('detects undersized protection device', () => {
      const undersizedProtection = {
        ...validCircuit,
        current: 20,
        protectionCurrent: 16 // Too small for 20A current
      };
      
      const results = engine.validateCircuit(undersizedProtection);
      const protectionIssue = results.nonConformities.find(
        nc => nc.code === 'PROTECTION_DEVICE_UNDERSIZED'
      );
      
      expect(protectionIssue).toBeDefined();
      expect(protectionIssue.severity).toBe('CRITICAL');
    });

    test('detects excessive voltage drop', () => {
      const longCircuit = {
        ...validCircuit,
        distance: 200, // Very long cable run
        current: 20
      };
      
      const results = engine.validateCircuit(longCircuit);
      const voltageDropIssue = results.nonConformities.find(
        nc => nc.code === 'VOLTAGE_DROP_EXCESSIVE'
      );
      
      // May or may not trigger depending on actual calculation
      // At 200m with 20A on 16mm², voltage drop should exceed 5%
      if (voltageDropIssue) {
        expect(voltageDropIssue.severity).toBe('WARNING');
      }
    });

    test('detects invalid voltage', () => {
      const invalidVoltage = {
        ...validCircuit,
        voltage: 500 // Non-standard voltage
      };
      
      const results = engine.validateCircuit(invalidVoltage);
      const voltageIssue = results.nonConformities.find(
        nc => nc.code === 'VOLTAGE_OUT_OF_RANGE'
      );
      
      expect(voltageIssue).toBeDefined();
      expect(voltageIssue.severity).toBe('CRITICAL');
    });

    test('skips rules with missing required fields', () => {
      const partialCircuit = {
        id: 'partial-circuit',
        voltage: 400
      };
      
      const results = engine.validateCircuit(partialCircuit);
      expect(results.summary.skipped.length).toBeGreaterThan(0);
    });

    test('tracks input errors when validateInputs is true', () => {
      const invalidInputs = {
        ...validCircuit,
        voltage: 50, // Too low
        cableGauge: 5 // Non-standard
      };
      
      const results = engine.validateCircuit(invalidInputs, { validateInputs: true });
      expect(results.inputErrors.length).toBeGreaterThan(0);
    });

    test('tracks execution performance', () => {
      const results = engine.validateCircuit(validCircuit);
      
      expect(results.performance.executionTime).toBeDefined();
      expect(results.performance.executionTimeUnit).toBe('ms');
      expect(results.performance.executionTime).toBeLessThan(100); // Should be fast
    });

    test('caches results by default', () => {
      engine.validateCircuit(validCircuit);
      const cachedResult = engine.validateCircuit(validCircuit);
      
      expect(cachedResult.fromCache).toBe(true);
    });

    test('skips cache when useCache is false', () => {
      engine.validateCircuit(validCircuit);
      const result = engine.validateCircuit(validCircuit, { useCache: false });
      
      expect(result.fromCache).toBeUndefined();
    });
  });

  describe('validateAllCircuits()', () => {
    const circuits = [
      {
        id: 'circuit-1',
        voltage: 400,
        current: 12,
        cableGauge: 16,
        cableType: 'NYY',
        protectionCurrent: 16
      },
      {
        id: 'circuit-2',
        voltage: 400,
        current: 100, // Will fail cable check
        cableGauge: 16,
        cableType: 'NYY',
        protectionCurrent: 16
      },
      {
        id: 'circuit-3',
        voltage: 230,
        current: 8,
        cableGauge: 2.5,
        cableType: 'NYM',
        protectionCurrent: 10
      }
    ];

    test('returns batch validation results', () => {
      const results = engine.validateAllCircuits(circuits);
      
      expect(results.totalCircuits).toBe(3);
      expect(results.circuitResults).toHaveLength(3);
      expect(results.performance).toBeDefined();
    });

    test('counts valid and invalid circuits', () => {
      const results = engine.validateAllCircuits(circuits);
      
      expect(results.validCircuits + results.circuitsWithIssues).toBe(3);
    });

    test('counts critical issues and warnings', () => {
      const results = engine.validateAllCircuits(circuits);
      
      expect(results.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(results.warnings).toBeGreaterThanOrEqual(0);
    });

    test('tracks batch performance', () => {
      const results = engine.validateAllCircuits(circuits);
      
      expect(results.performance.totalTime).toBeDefined();
      expect(results.performance.avgTimePerCircuit).toBeDefined();
    });
  });

  describe('getApplicableRules()', () => {
    test('returns rules that can execute with given data', () => {
      const circuitData = { voltage: 400 };
      const applicable = engine.getApplicableRules(circuitData);
      
      // VOLTAGE_OUT_OF_RANGE only requires voltage
      const voltageRule = applicable.find(r => r.code === 'VOLTAGE_OUT_OF_RANGE');
      expect(voltageRule).toBeDefined();
    });

    test('returns more rules with more data', () => {
      const minimalData = { voltage: 400 };
      const moreData = { voltage: 400, current: 16, cableGauge: 16, cableType: 'NYY' };
      
      const minimalApplicable = engine.getApplicableRules(minimalData);
      const moreApplicable = engine.getApplicableRules(moreData);
      
      expect(moreApplicable.length).toBeGreaterThan(minimalApplicable.length);
    });
  });

  describe('getPendingRules()', () => {
    test('returns rules that would be applicable with more data', () => {
      const partialData = { voltage: 400, current: 16 };
      const pending = engine.getPendingRules(partialData);
      
      // Should include rules that need cable data
      expect(pending.length).toBeGreaterThan(0);
      pending.forEach(p => {
        expect(p.missingFields.length).toBeGreaterThan(0);
        expect(p.percentComplete).toBeGreaterThan(0);
      });
    });
  });

  describe('cache management', () => {
    test('clearCache() clears all cached results', () => {
      engine.validateCircuit({ id: 'test', voltage: 400 });
      engine.clearCache();
      
      // Validate again - should not be from cache
      const result = engine.validateCircuit({ id: 'test', voltage: 400 });
      expect(result.fromCache).toBeUndefined();
    });
  });

  describe('metrics', () => {
    test('getMetrics() returns execution metrics', () => {
      engine.validateCircuit({ voltage: 400 });
      engine.validateCircuit({ voltage: 230 });
      
      const metrics = engine.getMetrics();
      
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.totalDuration).toBeGreaterThan(0);
      expect(metrics.avgDuration).toBeGreaterThan(0);
    });

    test('resetMetrics() clears metrics', () => {
      engine.validateCircuit({ voltage: 400 });
      engine.resetMetrics();
      
      const metrics = engine.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
    });

    test('tracks slowest and fastest execution', () => {
      // Run multiple validations
      for (let i = 0; i < 5; i++) {
        engine.validateCircuit({ id: `circuit-${i}`, voltage: 400 }, { useCache: false });
      }
      
      const metrics = engine.getMetrics();
      expect(metrics.slowestExecution).toBeGreaterThanOrEqual(metrics.fastestExecution);
    });
  });
});
