# Phase 6: Testing, Documentation & Optimization

## Overview

Phase 6 focuses on **solidifying quality**, **documenting the codebase**, and **optimizing performance** of the Abrechnung Application. This phase typically covers **Weeks 6–7** and builds upon the fully functional end-to-end application completed in Phase 5.

The key goals of Phase 6 are:

- Implement **automated testing** (unit tests, integration tests) to catch regressions.
- Create **comprehensive developer documentation** for maintenance and future enhancements.
- Perform **performance profiling** and optimization to ensure snappy response times.
- Establish **user-facing documentation** (help guides, troubleshooting).
- Prepare **deployment configuration** for production use via XAMPP.
- Conduct **accessibility audits** and fix any WCAG compliance issues.
- Perform **security review** of file handling and state management.

By the end of Phase 6, the application will be **production-ready**, well-documented, thoroughly tested, and optimized for typical workflows with real data.

---

## 6.1 Automated Testing Framework

### Objective

Implement automated tests across all modules to ensure reliability and facilitate future maintenance.

### 6.1.1 Testing Stack Selection

Choose a lightweight testing framework suitable for browser-based JavaScript modules:

- **Jest** (recommended): Supports ES6 modules, mocking, and good IDE integration.
- **Vitest**: Modern alternative with Vite integration; faster in many scenarios.
- **Mocha + Chai**: Traditional choice; requires manual setup for ES6 modules.

For this project, **Jest** is recommended due to its maturity and built-in support for module mocking.

### 6.1.2 Project Setup for Testing

Create a testing directory and configuration:

```bash
# Install Jest
npm install --save-dev jest @babel/preset-env babel-jest

# Create test configuration
echo "module.exports = { testEnvironment: 'jsdom', moduleNameMapper: { '\\.(xlsx)$': '<rootDir>/js/libs/xlsx.min.js' } };" > jest.config.js

# Create test directory
mkdir -p tests/unit tests/integration
```

Configure `package.json` to run tests:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 6.1.3 Unit Tests for State Management (`tests/unit/state.test.js`)

Test the state module in isolation:

```javascript
// tests/unit/state.test.js

import { 
  getState, 
  setState, 
  resetState, 
  subscribe, 
  clearPersistedState,
  loadStateFromStorage 
} from '../../js/state.js';

describe('State Management (state.js)', () => {
  beforeEach(() => {
    // Clear localStorage and reset state before each test
    localStorage.clear();
    resetState({ persist: false, silent: true });
  });

  describe('getState()', () => {
    test('returns initial state with expected structure', () => {
      const state = getState();
      expect(state).toHaveProperty('protokollData');
      expect(state).toHaveProperty('abrechnungData');
      expect(state).toHaveProperty('ui');
    });

    test('returns the same state object on repeated calls until setState is called', () => {
      const state1 = getState();
      const state2 = getState();
      expect(state1).toBe(state2);
    });
  });

  describe('setState()', () => {
    test('updates state with new values', () => {
      const newData = { protokollData: { metadata: { orderNumber: 'ORD-001' } } };
      setState(newData);
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
    });

    test('merges new state with existing state (shallow merge)', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      setState({ ui: { import: { status: 'success' } } });
      
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
      expect(state.ui.import.status).toBe('success');
    });

    test('triggers stateChanged event listeners', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } });
      
      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        protokollData: expect.objectContaining({
          metadata: expect.objectContaining({ orderNumber: 'ORD-001' })
        })
      }));
    });

    test('persists state to localStorage when persist option is true', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } }, { persist: true });
      
      const stored = JSON.parse(localStorage.getItem('abrechnungAppState'));
      expect(stored.protokollData.metadata.orderNumber).toBe('ORD-001');
    });
  });

  describe('subscribe()', () => {
    test('registers multiple listeners and calls all on state change', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      subscribe(listener1);
      subscribe(listener2);
      
      setState({ ui: { import: { status: 'success' } } });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('listener receives updated state', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      const testData = { protokollData: { metadata: { orderNumber: 'TEST-001' } } };
      setState(testData);
      
      const callArg = listener.mock.calls[0][0];
      expect(callArg.protokollData.metadata.orderNumber).toBe('TEST-001');
    });
  });

  describe('resetState()', () => {
    test('clears all state back to initial values', () => {
      setState({ 
        protokollData: { metadata: { orderNumber: 'ORD-001' } },
        ui: { import: { status: 'success' } }
      });
      
      resetState({ persist: false });
      
      const state = getState();
      expect(state.protokollData).toEqual({});
      expect(state.ui.import.status).toBe('idle');
    });

    test('clears localStorage when persist option is true', () => {
      setState({ protokollData: { metadata: { orderNumber: 'ORD-001' } } }, { persist: true });
      
      expect(localStorage.getItem('abrechnungAppState')).not.toBeNull();
      
      resetState({ persist: true });
      
      expect(localStorage.getItem('abrechnungAppState')).toBeNull();
    });
  });

  describe('loadStateFromStorage()', () => {
    test('loads persisted state from localStorage', () => {
      const testState = { protokollData: { metadata: { orderNumber: 'STORED-001' } } };
      localStorage.setItem('abrechnungAppState', JSON.stringify(testState));
      
      const loaded = loadStateFromStorage();
      expect(loaded.protokollData.metadata.orderNumber).toBe('STORED-001');
    });

    test('returns empty object if localStorage is empty', () => {
      localStorage.clear();
      
      const loaded = loadStateFromStorage();
      expect(loaded).toEqual({});
    });

    test('handles corrupted JSON gracefully', () => {
      localStorage.setItem('abrechnungAppState', 'invalid json {');
      
      const loaded = loadStateFromStorage();
      expect(loaded).toEqual({});
    });
  });

  describe('Validation & Error Handling', () => {
    test('validates required metadata fields', () => {
      const invalidMetadata = { orderNumber: '', protocolNumber: '' };
      
      // Assuming validateMetadata exists in state module
      const validation = validateMetadata(invalidMetadata);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('detects and reports duplicate position numbers', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5 },
        { posNr: '01.01.0010', menge: 3 }
      ];
      
      const validation = validatePositions(positions);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });
});
```

