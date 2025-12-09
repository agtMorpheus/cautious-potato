# Beschreibung der Abrechnung-Anwendung

## Überblick

Eine moderne Web-Anwendung zur Verarbeitung von Prüfprotokollen (Protokoll) und automatischen Erstellung von Abrechnungsdokumenten. Die Anwendung automatisiert die Berechnung und das Ausfüllen von Abrechnungsdokumenten basierend auf den in Protokollen erfassten Daten.

---

## Workflow der Anwendung

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BENUTZER-WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────┘

1. PROTOKOLL IMPORTIEREN
   ├─ Benutzer öffnet die Anwendung
   ├─ Lädt eine ausgefüllte "protokoll.xlsx" Datei
   └─ ✓ Daten werden in die lokale Datenbank importiert

2. DATENBANK SPEICHERN
   ├─ Protokoll-Daten werden in localStorage gespeichert
   ├─ Struktur: Pos.Nr. + Menge + weitere Felder
   └─ ✓ Persistente Datenspeicherung

3. ABRECHNUNG GENERIEREN
   ├─ Benutzer klickt auf "Abrechnung generieren"
   └─ Programm führt diese Operationen aus:
      ├─ Liest alle Pos.Nr. Codes aus dem Protokoll
      ├─ Summiert die Mengen für jede Pos.Nr.
      ├─ Ordnet die Mengen in das Abrechnung-Template ein
      └─ Füllt den Header mit Daten aus dem Protokoll

4. HEADER FÜLLEN (ABRECHNUNG)
   ├─ Datum: Aus Protokoll extrahieren
   ├─ Auftrags-Nr.: Von Protokoll (z.B. EDB101120250925)
   ├─ Anlage: Von Protokoll (z.B. LV-UM-Mb-55)
   ├─ Einsatzort: Von Protokoll (z.B. Halle 3, Feld Mb55)
   └─ ✓ Abrechnung-Header ist ausgefüllt

5. EXPORT
   ├─ Benutzer klickt "Abrechnung exportieren"
   └─ ✓ Neue "abrechnung.xlsx" wird mit allen Daten heruntergeladen

```

---

## Dateistrukturen

### 📋 PROTOKOLL.XLSX

**Aba:** `Vorlage` (Vorlage = Template)

**Verwendete Felder (Header):**
| Feld | Zelle | Wert (Beispiel) |
|------|-------|---|
| Dokument-Typ | D3 | "Prüfung stationärer Anlagen, Prüfprotokoll VDE 0100" |
| Protokoll-Nr. | U3 | "EDB101120250925" |
| Blatt | AL3 | 1 von 3 |
| Auftraggeber | A5 | "Volkswagen AG, Werk Wolfsburg" |
| Auftrag Nr. | N5 | "A5937814" |
| Kunden Nr. | Y5 | 1406 |
| Ort | A7 | "Volkswagen AG, Werk Wolfsburg" |
| Adresse | D8 | "Berliner Ring 2, 38436 Wolfsburg" |
| Firma | T7 | "EAW Wolfsburg" |
| Firma Adresse | W8 | "Dieselstraße 27, 38446 Wolfsburg" |
| Anlage | A10 | "LV-UM-Mb-55" |
| Einsatzort | T10 | "Halle 3, Feld Mb55" |
| INV | AH10 | "E03150AP17000000226" |

**Datenbereich:** Ab Zeile ~30+
- **Spalte A (Pos.Nr.):** Positions-Codes (z.B. "01.01.0010.", "01.01.0020.")
- **Weitere Spalten:** Messwerte, Kommentare, Testergebnisse
- **Mengen:** Werden in Spalte X erfasst (Variable je nach Blatt)

---

### 📄 ABRECHNUNG.XLSX

**Aba:** `EAW`

**Header-Bereich (wird von der App gefüllt):**
```
Zeile 1:  Datum:           [leer - wird gefüllt]
Zeile 2:  Auftrags-Nr.:    [leer - wird gefüllt]
Zeile 3:  Anlage:          [leer - wird gefüllt]
Zeile 4:  Einsatzort:      [leer - wird gefüllt]
Zeile 5:  Abruf:           21571098
Zeile 6:  DLV:             85065481
```

**Datenbereich (ab Zeile 9):**

| Spalte | Feld | Inhalt |
|--------|------|--------|
| A | Position-Nr. | Hierarchische Codes (01., 01.01., 01.01.0010., etc.) |
| B | Menge | **← WIRD VON DER APP GEFÜLLT** (Summe aus Protokoll) |
| C | Beschreibung | Text der Leistung |
| D | Einheit | "St" (Stück), "." (Pauschale), etc. |
| E | EP [EUR] | Einzelpreis |
| F | Summe | Formel: `=B*E` (berechnet automatisch) |

**Beispiel-Daten:**
```
01.              [Kategorie]
├─ 01.01.        [Unterkategorie]
│  ├─ 01.01.0010. → Elektrische Zuleitungen      → Menge: 5  → 25,48€
│  ├─ 01.01.0020. → Steckdosenstromkreise        → Menge: 3  → 5,28€
│  ├─ 01.01.0030. → Fehlerstromschutzschalter    → Menge: 12 → 3,77€
│  └─ 01.01.0040. → Fehlerstromschutzschalter    → Menge: 8  → 9,33€
```

---

## Technische Architektur

### Module und Verantwortlichkeiten

```
┌──────────────────────────────────────────────────────────┐
│                  index.html                              │
│              (Benutzeroberfläche)                        │
└──────────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐ ┌────────────────────┐
│   handlers.js    │ │    state.js        │
│                  │ │                    │
│ • importFile()   │ │ • protokollData    │
│ • generateAbr()  │ │ • abrechnungData   │
│ • exportFile()   │ │ • saveState()      │
│ • updateUI()     │ │ • loadState()      │
└────────┬─────────┘ └────────┬───────────┘
         │                    │
         └────────┬───────────┘
                  │
         ┌────────▼────────────────┐
         │    utils.js             │
         │                         │
         │ • readExcel()           │
         │ • parseExcel()          │
         │ • sumByPosition()       │
         │ • fillAbrechnung()      │
         │ • createWorkbook()      │
         │ • writeExcel()          │
         └─────────────────────────┘
