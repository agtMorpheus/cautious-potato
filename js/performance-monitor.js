/**
 * Performance Monitor (Phase 5)
 * 
 * Monitors application performance and provides optimization insights
 * Implements Phase 5 performance requirements
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
        this.isEnabled = true;
        this.thresholds = {
            initialization: 500, // ms
            moduleLoad: 200,     // ms
            stateUpdate: 50,     // ms
            uiRender: 100,       // ms
            memoryUsage: 50      // MB
        };
    }

    /**
     * Start measuring a performance metric
     * @param {string} name - Metric name
     */
    startMeasure(name) {
        if (!this.isEnabled) return;
        
        this.metrics.set(name, {
            startTime: performance.now(),
            startMemory: this.getMemoryUsage()
        });
    }

    /**
     * End measuring a performance metric
     * @param {string} name - Metric name
     * @returns {Object} Performance data
     */
    endMeasure(name) {
        if (!this.isEnabled || !this.metrics.has(name)) return null;
        
        const startData = this.metrics.get(name);
        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();
        
        const result = {
            name,
            duration: Math.round(endTime - startData.startTime),
            memoryDelta: endMemory - startData.startMemory,
            timestamp: new Date().toISOString(),
            threshold: this.thresholds[name] || null,
            withinThreshold: null
        };
        
        if (result.threshold) {
            result.withinThreshold = result.duration <= result.threshold;
        }
        
        this.metrics.delete(name);
        this.notifyObservers(result);
        
        return result;
    }

    /**
     * Measure a function execution
     * @param {string} name - Metric name
     * @param {Function} fn - Function to measure
     * @returns {*} Function result
     */
    measure(name, fn) {
        this.startMeasure(name);
        try {
            const result = fn();
            if (result && typeof result.then === 'function') {
                // Handle async functions
                return result.finally(() => this.endMeasure(name));
            } else {
                this.endMeasure(name);
                return result;
            }
        } catch (error) {
            this.endMeasure(name);
            throw error;
        }
    }

    /**
     * Get current memory usage (if available)
     * @returns {number} Memory usage in MB
     */
    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        return 0;
    }

    /**
     * Get performance summary
     * @returns {Object} Performance summary
     */
    getSummary() {
        const entries = performance.getEntriesByType('measure');
        const navigation = performance.getEntriesByType('navigation')[0];
        
        return {
            loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : null,
            domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) : null,
            memoryUsage: this.getMemoryUsage(),
            customMetrics: entries.map(entry => ({
                name: entry.name,
                duration: Math.round(entry.duration),
                startTime: Math.round(entry.startTime)
            }))
        };
    }

    /**
     * Check if performance is within acceptable thresholds
     * @returns {Object} Performance health check
     */
    healthCheck() {
        const summary = this.getSummary();
        const issues = [];
        
        // Check load time
        if (summary.loadTime && summary.loadTime > 2000) {
            issues.push(`Slow page load: ${summary.loadTime}ms (threshold: 2000ms)`);
        }
        
        // Check memory usage
        if (summary.memoryUsage > this.thresholds.memoryUsage) {
            issues.push(`High memory usage: ${summary.memoryUsage}MB (threshold: ${this.thresholds.memoryUsage}MB)`);
        }
        
        // Check DOM content loaded
        if (summary.domContentLoaded && summary.domContentLoaded > 1000) {
            issues.push(`Slow DOM ready: ${summary.domContentLoaded}ms (threshold: 1000ms)`);
        }
        
        return {
            healthy: issues.length === 0,
            issues,
            summary
        };
    }

    /**
     * Add performance observer
     * @param {Function} callback - Observer callback
     */
    addObserver(callback) {
        this.observers.push(callback);
    }

    /**
     * Remove performance observer
     * @param {Function} callback - Observer callback
     */
    removeObserver(callback) {
        const index = this.observers.indexOf(callback);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notify all observers of performance data
     * @param {Object} data - Performance data
     */
    notifyObservers(data) {
        this.observers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.warn('Performance observer error:', error);
            }
        });
    }

    /**
     * Enable performance monitoring
     */
    enable() {
        this.isEnabled = true;
    }

    /**
     * Disable performance monitoring
     */
    disable() {
        this.isEnabled = false;
        this.metrics.clear();
    }

    /**
     * Log performance data to console
     * @param {Object} data - Performance data
     */
    logPerformance(data) {
        const status = data.withinThreshold ? '✓' : '⚠️';
        const threshold = data.threshold ? ` (threshold: ${data.threshold}ms)` : '';
        
        console.log(`[Performance] ${status} ${data.name}: ${data.duration}ms${threshold}`);
        
        if (data.memoryDelta > 0) {
            console.log(`[Performance] Memory delta: +${data.memoryDelta}MB`);
        }
    }

    /**
     * Export performance data
     * @returns {Object} Exportable performance data
     */
    export() {
        return {
            timestamp: new Date().toISOString(),
            summary: this.getSummary(),
            healthCheck: this.healthCheck(),
            thresholds: this.thresholds
        };
    }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Add console logging observer
performanceMonitor.addObserver(data => {
    if (data.withinThreshold === false) {
        performanceMonitor.logPerformance(data);
    }
});

// Export for use in other modules
export default performanceMonitor;

// Also make available globally for debugging
if (typeof window !== 'undefined') {
    window.performanceMonitor = performanceMonitor;
}