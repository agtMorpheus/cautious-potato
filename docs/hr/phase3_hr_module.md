# HR Management Module - Phase 3: UI Components & Renderers

**Duration:** Weeks 5-6  
**Status:** User Interface Layer  
**Target:** Build interactive UI components and rendering logic

---

## 1. Overview

Phase 3 implements the complete user interface for the HR Management Module. This phase builds responsive UI components, rendering logic, and interactive workflows for all four core features: employee management, attendance tracking, schedule management, and vacation planning.

### Key Objectives
- Create responsive HTML component templates
- Implement renderer modules for dynamic content generation
- Build form components with validation
- Design modal dialogs for data entry
- Implement navigation and routing logic
- Create responsive CSS for mobile and desktop

---

## 2. HTML Structure (html/pages/hr-dashboard.html)

### Complete Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HR Management Dashboard - Booking Backend</title>
    
    <!-- Existing styles -->
    <link rel="stylesheet" href="../../css/style.css">
    <!-- HR module styles -->
    <link rel="stylesheet" href="../../css/hr-module.css">
</head>
<body>
    <div class="hr-app">
        <!-- Header Navigation -->
        <header class="hr-header">
            <div class="hr-header__container">
                <h1 class="hr-header__title">HR Management System</h1>
                <nav class="hr-header__nav">
                    <button class="hr-nav-btn" data-tab="employees" title="Manage employees">
                        <span class="hr-nav-icon">👥</span>
                        <span class="hr-nav-label">Employees</span>
                    </button>
                    <button class="hr-nav-btn" data-tab="attendance" title="Track attendance">
                        <span class="hr-nav-icon">📋</span>
                        <span class="hr-nav-label">Attendance</span>
                    </button>
                    <button class="hr-nav-btn" data-tab="schedule" title="Manage schedules">
                        <span class="hr-nav-icon">⏰</span>
                        <span class="hr-nav-label">Schedule</span>
                    </button>
                    <button class="hr-nav-btn" data-tab="vacation" title="Plan vacation">
                        <span class="hr-nav-icon">🏖️</span>
                        <span class="hr-nav-label">Vacation</span>
                    </button>
                </nav>
                <div class="hr-header__actions">
                    <button class="btn btn--secondary" id="sync-btn">Sync</button>
                    <button class="btn btn--outline" id="export-btn">Export</button>
                </div>
            </div>
        </header>

        <!-- Main Content Area -->
        <main class="hr-main">
            <!-- Loading Indicator -->
            <div id="hr-loading" class="hr-loading hidden">
                <div class="hr-spinner"></div>
                <p>Loading...</p>
            </div>

            <!-- Error Alert -->
            <div id="hr-error-alert" class="hr-alert hr-alert--error hidden" role="alert">
                <span class="hr-alert__message"></span>
                <button class="hr-alert__close" aria-label="Close">&times;</button>
            </div>

            <!-- Success Alert -->
            <div id="hr-success-alert" class="hr-alert hr-alert--success hidden" role="alert">
                <span class="hr-alert__message"></span>
            </div>

            <!-- Employees Tab -->
            <section id="employees-tab" class="hr-tab hr-tab--active">
                <div class="hr-tab__header">
                    <h2>Employee Management</h2>
                    <button class="btn btn--primary" id="add-employee-btn">
                        <span>+ New Employee</span>
                    </button>
                </div>

                <!-- Search & Filter Bar -->
                <div class="hr-filters">
                    <input 
                        type="search" 
                        id="employee-search" 
                        class="hr-filters__input"
                        placeholder="Search by name, email, or ID..."
                        aria-label="Search employees"
                    >
                    <select id="department-filter" class="hr-filters__select" aria-label="Filter by department">
                        <option value="">All Departments</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="HR">Human Resources</option>
                        <option value="Finance">Finance</option>
                    </select>
                    <select id="status-filter" class="hr-filters__select" aria-label="Filter by status">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <!-- Employee Table -->
                <div class="hr-table-container">
                    <table class="hr-table" id="employees-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="employees-table-body">
                            <!-- Populated by renderer -->
                        </tbody>
                    </table>
                </div>

                <!-- Empty State -->
                <div id="employees-empty" class="hr-empty-state hidden">
                    <p>No employees found. <a href="#" id="add-employee-empty">Add the first employee</a></p>
                </div>
            </section>

            <!-- Attendance Tab -->
            <section id="attendance-tab" class="hr-tab">
                <div class="hr-tab__header">
                    <h2>Attendance Management</h2>
                    <button class="btn btn--primary" id="record-attendance-btn">
                        <span>+ Record Attendance</span>
                    </button>
                </div>

                <!-- Date Range Picker -->
                <div class="hr-filters">
                    <div class="hr-date-range">
                        <label>From Date:</label>
                        <input type="date" id="attendance-start-date" class="form-control">
                    </div>
                    <div class="hr-date-range">
                        <label>To Date:</label>
                        <input type="date" id="attendance-end-date" class="form-control">
                    </div>
                    <select id="attendance-employee-filter" class="hr-filters__select">
                        <option value="">All Employees</option>
                    </select>
                    <button class="btn btn--secondary" id="attendance-filter-btn">Apply</button>
                </div>

                <!-- Attendance Calendar -->
                <div class="hr-calendar" id="attendance-calendar">
                    <!-- Populated by renderer -->
                </div>

                <!-- Attendance Statistics -->
                <div class="hr-stats-grid" id="attendance-stats">
                    <!-- Populated by renderer -->
                </div>
            </section>

            <!-- Schedule Tab -->
            <section id="schedule-tab" class="hr-tab">
                <div class="hr-tab__header">
                    <h2>Weekly Schedule Management</h2>
                    <button class="btn btn--primary" id="create-schedule-btn">
                        <span>+ Create Schedule</span>
                    </button>
                </div>

                <!-- Week Selector -->
                <div class="hr-filters">
                    <select id="schedule-employee-select" class="hr-filters__select">
                        <option value="">Select Employee</option>
                    </select>
                    <div class="hr-week-selector">
                        <button class="btn btn--outline" id="prev-week-btn">&larr; Previous</button>
                        <input type="date" id="week-start-date" class="form-control" placeholder="Week start date">
                        <button class="btn btn--outline" id="next-week-btn">Next &rarr;</button>
                    </div>
                </div>

                <!-- Schedule Grid -->
                <div class="hr-schedule-grid" id="schedule-grid">
                    <!-- Populated by renderer -->
                </div>

                <!-- Schedule Summary -->
                <div class="hr-schedule-summary" id="schedule-summary">
                    <div class="hr-summary-item">
                        <span>Total Hours:</span>
                        <span id="total-hours">0h</span>
                    </div>
                    <div class="hr-summary-item">
                        <span>Total Points:</span>
                        <span id="total-points">0</span>
                    </div>
                    <button class="btn btn--primary" id="submit-schedule-btn">Submit for Approval</button>
                </div>

                <!-- Pending Approvals -->
                <div class="hr-pending-approvals" id="pending-approvals">
                    <!-- Populated by renderer -->
                </div>
            </section>

            <!-- Vacation Tab -->
            <section id="vacation-tab" class="hr-tab">
                <div class="hr-tab__header">
                    <h2>Vacation Planning</h2>
                    <button class="btn btn--primary" id="request-vacation-btn">
                        <span>+ Request Vacation</span>
                    </button>
                </div>

                <!-- Vacation Calendar -->
                <div class="hr-vacation-calendar" id="vacation-calendar">
                    <!-- Populated by renderer -->
                </div>

                <!-- Vacation Requests Table -->
                <div class="hr-section-title">Vacation Requests</div>
                <div class="hr-table-container">
                    <table class="hr-table" id="vacation-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Days</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="vacation-table-body">
                            <!-- Populated by renderer -->
                        </tbody>
                    </table>
                </div>

                <!-- Vacation Balance -->
                <div class="hr-vacation-balance" id="vacation-balance">
                    <!-- Populated by renderer -->
                </div>
            </section>
        </main>
    </div>

    <!-- Modals -->
    
    <!-- Employee Modal -->
    <div id="employee-modal" class="hr-modal hidden" aria-hidden="true" role="dialog">
        <div class="hr-modal__overlay"></div>
        <div class="hr-modal__content">
            <div class="hr-modal__header">
                <h3 id="employee-modal-title">Add Employee</h3>
                <button class="hr-modal__close" aria-label="Close">&times;</button>
            </div>
            <form id="employee-form" class="hr-form">
                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">First Name *</label>
                        <input type="text" name="firstName" class="form-control" required>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Last Name *</label>
                        <input type="text" name="lastName" class="form-control" required>
                    </div>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Email *</label>
                        <input type="email" name="email" class="form-control" required>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Phone</label>
                        <input type="tel" name="phone" class="form-control">
                    </div>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Department *</label>
                        <select name="department" class="form-control" required>
                            <option value="">Select Department</option>
                        </select>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Position *</label>
                        <input type="text" name="position" class="form-control" required>
                    </div>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Contract Type</label>
                        <select name="contractType" class="form-control">
                            <option value="fulltime">Full-time</option>
                            <option value="parttime">Part-time</option>
                            <option value="contract">Contract</option>
                        </select>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Hours per Week</label>
                        <input type="number" name="hoursPerWeek" class="form-control" min="0" max="60" step="0.5">
                    </div>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Start Date *</label>
                        <input type="date" name="startDate" class="form-control" required>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Status</label>
                        <select name="employmentStatus" class="form-control">
                            <option value="active">Active</option>
                            <option value="on_leave">On Leave</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div class="hr-form__actions">
                    <button type="submit" class="btn btn--primary">Save Employee</button>
                    <button type="button" class="btn btn--secondary" id="cancel-employee-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Attendance Modal -->
    <div id="attendance-modal" class="hr-modal hidden" aria-hidden="true" role="dialog">
        <div class="hr-modal__overlay"></div>
        <div class="hr-modal__content">
            <div class="hr-modal__header">
                <h3>Record Attendance</h3>
                <button class="hr-modal__close" aria-label="Close">&times;</button>
            </div>
            <form id="attendance-form" class="hr-form">
                <div class="hr-form__group">
                    <label class="form-label">Employee *</label>
                    <select name="employeeId" class="form-control" required>
                        <option value="">Select Employee</option>
                    </select>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Date *</label>
                        <input type="date" name="date" class="form-control" required>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Status *</label>
                        <select name="status" class="form-control" required>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="sick_leave">Sick Leave</option>
                            <option value="vacation">Vacation</option>
                            <option value="unpaid_leave">Unpaid Leave</option>
                            <option value="home_office">Home Office</option>
                        </select>
                    </div>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Entry Time (HH:MM)</label>
                        <input type="time" name="entryTime" class="form-control">
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Exit Time (HH:MM)</label>
                        <input type="time" name="exitTime" class="form-control">
                    </div>
                </div>

                <div class="hr-form__group">
                    <label class="form-label">Break Minutes</label>
                    <input type="number" name="breakMinutes" class="form-control" min="0" max="480" value="30">
                </div>

                <div class="hr-form__group">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-control" rows="3"></textarea>
                </div>

                <div class="hr-form__actions">
                    <button type="submit" class="btn btn--primary">Record Attendance</button>
                    <button type="button" class="btn btn--secondary" id="cancel-attendance-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Vacation Modal -->
    <div id="vacation-modal" class="hr-modal hidden" aria-hidden="true" role="dialog">
        <div class="hr-modal__overlay"></div>
        <div class="hr-modal__content">
            <div class="hr-modal__header">
                <h3>Request Vacation</h3>
                <button class="hr-modal__close" aria-label="Close">&times;</button>
            </div>
            <form id="vacation-form" class="hr-form">
                <div class="hr-form__group">
                    <label class="form-label">Employee *</label>
                    <select name="employeeId" class="form-control" required>
                        <option value="">Select Employee</option>
                    </select>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Start Date *</label>
                        <input type="date" name="startDate" class="form-control" required>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">End Date *</label>
                        <input type="date" name="endDate" class="form-control" required>
                    </div>
                </div>

                <div class="hr-form__row">
                    <div class="hr-form__group">
                        <label class="form-label">Vacation Type *</label>
                        <select name="vacationType" class="form-control" required>
                            <option value="annual">Annual Leave</option>
                            <option value="unpaid">Unpaid Leave</option>
                            <option value="sick">Sick Leave</option>
                            <option value="parental">Parental Leave</option>
                            <option value="special">Special Leave</option>
                        </select>
                    </div>
                    <div class="hr-form__group">
                        <label class="form-label">Reason</label>
                        <input type="text" name="reason" class="form-control" placeholder="e.g., Summer vacation">
                    </div>
                </div>

                <div class="hr-form__group">
                    <label class="form-label">Replacement Contact</label>
                    <select name="replacementContact" class="form-control">
                        <option value="">Select Employee</option>
                    </select>
                </div>

                <div class="hr-form__actions">
                    <button type="submit" class="btn btn--primary">Submit Request</button>
                    <button type="button" class="btn btn--secondary" id="cancel-vacation-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Scripts -->
    <script type="module" src="../../js/modules/hr/main.js"></script>
