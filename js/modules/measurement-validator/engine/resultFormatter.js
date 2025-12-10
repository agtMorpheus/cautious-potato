/**
 * Result Formatter Module
 * Formats validation results for display and reporting
 * 
 * Features:
 * - Human-readable non-conformity messages
 * - Severity-based formatting
 * - Summary generation
 * - Export-ready formatting
 */

/**
 * Format a single non-conformity for display
 * @param {Object} nonConformity - Non-conformity object
 * @returns {Object} Formatted non-conformity
 */
export function formatNonConformity(nonConformity) {
  const formatted = {
    code: nonConformity.code,
    title: nonConformity.name,
    severity: nonConformity.severity,
    severityLabel: getSeverityLabel(nonConformity.severity),
    category: nonConformity.category,
    message: generateMessage(nonConformity),
    details: formatDetails(nonConformity),
    remediation: formatRemediation(nonConformity),
    reference: nonConformity.normReference,
  };
  
  return formatted;
}

/**
 * Get severity label with icon
 * @param {string} severity - Severity code
 * @returns {Object} Severity label and styling info
 */
export function getSeverityLabel(severity) {
  const labels = {
    CRITICAL: {
      label: 'Critical',
      icon: '✗',
      color: '#cc0000',
      className: 'severity-critical'
    },
    WARNING: {
      label: 'Warning',
      icon: '⚠',
      color: '#ff9900',
      className: 'severity-warning'
    },
    INFO: {
      label: 'Info',
      icon: 'ℹ',
      color: '#0066cc',
      className: 'severity-info'
    }
  };
  
  return labels[severity] || labels.INFO;
}

/**
 * Generate human-readable message for non-conformity
 * @param {Object} nonConformity - Non-conformity object
 * @returns {string} Human-readable message
 */
export function generateMessage(nonConformity) {
  const { code, actual, limit, unit } = nonConformity;
  
  const messageTemplates = {
    CABLE_UNDERSIZED_AMPACITY: 
      `Cable capacity (${limit}${unit}) is insufficient for circuit current (${actual}${unit}). ` +
      `The cable is operating at ${nonConformity.calculationDetails?.percentUsed || '>100'}% capacity.`,
    
    VOLTAGE_DROP_EXCESSIVE:
      `Voltage drop of ${actual}% exceeds the maximum allowed ${limit}% for this circuit type. ` +
      `Absolute voltage drop: ${nonConformity.calculationDetails?.voltageDropAbsolute || 'N/A'}V.`,
    
    PROTECTION_DEVICE_UNDERSIZED:
      `Protection device rated ${limit}${unit} is insufficient for circuit current of ${actual}${unit}. ` +
      `Next standard size: ${nonConformity.calculationDetails?.nextStandardSize || 'N/A'}A.`,
    
    IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE:
      `Loop impedance of ${actual}${unit} exceeds maximum ${limit}${unit}. ` +
      `Fault current ${nonConformity.calculationDetails?.faultCurrent || 'N/A'}A may be insufficient for protection trip.`,
    
    VOLTAGE_OUT_OF_RANGE:
      `Circuit voltage ${actual}${unit} is not a standard industrial voltage. ` +
      `Valid voltages: ${limit}. Nearest valid: ${nonConformity.calculationDetails?.nearestValidVoltage || 'N/A'}V.`,
    
    CABLE_VOLTAGE_RATING_EXCEEDED:
      `Circuit voltage ${actual}${unit} exceeds cable rating of ${limit}${unit}. ` +
      `Cable type ${nonConformity.calculationDetails?.cableType || 'N/A'} is rated for ${nonConformity.calculationDetails?.cableRating || 'N/A'}.`,
    
    COORDINATION_NOT_SELECTIVE:
      `Protection device coordination is ${actual}. ` +
      (nonConformity.calculationDetails?.reason || 'Selectivity cannot be guaranteed.'),
    
    VALIDATION_ERROR:
      `Validation error: ${nonConformity.message || 'Unknown error'}`,
  };
  
  return messageTemplates[code] || nonConformity.description || 'Non-conformity detected.';
}

/**
 * Format calculation details for display
 * @param {Object} nonConformity - Non-conformity object
 * @returns {Object} Formatted details
 */
export function formatDetails(nonConformity) {
  const details = nonConformity.calculationDetails || {};
  const formatted = {};
  
  // Add relevant details based on non-conformity type
  if (details.percentUsed !== undefined) {
    formatted.capacityUsed = `${details.percentUsed}%`;
  }
  
  if (details.margin !== undefined) {
    formatted.margin = `${details.margin} ${nonConformity.unit || ''}`;
  }
  
  if (details.faultCurrent !== undefined) {
    formatted.faultCurrent = `${details.faultCurrent} ${details.faultCurrentUnit || 'A'}`;
  }
  
  if (details.trippingMargin !== undefined) {
    formatted.trippingMargin = `${details.trippingMargin}%`;
  }
  
  if (details.ampacityDetails) {
    formatted.ampacityBreakdown = {
      base: `${details.ampacityDetails.baseAmpacity}A`,
      tempDerating: details.ampacityDetails.tempDerating,
      groupingDerating: details.ampacityDetails.groupingDerating,
      final: `${details.ampacityDetails.deratedAmpacity}A`
    };
  }
  
  return formatted;
}

/**
 * Format remediation options for display
 * @param {Object} nonConformity - Non-conformity object
 * @returns {Object} Formatted remediation
 */
export function formatRemediation(nonConformity) {
  const options = nonConformity.remedyOptions || [];
  
  return {
    options: options.map((option, index) => ({
      number: index + 1,
      description: option
    })),
    count: options.length,
    primary: options[0] || 'Consult with qualified electrical engineer.'
  };
}

