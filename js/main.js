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

// Phase 4: Enhanced UI Renderers with Accessibility
import Phase4UIRenderers from './phase4-ui-renderers.js';

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

// HR Module imports (Phase 5)
import { hrIntegration } from './modules/hr/hrIntegration.js';
import { initializeHrDashboard } from './modules/hr/main.js';
import {
    getHrState,
    subscribeHr,
    addEmployee,
    updateEmployee,
    deleteEmployee
} from './modules/hr/hrState.js';

// Messgerät Module imports
import * as messgeraetState from './messgeraet/messgeraet-state.js';
import * as messgeraetHandlers from './messgeraet/messgeraet-handlers.js';
import * as messgeraetRenderer from './messgeraet/messgeraet-renderer.js';

// Asset Module imports
import * as assetState from './modules/assets/asset-state.js';
import * as assetHandlers from './modules/assets/asset-handlers.js';
import * as assetRenderer from './modules/assets/asset-renderer.js';
import * as assetDetailRenderer from './modules/assets/asset-detail-renderer.js';
import assetDb from './modules/assets/asset-db.js';

// Dashboard Module imports (Welcome Messages)
import { initDashboardModule } from './modules/dashboard/index.js';

// Logs Module imports
import { initLogsModule, addLog } from './modules/logs/index.js';

// Performance Monitor (Phase 5)
import performanceMonitor from './performance-monitor.js';

/**
 * View titles and subtitles for navigation
 */
const VIEW_CONFIG = {
    dashboard: { title: 'Dashboard', subtitle: 'Übersicht aller Module und aktueller Status' },
    workflow: { title: 'Abrechnung', subtitle: 'Abrechnung Workflow: Import, Prozess & Export' },
    protokoll: { title: 'Protokoll', subtitle: 'VDE 0100 Prüfprotokoll erstellen und exportieren' },
    messgeraet: { title: 'Messgeräte', subtitle: 'Messgeräte verwalten und Kalibrierungsdaten erfassen' },
    contracts: { title: 'Contract Manager', subtitle: 'Verträge importieren und verwalten' },
    hr: { title: 'HR Management', subtitle: 'Employees, attendance, schedules, and vacation' },
    assets: { title: 'Asset Management', subtitle: 'Verteiler-Assets importieren und verwalten' },
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
                switchView('workflow');
            } else if (action === 'process') {
                switchView('workflow');
                // Also trigger the generate action
                const generateBtn = document.getElementById('generate-button');
                if (generateBtn && !generateBtn.disabled) {
                    handleGenerateAbrechnung();
                }
            } else if (action === 'export') {
                switchView('workflow');
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

    // Sidebar Toggle Logic
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const appContainer = document.querySelector('.app-container');

    if (sidebarToggle && sidebar) {
        // Load saved state or default to collapsed on wide screens
        const storedState = localStorage.getItem('sidebar-collapsed');
        const isWideScreen = window.innerWidth > 1600;

        let isCollapsed;
        if (storedState !== null) {
            isCollapsed = storedState === 'true';
        } else {
            // Default behavior: always collapsed as new standard
            isCollapsed = true;
        }

        // Apply initial state
        if (isCollapsed) {
            appContainer.classList.add('sidebar-collapsed');
            // Update icon to point right (expand)
            const iconPath = sidebarToggle.querySelector('path');
            if (iconPath) iconPath.setAttribute('d', 'M9 5l7 7-7 7');
        }

        // Apply workspace wide mode if wide screen
        if (isWideScreen && appContainer) {
            appContainer.classList.add('workspace-wide');
        }

        sidebarToggle.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-collapsed');
            const collapsed = appContainer.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', collapsed);

            // Update icon direction
            const iconPath = sidebarToggle.querySelector('path');
            if (iconPath) {
                if (collapsed) {
                    iconPath.setAttribute('d', 'M9 5l7 7-7 7'); // Right
                } else {
                    iconPath.setAttribute('d', 'M15 19l-7-7 7-7'); // Left
                }
            }
        });
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
 * @deprecated Use addLog from logs module instead
 */
function addLogEntry(message, level = 'info') {
    addLog(message, level);
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
}

/**
 * Initialize HR Module (Phase 5)
 * Sets up HR dashboard with tab navigation and CRUD operations
 */
