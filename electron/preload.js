/**
 * Electron Preload Script
 * 
 * Provides a secure bridge between the renderer process and main process
 * Uses contextBridge to expose only necessary APIs
 */

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// features without exposing the entire electron API
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform information
    platform: process.platform,
    
    // Check if running in Electron environment
    isElectron: true,
    
    // Application version
    getAppVersion: () => {
        try {
            return require('electron').app?.getVersion() || '1.0.0';
        } catch {
            return '1.0.0';
        }
    }
});

// Log that preload script has loaded
console.log('Electron preload script loaded');
