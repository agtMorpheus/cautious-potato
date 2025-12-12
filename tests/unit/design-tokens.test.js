/**
 * Unit Tests for Design Tokens (design-tokens.js)
 * Phase 6 Testing Framework
 */

import { DESIGN_TOKENS, REQUIRED_CSS_VARIABLES } from '../../js/design-tokens.js';

describe('Design Tokens (design-tokens.js)', () => {
  describe('DESIGN_TOKENS export', () => {
    test('exports DESIGN_TOKENS object', () => {
      expect(DESIGN_TOKENS).toBeDefined();
      expect(typeof DESIGN_TOKENS).toBe('object');
    });

    test('has colors property with primary colors', () => {
      expect(DESIGN_TOKENS.colors).toBeDefined();
      expect(DESIGN_TOKENS.colors.primary).toBeDefined();
      expect(DESIGN_TOKENS.colors.primary.main).toBe('#3b82f6');
      expect(DESIGN_TOKENS.colors.primary.hover).toBe('#2563eb');
      expect(DESIGN_TOKENS.colors.primary.light).toBe('#dbeafe');
      expect(DESIGN_TOKENS.colors.primary.rgb).toBe('59, 130, 246');
    });

    test('has semantic colors defined', () => {
      expect(DESIGN_TOKENS.colors.success).toBe('#10b981');
      expect(DESIGN_TOKENS.colors.warning).toBe('#f59e0b');
      expect(DESIGN_TOKENS.colors.danger).toBe('#ef4444');
      expect(DESIGN_TOKENS.colors.info).toBe('#06b6d4');
    });

    test('has complete neutral color palette', () => {
      expect(DESIGN_TOKENS.colors.neutral).toBeDefined();
      expect(DESIGN_TOKENS.colors.neutral['50']).toBe('#f9fafb');
      expect(DESIGN_TOKENS.colors.neutral['100']).toBe('#f3f4f6');
      expect(DESIGN_TOKENS.colors.neutral['200']).toBe('#e5e7eb');
      expect(DESIGN_TOKENS.colors.neutral['300']).toBe('#d1d5db');
      expect(DESIGN_TOKENS.colors.neutral['400']).toBe('#9ca3af');
      expect(DESIGN_TOKENS.colors.neutral['500']).toBe('#6b7280');
      expect(DESIGN_TOKENS.colors.neutral['600']).toBe('#4b5563');
      expect(DESIGN_TOKENS.colors.neutral['700']).toBe('#374151');
      expect(DESIGN_TOKENS.colors.neutral['800']).toBe('#1f2937');
      expect(DESIGN_TOKENS.colors.neutral['900']).toBe('#111827');
      expect(DESIGN_TOKENS.colors.neutral['950']).toBe('#030712');
    });

    test('has background colors defined', () => {
      expect(DESIGN_TOKENS.colors.bg).toBeDefined();
      expect(DESIGN_TOKENS.colors.bg.app).toBe('#f9fafb');
      expect(DESIGN_TOKENS.colors.bg.surface).toBe('#ffffff');
      expect(DESIGN_TOKENS.colors.bg.card).toBe('#ffffff');
      expect(DESIGN_TOKENS.colors.bg.hover).toBe('#f3f4f6');
      expect(DESIGN_TOKENS.colors.bg.glass).toBe('rgba(255, 255, 255, 0.8)');
    });

    test('has text colors defined', () => {
      expect(DESIGN_TOKENS.colors.text).toBeDefined();
      expect(DESIGN_TOKENS.colors.text.main).toBe('#111827');
      expect(DESIGN_TOKENS.colors.text.secondary).toBe('#6b7280');
      expect(DESIGN_TOKENS.colors.text.muted).toBe('#6b7280');
      expect(DESIGN_TOKENS.colors.text.inverse).toBe('#ffffff');
    });

    test('has border colors defined', () => {
      expect(DESIGN_TOKENS.colors.border).toBeDefined();
      expect(DESIGN_TOKENS.colors.border.base).toBe('#e5e7eb');
      expect(DESIGN_TOKENS.colors.border.highlight).toBe('#d1d5db');
      expect(DESIGN_TOKENS.colors.border.glass).toBe('#e5e7eb');
    });
  });

  describe('Typography tokens', () => {
    test('has font family definitions', () => {
      expect(DESIGN_TOKENS.typography.fontFamily).toBeDefined();
      expect(DESIGN_TOKENS.typography.fontFamily.base).toContain('Inter');
      expect(DESIGN_TOKENS.typography.fontFamily.mono).toContain('JetBrains Mono');
    });

    test('has font size scale', () => {
      expect(DESIGN_TOKENS.typography.fontSize).toBeDefined();
      expect(DESIGN_TOKENS.typography.fontSize.xs).toBe('0.75rem');
      expect(DESIGN_TOKENS.typography.fontSize.sm).toBe('0.875rem');
      expect(DESIGN_TOKENS.typography.fontSize.base).toBe('1rem');
      expect(DESIGN_TOKENS.typography.fontSize.lg).toBe('1.125rem');
      expect(DESIGN_TOKENS.typography.fontSize.xl).toBe('1.25rem');
      expect(DESIGN_TOKENS.typography.fontSize['2xl']).toBe('1.5rem');
      expect(DESIGN_TOKENS.typography.fontSize['3xl']).toBe('1.875rem');
      expect(DESIGN_TOKENS.typography.fontSize['4xl']).toBe('2.25rem');
    });

    test('has font weight definitions', () => {
      expect(DESIGN_TOKENS.typography.fontWeight).toBeDefined();
      expect(DESIGN_TOKENS.typography.fontWeight.normal).toBe(400);
      expect(DESIGN_TOKENS.typography.fontWeight.medium).toBe(500);
      expect(DESIGN_TOKENS.typography.fontWeight.semibold).toBe(600);
      expect(DESIGN_TOKENS.typography.fontWeight.bold).toBe(700);
    });

    test('has line height definitions', () => {
      expect(DESIGN_TOKENS.typography.lineHeight).toBeDefined();
      expect(DESIGN_TOKENS.typography.lineHeight.tight).toBe(1.2);
      expect(DESIGN_TOKENS.typography.lineHeight.base).toBe(1.5);
      expect(DESIGN_TOKENS.typography.lineHeight.relaxed).toBe(1.625);
    });
  });

  describe('Spacing tokens', () => {
    test('has spacing scale based on 4px increments', () => {
      expect(DESIGN_TOKENS.spacing).toBeDefined();
      expect(DESIGN_TOKENS.spacing.xs).toBe('4px');
      expect(DESIGN_TOKENS.spacing.sm).toBe('8px');
      expect(DESIGN_TOKENS.spacing.md).toBe('16px');
      expect(DESIGN_TOKENS.spacing.lg).toBe('24px');
      expect(DESIGN_TOKENS.spacing.xl).toBe('32px');
      expect(DESIGN_TOKENS.spacing['2xl']).toBe('48px');
    });
  });

  describe('Border radius tokens', () => {
    test('has border radius scale', () => {
      expect(DESIGN_TOKENS.borderRadius).toBeDefined();
      expect(DESIGN_TOKENS.borderRadius.sm).toBe('4px');
      expect(DESIGN_TOKENS.borderRadius.md).toBe('8px');
      expect(DESIGN_TOKENS.borderRadius.lg).toBe('12px');
      expect(DESIGN_TOKENS.borderRadius.xl).toBe('16px');
      expect(DESIGN_TOKENS.borderRadius.full).toBe('9999px');
    });
  });

  describe('Shadow tokens', () => {
    test('has shadow definitions', () => {
      expect(DESIGN_TOKENS.shadows).toBeDefined();
      expect(DESIGN_TOKENS.shadows.none).toBe('none');
      expect(DESIGN_TOKENS.shadows.sm).toContain('rgba(0, 0, 0, 0.05)');
      expect(DESIGN_TOKENS.shadows.md).toContain('rgba(0, 0, 0, 0.1)');
      expect(DESIGN_TOKENS.shadows.lg).toContain('rgba(0, 0, 0, 0.1)');
    });
  });

  describe('Transition tokens', () => {
    test('has transition timing definitions', () => {
      expect(DESIGN_TOKENS.transitions).toBeDefined();
      expect(DESIGN_TOKENS.transitions.fast).toBe('150ms');
      expect(DESIGN_TOKENS.transitions.normal).toBe('250ms');
      expect(DESIGN_TOKENS.transitions.easeOut).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    });
  });

  describe('Layout tokens', () => {
    test('has layout dimension definitions', () => {
      expect(DESIGN_TOKENS.layout).toBeDefined();
      expect(DESIGN_TOKENS.layout.sidebarWidth).toBe('260px');
      expect(DESIGN_TOKENS.layout.sidebarWidthCollapsed).toBe('64px');
      expect(DESIGN_TOKENS.layout.headerHeight).toBe('64px');
    });
  });

  describe('REQUIRED_CSS_VARIABLES export', () => {
    test('exports REQUIRED_CSS_VARIABLES object', () => {
      expect(REQUIRED_CSS_VARIABLES).toBeDefined();
      expect(typeof REQUIRED_CSS_VARIABLES).toBe('object');
    });

    test('has typography variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.typography).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.typography)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.typography).toContain('--font-family-base');
      expect(REQUIRED_CSS_VARIABLES.typography).toContain('--font-size-base');
      expect(REQUIRED_CSS_VARIABLES.typography).toContain('--line-height-base');
    });

    test('has spacing variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.spacing).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.spacing)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.spacing).toContain('--space-xs');
      expect(REQUIRED_CSS_VARIABLES.spacing).toContain('--space-sm');
      expect(REQUIRED_CSS_VARIABLES.spacing).toContain('--space-md');
      expect(REQUIRED_CSS_VARIABLES.spacing).toContain('--space-lg');
      expect(REQUIRED_CSS_VARIABLES.spacing).toContain('--space-xl');
      expect(REQUIRED_CSS_VARIABLES.spacing).toContain('--space-2xl');
    });

    test('has border radius variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.borderRadius).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.borderRadius)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.borderRadius).toContain('--radius-sm');
      expect(REQUIRED_CSS_VARIABLES.borderRadius).toContain('--radius-md');
      expect(REQUIRED_CSS_VARIABLES.borderRadius).toContain('--radius-lg');
      expect(REQUIRED_CSS_VARIABLES.borderRadius).toContain('--radius-full');
    });

    test('has color variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.colors).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.colors)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.colors).toContain('--primary-main');
      expect(REQUIRED_CSS_VARIABLES.colors).toContain('--primary-hover');
      expect(REQUIRED_CSS_VARIABLES.colors).toContain('--c-success');
      expect(REQUIRED_CSS_VARIABLES.colors).toContain('--c-warning');
      expect(REQUIRED_CSS_VARIABLES.colors).toContain('--c-danger');
      expect(REQUIRED_CSS_VARIABLES.colors).toContain('--c-info');
    });

    test('has background variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.backgrounds).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.backgrounds)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.backgrounds).toContain('--bg-app');
      expect(REQUIRED_CSS_VARIABLES.backgrounds).toContain('--bg-surface');
      expect(REQUIRED_CSS_VARIABLES.backgrounds).toContain('--bg-card');
      expect(REQUIRED_CSS_VARIABLES.backgrounds).toContain('--bg-hover');
      expect(REQUIRED_CSS_VARIABLES.backgrounds).toContain('--bg-glass');
    });

    test('has text variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.text).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.text)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.text).toContain('--text-main');
      expect(REQUIRED_CSS_VARIABLES.text).toContain('--text-muted');
      expect(REQUIRED_CSS_VARIABLES.text).toContain('--text-inverse');
    });

    test('has border variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.borders).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.borders)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.borders).toContain('--border-base');
      expect(REQUIRED_CSS_VARIABLES.borders).toContain('--border-highlight');
      expect(REQUIRED_CSS_VARIABLES.borders).toContain('--border-glass');
    });

    test('has shadow variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.shadows).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.shadows)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.shadows).toContain('--shadow-sm');
      expect(REQUIRED_CSS_VARIABLES.shadows).toContain('--shadow-md');
      expect(REQUIRED_CSS_VARIABLES.shadows).toContain('--shadow-lg');
    });

    test('has transition variables list', () => {
      expect(REQUIRED_CSS_VARIABLES.transitions).toBeDefined();
      expect(Array.isArray(REQUIRED_CSS_VARIABLES.transitions)).toBe(true);
      expect(REQUIRED_CSS_VARIABLES.transitions).toContain('--duration-fast');
      expect(REQUIRED_CSS_VARIABLES.transitions).toContain('--duration-normal');
      expect(REQUIRED_CSS_VARIABLES.transitions).toContain('--ease-out');
    });
  });

  describe('Default export', () => {
    test('default export equals DESIGN_TOKENS', async () => {
      const module = await import('../../js/design-tokens.js');
      expect(module.default).toBe(DESIGN_TOKENS);
    });
  });
});
