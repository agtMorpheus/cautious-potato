/**
 * Unit Tests for Validation Module (validation.js)
 * Tests validation functions for state data structures
 */

import {
  validateMetadata,
  validatePositions,
  validateAbrechnungData,
  validateUIStatus,
  validateStateStructure,
  validateContractsSection,
  validateContractRecord,
  validateContractMapping,
  validateContractFileInfo
} from '../../js/validation.js';

describe('Validation Module (validation.js)', () => {
  
  describe('validateMetadata()', () => {
    test('returns invalid for null metadata', () => {
      const result = validateMetadata(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Metadata is missing');
    });

    test('returns invalid for undefined metadata', () => {
      const result = validateMetadata(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Metadata is missing');
    });

    test('returns all errors for empty object', () => {
      const result = validateMetadata({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Protocol number is required');
      expect(result.errors).toContain('Order number is required');
      expect(result.errors).toContain('Plant (Anlage) is required');
      expect(result.errors).toContain('Location (Einsatzort) is required');
      expect(result.errors).toContain('Company (Firma) is required');
      expect(result.errors).toContain('Date is required');
    });

    test('validates date format', () => {
      const result = validateMetadata({
        protocolNumber: 'P001',
        orderNumber: 'O001',
        plant: 'Plant A',
        location: 'Location A',
        company: 'Company A',
        date: 'invalid-date'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date must be a valid date string');
    });

    test('returns valid for complete metadata', () => {
      const result = validateMetadata({
        protocolNumber: 'P001',
        orderNumber: 'O001',
        plant: 'Plant A',
        location: 'Location A',
        company: 'Company A',
        date: '2025-01-01'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('accepts valid ISO date string', () => {
      const result = validateMetadata({
        protocolNumber: 'P001',
        orderNumber: 'O001',
        plant: 'Plant A',
        location: 'Location A',
        company: 'Company A',
        date: '2025-12-11T04:58:49.849Z'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePositions()', () => {
    test('returns invalid when input is not an array', () => {
      const result = validatePositions('not an array');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Positions must be an array');
    });

    test('returns invalid when input is null', () => {
      const result = validatePositions(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Positions must be an array');
    });

    test('returns valid for empty array', () => {
      const result = validatePositions([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid for non-object position', () => {
      const result = validatePositions([null, 'string', 123]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not an object'))).toBe(true);
    });

    test('returns invalid for position without posNr', () => {
      const result = validatePositions([{ menge: 5 }]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid posNr'))).toBe(true);
    });

    test('returns invalid for position with non-string posNr', () => {
      const result = validatePositions([{ posNr: 123, menge: 5 }]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid posNr'))).toBe(true);
    });

    test('returns invalid for position with non-numeric menge', () => {
      const result = validatePositions([{ posNr: '01.01.0010', menge: 'five' }]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid menge'))).toBe(true);
    });

    test('returns invalid for position with Infinity menge', () => {
      const result = validatePositions([{ posNr: '01.01.0010', menge: Infinity }]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid menge'))).toBe(true);
    });

    test('returns valid for valid positions', () => {
      const result = validatePositions([
        { posNr: '01.01.0010', menge: 5 },
        { posNr: '01.01.0020', menge: 3.5 }
      ]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateAbrechnungData()', () => {
    test('returns invalid for null input', () => {
      const result = validateAbrechnungData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('abrechnungData is missing or invalid');
    });

    test('returns invalid for non-object input', () => {
      const result = validateAbrechnungData('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('abrechnungData is missing or invalid');
    });

    test('returns invalid for missing header', () => {
      const result = validateAbrechnungData({ positionen: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Abrechnung header is missing');
    });

    test('returns invalid for missing or invalid positionen', () => {
      const result = validateAbrechnungData({ header: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Abrechnung positions must be an object map');
    });

    test('accepts array positionen (typeof returns "object" for arrays)', () => {
      // Note: In JavaScript, typeof [] === 'object', so the current validation 
      // using typeof === 'object' will accept arrays. A stricter implementation
      // could use !Array.isArray() to reject arrays if needed.
      const result = validateAbrechnungData({ header: {}, positionen: [] });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns valid for complete data', () => {
      const result = validateAbrechnungData({
        header: { orderNumber: 'O001' },
        positionen: { '01.01.0010': 5 }
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUIStatus()', () => {
    test('returns true for idle status', () => {
      expect(validateUIStatus('idle')).toBe(true);
    });

    test('returns true for pending status', () => {
      expect(validateUIStatus('pending')).toBe(true);
    });

    test('returns true for success status', () => {
      expect(validateUIStatus('success')).toBe(true);
    });

    test('returns true for error status', () => {
      expect(validateUIStatus('error')).toBe(true);
    });

    test('returns false for invalid status', () => {
      expect(validateUIStatus('loading')).toBe(false);
      expect(validateUIStatus('unknown')).toBe(false);
      expect(validateUIStatus('')).toBe(false);
      expect(validateUIStatus(null)).toBe(false);
    });
  });

  describe('validateStateStructure()', () => {
    test('returns invalid for null state', () => {
      const result = validateStateStructure(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('State is missing or not an object');
    });

    test('returns invalid for non-object state', () => {
      const result = validateStateStructure('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('State is missing or not an object');
    });

    test('returns invalid for missing required keys', () => {
      const result = validateStateStructure({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required state key: protokollData');
      expect(result.errors).toContain('Missing required state key: abrechnungData');
      expect(result.errors).toContain('Missing required state key: ui');
      expect(result.errors).toContain('Missing required state key: meta');
    });

    test('returns invalid for missing meta.version', () => {
      const result = validateStateStructure({
        protokollData: {},
        abrechnungData: {},
        ui: { import: {}, generate: {}, export: {} },
        meta: {}
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('State meta.version is missing');
    });

    test('returns invalid for missing or invalid UI sections', () => {
      const result = validateStateStructure({
        protokollData: {},
        abrechnungData: {},
        ui: {},
        meta: { version: '1.0' }
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("UI section 'import'"))).toBe(true);
      expect(result.errors.some(e => e.includes("UI section 'generate'"))).toBe(true);
      expect(result.errors.some(e => e.includes("UI section 'export'"))).toBe(true);
    });

    test('validates contracts section if present', () => {
      const result = validateStateStructure({
        protokollData: {},
        abrechnungData: {},
        ui: { import: {}, generate: {}, export: {} },
        meta: { version: '1.0' },
        contracts: { importedFiles: 'not an array' }
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('importedFiles must be an array'))).toBe(true);
    });

    test('returns valid for complete state structure', () => {
      const result = validateStateStructure({
        protokollData: {},
        abrechnungData: {},
        ui: { import: {}, generate: {}, export: {} },
        meta: { version: '1.0' }
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateContractsSection()', () => {
    test('returns invalid for null contracts', () => {
      const result = validateContractsSection(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contracts section is missing or invalid');
    });

    test('returns invalid for non-object contracts', () => {
      const result = validateContractsSection('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contracts section is missing or invalid');
    });

    test('returns invalid for non-array importedFiles', () => {
      const result = validateContractsSection({ importedFiles: 'not array' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('contracts.importedFiles must be an array');
    });

    test('returns invalid for non-array records', () => {
      const result = validateContractsSection({ records: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('contracts.records must be an array');
    });

    test('returns invalid for non-object filters', () => {
      const result = validateContractsSection({ filters: 'string' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('contracts.filters must be an object');
    });

    test('returns invalid for non-object importState', () => {
      const result = validateContractsSection({ importState: 'string' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('contracts.importState must be an object');
    });

    test('returns valid for empty object', () => {
      const result = validateContractsSection({});
      expect(result.valid).toBe(true);
    });

    test('returns valid for complete contracts section', () => {
      const result = validateContractsSection({
        importedFiles: [],
        records: [],
        filters: {},
        importState: {}
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateContractRecord()', () => {
    test('returns invalid for null contract', () => {
      const result = validateContractRecord(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must be an object');
    });

    test('returns invalid for non-object contract', () => {
      const result = validateContractRecord('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract must be an object');
    });

    test('returns invalid for missing contractId', () => {
      const result = validateContractRecord({
        contractTitle: 'Title',
        status: 'offen'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract ID is required');
    });

    test('returns invalid for empty contractId', () => {
      const result = validateContractRecord({
        contractId: '   ',
        contractTitle: 'Title',
        status: 'offen'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract ID is required');
    });

    test('returns invalid for missing contractTitle', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        status: 'offen'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract title is required');
    });

    test('returns invalid for missing status', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Title'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Status is required');
    });

    test('returns warning for unknown status value', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Title',
        status: 'unknown'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Unknown status value'))).toBe(true);
    });

    test('accepts valid status values', () => {
      const validStatuses = ['inbearb', 'fertig', 'offen', 'INBEARB', 'Fertig', 'OFFEN'];
      validStatuses.forEach(status => {
        const result = validateContractRecord({
          contractId: 'C001',
          contractTitle: 'Title',
          status: status
        });
        expect(result.valid).toBe(true);
      });
    });

    test('returns warning for invalid date format', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Title',
        status: 'offen',
        plannedStart: 'invalid-date'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('invalid format'))).toBe(true);
    });

    test('accepts valid date format', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Title',
        status: 'offen',
        plannedStart: '2025-12-11'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.filter(w => w.includes('date'))).toHaveLength(0);
    });

    test('returns warning for invalid UUID format', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Title',
        status: 'offen',
        id: 'not-a-uuid'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('not a valid UUID'))).toBe(true);
    });

    test('accepts valid UUID format', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Title',
        status: 'offen',
        id: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.filter(w => w.includes('UUID'))).toHaveLength(0);
    });

    test('returns valid for complete contract record', () => {
      const result = validateContractRecord({
        contractId: 'C001',
        contractTitle: 'Test Contract',
        status: 'inbearb',
        plannedStart: '2025-01-01',
        id: '550e8400-e29b-41d4-a716-446655440000'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateContractMapping()', () => {
    test('returns invalid for null mapping', () => {
      const result = validateContractMapping(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mapping must be an object');
    });

    test('returns invalid for non-object mapping', () => {
      const result = validateContractMapping('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mapping must be an object');
    });

    test('returns invalid for missing required field mappings', () => {
      const result = validateContractMapping({});
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('contractId'))).toBe(true);
      expect(result.errors.some(e => e.includes('contractTitle'))).toBe(true);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    test('returns invalid for missing excelColumn in required field', () => {
      const result = validateContractMapping({
        contractId: {},
        contractTitle: { excelColumn: 'A' },
        status: { excelColumn: 'B' }
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('contractId'))).toBe(true);
    });

    test('returns invalid for invalid column format', () => {
      const result = validateContractMapping({
        contractId: { excelColumn: 'AA1' },
        contractTitle: { excelColumn: 'B' },
        status: { excelColumn: 'C' }
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid column format'))).toBe(true);
    });

    test('returns warning for duplicate column mappings', () => {
      const result = validateContractMapping({
        contractId: { excelColumn: 'A' },
        contractTitle: { excelColumn: 'A' },
        status: { excelColumn: 'B' }
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('mapped to multiple fields'))).toBe(true);
    });

    test('accepts valid column formats', () => {
      const result = validateContractMapping({
        contractId: { excelColumn: 'A' },
        contractTitle: { excelColumn: 'B' },
        status: { excelColumn: 'C' },
        description: { excelColumn: 'AB' },
        notes: { excelColumn: 'XYZ' }
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns valid for complete mapping', () => {
      const result = validateContractMapping({
        contractId: { excelColumn: 'A' },
        contractTitle: { excelColumn: 'B' },
        status: { excelColumn: 'C' }
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateContractFileInfo()', () => {
    test('returns invalid for null fileInfo', () => {
      const result = validateContractFileInfo(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File info must be an object');
    });

    test('returns invalid for non-object fileInfo', () => {
      const result = validateContractFileInfo('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File info must be an object');
    });

    test('returns invalid for missing fileName', () => {
      const result = validateContractFileInfo({
        size: 1000,
        recordsImported: 10
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File name is required');
    });

    test('returns invalid for non-string fileName', () => {
      const result = validateContractFileInfo({
        fileName: 123,
        size: 1000,
        recordsImported: 10
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File name is required');
    });

    test('returns invalid for missing or invalid size', () => {
      const result = validateContractFileInfo({
        fileName: 'test.xlsx',
        recordsImported: 10
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size must be a non-negative number');
    });

    test('returns invalid for negative size', () => {
      const result = validateContractFileInfo({
        fileName: 'test.xlsx',
        size: -1,
        recordsImported: 10
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size must be a non-negative number');
    });

    test('returns invalid for missing or invalid recordsImported', () => {
      const result = validateContractFileInfo({
        fileName: 'test.xlsx',
        size: 1000
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Records imported must be a non-negative number');
    });

    test('returns invalid for negative recordsImported', () => {
      const result = validateContractFileInfo({
        fileName: 'test.xlsx',
        size: 1000,
        recordsImported: -5
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Records imported must be a non-negative number');
    });

    test('returns valid for zero values', () => {
      const result = validateContractFileInfo({
        fileName: 'test.xlsx',
        size: 0,
        recordsImported: 0
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns valid for complete file info', () => {
      const result = validateContractFileInfo({
        fileName: 'contracts.xlsx',
        size: 25600,
        recordsImported: 150
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
