# Visual Design System Testing & Consistency Guide

## Overview

This document provides a comprehensive testing framework to ensure all visual elements (fonts, cards, effects, palettes, themes, spacing, and effects) are **standardized** across the entire Abrechnung application. These tests can be automated or run manually.

---

## Part 1: Design System Audit

### 1.1 Identify Core Design Tokens

Before testing, document all design system variables that must be consistent:

```javascript
// design-tokens.js - SINGLE SOURCE OF TRUTH
export const DESIGN_TOKENS = {
  // Colors
  colors: {
    primary: '#3b82f6',      // Primary blue
    primaryRgb: '59, 130, 246',
    secondary: '#8b5cf6',    // Purple
    success: '#10b981',      // Green
    warning: '#f59e0b',      // Orange
    danger: '#ef4444',       // Red
    info: '#06b6d4',         // Cyan
    
    // Neutral palette
    bg: {
      primary: '#ffffff',    // Light mode background
      surface: '#f3f4f6',    // Card backgrounds
      hover: '#e5e7eb',      // Hover states
      glass: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
      main: '#1f2937',       // Primary text
      secondary: '#6b7280',  // Secondary text
      muted: '#9ca3af',      // Muted text
    },
    border: {
      base: '#d1d5db',
      light: '#e5e7eb',
      glass: 'rgba(255, 255, 255, 0.1)',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      base: "'Inter', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  
  // Spacing (8px base unit)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem',     // 48px
  },
  
  // Border Radius
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
```

### 1.2 Create Global CSS Variables File

```css
/* styles/variables.css - DO NOT MODIFY OUTSIDE THIS FILE */

:root {
  /* Colors */
  --primary-main: #3b82f6;
  --primary-rgb: 59, 130, 246;
  --secondary-main: #8b5cf6;
  --success-main: #10b981;
  --warning-main: #f59e0b;
  --danger-main: #ef4444;
  --info-main: #06b6d4;
  
  --bg-primary: #ffffff;
  --bg-surface: #f3f4f6;
  --bg-hover: #e5e7eb;
  --bg-card: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.05);
  
  --text-main: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  
  --border-base: #d1d5db;
  --border-light: #e5e7eb;
  --border-glass: rgba(255, 255, 255, 0.1);
  
  /* Typography */
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Monaco', monospace;
  
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  
  /* Spacing (8px base) */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-xxl: 3rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-none: none;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark mode override */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1f2937;
    --bg-surface: #111827;
    --bg-hover: #374151;
    --bg-card: #1f2937;
    --bg-glass: rgba(0, 0, 0, 0.3);
    
    --text-main: #f3f4f6;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
    
    --border-base: #4b5563;
    --border-light: #374151;
    --border-glass: rgba(255, 255, 255, 0.15);
  }
}
```

---

## Part 2: Automated Visual Tests

### 2.1 Setup Testing Environment

```bash
# Install dependencies
npm install --save-dev jest @testing-library/dom jest-dom
npm install --save-dev jest-axe axe-core
npm install --save-dev pixelmatch png-file-read
```

### 2.2 CSS Variables Consistency Test

