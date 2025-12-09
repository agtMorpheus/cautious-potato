# Contract Manager Module – Phase 5: Backend Integration & Advanced Features

**Duration:** Weeks 9–10  
**Status:** Planned  
**Last Updated:** December 9, 2025

---

## 1. Overview

Phase 5 transitions the Contract Manager from a **browser-only application** (localStorage-based) to a **full-stack application** with a **backend database**, **REST API**, and **advanced features**.

By the end of Phase 5, the application will have:

1. **Backend API Layer** – PHP/MySQL REST endpoints served via XAMPP
2. **Database Schema** – Persistent contract storage with proper indexing
3. **Authentication & Authorization** – User login, role-based access control
4. **API Integration** – Seamless client-server communication with offline fallback
5. **Advanced Features** – Bulk operations, export/import, contract relationships
6. **Data Migration** – Move existing localStorage data to database
7. **Monitoring & Logging** – Server-side logging and error tracking

---

## 2. Technology Stack Decision

### 2.1 Backend Technology

Following the existing XAMPP setup and modular architecture:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Server** | XAMPP (Apache + PHP 8.0+) | Already deployed; low overhead |
| **Database** | MySQL 5.7+ | Relational model fits contract data; XAMPP included |
| **API** | REST (JSON) | Simple, stateless, no build step required |
| **Authentication** | Session-based (PHP `$_SESSION`) | XAMPP-compatible; simple for internal tools |
| **ORM** | PDO (PHP Data Objects) | Native PHP; no external dependencies |

### 2.2 Why NOT Other Options?

- **Node.js/Express:** Adds complexity; requires XAMPP modification or separate server
- **GraphQL:** Overkill for initial phase; REST sufficient and simpler to debug
- **OAuth/LDAP:** Unnecessary for internal tool; session-based auth sufficient

---

## 3. Database Schema Design

### 3.1 Tables Overview

```sql
-- Core contract data
contracts (
  id UUID PRIMARY KEY,
  auftrag VARCHAR(50) NOT NULL UNIQUE,
  titel TEXT NOT NULL,
  standort VARCHAR(255),
  saeule_raum VARCHAR(100),
  anlage_nr VARCHAR(100),
  beschreibung TEXT,
  status ENUM('offen', 'inbearb', 'fertig') DEFAULT 'offen',
  sollstart DATE,
  workorder_code VARCHAR(100),
  melder VARCHAR(255),
  seriennummer VARCHAR(100),
  is_complete BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED,
  updated_by INT UNSIGNED,
  
  UNIQUE KEY uk_auftrag (auftrag),
  INDEX idx_status (status),
  INDEX idx_standort (standort),
  INDEX idx_sollstart (sollstart),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Import history tracking
imports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  sheet_name VARCHAR(255),
  records_imported INT,
  records_with_errors INT,
  import_mapping JSON,  -- Store mapping configuration used
  
  imported_by INT UNSIGNED NOT NULL,
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (imported_by) REFERENCES users(id),
  INDEX idx_imported_at (imported_at),
  INDEX idx_imported_by (imported_by)
);

-- Import errors/warnings (audit trail)
import_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  import_id INT NOT NULL,
  row_number INT,
  error_type VARCHAR(50),  -- 'missing_field', 'invalid_type', 'duplicate', etc.
  error_message TEXT,
  affected_fields JSON,
  
  INDEX idx_import_id (import_id),
  FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
);

-- Contract change history (audit trail)
contract_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id CHAR(36) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by INT UNSIGNED NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_contract_id (contract_id),
  INDEX idx_changed_at (changed_at)
);

-- User management (for authentication)
users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- User sessions (for session tracking)
sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_last_activity (last_activity)
);

-- Application logs (for monitoring)
logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_level ENUM('info', 'warning', 'error', 'debug') DEFAULT 'info',
  message TEXT,
  context JSON,  -- { user_id, action, resource_id, etc. }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_log_level (log_level),
  INDEX idx_created_at (created_at)
);
```

### 3.2 Database Initialization Script

**File:** `db/init_contract_manager.sql`

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS contract_manager;
USE contract_manager;

-- Create tables (see above)
-- ... [all CREATE TABLE statements] ...

-- Insert default admin user (password: admin123 - MUST BE CHANGED IN PRODUCTION)
INSERT INTO users (username, email, password_hash, role) VALUES (
  'admin',
  'admin@localhost',
  '$2y$10$...',  -- bcrypt hash of 'admin123'
  'admin'
);

