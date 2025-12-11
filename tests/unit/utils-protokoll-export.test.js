/**
 * Unit Tests for Protokoll Export Utility Functions (utils-protokoll-export.js)
 * Tests Excel protokoll export functionality
 */

import {
  fillProtokollGrunddaten,
  setProtokollCheckboxes,
  setProtokollResults,
  fillProtokollMeasurements,
  fillProtokollMessgeraete,
  validateProtokollData,
  generateProtokollFilename
} from '../../js/utils-protokoll-export.js';

// Mock config
jest.mock('../../js/config.js', () => ({
  PROTOKOLL_CONFIG: {
    templatePath: 'templates/protokoll.xlsx',
    sheetName: 'Protokoll',
    sections: {
      grunddaten: {
        protokollNr: 'A1',
        auftragsNr: 'A2',
        anlage: 'A3',
        datum: 'A4'
      },
      pruefenNach: {
        dinVde0100: 'B1',
        dinVde0105: 'B2'
      },
      pruefungsart: {
        neuanlage: 'C1',
        erweiterung: 'C2'
      },
      netzinfo: {
        tnS: 'D1',
        tnC: 'D2'
      },
      besichtigung: {
        auswahlBetriebsmittel: { io: 'E1', nio: 'F1' },
        brandabschottungen: { io: 'E2', nio: 'F2' }
      },
      erproben: {
        funktionspruefung: { io: 'G1', nio: 'H1' },
        rcdTest: { io: 'G2', nio: 'H2' }
      },
      messgeraete: {
        fabrikat: 'I1',
        typ: 'I2',
        identNr: 'I3'
      },
      messen: {
        durchgaengigkeit: 'J1'
      },
      pruefungsergebnis: {
        keineMaengel: 'K1'
      },
      pruefplakette: {
        ja: 'L1'
      },
      weitereInfo: {
        bemerkung: 'M1'
      }
    },
    measurements: {
      pages: [
        { startRow: 10, endRow: 20 },
        { startRow: 30, endRow: 40 }
      ],
      columns: {
        stromkreis: 'A',
        riso: 'B',
        zs: 'C',
        ia: 'D'
      }
    }
  }
}));

