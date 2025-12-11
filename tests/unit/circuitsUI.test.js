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

  beforeEach(() => {
    // Access the exported singleton instance which is now a mock
    mockValidationEngine = ui.validationEngine;

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

    // DOM Setup
    container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tr data-circuit-id="c1">
          <td class="validation-status-badge"></td>
          <td class="issue-stack"></td>
          <td><input data-field="current" value="10"></td>
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
  });

  describe('validateAndUpdateUI', () => {
    test('updates UI for valid circuit', () => {
      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: true,
        nonConformities: []
      });

      ui.validateAndUpdateUI('c1', {});

      const badge = container.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-valid')).toBe(true);
      expect(badge.textContent).toContain('Valid');
    });

    test('updates UI for circuit with issues', () => {
      mockValidationEngine.validateCircuit.mockReturnValue({
        isValid: false,
        nonConformities: [{
          code: 'ERR',
          name: 'Error',
          severity: 'CRITICAL',
          category: 'Cat'
        }]
      });

      ui.validateAndUpdateUI('c1', {});

      const badge = container.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-critical')).toBe(true);

      const stack = container.querySelector('.issue-stack');
      expect(stack.children.length).toBe(1);
    });
  });

  describe('scheduleValidation', () => {
    test('debounces validation', () => {
      jest.useFakeTimers();

      ui.scheduleValidation('c1', {});
      ui.scheduleValidation('c1', {});
      ui.scheduleValidation('c1', {});

      jest.runAllTimers();

      expect(mockValidationEngine.validateCircuit).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('showIssueDetail', () => {
    test('creates and shows modal', () => {
      const nc = {
        code: 'ERR',
        name: 'Error',
        severity: 'CRITICAL',
        category: 'Cat',
        normReference: 'Ref'
      };

      ui.showIssueDetail(nc);

      const modal = document.getElementById('issue-detail-modal');
      expect(modal).not.toBeNull();
      expect(modal.classList.contains('active')).toBe(true);
      expect(modal.innerHTML).toContain('Error');
    });

    test('closes modal', () => {
      const nc = { code: 'ERR', name: 'Error', severity: 'CRITICAL' };
      ui.showIssueDetail(nc);

      ui.closeIssueDetailModal();

      const modal = document.getElementById('issue-detail-modal');
      expect(modal.classList.contains('active')).toBe(false);
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
  });

  describe('validateAllCircuits', () => {
    test('validates all and updates summary', () => {
      mockValidationEngine.validateAllCircuits.mockReturnValue({
        circuitResults: [
          { isValid: true, nonConformities: [] }
        ],
        totalCircuits: 1,
        validCircuits: 1
      });

      ui.validateAllCircuits([{ id: 'c1' }]);

      expect(mockValidationEngine.validateAllCircuits).toHaveBeenCalled();
      const badge = container.querySelector('.validation-status-badge');
      expect(badge.classList.contains('status-valid')).toBe(true);
    });
  });

  describe('handleCircuitFieldChange', () => {
    test('validates field input', () => {
      const input = container.querySelector('input');
      input.type = 'number'; // Set type to number for parsing
      const event = { target: input };
      const getCircuitData = jest.fn().mockReturnValue({});

      mockValidationEngine.validateInputValue.mockReturnValue({ valid: true });

      ui.handleCircuitFieldChange(event, getCircuitData);

      expect(mockValidationEngine.validateInputValue).toHaveBeenCalledWith('current', 10);
      expect(input.hasAttribute('data-validation-state')).toBe(false);
    });

    test('shows error on invalid input', () => {
      const input = container.querySelector('input');
      const event = { target: input };
      const getCircuitData = jest.fn();

      mockValidationEngine.validateInputValue.mockReturnValue({
        valid: false,
        error: 'Invalid'
      });

      ui.handleCircuitFieldChange(event, getCircuitData);

      expect(input.getAttribute('data-validation-state')).toBe('error');
    });
  });
});
