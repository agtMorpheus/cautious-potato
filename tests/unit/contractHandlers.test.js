/**
 * Unit Tests for Contract Handlers
 */
import {
    handleContractFileSelect,
    handleContractSheetSelect,
    handleContractMappingChange,
    handleContractImportConfirm,
    handleContractFilterChange,
    handleContractSearch,
    handleClearContractFilters,
    handleResetContracts,
    handleContractSubviewChange,
    initializeContractEventListeners,
    handleContractMappingConfirm,
    handleContractImportSave,
    handleContractCancelPreview,
    handleContractSort,
    handleContractActionClick,
    handleContractEdit,
    handleContractDelete,
    handleContractDateRangeChange,
    handleContractStatusChange,
    handleContractWorkerChange
} from '../../js/contracts/contractHandlers.js';

import * as stateModule from '../../js/state.js';
import * as contractUtils from '../../js/contracts/contractUtils.js';
import * as contractRepository from '../../js/contracts/contractRepository.js';
import * as handlers from '../../js/handlers.js';

// Mock external dependencies
jest.mock('../../js/state.js');
jest.mock('../../js/contracts/contractUtils.js');
jest.mock('../../js/contracts/contractRepository.js');
jest.mock('../../js/handlers.js');
jest.mock('../../js/contracts/contractRenderer.js');

