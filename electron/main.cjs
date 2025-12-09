/**
 * Electron Main Process
 * 
 * Entry point for the desktop application
 * Manages window creation and application lifecycle
 */

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// Get application version from package.json
const packageJson = require('../package.json');
const appVersion = packageJson.version || '1.0.0';

// Keep a global reference of the window object
let mainWindow;

// IPC handler for getting app version
ipcMain.handle('get-app-version', () => appVersion);

/**
 * Create the main application window
 */
function createWindow() {
    // Create the browser window with optimized settings for desktop use
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            // Enable security features
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
        // Window appearance
        icon: path.join(__dirname, '..', 'assets', 'icon.svg'),
        title: 'Abrechnung aus Prüfprotokoll',
        // Show window when ready to prevent visual flash
        show: false
    });

    // Load the index.html file from the app directory
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Create application menu
    createMenu();

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open DevTools only in development mode
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

/**
 * Create the application menu
 */
function createMenu() {
    const template = [
        {
            label: 'Datei',
            submenu: [
                {
                    label: 'Protokoll importieren...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(
                            'document.getElementById("file-input").click()'
                        );
                    }
                },
                { type: 'separator' },
                {
                    label: 'Anwendung zurücksetzen',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(
                            'document.getElementById("reset-button").click()'
                        );
                    }
                },
                { type: 'separator' },
                { role: 'quit', label: 'Beenden' }
            ]
        },
        {
            label: 'Bearbeiten',
            submenu: [
                { role: 'undo', label: 'Rückgängig' },
                { role: 'redo', label: 'Wiederholen' },
                { type: 'separator' },
                { role: 'cut', label: 'Ausschneiden' },
                { role: 'copy', label: 'Kopieren' },
                { role: 'paste', label: 'Einfügen' },
                { role: 'selectAll', label: 'Alles auswählen' }
            ]
        },
        {
            label: 'Ansicht',
            submenu: [
                { role: 'reload', label: 'Neu laden' },
                { role: 'forceReload', label: 'Erzwungenes Neuladen' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Zoom zurücksetzen' },
                { role: 'zoomIn', label: 'Vergrößern' },
                { role: 'zoomOut', label: 'Verkleinern' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Vollbild' }
            ]
        },
        {
            label: 'Hilfe',
            submenu: [
                {
                    label: 'Über Abrechnung App',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Über Abrechnung App',
                            message: 'Abrechnung aus Prüfprotokoll',
                            detail: `Version ${appVersion}\n\nExcel-basierte Abrechnungserstellung aus protokoll.xlsx\n\n© 2025`
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Entwicklertools',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];

    // Adjust menu for macOS
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about', label: 'Über Abrechnung App' },
                { type: 'separator' },
                { role: 'services', label: 'Dienste' },
                { type: 'separator' },
                { role: 'hide', label: 'Ausblenden' },
                { role: 'hideOthers', label: 'Andere ausblenden' },
                { role: 'unhide', label: 'Alle einblenden' },
                { type: 'separator' },
                { role: 'quit', label: 'Beenden' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Application lifecycle events
app.whenReady().then(() => {
    createWindow();

    // On macOS, re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        // Only allow file:// protocol for local files
        if (parsedUrl.protocol !== 'file:') {
            event.preventDefault();
        }
    });
});
