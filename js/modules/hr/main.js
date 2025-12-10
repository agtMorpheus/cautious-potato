/**
 * HR Module Main Entry Point
 * 
 * Initializes and coordinates the HR Management Module
 * Phase 3: UI Components & Renderers
 * 
 * @module hrMain
 * @version 1.0.0
 */

// State Management
import {
  getHrState,
  subscribeHr,
  setActiveTab,
  setModalState,
  setFilters,
  resetFilters
} from './hrState.js';

// Event Handlers
import {
  handleAddEmployee,
  handleUpdateEmployee,
  handleDeleteEmployee,
  handleRecordAttendance,
  handleUpdateAttendance,
  handleSaveSchedule,
  handleSubmitSchedule,
  handleApproveSchedule,
  handleCreateVacationRequest,
  handleApproveVacation,
  handleRejectVacation,
  handleExportHrData,
  initializeHrHandlers
} from './hrHandlers.js';

// Renderers
import {
  renderEmployeeList,
  renderEmployeeForm,
  renderEmployeeDetail,
  renderEmployeeStats,
  bindEmployeeListEvents
} from './renderers/employeeRenderer.js';

import {
  renderDailyAttendanceLog,
  renderAttendanceForm,
  renderAttendanceCalendar,
  renderAttendanceReport,
  bindAttendanceEvents
} from './renderers/attendanceRenderer.js';

import {
  renderWeeklyScheduleGrid,
  renderScheduleForm,
  renderPendingApprovals,
  renderScheduleHistory,
  bindScheduleEvents
} from './renderers/scheduleRenderer.js';

import {
  renderVacationCalendar,
  renderVacationForm,
  renderPendingVacationApprovals,
  renderVacationBalance,
  renderTeamCoverage,
  renderVacationList,
  bindVacationEvents
} from './renderers/vacationRenderer.js';

// Submodules
import { getAllEmployees, getActiveEmployees, getEmployeeById } from './submodules/employees.js';
import { getWeekStart, getWeekNumber, formatDateDE } from './hrUtils.js';

// ============================================================
// Module State
// ============================================================

/**
 * Current state for the HR dashboard UI
 */
const dashboardState = {
  currentTab: 'employees',
  selectedDate: new Date().toISOString().split('T')[0],
  currentWeekStart: null,
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  selectedEmployeeId: null,
  editingRecordId: null
};

// ============================================================
// Tab Navigation
// ============================================================

/**
 * Switch active tab
 * @param {string} tabName - Tab name to activate
 */
