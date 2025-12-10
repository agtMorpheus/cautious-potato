/**
 * Protection Device Library
 * DIN VDE 0641-11, 0664-100, 0636 - Protection device specifications
 * 
 * Provides protection device data for electrical circuit validation including:
 * - MCB (Miniature Circuit Breaker) characteristics
 * - RCD (Residual Current Device) specifications
 * - RCBO (Combined) specifications
 * - Fuse specifications
 */

/**
 * MCB (Miniature Circuit Breaker) characteristics - DIN VDE 0641-11
 * Trip point is a multiple of rated current (In)
 */
const mcbCharacteristics = {
  'B': {
    name: 'Type B - General circuits',
    tripPoint: { min: 3, max: 5 },  // Multiples of In
    magneticTrip: '3-5 × In',
    delay: 'short',
    uses: 'Resistive loads, general lighting, household circuits',
    instantTripTime: 0.1  // seconds (typical)
  },
  'C': {
    name: 'Type C - Inductive loads',
    tripPoint: { min: 5, max: 10 },
    magneticTrip: '5-10 × In',
    delay: 'medium',
    uses: 'Motors, transformers, mixed loads, industrial circuits',
    instantTripTime: 0.1
  },
  'D': {
    name: 'Type D - High inrush',
    tripPoint: { min: 10, max: 20 },
    magneticTrip: '10-20 × In',
    delay: 'long',
    uses: 'Large motors, welding equipment, X-ray machines, high inrush current loads',
    instantTripTime: 0.1
  },
  'K': {
    name: 'Type K - Motor protection',
    tripPoint: { min: 8, max: 14 },
    magneticTrip: '8-14 × In',
    delay: 'medium',
    uses: 'Motor protection with high inrush currents',
    instantTripTime: 0.1
  },
  'Z': {
    name: 'Type Z - Sensitive loads',
    tripPoint: { min: 2, max: 3 },
    magneticTrip: '2-3 × In',
    delay: 'very short',
    uses: 'Semiconductor protection, sensitive electronic equipment',
    instantTripTime: 0.05
  }
};

/**
 * RCD (Residual Current Device) types - DIN VDE 0664-100
 */
const rcdTypes = {
  'AC': {
    name: 'Type AC - Standard',
    standard: 'DIN VDE 0664-100',
    sensitivities: [10, 30, 100, 300], // mA
    responseTime: 300, // ms max at In
    waveform: 'Sinusoidal AC only',
    uses: 'Standard residential and commercial installations'
  },
  'A': {
    name: 'Type A - DC sensitive',
    standard: 'DIN VDE 0664-100',
    sensitivities: [10, 30, 100, 300],
    responseTime: 200,
    waveform: 'AC and pulsating DC',
    uses: 'Variable frequency drives, rectifier circuits, electronic loads'
  },
  'F': {
    name: 'Type F - High frequency',
    standard: 'DIN VDE 0664-100',
    sensitivities: [10, 30, 100, 300],
    responseTime: 150,
    waveform: 'AC, pulsating DC, composite frequencies',
    uses: 'Single-phase VFDs, high-frequency equipment'
  },
  'B': {
    name: 'Type B - All current types',
    standard: 'DIN VDE 0664-100',
    sensitivities: [30, 100, 300, 500],
    responseTime: 150,
    waveform: 'AC, DC, all waveforms',
    uses: 'Three-phase VFDs, DC applications, medical equipment'
  }
};

/**
 * Standard protection device current ratings (Amperes) - DIN VDE 0641-11
 */
const standardCurrentRatings = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];

/**
 * Protection device library with pre-defined common configurations
 */
