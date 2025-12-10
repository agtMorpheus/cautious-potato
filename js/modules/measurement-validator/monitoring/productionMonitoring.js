/**
 * Production Monitoring Module
 * Tracks validation performance and error metrics in production
 * 
 * Features:
 * - Validation execution tracking
 * - Performance metrics collection
 * - Error logging and aggregation
 * - Health status reporting
 */

/**
 * ProductionMonitoring class - Tracks validation metrics
 */
export class ProductionMonitoring {
  constructor() {
    this.metrics = {
      validationExecutions: 0,
      validationErrors: 0,
      totalDuration: 0,
      averageExecutionTime: 0,
      slowestExecution: 0,
      fastestExecution: Infinity,
      slowQueries: [],     // Validations >10ms
      errors: [],
      lastReset: new Date().toISOString(),
    };
    
    // Configuration
    this.config = {
      slowThresholdMs: 10,
      maxSlowQueries: 100,
      maxErrors: 100,
      healthErrorRateThreshold: 0.01, // 1%
    };
  }

  /**
   * Track a validation execution
   * @param {string} circuitId - Circuit ID that was validated
   * @param {number} duration - Execution time in ms
   * @param {boolean} success - Whether validation completed successfully
   * @param {string} errorMessage - Error message if not successful
   */
  trackValidation(circuitId, duration, success, errorMessage = null) {
    this.metrics.validationExecutions++;
    this.metrics.totalDuration += duration;
    
    // Update average execution time
    this.metrics.averageExecutionTime = 
      this.metrics.totalDuration / this.metrics.validationExecutions;
    
    // Update fastest/slowest
    this.metrics.slowestExecution = Math.max(this.metrics.slowestExecution, duration);
    if (duration < this.metrics.fastestExecution) {
      this.metrics.fastestExecution = duration;
    }
    
    // Track slow validations
    if (duration > this.config.slowThresholdMs) {
      this.metrics.slowQueries.push({
        circuitId,
        duration,
        timestamp: new Date().toISOString(),
      });
      
      // Trim old slow queries
      if (this.metrics.slowQueries.length > this.config.maxSlowQueries) {
        this.metrics.slowQueries.shift();
      }
    }
    
    // Track errors
    if (!success) {
      this.metrics.validationErrors++;
      this.logError(circuitId, errorMessage);
    }
  }

