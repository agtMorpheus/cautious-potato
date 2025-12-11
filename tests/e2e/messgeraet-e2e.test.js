/**
 * E2E Test: Messgerät Module Complete User Journey
 * Tests the complete end-to-end user workflow for managing measurement devices
 */

import * as messgeraetState from '../../js/messgeraet/messgeraet-state.js';
import * as messgeraetHandlers from '../../js/messgeraet/messgeraet-handlers.js';

describe('Messgerät E2E - Complete User Journey', () => {
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    messgeraetState.init({ clearStorage: true });
    
    // Setup complete DOM structure
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="messgeraet-container">
          <!-- Device List -->
          <div id="device-list-section">
            <div id="device-filters">
              <input id="device-search" type="text" placeholder="Search devices..." />
              <select id="filter-device-type">
                <option value="">All Types</option>
                <option value="Kombinationsprüfgerät">Kombinationsprüfgerät</option>
                <option value="Isolationsmessgerät">Isolationsmessgerät</option>
                <option value="Multimeter">Multimeter</option>
              </select>
              <select id="filter-calibration-status">
                <option value="">All Status</option>
                <option value="valid">Valid</option>
                <option value="expired">Expired</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
            <div id="device-list"></div>
            <button id="add-device-btn">Add Device</button>
          </div>
          
          <!-- Device Form -->
          <div id="device-form-container">
            <form id="device-form">
              <input id="device-name" type="text" />
              <input id="device-type" type="text" />
              <input id="device-fabrikat" type="text" />
              <input id="device-identNr" type="text" />
              <input id="device-calibration-date" type="date" />
              <button id="save-device-btn" type="submit">Save Device</button>
              <button id="cancel-device-btn" type="button">Cancel</button>
            </form>
          </div>
          
          <!-- Device Detail View -->
          <div id="device-detail-view" style="display: none;">
            <div id="device-detail-content"></div>
            <button id="close-device-detail">Close</button>
          </div>
        </div>
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

  describe('User Journey: Create and Manage Devices', () => {
    test('should add a new measurement device', () => {
      // User creates a new device
      const device = messgeraetState.addDevice({
        name: 'Fluke 1654B',
        type: 'Kombinationsprüfgerät',
        fabrikat: 'Fluke',
        identNr: 'FL-1654B-001',
        calibrationDate: '2025-12-31'
      });
      
      expect(device).toBeTruthy();
      expect(device.id).toBeTruthy();
      expect(device.name).toBe('Fluke 1654B');
      expect(device.fabrikat).toBe('Fluke');
      
      // Verify it's in the state
      const allDevices = messgeraetState.getDevices();
      expect(allDevices).toHaveLength(1);
    });

    test('should update an existing device', () => {
      // Add device
      const device = messgeraetState.addDevice({
        name: 'Benning IT 105',
        type: 'Isolationsmessgerät',
        fabrikat: 'Benning',
        identNr: 'BE-105-001',
        calibrationDate: '2025-06-30'
      });
      
      // User updates the device
      const updated = messgeraetState.updateDevice(device.id, {
        name: 'Benning IT 105 Updated',
        calibrationDate: '2026-06-30'
      });
      
      expect(updated).toBeTruthy();
      
      // Verify updates
      const retrieved = messgeraetState.getDevice(device.id);
      expect(retrieved.name).toBe('Benning IT 105 Updated');
      expect(retrieved.calibrationDate).toBe('2026-06-30');
      expect(retrieved.fabrikat).toBe('Benning'); // Unchanged
    });

    test('should delete a device', () => {
      // Add devices
      const device1 = messgeraetState.addDevice({
        name: 'Device to Keep',
        type: 'Multimeter',
        fabrikat: 'Fluke'
      });
      
      const device2 = messgeraetState.addDevice({
        name: 'Device to Delete',
        type: 'Multimeter',
        fabrikat: 'Benning'
      });
      
      expect(messgeraetState.getDevices()).toHaveLength(2);
      
      // User deletes second device
      const deleted = messgeraetState.deleteDevice(device2.id);
      expect(deleted).toBe(true);
      
      // Verify deletion
      const remaining = messgeraetState.getDevices();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(device1.id);
    });
  });

  describe('User Journey: Device Calibration Management', () => {
    test('should identify devices with valid calibration', () => {
      // Add device with valid calibration
      const device = messgeraetState.addDevice({
        name: 'Valid Device',
        type: 'Multimeter',
        calibrationDate: '2025-12-31'
      });
      
      const validDevices = messgeraetState.getValidDevices();
      
      expect(validDevices).toHaveLength(1);
      expect(validDevices[0].id).toBe(device.id);
    });

    test('should identify devices with expired calibration', () => {
      // Add device with expired calibration
      const device = messgeraetState.addDevice({
        name: 'Expired Device',
        type: 'Multimeter',
        calibrationDate: '2020-01-01'
      });
      
      const expiredDevices = messgeraetState.getExpiredDevices();
      
      expect(expiredDevices).toHaveLength(1);
      expect(expiredDevices[0].id).toBe(device.id);
    });

    test('should identify devices with calibration expiring soon', () => {
      // Add device expiring within 30 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const expiringDateStr = futureDate.toISOString().split('T')[0];
      
      const device = messgeraetState.addDevice({
        name: 'Expiring Soon Device',
        type: 'Multimeter',
        calibrationDate: expiringDateStr
      });
      
      const expiringSoon = messgeraetState.getDevicesExpiringSoon(30);
      
      expect(expiringSoon).toHaveLength(1);
      expect(expiringSoon[0].id).toBe(device.id);
    });

    test('should update calibration date', () => {
      const device = messgeraetState.addDevice({
        name: 'Recalibration Test',
        type: 'Multimeter',
        calibrationDate: '2023-12-31'
      });
      
      // Recalibrate device
      const updated = messgeraetState.updateDevice(device.id, {
        calibrationDate: '2025-12-31',
        lastCalibrationDate: '2024-12-15'
      });
      
      expect(updated).toBeTruthy();
      expect(updated.calibrationDate).toBe('2025-12-31');
      
      // Should now be valid
      const validDevices = messgeraetState.getValidDevices();
      expect(validDevices.some(d => d.id === device.id)).toBe(true);
    });
  });

  describe('User Journey: Search and Filter Devices', () => {
    beforeEach(() => {
      // Add test devices
      messgeraetState.addDevice({
        name: 'Fluke 1654B Main',
        type: 'Kombinationsprüfgerät',
        fabrikat: 'Fluke',
        identNr: 'FL-001',
        calibrationDate: '2025-12-31'
      });
      
      messgeraetState.addDevice({
        name: 'Benning IT 105',
        type: 'Isolationsmessgerät',
        fabrikat: 'Benning',
        identNr: 'BE-001',
        calibrationDate: '2025-06-30'
      });
      
      messgeraetState.addDevice({
        name: 'Fluke 87V Multimeter',
        type: 'Multimeter',
        fabrikat: 'Fluke',
        identNr: 'FL-002',
        calibrationDate: '2020-01-01' // Expired
      });
      
      messgeraetState.addDevice({
        name: 'Gossen Metrawatt SECUTEST',
        type: 'Kombinationsprüfgerät',
        fabrikat: 'Gossen Metrawatt',
        identNr: 'GM-001',
        calibrationDate: '2025-09-30'
      });
    });

    test('should filter devices by type', () => {
      messgeraetState.setFormState('filterType', 'Kombinationsprüfgerät');
      
      const filtered = messgeraetState.getFilteredDevices();
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(d => d.type === 'Kombinationsprüfgerät')).toBe(true);
    });

    test('should filter devices by manufacturer', () => {
      const flukeDevices = messgeraetState.getDevicesByManufacturer('Fluke');
      
      expect(flukeDevices).toHaveLength(2);
      expect(flukeDevices.every(d => d.fabrikat === 'Fluke')).toBe(true);
    });

    test('should search devices by name', () => {
      messgeraetState.setFormState('searchTerm', 'Fluke');
      
      const results = messgeraetState.searchDevices();
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(d => d.name.includes('Fluke') || d.fabrikat.includes('Fluke'))).toBe(true);
    });

    test('should filter by calibration status', () => {
      const valid = messgeraetState.getValidDevices();
      const expired = messgeraetState.getExpiredDevices();
      
      expect(valid).toHaveLength(3);
      expect(expired).toHaveLength(1);
      expect(expired[0].name).toBe('Fluke 87V Multimeter');
    });

    test('should clear all filters', () => {
      // Apply filters
      messgeraetState.setFormState('filterType', 'Multimeter');
      messgeraetState.setFormState('searchTerm', 'Fluke');
      
      // Clear filters
      messgeraetState.clearFilters();
      
      // Verify all devices returned
      const all = messgeraetState.getDevices();
      expect(all).toHaveLength(4);
    });
  });

  describe('User Journey: Device Dropdown Selection', () => {
    beforeEach(() => {
      messgeraetState.addDevice({
        name: 'Valid Device 1',
        type: 'Multimeter',
        calibrationDate: '2025-12-31'
      });
      
      messgeraetState.addDevice({
        name: 'Valid Device 2',
        type: 'Multimeter',
        calibrationDate: '2025-11-30'
      });
      
      messgeraetState.addDevice({
        name: 'Expired Device',
        type: 'Multimeter',
        calibrationDate: '2020-01-01'
      });
    });

    test('should get devices formatted for dropdown', () => {
      const dropdown = messgeraetState.getDevicesForDropdown();
      
      expect(dropdown).toHaveLength(3);
      expect(dropdown[0]).toHaveProperty('id');
      expect(dropdown[0]).toHaveProperty('label');
      expect(dropdown[0]).toHaveProperty('isExpired');
    });

    test('should mark expired devices in dropdown', () => {
      const dropdown = messgeraetState.getDevicesForDropdown();
      
      const expiredEntry = dropdown.find(d => d.label.includes('Expired Device'));
      expect(expiredEntry.isExpired).toBe(true);
      
      const validEntry = dropdown.find(d => d.label.includes('Valid Device 1'));
      expect(validEntry.isExpired).toBe(false);
    });

    test('should optionally filter out expired devices from dropdown', () => {
      const validOnly = messgeraetState.getValidDevicesForDropdown();
      
      expect(validOnly).toHaveLength(2);
      expect(validOnly.every(d => !d.isExpired)).toBe(true);
    });
  });

  describe('User Journey: Form State Management', () => {
    test('should track editing state', () => {
      const device = messgeraetState.addDevice({
        name: 'Edit Test Device',
        type: 'Multimeter'
      });
      
      // Start editing
      messgeraetState.setFormState('editingDeviceId', device.id);
      
      const formState = messgeraetState.getFormState();
      expect(formState.editingDeviceId).toBe(device.id);
    });

    test('should track unsaved changes', () => {
      messgeraetState.setFormState('unsavedChanges', true);
      
      const formState = messgeraetState.getFormState();
      expect(formState.unsavedChanges).toBe(true);
    });

    test('should track validation errors', () => {
      messgeraetState.setFormState('validationErrors', {
        name: 'Name is required',
        calibrationDate: 'Invalid date format'
      });
      
      const formState = messgeraetState.getFormState();
      expect(formState.validationErrors.name).toBe('Name is required');
      expect(formState.validationErrors.calibrationDate).toBe('Invalid date format');
    });

    test('should clear validation errors', () => {
      messgeraetState.setFormState('validationErrors', {
        name: 'Error'
      });
      
      messgeraetState.clearValidationErrors();
      
      const formState = messgeraetState.getFormState();
      expect(Object.keys(formState.validationErrors)).toHaveLength(0);
    });
  });

  describe('User Journey: Data Persistence', () => {
    test('should persist devices to localStorage', () => {
      // Create device
      messgeraetState.addDevice({
        name: 'Persistence Test',
        type: 'Multimeter',
        calibrationDate: '2025-12-31'
      });
      
      // Force save
      messgeraetState.saveState();
      
      // Verify localStorage has data
      const saved = localStorage.getItem('messgeraet_state');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved);
      expect(parsed.devices).toHaveLength(1);
      expect(parsed.devices[0].name).toBe('Persistence Test');
    });

    test('should restore devices after reload', () => {
      // Create and save device
      messgeraetState.addDevice({
        name: 'Reload Test',
        type: 'Multimeter',
        calibrationDate: '2025-12-31'
      });
      
      messgeraetState.saveState();
      
      // Simulate reload by reinitializing
      messgeraetState.init();
      
      // Verify data restored
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Reload Test');
    });

    test('should clear all data when requested', () => {
      // Create data
      messgeraetState.addDevice({
        name: 'To be cleared',
        type: 'Multimeter'
      });
      
      messgeraetState.saveState();
      
      // Reset
      messgeraetState.reset();
      
      // Verify all cleared
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(0);
      
      // Verify localStorage cleared
      const saved = localStorage.getItem('messgeraet_state');
      expect(saved).toBeNull();
    });
  });

  describe('User Journey: Event System', () => {
    test('should emit events on device addition', (done) => {
      document.addEventListener('messgeraet:device-added', (event) => {
        expect(event.detail.device).toBeTruthy();
        expect(event.detail.device.name).toBe('Event Test Device');
        done();
      });
      
      messgeraetState.addDevice({
        name: 'Event Test Device',
        type: 'Multimeter'
      });
    });

    test('should emit events on device update', (done) => {
      const device = messgeraetState.addDevice({
        name: 'Update Event Test',
        type: 'Multimeter'
      });
      
      document.addEventListener('messgeraet:device-updated', (event) => {
        expect(event.detail.device.name).toBe('Updated Name');
        done();
      });
      
      messgeraetState.updateDevice(device.id, {
        name: 'Updated Name'
      });
    });

    test('should emit events on device deletion', (done) => {
      const device = messgeraetState.addDevice({
        name: 'Delete Event Test',
        type: 'Multimeter'
      });
      
      document.addEventListener('messgeraet:device-deleted', (event) => {
        expect(event.detail.deviceId).toBe(device.id);
        done();
      });
      
      messgeraetState.deleteDevice(device.id);
    });
  });

  describe('User Journey: Performance with Large Dataset', () => {
    test('should handle 100+ devices efficiently', () => {
      const startTime = performance.now();
      
      // Add 100 devices
      for (let i = 1; i <= 100; i++) {
        messgeraetState.addDevice({
          name: `Device ${String(i).padStart(3, '0')}`,
          type: i % 3 === 0 ? 'Kombinationsprüfgerät' : i % 2 === 0 ? 'Isolationsmessgerät' : 'Multimeter',
          fabrikat: i % 2 === 0 ? 'Fluke' : 'Benning',
          identNr: `DEV-${String(i).padStart(3, '0')}`,
          calibrationDate: i % 10 === 0 ? '2020-01-01' : '2025-12-31'
        });
      }
      
      const addTime = performance.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Test retrieval performance
      const retrieveStart = performance.now();
      const all = messgeraetState.getDevices();
      const retrieveTime = performance.now() - retrieveStart;
      
      expect(all).toHaveLength(100);
      expect(retrieveTime).toBeLessThan(100); // Should be very fast
    });

    test('should filter large dataset efficiently', () => {
      // Add many devices
      for (let i = 1; i <= 100; i++) {
        messgeraetState.addDevice({
          name: `Device ${i}`,
          type: i % 2 === 0 ? 'Multimeter' : 'Isolationsmessgerät',
          calibrationDate: '2025-12-31'
        });
      }
      
      const startTime = performance.now();
      
      messgeraetState.setFormState('filterType', 'Multimeter');
      const filtered = messgeraetState.getFilteredDevices();
      
      const filterTime = performance.now() - startTime;
      
      expect(filtered).toHaveLength(50);
      expect(filterTime).toBeLessThan(100);
    });
  });

  describe('User Journey: Validation and Error Handling', () => {
    test('should handle device with minimal data', () => {
      const minimal = messgeraetState.addDevice({
        name: 'Minimal Device'
      });
      
      expect(minimal).toBeTruthy();
      expect(minimal.id).toBeTruthy();
      expect(minimal.name).toBe('Minimal Device');
    });

    test('should handle invalid device ID gracefully', () => {
      const retrieved = messgeraetState.getDevice('non-existent-id');
      expect(retrieved).toBeNull();
    });

    test('should handle duplicate device names', () => {
      const device1 = messgeraetState.addDevice({
        name: 'Duplicate Device',
        type: 'Multimeter'
      });
      
      const device2 = messgeraetState.addDevice({
        name: 'Duplicate Device',
        type: 'Isolationsmessgerät'
      });
      
      // Both should exist with different IDs
      expect(device1).toBeTruthy();
      expect(device2).toBeTruthy();
      expect(device1.id).not.toBe(device2.id);
      
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(2);
    });
  });
});
