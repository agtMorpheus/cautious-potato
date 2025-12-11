/**
 * Unit Tests for Event Handlers Module (handlers.js)
 * Tests UI helper functions and event handlers
 */

import {
  showErrorAlert,
  showSuccessAlert,
  clearErrorAlerts,
  escapeHtml,
  setLoadingSpinner,
  formatFileSize
} from '../../js/handlers.js';

// Mock the state module
jest.mock('../../js/state.js', () => ({
  getState: jest.fn(() => ({})),
  setState: jest.fn(),
  resetState: jest.fn(),
  clearPersistedState: jest.fn(),
  setImportStatus: jest.fn(),
  setGenerateStatus: jest.fn(),
  setExportStatus: jest.fn(),
  updateProtokollData: jest.fn(),
  updateAbrechnungPositions: jest.fn(),
  updateAbrechnungHeader: jest.fn(),
  subscribe: jest.fn()
}));

// Mock utils module
jest.mock('../../js/utils.js', () => ({}));

// Mock utils-exceljs module
jest.mock('../../js/utils-exceljs.js', () => ({
  createAndExportAbrechnungExcelJS: jest.fn()
}));

// Mock cell-mapper module
jest.mock('../../js/cell-mapper.js', () => ({
  showCellMapperDialog: jest.fn(),
  applyMapping: jest.fn()
}));

// Mock utils-protokoll-export module
jest.mock('../../js/utils-protokoll-export.js', () => ({
  createAndExportProtokoll: jest.fn(),
  validateProtokollData: jest.fn(),
  generateProtokollFilename: jest.fn()
}));

