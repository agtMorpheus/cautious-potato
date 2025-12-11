/**
 * E2E Test: Contracts Module Complete User Journey
 * Tests the complete end-to-end user workflow for managing contracts
 */

import * as contractRepository from '../../js/contracts/contractRepository.js';
import * as contractHandlers from '../../js/contracts/contractHandlers.js';
import { resetState } from '../../js/state.js';

describe('Contracts E2E - Complete User Journey', () => {
  beforeEach(() => {
    // Reset global state
    resetState({ persist: false, silent: true });
    localStorage.clear();
    
    // Setup complete DOM structure
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="contracts-container">
          <!-- Import Section -->
          <div id="contract-import">
            <input id="contract-file-input" type="file" />
            <button id="import-contracts-btn">Import Contracts</button>
          </div>
          
          <!-- Filters -->
          <div id="contract-filters">
            <input id="contract-search" type="text" placeholder="Search..." />
            <select id="filter-status">
              <option value="">All Status</option>
              <option value="Erstellt">Erstellt</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Abgerechnet">Abgerechnet</option>
            </select>
            <select id="filter-location">
              <option value="">All Locations</option>
            </select>
            <button id="clear-filters-btn">Clear Filters</button>
          </div>
          
          <!-- Contracts Table -->
          <div id="contracts-table-container">
            <div id="contracts-table-body"></div>
          </div>
          
          <!-- Pagination -->
          <div id="pagination-controls">
            <button id="prev-page">Previous</button>
            <span id="page-info"></span>
            <button id="next-page">Next</button>
          </div>
          
          <!-- Detail View -->
          <div id="contract-detail-view" style="display: none;">
            <h2 id="detail-contract-id"></h2>
            <button id="close-detail-btn">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('User Journey: Create and Manage Contracts', () => {
    test('should add a new contract', () => {
      // User creates a new contract
      const contract = contractRepository.addContract({
        contractId: 'C-2024-001',
        clientName: 'Acme Corporation',
        location: 'Berlin',
        status: 'Erstellt',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        amount: 50000,
        description: 'Annual maintenance contract'
      });
      
      expect(contract).toBeTruthy();
      expect(contract.id).toBeTruthy();
      expect(contract.contractId).toBe('C-2024-001');
      expect(contract.clientName).toBe('Acme Corporation');
      
      // Verify it's in the repository
      const allContracts = contractRepository.getAllContracts();
      expect(allContracts).toHaveLength(1);
    });

    test('should update an existing contract', () => {
      // Add contract
      const contract = contractRepository.addContract({
        contractId: 'C-2024-002',
        clientName: 'Original Client',
        status: 'Erstellt',
        amount: 10000
      });
      
      // User updates the contract
      const updated = contractRepository.updateContract(contract.id, {
        clientName: 'Updated Client Name',
        status: 'In Bearbeitung',
        amount: 15000
      });
      
      expect(updated).toBeTruthy();
      
      // Verify updates
      const retrieved = contractRepository.getContractById(contract.id);
      expect(retrieved.clientName).toBe('Updated Client Name');
      expect(retrieved.status).toBe('In Bearbeitung');
      expect(retrieved.amount).toBe(15000);
    });

    test('should delete a contract', () => {
      // Add contracts
      const contract1 = contractRepository.addContract({
        contractId: 'C-2024-003',
        clientName: 'Client to Keep'
      });
      
      const contract2 = contractRepository.addContract({
        contractId: 'C-2024-004',
        clientName: 'Client to Delete'
      });
      
      expect(contractRepository.getAllContracts()).toHaveLength(2);
      
      // User deletes second contract
      const deleted = contractRepository.deleteContract(contract2.id);
      expect(deleted).toBe(true);
      
      // Verify deletion
      const remaining = contractRepository.getAllContracts();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(contract1.id);
    });
  });

  describe('User Journey: Search and Filter Contracts', () => {
    beforeEach(() => {
      // Add test data
      contractRepository.addContract({
        contractId: 'C-2024-010',
        clientName: 'Berlin Tech GmbH',
        location: 'Berlin',
        status: 'Erstellt',
        amount: 25000
      });
      
      contractRepository.addContract({
        contractId: 'C-2024-011',
        clientName: 'Munich Systems AG',
        location: 'Munich',
        status: 'In Bearbeitung',
        amount: 40000
      });
      
      contractRepository.addContract({
        contractId: 'C-2024-012',
        clientName: 'Berlin Data Solutions',
        location: 'Berlin',
        status: 'Abgerechnet',
        amount: 30000
      });
      
      contractRepository.addContract({
        contractId: 'C-2024-013',
        clientName: 'Hamburg Consulting',
        location: 'Hamburg',
        status: 'Erstellt',
        amount: 20000
      });
    });

    test('should filter contracts by status', () => {
      const erstelltContracts = contractRepository.getFilteredContracts({
        status: 'Erstellt'
      });
      
      expect(erstelltContracts).toHaveLength(2);
      expect(erstelltContracts.every(c => c.status === 'Erstellt')).toBe(true);
    });

    test('should filter contracts by location', () => {
      const berlinContracts = contractRepository.getFilteredContracts({
        location: 'Berlin'
      });
      
      expect(berlinContracts).toHaveLength(2);
      expect(berlinContracts.every(c => c.location === 'Berlin')).toBe(true);
    });

    test('should filter with multiple criteria', () => {
      const filtered = contractRepository.getFilteredContracts({
        location: 'Berlin',
        status: 'Erstellt'
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].clientName).toBe('Berlin Tech GmbH');
    });

    test('should search by client name', () => {
      const results = contractRepository.searchContracts('Berlin');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.clientName.includes('Berlin'))).toBe(true);
    });

    test('should clear all filters', () => {
      // Apply filters
      const filtered = contractRepository.getFilteredContracts({
        status: 'Erstellt',
        location: 'Berlin'
      });
      
      expect(filtered.length).toBeLessThan(4);
      
      // Clear filters (get all)
      const all = contractRepository.getAllContracts();
      expect(all).toHaveLength(4);
    });
  });

  describe('User Journey: Pagination', () => {
    beforeEach(() => {
      // Add many contracts for pagination
      for (let i = 1; i <= 50; i++) {
        contractRepository.addContract({
          contractId: `C-PAGE-${String(i).padStart(3, '0')}`,
          clientName: `Client ${i}`,
          status: i % 3 === 0 ? 'Abgerechnet' : i % 2 === 0 ? 'In Bearbeitung' : 'Erstellt',
          amount: i * 1000
        });
      }
    });

    test('should paginate contracts correctly', () => {
      const page1 = contractRepository.getPaginatedContracts({
        page: 1,
        pageSize: 10
      });
      expect(page1.data).toHaveLength(10);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(5);
      expect(page1.total).toBe(50);
      
      const page2 = contractRepository.getPaginatedContracts({
        page: 2,
        pageSize: 10
      });
      expect(page2.data).toHaveLength(10);
      expect(page2.page).toBe(2);
      
      // Verify different data on different pages
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
    });

    test('should handle last page correctly', () => {
      const lastPage = contractRepository.getPaginatedContracts({
        page: 5,
        pageSize: 10
      });
      expect(lastPage.data).toHaveLength(10);
      expect(lastPage.page).toBe(5);
      expect(lastPage.page).toBe(lastPage.totalPages);
    });

    test('should combine pagination with filters', () => {
      const filtered = contractRepository.getPaginatedContracts({
        page: 1,
        pageSize: 10,
        filters: { status: 'Erstellt' }
      });
      
      expect(filtered.data.length).toBeGreaterThan(0);
      expect(filtered.data.every(c => c.status === 'Erstellt')).toBe(true);
    });
  });

  describe('User Journey: Status Workflow', () => {
    test('should transition contract through status workflow', () => {
      // Create contract in Erstellt state
      const contract = contractRepository.addContract({
        contractId: 'C-STATUS-001',
        clientName: 'Status Test Client',
        status: 'Erstellt'
      });
      
      expect(contract.status).toBe('Erstellt');
      
      // Move to In Bearbeitung
      contractRepository.updateContract(contract.id, {
        status: 'In Bearbeitung'
      });
      
      let current = contractRepository.getContractById(contract.id);
      expect(current.status).toBe('In Bearbeitung');
      
      // Complete to Abgerechnet
      contractRepository.updateContract(contract.id, {
        status: 'Abgerechnet'
      });
      
      current = contractRepository.getContractById(contract.id);
      expect(current.status).toBe('Abgerechnet');
    });

    test('should handle bulk status updates', () => {
      // Add multiple contracts
      const contracts = [];
      for (let i = 1; i <= 5; i++) {
        contracts.push(contractRepository.addContract({
          contractId: `C-BULK-${i}`,
          clientName: `Bulk Client ${i}`,
          status: 'Erstellt'
        }));
      }
      
      // Update all to In Bearbeitung
      contracts.forEach(contract => {
        contractRepository.updateContract(contract.id, {
          status: 'In Bearbeitung'
        });
      });
      
      // Verify all updated
      const updated = contractRepository.getFilteredContracts({
        status: 'In Bearbeitung'
      });
      
      expect(updated.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('User Journey: Contract Assignment', () => {
    test('should assign contract to employee', () => {
      const contract = contractRepository.addContract({
        contractId: 'C-ASSIGN-001',
        clientName: 'Assignment Test',
        assignedTo: null
      });
      
      // Assign to employee
      contractRepository.updateContract(contract.id, {
        assignedTo: 'EMP-001'
      });
      
      const assigned = contractRepository.getContractById(contract.id);
      expect(assigned.assignedTo).toBe('EMP-001');
    });

    test('should reassign contract to different employee', () => {
      const contract = contractRepository.addContract({
        contractId: 'C-REASSIGN-001',
        clientName: 'Reassignment Test',
        assignedTo: 'EMP-001'
      });
      
      // Reassign
      contractRepository.updateContract(contract.id, {
        assignedTo: 'EMP-002'
      });
      
      const reassigned = contractRepository.getContractById(contract.id);
      expect(reassigned.assignedTo).toBe('EMP-002');
    });

    test('should get all contracts for specific employee', () => {
      // Add contracts for different employees
      contractRepository.addContract({
        contractId: 'C-EMP1-001',
        clientName: 'Employee 1 Contract 1',
        assignedTo: 'EMP-001'
      });
      
      contractRepository.addContract({
        contractId: 'C-EMP1-002',
        clientName: 'Employee 1 Contract 2',
        assignedTo: 'EMP-001'
      });
      
      contractRepository.addContract({
        contractId: 'C-EMP2-001',
        clientName: 'Employee 2 Contract',
        assignedTo: 'EMP-002'
      });
      
      // Get contracts for EMP-001
      const emp1Contracts = contractRepository.getAllContracts()
        .filter(c => c.assignedTo === 'EMP-001');
      
      expect(emp1Contracts).toHaveLength(2);
      expect(emp1Contracts.every(c => c.assignedTo === 'EMP-001')).toBe(true);
    });
  });

  describe('User Journey: Statistics and Reporting', () => {
    beforeEach(() => {
      // Add diverse contracts for statistics
      contractRepository.addContract({
        contractId: 'C-STAT-001',
        status: 'Erstellt',
        amount: 10000,
        location: 'Berlin'
      });
      
      contractRepository.addContract({
        contractId: 'C-STAT-002',
        status: 'Erstellt',
        amount: 15000,
        location: 'Berlin'
      });
      
      contractRepository.addContract({
        contractId: 'C-STAT-003',
        status: 'In Bearbeitung',
        amount: 20000,
        location: 'Munich'
      });
      
      contractRepository.addContract({
        contractId: 'C-STAT-004',
        status: 'Abgerechnet',
        amount: 30000,
        location: 'Berlin'
      });
    });

    test('should calculate contract statistics', () => {
      const stats = contractRepository.getContractStatistics();
      
      expect(stats).toBeTruthy();
      expect(stats.totalContracts).toBe(4);
      
      // Status breakdown
      expect(stats.byStatus).toBeTruthy();
      expect(stats.byStatus['Erstellt']).toBe(2);
      expect(stats.byStatus['In Bearbeitung']).toBe(1);
      expect(stats.byStatus['Abgerechnet']).toBe(1);
    });

    test('should get unique field values', () => {
      const statuses = contractRepository.getUniqueFieldValues('status');
      expect(statuses).toContain('Erstellt');
      expect(statuses).toContain('In Bearbeitung');
      expect(statuses).toContain('Abgerechnet');
      
      const locations = contractRepository.getUniqueFieldValues('location');
      expect(locations).toContain('Berlin');
      expect(locations).toContain('Munich');
    });
  });

  describe('User Journey: Data Validation', () => {
    test('should handle contracts with minimal data', () => {
      const minimal = contractRepository.addContract({
        clientName: 'Minimal Client'
      });
      
      expect(minimal).toBeTruthy();
      expect(minimal.id).toBeTruthy();
      expect(minimal.clientName).toBe('Minimal Client');
    });

    test('should handle date ranges', () => {
      const contract = contractRepository.addContract({
        contractId: 'C-DATE-001',
        clientName: 'Date Range Test',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
      
      expect(contract.startDate).toBe('2024-01-01');
      expect(contract.endDate).toBe('2024-12-31');
    });

    test('should handle invalid contract ID gracefully', () => {
      const retrieved = contractRepository.getContractById('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('User Journey: Performance with Large Dataset', () => {
    test('should handle 100+ contracts efficiently', () => {
      const startTime = performance.now();
      
      // Add 100 contracts
      for (let i = 1; i <= 100; i++) {
        contractRepository.addContract({
          contractId: `C-PERF-${String(i).padStart(3, '0')}`,
          clientName: `Performance Client ${i}`,
          status: i % 3 === 0 ? 'Abgerechnet' : i % 2 === 0 ? 'In Bearbeitung' : 'Erstellt',
          location: i % 2 === 0 ? 'Berlin' : 'Munich',
          amount: i * 1000
        });
      }
      
      const addTime = performance.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Test retrieval performance
      const retrieveStart = performance.now();
      const all = contractRepository.getAllContracts();
      const retrieveTime = performance.now() - retrieveStart;
      
      expect(all).toHaveLength(100);
      expect(retrieveTime).toBeLessThan(100); // Should be very fast
    });
  });
});
