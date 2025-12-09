/**
 * protokoll-state.test.js
 * Comprehensive unit tests for state management module
 */

import * as state from '../../js/protokoll/protokoll-state.js';

describe('Protokoll State Management', () => {
  
  beforeEach(() => {
    // Clear state before each test
    localStorage.clear();
    state.reset();
  });

  // ========== INITIALIZATION ==========
  describe('init()', () => {
    test('should initialize with default state', () => {
      state.init();
      const current = state.getState();
      
      expect(current.metadata).toBeDefined();
      expect(current.positions).toEqual([]);
      expect(current.formState.currentStep).toBe('metadata');
    });

    test('should load existing state from localStorage', () => {
      // Pre-populate localStorage
      const saved = {
        metadata: { auftraggeber: 'Test Company' },
        positions: [],
        prüfungsergebnis: {},
        formState: { currentStep: 'positions', validationErrors: {} }
      };
      localStorage.setItem('protokoll_state', JSON.stringify(saved));
      
      state.init();
      const current = state.getState();
      
      expect(current.formState.currentStep).toBe('positions');
    });

    test('should handle corrupted localStorage gracefully', () => {
      // Pre-populate with corrupted data
      localStorage.setItem('protokoll_state', 'invalid json {');
      
      state.init();
      const current = state.getState();
      
      // Should fallback to defaults
      expect(current.metadata).toBeDefined();
      expect(current.formState.currentStep).toBe('metadata');
    });
  });

  // ========== METADATA ==========
  describe('Metadata Operations', () => {
    beforeEach(() => {
      state.init();
    });

    test('getMetadata() returns copy', () => {
      const metadata = state.getMetadata();
      metadata.auftraggeber = 'Modified';
      
      const current = state.getMetadata();
      expect(current.auftraggeber).toBe('');
    });

    test('setMetadata() updates entire metadata', () => {
      const newMetadata = { auftraggeber: 'New Company' };
      state.setMetadata(newMetadata);
      
      const current = state.getMetadata();
      expect(current.auftraggeber).toBe('New Company');
    });

    test('setMetadataField() updates single field', () => {
      state.setMetadataField('auftraggeber', 'Test AG');
      
      const value = state.getMetadataField('auftraggeber');
      expect(value).toBe('Test AG');
    });

    test('getMetadataField() supports nested paths', () => {
      state.setMetadataField('facility.name', 'Test Facility');
      
      const value = state.getMetadataField('facility.name');
      expect(value).toBe('Test Facility');
    });
  });

  // ========== POSITIONS ==========
  describe('Position Operations', () => {
    beforeEach(() => {
      state.init();
    });

    test('addPosition() creates new position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit'
      });
      
      expect(posNr).toBeDefined();
      const positions = state.getPositions();
      expect(positions.length).toBe(1);
    });

    test('getPosition() returns specific position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test'
      });
      
      const position = state.getPosition(posNr);
      expect(position.stromkreisNr).toBe('F1');
    });

    test('updatePosition() modifies position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test'
      });
      
      state.updatePosition(posNr, {
        zielbezeichnung: 'Updated'
      });
      
      const position = state.getPosition(posNr);
      expect(position.zielbezeichnung).toBe('Updated');
    });

    test('deletePosition() removes position', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1'
      });
      
      state.deletePosition(posNr);
      
      const positions = state.getPositions();
      expect(positions.length).toBe(0);
    });

    test('getPosition() returns null for non-existent position', () => {
      const position = state.getPosition('nonexistent');
      expect(position).toBeNull();
    });
  });

  // ========== VALIDATION ERRORS ==========
  describe('Validation Errors', () => {
    beforeEach(() => {
      state.init();
    });

    test('setValidationError() adds error', () => {
      state.setValidationError('metadata.auftraggeber', 'Required field');
      
      const errors = state.getValidationErrors();
      expect(errors['metadata.auftraggeber']).toBe('Required field');
    });

    test('setValidationError() with null clears error', () => {
      state.setValidationError('metadata.auftraggeber', 'Error');
      state.setValidationError('metadata.auftraggeber', null);
      
      const errors = state.getValidationErrors();
      expect(errors['metadata.auftraggeber']).toBeUndefined();
    });

    test('clearValidationErrors() removes all errors', () => {
      state.setValidationError('field1', 'Error 1');
      state.setValidationError('field2', 'Error 2');
      state.clearValidationErrors();
      
      const errors = state.getValidationErrors();
      expect(Object.keys(errors).length).toBe(0);
    });

    test('setValidationErrors() replaces all errors', () => {
      state.setValidationError('field1', 'Error 1');
      state.setValidationErrors({ 'field2': 'Error 2', 'field3': 'Error 3' });
      
      const errors = state.getValidationErrors();
      expect(errors['field1']).toBeUndefined();
      expect(errors['field2']).toBe('Error 2');
      expect(errors['field3']).toBe('Error 3');
    });
  });

  // ========== FORM STATE ==========
  describe('Form State', () => {
    beforeEach(() => {
      state.init();
    });

    test('setFormStep() changes step', () => {
      state.setFormStep('positions');
      
      expect(state.getCurrentStep()).toBe('positions');
    });

    test('setFormStep() rejects invalid step', () => {
      state.setFormStep('invalid');
      
      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('markUnsaved() sets flag', () => {
      state.markUnsaved();
      
      expect(state.hasUnsavedChanges()).toBe(true);
      expect(state.isDirty()).toBe(true);
    });

    test('clearUnsaved() clears flag', () => {
      state.markUnsaved();
      state.clearUnsaved();
      
      expect(state.hasUnsavedChanges()).toBe(false);
    });
  });

  // ========== PRÜFUNGSERGEBNIS ==========
  describe('Prüfungsergebnis', () => {
    beforeEach(() => {
      state.init();
    });

    test('getPrüfungsergebnis() returns inspection results', () => {
      const results = state.getPrüfungsergebnis();
      expect(results.mängelFestgestellt).toBe(false);
      expect(results.plakette).toBe('ja');
    });

    test('setPrüfungsergebnis() updates results', () => {
      state.setPrüfungsergebnis({
        mängelFestgestellt: true,
        bemerkung: 'Test comment'
      });
      
      const results = state.getPrüfungsergebnis();
      expect(results.mängelFestgestellt).toBe(true);
      expect(results.bemerkung).toBe('Test comment');
      expect(results.plakette).toBe('ja'); // Original value preserved
    });
  });

  // ========== EVENTS ==========
  describe('Event System', () => {
    beforeEach(() => {
      state.init();
    });

    test('on() subscribes to events', (done) => {
      state.on('testEvent', (data) => {
        expect(data.value).toBe(42);
        done();
      });
      
      state.emit('testEvent', { value: 42 });
    });

    test('off() unsubscribes from events', () => {
      const callback = jest.fn();
      state.on('testEvent', callback);
      state.off('testEvent', callback);
      
      state.emit('testEvent', {});
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('metadata changes emit events', (done) => {
      state.on('metadataFieldChanged', (data) => {
        expect(data.fieldPath).toBe('auftraggeber');
        expect(data.value).toBe('Test');
        done();
      });
      
      state.setMetadataField('auftraggeber', 'Test');
    });

    test('position changes emit events', (done) => {
      state.on('positionAdded', (data) => {
        expect(data.position).toBeDefined();
        done();
      });
      
      state.addPosition({ stromkreisNr: 'F1' });
    });

    test('on() returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = state.on('testEvent', callback);
      
      unsubscribe();
      state.emit('testEvent', {});
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ========== PERSISTENCE ==========
  describe('localStorage Persistence', () => {
    beforeEach(() => {
      localStorage.clear();
      state.init();
    });

    test('forceSave() writes to localStorage', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      
      const saved = JSON.parse(localStorage.getItem('protokoll_state'));
      expect(saved.metadata.auftraggeber).toBe('Test');
    });

    test('loadFromLocalStorage() restores state', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      
      // Manually clear state without clearing localStorage
      // This simulates loading state after a page reload
      state.init(); // Re-init will load from localStorage
      
      expect(state.getMetadataField('auftraggeber')).toBe('Test');
    });

    test('clearLocalStorage() removes data', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      state.clearLocalStorage();
      
      const saved = localStorage.getItem('protokoll_state');
      expect(saved).toBeNull();
    });

    test('loadFromLocalStorage() returns false when no data', () => {
      localStorage.clear();
      const result = state.loadFromLocalStorage();
      expect(result).toBe(false);
    });

    test('loadFromLocalStorage() returns true when data exists', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.forceSave();
      
      // loadFromLocalStorage() works on existing localStorage data
      const result = state.loadFromLocalStorage();
      expect(result).toBe(true);
    });
  });

  // ========== IMMUTABILITY ==========
  describe('State Immutability', () => {
    beforeEach(() => {
      state.init();
    });

    test('getState() returns immutable copy', () => {
      const copy = state.getState();
      copy.metadata.auftraggeber = 'Modified';
      
      const current = state.getState();
      expect(current.metadata.auftraggeber).toBe('');
    });

    test('modifications through getters don\'t affect state', () => {
      const metadata = state.getMetadata();
      metadata.auftraggeber = 'Modified';
      
      const current = state.getMetadata();
      expect(current.auftraggeber).toBe('');
    });

    test('getPositions() returns immutable copy', () => {
      state.addPosition({ stromkreisNr: 'F1' });
      
      const positions = state.getPositions();
      positions.push({ stromkreisNr: 'F2' });
      
      expect(state.getPositions().length).toBe(1);
    });

    test('getFormState() returns immutable copy', () => {
      const formState = state.getFormState();
      formState.currentStep = 'review';
      
      expect(state.getCurrentStep()).toBe('metadata');
    });
  });

  // ========== EDGE CASES ==========
  describe('Edge Cases', () => {
    beforeEach(() => {
      state.init();
    });

    test('handles null metadata gracefully', () => {
      expect(() => {
        state.setMetadata(null);
      }).not.toThrow();
    });

    test('handles invalid positions gracefully', () => {
      const result = state.addPosition(null);
      expect(result).toBeNull();
    });

    test('handles duplicate position deletion', () => {
      const posNr = state.addPosition({ stromkreisNr: 'F1' });
      state.deletePosition(posNr);
      
      const result = state.deletePosition(posNr);
      expect(result).toBe(false);
    });

    test('handles deeply nested metadata paths', () => {
      state.setMetadataField('facility.custom.deep.value', 'test');
      
      const value = state.getMetadataField('facility.custom.deep.value');
      expect(value).toBe('test');
    });

    test('handles non-existent nested path gracefully', () => {
      const value = state.getMetadataField('nonexistent.nested.path');
      expect(value).toBeUndefined();
    });

    test('updatePosition() returns false for non-existent position', () => {
      const result = state.updatePosition('nonexistent', { stromkreisNr: 'F2' });
      expect(result).toBe(false);
    });

    test('reset() clears all state', () => {
      state.setMetadataField('auftraggeber', 'Test');
      state.addPosition({ stromkreisNr: 'F1' });
      state.setPrüfungsergebnis({ mängelFestgestellt: true });
      
      state.reset();
      
      const current = state.getState();
      expect(current.metadata.auftraggeber).toBe('');
      expect(current.positions.length).toBe(0);
      expect(current.prüfungsergebnis.mängelFestgestellt).toBe(false);
    });

    test('setMetadataField() guards against prototype pollution', () => {
      // Try to set __proto__ - should be rejected
      state.setMetadataField('__proto__.polluted', 'malicious');
      
      // Verify Object prototype is not polluted
      expect({}.polluted).toBeUndefined();
      
      // Try to set constructor - should be rejected
      state.setMetadataField('constructor.polluted', 'malicious');
      expect({}.polluted).toBeUndefined();
    });
  });

  // ========== POSITION STRUCTURE ==========
  describe('Position Structure', () => {
    beforeEach(() => {
      state.init();
    });

    test('addPosition() creates position with full structure', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit'
      });
      
      const position = state.getPosition(posNr);
      
      // Check structure exists
      expect(position.leitung).toBeDefined();
      expect(position.spannung).toBeDefined();
      expect(position.überstromschutz).toBeDefined();
      expect(position.messwerte).toBeDefined();
      expect(position.prüfergebnis).toBeDefined();
      
      // Check default values
      expect(position.prüfergebnis.status).toBe('nicht-geprüft');
      expect(position.prüfergebnis.mängel).toEqual([]);
    });

    test('addPosition() preserves provided nested values', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        leitung: {
          typ: 'NYM-J',
          querschnitt: '1.5mm²'
        },
        messwerte: {
          riso: '> 500MΩ'
        }
      });
      
      const position = state.getPosition(posNr);
      
      expect(position.leitung.typ).toBe('NYM-J');
      expect(position.leitung.querschnitt).toBe('1.5mm²');
      expect(position.messwerte.riso).toBe('> 500MΩ');
    });
  });
});
