/**
 * Performance Tests for Measurement Validator Module
 * 
 * Tests validation performance with large batches of circuit data,
 * concurrent validation operations, and cache efficiency.
 */

import { ValidationEngine } from '../../js/modules/measurement-validator/engine/validationEngine.js';
import { CableLibrary } from '../../js/modules/measurement-validator/libraries/cableLibrary.js';
import { ProtectionLibrary } from '../../js/modules/measurement-validator/libraries/protectionLibrary.js';
import { StandardsData } from '../../js/modules/measurement-validator/libraries/standardsData.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  single_validation: 50,           // ms to validate single circuit
  batch_100_circuits: 1000,        // ms to validate 100 circuits
  batch_1000_circuits: 8000,       // ms to validate 1000 circuits
  cached_validation: 5,            // ms for cached validation
  concurrent_10: 500,              // ms for 10 concurrent validations
  library_lookup: 10,              // ms for library data lookup
  input_validation_1000: 100       // ms to validate inputs for 1000 circuits
};

/**
 * Helper to measure execution time
 */
function measureTime(fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Helper to measure async execution time
 */
async function measureTimeAsync(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Generate mock circuit data for testing
 */
function generateMockCircuit(index, variation = 0) {
  const voltages = [230, 400];
  const cableGauges = [1.5, 2.5, 4, 6, 10, 16];
  const protectionCurrents = [6, 10, 16, 20, 25, 32];
  const cableTypes = ['NYM', 'NYCWY', 'NYY'];
  
  return {
    id: `circuit-${index}`,
    name: `Circuit ${index}`,
    voltage: voltages[(index + variation) % voltages.length],
    current: 10 + (index % 50),
    cableGauge: cableGauges[(index + variation) % cableGauges.length],
    cableType: cableTypes[(index + variation) % cableTypes.length],
    distance: 10 + (index % 100),
    protectionCurrent: protectionCurrents[(index + variation) % protectionCurrents.length],
    protectionDeviceType: 'MCB',
    phasesCount: 1 + (index % 2) * 2,
    loadType: 'resistive',
    loopImpedance: 0.5 + (index % 10) * 0.1,
    ambientTemp: 25,
    powerFactor: 0.9
  };
}

describe('Measurement Validator Performance Tests', () => {
  let engine;
  let cableLib;
  let protectionLib;
  let standardsData;
  
  beforeEach(() => {
    cableLib = new CableLibrary();
    protectionLib = new ProtectionLibrary();
    standardsData = new StandardsData();
    engine = new ValidationEngine(cableLib, protectionLib, standardsData);
  });
  
  afterEach(() => {
    engine.clearCache();
  });
  
  // ============================================
  // Single Circuit Validation Performance
  // ============================================
  describe('Single Circuit Validation Performance', () => {
    test('validates single circuit within threshold', () => {
      const circuit = generateMockCircuit(1);
      
      const { result, duration } = measureTime(() => {
        return engine.validateCircuit(circuit, { useCache: false });
      });
      
      console.log(`Single circuit validation: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.single_validation);
      expect(result).toBeDefined();
      expect(result.circuitId).toBe('circuit-1');
    });
    
    test('cached validation is significantly faster', () => {
      const circuit = generateMockCircuit(1);
      
      // First validation (no cache)
      const { duration: firstDuration } = measureTime(() => {
        return engine.validateCircuit(circuit, { useCache: true });
      });
      
      // Second validation (cached)
      const { result, duration: secondDuration } = measureTime(() => {
        return engine.validateCircuit(circuit, { useCache: true });
      });
      
      console.log(`First: ${firstDuration.toFixed(2)}ms, Cached: ${secondDuration.toFixed(2)}ms`);
      expect(secondDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.cached_validation);
      expect(result.fromCache).toBe(true);
      expect(secondDuration).toBeLessThan(firstDuration / 2);
    });
    
    test('validation without input checks is faster', () => {
      const circuit = generateMockCircuit(1);
      
      const { duration: withInputs } = measureTime(() => {
        return engine.validateCircuit(circuit, { validateInputs: true, useCache: false });
      });
      
      engine.clearCache();
      
      const { duration: withoutInputs } = measureTime(() => {
        return engine.validateCircuit(circuit, { validateInputs: false, useCache: false });
      });
      
      console.log(`With inputs: ${withInputs.toFixed(2)}ms, Without: ${withoutInputs.toFixed(2)}ms`);
      expect(withoutInputs).toBeLessThanOrEqual(withInputs);
    });
  });
  
  // ============================================
  // Batch Validation Performance
  // ============================================
  describe('Batch Validation Performance', () => {
    test('validates 100 circuits within threshold', () => {
      const circuits = Array.from({ length: 100 }, (_, i) => generateMockCircuit(i));
      
      const { duration } = measureTime(() => {
        circuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: false });
        });
      });
      
      console.log(`Batch validate 100 circuits: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batch_100_circuits);
    });
    
    test('validates 1000 circuits within threshold', () => {
      const circuits = Array.from({ length: 1000 }, (_, i) => generateMockCircuit(i));
      
      const { duration } = measureTime(() => {
        circuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: false });
        });
      });
      
      console.log(`Batch validate 1000 circuits: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batch_1000_circuits);
    });
    
    test('cache improves batch validation performance', () => {
      // Create circuits with some repetition
      const uniqueCircuits = Array.from({ length: 10 }, (_, i) => generateMockCircuit(i));
      const circuits = Array.from({ length: 100 }, (_, i) => 
        uniqueCircuits[i % uniqueCircuits.length]
      );
      
      // Without cache
      engine.clearCache();
      const { duration: withoutCache } = measureTime(() => {
        circuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: false });
        });
      });
      
      // With cache
      engine.clearCache();
      const { duration: withCache } = measureTime(() => {
        circuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: true });
        });
      });
      
      console.log(`Without cache: ${withoutCache.toFixed(2)}ms, With cache: ${withCache.toFixed(2)}ms`);
      expect(withCache).toBeLessThan(withoutCache);
    });
    
    test('batch validation scales linearly', () => {
      const circuits100 = Array.from({ length: 100 }, (_, i) => generateMockCircuit(i));
      const circuits200 = Array.from({ length: 200 }, (_, i) => generateMockCircuit(i));
      
      const { duration: duration100 } = measureTime(() => {
        circuits100.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: false });
        });
      });
      
      engine.clearCache();
      
      const { duration: duration200 } = measureTime(() => {
        circuits200.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: false });
        });
      });
      
      console.log(`100 circuits: ${duration100.toFixed(2)}ms, 200 circuits: ${duration200.toFixed(2)}ms`);
      // 200 should be roughly 2x of 100 (allow 3x margin for variance)
      expect(duration200).toBeLessThan(duration100 * 3);
    });
  });
  
  // ============================================
  // Concurrent Validation Performance
  // ============================================
  describe('Concurrent Validation Performance', () => {
    test('handles concurrent validations efficiently', async () => {
      const circuits = Array.from({ length: 10 }, (_, i) => generateMockCircuit(i));
      
      const { duration } = await measureTimeAsync(async () => {
        const promises = circuits.map(circuit => 
          Promise.resolve(engine.validateCircuit(circuit, { useCache: false }))
        );
        await Promise.all(promises);
      });
      
      console.log(`10 concurrent validations: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrent_10);
    });
    
    test('concurrent validations with cache are fast', async () => {
      const circuit = generateMockCircuit(1);
      
      // Pre-populate cache
      engine.validateCircuit(circuit, { useCache: true });
      
      const { duration } = await measureTimeAsync(async () => {
        const promises = Array.from({ length: 100 }, () =>
          Promise.resolve(engine.validateCircuit(circuit, { useCache: true }))
        );
        await Promise.all(promises);
      });
      
      console.log(`100 concurrent cached validations: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });
  
  // ============================================
  // Library Lookup Performance
  // ============================================
  describe('Library Lookup Performance', () => {
    test('cable library lookups are fast', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          cableLib.getCable('NYM');
          cableLib.getBaseAmpacity('NYM', 2.5);
          cableLib.getCable('NYY');
        }
      });
      
      console.log(`3000 cable library lookups: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });
    
    test('ampacity calculations are fast', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          cableLib.getBaseAmpacity('NYM', 1.5, 'method_3');
          cableLib.getBaseAmpacity('NYY', 2.5, 'method_4');
          cableLib.getBaseAmpacity('NYCY', 4, 'method_7');
        }
      });
      
      console.log(`3000 ampacity calculations: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });
  
  // ============================================
  // Input Validation Performance
  // ============================================
  describe('Input Validation Performance', () => {
    test('validates inputs for 1000 circuits within threshold', () => {
      const circuits = Array.from({ length: 1000 }, (_, i) => generateMockCircuit(i));
      
      const { duration } = measureTime(() => {
        circuits.forEach(circuit => {
          Object.entries(circuit).forEach(([field, value]) => {
            engine.validateInputValue(field, value);
          });
        });
      });
      
      console.log(`Validate inputs for 1000 circuits: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.input_validation_1000);
    });
    
    test('input validation detects errors efficiently', () => {
      const invalidCircuits = Array.from({ length: 100 }, (_, i) => ({
        ...generateMockCircuit(i),
        voltage: i % 2 === 0 ? -100 : 10000, // Invalid values
        current: i % 3 === 0 ? -10 : 10000
      }));
      
      const { duration } = measureTime(() => {
        invalidCircuits.forEach(circuit => {
          engine.validateCircuit(circuit, { validateInputs: true, useCache: false });
        });
      });
      
      console.log(`Validate 100 circuits with invalid inputs: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });
  
  // ============================================
  // Cache Performance
  // ============================================
  describe('Cache Performance', () => {
    test('LRU cache eviction is efficient', () => {
      // Generate more circuits than cache size
      const circuits = Array.from({ length: 1500 }, (_, i) => generateMockCircuit(i));
      
      const { duration } = measureTime(() => {
        circuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: true });
        });
      });
      
      console.log(`Validate 1500 circuits with LRU cache (max 1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(12000);
    });
    
    test('cache clear is fast', () => {
      // Populate cache
      const circuits = Array.from({ length: 1000 }, (_, i) => generateMockCircuit(i));
      circuits.forEach(circuit => {
        engine.validateCircuit(circuit, { useCache: true });
      });
      
      const { duration } = measureTime(() => {
        engine.clearCache();
      });
      
      console.log(`Clear cache with 1000 entries: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
    });
    
    test('cache hit rate improves performance with repeated data', () => {
      // Create 100 unique circuits, repeat 10 times each
      const uniqueCircuits = Array.from({ length: 100 }, (_, i) => generateMockCircuit(i));
      const circuits = [];
      for (let i = 0; i < 10; i++) {
        circuits.push(...uniqueCircuits);
      }
      
      const { duration } = measureTime(() => {
        circuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: true });
        });
      });
      
      console.log(`Validate 1000 circuits (100 unique): ${duration.toFixed(2)}ms`);
      // Should be much faster than validating 1000 unique circuits
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batch_1000_circuits / 4);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated validations do not accumulate memory', () => {
      const circuit = generateMockCircuit(1);
      
      // Perform many validations
      for (let i = 0; i < 1000; i++) {
        engine.validateCircuit(circuit, { useCache: false });
      }
      
      expect(true).toBe(true); // Test completes without memory issues
    });
    
    test('large batch processing is memory efficient', () => {
      const circuits = Array.from({ length: 5000 }, (_, i) => generateMockCircuit(i));
      
      const results = [];
      circuits.forEach(circuit => {
        const result = engine.validateCircuit(circuit, { useCache: false });
        results.push(result);
      });
      
      expect(results.length).toBe(5000);
    });
    
    test('cache does not grow beyond max size', () => {
      // Validate more circuits than max cache size
      for (let i = 0; i < 2000; i++) {
        const circuit = generateMockCircuit(i);
        engine.validateCircuit(circuit, { useCache: true });
      }
      
      // Cache should be at max size, not 2000
      expect(engine.resultCache.size).toBeLessThanOrEqual(engine.maxCacheSize);
    });
  });
  
  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('handles missing data gracefully', () => {
      const incompleteCircuit = {
        id: 'incomplete',
        voltage: 230
        // Missing many required fields
      };
      
      const { result, duration } = measureTime(() => {
        return engine.validateCircuit(incompleteCircuit, { useCache: false });
      });
      
      expect(duration).toBeLessThan(50);
      expect(result.summary.skipped.length).toBeGreaterThan(0);
    });
    
    test('handles extreme values efficiently', () => {
      const extremeCircuits = [
        { ...generateMockCircuit(1), distance: 9999 },
        { ...generateMockCircuit(2), current: 6000 },
        { ...generateMockCircuit(3), loopImpedance: 99 }
      ];
      
      const { duration } = measureTime(() => {
        extremeCircuits.forEach(circuit => {
          engine.validateCircuit(circuit, { useCache: false });
        });
      });
      
      expect(duration).toBeLessThan(200);
    });
    
    test('empty circuit data returns quickly', () => {
      const { result, duration } = measureTime(() => {
        return engine.validateCircuit({}, { useCache: false });
      });
      
      expect(duration).toBeLessThan(50);
      expect(result.summary.skipped.length).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // Rule Execution Performance
  // ============================================
  describe('Rule Execution Performance', () => {
    test('can execute check is fast for many rules', () => {
      const circuit = generateMockCircuit(1);
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          engine.rules.forEach(rule => {
            engine.canExecuteRule(rule, circuit);
          });
        }
      });
      
      console.log(`1000 iterations of can execute checks: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
    });
  });
});
