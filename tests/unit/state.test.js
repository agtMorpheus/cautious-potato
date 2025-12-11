/**
 * Unit Tests for State Management (state.js)
 * Phase 6 Testing Framework
 */

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Import modules to test
import { 
  getState, 
  setState, 
  resetState, 
  subscribe, 
  unsubscribe,
  clearPersistedState,
  loadStateFromStorage 
} from '../../js/state.js';

describe('State Management (state.js)', () => {
  beforeEach(() => {
    // Clear localStorage mock and reset state before each test
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
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
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'abrechnungAppState_v1',
        expect.stringContaining('ORD-001')
      );
    });

    test('skips persistence when persist option is false', () => {
      const testData = { protokollData: { metadata: { orderNumber: 'ORD-001' } } };
      setState(testData, { persist: false });
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
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
      expect(state.protokollData.metadata).toEqual({});
      expect(state.protokollData.positionen).toEqual([]);
      expect(state.ui.import.status).toBe('idle');
      expect(state.ui.import.message).toBe('');
    });

    test('clears localStorage when persist option is true', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      
      resetState({ persist: true });
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('abrechnungAppState_v1');
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
        protokollData: { metadata: { orderNumber: 'STORED-001' } },
        ui: { import: { status: 'success' } }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testState));
      
      const loaded = loadStateFromStorage();
      expect(loaded.protokollData.metadata.orderNumber).toBe('STORED-001');
      expect(loaded.ui.import.status).toBe('success');
    });

    test('returns empty object if localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const loaded = loadStateFromStorage();
      expect(loaded).toEqual({});
    });

    test('handles corrupted JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json {');
      
      const loaded = loadStateFromStorage();
      expect(loaded).toEqual({});
    });

    test('handles non-string values gracefully', () => {
      localStorageMock.getItem.mockReturnValue(undefined);
      
      const loaded = loadStateFromStorage();
      expect(loaded).toEqual({});
    });
  });

  describe('clearPersistedState()', () => {
    test('removes state from localStorage', () => {
      clearPersistedState();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('abrechnungAppState_v1');
    });
  });

  describe('Error Handling', () => {
    test('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
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
});