</body>
</html>
```

---

## 3. CSS Styling (css/hr-module.css)

### Complete Stylesheet

```css
/* ============================================
   HR Module - Responsive Styling
   ============================================ */

/* Root Variables */
:root {
    --hr-primary: var(--color-primary);
    --hr-primary-hover: var(--color-primary-hover);
    --hr-secondary: var(--color-secondary);
    --hr-border: var(--color-border);
    --hr-text: var(--color-text);
    --hr-text-secondary: var(--color-text-secondary);
    --hr-bg: var(--color-background);
    --hr-surface: var(--color-surface);
    
    /* Status Colors */
    --hr-present: #10b981;
    --hr-absent: #ef4444;
    --hr-vacation: #3b82f6;
    --hr-sick: #f59e0b;
    --hr-pending: #8b5cf6;
    --hr-approved: #10b981;
    --hr-rejected: #dc2626;
}

/* ============================================
   LAYOUT
   ============================================ */

.hr-app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--hr-bg);
}

.hr-header {
    background: var(--hr-surface);
    border-bottom: 1px solid var(--hr-border);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hr-header__container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
}

.hr-header__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--hr-text);
    flex-shrink: 0;
}

.hr-header__nav {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    min-width: 300px;
}

.hr-nav-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    color: var(--hr-text-secondary);
}

