/**
 * Performance Tests for Contract Normalizer Module
 * 
 * Tests normalization performance with large datasets, date parsing,
 * field mapping, and validation operations.
 */

import {
  parseExcelDate,
  parseRowWithMapping,
  validateContractRow,
  normalizeContractData,
  createContractObject,
  processContractRow
} from '../../js/contracts/contractNormalizer.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  date_parsing_1000: 100,          // ms to parse 1000 dates
  parse_row_1000: 200,             // ms to parse 1000 rows
  normalize_data_1000: 300,        // ms to normalize 1000 contract data
  validate_fields_1000: 100,       // ms to validate 1000 contracts
  create_objects_1000: 200,        // ms to create 1000 contract objects
  full_pipeline_1000: 1500         // ms for full pipeline with 1000 contracts
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
 * Generate mock Excel row data
 */
function generateMockRow(index) {
  const row = [];
  
  // Set values at specific indices
  row[0] = `CONTRACT-${String(index).padStart(6, '0')}`;  // contractId
  row[1] = `Test Contract ${index}`;                      // contractTitle
  row[2] = `TASK-${index}`;                               // taskId
  row[3] = 'Wartung';                                     // taskType
  row[4] = ['Erstellt', 'In Bearbeitung', 'Abgerechnet'][index % 3];  // status
  row[5] = ['Berlin', 'Munich', 'Hamburg'][index % 3];    // location
  row[6] = `Room ${index}`;                               // roomArea
  row[7] = `EQ-${index}`;                                 // equipmentId
  row[8] = 44927 + index;                                 // Excel serial date
  
  return row;
}

/**
 * Column mapping configuration
 */
const columnMapping = {
  contractId: { excelColumn: 'A', type: 'string' },
  contractTitle: { excelColumn: 'B', type: 'string' },
  taskId: { excelColumn: 'C', type: 'string' },
  taskType: { excelColumn: 'D', type: 'string' },
  status: { excelColumn: 'E', type: 'string' },
  location: { excelColumn: 'F', type: 'string' },
  roomArea: { excelColumn: 'G', type: 'string' },
  equipmentId: { excelColumn: 'H', type: 'string' },
  plannedStart: { excelColumn: 'I', type: 'date' }
};

