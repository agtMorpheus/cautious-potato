/**
 * Main Application Module (Phase 5)
 * 
 * Application initialization and event listener setup
 * Implements Phase 5 integration requirements
 * Updated for modern minimalist sidebar navigation
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
 * View titles and subtitles for navigation
 */
const VIEW_CONFIG = {
    dashboard: { title: 'Dashboard', subtitle: 'Übersicht aller Module und aktueller Status' },
    import: { title: 'Import', subtitle: 'Protokoll-Datei hochladen und verarbeiten' },
    process: { title: 'Process', subtitle: 'Abrechnung aus Protokolldaten erzeugen' },
    export: { title: 'Export', subtitle: 'Fertige Abrechnung herunterladen' },
    templates: { title: 'Templates', subtitle: 'Excel-Vorlagen verwalten' },
    settings: { title: 'Settings', subtitle: 'Anwendungseinstellungen konfigurieren' },
    logs: { title: 'Logs', subtitle: 'Aktivitäts- und Systemprotokoll' },
    help: { title: 'Help', subtitle: 'Dokumentation und Hilfe' }
};

/**
 * Initialize sidebar navigation
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-view]');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn[data-action]');
    
    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            switchView(viewId);
        });
    });
    
    // Handle quick action clicks (navigate to corresponding view)
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'import') {
                switchView('import');
            } else if (action === 'process') {
                switchView('process');
                // Also trigger the generate action
                const generateBtn = document.getElementById('generate-button');
                if (generateBtn && !generateBtn.disabled) {
                    handleGenerateAbrechnung();
                }
            } else if (action === 'export') {
                switchView('export');
                // Also trigger the export action
                const exportBtn = document.getElementById('export-button');
                if (exportBtn && !exportBtn.disabled) {
                    handleExportAbrechnung();
                }
            }
        });
    });
    
    // Handle hash changes for direct linking
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash && VIEW_CONFIG[hash]) {
            switchView(hash);
        }
    });
    
    // Check initial hash
    const initialHash = window.location.hash.slice(1);
    if (initialHash && VIEW_CONFIG[initialHash]) {
        switchView(initialHash);
    }
    
    console.log('✓ Navigation initialized');
}

/**
 * Switch to a different view
 */
