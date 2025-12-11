/**
 * Unit Tests for ExcelJS-based Utility Functions (utils-exceljs.js)
 * Tests Excel operations using ExcelJS library
 */

import {
  loadAbrechnungTemplateExcelJS,
  fillAbrechnungHeaderExcelJS,
  fillAbrechnungPositionsExcelJS,
  exportToExcelExcelJS,
  createAndExportAbrechnungExcelJS
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

// Setup Globals
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

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


describe('ExcelJS Utilities (utils-exceljs.js)', () => {

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
      if (name === 'EAW') return mockWorksheet;
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

  describe('loadAbrechnungTemplateExcelJS()', () => {
    test('loads template successfully', async () => {
      const wb = await loadAbrechnungTemplateExcelJS();
      
      expect(global.fetch).toHaveBeenCalledWith('templates/abrechnung.xlsx');
      expect(global.ExcelJS.Workbook).toHaveBeenCalled();
      expect(mockWorkbook.xlsx.load).toHaveBeenCalled();
      expect(wb).toBe(mockWorkbook);
    });

    test('throws error on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      await expect(loadAbrechnungTemplateExcelJS()).rejects.toThrow('Fehler beim Laden des Templates');
    });

    test('throws error on non-ok response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      await expect(loadAbrechnungTemplateExcelJS()).rejects.toThrow('HTTP 404');
    });
  });

  describe('fillAbrechnungHeaderExcelJS()', () => {
    test('fills header cells with metadata', () => {
      const metadata = {
        datum: '2025-01-15',
        auftragsNr: 'ORD-12345',
        anlage: 'Test Factory',
        einsatzort: 'Building A'
      };
      
      fillAbrechnungHeaderExcelJS(mockWorkbook, metadata);
      
      expect(mockWorksheet._cells['B1'].value).toBe('2025-01-15');
      expect(mockWorksheet._cells['B2'].value).toBe('ORD-12345');
      expect(mockWorksheet._cells['B3'].value).toBe('Test Factory');
      expect(mockWorksheet._cells['B4'].value).toBe('Building A');
    });

    test('throws error if sheet not found', () => {
      mockWorkbook.getWorksheet.mockReturnValue(null);
      const metadata = { datum: '2025-01-15' };
      
      expect(() => fillAbrechnungHeaderExcelJS(mockWorkbook, metadata)).toThrow('Sheet "EAW" nicht gefunden');
    });
  });

  describe('fillAbrechnungPositionsExcelJS()', () => {
    test('fills quantities for matching positions', () => {
      // Setup positions in the worksheet
      mockWorksheet._cells['A9'] = { value: '01.01.0010' };
      mockWorksheet._cells['A10'] = { value: '01.01.0020' };

      const positionSums = {
        '01.01.0010': 5,
        '01.01.0020': 10
      };
      
      fillAbrechnungPositionsExcelJS(mockWorkbook, positionSums);
      
      expect(mockWorksheet._cells['B9'].value).toBe(5);
      expect(mockWorksheet._cells['B10'].value).toBe(10);
    });

    test('throws error if sheet not found', () => {
      mockWorkbook.getWorksheet.mockReturnValue(null);
      
      expect(() => fillAbrechnungPositionsExcelJS(mockWorkbook, {})).toThrow('Sheet "EAW" nicht gefunden');
    });
  });

  describe('exportToExcelExcelJS()', () => {
    test('exports workbook successfully', async () => {
      const metadata = { orderNumber: '123' };
      
      const result = await exportToExcelExcelJS(mockWorkbook, metadata);
      
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockLink.download).toContain('Abrechnung_123');
      expect(result.fileName).toBe(mockLink.download);
    });

    test('uses default filename if no order number', async () => {
      const result = await exportToExcelExcelJS(mockWorkbook, {});
      
      expect(mockLink.download).toBe('Abrechnung.xlsx');
    });

    test('throws error on export failure', async () => {
      mockWorkbook.xlsx.writeBuffer.mockRejectedValue(new Error('Write failed'));
      
      await expect(exportToExcelExcelJS(mockWorkbook, {})).rejects.toThrow('Fehler beim Exportieren');
    });
  });

  describe('createAndExportAbrechnungExcelJS()', () => {
    test('orchestrates full export workflow', async () => {
      const abrechnungData = {
        header: {
          date: '2025-01-01',
          orderNumber: 'ORD-1',
          plant: 'Plant 1',
          location: 'Loc 1'
        },
        positionen: {
          '01.01.0010': 5
        }
      };
      
      // Setup positions for fillAbrechnungPositionsExcelJS
      mockWorksheet._cells['A9'] = { value: '01.01.0010' };

      await createAndExportAbrechnungExcelJS(abrechnungData);
      
      expect(global.fetch).toHaveBeenCalled(); // Loads template
      expect(mockWorksheet.getCell).toHaveBeenCalled(); // Fills data
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled(); // Exports
    });
  });
});