-- Insert default roles/permissions data (for future authorization system)
-- ... [initial data] ...
```

**Setup Instructions:**

```bash
# 1. Copy init_contract_manager.sql to XAMPP MySQL folder
cp db/init_contract_manager.sql /path/to/XAMPP/mysql/data/

# 2. Run via command line
mysql -u root -p < init_contract_manager.sql

# 3. Verify
mysql -u root -p
> USE contract_manager;
> SHOW TABLES;
# Should show: contracts, imports, import_errors, contract_history, users, sessions, logs
```

---

## 4. REST API Design

### 4.1 API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/auth/login` | User login | None |
| POST | `/api/auth/logout` | User logout | Required |
| GET | `/api/auth/me` | Get current user | Required |
| GET | `/api/contracts` | List contracts (paginated, filtered) | Required |
| POST | `/api/contracts` | Create contract | Required |
| GET | `/api/contracts/{id}` | Get single contract | Required |
| PUT | `/api/contracts/{id}` | Update contract | Required |
| DELETE | `/api/contracts/{id}` | Delete contract | Required (admin) |
| POST | `/api/contracts/bulk-update` | Update multiple contracts | Required |
| POST | `/api/contracts/export` | Export to CSV/Excel | Required |
| POST | `/api/imports` | Create import (upload file) | Required |
| GET | `/api/imports` | List import history | Required |
| GET | `/api/imports/{id}/errors` | Get import errors | Required |

### 4.2 API Response Format

All responses follow a consistent structure:

```javascript
// Success response
{
  status: "success",
  code: 200,
  data: { /* ... */ },
  message: "Operation completed successfully"
}

// Error response
{
  status: "error",
  code: 400,
  error: "invalid_field",
  message: "Field 'status' must be one of: offen, inbearb, fertig",
  details: { field: "status", received: "invalid_value" }
}
```

### 4.3 Sample API Endpoints (PHP)

**File:** `api/ContractController.php`

```php
<?php
// Namespace and use statements
namespace App\Controllers;
use App\Models\Contract;
use App\Models\ContractHistory;
use App\Middleware\Auth;

class ContractController {

  /**
   * GET /api/contracts
   * List all contracts (with pagination, filtering, sorting)
   */
  public function list() {
    Auth::requireLogin();
    
    $page = $_GET['page'] ?? 1;
    $limit = $_GET['limit'] ?? 50;
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;
    $sort = $_GET['sort'] ?? 'created_at';
    $dir = $_GET['dir'] ?? 'DESC';
    
    $contracts = Contract::query()
      ->when($status, function($query) use ($status) {
        return $query->where('status', $status);
      })
      ->when($search, function($query) use ($search) {
        return $query->where('auftrag', 'LIKE', "%$search%")
          ->orWhere('titel', 'LIKE', "%$search%")
          ->orWhere('standort', 'LIKE', "%$search%");
      })
      ->orderBy($sort, $dir)
      ->paginate($page, $limit);
    
    return response()->success($contracts);
  }

  /**
   * GET /api/contracts/:id
   * Get single contract with full details
   */
  public function get($id) {
    Auth::requireLogin();
    
    $contract = Contract::findOrFail($id);
    
    // Include change history
    $history = ContractHistory::where('contract_id', $id)
      ->orderBy('changed_at', 'DESC')
      ->limit(50)
      ->get();
    
    $contract->history = $history;
    
    return response()->success($contract);
  }

  /**
   * PUT /api/contracts/:id
   * Update contract
   */
  public function update($id) {
    Auth::requireLogin();
    
    $contract = Contract::findOrFail($id);
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate fields
    $allowed = ['titel', 'status', 'standort', 'saeule_raum', 'anlage_nr', 'sollstart'];
    $updates = array_intersect_key($data, array_flip($allowed));
    
    // Validate status enum
    if (isset($updates['status']) && !in_array($updates['status'], ['offen', 'inbearb', 'fertig'])) {
      return response()->error('invalid_status', 400);
    }
    
    // Track changes in history
    foreach ($updates as $field => $newValue) {
      $oldValue = $contract->{$field};
      if ($oldValue !== $newValue) {
        ContractHistory::create([
          'contract_id' => $id,
          'field_name' => $field,
          'old_value' => $oldValue,
          'new_value' => $newValue,
          'changed_by' => Auth::user()->id
        ]);
      }
    }
    
    // Update contract
    $contract->update($updates);
    $contract->updated_by = Auth::user()->id;
    $contract->save();
    
    return response()->success($contract);
  }

  /**
   * POST /api/contracts/bulk-update
   * Update multiple contracts at once
   */
  public function bulkUpdate() {
    Auth::requireLogin();
    Auth::requireRole('manager');  // Only managers can bulk update
    
    $data = json_decode(file_get_contents('php://input'), true);
    $contractIds = $data['contract_ids'] ?? [];
    $updates = $data['updates'] ?? [];
    
    if (empty($contractIds) || empty($updates)) {
      return response()->error('missing_fields', 400);
    }
    
    $affected = 0;
    foreach ($contractIds as $id) {
      try {
        $this->update($id, $updates);
        $affected++;
      } catch (\Exception $e) {
        \Log::error("Bulk update failed for contract $id", ['error' => $e->getMessage()]);
      }
    }
    
    return response()->success(['affected' => $affected]);
  }

  /**
   * DELETE /api/contracts/:id
   * Delete contract (admin only)
   */
  public function delete($id) {
    Auth::requireLogin();
    Auth::requireRole('admin');
    
    $contract = Contract::findOrFail($id);
    $contract->delete();
    
    \Log::info("Contract deleted", ['contract_id' => $id, 'user_id' => Auth::user()->id]);
    
    return response()->success(['deleted' => true]);
  }

}
```

