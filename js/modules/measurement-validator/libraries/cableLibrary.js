/**
 * Cable Reference Library
 * DIN VDE 0295, 0296, 0298 - Industrial cable specifications
 * 
 * Provides cable data for electrical circuit validation including:
 * - Ampacity (current carrying capacity) by installation method
 * - Temperature derating factors
 * - Cable resistance and impedance values
 * - Voltage ratings
 */

/**
 * Unit conversion constant: Ω/km to Ω/m
 * Resistance and reactance values in tables are per kilometer
 */
const OHMS_PER_KM_TO_OHMS_PER_M = 1000;

/**
 * Cable type specifications following DIN VDE standards
 * All ampacity values in Amps (A)
 * All resistance values in Ω/m (Ohms per meter) at 20°C
 */
const cables = {
  'NYY': {
    name: 'NYY - Copper, PVC insulation, PVC sheath',
    standard: 'DIN VDE 0296',
    voltageRating: 0.6, // kV
    maxTemperature: 70, // °C
    minBendRadius: 4,   // times diameter
    material: 'copper',
  },
  'NYM': {
    name: 'NYM - Copper, PVC insulation (single cable)',
    standard: 'DIN VDE 0250-204',
    voltageRating: 0.3, // kV (single-phase only)
    maxTemperature: 60, // °C
    minBendRadius: 4,
    material: 'copper',
  },
  'NYCY': {
    name: 'NYCY - Copper, PVC insulation, copper braid shield',
    standard: 'DIN VDE 0276-603',
    voltageRating: 0.6, // kV
    maxTemperature: 70, // °C
    minBendRadius: 4,
    shielded: true,
    material: 'copper',
  },
  'NAYY': {
    name: 'NAYY - Copper, PVC, armored',
    standard: 'DIN VDE 0295',
    voltageRating: 0.6, // kV
    maxTemperature: 70, // °C
    minBendRadius: 6,
    armored: true,
    material: 'copper',
  }
};

/**
 * Standard wire gauges (mm²) following DIN VDE 0295
 */
const standardGauges = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

/**
 * Ampacity tables by installation method (DIN VDE 0298-4)
 * Values in Amperes (A) for copper conductors at 30°C ambient
 * 
 * Installation methods:
 * - method_3: Fixed in conduit/cable tray (most conservative)
 * - method_4: Fixed, surface mounted (higher capacity)
 * - method_7: Buried in ground (thermal considerations)
 */
