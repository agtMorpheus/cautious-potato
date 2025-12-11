/**
 * Unit Tests for Utility Functions (utils.js)
 * Phase 6 Testing Framework
 */

// Mock XLSX library
const mockXLSX = {
  read: jest.fn(),
  write: jest.fn(),
  writeFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn()
  }
};
global.XLSX = mockXLSX;

// Import modules to test
import { 
  sumByPosition, 
  getPositionSummary,
  validateExtractedPositions,
  generateAbrechnungFilename,
  parseProtokoll,
  extractPositions,
  readExcelFile,
  createExportWorkbook
} from '../../js/utils.js';

describe('Utility Functions (utils.js)', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('sumByPosition()', () => {
    test('aggregates quantities by position number', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5 },
        { posNr: '01.01.0020', menge: 3 },
        { posNr: '01.01.0010', menge: 2 }
      ];
      
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010']).toBe(7);
      expect(result['01.01.0020']).toBe(3);
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('handles empty array', () => {
      const result = sumByPosition([]);
      expect(result).toEqual({});
    });

    test('handles single position', () => {
      const positions = [{ posNr: '01.01.0010', menge: 5 }];
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010']).toBe(5);
      expect(Object.keys(result)).toHaveLength(1);
    });

    test('handles zero quantities', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 0 },
        { posNr: '01.01.0020', menge: 5 }
      ];
      
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010']).toBe(0);
      expect(result['01.01.0020']).toBe(5);
    });

    test('handles decimal quantities', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 2.5 },
        { posNr: '01.01.0010', menge: 1.5 }
      ];
      
      const result = sumByPosition(positions);
      expect(result['01.01.0010']).toBe(4);
    });

    test('throws error on null input', () => {
      expect(() => sumByPosition(null)).toThrow('Invalid input: positions must be an array');
    });

    test('throws error on non-array input', () => {
      expect(() => sumByPosition('not an array')).toThrow('Invalid input: positions must be an array');
      expect(() => sumByPosition({})).toThrow('Invalid input: positions must be an array');
    });

    test('throws error on invalid position object', () => {
      const invalidPositions = [{ menge: 5 }]; // Missing posNr
      expect(() => sumByPosition(invalidPositions)).toThrow('Invalid position object: missing posNr');
    });

    test('throws error on non-numeric quantity', () => {
      const invalidPositions = [{ posNr: '01.01.0010', menge: 'five' }];
      expect(() => sumByPosition(invalidPositions)).toThrow('Invalid position object: menge must be a number');
    });

    test('handles large datasets efficiently', () => {
      const largePositions = Array.from({ length: 10000 }, (_, i) => ({
        posNr: `01.01.${String(i % 100).padStart(4, '0')}`,
        menge: Math.floor(Math.random() * 10) + 1
      }));
      
      const startTime = performance.now();
      const result = sumByPosition(largePositions);
      const endTime = performance.now();
      
      // Should complete in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(Object.keys(result)).toHaveLength(100);
    });
  });

  describe('getPositionSummary()', () => {
    test('computes correct summary statistics', () => {
      const positionMap = {
        '01.01.0010': 5,
        '01.01.0020': 3,
        '01.01.0030': 8,
        '01.01.0040': 1
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(17);
      expect(summary.uniquePositions).toBe(4);
      expect(summary.minQuantity).toBe(1);
      expect(summary.maxQuantity).toBe(8);
      expect(summary.averageQuantity).toBe(4.25);
    });

    test('handles empty map', () => {
      const summary = getPositionSummary({});
      
      expect(summary.totalQuantity).toBe(0);
      expect(summary.uniquePositions).toBe(0);
      expect(summary.minQuantity).toBe(0);
      expect(summary.maxQuantity).toBe(0);
      expect(summary.averageQuantity).toBe(0);
    });

    test('handles single position', () => {
      const positionMap = { '01.01.0010': 5 };
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(5);
      expect(summary.uniquePositions).toBe(1);
      expect(summary.minQuantity).toBe(5);
      expect(summary.maxQuantity).toBe(5);
      expect(summary.averageQuantity).toBe(5);
    });

    test('handles zero quantities', () => {
      const positionMap = {
        '01.01.0010': 0,
        '01.01.0020': 5
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(5);
      expect(summary.uniquePositions).toBe(2);
      expect(summary.minQuantity).toBe(0);
      expect(summary.maxQuantity).toBe(5);
    });

    test('throws error on invalid input', () => {
      expect(() => getPositionSummary(null)).toThrow('Invalid input: positionMap must be an object');
      expect(() => getPositionSummary([])).toThrow('Invalid input: positionMap must be an object');
    });
  });

  describe('validateExtractedPositions()', () => {
    test('validates normal positions as valid', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
        { posNr: '01.01.0020', menge: 3, rowIndex: 31 }
      ];
      
      const result = validateExtractedPositions(positions);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('detects duplicate position numbers', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
        { posNr: '01.01.0010', menge: 3, rowIndex: 31 }
      ];
      
      const result = validateExtractedPositions(positions);
      
      expect(result.valid).toBe(true); // Duplicates are warnings, not errors
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Duplicate position number');
    });

    test('detects negative quantities', () => {
      const positions = [
        { posNr: '01.01.0010', menge: -5, rowIndex: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Negative quantity');
    });

    test('detects invalid position number format', () => {
      const positions = [
        { posNr: 'INVALID', menge: 5, rowIndex: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Invalid position number format');
    });

    test('detects missing required fields', () => {
      const positions = [
        { menge: 5, rowIndex: 30 }, // Missing posNr
        { posNr: '01.01.0010', rowIndex: 30 } // Missing menge
      ];
      
      const result = validateExtractedPositions(positions);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    test('returns empty array as valid with warning', () => {
      const result = validateExtractedPositions([]);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('No positions'))).toBe(true);
    });

    test('validates position number format correctly', () => {
      const validFormats = [
        '01.01.0010',
        '02.03.0150',
        '10.99.9999'
      ];
      
      const invalidFormats = [
        '1.1.10',      // Too short
        '01.01.10',    // Missing leading zeros
        'AB.CD.EFGH',  // Non-numeric
        '01-01-0010'   // Wrong separator
      ];
      
      validFormats.forEach(posNr => {
        const result = validateExtractedPositions([{ posNr, menge: 1, rowIndex: 30 }]);
        expect(result.warnings.filter(w => w.includes('Invalid position number format'))).toHaveLength(0);
      });
      
      invalidFormats.forEach(posNr => {
        const result = validateExtractedPositions([{ posNr, menge: 1, rowIndex: 30 }]);
        expect(result.warnings.filter(w => w.includes('Invalid position number format'))).toHaveLength(1);
      });
    });
  });

  describe('generateAbrechnungFilename()', () => {
    test('generates filename with order number and date', () => {
      const metadata = {
        orderNumber: 'ORD-001',
        date: '2025-12-11',
        plant: 'Factory A'
      };
      
      const filename = generateAbrechnungFilename(metadata);
      
      expect(filename).toContain('ORD-001');
      expect(filename).toContain('2025-12-11');
      expect(filename).toMatch(/\.xlsx$/);
    });

    test('handles missing order number gracefully', () => {
      const metadata = {
        date: '2025-12-11',
        plant: 'Factory A'
      };
      
      const filename = generateAbrechnungFilename(metadata);
      
      expect(filename).toContain('2025-12-11');
      expect(filename).toContain('Abrechnung');
      expect(filename).toMatch(/\.xlsx$/);
    });

    test('sanitizes filename characters', () => {
      const metadata = {
        orderNumber: 'ORD/001<>:"|?*',
        date: '2025-12-11'
      };
      
      const filename = generateAbrechnungFilename(metadata);
      
      // Should not contain invalid filename characters
      expect(filename).not.toMatch(/[<>:"|?*]/);
    });

    test('handles empty metadata', () => {
      const filename = generateAbrechnungFilename({});
      
      expect(filename).toContain('Abrechnung');
      expect(filename).toMatch(/\.xlsx$/);
    });
  });

  describe('parseProtokoll()', () => {
    test('extracts metadata from correct cells', () => {
      const mockWorkbook = {
        Sheets: {
          'Sheet1': {
            'U3': { v: 'PROT-001' },
            'N5': { v: 'ORD-001' },
            'A10': { v: 'Factory A' },
            'T10': { v: 'Building 1' },
            'T7': { v: 'Test Company' }
          }
        },
        SheetNames: ['Sheet1']
      };
      
      const metadata = parseProtokoll(mockWorkbook);
      
      expect(metadata.protocolNumber).toBe('PROT-001');
      expect(metadata.orderNumber).toBe('ORD-001');
      expect(metadata.plant).toBe('Factory A');
      expect(metadata.location).toBe('Building 1');
      expect(metadata.company).toBe('Test Company');
      expect(metadata.date).toBeDefined();
    });

    test('throws error on missing workbook', () => {
      expect(() => parseProtokoll(null)).toThrow('Invalid workbook');
      expect(() => parseProtokoll({})).toThrow('Invalid workbook');
    });

    test('throws error on missing required fields', () => {
      const mockWorkbook = {
        Sheets: {
          'Sheet1': {
            'U3': { v: 'PROT-001' }
            // Missing other required fields
          }
        },
        SheetNames: ['Sheet1']
      };
      
      expect(() => parseProtokoll(mockWorkbook)).toThrow('Missing required metadata');
    });

    test('handles empty cells gracefully', () => {
      const mockWorkbook = {
        Sheets: {
          'Sheet1': {
            'U3': { v: 'PROT-001' },
            'N5': { v: 'ORD-001' },
            'A10': { v: '' }, // Empty cell
            'T10': { v: 'Building 1' },
            'T7': { v: 'Test Company' }
          }
        },
        SheetNames: ['Sheet1']
      };
      
      const metadata = parseProtokoll(mockWorkbook);
      expect(metadata.plant).toBe('');
    });
  });

  describe('extractPositions()', () => {
    test('extracts positions from correct row range', () => {
      const mockSheet = {};
      
      // Mock positions in rows 30-32
      for (let row = 30; row <= 32; row++) {
        mockSheet[`A${row}`] = { v: `01.01.${String(row - 29).padStart(4, '0')}` };
        mockSheet[`B${row}`] = { v: row - 25 }; // Quantities 5, 6, 7
      }
      
      const mockWorkbook = {
        Sheets: { 'Sheet1': mockSheet },
        SheetNames: ['Sheet1']
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({
        posNr: '01.01.0001',
        menge: 5,
        rowIndex: 30
      });
    });

    test('skips empty rows', () => {
      const mockSheet = {
        'A30': { v: '01.01.0010' },
        'B30': { v: 5 },
        // Row 31 is empty
        'A32': { v: '01.01.0020' },
        'B32': { v: 3 }
      };
      
      const mockWorkbook = {
        Sheets: { 'Sheet1': mockSheet },
        SheetNames: ['Sheet1']
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions).toHaveLength(2);
      expect(positions.map(p => p.posNr)).toEqual(['01.01.0010', '01.01.0020']);
    });

    test('handles non-numeric quantities', () => {
      const mockSheet = {
        'A30': { v: '01.01.0010' },
        'B30': { v: 'invalid' }
      };
      
      const mockWorkbook = {
        Sheets: { 'Sheet1': mockSheet },
        SheetNames: ['Sheet1']
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions).toHaveLength(0); // Should skip invalid rows
    });
  });

  describe('readExcelFile()', () => {
    test('reads valid Excel file', async () => {
      const mockFile = new File(['mock content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const mockWorkbook = { SheetNames: ['Sheet1'], Sheets: {} };
      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock FileReader
      global.FileReader = jest.fn(() => ({
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      }));
      
      const result = await readExcelFile(mockFile);
      
      expect(result.workbook).toBe(mockWorkbook);
      expect(result.metadata.fileName).toBe('test.xlsx');
      expect(result.metadata.fileSize).toBe(mockFile.size);
    });

    test('rejects invalid file types', async () => {
      const mockFile = new File(['mock content'], 'test.txt', {
        type: 'text/plain'
      });
      
      await expect(readExcelFile(mockFile)).rejects.toThrow('Invalid file type');
    });

    test('rejects files that are too large', async () => {
      const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      await expect(readExcelFile(largeFile)).rejects.toThrow('File too large');
    });
  });

  describe('createExportWorkbook()', () => {
    test('creates workbook with header and positions', async () => {
      const abrechnungData = {
        header: {
          date: '2025-12-11',
          orderNumber: 'ORD-001',
          plant: 'Factory A',
          location: 'Building 1'
        },
        positionen: {
          '01.01.0010': 5,
          '01.01.0020': 3
        }
      };
      
      const mockWorkbook = { SheetNames: ['EAW'], Sheets: { EAW: {} } };
      mockXLSX.utils.book_new.mockReturnValue(mockWorkbook);
      
      // Mock template loading
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      });
      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      const result = await createExportWorkbook(abrechnungData);
      
      expect(result).toBe(mockWorkbook);
      expect(mockXLSX.read).toHaveBeenCalled();
    });

    test('throws error on missing data', async () => {
      await expect(createExportWorkbook(null)).rejects.toThrow('Invalid abrechnung data');
      await expect(createExportWorkbook({})).rejects.toThrow('Invalid abrechnung data');
    });
  });

  describe('Performance Tests', () => {
    test('sumByPosition handles large datasets efficiently', () => {
      const largePositions = Array.from({ length: 50000 }, (_, i) => ({
        posNr: `01.01.${String(i % 1000).padStart(4, '0')}`,
        menge: Math.floor(Math.random() * 10) + 1
      }));
      
      const startTime = performance.now();
      const result = sumByPosition(largePositions);
      const endTime = performance.now();
      
      // Should complete in under 500ms
      expect(endTime - startTime).toBeLessThan(500);
      expect(Object.keys(result)).toHaveLength(1000);
    });

    test('validateExtractedPositions is efficient', () => {
      const largePositions = Array.from({ length: 10000 }, (_, i) => ({
        posNr: `01.01.${String(i).padStart(4, '0')}`,
        menge: Math.floor(Math.random() * 10) + 1,
        rowIndex: 30 + i
      }));
      
      const startTime = performance.now();
      const result = validateExtractedPositions(largePositions);
      const endTime = performance.now();
      
      // Should complete in under 200ms
      expect(endTime - startTime).toBeLessThan(200);
      expect(result.valid).toBe(true);
    });
  });
});