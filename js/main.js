/**
 * Main Application Module (Phase 5)
 * 
 * Application initialization and event listener setup
 * Implements Phase 5 integration requirements
 */

import { getState, subscribe, loadStateFromStorage } from './state.js';
import {
    handleImportFile,
    handleGenerateAbrechnung,
    handleExportAbrechnung,
    handleResetApplication,
    initializeEventListeners
} from './handlers.js';
import {
    updateImportUI,
    updateGenerateUI,
    updateExportUI,
    initializeStaticUI
} from './ui.js';

/**
 * Initialize the application (Phase 5.1.4)
 */
async function initializeApp() {
    console.log('Abrechnung Application – Initializing (Phase 5)');
    
    // 1. Load persisted state (if any)
    const initialState = loadStateFromStorage();
    console.log('Initial state loaded', initialState);
    
    // 2. Initialize static UI (non-dynamic DOM tweaks, ARIA, etc.)
    initializeStaticUI();
    
    // 3. Bind event listeners once
    initializeEventListeners({
        onImport: handleImportFile,
        onGenerate: handleGenerateAbrechnung,
        onExport: handleExportAbrechnung,
        onReset: handleResetApplication
    });
    
    // 4. Subscribe to state changes to keep UI reactive
    subscribe((nextState) => {
        updateImportUI(nextState);
        updateGenerateUI(nextState);
        updateExportUI(nextState);
    });
    
    // 5. Perform initial render based on loaded state
    const state = getState();
    updateImportUI(state);
    updateGenerateUI(state);
    updateExportUI(state);
    
    console.log('Abrechnung Application – Initialization complete');
}

/**
 * Cleanup & Testing Helper (Phase 5.1.5)
 * For testing or hot-reload scenarios
 */
export function destroyApp() {
    // Future-proof hook: remove listeners, timers, etc.
    // For now, you can track and remove any custom listeners if you add them.
    console.log('Abrechnung Application – Destroyed');
}

// Set up global error handler
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    alert(`Fehler: ${event.error?.message || 'Ein unbekannter Fehler ist aufgetreten'}`);
});

// Set up unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    alert(`Fehler: ${event.reason?.message || 'Ein unbekannter Fehler ist aufgetreten'}`);
});

// Initialize app when DOM is ready (Phase 5.1.4)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for testing purposes
export { initializeApp, destroyApp };