```javascript
// tests/visual/css-variables.test.js

import { DESIGN_TOKENS } from '../../design-tokens.js';

describe('CSS Variables Consistency', () => {
  let root;
  
  beforeEach(() => {
    root = document.documentElement;
  });
  
  describe('Color Variables', () => {
    test('should define all primary colors as CSS variables', () => {
      const colors = [
        '--primary-main',
        '--secondary-main',
        '--success-main',
        '--warning-main',
        '--danger-main',
        '--info-main',
      ];
      
      colors.forEach(color => {
        const value = getComputedStyle(root).getPropertyValue(color).trim();
        expect(value).toBeTruthy();
        expect(value).toMatch(/^#|^rgb|^rgba/);
      });
    });
    
    test('all color definitions should match DESIGN_TOKENS', () => {
      const computed = getComputedStyle(root);
      expect(computed.getPropertyValue('--primary-main').trim()).toContain('3b82f6');
      expect(computed.getPropertyValue('--success-main').trim()).toContain('10b981');
      expect(computed.getPropertyValue('--danger-main').trim()).toContain('ef4444');
    });
    
    test('should define background color palette', () => {
      const bgColors = [
        '--bg-primary',
        '--bg-surface',
        '--bg-hover',
        '--bg-card',
      ];
      
      bgColors.forEach(bg => {
        const value = getComputedStyle(root).getPropertyValue(bg).trim();
        expect(value).toBeTruthy();
      });
    });
  });
  
  describe('Typography Variables', () => {
    test('should define all font families', () => {
      const baseFont = getComputedStyle(root).getPropertyValue('--font-family-base').trim();
      const monoFont = getComputedStyle(root).getPropertyValue('--font-family-mono').trim();
      
      expect(baseFont).toContain('Inter');
      expect(monoFont).toContain('JetBrains Mono');
    });
    
    test('should define all font sizes', () => {
      const sizes = [
        '--font-size-xs',
        '--font-size-sm',
        '--font-size-base',
        '--font-size-lg',
        '--font-size-xl',
        '--font-size-2xl',
      ];
      
      sizes.forEach(size => {
        const value = getComputedStyle(root).getPropertyValue(size).trim();
        expect(value).toMatch(/rem$/);
      });
    });
    
    test('should define font weights', () => {
      const weights = [
        '--font-weight-normal',
        '--font-weight-medium',
        '--font-weight-semibold',
        '--font-weight-bold',
      ];
      
      weights.forEach(weight => {
        const value = parseInt(getComputedStyle(root).getPropertyValue(weight).trim());
        expect(value).toBeGreaterThanOrEqual(400);
        expect(value).toBeLessThanOrEqual(700);
      });
    });
  });
  
  describe('Spacing Variables', () => {
    test('should use consistent 8px spacing scale', () => {
      const spacingTests = [
        { var: '--space-xs', expected: '0.25rem' },
        { var: '--space-sm', expected: '0.5rem' },
        { var: '--space-md', expected: '1rem' },
        { var: '--space-lg', expected: '1.5rem' },
        { var: '--space-xl', expected: '2rem' },
        { var: '--space-xxl', expected: '3rem' },
      ];
      
      spacingTests.forEach(({ var: varName, expected }) => {
        const value = getComputedStyle(root).getPropertyValue(varName).trim();
        expect(value).toBe(expected);
      });
    });
  });
  
  describe('Border Radius Variables', () => {
    test('should define border radius scale', () => {
      const radiusTests = [
        { var: '--radius-sm', max: 10 },
        { var: '--radius-md', max: 15 },
        { var: '--radius-lg', max: 20 },
      ];
      
      radiusTests.forEach(({ var: varName, max }) => {
        const value = parseFloat(getComputedStyle(root).getPropertyValue(varName).trim());
        expect(value).toBeLessThanOrEqual(max);
      });
    });
  });
  
  describe('Shadow Variables', () => {
    test('should define box-shadow variables', () => {
      const shadows = [
        '--shadow-sm',
        '--shadow-md',
        '--shadow-lg',
      ];
      
      shadows.forEach(shadow => {
        const value = getComputedStyle(root).getPropertyValue(shadow).trim();
        expect(value).toBeTruthy();
        expect(value).toContain('0');
      });
    });
  });
});
```

### 2.3 Component Style Consistency Test

