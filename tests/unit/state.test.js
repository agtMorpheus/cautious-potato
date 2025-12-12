/**
 * Unit Tests for State Management (state.js)
 * Phase 6 Testing Framework
 */

// Use the localStorage mock from setup.js (don't create a new one)
// The setup.js already mocks global.localStorage

// Import modules to test
import { 
  getState, 
  setState, 
  resetState, 
  subscribe, 
  unsubscribe,
  clearPersistedState,
  loadStateFromStorage,
  setImportStatus,
  setGenerateStatus,
  setExportStatus,
  updateProtokollData,
  updateAbrechnungPositions,
  updateAbrechnungHeader,
  addContractFile,
  setContracts,
  addContracts,
  setContractFilters,
  resetContractFilters,
  setContractImportState,
  setContractRawSheets,
  setContractMapping,
  clearContracts,
  setLastImportResult,
  setContractUIState,
  clearState,
  loadState,
  saveState,
  debugState
} from '../../js/state.js';

describe('State Management (state.js)', () => {
  beforeEach(() => {
    // Clear localStorage mock and reset state before each test
    global.localStorage.getItem.mockClear();
    global.localStorage.setItem.mockClear();
    global.localStorage.removeItem.mockClear();
    global.localStorage.clear.mockClear();
    
    resetState({ persist: false, silent: true });
  });

  describe('getState()', () => {
    test('returns initial state with expected structure', () => {
      const state = getState();
      
      expect(state).toHaveProperty('protokollData');
      expect(state).toHaveProperty('abrechnungData');
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('meta');
      
      // Check nested structure
      expect(state.protokollData).toHaveProperty('metadata');
      expect(state.protokollData).toHaveProperty('positionen');
      expect(state.ui).toHaveProperty('import');
      expect(state.ui).toHaveProperty('generate');
      expect(state.ui).toHaveProperty('export');
    });

    test('returns defensive copy (not same reference)', () => {
      const state1 = getState();
      const state2 = getState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects
      
      // Modifying returned state should not affect internal state
      state1.protokollData.metadata.orderNumber = 'MODIFIED';
      const state3 = getState();
      expect(state3.protokollData.metadata.orderNumber).not.toBe('MODIFIED');
    });

    test('initial UI status is idle', () => {
      const state = getState();
      expect(state.ui.import.status).toBe('idle');
      expect(state.ui.generate.status).toBe('idle');
      expect(state.ui.export.status).toBe('idle');
    });
  });

  describe('setState()', () => {
    test('updates state with new values', () => {
      const newData = { 
        protokollData: { 
          metadata: { orderNumber: 'ORD-001', protocolNumber: 'PROT-001' } 
        } 
      };
      
      setState(newData);
      const state = getState();
      
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.protokollData.metadata.protocolNumber).toBe('PROT-001');
    });

    test('merges new state with existing state (deep merge)', () => {
      // First update
      setState({ 
        protokollData: { metadata: { orderNumber: 'ORD-001' } } 
      });
      
      // Second update should merge, not replace
      setState({ 
        ui: { import: { status: 'success', message: 'File imported' } } 
      });
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.ui.import.status).toBe('success');
      expect(state.ui.import.message).toBe('File imported');
    });

    test('triggers stateChanged event listeners', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      const testData = { protokollData: { metadata: { orderNumber: 'ORD-001' } } };
      setState(testData);
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        protokollData: expect.objectContaining({
          metadata: expect.objectContaining({ orderNumber: 'ORD-001' })
        })
      }));
    });

    test('persists state to localStorage by default', () => {
      const testData = { protokollData: { metadata: { orderNumber: 'ORD-001' } } };
      setState(testData);
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'abrechnungAppState_v1',
        expect.stringContaining('ORD-001')
      );
    });

    test('skips persistence when persist option is false', () => {
      const testData = { protokollData: { metadata: { orderNumber: 'ORD-001' } } };
      setState(testData, { persist: false });
      
      expect(global.localStorage.setItem).not.toHaveBeenCalled();
    });

    test('skips listeners when silent option is true', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      setState({ ui: { import: { status: 'success' } } }, { silent: true });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('updates meta.lastUpdated timestamp', () => {
      const beforeTime = Date.now();
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      const afterTime = Date.now();
      
      const state = getState();
      expect(state.meta.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
      expect(state.meta.lastUpdated).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('subscribe() and unsubscribe()', () => {
    test('registers multiple listeners and calls all on state change', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      subscribe(listener1);
      subscribe(listener2);
      
      setState({ ui: { import: { status: 'success' } } });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    test('listener receives updated state', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      const testData = { protokollData: { metadata: { orderNumber: 'TEST-001' } } };
      setState(testData);
      
      const callArg = listener.mock.calls[0][0];
      expect(callArg.protokollData.metadata.orderNumber).toBe('TEST-001');
    });

    test('unsubscribe removes specific listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      subscribe(listener1);
      const unsubscribe2 = subscribe(listener2);
      
      // Unsubscribe listener2
      unsubscribe2();
      
      setState({ ui: { import: { status: 'success' } } });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });

    test('unsubscribe function works correctly', () => {
      const listener = jest.fn();
      const unsubscribeFn = subscribe(listener);
      
      setState({ ui: { import: { status: 'pending' } } });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribeFn();
      
      setState({ ui: { import: { status: 'success' } } });
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('resetState()', () => {
    test('clears all state back to initial values', () => {
      // Set some data first
      setState({ 
        protokollData: { 
          metadata: { orderNumber: 'ORD-001' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        },
        ui: { import: { status: 'success', message: 'File imported' } }
      });
      
      resetState({ persist: false });
      
      const state = getState();
      expect(state.protokollData.metadata).toEqual({
        protocolNumber: null,
        orderNumber: null,
        plant: null,
        location: null,
        company: null,
        date: null
      });
      expect(state.protokollData.positionen).toEqual([]);
      expect(state.ui.import.status).toBe('idle');
      expect(state.ui.import.message).toBe('');
    });

    test('clears localStorage when persist option is true', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      
      resetState({ persist: true });
      
      // resetState saves the initial state, not removes it
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'abrechnungAppState_v1',
        expect.any(String)
      );
    });

    test('triggers listeners unless silent option is true', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      resetState({ persist: false, silent: false });
      expect(listener).toHaveBeenCalled();
      
      listener.mockClear();
      resetState({ persist: false, silent: true });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('loadStateFromStorage()', () => {
    test('loads persisted state from localStorage', () => {
      const testState = { 
        protokollData: { 
          metadata: { orderNumber: 'STORED-001' },
          positionen: []
        },
        abrechnungData: {
          header: {},
          positionen: {}
        },
        ui: { 
          import: { status: 'success' },
          generate: { status: 'idle' },
          export: { status: 'idle' }
        },
        meta: {
          version: '1.0.0',
          lastUpdated: Date.now()
        }
      };
      
      global.localStorage.getItem.mockReturnValue(JSON.stringify(testState));
      
      const loaded = loadStateFromStorage();
      expect(loaded.protokollData.metadata.orderNumber).toBe('STORED-001');
      expect(loaded.ui.import.status).toBe('success');
    });

    test('returns initial state if localStorage is empty', () => {
      global.localStorage.getItem.mockReturnValue(null);
      
      const loaded = loadStateFromStorage();
      // Should return initial state with all required keys
      expect(loaded.protokollData).toBeDefined();
      expect(loaded.abrechnungData).toBeDefined();
      expect(loaded.ui).toBeDefined();
      expect(loaded.meta).toBeDefined();
    });

    test('handles corrupted JSON gracefully', () => {
      global.localStorage.getItem.mockReturnValue('invalid json {');
      
      const loaded = loadStateFromStorage();
      // Should fall back to initial state when JSON parsing fails
      expect(loaded.protokollData).toBeDefined();
      expect(loaded.meta.version).toBe('1.0.0');
    });

    test('handles non-string values gracefully', () => {
      global.localStorage.getItem.mockReturnValue(undefined);
      
      const loaded = loadStateFromStorage();
      // Should fall back to initial state
      expect(loaded.protokollData).toBeDefined();
      expect(loaded.meta.version).toBe('1.0.0');
    });
  });

  describe('clearPersistedState()', () => {
    test('removes state from localStorage', () => {
      clearPersistedState();
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('abrechnungAppState_v1');
    });
  });

  describe('Error Handling', () => {
    test('handles localStorage errors gracefully', () => {
      global.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw error
      expect(() => {
        setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      }).not.toThrow();
    });

    test('handles listener errors gracefully', () => {
      const goodListener = jest.fn();
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      subscribe(goodListener);
      subscribe(badListener);
      
      // Should not prevent other listeners from running
      expect(() => {
        setState({ ui: { import: { status: 'success' } } });
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('State Validation', () => {
    test('validates metadata structure', () => {
      const validMetadata = {
        protocolNumber: 'PROT-001',
        orderNumber: 'ORD-001',
        plant: 'Factory A',
        location: 'Building 1',
        company: 'Test Company',
        date: '2025-12-11'
      };
      
      setState({ protokollData: { metadata: validMetadata } });
      const state = getState();
      
      expect(state.protokollData.metadata).toEqual(validMetadata);
    });

    test('handles empty position arrays', () => {
      setState({ protokollData: { positionen: [] } });
      const state = getState();
      
      expect(Array.isArray(state.protokollData.positionen)).toBe(true);
      expect(state.protokollData.positionen.length).toBe(0);
    });

    test('preserves position structure', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
        { posNr: '01.01.0020', menge: 3, rowIndex: 31 }
      ];
      
      setState({ protokollData: { positionen: positions } });
      const state = getState();
      
      expect(state.protokollData.positionen).toEqual(positions);
      expect(state.protokollData.positionen[0]).toHaveProperty('posNr');
      expect(state.protokollData.positionen[0]).toHaveProperty('menge');
      expect(state.protokollData.positionen[0]).toHaveProperty('rowIndex');
    });
  });

  describe('Performance', () => {
    test('state updates complete quickly', () => {
      const startTime = performance.now();
      
      // Perform multiple state updates
      for (let i = 0; i < 100; i++) {
        setState({ 
          protokollData: { metadata: { orderNumber: `ORD-${i}` } } 
        }, { persist: false, silent: true });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 updates in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('large state objects are handled efficiently', () => {
      const largePositions = Array.from({ length: 1000 }, (_, i) => ({
        posNr: `01.01.${String(i).padStart(4, '0')}`,
        menge: Math.floor(Math.random() * 100),
        rowIndex: 30 + i
      }));
      
      const startTime = performance.now();
      setState({ protokollData: { positionen: largePositions } }, { persist: false });
      const endTime = performance.now();
      
      // Should handle 1000 positions in under 50ms
      expect(endTime - startTime).toBeLessThan(50);
      
      const state = getState();
      expect(state.protokollData.positionen.length).toBe(1000);
    });
  });

  // ============================================================
  // Domain-Specific Helper Function Tests
  // ============================================================

  describe('setImportStatus()', () => {
    test('updates import status fields', () => {
      setImportStatus({
        status: 'pending',
        message: 'Importing file...',
        fileName: 'test.xlsx',
        fileSize: 1024
      });
      
      const state = getState();
      expect(state.ui.import.status).toBe('pending');
      expect(state.ui.import.message).toBe('Importing file...');
      expect(state.ui.import.fileName).toBe('test.xlsx');
      expect(state.ui.import.fileSize).toBe(1024);
    });

    test('partially updates import status', () => {
      setImportStatus({ status: 'success', message: 'Done' });
      setImportStatus({ message: 'Updated message' });
      
      const state = getState();
      expect(state.ui.import.status).toBe('success');
      expect(state.ui.import.message).toBe('Updated message');
    });

    test('preserves other UI fields', () => {
      setState({ ui: { generate: { status: 'success' }, export: { status: 'success' } } });
      setImportStatus({ status: 'pending' });
      
      const state = getState();
      expect(state.ui.generate.status).toBe('success');
      expect(state.ui.export.status).toBe('success');
    });
  });

  describe('setGenerateStatus()', () => {
    test('updates generate status fields', () => {
      setGenerateStatus({
        status: 'pending',
        message: 'Generating...',
        positionCount: 10,
        uniquePositionCount: 5,
        generationTimeMs: 150
      });
      
      const state = getState();
      expect(state.ui.generate.status).toBe('pending');
      expect(state.ui.generate.message).toBe('Generating...');
      expect(state.ui.generate.positionCount).toBe(10);
      expect(state.ui.generate.uniquePositionCount).toBe(5);
      expect(state.ui.generate.generationTimeMs).toBe(150);
    });

    test('partially updates generate status', () => {
      setGenerateStatus({ status: 'success' });
      setGenerateStatus({ positionCount: 20 });
      
      const state = getState();
      expect(state.ui.generate.status).toBe('success');
      expect(state.ui.generate.positionCount).toBe(20);
    });
  });

  describe('setExportStatus()', () => {
    test('updates export status fields', () => {
      const exportTime = new Date().toISOString();
      setExportStatus({
        status: 'success',
        message: 'Export completed',
        lastExportAt: exportTime,
        lastExportSize: 2048
      });
      
      const state = getState();
      expect(state.ui.export.status).toBe('success');
      expect(state.ui.export.message).toBe('Export completed');
      expect(state.ui.export.lastExportAt).toBe(exportTime);
      expect(state.ui.export.lastExportSize).toBe(2048);
    });

    test('handles error status', () => {
      setExportStatus({ status: 'error', message: 'Export failed' });
      
      const state = getState();
      expect(state.ui.export.status).toBe('error');
      expect(state.ui.export.message).toBe('Export failed');
    });
  });

  describe('updateProtokollData()', () => {
    test('updates metadata', () => {
      updateProtokollData({
        metadata: {
          protocolNumber: 'PROT-001',
          orderNumber: 'ORD-123',
          plant: 'Factory A',
          location: 'Building 1'
        }
      });
      
      const state = getState();
      expect(state.protokollData.metadata.protocolNumber).toBe('PROT-001');
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-123');
      expect(state.protokollData.metadata.plant).toBe('Factory A');
      expect(state.protokollData.metadata.location).toBe('Building 1');
    });

    test('updates positionen', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5 },
        { posNr: '01.01.0020', menge: 3 }
      ];
      updateProtokollData({ positionen: positions });
      
      const state = getState();
      expect(state.protokollData.positionen).toEqual(positions);
    });

    test('preserves existing positionen when only updating metadata', () => {
      const positions = [{ posNr: '01.01.0010', menge: 5 }];
      updateProtokollData({ positionen: positions });
      updateProtokollData({ metadata: { orderNumber: 'NEW-ORDER' } });
      
      const state = getState();
      expect(state.protokollData.positionen).toEqual(positions);
      expect(state.protokollData.metadata.orderNumber).toBe('NEW-ORDER');
    });
  });

  describe('updateAbrechnungPositions()', () => {
    test('updates positionen map', () => {
      const positionMap = {
        '01.01.0010': 10,
        '01.01.0020': 5
      };
      updateAbrechnungPositions(positionMap);
      
      const state = getState();
      expect(state.abrechnungData.positionen).toEqual(positionMap);
    });

    test('replaces entire position map', () => {
      updateAbrechnungPositions({ '01.01.0010': 10 });
      updateAbrechnungPositions({ '02.02.0020': 20 });
      
      const state = getState();
      expect(state.abrechnungData.positionen).toEqual({ '02.02.0020': 20 });
    });

    test('preserves header data', () => {
      setState({ abrechnungData: { header: { date: '2025-01-01' } } });
      updateAbrechnungPositions({ '01.01.0010': 10 });
      
      const state = getState();
      expect(state.abrechnungData.header.date).toBe('2025-01-01');
    });
  });

  describe('updateAbrechnungHeader()', () => {
    test('updates header fields', () => {
      updateAbrechnungHeader({
        date: '2025-12-11',
        orderNumber: 'ORD-001',
        plant: 'Factory A',
        location: 'Building 1'
      });
      
      const state = getState();
      expect(state.abrechnungData.header.date).toBe('2025-12-11');
      expect(state.abrechnungData.header.orderNumber).toBe('ORD-001');
      expect(state.abrechnungData.header.plant).toBe('Factory A');
      expect(state.abrechnungData.header.location).toBe('Building 1');
    });

    test('partially updates header', () => {
      updateAbrechnungHeader({ date: '2025-01-01', orderNumber: 'ORD-001' });
      updateAbrechnungHeader({ date: '2025-12-11' });
      
      const state = getState();
      expect(state.abrechnungData.header.date).toBe('2025-12-11');
      expect(state.abrechnungData.header.orderNumber).toBe('ORD-001');
    });
  });

  // ============================================================
  // Contract Management Helper Function Tests
  // ============================================================

  describe('addContractFile()', () => {
    test('adds file to importedFiles array', () => {
      addContractFile({
        fileName: 'contracts.xlsx',
        size: 1024,
        sheets: ['Sheet1', 'Sheet2'],
        recordsImported: 100,
        recordsWithErrors: 2
      });
      
      const state = getState();
      expect(state.contracts.importedFiles).toHaveLength(1);
      expect(state.contracts.importedFiles[0].fileName).toBe('contracts.xlsx');
      expect(state.contracts.importedFiles[0].size).toBe(1024);
      expect(state.contracts.importedFiles[0].importedAt).toBeDefined();
    });

    test('appends to existing files', () => {
      addContractFile({ fileName: 'file1.xlsx', size: 1024 });
      addContractFile({ fileName: 'file2.xlsx', size: 2048 });
      
      const state = getState();
      expect(state.contracts.importedFiles).toHaveLength(2);
      expect(state.contracts.importedFiles[0].fileName).toBe('file1.xlsx');
      expect(state.contracts.importedFiles[1].fileName).toBe('file2.xlsx');
    });
  });

  describe('setContracts()', () => {
    test('sets contract records array', () => {
      const contracts = [
        { contractId: 'C001', status: 'Active' },
        { contractId: 'C002', status: 'Pending' }
      ];
      setContracts(contracts);
      
      const state = getState();
      expect(state.contracts.records).toEqual(contracts);
    });

    test('replaces existing records', () => {
      setContracts([{ contractId: 'C001' }]);
      setContracts([{ contractId: 'C002' }]);
      
      const state = getState();
      expect(state.contracts.records).toHaveLength(1);
      expect(state.contracts.records[0].contractId).toBe('C002');
    });

    test('handles null input', () => {
      setContracts(null);
      
      const state = getState();
      expect(state.contracts.records).toEqual([]);
    });
  });

  describe('addContracts()', () => {
    test('appends new contracts to existing records', () => {
      setContracts([{ contractId: 'C001' }]);
      addContracts([{ contractId: 'C002' }, { contractId: 'C003' }]);
      
      const state = getState();
      expect(state.contracts.records).toHaveLength(3);
    });

    test('works with empty existing records', () => {
      addContracts([{ contractId: 'C001' }]);
      
      const state = getState();
      expect(state.contracts.records).toHaveLength(1);
    });
  });

  describe('setContractFilters()', () => {
    test('updates filter values', () => {
      setContractFilters({
        contractId: 'C001',
        status: 'Active',
        location: 'Building A',
        searchText: 'test'
      });
      
      const state = getState();
      expect(state.contracts.filters.contractId).toBe('C001');
      expect(state.contracts.filters.status).toBe('Active');
      expect(state.contracts.filters.location).toBe('Building A');
      expect(state.contracts.filters.searchText).toBe('test');
    });

    test('partially updates filters', () => {
      setContractFilters({ status: 'Active' });
      setContractFilters({ location: 'Building B' });
      
      const state = getState();
      expect(state.contracts.filters.status).toBe('Active');
      expect(state.contracts.filters.location).toBe('Building B');
    });

    test('updates date range filter', () => {
      setContractFilters({
        dateRange: { from: '2025-01-01', to: '2025-12-31' }
      });
      
      const state = getState();
      expect(state.contracts.filters.dateRange.from).toBe('2025-01-01');
      expect(state.contracts.filters.dateRange.to).toBe('2025-12-31');
    });
  });

  describe('resetContractFilters()', () => {
    test('resets all filters to defaults', () => {
      setContractFilters({
        contractId: 'C001',
        status: 'Active',
        location: 'Building A',
        searchText: 'test',
        dateRange: { from: '2025-01-01', to: '2025-12-31' }
      });
      
      resetContractFilters();
      
      const state = getState();
      expect(state.contracts.filters.contractId).toBeNull();
      expect(state.contracts.filters.status).toBeNull();
      expect(state.contracts.filters.location).toBeNull();
      expect(state.contracts.filters.searchText).toBe('');
      expect(state.contracts.filters.dateRange).toEqual({ from: null, to: null });
    });
  });

  describe('setContractImportState()', () => {
    test('updates import state fields', () => {
      setContractImportState({
        isImporting: true,
        currentFile: 'test.xlsx',
        progress: 50,
        status: 'pending',
        message: 'Importing...'
      });
      
      const state = getState();
      expect(state.contracts.importState.isImporting).toBe(true);
      expect(state.contracts.importState.currentFile).toBe('test.xlsx');
      expect(state.contracts.importState.progress).toBe(50);
      expect(state.contracts.importState.status).toBe('pending');
    });

    test('handles error state', () => {
      setContractImportState({
        status: 'error',
        message: 'Import failed',
        errors: ['Error 1', 'Error 2']
      });
      
      const state = getState();
      expect(state.contracts.importState.status).toBe('error');
      expect(state.contracts.importState.errors).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('setContractRawSheets()', () => {
    test('sets discovered sheets', () => {
      const sheets = {
        'Sheet1': { sheetName: 'Sheet1', rowCount: 100, columns: ['A', 'B', 'C'] },
        'Sheet2': { sheetName: 'Sheet2', rowCount: 50, columns: ['A', 'B'] }
      };
      setContractRawSheets(sheets);
      
      const state = getState();
      expect(state.contracts.rawSheets).toEqual(sheets);
    });

    test('handles null input', () => {
      setContractRawSheets(null);
      
      const state = getState();
      expect(state.contracts.rawSheets).toEqual({});
    });
  });

  describe('setContractMapping()', () => {
    test('sets column mapping', () => {
      const mapping = {
        contractId: { excelColumn: 'A', type: 'string', required: true },
        status: { excelColumn: 'B', type: 'string', required: true }
      };
      setContractMapping(mapping);
      
      const state = getState();
      expect(state.contracts.currentMapping).toEqual(mapping);
    });

    test('handles null input', () => {
      setContractMapping(null);
      
      const state = getState();
      expect(state.contracts.currentMapping).toEqual({});
    });
  });

  describe('clearContracts()', () => {
    test('resets all contract-related state', () => {
      addContractFile({ fileName: 'test.xlsx', size: 1024 });
      setContracts([{ contractId: 'C001' }]);
      setContractFilters({ status: 'Active' });
      setContractImportState({ isImporting: true });
      
      clearContracts();
      
      const state = getState();
      expect(state.contracts.importedFiles).toEqual([]);
      expect(state.contracts.records).toEqual([]);
      expect(state.contracts.rawSheets).toEqual({});
      expect(state.contracts.currentMapping).toEqual({});
      expect(state.contracts.filters.status).toBeNull();
      expect(state.contracts.importState.isImporting).toBe(false);
      expect(state.contracts.importState.status).toBe('idle');
    });
  });

  describe('setLastImportResult()', () => {
    test('sets last import result', () => {
      const result = {
        contracts: [{ contractId: 'C001' }],
        errors: ['Error 1'],
        warnings: ['Warning 1'],
        summary: { total: 1, imported: 1, errors: 1 }
      };
      setLastImportResult(result);
      
      const state = getState();
      expect(state.contracts.lastImportResult).toEqual(result);
    });

    test('handles null result', () => {
      setLastImportResult({ summary: { total: 1 } });
      setLastImportResult(null);
      
      const state = getState();
      expect(state.contracts.lastImportResult).toBeNull();
    });
  });

  describe('setContractUIState()', () => {
    test('updates UI state fields', () => {
      setContractUIState({
        activeTab: 'list',
        sortKey: 'status',
        sortDir: 'desc'
      });
      
      const state = getState();
      expect(state.contracts.ui.activeTab).toBe('list');
      expect(state.contracts.ui.sortKey).toBe('status');
      expect(state.contracts.ui.sortDir).toBe('desc');
    });

    test('partially updates UI state', () => {
      setContractUIState({ activeTab: 'preview' });
      setContractUIState({ sortKey: 'contractId' });
      
      const state = getState();
      expect(state.contracts.ui.activeTab).toBe('preview');
      expect(state.contracts.ui.sortKey).toBe('contractId');
    });
  });

  // ============================================================
  // Legacy Compatibility Function Tests
  // ============================================================

  describe('clearState() (legacy)', () => {
    test('clears state and storage', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      
      clearState();
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBeNull();
      expect(global.localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('loadState() (legacy)', () => {
    test('returns true when state has protokoll data', () => {
      global.localStorage.getItem.mockReturnValue(JSON.stringify({
        protokollData: {
          metadata: {},
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        },
        abrechnungData: {
          header: {},
          positionen: {}
        },
        ui: {
          import: { status: 'idle' },
          generate: { status: 'idle' },
          export: { status: 'idle' }
        },
        meta: {
          version: '1.0.0',
          lastUpdated: Date.now()
        }
      }));
      
      const result = loadState();
      expect(result).toBe(true);
    });

    test('returns true when state has abrechnung data', () => {
      global.localStorage.getItem.mockReturnValue(JSON.stringify({
        protokollData: {
          metadata: {},
          positionen: []
        },
        abrechnungData: {
          header: {},
          positionen: { '01.01.0010': 5 }
        },
        ui: {
          import: { status: 'idle' },
          generate: { status: 'idle' },
          export: { status: 'idle' }
        },
        meta: {
          version: '1.0.0',
          lastUpdated: Date.now()
        }
      }));
      
      const result = loadState();
      expect(result).toBe(true);
    });

    test('returns false when state is empty', () => {
      global.localStorage.getItem.mockReturnValue(null);
      
      const result = loadState();
      expect(result).toBe(false);
    });
  });

  describe('saveState() (legacy)', () => {
    test('persists current state to localStorage', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      global.localStorage.setItem.mockClear();
      
      saveState();
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'abrechnungAppState_v1',
        expect.any(String)
      );
    });
  });

  describe('debugState()', () => {
    test('returns formatted JSON string of current state', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      
      const debugOutput = debugState();
      
      expect(typeof debugOutput).toBe('string');
      expect(debugOutput).toContain('ORD-001');
      expect(debugOutput).toContain('protokollData');
    });

    test('returns valid JSON', () => {
      setState({ ui: { import: { status: 'success' } } });
      
      const debugOutput = debugState();
      
      expect(() => JSON.parse(debugOutput)).not.toThrow();
    });
  });

  describe('subscribe() error handling', () => {
    test('throws error for non-function listener', () => {
      expect(() => subscribe('not a function')).toThrow('State listener must be a function');
      expect(() => subscribe(null)).toThrow('State listener must be a function');
      expect(() => subscribe(123)).toThrow('State listener must be a function');
    });
  });
});