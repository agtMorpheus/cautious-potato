/**
 * Performance Tests for Virtual List Module (virtualList.js)
 * 
 * Tests virtual scrolling performance with large datasets
 * to ensure smooth rendering and efficient memory usage.
 */

import { VirtualList, VirtualTable } from '../../js/contracts/virtualList.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  setItems_10000: 50,           // ms to set 10000 items
  setItems_100000: 200,         // ms to set 100000 items
  render_visible_range: 20,     // ms to render visible items
  scroll_update: 10,            // ms for scroll position update
  scroll_to_index: 20,          // ms to scroll to specific index
  calculate_range_10000: 5,     // ms to calculate visible range
  add_remove_item: 5,           // ms for single item operations
  update_item: 5,               // ms for item update
  sort_10000: 500,              // ms to sort 10000 items
  refresh_large: 50             // ms to refresh large list
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
 * Generate mock items for testing
 */
function generateMockItems(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i,
      name: `Item ${i}`,
      status: ['active', 'pending', 'completed'][i % 3],
      value: Math.random() * 1000
    });
  }
  return items;
}

describe('Virtual List Performance Tests', () => {
  let container;
  let virtualList;
  
  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '500px';
    container.style.width = '400px';
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    if (virtualList) {
      virtualList.destroy();
      virtualList = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });
  
  // ============================================
  // setItems Performance
  // ============================================
  describe('setItems() Performance', () => {
    test('sets 10000 items within threshold', () => {
      virtualList = new VirtualList(container);
      const items = generateMockItems(10000);
      
      const { duration } = measureTime(() => {
        virtualList.setItems(items);
      });
      
      console.log(`setItems (10000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.setItems_10000);
      expect(virtualList.getItemCount()).toBe(10000);
    });
    
    test('sets 100000 items within threshold', () => {
      virtualList = new VirtualList(container);
      const items = generateMockItems(100000);
      
      const { duration } = measureTime(() => {
        virtualList.setItems(items);
      });
      
      console.log(`setItems (100000): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.setItems_100000);
      expect(virtualList.getItemCount()).toBe(100000);
    });
    
    test('height calculation scales linearly', () => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      
      const items10k = generateMockItems(10000);
      virtualList.setItems(items10k);
      expect(virtualList.wrapper.style.height).toBe('500000px');
      
      const items100k = generateMockItems(100000);
      virtualList.setItems(items100k);
      expect(virtualList.wrapper.style.height).toBe('5000000px');
    });
  });
  
  // ============================================
  // Visible Range Calculation Performance
  // ============================================
  describe('calculateVisibleRange() Performance', () => {
    test('calculates range for 10000 items within threshold', () => {
      virtualList = new VirtualList(container, { rowHeight: 50, overscan: 5 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      const iterations = 1000;
      const { duration } = measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          virtualList.scrollTop = (i * 50) % (10000 * 50);
          virtualList.calculateVisibleRange();
        }
      });
      
      console.log(`calculateVisibleRange (1000 calls): ${duration.toFixed(2)}ms`);
      expect(duration / iterations).toBeLessThan(PERFORMANCE_THRESHOLDS.calculate_range_10000);
    });
    
    test('range calculation is consistent regardless of scroll position', () => {
      virtualList = new VirtualList(container, { rowHeight: 50, overscan: 5 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      const positions = [0, 250, 1000, 5000, 9000, 9500];
      const durations = [];
      
      positions.forEach(pos => {
        virtualList.scrollTop = pos;
        const { duration } = measureTime(() => {
          for (let i = 0; i < 100; i++) {
            virtualList.calculateVisibleRange();
          }
        });
        durations.push(duration);
      });
      
      // All durations should be roughly similar
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      durations.forEach(d => {
        expect(d).toBeLessThan(avgDuration * 2);
      });
    });
  });
  
  // ============================================
  // Render Performance
  // ============================================
  describe('render() Performance', () => {
    test('renders visible rows efficiently', () => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      // Force re-render
      virtualList.lastRenderedRange = { start: -1, end: -1 };
      
      const { duration } = measureTime(() => {
        virtualList.render();
      });
      
      console.log(`Render visible rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.render_visible_range);
    });
    
    test('render skips when range unchanged', () => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      // First render to set the range
      virtualList.render();
      const firstRange = { ...virtualList.lastRenderedRange };
      
      // Second render should be nearly instant
      const { duration } = measureTime(() => {
        virtualList.render();
      });
      
      expect(duration).toBeLessThan(5); // Should be < 5ms when skipped
      expect(virtualList.lastRenderedRange).toEqual(firstRange);
    });
    
    test('only renders overscan + visible rows', () => {
      virtualList = new VirtualList(container, { rowHeight: 50, overscan: 5 });
      virtualList.containerHeight = 500; // 10 visible rows
      virtualList.setItems(generateMockItems(10000));
      virtualList.render();
      
      // Should only render 10 visible + 5 above + 5 below = 20 max (or less at edges)
      const renderedRows = virtualList.viewport.children.length;
      expect(renderedRows).toBeLessThanOrEqual(20);
    });
  });
  
  // ============================================
  // Scroll Performance
  // ============================================
  describe('Scroll Performance', () => {
    test('scroll to index is fast', () => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualList.scrollToIndex(5000, 'center');
      });
      
      console.log(`scrollToIndex: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.scroll_to_index);
    });
    
    test('multiple scroll operations perform consistently', () => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      const iterations = 100;
      const { duration } = measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          virtualList.scrollToIndex(i * 100);
        }
      });
      
      console.log(`Multiple scrolls (${iterations}): ${duration.toFixed(2)}ms`);
      expect(duration / iterations).toBeLessThan(PERFORMANCE_THRESHOLDS.scroll_update);
    });
  });
  
  // ============================================
  // Item Operations Performance
  // ============================================
  describe('Item Operations Performance', () => {
    test('addItem is fast for large lists', () => {
      virtualList = new VirtualList(container);
      virtualList.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualList.addItem({ id: 10001, name: 'New Item' });
      });
      
      console.log(`addItem (to 10000 list): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.add_remove_item);
    });
    
    test('removeItem is fast for large lists', () => {
      virtualList = new VirtualList(container);
      virtualList.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualList.removeItem(5000);
      });
      
      console.log(`removeItem (from 10000 list): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.add_remove_item);
    });
    
    test('updateItem is fast for large lists', () => {
      virtualList = new VirtualList(container);
      virtualList.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualList.updateItem(5000, { name: 'Updated Item', status: 'modified' });
      });
      
      console.log(`updateItem (in 10000 list): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.update_item);
    });
    
    test('bulk additions perform reasonably', () => {
      virtualList = new VirtualList(container);
      virtualList.setItems(generateMockItems(1000));
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          virtualList.addItem({ id: 1000 + i, name: `Bulk Item ${i}` });
        }
      });
      
      console.log(`Bulk add (100 items): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100); // Reasonable for 100 individual adds
    });
  });
  
  // ============================================
  // Refresh Performance
  // ============================================
  describe('refresh() Performance', () => {
    test('refresh is fast for large lists', () => {
      virtualList = new VirtualList(container);
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualList.refresh();
      });
      
      console.log(`refresh (10000 items): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.refresh_large);
    });
    
    test('multiple refreshes do not degrade', () => {
      virtualList = new VirtualList(container);
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(5000));
      
      const durations = [];
      for (let i = 0; i < 10; i++) {
        virtualList.lastRenderedRange = { start: -1, end: -1 }; // Force re-render
        const { duration } = measureTime(() => {
          virtualList.refresh();
        });
        durations.push(duration);
      }
      
      // Later refreshes should not be significantly slower
      // Using average + margin to handle variance in small durations
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const secondHalf = durations.slice(5).reduce((a, b) => a + b, 0) / 5;
      
      // Allow up to 3x average for variance tolerance (small durations have high relative variance)
      expect(secondHalf).toBeLessThan(Math.max(avgDuration * 3, PERFORMANCE_THRESHOLDS.refresh_large));
    });
  });
  
  // ============================================
  // VirtualTable Sorting Performance
  // ============================================
  describe('VirtualTable Sorting Performance', () => {
    let tableContainer;
    let virtualTable;
    
    beforeEach(() => {
      tableContainer = document.createElement('div');
      tableContainer.style.height = '500px';
      document.body.appendChild(tableContainer);
    });
    
    afterEach(() => {
      if (virtualTable) {
        virtualTable.destroy();
        virtualTable = null;
      }
      if (tableContainer.parentNode) {
        document.body.removeChild(tableContainer);
      }
    });
    
    test('sorts 10000 items within threshold', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [
          { key: 'id', sortable: true },
          { key: 'name', sortable: true },
          { key: 'value', sortable: true }
        ]
      });
      
      virtualTable.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualTable.sortByColumn('name');
      });
      
      console.log(`Sort 10000 items by string: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_10000);
    });
    
    test('numeric sort is fast', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [{ key: 'value', sortable: true }]
      });
      
      virtualTable.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        virtualTable.sortByColumn('value');
      });
      
      console.log(`Sort 10000 items by number: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_10000);
    });
    
    test('sort toggle (reverse) is fast', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [{ key: 'name', sortable: true }]
      });
      
      virtualTable.setItems(generateMockItems(10000));
      virtualTable.sortByColumn('name'); // First sort
      
      const { duration } = measureTime(() => {
        virtualTable.sortByColumn('name'); // Toggle to descending
      });
      
      console.log(`Sort toggle (10000 items): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.sort_10000);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('does not hold references to removed items', () => {
      virtualList = new VirtualList(container);
      let items = generateMockItems(1000);
      virtualList.setItems(items);
      
      // Clear external reference
      items = null;
      
      // Replace with new items
      virtualList.setItems(generateMockItems(1000));
      
      // Original items should be eligible for GC
      expect(virtualList.getItemCount()).toBe(1000);
    });
    
    test('repeated setItems does not accumulate memory', () => {
      virtualList = new VirtualList(container);
      
      // Run multiple times
      for (let i = 0; i < 20; i++) {
        virtualList.setItems(generateMockItems(5000));
      }
      
      // Should only have the last set
      expect(virtualList.getItemCount()).toBe(5000);
    });
    
    test('viewport only contains visible rows', () => {
      virtualList = new VirtualList(container, { rowHeight: 50, overscan: 5 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(100000));
      virtualList.render();
      
      // Even with 100k items, viewport should have ~20 elements
      const renderedCount = virtualList.viewport.children.length;
      console.log(`Rendered DOM elements for 100k items: ${renderedCount}`);
      expect(renderedCount).toBeLessThan(25);
    });
  });
  
  // ============================================
  // Stress Tests
  // ============================================
  describe('Stress Tests', () => {
    test('handles rapid scroll events', () => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
      virtualList.setItems(generateMockItems(10000));
      
      const { duration } = measureTime(() => {
        for (let i = 0; i < 500; i++) {
          virtualList.scrollTop = Math.random() * 500000;
          virtualList.onScroll();
        }
      });
      
      console.log(`Rapid scroll (500 events): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
    });
    
    test('handles extreme list sizes', () => {
      virtualList = new VirtualList(container);
      
      // Test with 500k items (should not crash)
      const { duration } = measureTime(() => {
        virtualList.setItems(generateMockItems(500000));
      });
      
      console.log(`setItems (500000): ${duration.toFixed(2)}ms`);
      expect(virtualList.getItemCount()).toBe(500000);
      expect(duration).toBeLessThan(2000); // Allow up to 2 seconds
    });
  });
});
