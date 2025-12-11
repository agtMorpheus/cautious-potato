/**
 * Dashboard Index Tests
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../js/modules/dashboard/welcome-messages.js', () => ({
  __esModule: true,
  default: { some: 'message' }
}));

jest.mock('../../js/modules/dashboard/welcome-messages-ui.js', () => ({
  __esModule: true,
  default: {
    init: jest.fn()
  },
  init: jest.fn() // if exported as named export too? The file uses export default mostly.
}));

// We need to import the mocked module to verify calls
import welcomeMessagesUI from '../../js/modules/dashboard/welcome-messages-ui.js';

// Import module under test
import * as dashboardIndex from '../../js/modules/dashboard/index.js';

describe('Dashboard Module Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  test('initDashboardModule initializes UI', () => {
    dashboardIndex.initDashboardModule();

    expect(welcomeMessagesUI.init).toHaveBeenCalled();
  });

  test('exports correct objects', () => {
    expect(dashboardIndex.default.welcomeMessages).toBeDefined();
    expect(dashboardIndex.default.welcomeMessagesUI).toBeDefined();
    expect(dashboardIndex.default.initDashboardModule).toBeDefined();
  });
});