function initializeHRModule() {
    console.log('HR Module: Initializing...');

    // Delegate to the dedicated HR module handler
    initializeHrDashboard();

    console.log('✓ HR Module initialized');
    return true;
}

/**
 * Switch HR tab within the HR view
 */
function switchHRTab(tabName) {
    // Update active nav button
    document.querySelectorAll('[data-hr-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.hrTab === tabName);
    });

    // Update tab visibility
    document.querySelectorAll('#hr-tab-content .hr-tab').forEach(tab => {
        tab.classList.toggle('hr-tab--active', tab.id === `hr-${tabName}-tab`);
    });
}

/**
 * Update HR dashboard statistics
 */
function updateHRDashboardStats(state) {
    const totalEl = document.getElementById('hr-total-employees');
    const activeEl = document.getElementById('hr-active-employees');
    const deptsEl = document.getElementById('hr-departments');
    const pendingEl = document.getElementById('hr-pending-requests');

    if (totalEl) {
        totalEl.textContent = state.employees?.length || 0;
    }
    if (activeEl) {
        const activeCount = (state.employees || []).filter(e =>
            e.employmentStatus === 'active' && !e.archived
        ).length;
        activeEl.textContent = activeCount;
    }
    if (deptsEl) {
        const depts = new Set((state.employees || []).map(e => e.department).filter(Boolean));
        deptsEl.textContent = depts.size;
    }
    if (pendingEl) {
        pendingEl.textContent = state.metadata?.pendingApprovals || 0;
    }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Initialize HR event handlers for the embedded HR dashboard
 */
function initializeHREventHandlers() {
    // Add employee button - opens a simple modal form
    const addEmployeeBtn = document.getElementById('hr-add-employee-btn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            showHREmployeeForm();
        });
    }

    // Record attendance button
    const recordAttendanceBtn = document.getElementById('hr-record-attendance-btn');
    if (recordAttendanceBtn) {
        recordAttendanceBtn.addEventListener('click', () => {
            addActivityLogEntry('Full attendance features available in HR Dashboard', 'info');
        });
    }

    // Create schedule button
    const createScheduleBtn = document.getElementById('hr-create-schedule-btn');
    if (createScheduleBtn) {
        createScheduleBtn.addEventListener('click', () => {
            addActivityLogEntry('Full schedule features available in HR Dashboard', 'info');
        });
    }

    // Request vacation button
    const requestVacationBtn = document.getElementById('hr-request-vacation-btn');
    if (requestVacationBtn) {
        requestVacationBtn.addEventListener('click', () => {
            addActivityLogEntry('Full vacation features available in HR Dashboard', 'info');
        });
    }

    // Search and filter handlers
    const searchInput = document.getElementById('hr-employee-search');
    const deptFilter = document.getElementById('hr-department-filter');
    const statusFilter = document.getElementById('hr-status-filter');

    if (searchInput) {
        searchInput.addEventListener('input', () => renderHREmployeeList());
    }
    if (deptFilter) {
        deptFilter.addEventListener('change', () => renderHREmployeeList());
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderHREmployeeList());
    }

    // Event delegation for employee actions
    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-hr-action="edit"]');
        const deleteBtn = e.target.closest('[data-hr-action="delete"]');

        if (editBtn) {
            const employeeId = editBtn.dataset.hrEmployeeId;
            showHREmployeeForm(employeeId);
        }
        if (deleteBtn) {
            const employeeId = deleteBtn.dataset.hrEmployeeId;
            if (confirm('Are you sure you want to delete this employee?')) {
                try {
                    deleteEmployee(employeeId);
                    addActivityLogEntry('Employee deleted successfully', 'success');
                    renderHREmployeeList();
                } catch (error) {
                    addActivityLogEntry(`Error: ${error.message}`, 'error');
                }
            }
        }
    });
}

/**
 * Render HR employee list with proper HTML escaping
 */
