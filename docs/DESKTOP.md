# Desktop Application Guide

This document explains how to run the Abrechnung application as a standalone desktop application using Electron.

## 🖥️ Overview

The Abrechnung application can run in two modes:
1. **Web Mode**: Run in a browser via a local web server (XAMPP, Python http.server, etc.)
2. **Desktop Mode**: Run as a standalone desktop application using Electron

The desktop mode provides several advantages:
- No need for a separate web server
- Native operating system integration
- Application menu with keyboard shortcuts
- Cross-platform support (Windows, macOS, Linux)

## 📦 Prerequisites

Before running the desktop application, ensure you have:
- Node.js (v16 or later)
- npm (included with Node.js)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd abrechnung-app
npm install
```

### 2. Run the Desktop Application

```bash
# Production mode
npm run electron

# Development mode (with DevTools)
npm run electron:dev
```

## 🔧 Building Distributable Packages

To create standalone installers for distribution:

### Windows (NSIS Installer)
```bash
npm run electron:build:win
```
Output: `dist/Abrechnung App Setup.exe`

### macOS (DMG)
```bash
npm run electron:build:mac
```
Output: `dist/Abrechnung App.dmg`

### Linux (AppImage)
```bash
npm run electron:build:linux
```
Output: `dist/Abrechnung App.AppImage`

### All Platforms
```bash
npm run electron:build
```

Built files are placed in the `dist/` directory.

## 📁 Application Structure

```
abrechnung-app/
├── electron/
│   ├── main.js      # Electron main process
│   └── preload.js   # Secure renderer bridge
├── assets/
│   ├── icon.svg     # Source icon
│   ├── icon.png     # Linux icon
│   ├── icon.ico     # Windows icon
│   └── icon.icns    # macOS icon
├── index.html       # Application UI
├── js/              # Application modules
├── css/             # Stylesheets
├── templates/       # Excel templates
└── package.json     # Includes Electron configuration
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` / `Cmd+O` | Open file import dialog |
| `Ctrl+Shift+I` / `Cmd+Shift+I` | Toggle Developer Tools |
| `F11` | Toggle Fullscreen |
| `Ctrl+R` / `Cmd+R` | Reload application |
| `Ctrl+Q` / `Cmd+Q` | Quit application |

## 🔒 Security Features

The desktop application includes several security measures:

1. **Context Isolation**: Renderer process is isolated from Node.js APIs
2. **Disabled Node Integration**: Web content cannot directly access Node.js
3. **Preload Script**: Only necessary APIs are exposed via contextBridge
4. **Navigation Prevention**: External URL navigation is blocked

## 🐛 Troubleshooting

### Application Won't Start

1. Ensure all dependencies are installed: `npm install`
2. Check Node.js version: `node --version` (should be v16+)
3. Try running in development mode: `npm run electron:dev`

### Build Fails

1. Clear the dist folder: `rm -rf dist`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check for platform-specific requirements in electron-builder docs

### Icons Not Displaying

1. Ensure icon files exist in the `assets/` folder
2. Generate platform-specific icons from the SVG source (see `assets/README.md`)

## 📝 Development Notes

### Main Process (`electron/main.js`)

The main process handles:
- Window creation and management
- Application lifecycle events
- Native menu creation
- Security policies

### Preload Script (`electron/preload.js`)

The preload script:
- Runs in the renderer context
- Has access to Node.js APIs
- Exposes limited functionality via contextBridge
- Provides platform information to the web application

### Adding New Features

To expose new functionality from the main process:

1. Add handler in `main.js` using `ipcMain.handle()`
2. Expose function in `preload.js` using `contextBridge.exposeInMainWorld()`
3. Call from renderer using `window.electronAPI.yourFunction()`

## 📊 Comparison: Web vs Desktop Mode

| Feature | Web Mode | Desktop Mode |
|---------|----------|--------------|
| Server Required | Yes | No |
| Installation | None | One-time |
| Updates | Automatic | Manual |
| Native Menus | No | Yes |
| Keyboard Shortcuts | Limited | Full |
| System Integration | Limited | Full |
| Offline Support | With server | Always |

## 🔗 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Project README](../README.md)
- [Architecture Documentation](ARCHITECTURE.md)
