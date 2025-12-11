/**
 * Unit Tests for State Management Module (state.js)
 * Phase 6 - Testing Framework
 */

import {
  getState,
  setState,
  resetState,
  subscribe,
  unsubscribe,
  loadStateFromStorage,
  clearPersistedState,
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
    // Clear localStorage and reset state before each test
    localStorage.clear();
    resetState({ persist: false, silent: true });
  });

  describe('getState()', () => {
    test('returns initial state with expected structure', () => {
      const state = getState();
      expect(state).toHaveProperty('protokollData');
      expect(state).toHaveProperty('abrechnungData');
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('meta');
    });

    test('returns the same structure on repeated calls', () => {
      const state1 = getState();
      const state2 = getState();
      expect(state1).toEqual(state2);
    });

    test('returns a defensive copy (mutations do not affect internal state)', () => {
      const state1 = getState();
      state1.protokollData.metadata.orderNumber = 'MODIFIED';
      
      const state2 = getState();
      expect(state2.protokollData.metadata.orderNumber).toBeNull();
    });
  });

  describe('setState()', () => {
    test('updates state with new values', () => {
      const newData = { 
        protokollData: { 
          metadata: { orderNumber: 'ORD-001' },
          positionen: []
        } 
      };
      setState(newData, { silent: true });
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
    });

    test('performs shallow merge at top level', () => {
      setState({ 
        protokollData: { 
          metadata: { orderNumber: 'ORD-001' },
          positionen: []
        } 
      }, { silent: true });
      
      setState({ 
        ui: { 
          import: { status: 'success', message: '', fileName: '', fileSize: 0, importedAt: null },
          generate: { status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0, generationTimeMs: 0 },
          export: { status: 'idle', message: '', lastExportAt: null, lastExportSize: 0 }
        } 
      }, { silent: true });
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.ui.import.status).toBe('success');
    });

    test('updates meta.lastUpdated timestamp', () => {
      const beforeTime = new Date().toISOString();
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } }, { silent: true });
      const afterTime = new Date().toISOString();
      
      const state = getState();
      expect(state.meta.lastUpdated).toBeDefined();
      expect(state.meta.lastUpdated >= beforeTime).toBe(true);
      expect(state.meta.lastUpdated <= afterTime).toBe(true);
    });

    test('triggers listeners when not silent', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } });
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].protokollData.metadata.orderNumber).toBe('ORD-001');
    });

    test('does not trigger listeners when silent option is true', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } }, { silent: true });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('persists state to localStorage when not silent', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } });
      
      expect(localStorage.setItem).toHaveBeenCalled();
      const calls = localStorage.setItem.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toContain('abrechnungAppState');
    });
  });

  describe('subscribe() and unsubscribe()', () => {
    test('registers multiple listeners and calls all on state change', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      subscribe(listener1);
      subscribe(listener2);
      
      setState({ ui: { 
        import: { status: 'success', message: '', fileName: '', fileSize: 0, importedAt: null },
        generate: { status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0, generationTimeMs: 0 },
        export: { status: 'idle', message: '', lastExportAt: null, lastExportSize: 0 }
      } });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('listener receives updated state', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      const testData = { protokollData: { metadata: { orderNumber: 'TEST-001' }, positionen: [] } };
      setState(testData);
      
      const callArg = listener.mock.calls[0][0];
      expect(callArg.protokollData.metadata.orderNumber).toBe('TEST-001');
    });

    test('subscribe returns unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = subscribe(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Test that unsubscribe works
      unsubscribe();
      setState({ ui: { 
        import: { status: 'success', message: '', fileName: '', fileSize: 0, importedAt: null },
        generate: { status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0, generationTimeMs: 0 },
        export: { status: 'idle', message: '', lastExportAt: null, lastExportSize: 0 }
      } });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('unsubscribe removes listener', () => {
      const listener = jest.fn();
      subscribe(listener);
      unsubscribe(listener);
      
      setState({ ui: { 
        import: { status: 'success', message: '', fileName: '', fileSize: 0, importedAt: null },
        generate: { status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0, generationTimeMs: 0 },
        export: { status: 'idle', message: '', lastExportAt: null, lastExportSize: 0 }
      } });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('subscribe throws error if listener is not a function', () => {
      expect(() => subscribe('not a function')).toThrow('State listener must be a function');
    });
  });

  describe('resetState()', () => {
    test('clears all state back to initial values', () => {
      setState({ 
        protokollData: { 
          metadata: { orderNumber: 'ORD-001' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        },
        ui: { 
          import: { status: 'success', message: 'Imported', fileName: '', fileSize: 0, importedAt: null },
          generate: { status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0, generationTimeMs: 0 },
          export: { status: 'idle', message: '', lastExportAt: null, lastExportSize: 0 }
        }
      }, { silent: true });
      
      resetState({ persist: false, silent: true });
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBeNull();
      expect(state.protokollData.positionen).toEqual([]);
      expect(state.ui.import.status).toBe('idle');
    });

    test('triggers listeners when not silent', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      resetState({ persist: false, silent: false });
      
      expect(listener).toHaveBeenCalled();
    });

    test('does not trigger listeners when silent', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      resetState({ persist: false, silent: true });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Domain-Specific Helper Functions', () => {
    test('setImportStatus updates import UI status', () => {
      setImportStatus({ status: 'success', message: 'File imported', fileName: 'test.xlsx' });
      
      const state = getState();
      expect(state.ui.import.status).toBe('success');
      expect(state.ui.import.message).toBe('File imported');
      expect(state.ui.import.fileName).toBe('test.xlsx');
    });

    test('setGenerateStatus updates generate UI status', () => {
      setGenerateStatus({ status: 'success', positionCount: 10 });
      
      const state = getState();
      expect(state.ui.generate.status).toBe('success');
      expect(state.ui.generate.positionCount).toBe(10);
    });

    test('setExportStatus updates export UI status', () => {
      setExportStatus({ status: 'success', lastExportAt: '2025-12-09T12:00:00Z' });
      
      const state = getState();
      expect(state.ui.export.status).toBe('success');
      expect(state.ui.export.lastExportAt).toBe('2025-12-09T12:00:00Z');
    });

    test('updateProtokollData updates protokoll metadata and positions', () => {
      updateProtokollData({
        metadata: { orderNumber: 'ORD-001', protocolNumber: 'PROT-001' },
        positionen: [{ posNr: '01.01.0010', menge: 5 }]
      });
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.protokollData.positionen).toHaveLength(1);
      expect(state.protokollData.positionen[0].posNr).toBe('01.01.0010');
    });

    test('updateAbrechnungPositions updates position map', () => {
      updateAbrechnungPositions({ '01.01.0010': 7, '01.01.0020': 3 });
      
      const state = getState();
      expect(state.abrechnungData.positionen['01.01.0010']).toBe(7);
      expect(state.abrechnungData.positionen['01.01.0020']).toBe(3);
    });

    test('updateAbrechnungHeader updates header data', () => {
      updateAbrechnungHeader({ 
        date: '2025-12-09',
        orderNumber: 'ORD-001',
        plant: 'Factory A'
      });
      
      const state = getState();
      expect(state.abrechnungData.header.date).toBe('2025-12-09');
      expect(state.abrechnungData.header.orderNumber).toBe('ORD-001');
      expect(state.abrechnungData.header.plant).toBe('Factory A');
    });
  });

  describe('localStorage Integration', () => {
    test('loadStateFromStorage returns empty state when localStorage is empty', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const loaded = loadStateFromStorage();
      
      expect(loaded.protokollData.positionen).toEqual([]);
      expect(loaded.ui.import.status).toBe('idle');
    });

    test('loadStateFromStorage handles corrupted JSON gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid json {');
      
      const loaded = loadStateFromStorage();
      
      // Should fall back to initial state
      expect(loaded.protokollData.positionen).toEqual([]);
    });

    test('clearPersistedState removes data from localStorage', () => {
      clearPersistedState();
      
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('Contract Manager Functions', () => {
    describe('addContractFile()', () => {
      test('adds file info to importedFiles list', () => {
        const fileInfo = {
          fileName: 'contracts.xlsx',
          size: 25600,
          sheets: ['Sheet1', 'Sheet2'],
          recordsImported: 100,
          recordsWithErrors: 5
        };
        
        addContractFile(fileInfo);
        
        const state = getState();
        expect(state.contracts.importedFiles).toHaveLength(1);
        expect(state.contracts.importedFiles[0].fileName).toBe('contracts.xlsx');
        expect(state.contracts.importedFiles[0].size).toBe(25600);
        expect(state.contracts.importedFiles[0].importedAt).toBeDefined();
      });

      test('appends to existing importedFiles', () => {
        addContractFile({ fileName: 'file1.xlsx', size: 1000, sheets: [], recordsImported: 10, recordsWithErrors: 0 });
        addContractFile({ fileName: 'file2.xlsx', size: 2000, sheets: [], recordsImported: 20, recordsWithErrors: 0 });
        
        const state = getState();
        expect(state.contracts.importedFiles).toHaveLength(2);
        expect(state.contracts.importedFiles[0].fileName).toBe('file1.xlsx');
        expect(state.contracts.importedFiles[1].fileName).toBe('file2.xlsx');
      });

      test('sets importedAt timestamp automatically', () => {
        const before = new Date().toISOString();
        addContractFile({ fileName: 'test.xlsx', size: 100, sheets: [], recordsImported: 5, recordsWithErrors: 0 });
        const after = new Date().toISOString();
        
        const state = getState();
        const importedAt = state.contracts.importedFiles[0].importedAt;
        expect(importedAt >= before).toBe(true);
        expect(importedAt <= after).toBe(true);
      });
    });

    describe('setContracts()', () => {
      test('replaces existing contract records', () => {
        const contracts = [
          { contractId: 'C001', contractTitle: 'Contract 1', status: 'offen' },
          { contractId: 'C002', contractTitle: 'Contract 2', status: 'fertig' }
        ];
        
        setContracts(contracts);
        
        const state = getState();
        expect(state.contracts.records).toHaveLength(2);
        expect(state.contracts.records[0].contractId).toBe('C001');
      });

      test('clears contracts when given empty array', () => {
        setContracts([{ contractId: 'C001', contractTitle: 'Test', status: 'offen' }]);
        setContracts([]);
        
        const state = getState();
        expect(state.contracts.records).toHaveLength(0);
      });

      test('handles null by setting empty array', () => {
        setContracts([{ contractId: 'C001', contractTitle: 'Test', status: 'offen' }]);
        setContracts(null);
        
        const state = getState();
        expect(state.contracts.records).toEqual([]);
      });
    });

    describe('addContracts()', () => {
      test('appends new contracts to existing records', () => {
        setContracts([{ contractId: 'C001', contractTitle: 'Contract 1', status: 'offen' }]);
        addContracts([{ contractId: 'C002', contractTitle: 'Contract 2', status: 'fertig' }]);
        
        const state = getState();
        expect(state.contracts.records).toHaveLength(2);
        expect(state.contracts.records[1].contractId).toBe('C002');
      });

      test('works when no existing contracts', () => {
        addContracts([{ contractId: 'C001', contractTitle: 'Contract 1', status: 'offen' }]);
        
        const state = getState();
        expect(state.contracts.records).toHaveLength(1);
      });

      test('adds multiple contracts at once', () => {
        addContracts([
          { contractId: 'C001', contractTitle: 'Contract 1', status: 'offen' },
          { contractId: 'C002', contractTitle: 'Contract 2', status: 'offen' },
          { contractId: 'C003', contractTitle: 'Contract 3', status: 'fertig' }
        ]);
        
        const state = getState();
        expect(state.contracts.records).toHaveLength(3);
      });
    });

    describe('setContractFilters()', () => {
      test('updates filter values', () => {
        setContractFilters({ contractId: 'C001', status: 'offen' });
        
        const state = getState();
        expect(state.contracts.filters.contractId).toBe('C001');
        expect(state.contracts.filters.status).toBe('offen');
      });

      test('merges with existing filters', () => {
        setContractFilters({ contractId: 'C001' });
        setContractFilters({ status: 'fertig' });
        
        const state = getState();
        expect(state.contracts.filters.contractId).toBe('C001');
        expect(state.contracts.filters.status).toBe('fertig');
      });

      test('updates date range filter', () => {
        setContractFilters({ dateRange: { from: '2025-01-01', to: '2025-12-31' } });
        
        const state = getState();
        expect(state.contracts.filters.dateRange.from).toBe('2025-01-01');
        expect(state.contracts.filters.dateRange.to).toBe('2025-12-31');
      });

      test('updates search text filter', () => {
        setContractFilters({ searchText: 'maintenance' });
        
        const state = getState();
        expect(state.contracts.filters.searchText).toBe('maintenance');
      });
    });

    describe('resetContractFilters()', () => {
      test('resets all filters to default values', () => {
        setContractFilters({ 
          contractId: 'C001', 
          status: 'offen', 
          location: 'Building A',
          searchText: 'test search'
        });
        
        resetContractFilters();
        
        const state = getState();
        expect(state.contracts.filters.contractId).toBeNull();
        expect(state.contracts.filters.status).toBeNull();
        expect(state.contracts.filters.location).toBeNull();
        expect(state.contracts.filters.equipmentId).toBeNull();
        expect(state.contracts.filters.dateRange).toEqual({ from: null, to: null });
        expect(state.contracts.filters.searchText).toBe('');
      });
    });

    describe('setContractImportState()', () => {
      test('updates import state values', () => {
        setContractImportState({
          isImporting: true,
          currentFile: 'contracts.xlsx',
          progress: 50,
          status: 'pending'
        });
        
        const state = getState();
        expect(state.contracts.importState.isImporting).toBe(true);
        expect(state.contracts.importState.currentFile).toBe('contracts.xlsx');
        expect(state.contracts.importState.progress).toBe(50);
        expect(state.contracts.importState.status).toBe('pending');
      });

      test('merges with existing import state', () => {
        setContractImportState({ isImporting: true, progress: 25 });
        setContractImportState({ progress: 75 });
        
        const state = getState();
        expect(state.contracts.importState.isImporting).toBe(true);
        expect(state.contracts.importState.progress).toBe(75);
      });

      test('updates errors and warnings arrays', () => {
        setContractImportState({
          errors: ['Invalid format', 'Missing field'],
          warnings: ['Deprecated field used']
        });
        
        const state = getState();
        expect(state.contracts.importState.errors).toHaveLength(2);
        expect(state.contracts.importState.warnings).toHaveLength(1);
      });
    });

    describe('setContractRawSheets()', () => {
      test('sets sheet metadata', () => {
        const sheets = {
          'Sheet1': { sheetName: 'Sheet1', rowCount: 100, columns: ['A', 'B', 'C'], isEmpty: false },
          'Sheet2': { sheetName: 'Sheet2', rowCount: 0, columns: [], isEmpty: true }
        };
        
        setContractRawSheets(sheets);
        
        const state = getState();
        expect(state.contracts.rawSheets.Sheet1).toBeDefined();
        expect(state.contracts.rawSheets.Sheet1.rowCount).toBe(100);
        expect(state.contracts.rawSheets.Sheet2.isEmpty).toBe(true);
      });

      test('handles null by setting empty object', () => {
        setContractRawSheets({ 'Sheet1': { sheetName: 'Sheet1' } });
        setContractRawSheets(null);
        
        const state = getState();
        expect(state.contracts.rawSheets).toEqual({});
      });

      test('replaces existing sheets', () => {
        setContractRawSheets({ 'Sheet1': { sheetName: 'Sheet1' } });
        setContractRawSheets({ 'NewSheet': { sheetName: 'NewSheet' } });
        
        const state = getState();
        expect(state.contracts.rawSheets.Sheet1).toBeUndefined();
        expect(state.contracts.rawSheets.NewSheet).toBeDefined();
      });
    });

    describe('setContractMapping()', () => {
      test('sets column mapping configuration', () => {
        const mapping = {
          contractId: { excelColumn: 'A', type: 'string', required: true },
          contractTitle: { excelColumn: 'B', type: 'string', required: true },
          status: { excelColumn: 'C', type: 'string', required: true }
        };
        
        setContractMapping(mapping);
        
        const state = getState();
        expect(state.contracts.currentMapping.contractId.excelColumn).toBe('A');
        expect(state.contracts.currentMapping.contractTitle.excelColumn).toBe('B');
      });

      test('handles null by setting empty object', () => {
        setContractMapping({ contractId: { excelColumn: 'A' } });
        setContractMapping(null);
        
        const state = getState();
        expect(state.contracts.currentMapping).toEqual({});
      });
    });

    describe('clearContracts()', () => {
      test('resets all contract state to initial values', () => {
        // Set up some contract data
        addContractFile({ fileName: 'test.xlsx', size: 1000, sheets: [], recordsImported: 10, recordsWithErrors: 0 });
        setContracts([{ contractId: 'C001', contractTitle: 'Test', status: 'offen' }]);
        setContractFilters({ searchText: 'test' });
        setContractImportState({ isImporting: true, progress: 50 });
        
        clearContracts();
        
        const state = getState();
        expect(state.contracts.importedFiles).toHaveLength(0);
        expect(state.contracts.records).toHaveLength(0);
        expect(state.contracts.rawSheets).toEqual({});
        expect(state.contracts.currentMapping).toEqual({});
        expect(state.contracts.filters.searchText).toBe('');
        expect(state.contracts.importState.isImporting).toBe(false);
        expect(state.contracts.importState.status).toBe('idle');
      });

      test('resets lastImportResult to null', () => {
        setLastImportResult({ contracts: [], errors: [], warnings: [], summary: {} });
        clearContracts();
        
        const state = getState();
        expect(state.contracts.lastImportResult).toBeNull();
      });

      test('resets UI state to defaults', () => {
        setContractUIState({ activeTab: 'list', sortKey: 'status', sortDir: 'desc' });
        clearContracts();
        
        const state = getState();
        expect(state.contracts.ui.activeTab).toBe('import');
        expect(state.contracts.ui.sortKey).toBe('contractId');
        expect(state.contracts.ui.sortDir).toBe('asc');
      });
    });

    describe('setLastImportResult()', () => {
      test('stores import result for preview', () => {
        const result = {
          contracts: [{ contractId: 'C001', contractTitle: 'Test', status: 'offen' }],
          errors: ['Invalid row 5'],
          warnings: ['Duplicate ID detected'],
          summary: { total: 10, imported: 9, failed: 1 }
        };
        
        setLastImportResult(result);
        
        const state = getState();
        expect(state.contracts.lastImportResult).toBeDefined();
        expect(state.contracts.lastImportResult.contracts).toHaveLength(1);
        expect(state.contracts.lastImportResult.errors).toHaveLength(1);
        expect(state.contracts.lastImportResult.summary.total).toBe(10);
      });

      test('can clear lastImportResult by setting null', () => {
        setLastImportResult({ contracts: [], errors: [], warnings: [], summary: {} });
        setLastImportResult(null);
        
        const state = getState();
        expect(state.contracts.lastImportResult).toBeNull();
      });
    });

    describe('setContractUIState()', () => {
      test('updates active tab', () => {
        setContractUIState({ activeTab: 'list' });
        
        const state = getState();
        expect(state.contracts.ui.activeTab).toBe('list');
      });

      test('updates sort configuration', () => {
        setContractUIState({ sortKey: 'status', sortDir: 'desc' });
        
        const state = getState();
        expect(state.contracts.ui.sortKey).toBe('status');
        expect(state.contracts.ui.sortDir).toBe('desc');
      });

      test('merges with existing UI state', () => {
        setContractUIState({ activeTab: 'preview' });
        setContractUIState({ sortKey: 'contractTitle' });
        
        const state = getState();
        expect(state.contracts.ui.activeTab).toBe('preview');
        expect(state.contracts.ui.sortKey).toBe('contractTitle');
      });
    });
  });

  describe('Legacy Compatibility Functions', () => {
    test('clearState resets and clears persisted state', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } }, { silent: true });
      
      clearState();
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    test('loadState returns false for empty state', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = loadState();
      
      expect(result).toBe(false);
    });

    test('loadState returns true when protokollData has positions', () => {
      const savedState = {
        protokollData: { metadata: {}, positionen: [{ posNr: '01.01.0010', menge: 5 }] },
        abrechnungData: { header: {}, positionen: {} },
        ui: { import: {}, generate: {}, export: {} },
        meta: { version: '1.0.0' }
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(savedState));
      
      const result = loadState();
      
      expect(result).toBe(true);
    });

    test('loadState returns true when abrechnungData has positions', () => {
      const savedState = {
        protokollData: { metadata: {}, positionen: [] },
        abrechnungData: { header: {}, positionen: { '01.01.0010': 5 } },
        ui: { import: {}, generate: {}, export: {} },
        meta: { version: '1.0.0' }
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(savedState));
      
      const result = loadState();
      
      expect(result).toBe(true);
    });

    test('saveState persists to localStorage', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } }, { silent: true });
      localStorage.setItem.mockClear();
      
      saveState();
      
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('debugState returns JSON formatted string', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' }, positionen: [] } }, { silent: true });
      
      const debug = debugState();
      
      expect(typeof debug).toBe('string');
      expect(() => JSON.parse(debug)).not.toThrow();
      const parsed = JSON.parse(debug);
      expect(parsed.protokollData.metadata.orderNumber).toBe('ORD-001');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('multiple listeners receive state updates', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      subscribe(listener1);
      subscribe(listener2);
      subscribe(listener3);
      
      setState({ protokollData: { metadata: { orderNumber: 'TEST' }, positionen: [] } });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    test('unsubscribe prevents listener from receiving updates', () => {
      const listener = jest.fn();
      
      const unsub = subscribe(listener);
      setState({ protokollData: { metadata: { orderNumber: 'FIRST' }, positionen: [] } });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsub();
      setState({ protokollData: { metadata: { orderNumber: 'SECOND' }, positionen: [] } });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    test('listener errors do not prevent other listeners', () => {
      const badListener = jest.fn(() => { throw new Error('Test error'); });
      const goodListener = jest.fn();
      
      subscribe(badListener);
      subscribe(goodListener);
      
      // Should not throw and goodListener should still be called
      const testUIState = {
        ui: {
          import: { status: 'idle', message: '', fileName: '', fileSize: 0, importedAt: null },
          generate: { status: 'idle', message: '', positionCount: 0, uniquePositionCount: 0, generationTimeMs: 0 },
          export: { status: 'idle', message: '', lastExportAt: null, lastExportSize: 0 }
        }
      };
      expect(() => setState(testUIState)).not.toThrow();
      expect(goodListener).toHaveBeenCalled();
    });

    test('state merges preserve existing nested data', () => {
      updateProtokollData({
        metadata: { orderNumber: 'ORD-001', plant: 'Factory A' },
        positionen: []
      });
      
      updateProtokollData({
        metadata: { location: 'Building B' }
      });
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.protokollData.metadata.plant).toBe('Factory A');
      expect(state.protokollData.metadata.location).toBe('Building B');
    });

    test('handles rapid successive state updates', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      for (let i = 0; i < 10; i++) {
        setState({ protokollData: { metadata: { orderNumber: `ORD-${i}` }, positionen: [] } });
      }
      
      expect(listener).toHaveBeenCalledTimes(10);
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-9');
    });

    test('resetState with silent option does not notify listeners', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      setState({ protokollData: { metadata: { orderNumber: 'TEST' }, positionen: [] } });
      expect(listener).toHaveBeenCalledTimes(1);
      
      resetState({ persist: false, silent: true });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    test('state maintains immutability across updates', () => {
      const state1 = getState();
      setState({ protokollData: { metadata: { orderNumber: 'NEW' }, positionen: [] } }, { silent: true });
      const state2 = getState();
      
      expect(state1.protokollData.metadata.orderNumber).toBeNull();
      expect(state2.protokollData.metadata.orderNumber).toBe('NEW');
      expect(state1).not.toBe(state2);
    });
  });
});
