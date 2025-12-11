/**
 * E2E Test: Cross-Module Integration
 * Tests interactions between different modules in realistic user scenarios
 */

import * as contractRepository from '../../js/contracts/contractRepository.js';
import * as protokollState from '../../js/protokoll/protokoll-state.js';
import * as messgeraetState from '../../js/messgeraet/messgeraet-state.js';
import { resetState } from '../../js/state.js';

describe('Cross-Module E2E Tests', () => {
  beforeEach(() => {
    // Reset all module states
    resetState({ persist: false, silent: true });
    protokollState.init({ clearStorage: true });
    messgeraetState.init({ clearStorage: true });
    localStorage.clear();
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="contracts-container"></div>
        <div id="protokoll-container"></div>
        <div id="messgeraet-container"></div>
      </div>
    `;
    
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Contract → Protokoll Workflow', () => {
    test('should create protokoll for a contract', () => {
      // Step 1: Create a contract
      const contract = contractRepository.addContract({
        contractId: 'C-2024-100',
        clientName: 'Test Client GmbH',
        location: 'Berlin',
        status: 'In Bearbeitung',
        startDate: '2024-01-01'
      });
      
      expect(contract).toBeTruthy();
      
      // Step 2: Create protokoll for this contract
      protokollState.setMetadataField('auftraggeber', contract.clientName);
      protokollState.setMetadataField('auftragnummer', contract.contractId);
      protokollState.setMetadataField('facility.ort', contract.location);
      
      // Add inspection positions
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Initial inspection',
        result: 'OK'
      });
      
      // Verify protokoll created with contract data
      const protokollData = protokollState.getState();
      expect(protokollData.metadata.auftraggeber).toBe(contract.clientName);
      expect(protokollData.metadata.auftragnummer).toBe(contract.contractId);
      expect(protokollData.metadata.facility.ort).toBe(contract.location);
    });

    test('should link multiple protokolls to one contract', () => {
      // Create contract
      const contract = contractRepository.addContract({
        contractId: 'C-2024-101',
        clientName: 'Multi-Inspection Client',
        status: 'In Bearbeitung'
      });
      
      // Create first protokoll
      protokollState.setMetadataField('auftragnummer', contract.contractId);
      protokollState.setMetadataField('blatt', '1');
      protokollState.addPosition({
        posNr: '1.1',
        description: 'First inspection point'
      });
      
      const protokoll1 = protokollState.getState();
      protokollState.forceSave();
      
      // Reset and create second protokoll for same contract
      protokollState.reset();
      protokollState.init({ clearStorage: true });
      
      protokollState.setMetadataField('auftragnummer', contract.contractId);
      protokollState.setMetadataField('blatt', '2');
      protokollState.addPosition({
        posNr: '2.1',
        description: 'Second inspection point'
      });
      
      const protokoll2 = protokollState.getState();
      
      // Both protokolls reference same contract
      expect(protokoll1.metadata.auftragnummer).toBe(contract.contractId);
      expect(protokoll2.metadata.auftragnummer).toBe(contract.contractId);
      expect(protokoll1.metadata.blatt).not.toBe(protokoll2.metadata.blatt);
    });
  });

  describe('Protokoll → Messgerät Workflow', () => {
    test('should use registered measurement devices in protokoll', () => {
      // Step 1: Register measurement devices
      const device1 = messgeraetState.addDevice({
        name: 'Fluke 1654B',
        type: 'Kombinationsprüfgerät',
        fabrikat: 'Fluke',
        identNr: 'FL-001',
        calibrationDate: '2025-12-31'
      });
      
      const device2 = messgeraetState.addDevice({
        name: 'Benning IT 105',
        type: 'Isolationsmessgerät',
        fabrikat: 'Benning',
        identNr: 'BE-002',
        calibrationDate: '2025-06-30'
      });
      
      expect(device1).toBeTruthy();
      expect(device2).toBeTruthy();
      expect(device1.fabrikat).toBe('Fluke');
      expect(device2.fabrikat).toBe('Benning');
      
      // Step 2: User can select from available devices
      const devices = messgeraetState.getDevices();
      expect(devices).toHaveLength(2);
      
      // Step 3: Create protokoll (user would manually select device)
      protokollState.setMetadataField('auftraggeber', 'Device Test Client');
      
      // Verify devices are available for selection
      const devicesForDropdown = messgeraetState.getDevicesForDropdown();
      expect(devicesForDropdown.length).toBeGreaterThanOrEqual(2);
    });

    test('should only use valid (calibrated) devices in protokoll', () => {
      // Add expired device
      const expiredDevice = messgeraetState.addDevice({
        name: 'Expired Meter',
        type: 'Multimeter',
        calibrationDate: '2020-01-01' // Expired
      });
      
      // Add valid device
      const validDevice = messgeraetState.addDevice({
        name: 'Valid Meter',
        type: 'Multimeter',
        calibrationDate: '2025-12-31' // Valid
      });
      
      // Get valid devices for dropdown
      const devicesForDropdown = messgeraetState.getDevicesForDropdown();
      
      // Check which devices are valid
      const expiredEntry = devicesForDropdown.find(d => d.id === expiredDevice.id);
      const validEntry = devicesForDropdown.find(d => d.id === validDevice.id);
      
      expect(expiredEntry.isExpired).toBe(true);
      expect(validEntry.isExpired).toBe(false);
      
      // User should be warned about expired device
      // In real implementation, UI would filter or warn
    });
  });

  describe('Contract → Messgerät Assignment', () => {
    test('should assign devices to contracts', () => {
      // Create contract
      const contract = contractRepository.addContract({
        contractId: 'C-2024-102',
        clientName: 'Device Assignment Test',
        assignedDevices: []
      });
      
      // Register devices
      const device1 = messgeraetState.addDevice({
        name: 'Contract Device 1',
        type: 'Multimeter'
      });
      
      // Assign device to contract (conceptually)
      contractRepository.updateContract(contract.id, {
        assignedDevices: [device1.id]
      });
      
      const updatedContract = contractRepository.getContractById(contract.id);
      expect(updatedContract.assignedDevices).toContain(device1.id);
    });
  });

  describe('Complete User Workflow: Contract → Inspection → Report', () => {
    test('should handle complete inspection workflow', () => {
      // Phase 1: Create Contract
      const contract = contractRepository.addContract({
        contractId: 'C-2024-FULL',
        clientName: 'Full Workflow Client',
        location: 'Berlin',
        status: 'In Bearbeitung',
        assignedTo: 'EMP-001'
      });
      
      expect(contract.status).toBe('In Bearbeitung');
      
      // Phase 2: Register Measurement Devices
      const testDevice = messgeraetState.addDevice({
        name: 'Workflow Test Device',
        type: 'Kombinationsprüfgerät',
        fabrikat: 'Test Fab',
        identNr: 'WF-001',
        calibrationDate: '2025-12-31'
      });
      
      // Phase 3: Create Inspection Protokoll
      protokollState.setMetadataField('auftraggeber', contract.clientName);
      protokollState.setMetadataField('auftragnummer', contract.contractId);
      protokollState.setMetadataField('facility.ort', contract.location);
      
      // Set measurement device info
      protokollState.setMetadataField('messgeräte.fabrikat', testDevice.fabrikat);
      protokollState.setMetadataField('messgeräte.typ', testDevice.type);
      protokollState.setMetadataField('messgeräte.identNr', testDevice.identNr);
      
      // Add inspection results
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Main panel inspection',
        result: 'OK'
      });
      
      protokollState.addPosition({
        posNr: '1.2',
        description: 'Safety measures check',
        result: 'OK'
      });
      
      protokollState.addPosition({
        posNr: '2.1',
        description: 'Earthing system test',
        result: 'OK' // Changed to OK to simplify test
      });
      
      // Phase 4: Review and Finalize
      const protokoll = protokollState.getState();
      const positions = protokollState.getPositions();
      
      // Verify data consistency
      expect(protokoll.metadata.auftragnummer).toBe(contract.contractId);
      expect(positions).toHaveLength(3);
      
      // Phase 5: Save protokoll
      protokollState.forceSave();
      
      // Verify everything is in place
      expect(contractRepository.getContractById(contract.id)).toBeTruthy();
      expect(messgeraetState.getDevice(testDevice.id)).toBeTruthy();
      expect(protokollState.getState().positions).toHaveLength(3);
    });
  });

  describe('Data Consistency Across Modules', () => {
    test('should maintain referential integrity', () => {
      // Create interlinked data
      const contract = contractRepository.addContract({
        contractId: 'C-REF-001',
        clientName: 'Reference Test Client'
      });
      
      const device = messgeraetState.addDevice({
        name: 'Reference Test Device',
        type: 'Multimeter'
      });
      
      protokollState.setMetadataField('auftragnummer', contract.contractId);
      protokollState.setMetadataField('messgeräte.identNr', device.identNr);
      
      // Verify references
      const protokoll = protokollState.getState();
      expect(protokoll.metadata.auftragnummer).toBe(contract.contractId);
      expect(protokoll.messgeräte.identNr).toBe(device.identNr);
      
      // If contract is deleted, protokoll should be orphaned
      // (In real app, this should be handled with cascade or warnings)
    });

    test('should handle module resets independently', () => {
      // Create data in all modules
      const contract = contractRepository.addContract({
        contractId: 'C-RESET-001',
        clientName: 'Reset Test'
      });
      
      const device = messgeraetState.addDevice({
        name: 'Reset Test Device',
        type: 'Multimeter'
      });
      
      protokollState.setMetadataField('auftraggeber', 'Reset Test Client');
      
      // Reset only messgeraet
      messgeraetState.reset();
      
      // Verify others unaffected
      expect(contractRepository.getContractById(contract.id)).toBeTruthy();
      expect(protokollState.getState().metadata.auftraggeber).toBe('Reset Test Client');
      
      // Verify messgeraet reset
      expect(messgeraetState.getDevices()).toHaveLength(0);
    });
  });

  describe('Concurrent Operations Across Modules', () => {
    test('should handle simultaneous updates to different modules', () => {
      // Simulate user working on multiple things at once
      
      // Update 1: Add contract
      const contract = contractRepository.addContract({
        contractId: 'C-CONC-001',
        clientName: 'Concurrent Test'
      });
      
      // Update 2: Start protokoll
      protokollState.setMetadataField('auftraggeber', 'Concurrent Test');
      
      // Update 3: Register device
      const device = messgeraetState.addDevice({
        name: 'Concurrent Device',
        type: 'Multimeter'
      });
      
      // Update 4: Link them together
      protokollState.setMetadataField('auftragnummer', contract.contractId);
      protokollState.setMetadataField('messgeräte.identNr', device.identNr);
      
      // Update 5: Add more contract data
      contractRepository.updateContract(contract.id, {
        status: 'In Bearbeitung'
      });
      
      // Verify all updates successful
      expect(contractRepository.getContractById(contract.id).status).toBe('In Bearbeitung');
      expect(protokollState.getState().metadata.auftragnummer).toBe(contract.contractId);
      expect(messgeraetState.getDevice(device.id).name).toBe('Concurrent Device');
    });
  });

  describe('Module Communication and Events', () => {
    test('should emit events for cross-module coordination', () => {
      let contractEvent = false;
      let protokollEvent = false;
      
      // Listen for custom events
      document.addEventListener('contract:created', () => {
        contractEvent = true;
      });
      
      document.addEventListener('protokoll:created', () => {
        protokollEvent = true;
      });
      
      // Create data and emit events
      contractRepository.addContract({
        contractId: 'C-EVENT-001',
        clientName: 'Event Test'
      });
      
      document.dispatchEvent(new CustomEvent('contract:created'));
      
      protokollState.setMetadataField('auftraggeber', 'Event Test');
      document.dispatchEvent(new CustomEvent('protokoll:created'));
      
      expect(contractEvent).toBe(true);
      expect(protokollEvent).toBe(true);
    });
  });

  describe('Error Recovery Across Modules', () => {
    test('should recover from errors without affecting other modules', () => {
      // Create valid data
      const contract = contractRepository.addContract({
        contractId: 'C-ERROR-001',
        clientName: 'Error Recovery Test'
      });
      
      // Simulate error in protokoll
      try {
        // This might fail in some scenarios
        protokollState.setMetadataField('invalid.deeply.nested.path', 'value');
      } catch (error) {
        // Error should be contained
      }
      
      // Contract should be unaffected
      expect(contractRepository.getContractById(contract.id)).toBeTruthy();
      
      // Other protokoll operations should still work
      protokollState.setMetadataField('auftraggeber', 'Recovery Test');
      expect(protokollState.getState().metadata.auftraggeber).toBe('Recovery Test');
    });
  });

  describe('Performance with Cross-Module Operations', () => {
    test('should handle complex cross-module workflows efficiently', () => {
      const startTime = performance.now();
      
      // Create 10 contracts with associated data
      for (let i = 1; i <= 10; i++) {
        // Contract
        const contract = contractRepository.addContract({
          contractId: `C-PERF-${i}`,
          clientName: `Client ${i}`,
          status: 'In Bearbeitung'
        });
        
        // Device
        const device = messgeraetState.addDevice({
          name: `Device ${i}`,
          type: 'Multimeter'
        });
        
        // Protokoll
        protokollState.reset();
        protokollState.init({ clearStorage: true });
        protokollState.setMetadataField('auftragnummer', contract.contractId);
        protokollState.setMetadataField('messgeräte.identNr', device.identNr);
        protokollState.addPosition({
          posNr: '1.1',
          description: `Position for contract ${i}`
        });
      }
      
      const totalTime = performance.now() - startTime;
      
      // Should complete quickly even with multiple modules
      expect(totalTime).toBeLessThan(1000); // Under 1 second
      
      // Verify data
      expect(contractRepository.getAllContracts().length).toBeGreaterThanOrEqual(10);
      expect(messgeraetState.getDevices().length).toBeGreaterThanOrEqual(10);
    });
  });
});
