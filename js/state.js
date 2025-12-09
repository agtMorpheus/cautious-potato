/**
 * State Management Module
 * 
 * Manages application state with localStorage persistence
 * Implements event-driven architecture for reactive UI updates
 */

// Application state structure
let appState = {
    protokollData: null,
    abrechnungData: null,
    selectedFile: null, // Currently selected file for import
    status: 'ready' // ready, importing, imported, generating, generated, error
};

// Event listeners for state changes
const stateListeners = [];

/**
 * Get current application state
 * @returns {Object} Current state object
 */
export function getState() {
    return { ...appState };
}

/**
 * Update application state
 * @param {Object} updates - Partial state updates to merge
 */
export function setState(updates) {
    appState = {
        ...appState,
        ...updates
    };
    
    // Save to localStorage
    saveState();
    
    // Notify all listeners
    notifyStateChange();
}

/**
 * Subscribe to state changes
 * @param {Function} listener - Callback function to be called on state change
 * @returns {Function} Unsubscribe function
 */
export function subscribe(listener) {
    if (typeof listener !== 'function') {
        throw new Error('Listener must be a function');
    }
    
    stateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
        const index = stateListeners.indexOf(listener);
        if (index > -1) {
            stateListeners.splice(index, 1);
        }
    };
}

/**
 * Notify all listeners of state change
 */
function notifyStateChange() {
    stateListeners.forEach(listener => {
        try {
            listener(getState());
        } catch (error) {
            console.error('Error in state listener:', error);
        }
    });
}

/**
 * Save current state to localStorage
 */
export function saveState() {
    try {
        const stateToSave = {
            protokollData: appState.protokollData,
            abrechnungData: appState.abrechnungData,
            status: appState.status,
            timestamp: Date.now()
        };
        
        localStorage.setItem('abrechnungAppState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Error saving state to localStorage:', error);
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded. Clearing old data...');
            clearState();
        }
    }
}

/**
 * Load state from localStorage
 * @returns {boolean} True if state was loaded successfully
 */
export function loadState() {
    try {
        const savedState = localStorage.getItem('abrechnungAppState');
        
        if (savedState) {
            const parsed = JSON.parse(savedState);
            
            // Validate loaded state
            if (validateState(parsed)) {
                appState = {
                    protokollData: parsed.protokollData,
                    abrechnungData: parsed.abrechnungData,
                    status: parsed.status || 'ready'
                };
                
                notifyStateChange();
                return true;
            }
        }
    } catch (error) {
        console.error('Error loading state from localStorage:', error);
        clearState();
    }
    
    return false;
}

/**
 * Clear all state and localStorage
 */
export function clearState() {
    appState = {
        protokollData: null,
        abrechnungData: null,
        status: 'ready'
    };
    
    try {
        localStorage.removeItem('abrechnungAppState');
    } catch (error) {
        console.error('Error clearing localStorage:', error);
    }
    
    notifyStateChange();
}

/**
 * Validate state structure
 * @param {Object} state - State object to validate
 * @returns {boolean} True if state is valid
 */
function validateState(state) {
    if (!state || typeof state !== 'object') {
        return false;
    }
    
    // Validate protokollData if present
    if (state.protokollData !== null) {
        if (!state.protokollData.metadata || !state.protokollData.positionen) {
            return false;
        }
    }
    
    // Validate abrechnungData if present
    if (state.abrechnungData !== null) {
        if (!state.abrechnungData.header || !state.abrechnungData.positionen) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get formatted state for debugging
 * @returns {string} Formatted state string
 */
export function debugState() {
    return JSON.stringify(appState, null, 2);
}
