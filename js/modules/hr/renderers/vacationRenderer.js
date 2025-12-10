/**
 * Vacation Renderer
 * 
 * UI rendering functions for vacation management
 * Handles calendar view, request forms, and approval workflow
 * 
 * @module vacationRenderer
 * @version 1.0.0
 */

import {
  getAllVacation,
  getVacationById,
  getVacationByEmployee,
  getPendingVacationRequests,
  getVacationCalendarData,
  getUpcomingVacation,
  getTeamCoverageView,
  calculateVacationBalance,
  formatVacationForDisplay,
  VACATION_TYPE,
  VACATION_STATUS
} from '../submodules/vacation.js';

import {
  formatDateDE,
  getStatusClass,
  getStatusText,
  calculateWorkingDays
} from '../hrUtils.js';

// ============================================================
// Vacation Calendar View
// ============================================================

/**
 * Render vacation calendar for a month
 * @param {HTMLElement} container - Container element
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Map} employeeMap - Map of employeeId -> employee data for name display
 */
export function renderVacationCalendar(container, year, month, employeeMap = new Map()) {
  const calendarData = getVacationCalendarData(year, month);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  
  // Helper to get employee name from map
  const getEmployeeName = (empId) => {
    const emp = employeeMap.get(empId);
    return emp ? `${emp.lastName}, ${emp.firstName}` : empId;
  };
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();
  
  // Build calendar grid
  let calendarCells = '';
  
  // Empty cells for days before the 1st
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells += '<div class="hr-vacation-cell hr-vacation-empty"></div>';
  }
  
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayVacations = calendarData.vacationsByDate[dateStr] || [];
    const hasVacations = dayVacations.length > 0;
    const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0;
    
    calendarCells += `
      <div class="hr-vacation-cell ${hasVacations ? 'hr-vacation-has-data' : ''} ${isWeekend ? 'hr-vacation-weekend' : ''}"
           data-date="${dateStr}">
        <span class="hr-vacation-day-num">${day}</span>
        ${hasVacations ? `
          <div class="hr-vacation-indicators">
            ${dayVacations.slice(0, 3).map(v => `
              <span class="hr-vacation-indicator" title="${escapeHtml(getEmployeeName(v.employeeId))}"></span>
            `).join('')}
            ${dayVacations.length > 3 ? `<span class="hr-vacation-more">+${dayVacations.length - 3}</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  const html = `
    <div class="hr-vacation-calendar">
      <div class="hr-vacation-calendar-header">
        <button type="button" class="hr-btn-icon" data-action="prev-month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3>${monthName}</h3>
        <button type="button" class="hr-btn-icon" data-action="next-month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div class="hr-vacation-calendar-grid">
        <div class="hr-vacation-weekdays">
          <span>Mo</span>
          <span>Di</span>
          <span>Mi</span>
          <span>Do</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>So</span>
        </div>
        <div class="hr-vacation-days">
          ${calendarCells}
        </div>
      </div>
      
      <div class="hr-vacation-calendar-footer">
        <button type="button" class="hr-btn hr-btn-primary" data-action="new-request">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Neuer Urlaubsantrag
        </button>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Vacation Request Form
// ============================================================

/**
 * Render vacation request form
 * @param {HTMLElement} container - Container element
 * @param {Object} request - Existing request for editing (null for new)
 * @param {Array} employees - List of employees
 */
export function renderVacationForm(container, request = null, employees = []) {
  const isEdit = !!request;
  const today = new Date().toISOString().split('T')[0];
  
  const html = `
    <form id="hr-vacation-form" class="hr-form">
      <div class="hr-form-row">
        <div class="hr-form-group">
          <label for="vac-employee">Mitarbeiter *</label>
          <select id="vac-employee" name="employeeId" required ${isEdit ? 'disabled' : ''}>
            <option value="">-- Mitarbeiter wählen --</option>
            ${employees.map(emp => `
              <option value="${emp.id}" ${request?.employeeId === emp.id ? 'selected' : ''}>
                ${escapeHtml(emp.lastName)}, ${escapeHtml(emp.firstName)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="hr-form-group">
          <label for="vac-type">Art des Urlaubs</label>
          <select id="vac-type" name="vacationType">
            ${Object.entries(VACATION_TYPE).map(([key, value]) => `
              <option value="${value}" ${request?.vacationType === value ? 'selected' : ''}>
                ${getStatusText(value)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="hr-form-row">
        <div class="hr-form-group">
          <label for="vac-start">Von *</label>
          <input type="date" id="vac-start" name="startDate" required
            value="${request?.startDate || today}"
            min="${today}" />
        </div>
        <div class="hr-form-group">
          <label for="vac-end">Bis *</label>
          <input type="date" id="vac-end" name="endDate" required
            value="${request?.endDate || today}"
            min="${today}" />
        </div>
        <div class="hr-form-group">
          <label>Tage</label>
          <span class="hr-vacation-days-display" id="vac-days-count">${request?.daysRequested || 1}</span>
        </div>
      </div>
      
      <div class="hr-form-group">
        <label for="vac-reason">Grund / Bemerkung</label>
        <textarea id="vac-reason" name="reason" rows="2">${escapeHtml(request?.reason || '')}</textarea>
      </div>
      
      <div class="hr-form-group">
        <label for="vac-replacement">Vertretung</label>
        <select id="vac-replacement" name="replacementContact">
          <option value="">-- Keine Vertretung --</option>
          ${employees.map(emp => `
            <option value="${emp.id}" ${request?.replacementContact === emp.id ? 'selected' : ''}>
              ${escapeHtml(emp.lastName)}, ${escapeHtml(emp.firstName)}
            </option>
          `).join('')}
        </select>
      </div>
      
      <div class="hr-form-actions">
        <button type="button" class="hr-btn hr-btn-secondary" data-action="cancel">
          Abbrechen
        </button>
        <button type="submit" class="hr-btn hr-btn-primary">
          ${isEdit ? 'Speichern' : 'Antrag einreichen'}
        </button>
      </div>
    </form>
  `;
  
  container.innerHTML = html;
  
  // Set up date change listeners to calculate days
  const startInput = container.querySelector('#vac-start');
  const endInput = container.querySelector('#vac-end');
  const daysDisplay = container.querySelector('#vac-days-count');
  
  const updateDays = () => {
    if (startInput.value && endInput.value) {
      const days = calculateWorkingDays(startInput.value, endInput.value);
      daysDisplay.textContent = days;
    }
  };
  
  startInput?.addEventListener('change', updateDays);
  endInput?.addEventListener('change', updateDays);
}

// ============================================================
// Pending Approvals View
// ============================================================

/**
 * Render pending vacation approvals
 * @param {HTMLElement} container - Container element
 * @param {Map} employeeMap - Map of employeeId -> employee data for name display
 */
export function renderPendingVacationApprovals(container, employeeMap = new Map()) {
  const pending = getPendingVacationRequests().map(formatVacationForDisplay);
  
  // Helper to get employee name from map
  const getEmployeeName = (empId) => {
    const emp = employeeMap.get(empId);
    return emp ? `${emp.lastName}, ${emp.firstName}` : empId;
  };
  
  const html = `
    <div class="hr-vacation-approvals">
      <h3>Ausstehende Urlaubsanträge (${pending.length})</h3>
      
      ${pending.length > 0 ? `
        <div class="hr-approval-list">
          ${pending.map(request => `
            <div class="hr-vacation-approval-card" data-vacation-id="${request.id}">
              <div class="hr-approval-header">
                <span class="hr-approval-employee">${escapeHtml(getEmployeeName(request.employeeId))}</span>
                <span class="hr-status-badge ${request.statusClass}">${request.statusText}</span>
              </div>
              <div class="hr-approval-dates">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ${request.formattedStartDate} - ${request.formattedEndDate}
                <span class="hr-vacation-duration">(${request.duration})</span>
              </div>
              <div class="hr-approval-type">
                <span class="hr-vacation-type-badge">${request.typeText}</span>
              </div>
              ${request.reason ? `<div class="hr-approval-reason">${escapeHtml(request.reason)}</div>` : ''}
              <div class="hr-approval-actions">
                <button type="button" class="hr-btn hr-btn-sm hr-btn-success" data-action="approve" data-id="${request.id}">
                  Genehmigen
                </button>
                <button type="button" class="hr-btn hr-btn-sm hr-btn-danger" data-action="reject" data-id="${request.id}">
                  Ablehnen
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="hr-empty-state">
          <p>Keine ausstehenden Anträge</p>
        </div>
      `}
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Vacation Balance View
// ============================================================

/**
 * Render vacation balance for an employee
 * @param {HTMLElement} container - Container element
 * @param {string} employeeId - Employee ID
 * @param {number} year - Year
 */
export function renderVacationBalance(container, employeeId, year = new Date().getFullYear()) {
  const balance = calculateVacationBalance(employeeId, year);
  const upcoming = getUpcomingVacation(employeeId, 90);
  
  const html = `
    <div class="hr-vacation-balance">
      <h3>Urlaubskonto ${year}</h3>
      
      <div class="hr-balance-cards">
        <div class="hr-balance-card">
          <span class="hr-balance-value">${balance.total}</span>
          <span class="hr-balance-label">Gesamtanspruch</span>
        </div>
        <div class="hr-balance-card hr-balance-used">
          <span class="hr-balance-value">${balance.used}</span>
          <span class="hr-balance-label">Genommen</span>
        </div>
        <div class="hr-balance-card hr-balance-pending">
          <span class="hr-balance-value">${balance.pending}</span>
          <span class="hr-balance-label">Beantragt</span>
        </div>
        <div class="hr-balance-card hr-balance-remaining">
          <span class="hr-balance-value">${balance.remaining}</span>
          <span class="hr-balance-label">Verfügbar</span>
        </div>
      </div>
      
      <div class="hr-balance-bar">
        <div class="hr-balance-bar-used" style="width: ${(balance.used / balance.total) * 100}%"></div>
        <div class="hr-balance-bar-pending" style="width: ${(balance.pending / balance.total) * 100}%"></div>
      </div>
      
      ${upcoming.length > 0 ? `
        <div class="hr-upcoming-vacation">
          <h4>Kommende Urlaubstage</h4>
          <ul class="hr-upcoming-list">
            ${upcoming.map(vac => `
              <li>
                <span class="hr-upcoming-dates">${vac.formattedStartDate} - ${vac.formattedEndDate}</span>
                <span class="hr-upcoming-days">${vac.duration}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Team Coverage View
// ============================================================

/**
 * Render team coverage view for vacation planning
 * @param {HTMLElement} container - Container element
 * @param {Array} employeeIds - Employee IDs in team
 * @param {string} startDate - Period start
 * @param {string} endDate - Period end
 */
export function renderTeamCoverage(container, employeeIds, startDate, endDate) {
  const coverage = getTeamCoverageView(employeeIds, startDate, endDate);
  
  const html = `
    <div class="hr-team-coverage">
      <h3>Team-Abdeckung</h3>
      <p class="hr-coverage-period">${formatDateDE(startDate)} - ${formatDateDE(endDate)}</p>
      
      <div class="hr-coverage-grid">
        ${Object.entries(coverage.dailyCoverage).map(([date, data]) => {
          const coverageClass = data.coveragePercent >= 80 ? 'hr-coverage-good' : 
                               data.coveragePercent >= 50 ? 'hr-coverage-warning' : 'hr-coverage-critical';
          
          return `
            <div class="hr-coverage-day ${coverageClass}" data-date="${date}" title="${Math.round(data.coveragePercent)}% Abdeckung">
              <span class="hr-coverage-date">${new Date(date).getDate()}</span>
              <span class="hr-coverage-count">${data.presentCount}/${coverage.teamSize}</span>
            </div>
          `;
        }).join('')}
      </div>
      
      <div class="hr-coverage-legend">
        <span class="hr-legend-item"><span class="hr-legend-dot hr-coverage-good"></span> ≥80%</span>
        <span class="hr-legend-item"><span class="hr-legend-dot hr-coverage-warning"></span> 50-79%</span>
        <span class="hr-legend-item"><span class="hr-legend-dot hr-coverage-critical"></span> &lt;50%</span>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Vacation List View
// ============================================================

/**
 * Render vacation requests list for an employee
 * @param {HTMLElement} container - Container element
 * @param {string} employeeId - Employee ID
 */
export function renderVacationList(container, employeeId) {
  const vacations = getVacationByEmployee(employeeId).map(formatVacationForDisplay);
  
  // Sort by start date descending
  vacations.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  
  const html = `
    <div class="hr-vacation-list">
      <h3>Urlaubsanträge</h3>
      
      ${vacations.length > 0 ? `
        <div class="hr-table-container">
          <table class="hr-data-table">
            <thead>
              <tr>
                <th>Zeitraum</th>
                <th>Tage</th>
                <th>Art</th>
                <th>Status</th>
                <th>Beantragt am</th>
              </tr>
            </thead>
            <tbody>
              ${vacations.map(vac => `
                <tr data-vacation-id="${vac.id}">
                  <td>${vac.formattedStartDate} - ${vac.formattedEndDate}</td>
                  <td>${vac.daysRequested}</td>
                  <td>${vac.typeText}</td>
                  <td>
                    <span class="hr-status-badge ${vac.statusClass}">
                      ${vac.statusText}
                    </span>
                  </td>
                  <td>${vac.formattedRequestedAt}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="hr-empty-state">
          <p>Keine Urlaubsanträge vorhanden</p>
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
 * Bind event handlers for vacation views
 * @param {HTMLElement} container - Container element
 * @param {Object} handlers - Handler functions
 */
export function bindVacationEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    const cell = e.target.closest('[data-date]');
    
    if (button) {
      const action = button.dataset.action;
      const id = button.dataset.id;
      
      switch (action) {
        case 'prev-month':
          handlers.onPrevMonth?.();
          break;
        case 'next-month':
          handlers.onNextMonth?.();
          break;
        case 'new-request':
          handlers.onNewRequest?.();
          break;
        case 'approve':
          handlers.onApprove?.(id);
          break;
        case 'reject':
          handlers.onReject?.(id);
          break;
      }
    } else if (cell && handlers.onDateClick) {
      handlers.onDateClick(cell.dataset.date);
    }
  });
}