function renderHREmployeeList() {
    const container = document.getElementById('hr-employee-list');
    if (!container) return;

    const state = getHrState();
    let employees = state.employees || [];

    // Apply filters
    const searchTerm = document.getElementById('hr-employee-search')?.value?.toLowerCase() || '';
    const deptFilter = document.getElementById('hr-department-filter')?.value || '';
    const statusFilter = document.getElementById('hr-status-filter')?.value || '';

    if (searchTerm) {
        employees = employees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm) ||
            e.email?.toLowerCase().includes(searchTerm) ||
            e.id?.toLowerCase().includes(searchTerm)
        );
    }
    if (deptFilter) {
        employees = employees.filter(e => e.department === deptFilter);
    }
    if (statusFilter) {
        employees = employees.filter(e => e.employmentStatus === statusFilter);
    }

    // Filter out archived
    employees = employees.filter(e => !e.archived);

    if (employees.length === 0) {
        container.innerHTML = `
            <div class="hr-empty-state">
                <svg class="hr-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p class="hr-empty-title">No employees found</p>
                <p class="hr-empty-text">Add your first employee to get started</p>
            </div>
        `;
        return;
    }

    // Render employee table with escaped HTML
    const tableRows = employees.map(emp => {
        const firstName = escapeHtml(emp.firstName || '');
        const lastName = escapeHtml(emp.lastName || '');
        const email = escapeHtml(emp.email || '');
        const department = escapeHtml(emp.department || '-');
        const position = escapeHtml(emp.position || '-');
        const status = escapeHtml(emp.employmentStatus || 'active');
        const initials = `${(emp.firstName || '')[0] || ''}${(emp.lastName || '')[0] || ''}`;
        const empId = escapeHtml(emp.id || '');

        return `
            <tr>
                <td>
                    <div class="hr-employee-name">
                        <div class="hr-employee-avatar">${escapeHtml(initials)}</div>
                        <div>
                            <div>${firstName} ${lastName}</div>
                            <span class="hr-employee-email">${email}</span>
                        </div>
                    </div>
                </td>
                <td>${department}</td>
                <td>${position}</td>
                <td><span class="hr-status-badge hr-status-${status}">${status}</span></td>
                <td>
                    <div class="hr-action-buttons">
                        <button class="hr-btn-icon" title="Edit" data-hr-action="edit" data-hr-employee-id="${empId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button class="hr-btn-icon hr-btn-danger" title="Delete" data-hr-action="delete" data-hr-employee-id="${empId}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="hr-data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

/**
 * Show HR employee form modal for add/edit
 */
function showHREmployeeForm(employeeId = null) {
    const state = getHrState();
    const employee = employeeId ? state.employees.find(e => e.id === employeeId) : null;
    const title = employee ? 'Edit Employee' : 'Add New Employee';

    // Create modal HTML
    const modalHtml = `
        <div id="hr-employee-modal" class="hr-modal" role="dialog" aria-labelledby="hr-modal-title">
            <div class="hr-modal__overlay"></div>
            <div class="hr-modal__content">
                <div class="hr-modal__header">
                    <h3 id="hr-modal-title">${escapeHtml(title)}</h3>
                    <button class="hr-modal__close" aria-label="Close">&times;</button>
                </div>
                <form id="hr-employee-form" class="hr-form">
                    <div class="hr-form-row">
                        <div class="hr-form-group">
                            <label for="hr-emp-firstname">First Name *</label>
                            <input type="text" id="hr-emp-firstname" name="firstName" required value="${escapeHtml(employee?.firstName || '')}">
                        </div>
                        <div class="hr-form-group">
                            <label for="hr-emp-lastname">Last Name *</label>
                            <input type="text" id="hr-emp-lastname" name="lastName" required value="${escapeHtml(employee?.lastName || '')}">
                        </div>
                    </div>
                    <div class="hr-form-group">
                        <label for="hr-emp-email">Email *</label>
                        <input type="email" id="hr-emp-email" name="email" required value="${escapeHtml(employee?.email || '')}">
                    </div>
                    <div class="hr-form-row">
                        <div class="hr-form-group">
                            <label for="hr-emp-department">Department *</label>
                            <select id="hr-emp-department" name="department" required>
                                <option value="">Select Department</option>
                                <option value="Engineering" ${employee?.department === 'Engineering' ? 'selected' : ''}>Engineering</option>
                                <option value="Sales" ${employee?.department === 'Sales' ? 'selected' : ''}>Sales</option>
                                <option value="Marketing" ${employee?.department === 'Marketing' ? 'selected' : ''}>Marketing</option>
                                <option value="Human Resources" ${employee?.department === 'Human Resources' ? 'selected' : ''}>Human Resources</option>
                                <option value="Finance" ${employee?.department === 'Finance' ? 'selected' : ''}>Finance</option>
                            </select>
                        </div>
                        <div class="hr-form-group">
                            <label for="hr-emp-position">Position</label>
                            <input type="text" id="hr-emp-position" name="position" value="${escapeHtml(employee?.position || 'Employee')}">
                        </div>
                    </div>
                    <div class="hr-form-actions">
                        <button type="button" class="hr-btn hr-btn-secondary" data-action="cancel">Cancel</button>
                        <button type="submit" class="hr-btn hr-btn-primary">${employee ? 'Update' : 'Add'} Employee</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add modal to DOM
    const existingModal = document.getElementById('hr-employee-modal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('hr-employee-modal');
    const form = document.getElementById('hr-employee-form');
    const closeBtn = modal.querySelector('.hr-modal__close');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const overlay = modal.querySelector('.hr-modal__overlay');

    // Close handlers
    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Form submit handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            if (employee) {
                updateEmployee(employeeId, data);
                addActivityLogEntry('Employee updated successfully', 'success');
            } else {
                addEmployee({
                    ...data,
                    hoursPerWeek: 40,
                    startDate: new Date().toISOString().split('T')[0],
                    employmentStatus: 'active'
                });
                addActivityLogEntry('Employee added successfully', 'success');
            }
            closeModal();
            renderHREmployeeList();
        } catch (error) {
            addActivityLogEntry(`Error: ${error.message}`, 'error');
        }
    });
}

