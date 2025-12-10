/**
 * Configuration Module
 * 
 * Centralized configuration for Excel parsing behavior
 * Users can modify these settings to match their specific Excel templates
 */

/**
 * Metadata Cell Configuration
 * 
 * Defines where to look for metadata fields in the Protokoll Excel file.
 * Each field has multiple fallback locations that are tried in order.
 * 
 * Format: fieldName: [primaryCell, fallback1, fallback2, ...]
 * 
 * Example: If 'auftragsNr' is not found in N5, it will try M5, then O5, etc.
 */
export const METADATA_CELL_CONFIG = {
    // Protokoll number - typically in upper right area
    protokollNr: ['U3', 'V3', 'W3', 'T3'],
    
    // Order number - critical field, multiple fallbacks
    auftragsNr: ['N5', 'M5', 'O5', 'N4', 'N6'],
    
    // Plant/facility name - typically in upper left
    anlage: ['A10', 'B10', 'A9', 'A11'],
    
    // Location - typically in upper right
    einsatzort: ['T10', 'S10', 'U10', 'T9', 'T11'],
    
    // Company name
    firma: ['T7', 'S7', 'U7', 'T6', 'T8'],
    
    // Client/customer name
    auftraggeber: ['A5', 'B5', 'A4', 'A6']
};

/**
 * Position Data Configuration
 * 
 * Defines where to find position numbers and quantities in the Protokoll
 */
export const POSITION_CONFIG = {
    // Column where position numbers are located (e.g., "01.01.0010")
    positionNumberColumn: 'A',
    
    // Columns to check for quantity values (tried in order)
    quantityColumns: ['X', 'B', 'C'],
    
    // Row range to scan for positions
    startRow: 30,
    endRow: 325,
    
    // Position number format validation pattern
    // Flexible pattern: accepts DD.DD.DDDD anywhere in the cell value
    // Examples: "01.01.0010", "Pos. 1.1.10", "10.20.0100 - Description"
    // Uses "contains" logic instead of exact match
    positionNumberPattern: /\d{1,2}\.\d{1,2}\.\d{1,4}/
};

/**
 * Abrechnung Template Configuration
 * 
 * Defines where to write data in the Abrechnung Excel template
 */
export const ABRECHNUNG_CONFIG = {
    // Sheet name in the template
    sheetName: 'EAW',
    
    // Header cell locations
    header: {
        datum: 'B1',
        auftragsNr: 'B2',
        anlage: 'B3',
        einsatzort: 'B4'
    },
    
    // Position data area
    positions: {
        positionNumberColumn: 'A',
        quantityColumn: 'B',
        startRow: 9,
        endRow: 500
    }
};

/**
 * Parsing Behavior Configuration
 */
export const PARSING_CONFIG = {
    // Strict mode: Only use predefined cell locations (no pattern search)
    strictMode: false,
    
    // Search range for flexible pattern-based metadata search
    metadataSearchRange: 'A1:Z50',
    
    // Worksheet name to look for in Protokoll files
    protokollSheetName: 'Vorlage',
    
    // Minimum number of positions required for valid import
    minPositionsRequired: 1
};

/**
 * Protokoll Export Configuration
 * 
 * Defines the cell mapping for protokoll export based on docs/vorlage/protokoll-mapping.md
 */
