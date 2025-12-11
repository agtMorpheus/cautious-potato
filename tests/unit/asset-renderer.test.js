import { jest } from '@jest/globals';

// Mocks must be hoisted or defined before imports
jest.mock('../../js/modules/assets/asset-state.js');
jest.mock('../../js/modules/assets/asset-handlers.js');

import * as renderer from '../../js/modules/assets/asset-renderer.js';
import * as state from '../../js/modules/assets/asset-state.js';
import * as handlers from '../../js/modules/assets/asset-handlers.js';

describe('Asset Renderer', () => {
  let container;
  let messageContainer;

  const mockAssets = [
    { id: 'A1', name: 'Asset 1', type: 'Type A', status: 'AKTIV', location: 'Loc 1', plant: 'Plant 1', description: 'Desc 1' },
    { id: 'A2', name: 'Asset 2', type: 'Type B', status: 'INAKTIV', location: 'Loc 2', plant: 'Plant 2', description: 'Desc 2' }
  ];

  const mockStatistics = {
    total: 2,
    byStatus: { 'AKTIV': 1, 'INAKTIV': 1, 'IN BETRIEB': 0 },
    byPlant: { 'Plant 1': 1, 'Plant 2': 1 },
    hierarchical: 0
  };

  const mockFormState = {
    searchTerm: '',
    filterStatus: '',
    filterPlant: '',
    filterType: ''
  };

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="assetContainer"></div>';
    container = document.getElementById('assetContainer');

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    state.getAllAssets.mockReturnValue(mockAssets);
    state.getFormState.mockReturnValue(mockFormState);
    state.getStatistics.mockReturnValue(mockStatistics);
    state.getAssetStatuses.mockReturnValue(['AKTIV', 'INAKTIV', 'IN BETRIEB']);
    state.getAssetTypes.mockReturnValue(['Type A', 'Type B']);
    state.getUniquePlants.mockReturnValue(['Plant 1', 'Plant 2']);
    state.getAsset.mockReturnValue(null);
  });

  describe('Initialization', () => {
    test('init should setup subscriptions and render initial list', () => {
      // Spy on addEventListener
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderer.init();

      expect(addEventListenerSpy).toHaveBeenCalledWith('asset:renderAssets', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('asset:showForm', expect.any(Function));
      expect(state.getAllAssets).toHaveBeenCalled();

      // Check if content was rendered
      expect(container.innerHTML).toContain('Asset-Verwaltung');
      expect(container.innerHTML).toContain('Asset 1');
      expect(container.innerHTML).toContain('Asset 2');
    });

    test('should warn if container missing', () => {
      document.body.innerHTML = '';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      renderer.init();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      consoleSpy.mockRestore();
    });
  });

  describe('Render Asset List', () => {
    test('should render empty state when no assets', () => {
      state.getAllAssets.mockReturnValue([]);
      state.getStatistics.mockReturnValue({ total: 0, byStatus: {}, byPlant: {}, hierarchical: 0 });

      renderer.renderAssetList();

      expect(container.innerHTML).toContain('Keine Assets vorhanden');
    });

    test('should render assets table', () => {
      renderer.renderAssetList();

      expect(container.innerHTML).toContain('asset-table');
      expect(container.innerHTML).toContain('A1');
      expect(container.innerHTML).toContain('A2');
      expect(container.querySelector('.asset-count').textContent).toContain('2 von 2 Assets');
    });

    test('should filter assets by search term', () => {
      state.getFormState.mockReturnValue({ ...mockFormState, searchTerm: 'Asset 1' });

      renderer.renderAssetList();

      expect(container.innerHTML).toContain('Asset 1');
      expect(container.innerHTML).not.toContain('Asset 2');
    });

    test('should filter assets by status', () => {
      state.getFormState.mockReturnValue({ ...mockFormState, filterStatus: 'AKTIV' });

      renderer.renderAssetList();

      expect(container.innerHTML).toContain('Asset 1');
      expect(container.innerHTML).not.toContain('Asset 2');
    });
  });

  describe('Asset Form Modal', () => {
    test('showAssetForm should render add modal', () => {
      renderer.showAssetForm('add');

      const modal = document.getElementById('assetFormModal');
      expect(modal).not.toBeNull();
      expect(modal.innerHTML).toContain('Neues Asset');
      expect(modal.querySelector('input[name="id"]').hasAttribute('readonly')).toBe(false);
    });

    test('showAssetForm should render edit modal with data', () => {
      state.getAsset.mockReturnValue(mockAssets[0]);

      renderer.showAssetForm('edit', 'A1');

      const modal = document.getElementById('assetFormModal');
      expect(modal).not.toBeNull();
      expect(modal.innerHTML).toContain('Asset bearbeiten');
      expect(modal.querySelector('input[name="id"]').value).toBe('A1');
      expect(modal.querySelector('input[name="name"]').value).toBe('Asset 1');
      expect(modal.querySelector('input[name="id"]').hasAttribute('readonly')).toBe(true);
    });

    test('hideAssetForm should remove modal', () => {
      renderer.showAssetForm('add');
      expect(document.getElementById('assetFormModal')).not.toBeNull();

      renderer.hideAssetForm();
      expect(document.getElementById('assetFormModal')).toBeNull();
      expect(state.clearValidationErrors).toHaveBeenCalled();
    });
  });

  describe('Feedback and Messages', () => {
    test('displayMessage should show message', () => {
      renderer.displayMessage('success', 'Operation successful');

      const msgContainer = document.getElementById('assetMessageContainer');
      expect(msgContainer).not.toBeNull();
      expect(msgContainer.innerHTML).toContain('Operation successful');
      expect(msgContainer.querySelector('.message-success')).not.toBeNull();
    });

    test('displayFieldError should show error on field', () => {
      // First show form so fields exist
      renderer.showAssetForm('add');

      renderer.displayFieldError('name', 'Name required');

      const errorDiv = document.getElementById('error-name');
      const input = document.getElementById('asset-name');

      expect(errorDiv.textContent).toBe('Name required');
      expect(errorDiv.style.display).toBe('block');
      expect(input.classList.contains('error')).toBe(true);
    });

    test('clearFieldError should clear error', () => {
      renderer.showAssetForm('add');
      renderer.displayFieldError('name', 'Error');

      renderer.clearFieldError('name');

      const errorDiv = document.getElementById('error-name');
      const input = document.getElementById('asset-name');

      expect(errorDiv.textContent).toBe('');
      expect(errorDiv.style.display).toBe('none');
      expect(input.classList.contains('error')).toBe(false);
    });
  });

  describe('Import Results', () => {
    test('showImportResults should display results', () => {
      const results = {
        total: 10,
        successful: 8,
        failed: 2,
        errors: [
          { row: 1, error: 'Bad data' },
          { row: 2, error: 'Missing ID' }
        ]
      };

      renderer.showImportResults(results);

      const modal = document.getElementById('asset-import-results-modal');
      expect(modal).not.toBeNull();
      expect(modal.innerHTML).toContain('Import-Ergebnis');
      expect(modal.innerHTML).toContain('10'); // Total
      expect(modal.innerHTML).toContain('8');  // Success
      expect(modal.innerHTML).toContain('2');  // Failed
      expect(modal.innerHTML).toContain('Bad data');
    });
  });

  describe('Event Integration', () => {
    test('should respond to asset:renderAssets event', () => {
      renderer.init();
      state.getAllAssets.mockClear();

      document.dispatchEvent(new CustomEvent('asset:renderAssets'));

      expect(state.getAllAssets).toHaveBeenCalled();
    });

    test('should respond to asset:showForm event', () => {
      renderer.init();

      document.dispatchEvent(new CustomEvent('asset:showForm', {
        detail: { mode: 'add' }
      }));

      expect(document.getElementById('assetFormModal')).not.toBeNull();
    });

    test('should respond to asset:message event', () => {
      renderer.init();

      document.dispatchEvent(new CustomEvent('asset:message', {
        detail: { type: 'info', message: 'Hello' }
      }));

      expect(document.getElementById('assetMessageContainer').innerHTML).toContain('Hello');
    });
  });
});
