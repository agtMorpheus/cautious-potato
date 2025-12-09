/**
 * Main Application Module (Phase 5)
 * 
 * Application initialization and event listener setup
 * Implements Phase 5 integration requirements
 * Updated for modern minimalist sidebar navigation
 * Includes hybrid sync approach (Option 3 from DATABASE_USAGE_ANALYSIS.md)
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

// Contract Manager imports (Phase 1)
import { initializeContractEventListeners, handleContractMappingChange } from './contracts/contractHandlers.js';
import { initializeContractUI } from './contracts/contractRenderer.js';

// Protokoll Module imports (Phase 4)
import * as protokollState from './protokoll/protokoll-state.js';
import * as protokollHandlers from './protokoll/protokoll-handlers.js';
import * as protokollRenderer from './protokoll/protokoll-renderer.js';
import * as protokollExporter from './protokoll/protokoll-exporter.js';
// Sync imports (Hybrid Approach - Option 3)
import { 
    loadSyncConfig, 
    saveSyncConfig, 
    StorageMode, 
    getLastSyncTime 
} from './contracts/syncConfig.js';
import { 
    initSyncService, 
    performFullSync, 
    getSyncStatus, 
    subscribeSyncStatus,
    exportContractsAsJson,
    importContractsFromJson
} from './contracts/syncService.js';

/**
 * View titles and subtitles for navigation
 */
const VIEW_CONFIG = {
    dashboard: { title: 'Dashboard', subtitle: 'Übersicht aller Module und aktueller Status' },
    import: { title: 'Import', subtitle: 'Protokoll-Datei hochladen und verarbeiten' },
    process: { title: 'Process', subtitle: 'Abrechnung aus Protokolldaten erzeugen' },
    export: { title: 'Export', subtitle: 'Fertige Abrechnung herunterladen' },
    protokoll: { title: 'Protokoll', subtitle: 'VDE 0100 Prüfprotokoll erstellen und exportieren' },
    contracts: { title: 'Contract Manager', subtitle: 'Verträge importieren und verwalten' },
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
 * Initialize Protokoll Module (Phase 4)
 * Sets up state, handlers, renderer, and export functionality
 */
function initializeProtokollModule() {
    console.log('Protokoll Module: Initializing...');
    
    // Check if SheetJS library is available
    if (typeof XLSX === 'undefined') {
        console.warn('Protokoll Module: SheetJS library not loaded - export may not work');
    } else {
        console.log('Protokoll Module: SheetJS library available');
    }

    // Initialize state management
    try {
        protokollState.init();
        console.log('Protokoll Module: State management initialized');
    } catch (error) {
        console.error('Protokoll Module: State initialization failed:', error);
        return false;
    }

    // Initialize handlers
    try {
        protokollHandlers.init();
        console.log('Protokoll Module: Event handlers initialized');
    } catch (error) {
        console.error('Protokoll Module: Handler initialization failed:', error);
        return false;
    }

    // Initialize renderer
    try {
        protokollRenderer.init();
        console.log('Protokoll Module: UI renderer initialized');
    } catch (error) {
        console.error('Protokoll Module: Renderer initialization failed:', error);
        return false;
    }

    // Wire up export handlers
    setupProtokollExportHandlers();

    console.log('Protokoll Module: Fully initialized');
    return true;
}

/**
 * Set up Protokoll export button handlers
 */
function setupProtokollExportHandlers() {
    // Listen for export events from handlers
    document.addEventListener('protokoll:export', async (e) => {
        try {
            protokollRenderer.displayMessage('info', 'Export wird vorbereitet...');
            
            // Determine export type from button clicked
            const action = e.detail?.action || 'both';
            
            if (action === 'protokoll') {
                await protokollExporter.exportProtokoll();
            } else if (action === 'abrechnung') {
                await protokollExporter.exportAbrechnung();
            } else {
                await protokollExporter.exportBoth();
            }
            
            protokollRenderer.displayMessage('success', 'Export erfolgreich abgeschlossen!');
            addActivityLogEntry('Protokoll Export erfolgreich', 'success');
            addLogEntry('Protokoll exported successfully', 'success');
            
            // Track export
            protokollState.markUnsaved();
            protokollState.forceSave();
        } catch (error) {
            console.error('Export error:', error);
            protokollRenderer.displayMessage('error', `Export fehlgeschlagen: ${error.message}`);
            addActivityLogEntry('Protokoll Export fehlgeschlagen', 'error');
            addLogEntry(`Protokoll export failed: ${error.message}`, 'error');
        }
    });

    // Wire up export buttons to handlers using event delegation
    document.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action^="export-"]');
        if (!button) return;
        
        // Only handle buttons within protokoll section
        const protokollSection = button.closest('#view-protokoll, .protokoll-form');
        if (!protokollSection) return;

        e.preventDefault();
        
        const action = button.getAttribute('data-action');
        
        // Dispatch export event with action type
        document.dispatchEvent(new CustomEvent('protokoll:export', {
            detail: { 
                state: protokollState.getState(),
                action: action.replace('export-', '')
            }
        }));
    });
 * Initialize sync settings functionality (Hybrid Approach - Option 3)
 */
