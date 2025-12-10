/**
 * Circuits Table UI Handler
 * Integrates the measurement validator with the UI layer
 * 
 * Provides:
 * - Real-time validation on input changes
 * - Status badge and issue display updates
 * - Field highlighting for non-conformities
 * - Modal integration for issue details
 */

import { ValidationEngine } from './engine/validationEngine.js';
import { CableLibrary } from './libraries/cableLibrary.js';
import { ProtectionLibrary } from './libraries/protectionLibrary.js';
import { StandardsData } from './libraries/standardsData.js';
import { 
  formatNonConformity, 
  formatResultsSummary,
  generateNonConformityHTML,
  getSeverityLabel
} from './engine/resultFormatter.js';

// Initialize validation engine with libraries
const cableLib = new CableLibrary();
const protLib = new ProtectionLibrary();
const standardsData = new StandardsData();
const validationEngine = new ValidationEngine(cableLib, protLib, standardsData);

// Debouncer for validation
let validationDebounceTimer = null;
const DEBOUNCE_DELAY = 150; // ms

/**
 * Mapping of non-conformity codes to affected fields
 */
const FIELD_ISSUE_MAP = {
  'CABLE_UNDERSIZED_AMPACITY': ['cableGauge', 'current'],
  'VOLTAGE_DROP_EXCESSIVE': ['distance', 'cableGauge'],
  'PROTECTION_DEVICE_UNDERSIZED': ['protectionCurrent', 'current'],
  'IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE': ['distance', 'cableGauge', 'loopImpedance'],
  'VOLTAGE_OUT_OF_RANGE': ['voltage'],
  'CABLE_VOLTAGE_RATING_EXCEEDED': ['cableType', 'voltage'],
  'COORDINATION_NOT_SELECTIVE': ['upstreamDeviceType', 'downstreamDeviceType'],
};

/**
 * Parse input value based on type
 * @param {string} type - Input type
 * @param {string} value - Input value
 * @returns {*} Parsed value
 */
function parseInputValue(type, value) {
  if (type === 'number') {
    return value === '' ? null : Number(value);
  }
  return value;
}

/**
 * Validate a single circuit and update UI
 * @param {string} circuitId - Circuit ID
 * @param {Object} circuitData - Circuit data
 * @returns {Object} Validation results
 */
export function validateAndUpdateUI(circuitId, circuitData) {
  const results = validationEngine.validateCircuit(circuitData, { useCache: false });
  
  // Find circuit row
  const circuitRow = document.querySelector(`[data-circuit-id="${circuitId}"]`);
  if (!circuitRow) {
    console.warn(`Circuit row not found for ID: ${circuitId}`);
    return results;
  }
  
  // Update status badge
  updateStatusBadge(circuitRow, results);
  
  // Update issue display
  updateIssueStack(circuitRow, results.nonConformities);
  
  // Highlight problematic fields
  highlightProblematicFields(circuitRow, results.nonConformities);
  
  // Update row styling
  updateRowStyling(circuitRow, results);
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('validationComplete', {
    detail: { circuitId, results }
  }));
  
  return results;
}

/**
 * Schedule validation with debouncing
 * @param {string} circuitId - Circuit ID
 * @param {Object} circuitData - Circuit data
 */
export function scheduleValidation(circuitId, circuitData) {
  if (validationDebounceTimer) {
    clearTimeout(validationDebounceTimer);
  }
  
  // Show loading state
  const circuitRow = document.querySelector(`[data-circuit-id="${circuitId}"]`);
  if (circuitRow) {
    showValidationInProgress(circuitRow);
  }
  
  validationDebounceTimer = setTimeout(() => {
    validateAndUpdateUI(circuitId, circuitData);
  }, DEBOUNCE_DELAY);
}

/**
 * Update status badge based on validation results
 * @param {HTMLElement} circuitRow - Circuit row element
 * @param {Object} results - Validation results
 */
function updateStatusBadge(circuitRow, results) {
  const badgeEl = circuitRow.querySelector('.validation-status-badge');
  if (!badgeEl) return;
  
  // Count issues by severity
  const criticalCount = results.nonConformities.filter(
    nc => nc.severity === 'CRITICAL'
  ).length;
  const warningCount = results.nonConformities.filter(
    nc => nc.severity === 'WARNING'
  ).length;
  
  // Reset classes
  badgeEl.className = 'validation-status-badge';
  
  if (results.nonConformities.length === 0) {
    badgeEl.classList.add('status-valid');
    badgeEl.innerHTML = '<span class="status-icon">✓</span> Valid';
  } else if (criticalCount > 0) {
    badgeEl.classList.add('status-critical');
    badgeEl.innerHTML = `<span class="status-icon">✗</span> ${criticalCount} Critical`;
  } else if (warningCount > 0) {
    badgeEl.classList.add('status-warning');
    badgeEl.innerHTML = `<span class="status-icon">⚠</span> ${warningCount} Warning${warningCount > 1 ? 's' : ''}`;
  } else {
    badgeEl.classList.add('status-valid');
    badgeEl.innerHTML = '<span class="status-icon">ℹ</span> Info';
  }
}