const protectionDevices = {
  // MCB Type B devices
  'MCB-B-6': { type: 'MCB', characteristic: 'B', current: 6, voltage: 400, poles: '1P/3P' },
  'MCB-B-10': { type: 'MCB', characteristic: 'B', current: 10, voltage: 400, poles: '1P/3P' },
  'MCB-B-13': { type: 'MCB', characteristic: 'B', current: 13, voltage: 400, poles: '1P/3P' },
  'MCB-B-16': { type: 'MCB', characteristic: 'B', current: 16, voltage: 400, poles: '1P/3P' },
  'MCB-B-20': { type: 'MCB', characteristic: 'B', current: 20, voltage: 400, poles: '1P/3P' },
  'MCB-B-25': { type: 'MCB', characteristic: 'B', current: 25, voltage: 400, poles: '1P/3P' },
  'MCB-B-32': { type: 'MCB', characteristic: 'B', current: 32, voltage: 400, poles: '1P/3P' },
  'MCB-B-40': { type: 'MCB', characteristic: 'B', current: 40, voltage: 400, poles: '1P/3P' },
  'MCB-B-50': { type: 'MCB', characteristic: 'B', current: 50, voltage: 400, poles: '1P/3P' },
  'MCB-B-63': { type: 'MCB', characteristic: 'B', current: 63, voltage: 400, poles: '1P/3P' },

  // MCB Type C devices
  'MCB-C-6': { type: 'MCB', characteristic: 'C', current: 6, voltage: 400, poles: '1P/3P' },
  'MCB-C-10': { type: 'MCB', characteristic: 'C', current: 10, voltage: 400, poles: '1P/3P' },
  'MCB-C-13': { type: 'MCB', characteristic: 'C', current: 13, voltage: 400, poles: '1P/3P' },
  'MCB-C-16': { type: 'MCB', characteristic: 'C', current: 16, voltage: 400, poles: '1P/3P' },
  'MCB-C-20': { type: 'MCB', characteristic: 'C', current: 20, voltage: 400, poles: '1P/3P' },
  'MCB-C-25': { type: 'MCB', characteristic: 'C', current: 25, voltage: 400, poles: '1P/3P' },
  'MCB-C-32': { type: 'MCB', characteristic: 'C', current: 32, voltage: 400, poles: '1P/3P' },
  'MCB-C-40': { type: 'MCB', characteristic: 'C', current: 40, voltage: 400, poles: '1P/3P' },
  'MCB-C-50': { type: 'MCB', characteristic: 'C', current: 50, voltage: 400, poles: '1P/3P' },
  'MCB-C-63': { type: 'MCB', characteristic: 'C', current: 63, voltage: 400, poles: '1P/3P' },
  'MCB-C-80': { type: 'MCB', characteristic: 'C', current: 80, voltage: 400, poles: '3P' },
  'MCB-C-100': { type: 'MCB', characteristic: 'C', current: 100, voltage: 400, poles: '3P' },

  // MCB Type D devices
  'MCB-D-6': { type: 'MCB', characteristic: 'D', current: 6, voltage: 400, poles: '1P/3P' },
  'MCB-D-10': { type: 'MCB', characteristic: 'D', current: 10, voltage: 400, poles: '1P/3P' },
  'MCB-D-16': { type: 'MCB', characteristic: 'D', current: 16, voltage: 400, poles: '1P/3P' },
  'MCB-D-20': { type: 'MCB', characteristic: 'D', current: 20, voltage: 400, poles: '1P/3P' },
  'MCB-D-25': { type: 'MCB', characteristic: 'D', current: 25, voltage: 400, poles: '1P/3P' },
  'MCB-D-32': { type: 'MCB', characteristic: 'D', current: 32, voltage: 400, poles: '1P/3P' },
  'MCB-D-40': { type: 'MCB', characteristic: 'D', current: 40, voltage: 400, poles: '1P/3P' },
  'MCB-D-50': { type: 'MCB', characteristic: 'D', current: 50, voltage: 400, poles: '1P/3P' },
  'MCB-D-63': { type: 'MCB', characteristic: 'D', current: 63, voltage: 400, poles: '1P/3P' },

  // RCD devices
  'RCD-AC-30': { type: 'RCD', typeClass: 'AC', sensitivity: 30, current: 40, voltage: 400, responseTime: 300 },
  'RCD-AC-100': { type: 'RCD', typeClass: 'AC', sensitivity: 100, current: 63, voltage: 400, responseTime: 300 },
  'RCD-AC-300': { type: 'RCD', typeClass: 'AC', sensitivity: 300, current: 63, voltage: 400, responseTime: 300 },
  'RCD-A-30': { type: 'RCD', typeClass: 'A', sensitivity: 30, current: 40, voltage: 400, responseTime: 200 },
  'RCD-A-100': { type: 'RCD', typeClass: 'A', sensitivity: 100, current: 63, voltage: 400, responseTime: 200 },
  'RCD-F-30': { type: 'RCD', typeClass: 'F', sensitivity: 30, current: 40, voltage: 400, responseTime: 150 },
  'RCD-B-30': { type: 'RCD', typeClass: 'B', sensitivity: 30, current: 40, voltage: 400, responseTime: 150 },

  // RCBO devices (combined MCB + RCD)
  'RCBO-B-16-30': { type: 'RCBO', characteristic: 'B', current: 16, rcdSensitivity: 30, voltage: 400 },
  'RCBO-B-20-30': { type: 'RCBO', characteristic: 'B', current: 20, rcdSensitivity: 30, voltage: 400 },
  'RCBO-C-16-30': { type: 'RCBO', characteristic: 'C', current: 16, rcdSensitivity: 30, voltage: 400 },
  'RCBO-C-20-30': { type: 'RCBO', characteristic: 'C', current: 20, rcdSensitivity: 30, voltage: 400 },
  'RCBO-C-32-30': { type: 'RCBO', characteristic: 'C', current: 32, rcdSensitivity: 30, voltage: 400 }
};

