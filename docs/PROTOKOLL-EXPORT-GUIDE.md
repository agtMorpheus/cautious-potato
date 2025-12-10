# Protokoll Export Guide

## Overview

The protokoll export functionality allows you to generate properly formatted Excel protokoll files that conform to the specifications in `docs/vorlage/protokoll-mapping.md` and `docs/vorlage/protokoll-meseurements.md`.

## Quick Start

### 1. Basic Usage

```javascript
import { createAndExportProtokoll } from './js/utils-protokoll-export.js';

// Minimal protokoll data
const protokollData = {
  grunddaten: {
    protokollNr: 'EDB101120250925',
    auftragsNr: 'A7652345',
    anlage: 'LVUM-Fc34',
    firma: 'EAW Wolfsburg'
  }
};

// Export protokoll
const result = await createAndExportProtokoll(protokollData);
console.log(`Exported: ${result.fileName}`);
```

### 2. Complete Example

```javascript
const fullProtokollData = {
  // Basic information
  grunddaten: {
    protokollNr: 'EDB101120250925',
    blatt: '1',
    von: '3',
    auftraggeber: '1406',
    auftragsNr: 'A7652345',
    kunde: 'Volkswagen AG, Werk Wolfsburg',
    kundeOrt: 'Berliner Ring 2, 38436 Wolfsburg',
    firma: 'EAW Wolfsburg',
    firmaOrt: 'Dieselstraße 27, 38446 Wolfsburg',
    anlage: 'LVUM-Fc34',
    anlageOrt: 'Halle 3, HG',
    inv: 'E03150AP17000093243'
  },
  
  // Testing standards (checkboxes)
  pruefenNach: {
    dinVde01050100: true,
    dguvV3: true
  },
  
  // Test type (radio buttons)
  pruefungsart: {
    wiederholungspruefung: true
  },
  
  // Network information
  netzinfo: {
    netz1: '230',
    netz2: '400',
    tnCS: true  // TN-C-S network form
  },
  
  // Inspection results (i.O./n.i.O.)
  besichtigung: {
    auswahlBetriebsmittel: 'io',
    trennSchaltgeraete: 'io',
    dokumentation: 'io'
  },
  
  // Testing results (i.O./n.i.O.)
  erproben: {
    funktionspruefung: 'io',
    schraubverbindungen: 'io'
  },
  
  // Measurement checkboxes
  messen: {
    durchgaengigkeitPotentialausgleich: true
  },
  
  // Measuring equipment
  messgeraete: {
    fabrikat: 'Fluke',
    typ: '1654b',
    naechsteKalibrierung: '01.05.2026',
    identNr: '4312061'
  },
  
  // Test results
  pruefungsergebnis: {
    keineMaengel: true
  },
  
  // Test label
  pruefplakette: {
    ja: true
  },
  
  // Additional information
  weitereInfo: {
    naechsterPruefungstermin: 'set./ 2027',
    datum: '01.02.2026'
  },
  
  // Measurement data (up to 132 entries across 6 pages)
  measurements: [
    {
      posNr: '1',
      nr: '1.1',
      zielbezeichnung: 'Hauptverteilung',
      kabelTyp: 'NYM-J',
      leiterAnzahl: 5,
      leiterQuerschnitt: '2.5',
      un: 400,
      fn: 50,
      artCharakteristik: 'B',
      inA: 16,
      zsOhm: 0.15,
      znOhm: 0.12,
      ikKA: 2.67,
      risoOhneVerbraucher: '>999',
      risoMitVerbraucher: '>999',
      rpeMaxOhm: 0.08
    }
  ]
};

await createAndExportProtokoll(fullProtokollData);
```

## Data Structure Reference

### Grunddaten (Basic Data)
Maps to cells V3, N5, D10, etc. as specified in protokoll-mapping.md

```javascript
grunddaten: {
  protokollNr: string,      // V3 - Protocol number
  auftragsNr: string,       // N5 - Order number  
  anlage: string,           // D10 - Plant/facility
  firma: string,            // V7 - Company name
  kunde: string,            // D7 - Customer name
  // ... see config.js for complete mapping
}
```

### Checkboxes (Boolean Fields)
Use `true`/`false` for simple checkboxes:

