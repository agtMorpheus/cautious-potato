/**
 * Unit Tests for Production Monitoring
 * Tests for ProductionMonitoring class
 */

import { 
  ProductionMonitoring, 
  productionMonitor,
  withMonitoring,
  getPerformanceDashboard
} from '../../js/modules/measurement-validator/monitoring/productionMonitoring.js';

describe('ProductionMonitoring', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ProductionMonitoring();
  });

  describe('constructor', () => {
    test('initializes with default metrics', () => {
      expect(monitor.metrics.validationExecutions).toBe(0);
      expect(monitor.metrics.validationErrors).toBe(0);
      expect(monitor.metrics.averageExecutionTime).toBe(0);
    });

    test('initializes with default config', () => {
      expect(monitor.config.slowThresholdMs).toBe(10);
      expect(monitor.config.healthErrorRateThreshold).toBe(0.01);
    });
  });

  describe('trackValidation()', () => {
    test('increments execution count', () => {
      monitor.trackValidation('circuit-1', 5, true);
      expect(monitor.metrics.validationExecutions).toBe(1);
      
      monitor.trackValidation('circuit-2', 3, true);
      expect(monitor.metrics.validationExecutions).toBe(2);
    });

    test('calculates average execution time', () => {
      monitor.trackValidation('circuit-1', 10, true);
      monitor.trackValidation('circuit-2', 20, true);
      
      expect(monitor.metrics.averageExecutionTime).toBe(15);
    });

    test('tracks fastest and slowest execution', () => {
      monitor.trackValidation('circuit-1', 5, true);
      monitor.trackValidation('circuit-2', 15, true);
      monitor.trackValidation('circuit-3', 10, true);
      
      expect(monitor.metrics.fastestExecution).toBe(5);
      expect(monitor.metrics.slowestExecution).toBe(15);
    });

    test('increments error count on failure', () => {
      monitor.trackValidation('circuit-1', 5, false, 'Test error');
      expect(monitor.metrics.validationErrors).toBe(1);
    });

    test('tracks slow queries', () => {
      monitor.trackValidation('circuit-1', 5, true);  // Not slow
      monitor.trackValidation('circuit-2', 15, true); // Slow (>10ms)
      
      expect(monitor.metrics.slowQueries).toHaveLength(1);
      expect(monitor.metrics.slowQueries[0].circuitId).toBe('circuit-2');
    });

    test('limits slow queries storage', () => {
      monitor.config.maxSlowQueries = 3;
      
      for (let i = 0; i < 5; i++) {
        monitor.trackValidation(`circuit-${i}`, 20, true);
      }
      
      expect(monitor.metrics.slowQueries).toHaveLength(3);
    });
  });

  describe('logError()', () => {
    test('stores error with timestamp', () => {
      monitor.logError('circuit-1', 'Test error message');
      
      expect(monitor.metrics.errors).toHaveLength(1);
      expect(monitor.metrics.errors[0].circuitId).toBe('circuit-1');
      expect(monitor.metrics.errors[0].message).toBe('Test error message');
      expect(monitor.metrics.errors[0].timestamp).toBeDefined();
    });

    test('limits error storage', () => {
      monitor.config.maxErrors = 3;
      
      for (let i = 0; i < 5; i++) {
        monitor.logError(`circuit-${i}`, `Error ${i}`);
      }
      
      expect(monitor.metrics.errors).toHaveLength(3);
    });
  });

  describe('getHealthStatus()', () => {
    test('returns healthy status with no errors', () => {
      monitor.trackValidation('circuit-1', 5, true);
      
      const health = monitor.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.status).toBe('excellent');
    });

    test('returns degraded status with some errors', () => {
      for (let i = 0; i < 90; i++) {
        monitor.trackValidation(`circuit-${i}`, 5, true);
      }
      for (let i = 0; i < 10; i++) {
        monitor.trackValidation(`error-${i}`, 5, false, 'Error');
      }
      
      const health = monitor.getHealthStatus();
      expect(health.healthy).toBe(false);
    });

    test('includes performance metrics', () => {
      monitor.trackValidation('circuit-1', 5, true);
      
      const health = monitor.getHealthStatus();
      expect(health.averageExecutionTime).toBeDefined();
      expect(health.totalExecutions).toBe(1);
    });
  });

  describe('getPerformanceSummary()', () => {
    test('returns performance summary', () => {
      monitor.trackValidation('circuit-1', 10, true);
      monitor.trackValidation('circuit-2', 20, true);
      
      const summary = monitor.getPerformanceSummary();
      
      expect(summary.executions).toBe(2);
      expect(summary.avgTime).toBe('15.00');
      expect(summary.minTime).toBe('10.00');
      expect(summary.maxTime).toBe('20.00');
    });
  });

  describe('getSlowQueries()', () => {
    test('returns slow queries sorted by duration', () => {
      monitor.trackValidation('circuit-1', 15, true);
      monitor.trackValidation('circuit-2', 25, true);
      monitor.trackValidation('circuit-3', 20, true);
      
      const slow = monitor.getSlowQueries();
      
      expect(slow[0].duration).toBe(25);
      expect(slow[1].duration).toBe(20);
      expect(slow[2].duration).toBe(15);
    });

    test('limits results', () => {
      for (let i = 0; i < 20; i++) {
        monitor.trackValidation(`circuit-${i}`, 15 + i, true);
      }
      
      const slow = monitor.getSlowQueries(5);
      expect(slow).toHaveLength(5);
    });
  });

  describe('getRecentErrors()', () => {
    test('returns recent errors in reverse order', () => {
      monitor.logError('circuit-1', 'Error 1');
      monitor.logError('circuit-2', 'Error 2');
      monitor.logError('circuit-3', 'Error 3');
      
      const errors = monitor.getRecentErrors();
      
      expect(errors[0].message).toBe('Error 3');
      expect(errors[1].message).toBe('Error 2');
      expect(errors[2].message).toBe('Error 1');
    });

    test('limits results', () => {
      for (let i = 0; i < 20; i++) {
        monitor.logError(`circuit-${i}`, `Error ${i}`);
      }
      
      const errors = monitor.getRecentErrors(5);
      expect(errors).toHaveLength(5);
    });
  });

  describe('exportMetrics()', () => {
    test('returns complete metrics export', () => {
      monitor.trackValidation('circuit-1', 5, true);
      
      const exported = monitor.exportMetrics();
      
      expect(exported.timestamp).toBeDefined();
      expect(exported.validationExecutions).toBe(1);
      expect(exported.health).toBeDefined();
      expect(exported.performance).toBeDefined();
    });
  });

  describe('resetMetrics()', () => {
    test('resets all metrics', () => {
      monitor.trackValidation('circuit-1', 5, true);
      monitor.trackValidation('circuit-2', 5, false, 'Error');
      
      monitor.resetMetrics();
      
      expect(monitor.metrics.validationExecutions).toBe(0);
      expect(monitor.metrics.validationErrors).toBe(0);
      expect(monitor.metrics.slowQueries).toHaveLength(0);
      expect(monitor.metrics.errors).toHaveLength(0);
    });

    test('updates lastReset timestamp', () => {
      const beforeReset = monitor.metrics.lastReset;
      
      // Wait a bit
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        monitor.resetMetrics();
        expect(monitor.metrics.lastReset).not.toBe(beforeReset);
      });
    });
  });
});

