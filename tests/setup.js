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
    // Cell address encoding/decoding for metadata search
    decode_range: jest.fn((range) => {
      // Parse range like 'A1:Z50' to row/col indices
      const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (!match) return { s: { r: 0, c: 0 }, e: { r: 49, c: 25 } };
      const colToNum = (col) => col.split('').reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0) - 1;
      return {
        s: { r: parseInt(match[2]) - 1, c: colToNum(match[1]) },
        e: { r: parseInt(match[4]) - 1, c: colToNum(match[3]) }
      };
    }),
    encode_cell: jest.fn(({ r, c }) => {
      // Convert row/col indices to cell address like 'A1'
      const numToCol = (n) => {
        let result = '';
        n++;
        while (n > 0) {
          n--;
          result = String.fromCharCode(65 + (n % 26)) + result;
          n = Math.floor(n / 26);
        }
        return result;
      };
      return numToCol(c) + (r + 1);
    }),
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
