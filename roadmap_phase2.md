# Phase 2: State Management & Data Layer

## Overview

Phase 2 focuses on designing and implementing the **centralized application state** and the **data layer** for the Abrechnung Application. This phase typically covers **Weeks 2–3** and builds directly on the project setup and UI skeleton created in Phase 1.

The key goals of Phase 2 are:

- Define a clear, extensible **state structure** for all application data
- Implement **state access and update APIs** with predictable behavior
- Introduce an **event-driven stateChanged mechanism** so UI and logic modules can react to changes
- Add **localStorage persistence** for fault-tolerant, session-resilient behavior
- Integrate **validation** to protect state integrity

By the end of Phase 2, the application will have a robust data backbone that supports further development in utilities, handlers, and UI logic.

---

## 2.1 State Module (state.js)

### Objective

Design and implement a **single source of truth** for all application data in `state.js`, using a clean, modular API:

- Encapsulate internal state (no direct mutation from other modules)
- Expose controlled getters and setters
- Fire events when state changes so other modules can update reactively
- Keep state structure stable, predictable, and easy to reason about

### State Design Principles

1. **Single Responsibility:** `state.js` manages only data, not DOM or business logic
2. **Immutable Updates Pattern:** Treat updates as new snapshots (via shallow or deep merges) to avoid side effects
3. **Explicit Interfaces:** Use small, focused functions like `getState`, `setState`, and `clearState`
4. **Event-driven Updates:** Consumers subscribe to `stateChanged` instead of polling or tight coupling
5. **Persistence-aware:** State structure is designed to be serializable to JSON for localStorage

### Proposed State Shape

A recommended initial state structure:

```javascript
// js/state.js

const initialState = {
  protokollData: {
    metadata: {
      protocolNumber: null,   // e.g. "P-2025-001"
      orderNumber: null,      // e.g. "A-12345"
      plant: null,            // Anlage
      location: null,         // Einsatzort
      company: null,          // Firma
      date: null              // ISO string, e.g. "2025-12-09"
    },
    positionen: [
      // { posNr: string, menge: number }
    ]
  },
  abrechnungData: {
    header: {
      date: null,
      orderNumber: null,
      plant: null,
      location: null
    },
    positionen: {
      // key: posNr, value: totalMenge
      // e.g. "01.01.0010": 5
    }
  },
  ui: {
    import: {
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      fileName: '',
      fileSize: 0,
      importedAt: null
    },
    generate: {
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      positionCount: 0,
      uniquePositionCount: 0,
      generationTimeMs: 0
    },
    export: {
      status: 'idle',       // 'idle' | 'pending' | 'success' | 'error'
      message: '',
      lastExportAt: null,
      lastExportSize: 0
    }
  },
  meta: {
    version: '1.0.0',
    lastUpdated: null
  }
};
```

This structure can evolve over time but should remain backward compatible when possible, especially because it is persisted in localStorage.

### Implementing the Core State Logic

Create `js/state.js` with these responsibilities:

- Maintain an **internal mutable variable** for the current state
- Provide `getState()` that returns a **read-only clone** (to prevent external mutation)
- Provide `setState(updates)` to merge changes and trigger events
- Expose `subscribe(listener)` and `unsubscribe(listener)` helpers for stateChanged events

```javascript
// js/state.js

const STORAGE_KEY = 'abrechnungAppState_v1';

let currentState = structuredClone(initialState);

const listeners = new Set();

function notifyListeners() {
  const snapshot = getState();
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('State listener error:', err);
    }
  });

  // Also dispatch a DOM event for non-module consumers if needed
  document.dispatchEvent(new CustomEvent('stateChanged', {
    detail: snapshot
  }));
}

export function getState() {
  // Return a defensive copy to prevent external mutation
  return structuredClone(currentState);
}

export function setState(partialUpdates, options = { silent: false }) {
  // Shallow-merge top-level keys
  const prevState = currentState;

  currentState = {
    ...prevState,
    ...partialUpdates,
    meta: {
      ...prevState.meta,
      lastUpdated: new Date().toISOString()
    }
  };

  // Optionally persist and notify
  if (!options.silent) {
    saveStateToStorage();
    notifyListeners();
  }

  return getState();
}

export function resetState(options = { persist: true, silent: false }) {
  currentState = structuredClone(initialState);

  if (options.persist) {
    saveStateToStorage();
  }

  if (!options.silent) {
    notifyListeners();
  }

  return getState();
}

export function subscribe(listener) {
  if (typeof listener !== 'function') {
    throw new Error('State listener must be a function');
  }
  listeners.add(listener);

  // Optionally return unsubscribe
  return () => unsubscribe(listener);
}

export function unsubscribe(listener) {
  listeners.delete(listener);
}
```

