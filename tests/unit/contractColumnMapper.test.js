/**
 * Unit Tests for Contract Column Mapper Module (Phase 2)
 */

import {
    inferColumnType,
    discoverContractSheets,
    suggestContractColumnMapping
} from '../../js/contracts/contractColumnMapper.js';

describe('Contract Column Mapper (contractColumnMapper.js)', () => {
    
    describe('inferColumnType()', () => {
        test('infers string type for text values', () => {
            const samples = ['Hello', 'World', 'Test'];
            expect(inferColumnType(samples, 'Name')).toBe('string');
        });
        
        test('infers number type for numeric values', () => {
            const samples = [123, 456.78, 0];
            expect(inferColumnType(samples, 'Amount')).toBe('number');
        });
        
        test('infers date type from header keywords', () => {
            expect(inferColumnType([], 'Meldedatum')).toBe('date');
            expect(inferColumnType([], 'Start Date')).toBe('date');
            expect(inferColumnType([], 'Sollstart')).toBe('date');
        });
        
        test('infers number type from header keywords', () => {
            expect(inferColumnType([], 'Betrag')).toBe('number');
            expect(inferColumnType([], 'Preis')).toBe('number');
            expect(inferColumnType([], 'Menge')).toBe('number');
        });
        
        test('infers date type from Excel serial numbers', () => {
            const samples = [45500, 45600, 45700]; // Excel serial dates
            expect(inferColumnType(samples, 'Column')).toBe('date');
        });
        
        test('infers date type from ISO date strings', () => {
            const samples = ['2025-01-15', '2025-02-20', '2025-03-25'];
            expect(inferColumnType(samples, 'Column')).toBe('date');
        });
        
        test('handles empty samples array', () => {
            expect(inferColumnType([], 'Text')).toBe('string');
        });
        
        test('handles null and undefined values in samples', () => {
            const samples = [null, undefined, '', 'Test'];
            expect(inferColumnType(samples, 'Column')).toBe('string');
        });
    });
    
    describe('discoverContractSheets()', () => {
        test('discovers sheets and extracts metadata', () => {
            const mockWorkbook = {
                SheetNames: ['Sheet1', 'Sheet2'],
                Sheets: {
                    'Sheet1': {
                        '!ref': 'A1:C5',
                        'A1': { v: 'Auftrag' },
                        'B1': { v: 'Status' },
                        'C1': { v: 'Datum' },
                        'A2': { v: '1406' },
                        'B2': { v: 'fertig' },
                        'C2': { v: 45500 }
                    },
                    'Sheet2': {
                        '!ref': 'A1:B3',
                        'A1': { v: 'Name' },
                        'B1': { v: 'Value' }
                    }
                }
            };
            
            const result = discoverContractSheets(mockWorkbook);
            
            expect(result.sheets).toHaveLength(2);
            expect(result.sheets[0].name).toBe('Sheet1');
            expect(result.sheets[0].rowCount).toBe(4); // 5 rows - 1 header
            expect(result.sheets[0].columns).toHaveLength(3);
            expect(result.sheets[0].columns[0].header).toBe('Auftrag');
            expect(result.sheets[0].columns[0].letter).toBe('A');
        });
        
        test('extracts sample values from columns', () => {
            const mockWorkbook = {
                SheetNames: ['Data'],
                Sheets: {
                    'Data': {
                        '!ref': 'A1:A4',
                        'A1': { v: 'Header' },
                        'A2': { v: 'Value1' },
                        'A3': { v: 'Value2' },
                        'A4': { v: 'Value3' }
                    }
                }
            };
            
            const result = discoverContractSheets(mockWorkbook);
            
            expect(result.sheets[0].columns[0].sampleValues).toContain('Value1');
            expect(result.sheets[0].columns[0].sampleValues).toContain('Value2');
        });
        
        test('throws error for null workbook', () => {
            expect(() => discoverContractSheets(null)).toThrow();
        });
        
        test('throws error for workbook with no sheets', () => {
            const emptyWorkbook = { SheetNames: [], Sheets: {} };
            expect(() => discoverContractSheets(emptyWorkbook)).toThrow();
        });
        
        test('handles empty worksheets gracefully', () => {
            const mockWorkbook = {
                SheetNames: ['Empty'],
                Sheets: {
                    'Empty': {}
                }
            };
            
            const result = discoverContractSheets(mockWorkbook);
            
            expect(result.sheets[0].isEmpty).toBe(true);
            expect(result.sheets[0].rowCount).toBe(0);
        });
    });
    
    describe('suggestContractColumnMapping()', () => {
        test('maps columns based on header patterns', () => {
            const discoveredSheets = {
                sheets: [{
                    name: 'Test',
                    columns: [
                        { letter: 'A', header: 'Auftragsnummer', inferredType: 'string' },
                        { letter: 'B', header: 'Titel', inferredType: 'string' },
                        { letter: 'C', header: 'Status', inferredType: 'string' },
                        { letter: 'D', header: 'Standort', inferredType: 'string' }
                    ]
                }]
            };
            
            const result = suggestContractColumnMapping(discoveredSheets);
            
            expect(result.mapping.contractId.excelColumn).toBe('A');
            expect(result.mapping.contractTitle.excelColumn).toBe('B');
            expect(result.mapping.status.excelColumn).toBe('C');
            expect(result.mapping.location.excelColumn).toBe('D');
        });
        
        test('includes confidence scores', () => {
            const discoveredSheets = {
                sheets: [{
                    name: 'Test',
                    columns: [
                        { letter: 'A', header: 'Auftrag', inferredType: 'string' }
                    ]
                }]
            };
            
            const result = suggestContractColumnMapping(discoveredSheets);
            
            expect(result.mapping.contractId.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeDefined();
            expect(result.averageConfidence).toBeDefined();
        });
        
        test('identifies unmapped columns', () => {
            const discoveredSheets = {
                sheets: [{
                    name: 'Test',
                    columns: [
                        { letter: 'A', header: 'Auftrag', inferredType: 'string' },
                        { letter: 'B', header: 'UnknownColumn', inferredType: 'string' },
                        { letter: 'C', header: 'AnotherUnknown', inferredType: 'string' }
                    ]
                }]
            };
            
            const result = suggestContractColumnMapping(discoveredSheets);
            
            expect(result.unmappedColumns).toContain('B');
            expect(result.unmappedColumns).toContain('C');
        });
        
        test('warns about missing required fields', () => {
            const discoveredSheets = {
                sheets: [{
                    name: 'Test',
                    columns: [
                        { letter: 'A', header: 'Unknown', inferredType: 'string' }
                    ]
                }]
            };
            
            const result = suggestContractColumnMapping(discoveredSheets);
            
            expect(result.missingRequired).toBeDefined();
            expect(result.missingRequired.length).toBeGreaterThan(0);
        });
        
        test('returns error for empty sheets', () => {
            const result = suggestContractColumnMapping({ sheets: [] });
            
            expect(result.error).toBeDefined();
        });
        
        test('returns error for null input', () => {
            const result = suggestContractColumnMapping(null);
            
            expect(result.error).toBeDefined();
        });
    });
});
