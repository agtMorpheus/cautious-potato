# Abrechnung Application - Architecture Overview

## Executive Summary

The Abrechnung Application is a browser-based Excel processing tool built with a **modular ES6 architecture** that follows strict separation of concerns. The application processes protokoll.xlsx files, aggregates position data, and generates abrechnung.xlsx files entirely in the browser without server dependencies.

## Module Structure

The application follows a **reactive, event-driven architecture** with clear separation of concerns:

### Core Modules

#### 1. **state.js** - State Management
Centralized application state with localStorage persistence and event-driven updates.

**Key Functions:**
- `getState()` - Returns defensive copy of application state
- `setState(updates, options)` - Merges updates and triggers listeners
- `resetState(options)` - Resets state to initial values
- `subscribe(listener)` - Registers state change listeners
- `loadStateFromStorage()` - Restores persisted state from localStorage

**State Schema:**
```javascript
{
  protokollData: {
    metadata: {
      protocolNumber: string,      // Cell U3
      orderNumber: string,         // Cell N5
      plant: string,               // Cell A10
      location: string,            // Cell T10
      company: string,             // Cell T7
      date: string                 // ISO date
    },
    positionen: [
      { posNr: string, menge: number, rowIndex: number }
    ]
  },
  
  abrechnungData: {
    header: { /* metadata copy */ },
    positionen: { 
      [posNr]: totalMenge          // Aggregated by position number
    }
  },
  
  ui: {
    import: {
      status: 'idle' | 'pending' | 'success' | 'error',
      message: string,
      fileName: string,
      fileSize: number,
      importedAt: ISO8601 timestamp or null
    },
    generate: {
      status: 'idle' | 'pending' | 'success' | 'error',
      message: string,
      positionCount: number,
      uniquePositionCount: number,
      generationTimeMs: number
    },
    export: {
      status: 'idle' | 'pending' | 'success' | 'error',
      message: string,
      lastExportAt: ISO8601 timestamp or null,
      lastExportSize: number
    }
  },
  
  meta: {
    version: string,
    lastUpdated: timestamp
  }
}
```

**Persistence:** Automatically saves to localStorage (key: `abrechnungAppState_v1`) on state changes.

---

#### 2. **utils.js** - Excel I/O & Data Processing
Pure functions for Excel reading/writing and data transformation operations.

**Key Functions:**
- `readExcelFile(file)` - Reads Excel file and returns workbook object
- `parseProtokoll(workbook)` - Extracts metadata from specified cells
- `extractPositions(sheet, startRow, endRow)` - Extracts position data from rows 30–325
- `validateExtractedPositions(positions)` - Validates position structure and values
- `sumByPosition(positions)` - Aggregates quantities by position number (O(n) performance)
- `getPositionSummary(sums)` - Returns summary statistics
- `loadAbrechnungTemplate()` - Loads and caches abrechnung.xlsx template
- `fillAbrechnungPositions(ws, positionSums)` - Fills template with aggregated positions
- `generateAbrechnungFilename(metadata)` - Creates descriptive filename
- `exportAbrechnungFile(filename, workbook)` - Exports finished workbook to browser

**Error Handling:** Provides detailed error messages with recovery suggestions.

**No Side Effects:** Never modifies DOM or external state; all data transformations are pure functions.

---

#### 3. **handlers.js** - Event Handlers & UI Logic
User interaction processing and orchestration between modules.

**Key Functions:**
- `handleImportFile(event)` - Processes protokoll.xlsx upload
- `handleGenerateAbrechnung()` - Creates aggregated abrechnung from imported data
- `handleExportAbrechnung()` - Exports completed abrechnung.xlsx to user
- `handleResetApplication()` - Clears all data and resets state
- `initializeEventListeners(callbacks)` - Binds DOM events to handlers
- `showErrorAlert(title, message)` - Displays error messages with auto-dismiss
- `clearErrorAlerts()` - Removes all alert elements

**Responsibilities:**
- Updates UI status (pending → success/error) during operations
- Calls utils functions for data processing
- Updates state with results via setState()
- Manages loading states and user feedback
- Handles errors gracefully without state corruption

**No Direct DOM Manipulation:** All rendering delegated to UI update functions.

---

#### 4. **main.js** - Application Bootstrap
Application initialization and module orchestration.

**Key Functions:**
- `initializeApp()` - Runs once on DOM load:
  1. Loads persisted state from localStorage
  2. Initializes static UI elements
  3. Binds event listeners to DOM elements
  4. Subscribes to state changes for reactive updates
  5. Performs initial render based on current state

**Exports:**
- `destroyApp()` - Cleanup hook for testing/hot-reload