function switchTab(tabName) {
  dashboardState.currentTab = tabName;
  
  // Update nav button states
  document.querySelectorAll('.hr-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab visibility
  document.querySelectorAll('.hr-tab').forEach(tab => {
    tab.classList.toggle('hr-tab--active', tab.id === `${tabName}-tab`);
  });
  
  // Render active tab content
  renderTabContent(tabName);
  
  // Update state
  setActiveTab(tabName);
}

/**
 * Render content for active tab
 * @param {string} tabName - Tab name
 */
function renderTabContent(tabName) {
  switch (tabName) {
    case 'employees':
      renderEmployeesTab();
      break;
    case 'attendance':
      renderAttendanceTab();
      break;
    case 'schedule':
      renderScheduleTab();
      break;
    case 'vacation':
      renderVacationTab();
      break;
  }
}

// ============================================================
// Tab Content Renderers
// ============================================================

/**
 * Render employees tab content
 */
function renderEmployeesTab() {
  const statsContainer = document.getElementById('employee-stats-container');
  const listContainer = document.getElementById('employee-list-container');
  
  if (statsContainer) {
    renderEmployeeStats(statsContainer);
  }
  
  if (listContainer) {
    const state = getHrState();
    renderEmployeeList(listContainer, {
      sortBy: 'lastName',
      direction: 'asc',
      filters: state.filters
    });
    
    bindEmployeeListEvents(listContainer, {
      onView: (id) => showEmployeeDetail(id),
      onEdit: (id) => openEmployeeModal(id),
      onDelete: (id) => {
        const result = handleDeleteEmployee(id);
        if (result.success) {
          showAlert('success', 'Mitarbeiter erfolgreich gelöscht');
          renderEmployeesTab();
        }
      }
    });
  }
  
  updateEmptyState();
}

/**
 * Render attendance tab content
 */
function renderAttendanceTab() {
  const calendarContainer = document.getElementById('attendance-calendar-container');
  const statsContainer = document.getElementById('attendance-stats-container');
  const employeeSelect = document.getElementById('attendance-employee-filter');
  
  // Populate employee filter dropdown
  if (employeeSelect) {
    const employees = getActiveEmployees();
    employeeSelect.innerHTML = '<option value="">All Employees</option>' +
      employees.map(emp => `<option value="${emp.id}">${emp.lastName}, ${emp.firstName}</option>`).join('');
  }
  
  // Create employee map for name display
  const employeeMap = new Map();
  getAllEmployees().forEach(emp => employeeMap.set(emp.id, emp));
  
  // Render calendar
  if (calendarContainer) {
    renderAttendanceCalendar(
      calendarContainer,
      dashboardState.currentYear,
      dashboardState.currentMonth,
      dashboardState.selectedEmployeeId
    );
    
    bindAttendanceEvents(calendarContainer, {
      onPrevMonth: () => {
        dashboardState.currentMonth--;
        if (dashboardState.currentMonth < 1) {
          dashboardState.currentMonth = 12;
          dashboardState.currentYear--;
        }
        renderAttendanceTab();
      },
      onNextMonth: () => {
        dashboardState.currentMonth++;
        if (dashboardState.currentMonth > 12) {
          dashboardState.currentMonth = 1;
          dashboardState.currentYear++;
        }
        renderAttendanceTab();
      },
      onDateChange: (date) => {
        dashboardState.selectedDate = date;
        renderAttendanceTab();
      },
      onAdd: () => openAttendanceModal(),
      onEdit: (id) => openAttendanceModal(id)
    });
  }
}

/**
 * Render schedule tab content
 */
function renderScheduleTab() {
  const gridContainer = document.getElementById('schedule-grid-container');
  const approvalsContainer = document.getElementById('pending-approvals-container');
  const employeeSelect = document.getElementById('schedule-employee-select');
  
  // Initialize week start if not set
  if (!dashboardState.currentWeekStart) {
    dashboardState.currentWeekStart = getWeekStart(new Date()).toISOString().split('T')[0];
  }
  
  // Populate employee select dropdown
  if (employeeSelect) {
    const employees = getActiveEmployees();
    employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
      employees.map(emp => `<option value="${emp.id}">${emp.lastName}, ${emp.firstName}</option>`).join('');
  }
  
  // Update week display
  const weekInput = document.getElementById('week-start-date');
  if (weekInput) {
    weekInput.value = dashboardState.currentWeekStart;
  }
  
  // Create employee map for name display
  const employeeMap = new Map();
  getAllEmployees().forEach(emp => employeeMap.set(emp.id, emp));
  
  // Render schedule grid
  if (gridContainer) {
    const employees = getActiveEmployees();
    renderWeeklyScheduleGrid(gridContainer, dashboardState.currentWeekStart, employees);
    
    bindScheduleEvents(gridContainer, {
      onPrevWeek: () => {
        const currentDate = new Date(dashboardState.currentWeekStart);
        currentDate.setDate(currentDate.getDate() - 7);
        dashboardState.currentWeekStart = currentDate.toISOString().split('T')[0];
        renderScheduleTab();
      },
      onNextWeek: () => {
        const currentDate = new Date(dashboardState.currentWeekStart);
        currentDate.setDate(currentDate.getDate() + 7);
        dashboardState.currentWeekStart = currentDate.toISOString().split('T')[0];
        renderScheduleTab();
      },
      onCurrentWeek: () => {
        dashboardState.currentWeekStart = getWeekStart(new Date()).toISOString().split('T')[0];
        renderScheduleTab();
      },
      onCreate: (employeeId, week) => openScheduleModal(employeeId, week),
      onView: (id) => openScheduleModal(null, null, id),
      onApprove: (id) => {
        const result = handleApproveSchedule(id);
        if (result.success) {
          showAlert('success', 'Wochenplan genehmigt');
          renderScheduleTab();
        }
      },
      onReject: (id) => {
        // Could add a reason dialog here
        showAlert('info', 'Ablehnung nicht implementiert');
      }
    });
  }
  
  // Render pending approvals
  if (approvalsContainer) {
    renderPendingApprovals(approvalsContainer, employeeMap);
  }
}

/**
 * Render vacation tab content
 */
function renderVacationTab() {
  const calendarContainer = document.getElementById('vacation-calendar-container');
  const requestsContainer = document.getElementById('vacation-requests-container');
  const balanceContainer = document.getElementById('vacation-balance-container');
  
  // Create employee map for name display
  const employeeMap = new Map();
  getAllEmployees().forEach(emp => employeeMap.set(emp.id, emp));
  
  // Render vacation calendar
  if (calendarContainer) {
    renderVacationCalendar(
      calendarContainer,
      dashboardState.currentYear,
      dashboardState.currentMonth,
      employeeMap
    );
    
    bindVacationEvents(calendarContainer, {
      onPrevMonth: () => {
        dashboardState.currentMonth--;
        if (dashboardState.currentMonth < 1) {
          dashboardState.currentMonth = 12;
          dashboardState.currentYear--;
        }
        renderVacationTab();
      },
      onNextMonth: () => {
        dashboardState.currentMonth++;
        if (dashboardState.currentMonth > 12) {
          dashboardState.currentMonth = 1;
          dashboardState.currentYear++;
        }
        renderVacationTab();
      },
      onNewRequest: () => openVacationModal(),
      onApprove: (id) => {
        const result = handleApproveVacation(id);
        if (result.success) {
          showAlert('success', 'Urlaubsantrag genehmigt');
          renderVacationTab();
        }
      },
      onReject: (id) => {
        const result = handleRejectVacation(id, 'Abgelehnt');
        if (result.success) {
          showAlert('info', 'Urlaubsantrag abgelehnt');
          renderVacationTab();
        }
      },
      onDateClick: (date) => {
        // Store selected date and potentially open a detail view
        dashboardState.selectedDate = date;
      }
    });
  }
  
  // Render pending vacation approvals
  if (requestsContainer) {
    renderPendingVacationApprovals(requestsContainer, employeeMap);
  }
  
  // Render vacation balance (for selected employee)
  if (balanceContainer && dashboardState.selectedEmployeeId) {
    renderVacationBalance(balanceContainer, dashboardState.selectedEmployeeId, dashboardState.currentYear);
  }
}

// ============================================================
// Modal Handlers
// ============================================================

/**
 * Open employee modal for add/edit
 * @param {string|null} employeeId - Employee ID for editing, null for new
 */
function openEmployeeModal(employeeId = null) {
  const modal = document.getElementById('employee-modal');
  const formContainer = document.getElementById('employee-form-container');
  const title = document.getElementById('employee-modal-title');
  
  if (!modal || !formContainer) return;
  
  const employee = employeeId ? getEmployeeById(employeeId) : null;
  title.textContent = employee ? 'Edit Employee' : 'Add Employee';
  
  renderEmployeeForm(formContainer, employee);
  
  // Bind form events
  const form = formContainer.querySelector('#hr-employee-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      let result;
      if (employee) {
        result = handleUpdateEmployee(employee.id, data);
      } else {
        result = handleAddEmployee(data);
      }
      
      if (result.success) {
        closeModal('employee-modal');
        showAlert('success', employee ? 'Mitarbeiter aktualisiert' : 'Mitarbeiter hinzugefügt');
        renderEmployeesTab();
      } else {
        showAlert('error', result.errors.join(', '));
      }
    });
    
    form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      closeModal('employee-modal');
    });
  }
  
  openModal('employee-modal');
}

