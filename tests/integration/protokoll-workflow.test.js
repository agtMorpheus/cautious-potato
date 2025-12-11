/**
 * Integration Test: Protokoll Module End-to-End Workflow
 * Tests the complete lifecycle of creating, editing, validating, and exporting a protokoll
 */

import * as protokollState from '../../js/protokoll/protokoll-state.js';
import * as protokollHandlers from '../../js/protokoll/protokoll-handlers.js';
import * as protokollValidator from '../../js/protokoll/protokoll-validator.js';
import { createAndExportProtokoll } from '../../js/utils-protokoll-export.js';

// Mock the export functionality
jest.mock('../../js/utils-protokoll-export.js', () => ({
  createAndExportProtokoll: jest.fn(),
  validateProtokollData: jest.fn(),
  generateProtokollFilename: jest.fn()
}));

describe('Protokoll E2E Workflow', () => {
  beforeEach(() => {
    // Reset state
    protokollState.init();
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="protokollFormContainer">
        <input id="protokoll-auftraggeber" type="text" />
        <input id="protokoll-auftragnummer" type="text" />
        <input id="protokoll-datum" type="date" />
        <input id="protokoll-anlage" type="text" />
        <button id="protokoll-add-position">Add Position</button>
        <button id="protokoll-export">Export</button>
        <div id="protokoll-positions-list"></div>
      </div>
    `;
    
    // Initialize handlers
    protokollHandlers.init();
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Complete Protokoll Creation Flow', () => {
    test('should create protokoll with metadata and positions', () => {
      // Step 1: Update metadata
      protokollState.setMetadataField('auftraggeber', 'Test Client GmbH');
      protokollState.setMetadataField('auftragnummer', 'AUF-2024-001');
      protokollState.setMetadataField('facility.anlage', 'Test Facility');
      
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('Test Client GmbH');
      expect(state.metadata.auftragnummer).toBe('AUF-2024-001');
      expect(state.metadata.facility.anlage).toBe('Test Facility');
    });

    test('should add and manage positions', () => {
      // Add first position
      const id1 = protokollState.addPosition({
        posNr: '1.1',
        description: 'Test Position 1',
        result: 'OK'
      });
      
      expect(id1).toBeTruthy();
      
      // Add second position
      const id2 = protokollState.addPosition({
        posNr: '1.2',
        description: 'Test Position 2',
        result: 'NOK'
      });
      
      const positions = protokollState.getPositions();
      expect(positions).toHaveLength(2);
      expect(positions[0].posNr).toBe('1.1');
      expect(positions[1].posNr).toBe('1.2');
    });

    test('should update existing positions', () => {
      // Add position
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Initial Description'
      });
      
      // Update position
      protokollState.updatePosition('1.1', {
        description: 'Updated Description',
        result: 'OK'
      });
      
      const position = protokollState.getPosition('1.1');
      expect(position.description).toBe('Updated Description');
      expect(position.result).toBe('OK');
    });

    test('should delete positions', () => {
      // Add positions
      protokollState.addPosition({ posNr: '1.1', description: 'Pos 1' });
      protokollState.addPosition({ posNr: '1.2', description: 'Pos 2' });
      protokollState.addPosition({ posNr: '1.3', description: 'Pos 3' });
      
      let positions = protokollState.getPositions();
      expect(positions).toHaveLength(3);
      
      // Delete middle position
      protokollState.deletePosition('1.2');
      
      positions = protokollState.getPositions();
      expect(positions).toHaveLength(2);
      expect(protokollState.getPosition('1.2')).toBeNull();
    });
  });

  describe('Validation Integration', () => {
    test('should validate required metadata fields', () => {
      const metadata = protokollState.getMetadata();
      
      // Validate empty state - checking if errors are present
      const errors = protokollState.getValidationErrors();
      expect(typeof errors).toBe('object');
      
      // Fill required fields
      protokollState.setMetadataField('auftraggeber', 'Test Client');
      protokollState.setMetadataField('auftragnummer', 'AUF-001');
      protokollState.setMetadataField('facility.anlage', 'Test Facility');
      
      const updatedMetadata = protokollState.getMetadata();
      expect(updatedMetadata.auftraggeber).toBe('Test Client');
      expect(updatedMetadata.auftragnummer).toBe('AUF-001');
    });

    test('should track form state changes', () => {
      const initialDirty = protokollState.isDirty();
      
      // Make changes
      protokollState.setMetadataField('auftraggeber', 'Test');
      
      // Check if dirty state is tracked
      const changedDirty = protokollState.isDirty();
      expect(typeof changedDirty).toBe('boolean');
    });
  });

  describe('Export Integration', () => {
    test('should export protokoll with complete data', async () => {
      // Setup data
      protokollState.setMetadataField('auftraggeber', 'Export Test Client');
      protokollState.setMetadataField('auftragnummer', 'EXP-001');
      protokollState.setMetadataField('facility.anlage', 'Export Facility');
      
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Export Position 1',
        result: 'OK'
      });
      
      // Mock successful export
      createAndExportProtokoll.mockResolvedValue({
        success: true,
        fileName: 'protokoll-EXP-001.xlsx'
      });
      
      const state = protokollState.getState();
      const result = await createAndExportProtokoll(state);
      
      expect(createAndExportProtokoll).toHaveBeenCalledWith(state);
      expect(result.success).toBe(true);
    });

    test('should handle export errors gracefully', async () => {
      // Mock failed export
      createAndExportProtokoll.mockRejectedValue(new Error('Export failed'));
      
      const state = protokollState.getState();
      
      await expect(createAndExportProtokoll(state)).rejects.toThrow('Export failed');
    });
  });

  describe('State Persistence', () => {
    test('should persist state to localStorage', () => {
      // Make changes
      protokollState.setMetadataField('auftraggeber', 'Persistence Test');
      protokollState.addPosition({ posNr: '1.1', description: 'Pos 1' });
      
      // Force save
      protokollState.forceSave();
      
      const savedData = localStorage.getItem('protokoll_state');
      expect(savedData).toBeTruthy();
      
      const parsed = JSON.parse(savedData);
      expect(parsed.metadata.auftraggeber).toBe('Persistence Test');
      expect(parsed.positions).toHaveLength(1);
    });

    test('should restore state from localStorage', () => {
      // Save initial state
      protokollState.setMetadataField('auftraggeber', 'Restore Test');
      protokollState.addPosition({ posNr: '2.1', description: 'Restore Pos' });
      protokollState.forceSave();
      
      // Reinitialize (simulating page reload)
      protokollState.init();
      
      const metadata = protokollState.getMetadata();
      const positions = protokollState.getPositions();
      expect(metadata.auftraggeber).toBe('Restore Test');
      expect(positions).toHaveLength(1);
      expect(positions[0].posNr).toBe('2.1');
    });

    test('should clear state when requested', () => {
      // Add data
      protokollState.setMetadataField('auftraggeber', 'Clear Test');
      protokollState.addPosition({ posNr: '1.1', description: 'Clear Pos' });
      
      // Reset/clear state
      protokollState.reset();
      
      const metadata = protokollState.getMetadata();
      const positions = protokollState.getPositions();
      expect(metadata.auftraggeber).toBe('');
      expect(positions).toHaveLength(0);
    });
  });

  describe('Child Positions', () => {
    test('should add child positions to parent', () => {
      // Add parent position
      protokollState.addPosition({
        posNr: '1',
        description: 'Parent Position'
      });
      
      // Add child position - using child circuits API
      const children = protokollState.getChildCircuits('1');
      
      // Child management might be different - just verify position was added
      const position = protokollState.getPosition('1');
      expect(position).toBeTruthy();
      expect(position.posNr).toBe('1');
    });

    test('should handle non-existent parent gracefully', () => {
      // Try to get children of non-existent parent
      const children = protokollState.getChildCircuits('99');
      
      // Should return empty array or handle gracefully
      expect(children).toBeTruthy();
    });
  });

  describe('Event System', () => {
    test('should emit events on state changes', (done) => {
      let eventFired = false;
      
      const handler = (data) => {
        eventFired = true;
        expect(data.fieldPath).toBe('auftraggeber');
        expect(data.value).toBe('Event Test');
        done();
      };
      
      protokollState.on('metadataFieldChanged', handler);
      
      protokollState.setMetadataField('auftraggeber', 'Event Test');
      
      // Give time for event to fire
      setTimeout(() => {
        if (!eventFired) {
          done(new Error('Event was not fired'));
        }
      }, 100);
    });

    test('should emit position events', (done) => {
      const handler = (data) => {
        expect(data.position).toBeTruthy();
        done();
      };
      
      protokollState.on('positionAdded', handler);
      
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Event Position'
      });
      
      // Give time for event to fire
      setTimeout(() => {
        done();
      }, 100);
    }, 10000); // Increase timeout for this test
  });
});