/**
 * Update issue stack display
 * @param {HTMLElement} circuitRow - Circuit row element
 * @param {Object[]} nonConformities - Array of non-conformities
 */
function updateIssueStack(circuitRow, nonConformities) {
  const issueStack = circuitRow.querySelector('.issue-stack');
  if (!issueStack) return;
  
  issueStack.innerHTML = '';
  
  if (nonConformities.length === 0) {
    return;
  }
  
  // Group by severity (critical first)
  const sortedIssues = [...nonConformities].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Display up to 3 issues, then show count
  const maxDisplay = 3;
  const displayIssues = sortedIssues.slice(0, maxDisplay);
  const remainingCount = sortedIssues.length - maxDisplay;
  
  displayIssues.forEach(issue => {
    const badge = createIssueBadge(issue);
    issueStack.appendChild(badge);
  });
  
  if (remainingCount > 0) {
    const moreBadge = document.createElement('div');
    moreBadge.className = 'issue-badge severity-info';
    moreBadge.textContent = `+${remainingCount} more`;
    moreBadge.addEventListener('click', () => {
      showAllIssues(nonConformities);
    });
    issueStack.appendChild(moreBadge);
  }
}

/**
 * Create issue badge element
 * @param {Object} issue - Non-conformity object
 * @returns {HTMLElement} Badge element
 */
function createIssueBadge(issue) {
  const badge = document.createElement('div');
  badge.className = `issue-badge severity-${issue.severity.toLowerCase()}`;
  
  // Abbreviated display
  const codeShort = issue.code.split('_')[0];
  badge.innerHTML = `<span class="issue-code">${codeShort}</span>`;
  badge.title = issue.name;
  
  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'issue-tooltip';
  tooltip.textContent = issue.name;
  badge.appendChild(tooltip);
  
  // Click handler for detail view
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    showIssueDetail(issue);
  });
  
  return badge;
}

/**
 * Highlight fields with validation issues
 * @param {HTMLElement} circuitRow - Circuit row element
 * @param {Object[]} nonConformities - Array of non-conformities
 */
function highlightProblematicFields(circuitRow, nonConformities) {
  // Clear previous highlighting
  circuitRow.querySelectorAll('[data-validation-state]').forEach(el => {
    el.removeAttribute('data-validation-state');
  });
  
  // Apply highlighting based on issues
  nonConformities.forEach(issue => {
    const affectedFields = FIELD_ISSUE_MAP[issue.code] || [];
    const state = issue.severity === 'CRITICAL' ? 'error' : 'warning';
    
    affectedFields.forEach(fieldName => {
      const input = circuitRow.querySelector(`[data-field="${fieldName}"]`);
      if (input) {
        // Only upgrade severity (don't downgrade error to warning)
        const currentState = input.getAttribute('data-validation-state');
        if (!currentState || (currentState === 'warning' && state === 'error')) {
          input.setAttribute('data-validation-state', state);
        }
      }
    });
  });
}

/**
 * Update row styling based on validation status
 * @param {HTMLElement} circuitRow - Circuit row element
 * @param {Object} results - Validation results
 */
function updateRowStyling(circuitRow, results) {
  // Remove existing status classes
  circuitRow.classList.remove('circuit-row--valid', 'circuit-row--warning', 'circuit-row--critical');
  
  const criticalCount = results.nonConformities.filter(
    nc => nc.severity === 'CRITICAL'
  ).length;
  const warningCount = results.nonConformities.filter(
    nc => nc.severity === 'WARNING'
  ).length;
  
  if (criticalCount > 0) {
    circuitRow.classList.add('circuit-row--critical');
  } else if (warningCount > 0) {
    circuitRow.classList.add('circuit-row--warning');
  } else {
    circuitRow.classList.add('circuit-row--valid');
  }
}

/**
 * Show loading indicator during validation
 * @param {HTMLElement} circuitRow - Circuit row element
 */
function showValidationInProgress(circuitRow) {
  const badgeEl = circuitRow.querySelector('.validation-status-badge');
  if (badgeEl) {
    badgeEl.className = 'validation-status-badge status-pending';
    badgeEl.innerHTML = '<span class="spinner"></span> Validating...';
  }
}

