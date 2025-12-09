# Protokoll State API Documentation

## Overview

The `protokoll-state.js` module provides centralized state management for the Protokoll module using ES6 modules and a pub/sub event system.

## State Structure

```javascript
{
  metadata: {
    protokollNumber: string,
    datum: ISO-string,
    auftraggeber: string,
    auftraggaberAdresse: string,
    auftragnummer: string,
    kundennummer: string,
    auftragnehmer: string,
    auftragnehmerAdresse: string,
    facility: {
      name: string,
      address: string,
      anlage: string,
      location: string,
      inventory: string,
      prüfArt: string[],
      netzspannung: string,
      netzform: string,
      netzbetreiber: string
    },
    prüfer: {
      name: string,
      titel: string,
      unterschrift: string
    },
    zeuge: {
      name: string,
      titel: string,
      unterschrift: string
    }
  },
  positions: [
    {
      posNr: string,
      stromkreisNr: string,
      zielbezeichnung: string,
      leitung: { typ, anzahl, querschnitt },
      spannung: { un, fn },
      überstromschutz: { art, inNennstrom, zs, zn, ik },
      messwerte: { riso, schutzleiterWiderstand, rcd, differenzstrom, auslösezeit },
      prüfergebnis: { status, mängel, bemerkung }
    }
  ],
  prüfungsergebnis: {
    mängelFestgestellt: boolean,
    plakette: string,
    nächsterPrüfungstermin: string,
    bemerkung: string
  },
  formState: {
    currentStep: string,  // 'metadata'|'positions'|'results'|'review'
    positionCount: number,
    unsavedChanges: boolean,
    validationErrors: object,
    isDirty: boolean
  }
}
```

## API Methods

### Initialization

| Method | Description |
|--------|-------------|
| `init()` | Initialize state from localStorage or defaults |
| `reset()` | Reset state to initial defaults and clear localStorage |

### Metadata

| Method | Description |
|--------|-------------|
| `getMetadata()` | Get entire metadata object (immutable copy) |
| `setMetadata(metadata)` | Replace entire metadata object |
| `getMetadataField(path)` | Get single field using dot notation (e.g., "facility.name") |
| `setMetadataField(path, value)` | Set single field using dot notation |

### Positions

| Method | Description |
|--------|-------------|
| `getPositions()` | Get all positions array (immutable copy) |
| `addPosition(position)` | Add new position, returns position number |
| `getPosition(posNr)` | Get specific position by number |
| `updatePosition(posNr, updates)` | Update existing position, returns boolean |
| `deletePosition(posNr)` | Delete position, returns boolean |

### Inspection Results

| Method | Description |
|--------|-------------|
| `getPrüfungsergebnis()` | Get inspection results object |
| `setPrüfungsergebnis(results)` | Update inspection results (merges with existing) |

### Form State

| Method | Description |
|--------|-------------|
| `getState()` | Get entire state (immutable deep copy) |
| `getFormState()` | Get form state object |
| `getCurrentStep()` | Get current form step name |
| `setFormStep(step)` | Set current step ('metadata', 'positions', 'results', 'review') |
| `hasUnsavedChanges()` | Check if state has unsaved changes |
| `isDirty()` | Check if state has been modified |
| `markUnsaved()` | Mark state as having unsaved changes |
| `clearUnsaved()` | Clear unsaved changes flag |

### Validation

| Method | Description |
|--------|-------------|
| `getValidationErrors()` | Get all validation errors object |
| `setValidationError(fieldPath, error)` | Set error for field, or null to clear |
| `setValidationErrors(errors)` | Replace all validation errors |
| `clearValidationErrors()` | Clear all validation errors |

### Persistence

| Method | Description |
|--------|-------------|
| `saveToLocalStorage()` | Debounced save (3 second delay) |
| `forceSave()` | Immediate save (bypasses debounce) |
| `loadFromLocalStorage()` | Load state from localStorage, returns boolean |
| `clearLocalStorage()` | Clear all persisted state |

### Events

| Method | Description |
|--------|-------------|
| `on(eventName, callback)` | Subscribe to event, returns unsubscribe function |
| `off(eventName, callback)` | Unsubscribe from event |
| `emit(eventName, data)` | Emit event with optional data |

## Event Types

