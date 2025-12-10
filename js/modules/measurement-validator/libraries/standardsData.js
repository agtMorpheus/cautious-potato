/**
 * Standards Data Library
 * DIN VDE 0100 Series - Electrical installation standards constants
 * 
 * Provides standard reference data for electrical circuit validation including:
 * - Valid voltage levels
 * - Maximum voltage drop limits
 * - Standard frequencies
 * - Protection coordination requirements
 */

/**
 * Valid industrial voltage levels (DIN VDE 0100-200)
 * Values in Volts (V)
 */
const validVoltages = {
  singlePhase: [230],      // Single-phase AC
  threePhase: [400, 690],  // Three-phase AC
  all: [230, 400, 690]     // All valid industrial voltages
};

/**
 * Standard frequencies (DIN VDE 0100-200)
 * Values in Hertz (Hz)
 */
const validFrequencies = [50, 60];

/**
 * Maximum voltage drop limits (DIN VDE 0100-520 §525.2)
 * Values in percent (%)
 */
const maxVoltageDrop = {
  lighting: 3,    // Lighting circuits
  other: 5,       // Other circuits (motors, heaters, etc.)
  default: 5      // Default if load type unknown
};

/**
 * Load type definitions for voltage drop calculation
 */
const loadTypes = {
  lighting: {
    name: 'Lighting',
    maxVoltageDrop: 3,
    description: 'Lighting circuits - most sensitive to voltage drop',
    typicalPowerFactor: 0.95
  },
  motor: {
    name: 'Motor',
    maxVoltageDrop: 5,
    description: 'Motor circuits - inductive loads',
    typicalPowerFactor: 0.85
  },
  heater: {
    name: 'Heater',
    maxVoltageDrop: 5,
    description: 'Heating circuits - resistive loads',
    typicalPowerFactor: 1.0
  },
  general: {
    name: 'General',
    maxVoltageDrop: 5,
    description: 'General purpose circuits',
    typicalPowerFactor: 0.9
  },
  socket: {
    name: 'Socket Outlet',
    maxVoltageDrop: 5,
    description: 'Socket outlet circuits',
    typicalPowerFactor: 0.9
  }
};

/**
 * Installation methods (DIN VDE 0298-4)
 */
const installationMethods = {
  method_3: {
    code: 'method_3',
    name: 'Fixed in conduit/cable tray',
    description: 'Cables in conduit, cable tray, or enclosed duct',
    referenceAmbient: 30,
    notes: 'Most conservative ampacity values'
  },
  method_4: {
    code: 'method_4',
    name: 'Surface mounted',
    description: 'Cables fixed on wall surface or cable ladder',
    referenceAmbient: 30,
    notes: 'Higher ampacity due to better heat dissipation'
  },
  method_7: {
    code: 'method_7',
    name: 'Buried in ground',
    description: 'Directly buried or in buried ducts',
    referenceAmbient: 25,
    notes: 'Soil thermal resistivity affects capacity'
  }
};

/**
 * Protection coordination requirements (DIN VDE 0100-430)
 */
const protectionCoordination = {
  // Maximum disconnection times for TN systems (seconds)
  maxDisconnectTime: {
    // For final circuits not exceeding 32A
    '230V': 0.4,  // seconds
    '400V': 0.2,
    // For distribution circuits and circuits > 32A
    distribution: 5.0
  },
  // Minimum selectivity ratio between upstream and downstream devices
  minSelectivityRatio: 1.6,
  // Maximum loop impedance formulas
  // Zs_max = U0 / (Ia × k)
  // where U0 = nominal voltage, Ia = trip current, k = safety factor (typically 0.8)
  safetyFactor: 0.8
};

/**
 * Standard protection device sizes (DIN VDE 0641-11)
 */
const standardProtectionSizes = {
  MCB: [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100],
  fuse: [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250]
};

/**
 * Non-conformity severity levels
 */
const severityLevels = {
  INFO: {
    code: 'INFO',
    name: 'Information',
    description: 'For informational purposes only',
    color: '#0066cc',
    icon: 'info'
  },
  WARNING: {
    code: 'WARNING',
    name: 'Warning',
    description: 'May cause issues but circuit can operate',
    color: '#ff9900',
    icon: 'warning'
  },
  CRITICAL: {
    code: 'CRITICAL',
    name: 'Critical',
    description: 'Safety hazard - must be corrected before operation',
    color: '#cc0000',
    icon: 'error'
  }
};

/**
 * Non-conformity categories
 */
const nonConformityCategories = {
  CABLE: 'Cable',
  PROTECTION: 'Protection',
  VOLTAGE: 'Voltage',
  IMPEDANCE: 'Impedance',
  COORDINATION: 'Coordination',
  SHORT_CIRCUIT: 'Short Circuit'
};

/**
 * StandardsData class - Provides standards reference data lookup
 */
export class StandardsData {
  constructor() {
    this.validVoltages = validVoltages;
    this.validFrequencies = validFrequencies;
    this.maxVoltageDrop = maxVoltageDrop;
    this.loadTypes = loadTypes;
    this.installationMethods = installationMethods;
    this.protectionCoordination = protectionCoordination;
    this.standardProtectionSizes = standardProtectionSizes;
    this.severityLevels = severityLevels;
    this.nonConformityCategories = nonConformityCategories;
  }

  /**
   * Get all valid industrial voltages
   * @param {string} type - Voltage type ('singlePhase', 'threePhase', 'all')
   * @returns {number[]} Array of valid voltages
   */
  getValidIndustrialVoltages(type = 'all') {
    return [...(this.validVoltages[type] || this.validVoltages.all)];
  }

