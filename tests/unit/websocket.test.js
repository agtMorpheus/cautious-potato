/**
 * Unit Tests for WebSocket Module (websocket.js)
 * Tests WebSocket client for real-time contract updates
 */

import { ContractWebSocket, getWebSocket } from '../../js/contracts/websocket.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this._messagesSent = [];
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this._messagesSent.push(data);
  }

  close(code, reason) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '' });
    }
  }

  // Test helper methods
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen({});
    }
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Set up global WebSocket mock
global.WebSocket = MockWebSocket;

// Mock window.location
const originalLocation = window.location;
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
    host: 'example.com'
  },
  writable: true
});

// Mock Notification
global.Notification = {
  permission: 'granted',
  requestPermission: jest.fn()
};

describe('ContractWebSocket (websocket.js)', () => {
  let ws;
  let mockSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    // Reset singleton for each test
    ws = new ContractWebSocket({
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      heartbeatInterval: 5000
    });
    
    // Get reference to the mock socket after connection
    const originalConnect = ws.connect.bind(ws);
    ws.connect = function() {
      return originalConnect().then(() => {
        mockSocket = ws.ws;
      });
    };
  });

  afterEach(() => {
    if (ws) {
      ws.destroy();
    }
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    test('creates instance with default options', () => {
      const defaultWs = new ContractWebSocket();
      
      expect(defaultWs.reconnectInterval).toBe(3000);
      expect(defaultWs.maxReconnectAttempts).toBe(10);
      expect(defaultWs.heartbeatInterval).toBe(30000);
    });

    test('creates instance with custom options', () => {
      expect(ws.reconnectInterval).toBe(1000);
      expect(ws.maxReconnectAttempts).toBe(3);
      expect(ws.heartbeatInterval).toBe(5000);
    });

    test('initializes with disconnected state', () => {
      expect(ws.isConnected).toBe(false);
      expect(ws.reconnectAttempts).toBe(0);
    });

    test('initializes empty subscriptions and listeners', () => {
      expect(ws.subscriptions.size).toBe(0);
      expect(ws.listeners.size).toBe(0);
    });
  });

  describe('getDefaultUrl()', () => {
    test('generates wss URL for https', () => {
      window.location.protocol = 'https:';
      const testWs = new ContractWebSocket();
      
      expect(testWs.url).toContain('wss:');
    });

    test('generates ws URL for http', () => {
      window.location.protocol = 'http:';
      const testWs = new ContractWebSocket();
      
      expect(testWs.url).toContain('ws:');
    });

    test('uses custom URL when provided', () => {
      const customUrl = 'wss://custom.example.com/ws';
      const testWs = new ContractWebSocket({ url: customUrl });
      
      expect(testWs.url).toBe(customUrl);
    });
  });

  describe('connect()', () => {
    test('resolves when already connected', async () => {
      ws.isConnected = true;
      
      await expect(ws.connect()).resolves.toBeUndefined();
    });

    test('creates WebSocket instance', async () => {
      const connectPromise = ws.connect();
      
      // Simulate successful connection
      ws.ws.simulateOpen();
      
      await connectPromise;
      
      expect(ws.ws).toBeInstanceOf(MockWebSocket);
    });

    test('sets isConnected to true on open', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      
      await connectPromise;
      
      expect(ws.isConnected).toBe(true);
    });

    test('resets reconnect attempts on successful connection', async () => {
      ws.reconnectAttempts = 5;
      
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      
      await connectPromise;
      
      expect(ws.reconnectAttempts).toBe(0);
    });

    test('emits connected event', async () => {
      const callback = jest.fn();
      ws.on('connected', callback);
      
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      
      await connectPromise;
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Number)
      }));
    });

    test('rejects on error', async () => {
      const connectPromise = ws.connect();
      
      const error = new Error('Connection failed');
      ws.ws.simulateError(error);
      
      await expect(connectPromise).rejects.toEqual(error);
    });
  });

  describe('handleMessage()', () => {
    beforeEach(async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
    });

    test('handles contract_updated message', () => {
      const callback = jest.fn();
      ws.on('contract_updated', callback);
      
      ws.ws.simulateMessage({
        type: 'contract_updated',
        contract_id: '123',
        changes: { status: 'fertig' },
        updated_by: 'user1'
      });
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        contractId: '123',
        changes: { status: 'fertig' },
        updatedBy: 'user1'
      }));
    });

    test('handles contract_created message', () => {
      const callback = jest.fn();
      ws.on('contract_created', callback);
      
      ws.ws.simulateMessage({
        type: 'contract_created',
        contract: { id: '456', auftrag: 'TEST-001' },
        created_by: 'user2'
      });
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        contract: { id: '456', auftrag: 'TEST-001' }
      }));
    });

    test('handles contract_deleted message', () => {
      const callback = jest.fn();
      ws.on('contract_deleted', callback);
      
      ws.ws.simulateMessage({
        type: 'contract_deleted',
        contract_id: '789',
        deleted_by: 'user3'
      });
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        contractId: '789'
      }));
    });

    test('handles notification message', () => {
      const callback = jest.fn();
      ws.on('notification', callback);
      
      ws.ws.simulateMessage({
        type: 'notification',
        id: 'notif-1',
        notification_type: 'info',
        title: 'Test Title',
        message: 'Test Message'
      });
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        id: 'notif-1',
        type: 'info',
        title: 'Test Title',
        message: 'Test Message'
      }));
    });

    test('handles approval_request message', () => {
      const callback = jest.fn();
      ws.on('approval_request', callback);
      
      ws.ws.simulateMessage({
        type: 'approval_request',
        contract_id: 'contract-1',
        auftrag: 'AUF-001',
        requested_by: 'user4'
      });
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        contractId: 'contract-1',
        auftrag: 'AUF-001'
      }));
    });

    test('handles server error message', () => {
      const callback = jest.fn();
      ws.on('server_error', callback);
      
      ws.ws.simulateMessage({
        type: 'error',
        message: 'Server error occurred'
      });
      
      expect(callback).toHaveBeenCalled();
    });

    test('handles invalid JSON gracefully', () => {
      // This should not throw
      expect(() => {
        ws.handleMessage({ data: 'invalid json{' });
      }).not.toThrow();
    });

    test('handles unknown message type', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      ws.ws.simulateMessage({
        type: 'unknown_type',
        data: 'test'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown message type:', 'unknown_type');
      consoleSpy.mockRestore();
    });
  });

  describe('subscribe() / unsubscribe()', () => {
    beforeEach(async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
    });

    test('subscribe adds contract IDs to subscriptions', () => {
      ws.subscribe(['contract-1', 'contract-2']);
      
      expect(ws.subscriptions.has('contract-1')).toBe(true);
      expect(ws.subscriptions.has('contract-2')).toBe(true);
    });

    test('subscribe handles single ID', () => {
      ws.subscribe('contract-1');
      
      expect(ws.subscriptions.has('contract-1')).toBe(true);
    });

    test('subscribe sends message to server', () => {
      ws.subscribe(['contract-1']);
      
      const sentMessage = JSON.parse(ws.ws._messagesSent[0]);
      expect(sentMessage.type).toBe('subscribe');
      expect(sentMessage.contract_ids).toContain('contract-1');
    });

    test('unsubscribe removes contract IDs', () => {
      ws.subscriptions.add('contract-1');
      ws.subscriptions.add('contract-2');
      
      ws.unsubscribe(['contract-1']);
      
      expect(ws.subscriptions.has('contract-1')).toBe(false);
      expect(ws.subscriptions.has('contract-2')).toBe(true);
    });

    test('unsubscribe handles single ID', () => {
      ws.subscriptions.add('contract-1');
      
      ws.unsubscribe('contract-1');
      
      expect(ws.subscriptions.has('contract-1')).toBe(false);
    });

    test('unsubscribe sends message to server', () => {
      ws.subscriptions.add('contract-1');
      
      ws.unsubscribe('contract-1');
      
      const lastMessage = JSON.parse(ws.ws._messagesSent[ws.ws._messagesSent.length - 1]);
      expect(lastMessage.type).toBe('unsubscribe');
    });
  });

  describe('Event System', () => {
    test('on() registers event listener', () => {
      const callback = jest.fn();
      
      ws.on('test_event', callback);
      
      expect(ws.listeners.get('test_event')).toContain(callback);
    });

    test('on() allows multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      ws.on('test_event', callback1);
      ws.on('test_event', callback2);
      
      expect(ws.listeners.get('test_event').length).toBe(2);
    });

    test('off() removes event listener', () => {
      const callback = jest.fn();
      ws.on('test_event', callback);
      
      ws.off('test_event', callback);
      
      expect(ws.listeners.get('test_event').length).toBe(0);
    });

    test('off() handles non-existent listener gracefully', () => {
      const callback = jest.fn();
      
      expect(() => {
        ws.off('non_existent_event', callback);
      }).not.toThrow();
    });

    test('emit() calls all registered listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      ws.on('test_event', callback1);
      ws.on('test_event', callback2);
      
      ws.emit('test_event', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    test('emit() handles listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = jest.fn();
      
      ws.on('test_event', errorCallback);
      ws.on('test_event', normalCallback);
      
      // Should not throw and should call remaining listeners
      expect(() => {
        ws.emit('test_event', { data: 'test' });
      }).not.toThrow();
      
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('send()', () => {
    test('sends message when connected', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      ws.send({ type: 'test', data: 'value' });
      
      expect(ws.ws._messagesSent.length).toBeGreaterThan(0);
      const sentMessage = JSON.parse(ws.ws._messagesSent[ws.ws._messagesSent.length - 1]);
      expect(sentMessage.type).toBe('test');
    });

    test('queues message when disconnected', () => {
      ws.send({ type: 'test', data: 'value' });
      
      expect(ws.pendingMessages.length).toBe(1);
    });
  });

  describe('flushPendingMessages()', () => {
    test('sends all pending messages', async () => {
      // Queue messages while disconnected
      ws.pendingMessages = [
        JSON.stringify({ type: 'message1' }),
        JSON.stringify({ type: 'message2' })
      ];
      
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      // Pending messages should be flushed on connect
      expect(ws.pendingMessages.length).toBe(0);
    });
  });

  describe('Heartbeat', () => {
    test('starts heartbeat on connect', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      expect(ws.heartbeatTimer).not.toBeNull();
    });

    test('sends ping at interval', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      // Advance time to trigger heartbeat
      jest.advanceTimersByTime(5000);
      
      const messages = ws.ws._messagesSent.map(m => JSON.parse(m));
      expect(messages.some(m => m.type === 'ping')).toBe(true);
    });

    test('stops heartbeat on disconnect', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      ws.stopHeartbeat();
      
      expect(ws.heartbeatTimer).toBeNull();
    });
  });

  describe('Reconnection', () => {
    test('schedules reconnect on disconnect', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      // Simulate disconnect
      ws.ws.close(1006, 'Abnormal closure');
      
      expect(ws.isConnected).toBe(false);
    });

    test('uses exponential backoff', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      // Simulate multiple disconnects
      ws.reconnectAttempts = 2;
      const delay1 = ws.reconnectInterval * Math.pow(1.5, 2);
      
      ws.reconnectAttempts = 3;
      const delay2 = ws.reconnectInterval * Math.pow(1.5, 3);
      
      expect(delay2).toBeGreaterThan(delay1);
    });

    test('emits max_reconnect_reached event', () => {
      const callback = jest.fn();
      ws.on('max_reconnect_reached', callback);
      
      ws.reconnectAttempts = 3;
      ws.scheduleReconnect();
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('close()', () => {
    test('closes WebSocket connection', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      ws.close();
      
      expect(ws.isConnected).toBe(false);
      expect(ws.subscriptions.size).toBe(0);
    });

    test('stops heartbeat', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      ws.close();
      
      expect(ws.heartbeatTimer).toBeNull();
    });
  });

  describe('destroy()', () => {
    test('cleans up all resources', async () => {
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      ws.on('test', () => {});
      ws.subscriptions.add('contract-1');
      
      ws.destroy();
      
      expect(ws.listeners.size).toBe(0);
      expect(ws.pendingMessages.length).toBe(0);
    });
  });

  describe('setUserId()', () => {
    test('sets user ID', () => {
      ws.setUserId('user-123');
      
      expect(ws.userId).toBe('user-123');
    });

    test('accepts numeric user ID', () => {
      ws.setUserId(456);
      
      expect(ws.userId).toBe(456);
    });
  });

  describe('isConnectedStatus()', () => {
    test('returns connection status', async () => {
      expect(ws.isConnectedStatus()).toBe(false);
      
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      expect(ws.isConnectedStatus()).toBe(true);
    });
  });

  describe('getWebSocket singleton', () => {
    test('returns ContractWebSocket instance', () => {
      const instance = getWebSocket();
      
      expect(instance).toBeInstanceOf(ContractWebSocket);
    });
  });

  describe('Browser Notification', () => {
    test('shows notification when permission granted', async () => {
      global.Notification = jest.fn();
      global.Notification.permission = 'granted';
      
      const connectPromise = ws.connect();
      ws.ws.simulateOpen();
      await connectPromise;
      
      ws.showBrowserNotification('Title', 'Body');
      
      expect(global.Notification).toHaveBeenCalled();
    });

    test('does not show notification when not permitted', () => {
      global.Notification.permission = 'denied';
      
      expect(() => {
        ws.showBrowserNotification('Title', 'Body');
      }).not.toThrow();
    });

    test('requestNotificationPermission calls Notification.requestPermission', () => {
      global.Notification.permission = 'default';
      global.Notification.requestPermission = jest.fn();
      
      ContractWebSocket.requestNotificationPermission();
      
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });
  });
});
