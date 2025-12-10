/**
 * Attendance Renderer
 * 
 * UI rendering functions for attendance tracking
 * Handles daily log, entry forms, and reports
 * 
 * @module attendanceRenderer
 * @version 1.0.0
 */

import {
  getAllAttendance,
  getAttendanceByDate,
  getEmployeeAttendanceForDisplay,
  getTodayAttendance,
  getDailyAttendanceSummary,
  getMonthlyAttendanceReport,
  formatAttendanceForDisplay,
  ATTENDANCE_STATUS,
  ATTENDANCE_TYPE
} from '../submodules/attendance.js';

import {
  formatDateDE,
  getStatusClass,
  getStatusText
} from '../hrUtils.js';

// ============================================================
// Daily Attendance View
// ============================================================

/**
 * Render daily attendance log
 * @param {HTMLElement} container - Container element
 * @param {string} date - Date to display (YYYY-MM-DD)
 * @param {Map} employeeMap - Map of employeeId -> employee data for name display
 */
export function renderDailyAttendanceLog(container, date = new Date().toISOString().split('T')[0], employeeMap = new Map()) {
  const records = getAttendanceByDate(date).map(formatAttendanceForDisplay);
  const summary = getDailyAttendanceSummary(date);
  
  const html = `
    <div class="hr-attendance-daily">
      <div class="hr-attendance-header">
        <div class="hr-date-navigation">
          <button type="button" class="hr-btn-icon" data-action="prev-day">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input type="date" id="attendance-date" value="${date}" class="hr-date-input" />
          <button type="button" class="hr-btn-icon" data-action="next-day">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <h3>${summary.dayOfWeek}, ${formatDateDE(date)}</h3>
      </div>
      
      <div class="hr-attendance-summary-cards">
        <div class="hr-mini-stat">
          <span class="hr-mini-stat-value">${summary.presentDays}</span>
          <span class="hr-mini-stat-label">Anwesend</span>
        </div>
        <div class="hr-mini-stat">
          <span class="hr-mini-stat-value">${summary.absentDays}</span>
          <span class="hr-mini-stat-label">Abwesend</span>
        </div>
        <div class="hr-mini-stat">
          <span class="hr-mini-stat-value">${summary.sickDays}</span>
          <span class="hr-mini-stat-label">Krank</span>
        </div>
        <div class="hr-mini-stat">
          <span class="hr-mini-stat-value">${summary.vacationDays}</span>
          <span class="hr-mini-stat-label">Urlaub</span>
        </div>
      </div>
      
      ${records.length > 0 ? `
        <div class="hr-table-container">
          <table class="hr-data-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Eintritt</th>
                <th>Austritt</th>
                <th>Pause</th>
                <th>Stunden</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => renderAttendanceRow(r, employeeMap)).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="hr-empty-state">
          <p>Keine Einträge für diesen Tag</p>
        </div>
      `}
      
      <div class="hr-attendance-actions">
        <button type="button" class="hr-btn hr-btn-primary" data-action="add-attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Eintrag hinzufügen
        </button>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Render a single attendance table row
 * @param {Object} record - Formatted attendance record
 * @param {Map} employeeMap - Map of employeeId -> employee data (optional)
 * @returns {string} HTML string
 */
function renderAttendanceRow(record, employeeMap = new Map()) {
  const employee = employeeMap.get(record.employeeId);
  const displayName = employee 
    ? `${escapeHtml(employee.lastName)}, ${escapeHtml(employee.firstName)}` 
    : escapeHtml(record.employeeId);
  
  return `
    <tr data-attendance-id="${record.id}">
      <td>${displayName}</td>
      <td>${record.formattedEntryTime}</td>
      <td>${record.formattedExitTime}</td>
      <td>${record.breakMinutes || 0} min</td>
      <td>${record.formattedHours}</td>
      <td>
        <span class="hr-status-badge ${record.statusClass}">
          ${record.statusText}
        </span>
      </td>
      <td>
        <div class="hr-action-buttons">
          <button type="button" class="hr-btn-icon" data-action="edit" data-id="${record.id}" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ============================================================
