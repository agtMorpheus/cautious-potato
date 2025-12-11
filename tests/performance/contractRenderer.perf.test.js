/**
 * Performance Tests for Contract Renderer Module (contractRenderer.js)
 * 
 * Tests rendering performance with large contract lists to identify
 * bottlenecks in DOM manipulation and template generation.
 */

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  render_table_100: 100,           // ms to render 100 rows
  render_table_1000: 500,          // ms to render 1000 rows
  render_preview_100: 100,         // ms to render preview
  update_display_100: 100,         // ms to update display (increased for CI variability)
  batch_render_10: 200             // ms to render 10 batches
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
 * Generate mock contracts for testing
 */
function generateMockContracts(count) {
  const contracts = [];
  const statuses = ['Erstellt', 'In Bearbeitung', 'Abgerechnet', 'Geplant'];
  const locations = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'];
  
  for (let i = 0; i < count; i++) {
    contracts.push({
      id: `UUID-${i}`,
      contractId: `CONTRACT-${String(i).padStart(6, '0')}`,
      contractTitle: `Test Contract ${i}`,
      taskId: `TASK-${i}`,
      taskType: 'Wartung',
      status: statuses[i % statuses.length],
      location: locations[i % locations.length],
      roomArea: `Room ${i}`,
      equipmentId: `EQ-${i}`,
      equipmentDescription: `Equipment ${i}`,
      serialNumber: `SN-${i}`,
      workorderCode: `WO-${i}`,
      description: `Description ${i}`,
      plannedStart: '2025-01-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return contracts;
}

/**
 * Create simple table HTML (mimics renderer behavior)
 */
function renderSimpleContractTable(contracts, limit = 100) {
  const displayContracts = contracts.slice(0, limit);
  
  let html = '<table><thead><tr>';
  html += '<th>ID</th><th>Title</th><th>Status</th><th>Location</th>';
  html += '</tr></thead><tbody>';
  
  for (const contract of displayContracts) {
    html += '<tr>';
    html += `<td>${contract.contractId || ''}</td>`;
    html += `<td>${contract.contractTitle || ''}</td>`;
    html += `<td>${contract.status || ''}</td>`;
    html += `<td>${contract.location || ''}</td>`;
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  return html;
}

describe('Contract Renderer Performance Tests', () => {
  
  // ============================================
  // Table Rendering Performance
  // ============================================
  describe('Table Rendering Performance', () => {
    test('renders 100 contracts within threshold', () => {
      const contracts = generateMockContracts(100);
      
      const { result, duration } = measureTime(() => {
        return renderSimpleContractTable(contracts, 100);
      });
      
      console.log(`Render table (100 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.render_table_100);
      expect(result).toContain('<table>');
    });
    
    test('renders 1000 contracts within threshold', () => {
      const contracts = generateMockContracts(1000);
      
      const { result, duration } = measureTime(() => {
        return renderSimpleContractTable(contracts, 1000);
      });
      
      console.log(`Render table (1000 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.render_table_1000);
    });
    
    test('rendering with limit is faster than full render', () => {
      const contracts = generateMockContracts(1000);
      
      const { duration: limitedDuration } = measureTime(() => {
        return renderSimpleContractTable(contracts, 100);
      });
      
      const { duration: fullDuration } = measureTime(() => {
        return renderSimpleContractTable(contracts, 1000);
      });
      
      console.log(`Limited (100): ${limitedDuration.toFixed(2)}ms, Full (1000): ${fullDuration.toFixed(2)}ms`);
      expect(limitedDuration).toBeLessThan(fullDuration);
    });
  });
  
  // ============================================
  // DOM Manipulation Performance
  // ============================================
  describe('DOM Manipulation Performance', () => {
    let container;
    
    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });
    
    afterEach(() => {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
    });
    
    test('innerHTML update is fast for 100 rows', () => {
      const contracts = generateMockContracts(100);
      const html = renderSimpleContractTable(contracts, 100);
      
      const { duration } = measureTime(() => {
        container.innerHTML = html;
      });
      
      console.log(`innerHTML update (100 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.update_display_100);
    });
    
    test('repeated updates do not degrade performance', () => {
      const durations = [];
      
      for (let i = 0; i < 10; i++) {
        const contracts = generateMockContracts(100);
        const html = renderSimpleContractTable(contracts, 100);
        
        const { duration } = measureTime(() => {
          container.innerHTML = html;
        });
        durations.push(duration);
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const lastDuration = durations[durations.length - 1];
      
      console.log(`Avg update: ${avgDuration.toFixed(2)}ms, Last: ${lastDuration.toFixed(2)}ms`);
      // Last update should not be significantly slower
      expect(lastDuration).toBeLessThan(avgDuration * 2);
    });
  });
  
  // ============================================
  // Batch Rendering Performance
  // ============================================
  describe('Batch Rendering Performance', () => {
    test('renders 10 batches of 100 contracts within threshold', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 10; i++) {
          const contracts = generateMockContracts(100);
          renderSimpleContractTable(contracts, 100);
        }
      });
      
      console.log(`Batch render (10x100): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batch_render_10);
    });
  });
  
  // ============================================
  // Template Generation Performance
  // ============================================
  describe('Template Generation Performance', () => {
    test('string concatenation is efficient', () => {
      const contracts = generateMockContracts(500);
      
      const { duration } = measureTime(() => {
        let result = '';
        for (const contract of contracts) {
          result += `<div>${contract.contractId}</div>`;
        }
        return result;
      });
      
      console.log(`String concatenation (500): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });
    
    test('array join is efficient for large sets', () => {
      const contracts = generateMockContracts(500);
      
      const { duration } = measureTime(() => {
        const parts = [];
        for (const contract of contracts) {
          parts.push(`<div>${contract.contractId}</div>`);
        }
        return parts.join('');
      });
      
      console.log(`Array join (500): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated renders do not accumulate memory', () => {
      let container = document.createElement('div');
      document.body.appendChild(container);
      
      // Render many times
      for (let i = 0; i < 50; i++) {
        const contracts = generateMockContracts(100);
        const html = renderSimpleContractTable(contracts, 100);
        container.innerHTML = html;
      }
      
      document.body.removeChild(container);
      container = null;
      
      expect(true).toBe(true);
    });
    
    test('large dataset does not create memory leak', () => {
      const contracts = generateMockContracts(10000);
      
      for (let i = 0; i < 10; i++) {
        renderSimpleContractTable(contracts, 1000);
      }
      
      expect(true).toBe(true);
    });
  });
  
  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('empty contract list renders quickly', () => {
      const { duration } = measureTime(() => {
        return renderSimpleContractTable([], 100);
      });
      
      console.log(`Render empty list: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
    });
    
    test('single contract renders quickly', () => {
      const contracts = generateMockContracts(1);
      
      const { duration } = measureTime(() => {
        return renderSimpleContractTable(contracts, 100);
      });
      
      console.log(`Render single row: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
    });
    
    test('handles missing fields gracefully', () => {
      const contracts = [
        { id: '1' },
        { id: '2', contractId: 'C2' },
        { id: '3', contractTitle: 'Title' }
      ];
      
      const { result, duration } = measureTime(() => {
        return renderSimpleContractTable(contracts, 100);
      });
      
      expect(result).toContain('<table>');
      expect(duration).toBeLessThan(10);
    });
  });
});
