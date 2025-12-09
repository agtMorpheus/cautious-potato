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
  clearAbrechnungTemplateCache
} from '../../js/utils.js';

describe('Utility Functions (utils.js)', () => {
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
});
