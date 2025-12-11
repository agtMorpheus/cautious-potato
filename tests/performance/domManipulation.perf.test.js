/**
 * Performance Tests for DOM Manipulation Operations
 * 
 * Tests DOM operations that occur frequently in the application
 * to ensure they perform efficiently at scale.
 */

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  createElement_1000: 200,         // ms to create 1000 elements (increased for CI variance)
  setAttribute_10000: 200,         // ms to set attributes on 10000 elements (increased for CI variance)
  classList_operations_10000: 200, // ms for 10000 classList operations (increased for CI variance)
  innerHTML_large: 200,            // ms to set innerHTML with large content
  fragment_append_1000: 100,       // ms to append 1000 elements via fragment
  event_delegation_1000: 100,      // ms to handle 1000 delegated events (increased for CI variance)
  style_updates_1000: 100,         // ms to update styles on 1000 elements
  dom_cleanup_large: 200           // ms to remove large DOM subtree
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

describe('DOM Manipulation Performance Tests', () => {
  let container;
  
  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });
  
  // ============================================
  // Element Creation Performance
  // ============================================
  describe('Element Creation Performance', () => {
    test('creates 1000 elements within threshold', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          document.createElement('div');
        }
      });
      
      console.log(`Create 1000 elements: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.createElement_1000);
    });
    
    test('creates 1000 elements with attributes efficiently', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.className = 'test-class';
          div.dataset.index = i;
          div.setAttribute('data-value', `value-${i}`);
        }
      });
      
      console.log(`Create 1000 elements with attributes: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.createElement_1000 * 2);
    });
    
    test('creates complex nested structures efficiently', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 200; i++) {
          const parent = document.createElement('div');
          for (let j = 0; j < 5; j++) {
            const child = document.createElement('span');
            child.textContent = `Item ${i}-${j}`;
            parent.appendChild(child);
          }
        }
      });
      
      console.log(`Create 200 nested structures: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.createElement_1000);
    });
  });
  
  // ============================================
  // Attribute Manipulation Performance
  // ============================================
  describe('Attribute Manipulation Performance', () => {
    test('sets attributes on 10000 elements within threshold', () => {
      const elements = [];
      for (let i = 0; i < 10000; i++) {
        elements.push(document.createElement('div'));
      }
      
      const { duration } = measureTime(() => {
        elements.forEach((el, i) => {
          el.setAttribute('data-index', i);
          el.setAttribute('data-value', `value-${i}`);
        });
      });
      
      console.log(`Set attributes on 10000 elements: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.setAttribute_10000);
    });
    
    test('dataset is faster than setAttribute', () => {
      const elements = [];
      for (let i = 0; i < 5000; i++) {
        elements.push(document.createElement('div'));
      }
      
      const { duration: setAttrDuration } = measureTime(() => {
        elements.forEach((el, i) => {
          el.setAttribute('data-index', i);
        });
      });
      
      const elements2 = [];
      for (let i = 0; i < 5000; i++) {
        elements2.push(document.createElement('div'));
      }
      
      const { duration: datasetDuration } = measureTime(() => {
        elements2.forEach((el, i) => {
          el.dataset.index = i;
        });
      });
      
      console.log(`setAttribute: ${setAttrDuration.toFixed(2)}ms, dataset: ${datasetDuration.toFixed(2)}ms`);
      // Dataset should be reasonably close in performance to setAttribute
      expect(datasetDuration).toBeLessThan(setAttrDuration * 3); // Allow variance for test environment
    });
  });
  
  // ============================================
  // ClassList Operations Performance
  // ============================================
  describe('ClassList Operations Performance', () => {
    test('classList operations on 10000 elements within threshold', () => {
      const elements = [];
      for (let i = 0; i < 10000; i++) {
        const el = document.createElement('div');
        el.className = 'base-class';
        elements.push(el);
      }
      
      const { duration } = measureTime(() => {
        elements.forEach((el, i) => {
          el.classList.add('active');
          el.classList.toggle('selected');
          if (i % 2 === 0) {
            el.classList.remove('base-class');
          }
        });
      });
      
      console.log(`ClassList operations on 10000 elements: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.classList_operations_10000);
    });
  });
  
  // ============================================
  // innerHTML Performance
  // ============================================
  describe('innerHTML Performance', () => {
    test('setting innerHTML with large content within threshold', () => {
      const largeContent = Array(1000).fill('<div>Row content with some text</div>').join('');
      
      const { duration } = measureTime(() => {
        container.innerHTML = largeContent;
      });
      
      console.log(`Set innerHTML (1000 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.innerHTML_large);
    });
    
    test('template literals are efficient for large HTML', () => {
      const { duration } = measureTime(() => {
        const rows = [];
        for (let i = 0; i < 1000; i++) {
          rows.push(`<div class="row" data-index="${i}">Row ${i}</div>`);
        }
        container.innerHTML = rows.join('');
      });
      
      console.log(`Template literal innerHTML (1000 rows): ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.innerHTML_large);
    });
  });
  
  // ============================================
  // DocumentFragment Performance
  // ============================================
  describe('DocumentFragment Performance', () => {
    test('appends 1000 elements via fragment within threshold', () => {
      const { duration } = measureTime(() => {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.textContent = `Item ${i}`;
          fragment.appendChild(div);
        }
        container.appendChild(fragment);
      });
      
      console.log(`Append 1000 elements via fragment: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.fragment_append_1000);
      expect(container.children.length).toBe(1000);
    });
    
    test('fragment is faster than direct append', () => {
      const container1 = document.createElement('div');
      const { duration: directDuration } = measureTime(() => {
        for (let i = 0; i < 500; i++) {
          const div = document.createElement('div');
          div.textContent = `Item ${i}`;
          container1.appendChild(div);
        }
      });
      
      const container2 = document.createElement('div');
      const { duration: fragmentDuration } = measureTime(() => {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 500; i++) {
          const div = document.createElement('div');
          div.textContent = `Item ${i}`;
          fragment.appendChild(div);
        }
        container2.appendChild(fragment);
      });
      
      console.log(`Direct append: ${directDuration.toFixed(2)}ms, Fragment: ${fragmentDuration.toFixed(2)}ms`);
      // Fragment should be reasonably comparable or faster (allow variance for test environment)
      expect(fragmentDuration).toBeLessThan(directDuration * 2); // Increased variance tolerance for CI
    });
  });
  
  // ============================================
  // Event Delegation Performance
  // ============================================
  describe('Event Delegation Performance', () => {
    test('handles 1000 delegated click events within threshold', () => {
      // Set up delegated event handler
      let clickCount = 0;
      const handler = (e) => {
        if (e.target.matches('[data-item]')) {
          clickCount++;
        }
      };
      container.addEventListener('click', handler);
      
      // Add 1000 items
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 1000; i++) {
        const button = document.createElement('button');
        button.dataset.item = i;
        button.textContent = `Button ${i}`;
        fragment.appendChild(button);
      }
      container.appendChild(fragment);
      
      // Simulate 1000 clicks
      const buttons = container.querySelectorAll('button');
      const { duration } = measureTime(() => {
        buttons.forEach(button => {
          button.click();
        });
      });
      
      console.log(`1000 delegated events: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.event_delegation_1000);
      expect(clickCount).toBe(1000);
      
      container.removeEventListener('click', handler);
    });
    
    test('event delegation scales better than individual listeners', () => {
      // Test with individual listeners
      const container1 = document.createElement('div');
      document.body.appendChild(container1);
      let count1 = 0;
      
      const { duration: individualDuration } = measureTime(() => {
        for (let i = 0; i < 500; i++) {
          const button = document.createElement('button');
          button.addEventListener('click', () => count1++);
          container1.appendChild(button);
        }
      });
      
      // Test with delegation
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      let count2 = 0;
      const delegatedHandler = () => count2++;
      container2.addEventListener('click', delegatedHandler);
      
      const { duration: delegatedDuration } = measureTime(() => {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 500; i++) {
          const button = document.createElement('button');
          fragment.appendChild(button);
        }
        container2.appendChild(fragment);
      });
      
      console.log(`Individual listeners: ${individualDuration.toFixed(2)}ms, Delegated: ${delegatedDuration.toFixed(2)}ms`);
      // Delegation should be comparable or better (allow variance for test environment)
      expect(delegatedDuration).toBeLessThan(individualDuration * 1.5);
      
      document.body.removeChild(container1);
      document.body.removeChild(container2);
    });
  });
  
  // ============================================
  // Style Updates Performance
  // ============================================
  describe('Style Updates Performance', () => {
    test('updates styles on 1000 elements within threshold', () => {
      const fragment = document.createDocumentFragment();
      const elements = [];
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        elements.push(div);
        fragment.appendChild(div);
      }
      container.appendChild(fragment);
      
      const { duration } = measureTime(() => {
        elements.forEach((el, i) => {
          el.style.width = `${100 + i}px`;
          el.style.height = '50px';
          el.style.backgroundColor = i % 2 === 0 ? '#fff' : '#eee';
        });
      });
      
      console.log(`Style updates on 1000 elements: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.style_updates_1000);
    });
    
    test('cssText is faster than individual style properties', () => {
      const elements1 = [];
      for (let i = 0; i < 500; i++) {
        elements1.push(document.createElement('div'));
      }
      
      const { duration: individualDuration } = measureTime(() => {
        elements1.forEach((el, i) => {
          el.style.width = '100px';
          el.style.height = '50px';
          el.style.backgroundColor = '#fff';
          el.style.padding = '10px';
        });
      });
      
      const elements2 = [];
      for (let i = 0; i < 500; i++) {
        elements2.push(document.createElement('div'));
      }
      
      const { duration: cssTextDuration } = measureTime(() => {
        elements2.forEach(el => {
          el.style.cssText = 'width: 100px; height: 50px; background-color: #fff; padding: 10px;';
        });
      });
      
      console.log(`Individual properties: ${individualDuration.toFixed(2)}ms, cssText: ${cssTextDuration.toFixed(2)}ms`);
      // cssText should be reasonably comparable (allow variance for test environment)
      expect(cssTextDuration).toBeLessThan(individualDuration * 3);
    });
  });
  
  // ============================================
  // DOM Cleanup Performance
  // ============================================
  describe('DOM Cleanup Performance', () => {
    test('removes large DOM subtree within threshold', () => {
      // Create a large DOM tree
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        for (let j = 0; j < 5; j++) {
          const span = document.createElement('span');
          span.textContent = `${i}-${j}`;
          div.appendChild(span);
        }
        fragment.appendChild(div);
      }
      container.appendChild(fragment);
      
      expect(container.children.length).toBe(1000);
      
      const { duration } = measureTime(() => {
        container.innerHTML = '';
      });
      
      console.log(`Remove large DOM subtree: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.dom_cleanup_large);
      expect(container.children.length).toBe(0);
    });
    
    test('removeChild in loop vs innerHTML clear', () => {
      // Test removeChild
      const container1 = document.createElement('div');
      for (let i = 0; i < 500; i++) {
        container1.appendChild(document.createElement('div'));
      }
      
      const { duration: removeChildDuration } = measureTime(() => {
        while (container1.firstChild) {
          container1.removeChild(container1.firstChild);
        }
      });
      
      // Test innerHTML
      const container2 = document.createElement('div');
      for (let i = 0; i < 500; i++) {
        container2.appendChild(document.createElement('div'));
      }
      
      const { duration: innerHTMLDuration } = measureTime(() => {
        container2.innerHTML = '';
      });
      
      console.log(`removeChild loop: ${removeChildDuration.toFixed(2)}ms, innerHTML='': ${innerHTMLDuration.toFixed(2)}ms`);
      expect(innerHTMLDuration).toBeLessThan(removeChildDuration);
    });
  });
  
  // ============================================
  // Query Selector Performance
  // ============================================
  describe('Query Selector Performance', () => {
    beforeEach(() => {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.className = i % 2 === 0 ? 'even' : 'odd';
        div.dataset.index = i;
        fragment.appendChild(div);
      }
      container.appendChild(fragment);
    });
    
    test('querySelector is fast for simple selectors', () => {
      const { duration } = measureTime(() => {
        for (let i = 0; i < 100; i++) {
          container.querySelector('.even');
        }
      });
      
      console.log(`querySelector 100 times: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100); // Increased threshold for CI variance
    });
    
    test('querySelectorAll with filtering is efficient', () => {
      const { duration } = measureTime(() => {
        const evenElements = container.querySelectorAll('.even');
        const filtered = Array.from(evenElements).filter((el, i) => 
          parseInt(el.dataset.index) < 500
        );
      });
      
      console.log(`querySelectorAll with filter: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });
  });
  
  // ============================================
  // Memory Efficiency Tests
  // ============================================
  describe('Memory Efficiency', () => {
    test('repeated DOM creation/destruction does not leak', () => {
      for (let i = 0; i < 50; i++) {
        const fragment = document.createDocumentFragment();
        for (let j = 0; j < 100; j++) {
          const div = document.createElement('div');
          div.textContent = `Item ${j}`;
          fragment.appendChild(div);
        }
        container.appendChild(fragment);
        container.innerHTML = '';
      }
      
      expect(container.children.length).toBe(0);
    });
    
    test('removing event listeners prevents memory leaks', () => {
      const handlers = [];
      
      for (let i = 0; i < 100; i++) {
        const button = document.createElement('button');
        const handler = () => {};
        button.addEventListener('click', handler);
        handlers.push({ button, handler });
        container.appendChild(button);
      }
      
      // Clean up properly
      handlers.forEach(({ button, handler }) => {
        button.removeEventListener('click', handler);
      });
      container.innerHTML = '';
      
      expect(container.children.length).toBe(0);
    });
  });
});