export const PROTOKOLL_CONFIG = {
    // Template file location
    templatePath: 'templates/protokoll.xlsx',
    
    // Default worksheet name
    sheetName: 'Protokoll',
    
    // Cell mappings for different sections
    sections: {
        grunddaten: {
            protokollNr: 'V3',
            blatt: 'AH3',
            von: 'AJ3',
            auftraggeber: 'C5',
            auftragsNr: 'N5',
            kundenNr: 'W5',
            auftragnehmer: 'AF5',
            kunde: 'D7',
            kundeOrt: 'D8',
            firma: 'V7',
            firmaOrt: 'V8',
            anlage: 'D10',
            anlageOrt: 'U10',
            inv: 'AI10'
        },
        
        pruefenNach: {
            dinVde0100Gruppe700: 'L11',
            dinVde01000600: 'S11',
            dinVde01050100: 'X11',
            dguvV3: 'AH11'
        },
        
        pruefungsart: {
            neuanlage: 'E12',
            erweiterung: 'L12',
            aenderung: 'T12',
            instandsetzung: 'AD12',
            wiederholungspruefung: 'AN12'
        },
        
        netzinfo: {
            netz1: 'D13',
            netz2: 'F13',
            netzbetreiber: 'D14',
            tnC: 'V13',
            tnS: 'Z13',
            tnCS: 'AG13',
            tt: 'AJ13',
            it: 'AN13'
        },
        
        messgeraete: {
            fabrikat: 'P31',
            typ: 'P32',
            naechsteKalibrierung: 'Z31',
            identNr: 'X32'
        },
        
        pruefungsergebnis: {
            keineMaengel: 'M33',
            maengelFestgestellt: 'M34'
        },
        
        pruefplakette: {
            ja: 'AF33',
            nein: 'AF34'
        },
        
        weitereInfo: {
            naechsterPruefungstermin: 'AM33',
            bemerkung: 'A36',
            unterschrift: 'AJ77',
            datum: 'AB78'
        },
        
        // Besichtigung (Inspection) - i.O./n.i.O. pairs
        besichtigung: {
            auswahlBetriebsmittel: { io: 'K16', nio: 'L16' },
            trennSchaltgeraete: { io: 'K17', nio: 'L17' },
            brandabschottungen: { io: 'K18', nio: 'L18' },
            gebaeudesystemtechnik: { io: 'K19', nio: 'L19' },
            kabelLeitungen: { io: 'K20', nio: 'L20' },
            kennzeichnung: { io: 'K21', nio: 'L21' },
            kennzeichnungNPE: { io: 'W16', nio: 'X16' },
            leiterverbindungen: { io: 'W17', nio: 'X17' },
            schutzUeberwachung: { io: 'W18', nio: 'X18' },
            basisschutz: { io: 'W19', nio: 'X19' },
            zugaenglichkeit: { io: 'W20', nio: 'X20' },
            schutzpotentialausgleich: { io: 'W21', nio: 'X21' },
            zusOertlPotentialausgleich: { io: 'AL16', nio: 'AM16' },
            dokumentation: { io: 'AL17', nio: 'AM17' },
            reinigungSchaltschrank: { io: 'AL18', nio: 'AM18' }
        },
        
        // Erproben (Testing) - i.O./n.i.O. pairs
        erproben: {
            funktionspruefung: { io: 'K23', nio: 'L23' },
            rcdSchutzschalter: { io: 'K24', nio: 'L24' },
            schraubverbindungen: { io: 'K25', nio: 'L25' },
            funktionSchutzeinrichtungen: { io: 'W23', nio: 'X23' },
            drehrichtungMotoren: { io: 'W24', nio: 'X24' },
            rechtsdrehfelder: { io: 'AL23', nio: 'AM23' },
            gebaeudesystemtechnikTest: { io: 'AL24', nio: 'AM24' }
        },
        
        // Messen (Measurements) - simple checkboxes
        messen: {
            durchgaengigkeitPotentialausgleich: 'P27',
            gebaeudeKonstruktion: 'AN29'
        }
    },
    
    // Measurement data configuration
    measurements: {
        pages: [
            { startRow: 49, endRow: 70 },   // Page 1
            { startRow: 90, endRow: 111 },  // Page 2
            { startRow: 111, endRow: 152 }, // Page 3
            { startRow: 172, endRow: 193 }, // Page 4
            { startRow: 213, endRow: 234 }, // Page 5
            { startRow: 254, endRow: 275 }  // Page 6
        ],
        
        columns: {
            posNr: 'A',
            nr: 'B',
            zielbezeichnung: 'C',
            kabelTyp: 'I',
            leiterAnzahl: 'K',
            leiterQuerschnitt: 'M',
            un: 'O',
            fn: 'P',
            artCharakteristik: 'Q',
            inA: 'S',
            zsOhm: 'U',
            znOhm: 'V',
            ikKA: 'W',
            risoOhneVerbraucher: 'Y',
            risoMitVerbraucher: 'Z',
            rpeMaxOhm: 'AB',
            gewissRcd: 'AC',
            inARcd: 'AD',
            iDeltaN: 'AF',
            iMess: 'AG',
            ausloesezeitTA: 'AI',
            ulUmess: 'AK',
            diffStrom: 'AN'
        }
    }
};

/**
 * Helper function to get a flattened config for debugging
 */
export function getConfigSummary() {
    return {
        metadata: METADATA_CELL_CONFIG,
        positions: POSITION_CONFIG,
        abrechnung: ABRECHNUNG_CONFIG,
        parsing: PARSING_CONFIG,
        protokoll: PROTOKOLL_CONFIG
    };
}
