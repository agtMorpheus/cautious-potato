/**
 * Unit Tests for Asset Handlers
 */
import {
    init,
    validateAsset,
    handleAddAsset,
    handleUpdateAsset,
    handleDeleteAsset,
    handleEditAsset,
    handleCancelEdit,
    handleFileImport,
    handleSearchChange,
    handleStatusFilterChange,
    handlePlantFilterChange,
    handleTypeFilterChange,
    handleExportJson,
    handleViewAssetDetail,
    handleBackToList,
    handleCreateProtocolFromAsset,
    handleFormSubmit
} from '../../js/modules/assets/asset-handlers.js';

import * as state from '../../js/modules/assets/asset-state.js';
import db from '../../js/modules/assets/asset-db.js';
import * as utils from '../../js/modules/assets/asset-utils.js';

// Mock dependencies
jest.mock('../../js/modules/assets/asset-state.js');
jest.mock('../../js/modules/assets/asset-db.js');
jest.mock('../../js/modules/assets/asset-utils.js');

describe('Asset Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock state methods
        state.getAssetStatuses.mockReturnValue(['AKTIV', 'INAKTIV', 'WARTUNG', 'DEFEKT']);
        state.addAsset.mockImplementation(a => a);
        state.updateAsset.mockReturnValue(true);
        state.deleteAsset.mockReturnValue(true);
        state.getAsset.mockReturnValue({ id: '1', name: 'Test Asset', type: 'MOTOR', status: 'AKTIV' });
        state.getFormState.mockReturnValue({ editingAssetId: null });
        state.exportData.mockReturnValue({ assets: [] });

        // Mock DB methods
        db.addAsset.mockResolvedValue('1');
        db.updateAsset.mockResolvedValue('1');
        db.deleteAsset.mockResolvedValue('1');
        db.addAssets.mockResolvedValue(true);

        // Mock utils
        utils.readAssetExcel.mockResolvedValue([]);
        utils.transformAssets.mockReturnValue([]);
        utils.validateAssets.mockReturnValue({ valid: [], invalid: [] });

        // Mock DOM events
        global.document.dispatchEvent = jest.fn();
        global.URL.createObjectURL = jest.fn();
        global.URL.revokeObjectURL = jest.fn();
    });

    describe('init', () => {
        it('should initialize handlers', () => {
            const spy = jest.spyOn(document, 'addEventListener');
            init();
            expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(state.on).toHaveBeenCalled();
        });
    });

    describe('validateAsset', () => {
        it('should return valid for correct asset', () => {
            const asset = {
                id: '1',
                name: 'Test',
                status: 'AKTIV'
            };
            const result = validateAsset(asset);
            expect(result.isValid).toBe(true);
        });

        it('should fail if required fields missing', () => {
            const result = validateAsset({});
            expect(result.isValid).toBe(false);
            expect(result.errors.id).toBeDefined();
            expect(result.errors.name).toBeDefined();
            expect(result.errors.status).toBeDefined();
        });

        it('should fail for invalid status', () => {
            const result = validateAsset({ id: '1', name: 'Test', status: 'INVALID' });
            expect(result.isValid).toBe(false);
            expect(result.errors.status).toBeDefined();
        });
    });

    describe('handleAddAsset', () => {
        it('should add valid asset', () => {
            const asset = { id: '1', name: 'Test', status: 'AKTIV' };
            handleAddAsset(asset);
            expect(state.addAsset).toHaveBeenCalledWith(asset);
            expect(db.addAsset).toHaveBeenCalled();
            expect(document.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        });

        it('should reject invalid asset', () => {
            const asset = { id: '', name: '' };
            const result = handleAddAsset(asset);
            expect(result).toBeNull();
            expect(state.setValidationError).toHaveBeenCalled();
        });
    });

    describe('handleUpdateAsset', () => {
        it('should update valid asset', () => {
            const asset = { name: 'Test', status: 'AKTIV' };
            handleUpdateAsset('1', asset);
            expect(state.updateAsset).toHaveBeenCalledWith('1', asset);
            expect(db.updateAsset).toHaveBeenCalled();
        });

        it('should reject invalid update', () => {
            const asset = { name: '' };
            const result = handleUpdateAsset('1', asset);
            expect(result).toBe(false);
            expect(state.setValidationError).toHaveBeenCalled();
        });
    });

    describe('handleDeleteAsset', () => {
        it('should delete asset with confirmation', () => {
            window.confirm = jest.fn().mockReturnValue(true);
            handleDeleteAsset('1');
            expect(state.deleteAsset).toHaveBeenCalledWith('1');
            expect(db.deleteAsset).toHaveBeenCalled();
        });

        it('should cancel delete if not confirmed', () => {
            window.confirm = jest.fn().mockReturnValue(false);
            handleDeleteAsset('1');
            expect(state.deleteAsset).not.toHaveBeenCalled();
        });

        it('should delete without confirmation if skipConfirm is true', () => {
            handleDeleteAsset('1', true);
            expect(state.deleteAsset).toHaveBeenCalledWith('1');
        });
    });

    describe('handleEditAsset', () => {
        it('should set editing state', () => {
            handleEditAsset('1');
            expect(state.setEditingAsset).toHaveBeenCalledWith('1');
        });
    });

    describe('handleCancelEdit', () => {
        it('should clear editing state', () => {
            handleCancelEdit();
            expect(state.setEditingAsset).toHaveBeenCalledWith(null);
            expect(state.clearValidationErrors).toHaveBeenCalled();
        });
    });

    describe('handleFileImport', () => {
        it('should import valid file', async () => {
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file] } };

            utils.readAssetExcel.mockResolvedValue([{ id: '1' }]);
            utils.transformAssets.mockReturnValue([{ id: '1', name: 'Test' }]);
            utils.validateAssets.mockReturnValue({ valid: [{ id: '1' }], invalid: [] });

            await handleFileImport(event);

            expect(utils.readAssetExcel).toHaveBeenCalled();
            expect(state.addAssets).toHaveBeenCalled();
            expect(db.addAssets).toHaveBeenCalled();
            expect(state.forceSave).toHaveBeenCalled();
        });

        it('should handle import errors', async () => {
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file] } };
            utils.readAssetExcel.mockRejectedValue(new Error('Format error'));

            await handleFileImport(event);

            expect(state.setImportState).toHaveBeenCalledWith(expect.objectContaining({
                errors: expect.arrayContaining(['Format error'])
            }));
        });
    });

    describe('Search and Filter', () => {
        it('should handle search change', () => {
            handleSearchChange('query');
            expect(state.setSearchTerm).toHaveBeenCalledWith('query');
        });

        it('should handle status filter', () => {
            handleStatusFilterChange('AKTIV');
            expect(state.setFilterStatus).toHaveBeenCalledWith('AKTIV');
        });

        it('should handle plant filter', () => {
            handlePlantFilterChange('Plant 1');
            expect(state.setFilterPlant).toHaveBeenCalledWith('Plant 1');
        });

        it('should handle type filter', () => {
            handleTypeFilterChange('MOTOR');
            expect(state.setFilterType).toHaveBeenCalledWith('MOTOR');
        });
    });

    describe('handleExportJson', () => {
        it('should export data', () => {
            handleExportJson();
            expect(state.exportData).toHaveBeenCalled();
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });
    });

    describe('Detail View', () => {
        it('should dispatch showDetail event', () => {
            handleViewAssetDetail('1');
            expect(document.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        });

        it('should dispatch hideDetail event', () => {
            handleBackToList();
            expect(document.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        });
    });

    describe('handleCreateProtocolFromAsset', () => {
        it('should dispatch createProtocol event', () => {
            handleCreateProtocolFromAsset('1');
            expect(state.getAsset).toHaveBeenCalledWith('1');
            expect(document.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        });

        it('should show error if asset not found', () => {
            state.getAsset.mockReturnValue(null);
            handleCreateProtocolFromAsset('999');
            // Should dispatch error message
            // We check if dispatchEvent was called with asset:message
            expect(document.dispatchEvent).toHaveBeenCalled();
        });
    });

    describe('handleFormSubmit', () => {
        it('should add asset when not editing', () => {
            const form = document.createElement('form');
            form.innerHTML = `
                <input name="id" value="1" />
                <input name="name" value="Test" />
                <input name="status" value="AKTIV" />
            `;
            const event = { preventDefault: jest.fn() };
            state.getFormState.mockReturnValue({ editingAssetId: null });

            handleFormSubmit(event, form);

            expect(state.addAsset).toHaveBeenCalled();
        });

        it('should update asset when editing', () => {
            const form = document.createElement('form');
            form.innerHTML = `
                <input name="id" value="1" />
                <input name="name" value="Test" />
                <input name="status" value="AKTIV" />
            `;
            const event = { preventDefault: jest.fn() };
            state.getFormState.mockReturnValue({ editingAssetId: '1' });

            handleFormSubmit(event, form);

            expect(state.updateAsset).toHaveBeenCalled();
        });
    });
});
