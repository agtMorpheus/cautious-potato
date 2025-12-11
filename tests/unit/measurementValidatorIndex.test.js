/**
 * Measurement Validator Index Tests
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../js/modules/measurement-validator/engine/validationEngine.js', () => {
  return {
    ValidationEngine: jest.fn().mockImplementation(() => ({
      validateCircuit: jest.fn().mockReturnValue({ valid: true }),
      validateAllCircuits: jest.fn().mockReturnValue({ valid: true }),
      clearCache: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({ count: 1 })
    })),
    validationEngine: {}
  };
});

// Import module under test
import {
  ValidationDebouncer,
  createValidationSystem
} from '../../js/modules/measurement-validator/index.js';
import { ValidationEngine } from '../../js/modules/measurement-validator/engine/validationEngine.js';

describe('Measurement Validator Index', () => {

  describe('ValidationDebouncer', () => {
    let engine;
    let debouncer;

    beforeEach(() => {
      jest.useFakeTimers();
      engine = new ValidationEngine();
      debouncer = new ValidationDebouncer(engine, 100);

      // Mock window.dispatchEvent
      if (typeof window !== 'undefined') {
        jest.spyOn(window, 'dispatchEvent').mockImplementation(() => {});
      }
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('scheduleValidation debounces calls', () => {
      const callback = jest.fn();
      const circuitData = { id: 'c1' };

      debouncer.scheduleValidation('c1', circuitData, callback);
      debouncer.scheduleValidation('c1', circuitData, callback);
      debouncer.scheduleValidation('c1', circuitData, callback);

      expect(debouncer.getPendingCount()).toBe(1);
      expect(engine.validateCircuit).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(engine.validateCircuit).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('scheduleValidation resolves promise', async () => {
      const circuitData = { id: 'c1' };
      const promise = debouncer.scheduleValidation('c1', circuitData);

      jest.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toEqual({ valid: true });
    });

    test('cancelValidation removes pending', () => {
      debouncer.scheduleValidation('c1', {});
      expect(debouncer.isPending('c1')).toBe(true);

      debouncer.cancelValidation('c1');
      expect(debouncer.isPending('c1')).toBe(false);

      jest.advanceTimersByTime(100);
      expect(engine.validateCircuit).not.toHaveBeenCalled();
    });

    test('cancelAll removes all pending', () => {
      debouncer.scheduleValidation('c1', {});
      debouncer.scheduleValidation('c2', {});

      debouncer.cancelAll();

      expect(debouncer.getPendingCount()).toBe(0);
    });
  });

  describe('createValidationSystem', () => {
    test('creates system with default options', () => {
      const system = createValidationSystem();

      expect(system.engine).toBeDefined();
      expect(system.debouncer).toBeDefined();
      expect(system.validate).toBeDefined();
      expect(system.validateImmediate).toBeDefined();
    });

    test('validate calls debouncer', () => {
      const system = createValidationSystem();
      const spy = jest.spyOn(system.debouncer, 'scheduleValidation');

      system.validate({ id: 'c1' });
      expect(spy).toHaveBeenCalled();
    });

    test('validateImmediate calls engine', () => {
      const system = createValidationSystem();
      const spy = jest.spyOn(system.engine, 'validateCircuit');

      system.validateImmediate({ id: 'c1' });
      expect(spy).toHaveBeenCalled();
    });

    test('validateAll calls engine', () => {
      const system = createValidationSystem();
      const spy = jest.spyOn(system.engine, 'validateAllCircuits');

      system.validateAll([]);
      expect(spy).toHaveBeenCalled();
    });

    test('clearCache calls engine', () => {
      const system = createValidationSystem();
      const spy = jest.spyOn(system.engine, 'clearCache');

      system.clearCache();
      expect(spy).toHaveBeenCalled();
    });

    test('getMetrics calls engine', () => {
      const system = createValidationSystem();
      const spy = jest.spyOn(system.engine, 'getMetrics');

      system.getMetrics();
      expect(spy).toHaveBeenCalled();
    });
  });
});
