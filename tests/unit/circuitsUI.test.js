/**
 * Unit Tests for Circuits UI (circuitsUI.js)
 */

import { jest } from '@jest/globals';

jest.mock('../../js/modules/measurement-validator/engine/validationEngine.js', () => {
  return {
    ValidationEngine: jest.fn().mockImplementation(() => ({
      validateCircuit: jest.fn(),
      validateInputValue: jest.fn(),
      validateAllCircuits: jest.fn(),
      getMetrics: jest.fn(),
      clearCache: jest.fn(),
      resetMetrics: jest.fn()
    }))
  };
});
jest.mock('../../js/modules/measurement-validator/libraries/cableLibrary.js');
jest.mock('../../js/modules/measurement-validator/libraries/protectionLibrary.js');
jest.mock('../../js/modules/measurement-validator/libraries/standardsData.js');
jest.mock('../../js/modules/measurement-validator/engine/resultFormatter.js');

import * as ui from '../../js/modules/measurement-validator/circuitsUI.js';
import * as resultFormatter from '../../js/modules/measurement-validator/engine/resultFormatter.js';

describe('Circuits UI', () => {
  let mockValidationEngine;
  let container;
  let getCircuitDataMock;

  beforeEach(() => {
    // Access the exported singleton instance which is now a mock
    mockValidationEngine = ui.validationEngine;

    // Mock the dispatchEvent to prevent actual events but allow spying
    jest.spyOn(window, 'dispatchEvent');

    // Reset mock methods
    jest.clearAllMocks();

    // Set up default mocks
    mockValidationEngine.validateCircuit.mockReturnValue({
      isValid: true,
      nonConformities: []
    });

    mockValidationEngine.validateInputValue.mockReturnValue({
      valid: true
    });

    mockValidationEngine.validateAllCircuits.mockReturnValue({
      circuitResults: [],
      totalCircuits: 0,
      validCircuits: 0,
      circuitsWithIssues: 0,
      criticalIssues: 0
    });

    resultFormatter.getSeverityLabel.mockImplementation(s => ({
      label: s,
      className: `severity-${s.toLowerCase()}`,
      icon: 'x'
    }));

    resultFormatter.formatNonConformity.mockImplementation(nc => ({
      ...nc,
      title: nc.name,
      severityLabel: { label: nc.severity, className: 'c', icon: 'x' },
      message: 'Msg',
      remediation: { primary: 'Fix', options: ['Fix'] }
    }));

    resultFormatter.generateNonConformityHTML.mockReturnValue('<div>Detailed HTML</div>');

    getCircuitDataMock = jest.fn().mockReturnValue({});

    // DOM Setup
    container = document.createElement('div');
    container.className = 'circuits-table'; // Critical for event delegation
    container.innerHTML = `
      <table>
        <tr data-circuit-id="c1" class="circuit-row">
          <td class="validation-status-badge"></td>
          <td class="issue-stack"></td>
          <td><input data-field="current" value="10" type="number"></td>
          <td><input data-field="cableGauge" value="1.5"></td>
          <td><input data-field="distance" value="20"></td>
        </tr>
      </table>
      <div id="total-circuits"></div>
      <div id="valid-circuits"></div>
      <div id="circuits-with-issues"></div>
      <div id="critical-issues"></div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('validateAndUpdateUI', () => {
    test('updates UI for valid circuit', () => {
      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: true,
        nonConformities: []
      });

      ui.validateAndUpdateUI('c1', {});

      const row = container.querySelector('[data-circuit-id="c1"]');
      const badge = row.querySelector('.validation-status-badge');

      expect(badge.classList.contains('status-valid')).toBe(true);
      expect(badge.innerHTML).toContain('Valid');
      expect(row.classList.contains('circuit-row--valid')).toBe(true);

      expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
    });

    test('handles missing circuit row gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      ui.validateAndUpdateUI('non-existent-id', {});
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('updates UI for circuit with CRITICAL issues', () => {
      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: false,
        nonConformities: [{
          code: 'CABLE_UNDERSIZED_AMPACITY',
          name: 'Cable Undersized',
          severity: 'CRITICAL',
          category: 'Safety',
          actual: '10A',
          limit: '16A'
        }]
      });

      ui.validateAndUpdateUI('c1', {});

      const row = container.querySelector('[data-circuit-id="c1"]');
      const badge = row.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-critical')).toBe(true);
      expect(badge.innerHTML).toContain('Critical');
      expect(row.classList.contains('circuit-row--critical')).toBe(true);

      const stack = row.querySelector('.issue-stack');
      expect(stack.children.length).toBe(1);

      // Check field highlighting
      const currentInput = row.querySelector('[data-field="current"]');
      const cableInput = row.querySelector('[data-field="cableGauge"]');

      expect(currentInput.getAttribute('data-validation-state')).toBe('error');
      expect(cableInput.getAttribute('data-validation-state')).toBe('error');
    });

    test('updates UI for circuit with WARNING issues', () => {
      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: false,
        nonConformities: [{
          code: 'VOLTAGE_DROP_EXCESSIVE',
          name: 'Voltage Drop',
          severity: 'WARNING',
          category: 'Performance',
          actual: '4%',
          limit: '3%'
        }]
      });

      ui.validateAndUpdateUI('c1', {});

      const row = container.querySelector('[data-circuit-id="c1"]');
      const badge = row.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-warning')).toBe(true);
      expect(badge.innerHTML).toContain('Warning');
      expect(row.classList.contains('circuit-row--warning')).toBe(true);
    });

    test('updates UI for circuit with multiple issues (Critical + Warning)', () => {
      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: false,
        nonConformities: [
          {
            code: 'CABLE_UNDERSIZED_AMPACITY',
            name: 'Cable Undersized',
            severity: 'CRITICAL',
            actual: '10A',
            limit: '16A'
          },
          {
            code: 'VOLTAGE_DROP_EXCESSIVE',
            name: 'Voltage Drop',
            severity: 'WARNING',
            actual: '4%',
            limit: '3%'
          }
        ]
      });

      ui.validateAndUpdateUI('c1', {});

      const row = container.querySelector('[data-circuit-id="c1"]');
      // Should show critical status overall
      const badge = row.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-critical')).toBe(true);
      expect(row.classList.contains('circuit-row--critical')).toBe(true);

      // Should sort issues: Critical first
      const stack = row.querySelector('.issue-stack');
      const badges = stack.querySelectorAll('.issue-badge');
      expect(badges[0].className).toContain('severity-critical');
      expect(badges[1].className).toContain('severity-warning');
    });

    test('updates UI for circuit with INFO issues', () => {
        mockValidationEngine.validateCircuit.mockReturnValue({
          isValid: true,
          nonConformities: [{
            code: 'INFO_CODE',
            name: 'Just info',
            severity: 'INFO',
            category: 'Info',
            actual: 'X',
            limit: 'Y'
          }]
        });

        ui.validateAndUpdateUI('c1', {});

        const row = container.querySelector('[data-circuit-id="c1"]');
        const badge = row.querySelector('.validation-status-badge');
        expect(badge.classList.contains('status-valid')).toBe(true);
        expect(badge.innerHTML).toContain('Info');
    });

    test('truncates issue stack when more than 3 issues', () => {
      const issues = Array(5).fill(null).map((_, i) => ({
        code: `ERR_${i}`,
        name: `Error ${i}`,
        severity: 'WARNING',
        actual: 'X',
        limit: 'Y'
      }));

      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: false,
        nonConformities: issues
      });

      ui.validateAndUpdateUI('c1', {});

      const stack = container.querySelector('.issue-stack');
      // Should have 3 badges + 1 "more" badge
      expect(stack.children.length).toBe(4);
      expect(stack.lastElementChild.textContent).toContain('+2 more');
    });

    test('opens all issues modal when clicking "more" badge', () => {
        const issues = Array(5).fill(null).map((_, i) => ({
          code: `ERR_${i}`,
          name: `Error ${i}`,
          severity: 'WARNING',
          actual: 'X',
          limit: 'Y'
        }));

        mockValidationEngine.validateCircuit.mockReturnValue({
          isValid: false,
          nonConformities: issues
        });

        ui.validateAndUpdateUI('c1', {});

        const stack = container.querySelector('.issue-stack');
        const moreBadge = stack.lastElementChild;

        moreBadge.click();

        const modal = document.getElementById('issue-detail-modal');
        expect(modal).not.toBeNull();
        expect(modal.classList.contains('active')).toBe(true);
        expect(modal.querySelector('h3').textContent).toBe('All Non-Conformities');
        expect(modal.querySelectorAll('.nc-summary-card').length).toBe(5);

        // Test clicking an item in the list
        const firstCard = modal.querySelector('.nc-summary-card');
        firstCard.click();
        expect(modal.querySelector('h3').textContent).not.toBe('All Non-Conformities'); // Should show detail
    });

    test('opens detail modal when clicking issue badge', () => {
        mockValidationEngine.validateCircuit.mockReturnValue({
          isValid: false,
          nonConformities: [{
            code: 'ERR',
            name: 'Error',
            severity: 'CRITICAL',
            actual: 'X',
            limit: 'Y'
          }]
        });

        ui.validateAndUpdateUI('c1', {});

        const stack = container.querySelector('.issue-stack');
        const badge = stack.firstElementChild;

        const stopPropagation = jest.fn();
        // Use dispatchEvent to pass event mock
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'stopPropagation', { value: stopPropagation });
        badge.dispatchEvent(clickEvent);

        expect(stopPropagation).toHaveBeenCalled();
        const modal = document.getElementById('issue-detail-modal');
        expect(modal.classList.contains('active')).toBe(true);
    });
  });

  describe('highlightProblematicFields', () => {
      test('prioritizes critical issues over warning issues on same field', () => {
          const input = container.querySelector('[data-field="current"]');

          // We need two issues that affect the same field ("current")
          // CABLE_UNDERSIZED_AMPACITY -> ['cableGauge', 'current']
          // PROTECTION_DEVICE_UNDERSIZED -> ['protectionCurrent', 'current']

          mockValidationEngine.validateCircuit.mockReturnValue({
             isValid: false,
             nonConformities: [
               {
                 code: 'CABLE_UNDERSIZED_AMPACITY',
                 severity: 'CRITICAL'
               },
               {
                 code: 'PROTECTION_DEVICE_UNDERSIZED',
                 severity: 'WARNING'
               }
             ]
          });

          ui.validateAndUpdateUI('c1', {});

          // Should be error (critical), not warning
          expect(input.getAttribute('data-validation-state')).toBe('error');
      });
  });

  describe('scheduleValidation', () => {
    test('debounces validation and shows loading state', () => {
      jest.useFakeTimers();

      ui.scheduleValidation('c1', {});

      // Check loading state
      const row = container.querySelector('[data-circuit-id="c1"]');
      const badge = row.querySelector('.validation-status-badge');
      expect(badge.innerHTML).toContain('Validating');

      ui.scheduleValidation('c1', {});
      ui.scheduleValidation('c1', {});

      jest.runAllTimers();

      expect(mockValidationEngine.validateCircuit).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('showIssueDetail', () => {
    test('creates and shows modal with content', () => {
      const nc = {
        code: 'ERR',
        name: 'Error Name',
        severity: 'CRITICAL',
        category: 'Cat',
        normReference: 'Ref',
        description: 'Desc',
        actual: '10',
        limit: '5',
        unit: 'A',
        remedyOptions: ['Fix 1', 'Fix 2'],
        calculationDetails: { foo: 'bar' }
      };

      ui.showIssueDetail(nc);

      const modal = document.getElementById('issue-detail-modal');
      expect(modal).not.toBeNull();
      expect(modal.classList.contains('active')).toBe(true);
      expect(modal.innerHTML).toContain('Error Name');
      expect(modal.innerHTML).toContain('Ref');
      expect(modal.innerHTML).toContain('Fix 1');
      expect(modal.innerHTML).toContain('Technical Details'); // because calculationDetails present
    });

    test('closes modal via close button', () => {
      const nc = { code: 'ERR', name: 'Error', severity: 'CRITICAL' };
      ui.showIssueDetail(nc);

      const modal = document.getElementById('issue-detail-modal');
      const closeBtn = modal.querySelector('.issue-detail-close');
      closeBtn.click();

      expect(modal.classList.contains('active')).toBe(false);
    });

    test('closes modal via click outside', () => {
        const nc = { code: 'ERR', name: 'Error', severity: 'CRITICAL' };
        ui.showIssueDetail(nc);

        const modal = document.getElementById('issue-detail-modal');
        modal.click(); // Click on modal background

        expect(modal.classList.contains('active')).toBe(false);
    });

    test('closes modal via Escape key', () => {
        const nc = { code: 'ERR', name: 'Error', severity: 'CRITICAL' };
        ui.showIssueDetail(nc);

        const modal = document.getElementById('issue-detail-modal');

        const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escEvent);

        expect(modal.classList.contains('active')).toBe(false);
    });

    test('reuses existing modal', () => {
        const nc = { code: 'ERR', name: 'Error', severity: 'CRITICAL' };
        ui.showIssueDetail(nc);
        const modal1 = document.getElementById('issue-detail-modal');

        ui.closeIssueDetailModal();
        ui.showIssueDetail(nc);
        const modal2 = document.getElementById('issue-detail-modal');

        expect(modal1).toBe(modal2);
    });
  });

  describe('updateValidationSummary', () => {
    test('updates summary elements', () => {
      const results = {
        totalCircuits: 10,
        validCircuits: 8,
        circuitsWithIssues: 2,
        criticalIssues: 1
      };

      ui.updateValidationSummary(results);

      expect(document.getElementById('total-circuits').textContent).toBe('10');
      expect(document.getElementById('valid-circuits').textContent).toBe('8');
      expect(document.getElementById('critical-issues').textContent).toBe('1');
    });

    test('handles missing summary elements', () => {
        document.getElementById('total-circuits').remove();
        ui.updateValidationSummary({});
        // Should not throw
    });
  });

  describe('validateAllCircuits', () => {
    test('validates all and updates summary', () => {
      mockValidationEngine.validateAllCircuits.mockReturnValue({
        circuitResults: [
          { isValid: true, nonConformities: [] }
        ],
        totalCircuits: 1,
        validCircuits: 1,
        circuitsWithIssues: 0,
        criticalIssues: 0
      });

      ui.validateAllCircuits([{ id: 'c1' }]);

      expect(mockValidationEngine.validateAllCircuits).toHaveBeenCalled();
      const row = container.querySelector('[data-circuit-id="c1"]');
      const badge = row.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-valid')).toBe(true);
    });

    test('handles circuits without corresponding DOM rows', () => {
        mockValidationEngine.validateAllCircuits.mockReturnValue({
            circuitResults: [
              { isValid: true, nonConformities: [] }
            ],
            totalCircuits: 1
        });

        // c2 does not exist in DOM
        ui.validateAllCircuits([{ id: 'c2' }]);
        // Should not throw
    });
  });

  describe('handleCircuitFieldChange', () => {
    test('validates field input and updates state', () => {
      const input = container.querySelector('input[data-field="current"]');
      // Set type is number in HTML setup

      const event = { target: input };

      mockValidationEngine.validateInputValue.mockReturnValue({ valid: true });

      jest.useFakeTimers();
      ui.handleCircuitFieldChange(event, getCircuitDataMock);

      expect(mockValidationEngine.validateInputValue).toHaveBeenCalledWith('current', 10);
      expect(input.hasAttribute('data-validation-state')).toBe(false);

      // Should schedule validation
      jest.runAllTimers();
      expect(mockValidationEngine.validateCircuit).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('shows error on invalid input and does not schedule validation', () => {
      const input = container.querySelector('input[data-field="current"]');
      const event = { target: input };

      mockValidationEngine.validateInputValue.mockReturnValue({
        valid: false,
        error: 'Invalid Value'
      });

      jest.useFakeTimers();
      ui.handleCircuitFieldChange(event, getCircuitDataMock);

      expect(input.getAttribute('data-validation-state')).toBe('error');

      // Check for error tooltip (implementation detail, but good to check)
      const tooltip = input.parentElement.querySelector('.input-error-tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip.textContent).toBe('Invalid Value');

      // Should NOT schedule validation if input is invalid
      jest.runAllTimers();
      expect(mockValidationEngine.validateCircuit).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('clears input error on valid input', () => {
        const input = container.querySelector('input[data-field="current"]');
        const event = { target: input };

        // First set error
        mockValidationEngine.validateInputValue.mockReturnValue({ valid: false, error: 'Err' });
        ui.handleCircuitFieldChange(event, getCircuitDataMock);
        expect(input.parentElement.querySelector('.input-error-tooltip')).not.toBeNull();

        // Then set valid
        mockValidationEngine.validateInputValue.mockReturnValue({ valid: true });
        ui.handleCircuitFieldChange(event, getCircuitDataMock);

        expect(input.parentElement.querySelector('.input-error-tooltip')).toBeNull();
    });

    test('ignores events from elements outside circuit row', () => {
        const outsideInput = document.createElement('input');
        outsideInput.dataset.field = 'test';
        container.appendChild(outsideInput);

        const event = { target: outsideInput };
        ui.handleCircuitFieldChange(event, getCircuitDataMock);

        expect(mockValidationEngine.validateInputValue).not.toHaveBeenCalled();
    });
  });

  describe('registerValidationHandlers', () => {
      test('sets up event listeners', () => {
          const addEL = jest.spyOn(document, 'addEventListener');
          ui.registerValidationHandlers(getCircuitDataMock);

          expect(addEL).toHaveBeenCalledWith('change', expect.any(Function));
          expect(addEL).toHaveBeenCalledWith('input', expect.any(Function));
      });
  });

  describe('Public API', () => {
      test('getValidationMetrics delegates to engine', () => {
          ui.getValidationMetrics();
          expect(mockValidationEngine.getMetrics).toHaveBeenCalled();
      });

      test('resetValidation delegates to engine', () => {
          ui.resetValidation();
          expect(mockValidationEngine.clearCache).toHaveBeenCalled();
          expect(mockValidationEngine.resetMetrics).toHaveBeenCalled();
      });
  });
});
