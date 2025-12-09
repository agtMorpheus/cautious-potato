/**
 * protokoll-exporter.test.js
 * Unit tests for the Protokoll Exporter module
 */

import * as exporter from '../../js/protokoll/protokoll-exporter.js';
import * as state from '../../js/protokoll/protokoll-state.js';
import * as validator from '../../js/protokoll/protokoll-validator.js';

// Mock XLSX global
global.XLSX = {
  read: jest.fn(),
  write: jest.fn(() => new Uint8Array([1, 2, 3])),
  utils: {}
};

// Mock fetch
global.fetch = jest.fn();

// Mock URL
global.URL = {
  createObjectURL: jest.fn(() => 'blob:test'),
  revokeObjectURL: jest.fn()
};

// Mock document.body for appendChild/removeChild
const originalAppendChild = document.body.appendChild;
const originalRemoveChild = document.body.removeChild;

describe('Protokoll Exporter', () => {
  beforeEach(() => {
    // Clear state
    localStorage.clear();
    state.reset();
    state.init();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup document.body mocks
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  afterEach(() => {
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  // ========== CONFIGURATION ==========
  describe('Configuration', () => {
    test('TEMPLATE_PATHS should have protokoll and abrechnung paths', () => {
      expect(exporter.TEMPLATE_PATHS.protokoll).toBe('/templates/protokoll.xlsx');
      expect(exporter.TEMPLATE_PATHS.abrechnung).toBe('/templates/abrechnung.xlsx');
    });

    test('CELL_MAPPING should have protokoll mappings', () => {
      expect(exporter.CELL_MAPPING.protokoll).toBeDefined();
      expect(exporter.CELL_MAPPING.protokoll['metadata.protokollNumber']).toBe('U3');
    });

    test('CELL_MAPPING should have abrechnung mappings', () => {
      expect(exporter.CELL_MAPPING.abrechnung).toBeDefined();
      expect(exporter.CELL_MAPPING.abrechnung['metadata.protokollNumber']).toBe('D2');
    });
  });

  // ========== AGGREGATION ==========
  describe('aggregatePositions()', () => {
    test('should aggregate positions by zielbezeichnung', () => {
      const positions = [
        { zielbezeichnung: 'Circuit A' },
        { zielbezeichnung: 'Circuit A' },
        { zielbezeichnung: 'Circuit B' }
      ];
      
      const result = exporter.aggregatePositions(positions);
      
      expect(result.length).toBe(2);
      expect(result.find(r => r.positionType === 'Circuit A').quantity).toBe(2);
      expect(result.find(r => r.positionType === 'Circuit B').quantity).toBe(1);
    });

    test('should handle empty positions array', () => {
      const result = exporter.aggregatePositions([]);
      expect(result).toEqual([]);
    });

    test('should handle single position', () => {
      const positions = [{ zielbezeichnung: 'Single Circuit' }];
      const result = exporter.aggregatePositions(positions);
      
      expect(result.length).toBe(1);
      expect(result[0].positionType).toBe('Single Circuit');
      expect(result[0].quantity).toBe(1);
    });
  });

  // ========== CELL VALUE ==========
  describe('setCellValue()', () => {
    test('should set string value correctly', () => {
      const sheet = {};
      exporter.setCellValue(sheet, 'A1', 'Test String');
      
      expect(sheet.A1.v).toBe('Test String');
      expect(sheet.A1.t).toBe('s');
    });

    test('should set number value correctly', () => {
      const sheet = {};
      exporter.setCellValue(sheet, 'B1', 42);
      
      expect(sheet.B1.v).toBe(42);
      expect(sheet.B1.t).toBe('n');
    });

    test('should set boolean value correctly', () => {
      const sheet = {};
      exporter.setCellValue(sheet, 'C1', true);
      
      expect(sheet.C1.v).toBe(true);
      expect(sheet.C1.t).toBe('b');
    });

    test('should set date value correctly', () => {
      const sheet = {};
      const date = new Date('2025-01-15');
      exporter.setCellValue(sheet, 'D1', date);
      
      expect(sheet.D1.t).toBe('d');
      expect(sheet.D1.v).toBe('2025-01-15');
    });

    test('should create cell if not exists', () => {
      const sheet = {};
      exporter.setCellValue(sheet, 'E1', 'Value');
      
      expect(sheet.E1).toBeDefined();
    });

    test('should update existing cell', () => {
      const sheet = { F1: { v: 'Old', t: 's' } };
      exporter.setCellValue(sheet, 'F1', 'New');
      
      expect(sheet.F1.v).toBe('New');
    });
  });

  // ========== FILENAME GENERATION ==========
  describe('generateFilename()', () => {
    test('should generate protokoll filename with number and date', () => {
      const formData = {
        metadata: { protokollNumber: 'ABC123' }
      };
      
      const filename = exporter.generateFilename('protokoll', formData);
      
      expect(filename).toContain('Protokoll_');
      expect(filename).toContain('ABC123');
      expect(filename).toContain('.xlsx');
    });

    test('should generate abrechnung filename', () => {
      const formData = {
        metadata: { protokollNumber: 'DEF456' }
      };
      
      const filename = exporter.generateFilename('abrechnung', formData);
      
      expect(filename).toContain('Abrechnung_');
      expect(filename).toContain('DEF456');
      expect(filename).toContain('.xlsx');
    });

    test('should use fallback when protokollNumber is missing', () => {
      const formData = {
        metadata: {}
      };
      
      const filename = exporter.generateFilename('protokoll', formData);
      
      expect(filename).toContain('protokoll');
      expect(filename).toContain('.xlsx');
    });

    test('should include current date in filename', () => {
      const formData = {
        metadata: { protokollNumber: 'TEST' }
      };
      
      const filename = exporter.generateFilename('protokoll', formData);
      const today = new Date().toISOString().split('T')[0];
      
      expect(filename).toContain(today);
    });
  });

  // ========== FILL TEMPLATE ==========
  describe('fillProtokollTemplate()', () => {
    test('should fill metadata fields in sheet', () => {
      const workbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const formData = {
        metadata: {
          protokollNumber: 'P001',
          auftraggeber: 'Test Company',
          auftragnummer: 'A001',
          kundennummer: 'K001',
          auftragnehmer: 'Contractor',
          facility: {
            name: 'Test Facility',
            anlage: 'Main Installation',
            inventory: 'INV-123'
          },
          prüfer: {
            name: 'Inspector Name'
          }
        },
        positions: [],
        prüfungsergebnis: {
          mängelFestgestellt: false,
          nächsterPrüfungstermin: '2026-01-01'
        }
      };
      
      exporter.fillProtokollTemplate(workbook, formData);
      const sheet = workbook.Sheets.Sheet1;
      
      expect(sheet.U3.v).toBe('P001');
      expect(sheet.C4.v).toBe('Test Company');
      expect(sheet.C6.v).toBe('Test Facility');
      expect(sheet.N16.v).toBe('Inspector Name');
      expect(sheet.C20.v).toBe('Nein');
    });

    test('should fill positions in sheet', () => {
      const workbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const formData = {
        metadata: {
          protokollNumber: 'P001',
          auftraggeber: '',
          auftragnummer: '',
          kundennummer: '',
          auftragnehmer: '',
          facility: { name: '', anlage: '', inventory: '' },
          prüfer: { name: '' }
        },
        positions: [
          {
            stromkreisNr: 'F1',
            zielbezeichnung: 'Circuit 1',
            leitung: { typ: 'NYM', anzahl: '3', querschnitt: '1.5' },
            spannung: { un: 230, fn: 50 },
            messwerte: { riso: 500 }
          }
        ],
        prüfungsergebnis: {
          mängelFestgestellt: true,
          nächsterPrüfungstermin: ''
        }
      };
      
      exporter.fillProtokollTemplate(workbook, formData);
      const sheet = workbook.Sheets.Sheet1;
      
      // Position row starts at 30
      expect(sheet.C30.v).toBe('F1');
      expect(sheet.D30.v).toBe('Circuit 1');
      expect(sheet.E30.v).toBe('NYM');
    });

    test('should handle missing sheet gracefully', () => {
      const workbook = {
        Sheets: {},
        SheetNames: []
      };
      
      const formData = {
        metadata: { protokollNumber: 'P001' },
        positions: [],
        prüfungsergebnis: {}
      };
      
      // Should not throw
      expect(() => {
        exporter.fillProtokollTemplate(workbook, formData);
      }).not.toThrow();
    });

    test('should set defects found as Ja when true', () => {
      const workbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const formData = {
        metadata: {
          protokollNumber: 'P001',
          auftraggeber: '',
          auftragnummer: '',
          kundennummer: '',
          auftragnehmer: '',
          facility: { name: '', anlage: '', inventory: '' },
          prüfer: { name: '' }
        },
        positions: [],
        prüfungsergebnis: {
          mängelFestgestellt: true,
          nächsterPrüfungstermin: ''
        }
      };
      
      exporter.fillProtokollTemplate(workbook, formData);
      expect(workbook.Sheets.Sheet1.C20.v).toBe('Ja');
    });
  });

  describe('fillAbrechnungTemplate()', () => {
    test('should fill header information', () => {
      const workbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const formData = {
        metadata: {
          protokollNumber: 'P001',
          auftraggeber: 'Test Company',
          auftragnummer: 'A001',
          facility: { name: 'Test Facility' }
        },
        positions: []
      };
      
      exporter.fillAbrechnungTemplate(workbook, formData);
      const sheet = workbook.Sheets.Sheet1;
      
      expect(sheet.D2.v).toBe('P001');
      expect(sheet.D3.v).toBe('Test Company');
      expect(sheet.D4.v).toBe('A001');
      expect(sheet.D5.v).toBe('Test Facility');
    });

    test('should aggregate and fill positions', () => {
      const workbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const formData = {
        metadata: {
          protokollNumber: 'P001',
          auftraggeber: '',
          auftragnummer: '',
          facility: { name: '' }
        },
        positions: [
          { zielbezeichnung: 'Type A' },
          { zielbezeichnung: 'Type A' },
          { zielbezeichnung: 'Type B' }
        ]
      };
      
      exporter.fillAbrechnungTemplate(workbook, formData);
      const sheet = workbook.Sheets.Sheet1;
      
      // Positions start at row 10
      // Type A: quantity 2, Type B: quantity 1
      const positionsValues = [];
      for (let i = 10; i < 15; i++) {
        if (sheet[`B${i}`]) {
          positionsValues.push({
            type: sheet[`B${i}`].v,
            qty: sheet[`D${i}`].v
          });
        }
      }
      
      expect(positionsValues.length).toBe(2);
    });
  });

  // ========== EXPORT FUNCTIONS ==========
  describe('Export Functions', () => {
    beforeEach(() => {
      // Setup valid form state
      state.setMetadataField('protokollNumber', 'P001');
      state.setMetadataField('auftraggeber', 'Test Company');
      state.setMetadataField('facility.name', 'Test Facility');
      state.setMetadataField('facility.address', '123 Test Street');
      state.setMetadataField('facility.netzform', 'TN-S');
      state.setMetadataField('prüfer.name', 'Test Inspector');
      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 500 }
      });
      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 86400000 * 365).toISOString() // 1 year from now
      });
    });

    describe('exportProtokoll()', () => {
      test('should throw when validation fails', async () => {
        state.reset();
        state.init();
        // No valid data, should fail validation
        
        await expect(exporter.exportProtokoll()).rejects.toThrow();
      });

      test('should throw when template fails to load', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 404
        });
        
        await expect(exporter.exportProtokoll()).rejects.toThrow('Failed to load protokoll template');
      });

      test('should export successfully with valid data', async () => {
        const mockWorkbook = {
          Sheets: { Sheet1: {} },
          SheetNames: ['Sheet1']
        };
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
        });
        
        global.XLSX.read.mockReturnValue(mockWorkbook);
        
        await expect(exporter.exportProtokoll()).resolves.not.toThrow();
      });
    });

    describe('exportAbrechnung()', () => {
      test('should throw when validation fails', async () => {
        state.reset();
        state.init();
        
        await expect(exporter.exportAbrechnung()).rejects.toThrow();
      });

      test('should export successfully with valid data', async () => {
        const mockWorkbook = {
          Sheets: { Sheet1: {} },
          SheetNames: ['Sheet1']
        };
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
        });
        
        global.XLSX.read.mockReturnValue(mockWorkbook);
        
        await expect(exporter.exportAbrechnung()).resolves.not.toThrow();
      });
    });

    describe('exportBoth()', () => {
      test('should export both files when valid', async () => {
        const mockWorkbook = {
          Sheets: { Sheet1: {} },
          SheetNames: ['Sheet1']
        };
        
        global.fetch.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
        });
        
        global.XLSX.read.mockReturnValue(mockWorkbook);
        
        await expect(exporter.exportBoth()).resolves.not.toThrow();
        
        // Should have called XLSX.write twice (once for each export)
        expect(global.XLSX.write).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ========== LOAD TEMPLATE ==========
  describe('loadTemplate()', () => {
    test('should return null for unknown template type', async () => {
      const result = await exporter.loadTemplate('unknown');
      expect(result).toBeNull();
    });

    test('should return null when XLSX is not available', async () => {
      const originalXLSX = global.XLSX;
      global.XLSX = undefined;
      
      const result = await exporter.loadTemplate('protokoll');
      
      global.XLSX = originalXLSX;
      expect(result).toBeNull();
    });

    test('should return null when fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      const result = await exporter.loadTemplate('protokoll');
      expect(result).toBeNull();
    });

    test('should return workbook on success', async () => {
      const mockWorkbook = { SheetNames: ['Sheet1'] };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
      });
      
      global.XLSX.read.mockReturnValue(mockWorkbook);
      
      const result = await exporter.loadTemplate('protokoll');
      
      expect(result).toEqual(mockWorkbook);
    });
  });

  // ========== GENERATE AND DOWNLOAD ==========
  describe('generateAndDownload()', () => {
    test('should create download link and trigger click', async () => {
      const mockWorkbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const clickSpy = jest.fn();
      const mockLink = {
        click: clickSpy,
        href: '',
        download: ''
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      
      await exporter.generateAndDownload(mockWorkbook, 'test.xlsx');
      
      expect(clickSpy).toHaveBeenCalled();
      expect(mockLink.download).toBe('test.xlsx');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    test('should clean up URL after download', async () => {
      const mockWorkbook = {
        Sheets: { Sheet1: {} },
        SheetNames: ['Sheet1']
      };
      
      const mockLink = {
        click: jest.fn(),
        href: '',
        download: ''
      };
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      
      await exporter.generateAndDownload(mockWorkbook, 'test.xlsx');
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });
});
