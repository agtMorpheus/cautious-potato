/**
 * Unit Tests for Asset Handlers Module (asset-handlers.js)
 * Tests event handling, validation, and coordination between UI and state
 */

import * as handlers from '../../js/modules/assets/asset-handlers.js';
import * as state from '../../js/modules/assets/asset-state.js';
import * as assetUtils from '../../js/modules/assets/asset-utils.js';

// Mock the dependencies
jest.mock('../../js/modules/assets/asset-state.js', () => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  addAsset: jest.fn(),
  updateAsset: jest.fn(),
  deleteAsset: jest.fn(),
  getAsset: jest.fn(),
  getAllAssets: jest.fn(() => []),
  setValidationError: jest.fn(),
  clearValidationErrors: jest.fn(),
  setSearchTerm: jest.fn(),
  setFilterStatus: jest.fn(),
  setFilterPlant: jest.fn(),
  setFilterType: jest.fn(),
  setEditingAsset: jest.fn(),
  getFormState: jest.fn(() => ({ editingAssetId: null })),
  getAssetStatuses: jest.fn(() => ['IN BETRIEB', 'AKTIV', 'INAKTIV', 'STILLGELEGT']),
  getAssetTypes: jest.fn(() => ['LVUM', 'UV', 'KV', 'LV', 'OTHER'])
}));

jest.mock('../../js/modules/assets/asset-db.js', () => ({
  default: {
    init: jest.fn(),
    addAsset: jest.fn(),
    updateAsset: jest.fn(),
    deleteAsset: jest.fn()
  }
}));

jest.mock('../../js/modules/assets/asset-utils.js', () => ({
  readAssetExcel: jest.fn(),
  transformAssets: jest.fn(),
  validateAssets: jest.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message, asset) {
      super(message);
      this.name = 'ValidationError';
      this.asset = asset;
    }
  }
}));

