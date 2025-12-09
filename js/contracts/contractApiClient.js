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
        
        // Set up online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
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
            const json = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Session expired; redirect to login
                    this.handleUnauthorized();
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
    handleUnauthorized() {
        // Clear any stored auth data
        sessionStorage.removeItem('user');
        // Redirect to login page
        window.location.href = '/login.html';
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
        }
        return result;
    }

    /**
     * Logout current user
     * @returns {Promise<Object>} Logout confirmation
     */
    async logout() {
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