/**
 * I²t (let-through energy) characteristics for selectivity
 * Values in A²s (Ampere squared seconds)
 * These are typical values - actual values depend on specific device models
 */
const letThroughEnergy = {
  'B': {
    6: { i2t_min: 800, i2t_max: 3000 },
    10: { i2t_min: 2500, i2t_max: 8000 },
    16: { i2t_min: 7000, i2t_max: 22000 },
    20: { i2t_min: 12000, i2t_max: 35000 },
    25: { i2t_min: 20000, i2t_max: 55000 },
    32: { i2t_min: 35000, i2t_max: 90000 },
    40: { i2t_min: 55000, i2t_max: 140000 },
    50: { i2t_min: 90000, i2t_max: 220000 },
    63: { i2t_min: 150000, i2t_max: 350000 }
  },
  'C': {
    6: { i2t_min: 1500, i2t_max: 5000 },
    10: { i2t_min: 4500, i2t_max: 14000 },
    16: { i2t_min: 12000, i2t_max: 38000 },
    20: { i2t_min: 20000, i2t_max: 60000 },
    25: { i2t_min: 35000, i2t_max: 95000 },
    32: { i2t_min: 60000, i2t_max: 155000 },
    40: { i2t_min: 95000, i2t_max: 240000 },
    50: { i2t_min: 155000, i2t_max: 380000 },
    63: { i2t_min: 260000, i2t_max: 600000 }
  },
  'D': {
    6: { i2t_min: 3000, i2t_max: 10000 },
    10: { i2t_min: 9000, i2t_max: 28000 },
    16: { i2t_min: 24000, i2t_max: 75000 },
    20: { i2t_min: 40000, i2t_max: 120000 },
    25: { i2t_min: 70000, i2t_max: 190000 },
    32: { i2t_min: 120000, i2t_max: 310000 },
    40: { i2t_min: 190000, i2t_max: 480000 },
    50: { i2t_min: 310000, i2t_max: 750000 },
    63: { i2t_min: 520000, i2t_max: 1200000 }
  }
};

/**
 * ProtectionLibrary class - Provides protection device data lookup and calculations
 */
export class ProtectionLibrary {
  constructor() {
    this.mcbCharacteristics = mcbCharacteristics;
    this.rcdTypes = rcdTypes;
    this.devices = protectionDevices;
    this.standardCurrentRatings = standardCurrentRatings;
    this.letThroughEnergy = letThroughEnergy;
  }

  /**
   * Get protection device by code
   * @param {string} code - Device code (e.g., 'MCB-B-16', 'RCD-AC-30')
   * @returns {Object|null} Device specification or null if not found
   */
  getDevice(code) {
    return this.devices[code] || null;
  }

  /**
   * Get all available device codes
   * @returns {string[]} Array of device codes
   */
  getDeviceCodes() {
    return Object.keys(this.devices);
  }

  /**
   * Get MCB characteristic curve data
   * @param {string} characteristic - Characteristic type ('B', 'C', 'D', 'K', 'Z')
   * @returns {Object|null} Characteristic data or null if not found
   */
  getCharacteristic(characteristic) {
    return this.mcbCharacteristics[characteristic] || null;
  }

  /**
   * Get RCD type specification
   * @param {string} rcdType - RCD type ('AC', 'A', 'F', 'B')
   * @returns {Object|null} RCD type data or null if not found
   */
  getRCDType(rcdType) {
    return this.rcdTypes[rcdType] || null;
  }