### 6.1.4 Unit Tests for Utilities (`tests/unit/utils.test.js`)

Test Excel reading/writing utilities in isolation:

```javascript
// tests/unit/utils.test.js

import { 
  sumByPosition, 
  getPositionSummary,
  validateExtractedPositions,
  fillAbrechnungHeader,
  createExportWorkbook 
} from '../../js/utils.js';

describe('Utility Functions (utils.js)', () => {
  describe('sumByPosition()', () => {
    test('aggregates quantities by position number', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5 },
        { posNr: '01.01.0020', menge: 3 },
        { posNr: '01.01.0010', menge: 2 }
      ];
      
      const result = sumByPosition(positions);
      
      expect(result['01.01.0010']).toBe(7);
      expect(result['01.01.0020']).toBe(3);
    });

    test('handles empty array', () => {
      const result = sumByPosition([]);
      expect(result).toEqual({});
    });

    test('throws error on invalid input', () => {
      expect(() => sumByPosition(null)).toThrow();
      expect(() => sumByPosition('not an array')).toThrow();
    });

    test('throws error on invalid position object', () => {
      expect(() => sumByPosition([{ menge: 5 }])).toThrow();
    });

    test('throws error on non-numeric quantity', () => {
      expect(() => sumByPosition([
        { posNr: '01.01.0010', menge: 'five' }
      ])).toThrow();
    });
  });

  describe('getPositionSummary()', () => {
    test('computes correct summary statistics', () => {
      const positionMap = {
        '01.01.0010': 5,
        '01.01.0020': 3,
        '01.01.0030': 8
      };
      
      const summary = getPositionSummary(positionMap);
      
      expect(summary.totalQuantity).toBe(16);
      expect(summary.uniquePositions).toBe(3);
      expect(summary.minQuantity).toBe(3);
      expect(summary.maxQuantity).toBe(8);
    });

    test('handles empty map', () => {
      const summary = getPositionSummary({});
      expect(summary.totalQuantity).toBe(0);
      expect(summary.uniquePositions).toBe(0);
    });
  });

  describe('validateExtractedPositions()', () => {
    test('validates normal positions as valid', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
        { posNr: '01.01.0020', menge: 3, rowIndex: 31 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('detects duplicate position numbers', () => {
      const positions = [
        { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
        { posNr: '01.01.0010', menge: 3, rowIndex: 31 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('detects negative quantities', () => {
      const positions = [
        { posNr: '01.01.0010', menge: -5, rowIndex: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('detects invalid position number format', () => {
      const positions = [
        { posNr: 'INVALID', menge: 5, rowIndex: 30 }
      ];
      
      const result = validateExtractedPositions(positions);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('returns empty array as valid', () => {
      const result = validateExtractedPositions([]);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('No positions'))).toBe(true);
    });
  });

  describe('fillAbrechnungHeader()', () => {
    test('writes metadata to correct cells', () => {
      const mockWorkbook = {
        Sheets: { 'EAW': {} },
        SheetNames: ['EAW']
      };
      
      const metadata = {
        date: '2025-12-09',
        orderNumber: 'ORD-001',
        plant: 'Factory A',
        location: 'Building 1'
      };
      
      const result = fillAbrechnungHeader(mockWorkbook, metadata);
      
      expect(result.Sheets.EAW.B1.v).toBe('2025-12-09');
      expect(result.Sheets.EAW.B2.v).toBe('ORD-001');
      expect(result.Sheets.EAW.B3.v).toBe('Factory A');
      expect(result.Sheets.EAW.B4.v).toBe('Building 1');
    });

    test('throws error on invalid workbook', () => {
      const metadata = { date: '2025-12-09', orderNumber: 'ORD-001' };
      
      expect(() => fillAbrechnungHeader(null, metadata)).toThrow();
      expect(() => fillAbrechnungHeader({}, metadata)).toThrow();
    });

    test('throws error on invalid metadata', () => {
      const mockWorkbook = {
        Sheets: { 'EAW': {} },
        SheetNames: ['EAW']
      };
      
      expect(() => fillAbrechnungHeader(mockWorkbook, null)).toThrow();
    });

    test('handles missing metadata fields gracefully', () => {
      const mockWorkbook = {
        Sheets: { 'EAW': {} },
        SheetNames: ['EAW']
      };
      
      const metadata = {
        date: '2025-12-09',
        orderNumber: 'ORD-001'
        // plant and location missing
      };
      
      const result = fillAbrechnungHeader(mockWorkbook, metadata);
      expect(result).toBeDefined();
      // Should not throw
    });
  });
});
```

### 6.1.5 Integration Tests (`tests/integration/workflow.test.js`)

Test complete workflows from import to export:

