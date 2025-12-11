/**
 * Unit Tests for Contract Handlers Module (Phase 3 & 4)
 * 
 * Tests handler logic for filtering, sorting, and actions
 * Tests are designed to run without DOM dependencies where possible
 */

import { getState, setState, resetState, subscribe } from '../../js/state.js';
import { normalizeStatus } from '../../js/contracts/contractUtils.js';

// Helper to setup test contracts in state
function setupTestContracts(contracts) {
    resetState(true);
    setState({
        contracts: {
            records: contracts,
            filters: {
                contractId: null,
                status: null,
                location: null,
                equipmentId: null,
                dateRange: { from: null, to: null },
                searchText: ''
            },
            ui: {
                sortKey: 'contractId',
                sortDir: 'asc'
            },
            importState: {
                isImporting: false,
                currentFile: null,
                currentSheet: null,
                progress: 0,
                status: 'idle',
                message: '',
                errors: [],
                warnings: []
            },
            importedFiles: [],
            rawSheets: {},
            currentMapping: {}
        }
    }, { silent: true });
}

describe('Contract Handlers Logic (Phase 3 & 4)', () => {

    beforeEach(() => {
        resetState(true);
    });

    describe('Filter Logic', () => {

        test('filters contracts by status', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', status: 'fertig', contractTitle: 'Contract 1' },
                { id: '2', contractId: 'A002', status: 'inbearb', contractTitle: 'Contract 2' },
                { id: '3', contractId: 'A003', status: 'fertig', contractTitle: 'Contract 3' },
                { id: '4', contractId: 'A004', status: 'offen', contractTitle: 'Contract 4' }
            ];

            setupTestContracts(testContracts);

            // Apply status filter
            const state = getState();
            const filters = { status: 'fertig' };
            
            const filtered = testContracts.filter(c => 
                normalizeStatus(c.status) === normalizeStatus(filters.status)
            );

            expect(filtered.length).toBe(2);
            expect(filtered.every(c => c.status === 'fertig')).toBe(true);
        });

        test('filters contracts by search text', () => {
            const testContracts = [
                { id: '1', contractId: 'A564', status: 'fertig', contractTitle: 'Berlin Project' },
                { id: '2', contractId: 'A565', status: 'inbearb', contractTitle: 'Munich Task' },
                { id: '3', contractId: 'A564', status: 'offen', contractTitle: 'Hamburg Work' }
            ];

            setupTestContracts(testContracts);

            const searchText = 'A564';
            const searchLower = searchText.toLowerCase();
            
            const filtered = testContracts.filter(c => {
                const searchableFields = [
                    c.contractId,
                    c.contractTitle
                ];
                return searchableFields.some(field => 
                    field && String(field).toLowerCase().includes(searchLower)
                );
            });

            expect(filtered.length).toBe(2);
            expect(filtered.every(c => c.contractId === 'A564')).toBe(true);
        });

        test('filters contracts by date range', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', status: 'fertig', plannedStart: '2025-06-02' },
                { id: '2', contractId: 'A002', status: 'inbearb', plannedStart: '2025-05-01' },
                { id: '3', contractId: 'A003', status: 'fertig', plannedStart: '2025-06-15' }
            ];

            setupTestContracts(testContracts);

            const dateRange = { from: '2025-06-01', to: '2025-06-30' };
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);

            const filtered = testContracts.filter(c => {
                if (!c.plannedStart) return false;
                const contractDate = new Date(c.plannedStart);
                return contractDate >= fromDate && contractDate <= toDate;
            });

            expect(filtered.length).toBe(2);
            expect(filtered.every(c => c.contractId !== 'A002')).toBe(true);
        });

        test('combines multiple filters', () => {
            const testContracts = [
                { id: '1', contractId: 'A564', status: 'fertig', plannedStart: '2025-06-02' },
                { id: '2', contractId: 'B123', status: 'inbearb', plannedStart: '2025-05-01' },
                { id: '3', contractId: 'A564', status: 'fertig', plannedStart: '2025-06-15' },
                { id: '4', contractId: 'A564', status: 'offen', plannedStart: '2025-06-10' }
            ];

            setupTestContracts(testContracts);

            const filters = {
                searchText: 'A564',
                status: 'Abgerechnet', // Updated to match normalized status
                dateRange: { from: '2025-06-01', to: '2025-06-30' }
            };

            const fromDate = new Date(filters.dateRange.from);
            const toDate = new Date(filters.dateRange.to);
            const searchLower = filters.searchText.toLowerCase();

            const filtered = testContracts.filter(c => {
                // Search filter
                const matchesSearch = String(c.contractId || '').toLowerCase().includes(searchLower);
                // Status filter
                const matchesStatus = normalizeStatus(c.status) === filters.status;
                // Date filter
                const contractDate = new Date(c.plannedStart);
                const matchesDate = contractDate >= fromDate && contractDate <= toDate;
                
                return matchesSearch && matchesStatus && matchesDate;
            });

            expect(filtered.length).toBe(2);
            expect(filtered.every(c => c.contractId === 'A564')).toBe(true);
            expect(filtered.every(c => c.status === 'fertig')).toBe(true);
        });
    });

    describe('Sort Logic', () => {

        test('sorts contracts by contractId ascending', () => {
            const testContracts = [
                { id: '1', contractId: 'C123', contractTitle: 'Zebra' },
                { id: '2', contractId: 'A123', contractTitle: 'Apple' },
                { id: '3', contractId: 'B123', contractTitle: 'Banana' }
            ];

            const sortedAsc = [...testContracts].sort((a, b) => 
                a.contractId.localeCompare(b.contractId)
            );

            expect(sortedAsc[0].contractId).toBe('A123');
            expect(sortedAsc[1].contractId).toBe('B123');
            expect(sortedAsc[2].contractId).toBe('C123');
        });

        test('sorts contracts by contractId descending', () => {
            const testContracts = [
                { id: '1', contractId: 'C123', contractTitle: 'Zebra' },
                { id: '2', contractId: 'A123', contractTitle: 'Apple' },
                { id: '3', contractId: 'B123', contractTitle: 'Banana' }
            ];

            const sortedDesc = [...testContracts].sort((a, b) => 
                b.contractId.localeCompare(a.contractId)
            );

            expect(sortedDesc[0].contractId).toBe('C123');
            expect(sortedDesc[1].contractId).toBe('B123');
            expect(sortedDesc[2].contractId).toBe('A123');
        });

        test('sorts contracts by plannedStart date', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', plannedStart: '2025-07-01' },
                { id: '2', contractId: 'A002', plannedStart: '2025-05-15' },
                { id: '3', contractId: 'A003', plannedStart: '2025-06-01' }
            ];

            const sortedByDate = [...testContracts].sort((a, b) => {
                const dateA = a.plannedStart ? new Date(a.plannedStart).getTime() : 0;
                const dateB = b.plannedStart ? new Date(b.plannedStart).getTime() : 0;
                return dateA - dateB;
            });

            expect(sortedByDate[0].contractId).toBe('A002');
            expect(sortedByDate[1].contractId).toBe('A003');
            expect(sortedByDate[2].contractId).toBe('A001');
        });

        test('handles null values in sorting', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', location: 'Berlin' },
                { id: '2', contractId: 'A002', location: null },
                { id: '3', contractId: 'A003', location: 'Munich' }
            ];

            const sortedByLocation = [...testContracts].sort((a, b) => {
                const locA = a.location || '';
                const locB = b.location || '';
                return locA.localeCompare(locB);
            });

            // Empty string sorts first
            expect(sortedByLocation[0].location).toBe(null);
            expect(sortedByLocation[1].location).toBe('Berlin');
            expect(sortedByLocation[2].location).toBe('Munich');
        });
    });

    describe('State Management for Contracts', () => {

        test('updates filter state correctly', () => {
            setupTestContracts([]);

            setState({
                contracts: {
                    ...getState().contracts,
                    filters: {
                        ...getState().contracts.filters,
                        status: 'fertig'
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.filters.status).toBe('fertig');
        });

        test('updates sort state correctly', () => {
            setupTestContracts([]);

            setState({
                contracts: {
                    ...getState().contracts,
                    ui: {
                        sortKey: 'plannedStart',
                        sortDir: 'desc'
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.ui.sortKey).toBe('plannedStart');
            expect(state.contracts.ui.sortDir).toBe('desc');
        });

        test('toggles sort direction when same column clicked', () => {
            setupTestContracts([]);

            // Initial state
            setState({
                contracts: {
                    ...getState().contracts,
                    ui: {
                        sortKey: 'contractId',
                        sortDir: 'asc'
                    }
                }
            }, { silent: true });

            // Simulate clicking same column
            const currentSortKey = getState().contracts.ui.sortKey;
            const currentSortDir = getState().contracts.ui.sortDir;
            const newSortKey = 'contractId';
            
            let newSortDir = 'asc';
            if (newSortKey === currentSortKey) {
                newSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            }

            setState({
                contracts: {
                    ...getState().contracts,
                    ui: {
                        sortKey: newSortKey,
                        sortDir: newSortDir
                    }
                }
            }, { silent: true });

            expect(getState().contracts.ui.sortDir).toBe('desc');
        });
    });

    describe('Import State Management', () => {

        test('updates import status correctly', () => {
            setupTestContracts([]);

            setState({
                contracts: {
                    ...getState().contracts,
                    importState: {
                        ...getState().contracts.importState,
                        status: 'pending',
                        message: 'Importing...',
                        progress: 50
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.importState.status).toBe('pending');
            expect(state.contracts.importState.progress).toBe(50);
            expect(state.contracts.importState.message).toBe('Importing...');
        });

        test('stores last import result for preview', () => {
            setupTestContracts([]);

            const mockImportResult = {
                contracts: [
                    { id: '1', contractId: 'A001', contractTitle: 'Test' }
                ],
                errors: [],
                warnings: [],
                summary: { totalRows: 1, successCount: 1 }
            };

            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: mockImportResult
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.lastImportResult).toBeDefined();
            expect(state.contracts.lastImportResult.contracts.length).toBe(1);
        });

        test('clears preview on cancel', () => {
            setupTestContracts([]);

            // Set up preview
            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: {
                        contracts: [{ id: '1' }],
                        errors: [],
                        warnings: []
                    }
                }
            }, { silent: true });

            // Cancel preview
            setState({
                contracts: {
                    ...getState().contracts,
                    lastImportResult: null,
                    importState: {
                        ...getState().contracts.importState,
                        status: 'idle',
                        message: 'Import cancelled'
                    }
                }
            }, { silent: true });

            const state = getState();
            expect(state.contracts.lastImportResult).toBeNull();
            expect(state.contracts.importState.status).toBe('idle');
        });
    });

    describe('Contract Edit Logic', () => {

        test('normalizes status on edit', () => {
            const inputStatus = 'FERTIG';
            const normalized = normalizeStatus(inputStatus);
            expect(normalized).toBe('Abgerechnet');
        });

        test('normalizes German status variations', () => {
            expect(normalizeStatus('in bearbeitung')).toBe('In Bearbeitung');
            expect(normalizeStatus('abgeschlossen')).toBe('Abgerechnet');
            expect(normalizeStatus('done')).toBe('Abgerechnet');
        });

        test('preserves unknown status values', () => {
            expect(normalizeStatus('custom_status')).toBe('custom_status');
        });
    });

    describe('Date Range Filter Edge Cases', () => {

        test('handles contracts without plannedStart', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', plannedStart: '2025-06-02' },
                { id: '2', contractId: 'A002', plannedStart: null },
                { id: '3', contractId: 'A003', plannedStart: undefined }
            ];

            const dateRange = { from: '2025-06-01', to: '2025-06-30' };
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);

            const filtered = testContracts.filter(c => {
                if (!c.plannedStart) return false;
                const contractDate = new Date(c.plannedStart);
                return contractDate >= fromDate && contractDate <= toDate;
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A001');
        });

        test('handles only from date in range', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', plannedStart: '2025-06-02' },
                { id: '2', contractId: 'A002', plannedStart: '2025-05-15' }
            ];

            const dateRange = { from: '2025-06-01', to: null };
            const fromDate = new Date(dateRange.from);

            const filtered = testContracts.filter(c => {
                if (!c.plannedStart) return false;
                const contractDate = new Date(c.plannedStart);
                return contractDate >= fromDate;
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A001');
        });

        test('handles only to date in range', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', plannedStart: '2025-06-02' },
                { id: '2', contractId: 'A002', plannedStart: '2025-05-15' }
            ];

            const dateRange = { from: null, to: '2025-05-31' };
            const toDate = new Date(dateRange.to);

            const filtered = testContracts.filter(c => {
                if (!c.plannedStart) return false;
                const contractDate = new Date(c.plannedStart);
                return contractDate <= toDate;
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A002');
        });
    });

    describe('Search Filter Edge Cases', () => {

        test('handles empty search text', () => {
            const testContracts = [
                { id: '1', contractId: 'A001' },
                { id: '2', contractId: 'A002' }
            ];

            const searchText = '';
            
            const filtered = searchText.trim() === '' 
                ? testContracts 
                : testContracts.filter(c => c.contractId.includes(searchText));

            expect(filtered.length).toBe(2);
        });

        test('search is case-insensitive', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', contractTitle: 'Berlin Project' },
                { id: '2', contractId: 'A002', contractTitle: 'Munich Task' }
            ];

            const searchText = 'BERLIN';
            const searchLower = searchText.toLowerCase();
            
            const filtered = testContracts.filter(c => {
                return c.contractTitle && c.contractTitle.toLowerCase().includes(searchLower);
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].contractId).toBe('A001');
        });

        test('searches across multiple fields', () => {
            const testContracts = [
                { id: '1', contractId: 'A001', contractTitle: 'Project', location: 'Berlin' },
                { id: '2', contractId: 'A002', contractTitle: 'Berlin Task', location: 'Munich' }
            ];

            const searchText = 'berlin';
            const searchLower = searchText.toLowerCase();
            
            const filtered = testContracts.filter(c => {
                const searchableFields = [c.contractId, c.contractTitle, c.location];
                return searchableFields.some(field => 
                    field && String(field).toLowerCase().includes(searchLower)
                );
            });

            expect(filtered.length).toBe(2);
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