/**
 * Initialize Messgerät (Measurement Devices) Module
 * Sets up state, handlers, and renderer for device management
 */
function initializeMessgeraetModule() {
    console.log('Messgerät Module: Initializing...');

    // Initialize state management
    try {
        messgeraetState.init();
        console.log('Messgerät Module: State management initialized');
    } catch (error) {
        console.error('Messgerät Module: State initialization failed:', error);
        return false;
    }

    // Initialize handlers
    try {
        messgeraetHandlers.init();
        console.log('Messgerät Module: Event handlers initialized');
    } catch (error) {
        console.error('Messgerät Module: Handler initialization failed:', error);
        return false;
    }

    // Initialize renderer
    try {
        messgeraetRenderer.init();
        console.log('Messgerät Module: UI renderer initialized');
    } catch (error) {
        console.error('Messgerät Module: Renderer initialization failed:', error);
        return false;
    }

    // Subscribe to device changes for activity logging
    messgeraetState.on('deviceAdded', ({ device }) => {
        addActivityLogEntry(`Messgerät hinzugefügt: ${device.name}`, 'success');
        addLogEntry(`Device added: ${device.name}`, 'success');
    });

    messgeraetState.on('deviceUpdated', ({ device }) => {
        addActivityLogEntry(`Messgerät aktualisiert: ${device?.name || 'Unknown'}`, 'info');
        addLogEntry(`Device updated: ${device?.name || 'Unknown'}`, 'info');
    });

    messgeraetState.on('deviceDeleted', ({ deviceId }) => {
        addActivityLogEntry('Messgerät gelöscht', 'warning');
        addLogEntry(`Device deleted: ${deviceId}`, 'warning');
    });

    console.log('✓ Messgerät Module initialized');
    return true;
}

/**
 * Initialize Asset Management Module
 * Sets up state, handlers, and renderer for asset management
 */