```javascript
// tests/integration/workflow.test.js

import { getState, setState, resetState } from '../../js/state.js';
import {
  readExcelFile,
  parseProtokoll,
  extractPositions,
  sumByPosition,
  createExportWorkbook,
  exportToExcel
} from '../../js/utils.js';

describe('End-to-End Workflow Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    resetState({ persist: false, silent: true });
  });

  describe('Import → Generate → Export Workflow', () => {
    test('complete workflow with sample protokoll file', async () => {
      // Simulate loading a test protokoll file
      const testFile = new File(
        [arrayBufferFromSampleData()],
        'test-protokoll.xlsx',
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      // Step 1: Read file
      const fileData = await readExcelFile(testFile);
      expect(fileData.workbook).toBeDefined();
      expect(fileData.metadata.fileName).toBe('test-protokoll.xlsx');

      // Step 2: Parse metadata
      const metadata = parseProtokoll(fileData.workbook);
      expect(metadata).toHaveProperty('protocolNumber');
      expect(metadata).toHaveProperty('orderNumber');

      // Step 3: Extract positions
      const positions = extractPositions(fileData.workbook);
      expect(Array.isArray(positions)).toBe(true);

      // Step 4: Aggregate positions
      const positionSums = sumByPosition(positions);
      expect(typeof positionSums).toBe('object');

      // Step 5: Create export workbook
      const abrechnungData = {
        header: metadata,
        positionen: positionSums
      };

      const exportWorkbook = await createExportWorkbook(abrechnungData);
      expect(exportWorkbook).toBeDefined();
      expect(exportWorkbook.SheetNames).toContain('EAW');
    });

    test('workflow maintains state integrity across steps', async () => {
      const testMetadata = {
        protocolNumber: 'PROT-001',
        orderNumber: 'ORD-001',
        plant: 'Factory A',
        location: 'Building 1',
        date: '2025-12-09'
      };

      setState({ protokollData: { metadata: testMetadata, positionen: [] } });

      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
    });

    test('workflow handles errors without corrupting state', async () => {
      const validMetadata = {
        protocolNumber: 'PROT-001',
        orderNumber: 'ORD-001'
      };

      setState({ protokollData: { metadata: validMetadata } });

      try {
        // Attempt invalid operation
        sumByPosition(null);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // State should still be valid
      const state = getState();
      expect(state.protokollData.metadata.orderNumber).toBe('ORD-001');
    });
  });

  describe('Error Recovery', () => {
    test('recovers from import failure without state corruption', async () => {
      const initialState = getState();

      try {
        await readExcelFile(null);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // State should be unchanged
      const currentState = getState();
      expect(currentState).toEqual(initialState);
    });

    test('can retry failed operation without manual reset', async () => {
      try {
        // First attempt fails
        await readExcelFile(new File([], 'invalid.txt'));
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Second attempt should work (with valid file)
      const testFile = new File(
        [arrayBufferFromSampleData()],
        'valid.xlsx',
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      const result = await readExcelFile(testFile);
      expect(result).toBeDefined();
    });
  });
});

// Helper function to generate sample Excel data (simplified)
function arrayBufferFromSampleData() {
  // In real tests, you'd use a fixture file or generate proper Excel binary
  // This is a placeholder
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
}
```

### 6.1.6 Handler Tests (`tests/unit/handlers.test.js`)

Test event handlers:

```javascript
// tests/unit/handlers.test.js

import { 
  handleImportFile,
  handleGenerateAbrechnung,
  handleExportAbrechnung,
  showErrorAlert,
  clearErrorAlerts
} from '../../js/handlers.js';

import { getState, resetState } from '../../js/state.js';

describe('Event Handlers (handlers.js)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetState({ persist: false, silent: true });
    
    // Mock DOM elements
    setupMockDOM();
  });

  describe('showErrorAlert()', () => {
    test('creates alert element with correct title and message', () => {
      showErrorAlert('Test Title', 'Test message');
      
      const alerts = document.querySelectorAll('.alert');
      expect(alerts.length).toBeGreaterThan(0);
      
      const lastAlert = alerts[alerts.length - 1];
      expect(lastAlert.textContent).toContain('Test Title');
      expect(lastAlert.textContent).toContain('Test message');
    });

    test('creates closable alert with X button', () => {
      showErrorAlert('Title', 'Message');
      
      const closeButton = document.querySelector('.alert-close');
      expect(closeButton).toBeDefined();
      
      closeButton.click();
      const alerts = document.querySelectorAll('.alert');
      expect(alerts.length).toBe(0);
    });

    test('auto-dismisses after 8 seconds', (done) => {
      showErrorAlert('Title', 'Message');
      
      setTimeout(() => {
        const alerts = document.querySelectorAll('.alert');
        expect(alerts.length).toBe(0);
        done();
      }, 8100);
    });

    test('escapes HTML in title and message', () => {
      const xssTitle = '<script>alert("xss")</script>';
      const xssMessage = '<img src=x onerror="alert(\'xss\')">';
      
      showErrorAlert(xssTitle, xssMessage);
      
      const alert = document.querySelector('.alert');
      expect(alert.innerHTML).not.toContain('<script>');
      expect(alert.innerHTML).not.toContain('onerror');
    });
  });

  describe('clearErrorAlerts()', () => {
    test('removes all alert elements', () => {
      showErrorAlert('Title 1', 'Message 1');
      showErrorAlert('Title 2', 'Message 2');
      
      let alerts = document.querySelectorAll('.alert');
      expect(alerts.length).toBe(2);
      
      clearErrorAlerts();
      
      alerts = document.querySelectorAll('.alert');
      expect(alerts.length).toBe(0);
    });
  });
});

function setupMockDOM() {
  document.body.innerHTML = `
    <input id="file-input" type="file" />
    <button id="import-button">Import</button>
    <button id="generate-button">Generate</button>
    <button id="export-button">Export</button>
    <div id="alert-container"></div>
    <div id="import-status"></div>
    <div id="import-message"></div>
    <div id="import-summary"></div>
  `;
}
```

### 6.1.7 Running Tests

Execute tests with:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/state.test.js

# Run with coverage report
npm test -- --coverage

# Watch mode (re-run on file changes)
npm test -- --watch
```

Coverage targets:

- **State module**: 95%+ coverage
- **Utilities module**: 90%+ coverage
- **Handlers module**: 80%+ coverage
- **Overall**: 85%+ coverage

---

## 6.2 Developer Documentation

### Objective

Create comprehensive documentation for developers who maintain or extend the codebase.

### 6.2.1 Architecture Overview Document

Create `docs/ARCHITECTURE.md`:

```markdown
# Abrechnung Application - Architecture Overview

## Module Structure

The application follows a **modular ES6 architecture** with clear separation of concerns:

### Core Modules

1. **state.js** - State Management
   - Centralized application state
   - localStorage persistence
   - Event-driven updates via publish/subscribe

