/**
 * Unit Tests for Welcome Messages UI Module (welcome-messages-ui.js)
 * Tests the welcome message display component
 */

// Mock the welcome-messages module
jest.mock('../../js/modules/dashboard/welcome-messages.js', () => ({
  getMessageOfDay: jest.fn(() => 'Test welcome message of the day'),
  getMessageIndex: jest.fn(() => 5),
  getTotalMessages: jest.fn(() => 30)
}));

import {
  init,
  updateMessage,
  destroy,
  isReady
} from '../../js/modules/dashboard/welcome-messages-ui.js';

import {
  getMessageOfDay,
  getMessageIndex,
  getTotalMessages
} from '../../js/modules/dashboard/welcome-messages.js';

describe('Welcome Messages UI Module (welcome-messages-ui.js)', () => {
  let container;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset module state by destroying
    try {
      destroy();
    } catch (e) {
      // Ignore if not initialized
    }
    
    // Create container element
    container = document.createElement('div');
    container.id = 'welcome-message-container';
    document.body.appendChild(container);
    
    // Mock requestAnimationFrame and cancelAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  describe('init()', () => {
    test('initializes the module', () => {
      init();
      
      expect(isReady()).toBe(true);
    });

    test('renders message in container', () => {
      init();
      
      expect(container.innerHTML).not.toBe('');
    });

    test('calls getMessageOfDay', () => {
      init();
      
      expect(getMessageOfDay).toHaveBeenCalled();
    });

    test('calls getMessageIndex', () => {
      init();
      
      expect(getMessageIndex).toHaveBeenCalled();
    });

    test('calls getTotalMessages', () => {
      init();
      
      expect(getTotalMessages).toHaveBeenCalled();
    });

    test('does not re-initialize when already initialized', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      init();
      const firstCallCount = getMessageOfDay.mock.calls.length;
      
      init();
      
      // Should only be called once
      expect(getMessageOfDay.mock.calls.length).toBe(firstCallCount);
      
      consoleSpy.mockRestore();
    });

    test('warns when container not found', () => {
      document.body.innerHTML = ''; // Remove container
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      init();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Container not found')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rendered Content', () => {
    beforeEach(() => {
      init();
    });

    test('renders welcome message wrapper', () => {
      const wrapper = container.querySelector('.welcome-message-wrapper');
      expect(wrapper).not.toBeNull();
    });

    test('renders message icon', () => {
      const icon = container.querySelector('.welcome-message-icon');
      expect(icon).not.toBeNull();
    });

    test('renders message content area', () => {
      const content = container.querySelector('.welcome-message-content');
      expect(content).not.toBeNull();
    });

    test('renders message text', () => {
      const text = container.querySelector('.welcome-message-text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('Test welcome message of the day');
    });

    test('renders message counter', () => {
      const counter = container.querySelector('.welcome-message-counter');
      expect(counter).not.toBeNull();
      expect(counter.textContent).toBe('5/30');
    });

    test('counter has title attribute', () => {
      const counter = container.querySelector('.welcome-message-counter');
      expect(counter.getAttribute('title')).toBe('Nachricht 5 von 30');
    });

    test('message text has correct ID', () => {
      const text = document.getElementById('welcome-message-text');
      expect(text).not.toBeNull();
    });
  });

  describe('XSS Prevention', () => {
    test('escapes HTML in message', () => {
      getMessageOfDay.mockReturnValueOnce('<script>alert("xss")</script>');
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.innerHTML).not.toContain('<script>');
    });

    test('escapes special characters', () => {
      getMessageOfDay.mockReturnValueOnce('<img src="x" onerror="alert(1)">');
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.innerHTML).not.toContain('<img');
    });
  });

  describe('updateMessage()', () => {
    test('initializes if not ready', () => {
      // Don't call init first
      updateMessage();
      
      expect(isReady()).toBe(true);
    });

    test('re-renders with new message', () => {
      init();
      
      getMessageOfDay.mockReturnValueOnce('Updated message');
      
      updateMessage();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.textContent).toBe('Updated message');
    });

    test('updates counter', () => {
      init();
      
      getMessageIndex.mockReturnValueOnce(10);
      getTotalMessages.mockReturnValueOnce(50);
      
      updateMessage();
      
      const counter = container.querySelector('.welcome-message-counter');
      expect(counter.textContent).toBe('10/50');
    });
  });

  describe('destroy()', () => {
    test('clears container content', () => {
      init();
      
      destroy();
      
      expect(container.innerHTML).toBe('');
    });

    test('sets isReady to false', () => {
      init();
      expect(isReady()).toBe(true);
      
      destroy();
      
      expect(isReady()).toBe(false);
    });

    test('can be reinitialized after destroy', () => {
      init();
      destroy();
      
      init();
      
      expect(isReady()).toBe(true);
    });
  });

  describe('isReady()', () => {
    test('returns false before initialization', () => {
      expect(isReady()).toBe(false);
    });

    test('returns true after initialization', () => {
      init();
      
      expect(isReady()).toBe(true);
    });

    test('returns false after destroy', () => {
      init();
      destroy();
      
      expect(isReady()).toBe(false);
    });
  });

  describe('Marquee Animation', () => {
    test('checks for overflow after render', () => {
      jest.useFakeTimers();
      
      init();
      
      // Should set up overflow check
      jest.advanceTimersByTime(100);
      
      // Module should be initialized
      expect(isReady()).toBe(true);
    });

    test('adds resize event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      init();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty message', () => {
      getMessageOfDay.mockReturnValueOnce('');
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.textContent).toBe('');
    });

    test('handles null message', () => {
      getMessageOfDay.mockReturnValueOnce(null);
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text).not.toBeNull();
    });

    test('handles very long message', () => {
      const longMessage = 'A'.repeat(1000);
      getMessageOfDay.mockReturnValueOnce(longMessage);
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.textContent).toBe(longMessage);
    });

    test('handles unicode characters', () => {
      getMessageOfDay.mockReturnValueOnce('Willkommen! 🎉 Guten Morgen! ⚡');
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.textContent).toContain('🎉');
      expect(text.textContent).toContain('⚡');
    });

    test('handles German umlauts', () => {
      getMessageOfDay.mockReturnValueOnce('Schönen Tag! Grüße!');
      
      init();
      
      const text = container.querySelector('.welcome-message-text');
      expect(text.textContent).toContain('ö');
      expect(text.textContent).toContain('ü');
    });

    test('handles message index of 1', () => {
      getMessageIndex.mockReturnValueOnce(1);
      getTotalMessages.mockReturnValueOnce(1);
      
      init();
      
      const counter = container.querySelector('.welcome-message-counter');
      expect(counter.textContent).toBe('1/1');
    });
  });

  describe('Module Structure', () => {
    test('default export has init method', async () => {
      const mod = await import('../../js/modules/dashboard/welcome-messages-ui.js');
      expect(typeof mod.default.init).toBe('function');
    });

    test('default export has updateMessage method', async () => {
      const mod = await import('../../js/modules/dashboard/welcome-messages-ui.js');
      expect(typeof mod.default.updateMessage).toBe('function');
    });

    test('default export has destroy method', async () => {
      const mod = await import('../../js/modules/dashboard/welcome-messages-ui.js');
      expect(typeof mod.default.destroy).toBe('function');
    });

    test('default export has isReady method', async () => {
      const mod = await import('../../js/modules/dashboard/welcome-messages-ui.js');
      expect(typeof mod.default.isReady).toBe('function');
    });
  });

  describe('Accessibility', () => {
    test('message text is readable by screen readers', () => {
      init();
      
      const text = container.querySelector('.welcome-message-text');
      // Should be in the DOM and contain text
      expect(text.textContent).not.toBe('');
    });

    test('counter has accessible title', () => {
      init();
      
      const counter = container.querySelector('.welcome-message-counter');
      expect(counter.getAttribute('title')).toContain('Nachricht');
    });
  });
});