This module is intentionally free of any UI logic or Excel-specific code. It only knows about data structures and persistence.

---

## 2.2 localStorage Integration

### Objective

Persist the application state in `localStorage` so that users can:

- Close and reopen the browser without losing data
- Recover from page reloads or crashes
- Optionally clear or reset the stored state when needed

### Design Considerations

- **Key Naming:** Use a stable, versioned key like `abrechnungAppState_v1`
- **Serialization:** Use `JSON.stringify` / `JSON.parse`
- **Resilience:** If stored data is corrupted, reset gracefully to `initialState`
- **Security:** Only store non-sensitive data (which is the case here)

### Implementation in state.js

Extend `js/state.js` with persistence helpers:

```javascript
// js/state.js (continued)

function saveStateToStorage() {
  try {
    const serialized = JSON.stringify(currentState);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

export function loadStateFromStorage() {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      console.log('No saved state found in localStorage. Using initial state.');
      currentState = structuredClone(initialState);
      return getState();
    }

    const parsed = JSON.parse(serialized);
    // Optional: run validation before accepting
    currentState = {
      ...structuredClone(initialState),
      ...parsed
    };

    console.log('State successfully loaded from localStorage');
    notifyListeners();
    return getState();
  } catch (error) {
    console.error('Failed to load state from localStorage. Resetting to initial state.', error);
    currentState = structuredClone(initialState);
    saveStateToStorage();
    notifyListeners();
    return getState();
  }
}

export function clearPersistedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    console.log('Persisted state cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear persisted state from localStorage:', error);
  }
}
```

### Initialization in main.js

In `js/main.js`, call `loadStateFromStorage()` during application bootstrap:

```javascript
// js/main.js

import { loadStateFromStorage, subscribe } from './state.js';

console.log('=== Abrechnung Application Initializing (Phase 2) ===');

// 1. Load persisted state
const initialState = loadStateFromStorage();
console.log('Initial state:', initialState);

// 2. Subscribe to state changes for debugging
subscribe((nextState) => {
  console.log('State changed:', nextState);
});

// Further initialization (handlers, UI binding) will follow in later phases
```

### Error Handling Strategy

- If `JSON.parse` fails (corrupted data), reset to `initialState` and overwrite the corrupted value
- If `localStorage` is unavailable or disabled, log a warning and continue with in-memory state only
- Always fail gracefully: the app should still work without persistence

### Verification Checklist

- [ ] State is saved automatically whenever `setState` is called
- [ ] Reloading the page restores the last known state
- [ ] Removing the key from devtools resets to initial state
- [ ] Corrupted data in localStorage does not break the app
- [ ] `clearPersistedState()` removes the key

---

## 2.3 State Validation

### Objective

Introduce **validation rules** to ensure that any data entering the state meets expected structural and type requirements. This protects downstream logic (Excel processing, UI rendering) and simplifies debugging.

Validation is especially important when:

- Parsing external files (Excel)
- Loading persisted state from localStorage
- Applying updates from handlers

### Validation Strategy

1. **Schema-like Functions:** Implement lightweight, code-based validation functions in `state.js` or a dedicated `validation.js`
2. **Fail Fast:** When invalid data is detected, throw errors or return clear error objects
3. **Non-blocking UI:** Surface validation errors as user-friendly messages instead of silent failures

### Protokoll Data Validation