function initializeSyncSettings() {
    // Get UI elements
    const storageModeLocal = document.getElementById('storage-mode-local');
    const storageModeSync = document.getElementById('storage-mode-sync');
    const syncStatusSection = document.getElementById('sync-status-section');
    const syncStatusIndicator = document.getElementById('sync-status-indicator');
    const syncStatusText = document.getElementById('sync-status-text');
    const syncLastTime = document.getElementById('sync-last-time');
    const syncNowBtn = document.getElementById('sync-now-btn');
    const autoSyncCheckbox = document.getElementById('auto-sync-checkbox');
    const exportBackupBtn = document.getElementById('export-backup-btn');
    const importBackupInput = document.getElementById('import-backup-input');
    
    // Load current config
    const config = loadSyncConfig();
    
    // Set initial radio state
    if (storageModeLocal && storageModeSync) {
        if (config.storageMode === StorageMode.SYNC_WITH_SERVER) {
            storageModeSync.checked = true;
            if (syncStatusSection) syncStatusSection.style.display = 'block';
        } else {
            storageModeLocal.checked = true;
            if (syncStatusSection) syncStatusSection.style.display = 'none';
        }
    }
    
    // Set initial auto-sync state
    if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = config.autoSync || false;
    }
    
    // Update last sync time display
    updateSyncTimeDisplay();
    
    // Storage mode change handlers
    if (storageModeLocal) {
        storageModeLocal.addEventListener('change', () => {
            if (storageModeLocal.checked) {
                saveSyncConfig({ storageMode: StorageMode.LOCAL_ONLY });
                if (syncStatusSection) syncStatusSection.style.display = 'none';
                addActivityLogEntry('Speichermodus: Nur lokal', 'info');
                addLogEntry('Storage mode changed to local only', 'info');
            }
        });
    }
    
    if (storageModeSync) {
        storageModeSync.addEventListener('change', () => {
            if (storageModeSync.checked) {
                saveSyncConfig({ storageMode: StorageMode.SYNC_WITH_SERVER });
                if (syncStatusSection) syncStatusSection.style.display = 'block';
                addActivityLogEntry('Speichermodus: Mit Server synchronisieren', 'info');
                addLogEntry('Storage mode changed to sync with server', 'info');
            }
        });
    }
    
    // Sync now button handler
    if (syncNowBtn) {
        syncNowBtn.addEventListener('click', async () => {
            syncNowBtn.disabled = true;
            syncNowBtn.textContent = 'Synchronisiere...';
            
            try {
                const result = await performFullSync();
                if (result.success) {
                    addActivityLogEntry('Synchronisation erfolgreich', 'success');
                    addLogEntry('Manual sync completed successfully', 'success');
                } else {
                    const errorMessage = result.reason || result.error || 'Unbekannter Fehler';
                    addActivityLogEntry(`Synchronisation fehlgeschlagen: ${errorMessage}`, 'error');
                    addLogEntry(`Manual sync failed: ${errorMessage}`, 'error');
                }
            } catch (error) {
                addActivityLogEntry(`Synchronisation fehlgeschlagen: ${error.message}`, 'error');
                addLogEntry(`Manual sync error: ${error.message}`, 'error');
            } finally {
                syncNowBtn.disabled = false;
                syncNowBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 8px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Jetzt synchronisieren
                `;
            }
        });
    }
    
    // Auto-sync checkbox handler
    if (autoSyncCheckbox) {
        autoSyncCheckbox.addEventListener('change', () => {
            saveSyncConfig({ autoSync: autoSyncCheckbox.checked });
            if (autoSyncCheckbox.checked) {
                addActivityLogEntry('Automatische Synchronisation aktiviert', 'info');
                addLogEntry('Auto-sync enabled', 'info');
            } else {
                addActivityLogEntry('Automatische Synchronisation deaktiviert', 'info');
                addLogEntry('Auto-sync disabled', 'info');
            }
        });
    }
    
    // Export backup handler
    if (exportBackupBtn) {
        exportBackupBtn.addEventListener('click', () => {
            try {
                const backup = exportContractsAsJson();
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `contracts-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                addActivityLogEntry('Backup exportiert', 'success');
                addLogEntry('Backup exported successfully', 'success');
            } catch (error) {
                addActivityLogEntry(`Backup-Export fehlgeschlagen: ${error.message}`, 'error');
                addLogEntry(`Backup export failed: ${error.message}`, 'error');
            }
        });
    }
    
    // Import backup handler
    if (importBackupInput) {
        importBackupInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const result = importContractsFromJson(data, { replace: false });
                    
                    if (result.success) {
                        addActivityLogEntry(`Backup importiert: ${result.imported} Verträge`, 'success');
                        addLogEntry(`Backup imported: ${result.imported} contracts`, 'success');
                    } else {
                        addActivityLogEntry(`Backup-Import fehlgeschlagen: ${result.error}`, 'error');
                        addLogEntry(`Backup import failed: ${result.error}`, 'error');
                    }
                } catch (error) {
                    addActivityLogEntry(`Backup-Import fehlgeschlagen: ${error.message}`, 'error');
                    addLogEntry(`Backup import failed: ${error.message}`, 'error');
                }
                
                // Reset file input
                importBackupInput.value = '';
            };
            reader.readAsText(file);
        });
    }
    
    // Subscribe to sync status changes
    subscribeSyncStatus((status) => {
        updateSyncStatusUI(status);
    });
    
    console.log('✓ Sync settings initialized');
}