**Initialization Flow:**
```
DOM Ready
  ↓
Load State from Storage
  ↓
Initialize UI & Event Listeners
  ↓
Subscribe to State Changes
  ↓
Application Ready
```

---

#### 5. **Phase 4: Enhanced UI Renderers** ✅ Complete
Advanced accessibility and dark mode features.

**Key Functions:**
- `updateImportUI(state)` - Updates import section UI with accessibility features
- `updateGenerateUI(state)` - Updates generate section UI with progress announcements
- `updateExportUI(state)` - Updates export section UI with download feedback
- `initializeStaticUI()` - Sets ARIA attributes and accessibility enhancements

**Features:**
- **Screen Reader Support:** Automatic announcements for status changes
- **Enhanced Dark Mode:** Three-mode system (Light/Dark/Auto) with system preference detection
- **Focus Management:** Enhanced focus indicators and keyboard navigation
- **WCAG 2.1 AA Compliance:** Complete accessibility compliance with comprehensive ARIA support

---

## Data Flow Architecture

### Event-Driven Updates

```
User Action (Click/File Upload)
  ↓
Handler Function (handlers.js)
  ↓
Utils Processing (utils.js)
  ↓
setState() Call (state.js)
  ↓
Notify All Listeners
  ↓
UI Update Functions (renderers)
  ↓
DOM Elements Updated
```

### No Direct Module Coupling

- **state.js** knows nothing about handlers, utils, or UI
- **utils.js** never calls state or handlers (pure functions only)
- **handlers.js** calls state and utils but not UI directly
- **UI renderers** listen to state changes, never modify state directly

### Async Operation Pattern

Handlers manage async operations with clear state transitions:

```javascript
// Set pending status
setState({ ui: { import: { status: 'pending' } } });

try {
  // Perform async operation
  const result = await safeReadAndParseProtokoll(file);
  
  // Update with success
  setState({ 
    ...importedData, 
    ui: { import: { status: 'success', message: 'File imported successfully' } }
  });
} catch (error) {
  // Update with error
  setState({ 
    ui: { import: { status: 'error', message: error.message } }
  });
}
```

---

## File Structure

```
abrechnung-app/
├── index.html                    # Entry point HTML
├── login.html                    # Authentication page
├── js/
│   ├── main.js                   # Application bootstrap
│   ├── state.js                  # State management
│   ├── utils.js                  # Excel utilities
│   ├── handlers.js               # Event handlers & UI logic
│   ├── phase4-accessibility.js   # Enhanced accessibility features
│   ├── phase4-ui-renderers.js    # Enhanced UI renderers
│   ├── performance-monitor.js     # Performance monitoring
│   └── libs/
│       └── xlsx.min.js           # SheetJS library
├── css/
│   ├── variables.css             # Design system tokens
│   ├── styles.css                # Main application styles
│   ├── phase4-accessibility.css  # Accessibility enhancements
│   └── components/               # Component-specific styles
├── templates/
│   └── abrechnung.xlsx           # Excel template for export
├── tests/
│   ├── unit/                     # Unit tests (Jest)
│   │   ├── state.test.js
│   │   ├── utils.test.js
│   │   └── handlers.test.js
│   └── integration/              # Integration tests
│       └── workflow.test.js
├── scripts/
│   ├── validate-phase5.js        # Phase 5 validation
│   └── phase6-accessibility-audit.js  # Accessibility audit tool
├── docs/
│   ├── ARCHITECTURE.md           # This file
│   ├── API.md                    # Module API documentation
│   ├── TROUBLESHOOTING.md        # User troubleshooting guide
│   └── implemented/              # Implementation summaries
├── examples/                     # Demo and test pages
└── package.json                  # Node.js dependencies and scripts
```

---

## Module Dependencies

```
main.js
├── imports: state.js, handlers.js, phase4-ui-renderers.js
├── calls: loadStateFromStorage(), initializeEventListeners()
└── subscribes: subscribe() for reactive UI updates

handlers.js
├── imports: state.js, utils.js
├── calls: getState(), setState(), utils functions
└── updates: UI status via state changes

utils.js
├── imports: (none - pure functions)
├── dependencies: SheetJS (XLSX global)
└── no side effects

state.js
├── imports: (none)
├── manages: localStorage persistence
└── notifies: listeners on changes via publish/subscribe

phase4-ui-renderers.js
├── imports: phase4-accessibility.js
├── called by: main.js subscription
└── updates: DOM elements with accessibility features

phase4-accessibility.js
├── imports: (none)
├── provides: AccessibilityManager, EnhancedDarkModeManager
└── enhances: Screen reader support, focus management, dark mode
```

