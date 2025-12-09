# Abrechnung Application - Architecture Overview

## Module Structure

The application follows a **modular ES6 architecture** with clear separation of concerns:

### Core Modules

1. **state.js** - State Management
   - Centralized application state with localStorage persistence
   - Event-driven updates via publish/subscribe pattern
   - Immutable update pattern with defensive copying
   - Domain-specific helper functions for common state updates

2. **utils.js** - Excel I/O & Data Processing
   - Read/parse protokoll.xlsx using SheetJS
   - Extract metadata and positions from worksheets
   - Aggregate quantities by position number
   - Load and populate abrechnung.xlsx template
   - Export final Excel file with proper formatting

3. **handlers.js** - Event Handlers & UI Logic
   - Import handler: parse protokoll and update state
   - Generate handler: aggregate positions and create workbook
   - Export handler: download abrechnung file
   - UI update functions: render state changes to DOM

4. **ui.js** - UI Rendering Functions
   - Update import section UI
   - Update generate section UI
   - Update export section UI
   - Global message handling

5. **validation.js** - Data Validation
   - Validate state structure
   - Validate metadata completeness
   - Validate position data

6. **main.js** - Application Bootstrap
   - Initialize state, event listeners, UI
   - Wire up pub/sub mechanism
   - Perform initial render based on persisted state

### Data Flow

```
User Action (e.g., file import)
         ↓
   Handler function (handlers.js)
         ↓
   Calls utility functions (utils.js)
         ↓
   Updates state via setState() (state.js)
         ↓
   stateChanged event fires
         ↓
   Subscribed UI update functions run (ui.js)
         ↓
   DOM elements update
         ↓
   User sees updated UI
```

### Key Design Principles

1. **Single Responsibility**: Each module handles one domain
2. **No Direct DOM Manipulation from Utils**: Utilities work with data only
3. **Reactive UI**: UI is derived from state; UI changes only via state updates
4. **Persistent State**: Critical data survives page reload via localStorage
5. **Error Boundary**: Errors in handlers don't corrupt state
6. **Template Caching**: Excel template cached in memory for performance

## File Structure

```
abrechnung-app/
├── index.html              # Entry point HTML
├── css/
│   └── styles.css          # Application styling
├── js/
│   ├── main.js             # Application bootstrap
│   ├── state.js            # State management
│   ├── utils.js            # Excel utilities
│   ├── handlers.js         # Event handlers
│   ├── ui.js               # UI rendering functions
│   └── validation.js       # Data validation
├── templates/
│   ├── protokoll.xlsx      # Reference protokoll template
│   ├── abrechnung.xlsx     # Abrechnung template
│   └── README.md           # Template documentation
├── tests/
│   ├── unit/               # Unit tests
│   │   ├── state.test.js
│   │   ├── utils.test.js
│   │   └── handlers.test.js
│   ├── integration/        # Integration tests
│   └── setup.js            # Test configuration
├── docs/
│   ├── ARCHITECTURE.md     # This file
│   ├── API.md              # Module API documentation
│   └── TROUBLESHOOTING.md  # User troubleshooting guide
├── package.json            # Node.js dependencies
├── jest.config.js          # Jest configuration
└── README.md               # User documentation
```

## State Schema

```javascript
{
  protokollData: {
    metadata: {
      protocolNumber: string,      // Cell U3
      orderNumber: string,         // Cell N5
      plant: string,               // Cell A10 (Anlage)
      location: string,            // Cell T10 (Einsatzort)
      company: string,             // Cell T7 (Firma)
      date: string                 // ISO date
    },
    positionen: [
      { posNr: string, menge: number, row: number }
    ]
  },
  
  abrechnungData: {
    header: {
      date: string,
      orderNumber: string,
      plant: string,
      location: string
    },
    positionen: { 
      [posNr]: totalMenge          // Aggregated by position number
      // e.g. "01.01.0010": 7
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
    lastUpdated: ISO8601 timestamp
  }
}
```

## Error Handling Strategy

### Error Types

