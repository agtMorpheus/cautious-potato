# Abrechnung-Anwendung

Eine Web-Anwendung zur automatisierten Erstellung von Abrechnungsdokumenten aus Prüfprotokollen.

Die Anwendung liest Excel-basierte Prüfprotokolle (`protokoll.xlsx`), aggregiert die enthaltenen Mengen nach Positionsnummern und füllt automatisch ein Abrechnungs-Template (`abrechnung.xlsx`). Alle Prozesse laufen lokal im Browser ab, ohne dass Daten auf einen externen Server hochgeladen werden.

## 🚀 Features

- **Import**: Einlesen von `protokoll.xlsx` Dateien via Drag & Drop oder Dateiauswahl.
- **Automatische Aggregation**: Summiert Mengen basierend auf identischen Positionsnummern (z.B. `01.01.0010`).
- **Template-Engine**: Füllt ein vordefiniertes Excel-Template (`abrechnung.xlsx`) mit:
  - Header-Daten (Auftrags-Nr., Anlage, Einsatzort, Datum, etc.)
  - Aggregierten Positionsmengen
  - Automatisch berechneten Summen (unter Beibehaltung von Excel-Formeln)
- **Export**: Generiert eine fertige `.xlsx` Datei zum Download.
- **Datenschutz**: Lokale Verarbeitung im Browser (Client-Side Only).
- **Status-Tracking**: Visuelles Feedback über den aktuellen Verarbeitungsstatus.
- **Persistenz**: Zwischenspeicherung des Bearbeitungsstatus im `localStorage` (Verlustschutz bei Page-Reload).

## 🛠 Technologien

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- **Excel-Verarbeitung**: [SheetJS (xlsx)](https://sheetjs.com/)
- **Server (Dev/Local)**: XAMPP (Apache) für lokales Hosting
- **Speicherung**: Browser `localStorage`

## 📦 Installation & Setup

Da die Anwendung client-seitig läuft, wird lediglich ein lokaler Webserver benötigt, um Module und CORS-Richtlinien korrekt zu behandeln.

### Voraussetzungen
- [XAMPP](https://www.apachefriends.org/de/index.html) (oder ein anderer lokaler Webserver wie Python `http.server`, Node `http-server`)
- Ein moderner Webbrowser (Chrome, Firefox, Edge)

### Schritte

1. **Repository klonen oder entpacken**:
   Navigiere in das `htdocs` Verzeichnis deiner XAMPP-Installation.
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/yourusername/abrechnung-app.git
   ```

2. **Dateistruktur prüfen**:
   Stelle sicher, dass die Ordnerstruktur wie folgt aussieht:
   ```
   /abrechnung-app
   ├── css/
   ├── js/
   │   ├── libs/ (enthält xlsx.min.js)
   │   ├── state.js
   │   ├── utils.js
   │   ├── handlers.js
   │   └── main.js
   ├── templates/
   │   ├── protokoll.xlsx
   │   └── abrechnung.xlsx
   ├── index.html
   └── README.md
   ```

3. **Server starten**:
   - Öffne das **XAMPP Control Panel**.
   - Starte das Modul **Apache**.

4. **Anwendung öffnen**:
   Navigiere im Browser zu:
   `http://localhost/abrechnung-app/`

## 📖 Benutzung

1. **Protokoll importieren**:
   - Klicke auf "Datei auswählen" im Bereich **1. Protokoll importieren**.
   - Wähle eine gültige `protokoll.xlsx` Datei aus.
   - Die App validiert die Datei und zeigt Metadaten (Auftrag, Anlage, etc.) an.

2. **Abrechnung generieren**:
   - Sobald der Import erfolgreich war, wird der Button **Abrechnung erzeugen** aktiv.
   - Klicke darauf, um die Positionen zu summieren und das Template im Hintergrund zu befüllen.
   - Eine Vorschau der generierten Positionen wird angezeigt.

3. **Exportieren**:
   - Klicke auf **Abrechnung herunterladen**.
   - Die fertige Excel-Datei wird auf deinem Computer gespeichert (Dateinameformat: `Abrechnung_[AuftragsNr]_[Timestamp].xlsx`).

4. **Zurücksetzen**:
   - Nutze den "Anwendung zurücksetzen" Button unten, um alle Daten und den Cache zu löschen und neu zu starten.

## 📂 Projektstruktur

- **`js/state.js`**: Zentrales State-Management (Redux-ähnlicher Store mit `localStorage` Persistenz).
- **`js/utils.js`**: Low-Level Excel-Funktionen (Lesen, Parsen, Schreiben, SheetJS-Wrapper).
- **`js/handlers.js`**: Verknüpft UI-Events mit Logik (Controller-Schicht).
- **`js/main.js`**: Einstiegspunkt, initialisiert Event-Listener und State-Subscription.
- **`templates/`**: Enthält die leeren Excel-Vorlagen, die als Basis für Import und Export dienen.

## ⚠️ Bekannte Einschränkungen & Hinweise

- **Dateiformat**: Es werden nur `.xlsx` Dateien unterstützt (kein `.xls` oder `.csv`).
- **Template-Struktur**: Die Anwendung erwartet strikte Einhaltung der Zellpositionen in den Templates (z.B. Auftrags-Nr. in Zelle `N5` des Protokolls). Änderungen am Template-Layout erfordern Anpassungen in `js/utils.js`.
- **Browser-Kompatibilität**: Optimiert für Desktop-Browser. Mobile Nutzung möglich, aber aufgrund der Dateihandhabung eingeschränkt.

## 🤝 Mitwirken

Änderungsvorschläge und Pull Requests sind willkommen. Für größere Änderungen öffne bitte zuerst ein Issue, um die gewünschte Änderung zu diskutieren.

## 📄 Lizenz

[MIT License](LICENSE)
