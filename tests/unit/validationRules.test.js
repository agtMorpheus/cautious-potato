/**
 * Unit Tests for Validation Rules
 * Tests for all 7 validation rules in the measurement validator
 */

import { 
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
} from '../../js/modules/measurement-validator/validators/validationRules.js';
import { CableLibrary } from '../../js/modules/measurement-validator/libraries/cableLibrary.js';
import { ProtectionLibrary } from '../../js/modules/measurement-validator/libraries/protectionLibrary.js';
import { StandardsData } from '../../js/modules/measurement-validator/libraries/standardsData.js';

describe('ValidationRules', () => {
  let cableLib;
  let protLib;
  let standardsData;

  beforeEach(() => {
    cableLib = new CableLibrary();
    protLib = new ProtectionLibrary();
    standardsData = new StandardsData();
  });

  describe('validationRules array', () => {
    test('contains all 7 rules', () => {
      expect(validationRules.length).toBe(7);
    });

    test('each rule has required properties', () => {
      for (const rule of validationRules) {
        expect(rule.code).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(rule.triggers).toBeDefined();
        expect(rule.triggers.requiredFields).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(typeof rule.calculate).toBe('function');
        expect(rule.normReference).toBeDefined();
      }
    });

    test('each rule has unique code', () => {
      const codes = validationRules.map(r => r.code);
      const uniqueCodes = [...new Set(codes)];
      expect(uniqueCodes.length).toBe(codes.length);
    });
  });

  describe('cableAmpacityRule (CABLE_UNDERSIZED_AMPACITY)', () => {
    const validCircuit = {
      current: 12,
      cableGauge: 16,
      cableType: 'NYY',
      installationMethod: 'method_3',
      ambientTemp: 30,
    };

    test('has correct metadata', () => {
      expect(cableAmpacityRule.code).toBe('CABLE_UNDERSIZED_AMPACITY');
      expect(cableAmpacityRule.category).toBe('CABLE');
      expect(cableAmpacityRule.severity).toBe('CRITICAL');
    });

    test('is compliant when cable ampacity >= circuit current', () => {
      const result = cableAmpacityRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(true);
      expect(result.actual).toBeLessThanOrEqual(result.limit);
    });

    test('is non-compliant when cable is undersized', () => {
      const undersizedCircuit = {
        ...validCircuit,
        current: 100,
        cableGauge: 4 // Too small for 100A
      };
      const result = cableAmpacityRule.calculate(undersizedCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(false);
      expect(result.actual).toBeGreaterThan(result.limit);
    });

    test('calculates percent usage correctly', () => {
      const result = cableAmpacityRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.percentUsed).toBeDefined();
      expect(result.percentUsed).toBeLessThan(100);
    });

    test('provides ampacity details', () => {
      const result = cableAmpacityRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.ampacityDetails).toBeDefined();
    });

    test('provides remedy options for undersized cable', () => {
      const undersizedCircuit = {
        ...validCircuit,
        current: 100,
        cableGauge: 4
      };
      const result = cableAmpacityRule.calculate(undersizedCircuit, cableLib, protLib, standardsData);
      const remedies = cableAmpacityRule.remedyOptions(result, undersizedCircuit, cableLib);
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });

    test('handles invalid cable gauge gracefully', () => {
      const badCircuit = {
        ...validCircuit,
        cableGauge: 7 // Non-standard gauge
      };
      const result = cableAmpacityRule.calculate(badCircuit, cableLib, protLib, standardsData);
      // Should return error when ampacity cannot be found
      expect(result.deratedAmpacity === null || result.error !== undefined || result.compliant === false).toBe(true);
    });
  });

  describe('voltageDropRule (VOLTAGE_DROP_EXCESSIVE)', () => {
    const validCircuit = {
      voltage: 400,
      current: 20,
      cableGauge: 16,
      distance: 30,
      phasesCount: 3,
      loadType: 'general',
      cableType: 'NYY',
      powerFactor: 0.85
    };

    test('has correct metadata', () => {
      expect(voltageDropRule.code).toBe('VOLTAGE_DROP_EXCESSIVE');
      expect(voltageDropRule.category).toBe('CABLE');
      expect(voltageDropRule.severity).toBe('WARNING');
    });

    test('is compliant for short runs with adequate cable', () => {
      const result = voltageDropRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(true);
      expect(result.actual).toBeLessThanOrEqual(result.limit);
    });

    test('is non-compliant for long runs with small cable', () => {
      const longCircuit = {
        ...validCircuit,
        distance: 200,
        current: 50,
        cableGauge: 4
      };
      const result = voltageDropRule.calculate(longCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(false);
    });

    test('applies stricter 3% limit for lighting loads', () => {
      const lightingCircuit = {
        ...validCircuit,
        loadType: 'lighting'
      };
      const result = voltageDropRule.calculate(lightingCircuit, cableLib, protLib, standardsData);
      expect(result.limit).toBe(3);
    });

    test('applies 5% limit for general loads', () => {
      const result = voltageDropRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.limit).toBe(5);
    });

    test('includes voltage drop in volts', () => {
      const result = voltageDropRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.voltageDropAbsolute).toBeDefined();
    });

    test('provides remedy options', () => {
      const remedies = voltageDropRule.remedyOptions();
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });
  });

  describe('protectionDeviceSizingRule (PROTECTION_DEVICE_UNDERSIZED)', () => {
    const validCircuit = {
      current: 12,
      protectionCurrent: 16,
      protectionDeviceType: 'MCB-C-16'
    };

    test('has correct metadata', () => {
      expect(protectionDeviceSizingRule.code).toBe('PROTECTION_DEVICE_UNDERSIZED');
      expect(protectionDeviceSizingRule.category).toBe('PROTECTION');
      expect(protectionDeviceSizingRule.severity).toBe('CRITICAL');
    });

    test('is compliant when device rating >= circuit current', () => {
      const result = protectionDeviceSizingRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(true);
    });

    test('is non-compliant when device is undersized', () => {
      const undersizedCircuit = {
        current: 25,
        protectionCurrent: 16,
        protectionDeviceType: 'MCB-C-16'
      };
      const result = protectionDeviceSizingRule.calculate(undersizedCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(false);
    });

    test('calculates margin percent', () => {
      const result = protectionDeviceSizingRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.marginPercent).toBeDefined();
    });

    test('suggests next standard size', () => {
      const undersizedCircuit = {
        current: 25,
        protectionCurrent: 16,
        protectionDeviceType: 'MCB-C-16'
      };
      const result = protectionDeviceSizingRule.calculate(undersizedCircuit, cableLib, protLib, standardsData);
      expect(result.nextStandardSize).toBeDefined();
      expect(result.nextStandardSize).toBeGreaterThanOrEqual(25);
    });

    test('flags oversized devices', () => {
      const oversizedCircuit = {
        current: 10,
        protectionCurrent: 63,
        protectionDeviceType: 'MCB-C-63'
      };
      const result = protectionDeviceSizingRule.calculate(oversizedCircuit, cableLib, protLib, standardsData);
      expect(result.oversized).toBe(true);
    });

    test('provides remedy options', () => {
      const result = { nextStandardSize: 32 };
      const remedies = protectionDeviceSizingRule.remedyOptions(result);
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });
  });

  describe('loopImpedanceRule (IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE)', () => {
    const validCircuit = {
      voltage: 400,
      protectionCurrent: 16,
      protectionDeviceType: 'MCB-C-16',
      loopImpedance: 2.0
    };

    test('has correct metadata', () => {
      expect(loopImpedanceRule.code).toBe('IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE');
      expect(loopImpedanceRule.category).toBe('IMPEDANCE');
      expect(loopImpedanceRule.severity).toBe('CRITICAL');
    });

    test('is compliant when impedance allows adequate fault current', () => {
      const result = loopImpedanceRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(true);
    });

    test('is non-compliant when impedance too high', () => {
      const highImpedanceCircuit = {
        ...validCircuit,
        loopImpedance: 50
      };
      const result = loopImpedanceRule.calculate(highImpedanceCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(false);
    });

    test('calculates fault current', () => {
      const result = loopImpedanceRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.faultCurrent).toBeDefined();
      expect(result.faultCurrent).toBeCloseTo(200, 0); // 400V / 2Ω = 200A
    });

    test('calculates minimum fault current needed', () => {
      const result = loopImpedanceRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.minFaultCurrent).toBeDefined();
    });

    test('calculates tripping margin', () => {
      const result = loopImpedanceRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.trippingMargin).toBeDefined();
    });

    test('provides remedy options', () => {
      const remedies = loopImpedanceRule.remedyOptions();
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });
  });

  describe('voltageRangeRule (VOLTAGE_OUT_OF_RANGE)', () => {
    test('has correct metadata', () => {
      expect(voltageRangeRule.code).toBe('VOLTAGE_OUT_OF_RANGE');
      expect(voltageRangeRule.category).toBe('VOLTAGE');
      expect(voltageRangeRule.severity).toBe('CRITICAL');
    });

    test('is compliant for standard industrial voltages', () => {
      const voltages = [230, 400, 690];
      for (const voltage of voltages) {
        const result = voltageRangeRule.calculate({ voltage }, cableLib, protLib, standardsData);
        expect(result.compliant).toBe(true);
      }
    });

    test('is non-compliant for non-standard voltages', () => {
      const invalidVoltages = [110, 220, 500, 800];
      for (const voltage of invalidVoltages) {
        const result = voltageRangeRule.calculate({ voltage }, cableLib, protLib, standardsData);
        expect(result.compliant).toBe(false);
      }
    });

    test('suggests nearest valid voltage', () => {
      const result = voltageRangeRule.calculate({ voltage: 410 }, cableLib, protLib, standardsData);
      expect(result.nearestValidVoltage).toBe(400);
    });

    test('includes list of valid voltages', () => {
      const result = voltageRangeRule.calculate({ voltage: 500 }, cableLib, protLib, standardsData);
      expect(result.validVoltages).toBeDefined();
      expect(result.validVoltages).toContain(400);
    });

    test('provides remedy options', () => {
      const result = { nearestValidVoltage: 400 };
      const remedies = voltageRangeRule.remedyOptions(result);
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
      expect(remedies[0]).toContain('400');
    });
  });

  describe('cableVoltageRatingRule (CABLE_VOLTAGE_RATING_EXCEEDED)', () => {
    const validCircuit = {
      voltage: 400,
      cableType: 'NYY'
    };

    test('has correct metadata', () => {
      expect(cableVoltageRatingRule.code).toBe('CABLE_VOLTAGE_RATING_EXCEEDED');
      expect(cableVoltageRatingRule.category).toBe('CABLE');
      expect(cableVoltageRatingRule.severity).toBe('CRITICAL');
    });

    test('is compliant when cable rated for circuit voltage (NYY at 400V)', () => {
      const result = cableVoltageRatingRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(true);
    });

    test('includes cable rating info', () => {
      const result = cableVoltageRatingRule.calculate(validCircuit, cableLib, protLib, standardsData);
      expect(result.cableType).toBe('NYY');
      expect(result.cableRating).toBeDefined();
    });

    test('handles invalid cable type', () => {
      const badCircuit = {
        voltage: 400,
        cableType: 'INVALID_CABLE'
      };
      const result = cableVoltageRatingRule.calculate(badCircuit, cableLib, protLib, standardsData);
      expect(result.error).toBeDefined();
    });

    test('provides remedy options', () => {
      const remedies = cableVoltageRatingRule.remedyOptions();
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });
  });

  describe('selectiveCoordinationRule (COORDINATION_NOT_SELECTIVE)', () => {
    test('has correct metadata', () => {
      expect(selectiveCoordinationRule.code).toBe('COORDINATION_NOT_SELECTIVE');
      expect(selectiveCoordinationRule.category).toBe('COORDINATION');
      expect(selectiveCoordinationRule.severity).toBe('WARNING');
    });

    test('recognizes selective arrangement (C upstream, B downstream)', () => {
      const circuitData = {
        upstreamDeviceType: 'MCB-C-63',
        downstreamDeviceType: 'MCB-B-16'
      };
      const result = selectiveCoordinationRule.calculate(circuitData, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(true);
    });

    test('recognizes non-selective arrangement (same ratings)', () => {
      const circuitData = {
        upstreamDeviceType: 'MCB-C-16',
        downstreamDeviceType: 'MCB-C-16'
      };
      const result = selectiveCoordinationRule.calculate(circuitData, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(false);
    });

    test('recognizes non-selective when downstream > upstream', () => {
      const circuitData = {
        upstreamDeviceType: 'MCB-C-16',
        downstreamDeviceType: 'MCB-C-32'
      };
      const result = selectiveCoordinationRule.calculate(circuitData, cableLib, protLib, standardsData);
      expect(result.compliant).toBe(false);
    });

    test('provides remedy options', () => {
      const result = { recommendation: 'Test recommendation' };
      const remedies = selectiveCoordinationRule.remedyOptions(result);
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });
  });

  describe('getRuleByCode()', () => {
    test('returns rule for valid code', () => {
      const rule = getRuleByCode('CABLE_UNDERSIZED_AMPACITY');
      expect(rule).not.toBeNull();
      expect(rule.code).toBe('CABLE_UNDERSIZED_AMPACITY');
    });

    test('returns null for invalid code', () => {
      const rule = getRuleByCode('INVALID_CODE');
      expect(rule).toBeNull();
    });
  });

  describe('getRulesByCategory()', () => {
    test('returns cable rules', () => {
      const cableRules = getRulesByCategory('CABLE');
      expect(cableRules.length).toBeGreaterThan(0);
      cableRules.forEach(rule => {
        expect(rule.category).toBe('CABLE');
      });
    });

    test('returns protection rules', () => {
      const protRules = getRulesByCategory('PROTECTION');
      expect(protRules.length).toBeGreaterThan(0);
      protRules.forEach(rule => {
        expect(rule.category).toBe('PROTECTION');
      });
    });

    test('returns empty array for invalid category', () => {
      const rules = getRulesByCategory('INVALID');
      expect(rules.length).toBe(0);
    });
  });

  describe('getRulesBySeverity()', () => {
    test('returns critical rules', () => {
      const criticalRules = getRulesBySeverity('CRITICAL');
      expect(criticalRules.length).toBeGreaterThan(0);
      criticalRules.forEach(rule => {
        expect(rule.severity).toBe('CRITICAL');
      });
    });

    test('returns warning rules', () => {
      const warningRules = getRulesBySeverity('WARNING');
      expect(warningRules.length).toBeGreaterThan(0);
      warningRules.forEach(rule => {
        expect(rule.severity).toBe('WARNING');
      });
    });

    test('returns empty array for invalid severity', () => {
      const rules = getRulesBySeverity('INVALID');
      expect(rules.length).toBe(0);
    });
  });

  describe('Real Circuit Validation Scenarios', () => {
    test('Scenario 1: Valid pump motor circuit (400V, 5.5kW)', () => {
      const circuit = {
        id: 'pump_001',
        name: 'Pump Motor 5.5kW',
        voltage: 400,
        current: 12.5,
        cableGauge: 16,
        cableType: 'NYY',
        distance: 45,
        phasesCount: 3,
        loadType: 'motor',
        protectionDeviceType: 'MCB-C-16',
        protectionCurrent: 16,
        installationMethod: 'method_3',
        ambientTemp: 30,
      };
      
      // Test each applicable rule
      const cableResult = cableAmpacityRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(cableResult.compliant).toBe(true);
      
      const dropResult = voltageDropRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(dropResult.compliant).toBe(true);
      
      const protResult = protectionDeviceSizingRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(protResult.compliant).toBe(true);
      
      const voltResult = voltageRangeRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(voltResult.compliant).toBe(true);
    });

    test('Scenario 2: Undersized cable causes multiple violations', () => {
      const circuit = {
        voltage: 400,
        current: 50,
        cableGauge: 4, // Too small
        cableType: 'NYY',
        distance: 100,
        phasesCount: 3,
        loadType: 'general',
        protectionDeviceType: 'MCB-C-32',
        protectionCurrent: 32, // Undersized for 50A
        installationMethod: 'method_3',
      };
      
      const cableResult = cableAmpacityRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(cableResult.compliant).toBe(false);
      
      const dropResult = voltageDropRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(dropResult.compliant).toBe(false);
      
      const protResult = protectionDeviceSizingRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(protResult.compliant).toBe(false);
    });

    test('Scenario 3: Lighting circuit with 3% drop limit', () => {
      const circuit = {
        voltage: 230,
        current: 10,
        cableGauge: 2.5,
        cableType: 'NYY',
        distance: 80,
        phasesCount: 1,
        loadType: 'lighting',
        powerFactor: 1.0,
      };
      
      const dropResult = voltageDropRule.calculate(circuit, cableLib, protLib, standardsData);
      expect(dropResult.limit).toBe(3);
    });
  });
});