/**
 * Format validation results summary
 * @param {Object} results - Validation results object
 * @returns {Object} Formatted summary
 */
export function formatResultsSummary(results) {
  const criticalCount = results.nonConformities?.filter(
    nc => nc.severity === 'CRITICAL'
  ).length || 0;
  
  const warningCount = results.nonConformities?.filter(
    nc => nc.severity === 'WARNING'
  ).length || 0;
  
  const infoCount = results.nonConformities?.filter(
    nc => nc.severity === 'INFO'
  ).length || 0;
  
  let status;
  let statusIcon;
  let statusClass;
  
  if (criticalCount > 0) {
    status = 'Non-Compliant';
    statusIcon = '✗';
    statusClass = 'status-critical';
  } else if (warningCount > 0) {
    status = 'Compliant with Warnings';
    statusIcon = '⚠';
    statusClass = 'status-warning';
  } else {
    status = 'Compliant';
    statusIcon = '✓';
    statusClass = 'status-valid';
  }
  
  return {
    circuitId: results.circuitId,
    circuitName: results.circuitName,
    timestamp: results.timestamp,
    status,
    statusIcon,
    statusClass,
    isValid: results.isValid,
    hasWarnings: results.hasWarnings,
    counts: {
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
      total: (criticalCount + warningCount + infoCount)
    },
    rulesChecked: results.summary?.rulesExecuted || 0,
    rulesApplicable: results.summary?.rulesApplicable || 0,
    performance: results.performance,
  };
}

/**
 * Format batch validation results
 * @param {Object} batchResults - Batch validation results
 * @returns {Object} Formatted batch summary
 */
export function formatBatchSummary(batchResults) {
  const validPercentage = batchResults.totalCircuits > 0
    ? ((batchResults.validCircuits / batchResults.totalCircuits) * 100).toFixed(1)
    : 0;
  
  let overallStatus;
  if (batchResults.criticalIssues > 0) {
    overallStatus = 'Critical Issues Found';
  } else if (batchResults.warnings > 0) {
    overallStatus = 'Warnings Present';
  } else {
    overallStatus = 'All Circuits Compliant';
  }
  
  return {
    timestamp: batchResults.timestamp,
    totalCircuits: batchResults.totalCircuits,
    validCircuits: batchResults.validCircuits,
    validPercentage: `${validPercentage}%`,
    circuitsWithIssues: batchResults.circuitsWithIssues,
    criticalIssues: batchResults.criticalIssues,
    warnings: batchResults.warnings,
    overallStatus,
    performance: batchResults.performance,
  };
}

/**
 * Format results for export (CSV/Excel)
 * @param {Object} results - Validation results
 * @returns {Object[]} Array of export-ready rows
 */
export function formatForExport(results) {
  const rows = [];
  
  // Add header row
  rows.push({
    circuitId: 'Circuit ID',
    circuitName: 'Circuit Name',
    issueCode: 'Issue Code',
    issueName: 'Issue Name',
    severity: 'Severity',
    category: 'Category',
    actual: 'Actual Value',
    limit: 'Limit',
    unit: 'Unit',
    message: 'Message',
    remedy: 'Primary Remedy',
    reference: 'Standard Reference'
  });
  
  // Add data rows
  if (results.nonConformities && results.nonConformities.length > 0) {
    for (const nc of results.nonConformities) {
      rows.push({
        circuitId: results.circuitId || '',
        circuitName: results.circuitName || '',
        issueCode: nc.code,
        issueName: nc.name,
        severity: nc.severity,
        category: nc.category,
        actual: String(nc.actual || ''),
        limit: String(nc.limit || ''),
        unit: nc.unit || '',
        message: generateMessage(nc),
        remedy: (nc.remedyOptions && nc.remedyOptions[0]) || '',
        reference: nc.normReference || ''
      });
    }
  } else {
    // Add "no issues" row
    rows.push({
      circuitId: results.circuitId || '',
      circuitName: results.circuitName || '',
      issueCode: '-',
      issueName: 'No Issues',
      severity: '-',
      category: '-',
      actual: '-',
      limit: '-',
      unit: '-',
      message: 'Circuit is compliant with all checked rules.',
      remedy: '-',
      reference: '-'
    });
  }
  
  return rows;
}

/**
 * Generate HTML for non-conformity display
 * @param {Object} nonConformity - Non-conformity object
 * @returns {string} HTML string
 */
export function generateNonConformityHTML(nonConformity) {
  const formatted = formatNonConformity(nonConformity);
  const severityLabel = formatted.severityLabel;
  
  return `
    <div class="non-conformity ${severityLabel.className}">
      <div class="nc-header">
        <span class="nc-icon">${severityLabel.icon}</span>
        <span class="nc-title">${formatted.title}</span>
        <span class="nc-severity">${severityLabel.label}</span>
      </div>
      <div class="nc-body">
        <p class="nc-message">${formatted.message}</p>
        <div class="nc-details">
          <span class="nc-category">Category: ${formatted.category}</span>
          <span class="nc-reference">Ref: ${formatted.reference}</span>
        </div>
        <div class="nc-remedy">
          <strong>Recommended Action:</strong> ${formatted.remediation.primary}
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Generate status badge HTML
 * @param {Object} summary - Formatted summary object
 * @returns {string} HTML string
 */
export function generateStatusBadgeHTML(summary) {
  return `
    <span class="status-badge ${summary.statusClass}">
      <span class="status-icon">${summary.statusIcon}</span>
      <span class="status-text">${summary.status}</span>
    </span>
  `.trim();
}
