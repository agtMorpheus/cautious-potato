# Visual Cell Mapping Guide

## Understanding Cell References

Excel cells are referenced by column letter + row number:

```
    A    B    C    D    E    ...    N    O    P    ...    T    U    V
1   A1   B1   C1   D1   E1          N1   O1   P1          T1   U1   V1
2   A2   B2   C2   D2   E2          N2   O2   P2          T2   U2   V2
3   A3   B3   C3   D3   E3          N3   O3   P3          T3   U3   V3
4   A4   B4   C4   D4   E4          N4   O4   P4          T4   U4   V4
5   A5   B5   C5   D5   E5          N5   O5   P5          T5   U5   V5
```

## Default Protokoll Layout

The default configuration expects this layout:

```
         A              ...         N              ...         T         U
1                                                              
2                                                              
3                                                                        [U3] Protokoll-Nr
4                                                              
5        [A5]                       [N5]                       [T7]
         Auftraggeber               Auftrags-Nr                Firma
6                                                              
7                                                              
8                                                              
9                                                              
10       [A10]                                                 [T10]
         Anlage                                                Einsatzort
...
30       [A30]                                                 [X30]
         Pos.Nr.                                               Menge
31       01.01.0010                                            5
32       01.01.0020                                            3
...
325      [A325]                                                [X325]
```

## Common Variations

### Variation 1: Metadata in Adjacent Columns

Your template might have metadata shifted one column:

```
         A         B              N         O              T         U
5        Label:    [B5]           Label:    [O5]           Label:    [U7]
                   Value                    Value                    Value
```

**Configuration:**
```javascript
export const METADATA_CELL_CONFIG = {
    auftragsNr: ['O5', 'N5'],      // Try O5 first, then N5
    auftraggeber: ['B5', 'A5'],    // Try B5 first, then A5
    firma: ['U7', 'T7'],           // Try U7 first, then T7
    // ...
};
```

### Variation 2: Metadata in Different Rows

Your template might have metadata in different rows:

```
         A              N              T         U
3                                                [U3] Protokoll-Nr
4                       [N4]           
                        Auftrags-Nr    
6        [A6]                          [T6]
         Auftraggeber                  Firma
```

**Configuration:**
```javascript
export const METADATA_CELL_CONFIG = {
    auftragsNr: ['N4', 'N5'],          // Try N4 first
    auftraggeber: ['A6', 'A5'],        // Try A6 first
    firma: ['T6', 'T7'],               // Try T6 first
    // ...
};
```

### Variation 3: Quantities in Different Column

Your template has quantities in column Y instead of X:

```
         A              ...         Y         
30       Pos.Nr.                    Menge
31       01.01.0010                 [Y31] 5
32       01.01.0020                 [Y32] 3
```

**Configuration:**
```javascript
export const POSITION_CONFIG = {
    positionNumberColumn: 'A',
    quantityColumns: ['Y', 'X', 'B'],  // Try Y first
    startRow: 30,
    endRow: 325,
    // ...
};
```

### Variation 4: Positions in Different Row Range

Your template has positions starting at row 20:

```
         A              X         
20       Pos.Nr.        Menge
21       01.01.0010     5
22       01.01.0020     3
...
200      Last position
```

**Configuration:**
```javascript
export const POSITION_CONFIG = {
    positionNumberColumn: 'A',
    quantityColumns: ['X', 'B', 'C'],
    startRow: 20,      // Changed from 30
    endRow: 200,       // Changed from 325
    // ...
};
```

## How to Find Your Cell Locations

### Step 1: Open Your Protokoll in Excel

1. Open your Protokoll Excel file
2. Click on the cell containing the order number
3. Look at the cell reference in the top-left (e.g., "N5")

### Step 2: Note All Metadata Locations

Create a list:
```
Protokoll-Nr:  U3
Auftrags-Nr:   N5
Anlage:        A10
Einsatzort:    T10
Firma:         T7
Auftraggeber:  A5
```

### Step 3: Check Position Data