/**
 * Show employee detail view
 * @param {string} employeeId - Employee ID
 */
function showEmployeeDetail(employeeId) {
  const modal = document.getElementById('employee-modal');
  const formContainer = document.getElementById('employee-form-container');
  const title = document.getElementById('employee-modal-title');
  
  if (!modal || !formContainer) return;
  
  title.textContent = 'Employee Details';
  renderEmployeeDetail(formContainer, employeeId);
  
  openModal('employee-modal');
}

/**
 * Open attendance modal for add/edit
 * @param {string|null} attendanceId - Attendance ID for editing, null for new
 */
function openAttendanceModal(attendanceId = null) {
  const modal = document.getElementById('attendance-modal');
  const formContainer = document.getElementById('attendance-form-container');
  
  if (!modal || !formContainer) return;
  
  const employees = getActiveEmployees();
  const record = attendanceId ? getHrState().attendance.find(a => a.id === attendanceId) : null;
  
  renderAttendanceForm(formContainer, record, employees);
  
  // Bind form events
  const form = formContainer.querySelector('#hr-attendance-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      const result = handleRecordAttendance(data.employeeId, data);
      
      if (result.success) {
        closeModal('attendance-modal');
        showAlert('success', 'Anwesenheit erfasst');
        renderAttendanceTab();
      } else {
        showAlert('error', result.errors.join(', '));
      }
    });
    
    form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      closeModal('attendance-modal');
    });
  }
  
  openModal('attendance-modal');
}