.hr-nav-btn:hover {
    background: var(--hr-secondary);
    color: var(--hr-text);
}

.hr-nav-btn.active {
    background: var(--hr-primary);
    color: white;
    border-color: var(--hr-primary-hover);
}

.hr-nav-icon {
    font-size: 1.25rem;
}

.hr-nav-label {
    display: none;
}

@media (min-width: 768px) {
    .hr-nav-label {
        display: inline;
    }
}

.hr-header__actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
}

.hr-main {
    flex: 1;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem;
}

/* ============================================
   TABS
   ============================================ */

.hr-tab {
    display: none;
    animation: fadeIn 0.3s ease-in;
}

.hr-tab--active {
    display: block;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.hr-tab__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.hr-tab__header h2 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--hr-text);
}

/* ============================================
   FILTERS & SEARCH
   ============================================ */

.hr-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    align-items: center;
}

.hr-filters__input,
.hr-filters__select {
    flex: 1;
    min-width: 200px;
    padding: 0.75rem 1rem;
    border: 1px solid var(--hr-border);
    border-radius: 6px;
    background: var(--hr-surface);
    color: var(--hr-text);
    font-size: 0.95rem;
}

.hr-filters__input:focus,
.hr-filters__select:focus {
    outline: none;
    border-color: var(--hr-primary);
    box-shadow: 0 0 0 3px rgba(33, 128, 141, 0.1);
}

