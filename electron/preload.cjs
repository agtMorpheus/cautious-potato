/**
 * Electron Preload Script
 * 
 * Provides a secure bridge between the renderer process and main process
 * Uses contextBridge to expose only necessary APIs
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// features without exposing the entire electron API
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform information
    platform: process.platform,
    
    // Check if running in Electron environment
    isElectron: true,
    
    // Application version - retrieved via IPC from main process
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

// Log that preload script has loaded
console.log('Electron preload script loaded');