```javascript
// tests/visual/component-styles.test.js

describe('Component Visual Consistency', () => {
  describe('Card Components', () => {
    test('all cards should have consistent styling', () => {
      const cards = document.querySelectorAll('[class*="card"]');
      
      expect(cards.length).toBeGreaterThan(0);
      
      cards.forEach(card => {
        const styles = window.getComputedStyle(card);
        
        // Check border
        expect(styles.borderWidth).toBeDefined();
        expect(styles.borderColor).toMatch(/rgb/);
        
        // Check border-radius
        const radius = parseFloat(styles.borderRadius);
        expect(radius).toBeGreaterThan(0);
        
        // Check padding
        const padding = parseFloat(styles.padding);
        expect(padding).toBeGreaterThan(0);
        
        // Check background
        expect(styles.backgroundColor).toMatch(/rgb|rgba/);
      });
    });
    
    test('cards should use CSS variables for colors', () => {
      const cards = document.querySelectorAll('[class*="card"]');
      const cssText = Array.from(cards).map(c => c.getAttribute('style') || '').join('');
      
      // Should use var() references, not hardcoded colors
      cards.forEach(card => {
        const rules = window.getComputedStyle(card);
        expect(rules.backgroundColor).toBeTruthy();
      });
    });
  });
  
  describe('Button Components', () => {
    test('all buttons should have consistent hover states', () => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        
        // Check it has padding
        const paddingTop = parseFloat(styles.paddingTop);
        expect(paddingTop).toBeGreaterThan(0);
        
        // Check it has defined colors
        expect(styles.backgroundColor).toBeTruthy();
        expect(styles.color).toBeTruthy();
        
        // Check border-radius
        expect(styles.borderRadius).not.toBe('0px');
      });
    });
    
    test('buttons should have transition for hover effects', () => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        expect(styles.transition).toBeTruthy();
      });
    });
  });
  
  describe('Typography Consistency', () => {
    test('headings should use defined font sizes', () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      expect(headings.length).toBeGreaterThan(0);
      
      headings.forEach(heading => {
        const styles = window.getComputedStyle(heading);
        
        // Check font
        expect(styles.fontFamily).toContain('Inter');
        
        // Check size is defined
        const fontSize = parseFloat(styles.fontSize);
        expect(fontSize).toBeGreaterThan(12);
      });
    });
    
    test('body text should use consistent font sizes', () => {
      const paragraphs = document.querySelectorAll('p, span, a');
      
      paragraphs.forEach(element => {
        if (element.offsetParent !== null) { // visible elements
          const styles = window.getComputedStyle(element);
          const fontSize = parseFloat(styles.fontSize);
          
          // Should be within defined range
          expect(fontSize).toBeGreaterThanOrEqual(12);
          expect(fontSize).toBeLessThanOrEqual(48);
        }
      });
    });
    
    test('all text should use base font family', () => {
      const elements = document.querySelectorAll('p, span, a, li, div, h1, h2, h3, h4, h5, h6');
      
      elements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const fontFamily = styles.fontFamily;
        
        // Should use Inter, JetBrains Mono, or system fonts
        expect(fontFamily).toMatch(/Inter|JetBrains|system/i);
      });
    });
  });
  
  describe('Color Consistency', () => {
    test('all interactive elements should use defined color palette', () => {
      const interactive = document.querySelectorAll(
        'button, a, [role="button"], input, select, textarea'
      );
      
      interactive.forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        
        // Should be defined
        expect(color).toBeTruthy();
      });
    });
    
    test('disabled elements should have reduced opacity', () => {
      const disabled = document.querySelectorAll('[disabled]');
      
      disabled.forEach(element => {
        const styles = window.getComputedStyle(element);
        const opacity = parseFloat(styles.opacity);
        
        // Disabled should be less visible
        expect(opacity).toBeLessThan(1);
      });
    });
  });
  
  describe('Spacing Consistency', () => {
    test('elements should use consistent spacing units', () => {
      const elements = document.querySelectorAll('[style*="padding"], [style*="margin"]');
      
      elements.forEach(element => {
        const style = element.getAttribute('style') || '';
        const styleObj = window.getComputedStyle(element);
        
        // Check if using spacing variables or valid units
        expect(style + styleObj.padding + styleObj.margin).toBeTruthy();
      });
    });
  });
});
```

### 2.4 Theme Consistency Test

```javascript
// tests/visual/theme-consistency.test.js

describe('Theme Consistency', () => {
  test('light mode should have proper contrast', () => {
    const elements = document.querySelectorAll('[style*="color"]');
    
    elements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const bgColor = styles.backgroundColor;
      
      // Basic check that colors are defined
      expect(color).toMatch(/rgb/);
      expect(bgColor).toMatch(/rgb/);
    });
  });
  
  test('should support dark mode with matching variables', () => {
    const root = document.documentElement;
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (isDarkMode) {
      const computed = getComputedStyle(root);
      const darkBg = computed.getPropertyValue('--bg-primary').trim();
      expect(darkBg).toBeTruthy();
    }
  });
  
  test('all color tokens should have RGB versions for opacity', () => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    
    const rgbTokens = [
      '--primary-rgb',
      '--success-main',
      '--danger-main',
    ];
    
    rgbTokens.forEach(token => {
      const value = computed.getPropertyValue(token).trim();
      if (value.includes('rgb')) {
        expect(value).toMatch(/\d+,\s*\d+,\s*\d+/);
      }
    });
  });
});
```

### 2.5 Font Loading Test

```javascript
// tests/visual/fonts.test.js

describe('Font Loading', () => {
  test('should load Inter font family', (done) => {
    document.fonts.ready.then(() => {
      expect(document.fonts.check('1em Inter')).toBe(true);
      done();
    });
  });
  
  test('should load JetBrains Mono font family', (done) => {
    document.fonts.ready.then(() => {
      expect(document.fonts.check('1em JetBrains Mono')).toBe(true);
      done();
    });
  });
  
  test('elements should render with correct font', (done) => {
    const div = document.createElement('div');
    div.style.fontFamily = 'Inter, sans-serif';
    div.textContent = 'Test';
    document.body.appendChild(div);
    
    document.fonts.ready.then(() => {
      const styles = window.getComputedStyle(div);
      expect(styles.fontFamily).toContain('Inter');
      div.remove();
      done();
    });
  });
});
```

