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
 * Helper function to get a flattened config for debugging
 */
export function getConfigSummary() {
    return {
        metadata: METADATA_CELL_CONFIG,
        positions: POSITION_CONFIG,
        abrechnung: ABRECHNUNG_CONFIG,
        parsing: PARSING_CONFIG
    };
}