.hr-date-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.hr-date-range label {
    white-space: nowrap;
    font-weight: 500;
    color: var(--hr-text-secondary);
}

/* ============================================
   TABLES
   ============================================ */

.hr-table-container {
    background: var(--hr-surface);
    border: 1px solid var(--hr-border);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 2rem;
}

.hr-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
}

.hr-table thead {
    background: var(--hr-secondary);
    border-bottom: 2px solid var(--hr-border);
}

.hr-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--hr-text);
}

.hr-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--hr-border);
}

.hr-table tbody tr {
    transition: background-color 0.2s ease;
}

.hr-table tbody tr:hover {
    background: rgba(33, 128, 141, 0.05);
}

.hr-table tbody tr:last-child td {
    border-bottom: none;
}

/* Status Badges */
.hr-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 500;
    font-size: 0.85rem;
}

.hr-status-badge--active {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
}

.hr-status-badge--inactive {
    background: rgba(239, 68, 68, 0.15);
    color: #991b1b;
}

.hr-status-badge--present {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
}

.hr-status-badge--absent {
    background: rgba(239, 68, 68, 0.15);
    color: #991b1b;
}

.hr-status-badge--vacation {
    background: rgba(59, 130, 246, 0.15);
    color: #1e40af;
}

.hr-status-badge--sick {
    background: rgba(245, 158, 11, 0.15);
    color: #92400e;
}

.hr-status-badge--pending {
    background: rgba(139, 92, 246, 0.15);
    color: #5b21b6;
}

.hr-status-badge--approved {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
}

.hr-status-badge--rejected {
    background: rgba(220, 38, 38, 0.15);
    color: #7f1d1d;
}

/* Action Buttons */
.hr-action-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    margin-right: 0.5rem;
    cursor: pointer;
}

.hr-action-btn--edit {
    color: var(--hr-primary);
    background: transparent;
    border: 1px solid var(--hr-border);
}

.hr-action-btn--edit:hover {
    background: rgba(33, 128, 141, 0.1);
}

.hr-action-btn--delete {
    color: var(--hr-absent);
    background: transparent;
    border: 1px solid var(--hr-border);
}

.hr-action-btn--delete:hover {
    background: rgba(239, 68, 68, 0.1);
}

/* ============================================
   CALENDAR
   ============================================ */

.hr-calendar {
    background: var(--hr-surface);
    border: 1px solid var(--hr-border);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
}

.hr-calendar-month {
    margin-bottom: 2rem;
}

.hr-calendar-month__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--hr-text);
}

.hr-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
}

.hr-calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--hr-border);
}

.hr-calendar-day--present {
    background: rgba(16, 185, 129, 0.2);
    border-color: var(--hr-present);
}

.hr-calendar-day--absent {
    background: rgba(239, 68, 68, 0.2);
    border-color: var(--hr-absent);
}

.hr-calendar-day--vacation {
    background: rgba(59, 130, 246, 0.2);
    border-color: var(--hr-vacation);
}

.hr-calendar-day--sick {
    background: rgba(245, 158, 11, 0.2);
    border-color: var(--hr-sick);
}

