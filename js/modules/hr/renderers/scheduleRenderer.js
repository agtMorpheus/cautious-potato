/**
 * Schedule Renderer
 * 
 * UI rendering functions for schedule management
 * Handles weekly grid, points calculator, and approval workflow
 * 
 * @module scheduleRenderer
 * @version 1.0.0
 */

import {
  getAllSchedules,
  getScheduleById,
  getSchedulesByWeek,
  getPendingSchedules,
  getCurrentWeekSchedule,
  formatScheduleForDisplay,
  getScheduleGridData,
  getScheduleHistory,
  calculateWeeklyTotals,
  SCHEDULE_STATUS,
  WEEKDAYS_DE
} from '../submodules/schedules.js';

import {
  formatDateDE,
  formatHours,
  getWeekNumber,
  getWeekStart,
  getStatusClass,
  getStatusText
} from '../hrUtils.js';

// ============================================================
// Weekly Schedule Grid
// ============================================================

/**
 * Render weekly schedule grid
 * @param {HTMLElement} container - Container element
 * @param {string} weekStartDate - Week start date
 * @param {Array} employees - List of employees
 */
export function renderWeeklyScheduleGrid(container, weekStartDate, employees) {
  const gridData = getScheduleGridData(weekStartDate, employees);
  const weekStart = new Date(weekStartDate);
  
  const html = `
    <div class="hr-schedule-grid-container">
      <div class="hr-schedule-header">
        <div class="hr-week-navigation">
          <button type="button" class="hr-btn-icon" data-action="prev-week">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="hr-week-label">${gridData.weekLabel} (${formatDateDE(weekStartDate)})</span>
          <button type="button" class="hr-btn-icon" data-action="next-week">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button type="button" class="hr-btn hr-btn-secondary" data-action="go-to-current">
          Aktuelle Woche
        </button>
      </div>
      
      <div class="hr-schedule-grid">
        <table class="hr-schedule-table">
          <thead>
            <tr>
              <th class="hr-schedule-employee-col">Mitarbeiter</th>
              ${WEEKDAYS_DE.map((day, i) => {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                return `<th class="hr-schedule-day-col ${i >= 5 ? 'hr-schedule-weekend' : ''}">
                  <span class="hr-schedule-day-name">${day.substring(0, 2)}</span>
                  <span class="hr-schedule-day-date">${date.getDate()}</span>
                </th>`;
              }).join('')}
              <th class="hr-schedule-total-col">Summe</th>
              <th class="hr-schedule-status-col">Status</th>
            </tr>
          </thead>
          <tbody>
            ${gridData.rows.map(row => renderScheduleRow(row, weekStartDate)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Render a single schedule row
 * @param {Object} row - Row data { employee, schedule, hasSchedule }
 * @param {string} weekStartDate - Week start date
 * @returns {string} HTML string
 */
function renderScheduleRow(row, weekStartDate) {
  const { employee, schedule, hasSchedule } = row;
  
  if (!hasSchedule) {
    return `
      <tr data-employee-id="${employee.id}">
        <td class="hr-schedule-employee-cell">
          <span class="hr-employee-name">${escapeHtml(employee.lastName)}, ${escapeHtml(employee.firstName)}</span>
        </td>
        ${WEEKDAYS_DE.map((_, i) => `
          <td class="hr-schedule-day-cell ${i >= 5 ? 'hr-schedule-weekend' : ''} hr-schedule-empty">-</td>
        `).join('')}
        <td class="hr-schedule-total-cell">-</td>
        <td class="hr-schedule-status-cell">
          <button type="button" class="hr-btn hr-btn-sm hr-btn-outline" 
                  data-action="create-schedule" data-employee="${employee.id}" data-week="${weekStartDate}">
            Erstellen
          </button>
        </td>
      </tr>
    `;
  }
  
  const totals = calculateWeeklyTotals(schedule);
  
  return `
    <tr data-employee-id="${employee.id}" data-schedule-id="${schedule.id}">
      <td class="hr-schedule-employee-cell">
        <span class="hr-employee-name">${escapeHtml(employee.lastName)}, ${escapeHtml(employee.firstName)}</span>
      </td>
      ${schedule.dailySchedule.map((day, i) => `
        <td class="hr-schedule-day-cell ${i >= 5 ? 'hr-schedule-weekend' : ''} ${day.plannedHours > 0 ? 'hr-schedule-filled' : ''}">
          <span class="hr-schedule-hours">${day.plannedHours > 0 ? day.plannedHours + 'h' : '-'}</span>
          ${day.actualHours > 0 && day.actualHours !== day.plannedHours ? 
            `<span class="hr-schedule-actual">(${day.actualHours}h)</span>` : ''}
        </td>
      `).join('')}
      <td class="hr-schedule-total-cell">
        <strong>${formatHours(totals.plannedHours)}</strong>
        <span class="hr-schedule-points">${totals.plannedPoints} Pkt</span>
      </td>
      <td class="hr-schedule-status-cell">
        <span class="hr-status-badge ${getStatusClass(schedule.status)}">
          ${getStatusText(schedule.status)}
        </span>
      </td>
    </tr>
  `;
}

// ============================================================
// Schedule Detail/Edit Form
// ============================================================

/**
 * Render schedule edit form
 * @param {HTMLElement} container - Container element
 * @param {Object} schedule - Schedule object (null for new)
 * @param {Object} employee - Employee object
 */
export function renderScheduleForm(container, schedule, employee) {
  const isEdit = !!schedule;
  const weekStart = schedule ? new Date(schedule.weekStartDate) : getWeekStart(new Date());
  const weekLabel = schedule?.weekLabel || `KW ${getWeekNumber(weekStart)}/${weekStart.getFullYear()}`;
  
  const dailySchedule = schedule?.dailySchedule || WEEKDAYS_DE.map((day, i) => ({
    day,
    plannedHours: i < 5 ? 8 : 0,
    plannedPoints: i < 5 ? 64 : 0,
    actualHours: 0,
    actualPoints: 0,
    notes: ''
  }));
  
  const html = `
    <form id="hr-schedule-form" class="hr-form hr-schedule-form">
      <div class="hr-schedule-form-header">
        <h3>Wochenplan: ${escapeHtml(employee.lastName)}, ${escapeHtml(employee.firstName)}</h3>
        <span class="hr-schedule-week-label">${weekLabel}</span>
      </div>
      
      <div class="hr-schedule-days-editor">
        ${dailySchedule.map((day, index) => `
          <div class="hr-schedule-day-editor ${index >= 5 ? 'hr-schedule-weekend' : ''}">
            <div class="hr-schedule-day-header">
              <span class="hr-day-name">${WEEKDAYS_DE[index]}</span>
            </div>
            <div class="hr-form-group">
              <label>Geplant (h)</label>
              <input type="number" name="planned_${index}" min="0" max="14" step="0.25"
                value="${day.plannedHours}" class="hr-input-hours" data-day="${index}" />
            </div>
            <div class="hr-form-group">
              <label>Ist (h)</label>
              <input type="number" name="actual_${index}" min="0" max="14" step="0.25"
                value="${day.actualHours}" class="hr-input-hours" data-day="${index}" />
            </div>
            <div class="hr-schedule-day-points">
              <span class="hr-points-value" data-points-day="${index}">${day.plannedPoints}</span> Pkt
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="hr-schedule-totals">
        <div class="hr-schedule-total-item">
          <span class="hr-total-label">Geplant gesamt:</span>
          <span class="hr-total-value" id="total-planned-hours">${formatHours(schedule?.totalHours || 40)}</span>
        </div>
        <div class="hr-schedule-total-item">
          <span class="hr-total-label">Punkte gesamt:</span>
          <span class="hr-total-value" id="total-planned-points">${schedule?.totalPoints || 320}</span>
        </div>
      </div>
      
      <div class="hr-form-group">
        <label for="schedule-notes">Notizen</label>
        <textarea id="schedule-notes" name="notes" rows="2">${escapeHtml(schedule?.notes || '')}</textarea>
      </div>
      
      <div class="hr-form-actions">
        <button type="button" class="hr-btn hr-btn-secondary" data-action="cancel">
          Abbrechen
        </button>
        <button type="submit" class="hr-btn hr-btn-primary">
          Speichern
        </button>
        ${isEdit && schedule.status === 'draft' ? `
          <button type="button" class="hr-btn hr-btn-success" data-action="submit">
            Zur Genehmigung einreichen
          </button>
        ` : ''}
      </div>
    </form>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Pending Approvals View
// ============================================================

/**
 * Render pending schedule approvals list
 * @param {HTMLElement} container - Container element
 * @param {Map} employeeMap - Map of employeeId -> employee data for name display
 */
export function renderPendingApprovals(container, employeeMap = new Map()) {
  const pending = getPendingSchedules().map(formatScheduleForDisplay);
  
  // Helper to get employee name from map
  const getEmployeeName = (empId) => {
    const emp = employeeMap.get(empId);
    return emp ? `${emp.lastName}, ${emp.firstName}` : empId;
  };
  
  const html = `
    <div class="hr-pending-approvals">
      <h3>Ausstehende Genehmigungen (${pending.length})</h3>
      
      ${pending.length > 0 ? `
        <div class="hr-approval-list">
          ${pending.map(schedule => `
            <div class="hr-approval-card" data-schedule-id="${schedule.id}">
              <div class="hr-approval-header">
                <span class="hr-approval-employee">${escapeHtml(getEmployeeName(schedule.employeeId))}</span>
                <span class="hr-approval-week">${schedule.weekLabel}</span>
              </div>
              <div class="hr-approval-details">
                <span>${schedule.formattedTotalHours} | ${schedule.totalPoints} Punkte</span>
                <span class="hr-approval-submitted">Eingereicht: ${formatDateDE(schedule.submittedAt)}</span>
              </div>
              <div class="hr-approval-actions">
                <button type="button" class="hr-btn hr-btn-sm hr-btn-outline" data-action="view" data-id="${schedule.id}">
                  Details
                </button>
                <button type="button" class="hr-btn hr-btn-sm hr-btn-success" data-action="approve" data-id="${schedule.id}">
                  Genehmigen
                </button>
                <button type="button" class="hr-btn hr-btn-sm hr-btn-danger" data-action="reject" data-id="${schedule.id}">
                  Ablehnen
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="hr-empty-state">
          <p>Keine ausstehenden Genehmigungen</p>
        </div>
      `}
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Schedule History View
// ============================================================

/**
 * Render schedule history for an employee
 * @param {HTMLElement} container - Container element
 * @param {string} employeeId - Employee ID
 * @param {number} weeks - Number of weeks to show
 */
export function renderScheduleHistory(container, employeeId, weeks = 12) {
  const history = getScheduleHistory(employeeId, weeks);
  
  const html = `
    <div class="hr-schedule-history">
      <h3>Wochenplan-Historie</h3>
      
      ${history.length > 0 ? `
        <div class="hr-table-container">
          <table class="hr-data-table">
            <thead>
              <tr>
                <th>Woche</th>
                <th>Geplante Stunden</th>
                <th>Ist-Stunden</th>
                <th>Punkte</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(schedule => `
                <tr data-schedule-id="${schedule.id}">
                  <td>${schedule.weekLabel}</td>
                  <td>${schedule.formattedTotalHours}</td>
                  <td>${schedule.formattedActualHours}</td>
                  <td>${schedule.totalPoints}</td>
                  <td>
                    <span class="hr-status-badge ${schedule.statusClass}">
                      ${schedule.statusText}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="hr-btn-icon" data-action="view" data-id="${schedule.id}" title="Anzeigen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="hr-empty-state">
          <p>Keine Wochenplan-Historie vorhanden</p>
        </div>
      `}
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Helper Functions
// ============================================================

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
 * Bind event handlers for schedule views
 * @param {HTMLElement} container - Container element
 * @param {Object} handlers - Handler functions
 */
export function bindScheduleEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const id = button.dataset.id;
    const employeeId = button.dataset.employee;
    const week = button.dataset.week;
    
    switch (action) {
      case 'prev-week':
        handlers.onPrevWeek?.();
        break;
      case 'next-week':
        handlers.onNextWeek?.();
        break;
      case 'go-to-current':
        handlers.onCurrentWeek?.();
        break;
      case 'create-schedule':
        handlers.onCreate?.(employeeId, week);
        break;
      case 'view':
        handlers.onView?.(id);
        break;
      case 'approve':
        handlers.onApprove?.(id);
        break;
      case 'reject':
        handlers.onReject?.(id);
        break;
      case 'submit':
        handlers.onSubmit?.(id);
        break;
    }
  });
  
  // Hours input change for points calculation
  container.addEventListener('input', (e) => {
    if (e.target.classList.contains('hr-input-hours')) {
      handlers.onHoursChange?.(e.target);
    }
  });
}
