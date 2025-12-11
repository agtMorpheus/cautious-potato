/**
 * Unit Tests for Messgerät Renderer Module (messgeraet-renderer.js)
 * Tests UI rendering and updates for the Messgerät module
 */

import {
  init,
  renderDeviceList,
  showDeviceForm,
  hideDeviceForm,
  displayFieldError,
  clearFieldError,
  displayMessage
} from '../../js/messgeraet/messgeraet-renderer.js';

import * as state from '../../js/messgeraet/messgeraet-state.js';
import * as handlers from '../../js/messgeraet/messgeraet-handlers.js';

// Mock dependencies
jest.mock('../../js/messgeraet/messgeraet-state.js', () => ({
  getDevices: jest.fn(() => []),
  getDevice: jest.fn(),
  getDeviceTypes: jest.fn(() => ['Multimeter', 'Oszilloskop', 'Prüfgerät']),
  getFormState: jest.fn(() => ({ searchTerm: '', filterType: '' })),
  getValidDevices: jest.fn(() => []),
  clearValidationErrors: jest.fn()
}));

jest.mock('../../js/messgeraet/messgeraet-handlers.js', () => ({
  handleFormSubmit: jest.fn(),
  handleSearchChange: jest.fn(),
  handleFilterTypeChange: jest.fn()
}));

