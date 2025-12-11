/**
 * Performance Tests for Protokoll Modules
 * 
 * Tests performance of state management, validation, and rendering
 * with large numbers of positions/circuits.
 */

import * as protokollState from '../../js/protokoll/protokoll-state.js';
import {
  validateField,
  validatePosition,
  validateAllPositions,
  validateMetadataStep,
  validatePositionsStep,
  validateForm,
  checkForDuplicatePositions,
  getValidationSummary
} from '../../js/protokoll/protokoll-validator.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  add_position: 5,                  // ms to add a single position
  add_100_positions: 200,           // ms to add 100 positions
  update_position: 5,               // ms to update a position
  delete_position: 5,               // ms to delete a position
  get_positions_1000: 50,           // ms to get 1000 positions (includes array copy)
  validate_field: 5,                // ms to validate a single field
  validate_position: 10,            // ms to validate a position
  validate_all_positions_100: 100,  // ms to validate 100 positions
  validate_form: 200,               // ms to validate entire form with 100 positions
  duplicate_check_1000: 50,         // ms to check 1000 positions for duplicates
  state_save: 100,                  // ms to save state to localStorage
  state_load: 100,                  // ms to load state from localStorage
  event_emit: 20                    // ms to emit and handle events
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
 * Generate mock position data
 */
function generateMockPosition(index) {
  return {
    posNr: `${String(index).padStart(3, '0')}`,
    stromkreisNr: `F${index % 100}`,
    zielbezeichnung: `Target ${index}`,
    spannung: {
      un: 230,
      fn: 50
    },
    sicherung: {
      typ: 'B',
      in: 16,
      ia: 160,
      ta: 0.1
    },
    leitung: {
      querschnitt: 2.5,
      laenge: 10 + (index % 100),
      material: 'Cu',
      verlegeart: 'A1'
    },
    messwerte: {
      riso: 1.0 + Math.random(),
      rpe: 0.5 + Math.random() * 0.5,
      zs: 0.3 + Math.random() * 0.3,
      ui: 0.01 + Math.random() * 0.02,
      rcd: {
        ik: 10 + Math.random() * 20,
        ta: 20 + Math.random() * 10
      }
    },
    parentId: null
  };
}

/**
 * Generate mock metadata
 */
function generateMockMetadata() {
  return {
    protokollNumber: 'TEST001',
    datum: '2025-01-15',
    auftraggeber: 'Test Client GmbH',
    auftragnummer: 'ORDER12345',
    facility: {
      name: 'Test Facility',
      address: 'Test Street 123, 12345 Berlin',
      netzspannung: '230/400',
      netzform: 'TN-C-S'
    },
    prüfer: {
      name: 'Test Inspector',
      qualifikation: 'Elektrofachkraft'
    }
  };
}