describe('withMonitoring()', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ProductionMonitoring();
  });

  test('wraps function and tracks successful execution', () => {
    const originalFn = (data) => ({ result: data.value * 2 });
    const monitoredFn = withMonitoring(originalFn, monitor);
    
    const result = monitoredFn({ id: 'test', value: 5 });
    
    expect(result.result).toBe(10);
    expect(monitor.metrics.validationExecutions).toBe(1);
    expect(monitor.metrics.validationErrors).toBe(0);
  });

  test('tracks errors when function throws', () => {
    const originalFn = () => { throw new Error('Test error'); };
    const monitoredFn = withMonitoring(originalFn, monitor);
    
    expect(() => monitoredFn({ id: 'test' })).toThrow('Test error');
    expect(monitor.metrics.validationExecutions).toBe(1);
    expect(monitor.metrics.validationErrors).toBe(1);
  });
});

describe('getPerformanceDashboard()', () => {
  test('returns dashboard data with empty state', () => {
    const dashboard = getPerformanceDashboard({});
    
    expect(dashboard.systemHealth).toBeDefined();
    expect(dashboard.circuitStats).toBeDefined();
    expect(dashboard.circuitStats.total).toBe(0);
  });

  test('returns dashboard data with circuit stats', () => {
    const state = {
      circuitTable: [
        { id: '1', validationState: { hasNonConformities: false } },
        { id: '2', validationState: { hasNonConformities: true, criticalCount: 2 } },
        { id: '3', validationState: { hasNonConformities: true, criticalCount: 1 } },
      ]
    };
    
    const dashboard = getPerformanceDashboard(state);
    
    expect(dashboard.circuitStats.total).toBe(3);
    expect(dashboard.circuitStats.valid).toBe(1);
    expect(dashboard.circuitStats.withIssues).toBe(2);
    expect(dashboard.circuitStats.critical).toBe(3);
  });
});

