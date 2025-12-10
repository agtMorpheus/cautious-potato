/**
 * Validation Rules Module
 * DIN VDE 0100 Series - Electrical circuit validation rules
 * 
 * Defines all 7 validation rules for circuit measurement validation:
 * 1. CABLE_UNDERSIZED_AMPACITY - Cable current capacity check
 * 2. VOLTAGE_DROP_EXCESSIVE - Voltage drop limit check
 * 3. PROTECTION_DEVICE_UNDERSIZED - Protection device sizing check
 * 4. IMPEDANCE_TOO_HIGH_PROTECTION_INADEQUATE - Loop impedance check
 * 5. VOLTAGE_OUT_OF_RANGE - Voltage range compliance check
 * 6. CABLE_VOLTAGE_RATING_EXCEEDED - Cable voltage rating check
 * 7. COORDINATION_NOT_SELECTIVE - Selectivity coordination check
 */

/**
 * Rule 1: Cable Ampacity (Undersized Cable)
 * DIN VDE 0100-430:2016 §433.1.2
 */
export const cableAmpacityRule = {
  code: 'CABLE_UNDERSIZED_AMPACITY',
  name: 'Cable current capacity insufficient',
  category: 'CABLE',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['current', 'cableGauge', 'cableType'],
    minInputs: 3,
  },
  
  description: 'The cable wire gauge cannot carry the circuit current safely. ' +
               'Current-carrying capacity (ampacity) must be ≥ circuit current.',
  
  calculate: (circuitData, cableLib, _protectionLib, _standardsData) => {
    const { 
      current, 
      cableGauge, 
      cableType = 'NYY', 
      installationMethod = 'method_3', 
      ambientTemp = 30,
      groupingCount = 1
    } = circuitData;
    
    // Get ampacity from library with derating factors
    const ampacityResult = cableLib.getAmpacity(
      cableType,
      cableGauge,
      installationMethod,
      ambientTemp,
      groupingCount
    );
    
    if (ampacityResult.deratedAmpacity === null) {
      return {
        actual: current,
        limit: null,
        unit: 'A',
        compliant: false,
        error: ampacityResult.error
      };
    }
    
    const baseAmpacity = ampacityResult.deratedAmpacity;
    
    return {
      actual: current,
      limit: baseAmpacity,
      unit: 'A',
      compliant: current <= baseAmpacity,
      margin: baseAmpacity - current,
      percentUsed: Number(((current / baseAmpacity) * 100).toFixed(1)),
      ampacityDetails: ampacityResult
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §433.1.2',
  
  remedyOptions: (result, circuitData, cableLib) => {
    const recommendations = [];
    if (result.percentUsed > 100) {
      // Find minimum gauge needed
      const minGauge = cableLib?.findMinimumGauge(
        circuitData?.cableType || 'NYY',
        result.actual * 1.1, // 10% margin
        circuitData?.installationMethod || 'method_3',
        circuitData?.ambientTemp || 30,
        circuitData?.groupingCount || 1
      );
      
      if (minGauge) {
        recommendations.push(`Upgrade cable to ${minGauge}mm² or larger`);
      } else {
        recommendations.push('Upgrade cable to larger gauge');
      }
      recommendations.push('Reduce circuit current if possible');
      recommendations.push('Improve installation method for better heat dissipation');
    }
    return recommendations;
  },
};

/**
 * Rule 2: Voltage Drop
 * DIN VDE 0100-520:2016 §525.2
 */
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
  
  calculate: (circuitData, cableLib, _protectionLib, standardsData) => {
    const { 
      voltage, 
      current, 
      cableGauge, 
      distance, 
      phasesCount = 3, 
      loadType = 'general',
      powerFactor = 0.85,
      cableType = 'NYY'
    } = circuitData;
    
    // Calculate voltage drop
    const dropResult = cableLib.calculateVoltageDrop(
      cableGauge,
      distance,
      current,
      phasesCount,
      voltage,
      powerFactor,
      cableType
    );
    
    if (dropResult.dropPercent === null) {
      return {
        actual: null,
        limit: null,
        compliant: false,
        error: dropResult.error
      };
    }
    
    // Get load-dependent limit
    const maxDrop = standardsData.getMaxVoltageDrop(loadType);
    
    return {
      actual: dropResult.dropPercent,
      limit: maxDrop,
      unit: '%',
      compliant: dropResult.dropPercent <= maxDrop,
      voltageDropAbsolute: dropResult.dropVoltage,
      voltageDropUnit: 'V',
      percentageExceeded: Math.max(0, dropResult.dropPercent - maxDrop).toFixed(2),
      loadType
    };
  },
  
  normReference: 'DIN VDE 0100-520:2016 §525.2',
  
  remedyOptions: (result) => [
    'Increase cable gauge to reduce resistance and voltage drop',
    'Reduce cable length if possible (relocate protection device closer)',
    `For long runs (>30m), consider larger cable gauge`,
    'Consider parallel cables to reduce effective resistance',
  ],
};

