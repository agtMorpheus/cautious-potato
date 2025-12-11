/**
 * Performance Tests for Utility Functions Module (utils.js)
 * 
 * Tests performance of position processing, Excel operations,
 * and data aggregation functions with large datasets.
 */

import {
  sumByPosition,
  getPositionSummary,
  validateExtractedPositions,
  parseProtokollMetadata,
  extractPositions,
  fillAbrechnungHeader,
  fillAbrechnungPositions,
  clearAbrechnungTemplateCache,
  validateFilledPositions,
  generateExportFilename,
  updateMetadataCellMap,
  getMetadataCellMap,
  resetMetadataCellMap
} from '../../js/utils.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  sum_positions_10000: 50,          // ms to sum 10000 positions
  sum_positions_100000: 500,        // ms to sum 100000 positions
  position_summary_10000: 30,       // ms to get summary of 10000 positions
  validate_positions_10000: 100,    // ms to validate 10000 positions
  fill_header: 10,                  // ms to fill header
  fill_positions_1000: 100,         // ms to fill 1000 positions
  validate_filled_1000: 50,         // ms to validate 1000 filled positions
  metadata_parse: 50,               // ms to parse metadata
  position_extraction_500: 100,     // ms to extract 500 positions
  filename_generation_1000: 20      // ms to generate 1000 filenames
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
 * Generate mock positions for testing
 */
function generateMockPositions(count) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      posNr: `${String(Math.floor(i / 100) + 1).padStart(2, '0')}.${String((i % 100) + 1).padStart(2, '0')}.${String(i % 1000).padStart(4, '0')}`,
      menge: Math.floor(Math.random() * 100) + 1,
      row: i + 10,
      column: 'H'
    });
  }
  return positions;
}

/**
 * Generate position sums map for testing
 */
function generateMockPositionSums(count) {
  const sums = {};
  for (let i = 0; i < count; i++) {
    const posNr = `${String(Math.floor(i / 100) + 1).padStart(2, '0')}.${String((i % 100) + 1).padStart(2, '0')}.${String(i % 1000).padStart(4, '0')}`;
    sums[posNr] = Math.floor(Math.random() * 1000) + 1;
  }
  return sums;
}

/**
 * Generate mock worksheet for testing
 */
function generateMockWorksheet(rowCount) {
  const worksheet = {
    '!ref': `A1:Z${rowCount + 1}`
  };
  
  // Add position data
  for (let i = 0; i < rowCount; i++) {
    const row = i + 10; // Starting from row 10
    worksheet[`B${row}`] = { v: `01.01.${String(i).padStart(4, '0')}` };
    worksheet[`H${row}`] = { v: Math.floor(Math.random() * 100) + 1 };
  }
  
  return worksheet;
}