2. **utils.js** - Excel I/O & Data Processing
   - Read/parse protokoll.xlsx using SheetJS
   - Extract metadata and positions
   - Aggregate quantities by position number
   - Populate abrechnung.xlsx template
   - Export final Excel file

3. **handlers.js** - Event Handlers & UI Logic
   - Import handler: parse protokoll and update state
   - Generate handler: aggregate positions and create workbook
   - Export handler: download abrechnung file
   - UI update functions: render state changes to DOM

4. **main.js** - Application Bootstrap
   - Initialize state, event listeners, UI
   - Wire up pub/sub mechanism
   - Perform initial render based on persisted state

### Data Flow

```
User Action (e.g., file import)
         ↓
   Handler function
         ↓
   Calls utility functions
         ↓
   Updates state via setState()
         ↓
   stateChanged event fires
         ↓
   Subscribed UI update functions run
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

## File Structure

```
abrechnung-app/
├── index.html              # Entry point HTML
├── js/
│   ├── main.js             # Application bootstrap
│   ├── state.js            # State management
│   ├── utils.js            # Excel utilities
│   ├── handlers.js         # Event handlers & UI logic
│   └── libs/
│       └── xlsx.min.js     # SheetJS library
├── css/
│   └── styles.css          # Application styling
├── templates/
│   └── abrechnung.xlsx     # Excel template
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── docs/
│   ├── ARCHITECTURE.md     # This file
│   ├── API.md              # Module API documentation
│   └── TROUBLESHOOTING.md  # User troubleshooting guide
└── package.json            # Node.js dependencies
```

## State Schema

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
  }
}
```

## Error Handling Strategy

### Error Types

1. **User Errors**: Invalid file, missing data
   - **Handling**: Show user-friendly error message, preserve state
   - **Example**: "File must be .xlsx format"

2. **System Errors**: File read failures, SheetJS parse errors
   - **Handling**: Log to console, show generic error, suggest retry
   - **Example**: "Failed to read file: {error}"

3. **Logic Errors**: Null/undefined data, invalid aggregation
   - **Handling**: Validate at entry points, throw with context
   - **Example**: "Invalid position object in array"

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
   - Solution: Use Map for O(1) lookup, avoid nested loops

3. **DOM Updates**: Frequent state changes can cause reflows
   - Solution: Batch DOM updates, use CSS classes instead of inline styles

4. **localStorage**: Serialization overhead for large state
   - Solution: Only persist essential data, consider IndexedDB for large datasets

### Profiling

Use browser DevTools Performance tab:
- Record workflow execution
- Identify long tasks (> 50ms)
- Check for jank (frame rate drops)
- Profile memory usage after multiple workflows

## Testing Strategy

### Unit Tests

- Test each module function in isolation
- Mock external dependencies (filesystem, localStorage)
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

## Future Enhancements

Potential improvements beyond Phase 6:

1. **Batch Processing**: Process multiple protokoll files sequentially
2. **Template Selection**: Allow user to choose different abrechnung templates
3. **Data Validation**: Add pre-import validation, dry run preview
4. **Undo/Redo**: Maintain history of state changes
5. **Export Formats**: Support CSV, JSON in addition to Excel
6. **Advanced Filtering**: Filter/search positions before export
7. **Multi-Language**: Internationalization support
8. **Offline Mode**: Complete offline functionality with sync
```

### 6.2.2 API Documentation

Create `docs/API.md`:

```markdown
# Abrechnung Application - API Documentation

## State Module (`js/state.js`)

### Functions

#### `getState() → Object`
Returns the current application state.

**Returns**: Complete state object

**Example**:
```javascript
const state = getState();
console.log(state.protokollData.metadata.orderNumber);
```

---

#### `setState(updates: Object, options?: Object) → void`
Update state with new values. Uses shallow merge.

**Parameters**:
- `updates` (Object): Partial state to merge
- `options.persist` (boolean): Save to localStorage (default: true)
- `options.silent` (boolean): Don't trigger listeners (default: false)

**Triggers**: `stateChanged` event

**Example**:
```javascript
setState({
  ui: { import: { status: 'success', message: 'File imported' } }
}, { persist: true });
```

---

#### `subscribe(listener: Function) → Function`
Register a callback to be called whenever state changes.

**Parameters**:
- `listener(state: Object)`: Function called with updated state

**Returns**: Unsubscribe function

**Example**:
```javascript
const unsubscribe = subscribe((state) => {
  console.log('State changed:', state);
});

// Later, to stop listening:
unsubscribe();
```

---

#### `resetState(options?: Object) → void`
Clear all state back to initial values.

**Parameters**:
- `options.persist` (boolean): Also clear localStorage (default: true)
- `options.silent` (boolean): Don't trigger listeners (default: false)

**Example**:
```javascript
resetState({ persist: true });
```

---

#### `loadStateFromStorage() → Object`
Manually load persisted state from localStorage.

**Returns**: Parsed state object or `{}` if not found

**Note**: Automatically called during app initialization

---

## Utilities Module (`js/utils.js`)

### Excel Reading Functions

#### `readExcelFile(file: File) → Promise<Object>`
Read an Excel file and return workbook object.

**Parameters**:
- `file` (File): File from input element

**Returns**: Promise resolving to `{ workbook, metadata: { fileName, fileSize, readAt } }`

**Throws**: Error if file is invalid or cannot be read

**Example**:
```javascript
const fileInput = document.querySelector('input[type="file"]');
const fileData = await readExcelFile(fileInput.files[0]);
console.log(fileData.workbook.SheetNames);
```

---

#### `parseProtokoll(workbook: Object) → Object`
Extract metadata from protokoll worksheet.

**Parameters**:
- `workbook` (Object): SheetJS workbook object

**Returns**: `{ protocolNumber, orderNumber, plant, location, company, date }`

**Throws**: Error if required fields are missing

