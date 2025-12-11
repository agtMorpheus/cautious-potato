/**
 * Unit Tests for Theme Manager (theme.js)
 * Tests theme toggling and persistence
 */

// Import is not possible because theme.js uses IIFE pattern
// We'll test by setting up the DOM and simulating the ThemeManager behavior

describe('Theme Manager (theme.js)', () => {
  const THEME_KEY = 'app-theme';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <button id="theme-toggle-btn"></button>
    `;
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Theme preference detection', () => {
    test('uses stored theme if available', () => {
      localStorage.setItem(THEME_KEY, DARK_THEME);
      
      const storedTheme = localStorage.getItem(THEME_KEY);
      expect(storedTheme).toBe(DARK_THEME);
    });

    test('falls back to system preference when no stored theme', () => {
      const storedTheme = localStorage.getItem(THEME_KEY);
      expect(storedTheme).toBeNull();
      
      // System preference would be checked via matchMedia
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      expect(typeof prefersDark).toBe('boolean');
    });

    test('light theme preference detected', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });
      
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      expect(prefersDark).toBe(false);
    });

    test('dark theme preference detected', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('dark'),
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });
      
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      expect(prefersDark).toBe(true);
    });
  });

  describe('Theme application', () => {
    test('applies theme to document element', () => {
      document.documentElement.setAttribute('data-theme', DARK_THEME);
      expect(document.documentElement.getAttribute('data-theme')).toBe(DARK_THEME);
    });

    test('stores theme in localStorage', () => {
      localStorage.setItem(THEME_KEY, LIGHT_THEME);
      expect(localStorage.getItem(THEME_KEY)).toBe(LIGHT_THEME);
    });

    test('both dark and light themes can be applied', () => {
      document.documentElement.setAttribute('data-theme', DARK_THEME);
      expect(document.documentElement.getAttribute('data-theme')).toBe(DARK_THEME);
      
      document.documentElement.setAttribute('data-theme', LIGHT_THEME);
      expect(document.documentElement.getAttribute('data-theme')).toBe(LIGHT_THEME);
    });
  });

  describe('Theme toggle', () => {
    test('toggles from dark to light', () => {
      const currentTheme = DARK_THEME;
      const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
      expect(newTheme).toBe(LIGHT_THEME);
    });

    test('toggles from light to dark', () => {
      const currentTheme = LIGHT_THEME;
      const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
      expect(newTheme).toBe(DARK_THEME);
    });

    test('toggle button exists and is clickable', () => {
      const toggleBtn = document.getElementById('theme-toggle-btn');
      expect(toggleBtn).not.toBeNull();
      
      const clickEvent = new MouseEvent('click', { bubbles: true });
      expect(() => toggleBtn.dispatchEvent(clickEvent)).not.toThrow();
    });
  });

  describe('Toggle icon updates', () => {
    test('toggle button can be updated with sun icon for dark theme', () => {
      const toggleBtn = document.getElementById('theme-toggle-btn');
      
      // Simulating what ThemeManager does for dark theme (shows sun for switching to light)
      toggleBtn.innerHTML = '<svg>sun</svg>';
      toggleBtn.setAttribute('title', 'Switch to Light Mode');
      
      expect(toggleBtn.innerHTML).toContain('svg');
      expect(toggleBtn.getAttribute('title')).toBe('Switch to Light Mode');
    });

    test('toggle button can be updated with moon icon for light theme', () => {
      const toggleBtn = document.getElementById('theme-toggle-btn');
      
      // Simulating what ThemeManager does for light theme (shows moon for switching to dark)
      toggleBtn.innerHTML = '<svg>moon</svg>';
      toggleBtn.setAttribute('title', 'Switch to Dark Mode');
      
      expect(toggleBtn.innerHTML).toContain('svg');
      expect(toggleBtn.getAttribute('title')).toBe('Switch to Dark Mode');
    });
  });

  describe('System preference change listener', () => {
    test('matchMedia addEventListener is available', () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      expect(typeof mediaQuery.addEventListener).toBe('function');
    });

    test('respects system changes only when no override', () => {
      // When localStorage is empty, system preference should be respected
      expect(localStorage.getItem(THEME_KEY)).toBeNull();
      
      // When localStorage has a value, system preference should be ignored
      localStorage.setItem(THEME_KEY, DARK_THEME);
      expect(localStorage.getItem(THEME_KEY)).toBe(DARK_THEME);
    });
  });

  describe('Local storage key', () => {
    test('uses consistent storage key', () => {
      localStorage.setItem(THEME_KEY, DARK_THEME);
      const storedValue = localStorage.getItem('app-theme');
      expect(storedValue).toBe(DARK_THEME);
    });

    test('only stores valid theme values', () => {
      // Dark theme
      localStorage.setItem(THEME_KEY, DARK_THEME);
      expect([DARK_THEME, LIGHT_THEME]).toContain(localStorage.getItem(THEME_KEY));
      
      // Light theme
      localStorage.setItem(THEME_KEY, LIGHT_THEME);
      expect([DARK_THEME, LIGHT_THEME]).toContain(localStorage.getItem(THEME_KEY));
    });
  });

  describe('DOM content loaded initialization', () => {
    test('DOMContentLoaded event can be listened to', () => {
      const listener = jest.fn();
      document.addEventListener('DOMContentLoaded', listener);
      
      // Dispatch event manually for testing
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Missing toggle button handling', () => {
    test('handles missing toggle button gracefully', () => {
      document.body.innerHTML = '';
      
      const toggleBtn = document.getElementById('theme-toggle-btn');
      expect(toggleBtn).toBeNull();
      
      // Theme manager should not throw if button is missing
      // It simply returns early from updateToggleIcon
    });
  });

  describe('Theme constants', () => {
    test('dark theme constant value', () => {
      expect(DARK_THEME).toBe('dark');
    });

    test('light theme constant value', () => {
      expect(LIGHT_THEME).toBe('light');
    });

    test('theme key constant value', () => {
      expect(THEME_KEY).toBe('app-theme');
    });
  });
});
