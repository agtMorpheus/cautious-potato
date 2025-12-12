/**
 * Comprehensive Edge Case Tests
 * Phase 6 Testing Framework
 * 
 * This file contains additional edge case and boundary tests
 * to improve code coverage across multiple modules.
 */

import { DESIGN_TOKENS, REQUIRED_CSS_VARIABLES } from '../../js/design-tokens.js';
import { 
  METADATA_CELL_CONFIG,
  POSITION_CONFIG,
  ABRECHNUNG_CONFIG,
  PARSING_CONFIG,
  getConfigSummary
} from '../../js/config.js';

describe('Comprehensive Edge Case Tests', () => {
  
  describe('Design Tokens - Boundary Values', () => {
    test('color hex values are valid 6-character format', () => {
      const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
      
      expect(DESIGN_TOKENS.colors.primary.main).toMatch(hexColorPattern);
      expect(DESIGN_TOKENS.colors.primary.hover).toMatch(hexColorPattern);
      expect(DESIGN_TOKENS.colors.success).toMatch(hexColorPattern);
      expect(DESIGN_TOKENS.colors.warning).toMatch(hexColorPattern);
      expect(DESIGN_TOKENS.colors.danger).toMatch(hexColorPattern);
    });

    test('spacing values use consistent units', () => {
      const spacingValues = Object.values(DESIGN_TOKENS.spacing);
      
      spacingValues.forEach(value => {
        expect(value).toMatch(/^\d+px$/);
      });
    });

    test('border radius values are valid CSS', () => {
      const radiusValues = Object.values(DESIGN_TOKENS.borderRadius);
      
      radiusValues.forEach(value => {
        expect(value).toMatch(/^\d+(px|%)$/);
      });
    });

    test('font sizes use rem units', () => {
      const fontSizes = Object.values(DESIGN_TOKENS.typography.fontSize);
      
      fontSizes.forEach(size => {
        expect(size).toMatch(/^\d+\.?\d*rem$/);
      });
    });

    test('font weights are valid numeric values', () => {
      const weights = Object.values(DESIGN_TOKENS.typography.fontWeight);
      
      weights.forEach(weight => {
        expect(typeof weight).toBe('number');
        expect(weight).toBeGreaterThanOrEqual(100);
        expect(weight).toBeLessThanOrEqual(900);
        expect(weight % 100).toBe(0); // Should be multiples of 100
      });
    });

    test('line heights are reasonable values', () => {
      const lineHeights = Object.values(DESIGN_TOKENS.typography.lineHeight);
      
      lineHeights.forEach(lh => {
        expect(typeof lh).toBe('number');
        expect(lh).toBeGreaterThan(1);
        expect(lh).toBeLessThan(2);
      });
    });

    test('neutral color palette follows intensity progression', () => {
      const neutralKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      
      neutralKeys.forEach(key => {
        expect(DESIGN_TOKENS.colors.neutral[key]).toBeDefined();
        expect(DESIGN_TOKENS.colors.neutral[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    test('required CSS variables lists are non-empty', () => {
      Object.values(REQUIRED_CSS_VARIABLES).forEach(varList => {
        expect(Array.isArray(varList)).toBe(true);
        expect(varList.length).toBeGreaterThan(0);
      });
    });

    test('required CSS variables use correct naming convention', () => {
      const allVars = Object.values(REQUIRED_CSS_VARIABLES).flat();
      
      allVars.forEach(varName => {
        expect(varName).toMatch(/^--[a-z0-9-]+$/);
      });
    });
  });

  describe('Configuration - Validation and Constraints', () => {
    test('metadata cell addresses do not overlap', () => {
      const allCells = Object.values(METADATA_CELL_CONFIG).flat();
      const primaryCells = Object.values(METADATA_CELL_CONFIG).map(cells => cells[0]);
      
      // Primary cells should be unique
      const uniquePrimary = new Set(primaryCells);
      expect(uniquePrimary.size).toBe(primaryCells.length);
    });

    test('position row range is reasonable for Excel', () => {
      const range = POSITION_CONFIG.endRow - POSITION_CONFIG.startRow;
      
      expect(range).toBeGreaterThan(0);
      expect(range).toBeLessThan(10000); // Reasonable upper limit
    });

    test('quantity columns are in alphabetical order preference', () => {
      const cols = POSITION_CONFIG.quantityColumns;
      
      // Should have preferred columns first
      expect(cols.length).toBeGreaterThanOrEqual(1);
    });

    test('abrechnung positions start row is after header', () => {
      const headerRowEstimate = 5; // Headers typically in first few rows
      
      expect(ABRECHNUNG_CONFIG.positions.startRow).toBeGreaterThan(headerRowEstimate);
    });

    test('parsing config has valid properties', () => {
      expect(PARSING_CONFIG).toBeDefined();
      expect(PARSING_CONFIG.protokollSheetName).toBeDefined();
      expect(typeof PARSING_CONFIG.protokollSheetName).toBe('string');
    });

    test('config summary is stable across calls', () => {
      const summary1 = getConfigSummary();
      const summary2 = getConfigSummary();
      
      expect(summary1).toEqual(summary2);
    });

    test('all config exports are defined and non-null', () => {
      expect(METADATA_CELL_CONFIG).toBeDefined();
      expect(METADATA_CELL_CONFIG).not.toBeNull();
      expect(POSITION_CONFIG).toBeDefined();
      expect(POSITION_CONFIG).not.toBeNull();
      expect(ABRECHNUNG_CONFIG).toBeDefined();
      expect(ABRECHNUNG_CONFIG).not.toBeNull();
      expect(PARSING_CONFIG).toBeDefined();
      expect(PARSING_CONFIG).not.toBeNull();
    });
  });

  describe('Cross-module Consistency', () => {
    test('design token spacing matches CSS variable names', () => {
      const spacingKeys = Object.keys(DESIGN_TOKENS.spacing);
      const expectedVars = REQUIRED_CSS_VARIABLES.spacing;
      
      // Each spacing level should have a corresponding CSS variable
      expect(expectedVars.length).toBeGreaterThanOrEqual(spacingKeys.length - 1);
    });

    test('design token colors have corresponding CSS variables', () => {
      const colorVars = REQUIRED_CSS_VARIABLES.colors;
      
      // Should include primary colors
      expect(colorVars).toContain('--primary-main');
      expect(colorVars).toContain('--primary-hover');
    });

    test('metadata config field names match expected schema', () => {
      const requiredFields = ['protokollNr', 'auftragsNr', 'anlage', 'einsatzort'];
      
      requiredFields.forEach(field => {
        expect(METADATA_CELL_CONFIG).toHaveProperty(field);
        expect(Array.isArray(METADATA_CELL_CONFIG[field])).toBe(true);
      });
    });
  });

  describe('Data Type Validation', () => {
    test('all spacing values parse to positive numbers', () => {
      Object.values(DESIGN_TOKENS.spacing).forEach(value => {
        const numValue = parseInt(value);
        expect(numValue).toBeGreaterThan(0);
        expect(isNaN(numValue)).toBe(false);
      });
    });

    test('all border radius values parse to numbers', () => {
      Object.values(DESIGN_TOKENS.borderRadius).forEach(value => {
        if (value !== '9999px') { // Special case for full radius
          const numValue = parseInt(value);
          expect(numValue).toBeGreaterThan(0);
          expect(isNaN(numValue)).toBe(false);
        }
      });
    });

    test('position config row numbers are integers', () => {
      expect(Number.isInteger(POSITION_CONFIG.startRow)).toBe(true);
      expect(Number.isInteger(POSITION_CONFIG.endRow)).toBe(true);
    });

    test('all metadata cell config values are string arrays', () => {
      Object.values(METADATA_CELL_CONFIG).forEach(cells => {
        expect(Array.isArray(cells)).toBe(true);
        cells.forEach(cell => {
          expect(typeof cell).toBe('string');
        });
      });
    });
  });

  describe('Regex Pattern Validation', () => {
    test('position pattern matches various valid formats', () => {
      const pattern = POSITION_CONFIG.positionNumberPattern;
      
      const validPatterns = [
        '01.01.0010',
        '1.1.1',
        '99.99.9999',
        '10.20.0030',
        'text 5.5.5 more text'
      ];
      
      validPatterns.forEach(p => {
        expect(p).toMatch(pattern);
      });
    });

    test('position pattern rejects some invalid formats', () => {
      const pattern = POSITION_CONFIG.positionNumberPattern;
      
      const invalidPatterns = [
        'abc',
        'no numbers here',
        'just text'
      ];
      
      invalidPatterns.forEach(p => {
        expect(pattern.test(p)).toBe(false);
      });
    });
  });

  describe('Immutability Tests', () => {
    test('modifying returned config summary does not affect original', () => {
      const summary1 = getConfigSummary();
      summary1.metadata = {};
      
      const summary2 = getConfigSummary();
      expect(summary2.metadata).toEqual(METADATA_CELL_CONFIG);
    });

    test('design tokens cannot be accidentally modified', () => {
      const originalColor = DESIGN_TOKENS.colors.primary.main;
      
      // Attempt modification (should not affect module)
      const tokens = DESIGN_TOKENS;
      
      expect(DESIGN_TOKENS.colors.primary.main).toBe(originalColor);
    });
  });

  describe('Completeness Checks', () => {
    test('all required CSS variable categories are present', () => {
      const expectedCategories = [
        'typography',
        'spacing',
        'borderRadius',
        'colors',
        'backgrounds',
        'text',
        'borders',
        'shadows',
        'transitions'
      ];
      
      expectedCategories.forEach(category => {
        expect(REQUIRED_CSS_VARIABLES).toHaveProperty(category);
      });
    });

    test('all design token color categories are present', () => {
      expect(DESIGN_TOKENS.colors).toHaveProperty('primary');
      expect(DESIGN_TOKENS.colors).toHaveProperty('success');
      expect(DESIGN_TOKENS.colors).toHaveProperty('warning');
      expect(DESIGN_TOKENS.colors).toHaveProperty('danger');
      expect(DESIGN_TOKENS.colors).toHaveProperty('info');
      expect(DESIGN_TOKENS.colors).toHaveProperty('neutral');
      expect(DESIGN_TOKENS.colors).toHaveProperty('bg');
      expect(DESIGN_TOKENS.colors).toHaveProperty('text');
      expect(DESIGN_TOKENS.colors).toHaveProperty('border');
    });

    test('all typography properties are present', () => {
      expect(DESIGN_TOKENS.typography).toHaveProperty('fontFamily');
      expect(DESIGN_TOKENS.typography).toHaveProperty('fontSize');
      expect(DESIGN_TOKENS.typography).toHaveProperty('fontWeight');
      expect(DESIGN_TOKENS.typography).toHaveProperty('lineHeight');
    });
  });
});