  /**
   * Get standard protection current ratings
   * @returns {number[]} Array of standard current ratings in Amps
   */
  getStandardCurrentRatings() {
    return [...this.standardCurrentRatings];
  }

  /**
   * Get trip point factor for a device type
   * @param {string} deviceCode - Device code or characteristic
   * @returns {Object} Trip point { min, max } as multiples of rated current
   */
  getTripPointFactor(deviceCode) {
    // Try to get device first
    const device = this.getDevice(deviceCode);
    if (device && device.characteristic) {
      const characteristic = this.getCharacteristic(device.characteristic);
      if (characteristic) {
        return characteristic.tripPoint;
      }
    }

    // Try direct characteristic lookup
    const characteristic = this.getCharacteristic(deviceCode);
    if (characteristic) {
      return characteristic.tripPoint;
    }

    // Extract characteristic from device code pattern (e.g., "MCB-C-16")
    const match = deviceCode.match(/MCB-([BCDKZ])-/);
    if (match) {
      const char = this.getCharacteristic(match[1]);
      if (char) return char.tripPoint;
    }

    // Default to Type B
    return { min: 3, max: 5 };
  }

  /**
   * Find minimum protection device for a given current
   * @param {string} characteristic - MCB characteristic ('B', 'C', 'D')
   * @param {number} current - Required current in Amps
   * @returns {string|null} Device code or null if no suitable device
   */
  findMinimumDevice(characteristic, current) {
    for (const rating of this.standardCurrentRatings) {
      if (rating >= current) {
        const code = `MCB-${characteristic}-${rating}`;
        if (this.devices[code]) {
          return code;
        }
      }
    }
    return null;
  }

  /**
   * Get next standard protection size
   * @param {number} current - Current value in Amps
   * @returns {number|null} Next standard size or null if exceeds range
   */
  getNextStandardSize(current) {
    for (const rating of this.standardCurrentRatings) {
      if (rating >= current) {
        return rating;
      }
    }
    return null;
  }

  /**
   * Calculate minimum fault current required to trip device
   * @param {string} deviceCode - Device code
   * @param {string} tripType - Trip type ('instantaneous' or 'thermal')
   * @returns {Object} Minimum fault current data
   */
  getMinimumFaultCurrent(deviceCode, tripType = 'instantaneous') {
    const device = this.getDevice(deviceCode);
    if (!device) {
      return { current: null, error: `Device ${deviceCode} not found` };
    }

    const tripPoint = this.getTripPointFactor(deviceCode);
    const ratedCurrent = device.current;

    if (tripType === 'instantaneous') {
      return {
        current: ratedCurrent * tripPoint.min,
        ratedCurrent,
        tripPointMin: tripPoint.min,
        unit: 'A'
      };
    } else {
      // Thermal trip typically at 1.13 × In for 1 hour
      return {
        current: ratedCurrent * 1.13,
        ratedCurrent,
        tripPointThermal: 1.13,
        unit: 'A'
      };
    }
  }

  /**
   * Calculate trip time for a given fault current (simplified model)
   * @param {string} deviceCode - Device code
   * @param {number} faultCurrent - Fault current in Amps
   * @param {number} ratedCurrent - Device rated current (optional, derived from device)
   * @returns {Object} Trip time data
   */
  getTripTime(deviceCode, faultCurrent, ratedCurrent = null) {
    const device = this.getDevice(deviceCode);
    if (!device) {
      return { time: null, error: `Device ${deviceCode} not found` };
    }

    const In = ratedCurrent || device.current;
    const multiplier = faultCurrent / In;
    const tripPoint = this.getTripPointFactor(deviceCode);

    // Simplified trip time model
    let tripTime;
    let tripRegion;

    if (multiplier >= tripPoint.max) {
      // Instantaneous trip region
      tripTime = 10; // ~10ms for magnetic trip
      tripRegion = 'instantaneous';
    } else if (multiplier >= tripPoint.min) {
      // Magnetic trip region (may or may not trip instantly)
      tripTime = 100; // ~100ms variable region
      tripRegion = 'magnetic';
    } else if (multiplier >= 1.45) {
      // Thermal trip region (within 1 hour)
      tripTime = 3600000; // Up to 1 hour
      tripRegion = 'thermal';
    } else if (multiplier >= 1.13) {
      // Below thermal trip threshold
      tripTime = null;
      tripRegion = 'no_trip';
    } else {
      tripTime = null;
      tripRegion = 'no_trip';
    }

    return {
      time: tripTime,
      unit: 'ms',
      region: tripRegion,
      faultCurrentMultiplier: multiplier.toFixed(2)
    };
  }

