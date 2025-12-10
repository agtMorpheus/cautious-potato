# HR Management Module - Phase 1: Project Setup & Architecture

**Duration:** Weeks 1-2  
**Status:** Planning & Foundation  
**Target:** Establish project structure, database schema, and baseline UI

---

## 1. Overview

The HR Management Module extends the existing Abrechnung application with comprehensive employee resource management capabilities for small German companies. This phase establishes the foundation for all subsequent phases.

### Key Objectives
- Extend project structure to accommodate HR-specific modules
- Define data schema for employees, attendance, schedules, and vacation
- Create baseline UI components
- Establish integration points with existing Abrechnung system

### Target Users
- Small company HR managers in Germany
- Employees tracking their own attendance
- Administrative staff managing schedules

---

## 2. Project Structure Extension

### Directory Organization

```
booking_backend/
├── js/
│   ├── core/                    # Shared modules
│   │   ├── state.js            # Global state (existing)
│   │   ├── utils.js            # Common utilities (existing)
│   │   └── handlers.js         # Event handlers (existing)
│   │
│   └── modules/                 # Feature-specific modules (NEW)
│       ├── abrechnung/         # Existing billing module
│       │   ├── abrechnungState.js
│       │   ├── abrechnungUtils.js
│       │   ├── abrechnungHandlers.js
│       │   └── abrechnungRenderer.js
│       │
│       └── hr/                 # NEW - HR Management Module
│           ├── hrState.js
│           ├── hrUtils.js
│           ├── hrHandlers.js
│           ├── submodules/
│           │   ├── attendance.js      # Manual attendance tracking
│           │   ├── schedules.js       # Weekly hours & points management
│           │   ├── vacation.js        # Vacation calendar planning
│           │   └── employees.js       # Employee roster management
│           └── renderers/
│               ├── attendanceRenderer.js
│               ├── scheduleRenderer.js
│               ├── vacationRenderer.js
│               └── employeeRenderer.js
│
├── css/
│   ├── style.css               # Existing styles
│   └── hr-module.css          # NEW - HR-specific styles
│
├── data/                        # NEW - Data storage
│   ├── employees.json
│   ├── attendance.json
│   ├── schedules.json
│   └── vacation.json
│
└── html/
    ├── index.html              # Main application shell
    └── pages/
        ├── abrechnung.html     # Existing
        └── hr-dashboard.html   # NEW - HR module entry point
```

---

## 3. Data Schema Design

### 3.1 Employee Entity

```json
{
  "employees": [
    {
      "id": "EMP001",
      "firstName": "Max",
      "lastName": "Müller",
      "email": "max.mueller@company.de",
      "department": "Engineering",
      "position": "Senior Developer",
      "contractType": "fulltime",
      "startDate": "2022-01-15",
      "endDate": null,
      "hoursPerWeek": 40,
      "employmentStatus": "active",
      "personalNumber": "12345",
      "socialSecurityNumber": "12345678901234",
      "bankAccount": {
        "iban": "DE89370400440532013000",
        "bic": "COBADEFFXXX"
      },
      "address": {
        "street": "Hauptstrasse 123",
        "zipCode": "10115",
        "city": "Berlin",
        "country": "Germany"
      },
      "tax": {
        "taxClass": "I",
        "churchTax": false,
        "taxId": "12345678900"
      },
      "socialInsurance": {
        "healthInsurance": "AOK",
        "pensionFund": "Deutsche Rentenversicherung",
        "accidentInsurance": "DGUV"
      },
      "emergencyContact": {
        "name": "Lisa Müller",
        "phone": "+49 30 123456789",
        "relationship": "Spouse"
      },
      "notes": "Senior team member, responsible for quality assurance",
      "createdAt": "2022-01-15T10:30:00Z",
      "updatedAt": "2025-12-10T04:55:00Z"
    }
  ]
}
```

### 3.2 Attendance Record Entity

```json
{
  "attendance": [
    {
      "id": "ATT001",
      "employeeId": "EMP001",
      "date": "2025-12-10",
      "dayOfWeek": "Wednesday",
      "entryTime": "09:00",
      "exitTime": "17:30",
      "breakMinutes": 30,
      "hoursWorked": 8,
      "status": "present",
      "type": "regular",
      "notes": "Regular working day",
      "manuallyRecorded": true,
      "recordedBy": "EMP001",
      "recordedAt": "2025-12-10T17:45:00Z",
      "lastModified": "2025-12-10T17:45:00Z"
    }
  ]
}
```

**Status Options:** `present`, `absent`, `sick_leave`, `vacation`, `unpaid_leave`, `public_holiday`, `home_office`

### 3.3 Weekly Schedule Entity