1. **User Errors**: Invalid file, missing data
   - **Handling**: Show user-friendly error message, preserve state
   - **Example**: "Ungültiges Dateiformat. Bitte wählen Sie eine .xlsx Datei."

2. **System Errors**: File read failures, SheetJS parse errors
   - **Handling**: Log to console, show generic error, suggest retry
   - **Example**: "Fehler beim Lesen der Excel-Datei: {error}"

3. **Logic Errors**: Null/undefined data, invalid aggregation
   - **Handling**: Validate at entry points, throw with context
   - **Example**: "Ungültiges Positionsobjekt im Array"

### Error Recovery

- Each handler wraps operations in try/catch
- Errors update UI status but do NOT corrupt state
- User can retry operation without manual reset
- Complex operations use preliminary validation before state update

## Performance Considerations

### Optimization Points

1. **File I/O**: SheetJS can be slow for large files
   - Solution: Cache template, minimize re-reads, use appropriate SheetJS options

2. **Position Aggregation**: O(n) but can be slow for 10,000+ positions
   - Solution: Use Object/Map for O(1) lookup, avoid nested loops

3. **DOM Updates**: Frequent state changes can cause reflows
   - Solution: Batch DOM updates, use CSS classes instead of inline styles

4. **localStorage**: Serialization overhead for large state
   - Solution: Only persist essential data, consider limits

### Profiling

Use browser DevTools Performance tab:
- Record workflow execution
- Identify long tasks (> 50ms)
- Check for jank (frame rate drops)
- Profile memory usage after multiple workflows

## Testing Strategy

### Unit Tests

- Test each module function in isolation
- Mock external dependencies (filesystem, localStorage, XLSX library)
- Aim for 90%+ code coverage

### Integration Tests

- Test workflows (import → generate → export)
- Use real or realistic test data
- Verify state consistency across operations

### Manual Testing

- Test happy path: full import → generate → export workflow
- Test error paths: invalid files, missing data, edge cases
- Test persistence: reload page, verify state restored
- Test cleanup: verify reset clears all data

## Security Considerations

1. **File Upload**: Only accept .xlsx files, validate MIME type
2. **XSS Prevention**: Escape HTML in user-provided content
3. **Data Validation**: Validate all imported data
4. **localStorage**: Don't store sensitive data
5. **Template Integrity**: Validate template structure before use

## Browser Compatibility

- **Chrome**: Fully supported (latest)
- **Firefox**: Fully supported (latest)
- **Safari**: Fully supported (latest)
- **Edge**: Fully supported (latest)

Requirements:
- ES6 module support
- localStorage API
- FileReader API
- Fetch API

## Future Enhancements

Potential improvements beyond Phase 6:

1. **Batch Processing**: Process multiple protokoll files sequentially
2. **Template Selection**: Allow user to choose different abrechnung templates
3. **Data Validation**: Add pre-import validation, dry run preview
4. **Undo/Redo**: Maintain history of state changes
5. **Export Formats**: Support CSV, JSON in addition to Excel
6. **Advanced Filtering**: Filter/search positions before export
7. **Multi-Language**: Internationalization support (i18n)
8. **Offline Mode**: Complete offline functionality with sync
9. **Database Backend**: Store historical data for audit trails
10. **User Authentication**: Multi-user support with access control

## Deployment

### Development

```bash
# Start local server (choose one):
python -m http.server 8000
# or
npx http-server -p 8000
# or XAMPP Apache
```

### Production

1. Copy all files to web server document root
2. Ensure templates/ directory is accessible
3. Configure HTTPS (recommended)
4. Set appropriate CORS headers if needed
5. Monitor browser console for errors

## Maintenance

### Regular Tasks

- **Monthly**: Review error logs and user feedback
- **Quarterly**: Update dependencies (SheetJS, Jest)
- **As-needed**: Bug fixes and improvements

### Updating Templates

1. Update template files in `templates/` directory
2. Verify cell references in utils.js match new template
3. Clear template cache: `clearAbrechnungTemplateCache()`
4. Test import and export thoroughly

---

**Architecture Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Production Ready
