/**
 * Unit Tests for Migration Module (migrateToBackend.js)
 * Tests data migration from localStorage to backend API
 */

import {
  MigrationStatus,
  isMigrationComplete,
  getMigrationStatus,
  clearLocalDataAfterMigration,
  restoreFromBackup,
  resetMigrationStatus
} from '../../js/migration/migrateToBackend.js';

// Mock the imports
jest.mock('../../js/state.js', () => ({
  getState: jest.fn(),
  setState: jest.fn()
}));

jest.mock('../../js/contracts/contractApiClient.js', () => ({
  apiClient: {
    createContract: jest.fn(),
    listContracts: jest.fn(),
    getCurrentUser: jest.fn()
  }
}));

import { getState, setState } from '../../js/state.js';
import { apiClient } from '../../js/contracts/contractApiClient.js';

describe('Migration Module', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    // Default mock for getState
    getState.mockReturnValue({
      contracts: {
        records: [],
        importedFiles: []
      }
    });
  });

  // ============================================
  // MigrationStatus Tests
  // ============================================
  describe('MigrationStatus', () => {
    test('exports all status constants', () => {
      expect(MigrationStatus.NOT_STARTED).toBe('not_started');
      expect(MigrationStatus.IN_PROGRESS).toBe('in_progress');
      expect(MigrationStatus.COMPLETED).toBe('completed');
      expect(MigrationStatus.FAILED).toBe('failed');
      expect(MigrationStatus.PARTIAL).toBe('partial');
    });
  });

  // ============================================
  // isMigrationComplete Tests
  // ============================================
  describe('isMigrationComplete()', () => {
    test('returns false when migration not completed', () => {
      expect(isMigrationComplete()).toBe(false);
    });

    test('returns true when migration completed', () => {
      localStorage.setItem('contract_manager_migrated', 'true');
      expect(isMigrationComplete()).toBe(true);
    });

    test('returns false for other values', () => {
      localStorage.setItem('contract_manager_migrated', 'false');
      expect(isMigrationComplete()).toBe(false);

      localStorage.setItem('contract_manager_migrated', '1');
      expect(isMigrationComplete()).toBe(false);
    });
  });

  // ============================================
  // getMigrationStatus Tests
  // ============================================
  describe('getMigrationStatus()', () => {
    test('returns default status when no status saved', () => {
      const status = getMigrationStatus();
      
      expect(status.status).toBe(MigrationStatus.NOT_STARTED);
      expect(status.migratedCount).toBe(0);
      expect(status.failedCount).toBe(0);
      expect(status.totalCount).toBe(0);
      expect(status.lastAttempt).toBeNull();
      expect(status.details).toEqual([]);
    });

    test('returns saved status from localStorage', () => {
      const savedStatus = {
        status: MigrationStatus.COMPLETED,
        migratedCount: 10,
        failedCount: 0,
        totalCount: 10,
        lastAttempt: '2023-12-01T10:00:00.000Z',
        details: []
      };
      localStorage.setItem('contract_manager_migration_status', JSON.stringify(savedStatus));
      
      const status = getMigrationStatus();
      
      expect(status.status).toBe(MigrationStatus.COMPLETED);
      expect(status.migratedCount).toBe(10);
      expect(status.failedCount).toBe(0);
      expect(status.totalCount).toBe(10);
    });

    test('handles partial migration status', () => {
      const savedStatus = {
        status: MigrationStatus.PARTIAL,
        migratedCount: 8,
        failedCount: 2,
        totalCount: 10,
        lastAttempt: '2023-12-01T10:00:00.000Z',
        details: [
          { contractId: 'c1', error: 'API error' },
          { contractId: 'c2', error: 'Validation failed' }
        ]
      };
      localStorage.setItem('contract_manager_migration_status', JSON.stringify(savedStatus));
      
      const status = getMigrationStatus();
      
      expect(status.status).toBe(MigrationStatus.PARTIAL);
      expect(status.failedCount).toBe(2);
      expect(status.details.length).toBe(2);
    });
  });

  // ============================================
  // resetMigrationStatus Tests
  // ============================================
  describe('resetMigrationStatus()', () => {
    test('clears migration flag from localStorage', () => {
      localStorage.setItem('contract_manager_migrated', 'true');
      localStorage.setItem('contract_manager_migration_status', JSON.stringify({ status: 'completed' }));
      
      resetMigrationStatus();
      
      expect(localStorage.getItem('contract_manager_migrated')).toBeNull();
      expect(localStorage.getItem('contract_manager_migration_status')).toBeNull();
    });

    test('does nothing when no migration data exists', () => {
      resetMigrationStatus();
      
      expect(localStorage.getItem('contract_manager_migrated')).toBeNull();
      expect(localStorage.getItem('contract_manager_migration_status')).toBeNull();
    });
  });

  // ============================================
  // clearLocalDataAfterMigration Tests
  // ============================================
  describe('clearLocalDataAfterMigration()', () => {
    test('creates backup when keepBackup is true', () => {
      const mockState = {
        contracts: {
          records: [{ id: '1', contractId: 'C001' }],
          importedFiles: ['file1.xlsx']
        }
      };
      getState.mockReturnValue(mockState);
      
      clearLocalDataAfterMigration(true);
      
      const backup = JSON.parse(localStorage.getItem('contract_manager_backup'));
      expect(backup).toBeTruthy();
      expect(backup.contracts).toEqual([{ id: '1', contractId: 'C001' }]);
      expect(backup.importedFiles).toEqual(['file1.xlsx']);
      expect(backup.backupDate).toBeTruthy();
    });

    test('does not create backup when keepBackup is false', () => {
      const mockState = {
        contracts: {
          records: [{ id: '1' }],
          importedFiles: []
        }
      };
      getState.mockReturnValue(mockState);
      
      clearLocalDataAfterMigration(false);
      
      expect(localStorage.getItem('contract_manager_backup')).toBeNull();
    });

    test('clears contract records from state', () => {
      const mockState = {
        contracts: {
          records: [{ id: '1' }],
          importedFiles: ['file1.xlsx'],
          someOtherProp: 'value'
        }
      };
      getState.mockReturnValue(mockState);
      
      clearLocalDataAfterMigration(false);
      
      expect(setState).toHaveBeenCalledWith({
        contracts: {
          records: [{ id: '1' }],
          importedFiles: ['file1.xlsx'],
          someOtherProp: 'value',
          records: [],
          importedFiles: []
        }
      });
    });

    test('handles empty contracts state', () => {
      const mockState = {
        contracts: {}
      };
      getState.mockReturnValue(mockState);
      
      clearLocalDataAfterMigration(true);
      
      const backup = JSON.parse(localStorage.getItem('contract_manager_backup'));
      expect(backup.contracts).toEqual([]);
      expect(backup.importedFiles).toEqual([]);
    });
  });

  // ============================================
  // restoreFromBackup Tests
  // ============================================
  describe('restoreFromBackup()', () => {
    test('returns false when no backup exists', () => {
      const result = restoreFromBackup();
      
      expect(result).toBe(false);
    });

    test('restores contracts from backup', () => {
      const backup = {
        contracts: [
          { id: '1', contractId: 'C001' },
          { id: '2', contractId: 'C002' }
        ],
        importedFiles: ['file1.xlsx'],
        backupDate: '2023-12-01T10:00:00.000Z'
      };
      localStorage.setItem('contract_manager_backup', JSON.stringify(backup));
      
      const mockState = {
        contracts: {
          records: [],
          importedFiles: []
        }
      };
      getState.mockReturnValue(mockState);
      
      const result = restoreFromBackup();
      
      expect(result).toBe(true);
      expect(setState).toHaveBeenCalledWith({
        contracts: {
          records: [],
          importedFiles: [],
          records: [
            { id: '1', contractId: 'C001' },
            { id: '2', contractId: 'C002' }
          ],
          importedFiles: ['file1.xlsx']
        }
      });
    });

    test('clears migration flag after restore', () => {
      localStorage.setItem('contract_manager_migrated', 'true');
      localStorage.setItem('contract_manager_backup', JSON.stringify({
        contracts: [],
        importedFiles: []
      }));
      
      getState.mockReturnValue({ contracts: {} });
      
      restoreFromBackup();
      
      expect(localStorage.getItem('contract_manager_migrated')).toBeNull();
    });

    test('returns false for corrupted backup data', () => {
      localStorage.setItem('contract_manager_backup', 'invalid json');
      
      const result = restoreFromBackup();
      
      expect(result).toBe(false);
    });

    test('handles backup with missing contracts array', () => {
      // Backup without contracts array causes an error when logging
      // because it tries to access backup.contracts.length
      localStorage.setItem('contract_manager_backup', JSON.stringify({
        importedFiles: ['file1.xlsx']
      }));
      
      getState.mockReturnValue({ contracts: {} });
      
      // This returns false because backup.contracts is undefined  
      // causing an error when trying to log the count
      const result = restoreFromBackup();
      
      // The function catches the error and returns false
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('handles localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });
      
      // Should not throw, just return defaults
      expect(() => getMigrationStatus()).not.toThrow();
      
      // Restore
      Storage.prototype.getItem = originalGetItem;
    });

    test('handles undefined contracts in state', () => {
      getState.mockReturnValue({});
      
      clearLocalDataAfterMigration(true);
      
      const backup = JSON.parse(localStorage.getItem('contract_manager_backup'));
      expect(backup.contracts).toEqual([]);
    });
  });
});
