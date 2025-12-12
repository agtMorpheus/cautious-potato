/**
 * messgeraet-state.js
 * 
 * Centralized state management for the Messgerät (Measurement Devices) module.
 * Manages measurement device data: name, type, calibration date, id.
 * Persists state to localStorage and provides event-driven updates.
 * 
 * Export Pattern: ES6 Modules (export function)
 * State Access: Functions only (encapsulation)
 * Event System: Custom events via EventTarget
 * Persistence: localStorage with automatic debouncing
 */

// ============================================
// PRIVATE STATE (Not exported, encapsulated)
// ============================================

let state = {};
let stateListeners = {};
let saveTimer = null;
const SAVE_DELAY = 1000; // 1 second debounce
const STORAGE_KEY = 'messgeraet_state';

// Device types for measurement equipment
const DEVICE_TYPES = [
  'Isolationsmessgerät',
  'Schleifenimpedanzmessgerät',
  'RCD-Prüfgerät',
  'Multimeter',
  'Spannungsprüfer',
  'Erdungsmessgerät',
  'Leistungsmessgerät',
  'Oszilloskop',
  'Thermografie-Kamera',
  'Drehfeldrichtungsanzeiger',
  'Kombinationsprüfgerät',
  'Sonstiges'
];

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize state from localStorage or defaults
 * Called once when app starts or to reset state for tests
 * @param {Object} options - Optional configuration
 * @param {boolean} options.clearStorage - If true, clears localStorage before initializing (useful for tests)
 * @returns {void}
 */
