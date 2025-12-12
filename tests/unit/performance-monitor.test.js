/**
 * Unit Tests for Performance Monitor (performance-monitor.js)
 * Phase 6 Testing Framework
 */

import performanceMonitor from '../../js/performance-monitor.js';

describe('Performance Monitor (performance-monitor.js)', () => {
  beforeEach(() => {
    // Reset performance monitor state
    performanceMonitor.enable();
    performanceMonitor.observers = [];
    
    // Mock performance.now() for predictable tests
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000) // First call (startMeasure)
      .mockReturnValueOnce(1250); // Second call (endMeasure)
    
    // Mock performance.getEntriesByType
    if (!performance.getEntriesByType) {
      performance.getEntriesByType = jest.fn((type) => {
        if (type === 'measure') return [];
        if (type === 'navigation') return [{
          fetchStart: 0,
          loadEventEnd: 1500,
          domContentLoadedEventEnd: 800
        }];
        return [];
      });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and initialization', () => {
    test('is properly initialized as a singleton', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor.metrics).toBeDefined();
      expect(performanceMonitor.observers).toBeDefined();
      expect(performanceMonitor.isEnabled).toBe(true);
    });

    test('has default thresholds configured', () => {
      expect(performanceMonitor.thresholds).toBeDefined();
      expect(performanceMonitor.thresholds.initialization).toBe(500);
      expect(performanceMonitor.thresholds.moduleLoad).toBe(200);
      expect(performanceMonitor.thresholds.stateUpdate).toBe(50);
      expect(performanceMonitor.thresholds.uiRender).toBe(100);
      expect(performanceMonitor.thresholds.memoryUsage).toBe(50);
    });
  });

  describe('startMeasure()', () => {
    test('records start time and memory for a metric', () => {
      performanceMonitor.startMeasure('testMetric');
      
      expect(performanceMonitor.metrics.has('testMetric')).toBe(true);
      const metric = performanceMonitor.metrics.get('testMetric');
      expect(metric.startTime).toBeDefined();
      expect(metric.startMemory).toBeDefined();
    });

    test('does nothing when disabled', () => {
      performanceMonitor.disable();
      performanceMonitor.startMeasure('testMetric');
      
      expect(performanceMonitor.metrics.has('testMetric')).toBe(false);
    });
  });

  describe('endMeasure()', () => {
    test('calculates duration and returns result', () => {
      performanceMonitor.startMeasure('testMetric');
      const result = performanceMonitor.endMeasure('testMetric');
      
      expect(result).toBeDefined();
      expect(result.name).toBe('testMetric');
      expect(result.duration).toBe(250); // 1250 - 1000
      expect(result.memoryDelta).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('removes metric from metrics map after measurement', () => {
      performanceMonitor.startMeasure('testMetric');
      performanceMonitor.endMeasure('testMetric');
      
      expect(performanceMonitor.metrics.has('testMetric')).toBe(false);
    });

    test('returns null when disabled', () => {
      performanceMonitor.disable();
      const result = performanceMonitor.endMeasure('testMetric');
      
      expect(result).toBeNull();
    });

    test('returns null when metric does not exist', () => {
      const result = performanceMonitor.endMeasure('nonExistent');
      
      expect(result).toBeNull();
    });

    test('checks threshold and sets withinThreshold flag', () => {
      performanceMonitor.startMeasure('initialization');
      const result = performanceMonitor.endMeasure('initialization');
      
      expect(result.threshold).toBe(500);
      expect(result.withinThreshold).toBe(true); // 250ms < 500ms
    });
  });

  describe('measure()', () => {
    test('measures synchronous function execution', () => {
      const fn = jest.fn(() => 'result');
      
      const result = performanceMonitor.measure('syncTest', fn);
      
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    test('measures async function execution', async () => {
      const fn = jest.fn(async () => 'asyncResult');
      
      const resultPromise = performanceMonitor.measure('asyncTest', fn);
      
      expect(fn).toHaveBeenCalled();
      await expect(resultPromise).resolves.toBe('asyncResult');
    });

    test('ends measurement even when function throws', () => {
      const fn = jest.fn(() => {
        throw new Error('Test error');
      });
      
      expect(() => {
        performanceMonitor.measure('errorTest', fn);
      }).toThrow('Test error');
      
      // Metric should be cleaned up
      expect(performanceMonitor.metrics.has('errorTest')).toBe(false);
    });
  });

  describe('getMemoryUsage()', () => {
    test('returns memory usage in MB when available', () => {
      const memory = performanceMonitor.getMemoryUsage();
      
      expect(typeof memory).toBe('number');
      expect(memory).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 when performance.memory is not available', () => {
      const originalMemory = performance.memory;
      delete performance.memory;
      
      const memory = performanceMonitor.getMemoryUsage();
      
      expect(memory).toBe(0);
      
      performance.memory = originalMemory;
    });
  });

  describe('getSummary()', () => {
    test('returns performance summary with basic metrics', () => {
      const summary = performanceMonitor.getSummary();
      
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('loadTime');
      expect(summary).toHaveProperty('domContentLoaded');
      expect(summary).toHaveProperty('memoryUsage');
      expect(summary).toHaveProperty('customMetrics');
      expect(Array.isArray(summary.customMetrics)).toBe(true);
    });
  });

  describe('healthCheck()', () => {
    test('returns healthy status when all metrics within thresholds', () => {
      jest.spyOn(performanceMonitor, 'getSummary').mockReturnValue({
        loadTime: 1500,
        domContentLoaded: 800,
        memoryUsage: 30,
        customMetrics: []
      });
      
      const health = performanceMonitor.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.issues).toEqual([]);
      expect(health.summary).toBeDefined();
    });

    test('detects slow page load', () => {
      jest.spyOn(performanceMonitor, 'getSummary').mockReturnValue({
        loadTime: 3000,
        domContentLoaded: 500,
        memoryUsage: 30,
        customMetrics: []
      });
      
      const health = performanceMonitor.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toHaveLength(1);
      expect(health.issues[0]).toContain('Slow page load');
    });

    test('detects high memory usage', () => {
      jest.spyOn(performanceMonitor, 'getSummary').mockReturnValue({
        loadTime: 1500,
        domContentLoaded: 500,
        memoryUsage: 60,
        customMetrics: []
      });
      
      const health = performanceMonitor.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toHaveLength(1);
      expect(health.issues[0]).toContain('High memory usage');
    });

    test('detects slow DOM ready', () => {
      jest.spyOn(performanceMonitor, 'getSummary').mockReturnValue({
        loadTime: 1500,
        domContentLoaded: 1500,
        memoryUsage: 30,
        customMetrics: []
      });
      
      const health = performanceMonitor.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toHaveLength(1);
      expect(health.issues[0]).toContain('Slow DOM ready');
    });

    test('reports multiple issues when detected', () => {
      jest.spyOn(performanceMonitor, 'getSummary').mockReturnValue({
        loadTime: 3000,
        domContentLoaded: 1500,
        memoryUsage: 60,
        customMetrics: []
      });
      
      const health = performanceMonitor.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(1);
    });
  });

  describe('Observer pattern', () => {
    test('addObserver adds a callback to observers', () => {
      const callback = jest.fn();
      
      performanceMonitor.addObserver(callback);
      
      expect(performanceMonitor.observers).toContain(callback);
    });

    test('removeObserver removes a callback from observers', () => {
      const callback = jest.fn();
      performanceMonitor.addObserver(callback);
      
      performanceMonitor.removeObserver(callback);
      
      expect(performanceMonitor.observers).not.toContain(callback);
    });

    test('notifyObservers calls all registered callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const data = { name: 'test', duration: 100 };
      
      performanceMonitor.addObserver(callback1);
      performanceMonitor.addObserver(callback2);
      
      performanceMonitor.notifyObservers(data);
      
      expect(callback1).toHaveBeenCalledWith(data);
      expect(callback2).toHaveBeenCalledWith(data);
    });

    test('notifyObservers handles observer errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Observer error');
      });
      const successCallback = jest.fn();
      
      performanceMonitor.addObserver(errorCallback);
      performanceMonitor.addObserver(successCallback);
      
      // Should not throw
      expect(() => {
        performanceMonitor.notifyObservers({ test: 'data' });
      }).not.toThrow();
      
      // Successful callback should still be called
      expect(successCallback).toHaveBeenCalled();
    });

    test('observers are notified when measurement ends', () => {
      const callback = jest.fn();
      performanceMonitor.addObserver(callback);
      
      performanceMonitor.startMeasure('testMetric');
      performanceMonitor.endMeasure('testMetric');
      
      expect(callback).toHaveBeenCalled();
      const callData = callback.mock.calls[0][0];
      expect(callData.name).toBe('testMetric');
    });
  });

  describe('enable() and disable()', () => {
    test('enable sets isEnabled to true', () => {
      performanceMonitor.disable();
      performanceMonitor.enable();
      
      expect(performanceMonitor.isEnabled).toBe(true);
    });

    test('disable sets isEnabled to false and clears metrics', () => {
      performanceMonitor.startMeasure('testMetric');
      performanceMonitor.disable();
      
      expect(performanceMonitor.isEnabled).toBe(false);
      expect(performanceMonitor.metrics.size).toBe(0);
    });
  });

  describe('logPerformance()', () => {
    test('logs performance data with status indicator', () => {
      const data = {
        name: 'testMetric',
        duration: 100,
        threshold: 200,
        withinThreshold: true,
        memoryDelta: 5
      };
      
      performanceMonitor.logPerformance(data);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('testMetric')
      );
    });

    test('logs memory delta when positive', () => {
      const data = {
        name: 'testMetric',
        duration: 100,
        memoryDelta: 10
      };
      
      performanceMonitor.logPerformance(data);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Memory delta')
      );
    });

    test('does not log memory delta when zero or negative', () => {
      const data = {
        name: 'testMetric',
        duration: 100,
        memoryDelta: 0
      };
      
      console.log.mockClear();
      performanceMonitor.logPerformance(data);
      
      // Should only be called once for the performance log, not for memory
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('export()', () => {
    test('exports complete performance data snapshot', () => {
      const exported = performanceMonitor.export();
      
      expect(exported).toHaveProperty('timestamp');
      expect(exported).toHaveProperty('summary');
      expect(exported).toHaveProperty('healthCheck');
      expect(exported).toHaveProperty('thresholds');
      
      expect(typeof exported.timestamp).toBe('string');
      expect(typeof exported.summary).toBe('object');
      expect(typeof exported.healthCheck).toBe('object');
      expect(typeof exported.thresholds).toBe('object');
    });

    test('timestamp is valid ISO string', () => {
      const exported = performanceMonitor.export();
      
      expect(() => new Date(exported.timestamp)).not.toThrow();
      expect(new Date(exported.timestamp).toISOString()).toBe(exported.timestamp);
    });
  });

  describe('Global window availability', () => {
    test('is available on window object when in browser', () => {
      expect(window.performanceMonitor).toBeDefined();
      expect(window.performanceMonitor).toBe(performanceMonitor);
    });
  });
});