**Cells Read**:
- Protocol-Nr. → U3
- Auftrag-Nr. → N5
- Anlage → A10
- Einsatzort → T10
- Firma → T7

---

#### `extractPositions(workbook: Object) → Array`
Extract position data from protokoll.

**Parameters**:
- `workbook` (Object): SheetJS workbook object

**Returns**: Array of `{ posNr, menge, rowIndex }`

**Range**: Rows 30-325

---

#### `validateExtractedPositions(positions: Array) → Object`
Validate extracted position data.

**Returns**: `{ valid: boolean, errors: Array, warnings: Array }`

---

#### `sumByPosition(positions: Array) → Object`
Aggregate quantities by position number.

**Parameters**:
- `positions` (Array): Position array from extractPositions

**Returns**: `{ [posNr]: totalMenge }`

**Example**:
```javascript
const positions = [
  { posNr: '01.01.0010', menge: 5 },
  { posNr: '01.01.0010', menge: 2 }
];
const sums = sumByPosition(positions);
// Result: { '01.01.0010': 7 }
```

---

#### `getPositionSummary(positionMap: Object) → Object`
Compute statistics on position sums.

**Returns**: `{ totalQuantity, uniquePositions, minQuantity, maxQuantity }`

---

### Excel Writing Functions

#### `loadAbrechnungTemplate() → Promise<Object>`
Load and cache the abrechnung template.

**Returns**: Promise resolving to workbook object

**Note**: Template is cached after first load for performance

---

#### `fillAbrechnungHeader(workbook: Object, metadata: Object) → Object`
Populate header section of abrechnung template.

**Parameters**:
- `workbook` (Object): Template workbook
- `metadata` (Object): Metadata from parseProtokoll

**Returns**: Updated workbook

---

#### `fillAbrechnungPositions(workbook: Object, positionSums: Object) → Object`
Populate position rows with aggregated quantities.

**Parameters**:
- `workbook` (Object): Template workbook
- `positionSums` (Object): Position map from sumByPosition

**Returns**: Updated workbook

---

#### `createExportWorkbook(abrechnungData: Object) → Promise<Object>`
Create complete export-ready workbook.

**Parameters**:
- `abrechnungData.header` (Object): Metadata
- `abrechnungData.positionen` (Object): Position sums

**Returns**: Promise resolving to complete workbook

---

#### `exportToExcel(workbook: Object, metadata: Object) → Object`
Trigger browser download of workbook.

**Parameters**:
- `workbook` (Object): Workbook to export
- `metadata` (Object): For filename generation { orderNumber, date }

**Returns**: `{ fileName, timestamp, fileSize, success }`

**Side Effect**: Downloads file to user's browser

---

## Handlers Module (`js/handlers.js`)

### Event Handlers

#### `handleImportFile(event: Event) → Promise<void>`
Process file input and import protokoll data.

**Triggers**:
- File read and parse
- State update with metadata and positions
- UI status updates

**Error Handling**: Shows user-friendly error message

---

#### `handleGenerateAbrechnung() → Promise<void>`
Generate abrechnung from imported data.

**Preconditions**: protokollData must exist in state

**Triggers**:
- Position aggregation
- Template loading and population
- State update with abrechnungData
- Workbook cached in window._currentWorkbook

---

#### `handleExportAbrechnung() → Promise<void>`
Export abrechnung workbook to file.

**Preconditions**: abrechnungData must exist, workbook must be cached

**Triggers**: Browser download

---

#### `handleResetApplication() → void`
Clear all state and cached data.

**Preconditions**: Confirms with user before proceeding

**Side Effects**:
- Clears state
- Clears localStorage
- Resets file input
- Deletes window._currentWorkbook

---

### UI Update Functions

#### `updateImportUI(state: Object) → void`
Update import section UI based on state.

**Updates**:
- Status indicator
- Status message
- Import summary display
- Button enabled/disabled states

---

#### `updateGenerateUI(state: Object) → void`
Update generate section UI based on state.

---

#### `updateExportUI(state: Object) → void`
Update export section UI based on state.

---

### Helper Functions

#### `showErrorAlert(title: string, message: string) → void`
Display error alert to user.

**Features**:
- Auto-dismisses after 8 seconds
- Has close button
- Escapes HTML to prevent XSS
- Logs to console

---

#### `clearErrorAlerts() → void`
Remove all alert elements from DOM.

---

## Main Module (`js/main.js`)

#### `initializeApp() → Promise<void>`
Bootstrap the application.

**Steps**:
1. Load persisted state
2. Initialize static UI
3. Bind event listeners
4. Subscribe to state changes
5. Perform initial render

**Called**: When DOM is ready

---

## Best Practices for Extending

### Adding a New Utility Function

1. **Add to utils.js** with clear JSDoc
2. **Export it** from the module
3. **Write unit tests** in `tests/unit/utils.test.js`
4. **Document in API.md**

### Adding a New UI Section

1. **Add HTML structure** to index.html with appropriate IDs
2. **Create update function** in handlers.js (e.g., `updateMyUI`)
3. **Call from main.js** subscribe callback
4. **Write tests** for the update function

### Adding State Properties

1. **Initialize** in initial state object
2. **Document** in ARCHITECTURE.md State Schema
3. **Update tests** to cover new properties

---

```

### 6.2.3 Troubleshooting Guide

Create `docs/TROUBLESHOOTING.md`:

```markdown
# Troubleshooting Guide

## Common Issues

### Issue: "Import failed: Invalid file type"

**Symptom**: Cannot import .xlsx file, error says "only .xlsx files are supported"

**Causes**:
- File is not a valid Excel file (.xls, .csv, etc.)
- File MIME type is not recognized by browser
- File is corrupted

**Solutions**:
1. Verify file extension is `.xlsx` (not `.xls` or `.csv`)
2. Re-save file in Excel as `.xlsx` format
3. Copy content to a fresh Excel workbook and save as `.xlsx`
4. Try from a different browser (Chrome, Firefox, Edge)

