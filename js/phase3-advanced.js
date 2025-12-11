/**
 * Phase 3 Advanced Components JavaScript
 * 
 * Provides interactive functionality for Phase 3 advanced components:
 * - Tab navigation
 * - Breadcrumb management
 * - Loading state control
 * - Animation utilities
 * - Responsive helpers
 */

class Phase3Advanced {
    constructor() {
        this.tabs = new Map();
        this.loadingStates = new Map();
        this.animations = new Map();
        this.observers = new Map();
        
        this.init();
    }

    init() {
        this.initTabs();
        this.initBreadcrumbs();
        this.initLoadingStates();
        this.initAnimations();
        this.initResponsiveHelpers();
        this.initAccessibility();
    }

    // ==================== TAB NAVIGATION ==================== //

    initTabs() {
        document.querySelectorAll('.tabs').forEach(tabContainer => {
            this.setupTabContainer(tabContainer);
        });
    }

    setupTabContainer(container) {
        const tabs = container.querySelectorAll('.tabs__tab');
        const panels = container.querySelectorAll('.tabs__panel');
        const containerId = container.id || `tabs-${Date.now()}`;

        if (!container.id) {
            container.id = containerId;
        }

        // Store tab data
        this.tabs.set(containerId, {
            container,
            tabs: Array.from(tabs),
            panels: Array.from(panels),
            activeIndex: 0
        });

        // Setup tab click handlers
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                if (!tab.classList.contains('tabs__tab--disabled')) {
                    this.activateTab(containerId, index);
                }
            });

            // Keyboard navigation
            tab.addEventListener('keydown', (e) => {
                this.handleTabKeydown(e, containerId, index);
            });

            // Setup ARIA attributes
            const panelId = panels[index]?.id || `${containerId}-panel-${index}`;
            const tabId = tab.id || `${containerId}-tab-${index}`;
            
            if (!panels[index]?.id) panels[index].id = panelId;
            if (!tab.id) tab.id = tabId;

            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', panelId);
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
            
            if (panels[index]) {
                panels[index].setAttribute('role', 'tabpanel');
                panels[index].setAttribute('aria-labelledby', tabId);
            }
        });

        // Setup container ARIA
        const tabList = container.querySelector('.tabs__nav');
        if (tabList) {
            tabList.setAttribute('role', 'tablist');
        }

        // Activate first non-disabled tab
        const firstEnabledTab = Array.from(tabs).findIndex(tab => 
            !tab.classList.contains('tabs__tab--disabled')
        );
        if (firstEnabledTab !== -1) {
            this.activateTab(containerId, firstEnabledTab);
        }
    }

    activateTab(containerId, index) {
        const tabData = this.tabs.get(containerId);
        if (!tabData || index < 0 || index >= tabData.tabs.length) return;

        const { container, tabs, panels } = tabData;
        const targetTab = tabs[index];
        const targetPanel = panels[index];

        if (!targetTab || !targetPanel || targetTab.classList.contains('tabs__tab--disabled')) {
            return;
        }

        // Update active states
        tabs.forEach((tab, i) => {
            const isActive = i === index;
            tab.classList.toggle('tabs__tab--active', isActive);
            tab.setAttribute('aria-selected', isActive.toString());
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        panels.forEach((panel, i) => {
            const isActive = i === index;
            panel.classList.toggle('tabs__panel--active', isActive);
            panel.setAttribute('aria-hidden', (!isActive).toString());
        });

        // Update stored active index
        tabData.activeIndex = index;

        // Focus the active tab
        targetTab.focus();

        // Dispatch event
        container.dispatchEvent(new CustomEvent('tab:change', {
            detail: { 
                activeIndex: index, 
                activeTab: targetTab, 
                activePanel: targetPanel,
                containerId 
            }
        }));
    }

    handleTabKeydown(event, containerId, currentIndex) {
        const tabData = this.tabs.get(containerId);
        if (!tabData) return;

        const { tabs } = tabData;
        let newIndex = currentIndex;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                // Skip disabled tabs
                while (tabs[newIndex]?.classList.contains('tabs__tab--disabled') && newIndex !== currentIndex) {
                    newIndex = newIndex > 0 ? newIndex - 1 : tabs.length - 1;
                }
                this.activateTab(containerId, newIndex);
                break;

            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                // Skip disabled tabs
                while (tabs[newIndex]?.classList.contains('tabs__tab--disabled') && newIndex !== currentIndex) {
                    newIndex = newIndex < tabs.length - 1 ? newIndex + 1 : 0;
                }
                this.activateTab(containerId, newIndex);
                break;

            case 'Home':
                event.preventDefault();
                newIndex = 0;
                while (tabs[newIndex]?.classList.contains('tabs__tab--disabled') && newIndex < tabs.length - 1) {
                    newIndex++;
                }
                this.activateTab(containerId, newIndex);
                break;

            case 'End':
                event.preventDefault();
                newIndex = tabs.length - 1;
                while (tabs[newIndex]?.classList.contains('tabs__tab--disabled') && newIndex > 0) {
                    newIndex--;
                }
                this.activateTab(containerId, newIndex);
                break;
        }
    }

    // ==================== BREADCRUMB MANAGEMENT ==================== //

    initBreadcrumbs() {
        document.querySelectorAll('.breadcrumbs').forEach(breadcrumb => {
            this.setupBreadcrumb(breadcrumb);
        });
    }

    setupBreadcrumb(breadcrumb) {
        // Setup ARIA attributes
        breadcrumb.setAttribute('aria-label', 'Breadcrumb navigation');
        
        const items = breadcrumb.querySelectorAll('.breadcrumbs__item');
        items.forEach((item, index) => {
            const link = item.querySelector('.breadcrumbs__link');
            const current = item.querySelector('.breadcrumbs__current');
            
            if (current) {
                current.setAttribute('aria-current', 'page');
            }
            
            if (link) {
                link.setAttribute('tabindex', '0');
            }
        });
    }

    updateBreadcrumb(breadcrumbId, items) {
        const breadcrumb = document.getElementById(breadcrumbId);
        if (!breadcrumb) return;

        // Clear existing items
        breadcrumb.innerHTML = '';

        // Add new items
        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'breadcrumbs__item';

            if (index < items.length - 1) {
                // Not the last item - create link
                const link = document.createElement('a');
                link.className = 'breadcrumbs__link';
                link.href = item.href || '#';
                link.textContent = item.text;
                
                if (item.icon) {
                    const icon = document.createElement('span');
                    icon.className = `breadcrumbs__icon ${item.icon}`;
                    link.prepend(icon);
                }
                
                itemEl.appendChild(link);

                // Add separator
                if (index < items.length - 1) {
                    const separator = document.createElement('span');
                    separator.className = 'breadcrumbs__separator';
                    separator.textContent = '/';
                    separator.setAttribute('aria-hidden', 'true');
                    itemEl.appendChild(separator);
                }
            } else {
                // Last item - current page
                const current = document.createElement('span');
                current.className = 'breadcrumbs__current';
                current.textContent = item.text;
                current.setAttribute('aria-current', 'page');
                
                if (item.icon) {
                    const icon = document.createElement('span');
                    icon.className = `breadcrumbs__icon ${item.icon}`;
                    current.prepend(icon);
                }
                
                itemEl.appendChild(current);
            }

            breadcrumb.appendChild(itemEl);
        });
    }

    // ==================== LOADING STATES ==================== //

    initLoadingStates() {
        // Auto-initialize loading overlays
        document.querySelectorAll('.loading-overlay').forEach(overlay => {
            const targetId = overlay.getAttribute('data-target');
            if (targetId) {
                this.loadingStates.set(targetId, overlay);
            }
        });
    }

    showLoading(targetId, options = {}) {
        const target = document.getElementById(targetId);
        if (!target) return;

        let overlay = this.loadingStates.get(targetId);
        
        if (!overlay) {
            // Create loading overlay
            overlay = this.createLoadingOverlay(options);
            target.style.position = 'relative';
            target.appendChild(overlay);
            this.loadingStates.set(targetId, overlay);
        }

        // Update content if provided
        if (options.text || options.subtext) {
            this.updateLoadingContent(overlay, options);
        }

        // Show overlay
        overlay.classList.add('loading-overlay--active');
        
        // Dispatch event
        target.dispatchEvent(new CustomEvent('loading:show', {
            detail: { targetId, options }
        }));
    }

    hideLoading(targetId) {
        const overlay = this.loadingStates.get(targetId);
        const target = document.getElementById(targetId);
        
        if (!overlay || !target) return;

        overlay.classList.remove('loading-overlay--active');
        
        // Dispatch event
        target.dispatchEvent(new CustomEvent('loading:hide', {
            detail: { targetId }
        }));
    }

    createLoadingOverlay(options = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';

        const content = document.createElement('div');
        content.className = 'loading-overlay__content';

        // Add spinner
        const spinner = document.createElement('div');
        spinner.className = `spinner ${options.spinnerSize ? `spinner--${options.spinnerSize}` : ''}`;
        content.appendChild(spinner);

        // Add text if provided
        if (options.text) {
            const text = document.createElement('div');
            text.className = 'loading-overlay__text';
            text.textContent = options.text;
            content.appendChild(text);
        }

        if (options.subtext) {
            const subtext = document.createElement('div');
            subtext.className = 'loading-overlay__subtext';
            subtext.textContent = options.subtext;
            content.appendChild(subtext);
        }

        overlay.appendChild(content);
        return overlay;
    }

    updateLoadingContent(overlay, options) {
        const textEl = overlay.querySelector('.loading-overlay__text');
        const subtextEl = overlay.querySelector('.loading-overlay__subtext');

        if (options.text && textEl) {
            textEl.textContent = options.text;
        }

        if (options.subtext && subtextEl) {
            subtextEl.textContent = options.subtext;
        }
    }

    // ==================== SKELETON LOADERS ==================== //

    createSkeleton(type, options = {}) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton skeleton--${type}`;
        
        if (options.size) {
            skeleton.classList.add(`skeleton--${type}--${options.size}`);
        }
        
        if (options.width) {
            skeleton.style.width = options.width;
        }
        
        if (options.height) {
            skeleton.style.height = options.height;
        }

        return skeleton;
    }

    showSkeleton(targetId, config) {
        const target = document.getElementById(targetId);
        if (!target) return;

        // Store original content
        const originalContent = target.innerHTML;
        target.setAttribute('data-original-content', originalContent);

        // Clear target and add skeletons
        target.innerHTML = '';
        
        if (Array.isArray(config)) {
            config.forEach(item => {
                const skeleton = this.createSkeleton(item.type, item.options);
                target.appendChild(skeleton);
            });
        } else {
            const skeleton = this.createSkeleton(config.type, config.options);
            target.appendChild(skeleton);
        }

        target.classList.add('skeleton-loading');
    }

    hideSkeleton(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        const originalContent = target.getAttribute('data-original-content');
        if (originalContent) {
            target.innerHTML = originalContent;
            target.removeAttribute('data-original-content');
        }

        target.classList.remove('skeleton-loading');
    }

    // ==================== ANIMATIONS ==================== //

    initAnimations() {
        // Setup intersection observer for scroll animations
        this.setupScrollAnimations();
        
        // Setup hover animations
        this.setupHoverAnimations();
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const animation = element.getAttribute('data-animate');
                    const delay = element.getAttribute('data-animate-delay') || '0';
                    
                    setTimeout(() => {
                        element.classList.add(`animate-${animation}`);
                        element.classList.add('animation-complete');
                    }, parseInt(delay));
                    
                    // Stop observing once animated
                    observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe elements with data-animate attribute
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });

        this.observers.set('scroll', observer);
    }

    setupHoverAnimations() {
        document.querySelectorAll('[data-hover-animation]').forEach(element => {
            const animation = element.getAttribute('data-hover-animation');
            
            element.addEventListener('mouseenter', () => {
                element.classList.add(`hover-${animation}`);
            });
            
            element.addEventListener('mouseleave', () => {
                element.classList.remove(`hover-${animation}`);
            });
        });
    }

    animate(elementId, animation, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return Promise.reject(new Error(`Element ${elementId} not found`));

        return new Promise((resolve) => {
            const animationClass = `animate-${animation}`;
            
            // Remove any existing animation classes
            element.classList.remove(...Array.from(element.classList).filter(cls => cls.startsWith('animate-')));
            
            // Add new animation class
            element.classList.add(animationClass);
            
            // Handle animation end
            const handleAnimationEnd = () => {
                if (options.removeOnComplete !== false) {
                    element.classList.remove(animationClass);
                }
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve(element);
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
            
            // Fallback timeout
            setTimeout(handleAnimationEnd, options.duration || 1000);
        });
    }

    // ==================== RESPONSIVE HELPERS ==================== //

    initResponsiveHelpers() {
        this.setupBreakpointObserver();
        this.setupResponsiveImages();
    }

    setupBreakpointObserver() {
        const breakpoints = {
            mobile: '(max-width: 640px)',
            tablet: '(min-width: 641px) and (max-width: 1024px)',
            desktop: '(min-width: 1025px) and (max-width: 1280px)',
            large: '(min-width: 1281px)'
        };

        Object.entries(breakpoints).forEach(([name, query]) => {
            const mediaQuery = window.matchMedia(query);
            
            const handleBreakpointChange = (e) => {
                document.body.classList.toggle(`breakpoint-${name}`, e.matches);
                
                // Dispatch custom event
                document.dispatchEvent(new CustomEvent('breakpoint:change', {
                    detail: { breakpoint: name, matches: e.matches }
                }));
            };
            
            // Initial check
            handleBreakpointChange(mediaQuery);
            
            // Listen for changes
            mediaQuery.addListener(handleBreakpointChange);
        });
    }

    setupResponsiveImages() {
        // Handle responsive images with data-src attributes
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        img.classList.add('loaded');
                    }
                    
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });

        this.observers.set('images', imageObserver);
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;
        
        if (width <= 640) return 'mobile';
        if (width <= 1024) return 'tablet';
        if (width <= 1280) return 'desktop';
        return 'large';
    }

    // ==================== ACCESSIBILITY ==================== //

    initAccessibility() {
        this.setupFocusManagement();
        this.setupReducedMotion();
        this.setupKeyboardNavigation();
    }

    setupFocusManagement() {
        // Enhanced focus indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    setupReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const handleReducedMotion = (e) => {
            document.body.classList.toggle('reduced-motion', e.matches);
        };
        
        handleReducedMotion(prefersReducedMotion);
        prefersReducedMotion.addListener(handleReducedMotion);
    }

    setupKeyboardNavigation() {
        // Skip links
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.shiftKey && document.activeElement === document.body) {
                const skipLink = document.querySelector('.skip-link');
                if (skipLink) {
                    skipLink.focus();
                }
            }
        });
    }

    // ==================== PUBLIC API ==================== //

    // Tab management
    tab = {
        activate: (containerId, index) => this.activateTab(containerId, index),
        getActive: (containerId) => {
            const tabData = this.tabs.get(containerId);
            return tabData ? tabData.activeIndex : -1;
        }
    };

    // Breadcrumb management
    breadcrumb = {
        update: (id, items) => this.updateBreadcrumb(id, items)
    };

    // Loading states
    loading = {
        show: (targetId, options) => this.showLoading(targetId, options),
        hide: (targetId) => this.hideLoading(targetId)
    };

    // Skeleton loaders
    skeleton = {
        show: (targetId, config) => this.showSkeleton(targetId, config),
        hide: (targetId) => this.hideSkeleton(targetId),
        create: (type, options) => this.createSkeleton(type, options)
    };

    // Animations
    animation = {
        animate: (elementId, animation, options) => this.animate(elementId, animation, options)
    };

    // Responsive utilities
    responsive = {
        getCurrentBreakpoint: () => this.getCurrentBreakpoint()
    };

    // Cleanup method
    destroy() {
        // Clean up observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        // Clear stored data
        this.tabs.clear();
        this.loadingStates.clear();
        this.animations.clear();
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Phase3Advanced = new Phase3Advanced();
    });
} else {
    window.Phase3Advanced = new Phase3Advanced();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Phase3Advanced;
}