---

## Error Handling Strategy

### Error Types & Handling

1. **User Errors** (Invalid file, missing data)
   - **Handling:** Show user-friendly error message, preserve state
   - **Example:** "File must be .xlsx format"
   - **Recovery:** User can retry with correct file

2. **System Errors** (File read failures, SheetJS parse errors)
   - **Handling:** Log to console, show generic error, suggest retry
   - **Example:** "Failed to read file: {error}"
   - **Recovery:** Automatic retry mechanism available

3. **Logic Errors** (Null/undefined data, invalid aggregation)
   - **Handling:** Validate at entry points, throw with context
   - **Example:** "Invalid position object in array"
   - **Recovery:** Validation prevents state corruption

### Error Recovery Principles

- Each handler wraps operations in comprehensive try/catch blocks
- Errors update UI status but **never corrupt application state**
- User can retry operations without manual reset
- Complex operations use preliminary validation before state updates
- All errors are logged with sufficient context for debugging

---

## Performance Considerations

### Optimization Points

1. **File I/O Performance**
   - **Challenge:** SheetJS can be slow for large files (>1000 positions)
   - **Solution:** Cache template, minimize re-reads, use appropriate SheetJS options
   - **Monitoring:** Performance timing in handlers with console logs

2. **Position Aggregation**
   - **Challenge:** O(n) complexity but can be slow for 10,000+ positions
   - **Solution:** Use Map for O(1) lookup, avoid nested loops
   - **Implementation:** `sumByPosition()` uses efficient object mapping

3. **DOM Updates**
   - **Challenge:** Frequent state changes can cause reflows
   - **Solution:** Batch DOM updates, use CSS classes instead of inline styles
   - **Pattern:** Single state change triggers all UI updates

4. **localStorage Performance**
   - **Challenge:** Serialization overhead for large state objects
   - **Solution:** Only persist essential data, use structured cloning
   - **Monitoring:** Track localStorage size and operation timing

### Performance Targets (Phase 6)

- **Import workflow:** < 2 seconds for 1000-row file
- **Generate workflow:** < 1 second for aggregation
- **Export workflow:** < 500ms for file creation
- **Memory usage:** No leaks, returns to baseline after operations
- **UI responsiveness:** 60 FPS maintained, no jank

### Profiling Strategy

Use browser DevTools Performance tab:
- Record workflow execution
- Identify long tasks (> 50ms)
- Check for jank (frame rate drops)
- Profile memory usage after multiple workflows

---

## Testing Strategy

### Unit Tests (Jest Framework)

- **State module:** 95%+ coverage - Test state mutations, persistence, listeners
- **Utils module:** 90%+ coverage - Test Excel parsing, aggregation, validation with real/mock files
- **Handlers module:** 80%+ coverage - Test event handling, state updates, error paths
- **Overall target:** 85%+ coverage

### Integration Tests

- **Complete workflows:** Import → Generate → Export with real data
- **Error scenarios:** Invalid files, missing data, edge cases
- **State consistency:** Verify state integrity across operations
- **Performance:** Large dataset handling and memory usage

### Accessibility Testing (Phase 6)

- **Automated:** axe-core integration for WCAG 2.1 AA compliance
- **Manual:** Keyboard navigation, screen reader testing
- **Tools:** Custom accessibility audit script with comprehensive reporting

### Manual Testing Checklist

- **Happy path:** Full import → generate → export workflow
- **Error paths:** Invalid files, missing data, edge cases
- **Persistence:** Reload page, verify state restored correctly
- **Cleanup:** Verify reset clears all data and UI state
- **Performance:** Test with large files (1000+ positions)

---

## Security Considerations

### File Upload Security

- **MIME type validation:** Only accept .xlsx files
- **File size limits:** Prevent memory exhaustion attacks
- **Sandboxed processing:** Browser file input provides natural sandboxing
- **No server upload:** All processing happens client-side

### XSS Prevention

- **HTML escaping:** All user data escaped before DOM insertion
- **textContent usage:** Prefer textContent over innerHTML
- **Trusted methods:** Use safe DOM manipulation methods

### Data Validation

- **Input validation:** All imported data validated before processing
- **Type checking:** Function parameters type-checked
- **Error boundaries:** Invalid data throws errors rather than corrupting state

### Storage Security

- **No sensitive data:** localStorage contains only non-sensitive application state
- **Clear on reset:** All data cleared when user resets application
- **HTTPS recommended:** Use HTTPS in production for encryption in transit

---

## Accessibility Architecture (Phase 4 Complete)

