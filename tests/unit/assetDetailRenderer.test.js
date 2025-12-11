/**
 * Unit Tests for Asset Detail Renderer
 */
import {
    init,
    showAssetDetail,
    hideAssetDetail,
    getCurrentAssetId,
    isDetailViewActive
} from '../../js/modules/assets/asset-detail-renderer.js';

import * as state from '../../js/modules/assets/asset-state.js';
import * as handlers from '../../js/modules/assets/asset-handlers.js';

jest.mock('../../js/modules/assets/asset-state.js');
jest.mock('../../js/modules/assets/asset-handlers.js');

describe('Asset Detail Renderer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = `
            <div id="assetContainer"></div>
        `;

        state.getAsset.mockReturnValue({
            id: '1',
            name: 'Test Asset',
            status: 'AKTIV',
            type: 'MOTOR',
            location: 'Hall A',
            plant: 'Werk 1',
            documents: [{ id: 'doc1', name: 'Doc 1', createdAt: '2023-01-01' }],
            contracts: [{ id: 'con1', title: 'Contract 1', contractId: 'C123' }],
            pictures: [{ id: 'pic1', name: 'Pic 1', url: 'img.jpg' }],
            protocols: [{ id: 'pro1', protokollNumber: 'PRO-1', datum: '2023-01-01', prüfungsergebnis: { keineMängelFestgestellt: true } }]
        });

        // Mock global document event listener for tab switching
        global.document.dispatchEvent = jest.fn();
    });

    describe('init', () => {
        it('should initialize event listeners', () => {
            const spy = jest.spyOn(document, 'addEventListener');
            init();
            expect(spy).toHaveBeenCalledWith('asset:showDetail', expect.any(Function));
            expect(spy).toHaveBeenCalledWith('asset:hideDetail', expect.any(Function));
            expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('showAssetDetail', () => {
        it('should render detail view', () => {
            showAssetDetail('1');
            const container = document.getElementById('assetContainer');
            expect(container.innerHTML).toContain('Test Asset');
            expect(container.innerHTML).toContain('overview');
            expect(getCurrentAssetId()).toBe('1');
            expect(isDetailViewActive()).toBe(true);
        });

        it('should show error if asset not found', () => {
            state.getAsset.mockReturnValue(null);
            showAssetDetail('999');
            expect(document.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
            const event = document.dispatchEvent.mock.calls[0][0];
            expect(event.type).toBe('asset:message');
            expect(event.detail.type).toBe('error');
        });
    });

    describe('hideAssetDetail', () => {
        it('should reset state and dispatch event', () => {
            showAssetDetail('1');
            hideAssetDetail();
            expect(getCurrentAssetId()).toBeNull();
            expect(isDetailViewActive()).toBe(false);
            expect(document.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        });
    });

    describe('Tab Navigation', () => {
        it('should switch tabs', () => {
            showAssetDetail('1');

            // Simulate click on Documents tab
            const docTabBtn = document.querySelector('[data-tab="documents"]');
            docTabBtn.click();

            const content = document.getElementById('assetTabContent');
            expect(content.innerHTML).toContain('Dokumente');
            expect(content.innerHTML).toContain('Doc 1');
        });

        it('should render Contracts tab', () => {
            showAssetDetail('1');
            const btn = document.querySelector('[data-tab="contracts"]');
            btn.click();
            const content = document.getElementById('assetTabContent');
            expect(content.innerHTML).toContain('Verträge');
            expect(content.innerHTML).toContain('Contract 1');
        });

        it('should render Photos tab', () => {
            showAssetDetail('1');
            const btn = document.querySelector('[data-tab="photos"]');
            btn.click();
            const content = document.getElementById('assetTabContent');
            expect(content.innerHTML).toContain('Fotos');
            expect(content.innerHTML).toContain('Pic 1');
        });

        it('should render Protocols tab', () => {
            showAssetDetail('1');
            const btn = document.querySelector('[data-tab="protocols"]');
            btn.click();
            const content = document.getElementById('assetTabContent');
            expect(content.innerHTML).toContain('Protokolle');
            expect(content.innerHTML).toContain('PRO-1');
        });
    });

    describe('Action Handling', () => {
        it('should handle back-to-list action', () => {
            showAssetDetail('1');
            const backBtn = document.querySelector('[data-asset-action="back-to-list"]');
            backBtn.click();
            expect(getCurrentAssetId()).toBeNull();
        });

        it('should handle create-protocol action', () => {
            showAssetDetail('1');
            const createBtn = document.querySelector('[data-asset-action="create-protocol"]');
            createBtn.click();
            expect(handlers.handleCreateProtocolFromAsset).toHaveBeenCalledWith('1');
        });
    });
});