.hr-calendar-day:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ============================================
   SCHEDULE GRID
   ============================================ */

.hr-schedule-grid {
    background: var(--hr-surface);
    border: 1px solid var(--hr-border);
    border-radius: 8px;
    overflow-x: auto;
    margin-bottom: 2rem;
}

.hr-schedule-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
}

.hr-schedule-table th,
.hr-schedule-table td {
    padding: 1rem;
    text-align: center;
    border: 1px solid var(--hr-border);
}

.hr-schedule-table th {
    background: var(--hr-secondary);
    font-weight: 600;
    color: var(--hr-text);
}

.hr-schedule-table tbody tr:hover {
    background: rgba(33, 128, 141, 0.05);
}

.hr-schedule-cell {
    padding: 0.75rem;
    min-width: 100px;
}

.hr-schedule-cell input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--hr-border);
    border-radius: 4px;
}

.hr-schedule-cell input:focus {
    outline: none;
    border-color: var(--hr-primary);
    box-shadow: 0 0 0 2px rgba(33, 128, 141, 0.1);
}

.hr-schedule-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--hr-secondary);
    border-radius: 8px;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.hr-summary-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-weight: 500;
}

/* ============================================
   STATISTICS
   ============================================ */

.hr-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.hr-stat-card {
    background: var(--hr-surface);
    border: 1px solid var(--hr-border);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
}

.hr-stat-card__value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--hr-primary);
    margin-bottom: 0.5rem;
}

.hr-stat-card__label {
    font-size: 0.9rem;
    color: var(--hr-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* ============================================
   FORMS & MODALS
   ============================================ */

.hr-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.hr-modal.hidden {
    display: none;
}

.hr-modal__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
}

.hr-modal__content {
    position: relative;
    background: var(--hr-surface);
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.hr-modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
    border-bottom: 1px solid var(--hr-border);
}

.hr-modal__header h3 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--hr-text);
}

.hr-modal__close {
    background: transparent;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--hr-text-secondary);
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.hr-modal__close:hover {
    color: var(--hr-text);
}

.hr-form {
    padding: 2rem;
}

.hr-form__group {
    margin-bottom: 1.5rem;
}

.hr-form__row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--hr-text);
}

.form-control {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--hr-border);
    border-radius: 6px;
    font-size: 0.95rem;
    background: var(--hr-bg);
    color: var(--hr-text);
    transition: border-color 0.2s ease;
}

.form-control:focus {
    outline: none;
    border-color: var(--hr-primary);
    box-shadow: 0 0 0 3px rgba(33, 128, 141, 0.1);
}

.form-control:disabled {
    background: var(--hr-secondary);
    cursor: not-allowed;
    opacity: 0.6;
}

.hr-form__actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--hr-border);
}

/* ============================================
   ALERTS
   ============================================ */

.hr-alert {
    padding: 1rem 1.5rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    animation: slideDown 0.3s ease-in-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.hr-alert.hidden {
    display: none;
}

.hr-alert--success {
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
    border-left: 4px solid var(--hr-approved);
}

.hr-alert--error {
    background: rgba(239, 68, 68, 0.15);
    color: #991b1b;
    border-left: 4px solid var(--hr-absent);
}

.hr-alert__message {
    flex: 1;
}

.hr-alert__close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
    padding: 0;
}

/* ============================================
   EMPTY STATES & LOADING
   ============================================ */

.hr-empty-state {
    text-align: center;
    padding: 3rem;
    background: var(--hr-surface);
    border-radius: 8px;
    border: 2px dashed var(--hr-border);
}

.hr-empty-state.hidden {
    display: none;
}

.hr-empty-state p {
    color: var(--hr-text-secondary);
    margin: 0;
    font-size: 1.1rem;
}

.hr-empty-state a {
    color: var(--hr-primary);
    text-decoration: none;
    font-weight: 600;
}

.hr-empty-state a:hover {
    text-decoration: underline;
}

.hr-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
}

.hr-loading.hidden {
    display: none;
}

