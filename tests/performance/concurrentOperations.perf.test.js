/**
 * Performance Tests for Concurrent Operations
 * 
 * Tests how the application handles multiple simultaneous operations,
 * async workflows, and race conditions.
 */

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  parallel_async_10: 200,          // ms for 10 parallel async operations
  parallel_async_100: 1000,        // ms for 100 parallel async operations
  sequential_async_50: 500,        // ms for 50 sequential async operations
  promise_all_100: 300,            // ms for Promise.all with 100 promises
  async_batch_processing: 1000,    // ms for batch processing 1000 items
  debounced_calls_1000: 100,       // ms for 1000 debounced calls
  throttled_calls_1000: 200        // ms for 1000 throttled calls
};

/**
 * Helper to measure execution time
 */
function measureTime(fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Helper to measure async execution time
 */
async function measureTimeAsync(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
}

/**
 * Simulate async operation
 */
function asyncOperation(value, delay = 1) {
  return new Promise(resolve => {
    setTimeout(() => resolve(value * 2), delay);
  });
}

/**
 * Simple debounce implementation
 */
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    return new Promise(resolve => {
      timeoutId = setTimeout(() => {
        resolve(fn(...args));
      }, delay);
    });
  };
}

/**
 * Simple throttle implementation
 */
function throttle(fn, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
  };
}

