/**
 * messgeraet-handlers.js
 * 
 * Event handlers for user interactions with the Messgerät module.
 * Coordinates between DOM events, validation, state management, and UI updates.
 */

import * as state from './messgeraet-state.js';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize event handlers
 * @returns {void}
 */
export function init() {
  console.log('Initializing Messgerät Handlers');

  // Set up event delegation
  setupEventDelegation();

  // Set up state listeners
  setupStateListeners();

  console.log('✓ Messgerät event handlers initialized');
}

/**
 * Set up event delegation on the form container
 * @returns {void}
 */
function setupEventDelegation() {
  // Delegate button click events
  document.addEventListener('click', handleButtonClick);
}

/**
 * Set up listeners for state change events
 * @returns {void}
 */
function setupStateListeners() {
  state.on('deviceAdded', ({ device }) => {
    document.dispatchEvent(new CustomEvent('messgeraet:renderDevices', {
      detail: { action: 'added', device }
    }));
  });

  state.on('deviceUpdated', ({ deviceId, device }) => {
    document.dispatchEvent(new CustomEvent('messgeraet:renderDevices', {
      detail: { action: 'updated', deviceId, device }
    }));
  });

  state.on('deviceDeleted', ({ deviceId }) => {
    document.dispatchEvent(new CustomEvent('messgeraet:renderDevices', {
      detail: { action: 'deleted', deviceId }
    }));
  });

  state.on('editingDeviceChanged', ({ deviceId }) => {
    document.dispatchEvent(new CustomEvent('messgeraet:editingChanged', {
      detail: { deviceId }
    }));
  });

  state.on('validationErrorChanged', ({ fieldName, error }) => {
    document.dispatchEvent(new CustomEvent('messgeraet:validationError', {
      detail: { fieldName, error }
    }));
  });
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate device data
 * @param {Object} device - Device data to validate
 * @returns {Object} Validation result {isValid, errors}
 */
export function validateDevice(device) {
  const errors = {};

  // Name is required
  if (!device.name || device.name.trim() === '') {
    errors.name = 'Name ist erforderlich';
  } else if (device.name.length > 100) {
    errors.name = 'Name darf maximal 100 Zeichen haben';
  }

  // Type is required
  if (!device.type || device.type.trim() === '') {
    errors.type = 'Typ ist erforderlich';
  }

  // Ident-Nr validation (optional but if provided, format check)
  if (device.identNr && device.identNr.length > 50) {
    errors.identNr = 'Ident-Nr. darf maximal 50 Zeichen haben';
  }

  // Calibration date validation (optional but if provided, must be valid date)
  if (device.calibrationDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(device.calibrationDate)) {
      errors.calibrationDate = 'Ungültiges Datumsformat';
    } else {
      const date = new Date(device.calibrationDate);
      if (isNaN(date.getTime())) {
        errors.calibrationDate = 'Ungültiges Datum';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ============================================
// DEVICE HANDLERS
// ============================================

/**
 * Handle adding a new device
 * @param {Object} deviceData - Device data from form
 * @returns {string|null} Device ID or null if validation failed
 */
export function handleAddDevice(deviceData) {
  // Validate
  const validation = validateDevice(deviceData);

  if (!validation.isValid) {
    // Set validation errors
    Object.entries(validation.errors).forEach(([field, error]) => {
      state.setValidationError(field, error);
    });

    document.dispatchEvent(new CustomEvent('messgeraet:message', {
      detail: { type: 'error', message: 'Bitte korrigieren Sie die markierten Felder.' }
    }));

    return null;
  }

  // Clear any previous errors
  state.clearValidationErrors();

  // Add device
  const deviceId = state.addDevice(deviceData);

  if (deviceId) {
    document.dispatchEvent(new CustomEvent('messgeraet:message', {
      detail: { type: 'success', message: 'Messgerät erfolgreich hinzugefügt.' }
    }));

    // Clear editing state
    state.setEditingDevice(null);
  }

  return deviceId;
}

/**
 * Handle updating a device
 * @param {string} deviceId - Device ID
 * @param {Object} deviceData - Updated device data
 * @returns {boolean} Success
 */
export function handleUpdateDevice(deviceId, deviceData) {
  // Validate
  const validation = validateDevice(deviceData);

  if (!validation.isValid) {
    // Set validation errors
    Object.entries(validation.errors).forEach(([field, error]) => {
      state.setValidationError(field, error);
    });

    document.dispatchEvent(new CustomEvent('messgeraet:message', {
      detail: { type: 'error', message: 'Bitte korrigieren Sie die markierten Felder.' }
    }));

    return false;
  }

  // Clear any previous errors
  state.clearValidationErrors();

  // Update device
  const success = state.updateDevice(deviceId, deviceData);

  if (success) {
    document.dispatchEvent(new CustomEvent('messgeraet:message', {
      detail: { type: 'success', message: 'Messgerät erfolgreich aktualisiert.' }
    }));

    // Clear editing state
    state.setEditingDevice(null);
  }

  return success;
}

/**
 * Handle deleting a device
 * @param {string} deviceId - Device ID
 * @param {boolean} skipConfirm - Skip confirmation dialog
 * @returns {boolean} Success
 */
export function handleDeleteDevice(deviceId, skipConfirm = false) {
  if (!skipConfirm) {
    const device = state.getDevice(deviceId);
    const deviceName = device?.name || deviceId;
    const confirmed = confirm(`Möchten Sie das Messgerät "${deviceName}" wirklich löschen?`);
    if (!confirmed) {
      return false;
    }
  }

  const success = state.deleteDevice(deviceId);

  if (success) {
    document.dispatchEvent(new CustomEvent('messgeraet:message', {
      detail: { type: 'success', message: 'Messgerät erfolgreich gelöscht.' }
    }));
  }

  return success;
}

/**
 * Handle starting to edit a device
 * @param {string} deviceId - Device ID
 * @returns {void}
 */
export function handleEditDevice(deviceId) {
  state.setEditingDevice(deviceId);
}

/**
 * Handle canceling edit
 * @returns {void}
 */
export function handleCancelEdit() {
  state.setEditingDevice(null);
  state.clearValidationErrors();
}

/**
 * Handle search input change
 * @param {string} term - Search term
 * @returns {void}
 */
export function handleSearchChange(term) {
  state.setSearchTerm(term);
  document.dispatchEvent(new CustomEvent('messgeraet:renderDevices', {
    detail: { action: 'filter' }
  }));
}

/**
 * Handle filter type change
 * @param {string} type - Device type to filter
 * @returns {void}
 */
export function handleFilterTypeChange(type) {
  state.setFilterType(type);
  document.dispatchEvent(new CustomEvent('messgeraet:renderDevices', {
    detail: { action: 'filter' }
  }));
}

// ============================================
// BUTTON CLICK HANDLER
// ============================================

/**
 * Handle button click events via delegation
 * @param {Event} e - Click event
 * @returns {void}
 */
function handleButtonClick(e) {
  const button = e.target.closest('[data-messgeraet-action]');
  if (!button) return;

  const action = button.getAttribute('data-messgeraet-action');
  const deviceId = button.getAttribute('data-device-id');

  switch (action) {
    case 'add':
      // Open add form
      state.setEditingDevice(null);
      document.dispatchEvent(new CustomEvent('messgeraet:showForm', {
        detail: { mode: 'add' }
      }));
      break;

    case 'edit':
      if (deviceId) {
        handleEditDevice(deviceId);
        document.dispatchEvent(new CustomEvent('messgeraet:showForm', {
          detail: { mode: 'edit', deviceId }
        }));
      }
      break;

    case 'delete':
      if (deviceId) {
        handleDeleteDevice(deviceId);
      }
      break;

    case 'cancel':
      handleCancelEdit();
      document.dispatchEvent(new CustomEvent('messgeraet:hideForm', {}));
      break;

    case 'save':
      // Form submission is handled by the form submit event
      break;

    default:
      console.warn(`Unknown messgeraet action: ${action}`);
  }
}

/**
 * Handle form submission
 * @param {Event} e - Submit event
 * @param {HTMLFormElement} form - Form element
 * @returns {void}
 */
export function handleFormSubmit(e, form) {
  e.preventDefault();

  const formData = new FormData(form);
  const deviceData = {
    name: formData.get('name')?.trim() || '',
    type: formData.get('type')?.trim() || '',
    fabrikat: formData.get('fabrikat')?.trim() || '',
    calibrationDate: formData.get('calibrationDate') || '',
    identNr: formData.get('identNr')?.trim() || ''
  };

  const formState = state.getFormState();

  if (formState.editingDeviceId) {
    // Update existing device
    handleUpdateDevice(formState.editingDeviceId, deviceData);
  } else {
    // Add new device
    handleAddDevice(deviceData);
  }
}

console.log('✓ Messgerät Handlers module loaded');