---

### Issue: "Metadata fields are missing"

**Symptom**: Import fails with error about missing metadata (Auftrags-Nr., Protokoll-Nr., etc.)

**Causes**:
- Using wrong protokoll template
- Template cells were deleted or moved
- Data not entered in correct cells

**Solutions**:
1. Use official `protokoll.xlsx` template, not a modified version
2. Verify data is in the correct cells:
   - Protokoll-Nr. → U3
   - Auftrags-Nr. → N5
   - Anlage → A10
   - Einsatzort → T10
   - Firma → T7
3. If cells were moved, contact your Excel template maintainer

---

### Issue: No positions are extracted

**Symptom**: Import succeeds, but metadata shows 0 positions extracted

**Causes**:
- Position data is in wrong columns/rows
- Rows outside the 30-325 range
- Position numbers are empty

**Solutions**:
1. Verify position data starts at row 30
2. Verify position numbers are in Column A
3. Check that quantities (Menge) are in Column B
4. If data is in different columns, contact support for template customization

---

### Issue: "Failed to load template" during generation

**Symptom**: Generate fails with error about template loading

**Causes**:
- `templates/abrechnung.xlsx` is missing from server
- File permissions prevent reading template
- Server returned 404

**Solutions**:
1. Verify `templates/abrechnung.xlsx` exists on server
2. Check file permissions (should be readable by web server)
3. Restart XAMPP Apache server
4. Check XAMPP logs for details: `xampp/apache/logs/error.log`

---

### Issue: Export button doesn't work or nothing downloads

**Symptom**: Click export, nothing happens, no file downloads

**Causes**:
- Browser security policy prevents downloads
- SheetJS library not loaded
- No workbook in memory

**Solutions**:
1. Check browser console (F12) for errors
2. Verify SheetJS loaded: type `XLSX` in console, should return object
3. Try different browser
4. Clear browser cache and reload page
5. Check browser popup/download settings

---

### Issue: Browser console errors

**Symptom**: Page loads but console (F12) shows red errors

**Common errors**:

**"Cannot find module / Unexpected token"**
- Problem: JavaScript syntax error or missing import
- Solution: Contact developer with full error message

**"localStorage is not defined"**
- Problem: Browser localStorage disabled or in private mode
- Solution: Disable private browsing, enable localStorage

**"SheetJS is not defined"**
- Problem: SheetJS library didn't load
- Solution: Refresh page, check network tab in DevTools

---

### Issue: Data persists after reset

**Symptom**: After clicking "Anwendung zurücksetzen", data reappears after page reload

**Causes**:
- localStorage not cleared properly
- Browser cache interference
- localStorage disabled

**Solutions**:
1. Manually clear localStorage:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Find `abrechnungAppState` and delete it
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private browsing to rule out cache issues

---

### Issue: Performance - application is slow

**Symptom**: Import/generation takes > 5 seconds

**Causes**:
- Very large protokoll file (> 1000 positions)
- Slow computer or browser
- Browser extensions interfering
- Lots of other tabs open

**Solutions**:
1. Check file size - are there really 1000+ positions?
2. Close other browser tabs and extensions
3. Try in a different browser
4. Try on a different computer
5. Check computer performance (Task Manager/Activity Monitor)

**Advanced**:
- Open DevTools Performance tab
- Record the slow operation
- Look for long red bars (long tasks)
- Contact developer with recording

---

## Reporting Issues

When reporting a problem, please include:

1. **Operating System**: Windows 10, macOS, Linux
2. **Browser**: Chrome version 120, Firefox 121, etc.
3. **Error Message**: Exact text from alert or console
4. **Steps to Reproduce**: What were you doing when it happened?
5. **Screenshot**: Of the error or unexpected behavior
6. **Console Errors**: Press F12, copy errors from Console tab
7. **Sample File**: If possible, attach the protokoll.xlsx file (sanitized)

---

## XAMPP Issues

### "Cannot start Apache"

**Solutions**:
1. Check if port 80 is in use: `netstat -ano | find ":80"`
2. Change port in `apache/conf/httpd.conf`: `Listen 8080`
3. Access as `http://localhost:8080/abrechnung-app`

### "File not found (404)"

**Solutions**:
1. Verify app is in `htdocs` folder: `xampp/htdocs/abrechnung-app/`
2. Check file names are correct
3. Verify `index.html` is in root of project
4. Restart Apache

### "Permission denied"

**Solutions**:
1. Check file permissions (should be readable by web server)
2. On Windows, disable antivirus scanner temporarily
3. Run XAMPP as Administrator

---

## Getting Help

1. Check this troubleshooting guide first
2. Check browser console (F12 → Console tab) for errors
3. Try in a different browser
4. Check DevTools Network tab to see if files are loading
5. Contact developer with detailed information from above

---

```

### 6.2.4 Code Comments & Docstrings

Ensure all functions have comprehensive JSDoc comments:

```javascript
/**
 * Aggregate position quantities by position number.
 * Handles duplicate entries by summing their quantities.
 * 
 * @param {Array<{posNr: string, menge: number, rowIndex?: number}>} positionen 
 *        Array of position objects from extractPositions()
 * 
 * @returns {Object} Map of { posNr: totalMenge }
 *         Example: { "01.01.0010": 7, "01.01.0020": 3 }
 * 
 * @throws {Error} If positionen is not an array or contains invalid objects
 * @throws {Error} If any menge value is not a number
 * 
 * @example
 * const positions = [
 *   { posNr: "01.01.0010", menge: 5 },
 *   { posNr: "01.01.0010", menge: 2 }
 * ];
 * const result = sumByPosition(positions);
 * // Returns: { "01.01.0010": 7 }
 * 
 * @performance O(n) where n is number of positions
 * @see getPositionSummary For statistics on aggregated data
 */\nexport function sumByPosition(positionen) {
  // Implementation...
}
```

---

## 6.3 Performance Optimization

### Objective

Profile and optimize the application for snappy, responsive operation.

### 6.3.1 Profiling Strategy

#### Browser DevTools Performance Tab

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform operation (e.g., import file, generate)
5. Stop recording
6. Analyze timeline

**Key metrics**:
- Long tasks (> 50ms) → potential jank
- Total execution time
- Memory usage
- Frame rate drops

#### Console Timing

Already implemented in handlers. Review logs:

```javascript
// From handleImportFile
const startTime = performance.now();
// ... operation ...
const elapsedMs = performance.now() - startTime;
console.log(`File import completed in ${elapsedMs.toFixed(2)} ms`);
```

### 6.3.2 Common Optimizations

#### 1. Template Caching

Already implemented in `loadAbrechnungTemplate()`. Template is loaded once and reused. Verify cache is working:

```javascript
let cachedAbrechnungTemplate = null;

