/**
 * Visual Tests Setup File
 * 
 * Loads CSS variables and sets up the DOM environment for visual consistency testing.
 * This file is used specifically for visual tests that need CSS variables loaded.
 */

import fs from 'fs';
import path from 'path';

/**
 * Load CSS variables from the variables.css file into the test environment
 */
export function loadCSSVariables() {
  try {
    const cssPath = path.resolve(process.cwd(), 'css/variables.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = cssContent;
    document.head.appendChild(styleSheet);
    
    return true;
  } catch (error) {
    console.warn('Could not load CSS variables:', error.message);
    return false;
  }
}

/**
 * Load additional CSS files for component testing
 * @param {string[]} cssFiles - Array of CSS file paths relative to project root
 */
export function loadAdditionalCSS(cssFiles) {
  const loadedFiles = [];
  
  cssFiles.forEach(file => {
    try {
      const cssPath = path.resolve(process.cwd(), file);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      
      const styleSheet = document.createElement('style');
      styleSheet.textContent = cssContent;
      document.head.appendChild(styleSheet);
      loadedFiles.push(file);
    } catch (error) {
      console.warn(`Could not load CSS file ${file}:`, error.message);
    }
  });
  
  return loadedFiles;
}

/**
 * Create a mock DOM element with specific styles for testing
 * @param {string} tagName - HTML tag name
 * @param {object} options - Options for the element
 * @returns {HTMLElement}
 */
export function createTestElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  
  if (options.className) {
    element.className = options.className;
  }
  
  if (options.style) {
    Object.assign(element.style, options.style);
  }
  
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options.appendTo !== false) {
    document.body.appendChild(element);
  }
  
  return element;
}

/**
 * Clean up test elements from the DOM
 */
export function cleanupTestElements() {
  const testElements = document.querySelectorAll('[data-test-element]');
  testElements.forEach(el => el.remove());
}

/**
 * Get computed CSS variable value
 * @param {string} variableName - CSS variable name (with or without --)
 * @returns {string}
 */
export function getCSSVariable(variableName) {
  const name = variableName.startsWith('--') ? variableName : `--${variableName}`;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Check if a CSS variable is defined
 * @param {string} variableName - CSS variable name
 * @returns {boolean}
 */
export function isCSSVariableDefined(variableName) {
  const value = getCSSVariable(variableName);
  return value !== '' && value !== undefined;
}

/**
 * Parse a color value to RGB
 * @param {string} color - Color value (hex, rgb, rgba)
 * @returns {object|null} - {r, g, b, a} or null if invalid
 */
export function parseColor(color) {
  if (!color) return null;
  
  // Handle 6-character hex colors
  const hexMatch6 = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch6) {
    const hex = hexMatch6[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }
  
  // Handle 3-character shorthand hex colors (e.g., #fff -> #ffffff)
  const hexMatch3 = color.match(/^#([0-9a-f]{3})$/i);
  if (hexMatch3) {
    const hex = hexMatch3[1];
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1
    };
  }
  
  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
    };
  }
  
  return null;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First color
 * @param {string} color2 - Second color
 * @returns {number} - Contrast ratio
 */
export function calculateContrastRatio(color1, color2) {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  
  if (!c1 || !c2) return 0;
  
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}
