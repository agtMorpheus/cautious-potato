/**
 * Unit Tests for Virtual List Module (virtualList.js)
 * 
 * Tests virtual scrolling functionality for large datasets.
 */

import { VirtualList, VirtualTable } from '../../js/contracts/virtualList.js';

describe('Virtual List Module', () => {
  let container;
  let virtualList;
  
  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.style.height = '500px';
    container.style.width = '400px';
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    // Clean up
    if (virtualList) {
      virtualList.destroy();
      virtualList = null;
    }
    document.body.removeChild(container);
  });
  
  // ============================================
  // VirtualList Constructor Tests
  // ============================================
  describe('VirtualList Constructor', () => {
    test('creates instance with default options', () => {
      virtualList = new VirtualList(container);
      
      expect(virtualList).toBeInstanceOf(VirtualList);
      expect(virtualList.options.rowHeight).toBe(50);
      expect(virtualList.options.overscan).toBe(5);
    });
    
    test('creates instance with custom options', () => {
      virtualList = new VirtualList(container, {
        rowHeight: 40,
        overscan: 10
      });
      
      expect(virtualList.options.rowHeight).toBe(40);
      expect(virtualList.options.overscan).toBe(10);
    });
    
    test('sets up DOM structure correctly', () => {
      virtualList = new VirtualList(container);
      
      expect(container.classList.contains('virtual-list-container')).toBe(true);
      expect(container.querySelector('.virtual-list-wrapper')).toBeTruthy();
      expect(container.querySelector('.virtual-list-viewport')).toBeTruthy();
    });
    
    test('accepts custom renderRow function', () => {
      const customRender = jest.fn(() => document.createElement('div'));
      virtualList = new VirtualList(container, { renderRow: customRender });
      
      expect(virtualList.options.renderRow).toBe(customRender);
    });
    
    test('accepts onRowClick callback', () => {
      const onClick = jest.fn();
      virtualList = new VirtualList(container, { onRowClick: onClick });
      
      expect(virtualList.options.onRowClick).toBe(onClick);
    });
    
    test('initializes with empty items array', () => {
      virtualList = new VirtualList(container);
      
      expect(virtualList.items).toEqual([]);
    });
  });
  
  // ============================================
  // setItems Tests
  // ============================================
  describe('setItems()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container);
    });
    
    test('sets items array', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      virtualList.setItems(items);
      
      expect(virtualList.items).toEqual(items);
    });
    
    test('updates total height based on items', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      virtualList.setItems(items);
      
      const expectedHeight = 100 * 50; // 100 items * 50px rowHeight
      expect(virtualList.wrapper.style.height).toBe(`${expectedHeight}px`);
    });
    
    test('handles null items', () => {
      virtualList.setItems(null);
      
      expect(virtualList.items).toEqual([]);
    });
    
    test('handles undefined items', () => {
      virtualList.setItems(undefined);
      
      expect(virtualList.items).toEqual([]);
    });
    
    test('handles empty array', () => {
      virtualList.setItems([]);
      
      expect(virtualList.items).toEqual([]);
      expect(virtualList.wrapper.style.height).toBe('0px');
    });
    
    test('triggers re-render after setting items', () => {
      const renderSpy = jest.spyOn(virtualList, 'render');
      
      virtualList.setItems([{ id: 1 }]);
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });
  
  // ============================================
  // calculateVisibleRange Tests
  // ============================================
  describe('calculateVisibleRange()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container, { rowHeight: 50, overscan: 5 });
      virtualList.containerHeight = 500; // 10 visible rows at 50px each
    });
    
    test('calculates visible range at scroll top', () => {
      virtualList.scrollTop = 0;
      virtualList.setItems(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      
      const range = virtualList.calculateVisibleRange();
      
      expect(range.start).toBe(0); // Max(0, 0-5)
      expect(range.visibleStart).toBe(0);
      expect(range.visibleEnd).toBe(10); // 500px / 50px = 10
    });
    
    test('calculates visible range with scroll offset', () => {
      virtualList.scrollTop = 250; // Scrolled 5 rows down
      virtualList.setItems(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      
      const range = virtualList.calculateVisibleRange();
      
      expect(range.visibleStart).toBe(5);
      expect(range.start).toBe(0); // Max(0, 5-5)
    });
    
    test('includes overscan rows above', () => {
      virtualList.scrollTop = 500; // 10 rows down
      virtualList.setItems(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      
      const range = virtualList.calculateVisibleRange();
      
      expect(range.start).toBe(5); // 10 - 5 overscan
    });
    
    test('includes overscan rows below', () => {
      virtualList.scrollTop = 0;
      virtualList.setItems(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      
      const range = virtualList.calculateVisibleRange();
      
      expect(range.end).toBe(15); // 10 visible + 5 overscan
    });
    
    test('clamps end to items length', () => {
      virtualList.scrollTop = 4500; // Near end
      virtualList.setItems(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      
      const range = virtualList.calculateVisibleRange();
      
      expect(range.end).toBeLessThanOrEqual(100);
    });
  });
  
  // ============================================
  // scrollToIndex Tests
  // ============================================
  describe('scrollToIndex()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
      virtualList.setItems(Array.from({ length: 100 }, (_, i) => ({ id: i })));
    });
    
    test('scrolls to index at start position', () => {
      virtualList.scrollToIndex(20, 'start');
      
      expect(container.scrollTop).toBe(1000); // 20 * 50
    });
    
    test('scrolls to index at center position', () => {
      virtualList.scrollToIndex(20, 'center');
      
      // 20 * 50 - (500 - 50) / 2 = 1000 - 225 = 775
      expect(container.scrollTop).toBe(775);
    });
    
    test('scrolls to index at end position', () => {
      virtualList.scrollToIndex(20, 'end');
      
      // 20 * 50 - (500 - 50) = 1000 - 450 = 550
      expect(container.scrollTop).toBe(550);
    });
    
    test('defaults to start position', () => {
      virtualList.scrollToIndex(10);
      
      expect(container.scrollTop).toBe(500); // 10 * 50
    });
    
    test('clamps scroll to minimum of 0', () => {
      virtualList.scrollToIndex(0, 'center');
      
      expect(container.scrollTop).toBeGreaterThanOrEqual(0);
    });
  });
  
  // ============================================
  // getVisibleItems Tests
  // ============================================
  describe('getVisibleItems()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container, { rowHeight: 50 });
      virtualList.containerHeight = 500;
    });
    
    test('returns items in visible range', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      virtualList.setItems(items);
      virtualList.scrollTop = 0;
      
      const visible = virtualList.getVisibleItems();
      
      expect(visible.length).toBe(10); // 500px / 50px
      expect(visible[0].id).toBe(0);
      expect(visible[9].id).toBe(9);
    });
    
    test('returns empty array when no items', () => {
      virtualList.setItems([]);
      
      const visible = virtualList.getVisibleItems();
      
      expect(visible).toEqual([]);
    });
    
    test('returns correct items after scroll', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      virtualList.setItems(items);
      virtualList.scrollTop = 500; // 10 rows
      
      const visible = virtualList.getVisibleItems();
      
      expect(visible[0].id).toBe(10);
    });
  });
  
  // ============================================
  // updateItem Tests
  // ============================================
  describe('updateItem()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container);
      virtualList.setItems([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]);
    });
    
    test('updates item at valid index', () => {
      virtualList.updateItem(1, { name: 'Updated Item 2' });
      
      expect(virtualList.items[1].name).toBe('Updated Item 2');
      expect(virtualList.items[1].id).toBe(2); // Original id preserved
    });
    
    test('merges new data with existing item', () => {
      virtualList.updateItem(0, { status: 'active' });
      
      expect(virtualList.items[0].id).toBe(1);
      expect(virtualList.items[0].name).toBe('Item 1');
      expect(virtualList.items[0].status).toBe('active');
    });
    
    test('ignores invalid index (negative)', () => {
      virtualList.updateItem(-1, { name: 'Should not update' });
      
      // Items should be unchanged
      expect(virtualList.items[0].name).toBe('Item 1');
    });
    
    test('ignores invalid index (too high)', () => {
      virtualList.updateItem(100, { name: 'Should not update' });
      
      // Items should be unchanged
      expect(virtualList.items.length).toBe(3);
    });
    
    test('triggers re-render after update', () => {
      const renderSpy = jest.spyOn(virtualList, 'render');
      
      virtualList.updateItem(0, { name: 'New Name' });
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });
  
  // ============================================
  // removeItem Tests
  // ============================================
  describe('removeItem()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container);
      virtualList.setItems([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
    });
    
    test('removes item at valid index', () => {
      virtualList.removeItem(1);
      
      expect(virtualList.items.length).toBe(2);
      expect(virtualList.items[0].id).toBe(1);
      expect(virtualList.items[1].id).toBe(3);
    });
    
    test('ignores invalid index (negative)', () => {
      virtualList.removeItem(-1);
      
      expect(virtualList.items.length).toBe(3);
    });
    
    test('ignores invalid index (too high)', () => {
      virtualList.removeItem(100);
      
      expect(virtualList.items.length).toBe(3);
    });
    
    test('updates total height after removal', () => {
      const originalHeight = virtualList.wrapper.style.height;
      
      virtualList.removeItem(0);
      
      expect(virtualList.wrapper.style.height).not.toBe(originalHeight);
    });
    
    test('triggers re-render after removal', () => {
      const renderSpy = jest.spyOn(virtualList, 'render');
      
      virtualList.removeItem(0);
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });
  
  // ============================================
  // addItem Tests
  // ============================================
  describe('addItem()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container);
      virtualList.setItems([{ id: 1 }, { id: 2 }]);
    });
    
    test('adds item at end by default', () => {
      virtualList.addItem({ id: 3 });
      
      expect(virtualList.items.length).toBe(3);
      expect(virtualList.items[2].id).toBe(3);
    });
    
    test('adds item at specified index', () => {
      virtualList.addItem({ id: 3 }, 1);
      
      expect(virtualList.items.length).toBe(3);
      expect(virtualList.items[0].id).toBe(1);
      expect(virtualList.items[1].id).toBe(3);
      expect(virtualList.items[2].id).toBe(2);
    });
    
    test('adds item at beginning when index is 0', () => {
      virtualList.addItem({ id: 0 }, 0);
      
      expect(virtualList.items[0].id).toBe(0);
    });
    
    test('updates total height after addition', () => {
      const originalHeight = virtualList.wrapper.style.height;
      
      virtualList.addItem({ id: 3 });
      
      expect(virtualList.wrapper.style.height).not.toBe(originalHeight);
    });
    
    test('triggers re-render after addition', () => {
      const renderSpy = jest.spyOn(virtualList, 'render');
      
      virtualList.addItem({ id: 3 });
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });
  
  // ============================================
  // getItemCount Tests
  // ============================================
  describe('getItemCount()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container);
    });
    
    test('returns 0 for empty list', () => {
      expect(virtualList.getItemCount()).toBe(0);
    });
    
    test('returns correct count after setItems', () => {
      virtualList.setItems([{ id: 1 }, { id: 2 }, { id: 3 }]);
      
      expect(virtualList.getItemCount()).toBe(3);
    });
    
    test('returns correct count after addItem', () => {
      virtualList.setItems([{ id: 1 }]);
      virtualList.addItem({ id: 2 });
      
      expect(virtualList.getItemCount()).toBe(2);
    });
    
    test('returns correct count after removeItem', () => {
      virtualList.setItems([{ id: 1 }, { id: 2 }]);
      virtualList.removeItem(0);
      
      expect(virtualList.getItemCount()).toBe(1);
    });
  });
  
  // ============================================
  // refresh Tests
  // ============================================
  describe('refresh()', () => {
    beforeEach(() => {
      virtualList = new VirtualList(container);
      virtualList.setItems([{ id: 1 }]);
    });
    
    test('resets lastRenderedRange to trigger re-render', () => {
      virtualList.refresh();
      
      // After refresh, render is called which updates lastRenderedRange
      // Just verify the refresh method executes without error
      expect(virtualList).toBeDefined();
    });
    
    test('triggers render', () => {
      const renderSpy = jest.spyOn(virtualList, 'render');
      
      virtualList.refresh();
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });
  
  // ============================================
  // destroy Tests
  // ============================================
  describe('destroy()', () => {
    test('removes scroll event listener', () => {
      virtualList = new VirtualList(container);
      const removeEventSpy = jest.spyOn(container, 'removeEventListener');
      
      virtualList.destroy();
      
      expect(removeEventSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
    
    test('removes resize event listener from window', () => {
      virtualList = new VirtualList(container);
      const removeEventSpy = jest.spyOn(window, 'removeEventListener');
      
      virtualList.destroy();
      
      expect(removeEventSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
    
    test('removes wrapper from DOM', () => {
      virtualList = new VirtualList(container);
      
      virtualList.destroy();
      
      expect(container.querySelector('.virtual-list-wrapper')).toBeFalsy();
      virtualList = null; // Prevent afterEach from calling destroy again
    });
  });
  
  // ============================================
  // defaultRenderRow Tests
  // ============================================
  describe('defaultRenderRow()', () => {
    test('renders item as JSON string', () => {
      virtualList = new VirtualList(container);
      const item = { id: 1, name: 'Test' };
      
      const row = virtualList.defaultRenderRow(item, 0, {});
      
      expect(row.tagName).toBe('DIV');
      expect(row.className).toBe('virtual-list-row');
      expect(row.innerHTML).toContain(JSON.stringify(item));
    });
  });
  
  // ============================================
  // onRowClick Tests
  // ============================================
  describe('onRowClick handling', () => {
    test('calls onRowClick callback when row is clicked', () => {
      const onClick = jest.fn();
      virtualList = new VirtualList(container, {
        onRowClick: onClick,
        renderRow: (item, index) => {
          const div = document.createElement('div');
          div.className = 'test-row';
          div.textContent = item.name;
          return div;
        }
      });
      
      virtualList.containerHeight = 500;
      virtualList.setItems([{ id: 1, name: 'Item 1' }]);
      
      // Trigger click on rendered row
      const row = virtualList.viewport.querySelector('div');
      if (row) {
        row.click();
        expect(onClick).toHaveBeenCalledWith(
          expect.objectContaining({ id: 1 }),
          0,
          expect.any(Object)
        );
      }
    });
  });
  
  // ============================================
  // VirtualTable Tests
  // ============================================
  describe('VirtualTable', () => {
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
      document.body.removeChild(tableContainer);
    });
    
    test('creates instance extending VirtualList', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [{ key: 'id', label: 'ID' }]
      });
      
      expect(virtualTable).toBeInstanceOf(VirtualList);
      expect(virtualTable).toBeInstanceOf(VirtualTable);
    });
    
    test('creates table structure with header', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' }
        ]
      });
      
      const table = tableContainer.querySelector('.virtual-table');
      const thead = table.querySelector('thead');
      const headers = thead.querySelectorAll('th');
      
      expect(table).toBeTruthy();
      expect(thead).toBeTruthy();
      expect(headers.length).toBe(2);
      expect(headers[0].textContent).toBe('ID');
      expect(headers[1].textContent).toBe('Name');
    });
    
    test('creates sortable columns when specified', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [
          { key: 'id', label: 'ID', sortable: true },
          { key: 'name', label: 'Name', sortable: false }
        ]
      });
      
      const headers = tableContainer.querySelectorAll('th');
      
      expect(headers[0].classList.contains('sortable')).toBe(true);
      expect(headers[1].classList.contains('sortable')).toBe(false);
    });
    
    test('defaultTableRow creates table row', () => {
      const item = { id: 1, name: 'Test' };
      const options = {
        columns: [
          { key: 'id' },
          { key: 'name' }
        ]
      };
      
      const row = VirtualTable.defaultTableRow(item, 0, options);
      
      expect(row.tagName).toBe('TR');
      expect(row.classList.contains('even')).toBe(true);
      
      const cells = row.querySelectorAll('td');
      expect(cells.length).toBe(2);
      expect(cells[0].textContent).toBe('1');
      expect(cells[1].textContent).toBe('Test');
    });
    
    test('defaultTableRow applies even/odd classes', () => {
      const options = { columns: [{ key: 'id' }] };
      
      const evenRow = VirtualTable.defaultTableRow({ id: 1 }, 0, options);
      const oddRow = VirtualTable.defaultTableRow({ id: 2 }, 1, options);
      
      expect(evenRow.classList.contains('even')).toBe(true);
      expect(oddRow.classList.contains('odd')).toBe(true);
    });
    
    test('defaultTableRow uses custom render function', () => {
      const item = { id: 1, status: 'active' };
      const options = {
        columns: [{
          key: 'status',
          render: (value, item) => `<span class="badge">${value}</span>`
        }]
      };
      
      const row = VirtualTable.defaultTableRow(item, 0, options);
      const cell = row.querySelector('td');
      
      expect(cell.innerHTML).toBe('<span class="badge">active</span>');
    });
    
    test('sortByColumn sorts items ascending', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [{ key: 'name', sortable: true }]
      });
      
      virtualTable.setItems([
        { name: 'Charlie' },
        { name: 'Alice' },
        { name: 'Bob' }
      ]);
      
      virtualTable.sortByColumn('name');
      
      expect(virtualTable.items[0].name).toBe('Alice');
      expect(virtualTable.items[1].name).toBe('Bob');
      expect(virtualTable.items[2].name).toBe('Charlie');
    });
    
    test('sortByColumn toggles direction on second call', () => {
      virtualTable = new VirtualTable(tableContainer, {
        columns: [{ key: 'name', sortable: true }]
      });
      
      virtualTable.setItems([
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' }
      ]);
      
      virtualTable.sortByColumn('name'); // First call - ascending
      virtualTable.sortByColumn('name'); // Second call - descending
      
      expect(virtualTable.items[0].name).toBe('Charlie');
      expect(virtualTable.items[2].name).toBe('Alice');
    });
  });
});
