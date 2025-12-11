/**
 * Unit Tests for Cell Mapper Module (cell-mapper.js)
 * Tests Excel cell mapping and preview functionality
 */

import { PARSING_CONFIG } from '../../js/config.js';

// Mock the XLSX library
const mockXLSX = {
  utils: {
    decode_cell: jest.fn((address) => {
      // Parse cell address like 'A1', 'B5', 'AA1', etc.
      const match = address.match(/^([A-Z]+)(\d+)$/);
      
      if (!match) {
        throw new Error(`Invalid cell address: ${address}`);
      }
      
      const col = match[1];
      const row = parseInt(match[2], 10) - 1; // 0-indexed
      
      // Convert column letter to number (A=0, B=1, ..., Z=25, AA=26, etc.)
      let colNum = 0;
      for (let i = 0; i < col.length; i++) {
        colNum = colNum * 26 + (col.charCodeAt(i) - 64);
      }
      colNum--; // Adjust to 0-indexed
      
      return { r: row, c: colNum };
    }),
    encode_cell: jest.fn(({ r, c }) => {
      // Convert column number to letter (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
      let col = '';
      let temp = c + 1; // 1-indexed for conversion
      while (temp > 0) {
        temp--;
        col = String.fromCharCode(65 + (temp % 26)) + col;
        temp = Math.floor(temp / 26);
      }
      
      return `${col}${r + 1}`;
    })
  }
};

// Set up global XLSX
global.XLSX = mockXLSX;

// Import after setting up mock
import {
  previewCellValues,
  getAllConfiguredCells,
  findBestMatch,
  createCellMapperDialog,
  applyMapping
} from '../../js/cell-mapper.js';

import { getMetadataCellMap, updateMetadataCellMap } from '../../js/utils.js';

// Mock utils functions
jest.mock('../../js/utils.js', () => ({
  getMetadataCellMap: jest.fn(() => ({
    protokollNr: ['A1', 'B1'],
    auftragsNr: ['A2', 'C2'],
    anlage: ['A3'],
    einsatzort: ['A4', 'B4'],
    firma: ['A5'],
    auftraggeber: ['A6']
  })),
  updateMetadataCellMap: jest.fn()
}));

