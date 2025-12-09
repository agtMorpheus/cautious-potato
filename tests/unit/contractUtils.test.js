/**
 * Unit Tests for Contract Utilities Module (contractUtils.js)
 * Phase 1 - Contract Manager Testing
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
    DEFAULT_COLUMN_MAPPING,
    VALID_STATUS_VALUES
} from '../../js/contracts/contractUtils.js';

describe('Contract Utilities (contractUtils.js)', () => {
    
    describe('generateUUID()', () => {
        test('generates valid UUID v4 format', () => {
            const uuid = generateUUID();
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(uuid).toMatch(uuidPattern);
        });
        
        test('generates unique UUIDs', () => {
            const uuids = new Set();
            for (let i = 0; i < 100; i++) {
                uuids.add(generateUUID());
            }
            expect(uuids.size).toBe(100);
        });
    });
    
    describe('columnLetterToIndex()', () => {
        test('converts single letters correctly', () => {
            expect(columnLetterToIndex('A')).toBe(0);
            expect(columnLetterToIndex('B')).toBe(1);
            expect(columnLetterToIndex('Z')).toBe(25);
        });
        
        test('converts double letters correctly', () => {
            expect(columnLetterToIndex('AA')).toBe(26);
            expect(columnLetterToIndex('AB')).toBe(27);
            expect(columnLetterToIndex('AZ')).toBe(51);
        });
        
        test('handles lowercase letters', () => {
            expect(columnLetterToIndex('a')).toBe(0);
            expect(columnLetterToIndex('ab')).toBe(27);
        });
        
        test('returns -1 for invalid input', () => {
            expect(columnLetterToIndex(null)).toBe(-1);
            expect(columnLetterToIndex('')).toBe(-1);
            expect(columnLetterToIndex(123)).toBe(-1);
        });
    });
    
    describe('indexToColumnLetter()', () => {
        test('converts single digit indices correctly', () => {
            expect(indexToColumnLetter(0)).toBe('A');
            expect(indexToColumnLetter(1)).toBe('B');
            expect(indexToColumnLetter(25)).toBe('Z');
        });
        
        test('converts double digit indices correctly', () => {
            expect(indexToColumnLetter(26)).toBe('AA');
            expect(indexToColumnLetter(27)).toBe('AB');
            expect(indexToColumnLetter(51)).toBe('AZ');
        });
        
        test('returns empty string for invalid input', () => {
            expect(indexToColumnLetter(-1)).toBe('');
            expect(indexToColumnLetter(null)).toBe('');
            expect(indexToColumnLetter('A')).toBe('');
        });
    });
    
    describe('discoverContractSheets()', () => {
        test('discovers sheets in workbook', () => {
            const mockWorkbook = {
                SheetNames: ['Sheet1', 'Sheet2'],
                Sheets: {
                    'Sheet1': {
                        '!ref': 'A1:C10',
                        'A1': { v: 'Header A' },
                        'B1': { v: 'Header B' },
                        'C1': { v: 'Header C' },
                        'A2': { v: 'Data' }
                    },
                    'Sheet2': {
                        '!ref': 'A1:B5',
                        'A1': { v: 'Col A' },
                        'B1': { v: 'Col B' }
                    }
                }
            };
            
            const result = discoverContractSheets(mockWorkbook);
            
            expect(Object.keys(result)).toEqual(['Sheet1', 'Sheet2']);
            expect(result['Sheet1'].rowCount).toBe(9); // 10 - 1 header
            expect(result['Sheet1'].columns.length).toBe(3);
            expect(result['Sheet1'].columns[0].header).toBe('Header A');
        });
        
        test('throws error for empty workbook', () => {
            expect(() => discoverContractSheets(null)).toThrow();
            expect(() => discoverContractSheets({ SheetNames: [] })).toThrow();
        });
        
        test('handles empty sheets', () => {
            const mockWorkbook = {
                SheetNames: ['EmptySheet'],
                Sheets: {
                    'EmptySheet': {}
                }
            };
            
            const result = discoverContractSheets(mockWorkbook);
            expect(result['EmptySheet'].isEmpty).toBe(true);
        });
    });
    
    describe('suggestContractColumnMapping()', () => {
        test('suggests mapping based on headers', () => {
            const columns = [
                { letter: 'A', header: 'Auftrag' },
                { letter: 'B', header: 'Aufgabe' },
                { letter: 'C', header: 'Status' },
                { letter: 'D', header: 'Standort' }
            ];
            
            const mapping = suggestContractColumnMapping(columns);
            
            expect(mapping.contractId.excelColumn).toBe('A');
            expect(mapping.taskId.excelColumn).toBe('B');
            expect(mapping.status.excelColumn).toBe('C');
            expect(mapping.location.excelColumn).toBe('D');
        });
        
        test('returns default mapping for empty columns', () => {
            const mapping = suggestContractColumnMapping([]);
            
            expect(mapping.contractId).toBeDefined();
            expect(mapping.status).toBeDefined();
        });
        
        test('uses default mapping when no headers match', () => {
            const columns = [
                { letter: 'A', header: 'Unknown1' },
                { letter: 'B', header: 'Unknown2' }
            ];
            
            const mapping = suggestContractColumnMapping(columns);
            
            // Should fall back to defaults
            expect(mapping.contractId.excelColumn).toBe('A'); // Default
        });
    });
    
    describe('extractContractsFromSheet()', () => {
        test('extracts contracts from valid sheet', () => {
            const mockWorkbook = {
                Sheets: {
                    'TestSheet': {
                        '!ref': 'A1:M3',
                        'A1': { v: 'Auftrag' },
                        'F1': { v: 'Titel' },
                        'M1': { v: 'Status' },
                        'A2': { v: '1406' },
                        'F2': { v: 'Test Contract' },
                        'M2': { v: 'INBEARB' },
                        'A3': { v: '1407' },
                        'F3': { v: 'Another Contract' },
                        'M3': { v: 'fertig' }
                    }
                }
            };
            
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string', required: true },
                contractTitle: { excelColumn: 'F', type: 'string', required: true },
                status: { excelColumn: 'M', type: 'string', required: true }
            };
            
            const result = extractContractsFromSheet(mockWorkbook, 'TestSheet', mapping);
            
            expect(result.contracts.length).toBe(2);
            expect(result.contracts[0].contractId).toBe('1406');
            expect(result.contracts[0].contractTitle).toBe('Test Contract');
            expect(result.errors.length).toBe(0);
        });
        
        test('returns error for missing sheet', () => {
            const result = extractContractsFromSheet({ Sheets: {} }, 'NonExistent', {});
            
            expect(result.contracts.length).toBe(0);
            expect(result.errors.length).toBeGreaterThan(0);
        });
        
        test('reports errors for invalid rows', () => {
            const mockWorkbook = {
                Sheets: {
                    'TestSheet': {
                        '!ref': 'A1:M2',
                        'A1': { v: 'Auftrag' },
                        'F1': { v: 'Titel' },
                        'M1': { v: 'Status' },
                        'A2': { v: '' }, // Missing required field
                        'F2': { v: 'Test' },
                        'M2': { v: 'INBEARB' }
                    }
                }
            };
            
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string', required: true },
                contractTitle: { excelColumn: 'F', type: 'string', required: true },
                status: { excelColumn: 'M', type: 'string', required: true }
            };
            
            const result = extractContractsFromSheet(mockWorkbook, 'TestSheet', mapping);
            
            expect(result.contracts.length).toBe(0);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
    
    describe('validateContractRecord()', () => {
        test('validates complete contract as valid', () => {
            const contract = {
                contractId: '1406',
                contractTitle: 'Test Contract',
                status: 'INBEARB'
            };
            
            const result = validateContractRecord(contract);
            
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });
        
        test('reports missing required fields', () => {
            const contract = {
                contractId: '',
                contractTitle: 'Test',
                status: ''
            };
            
            const result = validateContractRecord(contract);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Contract ID'))).toBe(true);
            expect(result.errors.some(e => e.includes('Status'))).toBe(true);
        });
        
        test('warns about unknown status values', () => {
            const contract = {
                contractId: '1406',
                contractTitle: 'Test',
                status: 'UNKNOWN_STATUS'
            };
            
            const result = validateContractRecord(contract);
            
            expect(result.valid).toBe(true); // Still valid, just a warning
            expect(result.warnings.some(w => w.includes('Unbekannter Status'))).toBe(true);
        });
        
        test('returns error for null input', () => {
            const result = validateContractRecord(null);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
    
    describe('normalizeStatus()', () => {
        test('normalizes common status values', () => {
            expect(normalizeStatus('INBEARB')).toBe('inbearb');
            expect(normalizeStatus('fertig')).toBe('fertig');
            expect(normalizeStatus('OFFEN')).toBe('offen');
        });
        
        test('maps status variations', () => {
            expect(normalizeStatus('in bearbeitung')).toBe('inbearb');
            expect(normalizeStatus('abgeschlossen')).toBe('fertig');
            expect(normalizeStatus('done')).toBe('fertig');
        });
        
        test('handles empty and null values', () => {
            expect(normalizeStatus('')).toBe('');
            expect(normalizeStatus(null)).toBe('');
            expect(normalizeStatus(undefined)).toBe('');
        });
        
        test('preserves unknown status values', () => {
            expect(normalizeStatus('custom_status')).toBe('custom_status');
        });
    });
    
    describe('getContractSummary()', () => {
        test('computes summary for contracts array', () => {
            const contracts = [
                { contractId: '1406', status: 'inbearb', location: 'Berlin', plannedStart: '2025-06-01' },
                { contractId: '1406', status: 'fertig', location: 'Berlin', plannedStart: '2025-07-01' },
                { contractId: '1407', status: 'inbearb', location: 'Munich', plannedStart: '2025-05-15' }
            ];
            
            const summary = getContractSummary(contracts);
            
            expect(summary.totalContracts).toBe(3);
            expect(summary.uniqueContractIds).toBe(2);
            expect(summary.byStatus['inbearb']).toBe(2);
            expect(summary.byStatus['fertig']).toBe(1);
            expect(summary.byLocation['Berlin']).toBe(2);
            expect(summary.dateRange.earliest).toBe('2025-05-15');
            expect(summary.dateRange.latest).toBe('2025-07-01');
        });
        
        test('handles empty array', () => {
            const summary = getContractSummary([]);
            
            expect(summary.totalContracts).toBe(0);
            expect(summary.uniqueContractIds).toBe(0);
        });
        
        test('handles null input', () => {
            const summary = getContractSummary(null);
            
            expect(summary.totalContracts).toBe(0);
        });
    });
    
    describe('DEFAULT_COLUMN_MAPPING', () => {
        test('has required fields marked correctly', () => {
            expect(DEFAULT_COLUMN_MAPPING.contractId.required).toBe(true);
            expect(DEFAULT_COLUMN_MAPPING.contractTitle.required).toBe(true);
            expect(DEFAULT_COLUMN_MAPPING.status.required).toBe(true);
        });
        
        test('has optional fields marked correctly', () => {
            expect(DEFAULT_COLUMN_MAPPING.location.required).toBe(false);
            expect(DEFAULT_COLUMN_MAPPING.taskId.required).toBe(false);
        });
    });
    
    describe('VALID_STATUS_VALUES', () => {
        test('contains expected status values', () => {
            expect(VALID_STATUS_VALUES).toContain('inbearb');
            expect(VALID_STATUS_VALUES).toContain('fertig');
            expect(VALID_STATUS_VALUES).toContain('offen');
        });
    });
});
