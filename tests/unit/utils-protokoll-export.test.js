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
  generateProtokollFilename,
  loadProtokollTemplate,
  createProtokollWorkbook,
  exportProtokollToExcel,
  createAndExportProtokoll
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

// Setup Globals
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();
global.Blob = jest.fn();

// Mock DOM elements
const mockLink = {
  href: '',
  download: '',
  click: jest.fn()
};
document.createElement = jest.fn().mockReturnValue(mockLink);

// Mock ExcelJS
const mockWorksheet = {
  getCell: jest.fn(),
  _cells: {}
};

const mockWorkbook = {
  xlsx: {
    load: jest.fn().mockResolvedValue(),
    writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
  },
  getWorksheet: jest.fn()
};

global.ExcelJS = {
  Workbook: jest.fn().mockImplementation(() => mockWorkbook)
};

describe('Protokoll Export Utilities (utils-protokoll-export.js)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
     // Reset worksheet mock behavior
    mockWorksheet._cells = {};
    mockWorksheet.getCell.mockImplementation((address) => {
      if (!mockWorksheet._cells[address]) {
        mockWorksheet._cells[address] = { value: null };
      }
      return mockWorksheet._cells[address];
    });

    // Reset workbook mock behavior
    mockWorkbook.getWorksheet.mockImplementation((name) => {
      if (name === 'Protokoll' || name === 1) return mockWorksheet;
      return null;
    });

    // Reset fetch
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      status: 200,
      statusText: 'OK'
    });

    // Reset workbook writeBuffer
    mockWorkbook.xlsx.writeBuffer.mockResolvedValue(new ArrayBuffer(8));
  });

  describe('loadProtokollTemplate()', () => {
    test('loads template successfully', async () => {
      const wb = await loadProtokollTemplate();
      
      expect(global.fetch).toHaveBeenCalledWith('templates/protokoll.xlsx');
      expect(global.ExcelJS.Workbook).toHaveBeenCalled();
      expect(mockWorkbook.xlsx.load).toHaveBeenCalled();
      expect(wb).toBe(mockWorkbook);
    });

    test('throws error on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      await expect(loadProtokollTemplate()).rejects.toThrow('Fehler beim Laden');
    });

    test('throws error on non-ok response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      await expect(loadProtokollTemplate()).rejects.toThrow('HTTP 404');
    });
  });

  describe('fillProtokollGrunddaten()', () => {
    test('fills grunddaten fields in worksheet', () => {
      const grunddaten = {
        protokollNr: 'PROT-001',
        auftragsNr: 'ORD-001',
        anlage: 'Test Plant',
        datum: '2025-01-01'
      };
      
      fillProtokollGrunddaten(mockWorkbook, grunddaten);
      
      expect(mockWorksheet._cells['A1'].value).toBe('PROT-001');
      expect(mockWorksheet._cells['A2'].value).toBe('ORD-001');
      expect(mockWorksheet._cells['A3'].value).toBe('Test Plant');
      expect(mockWorksheet._cells['A4'].value).toBe('2025-01-01');
    });

     test('throws error if worksheet not found', () => {
      mockWorkbook.getWorksheet.mockReturnValue(null);
      
      expect(() => fillProtokollGrunddaten(mockWorkbook, {})).toThrow('Protokoll worksheet nicht gefunden');
    });

    test('ignores extra fields not in mapping', () => {
      const grunddaten = {
        protokollNr: 'PROT-001',
        extraField: 'should be ignored'
      };
      
      fillProtokollGrunddaten(mockWorkbook, grunddaten);
      
      expect(mockWorksheet._cells['A1'].value).toBe('PROT-001');
    });
  });

  // ... (keeping existing tests for setProtokollCheckboxes, setProtokollResults, etc. but adapting to use mockWorkbook/mockWorksheet)

  describe('setProtokollCheckboxes()', () => {
    test('sets checked checkboxes with ☑ symbol', () => {
      const checkboxData = {
        dinVde0100: true,
        dinVde0105: false
      };
      
      setProtokollCheckboxes(mockWorkbook, checkboxData, 'pruefenNach');
      
      expect(mockWorksheet._cells['B1'].value).toBe('☑');
      expect(mockWorksheet._cells['B2'].value).toBe('○');
    });

    test('throws error for unknown section', () => {
      expect(() => setProtokollCheckboxes(mockWorkbook, {}, 'unknownSection')).toThrow('Unknown protokoll section');
    });

    test('ignores extra fields not in mapping', () => {
      const checkboxData = {
        neuanlage: true,
        extra: true
      };
      
      setProtokollCheckboxes(mockWorkbook, checkboxData, 'pruefungsart');
      
      expect(mockWorksheet._cells['C1'].value).toBe('☑');
    });
  });

  describe('setProtokollResults()', () => {
    test('sets io result correctly', () => {
      const results = {
        auswahlBetriebsmittel: 'io'
      };
      
      setProtokollResults(mockWorkbook, results, 'besichtigung');
      
      expect(mockWorksheet._cells['E1'].value).toBe('☑');
      expect(mockWorksheet._cells['F1'].value).toBe('○');
    });

    test('throws error for unknown section', () => {
      expect(() => setProtokollResults(mockWorkbook, {}, 'unknownSection')).toThrow('Unknown protokoll section');
    });

    test('ignores extra fields not in mapping', () => {
      const results = {
        funktionspruefung: 'io',
        extra: 'io'
      };
      
      setProtokollResults(mockWorkbook, results, 'erproben');
      
      expect(mockWorksheet._cells['G1'].value).toBe('☑');
    });
  });

  describe('fillProtokollMeasurements()', () => {
    test('fills measurements in correct rows and columns', () => {
      const measurements = [
        { stromkreis: 'SK1', riso: 500, zs: 0.5, ia: 1.5 },
        { stromkreis: 'SK2', riso: 600, zs: 0.4, ia: 1.6 }
      ];
      
      fillProtokollMeasurements(mockWorkbook, measurements);
      
      expect(mockWorksheet._cells['A10'].value).toBe('SK1');
      expect(mockWorksheet._cells['B10'].value).toBe(500);
      expect(mockWorksheet._cells['A11'].value).toBe('SK2');
      expect(mockWorksheet._cells['B11'].value).toBe(600);
    });

    test('handles empty input gracefully', () => {
        expect(() => fillProtokollMeasurements(mockWorkbook, null)).not.toThrow();
    });
  });

  describe('fillProtokollMessgeraete()', () => {
    test('fills messgeraete information', () => {
      const messgeraete = {
        fabrikat: 'Fluke',
        typ: 'Model 1653B',
        identNr: 'IDENT-001'
      };
      
      fillProtokollMessgeraete(mockWorkbook, messgeraete);
      
      expect(mockWorksheet._cells['I1'].value).toBe('Fluke');
      expect(mockWorksheet._cells['I2'].value).toBe('Model 1653B');
      expect(mockWorksheet._cells['I3'].value).toBe('IDENT-001');
    });
  });

  describe('createProtokollWorkbook()', () => {
      test('creates and fills workbook with all sections', async () => {
          const protokollData = {
              grunddaten: { protokollNr: 'P1' },
              pruefenNach: { dinVde0100: true },
              pruefungsart: { neuanlage: true },
              netzform: { tnS: true },
              besichtigung: { auswahlBetriebsmittel: 'io' },
              erproben: { funktionspruefung: 'io' },
              measurements: [{ stromkreis: 'SK1' }],
              messgeraete: { fabrikat: 'F1' },
              messen: { durchgaengigkeit: true },
              weitereInfo: { bemerkung: 'Bem' }
          };

          const wb = await createProtokollWorkbook(protokollData);

          expect(wb).toBe(mockWorkbook);
          expect(mockWorksheet._cells['A1'].value).toBe('P1'); // Grunddaten
          expect(mockWorksheet._cells['B1'].value).toBe('☑'); // pruefenNach
          expect(mockWorksheet._cells['C1'].value).toBe('☑'); // pruefungsart
          expect(mockWorksheet._cells['D1'].value).toBe('☑'); // netzform
          expect(mockWorksheet._cells['E1'].value).toBe('☑'); // besichtigung
          expect(mockWorksheet._cells['G1'].value).toBe('☑'); // erproben
          expect(mockWorksheet._cells['A10'].value).toBe('SK1'); // measurements
          expect(mockWorksheet._cells['I1'].value).toBe('F1'); // messgeraete
          expect(mockWorksheet._cells['J1'].value).toBe('☑'); // messen
          expect(mockWorksheet._cells['M1'].value).toBe('Bem'); // weitereInfo
      });

      test('throws for invalid data', async () => {
          await expect(createProtokollWorkbook(null)).rejects.toThrow('Ungültige protokollData');
      });

      test('handles missing sections gracefully', async () => {
          const wb = await createProtokollWorkbook({ grunddaten: { protokollNr: 'P1' } });
          expect(wb).toBe(mockWorkbook);
          expect(mockWorksheet._cells['A1'].value).toBe('P1');
      });

      test('handles empty data object', async () => {
        const wb = await createProtokollWorkbook({});
        expect(wb).toBe(mockWorkbook);
      });
  });

  describe('exportProtokollToExcel()', () => {
      test('exports workbook successfully', async () => {
          const result = await exportProtokollToExcel(mockWorkbook, 'test.xlsx');

          expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
          expect(global.URL.createObjectURL).toHaveBeenCalled();
          expect(mockLink.click).toHaveBeenCalled();
          expect(result.fileName).toBe('test.xlsx');
      });

      test('generates filename if missing', async () => {
          const result = await exportProtokollToExcel(mockWorkbook);

          expect(result.fileName).toMatch(/^Protokoll_.*\.xlsx$/);
      });

      test('throws on export failure', async () => {
          mockWorkbook.xlsx.writeBuffer.mockRejectedValue(new Error('Write failed'));
          await expect(exportProtokollToExcel(mockWorkbook)).rejects.toThrow('Fehler beim Exportieren');
      });
  });

  describe('createAndExportProtokoll()', () => {
      test('orchestrates full workflow', async () => {
          const protokollData = { grunddaten: { protokollNr: 'P1' } };
          const result = await createAndExportProtokoll(protokollData, 'test.xlsx');

          expect(global.fetch).toHaveBeenCalled();
          expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
          expect(result.fileName).toBe('test.xlsx');
      });

      test('handles failure', async () => {
          global.fetch.mockRejectedValue(new Error('Fail'));
          await expect(createAndExportProtokoll({}, 'test.xlsx')).rejects.toThrow('Protokoll export failed');
      });
  });

  describe('validateProtokollData()', () => {
      // ... existing validation tests ...
    test('returns invalid for null input', () => {
      const result = validateProtokollData(null);
      expect(result.valid).toBe(false);
    });
    // ...
  });

  describe('generateProtokollFilename()', () => {
      // ... existing filename tests ...
      test('generates filename with protokollNr', () => {
        const filename = generateProtokollFilename({ protokollNr: 'PROT-001' });
        expect(filename).toContain('PROT-001');
      });
  });

});