function initializeAssetModule() {
    console.log('Asset Module: Initializing...');

    // Initialize state management
    try {
        assetState.init();
        console.log('Asset Module: State management initialized');
    } catch (error) {
        console.error('Asset Module: State initialization failed:', error);
        return false;
    }

    // Initialize IndexedDB
    try {
        assetDb.init().then(() => {
            console.log('Asset Module: IndexedDB initialized');
        }).catch(err => {
            console.warn('Asset Module: IndexedDB init failed, using localStorage only:', err);
        });
    } catch (error) {
        console.warn('Asset Module: IndexedDB init failed, using localStorage only:', error);
    }

    // Initialize handlers
    try {
        assetHandlers.init();
        console.log('Asset Module: Event handlers initialized');
    } catch (error) {
        console.error('Asset Module: Handler initialization failed:', error);
        return false;
    }

    // Initialize renderer
    try {
        assetRenderer.init();
        console.log('Asset Module: UI renderer initialized');
    } catch (error) {
        console.error('Asset Module: Renderer initialization failed:', error);
        return false;
    }

    // Initialize detail renderer
    try {
        assetDetailRenderer.init();
        console.log('Asset Module: Detail renderer initialized');
    } catch (error) {
        console.error('Asset Module: Detail renderer initialization failed:', error);
        return false;
    }

    // Set up listener for creating protokoll from asset
    document.addEventListener('asset:createProtocol', (e) => {
        const { assetData } = e.detail;
        if (assetData) {
            handleCreateProtokollFromAsset(assetData);
        }
    });

    // Subscribe to asset changes for activity logging
    assetState.on('assetAdded', ({ asset }) => {
        addActivityLogEntry(`Asset hinzugefügt: ${asset.name}`, 'success');
        addLogEntry(`Asset added: ${asset.name}`, 'success');
    });

    assetState.on('assetUpdated', ({ asset }) => {
        addActivityLogEntry(`Asset aktualisiert: ${asset?.name || 'Unknown'}`, 'info');
        addLogEntry(`Asset updated: ${asset?.name || 'Unknown'}`, 'info');
    });

    assetState.on('assetDeleted', ({ assetId }) => {
        addActivityLogEntry('Asset gelöscht', 'warning');
        addLogEntry(`Asset deleted: ${assetId}`, 'warning');
    });

    assetState.on('assetsImported', ({ total, successful, failed }) => {
        addActivityLogEntry(`${successful} von ${total} Assets importiert`, failed > 0 ? 'warning' : 'success');
        addLogEntry(`Imported ${successful} of ${total} assets (${failed} failed)`, failed > 0 ? 'warning' : 'success');
    });

    console.log('✓ Asset Module initialized');
    return true;
}

/**
 * Handle creating a protokoll from asset data
 * @param {Object} assetData - Asset data object
 */
function handleCreateProtokollFromAsset(assetData) {
    try {
        console.log('Creating protokoll from asset:', assetData);
        
        // Load asset data into protokoll state
        protokollState.loadFromAsset(assetData);
        
        // Re-render the protokoll form
        protokollRenderer.renderStep('metadata');
        
        // Switch to protokoll view
        switchView('protokoll');
        
        // Show success message
        protokollRenderer.displayMessage('success', `Protokoll für Asset "${assetData.assetName}" erstellt. Daten wurden übernommen.`);
        addActivityLogEntry(`Protokoll erstellt für Asset ${assetData.assetId}`, 'success');
        addLogEntry(`Protokoll created from asset ${assetData.assetId}`, 'success');
    } catch (error) {
        console.error('Failed to create protokoll from asset:', error);
        protokollRenderer.displayMessage('error', 'Fehler beim Erstellen des Protokolls.');
        addLogEntry(`Failed to create protokoll from asset: ${error.message}`, 'error');
    }
}

/**
 * Initialize sync settings functionality (Hybrid Approach - Option 3)
 */