describe('Messgerät Renderer Module (messgeraet-renderer.js)', () => {
  let container;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create container element
    container = document.createElement('div');
    container.id = 'messgeraetContainer';
    document.body.appendChild(container);
    
    // Default mock implementations
    state.getDevices.mockReturnValue([
      {
        id: 'dev-1',
        name: 'Fluke 1654b',
        type: 'Prüfgerät',
        fabrikat: 'Fluke',
        identNr: '4312061',
        calibrationDate: '2025-12-31'
      },
      {
        id: 'dev-2',
        name: 'Tektronix TDS 2024',
        type: 'Oszilloskop',
        fabrikat: 'Tektronix',
        identNr: '7890123',
        calibrationDate: '2024-06-15'
      }
    ]);
    
    state.getValidDevices.mockReturnValue([
      { id: 'dev-1', calibrationDate: '2025-12-31' }
    ]);
    
    state.getDevice.mockImplementation((id) => {
      const devices = state.getDevices();
      return devices.find(d => d.id === id) || null;
    });
    
    state.getFormState.mockReturnValue({
      searchTerm: '',
      filterType: ''
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('init()', () => {
    test('initializes renderer', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      init();
      
      expect(consoleSpy).toHaveBeenCalledWith('Initializing Messgerät Renderer');
      consoleSpy.mockRestore();
    });

    test('warns when container not found', () => {
      document.body.innerHTML = ''; // Remove container
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      init();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Container messgeraetContainer not found')
      );
      consoleSpy.mockRestore();
    });

    test('renders device list on init', () => {
      init();
      
      expect(container.innerHTML).not.toBe('');
    });
  });

  describe('renderDeviceList()', () => {
    test('renders device table when devices exist', () => {
      renderDeviceList();
      
      expect(container.querySelector('.messgeraet-table')).not.toBeNull();
    });

    test('renders empty state when no devices', () => {
      state.getDevices.mockReturnValue([]);
      
      renderDeviceList();
      
      expect(container.querySelector('.messgeraet-empty-state')).not.toBeNull();
    });

    test('shows device count in statistics', () => {
      renderDeviceList();
      
      const statValues = container.querySelectorAll('.stat-value');
      expect(statValues.length).toBeGreaterThan(0);
    });

    test('renders search input', () => {
      renderDeviceList();
      
      const searchInput = container.querySelector('#messgeraet-search');
      expect(searchInput).not.toBeNull();
    });

    test('renders type filter dropdown', () => {
      renderDeviceList();
      
      const typeFilter = container.querySelector('#messgeraet-type-filter');
      expect(typeFilter).not.toBeNull();
    });

    test('renders add button', () => {
      renderDeviceList();
      
      const addBtn = container.querySelector('[data-messgeraet-action="add"]');
      expect(addBtn).not.toBeNull();
    });

    test('renders device rows', () => {
      renderDeviceList();
      
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    test('filters devices by search term', () => {
      state.getFormState.mockReturnValue({
        searchTerm: 'fluke',
        filterType: ''
      });
      
      renderDeviceList();
      
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    test('filters devices by type', () => {
      state.getFormState.mockReturnValue({
        searchTerm: '',
        filterType: 'Oszilloskop'
      });
      
      renderDeviceList();
      
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    test('applies both search and type filters', () => {
      state.getFormState.mockReturnValue({
        searchTerm: 'fluke',
        filterType: 'Prüfgerät'
      });
      
      renderDeviceList();
      
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    test('renders edit buttons for each device', () => {
      renderDeviceList();
      
      const editBtns = container.querySelectorAll('[data-messgeraet-action="edit"]');
      expect(editBtns.length).toBe(2);
    });

    test('renders delete buttons for each device', () => {
      renderDeviceList();
      
      const deleteBtns = container.querySelectorAll('[data-messgeraet-action="delete"]');
      expect(deleteBtns.length).toBe(2);
    });

    test('shows calibration status', () => {
      renderDeviceList();
      
      const statusBadges = container.querySelectorAll('.calibration-status');
      expect(statusBadges.length).toBe(2);
    });

    test('does nothing when container not found', () => {
      document.body.innerHTML = '';
      
      expect(() => renderDeviceList()).not.toThrow();
    });
  });

  describe('showDeviceForm()', () => {
    test('creates modal for add mode', () => {
      showDeviceForm('add');
      
      const modal = document.getElementById('messgeraetFormModal');
      expect(modal).not.toBeNull();
    });

    test('creates modal for edit mode with device data', () => {
      showDeviceForm('edit', 'dev-1');
      
      const modal = document.getElementById('messgeraetFormModal');
      expect(modal).not.toBeNull();
      
      const nameInput = document.getElementById('device-name');
      expect(nameInput.value).toBe('Fluke 1654b');
    });

    test('sets correct title for add mode', () => {
      showDeviceForm('add');
      
      const title = document.getElementById('messgeraet-modal-title');
      expect(title.textContent).toBe('Neues Messgerät');
    });

    test('sets correct title for edit mode', () => {
      showDeviceForm('edit', 'dev-1');
      
      const title = document.getElementById('messgeraet-modal-title');
      expect(title.textContent).toBe('Messgerät bearbeiten');
    });

    test('modal has ARIA attributes', () => {
      showDeviceForm('add');
      
      const modal = document.getElementById('messgeraetFormModal');
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
    });

    test('removes existing modal before creating new one', () => {
      showDeviceForm('add');
      showDeviceForm('add');
      
      const modals = document.querySelectorAll('#messgeraetFormModal');
      expect(modals.length).toBe(1);
    });

    test('renders form fields', () => {
      showDeviceForm('add');
      
      expect(document.getElementById('device-name')).not.toBeNull();
      expect(document.getElementById('device-type')).not.toBeNull();
      expect(document.getElementById('device-fabrikat')).not.toBeNull();
      expect(document.getElementById('device-identNr')).not.toBeNull();
      expect(document.getElementById('device-calibrationDate')).not.toBeNull();
    });

    test('renders device type options', () => {
      showDeviceForm('add');
      
      const typeSelect = document.getElementById('device-type');
      const options = typeSelect.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
    });

    test('renders cancel button', () => {
      showDeviceForm('add');
      
      const cancelBtn = document.querySelector('[data-messgeraet-action="cancel"]');
      expect(cancelBtn).not.toBeNull();
    });

    test('renders submit button', () => {
      showDeviceForm('add');
      
      const submitBtn = document.querySelector('button[type="submit"]');
      expect(submitBtn).not.toBeNull();
    });

    test('focuses first input after show', () => {
      jest.useFakeTimers();
      
      showDeviceForm('add');
      
      jest.advanceTimersByTime(100);
      
      // Focus is set after timeout
      jest.useRealTimers();
    });
  });

  describe('hideDeviceForm()', () => {
    test('removes modal from DOM', () => {
      showDeviceForm('add');
      hideDeviceForm();
      
      const modal = document.getElementById('messgeraetFormModal');
      expect(modal).toBeNull();
    });

    test('clears validation errors', () => {
      showDeviceForm('add');
      hideDeviceForm();
      
      expect(state.clearValidationErrors).toHaveBeenCalled();
    });

    test('does nothing when no modal exists', () => {
      expect(() => hideDeviceForm()).not.toThrow();
    });
  });

  describe('displayFieldError()', () => {
    beforeEach(() => {
      showDeviceForm('add');
    });

    test('displays error message', () => {
      displayFieldError('name', 'Name ist erforderlich');
      
      const errorDiv = document.getElementById('error-name');
      expect(errorDiv.textContent).toBe('Name ist erforderlich');
      expect(errorDiv.style.display).toBe('block');
    });

    test('adds error class to field', () => {
      displayFieldError('name', 'Error');
      
      const field = document.querySelector('[name="name"]');
      expect(field.classList.contains('error')).toBe(true);
    });

    test('sets aria-invalid attribute', () => {
      displayFieldError('name', 'Error');
      
      const field = document.querySelector('[name="name"]');
      expect(field.getAttribute('aria-invalid')).toBe('true');
    });

    test('sets aria-describedby attribute', () => {
      displayFieldError('name', 'Error');
      
      const field = document.querySelector('[name="name"]');
      expect(field.getAttribute('aria-describedby')).toBe('error-name');
    });
  });

  describe('clearFieldError()', () => {
    beforeEach(() => {
      showDeviceForm('add');
      displayFieldError('name', 'Error');
    });

    test('clears error message', () => {
      clearFieldError('name');
      
      const errorDiv = document.getElementById('error-name');
      expect(errorDiv.textContent).toBe('');
      expect(errorDiv.style.display).toBe('none');
    });

    test('removes error class from field', () => {
      clearFieldError('name');
      
      const field = document.querySelector('[name="name"]');
      expect(field.classList.contains('error')).toBe(false);
    });

    test('removes aria-invalid attribute', () => {
      clearFieldError('name');
      
      const field = document.querySelector('[name="name"]');
      expect(field.hasAttribute('aria-invalid')).toBe(false);
    });

    test('removes aria-describedby attribute', () => {
      clearFieldError('name');
      
      const field = document.querySelector('[name="name"]');
      expect(field.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('displayMessage()', () => {
    test('creates message container if not exists', () => {
      displayMessage('success', 'Test message');
      
      const container = document.getElementById('messgeraetMessageContainer');
      expect(container).not.toBeNull();
    });

    test('displays success message', () => {
      displayMessage('success', 'Success message');
      
      const message = document.querySelector('.message-success');
      expect(message).not.toBeNull();
      expect(message.textContent).toContain('Success message');
    });

    test('displays error message', () => {
      displayMessage('error', 'Error message');
      
      const message = document.querySelector('.message-error');
      expect(message).not.toBeNull();
    });

    test('displays info message', () => {
      displayMessage('info', 'Info message');
      
      const message = document.querySelector('.message-info');
      expect(message).not.toBeNull();
    });

    test('displays warning message', () => {
      displayMessage('warning', 'Warning message');
      
      const message = document.querySelector('.message-warning');
      expect(message).not.toBeNull();
    });

    test('message has close button', () => {
      displayMessage('success', 'Message');
      
      const closeBtn = document.querySelector('.message-close');
      expect(closeBtn).not.toBeNull();
    });

    test('close button removes message', () => {
      displayMessage('success', 'Message');
      
      const closeBtn = document.querySelector('.message-close');
      closeBtn.click();
      
      const messages = document.querySelectorAll('.message');
      expect(messages.length).toBe(0);
    });

    test('message auto-removes after timeout', () => {
      jest.useFakeTimers();
      
      displayMessage('success', 'Message');
      
      jest.advanceTimersByTime(5000);
      
      const messages = document.querySelectorAll('.message');
      expect(messages.length).toBe(0);
      
      jest.useRealTimers();
    });

    test('sets role="alert" for error messages', () => {
      displayMessage('error', 'Error');
      
      const message = document.querySelector('.message-error');
      expect(message.getAttribute('role')).toBe('alert');
    });

    test('sets role="status" for non-error messages', () => {
      displayMessage('success', 'Success');
      
      const message = document.querySelector('.message-success');
      expect(message.getAttribute('role')).toBe('status');
    });
  });

  describe('XSS Prevention', () => {
    test('escapes HTML in device names', () => {
      state.getDevices.mockReturnValue([{
        id: 'dev-xss',
        name: '<script>alert("xss")</script>',
        type: 'Test',
        fabrikat: '',
        identNr: '',
        calibrationDate: null
      }]);
      
      renderDeviceList();
      
      expect(container.innerHTML).not.toContain('<script>');
    });

    test('escapes HTML in messages', () => {
      displayMessage('success', '<img onerror="alert(1)" src="x">');
      
      const messageText = document.querySelector('.message-text');
      expect(messageText.innerHTML).not.toContain('<img');
    });
  });

  describe('Event Listeners', () => {
    test('search input triggers handler', () => {
      renderDeviceList();
      
      const searchInput = document.getElementById('messgeraet-search');
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));
      
      expect(handlers.handleSearchChange).toHaveBeenCalledWith('test');
    });

    test('type filter triggers handler', () => {
      renderDeviceList();
      
      const typeFilter = document.getElementById('messgeraet-type-filter');
      typeFilter.value = 'Multimeter';
      typeFilter.dispatchEvent(new Event('change'));
      
      expect(handlers.handleFilterTypeChange).toHaveBeenCalledWith('Multimeter');
    });
  });

  describe('Calibration Status', () => {
    test('shows valid status for future calibration date', () => {
      state.getDevices.mockReturnValue([{
        id: 'dev-valid',
        name: 'Valid Device',
        type: 'Test',
        calibrationDate: '2099-12-31'
      }]);
      
      renderDeviceList();
      
      const status = container.querySelector('.status-valid');
      expect(status).not.toBeNull();
    });

    test('shows expired status for past calibration date', () => {
      state.getDevices.mockReturnValue([{
        id: 'dev-expired',
        name: 'Expired Device',
        type: 'Test',
        calibrationDate: '2020-01-01'
      }]);
      
      renderDeviceList();
      
      const status = container.querySelector('.status-expired');
      expect(status).not.toBeNull();
    });

    test('shows expired status for no calibration date', () => {
      state.getDevices.mockReturnValue([{
        id: 'dev-no-date',
        name: 'No Date Device',
        type: 'Test',
        calibrationDate: null
      }]);
      
      renderDeviceList();
      
      const status = container.querySelector('.status-expired');
      expect(status).not.toBeNull();
    });
  });

  describe('Statistics', () => {
    test('displays total device count', () => {
      renderDeviceList();
      
      const statValue = container.querySelector('.messgeraet-stat-card .stat-value');
      expect(statValue.textContent).toBe('2');
    });

    test('displays valid calibration count', () => {
      renderDeviceList();
      
      const statCards = container.querySelectorAll('.messgeraet-stat-card');
      expect(statCards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Table Accessibility', () => {
    test('table has role="grid"', () => {
      renderDeviceList();
      
      const table = container.querySelector('.messgeraet-table');
      expect(table.getAttribute('role')).toBe('grid');
    });

    test('table has aria-label', () => {
      renderDeviceList();
      
      const table = container.querySelector('.messgeraet-table');
      expect(table.getAttribute('aria-label')).toBe('Messgeräte-Liste');
    });

    test('table headers have scope="col"', () => {
      renderDeviceList();
      
      const headers = container.querySelectorAll('th[scope="col"]');
      expect(headers.length).toBeGreaterThan(0);
    });
  });
});
