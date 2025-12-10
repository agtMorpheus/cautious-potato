/**
 * Unit Tests for Cable Library
 * Tests for CableLibrary class and cable data
 */

import { CableLibrary, cableLibrary, standardGauges, cables } from '../../js/modules/measurement-validator/libraries/cableLibrary.js';

describe('CableLibrary', () => {
  let lib;

  beforeEach(() => {
    lib = new CableLibrary();
  });

  describe('getCable()', () => {
    test('returns cable specification for valid type', () => {
      const cable = lib.getCable('NYY');
      expect(cable).not.toBeNull();
      expect(cable.name).toContain('NYY');
      expect(cable.standard).toBe('DIN VDE 0296');
      expect(cable.voltageRating).toBe(0.6);
    });

    test('returns null for invalid cable type', () => {
      const cable = lib.getCable('INVALID');
      expect(cable).toBeNull();
    });

    test('returns all standard cable types', () => {
      const types = ['NYY', 'NYM', 'NYCY', 'NAYY'];
      types.forEach(type => {
        expect(lib.getCable(type)).not.toBeNull();
      });
    });
  });

  describe('getCableTypes()', () => {
    test('returns array of cable types', () => {
      const types = lib.getCableTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('NYY');
      expect(types).toContain('NYM');
    });
  });

  describe('getStandardGauges()', () => {
    test('returns array of standard gauges', () => {
      const gauges = lib.getStandardGauges();
      expect(Array.isArray(gauges)).toBe(true);
      expect(gauges).toContain(1.5);
      expect(gauges).toContain(16);
      expect(gauges).toContain(240);
    });

    test('returns defensive copy', () => {
      const gauges1 = lib.getStandardGauges();
      gauges1.push(999);
      const gauges2 = lib.getStandardGauges();
      expect(gauges2).not.toContain(999);
    });
  });

  describe('isStandardGauge()', () => {
    test('returns true for standard gauges', () => {
      expect(lib.isStandardGauge(1.5)).toBe(true);
      expect(lib.isStandardGauge(4)).toBe(true);
      expect(lib.isStandardGauge(16)).toBe(true);
      expect(lib.isStandardGauge(240)).toBe(true);
    });

    test('returns false for non-standard gauges', () => {
      expect(lib.isStandardGauge(3)).toBe(false);
      expect(lib.isStandardGauge(5)).toBe(false);
      expect(lib.isStandardGauge(100)).toBe(false);
    });
  });

  describe('getBaseAmpacity()', () => {
    test('returns ampacity for valid gauge and method', () => {
      const ampacity = lib.getBaseAmpacity('NYY', 16, 'method_3');
      expect(ampacity).toBe(61);
    });

    test('returns different values for different installation methods', () => {
      const method3 = lib.getBaseAmpacity('NYY', 16, 'method_3');
      const method4 = lib.getBaseAmpacity('NYY', 16, 'method_4');
      expect(method4).toBeGreaterThan(method3);
    });

    test('returns null for invalid gauge', () => {
      const ampacity = lib.getBaseAmpacity('NYY', 999, 'method_3');
      expect(ampacity).toBeNull();
    });

    test('returns null for invalid method', () => {
      const ampacity = lib.getBaseAmpacity('NYY', 16, 'invalid_method');
      expect(ampacity).toBeNull();
    });
  });

  describe('getAmpacity() with derating', () => {
    test('returns base ampacity at reference temperature', () => {
      const result = lib.getAmpacity('NYY', 16, 'method_3', 30, 1);
      expect(result.baseAmpacity).toBe(61);
      expect(result.tempDerating).toBe(1.0);
      expect(result.groupingDerating).toBe(1.0);
      expect(result.deratedAmpacity).toBe(61);
    });

    test('applies temperature derating for high temperature', () => {
      const result = lib.getAmpacity('NYY', 16, 'method_3', 50, 1);
      expect(result.tempDerating).toBeLessThan(1.0);
      expect(result.deratedAmpacity).toBeLessThan(61);
    });

    test('applies grouping derating for multiple cables', () => {
      const result = lib.getAmpacity('NYY', 16, 'method_3', 30, 3);
      expect(result.groupingDerating).toBe(0.70);
      expect(result.deratedAmpacity).toBeLessThan(61);
    });

    test('combines temperature and grouping derating', () => {
      const result = lib.getAmpacity('NYY', 16, 'method_3', 50, 3);
      expect(result.deratedAmpacity).toBeLessThan(
        lib.getAmpacity('NYY', 16, 'method_3', 50, 1).deratedAmpacity
      );
    });

    test('returns error for invalid gauge', () => {
      const result = lib.getAmpacity('NYY', 999, 'method_3', 30, 1);
      expect(result.deratedAmpacity).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('getTemperatureDerating()', () => {
    test('returns 1.0 at reference temperature', () => {
      const factor = lib.getTemperatureDerating('method_3', 30);
      expect(factor).toBe(1.0);
    });

    test('returns higher factor at lower temperature', () => {
      const factor = lib.getTemperatureDerating('method_3', 25);
      expect(factor).toBeGreaterThan(1.0);
    });

    test('returns lower factor at higher temperature', () => {
      const factor = lib.getTemperatureDerating('method_3', 50);
      expect(factor).toBeLessThan(1.0);
    });

    test('interpolates between table values', () => {
      const factor35 = lib.getTemperatureDerating('method_3', 35);
      const factor40 = lib.getTemperatureDerating('method_3', 40);
      const factor37 = lib.getTemperatureDerating('method_3', 37);
      expect(factor37).toBeLessThan(factor35);
      expect(factor37).toBeGreaterThan(factor40);
    });
  });

  describe('getGroupingDerating()', () => {
    test('returns 1.0 for single cable', () => {
      expect(lib.getGroupingDerating(1)).toBe(1.0);
    });

    test('returns correct factor for 2 cables', () => {
      expect(lib.getGroupingDerating(2)).toBe(0.80);
    });

    test('returns correct factor for 3 cables', () => {
      expect(lib.getGroupingDerating(3)).toBe(0.70);
    });

    test('returns closest lower value for unlisted count', () => {
      // 11 is not in table, should use value for 10
      const factor = lib.getGroupingDerating(11);
      expect(factor).toBe(0.48); // Same as 10
    });
  });

  describe('getCableResistance()', () => {
    test('returns resistance for valid gauge', () => {
      const resistance = lib.getCableResistance('NYY', 16);
      expect(resistance).toBeCloseTo(0.00115, 5); // 1.15 Ω/km = 0.00115 Ω/m
    });

    test('returns smaller resistance for larger gauge', () => {
      const r16 = lib.getCableResistance('NYY', 16);
      const r25 = lib.getCableResistance('NYY', 25);
      expect(r25).toBeLessThan(r16);
    });

    test('returns null for invalid gauge', () => {
      expect(lib.getCableResistance('NYY', 999)).toBeNull();
    });
  });

  describe('getCableImpedance()', () => {
    test('returns resistance and reactance', () => {
      const impedance = lib.getCableImpedance('NYY', 16);
      expect(impedance.resistance).toBeDefined();
      expect(impedance.reactance).toBeDefined();
      expect(impedance.unit).toBe('Ω/m');
    });

    test('returns error for invalid gauge', () => {
      const impedance = lib.getCableImpedance('NYY', 999);
      expect(impedance.error).toBeDefined();
    });
  });

  describe('findMinimumGauge()', () => {
    test('finds minimum gauge for given current', () => {
      const gauge = lib.findMinimumGauge('NYY', 50, 'method_3', 30, 1);
      expect(gauge).toBe(16); // 61A for 16mm² at method_3 (10mm² only has 46A)
    });

    test('returns larger gauge for higher current', () => {
      const gauge1 = lib.findMinimumGauge('NYY', 50, 'method_3', 30, 1);
      const gauge2 = lib.findMinimumGauge('NYY', 100, 'method_3', 30, 1);
      expect(gauge2).toBeGreaterThan(gauge1);
    });

    test('accounts for temperature derating', () => {
      const gauge30 = lib.findMinimumGauge('NYY', 50, 'method_3', 30, 1);
      const gauge50 = lib.findMinimumGauge('NYY', 50, 'method_3', 50, 1);
      expect(gauge50).toBeGreaterThanOrEqual(gauge30);
    });

    test('returns null if no suitable gauge exists', () => {
      const gauge = lib.findMinimumGauge('NYY', 10000, 'method_3', 30, 1);
      expect(gauge).toBeNull();
    });
  });

  describe('calculateVoltageDrop()', () => {
    test('calculates voltage drop for valid inputs', () => {
      const result = lib.calculateVoltageDrop(16, 50, 20, 3, 400, 0.85, 'NYY');
      expect(result.dropVoltage).toBeDefined();
      expect(result.dropPercent).toBeDefined();
    });

    test('higher current causes higher voltage drop', () => {
      const result1 = lib.calculateVoltageDrop(16, 50, 10, 3, 400, 0.85, 'NYY');
      const result2 = lib.calculateVoltageDrop(16, 50, 20, 3, 400, 0.85, 'NYY');
      expect(result2.dropPercent).toBeGreaterThan(result1.dropPercent);
    });

    test('longer distance causes higher voltage drop', () => {
      const result1 = lib.calculateVoltageDrop(16, 50, 20, 3, 400, 0.85, 'NYY');
      const result2 = lib.calculateVoltageDrop(16, 100, 20, 3, 400, 0.85, 'NYY');
      expect(result2.dropPercent).toBeGreaterThan(result1.dropPercent);
    });

    test('larger gauge causes lower voltage drop', () => {
      const result1 = lib.calculateVoltageDrop(10, 50, 20, 3, 400, 0.85, 'NYY');
      const result2 = lib.calculateVoltageDrop(25, 50, 20, 3, 400, 0.85, 'NYY');
      expect(result2.dropPercent).toBeLessThan(result1.dropPercent);
    });

    test('returns error for invalid gauge', () => {
      const result = lib.calculateVoltageDrop(999, 50, 20, 3, 400, 0.85, 'NYY');
      expect(result.error).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    test('cableLibrary is a CableLibrary instance', () => {
      expect(cableLibrary).toBeInstanceOf(CableLibrary);
    });
  });
});
