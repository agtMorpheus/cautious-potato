/**
 * Integration Tests for Complete Workflows
 * Phase 6 Testing Framework
 */

// Mock dependencies
const mockXLSX = {
  read: jest.fn(),
  write: jest.fn(),
  writeFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn()
  }
};
global.XLSX = mockXLSX;

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock DOM elements
const mockDOM = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add: jest.fn(), remove: jest.fn() },
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};
global.document = mockDOM;

// Import modules
import { getState, setState, resetState } from '../../js/state.js';
import {
  readExcelFile,
  parseProtokoll,
  extractPositions,
  sumByPosition,
  createExportWorkbook
} from '../../js/utils.js';
import {
  handleImportFile,
  handleGenerateAbrechnung,
  handleExportAbrechnung,
  handleResetApplication
} from '../../js/handlers.js';

describe('End-to-End Workflow Integration', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset state
    resetState({ persist: false, silent: true });
    
    // Setup basic DOM mocks
    mockDOM.getElementById.mockImplementation((id) => {
      const mockElement = {
        textContent: '',
        innerHTML: '',
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
        disabled: false,
        files: []
      };
      
      if (id === 'file-input') {
        mockElement.files = [createMockFile()];
      }
      
      return mockElement;
    });
    
    mockDOM.querySelector.mockReturnValue({
      textContent: '',
      innerHTML: '',
      style: {},
      classList: { add: jest.fn(), remove: jest.fn() }
    });
  });

  describe('Complete Import → Generate → Export Workflow', () => {
    test('successful end-to-end workflow', async () => {
      // Setup mock data
      const mockFile = createMockFile();
      const mockWorkbook = createMockWorkbook();
      const mockPositions = createMockPositions();
      
      // Mock XLSX operations
      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      // Mock FileReader
      global.FileReader = jest.fn(() => ({
        readAsArrayBuffer: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: new ArrayBuffer(8) } });
          }, 0);
        }),
        onload: null,
        onerror: null
      }));
      
      // Mock fetch for template loading
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      });
      
      // Step 1: Import file
      console.log('🔄 Testing import workflow...');
      
      const importEvent = { target: { files: [mockFile] } };
      await handleImportFile(importEvent);
      
      let state = getState();
      expect(state.ui.import.status).toBe('success');
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.protokollData.positionen.length).toBeGreaterThan(0);
      
      // Step 2: Generate abrechnung
      console.log('🔄 Testing generate workflow...');
      
      await handleGenerateAbrechnung();
      
      state = getState();
      expect(state.ui.generate.status).toBe('success');
      expect(state.abrechnungData.positionen).toBeDefined();
      expect(Object.keys(state.abrechnungData.positionen).length).toBeGreaterThan(0);
      
      // Step 3: Export abrechnung
      console.log('🔄 Testing export workflow...');
      
      // Mock URL.createObjectURL and download
      global.URL = {
        createObjectURL: jest.fn(() => 'blob:mock-url'),
        revokeObjectURL: jest.fn()
      };
      
      await handleExportAbrechnung();
      
      state = getState();
      expect(state.ui.export.status).toBe('success');
      expect(state.ui.export.lastExportAt).toBeDefined();
      
      console.log('✅ Complete workflow test passed');
    });

    test('workflow maintains state integrity across steps', async () => {
      const testMetadata = {
        protocolNumber: 'PROT-001',
        orderNumber: 'ORD-001',
        plant: 'Factory A',
        location: 'Building 1',
        company: 'Test Company',
        date: '2025-12-11'
      };

      const testPositions = [
        { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
        { posNr: '01.01.0020', menge: 3, rowIndex: 31 }
      ];

      // Set initial state
      setState({ 
        protokollData: { 
          metadata: testMetadata, 
          positionen: testPositions 
        } 
      });

      // Verify state integrity
      let state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.protokollData.positionen).toHaveLength(2);

      // Perform aggregation
      const positionSums = sumByPosition(testPositions);
      setState({
        abrechnungData: {
          header: testMetadata,
          positionen: positionSums
        }
      });

      // Verify state still intact
      state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.abrechnungData.positionen['01.01.0010']).toBe(5);
      expect(state.abrechnungData.positionen['01.01.0020']).toBe(3);
    });

    test('workflow handles errors without corrupting state', async () => {
      const validMetadata = {
        protocolNumber: 'PROT-001',
        orderNumber: 'ORD-001'
      };

      setState({ protokollData: { metadata: validMetadata } });

      try {
        // Attempt invalid operation
        sumByPosition(null);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // State should still be valid
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
    });

    test('workflow persists data correctly', async () => {
      const testData = {
        protokollData: {
          metadata: { orderNumber: 'ORD-PERSIST' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        }
      };

      setState(testData, { persist: true });

      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'abrechnungAppState_v1',
        expect.stringContaining('ORD-PERSIST')
      );

      // Simulate page reload by resetting state and loading from storage
      resetState({ persist: false, silent: true });
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testData));
      
      // In real app, this would be called during initialization
      const loadedState = JSON.parse(localStorageMock.getItem('abrechnungAppState_v1'));
      setState(loadedState, { persist: false });

      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-PERSIST');
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('recovers from import failure without state corruption', async () => {
      const initialState = getState();

      // Mock FileReader to fail
      global.FileReader = jest.fn(() => ({
        readAsArrayBuffer: jest.fn(function() {
          setTimeout(() => {
            this.onerror(new Error('File read failed'));
          }, 0);
        }),
        onload: null,
        onerror: null
      }));

      const invalidFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' });
      const importEvent = { target: { files: [invalidFile] } };

      try {
        await handleImportFile(importEvent);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // State should be unchanged or show error status
      const currentState = getState();
      expect(currentState.ui.import.status).toBe('error');
      expect(currentState.protokollData.metadata).toEqual(initialState.protokollData.metadata);
    });

    test('can retry failed operation without manual reset', async () => {
      // First attempt fails
      const invalidFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' });
      const failEvent = { target: { files: [invalidFile] } };

      try {
        await handleImportFile(failEvent);
      } catch (error) {
        expect(error).toBeDefined();
      }

      let state = getState();
      expect(state.ui.import.status).toBe('error');

      // Second attempt should work
      const validFile = createMockFile();
      const mockWorkbook = createMockWorkbook();
      
      mockXLSX.read.mockReturnValue(mockWorkbook);
      
      global.FileReader = jest.fn(() => ({
        readAsArrayBuffer: jest.fn(function() {
          setTimeout(() => {
            this.onload({ target: { result: new ArrayBuffer(8) } });
          }, 0);
        }),
        onload: null,
        onerror: null
      }));

      const successEvent = { target: { files: [validFile] } };
      await handleImportFile(successEvent);

      state = getState();
      expect(state.ui.import.status).toBe('success');
    });

    test('handles missing template gracefully', async () => {
      // Setup state with valid data
      setState({
        protokollData: {
          metadata: { orderNumber: 'ORD-001' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        }
      });

      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Template not found'));

      try {
        await handleGenerateAbrechnung();
      } catch (error) {
        expect(error.message).toContain('Template not found');
      }

      const state = getState();
      expect(state.ui.generate.status).toBe('error');
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001'); // Original data preserved
    });

    test('handles export failures gracefully', async () => {
      // Setup state with generated data
      setState({
        abrechnungData: {
          header: { orderNumber: 'ORD-001' },
          positionen: { '01.01.0010': 5 }
        }
      });

      // Mock XLSX.write to fail
      mockXLSX.write.mockImplementation(() => {
        throw new Error('Export failed');
      });

      try {
        await handleExportAbrechnung();
      } catch (error) {
        expect(error.message).toContain('Export failed');
      }

      const state = getState();
      expect(state.ui.export.status).toBe('error');
      expect(state.abrechnungData.positionen['01.01.0010']).toBe(5); // Data preserved
    });
  });

  describe('Reset Functionality', () => {
    test('reset clears all data and UI state', async () => {
      // Setup state with data
      setState({
        protokollData: {
          metadata: { orderNumber: 'ORD-001' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        },
        abrechnungData: {
          header: { orderNumber: 'ORD-001' },
          positionen: { '01.01.0010': 5 }
        },
        ui: {
          import: { status: 'success', message: 'File imported' },
          generate: { status: 'success', message: 'Generated' },
          export: { status: 'success', message: 'Exported' }
        }
      });

      // Mock confirm dialog
      global.confirm = jest.fn(() => true);

      await handleResetApplication();

      const state = getState();
      expect(state.protokollData.metadata).toEqual({});
      expect(state.protokollData.positionen).toEqual([]);
      expect(state.abrechnungData.positionen).toEqual({});
      expect(state.ui.import.status).toBe('idle');
      expect(state.ui.generate.status).toBe('idle');
      expect(state.ui.export.status).toBe('idle');
    });

    test('reset cancellation preserves data', async () => {
      const originalData = {
        protokollData: {
          metadata: { orderNumber: 'ORD-001' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        }
      };

      setState(originalData);

      // Mock confirm dialog to return false (cancel)
      global.confirm = jest.fn(() => false);

      await handleResetApplication();

      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
    });
  });

  describe('Performance Integration Tests', () => {
    test('complete workflow with large dataset', async () => {
      const largePositions = Array.from({ length: 5000 }, (_, i) => ({
        posNr: `01.01.${String(i % 1000).padStart(4, '0')}`,
        menge: Math.floor(Math.random() * 10) + 1,
        rowIndex: 30 + i
      }));

      const startTime = performance.now();

      // Step 1: Set large dataset
      setState({
        protokollData: {
          metadata: { orderNumber: 'ORD-LARGE' },
          positionen: largePositions
        }
      });

      // Step 2: Aggregate positions
      const positionSums = sumByPosition(largePositions);

      // Step 3: Update state with aggregated data
      setState({
        abrechnungData: {
          header: { orderNumber: 'ORD-LARGE' },
          positionen: positionSums
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete large dataset processing in under 1 second
      expect(duration).toBeLessThan(1000);
      expect(Object.keys(positionSums)).toHaveLength(1000);

      console.log(`✅ Large dataset workflow completed in ${duration.toFixed(2)}ms`);
    });

    test('memory usage remains stable across multiple operations', async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      // Perform multiple workflow cycles
      for (let i = 0; i < 10; i++) {
        const positions = Array.from({ length: 100 }, (_, j) => ({
          posNr: `01.01.${String(j).padStart(4, '0')}`,
          menge: Math.floor(Math.random() * 10) + 1,
          rowIndex: 30 + j
        }));

        setState({
          protokollData: {
            metadata: { orderNumber: `ORD-${i}` },
            positionen: positions
          }
        });

        const sums = sumByPosition(positions);
        
        setState({
          abrechnungData: {
            header: { orderNumber: `ORD-${i}` },
            positionen: sums
          }
        });

        // Reset for next iteration
        resetState({ persist: false, silent: true });
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      if (performance.memory) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        console.log(`✅ Memory usage stable: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
      }
    });
  });

  describe('Concurrent Operations', () => {
    test('handles rapid state updates correctly', async () => {
      const updates = [];
      
      // Perform rapid state updates
      for (let i = 0; i < 50; i++) {
        updates.push(
          setState({
            protokollData: {
              metadata: { orderNumber: `ORD-${i}` }
            }
          }, { persist: false, silent: true })
        );
      }

      await Promise.all(updates);

      const finalState = getState();
      expect(finalState.protokollData.metadata.orderNumber).toMatch(/^ORD-\d+$/);
    });

    test('state listeners handle rapid changes', async () => {
      const listener = jest.fn();
      const unsubscribe = subscribe(listener);

      // Rapid state changes
      for (let i = 0; i < 20; i++) {
        setState({
          ui: { import: { status: i % 2 === 0 ? 'pending' : 'success' } }
        }, { persist: false });
      }

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(listener).toHaveBeenCalledTimes(20);
      unsubscribe();
    });
  });
});

// Helper functions
function createMockFile() {
  return new File(['mock excel content'], 'test-protokoll.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function createMockWorkbook() {
  return {
    SheetNames: ['Sheet1'],
    Sheets: {
      'Sheet1': {
        'U3': { v: 'PROT-001' },
        'N5': { v: 'ORD-001' },
        'A10': { v: 'Factory A' },
        'T10': { v: 'Building 1' },
        'T7': { v: 'Test Company' },
        'A30': { v: '01.01.0010' },
        'B30': { v: 5 },
        'A31': { v: '01.01.0020' },
        'B31': { v: 3 }
      }
    }
  };
}

function createMockPositions() {
  return [
    { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
    { posNr: '01.01.0020', menge: 3, rowIndex: 31 },
    { posNr: '01.01.0010', menge: 2, rowIndex: 32 }
  ];
}