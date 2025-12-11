/**
 * Integration Test: Full Workflow (handlers + state + utils interaction)
 * Validates the cross-module interactions from Import -> Generate -> Export
 */

import {
  handleFileSelect,
  handleImportFile,
  handleGenerateAbrechnung,
  handleExportAbrechnung,
  initializeEventListeners
} from '../../js/handlers.js';

import { getState, resetState } from '../../js/state.js';
import * as utils from '../../js/utils.js';
import * as cellMapper from '../../js/cell-mapper.js';
import * as utilsExcel from '../../js/utils-exceljs.js';

// Mock heavy utilities and UI dialogs
jest.mock('../../js/utils.js', () => {
  const originalUtils = jest.requireActual('../../js/utils.js');
  return {
    ...originalUtils,
    readExcelFile: jest.fn(),
    safeReadAndParseProtokoll: jest.fn(),
    createExportWorkbook: jest.fn(),
    // Keep original implementations for pure functions if possible
    sumByPosition: originalUtils.sumByPosition,
    getPositionSummary: originalUtils.getPositionSummary,
    validateFilledPositions: jest.fn() // mock this one as it might need workbook structure
  };
});

jest.mock('../../js/cell-mapper.js', () => ({
  showCellMapperDialog: jest.fn(),
  applyMapping: jest.fn()
}));

jest.mock('../../js/utils-exceljs.js', () => ({
  createAndExportAbrechnungExcelJS: jest.fn()
}));

// Mock LocalStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Workflow Integration Test', () => {

  beforeEach(() => {
    // Reset state and DOM
    resetState({ persist: false, silent: true });
    localStorageMock.clear();

    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="loading-spinner"></div>
      <button id="import-button"></button>
      <button id="generate-button"></button>
      <button id="export-button"></button>
      <input type="file" id="file-input" />
      <span id="fileName"></span>
    `;

    // Mocks setup
    jest.clearAllMocks();

    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default successful mocks
    utils.readExcelFile.mockResolvedValue({ workbook: {} });
    cellMapper.showCellMapperDialog.mockResolvedValue({ mapping: {} });

    // Sample parsed data
    utils.safeReadAndParseProtokoll.mockResolvedValue({
      success: true,
      metadata: {
        datum: '2023-01-01',
        auftragsNr: 'A-123',
        anlage: 'Plant 1',
        einsatzort: 'Location 1',
        firma: 'Company X'
      },
      positionen: [
        { posNr: '01.01.010', menge: 5 },
        { posNr: '01.01.010', menge: 3 }, // Duplicate pos to test aggregation
        { posNr: '02.02.020', menge: 10 }
      ],
      positionSums: {
        '01.01.010': 8,
        '02.02.020': 10
      },
      warnings: []
    });

    utils.createExportWorkbook.mockResolvedValue({ name: 'ExportWorkbook' });
    utils.validateFilledPositions.mockReturnValue({ valid: true });
    utilsExcel.createAndExportAbrechnungExcelJS.mockResolvedValue({
      fileName: 'abrechnung.xlsx',
      fileSize: 5000
    });
  });

  test('Complete Workflow: Import -> Generate -> Export', async () => {
    // 1. Initial State Check
    let state = getState();
    expect(state.protokollData.metadata.orderNumber).toBeNull();
    expect(state.ui.import.status).toBe('idle');

    // 2. File Selection
    const file = new File(['dummy'], 'protokoll.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    handleFileSelect({ target: { files: [file] } });

    // 3. Import
    await handleImportFile({ preventDefault: () => {}, stopPropagation: () => {} });

    // Verify State after Import
    state = getState();
    expect(state.ui.import.status).toBe('success');
    expect(state.protokollData.metadata.auftragsNr).toBe('A-123'); // From mocked parser
    expect(state.protokollData.positionen).toHaveLength(3);

    // Verify persistence happened
    expect(localStorageMock.setItem).toHaveBeenCalled();

    // 4. Generate
    await handleGenerateAbrechnung();

    // Verify State after Generate
    state = getState();
    expect(state.ui.generate.status).toBe('success');
    expect(state.abrechnungData.header.orderNumber).toBe('A-123');
    // Check if aggregation logic (via real sumByPosition or mocked return) worked
    // Since we mocked sumByPosition as "originalUtils.sumByPosition" if it was pure...
    // But in the mock factory above:
    // "sumByPosition: originalUtils.sumByPosition"
    // Wait, jest.mock factory cannot access out-of-scope variables easily.
    // `originalUtils` usage inside the factory needs `jest.requireActual`.
    // And I did that. So it should be the real function.
    // The real `sumByPosition` logic should have aggregated the positions.
    // However, `safeReadAndParseProtokoll` returns `positionSums` too.
    // Let's check what `handleGenerateAbrechnung` uses.
    // It calls `utils.sumByPosition(positionen)`.

    // Let's verify aggregation
    expect(state.abrechnungData.positionen['01.01.010']).toBe(8); // 5 + 3
    expect(state.abrechnungData.positionen['02.02.020']).toBe(10);
    expect(state.ui.generate.uniquePositionCount).toBe(2);

    // 5. Export
    await handleExportAbrechnung();

    // Verify State after Export
    state = getState();
    expect(state.ui.export.status).toBe('success');
    expect(utilsExcel.createAndExportAbrechnungExcelJS).toHaveBeenCalledWith(state.abrechnungData);
  });

  test('Integration: Generate fails if Import not done', async () => {
    // Attempt Generate without Import
    await handleGenerateAbrechnung();

    const alert = document.querySelector('.alert-error');
    expect(alert).not.toBeNull();
    expect(alert.innerHTML).toContain('Please import');

    const state = getState();
    expect(state.ui.generate.status).toBe('idle'); // Should not even start
  });

  test('Integration: Export fails if Generate not done', async () => {
    // Import first (to pass first check)
     const file = new File(['dummy'], 'protokoll.xlsx');
    handleFileSelect({ target: { files: [file] } });
    await handleImportFile({ preventDefault: () => {}, stopPropagation: () => {} });

    // Attempt Export without Generate
    await handleExportAbrechnung();

    const alert = document.querySelector('.alert-error');
    expect(alert).not.toBeNull();
    expect(alert.innerHTML).toContain('Please generate');
  });
});
