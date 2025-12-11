/**
 * Unit Tests for UI Module (ui.js)
 * Tests UI initialization and update functions
 */

import {
  initializeStaticUI,
  updateImportUI,
  updateGenerateUI,
  updateExportUI
} from '../../js/ui.js';

// Mock the escapeHtml import from handlers.js
jest.mock('../../js/handlers.js', () => ({
  escapeHtml: jest.fn((str) => str ? String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;') : str)
}));

describe('UI Module (ui.js)', () => {
  // Set up DOM before each test
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="global-messages"></div>
      <main class="main-content"></main>
      <div id="file-drop-zone">
        <span class="upload-link">Choose file</span>
      </div>
      <input type="file" id="file-input" />
      <button id="import-button"><span>Datei importieren</span></button>
      <div id="import-status" class="status-indicator"></div>
      <div id="import-message" class="status-message"></div>
      <div id="import-summary" hidden></div>
      <button id="generate-button"><span>Abrechnung erzeugen</span></button>
      <div id="generate-status" class="status-indicator"></div>
      <div id="generate-message" class="status-message"></div>
      <div id="generate-summary" hidden></div>
      <button id="export-button"><span>Abrechnung herunterladen</span></button>
      <div id="export-status" class="status-indicator"></div>
      <div id="export-message" class="status-message"></div>
      <div id="export-summary" hidden>
        <span id="export-last-date"></span>
        <span id="export-last-size"></span>
      </div>
    `;
    
    // Reset console.log spy
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('initializeStaticUI()', () => {
    test('sets aria-live attributes on global-messages', () => {
      initializeStaticUI();
      
      const globalMessages = document.getElementById('global-messages');
      expect(globalMessages.getAttribute('aria-live')).toBe('assertive');
      expect(globalMessages.getAttribute('role')).toBe('alert');
    });

    test('sets aria-live attribute on main-content', () => {
      initializeStaticUI();
      
      const mainElement = document.querySelector('.main-content');
      expect(mainElement.getAttribute('aria-live')).toBe('polite');
    });

    test('initializes file drop zone', () => {
      initializeStaticUI();
      
      const dropZone = document.getElementById('file-drop-zone');
      expect(dropZone.dataset.initialized).toBe('true');
    });

    test('does not reinitialize drop zone', () => {
      const dropZone = document.getElementById('file-drop-zone');
      dropZone.dataset.initialized = 'true';
      
      initializeStaticUI();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already initialized'));
    });

    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => initializeStaticUI()).not.toThrow();
    });

    test('drop zone click triggers file input click', () => {
      initializeStaticUI();
      
      const dropZone = document.getElementById('file-drop-zone');
      const fileInput = document.getElementById('file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');
      
      // Simulate click on drop zone
      dropZone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      expect(clickSpy).toHaveBeenCalled();
    });

    test('drop zone adds dragover class on dragenter', () => {
      initializeStaticUI();
      
      const dropZone = document.getElementById('file-drop-zone');
      
      dropZone.dispatchEvent(new Event('dragenter', { bubbles: true }));
      expect(dropZone.classList.contains('dragover')).toBe(true);
    });

    test('drop zone removes dragover class on dragleave', () => {
      initializeStaticUI();
      
      const dropZone = document.getElementById('file-drop-zone');
      dropZone.classList.add('dragover');
      
      dropZone.dispatchEvent(new Event('dragleave', { bubbles: true }));
      expect(dropZone.classList.contains('dragover')).toBe(false);
    });

    test('drop zone removes dragover class on drop', () => {
      initializeStaticUI();
      
      const dropZone = document.getElementById('file-drop-zone');
      dropZone.classList.add('dragover');
      
      const dropEvent = new Event('drop', { bubbles: true });
      dropEvent.dataTransfer = { files: [] };
      dropZone.dispatchEvent(dropEvent);
      
      expect(dropZone.classList.contains('dragover')).toBe(false);
    });
  });

  describe('updateImportUI()', () => {
    const createState = (overrides = {}) => ({
      ui: {
        import: {
          status: 'idle',
          message: '',
          fileName: null,
          ...overrides
        }
      },
      protokollData: {
        metadata: {},
        positionen: []
      }
    });

    test('updates status indicator class', () => {
      updateImportUI(createState({ status: 'pending' }));
      
      const status = document.getElementById('import-status');
      expect(status.classList.contains('status-pending')).toBe(true);
    });

    test('updates message text', () => {
      updateImportUI(createState({ message: 'Test message' }));
      
      const message = document.getElementById('import-message');
      expect(message.textContent).toBe('Test message');
    });

    test('shows default message when no message set', () => {
      updateImportUI(createState());
      
      const message = document.getElementById('import-message');
      expect(message.textContent).toBe('Keine Datei ausgewählt.');
    });

    test('shows file selected message when file is selected', () => {
      updateImportUI(createState({ fileName: 'test.xlsx', status: 'idle' }));
      
      const message = document.getElementById('import-message');
      expect(message.textContent).toContain('test.xlsx');
      expect(message.textContent).toContain('importieren');
    });

    test('disables button when status is pending', () => {
      updateImportUI(createState({ status: 'pending' }));
      
      const button = document.getElementById('import-button');
      expect(button.disabled).toBe(true);
    });

    test('shows import summary when protokollData is available', () => {
      const state = {
        ui: {
          import: { status: 'success', message: 'Success' }
        },
        protokollData: {
          metadata: {
            auftragsNr: 'ORD-001',
            protokollNr: 'PROT-001',
            anlage: 'Plant A',
            einsatzort: 'Location A',
            datum: '2025-01-01'
          },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        }
      };
      
      updateImportUI(state);
      
      const summary = document.getElementById('import-summary');
      expect(summary.hasAttribute('hidden')).toBe(false);
      expect(summary.innerHTML).toContain('ORD-001');
    });

    test('hides summary when no protokollData', () => {
      updateImportUI(createState());
      
      const summary = document.getElementById('import-summary');
      expect(summary.hasAttribute('hidden')).toBe(true);
    });

    test('changes button text when pending', () => {
      updateImportUI(createState({ status: 'pending' }));
      
      const button = document.getElementById('import-button');
      expect(button.querySelector('span').textContent).toBe('Importiere...');
    });

    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => updateImportUI(createState())).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('updateGenerateUI()', () => {
    const createState = (overrides = {}) => ({
      ui: {
        generate: {
          status: 'idle',
          message: '',
          generationTimeMs: 0,
          ...overrides
        }
      },
      protokollData: {
        metadata: {},
        positionen: []
      },
      abrechnungData: null
    });

    test('updates status indicator class', () => {
      updateGenerateUI(createState({ status: 'success' }));
      
      const status = document.getElementById('generate-status');
      expect(status.classList.contains('status-success')).toBe(true);
    });

    test('updates message text', () => {
      updateGenerateUI(createState({ message: 'Generation complete' }));
      
      const message = document.getElementById('generate-message');
      expect(message.textContent).toBe('Generation complete');
    });

    test('shows default message when no message set', () => {
      updateGenerateUI(createState());
      
      const message = document.getElementById('generate-message');
      expect(message.textContent).toBe('Noch keine Abrechnung erzeugt.');
    });

    test('disables button when pending', () => {
      updateGenerateUI(createState({ status: 'pending' }));
      
      const button = document.getElementById('generate-button');
      expect(button.disabled).toBe(true);
    });

    test('disables button when no valid input', () => {
      updateGenerateUI(createState());
      
      const button = document.getElementById('generate-button');
      expect(button.disabled).toBe(true);
    });

    test('enables button when valid protokollData is available', () => {
      const state = {
        ui: {
          generate: { status: 'idle', message: '' }
        },
        protokollData: {
          metadata: { auftragsNr: 'ORD-001' },
          positionen: [{ posNr: '01.01.0010', menge: 5 }]
        },
        abrechnungData: null
      };
      
      updateGenerateUI(state);
      
      const button = document.getElementById('generate-button');
      expect(button.disabled).toBe(false);
    });

    test('shows generate summary when abrechnungData is available', () => {
      const state = {
        ui: {
          generate: { status: 'success', message: 'Complete', generationTimeMs: 50 }
        },
        protokollData: { metadata: {}, positionen: [] },
        abrechnungData: {
          header: { orderNumber: 'ORD-001' },
          positionen: { '01.01.0010': 5, '01.01.0020': 3 }
        }
      };
      
      updateGenerateUI(state);
      
      const summary = document.getElementById('generate-summary');
      expect(summary.hasAttribute('hidden')).toBe(false);
      expect(summary.innerHTML).toContain('2'); // 2 unique positions
      expect(summary.innerHTML).toContain('8'); // total quantity
    });

    test('changes button text when pending', () => {
      updateGenerateUI(createState({ status: 'pending' }));
      
      const button = document.getElementById('generate-button');
      expect(button.querySelector('span').textContent).toBe('Erzeuge...');
    });

    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => updateGenerateUI(createState())).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('updateExportUI()', () => {
    const createState = (overrides = {}) => ({
      ui: {
        export: {
          status: 'idle',
          message: '',
          lastExportAt: null,
          lastExportSize: 0,
          ...overrides
        }
      },
      abrechnungData: null
    });

    test('updates status indicator class', () => {
      updateExportUI(createState({ status: 'error' }));
      
      const status = document.getElementById('export-status');
      expect(status.classList.contains('status-error')).toBe(true);
    });

    test('updates message text', () => {
      updateExportUI(createState({ message: 'Export successful' }));
      
      const message = document.getElementById('export-message');
      expect(message.textContent).toBe('Export successful');
    });

    test('shows default message when no message set', () => {
      updateExportUI(createState());
      
      const message = document.getElementById('export-message');
      expect(message.textContent).toBe('Noch keine Datei exportiert.');
    });

    test('disables button when pending', () => {
      updateExportUI(createState({ status: 'pending' }));
      
      const button = document.getElementById('export-button');
      expect(button.disabled).toBe(true);
    });

    test('disables button when no valid abrechnungData', () => {
      updateExportUI(createState());
      
      const button = document.getElementById('export-button');
      expect(button.disabled).toBe(true);
    });

    test('enables button when valid abrechnungData is available', () => {
      const state = {
        ui: {
          export: { status: 'idle', message: '' }
        },
        abrechnungData: {
          header: { orderNumber: 'ORD-001' },
          positionen: { '01.01.0010': 5 }
        }
      };
      
      updateExportUI(state);
      
      const button = document.getElementById('export-button');
      expect(button.disabled).toBe(false);
    });

    test('shows export summary with last export info', () => {
      const state = {
        ui: {
          export: {
            status: 'success',
            message: '',
            lastExportAt: '2025-12-11T05:00:00Z',
            lastExportSize: 10240
          }
        },
        abrechnungData: { header: { orderNumber: 'ORD-001' }, positionen: {} }
      };
      
      updateExportUI(state);
      
      const summary = document.getElementById('export-summary');
      expect(summary.hasAttribute('hidden')).toBe(false);
      
      const sizeElement = document.getElementById('export-last-size');
      expect(sizeElement.textContent).toContain('KB');
    });

    test('shows dash for zero size', () => {
      const state = {
        ui: {
          export: {
            status: 'success',
            message: '',
            lastExportAt: '2025-12-11T05:00:00Z',
            lastExportSize: 0
          }
        },
        abrechnungData: { header: { orderNumber: 'ORD-001' }, positionen: {} }
      };
      
      updateExportUI(state);
      
      const sizeElement = document.getElementById('export-last-size');
      expect(sizeElement.textContent).toBe('–');
    });

    test('changes button text when pending', () => {
      updateExportUI(createState({ status: 'pending' }));
      
      const button = document.getElementById('export-button');
      expect(button.querySelector('span').textContent).toBe('Exportiere...');
    });

    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => updateExportUI(createState())).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Status indicator helper', () => {
    test('removes previous status classes', () => {
      const status = document.getElementById('import-status');
      status.classList.add('status-success', 'status-error');
      
      updateImportUI({
        ui: { import: { status: 'idle' } },
        protokollData: { metadata: {}, positionen: [] }
      });
      
      expect(status.classList.contains('status-success')).toBe(false);
      expect(status.classList.contains('status-error')).toBe(false);
      expect(status.classList.contains('status-idle')).toBe(true);
    });

    test('sets aria-label for accessibility', () => {
      updateImportUI({
        ui: { import: { status: 'success' } },
        protokollData: { metadata: {}, positionen: [] }
      });
      
      const status = document.getElementById('import-status');
      expect(status.getAttribute('aria-label')).toBe('Status: success');
    });
  });
});
