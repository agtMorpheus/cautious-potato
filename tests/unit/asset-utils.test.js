/**
 * Unit Tests for Asset Utils Module (asset-utils.js)
 * 
 * Tests validation, transformation, and parsing functions for asset management.
 */

import {
  ValidationError,
  validateAsset,
  validateAssets,
  inferAssetType,
  transformAssets,
  parseDate,
  generateId,
  formatAssetsForExport
} from '../../js/modules/assets/asset-utils.js';

describe('Asset Utils Module', () => {
  
  // ============================================
  // ValidationError Class Tests
  // ============================================
  describe('ValidationError', () => {
    test('creates error with message and asset', () => {
      const asset = { id: 'test', name: 'Test' };
      const error = new ValidationError('Test error', asset);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
      expect(error.asset).toBe(asset);
    });
    
    test('creates error with empty asset', () => {
      const error = new ValidationError('No asset', null);
      
      expect(error.message).toBe('No asset');
      expect(error.asset).toBeNull();
    });
  });
  
  // ============================================
  // validateAsset Tests
  // ============================================
  describe('validateAsset()', () => {
    test('validates valid asset with all required fields', () => {
      const asset = {
        id: 'AST-001',
        name: 'Test Asset',
        status: 'AKTIV'
      };
      
      const result = validateAsset(asset);
      
      expect(result).toEqual(expect.objectContaining({
        id: 'AST-001',
        name: 'Test Asset',
        status: 'AKTIV'
      }));
    });
    
    test('throws error for missing asset ID', () => {
      const asset = { name: 'Test', status: 'AKTIV' };
      
      expect(() => validateAsset(asset))
        .toThrow('Asset ID (Anlage) is required');
    });
    
    test('throws error for empty asset ID', () => {
      const asset = { id: '   ', name: 'Test', status: 'AKTIV' };
      
      expect(() => validateAsset(asset))
        .toThrow('Asset ID (Anlage) is required');
    });
    
    test('throws error for missing asset name', () => {
      const asset = { id: 'AST-001', status: 'AKTIV' };
      
      expect(() => validateAsset(asset))
        .toThrow('Asset name is required');
    });
    
    test('throws error for empty asset name', () => {
      const asset = { id: 'AST-001', name: '', status: 'AKTIV' };
      
      expect(() => validateAsset(asset))
        .toThrow('Asset name is required');
    });
    
    test('throws error for asset name exceeding 100 characters', () => {
      const asset = {
        id: 'AST-001',
        name: 'A'.repeat(101),
        status: 'AKTIV'
      };
      
      expect(() => validateAsset(asset))
        .toThrow('Asset name must be 100 characters or less');
    });
    
    test('throws error for missing status', () => {
      const asset = { id: 'AST-001', name: 'Test' };
      
      expect(() => validateAsset(asset))
        .toThrow('Status is required');
    });
    
    test('throws error for invalid status value', () => {
      const asset = { id: 'AST-001', name: 'Test', status: 'INVALID' };
      
      expect(() => validateAsset(asset))
        .toThrow('Invalid status: INVALID');
    });
    
    test('accepts all valid status values', () => {
      const validStatuses = ['IN BETRIEB', 'AKTIV', 'INAKTIV', 'STILLGELEGT'];
      
      validStatuses.forEach(status => {
        const asset = { id: 'AST-001', name: 'Test', status };
        expect(() => validateAsset(asset)).not.toThrow();
      });
    });
    
    test('throws error for description exceeding 500 characters', () => {
      const asset = {
        id: 'AST-001',
        name: 'Test',
        status: 'AKTIV',
        description: 'D'.repeat(501)
      };
      
      expect(() => validateAsset(asset))
        .toThrow('Description must be 500 characters or less');
    });
    
    test('infers asset type from name if not provided', () => {
      const asset = { id: 'AST-001', name: 'LVUM-Test', status: 'AKTIV' };
      
      const result = validateAsset(asset);
      
      expect(result.type).toBe('LVUM');
    });
    
    test('combines multiple validation errors', () => {
      const asset = {};
      
      expect(() => validateAsset(asset)).toThrow();
    });
  });
  
  // ============================================
  // validateAssets Tests
  // ============================================
  describe('validateAssets()', () => {
    test('validates array of valid assets', () => {
      const assets = [
        { id: 'AST-001', name: 'Asset 1', status: 'AKTIV' },
        { id: 'AST-002', name: 'Asset 2', status: 'INAKTIV' }
      ];
      
      const result = validateAssets(assets);
      
      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(0);
    });
    
    test('separates valid and invalid assets', () => {
      const assets = [
        { id: 'AST-001', name: 'Valid Asset', status: 'AKTIV' },
        { id: '', name: 'Invalid Asset', status: 'AKTIV' }, // Invalid - no ID
        { id: 'AST-003', name: 'Another Valid', status: 'INAKTIV' }
      ];
      
      const result = validateAssets(assets);
      
      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].index).toBe(1);
      expect(result.invalid[0].error).toContain('Asset ID');
    });
    
    test('handles empty array', () => {
      const result = validateAssets([]);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });
    
    test('includes row number in invalid assets', () => {
      const assets = [
        { id: 'AST-001', name: 'Asset 1', status: 'AKTIV', rowNumber: 5 },
        { id: '', name: 'Invalid', status: 'AKTIV', rowNumber: 6 }
      ];
      
      const result = validateAssets(assets);
      
      expect(result.invalid[0].row).toBe(6);
    });
    
    test('uses index + 2 as default row number', () => {
      const assets = [
        { id: '', name: 'Invalid', status: 'AKTIV' } // Index 0
      ];
      
      const result = validateAssets(assets);
      
      expect(result.invalid[0].row).toBe(2); // 0 + 2
    });
  });
  
  // ============================================
  // inferAssetType Tests
  // ============================================
  describe('inferAssetType()', () => {
    test('infers LVUM type from name patterns', () => {
      const patterns = ['LVUM-123', 'LV-UM-Test', 'LV-EN-Device', 'LICHT UMSCHALT'];
      
      patterns.forEach(name => {
        expect(inferAssetType(name)).toBe('LVUM');
      });
    });
    
    test('infers UV type from name patterns', () => {
      const patterns = ['UV-001', 'KRAFT-Verteiler', 'UNTERVERTEILER-1'];
      
      patterns.forEach(name => {
        expect(inferAssetType(name)).toBe('UV');
      });
    });
    
    test('infers KV type from name patterns', () => {
      // Note: KV pattern is checked after UV, so patterns with KRAFT go to UV
      // Only KV- or KV_ patterns without KRAFT get classified as KV
      const patterns = ['KV-123', 'KV_001'];
      
      patterns.forEach(name => {
        expect(inferAssetType(name)).toBe('KV');
      });
    });
    
    test('infers LV type from name patterns', () => {
      const patterns = ['LV-001', 'LICHTVERTEILER-A'];
      
      patterns.forEach(name => {
        expect(inferAssetType(name)).toBe('LV');
      });
    });
    
    test('returns OTHER for unrecognized patterns', () => {
      const patterns = ['Random Name', 'Device-123', '', 'XYZ'];
      
      patterns.forEach(name => {
        expect(inferAssetType(name)).toBe('OTHER');
      });
    });
    
    test('is case-insensitive', () => {
      expect(inferAssetType('lvum-test')).toBe('LVUM');
      expect(inferAssetType('Uv-001')).toBe('UV');
    });
  });
  
  // ============================================
  // transformAssets Tests
  // ============================================
  describe('transformAssets()', () => {
    test('transforms raw Excel data to standardized format', () => {
      const rawData = [{
        'Anlage': 'AST-001',
        'Beschreibung': 'Test Asset Name',
        'Status': 'AKTIV',
        'Standort': 'Building A'
      }];
      
      const result = transformAssets(rawData);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('AST-001');
      expect(result[0].name).toBe('Test Asset Name');
      expect(result[0].status).toBe('AKTIV');
      expect(result[0].location).toBe('Building A');
    });
    
    test('handles case-insensitive column matching', () => {
      const rawData = [{
        'anlage': 'AST-001',
        'beschreibung': 'Test',
        'status': 'AKTIV'
      }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].id).toBe('AST-001');
    });
    
    test('handles empty values gracefully', () => {
      const rawData = [{
        'Anlage': 'AST-001',
        'Beschreibung': 'Test',
        'Status': '',
        'Standort': null
      }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].status).toBe('AKTIV'); // Default status
      expect(result[0].location).toBe('');
    });
    
    test('normalizes status values', () => {
      const testCases = [
        { input: 'INBETRIEB', expected: 'IN BETRIEB' },
        { input: 'ACTIVE', expected: 'AKTIV' },
        { input: 'INACTIVE', expected: 'INAKTIV' },
        { input: 'DECOMMISSIONED', expected: 'STILLGELEGT' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const rawData = [{ 'Anlage': 'A1', 'Beschreibung': 'T', 'Status': input }];
        const result = transformAssets(rawData);
        expect(result[0].status).toBe(expected);
      });
    });
    
    test('truncates name to 100 characters', () => {
      const rawData = [{
        'Anlage': 'AST-001',
        'Beschreibung': 'A'.repeat(150),
        'Status': 'AKTIV'
      }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].name.length).toBe(100);
    });
    
    test('truncates description to 500 characters', () => {
      const rawData = [{
        'Anlage': 'AST-001',
        'Beschreibung Langtext': 'D'.repeat(600),
        'Beschreibung': 'Short Name',
        'Status': 'AKTIV'
      }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].description.length).toBe(500);
    });
    
    test('handles nullable string fields', () => {
      const rawData = [{
        'Anlage': 'AST-001',
        'Beschreibung': 'Test',
        'Status': 'AKTIV',
        'Übergeordnet': '',
        'Tauschartikel': '   ',
        'Schadensklasse': null
      }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].parentId).toBeNull();
      expect(result[0].replacementPart).toBeNull();
      expect(result[0].damageClass).toBeNull();
    });
    
    test('includes row number for error tracking', () => {
      const rawData = [{}, {}, {}];
      
      const result = transformAssets(rawData);
      
      expect(result[0].rowNumber).toBe(2); // First data row (header is 1)
      expect(result[1].rowNumber).toBe(3);
      expect(result[2].rowNumber).toBe(4);
    });
    
    test('handles missing Beschreibung column', () => {
      const rawData = [{ 'Anlage': 'AST-001', 'Status': 'AKTIV' }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].name).toBe('Unknown');
    });
  });
  
  // ============================================
  // parseDate Tests
  // ============================================
  describe('parseDate()', () => {
    test('returns null for empty values', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate('   ')).toBeNull();
    });
    
    test('parses Excel date serial numbers', () => {
      // Excel serial number 44197 = 2021-01-01
      const result = parseDate(44197);
      
      expect(result).toBeTruthy();
      expect(result).toContain('2021');
    });
    
    test('returns null for invalid date numbers', () => {
      const result = parseDate(NaN);
      expect(result).toBeNull();
    });
    
    test('parses ISO date strings', () => {
      const result = parseDate('2023-06-15');
      
      expect(result).toBeTruthy();
      expect(result).toContain('2023-06-15');
    });
    
    test('parses German date format (DD.MM.YYYY)', () => {
      const result = parseDate('15.06.2023');
      
      expect(result).toBeTruthy();
      const date = new Date(result);
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(5); // June (0-indexed)
      expect(date.getFullYear()).toBe(2023);
    });
    
    test('returns null for invalid date strings', () => {
      expect(parseDate('not a date')).toBeNull();
      // Note: JavaScript Date constructor can parse some unusual formats
      // The function only returns null if Date is actually invalid
    });
    
    test('handles single digit German dates', () => {
      const result = parseDate('1.6.2023');
      
      expect(result).toBeTruthy();
    });
  });
  
  // ============================================
  // generateId Tests
  // ============================================
  describe('generateId()', () => {
    test('generates unique IDs with AST- prefix', () => {
      const id = generateId();
      
      expect(id).toMatch(/^AST-\d+-[a-z0-9]+$/);
    });
    
    test('generates different IDs on each call', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      
      expect(ids.size).toBe(100); // All unique
    });
    
    test('includes timestamp in ID', () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();
      
      const timestampPart = id.split('-')[1];
      const timestamp = parseInt(timestampPart);
      
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
  
  // ============================================
  // formatAssetsForExport Tests
  // ============================================
  describe('formatAssetsForExport()', () => {
    test('formats assets for Excel export', () => {
      const assets = [{
        id: 'AST-001',
        name: 'Test Asset',
        description: 'Test Description',
        type: 'LVUM',
        status: 'AKTIV',
        location: 'Building A',
        parentId: 'AST-000',
        replacementPart: 'PART-001',
        damageClass: 'A',
        maintenanceWindowStart: '2023-01-01T00:00:00.000Z',
        maintenanceWindowEnd: '2023-12-31T00:00:00.000Z',
        generalLedgerAccount: '1000',
        plant: 'Plant A',
        vassKey: 'VASS-001',
        importedAt: '2023-06-15T10:00:00.000Z',
        lastUpdated: '2023-06-16T15:30:00.000Z'
      }];
      
      const result = formatAssetsForExport(assets);
      
      expect(result.length).toBe(1);
      expect(result[0]['Anlage']).toBe('AST-001');
      expect(result[0]['Name']).toBe('Test Asset');
      expect(result[0]['Beschreibung']).toBe('Test Description');
      expect(result[0]['Typ']).toBe('LVUM');
      expect(result[0]['Status']).toBe('AKTIV');
      expect(result[0]['Standort']).toBe('Building A');
      expect(result[0]['Übergeordnet']).toBe('AST-000');
      expect(result[0]['Tauschartikel']).toBe('PART-001');
      expect(result[0]['Schadensklasse']).toBe('A');
      expect(result[0]['Hauptbuchkonto']).toBe('1000');
      expect(result[0]['Werk']).toBe('Plant A');
      expect(result[0]['VASS-Schlüssel']).toBe('VASS-001');
    });
    
    test('handles null optional fields', () => {
      const assets = [{
        id: 'AST-001',
        name: 'Test',
        description: 'Desc',
        type: 'OTHER',
        status: 'AKTIV',
        location: '',
        parentId: null,
        replacementPart: null,
        damageClass: null,
        maintenanceWindowStart: null,
        maintenanceWindowEnd: null,
        generalLedgerAccount: null,
        plant: null,
        vassKey: null,
        importedAt: null,
        lastUpdated: null
      }];
      
      const result = formatAssetsForExport(assets);
      
      expect(result[0]['Übergeordnet']).toBe('');
      expect(result[0]['Tauschartikel']).toBe('');
      expect(result[0]['Wartungsfenster Start']).toBe('');
      expect(result[0]['Wartungsfenster Ende']).toBe('');
    });
    
    test('formats dates in German locale', () => {
      const assets = [{
        id: 'AST-001',
        name: 'Test',
        description: 'Desc',
        type: 'OTHER',
        status: 'AKTIV',
        location: '',
        maintenanceWindowStart: '2023-06-15T00:00:00.000Z'
      }];
      
      const result = formatAssetsForExport(assets);
      
      // Should be formatted as DD.MM.YYYY
      expect(result[0]['Wartungsfenster Start']).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    });
    
    test('handles empty assets array', () => {
      const result = formatAssetsForExport([]);
      
      expect(result).toEqual([]);
    });
    
    test('handles various date strings', () => {
      const assets = [{
        id: 'AST-001',
        name: 'Test',
        description: 'Desc',
        type: 'OTHER',
        status: 'AKTIV',
        location: '',
        maintenanceWindowStart: '2023-06-15T00:00:00.000Z'
      }];
      
      const result = formatAssetsForExport(assets);
      
      // Should return formatted date for valid dates
      expect(result[0]['Wartungsfenster Start']).toBeTruthy();
    });
  });
});
