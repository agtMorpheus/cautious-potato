# API 404 Errors - Diagnostic & Setup Guide

**Date:** 2024-12-09  
**Error:** `GET /api/contracts` Error (404): "Not found"  
**Status:** Expected - API not running

---

## What's Happening

You're seeing 404 errors because:

1. ✅ **Frontend is running** - The app is loaded in your browser
2. ✅ **Sync is enabled** - The app is trying to sync with the server
3. ❌ **Backend API is not running** - No PHP server is serving the API endpoints

This is **completely normal** if you haven't set up the backend yet!

---

## Current Setup Status

### ✅ What's Ready

- Frontend application (HTML/CSS/JS)
- API code (`api/` folder)
- Database schema (`db/` folder)
- Sync service implementation
- API routing and controllers

### ❌ What's Missing

- PHP server running
- MySQL database created
- Database tables initialized
- Environment configuration

---

## Two Options

### Option 1: Disable Sync (Quick - Use Local Only)

If you don't need server sync right now, just use Local Only mode:

1. Open the app in your browser
2. Click the **Settings** icon (⚙️)
3. Under "Datenspeicherung", select **"Nur lokal"**
4. Click **"Einstellungen speichern"**

**Result:** App works perfectly with localStorage, no API needed!

### Option 2: Set Up Backend (Full Features)

If you want server sync, follow the setup guide below.

---

## Backend Setup Guide

### Prerequisites

- PHP 7.4+ installed
- MySQL 5.7+ or MariaDB 10.3+
- Web server (Apache/Nginx) or PHP built-in server

### Step 1: Check PHP Installation

```bash
php --version
```

Expected output: `PHP 7.4.x` or higher

If not installed:
- **macOS:** `brew install php`
- **Ubuntu:** `sudo apt install php php-mysql php-mbstring`
- **Windows:** Download from php.net

### Step 2: Check MySQL Installation

```bash
mysql --version
```

If not installed:
- **macOS:** `brew install mysql`
- **Ubuntu:** `sudo apt install mysql-server`
- **Windows:** Download from mysql.com

### Step 3: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE contract_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional, for security)
CREATE USER 'contract_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON contract_manager.* TO 'contract_user'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### Step 4: Initialize Database Schema

```bash
# From project root
mysql -u root -p contract_manager < db/init_contract_manager.sql
```

Or if you have the phase 6 schema:
```bash
mysql -u root -p contract_manager < db/phase6_schema.sql
```

### Step 5: Configure Environment

Create `config/production.env`:

```env
# Database
DB_HOST=localhost
DB_NAME=contract_manager
DB_USER=root
DB_PASS=

# Application
APP_ENV=development
APP_DEBUG=true

# Session
SESSION_TIMEOUT=3600
SESSION_SECURE_COOKIE=false

# Security
CSRF_TOKEN_ENABLED=false

# CORS (allow frontend to access API)
CORS_ORIGIN=*

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Rate limiting
RATE_LIMIT=60
```

### Step 6: Create Logs Directory

```bash
mkdir -p logs
chmod 755 logs
```

### Step 7: Start PHP Server

**Option A: PHP Built-in Server (Development)**

```bash
# From project root
php -S localhost:8000 -t .
```

**Option B: Apache/Nginx (Production)**

Configure virtual host to point to project root with `api/` as API endpoint.

### Step 8: Test API

Open browser and visit:
```
http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-09T20:19:06+00:00"
  }
}
```

### Step 9: Update Frontend API URL

If using a different port/host, update `js/contracts/contractApiClient.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Step 10: Test Sync

1. Open app in browser
2. Go to Settings
3. Select "Mit Server synchronisieren"
4. Click "Jetzt synchronisieren"
5. Check for success message

---

## Troubleshooting

### Error: "Database connection failed"

**Cause:** MySQL not running or wrong credentials

**Fix:**
```bash
# Start MySQL
# macOS:
brew services start mysql

# Ubuntu:
sudo systemctl start mysql

# Check credentials in config/production.env
```

### Error: "Table 'contracts' doesn't exist"

**Cause:** Database schema not initialized

**Fix:**
```bash
mysql -u root -p contract_manager < db/init_contract_manager.sql
```

### Error: "CORS policy blocked"

**Cause:** Frontend and API on different origins

**Fix:** Update `config/production.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

Or allow all (development only):
```env
CORS_ORIGIN=*
```

### Error: "Session not found"

**Cause:** Not logged in

**Fix:** The API requires authentication. You need to:
1. Implement login UI (if not done)
2. Or temporarily disable auth checks for testing

To disable auth for testing, edit `api/index.php`:
```php
// Comment out this line in handleContractRoutes:
// Auth::requireLogin();
```

**⚠️ WARNING:** Only do this for local testing!

---

## Verifying Setup

### Check 1: PHP Server Running

```bash
curl http://localhost:8000/api/health
```

Expected: JSON response with "healthy"

### Check 2: Database Connected

```bash
mysql -u root -p contract_manager -e "SHOW TABLES;"
```

Expected: List of tables including `contracts`, `users`, etc.

### Check 3: API Endpoints

```bash
# Health check (no auth)
curl http://localhost:8000/api/health

# Contracts list (requires auth)
curl http://localhost:8000/api/contracts
```

### Check 4: Frontend Connecting

Open browser console and check for:
- ✅ No 404 errors
- ✅ API responses in Network tab
- ✅ Sync status shows "Synchronisiert"

---

## Quick Test Without Full Setup

If you want to test the sync logic without setting up the full backend:

### Option A: Mock API Server

Create `test-api-server.js`:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy' }));
        return;
    }
    
    if (req.url === '/api/contracts') {
        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ contracts: [] }));
        } else if (req.method === 'POST') {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: 'test-123' }));
        }
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(8000, () => {
    console.log('Mock API server running on http://localhost:8000');
});
```

Run:
```bash
node test-api-server.js
```

### Option B: Use JSON Server

```bash
npm install -g json-server

# Create db.json
echo '{"contracts": []}' > db.json

# Start server
json-server --watch db.json --port 8000 --routes routes.json
```

---

## Recommended Approach

For now, I recommend **Option 1: Use Local Only mode**.

Why?
- ✅ Works immediately, no setup needed
- ✅ All features work (import, generate, export)
- ✅ Data persists in browser localStorage
- ✅ No server maintenance required

When you need server sync:
- Multiple users need to share data
- Data backup to server required
- Cross-device synchronization needed

Then follow the full backend setup guide above.

---

## Summary

**Current Status:** Frontend works, backend not running (expected)

**Quick Fix:** Use "Nur lokal" mode in settings

**Full Setup:** Follow 10-step backend setup guide above

**Next Steps:**
1. Decide if you need server sync now
2. If yes, follow setup guide
3. If no, use local mode and set up later

The 404 errors are not a bug - they're the app correctly trying to reach an API that isn't running yet!