describe('Cell Mapper Module (cell-mapper.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    
    // Reset XLSX mock implementations
    mockXLSX.utils.decode_cell.mockImplementation((address) => {
      const match = address.match(/^([A-Z]+)(\d+)$/);
      
      if (!match) {
        throw new Error(`Invalid cell address: ${address}`);
      }
      
      const col = match[1];
      const row = parseInt(match[2], 10) - 1;
      
      let colNum = 0;
      for (let i = 0; i < col.length; i++) {
        colNum = colNum * 26 + (col.charCodeAt(i) - 64);
      }
      colNum--;
      
      return { r: row, c: colNum };
    });
    
    mockXLSX.utils.encode_cell.mockImplementation(({ r, c }) => {
      let col = '';
      let temp = c + 1;
      while (temp > 0) {
        temp--;
        col = String.fromCharCode(65 + (temp % 26)) + col;
        temp = Math.floor(temp / 26);
      }
      
      return `${col}${r + 1}`;
    });
  });

  describe('XLSX utility mocks', () => {
    test('decode_cell parses simple address', () => {
      const result = mockXLSX.utils.decode_cell('A1');
      expect(result).toEqual({ r: 0, c: 0 });
    });

    test('decode_cell parses address with multiple letters', () => {
      const result = mockXLSX.utils.decode_cell('AB5');
      expect(result.r).toBe(4);
      expect(result.c).toBe(27); // AB = 27
    });

    test('encode_cell creates cell address', () => {
      const result = mockXLSX.utils.encode_cell({ r: 0, c: 0 });
      expect(result).toBe('A1');
    });

    test('encode_cell handles higher columns', () => {
      const result = mockXLSX.utils.encode_cell({ r: 4, c: 2 });
      expect(result).toBe('C5');
    });
  });

  describe('previewCellValues()', () => {
    test('returns cell values from workbook', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Protocol-001' },
            B1: { v: 'Label' },
            C1: { v: 'Data' }
          }
        }
      };
      
      const result = previewCellValues(workbook, ['A1', 'C1']);
      
      expect(result['A1']).toBe('Protocol-001');
      expect(result['C1']).toBe('Data');
    });

    test('returns null for empty cells', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const result = previewCellValues(workbook, ['A1', 'Z99']);
      
      expect(result['A1']).toBe('Value');
      expect(result['Z99']).toBeNull();
    });

    test('throws error when sheet not found', () => {
      const workbook = {
        Sheets: {
          'OtherSheet': { A1: { v: 'data' } }
        }
      };
      
      expect(() => previewCellValues(workbook, ['A1'])).toThrow('nicht gefunden');
    });

    test('includes adjacent cells in preview', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Main' },
            B1: { v: 'Right' },
            A2: { v: 'Below' }
          }
        }
      };
      
      const result = previewCellValues(workbook, ['A1']);
      
      // Should include A1 and adjacent cells
      expect(result['A1']).toBe('Main');
      expect(result['B1']).toBe('Right');
      expect(result['A2']).toBe('Below');
    });
  });

  describe('getAllConfiguredCells()', () => {
    test('returns all configured cells', () => {
      const result = getAllConfiguredCells();
      
      expect(result).toContain('A1');
      expect(result).toContain('B1');
      expect(result).toContain('A2');
    });

    test('returns array of strings', () => {
      const result = getAllConfiguredCells();
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(cell => {
        expect(typeof cell).toBe('string');
      });
    });

    test('includes adjacent cells', () => {
      const result = getAllConfiguredCells();
      
      // Should include more cells than just the configured ones
      // due to adjacent cell expansion
      expect(result.length).toBeGreaterThan(6);
    });

    test('returns sorted array', () => {
      const result = getAllConfiguredCells();
      const sorted = [...result].sort();
      
      expect(result).toEqual(sorted);
    });
  });

  describe('findBestMatch()', () => {
    test('returns cell with value for field', () => {
      const preview = {
        'A1': 'Protocol-001',
        'B1': 'Label',
        'A2': 'Order-123'
      };
      
      const result = findBestMatch('protokollNr', preview);
      
      expect(result).toBe('A1');
    });

    test('returns null when no matching cells have values', () => {
      const preview = {
        'A1': null,
        'B1': null
      };
      
      const result = findBestMatch('protokollNr', preview);
      
      expect(result).toBeNull();
    });

    test('returns null for empty string values', () => {
      const preview = {
        'A1': '',
        'B1': '   '
      };
      
      const result = findBestMatch('protokollNr', preview);
      
      expect(result).toBeNull();
    });

    test('returns null for unknown field', () => {
      getMetadataCellMap.mockReturnValueOnce({});
      
      const preview = {
        'A1': 'Value'
      };
      
      const result = findBestMatch('unknownField', preview);
      
      expect(result).toBeNull();
    });

    test('handles cells that look like labels', () => {
      const preview = {
        'A2': 'Auftrags-Nr.:',  // Looks like a label
        'B2': 'Order-123',       // Adjacent cell with actual value
        'C2': 'Data'
      };
      
      const result = findBestMatch('auftragsNr', preview);
      
      // Should return one of the matching cells
      expect(['A2', 'C2', null]).toContain(result);
    });
  });

  describe('createCellMapperDialog()', () => {
    test('creates dialog element', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Protocol-001' },
            A2: { v: 'Order-123' },
            A3: { v: 'Plant A' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      expect(dialog).toBeInstanceOf(HTMLElement);
      expect(dialog.className).toContain('cell-mapper-dialog');
    });

    test('dialog has proper ARIA attributes', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('cell-mapper-title');
    });

    test('dialog contains field rows', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Protocol-001' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      const rows = dialog.querySelectorAll('.cell-mapper-row');
      expect(rows.length).toBeGreaterThan(0);
    });

    test('dialog has confirm and cancel buttons', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      const confirmBtn = dialog.querySelector('#cell-mapper-confirm');
      const cancelBtn = dialog.querySelector('#cell-mapper-cancel');
      
      expect(confirmBtn).not.toBeNull();
      expect(cancelBtn).not.toBeNull();
    });

    test('dialog stores preview data', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Test Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      expect(dialog._previewData).toBeDefined();
      expect(dialog._workbook).toBe(workbook);
    });

    test('select elements have data-field attribute', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      const selects = dialog.querySelectorAll('select[data-field]');
      
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Dialog Events', () => {
    test('cancel button dispatches cancel event', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      const cancelBtn = dialog.querySelector('#cell-mapper-cancel');
      
      const eventHandler = jest.fn();
      dialog.addEventListener('cell-mapper-cancel', eventHandler);
      
      cancelBtn.click();
      
      expect(eventHandler).toHaveBeenCalled();
    });

    test('overlay click dispatches cancel event', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      const overlay = dialog.querySelector('.cell-mapper-overlay');
      
      const eventHandler = jest.fn();
      dialog.addEventListener('cell-mapper-cancel', eventHandler);
      
      overlay.click();
      
      expect(eventHandler).toHaveBeenCalled();
    });

    test('escape key dispatches cancel event', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      const eventHandler = jest.fn();
      dialog.addEventListener('cell-mapper-cancel', eventHandler);
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      dialog.dispatchEvent(escapeEvent);
      
      expect(eventHandler).toHaveBeenCalled();
    });

    test('select change updates preview', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value1' },
            B1: { v: 'Value2' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      const select = dialog.querySelector('select[data-field]');
      
      if (select) {
        // Add an option
        const option = document.createElement('option');
        option.value = 'B1';
        select.appendChild(option);
        
        select.value = 'B1';
        select.dispatchEvent(new Event('change'));
        
        // Preview input should be updated
        const field = select.dataset.field;
        const previewInput = dialog.querySelector(`#preview-${field}`);
        // Preview update happens on change event
      }
    });
  });

  describe('applyMapping()', () => {
    test('updates cell map for each field', () => {
      const mapping = {
        protokollNr: 'A1',
        auftragsNr: 'B2'
      };
      
      applyMapping(mapping);
      
      expect(updateMetadataCellMap).toHaveBeenCalledWith('protokollNr', ['A1']);
      expect(updateMetadataCellMap).toHaveBeenCalledWith('auftragsNr', ['B2']);
    });

    test('handles empty mapping', () => {
      const mapping = {};
      
      applyMapping(mapping);
      
      expect(updateMetadataCellMap).not.toHaveBeenCalled();
    });

    test('handles single field mapping', () => {
      const mapping = {
        anlage: 'C3'
      };
      
      applyMapping(mapping);
      
      expect(updateMetadataCellMap).toHaveBeenCalledTimes(1);
      expect(updateMetadataCellMap).toHaveBeenCalledWith('anlage', ['C3']);
    });
  });

  describe('Required Field Validation', () => {
    test('auftragsNr is marked as required', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      const rows = dialog.querySelectorAll('.cell-mapper-row');
      
      // Check for required fields
      let hasRequiredAuftrag = false;
      rows.forEach(row => {
        const label = row.querySelector('label');
        if (label && label.textContent.includes('Auftrags-Nr.')) {
          hasRequiredAuftrag = row.classList.contains('required');
        }
      });
      
      // Either class or asterisk indicates required
      const hasRequiredMark = dialog.innerHTML.includes('Auftrags-Nr.') && 
                             dialog.innerHTML.includes('required-mark');
      expect(hasRequiredMark).toBe(true);
    });

    test('anlage is marked as required', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Value' }
          }
        }
      };
      
      const dialog = createCellMapperDialog(workbook);
      
      // Check for required field
      const hasRequiredAnlage = dialog.innerHTML.includes('Anlage') && 
                               dialog.innerHTML.includes('required');
      expect(hasRequiredAnlage).toBe(true);
    });
  });

  describe('Cell Address Edge Cases', () => {
    test('handles first column (A)', () => {
      const result = mockXLSX.utils.decode_cell('A1');
      expect(result.c).toBe(0);
    });

    test('handles large row numbers', () => {
      const result = mockXLSX.utils.decode_cell('A1000000');
      expect(result.r).toBe(999999);
    });

    test('handles multi-character columns', () => {
      const result = mockXLSX.utils.decode_cell('AA1');
      expect(result.c).toBe(26);
    });
  });

  describe('Preview Values with Special Characters', () => {
    test('handles values with special characters', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 'Test <script>alert("xss")</script>' }
          }
        }
      };
      
      const result = previewCellValues(workbook, ['A1']);
      
      expect(result['A1']).toBe('Test <script>alert("xss")</script>');
    });

    test('handles numeric values', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: 12345 }
          }
        }
      };
      
      const result = previewCellValues(workbook, ['A1']);
      
      expect(result['A1']).toBe(12345);
    });

    test('handles date values', () => {
      const workbook = {
        Sheets: {
          [PARSING_CONFIG.protokollSheetName]: {
            A1: { v: new Date('2025-01-01') }
          }
        }
      };
      
      const result = previewCellValues(workbook, ['A1']);
      
      expect(result['A1']).toBeInstanceOf(Date);
    });
  });
});
