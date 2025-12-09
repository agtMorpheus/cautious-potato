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
  updateAbrechnungHeader
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
});
