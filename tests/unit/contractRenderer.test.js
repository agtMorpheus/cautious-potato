/**
 * Unit Tests for Contract Renderer
 */
import {
    initializeContractUI,
    renderContractPreview,
    renderContractList,
    renderImportSummary,
    renderContractFilters,
    highlightPreviewRow
} from '../../js/contracts/contractRenderer.js';

import * as stateModule from '../../js/state.js';
import * as contractRepository from '../../js/contracts/contractRepository.js';
import * as contractUtils from '../../js/contracts/contractUtils.js';
import * as hrContractIntegration from '../../js/contracts/hrContractIntegration.js';

// Mock dependencies
jest.mock('../../js/state.js');
jest.mock('../../js/contracts/contractRepository.js');
jest.mock('../../js/contracts/contractUtils.js');
jest.mock('../../js/contracts/hrContractIntegration.js');
jest.mock('../../js/handlers.js', () => ({
    escapeHtml: (str) => str || ''
}));

describe('Contract Renderer', () => {
    let mockState;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup DOM
        document.body.innerHTML = `
            <div id="contract-import-status"></div>
            <div id="contract-import-message"></div>
            <div id="contract-import-progress"></div>
            <div id="contract-progress-container"></div>
            <button id="contract-import-button"></button>
            <div id="contract-import-errors"></div>
            <select id="contract-sheet-select"></select>
            <div id="contract-mapping-editor"></div>
            <div id="stat-total-contracts"></div>
            <div id="stat-unique-contract-ids"></div>
            <div id="stat-imported-files"></div>
            <div id="contract-status-breakdown"></div>
            <div id="contract-preview-container"></div>
            <div id="contract-preview-card"></div>
            <div id="contract-list-container"></div>
        `;

        // Mock State
        mockState = {
            contracts: {
                importState: {
                    status: 'idle',
                    message: 'Ready',
                    progress: 0,
                    currentSheet: null,
                    errors: []
                },
                rawSheets: {
                    'Sheet1': { rowCount: 10, columns: [{ letter: 'A', header: 'ID' }] }
                },
                currentMapping: {},
                records: [],
                filters: {},
                lastImportResult: null
            }
        };

        stateModule.getState.mockReturnValue(mockState);
        stateModule.subscribe.mockImplementation((callback) => {
            callback(mockState);
            return jest.fn();
        });

        // Mock Repository
        contractRepository.getContractStatistics.mockReturnValue({
            totalContracts: 0,
            uniqueContractIds: 0,
            totalImportedFiles: 0,
            byStatus: {}
        });
        contractRepository.getFilteredContracts.mockReturnValue([]);
        contractRepository.getUniqueFieldValues.mockReturnValue([]);

        // Mock Utils
        contractUtils.VALID_STATUS_VALUES = ['Active', 'Draft'];

        // Mock HR Integration
        hrContractIntegration.getAvailableWorkers.mockReturnValue([]);
        hrContractIntegration.isHrIntegrationAvailable.mockReturnValue(false);
    });

    describe('initializeContractUI', () => {
        it('should initialize and subscribe to state', () => {
            initializeContractUI();
            expect(stateModule.subscribe).toHaveBeenCalled();
            // Should update initial state (e.g. sheet selector)
            const selector = document.getElementById('contract-sheet-select');
            expect(selector.options.length).toBeGreaterThan(0);
        });
    });

    describe('renderContractList', () => {
        it('should render empty state when no contracts', () => {
            contractRepository.getFilteredContracts.mockReturnValue([]);
            renderContractList(mockState.contracts);
            const container = document.getElementById('contract-list-container');
            expect(container.innerHTML).toContain('Keine Verträge vorhanden');
        });

        it('should render contract table when contracts exist', () => {
            const contracts = [
                { id: '1', contractId: 'C1', status: 'Active' }
            ];
            contractRepository.getFilteredContracts.mockReturnValue(contracts);

            renderContractList(mockState.contracts);

            const container = document.getElementById('contract-list-container');
            expect(container.innerHTML).toContain('cm-contract-table');
            expect(container.innerHTML).toContain('C1');
        });
    });

    describe('renderContractPreview', () => {
        it('should hide preview when no result', () => {
            mockState.contracts.lastImportResult = null;
            renderContractPreview(mockState.contracts);
            const container = document.getElementById('contract-preview-container');
            expect(container.style.display).toBe('none');
        });

        it('should render preview table', () => {
            mockState.contracts.lastImportResult = {
                contracts: [{ contractId: 'P1', status: 'Draft' }],
                errors: [],
                warnings: [],
                summary: { successCount: 1, totalRows: 1 }
            };
            renderContractPreview(mockState.contracts);
            const container = document.getElementById('contract-preview-container');
            expect(container.style.display).toBe('block');
            expect(container.innerHTML).toContain('P1');
        });

        it('should render errors in preview', () => {
             mockState.contracts.lastImportResult = {
                contracts: [],
                errors: [{ rowIndex: 1, message: 'Bad data' }],
                warnings: [],
                summary: { successCount: 0, totalRows: 1 }
            };
            renderContractPreview(mockState.contracts);
            const container = document.getElementById('contract-preview-container');
            expect(container.innerHTML).toContain('Bad data');
        });
    });

    describe('renderImportSummary', () => {
        it('should generate summary HTML', () => {
            const result = {
                contracts: [{}],
                errors: [],
                warnings: []
            };
            contractUtils.getContractSummary = jest.fn().mockReturnValue({ uniqueContractIds: 1 });

            const html = renderImportSummary(result);
            expect(html).toContain('Import abgeschlossen');
            expect(html).toContain('Verträge importiert');
        });
    });

    describe('renderContractFilters', () => {
        it('should generate filter HTML', () => {
            const html = renderContractFilters();
            expect(html).toContain('filter-section');
            expect(html).toContain('contract-search-input');
        });
    });

    describe('highlightPreviewRow', () => {
        it('should highlight specific row', () => {
            // Setup a fake table
            document.body.innerHTML = `
                <table class="cm-preview-table">
                    <tbody>
                        <tr data-row-index="1"><td>1</td></tr>
                        <tr data-row-index="2"><td>2</td></tr>
                    </tbody>
                </table>
            `;

            // Mock scrollIntoView
            window.HTMLElement.prototype.scrollIntoView = jest.fn();

            highlightPreviewRow(2);

            const row2 = document.querySelector('tr[data-row-index="2"]');
            expect(row2.classList.contains('cm-row--highlight')).toBe(true);
            const row1 = document.querySelector('tr[data-row-index="1"]');
            expect(row1.classList.contains('cm-row--highlight')).toBe(false);
        });
    });
});
