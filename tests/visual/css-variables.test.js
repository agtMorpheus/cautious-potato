/**
 * CSS Variables Consistency Tests
 * 
 * Validates that all required CSS variables are defined and have expected values.
 * Based on the dashboard (index.html) as the source of truth.
 */

import { DESIGN_TOKENS, REQUIRED_CSS_VARIABLES } from '../../js/design-tokens.js';
import { loadCSSVariables, getCSSVariable, isCSSVariableDefined } from './visual-setup.js';

describe('CSS Variables Consistency', () => {
  let cssLoaded = false;
  
  beforeAll(() => {
    cssLoaded = loadCSSVariables();
  });
  
  beforeEach(() => {
    // Ensure CSS is loaded before each test
    expect(cssLoaded).toBe(true);
  });
  
  describe('Typography Variables', () => {
    test('should define base font family', () => {
      const fontFamily = getCSSVariable('--font-family-base');
      expect(fontFamily).toBeTruthy();
      expect(fontFamily).toContain('Inter');
    });
    
    test('should define all font size variables', () => {
      const sizes = [
        '--font-size-xs',
        '--font-size-sm',
        '--font-size-base',
        '--font-size-lg',
        '--font-size-xl',
        '--font-size-2xl',
      ];
      
      sizes.forEach(size => {
        const value = getCSSVariable(size);
        expect(value).toBeTruthy();
        expect(value).toMatch(/rem$/);
      });
    });
    
    test('should define line-height-base', () => {
      const lineHeight = getCSSVariable('--line-height-base');
      expect(lineHeight).toBeTruthy();
      const numericValue = parseFloat(lineHeight);
      expect(numericValue).toBeGreaterThan(1);
      expect(numericValue).toBeLessThanOrEqual(2);
    });
  });
  
  describe('Spacing Variables', () => {
    test('should define all spacing scale variables', () => {
      REQUIRED_CSS_VARIABLES.spacing.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
    
    test('should use consistent spacing scale (4px base)', () => {
      const spacingTests = [
        { var: '--space-xs', expected: '4px' },
        { var: '--space-sm', expected: '8px' },
        { var: '--space-md', expected: '16px' },
        { var: '--space-lg', expected: '24px' },
        { var: '--space-xl', expected: '32px' },
        { var: '--space-2xl', expected: '48px' },
      ];
      
      spacingTests.forEach(({ var: varName, expected }) => {
        const value = getCSSVariable(varName);
        expect(value).toBe(expected);
      });
    });
  });
  
  describe('Border Radius Variables', () => {
    test('should define all border radius variables', () => {
      REQUIRED_CSS_VARIABLES.borderRadius.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
    
    test('should define border radius scale', () => {
      const radiusTests = [
        { var: '--radius-sm', expected: '4px' },
        { var: '--radius-md', expected: '8px' },
        { var: '--radius-lg', expected: '12px' },
        { var: '--radius-full', expected: '9999px' },
      ];
      
      radiusTests.forEach(({ var: varName, expected }) => {
        const value = getCSSVariable(varName);
        expect(value).toBe(expected);
      });
    });
  });
  
  describe('Color Variables', () => {
    test('should define primary color palette', () => {
      const primaryColors = [
        '--primary-main',
        '--primary-hover',
        '--primary-light',
      ];
      
      primaryColors.forEach(color => {
        expect(isCSSVariableDefined(color)).toBe(true);
      });
    });
    
    test('should define semantic status colors', () => {
      const statusColors = [
        '--c-success',
        '--c-warning',
        '--c-danger',
        '--c-info',
      ];
      
      statusColors.forEach(color => {
        const value = getCSSVariable(color);
        expect(value).toBeTruthy();
        expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
    
    test('semantic colors should match design tokens', () => {
      expect(getCSSVariable('--c-success')).toBe(DESIGN_TOKENS.colors.success);
      expect(getCSSVariable('--c-warning')).toBe(DESIGN_TOKENS.colors.warning);
      expect(getCSSVariable('--c-danger')).toBe(DESIGN_TOKENS.colors.danger);
      expect(getCSSVariable('--c-info')).toBe(DESIGN_TOKENS.colors.info);
    });
  });
  
  describe('Background Variables', () => {
    test('should define all background color variables', () => {
      REQUIRED_CSS_VARIABLES.backgrounds.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
    
    test('should define background hierarchy', () => {
      // Background should form a visual hierarchy
      const bgApp = getCSSVariable('--bg-app');
      const bgSurface = getCSSVariable('--bg-surface');
      const bgCard = getCSSVariable('--bg-card');
      
      expect(bgApp).toBeTruthy();
      expect(bgSurface).toBeTruthy();
      expect(bgCard).toBeTruthy();
    });
  });
  
  describe('Text Color Variables', () => {
    test('should define all text color variables', () => {
      REQUIRED_CSS_VARIABLES.text.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
    
    test('text colors should form a contrast hierarchy', () => {
      const textMain = getCSSVariable('--text-main');
      const textMuted = getCSSVariable('--text-muted');
      
      expect(textMain).toBeTruthy();
      expect(textMuted).toBeTruthy();
      // Main text should be darker (more contrast) than muted
      expect(textMain).not.toBe(textMuted);
    });
  });
  
  describe('Border Variables', () => {
    test('should define all border color variables', () => {
      REQUIRED_CSS_VARIABLES.borders.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
  });
  
  describe('Shadow Variables', () => {
    test('should define all shadow variables', () => {
      REQUIRED_CSS_VARIABLES.shadows.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
    
    test('shadow values should contain box-shadow syntax', () => {
      const shadows = ['--shadow-sm', '--shadow-md', '--shadow-lg'];
      
      shadows.forEach(shadow => {
        const value = getCSSVariable(shadow);
        expect(value).toBeTruthy();
        // Should contain a shadow definition with offset and blur
        expect(value).toMatch(/\d+px/);
      });
    });
  });
  
  describe('Transition Variables', () => {
    test('should define transition timing variables', () => {
      REQUIRED_CSS_VARIABLES.transitions.forEach(varName => {
        expect(isCSSVariableDefined(varName)).toBe(true);
      });
    });
    
    test('should define duration values in milliseconds', () => {
      const durationFast = getCSSVariable('--duration-fast');
      const durationNormal = getCSSVariable('--duration-normal');
      
      expect(durationFast).toMatch(/^\d+ms$/);
      expect(durationNormal).toMatch(/^\d+ms$/);
      
      // Fast should be less than normal
      const fast = parseInt(durationFast, 10);
      const normal = parseInt(durationNormal, 10);
      expect(fast).toBeLessThan(normal);
    });
  });
  
  describe('Neutral Color Scale', () => {
    test('should define neutral color scale', () => {
      const neutralColors = [
        '--c-neutral-50',
        '--c-neutral-100',
        '--c-neutral-200',
        '--c-neutral-300',
        '--c-neutral-400',
        '--c-neutral-500',
        '--c-neutral-600',
        '--c-neutral-700',
        '--c-neutral-800',
        '--c-neutral-900',
      ];
      
      neutralColors.forEach(color => {
        expect(isCSSVariableDefined(color)).toBe(true);
      });
    });
  });
  
  describe('Primary Color Scale', () => {
    test('should define primary color scale', () => {
      const primaryColors = [
        '--c-primary-50',
        '--c-primary-100',
        '--c-primary-200',
        '--c-primary-500',
        '--c-primary-600',
        '--c-primary-700',
      ];
      
      primaryColors.forEach(color => {
        expect(isCSSVariableDefined(color)).toBe(true);
      });
    });
  });
});
