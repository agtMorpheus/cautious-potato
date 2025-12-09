/**
 * Jest Setup File
 * Runs before each test suite
 */

// Polyfill structuredClone if not available (jsdom doesn't have it)
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Create localStorage mock with jest functions
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _store: store
  };
})();

// Override the window's localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Also set on global for consistency
global.localStorage = localStorageMock;

// Mock XLSX library if needed
global.XLSX = {
  read: jest.fn(),
  write: jest.fn(),
  writeFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  }
};

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  localStorageMock.clear(); // Actually clear the store
});
