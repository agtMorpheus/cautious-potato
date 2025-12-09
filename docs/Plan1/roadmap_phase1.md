# Phase 1: Project Setup & Core Infrastructure

## Overview

Phase 1 represents the foundational stage of the Abrechnung Application implementation. This phase spans **Weeks 1-2** and focuses on establishing a robust development environment, creating the necessary project structure, importing external dependencies, and building the basic user interface skeleton. The successful completion of Phase 1 ensures that all developers have a consistent, functional setup and that the project is ready for the next stages of development.

The primary objectives during Phase 1 are to create a clean, maintainable codebase structure, set up all necessary tools for local development, integrate the SheetJS library for Excel handling, and establish the foundational HTML/CSS framework that will support the remaining development phases.

---

## 1.1 Development Environment Setup

### Objective

Establish a complete local development environment using XAMPP Portable, create a well-organized project directory structure, initialize version control, and ensure all files are properly configured for collaborative development.

### Why XAMPP Portable?

XAMPP Portable is the preferred choice for this project because it:

- **Eliminates Build Complexity:** The application requires no build step and runs directly in modern browsers, making XAMPP an ideal lightweight server
- **Platform Independence:** Works identically on Windows, macOS, and Linux without installation hassles
- **Easy Deployment:** The same portable instance can be deployed to different machines without reconfiguration
- **Zero Dependencies:** Contains Apache, PHP, and MySQL, providing everything needed for local development
- **Space Efficient:** Portable version requires minimal disk space and no installation prerequisites

### Step-by-Step Setup

#### 1. Download and Configure XAMPP Portable

1. Download XAMPP Portable from the official Apache Friends website
2. Extract the XAMPP folder to a convenient location (e.g., `C:\xampp` on Windows or `~/xampp` on macOS/Linux)
3. Launch the XAMPP Control Panel:
   - Windows: Double-click `xampp-control.exe`
   - macOS: Double-click `manager-osx.app`
   - Linux: Run `./manager-linux.run` from terminal
4. Start Apache module by clicking the "Start" button next to Apache
5. Verify Apache is running by opening browser and navigating to `http://localhost` (should see XAMPP dashboard)

#### 2. Create Project Directory Structure

Navigate to the XAMPP `htdocs` directory (where web applications are served from):
- Windows: `C:\xampp\htdocs`
- macOS: `/Applications/XAMPP/htdocs`
- Linux: `/opt/lampp/htdocs`

Create the following directory structure:

```
abrechnung-app/
├── index.html              # Main HTML file with UI structure
├── css/
│   ├── styles.css          # Main stylesheet for UI components
│   └── responsive.css      # Mobile and tablet responsive styles (optional)
├── js/
│   ├── state.js            # Central state management module
│   ├── handlers.js         # Event handler functions
│   ├── utils.js            # Utility functions for Excel operations
│   ├── main.js             # Application initialization and setup
│   └── libs/
│       └── xlsx.min.js     # SheetJS library (to be downloaded)
├── templates/
│   ├── protokoll.xlsx      # Sample inspection protocol template
│   └── abrechnung.xlsx     # Sample billing document template
├── data/                   # Optional: folder for sample/test data
│   └── sample-protokoll.xlsx
├── docs/                   # Optional: documentation folder
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── SETUP.md
├── .gitignore              # Git ignore rules
└── README.md               # Project readme

```

**Important:** Ensure that template Excel files (`protokoll.xlsx` and `abrechnung.xlsx`) are placed in the `/templates` directory, as the application will reference these files during development and operation.

### Creating the Directory Structure

Use your terminal or file manager to create these directories:

**Windows (Command Prompt):**
```
cd C:\xampp\htdocs
mkdir abrechnung-app
cd abrechnung-app
mkdir css js\libs templates data docs
```

**macOS/Linux (Terminal):**
```
cd /Applications/XAMPP/htdocs
mkdir -p abrechnung-app/{css,js/libs,templates,data,docs}
cd abrechnung-app
```

