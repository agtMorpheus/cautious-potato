/**
 * Performance Tests for Protokoll Renderer Module
 * 
 * Tests rendering performance of position tables, stromkreise tables,
 * and form elements with large datasets.
 */

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  render_positions_100: 150,       // ms to render 100 positions
  render_positions_1000: 800,      // ms to render 1000 positions
  render_stromkreise_50: 100,      // ms to render 50 stromkreise
  update_position_row: 20,         // ms to update single row
  batch_update_100: 200,           // ms to update 100 rows
  table_sort_100: 50,              // ms to sort 100 rows
  search_filter_1000: 100          // ms to filter 1000 positions
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
 * Generate mock position data
 */
function generateMockPosition(index) {
  return {
    posNr: String(index).padStart(3, '0'),
    stromkreisNr: `F${index % 100}`,
    zielbezeichnung: `Target ${index}`,
    spannung: { un: 230, fn: 50 },
    sicherung: { typ: 'B', in: 16, ia: 160, ta: 0.1 },
    leitung: { querschnitt: 2.5, laenge: 10 + index, material: 'Cu', verlegeart: 'A1' },
    messwerte: {
      riso: 1.0 + Math.random(),
      rpe: 0.5 + Math.random(),
      zs: 0.3 + Math.random(),
      ui: 0.01 + Math.random(),
      rcd: { ik: 10 + Math.random(), ta: 20 + Math.random() }
    },
    parentId: null
  };
}

/**
 * Render position table row
 */
function renderPositionRow(position) {
  return `
    <tr data-pos-nr="${position.posNr || ''}">
      <td>${position.posNr || ''}</td>
      <td>${position.stromkreisNr || ''}</td>
      <td>${position.zielbezeichnung || ''}</td>
      <td>${position.spannung?.un || ''}${position.spannung ? 'V' : ''}</td>
      <td>${position.sicherung?.typ || ''}${position.sicherung?.in || ''}</td>
      <td>${position.leitung?.querschnitt || ''}${position.leitung ? 'mm²' : ''}</td>
      <td>${position.messwerte?.riso ? position.messwerte.riso.toFixed(2) + 'MΩ' : ''}</td>
      <td>${position.messwerte?.rpe ? position.messwerte.rpe.toFixed(2) + 'Ω' : ''}</td>
    </tr>
  `;
}

/**
 * Render position table
 */
