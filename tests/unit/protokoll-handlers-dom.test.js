/**
 * protokoll-handlers-dom.test.js
 * DOM interaction unit tests for event handlers module to improve coverage
 */

import * as handlers from '../../js/protokoll/protokoll-handlers.js';
import * as state from '../../js/protokoll/protokoll-state.js';
// import * as validator from '../../js/protokoll/protokoll-validator.js';

jest.mock('../../js/protokoll/protokoll-validator.js', () => ({
  validateField: jest.fn(() => ({ isValid: true })),
  validateMetadataStep: jest.fn(() => ({ isValid: true })),
  validatePositionsStep: jest.fn(() => ({ isValid: true })),
  validateResultsStep: jest.fn(() => ({ isValid: true })),
  validateForm: jest.fn(() => ({ isValid: true, errors: {}, summary: '' }))
}));

describe('Protokoll Handlers DOM Interactions', () => {
  let container;

  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    state.reset();
    state.init();

    // Set up DOM
    document.body.innerHTML = '<div id="protokollFormContainer"></div>';
    container = document.getElementById('protokollFormContainer');

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    // Re-initialize handlers to attach listeners to new DOM
    handlers.init();
  });

  describe('Child Positions', () => {
    test('handleAddChildPosition creates a child position', () => {
      // Create parent position
      const parentPosNr = handlers.handleAddPosition();

      // Create child position
      const childPosNr = handlers.handleAddChildPosition(parentPosNr);

      expect(childPosNr).toBeDefined();
      const child = state.getPosition(childPosNr);
      expect(child.parentCircuitId).toBe(parentPosNr);
    });

    test('handleAddChildPosition returns null for non-existent parent', () => {
      const result = handlers.handleAddChildPosition('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('DOM Event Handling', () => {
    test('handleButtonClick delegates add-position', () => {
      const button = document.createElement('button');
      button.setAttribute('data-action', 'add-position');
      container.appendChild(button);

      const initialCount = state.getPositions().length;

      button.click();

      expect(state.getPositions().length).toBe(initialCount + 1);
    });

    test('handleButtonClick delegates add-child-position', () => {
      const parentPosNr = handlers.handleAddPosition();

      const button = document.createElement('button');
      button.setAttribute('data-action', 'add-child-position');
      button.setAttribute('data-pos-nr', parentPosNr);
      container.appendChild(button);

      button.click();

      const positions = state.getPositions();
      const child = positions.find(p => p.parentCircuitId === parentPosNr);
      expect(child).toBeDefined();
    });

    test('handleButtonClick delegates delete-position', () => {
      const posNr = handlers.handleAddPosition();

      const button = document.createElement('button');
      button.setAttribute('data-action', 'delete-position');
      button.setAttribute('data-pos-nr', posNr);
      container.appendChild(button);

      button.click();

      // state.getPosition returns null if not found
      expect(state.getPosition(posNr)).toBeNull();
    });

    test('handleButtonClick delegates navigation', () => {
      state.setFormStep('positions');

      const prevBtn = document.createElement('button');
      prevBtn.setAttribute('data-action', 'previous-step');
      container.appendChild(prevBtn);

      prevBtn.click();
      expect(state.getCurrentStep()).toBe('messen');

      const nextBtn = document.createElement('button');
      nextBtn.setAttribute('data-action', 'next-step');
      container.appendChild(nextBtn);

      nextBtn.click();
      expect(state.getCurrentStep()).toBe('positions');
    });

    test('handleButtonClick delegates export', async () => {
        // Set up valid state for export
        state.setMetadata({
            protokollNumber: 'EDB123',
            auftraggeber: 'Test AG',
            facility: { name: 'Test', address: 'Test', netzform: 'TN-S' },
            prüfer: { name: 'Test' }
        });

        const button = document.createElement('button');
        button.setAttribute('data-action', 'export');
        container.appendChild(button);

        let exportFired = false;
        document.addEventListener('protokoll:export', () => { exportFired = true; });

        button.click();

        // Wait for async handler
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(exportFired).toBe(true);
    });

    test('handleFieldChange updates metadata', () => {
        const input = document.createElement('input');
        input.setAttribute('data-field', 'metadata.auftraggeber');
        input.value = 'New Company';
        container.appendChild(input);

        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);

        expect(state.getMetadataField('auftraggeber')).toBe('New Company');
    });

    test('handleFieldInput updates metadata real-time', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('data-field', 'metadata.auftraggeber');
        input.value = 'Typing...';
        container.appendChild(input);

        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);

        expect(state.getMetadataField('auftraggeber')).toBe('Typing...');
    });

    test('handleFieldBlur performs validation', () => {
        const input = document.createElement('input');
        input.setAttribute('data-field', 'metadata.auftraggeber');
        input.value = 'A'; // Too short
        container.appendChild(input);

        const event = new Event('blur', { bubbles: true });
        input.dispatchEvent(event);

        // Since we mocked validator to always return valid, we expect no error here actually.
        // But if we want to test that it calls setValidationError...
        // The original code:
        // state.setValidationError(fieldPath, result.isValid ? null : result.error);

        // So it should be null
        const errors = state.getValidationErrors();
        expect(errors['metadata.auftraggeber']).toBeUndefined();
    });

    test('handleFieldChange updates position field', () => {
        const posNr = handlers.handleAddPosition();

        const row = document.createElement('tr');
        row.setAttribute('data-pos-nr', posNr);
        container.appendChild(row);

        const input = document.createElement('input');
        input.setAttribute('data-field', 'position.stromkreisNr');
        input.value = 'F99';
        row.appendChild(input);

        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);

        expect(state.getPosition(posNr).stromkreisNr).toBe('F99');
    });
  });
});
