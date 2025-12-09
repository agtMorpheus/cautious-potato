/**
 * protokoll-validator.test.js
 * Comprehensive validation tests
 */

import * as validator from '../../js/protokoll/protokoll-validator.js';
import * as state from '../../js/protokoll/protokoll-state.js';

describe('Protokoll Validator', () => {
  
  beforeEach(() => {
    localStorage.clear();
    state.init();
  });

  // ===== FIELD VALIDATION =====
  describe('Field Validation', () => {
    test('validates required fields - returns false for empty', () => {
      const result = validator.validateField('metadata.auftraggeber', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('validates required fields - returns true for valid value', () => {
      const result = validator.validateField('metadata.auftraggeber', 'Test Company');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('validates pattern matching - valid protocol number', () => {
      const result = validator.validateField('metadata.protokollNumber', 'EDB101120250925');
      expect(result.isValid).toBe(true);
    });

    test('validates pattern matching - invalid protocol number', () => {
      const result = validator.validateField('metadata.protokollNumber', 'invalid-number!');
      expect(result.isValid).toBe(false);
    });

    test('validates min length', () => {
      const result = validator.validateField('metadata.auftraggeber', 'AB');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    test('validates max length', () => {
      const longString = 'A'.repeat(101);
      const result = validator.validateField('metadata.auftraggeber', longString);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at most 100 characters');
    });

    test('validates enum values - valid', () => {
      const result = validator.validateField('metadata.facility.netzform', 'TN-S');
      expect(result.isValid).toBe(true);
    });

    test('validates enum values - invalid', () => {
      const result = validator.validateField('metadata.facility.netzform', 'INVALID');
      expect(result.isValid).toBe(false);
    });

    test('validates number ranges - valid', () => {
      const result = validator.validateField('position.spannung.un', 230);
      expect(result.isValid).toBe(true);
    });

    test('validates number ranges - too low', () => {
      const result = validator.validateField('position.spannung.un', -10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 0');
    });

    test('validates number ranges - too high', () => {
      const result = validator.validateField('position.spannung.un', 1500);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at most 1000');
    });

    test('validates date fields - valid date', () => {
      const result = validator.validateField('metadata.datum', '2025-01-15');
      expect(result.isValid).toBe(true);
    });

    test('validates date fields - invalid date', () => {
      const result = validator.validateField('metadata.datum', 'not-a-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid date');
    });

    test('validates future date requirement', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const result = validator.validateField('prüfungsergebnis.nächsterPrüfungstermin', pastDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('future');
    });

    test('returns valid for undefined rules', () => {
      const result = validator.validateField('nonexistent.field', 'any value');
      expect(result.isValid).toBe(true);
    });

    test('skips validation for optional empty fields', () => {
      const result = validator.validateField('metadata.auftragnummer', '');
      expect(result.isValid).toBe(true);
    });

    test('validates optional fields when provided', () => {
      const result = validator.validateField('metadata.auftragnummer', 'ABC123');
      expect(result.isValid).toBe(true);
    });

    test('validates optional fields - invalid pattern', () => {
      const result = validator.validateField('metadata.auftragnummer', 'invalid!@#');
      expect(result.isValid).toBe(false);
    });

    test('validates frequency enum', () => {
      const result = validator.validateField('position.spannung.fn', 50);
      expect(result.isValid).toBe(true);
    });

    test('rejects invalid frequency', () => {
      const result = validator.validateField('position.spannung.fn', 45);
      expect(result.isValid).toBe(false);
    });

    test('handles null values', () => {
      const result = validator.validateField('metadata.auftraggeber', null);
      expect(result.isValid).toBe(false);
    });

    test('handles undefined values', () => {
      const result = validator.validateField('metadata.auftraggeber', undefined);
      expect(result.isValid).toBe(false);
    });

    test('validates NaN for number fields', () => {
      const result = validator.validateField('position.spannung.un', NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });
  });

  // ===== POSITION VALIDATION =====
  describe('Position Validation', () => {
    test('validates complete position', () => {
      const position = {
        posNr: '001',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      };

      const result = validator.validatePosition(position);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    test('catches missing required fields', () => {
      const position = {
        posNr: '001',
        stromkreisNr: 'F1'
        // Missing zielbezeichnung, spannung, messwerte
      };

      const result = validator.validatePosition(position);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    test('validates null position object', () => {
      const result = validator.validatePosition(null);
      expect(result.isValid).toBe(false);
      expect(result.errors.position).toBe('Invalid position object');
    });

    test('validates undefined position object', () => {
      const result = validator.validatePosition(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors.position).toBe('Invalid position object');
    });

    test('validates non-object position', () => {
      const result = validator.validatePosition('not an object');
      expect(result.isValid).toBe(false);
    });

    test('validates missing nested spannung fields', () => {
      const position = {
        posNr: '001',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test',
        spannung: {}, // Missing un and fn
        messwerte: { riso: 100 }
      };

      const result = validator.validatePosition(position);
      expect(result.isValid).toBe(false);
      expect(result.errors['spannung.un']).toBeTruthy();
      expect(result.errors['spannung.fn']).toBeTruthy();
    });

    test('detects duplicate circuit numbers', () => {
      // Add first position
      state.addPosition({
        posNr: '001',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      // Validate second position with same stromkreisNr
      const position = {
        posNr: '002',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 2',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      };

      const result = validator.validatePosition(position);
      expect(result.isValid).toBe(false);
      expect(result.errors.stromkreisNr).toBe('Duplicate circuit number');
    });
  });

  // ===== ALL POSITIONS VALIDATION =====
  describe('All Positions Validation', () => {
    test('validates empty positions array', () => {
      const result = validator.validateAllPositions([]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('At least one position is required');
    });

    test('validates null positions', () => {
      const result = validator.validateAllPositions(null);
      expect(result.isValid).toBe(false);
    });

    test('validates valid positions array', () => {
      const positions = [
        {
          posNr: '001',
          stromkreisNr: 'F1',
          zielbezeichnung: 'Circuit 1',
          spannung: { un: 230, fn: 50 },
          messwerte: { riso: 100 }
        }
      ];

      const result = validator.validateAllPositions(positions);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('collects errors from multiple invalid positions', () => {
      const positions = [
        { posNr: '001', stromkreisNr: 'F1' }, // Missing fields
        { posNr: '002', stromkreisNr: 'F2' }  // Missing fields
      ];

      const result = validator.validateAllPositions(positions);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  // ===== STEP VALIDATION =====
  describe('Step Validation', () => {
    test('validates metadata step - fails with defaults', () => {
      const result = validator.validateMetadataStep();
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    test('validates metadata step - passes with required fields', () => {
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      const result = validator.validateMetadataStep();
      expect(result.isValid).toBe(true);
    });

    test('validates positions step - fails with no positions', () => {
      const result = validator.validatePositionsStep();
      expect(result.isValid).toBe(false);
    });

    test('validates positions step - passes with valid positions', () => {
      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      const result = validator.validatePositionsStep();
      expect(result.isValid).toBe(true);
    });

    test('validates results step - fails without future date', () => {
      const result = validator.validateResultsStep();
      expect(result.isValid).toBe(false);
    });

    test('validates results step - passes with future date', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: futureDate
      });

      const result = validator.validateResultsStep();
      expect(result.isValid).toBe(true);
    });
  });

  // ===== FORM VALIDATION =====
  describe('Form Validation', () => {
    test('validates form ready for export - fails without data', () => {
      const result = validator.validateForm();
      expect(result.isValid).toBe(false);
      expect(result.summary).toContain('error');
    });

    test('validates form ready for export - passes with complete data', () => {
      // Populate all required fields
      state.setMetadata({
        protokollNumber: 'EDB101120250925',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 1',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      // Add positions
      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      // Set results
      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      const result = validator.validateForm();
      expect(result.isValid).toBe(true);
      expect(result.summary).toContain('valid');
    });

    test('returns structured errors object', () => {
      const result = validator.validateForm();
      
      expect(result.errors).toBeDefined();
      expect(result.errors.metadata).toBeDefined();
      expect(result.errors.positions).toBeDefined();
      expect(result.errors.results).toBeDefined();
    });

    test('counts total errors correctly', () => {
      const result = validator.validateForm();
      
      const expectedCount = 
        Object.keys(result.errors.metadata).length +
        result.errors.positions.length +
        Object.keys(result.errors.results).length;
      
      expect(result.summary).toContain(`${expectedCount} error`);
    });
  });

  // ===== DUPLICATE DETECTION =====
  describe('Duplicate Detection', () => {
    test('detects duplicate circuit numbers', () => {
      const positions = [
        { posNr: '001', stromkreisNr: 'F1', zielbezeichnung: 'Circuit 1' },
        { posNr: '002', stromkreisNr: 'F1', zielbezeichnung: 'Circuit 2' }
      ];

      const duplicates = validator.checkForDuplicatePositions(positions);
      expect(duplicates).toContain('F1');
    });

    test('returns empty array when no duplicates', () => {
      const positions = [
        { posNr: '001', stromkreisNr: 'F1', zielbezeichnung: 'Circuit 1' },
        { posNr: '002', stromkreisNr: 'F2', zielbezeichnung: 'Circuit 2' }
      ];

      const duplicates = validator.checkForDuplicatePositions(positions);
      expect(duplicates.length).toBe(0);
    });

    test('handles empty positions array', () => {
      const duplicates = validator.checkForDuplicatePositions([]);
      expect(duplicates.length).toBe(0);
    });
  });

  // ===== MEASUREMENTS VALIDATION =====
  describe('Measurements Validation', () => {
    test('validates high insulation resistance warning', () => {
      const result = validator.validateMeasurements({ riso: 1000 });
      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('999');
    });

    test('validates >999 string value', () => {
      const result = validator.validateMeasurements({ riso: '>999' });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('validates low differential current warning', () => {
      const result = validator.validateMeasurements({ differenzstrom: 0.001 });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('low');
    });

    test('validates normal measurements', () => {
      const result = validator.validateMeasurements({ riso: 500, differenzstrom: 5 });
      expect(result.isValid).toBe(true);
    });
  });

  // ===== VALIDATION SUMMARY =====
  describe('Validation Summary', () => {
    test('returns complete summary', () => {
      const summary = validator.getValidationSummary();
      
      expect(summary.totalErrors).toBeGreaterThan(0);
      expect(summary.errorsByField).toBeDefined();
      expect(summary.warnings).toBeDefined();
      expect(summary.isValid).toBe(false);
    });

    test('returns zero errors when form is valid', () => {
      // Set up valid form
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      const summary = validator.getValidationSummary();
      expect(summary.totalErrors).toBe(0);
      expect(summary.isValid).toBe(true);
    });
  });
});
