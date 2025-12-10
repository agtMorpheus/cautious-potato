/**
 * Unit Tests for Standards Data Library
 * Tests for StandardsData class and standards reference data
 */

import { 
  StandardsData, 
  standardsData,
  validVoltages,
  validFrequencies,
  maxVoltageDrop,
  loadTypes,
  installationMethods,
  protectionCoordination,
  standardProtectionSizes,
  severityLevels,
  nonConformityCategories
} from '../../js/modules/measurement-validator/libraries/standardsData.js';

describe('StandardsData', () => {
  let lib;

  beforeEach(() => {
    lib = new StandardsData();
  });

  describe('getValidIndustrialVoltages()', () => {
    test('returns all valid voltages by default', () => {
      const voltages = lib.getValidIndustrialVoltages();
      expect(Array.isArray(voltages)).toBe(true);
      expect(voltages).toContain(230);
      expect(voltages).toContain(400);
      expect(voltages).toContain(690);
    });

    test('returns only single-phase voltages when type is singlePhase', () => {
      const voltages = lib.getValidIndustrialVoltages('singlePhase');
      expect(voltages).toContain(230);
      expect(voltages.length).toBe(1);
    });

    test('returns only three-phase voltages when type is threePhase', () => {
      const voltages = lib.getValidIndustrialVoltages('threePhase');
      expect(voltages).toContain(400);
      expect(voltages).toContain(690);
      expect(voltages).not.toContain(230);
    });

    test('returns defensive copy', () => {
      const voltages1 = lib.getValidIndustrialVoltages();
      voltages1.push(999);
      const voltages2 = lib.getValidIndustrialVoltages();
      expect(voltages2).not.toContain(999);
    });
  });

  describe('isValidVoltage()', () => {
    test('returns true for valid industrial voltages', () => {
      expect(lib.isValidVoltage(230)).toBe(true);
      expect(lib.isValidVoltage(400)).toBe(true);
      expect(lib.isValidVoltage(690)).toBe(true);
    });

    test('returns false for non-standard voltages', () => {
      expect(lib.isValidVoltage(110)).toBe(false);
      expect(lib.isValidVoltage(220)).toBe(false);
      expect(lib.isValidVoltage(500)).toBe(false);
      expect(lib.isValidVoltage(800)).toBe(false);
    });
  });

  describe('getNearestValidVoltage()', () => {
    test('returns 230V for close values', () => {
      expect(lib.getNearestValidVoltage(220)).toBe(230);
      expect(lib.getNearestValidVoltage(235)).toBe(230);
    });

    test('returns 400V for close values', () => {
      expect(lib.getNearestValidVoltage(380)).toBe(400);
      expect(lib.getNearestValidVoltage(410)).toBe(400);
    });

    test('returns 690V for close values', () => {
      expect(lib.getNearestValidVoltage(700)).toBe(690);
      expect(lib.getNearestValidVoltage(650)).toBe(690);
    });

    test('returns exact match for valid voltages', () => {
      expect(lib.getNearestValidVoltage(400)).toBe(400);
    });
  });

  describe('getValidFrequencies()', () => {
    test('returns valid frequencies', () => {
      const frequencies = lib.getValidFrequencies();
      expect(Array.isArray(frequencies)).toBe(true);
      expect(frequencies).toContain(50);
      expect(frequencies).toContain(60);
    });

    test('returns defensive copy', () => {
      const frequencies1 = lib.getValidFrequencies();
      frequencies1.push(100);
      const frequencies2 = lib.getValidFrequencies();
      expect(frequencies2).not.toContain(100);
    });
  });

  describe('isValidFrequency()', () => {
    test('returns true for valid frequencies', () => {
      expect(lib.isValidFrequency(50)).toBe(true);
      expect(lib.isValidFrequency(60)).toBe(true);
    });

    test('returns false for invalid frequencies', () => {
      expect(lib.isValidFrequency(0)).toBe(false);
      expect(lib.isValidFrequency(100)).toBe(false);
    });
  });

  describe('getMaxVoltageDrop()', () => {
    test('returns 3% for lighting loads', () => {
      expect(lib.getMaxVoltageDrop('lighting')).toBe(3);
    });

    test('returns 5% for motor loads', () => {
      expect(lib.getMaxVoltageDrop('motor')).toBe(5);
    });

    test('returns 5% for general loads', () => {
      expect(lib.getMaxVoltageDrop('general')).toBe(5);
    });

    test('returns default 5% for unknown load types', () => {
      expect(lib.getMaxVoltageDrop('unknown')).toBe(5);
    });
  });

  describe('getLoadType()', () => {
    test('returns load type data for valid types', () => {
      const motor = lib.getLoadType('motor');
      expect(motor).not.toBeNull();
      expect(motor.name).toBe('Motor');
      expect(motor.maxVoltageDrop).toBe(5);
      expect(motor.typicalPowerFactor).toBe(0.85);
    });

    test('returns null for invalid load types', () => {
      expect(lib.getLoadType('invalid')).toBeNull();
    });

    test('returns lighting load type', () => {
      const lighting = lib.getLoadType('lighting');
      expect(lighting).not.toBeNull();
      expect(lighting.maxVoltageDrop).toBe(3);
      expect(lighting.typicalPowerFactor).toBe(0.95);
    });
  });

  describe('getLoadTypes()', () => {
    test('returns array of load type codes', () => {
      const types = lib.getLoadTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('lighting');
      expect(types).toContain('motor');
      expect(types).toContain('heater');
      expect(types).toContain('general');
    });
  });

  describe('getInstallationMethod()', () => {
    test('returns installation method data for valid methods', () => {
      const method3 = lib.getInstallationMethod('method_3');
      expect(method3).not.toBeNull();
      expect(method3.code).toBe('method_3');
      expect(method3.referenceAmbient).toBe(30);
    });

    test('returns method_4 data', () => {
      const method4 = lib.getInstallationMethod('method_4');
      expect(method4).not.toBeNull();
      expect(method4.referenceAmbient).toBe(30);
    });

    test('returns method_7 (buried) data', () => {
      const method7 = lib.getInstallationMethod('method_7');
      expect(method7).not.toBeNull();
      expect(method7.referenceAmbient).toBe(25);
    });

    test('returns null for invalid methods', () => {
      expect(lib.getInstallationMethod('invalid')).toBeNull();
    });
  });

  describe('getInstallationMethods()', () => {
    test('returns array of installation method codes', () => {
      const methods = lib.getInstallationMethods();
      expect(Array.isArray(methods)).toBe(true);
      expect(methods).toContain('method_3');
      expect(methods).toContain('method_4');
      expect(methods).toContain('method_7');
    });
  });

  describe('getMaxDisconnectTime()', () => {
    test('returns 0.4s for 230V final circuits', () => {
      expect(lib.getMaxDisconnectTime(230, false)).toBe(0.4);
    });

    test('returns 0.2s for 400V final circuits', () => {
      expect(lib.getMaxDisconnectTime(400, false)).toBe(0.2);
    });

    test('returns 5.0s for distribution circuits', () => {
      expect(lib.getMaxDisconnectTime(230, true)).toBe(5.0);
      expect(lib.getMaxDisconnectTime(400, true)).toBe(5.0);
    });

    test('returns default 0.4s for unknown voltages', () => {
      expect(lib.getMaxDisconnectTime(500, false)).toBe(0.4);
    });
  });

  describe('getStandardProtectionSizes()', () => {
    test('returns MCB standard sizes', () => {
      const mcbSizes = lib.getStandardProtectionSizes('MCB');
      expect(Array.isArray(mcbSizes)).toBe(true);
      expect(mcbSizes).toContain(6);
      expect(mcbSizes).toContain(16);
      expect(mcbSizes).toContain(32);
      expect(mcbSizes).toContain(63);
      expect(mcbSizes).toContain(100);
    });

    test('returns fuse standard sizes', () => {
      const fuseSizes = lib.getStandardProtectionSizes('fuse');
      expect(Array.isArray(fuseSizes)).toBe(true);
      expect(fuseSizes).toContain(6);
      expect(fuseSizes).toContain(160);
      expect(fuseSizes).toContain(250);
    });

    test('returns MCB sizes as default', () => {
      const defaultSizes = lib.getStandardProtectionSizes();
      expect(defaultSizes).toEqual(lib.getStandardProtectionSizes('MCB'));
    });

    test('returns defensive copy', () => {
      const sizes1 = lib.getStandardProtectionSizes('MCB');
      sizes1.push(999);
      const sizes2 = lib.getStandardProtectionSizes('MCB');
      expect(sizes2).not.toContain(999);
    });
  });

  describe('getNextStandardSize()', () => {
    test('returns next MCB size for given current', () => {
      expect(lib.getNextStandardSize('MCB', 12)).toBe(13);
      expect(lib.getNextStandardSize('MCB', 17)).toBe(20);
      expect(lib.getNextStandardSize('MCB', 50)).toBe(50);
    });

    test('returns null if no suitable size exists', () => {
      expect(lib.getNextStandardSize('MCB', 1000)).toBeNull();
    });

    test('returns exact match when current equals rating', () => {
      expect(lib.getNextStandardSize('MCB', 16)).toBe(16);
    });
  });

  describe('getTemperatureDerating()', () => {
    test('returns 1.0 at reference temperature', () => {
      const derating = lib.getTemperatureDerating('method_3', 30, 30);
      expect(derating).toBe(1.0);
    });

    test('returns higher factor at lower temperature', () => {
      const derating = lib.getTemperatureDerating('method_3', 20, 30);
      expect(derating).toBeGreaterThan(1.0);
    });

    test('returns lower factor at higher temperature', () => {
      const derating = lib.getTemperatureDerating('method_3', 50, 30);
      expect(derating).toBeLessThan(1.0);
    });
  });

  describe('calculateMaxLoopImpedance()', () => {
    test('calculates maximum loop impedance correctly', () => {
      // 400V, 16A MCB-C (trip point 5×In = 80A), safety factor 0.8
      // Zmax = 400 / (80 × 0.8) = 6.25Ω
      const maxZ = lib.calculateMaxLoopImpedance(400, 80);
      expect(maxZ).toBeCloseTo(6.25, 2);
    });

    test('higher voltage allows higher impedance', () => {
      const maxZ400 = lib.calculateMaxLoopImpedance(400, 80);
      const maxZ230 = lib.calculateMaxLoopImpedance(230, 80);
      expect(maxZ400).toBeGreaterThan(maxZ230);
    });

    test('higher trip current allows lower impedance', () => {
      const maxZ80 = lib.calculateMaxLoopImpedance(400, 80);
      const maxZ160 = lib.calculateMaxLoopImpedance(400, 160);
      expect(maxZ80).toBeGreaterThan(maxZ160);
    });
  });

  describe('getSeverityLevel()', () => {
    test('returns severity data for CRITICAL', () => {
      const severity = lib.getSeverityLevel('CRITICAL');
      expect(severity).not.toBeNull();
      expect(severity.code).toBe('CRITICAL');
      expect(severity.color).toBe('#cc0000');
    });

    test('returns severity data for WARNING', () => {
      const severity = lib.getSeverityLevel('WARNING');
      expect(severity).not.toBeNull();
      expect(severity.code).toBe('WARNING');
      expect(severity.color).toBe('#ff9900');
    });

    test('returns severity data for INFO', () => {
      const severity = lib.getSeverityLevel('INFO');
      expect(severity).not.toBeNull();
      expect(severity.code).toBe('INFO');
    });

    test('returns null for invalid severity', () => {
      expect(lib.getSeverityLevel('INVALID')).toBeNull();
    });
  });

  describe('getSeverityLevels()', () => {
    test('returns array of severity level codes', () => {
      const levels = lib.getSeverityLevels();
      expect(Array.isArray(levels)).toBe(true);
      expect(levels).toContain('INFO');
      expect(levels).toContain('WARNING');
      expect(levels).toContain('CRITICAL');
    });
  });

  describe('getCategory()', () => {
    test('returns category name for valid codes', () => {
      expect(lib.getCategory('CABLE')).toBe('Cable');
      expect(lib.getCategory('PROTECTION')).toBe('Protection');
      expect(lib.getCategory('VOLTAGE')).toBe('Voltage');
      expect(lib.getCategory('IMPEDANCE')).toBe('Impedance');
      expect(lib.getCategory('COORDINATION')).toBe('Coordination');
    });

    test('returns null for invalid category', () => {
      expect(lib.getCategory('INVALID')).toBeNull();
    });
  });

  describe('getCategories()', () => {
    test('returns array of category codes', () => {
      const categories = lib.getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories).toContain('CABLE');
      expect(categories).toContain('PROTECTION');
      expect(categories).toContain('VOLTAGE');
      expect(categories).toContain('IMPEDANCE');
      expect(categories).toContain('COORDINATION');
    });
  });

  describe('protectionCoordination constants', () => {
    test('has correct safety factor', () => {
      expect(lib.protectionCoordination.safetyFactor).toBe(0.8);
    });

    test('has correct minimum selectivity ratio', () => {
      expect(lib.protectionCoordination.minSelectivityRatio).toBe(1.6);
    });
  });

  describe('singleton instance', () => {
    test('standardsData is a StandardsData instance', () => {
      expect(standardsData).toBeInstanceOf(StandardsData);
    });
  });

  describe('exported data objects', () => {
    test('validVoltages has all voltage arrays', () => {
      expect(validVoltages.all).toBeDefined();
      expect(validVoltages.singlePhase).toBeDefined();
      expect(validVoltages.threePhase).toBeDefined();
    });

    test('validFrequencies contains 50 and 60', () => {
      expect(validFrequencies).toContain(50);
      expect(validFrequencies).toContain(60);
    });

    test('maxVoltageDrop has all load types', () => {
      expect(maxVoltageDrop.lighting).toBe(3);
      expect(maxVoltageDrop.other).toBe(5);
    });

    test('severityLevels has all levels', () => {
      expect(severityLevels.CRITICAL).toBeDefined();
      expect(severityLevels.WARNING).toBeDefined();
      expect(severityLevels.INFO).toBeDefined();
    });

    test('nonConformityCategories has all categories', () => {
      expect(nonConformityCategories.CABLE).toBe('Cable');
      expect(nonConformityCategories.PROTECTION).toBe('Protection');
    });
  });
});