Create validation helpers, for example in `js/state.js` or `js/validation.js`:

```javascript
// js/validation.js

export function validateMetadata(metadata) {
  const errors = [];

  if (!metadata) {
    errors.push('Metadata is missing');
    return { valid: false, errors };
  }

  if (!metadata.protocolNumber) {
    errors.push('Protocol number is required');
  }

  if (!metadata.orderNumber) {
    errors.push('Order number is required');
  }

  if (!metadata.plant) {
    errors.push('Plant (Anlage) is required');
  }

  if (!metadata.location) {
    errors.push('Location (Einsatzort) is required');
  }

  if (!metadata.company) {
    errors.push('Company (Firma) is required');
  }

  if (!metadata.date) {
    errors.push('Date is required');
  } else if (isNaN(Date.parse(metadata.date))) {
    errors.push('Date must be a valid date string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validatePositions(positionen) {
  const errors = [];

  if (!Array.isArray(positionen)) {
    return {
      valid: false,
      errors: ['Positions must be an array']
    };
  }

  positionen.forEach((pos, index) => {
    if (!pos || typeof pos !== 'object') {
      errors.push(`Position at index ${index} is not an object`);
      return;
    }

    if (!pos.posNr || typeof pos.posNr !== 'string') {
      errors.push(`Position at index ${index} has invalid posNr`);
    }

    if (typeof pos.menge !== 'number' || Number.isNaN(pos.menge)) {
      errors.push(`Position at index ${index} has invalid menge`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateAbrechnungData(abrechnungData) {
  const errors = [];

  if (!abrechnungData || typeof abrechnungData !== 'object') {
    return { valid: false, errors: ['abrechnungData is missing or invalid'] };
  }

  if (!abrechnungData.header) {
    errors.push('Abrechnung header is missing');
  }

  if (!abrechnungData.positionen || typeof abrechnungData.positionen !== 'object') {
    errors.push('Abrechnung positions must be an object map');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Integrating Validation with State Updates

In handlers (Phase 4), validation will be used before committing data to state. However, some validation can also be enforced **inside** the state module for critical structures.

For example, when setting `protokollData`:

```javascript
// Example pattern for a dedicated update function in state.js

import { validateMetadata, validatePositions } from './validation.js';

export function updateProtokollData({ metadata, positionen }) {
  const metaResult = validateMetadata(metadata);
  const posResult = validatePositions(positionen);

  const allErrors = [...metaResult.errors, ...posResult.errors];

  if (allErrors.length > 0) {
    const error = new Error('Invalid protokoll data');
    error.details = allErrors;
    throw error;
  }

  return setState({
    protokollData: {
      metadata,
      positionen
    }
  });
}
```

This approach keeps validation and mutation logic close together, reducing the chance of inconsistent state.

### Validation on Load

When loading from localStorage, optionally run a light validation:

```javascript
// Inside loadStateFromStorage

const parsed = JSON.parse(serialized);
// Optionally: validate critical sections and fallback if invalid
try {
  // Minimal checks here; deeper checks can happen later
  if (!parsed.meta || !parsed.protokollData || !parsed.abrechnungData) {
    throw new Error('Missing critical sections in persisted state');
  }
  currentState = {
    ...structuredClone(initialState),
    ...parsed
  };
} catch (e) {
  console.warn('Persisted state failed validation. Resetting to initial state.', e);
  currentState = structuredClone(initialState);
}
```

### Verification Checklist

- [ ] Validation functions exist for metadata, positions, and abrechnungData
- [ ] Invalid data produces clear error messages
- [ ] Handlers reject invalid data instead of silently accepting it
- [ ] localStorage loading does not accept obviously broken structures

---

## 2.4 Event-Driven State Updates

### Objective

Allow other modules (handlers, renderers, utilities) to **react** to state changes in a decoupled way. This is done through:

- A simple **publish/subscribe system** inside `state.js` (`subscribe`, `unsubscribe`)
- A DOM-level `stateChanged` event for non-module consumers if needed

### Usage Pattern

In `main.js` or UI-specific modules (Phase 4 and 5), consumers can subscribe as follows:

```javascript
// Example usage in a UI module

