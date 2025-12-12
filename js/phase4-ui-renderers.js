/**
 * Phase 4: Enhanced UI Renderers with Advanced Accessibility
 * 
 * Extends the existing UI renderers with Phase 4 accessibility features
 * and enhanced dark mode support as specified in the agents.md architecture.
 */

import { escapeHtml } from './handlers.js';

/**
 * Enhanced UI Renderers with Phase 4 Accessibility Features
 */
const Phase4UIRenderers = (() => {

    /**
     * Initialize Phase 4 UI enhancements
     */
    function init() {
        console.log('Initializing Phase 4 UI Renderers...');
        
        enhanceExistingUI();
        setupAccessibilityObservers();
        setupProgressIndicators();
        
        console.log('Phase 4 UI Renderers initialized');
    }

    /**
     * Enhance existing UI elements with Phase 4 accessibility features
     */
    function enhanceExistingUI() {
        // Add skip links if not present
        addSkipLinks();
        
        // Enhance form elements
        enhanceFormElements();
        
        // Enhance buttons
        enhanceButtons();
        
        // Enhance status indicators
        enhanceStatusIndicators();
        
        // Add ARIA landmarks
        addAriaLandmarks();
    }

    /**
     * Add skip links for keyboard navigation
     */
    function addSkipLinks() {
        if (document.querySelector('.skip-links')) return;
        
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    /**
     * Enhance form elements with accessibility features
     */
    function enhanceFormElements() {
        // Add required indicators
        const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
        requiredInputs.forEach(input => {
            input.setAttribute('aria-required', 'true');
            
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label && !label.classList.contains('form-label--required')) {
                label.classList.add('form-label--required');
            }
        });

        // Link form hints to inputs
        const formHints = document.querySelectorAll('.form-hint');
        formHints.forEach(hint => {
            const formGroup = hint.closest('.form-group');
            if (formGroup) {
                const input = formGroup.querySelector('.form-control');
                if (input && !hint.id) {
                    const hintId = `hint-${input.id || Math.random().toString(36).substr(2, 9)}`;
                    hint.id = hintId;
                    
                    const existingDescribedBy = input.getAttribute('aria-describedby');
                    const newDescribedBy = existingDescribedBy ? 
                        `${existingDescribedBy} ${hintId}` : hintId;
                    input.setAttribute('aria-describedby', newDescribedBy);
                }
            }
        });

        // Enhance file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    const fileName = files[0].name;
                    window.AccessibilityManager?.announce(`File selected: ${fileName}`, 'polite');
                }
            });
        });
    }

    /**
     * Enhance buttons with accessibility features
     */
    function enhanceButtons() {
        // Ensure minimum touch target size
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            if (!button.style.minWidth) {
                button.style.minWidth = '44px';
            }
            if (!button.style.minHeight) {
                button.style.minHeight = '44px';
            }
        });

        // Add loading state support
        const actionButtons = document.querySelectorAll('.btn:not(.btn--icon)');
        actionButtons.forEach(button => {
            // Store original text for loading states
            const textElement = button.querySelector('span') || button;
            if (!button.dataset.originalText) {
                button.dataset.originalText = textElement.textContent.trim();
            }
        });
    }

    /**
     * Enhance status indicators with accessibility
     */
    function enhanceStatusIndicators() {
        const statusElements = document.querySelectorAll('[class*="status-"]');
        statusElements.forEach(element => {
            // Add role if not present
            if (!element.getAttribute('role')) {
                element.setAttribute('role', 'status');
            }
            
            // Add aria-live if not present
            if (!element.getAttribute('aria-live')) {
                element.setAttribute('aria-live', 'polite');
            }
            
            // Add aria-label based on status
            updateStatusAriaLabel(element);
        });
    }

    /**
     * Update status element aria-label
     * @param {HTMLElement} element - Status element
     */
    function updateStatusAriaLabel(element) {
        const classList = element.classList;
        let status = 'unknown';
        
        if (classList.contains('status-idle')) status = 'ready';
        else if (classList.contains('status-pending')) status = 'loading';
        else if (classList.contains('status-success')) status = 'completed successfully';
        else if (classList.contains('status-error')) status = 'error occurred';
        
        element.setAttribute('aria-label', `Status: ${status}`);
    }

    /**
     * Add ARIA landmarks to page structure
     */
    function addAriaLandmarks() {
        // Main content area
        const mainContent = document.querySelector('.main-content, main');
        if (mainContent && !mainContent.getAttribute('role')) {
            mainContent.setAttribute('role', 'main');
            mainContent.id = mainContent.id || 'main-content';
        }

        // Navigation areas
        const navElements = document.querySelectorAll('nav, .navigation');
        navElements.forEach(nav => {
            if (!nav.getAttribute('role')) {
                nav.setAttribute('role', 'navigation');
            }
        });

        // Form sections
        const formSections = document.querySelectorAll('.panel, .card');
        formSections.forEach(section => {
            const form = section.querySelector('form');
            if (form && !section.getAttribute('role')) {
                section.setAttribute('role', 'region');
                
                const heading = section.querySelector('h1, h2, h3, h4, h5, h6, .panel__title, .card__title');
                if (heading && !heading.id) {
                    heading.id = `section-${Math.random().toString(36).substr(2, 9)}`;
                    section.setAttribute('aria-labelledby', heading.id);
                }
            }
        });
    }

    /**
     * Setup accessibility observers for dynamic content
     */
    function setupAccessibilityObservers() {
        // Observer for status changes
        const statusObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    if (element.classList.contains('status-indicator') || 
                        Array.from(element.classList).some(cls => cls.startsWith('status-'))) {
                        updateStatusAriaLabel(element);
                        announceStatusChange(element);
                    }
                }
            });
        });

        // Observe all status elements
        const statusElements = document.querySelectorAll('[class*="status-"]');
        statusElements.forEach(element => {
            statusObserver.observe(element, { attributes: true });
        });

        // Observer for new content
        const contentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        enhanceNewElement(node);
                    }
                });
            });
        });

        // Observe document for new elements
        contentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Enhance newly added elements
     * @param {HTMLElement} element - New element to enhance
     */
    function enhanceNewElement(element) {
        // Enhance buttons
        if (element.matches('button, .btn')) {
            enhanceButtons();
        }

        // Enhance forms
        if (element.matches('form, .form-group')) {
            enhanceFormElements();
        }

        // Enhance status indicators
        if (element.matches('[class*="status-"]')) {
            enhanceStatusIndicators();
        }

        // Enhance modals
        if (element.matches('.modal')) {
            enhanceModal(element);
        }
    }

    /**
     * Enhance modal with accessibility features
     * @param {HTMLElement} modal - Modal element
     */
    function enhanceModal(modal) {
        // Ensure proper ARIA attributes
        if (!modal.getAttribute('role')) {
            modal.setAttribute('role', 'dialog');
        }
        
        if (!modal.getAttribute('aria-modal')) {
            modal.setAttribute('aria-modal', 'true');
        }

        // Link title to modal
        const title = modal.querySelector('.modal__title, h1, h2, h3');
        if (title && !title.id) {
            title.id = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
            modal.setAttribute('aria-labelledby', title.id);
        }

        // Ensure close button has proper label
        const closeBtn = modal.querySelector('.modal__close');
        if (closeBtn && !closeBtn.getAttribute('aria-label')) {
            closeBtn.setAttribute('aria-label', 'Close dialog');
        }
    }

    /**
     * Announce status changes to screen readers
     * @param {HTMLElement} element - Status element
     */
    function announceStatusChange(element) {
        const classList = element.classList;
        let message = '';
        
        if (classList.contains('status-pending')) {
            message = 'Operation in progress';
        } else if (classList.contains('status-success')) {
            message = 'Operation completed successfully';
        } else if (classList.contains('status-error')) {
            message = 'An error occurred';
        } else if (classList.contains('status-idle')) {
            message = 'Ready for input';
        }
        
        if (message && window.AccessibilityManager) {
            window.AccessibilityManager.announce(message, 'polite');
        }
    }

    /**
     * Setup progress indicators for long operations
     */
    function setupProgressIndicators() {
        // Create progress container if not exists
        let progressContainer = document.getElementById('progress-container');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'progress-container';
            progressContainer.className = 'progress-container';
            progressContainer.setAttribute('aria-live', 'polite');
            progressContainer.style.position = 'fixed';
            progressContainer.style.top = '0';
            progressContainer.style.left = '0';
            progressContainer.style.right = '0';
            progressContainer.style.zIndex = '9999';
            progressContainer.style.display = 'none';
            document.body.appendChild(progressContainer);
        }
    }

    /**
     * Show progress indicator
     * @param {string} label - Progress label
     * @param {number} value - Initial value (0-100)
     * @returns {string} Progress ID for updates
     */
    function showProgress(label, value = 0) {
        const progressContainer = document.getElementById('progress-container');
        if (!progressContainer) return null;

        const progressId = `progress-${Date.now()}`;
        const progressElement = window.AccessibilityManager?.createProgressIndicator(value, label);
        
        if (progressElement) {
            progressElement.id = progressId;
            progressContainer.appendChild(progressElement);
            progressContainer.style.display = 'block';
            
            window.AccessibilityManager.announce(`${label} started`, 'polite');
        }
        
        return progressId;
    }

    /**
     * Update progress indicator
     * @param {string} progressId - Progress ID
     * @param {number} value - New value (0-100)
     */
    function updateProgress(progressId, value) {
        const progressElement = document.getElementById(progressId);
        if (progressElement && window.AccessibilityManager) {
            window.AccessibilityManager.updateProgress(progressElement, value);
        }
    }

    /**
     * Hide progress indicator
     * @param {string} progressId - Progress ID
     */
    function hideProgress(progressId) {
        const progressElement = document.getElementById(progressId);
        if (progressElement) {
            const label = progressElement.getAttribute('aria-label') || 'Operation';
            progressElement.remove();
            
            const progressContainer = document.getElementById('progress-container');
            if (progressContainer && progressContainer.children.length === 0) {
                progressContainer.style.display = 'none';
            }
            
            if (window.AccessibilityManager) {
                window.AccessibilityManager.announce(`${label} completed`, 'polite');
            }
        }
    }

    /**
     * Enhanced updateImportUI with Phase 4 accessibility
     * @param {Object} state - Application state
     */
    function updateImportUI(state) {
        const {
            ui: { import: importState },
            protokollData
        } = state;
        
        // Get DOM elements
        const importButton = document.querySelector('#import-button');
        const importStatus = document.querySelector('#import-status');
        const importMessage = document.querySelector('#import-message');
        const importSummary = document.querySelector('#import-summary');
        
        if (!importButton || !importStatus) {
            console.warn('Import UI elements not found in DOM');
            return;
        }
        
        // Update Drop Zone Visuals
        const dropZone = document.querySelector('#file-drop-zone');
        if (dropZone) {
            const uploadText = dropZone.querySelector('.upload-text');
            const uploadHint = dropZone.querySelector('.upload-hint');
            const uploadIcon = dropZone.querySelector('.upload-icon');

            if (importState.fileName) {
                dropZone.classList.add('has-file');
                // Use inline styles for immediate feedback, though classes are better if CSS allows
                dropZone.style.borderColor = 'var(--c-success)';
                dropZone.style.backgroundColor = 'var(--success-light)';

                if (uploadText) {
                    uploadText.innerHTML = `<strong>${escapeHtml(importState.fileName)}</strong>`;
                }
                if (uploadHint) {
                    uploadHint.textContent = 'Klicken oder ziehen, um zu ändern';
                }
                if (uploadIcon) {
                    // Change to document check icon
                    uploadIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
                    uploadIcon.style.color = 'var(--c-success)';
                }
            } else {
                dropZone.classList.remove('has-file');
                dropZone.style.borderColor = '';
                dropZone.style.backgroundColor = '';

                if (uploadText) {
                    uploadText.innerHTML = 'Datei hierher ziehen oder <span class="upload-link">durchsuchen</span>';
                }
                if (uploadHint) {
                    uploadHint.textContent = 'Die Datei wird nur lokal im Browser verarbeitet.';
                }
                if (uploadIcon) {
                    // Restore upload icon
                    uploadIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />';
                    uploadIcon.style.color = '';
                }
            }
        }

        // Update button loading state with accessibility
        if (window.AccessibilityManager) {
            const isLoading = importState.status === 'pending';
            window.AccessibilityManager.updateButtonLoadingState(
                importButton, 
                isLoading, 
                'Importiere...'
            );
        }
        
        // Update status with enhanced accessibility
        updateStatusIndicator(importStatus, importState.status);
        
        // Update message with proper ARIA
        if (importMessage) {
            let message = importState.message || 'Keine Datei ausgewählt.';
            
            if (importState.fileName && importState.status === 'idle') {
                message = `${importState.fileName} ausgewählt. Klicken Sie auf "Datei importieren" um fortzufahren.`;
            }
            
            importMessage.textContent = message;
            importMessage.className = `status-message status-${importState.status}`;
            importMessage.setAttribute('role', 'status');
            importMessage.setAttribute('aria-live', 'polite');
        }
        
        // Update summary with enhanced structure
        if (importSummary && protokollData && protokollData.metadata && protokollData.positionen.length > 0) {
            const { metadata, positionen } = protokollData;
            
            importSummary.innerHTML = `
                <div role="region" aria-labelledby="import-summary-title">
                    <h4 id="import-summary-title" class="sr-only">Import Summary</h4>
                    <dl class="summary-list">
                        <div class="summary-row">
                            <dt>Auftrags-Nr.</dt>
                            <dd>${escapeHtml(metadata.auftragsNr || 'N/A')}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Protokoll-Nr.</dt>
                            <dd>${escapeHtml(metadata.protokollNr || 'N/A')}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Anlage</dt>
                            <dd>${escapeHtml(metadata.anlage || 'N/A')}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Einsatzort</dt>
                            <dd>${escapeHtml(metadata.einsatzort || 'N/A')}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Datum</dt>
                            <dd>${escapeHtml(metadata.datum || 'N/A')}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Positionen extrahiert</dt>
                            <dd>${positionen.length}</dd>
                        </div>
                    </dl>
                </div>
            `;
            importSummary.removeAttribute('hidden');
            importSummary.setAttribute('aria-live', 'polite');
        } else if (importSummary) {
            importSummary.setAttribute('hidden', '');
        }
    }

    /**
     * Enhanced updateGenerateUI with Phase 4 accessibility
     * @param {Object} state - Application state
     */
    function updateGenerateUI(state) {
        const {
            ui: { generate: generateState },
            abrechnungData
        } = state;
        
        const generateButton = document.querySelector('#generate-button');
        const generateStatus = document.querySelector('#generate-status');
        const generateMessage = document.querySelector('#generate-message');
        const generateSummary = document.querySelector('#generate-summary');
        
        if (!generateButton || !generateStatus) {
            console.warn('Generate UI elements not found in DOM');
            return;
        }
        
        // Update button loading state with accessibility
        if (window.AccessibilityManager) {
            const isLoading = generateState.status === 'pending';
            window.AccessibilityManager.updateButtonLoadingState(
                generateButton, 
                isLoading, 
                'Erzeuge...'
            );
        }
        
        // Update status with enhanced accessibility
        updateStatusIndicator(generateStatus, generateState.status);
        
        // Update message with proper ARIA
        if (generateMessage) {
            generateMessage.textContent = generateState.message || 'Noch keine Abrechnung erzeugt.';
            generateMessage.className = `status-message status-${generateState.status}`;
            generateMessage.setAttribute('role', 'status');
            generateMessage.setAttribute('aria-live', 'polite');
        }
        
        // Update generation summary with enhanced structure
        if (generateSummary && abrechnungData && abrechnungData.header && Object.keys(abrechnungData.positionen || {}).length > 0) {
            const { positionen } = abrechnungData;
            const totalQuantity = Object.values(positionen).reduce((sum, q) => sum + q, 0);
            
            generateSummary.innerHTML = `
                <div role="region" aria-labelledby="generate-summary-title">
                    <h4 id="generate-summary-title" class="sr-only">Generation Summary</h4>
                    <dl class="summary-list">
                        <div class="summary-row">
                            <dt>Eindeutige Positionen</dt>
                            <dd>${Object.keys(positionen).length}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Gesamtmenge</dt>
                            <dd>${totalQuantity.toFixed(2)}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Generierungszeit</dt>
                            <dd>${generateState.generationTimeMs || 0}ms</dd>
                        </div>
                    </dl>
                </div>
            `;
            generateSummary.removeAttribute('hidden');
            generateSummary.setAttribute('aria-live', 'polite');
        } else if (generateSummary) {
            generateSummary.setAttribute('hidden', '');
        }
        
        // Update button state with proper ARIA
        if (generateButton) {
            const isPending = generateState.status === 'pending';
            const protokollData = state.protokollData;
            const hasValidInput = protokollData && 
                                protokollData.metadata && 
                                protokollData.metadata.auftragsNr && 
                                protokollData.positionen && 
                                protokollData.positionen.length > 0;
            
            generateButton.disabled = isPending || !hasValidInput;
            generateButton.setAttribute('aria-disabled', generateButton.disabled);
            
            if (!hasValidInput) {
                generateButton.setAttribute('title', 'Bitte importieren Sie zuerst eine Protokoll-Datei');
            } else {
                generateButton.removeAttribute('title');
            }
        }
    }

    /**
     * Enhanced updateExportUI with Phase 4 accessibility
     * @param {Object} state - Application state
     */
    function updateExportUI(state) {
        const {
            ui: { export: exportState }
        } = state;
        
        const exportButton = document.querySelector('#export-button');
        const exportStatus = document.querySelector('#export-status');
        const exportMessage = document.querySelector('#export-message');
        const exportSummary = document.querySelector('#export-summary');
        
        if (!exportButton || !exportStatus) {
            console.warn('Export UI elements not found in DOM');
            return;
        }
        
        // Update button loading state with accessibility
        if (window.AccessibilityManager) {
            const isLoading = exportState.status === 'pending';
            window.AccessibilityManager.updateButtonLoadingState(
                exportButton, 
                isLoading, 
                'Exportiere...'
            );
        }
        
        // Update status with enhanced accessibility
        updateStatusIndicator(exportStatus, exportState.status);
        
        // Update message with proper ARIA
        if (exportMessage) {
            exportMessage.textContent = exportState.message || 'Noch keine Datei exportiert.';
            exportMessage.className = `status-message status-${exportState.status}`;
            exportMessage.setAttribute('role', 'status');
            exportMessage.setAttribute('aria-live', 'polite');
        }
        
        // Update export summary with enhanced structure
        if (exportSummary && exportState.lastExportAt) {
            const exportDate = new Date(exportState.lastExportAt);
            const dateStr = exportDate.toLocaleString('de-DE');
            const sizeKB = (exportState.lastExportSize && exportState.lastExportSize > 0)
                ? (exportState.lastExportSize / 1024).toFixed(2) + ' KB'
                : '–';
            
            exportSummary.innerHTML = `
                <div role="region" aria-labelledby="export-summary-title">
                    <h4 id="export-summary-title" class="sr-only">Export Summary</h4>
                    <dl class="summary-list">
                        <div class="summary-row">
                            <dt>Letzter Export</dt>
                            <dd id="export-last-date">${dateStr}</dd>
                        </div>
                        <div class="summary-row">
                            <dt>Dateigröße</dt>
                            <dd id="export-last-size">${sizeKB}</dd>
                        </div>
                    </dl>
                </div>
            `;
            exportSummary.removeAttribute('hidden');
            exportSummary.setAttribute('aria-live', 'polite');
        } else if (exportSummary) {
            exportSummary.setAttribute('hidden', '');
        }
        
        // Update button state with proper ARIA
        if (exportButton) {
            const isPending = exportState.status === 'pending';
            const abrechnungData = state.abrechnungData;
            const hasValidAbrechnung = abrechnungData && 
                                      abrechnungData.header && 
                                      abrechnungData.header.orderNumber &&
                                      abrechnungData.positionen && 
                                      Object.keys(abrechnungData.positionen).length > 0;
            
            exportButton.disabled = isPending || !hasValidAbrechnung;
            exportButton.setAttribute('aria-disabled', exportButton.disabled);
            
            if (!hasValidAbrechnung) {
                exportButton.setAttribute('title', 'Bitte erzeugen Sie zuerst eine Abrechnung');
            } else {
                exportButton.removeAttribute('title');
            }
        }
    }

    /**
     * Enhanced status indicator helper with Phase 4 accessibility
     * @param {HTMLElement} element - Status element
     * @param {string} status - Status value
     */
    function updateStatusIndicator(element, status) {
        if (!element) return;
        
        // Remove all status classes
        element.className = 'status-indicator';
        
        // Add current status class
        element.classList.add(`status-${status}`);
        
        // Set enhanced ARIA attributes
        let ariaLabel = `Status: ${status}`;
        let statusText = status;
        
        switch (status) {
            case 'idle':
                statusText = 'ready';
                ariaLabel = 'Status: Ready for input';
                break;
            case 'pending':
                statusText = 'loading';
                ariaLabel = 'Status: Operation in progress';
                break;
            case 'success':
                statusText = 'completed';
                ariaLabel = 'Status: Operation completed successfully';
                break;
            case 'error':
                statusText = 'error';
                ariaLabel = 'Status: An error occurred';
                break;
        }
        
        element.setAttribute('aria-label', ariaLabel);
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
        
        // Add screen reader text
        let srText = element.querySelector('.sr-only');
        if (!srText) {
            srText = document.createElement('span');
            srText.className = 'sr-only';
            element.appendChild(srText);
        }
        srText.textContent = ariaLabel;
    }

    // Public API
    return {
        init,
        updateImportUI,
        updateGenerateUI,
        updateExportUI,
        showProgress,
        updateProgress,
        hideProgress,
        enhanceNewElement
    };
})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    Phase4UIRenderers.init();
});

// Export for use in other modules
export default Phase4UIRenderers;
window.Phase4UIRenderers = Phase4UIRenderers;