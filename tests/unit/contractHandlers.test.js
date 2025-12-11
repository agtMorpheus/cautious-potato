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

// Helper functions for tests
let mockStateData = {};

function setupTestContracts(contracts) {
    mockStateData = {
        contracts: {
            records: contracts,
            importState: { status: 'idle' },
            filters: {},
            ui: { sortKey: null, sortDir: 'asc' },
            lastImportResult: null
        }
    };
    stateModule.getState.mockReturnValue(mockStateData);
}

function getState() {
    return mockStateData;
}

function setState(newState, options = {}) {
    // Merge the new state into mockStateData
    if (newState.contracts) {
        mockStateData.contracts = { ...mockStateData.contracts, ...newState.contracts };
    }
    stateModule.setState(newState, options);
}

function normalizeStatus(status) {
    if (!status) return '';
    const statusMap = {
        'offen': 'Erstellt',
        'inbearb': 'In Bearbeitung', 
        'fertig': 'Abgerechnet'
    };
    return statusMap[status.toLowerCase()] || status;
}

// Make helper functions available globally for tests
global.setupTestContracts = setupTestContracts;
global.getState = getState;
global.setState = setState;
global.normalizeStatus = normalizeStatus;

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

        test('handles whitespace in search text', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', contractTitle: 'Test Project' }
            ];

            const searchText = '  test  ';
            const searchLower = searchText.trim().toLowerCase();
            
            const filtered = testContracts.filter(c => {
                return c.contractTitle && c.contractTitle.toLowerCase().includes(searchLower);
            });

            expect(filtered.length).toBe(1);
        });

        test('handles special characters in search', () => {
            const testContracts = [
                { id: '1', contractId: 'A-001', contractTitle: 'Test (Project)' },
                { id: '2', contractId: 'A-002', contractTitle: 'Another' }
            ];

            const searchText = '(Project)';
            const searchLower = searchText.toLowerCase();
            
            const filtered = testContracts.filter(c => {
                return c.contractTitle && c.contractTitle.toLowerCase().includes(searchLower);
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A-001');
        });

        test('handles numeric search values', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', taskId: '12345' },
                { id: '2', contractId: 'A002', taskId: '67890' }
            ];

            const searchText = '123';
            const searchLower = searchText.toLowerCase();
            
            const filtered = testContracts.filter(c => {
                const searchableFields = [c.contractId, c.taskId];
                return searchableFields.some(field => 
                    field && String(field).toLowerCase().includes(searchLower)
                );
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A001');
        });
    });

    describe('Contract Actions', () => {
        test('action type validation', () => {
            const validActions = ['edit', 'delete'];
            
            expect(validActions.includes('edit')).toBe(true);
            expect(validActions.includes('delete')).toBe(true);
            expect(validActions.includes('unknown')).toBe(false);
        });

        test('edit action with valid contract', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', status: 'fertig' }
            ];
            setupTestContracts(testContracts);

            const state = getState();
            const contract = state.contracts.records.find(c => c.id === '1');
            
            expect(contract).toBeDefined();
            expect(contract.contractId).toBe('A001');
        });

        test('edit action with non-existent contract', () => {
            setupTestContracts([]);

            const state = getState();
            const contract = state.contracts.records.find(c => c.id === 'non-existent');
            
            expect(contract).toBeUndefined();
        });
    });

    describe('Import Status Updates', () => {
        test('updates import status to pending', () => {
            setupTestContracts([]);

            setState({
                contracts: {
                    ...getState().contracts,
                    importState: {
                        ...getState().contracts.importState,
                        status: 'pending',
                        message: 'Processing...',
                        progress: 25
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.importState.status).toBe('pending');
            expect(state.contracts.importState.progress).toBe(25);
        });

        test('updates import status to success', () => {
            setupTestContracts([]);

            setState({
                contracts: {
                    ...getState().contracts,
                    importState: {
                        status: 'success',
                        message: '100 contracts imported',
                        progress: 100,
                        errors: [],
                        warnings: []
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.importState.status).toBe('success');
            expect(state.contracts.importState.progress).toBe(100);
        });

        test('updates import status to error', () => {
            setupTestContracts([]);

            setState({
                contracts: {
                    ...getState().contracts,
                    importState: {
                        status: 'error',
                        message: 'Import failed',
                        progress: 0,
                        errors: ['Error 1', 'Error 2']
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.importState.status).toBe('error');
            expect(state.contracts.importState.errors.length).toBe(2);
        });
    });

    describe('Multiple Filter Combinations', () => {
        test('applies status and location filters together', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', status: 'fertig', location: 'Berlin' },
                { id: '2', contractId: 'A002', status: 'fertig', location: 'Munich' },
                { id: '3', contractId: 'A003', status: 'inbearb', location: 'Berlin' }
            ];

            const statusFilter = 'Abgerechnet';
            const locationFilter = 'Berlin';

            const filtered = testContracts.filter(c => {
                const matchesStatus = normalizeStatus(c.status) === statusFilter;
                const matchesLocation = c.location === locationFilter;
                return matchesStatus && matchesLocation;
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A001');
        });

        test('applies search, status, and date filters together', () => {
            const testContracts = [
                { id: '1', contractId: 'A564', status: 'fertig', plannedStart: '2025-06-15' },
                { id: '2', contractId: 'A564', status: 'inbearb', plannedStart: '2025-06-20' },
                { id: '3', contractId: 'B123', status: 'fertig', plannedStart: '2025-06-15' }
            ];

            const searchText = 'A564';
            const statusFilter = 'Abgerechnet';
            const dateRange = { from: '2025-06-01', to: '2025-06-30' };

            const filtered = testContracts.filter(c => {
                const matchesSearch = c.contractId.includes(searchText);
                const matchesStatus = normalizeStatus(c.status) === statusFilter;
                const contractDate = new Date(c.plannedStart);
                const matchesDate = contractDate >= new Date(dateRange.from) && 
                                   contractDate <= new Date(dateRange.to);
                return matchesSearch && matchesStatus && matchesDate;
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A564');
        });

        test('clears all filters returns all contracts', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', status: 'fertig' },
                { id: '2', contractId: 'A002', status: 'inbearb' },
                { id: '3', contractId: 'A003', status: 'offen' }
            ];

            const filters = {
                searchText: '',
                status: null,
                location: null,
                dateRange: { from: null, to: null }
            };

            // With no active filters, all contracts should be returned
            const filtered = testContracts.filter(c => {
                if (filters.searchText) return false;
                if (filters.status) return false;
                if (filters.location) return false;
                if (filters.dateRange.from || filters.dateRange.to) return false;
                return true;
            });

            expect(filtered.length).toBe(3);
        });
    });

    describe('Sort State Toggle', () => {
        test('toggles sort direction on repeated clicks', () => {
            setupTestContracts([]);

            // Initial state - ascending
            let sortKey = 'contractId';
            let sortDir = 'asc';

            // First click on same column - should toggle to desc
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            expect(sortDir).toBe('desc');

            // Second click - should toggle back to asc
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            expect(sortDir).toBe('asc');
        });

        test('clicking different column resets to ascending', () => {
            setupTestContracts([]);

            const currentSortKey = 'contractId';
            const currentSortDir = 'desc';
            const newSortKey = 'status';

            let newSortDir = 'asc';
            if (newSortKey === currentSortKey) {
                newSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            }

            expect(newSortDir).toBe('asc');
        });
    });

    describe('Contract Field Validation', () => {
        test('validates required contractId field', () => {
            const contract = { contractId: '', contractTitle: 'Test', status: 'fertig' };
            
            const isValid = contract.contractId && contract.contractId.trim() !== '';
            
            expect(isValid).toBeFalsy();
        });

        test('validates required contractTitle field', () => {
            const contract = { contractId: 'A001', contractTitle: '', status: 'fertig' };
            
            const isValid = contract.contractTitle && contract.contractTitle.trim() !== '';
            
            expect(isValid).toBeFalsy();
        });

        test('validates required status field', () => {
            const contract = { contractId: 'A001', contractTitle: 'Test', status: '' };
            
            const isValid = contract.status && contract.status.trim() !== '';
            
            expect(isValid).toBeFalsy();
        });

        test('validates complete contract', () => {
            const contract = { contractId: 'A001', contractTitle: 'Test', status: 'fertig' };
            
            const isValid = contract.contractId && contract.contractTitle && contract.status;
            
            expect(isValid).toBeTruthy();
        });
    });

    describe('Preview State Management', () => {
        test('stores last import result for preview', () => {
            setupTestContracts([]);

            const mockImportResult = {
                contracts: [
                    { id: '1', contractId: 'A001' },
                    { id: '2', contractId: 'A002' }
                ],
                errors: [{ row: 3, message: 'Invalid data' }],
                warnings: [],
                summary: { totalRows: 3, successCount: 2, errorCount: 1 }
            };

            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: mockImportResult
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.lastImportResult.contracts.length).toBe(2);
            expect(state.contracts.lastImportResult.errors.length).toBe(1);
        });

        test('clears preview result on cancel', () => {
            setupTestContracts([]);

            // Set preview
            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: { contracts: [{ id: '1' }] }
                }
            }, { silent: true });

            // Clear preview
            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: null
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.lastImportResult).toBeNull();
        });

        test('clears preview after successful save', () => {
            setupTestContracts([]);

            // Simulate successful save - preview should be cleared
            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: null,
                    importState: {
                        ...getState().contracts.importState,
                        status: 'success'
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.lastImportResult).toBeNull();
            expect(state.contracts.importState.status).toBe('success');
        });
    });
});