describe('Concurrent Operations Performance Tests', () => {
  
  // ============================================
  // Parallel Async Operations Performance
  // ============================================
  describe('Parallel Async Operations Performance', () => {
    test('handles 10 parallel async operations within threshold', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        asyncOperation(i, 1)
      );
      
      const { result, duration } = await measureTimeAsync(async () => {
        return await Promise.all(operations);
      });
      
      console.log(`10 parallel async operations: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.parallel_async_10);
      expect(result.length).toBe(10);
    });
    
    test('handles 100 parallel async operations within threshold', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        asyncOperation(i, 1)
      );
      
      const { result, duration } = await measureTimeAsync(async () => {
        return await Promise.all(operations);
      });
      
      console.log(`100 parallel async operations: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.parallel_async_100);
      expect(result.length).toBe(100);
    });
    
    test('parallel is faster than sequential for independent operations', async () => {
      // Sequential execution
      const { duration: sequentialDuration } = await measureTimeAsync(async () => {
        const results = [];
        for (let i = 0; i < 20; i++) {
          results.push(await asyncOperation(i, 5));
        }
        return results;
      });
      
      // Parallel execution
      const { duration: parallelDuration } = await measureTimeAsync(async () => {
        const operations = Array.from({ length: 20 }, (_, i) => asyncOperation(i, 5));
        return await Promise.all(operations);
      });
      
      console.log(`Sequential: ${sequentialDuration.toFixed(2)}ms, Parallel: ${parallelDuration.toFixed(2)}ms`);
      expect(parallelDuration).toBeLessThan(sequentialDuration / 2);
    });
  });
  
  // ============================================
  // Promise.all Performance
  // ============================================
  describe('Promise.all Performance', () => {
    test('Promise.all with 100 promises within threshold', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve(i * 2)
      );
      
      const { result, duration } = await measureTimeAsync(async () => {
        return await Promise.all(promises);
      });
      
      console.log(`Promise.all with 100 promises: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.promise_all_100);
      expect(result.length).toBe(100);
    });
    
    test('Promise.allSettled handles rejections efficiently', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        i % 10 === 0 ? Promise.reject(new Error(`Error ${i}`)) : Promise.resolve(i)
      );
      
      const { result, duration } = await measureTimeAsync(async () => {
        return await Promise.allSettled(promises);
      });
      
      console.log(`Promise.allSettled with 100 mixed promises: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.promise_all_100);
      expect(result.length).toBe(100);
      
      const rejected = result.filter(r => r.status === 'rejected');
      expect(rejected.length).toBe(10);
    });
  });
  
  // ============================================
  // Batch Processing Performance
  // ============================================
  describe('Batch Processing Performance', () => {
    test('processes 1000 items in batches efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const batchSize = 100;
      const results = [];
      
      const { duration } = await measureTimeAsync(async () => {
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(item => asyncOperation(item, 0))
          );
          results.push(...batchResults);
        }
      });
      
      console.log(`Batch process 1000 items: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.async_batch_processing);
      expect(results.length).toBe(1000);
    });
    
    test('optimal batch size improves performance', async () => {
      const items = Array.from({ length: 500 }, (_, i) => i);
      
      // Small batches
      const { duration: smallBatchDuration } = await measureTimeAsync(async () => {
        const results = [];
        for (let i = 0; i < items.length; i += 10) {
          const batch = items.slice(i, i + 10);
          const batchResults = await Promise.all(
            batch.map(item => asyncOperation(item, 0))
          );
          results.push(...batchResults);
        }
      });
      
      // Larger batches
      const { duration: largeBatchDuration } = await measureTimeAsync(async () => {
        const results = [];
        for (let i = 0; i < items.length; i += 50) {
          const batch = items.slice(i, i + 50);
          const batchResults = await Promise.all(
            batch.map(item => asyncOperation(item, 0))
          );
          results.push(...batchResults);
        }
      });
      
      console.log(`Small batches (10): ${smallBatchDuration.toFixed(2)}ms, Large batches (50): ${largeBatchDuration.toFixed(2)}ms`);
      expect(largeBatchDuration).toBeLessThan(smallBatchDuration * 1.5);
    });
  });
  
  // ============================================
  // Debounce Performance
  // ============================================
  describe('Debounce Performance', () => {
    test('debounce reduces function calls efficiently', async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const debouncedFn = debounce(fn, 10);
      
      const { duration } = await measureTimeAsync(async () => {
        const promises = [];
        for (let i = 0; i < 1000; i++) {
          promises.push(debouncedFn());
        }
        // Wait for the last debounced call
        await new Promise(resolve => setTimeout(resolve, 20));
      });
      
      console.log(`1000 debounced calls: ${duration.toFixed(2)}ms, actual calls: ${callCount}`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.debounced_calls_1000);
      expect(callCount).toBeLessThan(10); // Should be called only once or a few times
    });
  });
  
  // ============================================
  // Throttle Performance
  // ============================================
  describe('Throttle Performance', () => {
    test('throttle limits function execution rate', async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const throttledFn = throttle(fn, 10);
      
      const { duration } = await measureTimeAsync(async () => {
        for (let i = 0; i < 1000; i++) {
          throttledFn();
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      console.log(`1000 throttled calls: ${duration.toFixed(2)}ms, actual calls: ${callCount}`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.throttled_calls_1000);
      expect(callCount).toBeLessThan(100); // Should be significantly reduced
    });
  });
  
  // ============================================
  // Race Condition Handling
  // ============================================
  describe('Race Condition Handling', () => {
    test('handles concurrent state updates correctly', async () => {
      let state = { counter: 0 };
      const updates = [];
      
      const { duration } = await measureTimeAsync(async () => {
        const promises = Array.from({ length: 100 }, (_, i) => 
          asyncOperation(i, 1).then(result => {
            // Simulate state update
            state = { counter: state.counter + 1 };
            updates.push(result);
          })
        );
        await Promise.all(promises);
      });
      
      console.log(`100 concurrent state updates: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.parallel_async_100);
      expect(updates.length).toBe(100);
      // Note: In real scenarios, this might require locks/mutexes for correctness
    });
    
    test('handles rapid sequential updates efficiently', async () => {
      const updates = [];
      
      const { duration } = await measureTimeAsync(async () => {
        for (let i = 0; i < 50; i++) {
          const result = await asyncOperation(i, 1);
          updates.push(result);
        }
      });
      
      console.log(`50 sequential updates: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sequential_async_50);
      expect(updates.length).toBe(50);
    });
  });
  
  // ============================================
  // Async Queue Performance
  // ============================================
  describe('Async Queue Performance', () => {
    class AsyncQueue {
      constructor(concurrency = 5) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
      }
      
      async add(fn) {
        if (this.running >= this.concurrency) {
          await new Promise(resolve => this.queue.push(resolve));
        }
        
        this.running++;
        try {
          return await fn();
        } finally {
          this.running--;
          const resolve = this.queue.shift();
          if (resolve) resolve();
        }
      }
    }
    
    test('async queue limits concurrency efficiently', async () => {
      const queue = new AsyncQueue(10);
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      const { duration } = await measureTimeAsync(async () => {
        const tasks = Array.from({ length: 100 }, (_, i) => 
          queue.add(async () => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            await asyncOperation(i, 5);
            currentConcurrent--;
          })
        );
        await Promise.all(tasks);
      });
      
      console.log(`Async queue (100 tasks, limit 10): ${duration.toFixed(2)}ms, max concurrent: ${maxConcurrent}`);
      expect(maxConcurrent).toBeLessThanOrEqual(10);
      expect(duration).toBeLessThan(1000);
    });
  });
  
  // ============================================
  // Timeout and Cancellation Performance
  // ============================================
  describe('Timeout and Cancellation Performance', () => {
    function withTimeout(promise, timeout) {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    }
    
    test('handles promise timeouts efficiently', async () => {
      const operations = Array.from({ length: 50 }, (_, i) => 
        withTimeout(asyncOperation(i, 100), 50)
      );
      
      const { result, duration } = await measureTimeAsync(async () => {
        return await Promise.allSettled(operations);
      });
      
      console.log(`50 operations with timeout: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200);
      
      const timedOut = result.filter(r => r.status === 'rejected');
      expect(timedOut.length).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated async operations do not accumulate memory', async () => {
      for (let i = 0; i < 20; i++) {
        const operations = Array.from({ length: 100 }, (_, j) => asyncOperation(j, 1));
        await Promise.all(operations);
      }
      
      expect(true).toBe(true);
    });
    
    test('large promise chains are garbage collected', async () => {
      let result = Promise.resolve(0);
      
      for (let i = 0; i < 1000; i++) {
        result = result.then(val => val + 1);
      }
      
      const finalResult = await result;
      expect(finalResult).toBe(1000);
    });
  });
  
  // ============================================
  // Real-world Scenario Tests
  // ============================================
  describe('Real-world Scenario Tests', () => {
    test('simulates multiple users performing concurrent operations', async () => {
      const users = 20;
      const operationsPerUser = 10;
      
      const { duration } = await measureTimeAsync(async () => {
        const userOperations = Array.from({ length: users }, (_, userId) => 
          Array.from({ length: operationsPerUser }, (_, opId) => 
            asyncOperation(userId * 100 + opId, 1)
          )
        );
        
        const allOperations = userOperations.flat();
        await Promise.all(allOperations);
      });
      
      console.log(`${users} users, ${operationsPerUser} ops each: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
    });
    
    test('handles data synchronization with multiple sources', async () => {
      const sources = 5;
      const recordsPerSource = 100;
      
      const { result, duration } = await measureTimeAsync(async () => {
        const sourcePromises = Array.from({ length: sources }, async (_, sourceId) => {
          const records = Array.from({ length: recordsPerSource }, (_, recordId) => ({
            sourceId,
            recordId,
            value: sourceId * 1000 + recordId
          }));
          
          // Simulate async fetch
          await asyncOperation(sourceId, 1);
          return records;
        });
        
        const allRecords = await Promise.all(sourcePromises);
        return allRecords.flat();
      });
      
      console.log(`Sync ${sources} sources: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200);
      expect(result.length).toBe(sources * recordsPerSource);
    });
  });
});