```

### State Management

**localStorage Struktur:**
```javascript
{
  "protokollData": {
    "metadata": {
      "protokollNr": "EDB101120250925",
      "auftragsNr": "A5937814",
      "anlage": "LV-UM-Mb-55",
      "einsatzort": "Halle 3, Feld Mb55",
      "datum": "2025-09-25",
      "firma": "EAW Wolfsburg"
    },
    "positionen": [
      { "posNr": "01.01.0010", "menge": 5, "beschreibung": "..." },
      { "posNr": "01.01.0020", "menge": 3, "beschreibung": "..." },
      { "posNr": "01.01.0030", "menge": 12, "beschreibung": "..." }
    ]
  },
  "abrechnungData": {
    "header": { /* gefüllt nach Generieren */ },
    "positionen": { /* gefüllt nach Generieren */ }
  }
}
```

---

## Kernnfunktionen

### 1. **Protokoll Importieren**

```javascript
// Eingabe: protokoll.xlsx (Datei vom Benutzer)
// Prozess:
//  1. Datei mit SheetJS (xlsx-Library) lesen
//  2. Aba "Vorlage" öffnen
//  3. Metadaten extrahieren (Zeilen 3-10)
//  4. Alle Positionen mit Pos.Nr. und Menge sammeln
//  5. In state.protokollData speichern
// Ausgabe: Erfolgsmeldung
```

**Extrahierte Metadaten:**
- Protokoll-Nr. (Cell U3)
- Auftrags-Nr. (Cell N5)
- Anlage (Cell A10)
- Einsatzort (Cell T10)
- Firma (Cell T7)
- Datum (von Dateiname oder Feld)

---

### 2. **Summe pro Position Berechnen**

```javascript
// Eingabe: state.protokollData.positionen
// Prozess:
//  1. Alle Zeilen des Protokolls durchlaufen
//  2. Pos.Nr. aus Spalte A extrahieren
//  3. Menge aus Spalte B (oder andere) summieren
//  4. Nur vollständige Pos.Nr. Codes verwenden
// Ausgabe: { "01.01.0010": 5, "01.01.0020": 3, ... }

