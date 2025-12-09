/**
 * Main Application Module
 * 
 * Application initialization and event listener setup
 */

import { getState, subscribe, loadState } from './state.js';
import * as handlers from './handlers.js';

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing Abrechnung Generator...');
    
    // Load saved state from localStorage
    const stateLoaded = loadState();
    if (stateLoaded) {
        console.log('Previous state loaded from localStorage');
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Subscribe to state changes for UI updates
    subscribe(updateUI);
    
    // Initial UI update
    updateUI(getState());
    
    console.log('Abrechnung Generator initialized successfully');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // File input change
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handlers.handleFileSelect);
    }
    
    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', handlers.handleImportProtokoll);
    }
    
    // Generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handlers.handleGenerateAbrechnung);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handlers.handleExportAbrechnung);
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handlers.handleReset);
    }
    
    console.log('Event listeners set up');
}

/**
 * Update UI based on current state
 * @param {Object} state - Current application state
 */
function updateUI(state) {
    // Update status badge
    updateStatusBadge(state.status);
    
    // Update button states
    updateButtonStates(state);
}

/**
 * Update status badge display
 * @param {string} status - Current status
 */
function updateStatusBadge(status) {
    const statusBadge = document.getElementById('statusBadge');
    if (!statusBadge) return;
    
    // Remove all status classes
    statusBadge.classList.remove('importing', 'generating', 'ready', 'error');
    
    // Set status text and class
    switch (status) {
        case 'importing':
            statusBadge.textContent = 'Importiere...';
            statusBadge.classList.add('importing');
            break;
        case 'imported':
            statusBadge.textContent = 'Protokoll importiert';
            statusBadge.classList.add('ready');
            break;
        case 'generating':
            statusBadge.textContent = 'Generiere...';
            statusBadge.classList.add('generating');
            break;
        case 'generated':
            statusBadge.textContent = 'Abrechnung bereit';
            statusBadge.classList.add('ready');
            break;
        case 'error':
            statusBadge.textContent = 'Fehler';
            statusBadge.classList.add('error');
            break;
        default:
            statusBadge.textContent = 'Bereit';
            statusBadge.classList.add('ready');
    }
}

/**
 * Update button enabled/disabled states
 * @param {Object} state - Current application state
 */
function updateButtonStates(state) {
    const generateBtn = document.getElementById('generateBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    // Generate button - enabled if protokoll is imported
    if (generateBtn) {
        generateBtn.disabled = !state.protokollData || state.status === 'importing';
    }
    
    // Export button - enabled if abrechnung is generated
    if (exportBtn) {
        exportBtn.disabled = !state.abrechnungData || state.status === 'generating';
    }
}

/**
 * Handle errors globally
 * @param {Error} error - Error object
 */
function handleError(error) {
    console.error('Application error:', error);
    alert(`Fehler: ${error.message}`);
}

// Set up global error handler
window.addEventListener('error', (event) => {
    handleError(event.error);
});

// Set up unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason);
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for testing purposes
export { initializeApp, updateUI };