/**
 * Show issue detail in modal
 * @param {Object} nonConformity - Non-conformity object
 */
export function showIssueDetail(nonConformity) {
  const modal = document.getElementById('issue-detail-modal') || createIssueDetailModal();
  const content = modal.querySelector('.issue-detail-body');
  
  const formatted = formatNonConformity(nonConformity);
  const severityInfo = getSeverityLabel(nonConformity.severity);
  
  content.innerHTML = `
    <div class="issue-section">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
        <span class="validation-status-badge status-${nonConformity.severity.toLowerCase()}">
          ${severityInfo.icon} ${severityInfo.label}
        </span>
        <span class="issue-reference">${nonConformity.normReference}</span>
      </div>
    </div>
    
    <div class="issue-section">
      <h5>Description</h5>
      <p>${nonConformity.description}</p>
    </div>
    
    <div class="issue-section">
      <h5>Measurement</h5>
      <div class="issue-comparison">
        <div class="issue-metric">
          <span class="label">Actual Value</span>
          <span class="value actual">${nonConformity.actual} ${nonConformity.unit || ''}</span>
        </div>
        <div class="issue-metric">
          <span class="label">Limit</span>
          <span class="value limit">${nonConformity.limit} ${nonConformity.unit || ''}</span>
        </div>
      </div>
    </div>
    
    <div class="issue-section">
      <h5>Recommended Actions</h5>
      <ul class="issue-remedy-list">
        ${(nonConformity.remedyOptions || []).map(remedy => 
          `<li>${remedy}</li>`
        ).join('')}
      </ul>
    </div>
    
    ${nonConformity.calculationDetails ? `
    <div class="issue-section">
      <h5>Technical Details</h5>
      <pre style="font-size: 12px; background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); overflow-x: auto;">${JSON.stringify(nonConformity.calculationDetails, null, 2)}</pre>
    </div>
    ` : ''}
  `;
  
  // Update modal title
  const titleEl = modal.querySelector('.issue-detail-header h3');
  if (titleEl) {
    titleEl.textContent = nonConformity.name;
  }
  
  const codeEl = modal.querySelector('.issue-code');
  if (codeEl) {
    codeEl.textContent = nonConformity.code;
  }
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Show all issues in modal
 * @param {Object[]} nonConformities - Array of non-conformities
 */
function showAllIssues(nonConformities) {
  const modal = document.getElementById('issue-detail-modal') || createIssueDetailModal();
  const content = modal.querySelector('.issue-detail-body');
  
  content.innerHTML = `
    <div class="issue-section">
      <h5>All Issues (${nonConformities.length})</h5>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${nonConformities.map(nc => `
          <div class="nc-summary-card ${nc.severity.toLowerCase()}" 
               style="cursor: pointer;" 
               data-issue-code="${nc.code}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="nc-title">${nc.name}</span>
              <span class="validation-status-badge status-${nc.severity.toLowerCase()}" style="font-size: 10px;">
                ${nc.severity}
              </span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              ${nc.actual} ${nc.unit || ''} vs ${nc.limit} ${nc.unit || ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Add click handlers to each issue card
  content.querySelectorAll('[data-issue-code]').forEach(card => {
    card.addEventListener('click', () => {
      const code = card.dataset.issueCode;
      const issue = nonConformities.find(nc => nc.code === code);
      if (issue) {
        showIssueDetail(issue);
      }
    });
  });
  
  // Update modal title
  const titleEl = modal.querySelector('.issue-detail-header h3');
  if (titleEl) {
    titleEl.textContent = 'All Non-Conformities';
  }
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Create issue detail modal if it doesn't exist
 * @returns {HTMLElement} Modal element
 */
function createIssueDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'issue-detail-modal';
  modal.className = 'issue-detail-modal';
  
  modal.innerHTML = `
    <div class="issue-detail-content">
      <div class="issue-detail-header">
        <div>
          <h3>Issue Details</h3>
          <div class="issue-code"></div>
        </div>
        <button class="issue-detail-close" aria-label="Close">&times;</button>
      </div>
      <div class="issue-detail-body"></div>
    </div>
  `;
  
  // Close button handler
  modal.querySelector('.issue-detail-close').addEventListener('click', () => {
    closeIssueDetailModal();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeIssueDetailModal();
    }
  });
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeIssueDetailModal();
    }
  });
  
  document.body.appendChild(modal);
  return modal;
}

/**
 * Close issue detail modal
 */