```json
{
  "schedules": [
    {
      "id": "SCHED001",
      "employeeId": "EMP001",
      "weekStartDate": "2025-12-08",
      "weekNumber": 50,
      "year": 2025,
      "totalHours": 40,
      "totalPoints": 320,
      "dailySchedule": [
        {
          "day": "Monday",
          "date": "2025-12-08",
          "plannedHours": 8,
          "plannedPoints": 64,
          "actualHours": 8.25,
          "actualPoints": 66,
          "notes": "Overtime 15 minutes"
        },
        {
          "day": "Tuesday",
          "date": "2025-12-09",
          "plannedHours": 8,
          "plannedPoints": 64,
          "actualHours": 8,
          "actualPoints": 64,
          "notes": ""
        }
      ],
      "status": "submitted",
      "submittedAt": "2025-12-10T09:00:00Z",
      "approvedBy": "HR_ADMIN",
      "approvedAt": "2025-12-10T10:30:00Z"
    }
  ]
}
```

**Status Options:** `draft`, `submitted`, `approved`, `rejected`

### 3.4 Vacation Request Entity

```json
{
  "vacation": [
    {
      "id": "VAC001",
      "employeeId": "EMP001",
      "startDate": "2025-12-22",
      "endDate": "2025-12-31",
      "daysRequested": 8,
      "vacationType": "annual",
      "status": "approved",
      "reason": "Christmas holidays",
      "replacementContact": "EMP002",
      "requestedAt": "2025-11-01T14:30:00Z",
      "approvedBy": "HR_ADMIN",
      "approvedAt": "2025-11-02T09:00:00Z",
      "notes": "Coverage arranged with colleague"
    }
  ]
}
```

**Vacation Types:** `annual`, `unpaid`, `sick`, `parental`, `sabbatical`, `special`

---

## 4. Core State Management (hrState.js)

### Initial State Structure

```javascript
// js/modules/hr/hrState.js

const hrState = {
  employees: [],
  attendance: [],
  schedules: [],
  vacation: [],
  filters: {
    selectedEmployee: null,
    dateRange: {
      start: null,
      end: null
    },
    department: null,
    status: null
  },
  ui: {
    activeTab: 'employees',
    editingRecordId: null,
    showModal: false,
    modalType: null,
    isLoading: false,
    error: null
  },
  metadata: {
    lastSync: null,
    totalEmployees: 0,
    activeEmployees: 0,
    version: '1.0.0'
  }
};
```

### Key State APIs (to be implemented in Phase 2)

- `addEmployee(employeeData)`
- `updateEmployee(employeeId, updates)`
- `deleteEmployee(employeeId)`
- `recordAttendance(employeeId, attendanceData)`
- `updateSchedule(scheduleId, scheduleData)`
- `createVacationRequest(vacationData)`
- `approveVacationRequest(vacationId)`
- `filterEmployees(criteria)`
- `getEmployeeHistory(employeeId, dateRange)`

---

## 5. UI Components & Layout

### 5.1 Navigation Structure

```
HR Dashboard
├── Employees Management
│   ├── Employee List
│   ├── Add New Employee
│   ├── Employee Details / Profile
│   └── Employee Actions (Edit, Delete, Archive)
│
├── Attendance Management
│   ├── Daily Attendance Log
│   ├── Manual Entry Form
│   ├── Attendance Report by Period
│   └── Absence Analytics
│
├── Schedule Management
│   ├── Weekly Schedule Grid
│   ├── Points Calculator
│   ├── Bulk Schedule Editor
│   └── Schedule History
│
├── Vacation Management
│   ├── Vacation Calendar
│   ├── Request New Vacation
│   ├── Pending Approvals
│   ├── Team Coverage View
│   └── Vacation Balance Tracking
│
└── Reports & Analytics
    ├── Attendance Summary
    ├── Schedule Overview
    ├── Vacation Planning
    └── Payroll Integration Preview
```

### 5.2 Key Pages

#### HR Dashboard (Main Entry)
- Navigation sidebar with module selection
- Quick stats dashboard (total employees, pending approvals, etc.)
- Recent activity feed
- Quick action buttons

#### Employee Management Page
- Data table showing all employees
- Search/filter functionality
- Add/Edit/Delete employee modals
- Bulk operations toolbar

#### Attendance Tracking Page
- Calendar view with color-coded attendance status
- Manual entry form for past attendance
- Daily/weekly/monthly attendance reports
- Absence patterns analysis

#### Schedule Management Page
- Interactive weekly schedule grid (rows=employees, columns=days)
- Points calculation column
- Edit in-place functionality
- Batch approval workflow

#### Vacation Planning Page
- Calendar view showing all vacation periods
- Color-coded by employee
- Vacation request form
- Approval workflow panel
- Team coverage indicators

---

## 6. Design & Styling (hr-module.css)

### Key Design Tokens

```css
/* HR Module Color Palette */
:root {
  /* Status Colors */
  --hr-color-present: #22c55e;      /* Green */
  --hr-color-absent: #ef4444;       /* Red */
  --hr-color-vacation: #3b82f6;     /* Blue */
  --hr-color-sick: #f59e0b;         /* Amber */
  --hr-color-pending: #8b5cf6;      /* Purple */
  --hr-color-approved: #10b981;     /* Emerald */
  --hr-color-rejected: #dc2626;     /* Dark Red */
  
  /* Component Sizing */
  --hr-calendar-cell-height: 60px;
  --hr-table-row-height: 48px;
  
  /* Spacing */
  --hr-gap-small: 8px;
  --hr-gap-medium: 16px;
  --hr-gap-large: 24px;
}
```

