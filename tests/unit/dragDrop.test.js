import { setupDragAndDrop, setupClickAndKeyboard } from '../../js/handlers.js';

// Mock dependencies of handlers.js to prevent side effects during import
jest.mock('../../js/state.js', () => ({
    getState: jest.fn(),
    setState: jest.fn(),
    resetState: jest.fn(),
    clearPersistedState: jest.fn(),
    setImportStatus: jest.fn(),
    setGenerateStatus: jest.fn(),
    setExportStatus: jest.fn(),
    updateProtokollData: jest.fn(),
    updateAbrechnungPositions: jest.fn(),
    updateAbrechnungHeader: jest.fn(),
    subscribe: jest.fn()
}));

jest.mock('../../js/utils.js', () => ({
    readExcelFile: jest.fn(),
    safeReadAndParseProtokoll: jest.fn(),
    sumByPosition: jest.fn(),
    getPositionSummary: jest.fn(),
    createExportWorkbook: jest.fn(),
    validateFilledPositions: jest.fn()
}));

jest.mock('../../js/utils-exceljs.js', () => ({
    createAndExportAbrechnungExcelJS: jest.fn()
}));

jest.mock('../../js/cell-mapper.js', () => ({
    showCellMapperDialog: jest.fn(),
    applyMapping: jest.fn()
}));

jest.mock('../../js/utils-protokoll-export.js', () => ({
    createAndExportProtokoll: jest.fn(),
    validateProtokollData: jest.fn(),
    generateProtokollFilename: jest.fn()
}));

describe('Drag and Drop UX', () => {
    let dropZone;
    let fileInput;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="drop-zone" class="file-upload-area"></div>
            <input type="file" id="file-input" />
        `;
        dropZone = document.getElementById('drop-zone');
        fileInput = document.getElementById('file-input');

        // Mock click
        fileInput.click = jest.fn();
    });

    test('setupDragAndDrop adds visual feedback listeners', () => {
        setupDragAndDrop('drop-zone', 'file-input');

        // Test highlight on dragenter
        const dragEnter = new Event('dragenter');
        dropZone.dispatchEvent(dragEnter);
        expect(dropZone.classList.contains('drag-over')).toBe(true);

        // Test unhighlight on dragleave
        const dragLeave = new Event('dragleave');
        dropZone.dispatchEvent(dragLeave);
        expect(dropZone.classList.contains('drag-over')).toBe(false);
    });

    test('setupClickAndKeyboard adds accessibility attributes', () => {
        setupClickAndKeyboard('drop-zone', 'file-input');

        expect(dropZone.getAttribute('tabindex')).toBe('0');
        expect(dropZone.getAttribute('role')).toBe('button');
        expect(dropZone.getAttribute('aria-label')).toBeTruthy();
    });

    test('setupClickAndKeyboard handles click', () => {
        setupClickAndKeyboard('drop-zone', 'file-input');

        dropZone.click();
        expect(fileInput.click).toHaveBeenCalled();
    });

    test('setupClickAndKeyboard handles Enter key', () => {
        setupClickAndKeyboard('drop-zone', 'file-input');

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        dropZone.dispatchEvent(event);
        expect(fileInput.click).toHaveBeenCalled();
    });
});