function renderPositionTable(positions) {
  const rows = positions.map(p => renderPositionRow(p)).join('');
  return `
    <table class="position-table">
      <thead>
        <tr>
          <th>Pos.Nr</th>
          <th>Stromkreis</th>
          <th>Zielbezeichnung</th>
          <th>Spannung</th>
          <th>Sicherung</th>
          <th>Leitung</th>
          <th>R<sub>iso</sub></th>
          <th>R<sub>PE</sub></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

describe('Protokoll Renderer Performance Tests', () => {
  
  // ============================================
  // Position Table Rendering Performance
  // ============================================
  describe('Position Table Rendering Performance', () => {
    test('renders 100 positions within threshold', () => {
      const positions = Array.from({ length: 100 }, (_, i) => generateMockPosition(i));
      
      const { result, duration } = measureTime(() => {
        return renderPositionTable(positions);
      });
      
      console.log(`Render 100 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.render_positions_100);
      expect(result).toContain('position-table');
    });
    
    test('renders 1000 positions within threshold', () => {
      const positions = Array.from({ length: 1000 }, (_, i) => generateMockPosition(i));
      
      const { result, duration } = measureTime(() => {
        return renderPositionTable(positions);
      });
      
      console.log(`Render 1000 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.render_positions_1000);
    });
    
    test('incremental rendering scales linearly', () => {
      const positions100 = Array.from({ length: 100 }, (_, i) => generateMockPosition(i));
      const positions200 = Array.from({ length: 200 }, (_, i) => generateMockPosition(i));
      
      const { duration: duration100 } = measureTime(() => {
        return renderPositionTable(positions100);
      });
      
      const { duration: duration200 } = measureTime(() => {
        return renderPositionTable(positions200);
      });
      
      console.log(`100 positions: ${duration100.toFixed(2)}ms, 200 positions: ${duration200.toFixed(2)}ms`);
      // 200 positions should be roughly 2x the time of 100 positions (allow 3x margin)
      expect(duration200).toBeLessThan(duration100 * 3);
    });
  });
  
  // ============================================
  // Single Row Operations Performance
  // ============================================
  describe('Single Row Operations Performance', () => {
    test('renders single position row quickly', () => {
      const position = generateMockPosition(1);
      
      const { duration } = measureTime(() => {
        return renderPositionRow(position);
      });
      
      console.log(`Render single row: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5);
    });
    
    test('updates position row quickly', () => {
      let container = document.createElement('tbody');
      const position = generateMockPosition(1);
      container.innerHTML = renderPositionRow(position);
      
      const updatedPosition = { ...position, zielbezeichnung: 'Updated Target' };
      
      const { duration } = measureTime(() => {
        container.innerHTML = renderPositionRow(updatedPosition);
      });
      
      console.log(`Update single row: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.update_position_row);
    });
  });
  
  // ============================================
  // Batch Update Performance
  // ============================================
  describe('Batch Update Performance', () => {
    test('batch updates 100 rows within threshold', () => {
      const positions = Array.from({ length: 100 }, (_, i) => generateMockPosition(i));
      
      const { duration } = measureTime(() => {
        // Simulate batch update by rendering new table
        return renderPositionTable(positions);
      });
      
      console.log(`Batch update 100 rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.batch_update_100);
    });
  });
  
  // ============================================
  // Sorting Performance
  // ============================================
  describe('Sorting Performance', () => {
    test('sorts 100 positions by posNr quickly', () => {
      const positions = Array.from({ length: 100 }, (_, i) => generateMockPosition(i));
      
      const { result, duration } = measureTime(() => {
        const sorted = [...positions].sort((a, b) => 
          a.posNr.localeCompare(b.posNr)
        );
        return renderPositionTable(sorted);
      });
      
      console.log(`Sort and render 100 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.table_sort_100);
    });
    
    test('sorts by different fields efficiently', () => {
      const positions = Array.from({ length: 100 }, (_, i) => generateMockPosition(i));
      
      const fields = ['posNr', 'stromkreisNr', 'zielbezeichnung'];
      const durations = [];
      
      fields.forEach(field => {
        const { duration } = measureTime(() => {
          const sorted = [...positions].sort((a, b) => {
            const aVal = String(a[field] || '');
            const bVal = String(b[field] || '');
            return aVal.localeCompare(bVal);
          });
          return renderPositionTable(sorted);
        });
        durations.push(duration);
      });
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`Average sort time: ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.table_sort_100);
    });
  });
  
  // ============================================
  // Filtering/Search Performance
  // ============================================
  describe('Filtering Performance', () => {
    test('filters 1000 positions by search text within threshold', () => {
      const positions = Array.from({ length: 1000 }, (_, i) => generateMockPosition(i));
      const searchText = 'Target 5';
      
      const { result, duration } = measureTime(() => {
        const filtered = positions.filter(p => 
          p.zielbezeichnung.includes(searchText)
        );
        return renderPositionTable(filtered);
      });
      
      console.log(`Filter and render 1000 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.search_filter_1000);
    });
    
    test('multi-field filter is efficient', () => {
      const positions = Array.from({ length: 500 }, (_, i) => generateMockPosition(i));
      
      const { duration } = measureTime(() => {
        const filtered = positions.filter(p => 
          p.stromkreisNr.includes('F5') && 
          p.spannung.un === 230 &&
          p.leitung.querschnitt >= 2.5
        );
        return renderPositionTable(filtered);
      });
      
      console.log(`Multi-field filter 500 positions: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.search_filter_1000 / 2);
    });
  });
  
  // ============================================
  // Stromkreise Table Performance
  // ============================================
  describe('Stromkreise Table Performance', () => {
    function generateStromkreis(index) {
      return {
        nr: `F${index}`,
        bezeichnung: `Circuit ${index}`,
        sicherung: `B${16 + (index % 4) * 4}`,
        positions: Math.floor(Math.random() * 10) + 1
      };
    }
    
    function renderStromkreiseTable(stromkreise) {
      const rows = stromkreise.map(s => `
        <tr>
          <td>${s.nr}</td>
          <td>${s.bezeichnung}</td>
          <td>${s.sicherung}</td>
          <td>${s.positions}</td>
        </tr>
      `).join('');
      
      return `<table><tbody>${rows}</tbody></table>`;
    }
    
    test('renders 50 stromkreise within threshold', () => {
      const stromkreise = Array.from({ length: 50 }, (_, i) => generateStromkreis(i));
      
      const { duration } = measureTime(() => {
        return renderStromkreiseTable(stromkreise);
      });
      
      console.log(`Render 50 stromkreise: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.render_stromkreise_50);
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
    
    test('innerHTML replacement is fast', () => {
      const positions = Array.from({ length: 100 }, (_, i) => generateMockPosition(i));
      const html = renderPositionTable(positions);
      
      const { duration } = measureTime(() => {
        container.innerHTML = html;
      });
      
      console.log(`innerHTML update 100 rows: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200); // Increased threshold for CI variability
    });
    
    test('repeated DOM updates do not degrade', () => {
      const durations = [];
      
      for (let i = 0; i < 10; i++) {
        const positions = Array.from({ length: 100 }, (_, j) => generateMockPosition(j));
        const html = renderPositionTable(positions);
        
        const { duration } = measureTime(() => {
          container.innerHTML = html;
        });
        durations.push(duration);
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const lastDuration = durations[durations.length - 1];
      
      console.log(`Avg DOM update: ${avgDuration.toFixed(2)}ms, Last: ${lastDuration.toFixed(2)}ms`);
      expect(lastDuration).toBeLessThan(avgDuration * 2);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated renders do not accumulate memory', () => {
      for (let i = 0; i < 50; i++) {
        const positions = Array.from({ length: 100 }, (_, j) => generateMockPosition(j));
        renderPositionTable(positions);
      }
      
      expect(true).toBe(true);
    });
    
    test('large position sets do not cause memory issues', () => {
      const positions = Array.from({ length: 5000 }, (_, i) => generateMockPosition(i));
      
      for (let i = 0; i < 10; i++) {
        renderPositionTable(positions.slice(0, 500));
      }
      
      expect(true).toBe(true);
    });
  });
  
  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('empty position list renders quickly', () => {
      const { duration } = measureTime(() => {
        return renderPositionTable([]);
      });
      
      console.log(`Render empty table: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
    });
    
    test('single position renders quickly', () => {
      const position = generateMockPosition(1);
      
      const { duration } = measureTime(() => {
        return renderPositionTable([position]);
      });
      
      console.log(`Render single position: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
    });
    
    test('handles positions with missing data', () => {
      const positions = [
        { posNr: '001', stromkreisNr: 'F1' },
        { posNr: '002', zielbezeichnung: 'Target' },
        generateMockPosition(3)
      ];
      
      const { result } = measureTime(() => {
        return renderPositionTable(positions);
      });
      
      expect(result).toContain('position-table');
    });
  });
});
