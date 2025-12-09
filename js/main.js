/**
 * Main Application Module (Phase 4)
 * 
 * Application initialization and event listener setup
 * Implements Phase 4 event handlers and reactive UI updates
 */

import { getState, subscribe, loadStateFromStorage } from './state.js';
import * as handlers from './handlers.js';

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('=== Abrechnung Application Initializing (Phase 4) ===');
    
    // 1. Load persisted state from localStorage
    const initialState = loadStateFromStorage();
    console.log('Initial state:', initialState);
    
    // 2. Set up event listeners using Phase 4 initialization
    handlers.initializeEventListeners();
    
    // 3. Initial UI update based on loaded state
    updateUI(getState());
    
    // 4. Subscribe to state changes for debugging (development only)
    subscribe((nextState) => {
        console.log('State changed:', nextState);
    });
    
    console.log('=== Abrechnung Generator initialized successfully (Phase 4) ===');
}

/**
 * Set up all event listeners (Phase 4 - Delegated to handlers.js)
 */
function setupEventListeners() {
    // This is now handled by handlers.initializeEventListeners()
    // Keeping this function for backward compatibility
    handlers.initializeEventListeners();
}

/**
 * Update UI based on current state (Phase 4)
 * @param {Object} state - Current application state
 */
function updateUI(state) {
    // Update status badge based on new UI state structure
    updateStatusBadge(state);
    
    // Phase 4: UI updates are now handled by handlers module
    // through state subscription
    handlers.updateImportUI(state);
    handlers.updateGenerateUI(state);
    handlers.updateExportUI(state);
}

/**
 * Update status badge display (Phase 2)
 * Derives overall status from ui section statuses
 * @param {Object} state - Current application state
 */
function updateStatusBadge(state) {
    const statusBadge = document.getElementById('statusBadge');
    if (!statusBadge) return;
    
    // Remove all status classes
    statusBadge.classList.remove('importing', 'generating', 'ready', 'error');
    
    const ui = state.ui;
    
    // Determine status based on UI section statuses (Phase 2 structure)
    // Check for errors first
    if (ui.import.status === 'error' || ui.generate.status === 'error' || ui.export.status === 'error') {
        statusBadge.textContent = 'Fehler';
        statusBadge.classList.add('error');
        return;
    }
    
    // Check for pending operations
    if (ui.import.status === 'pending') {
        statusBadge.textContent = 'Importiere...';
        statusBadge.classList.add('importing');
        return;
    }
    
    if (ui.generate.status === 'pending') {
        statusBadge.textContent = 'Generiere...';
        statusBadge.classList.add('generating');
        return;
    }
    
    if (ui.export.status === 'pending') {
        statusBadge.textContent = 'Exportiere...';
        statusBadge.classList.add('generating');
        return;
    }
    
    // Check for successful completion states
    if (ui.generate.status === 'success') {
        statusBadge.textContent = 'Abrechnung bereit';
        statusBadge.classList.add('ready');
        return;
    }
    
    if (ui.import.status === 'success') {
        statusBadge.textContent = 'Protokoll importiert';
        statusBadge.classList.add('ready');
        return;
    }
    
    // Default idle state
    statusBadge.textContent = 'Bereit';
    statusBadge.classList.add('ready');
}

/**
 * Update button enabled/disabled states (Phase 2)
 * @param {Object} state - Current application state
 */
function updateButtonStates(state) {
    const generateBtn = document.getElementById('generateBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    // Check if protokollData has positions (Phase 2 structure)
    const hasProtokollData = state.protokollData?.positionen?.length > 0;
    const hasAbrechnungData = Object.keys(state.abrechnungData?.positionen || {}).length > 0;
    
    // Generate button - enabled if protokoll is imported and not currently importing
    if (generateBtn) {
        generateBtn.disabled = !hasProtokollData || state.ui.import.status === 'pending';
    }
    
    // Export button - enabled if abrechnung is generated and not currently generating
    if (exportBtn) {
        exportBtn.disabled = !hasAbrechnungData || state.ui.generate.status === 'pending';
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