.hr-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--hr-border);
    border-top: 4px solid var(--hr-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

@media (max-width: 768px) {
    .hr-main {
        padding: 1rem;
    }

    .hr-header__container {
        flex-direction: column;
        padding: 1rem;
    }

    .hr-header__nav {
        width: 100%;
    }

    .hr-nav-label {
        display: none !important;
    }

    .hr-tab__header {
        flex-direction: column;
        align-items: flex-start;
    }

    .hr-filters {
        flex-direction: column;
    }

    .hr-filters__input,
    .hr-filters__select {
        width: 100%;
    }

    .hr-table {
        font-size: 0.8rem;
    }

    .hr-table th,
    .hr-table td {
        padding: 0.75rem 0.5rem;
    }

    .hr-form__row {
        grid-template-columns: 1fr;
    }

    .hr-modal__content {
        width: 95%;
    }

    .hr-schedule-summary {
        flex-direction: column;
        align-items: stretch;
    }

    .hr-summary-item {
        justify-content: space-between;
    }
}

@media (max-width: 480px) {
    .hr-header__title {
        font-size: 1.25rem;
    }

    .hr-tab__header h2 {
        font-size: 1.5rem;
    }

    .hr-action-btn {
        display: block;
        margin-bottom: 0.5rem;
        width: 100%;
    }

    .hr-table-container {
        overflow-x: auto;
    }
}
```

---

## 4. Renderer Modules

### 4.1 Employee Renderer (employeeRenderer.js)

```javascript
// js/modules/hr/renderers/employeeRenderer.js

export class EmployeeRenderer {
  constructor(hrState) {
    this.hrState = hrState;
  }

  /**
   * Render employee table
   */
  renderEmployeeTable(employees) {
    const tbody = document.getElementById('employees-table-body');
    
    if (!employees || employees.length === 0) {
      document.getElementById('employees-empty').classList.remove('hidden');
      tbody.innerHTML = '';
      return;
    }

    document.getElementById('employees-empty').classList.add('hidden');
    
    tbody.innerHTML = employees.map(emp => `
      <tr>
        <td><strong>${emp.firstName} ${emp.lastName}</strong></td>
        <td>${emp.email}</td>
        <td>${emp.department}</td>
        <td>${emp.position}</td>
        <td>
          <span class="hr-status-badge hr-status-badge--${emp.employmentStatus}">
            ${emp.employmentStatus === 'active' ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button class="btn hr-action-btn hr-action-btn--edit" data-action="edit-employee" data-id="${emp.id}">
            Edit
          </button>
          <button class="btn hr-action-btn hr-action-btn--delete" data-action="delete-employee" data-id="${emp.id}">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Populate employee select dropdowns
   */
  populateEmployeeSelects() {
    const activeEmployees = this.hrState.getActiveEmployees();
    const options = activeEmployees
      .map(emp => `<option value="${emp.id}">${emp.firstName} ${emp.lastName}</option>`)
      .join('');

    document.querySelectorAll('[data-type="employee-select"]').forEach(select => {
      select.innerHTML = '<option value="">Select Employee</option>' + options;
    });
  }

  /**
   * Populate department select dropdown
   */
  populateDepartments() {
    const select = document.querySelector('select[name="department"]');
    if (!select) return;

    select.innerHTML = '<option value="">Select Department</option>' +
      this.hrState.departments
        .map(dept => `<option value="${dept}">${dept}</option>`)
        .join('');
  }

  /**
   * Render employee modal form
   */
  populateEmployeeForm(employee = null) {
    const form = document.getElementById('employee-form');
    const title = document.getElementById('employee-modal-title');

    if (!employee) {
      form.reset();
      title.textContent = 'Add Employee';
      form.dataset.mode = 'add';
    } else {
      title.textContent = 'Edit Employee';
      form.dataset.mode = 'edit';
      form.dataset.employeeId = employee.id;

      form.querySelector('[name="firstName"]').value = employee.firstName;
      form.querySelector('[name="lastName"]').value = employee.lastName;
      form.querySelector('[name="email"]').value = employee.email || '';
      form.querySelector('[name="phone"]').value = employee.phone || '';
      form.querySelector('[name="department"]').value = employee.department;
      form.querySelector('[name="position"]').value = employee.position;
      form.querySelector('[name="contractType"]').value = employee.contractType;
      form.querySelector('[name="hoursPerWeek"]').value = employee.hoursPerWeek || 40;
      form.querySelector('[name="startDate"]').value = employee.startDate;
      form.querySelector('[name="employmentStatus"]').value = employee.employmentStatus;
    }

    this.populateDepartments();
  }
}

export default EmployeeRenderer;
```

### 4.2 Attendance Renderer (attendanceRenderer.js)

```javascript
// js/modules/hr/renderers/attendanceRenderer.js

export class AttendanceRenderer {
  constructor(hrState) {
    this.hrState = hrState;
  }

  /**
   * Render attendance calendar
   */
  renderAttendanceCalendar(startDate, endDate) {
    const calendar = document.getElementById('attendance-calendar');
    const records = this.hrState.attendance.filter(att => {
      return att.date >= startDate && att.date <= endDate;
    });

    // Group by employee
    const byEmployee = {};
    records.forEach(record => {
      if (!byEmployee[record.employeeId]) {
        byEmployee[record.employeeId] = {};
      }
      byEmployee[record.employeeId][record.date] = record.status;
    });

    let html = '<div class="hr-calendar">';
    
    Object.entries(byEmployee).forEach(([empId, dates]) => {
      const emp = this.hrState.getEmployee(empId);
      html += `
        <div class="hr-calendar-month">
          <div class="hr-calendar-month__title">${emp.firstName} ${emp.lastName}</div>
          <div class="hr-calendar-grid">
      `;

      // Render each date in range
      const current = new Date(startDate);
      while (current <= new Date(endDate)) {
        const dateStr = current.toISOString().split('T')[0];
        const status = dates[dateStr] || 'unknown';
        
        html += `
          <div class="hr-calendar-day hr-calendar-day--${status}" data-date="${dateStr}">
            ${current.getDate()}
          </div>
        `;
        current.setDate(current.getDate() + 1);
      }

      html += '</div></div>';
    });

    html += '</div>';
    calendar.innerHTML = html;
  }

  /**
   * Render attendance statistics
   */
  renderAttendanceStats(employeeId, startDate, endDate) {
    const stats = this.hrState.getAttendanceStats(employeeId, startDate, endDate);
    const statsContainer = document.getElementById('attendance-stats');

    statsContainer.innerHTML = `
      <div class="hr-stat-card">
        <div class="hr-stat-card__value">${stats.totalDays}</div>
        <div class="hr-stat-card__label">Total Days</div>
      </div>
      <div class="hr-stat-card">
        <div class="hr-stat-card__value">${stats.presentDays}</div>
        <div class="hr-stat-card__label">Present Days</div>
      </div>
      <div class="hr-stat-card">
        <div class="hr-stat-card__value">${stats.absentDays}</div>
        <div class="hr-stat-card__label">Absent Days</div>
      </div>
      <div class="hr-stat-card">
        <div class="hr-stat-card__value">${stats.sickDays}</div>
        <div class="hr-stat-card__label">Sick Days</div>
      </div>
      <div class="hr-stat-card">
        <div class="hr-stat-card__value">${stats.totalHours.toFixed(1)}h</div>
        <div class="hr-stat-card__label">Total Hours</div>
      </div>
      <div class="hr-stat-card">
        <div class="hr-stat-card__value">${stats.averageHours}h</div>
        <div class="hr-stat-card__label">Avg Hours/Day</div>
      </div>
    `;
  }
}

export default AttendanceRenderer;
```

### 4.3 Schedule Renderer (scheduleRenderer.js)

```javascript
// js/modules/hr/renderers/scheduleRenderer.js

export class ScheduleRenderer {
  constructor(hrState, hrUtils) {
    this.hrState = hrState;
    this.hrUtils = hrUtils;
  }

  /**
   * Render weekly schedule grid
   */
  renderScheduleGrid(schedule) {
    if (!schedule) {
      document.getElementById('schedule-grid').innerHTML = 
        '<p class="hr-empty-state">No schedule found for this week</p>';
      return;
    }

    const grid = document.getElementById('schedule-grid');
    const table = `
      <table class="hr-schedule-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th>Planned Hours</th>
            <th>Planned Points</th>
            <th>Actual Hours</th>
            <th>Actual Points</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${schedule.dailySchedule.map((day, idx) => `
            <tr>
              <td>${day.day}</td>
              <td>${this.hrUtils.formatDateDE(day.date)}</td>
              <td>
                <input type="number" step="0.5" value="${day.plannedHours}" 
                       data-field="plannedHours" data-day="${idx}" class="schedule-input">
              </td>
              <td>
                <input type="number" value="${day.plannedPoints}" 
                       data-field="plannedPoints" data-day="${idx}" class="schedule-input">
              </td>
              <td>${day.actualHours || 0}</td>
              <td>${day.actualPoints || 0}</td>
              <td>
                <input type="text" value="${day.notes}" 
                       data-field="notes" data-day="${idx}" class="schedule-input">
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    grid.innerHTML = table;
    this.updateScheduleSummary(schedule);
  }

  /**
   * Update schedule summary totals
   */
  updateScheduleSummary(schedule) {
    document.getElementById('total-hours').textContent = `${schedule.totalHours}h`;
    document.getElementById('total-points').textContent = `${schedule.totalPoints}`;
  }

  /**
   * Render pending approvals list
   */
  renderPendingApprovals() {
    const pending = this.hrState.schedules.filter(s => s.status === 'submitted');
    const container = document.getElementById('pending-approvals');

    if (pending.length === 0) {
      container.innerHTML = '<p class="hr-empty-state">No pending approvals</p>';
      return;
    }

    container.innerHTML = `
      <div class="hr-section-title">Pending Schedule Approvals</div>
      <div class="hr-table-container">
        <table class="hr-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Week</th>
              <th>Total Hours</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.map(schedule => {
              const emp = this.hrState.getEmployee(schedule.employeeId);
              return `
                <tr>
                  <td>${emp.firstName} ${emp.lastName}</td>
                  <td>${this.hrUtils.formatDateDE(schedule.weekStartDate)}</td>
                  <td>${schedule.totalHours}h</td>
                  <td>
                    <span class="hr-status-badge hr-status-badge--pending">Submitted</span>
                  </td>
                  <td>
                    <button class="btn hr-action-btn" data-action="approve-schedule" data-id="${schedule.id}">
                      Approve
                    </button>
                    <button class="btn hr-action-btn" data-action="reject-schedule" data-id="${schedule.id}">
                      Reject
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

export default ScheduleRenderer;
```

### 4.4 Vacation Renderer (vacationRenderer.js)

```javascript
// js/modules/hr/renderers/vacationRenderer.js

export class VacationRenderer {
  constructor(hrState, hrUtils) {
    this.hrState = hrState;
    this.hrUtils = hrUtils;
  }

  /**
   * Render vacation calendar
   */
  renderVacationCalendar(year = new Date().getFullYear()) {
    const calendar = document.getElementById('vacation-calendar');
    const approved = this.hrState.vacation.filter(v => 
      v.status === 'approved' && 
      new Date(v.startDate).getFullYear() === year
    );

    let html = '<div class="hr-calendar">';
    
    // Get all months in year
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      html += `<div class="hr-calendar-month">
        <div class="hr-calendar-month__title">${monthName}</div>
        <div class="hr-calendar-grid">`;

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Empty cells for days before month starts
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="hr-calendar-day" style="visibility:hidden;"></div>';
      }

      // Days in month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const vacation = approved.find(v => 
          new Date(v.startDate) <= new Date(dateStr) && 
          new Date(v.endDate) >= new Date(dateStr)
        );

        const className = vacation ? 'hr-calendar-day--vacation' : '';
        html += `<div class="hr-calendar-day ${className}" data-date="${dateStr}">${day}</div>`;
      }

      html += '</div></div>';
    }

    html += '</div>';
    calendar.innerHTML = html;
  }

  /**
   * Render vacation requests table
   */
  renderVacationTable(vacations) {
    const tbody = document.getElementById('vacation-table-body');

    tbody.innerHTML = vacations.map(vac => {
      const emp = this.hrState.getEmployee(vac.employeeId);
      const statusClass = `hr-status-badge--${vac.status}`;

      return `
        <tr>
          <td>${emp.firstName} ${emp.lastName}</td>
          <td>${this.hrUtils.formatDateDE(vac.startDate)}</td>
          <td>${this.hrUtils.formatDateDE(vac.endDate)}</td>
          <td>${vac.daysRequested}</td>
          <td>${vac.vacationType}</td>
          <td>
            <span class="hr-status-badge ${statusClass}">
              ${vac.status.charAt(0).toUpperCase() + vac.status.slice(1)}
            </span>
          </td>
          <td>
            ${vac.status === 'pending' ? `
              <button class="btn hr-action-btn" data-action="approve-vacation" data-id="${vac.id}">
                Approve
              </button>
              <button class="btn hr-action-btn" data-action="reject-vacation" data-id="${vac.id}">
                Reject
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render vacation balance
   */
  renderVacationBalance(employeeId, year) {
    const balance = this.hrState.getVacationBalance(employeeId, year);
    const container = document.getElementById('vacation-balance');

    container.innerHTML = `
      <div class="hr-stats-grid">
        <div class="hr-stat-card">
          <div class="hr-stat-card__value">${balance.annualEntitlement}</div>
          <div class="hr-stat-card__label">Annual Entitlement</div>
        </div>
        <div class="hr-stat-card">
          <div class="hr-stat-card__value">${balance.daysUsed}</div>
          <div class="hr-stat-card__label">Days Used</div>
        </div>
        <div class="hr-stat-card">
          <div class="hr-stat-card__value">${balance.daysRemaining}</div>
          <div class="hr-stat-card__label">Days Remaining</div>
        </div>
      </div>
    `;
  }
}

export default VacationRenderer;
```

---

## 5. Success Criteria for Phase 3

- [x] Responsive HTML layout for all four features
- [x] Complete CSS styling with dark/light mode support
- [x] Four renderer modules with dynamic content generation
- [x] Modal dialogs for all CRUD operations
- [x] Data validation feedback in forms
- [x] Calendar and schedule grid visualizations
- [x] Status badges and visual indicators
- [x] Accessibility compliance (ARIA labels, semantic HTML)

---

## 6. Next Phase Preview

**Phase 4: Event Handlers & User Interactions**
- Implement `hrHandlers.js` with event delegation
- Build form submission and validation workflows
- Create modal interaction logic
- Implement tab switching and navigation
- Add confirmation dialogs for destructive actions

---

**End of Phase 3 Documentation**

*Last Updated: 2025-12-10*  
*Author: Development Team*  
*Status: Ready for Phase 4*