export function closeIssueDetailModal() {
  const modal = document.getElementById('issue-detail-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Handle circuit field change event
 * @param {Event} event - Change event
 * @param {Function} getCircuitData - Function to get current circuit data
 */
export function handleCircuitFieldChange(event, getCircuitData) {
  const input = event.target;
  const circuitRow = input.closest('[data-circuit-id]');
  if (!circuitRow) return;
  
  const circuitId = circuitRow.dataset.circuitId;
  const fieldName = input.dataset.field;
  const newValue = parseInputValue(input.type, input.value);
  
  // Validate individual input
  const inputValidation = validationEngine.validateInputValue(fieldName, newValue);
  if (!inputValidation.valid) {
    input.setAttribute('data-validation-state', 'error');
    showInputError(input, inputValidation.error);
    return;
  }
  
  // Clear input error
  input.removeAttribute('data-validation-state');
  clearInputError(input);
  
  // Get updated circuit data
  const circuitData = getCircuitData(circuitId);
  if (!circuitData) return;
  
  circuitData[fieldName] = newValue;
  
  // Schedule validation
  scheduleValidation(circuitId, circuitData);
}

/**
 * Show input error tooltip
 * @param {HTMLElement} input - Input element
 * @param {string} message - Error message
 */
function showInputError(input, message) {
  // Remove existing error
  clearInputError(input);
  
  const tooltip = document.createElement('div');
  tooltip.className = 'input-error-tooltip';
  tooltip.textContent = message;
  tooltip.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    padding: 6px 10px;
    background: var(--c-danger);
    color: white;
    font-size: 11px;
    border-radius: var(--radius-sm);
    z-index: 100;
    white-space: nowrap;
  `;
  
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(tooltip);
}

/**
 * Clear input error tooltip
 * @param {HTMLElement} input - Input element
 */
function clearInputError(input) {
  const existing = input.parentElement.querySelector('.input-error-tooltip');
  if (existing) {
    existing.remove();
  }
}

/**
 * Update validation summary panel
 * @param {Object} batchResults - Batch validation results (optional)
 */
export function updateValidationSummary(batchResults = null) {
  const totalEl = document.getElementById('total-circuits');
  const validEl = document.getElementById('valid-circuits');
  const issuesEl = document.getElementById('circuits-with-issues');
  const criticalEl = document.getElementById('critical-issues');
  
  if (batchResults) {
    if (totalEl) totalEl.textContent = batchResults.totalCircuits;
    if (validEl) validEl.textContent = batchResults.validCircuits;
    if (issuesEl) issuesEl.textContent = batchResults.circuitsWithIssues;
    if (criticalEl) criticalEl.textContent = batchResults.criticalIssues;
  }
}

/**
 * Validate all circuits and update UI
 * @param {Object[]} circuits - Array of circuit data
 * @returns {Object} Batch validation results
 */
export function validateAllCircuits(circuits) {
  const results = validationEngine.validateAllCircuits(circuits);
  
  // Update each circuit row
  results.circuitResults.forEach((circuitResult, index) => {
    const circuitId = circuits[index]?.id || `circuit-${index}`;
    const circuitRow = document.querySelector(`[data-circuit-id="${circuitId}"]`);
    if (circuitRow) {
      updateStatusBadge(circuitRow, circuitResult);
      updateIssueStack(circuitRow, circuitResult.nonConformities);
      highlightProblematicFields(circuitRow, circuitResult.nonConformities);
      updateRowStyling(circuitRow, circuitResult);
    }
  });
  
  // Update summary
  updateValidationSummary(results);
  
  return results;
}

/**
 * Register validation event handlers
 */
export function registerValidationHandlers(getCircuitData) {
  // Delegate circuit input changes
  document.addEventListener('change', (event) => {
    if (event.target.matches('.circuits-table [data-field]')) {
      handleCircuitFieldChange(event, getCircuitData);
    }
  });
  
  // Also handle input events for real-time feedback
  document.addEventListener('input', (event) => {
    if (event.target.matches('.circuits-table input[data-field]')) {
      // Clear error state on typing
      const input = event.target;
      const validation = validationEngine.validateInputValue(
        input.dataset.field,
        parseInputValue(input.type, input.value)
      );
      
      if (validation.valid) {
        input.removeAttribute('data-validation-state');
        clearInputError(input);
      }
    }
  });
}

/**
 * Get validation engine metrics
 * @returns {Object} Engine metrics
 */
export function getValidationMetrics() {
  return validationEngine.getMetrics();
}

/**
 * Reset validation engine cache and metrics
 */
export function resetValidation() {
  validationEngine.clearCache();
  validationEngine.resetMetrics();
}

// Export singleton engine for direct access if needed
export { validationEngine };
