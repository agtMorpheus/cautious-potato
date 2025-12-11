/**
 * Contract API Client Module (Phase 5)
 * 
 * Thin wrapper around fetch() for REST API calls.
 * Handles authentication, error handling, retry logic, and offline fallback.
 * 
 * This module provides a unified interface for communicating with the backend API,
 * supporting both online and offline operations with automatic request queuing.
 */

/**
 * ContractApiClient class for REST API communication
 */
export class ContractApiClient {
    /**
     * Create a new ContractApiClient instance
     * @param {string} baseUrl - Base URL for API endpoints (default: '/api')
     */
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000; // ms
        this.sessionTimeout = 7200000; // 2 hours in milliseconds
        this.warningTime = 600000; // Show warning 10 minutes before expiry
        this.sessionTimer = null;
        this.warningTimer = null;
        
        // Set up online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Set up session monitoring
        this.initializeSessionMonitoring();
    }

    /**
     * Set the base URL for API requests
     * @param {string} url - New base URL
     */
    setBaseUrl(url) {
        // Remove trailing slash if present
        this.baseUrl = url.replace(/\/$/, '');
        console.log(`API Base URL updated to: ${this.baseUrl}`);
    }

    /**
     * Make authenticated API request
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} endpoint - API endpoint path
     * @param {Object|null} data - Request body data (for POST/PUT)
     * @returns {Promise<Object>} API response data
     */
    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include' // Include session cookies
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);

            let json;
            try {
                json = await response.json();
            } catch (parseError) {
                // JSON parsing failed
                if (!response.ok) {
                    // If the response was an error (e.g. 404/500) and not JSON,
                    // it's likely a server error page (HTML).
                    // Use statusText if available, otherwise default to status
                    const statusText = response.statusText || 'Error';
                    throw new ApiError(`HTTP ${response.status} ${statusText}`, response.status, {
                        error: 'server_error',
                        details: 'Non-JSON response received'
                    });
                }

                // If response was OK (200) but not JSON, that's unexpected for this API
                throw new ApiError(`Invalid server response: ${parseError.message}`, response.status, {
                    error: 'invalid_json',
                    details: 'Response could not be parsed as JSON'
                });
            }

            if (!response.ok) {
                if (response.status === 401) {
                    // Session expired; redirect to login
                    this.handleUnauthorized(json);
                    return null;
                }
                const errorMessage = json.message || `HTTP ${response.status}`;
                throw new ApiError(errorMessage, response.status, json);
            }

            return json.data; // Return data field from API response

        } catch (err) {
            if (!this.isOnline && this.isQueueableMethod(method)) {
                // Offline: queue request for later
                this.offlineQueue.push({ method, endpoint, data, timestamp: Date.now() });
                console.warn('Offline: request queued', endpoint);
                return null;
            }
            throw err;
        }
    }

    /**
     * Check if a method should be queued when offline
     * @param {string} method - HTTP method
     * @returns {boolean} Whether the method should be queued
     */
    isQueueableMethod(method) {
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    }

    /**
     * Handle unauthorized response
     */
    handleUnauthorized(errorData = {}) {
        // Clear any stored auth data
        sessionStorage.removeItem('user');
        localStorage.removeItem('sessionWarningShown');
        
        // Show session expired message if applicable
        if (errorData.session_expired) {
            this.showSessionExpiredMessage(errorData.error);
        }
        
        // Redirect to login page after a brief delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, errorData.session_expired ? 2000 : 0);
    }
    
    /**
     * Show session expired message
     */
    showSessionExpiredMessage(errorType) {
        const messages = {
            'session_expired': 'Ihre Sitzung ist aufgrund von Inaktivität abgelaufen.',
            'session_invalid': 'Ihre Sitzung ist nicht mehr gültig.',
            'unauthorized': 'Sie sind nicht angemeldet.'
        };
        
        const message = messages[errorType] || 'Ihre Sitzung ist abgelaufen.';
        
        // Create and show notification
        const notification = document.createElement('div');
        notification.className = 'session-expired-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <strong>Sitzung abgelaufen</strong>
                <p>${message} Sie werden zur Anmeldung weitergeleitet.</p>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-surface);
            color: var(--c-danger);
            border: 1px solid var(--c-danger);
            border-radius: 4px;
            padding: 15px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after redirect
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // ============================================================
    // Contract Endpoints
    // ============================================================

    /**
     * List all contracts (with pagination, filtering, sorting)
     * @param {Object} filters - Filter parameters
     * @returns {Promise<Object>} Paginated contract list
     */
    async listContracts(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });
        const queryString = params.toString();
        return this.request('GET', `/contracts${queryString ? `?${queryString}` : ''}`);
    }

    /**
     * Get a single contract by ID
     * @param {string} id - Contract UUID
     * @returns {Promise<Object>} Contract object with history
     */
    async getContract(id) {
        return this.request('GET', `/contracts/${id}`);
    }

    /**
     * Create a new contract
     * @param {Object} data - Contract data
     * @returns {Promise<Object>} Created contract
     */
    async createContract(data) {
        return this.request('POST', '/contracts', data);
    }

    /**
     * Update an existing contract
     * @param {string} id - Contract UUID
     * @param {Object} data - Fields to update
     * @returns {Promise<Object>} Updated contract
     */
    async updateContract(id, data) {
        return this.request('PUT', `/contracts/${id}`, data);
    }

    /**
     * Delete a contract
     * @param {string} id - Contract UUID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteContract(id) {
        return this.request('DELETE', `/contracts/${id}`);
    }

    /**
     * Bulk update multiple contracts
     * @param {Array<string>} contractIds - Array of contract UUIDs
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Update result with affected count
     */
    async bulkUpdateContracts(contractIds, updates) {
        return this.request('POST', '/contracts/bulk-update', {
            contract_ids: contractIds,
            updates
        });
    }

    /**
     * Export contracts to CSV or Excel
     * @param {string} format - Export format ('csv' or 'xlsx')
     * @param {Object} filters - Optional filters to apply
     * @returns {Promise<Object>} Export result with download URL
     */
    async exportContracts(format = 'csv', filters = {}) {
        return this.request('POST', '/contracts/export', { format, ...filters });
    }

    // ============================================================
    // Import Endpoints
    // ============================================================

    /**
     * Upload and import a file
     * @param {File} file - File to upload
     * @param {Object|null} mapping - Optional column mapping configuration
     * @returns {Promise<Object>} Import result
     */
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
            const json = await response.json();
            throw new ApiError(json.message || `Import failed: ${response.statusText}`, response.status, json);
        }

        return response.json();
    }

    /**
     * List import history
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of past imports
     */
    async listImports(options = {}) {
        const params = new URLSearchParams(options);
        return this.request('GET', `/imports?${params}`);
    }

    /**
     * Get errors for a specific import
     * @param {number} importId - Import ID
     * @returns {Promise<Array>} List of import errors
     */
    async getImportErrors(importId) {
        return this.request('GET', `/imports/${importId}/errors`);
    }

    // ============================================================
    // Authentication Endpoints
    // ============================================================

    /**
     * Login with username and password
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} User object on success
     */
    async login(username, password) {
        const result = await this.request('POST', '/auth/login', { username, password });
        if (result && result.user) {
            sessionStorage.setItem('user', JSON.stringify(result.user));
            this.startSessionTimer(); // Start session monitoring
        }
        return result;
    }

    /**
     * Logout current user
     * @returns {Promise<Object>} Logout confirmation
     */
    async logout() {
        this.clearSessionTimers(); // Clear session monitoring
        const result = await this.request('POST', '/auth/logout');
        sessionStorage.removeItem('user');
        return result;
    }

    /**
     * Get current user info
     * @returns {Promise<Object|null>} User object or null if not authenticated
     */
    async getCurrentUser() {
        try {
            const result = await this.request('GET', '/auth/me');
            return result?.user || null;
        } catch (err) {
            if (err.status === 401) {
                return null;
            }
            throw err;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user is authenticated
     */
    isAuthenticated() {
        return sessionStorage.getItem('user') !== null;
    }

    /**
     * Get cached user from session storage
     * @returns {Object|null} Cached user object
     */
    getCachedUser() {
        const userData = sessionStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
    
    // ============================================================
    // Session Management
    // ============================================================
    
    /**
     * Initialize session monitoring
     */
    initializeSessionMonitoring() {
        // Reset timers when user becomes active
        const resetSessionTimer = () => {
            if (this.isAuthenticated()) {
                this.startSessionTimer();
            }
        };
        
        // Listen for user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetSessionTimer, { passive: true });
        });
        
        // Start timer if already authenticated
        if (this.isAuthenticated()) {
            this.startSessionTimer();
        }
    }
    
    /**
     * Start session timeout timer
     */
    startSessionTimer() {
        // Clear existing timers
        if (this.sessionTimer) clearTimeout(this.sessionTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);
        
        // Set warning timer (10 minutes before expiry)
        this.warningTimer = setTimeout(() => {
            this.showSessionWarning();
        }, this.sessionTimeout - this.warningTime);
        
        // Set session expiry timer
        this.sessionTimer = setTimeout(() => {
            this.handleSessionExpiry();
        }, this.sessionTimeout);
    }
    
    /**
     * Show session expiry warning
     */
    showSessionWarning() {
        // Don't show multiple warnings
        if (localStorage.getItem('sessionWarningShown') === 'true') {
            return;
        }
        
        localStorage.setItem('sessionWarningShown', 'true');
        
        const warning = document.createElement('div');
        warning.className = 'session-warning-modal';
        warning.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>Sitzung läuft ab</h3>
                    <p>Ihre Sitzung läuft in 10 Minuten ab. Möchten Sie die Sitzung verlängern?</p>
                    <div class="modal-actions">
                        <button id="extend-session" class="btn btn--primary">Sitzung verlängern</button>
                        <button id="logout-now" class="btn btn--secondary">Jetzt abmelden</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .session-warning-modal .modal-overlay {
                background: rgba(0,0,0,0.5);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .session-warning-modal .modal-content {
                background: var(--bg-card);
                color: var(--text-main);
                padding: 30px;
                border-radius: 8px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                border: 1px solid var(--border-base);
            }
            .session-warning-modal .modal-actions {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            .session-warning-modal .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            .session-warning-modal .btn--primary {
                background: var(--primary-main);
                color: var(--text-inverse);
            }
            .session-warning-modal .btn--secondary {
                background: var(--bg-surface);
                color: var(--text-main);
                border: 1px solid var(--border-base);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(warning);
        
        // Handle actions
        document.getElementById('extend-session').addEventListener('click', async () => {
            try {
                // Make a simple API call to refresh session
                await this.getCurrentUser();
                this.startSessionTimer(); // Restart timer
                localStorage.removeItem('sessionWarningShown');
                document.body.removeChild(warning);
                document.head.removeChild(style);
            } catch (err) {
                console.error('Failed to extend session:', err);
                this.handleUnauthorized();
            }
        });
        
        document.getElementById('logout-now').addEventListener('click', async () => {
            try {
                await this.logout();
            } catch (err) {
                console.error('Logout failed:', err);
            }
            window.location.href = '/logout.html';
        });
    }
    
    /**
     * Handle session expiry
     */
    handleSessionExpiry() {
        localStorage.removeItem('sessionWarningShown');
        this.handleUnauthorized({ session_expired: true, error: 'session_expired' });
    }
    
    /**
     * Clear session timers
     */
    clearSessionTimers() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
        localStorage.removeItem('sessionWarningShown');
    }

    // ============================================================
    // Offline Support
    // ============================================================

    /**
     * Handle coming back online
     * Implements exponential backoff and max retry limits
     */
    async handleOnline() {
        this.isOnline = true;
        console.log('Back online; retrying queued requests...');
        
        const maxRetries = 3;
        const queueTTL = 24 * 60 * 60 * 1000; // 24 hours max age for queued requests
        const now = Date.now();
        
        // Filter out expired requests
        this.offlineQueue = this.offlineQueue.filter(req => {
            if (req.timestamp && (now - req.timestamp) > queueTTL) {
                console.warn(`Dropping expired queued request: ${req.endpoint}`);
                return false;
            }
            return true;
        });
        
        let retryCount = 0;
        let delay = 1000; // Start with 1 second delay
        
        while (this.offlineQueue.length > 0 && retryCount < maxRetries) {
            const request = this.offlineQueue[0];
            const { method, endpoint, data } = request;
            
            try {
                // Temporarily set online to prevent re-queuing
                await this.request(method, endpoint, data);
                this.offlineQueue.shift(); // Remove successful request
                console.log(`Successfully synced: ${method} ${endpoint}`);
                retryCount = 0; // Reset retry count on success
                delay = 1000; // Reset delay
            } catch (err) {
                retryCount++;
                console.error(`Retry ${retryCount}/${maxRetries} failed for ${endpoint}:`, err.message);
                
                if (retryCount >= maxRetries) {
                    console.error(`Max retries reached for ${endpoint}, keeping in queue for next online event`);
                    break;
                }
                
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * 2, 30000); // Max 30 second delay
            }
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('apiClientOnline', { detail: { queueLength: this.offlineQueue.length } }));
    }

    /**
     * Handle going offline
     */
    handleOffline() {
        this.isOnline = false;
        console.log('Gone offline');
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('apiClientOffline'));
    }

    /**
     * Get the current offline queue length
     * @returns {number} Number of queued requests
     */
    getQueueLength() {
        return this.offlineQueue.length;
    }

    /**
     * Clear the offline queue (e.g., on logout)
     */
    clearQueue() {
        this.offlineQueue = [];
    }

    // ============================================================
    // Analytics Endpoints (Phase 6)
    // ============================================================

    /**
     * Get analytics dashboard data
     * @returns {Promise<Object>} Dashboard data
     */
    async getDashboard() {
        return this.request('GET', '/analytics/dashboard');
    }

    /**
     * Get contract trends over time
     * @param {number} days - Number of days (default: 30)
     * @returns {Promise<Object>} Trends data
     */
    async getContractTrends(days = 30) {
        return this.request('GET', `/analytics/trends?days=${days}`);
    }

    /**
     * Get bottleneck analysis
     * @param {number} thresholdDays - Days threshold for stuck contracts
     * @returns {Promise<Object>} Bottleneck data
     */
    async getBottlenecks(thresholdDays = 30) {
        return this.request('GET', `/analytics/bottlenecks?threshold_days=${thresholdDays}`);
    }

    /**
     * Get SLA status summary
     * @returns {Promise<Object>} SLA status data
     */
    async getSlaStatus() {
        return this.request('GET', '/analytics/sla-status');
    }

    /**
     * Trigger metrics calculation
     * @param {string} date - Date to calculate metrics for (YYYY-MM-DD)
     * @returns {Promise<Object>} Calculation result
     */
    async calculateMetrics(date = null) {
        return this.request('POST', '/analytics/calculate-metrics', { date });
    }

    // ============================================================
    // Workflow Endpoints (Phase 6)
    // ============================================================

    /**
     * Transition contract status
     * @param {string} contractId - Contract UUID
     * @param {string} newStatus - Target status
     * @param {string} reason - Optional reason
     * @returns {Promise<Object>} Updated contract
     */
    async transitionContract(contractId, newStatus, reason = null) {
        return this.request('POST', `/contracts/${contractId}/transition`, {
            status: newStatus,
            reason
        });
    }

    /**
     * Request approval for a contract
     * @param {string} contractId - Contract UUID
     * @param {number} approverId - Approver user ID
     * @param {string} note - Optional note
     * @returns {Promise<Object>} Approval request
     */
    async requestApproval(contractId, approverId, note = null) {
        return this.request('POST', `/contracts/${contractId}/request-approval`, {
            approver_id: approverId,
            note
        });
    }

    /**
     * Process approval (approve or reject)
     * @param {string} contractId - Contract UUID
     * @param {boolean} approve - True to approve, false to reject
     * @param {string} comments - Optional comments
     * @returns {Promise<Object>} Approval result
     */
    async processApproval(contractId, approve, comments = null) {
        return this.request('POST', `/contracts/${contractId}/process-approval`, {
            approve,
            comments
        });
    }

    /**
     * Get pending approvals for current user
     * @returns {Promise<Array>} List of pending approvals
     */
    async getPendingApprovals() {
        return this.request('GET', '/approvals/pending');
    }

    /**
     * Get workflow history for a contract
     * @param {string} contractId - Contract UUID
     * @returns {Promise<Array>} Workflow transitions
     */
    async getWorkflowHistory(contractId) {
        return this.request('GET', `/contracts/${contractId}/workflow-history`);
    }

    // ============================================================
    // Data Quality Endpoints (Phase 6)
    // ============================================================

    /**
     * Detect duplicate contracts
     * @param {number} threshold - Similarity threshold (0-1)
     * @returns {Promise<Array>} List of potential duplicates
     */
    async detectDuplicates(threshold = 0.8) {
        return this.request('GET', `/contracts/duplicates?threshold=${threshold}`);
    }

    /**
     * Find duplicates for a specific contract
     * @param {string} contractId - Contract UUID
     * @returns {Promise<Array>} List of potential duplicates
     */
    async findDuplicatesFor(contractId) {
        return this.request('GET', `/contracts/${contractId}/duplicates`);
    }

    /**
     * Merge two duplicate contracts
     * @param {string} keepId - Contract ID to keep
     * @param {string} deleteId - Contract ID to delete
     * @returns {Promise<Object>} Merged contract
     */
    async mergeDuplicates(keepId, deleteId) {
        return this.request('POST', '/contracts/merge', {
            keep_id: keepId,
            delete_id: deleteId
        });
    }

    /**
     * Dismiss duplicate pair
     * @param {string} contract1Id - First contract ID
     * @param {string} contract2Id - Second contract ID
     * @returns {Promise<Object>} Dismissal result
     */
    async dismissDuplicate(contract1Id, contract2Id) {
        return this.request('POST', '/contracts/duplicates/dismiss', {
            contract1_id: contract1Id,
            contract2_id: contract2Id
        });
    }

    /**
     * Validate contract data
     * @param {Object} data - Contract data to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateContract(data) {
        return this.request('POST', '/contracts/validate', data);
    }

    // ============================================================
    // Notifications Endpoints (Phase 6)
    // ============================================================

    /**
     * Get user notifications
     * @param {boolean} unreadOnly - Only get unread notifications
     * @returns {Promise<Array>} List of notifications
     */
    async getNotifications(unreadOnly = false) {
        return this.request('GET', `/notifications${unreadOnly ? '?unread=true' : ''}`);
    }

    /**
     * Mark notification as read
     * @param {number} notificationId - Notification ID
     * @returns {Promise<Object>} Updated notification
     */
    async markNotificationRead(notificationId) {
        return this.request('PUT', `/notifications/${notificationId}/read`);
    }

    /**
     * Mark all notifications as read
     * @returns {Promise<Object>} Result
     */
    async markAllNotificationsRead() {
        return this.request('PUT', '/notifications/read-all');
    }

    // ============================================================
    // Compliance Endpoints (Phase 6)
    // ============================================================

    /**
     * Get data retention report
     * @returns {Promise<Object>} Retention report
     */
    async getRetentionReport() {
        return this.request('GET', '/compliance/retention');
    }

    /**
     * Get GDPR compliance report
     * @returns {Promise<Object>} Compliance report
     */
    async getComplianceReport() {
        return this.request('GET', '/compliance/report');
    }

    /**
     * Create deletion request
     * @param {string} type - Request type ('user_data', 'contract', 'all_data')
     * @param {string} targetId - Target ID
     * @param {string} reason - Reason for deletion
     * @returns {Promise<Object>} Deletion request
     */
    async createDeletionRequest(type, targetId, reason = null) {
        return this.request('POST', '/compliance/deletion-request', {
            type,
            target_id: targetId,
            reason
        });
    }
}

/**
 * Custom API Error class for better error handling
 */
export class ApiError extends Error {
    /**
     * Create an ApiError
     * @param {string} message - Error message
     * @param {number} status - HTTP status code
     * @param {Object} data - Response data
     */
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        this.code = data.error || 'unknown_error';
    }
}

// Singleton instance for convenience
export const apiClient = new ContractApiClient();

// Export default for ES modules
export default apiClient;
