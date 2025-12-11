/**
 * E2E Test: Assets Module Complete User Journey
 * Tests the complete end-to-end user workflow for managing distribution board assets
 */

import * as assetState from '../../js/modules/assets/asset-state.js';

describe('Assets E2E - Complete User Journey', () => {
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    
    // Initialize asset state
    assetState.init();
    
    // Setup complete DOM structure
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="assets-container">
          <!-- Asset List -->
          <div id="asset-list-container">
            <div id="asset-search">
              <input id="asset-search-input" type="text" placeholder="Search assets..." />
            </div>
            <div id="asset-filters">
              <select id="filter-asset-status">
                <option value="">All Status</option>
                <option value="IN BETRIEB">In Betrieb</option>
                <option value="AKTIV">Aktiv</option>
                <option value="INAKTIV">Inaktiv</option>
                <option value="STILLGELEGT">Stillgelegt</option>
              </select>
              <select id="filter-asset-type">
                <option value="">All Types</option>
                <option value="LVUM">LVUM</option>
                <option value="UV">UV</option>
                <option value="KV">KV</option>
                <option value="LV">LV</option>
              </select>
              <select id="filter-asset-plant">
                <option value="">All Plants</option>
              </select>
            </div>
            <div id="asset-table-body"></div>
          </div>
          
          <!-- Asset Detail View -->
          <div id="asset-detail-view" style="display: none;">
            <div id="asset-detail-content"></div>
            <button id="close-asset-detail">Close</button>
          </div>
          
          <!-- Asset Form -->
          <div id="asset-form-container">
            <form id="asset-form">
              <input id="asset-name" type="text" />
              <input id="asset-location" type="text" />
              <select id="asset-status"></select>
              <select id="asset-type"></select>
              <input id="asset-plant" type="text" />
              <button id="save-asset-btn" type="submit">Save Asset</button>
              <button id="cancel-asset-btn" type="button">Cancel</button>
            </form>
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

  describe('User Journey: Create and Manage Assets', () => {
    test('should add a new distribution board asset', () => {
      // User creates a new asset
      const asset = assetState.addAsset({
        name: 'Main Distribution Board A1',
        type: 'LVUM',
        status: 'IN BETRIEB',
        location: 'Building A, Floor 1',
        plant: 'Plant Berlin'
      });
      
      expect(asset).toBeTruthy();
      expect(asset.id).toBeTruthy();
      expect(asset.name).toBe('Main Distribution Board A1');
      expect(asset.type).toBe('LVUM');
      expect(asset.status).toBe('IN BETRIEB');
      
      // Verify it's in the state
      const allAssets = assetState.getAssets();
      expect(allAssets).toHaveLength(1);
      expect(allAssets[0].id).toBe(asset.id);
    });

    test('should update an existing asset', () => {
      // Add asset
      const asset = assetState.addAsset({
        name: 'Distribution Board B1',
        type: 'UV',
        status: 'AKTIV',
        location: 'Building B'
      });
      
      // User updates the asset
      const updated = assetState.updateAsset(asset.id, {
        name: 'Updated Distribution Board B1',
        status: 'INAKTIV',
        location: 'Building B, Basement'
      });
      
      expect(updated).toBeTruthy();
      
      // Verify updates
      const retrieved = assetState.getAsset(asset.id);
      expect(retrieved.name).toBe('Updated Distribution Board B1');
      expect(retrieved.status).toBe('INAKTIV');
      expect(retrieved.location).toBe('Building B, Basement');
      expect(retrieved.type).toBe('UV'); // Unchanged
    });

    test('should delete an asset', () => {
      // Add assets
      const asset1 = assetState.addAsset({
        name: 'Asset to Keep',
        type: 'LVUM'
      });
      
      const asset2 = assetState.addAsset({
        name: 'Asset to Delete',
        type: 'KV'
      });
      
      expect(assetState.getAssets()).toHaveLength(2);
      
      // User deletes second asset
      const deleted = assetState.deleteAsset(asset2.id);
      expect(deleted).toBe(true);
      
      // Verify deletion
      const remaining = assetState.getAssets();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(asset1.id);
    });
  });

  describe('User Journey: Search and Filter Assets', () => {
    beforeEach(() => {
      // Add test data
      assetState.addAsset({
        name: 'Main Board Berlin A',
        type: 'LVUM',
        status: 'IN BETRIEB',
        location: 'Berlin Factory',
        plant: 'Plant Berlin'
      });
      
      assetState.addAsset({
        name: 'Sub Board Munich B',
        type: 'UV',
        status: 'AKTIV',
        location: 'Munich Warehouse',
        plant: 'Plant Munich'
      });
      
      assetState.addAsset({
        name: 'Control Board Berlin C',
        type: 'KV',
        status: 'INAKTIV',
        location: 'Berlin Factory',
        plant: 'Plant Berlin'
      });
      
      assetState.addAsset({
        name: 'Power Board Hamburg D',
        type: 'LV',
        status: 'STILLGELEGT',
        location: 'Hamburg Office',
        plant: 'Plant Hamburg'
      });
    });

    test('should filter assets by status', () => {
      // Set filter
      assetState.setFormState('filterStatus', 'IN BETRIEB');
      
      const filtered = assetState.getFilteredAssets();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('IN BETRIEB');
    });

    test('should filter assets by type', () => {
      // Set filter
      assetState.setFormState('filterType', 'UV');
      
      const filtered = assetState.getFilteredAssets();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('UV');
    });

    test('should filter assets by plant', () => {
      // Set filter
      assetState.setFormState('filterPlant', 'Plant Berlin');
      
      const filtered = assetState.getFilteredAssets();
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(a => a.plant === 'Plant Berlin')).toBe(true);
    });

    test('should filter with multiple criteria', () => {
      // Set multiple filters
      assetState.setFormState('filterPlant', 'Plant Berlin');
      assetState.setFormState('filterStatus', 'IN BETRIEB');
      
      const filtered = assetState.getFilteredAssets();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Main Board Berlin A');
    });

    test('should search assets by name', () => {
      // Set search term
      assetState.setFormState('searchTerm', 'Berlin');
      
      const results = assetState.searchAssets();
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(a => a.name.includes('Berlin') || a.location.includes('Berlin'))).toBe(true);
    });

    test('should clear all filters', () => {
      // Apply filters
      assetState.setFormState('filterStatus', 'IN BETRIEB');
      assetState.setFormState('filterPlant', 'Plant Berlin');
      
      // Clear filters
      assetState.clearFilters();
      
      // Verify all assets returned
      const all = assetState.getAssets();
      expect(all).toHaveLength(4);
    });
  });

  describe('User Journey: Asset Components Management', () => {
    let testAsset;

    beforeEach(() => {
      // Create a test asset
      testAsset = assetState.addAsset({
        name: 'Test Distribution Board',
        type: 'LVUM',
        status: 'IN BETRIEB'
      });
    });

    test('should add circuits to an asset', () => {
      // User adds circuits
      const circuit1 = assetState.addCircuit(testAsset.id, {
        name: 'Circuit 1',
        voltage: '230V',
        amperage: '16A'
      });
      
      const circuit2 = assetState.addCircuit(testAsset.id, {
        name: 'Circuit 2',
        voltage: '400V',
        amperage: '32A'
      });
      
      expect(circuit1).toBeTruthy();
      expect(circuit2).toBeTruthy();
      
      // Verify circuits are linked to asset
      const circuits = assetState.getCircuitsByAsset(testAsset.id);
      expect(circuits).toHaveLength(2);
    });

    test('should add protocols to an asset', () => {
      // User links protocol to asset
      const protocol = assetState.addProtocol(testAsset.id, {
        protocolNumber: 'PROT-2024-001',
        date: '2024-01-15',
        type: 'Annual Inspection'
      });
      
      expect(protocol).toBeTruthy();
      
      // Verify protocol is linked
      const protocols = assetState.getProtocolsByAsset(testAsset.id);
      expect(protocols).toHaveLength(1);
      expect(protocols[0].protocolNumber).toBe('PROT-2024-001');
    });

    test('should add contracts to an asset', () => {
      // User links contract to asset
      const contract = assetState.addContract(testAsset.id, {
        contractId: 'C-2024-100',
        description: 'Maintenance Contract',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
      
      expect(contract).toBeTruthy();
      
      // Verify contract is linked
      const contracts = assetState.getContractsByAsset(testAsset.id);
      expect(contracts).toHaveLength(1);
    });

    test('should add documents to an asset', () => {
      // User uploads document
      const document = assetState.addDocument(testAsset.id, {
        name: 'Installation Manual.pdf',
        type: 'Manual',
        url: '/docs/manual.pdf'
      });
      
      expect(document).toBeTruthy();
      
      // Verify document is linked
      const documents = assetState.getDocumentsByAsset(testAsset.id);
      expect(documents).toHaveLength(1);
    });

    test('should add pictures to an asset', () => {
      // User uploads picture
      const picture = assetState.addPicture(testAsset.id, {
        name: 'Front View',
        url: '/images/board-front.jpg',
        caption: 'Distribution board front view'
      });
      
      expect(picture).toBeTruthy();
      
      // Verify picture is linked
      const pictures = assetState.getPicturesByAsset(testAsset.id);
      expect(pictures).toHaveLength(1);
    });
  });

  describe('User Journey: Data Persistence', () => {
    test('should persist assets to localStorage', () => {
      // Create asset
      const asset = assetState.addAsset({
        name: 'Persistence Test Board',
        type: 'LVUM',
        status: 'IN BETRIEB'
      });
      
      // Force save
      assetState.saveState();
      
      // Verify localStorage has data
      const saved = localStorage.getItem('asset_management_state');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved);
      expect(parsed.assets).toHaveLength(1);
      expect(parsed.assets[0].name).toBe('Persistence Test Board');
    });

    test('should restore assets after reload', () => {
      // Create and save asset
      assetState.addAsset({
        name: 'Reload Test Board',
        type: 'UV',
        status: 'AKTIV'
      });
      
      assetState.saveState();
      
      // Simulate reload by reinitializing
      assetState.init();
      
      // Verify data restored
      const assets = assetState.getAssets();
      expect(assets).toHaveLength(1);
      expect(assets[0].name).toBe('Reload Test Board');
    });

    test('should clear all data when requested', () => {
      // Create data
      assetState.addAsset({
        name: 'To be cleared',
        type: 'LVUM'
      });
      
      assetState.saveState();
      
      // Clear all
      assetState.reset();
      
      // Verify all cleared
      const assets = assetState.getAssets();
      expect(assets).toHaveLength(0);
      
      // Verify localStorage cleared
      const saved = localStorage.getItem('asset_management_state');
      expect(saved).toBeNull();
    });
  });

  describe('User Journey: Status Workflow', () => {
    test('should transition asset through status workflow', () => {
      // Create asset
      const asset = assetState.addAsset({
        name: 'Status Workflow Board',
        type: 'LVUM',
        status: 'AKTIV'
      });
      
      expect(asset.status).toBe('AKTIV');
      
      // Put in service
      assetState.updateAsset(asset.id, { status: 'IN BETRIEB' });
      let current = assetState.getAsset(asset.id);
      expect(current.status).toBe('IN BETRIEB');
      
      // Deactivate
      assetState.updateAsset(asset.id, { status: 'INAKTIV' });
      current = assetState.getAsset(asset.id);
      expect(current.status).toBe('INAKTIV');
      
      // Decommission
      assetState.updateAsset(asset.id, { status: 'STILLGELEGT' });
      current = assetState.getAsset(asset.id);
      expect(current.status).toBe('STILLGELEGT');
    });
  });

  describe('User Journey: Validation and Error Handling', () => {
    test('should handle missing required fields gracefully', () => {
      // Try to add asset with minimal data
      const minimal = assetState.addAsset({
        name: 'Minimal Board'
      });
      
      expect(minimal).toBeTruthy();
      expect(minimal.id).toBeTruthy();
      expect(minimal.name).toBe('Minimal Board');
    });

    test('should handle invalid asset ID gracefully', () => {
      const retrieved = assetState.getAsset('non-existent-id');
      expect(retrieved).toBeNull();
    });

    test('should handle duplicate asset names', () => {
      // Add first asset
      const asset1 = assetState.addAsset({
        name: 'Duplicate Board',
        type: 'LVUM'
      });
      
      // Add second with same name
      const asset2 = assetState.addAsset({
        name: 'Duplicate Board',
        type: 'UV'
      });
      
      // Both should exist with different IDs
      expect(asset1).toBeTruthy();
      expect(asset2).toBeTruthy();
      expect(asset1.id).not.toBe(asset2.id);
      
      const assets = assetState.getAssets();
      expect(assets).toHaveLength(2);
    });
  });

  describe('User Journey: Performance with Large Dataset', () => {
    test('should handle 100+ assets efficiently', () => {
      const startTime = performance.now();
      
      // Add 100 assets
      for (let i = 1; i <= 100; i++) {
        assetState.addAsset({
          name: `Board ${String(i).padStart(3, '0')}`,
          type: i % 4 === 0 ? 'LVUM' : i % 3 === 0 ? 'UV' : i % 2 === 0 ? 'KV' : 'LV',
          status: i % 3 === 0 ? 'STILLGELEGT' : i % 2 === 0 ? 'INAKTIV' : 'IN BETRIEB',
          location: `Location ${i}`,
          plant: `Plant ${i % 5}`
        });
      }
      
      const addTime = performance.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // Test retrieval performance
      const retrieveStart = performance.now();
      const all = assetState.getAssets();
      const retrieveTime = performance.now() - retrieveStart;
      
      expect(all).toHaveLength(100);
      expect(retrieveTime).toBeLessThan(100); // Should be very fast
    });

    test('should filter large dataset efficiently', () => {
      // Add many assets
      for (let i = 1; i <= 100; i++) {
        assetState.addAsset({
          name: `Board ${i}`,
          type: i % 2 === 0 ? 'LVUM' : 'UV',
          status: 'IN BETRIEB',
          plant: i % 2 === 0 ? 'Plant A' : 'Plant B'
        });
      }
      
      const startTime = performance.now();
      
      assetState.setFormState('filterPlant', 'Plant A');
      const filtered = assetState.getFilteredAssets();
      
      const filterTime = performance.now() - startTime;
      
      expect(filtered).toHaveLength(50);
      expect(filterTime).toBeLessThan(100);
    });
  });
});
