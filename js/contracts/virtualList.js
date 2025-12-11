/**
 * Virtual List Component (Phase 6)
 * 
 * Implements virtual scrolling for large datasets.
 * Only renders visible rows for optimal performance with 10,000+ contracts.
 */

export class VirtualList {
    /**
     * Create a VirtualList instance
     * @param {HTMLElement} container - Scrollable container element
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            rowHeight: options.rowHeight || 50,
            overscan: options.overscan || 5, // Extra rows to render above/below
            renderRow: options.renderRow || this.defaultRenderRow,
            onRowClick: options.onRowClick || null,
            columns: options.columns || [],
            ...options
        };
        
        this.items = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.lastRenderedRange = { start: -1, end: -1 };
        
        // Create internal structure
        this.setupDOM();
        this.bindEvents();
    }
    
    /**
     * Set up the DOM structure
     */
    setupDOM() {
        this.container.classList.add('virtual-list-container');
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';
        
        // Create inner wrapper for total height
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'virtual-list-wrapper';
        this.wrapper.style.position = 'relative';
        this.wrapper.style.width = '100%';
        
        // Create viewport for visible items
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-list-viewport';
        this.viewport.style.position = 'absolute';
        this.viewport.style.width = '100%';
        this.viewport.style.left = '0';
        
        this.wrapper.appendChild(this.viewport);
        this.container.appendChild(this.wrapper);
    }
    
    /**
     * Bind scroll and resize events
     */
    bindEvents() {
        this.scrollHandler = this.onScroll.bind(this);
        this.resizeHandler = this.onResize.bind(this);
        
        this.container.addEventListener('scroll', this.scrollHandler, { passive: true });
        window.addEventListener('resize', this.resizeHandler);
        
        // Use event delegation for row clicks (performance optimization)
        if (this.options.onRowClick) {
            this.clickHandler = (e) => {
                const row = e.target.closest('[data-index]');
                if (row) {
                    const index = parseInt(row.dataset.index, 10);
                    const item = this.items[index];
                    if (item) {
                        this.options.onRowClick(item, index, e);
                    }
                }
            };
            this.viewport.addEventListener('click', this.clickHandler);
        }
        
        // Use ResizeObserver if available
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(entries => {
                this.onResize();
            });
            this.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * Handle scroll events
     */
    onScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }
    
    /**
     * Handle resize events
     */
    onResize() {
        this.containerHeight = this.container.clientHeight;
        this.render();
    }
    
    /**
     * Set items to display
     * @param {Array} items - Array of data items
     */
    setItems(items) {
        this.items = items || [];
        this.updateTotalHeight();
        this.lastRenderedRange = { start: -1, end: -1 }; // Force re-render
        this.render();
    }
    
    /**
     * Update total height based on items
     */
    updateTotalHeight() {
        const totalHeight = this.items.length * this.options.rowHeight;
        this.wrapper.style.height = `${totalHeight}px`;
    }
    
    /**
     * Calculate visible range
     * @returns {Object} { start, end, visibleStart, visibleEnd }
     */
    calculateVisibleRange() {
        const { rowHeight, overscan } = this.options;
        
        // Calculate visible rows
        const visibleStart = Math.floor(this.scrollTop / rowHeight);
        const visibleCount = Math.ceil(this.containerHeight / rowHeight);
        const visibleEnd = visibleStart + visibleCount;
        
        // Add overscan
        const start = Math.max(0, visibleStart - overscan);
        const end = Math.min(this.items.length, visibleEnd + overscan);
        
        return { start, end, visibleStart, visibleEnd };
    }
    
    /**
     * Render visible items
     */
    render() {
        if (!this.containerHeight) {
            this.containerHeight = this.container.clientHeight;
        }
        
        const range = this.calculateVisibleRange();
        
        // Skip if range hasn't changed
        if (range.start === this.lastRenderedRange.start && 
            range.end === this.lastRenderedRange.end) {
            return;
        }
        
        this.lastRenderedRange = range;
        
        // Position viewport
        const offsetY = range.start * this.options.rowHeight;
        this.viewport.style.top = `${offsetY}px`;
        
        // Render rows
        const fragment = document.createDocumentFragment();
        
        for (let i = range.start; i < range.end; i++) {
            const item = this.items[i];
            const row = this.options.renderRow(item, i, this.options);
            
            // Set row height and data attributes
            row.style.height = `${this.options.rowHeight}px`;
            row.dataset.index = i;
            
            // Set cursor style if click handler exists (event delegation used in bindEvents)
            if (this.options.onRowClick) {
                row.style.cursor = 'pointer';
            }
            
            fragment.appendChild(row);
        }
        
        // Clear and append
        this.viewport.innerHTML = '';
        this.viewport.appendChild(fragment);
    }
    