### Component Styles
- Employee cards with profile images
- Attendance status badges
- Schedule grid styling
- Vacation calendar highlights
- Modal dialogs with forms
- Data tables with sorting/filtering
- Charts for analytics

---

## 7. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla JavaScript (ES6+) | DOM manipulation, state management |
| **Data** | JSON (localStorage) | Employee & attendance data persistence |
| **Styling** | CSS3 | Responsive design with variables |
| **Excel Integration** | SheetJS | Export to HR reports (future phase) |
| **Server** | XAMPP (Apache) | Local development & testing |
| **Version Control** | Git | Code management |

---

## 8. Integration Points with Existing System

### With Abrechnung Module
- **Payroll Data:** HR module provides employee hours/schedules
- **Export Data:** Schedule data formatted for Abrechnung processing
- **Employee Reference:** Shared employee database

### With Core State System
- Extend global state with `hrState` namespace
- Reuse event-driven architecture from `stateChanged` events
- Leverage localStorage persistence for HR data

### With Existing Handlers
- Create `hrHandlers.js` following same pattern as `abrechnungHandlers.js`
- Reuse validation utilities from `utils.js`
- Maintain consistent error handling

---

## 9. Success Criteria for Phase 1

- [x] Project structure created with all directories
- [x] Data schema designed and documented
- [x] State structure defined
- [x] UI layout planned with wireframes
- [x] CSS framework started
- [x] Integration approach documented
- [x] Team aligned on conventions

### Deliverables

1. **Directory Structure** - Complete folder hierarchy
2. **Schema Documentation** - JSON examples for all entities
3. **State Design** - Core data structure and API outline
4. **UI Wireframes** - Layout sketches for main pages
5. **Style Guide** - Color palette, typography, spacing
6. **Integration Plan** - Connection points with existing system
7. **Git Repository** - Initial commit with structure

---

## 10. Development Checklist

### Setup
- [ ] Create `js/modules/hr/` directory
- [ ] Create `js/modules/hr/submodules/` directory
- [ ] Create `js/modules/hr/renderers/` directory
- [ ] Create `css/hr-module.css`
- [ ] Create `data/` directory for JSON files
- [ ] Create placeholder files with JSDoc headers

### Documentation
- [ ] Write module README.md
- [ ] Document state API
- [ ] Document event conventions
- [ ] Add contributing guidelines

### Version Control
- [ ] Initialize Git repository (if not done)
- [ ] Create `feature/hr-module` branch
- [ ] Make initial commit
- [ ] Create pull request template

---

## 11. Next Phase Preview

**Phase 2: State Management & Data Layer**
- Implement `hrState.js` with full API
- Create persistence layer with localStorage
- Build data validation functions
- Implement event system for HR state changes
- Create data migration tools for schema updates

---

## 12. Resources & References

### German HR Regulations
- **Arbeitszeitgesetz (ArbZG)** - German Working Time Act
  - Max 10 hours/day, 6 days/week
  - 11 hours rest between shifts
  - 30 min break for 6-9 hour day

- **Entgeltfortzahlungsgesetz (EntgFG)** - Wage Continuation Act
  - Full payment during sick leave (first 6 weeks)
  - Employee data protection requirements

- **DSGVO** - General Data Protection Regulation
  - Employee data must be encrypted
  - 30-day data retention after employment ends
  - Right to data export

### Industry Standards
- ISO 27001 - Information Security
- DIN 66001 - Information Processing (German standard)

### Development Tools
- Visual Studio Code with ES6 extensions
- LocalStorage Inspector browser tools
- Git for version control
- XAMPP for local server

---

## 13. Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data privacy compliance | High | Implement encryption, audit trails, compliance checklist |
| Large employee databases | Medium | Pagination, indexed queries, lazy loading |
| Concurrent edits conflicts | Medium | Timestamp-based conflict resolution, user notifications |
| Schedule calculation errors | High | Comprehensive unit tests, manual verification UI |
| Integration complexity | Medium | Clear interfaces, extensive documentation |

---

## 14. Notes & Decisions

- **Decimal Hours:** All time calculations use decimal hours (8.5 = 8h 30m) for easier processing
- **Time Zone:** Germany uses CET/CEST; all timestamps stored as UTC
- **Week Definition:** Week starts Monday (ISO 8601 standard)
- **Data Export:** JSON for internal, XLSX for external reporting
- **No Real-time Sync:** Single-user application, localStorage-based (no server sync)

---

**End of Phase 1 Documentation**

*Last Updated: 2025-12-10*  
*Author: Development Team*  
*Status: Ready for Phase 2*