---

## Part 3: Manual Visual Testing Checklist

### 3.1 Visual Consistency Checklist

Create this checklist for each new page/component:

```markdown
## Visual Consistency Pre-Launch Checklist

### Colors
- [ ] All primary actions use `--primary-main` (#3b82f6)
- [ ] All success states use `--success-main` (#10b981)
- [ ] All warnings use `--warning-main` (#f59e0b)
- [ ] All errors use `--danger-main` (#ef4444)
- [ ] All neutral elements use `--text-muted` (#9ca3af)
- [ ] No hardcoded colors (all use CSS variables)

### Typography
- [ ] Headings use `--font-family-mono` (JetBrains Mono)
- [ ] Body text uses `--font-family-base` (Inter)
- [ ] H1: `--font-size-4xl` (2.25rem)
- [ ] H2: `--font-size-3xl` (1.875rem)
- [ ] H3: `--font-size-2xl` (1.5rem)
- [ ] Body: `--font-size-base` (1rem)
- [ ] Secondary text: `--font-size-sm` (0.875rem)
- [ ] All text uses defined font weights (400, 500, 600, 700)

### Spacing
- [ ] Card padding uses `--space-lg` or `--space-xl`
- [ ] Section gaps use `--space-lg`
- [ ] Element margins use spacing scale (xs, sm, md, lg, xl, xxl)
- [ ] No arbitrary margin/padding values

### Cards & Containers
- [ ] Border radius: `--radius-md` (8px) for cards
- [ ] Border color: `--border-base` or `--border-light`
- [ ] Background: `--bg-surface` for cards
- [ ] Padding: consistent spacing
- [ ] Shadow: use defined shadow variables

### Buttons
- [ ] Primary button: `--primary-main` background
- [ ] Button padding: `--space-md` minimum
- [ ] Border radius: `--radius-md` (8px)
- [ ] Hover effect: defined transition
- [ ] Disabled state: opacity reduced

### Interactive Elements
- [ ] Inputs have `--border-base` border
- [ ] Focus state visible with outline
- [ ] Hover states have smooth transition (`--transition-normal`)
- [ ] All transitions use defined timing

### Accessibility
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] Focus states clearly visible
- [ ] No color-only status indicators
- [ ] Form labels properly associated

### Responsive Design
- [ ] Mobile layout (< 640px): single column
- [ ] Tablet layout (640px - 1024px): adjusted spacing
- [ ] Desktop layout (> 1024px): full grid
- [ ] Touch targets minimum 44x44px
```

### 3.2 Page Review Template

```javascript
// Create a visual audit script that can be run in browser console
window.auditVisualConsistency = function() {
  console.log('=== VISUAL CONSISTENCY AUDIT ===\n');
  
  const issues = [];
  
  // Check for hardcoded colors
  const elements = document.querySelectorAll('*');
  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    const bgColor = style.backgroundColor;
    const color = style.color;
    
    // Flag suspicious hardcoded colors
    if (bgColor.match(/rgb\(\d{3}, \d{3}, \d{3}\)/) && 
        !window.getComputedStyle(el.parentElement).backgroundColor.includes(bgColor)) {
      // This might be a hardcoded color
      if (el.classList.length > 0) {
        console.warn(`Potential hardcoded color in ${el.className}:`, bgColor);
      }
    }
  });
  
  // Check for missing transitions
  const interactive = document.querySelectorAll('button, a, [role="button"]');
  interactive.forEach(el => {
    const transition = window.getComputedStyle(el).transition;
    if (transition === 'none 0s ease 0s') {
      issues.push(`No transition on interactive element: ${el.className}`);
    }
  });
  
  // Check card consistency
  const cards = document.querySelectorAll('[class*="card"]');
  const cardStyles = [];
  cards.forEach(card => {
    cardStyles.push({
      borderRadius: window.getComputedStyle(card).borderRadius,
      padding: window.getComputedStyle(card).padding,
      border: window.getComputedStyle(card).border,
    });
  });
  
  console.log(`Found ${cards.length} cards with styles:`, cardStyles);
  
  if (issues.length > 0) {
    console.error('ISSUES FOUND:', issues);
  } else {
    console.log('✓ No obvious visual consistency issues found');
  }
};

// Run it
window.auditVisualConsistency();
```

