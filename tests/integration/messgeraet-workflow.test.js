/**
 * Integration Test: Messgerät Module End-to-End Workflow
 * Tests the complete lifecycle of managing measurement devices
 */

import * as messgeraetState from '../../js/messgeraet/messgeraet-state.js';
import * as messgeraetHandlers from '../../js/messgeraet/messgeraet-handlers.js';

describe('Messgerät E2E Workflow', () => {
  beforeEach(() => {
    // Reset state
    messgeraetState.init();
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="messgeraet-container">
        <input id="device-name" type="text" />
        <select id="device-type">
          <option value="">Select Type</option>
          <option value="Isolationsmessgerät">Isolationsmessgerät</option>
          <option value="RCD-Prüfgerät">RCD-Prüfgerät</option>
          <option value="Multimeter">Multimeter</option>
        </select>
        <input id="device-calibration-date" type="date" />
        <input id="device-serial-number" type="text" />
        <button id="add-device-btn">Add Device</button>
        <button id="save-device-btn">Save Device</button>
        <button id="cancel-edit-btn">Cancel</button>
        <input id="device-search" type="text" />
        <select id="device-filter-type">
          <option value="">All Types</option>
        </select>
        <div id="devices-list"></div>
      </div>
    `;
    
    // Initialize handlers
    messgeraetHandlers.init();
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Device Management CRUD Operations', () => {
    test('should add a new device', () => {
      const deviceData = {
        name: 'Fluke 1587',
        type: 'Isolationsmessgerät',
        calibrationDate: '2024-12-01',
        identNr: 'SN-12345',
        fabrikat: 'Fluke'
      });
      
      const device = messgeraetState.addDevice(deviceData);
      
      expect(device).toBeTruthy();
      expect(device.id).toBeTruthy();
      expect(device.name).toBe('Fluke 1587');
      expect(device.type).toBe('Isolationsmessgerät');
      
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(1);
    });

    test('should add multiple devices', () => {
      const devices = [
        { name: 'Device 1', type: 'Multimeter', identNr: 'SN-001' },
        { name: 'Device 2', type: 'RCD-Prüfgerät', identNr: 'SN-002' },
        { name: 'Device 3', type: 'Isolationsmessgerät', identNr: 'SN-003' }
      ];
      
      devices.forEach(deviceData => {
        messgeraetState.addDevice(deviceData);
      });
      
      const allDevices = messgeraetState.getDevices();
      expect(allDevices).toHaveLength(3);
    });

    test('should update existing device', () => {
      // Add device
      const device = messgeraetState.addDevice({
        name: 'Original Name',
        type: 'Multimeter',
        identNr: 'SN-123'
      });
      
      // Update device
      const updated = messgeraetState.updateDevice(device.id, {
        name: 'Updated Name',
        calibrationDate: '2024-12-15'
      });
      
      expect(updated).toBe(true);
      
      const updatedDevice = messgeraetState.getDevice(device.id);
      expect(updatedDevice.name).toBe('Updated Name');
      expect(updatedDevice.calibrationDate).toBe('2024-12-15');
      // Type should remain unchanged
      expect(updatedDevice.type).toBe('Multimeter');
    });

    test('should delete device', () => {
      // Add devices
      const device1 = messgeraetState.addDevice({
        name: 'Device 1',
        type: 'Multimeter',
        identNr: 'SN-001'
      });
      
      const device2 = messgeraetState.addDevice({
        name: 'Device 2',
        type: 'RCD-Prüfgerät',
        identNr: 'SN-002'
      });
      
      let devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(2);
      
      // Delete first device
      const deleted = messgeraetState.deleteDevice(device1.id);
      expect(deleted).toBe(true);
      
      devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe(device2.id);
    });

    test('should get device by id', () => {
      const device = messgeraetState.addDevice({
        name: 'Test Device',
        type: 'Isolationsmessgerät',
        identNr: 'SN-TEST'
      });
      
      const retrieved = messgeraetState.getDevice(device.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.id).toBe(device.id);
      expect(retrieved.name).toBe('Test Device');
    });

    test('should return null for non-existent device', () => {
      const device = messgeraetState.getDevice('non-existent-id');
      expect(device).toBeNull();
    });
  });

  describe('Device Filtering and Search', () => {
    beforeEach(() => {
      // Add test devices
      messgeraetState.addDevice({
        name: 'Fluke 1587',
        type: 'Isolationsmessgerät',
        identNr: 'FL-001',
        fabrikat: 'Fluke'
      });
      
      messgeraetState.addDevice({
        name: 'Fluke 1653',
        type: 'Isolationsmessgerät',
        identNr: 'FL-002',
        fabrikat: 'Fluke'
      });
      
      messgeraetState.addDevice({
        name: 'Benning IT 105',
        type: 'RCD-Prüfgerät',
        identNr: 'BN-001',
        fabrikat: 'Benning'
      });
      
      messgeraetState.addDevice({
        name: 'Multimeter DMM-123',
        type: 'Multimeter',
        identNr: 'MM-001'
      });
    });

    test('should filter devices by type', () => {
      const filtered = messgeraetState.getDevicesByType('Isolationsmessgerät');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(d => d.type === 'Isolationsmessgerät')).toBe(true);
    });

    test('should get devices for dropdown', () => {
      const dropdownDevices = messgeraetState.getDevicesForDropdown();
      
      expect(dropdownDevices).toHaveLength(4);
      expect(dropdownDevices[0]).toHaveProperty('id');
      expect(dropdownDevices[0]).toHaveProperty('label');
    });

    test('should set search term in form state', () => {
      messgeraetState.setSearchTerm('Fluke');
      
      const formState = messgeraetState.getFormState();
      expect(formState.searchTerm).toBe('Fluke');
    });

    test('should set filter type in form state', () => {
      messgeraetState.setFilterType('Multimeter');
      
      const formState = messgeraetState.getFormState();
      expect(formState.filterType).toBe('Multimeter');
    });
  });

  describe('Calibration Status', () => {
    test('should identify valid devices', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      messgeraetState.addDevice({
        name: 'Valid Device',
        type: 'Multimeter',
        calibrationDate: futureDate.toISOString().split('T')[0],
        identNr: 'VAL-001'
      });
      
      const validDevices = messgeraetState.getValidDevices();
      expect(validDevices).toHaveLength(1);
      expect(validDevices[0].identNr).toBe('VAL-001');
    });

    test('should exclude expired devices from valid list', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);
      
      messgeraetState.addDevice({
        name: 'Expired Device',
        type: 'Multimeter',
        calibrationDate: pastDate.toISOString().split('T')[0],
        identNr: 'EXP-001'
      });
      
      const validDevices = messgeraetState.getValidDevices();
      expect(validDevices).toHaveLength(0);
    });
  });

  describe('Form State Management', () => {
    test('should track editing state', () => {
      const device = messgeraetState.addDevice({
        name: 'Edit Test Device',
        type: 'Multimeter',
        identNr: 'EDT-001'
      });
      
      messgeraetState.setEditingDevice(device.id);
      
      const formState = messgeraetState.getFormState();
      expect(formState.editingDeviceId).toBe(device.id);
    });

    test('should track validation errors', () => {
      messgeraetState.setValidationError('name', 'Name is required');
      messgeraetState.setValidationError('type', 'Type is required');
      
      const errors = messgeraetState.getValidationErrors();
      expect(errors.name).toBe('Name is required');
      expect(errors.type).toBe('Type is required');
    });

    test('should clear validation errors', () => {
      messgeraetState.setValidationError('name', 'Error');
      messgeraetState.clearValidationErrors();
      
      const errors = messgeraetState.getValidationErrors();
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('State Persistence', () => {
    test('should persist state to localStorage', () => {
      messgeraetState.addDevice({
        name: 'Persist Test',
        type: 'Multimeter',
        identNr: 'PER-001'
      });
      
      messgeraetState.forceSave();
      
      const savedData = localStorage.getItem('messgeraet_state');
      expect(savedData).toBeTruthy();
      
      const parsed = JSON.parse(savedData);
      expect(parsed.devices).toHaveLength(1);
      expect(parsed.devices[0].name).toBe('Persist Test');
    });

    test('should restore state from localStorage', () => {
      messgeraetState.addDevice({
        name: 'Restore Test',
        type: 'RCD-Prüfgerät',
        identNr: 'RES-001'
      });
      
      messgeraetState.forceSave();
      
      // Reinitialize
      messgeraetState.init();
      
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Restore Test');
    });

    test('should clear state', () => {
      messgeraetState.addDevice({
        name: 'Clear Test',
        type: 'Multimeter',
        identNr: 'CLR-001'
      });
      
      messgeraetState.reset();
      
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(0);
    });
  });

  describe('Event System', () => {
    test('should emit events on device addition', (done) => {
      const handler = (data) => {
        expect(data.device.name).toBe('Event Test Device');
        done();
      };
      
      messgeraetState.on('deviceAdded', handler);
      
      messgeraetState.addDevice({
        name: 'Event Test Device',
        type: 'Multimeter',
        identNr: 'EVT-001'
      });
      
      setTimeout(() => done(), 100);
    }, 10000);

    test('should emit events on device update', (done) => {
      const device = messgeraetState.addDevice({
        name: 'Original',
        type: 'Multimeter',
        identNr: 'UPD-001'
      });
      
      const handler = (data) => {
        expect(data.deviceId).toBe(device.id);
        done();
      };
      
      messgeraetState.on('deviceUpdated', handler);
      
      messgeraetState.updateDevice(device.id, { name: 'Updated' });
      
      setTimeout(() => done(), 100);
    }, 10000);

    test('should emit events on device deletion', (done) => {
      const device = messgeraetState.addDevice({
        name: 'Delete Test',
        type: 'Multimeter',
        identNr: 'DEL-001'
      });
      
      const handler = (data) => {
        expect(data.deviceId).toBe(device.id);
        done();
      };
      
      messgeraetState.on('deviceDeleted', handler);
      
      messgeraetState.deleteDevice(device.id);
      
      setTimeout(() => done(), 100);
    }, 10000);
  });
});