import { subscribe } from './state.js';

function handleStateChange(nextState) {
  // Update UI sections based on nextState
  // e.g. enable/disable buttons, update text, etc.
}

// Subscribe once during initialization
subscribe(handleStateChange);
```

Alternatively, for legacy or non-module scripts:

```javascript
// Listening to DOM CustomEvent

document.addEventListener('stateChanged', (event) => {
  const state = event.detail;
  console.log('DOM-level stateChanged event received', state);
});
```

This architecture keeps **state changes centralized** and makes the application reactive without frameworks.

### Event Firing Rules

- `notifyListeners()` is called automatically after every successful `setState()` or `resetState()` (unless `silent: true` is passed)
- Listeners must be **idempotent** and fast; slow listeners can degrade user experience
- Errors thrown inside a listener are caught and logged but do not prevent other listeners from running

### Verification Checklist

- [ ] Subscribing and unsubscribing works without memory leaks
- [ ] Listeners receive the latest snapshot of the state
- [ ] stateChanged DOM event fires on every state update (if enabled)
- [ ] UI logic remains outside `state.js`

---

## 2.5 Helper Update Functions (Optional but Recommended)

### Objective

Provide **high-level, domain-specific helpers** to mutate state consistently. Instead of calling `setState` with arbitrary shapes all over the codebase, centralize key mutations in named functions.

Example helpers in `state.js`:

```javascript
// js/state.js (domain helpers)

export function setImportStatus(partial) {
  return setState({
    ui: {
      ...currentState.ui,
      import: {
        ...currentState.ui.import,
        ...partial
      }
    }
  });
}

export function setGenerateStatus(partial) {
  return setState({
    ui: {
      ...currentState.ui,
      generate: {
        ...currentState.ui.generate,
        ...partial
      }
    }
  });
}

export function setExportStatus(partial) {
  return setState({
    ui: {
      ...currentState.ui,
      export: {
        ...currentState.ui.export,
        ...partial
      }
    }
  });
}

export function updateAbrechnungPositions(positionMap) {
  return setState({
    abrechnungData: {
      ...currentState.abrechnungData,
      positionen: positionMap
    }
  });
}
```

These helpers make handlers in later phases more readable and consistent.

---

## Phase 2 Deliverables

At the end of Phase 2, the following should be in place:

1. **Centralized State Module (`state.js`)**
   - `initialState` defined and documented
   - `getState`, `setState`, `resetState` implemented
   - `subscribe` / `unsubscribe` implemented
   - Optional domain-specific helpers for frequent updates

2. **Persistence Layer (localStorage)**
   - `saveStateToStorage`, `loadStateFromStorage`, `clearPersistedState` in place
   - Safe handling of missing, corrupted, or invalid stored data
   - State automatically saved on changes

3. **Validation Layer**
   - `validation.js` or equivalent helpers implemented
   - Validation for metadata, positions, and abrechnungData
   - Invalid data rejected before being stored in state

4. **Event-Driven Architecture**
   - Working pub/sub mechanism for state changes
   - `stateChanged` DOM event (optional but available)
   - No direct DOM manipulation inside `state.js`

### Success Criteria for Phase 2

- ✓ State can be read and updated only via defined API functions
- ✓ localStorage persistence works across page reloads
- ✓ Corrupted or incomplete stored data does not break the app
- ✓ Validation prevents clearly invalid structures from entering the state
- ✓ UI modules can subscribe to state changes without tight coupling
- ✓ No direct DOM operations occur inside the state module

---

## Next Steps: Preparation for Phase 3

With Phase 2 complete, the application is ready for **Phase 3: Utility Functions**. In Phase 3, the focus will be on:

- Implementing Excel reading utilities (using SheetJS)
- Parsing protokoll.xlsx into the state structure defined here
- Computing position summaries by Pos.Nr.
- Preparing abrechnung.xlsx workbooks for export

The robust state and data layer built in Phase 2 will ensure that Excel utilities can rely on clean, validated data and consistent persistence behavior.
