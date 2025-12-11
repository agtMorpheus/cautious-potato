/**
 * Design Tokens - SINGLE SOURCE OF TRUTH
 * 
 * JavaScript version of design system values.
 * Must be kept in sync with css/variables.css.
 * Used for visual consistency testing and validation.
 */

export const DESIGN_TOKENS = {
  // Colors - Primary Brand
  colors: {
    primary: {
      main: '#3b82f6',      // --c-primary-500
      hover: '#2563eb',     // --c-primary-600
      light: '#dbeafe',     // --c-primary-100
      rgb: '59, 130, 246',
    },
    
    // Semantic Colors
    success: '#10b981',     // --c-success
    warning: '#f59e0b',     // --c-warning
    danger: '#ef4444',      // --c-danger
    info: '#06b6d4',        // --c-info
    
    // Neutral Palette
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    
    // Background Colors (Light Mode)
    bg: {
      app: '#f9fafb',       // --bg-app
      surface: '#ffffff',   // --bg-surface
      card: '#ffffff',      // --bg-card
      hover: '#f3f4f6',     // --bg-hover
      glass: 'rgba(255, 255, 255, 0.8)',
    },
    
    // Text Colors (Light Mode)
    text: {
      main: '#111827',      // --text-main
      secondary: '#6b7280', // --text-secondary
      muted: '#6b7280',     // --text-muted
      inverse: '#ffffff',   // --text-inverse
    },
    
    // Border Colors (Light Mode)
    border: {
      base: '#e5e7eb',      // --border-base
      highlight: '#d1d5db', // --border-highlight
      glass: '#e5e7eb',     // --border-glass
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      base: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
      base: 1.5,
      relaxed: 1.625,
    },
  },
  
  // Spacing (based on 4px increments)
  spacing: {
    xs: '4px',   // 0.25rem
    sm: '8px',   // 0.5rem
    md: '16px',  // 1rem
    lg: '24px',  // 1.5rem
    xl: '32px',  // 2rem
    '2xl': '48px', // 3rem
  },
  
  // Border Radius
  borderRadius: {
    sm: '4px',      // 0.25rem
    md: '8px',      // 0.5rem
    lg: '12px',     // 0.75rem
    xl: '16px',     // 1rem
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms',
    normal: '250ms',
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  
  // Layout
  layout: {
    sidebarWidth: '260px',
    sidebarWidthCollapsed: '64px',
    headerHeight: '64px',
  },
};

/**
 * CSS Variable names that should be defined in :root
 * Used for validation testing
 */
export const REQUIRED_CSS_VARIABLES = {
  // Typography
  typography: [
    '--font-family-base',
    '--font-size-base',
    '--line-height-base',
  ],
  
  // Spacing
  spacing: [
    '--space-xs',
    '--space-sm',
    '--space-md',
    '--space-lg',
    '--space-xl',
    '--space-2xl',
  ],
  
  // Border Radius
  borderRadius: [
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-full',
  ],
  
  // Colors
  colors: [
    '--primary-main',
    '--primary-hover',
    '--primary-light',
    '--c-success',
    '--c-warning',
    '--c-danger',
    '--c-info',
  ],
  
  // Backgrounds
  backgrounds: [
    '--bg-app',
    '--bg-surface',
    '--bg-card',
    '--bg-hover',
    '--bg-glass',
  ],
  
  // Text
  text: [
    '--text-main',
    '--text-muted',
    '--text-inverse',
  ],
  
  // Borders
  borders: [
    '--border-base',
    '--border-highlight',
    '--border-glass',
  ],
  
  // Shadows
  shadows: [
    '--shadow-sm',
    '--shadow-md',
    '--shadow-lg',
  ],
  
  // Transitions
  transitions: [
    '--duration-fast',
    '--duration-normal',
    '--ease-out',
  ],
};

export default DESIGN_TOKENS;