#### 3. Initialize Git Repository

Initialize Git for version control to track changes and enable collaboration:

```bash
# Navigate to project root
cd abrechnung-app

# Initialize git repository
git init

# Configure git with your information
git config user.name "Your Name"
git config user.email "your.email@example.com"

# (Optional) Set up remote repository
# git remote add origin https://github.com/yourusername/abrechnung-app.git
```

#### 4. Create .gitignore File

Create a `.gitignore` file in the project root to exclude files that should not be version controlled:

```
# Operating system files
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# IDE and editor files
.vscode/
.idea/
*.sublime-project
*.sublime-workspace
*.code-workspace

# Node modules (if using npm later)
node_modules/
package-lock.json

# Logs and temporary files
*.log
logs/
*.tmp
temp/

# Sensitive data
.env
.env.local
secrets.json

# OS directories
.AppleDouble
.LSOverride
__pycache__/

# Sample test files (keep templates, exclude test outputs)
# data/*.xlsx (if you want to exclude test data files)
```

#### 5. Initial Git Commit

Create an initial commit with the basic structure:

```bash
# Stage all files
git add .

# Create initial commit
git commit -m "Initial project setup: directory structure and configuration files"
```

### Verification Checklist

- [ ] XAMPP is installed and Apache is running
- [ ] Project directory created at `htdocs/abrechnung-app`
- [ ] All subdirectories created (css, js, templates, data, docs)
- [ ] Git repository initialized
- [ ] .gitignore file created with appropriate rules
- [ ] Initial commit made to version control
- [ ] Project is accessible via `http://localhost/abrechnung-app/` in browser

---

## 1.2 Import External Libraries

### Objective

Download and integrate the SheetJS library, which is essential for reading and writing Excel files in the web browser. Verify that the library is properly accessible and can be loaded by all application modules.

### Understanding SheetJS

**SheetJS** (also known as `xlsx`) is a powerful JavaScript library that enables:

- **Reading Excel Files:** Parse .xlsx, .xls, CSV, and other spreadsheet formats
- **Writing Excel Files:** Create and modify Excel workbooks programmatically
- **Data Extraction:** Extract specific cells, ranges, and worksheets
- **Formula Preservation:** Maintain Excel formulas and formatting when reading/writing
- **No Server Required:** All operations happen client-side in the browser

### Why Choose SheetJS?

For this project, SheetJS is ideal because:

1. **Pure JavaScript:** No external dependencies or build tools required
2. **Broad Format Support:** Handles .xlsx files efficiently
3. **Client-Side Processing:** Files are processed in the browser, not sent to a server
4. **Lightweight:** Minified library is approximately 170KB
5. **Excellent Documentation:** Comprehensive docs available at https://sheetjs.com/docs/
6. **Community Support:** Large user base and active community

### Step-by-Step Integration

#### 1. Download SheetJS Library

The SheetJS library can be obtained in several ways:

**Option A: Direct Download (Recommended for this project)**

1. Visit https://sheetjs.com/
2. Download the latest version of the library
3. Select either `xlsx.min.js` (minified, ~170KB) or `xlsx.full.min.js` (with additional features, ~180KB)
4. Place the downloaded file in `js/libs/` directory

**Option B: CDN (Content Delivery Network)**

Alternatively, you can link directly to the CDN version in your HTML (no download needed):
```html
<script src="https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js"></script>
```

However, for offline development and to follow the modular architecture, downloading the file is preferred.

#### 2. Place Library in Project

Once downloaded:

```
js/
├── libs/
│   └── xlsx.min.js     # Minified SheetJS library (~170KB)
├── state.js
├── handlers.js
├── utils.js
└── main.js
```

**File Size Consideration:** The minified version is approximately 170KB, which is acceptable for a client-side application. This will be loaded once during application initialization.

#### 3. Verify Library Installation