**File:** `api/AuthController.php`

```php
<?php
namespace App\Controllers;
use App\Models\User;
use App\Models\Session;

class AuthController {

  /**
   * POST /api/auth/login
   * User login (username/password)
   */
  public function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? null;
    $password = $data['password'] ?? null;
    
    if (!$username || !$password) {
      return response()->error('missing_credentials', 400);
    }
    
    $user = User::where('username', $username)->first();
    
    if (!$user || !password_verify($password, $user->password_hash)) {
      \Log::warning("Failed login attempt", ['username' => $username]);
      return response()->error('invalid_credentials', 401);
    }
    
    if (!$user->is_active) {
      return response()->error('user_inactive', 403);
    }
    
    // Create session
    $sessionId = bin2hex(random_bytes(32));
    $_SESSION['user_id'] = $user->id;
    $_SESSION['username'] = $user->username;
    $_SESSION['role'] = $user->role;
    
    Session::create([
      'id' => $sessionId,
      'user_id' => $user->id,
      'ip_address' => $_SERVER['REMOTE_ADDR'],
      'user_agent' => $_SERVER['HTTP_USER_AGENT']
    ]);
    
    \Log::info("User logged in", ['user_id' => $user->id]);
    
    return response()->success([
      'user' => [
        'id' => $user->id,
        'username' => $user->username,
        'email' => $user->email,
        'role' => $user->role
      ]
    ]);
  }

  /**
   * POST /api/auth/logout
   * User logout
   */
  public function logout() {
    if (isset($_SESSION['user_id'])) {
      $userId = $_SESSION['user_id'];
      Session::where('user_id', $userId)->delete();
      session_destroy();
      \Log::info("User logged out", ['user_id' => $userId]);
    }
    
    return response()->success(['logged_out' => true]);
  }

  /**
   * GET /api/auth/me
   * Get current user info
   */
  public function me() {
    if (!isset($_SESSION['user_id'])) {
      return response()->error('unauthorized', 401);
    }
    
    $user = User::find($_SESSION['user_id']);
    
    return response()->success([
      'user' => [
        'id' => $user->id,
        'username' => $user->username,
        'email' => $user->email,
        'role' => $user->role
      ]
    ]);
  }

}
```

---

## 5. Client-Side API Integration

### 5.1 API Client Library (contractApiClient.js)

**New module:** `js/contracts/contractApiClient.js`

