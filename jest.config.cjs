/**
 * Jest Configuration for Phase 6 Testing Framework
 * Abrechnung Application
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Module name mapping for imports
  moduleNameMapper: {
    // Map XLSX library
    '^xlsx$': '<rootDir>/js/libs/xlsx.min.js',
    
    // Map CSS imports (ignore in tests)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Map static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/libs/**',
    '!js/**/*.min.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './js/state.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './js/utils.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    'js'
  ],
  
  // Global variables available in tests
  globals: {
    'XLSX': {},
    'localStorage': {},
    'sessionStorage': {}
  },
  
  // Test results processor
  testResultsProcessor: '<rootDir>/tests/results-processor.js'
};