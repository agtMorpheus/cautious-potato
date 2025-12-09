/**
 * protokoll-renderer.test.js
 * Unit tests for the protokoll renderer module
 */

import * as renderer from '../../js/protokoll/protokoll-renderer.js';
import * as state from '../../js/protokoll/protokoll-state.js';

describe('Protokoll Renderer', () => {
  
  beforeEach(() => {
    // Clear localStorage and reset state
    localStorage.clear();
    state.init();
    
    // Set up minimal DOM structure
    document.body.innerHTML = `
      <div id="protokollFormContainer"></div>
      <div id="messageContainer"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ===== INITIALIZATION =====
  describe('init()', () => {
    test('initializes renderer when container exists', () => {
      expect(() => renderer.init()).not.toThrow();
    });

    test('does not throw when container is missing', () => {
      document.body.innerHTML = '';
      expect(() => renderer.init()).not.toThrow();
    });

    test('renders initial form based on current state step', () => {
      state.setFormStep('metadata');
      renderer.init();
      
      const form = document.getElementById('metadataForm');
      expect(form).toBeTruthy();
    });
  });

  // ===== RENDER STEP =====
  describe('renderStep()', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('renders metadata form for metadata step', () => {
      renderer.renderStep('metadata');
      
      const form = document.getElementById('metadataForm');
      expect(form).toBeTruthy();
      expect(form.classList.contains('metadata-form')).toBe(true);
    });

    test('renders positions form for positions step', () => {
      renderer.renderStep('positions');
      
      const form = document.getElementById('positionsForm');
      expect(form).toBeTruthy();
      expect(form.classList.contains('positions-form')).toBe(true);
    });

    test('renders results form for results step', () => {
      renderer.renderStep('results');
      
      const form = document.getElementById('resultsForm');
      expect(form).toBeTruthy();
      expect(form.classList.contains('results-form')).toBe(true);
    });

    test('renders review form for review step', () => {
      renderer.renderStep('review');
      
      const form = document.getElementById('reviewForm');
      expect(form).toBeTruthy();
      expect(form.classList.contains('review-form')).toBe(true);
    });

    test('defaults to metadata form for unknown step', () => {
      renderer.renderStep('unknown');
      
      const form = document.getElementById('metadataForm');
      expect(form).toBeTruthy();
    });
  });

  // ===== METADATA FORM =====
  describe('renderMetadataForm()', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('renders protocol number field', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.protokollNumber"]');
      expect(field).toBeTruthy();
      expect(field.type).toBe('text');
    });

    test('renders date field', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.datum"]');
      expect(field).toBeTruthy();
      expect(field.type).toBe('date');
    });

    test('renders client field with required attribute', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field).toBeTruthy();
      expect(field.hasAttribute('required')).toBe(true);
    });

    test('renders facility name field', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.facility.name"]');
      expect(field).toBeTruthy();
    });

    test('renders network voltage select', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.facility.netzspannung"]');
      expect(field).toBeTruthy();
      expect(field.tagName.toLowerCase()).toBe('select');
    });

    test('renders inspector name field', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.prüfer.name"]');
      expect(field).toBeTruthy();
    });

    test('renders progress indicator', () => {
      renderer.renderMetadataForm();
      
      const progress = document.querySelector('.progress-indicator');
      expect(progress).toBeTruthy();
    });

    test('renders navigation buttons', () => {
      renderer.renderMetadataForm();
      
      const nextButton = document.querySelector('[data-action="next-step"]');
      expect(nextButton).toBeTruthy();
    });

    test('does not render previous button on first step', () => {
      renderer.renderMetadataForm();
      
      const prevButton = document.querySelector('[data-action="previous-step"]');
      expect(prevButton).toBeFalsy();
    });

    test('populates fields with existing state values', () => {
      state.setMetadataField('auftraggeber', 'Test Company');
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field.value).toBe('Test Company');
    });
  });

  // ===== POSITIONS FORM =====
  describe('renderPositionsForm()', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('renders positions table', () => {
      renderer.renderPositionsForm();
      
      const table = document.querySelector('.positions-table');
      expect(table).toBeTruthy();
    });

    test('renders add position button', () => {
      renderer.renderPositionsForm();
      
      const button = document.querySelector('[data-action="add-position"]');
      expect(button).toBeTruthy();
    });

    test('renders empty table when no positions', () => {
      renderer.renderPositionsForm();
      
      const tbody = document.getElementById('positionsTableBody');
      expect(tbody).toBeTruthy();
      expect(tbody.children.length).toBe(0);
    });

    test('renders positions when they exist', () => {
      state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit'
      });
      
      renderer.renderPositionsForm();
      
      const tbody = document.getElementById('positionsTableBody');
      expect(tbody.children.length).toBe(1);
    });

    test('renders previous and next buttons', () => {
      renderer.renderPositionsForm();
      
      const prevButton = document.querySelector('[data-action="previous-step"]');
      const nextButton = document.querySelector('[data-action="next-step"]');
      
      expect(prevButton).toBeTruthy();
      expect(nextButton).toBeTruthy();
    });
  });

  // ===== RESULTS FORM =====
  describe('renderResultsForm()', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('renders defects radio buttons', () => {
      renderer.renderResultsForm();
      
      const radios = document.querySelectorAll('[name="results.mängelFestgestellt"]');
      expect(radios.length).toBe(2);
    });

    test('renders certificate radio buttons', () => {
      renderer.renderResultsForm();
      
      const radios = document.querySelectorAll('[name="results.plakette"]');
      expect(radios.length).toBe(2);
    });

    test('renders next inspection date field', () => {
      renderer.renderResultsForm();
      
      const field = document.querySelector('[data-field="results.nächsterPrüfungstermin"]');
      expect(field).toBeTruthy();
      expect(field.type).toBe('date');
    });

    test('renders remarks textarea', () => {
      renderer.renderResultsForm();
      
      const field = document.querySelector('[data-field="results.bemerkung"]');
      expect(field).toBeTruthy();
      expect(field.tagName.toLowerCase()).toBe('textarea');
    });
  });

  // ===== REVIEW FORM =====
  describe('renderReviewForm()', () => {
    beforeEach(() => {
      renderer.init();
      state.setMetadataField('protokollNumber', 'TEST123');
      state.setMetadataField('auftraggeber', 'Test AG');
      state.setMetadataField('facility.name', 'Test Facility');
    });

    test('renders review section', () => {
      renderer.renderReviewForm();
      
      const reviewSection = document.querySelector('.review-section');
      expect(reviewSection).toBeTruthy();
    });

    test('displays protocol information', () => {
      renderer.renderReviewForm();
      
      const container = document.getElementById('protokollFormContainer');
      expect(container.textContent).toContain('TEST123');
      expect(container.textContent).toContain('Test AG');
    });

    test('renders export buttons', () => {
      renderer.renderReviewForm();
      
      const exportButtons = document.querySelectorAll('[data-action^="export-"]');
      expect(exportButtons.length).toBeGreaterThan(0);
    });

    test('shows position count', () => {
      state.addPosition({ stromkreisNr: 'F1' });
      state.addPosition({ stromkreisNr: 'F2' });
      
      renderer.renderReviewForm();
      
      const container = document.getElementById('protokollFormContainer');
      expect(container.textContent).toContain('(2)');
    });

    test('shows no positions message when empty', () => {
      renderer.renderReviewForm();
      
      const noPositions = document.querySelector('.no-positions');
      expect(noPositions).toBeTruthy();
    });
  });

  // ===== POSITION ROW OPERATIONS =====
  describe('Position Row Operations', () => {
    beforeEach(() => {
      renderer.init();
      renderer.renderPositionsForm();
    });

    test('addPositionRow() adds row to table', () => {
      const position = {
        posNr: 'test-123',
        stromkreisNr: 'F1',
        zielbezeichnung: 'Test Circuit',
        prüfergebnis: { status: 'ok' }
      };
      
      renderer.addPositionRow(position);
      
      const row = document.querySelector('[data-pos-nr="test-123"]');
      expect(row).toBeTruthy();
    });

    test('removePositionRow() removes row from table', () => {
      state.addPosition({ stromkreisNr: 'F1' });
      renderer.renderPositionsForm();
      
      const positions = state.getPositions();
      const posNr = positions[0].posNr;
      
      renderer.removePositionRow(posNr);
      
      const row = document.querySelector(`[data-pos-nr="${posNr}"]`);
      expect(row).toBeFalsy();
    });

    test('updatePositionRow() updates row content', () => {
      const posNr = state.addPosition({
        stromkreisNr: 'F1',
        zielbezeichnung: 'Original'
      });
      
      renderer.renderPositionsForm();
      
      renderer.updatePositionRow(posNr, {
        stromkreisNr: 'F2',
        zielbezeichnung: 'Updated',
        prüfergebnis: { status: 'ok' }
      });
      
      const row = document.querySelector(`[data-pos-nr="${posNr}"]`);
      expect(row.textContent).toContain('F2');
      expect(row.textContent).toContain('Updated');
    });
  });

  // ===== PROGRESS INDICATOR =====
  describe('Progress Indicator', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('renders all four steps', () => {
      renderer.renderMetadataForm();
      
      const steps = document.querySelectorAll('.progress-step');
      expect(steps.length).toBe(4);
    });

    test('marks current step as active', () => {
      renderer.renderMetadataForm();
      
      const activeStep = document.querySelector('.progress-step.active');
      expect(activeStep).toBeTruthy();
      expect(activeStep.getAttribute('data-step')).toBe('metadata');
    });

    test('updateProgressIndicator() updates active step', () => {
      renderer.renderMetadataForm();
      renderer.updateProgressIndicator('positions');
      
      const activeStep = document.querySelector('.progress-step.active');
      expect(activeStep.getAttribute('data-step')).toBe('positions');
    });

    test('marks previous steps as completed', () => {
      renderer.renderPositionsForm();
      
      const metadataStep = document.querySelector('[data-step="metadata"]');
      expect(metadataStep.classList.contains('completed')).toBe(true);
    });
  });

  // ===== ERROR DISPLAY =====
  describe('Error Display', () => {
    beforeEach(() => {
      renderer.init();
      renderer.renderMetadataForm();
    });

    test('displayFieldError() shows error message', () => {
      renderer.displayFieldError('metadata.auftraggeber', 'This field is required');
      
      const errorDiv = document.getElementById('error-metadata-auftraggeber');
      expect(errorDiv.textContent).toBe('This field is required');
      expect(errorDiv.style.display).toBe('block');
    });

    test('displayFieldError() adds error class to field', () => {
      renderer.displayFieldError('metadata.auftraggeber', 'Error');
      
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field.classList.contains('error')).toBe(true);
    });

    test('displayFieldError() sets aria-invalid attribute', () => {
      renderer.displayFieldError('metadata.auftraggeber', 'Error');
      
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field.getAttribute('aria-invalid')).toBe('true');
    });

    test('clearFieldError() hides error message', () => {
      renderer.displayFieldError('metadata.auftraggeber', 'Error');
      renderer.clearFieldError('metadata.auftraggeber');
      
      const errorDiv = document.getElementById('error-metadata-auftraggeber');
      expect(errorDiv.style.display).toBe('none');
    });

    test('clearFieldError() removes error class from field', () => {
      renderer.displayFieldError('metadata.auftraggeber', 'Error');
      renderer.clearFieldError('metadata.auftraggeber');
      
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field.classList.contains('error')).toBe(false);
    });

    test('clearAllFieldErrors() clears all errors', () => {
      renderer.displayFieldError('metadata.auftraggeber', 'Error 1');
      renderer.displayFieldError('metadata.protokollNumber', 'Error 2');
      renderer.clearAllFieldErrors();
      
      const errorDivs = document.querySelectorAll('.field-error');
      errorDivs.forEach(div => {
        expect(div.textContent).toBe('');
      });
    });
  });

  // ===== MESSAGE DISPLAY =====
  describe('Message Display', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('displayMessage() creates message element', () => {
      renderer.displayMessage('success', 'Operation successful');
      
      const message = document.querySelector('.message');
      expect(message).toBeTruthy();
      expect(message.classList.contains('message-success')).toBe(true);
    });

    test('displayMessage() shows message text', () => {
      renderer.displayMessage('info', 'Test message');
      
      const messageText = document.querySelector('.message-text');
      expect(messageText.textContent).toBe('Test message');
    });

    test('displayMessage() creates container if not exists', () => {
      document.getElementById('messageContainer').remove();
      
      renderer.displayMessage('success', 'Test');
      
      const container = document.getElementById('messageContainer');
      expect(container).toBeTruthy();
    });

    test('displayMessage() includes close button', () => {
      renderer.displayMessage('error', 'Test error');
      
      const closeButton = document.querySelector('.message-close');
      expect(closeButton).toBeTruthy();
    });

    test('message close button removes message', () => {
      renderer.displayMessage('info', 'Test');
      
      const closeButton = document.querySelector('.message-close');
      closeButton.click();
      
      const message = document.querySelector('.message');
      expect(message).toBeFalsy();
    });
  });

  // ===== ACCESSIBILITY =====
  describe('Accessibility', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('required fields have aria-required attribute', () => {
      renderer.renderMetadataForm();
      
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field.getAttribute('aria-required')).toBe('true');
    });

    test('progress steps have role and aria attributes', () => {
      renderer.renderMetadataForm();
      
      const step = document.querySelector('.progress-step.active');
      expect(step.getAttribute('aria-current')).toBe('step');
      expect(step.getAttribute('tabindex')).toBe('0');
    });

    test('error messages have role="alert"', () => {
      renderer.renderMetadataForm();
      
      const errorDiv = document.querySelector('.field-error');
      expect(errorDiv.getAttribute('role')).toBe('alert');
    });

    test('tables have proper ARIA labels', () => {
      renderer.renderPositionsForm();
      
      const table = document.querySelector('.positions-table');
      expect(table.getAttribute('aria-label')).toBeTruthy();
    });
  });

  // ===== XSS PREVENTION =====
  describe('XSS Prevention', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('escapes HTML in field values', () => {
      state.setMetadataField('auftraggeber', '<script>alert("xss")</script>');
      renderer.renderMetadataForm();
      
      // The field input element's value attribute is set with escaped HTML
      // When accessed via DOM .value property, browser decodes it back
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      expect(field.value).toBe('<script>alert("xss")</script>');
      
      // But importantly, no script tags should be parsed as actual elements
      const scripts = document.getElementById('protokollFormContainer').querySelectorAll('script');
      expect(scripts.length).toBe(0);
    });

    test('escapes HTML in position display', () => {
      state.addPosition({
        stromkreisNr: '<script>alert("xss")</script>',
        zielbezeichnung: 'Test'
      });
      renderer.renderPositionsForm();
      
      const tbody = document.getElementById('positionsTableBody');
      expect(tbody.innerHTML).not.toContain('<script>');
    });

    test('escapes HTML in review display', () => {
      state.setMetadataField('auftraggeber', '<img src=x onerror=alert(1)>');
      renderer.renderReviewForm();
      
      const container = document.getElementById('protokollFormContainer');
      expect(container.innerHTML).not.toContain('<img');
    });
  });

  // ===== STATE EVENTS =====
  describe('State Event Handling', () => {
    beforeEach(() => {
      renderer.init();
    });

    test('responds to step change event', () => {
      renderer.renderMetadataForm();
      
      document.dispatchEvent(new CustomEvent('protokoll:stepChanged', {
        detail: { step: 'positions' }
      }));
      
      const form = document.getElementById('positionsForm');
      expect(form).toBeTruthy();
    });

    test('responds to validation error event', () => {
      renderer.renderMetadataForm();
      
      document.dispatchEvent(new CustomEvent('protokoll:validationError', {
        detail: { fieldPath: 'metadata.auftraggeber', error: 'Test error' }
      }));
      
      const errorDiv = document.getElementById('error-metadata-auftraggeber');
      expect(errorDiv.textContent).toBe('Test error');
    });

    test('responds to message event', () => {
      document.dispatchEvent(new CustomEvent('protokoll:message', {
        detail: { type: 'success', message: 'Test success' }
      }));
      
      const message = document.querySelector('.message-success');
      expect(message).toBeTruthy();
    });

    test('responds to reset event', () => {
      renderer.renderPositionsForm();
      
      document.dispatchEvent(new CustomEvent('protokoll:reset', {}));
      
      // Should render metadata form after reset
      const form = document.getElementById('metadataForm');
      expect(form).toBeTruthy();
    });
  });

  // ===== FORM FIELD INTERACTIONS =====
  describe('Form Field Interactions', () => {
    beforeEach(() => {
      renderer.init();
      renderer.renderMetadataForm();
    });

    test('change event triggers handler for text field', () => {
      const field = document.querySelector('[data-field="metadata.auftraggeber"]');
      field.value = 'New Company';
      field.dispatchEvent(new Event('change', { bubbles: true }));
      
      // State should be updated through handler
      const value = state.getMetadataField('auftraggeber');
      expect(value).toBe('New Company');
    });

    test('navigation button triggers step change', () => {
      // Set up valid metadata to pass validation
      state.setMetadata({
        protokollNumber: 'EDB123',
        auftraggeber: 'Test AG',
        facility: {
          name: 'Test Facility',
          address: 'Test Street 123',
          netzform: 'TN-S',
          prüfArt: []
        },
        prüfer: { name: 'John Doe' }
      });
      
      renderer.renderMetadataForm();
      const nextButton = document.querySelector('[data-action="next-step"]');
      nextButton.click();
      
      // Should advance to positions step
      expect(state.getCurrentStep()).toBe('positions');
    });
  });
});