---

## Part 4: Setting Up Continuous Testing

### 4.1 Jest Configuration

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testMatch": [
      "<rootDir>/tests/**/*.test.js"
    ],
    "collectCoverageFrom": [
      "styles/**/*.css",
      "!styles/**/*.min.css"
    ],
    "moduleNameMapper": {
      "\\.(css|less|scss|sass)$": "identity-obj-proxy"
    }
  }
}
```

### 4.2 Setup File

```javascript
// tests/setup.js
import '@testing-library/jest-dom';
import fs from 'fs';

// Load CSS variables before tests
const cssContent = fs.readFileSync('./styles/variables.css', 'utf-8');
const styleSheet = document.createElement('style');
styleSheet.textContent = cssContent;
document.head.appendChild(styleSheet);
```

### 4.3 Run Tests

```bash
# Run all visual tests
npm test -- tests/visual/

# Run specific test file
npm test -- tests/visual/css-variables.test.js

# Watch mode for development
npm test -- tests/visual/ --watch

# Generate coverage report
npm test -- tests/visual/ --coverage
```

---

## Part 5: Implementation Strategy

### 5.1 File Structure

```
project-root/
├── styles/
│   ├── variables.css          # ← SINGLE SOURCE OF TRUTH
│   ├── base.css               # global styles using variables
│   ├── components.css
│   ├── dashboard.css
│   └── theme.css
├── tests/
│   ├── setup.js
│   └── visual/
│       ├── css-variables.test.js
│       ├── component-styles.test.js
│       ├── theme-consistency.test.js
│       └── fonts.test.js
├── design-tokens.js           # JS version of tokens
└── jest.config.js
```

### 5.2 Migration Steps for Existing Pages

1. **Audit Current Styles**
   - Document all custom colors, spacing, fonts in new pages
   - Identify deviations from dashboard.css

2. **Create Variables**
   - Move all values to `variables.css`
   - Update CSS to use `var()` references

3. **Update Module Styles**
   - Replace module-specific CSS with variable references
   - Remove hardcoded colors and spacing

4. **Test & Validate**
   - Run visual tests
   - Compare against dashboard (reference)
   - Manual review

5. **Document**
   - Update style guide
   - Add to version control

---

## Part 6: Style Guide Documentation

### 6.1 Create STYLE_GUIDE.md

```markdown
# Visual Style Guide

## Colors

### Primary
- **Primary Blue**: `#3b82f6` (var(--primary-main))
  - Used for: Primary actions, links, focus states
  
### Semantic
- **Success Green**: `#10b981` (var(--success-main))
- **Warning Orange**: `#f59e0b` (var(--warning-main))
- **Danger Red**: `#ef4444` (var(--danger-main))
- **Info Cyan**: `#06b6d4` (var(--info-main))

## Typography

### Font Families
- **Body Text**: Inter (--font-family-base)
- **Code/Headings**: JetBrains Mono (--font-family-mono)

### Font Sizes & Usage
- H1: 36px (2.25rem) - Page titles
- H2: 30px (1.875rem) - Section headers
- H3: 24px (1.5rem) - Subsection headers
- Body: 16px (1rem) - Default text
- Small: 14px (0.875rem) - Secondary text
- Tiny: 12px (0.75rem) - Labels, captions

## Spacing Scale (8px base)

- xs: 4px - Small gaps
- sm: 8px - Element spacing
- md: 16px - Default spacing
- lg: 24px - Section spacing
- xl: 32px - Large sections
- xxl: 48px - Page sections

## Components

### Cards
- Border-radius: 8px
- Padding: 24px (--space-lg)
- Border: 1px solid var(--border-base)
- Shadow: var(--shadow-md)

### Buttons
- Padding: 8px 16px minimum
- Border-radius: 8px
- Transition: 250ms ease

## Dark Mode

Colors automatically adjust via CSS media queries.
No hardcoded color values allowed.
```

---

## Part 7: Automation Scripts

### 7.1 Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

npm run test:visual || {
  echo "Visual consistency tests failed. Please fix issues before committing."
  exit 1
}

npm run lint:styles || {
  echo "CSS linting failed. Please fix style issues."
  exit 1
}
```

### 7.2 CSS Linting