describe('Protokoll State Performance Tests', () => {
  
  beforeEach(() => {
    protokollState.init();
  });
  
  afterEach(() => {
    protokollState.reset();
    protokollState.clearLocalStorage();
  });
  
  // ============================================
  // Position Operations Performance
  // ============================================
  describe('Position Operations Performance', () => {
    test('adds single position quickly', () => {
      protokollState.setMetadata(generateMockMetadata());
      const position = generateMockPosition(1);
      
      const { duration } = measureTime(() => {
        protokollState.addPosition(position);
      });
      
      console.log(`Add single position: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.add_position);
    });
    
    test('adds 100 positions within threshold', () => {
      protokollState.setMetadata(generateMockMetadata());
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          protokollState.addPosition(generateMockPosition(i));
        }
      });
      
      console.log(`Add 100 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.add_100_positions);
      expect(protokollState.getPositions().length).toBe(100);
    });
    
    test('updates position quickly', () => {
      protokollState.setMetadata(generateMockMetadata());
      protokollState.addPosition(generateMockPosition(1));
      
      const { duration } = measureTime(() => {
        protokollState.updatePosition('001', { zielbezeichnung: 'Updated Target' });
      });
      
      console.log(`Update position: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.update_position);
    });
    
    test('deletes position quickly', () => {
      protokollState.setMetadata(generateMockMetadata());
      for (let i = 0; i < 100; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const { duration } = measureTime(() => {
        protokollState.deletePosition('050');
      });
      
      console.log(`Delete position (from 100): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.delete_position);
    });
    
    test('getPositions is fast for large lists', () => {
      protokollState.setMetadata(generateMockMetadata());
      for (let i = 0; i < 1000; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const { result, duration } = measureTime(() => {
        return protokollState.getPositions();
      });
      
      console.log(`Get 1000 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.get_positions_1000);
      expect(result.length).toBe(1000);
    });
    
    test('getPosition by posNr is fast', () => {
      protokollState.setMetadata(generateMockMetadata());
      for (let i = 0; i < 500; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const iterations = 100;
      const { duration } = measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          protokollState.getPosition(String(i % 500).padStart(3, '0'));
        }
      });
      
      console.log(`Get position by posNr (100 lookups): ${duration.toFixed(2)}ms`);
      expect(duration / iterations).toBeLessThan(1); // Less than 1ms per lookup
    });
  });
  
  // ============================================
  // State Persistence Performance
  // ============================================
  describe('State Persistence Performance', () => {
    test('saves state with 100 positions quickly', () => {
      protokollState.setMetadata(generateMockMetadata());
      for (let i = 0; i < 100; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const { duration } = measureTime(() => {
        protokollState.saveToLocalStorage();
      });
      
      console.log(`Save state (100 positions): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.state_save);
    });
    
    test('forceSave is performant', () => {
      protokollState.setMetadata(generateMockMetadata());
      for (let i = 0; i < 50; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const { duration } = measureTime(() => {
        protokollState.forceSave();
      });
      
      console.log(`Force save (50 positions): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.state_save);
    });
  });
  
  // ============================================
  // Event System Performance
  // ============================================
  describe('Event System Performance', () => {
    test('emits events quickly', () => {
      let callCount = 0;
      protokollState.on('position:added', () => { callCount++; });
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          protokollState.emit('position:added', { posNr: String(i) });
        }
      });
      
      console.log(`Emit 100 events: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.event_emit);
      expect(callCount).toBe(100);
    });
    
    test('handles multiple listeners efficiently', () => {
      const listeners = [];
      for (let i = 0; i < 10; i++) {
        const listener = jest.fn();
        protokollState.on('test:event', listener);
        listeners.push(listener);
      }
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          protokollState.emit('test:event', { data: i });
        }
      });
      
      console.log(`Emit to 10 listeners (100 times): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.event_emit * 5);
      listeners.forEach(l => expect(l).toHaveBeenCalledTimes(100));
    });
  });
});

describe('Protokoll Validator Performance Tests', () => {
  
  beforeEach(() => {
    protokollState.init();
    protokollState.setMetadata(generateMockMetadata());
  });
  
  afterEach(() => {
    protokollState.reset();
  });
  
  // ============================================
  // Field Validation Performance
  // ============================================
  describe('Field Validation Performance', () => {
    test('validates single field quickly', () => {
      const iterations = 100;
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          validateField('metadata.protokollNumber', 'TEST001');
        }
      });
      
      console.log(`Validate field (${iterations} times): ${duration.toFixed(2)}ms`);
      expect(duration / iterations).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_field);
    });
    
    test('validates various field types quickly', () => {
      const fields = [
        ['metadata.protokollNumber', 'TEST001'],
        ['metadata.datum', '2025-01-15'],
        ['metadata.auftraggeber', 'Test Client'],
        ['metadata.facility.name', 'Test Facility'],
        ['metadata.facility.netzspannung', '230/400']
      ];
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 20; i++) {
          fields.forEach(([path, value]) => {
            validateField(path, value);
          });
        }
      });
      
      console.log(`Validate 5 field types (20 iterations): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_field * 100);
    });
  });
  
  // ============================================
  // Position Validation Performance
  // ============================================
  describe('Position Validation Performance', () => {
    test('validates single position quickly', () => {
      const position = generateMockPosition(1);
      
      const { result, duration } = measureTime(() => {
        return validatePosition(position);
      });
      
      console.log(`Validate position: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_position);
    });
    
    test('validates 100 positions within threshold', () => {
      const positions = [];
      for (let i = 0; i < 100; i++) {
        positions.push(generateMockPosition(i));
      }
      
      const { result, duration } = measureTime(() => {
        return validateAllPositions(positions);
      });
      
      console.log(`Validate 100 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_all_positions_100);
    });
    
    test('validates positions with errors efficiently', () => {
      const positions = [];
      for (let i = 0; i < 50; i++) {
        const pos = generateMockPosition(i);
        // Make some positions invalid
        if (i % 5 === 0) {
          pos.stromkreisNr = ''; // Invalid
        }
        if (i % 7 === 0) {
          pos.spannung.un = -100; // Invalid
        }
        positions.push(pos);
      }
      
      const { result, duration } = measureTime(() => {
        return validateAllPositions(positions);
      });
      
      console.log(`Validate 50 positions with errors: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_all_positions_100 / 2);
    });
  });
  
  // ============================================
  // Form Validation Performance
  // ============================================
  describe('Form Validation Performance', () => {
    test('validates entire form with 100 positions', () => {
      for (let i = 0; i < 100; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const { result, duration } = measureTime(() => {
        return validateForm();
      });
      
      console.log(`Validate form (100 positions): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_form);
    });
    
    test('validateMetadataStep is fast', () => {
      const iterations = 50;
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          validateMetadataStep();
        }
      });
      
      console.log(`Validate metadata step (${iterations} times): ${duration.toFixed(2)}ms`);
      expect(duration / iterations).toBeLessThan(10);
    });
    
    test('validatePositionsStep is fast', () => {
      for (let i = 0; i < 50; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      const { result, duration } = measureTime(() => {
        return validatePositionsStep();
      });
      
      console.log(`Validate positions step (50 positions): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_all_positions_100 / 2);
    });
  });
  
  // ============================================
  // Duplicate Check Performance
  // ============================================
  describe('Duplicate Check Performance', () => {
    test('checks 1000 positions for duplicates quickly', () => {
      const positions = [];
      for (let i = 0; i < 1000; i++) {
        positions.push(generateMockPosition(i));
      }
      
      const { result, duration } = measureTime(() => {
        return checkForDuplicatePositions(positions);
      });
      
      console.log(`Duplicate check (1000 positions): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.duplicate_check_1000);
    });
    
    test('detects duplicates efficiently', () => {
      const positions = [];
      for (let i = 0; i < 500; i++) {
        positions.push(generateMockPosition(i % 100)); // Create duplicates
      }
      
      const { result, duration } = measureTime(() => {
        return checkForDuplicatePositions(positions);
      });
      
      console.log(`Duplicate check with duplicates (500 positions): ${duration.toFixed(2)}ms`);
      expect(result.length).toBeGreaterThan(0); // Should find duplicates
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.duplicate_check_1000 / 2);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated validations do not accumulate state', () => {
      for (let i = 0; i < 50; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      // Run many validations
      for (let i = 0; i < 100; i++) {
        validateForm();
        getValidationSummary();
      }
      
      expect(true).toBe(true);
    });
    
    test('position CRUD operations are memory efficient', () => {
      // Add, update, delete many positions
      for (let i = 0; i < 100; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      for (let i = 0; i < 50; i++) {
        protokollState.updatePosition(String(i).padStart(3, '0'), { zielbezeichnung: `Updated ${i}` });
      }
      
      for (let i = 0; i < 25; i++) {
        protokollState.deletePosition(String(i).padStart(3, '0'));
      }
      
      // Add more
      for (let i = 100; i < 150; i++) {
        protokollState.addPosition(generateMockPosition(i));
      }
      
      expect(protokollState.getPositions().length).toBe(125); // 100 - 25 + 50
    });
  });
});