    /**
     * Default row render function
     */
    defaultRenderRow(item, index, options) {
        const row = document.createElement('div');
        row.className = 'virtual-list-row';
        row.innerHTML = `<span>${JSON.stringify(item)}</span>`;
        return row;
    }
    
    /**
     * Scroll to a specific item index
     * @param {number} index - Item index
     * @param {string} position - 'start', 'center', 'end'
     */
    scrollToIndex(index, position = 'start') {
        let scrollTop = index * this.options.rowHeight;
        
        if (position === 'center') {
            scrollTop -= (this.containerHeight - this.options.rowHeight) / 2;
        } else if (position === 'end') {
            scrollTop -= this.containerHeight - this.options.rowHeight;
        }
        
        this.container.scrollTop = Math.max(0, scrollTop);
    }
    
    /**
     * Get currently visible items
     * @returns {Array} Visible items
     */
    getVisibleItems() {
        const range = this.calculateVisibleRange();
        return this.items.slice(range.visibleStart, range.visibleEnd);
    }
    
    /**
     * Update a single item
     * @param {number} index - Item index
     * @param {Object} newData - Updated item data
     */
    updateItem(index, newData) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = { ...this.items[index], ...newData };
            this.render();
        }
    }
    
    /**
     * Remove an item
     * @param {number} index - Item index
     */
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.items.splice(index, 1);
            this.updateTotalHeight();
            this.render();
        }
    }
    
    /**
     * Add an item
     * @param {Object} item - New item
     * @param {number} index - Insert position (default: end)
     */
    addItem(item, index = null) {
        if (index === null) {
            this.items.push(item);
        } else {
            this.items.splice(index, 0, item);
        }
        this.updateTotalHeight();
        this.render();
    }
    
    /**
     * Get item count
     * @returns {number}
     */
    getItemCount() {
        return this.items.length;
    }
    
    /**
     * Refresh the list (re-render)
     */
    refresh() {
        this.lastRenderedRange = { start: -1, end: -1 };
        this.render();
    }
    
    /**
     * Destroy the virtual list
     */
    destroy() {
        this.container.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('resize', this.resizeHandler);
        
        // Remove click handler if it was added
        if (this.clickHandler) {
            this.viewport.removeEventListener('click', this.clickHandler);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        this.wrapper.remove();
    }
}

/**
 * VirtualTable - Table-specific virtual list
 */
export class VirtualTable extends VirtualList {
    constructor(container, options = {}) {
        // Ensure table-specific rendering
        options.renderRow = options.renderRow || VirtualTable.defaultTableRow;
        
        super(container, options);
        
        this.columns = options.columns || [];
        this.setupTable();
    }
    
    setupTable() {
        // Create table structure
        const table = document.createElement('table');
        table.className = 'virtual-table';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label || col.key;
            th.style.width = col.width || 'auto';
            if (col.sortable) {
                th.classList.add('sortable');
                th.addEventListener('click', () => this.sortByColumn(col.key));
            }
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create tbody wrapper
        const tbody = document.createElement('tbody');
        tbody.className = 'virtual-table-body';
        table.appendChild(tbody);
        
        // Replace container content
        this.container.innerHTML = '';
        this.container.appendChild(table);
        
        // Use tbody as the scrollable container
        this.tableBody = tbody;
        this.viewport = tbody;
        this.wrapper = tbody;
        
        // Rebind scroll to table container
        this.container.style.overflow = 'auto';
    }
    
    static defaultTableRow(item, index, options) {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'even' : 'odd';
        
        (options.columns || []).forEach(col => {
            const td = document.createElement('td');
            const value = item[col.key];
            
            if (col.render) {
                td.innerHTML = col.render(value, item);
            } else {
                td.textContent = value ?? '';
            }
            
            tr.appendChild(td);
        });
        
        return tr;
    }
    
    sortByColumn(key) {
        const currentSort = this._sortKey;
        const currentDir = this._sortDir || 'asc';
        
        if (currentSort === key) {
            this._sortDir = currentDir === 'asc' ? 'desc' : 'asc';
        } else {
            this._sortKey = key;
            this._sortDir = 'asc';
        }
        
        this.items.sort((a, b) => {
            const valA = a[key] ?? '';
            const valB = b[key] ?? '';
            
            let result = 0;
            if (valA < valB) result = -1;
            if (valA > valB) result = 1;
            
            return this._sortDir === 'asc' ? result : -result;
        });
        
        this.refresh();
    }
}

export default VirtualList;
