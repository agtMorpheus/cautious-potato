/**
 * Core Unit Tests for Event Handlers Module (handlers.js)
 * Tests the core business logic handlers: Import, Generate, Export
 */

import {
  handleFileSelect,
  handleImportFile,
  handleGenerateAbrechnung,
  handleExportAbrechnung,
  handleExportProtokoll,
  showErrorAlert, // Used internally, we might want to spy on it or its effects
  showSuccessAlert
} from '../../js/handlers.js';

import * as state from '../../js/state.js';
import * as utils from '../../js/utils.js';
import * as utilsExcel from '../../js/utils-exceljs.js';
import * as cellMapper from '../../js/cell-mapper.js';
import * as utilsProtokoll from '../../js/utils-protokoll-export.js';

// Mock dependencies
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
  getPositionSummary: jest.fn(),
  sumByPosition: jest.fn(),
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

describe('Event Handlers Core Logic', () => {
  let mockFile;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset internal state of handlers module (selectedFile)
    handleFileSelect({ target: { files: [] } });

    // Reset DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="loading-spinner"></div>
      <button id="import-button"></button>
      <input type="file" id="file-input" />
      <span id="fileName"></span>
    `;

    // Mock console to keep output clean
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock file
    mockFile = new File(['dummy content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Setup default state mock
    state.getState.mockReturnValue({
      ui: {
        import: {},
        generate: {},
        export: {}
      },
      protokollData: {},
      abrechnungData: {}
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleImportFile', () => {
    beforeEach(() => {
      // Setup successful mocks for happy path
      utils.readExcelFile.mockResolvedValue({ workbook: {} });
      cellMapper.showCellMapperDialog.mockResolvedValue({ mapping: {} });
      utils.safeReadAndParseProtokoll.mockResolvedValue({
        success: true,
        metadata: { datum: '2023-01-01' },
        positionen: [],
        positionSums: {},
        warnings: []
      });
      utils.getPositionSummary.mockReturnValue({ uniquePositions: 5 });
    });

    test('should do nothing if no file selected', async () => {
      // Don't select a file via handleFileSelect

      await handleImportFile({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

      expect(utils.readExcelFile).not.toHaveBeenCalled();
    });

    test('should process file successfully', async () => {
      // Select file first
      handleFileSelect({ target: { files: [mockFile] } });

      await handleImportFile({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

      // Check sequence
      expect(state.setState).toHaveBeenCalled(); // Loading state
      expect(utils.readExcelFile).toHaveBeenCalledWith(mockFile);
      expect(cellMapper.showCellMapperDialog).toHaveBeenCalled();
      expect(cellMapper.applyMapping).toHaveBeenCalled();
      expect(utils.safeReadAndParseProtokoll).toHaveBeenCalledWith(mockFile);

      // Verify final state update
      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        protokollData: expect.anything(),
        ui: expect.objectContaining({
          import: expect.objectContaining({ status: 'success' })
        })
      }));
    });

    test('should handle user cancellation during cell mapping', async () => {
      handleFileSelect({ target: { files: [mockFile] } });

      // Mock cancellation (rejection)
      cellMapper.showCellMapperDialog.mockRejectedValue(new Error('Cancelled'));

      await handleImportFile({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

      expect(utils.readExcelFile).toHaveBeenCalled();
      expect(utils.safeReadAndParseProtokoll).not.toHaveBeenCalled();
      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        ui: expect.objectContaining({
          import: expect.objectContaining({ status: 'idle', message: 'Import abgebrochen' })
        })
      }));
    });

    test('should log warnings if import has warnings', async () => {
      handleFileSelect({ target: { files: [mockFile] } });

      utils.safeReadAndParseProtokoll.mockResolvedValue({
        success: true,
        metadata: {},
        positionen: [],
        positionSums: {},
        warnings: ['Test Warning']
      });

      await handleImportFile({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

      expect(console.warn).toHaveBeenCalledWith('Import warnings:', ['Test Warning']);
    });

    test('should handle parse errors', async () => {
      handleFileSelect({ target: { files: [mockFile] } });

      utils.safeReadAndParseProtokoll.mockResolvedValue({
        success: false,
        errors: ['Invalid format']
      });

      await handleImportFile({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        ui: expect.objectContaining({
          import: expect.objectContaining({ status: 'error' })
        })
      }));
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle exceptions', async () => {
      handleFileSelect({ target: { files: [mockFile] } });

      utils.readExcelFile.mockRejectedValue(new Error('Read failed'));

      await handleImportFile({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        ui: expect.objectContaining({
          import: expect.objectContaining({ status: 'error', message: expect.stringContaining('Read failed') })
        })
      }));
    });
  });

  describe('handleGenerateAbrechnung', () => {
    beforeEach(() => {
      state.getState.mockReturnValue({
        protokollData: {
          metadata: { datum: '2023-01-01', auftragsNr: '123' },
          positionen: [{ posNr: '1', menge: 1 }]
        },
        ui: {
            generate: {}
        }
      });

      utils.sumByPosition.mockReturnValue({ '1': 1 });
      utils.getPositionSummary.mockReturnValue({ uniquePositions: 1 });
      utils.createExportWorkbook.mockResolvedValue({ workbook: true });
      utils.validateFilledPositions.mockReturnValue({ valid: true });

      window._currentWorkbook = null;
    });

    test('should show error if no protokoll data', async () => {
      state.getState.mockReturnValue({ protokollData: null });

      await handleGenerateAbrechnung();

      expect(document.querySelector('.alert-error')).not.toBeNull();
      expect(utils.createExportWorkbook).not.toHaveBeenCalled();
    });

    test('should generate abrechnung successfully', async () => {
      await handleGenerateAbrechnung();

      expect(utils.sumByPosition).toHaveBeenCalled();
      expect(utils.createExportWorkbook).toHaveBeenCalled();

      // Verify state update
      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        abrechnungData: expect.anything(),
        ui: expect.objectContaining({
          generate: expect.objectContaining({ status: 'success' })
        })
      }));

      // Verify workbook stored in window
      expect(window._currentWorkbook).toBeDefined();
    });

    test('should handle generation errors', async () => {
      utils.createExportWorkbook.mockRejectedValue(new Error('Generation failed'));

      await handleGenerateAbrechnung();

      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        ui: expect.objectContaining({
          generate: expect.objectContaining({ status: 'error' })
        })
      }));
      expect(document.querySelector('.alert-error')).not.toBeNull();
    });
  });

  describe('handleExportAbrechnung', () => {
    beforeEach(() => {
      state.getState.mockReturnValue({
        abrechnungData: {
          header: { date: '2023-01-01' },
          positionen: { '1': 1 }
        },
        ui: {
            export: {}
        }
      });

      utilsExcel.createAndExportAbrechnungExcelJS.mockResolvedValue({
        fileName: 'export.xlsx',
        fileSize: 1000
      });
    });

    test('should show error if no abrechnung data', async () => {
      state.getState.mockReturnValue({ abrechnungData: null });

      await handleExportAbrechnung();

      expect(document.querySelector('.alert-error')).not.toBeNull();
      expect(utilsExcel.createAndExportAbrechnungExcelJS).not.toHaveBeenCalled();
    });

    test('should export successfully', async () => {
      await handleExportAbrechnung();

      expect(utilsExcel.createAndExportAbrechnungExcelJS).toHaveBeenCalled();

      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        ui: expect.objectContaining({
          export: expect.objectContaining({ status: 'success' })
        })
      }));
    });

    test('should handle export errors', async () => {
      utilsExcel.createAndExportAbrechnungExcelJS.mockRejectedValue(new Error('Export failed'));

      await handleExportAbrechnung();

      expect(state.setState).toHaveBeenCalledWith(expect.objectContaining({
        ui: expect.objectContaining({
          export: expect.objectContaining({ status: 'error' })
        })
      }));
      expect(document.querySelector('.alert-error')).not.toBeNull();
    });
  });

  describe('handleExportProtokoll', () => {
    const validProtokollData = {
      grunddaten: { auftraggeber: 'Client' },
      positionen: []
    };

    beforeEach(() => {
      utilsProtokoll.validateProtokollData.mockReturnValue({ valid: true, warnings: [] });
      utilsProtokoll.generateProtokollFilename.mockReturnValue('protokoll.xlsx');
      utilsProtokoll.createAndExportProtokoll.mockResolvedValue({ fileName: 'protokoll.xlsx' });
    });

    test('should error if no data provided', async () => {
      await handleExportProtokoll(null);

      expect(document.querySelector('.alert-error')).not.toBeNull();
      expect(utilsProtokoll.createAndExportProtokoll).not.toHaveBeenCalled();
    });

    test('should error if validation fails', async () => {
      utilsProtokoll.validateProtokollData.mockReturnValue({ valid: false, errors: ['Invalid data'] });

      await handleExportProtokoll(validProtokollData);

      expect(document.querySelector('.alert-error')).not.toBeNull();
      expect(utilsProtokoll.createAndExportProtokoll).not.toHaveBeenCalled();
    });

    test('should log warnings if validation has warnings', async () => {
      utilsProtokoll.validateProtokollData.mockReturnValue({ valid: true, warnings: ['Validation Warning'] });

      await handleExportProtokoll(validProtokollData);

      expect(console.warn).toHaveBeenCalledWith('Protokoll validation warnings:', ['Validation Warning']);
    });

    test('should export successfully', async () => {
      await handleExportProtokoll(validProtokollData);

      expect(utilsProtokoll.validateProtokollData).toHaveBeenCalledWith(validProtokollData);
      expect(utilsProtokoll.createAndExportProtokoll).toHaveBeenCalled();
      expect(document.querySelector('.alert-success')).not.toBeNull();
    });

    test('should handle export exception', async () => {
      utilsProtokoll.createAndExportProtokoll.mockRejectedValue(new Error('Write failed'));

      try {
        await handleExportProtokoll(validProtokollData);
      } catch (e) {
        expect(e.message).toBe('Write failed');
      }

      expect(document.querySelector('.alert-error')).not.toBeNull();
    });
  });
});