function initializeSyncSettings() {
    // Get UI elements
    const storageModeLocal = document.getElementById('storage-mode-local');
    const storageModeSync = document.getElementById('storage-mode-sync');
    const apiConfigSection = document.getElementById('api-config-section');
    const apiBaseUrlInput = document.getElementById('api-base-url');
    const saveApiConfigBtn = document.getElementById('save-api-config-btn');
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
            if (apiConfigSection) apiConfigSection.style.display = 'block';
        } else {
            storageModeLocal.checked = true;
            if (syncStatusSection) syncStatusSection.style.display = 'none';
            if (apiConfigSection) apiConfigSection.style.display = 'none';
        }
    }

    // Set initial API URL
    if (apiBaseUrlInput && config.apiBaseUrl) {
        apiBaseUrlInput.value = config.apiBaseUrl;
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
                if (apiConfigSection) apiConfigSection.style.display = 'none';
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
                if (apiConfigSection) apiConfigSection.style.display = 'block';
                addActivityLogEntry('Speichermodus: Mit Server synchronisieren', 'info');
                addLogEntry('Storage mode changed to sync with server', 'info');
            }
        });
    }

    // API Config Save Handler
    if (saveApiConfigBtn && apiBaseUrlInput) {
        saveApiConfigBtn.addEventListener('click', () => {
            const newUrl = apiBaseUrlInput.value.trim();
            if (newUrl) {
                saveSyncConfig({ apiBaseUrl: newUrl });
                addActivityLogEntry(`API URL aktualisiert: ${newUrl}`, 'success');
                addLogEntry(`API URL updated to: ${newUrl}`, 'success');

                // Show visual feedback
                const originalText = saveApiConfigBtn.textContent;
                saveApiConfigBtn.textContent = 'Gespeichert!';
                setTimeout(() => {
                    saveApiConfigBtn.textContent = originalText;
                }, 2000);
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
    performanceMonitor.startMeasure('initialization');
    console.log('Abrechnung Application – Initializing (Phase 5 with Modern UI)');

    // 1. Load persisted state (if any)
    const initialState = loadStateFromStorage();
    console.log('Initial state loaded', initialState);

    // 2. Initialize static UI (non-dynamic DOM tweaks, ARIA, etc.)
    initializeStaticUI();
    
    // 2b. Initialize Phase 4 UI enhancements (accessibility & dark mode)
    Phase4UIRenderers.init();

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

    // 5c2. Set up global handler for creating protokoll from contract
    window._handleCreateProtokollFromContract = (contractDataEncoded) => {
        try {
            // Decode the URL-encoded JSON string
            const contractDataJson = decodeURIComponent(contractDataEncoded);
            const contractData = typeof contractDataJson === 'string'
                ? JSON.parse(contractDataJson)
                : contractDataJson;

            console.log('Creating protokoll from contract:', contractData);

            // Load contract data into protokoll state
            protokollState.loadFromContract(contractData);

            // Re-render the protokoll form
            protokollRenderer.renderStep('metadata');

            // Switch to protokoll view
            switchView('protokoll');

            // Show success message
            protokollRenderer.displayMessage('success', 'Protokoll aus Vertrag erstellt. Daten wurden übernommen.');
            addActivityLogEntry(`Protokoll erstellt für Auftrag ${contractData.contractId}`, 'success');
            addLogEntry(`Protokoll created from contract ${contractData.contractId}`, 'success');
        } catch (error) {
            console.error('Failed to create protokoll from contract:', error);
            protokollRenderer.displayMessage('error', 'Fehler beim Erstellen des Protokolls.');
            addLogEntry(`Failed to create protokoll: ${error.message}`, 'error');
        }
    };

    // 5d. Initialize Protokoll Module (Phase 4)
    initializeProtokollModule();

    // 5e. Initialize HR Module (Phase 5)
    initializeHRModule();

    // 5f. Initialize Messgerät Module
    initializeMessgeraetModule();

    // 5g. Initialize Asset Module
    initializeAssetModule();

    // 5h. Initialize Dashboard Module (Welcome Messages)
    initDashboardModule();

    // 5i. Initialize Logs Module
    initLogsModule();

    // 6. Subscribe to state changes to keep UI reactive
    subscribe((nextState) => {
        // Use Phase 4 enhanced renderers if available, fallback to original
        if (Phase4UIRenderers && Phase4UIRenderers.updateImportUI) {
            Phase4UIRenderers.updateImportUI(nextState);
            Phase4UIRenderers.updateGenerateUI(nextState);
            Phase4UIRenderers.updateExportUI(nextState);
        } else {
            updateImportUI(nextState);
            updateGenerateUI(nextState);
            updateExportUI(nextState);
        }
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
    // Use Phase 4 enhanced renderers if available, fallback to original
    if (Phase4UIRenderers && Phase4UIRenderers.updateImportUI) {
        Phase4UIRenderers.updateImportUI(state);
        Phase4UIRenderers.updateGenerateUI(state);
        Phase4UIRenderers.updateExportUI(state);
    } else {
        updateImportUI(state);
        updateGenerateUI(state);
        updateExportUI(state);
    }
    updateDashboardStats(state);

    // 7b. Initialize Contract Manager UI (Phase 1)
    initializeContractUI();

    // 8. Add initial log entry
    addLogEntry('Application initialized', 'info');

    console.log('Abrechnung Application – Initialization complete');
    
    // 9. End performance measurement and log results
    const initPerf = performanceMonitor.endMeasure('initialization');
    if (initPerf) {
        addLogEntry(`Application initialized in ${initPerf.duration}ms`, 'info');
        
        // Perform health check
        const healthCheck = performanceMonitor.healthCheck();
        if (!healthCheck.healthy) {
            console.warn('Performance issues detected:', healthCheck.issues);
            healthCheck.issues.forEach(issue => addLogEntry(issue, 'warning'));
        }
    }
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
