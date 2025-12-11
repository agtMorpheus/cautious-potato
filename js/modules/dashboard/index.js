/**
 * Dashboard Module - Index
 * 
 * Central export for all Dashboard module components.
 * This module provides UI elements and functionality for the dashboard area,
 * including welcome messages.
 */

// Welcome Messages
export * from './welcome-messages.js';
export * from './welcome-messages-ui.js';

// Re-export default modules
import welcomeMessages from './welcome-messages.js';
import welcomeMessagesUI from './welcome-messages-ui.js';

/**
 * Initialize all dashboard module components
 */
export function initDashboardModule() {
    console.log('Dashboard Module: Initializing...');
    
    // Initialize welcome messages UI
    welcomeMessagesUI.init();
    
    console.log('✓ Dashboard Module initialized');
}

export default {
    welcomeMessages,
    welcomeMessagesUI,
    initDashboardModule
};