  /**
   * Check if a voltage is valid for industrial use
   * @param {number} voltage - Voltage to check
   * @returns {boolean} True if voltage is valid
   */
  isValidVoltage(voltage) {
    return this.validVoltages.all.includes(voltage);
  }

  /**
   * Get nearest valid voltage
   * @param {number} voltage - Input voltage
   * @returns {number} Nearest valid voltage
   */
  getNearestValidVoltage(voltage) {
    return this.validVoltages.all.reduce((prev, curr) =>
      Math.abs(curr - voltage) < Math.abs(prev - voltage) ? curr : prev
    );
  }

  /**
   * Get valid frequencies
   * @returns {number[]} Array of valid frequencies
   */
  getValidFrequencies() {
    return [...this.validFrequencies];
  }

  /**
   * Check if frequency is valid
   * @param {number} frequency - Frequency to check
   * @returns {boolean} True if frequency is valid
   */
  isValidFrequency(frequency) {
    return this.validFrequencies.includes(frequency);
  }

  /**
   * Get maximum voltage drop for load type
   * @param {string} loadType - Load type ('lighting', 'motor', 'heater', 'general')
   * @returns {number} Maximum voltage drop in percent
   */
  getMaxVoltageDrop(loadType) {
    return this.maxVoltageDrop[loadType] || this.maxVoltageDrop.default;
  }

  /**
   * Get load type information
   * @param {string} loadType - Load type code
   * @returns {Object|null} Load type data or null if not found
   */
  getLoadType(loadType) {
    return this.loadTypes[loadType] || null;
  }

  /**
   * Get all load types
   * @returns {string[]} Array of load type codes
   */
  getLoadTypes() {
    return Object.keys(this.loadTypes);
  }

  /**
   * Get installation method information
   * @param {string} method - Installation method code
   * @returns {Object|null} Installation method data or null if not found
   */
  getInstallationMethod(method) {
    return this.installationMethods[method] || null;
  }

  /**
   * Get all installation methods
   * @returns {string[]} Array of installation method codes
   */
  getInstallationMethods() {
    return Object.keys(this.installationMethods);
  }

  /**
   * Get maximum disconnection time for a voltage level
   * @param {number} voltage - Voltage in Volts
   * @param {boolean} isDistribution - True if distribution circuit
   * @returns {number} Maximum disconnection time in seconds
   */
  getMaxDisconnectTime(voltage, isDistribution = false) {
    if (isDistribution) {
      return this.protectionCoordination.maxDisconnectTime.distribution;
    }
    const key = `${voltage}V`;
    return this.protectionCoordination.maxDisconnectTime[key] || 0.4;
  }

  /**
   * Get standard protection device sizes
   * @param {string} deviceType - Device type ('MCB', 'fuse')
   * @returns {number[]} Array of standard sizes in Amps
   */
  getStandardProtectionSizes(deviceType = 'MCB') {
    return [...(this.standardProtectionSizes[deviceType] || this.standardProtectionSizes.MCB)];
  }

  /**
   * Get next standard protection size
   * @param {string} deviceType - Device type
   * @param {number} current - Current value
   * @returns {number|null} Next standard size or null if exceeds range
   */
  getNextStandardSize(deviceType, current) {
    const sizes = this.getStandardProtectionSizes(deviceType);
    for (const size of sizes) {
      if (size >= current) {
        return size;
      }
    }
    return null;
  }

  /**
   * Get temperature derating factor
   * @param {string} installationMethod - Installation method
   * @param {number} temperature - Ambient temperature in °C
   * @param {number} referenceTemp - Reference temperature (default 30°C)
   * @returns {number} Derating factor
   */
  getTemperatureDerating(installationMethod, temperature, referenceTemp = 30) {
    // This is a simplified model - actual values come from DIN VDE 0298-4 tables
    // For method_7 (buried), reference is 25°C, others are 30°C
    const method = this.installationMethods[installationMethod];
    const ref = method?.referenceAmbient || referenceTemp;
    
    if (temperature <= ref) {
      return 1.0 + (ref - temperature) * 0.003; // Slight increase below reference
    } else {
      return 1.0 - (temperature - ref) * 0.01; // Decrease above reference
    }
  }

  /**
   * Calculate maximum loop impedance
   * @param {number} voltage - Nominal voltage
   * @param {number} tripCurrent - Protection device trip current
   * @returns {number} Maximum loop impedance in Ohms
   */
  calculateMaxLoopImpedance(voltage, tripCurrent) {
    const k = this.protectionCoordination.safetyFactor;
    return voltage / (tripCurrent * k);
  }

  /**
   * Get severity level information
   * @param {string} severity - Severity code
   * @returns {Object|null} Severity level data or null if not found
   */
  getSeverityLevel(severity) {
    return this.severityLevels[severity] || null;
  }

  /**
   * Get all severity levels
   * @returns {string[]} Array of severity level codes
   */
  getSeverityLevels() {
    return Object.keys(this.severityLevels);
  }

  /**
   * Get non-conformity category
   * @param {string} category - Category code
   * @returns {string|null} Category name or null if not found
   */
  getCategory(category) {
    return this.nonConformityCategories[category] || null;
  }

  /**
   * Get all non-conformity categories
   * @returns {string[]} Array of category codes
   */
  getCategories() {
    return Object.keys(this.nonConformityCategories);
  }
}

// Export singleton instance for convenience
export const standardsData = new StandardsData();

// Export data for direct access if needed
export { 
  validVoltages, 
  validFrequencies, 
  maxVoltageDrop, 
  loadTypes, 
  installationMethods, 
  protectionCoordination,
  standardProtectionSizes,
  severityLevels,
  nonConformityCategories
};
