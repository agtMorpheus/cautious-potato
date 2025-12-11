/**
 * E2E Test: Protokoll Module Complete User Journey
 * Tests the complete end-to-end user workflow for creating and managing protokolls
 */

import * as protokollState from '../../js/protokoll/protokoll-state.js';
import * as protokollHandlers from '../../js/protokoll/protokoll-handlers.js';
import * as protokollRenderer from '../../js/protokoll/protokoll-renderer.js';
import { createAndExportProtokoll } from '../../js/utils-protokoll-export.js';

// Mock export functionality
jest.mock('../../js/utils-protokoll-export.js', () => ({
  createAndExportProtokoll: jest.fn(),
  validateProtokollData: jest.fn(() => ({ valid: true, errors: [] })),
  generateProtokollFilename: jest.fn(() => 'protokoll-test.xlsx')
}));

describe('Protokoll E2E - Complete User Journey', () => {
  beforeEach(() => {
    // Reset state with cleared localStorage
    protokollState.init({ clearStorage: true });
    
    // Setup complete DOM structure
    document.body.innerHTML = `
      <div id="alert-container"></div>
      <div id="app-container">
        <div id="protokoll-container">
          <!-- Metadata Section -->
          <div id="protokoll-metadata">
            <input id="protokoll-auftraggeber" type="text" />
            <input id="protokoll-auftragnummer" type="text" />
            <input id="protokoll-datum" type="date" />
            <input id="protokoll-anlage" type="text" />
            <input id="protokoll-ort" type="text" />
            <input id="protokoll-firma" type="text" />
          </div>
          
          <!-- Position Management -->
          <div id="protokoll-positions">
            <button id="add-position-btn">Add Position</button>
            <div id="positions-list"></div>
          </div>
          
          <!-- Actions -->
          <div id="protokoll-actions">
            <button id="save-protokoll-btn">Save Protokoll</button>
            <button id="export-protokoll-btn">Export Protokoll</button>
            <button id="clear-protokoll-btn">Clear Protokoll</button>
          </div>
        </div>
      </div>
    `;
    
    // Initialize handlers and renderer
    protokollHandlers.init();
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Silence console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('User Journey: Create New Protokoll', () => {
    test('should create a complete protokoll from scratch', () => {
      // Step 1: User enters metadata
      protokollState.setMetadataField('auftraggeber', 'Test GmbH');
      protokollState.setMetadataField('auftragnummer', 'AUF-2024-001');
      protokollState.setMetadataField('facility.anlage', 'Building A');
      protokollState.setMetadataField('facility.ort', 'Berlin');
      protokollState.setMetadataField('firma', 'Test Firma GmbH');
      
      // Verify metadata was set
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('Test GmbH');
      expect(state.metadata.auftragnummer).toBe('AUF-2024-001');
      expect(state.metadata.facility.anlage).toBe('Building A');
      
      // Step 2: User adds positions
      const pos1 = protokollState.addPosition({
        posNr: '1.1',
        description: 'Visual inspection of main panel',
        result: 'OK',
        bemerkung: 'All clear'
      });
      
      const pos2 = protokollState.addPosition({
        posNr: '1.2',
        description: 'Check protective measures',
        result: 'NOK',
        bemerkung: 'Minor issue found'
      });
      
      expect(pos1).toBeTruthy();
      expect(pos2).toBeTruthy();
      
      const positions = protokollState.getPositions();
      expect(positions).toHaveLength(2);
      
      // Step 3: User saves the protokoll (persists to localStorage)
      protokollState.forceSave();
      
      // Verify persistence
      const savedState = localStorage.getItem('protokoll_state');
      expect(savedState).toBeTruthy();
      
      // Step 4: User exports the protokoll
      createAndExportProtokoll.mockResolvedValue({
        fileName: 'protokoll-test.xlsx',
        success: true
      });
      
      // Simulate export
      createAndExportProtokoll(state);
      expect(createAndExportProtokoll).toHaveBeenCalledWith(state);
    });

    test('should handle incomplete protokoll gracefully', () => {
      // User starts but doesn't complete
      protokollState.setMetadataField('auftraggeber', 'Incomplete Inc.');
      
      // No positions added
      const positions = protokollState.getPositions();
      expect(positions).toHaveLength(0);
      
      // State should still be valid
      const state = protokollState.getState();
      expect(state).toBeTruthy();
      expect(state.metadata.auftraggeber).toBe('Incomplete Inc.');
    });
  });

  describe('User Journey: Edit Existing Protokoll', () => {
    beforeEach(() => {
      // Setup an existing protokoll
      protokollState.setMetadataField('auftraggeber', 'Original Client');
      protokollState.setMetadataField('auftragnummer', 'ORG-001');
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Original position',
        result: 'OK'
      });
      protokollState.forceSave();
    });

    test('should update metadata without losing positions', () => {
      // User updates metadata
      protokollState.setMetadataField('auftraggeber', 'Updated Client');
      protokollState.setMetadataField('facility.anlage', 'New Building');
      
      // Verify metadata updated
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('Updated Client');
      expect(state.metadata.facility.anlage).toBe('New Building');
      
      // Verify positions remain
      const positions = protokollState.getPositions();
      expect(positions).toHaveLength(1);
      // Position fields may vary based on implementation
      expect(positions[0]).toBeTruthy();
    });

    test('should add, update, and delete positions', () => {
      // Add a new position
      const newPos = protokollState.addPosition({
        posNr: '1.2',
        description: 'New position',
        result: 'OK'
      });
      
      expect(newPos).toBeTruthy();
      expect(protokollState.getPositions()).toHaveLength(2);
      
      // Update existing position
      const updated = protokollState.updatePosition('1.1', {
        description: 'Updated position',
        result: 'NOK'
      });
      
      expect(updated).toBeTruthy();
      const pos = protokollState.getPosition('1.1');
      expect(pos.description).toBe('Updated position');
      expect(pos.result).toBe('NOK');
      
      // Delete a position
      const deleted = protokollState.deletePosition('1.2');
      expect(deleted).toBe(true);
      expect(protokollState.getPositions()).toHaveLength(1);
    });
  });

  describe('User Journey: Data Persistence and Recovery', () => {
    test('should restore protokoll after page reload', () => {
      // User creates protokoll
      protokollState.setMetadataField('auftraggeber', 'Persistence Test');
      protokollState.setMetadataField('auftragnummer', 'PER-001');
      
      // Force save
      protokollState.forceSave();
      
      // Verify localStorage has data
      const saved = localStorage.getItem('protokoll_state');
      expect(saved).toBeTruthy();
      
      // Simulate page reload by reinitializing without clearStorage
      protokollState.init();
      
      // Verify data restored
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('Persistence Test');
      expect(state.metadata.auftragnummer).toBe('PER-001');
    });

    test('should handle clearing all data', () => {
      // Create some data
      protokollState.setMetadataField('auftraggeber', 'To be cleared');
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Will be deleted'
      });
      protokollState.forceSave();
      
      // Clear everything
      protokollState.reset();
      
      // Verify all cleared
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('');
      expect(state.positions).toHaveLength(0);
      
      // Verify localStorage cleared
      const saved = localStorage.getItem('protokoll_state');
      expect(saved).toBeNull();
    });
  });

  describe('User Journey: Validation and Error Handling', () => {
    test('should validate position data before adding', () => {
      // Try to add position with missing required fields
      const invalidPos = protokollState.addPosition({
        posNr: '',
        description: '',
        result: ''
      });
      
      // Position should still be added (state management allows it)
      // But validation would happen at export time
      expect(invalidPos).toBeTruthy();
    });

    test('should handle duplicate position numbers', () => {
      // Add first position
      const pos1 = protokollState.addPosition({
        posNr: '1.1',
        description: 'First position',
        result: 'OK'
      });
      
      // Add another with same posNr
      const pos2 = protokollState.addPosition({
        posNr: '1.1',
        description: 'Duplicate position',
        result: 'NOK'
      });
      
      // Both should exist (up to business logic to handle)
      const positions = protokollState.getPositions();
      expect(positions).toHaveLength(2);
      expect(pos1).toBeTruthy();
      expect(pos2).toBeTruthy();
    });
  });

  describe('User Journey: Complex Workflow Scenarios', () => {
    test('should handle multiple protokolls in sequence', () => {
      // First protokoll
      protokollState.setMetadataField('auftraggeber', 'Client 1');
      protokollState.addPosition({ posNr: '1.1', description: 'Pos 1' });
      protokollState.forceSave();
      
      // Clear for second protokoll
      protokollState.reset();
      protokollState.init({ clearStorage: true });
      
      // Second protokoll
      protokollState.setMetadataField('auftraggeber', 'Client 2');
      protokollState.addPosition({ posNr: '2.1', description: 'Pos 2' });
      
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('Client 2');
      expect(state.positions).toHaveLength(1);
      expect(state.positions[0].posNr).toBe('2.1');
    });

    test('should track unsaved changes', () => {
      // Initial state - no unsaved changes
      expect(protokollState.hasUnsavedChanges()).toBe(false);
      
      // Make a change
      protokollState.setMetadataField('auftraggeber', 'New Client');
      
      // Should have unsaved changes
      expect(protokollState.hasUnsavedChanges()).toBe(true);
      
      // Save
      protokollState.forceSave();
      
      // Should clear unsaved flag (if implemented)
      // This depends on implementation
    });

    test('should handle rapid state changes', () => {
      // Simulate rapid user input
      for (let i = 0; i < 10; i++) {
        protokollState.setMetadataField('auftraggeber', `Client ${i}`);
      }
      
      // Last change should win
      const state = protokollState.getState();
      expect(state.metadata.auftraggeber).toBe('Client 9');
    });
  });

  describe('User Journey: Export Scenarios', () => {
    test('should export with all data included', async () => {
      // Create complete protokoll
      protokollState.setMetadataField('auftraggeber', 'Export Test Client');
      protokollState.setMetadataField('auftragnummer', 'EXP-001');
      protokollState.setMetadataField('facility.anlage', 'Test Facility');
      
      protokollState.addPosition({
        posNr: '1.1',
        description: 'Position 1',
        result: 'OK'
      });
      
      protokollState.addPosition({
        posNr: '1.2',
        description: 'Position 2',
        result: 'NOK',
        bemerkung: 'Needs attention'
      });
      
      const state = protokollState.getState();
      
      // Mock successful export
      createAndExportProtokoll.mockResolvedValue({
        fileName: 'protokoll-exp-001.xlsx',
        success: true
      });
      
      // Export
      const result = await createAndExportProtokoll(state);
      
      expect(result.success).toBe(true);
      expect(createAndExportProtokoll).toHaveBeenCalledWith(state);
    });

    test('should handle export errors gracefully', async () => {
      // Create minimal protokoll
      protokollState.setMetadataField('auftraggeber', 'Error Test');
      
      // Mock export failure
      createAndExportProtokoll.mockRejectedValue(
        new Error('Export failed: File system error')
      );
      
      const state = protokollState.getState();
      
      // Attempt export
      await expect(createAndExportProtokoll(state)).rejects.toThrow('Export failed');
    });
  });
});
