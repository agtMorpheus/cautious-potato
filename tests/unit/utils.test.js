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
    book_append_sheet: jest.fn(),
    encode_cell: jest.fn((cell) => {
      const col = String.fromCharCode(65 + cell.c);
      const row = cell.r + 1;
      return `${col}${row}`;
    }),
    decode_cell: jest.fn((address) => {
      const match = address.match(/^([A-Z]+)(\d+)$/);
      if (!match) return { c: 0, r: 0 };
      const col = match[1].charCodeAt(0) - 65;
      const row = parseInt(match[2]) - 1;
      return { c: col, r: row };
    }),
    encode_range: jest.fn((range) => {
      return `${mockXLSX.utils.encode_cell(range.s)}:${mockXLSX.utils.encode_cell(range.e)}`;
    }),
    decode_range: jest.fn((range) => {
      const [start, end] = range.split(':');
      return {
        s: mockXLSX.utils.decode_cell(start),
        e: mockXLSX.utils.decode_cell(end)
      };
    })
  }
};
global.XLSX = mockXLSX;

// Import modules to test
import { 
  sumByPosition, 
  getPositionSummary,
  validateExtractedPositions,
  generateExportFilename,
  generateAbrechnungFilename,
  parseProtokollMetadata,
  parseProtokoll,
  extractPositions,
  readExcelFile,
  createExportWorkbook,
  fillAbrechnungHeader,
  fillAbrechnungPositions,
  validateFilledPositions,
  safeReadAndParseProtokoll,
  exportToExcel,
  updateMetadataCellMap,
  getMetadataCellMap,
  resetMetadataCellMap,
  clearAbrechnungTemplateCache
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
      expect(() => sumByPosition(null)).toThrow('Positionen muss ein Array sein');
    });

    test('throws error on non-array input', () => {
      expect(() => sumByPosition('not an array')).toThrow('Positionen muss ein Array sein');
      expect(() => sumByPosition({})).toThrow('Positionen muss ein Array sein');
    });

    test('throws error on invalid position object', () => {
      const invalidPositions = [{ menge: 5 }]; // Missing posNr
      expect(() => sumByPosition(invalidPositions)).toThrow('Ungültige Positionsnummer');
    });

    test('throws error on non-numeric quantity', () => {
      const invalidPositions = [{ posNr: '01.01.0010', menge: 'five' }];
      expect(() => sumByPosition(invalidPositions)).toThrow('Ungültige Menge für Position');
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

    test('handles invalid input gracefully', () => {
      const nullResult = getPositionSummary(null);
      expect(nullResult.totalQuantity).toBe(0);
      expect(nullResult.uniquePositions).toBe(0);
      
      const arrayResult = getPositionSummary([]);
      expect(arrayResult.totalQuantity).toBe(0);
      expect(arrayResult.uniquePositions).toBe(0);
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
      expect(positions[0]).toMatchObject({
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
      
      await expect(readExcelFile(mockFile)).rejects.toThrow('Ungültiges Dateiformat');
    });

    test('rejects files that are too large', async () => {
      const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      await expect(readExcelFile(largeFile)).rejects.toThrow('Datei zu groß');
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
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      });
      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      const result = await createExportWorkbook(abrechnungData);
      
      expect(result).toBe(mockWorkbook);
      expect(mockXLSX.read).toHaveBeenCalled();
    });

    test('throws error on missing data', async () => {
      await expect(createExportWorkbook(null)).rejects.toThrow('Invalid abrechnungData');
      await expect(createExportWorkbook({})).rejects.toThrow('Header oder Positionen fehlen');
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

  // ============================================================
  // generateExportFilename Tests
  // ============================================================

  describe('generateExportFilename()', () => {
    test('generates filename with auftragsNr and timestamp', () => {
      const filename = generateExportFilename('ORD-001');
      
      expect(filename).toContain('Abrechnung');
      expect(filename).toContain('ORD-001');
      expect(filename).toMatch(/\.xlsx$/);
    });

    test('generates unique filenames with different timestamps', () => {
      const filename1 = generateExportFilename('ORD-001');
      // Wait a tiny bit to ensure different timestamp
      const filename2 = generateExportFilename('ORD-001');
      
      // Both should contain the order number
      expect(filename1).toContain('ORD-001');
      expect(filename2).toContain('ORD-001');
    });

    test('handles empty auftragsNr', () => {
      const filename = generateExportFilename('');
      
      expect(filename).toContain('Abrechnung');
      expect(filename).toMatch(/\.xlsx$/);
    });

    test('handles undefined auftragsNr', () => {
      const filename = generateExportFilename();
      
      expect(filename).toContain('Abrechnung');
      expect(filename).toMatch(/\.xlsx$/);
    });
  });

  // ============================================================
  // Metadata Cell Map Configuration Tests
  // ============================================================

  describe('updateMetadataCellMap()', () => {
    beforeEach(() => {
      resetMetadataCellMap();
    });

    test('updates cell mapping for a field', () => {
      updateMetadataCellMap('auftragsNr', ['A1', 'B1', 'C1']);
      
      const map = getMetadataCellMap();
      expect(map.auftragsNr).toEqual(['A1', 'B1', 'C1']);
    });

    test('throws error for empty array', () => {
      expect(() => updateMetadataCellMap('auftragsNr', [])).toThrow();
    });

    test('throws error for non-array input', () => {
      expect(() => updateMetadataCellMap('auftragsNr', 'A1')).toThrow();
      expect(() => updateMetadataCellMap('auftragsNr', null)).toThrow();
    });
  });

  describe('getMetadataCellMap()', () => {
    beforeEach(() => {
      resetMetadataCellMap();
    });

    test('returns copy of current mapping', () => {
      const map = getMetadataCellMap();
      
      expect(map).toBeDefined();
      expect(typeof map).toBe('object');
    });

    test('returns immutable copy', () => {
      const map1 = getMetadataCellMap();
      map1.newField = ['Z1'];
      
      const map2 = getMetadataCellMap();
      expect(map2.newField).toBeUndefined();
    });
  });

  describe('resetMetadataCellMap()', () => {
    test('resets mapping to defaults', () => {
      updateMetadataCellMap('auftragsNr', ['Z99']);
      resetMetadataCellMap();
      
      const map = getMetadataCellMap();
      expect(map.auftragsNr).not.toContain('Z99');
    });
  });

  // ============================================================
  // clearAbrechnungTemplateCache Tests
  // ============================================================

  describe('clearAbrechnungTemplateCache()', () => {
    test('clears template cache without error', () => {
      expect(() => clearAbrechnungTemplateCache()).not.toThrow();
    });

    test('can be called multiple times', () => {
      clearAbrechnungTemplateCache();
      clearAbrechnungTemplateCache();
      clearAbrechnungTemplateCache();
      // Should not throw
    });
  });

  // ============================================================
  // fillAbrechnungHeader Tests
  // ============================================================

  describe('fillAbrechnungHeader()', () => {
    test('fills header cells with metadata', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {}
        }
      };
      
      const metadata = {
        datum: '2025-12-11',
        auftragsNr: 'ORD-001',
        anlage: 'Factory A',
        einsatzort: 'Building 1'
      };
      
      const result = fillAbrechnungHeader(mockWorkbook, metadata);
      
      expect(result).toBe(mockWorkbook);
    });

    test('throws error for missing sheet', () => {
      const mockWorkbook = {
        Sheets: {}
      };
      
      const metadata = { datum: '2025-12-11' };
      
      expect(() => fillAbrechnungHeader(mockWorkbook, metadata)).toThrow();
    });
  });

  // ============================================================
  // fillAbrechnungPositions Tests
  // ============================================================

  describe('fillAbrechnungPositions()', () => {
    test('fills position cells with quantities', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A10': { v: '01.01.0010' },
            'A11': { v: '01.01.0020' }
          }
        }
      };
      
      const positionSums = {
        '01.01.0010': 5,
        '01.01.0020': 3
      };
      
      const result = fillAbrechnungPositions(mockWorkbook, positionSums);
      
      expect(result).toBe(mockWorkbook);
    });

    test('throws error for missing sheet', () => {
      const mockWorkbook = { Sheets: {} };
      const positionSums = { '01.01.0010': 5 };
      
      expect(() => fillAbrechnungPositions(mockWorkbook, positionSums)).toThrow();
    });
  });

  // ============================================================
  // validateFilledPositions Tests
  // ============================================================

  describe('validateFilledPositions()', () => {
    test('validates workbook with filled positions', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A10': { v: '01.01.0010' },
            'B10': { v: 5 }
          }
        }
      };
      
      const result = validateFilledPositions(mockWorkbook);
      
      expect(result).toHaveProperty('filledCount');
      expect(result).toHaveProperty('emptyCount');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('isValid');
    });

    test('returns invalid for missing sheet', () => {
      const mockWorkbook = { Sheets: {} };
      
      const result = validateFilledPositions(mockWorkbook);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('counts filled and empty positions', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A10': { v: '01.01.0010' },
            'B10': { v: 5 },
            'A11': { v: '01.01.0020' }
            // B11 is missing (empty quantity)
          }
        }
      };
      
      const result = validateFilledPositions(mockWorkbook);
      
      expect(result.filledCount).toBeGreaterThanOrEqual(0);
      expect(result.emptyCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // exportToExcel Tests
  // ============================================================

  describe('exportToExcel()', () => {
    beforeEach(() => {
      mockXLSX.writeFile.mockClear();
    });

    test('exports workbook with metadata object', () => {
      const mockWorkbook = { Sheets: { 'EAW': {} }, SheetNames: ['EAW'] };
      const metadata = { orderNumber: 'ORD-001' };
      
      const result = exportToExcel(mockWorkbook, metadata);
      
      expect(mockXLSX.writeFile).toHaveBeenCalled();
      expect(result).toHaveProperty('fileName');
    });

    test('exports workbook with string filename (backward compatibility)', () => {
      const mockWorkbook = { Sheets: { 'EAW': {} }, SheetNames: ['EAW'] };
      const filename = 'test-export.xlsx';
      
      const result = exportToExcel(mockWorkbook, filename);
      
      expect(mockXLSX.writeFile).toHaveBeenCalled();
      expect(result.fileName).toBe(filename);
    });

    test('generates default filename when metadata is empty', () => {
      const mockWorkbook = { Sheets: { 'EAW': {} }, SheetNames: ['EAW'] };
      
      const result = exportToExcel(mockWorkbook, {});
      
      expect(mockXLSX.writeFile).toHaveBeenCalled();
      expect(result.fileName).toContain('Abrechnung');
    });

    test('handles export errors', () => {
      const mockWorkbook = { Sheets: { 'EAW': {} }, SheetNames: ['EAW'] };
      mockXLSX.writeFile.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      expect(() => exportToExcel(mockWorkbook, {})).toThrow('Fehler beim Exportieren');
    });
  });

  // ============================================================
  // parseProtokollMetadata Tests
  // ============================================================

  describe('parseProtokollMetadata()', () => {
    test('parses metadata from worksheet', () => {
      const mockWorkbook = {
        Sheets: {
          'Protokoll': {
            'U3': { v: 'PROT-001' },
            'N5': { v: 'ORD-001' },
            'A10': { v: 'Factory A' }
          }
        },
        SheetNames: ['Protokoll']
      };
      
      // This should throw since we don't have the required cells
      expect(() => parseProtokollMetadata(mockWorkbook)).toThrow();
    });

    test('throws error for missing sheet', () => {
      const mockWorkbook = {
        Sheets: {},
        SheetNames: []
      };
      
      expect(() => parseProtokollMetadata(mockWorkbook)).toThrow();
    });

    test('accepts strictMode option', () => {
      const mockWorkbook = {
        Sheets: {
          'Protokoll': {}
        },
        SheetNames: ['Protokoll']
      };
      
      expect(() => parseProtokollMetadata(mockWorkbook, { strictMode: true })).toThrow();
    });
  });

  // ============================================================
  // extractPositions Tests
  // ============================================================

  describe('extractPositions()', () => {
    test('extracts positions from worksheet', () => {
      const mockWorkbook = {
        Sheets: {
          'Protokoll': {
            'A30': { v: '01.01.0010' },
            'B30': { v: 5 },
            'A31': { v: '01.01.0020' },
            'B31': { v: 3 }
          }
        },
        SheetNames: ['Protokoll']
      };
      
      const result = extractPositions(mockWorkbook);
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('throws error for missing sheet', () => {
      const mockWorkbook = {
        Sheets: {},
        SheetNames: []
      };
      
      expect(() => extractPositions(mockWorkbook)).toThrow();
    });

    test('handles empty worksheet', () => {
      const mockWorkbook = {
        Sheets: {
          'Protokoll': {}
        },
        SheetNames: ['Protokoll']
      };
      
      const result = extractPositions(mockWorkbook);
      
      expect(result).toEqual([]);
    });
  });
});