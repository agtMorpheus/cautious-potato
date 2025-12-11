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
      expect(results.plaketteJa).toBe(false);
      expect(results.plaketteNein).toBe(false);
    });

    test('setPrüfungsergebnis() updates results', () => {
      state.setPrüfungsergebnis({
        mängelFestgestellt: true,
        bemerkung: 'Test comment'
      });
      
      const results = state.getPrüfungsergebnis();
      expect(results.mängelFestgestellt).toBe(true);
      expect(results.bemerkung).toBe('Test comment');
      expect(results.plaketteJa).toBe(false); // Original value preserved
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

    test('addPosition() includes phaseType with default value mono', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit'
      });
      
      const position = state.getPosition(posNr);
      expect(position.phaseType).toBe('mono');
    });

    test('addPosition() accepts phaseType values mono, bi, tri', () => {
      const monoPos = state.addPosition({ stromkreisNr: 'F1', phaseType: 'mono' });
      const biPos = state.addPosition({ stromkreisNr: 'F2', phaseType: 'bi' });
      const triPos = state.addPosition({ stromkreisNr: 'F3', phaseType: 'tri' });
      
      expect(state.getPosition(monoPos).phaseType).toBe('mono');
      expect(state.getPosition(biPos).phaseType).toBe('bi');
      expect(state.getPosition(triPos).phaseType).toBe('tri');
    });

    test('addPosition() includes parentCircuitId with default null', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit'
      });
      
      const position = state.getPosition(posNr);
      expect(position.parentCircuitId).toBeNull();
    });

    test('addPosition() accepts parentCircuitId for circuit tree', () => {
      const parentPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Parent Circuit'
      });
      
      const childPosNr = state.addPosition({
        stromkreisNr: 'F1.1',
        zielbezeichnung: 'Child Circuit',
        parentCircuitId: parentPosNr
      });
      
      const childPosition = state.getPosition(childPosNr);
      expect(childPosition.parentCircuitId).toBe(parentPosNr);
    });
  });

  // ========== CIRCUIT TREE OPERATIONS ==========
  describe('Circuit Tree Operations', () => {
    beforeEach(() => {
      state.init();
    });

    test('getChildCircuits() returns empty array when no children', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Root Circuit'
      });
      
      const children = state.getChildCircuits(posNr);
      expect(children).toEqual([]);
    });

    test('getChildCircuits() returns child circuits', () => {
      const parentPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Parent Circuit'
      });
      
      state.addPosition({
        stromkreisNr: 'F1.1',
        zielbezeichnung: 'Child 1',
        parentCircuitId: parentPosNr
      });
      
      state.addPosition({
        stromkreisNr: 'F1.2',
        zielbezeichnung: 'Child 2',
        parentCircuitId: parentPosNr
      });
      
      const children = state.getChildCircuits(parentPosNr);
      expect(children.length).toBe(2);
      expect(children.map(c => c.stromkreisNr)).toContain('F1.1');
      expect(children.map(c => c.stromkreisNr)).toContain('F1.2');
    });

    test('getChildCircuits(null) returns root circuits', () => {
      const rootPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Root Circuit'
      });
      
      state.addPosition({
        stromkreisNr: 'F1.1',
        zielbezeichnung: 'Child Circuit',
        parentCircuitId: rootPosNr
      });
      
      const rootCircuits = state.getChildCircuits(null);
      expect(rootCircuits.length).toBe(1);
      expect(rootCircuits[0].stromkreisNr).toBe('F1');
    });

    test('getParentCircuit() returns parent circuit', () => {
      const parentPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Parent Circuit'
      });
      
      const childPosNr = state.addPosition({
        stromkreisNr: 'F1.1',
        zielbezeichnung: 'Child Circuit',
        parentCircuitId: parentPosNr
      });
      
      const parent = state.getParentCircuit(childPosNr);
      expect(parent).not.toBeNull();
      expect(parent.stromkreisNr).toBe('F1');
    });

    test('getParentCircuit() returns null for root circuit', () => {
      const rootPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Root Circuit'
      });
      
      const parent = state.getParentCircuit(rootPosNr);
      expect(parent).toBeNull();
    });

    test('getCircuitAncestry() returns empty array for root circuit', () => {
      const rootPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Root Circuit'
      });
      
      const ancestry = state.getCircuitAncestry(rootPosNr);
      expect(ancestry).toEqual([]);
    });

    test('getCircuitAncestry() returns parent chain for nested circuit', () => {
      const grandparentPosNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Grandparent'
      });
      
      const parentPosNr = state.addPosition({
        stromkreisNr: 'F1.1',
        zielbezeichnung: 'Parent',
        parentCircuitId: grandparentPosNr
      });
      
      const childPosNr = state.addPosition({
        stromkreisNr: 'F1.1.1',
        zielbezeichnung: 'Child',
        parentCircuitId: parentPosNr
      });
      
      const ancestry = state.getCircuitAncestry(childPosNr);
      expect(ancestry.length).toBe(2);
      expect(ancestry[0].stromkreisNr).toBe('F1');
      expect(ancestry[1].stromkreisNr).toBe('F1.1');
    });
  });

  // ========== CONTRACT INTEGRATION ==========
  describe('loadFromContract()', () => {
    let consoleSpy;

    beforeEach(() => {
      state.init();
    });

    afterEach(() => {
      // Ensure console spy is always restored
      if (consoleSpy) {
        consoleSpy.mockRestore();
        consoleSpy = null;
      }
    });

    test('should load contract data into protokoll metadata', () => {
      const contract = {
        contractId: 'VW-2024-001',
        contractTitle: 'Volkswagen AG Prüfung',
        location: 'Halle 3',
        equipmentId: 'E03150AP17000093243',
        equipmentDescription: 'LVUM-Fc34',
        roomArea: 'Säule A5'
      };

      state.loadFromContract(contract);

      const metadata = state.getMetadata();
      expect(metadata.auftragnummer).toBe('VW-2024-001');
      expect(metadata.auftraggeber).toBe('Volkswagen AG Prüfung');
      expect(metadata.kundennummer).toBe('VW-2024-001');
      expect(metadata.facility.ort).toBe('Halle 3');
      expect(metadata.facility.inv).toBe('E03150AP17000093243');
      expect(metadata.facility.anlage).toContain('LVUM-Fc34');
      expect(metadata.facility.anlage).toContain('Säule A5');
    });

    test('should set current date when loading from contract', () => {
      const contract = {
        contractId: 'TEST-001',
        contractTitle: 'Test Contract'
      };

      const beforeLoad = new Date();
      state.loadFromContract(contract);
      const afterLoad = new Date();

      const metadata = state.getMetadata();
      const datumDate = new Date(metadata.datum);
      
      expect(datumDate.getTime()).toBeGreaterThanOrEqual(beforeLoad.getTime() - 1000);
      expect(datumDate.getTime()).toBeLessThanOrEqual(afterLoad.getTime() + 1000);
    });

    test('should reset form state to metadata step', () => {
      state.setFormStep('positions');
      
      const contract = {
        contractId: 'TEST-001',
        contractTitle: 'Test Contract'
      };

      state.loadFromContract(contract);

      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('should mark state as dirty and having unsaved changes', () => {
      state.clearUnsaved();
      
      const contract = {
        contractId: 'TEST-001',
        contractTitle: 'Test Contract'
      };

      state.loadFromContract(contract);

      expect(state.hasUnsavedChanges()).toBe(true);
      expect(state.isDirty()).toBe(true);
    });

    test('should handle contract with partial data', () => {
      const contract = {
        contractId: 'PARTIAL-001',
        contractTitle: 'Partial Contract'
        // Missing: location, equipmentId, equipmentDescription, roomArea
      };

      state.loadFromContract(contract);

      const metadata = state.getMetadata();
      expect(metadata.auftragnummer).toBe('PARTIAL-001');
      expect(metadata.auftraggeber).toBe('Partial Contract');
      // facility.ort remains at default value since location was not provided
      expect(metadata.facility.ort).toBe('');
    });

    test('should handle contract with only roomArea (no equipmentDescription)', () => {
      const contract = {
        contractId: 'ROOM-001',
        contractTitle: 'Room Only Contract',
        roomArea: 'Säule B2'
      };

      state.loadFromContract(contract);

      const metadata = state.getMetadata();
      expect(metadata.facility.anlage).toBe('Säule B2');
    });

    test('should emit contractLoaded event', (done) => {
      const contract = {
        contractId: 'EVENT-001',
        contractTitle: 'Event Test Contract'
      };

      state.on('contractLoaded', (data) => {
        expect(data.contract.contractId).toBe('EVENT-001');
        done();
      });

      state.loadFromContract(contract);
    });

    test('should emit metadataChanged event', (done) => {
      const contract = {
        contractId: 'META-001',
        contractTitle: 'Metadata Event Test'
      };

      state.on('metadataChanged', (data) => {
        expect(data.metadata.auftragnummer).toBe('META-001');
        done();
      });

      state.loadFromContract(contract);
    });

    test('should reject null contract', () => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      state.loadFromContract(null);
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid contract data:', null);
    });

    test('should reject non-object contract', () => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      state.loadFromContract('string-contract');
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid contract data:', 'string-contract');
    });

    test('should handle empty string values gracefully', () => {
      const contract = {
        contractId: '',
        contractTitle: '',
        location: '',
        equipmentId: ''
      };

      state.loadFromContract(contract);

      const metadata = state.getMetadata();
      expect(metadata.auftragnummer).toBe('');
      expect(metadata.auftraggeber).toBe('');
    });

    test('should preserve existing metadata fields not overwritten by contract', () => {
      // Set some initial metadata
      state.setMetadataField('prüfer.name', 'Max Mustermann');
      state.setMetadataField('auftragnehmer', 'Test Firma GmbH');

      const contract = {
        contractId: 'PRESERVE-001',
        contractTitle: 'Preserve Test'
      };

      state.loadFromContract(contract);

      const metadata = state.getMetadata();
      // Contract data should be loaded
      expect(metadata.auftragnummer).toBe('PRESERVE-001');
      // Pre-existing data should be preserved
      expect(metadata.prüfer.name).toBe('Max Mustermann');
      expect(metadata.auftragnehmer).toBe('Test Firma GmbH');
    });
  });

  // ========== LOAD FROM ASSET ==========
  describe('loadFromAsset()', () => {
    let consoleSpy;

    beforeEach(() => {
      state.init();
    });

    afterEach(() => {
      // Ensure console spy is always restored
      if (consoleSpy) {
        consoleSpy.mockRestore();
        consoleSpy = null;
      }
    });

    test('should load asset data into protokoll metadata', () => {
      const assetData = {
        assetId: 'E03150AP17000093243',
        assetName: 'LVUM-17',
        assetType: 'LVUM',
        location: 'Halle 3',
        plant: 'Werk 1100',
        description: 'Hauptverteiler Fertigung'
      };

      state.loadFromAsset(assetData);

      const metadata = state.getMetadata();
      expect(metadata.linkedAssetId).toBe('E03150AP17000093243');
      expect(metadata.linkedAssetName).toBe('LVUM-17');
      expect(metadata.facility.inv).toBe('E03150AP17000093243');
      expect(metadata.facility.ort).toBe('Halle 3');
      expect(metadata.facility.anlage).toContain('LVUM-17');
      expect(metadata.facility.anlage).toContain('Hauptverteiler Fertigung');
      expect(metadata.firmaOrt).toBe('Werk 1100');
    });

    test('should include asset type in facility description', () => {
      const assetData = {
        assetId: 'TEST-001',
        assetName: 'Test Asset',
        assetType: 'UV'
      };

      state.loadFromAsset(assetData);

      const metadata = state.getMetadata();
      expect(metadata.facility.anlage).toContain('Verteilertyp: UV');
    });

    test('should set current date when loading from asset', () => {
      const assetData = {
        assetId: 'TEST-001',
        assetName: 'Test Asset'
      };

      const beforeLoad = new Date();
      state.loadFromAsset(assetData);
      const afterLoad = new Date();

      const metadata = state.getMetadata();
      const datumDate = new Date(metadata.datum);
      
      expect(datumDate.getTime()).toBeGreaterThanOrEqual(beforeLoad.getTime() - 1000);
      expect(datumDate.getTime()).toBeLessThanOrEqual(afterLoad.getTime() + 1000);
    });

    test('should reset form state to metadata step', () => {
      state.setFormStep('positions');
      
      const assetData = {
        assetId: 'TEST-001',
        assetName: 'Test Asset'
      };

      state.loadFromAsset(assetData);

      expect(state.getCurrentStep()).toBe('metadata');
    });

    test('should mark state as dirty and having unsaved changes', () => {
      state.clearUnsaved();
      
      const assetData = {
        assetId: 'TEST-001',
        assetName: 'Test Asset'
      };

      state.loadFromAsset(assetData);

      expect(state.hasUnsavedChanges()).toBe(true);
      expect(state.isDirty()).toBe(true);
    });

    test('should handle asset with partial data', () => {
      const assetData = {
        assetId: 'PARTIAL-001',
        assetName: 'Partial Asset'
        // Missing: location, plant, description, assetType
      };

      state.loadFromAsset(assetData);

      const metadata = state.getMetadata();
      expect(metadata.linkedAssetId).toBe('PARTIAL-001');
      expect(metadata.linkedAssetName).toBe('Partial Asset');
      expect(metadata.facility.inv).toBe('PARTIAL-001');
    });

    test('should emit assetLoaded event', () => {
      const mockHandler = jest.fn();
      state.on('assetLoaded', mockHandler);

      const assetData = {
        assetId: 'EVENT-001',
        assetName: 'Event Test Asset'
      };

      state.loadFromAsset(assetData);

      expect(mockHandler).toHaveBeenCalledWith({ assetData });
    });

    test('should emit metadataChanged event', () => {
      const mockHandler = jest.fn();
      state.on('metadataChanged', mockHandler);

      const assetData = {
        assetId: 'EVENT-002',
        assetName: 'Metadata Event Asset'
      };

      state.loadFromAsset(assetData);

      expect(mockHandler).toHaveBeenCalled();
      const callArgs = mockHandler.mock.calls[0][0];
      expect(callArgs.metadata).toBeDefined();
      expect(callArgs.metadata.linkedAssetId).toBe('EVENT-002');
    });

    test('should reject null asset data', () => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      state.loadFromAsset(null);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid asset data:', null);
    });

    test('should reject non-object asset data', () => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      state.loadFromAsset('string-asset');

      expect(consoleSpy).toHaveBeenCalledWith('Invalid asset data:', 'string-asset');
    });

    test('should handle empty string values gracefully', () => {
      const assetData = {
        assetId: '',
        assetName: '',
        location: '',
        plant: ''
      };

      // Should not throw
      state.loadFromAsset(assetData);

      const metadata = state.getMetadata();
      expect(metadata.linkedAssetId).toBe('');
      expect(metadata.linkedAssetName).toBe('');
    });
  });
});
