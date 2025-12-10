/**
 * asset-state.test.js
 * Unit tests for the Asset state management module
 */

import * as state from '../../js/assets/asset-state.js';

describe('Asset State', () => {
  
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
    test('initializes with empty assets array', () => {
      const assets = state.getAssets();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBe(0);
    });

    test('initializes with default form state', () => {
      const formState = state.getFormState();
      expect(formState.editingAssetId).toBeNull();
      expect(formState.unsavedChanges).toBe(false);
      expect(formState.validationErrors).toEqual({});
    });

    test('loads state from localStorage if exists', () => {
      // Add an asset first
      state.addAsset({
        id: 'TEST-001',
        name: 'Test Asset',
        status: 'IN BETRIEB'
      });
      state.forceSave();

      // Reinitialize
      state.init();

      const assets = state.getAssets();
      expect(assets.length).toBe(1);
      expect(assets[0].name).toBe('Test Asset');
    });
  });

  // ===== ASSET CRUD OPERATIONS =====
  describe('Asset CRUD', () => {
    
    describe('addAsset()', () => {
      test('adds a new asset with provided ID', () => {
        const asset = state.addAsset({
          id: 'A-001',
          name: 'LVUM-17',
          status: 'IN BETRIEB',
          plant: '1100',
          location: '1100-0BT01-00'
        });

        expect(asset).toBeTruthy();
        expect(asset.id).toBe('A-001');

        const assets = state.getAssets();
        expect(assets.length).toBe(1);
        expect(assets[0].name).toBe('LVUM-17');
        expect(assets[0].status).toBe('IN BETRIEB');
      });

      test('generates ID if not provided', () => {
        const asset = state.addAsset({ name: 'Test', status: 'AKTIV' });
        expect(asset.id).toMatch(/^A-/);
      });

      test('returns null for invalid asset', () => {
        const result = state.addAsset(null);
        expect(result).toBeNull();
      });

      test('sets default status if not provided', () => {
        state.addAsset({ id: 'TEST', name: 'Test' });
        const assets = state.getAssets();
        expect(assets[0].status).toBe('AKTIV');
      });

      test('sets default type if not provided', () => {
        state.addAsset({ id: 'TEST', name: 'Test', status: 'AKTIV' });
        const assets = state.getAssets();
        expect(assets[0].type).toBe('OTHER');
      });
    });

    describe('getAsset()', () => {
      test('returns asset by ID', () => {
        state.addAsset({
          id: 'A-001',
          name: 'Test Asset',
          status: 'IN BETRIEB'
        });

        const asset = state.getAsset('A-001');
        expect(asset).not.toBeNull();
        expect(asset.name).toBe('Test Asset');
      });

      test('returns null for non-existent ID', () => {
        const asset = state.getAsset('non-existent-id');
        expect(asset).toBeNull();
      });
    });

    describe('updateAsset()', () => {
      test('updates asset fields', () => {
        state.addAsset({
          id: 'A-001',
          name: 'Original Name',
          status: 'IN BETRIEB'
        });

        const updated = state.updateAsset('A-001', {
          name: 'Updated Name',
          location: 'NEW-LOCATION'
        });

        expect(updated).toBeTruthy();
        expect(updated.name).toBe('Updated Name');
        expect(updated.location).toBe('NEW-LOCATION');
      });

      test('returns null for non-existent asset', () => {
        const result = state.updateAsset('non-existent', { name: 'Test' });
        expect(result).toBeNull();
      });

      test('sets lastUpdated timestamp on update', () => {
        state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
        const assetBefore = state.getAsset('A-001');

        // Update the asset
        state.updateAsset('A-001', { name: 'Updated' });
        const assetAfter = state.getAsset('A-001');

        // lastUpdated should exist and be a valid date
        expect(assetAfter.lastUpdated).toBeTruthy();
        expect(new Date(assetAfter.lastUpdated).getTime()).not.toBeNaN();
      });
    });

    describe('deleteAsset()', () => {
      test('soft-deletes asset from state', () => {
        state.addAsset({ id: 'A-001', name: 'To Delete', status: 'AKTIV' });
        expect(state.getAssets().length).toBe(1);

        const success = state.deleteAsset('A-001');
        expect(success).toBe(true);
        
        // Should not appear in active assets
        expect(state.getAssets().length).toBe(0);
        
        // But should still exist in all assets
        const all = state.getAllAssets();
        expect(all.length).toBe(1);
        expect(all[0].active).toBe(false);
      });

      test('returns false for non-existent asset', () => {
        const success = state.deleteAsset('non-existent');
        expect(success).toBe(false);
      });
    });

    describe('addAssets() batch operation', () => {
      test('adds multiple assets', () => {
        const result = state.addAssets([
          { id: 'A-001', name: 'Asset 1', status: 'AKTIV' },
          { id: 'A-002', name: 'Asset 2', status: 'IN BETRIEB' },
          { id: 'A-003', name: 'Asset 3', status: 'INAKTIV' }
        ]);

        expect(result.successful.length).toBe(3);
        expect(result.failed.length).toBe(0);
        expect(state.getAssets().length).toBe(3);
      });
    });
  });

  // ===== ASSET QUERIES =====
  describe('Asset Queries', () => {
    
    beforeEach(() => {
      // Add test assets
      state.addAsset({
        id: 'A-001',
        name: 'Asset A',
        status: 'IN BETRIEB',
        type: 'LVUM',
        plant: '1100'
      });
      state.addAsset({
        id: 'A-002',
        name: 'Asset B',
        status: 'AKTIV',
        type: 'UV',
        plant: '1100'
      });
      state.addAsset({
        id: 'A-003',
        name: 'Asset C',
        status: 'INAKTIV',
        type: 'LVUM',
        plant: '1200'
      });
    });

    test('getAssetsByStatus returns assets of specified status', () => {
      const inBetrieb = state.getAssetsByStatus('IN BETRIEB');
      expect(inBetrieb.length).toBe(1);
      expect(inBetrieb[0].id).toBe('A-001');
    });

    test('getAssetsByPlant returns assets of specified plant', () => {
      const plant1100 = state.getAssetsByPlant('1100');
      expect(plant1100.length).toBe(2);
    });

    test('getAssetsByType returns assets of specified type', () => {
      const lvum = state.getAssetsByType('LVUM');
      expect(lvum.length).toBe(2);
    });

    test('searchAssets finds by name', () => {
      const results = state.searchAssets('Asset A');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('A-001');
    });

    test('searchAssets finds by ID', () => {
      const results = state.searchAssets('A-002');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Asset B');
    });

    test('getAssetCount returns correct count', () => {
      expect(state.getAssetCount()).toBe(3);
    });

    test('getStatistics returns correct counts', () => {
      const stats = state.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.byStatus['IN BETRIEB']).toBe(1);
      expect(stats.byStatus['AKTIV']).toBe(1);
      expect(stats.byPlant['1100']).toBe(2);
    });
  });

  // ===== FORM STATE =====
  describe('Form State', () => {
    
    test('setEditingAsset updates editing state', () => {
      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      state.setEditingAsset('A-001');

      expect(state.getFormState().editingAssetId).toBe('A-001');
    });

    test('setSearchTerm updates search state', () => {
      state.setSearchTerm('test query');
      expect(state.getFormState().searchTerm).toBe('test query');
    });

    test('setFilterStatus updates filter state', () => {
      state.setFilterStatus('IN BETRIEB');
      expect(state.getFormState().filterStatus).toBe('IN BETRIEB');
    });

    test('setFilterPlant updates filter state', () => {
      state.setFilterPlant('1100');
      expect(state.getFormState().filterPlant).toBe('1100');
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
      state.setValidationError('status', 'Error 2');
      state.clearValidationErrors();
      expect(state.getValidationErrors()).toEqual({});
    });
  });

  // ===== ENUM VALUES =====
  describe('Enum Values', () => {
    test('getAssetStatuses returns array of statuses', () => {
      const statuses = state.getAssetStatuses();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses).toContain('IN BETRIEB');
      expect(statuses).toContain('AKTIV');
      expect(statuses).toContain('INAKTIV');
      expect(statuses).toContain('STILLGELEGT');
    });

    test('getAssetTypes returns array of types', () => {
      const types = state.getAssetTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('LVUM');
      expect(types).toContain('UV');
      expect(types).toContain('OTHER');
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
      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      state.setSearchTerm('query');
      
      state.reset();
      
      expect(state.getAssets().length).toBe(0);
      expect(state.getFormState().searchTerm).toBe('');
    });

    test('forceSave saves to localStorage immediately', () => {
      state.addAsset({ id: 'A-001', name: 'Test Asset', status: 'AKTIV' });
      state.forceSave();

      const saved = localStorage.getItem('asset_state');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved).assets.length).toBe(1);
    });
  });

  // ===== IMPORT/EXPORT =====
  describe('Import/Export', () => {
    test('exportState returns current data', () => {
      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      
      const exported = state.exportState();
      
      expect(exported.version).toBe('1.0.0');
      expect(exported.exportedAt).toBeTruthy();
      expect(exported.assets.length).toBe(1);
    });

    test('importState adds new assets (merge mode)', () => {
      state.addAsset({ id: 'A-001', name: 'Existing', status: 'AKTIV' });
      
      const result = state.importState({
        assets: [
          { id: 'A-002', name: 'Imported', status: 'IN BETRIEB' }
        ]
      }, false);

      expect(result.success).toBe(true);
      expect(state.getAssets().length).toBe(2);
    });

    test('importState replaces assets (replace mode)', () => {
      state.addAsset({ id: 'A-001', name: 'Existing', status: 'AKTIV' });
      
      const result = state.importState({
        assets: [
          { id: 'A-002', name: 'Imported', status: 'IN BETRIEB' }
        ]
      }, true);

      expect(result.success).toBe(true);
      expect(state.getAssets().length).toBe(1);
      expect(state.getAssets()[0].id).toBe('A-002');
    });
  });

  // ===== EVENTS =====
  describe('Event System', () => {
    test('on() subscribes to events', () => {
      const callback = jest.fn();
      state.on('assetAdded', callback);

      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });

      expect(callback).toHaveBeenCalled();
    });

    test('on() returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = state.on('assetAdded', callback);

      unsubscribe();
      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });

      expect(callback).not.toHaveBeenCalled();
    });

    test('emits assetUpdated event on update', () => {
      const callback = jest.fn();
      state.on('assetUpdated', callback);

      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      state.updateAsset('A-001', { name: 'Updated' });

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 'A-001'
      }));
    });

    test('emits assetDeleted event on delete', () => {
      const callback = jest.fn();
      state.on('assetDeleted', callback);

      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      state.deleteAsset('A-001');

      expect(callback).toHaveBeenCalledWith({ assetId: 'A-001' });
    });
  });

  // ===== STATE IMMUTABILITY =====
  describe('State Immutability', () => {
    test('getAssets returns a copy', () => {
      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      const assets = state.getAssets();
      assets.push({ id: 'FAKE', name: 'Fake', status: 'AKTIV' });

      expect(state.getAssets().length).toBe(1);
    });

    test('getAsset returns a copy', () => {
      state.addAsset({ id: 'A-001', name: 'Test', status: 'AKTIV' });
      const asset = state.getAsset('A-001');
      asset.name = 'Modified';

      expect(state.getAsset('A-001').name).toBe('Test');
    });
  });

  // ===== HIERARCHY =====
  describe('Hierarchy', () => {
    beforeEach(() => {
      state.addAsset({ id: 'ROOT', name: 'Root Asset', status: 'AKTIV' });
      state.addAsset({ id: 'CHILD-1', name: 'Child 1', status: 'AKTIV', parentId: 'ROOT' });
      state.addAsset({ id: 'CHILD-2', name: 'Child 2', status: 'AKTIV', parentId: 'ROOT' });
    });

    test('getHierarchyTree returns nested structure', () => {
      const tree = state.getHierarchyTree();
      
      expect(tree.length).toBe(1); // Only root
      expect(tree[0].id).toBe('ROOT');
      expect(tree[0].children.length).toBe(2);
    });

    test('statistics tracks hierarchical count', () => {
      const stats = state.getStatistics();
      expect(stats.hierarchical).toBe(2); // Two children
    });
  });
});
