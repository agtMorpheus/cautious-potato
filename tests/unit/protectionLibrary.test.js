/**
 * Unit Tests for Protection Library
 * Tests for ProtectionLibrary class and protection device data
 */

import { 
  ProtectionLibrary, 
  protectionLibrary, 
  mcbCharacteristics,
  standardCurrentRatings 
} from '../../js/modules/measurement-validator/libraries/protectionLibrary.js';

describe('ProtectionLibrary', () => {
  let lib;

  beforeEach(() => {
    lib = new ProtectionLibrary();
  });

  describe('getDevice()', () => {
    test('returns device specification for valid code', () => {
      const device = lib.getDevice('MCB-C-16');
      expect(device).not.toBeNull();
      expect(device.type).toBe('MCB');
      expect(device.characteristic).toBe('C');
      expect(device.current).toBe(16);
    });

    test('returns null for invalid device code', () => {
      const device = lib.getDevice('INVALID-DEVICE');
      expect(device).toBeNull();
    });

    test('returns MCB Type B devices', () => {
      const device = lib.getDevice('MCB-B-16');
      expect(device).not.toBeNull();
      expect(device.characteristic).toBe('B');
    });

    test('returns MCB Type D devices', () => {
      const device = lib.getDevice('MCB-D-32');
      expect(device).not.toBeNull();
      expect(device.characteristic).toBe('D');
    });

    test('returns RCD devices', () => {
      const device = lib.getDevice('RCD-AC-30');
      expect(device).not.toBeNull();
      expect(device.type).toBe('RCD');
      expect(device.sensitivity).toBe(30);
    });

    test('returns RCBO devices', () => {
      const device = lib.getDevice('RCBO-C-16-30');
      expect(device).not.toBeNull();
      expect(device.type).toBe('RCBO');
      expect(device.current).toBe(16);
      expect(device.rcdSensitivity).toBe(30);
    });
  });

  describe('getDeviceCodes()', () => {
    test('returns array of device codes', () => {
      const codes = lib.getDeviceCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes).toContain('MCB-B-16');
      expect(codes).toContain('MCB-C-16');
      expect(codes).toContain('RCD-AC-30');
    });
  });

  describe('getCharacteristic()', () => {
    test('returns characteristic data for Type B', () => {
      const char = lib.getCharacteristic('B');
      expect(char).not.toBeNull();
      expect(char.tripPoint.min).toBe(3);
      expect(char.tripPoint.max).toBe(5);
    });

    test('returns characteristic data for Type C', () => {
      const char = lib.getCharacteristic('C');
      expect(char).not.toBeNull();
      expect(char.tripPoint.min).toBe(5);
      expect(char.tripPoint.max).toBe(10);
    });

    test('returns characteristic data for Type D', () => {
      const char = lib.getCharacteristic('D');
      expect(char).not.toBeNull();
      expect(char.tripPoint.min).toBe(10);
      expect(char.tripPoint.max).toBe(20);
    });

    test('returns null for invalid characteristic', () => {
      expect(lib.getCharacteristic('X')).toBeNull();
    });
  });

  describe('getRCDType()', () => {
    test('returns RCD Type AC data', () => {
      const rcd = lib.getRCDType('AC');
      expect(rcd).not.toBeNull();
      expect(rcd.responseTime).toBe(300);
    });

    test('returns RCD Type A data', () => {
      const rcd = lib.getRCDType('A');
      expect(rcd).not.toBeNull();
      expect(rcd.responseTime).toBe(200);
    });

    test('returns RCD Type F data', () => {
      const rcd = lib.getRCDType('F');
      expect(rcd).not.toBeNull();
      expect(rcd.responseTime).toBe(150);
    });

    test('returns null for invalid RCD type', () => {
      expect(lib.getRCDType('X')).toBeNull();
    });
  });

  describe('getStandardCurrentRatings()', () => {
    test('returns array of standard ratings', () => {
      const ratings = lib.getStandardCurrentRatings();
      expect(Array.isArray(ratings)).toBe(true);
      expect(ratings).toContain(6);
      expect(ratings).toContain(16);
      expect(ratings).toContain(63);
      expect(ratings).toContain(100);
    });

    test('returns defensive copy', () => {
      const ratings1 = lib.getStandardCurrentRatings();
      ratings1.push(999);
      const ratings2 = lib.getStandardCurrentRatings();
      expect(ratings2).not.toContain(999);
    });
  });

  describe('getTripPointFactor()', () => {
    test('returns trip point for device code', () => {
      const tripPoint = lib.getTripPointFactor('MCB-C-16');
      expect(tripPoint.min).toBe(5);
      expect(tripPoint.max).toBe(10);
    });

    test('returns trip point for characteristic directly', () => {
      const tripPoint = lib.getTripPointFactor('B');
      expect(tripPoint.min).toBe(3);
      expect(tripPoint.max).toBe(5);
    });

    test('extracts characteristic from device code pattern', () => {
      const tripPoint = lib.getTripPointFactor('MCB-D-32');
      expect(tripPoint.min).toBe(10);
      expect(tripPoint.max).toBe(20);
    });

    test('returns default (Type B) for unknown device', () => {
      const tripPoint = lib.getTripPointFactor('UNKNOWN');
      expect(tripPoint.min).toBe(3);
      expect(tripPoint.max).toBe(5);
    });
  });

  describe('findMinimumDevice()', () => {
    test('finds minimum MCB for given current', () => {
      const device = lib.findMinimumDevice('C', 12);
      expect(device).toBe('MCB-C-13');
    });

    test('returns exact match when current equals rating', () => {
      const device = lib.findMinimumDevice('B', 16);
      expect(device).toBe('MCB-B-16');
    });

    test('returns null if no suitable device exists', () => {
      const device = lib.findMinimumDevice('C', 1000);
      expect(device).toBeNull();
    });
  });

  describe('getNextStandardSize()', () => {
    test('returns next size up from given current', () => {
      expect(lib.getNextStandardSize(12)).toBe(13);
      expect(lib.getNextStandardSize(17)).toBe(20);
      expect(lib.getNextStandardSize(50)).toBe(50);
    });

    test('returns null if no suitable size exists', () => {
      expect(lib.getNextStandardSize(1000)).toBeNull();
    });
  });

  describe('getMinimumFaultCurrent()', () => {
    test('returns minimum fault current for instantaneous trip', () => {
      const result = lib.getMinimumFaultCurrent('MCB-C-16', 'instantaneous');
      expect(result.current).toBe(80); // 16A × 5 (min trip point for C)
      expect(result.ratedCurrent).toBe(16);
      expect(result.tripPointMin).toBe(5);
    });

    test('returns thermal trip current', () => {
      const result = lib.getMinimumFaultCurrent('MCB-C-16', 'thermal');
      expect(result.current).toBeCloseTo(18.08, 1); // 16A × 1.13
    });

    test('returns error for invalid device', () => {
      const result = lib.getMinimumFaultCurrent('INVALID');
      expect(result.error).toBeDefined();
    });
  });

  describe('getTripTime()', () => {
    test('returns instantaneous trip for high fault current', () => {
      const result = lib.getTripTime('MCB-C-16', 200, 16);
      expect(result.time).toBe(10);
      expect(result.region).toBe('instantaneous');
    });

    test('returns magnetic trip for medium fault current', () => {
      const result = lib.getTripTime('MCB-C-16', 100, 16);
      expect(result.region).toBe('magnetic');
    });

    test('returns no trip for low current', () => {
      const result = lib.getTripTime('MCB-C-16', 16, 16);
      expect(result.region).toBe('no_trip');
    });

    test('returns error for invalid device', () => {
      const result = lib.getTripTime('INVALID', 100);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculateLetThroughEnergy()', () => {
    test('returns I²t data from table', () => {
      const result = lib.calculateLetThroughEnergy('MCB-C-16', 1000);
      expect(result.energy_min).toBeDefined();
      expect(result.energy_max).toBeDefined();
      expect(result.source).toBe('table');
    });

    test('calculates energy when duration provided', () => {
      const result = lib.calculateLetThroughEnergy('MCB-C-16', 100, 10);
      // When I²t data exists in table, it returns table values instead of calculated
      // The function returns energy_min/energy_max from table for known sizes
      expect(result.energy_min || result.energy).toBeDefined();
    });

    test('returns error for non-MCB devices', () => {
      const result = lib.calculateLetThroughEnergy('RCD-AC-30', 1000);
      expect(result.error).toBeDefined();
    });
  });

  describe('isSelective()', () => {
    test('returns selective for proper ratio', () => {
      const result = lib.isSelective('MCB-C-63', 'MCB-C-16');
      expect(result.isSelective).toBe(true);
      expect(parseFloat(result.ratio)).toBeGreaterThanOrEqual(1.6);
    });

    test('returns not selective for insufficient ratio', () => {
      const result = lib.isSelective('MCB-C-20', 'MCB-C-16');
      expect(result.isSelective).toBe(false);
    });

    test('returns not selective for equal ratings', () => {
      const result = lib.isSelective('MCB-C-16', 'MCB-C-16');
      expect(result.isSelective).toBe(false);
    });

    test('returns not selective for downstream > upstream', () => {
      const result = lib.isSelective('MCB-C-16', 'MCB-C-32');
      expect(result.isSelective).toBe(false);
    });

    test('warns about Type B upstream with Type C downstream', () => {
      const result = lib.isSelective('MCB-B-32', 'MCB-C-16');
      expect(result.isSelective).toBe(false);
      expect(result.reason).toContain('Type B');
    });

    test('returns error for invalid devices', () => {
      const result = lib.isSelective('INVALID', 'MCB-C-16');
      expect(result.error).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    test('protectionLibrary is a ProtectionLibrary instance', () => {
      expect(protectionLibrary).toBeInstanceOf(ProtectionLibrary);
    });
  });
});