Create a simple test file to verify the library loads correctly. Create `test-library.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SheetJS Library Test</title>
</head>
<body>
    <h1>SheetJS Library Test</h1>
    <p id="result">Testing library...</p>

    <script src="js/libs/xlsx.min.js"></script>
    <script>
        // Test if XLSX object is available
        if (typeof XLSX !== 'undefined') {
            document.getElementById('result').textContent = 
                'SUCCESS: SheetJS library loaded. Version: ' + XLSX.version;
            console.log('SheetJS library successfully loaded');
            console.log('Available methods:', Object.keys(XLSX).slice(0, 10));
        } else {
            document.getElementById('result').textContent = 
                'ERROR: SheetJS library failed to load';
            console.error('SheetJS library not found');
        }
    </script>
</body>
</html>
```

Access this file via `http://localhost/abrechnung-app/test-library.html` and verify:
- The page displays "SUCCESS: SheetJS library loaded"
- Browser console shows XLSX version information
- No JavaScript errors appear in browser console

#### 4. Update Main HTML to Include Library

Once verified, the main `index.html` will include this library (created in section 1.3):

```html
<!-- At the end of body, before main.js -->
<script src="js/libs/xlsx.min.js"></script>
<script type="module" src="js/main.js"></script>
```

### Verification Checklist

- [ ] SheetJS library downloaded and placed in `js/libs/`
- [ ] Library file is `xlsx.min.js` or `xlsx.full.min.js`
- [ ] Test page loads successfully
- [ ] Browser console confirms "XLSX" object is accessible
- [ ] No JavaScript errors in browser console
- [ ] Library file size is approximately 170-180KB

---

## 1.3 Basic UI Structure

### Objective

Create the foundational HTML structure with three main sections for the application workflow: Import Panel, Generate Panel, and Export Panel. Establish basic CSS styling that provides a clean, professional appearance and ensures good user experience across different devices.

### Application Workflow Overview

The UI will guide users through this workflow:

1. **Import Panel** → User uploads a protokoll.xlsx file
2. **Generate Panel** → System calculates summaries and creates billing data
3. **Export Panel** → User downloads the generated abrechnung.xlsx file

Each section will display status information, progress indicators, and provide clear feedback about the current state of the application.

### Creating index.html

