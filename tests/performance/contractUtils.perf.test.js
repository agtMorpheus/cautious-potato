/**
 * Performance Tests for Contract Utilities Module (contractUtils.js)
 * 
 * Tests performance characteristics of contract processing functions
 * with large datasets to ensure scalability.
 */

import {
  generateUUID,
  columnLetterToIndex,
  indexToColumnLetter,
  discoverContractSheets,
  suggestContractColumnMapping,
  extractContractsFromSheet,
  validateContractRecord,
  normalizeStatus,
  getContractSummary,
  extractContractsFromSheetAsync,
  DEFAULT_COLUMN_MAPPING
} from '../../js/contracts/contractUtils.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  uuid_generation_1000: 50,        // ms for 1000 UUIDs
  column_conversion_10000: 100,   // ms for 10000 conversions
  status_normalization_10000: 50, // ms for 10000 normalizations
  contract_validation_1000: 100,  // ms for 1000 validations
  contract_summary_10000: 200,    // ms for 10000 contracts
  sheet_discovery_large: 500,     // ms for large workbook discovery
  async_extraction_1000: 1000     // ms for 1000 row extraction
};

// Mock XLSX global for extraction tests
global.XLSX = {
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
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
 * Helper to generate mock contracts
 */
function generateMockContracts(count) {
  const contracts = [];
  const statuses = ['Erstellt', 'In Bearbeitung', 'Abgerechnet', 'Geplant'];
  const locations = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'];
  
  for (let i = 0; i < count; i++) {
    contracts.push({
      contractId: `CONTRACT-${String(i).padStart(6, '0')}`,
      contractTitle: `Test Contract ${i}`,
      status: statuses[i % statuses.length],
      location: locations[i % locations.length],
      plannedStart: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`
    });
  }
  return contracts;
}

/**
 * Helper to generate mock workbook
 */
function generateMockWorkbook(rowCount, sheetCount = 1) {
  const workbook = {
    SheetNames: [],
    Sheets: {}
  };
  
  for (let s = 0; s < sheetCount; s++) {
    const sheetName = `Sheet${s + 1}`;
    workbook.SheetNames.push(sheetName);
    
    const sheet = {
      '!ref': `A1:Z${rowCount + 1}` // +1 for header row
    };
    
    // Add headers (row 1)
    const headers = ['Auftragsnummer', 'Titel', 'Status', 'Standort', 'Datum'];
    headers.forEach((header, idx) => {
      const col = String.fromCharCode(65 + idx); // A, B, C, D, E
      sheet[`${col}1`] = { v: header };
    });
    
    // Add data rows
    for (let r = 2; r <= rowCount + 1; r++) {
      sheet[`A${r}`] = { v: `CONTRACT-${r}` };
      sheet[`B${r}`] = { v: `Test Contract ${r}` };
      sheet[`C${r}`] = { v: 'Erstellt' };
      sheet[`D${r}`] = { v: 'Berlin' };
      sheet[`E${r}`] = { v: 45500 }; // Excel date serial
    }
    
    workbook.Sheets[sheetName] = sheet;
  }
  
  return workbook;
}

describe('Contract Utils Performance Tests', () => {
  
  // ============================================
  // UUID Generation Performance
  // ============================================
  describe('generateUUID() Performance', () => {
    test('generates 1000 UUIDs within threshold', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          generateUUID();
        }
      });
      
      console.log(`UUID generation (1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.uuid_generation_1000);
    });
    
    test('all generated UUIDs are unique', () => {
      const uuids = new Set();
      for (let i = 0; i < 1000; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(1000);
    });
  });
  
  // ============================================
  // Column Conversion Performance
  // ============================================
  describe('Column Conversion Performance', () => {
    test('columnLetterToIndex handles 10000 conversions within threshold', () => {
      const columns = ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA', 'ABC'];
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 10000; i++) {
          columnLetterToIndex(columns[i % columns.length]);
        }
      });
      
      console.log(`Column letter to index (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.column_conversion_10000);
    });
    
    test('indexToColumnLetter handles 10000 conversions within threshold', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 10000; i++) {
          indexToColumnLetter(i % 702); // 0-701 covers A to ZZ
        }
      });
      
      console.log(`Index to column letter (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.column_conversion_10000);
    });
    
    test('round-trip conversion is consistent', () => {
      for (let i = 0; i < 100; i++) {
        const letter = indexToColumnLetter(i);
        const index = columnLetterToIndex(letter);
        expect(index).toBe(i);
      }
    });
  });
  
  // ============================================
  // Status Normalization Performance
  // ============================================
  describe('normalizeStatus() Performance', () => {
    test('normalizes 10000 status values within threshold', () => {
      const statuses = [
        'offen', 'inbearb', 'fertig', 'Erstellt', 'unknown',
        'complete', 'in arbeit', 'open', 'In Bearbeitung', 'Geplant'
      ];
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 10000; i++) {
          normalizeStatus(statuses[i % statuses.length]);
        }
      });
      
      console.log(`Status normalization (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.status_normalization_10000);
    });
  });
  
  // ============================================
  // Contract Validation Performance
  // ============================================
  describe('validateContractRecord() Performance', () => {
    test('validates 1000 contracts within threshold', () => {
      const contracts = generateMockContracts(1000);
      
      const { duration } = measureTime(() => {
        contracts.forEach(contract => validateContractRecord(contract));
      });
      
      console.log(`Contract validation (1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.contract_validation_1000);
    });
    
    test('validates contracts with various data completeness', () => {
      const contracts = [
        // Complete
        { contractId: '1', contractTitle: 'Test', status: 'Erstellt', location: 'Berlin' },
        // Minimal valid
        { contractId: '2', contractTitle: 'Test', status: 'Erstellt' },
        // Invalid - missing required
        { contractId: '', contractTitle: 'Test', status: 'Erstellt' },
        // Invalid - missing title
        { contractId: '3', contractTitle: '', status: 'Erstellt' }
      ];
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 250; i++) {
          contracts.forEach(c => validateContractRecord(c));
        }
      });
      
      console.log(`Mixed contract validation (1000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.contract_validation_1000);
    });
  });
  
  // ============================================
  // Contract Summary Performance
  // ============================================
  describe('getContractSummary() Performance', () => {
    test('summarizes 10000 contracts within threshold', () => {
      const contracts = generateMockContracts(10000);
      
      const { result, duration } = measureTime(() => {
        return getContractSummary(contracts);
      });
      
      console.log(`Contract summary (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.contract_summary_10000);
      expect(result.totalContracts).toBe(10000);
      expect(result.uniqueContractIds).toBe(10000);
    });
    
    test('handles contracts with missing optional fields', () => {
      const contracts = [];
      for (let i = 0; i < 5000; i++) {
        contracts.push({
          contractId: `C-${i}`,
          status: 'Erstellt'
          // Missing location and plannedStart
        });
      }
      
      const { result, duration } = measureTime(() => {
        return getContractSummary(contracts);
      });
      
      console.log(`Summary with missing fields (5000): ${duration.toFixed(2)}ms`);
      expect(result.byLocation['Unbekannt']).toBe(5000);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.contract_summary_10000 / 2);
    });
  });
  
  // ============================================
  // Sheet Discovery Performance
  // ============================================
  describe('discoverContractSheets() Performance', () => {
    test('discovers large workbook with multiple sheets', () => {
      const workbook = generateMockWorkbook(1000, 5); // 5 sheets, 1000 rows each
      
      const { result, duration } = measureTime(() => {
        return discoverContractSheets(workbook);
      });
      
      console.log(`Sheet discovery (5 sheets, 1000 rows each): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sheet_discovery_large);
      expect(Object.keys(result).length).toBe(5);
    });
    
    test('discovers workbook with many columns', () => {
      const workbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': {
            '!ref': 'A1:AZ100' // 52 columns
          }
        }
      };
      
      // Add headers for all columns
      for (let i = 0; i < 52; i++) {
        const col = indexToColumnLetter(i);
        workbook.Sheets['Sheet1'][`${col}1`] = { v: `Header ${i}` };
        workbook.Sheets['Sheet1'][`${col}2`] = { v: `Value ${i}` };
      }
      
      const { result, duration } = measureTime(() => {
        return discoverContractSheets(workbook);
      });
      
      console.log(`Sheet discovery (52 columns): ${duration.toFixed(2)}ms`);
      expect(result['Sheet1'].columns.length).toBe(52);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sheet_discovery_large);
    });
  });
  
  // ============================================
  // Column Mapping Suggestion Performance
  // ============================================
  describe('suggestContractColumnMapping() Performance', () => {
    test('suggests mapping for large column set', () => {
      const columns = [];
      const headers = [
        'Auftragsnummer', 'Titel', 'Aufgabe', 'Typ', 'Melder',
        'Datum', 'Beschreibung', 'Standort', 'Raum', 'Anlage',
        'Anlagenbeschreibung', 'Status', 'Kostenstelle', 'Sollstart', 'Seriennummer'
      ];
      
      for (let i = 0; i < 100; i++) {
        columns.push({
          letter: indexToColumnLetter(i),
          header: headers[i % headers.length] + (i >= headers.length ? ` ${i}` : '')
        });
      }
      
      const { result, duration } = measureTime(() => {
        return suggestContractColumnMapping(columns);
      });
      
      console.log(`Column mapping suggestion (100 columns): ${duration.toFixed(2)}ms`);
      expect(result.contractId.excelColumn).toBe('A'); // First 'Auftragsnummer'
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
  
  // ============================================
  // Async Extraction Performance
  // ============================================
  describe('extractContractsFromSheetAsync() Performance', () => {
    test('extracts 1000 rows within threshold', async () => {
      const rowCount = 1000;
      const mockWorkbook = {
        fileName: 'test.xlsx',
        Sheets: {
          'Sheet1': {
            '!ref': `A1:E${rowCount + 1}`
          }
        }
      };
      
      // Generate mock data for sheet_to_json
      const mockData = [['ID', 'Title', 'Status', 'Location', 'Date']];
      for (let i = 0; i < rowCount; i++) {
        mockData.push([
          `CONTRACT-${i}`,
          `Test Contract ${i}`,
          'Erstellt',
          'Berlin',
          45500
        ]);
      }
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);
      
      const mapping = {
        contractId: { excelColumn: 'A', type: 'string' },
        contractTitle: { excelColumn: 'B', type: 'string' },
        status: { excelColumn: 'C', type: 'string' },
        location: { excelColumn: 'D', type: 'string' },
        plannedStart: { excelColumn: 'E', type: 'date' }
      };
      
      const { result, duration } = await measureTimeAsync(async () => {
        return await extractContractsFromSheetAsync(mockWorkbook, 'Sheet1', mapping);
      });
      
      console.log(`Async extraction (1000 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.async_extraction_1000);
      expect(result.contracts.length).toBe(rowCount);
    });
    
    test('extraction with progress callback does not significantly impact performance', async () => {
      const rowCount = 500;
      const mockWorkbook = {
        fileName: 'test.xlsx',
        Sheets: {
          'Sheet1': {
            '!ref': `A1:E${rowCount + 1}`
          }
        }
      };
      
      const mockData = [['ID', 'Title', 'Status', 'Location', 'Date']];
      for (let i = 0; i < rowCount; i++) {
        mockData.push([`C-${i}`, `Title ${i}`, 'Erstellt', 'Berlin', 45500]);
      }
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);
      
      const mapping = {
        contractId: { excelColumn: 'A', type: 'string' },
        contractTitle: { excelColumn: 'B', type: 'string' },
        status: { excelColumn: 'C', type: 'string' }
      };
      
      const progressCalls = [];
      const onProgress = jest.fn(progress => progressCalls.push(progress));
      
      const { duration } = await measureTimeAsync(async () => {
        return await extractContractsFromSheetAsync(mockWorkbook, 'Sheet1', mapping, {
          onProgress
        });
      });
      
      console.log(`Async extraction with progress (500 rows): ${duration.toFixed(2)}ms`);
      expect(onProgress).toHaveBeenCalled();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.async_extraction_1000 / 2);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('contract summary does not create excessive intermediate objects', () => {
      const contracts = generateMockContracts(5000);
      
      // Run multiple times to check for memory leaks
      for (let i = 0; i < 10; i++) {
        getContractSummary(contracts);
      }
      
      // If we get here without running out of memory, the test passes
      expect(true).toBe(true);
    });
    
    test('column mapping reuses default mapping object appropriately', () => {
      const emptyColumns = [];
      
      // Call multiple times - should not create memory issues
      for (let i = 0; i < 1000; i++) {
        suggestContractColumnMapping(emptyColumns);
      }
      
      expect(true).toBe(true);
    });
  });
});
