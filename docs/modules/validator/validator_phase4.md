# Circuit Measurement Validator - Phase 4: UI Integration & Production Deployment
## Real-Time Error Indicators, User Workflow, and Deployment Strategy

**Last Updated:** December 10, 2025  
**Scope:** UI/UX integration, real-time feedback, production deployment, monitoring  
**Target:** Seamless user experience with immediate validation feedback

---

## Table of Contents
1. [UI Integration Overview](#ui-integration-overview)
2. [HTML Structure for Circuits Table](#html-structure-for-circuits-table)
3. [Real-Time Error Indicators](#real-time-error-indicators)
4. [Event Handler Implementation](#event-handler-implementation)
5. [User Workflow & Interaction](#user-workflow--interaction)
6. [Error Display Components](#error-display-components)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Observability](#monitoring--observability)
9. [Implementation Checklist](#implementation-checklist)

---

## UI Integration Overview

### Architecture: State → Validation → UI

```
User Input in Table Cell
    ↓
Input Handler (handlers.js)
    ↓
State Update (state.js)
    ↓
Validation Trigger (validationEngine.js)
    ↓
Non-Conformity Detection
    ↓
State Update: validationState
    ↓
UI Update: Error Indicator + Tooltip
    ↓
User sees non-conformity in real-time
```

### Component Integration

```javascript
// Integration flow in main.js or handlers.js

import { state } from './state.js';
import { ValidationEngine } from './measurement-validator/engine/validationEngine.js';
import { CableLibrary } from './measurement-validator/libraries/cableLibrary.js';
import { ProtectionLibrary } from './measurement-validator/libraries/protectionLibrary.js';

// Initialize validator
const cableLib = new CableLibrary();
const protLib = new ProtectionLibrary();
const validationEngine = new ValidationEngine(cableLib, protLib, standardsData);

// Register event listener for circuit input changes
window.addEventListener('circuitInputChanged', (event) => {
  const { circuitId, fieldName, newValue } = event.detail;
  
  // Validate and update UI
  validateAndUpdateUI(circuitId, fieldName, newValue);
});
```

---

## HTML Structure for Circuits Table

### Complete Circuits Table Markup

```html
<!-- File: index.html - Circuits Management Section -->

<section id="circuits-section" class="circuits-container">
  <div class="circuits-header">
    <h2>Electrical Circuits - Measurement & Validation</h2>
    <p class="subtitle">DIN VDE 0100 Industrial Standard Compliance</p>
  </div>
  
  <!-- Control Bar -->
  <div class="circuits-controls">
    <button id="add-circuit" class="btn btn--primary">
      + Add Circuit
    </button>
    <button id="validate-all" class="btn btn--secondary">
      Validate All
    </button>
    <button id="export-report" class="btn btn--secondary">
      Export Compliance Report
    </button>
    
    <!-- Validation Summary -->
    <div class="validation-summary">
      <div class="summary-stat">
        <span class="stat-label">Total Circuits:</span>
        <span class="stat-value" id="total-circuits">0</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Valid:</span>
        <span class="stat-value valid" id="valid-circuits">0</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Issues:</span>
        <span class="stat-value warning" id="circuits-with-issues">0</span>
      </div>
      <div class="summary-stat">
        <span class="stat-label">Critical:</span>
        <span class="stat-value critical" id="critical-issues">0</span>
      </div>
    </div>
  </div>
  
  <!-- Circuits Table -->
  <div class="table-wrapper">
    <table id="circuits-table" class="circuits-table">
      <thead>
        <tr>
          <th class="col-select">
            <input type="checkbox" id="select-all-circuits">
          </th>
          <th class="col-name">Circuit Name</th>
          <th class="col-voltage">Voltage (V)</th>
          <th class="col-current">Current (A)</th>
          <th class="col-cable">Cable Type</th>
          <th class="col-gauge">Gauge (mm²)</th>
          <th class="col-distance">Distance (m)</th>
          <th class="col-protection">Protection Device</th>
          <th class="col-status">Status</th>
          <th class="col-issues">Non-Conformities</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      
      <tbody id="circuits-tbody">
        <!-- Circuit rows dynamically inserted here -->
      </tbody>
    </table>
  </div>
  
  <!-- Empty State -->
  <div id="empty-state" class="empty-state">
    <p>No circuits defined yet.</p>
    <p>Click "Add Circuit" to start entering circuit data.</p>
  </div>
</section>

<!-- Detail Modal for Circuit Editing -->
<div id="circuit-modal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="modal-title">Add New Circuit</h3>
      <button class="modal-close">&times;</button>
    </div>
    
    <form id="circuit-form" class="circuit-form">
      <!-- Basic Information -->
      <fieldset>
        <legend>Basic Information</legend>
        
        <div class="form-group">
          <label for="circuit-name">Circuit Name</label>
          <input 
            type="text" 
            id="circuit-name" 
            name="name" 
            placeholder="e.g., Pump Motor 5.5kW"
            required
          >
          <small>Descriptive name for identification</small>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="circuit-voltage">Voltage (V)</label>
            <select id="circuit-voltage" name="voltage" required>
              <option value="">Select voltage</option>
              <option value="230">230V (Single-phase)</option>
              <option value="400">400V (Three-phase)</option>
              <option value="690">690V (Industrial High)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-frequency">Frequency (Hz)</label>
            <select id="circuit-frequency" name="frequency" required>
              <option value="50">50 Hz (Standard)</option>
              <option value="60">60 Hz (North America)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-phases">Phases</label>
            <select id="circuit-phases" name="phasesCount" required>
              <option value="1">Single-phase (1~)</option>
              <option value="3">Three-phase (3~)</option>
            </select>
          </div>
        </div>
      </fieldset>
      
      <!-- Load Parameters -->
      <fieldset>
        <legend>Load Parameters</legend>
        
        <div class="form-row">
          <div class="form-group">
            <label for="circuit-current">
              Circuit Current (A)
              <span class="required-icon">*</span>
            </label>
            <input 
              type="number" 
              id="circuit-current" 
              name="current" 
              min="0.1" 
              max="6300"
              step="0.1"
              placeholder="12.5"
              required
            >
            <small>Design current (Ib) in amperes</small>
          </div>
          
          <div class="form-group">
            <label for="circuit-load-type">Load Type</label>
            <select id="circuit-load-type" name="loadType" required>
              <option value="general">General Circuit</option>
              <option value="motor">Motor</option>
              <option value="lighting">Lighting</option>
              <option value="heater">Heater/Resistive</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-power-factor">
              Power Factor (cos φ)
              <span class="hint">(Motors only)</span>
            </label>
            <input 
              type="number" 
              id="circuit-power-factor" 
              name="powerFactor" 
              min="0.5" 
              max="1.0" 
              step="0.05"
              value="0.85"
            >
          </div>
        </div>
      </fieldset>
      
      <!-- Cable Parameters -->
      <fieldset>
        <legend>Cable Parameters</legend>
        
        <div class="form-row">
          <div class="form-group">
            <label for="circuit-cable-type">Cable Type</label>
            <select id="circuit-cable-type" name="cableType" required>
              <option value="">Select cable type</option>
              <option value="NYY">NYY (DIN VDE 0296) - Insulated</option>
              <option value="NYM">NYM (DIN VDE 0250) - Single</option>
              <option value="NYCY">NYCY (DIN VDE 0276) - Shielded</option>
              <option value="NAYY">NAYY (DIN VDE 0295) - Armored</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-gauge">
              Wire Gauge (mm²)
              <span class="required-icon">*</span>
            </label>
            <select id="circuit-gauge" name="cableGauge" required>
              <option value="">Select gauge</option>
              <option value="1.5">1.5 mm²</option>
              <option value="2.5">2.5 mm²</option>
              <option value="4">4 mm²</option>
              <option value="6">6 mm²</option>
              <option value="10">10 mm²</option>
              <option value="16">16 mm²</option>
              <option value="25">25 mm²</option>
              <option value="35">35 mm²</option>
              <option value="50">50 mm²</option>
              <option value="70">70 mm²</option>
              <option value="95">95 mm²</option>
              <option value="120">120 mm²</option>
              <option value="150">150 mm²</option>
              <option value="185">185 mm²</option>
              <option value="240">240 mm²</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-distance">Cable Length (m)</label>
            <input 
              type="number" 
              id="circuit-distance" 
              name="distance" 
              min="1" 
              max="1000"
              step="1"
              placeholder="45"
            >
            <small>One-way distance in meters</small>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="circuit-installation-method">Installation Method</label>
            <select id="circuit-installation-method" name="installationMethod" required>
              <option value="method_3">Method 3 - In conduit/cable tray (fixed)</option>
              <option value="method_4">Method 4 - On surface</option>
              <option value="method_7">Method 7 - Buried in ground</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-ambient-temp">Ambient Temperature (°C)</label>
            <input 
              type="number" 
              id="circuit-ambient-temp" 
              name="ambientTemp" 
              min="-20" 
              max="70"
              value="30"
            >
            <small>Reference 30°C (typical)</small>
          </div>
        </div>
      </fieldset>
      
      <!-- Protection Device -->
      <fieldset>
        <legend>Protection Device</legend>
        
        <div class="form-row">
          <div class="form-group">
            <label for="circuit-protection-type">Device Type</label>
            <select id="circuit-protection-type" name="protectionDeviceType" required>
              <option value="">Select device type</option>
              <optgroup label="MCB (Miniature Circuit Breaker)">
                <option value="MCB-B-10">MCB Type B - 10A</option>
                <option value="MCB-B-16">MCB Type B - 16A</option>
                <option value="MCB-C-16">MCB Type C - 16A</option>
                <option value="MCB-C-20">MCB Type C - 20A</option>
                <option value="MCB-C-32">MCB Type C - 32A</option>
                <option value="MCB-C-63">MCB Type C - 63A</option>
                <option value="MCB-D-40">MCB Type D - 40A</option>
                <option value="MCB-D-63">MCB Type D - 63A</option>
              </optgroup>
              <optgroup label="RCD (Residual Current Device)">
                <option value="RCD-AC-30">RCD Type AC - 30mA</option>
                <option value="RCD-A-30">RCD Type A - 30mA</option>
              </optgroup>
              <optgroup label="RCBO (Combined)">
                <option value="RCBO-C-16-30">RCBO Type C 16A / 30mA RCD</option>
              </optgroup>
            </select>
          </div>
          
          <div class="form-group">
            <label for="circuit-protection-current">Protection Current (A)</label>
            <input 
              type="number" 
              id="circuit-protection-current" 
              name="protectionCurrent" 
              min="6" 
              max="100"
              required
            >
            <small>Rated current of device</small>
          </div>
        </div>
      </fieldset>
      
      <!-- Advanced Parameters -->
      <fieldset>
        <legend>Advanced Parameters (Optional)</legend>
        
        <div class="form-group">
          <label for="circuit-loop-impedance">
            Loop Impedance (Ω)
            <span class="hint">Calculated from source and cable impedance</span>
          </label>
          <input 
            type="number" 
            id="circuit-loop-impedance" 
            name="loopImpedance" 
            min="0" 
            step="0.01"
            placeholder="0.25"
          >
        </div>
      </fieldset>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="submit" class="btn btn--primary">
          Save Circuit
        </button>
        <button type="button" class="btn btn--secondary" id="cancel-circuit">
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Non-Conformity Detail Modal -->
<div id="issue-detail-modal" class="modal hidden">
  <div class="modal-content modal-content--large">
    <div class="modal-header">
      <h3>Non-Conformity Details</h3>
      <button class="modal-close">&times;</button>
    </div>
    
    <div id="issue-detail-content" class="issue-detail-content">
      <!-- Populated dynamically -->
    </div>
  </div>
</div>

<style>
/* ==================== CIRCUITS CONTAINER ==================== */
.circuits-container {
  padding: 24px;
  background: var(--color-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.circuits-header {
  margin-bottom: 24px;
}

.circuits-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--color-text);
}

.circuits-header .subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ==================== CONTROLS ==================== */
.circuits-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.circuits-controls > button {
  flex-shrink: 0;
}

.validation-summary {
  display: flex;
  gap: 32px;
  margin-left: auto;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  margin-top: 4px;
}

.stat-value.valid {
  color: var(--color-success);
}

.stat-value.warning {
  color: var(--color-warning);
}

.stat-value.critical {
  color: var(--color-error);
}

/* ==================== TABLE ==================== */
.table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.circuits-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.circuits-table thead {
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-border);
}

.circuits-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.circuits-table tbody tr {
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.circuits-table tbody tr:hover {
  background: var(--color-surface);
}

.circuits-table td {
  padding: 12px 16px;
  color: var(--color-text);
}

/* Column widths */
.col-select { width: 40px; }
.col-name { width: 150px; }
.col-voltage { width: 80px; }
.col-current { width: 80px; }
.col-cable { width: 100px; }
.col-gauge { width: 90px; }
.col-distance { width: 90px; }
.col-protection { width: 120px; }
.col-status { width: 100px; }
.col-issues { width: 150px; }
.col-actions { width: 90px; }

/* ==================== STATUS INDICATORS ==================== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.status-badge.valid {
  background: rgba(var(--color-success-rgb), 0.1);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.status-badge.warning {
  background: rgba(var(--color-warning-rgb), 0.1);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.status-badge.critical {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

/* ==================== EMPTY STATE ==================== */
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin: 8px 0;
  font-size: 14px;
}
</style>
```

---

## Real-Time Error Indicators

### Error Indicator Component

```html
<!-- Dynamic row template for circuits table -->
<template id="circuit-row-template">
  <tr class="circuit-row" data-circuit-id="">
    <td class="col-select">
      <input type="checkbox" class="circuit-checkbox">
    </td>
    <td class="col-name">
      <span class="circuit-name-display"></span>
    </td>
    <td class="col-voltage">
      <input 
        type="number" 
        class="circuit-voltage" 
        min="100" 
        max="1000"
        data-field="voltage"
      >
    </td>
    <td class="col-current">
      <input 
        type="number" 
        class="circuit-current" 
        min="0.1" 
        max="6300"
        data-field="current"
      >
    </td>
    <td class="col-cable">
      <select class="circuit-cable-type" data-field="cableType">
        <option value="NYY">NYY</option>
        <option value="NYM">NYM</option>
        <option value="NYCY">NYCY</option>
        <option value="NAYY">NAYY</option>
      </select>
    </td>
    <td class="col-gauge">
      <select class="circuit-gauge" data-field="cableGauge">
        <option value="1.5">1.5</option>
        <option value="2.5">2.5</option>
        <option value="4">4</option>
        <!-- ... more options ... -->
      </select>
      <span class="validation-indicator" title="Gauge validation status"></span>
    </td>
    <td class="col-distance">
      <input 
        type="number" 
        class="circuit-distance" 
        min="1" 
        max="1000"
        data-field="distance"
      >
    </td>
    <td class="col-protection">
      <select class="circuit-protection-type" data-field="protectionDeviceType">
        <option value="MCB-B-16">MCB-B-16</option>
        <option value="MCB-C-16">MCB-C-16</option>
        <!-- ... more options ... -->
      </select>
    </td>
    <td class="col-status">
      <span class="status-badge"></span>
    </td>
    <td class="col-issues">
      <div class="issue-stack">
        <!-- Non-conformities displayed here -->
      </div>
    </td>
    <td class="col-actions">
      <button class="btn-edit" title="Edit">✎</button>
      <button class="btn-delete" title="Delete">✕</button>
    </td>
  </tr>
</template>
```

### Real-Time Validation Indicator Styling

```css
/* ==================== VALIDATION INDICATORS ==================== */

/* Visual feedback for input fields */
input[data-validation-state="valid"],
select[data-validation-state="valid"] {
  border-color: var(--color-success);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2320b847' stroke-width='2'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

input[data-validation-state="warning"],
select[data-validation-state="warning"] {
  border-color: var(--color-warning);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%23a84b2f'%3E%3Cpath d='M1 21h22L12 2 1 21z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

input[data-validation-state="error"],
select[data-validation-state="error"] {
  border-color: var(--color-error);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23c0152f' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='12'/%3E%3Cline x1='12' y1='16' x2='12.01' y2='16'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

/* Status badge in row */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-badge.valid {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.status-badge.valid::before {
  background: var(--color-success);
}

.status-badge.warning {
  background: rgba(var(--color-warning-rgb), 0.15);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.status-badge.warning::before {
  background: var(--color-warning);
}

.status-badge.critical {
  background: rgba(var(--color-error-rgb), 0.15);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

.status-badge.critical::before {
  background: var(--color-error);
}

/* Issue stack (multiple non-conformities) */
.issue-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.issue-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
}

.issue-badge:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.issue-badge.critical {
  background: rgba(var(--color-error-rgb), 0.2);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

.issue-badge.warning {
  background: rgba(var(--color-warning-rgb), 0.2);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

/* Tooltip for issue preview */
.issue-tooltip {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.issue-badge:hover .issue-tooltip {
  opacity: 1;
}
```

---

## Event Handler Implementation

### Input Change Handler with Real-Time Validation

```javascript
// File: handlers.js - Circuit validation event handler

import { state } from './state.js';
import { validationEngine, validationDebouncer } from './measurement-validator/engine/validationEngine.js';

/**
 * Handle circuit input field change
 * Triggered by: <input data-field="voltage"> change event
 */
export function handleCircuitFieldChange(event) {
  const input = event.target;
  const circuitRow = input.closest('.circuit-row');
  const circuitId = circuitRow.dataset.circuitId;
  const fieldName = input.dataset.field;
  const newValue = parseInputValue(input.type, input.value);
  
  // Validate input value immediately
  const inputValidation = validateInputValue(fieldName, newValue);
  if (!inputValidation.valid) {
    // Show inline error message
    showInputError(input, inputValidation.error);
    input.setAttribute('data-validation-state', 'error');
    return;
  }
  
  // Update state
  const circuit = state.getCircuit(circuitId);
  circuit[fieldName] = newValue;
  state.updateCircuit(circuitId, circuit);
  
  // Schedule validation (debounced to avoid excessive calculations)
  validationDebouncer.scheduleValidation(circuitId, circuit);
  
  // Clear inline error if input valid
  input.removeAttribute('data-validation-state');
  clearInputError(input);
  
  // Show loading state
  showValidationInProgress(circuitRow);
}

/**
 * Handle validation complete event
 * Called after validationEngine produces results
 */
export function handleValidationComplete(event) {
  const { circuitId, results } = event.detail;
  const circuitRow = document.querySelector(`[data-circuit-id="${circuitId}"]`);
  
  if (!circuitRow) return;
  
  // Update status badge
  updateStatusBadge(circuitRow, results);
  
  // Update issue display
  updateIssueStack(circuitRow, results.nonConformities);
  
  // Highlight problematic fields
  highlightProblematicFields(circuitRow, results.nonConformities);
  
  // Clear loading state
  clearValidationInProgress(circuitRow);
  
  // Update validation summary
  updateValidationSummary();
}

/**
 * Update status badge based on validation results
 */
function updateStatusBadge(circuitRow, results) {
  const badgeEl = circuitRow.querySelector('.status-badge');
  
  if (results.nonConformities.length === 0) {
    badgeEl.className = 'status-badge valid';
    badgeEl.innerHTML = '<span class="status-icon">✓</span> Valid';
  } else {
    const criticalCount = results.nonConformities.filter(
      nc => nc.severity === 'CRITICAL'
    ).length;
    
    if (criticalCount > 0) {
      badgeEl.className = 'status-badge critical';
      badgeEl.innerHTML = `<span class="status-icon">⚠</span> ${criticalCount} Critical`;
    } else {
      badgeEl.className = 'status-badge warning';
      badgeEl.innerHTML = `<span class="status-icon">⚡</span> Issues`;
    }
  }
}

/**
 * Display non-conformities in issue stack
 */
function updateIssueStack(circuitRow, nonConformities) {
  const issueStack = circuitRow.querySelector('.issue-stack');
  issueStack.innerHTML = '';
  
  // Group by severity
  const criticalIssues = nonConformities.filter(nc => nc.severity === 'CRITICAL');
  const warningIssues = nonConformities.filter(nc => nc.severity === 'WARNING');
  
  // Display critical issues first
  [...criticalIssues, ...warningIssues].forEach(issue => {
    const badge = document.createElement('div');
    badge.className = `issue-badge ${issue.severity.toLowerCase()}`;
    badge.title = issue.message;
    
    // Abbreviated code
    const codeShort = issue.code.split('_')[0]; // e.g., "CABLE" from "CABLE_UNDERSIZED_AMPACITY"
    badge.innerHTML = `${codeShort}: ${issue.name}`;
    
    // Add click handler to show details
    badge.addEventListener('click', () => {
      showIssueDetail(issue);
    });
    
    issueStack.appendChild(badge);
  });
}

/**
 * Highlight fields with validation issues
 */
function highlightProblematicFields(circuitRow, nonConformities) {
  // Map issues to fields
  const fieldIssueMap = {
    'CABLE_UNDERSIZED_AMPACITY': ['cableGauge', 'current'],
    'VOLTAGE_DROP_EXCESSIVE': ['distance', 'cableGauge'],
    'PROTECTION_DEVICE_UNDERSIZED': ['protectionCurrent', 'current'],
    'IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE': ['distance', 'cableGauge'],
    'VOLTAGE_OUT_OF_RANGE': ['voltage'],
    'CABLE_VOLTAGE_RATING_EXCEEDED': ['cableType'],
  };
  
  // Clear previous highlighting
  circuitRow.querySelectorAll('[data-validation-state]').forEach(el => {
    el.removeAttribute('data-validation-state');
  });
  
  // Apply highlighting based on issues
  nonConformities.forEach(issue => {
    const affectedFields = fieldIssueMap[issue.code] || [];
    
    affectedFields.forEach(fieldName => {
      const input = circuitRow.querySelector(`[data-field="${fieldName}"]`);
      if (input) {
        input.setAttribute(
          'data-validation-state',
          issue.severity === 'CRITICAL' ? 'error' : 'warning'
        );
      }
    });
  });
}

/**
 * Register all event listeners
 */
export function registerValidationHandlers() {
  // Delegate circuit input changes
  document.addEventListener('change', (event) => {
    if (event.target.matches('.circuits-table [data-field]')) {
      handleCircuitFieldChange(event);
    }
  });
  
  // Listen for validation completion
  window.addEventListener('validationComplete', handleValidationComplete);
  
  // Validate all circuits button
  document.getElementById('validate-all')?.addEventListener('click', () => {
    const circuits = state.getState().circuitTable;
    const results = validationEngine.validateAllCircuits(circuits);
    updateValidationSummary(results);
  });
}
```

---

## User Workflow & Interaction

### Complete User Journey

```
1. User clicks "+ Add Circuit"
   ↓
2. Modal opens with form fields
   ↓
3. User enters circuit name, voltage, current, cable type, gauge, distance
   ↓
4. Real-time validation triggers for each field
   ↓
5. Field shows icon:
   - ✓ Green if valid
   - ⚠ Orange if warning
   - ✗ Red if critical error
   ↓
6. User hovers over issue badge to see preview
   ↓
7. User clicks issue badge to see detailed explanation + remedies
   ↓
8. User adjusts values based on recommendations
   ↓
9. All issues resolved → Status shows "Valid"
   ↓
10. User saves circuit
   ↓
11. Circuit appears in main table
   ↓
12. Real-time validation continues as user edits
```

### Modal Implementation for Issue Details

```javascript
/**
 * Display detailed non-conformity information in modal
 */
export function showIssueDetail(nonConformity) {
  const modal = document.getElementById('issue-detail-modal');
  const content = document.getElementById('issue-detail-content');
  
  const severityColor = {
    CRITICAL: '#c0152f',
    WARNING: '#a84b2f',
    INFO: '#626c71',
  }[nonConformity.severity];
  
  content.innerHTML = `
    <div class="issue-detail">
      <div class="issue-header" style="border-left: 4px solid ${severityColor}; padding-left: 16px;">
        <h4>${nonConformity.name}</h4>
        <p class="code">${nonConformity.code}</p>
        <span class="severity ${nonConformity.severity.toLowerCase()}">
          ${nonConformity.severity}
        </span>
      </div>
      
      <div class="issue-section">
        <h5>Description</h5>
        <p>${nonConformity.description}</p>
      </div>
      
      <div class="issue-section">
        <h5>Actual vs. Limit</h5>
        <div class="comparison">
          <div class="metric">
            <span class="label">Actual:</span>
            <span class="value">${nonConformity.actual} ${nonConformity.unit}</span>
          </div>
          <div class="metric">
            <span class="label">Limit:</span>
            <span class="value">${nonConformity.limit} ${nonConformity.unit}</span>
          </div>
        </div>
      </div>
      
      <div class="issue-section">
        <h5>Normative Reference</h5>
        <p class="standard">${nonConformity.normReference}</p>
      </div>
      
      <div class="issue-section">
        <h5>Recommended Remedies</h5>
        <ul class="remedy-list">
          ${nonConformity.remedyOptions.map(remedy => 
            `<li>${remedy}</li>`
          ).join('')}
        </ul>
      </div>
      
      <div class="issue-section technical">
        <h5>Technical Details</h5>
        <pre>${JSON.stringify(nonConformity.calculationDetails, null, 2)}</pre>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}
```

---

## Error Display Components

### Toast Notifications for System Messages

```javascript
/**
 * Show temporary notification for user feedback
 */
export function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `notification notification--${type}`;
  
  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✗',
    info: 'ℹ',
  };
  
  toast.innerHTML = `
    <span class="notification-icon">${icons[type]}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close">&times;</button>
  `;
  
  const container = document.getElementById('notifications') || 
    (() => {
      const div = document.createElement('div');
      div.id = 'notifications';
      document.body.appendChild(div);
      return div;
    })();
  
  container.appendChild(toast);
  
  // Auto-dismiss after 3-5 seconds
  const timeout = type === 'error' ? 5000 : 3000;
  setTimeout(() => toast.remove(), timeout);
  
  toast.querySelector('.notification-close').addEventListener('click', () => {
    toast.remove();
  });
}
```

---

## Production Deployment

### Deployment Checklist

```javascript
// deployment-checklist.md

## Pre-Deployment Verification

### Code Quality
- [ ] All tests passing (100+ unit, 30+ integration)
- [ ] Code coverage >90%
- [ ] No console errors/warnings in production build
- [ ] ESLint/formatting checks passing
- [ ] No security vulnerabilities (npm audit clean)

### Performance
- [ ] Validation <5ms per circuit (measured on target hardware)
- [ ] Batch validation (50 items) <250ms
- [ ] Memory usage <50MB for 1000 circuits
- [ ] No memory leaks detected (DevTools profiler)

### Browser Compatibility
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] No polyfills needed (ES6 native)

### Documentation
- [ ] User guide completed
- [ ] API documentation up-to-date
- [ ] Deployment instructions documented
- [ ] Troubleshooting guide prepared

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation working
- [ ] Screen reader compatible
- [ ] Color contrast >4.5:1

### Security
- [ ] Input validation on all fields
- [ ] No XSS vulnerabilities
- [ ] No SQL injection risks (N/A - no database)
- [ ] HTTPS enforced
- [ ] CSP headers configured

## Deployment Process

1. **Staging Environment**
   - Deploy to XAMPP staging server
   - Run full test suite
   - Verify all features working
   - Check performance metrics

2. **Production Deployment**
   - Backup existing installation
   - Copy files to XAMPP htdocs
   - Verify file permissions
   - Clear browser cache headers
   - Run smoke tests

3. **Post-Deployment Verification**
   - Test with real user data
   - Monitor error logs (24 hours)
   - Verify validation engine responding correctly
   - Check performance metrics
   - Get user sign-off

## Rollback Plan

If critical issues discovered:
1. Restore backup files
2. Clear application cache
3. Notify users
4. Document issue
5. Plan hotfix
```

### Production Monitoring

```javascript
// File: measurement-validator/monitoring/productionMonitoring.js

export class ProductionMonitoring {
  constructor() {
    this.metrics = {
      validationExecutions: 0,
      validationErrors: 0,
      averageExecutionTime: 0,
      slowQueries: [],  // Validations >10ms
      errors: [],
    };
  }
  
  /**
   * Track validation execution
   */
  trackValidation(circuitId, duration, success, errorMessage = null) {
    this.metrics.validationExecutions++;
    
    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.validationExecutions - 1) + duration) /
      this.metrics.validationExecutions;
    
    if (!success) {
      this.metrics.validationErrors++;
      this.logError(circuitId, errorMessage);
    }
    
    // Track slow validations
    if (duration > 10) {
      this.metrics.slowQueries.push({
        circuitId,
        duration,
        timestamp: new Date(),
      });
    }
  }
  
  /**
   * Log error for debugging
   */
  logError(circuitId, message) {
    const error = {
      circuitId,
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    
    this.metrics.errors.push(error);
    
    // Send to error tracking service (Sentry, etc.)
    if (window.errorTracker) {
      window.errorTracker.captureException(error);
    }
  }
  
  /**
   * Get health status
   */
  getHealthStatus() {
    const errorRate = this.metrics.validationErrors / this.metrics.validationExecutions;
    
    return {
      healthy: errorRate < 0.01,  // <1% error rate acceptable
      errorRate: (errorRate * 100).toFixed(2) + '%',
      averageExecutionTime: this.metrics.averageExecutionTime.toFixed(2) + 'ms',
      slowQueries: this.metrics.slowQueries.length,
      totalErrors: this.metrics.errors.length,
    };
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      ...this.metrics,
      health: this.getHealthStatus(),
    };
  }
}

// Global monitoring instance
export const productionMonitor = new ProductionMonitoring();

// Wrap validation engine with monitoring
const originalValidate = validationEngine.validateCircuit.bind(validationEngine);
validationEngine.validateCircuit = function(circuitData) {
  const start = performance.now();
  try {
    const result = originalValidate(circuitData);
    const duration = performance.now() - start;
    productionMonitor.trackValidation(circuitData.id, duration, true);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    productionMonitor.trackValidation(circuitData.id, duration, false, error.message);
    throw error;
  }
};
```

---

## Monitoring & Observability

### Health Check Endpoint

```javascript
/**
 * Health check for monitoring systems
 */
export function setupHealthCheck() {
  const healthCheckUrl = '/health/validation-engine';
  
  // Store health check data in state for monitoring
  window.addEventListener('beforeunload', () => {
    const health = productionMonitor.getHealthStatus();
    // Send to monitoring service
    navigator.sendBeacon(healthCheckUrl, JSON.stringify(health));
  });
}

/**
 * Real-time performance dashboard data
 */
export function getPerformanceDashboard() {
  return {
    systemHealth: productionMonitor.getHealthStatus(),
    circuitStats: {
      total: state.getState().circuitTable.length,
      valid: state.getState().circuitTable.filter(c => 
        !c.validationState?.hasNonConformities
      ).length,
      withIssues: state.getState().circuitTable.filter(c => 
        c.validationState?.hasNonConformities
      ).length,
      critical: state.getState().circuitTable.reduce((sum, c) => 
        sum + (c.validationState?.criticalCount || 0), 0
      ),
    },
    performanceMetrics: {
      avgValidationTime: productionMonitor.metrics.averageExecutionTime.toFixed(2) + 'ms',
      slowValidations: productionMonitor.metrics.slowQueries.length,
      errorRate: (productionMonitor.metrics.validationErrors / 
        productionMonitor.metrics.validationExecutions * 100).toFixed(2) + '%',
    },
  };
}
```

---

## Implementation Checklist

### Phase 4 Deliverables
- [ ] Complete HTML table markup with all fields
- [ ] CSS styling for all UI components
- [ ] Real-time error indicator implementation
- [ ] Event handler system fully integrated with state
- [ ] Modal for circuit editing/creation
- [ ] Non-conformity detail modal
- [ ] Status badge and issue stack display
- [ ] Toast notification system
- [ ] Validation debouncing implementation
- [ ] Production monitoring setup
- [ ] Health check system
- [ ] Deployment checklist documented
- [ ] User guide completed
- [ ] Troubleshooting guide prepared

### Phase 4 Exit Criteria
- [ ] All UI components rendering correctly
- [ ] Real-time validation responding within 300ms (including debounce)
- [ ] Error indicators updating immediately
- [ ] User can navigate modal, edit circuits, view issue details
- [ ] No console errors in Chrome DevTools
- [ ] Production monitoring collecting metrics
- [ ] Health check returning valid status
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] All browsers tested (Chrome, Firefox, Safari, Edge)
- [ ] User acceptance testing completed

### Success Metrics
- **User Experience**
  - Error detected in real-time (<300ms from input)
  - Clear visual indicators of non-conformities
  - Easy navigation to issue details and remedies
  - Mobile-responsive design working

- **Technical Quality**
  - Zero validation errors in production
  - <5ms average validation execution
  - <1% error rate
  - <50MB memory for 1000 circuits

- **Compliance**
  - All DIN VDE rules implemented
  - 100% rule coverage with tests
  - Proper normative references included
  - Remedy suggestions actionable

---

## Deployment Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Setup | HTML/CSS, basic table |
| 2 | Integration | Event handlers, validation engine integration |
| 3 | Polish | Error indicators, modals, notifications |
| 4 | Testing | Accessibility, cross-browser, performance |
| 5 | Production | Deploy, monitor, document |

---

## Conclusion

This four-phase implementation provides a complete, production-ready circuit measurement validator fully integrated with the Excel Tools application. The validator ensures compliance with German industrial standards (DIN VDE) while providing excellent real-time feedback to users about electrical circuit safety and specification conformance.

The modular architecture allows for easy extension (new cable types, protection devices, or validation rules) without affecting existing functionality. Performance optimization strategies ensure responsiveness even with hundreds of circuits in the table.

