/**
 * Unit Tests for Utility Functions Module (utils.js)
 * Phase 6 - Testing Framework
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
  resetMetadataCellMap,
  readExcelFile,
  loadAbrechnungTemplate,
  createExportWorkbook,
  safeReadAndParseProtokoll,
  exportToExcel
} from '../../js/utils.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('Utility Functions (utils.js)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    clearAbrechnungTemplateCache();
    // Reset XLSX mocks
    if (global.XLSX) {
        global.XLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
        global.XLSX.writeFile.mockImplementation(() => {});
    }
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
    });

    test('handles empty array', () => {
      const result = sumByPosition([]);
      expect(result).toEqual({});
    });

    test('throws error on invalid input (not an array)', () => {
      expect(() => sumByPosition(null)).toThrow('Positionen muss ein Array sein');
      expect(() => sumByPosition('not an array')).toThrow('Positionen muss ein Array sein');
    });

    test('throws error on invalid position object', () => {
      expect(() => sumByPosition([null])).toThrow('Ungültiges Positionsobjekt im Array');
      expect(() => sumByPosition([{ menge: 5 }])).toThrow('Ungültige Positionsnummer');
    });

    test('throws error on non-numeric quantity', () => {
      expect(() => sumByPosition([
        { posNr: '01.01.0010', menge: 'five' }
      ])).toThrow('Ungültige Menge');
    });

    test('handles decimal quantities correctly', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5.5 },
        { posNr: '01.01.0010', menge: 2.3 }
      ];
      
      const result = sumByPosition(positions);
      expect(result['01.01.0010']).toBeCloseTo(7.8);
    });

    test('handles large number of positions efficiently', () => {
      const positions = [];
      for (let i = 0; i < 1000; i++) {
        positions.push({ posNr: `01.01.${String(i).padStart(4, '0')}`, menge: 1 });
      }
      
      const result = sumByPosition(positions);
      expect(Object.keys(result).length).toBe(1000);
    });
  });

  describe('getPositionSummary()', () => {
    test('computes correct summary statistics', () => {
      const positionMap = {
        '01.01.0010': 5,
        '01.01.0020': 3,
        '01.01.0030': 8
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(16);
      expect(summary.uniquePositions).toBe(3);
      expect(summary.minQuantity).toBe(3);
      expect(summary.maxQuantity).toBe(8);
    });

    test('handles empty map', () => {
      const summary = getPositionSummary({});
      expect(summary.totalQuantity).toBe(0);
      expect(summary.uniquePositions).toBe(0);
      expect(summary.minQuantity).toBe(0);
      expect(summary.maxQuantity).toBe(0);
    });

    test('handles null or undefined input', () => {
      const summary1 = getPositionSummary(null);
      expect(summary1.totalQuantity).toBe(0);
      
      const summary2 = getPositionSummary(undefined);
      expect(summary2.totalQuantity).toBe(0);
    });

    test('handles map with single position', () => {
      const positionMap = { '01.01.0010': 5 };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(5);
      expect(summary.uniquePositions).toBe(1);
      expect(summary.minQuantity).toBe(5);
      expect(summary.maxQuantity).toBe(5);
    });

    test('ignores non-numeric values', () => {
      const positionMap = {
        '01.01.0010': 5,
        '01.01.0020': 'invalid',
        '01.01.0030': 3
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(8);
      expect(summary.uniquePositions).toBe(3); // All keys counted
    });
  });

  describe('validateExtractedPositions()', () => {
    test('validates normal positions as valid', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, row: 30 },
        { posNr: '01.01.0020', menge: 3, row: 31 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('detects duplicate position numbers', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, row: 30 },
        { posNr: '01.01.0010', menge: 3, row: 31 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('erscheint mehrfach');
    });

    test('detects negative quantities', () => {
      const positions = [
        { posNr: '01.01.0010', menge: -5, row: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('negative Menge');
    });

    test('detects invalid position number format', () => {
      const positions = [
        { posNr: 'INVALID', menge: 5, row: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('unerwartetes Format');
    });

    test('returns warning for empty array', () => {
      const result = validateExtractedPositions([]);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Keine Positionen');
    });

    test('handles invalid input (not an array)', () => {
      const result = validateExtractedPositions('not an array');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('kein Array');
    });

    test('detects invalid position object in array', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, row: 30 },
        null,
        { posNr: '01.01.0020', menge: 3, row: 32 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('kein Objekt'))).toBe(true);
    });
  });

  describe('parseProtokollMetadata()', () => {
    test('extracts metadata from valid workbook', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'U3': { v: 'PROT-001' },
            'N5': { v: 'ORD-001' },
            'A10': { v: 'Factory A' },
            'T10': { v: 'Building 1' },
            'T7': { v: 'Company Inc' },
            'A5': { v: 'Customer Corp' }
          }
        }
      };
      
      const metadata = parseProtokollMetadata(mockWorkbook);
      
      expect(metadata.protokollNr).toBe('PROT-001');
      expect(metadata.auftragsNr).toBe('ORD-001');
      expect(metadata.anlage).toBe('Factory A');
      expect(metadata.einsatzort).toBe('Building 1');
      expect(metadata.firma).toBe('Company Inc');
    });

    test('throws error if Vorlage sheet is missing', () => {
      const mockWorkbook = {
        Sheets: {}
      };
      
      expect(() => parseProtokollMetadata(mockWorkbook)).toThrow('Vorlage');
    });

    test('throws error on missing required fields', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'U3': { v: 'PROT-001' }
            // Missing required fields
          }
        }
      };
      
      expect(() => parseProtokollMetadata(mockWorkbook)).toThrow('Fehlende Pflichtfelder');
    });
  });

  describe('extractPositions()', () => {
    test('extracts positions from valid worksheet', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'A30': { v: '01.01.0010' },
            'X30': { v: 5 },
            'A31': { v: '01.01.0020' },
            'X31': { v: 3 }
          }
        }
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions.length).toBe(2);
      expect(positions[0].posNr).toBe('01.01.0010');
      expect(positions[0].menge).toBe(5);
      expect(positions[1].posNr).toBe('01.01.0020');
      expect(positions[1].menge).toBe(3);
    });

    test('throws error if Vorlage sheet is missing', () => {
      const mockWorkbook = {
        Sheets: {}
      };
      
      expect(() => extractPositions(mockWorkbook)).toThrow('Vorlage');
    });

    test('skips rows with missing position number', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'X30': { v: 5 }, // Missing position number
            'A31': { v: '01.01.0020' },
            'X31': { v: 3 }
          }
        }
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions.length).toBe(1);
      expect(positions[0].posNr).toBe('01.01.0020');
    });

    test('skips rows with non-numeric quantity', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'A30': { v: '01.01.0010' },
            'X30': { v: 'invalid' },
            'A31': { v: '01.01.0020' },
            'X31': { v: 3 }
          }
        }
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions.length).toBe(1);
      expect(positions[0].posNr).toBe('01.01.0020');
    });

    test('extracts position with non-standard format (fallback)', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'A30': { v: 'CustomPos-1' }, // Doesn't match pattern
            'X30': { v: 5 }
          }
        }
      };

      const positions = extractPositions(mockWorkbook);
      expect(positions[0].posNr).toBe('CustomPos-1');
    });
  });

  describe('fillAbrechnungHeader()', () => {
    test('writes metadata to correct cells', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {}
        }
      };
      
      const metadata = {
        datum: '2025-12-09',
        auftragsNr: 'ORD-001',
        anlage: 'Factory A',
        einsatzort: 'Building 1'
      };
      
      const result = fillAbrechnungHeader(mockWorkbook, metadata);
      
      expect(result.Sheets.EAW.B1).toBeDefined();
      expect(result.Sheets.EAW.B2).toBeDefined();
      expect(result.Sheets.EAW.B3).toBeDefined();
      expect(result.Sheets.EAW.B4).toBeDefined();
    });

    test('throws error if EAW sheet is missing', () => {
      const mockWorkbook = {
        Sheets: {}
      };
      
      const metadata = { datum: '2025-12-09', auftragsNr: 'ORD-001', anlage: 'Factory A', einsatzort: 'Building 1' };
      
      expect(() => fillAbrechnungHeader(mockWorkbook, metadata)).toThrow('EAW');
    });
  });

  describe('fillAbrechnungPositions()', () => {
    test('fills position quantities', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A9': { v: '01.01.0010' },
            'A10': { v: '01.01.0020' }
          }
        }
      };
      
      const positionSums = {
        '01.01.0010': 7,
        '01.01.0020': 3
      };
      
      const result = fillAbrechnungPositions(mockWorkbook, positionSums);
      
      expect(result.Sheets.EAW.B9).toBeDefined();
      expect(result.Sheets.EAW.B10).toBeDefined();
    });

    test('throws error if EAW sheet is missing', () => {
      const mockWorkbook = {
        Sheets: {}
      };
      
      const positionSums = { '01.01.0010': 7 };
      
      expect(() => fillAbrechnungPositions(mockWorkbook, positionSums)).toThrow('EAW');
    });
  });

  describe('Template caching', () => {
    test('clearAbrechnungTemplateCache clears the cache', () => {
      // Just verify the function exists and can be called
      expect(() => clearAbrechnungTemplateCache()).not.toThrow();
    });
  });

  describe('validateFilledPositions()', () => {
    test('returns valid result for workbook with EAW sheet', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A9': { v: '01.01.0010' },
            'B9': { v: 5 },
            'A10': { v: '01.01.0020' },
            'B10': { v: 3 }
          }
        }
      };
      
      const result = validateFilledPositions(mockWorkbook);
      
      expect(result.isValid).toBe(true);
      expect(result.filledCount).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid when EAW sheet is missing', () => {
      const mockWorkbook = {
        Sheets: {}
      };
      
      const result = validateFilledPositions(mockWorkbook);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('counts empty and filled positions correctly', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A9': { v: '01.01.0010' },
            'B9': { v: 5 },
            'A10': { v: '01.01.0020' }
            // B10 is missing - empty
          }
        }
      };
      
      const result = validateFilledPositions(mockWorkbook);
      
      expect(result.filledCount).toBeGreaterThanOrEqual(1);
      expect(typeof result.emptyCount).toBe('number');
    });
  });

  describe('generateExportFilename()', () => {
    test('generates filename with order number', () => {
      const filename = generateExportFilename('ORD-001');
      
      expect(filename).toContain('Abrechnung');
      expect(filename).toContain('ORD-001');
      expect(filename).toMatch(/\.xlsx$/);
    });

    test('includes timestamp in filename', () => {
      const filename = generateExportFilename('TEST');
      
      // Timestamp format: YYYY-MM-DD or similar
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    test('handles special characters in order number', () => {
      const filename = generateExportFilename('Test/Order');
      
      expect(filename).toBeDefined();
      expect(filename).toContain('Test/Order');
    });

    test('handles empty order number', () => {
      const filename = generateExportFilename('');
      
      expect(filename).toBeDefined();
      expect(filename).toMatch(/\.xlsx$/);
    });
  });

  describe('Metadata Cell Map Configuration', () => {
    afterEach(() => {
      resetMetadataCellMap();
    });

    test('updateMetadataCellMap updates field mapping', () => {
      updateMetadataCellMap('auftragsNr', ['A1', 'B1', 'C1']);
      
      const map = getMetadataCellMap();
      expect(map.auftragsNr).toEqual(['A1', 'B1', 'C1']);
    });

    test('getMetadataCellMap returns current configuration', () => {
      const map = getMetadataCellMap();
      
      expect(map).toBeDefined();
      expect(typeof map).toBe('object');
    });

    test('resetMetadataCellMap restores defaults', () => {
      const originalMap = getMetadataCellMap();
      updateMetadataCellMap('auftragsNr', ['Z99']);
      resetMetadataCellMap();
      
      const resetMap = getMetadataCellMap();
      expect(resetMap.auftragsNr).toEqual(originalMap.auftragsNr);
    });

    test('updateMetadataCellMap throws for invalid cellAddresses', () => {
      expect(() => updateMetadataCellMap('field', [])).toThrow();
      expect(() => updateMetadataCellMap('field', null)).toThrow();
      expect(() => updateMetadataCellMap('field', 'not-array')).toThrow();
    });

    test('getMetadataCellMap returns defensive copy', () => {
      const map1 = getMetadataCellMap();
      map1.testField = ['X1'];
      
      const map2 = getMetadataCellMap();
      expect(map2.testField).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('sumByPosition handles position with zero quantity', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 0 },
        { posNr: '01.01.0020', menge: 5 }
      ];
      
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010']).toBe(0);
      expect(result['01.01.0020']).toBe(5);
    });

    test('sumByPosition handles negative quantities', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 10 },
        { posNr: '01.01.0010', menge: -3 }
      ];
      
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010']).toBe(7);
    });

    test('getPositionSummary handles map with zero values', () => {
      const positionMap = {
        '01.01.0010': 0,
        '01.01.0020': 0
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(0);
      expect(summary.uniquePositions).toBe(2);
      expect(summary.minQuantity).toBe(0);
      expect(summary.maxQuantity).toBe(0);
    });

    test('validateExtractedPositions handles empty posNr string', () => {
      const positions = [
        { posNr: '', menge: 5, row: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('validateExtractedPositions handles zero quantity', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 0, row: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      
      // Zero is valid (not negative)
      expect(result.valid).toBe(true);
    });

    test('extractPositions handles sparse worksheet data', () => {
      const mockWorkbook = {
        Sheets: {
          'Vorlage': {
            'A30': { v: '01.01.0010' },
            'X30': { v: 5 },
            // Row 31 is completely empty
            'A32': { v: '01.01.0020' },
            'X32': { v: 3 }
          }
        }
      };
      
      const positions = extractPositions(mockWorkbook);
      
      expect(positions.length).toBe(2);
    });

    test('fillAbrechnungHeader handles undefined metadata values', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {}
        }
      };
      
      const metadata = {
        datum: undefined,
        auftragsNr: 'ORD-001',
        anlage: null,
        einsatzort: ''
      };
      
      expect(() => fillAbrechnungHeader(mockWorkbook, metadata)).not.toThrow();
    });

    test('fillAbrechnungPositions handles empty positionSums', () => {
      const mockWorkbook = {
        Sheets: {
          'EAW': {
            'A9': { v: '01.01.0010' }
          }
        }
      };
      
      const positionSums = {};
      
      expect(() => fillAbrechnungPositions(mockWorkbook, positionSums)).not.toThrow();
    });

    test('sumByPosition handles very long position numbers', () => {
      const positions = [
        { posNr: '01.01.0010.0001.0002.0003', menge: 5 },
        { posNr: '01.01.0010.0001.0002.0003', menge: 3 }
      ];
      
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010.0001.0002.0003']).toBe(8);
    });

    test('getPositionSummary handles very large quantities', () => {
      const positionMap = {
        '01.01.0010': Number.MAX_SAFE_INTEGER - 1,
        '01.01.0020': 1
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.maxQuantity).toBe(Number.MAX_SAFE_INTEGER - 1);
    });
  });

  describe('readExcelFile()', () => {
    let originalFileReader;

    beforeEach(() => {
      originalFileReader = global.FileReader;
    });

    afterEach(() => {
      global.FileReader = originalFileReader;
    });

    test('resolves with workbook and metadata on success', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);
      global.XLSX.read.mockReturnValue({ SheetNames: ['Sheet1'] });

      const file = new File([''], 'test.xlsx');
      const result = await readExcelFile(file);

      expect(result.workbook).toBeDefined();
      expect(result.metadata.fileName).toBe('test.xlsx');
      expect(global.XLSX.read).toHaveBeenCalled();
    });

    test('rejects if file is invalid type', async () => {
      const file = new File([''], 'test.txt');
      await expect(readExcelFile(file)).rejects.toThrow('Ungültiges Dateiformat');
    });

    test('rejects on file read error', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onerror();
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);

      const file = new File([''], 'test.xlsx');
      await expect(readExcelFile(file)).rejects.toThrow('Fehler beim Laden');
    });

    test('rejects if no file provided', async () => {
        await expect(readExcelFile(null)).rejects.toThrow('Keine Datei');
    });

    test('rejects if workbook has no sheets', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);
      global.XLSX.read.mockReturnValue({ SheetNames: [] });

      const file = new File([''], 'test.xlsx');
      await expect(readExcelFile(file)).rejects.toThrow('keine Arbeitsblätter');
    });

    test('rejects if XLSX reading throws', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);
      global.XLSX.read.mockImplementation(() => { throw new Error('XLSX Error'); });

      const file = new File([''], 'test.xlsx');
      await expect(readExcelFile(file)).rejects.toThrow('Fehler beim Lesen der Excel-Datei');
    });
  });

  describe('loadAbrechnungTemplate()', () => {
    beforeEach(() => {
        clearAbrechnungTemplateCache();
        global.fetch.mockClear();
    });

    test('fetches and caches template', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
        });
        global.XLSX.read.mockReturnValue({ SheetNames: ['EAW'] });

        await loadAbrechnungTemplate();
        expect(global.fetch).toHaveBeenCalledTimes(1);

        await loadAbrechnungTemplate();
        expect(global.fetch).toHaveBeenCalledTimes(1); // Should be cached
    });

    test('throws on network error', async () => {
        global.fetch.mockRejectedValue(new Error('Failed to fetch'));
        await expect(loadAbrechnungTemplate()).rejects.toThrow('Netzwerkfehler');
    });

    test('throws on 404', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });
        await expect(loadAbrechnungTemplate()).rejects.toThrow('nicht gefunden');
    });

    test('throws on 500', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error'
        });
        await expect(loadAbrechnungTemplate()).rejects.toThrow('Server-Fehler');
    });

    test('throws if template misses EAW sheet', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
        });
        global.XLSX.read.mockReturnValue({ SheetNames: ['WrongSheet'] });

        await expect(loadAbrechnungTemplate()).rejects.toThrow('Template-Arbeitsmappe fehlt "EAW"');
    });
  });

  describe('createExportWorkbook()', () => {
    beforeEach(() => {
        clearAbrechnungTemplateCache();
        global.fetch.mockResolvedValue({
            ok: true,
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
        });
        global.XLSX.read.mockReturnValue({
            SheetNames: ['EAW'],
            Sheets: { 'EAW': {} }
        });
    });

    test('creates export workbook successfully', async () => {
        const abrechnungData = {
            header: { date: '2023-01-01' },
            positionen: { '01.01.0010': 5 }
        };

        const wb = await createExportWorkbook(abrechnungData);
        expect(wb).toBeDefined();
        expect(wb.SheetNames).toContain('EAW');
    });

    test('throws if data is invalid', async () => {
        await expect(createExportWorkbook(null)).rejects.toThrow('Ungültige abrechnungData');
        await expect(createExportWorkbook({})).rejects.toThrow('Header oder Positionen fehlen');
    });

    test('handles template load failure', async () => {
        global.fetch.mockRejectedValue(new Error('Failed to fetch'));
        const abrechnungData = { header: {}, positionen: {} };
        await expect(createExportWorkbook(abrechnungData)).rejects.toThrow('Fehler beim Erstellen');
    });
  });

  describe('safeReadAndParseProtokoll()', () => {
     let originalFileReader;

    beforeEach(() => {
      originalFileReader = global.FileReader;
    });

    afterEach(() => {
      global.FileReader = originalFileReader;
    });

    test('returns success result on valid file', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);

      const mockWorkbook = {
          SheetNames: ['Vorlage'],
          Sheets: {
              'Vorlage': {
                  'U3': { v: 'P123' },
                  'N5': { v: 'O123' },
                  'A10': { v: 'Anlage' },
                  'T10': { v: 'Ort' },
                  'T7': { v: 'Firma' },
                  'A5': { v: 'AG' },
                  'A30': { v: '01.01.0010' },
                  'X30': { v: 5 }
              }
          }
      };
      global.XLSX.read.mockReturnValue(mockWorkbook);

      const file = new File([''], 'test.xlsx');
      const result = await safeReadAndParseProtokoll(file);

      expect(result.success).toBe(true);
      expect(result.metadata.protokollNr).toBe('P123');
      expect(result.positionen.length).toBe(1);
      expect(result.positionSums['01.01.0010']).toBe(5);
    });

    test('returns error on file read failure', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onerror();
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);

      const file = new File([''], 'test.xlsx');
      const result = await safeReadAndParseProtokoll(file);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Datei-Lesefehler');
    });

    test('returns error on metadata parse failure', async () => {
      const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);

      const mockWorkbook = {
          SheetNames: ['Vorlage'],
          Sheets: {
              'Vorlage': {
                  // Missing required fields
                  'U3': { v: 'P123' }
              }
          }
      };
      global.XLSX.read.mockReturnValue(mockWorkbook);

      const file = new File([''], 'test.xlsx');
      const result = await safeReadAndParseProtokoll(file);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Metadaten-Parsefehler');
    });


    test('collects validation warnings', async () => {
       const mockReader = {
        readAsArrayBuffer: jest.fn(function() {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }),
        onload: null,
        onerror: null
      };
      global.FileReader = jest.fn(() => mockReader);

      const mockWorkbook = {
          SheetNames: ['Vorlage'],
          Sheets: {
              'Vorlage': {
                  'U3': { v: 'P123' },
                  'N5': { v: 'O123' },
                  'A10': { v: 'Anlage' },
                  'T10': { v: 'Ort' },
                  'T7': { v: 'Firma' },
                  'A5': { v: 'AG' },
                  'A30': { v: '01.01.0010' },
                  'X30': { v: 5 },
                  'A31': { v: '01.01.0010' }, // Duplicate
                  'X31': { v: 3 }
              }
          }
      };
      global.XLSX.read.mockReturnValue(mockWorkbook);

      const file = new File([''], 'test.xlsx');
      const result = await safeReadAndParseProtokoll(file);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('erscheint mehrfach');
    });
  });

  describe('exportToExcel()', () => {
    test('calls XLSX.writeFile with correct arguments', () => {
        const wb = { SheetNames: ['Test'] };
        const metadata = { orderNumber: '123' };

        exportToExcel(wb, metadata);

        expect(global.XLSX.writeFile).toHaveBeenCalledWith(
            wb,
            expect.stringContaining('Abrechnung_123'),
            expect.objectContaining({ bookType: 'xlsx' })
        );
    });

    test('handles string metadata as filename', () => {
        const wb = { SheetNames: ['Test'] };
        exportToExcel(wb, 'manual_name.xlsx');

        expect(global.XLSX.writeFile).toHaveBeenCalledWith(
            wb,
            'manual_name.xlsx',
            expect.any(Object)
        );
    });

    test('throws on write error', () => {
        global.XLSX.writeFile.mockImplementation(() => { throw new Error('Write failed'); });
        expect(() => exportToExcel({}, {})).toThrow('Fehler beim Exportieren');
    });
  });

  describe('Flexible Metadata Search', () => {
    test('finds metadata by pattern when strict mode is false', () => {
        const mockWorkbook = {
            Sheets: {
                'Vorlage': {
                    'A1': { v: 'Auftrags-Nr.:' }, // Label
                    'B1': { v: 'FOUND-123' },     // Value next to it
                    // Others in default locations
                    'U3': { v: 'P1' },
                    'A10': { v: 'An' },
                    'T10': { v: 'Ei' },
                    'T7': { v: 'Fi' },
                    'A5': { v: 'Ag' }
                }
            }
        };

        const metadata = parseProtokollMetadata(mockWorkbook, { strictMode: false });

        expect(metadata.auftragsNr).toBe('FOUND-123');
    });

    test('prioritizes configured cells over pattern search', () => {
        const mockWorkbook = {
            Sheets: {
                'Vorlage': {
                    'N5': { v: 'PRIORITY-123' }, // Default location
                    'A1': { v: 'Auftrags-Nr.:' },
                    'B1': { v: 'PATTERN-456' }
                }
            }
        };
        // Fill other required fields
        mockWorkbook.Sheets.Vorlage['U3'] = { v: 'P1' };
        mockWorkbook.Sheets.Vorlage['A10'] = { v: 'An' };
        mockWorkbook.Sheets.Vorlage['T10'] = { v: 'Ei' };
        mockWorkbook.Sheets.Vorlage['T7'] = { v: 'Fi' };
        mockWorkbook.Sheets.Vorlage['A5'] = { v: 'Ag' };

        const metadata = parseProtokollMetadata(mockWorkbook, { strictMode: false });

        expect(metadata.auftragsNr).toBe('PRIORITY-123');
    });

    test('ignores label if adjacent cell is also a label (pattern match)', () => {
         const mockWorkbook = {
            Sheets: {
                'Vorlage': {
                    'A1': { v: 'Auftrags-Nr.:' },
                    'B1': { v: 'Auftrags-Nr.:' }, // Matches pattern too
                    'C1': { v: 'REAL-VALUE' }
                }
            }
        };
        // Fill other required fields
        mockWorkbook.Sheets.Vorlage['U3'] = { v: 'P1' };
        mockWorkbook.Sheets.Vorlage['A10'] = { v: 'An' };
        mockWorkbook.Sheets.Vorlage['T10'] = { v: 'Ei' };
        mockWorkbook.Sheets.Vorlage['T7'] = { v: 'Fi' };
        mockWorkbook.Sheets.Vorlage['A5'] = { v: 'Ag' };

        const metadata = parseProtokollMetadata(mockWorkbook, { strictMode: false });
        expect(metadata.auftragsNr).toBe('REAL-VALUE');
    });
  });

});