```javascript
/**
 * Thin wrapper around fetch() for REST API calls.
 * Handles authentication, error handling, retry logic, and offline fallback.
 */

export class ContractApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.isOnline = navigator.onLine;
    this.offlineQueue = [];
    
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Make authenticated API request
   */
  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'  // Include session cookies
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const json = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired; redirect to login
          window.location.href = '/login.html';
          return;
        }
        throw new Error(json.message || `HTTP ${response.status}`);
      }

      return json.data;  // Return data field from API response

    } catch (err) {
      if (!this.isOnline) {
        // Offline: queue request for later
        this.offlineQueue.push({ method, endpoint, data });
        console.warn('Offline: request queued', endpoint);
        return null;
      }
      throw err;
    }
  }

  // Contract endpoints
  async listContracts(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request('GET', `/contracts?${params}`);
  }

  async getContract(id) {
    return this.request('GET', `/contracts/${id}`);
  }

  async createContract(data) {
    return this.request('POST', '/contracts', data);
  }

  async updateContract(id, data) {
    return this.request('PUT', `/contracts/${id}`, data);
  }

  async deleteContract(id) {
    return this.request('DELETE', `/contracts/${id}`);
  }

  async bulkUpdateContracts(contractIds, updates) {
    return this.request('POST', '/contracts/bulk-update', {
      contract_ids: contractIds,
      updates
    });
  }

  async exportContracts(format = 'csv') {
    return this.request('POST', '/contracts/export', { format });
  }

  // Import endpoints
  async uploadImport(file, mapping = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    const response = await fetch(`${this.baseUrl}/imports`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    return response.json();
  }

  async listImports() {
    return this.request('GET', '/imports');
  }

  async getImportErrors(importId) {
    return this.request('GET', `/imports/${importId}/errors`);
  }

  // Auth endpoints
  async login(username, password) {
    return this.request('POST', '/auth/login', { username, password });
  }

  async logout() {
    return this.request('POST', '/auth/logout');
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }

  // Offline support
  async handleOnline() {
    this.isOnline = true;
    console.log('Back online; retrying queued requests...');
    
    while (this.offlineQueue.length > 0) {
      const { method, endpoint, data } = this.offlineQueue.shift();
      try {
        await this.request(method, endpoint, data);
      } catch (err) {
        console.error('Retry failed:', err);
        // Re-queue on failure
        this.offlineQueue.unshift({ method, endpoint, data });
        break;
      }
    }
  }

  async handleOffline() {
    this.isOnline = false;
    console.log('Gone offline');
  }
}

// Singleton instance
export const apiClient = new ContractApiClient();
```

### 5.2 Updating Contract Handlers for API

**File:** `js/contracts/contractHandlers.js` (updated)

```javascript
// CHANGED: Instead of contractRepository.addContracts(), now use apiClient

export async function handleContractImportSave() {
  const state = getState();
  const { tempWorkbook, currentMapping, lastImportResult } = state.contracts;

  if (!lastImportResult) {
    updateImportUIState({ error: "No import preview" });
    return;
  }

  updateImportUIState({ isLoading: true, message: "Saving to server..." });

  try {
    // Upload to server
    const result = await apiClient.uploadImport(
      lastImportResult.file,
      currentMapping
    );

    // Update state with server response
    setState({
      contracts: {
        ...state.contracts,
        records: result.contracts,  // Server returns saved contracts
        importedFiles: [...state.contracts.importedFiles, result.fileMeta],
        lastImportResult: null,
        tempWorkbook: null
      }
    });

    updateImportUIState({
      isLoading: false,
      message: `${result.contracts.length} contracts saved successfully`
    });

  } catch (err) {
    updateImportUIState({
      isLoading: false,
      error: err.message
    });
  }
}

export async function handleContractActionClick(event) {
  // ... (unchanged filtering/sorting logic) ...

  // CHANGED: Update via API instead of direct repository call
  if (event.target.dataset.action === 'edit-contract') {
    const contractId = event.target.dataset.contractId;
    const newStatus = prompt("New status (offen/inbearb/fertig):");
    
    if (newStatus) {
      try {
        const updated = await apiClient.updateContract(contractId, { status: newStatus });
        
        // Update local state
        const contracts = state.contracts.records.map(c =>
          c.id === contractId ? updated : c
        );
        setState({
          contracts: { ...state.contracts, records: contracts }
        });

      } catch (err) {
        alert(`Update failed: ${err.message}`);
      }
    }
  }
}
```

### 5.3 Offline-First Strategy

With API client, the application gracefully handles offline scenarios:

```javascript
// If offline, requests are queued
await apiClient.updateContract(id, { status: 'fertig' });
// → Queue: [{ method: 'PUT', endpoint: '/contracts/123', data: {...} }]

// UI shows "offline mode" indicator
// User can continue working (filtered from cached data)

// When back online, requests auto-retry
// → handleOnline() processes queue
```