// Attendance Entry Form
// ============================================================

/**
 * Render attendance entry form
 * @param {HTMLElement} container - Container element
 * @param {Object} record - Existing record for editing (null for new)
 * @param {Array} employees - List of employees for dropdown
 */
export function renderAttendanceForm(container, record = null, employees = []) {
  const isEdit = !!record;
  
  const html = `
    <form id="hr-attendance-form" class="hr-form">
      <div class="hr-form-row">
        <div class="hr-form-group">
          <label for="att-employee">Mitarbeiter *</label>
          <select id="att-employee" name="employeeId" required ${isEdit ? 'disabled' : ''}>
            <option value="">-- Mitarbeiter wählen --</option>
            ${employees.map(emp => `
              <option value="${emp.id}" ${record?.employeeId === emp.id ? 'selected' : ''}>
                ${escapeHtml(emp.lastName)}, ${escapeHtml(emp.firstName)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="hr-form-group">
          <label for="att-date">Datum *</label>
          <input type="date" id="att-date" name="date" required
            value="${record?.date || new Date().toISOString().split('T')[0]}" />
        </div>
      </div>
      
      <div class="hr-form-row">
        <div class="hr-form-group">
          <label for="att-entry">Eintrittszeit</label>
          <input type="time" id="att-entry" name="entryTime"
            value="${record?.entryTime || '09:00'}" />
        </div>
        <div class="hr-form-group">
          <label for="att-exit">Austrittszeit</label>
          <input type="time" id="att-exit" name="exitTime"
            value="${record?.exitTime || '17:30'}" />
        </div>
        <div class="hr-form-group">
          <label for="att-break">Pause (min)</label>
          <input type="number" id="att-break" name="breakMinutes" min="0" max="120"
            value="${record?.breakMinutes || 30}" />
        </div>
      </div>
      
      <div class="hr-form-row">
        <div class="hr-form-group">
          <label for="att-status">Status</label>
          <select id="att-status" name="status">
            ${Object.entries(ATTENDANCE_STATUS).map(([key, value]) => `
              <option value="${value}" ${record?.status === value ? 'selected' : ''}>
                ${getStatusText(value)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="hr-form-group">
          <label for="att-type">Typ</label>
          <select id="att-type" name="type">
            ${Object.entries(ATTENDANCE_TYPE).map(([key, value]) => `
              <option value="${value}" ${record?.type === value ? 'selected' : ''}>
                ${getStatusText(value)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="hr-form-group">
        <label for="att-notes">Notizen</label>
        <textarea id="att-notes" name="notes" rows="2">${escapeHtml(record?.notes || '')}</textarea>
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
  
  container.innerHTML = html;
}

// ============================================================
// Attendance Calendar View
// ============================================================

/**
 * Render attendance calendar for a month
 * @param {HTMLElement} container - Container element
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {string} employeeId - Employee ID (optional, for single employee view)
 */
export function renderAttendanceCalendar(container, year, month, employeeId = null) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  
  const daysInMonth = lastDay.getDate();
  const monthName = firstDay.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  
  // Build calendar grid
  let calendarCells = '';
  
  // Empty cells for days before the 1st
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells += '<div class="hr-calendar-cell hr-calendar-empty"></div>';
  }
  
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const records = getAttendanceByDate(dateStr);
    const relevantRecords = employeeId 
      ? records.filter(r => r.employeeId === employeeId)
      : records;
    
    const hasRecords = relevantRecords.length > 0;
    const status = relevantRecords[0]?.status;
    const statusClass = status ? getStatusClass(status) : '';
    
    calendarCells += `
      <div class="hr-calendar-cell ${hasRecords ? 'hr-calendar-has-record' : ''} ${statusClass}"
           data-date="${dateStr}">
        <span class="hr-calendar-day">${day}</span>
        ${hasRecords ? `<span class="hr-calendar-count">${relevantRecords.length}</span>` : ''}
      </div>
    `;
  }
  
  const html = `
    <div class="hr-attendance-calendar">
      <div class="hr-calendar-header">
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
      
      <div class="hr-calendar-grid">
        <div class="hr-calendar-weekdays">
          <span>Mo</span>
          <span>Di</span>
          <span>Mi</span>
          <span>Do</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>So</span>
        </div>
        <div class="hr-calendar-days">
          ${calendarCells}
        </div>
      </div>
      
      <div class="hr-calendar-legend">
        <span class="hr-legend-item"><span class="hr-legend-dot hr-status-present"></span> Anwesend</span>
        <span class="hr-legend-item"><span class="hr-legend-dot hr-status-absent"></span> Abwesend</span>
        <span class="hr-legend-item"><span class="hr-legend-dot hr-status-sick"></span> Krank</span>
        <span class="hr-legend-item"><span class="hr-legend-dot hr-status-vacation"></span> Urlaub</span>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================================
// Attendance Report View
// ============================================================

/**
 * Render monthly attendance report
 * @param {HTMLElement} container - Container element
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Map} employeeMap - Map of employeeId -> employee data for name display
 */
export function renderAttendanceReport(container, year, month, employeeMap = new Map()) {
  const report = getMonthlyAttendanceReport(year, month);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  
  // Helper to get employee name from map
  const getEmployeeName = (empId) => {
    const emp = employeeMap.get(empId);
    return emp ? `${emp.lastName}, ${emp.firstName}` : empId;
  };
  
  const html = `
    <div class="hr-attendance-report">
      <div class="hr-report-header">
        <h3>Anwesenheitsbericht: ${monthName}</h3>
        <button type="button" class="hr-btn hr-btn-secondary" data-action="export-report">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportieren
        </button>
      </div>
      
      <div class="hr-report-summary">
        <div class="hr-report-stat">
          <span class="hr-report-stat-value">${report.totalRecords}</span>
          <span class="hr-report-stat-label">Einträge gesamt</span>
        </div>
        <div class="hr-report-stat">
          <span class="hr-report-stat-value">${report.overall.presentDays}</span>
          <span class="hr-report-stat-label">Anwesenheitstage</span>
        </div>
        <div class="hr-report-stat">
          <span class="hr-report-stat-value">${report.overall.totalHours.toFixed(1)}h</span>
          <span class="hr-report-stat-label">Gesamtstunden</span>
        </div>
      </div>
      
      ${report.employeeSummaries.length > 0 ? `
        <div class="hr-table-container">
          <table class="hr-data-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Anwesend</th>
                <th>Abwesend</th>
                <th>Krank</th>
                <th>Urlaub</th>
                <th>Stunden</th>
              </tr>
            </thead>
            <tbody>
              ${report.employeeSummaries.map(emp => `
                <tr>
                  <td>${escapeHtml(getEmployeeName(emp.employeeId))}</td>
                  <td>${emp.presentDays}</td>
                  <td>${emp.absentDays}</td>
                  <td>${emp.sickDays}</td>
                  <td>${emp.vacationDays}</td>
                  <td>${emp.totalHours.toFixed(1)}h</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="hr-empty-state">
          <p>Keine Daten für diesen Zeitraum</p>
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
 * Bind event handlers for attendance views
 * @param {HTMLElement} container - Container element
 * @param {Object} handlers - Handler functions
 */
export function bindAttendanceEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const id = button.dataset.id;
    
    switch (action) {
      case 'prev-day':
        handlers.onPrevDay?.();
        break;
      case 'next-day':
        handlers.onNextDay?.();
        break;
      case 'prev-month':
        handlers.onPrevMonth?.();
        break;
      case 'next-month':
        handlers.onNextMonth?.();
        break;
      case 'add-attendance':
        handlers.onAdd?.();
        break;
      case 'edit':
        handlers.onEdit?.(id);
        break;
      case 'export-report':
        handlers.onExport?.();
        break;
    }
  });
  
  // Date input change
  const dateInput = container.querySelector('#attendance-date');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      handlers.onDateChange?.(e.target.value);
    });
  }
}