/**
 * Rule 3: Protection Device Sizing
 * DIN VDE 0100-430:2016 §433.1.1
 */
export const protectionDeviceSizingRule = {
  code: 'PROTECTION_DEVICE_UNDERSIZED',
  name: 'Protection device rating insufficient for circuit current',
  category: 'PROTECTION',
  severity: 'CRITICAL',
  
  triggers: {
    requiredFields: ['current', 'protectionCurrent'],
    minInputs: 2,
  },
  
  description: 'The protection device current rating (In) must be ≥ circuit current (Ib). ' +
               'Standard condition: In ≥ Ib. Practical: Select next standard size ≥ Ib.',
  
  calculate: (circuitData, _cableLib, _protectionLib, standardsData) => {
    const { current, protectionCurrent, protectionDeviceType } = circuitData;
    
    // Get next standard size if current size insufficient
    const deviceType = protectionDeviceType?.includes('MCB') ? 'MCB' : 'MCB';
    const standardSizes = standardsData.getStandardProtectionSizes(deviceType);
    const minRequired = standardSizes.find(s => s >= current);
    
    const marginPercent = protectionCurrent > 0 
      ? ((protectionCurrent - current) / current * 100).toFixed(1)
      : 0;
    
    return {
      actual: current,
      limit: protectionCurrent,
      unit: 'A',
      compliant: protectionCurrent >= current,
      marginPercent,
      nextStandardSize: minRequired,
      oversized: protectionCurrent > current * 1.25, // Flag significant oversizing
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §433.1.1',
  
  remedyOptions: (result) => {
    const recommendations = [];
    if (result.nextStandardSize) {
      recommendations.push(`Replace with protection device rated ${result.nextStandardSize}A or higher`);
    } else {
      recommendations.push('Replace with higher-rated protection device');
    }
    recommendations.push('Verify circuit load can be reduced if downsizing is required');
    recommendations.push('Install separate protection device for branch circuit');
    return recommendations;
  },
};

/**
 * Rule 4: Loop Impedance & Fault Protection
 * DIN VDE 0100-430:2016 §411.4
 */
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
  
  calculate: (circuitData, _cableLib, protectionLib, standardsData) => {
    const { voltage, protectionCurrent, loopImpedance, protectionDeviceType } = circuitData;
    
    // Get trip point factor for the device
    const tripPoint = protectionLib.getTripPointFactor(protectionDeviceType || 'B');
    
    // Minimum fault current to trip device
    const minFaultCurrent = protectionCurrent * tripPoint.min;
    
    // Actual fault current at given impedance
    const actualFaultCurrent = voltage / loopImpedance;
    
    // Calculate maximum allowed impedance
    const safetyFactor = standardsData.protectionCoordination.safetyFactor;
    const maxImpedance = voltage / (minFaultCurrent * safetyFactor);
    
    return {
      actual: loopImpedance,
      limit: Number(maxImpedance.toFixed(4)),
      unit: 'Ω',
      compliant: loopImpedance <= maxImpedance,
      faultCurrent: Number(actualFaultCurrent.toFixed(1)),
      faultCurrentUnit: 'A',
      minFaultCurrent: Number(minFaultCurrent.toFixed(1)),
      trippingMargin: Number(((actualFaultCurrent / minFaultCurrent) * 100).toFixed(1)),
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §411.4',
  
  remedyOptions: () => [
    'Reduce loop impedance by using larger PE (protective earth) cable',
    'Install RCD (residual current device) for additional protection',
    'Use protection device with lower trip point (Type B instead of Type C)',
    'Improve connection resistance at source and destination',
  ],
};

/**
 * Rule 5: Voltage Range Compliance
 * DIN VDE 0100-200:2016 §200.2
 */
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
  
  calculate: (circuitData, _cableLib, _protectionLib, standardsData) => {
    const { voltage } = circuitData;
    
    const validVoltages = standardsData.getValidIndustrialVoltages();
    const isValid = validVoltages.includes(voltage);
    const nearest = standardsData.getNearestValidVoltage(voltage);
    
    return {
      actual: voltage,
      limit: validVoltages.join(', '),
      unit: 'V',
      compliant: isValid,
      nearestValidVoltage: nearest,
      validVoltages
    };
  },
  
  normReference: 'DIN VDE 0100-200:2016 §200.2',
  
  remedyOptions: (result) => [
    `Use circuit voltage: ${result.nearestValidVoltage}V`,
    'Install transformer to convert to standard voltage',
    'Check circuit power source configuration',
  ],
};

/**
 * Rule 6: Cable Voltage Rating
 * DIN VDE 0100-430:2016 §433.2.1
 */
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
               'For example, NYY cables rated 0.6kV (600V) are suitable for ≤400V circuits.',
  
  calculate: (circuitData, cableLib) => {
    const { voltage, cableType } = circuitData;
    
    const cable = cableLib.getCable(cableType);
    if (!cable) {
      return {
        actual: voltage,
        limit: null,
        compliant: false,
        error: `Cable type ${cableType} not found`
      };
    }
    
    const ratedVoltage = cable.voltageRating * 1000; // Convert kV to V
    
    return {
      actual: voltage,
      limit: ratedVoltage,
      unit: 'V',
      compliant: voltage <= ratedVoltage,
      margin: ratedVoltage - voltage,
      cableType,
      cableRating: `${cable.voltageRating}kV`
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §433.2.1',
  
  remedyOptions: () => [
    'Select cable type rated for higher voltage (e.g., NYY 1.0kV)',
    'Reduce circuit voltage if possible',
    'Use parallel circuits at lower voltage',
  ],
};

/**
 * Rule 7: Selective Coordination (Upstream/Downstream Protection)
 * DIN VDE 0100-430:2016 §434.4
 */
export const selectiveCoordinationRule = {
  code: 'COORDINATION_NOT_SELECTIVE',
  name: 'Protection device coordination not selective',
  category: 'COORDINATION',
  severity: 'WARNING',
  
  triggers: {
    requiredFields: ['upstreamDeviceType', 'downstreamDeviceType'],
    minInputs: 2,
  },
  
  description: 'When multiple protection devices protect a circuit, downstream devices ' +
               'should trip before upstream devices in case of fault. This ensures only ' +
               'the affected circuit is disconnected, not the entire installation.',
  
  calculate: (circuitData, _cableLib, protectionLib) => {
    const { upstreamDeviceType, downstreamDeviceType, loopImpedance } = circuitData;
    
    // Check selectivity
    const selectivityResult = protectionLib.isSelective(
      upstreamDeviceType,
      downstreamDeviceType,
      loopImpedance
    );
    
    return {
      actual: selectivityResult.isSelective ? 'selective' : 'not selective',
      compliant: selectivityResult.isSelective,
      upstreamDevice: upstreamDeviceType,
      downstreamDevice: downstreamDeviceType,
      ratio: selectivityResult.ratio,
      reason: selectivityResult.reason,
      recommendation: selectivityResult.recommendation,
      note: selectivityResult.note || 'Consult device I-t curves for exact selectivity margins',
    };
  },
  
  normReference: 'DIN VDE 0100-430:2016 §434.4',
  
  remedyOptions: (result) => {
    const recommendations = [];
    if (result.recommendation) {
      recommendations.push(result.recommendation);
    }
    recommendations.push('Select downstream device with lower current rating');
    recommendations.push('Use RCD device upstream with appropriate time delay');
    recommendations.push('Reduce downstream device trip point (Type B vs Type C)');
    recommendations.push('Consult manufacturer selectivity tables');
    return recommendations;
  },
};

/**
 * All validation rules array
 */
export const validationRules = [
  cableAmpacityRule,
  voltageDropRule,
  protectionDeviceSizingRule,
  loopImpedanceRule,
  voltageRangeRule,
  cableVoltageRatingRule,
  selectiveCoordinationRule,
];

/**
 * Get rule by code
 * @param {string} code - Rule code
 * @returns {Object|null} Rule object or null if not found
 */
export function getRuleByCode(code) {
  return validationRules.find(rule => rule.code === code) || null;
}

/**
 * Get rules by category
 * @param {string} category - Rule category
 * @returns {Object[]} Array of rules in the category
 */
export function getRulesByCategory(category) {
  return validationRules.filter(rule => rule.category === category);
}

/**
 * Get rules by severity
 * @param {string} severity - Severity level
 * @returns {Object[]} Array of rules with the severity
 */
export function getRulesBySeverity(severity) {
  return validationRules.filter(rule => rule.severity === severity);
}