  /**
   * Calculate let-through energy (I²t)
   * @param {string} deviceCode - Device code
   * @param {number} faultCurrent - Fault current in Amps
   * @param {number} duration - Duration in milliseconds (optional)
   * @returns {Object} Let-through energy data
   */
  calculateLetThroughEnergy(deviceCode, faultCurrent, duration = null) {
    const device = this.getDevice(deviceCode);
    if (!device || device.type !== 'MCB') {
      return { energy: null, error: 'Let-through energy only applicable for MCB devices' };
    }

    const characteristic = device.characteristic;
    const current = device.current;

    // Get I²t values from table
    const i2tData = this.letThroughEnergy[characteristic]?.[current];
    if (!i2tData) {
      // Calculate approximate value
      if (duration !== null) {
        const energy = faultCurrent * faultCurrent * (duration / 1000);
        return {
          energy: Math.round(energy),
          unit: 'A²s',
          source: 'calculated'
        };
      }
      return { energy: null, error: 'No I²t data available' };
    }

    return {
      energy_min: i2tData.i2t_min,
      energy_max: i2tData.i2t_max,
      unit: 'A²s',
      source: 'table'
    };
  }

  /**
   * Check selectivity between upstream and downstream devices
   * @param {string|Object} upstreamDevice - Upstream device code or object
   * @param {string|Object} downstreamDevice - Downstream device code or object
   * @param {number} loopImpedance - Loop impedance in Ohms (optional)
   * @returns {Object} Selectivity analysis result
   */
  isSelective(upstreamDevice, downstreamDevice, loopImpedance = null) {
    // Get device objects if codes provided
    const upstream = typeof upstreamDevice === 'string' 
      ? this.getDevice(upstreamDevice) 
      : upstreamDevice;
    const downstream = typeof downstreamDevice === 'string'
      ? this.getDevice(downstreamDevice)
      : downstreamDevice;

    if (!upstream || !downstream) {
      return {
        isSelective: false,
        error: 'One or both devices not found',
        recommendation: 'Verify device codes'
      };
    }

    // Basic selectivity rules:
    // 1. Upstream device should have higher current rating
    const upstreamCurrent = upstream.current;
    const downstreamCurrent = downstream.current;

    if (downstreamCurrent >= upstreamCurrent) {
      return {
        isSelective: false,
        reason: 'Downstream device has equal or higher current rating than upstream',
        recommendation: `Use downstream device rated < ${upstreamCurrent}A`
      };
    }

    // 2. Current ratio should be at least 1.6:1 for good selectivity
    const ratio = upstreamCurrent / downstreamCurrent;
    const minRatio = 1.6;

    if (ratio < minRatio) {
      return {
        isSelective: false,
        reason: `Current ratio ${ratio.toFixed(2)} is less than minimum ${minRatio}`,
        recommendation: `Increase upstream rating or decrease downstream rating`
      };
    }

    // 3. Check characteristic curves compatibility
    const upstreamChar = upstream.characteristic;
    const downstreamChar = downstream.characteristic;

    // Same characteristics are generally selective if ratio is sufficient
    // Different characteristics need careful analysis
    let characteristicNote = '';
    if (upstreamChar !== downstreamChar) {
      // Type B upstream with Type C downstream can have issues
      if (upstreamChar === 'B' && downstreamChar === 'C') {
        return {
          isSelective: false,
          reason: 'Type B upstream with Type C downstream may not be selective',
          recommendation: 'Use Type C or D upstream device'
        };
      }
      characteristicNote = `Different characteristics (${upstreamChar}/${downstreamChar}) - verify with manufacturer curves`;
    }

    return {
      isSelective: true,
      ratio: ratio.toFixed(2),
      upstreamCurrent,
      downstreamCurrent,
      note: characteristicNote || 'Selectivity appears adequate based on current ratings'
    };
  }
}

// Export singleton instance for convenience
export const protectionLibrary = new ProtectionLibrary();

// Export data for direct access if needed
export { mcbCharacteristics, rcdTypes, standardCurrentRatings, protectionDevices, letThroughEnergy };