export function init(options = {}) {
  console.log('Initializing Messgerät State Management');
  
  // Clear localStorage if requested (for test isolation)
  if (options.clearStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✓ localStorage cleared');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
  
  // Reset listeners to prevent memory leaks in tests
  stateListeners = {};
  
  // Try to load from localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  
  if (saved) {
    try {
      state = JSON.parse(saved);
      console.log('✓ Loaded Messgerät state from localStorage');
    } catch (error) {
      console.error('Failed to parse localStorage state:', error);
      initializeDefaults();
    }
  } else {
    initializeDefaults();
  }
  
  // Validate loaded state
  validateStateIntegrity();
  
  console.log('✓ Messgerät state initialized:', state);
}

/**
 * Set up default state structure
 * @returns {void}
 */
function initializeDefaults() {
  state = {
    devices: [],
    formState: {
      editingDeviceId: null,
      unsavedChanges: false,
      validationErrors: {},
      searchTerm: '',
      filterType: ''
    }
  };

  console.log('✓ Initialized default Messgerät state');
}

/**
 * Validate state structure after loading
 * @returns {void}
 */
function validateStateIntegrity() {
  // Check required top-level keys
  if (!state.devices) {
    console.warn('Missing devices array, reinitializing');
    state.devices = [];
  }

  if (!state.formState) {
    state.formState = {
      editingDeviceId: null,
      unsavedChanges: false,
      validationErrors: {},
      searchTerm: '',
      filterType: ''
    };
  }

  // Validate devices array
  if (!Array.isArray(state.devices)) {
    console.warn('Devices not array, converting');
    state.devices = [];
  }

  console.log('✓ Messgerät state integrity validated');
}

// ============================================
// GETTERS (Read-only access)
// ============================================

/**
 * Get entire state (immutable copy)
 * @returns {Object} Deep copy of state
 */
export function getState() {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Get all devices
 * @returns {Array} Array of device objects
 */
export function getDevices() {
  return JSON.parse(JSON.stringify(state.devices));
}

/**
 * Get device by ID
 * @param {string} deviceId - Device ID
 * @returns {Object|null} Device object or null
 */
export function getDevice(deviceId) {
  const device = state.devices.find(d => d.id === deviceId);
  return device ? JSON.parse(JSON.stringify(device)) : null;
}

/**
 * Get devices by type
 * @param {string} type - Device type
 * @returns {Array} Array of device objects
 */
export function getDevicesByType(type) {
  return JSON.parse(JSON.stringify(
    state.devices.filter(d => d.type === type)
  ));
}

/**
 * Get devices with valid calibration (not expired)
 * @returns {Array} Array of device objects with valid calibration
 */
export function getValidDevices() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return JSON.parse(JSON.stringify(
    state.devices.filter(d => {
      if (!d.calibrationDate) return false;
      const calibDate = new Date(d.calibrationDate);
      return calibDate >= today;
    })
  ));
}

/**
 * Get devices formatted for dropdown selection
 * @returns {Array} Array of {id, label} objects for dropdowns
 */
export function getDevicesForDropdown() {
  return state.devices.map(d => ({
    id: d.id,
    label: `${d.name} (${d.type}) - ${d.identNr || 'N/A'}`,
    name: d.name,
    type: d.type,
    fabrikat: d.fabrikat,
    identNr: d.identNr,
    calibrationDate: d.calibrationDate,
    isExpired: isCalibrationExpired(d.calibrationDate)
  }));
}

/**
 * Check if calibration date is expired
 * @param {string} dateStr - Date string
 * @returns {boolean} True if expired
 */
function isCalibrationExpired(dateStr) {
  if (!dateStr) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calibDate = new Date(dateStr);
  return calibDate < today;
}

/**
 * Get form state
 * @returns {Object} Form state object
 */
export function getFormState() {
  return JSON.parse(JSON.stringify(state.formState));
}

/**
 * Get validation errors
 * @returns {Object} Validation errors by field
 */
export function getValidationErrors() {
  return JSON.parse(JSON.stringify(state.formState.validationErrors));
}

/**
 * Check if there are unsaved changes
 * @returns {boolean} Has unsaved changes
 */
export function hasUnsavedChanges() {
  return state.formState.unsavedChanges;
}

/**
 * Get available device types
 * @returns {Array} Array of device type strings
 */
export function getDeviceTypes() {
  return [...DEVICE_TYPES];
}

/**
 * Get device count
 * @returns {number} Number of devices
 */
export function getDeviceCount() {
  return state.devices.length;
}

// ============================================
// SETTERS (Modifying state)
// ============================================

/**
 * Add a new device
 * @param {Object} device - Device object with name, type, calibrationDate
 * @returns {Object} Device object with generated ID
 */
export function addDevice(device) {
  if (!device || typeof device !== 'object') {
    console.error('Invalid device:', device);
    return null;
  }

  // Generate unique ID
  const newDevice = {
    id: generateDeviceId(),
    name: device.name || '',
    type: device.type || 'Sonstiges',
    fabrikat: device.fabrikat || '',
    calibrationDate: device.calibrationDate || '',
    identNr: device.identNr || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.devices.push(newDevice);
  markUnsaved();
  emit('deviceAdded', { device: newDevice });
  saveToLocalStorage();

  return JSON.parse(JSON.stringify(newDevice));
}

/**
 * Update an existing device
 * @param {string} deviceId - Device ID
 * @param {Object} updates - Updated fields
 * @returns {Object|boolean} Updated device object or false if not found
 */
export function updateDevice(deviceId, updates) {
  const index = state.devices.findIndex(d => d.id === deviceId);

  if (index === -1) {
    console.error(`Device not found: ${deviceId}`);
    return false;
  }

  // Merge updates
  state.devices[index] = {
    ...state.devices[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  markUnsaved();
  const updatedDevice = getDevice(deviceId);
  emit('deviceUpdated', { deviceId, device: updatedDevice });
  saveToLocalStorage();

  return true;
}

/**
 * Delete a device
 * @param {string} deviceId - Device ID
 * @returns {boolean} Success
 */
export function deleteDevice(deviceId) {
  const index = state.devices.findIndex(d => d.id === deviceId);

  if (index === -1) {
    console.error(`Device not found: ${deviceId}`);
    return false;
  }

  state.devices.splice(index, 1);
  markUnsaved();
  emit('deviceDeleted', { deviceId });
  saveToLocalStorage();

  return true;
}

/**
 * Set the device being edited
 * @param {string|null} deviceId - Device ID or null to clear
 * @returns {void}
 */
export function setEditingDevice(deviceId) {
  state.formState.editingDeviceId = deviceId;
  emit('editingDeviceChanged', { deviceId });
}

/**
 * Set search term for filtering
 * @param {string} term - Search term
 * @returns {void}
 */
export function setSearchTerm(term) {
  state.formState.searchTerm = term;
  emit('searchTermChanged', { term });
}

/**
 * Set filter by type
 * @param {string} type - Device type to filter by
 * @returns {void}
 */
export function setFilterType(type) {
  state.formState.filterType = type;
  emit('filterTypeChanged', { type });
}

/**
 * Set validation error for a field
 * @param {string} fieldName - Field name
 * @param {string|null} error - Error message or null to clear
 * @returns {void}
 */
export function setValidationError(fieldName, error) {
  if (error) {
    state.formState.validationErrors[fieldName] = error;
  } else {
    delete state.formState.validationErrors[fieldName];
  }

  emit('validationErrorChanged', { fieldName, error });
}

/**
 * Clear all validation errors
 * @returns {void}
 */
export function clearValidationErrors() {
  state.formState.validationErrors = {};
  emit('validationErrorsCleared', {});
}

/**
 * Generic setter for form state fields
 * @param {string} key - Form state key
 * @param {*} value - Value to set
 * @returns {void}
 */
export function setFormState(key, value) {
  if (Object.prototype.hasOwnProperty.call(state.formState, key)) {
    state.formState[key] = value;
    emit('formStateChanged', { key, value });
  } else {
    console.warn(`Unknown form state key: ${key}`);
  }
}

/**
 * Get filtered devices based on current form state filters
 * @returns {Array} Array of filtered device objects
 */
export function getFilteredDevices() {
  let devices = state.devices;
  
  // Apply type filter
  if (state.formState.filterType) {
    devices = devices.filter(d => d.type === state.formState.filterType);
  }
  
  // Apply search term filter
  if (state.formState.searchTerm) {
    const term = state.formState.searchTerm.toLowerCase();
    devices = devices.filter(d => 
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.fabrikat && d.fabrikat.toLowerCase().includes(term)) ||
      (d.identNr && d.identNr.toLowerCase().includes(term))
    );
  }
  
  return JSON.parse(JSON.stringify(devices));
}

/**
 * Search devices based on current search term
 * @returns {Array} Array of matching device objects
 */
export function searchDevices() {
  if (!state.formState.searchTerm) {
    return getDevices();
  }
  
  const term = state.formState.searchTerm.toLowerCase();
  return JSON.parse(JSON.stringify(
    state.devices.filter(d => 
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.fabrikat && d.fabrikat.toLowerCase().includes(term)) ||
      (d.identNr && d.identNr.toLowerCase().includes(term)) ||
      (d.type && d.type.toLowerCase().includes(term))
    )
  ));
}

/**
 * Get devices with expired calibration
 * @returns {Array} Array of devices with expired calibration
 */
export function getExpiredDevices() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return JSON.parse(JSON.stringify(
    state.devices.filter(d => {
      if (!d.calibrationDate) return false;
      const calibDate = new Date(d.calibrationDate);
      return calibDate < today;
    })
  ));
}

/**
 * Get devices with calibration expiring within specified days
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Array of devices expiring soon
 */
export function getDevicesExpiringSoon(days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  return JSON.parse(JSON.stringify(
    state.devices.filter(d => {
      if (!d.calibrationDate) return false;
      const calibDate = new Date(d.calibrationDate);
      // Expiring soon means: not expired yet but within the window
      return calibDate >= today && calibDate <= futureDate;
    })
  ));
}

/**
 * Get devices by manufacturer (fabrikat)
 * @param {string} manufacturer - Manufacturer name
 * @returns {Array} Array of device objects
 */
export function getDevicesByManufacturer(manufacturer) {
  return JSON.parse(JSON.stringify(
    state.devices.filter(d => d.fabrikat === manufacturer)
  ));
}

/**
 * Get valid devices formatted for dropdown selection
 * @returns {Array} Array of {id, label} objects for valid devices only
 */
export function getValidDevicesForDropdown() {
  const validDevices = getValidDevices();
  return validDevices.map(d => ({
    id: d.id,
    label: `${d.name} (${d.type}) - ${d.identNr || 'N/A'}`,
    name: d.name,
    type: d.type,
    fabrikat: d.fabrikat,
    identNr: d.identNr,
    calibrationDate: d.calibrationDate,
    isExpired: isCalibrationExpired(d.calibrationDate)
  }));
}

/**
 * Clear all filters
 * @returns {void}
 */
export function clearFilters() {
  state.formState.searchTerm = '';
  state.formState.filterType = '';
  emit('filtersCleared', {});
}

/**
 * Save state to localStorage (alias for forceSave for API consistency)
 * @returns {void}
 */
export function saveState() {
  forceSave();
}

// ============================================
// STATE MANAGEMENT HELPERS
// ============================================

/**
 * Mark state as having unsaved changes
 * @returns {void}
 */
export function markUnsaved() {
  state.formState.unsavedChanges = true;
}

/**
 * Clear unsaved changes flag
 * @returns {void}
 */
export function clearUnsaved() {
  state.formState.unsavedChanges = false;
}

/**
 * Reset entire state to defaults
 * @returns {void}
 */
export function reset() {
  initializeDefaults();
  clearLocalStorage();
  emit('stateReset', {});
}

// ============================================
// PERSISTENCE (localStorage)
// ============================================

/**
 * Save state to localStorage with debouncing
 * @returns {void}
 */
export function saveToLocalStorage() {
  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // Debounce: wait before saving
  saveTimer = setTimeout(() => {
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, json);
      
      emit('stateSaved', { timestamp: new Date().toISOString() });
      console.log('✓ Messgerät state saved to localStorage');
    } catch (error) {
      console.error('Failed to save Messgerät state:', error);
    }
  }, SAVE_DELAY);
}

