/**
 * protokoll-handlers.test.js
 * Unit tests for event handlers module
 */

import * as handlers from '../../js/protokoll/protokoll-handlers.js';
import * as state from '../../js/protokoll/protokoll-state.js';
import * as validator from '../../js/protokoll/protokoll-validator.js';

describe('Protokoll Handlers', () => {
  
  beforeEach(() => {
    localStorage.clear();
    state.init();
    
    // Clear any DOM elements from previous tests
    document.body.innerHTML = '';
  });

  // ===== METADATA HANDLERS =====
  describe('handleMetadataChange', () => {
    test('updates state for valid metadata field', () => {
      handlers.handleMetadataChange('metadata.auftraggeber', 'Test Company');
      
      const value = state.getMetadataField('auftraggeber');
      expect(value).toBe('Test Company');
    });

    test('sets validation error for invalid field', () => {
      handlers.handleMetadataChange('metadata.auftraggeber', 'AB'); // Too short
      
      const errors = state.getValidationErrors();
      expect(errors['metadata.auftraggeber']).toBeTruthy();
    });

    test('clears validation error for valid field', () => {
      // First set an error
      state.setValidationError('metadata.auftraggeber', 'Some error');
      
      // Then update with valid value
      handlers.handleMetadataChange('metadata.auftraggeber', 'Valid Company Name');
      
      const errors = state.getValidationErrors();
      expect(errors['metadata.auftraggeber']).toBeUndefined();
    });

    test('handles nested metadata fields', () => {
      handlers.handleMetadataChange('metadata.facility.name', 'Test Facility');
      
      const value = state.getMetadataField('facility.name');
      expect(value).toBe('Test Facility');
    });
  });

  // ===== INSPECTION TYPE TOGGLE =====
  describe('handleInspectionTypeToggle', () => {
    test('adds inspection type when selected', () => {
      handlers.handleInspectionTypeToggle('Erstprüfung', true);
      
      const prüfArt = state.getMetadataField('facility.prüfArt');
      expect(prüfArt).toContain('Erstprüfung');
    });

    test('removes inspection type when deselected', () => {
      state.setMetadataField('facility.prüfArt', ['Erstprüfung', 'Wiederholungsprüfung']);
      
      handlers.handleInspectionTypeToggle('Erstprüfung', false);
      
      const prüfArt = state.getMetadataField('facility.prüfArt');
      expect(prüfArt).not.toContain('Erstprüfung');
      expect(prüfArt).toContain('Wiederholungsprüfung');
    });

    test('does not add duplicate types', () => {
      state.setMetadataField('facility.prüfArt', ['Erstprüfung']);
      
      handlers.handleInspectionTypeToggle('Erstprüfung', true);
      
      const prüfArt = state.getMetadataField('facility.prüfArt');
      expect(prüfArt.length).toBe(1);
    });

    test('handles deselecting non-existent type', () => {
      state.setMetadataField('facility.prüfArt', ['Erstprüfung']);
      
      handlers.handleInspectionTypeToggle('NonExistent', false);
      
      const prüfArt = state.getMetadataField('facility.prüfArt');
      expect(prüfArt).toEqual(['Erstprüfung']);
    });
  });

  // ===== POSITION HANDLERS =====
  describe('handleAddPosition', () => {
    test('creates new position', () => {
      const posNr = handlers.handleAddPosition();
      
      expect(posNr).toBeDefined();
      const positions = state.getPositions();
      expect(positions.length).toBe(1);
    });

    test('creates position with default structure', () => {
      const posNr = handlers.handleAddPosition();
      const position = state.getPosition(posNr);
      
      expect(position.stromkreisNr).toBe('');
      expect(position.spannung).toBeDefined();
      expect(position.messwerte).toBeDefined();
      expect(position.prüfergebnis.status).toBe('nicht-geprüft');
    });

    test('increments position count', () => {
      handlers.handleAddPosition();
      handlers.handleAddPosition();
      
      const positions = state.getPositions();
      expect(positions.length).toBe(2);
    });
  });

  describe('handleDeletePosition', () => {
    test('deletes position with skip confirm', () => {
      const posNr = handlers.handleAddPosition();
      
      const result = handlers.handleDeletePosition(posNr, true);
      
      expect(result).toBe(true);
      expect(state.getPositions().length).toBe(0);
    });

    test('returns false for non-existent position', () => {
      const result = handlers.handleDeletePosition('nonexistent', true);
      
      expect(result).toBe(false);
    });
  });

  describe('handlePositionChange', () => {
    test('updates position field', () => {
      const posNr = handlers.handleAddPosition();
      
      handlers.handlePositionChange(posNr, 'position.stromkreisNr', 'F1');
      
      const position = state.getPosition(posNr);
      expect(position.stromkreisNr).toBe('F1');
    });

    test('handles nested position fields', () => {
      const posNr = handlers.handleAddPosition();
      
      handlers.handlePositionChange(posNr, 'position.spannung.un', 230);
      
      const position = state.getPosition(posNr);
      expect(position.spannung.un).toBe(230);
    });

    test('ignores non-existent position', () => {
      // Should not throw
      expect(() => {
        handlers.handlePositionChange('nonexistent', 'position.stromkreisNr', 'F1');
      }).not.toThrow();
    });
  });

  // ===== RESULTS HANDLERS =====
  describe('handleResultsChange', () => {
    test('updates results field', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      handlers.handleResultsChange('results.nächsterPrüfungstermin', futureDate);
      
      const results = state.getPrüfungsergebnis();
      expect(results.nächsterPrüfungstermin).toBe(futureDate);
    });

    test('sets validation error for invalid results', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      
      handlers.handleResultsChange('results.nächsterPrüfungstermin', pastDate);
      
      const errors = state.getValidationErrors();
      expect(errors['results.nächsterPrüfungstermin']).toBeTruthy();
    });
  });

  // ===== FORM NAVIGATION =====
  describe('handlePreviousStep', () => {
    test('moves to previous step', () => {
      state.setFormStep('positions');
      
      const result = handlers.handlePreviousStep();
      
      expect(result).toBe(true);
      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('returns false at first step', () => {
      state.setFormStep('metadata');
      
      const result = handlers.handlePreviousStep();
      
      expect(result).toBe(false);
      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('navigates from review to results', () => {
      state.setFormStep('review');
      
      handlers.handlePreviousStep();
      
      expect(state.getCurrentStep()).toBe('results');
    });
  });

  describe('handleNextStep', () => {
    beforeEach(() => {
      // Set up valid metadata for tests
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });
    });

    test('moves to next step when validation passes', () => {
      const result = handlers.handleNextStep();
      
      expect(result).toBe(true);
      expect(state.getCurrentStep()).toBe('positions');
    });

    test('returns false when validation fails', () => {
      // Clear metadata to fail validation
      state.reset();
      state.init();
      
      const result = handlers.handleNextStep();
      
      expect(result).toBe(false);
      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('returns false at last step', () => {
      state.setFormStep('review');
      
      const result = handlers.handleNextStep();
      
      expect(result).toBe(false);
    });

    test('validates positions step before advancing', () => {
      state.setFormStep('positions');
      // No positions added
      
      const result = handlers.handleNextStep();
      
      expect(result).toBe(false);
      expect(state.getCurrentStep()).toBe('positions');
    });

    test('advances from positions when valid', () => {
      state.setFormStep('positions');
      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });
      
      const result = handlers.handleNextStep();
      
      expect(result).toBe(true);
      expect(state.getCurrentStep()).toBe('results');
    });

    test('validates results step before advancing', () => {
      state.setFormStep('results');
      // No future date set
      
      const result = handlers.handleNextStep();
      
      expect(result).toBe(false);
    });

    test('advances from results when valid', () => {
      state.setFormStep('results');
      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      const result = handlers.handleNextStep();
      
      expect(result).toBe(true);
      expect(state.getCurrentStep()).toBe('review');
    });
  });

  describe('handleGoToStep', () => {
    test('jumps to valid step', () => {
      const result = handlers.handleGoToStep('positions');
      
      expect(result).toBe(true);
      expect(state.getCurrentStep()).toBe('positions');
    });

    test('returns false for invalid step', () => {
      const result = handlers.handleGoToStep('invalid');
      
      expect(result).toBe(false);
    });
  });

  // ===== EXPORT HANDLERS =====
  describe('handleExport', () => {
    test('fails when form is invalid', async () => {
      const result = await handlers.handleExport();
      
      expect(result).toBe(false);
    });

    test('succeeds when form is valid', async () => {
      // Set up valid form
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      const result = await handlers.handleExport();
      
      expect(result).toBe(true);
    });

    test('emits export event with state', async () => {
      // Set up valid form
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      let exportEventFired = false;
      document.addEventListener('protokoll:export', (e) => {
        exportEventFired = true;
        expect(e.detail.state).toBeDefined();
      });

      await handlers.handleExport();
      
      expect(exportEventFired).toBe(true);
    });
  });

  // ===== RESET HANDLER =====
  describe('handleReset', () => {
    test('resets state with skip confirm', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.addPosition({ stromkreisNr: 'F1' });
      
      const result = handlers.handleReset(true);
      
      expect(result).toBe(true);
      expect(state.getMetadataField('auftraggeber')).toBe('');
      expect(state.getPositions().length).toBe(0);
    });

    test('emits reset event', () => {
      let resetEventFired = false;
      document.addEventListener('protokoll:reset', () => {
        resetEventFired = true;
      });
      
      handlers.handleReset(true);
      
      expect(resetEventFired).toBe(true);
    });
  });

  // ===== INIT =====
  describe('init', () => {
    test('does not throw when container not found', () => {
      expect(() => handlers.init()).not.toThrow();
    });

    test('sets up event listeners when container exists', () => {
      // Create container
      const container = document.createElement('div');
      container.id = 'protokollFormContainer';
      document.body.appendChild(container);
      
      expect(() => handlers.init()).not.toThrow();
    });
  });

  // ===== EVENT DISPATCHING =====
  describe('Event Dispatching', () => {
    beforeEach(() => {
      // Create container for event delegation
      const container = document.createElement('div');
      container.id = 'protokollFormContainer';
      document.body.appendChild(container);
      handlers.init();
    });

    test('dispatches validationFailed event on next step failure', () => {
      let eventFired = false;
      document.addEventListener('protokoll:validationFailed', () => {
        eventFired = true;
      });
      
      handlers.handleNextStep();
      
      expect(eventFired).toBe(true);
    });

    test('dispatches message event on export failure', async () => {
      let eventFired = false;
      const listener = (e) => {
        eventFired = true;
        expect(e.detail.type).toBe('error');
      };
      document.addEventListener('protokoll:message', listener, { once: true });
      
      await handlers.handleExport();
      
      expect(eventFired).toBe(true);
    });

    test('dispatches loading events during export', async () => {
      // Set up valid form
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S'
        },
        prüfer: { name: 'John Doe' }
      });

      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Circuit 1',
        spannung: { un: 230, fn: 50 },
        messwerte: { riso: 100 }
      });

      state.setPrüfungsergebnis({
        nächsterPrüfungstermin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      let loadingStates = [];
      document.addEventListener('protokoll:loading', (e) => {
        loadingStates.push(e.detail.loading);
      });
      
      await handlers.handleExport();
      
      expect(loadingStates).toContain(true);
      expect(loadingStates).toContain(false);
    });
  });
});
