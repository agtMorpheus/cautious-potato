/**
 * protokoll-handlers.test.js
 * Unit tests for event handlers module
 */

import { jest } from '@jest/globals';
import * as handlers from '../../js/protokoll/protokoll-handlers.js';
import * as state from '../../js/protokoll/protokoll-state.js';
import * as validator from '../../js/protokoll/protokoll-validator.js';

describe('Protokoll Handlers', () => {
  
  beforeEach(() => {
    localStorage.clear();
    state.init();
    
    // Clear any DOM elements from previous tests
    document.body.innerHTML = '';

    // Mock confirm
    global.confirm = jest.fn(() => true);

    // Spy on console
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      
      expect(position.stromkreisNr).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
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

    test('deletes position with confirm dialog confirmed', () => {
        const posNr = handlers.handleAddPosition();
        global.confirm.mockReturnValue(true);

        const result = handlers.handleDeletePosition(posNr, false);

        expect(global.confirm).toHaveBeenCalled();
        expect(result).toBe(true);
        expect(state.getPositions().length).toBe(0);
    });

    test('does not delete position when confirm cancelled', () => {
        const posNr = handlers.handleAddPosition();
        global.confirm.mockReturnValue(false);

        const result = handlers.handleDeletePosition(posNr, false);

        expect(global.confirm).toHaveBeenCalled();
        expect(result).toBe(false);
        expect(state.getPositions().length).toBe(1);
    });

    test('returns false for non-existent position', () => {
      const result = handlers.handleDeletePosition('nonexistent', true);
      
      expect(result).toBe(false);
    });
  });

  describe('handleAddChildPosition', () => {
      test('adds child position to parent', () => {
          const parentNr = handlers.handleAddPosition();
          const childNr = handlers.handleAddChildPosition(parentNr);

          expect(childNr).toBeDefined();
          const child = state.getPosition(childNr);
          expect(child.parentCircuitId).toBe(parentNr);
      });

      test('fails if parent does not exist', () => {
          const result = handlers.handleAddChildPosition('non-existent');
          expect(result).toBeNull();
          expect(console.error).toHaveBeenCalled();
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
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const pastDate = new Date(Date.now() - ONE_DAY_MS).toISOString();
      
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
      expect(state.getCurrentStep()).toBe('messen');
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
      state.setFormStep('messen');
      expect(state.getCurrentStep()).toBe('messen'); // Pre-condition check

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

    test('resets state when confirmed', () => {
        global.confirm.mockReturnValue(true);
        const result = handlers.handleReset(false);
        expect(result).toBe(true);
        expect(global.confirm).toHaveBeenCalled();
    });

    test('cancels reset when not confirmed', () => {
        global.confirm.mockReturnValue(false);
        const result = handlers.handleReset(false);
        expect(result).toBe(false);
        expect(global.confirm).toHaveBeenCalled();
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

  // ===== EVENT DELEGATION & DOM =====
  describe('DOM Interactions', () => {
      let container;

      beforeEach(() => {
          container = document.createElement('div');
          container.id = 'protokollFormContainer';
          document.body.appendChild(container);
          handlers.init();
      });

      test('handles input change for metadata', () => {
          const input = document.createElement('input');
          input.dataset.field = 'metadata.auftraggeber';
          input.value = 'New Value';
          container.appendChild(input);

          input.dispatchEvent(new Event('change', { bubbles: true }));

          expect(state.getMetadataField('auftraggeber')).toBe('New Value');
      });

      test('handles checkbox change', () => {
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.dataset.field = 'metadata.someBool';
          input.checked = true;
          container.appendChild(input);

          input.dispatchEvent(new Event('change', { bubbles: true }));

          expect(state.getMetadataField('someBool')).toBe(true);
      });

      test('handles input event for text fields (realtime update)', () => {
          const input = document.createElement('input');
          input.type = 'text';
          input.dataset.field = 'metadata.auftraggeber';
          input.value = 'Typing...';
          container.appendChild(input);

          input.dispatchEvent(new Event('input', { bubbles: true }));

          expect(state.getMetadataField('auftraggeber')).toBe('Typing...');
      });

      test('handles input event for non-text fields (validation only)', () => {
          const input = document.createElement('input');
          input.type = 'date';
          input.dataset.field = 'metadata.date';
          input.value = 'invalid-date';
          container.appendChild(input);

          // Spy on validator
          const validateSpy = jest.spyOn(validator, 'validateField');

          input.dispatchEvent(new Event('input', { bubbles: true }));

          expect(validateSpy).toHaveBeenCalled();
          // State should NOT be updated for non-text on input, only validation error
          // Note: validateField implementation determines validity.
      });

      test('handles blur event', () => {
          const input = document.createElement('input');
          input.dataset.field = 'metadata.auftraggeber';
          input.value = 'Val';
          container.appendChild(input);

          const validateSpy = jest.spyOn(validator, 'validateField');

          input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

          expect(validateSpy).toHaveBeenCalled();
      });

      test('handles button clicks via document delegation', () => {
          const btn = document.createElement('button');
          btn.dataset.action = 'add-position';
          document.body.appendChild(btn);

          btn.click();

          expect(state.getPositions().length).toBe(1);
      });

      test('handles add-child-position button click', () => {
          const parentNr = handlers.handleAddPosition();

          const btn = document.createElement('button');
          btn.dataset.action = 'add-child-position';
          btn.dataset.posNr = parentNr;
          document.body.appendChild(btn);

          btn.click();

          // Should have 2 positions (parent + child)
          expect(state.getPositions().length).toBe(2);
      });

      test('handles unknown button action', () => {
          const btn = document.createElement('button');
          btn.dataset.action = 'unknown-action';
          document.body.appendChild(btn);

          // Should not throw
          expect(() => btn.click()).not.toThrow();
      });

      test('handles position input without parent row', () => {
          // Input claiming to be position field but not inside a row
          const input = document.createElement('input');
          input.dataset.field = 'position.stromkreisNr';
          input.value = 'Val';
          container.appendChild(input); // appended to container, not a row

          // Should ignore gracefully
          expect(() => {
              input.dispatchEvent(new Event('change', { bubbles: true }));
          }).not.toThrow();
      });

      test('handles valid input for non-text field', () => {
          const input = document.createElement('input');
          input.type = 'number';
          input.dataset.field = 'results.count'; // hypothetical field
          input.value = '5';
          container.appendChild(input);

          // Mock validator to return valid
          const validateSpy = jest.spyOn(validator, 'validateField').mockReturnValue({ isValid: true });

          input.dispatchEvent(new Event('input', { bubbles: true }));

          expect(validateSpy).toHaveBeenCalled();
          // Should clear validation error
          const errors = state.getValidationErrors();
          expect(errors['results.count']).toBeUndefined();
      });
  });

  // ===== SAFETY & ERROR HANDLING =====
  describe('Safety & Error Handling', () => {
      test('prevents prototype pollution via field path', () => {
          const posNr = handlers.handleAddPosition();

          // Try to pollute
          const consoleSpy = jest.spyOn(console, 'error');
          handlers.handlePositionChange(posNr, 'position.__proto__.polluted', 'bad');

          expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid path key'));
          // Check it didn't pollute
          expect({}.polluted).toBeUndefined();
      });

      test('handles unexpected error during export', async () => {
          // Setup valid state
          state.setMetadata({ protokollNumber: '123' }); // minimal valid

          // Mock validation to pass
          jest.spyOn(validator, 'validateForm').mockReturnValue({ isValid: true });

          // Force error in export logic by making state.getState throw
          jest.spyOn(state, 'getState').mockImplementation(() => {
              throw new Error('Unexpected Export Error');
          });

          const result = await handlers.handleExport();

          expect(result).toBe(false);
          expect(console.error).toHaveBeenCalledWith('Export failed:', expect.any(Error));
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