Create the main `index.html` file with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Abrechnung Application - Excel automation for billing document generation">
    <title>Abrechnung Application</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <h1>Abrechnung Application</h1>
            <p class="subtitle">Automated Billing Document Generation from Inspection Protocols</p>
        </header>

        <!-- Main Content -->
        <main class="main-content">

            <!-- Error/Status Messages Container -->
            <div id="messageContainer" class="message-container"></div>

            <!-- ============= IMPORT SECTION ============= -->
            <section id="importSection" class="section panel">
                <div class="section-header">
                    <h2>Step 1: Import Inspection Protocol</h2>
                    <p class="section-description">Select and upload your protokoll.xlsx file to extract data</p>
                </div>

                <div class="section-content">
                    <!-- File Input Area -->
                    <div class="file-input-wrapper">
                        <input 
                            type="file" 
                            id="fileInput" 
                            accept=".xlsx" 
                            class="file-input"
                            aria-label="Upload inspection protocol file"
                        >
                        <label for="fileInput" class="file-input-label">
                            <span class="file-input-icon">📁</span>
                            <span class="file-input-text">Click to select protokoll.xlsx or drag and drop</span>
                        </label>
                    </div>

                    <!-- Import Button -->
                    <button 
                        id="importBtn" 
                        class="btn btn-primary"
                        disabled
                        aria-label="Import the selected file"
                    >
                        Import File
                    </button>

                    <!-- Status Display -->
                    <div id="importStatus" class="status-box" style="display: none;">
                        <div class="status-content">
                            <div class="status-title">Import Status</div>
                            <div class="status-message" id="importStatusMsg"></div>
                            <div class="status-details">
                                <div class="detail-row">
                                    <span class="detail-label">File Name:</span>
                                    <span class="detail-value" id="importFileName">-</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">File Size:</span>
                                    <span class="detail-value" id="importFileSize">-</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Import Date:</span>
                                    <span class="detail-value" id="importDate">-</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Extracted Data Preview -->
                    <div id="importPreview" class="preview-box" style="display: none;">
                        <div class="preview-title">Extracted Data</div>
                        <table class="preview-table">
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody id="importPreviewBody">
                                <!-- Populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- ============= GENERATE SECTION ============= -->
            <section id="generateSection" class="section panel">
                <div class="section-header">
                    <h2>Step 2: Generate Billing Document</h2>
                    <p class="section-description">Calculate position summaries and create billing data</p>
                </div>

                <div class="section-content">
                    <!-- Generate Button -->
                    <button 
                        id="generateBtn" 
                        class="btn btn-primary"
                        disabled
                        aria-label="Generate billing document from imported data"
                    >
                        Generate Abrechnung
                    </button>

                    <!-- Status Display -->
                    <div id="generateStatus" class="status-box" style="display: none;">
                        <div class="status-content">
                            <div class="status-title">Generation Status</div>
                            <div class="status-message" id="generateStatusMsg"></div>
                            <div class="status-details">
                                <div class="detail-row">
                                    <span class="detail-label">Positions Processed:</span>
                                    <span class="detail-value" id="positionCount">0</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Unique Positions:</span>
                                    <span class="detail-value" id="uniquePositionCount">0</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Generation Time:</span>
                                    <span class="detail-value" id="generationTime">-</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Generated Data Preview -->
                    <div id="generatePreview" class="preview-box" style="display: none;">
                        <div class="preview-title">Position Summaries (First 10 entries)</div>
                        <table class="preview-table">
                            <thead>
                                <tr>
                                    <th>Position Number</th>
                                    <th>Total Quantity</th>
                                </tr>
                            </thead>
                            <tbody id="generatePreviewBody">
                                <!-- Populated by JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- ============= EXPORT SECTION ============= -->
            <section id="exportSection" class="section panel">
                <div class="section-header">
                    <h2>Step 3: Export Billing Document</h2>
                    <p class="section-description">Download the generated abrechnung.xlsx file</p>
                </div>

                <div class="section-content">
                    <!-- Export Button -->
                    <button 
                        id="exportBtn" 
                        class="btn btn-primary"
                        disabled
                        aria-label="Export and download billing document"
                    >
                        Download Abrechnung.xlsx
                    </button>

                    <!-- Status Display -->
                    <div id="exportStatus" class="status-box" style="display: none;">
                        <div class="status-content">
                            <div class="status-title">Export Status</div>
                            <div class="status-message" id="exportStatusMsg"></div>
                            <div class="status-details">
                                <div class="detail-row">
                                    <span class="detail-label">Export Date:</span>
                                    <span class="detail-value" id="exportDate">-</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Export Format:</span>
                                    <span class="detail-value">Excel .xlsx</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">File Size:</span>
                                    <span class="detail-value" id="exportFileSize">-</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Export History -->
                    <div id="exportHistory" class="preview-box" style="display: none;">
                        <div class="preview-title">Recent Exports</div>
                        <ul class="export-list" id="exportList">
                            <!-- Populated by JavaScript -->
                        </ul>
                    </div>
                </div>
            </section>

            <!-- ============= UTILITIES SECTION ============= -->
            <section id="utilitySection" class="section panel">
                <div class="section-header">
                    <h2>Utilities</h2>
                    <p class="section-description">Maintenance and testing utilities</p>
                </div>

                <div class="section-content">
                    <!-- Reset Button -->
                    <button 
                        id="resetBtn" 
                        class="btn btn-secondary"
                        aria-label="Reset application state and clear all data"
                    >
                        Reset Application
                    </button>

                    <!-- Application Info -->
                    <div class="app-info">
                        <h3>Application Information</h3>
                        <ul>
                            <li><strong>Version:</strong> <span id="appVersion">1.0.0</span></li>
                            <li><strong>Last Build:</strong> <span id="appBuild">December 2025</span></li>
                            <li><strong>Environment:</strong> <span id="appEnv">Development (XAMPP)</span></li>
                        </ul>
                    </div>
                </div>
            </section>

        </main>

        <!-- Footer -->
        <footer class="footer">
            <p>&copy; 2025 Abrechnung Application. All rights reserved.</p>
            <p class="footer-subtitle">Built with vanilla JavaScript, SheetJS, and modern web standards</p>
        </footer>
    </div>

    <!-- External Libraries -->
    <script src="js/libs/xlsx.min.js"></script>

    <!-- Application Modules (ES6 Modules) -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

