/**
 * Unit Tests for Messgerät Handlers (messgeraet-handlers.js)
 */

import {
  init,
  validateDevice,
  handleAddDevice,
  handleUpdateDevice,
  handleDeleteDevice,
  handleEditDevice,
  handleCancelEdit,
  handleSearchChange,
  handleFilterTypeChange,
  handleFormSubmit
} from '../../js/messgeraet/messgeraet-handlers.js';

import * as state from '../../js/messgeraet/messgeraet-state.js';

// Mock state module
jest.mock('../../js/messgeraet/messgeraet-state.js', () => ({
  on: jest.fn(),
  setValidationError: jest.fn(),
  clearValidationErrors: jest.fn(),
  addDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDevice: jest.fn(),
  getDevice: jest.fn(),
  setEditingDevice: jest.fn(),
  setSearchTerm: jest.fn(),
  setFilterType: jest.fn(),
  getFormState: jest.fn()
}));

describe('Messgerät Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  describe('Initialization', () => {
    test('init sets up listeners', () => {
      // Spy on document.addEventListener
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      init();

      expect(state.on).toHaveBeenCalledWith('deviceAdded', expect.any(Function));
      expect(state.on).toHaveBeenCalledWith('deviceUpdated', expect.any(Function));
      expect(state.on).toHaveBeenCalledWith('deviceDeleted', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Validation', () => {
    test('validateDevice returns valid for correct data', () => {
      const device = {
        name: 'Test Device',
        type: 'Test Type',
        calibrationDate: '2025-01-01'
      };
      const result = validateDevice(device);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('validateDevice fails for missing required fields', () => {
      const device = { name: '' };
      const result = validateDevice(device);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('name');
      expect(result.errors).toHaveProperty('type');
    });

    test('validateDevice fails for invalid date', () => {
      const device = {
        name: 'Device',
        type: 'Type',
        calibrationDate: 'invalid-date'
      };
      const result = validateDevice(device);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('calibrationDate');
    });
  });

  describe('CRUD Handlers', () => {
    test('handleAddDevice calls state.addDevice on valid input', () => {
      const newDevice = { id: 'new-id', name: 'New Device', type: 'Type' };
      state.addDevice.mockReturnValue(newDevice);

      const device = { name: 'New Device', type: 'Type' };
      const result = handleAddDevice(device);

      expect(state.addDevice).toHaveBeenCalledWith(device);
      expect(state.setEditingDevice).toHaveBeenCalledWith(null);
      expect(result).toBe('new-id');
    });

    test('handleAddDevice returns null on invalid input', () => {
      const device = { name: '' };
      const result = handleAddDevice(device);

      expect(state.addDevice).not.toHaveBeenCalled();
      expect(state.setValidationError).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('handleUpdateDevice calls state.updateDevice on valid input', () => {
      state.updateDevice.mockReturnValue(true);

      const device = { name: 'Updated Device', type: 'Type' };
      const result = handleUpdateDevice('id-1', device);

      expect(state.updateDevice).toHaveBeenCalledWith('id-1', device);
      expect(result).toBe(true);
    });

    test('handleDeleteDevice calls state.deleteDevice', () => {
      state.deleteDevice.mockReturnValue(true);
      state.getDevice.mockReturnValue({ name: 'Test' });

      const result = handleDeleteDevice('id-1');

      expect(window.confirm).toHaveBeenCalled();
      expect(state.deleteDevice).toHaveBeenCalledWith('id-1');
      expect(result).toBe(true);
    });

    test('handleDeleteDevice skips confirm when specified', () => {
      state.deleteDevice.mockReturnValue(true);

      handleDeleteDevice('id-1', true);

      expect(window.confirm).not.toHaveBeenCalled();
      expect(state.deleteDevice).toHaveBeenCalledWith('id-1');
    });
  });

  describe('UI Interaction Handlers', () => {
    test('handleEditDevice sets editing state', () => {
      handleEditDevice('id-1');
      expect(state.setEditingDevice).toHaveBeenCalledWith('id-1');
    });

    test('handleCancelEdit clears editing state', () => {
      handleCancelEdit();
      expect(state.setEditingDevice).toHaveBeenCalledWith(null);
      expect(state.clearValidationErrors).toHaveBeenCalled();
    });

    test('handleSearchChange updates state', () => {
      handleSearchChange('query');
      expect(state.setSearchTerm).toHaveBeenCalledWith('query');
    });

    test('handleFormSubmit handles add mode', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="name" value="New Device" />
        <input name="type" value="Type A" />
      `;
      const event = { preventDefault: jest.fn() };

      state.getFormState.mockReturnValue({ editingDeviceId: null });
      state.addDevice.mockReturnValue('new-id');

      handleFormSubmit(event, form);

      expect(state.addDevice).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Device',
        type: 'Type A'
      }));
    });

    test('handleFormSubmit handles edit mode', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="name" value="Updated Device" />
        <input name="type" value="Type A" />
      `;
      const event = { preventDefault: jest.fn() };

      state.getFormState.mockReturnValue({ editingDeviceId: 'id-1' });
      state.updateDevice.mockReturnValue(true);

      handleFormSubmit(event, form);

      expect(state.updateDevice).toHaveBeenCalledWith('id-1', expect.objectContaining({
        name: 'Updated Device'
      }));
    });
  });

  describe('DOM Events', () => {
      test('Clicking delete button triggers delete handler', () => {
          init(); // Bind events

          state.deleteDevice.mockReturnValue(true);
          state.getDevice.mockReturnValue({ name: 'Test' });

          const btn = document.createElement('button');
          btn.setAttribute('data-messgeraet-action', 'delete');
          btn.setAttribute('data-device-id', 'dev-1');
          document.body.appendChild(btn);

          btn.click();

          expect(state.deleteDevice).toHaveBeenCalledWith('dev-1');
      });

      test('Clicking edit button triggers edit handler', () => {
          init();

          const btn = document.createElement('button');
          btn.setAttribute('data-messgeraet-action', 'edit');
          btn.setAttribute('data-device-id', 'dev-1');
          document.body.appendChild(btn);

          btn.click();

          expect(state.setEditingDevice).toHaveBeenCalledWith('dev-1');
      });
  });
});