describe('Contract Handlers', () => {
    let mockState;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Setup DOM
        document.body.innerHTML = `
            <input type="file" id="contract-file-input" />
            <button id="contract-import-button" disabled></button>
            <select id="contract-sheet-select">
                <option value="">Select Sheet</option>
                <option value="Sheet1">Sheet1</option>
            </select>
            <div id="contract-preview-container" style="display: none;"></div>
            <div id="contract-subview-list" class="subview-container"></div>
            <div id="contract-subview-import" class="subview-container"></div>
            <button class="sub-nav-btn" data-subview="list"></button>
            <button class="sub-nav-btn" data-subview="import"></button>

            <!-- Filters -->
            <input id="contract-search-input" />
            <select id="contract-status-filter"></select>
            <input id="contract-filter-from" />
            <input id="contract-filter-to" />
            <button id="contract-clear-filters"></button>
            <button id="contract-reset-button"></button>
            <button id="contract-refresh-btn"></button>

            <!-- Drop zone -->
            <div id="contract-file-drop-zone"></div>
        `;

        // Mock State
        mockState = {
            contracts: {
                importState: {
                    status: 'idle',
                    message: '',
                    progress: 0,
                    currentSheet: 'Sheet1',
                    currentFile: 'test.xlsx',
                    fileSize: 1024
                },
                rawSheets: {
                    'Sheet1': { rowCount: 10, columns: ['A', 'B'] }
                },
                currentMapping: { ...contractUtils.DEFAULT_COLUMN_MAPPING },
                records: [],
                filters: {},
                lastImportResult: null
            }
        };

        stateModule.getState.mockReturnValue(mockState);

        // Mock XLSX
        global.XLSX = {
            read: jest.fn().mockReturnValue({
                SheetNames: ['Sheet1'],
                Sheets: { 'Sheet1': {} }
            })
        };

        // Mock contractUtils
        contractUtils.discoverContractSheets.mockReturnValue({
            'Sheet1': { rowCount: 10, columns: ['A', 'B'] }
        });
        contractUtils.suggestContractColumnMapping.mockReturnValue({});
        contractUtils.VALID_STATUS_VALUES = ['Draft', 'Active', 'Terminated'];
    });

    afterEach(() => {
        delete window._contractWorkbook;
        delete window._handleContractSort;
        delete window._handleContractActionClick;
        jest.restoreAllMocks();
    });

    describe('handleContractFileSelect', () => {
        it('should handle valid file selection', async () => {
            const file = new File(['content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));
            
            const event = { target: { files: [file] } };

            await handleContractFileSelect(event);

            expect(stateModule.setState).toHaveBeenCalled();
            expect(document.getElementById('contract-import-button').disabled).toBe(false);
            expect(global.XLSX.read).toHaveBeenCalled();
        });

        it('should reject invalid file extensions', () => {
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });
            const event = { target: { files: [file] } };

            handleContractFileSelect(event);

            expect(handlers.showErrorAlert).toHaveBeenCalledWith(expect.stringContaining('Ungültiges Dateiformat'), expect.any(String));
            expect(document.getElementById('contract-import-button').disabled).toBe(true);
        });

        it('should reset state when no file selected', () => {
            const event = { target: { files: [] } };

            handleContractFileSelect(event);

            expect(stateModule.setState).toHaveBeenCalled();
            expect(document.getElementById('contract-import-button').disabled).toBe(true);
        });
    });

    describe('handleContractSheetSelect', () => {
        it('should update state on sheet selection', () => {
            const event = { target: { value: 'Sheet1' } };

            handleContractSheetSelect(event);

            expect(contractUtils.suggestContractColumnMapping).toHaveBeenCalled();
            expect(stateModule.setState).toHaveBeenCalledWith(expect.objectContaining({
                contracts: expect.objectContaining({
                    importState: expect.objectContaining({
                        currentSheet: 'Sheet1'
                    })
                })
            }));
        });

        it('should ignore empty selection', () => {
            const event = { target: { value: '' } };
            handleContractSheetSelect(event);
            expect(stateModule.setState).not.toHaveBeenCalled();
        });
    });

    describe('handleContractMappingChange', () => {
        it('should update mapping in state', () => {
            handleContractMappingChange('contractId', 'A');

            expect(stateModule.setState).toHaveBeenCalledWith(expect.objectContaining({
                contracts: expect.objectContaining({
                    currentMapping: expect.objectContaining({
                        contractId: expect.objectContaining({ excelColumn: 'A' })
                    })
                })
            }));
        });
    });

    describe('handleContractImportConfirm (Legacy)', () => {
        it('should show error if no workbook', async () => {
            delete window._contractWorkbook;
            await handleContractImportConfirm();
            expect(handlers.showErrorAlert).toHaveBeenCalledWith('Keine Datei', expect.any(String));
        });
    });

    describe('handleContractMappingConfirm (Preview)', () => {
        it('should generate preview successfully', async () => {
            window._contractWorkbook = {};
            contractUtils.extractContractsFromSheetAsync.mockResolvedValue({
                contracts: [{}],
                errors: [],
                warnings: []
            });

            await handleContractMappingConfirm();

            expect(contractUtils.extractContractsFromSheetAsync).toHaveBeenCalled();
            expect(stateModule.setState).toHaveBeenCalled();
            expect(document.getElementById('contract-preview-container').style.display).toBe('block');
        });

        it('should handle errors during preview generation', async () => {
            window._contractWorkbook = {};
            contractUtils.extractContractsFromSheetAsync.mockRejectedValue(new Error('Test error'));

            await handleContractMappingConfirm();

            expect(handlers.showErrorAlert).toHaveBeenCalledWith('Vorschau-Fehler', expect.stringContaining('Test error'));
        });
    });

    describe('handleContractImportSave', () => {
        it('should save imported contracts', async () => {
            mockState.contracts.lastImportResult = {
                contracts: [{ id: '1' }],
                errors: [],
                warnings: []
            };
            stateModule.getState.mockReturnValue(mockState);

            contractRepository.addContracts.mockReturnValue({ addedCount: 1 });

            await handleContractImportSave();

            expect(contractRepository.addContracts).toHaveBeenCalled();
            expect(handlers.showSuccessAlert).toHaveBeenCalled();
            expect(document.getElementById('contract-preview-container').style.display).toBe('none');
        });

        it('should show error if no contracts to save', async () => {
            mockState.contracts.lastImportResult = null;
            stateModule.getState.mockReturnValue(mockState);

            await handleContractImportSave();

            expect(handlers.showErrorAlert).toHaveBeenCalledWith('Keine Verträge', expect.any(String));
        });
    });

    describe('handleContractFilterChange', () => {
        it('should update filter state', () => {
            handleContractFilterChange('status', 'Active');
            
            expect(stateModule.setState).toHaveBeenCalledWith(expect.objectContaining({
                contracts: expect.objectContaining({
                    filters: expect.objectContaining({
                        status: 'Active'
                    })
                })
            }));
        });
    });

    describe('handleContractSearch', () => {
        it('should update search filter', () => {
            handleContractSearch('query');
            expect(stateModule.setState).toHaveBeenCalled();
        });
    });

    describe('handleContractDateRangeChange', () => {
        it('should update date range', () => {
            handleContractDateRangeChange('from', '2023-01-01');
            expect(stateModule.setState).toHaveBeenCalled();
        });
    });

    describe('handleClearContractFilters', () => {
        it('should clear all filters', () => {
            handleClearContractFilters();
            expect(stateModule.setState).toHaveBeenCalledWith(expect.objectContaining({
                contracts: expect.objectContaining({
                    filters: expect.objectContaining({
                        contractId: null
                    })
                })
            }));
        });
    });

    describe('handleContractSubviewChange', () => {
        it('should switch subviews', () => {
            jest.useFakeTimers();
            handleContractSubviewChange('import');
            jest.runAllTimers();

            const importContainer = document.getElementById('contract-subview-import');
            expect(importContainer.classList.contains('active')).toBe(true);
            jest.useRealTimers();
        });
    });

    describe('initializeContractEventListeners', () => {
        it('should setup event listeners', () => {
            const addListenerSpy = jest.spyOn(document.getElementById('contract-file-input'), 'addEventListener');

            initializeContractEventListeners();

            expect(addListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
            expect(handlers.setupDragAndDrop).toHaveBeenCalled();
            expect(window._handleContractSort).toBeDefined();
        });
    });

    describe('handleContractSort', () => {
        it('should toggle sort direction', () => {
            mockState.contracts.ui = { sortKey: 'contractId', sortDir: 'asc' };
            stateModule.getState.mockReturnValue(mockState);

            handleContractSort('contractId');

            expect(stateModule.setState).toHaveBeenCalledWith(expect.objectContaining({
                contracts: expect.objectContaining({
                    ui: expect.objectContaining({
                        sortKey: 'contractId',
                        sortDir: 'desc'
                    })
                })
            }));
        });
    });

    describe('handleContractStatusChange', () => {
        it('should update contract status', () => {
            contractRepository.updateContract.mockReturnValue(true);

            handleContractStatusChange('id-123', 'Active');

            expect(contractRepository.updateContract).toHaveBeenCalledWith('id-123', { status: 'Active' });
        });

        it('should validate status', () => {
            handleContractStatusChange('id-123', 'InvalidStatus');

            expect(handlers.showErrorAlert).toHaveBeenCalledWith('Ungültiger Status', expect.any(String));
            expect(contractRepository.updateContract).not.toHaveBeenCalled();
        });
    });

    describe('handleContractWorkerChange', () => {
        it('should update worker assignment', () => {
            contractRepository.updateContract.mockReturnValue(true);
            handleContractWorkerChange('id-123', 'worker-1');
            expect(contractRepository.updateContract).toHaveBeenCalledWith('id-123', { assignedWorkerId: 'worker-1' });
        });

        it('should unassign worker if empty', () => {
            contractRepository.updateContract.mockReturnValue(true);
            handleContractWorkerChange('id-123', '');
            expect(contractRepository.updateContract).toHaveBeenCalledWith('id-123', { assignedWorkerId: null });
        });
    });

    describe('handleResetContracts', () => {
        it('should reset contracts on confirmation', () => {
            window.confirm = jest.fn().mockReturnValue(true);
            
            handleResetContracts();

            expect(stateModule.setState).toHaveBeenCalledWith(expect.objectContaining({
                contracts: expect.objectContaining({
                    records: [],
                    importState: expect.objectContaining({
                        status: 'idle'
                    })
                })
            }));
            expect(window._contractWorkbook).toBeUndefined();
        });

        it('should cancel reset on rejection', () => {
            window.confirm = jest.fn().mockReturnValue(false);
            
            handleResetContracts();

            expect(stateModule.setState).not.toHaveBeenCalled();
        });
    });

    describe('handleContractActionClick', () => {
        it('should call delete handler', () => {
             // Mock console.log to catch "not implemented yet"
             const consoleSpy = jest.spyOn(console, 'log');
             handleContractActionClick('delete', 'id-123');
             expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Delete contract'));
        });

        it('should call edit handler', () => {
            // Mock prompt for edit
            window.prompt = jest.fn().mockReturnValue('Active');
            contractRepository.updateContract.mockReturnValue(true);
            mockState.contracts.records = [{ id: 'id-123', contractId: 'C123', status: 'Draft' }];
            stateModule.getState.mockReturnValue(mockState);

            handleContractActionClick('edit', 'id-123');
            
            expect(contractRepository.updateContract).toHaveBeenCalled();
        });
    });

    describe('handleContractCancelPreview', () => {
        it('should cancel preview', () => {
            handleContractCancelPreview();
            expect(stateModule.setState).toHaveBeenCalled();
            expect(document.getElementById('contract-preview-container').style.display).toBe('none');
        });
    });
});