### Enhanced Accessibility Manager

**Screen Reader Support:**
- Dynamic content announcements with priority levels (polite/assertive)
- Comprehensive ARIA attribute management
- Live regions for status updates and progress indicators

**Focus Management:**
- Enhanced focus indicators with high contrast support
- Automatic focus trapping in modals
- Keyboard navigation shortcuts (Alt+M, Alt+N, Escape)

**Form Enhancement:**
- Automatic ARIA attributes for form elements
- Real-time validation announcements
- Error handling with recovery suggestions

### Enhanced Dark Mode System

**Three-Mode Theme System:**
- **Light Mode:** Default high-contrast theme
- **Dark Mode:** Dark theme with proper contrast ratios
- **Auto Mode:** Follows system preference with automatic switching

**Features:**
- Persistent user preferences across sessions
- System integration with `prefers-color-scheme`
- Accessibility announcements for theme changes
- High contrast support for enhanced visibility

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Normal text: 4.5:1 minimum ratio
- Large text (18pt+): 3:1 minimum ratio
- UI components: 3:1 minimum ratio

**Keyboard Navigation:**
- All functionality accessible via keyboard
- Visible focus indicators on all interactive elements
- Logical tab order throughout application

**Screen Reader Support:**
- Comprehensive ARIA attributes (roles, properties, states)
- Live regions for dynamic content announcements
- Proper heading hierarchy and landmark navigation

---

## Future Extensibility

### Adding New Features

1. **New Utility Function:**
   - Add to utils.js with clear JSDoc
   - Export from module
   - Write unit tests
   - Document in API.md

2. **New UI Section:**
   - Add HTML structure with appropriate IDs
   - Create update function in handlers.js
   - Call from main.js subscribe callback
   - Write tests for update function

3. **New State Properties:**
   - Initialize in initial state object
   - Document in ARCHITECTURE.md State Schema
   - Update tests to cover new properties

### Potential Enhancements

- **Batch Processing:** Process multiple protokoll files sequentially
- **Template Selection:** Allow user to choose different abrechnung templates
- **Data Validation:** Add pre-import validation with dry run preview
- **Undo/Redo:** Maintain history of state changes for rollback
- **Export Formats:** Support CSV, JSON in addition to Excel
- **Advanced Filtering:** Filter/search positions before export
- **Multi-Language:** Internationalization support for German/English
- **Offline Mode:** Complete offline functionality with sync capabilities

### Scalability Considerations

- **Module splitting:** Large modules can be split into smaller, focused modules
- **Lazy loading:** Load expensive operations only when needed
- **Worker threads:** Move heavy processing to Web Workers for better performance
- **IndexedDB:** Upgrade from localStorage for larger datasets
- **Component library:** Extract reusable UI components for other applications

---

## Deployment Architecture

### XAMPP Deployment

The application is designed for simple XAMPP deployment:

1. **Static Files:** All files are static (HTML, CSS, JS)
2. **No Server Dependencies:** Runs entirely in browser
3. **Template Access:** Excel template served as static file
4. **Cross-Origin:** No CORS issues as all resources are same-origin

### Production Considerations

- **HTTPS:** Use HTTPS for security (especially with file uploads)
- **Caching:** Implement proper cache headers for static assets
- **Compression:** Enable gzip compression for better performance
- **Monitoring:** Add error tracking and performance monitoring
- **Backup:** Regular backup of template files and documentation

---

## Development Workflow

### Phase-Based Development

- **Phase 1:** Core functionality (Import/Export)
- **Phase 2:** UI enhancements and error handling
- **Phase 3:** Advanced features and optimization
- **Phase 4:** Accessibility and dark mode ✅ Complete
- **Phase 5:** Integration and performance ✅ Complete
- **Phase 6:** Testing and documentation ✅ In Progress

### Code Quality Standards

- **ESLint:** Code linting for consistency
- **JSDoc:** Comprehensive function documentation
- **Testing:** Unit and integration tests with high coverage
- **Performance:** Regular performance profiling and optimization
- **Accessibility:** WCAG 2.1 AA compliance verification

### Maintenance Guidelines

- **Regular Updates:** Keep dependencies (SheetJS) up to date
- **Performance Monitoring:** Regular performance audits
- **Accessibility Testing:** Periodic accessibility compliance checks
- **User Feedback:** Collect and incorporate user feedback
- **Documentation:** Keep documentation current with code changes

---

**Last Updated:** December 11, 2025  
**Version:** 2.0 - Phase 6 Architecture  
**Status:** Production Ready with Comprehensive Testing  
**Next Review:** Quarterly or after major feature additions