/**
 * Update sync status UI
 */
function updateSyncStatusUI(status) {
    const syncStatusIndicator = document.getElementById('sync-status-indicator');
    const syncStatusText = document.getElementById('sync-status-text');
    
    if (!syncStatusIndicator || !syncStatusText) return;
    
    // Remove all status classes
    syncStatusIndicator.classList.remove('syncing', 'synced', 'error', 'offline');
    
    // Add appropriate class and text
    switch (status.status) {
        case 'syncing':
            syncStatusIndicator.classList.add('syncing');
            syncStatusText.textContent = 'Synchronisiere...';
            break;
        case 'synced':
            syncStatusIndicator.classList.add('synced');
            syncStatusText.textContent = 'Synchronisiert';
            break;
        case 'error':
            syncStatusIndicator.classList.add('error');
            syncStatusText.textContent = `Fehler: ${status.error || 'Unbekannt'}`;
            break;
        case 'offline':
            syncStatusIndicator.classList.add('offline');
            syncStatusText.textContent = 'Offline';
            break;
        default:
            syncStatusText.textContent = 'Bereit';
    }
    
    // Update last sync time
    updateSyncTimeDisplay();
}

/**
 * Update last sync time display
 */
function updateSyncTimeDisplay() {
    const syncLastTime = document.getElementById('sync-last-time');
    if (!syncLastTime) return;
    
    const lastSync = getLastSyncTime();
    if (lastSync) {
        const date = new Date(lastSync);
        syncLastTime.textContent = `Letzte Synchronisation: ${date.toLocaleString('de-DE')}`;
    } else {
        syncLastTime.textContent = 'Noch nicht synchronisiert';
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
    
    // 4b. Initialize sync settings (Hybrid Approach - Option 3)
    initializeSyncSettings();
    
    // 4c. Initialize sync service
    initSyncService();
    
    // 5. Bind event listeners once
    initializeEventListeners({
        onImport: handleImportFile,
        onGenerate: handleGenerateAbrechnung,
        onExport: handleExportAbrechnung,
        onReset: handleResetApplication
    });
    
    // 5b. Initialize Contract Manager event listeners (Phase 1)
    initializeContractEventListeners();
    
    // 5c. Set up global handler for contract mapping changes
    // This is used by dynamically rendered mapping selects
    window._handleMappingChange = handleContractMappingChange;
    
    // 5d. Initialize Protokoll Module (Phase 4)
    initializeProtokollModule();
    
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
        
        // Log contract import status changes
        if (nextState.contracts?.importState?.status === 'success') {
            addActivityLogEntry('Verträge erfolgreich importiert', 'success');
            addLogEntry('Contract import successful', 'success');
        } else if (nextState.contracts?.importState?.status === 'error') {
            addActivityLogEntry('Fehler beim Vertragsimport', 'error');
            addLogEntry('Contract import failed', 'error');
        }
    });
    
    // 7. Perform initial render based on loaded state
    const state = getState();
    updateImportUI(state);
    updateGenerateUI(state);
    updateExportUI(state);
    updateDashboardStats(state);
    
    // 7b. Initialize Contract Manager UI (Phase 1)
    initializeContractUI();
    
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
