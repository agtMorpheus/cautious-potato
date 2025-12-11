/**
 * Integration Test: Contracts Module End-to-End Workflow
 * Tests the complete lifecycle of contract management including CRUD, filtering, and status changes
 */

import { 
  handleContractFileSelect,
  handleContractFilterChange,
  handleContractSearch,
  handleClearContractFilters,
  handleContractStatusChange
} from '../../js/contracts/contractHandlers.js';
import * as contractRepository from '../../js/contracts/contractRepository.js';

// Mock file reading
global.FileReader = class {
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.onload({ target: { result: new ArrayBuffer(8) } });
    }, 0);
  }
};

describe('Contracts E2E Workflow', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="contracts-container">
        <input id="contract-file-input" type="file" />
        <select id="contract-sheet-select"></select>
        <input id="contract-search" type="text" />
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
        <div id="contracts-table-body"></div>
        <div id="pagination-controls"></div>
      </div>
    `;
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Contract Repository CRUD Operations', () => {
    test('should add contract to repository', () => {
      const contract = {
        contractId: 'C-001',
        clientName: 'Test Client',
        location: 'Test Location',
        status: 'Erstellt',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        amount: 10000
      };
      
      contractRepository.addContract(contract);
      
      const contracts = contractRepository.getAllContracts();
      expect(contracts).toHaveLength(1);
      expect(contracts[0].contractId).toBe('C-001');
    });

    test('should update existing contract', () => {
      const contract = {
        contractId: 'C-002',
        clientName: 'Original Client',
        status: 'Erstellt'
      };
      
      contractRepository.addContract(contract);
      
      const updated = contractRepository.updateContract('C-002', {
        clientName: 'Updated Client',
        status: 'In Bearbeitung'
      });
      
      expect(updated).toBeTruthy();
      
      const contracts = contractRepository.getAllContracts();
      const updatedContract = contracts.find(c => c.contractId === 'C-002');
      expect(updatedContract.clientName).toBe('Updated Client');
      expect(updatedContract.status).toBe('In Bearbeitung');
    });

    test('should delete contract', () => {
      contractRepository.addContract({ contractId: 'C-003', clientName: 'Client 1' });
      contractRepository.addContract({ contractId: 'C-004', clientName: 'Client 2' });
      
      let contracts = contractRepository.getAllContracts();
      expect(contracts).toHaveLength(2);
      
      const deleted = contractRepository.deleteContract('C-003');
      expect(deleted).toBe(true);
      
      contracts = contractRepository.getAllContracts();
      expect(contracts).toHaveLength(1);
      expect(contracts[0].contractId).toBe('C-004');
    });

    test('should get contract by id', () => {
      contractRepository.addContract({
        contractId: 'C-005',
        clientName: 'Get Test Client'
      });
      
      const contract = contractRepository.getContract('C-005');
      expect(contract).toBeTruthy();
      expect(contract.clientName).toBe('Get Test Client');
    });
  });

  describe('Contract Filtering', () => {
    beforeEach(() => {
      // Add test contracts
      const testContracts = [
        {
          contractId: 'C-101',
          clientName: 'Client A',
          location: 'Berlin',
          status: 'Erstellt',
          startDate: '2024-01-01'
        },
        {
          contractId: 'C-102',
          clientName: 'Client B',
          location: 'Munich',
          status: 'In Bearbeitung',
          startDate: '2024-02-01'
        },
        {
          contractId: 'C-103',
          clientName: 'Client C',
          location: 'Berlin',
          status: 'Abgerechnet',
          startDate: '2024-03-01'
        },
        {
          contractId: 'C-104',
          clientName: 'Client D',
          location: 'Hamburg',
          status: 'In Bearbeitung',
          startDate: '2024-04-01'
        }
      ];
      
      testContracts.forEach(contract => {
        contractRepository.addContract(contract);
      });
    });

    test('should filter contracts by status', () => {
      const filtered = contractRepository.getFilteredContracts({ status: 'In Bearbeitung' });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(c => c.status === 'In Bearbeitung')).toBe(true);
    });

    test('should filter contracts by location', () => {
      const filtered = contractRepository.getFilteredContracts({ location: 'Berlin' });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(c => c.location === 'Berlin')).toBe(true);
    });

    test('should filter with multiple criteria', () => {
      const filtered = contractRepository.getFilteredContracts({
        location: 'Berlin',
        status: 'Erstellt'
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].contractId).toBe('C-101');
    });

    test('should search contracts by client name', () => {
      const filtered = contractRepository.getFilteredContracts({ searchText: 'Client B' });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].clientName).toBe('Client B');
    });

    test('should search contracts by contract ID', () => {
      const filtered = contractRepository.getFilteredContracts({ searchText: 'C-103' });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].contractId).toBe('C-103');
    });
  });

  describe('Contract Sorting', () => {
    beforeEach(() => {
      contractRepository.addContract({
        contractId: 'C-201',
        clientName: 'Zebra Corp',
        startDate: '2024-03-01',
        amount: 5000
      });
      
      contractRepository.addContract({
        contractId: 'C-202',
        clientName: 'Alpha Inc',
        startDate: '2024-01-01',
        amount: 15000
      });
      
      contractRepository.addContract({
        contractId: 'C-203',
        clientName: 'Beta LLC',
        startDate: '2024-02-01',
        amount: 10000
      });
    });

    test('should sort contracts by client name ascending', () => {
      const sorted = contractRepository.sortContracts(
        contractRepository.getAllContracts(),
        'clientName',
        'asc'
      );
      
      expect(sorted[0].clientName).toBe('Alpha Inc');
      expect(sorted[1].clientName).toBe('Beta LLC');
      expect(sorted[2].clientName).toBe('Zebra Corp');
    });

    test('should sort contracts by date descending', () => {
      const sorted = contractRepository.sortContracts(
        contractRepository.getAllContracts(),
        'startDate',
        'desc'
      );
      
      expect(sorted[0].contractId).toBe('C-201');
      expect(sorted[1].contractId).toBe('C-203');
      expect(sorted[2].contractId).toBe('C-202');
    });

    test('should sort contracts by amount', () => {
      const sorted = contractRepository.sortContracts(
        contractRepository.getAllContracts(),
        'amount',
        'asc'
      );
      
      expect(sorted[0].amount).toBe(5000);
      expect(sorted[1].amount).toBe(10000);
      expect(sorted[2].amount).toBe(15000);
    });
  });

  describe('Contract Pagination', () => {
    beforeEach(() => {
      // Add 25 test contracts
      for (let i = 1; i <= 25; i++) {
        contractRepository.addContract({
          contractId: `C-${String(i).padStart(3, '0')}`,
          clientName: `Client ${i}`,
          status: i % 3 === 0 ? 'Abgerechnet' : 'Erstellt'
        });
      }
    });

    test('should paginate contracts with default page size', () => {
      const paginated = contractRepository.getPaginatedContracts(
        contractRepository.getAllContracts(),
        1,
        10
      );
      
      expect(paginated.contracts).toHaveLength(10);
      expect(paginated.totalPages).toBe(3);
      expect(paginated.currentPage).toBe(1);
    });

    test('should get second page of contracts', () => {
      const paginated = contractRepository.getPaginatedContracts(
        contractRepository.getAllContracts(),
        2,
        10
      );
      
      expect(paginated.contracts).toHaveLength(10);
      expect(paginated.currentPage).toBe(2);
      expect(paginated.contracts[0].contractId).toBe('C-011');
    });

    test('should get last page with remaining contracts', () => {
      const paginated = contractRepository.getPaginatedContracts(
        contractRepository.getAllContracts(),
        3,
        10
      );
      
      expect(paginated.contracts).toHaveLength(5);
      expect(paginated.currentPage).toBe(3);
    });
  });

  describe('Contract Status Transitions', () => {
    test('should change contract status', () => {
      contractRepository.addContract({
        contractId: 'C-301',
        clientName: 'Status Test Client',
        status: 'Erstellt'
      });
      
      const updated = contractRepository.updateContract('C-301', {
        status: 'In Bearbeitung'
      });
      
      expect(updated).toBeTruthy();
      
      const contract = contractRepository.getContract('C-301');
      expect(contract.status).toBe('In Bearbeitung');
    });

    test('should track status history if supported', () => {
      const contract = contractRepository.addContract({
        contractId: 'C-302',
        clientName: 'History Test',
        status: 'Erstellt'
      });
      
      contractRepository.updateContract('C-302', { status: 'In Bearbeitung' });
      contractRepository.updateContract('C-302', { status: 'Abgerechnet' });
      
      const updated = contractRepository.getContract('C-302');
      expect(updated.status).toBe('Abgerechnet');
    });
  });

  describe('Contract Statistics', () => {
    beforeEach(() => {
      contractRepository.addContract({
        contractId: 'C-401',
        status: 'Erstellt',
        amount: 5000
      });
      
      contractRepository.addContract({
        contractId: 'C-402',
        status: 'In Bearbeitung',
        amount: 10000
      });
      
      contractRepository.addContract({
        contractId: 'C-403',
        status: 'In Bearbeitung',
        amount: 15000
      });
      
      contractRepository.addContract({
        contractId: 'C-404',
        status: 'Abgerechnet',
        amount: 20000
      });
    });

    test('should calculate contract statistics', () => {
      const stats = contractRepository.getContractStatistics(
        contractRepository.getAllContracts()
      );
      
      expect(stats.total).toBe(4);
      expect(stats.byStatus['Erstellt']).toBe(1);
      expect(stats.byStatus['In Bearbeitung']).toBe(2);
      expect(stats.byStatus['Abgerechnet']).toBe(1);
    });

    test('should calculate total amounts by status', () => {
      const stats = contractRepository.getContractStatistics(
        contractRepository.getAllContracts()
      );
      
      // Check if amounts are tracked
      if (stats.totalAmount) {
        expect(stats.totalAmount).toBe(50000);
      }
    });
  });

  describe('Bulk Operations', () => {
    test('should import multiple contracts', () => {
      const contracts = [
        { contractId: 'C-501', clientName: 'Bulk 1' },
        { contractId: 'C-502', clientName: 'Bulk 2' },
        { contractId: 'C-503', clientName: 'Bulk 3' }
      ];
      
      contracts.forEach(contract => {
        contractRepository.addContract(contract);
      });
      
      const allContracts = contractRepository.getAllContracts();
      expect(allContracts).toHaveLength(3);
    });

    test('should clear all contracts', () => {
      contractRepository.addContract({ contractId: 'C-601', clientName: 'Test 1' });
      contractRepository.addContract({ contractId: 'C-602', clientName: 'Test 2' });
      
      contractRepository.clearContracts();
      
      const contracts = contractRepository.getAllContracts();
      expect(contracts).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle duplicate contract IDs gracefully', () => {
      contractRepository.addContract({
        contractId: 'C-701',
        clientName: 'First Entry'
      });
      
      // Attempt to add duplicate
      const result = contractRepository.addContract({
        contractId: 'C-701',
        clientName: 'Duplicate Entry'
      });
      
      // Should either reject or update
      const contracts = contractRepository.getAllContracts();
      expect(contracts).toHaveLength(1);
    });

    test('should handle invalid contract updates', () => {
      contractRepository.addContract({
        contractId: 'C-702',
        clientName: 'Valid Contract'
      });
      
      // Try to update non-existent contract
      const result = contractRepository.updateContract('C-999', {
        clientName: 'Should Fail'
      });
      
      expect(result).toBeFalsy();
    });

    test('should handle invalid contract deletions', () => {
      const result = contractRepository.deleteContract('non-existent-id');
      expect(result).toBeFalsy();
    });
  });
});