describe('Event Handlers Module (handlers.js)', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="loading-spinner" style="display: none;">
        <div id="loading-message"></div>
      </div>
    `;
    
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('escapeHtml()', () => {
    test('escapes ampersand', () => {
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('escapes less than', () => {
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    test('escapes greater than', () => {
      expect(escapeHtml('>')).toBe('&gt;');
    });

    test('escapes double quotes', () => {
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    test('escapes single quotes', () => {
      expect(escapeHtml("'")).toBe('&#039;');
      expect(escapeHtml("It's")).toBe('It&#039;s');
    });

    test('escapes multiple special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    test('returns string unchanged if no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    test('handles non-string input', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(null)).toBe('null');
      expect(escapeHtml(undefined)).toBe('undefined');
    });

    test('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('showErrorAlert()', () => {
    test('creates error alert in container', () => {
      showErrorAlert('Error', 'Something went wrong');
      
      const container = document.getElementById('alert-container');
      const alerts = container.querySelectorAll('.alert-error');
      expect(alerts).toHaveLength(1);
    });

    test('sets correct title and message', () => {
      showErrorAlert('Test Error', 'This is a test message');
      
      const alert = document.querySelector('.alert-error');
      expect(alert.innerHTML).toContain('Test Error');
      expect(alert.innerHTML).toContain('This is a test message');
    });

    test('escapes HTML in title and message', () => {
      showErrorAlert('<script>bad</script>', '<img onerror="alert()">');
      
      const alert = document.querySelector('.alert-error');
      expect(alert.innerHTML).not.toContain('<script>');
      expect(alert.innerHTML).toContain('&lt;script&gt;');
    });

    test('has close button', () => {
      showErrorAlert('Error', 'Message');
      
      const closeBtn = document.querySelector('.alert-close');
      expect(closeBtn).not.toBeNull();
    });

    test('close button removes alert', () => {
      showErrorAlert('Error', 'Message');
      
      const closeBtn = document.querySelector('.alert-close');
      closeBtn.click();
      
      const alerts = document.querySelectorAll('.alert-error');
      expect(alerts).toHaveLength(0);
    });

    test('auto-dismisses after 8 seconds', () => {
      showErrorAlert('Error', 'Message');
      
      expect(document.querySelectorAll('.alert-error')).toHaveLength(1);
      
      jest.advanceTimersByTime(8000);
      
      expect(document.querySelectorAll('.alert-error')).toHaveLength(0);
    });

    test('logs error to console', () => {
      showErrorAlert('Error Title', 'Error Message');
      
      expect(console.error).toHaveBeenCalledWith('Error Title: Error Message');
    });

    test('falls back to alert() if container not found', () => {
      document.body.innerHTML = '';
      window.alert = jest.fn();
      
      showErrorAlert('Error', 'Message');
      
      expect(window.alert).toHaveBeenCalled();
    });
  });

  describe('showSuccessAlert()', () => {
    test('creates success alert in container', () => {
      showSuccessAlert('Success', 'Operation completed');
      
      const container = document.getElementById('alert-container');
      const alerts = container.querySelectorAll('.alert-success');
      expect(alerts).toHaveLength(1);
    });

    test('sets correct title and message', () => {
      showSuccessAlert('Test Success', 'This is a success message');
      
      const alert = document.querySelector('.alert-success');
      expect(alert.innerHTML).toContain('Test Success');
      expect(alert.innerHTML).toContain('This is a success message');
    });

    test('escapes HTML in title and message', () => {
      showSuccessAlert('<script>bad</script>', '<img onerror="alert()">');
      
      const alert = document.querySelector('.alert-success');
      expect(alert.innerHTML).not.toContain('<script>');
    });

    test('has close button', () => {
      showSuccessAlert('Success', 'Message');
      
      const closeBtn = document.querySelector('.alert-close');
      expect(closeBtn).not.toBeNull();
    });

    test('close button removes alert', () => {
      showSuccessAlert('Success', 'Message');
      
      const closeBtn = document.querySelector('.alert-close');
      closeBtn.click();
      
      const alerts = document.querySelectorAll('.alert-success');
      expect(alerts).toHaveLength(0);
    });

    test('auto-dismisses after 5 seconds', () => {
      showSuccessAlert('Success', 'Message');
      
      expect(document.querySelectorAll('.alert-success')).toHaveLength(1);
      
      jest.advanceTimersByTime(5000);
      
      expect(document.querySelectorAll('.alert-success')).toHaveLength(0);
    });

    test('logs to console', () => {
      showSuccessAlert('Success Title', 'Success Message');
      
      expect(console.log).toHaveBeenCalledWith('Success Title: Success Message');
    });

    test('handles missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => showSuccessAlert('Success', 'Message')).not.toThrow();
    });
  });

  describe('clearErrorAlerts()', () => {
    test('removes all alerts from container', () => {
      showErrorAlert('Error 1', 'Message 1');
      showErrorAlert('Error 2', 'Message 2');
      showSuccessAlert('Success', 'Message');
      
      expect(document.querySelectorAll('.alert')).toHaveLength(3);
      
      clearErrorAlerts();
      
      expect(document.querySelectorAll('.alert')).toHaveLength(0);
    });

    test('handles empty container', () => {
      clearErrorAlerts();
      
      const container = document.getElementById('alert-container');
      expect(container.innerHTML).toBe('');
    });

    test('handles missing container', () => {
      document.body.innerHTML = '';
      
      expect(() => clearErrorAlerts()).not.toThrow();
    });
  });

  describe('setLoadingSpinner()', () => {
    test('shows spinner when show is true', () => {
      setLoadingSpinner(true);
      
      const spinner = document.getElementById('loading-spinner');
      expect(spinner.style.display).toBe('flex');
    });

    test('hides spinner when show is false', () => {
      setLoadingSpinner(true);
      setLoadingSpinner(false);
      
      const spinner = document.getElementById('loading-spinner');
      expect(spinner.style.display).toBe('none');
    });

    test('sets loading message', () => {
      setLoadingSpinner(true, 'Loading data...');
      
      const message = document.getElementById('loading-message');
      expect(message.textContent).toBe('Loading data...');
    });

    test('handles missing spinner element', () => {
      document.body.innerHTML = '';
      
      expect(() => setLoadingSpinner(true)).not.toThrow();
    });

    test('handles missing message element', () => {
      document.body.innerHTML = '<div id="loading-spinner" style="display: none;"></div>';
      
      expect(() => setLoadingSpinner(true, 'Message')).not.toThrow();
    });
  });

  describe('formatFileSize()', () => {
    test('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    test('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    test('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    test('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    test('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('formats with decimal places', () => {
      expect(formatFileSize(1536)).toMatch(/1\.5 KB/);
    });
  });
});
