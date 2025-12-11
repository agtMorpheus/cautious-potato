/**
 * messgeraet-state.test.js
 * Unit tests for the Messgerät state management module
 */

import * as state from '../../js/messgeraet/messgeraet-state.js';

describe('Messgerät State', () => {
  
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    state.reset();
    state.init();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ===== INITIALIZATION =====
  describe('init()', () => {
    test('initializes with empty devices array', () => {
      const devices = state.getDevices();
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBe(0);
    });

    test('initializes with default form state', () => {
      const formState = state.getFormState();
      expect(formState.editingDeviceId).toBeNull();
      expect(formState.unsavedChanges).toBe(false);
      expect(formState.validationErrors).toEqual({});
    });

    test('loads state from localStorage if exists', () => {
      // Add a device first
      state.addDevice({
        name: 'Test Device',
        type: 'Multimeter',
        identNr: 'TD001'
      });
      state.forceSave();

      // Reinitialize
      state.init();

      const devices = state.getDevices();
      expect(devices.length).toBe(1);
      expect(devices[0].name).toBe('Test Device');
    });
  });

  // ===== DEVICE CRUD OPERATIONS =====
  describe('Device CRUD', () => {
    
    describe('addDevice()', () => {
      test('adds a new device with generated ID', () => {
        const device = state.addDevice({
          name: 'Fluke 1654b',
          type: 'Kombinationsprüfgerät',
          fabrikat: 'Fluke',
          calibrationDate: '2025-12-31',
          identNr: '4312061'
        });

        expect(device).toBeTruthy();
        expect(device.id).toBeTruthy();
        expect(device.id).toMatch(/^MG-/);

        const devices = state.getDevices();
        expect(devices.length).toBe(1);
        expect(devices[0].name).toBe('Fluke 1654b');
        expect(devices[0].type).toBe('Kombinationsprüfgerät');
      });

      test('returns null for invalid device', () => {
        const result = state.addDevice(null);
        expect(result).toBeNull();
      });

      test('sets default type if not provided', () => {
        state.addDevice({ name: 'Test' });
        const devices = state.getDevices();
        expect(devices[0].type).toBe('Sonstiges');
      });
    });

    describe('getDevice()', () => {
      test('returns device by ID', () => {
        const addedDevice = state.addDevice({
          name: 'Test Device',
          type: 'Multimeter'
        });

        const device = state.getDevice(addedDevice.id);
        expect(device).not.toBeNull();
        expect(device.name).toBe('Test Device');
      });

      test('returns null for non-existent ID', () => {
        const device = state.getDevice('non-existent-id');
        expect(device).toBeNull();
      });
    });

    describe('updateDevice()', () => {
      test('updates device fields', () => {
        const addedDevice = state.addDevice({
          name: 'Original Name',
          type: 'Multimeter'
        });

        const success = state.updateDevice(addedDevice.id, {
          name: 'Updated Name',
          identNr: 'UPDATED123'
        });

        expect(success).toBe(true);
        const device = state.getDevice(addedDevice.id);
        expect(device.name).toBe('Updated Name');
        expect(device.identNr).toBe('UPDATED123');
      });

      test('returns false for non-existent device', () => {
        const success = state.updateDevice('non-existent', { name: 'Test' });
        expect(success).toBe(false);
      });

      test('sets updatedAt timestamp on update', () => {
        const device = state.addDevice({ name: 'Test' });
        const deviceBefore = state.getDevice(device.id);

        // Update the device
        state.updateDevice(device.id, { name: 'Updated' });
        const deviceAfter = state.getDevice(device.id);

        // updatedAt should exist and be a valid date
        expect(deviceAfter.updatedAt).toBeTruthy();
        expect(new Date(deviceAfter.updatedAt).getTime()).not.toBeNaN();
      });
    });

    describe('deleteDevice()', () => {
      test('removes device from state', () => {
        const device = state.addDevice({ name: 'To Delete' });
        expect(state.getDevices().length).toBe(1);

        const success = state.deleteDevice(device.id);
        expect(success).toBe(true);
        expect(state.getDevices().length).toBe(0);
      });

      test('returns false for non-existent device', () => {
        const success = state.deleteDevice('non-existent');
        expect(success).toBe(false);
      });
    });
  });

  // ===== DEVICE QUERIES =====
  describe('Device Queries', () => {
    
    beforeEach(() => {
      // Add test devices
      state.addDevice({
        name: 'Device A',
        type: 'Multimeter',
        calibrationDate: '2099-12-31' // Valid
      });
      state.addDevice({
        name: 'Device B',
        type: 'Isolationsmessgerät',
        calibrationDate: '2020-01-01' // Expired
      });
      state.addDevice({
        name: 'Device C',
        type: 'Multimeter',
        calibrationDate: '' // No date
      });
    });

    test('getDevicesByType returns devices of specified type', () => {
      const multimeters = state.getDevicesByType('Multimeter');
      expect(multimeters.length).toBe(2);
      expect(multimeters.every(d => d.type === 'Multimeter')).toBe(true);
    });

    test('getValidDevices returns only devices with valid calibration', () => {
      const valid = state.getValidDevices();
      expect(valid.length).toBe(1);
      expect(valid[0].name).toBe('Device A');
    });

    test('getDevicesForDropdown returns formatted options', () => {
      const options = state.getDevicesForDropdown();
      expect(options.length).toBe(3);
      expect(options[0]).toHaveProperty('id');
      expect(options[0]).toHaveProperty('label');
      expect(options[0]).toHaveProperty('isExpired');
    });

    test('getDeviceCount returns correct count', () => {
      expect(state.getDeviceCount()).toBe(3);
    });
  });

  // ===== FORM STATE =====
  describe('Form State', () => {
    
    test('setEditingDevice updates editing state', () => {
      const device = state.addDevice({ name: 'Test' });
      state.setEditingDevice(device.id);

      expect(state.getFormState().editingDeviceId).toBe(device.id);
    });

    test('setSearchTerm updates search state', () => {
      state.setSearchTerm('test query');
      expect(state.getFormState().searchTerm).toBe('test query');
    });

    test('setFilterType updates filter state', () => {
      state.setFilterType('Multimeter');
      expect(state.getFormState().filterType).toBe('Multimeter');
    });

    test('setValidationError adds error', () => {
      state.setValidationError('name', 'Name is required');
      expect(state.getValidationErrors().name).toBe('Name is required');
    });

    test('setValidationError with null clears error', () => {
      state.setValidationError('name', 'Error');
      state.setValidationError('name', null);
      expect(state.getValidationErrors().name).toBeUndefined();
    });

    test('clearValidationErrors removes all errors', () => {
      state.setValidationError('name', 'Error 1');
      state.setValidationError('type', 'Error 2');
      state.clearValidationErrors();
      expect(state.getValidationErrors()).toEqual({});
    });
  });

  // ===== DEVICE TYPES =====
  describe('Device Types', () => {
    test('getDeviceTypes returns array of types', () => {
      const types = state.getDeviceTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('Multimeter');
      expect(types).toContain('Kombinationsprüfgerät');
    });
  });

  // ===== PERSISTENCE =====
  describe('Persistence', () => {
    test('markUnsaved sets unsaved flag', () => {
      state.markUnsaved();
      expect(state.hasUnsavedChanges()).toBe(true);
    });

    test('clearUnsaved clears unsaved flag', () => {
      state.markUnsaved();
      state.clearUnsaved();
      expect(state.hasUnsavedChanges()).toBe(false);
    });

    test('reset clears all state', () => {
      state.addDevice({ name: 'Test' });
      state.setSearchTerm('query');
      
      state.reset();
      
      expect(state.getDevices().length).toBe(0);
      expect(state.getFormState().searchTerm).toBe('');
    });

    test('forceSave saves to localStorage immediately', () => {
      state.addDevice({ name: 'Test Device' });
      state.forceSave();

      const saved = localStorage.getItem('messgeraet_state');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved).devices.length).toBe(1);
    });
  });

  // ===== EVENTS =====
  describe('Event System', () => {
    test('on() subscribes to events', () => {
      const callback = jest.fn();
      state.on('deviceAdded', callback);

      state.addDevice({ name: 'Test' });

      expect(callback).toHaveBeenCalled();
    });

    test('on() returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = state.on('deviceAdded', callback);

      unsubscribe();
      state.addDevice({ name: 'Test' });

      expect(callback).not.toHaveBeenCalled();
    });

    test('emits deviceUpdated event on update', () => {
      const callback = jest.fn();
      state.on('deviceUpdated', callback);

      const device = state.addDevice({ name: 'Test' });
      state.updateDevice(device.id, { name: 'Updated' });

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        deviceId: device.id
      }));
    });

    test('emits deviceDeleted event on delete', () => {
      const callback = jest.fn();
      state.on('deviceDeleted', callback);

      const device = state.addDevice({ name: 'Test' });
      state.deleteDevice(device.id);

      expect(callback).toHaveBeenCalledWith({ deviceId: device.id });
    });
  });

  // ===== STATE IMMUTABILITY =====
  describe('State Immutability', () => {
    test('getDevices returns a copy', () => {
      state.addDevice({ name: 'Test' });
      const devices = state.getDevices();
      devices.push({ name: 'Fake' });

      expect(state.getDevices().length).toBe(1);
    });

    test('getDevice returns a copy', () => {
      const addedDevice = state.addDevice({ name: 'Test' });
      const device = state.getDevice(addedDevice.id);
      device.name = 'Modified';

      expect(state.getDevice(addedDevice.id).name).toBe('Test');
    });
  });
});
