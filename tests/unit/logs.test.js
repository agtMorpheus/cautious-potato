/**
 * Logs Module Tests
 */

import { jest } from '@jest/globals';

// Setup DOM before importing module
document.body.innerHTML = `
  <div id="log-clear-btn"></div>
  <div id="log-export-btn"></div>
  <input id="log-search-input" />
  <select id="log-level-filter"></select>
  <div id="log-clear-filters"></div>
  <tbody id="log-table-body"></tbody>
`;

// Import module under test
import * as logsModule from '../../js/modules/logs/index.js';

describe('Logs Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    logsModule.clearLogs();
  });

  describe('addLog', () => {
    test('adds a log entry', () => {
      logsModule.addLog('Test message', 'info');
      const logs = logsModule.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].level).toBe('info');
      expect(logs[0].timestamp).toBeDefined();
    });

    test('logs to console', () => {
      logsModule.addLog('Test message', 'info');
      expect(console.log).toHaveBeenCalledWith('[INFO] Test message');
    });

    test('logs error to console.error', () => {
      logsModule.addLog('Error message', 'error');
      expect(console.error).toHaveBeenCalledWith('[ERROR] Error message');
    });

    test('logs warning to console.warn', () => {
      logsModule.addLog('Warning message', 'warn');
      expect(console.warn).toHaveBeenCalledWith('[WARN] Warning message');
    });
  });

  describe('getLogs', () => {
    test('returns all logs', () => {
      logsModule.addLog('Message 1', 'info');
      logsModule.addLog('Message 2', 'warn');
      
      const logs = logsModule.getLogs();
      expect(logs).toHaveLength(2);
    });

    test('returns logs in reverse order (newest first)', () => {
      logsModule.addLog('First', 'info');
      logsModule.addLog('Second', 'info');
      
      const logs = logsModule.getLogs();
      expect(logs[0].message).toBe('Second');
      expect(logs[1].message).toBe('First');
    });
  });

  describe('clearLogs', () => {
    test('clears all logs', () => {
      logsModule.addLog('Message 1', 'info');
      logsModule.addLog('Message 2', 'info');
      
      logsModule.clearLogs();
      
      const logs = logsModule.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('subscribeToLogs', () => {
    test('calls subscriber when logs change', () => {
      const callback = jest.fn();
      logsModule.subscribeToLogs(callback);
      
      logsModule.addLog('Test', 'info');
      
      expect(callback).toHaveBeenCalled();
    });

    test('unsubscribe removes subscriber', () => {
      const callback = jest.fn();
      const unsubscribe = logsModule.subscribeToLogs(callback);
      
      unsubscribe();
      logsModule.addLog('Test', 'info');
      
      // Should only be called once during subscribe
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('convenience methods', () => {
    test('logDebug adds debug log', () => {
      logsModule.logDebug('Debug message');
      const logs = logsModule.getLogs();
      
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toBe('Debug message');
    });

    test('logInfo adds info log', () => {
      logsModule.logInfo('Info message');
      const logs = logsModule.getLogs();
      
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Info message');
    });

    test('logWarn adds warn log', () => {
      logsModule.logWarn('Warn message');
      const logs = logsModule.getLogs();
      
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toBe('Warn message');
    });

    test('logError adds error log', () => {
      logsModule.logError('Error message');
      const logs = logsModule.getLogs();
      
      expect(logs[0].level).toBe('error');
      expect(logs[0].message).toBe('Error message');
    });

    test('logSuccess adds success log', () => {
      logsModule.logSuccess('Success message');
      const logs = logsModule.getLogs();
      
      expect(logs[0].level).toBe('success');
      expect(logs[0].message).toBe('Success message');
    });
  });

  describe('exports', () => {
    test('exports initLogsModule', () => {
      expect(logsModule.initLogsModule).toBeDefined();
      expect(typeof logsModule.initLogsModule).toBe('function');
    });

    test('exports default object', () => {
      expect(logsModule.default).toBeDefined();
      expect(logsModule.default.initLogsModule).toBeDefined();
      expect(logsModule.default.addLog).toBeDefined();
      expect(logsModule.default.getLogs).toBeDefined();
      expect(logsModule.default.clearLogs).toBeDefined();
      expect(logsModule.default.subscribeToLogs).toBeDefined();
    });
  });
});