export async function loadAbrechnungTemplate() {
  if (cachedAbrechnungTemplate) {
    return cachedAbrechnungTemplate;  // Cache hit
  }
  // Load template from disk
  const workbook = await fetch('./templates/abrechnung.xlsx');
  cachedAbrechnungTemplate = workbook;
  return workbook;
}
```

#### 2. Batch DOM Updates

Instead of updating individual elements multiple times, batch updates:

```javascript
// Bad: Multiple reflows
element1.textContent = 'A';
element2.textContent = 'B';
element3.textContent = 'C';

// Good: Single batch update
requestAnimationFrame(() => {
  element1.textContent = 'A';
  element2.textContent = 'B';
  element3.textContent = 'C';
});
```

#### 3. Lazy Loading

Load resources only when needed:

```javascript
// Don't load on app init
// export async function loadExpensiveLibrary() { ... }

// Instead, load on-demand
async function handleGenerateAbrechnung() {
  const { createExportWorkbook } = await import('./utils.js');
  // Now use it
}
```

#### 4. SheetJS Optimization

Use appropriate SheetJS options for performance:

```javascript
// Don't parse cell formatting unless needed
const workbook = XLSX.read(data, {
  type: 'array',
  cellFormula: false,      // Skip formulas
  cellStyles: false        // Skip styles
});
```

#### 5. Position Aggregation Optimization

Use Map for O(1) lookup instead of nested loops:

```javascript
// Current implementation is already optimized:
export function sumByPosition(positionen) {
  const positionMap = {};  // Or Map() for even better perf

  positionen.forEach((pos) => {
    if (positionMap[pos.posNr] === undefined) {
      positionMap[pos.posNr] = 0;
    }
    positionMap[pos.posNr] += pos.menge;
  });

  return positionMap;  // O(n) total time
}
```

### 6.3.3 Profiling Checklist

After optimizations, re-profile and verify:

- [ ] Import 1000-row protokoll in < 2 seconds
- [ ] Generate abrechnung in < 1 second
- [ ] Export completes in < 500ms
- [ ] No memory leaks (memory returns to baseline after operation)
- [ ] No console errors or warnings
- [ ] No UI jank (60 FPS maintained)

### 6.3.4 Monitoring in Production

Add optional performance reporting:

```javascript
// Opt-in performance monitoring (can be disabled in config)
if (window.ENABLE_PERF_REPORTING) {
  subscribe((state) => {
    // Optional: Send timing data to analytics server
    if (state.ui.import.status === 'success') {
      console.log('Import timing:', {
        duration: Date.now() - importStartTime,
        positionCount: state.protokollData.positionen.length
      });
    }
  });
}
```

---

## 6.4 Accessibility Audit

### Objective

Ensure application meets WCAG 2.1 AA accessibility standards.

### 6.4.1 Automated Testing

Use axe DevTools browser extension or similar:

1. Open browser DevTools
2. Install axe DevTools extension
3. Run scan
4. Fix identified issues

Common issues to check for:

- Color contrast (text vs. background)
- Missing ARIA labels
- Keyboard navigation issues
- Missing alt text
- Heading hierarchy

### 6.4.2 Manual Accessibility Checks

#### Keyboard Navigation

- Navigate using only Tab, Shift+Tab, Enter, Space
- All buttons should be reachable
- Focus should be visible (not hidden)
- No keyboard traps

#### Screen Reader Testing

- Use NVDA (Windows) or VoiceOver (macOS)
- Verify all interactive elements are announced
- Verify status messages are read aloud (aria-live)
- Verify form labels are associated with inputs

#### Color Contrast

Check all text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text):

```css
/* Verify these in DevTools */
#status-message {
  /* Text color vs background must be 4.5:1 or higher */
  color: #333333;  /* Dark gray */
  background: #ffffff;  /* White */
  /* Contrast: 12:1 ✓ */
}
```

### 6.4.3 Accessibility Checklist

- [ ] All buttons have descriptive text
- [ ] All inputs have associated labels
- [ ] Color is not sole means of conveying information
- [ ] Keyboard navigation works fully
- [ ] Focus indicators are visible
- [ ] Page has proper heading hierarchy
- [ ] Status messages use aria-live
- [ ] Images have alt text (if any)
- [ ] Links have descriptive text
- [ ] Contrast ratios meet WCAG AA (4.5:1)

### 6.4.4 Accessibility Improvements to Make

Common improvements needed:

```html
<!-- Before: Not accessible -->
<input type="file" />
<button>Import</button>

<!-- After: Accessible -->
<label for="file-input">Protokoll-Datei (.xlsx)</label>
<input 
  id="file-input" 
  type="file" 
  accept=".xlsx"
  aria-describedby="file-help"
