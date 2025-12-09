# Abrechnung Application - Implementation Roadmap

## Project Overview

A modular Excel automation web application that reads inspection protocol data from `protokoll.xlsx`, calculates aggregated quantities by position number, and auto-generates billing documents (`abrechnung.xlsx`).

**Core Technology Stack:**
- SheetJS (xlsx) for Excel I/O
- Vanilla JavaScript (ES6 Modules)
- localStorage for persistent state
- No build step required
- XAMPP for local development

---

## Phase 1: Project Setup & Core Infrastructure (Weeks 1-2)

### 1.1 Development Environment
- [ ] Set up XAMPP Portable instance
- [ ] Create project directory structure:
  ```
  abrechnung-app/
  ├── index.html          (UI)
  ├── css/
  │   └── styles.css      (styling)
  ├── js/
  │   ├── state.js        (state management)
  │   ├── handlers.js     (event handlers)
  │   ├── utils.js        (utility functions)
  │   └── main.js         (initialization)
  ├── templates/
  │   ├── protokoll.xlsx  (reference template)
  │   └── abrechnung.xlsx (export template)
  └── README.md
  ```
- [ ] Initialize Git repository
- [ ] Create .gitignore (exclude node_modules, .DS_Store, logs/)

### 1.2 Import External Libraries
- [ ] Download SheetJS (https://sheetjs.com/):
  - [ ] Add `xlsx.min.js` or `xlsx.full.min.js` to project
  - [ ] Test library is accessible in browser console
- [ ] Verify all modules load correctly

### 1.3 Basic UI Structure
- [ ] Create `index.html` with three main sections:
  - [ ] Import Panel (file upload, status)
  - [ ] Generate Panel (button, preview)
  - [ ] Export Panel (button, status)
- [ ] Add basic styling (`styles.css`)
- [ ] Add console logging to verify module loading

**Deliverable:** 
- Working development environment
- Basic HTML skeleton
- All modules load without errors

---

## Phase 2: State Management & Data Layer (Weeks 2-3)

### 2.1 State Module (`state.js`)
- [ ] Define state object structure:
  ```javascript
  const appState = {
    protokollData: {
      metadata: { /* ... */ },
      positionen: [ /* ... */ ]
    },
    abrechnungData: {
      header: { /* ... */ },
      positionen: { /* ... */ }
    }
  }
  ```
- [ ] Implement `getState()` function
- [ ] Implement `setState(updates)` function with merge logic
- [ ] Create state change event system:
  - [ ] `addEventListener('stateChanged', callback)`
  - [ ] `removeEventListener('stateChanged', callback)`
  - [ ] Dispatch `stateChanged` events when state updates

### 2.2 localStorage Integration
- [ ] Implement `saveState()` - persists entire state to localStorage
- [ ] Implement `loadState()` - restores state from localStorage on app load
- [ ] Handle localStorage errors (quota exceeded, corrupted data)
- [ ] Create `clearState()` for testing/reset

### 2.3 State Validation
- [ ] Create validation schema for protokollData
- [ ] Create validation schema for abrechnungData
- [ ] Implement error handling for invalid state mutations
- [ ] Add validation before save/export operations

**Deliverable:**
- Centralized state management
- Persistent storage working
- No direct DOM manipulation from state module

---

## Phase 3: Utility Functions (Weeks 3-4)

### 3.1 Excel Reading Utilities (`utils.js`)

#### `readExcelFile(file: File)`
- [ ] Use SheetJS to read uploaded Excel file
- [ ] Return raw workbook object
- [ ] Handle file read errors (corrupted, unsupported format)
- [ ] Validate file is actually Excel (.xlsx)

#### `parseProtokoll(workbook)`
- [ ] Open worksheet `Vorlage`
- [ ] Extract metadata from header rows:
  - [ ] Protocol-Nr. (Cell U3)
  - [ ] Auftrag-Nr. (Cell N5)
  - [ ] Anlage (Cell A10)
  - [ ] Einsatzort (Cell T10)
  - [ ] Firma (Cell T7)
  - [ ] Datum (extracted from file or hardcoded cells)
- [ ] Validate extracted metadata (non-empty, correct types)
- [ ] Return metadata object

#### `extractPositions(workbook)`
- [ ] Open worksheet `Vorlage`
- [ ] Scan rows 30-325 for data:
  - [ ] Read Pos.Nr. from Column A
  - [ ] Read Menge (quantity) from Column B or dynamic column
  - [ ] Skip empty rows
- [ ] Return array of { posNr, menge } objects
- [ ] Filter out invalid entries (empty posNr, non-numeric menge)

#### `sumByPosition(positionen: Array)`
- [ ] Group positionen by posNr
- [ ] Sum quantities for each unique posNr
- [ ] Handle duplicate entries (same posNr appearing multiple times)
- [ ] Return object: `{ "01.01.0010": 5, "01.01.0020": 3, ... }`
- [ ] Test with various input scenarios

### 3.2 Excel Writing Utilities

#### `loadAbrechnungTemplate()`
- [ ] Read the abrechnungTemplate.xlsx file
- [ ] Return workbook object
- [ ] Cache template in memory to avoid repeated file reads

#### `fillAbrechnungHeader(workbook, metadata)`
- [ ] Open worksheet `EAW`
- [ ] Write to header rows:
  - [ ] B1: Datum
  - [ ] B2: Auftrags-Nr.
  - [ ] B3: Anlage
  - [ ] B4: Einsatzort
- [ ] Preserve formatting and formulas in other cells
- [ ] Validate all cells written successfully

#### `fillAbrechnungPositions(workbook, positionSums)`
- [ ] Open worksheet `EAW`
- [ ] For each entry in positionSums:
  - [ ] Find matching row by Pos.Nr. in Column A
  - [ ] Write quantity to Column B
  - [ ] Verify formulas in Column F recalculate (=B*E)
- [ ] Handle case where position code not found in template
- [ ] Return updated workbook

#### `createExportWorkbook(abrechnungData)`
- [ ] Build clean workbook with all data
- [ ] Preserve all formulas and formatting
- [ ] Validate workbook before export
- [ ] Return workbook ready for download

#### `exportToExcel(workbook, filename)`
- [ ] Use SheetJS `XLSX.writeFile(workbook, filename)`
- [ ] Generate filename: `abrechnung_[auftragsNr]_[timestamp].xlsx`
- [ ] Trigger browser download
- [ ] Show success/error message

### 3.3 Utility Testing
- [ ] Unit tests for each function (or manual testing with console)
- [ ] Test with sample data from provided Excel files
- [ ] Verify all edge cases handled

**Deliverable:**
- All core Excel operations working
- Position summation logic verified
- Export functionality tested

---

## Phase 4: Event Handlers & UI Logic (Weeks 4-5)

### 4.1 Import Handler (`handlers.js`)

#### `handleImportFile(event)`
- [ ] Get file from file input element
- [ ] Validate file exists and is Excel
- [ ] Call `readExcelFile(file)`
- [ ] Call `parseProtokoll(workbook)` → metadata
- [ ] Call `extractPositions(workbook)` → positionen
- [ ] Update state with protokollData
- [ ] Update UI to show import success
- [ ] Handle and display errors to user
- [ ] Save state to localStorage

#### `handleGenerateAbrechnung()`
- [ ] Check if protokollData exists in state
- [ ] Load abrechnungTemplate
- [ ] Call `fillAbrechnungHeader()` with metadata
- [ ] Call `sumByPosition()` on protokoll positionen
- [ ] Call `fillAbrechnungPositions()` with sums
- [ ] Update state with abrechnungData
- [ ] Display preview of generated data
- [ ] Show success message
- [ ] Save state to localStorage

#### `handleExportAbrechnung()`
- [ ] Check if abrechnungData exists in state
- [ ] Call `createExportWorkbook(abrechnungData)`
- [ ] Call `exportToExcel()` with filename
- [ ] Show download success message
- [ ] Log export timestamp to console

### 4.2 UI Update Handlers

#### `updateImportUI(state)`
- [ ] Show/hide import section based on state
- [ ] Display imported file information
- [ ] Show import status (success, error, pending)
- [ ] Enable/disable generate button

#### `updateGenerateUI(state)`
- [ ] Display preview of extracted metadata
- [ ] Show position count summary
- [ ] Display any warnings/errors
- [ ] Enable/disable export button

#### `updateExportUI(state)`
- [ ] Show export button state
- [ ] Display last export timestamp
- [ ] Show export status message

### 4.3 Event Binding

#### `initializeEventListeners()`
- [ ] Bind file input `change` event → `handleImportFile`
- [ ] Bind "Generate" button `click` event → `handleGenerateAbrechnung`
- [ ] Bind "Export" button `click` event → `handleExportAbrechnung`
- [ ] Listen to `stateChanged` events → update all UI sections
- [ ] Bind "Reset" button (if applicable) → clear state

**Deliverable:**
- Full event-driven architecture
- All user interactions working
- UI updates reactive to state changes

---

## Phase 5: Integration & Full Application (Weeks 5-6)

### 5.1 Main Module (`main.js`)

#### Application Bootstrap
- [ ] Initialize state from localStorage on page load
- [ ] Initialize all event listeners
- [ ] Load abrechnungTemplate into memory
- [ ] Render initial UI based on loaded state
- [ ] Handle initialization errors

#### Cleanup
- [ ] Implement cleanup function (for testing/resets)
- [ ] Clear event listeners on app destroy

### 5.2 Complete HTML (`index.html`)

#### Structure
- [ ] Header with app title and description
- [ ] Import Section:
  - [ ] File input (accept .xlsx only)
  - [ ] Import button
  - [ ] Status display
  - [ ] Imported data summary
- [ ] Generate Section:
  - [ ] Generate button
  - [ ] Status display
  - [ ] Preview of extracted data (table format)
- [ ] Export Section:
  - [ ] Export button
  - [ ] Last export info
  - [ ] Status display
- [ ] Reset Button (for testing)
- [ ] Script tags for all modules in correct order
- [ ] Error message container

#### Accessibility
- [ ] Semantic HTML (header, main, section, button)
- [ ] Proper form labels
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation support
- [ ] Color contrast sufficient

### 5.3 CSS Styling (`styles.css`)

#### Design
- [ ] Clean, professional layout
- [ ] Responsive design (works on mobile/tablet)
- [ ] Clear visual hierarchy
- [ ] Status indicators (success, error, pending)
- [ ] Proper spacing and typography
- [ ] Disabled state styling for buttons

#### Components
- [ ] Panels/cards for each section
- [ ] Progress indicators
- [ ] Error/success messages (different colors)
- [ ] File input styling
- [ ] Button states (normal, hover, active, disabled)

### 5.4 Integration Testing
- [ ] Test complete workflow end-to-end:
  1. Import sample `protokoll.xlsx`
  2. Generate abrechnung
  3. Export new file
  4. Verify export contains correct data
- [ ] Test error scenarios:
  - [ ] Invalid file format
  - [ ] Missing required fields
  - [ ] Corrupted data
- [ ] Test localStorage persistence:
  - [ ] Close and reopen app
  - [ ] Verify state restored
- [ ] Test with various protokoll data sets

**Deliverable:**
- Complete, functional application
- All features working end-to-end
- Error handling implemented
- Ready for user testing

---

## Phase 6: Testing, Documentation & Optimization (Weeks 6-7)

### 6.1 Comprehensive Testing

#### Unit Tests (Manual or Automated)
- [ ] `readExcelFile()` with valid/invalid files
- [ ] `parseProtokoll()` with missing fields
- [ ] `extractPositions()` with various data patterns
- [ ] `sumByPosition()` with duplicates and edge cases
- [ ] `fillAbrechnungPositions()` with all position codes
- [ ] State mutations and validation

#### Integration Tests
- [ ] Complete import → generate → export workflow
- [ ] Multiple imports (overwrite previous)
- [ ] Generate without import (should error)
- [ ] Export without generate (should error)
- [ ] localStorage persistence across sessions

#### User Acceptance Testing
- [ ] Provide test data set to stakeholders
- [ ] Verify output matches expectations
- [ ] Collect feedback on UI/UX
- [ ] Fix any identified issues

### 6.2 Performance Optimization

#### Optimization
- [ ] Profile JavaScript execution (DevTools)
- [ ] Optimize file reading for large protokolls (>1000 rows)
- [ ] Lazy-load abrechnungTemplate only when needed
- [ ] Minify JavaScript and CSS for production
- [ ] Cache template workbook in memory

#### Benchmarking
- [ ] Measure import time for standard file
- [ ] Measure generation time
- [ ] Measure export time
- [ ] Goal: Complete workflow < 5 seconds

### 6.3 Code Documentation

#### Code Comments
- [ ] Comment complex logic in utils.js
- [ ] Document function signatures (parameters, return types)
- [ ] Explain state structure and mutation rules
- [ ] Mark areas that need improvement

#### User Documentation
- [ ] Create user guide with screenshots
- [ ] Document step-by-step workflow
- [ ] List system requirements
- [ ] Provide troubleshooting guide
- [ ] Create README.md for developers

#### Technical Documentation
- [ ] Module overview and dependencies
- [ ] State management flow
- [ ] Event flow diagram
- [ ] API reference for public functions
- [ ] Installation and setup instructions

### 6.4 Browser Compatibility Testing
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Verify Excel file handling works on all browsers

**Deliverable:**
- Tested, documented, optimized application
- User and developer documentation
- Known limitations documented

---

## Phase 7: Deployment & Maintenance (Week 8+)

### 7.1 Deployment

#### XAMPP Setup
- [ ] Configure XAMPP for production use
- [ ] Set up SSL/HTTPS (if needed)
- [ ] Test application in production environment
- [ ] Create deployment checklist

#### User Training
- [ ] Conduct training session with end users
- [ ] Create training materials/videos
- [ ] Establish support process

### 7.2 Post-Launch Monitoring

#### Issue Tracking
- [ ] Set up bug reporting system
- [ ] Monitor for errors (browser console)
- [ ] Track user feedback
- [ ] Document issues and resolutions

#### Maintenance Schedule
- [ ] Monthly: Review logs and error reports
- [ ] Quarterly: Update dependencies (SheetJS)
- [ ] As-needed: Bug fixes and improvements

### 7.3 Future Enhancements (Backlog)

#### Potential Features
- [ ] Support multiple protokoll files in one abrechnung
- [ ] Template selection (different abrechnung templates)
- [ ] Customizable header fields
- [ ] Data validation before import
- [ ] Batch export functionality
- [ ] Email integration for automatic sending
- [ ] Web-based deployment (move away from XAMPP)
- [ ] Database backend (if scaling needed)
- [ ] User authentication and multi-user support
- [ ] Audit trail of all imports/exports

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Excel file format changes | High | Low | Document expected format, validate on import |
| Large file performance | Medium | Medium | Optimize parsing, add progress indicator |
| localStorage quota exceeded | Medium | Low | Implement cleanup, add warning |
| Cross-browser compatibility | Medium | Low | Test early, use vanilla JS (no framework) |
| Data corruption in transit | High | Very Low | Validate before save, backup before export |
| User forgets step in workflow | Medium | High | Add validation, show clear error messages |

---

## Success Criteria

- [ ] Application successfully reads `protokoll.xlsx`
- [ ] Correctly sums quantities by Pos.Nr.
- [ ] Generates `abrechnung.xlsx` with all required data
- [ ] User can export billing document without manual editing
- [ ] State persists across browser sessions
- [ ] All errors handled gracefully with user-friendly messages
- [ ] Application loads in < 2 seconds
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Documented and user-tested
- [ ] Zero manual data entry for standard workflow

---

## Timeline Summary

| Phase | Duration | Weeks | Status |
|-------|----------|-------|--------|
| 1. Setup & Infrastructure | 2 weeks | 1-2 | Planned |
| 2. State Management | 2 weeks | 2-3 | Planned |
| 3. Utility Functions | 2 weeks | 3-4 | Planned |
| 4. Event Handlers & UI | 2 weeks | 4-5 | Planned |
| 5. Integration & Full App | 2 weeks | 5-6 | Planned |
| 6. Testing & Optimization | 2 weeks | 6-7 | Planned |
| 7. Deployment & Maintenance | 1+ weeks | 8+ | Planned |
| **Total** | **~8 weeks** | **1-8** | **Planned** |

---

## Team Requirements

### Developers Needed
- **1x Full-Stack Developer** (JavaScript, HTML, CSS, Excel)
  - ES6 JavaScript expertise
  - Excel/SheetJS experience
  - DOM manipulation skills
  - Debugging/testing skills

### Optional Roles
- **1x QA Tester** (if available, weeks 6-7)
- **1x Product Owner** (for requirements clarification)

### Tools
- XAMPP Portable (for local development)
- Code editor (VS Code, Sublime, etc.)
- Browser DevTools
- Git for version control
- SheetJS library

---

## Notes & Best Practices

### Development Guidelines
- Commit code frequently (daily minimum)
- Write self-documenting code (clear naming)
- Test as you build (don't wait for Phase 6)
- Keep functions small and focused (single responsibility)
- Use browser console for debugging

### Excel Template Maintenance
- Keep reference templates in version control
- Document any template format changes
- Test imports after template modifications
- Maintain backward compatibility if possible

### Performance Tips
- Only read Excel file when imported
- Cache template in memory after first load
- Avoid repeated DOM queries (use event delegation)
- Use Promise-based async where applicable
- Profile with browser DevTools regularly

---

## Contact & Support

For questions or blockers during implementation:
1. Review the Beschreibung document for architectural details
2. Check the code comments and inline documentation
3. Test with the provided sample Excel files
4. Use browser DevTools for debugging
5. Refer to SheetJS documentation: https://sheetjs.com/docs/

---

**Roadmap Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Ready for Implementation