| Event | Data | Triggered When |
|-------|------|----------------|
| `metadataChanged` | `{ metadata }` | Entire metadata replaced |
| `metadataFieldChanged` | `{ fieldPath, value }` | Single metadata field changed |
| `positionAdded` | `{ position }` | New position added |
| `positionUpdated` | `{ posNr, position }` | Position updated |
| `positionDeleted` | `{ posNr }` | Position deleted |
| `prüfungsergebnisChanged` | `{ results }` | Inspection results changed |
| `formStepChanged` | `{ oldStep, newStep }` | Form step changed |
| `validationErrorChanged` | `{ fieldPath, error }` | Single validation error changed |
| `validationErrorsChanged` | `{ errors }` | All validation errors replaced |
| `validationErrorsCleared` | `{}` | All validation errors cleared |
| `stateSaved` | `{ timestamp, forced? }` | State saved to localStorage |
| `stateLoaded` | `{ state }` | State loaded from localStorage |
| `storageCleared` | `{}` | localStorage cleared |
| `stateReset` | `{}` | State reset to defaults |

## Usage Examples

### Basic Usage

```javascript
import * as protokollState from './js/protokoll/protokoll-state.js';

// Initialize on app start
protokollState.init();

// Set metadata
protokollState.setMetadataField('auftraggeber', 'Test Company');
protokollState.setMetadataField('facility.name', 'Main Factory');

// Add positions
const posNr = protokollState.addPosition({
  stromkreisNr: 'F1',
  zielbezeichnung: 'Main Power Distribution',
  messwerte: {
    riso: '> 500MΩ'
  }
});

// Update position
protokollState.updatePosition(posNr, {
  prüfergebnis: {
    status: 'ok',
    bemerkung: 'All values within limits'
  }
});

// Set inspection results
protokollState.setPrüfungsergebnis({
  mängelFestgestellt: false,
  plakette: 'ja',
  nächsterPrüfungstermin: '2026-12-09'
});

// Force save before page unload
window.addEventListener('beforeunload', () => {
  protokollState.forceSave();
});
```

### Event Subscription

```javascript
// Subscribe to metadata changes
const unsubscribe = protokollState.on('metadataFieldChanged', (data) => {
  console.log(`Field ${data.fieldPath} changed to:`, data.value);
});

// Later: unsubscribe when no longer needed
unsubscribe();

// Or use off() directly
protokollState.off('metadataFieldChanged', myCallback);
```

### Form Validation

```javascript
// Set validation errors
protokollState.setValidationError('metadata.auftraggeber', 'This field is required');
protokollState.setValidationError('metadata.facility.name', 'Please enter facility name');

// Check for errors
const errors = protokollState.getValidationErrors();
if (Object.keys(errors).length > 0) {
  console.log('Form has validation errors:', errors);
}

// Clear specific error
protokollState.setValidationError('metadata.auftraggeber', null);

// Clear all errors
protokollState.clearValidationErrors();
```

### State Persistence

```javascript
// State is automatically saved with debouncing
protokollState.setMetadataField('auftraggeber', 'Company A');
// Wait 3 seconds... state is saved

// Force immediate save
protokollState.forceSave();

// Load saved state (e.g., on page reload)
const loaded = protokollState.loadFromLocalStorage();
if (loaded) {
  console.log('State restored from localStorage');
} else {
  console.log('No saved state found');
}

// Clear all persisted data
protokollState.clearLocalStorage();
```

## Testing Instructions

```bash
# Run tests
npm test -- protokoll-state.test.js

# Run with coverage
npm test -- --coverage protokoll-state.test.js

# Watch mode
npm test -- --watch protokoll-state.test.js
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| State not persisting | localStorage quota exceeded | Clear old drafts |
| Events not firing | Listener not registered | Check event name spelling |
| Nested values undefined | Wrong path syntax | Use dot notation: "a.b.c" |
| Performance slow | Too many listeners | Unsubscribe unused listeners |
| Stale state after update | Mutation of returned copy | Always use setters to modify state |

## Design Principles

1. **Immutability**: All getters return deep copies to prevent external mutations
2. **Event-Driven**: Changes emit events for reactive UI updates
3. **Encapsulation**: State is private, access only through exported functions
4. **Persistence**: Automatic debounced saves to localStorage
5. **Validation-Ready**: Built-in validation error tracking per field