---

## 6. Authentication & Authorization

### 6.1 Session-Based Authentication

**File:** `api/middleware/Auth.php`

```php
<?php
namespace App\Middleware;

class Auth {

  /**
   * Require user to be logged in
   */
  public static function requireLogin() {
    if (!isset($_SESSION['user_id'])) {
      http_response_code(401);
      echo json_encode([
        'status' => 'error',
        'code' => 401,
        'message' => 'Unauthorized'
      ]);
      exit;
    }
  }

  /**
   * Require specific role
   */
  public static function requireRole($role) {
    self::requireLogin();
    
    if ($_SESSION['role'] !== $role && $_SESSION['role'] !== 'admin') {
      http_response_code(403);
      echo json_encode([
        'status' => 'error',
        'code' => 403,
        'message' => 'Forbidden: insufficient permissions'
      ]);
      exit;
    }
  }

  /**
   * Get current user
   */
  public static function user() {
    if (!isset($_SESSION['user_id'])) {
      return null;
    }
    return User::find($_SESSION['user_id']);
  }

}
```

### 6.2 Role-Based Access Control

| Role | Import | View | Edit | Delete | Admin |
|------|--------|------|------|--------|-------|
| **admin** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **manager** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **viewer** | ✗ | ✓ | ✗ | ✗ | ✗ |

### 6.3 Client-Side Login Page

**File:** `login.html` (new)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Contract Manager – Login</title>
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/login.css">
</head>
<body>
  <main class="login-container">
    <section class="login-panel">
      <h1>Contract Manager</h1>
      <form id="login-form" method="POST">
        <div class="form-group">
          <label for="username">Benutzername</label>
          <input id="username" type="text" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">Passwort</label>
          <input id="password" type="password" name="password" required>
        </div>
        <button type="submit" class="btn btn--primary">Anmelden</button>
        <div id="login-error" class="status status--error" style="display: none;"></div>
      </form>
    </section>
  </main>

  <script type="module">
    import { apiClient } from './js/contracts/contractApiClient.js';

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        await apiClient.login(username, password);
        window.location.href = '/index.html';  // Redirect to app
      } catch (err) {
        document.getElementById('login-error').textContent = err.message;
        document.getElementById('login-error').style.display = 'block';
      }
    });
  </script>
</body>
</html>
```

---

## 7. Data Migration Strategy

### 7.1 Migrating localStorage to Database

When Phase 5 is deployed, existing users have contract data in localStorage. This must be migrated to the database:

**File:** `js/migration/migrateToBackend.js`

```javascript
/**
 * Migrate contract data from localStorage to backend API
 */