/**
 * Open vacation modal for new request
 * @param {string|null} vacationId - Vacation ID for editing, null for new
 */
function openVacationModal(vacationId = null) {
  const modal = document.getElementById('vacation-modal');
  const formContainer = document.getElementById('vacation-form-container');
  
  if (!modal || !formContainer) return;
  
  const employees = getActiveEmployees();
  const request = vacationId ? getHrState().vacation.find(v => v.id === vacationId) : null;
  
  renderVacationForm(formContainer, request, employees);
  
  // Bind form events
  const form = formContainer.querySelector('#hr-vacation-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      const result = handleCreateVacationRequest(data);
      
      if (result.success) {
        closeModal('vacation-modal');
        showAlert('success', 'Urlaubsantrag eingereicht');
        renderVacationTab();
      } else {
        showAlert('error', result.errors.join(', '));
      }
    });
    
    form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      closeModal('vacation-modal');
    });
  }
  
  openModal('vacation-modal');
}

/**
 * Open schedule modal for create/edit
 * @param {string|null} employeeId - Employee ID for new schedule
 * @param {string|null} weekStart - Week start date for new schedule
 * @param {string|null} scheduleId - Schedule ID for editing
 */
function openScheduleModal(employeeId = null, weekStart = null, scheduleId = null) {
  const modal = document.getElementById('schedule-modal');
  const formContainer = document.getElementById('schedule-form-container');
  
  if (!modal || !formContainer) return;
  
  const employee = employeeId ? getEmployeeById(employeeId) : null;
  const schedule = scheduleId ? getHrState().schedules.find(s => s.id === scheduleId) : null;
  
  if (!employee && !schedule) {
    showAlert('error', 'Bitte zuerst einen Mitarbeiter auswählen');
    return;
  }
  
  const scheduleEmployee = schedule ? getEmployeeById(schedule.employeeId) : employee;
  renderScheduleForm(formContainer, schedule, scheduleEmployee);
  
  // Bind form events
  const form = formContainer.querySelector('#hr-schedule-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Collect daily schedule data
      const dailySchedule = [];
      for (let i = 0; i < 7; i++) {
        const plannedHours = parseFloat(form.querySelector(`[name="planned_${i}"]`)?.value) || 0;
        const actualHours = parseFloat(form.querySelector(`[name="actual_${i}"]`)?.value) || 0;
        dailySchedule.push({
          plannedHours,
          plannedPoints: plannedHours * 8,
          actualHours,
          actualPoints: actualHours * 8
        });
      }
      
      const scheduleData = {
        id: schedule?.id,
        employeeId: scheduleEmployee.id,
        weekStartDate: weekStart || schedule?.weekStartDate || dashboardState.currentWeekStart,
        dailySchedule,
        notes: form.querySelector('[name="notes"]')?.value || ''
      };
      
      const result = handleSaveSchedule(scheduleData);
      
      if (result.success) {
        closeModal('schedule-modal');
        showAlert('success', 'Wochenplan gespeichert');
        renderScheduleTab();
      } else {
        showAlert('error', result.errors.join(', '));
      }
    });
    
    form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      closeModal('schedule-modal');
    });
    
    form.querySelector('[data-action="submit"]')?.addEventListener('click', () => {
      if (schedule?.id) {
        handleSubmitSchedule(schedule.id);
        closeModal('schedule-modal');
        showAlert('success', 'Wochenplan zur Genehmigung eingereicht');
        renderScheduleTab();
      }
    });
  }
  
  openModal('schedule-modal');
}

