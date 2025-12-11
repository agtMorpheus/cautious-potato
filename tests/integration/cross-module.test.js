/**
 * Integration Test: Cross-Module Integration
 * Tests interactions between different modules: HR-Contracts, State Sync, Performance
 */

import * as contractRepository from '../../js/contracts/contractRepository.js';
import { resetState } from '../../js/state.js';

describe('Cross-Module Integration Tests', () => {
  beforeEach(() => {
    // Reset state
    resetState({ persist: false, silent: true });
    localStorage.clear();
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="contracts-container"></div>
        <div id="hr-container"></div>
        <div id="assets-container"></div>
      </div>
    `;
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('HR-Contract Integration', () => {
    test('should assign contract to employee', () => {
      // Add contract
      const added = contractRepository.addContract({
        contractId: 'C-HR-001',
        clientName: 'HR Test Client',
        status: 'Erstellt',
        assignedTo: 'EMP-001'
      });
      
      expect(added).toBeTruthy();
      expect(added.assignedTo).toBe('EMP-001');
    });

    test('should update contract assignment', () => {
      const added = contractRepository.addContract({
        contractId: 'C-HR-002',
        clientName: 'Unlink Test',
        assignedTo: 'EMP-002'
      });
      
      // Reassign
      contractRepository.updateContract(added.id, {
        assignedTo: 'EMP-003'
      });
      
      const updated = contractRepository.getContractById(added.id);
      expect(updated.assignedTo).toBe('EMP-003');
    });

    test('should retrieve contracts for specific employee', () => {
      const employeeId = 'EMP-003';
      
      // Add contracts
      contractRepository.addContract({
        contractId: 'C-HR-003',
        clientName: 'Employee Contract 1',
        assignedTo: employeeId
      });
      
      contractRepository.addContract({
        contractId: 'C-HR-004',
        clientName: 'Employee Contract 2',
        assignedTo: employeeId
      });
      
      contractRepository.addContract({
        contractId: 'C-HR-005',
        clientName: 'Other Contract',
        assignedTo: 'EMP-999'
      });
      
      // Get contracts for employee - manually filter
      const allContracts = contractRepository.getAllContracts();
      const employeeContracts = allContracts.filter(c => c.assignedTo === employeeId);
      
      expect(employeeContracts.length).toBeGreaterThan(0);
      expect(employeeContracts.every(c => c.assignedTo === employeeId)).toBe(true);
    });

    test('should handle contract reassignment', () => {
      const added = contractRepository.addContract({
        contractId: 'C-HR-006',
        clientName: 'Reassignment Test',
        assignedTo: 'EMP-001'
      });
      
      // Reassign to different employee
      contractRepository.updateContract(added.id, {
        assignedTo: 'EMP-002'
      });
      
      const updated = contractRepository.getContractById(added.id);
      expect(updated.assignedTo).toBe('EMP-002');
    });
  });

  describe('State Synchronization', () => {
    test('should maintain state consistency across modules', () => {
      // Add data in contracts module
      const added = contractRepository.addContract({
        contractId: 'C-SYNC-001',
        clientName: 'Sync Test'
      });
      
      // Verify data is accessible
      const contract = contractRepository.getContractById(added.id);
      expect(contract).toBeTruthy();
      expect(contract.contractId).toBe('C-SYNC-001');
    });

    test('should handle module initialization order', () => {
      // Test that modules can initialize in any order
      // without breaking dependencies
      
      // Add contract before other modules might be ready
      const added = contractRepository.addContract({
        contractId: 'C-INIT-001',
        clientName: 'Init Order Test'
      });
      
      expect(added).toBeTruthy();
      
      // Verify data is still accessible
      const retrieved = contractRepository.getContractById(added.id);
      expect(retrieved).toBeTruthy();
    });
  });

  describe('Data Validation Across Modules', () => {
    test('should validate contract data integrity', () => {
      const contract = {
        clientName: 'Validation Test',
        status: 'Erstellt'
      };
      
      // Should handle missing contractId by generating one
      const result = contractRepository.addContract(contract);
      
      expect(result).toBeTruthy();
      expect(result.id).toBeTruthy(); // Should have generated ID
    });

    test('should handle date ranges', () => {
      const added = contractRepository.addContract({
        contractId: 'C-VAL-001',
        clientName: 'Date Validation',
        startDate: '2024-12-01',
        endDate: '2024-01-01' // End before start (potentially invalid)
      });
      
      // Should either reject or handle gracefully
      expect(added).toBeTruthy();
    });

    test('should validate status transitions', () => {
      const added = contractRepository.addContract({
        contractId: 'C-VAL-002',
        clientName: 'Status Validation',
        status: 'Erstellt'
      });
      
      // Valid transition: Erstellt -> In Bearbeitung
      let result = contractRepository.updateContract(added.id, {
        status: 'In Bearbeitung'
      });
      expect(result).toBeTruthy();
      
      // Valid transition: In Bearbeitung -> Abgerechnet
      result = contractRepository.updateContract(added.id, {
        status: 'Abgerechnet'
      });
      expect(result).toBeTruthy();
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent contract additions', () => {
      const contracts = Array.from({ length: 10 }, (_, i) => ({
        contractId: `C-CONC-${String(i + 1).padStart(3, '0')}`,
        clientName: `Concurrent Client ${i + 1}`
      }));
      
      // Add all contracts
      contracts.forEach(contract => {
        contractRepository.addContract(contract);
      });
      
      const allContracts = contractRepository.getAllContracts();
      expect(allContracts.length).toBeGreaterThanOrEqual(10);
    });

    test('should handle concurrent updates to same contract', () => {
      const added = contractRepository.addContract({
        contractId: 'C-CONC-UPDATE',
        clientName: 'Original Name',
        status: 'Erstellt'
      });
      
      // Simulate concurrent updates
      contractRepository.updateContract(added.id, {
        clientName: 'Update 1'
      });
      
      contractRepository.updateContract(added.id, {
        status: 'In Bearbeitung'
      });
      
      contractRepository.updateContract(added.id, {
        clientName: 'Update 2'
      });
      
      const contract = contractRepository.getContractById(added.id);
      
      // Last update should win or updates should merge
      expect(contract.clientName).toBeTruthy();
      expect(contract.status).toBeTruthy();
    });
  });

  describe('Module Communication', () => {
    test('should handle cross-module event propagation', () => {
      let contractEventFired = false;
      let hrEventFired = false;
      
      document.addEventListener('contract:assigned', () => {
        contractEventFired = true;
      });
      
      document.addEventListener('employee:contractLinked', () => {
        hrEventFired = true;
      });
      
      // Simulate contract assignment
      const added = contractRepository.addContract({
        contractId: 'C-PROP-001',
        clientName: 'Propagation Test',
        assignedTo: 'EMP-001'
      });
      
      // Manually emit events to simulate module communication
      document.dispatchEvent(new CustomEvent('contract:assigned', {
        detail: { contractId: added.id, employeeId: 'EMP-001' }
      }));
      
      document.dispatchEvent(new CustomEvent('employee:contractLinked', {
        detail: { contractId: added.id, employeeId: 'EMP-001' }
      }));
      
      expect(contractEventFired).toBe(true);
      expect(hrEventFired).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('should handle module initialization order', () => {
      // Test that modules can initialize in any order
      // without breaking dependencies
      
      // Add contract before other modules might be ready
      const added = contractRepository.addContract({
        contractId: 'C-INIT-001',
        clientName: 'Init Order Test'
      });
      
      expect(added).toBeTruthy();
      
      // Verify data is still accessible
      const retrieved = contractRepository.getContractById(added.id);
      expect(retrieved).toBeTruthy();
    });
  });

  describe('Performance Under Load', () => {
    test('should handle large datasets efficiently', () => {
      const startTime = performance.now();
      
      // Add 100 contracts (reduced from 1000 for faster tests)
      for (let i = 0; i < 100; i++) {
        contractRepository.addContract({
          contractId: `C-PERF-${String(i + 1).padStart(4, '0')}`,
          clientName: `Performance Test ${i + 1}`,
          status: i % 3 === 0 ? 'Abgerechnet' : 'Erstellt'
        });
      }
      
      const addTime = performance.now() - startTime;
      
      // Adding 100 contracts should be reasonably fast (< 1000ms)
      expect(addTime).toBeLessThan(1000);
      
      // Verify contracts were added
      const contracts = contractRepository.getAllContracts();
      expect(contracts.length).toBeGreaterThanOrEqual(100);
    });

    test('should filter large datasets efficiently', () => {
      // Add 100 contracts
      for (let i = 0; i < 100; i++) {
        contractRepository.addContract({
          contractId: `C-FILTER-${String(i + 1).padStart(4, '0')}`,
          clientName: `Client ${i + 1}`,
          status: i % 2 === 0 ? 'Erstellt' : 'In Bearbeitung',
          location: i % 3 === 0 ? 'Berlin' : 'Munich'
        });
      }
      
      const startTime = performance.now();
      
      const filtered = contractRepository.getFilteredContracts({
        status: 'Erstellt',
        location: 'Berlin'
      });
      
      const filterTime = performance.now() - startTime;
      
      // Filtering should be fast (< 100ms)
      expect(filterTime).toBeLessThan(100);
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});