```javascript
pruefenNach: {
  dinVde01050100: true,     // ☑ checked
  dguvV3: false            // ○ unchecked
}
```

### i.O./n.i.O. Results
Use `'io'`/`'nio'`/`null` for inspection/testing results:

```javascript
besichtigung: {
  auswahlBetriebsmittel: 'io',    // i.O. (in order)
  trennSchaltgeraete: 'nio',      // n.i.O. (not in order)  
  brandabschottungen: null        // Neither checked
}
```

### Measurements
Array of measurement objects with up to 23 fields per entry:

```javascript
measurements: [
  {
    posNr: string,                    // A - Position number
    nr: string,                       // B - Number
    zielbezeichnung: string,          // C - Target designation
    kabelTyp: string,                 // I - Cable type
    leiterAnzahl: number,             // K - Number of conductors
    leiterQuerschnitt: string,        // M - Conductor cross-section
    un: number,                       // O - Nominal voltage
    fn: number,                       // P - Nominal frequency
    artCharakteristik: string,        // Q - Characteristic type
    inA: number,                      // S - Nominal current (A)
    zsOhm: number,                    // U - Loop impedance L-PE (Ω)
    znOhm: number,                    // V - Impedance L-N (Ω)
    ikKA: number,                     // W - Short-circuit current L-PE (kA)
    risoOhneVerbraucher: string,      // Y - Insulation resistance without load (MΩ)
    risoMitVerbraucher: string,       // Z - Insulation resistance with load (MΩ)
    rpeMaxOhm: number,                // AB - PE conductor resistance (max 1Ω)
    gewissRcd: string,                // AC - GEWISS RCD
    inARcd: number,                   // AD - Nominal current RCD (A)
    iDeltaN: number,                  // AF - Nominal residual current (mA)
    iMess: number,                    // AG - Measured current (mA)
    ausloesezeitTA: number,           // AI - Trip time (ms)
    ulUmess: number,                  // AK - Measured voltage ≤50V (V)
    diffStrom: number                 // AN - Differential current (mA)
  }
]
```

## Functions Reference

### Core Functions

#### `createAndExportProtokoll(protokollData, filename?)`
Complete workflow function - creates workbook and triggers download.

**Parameters:**
- `protokollData` - Complete protokoll data object
- `filename` - Optional custom filename

**Returns:** `Promise<{fileName: string, fileSize: number}>`

#### `validateProtokollData(protokollData)`
Validates protokoll data structure.

**Returns:** `{valid: boolean, errors: string[], warnings: string[]}`

### Individual Functions

#### `loadProtokollTemplate()`
Loads the protokoll template using ExcelJS.

#### `fillProtokollGrunddaten(workbook, grunddaten)`
Fills basic data section.

#### `setProtokollCheckboxes(workbook, checkboxData, section)`
Sets checkbox values for a specific section.

#### `setProtokollResults(workbook, results, section)`
Sets i.O./n.i.O. results for inspection/testing sections.

#### `fillProtokollMeasurements(workbook, measurements)`
Fills measurement data across all 6 pages.

## Configuration

Cell mappings are defined in `js/config.js` under `PROTOKOLL_CONFIG`. You can modify these mappings if your template uses different cell locations.

## Requirements

- **ExcelJS Library**: Must be loaded before using protokoll export functions
- **Template File**: `templates/protokoll.xlsx` must exist and match the cell mapping
- **Browser Support**: Modern browsers with ES6 module support

## Error Handling

All functions include comprehensive error handling:

```javascript
try {
  const result = await createAndExportProtokoll(data);
  console.log('Success:', result);
} catch (error) {
  console.error('Export failed:', error.message);
  // Handle error appropriately
}
```

## Integration with Handlers

Use the provided handler function for UI integration:

```javascript
import { handleExportProtokoll } from './js/handlers.js';

// Call from UI event
await handleExportProtokoll(protokollData);
```

## Testing

See `docs/examples/protokoll-export-example.html` for a complete working example with sample data.

## Performance Notes

- Template is loaded once and reused for multiple exports
- Measurement data supports up to 132 entries (6 pages × 22 rows)
- Export time scales linearly with measurement data size
- Memory usage is minimal due to streaming Excel generation