  /**
   * Log a validation error
   * @param {string} circuitId - Circuit ID
   * @param {string} message - Error message
   */
  logError(circuitId, message) {
    const error = {
      circuitId,
      message,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
    
    this.metrics.errors.push(error);
    
    // Trim old errors
    if (this.metrics.errors.length > this.config.maxErrors) {
      this.metrics.errors.shift();
    }
    
    // Optional: Send to error tracking service
    if (typeof window !== 'undefined' && window.errorTracker) {
      window.errorTracker.captureException(error);
    }
    
    // Log to console in development
    console.error('[ValidationMonitor] Error:', error);
  }

  /**
   * Get current health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const executions = this.metrics.validationExecutions;
    const errors = this.metrics.validationErrors;
    const errorRate = executions > 0 ? errors / executions : 0;
    
    return {
      healthy: errorRate < this.config.healthErrorRateThreshold,
      status: errorRate < 0.001 ? 'excellent' : 
              errorRate < 0.01 ? 'good' : 
              errorRate < 0.05 ? 'degraded' : 'critical',
      errorRate: (errorRate * 100).toFixed(2) + '%',
      averageExecutionTime: this.metrics.averageExecutionTime.toFixed(2) + 'ms',
      fastestExecution: this.metrics.fastestExecution === Infinity ? 
                        'N/A' : this.metrics.fastestExecution.toFixed(2) + 'ms',
      slowestExecution: this.metrics.slowestExecution.toFixed(2) + 'ms',
      slowQueries: this.metrics.slowQueries.length,
      totalExecutions: executions,
      totalErrors: errors,
    };
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    return {
      executions: this.metrics.validationExecutions,
      avgTime: this.metrics.averageExecutionTime.toFixed(2),
      minTime: this.metrics.fastestExecution === Infinity ? 
               0 : this.metrics.fastestExecution.toFixed(2),
      maxTime: this.metrics.slowestExecution.toFixed(2),
      slowCount: this.metrics.slowQueries.length,
      errorCount: this.metrics.validationErrors,
      unit: 'ms',
    };
  }

  /**
   * Get recent slow queries
   * @param {number} limit - Max number to return
   * @returns {Object[]} Recent slow queries
   */
  getSlowQueries(limit = 10) {
    return [...this.metrics.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get recent errors
   * @param {number} limit - Max number to return
   * @returns {Object[]} Recent errors
   */
  getRecentErrors(limit = 10) {
    return [...this.metrics.errors]
      .slice(-limit)
      .reverse();
  }

  /**
   * Export all metrics for analysis
   * @returns {Object} Complete metrics export
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      ...this.metrics,
      health: this.getHealthStatus(),
      performance: this.getPerformanceSummary(),
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      validationExecutions: 0,
      validationErrors: 0,
      totalDuration: 0,
      averageExecutionTime: 0,
      slowestExecution: 0,
      fastestExecution: Infinity,
      slowQueries: [],
      errors: [],
      lastReset: new Date().toISOString(),
    };
  }
}

// Global monitoring instance
export const productionMonitor = new ProductionMonitoring();

/**
 * Wrap a validation function with monitoring
 * @param {Function} validateFn - Original validation function
 * @param {ProductionMonitoring} monitor - Monitor instance (defaults to global)
 * @returns {Function} Wrapped function
 */
export function withMonitoring(validateFn, monitor = productionMonitor) {
  return function monitoredValidation(circuitData, ...args) {
    const start = performance.now();
    const circuitId = circuitData?.id || 'unknown';
    
    try {
      const result = validateFn.call(this, circuitData, ...args);
      const duration = performance.now() - start;
      monitor.trackValidation(circuitId, duration, true);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      monitor.trackValidation(circuitId, duration, false, error.message);
      throw error;
    }
  };
}

/**
 * Setup health check endpoint data
 * Stores health data for monitoring systems to retrieve
 */
export function setupHealthCheck() {
  // Store health data in localStorage for retrieval
  const updateHealth = () => {
    const health = productionMonitor.getHealthStatus();
    const data = {
      ...health,
      timestamp: new Date().toISOString(),
      app: 'abrechnung-validator',
      version: '1.0.0',
    };
    
    try {
      localStorage.setItem('validator_health', JSON.stringify(data));
    } catch (e) {
      // localStorage might not be available
    }
    
    return data;
  };
  
  // Update every 30 seconds
  setInterval(updateHealth, 30000);
  
  // Initial update
  updateHealth();
  
  // Send health data before page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const health = productionMonitor.exportMetrics();
      
      // Try to send via beacon
      if (navigator.sendBeacon) {
        try {
          navigator.sendBeacon('/api/health', JSON.stringify(health));
        } catch (e) {
          // Silently fail
        }
      }
    });
  }
  
  return updateHealth;
}

/**
 * Get dashboard data for performance monitoring UI
 * @param {Object} state - Application state with circuit data
 * @returns {Object} Dashboard data
 */
export function getPerformanceDashboard(state = {}) {
  const circuits = state.circuitTable || [];
  
  const validCount = circuits.filter(c => 
    !c.validationState?.hasNonConformities
  ).length;
  
  const issueCount = circuits.filter(c => 
    c.validationState?.hasNonConformities
  ).length;
  
  const criticalCount = circuits.reduce((sum, c) => 
    sum + (c.validationState?.criticalCount || 0), 0
  );
  
  return {
    systemHealth: productionMonitor.getHealthStatus(),
    circuitStats: {
      total: circuits.length,
      valid: validCount,
      withIssues: issueCount,
      critical: criticalCount,
    },
    performanceMetrics: productionMonitor.getPerformanceSummary(),
    recentSlowQueries: productionMonitor.getSlowQueries(5),
    recentErrors: productionMonitor.getRecentErrors(5),
  };
}