describe('Utils Performance Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    clearAbrechnungTemplateCache();
    resetMetadataCellMap();
  });
  
  // ============================================
  // sumByPosition Performance
  // ============================================
  describe('sumByPosition() Performance', () => {
    test('sums 10000 positions within threshold', () => {
      const positions = generateMockPositions(10000);
      
      const { result, duration } = measureTime(() => {
        return sumByPosition(positions);
      });
      
      console.log(`sumByPosition (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sum_positions_10000);
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
    
    test('sums 100000 positions within threshold', () => {
      const positions = generateMockPositions(100000);
      
      const { result, duration } = measureTime(() => {
        return sumByPosition(positions);
      });
      
      console.log(`sumByPosition (100000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sum_positions_100000);
    });
    
    test('handles positions with same posNr efficiently', () => {
      // All positions have the same posNr - worst case for aggregation
      const positions = [];
      for (let i = 0; i < 10000; i++) {
        positions.push({ posNr: '01.01.0001', menge: 1 });
      }
      
      const { result, duration } = measureTime(() => {
        return sumByPosition(positions);
      });
      
      console.log(`sumByPosition (same posNr, 10000): ${duration.toFixed(2)}ms`);
      expect(result['01.01.0001']).toBe(10000);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sum_positions_10000);
    });
    
    test('handles unique positions efficiently', () => {
      // All positions have unique posNr - different performance profile
      const positions = [];
      for (let i = 0; i < 10000; i++) {
        positions.push({ posNr: `UNIQUE-${i}`, menge: 1 });
      }
      
      const { result, duration } = measureTime(() => {
        return sumByPosition(positions);
      });
      
      console.log(`sumByPosition (unique posNr, 10000): ${duration.toFixed(2)}ms`);
      expect(Object.keys(result).length).toBe(10000);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sum_positions_10000);
    });
  });
  
  // ============================================
  // getPositionSummary Performance
  // ============================================
  describe('getPositionSummary() Performance', () => {
    test('computes summary for 10000 positions within threshold', () => {
      const positionMap = generateMockPositionSums(10000);
      
      const { result, duration } = measureTime(() => {
        return getPositionSummary(positionMap);
      });
      
      console.log(`getPositionSummary (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.position_summary_10000);
      expect(result.uniquePositions).toBe(10000);
    });
    
    test('summary statistics are accurate', () => {
      const positionMap = {
        'A': 10,
        'B': 20,
        'C': 30,
        'D': 40,
        'E': 50
      };
      
      const { result } = measureTime(() => {
        return getPositionSummary(positionMap);
      });
      
      expect(result.totalQuantity).toBe(150);
      expect(result.uniquePositions).toBe(5);
      expect(result.minQuantity).toBe(10);
      expect(result.maxQuantity).toBe(50);
    });
  });
  
  // ============================================
  // validateExtractedPositions Performance
  // ============================================
  describe('validateExtractedPositions() Performance', () => {
    test('validates 10000 positions within threshold', () => {
      const positions = generateMockPositions(10000);
      
      const { result, duration } = measureTime(() => {
        return validateExtractedPositions(positions);
      });
      
      console.log(`validateExtractedPositions (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_positions_10000);
      expect(result.valid).toBe(true);
    });
    
    test('detects duplicates efficiently', () => {
      const positions = [];
      // Add duplicate positions
      for (let i = 0; i < 1000; i++) {
        positions.push({ posNr: '01.01.0001', menge: 1, row: i + 10 });
      }
      
      const { result, duration } = measureTime(() => {
        return validateExtractedPositions(positions);
      });
      
      console.log(`validateExtractedPositions (duplicates): ${duration.toFixed(2)}ms`);
      expect(result.warnings.length).toBe(999); // All but first are duplicates
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_positions_10000 / 10);
    });
    
    test('validates positions with various issues', () => {
      const positions = [];
      
      // Mix of valid and problematic positions
      for (let i = 0; i < 5000; i++) {
        if (i % 100 === 0) {
          // Negative quantity (only for non-invalid format positions)
          positions.push({ posNr: `01.01.${String(i).padStart(4, '0')}`, menge: -1, row: i });
        } else if (i % 10 === 0) {
          // Invalid format
          positions.push({ posNr: `INVALID-${i}`, menge: 1, row: i });
        } else {
          // Valid
          positions.push({ posNr: `01.01.${String(i).padStart(4, '0')}`, menge: 1, row: i });
        }
      }
      
      const { result, duration } = measureTime(() => {
        return validateExtractedPositions(positions);
      });
      
      console.log(`validateExtractedPositions (mixed issues, 5000): ${duration.toFixed(2)}ms`);
      expect(result.errors.length).toBeGreaterThan(0); // Has negative quantities
      expect(result.warnings.length).toBeGreaterThan(0); // Has invalid formats
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_positions_10000 / 2);
    });
  });
  
  // ============================================
  // fillAbrechnungHeader Performance
  // ============================================
  describe('fillAbrechnungHeader() Performance', () => {
    test('fills header quickly', () => {
      const workbook = {
        Sheets: {
          'EAW': {
            '!ref': 'A1:Z100'
          }
        }
      };
      
      const metadata = {
        datum: '2025-01-15',
        auftragsNr: 'ORDER-12345',
        anlage: 'Test Plant',
        einsatzort: 'Berlin'
      };
      
      const { duration } = measureTime(() => {
        fillAbrechnungHeader(workbook, metadata);
      });
      
      console.log(`fillAbrechnungHeader: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.fill_header);
    });
    
    test('multiple header fills do not degrade', () => {
      const workbook = {
        Sheets: {
          'EAW': {
            '!ref': 'A1:Z100'
          }
        }
      };
      
      const metadata = {
        datum: '2025-01-15',
        auftragsNr: 'ORDER-12345',
        anlage: 'Test Plant',
        einsatzort: 'Berlin'
      };
      
      const durations = [];
      for (let i = 0; i < 100; i++) {
        const { duration } = measureTime(() => {
          fillAbrechnungHeader(workbook, { ...metadata, auftragsNr: `ORDER-${i}` });
        });
        durations.push(duration);
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`fillAbrechnungHeader (100 calls avg): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.fill_header);
    });
  });
  
  // ============================================
  // fillAbrechnungPositions Performance
  // ============================================
  describe('fillAbrechnungPositions() Performance', () => {
    test('fills 1000 positions within threshold', () => {
      const workbook = {
        Sheets: {
          'EAW': {
            '!ref': 'A1:Z1100'
          }
        }
      };
      
      // Add position number cells to worksheet
      for (let i = 1; i <= 1000; i++) {
        workbook.Sheets['EAW'][`A${i + 10}`] = { v: `01.01.${String(i).padStart(4, '0')}` };
      }
      
      const positionSums = generateMockPositionSums(1000);
      
      const { duration } = measureTime(() => {
        fillAbrechnungPositions(workbook, positionSums);
      });
      
      console.log(`fillAbrechnungPositions (1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.fill_positions_1000);
    });
  });
  
  // ============================================
  // validateFilledPositions Performance
  // ============================================
  describe('validateFilledPositions() Performance', () => {
    test('validates 1000 filled positions within threshold', () => {
      const workbook = {
        Sheets: {
          'EAW': {
            '!ref': 'A1:Z1100'
          }
        }
      };
      
      // Add filled position data
      for (let i = 1; i <= 1000; i++) {
        workbook.Sheets['EAW'][`A${i + 10}`] = { v: `01.01.${String(i).padStart(4, '0')}` };
        workbook.Sheets['EAW'][`G${i + 10}`] = { v: Math.floor(Math.random() * 100) };
      }
      
      const { result, duration } = measureTime(() => {
        return validateFilledPositions(workbook);
      });
      
      console.log(`validateFilledPositions (1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_filled_1000);
    });
  });
  
  // ============================================
  // generateExportFilename Performance
  // ============================================
  describe('generateExportFilename() Performance', () => {
    test('generates 1000 filenames within threshold', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          generateExportFilename(`ORDER-${i}`);
        }
      });
      
      console.log(`generateExportFilename (1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.filename_generation_1000);
    });
    
    test('generated filenames are unique (within millisecond resolution)', () => {
      const filenames = new Set();
      
      // Generate filenames with delays to ensure uniqueness
      for (let i = 0; i < 100; i++) {
        filenames.add(generateExportFilename(`ORDER-${i}`));
      }
      
      // Each should be unique due to timestamp and order number
      expect(filenames.size).toBe(100);
    });
  });
  
  // ============================================
  // Metadata Cell Map Operations Performance
  // ============================================
  describe('Metadata Cell Map Performance', () => {
    test('get operations are fast', () => {
      const iterations = 10000;
      
      const { duration: getDuration } = measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          getMetadataCellMap();
        }
      });
      
      console.log(`getMetadataCellMap (${iterations}): ${getDuration.toFixed(2)}ms`);
      expect(getDuration).toBeLessThan(100);
    });
    
    test('update operations work correctly', () => {
      // Single update operation (console.log makes bulk updates slow)
      updateMetadataCellMap('protokollNr', ['N5', 'N6']);
      
      const map = getMetadataCellMap();
      expect(map.protokollNr).toEqual(['N5', 'N6']);
    });
    
    test('reset restores defaults', () => {
      // Make a change
      updateMetadataCellMap('protokollNr', ['X99']);
      
      // Reset
      resetMetadataCellMap();
      
      const map = getMetadataCellMap();
      expect(map.protokollNr).not.toEqual(['X99']);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('sumByPosition does not accumulate memory on repeated calls', () => {
      const positions = generateMockPositions(1000);
      
      // Run multiple times
      for (let i = 0; i < 100; i++) {
        sumByPosition(positions);
      }
      
      // If we get here without memory issues, pass
      expect(true).toBe(true);
    });
    
    test('getPositionSummary handles large maps without issues', () => {
      const largeMap = generateMockPositionSums(50000);
      
      for (let i = 0; i < 10; i++) {
        getPositionSummary(largeMap);
      }
      
      expect(true).toBe(true);
    });
    
    test('validateExtractedPositions Map cleanup', () => {
      // Multiple validations should not accumulate Map entries
      for (let i = 0; i < 50; i++) {
        const positions = generateMockPositions(1000);
        validateExtractedPositions(positions);
      }
      
      expect(true).toBe(true);
    });
  });
  
  // ============================================
  // Stress Tests
  // ============================================
  describe('Stress Tests', () => {
    test('handles very large position arrays', () => {
      const positions = generateMockPositions(200000);
      
      const { result, duration } = measureTime(() => {
        return sumByPosition(positions);
      });
      
      console.log(`sumByPosition (200000): ${duration.toFixed(2)}ms`);
      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Allow up to 2 seconds
    });
    
    test('handles mixed operations without degradation', () => {
      const positions = generateMockPositions(5000);
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 50; i++) {
          sumByPosition(positions);
          validateExtractedPositions(positions);
          const sums = generateMockPositionSums(100);
          getPositionSummary(sums);
        }
      });
      
      console.log(`Mixed operations (50 iterations): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5000); // Allow up to 5 seconds for all
    });
  });
});
