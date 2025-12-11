/**
 * Unit Tests for ExcelJS-based Utility Functions (utils-exceljs.js)
 * Tests Excel operations using ExcelJS library
 */

import {
  fillAbrechnungHeaderExcelJS,
  fillAbrechnungPositionsExcelJS
} from '../../js/utils-exceljs.js';

// Mock config
jest.mock('../../js/config.js', () => ({
  ABRECHNUNG_CONFIG: {
    sheetName: 'EAW',
    header: {
      datum: 'B1',
      auftragsNr: 'B2',
      anlage: 'B3',
      einsatzort: 'B4'
    },
    positions: {
      startRow: 9,
      endRow: 100,
      positionNumberColumn: 'A',
      quantityColumn: 'B'
    }
  }
}));

describe('ExcelJS Utilities (utils-exceljs.js)', () => {
  // Mock ExcelJS workbook
  const createMockWorkbook = (sheetName = 'EAW') => {
    const cells = {};
    const worksheet = {
      getCell: jest.fn((address) => {
        if (!cells[address]) {
          cells[address] = { value: null };
        }
        return cells[address];
      }),
      _cells: cells
    };
    
    return {
      getWorksheet: jest.fn((name) => name === sheetName ? worksheet : null),
      _worksheet: worksheet
    };
  };

  describe('fillAbrechnungHeaderExcelJS()', () => {
    test('fills header cells with metadata', () => {
      const workbook = createMockWorkbook();
      const metadata = {
        datum: '2025-01-15',
        auftragsNr: 'ORD-12345',
        anlage: 'Test Factory',
        einsatzort: 'Building A'
      };
      
      fillAbrechnungHeaderExcelJS(workbook, metadata);
      
      expect(workbook._worksheet._cells['B1'].value).toBe('2025-01-15');
      expect(workbook._worksheet._cells['B2'].value).toBe('ORD-12345');
      expect(workbook._worksheet._cells['B3'].value).toBe('Test Factory');
      expect(workbook._worksheet._cells['B4'].value).toBe('Building A');
    });

    test('throws error if sheet not found', () => {
      const workbook = { getWorksheet: jest.fn(() => null) };
      const metadata = { datum: '2025-01-15' };
      
      expect(() => fillAbrechnungHeaderExcelJS(workbook, metadata)).toThrow('Sheet "EAW" nicht gefunden');
    });

    test('handles partial metadata', () => {
      const workbook = createMockWorkbook();
      const metadata = {
        datum: '2025-01-15',
        auftragsNr: 'ORD-12345'
      };
      
      fillAbrechnungHeaderExcelJS(workbook, metadata);
      
      expect(workbook._worksheet._cells['B1'].value).toBe('2025-01-15');
      expect(workbook._worksheet._cells['B2'].value).toBe('ORD-12345');
    });

    test('handles empty metadata', () => {
      const workbook = createMockWorkbook();
      const metadata = {};
      
      expect(() => fillAbrechnungHeaderExcelJS(workbook, metadata)).not.toThrow();
    });

    test('handles null values in metadata', () => {
      const workbook = createMockWorkbook();
      const metadata = {
        datum: null,
        auftragsNr: 'ORD-12345',
        anlage: undefined
      };
      
      fillAbrechnungHeaderExcelJS(workbook, metadata);
      
      expect(workbook._worksheet._cells['B1'].value).toBe(null);
      expect(workbook._worksheet._cells['B2'].value).toBe('ORD-12345');
    });

    test('handles special characters in metadata', () => {
      const workbook = createMockWorkbook();
      const metadata = {
        anlage: 'Factory "Test" & Co.',
        einsatzort: '<Building B>'
      };
      
      fillAbrechnungHeaderExcelJS(workbook, metadata);
      
      expect(workbook._worksheet._cells['B3'].value).toBe('Factory "Test" & Co.');
      expect(workbook._worksheet._cells['B4'].value).toBe('<Building B>');
    });
  });

  describe('fillAbrechnungPositionsExcelJS()', () => {
    const createWorkbookWithPositions = (positions) => {
      const cells = {};
      // Pre-populate position numbers in column A
      positions.forEach((posNr, index) => {
        const row = 9 + index;
        cells[`A${row}`] = { value: posNr };
      });
      
      const worksheet = {
        getCell: jest.fn((address) => {
          if (!cells[address]) {
            cells[address] = { value: null };
          }
          return cells[address];
        }),
        _cells: cells
      };
      
      return {
        getWorksheet: jest.fn((name) => name === 'EAW' ? worksheet : null),
        _worksheet: worksheet
      };
    };

    test('fills quantities for matching positions', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010', '01.01.0020', '01.01.0030']);
      const positionSums = {
        '01.01.0010': 5,
        '01.01.0020': 10
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      expect(workbook._worksheet._cells['B9'].value).toBe(5);
      expect(workbook._worksheet._cells['B10'].value).toBe(10);
      expect(workbook._worksheet._cells['B11']).toBeUndefined();
    });

    test('throws error if sheet not found', () => {
      const workbook = { getWorksheet: jest.fn(() => null) };
      
      expect(() => fillAbrechnungPositionsExcelJS(workbook, {})).toThrow('Sheet "EAW" nicht gefunden');
    });

    test('handles empty positionSums', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010']);
      
      expect(() => fillAbrechnungPositionsExcelJS(workbook, {})).not.toThrow();
    });

    test('handles positions not in template', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010']);
      const positionSums = {
        '01.01.0010': 5,
        '99.99.9999': 100  // Not in template
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      expect(workbook._worksheet._cells['B9'].value).toBe(5);
    });

    test('handles decimal quantities', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010']);
      const positionSums = {
        '01.01.0010': 5.75
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      expect(workbook._worksheet._cells['B9'].value).toBe(5.75);
    });

    test('handles zero quantities', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010']);
      const positionSums = {
        '01.01.0010': 0
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      expect(workbook._worksheet._cells['B9'].value).toBe(0);
    });

    test('scans rows within configured range', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010']);
      const positionSums = {
        '01.01.0010': 5
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      // Verify worksheet.getCell was called for positions column
      const callsForColumnA = workbook._worksheet.getCell.mock.calls.filter(
        call => call[0].startsWith('A')
      );
      expect(callsForColumnA.length).toBeGreaterThan(0);
    });

    test('handles position numbers with different formats', () => {
      const workbook = createWorkbookWithPositions(['01.01.0010', '1.1.10', 'ABC-123']);
      const positionSums = {
        '01.01.0010': 5,
        '1.1.10': 3,
        'ABC-123': 7
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      expect(workbook._worksheet._cells['B9'].value).toBe(5);
      expect(workbook._worksheet._cells['B10'].value).toBe(3);
      expect(workbook._worksheet._cells['B11'].value).toBe(7);
    });

    test('handles numeric position numbers in template', () => {
      const cells = {
        'A9': { value: 1001010 }  // Numeric instead of string
      };
      const worksheet = {
        getCell: jest.fn((address) => {
          if (!cells[address]) {
            cells[address] = { value: null };
          }
          return cells[address];
        }),
        _cells: cells
      };
      const workbook = {
        getWorksheet: jest.fn((name) => name === 'EAW' ? worksheet : null),
        _worksheet: worksheet
      };
      
      const positionSums = {
        '1001010': 5
      };
      
      fillAbrechnungPositionsExcelJS(workbook, positionSums);
      
      // Should still work since hasOwnProperty will match
      expect(cells['B9'].value).toBe(5);
    });
  });
});
