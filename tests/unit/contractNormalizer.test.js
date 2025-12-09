/**
 * Unit Tests for Contract Normalizer Module (Phase 2)
 */

import {
    parseExcelDate,
    parseRowWithMapping,
    validateContractRow,
    normalizeContractData,
    createContractObject,
    processContractRow
} from '../../js/contracts/contractNormalizer.js';

describe('Contract Normalizer (contractNormalizer.js)', () => {
    
    describe('parseExcelDate()', () => {
        test('parses Excel serial date numbers', () => {
            // Excel serial date 45658 = 2025-01-01 (approximately)
            const result = parseExcelDate(45658);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
        
        test('parses ISO date strings', () => {
            expect(parseExcelDate('2025-06-15')).toBe('2025-06-15');
            expect(parseExcelDate('2025-12-31T12:00:00Z')).toBe('2025-12-31');
        });
        
        test('parses DD/MM/YYYY format', () => {
            expect(parseExcelDate('15/06/2025')).toBe('2025-06-15');
            expect(parseExcelDate('1/1/2025')).toBe('2025-01-01');
        });
        
        test('parses DD.MM.YYYY (German) format', () => {
            expect(parseExcelDate('15.06.2025')).toBe('2025-06-15');
            expect(parseExcelDate('1.1.2025')).toBe('2025-01-01');
        });
        
        test('handles Date objects', () => {
            const date = new Date(2025, 5, 15); // June 15, 2025
            const result = parseExcelDate(date);
            expect(result).toBe('2025-06-15');
        });
        
        test('returns null for invalid dates', () => {
            expect(parseExcelDate('not a date')).toBeNull();
            expect(parseExcelDate('')).toBeNull();
            expect(parseExcelDate(null)).toBeNull();
            expect(parseExcelDate(undefined)).toBeNull();
        });
        
        test('returns null for zero value', () => {
            // Zero is treated as "no date" rather than the Excel epoch
            expect(parseExcelDate(0)).toBeNull();
        });
    });
    
    describe('parseRowWithMapping()', () => {
        test('extracts values from row based on mapping', () => {
            const row = ['1406', 'Task1', 'INBEARB', 'Berlin'];
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string' },
                taskId: { excelColumn: 'B', type: 'string' },
                status: { excelColumn: 'C', type: 'string' },
                location: { excelColumn: 'D', type: 'string' }
            };
            
            const result = parseRowWithMapping(row, mapping);
            
            expect(result.contractId.raw).toBe('1406');
            expect(result.taskId.raw).toBe('Task1');
            expect(result.status.raw).toBe('INBEARB');
            expect(result.location.raw).toBe('Berlin');
        });
        
        test('handles missing values (out of bounds)', () => {
            const row = ['1406'];
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string' },
                status: { excelColumn: 'Z', type: 'string' }
            };
            
            const result = parseRowWithMapping(row, mapping);
            
            expect(result.contractId.raw).toBe('1406');
            expect(result.status.raw).toBeNull();
        });
        
        test('includes column metadata in result', () => {
            const row = ['Test'];
            const mapping = {
                field1: { excelColumn: 'A', type: 'date' }
            };
            
            const result = parseRowWithMapping(row, mapping);
            
            expect(result.field1.columnLetter).toBe('A');
            expect(result.field1.columnIndex).toBe(0);
            expect(result.field1.type).toBe('date');
        });
    });
    
    describe('validateContractRow()', () => {
        test('validates row with all required fields', () => {
            const rowData = {
                contractId: { raw: '1406' },
                contractTitle: { raw: 'Test Contract' },
                status: { raw: 'fertig' }
            };
            
            const result = validateContractRow(rowData, {});
            
            expect(result.isValid).toBe(true);
            expect(result.missingFields).toHaveLength(0);
        });
        
        test('reports missing required fields', () => {
            const rowData = {
                contractId: { raw: '' },
                contractTitle: { raw: null },
                status: { raw: 'fertig' }
            };
            
            const result = validateContractRow(rowData, {});
            
            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('contractId');
            expect(result.missingFields).toContain('contractTitle');
        });
        
        test('treats whitespace-only values as empty', () => {
            const rowData = {
                contractId: { raw: '   ' },
                contractTitle: { raw: 'Title' },
                status: { raw: 'offen' }
            };
            
            const result = validateContractRow(rowData, {});
            
            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('contractId');
        });
        
        test('warns about unknown status values', () => {
            const rowData = {
                contractId: { raw: '1406' },
                contractTitle: { raw: 'Title' },
                status: { raw: 'UNKNOWN_STATUS' }
            };
            
            const result = validateContractRow(rowData, {});
            
            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.type === 'unknown_status')).toBe(true);
        });
    });
    
    describe('normalizeContractData()', () => {
        test('normalizes string values (trims whitespace)', () => {
            const rowData = {
                field1: { raw: '  Test  ', type: 'string' }
            };
            const warnings = [];
            
            const result = normalizeContractData(rowData, warnings);
            
            expect(result.field1).toBe('Test');
        });
        
        test('converts date values', () => {
            const rowData = {
                dateField: { raw: '2025-06-15', type: 'date' }
            };
            const warnings = [];
            
            const result = normalizeContractData(rowData, warnings);
            
            expect(result.dateField).toBe('2025-06-15');
        });
        
        test('converts number values', () => {
            const rowData = {
                numField: { raw: '123.45', type: 'number' }
            };
            const warnings = [];
            
            const result = normalizeContractData(rowData, warnings);
            
            expect(result.numField).toBe(123.45);
        });
        
        test('handles null/empty values', () => {
            const rowData = {
                emptyField: { raw: null, type: 'string' },
                emptyString: { raw: '', type: 'string' }
            };
            const warnings = [];
            
            const result = normalizeContractData(rowData, warnings);
            
            expect(result.emptyField).toBeNull();
            expect(result.emptyString).toBeNull();
        });
        
        test('adds warnings for invalid conversions', () => {
            const rowData = {
                badDate: { raw: 'not-a-date', type: 'date' },
                badNumber: { raw: 'abc', type: 'number' }
            };
            const warnings = [];
            
            normalizeContractData(rowData, warnings);
            
            expect(warnings.some(w => w.type === 'invalid_date')).toBe(true);
            expect(warnings.some(w => w.type === 'invalid_number')).toBe(true);
        });
    });
    
    describe('createContractObject()', () => {
        test('creates contract object with all fields', () => {
            const normalized = {
                contractId: '1406',
                contractTitle: 'Test Contract',
                status: 'fertig',
                location: 'Berlin',
                equipmentId: 'EQ-001'
            };
            
            const result = createContractObject(normalized, 2, 'Sheet1', 'test.xlsx');
            
            expect(result.id).toBeDefined();
            expect(result.internalKey).toBe('1406_row_2');
            expect(result.contractId).toBe('1406');
            expect(result.contractTitle).toBe('Test Contract');
            expect(result.status).toBe('fertig');
            expect(result.location).toBe('Berlin');
        });
        
        test('includes source file metadata', () => {
            const normalized = { contractId: '1406', contractTitle: 'Test', status: 'offen' };
            
            const result = createContractObject(normalized, 5, 'DataSheet', 'data.xlsx');
            
            expect(result.sourceFile.fileName).toBe('data.xlsx');
            expect(result.sourceFile.sheet).toBe('DataSheet');
            expect(result.sourceFile.rowIndex).toBe(5);
            expect(result.sourceFile.importedAt).toBeDefined();
        });
        
        test('generates unique UUID', () => {
            const normalized = { contractId: '1406', contractTitle: 'Test', status: 'offen' };
            
            const result1 = createContractObject(normalized, 1, 'Sheet', 'file.xlsx');
            const result2 = createContractObject(normalized, 2, 'Sheet', 'file.xlsx');
            
            expect(result1.id).not.toBe(result2.id);
        });
        
        test('includes audit fields', () => {
            const normalized = { contractId: '1406', contractTitle: 'Test', status: 'offen' };
            
            const result = createContractObject(normalized, 1, 'Sheet', 'file.xlsx');
            
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
            expect(result.importVersion).toBe(1);
        });
        
        test('lowercases status value', () => {
            const normalized = { contractId: '1406', contractTitle: 'Test', status: 'FERTIG' };
            
            const result = createContractObject(normalized, 1, 'Sheet', 'file.xlsx');
            
            expect(result.status).toBe('fertig');
        });
        
        test('checks completeness based on recommended fields', () => {
            const complete = { 
                contractId: '1406', 
                contractTitle: 'Test', 
                status: 'offen',
                location: 'Berlin',
                equipmentId: 'EQ-001'
            };
            const incomplete = { 
                contractId: '1406', 
                contractTitle: 'Test', 
                status: 'offen'
            };
            
            const completeResult = createContractObject(complete, 1, 'Sheet', 'file.xlsx');
            const incompleteResult = createContractObject(incomplete, 2, 'Sheet', 'file.xlsx');
            
            expect(completeResult.isComplete).toBe(true);
            expect(incompleteResult.isComplete).toBe(false);
        });
    });
    
    describe('processContractRow()', () => {
        test('processes valid row successfully', () => {
            const row = ['1406', 'Test Contract', 'fertig'];
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string' },
                contractTitle: { excelColumn: 'B', type: 'string' },
                status: { excelColumn: 'C', type: 'string' }
            };
            
            const result = processContractRow(row, mapping, 2, 'Sheet1', 'test.xlsx');
            
            expect(result.contract).not.toBeNull();
            expect(result.contract.contractId).toBe('1406');
            expect(result.errors).toHaveLength(0);
        });
        
        test('returns errors for invalid row', () => {
            const row = ['', '', '']; // Missing required fields
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string' },
                contractTitle: { excelColumn: 'B', type: 'string' },
                status: { excelColumn: 'C', type: 'string' }
            };
            
            const result = processContractRow(row, mapping, 2, 'Sheet1', 'test.xlsx');
            
            expect(result.contract).toBeNull();
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].type).toBe('validation_error');
        });
        
        test('collects warnings during processing', () => {
            const row = ['1406', 'Test', 'UNKNOWN_STATUS'];
            const mapping = {
                contractId: { excelColumn: 'A', type: 'string' },
                contractTitle: { excelColumn: 'B', type: 'string' },
                status: { excelColumn: 'C', type: 'string' }
            };
            
            const result = processContractRow(row, mapping, 2, 'Sheet1', 'test.xlsx');
            
            expect(result.contract).not.toBeNull();
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });
});
