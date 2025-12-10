/**
 * asset-utils.test.js
 * Unit tests for the Asset utility functions
 */

import {
  validateAsset,
  validateAssetForm,
  inferAssetType,
  transformAssets,
  parseDate,
  formatDate,
  filterAssets,
  sortAssets,
  getUniqueValues,
  escapeHtml,
  ValidationError
} from '../../js/assets/asset-utils.js';

describe('Asset Utils', () => {

  // ===== VALIDATION =====
  describe('validateAsset()', () => {
    test('validates a valid asset', () => {
      const asset = {
        id: 'A-001',
        name: 'Test Asset',
        status: 'IN BETRIEB'
      };
      
      const result = validateAsset(asset);
      expect(result.id).toBe('A-001');
    });

    test('throws on missing ID', () => {
      const asset = { name: 'Test', status: 'AKTIV' };
      
      expect(() => validateAsset(asset)).toThrow(ValidationError);
    });

    test('throws on missing name', () => {
      const asset = { id: 'A-001', status: 'AKTIV' };
      
      expect(() => validateAsset(asset)).toThrow(ValidationError);
    });

    test('throws on missing status', () => {
      const asset = { id: 'A-001', name: 'Test' };
      
      expect(() => validateAsset(asset)).toThrow(ValidationError);
    });

    test('throws on invalid status', () => {
      const asset = { id: 'A-001', name: 'Test', status: 'INVALID' };
      
      expect(() => validateAsset(asset)).toThrow(ValidationError);
    });

    test('throws on name exceeding 100 characters', () => {
      const asset = {
        id: 'A-001',
        name: 'A'.repeat(101),
        status: 'AKTIV'
      };
      
      expect(() => validateAsset(asset)).toThrow(ValidationError);
    });
  });

  describe('validateAssetForm()', () => {
    test('validates valid form data', () => {
      const data = { name: 'Test', status: 'AKTIV' };
      const result = validateAssetForm(data);
      
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('returns error for empty name', () => {
      const data = { name: '', status: 'AKTIV' };
      const result = validateAssetForm(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeTruthy();
    });

    test('returns error for empty status', () => {
      const data = { name: 'Test', status: '' };
      const result = validateAssetForm(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.status).toBeTruthy();
    });

    test('validates maintenance window dates', () => {
      const data = {
        name: 'Test',
        status: 'AKTIV',
        maintenanceWindowStart: '2025-01-01',
        maintenanceWindowEnd: '2024-12-31' // End before start
      };
      const result = validateAssetForm(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.maintenanceWindowEnd).toBeTruthy();
    });
  });

  // ===== TYPE INFERENCE =====
  describe('inferAssetType()', () => {
    test('infers LVUM type', () => {
      expect(inferAssetType('LVUM-17')).toBe('LVUM');
      expect(inferAssetType('LV-UM Test')).toBe('LVUM');
      expect(inferAssetType('LV-EN-123')).toBe('LVUM');
    });

    test('infers UV type', () => {
      expect(inferAssetType('UV-01')).toBe('UV');
      expect(inferAssetType('KRAFT-UV')).toBe('UV');
      expect(inferAssetType('Unterverteiler')).toBe('UV');
    });

    test('infers KV type', () => {
      expect(inferAssetType('KV-123')).toBe('KV');
      expect(inferAssetType('KV_Test')).toBe('KV');
    });

    test('infers LV type', () => {
      expect(inferAssetType('LV-Test')).toBe('LV');
    });

    test('returns OTHER for unknown patterns', () => {
      expect(inferAssetType('Unknown Asset')).toBe('OTHER');
      expect(inferAssetType('')).toBe('OTHER');
    });
  });

  // ===== DATE PARSING =====
  describe('parseDate()', () => {
    test('parses string dates', () => {
      expect(parseDate('2025-01-15')).toBe('2025-01-15');
    });

    test('handles Excel serial numbers', () => {
      // 45658 is approximately 2024-12-10
      const result = parseDate(45658);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('returns null for empty values', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });

    test('returns null for invalid dates', () => {
      expect(parseDate('not-a-date')).toBeNull();
    });
  });

  describe('formatDate()', () => {
    test('formats ISO date string to German locale', () => {
      const result = formatDate('2025-01-15');
      expect(result).toMatch(/15\.01\.2025/);
    });

    test('returns dash for empty values', () => {
      expect(formatDate('')).toBe('-');
      expect(formatDate(null)).toBe('-');
    });
  });

  // ===== DATA TRANSFORMATION =====
  describe('transformAssets()', () => {
    test('transforms raw Excel data to asset format', () => {
      const rawData = [
        {
          'Anlage': 'A-001',
          'Beschreibung': 'LVUM-17 Test',
          'Status': 'IN BETRIEB',
          'Standort': '1100-0BT01',
          'Werk': '1100'
        }
      ];
      
      const result = transformAssets(rawData);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('A-001');
      expect(result[0].name).toBe('LVUM-17 Test');
      expect(result[0].status).toBe('IN BETRIEB');
      expect(result[0].location).toBe('1100-0BT01');
      expect(result[0].plant).toBe('1100');
      expect(result[0].type).toBe('LVUM');
    });

    test('handles missing fields', () => {
      const rawData = [
        { 'Anlage': 'A-001' }
      ];
      
      const result = transformAssets(rawData);
      
      expect(result[0].id).toBe('A-001');
      expect(result[0].name).toBe('Unknown');
      expect(result[0].status).toBe('AKTIV');
    });

    test('includes row number for error reporting', () => {
      const rawData = [{ 'Anlage': 'A-001' }, { 'Anlage': 'A-002' }];
      
      const result = transformAssets(rawData);
      
      expect(result[0].rowNumber).toBe(2);
      expect(result[1].rowNumber).toBe(3);
    });
  });

  // ===== FILTERING =====
  describe('filterAssets()', () => {
    const testAssets = [
      { id: 'A-001', name: 'LVUM-17', status: 'IN BETRIEB', plant: '1100', type: 'LVUM' },
      { id: 'A-002', name: 'UV-01', status: 'AKTIV', plant: '1100', type: 'UV' },
      { id: 'A-003', name: 'KV-05', status: 'INAKTIV', plant: '1200', type: 'KV' }
    ];

    test('filters by search term', () => {
      const result = filterAssets(testAssets, { searchTerm: 'LVUM' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('A-001');
    });

    test('filters by status', () => {
      const result = filterAssets(testAssets, { status: 'AKTIV' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('A-002');
    });

    test('filters by plant', () => {
      const result = filterAssets(testAssets, { plant: '1100' });
      expect(result.length).toBe(2);
    });

    test('filters by type', () => {
      const result = filterAssets(testAssets, { type: 'KV' });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('A-003');
    });

    test('combines multiple filters', () => {
      const result = filterAssets(testAssets, { 
        plant: '1100', 
        status: 'IN BETRIEB' 
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('A-001');
    });

    test('returns all assets when no filters', () => {
      const result = filterAssets(testAssets, {});
      expect(result.length).toBe(3);
    });
  });

  // ===== SORTING =====
  describe('sortAssets()', () => {
    const testAssets = [
      { id: 'A-003', name: 'Charlie' },
      { id: 'A-001', name: 'Alpha' },
      { id: 'A-002', name: 'Bravo' }
    ];

    test('sorts by field ascending', () => {
      const result = sortAssets(testAssets, 'name', 'asc');
      expect(result[0].name).toBe('Alpha');
      expect(result[1].name).toBe('Bravo');
      expect(result[2].name).toBe('Charlie');
    });

    test('sorts by field descending', () => {
      const result = sortAssets(testAssets, 'name', 'desc');
      expect(result[0].name).toBe('Charlie');
      expect(result[2].name).toBe('Alpha');
    });

    test('sorts by id', () => {
      const result = sortAssets(testAssets, 'id', 'asc');
      expect(result[0].id).toBe('A-001');
    });
  });

  // ===== UNIQUE VALUES =====
  describe('getUniqueValues()', () => {
    const testAssets = [
      { plant: '1100' },
      { plant: '1200' },
      { plant: '1100' },
      { plant: null },
      { plant: '1300' }
    ];

    test('returns unique values sorted', () => {
      const result = getUniqueValues(testAssets, 'plant');
      expect(result).toEqual(['1100', '1200', '1300']);
    });

    test('excludes null/undefined values', () => {
      const result = getUniqueValues(testAssets, 'plant');
      expect(result).not.toContain(null);
    });
  });

  // ===== HTML ESCAPING =====
  describe('escapeHtml()', () => {
    test('escapes special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(escapeHtml("'test'")).toBe('&#39;test&#39;');
      expect(escapeHtml('&')).toBe('&amp;');
    });

    test('handles null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    test('converts non-strings', () => {
      expect(escapeHtml(123)).toBe('123');
    });
  });
});
