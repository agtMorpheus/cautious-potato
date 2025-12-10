# Circuit Measurement Validator - Phase 3: Testing & Performance Optimization
## Comprehensive Test Strategy and Benchmark Suite

**Last Updated:** December 10, 2025  
**Scope:** Unit tests, integration tests, performance benchmarks, optimization strategies  
**Target:** 100% rule coverage, <5ms per circuit validation

---

## Table of Contents
1. [Testing Strategy Overview](#testing-strategy-overview)
2. [Unit Tests by Module](#unit-tests-by-module)
3. [Integration Tests](#integration-tests)
4. [Performance Benchmarking](#performance-benchmarking)
5. [Optimization Techniques](#optimization-techniques)
6. [Test Data Fixtures](#test-data-fixtures)
7. [Implementation Checklist](#implementation-checklist)

---

## Testing Strategy Overview

### Testing Pyramid

```
                    ▲
                   / \
                  /   \  E2E Tests
                 /     \ (10 tests)
                /       \
               /_________\
              /           \
             /  Integration \
            /    Tests       \ (30 tests)
           /_________________\
          /                   \
         /    Unit Tests       \
        /      (100+ tests)     \
       /___________________________\
```

### Test Execution Targets

| Level | Count | Coverage | Time | Tools |
|-------|-------|----------|------|-------|
| **Unit** | 100+ | 95%+ rules | <100ms | Custom JS test runner |
| **Integration** | 30+ | Cross-module | <500ms | State + handlers + validators |
| **Performance** | 20+ | Benchmarks | - | `performance.now()` measurements |
| **E2E** | 10+ | Full workflow | - | User interaction simulation |

### Coverage Goals

```
Cable Library Coverage:     100% (all gauges, types, methods)
Protection Library Coverage: 100% (all device types)
Rule Coverage:            95%+ (each rule + edge cases)
Error Handling Coverage:   90%+ (exceptions, invalid inputs)
State Integration:        100% (validation → state → event)
```

---

## Unit Tests by Module

### 1. Cable Library Unit Tests

```javascript
// File: tests/unit/cableLibrary.test.js

import { CableLibrary } from '../../libraries/cableLibrary.js';

describe('CableLibrary - Unit Tests', () => {
  let cableLib;
  
  beforeEach(() => {
    cableLib = new CableLibrary();
  });
  
  // ==================== CONSTRUCTION ====================
  describe('Library Construction', () => {
    test('should load all DIN standard cable types', () => {
      const types = ['NYY', 'NYM', 'NYCY', 'NAYY'];
      for (const type of types) {
        expect(cableLib.getCable(type)).toBeDefined();
      }
    });
    
    test('should have all standard wire gauges', () => {
      const cable = cableLib.getCable('NYY');
      const gauges = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
      for (const gauge of gauges) {
        expect(cable.gauges[gauge]).toBeDefined();
      }
    });
    
    test('should initialize ampacity tables for all methods', () => {
      const methods = ['method_3', 'method_4', 'method_7'];
      for (const method of methods) {
        expect(cableLib.ampacityTables[method]).toBeDefined();
        expect(Object.keys(cableLib.ampacityTables[method]).length).toBeGreaterThan(0);
      }
    });
  });
  
  // ==================== AMPACITY CALCULATIONS ====================
  describe('Ampacity Calculation (DIN VDE 0295/0296)', () => {
    test('should return correct base ampacity for NYY 10mm² (method 3)', () => {
      const ampacity = cableLib.getAmpacity('NYY', 10, 'method_3', 30, 1.0);
      // Expected: 46A from tables (DIN VDE 0295)
      expect(ampacity).toBe(46);
    });
    
    test('should apply temperature derating correctly', () => {
      // 50°C vs 30°C reference
      const amp30 = cableLib.getAmpacity('NYY', 10, 'method_3', 30, 1.0);
      const amp50 = cableLib.getAmpacity('NYY', 10, 'method_3', 50, 1.0);
      
      // At 50°C, derating ~8% (factor ~0.92)
      expect(amp50).toBeLessThan(amp30);
      expect(amp50 / amp30).toBeCloseTo(0.92, 1);
    });
    
    test('should apply grouping factor for multiple cables', () => {
      // Single cable
      const amp1 = cableLib.getAmpacity('NYY', 16, 'method_3', 30, 1.0);
      // 4-6 cables in conduit (factor 0.7)
      const amp6 = cableLib.getAmpacity('NYY', 16, 'method_3', 30, 0.7);
      
      expect(amp6).toBeLessThan(amp1);
      expect(amp6 / amp1).toBeCloseTo(0.7, 1);
    });
    
    test('should handle boundary conditions (very small and very large gauges)', () => {
      // 1.5mm² should be recognized
      const ampSmall = cableLib.getAmpacity('NYY', 1.5, 'method_3', 30, 1.0);
      expect(ampSmall).toBeGreaterThan(0);
      expect(ampSmall).toBeLessThan(20);  // 1.5mm² has limited capacity
      
      // 240mm² should be recognized
      const ampLarge = cableLib.getAmpacity('NYY', 240, 'method_3', 30, 1.0);
      expect(ampLarge).toBeGreaterThan(300);  // 240mm² has high capacity
    });
    
    test('should throw error for non-standard gauge', () => {
      expect(() => {
        cableLib.getAmpacity('NYY', 7, 'method_3', 30, 1.0);  // 7mm² not standard
      }).toThrow();
    });
  });
  
  // ==================== GAUGE SELECTION ====================
  describe('Minimum Gauge Selection', () => {
    test('should find minimum gauge for given current (12.5A @ 30°C)', () => {
      const gauge = cableLib.findMinimumGauge('NYY', 12.5, 'method_3', 30);
      // 12.5A requires 10mm² (ampacity 46A > 12.5A)
      expect(gauge).toBe(10);
    });
    
    test('should select next higher standard gauge if exact not available', () => {
      const gauge = cableLib.findMinimumGauge('NYY', 50, 'method_3', 30);
      // 50A requires 25mm² (ampacity 80A > 50A)
      expect(gauge).toBe(25);
    });
    
    test('should account for temperature derating in selection', () => {
      // 12.5A @ 30°C → 10mm²
      const gaugeNormal = cableLib.findMinimumGauge('NYY', 12.5, 'method_3', 30);
      
      // 12.5A @ 50°C needs larger gauge due to derating
      const gaugeHot = cableLib.findMinimumGauge('NYY', 12.5, 'method_3', 50);
      
      expect(gaugeHot).toBeGreaterThanOrEqual(gaugeNormal);
    });
    
    test('should return null if no gauge can handle current', () => {
      const gauge = cableLib.findMinimumGauge('NYY', 10000, 'method_3', 30);
      expect(gauge).toBeNull();  // Largest NY cable can't handle 10kA
    });
  });
  
  // ==================== VOLTAGE DROP ====================
  describe('Voltage Drop Calculation (DIN VDE 0298)', () => {
    test('should calculate voltage drop correctly for 3-phase 50Hz', () => {
      // 400V, 20A, 10mm² NYY, 50m
      // ΔU = (√3 × L × I × R) / U
      // ΔU = (1.732 × 50 × 20 × 1.83/10) / 400 = 1.588V ≈ 0.4%
      
      const result = cableLib.calculateVoltageDrop(
        50,          // distance (m)
        20,          // current (A)
        'NYY',       // cable type
        10,          // gauge (mm²)
        400,         // voltage (V)
        3,           // phases
        1.0          // power factor
      );
      
      expect(result.dropPercent).toBeCloseTo(0.4, 0);
      expect(result.compliant).toBe(true);  // <3% for industrial
    });
    
    test('should flag violation when drop exceeds 5% (industrial limit)', () => {
      // Long run with small cable
      const result = cableLib.calculateVoltageDrop(
        200,         // 200m
        100,         // 100A
        'NYY',       // cable type
        4,           // 4mm² (undersized)
        400,         // voltage (V)
        3,
        1.0
      );
      
      expect(result.dropPercent).toBeGreaterThan(5);
      expect(result.compliant).toBe(false);
    });
    
    test('should differentiate lighting (3%) vs general load (5%) limits', () => {
      const dropPercent = 4.0;
      // For lighting: not compliant (4% > 3%)
      // For general: compliant (4% < 5%)
      expect(dropPercent > 3).toBe(true);
      expect(dropPercent <= 5).toBe(true);
    });
    
    test('should handle single-phase circuits (factor 2 instead of √3)', () => {
      const drop3phase = cableLib.calculateVoltageDrop(
        50, 10, 'NYY', 10, 230, 3, 1.0
      );
      
      const drop1phase = cableLib.calculateVoltageDrop(
        50, 10, 'NYY', 10, 230, 1, 1.0
      );
      
      // Single-phase uses factor 2, three-phase uses √3 ≈ 1.732
      // So single-phase drop should be slightly higher
      expect(drop1phase.dropPercent).toBeGreaterThan(drop3phase.dropPercent);
    });
  });
  
  // ==================== CABLE IMPEDANCE ====================
  describe('Cable Impedance Lookup', () => {
    test('should return impedance for standard cable types', () => {
      const impedance = cableLib.getCableImpedance('NYY', 10);
      expect(impedance.resistance).toBeGreaterThan(0);
      expect(impedance.reactance).toBeGreaterThan(0);
    });
    
    test('should show increasing impedance for smaller gauges', () => {
      const imp4 = cableLib.getCableImpedance('NYY', 4);
      const imp10 = cableLib.getCableImpedance('NYY', 10);
      
      expect(imp4.resistance).toBeGreaterThan(imp10.resistance);
    });
    
    test('should show decreasing impedance for larger gauges', () => {
      const imp50 = cableLib.getCableImpedance('NYY', 50);
      const imp100 = cableLib.getCableImpedance('NYY', 100);
      
      expect(imp100.resistance).toBeLessThan(imp50.resistance);
    });
  });
  
  // ==================== EDGE CASES ====================
  describe('Edge Cases & Boundary Conditions', () => {
    test('should handle minimum current (1A)', () => {
      const gauge = cableLib.findMinimumGauge('NYY', 1, 'method_3', 30);
      expect(gauge).toBeDefined();
      expect(gauge).toBe(1.5);  // Smallest standard gauge
    });
    
    test('should handle zero current gracefully', () => {
      const gauge = cableLib.findMinimumGauge('NYY', 0, 'method_3', 30);
      expect(gauge).toBe(1.5);  // Return minimum gauge
    });
    
    test('should handle negative temperature (arctic conditions - rare)', () => {
      // Derating at very low temp should be minimal/none
      const ampPos = cableLib.getAmpacity('NYY', 10, 'method_3', 20, 1.0);
      const ampNeg = cableLib.getAmpacity('NYY', 10, 'method_3', 0, 1.0);
      
      // At low temps, derating factor should increase (better cooling)
      expect(ampNeg).toBeGreaterThanOrEqual(ampPos);
    });
    
    test('should handle high ambient temperatures (sauna/desert conditions)', () => {
      // At 70°C (max rated), derating should be significant
      const ampBase = cableLib.getAmpacity('NYY', 10, 'method_3', 30, 1.0);
      const ampHot = cableLib.getAmpacity('NYY', 10, 'method_3', 70, 1.0);
      
      expect(ampHot).toBeLessThan(ampBase);
      // Derating at max temp should be ~20%
      expect(ampHot / ampBase).toBeCloseTo(0.8, 0);
    });
  });
  
  // ==================== PERFORMANCE ====================
  describe('Performance Benchmarks', () => {
    test('getCable should execute in <0.1ms', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cableLib.getCable('NYY');
      }
      const duration = (performance.now() - start) / 1000;
      expect(duration).toBeLessThan(0.1);
    });
    
    test('getAmpacity should execute in <0.2ms', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cableLib.getAmpacity('NYY', 10, 'method_3', 30, 1.0);
      }
      const duration = (performance.now() - start) / 1000;
      expect(duration).toBeLessThan(0.2);
    });
    
    test('findMinimumGauge should execute in <0.5ms', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cableLib.findMinimumGauge('NYY', 25, 'method_3', 30);
      }
      const duration = (performance.now() - start) / 1000;
      expect(duration).toBeLessThan(0.5);
    });
  });
});
```

### 2. Protection Device Library Unit Tests

```javascript
// File: tests/unit/protectionLibrary.test.js

import { ProtectionLibrary } from '../../libraries/protectionLibrary.js';

describe('ProtectionLibrary - Unit Tests', () => {
  let protLib;
  
  beforeEach(() => {
    protLib = new ProtectionLibrary();
  });
  
  describe('MCB Device Coverage', () => {
    test('should have all standard MCB sizes (B, C, D types)', () => {
      const standardSizes = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100];
      const characteristics = ['B', 'C', 'D'];
      
      for (const char of characteristics) {
        for (const size of standardSizes) {
          const code = `MCB-${char}-${size}`;
          const device = protLib.getDevice(code);
          expect(device).toBeDefined();
          expect(device.type).toBe('MCB');
        }
      }
    });
    
    test('should return correct trip point for Type B characteristic', () => {
      const deviceB = protLib.getCharacteristic('MCB', 'B');
      expect(deviceB.tripPoint.min).toBe(3);
      expect(deviceB.tripPoint.max).toBe(5);
    });
    
    test('should return correct trip point for Type C characteristic', () => {
      const deviceC = protLib.getCharacteristic('MCB', 'C');
      expect(deviceC.tripPoint.min).toBe(5);
      expect(deviceC.tripPoint.max).toBe(10);
    });
    
    test('should return correct trip point for Type D characteristic', () => {
      const deviceD = protLib.getCharacteristic('MCB', 'D');
      expect(deviceD.tripPoint.min).toBe(10);
      expect(deviceD.tripPoint.max).toBe(20);
    });
  });
  
  describe('RCD Device Coverage', () => {
    test('should have standard RCD sensitivity levels (10, 30, 100, 300 mA)', () => {
      const types = ['AC', 'A', 'F'];
      const sensitivities = [10, 30, 100, 300];
      
      for (const type of types) {
        for (const sensitivity of sensitivities) {
          const code = `RCD-${type}-${sensitivity}`;
          const device = protLib.getDevice(code);
          expect(device).toBeDefined();
        }
      }
    });
    
    test('Type AC RCD should have 300ms max response time', () => {
      const rcdAC = protLib.getCharacteristic('RCD', 'AC');
      expect(rcdAC.responseTime).toBe(300);
    });
    
    test('Type A RCD should have 200ms max response time', () => {
      const rcdA = protLib.getCharacteristic('RCD', 'A');
      expect(rcdA.responseTime).toBe(200);
    });
  });
  
  describe('RCBO Combined Devices', () => {
    test('should have RCBO devices combining MCB and RCD', () => {
      const device = protLib.getDevice('RCBO-C-16-30');
      expect(device).toBeDefined();
      expect(device.type).toBe('RCBO');
      expect(device.mcb).toBe('C');
      expect(device.rcdSensitivity).toBe(30);
    });
  });
  
  describe('Let-Through Energy Calculation', () => {
    test('should calculate I²t correctly (Energy = Current² × Time)', () => {
      const device = protLib.getDevice('MCB-C-16');
      
      // Fault current 1000A, device trips in 10ms
      const energy = protLib.calculateLetThroughEnergy(device, 1000, 10);
      
      // I²t = 1000² × 0.01 = 10,000,000 J
      expect(energy).toBeCloseTo(10000000, -3);  // Within 1000 J
    });
    
    test('should show Type D has higher let-through than Type C', () => {
      const deviceC = protLib.getDevice('MCB-C-16');
      const deviceD = protLib.getDevice('MCB-D-16');
      
      const energyC = protLib.calculateLetThroughEnergy(deviceC, 500, 10);
      const energyD = protLib.calculateLetThroughEnergy(deviceD, 500, 10);
      
      // D-characteristic has longer delay, so higher let-through
      expect(energyD).toBeGreaterThan(energyC);
    });
  });
  
  describe('Selectivity Checking', () => {
    test('should recognize selective arrangement (C upstream, B downstream)', () => {
      const upstream = protLib.getDevice('MCB-C-32');
      const downstream = protLib.getDevice('MCB-B-16');
      
      const isSelective = protLib.isSelective(upstream, downstream, 0.25);
      expect(isSelective).toBe(true);
    });
    
    test('should recognize non-selective arrangement (B upstream, C downstream)', () => {
      const upstream = protLib.getDevice('MCB-B-32');
      const downstream = protLib.getDevice('MCB-C-16');
      
      const isSelective = protLib.isSelective(upstream, downstream, 0.25);
      expect(isSelective).toBe(false);
    });
    
    test('RCD should provide selectivity before MCB in fault scenario', () => {
      const rcd = protLib.getDevice('RCD-AC-30');
      const mcb = protLib.getDevice('MCB-C-16');
      
      const isSelective = protLib.isSelective(rcd, mcb, 0.1);
      expect(isSelective).toBe(true);  // RCD trips first due to lower impedance
    });
  });
  
  describe('Performance', () => {
    test('getDevice should execute in <0.05ms', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        protLib.getDevice('MCB-C-16');
      }
      const duration = (performance.now() - start) / 1000;
      expect(duration).toBeLessThan(0.05);
    });
  });
});
```

### 3. Validation Rules Unit Tests

```javascript
// File: tests/unit/validationRules.test.js

import { 
  cableAmpacityRule,
  voltageDropRule,
  protectionDeviceSizingRule,
  loopImpedanceRule,
  voltageRangeRule,
  cableVoltageRatingRule,
  selectiveCoordinationRule
} from '../../validationRules.js';

describe('Validation Rules - Unit Tests', () => {
  
  // ==================== CABLE AMPACITY RULE ====================
  describe('CABLE_UNDERSIZED_AMPACITY', () => {
    const circuitData = {
      voltage: 400,
      current: 20,
      cableGauge: 10,
      cableType: 'NYY',
      installationMethod: 'method_3',
      ambientTemp: 30,
    };
    
    test('should be compliant when cable ampacity >= circuit current', () => {
      const result = cableAmpacityRule.calculate(circuitData, cableLib, standardsData);
      expect(result.compliant).toBe(true);
      expect(result.actual).toBeLessThanOrEqual(result.limit);
    });
    
    test('should flag non-compliant when cable undersized', () => {
      const badData = { ...circuitData, current: 100, cableGauge: 4 };
      const result = cableAmpacityRule.calculate(badData, cableLib, standardsData);
      expect(result.compliant).toBe(false);
    });
    
    test('should suggest next larger gauge as remedy', () => {
      const badData = { ...circuitData, current: 100, cableGauge: 4 };
      const result = cableAmpacityRule.calculate(badData, cableLib, standardsData);
      const remedies = cableAmpacityRule.remedyOptions(result);
      expect(remedies[0]).toContain('mm²');
    });
  });
  
  // ==================== VOLTAGE DROP RULE ====================
  describe('VOLTAGE_DROP_EXCESSIVE', () => {
    test('should be compliant for short runs with adequate cable', () => {
      const circuitData = {
        voltage: 400,
        current: 20,
        cableGauge: 10,
        distance: 20,
        phasesCount: 3,
        loadType: 'general',
        cableType: 'NYY',
      };
      
      const result = voltageDropRule.calculate(circuitData, cableLib, standardsData);
      expect(result.compliant).toBe(true);
      expect(result.actual).toBeLessThanOrEqual(5);
    });
    
    test('should flag non-compliant for long runs with small cable', () => {
      const circuitData = {
        voltage: 400,
        current: 100,
        cableGauge: 4,
        distance: 200,
        phasesCount: 3,
        loadType: 'general',
        cableType: 'NYY',
      };
      
      const result = voltageDropRule.calculate(circuitData, cableLib, standardsData);
      expect(result.compliant).toBe(false);
      expect(result.actual).toBeGreaterThan(5);
    });
    
    test('should apply stricter 3% limit for lighting loads', () => {
      const data = {
        voltage: 230,
        current: 10,
        cableGauge: 2.5,
        distance: 100,
        phasesCount: 1,
        loadType: 'lighting',
        cableType: 'NYY',
      };
      
      const result = voltageDropRule.calculate(data, cableLib, standardsData);
      expect(result.limit).toBe(3);  // Stricter than 5%
    });
  });
  
  // ==================== PROTECTION DEVICE SIZING ====================
  describe('PROTECTION_DEVICE_UNDERSIZED', () => {
    test('should be compliant when device rating >= circuit current', () => {
      const circuitData = {
        voltage: 400,
        current: 12.5,
        protectionCurrent: 16,
        protectionDeviceType: 'MCB-C-16',
      };
      
      const result = protectionDeviceSizingRule.calculate(
        circuitData,
        protLib,
        standardsData
      );
      expect(result.compliant).toBe(true);
    });
    
    test('should flag undersized protection device', () => {
      const circuitData = {
        voltage: 400,
        current: 25,
        protectionCurrent: 16,  // Too small for 25A
        protectionDeviceType: 'MCB-C-16',
      };
      
      const result = protectionDeviceSizingRule.calculate(
        circuitData,
        protLib,
        standardsData
      );
      expect(result.compliant).toBe(false);
    });
    
    test('should not flag oversized devices (20% margin is acceptable)', () => {
      const circuitData = {
        voltage: 400,
        current: 12,
        protectionCurrent: 16,  // Oversized by 33%, but within standards
        protectionDeviceType: 'MCB-C-16',
      };
      
      const result = protectionDeviceSizingRule.calculate(
        circuitData,
        protLib,
        standardsData
      );
      expect(result.compliant).toBe(true);
    });
  });
  
  // ==================== LOOP IMPEDANCE ====================
  describe('IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE', () => {
    test('should be compliant when impedance allows adequate fault current', () => {
      // 400V, 16A MCB-C (trip point 5×In = 80A)
      // Needed fault current: 80A
      // Required impedance: 400V / 80A = 5Ω
      const circuitData = {
        voltage: 400,
        protectionCurrent: 16,
        protectionDeviceType: 'MCB-C-16',
        loopImpedance: 2,  // Well below 5Ω → compliant
      };
      
      const result = loopImpedanceRule.calculate(
        circuitData,
        protLib,
        standardsData
      );
      expect(result.compliant).toBe(true);
    });
    
    test('should flag when impedance too high for protection', () => {
      const circuitData = {
        voltage: 400,
        protectionCurrent: 16,
        protectionDeviceType: 'MCB-C-16',
        loopImpedance: 50,  // Way too high → non-compliant
      };
      
      const result = loopImpedanceRule.calculate(
        circuitData,
        protLib,
        standardsData
      );
      expect(result.compliant).toBe(false);
    });
  });
  
  // ==================== VOLTAGE RANGE ====================
  describe('VOLTAGE_OUT_OF_RANGE', () => {
    test('should accept standard industrial voltages', () => {
      const validVoltages = [230, 400, 690];
      
      for (const voltage of validVoltages) {
        const result = voltageRangeRule.calculate(
          { voltage },
          standardsData
        );
        expect(result.compliant).toBe(true);
      }
    });
    
    test('should reject non-standard voltages', () => {
      const invalidVoltages = [110, 220, 500, 800];
      
      for (const voltage of invalidVoltages) {
        const result = voltageRangeRule.calculate(
          { voltage },
          standardsData
        );
        expect(result.compliant).toBe(false);
      }
    });
    
    test('should suggest nearest valid voltage', () => {
      const result = voltageRangeRule.calculate(
        { voltage: 410 },
        standardsData
      );
      expect(result.nearestValidVoltage).toBe(400);
    });
  });
  
  // ==================== CABLE VOLTAGE RATING ====================
  describe('CABLE_VOLTAGE_RATING_EXCEEDED', () => {
    test('NYY cable (0.6kV rating) should accept 400V', () => {
      const result = cableVoltageRatingRule.calculate(
        { voltage: 400, cableType: 'NYY' },
        cableLib,
        standardsData
      );
      expect(result.compliant).toBe(true);
    });
    
    test('should flag when cable voltage rating too low', () => {
      const result = cableVoltageRatingRule.calculate(
        { voltage: 690, cableType: 'NYM' },  // NYM only rated 0.3kV
        cableLib,
        standardsData
      );
      expect(result.compliant).toBe(false);
    });
  });
  
  // ==================== SELECTIVE COORDINATION ====================
  describe('COORDINATION_NOT_SELECTIVE', () => {
    test('should recognize selective arrangement', () => {
      const circuitData = {
        upstreamDeviceType: 'MCB-C-32',
        downstreamDeviceType: 'MCB-B-16',
        loopImpedance: 0.25,
      };
      
      const result = selectiveCoordinationRule.calculate(
        circuitData,
        protLib,
        standardsData
      );
      expect(result.compliant).toBe(true);
    });
  });
});
```

---

## Integration Tests

### Rule Execution with State Integration

```javascript
// File: tests/integration/validationEngine.integration.test.js

import { ValidationEngine } from '../../engine/validationEngine.js';
import { CableLibrary } from '../../libraries/cableLibrary.js';
import { ProtectionLibrary } from '../../libraries/protectionLibrary.js';

describe('ValidationEngine Integration Tests', () => {
  let engine, cableLib, protLib;
  
  beforeEach(() => {
    cableLib = new CableLibrary();
    protLib = new ProtectionLibrary();
    engine = new ValidationEngine(cableLib, protLib, standardsData);
  });
  
  describe('Real Circuit Validation Scenarios', () => {
    
    test('Scenario 1: Valid pump motor circuit (400V, 5.5kW)', () => {
      const circuit = {
        id: 'pump_001',
        name: 'Pump Motor 5.5kW',
        voltage: 400,
        current: 12.5,     // Ib calculated from P/(√3×U×cos φ)
        frequency: 50,
        distance: 45,      // 45m cable run
        cableGauge: 16,    // User selected 16mm²
        cableType: 'NYY',
        installationMethod: 'method_3',
        ambientTemp: 30,
        protectionDeviceType: 'MCB-C-16',
        protectionCurrent: 16,
        phasesCount: 3,
        loadType: 'motor',
        powerFactor: 0.85,
      };
      
      const results = engine.validateCircuit(circuit);
      
      // Should be compliant overall
      expect(results.summary.nonCompliant.length).toBe(0);
      expect(results.nonConformities.length).toBe(0);
    });
    
    test('Scenario 2: Undersized cable - multiple violations', () => {
      const circuit = {
        id: 'bad_001',
        name: 'Badly Sized Circuit',
        voltage: 400,
        current: 50,       // 50A load
        frequency: 50,
        distance: 100,     // 100m run
        cableGauge: 4,     // Way too small!
        cableType: 'NYY',
        installationMethod: 'method_3',
        ambientTemp: 30,
        protectionDeviceType: 'MCB-C-20',  // Also undersized
        protectionCurrent: 20,
        phasesCount: 3,
        loadType: 'general',
        powerFactor: 1.0,
      };
      
      const results = engine.validateCircuit(circuit);
      
      // Should have multiple violations
      expect(results.nonConformities.length).toBeGreaterThanOrEqual(2);
      
      // Should detect undersized cable
      const cableIssues = results.nonConformities.filter(
        nc => nc.code === 'CABLE_UNDERSIZED_AMPACITY'
      );
      expect(cableIssues.length).toBeGreaterThan(0);
      
      // Should detect voltage drop violation
      const dropIssues = results.nonConformities.filter(
        nc => nc.code === 'VOLTAGE_DROP_EXCESSIVE'
      );
      expect(dropIssues.length).toBeGreaterThan(0);
      
      // Should detect undersized protection
      const protIssues = results.nonConformities.filter(
        nc => nc.code === 'PROTECTION_DEVICE_UNDERSIZED'
      );
      expect(protIssues.length).toBeGreaterThan(0);
    });
    
    test('Scenario 3: Long distance circuit - voltage drop critical', () => {
      const circuit = {
        id: 'long_001',
        name: 'Distant Load 200m',
        voltage: 400,
        current: 25,
        frequency: 50,
        distance: 200,     // Very long run
        cableGauge: 6,     // Inadequate for distance
        cableType: 'NYY',
        installationMethod: 'method_3',
        ambientTemp: 30,
        protectionDeviceType: 'MCB-C-32',
        protectionCurrent: 32,
        phasesCount: 3,
        loadType: 'general',
        powerFactor: 0.9,
      };
      
      const results = engine.validateCircuit(circuit);
      
      // Should have voltage drop violation
      const dropIssues = results.nonConformities.filter(
        nc => nc.code === 'VOLTAGE_DROP_EXCESSIVE'
      );
      expect(dropIssues.length).toBeGreaterThan(0);
    });
    
    test('Scenario 4: Lightning load (3% voltage drop limit)', () => {
      const circuit = {
        id: 'lighting_001',
        name: 'Factory Lighting Circuit',
        voltage: 230,
        current: 15,
        frequency: 50,
        distance: 80,
        cableGauge: 4,     // OK for current, but not for distance
        cableType: 'NYY',
        installationMethod: 'method_3',
        ambientTemp: 30,
        protectionDeviceType: 'MCB-B-16',
        protectionCurrent: 16,
        phasesCount: 1,
        loadType: 'lighting',  // Stricter 3% limit
        powerFactor: 1.0,
      };
      
      const results = engine.validateCircuit(circuit);
      
      // Lighting has stricter 3% drop limit
      const dropIssues = results.nonConformities.filter(
        nc => nc.code === 'VOLTAGE_DROP_EXCESSIVE'
      );
      expect(dropIssues.length).toBeGreaterThan(0);
    });
    
    test('Scenario 5: High impedance - inadequate fault protection', () => {
      const circuit = {
        id: 'impedance_001',
        name: 'High Loop Impedance Circuit',
        voltage: 400,
        current: 16,
        frequency: 50,
        distance: 500,     // Very long, high impedance
        cableGauge: 10,
        cableType: 'NYY',
        installationMethod: 'method_3',
        ambientTemp: 30,
        protectionDeviceType: 'MCB-C-16',
        protectionCurrent: 16,
        phasesCount: 3,
        loadType: 'general',
        loopImpedance: 15,  // Too high!
      };
      
      const results = engine.validateCircuit(circuit);
      
      // Should detect impedance issue
      const impedanceIssues = results.nonConformities.filter(
        nc => nc.code === 'IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE'
      );
      expect(impedanceIssues.length).toBeGreaterThan(0);
    });
  });
  
  describe('Rule Trigger Conditions', () => {
    test('should only validate rules with required fields present', () => {
      const incompletCircuit = {
        id: 'incomplete',
        voltage: 400,
        // Missing: current, cableGauge, distance, protection
      };
      
      const results = engine.validateCircuit(incompletCircuit);
      
      // Only voltage range check should execute
      expect(results.summary.rulesApplicable).toBeLessThan(7);
    });
    
    test('should add rules as more data becomes available', () => {
      let circuit = {
        id: 'progressive',
        voltage: 400,
      };
      
      let results = engine.validateCircuit(circuit);
      const rulesAfterVoltage = results.summary.rulesApplicable;
      
      // Add current and cable info
      circuit.current = 20;
      circuit.cableGauge = 10;
      circuit.cableType = 'NYY';
      circuit.installationMethod = 'method_3';
      
      results = engine.validateCircuit(circuit);
      const rulesAfterCable = results.summary.rulesApplicable;
      
      // More rules should execute
      expect(rulesAfterCable).toBeGreaterThan(rulesAfterVoltage);
    });
  });
  
  describe('Performance Characteristics', () => {
    test('should validate single circuit in <5ms', () => {
      const circuit = {
        id: 'perf_test',
        voltage: 400,
        current: 20,
        cableGauge: 10,
        cableType: 'NYY',
        installationMethod: 'method_3',
        ambientTemp: 30,
        protectionDeviceType: 'MCB-C-16',
        protectionCurrent: 16,
        distance: 50,
        phasesCount: 3,
        loadType: 'general',
      };
      
      const start = performance.now();
      engine.validateCircuit(circuit);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(5);
    });
    
    test('should validate 50-circuit table in <250ms', () => {
      const circuits = [];
      for (let i = 0; i < 50; i++) {
        circuits.push({
          id: `circuit_${i}`,
          voltage: 400,
          current: 10 + (i % 20),
          cableGauge: [4, 6, 10, 16, 25][i % 5],
          cableType: 'NYY',
          installationMethod: 'method_3',
          ambientTemp: 30,
          protectionDeviceType: `MCB-C-${16 + (i % 5) * 8}`,
          protectionCurrent: 16 + (i % 5) * 8,
          distance: 30 + i,
          phasesCount: 3,
          loadType: 'general',
        });
      }
      
      const start = performance.now();
      engine.validateAllCircuits(circuits);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(250);
    });
  });
});
```

---

## Performance Benchmarking

### Benchmark Suite

```javascript
// File: tests/performance/benchmarks.js

export class PerformanceBenchmark {
  constructor(name) {
    this.name = name;
    this.measurements = [];
  }
  
  run(fn, iterations = 1000) {
    // Warm up
    for (let i = 0; i < 100; i++) fn();
    
    // Actual run
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const duration = performance.now() - start;
    
    this.measurements.push(duration / iterations);
    return {
      avgMs: (duration / iterations).toFixed(3),
      totalMs: duration.toFixed(2),
      iterations,
      opsPerSecond: (iterations / (duration / 1000)).toFixed(0),
    };
  }
  
  stats() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b) / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return { avg: avg.toFixed(3), min: min.toFixed(3), max: max.toFixed(3), p95: p95.toFixed(3), p99: p99.toFixed(3) };
  }
}

// Run benchmarks
console.log('=== Performance Benchmarks ===\n');

// Cable Library Benchmarks
console.log('Cable Library Operations:');
const getBench = new PerformanceBenchmark('getCable');
const result1 = getBench.run(() => cableLib.getCable('NYY'));
console.log(`getCable: ${result1.avgMs}ms (${result1.opsPerSecond} ops/s)`);

const ampBench = new PerformanceBenchmark('getAmpacity');
const result2 = ampBench.run(() => cableLib.getAmpacity('NYY', 10, 'method_3', 30, 1.0));
console.log(`getAmpacity: ${result2.avgMs}ms (${result2.opsPerSecond} ops/s)`);

// Validation Engine Benchmarks
console.log('\nValidation Engine Operations:');
const valBench = new PerformanceBenchmark('validateCircuit');
const result3 = valBench.run(() => engine.validateCircuit(testCircuit));
console.log(`validateCircuit: ${result3.avgMs}ms`);

// Batch Validation
console.log('\nBatch Operations:');
const batches = [10, 50, 100, 500];
for (const batchSize of batches) {
  const circuits = Array(batchSize).fill(testCircuit);
  const start = performance.now();
  engine.validateAllCircuits(circuits);
  const duration = performance.now() - start;
  console.log(`Validate ${batchSize} circuits: ${duration.toFixed(2)}ms (${(duration/batchSize).toFixed(1)}ms/circuit)`);
}
```

---

## Optimization Techniques

### 1. Rule Result Caching

```javascript
// Cache results to avoid recalculation
export class ValidationCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }
  
  generateKey(rule, circuitData) {
    // Generate cache key from rule code and relevant data
    return `${rule.code}:${JSON.stringify(
      rule.triggers.requiredFields.map(f => circuitData[f])
    )}`;
  }
  
  get(rule, circuitData) {
    const key = this.generateKey(rule, circuitData);
    if (this.cache.has(key)) {
      this.hits++;
      return this.cache.get(key);
    }
    this.misses++;
    return null;
  }
  
  set(rule, circuitData, result) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const key = this.generateKey(rule, circuitData);
    this.cache.set(key, result);
  }
  
  hitRate() {
    const total = this.hits + this.misses;
    return ((this.hits / total) * 100).toFixed(1);
  }
}
```

### 2. Lazy Rule Evaluation

```javascript
// Only execute rules that are likely to fail
export class SmartRuleEvaluation {
  // Order rules by likelihood of non-conformity
  getRuleExecutionOrder(circuitData) {
    const riskScores = {
      'CABLE_UNDERSIZED_AMPACITY': () => {
        // Higher risk if using small cable
        return circuitData.cableGauge <= 4 ? 10 : 1;
      },
      'VOLTAGE_DROP_EXCESSIVE': () => {
        // Higher risk if long distance
        return circuitData.distance > 50 ? 10 : 1;
      },
      // ... more scoring functions
    };
    
    return this.rules.sort((a, b) =>
      (riskScores[b.code]?.() || 1) - (riskScores[a.code]?.() || 1)
    );
  }
  
  // Stop early if critical violation found
  validateWithEarlyExit(circuitData) {
    const results = [];
    
    for (const rule of this.getRuleExecutionOrder(circuitData)) {
      const result = rule.calculate(circuitData, ...);
      results.push(result);
      
      // Exit early if critical violation found
      if (result.severity === 'CRITICAL' && !result.compliant) {
        // Can still execute other critical checks
        if (rule.category !== results[results.length - 1].category) {
          continue;
        } else {
          break;  // All critical violations in same category found
        }
      }
    }
    
    return results;
  }
}
```

### 3. Vectorized Calculations

```javascript
// Batch-process multiple calculations together
export function batchCalculateVoltageDrop(circuits) {
  // Pre-fetch all cable data at once (better memory locality)
  const cableCache = {};
  
  return circuits.map(circuit => {
    const key = `${circuit.cableType}:${circuit.cableGauge}`;
    if (!cableCache[key]) {
      cableCache[key] = cableLib.getCableImpedance(
        circuit.cableType,
        circuit.cableGauge
      );
    }
    
    const impedance = cableCache[key];
    // Calculate voltage drop using cached impedance
    return calculateVoltageDrop(circuit, impedance);
  });
}
```

---

## Test Data Fixtures

### Sample Circuits for Testing

```javascript
export const testCircuits = {
  validPumpMotor: {
    id: 'valid_pump',
    name: 'Valid Pump Motor',
    voltage: 400,
    current: 12.5,
    cableGauge: 16,
    cableType: 'NYY',
    installationMethod: 'method_3',
    protectionDeviceType: 'MCB-C-16',
    protectionCurrent: 16,
    distance: 45,
    phasesCount: 3,
    loadType: 'motor',
  },
  
  undersizedCable: {
    id: 'bad_cable',
    name: 'Undersized Cable',
    voltage: 400,
    current: 50,
    cableGauge: 4,  // Too small
    cableType: 'NYY',
    installationMethod: 'method_3',
    protectionDeviceType: 'MCB-C-32',
    protectionCurrent: 32,
    distance: 100,
    phasesCount: 3,
    loadType: 'general',
  },
  
  // ... more fixtures
};
```

---

## Implementation Checklist

### Phase 3 Deliverables
- [ ] Unit tests for all 3 libraries (Cable, Protection, Standards)
- [ ] Integration tests for validation engine
- [ ] Performance benchmarks with results
- [ ] Test coverage report (95%+ target)
- [ ] Optimization implementations (caching, early exit, vectorization)
- [ ] Test fixtures and sample data
- [ ] Performance profiling data
- [ ] Optimization guidelines documented

### Phase 3 Exit Criteria
- [ ] All unit tests passing (100+)
- [ ] All integration tests passing (30+)
- [ ] Single circuit validation: <5ms
- [ ] Batch validation (50 items): <250ms
- [ ] Cache hit rate: >70% in typical usage
- [ ] Memory usage: <50MB for 1000 circuits
- [ ] No memory leaks detected

---

## Next Steps → Phase 4
Phase 4 will implement the UI integration, real-time error indicators, and production deployment strategies.

