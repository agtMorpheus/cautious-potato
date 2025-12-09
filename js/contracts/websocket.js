/**
 * WebSocket Client (Phase 6)
 * 
 * Real-time updates for contracts via WebSocket connection.
 * Supports automatic reconnection, subscription management, and event handling.
 */

export class ContractWebSocket {
    /**
     * Create a ContractWebSocket instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.url = options.url || this.getDefaultUrl();
        this.reconnectInterval = options.reconnectInterval || 3000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
        
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.subscriptions = new Set();
        this.listeners = new Map();
        this.pendingMessages = [];
        this.heartbeatTimer = null;
        this.userId = null;
    }
    
    /**
     * Get default WebSocket URL based on current location
     */
    getDefaultUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
    }
    
    /**
     * Connect to WebSocket server
     * @returns {Promise} Resolves when connected
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }
            
            try {
                this.ws = new WebSocket(this.url);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Start heartbeat
                    this.startHeartbeat();
                    
                    // Send pending messages
                    this.flushPendingMessages();
                    
                    // Resubscribe to previous subscriptions
                    this.resubscribe();
                    
                    // Dispatch connected event
                    this.emit('connected', { timestamp: Date.now() });
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', { error });
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    console.log('WebSocket disconnected', event.code, event.reason);
                    this.isConnected = false;
                    this.stopHeartbeat();
                    
                    this.emit('disconnected', { 
                        code: event.code, 
                        reason: event.reason 
                    });
                    
                    // Attempt reconnection
                    this.scheduleReconnect();
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Handle incoming WebSocket message
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'contract_updated':
                    this.handleContractUpdate(data);
                    break;
                    
                case 'contract_created':
                    this.handleContractCreated(data);
                    break;
                    
                case 'contract_deleted':
                    this.handleContractDeleted(data);
                    break;
                    
                case 'notification':
                    this.handleNotification(data);
                    break;
                    
                case 'approval_request':
                    this.handleApprovalRequest(data);
                    break;
                    
                case 'subscribed':
                    console.log('Subscribed to contracts:', data.contracts);
                    break;
                    
                case 'pong':
                    // Heartbeat response
                    break;
                    
                case 'error':
                    console.error('WebSocket server error:', data.message);
                    this.emit('server_error', data);
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
            
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }
    
    /**
     * Handle contract update event
     */
    handleContractUpdate(data) {
        const { contract_id, changes, updated_by } = data;
        
        // Emit event for listeners
        this.emit('contract_updated', {
            contractId: contract_id,
            changes,
            updatedBy: updated_by,
            timestamp: data.timestamp || Date.now()
        });
        
        // Update local state if state manager is available
        if (typeof window.getState === 'function') {
            const state = window.getState();
            if (state.contracts?.records) {
                const updatedRecords = state.contracts.records.map(c => {
                    if (c.id === contract_id) {
                        return { ...c, ...changes };
                    }
                    return c;
                });
                
                window.setState({
                    contracts: { 
                        ...state.contracts, 
                        records: updatedRecords 
                    }
                });
            }
        }
    }
    
    /**
     * Handle contract created event
     */
    handleContractCreated(data) {
        this.emit('contract_created', {
            contract: data.contract,
            createdBy: data.created_by,
            timestamp: data.timestamp || Date.now()
        });
    }
    
    /**
     * Handle contract deleted event
     */
    handleContractDeleted(data) {
        this.emit('contract_deleted', {
            contractId: data.contract_id,
            deletedBy: data.deleted_by,
            timestamp: data.timestamp || Date.now()
        });
    }
    
    /**
     * Handle notification event
     */
    handleNotification(data) {
        this.emit('notification', {
            id: data.id,
            type: data.notification_type,
            title: data.title,
            message: data.message,
            resourceType: data.resource_type,
            resourceId: data.resource_id,
            timestamp: data.timestamp || Date.now()
        });
        
        // Show browser notification if permitted
        this.showBrowserNotification(data.title, data.message);
    }
    
    /**
     * Handle approval request event
     */
    handleApprovalRequest(data) {
        this.emit('approval_request', {
            contractId: data.contract_id,
            auftrag: data.auftrag,
            requestedBy: data.requested_by,
            timestamp: data.timestamp || Date.now()
        });
        
        // Show browser notification
        this.showBrowserNotification(
            'Approval Required',
            `Contract ${data.auftrag} requires your approval`
        );
    }
    
    /**
     * Subscribe to contract updates
     * @param {Array<string>} contractIds - Contract IDs to subscribe to
     */
    subscribe(contractIds) {
        if (!Array.isArray(contractIds)) {
            contractIds = [contractIds];
        }
        
        // Add to subscription set
        contractIds.forEach(id => this.subscriptions.add(id));
        
        // Send subscribe message
        this.send({
            type: 'subscribe',
            user_id: this.userId,
            contract_ids: contractIds
        });
    }
    
    /**
     * Unsubscribe from contract updates
     * @param {Array<string>} contractIds - Contract IDs to unsubscribe from
     */
    unsubscribe(contractIds) {
        if (!Array.isArray(contractIds)) {
            contractIds = [contractIds];
        }
        
        // Remove from subscription set
        contractIds.forEach(id => this.subscriptions.delete(id));
        
        // Send unsubscribe message
        this.send({
            type: 'unsubscribe',
            user_id: this.userId,
            contract_ids: contractIds
        });
    }
    
    /**
     * Resubscribe to all previous subscriptions after reconnect
     */
    resubscribe() {
        if (this.subscriptions.size > 0) {
            this.send({
                type: 'subscribe',
                user_id: this.userId,
                contract_ids: Array.from(this.subscriptions)
            });
        }
    }
    
    /**
     * Send message to WebSocket server
     * @param {Object} data - Message data
     */
    send(data) {
        const message = JSON.stringify(data);
        
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            // Queue for later
            this.pendingMessages.push(message);
        }
    }
    
    /**
     * Flush pending messages after reconnect
     */
    flushPendingMessages() {
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            this.ws.send(message);
        }
    }
    
    /**
     * Add event listener
     * @param {string} eventType - Event type
     * @param {Function} callback - Event handler
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} eventType - Event type
     * @param {Function} callback - Event handler to remove
     */
    off(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to listeners
     */
    emit(eventType, data) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventType} listener:`, error);
                }
            });
        }
    }
    
    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, this.heartbeatInterval);
    }
    
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('max_reconnect_reached', { attempts: this.reconnectAttempts });
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, delay);
    }
    
    /**
     * Show browser notification if permitted
     */
    showBrowserNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/assets/icon.png' });
        }
    }
    
    /**
     * Request notification permission
     */
    static requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    /**
     * Set user ID for subscriptions
     * @param {number|string} userId - User ID
     */
    setUserId(userId) {
        this.userId = userId;
    }
    
    /**
     * Get connection status
     * @returns {boolean}
     */
    isConnectedStatus() {
        return this.isConnected;
    }
    
    /**
     * Close WebSocket connection
     */
    close() {
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close(1000, 'Client closing');
            this.ws = null;
        }
        
        this.isConnected = false;
        this.subscriptions.clear();
    }
    
    /**
     * Disconnect and clean up
     */
    destroy() {
        this.close();
        this.listeners.clear();
        this.pendingMessages = [];
    }
}

// Singleton instance
let wsInstance = null;

/**
 * Get or create WebSocket instance
 * @param {Object} options - Configuration options
 * @returns {ContractWebSocket}
 */
export function getWebSocket(options = {}) {
    if (!wsInstance) {
        wsInstance = new ContractWebSocket(options);
    }
    return wsInstance;
}

export default ContractWebSocket;