### Creating styles.css

Create the main stylesheet `css/styles.css`:

```css
/* ===========================
   RESET & BASE STYLES
   =========================== */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    color: #333;
    background-color: #f5f7fa;
}

body {
    line-height: 1.6;
    color: #333;
}

/* ===========================
   CONTAINER & LAYOUT
   =========================== */

.container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
}

/* ===========================
   HEADER
   =========================== */

.header {
    text-align: center;
    margin-bottom: 40px;
    padding: 40px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-weight: 600;
}

.header .subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
}

/* ===========================
   MAIN CONTENT
   =========================== */

.main-content {
    display: flex;
    flex-direction: column;
    gap: 30px;
}

/* ===========================
   MESSAGE CONTAINER
   =========================== */

.message-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.message {
    padding: 15px 20px;
    border-radius: 6px;
    border-left: 4px solid;
    font-size: 0.95rem;
    animation: slideIn 0.3s ease;
}

.message.success {
    background-color: #d4edda;
    border-color: #28a745;
    color: #155724;
}

.message.error {
    background-color: #f8d7da;
    border-color: #dc3545;
    color: #721c24;
}

.message.info {
    background-color: #d1ecf1;
    border-color: #17a2b8;
    color: #0c5460;
}

.message.warning {
    background-color: #fff3cd;
    border-color: #ffc107;
    color: #856404;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===========================
   SECTIONS & PANELS
   =========================== */

.section {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: box-shadow 0.3s ease;
}

.section:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.section.panel {
    border: 1px solid #e0e0e0;
}

.section-header {
    padding: 25px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
}

.section-header h2 {
    font-size: 1.5rem;
    margin-bottom: 8px;
    color: #333;
}

.section-description {
    font-size: 0.95rem;
    color: #666;
    margin: 0;
}

.section-content {
    padding: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* ===========================
   FILE INPUT
   =========================== */

.file-input-wrapper {
    position: relative;
    margin-bottom: 15px;
}

.file-input {
    display: none;
}

.file-input-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    border: 2px dashed #667eea;
    border-radius: 8px;
    background-color: #f8f9ff;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
}

.file-input-label:hover {
    background-color: #f0f2ff;
    border-color: #764ba2;
}

.file-input-label.dragover {
    background-color: #e8eaff;
    border-color: #764ba2;
    transform: scale(1.02);
}

.file-input-icon {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.file-input-text {
    font-size: 1rem;
    color: #667eea;
    font-weight: 500;
}

/* ===========================
   BUTTONS
   =========================== */

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.btn-primary {
    background-color: #667eea;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background-color: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:active:not(:disabled) {
    transform: translateY(0);
}

.btn-primary:disabled {
    background-color: #ccc;
    color: #999;
    cursor: not-allowed;
    opacity: 0.6;
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background-color: #5a6268;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
}

.btn-secondary:disabled {
    background-color: #ccc;
    color: #999;
    cursor: not-allowed;
    opacity: 0.6;
}

/* ===========================
   STATUS BOX
   =========================== */

.status-box {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 20px;
}

.status-box.success {
    background-color: #d4edda;
    border-color: #c3e6cb;
}

.status-box.error {
    background-color: #f8d7da;
    border-color: #f5c6cb;
}

.status-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.status-title {
    font-weight: 600;
    font-size: 1.1rem;
    color: #333;
}

.status-message {
    font-size: 0.95rem;
    line-height: 1.5;
}

.status-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 15px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
}

.detail-label {
    font-weight: 500;
    color: #666;
}

.detail-value {
    color: #333;
    font-family: 'Courier New', monospace;
}

/* ===========================
   PREVIEW BOX & TABLES
   =========================== */

.preview-box {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 20px;
    overflow-x: auto;
}

.preview-title {
    font-weight: 600;
    margin-bottom: 15px;
    font-size: 1.05rem;
    color: #333;
}

.preview-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.preview-table thead {
    background-color: #e9ecef;
}

.preview-table th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #333;
    border-bottom: 2px solid #dee2e6;
}

.preview-table td {
    padding: 12px;
    border-bottom: 1px solid #dee2e6;
}

.preview-table tbody tr:hover {
    background-color: #f1f3f5;
}

.preview-table tbody tr:last-child td {
    border-bottom: none;
}

/* ===========================
   EXPORT LIST
   =========================== */

.export-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.export-list li {
    padding: 12px;
    background-color: #f8f9fa;
    border-left: 4px solid #667eea;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
}

/* ===========================
   APP INFO
   =========================== */

.app-info {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 6px;
    border: 1px solid #dee2e6;
}

.app-info h3 {
    margin-bottom: 15px;
    font-size: 1.1rem;
}

.app-info ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.app-info li {
    font-size: 0.9rem;
    line-height: 1.6;
}

.app-info strong {
    color: #333;
    display: inline-block;
    min-width: 150px;
}

/* ===========================
   FOOTER
   =========================== */

.footer {
    text-align: center;
    padding: 30px 20px;
    margin-top: 50px;
    border-top: 1px solid #e0e0e0;
    color: #666;
    font-size: 0.9rem;
}

.footer p {
    margin: 8px 0;
}

.footer-subtitle {
    font-size: 0.85rem;
    opacity: 0.8;
}

/* ===========================
   RESPONSIVE DESIGN
   =========================== */

@media (max-width: 768px) {
    .container {
        padding: 15px;
    }

    .header {
        padding: 30px 15px;
    }

    .header h1 {
        font-size: 2rem;
    }

    .section-header {
        padding: 20px;
    }

    .section-content {
        padding: 20px;
    }

    .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
    }

    .file-input-label {
        padding: 30px 15px;
    }

    .btn {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .header h1 {
        font-size: 1.5rem;
    }

    .header .subtitle {
        font-size: 0.95rem;
    }

    .section-header h2 {
        font-size: 1.25rem;
    }

    .preview-table {
        font-size: 0.85rem;
    }

    .preview-table th,
    .preview-table td {
        padding: 8px;
    }
}

/* ===========================
   ACCESSIBILITY
   =========================== */

.btn:focus,
.file-input:focus + .file-input-label {
    outline: 2px solid #667eea;
    outline-offset: 2px;
}

/* Print Styles */
@media print {
    body {
        background-color: white;
    }

    .section {
        box-shadow: none;
        border: 1px solid #999;
        page-break-inside: avoid;
    }
}
```