// Beispiel:
// Protokoll zeigt:
//   01.01.0010. → Messung 1 → Menge: 2
//   01.01.0010. → Messung 2 → Menge: 3
// Summe: 01.01.0010 = 5 ✓
```

---

### 3. **Abrechnung Generieren**

```javascript
// Eingabe: state.protokollData (importiert)
// Prozess:
//  1. Abrechnung-Template (abrechnung.xlsx) laden
//  2. Header-Zeilen füllen:
//     • Zeile 1, Spalte B: Datum
//     • Zeile 2, Spalte B: Auftrags-Nr.
//     • Zeile 3, Spalte B: Anlage
//     • Zeile 4, Spalte B: Einsatzort
//  3. Für jede Pos.Nr. in Abrechnung:
//     • Zeile finden (Spalte A)
//     • Menge eintragen (Spalte B)
//     • Formeln in Spalte F berechnen (=B*E)
//  4. Neue Workbook erstellen
// Ausgabe: state.abrechnungData (bereit zum Export)
```

---

### 4. **Abrechnung Exportieren**

```javascript
// Eingabe: state.abrechnungData
// Prozess:
//  1. Workbook aus abrechnungData erstellen
//  2. Alle Zellen und Formeln eintragen
//  3. Datei als "abrechnung_[Datum].xlsx" erstellen
//  4. Zum Benutzer-Download bereitstellen
// Ausgabe: .xlsx Datei (Download)
```

---

## Benutzeroberfläche (UI)

### Hauptseite

```
┌─────────────────────────────────────────────────────┐
│           ABRECHNUNG GENERATOR                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Status: [Bereit / Importiert / Generiert]         │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │ 📁 PROTOKOLL IMPORTIEREN              │          │
│  │                                      │          │
│  │ [Datei wählen]  [Importieren]        │          │
│  │ Status: ✓ protokoll.xlsx importiert  │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │ 📊 ABRECHNUNG GENERIEREN              │          │
│  │                                      │          │
│  │ [Abrechnung generieren]              │          │
│  │ Status: ✓ Abrechnung generiert       │          │
│  │                                      │          │
│  │ Vorschau:                            │          │
│  │ • Auftrags-Nr.: A5937814             │          │
│  │ • Anlage: LV-UM-Mb-55                │          │
│  │ • Positionen gefüllt: 48             │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │ 💾 ABRECHNUNG EXPORTIEREN             │          │
│  │                                      │          │
│  │ [Abrechnung exportieren]             │          │
│  │ Status: ✓ Bereit zum Download        │          │
│  └──────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Datenflusss-Diagramm

```
PROTOKOLL.XLSX                STATE.JS                ABRECHNUNG.XLSX
                          (localStorage)

┌─────────────────┐        ┌──────────────┐        ┌─────────────────┐
│ Vorlage-Aba:    │        │ protokollData│        │ EAW-Aba:        │
│                 │        │              │        │                 │
│ • Metadaten     │──────→ │ • metadata   │        │ • Header        │
│   (Zeilen 3-10) │        │ • positionen │        │ • Positionen    │
│                 │        │              │        │   (mit Mengen)  │
│ • Positionen    │        │ abrechnungData       │                 │
│   (ab Zeile 30) │        │              │        │ Spalten:        │
│                 │        │ • header     │─────→ │ A: Pos.Nr.      │
└─────────────────┘        │ • positionen │        │ B: Menge ◄──────┤
                           │              │        │ C: Beschreibung │
 Benutzer lädt            │ [lokale]     │        │ D: Einheit      │
 "protokoll.xlsx"     │ [Datenspeicher]│        │ E: Preis        │
                           │              │        │ F: Summe        │
                           └──────────────┘        └─────────────────┘
                               ▲
                               │ [lesen]
                               │
                          Benutzer klickt
                      "Abrechnung generieren"
                               │
                               ▼
                        ┌──────────────┐
                        │ Prozess:     │
                        │ 1. Header    │
                        │    füllen    │
                        │ 2. Summen    │
                        │    summieren │
                        │ 3. Mengen    │
                        │    eintragen │
                        │ 4. Formeln   │
                        │    berechnen │
                        └──────────────┘
                               │
                               ▼
                        Benutzer klickt
                    "Abrechnung exportieren"
                               │
                               ▼
                      abrechnung.xlsx wird
                      zum Download erzeugt
```

---

## Wichtige Funktionen (Pseudo-Code)

