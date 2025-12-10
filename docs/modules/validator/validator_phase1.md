# Circuit Measurement Validator - Phase 1: Architecture & Data Model
## Real-Time Validation of Electrical Circuits in German Industrial Context

**Last Updated:** December 10, 2025  
**Target:** Industrial electrical installations following DIN VDE standards  
**Technology Stack:** ES6 Modules, No external dependencies (performance-critical)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Normative Framework](#normative-framework)
3. [Component Architecture](#component-architecture)
4. [Data Models](#data-models)
5. [Cable Reference Library](#cable-reference-library)
6. [Protection Device Library](#protection-device-library)
7. [Validation Rules Matrix](#validation-rules-matrix)
8. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### Purpose
The Circuit Measurement Validator ensures electrical circuit designs comply with German industrial standards by validating user input in real-time as circuit data is entered into the measurement table.

### Key Features
- **Real-Time Validation**: Triggers immediately when sufficient data is available
- **Multi-Level Compliance**: Cable sizing, voltage limits, impedance, protection devices
- **Normative Alignment**: DIN VDE standards (German industrial context)
- **Performance Optimized**: Validation completes in <5ms per input change
- **Modular Architecture**: Integrates with existing ES6 module structure

### Non-Conformity Detection
The validator flags the following non-conformities:
1. **Undersized cable**: Wire cross-section below minimum for current
2. **Oversized voltage**: Voltage exceeds rated limits
3. **High impedance**: Loop impedance prevents adequate protection
4. **Undersized protection device**: Device cannot protect circuit adequately
5. **Voltage drop exceeded**: Voltage drop >3% (lighting) or >5% (other loads)
6. **Short circuit capacity exceeded**: Installation SCC insufficient
7. **RCD tripping time exceeded**: Selective coordination violated

---

## Normative Framework

### Applicable Standards

#### DIN VDE 0100 Series (Main Standard)
- **DIN VDE 0100-430**: Protection against electric shock and overcurrent
- **DIN VDE 0100-520**: Selection and erection of electrical equipment
- **DIN VDE 0100-721**: Low-voltage installations (industrial)

#### Cable Selection (DIN VDE 0295, 0296, 0298)
- **Wire gauges**: 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240 mm²
- **Temperature ratings**: 60°C, 70°C, 90°C (common industrial)
- **Current capacity**: Tables based on installation method (fixed in conduit, direct burial, etc.)

#### Protection Devices (DIN VDE 0641, 0660)
- **MCB (Miniature Circuit Breaker)**: B, C, D characteristic curves
- **RCD (Residual Current Device)**: Type AC, A, F
- **RCBO (RCD+MCB combo)**: Combined protection
- **Current ratings**: 6A, 10A, 13A, 16A, 20A, 25A, 32A, 40A, 50A, 63A, 80A, 100A

#### Calculation Standards
- **Maximum voltage drop**: 3% for lighting, 5% for other loads
- **Loop impedance (Ze)**: Determines adequate protection (I²t calculations)
- **Short circuit capacity**: Cable and device ratings must withstand

---

## Component Architecture

### Module Structure (ES6)

```
measurement-validator/
├── validationRules.js          # Rule definitions and logic
├── libraries/
│   ├── cableLibrary.js         # Cable reference data (DIN 0295/0296/0298)
│   ├── protectionLibrary.js    # Protection device specifications
│   └── standardsData.js         # Standard tables and constants
├── validators/
│   ├── cableValidator.js       # Cable-specific validation
│   ├── protectionValidator.js  # Protection device validation
│   ├── circuitValidator.js     # Overall circuit validation
│   └── impedanceValidator.js   # Loop impedance calculations
├── engine/
│   ├── validationEngine.js     # Core validation orchestration
│   └── resultFormatter.js      # Non-conformity reporting
└── tests/
    ├── unit/                   # Individual validator tests
    ├── integration/            # Cross-validator tests
    └── performance/            # Benchmark tests
```

### Integration Points

**State Management** (`state.js`)
```javascript
circuitTable: [
  {
    id: 'circuit_001',
    name: 'Pump Motor 5.5kW',
    voltage: 400,          // 3-phase AC, V
    current: 12.5,         // Line current, A
    frequency: 50,         // Hz
    distance: 45,          // Cable run length, m
    cableGauge: 16,        // mm² (user input)
    cableType: 'NYY',      // Reference to library
    installationMethod: 'conduit_fixed',
    protectionDeviceType: 'MCB-C',
    protectionCurrent: 16, // A
    phasesCount: 3,        // 1 or 3
    loadType: 'motor',     // motor, heater, lighting, etc.
    validationState: {
      isCableValid: true,
      isProtectionValid: false,  // Flag: non-conformity detected
      isCircuitValid: false,
      nonConformities: [
        {
          code: 'PROTECTION_UNDERSIZED',
          severity: 'CRITICAL',
          message: 'Protection device 16A cannot provide adequate protection',
          remedy: 'Use protection device rated ≥20A'
        }
      ]
    }
  }
]
```

**Event System**
```
circuit:input → validation engine triggers → non-conformities detected
→ state:validationStateChanged event → UI updates error indicators
```

---

## Data Models

### Circuit Input Model

```javascript
// Minimal circuit definition for validation
const circuitInput = {
  // Identification
  id: 'string (UUID)',
  name: 'string',
  
  // Electrical Parameters
  voltage: 'number (V: 230, 400, 690)',
  current: 'number (A: max continuous)',
  frequency: 'number (50 or 60 Hz)',
  phasesCount: 'number (1 or 3)',
  
  // Cable Parameters
  distance: 'number (m: cable run length)',
  cableGauge: 'number (mm²: user selection)',
  cableType: 'string (NYY, NYM, NYCY, etc.)',
  installationMethod: 'string (conduit_fixed, conduit_surface, etc.)',
  ambientTemp: 'number (°C: default 30)',
  
  // Protection Parameters
  protectionDeviceType: 'string (MCB-B, MCB-C, RCD, RCBO)',
  protectionCurrent: 'number (A: rated current)',
  
  // Load Characteristics
  loadType: 'enum (motor, heater, lighting, general)',
  powerFactor: 'number (0.5-1.0: default 0.85 for motors)',
  
  // Environmental
  conduitMaterial: 'string (steel, pvc, none)',
  soilResistivity: 'number (Ω·m: for buried cables)'
};
```

### Non-Conformity Model

```javascript
const nonConformity = {
  code: 'string (CABLE_UNDERSIZED, VOLTAGE_EXCESSIVE, etc.)',
  severity: 'enum (INFO, WARNING, CRITICAL)',
  category: 'enum (CABLE, PROTECTION, VOLTAGE_DROP, IMPEDANCE, SHORT_CIRCUIT)',
  value: 'number (actual value that failed)',
  limit: 'number (max/min allowed value)',
  message: 'string (user-friendly description)',
  remedy: 'string (corrective action)',
  normReference: 'string (DIN VDE 0100-430, etc.)',
  validationTimestamp: 'ISO 8601 string',
  data: {
    // Context for detailed analysis
  }
};
```

---

## Cable Reference Library

### Design Principles
- **Comprehensive**: All DIN-rated wire gauges
- **Fast Lookup**: O(1) key-based access
- **Temperature-Aware**: Derating factors included
- **Installation-Aware**: Current capacity by method
- **Minimal**: Only German industrial context (excludes obsolete types)

### Cable Type Classification

```javascript
const cableLibraries = {
  // Fixed installation (most common in German industrial)
  'NYY': {
    name: 'NYY - Copper, PVC insulation, PVC sheath',
    standard: 'DIN VDE 0296',
    voltageRating: 0.6,     // kV (single-phase)
    maxTemperature: 70,     // °C
    minRadius: 4,           // times diameter (bending)
    gauges: {
      // For 3-phase AC, 50Hz, installation method affects capacity
      1.5: { ampacity_methods: {...}, weight: 10, resistance: 12.1 },
      2.5: { ampacity_methods: {...}, weight: 17, resistance: 7.41 },
      4: { ampacity_methods: {...}, weight: 27, resistance: 4.61 },
      // ... up to 240mm²
    }
  },
  
  'NYM': {
    name: 'NYM - Copper, PVC insulation (single cable)',
    standard: 'DIN VDE 0250-204',
    voltageRating: 0.3,     // Single-phase only
    maxTemperature: 60,
    minRadius: 4,
    // Lower ampacity than NYY (single insulation)
  },
  
  'NYCY': {
    name: 'NYCY - Copper, PVC insulation, copper braid shield',
    standard: 'DIN VDE 0276-603',
    voltageRating: 0.6,
    maxTemperature: 70,
    shielded: true,         // Important for EMC
    minRadius: 4,
  }
  
  // Underground/Buried cables
  'NAYY': {
    name: 'NAYY - Copper, PVC, armored',
    standard: 'DIN VDE 0295',
    voltageRating: 0.6,
    maxTemperature: 70,
    armored: true,
  }
};
```

### Ampacity Table Structure

```javascript
const ampacityData = {
  method_3: { // Fixed in conduit/cable tray (most conservative)
    1.5: 15.5,
    2.5: 21,
    4: 27,
    6: 34,
    10: 46,
    16: 61,
    25: 80,
    35: 99,
    50: 125,
    70: 156,
    95: 192,
    120: 224,
    150: 260,
    185: 299,
    240: 347
  },
  method_4: { // Fixed, surface mounted (higher capacity)
    1.5: 17.5,
    2.5: 24,
    // ...
  },
  method_7: { // Buried in ground (thermal considerations)
    1.5: 18.5,
    2.5: 26,
    // ...
  }
};
```

### Temperature Derating

```javascript
const temperatureDerating = {
  method_3: {
    30: 1.0,
    40: 0.96,
    50: 0.92,
    60: 0.87,
    70: 0.81,  // Reference temp
    80: 0.75
  },
  method_4: {
    // Similar structure
  }
};
```

### Implementation Structure

```javascript
// Reference: measurement-validator/libraries/cableLibrary.js
export class CableLibrary {
  constructor() {
    this.cables = {
      'NYY': { /* DIN VDE 0296 specifications */ },
      'NYM': { /* DIN VDE 0250-204 specifications */ },
      // ...
    };
    this.ampacityTables = { /* method-based current ratings */ };
    this.deratingFactors = { /* temperature, grouping, etc. */ };
  }
  
  // Get cable specification
  getCable(type) { /* O(1) lookup */ }
  
  // Get ampacity with derating
  getAmpacity(type, gauge, method, ambientTemp, grouping) { /* with factors */ }
  
  // Find minimum cable gauge for given current
  findMinimumGauge(type, current, method, ambientTemp) { /* returns gauge */ }
  
  // Voltage drop calculation
  calculateVoltageDrop(gauge, distance, current, phasesCount, voltage) { /* returns % */ }
}
```

---

## Protection Device Library

### Device Categories (German Industrial Standard)

#### 1. MCB (Miniature Circuit Breaker) - DIN VDE 0641-11
Characteristics determine tripping current vs. time:

```javascript
const MCBCharacteristics = {
  'B': {
    name: 'Type B - General circuits',
    tripPoint: { min: 3, max: 5 },  // Multiples of In
    delay: 'short',
    uses: 'resistive loads, general lighting'
  },
  'C': {
    name: 'Type C - Inductive loads',
    tripPoint: { min: 5, max: 10 },
    delay: 'medium',
    uses: 'motors, transformers, mixed loads'
  },
  'D': {
    name: 'Type D - High inrush',
    tripPoint: { min: 10, max: 20 },
    delay: 'long',
    uses: 'large motors, welding, high starting current'
  }
};
```

#### 2. RCD (Residual Current Device) - DIN VDE 0664-100
Protective grounding monitoring:

```javascript
const RCDTypes = {
  'AC': {
    standard: 'DIN VDE 0664-100',
    sensitivity: [10, 30, 100, 300],  // mA
    responseTime: 300,                 // ms max
    uses: 'standard installation'
  },
  'A': {
    standard: 'DIN VDE 0664-100',
    sensitivity: [10, 30, 100, 300],
    responseTime: 200,
    uses: 'variable frequency drives'
  },
  'F': {
    standard: 'DIN VDE 0664-100',
    sensitivity: [10, 30, 100, 300],
    responseTime: 150,
    uses: 'high-speed protection'
  }
};
```

#### 3. RCBO (Combined) - DIN VDE 0664-100 + 0641-11
Combines MCB and RCD in single device

#### 4. Fuses (Cartridge/Cylindrical) - DIN VDE 0636
For backup protection and coordination

### Device Library Implementation

```javascript
// Reference: measurement-validator/libraries/protectionLibrary.js
export class ProtectionLibrary {
  constructor() {
    this.mcbDevices = {
      'MCB-B-10': { type: 'MCB', characteristic: 'B', current: 10, voltage: 400 },
      'MCB-B-16': { type: 'MCB', characteristic: 'B', current: 16, voltage: 400 },
      'MCB-C-16': { type: 'MCB', characteristic: 'C', current: 16, voltage: 400 },
      'MCB-C-20': { type: 'MCB', characteristic: 'C', current: 20, voltage: 400 },
      'MCB-C-32': { type: 'MCB', characteristic: 'C', current: 32, voltage: 400 },
      'MCB-D-40': { type: 'MCB', characteristic: 'D', current: 40, voltage: 400 },
      // Complete 40+ standard German industrial sizes
    };
    
    this.rcdDevices = {
      'RCD-AC-30': { type: 'RCD', typeClass: 'AC', sensitivity: 30, current: 40 },
      'RCD-A-30': { type: 'RCD', typeClass: 'A', sensitivity: 30, current: 63 },
      'RCBO-C-16-30': { type: 'RCBO', mcb: 'C', current: 16, rcdSensitivity: 30 },
    };
  }
  
  getDevice(code) { /* O(1) lookup */ }
  
  getCharacteristic(type, characteristic) { /* get C-curve data */ }
  
  // Calculate let-through energy (I²t)
  calculateLetThroughEnergy(device, faultCurrent, duration) { /* returns J */ }
  
  // Check selectivity between upstream/downstream
  isSelective(upstreamDevice, downstreamDevice, loopImpedance) { /* boolean */ }
}
```

---

## Validation Rules Matrix

### Rule Categorization

| Category | Rule | Trigger Condition | Calculation | Standard Reference |
|----------|------|-------------------|-------------|-------------------|
| **CABLE** | Undersized | current > 0 && gauge > 0 | Compare Ib ≤ In | DIN VDE 0100-430 |
| **CABLE** | Voltage Drop | distance > 0 && current > 0 | ΔU% = (2×L×I×ρ)/(S×U) | DIN VDE 0100-520 |
| **PROTECTION** | Undersized | current > 0 && device > 0 | In ≥ Ib | DIN VDE 0100-430 |
| **PROTECTION** | No Coordination | 2+ devices && Ze known | Time-current plots | DIN VDE 0100-430 |
| **IMPEDANCE** | High Loop Z | Ze > 0 && fault calc available | I²t < device capacity | DIN VDE 0100-430 |
| **VOLTAGE** | Over-voltage | voltage > 400 || voltage < 200 | Check rated voltage | DIN VDE 0100-200 |
| **VOLTAGE** | Frequency Mismatch | frequency != 50 && frequency != 60 | Exact match required | DIN VDE 0100-200 |

### Validation Dependency Graph

```
circuit input change
  ├─ voltage available?
  │  └─ Check: voltage in [230, 400, 690]V
  ├─ current available?
  │  ├─ cable gauge available?
  │  │  ├─ Cable ampacity check
  │  │  ├─ Voltage drop check (requires: distance)
  │  │  └─ Protection device check (requires: device type)
  │  │     ├─ Device let-through check (requires: Ze)
  │  │     └─ Selectivity check (if upstream device exists)
  │  └─ Protection device available?
  │     └─ Check: device current ≥ circuit current
  └─ All checks complete?
     └─ Aggregate results → validationState update
```

---

## Implementation Checklist

### Phase 1 Deliverables
- [ ] Architecture document (this file)
- [ ] Cable library module with all DIN-standard gauges
- [ ] Protection device library with MCB/RCD specifications
- [ ] Data model interfaces (TypeScript-like JSDoc)
- [ ] Validation rule matrix definition
- [ ] Integration points defined (state.js, handlers.js)
- [ ] Module skeleton created (empty imports/exports)

### Phase 1 Testing Preparation
- [ ] Test data fixtures created (sample circuits)
- [ ] Validator stubs created (pass-through functions)
- [ ] State integration tested (events trigger validation)

### Key Decisions Made
1. **No external dependencies**: Performance critical, use native JS
2. **O(1) lookups**: All libraries use object keys, not arrays
3. **Real-time trigger**: Validation fires on `stateChanged` event for circuit inputs
4. **Modular validators**: Cable, Protection, Impedance each have own module
5. **Normative compliance**: All rules derived from DIN VDE 0100 series

### Risks to Monitor
- **Library completeness**: Missing cable gauges or devices could leave gaps
- **Derating factors**: Temperature/grouping calculations affect accuracy
- **Performance**: Large circuits table could cause lag if validation not optimized
- **Normative updates**: DIN changes require library updates

---

## Next Steps → Phase 2
Phase 2 will implement the validation engine with rule execution, real-time error detection, and integration with state.js for event-driven updates.