export async function migrateLocalStorageToBackend(apiClient) {
  const state = getState();
  const contracts = state.contracts.records || [];

  if (contracts.length === 0) {
    console.log('No contracts to migrate');
    return { success: true, migratedCount: 0 };
  }

  console.log(`Migrating ${contracts.length} contracts...`);

  const results = [];

  for (const contract of contracts) {
    try {
      // Send to server
      const response = await apiClient.createContract({
        id: contract.id,
        auftrag: contract.contractId,
        titel: contract.contractTitle,
        standort: contract.location,
        saeule_raum: contract.roomArea,
        anlage_nr: contract.equipmentId,
        beschreibung: contract.description,
        status: contract.status,
        sollstart: contract.plannedStart,
        workorder_code: contract.workorderCode,
        melder: contract.reportedBy,
        seriennummer: contract.serialNumber,
        is_complete: contract.isComplete
      });

      results.push({ success: true, contractId: contract.id });
      console.log(`✓ Migrated ${contract.contractId}`);

    } catch (err) {
      results.push({
        success: false,
        contractId: contract.id,
        error: err.message
      });
      console.error(`✗ Failed to migrate ${contract.id}:`, err);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Migration complete: ${successCount} success, ${failCount} failed`);

  return {
    success: failCount === 0,
    migratedCount: successCount,
    failedCount: failCount,
    details: results
  };
}
```

**Trigger migration on first app load (Phase 5):**

```javascript
// In main.js
async function initializeApp() {
  // ... existing initialization ...

  // Check if user is logged in
  const currentUser = await apiClient.getCurrentUser();
  if (currentUser && localStorage.getItem('contract_manager_migrated') !== 'true') {
    console.log('Running first-time migration...');
    const result = await migrateLocalStorageToBackend(apiClient);
    if (result.success) {
      localStorage.setItem('contract_manager_migrated', 'true');
      // Clear old localStorage data
      removeFromState('contracts.records');
      // Reload contracts from server
      const contracts = await apiClient.listContracts();
      setState({ contracts: { ...getState().contracts, records: contracts } });
    } else {
      showWarning(`Migration incomplete: ${result.failedCount} contracts failed`);
    }
  }
}
```

---

## 8. Advanced Features

### 8.1 Bulk Operations

**Use Case:** Manager wants to mark all open contracts in a location as "in progress"

**UI Implementation:**

```html
<!-- Add bulk actions toolbar -->
<div id="cm-bulk-actions" class="cm-hidden">
  <button id="cm-bulk-update-status">Update Status</button>
  <button id="cm-bulk-export">Export Selected</button>
  <button id="cm-bulk-clear">Clear Selection</button>
</div>
```

**Handler:**

```javascript
export async function handleBulkUpdateStatus() {
  const selected = document.querySelectorAll('#cm-contract-table tbody input:checked');
  const contractIds = Array.from(selected).map(el => el.dataset.contractId);
  const newStatus = prompt("New status (offen/inbearb/fertig):");

  if (contractIds.length === 0 || !newStatus) return;

  try {
    const result = await apiClient.bulkUpdateContracts(contractIds, { status: newStatus });
    showSuccess(`Updated ${result.affected} contracts`);
    
    // Refresh list
    const contracts = await apiClient.listContracts();
    setState({ contracts: { ...getState().contracts, records: contracts } });
  } catch (err) {
    showError(err.message);
  }
}
```

### 8.2 Export to Excel/CSV

**Server-side:**

```php
// api/ExportController.php
public function export() {
  $format = $_POST['format'] ?? 'csv';  // 'csv' or 'xlsx'
  $filters = $_GET;  // Re-use same filters as list endpoint

  $contracts = Contract::query()
    ->when($filters['status'], fn($q) => $q->where('status', $filters['status']))
    ->when($filters['search'], fn($q) => $q->where('auftrag', 'LIKE', "%{$filters['search']}%"))
    ->get();

  if ($format === 'csv') {
    return $this->exportCsv($contracts);
  } else if ($format === 'xlsx') {
    return $this->exportExcel($contracts);
  }
}

private function exportCsv($contracts) {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename=contracts_' . date('Y-m-d') . '.csv');

  $output = fopen('php://output', 'w');
  fputcsv($output, ['Auftrag', 'Titel', 'Standort', 'Anlage', 'Status', 'Sollstart']);

  foreach ($contracts as $c) {
    fputcsv($output, [
      $c->auftrag,
      $c->titel,
      $c->standort,
      $c->anlage_nr,
      $c->status,
      $c->sollstart
    ]);
  }

  fclose($output);
}
```

---

## 9. Monitoring & Logging

### 9.1 Server-Side Logging

**File:** `api/lib/Logger.php`

```php
<?php
namespace App\Lib;

class Logger {

  const LOG_FILE = '/var/log/contract_manager.log';

  public static function info($message, $context = []) {
    self::log('info', $message, $context);
  }

  public static function warning($message, $context = []) {
    self::log('warning', $message, $context);
  }

  public static function error($message, $context = []) {
    self::log('error', $message, $context);
  }

  public static function debug($message, $context = []) {
    self::log('debug', $message, $context);
  }

  private static function log($level, $message, $context = []) {
    $entry = [
      'timestamp' => date('Y-m-d H:i:s'),
      'level' => strtoupper($level),
      'message' => $message,
      'context' => $context,
      'user_id' => $_SESSION['user_id'] ?? null,
      'ip' => $_SERVER['REMOTE_ADDR'] ?? null
    ];

    $logLine = json_encode($entry) . "\n";
    file_put_contents(self::LOG_FILE, $logLine, FILE_APPEND);
  }

}
```

**Usage:**

```php
\Log::info("Contract imported", [
  'contract_id' => $contract->id,
  'auftrag' => $contract->auftrag,
  'user_id' => Auth::user()->id
]);
```

### 9.2 Error Tracking

**Global error handler:**

```php
// api/error_handler.php
set_error_handler(function($errno, $errstr, $errfile, $errline) {
  \Log::error("PHP Error", [
    'errno' => $errno,
    'errstr' => $errstr,
    'file' => $errfile,
    'line' => $errline
  ]);
  return false;
});

set_exception_handler(function($exception) {
  \Log::error("Uncaught Exception", [
    'class' => get_class($exception),
    'message' => $exception->getMessage(),
    'file' => $exception->getFile(),
    'line' => $exception->getLine()
  ]);
  
  http_response_code(500);
  echo json_encode([
    'status' => 'error',
    'message' => 'Internal server error'
  ]);
});
```

---

## 10. Deployment & Configuration

### 10.1 XAMPP Configuration for Production

**File:** `config/production.env`

```ini
# Database
DB_HOST=localhost
DB_NAME=contract_manager
DB_USER=cm_user
DB_PASS=secure_password_here

# Application
APP_ENV=production
APP_DEBUG=false
SESSION_TIMEOUT=3600

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/contract_manager.log

# CORS (if frontend on different domain)
CORS_ORIGIN=https://contracts.example.com

# Security
CSRF_TOKEN_ENABLED=true
SESSION_SECURE_COOKIE=true
```

### 10.2 Deployment Checklist

- [ ] Create database and run `init_contract_manager.sql`
- [ ] Create MySQL user with limited privileges
- [ ] Copy API files to XAMPP htdocs
- [ ] Set file permissions (755 for dirs, 644 for files)
- [ ] Configure `.htaccess` for URL rewriting (REST API routing)
- [ ] Test API endpoints manually
- [ ] Set up log rotation (logrotate)
- [ ] Enable HTTPS (self-signed cert for internal network)
- [ ] Test login and basic workflows
- [ ] Monitor error logs

**Sample .htaccess for API routing:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /api/
  
  # Remove .php extension
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php?request=$1 [QSA,L]
</IfModule>
```

---

## 11. Phase 5 Deliverables Checklist

### Database

- [ ] MySQL schema created (contracts, imports, users, sessions, logs)
- [ ] Initialization script (`init_contract_manager.sql`) tested
- [ ] Indexes created for performance
- [ ] Foreign key relationships validated

### API Layer

- [ ] REST API endpoints implemented (13 endpoints)
- [ ] Authentication/authorization working
- [ ] Request/response format consistent
- [ ] Error handling standardized
- [ ] API documentation complete

### Client Integration

- [ ] `contractApiClient.js` implemented
- [ ] Event handlers updated to use API
- [ ] Offline fallback working
- [ ] Login page implemented and styled
- [ ] Session management working

### Advanced Features

- [ ] Bulk operations (update multiple contracts)
- [ ] Export to CSV/Excel
- [ ] Data migration from localStorage
- [ ] Change history tracking

### Deployment

- [ ] Production configuration documented
- [ ] Deployment checklist created
- [ ] Log rotation configured
- [ ] Error tracking implemented
- [ ] Monitoring alerts set up

### Testing

- [ ] API endpoints tested manually
- [ ] Authentication flow tested
- [ ] Bulk operations tested
- [ ] Migration tested with real data
- [ ] Performance tested (query optimization, indexes)

---

## 12. Rollback Plan

If Phase 5 causes critical issues:

1. **Revert to Phase 4 (localStorage-only)**
   - Serve `index_phase4.html` (backup of working version)
   - Keep database as backup
   - Users lose new features but can continue working

2. **Troubleshoot in staging**
   - Copy production DB to staging
   - Test fix without affecting users
   - Deploy fix to production once verified

3. **Database Recovery**
   - Automated daily backups of MySQL
   - Can restore to point-in-time if data corruption detected

---

## 13. Future Enhancements (Phase 6+)

- [ ] Real-time notifications (WebSocket)
- [ ] Contract approval workflows
- [ ] Integration with external systems (ERP, CRM)
- [ ] Mobile app (React Native or Flutter)
- [ ] Advanced analytics & reporting
- [ ] Machine learning for contract classification
- [ ] Document management (store PDFs linked to contracts)
- [ ] Electronic signatures
- [ ] Multi-language support (i18n)

---

## 14. Sign-Off

**Document Version:** 1.0  
**Created:** December 9, 2025  
**Status:** Ready for Implementation  
**Author:** AI Research Agent  
**Approval:** (Pending stakeholder review)

---

**End of Phase 5 Specification**

**Contract Manager Module – Complete 5-Phase Roadmap (Phases 1–5) is now finished!**