/**
 * Open a modal by ID
 * @param {string} modalId - Modal element ID
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close a modal by ID
 * @param {string} modalId - Modal element ID
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// ============================================================
// Alert System
// ============================================================

/**
 * Show alert message
 * @param {string} type - Alert type ('success', 'error', 'info')
 * @param {string} message - Alert message
 */
function showAlert(type, message) {
  const alertId = type === 'error' ? 'hr-error-alert' : 'hr-success-alert';
  const alert = document.getElementById(alertId);
  
  if (!alert) return;
  
  const messageEl = alert.querySelector('.hr-alert__message');
  if (messageEl) {
    messageEl.textContent = message;
  }
  
  alert.classList.remove('hidden');
  
  // Auto-hide success alerts
  if (type !== 'error') {
    setTimeout(() => {
      alert.classList.add('hidden');
    }, 3000);
  }
}

/**
 * Hide alert
 * @param {string} alertId - Alert element ID
 */
function hideAlert(alertId) {
  const alert = document.getElementById(alertId);
  if (alert) {
    alert.classList.add('hidden');
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Update empty state visibility
 */
function updateEmptyState() {
  const employees = getAllEmployees();
  const emptyState = document.getElementById('employees-empty');
  const listContainer = document.getElementById('employee-list-container');
  
  if (employees.length === 0) {
    emptyState?.classList.remove('hidden');
    listContainer?.classList.add('hidden');
  } else {
    emptyState?.classList.add('hidden');
    listContainer?.classList.remove('hidden');
  }
}

/**
 * Set loading state
 * @param {boolean} isLoading - Loading state
 */
function setLoadingState(isLoading) {
  const loader = document.getElementById('hr-loading');
  if (loader) {
    loader.classList.toggle('hidden', !isLoading);
  }
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind all event listeners
 */
function bindEventListeners() {
  // Tab navigation
  document.querySelectorAll('.hr-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (tab) switchTab(tab);
    });
  });
  
  // Add employee buttons
  document.getElementById('add-employee-btn')?.addEventListener('click', () => openEmployeeModal());
  document.getElementById('add-employee-empty')?.addEventListener('click', (e) => {
    e.preventDefault();
    openEmployeeModal();
  });
  
  // Record attendance button
  document.getElementById('record-attendance-btn')?.addEventListener('click', () => openAttendanceModal());
  
  // Create schedule button
  document.getElementById('create-schedule-btn')?.addEventListener('click', () => {
    const employeeSelect = document.getElementById('schedule-employee-select');
    const selectedId = employeeSelect?.value;
    if (selectedId) {
      openScheduleModal(selectedId, dashboardState.currentWeekStart);
    } else {
      showAlert('error', 'Bitte zuerst einen Mitarbeiter auswählen');
    }
  });
  
  // Request vacation button
  document.getElementById('request-vacation-btn')?.addEventListener('click', () => openVacationModal());
  
  // Week navigation
  document.getElementById('prev-week-btn')?.addEventListener('click', () => {
    const currentDate = new Date(dashboardState.currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    dashboardState.currentWeekStart = currentDate.toISOString().split('T')[0];
    renderScheduleTab();
  });
  
  document.getElementById('next-week-btn')?.addEventListener('click', () => {
    const currentDate = new Date(dashboardState.currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    dashboardState.currentWeekStart = currentDate.toISOString().split('T')[0];
    renderScheduleTab();
  });
  
  document.getElementById('week-start-date')?.addEventListener('change', (e) => {
    dashboardState.currentWeekStart = getWeekStart(new Date(e.target.value)).toISOString().split('T')[0];
    renderScheduleTab();
  });
  
  // Employee filter
  document.getElementById('employee-search')?.addEventListener('input', (e) => {
    setFilters({ searchTerm: e.target.value });
    renderEmployeesTab();
  });
  
  document.getElementById('department-filter')?.addEventListener('change', (e) => {
    setFilters({ department: e.target.value || null });
    renderEmployeesTab();
  });
  
  document.getElementById('status-filter')?.addEventListener('change', (e) => {
    setFilters({ status: e.target.value || null });
    renderEmployeesTab();
  });
  
  // Attendance employee filter
  document.getElementById('attendance-employee-filter')?.addEventListener('change', (e) => {
    dashboardState.selectedEmployeeId = e.target.value || null;
    renderAttendanceTab();
  });
  
  // Schedule employee select
  document.getElementById('schedule-employee-select')?.addEventListener('change', (e) => {
    dashboardState.selectedEmployeeId = e.target.value || null;
  });
  
  // Attendance date filters
  document.getElementById('attendance-filter-btn')?.addEventListener('click', () => {
    const startDate = document.getElementById('attendance-start-date')?.value;
    const endDate = document.getElementById('attendance-end-date')?.value;
    if (startDate && endDate) {
      setFilters({
        dateRange: { start: startDate, end: endDate }
      });
      renderAttendanceTab();
    }
  });
  
  // Modal close buttons
  document.querySelectorAll('.hr-modal__close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.hr-modal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
  
  // Modal overlay click to close
  document.querySelectorAll('.hr-modal__overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      const modal = e.target.closest('.hr-modal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
  
  // Alert close buttons
  document.querySelectorAll('.hr-alert__close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const alert = e.target.closest('.hr-alert');
      if (alert) {
        alert.classList.add('hidden');
      }
    });
  });
  
  // Header actions
  document.getElementById('sync-btn')?.addEventListener('click', () => {
    showAlert('info', 'Synchronisation noch nicht implementiert');
  });
  
  document.getElementById('export-btn')?.addEventListener('click', () => {
    handleExportHrData();
    showAlert('success', 'Daten exportiert');
  });
  
  // Submit schedule button
  document.getElementById('submit-schedule-btn')?.addEventListener('click', () => {
    showAlert('info', 'Bitte einen Wochenplan zum Einreichen auswählen');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.hr-modal:not(.hidden)').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the HR module dashboard
 */
function initializeHrDashboard() {
  console.log('Initializing HR Dashboard...');
  
  // Initialize handlers and load state
  initializeHrHandlers();
  
  // Set initial week start
  dashboardState.currentWeekStart = getWeekStart(new Date()).toISOString().split('T')[0];
  
  // Bind event listeners
  bindEventListeners();
  
  // Subscribe to state changes for re-rendering
  subscribeHr((state) => {
    // Re-render current tab when state changes
    renderTabContent(dashboardState.currentTab);
  });
  
  // Initial render
  renderTabContent(dashboardState.currentTab);
  
  console.log('HR Dashboard initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHrDashboard);
} else {
  initializeHrDashboard();
}

// Export for testing
export {
  initializeHrDashboard,
  switchTab,
  openModal,
  closeModal,
  showAlert,
  hideAlert
};