/**
 * Force immediate save (bypasses debounce)
 * @returns {void}
 */
export function forceSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  try {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
    emit('stateSaved', { timestamp: new Date().toISOString(), forced: true });
    console.log('✓ Messgerät state force-saved to localStorage');
  } catch (error) {
    console.error('Failed to force save Messgerät state:', error);
  }
}

/**
 * Clear localStorage
 * @returns {void}
 */
export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit('storageCleared', {});
    console.log('✓ Messgerät localStorage cleared');
  } catch (error) {
    console.error('Failed to clear Messgerät localStorage:', error);
  }
}

// ============================================
// EVENT SYSTEM (pub/sub pattern)
// ============================================

/**
 * Subscribe to state change events
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function on(eventName, callback) {
  if (!stateListeners[eventName]) {
    stateListeners[eventName] = [];
  }

  stateListeners[eventName].push(callback);

  // Return unsubscribe function
  return () => off(eventName, callback);
}

/**
 * Unsubscribe from state change events
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 * @returns {void}
 */
export function off(eventName, callback) {
  if (!stateListeners[eventName]) return;

  const index = stateListeners[eventName].indexOf(callback);
  if (index > -1) {
    stateListeners[eventName].splice(index, 1);
  }
}

/**
 * Emit state change event
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 * @returns {void}
 */
export function emit(eventName, data = {}) {
  // Call registered listeners
  if (stateListeners[eventName]) {
    stateListeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  // Also dispatch browser event for cross-module communication
  // Convert camelCase to kebab-case for browser events
  const kebabEventName = eventName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  try {
    document.dispatchEvent(new CustomEvent(`messgeraet:${kebabEventName}`, {
      detail: data,
      bubbles: true,
      cancelable: false
    }));
  } catch (error) {
    console.warn('Failed to dispatch custom event:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate unique device ID
 * @returns {string} Device ID
 */
function generateDeviceId() {
  return `MG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// MODULE EXPORT (end of file)
// ============================================

console.log('✓ Messgerät State module loaded');
