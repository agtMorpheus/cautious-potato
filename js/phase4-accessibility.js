/**
 * Phase 4: Advanced Accessibility & Dark Mode JavaScript
 * 
 * Provides JavaScript functionality for enhanced accessibility features
 * and advanced dark mode support as specified in UI Standardization Guide Phase 4.
 */

/**
 * Accessibility Manager
 * Handles advanced accessibility features and enhancements
 */
const AccessibilityManager = (() => {
    let announcer = null;
    let focusTrap = null;
    let keyboardNavigation = false;

    /**
     * Initialize accessibility features
     */
    function init() {
        console.log('Initializing Phase 4 Accessibility features...');
        
        createScreenReaderAnnouncer();
        setupKeyboardNavigation();
        setupFocusManagement();
        setupSkipLinks();
        setupAriaLiveRegions();
        setupFormAccessibility();
        setupTableAccessibility();
        setupModalAccessibility();
        
        console.log('Phase 4 Accessibility features initialized');
    }

    /**
     * Create screen reader announcer for dynamic content
     */
    function createScreenReaderAnnouncer() {
        announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'assertive');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - 'polite' or 'assertive'
     */
    function announce(message, priority = 'assertive') {
        if (!announcer) return;
        
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = '';
        
        // Small delay to ensure screen readers pick up the change
        setTimeout(() => {
            announcer.textContent = message;
        }, 100);
        
        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }

    /**
     * Setup keyboard navigation detection
     */
    function setupKeyboardNavigation() {
        // Detect keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                keyboardNavigation = true;
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            keyboardNavigation = false;
            document.body.classList.remove('keyboard-navigation');
        });

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M: Skip to main content
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                const main = document.querySelector('main, [role="main"], .main-content');
                if (main) {
                    main.focus();
                    main.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // Alt + N: Skip to navigation
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                const nav = document.querySelector('nav, [role="navigation"]');
                if (nav) {
                    const firstLink = nav.querySelector('a, button');
                    if (firstLink) {
                        firstLink.focus();
                    }
                }
            }

            // Escape: Close modals, dropdowns, etc.
            if (e.key === 'Escape') {
                closeActiveModal();
                closeActiveDropdowns();
            }
        });
    }

    /**
     * Setup focus management
     */
    function setupFocusManagement() {
        // Store last focused element before modal opens
        let lastFocusedElement = null;

        // Focus trap for modals
        document.addEventListener('focusin', (e) => {
            const modal = document.querySelector('.modal[aria-modal="true"]:not([hidden])');
            if (modal && !modal.contains(e.target)) {
                e.preventDefault();
                const firstFocusable = getFocusableElements(modal)[0];
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        });

        // Tab trapping in modals
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            const modal = document.querySelector('.modal[aria-modal="true"]:not([hidden])');
            if (!modal) return;

            const focusableElements = getFocusableElements(modal);
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    /**
     * Get focusable elements within a container
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement[]} Array of focusable elements
     */
    function getFocusableElements(container) {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[role="button"]:not([disabled])',
            '[role="link"]:not([disabled])'
        ].join(', ');

        return Array.from(container.querySelectorAll(focusableSelectors))
            .filter(el => !el.hidden && el.offsetParent !== null);
    }

    /**
     * Setup skip links
     */
    function setupSkipLinks() {
        // Create skip links if they don't exist
        if (!document.querySelector('.skip-link')) {
            const skipLinks = document.createElement('div');
            skipLinks.className = 'skip-links';
            skipLinks.innerHTML = `
                <a href="#main-content" class="skip-link">Skip to main content</a>
                <a href="#navigation" class="skip-link">Skip to navigation</a>
            `;
            document.body.insertBefore(skipLinks, document.body.firstChild);
        }

        // Handle skip link clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('skip-link')) {
                e.preventDefault();
                const targetId = e.target.getAttribute('href').substring(1);
                const target = document.getElementById(targetId) || 
                              document.querySelector(`[role="main"]`) ||
                              document.querySelector('main');
                
                if (target) {
                    target.setAttribute('tabindex', '-1');
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth' });
                    
                    // Remove tabindex after focus
                    target.addEventListener('blur', () => {
                        target.removeAttribute('tabindex');
                    }, { once: true });
                }
            }
        });
    }

    /**
     * Setup ARIA live regions
     */
    function setupAriaLiveRegions() {
        // Ensure global message container has proper ARIA attributes
        const globalMessages = document.getElementById('global-messages') || 
                              document.querySelector('.message-container');
        
        if (globalMessages) {
            globalMessages.setAttribute('aria-live', 'polite');
            globalMessages.setAttribute('aria-atomic', 'false');
            globalMessages.setAttribute('role', 'status');
        }

        // Setup status indicators with proper announcements
        const statusElements = document.querySelectorAll('[class*="status-"]');
        statusElements.forEach(element => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const classList = element.classList;
                        let status = 'unknown';
                        
                        if (classList.contains('status-success')) status = 'success';
                        else if (classList.contains('status-error')) status = 'error';
                        else if (classList.contains('status-pending')) status = 'loading';
                        else if (classList.contains('status-idle')) status = 'ready';
                        
                        announce(`Status changed to ${status}`);
                    }
                });
            });
            
            observer.observe(element, { attributes: true });
        });
    }

    /**
     * Setup form accessibility enhancements
     */
    function setupFormAccessibility() {
        // Enhanced form validation announcements
        document.addEventListener('invalid', (e) => {
            const field = e.target;
            const label = document.querySelector(`label[for="${field.id}"]`) || 
                         field.closest('.form-group')?.querySelector('.form-label');
            
            const fieldName = label ? label.textContent.trim() : field.name || 'Field';
            const message = field.validationMessage || 'Invalid input';
            
            announce(`${fieldName}: ${message}`, 'assertive');
        });

        // Form submission feedback
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.checkValidity()) {
                announce('Form submitted successfully', 'polite');
            } else {
                announce('Form has errors. Please check the fields and try again.', 'assertive');
            }
        });

        // Enhanced required field indicators
        const requiredFields = document.querySelectorAll('input[required], select[required], textarea[required]');
        requiredFields.forEach(field => {
            field.setAttribute('aria-required', 'true');
            
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label && !label.classList.contains('form-label--required')) {
                label.classList.add('form-label--required');
            }
        });

        // Form field descriptions
        const fieldsWithHints = document.querySelectorAll('.form-control + .form-hint');
        fieldsWithHints.forEach(hint => {
            const field = hint.previousElementSibling;
            if (field && field.classList.contains('form-control')) {
                const hintId = `hint-${field.id || Math.random().toString(36).substr(2, 9)}`;
                hint.id = hintId;
                field.setAttribute('aria-describedby', hintId);
            }
        });
    }

    /**
     * Setup table accessibility enhancements
     */
    function setupTableAccessibility() {
        // Sortable table headers
        const sortableHeaders = document.querySelectorAll('.table__th--sortable, [data-sortable]');
        sortableHeaders.forEach(header => {
            header.setAttribute('role', 'columnheader');
            header.setAttribute('aria-sort', 'none');
            header.setAttribute('tabindex', '0');
            
            // Keyboard support for sorting
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });
            
            // Update sort announcements
            header.addEventListener('click', () => {
                const currentSort = header.getAttribute('aria-sort');
                let newSort = 'ascending';
                
                if (currentSort === 'ascending') newSort = 'descending';
                else if (currentSort === 'descending') newSort = 'none';
                
                // Reset other headers
                sortableHeaders.forEach(h => h.setAttribute('aria-sort', 'none'));
                header.setAttribute('aria-sort', newSort);
                
                const columnName = header.textContent.trim();
                const sortDirection = newSort === 'none' ? 'unsorted' : newSort;
                announce(`Table sorted by ${columnName}, ${sortDirection}`, 'polite');
            });
        });

        // Table row selection
        const selectableRows = document.querySelectorAll('.table__tr[data-selectable]');
        selectableRows.forEach(row => {
            row.setAttribute('role', 'row');
            row.setAttribute('aria-selected', 'false');
            row.setAttribute('tabindex', '0');
            
            row.addEventListener('click', () => {
                const isSelected = row.getAttribute('aria-selected') === 'true';
                row.setAttribute('aria-selected', !isSelected);
                
                const rowIndex = Array.from(row.parentNode.children).indexOf(row) + 1;
                announce(`Row ${rowIndex} ${isSelected ? 'deselected' : 'selected'}`, 'polite');
            });
            
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    row.click();
                }
            });
        });
    }

    /**
     * Setup modal accessibility enhancements
     */
    function setupModalAccessibility() {
        let lastFocusedElement = null;

        // Modal open handling
        const openModal = (modal) => {
            lastFocusedElement = document.activeElement;
            
            modal.setAttribute('aria-modal', 'true');
            modal.removeAttribute('hidden');
            modal.style.display = 'grid';
            
            // Focus first focusable element
            const firstFocusable = getFocusableElements(modal)[0];
            if (firstFocusable) {
                firstFocusable.focus();
            }
            
            // Announce modal opening
            const title = modal.querySelector('.modal__title, h1, h2, h3');
            if (title) {
                announce(`Dialog opened: ${title.textContent}`, 'assertive');
            }
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        };

        // Modal close handling
        const closeModal = (modal) => {
            modal.setAttribute('aria-modal', 'false');
            modal.setAttribute('hidden', '');
            modal.style.display = 'none';
            
            // Restore focus
            if (lastFocusedElement) {
                lastFocusedElement.focus();
                lastFocusedElement = null;
            }
            
            // Announce modal closing
            announce('Dialog closed', 'polite');
            
            // Restore body scroll
            document.body.style.overflow = '';
        };

        // Setup modal triggers
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal-target]');
            if (trigger) {
                e.preventDefault();
                const modalId = trigger.getAttribute('data-modal-target');
                const modal = document.getElementById(modalId);
                if (modal) {
                    openModal(modal);
                }
            }
            
            const closeBtn = e.target.closest('.modal__close, [data-modal-close]');
            if (closeBtn) {
                e.preventDefault();
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    closeModal(modal);
                }
            }
        });

        // Close modal on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal(e.target);
            }
        });
    }

    /**
     * Close active modal (used by keyboard shortcuts)
     */
    function closeActiveModal() {
        const activeModal = document.querySelector('.modal[aria-modal="true"]:not([hidden])');
        if (activeModal) {
            const closeBtn = activeModal.querySelector('.modal__close');
            if (closeBtn) {
                closeBtn.click();
            }
        }
    }

    /**
     * Close active dropdowns (placeholder for future implementation)
     */
    function closeActiveDropdowns() {
        // Implementation for closing dropdowns when they're added
        const activeDropdowns = document.querySelectorAll('.dropdown--open, [aria-expanded="true"]');
        activeDropdowns.forEach(dropdown => {
            dropdown.classList.remove('dropdown--open');
            dropdown.setAttribute('aria-expanded', 'false');
        });
    }

    /**
     * Update button loading state with accessibility
     * @param {HTMLElement} button - Button element
     * @param {boolean} isLoading - Loading state
     * @param {string} loadingText - Text to show while loading
     */
    function updateButtonLoadingState(button, isLoading, loadingText = 'Loading...') {
        if (isLoading) {
            button.setAttribute('aria-busy', 'true');
            button.disabled = true;
            
            const originalText = button.textContent;
            button.dataset.originalText = originalText;
            button.textContent = loadingText;
            
            announce(`${originalText} is loading`, 'polite');
        } else {
            button.setAttribute('aria-busy', 'false');
            button.disabled = false;
            
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Create accessible progress indicator
     * @param {number} value - Current value (0-100)
     * @param {string} label - Progress label
     * @returns {HTMLElement} Progress element
     */
    function createProgressIndicator(value, label = 'Progress') {
        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuenow', value);
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.setAttribute('aria-label', label);
        
        const bar = document.createElement('div');
        bar.className = 'progress__bar';
        bar.style.width = `${value}%`;
        
        progress.appendChild(bar);
        return progress;
    }

    /**
     * Update progress indicator
     * @param {HTMLElement} progress - Progress element
     * @param {number} value - New value (0-100)
     */
    function updateProgress(progress, value) {
        progress.setAttribute('aria-valuenow', value);
        const bar = progress.querySelector('.progress__bar');
        if (bar) {
            bar.style.width = `${value}%`;
        }
        
        // Announce progress milestones
        if (value % 25 === 0 || value === 100) {
            const label = progress.getAttribute('aria-label') || 'Progress';
            announce(`${label}: ${value}% complete`, 'polite');
        }
    }

    // Public API
    return {
        init,
        announce,
        updateButtonLoadingState,
        createProgressIndicator,
        updateProgress,
        getFocusableElements
    };
})();