describe('productionMonitor singleton', () => {
  test('is a ProductionMonitoring instance', () => {
    expect(productionMonitor).toBeInstanceOf(ProductionMonitoring);
  });
});

describe('setupHealthCheck()', () => {
  let originalSetInterval;
  let originalAddEventListener;
  let intervalCallback;
  
  beforeEach(() => {
    // Mock setInterval
    originalSetInterval = global.setInterval;
    global.setInterval = jest.fn((callback) => {
      intervalCallback = callback;
      return 123; // Return fake timer ID
    });
    
    // Mock window.addEventListener
    originalAddEventListener = window.addEventListener;
    window.addEventListener = jest.fn();
    
    // Clear localStorage
    localStorage.clear();
  });
  
  afterEach(() => {
    global.setInterval = originalSetInterval;
    window.addEventListener = originalAddEventListener;
    localStorage.clear();
  });
  
  // Import setupHealthCheck dynamically to avoid issues with mocking
  test('stores health data in localStorage', async () => {
    const { setupHealthCheck } = await import('../../js/modules/measurement-validator/monitoring/productionMonitoring.js');
    
    const updateHealth = setupHealthCheck();
    
    // Call the returned function
    const result = updateHealth();
    
    // Check localStorage
    const stored = JSON.parse(localStorage.getItem('validator_health'));
    expect(stored).toBeTruthy();
    expect(stored.app).toBe('abrechnung-validator');
    expect(stored.version).toBe('1.0.0');
    expect(stored.timestamp).toBeDefined();
  });
  
  test('sets up interval for health updates', async () => {
    const { setupHealthCheck } = await import('../../js/modules/measurement-validator/monitoring/productionMonitoring.js');
    
    setupHealthCheck();
    
    // setInterval should be called with 30 second interval
    expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
  });
  
  test('sets up beforeunload event listener', async () => {
    const { setupHealthCheck } = await import('../../js/modules/measurement-validator/monitoring/productionMonitoring.js');
    
    setupHealthCheck();
    
    // window.addEventListener should be called with beforeunload
    expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
  
  test('returns updateHealth function', async () => {
    const { setupHealthCheck } = await import('../../js/modules/measurement-validator/monitoring/productionMonitoring.js');
    
    const updateHealth = setupHealthCheck();
    
    expect(typeof updateHealth).toBe('function');
  });
});
