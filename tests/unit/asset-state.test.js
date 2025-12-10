/**
 * asset-state.test.js
 * Unit tests for the Asset state management module
 */

import * as state from '../../js/modules/assets/asset-state.js';

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
      const assets = state.getAllAssets();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBe(0);
    });

    test('initializes with default form state', () => {
      const formState = state.getFormState();
      expect(formState.editingAssetId).toBeNull();
      expect(formState.unsavedChanges).toBe(false);
      expect(formState.validationErrors).toEqual({});
      expect(formState.searchTerm).toBe('');
      expect(formState.filterStatus).toBe('');
    });

    test('initializes with default import state', () => {
      const importState = state.getImportState();
      expect(importState.isImporting).toBe(false);
      expect(importState.progress).toBe(0);
      expect(importState.errors).toEqual([]);
    });

    test('loads state from localStorage if exists', () => {
      // Add an asset first
      state.addAsset({
        id: 'TEST001',
        name: 'Test Asset',
        status: 'AKTIV'
      });
      state.forceSave();

      // Reinitialize
      state.init();

      const assets = state.getAllAssets();
      expect(assets.length).toBe(1);
      expect(assets[0].name).toBe('Test Asset');
    });
  });

  // ===== ASSET CRUD OPERATIONS =====
  describe('Asset CRUD', () => {
    
    describe('addAsset()', () => {
      test('adds a new asset with provided ID', () => {
        const asset = state.addAsset({
          id: 'E03150AP17000000001',
          name: 'LVUM-17',
          status: 'IN BETRIEB',
          location: '1100-0BT01-00',
          plant: '1100'
        });

        expect(asset).toBeTruthy();
        expect(asset.id).toBe('E03150AP17000000001');

        const assets = state.getAllAssets();
        expect(assets.length).toBe(1);
        expect(assets[0].name).toBe('LVUM-17');
        expect(assets[0].status).toBe('IN BETRIEB');
      });

      test('generates ID if not provided', () => {
        const asset = state.addAsset({
          name: 'Test Asset',
          status: 'AKTIV'
        });

        expect(asset.id).toBeTruthy();
        expect(asset.id).toMatch(/^AST-/);
      });

      test('returns null for invalid asset', () => {
        const result = state.addAsset(null);
        expect(result).toBeNull();
      });

      test('sets default status if not provided', () => {
        const asset = state.addAsset({ id: 'TEST', name: 'Test' });
        expect(asset.status).toBe('AKTIV');
      });

      test('sets default type if not provided', () => {
        const asset = state.addAsset({ id: 'TEST', name: 'Test' });
        expect(asset.type).toBe('OTHER');
      });

      test('adds timestamps', () => {
        const asset = state.addAsset({ id: 'TEST', name: 'Test' });
        expect(asset.importedAt).toBeTruthy();
        expect(asset.lastUpdated).toBeTruthy();
      });
    });

    describe('addAssets()', () => {
      test('adds multiple assets', () => {
        const result = state.addAssets([
          { id: 'TEST1', name: 'Asset 1', status: 'AKTIV' },
          { id: 'TEST2', name: 'Asset 2', status: 'AKTIV' }
        ]);

        expect(result.successful.length).toBe(2);
        expect(result.failed.length).toBe(0);
        expect(state.getAssetCount()).toBe(2);
      });

      test('returns error for non-array input', () => {
        const result = state.addAssets('not an array');
        expect(result.failed[0].error).toBe('Input must be an array');
      });
    });

    describe('getAsset()', () => {
      test('returns asset by ID', () => {
        state.addAsset({
          id: 'TEST001',
          name: 'Test Asset',
          status: 'AKTIV'
        });

        const asset = state.getAsset('TEST001');
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
          id: 'TEST001',
          name: 'Original Name',
          status: 'AKTIV'
        });

        const success = state.updateAsset('TEST001', {
          name: 'Updated Name',
          status: 'INAKTIV'
        });

        expect(success).toBe(true);
        const asset = state.getAsset('TEST001');
        expect(asset.name).toBe('Updated Name');
        expect(asset.status).toBe('INAKTIV');
      });

      test('returns false for non-existent asset', () => {
        const success = state.updateAsset('non-existent', { name: 'Test' });
        expect(success).toBe(false);
      });

      test('updates lastUpdated timestamp on update', () => {
        state.addAsset({ id: 'TEST001', name: 'Test' });
        const assetBefore = state.getAsset('TEST001');

        // Wait a bit to ensure different timestamp
        state.updateAsset('TEST001', { name: 'Updated' });
        const assetAfter = state.getAsset('TEST001');

        expect(assetAfter.lastUpdated).toBeTruthy();
        expect(new Date(assetAfter.lastUpdated).getTime()).not.toBeNaN();
      });
    });

    describe('deleteAsset()', () => {
      test('soft deletes asset (sets active=false)', () => {
        state.addAsset({ id: 'TEST001', name: 'To Delete' });
        expect(state.getAssetCount()).toBe(1);

        const success = state.deleteAsset('TEST001');
        expect(success).toBe(true);
        expect(state.getAssetCount()).toBe(0); // getAllAssets filters out inactive
        
        // But the raw state still has it
        const fullState = state.getState();
        expect(fullState.assets.length).toBe(1);
        expect(fullState.assets[0].active).toBe(false);
      });

      test('returns false for non-existent asset', () => {
        const success = state.deleteAsset('non-existent');
        expect(success).toBe(false);
      });
    });
  });

  // ===== ASSET QUERIES =====
  describe('Asset Queries', () => {
    
    beforeEach(() => {
      // Add test assets
      state.addAsset({
        id: 'ASSET-A',
        name: 'Device A',
        type: 'LVUM',
        status: 'IN BETRIEB',
        plant: '1100',
        location: 'LOC-A'
      });
      state.addAsset({
        id: 'ASSET-B',
        name: 'Device B',
        type: 'UV',
        status: 'INAKTIV',
        plant: '1200',
        location: 'LOC-B'
      });
      state.addAsset({
        id: 'ASSET-C',
        name: 'Device C',
        type: 'LVUM',
        status: 'IN BETRIEB',
        plant: '1100',
        location: 'LOC-A'
      });
    });

    test('getAssetsByStatus returns assets with specified status', () => {
      const active = state.getAssetsByStatus('IN BETRIEB');
      expect(active.length).toBe(2);
      expect(active.every(a => a.status === 'IN BETRIEB')).toBe(true);
    });

    test('getAssetsByPlant returns assets in specified plant', () => {
      const plant1100 = state.getAssetsByPlant('1100');
      expect(plant1100.length).toBe(2);
      expect(plant1100.every(a => a.plant === '1100')).toBe(true);
    });

    test('getAssetsByLocation returns assets in specified location', () => {
      const locA = state.getAssetsByLocation('LOC-A');
      expect(locA.length).toBe(2);
    });

    test('getAssetsByType returns assets of specified type', () => {
      const lvum = state.getAssetsByType('LVUM');
      expect(lvum.length).toBe(2);
      expect(lvum.every(a => a.type === 'LVUM')).toBe(true);
    });

    test('searchAssets finds assets by name', () => {
      const results = state.searchAssets('Device A');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ASSET-A');
    });

    test('searchAssets finds assets by ID', () => {
      const results = state.searchAssets('ASSET-B');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Device B');
    });

    test('searchAssets returns all assets for empty query', () => {
      const results = state.searchAssets('');
      expect(results.length).toBe(3);
    });

    test('getAssetCount returns correct count', () => {
      expect(state.getAssetCount()).toBe(3);
    });

    test('getStatistics returns correct statistics', () => {
      const stats = state.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.byStatus['IN BETRIEB']).toBe(2);
      expect(stats.byStatus['INAKTIV']).toBe(1);
      expect(stats.byPlant['1100']).toBe(2);
      expect(stats.byPlant['1200']).toBe(1);
    });

    test('getUniquePlants returns unique plant list', () => {
      const plants = state.getUniquePlants();
      expect(plants.length).toBe(2);
      expect(plants).toContain('1100');
      expect(plants).toContain('1200');
    });
  });

  // ===== HIERARCHY =====
  describe('Hierarchy', () => {
    beforeEach(() => {
      state.addAsset({ id: 'ROOT', name: 'Root Asset', status: 'AKTIV' });
      state.addAsset({ id: 'CHILD1', name: 'Child 1', parentId: 'ROOT', status: 'AKTIV' });
      state.addAsset({ id: 'CHILD2', name: 'Child 2', parentId: 'ROOT', status: 'AKTIV' });
      state.addAsset({ id: 'GRANDCHILD', name: 'Grandchild', parentId: 'CHILD1', status: 'AKTIV' });
    });

    test('getHierarchyTree builds correct tree', () => {
      const tree = state.getHierarchyTree();
      
      // Should have one root
      expect(tree.length).toBe(1);
      expect(tree[0].id).toBe('ROOT');
      
      // Root should have 2 children
      expect(tree[0].children.length).toBe(2);
      
      // Child1 should have grandchild
      const child1 = tree[0].children.find(c => c.id === 'CHILD1');
      expect(child1.children.length).toBe(1);
      expect(child1.children[0].id).toBe('GRANDCHILD');
    });

    test('getStatistics counts hierarchical assets', () => {
      const stats = state.getStatistics();
      expect(stats.hierarchical).toBe(3); // CHILD1, CHILD2, GRANDCHILD
    });
  });

  // ===== FORM STATE =====
  describe('Form State', () => {
    
    test('setEditingAsset updates editing state', () => {
      state.addAsset({ id: 'TEST', name: 'Test' });
      state.setEditingAsset('TEST');

      expect(state.getFormState().editingAssetId).toBe('TEST');
    });

    test('setSearchTerm updates search state', () => {
      state.setSearchTerm('test query');
      expect(state.getFormState().searchTerm).toBe('test query');
    });

    test('setFilterStatus updates filter state', () => {
      state.setFilterStatus('AKTIV');
      expect(state.getFormState().filterStatus).toBe('AKTIV');
    });

    test('setFilterPlant updates filter state', () => {
      state.setFilterPlant('1100');
      expect(state.getFormState().filterPlant).toBe('1100');
    });

    test('setFilterType updates filter state', () => {
      state.setFilterType('LVUM');
      expect(state.getFormState().filterType).toBe('LVUM');
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

  // ===== ASSET TYPES AND STATUSES =====
  describe('Asset Types and Statuses', () => {
    test('getAssetStatuses returns array of statuses', () => {
      const statuses = state.getAssetStatuses();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses).toContain('IN BETRIEB');
      expect(statuses).toContain('AKTIV');
      expect(statuses).toContain('INAKTIV');
      expect(statuses).toContain('STILLGELEGT');
    });

    test('getAssetTypes returns array of types', () => {
      const types = state.getAssetTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('LVUM');
      expect(types).toContain('UV');
      expect(types).toContain('KV');
      expect(types).toContain('LV');
      expect(types).toContain('OTHER');
    });
  });

  // ===== IMPORT STATE =====
  describe('Import State', () => {
    test('setImportState updates import state', () => {
      state.setImportState({
        isImporting: true,
        progress: 50,
        errors: ['Error 1']
      });

      const importState = state.getImportState();
      expect(importState.isImporting).toBe(true);
      expect(importState.progress).toBe(50);
      expect(importState.errors).toEqual(['Error 1']);
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
      state.addAsset({ id: 'TEST', name: 'Test' });
      state.setSearchTerm('query');
      
      state.reset();
      
      expect(state.getAllAssets().length).toBe(0);
      expect(state.getFormState().searchTerm).toBe('');
    });

    test('forceSave saves to localStorage immediately', () => {
      state.addAsset({ id: 'TEST', name: 'Test Asset' });
      state.forceSave();

      const saved = localStorage.getItem('asset_management_state');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved).assets.length).toBe(1);
    });

    test('exportData returns correct export format', () => {
      state.addAsset({ id: 'TEST', name: 'Test Asset', status: 'AKTIV' });
      
      const exported = state.exportData();
      expect(exported.version).toBe('1.0.0');
      expect(exported.exportedAt).toBeTruthy();
      expect(exported.assets.length).toBe(1);
    });

    test('importData imports assets correctly', () => {
      const data = {
        assets: [
          { id: 'IMPORT1', name: 'Imported 1', status: 'AKTIV' },
          { id: 'IMPORT2', name: 'Imported 2', status: 'AKTIV' }
        ]
      };

      const result = state.importData(data);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(state.getAssetCount()).toBe(2);
    });
  });

  // ===== EVENTS =====
  describe('Event System', () => {
    test('on() subscribes to events', () => {
      const callback = jest.fn();
      state.on('assetAdded', callback);

      state.addAsset({ id: 'TEST', name: 'Test' });

      expect(callback).toHaveBeenCalled();
    });

    test('on() returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = state.on('assetAdded', callback);

      unsubscribe();
      state.addAsset({ id: 'TEST', name: 'Test' });

      expect(callback).not.toHaveBeenCalled();
    });

    test('emits assetUpdated event on update', () => {
      const callback = jest.fn();
      state.on('assetUpdated', callback);

      state.addAsset({ id: 'TEST', name: 'Test' });
      state.updateAsset('TEST', { name: 'Updated' });

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        assetId: 'TEST'
      }));
    });

    test('emits assetDeleted event on delete', () => {
      const callback = jest.fn();
      state.on('assetDeleted', callback);

      state.addAsset({ id: 'TEST', name: 'Test' });
      state.deleteAsset('TEST');

      expect(callback).toHaveBeenCalledWith({ assetId: 'TEST' });
    });

    test('emits assetsImported event on batch import', () => {
      const callback = jest.fn();
      state.on('assetsImported', callback);

      state.addAssets([
        { id: 'TEST1', name: 'Test 1' },
        { id: 'TEST2', name: 'Test 2' }
      ]);

      expect(callback).toHaveBeenCalledWith({
        total: 2,
        successful: 2,
        failed: 0
      });
    });
  });

  // ===== STATE IMMUTABILITY =====
  describe('State Immutability', () => {
    test('getAllAssets returns a copy', () => {
      state.addAsset({ id: 'TEST', name: 'Test' });
      const assets = state.getAllAssets();
      assets.push({ id: 'FAKE', name: 'Fake' });

      expect(state.getAllAssets().length).toBe(1);
    });

    test('getAsset returns a copy', () => {
      state.addAsset({ id: 'TEST', name: 'Test' });
      const asset = state.getAsset('TEST');
      asset.name = 'Modified';

      expect(state.getAsset('TEST').name).toBe('Test');
    });

    test('getFormState returns a copy', () => {
      const formState = state.getFormState();
      formState.searchTerm = 'modified';

      expect(state.getFormState().searchTerm).toBe('');
    });
  });
});