### Adding Console Logging

Create the basic structure for `js/main.js` with console logging:

```javascript
// js/main.js

/**
 * Application Entry Point
 * Initializes modules and sets up event listeners
 */

console.log('=== Abrechnung Application Initializing ===');

// Check if required libraries are available
console.log('Checking library availability...');

// Check SheetJS
if (typeof XLSX !== 'undefined') {
    console.log('✓ SheetJS library loaded successfully');
} else {
    console.error('✗ SheetJS library not found');
}

// Test module system
console.log('Testing ES6 Module system...');

try {
    // These modules will be imported in Phase 2
    // import { getState, setState } from './state.js';
    // import { handleImportFile } from './handlers.js';
    // import { readExcelFile } from './utils.js';

    console.log('✓ ES6 Module system is functional');
} catch (error) {
    console.error('✗ Module system error:', error);
}

// Document module structure
console.log('Expected module structure:');
console.log('- state.js: State management');
console.log('- handlers.js: Event handlers');
console.log('- utils.js: Utility functions');
console.log('- main.js: Application initialization');

// Log application startup
console.log('Application startup complete. Ready for Phase 2: State Management');
```

### Verification Checklist

- [ ] `index.html` created with all sections
- [ ] `css/styles.css` created with responsive design
- [ ] Basic styling provides clean, professional appearance
- [ ] All three main sections (Import, Generate, Export) are present
- [ ] File upload component with drag-and-drop styling
- [ ] Status display boxes for each section
- [ ] Preview table components for data display
- [ ] Responsive design works on mobile/tablet
- [ ] `js/main.js` created with console logging
- [ ] Loading application in browser shows no JavaScript errors
- [ ] All sections are visible and properly styled
- [ ] HTML is semantic and accessible