/**
 * Enhanced Dark Mode Manager
 * Extends the basic theme manager with accessibility features
 */
const EnhancedDarkModeManager = (() => {
    const THEME_KEY = 'app-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';
    const AUTO_THEME = 'auto';

    let currentTheme = AUTO_THEME;
    let systemPreference = 'light';

    /**
     * Initialize enhanced dark mode features
     */
    function init() {
        console.log('Initializing Enhanced Dark Mode Manager...');
        
        detectSystemPreference();
        loadUserPreference();
        applyTheme(currentTheme);
        setupThemeToggle();
        setupSystemPreferenceListener();
        setupContrastPreferences();
        
        console.log('Enhanced Dark Mode Manager initialized');
    }

    /**
     * Detect system color scheme preference
     */
    function detectSystemPreference() {
        systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
    }

    /**
     * Load user theme preference
     */
    function loadUserPreference() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored && [LIGHT_THEME, DARK_THEME, AUTO_THEME].includes(stored)) {
            currentTheme = stored;
        }
    }

    /**
     * Apply theme with accessibility announcements
     * @param {string} theme - Theme to apply
     */
    function applyTheme(theme) {
        let effectiveTheme = theme;
        
        if (theme === AUTO_THEME) {
            effectiveTheme = systemPreference;
        }
        
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        document.documentElement.setAttribute('data-color-scheme', effectiveTheme);
        
        localStorage.setItem(THEME_KEY, theme);
        currentTheme = theme;
        
        updateThemeToggle();
        
        // Announce theme change
        const themeLabel = theme === AUTO_THEME ? `auto (${effectiveTheme})` : theme;
        AccessibilityManager.announce(`Theme changed to ${themeLabel} mode`, 'polite');
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: effectiveTheme, userPreference: theme }
        }));
    }

    /**
     * Toggle between themes
     */
    function toggleTheme() {
        let newTheme;
        
        switch (currentTheme) {
            case LIGHT_THEME:
                newTheme = DARK_THEME;
                break;
            case DARK_THEME:
                newTheme = AUTO_THEME;
                break;
            case AUTO_THEME:
            default:
                newTheme = LIGHT_THEME;
                break;
        }
        
        applyTheme(newTheme);
    }

    /**
     * Setup theme toggle button
     */
    function setupThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle-btn') || 
                         document.querySelector('[data-theme-toggle]');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
            
            // Keyboard support
            toggleBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTheme();
                }
            });
            
            updateThemeToggle();
        }
    }

    /**
     * Update theme toggle button
     */
    function updateThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle-btn') || 
                         document.querySelector('[data-theme-toggle]');
        
        if (!toggleBtn) return;
        
        const effectiveTheme = currentTheme === AUTO_THEME ? systemPreference : currentTheme;
        
        // Update icon and label
        if (currentTheme === AUTO_THEME) {
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-6.5L17 8m-10 8l-3.5 3.5M20.5 17.5L17 14M7 10L3.5 6.5"/>
                </svg>`;
            toggleBtn.setAttribute('title', `Auto theme (currently ${effectiveTheme})`);
            toggleBtn.setAttribute('aria-label', `Auto theme, currently ${effectiveTheme} mode. Click to switch to light mode.`);
        } else if (effectiveTheme === DARK_THEME) {
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>`;
            toggleBtn.setAttribute('title', 'Switch to auto theme');
            toggleBtn.setAttribute('aria-label', 'Dark mode active. Click to switch to auto theme.');
        } else {
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>`;
            toggleBtn.setAttribute('title', 'Switch to dark mode');
            toggleBtn.setAttribute('aria-label', 'Light mode active. Click to switch to dark mode.');
        }
    }

    /**
     * Listen for system preference changes
     */
    function setupSystemPreferenceListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            systemPreference = e.matches ? DARK_THEME : LIGHT_THEME;
            
            if (currentTheme === AUTO_THEME) {
                applyTheme(AUTO_THEME);
            }
        });
    }

    /**
     * Setup contrast preference handling
     */
    function setupContrastPreferences() {
        const contrastQuery = window.matchMedia('(prefers-contrast: more)');
        
        contrastQuery.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-high-contrast', e.matches);
            
            if (e.matches) {
                AccessibilityManager.announce('High contrast mode detected', 'polite');
            }
        });
        
        // Initial check
        if (contrastQuery.matches) {
            document.documentElement.setAttribute('data-high-contrast', 'true');
        }
    }

    /**
     * Get current theme information
     * @returns {Object} Theme information
     */
    function getThemeInfo() {
        const effectiveTheme = currentTheme === AUTO_THEME ? systemPreference : currentTheme;
        
        return {
            userPreference: currentTheme,
            effectiveTheme,
            systemPreference,
            isAuto: currentTheme === AUTO_THEME
        };
    }

    // Public API
    return {
        init,
        toggleTheme,
        applyTheme,
        getThemeInfo
    };
})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    AccessibilityManager.init();
    EnhancedDarkModeManager.init();
});

// Export for use in other modules
window.AccessibilityManager = AccessibilityManager;
window.EnhancedDarkModeManager = EnhancedDarkModeManager;