describe('Asset Handlers Module', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup minimal DOM
    document.body.innerHTML = `
      <div id="assetContainer"></div>
      <div id="assetFormModal"></div>
      <input type="file" id="asset-file-input" />
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================
  // Initialization Tests
  // ============================================
  describe('init()', () => {
    test('initializes handlers without throwing', () => {
      expect(() => handlers.init()).not.toThrow();
    });

    test('sets up state listeners', () => {
      handlers.init();
      
      // Verify state.on was called for various events
      expect(state.on).toHaveBeenCalled();
    });
  });

  // ============================================
  // Validation Tests
  // ============================================
  describe('validateAsset()', () => {
    test('returns invalid for empty ID', () => {
      const result = handlers.validateAsset({ id: '', name: 'Test', status: 'AKTIV' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.id).toBeDefined();
    });

    test('returns invalid for whitespace-only ID', () => {
      const result = handlers.validateAsset({ id: '   ', name: 'Test', status: 'AKTIV' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.id).toBeDefined();
    });

    test('returns invalid for empty name', () => {
      const result = handlers.validateAsset({ id: 'TEST-001', name: '', status: 'AKTIV' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    test('returns invalid for empty status', () => {
      const result = handlers.validateAsset({ id: 'TEST-001', name: 'Test', status: '' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.status).toBeDefined();
    });

    test('returns valid for complete asset', () => {
      const result = handlers.validateAsset({
        id: 'TEST-001',
        name: 'Valid Asset',
        status: 'AKTIV'
      });
      
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('handles null/undefined values gracefully', () => {
      const result = handlers.validateAsset({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors.id).toBeDefined();
      expect(result.errors.name).toBeDefined();
      expect(result.errors.status).toBeDefined();
    });
  });

  // ============================================
  // Filter Handlers Tests
  // ============================================
  describe('handleSearchChange()', () => {
    test('calls state.setSearchTerm with the search value', () => {
      handlers.handleSearchChange('test query');
      
      expect(state.setSearchTerm).toHaveBeenCalledWith('test query');
    });

    test('handles empty search value', () => {
      handlers.handleSearchChange('');
      
      expect(state.setSearchTerm).toHaveBeenCalledWith('');
    });
  });

  describe('handleStatusFilterChange()', () => {
    test('calls state.setFilterStatus with the status value', () => {
      handlers.handleStatusFilterChange('AKTIV');
      
      expect(state.setFilterStatus).toHaveBeenCalledWith('AKTIV');
    });
  });

  describe('handlePlantFilterChange()', () => {
    test('calls state.setFilterPlant with the plant value', () => {
      handlers.handlePlantFilterChange('1100');
      
      expect(state.setFilterPlant).toHaveBeenCalledWith('1100');
    });
  });

  describe('handleTypeFilterChange()', () => {
    test('calls state.setFilterType with the type value', () => {
      handlers.handleTypeFilterChange('LVUM');
      
      expect(state.setFilterType).toHaveBeenCalledWith('LVUM');
    });
  });

  // ============================================
  // Form Handlers Tests
  // ============================================
  describe('handleFormSubmit()', () => {
    test('prevents default form submission', () => {
      const event = {
        preventDefault: jest.fn()
      };
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="id" value="TEST-001" />
        <input name="name" value="Test Asset" />
        <select name="status"><option value="AKTIV" selected>AKTIV</option></select>
      `;
      
      handlers.handleFormSubmit(event, form);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('validates form data before submission', () => {
      const event = { preventDefault: jest.fn() };
      
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="id" value="" />
        <input name="name" value="" />
        <select name="status"><option value="" selected></option></select>
      `;
      
      handlers.handleFormSubmit(event, form);
      
      // Validation should fail for empty fields
      expect(state.setValidationError).toHaveBeenCalled();
    });
  });

  // ============================================
  // Delete Handler Tests
  // ============================================
  describe('handleDeleteAsset()', () => {
    test('prompts for confirmation before deleting', () => {
      window.confirm = jest.fn(() => false);
      state.getAsset.mockReturnValue({ id: 'TEST-001', name: 'Test' });
      
      handlers.handleDeleteAsset('TEST-001');
      
      expect(window.confirm).toHaveBeenCalled();
      expect(state.deleteAsset).not.toHaveBeenCalled();
    });

    test('deletes asset when user confirms', () => {
      window.confirm = jest.fn(() => true);
      state.getAsset.mockReturnValue({ id: 'TEST-001', name: 'Test' });
      
      handlers.handleDeleteAsset('TEST-001');
      
      expect(window.confirm).toHaveBeenCalled();
      expect(state.deleteAsset).toHaveBeenCalledWith('TEST-001');
    });
  });

  // ============================================
  // File Import Handler Tests
  // ============================================
  describe('handleFileImport()', () => {
    test('handles empty file selection gracefully', () => {
      const event = {
        target: {
          files: []
        }
      };
      
      // Should not throw
      expect(() => handlers.handleFileImport(event)).not.toThrow();
    });

    test('handles null files gracefully', () => {
      const event = {
        target: {
          files: null
        }
      };
      
      // Should not throw
      expect(() => handlers.handleFileImport(event)).not.toThrow();
    });
  });

  // ============================================
  // Event Dispatch Tests
  // ============================================
  describe('State Event Listeners', () => {
    test('init sets up assetAdded listener', () => {
      handlers.init();
      
      // Find the call that registered 'assetAdded' listener
      const assetAddedCall = state.on.mock.calls.find(call => call[0] === 'assetAdded');
      expect(assetAddedCall).toBeDefined();
    });

    test('init sets up assetUpdated listener', () => {
      handlers.init();
      
      const assetUpdatedCall = state.on.mock.calls.find(call => call[0] === 'assetUpdated');
      expect(assetUpdatedCall).toBeDefined();
    });

    test('init sets up assetDeleted listener', () => {
      handlers.init();
      
      const assetDeletedCall = state.on.mock.calls.find(call => call[0] === 'assetDeleted');
      expect(assetDeletedCall).toBeDefined();
    });
  });

  // ============================================
  // Edit Handler Tests
  // ============================================
  describe('handleEditAsset()', () => {
    test('sets editing asset in state', () => {
      handlers.handleEditAsset('TEST-001');
      
      expect(state.setEditingAsset).toHaveBeenCalledWith('TEST-001');
    });
  });

  // ============================================
  // Cancel Handler Tests  
  // ============================================
  describe('handleCancelEdit()', () => {
    test('clears editing asset in state', () => {
      handlers.handleCancelEdit();
      
      expect(state.setEditingAsset).toHaveBeenCalledWith(null);
    });

    test('clears validation errors', () => {
      handlers.handleCancelEdit();
      
      expect(state.clearValidationErrors).toHaveBeenCalled();
    });
  });
});