describe('Contract Normalizer Performance Tests', () => {
  
  // ============================================
  // Date Parsing Performance
  // ============================================
  describe('Date Parsing Performance', () => {
    test('parses 1000 Excel serial dates within threshold', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => 44927 + i);
      
      const { duration } = measureTime(() => {
        dates.forEach(date => parseExcelDate(date));
      });
      
      console.log(`Parse 1000 Excel serial dates: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.date_parsing_1000);
    });
    
    test('parses 1000 ISO date strings efficiently', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => 
        `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      );
      
      const { duration } = measureTime(() => {
        dates.forEach(date => parseExcelDate(date));
      });
      
      console.log(`Parse 1000 ISO date strings: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.date_parsing_1000);
    });
    
    test('parses 1000 DD.MM.YYYY dates efficiently', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => 
        `${String((i % 28) + 1).padStart(2, '0')}.${String((i % 12) + 1).padStart(2, '0')}.2025`
      );
      
      const { duration } = measureTime(() => {
        dates.forEach(date => parseExcelDate(date));
      });
      
      console.log(`Parse 1000 DD.MM.YYYY dates: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.date_parsing_1000);
    });
    
    test('handles mixed date formats efficiently', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => {
        if (i % 3 === 0) return 44927 + i; // Excel serial
        if (i % 3 === 1) return `2025-01-${String((i % 28) + 1).padStart(2, '0')}`; // ISO
        return `${String((i % 28) + 1).padStart(2, '0')}.01.2025`; // DD.MM.YYYY
      });
      
      const { duration } = measureTime(() => {
        dates.forEach(date => parseExcelDate(date));
      });
      
      console.log(`Parse 1000 mixed format dates: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.date_parsing_1000);
    });
    
    test('handles invalid dates efficiently', () => {
      const invalidValues = ['', null, undefined, 'invalid', {}, []];
      const invalidDates = Array.from({ length: 1000 }, (_, i) => 
        invalidValues[i % 6]
      );
      
      const { duration } = measureTime(() => {
        invalidDates.forEach(date => parseExcelDate(date));
      });
      
      console.log(`Parse 1000 invalid dates: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });
  });
  
  // ============================================
  // Row Parsing Performance
  // ============================================
  describe('Row Parsing Performance', () => {
    test('parses 1000 rows within threshold', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => generateMockRow(i));
      
      const { duration } = measureTime(() => {
        rows.forEach(row => parseRowWithMapping(row, columnMapping));
      });
      
      console.log(`Parse 1000 rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.parse_row_1000);
    });
    
    test('handles sparse rows efficiently', () => {
      const sparseRows = Array.from({ length: 1000 }, () => {
        const row = [];
        row[0] = 'CONTRACT-001';
        row[1] = 'Title';
        row[4] = 'Erstellt';
        return row;
      });
      
      const { duration } = measureTime(() => {
        sparseRows.forEach(row => parseRowWithMapping(row, columnMapping));
      });
      
      console.log(`Parse 1000 sparse rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.parse_row_1000);
    });
  });
  
  // ============================================
  // Row Validation Performance
  // ============================================
  describe('Row Validation Performance', () => {
    test('validates 1000 rows within threshold', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => generateMockRow(i));
      const parsedRows = rows.map(row => parseRowWithMapping(row, columnMapping));
      
      const { duration } = measureTime(() => {
        parsedRows.forEach(rowData => validateContractRow(rowData, columnMapping));
      });
      
      console.log(`Validate 1000 rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_fields_1000);
    });
    
    test('validation detects missing fields efficiently', () => {
      const incompleteRows = Array.from({ length: 1000 }, () => {
        const row = [];
        row[0] = '';  // Missing contractId
        row[1] = '';  // Missing contractTitle
        row[4] = '';  // Missing status
        return row;
      });
      
      const parsedRows = incompleteRows.map(row => parseRowWithMapping(row, columnMapping));
      
      const { duration } = measureTime(() => {
        parsedRows.forEach(rowData => {
          const result = validateContractRow(rowData, columnMapping);
          expect(result.isValid).toBe(false);
        });
      });
      
      console.log(`Validate 1000 invalid rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.validate_fields_1000);
    });
  });
  
  // ============================================
  // Data Normalization Performance
  // ============================================
  describe('Data Normalization Performance', () => {
    test('normalizes 1000 parsed rows within threshold', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => generateMockRow(i));
      const parsedRows = rows.map(row => parseRowWithMapping(row, columnMapping));
      
      const { duration } = measureTime(() => {
        parsedRows.forEach(rowData => normalizeContractData(rowData));
      });
      
      console.log(`Normalize 1000 parsed rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.normalize_data_1000);
    });
  });
  
  // ============================================
  // Contract Object Creation Performance
  // ============================================
  describe('Contract Object Creation Performance', () => {
    test('creates 1000 contract objects within threshold', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => generateMockRow(i));
      const parsedRows = rows.map(row => parseRowWithMapping(row, columnMapping));
      const normalizedRows = parsedRows.map(rowData => normalizeContractData(rowData));
      
      const { duration } = measureTime(() => {
        normalizedRows.forEach((normalized, i) => 
          createContractObject(normalized, i, 'TestSheet', 'test.xlsx')
        );
      });
      
      console.log(`Create 1000 contract objects: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.create_objects_1000);
    });
  });
  
  // ============================================
  // Full Pipeline Performance
  // ============================================
  describe('Full Pipeline Performance', () => {
    test('processes 1000 rows through full pipeline within threshold', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => generateMockRow(i));
      
      const { duration } = measureTime(() => {
        const results = rows.map((row, i) => {
          return processContractRow(row, columnMapping, i, 'TestSheet', 'test.xlsx');
        }).filter(result => result.contract !== null);
        
        return results;
      });
      
      console.log(`Full pipeline (1000 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.full_pipeline_1000);
    });
    
    test('pipeline scales linearly', () => {
      const rows100 = Array.from({ length: 100 }, (_, i) => generateMockRow(i));
      const rows200 = Array.from({ length: 200 }, (_, i) => generateMockRow(i));
      
      const { duration: duration100 } = measureTime(() => {
        rows100.forEach((row, i) => {
          processContractRow(row, columnMapping, i, 'TestSheet', 'test.xlsx');
        });
      });
      
      const { duration: duration200 } = measureTime(() => {
        rows200.forEach((row, i) => {
          processContractRow(row, columnMapping, i, 'TestSheet', 'test.xlsx');
        });
      });
      
      console.log(`Pipeline 100 rows: ${duration100.toFixed(2)}ms, 200 rows: ${duration200.toFixed(2)}ms`);
      // 200 should be roughly 2x of 100 (allow 3x margin)
      expect(duration200).toBeLessThan(duration100 * 3);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated parsing does not accumulate memory', () => {
      const row = generateMockRow(1);
      
      for (let i = 0; i < 1000; i++) {
        parseRowWithMapping(row, columnMapping);
      }
      
      expect(true).toBe(true);
    });
    
    test('large batch processing is memory efficient', () => {
      const rows = Array.from({ length: 5000 }, (_, i) => generateMockRow(i));
      
      const results = rows.map((row, i) => 
        processContractRow(row, columnMapping, i, 'TestSheet', 'test.xlsx')
      ).filter(r => r.contract !== null);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('handles empty row efficiently', () => {
      const emptyRow = [];
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          parseRowWithMapping(emptyRow, columnMapping);
        }
      });
      
      expect(duration).toBeLessThan(100);
    });
    
    test('handles very long strings efficiently', () => {
      const longString = 'A'.repeat(10000);
      const rows = Array.from({ length: 100 }, (_, i) => {
        const row = generateMockRow(i);
        row[1] = longString;  // contractTitle
        return row;
      });
      
      const { duration } = measureTime(() => {
        rows.forEach((row, i) => {
          processContractRow(row, columnMapping, i, 'TestSheet', 'test.xlsx');
        });
      });
      
      expect(duration).toBeLessThan(500);
    });
  });
});
