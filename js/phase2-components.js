/**
 * Phase 2 Components JavaScript
 * 
 * Provides interactive functionality for Phase 2 components:
 * - Modal management
 * - Drawer controls
 * - Table interactions
 * - Progress updates
 * - Status changes
 */

class Phase2Components {
    constructor() {
        this.modals = new Map();
        this.drawers = new Map();
        this.tables = new Map();
        this.progressBars = new Map();
        
        this.init();
    }

    init() {
        this.initModals();
        this.initDrawers();
        this.initTables();
        this.initKeyboardHandlers();
        this.initAccessibility();
    }

    // ==================== MODAL MANAGEMENT ==================== //

    initModals() {
        // Auto-initialize modals with data attributes
        document.querySelectorAll('[data-modal-trigger]').forEach(trigger => {
            const modalId = trigger.getAttribute('data-modal-trigger');
            trigger.addEventListener('click', () => this.openModal(modalId));
        });

        // Auto-initialize close buttons
        document.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Close on overlay click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    openModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with id "${modalId}" not found`);
            return;
        }

        // Store previous focus
        this.modals.set(modalId, {
            previousFocus: document.activeElement,
            options
        });

        // Show modal
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        // Focus management
        this.focusFirstElement(modal);

        // Callback
        if (options.onOpen) options.onOpen(modal);

        // Dispatch event
        modal.dispatchEvent(new CustomEvent('modal:open', { detail: { modalId, options } }));
    }

    closeModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const modalData = this.modals.get(modalId);
        
        // Add closing class for animation
        modal.classList.add('is-closing');

        setTimeout(() => {
            modal.classList.remove('is-open', 'is-closing');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');

            // Restore focus
            if (modalData?.previousFocus) {
                modalData.previousFocus.focus();
            }

            // Callback
            if (options.onClose) options.onClose(modal);
            if (modalData?.options?.onClose) modalData.options.onClose(modal);

            // Dispatch event
            modal.dispatchEvent(new CustomEvent('modal:close', { detail: { modalId } }));

            // Cleanup
            this.modals.delete(modalId);
        }, 250);
    }

    // ==================== DRAWER MANAGEMENT ==================== //

    initDrawers() {
        document.querySelectorAll('[data-drawer-trigger]').forEach(trigger => {
            const drawerId = trigger.getAttribute('data-drawer-trigger');
            trigger.addEventListener('click', () => this.openDrawer(drawerId));
        });

        document.querySelectorAll('[data-drawer-close]').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const drawer = e.target.closest('.drawer');
                if (drawer) this.closeDrawer(drawer.id);
            });
        });

        // Close on overlay click
        document.querySelectorAll('.drawer__overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                const drawerId = overlay.getAttribute('data-drawer-id');
                if (drawerId) this.closeDrawer(drawerId);
            });
        });
    }

    openDrawer(drawerId, options = {}) {
        const drawer = document.getElementById(drawerId);
        const overlay = document.querySelector(`[data-drawer-id="${drawerId}"]`) || 
                       document.querySelector('.drawer__overlay');
        
        if (!drawer) {
            console.warn(`Drawer with id "${drawerId}" not found`);
            return;
        }

        // Store previous focus
        this.drawers.set(drawerId, {
            previousFocus: document.activeElement,
            options
        });

        // Show drawer and overlay
        drawer.classList.add('is-open');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('data-drawer-id', drawerId);
        }
        document.body.classList.add('modal-open');

        // Focus management
        this.focusFirstElement(drawer);

        // Callback
        if (options.onOpen) options.onOpen(drawer);

        // Dispatch event
        drawer.dispatchEvent(new CustomEvent('drawer:open', { detail: { drawerId, options } }));
    }

    closeDrawer(drawerId, options = {}) {
        const drawer = document.getElementById(drawerId);
        const overlay = document.querySelector(`[data-drawer-id="${drawerId}"]`);
        
        if (!drawer) return;

        const drawerData = this.drawers.get(drawerId);

        // Add closing class for animation
        drawer.classList.add('is-closing');
        if (overlay) overlay.classList.remove('is-open');

        setTimeout(() => {
            drawer.classList.remove('is-open', 'is-closing');
            document.body.classList.remove('modal-open');

            // Restore focus
            if (drawerData?.previousFocus) {
                drawerData.previousFocus.focus();
            }

            // Callback
            if (options.onClose) options.onClose(drawer);
            if (drawerData?.options?.onClose) drawerData.options.onClose(drawer);

            // Dispatch event
            drawer.dispatchEvent(new CustomEvent('drawer:close', { detail: { drawerId } }));

            // Cleanup
            this.drawers.delete(drawerId);
        }, 250);
    }

    // ==================== TABLE INTERACTIONS ==================== //

    initTables() {
        // Sortable headers
        document.querySelectorAll('.table__th--sortable').forEach(header => {
            header.addEventListener('click', () => this.handleSort(header));
        });

        // Select all checkboxes
        document.querySelectorAll('.table__checkbox[data-select-all]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleSelectAll(e.target));
        });

        // Row selection
        document.querySelectorAll('.table__checkbox:not([data-select-all])').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleRowSelect(e.target));
        });
    }

    handleSort(header) {
        const table = header.closest('.table');
        const column = header.cellIndex;
        const currentSort = header.classList.contains('table__th--sort-asc') ? 'asc' :
                           header.classList.contains('table__th--sort-desc') ? 'desc' : null;
        
        // Remove sort classes from all headers
        table.querySelectorAll('.table__th--sortable').forEach(th => {
            th.classList.remove('table__th--sort-asc', 'table__th--sort-desc');
        });

        // Determine new sort direction
        let newSort = 'asc';
        if (currentSort === 'asc') newSort = 'desc';
        else if (currentSort === 'desc') newSort = null;

        // Apply new sort class
        if (newSort) {
            header.classList.add(`table__th--sort-${newSort}`);
        }

        // Dispatch sort event
        table.dispatchEvent(new CustomEvent('table:sort', {
            detail: { column, direction: newSort, header }
        }));
    }

    handleSelectAll(checkbox) {
        const table = checkbox.closest('.table');
        const rowCheckboxes = table.querySelectorAll('.table__checkbox:not([data-select-all])');
        
        rowCheckboxes.forEach(rowCheckbox => {
            rowCheckbox.checked = checkbox.checked;
            this.updateRowSelection(rowCheckbox);
        });

        // Dispatch event
        table.dispatchEvent(new CustomEvent('table:select-all', {
            detail: { selected: checkbox.checked, count: rowCheckboxes.length }
        }));
    }

    handleRowSelect(checkbox) {
        this.updateRowSelection(checkbox);
        this.updateSelectAllState(checkbox);

        const table = checkbox.closest('.table');
        const selectedCount = table.querySelectorAll('.table__checkbox:not([data-select-all]):checked').length;
        
        // Dispatch event
        table.dispatchEvent(new CustomEvent('table:row-select', {
            detail: { selected: checkbox.checked, selectedCount }
        }));
    }

    updateRowSelection(checkbox) {
        const row = checkbox.closest('.table__tr');
        if (checkbox.checked) {
            row.classList.add('table__tr--selected');
        } else {
            row.classList.remove('table__tr--selected');
        }
    }

    updateSelectAllState(checkbox) {
        const table = checkbox.closest('.table');
        const selectAllCheckbox = table.querySelector('.table__checkbox[data-select-all]');
        const rowCheckboxes = table.querySelectorAll('.table__checkbox:not([data-select-all])');
        const checkedCount = table.querySelectorAll('.table__checkbox:not([data-select-all]):checked').length;

        if (selectAllCheckbox) {
            if (checkedCount === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCount === rowCheckboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    // ==================== PROGRESS MANAGEMENT ==================== //

    updateProgress(progressId, percentage, options = {}) {
        const progress = document.getElementById(progressId);
        if (!progress) return;

        const bar = progress.querySelector('.progress__bar');
        const percentageEl = progress.querySelector('.progress__percentage');
        const textEl = progress.querySelector('.progress__text');

        if (bar) {
            bar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }

        if (percentageEl) {
            percentageEl.textContent = `${Math.round(percentage)}%`;
        }

        if (textEl && options.text) {
            textEl.textContent = options.text;
        }

        // Update ARIA attributes
        progress.setAttribute('aria-valuenow', percentage);
        if (options.text) {
            progress.setAttribute('aria-label', options.text);
        }

        // Dispatch event
        progress.dispatchEvent(new CustomEvent('progress:update', {
            detail: { percentage, options }
        }));
    }

    setProgressIndeterminate(progressId, indeterminate = true) {
        const progress = document.getElementById(progressId);
        if (!progress) return;

        if (indeterminate) {
            progress.classList.add('progress--indeterminate');
            progress.removeAttribute('aria-valuenow');
        } else {
            progress.classList.remove('progress--indeterminate');
        }
    }

    // ==================== STATUS MANAGEMENT ==================== //

    updateStatus(statusId, status, text = null) {
        const statusEl = document.getElementById(statusId);
        if (!statusEl) return;

        // Remove existing status classes
        statusEl.classList.remove('status--idle', 'status--pending', 'status--success', 'status--error', 'status--info', 'status--processing');
        
        // Add new status class
        statusEl.classList.add(`status--${status}`);

        // Update text if provided
        if (text) {
            const textEl = statusEl.querySelector('.status-text') || statusEl.lastChild;
            if (textEl && textEl.nodeType === Node.TEXT_NODE) {
                textEl.textContent = text;
            } else if (textEl) {
                textEl.textContent = text;
            }
        }

        // Update ARIA attributes
        statusEl.setAttribute('aria-label', text || status);

        // Dispatch event
        statusEl.dispatchEvent(new CustomEvent('status:update', {
            detail: { status, text }
        }));
    }

    // ==================== UTILITY METHODS ==================== //

    focusFirstElement(container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    initKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close topmost modal
                const openModals = document.querySelectorAll('.modal.is-open');
                if (openModals.length > 0) {
                    const topModal = openModals[openModals.length - 1];
                    this.closeModal(topModal.id);
                    return;
                }

                // Close open drawer
                const openDrawer = document.querySelector('.drawer.is-open');
                if (openDrawer) {
                    this.closeDrawer(openDrawer.id);
                }
            }
        });
    }

    initAccessibility() {
        // Ensure proper ARIA attributes
        document.querySelectorAll('.modal').forEach(modal => {
            if (!modal.hasAttribute('role')) {
                modal.setAttribute('role', 'dialog');
            }
            if (!modal.hasAttribute('aria-modal')) {
                modal.setAttribute('aria-modal', 'true');
            }
            if (!modal.hasAttribute('aria-hidden')) {
                modal.setAttribute('aria-hidden', 'true');
            }
        });

        document.querySelectorAll('.progress').forEach(progress => {
            if (!progress.hasAttribute('role')) {
                progress.setAttribute('role', 'progressbar');
            }
            if (!progress.hasAttribute('aria-valuemin')) {
                progress.setAttribute('aria-valuemin', '0');
            }
            if (!progress.hasAttribute('aria-valuemax')) {
                progress.setAttribute('aria-valuemax', '100');
            }
        });
    }

    // ==================== PUBLIC API ==================== //

    // Expose methods for external use
    modal = {
        open: (id, options) => this.openModal(id, options),
        close: (id, options) => this.closeModal(id, options)
    };

    drawer = {
        open: (id, options) => this.openDrawer(id, options),
        close: (id, options) => this.closeDrawer(id, options)
    };

    progress = {
        update: (id, percentage, options) => this.updateProgress(id, percentage, options),
        setIndeterminate: (id, indeterminate) => this.setProgressIndeterminate(id, indeterminate)
    };

    status = {
        update: (id, status, text) => this.updateStatus(id, status, text)
    };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Phase2Components = new Phase2Components();
    });
} else {
    window.Phase2Components = new Phase2Components();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Phase2Components;
}