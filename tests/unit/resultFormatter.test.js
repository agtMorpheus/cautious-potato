/**
 * Unit Tests for Result Formatter (resultFormatter.js)
 */

import {
  formatNonConformity,
  getSeverityLabel,
  generateMessage,
  formatDetails,
  formatRemediation,
  formatResultsSummary,
  formatBatchSummary,
  formatForExport,
  generateNonConformityHTML,
  generateStatusBadgeHTML
} from '../../js/modules/measurement-validator/engine/resultFormatter.js';

describe('Result Formatter', () => {

  describe('getSeverityLabel', () => {
    test('returns correct label for CRITICAL', () => {
      const label = getSeverityLabel('CRITICAL');
      expect(label.label).toBe('Critical');
      expect(label.className).toBe('severity-critical');
    });

    test('returns correct label for WARNING', () => {
      const label = getSeverityLabel('WARNING');
      expect(label.label).toBe('Warning');
    });

    test('returns default INFO for unknown severity', () => {
      const label = getSeverityLabel('UNKNOWN');
      expect(label.label).toBe('Info');
    });
  });

  describe('generateMessage', () => {
    test('generates message for known code', () => {
      const nc = {
        code: 'CABLE_UNDERSIZED_AMPACITY',
        limit: 100,
        actual: 120,
        unit: 'A',
        calculationDetails: { percentUsed: 120 }
      };
      const msg = generateMessage(nc);
      expect(msg).toContain('Cable capacity (100A) is insufficient');
      expect(msg).toContain('120%');
    });

    test('uses description if code unknown', () => {
      const nc = {
        code: 'UNKNOWN_CODE',
        description: 'Custom description'
      };
      const msg = generateMessage(nc);
      expect(msg).toBe('Custom description');
    });
  });

  describe('formatDetails', () => {
    test('formats details correctly', () => {
      const nc = {
        unit: 'V',
        calculationDetails: {
          percentUsed: 80,
          margin: 10,
          faultCurrent: 500
        }
      };
      const details = formatDetails(nc);
      expect(details.capacityUsed).toBe('80%');
      expect(details.margin).toBe('10 V');
      expect(details.faultCurrent).toBe('500 A');
    });
  });

  describe('formatResultsSummary', () => {
    test('formats valid result', () => {
      const results = {
        circuitId: 'C1',
        isValid: true,
        hasWarnings: false,
        nonConformities: []
      };
      const summary = formatResultsSummary(results);
      expect(summary.status).toBe('Compliant');
      expect(summary.statusClass).toBe('status-valid');
      expect(summary.counts.total).toBe(0);
    });

    test('formats result with critical issues', () => {
      const results = {
        circuitId: 'C1',
        isValid: false,
        hasWarnings: false,
        nonConformities: [{ severity: 'CRITICAL' }]
      };
      const summary = formatResultsSummary(results);
      expect(summary.status).toBe('Non-Compliant');
      expect(summary.statusClass).toBe('status-critical');
      expect(summary.counts.critical).toBe(1);
    });

    test('formats result with warnings', () => {
      const results = {
        circuitId: 'C1',
        isValid: true,
        hasWarnings: true,
        nonConformities: [{ severity: 'WARNING' }]
      };
      const summary = formatResultsSummary(results);
      expect(summary.status).toBe('Compliant with Warnings');
      expect(summary.statusClass).toBe('status-warning');
      expect(summary.counts.warning).toBe(1);
    });
  });

  describe('formatBatchSummary', () => {
    test('formats batch summary', () => {
      const results = {
        totalCircuits: 10,
        validCircuits: 8,
        criticalIssues: 1,
        warnings: 1,
        timestamp: '2023-01-01'
      };
      const summary = formatBatchSummary(results);
      expect(summary.validPercentage).toBe('80.0%');
      expect(summary.overallStatus).toBe('Critical Issues Found');
    });
  });

  describe('formatForExport', () => {
    test('formats non-conformities for export', () => {
      const results = {
        circuitId: 'C1',
        nonConformities: [{
          code: 'ERR1',
          name: 'Error 1',
          severity: 'CRITICAL',
          category: 'Safety',
          actual: 10,
          limit: 5,
          unit: 'A'
        }]
      };
      const rows = formatForExport(results);
      expect(rows.length).toBe(2); // Header + 1 row
      expect(rows[1].circuitId).toBe('C1');
      expect(rows[1].issueCode).toBe('ERR1');
    });
  });

  describe('HTML Generators', () => {
    test('generateNonConformityHTML', () => {
      const nc = {
        code: 'ERR1',
        name: 'Error 1',
        severity: 'CRITICAL',
        description: 'Desc',
        category: 'Cat',
        normReference: 'Ref',
        remedyOptions: ['Fix it']
      };
      const html = generateNonConformityHTML(nc);
      expect(html).toContain('severity-critical');
      expect(html).toContain('Error 1');
      expect(html).toContain('Fix it');
    });

    test('generateStatusBadgeHTML', () => {
      const summary = {
        status: 'Compliant',
        statusClass: 'status-valid',
        statusIcon: '✓'
      };
      const html = generateStatusBadgeHTML(summary);
      expect(html).toContain('status-valid');
      expect(html).toContain('Compliant');
    });
  });
});
