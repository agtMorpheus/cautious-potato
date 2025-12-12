/**
 * Jest Test Setup
 * Phase 6 Testing Framework
 */

// Mock global objects that don't exist in jsdom
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// IMPORTANT: In jsdom environment, window.localStorage needs to be set to the same mock
// This ensures code using window.localStorage uses our mock
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true
  });
}

// Mock XLSX library
global.XLSX = {
  read: jest.fn(),
  write: jest.fn(),
  writeFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
    decode_range: jest.fn(),
    decode_cell: jest.fn(),
    encode_cell: jest.fn()
  }
};

// Mock URL API
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Mock FileReader
global.FileReader = jest.fn(() => ({
  readAsArrayBuffer: jest.fn(),
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  onload: null,
  onerror: null,
  onprogress: null,
  result: null,
  error: null,
  readyState: 0
}));

// Mock File constructor
global.File = jest.fn((bits, name, options) => ({
  name: name || 'mock-file.txt',
  size: bits ? bits.join('').length : 0,
  type: options?.type || 'text/plain',
  lastModified: Date.now(),
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
  text: jest.fn(() => Promise.resolve(bits ? bits.join('') : '')),
  stream: jest.fn()
}));

// Mock Blob constructor
global.Blob = jest.fn((parts, options) => ({
  size: parts ? parts.join('').length : 0,
  type: options?.type || '',
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
  text: jest.fn(() => Promise.resolve(parts ? parts.join('') : '')),
  stream: jest.fn()
}));

// Mock fetch for template loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    text: () => Promise.resolve('mock response'),
    json: () => Promise.resolve({})
  })
);

// Mock DOM methods
const mockElement = {
  textContent: '',
  innerHTML: '',
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
    toggle: jest.fn()
  },
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  removeAttribute: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getBoundingClientRect: jest.fn(() => ({
    width: 100,
    height: 40,
    top: 0,
    left: 0,
    bottom: 40,
    right: 100
  })),
  focus: jest.fn(),
  blur: jest.fn(),
  click: jest.fn(),
  disabled: false,
  value: '',
  checked: false,
  files: []
};

// Mock document
global.document = {
  getElementById: jest.fn(() => mockElement),
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [mockElement]),
  createElement: jest.fn(() => mockElement),
  createTextNode: jest.fn(() => ({ textContent: '' })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    ...mockElement
  },
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    ...mockElement
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 'complete',
  location: {
    href: 'http://localhost/abrechnung-app/',
    origin: 'http://localhost',
    pathname: '/abrechnung-app/',
    search: '',
    hash: ''
  }
};

// Mock window
global.window = {
  ...global,
  document: global.document,
  location: global.document.location,
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  performance: global.performance,
  URL: global.URL,
  File: global.File,
  Blob: global.Blob,
  FileReader: global.FileReader,
  fetch: global.fetch,
  XLSX: global.XLSX,
  alert: jest.fn(),
  confirm: jest.fn(() => true),
  prompt: jest.fn(),
  open: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getComputedStyle: jest.fn(() => ({
    getPropertyValue: jest.fn(),
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    fontSize: '16px',
    fontWeight: '400',
    display: 'block',
    outline: 'none',
    boxShadow: 'none'
  })),
  matchMedia: jest.fn(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn()
  })),
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
  cancelAnimationFrame: jest.fn(),
  setTimeout: jest.fn((fn, delay) => setTimeout(fn, delay)),
  clearTimeout: jest.fn(id => clearTimeout(id)),
  setInterval: jest.fn((fn, delay) => setInterval(fn, delay)),
  clearInterval: jest.fn(id => clearInterval(id))
};

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn()
};

// Restore console for test debugging when needed
global.console.restore = () => {
  global.console = originalConsole;
};

// Custom matchers
expect.extend({
  toBeValidState(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 received.hasOwnProperty('protokollData') &&
                 received.hasOwnProperty('abrechnungData') &&
                 received.hasOwnProperty('ui') &&
                 received.hasOwnProperty('meta');
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid state object`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid state object with protokollData, abrechnungData, ui, and meta properties`,
        pass: false
      };
    }
  },
  
  toHaveValidPositionFormat(received) {
    const positionRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    const pass = typeof received === 'string' && positionRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid position format`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to have valid position format (XX.XX.XXXX)`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  createMockFile: (name = 'test.xlsx', content = 'mock content', type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') => {
    return new File([content], name, { type });
  },
  
  createMockWorkbook: () => ({
    SheetNames: ['Sheet1'],
    Sheets: {
      'Sheet1': {
        'U3': { v: 'PROT-001' },
        'N5': { v: 'ORD-001' },
        'A10': { v: 'Factory A' },
        'T10': { v: 'Building 1' },
        'T7': { v: 'Test Company' },
        'A30': { v: '01.01.0010' },
        'B30': { v: 5 },
        'A31': { v: '01.01.0020' },
        'B31': { v: 3 }
      }
    }
  }),
  
  createMockPositions: () => [
    { posNr: '01.01.0010', menge: 5, rowIndex: 30 },
    { posNr: '01.01.0020', menge: 3, rowIndex: 31 },
    { posNr: '01.01.0010', menge: 2, rowIndex: 32 }
  ],
  
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  flushPromises: () => new Promise(resolve => setImmediate(resolve))
};

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset localStorage mock
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset XLSX mock - only if the methods exist (some tests override with custom mocks)
  if (global.XLSX?.read?.mockReturnValue) {
    global.XLSX.read.mockReturnValue(testUtils.createMockWorkbook());
  }
  if (global.XLSX?.write?.mockReturnValue) {
    global.XLSX.write.mockReturnValue(new ArrayBuffer(8));
  }
  
  // Reset fetch mock
  global.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
  });
  
  // Reset FileReader mock
  const FileReaderMock = jest.fn(function() {
    this.readAsArrayBuffer = jest.fn(function() {
      setTimeout(() => {
        this.onload && this.onload({ target: { result: new ArrayBuffer(8) } });
      }, 0);
    });
    this.readAsText = jest.fn();
    this.readAsDataURL = jest.fn();
    this.onload = null;
    this.onerror = null;
    this.result = null;
    return this;
  });
  global.FileReader = FileReaderMock;
});

afterEach(() => {
  // Clean up any timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Warning: ReactDOM.render is deprecated')) {
    return;
  }
  originalWarn.apply(console, args);
};// Polyfill structuredClone
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = (obj) => {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  };
}
