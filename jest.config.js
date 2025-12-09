/**
 * Jest Configuration for Abrechnung Application
 * Phase 6 - Testing Framework Setup
 */

export default {
  // Use jsdom for DOM testing
  testEnvironment: 'jsdom',
  
  // Transform ES6 modules
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Module paths
  moduleNameMapper: {
    // Map XLSX library (if needed)
    '\\.(xlsx)$': '<rootDir>/js/libs/xlsx.min.js'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/libs/**',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Verbose output
  verbose: true
};