const ampacityTables = {
  method_3: { // Fixed in conduit/cable tray
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
  method_4: { // Fixed, surface mounted
    1.5: 17.5,
    2.5: 24,
    4: 32,
    6: 41,
    10: 56,
    16: 73,
    25: 95,
    35: 117,
    50: 149,
    70: 185,
    95: 227,
    120: 264,
    150: 305,
    185: 350,
    240: 406
  },
  method_7: { // Buried in ground
    1.5: 18.5,
    2.5: 26,
    4: 34,
    6: 43,
    10: 58,
    16: 77,
    25: 101,
    35: 125,
    50: 158,
    70: 197,
    95: 242,
    120: 281,
    150: 325,
    185: 374,
    240: 434
  }
};

/**
 * Temperature derating factors (reference 30°C)
 * DIN VDE 0298-4 Table 17
 */
const temperatureDerating = {
  method_3: {
    25: 1.03,
    30: 1.0,
    35: 0.96,
    40: 0.91,
    45: 0.87,
    50: 0.82,
    55: 0.76,
    60: 0.71,
    65: 0.65,
    70: 0.58
  },
  method_4: {
    25: 1.03,
    30: 1.0,
    35: 0.96,
    40: 0.91,
    45: 0.87,
    50: 0.82,
    55: 0.76,
    60: 0.71,
    65: 0.65,
    70: 0.58
  },
  method_7: {
    15: 1.07,
    20: 1.04,
    25: 1.0,
    30: 0.96,
    35: 0.92,
    40: 0.88,
    45: 0.83,
    50: 0.78
  }
};

/**
 * Grouping derating factors (multiple cables in conduit/tray)
 * DIN VDE 0298-4 Table 21
 */
const groupingDerating = {
  1: 1.0,
  2: 0.80,
  3: 0.70,
  4: 0.65,
  5: 0.60,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.50,
  10: 0.48,
  12: 0.45,
  14: 0.43,
  16: 0.41,
  18: 0.39,
  20: 0.38
};

/**
 * Cable resistance values (Ω/km at 20°C) - DIN VDE 0295
 * Values for copper conductors
 */
const cableResistance = {
  1.5: 12.1,
  2.5: 7.41,
  4: 4.61,
  6: 3.08,
  10: 1.83,
  16: 1.15,
  25: 0.727,
  35: 0.524,
  50: 0.387,
  70: 0.268,
  95: 0.193,
  120: 0.153,
  150: 0.124,
  185: 0.0991,
  240: 0.0754
};

/**
 * Cable reactance values (Ω/km at 50Hz) - DIN VDE 0295
 * Typical values for PVC insulated cables
 */
const cableReactance = {
  1.5: 0.115,
  2.5: 0.109,
  4: 0.101,
  6: 0.094,
  10: 0.086,
  16: 0.081,
  25: 0.078,
  35: 0.076,
  50: 0.074,
  70: 0.072,
  95: 0.071,
  120: 0.070,
  150: 0.069,
  185: 0.068,
  240: 0.067
};

/**
 * CableLibrary class - Provides cable data lookup and calculations
 */
export class CableLibrary {
  constructor() {
    this.cables = cables;
    this.ampacityTables = ampacityTables;
    this.temperatureDerating = temperatureDerating;
    this.groupingDerating = groupingDerating;
    this.cableResistance = cableResistance;
    this.cableReactance = cableReactance;
    this.standardGauges = standardGauges;
  }

  /**
   * Get cable specification by type
   * @param {string} type - Cable type code (e.g., 'NYY', 'NYM')
   * @returns {Object|null} Cable specification or null if not found
   */
  getCable(type) {
    return this.cables[type] || null;
  }

  /**
   * Get all available cable types
   * @returns {string[]} Array of cable type codes
   */
  getCableTypes() {
    return Object.keys(this.cables);
  }

  /**
   * Get standard wire gauges
   * @returns {number[]} Array of standard gauge values in mm²
   */
  getStandardGauges() {
    return [...this.standardGauges];
  }

  /**
   * Check if a gauge is a standard DIN gauge
   * @param {number} gauge - Wire gauge in mm²
   * @returns {boolean} True if gauge is standard
   */
  isStandardGauge(gauge) {
    return this.standardGauges.includes(gauge);
  }

  /**
   * Get base ampacity (current carrying capacity) for a cable
   * @param {string} cableType - Cable type code
   * @param {number} gauge - Wire gauge in mm²
   * @param {string} installationMethod - Installation method ('method_3', 'method_4', 'method_7')
   * @returns {number|null} Ampacity in Amps or null if not found
   */
  getBaseAmpacity(cableType, gauge, installationMethod = 'method_3') {
    const table = this.ampacityTables[installationMethod];
    if (!table) return null;
    return table[gauge] || null;
  }

  /**
   * Get ampacity with temperature and grouping derating applied
   * @param {string} cableType - Cable type code
   * @param {number} gauge - Wire gauge in mm²
   * @param {string} installationMethod - Installation method
   * @param {number} ambientTemp - Ambient temperature in °C (default 30)
   * @param {number} groupingCount - Number of cables grouped together (default 1)
   * @returns {Object} Ampacity result with breakdown
   */
  getAmpacity(cableType, gauge, installationMethod = 'method_3', ambientTemp = 30, groupingCount = 1) {
    const baseAmpacity = this.getBaseAmpacity(cableType, gauge, installationMethod);
    if (baseAmpacity === null) {
      return {
        baseAmpacity: null,
        tempDerating: null,
        groupingDerating: null,
        deratedAmpacity: null,
        error: `No ampacity data for gauge ${gauge}mm² with method ${installationMethod}`
      };
    }

    // Get temperature derating factor
    const tempFactor = this.getTemperatureDerating(installationMethod, ambientTemp);
    
    // Get grouping derating factor
    const groupFactor = this.getGroupingDerating(groupingCount);

    // Calculate derated ampacity
    const deratedAmpacity = Math.floor(baseAmpacity * tempFactor * groupFactor);

    return {
      baseAmpacity,
      tempDerating: tempFactor,
      groupingDerating: groupFactor,
      deratedAmpacity,
      unit: 'A'
    };
  }

  /**
   * Get temperature derating factor
   * @param {string} installationMethod - Installation method
   * @param {number} temperature - Ambient temperature in °C
   * @returns {number} Derating factor (1.0 = no derating)
   */
  getTemperatureDerating(installationMethod, temperature) {
    const table = this.temperatureDerating[installationMethod];
    if (!table) return 1.0;

    // Find closest temperature in table
    const temps = Object.keys(table).map(Number).sort((a, b) => a - b);
    
    // If exact match
    if (table[temperature] !== undefined) {
      return table[temperature];
    }

    // Interpolate between nearest values
    let lowerTemp = temps[0];
    let upperTemp = temps[temps.length - 1];

    for (let i = 0; i < temps.length - 1; i++) {
      if (temperature >= temps[i] && temperature <= temps[i + 1]) {
        lowerTemp = temps[i];
        upperTemp = temps[i + 1];
        break;
      }
    }

    // Clamp to available range
    if (temperature <= lowerTemp) return table[lowerTemp];
    if (temperature >= upperTemp) return table[upperTemp];

    // Linear interpolation
    const lowerFactor = table[lowerTemp];
    const upperFactor = table[upperTemp];
    const ratio = (temperature - lowerTemp) / (upperTemp - lowerTemp);
    return lowerFactor + (upperFactor - lowerFactor) * ratio;
  }

  /**
   * Get grouping derating factor
   * @param {number} count - Number of cables grouped together
   * @returns {number} Derating factor (1.0 = no derating)
   */
  getGroupingDerating(count) {
    if (count <= 1) return 1.0;
    if (this.groupingDerating[count] !== undefined) {
      return this.groupingDerating[count];
    }
    
    // For counts not in table, use closest lower value
    const counts = Object.keys(this.groupingDerating).map(Number).sort((a, b) => a - b);
    let closestCount = counts[counts.length - 1];
    for (let i = counts.length - 1; i >= 0; i--) {
      if (counts[i] <= count) {
        closestCount = counts[i];
        break;
      }
    }
    return this.groupingDerating[closestCount];
  }

  /**
   * Get cable resistance per meter
   * @param {string} cableType - Cable type code (not used, all copper same resistance)
   * @param {number} gauge - Wire gauge in mm²
   * @returns {number|null} Resistance in Ω/m or null if not found
   */
  getCableResistance(cableType, gauge) {
    const resistance = this.cableResistance[gauge];
    if (resistance === undefined) return null;
    return resistance / OHMS_PER_KM_TO_OHMS_PER_M;
  }

  /**
   * Get cable reactance per meter
   * @param {string} cableType - Cable type code
   * @param {number} gauge - Wire gauge in mm²
   * @returns {number|null} Reactance in Ω/m or null if not found
   */
  getCableReactance(cableType, gauge) {
    const reactance = this.cableReactance[gauge];
    if (reactance === undefined) return null;
    return reactance / OHMS_PER_KM_TO_OHMS_PER_M;
  }

  /**
   * Get cable impedance (resistance and reactance)
   * @param {string} cableType - Cable type code
   * @param {number} gauge - Wire gauge in mm²
   * @returns {Object} Impedance values in Ω/m
   */
  getCableImpedance(cableType, gauge) {
    const resistance = this.getCableResistance(cableType, gauge);
    const reactance = this.getCableReactance(cableType, gauge);
    
    if (resistance === null || reactance === null) {
      return {
        resistance: null,
        reactance: null,
        error: `No impedance data for gauge ${gauge}mm²`
      };
    }

    return {
      resistance,
      reactance,
      unit: 'Ω/m'
    };
  }

  /**
   * Find minimum cable gauge for a given current
   * @param {string} cableType - Cable type code
   * @param {number} current - Required current in Amps
   * @param {string} installationMethod - Installation method
   * @param {number} ambientTemp - Ambient temperature in °C
   * @param {number} groupingCount - Number of cables grouped
   * @returns {number|null} Minimum gauge in mm² or null if no suitable gauge
   */
  findMinimumGauge(cableType, current, installationMethod = 'method_3', ambientTemp = 30, groupingCount = 1) {
    for (const gauge of this.standardGauges) {
      const ampacityResult = this.getAmpacity(cableType, gauge, installationMethod, ambientTemp, groupingCount);
      if (ampacityResult.deratedAmpacity !== null && ampacityResult.deratedAmpacity >= current) {
        return gauge;
      }
    }
    return null; // No suitable gauge found
  }

  /**
   * Calculate voltage drop for a cable run
   * @param {number} gauge - Wire gauge in mm²
   * @param {number} distance - Cable length in meters
   * @param {number} current - Current in Amps
   * @param {number} phasesCount - Number of phases (1 or 3)
   * @param {number} voltage - System voltage in Volts
   * @param {number} powerFactor - Power factor (0.0-1.0, default 0.85)
   * @param {string} cableType - Cable type code
   * @returns {Object} Voltage drop calculation result
   */
  calculateVoltageDrop(gauge, distance, current, phasesCount, voltage, powerFactor = 0.85, cableType = 'NYY') {
    const impedance = this.getCableImpedance(cableType, gauge);
    
    if (impedance.resistance === null) {
      return {
        dropVoltage: null,
        dropPercent: null,
        error: impedance.error
      };
    }

    // Calculate effective impedance considering power factor
    const sinPhi = Math.sin(Math.acos(powerFactor));
    const cosPhi = powerFactor;
    
    // Z_eff = R × cos(φ) + X × sin(φ) per meter
    const effectiveZ = impedance.resistance * cosPhi + impedance.reactance * sinPhi;

    // Voltage drop formula:
    // Single-phase: ΔU = 2 × L × I × Z
    // Three-phase: ΔU = √3 × L × I × Z
    const phaseFactor = phasesCount === 3 ? Math.sqrt(3) : 2;
    const dropVoltage = phaseFactor * distance * current * effectiveZ;
    const dropPercent = (dropVoltage / voltage) * 100;

    return {
      dropVoltage: Number(dropVoltage.toFixed(2)),
      dropPercent: Number(dropPercent.toFixed(2)),
      unit: {
        voltage: 'V',
        percent: '%'
      }
    };
  }
}

// Export singleton instance for convenience
export const cableLibrary = new CableLibrary();

// Export data for direct access if needed
export { cables, standardGauges, ampacityTables, temperatureDerating, groupingDerating, cableResistance, cableReactance };
