# Circuit Measurement Validator - Phase 2: Validation Rules & Calculation Engine
## Real-Time Rule Execution and Conformity Detection

**Last Updated:** December 10, 2025  
**Scope:** Core validation logic, calculation methods, rule execution  
**Output:** Non-conformity detection in real-time

---

## Table of Contents
1. [Validation Rules Specification](#validation-rules-specification)
2. [Calculation Methods](#calculation-methods)
3. [Rule Execution Engine](#rule-execution-engine)
4. [Integration with State Management](#integration-with-state-management)
5. [Real-Time Trigger Logic](#real-time-trigger-logic)
6. [Error Handling & Edge Cases](#error-handling--edge-cases)
7. [Implementation Checklist](#implementation-checklist)

---

## Validation Rules Specification

### Rule Definition Standard

Each rule follows this structure for consistency and testability:

```javascript
const ruleTemplate = {
  // Identification
  code: 'RULE_CODE_UPPERCASE',          // Unique identifier
  name: 'Human-readable rule name',
  category: 'CABLE|PROTECTION|VOLTAGE|IMPEDANCE|COORDINATION',
  severity: 'INFO|WARNING|CRITICAL',
  
  // Trigger Conditions
  triggers: {
    requiredFields: ['voltage', 'current', 'cableGauge'],
    minInputs: 3,                        // Can validate after N fields filled
  },
  
  // Calculation
  calculate: (circuitData) => ({
    actual: number,                      // Measured/actual value
    limit: number,                       // Maximum allowed value
    unit: 'string',
    compliant: boolean,
  }),
  
  // Remediation
  normReference: 'DIN VDE 0100-430',     // Standard reference
  remedyOptions: [
    'Use cable gauge 6mm² instead',
    'Reduce cable length',
  ],
};
```

---

## Validation Rules Implementation

### Rule 1: Cable Ampacity (Undersized Cable)

**Code:** `CABLE_UNDERSIZED_AMPACITY`  
**Severity:** CRITICAL  
**Standard:** DIN VDE 0100-430:2016 §433.1.2

```javascript
export const cableAmpacityRule = {
  code: 'CABLE_UNDERSIZED_AMPACITY',
  name: 'Cable current capacity insufficient',
  category: 'CABLE',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['voltage', 'current', 'cableGauge', 'cableType'],
    minInputs: 4,
  },
  
  description: 'The cable wire gauge cannot carry the circuit current safely. ' +
               'Current-carrying capacity (ampacity) must be ≥ circuit current.',
  
  calculate: (circuitData, cableLib, standardsData) => {
    const { current, cableGauge, cableType, installationMethod, ambientTemp } = circuitData;
    
    // Get ampacity from library with derating factors
    const baseAmpacity = cableLib.getAmpacity(
      cableType,
      cableGauge,
      installationMethod,
      ambientTemp,
      1  // grouping factor (simplified for now)
    );
    
    return {
      actual: current,
      limit: baseAmpacity,
      unit: 'A',
      compliant: current <= baseAmpacity,
      margin: baseAmpacity - current,
      percentUsed: (current / baseAmpacity * 100).toFixed(1),
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §433.1.2',
  remedyOptions: (result) => {
    const recommendations = [];
    if (result.percentUsed > 100) {
      const needed = Math.ceil(result.actual / 1.2); // 20% safety margin
      recommendations.push(
        `Upgrade cable to larger gauge (minimum ${cableLib.findMinimumGauge(
          circuitData.cableType,
          needed,
          circuitData.installationMethod,
          circuitData.ambientTemp
        )}mm²)`
      );
      recommendations.push(`Reduce circuit current if possible`);
      recommendations.push(`Install local transformer to reduce voltage/current`);
    }
    return recommendations;
  },
};
```

### Rule 2: Voltage Drop

**Code:** `VOLTAGE_DROP_EXCESSIVE`  
**Severity:** WARNING  
**Standard:** DIN VDE 0100-520:2016 §525.2

```javascript
export const voltageDropRule = {
  code: 'VOLTAGE_DROP_EXCESSIVE',
  name: 'Voltage drop exceeds acceptable limit',
  category: 'CABLE',
  severity: 'WARNING',
  
  triggers: {
    requiredFields: ['voltage', 'current', 'cableGauge', 'distance'],
    minInputs: 4,
  },
  
  description: 'Voltage drop in the cable exceeds standard limits. ' +
               'Lighting: max 3%, Other circuits: max 5% from source.',
  
  calculate: (circuitData, cableLib, standardsData) => {
    const { voltage, current, cableGauge, distance, phasesCount, loadType } = circuitData;
    
    // Get cable resistance from library
    const cableResistance = cableLib.getCableResistance(
      circuitData.cableType,
      cableGauge
    );
    
    // Voltage drop formula: ΔU = (2 × L × I × R) / U for single phase
    // For three-phase: ΔU = (√3 × L × I × R) / U
    const factor = phasesCount === 3 ? Math.sqrt(3) : 2;
    const dropVoltage = (factor * distance * current * cableResistance) / voltage;
    const dropPercent = (dropVoltage / voltage) * 100;
    
    // Load-dependent limits
    const maxDrop = loadType === 'lighting' ? 3 : 5;
    
    return {
      actual: dropPercent.toFixed(2),
      limit: maxDrop,
      unit: '%',
      compliant: dropPercent <= maxDrop,
      voltageDropAbsolute: dropVoltage.toFixed(1),
      voltageDropUnit: 'V',
      percentageExceeded: Math.max(0, dropPercent - maxDrop).toFixed(2),
    };
  },
  
  normReference: 'DIN VDE 0100-520:2016 §525.2',
  remedyOptions: (result) => [
    `Increase cable gauge to reduce resistance and voltage drop`,
    `Reduce cable length if possible (relocate protection device closer)`,
    `For long runs (>30m), consider step-up transformer at source`,
    `Install voltage stabilizer at end of circuit`,
  ],
};
```

### Rule 3: Protection Device Sizing

**Code:** `PROTECTION_DEVICE_UNDERSIZED`  
**Severity:** CRITICAL  
**Standard:** DIN VDE 0100-430:2016 §433.1.1

```javascript
export const protectionDeviceSizingRule = {
  code: 'PROTECTION_DEVICE_UNDERSIZED',
  name: 'Protection device rating insufficient for circuit current',
  category: 'PROTECTION',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['voltage', 'current', 'protectionDeviceType', 'protectionCurrent'],
    minInputs: 4,
  },
  
  description: 'The protection device current rating (In) must be ≥ circuit current (Ib). ' +
               'Standard condition: In ≥ Ib. Practical: Select next standard size ≥ Ib.',
  
  calculate: (circuitData, protectionLib, standardsData) => {
    const { current, protectionCurrent } = circuitData;
    
    // Get next standard size if current size insufficient
    const standardSizes = standardsData.getStandardProtectionSizes(
      circuitData.protectionDeviceType
    );
    const minRequired = standardSizes.find(s => s >= current);
    
    return {
      actual: current,
      limit: protectionCurrent,
      unit: 'A',
      compliant: protectionCurrent >= current,
      marginPercent: ((protectionCurrent - current) / current * 100).toFixed(1),
      nextStandardSize: minRequired,
      oversized: protectionCurrent > current * 1.25, // Flag oversizing
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §433.1.1',
  remedyOptions: (result) => [
    `Replace with protection device rated ≥ ${result.nextStandardSize}A`,
    `Use previous standard size if circuit load can be reduced`,
    `Install separate protection device for branch circuit`,
  ],
};
```

### Rule 4: Loop Impedance & Fault Protection

**Code:** `IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE`  
**Severity:** CRITICAL  
**Standard:** DIN VDE 0100-430:2016 §411.4

```javascript
export const loopImpedanceRule = {
  code: 'IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE',
  name: 'Loop impedance prevents adequate fault protection',
  category: 'IMPEDANCE',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['voltage', 'protectionCurrent', 'loopImpedance'],
    minInputs: 3,
  },
  
  description: 'Loop impedance must be low enough to generate sufficient fault current ' +
               'to trip the protection device within required time (<5s for general circuits).',
  
  calculate: (circuitData, protectionLib, standardsData) => {
    const { voltage, protectionCurrent, loopImpedance } = circuitData;
    
    // Fault current = voltage / (Ze + cable impedance)
    // Minimum fault current to trip device = protectionCurrent × tripPoint
    const tripPointFactor = protectionLib.getTripPointFactor(
      circuitData.protectionDeviceType
    );
    
    const minFaultCurrent = protectionCurrent * tripPointFactor.min;
    const actualFaultCurrent = voltage / loopImpedance;
    
    // Required maximum impedance
    const maxImpeance = (voltage / minFaultCurrent).toFixed(4);
    
    return {
      actual: loopImpedance,
      limit: maxImpeance,
      unit: 'Ω',
      compliant: loopImpedance <= maxImpeance,
      faultCurrent: actualFaultCurrent.toFixed(1),
      faultCurrentUnit: 'A',
      trippingMargin: ((actualFaultCurrent / minFaultCurrent) * 100).toFixed(1),
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §411.4',
  remedyOptions: (result) => [
    `Reduce loop impedance by using larger PE (protective earth) cable`,
    `Install RCD (residual current device) for additional protection`,
    `Use protection device with lower trip point (Type B instead of Type C)`,
    `Improve connection resistance at source and destination`,
  ],
};
```

### Rule 5: Voltage Range Compliance

**Code:** `VOLTAGE_OUT_OF_RANGE`  
**Severity:** CRITICAL  
**Standard:** DIN VDE 0100-200:2016 §200.2

```javascript
export const voltageRangeRule = {
  code: 'VOLTAGE_OUT_OF_RANGE',
  name: 'Voltage rating outside permitted range',
  category: 'VOLTAGE',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['voltage'],
    minInputs: 1,
  },
  
  description: 'Circuit voltage must match equipment ratings. ' +
               'Standard industrial voltages: 230V (single-phase), 400V (three-phase), 690V (high-power).',
  
  calculate: (circuitData, standardsData) => {
    const { voltage } = circuitData;
    const validVoltages = standardsData.getValidIndustrialVoltages();
    
    const isValid = validVoltages.includes(voltage);
    const nearest = validVoltages.reduce((prev, curr) =>
      Math.abs(curr - voltage) < Math.abs(prev - voltage) ? curr : prev
    );
    
    return {
      actual: voltage,
      limit: `${validVoltages.join(', ')}V`,
      unit: 'V',
      compliant: isValid,
      nearestValidVoltage: nearest,
    };
  },
  
  normReference: 'DIN VDE 0100-200:2016 §200.2',
  remedyOptions: (result) => [
    `Use circuit voltage: ${result.nearestValidVoltage}V`,
    `Install transformer to convert to standard voltage`,
    `Check circuit power source configuration`,
  ],
};
```

### Rule 6: Cable Voltage Rating

**Code:** `CABLE_VOLTAGE_RATING_EXCEEDED`  
**Severity:** CRITICAL  
**Standard:** DIN VDE 0100-430:2016 §433.2.1

```javascript
export const cableVoltageRatingRule = {
  code: 'CABLE_VOLTAGE_RATING_EXCEEDED',
  name: 'Cable voltage rating lower than circuit voltage',
  category: 'CABLE',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['voltage', 'cableType'],
    minInputs: 2,
  },
  
  description: 'Cable insulation voltage rating must be ≥ circuit voltage. ' +
               'For example, NYY cables rated 0.6kV (600V) are suitable for ≤400V single-phase.',
  
  calculate: (circuitData, cableLib, standardsData) => {
    const { voltage, cableType } = circuitData;
    const cable = cableLib.getCable(cableType);
    const ratedVoltage = cable.voltageRating * 1000; // Convert kV to V
    
    return {
      actual: voltage,
      limit: ratedVoltage,
      unit: 'V',
      compliant: voltage <= ratedVoltage,
      margin: (ratedVoltage - voltage).toFixed(0),
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §433.2.1',
  remedyOptions: (result) => [
    `Select cable type rated for higher voltage (e.g., NYY 1.0kV)`,
    `Reduce circuit voltage if possible`,
    `Use parallel circuits at lower voltage`,
  ],
};
```

### Rule 7: Selective Coordination (Upstream/Downstream Protection)

**Code:** `COORDINATION_NOT_SELECTIVE`  
**Severity:** WARNING  
**Standard:** DIN VDE 0100-430:2016 §434.4

```javascript
export const selectiveCoordinationRule = {
  code: 'COORDINATION_NOT_SELECTIVE',
  name: 'Protection device coordination not selective',
  category: 'COORDINATION',
  severity: 'WARNING',
  
  triggers: {
    requiredFields: ['upstreamDeviceType', 'downstreamDeviceType', 'loopImpedance'],
    minInputs: 2,
  },
  
  description: 'When multiple protection devices protect a circuit, downstream devices ' +
               'should trip before upstream devices in case of fault. This ensures only ' +
               'the affected circuit is disconnected, not the entire installation.',
  
  calculate: (circuitData, protectionLib, standardsData) => {
    const { upstreamDeviceType, downstreamDeviceType, loopImpedance } = circuitData;
    
    const upstream = protectionLib.getDevice(upstreamDeviceType);
    const downstream = protectionLib.getDevice(downstreamDeviceType);
    
    // Check if selectivity is maintained
    const isSelective = protectionLib.isSelective(
      upstream,
      downstream,
      loopImpedance
    );
    
    return {
      actual: isSelective ? 'selective' : 'not selective',
      compliant: isSelective,
      upstreamDevice: upstreamDeviceType,
      downstreamDevice: downstreamDeviceType,
      note: 'Consult device I-t curves for exact selectivity margins',
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §434.4',
  remedyOptions: (result) => [
    `Select downstream device with lower current rating`,
    `Use RCD device upstream with appropriate time delay`,
    `Reduce downstream device trip point (Type B vs Type C)`,
    `Consult manufacturer selectivity tables`,
  ],
};
```

---

## Calculation Methods

### Method 1: Cable Current Capacity with Derating

```javascript
export function calculateDeratedAmpacity(
  cableType,
  gauge,
  installationMethod,
  ambientTemperature,
  groupingFactor,
  cableLib,
  standardsData
) {
  // Step 1: Get base ampacity from tables
  const baseAmpacity = cableLib.getAmpacity(
    cableType,
    gauge,
    installationMethod
  );
  
  // Step 2: Temperature derating (reference 30°C)
  const tempDerating = standardsData.getTemperatureDerating(
    installationMethod,
    ambientTemperature,
    30  // reference temperature
  );
  
  // Step 3: Grouping factor (multiple cables in conduit)
  // Standard: 2-3 cables = 0.8, 4-6 cables = 0.7, >6 cables = 0.6
  
  // Combined derating: multiply all factors
  const deratedAmpacity = baseAmpacity * tempDerating * groupingFactor;
  
  return {
    baseAmpacity,
    tempDerating,
    groupingFactor,
    deratedAmpacity: Math.floor(deratedAmpacity), // Round down for safety
  };
}
```

### Method 2: Voltage Drop Calculation

**Formula for AC circuits:**
```
ΔU = (√3 × L × I × Z_cable) / U_line

Where:
  L = cable length (m)
  I = current (A)
  Z_cable = impedance per meter (Ω/m)
  U_line = line voltage (V)
  √3 ≈ 1.732 (three-phase factor)
```

**Implementation:**
```javascript
export function calculateVoltageDrop(
  distance,
  current,
  cableType,
  cableGauge,
  voltage,
  phasesCount,
  powerFactor,
  cableLib
) {
  // Step 1: Get cable impedance
  const cableImpedance = cableLib.getCableImpedance(cableType, cableGauge);
  
  // Step 2: Adjust for power factor (cos φ affects reactive component)
  const reactiveComponent = cableImpedance.reactance * Math.sin(
    Math.acos(powerFactor)
  );
  const effectiveZ = Math.sqrt(
    Math.pow(cableImpedance.resistance, 2) +
    Math.pow(reactiveComponent, 2)
  );
  
  // Step 3: Calculate drop
  const phaseConstant = phasesCount === 3 ? Math.sqrt(3) : 2;
  const dropVoltage = (phaseConstant * distance * current * effectiveZ) / voltage;
  const dropPercent = (dropVoltage / voltage) * 100;
  
  return {
    dropVoltage: dropVoltage.toFixed(1),
    dropPercent: dropPercent.toFixed(2),
    maxAllowed: voltage < 250 ? 3 : 5,  // 3% for lighting, 5% others
    compliant: dropPercent <= (voltage < 250 ? 3 : 5),
  };
}
```

### Method 3: Loop Impedance Calculation

```javascript
export function calculateLoopImpedance(
  sourceImpedance,        // Ze (external impedance)
  cableGauge,
  cableDistance,
  cableType,
  cableLib
) {
  // Ze = source impedance (typically 0.05-0.5 Ω for industrial)
  // Zs = Ze + Zc (cable impedance)
  
  // Cable impedance per meter (R+X in series)
  const cableImpedance = cableLib.getCableImpedance(cableType, cableGauge);
  
  // Total impedance for cable run (there and back)
  const cableLoopImpedance = 
    (cableImpedance.resistance + cableImpedance.reactance) * cableDistance * 2;
  
  // Total loop impedance
  const totalLoopImpedance = sourceImpedance + cableLoopImpedance;
  
  return {
    sourceImpedance: sourceImpedance.toFixed(4),
    cableLoopImpedance: cableLoopImpedance.toFixed(4),
    totalLoopImpedance: totalLoopImpedance.toFixed(4),
    unit: 'Ω',
  };
}
```

### Method 4: Fault Current & Protection Trip Time

```javascript
export function calculateFaultProtection(
  voltage,
  loopImpedance,
  protectionDeviceType,
  protectionCurrent,
  protectionLib
) {
  // Fault current = U / Zs (Ohm's law)
  const faultCurrent = voltage / loopImpedance;
  
  // Device tripping characteristics
  const device = protectionLib.getDevice(protectionDeviceType);
  const tripPoint = device.tripPoint || { min: 5, max: 10 };
  const tripCurrent = protectionCurrent * tripPoint.min;
  
  // Check if fault current is sufficient
  const isSufficient = faultCurrent >= tripCurrent;
  
  // Get tripping time from I-t curve
  const tripTime = protectionLib.getTripTime(
    protectionDeviceType,
    faultCurrent,
    protectionCurrent
  );
  
  return {
    faultCurrent: faultCurrent.toFixed(1),
    faultCurrentUnit: 'A',
    tripCurrent: tripCurrent.toFixed(1),
    tripTime: tripTime,
    tripTimeUnit: 'ms',
    adequate: isSufficient && tripTime <= 5000,  // 5 seconds max
  };
}
```

---

## Rule Execution Engine

### Core Engine Structure

```javascript
// Reference: measurement-validator/engine/validationEngine.js

export class ValidationEngine {
  constructor(cableLib, protectionLib, standardsData) {
    this.cableLib = cableLib;
    this.protectionLib = protectionLib;
    this.standardsData = standardsData;
    
    // Register all rules
    this.rules = [
      cableAmpacityRule,
      voltageDropRule,
      protectionDeviceSizingRule,
      loopImpedanceRule,
      voltageRangeRule,
      cableVoltageRatingRule,
      selectiveCoordinationRule,
    ];
    
    this.resultCache = new Map();
    this.executionMetrics = {
      totalExecutions: 0,
      totalDuration: 0,
      avgDuration: 0,
    };
  }
  
  /**
   * Validate a single circuit
   * @param {Object} circuitData - Circuit input
   * @returns {Object} Validation results with non-conformities
   */
  validateCircuit(circuitData) {
    const startTime = performance.now();
    
    const results = {
      circuitId: circuitData.id,
      timestamp: new Date().toISOString(),
      nonConformities: [],
      summary: {
        totalRules: this.rules.length,
        rulesApplicable: 0,
        compliant: [],
        nonCompliant: [],
      },
    };
    
    // Execute each rule
    for (const rule of this.rules) {
      try {
        // Check if rule can execute (all required fields present)
        const canExecute = rule.triggers.requiredFields.every(
          field => circuitData[field] !== undefined && circuitData[field] !== null
        );
        
        if (!canExecute) continue;
        
        results.summary.rulesApplicable++;
        
        // Execute rule calculation
        const ruleResult = rule.calculate(
          circuitData,
          this.cableLib,
          this.protectionLib,
          this.standardsData
        );
        
        if (!ruleResult.compliant) {
          // Create non-conformity report
          const nonConformity = {
            code: rule.code,
            name: rule.name,
            category: rule.category,
            severity: rule.severity,
            description: rule.description,
            actual: ruleResult.actual,
            limit: ruleResult.limit,
            unit: ruleResult.unit || '',
            compliant: false,
            normReference: rule.normReference,
            remedyOptions: rule.remedyOptions(ruleResult),
            calculationDetails: ruleResult,
          };
          
          results.nonConformities.push(nonConformity);
          results.summary.nonCompliant.push(rule.code);
        } else {
          results.summary.compliant.push(rule.code);
        }
      } catch (error) {
        results.nonConformities.push({
          code: 'VALIDATION_ERROR',
          name: 'Validation execution error',
          severity: 'CRITICAL',
          message: error.message,
          rule: rule.code,
        });
      }
    }
    
    // Calculate execution metrics
    const duration = performance.now() - startTime;
    this.executionMetrics.totalExecutions++;
    this.executionMetrics.totalDuration += duration;
    this.executionMetrics.avgDuration = 
      this.executionMetrics.totalDuration / this.executionMetrics.totalExecutions;
    
    results.performance = {
      executionTime: duration.toFixed(2),
      executionTimeUnit: 'ms',
    };
    
    // Cache result
    this.resultCache.set(circuitData.id, results);
    
    return results;
  }
  
  /**
   * Validate entire circuit table
   */
  validateAllCircuits(circuitTable) {
    const results = {
      totalCircuits: circuitTable.length,
      validCircuits: 0,
      circuitsWithIssues: 0,
      criticalIssues: 0,
      warnings: 0,
      circuitResults: [],
    };
    
    for (const circuit of circuitTable) {
      const circuitResult = this.validateCircuit(circuit);
      results.circuitResults.push(circuitResult);
      
      if (circuitResult.nonConformities.length === 0) {
        results.validCircuits++;
      } else {
        results.circuitsWithIssues++;
        
        const criticalCount = circuitResult.nonConformities.filter(
          nc => nc.severity === 'CRITICAL'
        ).length;
        results.criticalIssues += criticalCount;
        
        const warningCount = circuitResult.nonConformities.filter(
          nc => nc.severity === 'WARNING'
        ).length;
        results.warnings += warningCount;
      }
    }
    
    return results;
  }
  
  /**
   * Get rules applicable to circuit state
   */
  getApplicableRules(circuitData) {
    return this.rules.filter(rule =>
      rule.triggers.requiredFields.every(
        field => circuitData[field] !== undefined && circuitData[field] !== null
      )
    );
  }
}
```

---

## Integration with State Management

### State Structure Extension

```javascript
// In state.js, extend circuitTable item:

const circuitItem = {
  // ... existing fields ...
  
  // Validation state
  validationState: {
    // Last validation result
    lastValidation: {
      timestamp: 'ISO 8601',
      nonConformities: [],
      performance: { executionTime: number },
    },
    
    // Real-time flags (for UI indicators)
    hasNonConformities: boolean,
    criticalCount: number,
    warningCount: number,
    
    // Auto-validation enabled
    autoValidate: true,
  }
};
```

### Event Flow for Real-Time Validation

```javascript
// In handlers.js:

export function handleCircuitInputChange(circuitId, fieldName, newValue) {
  // 1. Update state
  const circuit = state.getCircuit(circuitId);
  circuit[fieldName] = newValue;
  
  // 2. Trigger validation engine
  const validationResults = validationEngine.validateCircuit(circuit);
  
  // 3. Update validation state
  circuit.validationState = {
    lastValidation: validationResults,
    hasNonConformities: validationResults.nonConformities.length > 0,
    criticalCount: validationResults.nonConformities.filter(
      nc => nc.severity === 'CRITICAL'
    ).length,
    warningCount: validationResults.nonConformities.filter(
      nc => nc.severity === 'WARNING'
    ).length,
  };
  
  // 4. Save state
  state.updateCircuit(circuitId, circuit);
  
  // 5. Emit event for UI update
  window.dispatchEvent(
    new CustomEvent('stateChanged', {
      detail: {
        type: 'validationStateChanged',
        circuitId,
        validation: validationResults,
      }
    })
  );
}
```

---

## Real-Time Trigger Logic

### Validation Trigger Graph

```javascript
// Determine when each rule can first execute:

export const validationTriggers = {
  // Phase 1: Basic info (user enters circuit name, voltage)
  onBasicInfo: ['VOLTAGE_OUT_OF_RANGE'],
  
  // Phase 2: Current & cable selected
  onCableSelection: [
    'CABLE_UNDERSIZED_AMPACITY',
    'CABLE_VOLTAGE_RATING_EXCEEDED',
  ],
  
  // Phase 3: Cable length entered
  onCableLengthEntered: [
    'VOLTAGE_DROP_EXCESSIVE',
  ],
  
  // Phase 4: Protection device selected
  onProtectionSelection: [
    'PROTECTION_DEVICE_UNDERSIZED',
  ],
  
  // Phase 5: Loop impedance calculated
  onImpedanceKnown: [
    'IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE',
    'COORDINATION_NOT_SELECTIVE',
  ],
  
  // Final: All data entered
  onCircuitComplete: [
    // Re-validate all rules
  ],
};
```

### Smart Debouncing for Performance

```javascript
export class ValidationDebouncer {
  constructor(validationEngine, debounceMs = 300) {
    this.engine = validationEngine;
    this.debounceMs = debounceMs;
    this.pendingValidations = new Map();
  }
  
  /**
   * Schedule validation with debouncing
   * If user continues typing, cancel previous and schedule new
   */
  scheduleValidation(circuitId, circuitData) {
    // Cancel previous timeout if exists
    if (this.pendingValidations.has(circuitId)) {
      clearTimeout(this.pendingValidations.get(circuitId));
    }
    
    // Schedule new validation
    const timeout = setTimeout(() => {
      const results = this.engine.validateCircuit(circuitData);
      // Dispatch event for UI update
      window.dispatchEvent(
        new CustomEvent('validationComplete', {
          detail: { circuitId, results }
        })
      );
    }, this.debounceMs);
    
    this.pendingValidations.set(circuitId, timeout);
  }
}
```

---

## Error Handling & Edge Cases

### Partial Data Handling

```javascript
/**
 * Handle case where not all data is available yet
 * Return: Can validate (boolean), reason if not
 */
export function canValidateRule(rule, circuitData) {
  const missingFields = rule.triggers.requiredFields.filter(
    field => circuitData[field] === undefined || circuitData[field] === null
  );
  
  return {
    canValidate: missingFields.length === 0,
    missingFields,
    percentComplete: (
      (rule.triggers.requiredFields.length - missingFields.length) /
      rule.triggers.requiredFields.length * 100
    ).toFixed(0),
  };
}
```

### Invalid Value Handling

```javascript
/**
 * Validate input value before calculation
 */
export function validateInputValue(fieldName, value) {
  const constraints = {
    voltage: { min: 100, max: 1000, type: 'number' },
    current: { min: 0.1, max: 6300, type: 'number' },
    distance: { min: 1, max: 1000, type: 'number' },
    cableGauge: { validValues: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240] },
    protectionCurrent: { validValues: [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100] },
  };
  
  const constraint = constraints[fieldName];
  if (!constraint) return { valid: true };
  
  if (constraint.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) return { valid: false, error: 'Must be a number' };
    if (num < constraint.min) return { valid: false, error: `Minimum: ${constraint.min}` };
    if (num > constraint.max) return { valid: false, error: `Maximum: ${constraint.max}` };
  }
  
  if (constraint.validValues) {
    if (!constraint.validValues.includes(Number(value))) {
      return { valid: false, error: `Must be one of: ${constraint.validValues.join(', ')}` };
    }
  }
  
  return { valid: true };
}
```

---

## Implementation Checklist

### Phase 2 Deliverables
- [ ] All 7 validation rules fully specified (code + description)
- [ ] Calculation methods documented with formulas
- [ ] ValidationEngine class implemented with caching
- [ ] Real-time trigger logic defined
- [ ] State integration planned (events, handlers)
- [ ] Error handling for edge cases implemented
- [ ] Input validation for all field types
- [ ] Debouncing mechanism for performance
- [ ] Performance metrics collection (execution time)

### Phase 2 Testing Preparation
- [ ] Test data fixtures (circuits with expected violations)
- [ ] Mock cable/protection libraries created
- [ ] Unit tests for each calculation method
- [ ] Integration tests for rule execution

### Performance Targets
- **Single rule execution:** < 1ms
- **Full circuit validation:** < 5ms
- **Circuit table (50 items):** < 250ms
- **UI responsiveness:** No perceptible lag during input

---

## Next Steps → Phase 3
Phase 3 will implement the concrete unit and integration tests, performance benchmarks, and optimization strategies.