1. Find the first position number (e.g., "01.01.0010")
2. Note the column (e.g., "A")
3. Note the row (e.g., "30")
4. Find the corresponding quantity
5. Note that column (e.g., "X")
6. Find the last position row (e.g., "325")

### Step 4: Update Configuration

```javascript
// js/config.js
export const METADATA_CELL_CONFIG = {
    protokollNr: ['U3'],     // Your cell here
    auftragsNr: ['N5'],      // Your cell here
    anlage: ['A10'],         // Your cell here
    einsatzort: ['T10'],     // Your cell here
    firma: ['T7'],           // Your cell here
    auftraggeber: ['A5']     // Your cell here
};

export const POSITION_CONFIG = {
    positionNumberColumn: 'A',        // Your column here
    quantityColumns: ['X'],           // Your column here
    startRow: 30,                     // Your row here
    endRow: 325,                      // Your row here
    positionNumberPattern: /^\d{2}\.\d{2}\.\d{4}/
};
```

## Pattern Search Visualization

When `strictMode: false`, the parser can search for labels:

```
Search Range: A1:Z50

         A              B         C         D
1        
2        
3        Protokoll-Nr:  [B3]      
                        12345     ← Found! Adjacent to label
4        
5        Order Number:  [B5]
                        67890     ← Found! Adjacent to label
```

The parser:
1. Scans cells A1 through Z50
2. Looks for text matching patterns (e.g., /auftrags[-\s]?nr/i)
3. When found, checks adjacent cells (right, below, diagonal)
4. Uses the first non-empty adjacent cell as the value

## Abrechnung Template Layout

The output template has this structure:

```
         A              B         
1        Datum:         [B1]
2        Auftrags-Nr:   [B2]
3        Anlage:        [B3]
4        Einsatzort:    [B4]
5        
...
9        Pos.Nr.        Menge
10       01.01.0010     [B10]
11       01.01.0020     [B11]
...
500      Last position
```

**Configuration:**
```javascript
export const ABRECHNUNG_CONFIG = {
    sheetName: 'EAW',
    header: {
        datum: 'B1',
        auftragsNr: 'B2',
        anlage: 'B3',
        einsatzort: 'B4'
    },
    positions: {
        positionNumberColumn: 'A',
        quantityColumn: 'B',
        startRow: 9,
        endRow: 500
    }
};
```

## Quick Reference: Column Letters

```
A B C D E F G H I J K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
```

For columns beyond Z:
```
AA AB AC ... AZ BA BB ... ZZ
27 28 29 ... 52 53 54 ... 702
```

## Testing Your Configuration

### Visual Check

1. Open your Protokoll in Excel
2. Highlight the cells you configured
3. Verify they contain the expected data
4. Check that no cells are empty

### Console Check

After importing:
```javascript
// Check browser console for:
Metadata gefunden in Zellen: {
  protokollNr: 'U3',
  auftragsNr: 'N5',
  anlage: 'A10',
  einsatzort: 'T10',
  firma: 'T7',
  auftraggeber: 'A5'
}
```

This shows exactly which cells were used.

## Common Mistakes

### ❌ Wrong: Using Row/Column Numbers
```javascript
auftragsNr: [14, 5]  // Wrong!
```

### ✅ Correct: Using Excel Cell References
```javascript
auftragsNr: ['N5']   // Correct!
```

### ❌ Wrong: Forgetting Quotes
```javascript
auftragsNr: [N5]     // Wrong! JavaScript error
```

### ✅ Correct: Using Strings
```javascript
auftragsNr: ['N5']   // Correct!
```

### ❌ Wrong: Single Cell (No Fallback)
```javascript
auftragsNr: 'N5'     // Wrong! Must be array
```

### ✅ Correct: Array of Cells
```javascript
auftragsNr: ['N5']   // Correct! Array with one element
```

## Need Help?

1. Check `docs/CONFIGURATION.md` for detailed explanations
2. See `docs/examples/custom-cell-mapping.md` for more examples
3. Use browser console to see which cells were found
4. Check `docs/TROUBLESHOOTING.md` for common issues