/>
<p id="file-help">Nur lokal im Browser verarbeitet</p>
<button id="import-button" type="button">Datei importieren</button>
```

---

## 6.5 Security Review

### Objective

Identify and mitigate security risks in file handling and data processing.

### 6.5.1 File Upload Security

**Risk**: Malicious Excel files could exploit SheetJS or browser

**Mitigations**:
- Validate file MIME type and extension (already done)
- Limit file size (add check if needed)
- Run in sandboxed context (browser file input already is sandboxed)
- Only accept .xlsx files

```javascript
// Existing validation in readExcelFile
const validMimeTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
];

if (!validMimeTypes.includes(fileType) && !fileName.endsWith('.xlsx')) {
  throw new Error(`Invalid file type: ${fileType}`);
}

// Add file size check
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
if (file.size > MAX_FILE_SIZE) {
  throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
}
```

### 6.5.2 XSS Prevention

**Risk**: User-provided data (from Excel cells) displayed in DOM without sanitization

**Mitigations**:
- Use `textContent` instead of `innerHTML` where possible
- Escape HTML special characters
- Use trusted methods for DOM updates

```javascript
// Existing helper already in place
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Usage in error alerts
export function showErrorAlert(title, message) {
  const alertElement = document.createElement('div');
  alertElement.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(message)}</p>
  `;
}
```

### 6.5.3 Data Validation

**Risk**: Invalid data could corrupt state or cause errors

**Mitigations**:
- Validate all imported data
- Type-check function parameters
- Throw errors on unexpected data

```javascript
// Example validation in handlers
if (!state.protokollData || !state.protokollData.metadata) {
  throw new Error('Invalid state: missing protokollData');
}

if (typeof metadata !== 'object') {
  throw new Error('Invalid metadata: not an object');
}

if (typeof metadata.orderNumber !== 'string' || !metadata.orderNumber.trim()) {
  throw new Error('Invalid metadata: orderNumber must be non-empty string');
}
```

### 6.5.4 Storage Security

**Risk**: Sensitive data in localStorage could be accessed by other scripts

**Mitigations**:
- Don't store sensitive passwords or tokens
- Clear data on logout/reset
- Use HTTPS in production (encryption in transit)

```javascript
// Only store non-sensitive data
{
  protokollData: {
    metadata: { /* Non-sensitive metadata */ }
  },
  ui: { /* UI state */ }
  // Never store: passwords, API keys, personal data
}
```

### 6.5.5 Security Checklist

- [ ] File MIME type validation
- [ ] File size limits enforced
- [ ] XSS prevention with HTML escaping
- [ ] Input validation on all external data
- [ ] Error handling doesn't leak sensitive info
- [ ] localStorage doesn't contain secrets
- [ ] HTTPS used in production
- [ ] No eval() or similar dynamic code execution
- [ ] External libraries (SheetJS) kept up-to-date

---

## 6.6 Phase 6 Deliverables & Exit Criteria

To consider Phase 6 complete, ensure the following:

### Testing Deliverables

- [ ] Jest configuration with `jest.config.js`
- [ ] Unit tests for state.js (95%+ coverage)
- [ ] Unit tests for utils.js (90%+ coverage)
- [ ] Unit tests for handlers.js (80%+ coverage)
- [ ] Integration tests for complete workflows
- [ ] All tests passing locally (`npm test`)
- [ ] Coverage report showing ≥85% overall

### Documentation Deliverables

- [ ] `docs/ARCHITECTURE.md` - Complete system overview
- [ ] `docs/API.md` - Full API reference
- [ ] `docs/TROUBLESHOOTING.md` - User troubleshooting guide
- [ ] All functions have JSDoc comments
- [ ] `README.md` in root with setup instructions

### Performance Deliverables

- [ ] Import workflow: < 2 seconds for 1000-row file
- [ ] Generate workflow: < 1 second
- [ ] Export workflow: < 500ms
- [ ] No memory leaks after operations
- [ ] No UI jank (60 FPS maintained)
- [ ] Performance profiling recorded and analyzed

### Accessibility Deliverables

- [ ] WCAG 2.1 AA audit completed
- [ ] Keyboard navigation fully functional
- [ ] Color contrast ≥ 4.5:1
- [ ] aria-live regions for status updates
- [ ] All forms have associated labels
- [ ] Screen reader tested (NVDA or VoiceOver)

### Security Deliverables

- [ ] File type validation implemented
- [ ] XSS prevention with HTML escaping
- [ ] Input validation on all external data
- [ ] Security review documented
- [ ] No sensitive data in localStorage
- [ ] Error handling doesn't leak information

### Production Readiness

- [ ] No console errors or warnings
- [ ] All workflows tested end-to-end
- [ ] Error handling graceful in all scenarios
- [ ] State persistence works reliably
- [ ] Deployment configuration documented
- [ ] Runbook for XAMPP deployment created

---

## 6.7 Deployment & Launch

### 6.7.1 Pre-Launch Checklist

- [ ] All Phase 5 & 6 requirements met
- [ ] Testing complete and all tests passing
- [ ] Performance targets met
- [ ] Accessibility audit completed
- [ ] Security review completed
- [ ] Documentation complete and reviewed
- [ ] User manual prepared
- [ ] Support contacts configured

### 6.7.2 XAMPP Deployment

See Phase 1 for detailed XAMPP setup. Quick reference:

```bash
# 1. Copy project to htdocs
cp -r abrechnung-app /path/to/xampp/htdocs/

# 2. Start XAMPP Apache

# 3. Access application
# Open browser: http://localhost/abrechnung-app
```

### 6.7.3 Post-Launch

- Monitor for errors in production
- Collect user feedback
- Track performance metrics
- Plan Phase 7 enhancements (if needed)

---

## Next Steps: Phase 7 (Optional)

With Phase 6 complete, the application is production-ready. Phase 7 could include:

- **Advanced Features**: Batch processing, template selection, undo/redo
- **Enhancements**: Multi-language support, advanced filtering
- **Integration**: API support, database storage, team collaboration
- **Analytics**: Usage tracking, performance monitoring

---

**Phase 6 Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Ready for Implementation