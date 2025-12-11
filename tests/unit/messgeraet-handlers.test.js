/**
 * messgeraet-handlers.test.js
 * Unit tests for the Messgerät handlers module
 */

import * as handlers from '../../js/messgeraet/messgeraet-handlers.js';
import * as state from '../../js/messgeraet/messgeraet-state.js';

describe('Messgerät Handlers', () => {
  
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    state.reset();
    state.init();
    
    // Set up minimal DOM
    document.body.innerHTML = `
      <div id="messgeraetContainer"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  // ===== VALIDATION =====
  describe('validateDevice()', () => {
    
    test('validates complete device data', () => {
      const result = handlers.validateDevice({
        name: 'Fluke 1654b',
        type: 'Kombinationsprüfgerät',
        fabrikat: 'Fluke',
        calibrationDate: '2025-12-31',
        identNr: '4312061'
      });

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    test('fails validation when name is missing', () => {
      const result = handlers.validateDevice({
        name: '',
        type: 'Multimeter'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeTruthy();
    });

    test('fails validation when type is missing', () => {
      const result = handlers.validateDevice({
        name: 'Test Device',
        type: ''
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.type).toBeTruthy();
    });

    test('fails validation when name is too long', () => {
      const result = handlers.validateDevice({
        name: 'A'.repeat(101),
        type: 'Multimeter'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeTruthy();
    });

    test('fails validation for invalid date format', () => {
      const result = handlers.validateDevice({
        name: 'Test',
        type: 'Multimeter',
        calibrationDate: 'invalid-date'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.calibrationDate).toBeTruthy();
    });

    test('passes validation with empty optional fields', () => {
      const result = handlers.validateDevice({
        name: 'Test Device',
        type: 'Multimeter',
        fabrikat: '',
        calibrationDate: '',
        identNr: ''
      });

      expect(result.isValid).toBe(true);
    });
  });

  // ===== ADD DEVICE =====
  describe('handleAddDevice()', () => {
    
    test('adds valid device', () => {
      const deviceId = handlers.handleAddDevice({
        name: 'New Device',
        type: 'Multimeter'
      });

      expect(deviceId).toBeTruthy();
      expect(state.getDevices().length).toBe(1);
    });

    test('returns null for invalid device', () => {
      const deviceId = handlers.handleAddDevice({
        name: '',
        type: ''
      });

      expect(deviceId).toBeNull();
      expect(state.getDevices().length).toBe(0);
    });

    test('sets validation errors for invalid device', () => {
      handlers.handleAddDevice({
        name: '',
        type: 'Multimeter'
      });

      expect(state.getValidationErrors().name).toBeTruthy();
    });

    test('clears editing state after successful add', () => {
      state.setEditingDevice('some-id');
      
      handlers.handleAddDevice({
        name: 'Test',
        type: 'Multimeter'
      });

      expect(state.getFormState().editingDeviceId).toBeNull();
    });
  });

  // ===== UPDATE DEVICE =====
  describe('handleUpdateDevice()', () => {
    
    test('updates existing device', () => {
      const device = state.addDevice({
        name: 'Original',
        type: 'Multimeter'
      });

      const success = handlers.handleUpdateDevice(device.id, {
        name: 'Updated',
        type: 'Multimeter'
      });

      expect(success).toBe(true);
      expect(state.getDevice(device.id).name).toBe('Updated');
    });

    test('returns false for invalid data', () => {
      const device = state.addDevice({
        name: 'Original',
        type: 'Multimeter'
      });

      const success = handlers.handleUpdateDevice(device.id, {
        name: '',
        type: 'Multimeter'
      });

      expect(success).toBe(false);
    });
  });

  // ===== DELETE DEVICE =====
  describe('handleDeleteDevice()', () => {
    
    test('deletes device when confirmed', () => {
      const device = state.addDevice({
        name: 'To Delete',
        type: 'Multimeter'
      });

      // Skip confirmation
      const success = handlers.handleDeleteDevice(device.id, true);

      expect(success).toBe(true);
      expect(state.getDevices().length).toBe(0);
    });

    test('returns false for non-existent device', () => {
      const success = handlers.handleDeleteDevice('non-existent', true);
      expect(success).toBe(false);
    });
  });

  // ===== EDIT DEVICE =====
  describe('handleEditDevice()', () => {
    
    test('sets editing device ID', () => {
      const device = state.addDevice({ name: 'Test' });
      handlers.handleEditDevice(device.id);

      expect(state.getFormState().editingDeviceId).toBe(device.id);
    });
  });

  // ===== CANCEL EDIT =====
  describe('handleCancelEdit()', () => {
    
    test('clears editing state', () => {
      state.setEditingDevice('some-id');
      handlers.handleCancelEdit();

      expect(state.getFormState().editingDeviceId).toBeNull();
    });

    test('clears validation errors', () => {
      state.setValidationError('name', 'Error');
      handlers.handleCancelEdit();

      expect(state.getValidationErrors()).toEqual({});
    });
  });

  // ===== SEARCH =====
  describe('handleSearchChange()', () => {
    
    test('updates search term', () => {
      handlers.handleSearchChange('test query');
      expect(state.getFormState().searchTerm).toBe('test query');
    });
  });

  // ===== FILTER =====
  describe('handleFilterTypeChange()', () => {
    
    test('updates filter type', () => {
      handlers.handleFilterTypeChange('Multimeter');
      expect(state.getFormState().filterType).toBe('Multimeter');
    });
  });

  // ===== FORM SUBMIT =====
  describe('handleFormSubmit()', () => {
    
    test('creates new device when not editing', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="name" value="New Device">
        <input name="type" value="Multimeter">
        <input name="fabrikat" value="">
        <input name="calibrationDate" value="">
        <input name="identNr" value="">
      `;

      const event = { preventDefault: jest.fn() };
      handlers.handleFormSubmit(event, form);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(state.getDevices().length).toBe(1);
    });

    test('updates device when editing', () => {
      const device = state.addDevice({
        name: 'Original',
        type: 'Multimeter'
      });
      state.setEditingDevice(device.id);

      const form = document.createElement('form');
      form.innerHTML = `
        <input name="name" value="Updated">
        <input name="type" value="Multimeter">
        <input name="fabrikat" value="">
        <input name="calibrationDate" value="">
        <input name="identNr" value="">
      `;

      const event = { preventDefault: jest.fn() };
      handlers.handleFormSubmit(event, form);

      expect(state.getDevice(device.id).name).toBe('Updated');
    });
  });
});