### `importFile(file)`
```javascript
function importFile(file) {
  // 1. SheetJS lädt die Datei
  const workbook = XLSX.read(file);
  const worksheet = workbook.Sheets['Vorlage'];
  
  // 2. Metadaten extrahieren
  const metadata = {
    protokollNr: worksheet['U3'].v,
    auftragsNr: worksheet['N5'].v,
    anlage: worksheet['A10'].v,
    einsatzort: worksheet['T10'].v,
    firma: worksheet['T7'].v,
    datum: extractDate(worksheet)
  };
  
  // 3. Alle Positionen sammeln
  const positionen = [];
  for (let row = 30; row <= 325; row++) {
    const posNr = worksheet[`A${row}`]?.v;
    const menge = worksheet[`X${row}`]?.v; // Spalte kann variieren
    if (posNr && menge) {
      positionen.push({ posNr, menge });
    }
  }
  
  // 4. In State speichern
  setState({
    protokollData: {
      metadata,
      positionen
    }
  });
}
```

### `sumByPosition(positionen)`
```javascript
function sumByPosition(positionen) {
  const summed = {};
  
  // Alle Positionen durchlaufen
  for (const pos of positionen) {
    const key = pos.posNr.trim(); // "01.01.0010."
    
    // Summieren
    if (!summed[key]) {
      summed[key] = 0;
    }
    summed[key] += pos.menge;
  }
  
  return summed;
  // Ausgabe: { "01.01.0010": 5, "01.01.0020": 3, ... }
}
```

### `generateAbrechnung()`
```javascript
function generateAbrechnung() {
  // 1. Template laden
  const template = XLSX.read(abrechnungTemplate);
  const ws = template.Sheets['EAW'];
  
  // 2. Header füllen
  ws['B1'].v = state.protokollData.metadata.datum;
  ws['B2'].v = state.protokollData.metadata.auftragsNr;
  ws['B3'].v = state.protokollData.metadata.anlage;
  ws['B4'].v = state.protokollData.metadata.einsatzort;
  
  // 3. Summen berechnen
  const sums = sumByPosition(state.protokollData.positionen);
  
  // 4. Positionen füllen
  for (const [posNr, menge] of Object.entries(sums)) {
    // Zeile mit Pos.Nr. finden
    const row = findRowByPosition(ws, posNr);
    if (row) {
      ws[`B${row}`].v = menge; // Menge eintragen
    }
  }
  
  // 5. Speichern
  setState({
    abrechnungData: {
      header: { /* ... */ },
      positionen: { /* ... */ },
      workbook: template
    }
  });
}
```

### `exportAbrechnung()`
```javascript
function exportAbrechnung() {
  // 1. Workbook vorbereiten
  const wb = state.abrechnungData.workbook;
  
  // 2. Dateiname erstellen
  const fileName = `abrechnung_${state.protokollData.metadata.auftragsNr}_${Date.now()}.xlsx`;
  
  // 3. Exportieren
  XLSX.writeFile(wb, fileName);
  
  // ✓ Download startet
}
```

---

## Verwendete Technologien

| Komponente | Technologie | Grund |
|-----------|-----------|-------|
| Excel-Verarbeitung | SheetJS (xlsx) | Lesen/Schreiben von .xlsx Dateien |
| Datenspeicherung | localStorage | Persistenz, keine Datenbank nötig |
| Frontend | HTML5 + CSS3 | Moderne Benutzeroberfläche |
| JavaScript | ES6 Modules | Clean, modulare Architektur |
| State Management | Event-Driven | Reaktive UI-Updates |

---

## Fehlerbehandlung

```javascript
// Import-Fehler
try {
  importFile(file);
  showSuccess("✓ Protokoll importiert");
} catch (error) {
  showError("✗ Fehler beim Import: " + error.message);
}

// Generierungs-Fehler
if (!state.protokollData) {
  showError("✗ Bitte zunächst Protokoll importieren");
  return;
}

// Export-Fehler
try {
  exportAbrechnung();
  showSuccess("✓ Abrechnung exportiert");
} catch (error) {
  showError("✗ Fehler beim Export: " + error.message);
}
```

---

## Zusammenfassung

Diese Anwendung **automatisiert die Fakturierung** nach Prüfarbeiten:

✅ **Benutzer**
1. Füllt **Prüfprotokoll** aus (mehrere Messwerte pro Position möglich)
2. Importiert die Datei in die App
3. Klickt "Abrechnung generieren"
4. Exportiert die vorausgefüllte **Abrechnung**

✅ **Programm**
1. Liest Metadaten aus Protokoll
2. Summiert alle Messwerte pro Positions-Nummer
3. Trägt Summen in Abrechnungs-Template ein
4. Füllt Header mit Projekt-Informationen
5. Erstellt Export-Datei

✅ **Ergebnis**
- Fehlerfreie, konsistente Abrechnungen
- Zeitersparnis
- Keine manuelle Dateneingabe
