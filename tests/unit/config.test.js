/**
 * Unit Tests for Configuration Module (config.js)
 * Tests configuration values and structure
 */

import {
  METADATA_CELL_CONFIG,
  POSITION_CONFIG,
  ABRECHNUNG_CONFIG,
  PARSING_CONFIG,
  PROTOKOLL_CONFIG,
  getConfigSummary
} from '../../js/config.js';

describe('Configuration Module (config.js)', () => {

  describe('METADATA_CELL_CONFIG', () => {
    test('contains all required metadata fields', () => {
      expect(METADATA_CELL_CONFIG).toHaveProperty('protokollNr');
      expect(METADATA_CELL_CONFIG).toHaveProperty('auftragsNr');
      expect(METADATA_CELL_CONFIG).toHaveProperty('anlage');
      expect(METADATA_CELL_CONFIG).toHaveProperty('einsatzort');
      expect(METADATA_CELL_CONFIG).toHaveProperty('firma');
      expect(METADATA_CELL_CONFIG).toHaveProperty('auftraggeber');
    });

    test('all field values are arrays with cell references', () => {
      Object.entries(METADATA_CELL_CONFIG).forEach(([field, cells]) => {
        expect(Array.isArray(cells)).toBe(true);
        expect(cells.length).toBeGreaterThan(0);
        cells.forEach(cell => {
          expect(typeof cell).toBe('string');
          // Cell reference format: A1, AA1, etc.
          expect(cell).toMatch(/^[A-Z]+\d+$/);
        });
      });
    });

    test('primary cells are in expected format', () => {
      expect(METADATA_CELL_CONFIG.protokollNr[0]).toBe('U3');
      expect(METADATA_CELL_CONFIG.auftragsNr[0]).toBe('N5');
      expect(METADATA_CELL_CONFIG.anlage[0]).toBe('A10');
    });

    test('each field has fallback cell locations', () => {
      Object.values(METADATA_CELL_CONFIG).forEach(cells => {
        expect(cells.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('POSITION_CONFIG', () => {
    test('has position number column', () => {
      expect(POSITION_CONFIG.positionNumberColumn).toBe('A');
    });

    test('has quantity columns array', () => {
      expect(Array.isArray(POSITION_CONFIG.quantityColumns)).toBe(true);
      expect(POSITION_CONFIG.quantityColumns.length).toBeGreaterThan(0);
    });

    test('has valid row range', () => {
      expect(typeof POSITION_CONFIG.startRow).toBe('number');
      expect(typeof POSITION_CONFIG.endRow).toBe('number');
      expect(POSITION_CONFIG.startRow).toBeGreaterThan(0);
      expect(POSITION_CONFIG.endRow).toBeGreaterThan(POSITION_CONFIG.startRow);
    });

    test('has position number pattern regex', () => {
      expect(POSITION_CONFIG.positionNumberPattern).toBeInstanceOf(RegExp);
    });

    test('position pattern matches valid position numbers', () => {
      const pattern = POSITION_CONFIG.positionNumberPattern;
      expect('01.01.0010').toMatch(pattern);
      expect('1.1.10').toMatch(pattern);
      expect('10.20.0100').toMatch(pattern);
      expect('99.99.9999').toMatch(pattern);
    });

    test('position pattern matches embedded position numbers', () => {
      const pattern = POSITION_CONFIG.positionNumberPattern;
      expect('Pos. 01.01.0010').toMatch(pattern);
      expect('01.01.0010 - Description').toMatch(pattern);
    });
  });

  describe('ABRECHNUNG_CONFIG', () => {
    test('has sheet name', () => {
      expect(ABRECHNUNG_CONFIG.sheetName).toBe('EAW');
    });

    test('has header cell mappings', () => {
      expect(ABRECHNUNG_CONFIG.header).toHaveProperty('datum');
      expect(ABRECHNUNG_CONFIG.header).toHaveProperty('auftragsNr');
      expect(ABRECHNUNG_CONFIG.header).toHaveProperty('anlage');
      expect(ABRECHNUNG_CONFIG.header).toHaveProperty('einsatzort');
    });

    test('header cells are in valid format', () => {
      Object.values(ABRECHNUNG_CONFIG.header).forEach(cell => {
        expect(cell).toMatch(/^[A-Z]+\d+$/);
      });
    });

    test('has positions configuration', () => {
      expect(ABRECHNUNG_CONFIG.positions).toHaveProperty('positionNumberColumn');
      expect(ABRECHNUNG_CONFIG.positions).toHaveProperty('quantityColumn');
      expect(ABRECHNUNG_CONFIG.positions).toHaveProperty('startRow');
      expect(ABRECHNUNG_CONFIG.positions).toHaveProperty('endRow');
    });

    test('positions row range is valid', () => {
      expect(ABRECHNUNG_CONFIG.positions.startRow).toBeGreaterThan(0);
      expect(ABRECHNUNG_CONFIG.positions.endRow).toBeGreaterThan(ABRECHNUNG_CONFIG.positions.startRow);
    });
  });

  describe('PARSING_CONFIG', () => {
    test('has strictMode setting', () => {
      expect(typeof PARSING_CONFIG.strictMode).toBe('boolean');
    });

    test('has metadata search range', () => {
      expect(typeof PARSING_CONFIG.metadataSearchRange).toBe('string');
      expect(PARSING_CONFIG.metadataSearchRange).toMatch(/^[A-Z]+\d+:[A-Z]+\d+$/);
    });

    test('has protokoll sheet name', () => {
      expect(typeof PARSING_CONFIG.protokollSheetName).toBe('string');
      expect(PARSING_CONFIG.protokollSheetName.length).toBeGreaterThan(0);
    });

    test('has minimum positions required', () => {
      expect(typeof PARSING_CONFIG.minPositionsRequired).toBe('number');
      expect(PARSING_CONFIG.minPositionsRequired).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PROTOKOLL_CONFIG', () => {
    test('has template path', () => {
      expect(typeof PROTOKOLL_CONFIG.templatePath).toBe('string');
      expect(PROTOKOLL_CONFIG.templatePath).toContain('.xlsx');
    });

    test('has sheet name', () => {
      expect(typeof PROTOKOLL_CONFIG.sheetName).toBe('string');
    });

    test('has sections object', () => {
      expect(typeof PROTOKOLL_CONFIG.sections).toBe('object');
    });

    test('grunddaten section has required fields', () => {
      const grunddaten = PROTOKOLL_CONFIG.sections.grunddaten;
      expect(grunddaten).toHaveProperty('protokollNr');
      expect(grunddaten).toHaveProperty('auftragsNr');
      expect(grunddaten).toHaveProperty('auftraggeber');
      expect(grunddaten).toHaveProperty('anlage');
    });

    test('besichtigung section has io/nio pairs', () => {
      const besichtigung = PROTOKOLL_CONFIG.sections.besichtigung;
      expect(typeof besichtigung).toBe('object');
      
      // Check that each entry has io/nio properties
      Object.values(besichtigung).forEach(field => {
        expect(field).toHaveProperty('io');
        expect(field).toHaveProperty('nio');
      });
    });

    test('erproben section has io/nio pairs', () => {
      const erproben = PROTOKOLL_CONFIG.sections.erproben;
      expect(typeof erproben).toBe('object');
      
      Object.values(erproben).forEach(field => {
        expect(field).toHaveProperty('io');
        expect(field).toHaveProperty('nio');
      });
    });

    test('has measurements configuration', () => {
      expect(PROTOKOLL_CONFIG.measurements).toHaveProperty('pages');
      expect(PROTOKOLL_CONFIG.measurements).toHaveProperty('columns');
    });

    test('measurements pages is array with row ranges', () => {
      expect(Array.isArray(PROTOKOLL_CONFIG.measurements.pages)).toBe(true);
      PROTOKOLL_CONFIG.measurements.pages.forEach(page => {
        expect(page).toHaveProperty('startRow');
        expect(page).toHaveProperty('endRow');
        expect(page.startRow).toBeLessThan(page.endRow);
      });
    });

    test('measurements columns has expected fields', () => {
      const cols = PROTOKOLL_CONFIG.measurements.columns;
      expect(cols).toHaveProperty('posNr');
      expect(cols).toHaveProperty('nr');
      expect(cols).toHaveProperty('zielbezeichnung');
    });
  });

  describe('getConfigSummary()', () => {
    test('returns object with all config sections', () => {
      const summary = getConfigSummary();
      
      expect(summary).toHaveProperty('metadata');
      expect(summary).toHaveProperty('positions');
      expect(summary).toHaveProperty('abrechnung');
      expect(summary).toHaveProperty('parsing');
      expect(summary).toHaveProperty('protokoll');
    });

    test('metadata matches METADATA_CELL_CONFIG', () => {
      const summary = getConfigSummary();
      expect(summary.metadata).toEqual(METADATA_CELL_CONFIG);
    });

    test('positions matches POSITION_CONFIG', () => {
      const summary = getConfigSummary();
      expect(summary.positions).toEqual(POSITION_CONFIG);
    });

    test('abrechnung matches ABRECHNUNG_CONFIG', () => {
      const summary = getConfigSummary();
      expect(summary.abrechnung).toEqual(ABRECHNUNG_CONFIG);
    });

    test('parsing matches PARSING_CONFIG', () => {
      const summary = getConfigSummary();
      expect(summary.parsing).toEqual(PARSING_CONFIG);
    });

    test('protokoll matches PROTOKOLL_CONFIG', () => {
      const summary = getConfigSummary();
      expect(summary.protokoll).toEqual(PROTOKOLL_CONFIG);
    });
  });
});