function switchView(viewId) {
    // Update active nav link
    const navLinks = document.querySelectorAll('.nav-link[data-view]');
    navLinks.forEach(link => {
        if (link.dataset.view === viewId) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
    
    // Update view containers
    const viewContainers = document.querySelectorAll('.view-container');
    viewContainers.forEach(container => {
        if (container.id === `view-${viewId}`) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    });
    
    // Update header title
    const viewTitle = document.getElementById('view-title');
    const headerSubtitle = document.querySelector('.header-subtitle');
    if (viewTitle && VIEW_CONFIG[viewId]) {
        viewTitle.textContent = VIEW_CONFIG[viewId].title;
    }
    if (headerSubtitle && VIEW_CONFIG[viewId]) {
        headerSubtitle.textContent = VIEW_CONFIG[viewId].subtitle;
    }
    
    // Update URL hash without triggering scroll
    history.replaceState(null, '', `#${viewId}`);
}

/**
 * Update dashboard statistics based on state
 */
function updateDashboardStats(state) {
    const statImport = document.getElementById('stat-import-status');
    const statPositions = document.getElementById('stat-positions');
    const statExports = document.getElementById('stat-exports');
    
    if (statImport) {
        const importStatus = state.ui.import.status;
        statImport.textContent = importStatus === 'success' ? 'Importiert' : 
                                  importStatus === 'pending' ? 'Lädt...' :
                                  importStatus === 'error' ? 'Fehler' : 'Bereit';
    }
    
    if (statPositions) {
        const posCount = state.protokollData?.positionen?.length || 0;
        statPositions.textContent = posCount.toString();
    }
    
    if (statExports) {
        // Count exports (we can track this via last export status)
        const hasExported = state.ui.export.status === 'success';
        statExports.textContent = hasExported ? '1' : '0';
    }
    
    // Update quick action buttons state
    const processBtn = document.querySelector('.quick-action-btn[data-action="process"]');
    const exportBtn = document.querySelector('.quick-action-btn[data-action="export"]');
    
    if (processBtn) {
        const hasValidInput = state.protokollData?.metadata?.auftragsNr && 
                             state.protokollData?.positionen?.length > 0;
        processBtn.disabled = !hasValidInput;
    }
    
    if (exportBtn) {
        const hasValidAbrechnung = state.abrechnungData?.header?.orderNumber &&
                                   Object.keys(state.abrechnungData?.positionen || {}).length > 0;
        exportBtn.disabled = !hasValidAbrechnung;
    }
}

/**
 * Add activity log entry
 */
function addActivityLogEntry(message, type = 'info') {
    const activityLog = document.getElementById('activity-log');
    if (!activityLog) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    const entry = document.createElement('div');
    entry.className = 'activity-item';
    entry.innerHTML = `
        <div class="activity-icon ${type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />' :
                  type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />' :
                  type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />' :
                  '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'}
            </svg>
        </div>
        <div class="activity-content">
            <p class="activity-text">${message}</p>
            <span class="activity-time">${timeStr}</span>
        </div>
    `;
    
    // Insert at the beginning
    activityLog.insertBefore(entry, activityLog.firstChild);
    
    // Keep only last 10 entries
    while (activityLog.children.length > 10) {
        activityLog.removeChild(activityLog.lastChild);
    }
}

/**
 * Add log entry to logs view
 */
function addLogEntry(message, level = 'info') {
    const logEntries = document.getElementById('log-entries');
    if (!logEntries) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-level ${level}">${level.toUpperCase()}</span>
        <span class="log-message">${message}</span>
    `;
    
    // Insert at the beginning
    logEntries.insertBefore(entry, logEntries.firstChild);
    
    // Keep only last 50 entries
    while (logEntries.children.length > 50) {
        logEntries.removeChild(logEntries.lastChild);
    }
}

/**
 * Initialize settings functionality
 */
function initializeSettings() {
    const clearStorageBtn = document.getElementById('clear-storage-btn');
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', () => {
            if (confirm('Möchten Sie wirklich alle lokalen Daten löschen?')) {
                handleResetApplication();
                addActivityLogEntry('Lokaler Speicher wurde gelöscht', 'warning');
                addLogEntry('LocalStorage cleared by user', 'warning');
            }
        });
    }
}

/**
 * Initialize the application (Phase 5.1.4)
 */
async function initializeApp() {
    console.log('Abrechnung Application – Initializing (Phase 5 with Modern UI)');
    
    // 1. Load persisted state (if any)
    const initialState = loadStateFromStorage();
    console.log('Initial state loaded', initialState);
    
    // 2. Initialize static UI (non-dynamic DOM tweaks, ARIA, etc.)
    initializeStaticUI();
    
    // 3. Initialize navigation
    initializeNavigation();
    
    // 4. Initialize settings
    initializeSettings();
    
    // 5. Bind event listeners once
    initializeEventListeners({
        onImport: handleImportFile,
        onGenerate: handleGenerateAbrechnung,
        onExport: handleExportAbrechnung,
        onReset: handleResetApplication
    });
    
    // 6. Subscribe to state changes to keep UI reactive
    subscribe((nextState) => {
        updateImportUI(nextState);
        updateGenerateUI(nextState);
        updateExportUI(nextState);
        updateDashboardStats(nextState);
        
        // Log state changes
        if (nextState.ui.import.status === 'success') {
            addActivityLogEntry('Protokoll erfolgreich importiert', 'success');
            addLogEntry('File import successful', 'success');
        } else if (nextState.ui.import.status === 'error') {
            addActivityLogEntry('Fehler beim Import', 'error');
            addLogEntry('File import failed', 'error');
        }
        
        if (nextState.ui.generate.status === 'success') {
            addActivityLogEntry('Abrechnung erfolgreich erzeugt', 'success');
            addLogEntry('Abrechnung generated', 'success');
        } else if (nextState.ui.generate.status === 'error') {
            addActivityLogEntry('Fehler bei der Erzeugung', 'error');
            addLogEntry('Abrechnung generation failed', 'error');
        }
        
        if (nextState.ui.export.status === 'success') {
            addActivityLogEntry('Export erfolgreich heruntergeladen', 'success');
            addLogEntry('File exported', 'success');
        } else if (nextState.ui.export.status === 'error') {
            addActivityLogEntry('Fehler beim Export', 'error');
            addLogEntry('File export failed', 'error');
        }
    });
    
    // 7. Perform initial render based on loaded state
    const state = getState();
    updateImportUI(state);
    updateGenerateUI(state);
    updateExportUI(state);
    updateDashboardStats(state);
    
    // 8. Add initial log entry
    addLogEntry('Application initialized', 'info');
    
    console.log('Abrechnung Application – Initialization complete');
}

/**
 * Cleanup & Testing Helper (Phase 5.1.5)
 * For testing or hot-reload scenarios
 */
function destroyApp() {
    // Future-proof hook: remove listeners, timers, etc.
    // For now, you can track and remove any custom listeners if you add them.
    console.log('Abrechnung Application – Destroyed');
}

// Set up global error handler
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    addLogEntry(`Error: ${event.error?.message || 'Unknown error'}`, 'error');
    alert(`Fehler: ${event.error?.message || 'Ein unbekannter Fehler ist aufgetreten'}`);
});

// Set up unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    addLogEntry(`Unhandled rejection: ${event.reason?.message || 'Unknown'}`, 'error');
    alert(`Fehler: ${event.reason?.message || 'Ein unbekannter Fehler ist aufgetreten'}`);
});

// Initialize app when DOM is ready (Phase 5.1.4)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for testing purposes
export { initializeApp, destroyApp, switchView };
