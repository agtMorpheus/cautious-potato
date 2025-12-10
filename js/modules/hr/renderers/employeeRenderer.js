/**
 * Employee Renderer
 * 
 * UI rendering functions for employee management
 * Handles list views, forms, and detail displays
 * 
 * @module employeeRenderer
 * @version 1.0.0
 */

import {
  getAllEmployees,
  getEmployeeById,
  getEmployeeStatistics,
  getEmployeeListForDisplay,
  getUniqueDepartments,
  getUniquePositions,
  formatEmployeeForDisplay
} from '../submodules/employees.js';

import {
  getStatusClass,
  getStatusText
} from '../hrUtils.js';

// ============================================================
// Employee List Rendering
// ============================================================

/**
 * Render employee list table
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Render options { sortBy, direction, filters }
 */
export function renderEmployeeList(container, options = {}) {
  const employees = getEmployeeListForDisplay(options);
  
  if (employees.length === 0) {
    container.innerHTML = `
      <div class="hr-empty-state">
        <svg class="hr-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p class="hr-empty-title">Keine Mitarbeiter vorhanden</p>
        <p class="hr-empty-text">Fügen Sie einen neuen Mitarbeiter hinzu, um zu beginnen.</p>
      </div>
    `;
    return;
  }
  
  const tableHTML = `
    <div class="hr-table-container">
      <table class="hr-data-table">
        <thead>
          <tr>
            <th data-sort="personalNumber">Personal-Nr.</th>
            <th data-sort="lastName">Name</th>
            <th data-sort="department">Abteilung</th>
            <th data-sort="position">Position</th>
            <th data-sort="employmentStatus">Status</th>
            <th data-sort="hoursPerWeek">Stunden/Woche</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          ${employees.map(emp => renderEmployeeRow(emp)).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHTML;
}

/**
 * Render a single employee table row
 * @param {Object} employee - Formatted employee object
 * @returns {string} HTML string
 */
function renderEmployeeRow(employee) {
  return `
    <tr data-employee-id="${employee.id}">
      <td>${escapeHtml(employee.personalNumber || '-')}</td>
      <td>
        <div class="hr-employee-name">
          <span class="hr-employee-avatar">${getInitials(employee)}</span>
          <div>
            <strong>${escapeHtml(employee.fullName)}</strong>
            <span class="hr-employee-email">${escapeHtml(employee.email)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(employee.department || '-')}</td>
      <td>${escapeHtml(employee.position || '-')}</td>
      <td>
        <span class="hr-status-badge ${employee.statusClass}">
          ${employee.statusText}
        </span>
      </td>
      <td>${employee.hoursPerWeek}h</td>
      <td>
        <div class="hr-action-buttons">
          <button type="button" class="hr-btn-icon" data-action="view" data-id="${employee.id}" title="Anzeigen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button type="button" class="hr-btn-icon" data-action="edit" data-id="${employee.id}" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button type="button" class="hr-btn-icon hr-btn-danger" data-action="delete" data-id="${employee.id}" title="Löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ============================================================
// Employee Form Rendering
// ============================================================

/**
 * Render employee form (add/edit)
 * @param {HTMLElement} container - Container element
 * @param {Object} employee - Employee data (null for new)
 */
export function renderEmployeeForm(container, employee = null) {
  const isEdit = !!employee;
  const departments = getUniqueDepartments();
  const positions = getUniquePositions();
  
  const formHTML = `
    <form id="hr-employee-form" class="hr-form">
      <div class="hr-form-section">
        <h4 class="hr-form-section-title">Persönliche Daten</h4>
        
        <div class="hr-form-row">
          <div class="hr-form-group">
            <label for="firstName">Vorname *</label>
            <input type="text" id="firstName" name="firstName" required
              value="${escapeHtml(employee?.firstName || '')}" />
          </div>
          <div class="hr-form-group">
            <label for="lastName">Nachname *</label>
            <input type="text" id="lastName" name="lastName" required
              value="${escapeHtml(employee?.lastName || '')}" />
          </div>
        </div>
        
        <div class="hr-form-row">
          <div class="hr-form-group">
            <label for="email">E-Mail *</label>
            <input type="email" id="email" name="email" required
              value="${escapeHtml(employee?.email || '')}" />
          </div>
          <div class="hr-form-group">
            <label for="personalNumber">Personal-Nr.</label>
            <input type="text" id="personalNumber" name="personalNumber"
              value="${escapeHtml(employee?.personalNumber || '')}" />
          </div>
        </div>
      </div>
      
      <div class="hr-form-section">
        <h4 class="hr-form-section-title">Beschäftigung</h4>
        
        <div class="hr-form-row">
          <div class="hr-form-group">
            <label for="department">Abteilung</label>
            <input type="text" id="department" name="department" list="departments"
              value="${escapeHtml(employee?.department || '')}" />
            <datalist id="departments">
              ${departments.map(d => `<option value="${escapeHtml(d)}">`).join('')}
            </datalist>
          </div>
          <div class="hr-form-group">
            <label for="position">Position</label>
            <input type="text" id="position" name="position" list="positions"
              value="${escapeHtml(employee?.position || '')}" />
            <datalist id="positions">
              ${positions.map(p => `<option value="${escapeHtml(p)}">`).join('')}
            </datalist>
          </div>
        </div>
        
        <div class="hr-form-row">
          <div class="hr-form-group">
            <label for="contractType">Vertragsart</label>
            <select id="contractType" name="contractType">
              <option value="fulltime" ${employee?.contractType === 'fulltime' ? 'selected' : ''}>Vollzeit</option>
              <option value="parttime" ${employee?.contractType === 'parttime' ? 'selected' : ''}>Teilzeit</option>
              <option value="minijob" ${employee?.contractType === 'minijob' ? 'selected' : ''}>Minijob</option>
              <option value="intern" ${employee?.contractType === 'intern' ? 'selected' : ''}>Praktikant</option>
              <option value="temporary" ${employee?.contractType === 'temporary' ? 'selected' : ''}>Befristet</option>
            </select>
          </div>
          <div class="hr-form-group">
            <label for="hoursPerWeek">Wochenstunden</label>
            <input type="number" id="hoursPerWeek" name="hoursPerWeek" min="0" max="60" step="0.5"
              value="${employee?.hoursPerWeek || 40}" />
          </div>
        </div>
        
        <div class="hr-form-row">
          <div class="hr-form-group">
            <label for="startDate">Eintrittsdatum</label>
            <input type="date" id="startDate" name="startDate"
              value="${employee?.startDate || ''}" />
          </div>
          <div class="hr-form-group">
            <label for="employmentStatus">Status</label>
            <select id="employmentStatus" name="employmentStatus">
              <option value="active" ${employee?.employmentStatus === 'active' ? 'selected' : ''}>Aktiv</option>
              <option value="inactive" ${employee?.employmentStatus === 'inactive' ? 'selected' : ''}>Inaktiv</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="hr-form-section">
        <h4 class="hr-form-section-title">Notizen</h4>
        <div class="hr-form-group">
          <textarea id="notes" name="notes" rows="3">${escapeHtml(employee?.notes || '')}</textarea>
        </div>
      </div>
      
      <div class="hr-form-actions">
        <button type="button" class="hr-btn hr-btn-secondary" data-action="cancel">
          Abbrechen
        </button>
        <button type="submit" class="hr-btn hr-btn-primary">
          ${isEdit ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  `;
  
  container.innerHTML = formHTML;
}

// ============================================================
// Employee Detail View
// ============================================================

/**
 * Render employee detail view
 * @param {HTMLElement} container - Container element
 * @param {string} employeeId - Employee ID
 */
export function renderEmployeeDetail(container, employeeId) {
  const employee = getEmployeeById(employeeId);
  
  if (!employee) {
    container.innerHTML = `
      <div class="hr-error-state">
        <p>Mitarbeiter nicht gefunden</p>
      </div>
    `;
    return;
  }
  
  const formatted = formatEmployeeForDisplay(employee);
  
  const detailHTML = `
    <div class="hr-employee-detail">
      <div class="hr-detail-header">
        <div class="hr-employee-avatar-large">${getInitials(employee)}</div>
        <div class="hr-employee-header-info">
          <h2>${escapeHtml(formatted.fullName)}</h2>
          <p>${escapeHtml(employee.position || 'Keine Position')} | ${escapeHtml(employee.department || 'Keine Abteilung')}</p>
          <span class="hr-status-badge ${formatted.statusClass}">${formatted.statusText}</span>
        </div>
      </div>
      
      <div class="hr-detail-sections">
        <div class="hr-detail-section">
          <h4>Kontaktdaten</h4>
          <dl class="hr-detail-list">
            <dt>E-Mail</dt>
            <dd>${escapeHtml(employee.email)}</dd>
            <dt>Personal-Nr.</dt>
            <dd>${escapeHtml(employee.personalNumber || '-')}</dd>
          </dl>
        </div>
        
        <div class="hr-detail-section">
          <h4>Beschäftigung</h4>
          <dl class="hr-detail-list">
            <dt>Vertragsart</dt>
            <dd>${formatted.contractTypeText}</dd>
            <dt>Wochenstunden</dt>
            <dd>${employee.hoursPerWeek}h</dd>
            <dt>Eintrittsdatum</dt>
            <dd>${formatted.formattedStartDate}</dd>
            ${employee.endDate ? `<dt>Austrittsdatum</dt><dd>${formatted.formattedEndDate}</dd>` : ''}
          </dl>
        </div>
        
        ${employee.notes ? `
        <div class="hr-detail-section">
          <h4>Notizen</h4>
          <p>${escapeHtml(employee.notes)}</p>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  container.innerHTML = detailHTML;
}

// ============================================================
// Employee Statistics
// ============================================================

/**
 * Render employee statistics cards
 * @param {HTMLElement} container - Container element
 */
export function renderEmployeeStats(container) {
  const stats = getEmployeeStatistics();
  
  const statsHTML = `
    <div class="hr-stats-grid">
      <div class="hr-stat-card">
        <div class="hr-stat-icon employees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span class="hr-stat-value">${stats.total}</span>
        <span class="hr-stat-label">Gesamt</span>
      </div>
      
      <div class="hr-stat-card">
        <div class="hr-stat-icon active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span class="hr-stat-value">${stats.active}</span>
        <span class="hr-stat-label">Aktiv</span>
      </div>
      
      <div class="hr-stat-card">
        <div class="hr-stat-icon inactive">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span class="hr-stat-value">${stats.inactive}</span>
        <span class="hr-stat-label">Inaktiv</span>
      </div>
      
      <div class="hr-stat-card">
        <div class="hr-stat-icon departments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <span class="hr-stat-value">${Object.keys(stats.byDepartment).length}</span>
        <span class="hr-stat-label">Abteilungen</span>
      </div>
    </div>
  `;
  
  container.innerHTML = statsHTML;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get initials from employee name
 * @param {Object} employee - Employee object
 * @returns {string} Initials (max 2 characters)
 */
function getInitials(employee) {
  const first = employee.firstName?.[0] || '';
  const last = employee.lastName?.[0] || '';
  return (first + last).toUpperCase();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return String(text || '');
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Bind event handlers for employee list actions
 * @param {HTMLElement} container - Container element
 * @param {Object} handlers - Handler functions { onView, onEdit, onDelete }
 */
export function bindEmployeeListEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const id = button.dataset.id;
    
    switch (action) {
      case 'view':
        handlers.onView?.(id);
        break;
      case 'edit':
        handlers.onEdit?.(id);
        break;
      case 'delete':
        if (confirm('Möchten Sie diesen Mitarbeiter wirklich löschen?')) {
          handlers.onDelete?.(id);
        }
        break;
    }
  });
}