describe('Protokoll Export Utilities (utils-protokoll-export.js)', () => {
  // Mock ExcelJS workbook
  const createMockWorkbook = () => {
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
      getWorksheet: jest.fn((name) => {
        if (name === 'Protokoll' || name === 1) {
          return worksheet;
        }
        return null;
      }),
      _worksheet: worksheet
    };
  };

  describe('fillProtokollGrunddaten()', () => {
    test('fills grunddaten fields in worksheet', () => {
      const workbook = createMockWorkbook();
      const grunddaten = {
        protokollNr: 'PROT-001',
        auftragsNr: 'ORD-001',
        anlage: 'Test Plant',
        datum: '2025-01-01'
      };
      
      fillProtokollGrunddaten(workbook, grunddaten);
      
      expect(workbook._worksheet._cells['A1'].value).toBe('PROT-001');
      expect(workbook._worksheet._cells['A2'].value).toBe('ORD-001');
      expect(workbook._worksheet._cells['A3'].value).toBe('Test Plant');
      expect(workbook._worksheet._cells['A4'].value).toBe('2025-01-01');
    });

    test('skips undefined values', () => {
      const workbook = createMockWorkbook();
      const grunddaten = {
        protokollNr: 'PROT-001'
      };
      
      fillProtokollGrunddaten(workbook, grunddaten);
      
      expect(workbook._worksheet._cells['A1'].value).toBe('PROT-001');
      expect(workbook._worksheet._cells['A2']).toBeUndefined();
    });

    test('skips null values', () => {
      const workbook = createMockWorkbook();
      const grunddaten = {
        protokollNr: 'PROT-001',
        auftragsNr: null
      };
      
      fillProtokollGrunddaten(workbook, grunddaten);
      
      expect(workbook._worksheet._cells['A1'].value).toBe('PROT-001');
    });

    test('throws error if worksheet not found', () => {
      const workbook = { getWorksheet: jest.fn(() => null) };
      
      expect(() => fillProtokollGrunddaten(workbook, {})).toThrow('Protokoll worksheet nicht gefunden');
    });

    test('uses first worksheet as fallback', () => {
      const cells = {};
      const worksheet = {
        getCell: jest.fn((address) => {
          if (!cells[address]) cells[address] = { value: null };
          return cells[address];
        }),
        _cells: cells
      };
      const workbook = {
        getWorksheet: jest.fn((name) => name === 1 ? worksheet : null),
        _worksheet: worksheet
      };
      
      fillProtokollGrunddaten(workbook, { protokollNr: 'TEST' });
      
      expect(cells['A1'].value).toBe('TEST');
    });
  });

  describe('setProtokollCheckboxes()', () => {
    test('sets checked checkboxes with ☑ symbol', () => {
      const workbook = createMockWorkbook();
      const checkboxData = {
        dinVde0100: true,
        dinVde0105: false
      };
      
      setProtokollCheckboxes(workbook, checkboxData, 'pruefenNach');
      
      expect(workbook._worksheet._cells['B1'].value).toBe('☑');
      expect(workbook._worksheet._cells['B2'].value).toBe('○');
    });

    test('sets unchecked checkboxes with ○ symbol', () => {
      const workbook = createMockWorkbook();
      const checkboxData = {
        neuanlage: false,
        erweiterung: false
      };
      
      setProtokollCheckboxes(workbook, checkboxData, 'pruefungsart');
      
      expect(workbook._worksheet._cells['C1'].value).toBe('○');
      expect(workbook._worksheet._cells['C2'].value).toBe('○');
    });

    test('throws error for unknown section', () => {
      const workbook = createMockWorkbook();
      
      expect(() => setProtokollCheckboxes(workbook, {}, 'unknownSection')).toThrow('Unknown protokoll section');
    });

    test('handles mixed checkbox states', () => {
      const workbook = createMockWorkbook();
      const checkboxData = {
        neuanlage: true,
        erweiterung: false
      };
      
      setProtokollCheckboxes(workbook, checkboxData, 'pruefungsart');
      
      expect(workbook._worksheet._cells['C1'].value).toBe('☑');
      expect(workbook._worksheet._cells['C2'].value).toBe('○');
    });
  });

  describe('setProtokollResults()', () => {
    test('sets io result correctly', () => {
      const workbook = createMockWorkbook();
      const results = {
        auswahlBetriebsmittel: 'io'
      };
      
      setProtokollResults(workbook, results, 'besichtigung');
      
      expect(workbook._worksheet._cells['E1'].value).toBe('☑');
      expect(workbook._worksheet._cells['F1'].value).toBe('○');
    });

    test('sets nio result correctly', () => {
      const workbook = createMockWorkbook();
      const results = {
        auswahlBetriebsmittel: 'nio'
      };
      
      setProtokollResults(workbook, results, 'besichtigung');
      
      expect(workbook._worksheet._cells['E1'].value).toBe('○');
      expect(workbook._worksheet._cells['F1'].value).toBe('☑');
    });

    test('clears both cells for null result', () => {
      const workbook = createMockWorkbook();
      const results = {
        auswahlBetriebsmittel: null
      };
      
      setProtokollResults(workbook, results, 'besichtigung');
      
      // Should not set any values for null
      expect(workbook._worksheet.getCell).not.toHaveBeenCalledWith('E1');
    });

    test('handles erproben section', () => {
      const workbook = createMockWorkbook();
      const results = {
        funktionspruefung: 'io',
        rcdTest: 'nio'
      };
      
      setProtokollResults(workbook, results, 'erproben');
      
      expect(workbook._worksheet._cells['G1'].value).toBe('☑');
      expect(workbook._worksheet._cells['H1'].value).toBe('○');
      expect(workbook._worksheet._cells['G2'].value).toBe('○');
      expect(workbook._worksheet._cells['H2'].value).toBe('☑');
    });

    test('throws error for unknown section', () => {
      const workbook = createMockWorkbook();
      
      expect(() => setProtokollResults(workbook, {}, 'unknownSection')).toThrow('Unknown protokoll section');
    });
  });

  describe('fillProtokollMeasurements()', () => {
    test('fills measurements in correct rows and columns', () => {
      const workbook = createMockWorkbook();
      const measurements = [
        { stromkreis: 'SK1', riso: 500, zs: 0.5, ia: 1.5 },
        { stromkreis: 'SK2', riso: 600, zs: 0.4, ia: 1.6 }
      ];
      
      fillProtokollMeasurements(workbook, measurements);
      
      expect(workbook._worksheet._cells['A10'].value).toBe('SK1');
      expect(workbook._worksheet._cells['B10'].value).toBe(500);
      expect(workbook._worksheet._cells['A11'].value).toBe('SK2');
      expect(workbook._worksheet._cells['B11'].value).toBe(600);
    });

    test('handles null measurements array', () => {
      const workbook = createMockWorkbook();
      
      expect(() => fillProtokollMeasurements(workbook, null)).not.toThrow();
    });

    test('handles undefined measurements array', () => {
      const workbook = createMockWorkbook();
      
      expect(() => fillProtokollMeasurements(workbook, undefined)).not.toThrow();
    });

    test('handles empty measurements array', () => {
      const workbook = createMockWorkbook();
      
      expect(() => fillProtokollMeasurements(workbook, [])).not.toThrow();
    });

    test('handles non-array input', () => {
      const workbook = createMockWorkbook();
      
      expect(() => fillProtokollMeasurements(workbook, 'not an array')).not.toThrow();
    });

    test('skips undefined values in measurements', () => {
      const workbook = createMockWorkbook();
      const measurements = [
        { stromkreis: 'SK1', riso: undefined }
      ];
      
      fillProtokollMeasurements(workbook, measurements);
      
      expect(workbook._worksheet._cells['A10'].value).toBe('SK1');
      expect(workbook._worksheet._cells['B10']).toBeUndefined();
    });

    test('fills across multiple pages', () => {
      const workbook = createMockWorkbook();
      // Create more than one page worth of measurements
      const measurements = [];
      for (let i = 0; i < 15; i++) {
        measurements.push({ stromkreis: `SK${i}`, riso: 500 + i });
      }
      
      fillProtokollMeasurements(workbook, measurements);
      
      // First page ends at row 20
      expect(workbook._worksheet._cells['A10'].value).toBe('SK0');
      expect(workbook._worksheet._cells['A20'].value).toBe('SK10');
      // Second page starts at row 30
      expect(workbook._worksheet._cells['A30'].value).toBe('SK11');
    });
  });

  describe('fillProtokollMessgeraete()', () => {
    test('fills messgeraete information', () => {
      const workbook = createMockWorkbook();
      const messgeraete = {
        fabrikat: 'Fluke',
        typ: 'Model 1653B',
        identNr: 'IDENT-001'
      };
      
      fillProtokollMessgeraete(workbook, messgeraete);
      
      expect(workbook._worksheet._cells['I1'].value).toBe('Fluke');
      expect(workbook._worksheet._cells['I2'].value).toBe('Model 1653B');
      expect(workbook._worksheet._cells['I3'].value).toBe('IDENT-001');
    });

    test('skips undefined values', () => {
      const workbook = createMockWorkbook();
      const messgeraete = {
        fabrikat: 'Fluke'
      };
      
      fillProtokollMessgeraete(workbook, messgeraete);
      
      expect(workbook._worksheet._cells['I1'].value).toBe('Fluke');
      expect(workbook._worksheet._cells['I2']).toBeUndefined();
    });
  });

  describe('validateProtokollData()', () => {
    test('returns invalid for null input', () => {
      const result = validateProtokollData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Protokoll data must be an object');
    });

    test('returns invalid for non-object input', () => {
      const result = validateProtokollData('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Protokoll data must be an object');
    });

    test('returns invalid for missing grunddaten', () => {
      const result = validateProtokollData({});
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('grunddaten'))).toBe(true);
    });

    test('returns warnings for missing recommended fields', () => {
      const result = validateProtokollData({
        grunddaten: {}
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('protokollNr'))).toBe(true);
      expect(result.warnings.some(w => w.includes('auftragsNr'))).toBe(true);
      expect(result.warnings.some(w => w.includes('anlage'))).toBe(true);
    });

    test('returns invalid for non-array measurements', () => {
      const result = validateProtokollData({
        grunddaten: { protokollNr: 'P001' },
        measurements: 'not an array'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Measurements must be an array');
    });

    test('returns warning for too many measurements', () => {
      const measurements = new Array(150).fill({ stromkreis: 'SK1' });
      const result = validateProtokollData({
        grunddaten: { protokollNr: 'P001', auftragsNr: 'O001', anlage: 'Plant' },
        measurements
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('too many') || w.includes('truncated'))).toBe(true);
    });

    test('returns valid for complete data', () => {
      const result = validateProtokollData({
        grunddaten: {
          protokollNr: 'PROT-001',
          auftragsNr: 'ORD-001',
          anlage: 'Test Plant'
        },
        measurements: [
          { stromkreis: 'SK1', riso: 500 }
        ]
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('accepts data without measurements', () => {
      const result = validateProtokollData({
        grunddaten: {
          protokollNr: 'PROT-001',
          auftragsNr: 'ORD-001',
          anlage: 'Test Plant'
        }
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('generateProtokollFilename()', () => {
    test('generates filename with protokollNr', () => {
      const filename = generateProtokollFilename({ protokollNr: 'PROT-001' });
      
      expect(filename).toMatch(/^Protokoll_PROT-001_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    test('generates filename with auftragsNr as fallback', () => {
      const filename = generateProtokollFilename({ auftragsNr: 'ORD-001' });
      
      expect(filename).toMatch(/^Protokoll_ORD-001_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    test('generates filename with timestamp only when no identifiers', () => {
      const filename = generateProtokollFilename({});
      
      expect(filename).toMatch(/^Protokoll_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    test('generates filename with timestamp only for null input', () => {
      const filename = generateProtokollFilename(null);
      
      expect(filename).toMatch(/^Protokoll_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    test('generates filename with timestamp only for undefined input', () => {
      const filename = generateProtokollFilename(undefined);
      
      expect(filename).toMatch(/^Protokoll_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    test('prefers protokollNr over auftragsNr', () => {
      const filename = generateProtokollFilename({
        protokollNr: 'PROT-001',
        auftragsNr: 'ORD-001'
      });
      
      expect(filename).toContain('PROT-001');
      expect(filename).not.toContain('ORD-001');
    });
  });
});