---

## Phase 1 Deliverables

Upon completion of Phase 1, the following deliverables should be ready:

### 1. **Working Development Environment**
   - XAMPP Portable configured and running
   - Apache serving the application on `http://localhost/abrechnung-app/`
   - All project files accessible and properly organized

### 2. **Project Directory Structure**
   - Clean, modular organization with separate folders for css, js, templates, etc.
   - .gitignore configured to exclude unnecessary files
   - Version control initialized with Git

### 3. **External Libraries Integrated**
   - SheetJS library (`xlsx.min.js`) downloaded and placed in `js/libs/`
   - Library verified to load correctly in browser
   - XLSX object accessible in browser console

### 4. **Basic UI Skeleton**
   - `index.html` with complete structure for all three workflow sections
   - Semantic HTML with proper accessibility attributes
   - No JavaScript functionality yet (pure structure)

### 5. **Initial Styling**
   - `css/styles.css` with professional appearance
   - Responsive design supporting mobile, tablet, and desktop
   - Visual hierarchy and clear section differentiation
   - Status indicators and feedback mechanisms

### 6. **Module Logging**
   - Console messages confirming library availability
   - Logging of module loading progress
   - Foundation for debugging in later phases

### Success Criteria for Phase 1

- ✓ Application loads without JavaScript errors
- ✓ SheetJS library is accessible
- ✓ All three sections are visible and properly styled
- ✓ HTML is semantic and accessible
- ✓ Responsive design works on all device sizes
- ✓ Project structure is organized and maintainable
- ✓ Version control is initialized and initial commit is made
- ✓ Development environment setup matches XAMPP requirements

---

## Next Steps: Preparation for Phase 2

Once Phase 1 is complete, the application is ready for Phase 2: **State Management & Data Layer**. In Phase 2, you will:

1. Create the `state.js` module with centralized state management
2. Implement the event-driven state update system
3. Set up localStorage integration for data persistence
4. Establish state validation mechanisms

The foundation built in Phase 1 ensures that all subsequent modules will integrate seamlessly with the established architecture.

---

## Troubleshooting Phase 1

### Common Issues and Solutions

**Issue: XAMPP Apache won't start**
- Solution: Check if port 80 is already in use. Try stopping other web servers or changing Apache port in XAMPP config.

**Issue: Files not accessible at localhost**
- Solution: Verify files are in `htdocs` directory, not in a subdirectory that's not recognized.

**Issue: SheetJS library not loading**
- Solution: Check browser console for 404 errors. Verify file path is correct: `js/libs/xlsx.min.js`

**Issue: Styling looks broken on mobile**
- Solution: Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R). Verify media queries in CSS are being applied.

**Issue: Git conflicts when initializing**
- Solution: Delete `.git` folder and reinitialize if configuration is causing issues.

---

## References

- [XAMPP Documentation](https://www.apachefriends.org/index.html)
- [SheetJS Official Documentation](https://sheetjs.com/docs/)
- [MDN Web Docs - ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Git Documentation](https://git-scm.com/doc)
- [Web Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Phase 1 Completion Date: [To be filled upon completion]**

**Next Phase: Phase 2 - State Management & Data Layer (Weeks 2-3)**
