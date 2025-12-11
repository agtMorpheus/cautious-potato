/**
 * Unit Tests for Contract Utilities Module (contractUtils.js)
 */

import {
  generateUUID,
  columnLetterToIndex,
  indexToColumnLetter,
  discoverContractSheets,
  suggestContractColumnMapping,
  extractContractsFromSheet,
  validateContractRecord,
  normalizeStatus,
  getContractSummary,
  readContractWorkbook,
  extractContractsFromSheetAsync,
  importContractFile,
  DEFAULT_COLUMN_MAPPING,
  VALID_STATUS_VALUES
} from '../../js/contracts/contractUtils.js';

// Mock XLSX global
global.XLSX = {
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
};

describe('Contract Utils (contractUtils.js)', () => {

  describe('Utility Functions', () => {
    test('generateUUID generates unique strings', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(uuid1).not.toBe(uuid2);
    });

    test('columnLetterToIndex converts correctly', () => {
      expect(columnLetterToIndex('A')).toBe(0);
      expect(columnLetterToIndex('B')).toBe(1);
      expect(columnLetterToIndex('Z')).toBe(25);
      expect(columnLetterToIndex('AA')).toBe(26);
      expect(columnLetterToIndex('AB')).toBe(27);
      expect(columnLetterToIndex(null)).toBe(-1);
    });

    test('indexToColumnLetter converts correctly', () => {
      expect(indexToColumnLetter(0)).toBe('A');
      expect(indexToColumnLetter(1)).toBe('B');
      expect(indexToColumnLetter(25)).toBe('Z');
      expect(indexToColumnLetter(26)).toBe('AA');
      expect(indexToColumnLetter(-1)).toBe('');
    });

    test('normalizeStatus handles various inputs', () => {
      expect(normalizeStatus('offen')).toBe('Erstellt');
      expect(normalizeStatus('inbearb')).toBe('In Bearbeitung');
      expect(normalizeStatus('fertig')).toBe('Abgerechnet');
      expect(normalizeStatus('Erstellt')).toBe('Erstellt');
      expect(normalizeStatus('unknown')).toBe('unknown');
      expect(normalizeStatus(null)).toBe('');
    });
  });

  describe('Sheet Discovery', () => {
    test('discoverContractSheets extracts metadata', () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': {
            '!ref': 'A1:C2',
            'A1': { v: 'Header1' },
            'B1': { v: 'Header2' },
            'C1': { v: 'Header3' },
            'A2': { v: 'Value1' },
            'B2': { v: 123 },
            'C2': { v: 42000 } // Excel date
          }
        }
      };

      const result = discoverContractSheets(mockWorkbook);
      expect(result['Sheet1']).toBeDefined();
      expect(result['Sheet1'].columns).toHaveLength(3);
      expect(result['Sheet1'].rowCount).toBe(1);
      expect(result['Sheet1'].columns[1].type).toBe('number');
      expect(result['Sheet1'].columns[2].type).toBe('date');
    });

    test('discoverContractSheets throws on invalid workbook', () => {
      expect(() => discoverContractSheets(null)).toThrow();
      expect(() => discoverContractSheets({})).toThrow();
    });
  });

  describe('Column Mapping', () => {
    test('suggestContractColumnMapping maps known headers', () => {
      const columns = [
        { letter: 'A', header: 'Auftragsnummer' },
        { letter: 'B', header: 'Titel' },
        { letter: 'C', header: 'Status' }
      ];

      const mapping = suggestContractColumnMapping(columns);
      expect(mapping.contractId.excelColumn).toBe('A');
      expect(mapping.contractTitle.excelColumn).toBe('B');
      expect(mapping.status.excelColumn).toBe('C');
    });

    test('suggestContractColumnMapping uses defaults when no match', () => {
      const columns = [{ letter: 'A', header: 'Unknown' }];
      const mapping = suggestContractColumnMapping(columns);
      expect(mapping.contractId).toBeDefined();
      expect(mapping.contractId.excelColumn).toBe(DEFAULT_COLUMN_MAPPING.contractId.excelColumn);
    });
  });

  describe('Validation', () => {
    test('validateContractRecord validates required fields', () => {
      const validContract = {
        contractId: '123',
        contractTitle: 'Test',
        status: 'Erstellt'
      };
      const result = validateContractRecord(validContract);
      expect(result.valid).toBe(true);
    });

    test('validateContractRecord reports errors', () => {
      const invalidContract = {
        contractId: '',
        status: 'Unknown'
      };
      const result = validateContractRecord(invalidContract);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract-Titel ist erforderlich');
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('Sync Extraction (extractContractsFromSheet)', () => {
    test('extracts contracts from sheet', () => {
      const mockWorkbook = {
        Sheets: {
          'Sheet1': {
            '!ref': 'A1:B2',
            'A2': { v: '1001' }, // Contract ID
            'B2': { v: 'Test Title' } // Title
          }
        }
      };

      const mapping = {
        contractId: { excelColumn: 'A', type: 'string' },
        contractTitle: { excelColumn: 'B', type: 'string' },
        status: { excelColumn: 'C', type: 'string' } // Missing in sheet
      };

      // Since status is missing in sheet, it will be undefined, then cleaned to null.
      // validateContractRecord will fail because status is required.
      // But let's check if it attempts extraction.

      // Mock validateContractRecord behavior implicitly by checking result
      // Actually the function calls validateContractRecord internally.
      // So we expect errors in the result if required fields are missing.

      const result = extractContractsFromSheet(mockWorkbook, 'Sheet1', mapping);
      expect(result.contracts).toHaveLength(0); // Failed validation
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Status ist erforderlich');
    });
  });

  describe('Summary', () => {
      test('getContractSummary calculates stats', () => {
          const contracts = [
              { contractId: '1', status: 'Erstellt', location: 'Berlin', plannedStart: '2025-01-01' },
              { contractId: '2', status: 'Erstellt', location: 'Berlin', plannedStart: '2025-01-02' },
              { contractId: '3', status: 'Abgerechnet', location: 'Munich' }
          ];

          const summary = getContractSummary(contracts);
          expect(summary.totalContracts).toBe(3);
          expect(summary.uniqueContractIds).toBe(3);
          expect(summary.byStatus['Erstellt']).toBe(2);
          expect(summary.byLocation['Berlin']).toBe(2);
          expect(summary.dateRange.earliest).toBe('2025-01-01');
      });
  });

  describe('Async / Phase 2 Functions', () => {

    test('readContractWorkbook reads file', async () => {
        const mockFile = new File(['dummy content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Mock FileReader
        const mockReader = {
            readAsArrayBuffer: jest.fn(),
            onload: null,
            onerror: null
        };
        window.FileReader = jest.fn(() => mockReader);
        
        // Mock XLSX.read result
        XLSX.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: {} });

        const promise = readContractWorkbook(mockFile);
        
        // Trigger onload
        mockReader.onload({ target: { result: new ArrayBuffer(8) } });
        
        const workbook = await promise;
        expect(workbook).toBeDefined();
        expect(workbook.fileName).toBe('test.xlsx');
    });

    test('extractContractsFromSheetAsync extracts data', async () => {
        const mockWorkbook = {
            fileName: 'test.xlsx',
            Sheets: {
                'Sheet1': { '!ref': 'A1:C2' }
            }
        };
        
        // Mock sheet_to_json result
        XLSX.utils.sheet_to_json.mockReturnValue([
            ['ID', 'Title', 'Status'], // Header
            ['1001', 'Test', 'Erstellt'] // Data
        ]);

        const mapping = {
            contractId: { excelColumn: 'A', type: 'string' },
            contractTitle: { excelColumn: 'B', type: 'string' },
            status: { excelColumn: 'C', type: 'string' }
        };

        const result = await extractContractsFromSheetAsync(mockWorkbook, 'Sheet1', mapping);

        expect(result.contracts).toHaveLength(1);
        expect(result.contracts[0].contractId).toBe('1001');
        expect(result.summary.successCount).toBe(1);
    });

    test('has optional fields marked correctly', () => {
        expect(DEFAULT_COLUMN_MAPPING.location.required).toBe(false);
        expect(DEFAULT_COLUMN_MAPPING.taskId.required).toBe(false);
    });
  });

  describe('VALID_STATUS_VALUES', () => {
    test('contains expected status values', () => {
        expect(VALID_STATUS_VALUES).toContain('In Bearbeitung');
        expect(VALID_STATUS_VALUES).toContain('Abgerechnet');
        expect(VALID_STATUS_VALUES).toContain('Erstellt');
    });

    test('contains all expected German status values', () => {
        expect(VALID_STATUS_VALUES).toContain('Geplant');
        expect(VALID_STATUS_VALUES).toContain('Freigegeben');
        expect(VALID_STATUS_VALUES).toContain('Archiviert');
    });
  });

  describe('normalizeStatus() additional cases', () => {
    test('normalizes "complete" variations', () => {
        expect(normalizeStatus('complete')).toBe('Abgerechnet');
        expect(normalizeStatus('completed')).toBe('Abgerechnet');
    });

    test('normalizes "in arbeit" to "In Bearbeitung"', () => {
        expect(normalizeStatus('in arbeit')).toBe('In Bearbeitung');
    });

    test('normalizes "open" to "Erstellt"', () => {
        expect(normalizeStatus('open')).toBe('Erstellt');
    });

    test('preserves valid status values', () => {
        expect(normalizeStatus('Geplant')).toBe('Geplant');
        expect(normalizeStatus('Freigegeben')).toBe('Freigegeben');
    });
  });

  describe('validateContractRecord() additional cases', () => {
    test('validates contract with valid date format', () => {
        const contract = {
            contractId: '1406',
            contractTitle: 'Test',
            status: 'INBEARB',
            plannedStart: '2025-06-15'
        };
        const result = validateContractRecord(contract);
        expect(result.valid).toBe(true);
    });

    test('warns about invalid date format', () => {
        const contract = {
            contractId: '1406',
            contractTitle: 'Test',
            status: 'INBEARB',
            plannedStart: '15-06-2025'
        };
        const result = validateContractRecord(contract);
        expect(result.warnings.some(w => w.includes('ungültiges Format'))).toBe(true);
    });

    test('returns error for non-object contract', () => {
        const result = validateContractRecord('string');
        expect(result.valid).toBe(false);
    });
  });

  describe('getContractSummary() additional cases', () => {
    test('calculates summary with unknown locations', () => {
        const contracts = [
            { contractId: '1406', status: 'In Bearbeitung', location: null },
            { contractId: '1407', status: 'Abgerechnet', location: 'Berlin' }
        ];
        const summary = getContractSummary(contracts);
        expect(summary.byLocation['Unbekannt']).toBe(1);
        expect(summary.byLocation['Berlin']).toBe(1);
    });

    test('calculates correct date range with multiple dates', () => {
        const contracts = [
            { contractId: '1406', status: 'In Bearbeitung', plannedStart: '2025-01-15' },
            { contractId: '1407', status: 'Abgerechnet', plannedStart: '2025-12-31' }
        ];
        const summary = getContractSummary(contracts);
        expect(summary.dateRange.earliest).toBe('2025-01-15');
        expect(summary.dateRange.latest).toBe('2025-12-31');
    });
  });

  describe('columnLetterToIndex() additional cases', () => {
    test('handles mixed case consistently', () => {
        expect(columnLetterToIndex('Ab')).toBe(columnLetterToIndex('AB'));
    });

    test('returns -1 for undefined and objects', () => {
        expect(columnLetterToIndex(undefined)).toBe(-1);
        expect(columnLetterToIndex({})).toBe(-1);
    });
  });

  describe('indexToColumnLetter() additional cases', () => {
    test('converts triple letter indices correctly', () => {
        expect(indexToColumnLetter(702)).toBe('AAA');
    });

    test('handles boundary values', () => {
        expect(indexToColumnLetter(0)).toBe('A');
        expect(indexToColumnLetter(25)).toBe('Z');
        expect(indexToColumnLetter(26)).toBe('AA');
    });
  });

  describe('discoverContractSheets() edge cases', () => {
    test('handles workbook with empty sheet array', () => {
        expect(() => discoverContractSheets({ SheetNames: [] })).toThrow();
    });

    test('handles null workbook', () => {
        expect(() => discoverContractSheets(null)).toThrow();
    });

    test('handles sheet with no range', () => {
        const mockWorkbook = {
            SheetNames: ['EmptySheet'],
            Sheets: {
                'EmptySheet': {}
            }
        };

        const result = discoverContractSheets(mockWorkbook);
        expect(result['EmptySheet']).toBeDefined();
        expect(result['EmptySheet'].isEmpty).toBe(true);
        expect(result['EmptySheet'].rowCount).toBe(0);
        expect(result['EmptySheet'].columns).toEqual([]);
    });

    test('handles sheet with invalid range format', () => {
        const mockWorkbook = {
            SheetNames: ['BadRange'],
            Sheets: {
                'BadRange': {
                    '!ref': 'invalid-range'
                }
            }
        };

        const result = discoverContractSheets(mockWorkbook);
        expect(result['BadRange']).toBeDefined();
        expect(result['BadRange'].isEmpty).toBe(true);
        expect(result['BadRange'].rowCount).toBe(0);
    });
  });
});