```json
{
  "scripts": {
    "lint:styles": "stylelint 'styles/**/*.css'",
    "test:visual": "jest tests/visual/",
    "test:visual:watch": "jest tests/visual/ --watch",
    "audit:visual": "node scripts/visual-audit.js"
  }
}
```

### 7.3 Visual Audit Script

```javascript
// scripts/visual-audit.js
const fs = require('fs');
const path = require('path');

const variablesPath = path.join(__dirname, '../styles/variables.css');
const variablesContent = fs.readFileSync(variablesPath, 'utf-8');

// Extract all variable definitions
const variableRegex = /--([a-z-]+):\s*([^;]+);/g;
const variables = new Map();
let match;

while ((match = variableRegex.exec(variablesContent)) !== null) {
  variables.set(match[1], match[2]);
}

console.log('✓ Defined CSS Variables:', variables.size);

// Check all CSS files for hardcoded colors
const stylesDir = path.join(__dirname, '../styles');
const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));

let hardcodedColorCount = 0;

cssFiles.forEach(file => {
  const content = fs.readFileSync(path.join(stylesDir, file), 'utf-8');
  
  // Look for hardcoded hex colors
  const hardcodedColors = content.match(/#[0-9a-f]{6}/gi) || [];
  hardcodedColorCount += hardcodedColors.length;
  
  if (hardcodedColors.length > 0) {
    console.warn(`⚠ ${file}: Found ${hardcodedColors.length} hardcoded colors`);
  }
});

if (hardcodedColorCount === 0) {
  console.log('✓ No hardcoded colors found');
} else {
  console.log(`⚠ Total hardcoded colors: ${hardcodedColorCount}`);
}

console.log('\n✓ Visual audit complete');
```

---

## Part 8: Checklist for New Pages/Features

### When Creating a New Page/Module:

```markdown
## Pre-Development
- [ ] Review STYLE_GUIDE.md
- [ ] Understand design tokens in design-tokens.js
- [ ] Review dashboard.css as reference implementation

## During Development
- [ ] Use only CSS variables (variables.css)
- [ ] No hardcoded colors, spacing, or font sizes
- [ ] Test transitions and hover states
- [ ] Verify dark mode compatibility
- [ ] Check responsive breakpoints
- [ ] Use semantic HTML

## Before Submission
- [ ] Run `npm run lint:styles`
- [ ] Run `npm run test:visual`
- [ ] Run visual audit: `npm run audit:visual`
- [ ] Manual check against dashboard
- [ ] Verify accessibility (contrast, focus states)
- [ ] Check on multiple browsers
- [ ] Test dark mode toggle
- [ ] Review on mobile/tablet/desktop

## Code Review
- [ ] Reviewer confirms use of design tokens
- [ ] No hardcoded values
- [ ] Consistent with existing patterns
- [ ] Tests pass
- [ ] Accessibility compliant
```

---

## Part 9: Quick Reference

### CSS Variables Quick Copy-Paste

```css
/* Colors */
color: var(--primary-main);
color: var(--success-main);
color: var(--warning-main);
color: var(--danger-main);
color: var(--text-main);
color: var(--text-secondary);
color: var(--text-muted);

/* Backgrounds */
background: var(--bg-primary);
background: var(--bg-surface);
background: var(--bg-card);

/* Borders */
border-color: var(--border-base);
border-color: var(--border-light);

/* Typography */
font-family: var(--font-family-base);
font-family: var(--font-family-mono);
font-size: var(--font-size-lg);
font-weight: var(--font-weight-semibold);
line-height: var(--line-height-normal);

/* Spacing */
padding: var(--space-lg);
margin: var(--space-md);
gap: var(--space-md);

/* Styling */
border-radius: var(--radius-md);
box-shadow: var(--shadow-md);
transition: all var(--transition-normal);
```

---

## Summary

This comprehensive testing framework ensures:

✅ **Consistency** - All visual elements follow design system  
✅ **Maintainability** - Single source of truth (variables.css)  
✅ **Scalability** - Easy to add new pages/features  
✅ **Quality** - Automated + manual testing catches issues early  
✅ **Documentation** - Clear guidelines for developers  
✅ **Accessibility** - Built-in contrast and focus state checks  

**Next Steps:**
1. Create `styles/variables.css` (SINGLE SOURCE OF TRUTH)
2. Create `design-tokens.js` for JS-based checks
3. Set up test files in `tests/visual/`
4. Configure Jest and run initial tests
5. Create style guide documentation
6. Run visual audit on existing pages
7. Migrate pages to use variables only
