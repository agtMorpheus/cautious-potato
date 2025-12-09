# Abrechnung-Anwendung

Eine Web-Anwendung zur automatisierten Erstellung von Abrechnungsdokumenten aus Prüfprotokollen.

Die Anwendung liest Excel-basierte Prüfprotokolle (`protokoll.xlsx`), aggregiert die enthaltenen Mengen nach Positionsnummern und füllt automatisch ein Abrechnungs-Template (`abrechnung.xlsx`). Alle Prozesse laufen lokal im Browser ab, ohne dass Daten auf einen externen Server hochgeladen werden.

## 📚 Documentation

For comprehensive documentation, see:
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and module structure
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Desktop Application Guide](docs/DESKTOP.md)** - Running as a desktop app with Electron
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security Review](docs/SECURITY.md)** - Security assessment and recommendations
- **[Accessibility Audit](docs/ACCESSIBILITY.md)** - WCAG 2.1 compliance review

## 🚀 Features

- **Import**: Einlesen von `protokoll.xlsx` Dateien via Dateiauswahl
- **Automatische Aggregation**: Summiert Mengen basierend auf identischen Positionsnummern (z.B. `01.01.0010`)
- **Template-Engine**: Füllt ein vordefiniertes Excel-Template (`abrechnung.xlsx`) mit:
  - Header-Daten (Auftrags-Nr., Anlage, Einsatzort, Datum, etc.)
  - Aggregierten Positionsmengen
  - Automatisch berechneten Summen (unter Beibehaltung von Excel-Formeln)
- **Export**: Generiert eine fertige `.xlsx` Datei zum Download
- **Datenschutz**: Lokale Verarbeitung im Browser (Client-Side Only)
- **Status-Tracking**: Visuelles Feedback über den aktuellen Verarbeitungsstatus
- **Persistenz**: Zwischenspeicherung des Bearbeitungsstatus im `localStorage` (Verlustschutz bei Page-Reload)
- **Desktop-Anwendung**: Ausführbar als eigenständige Desktop-Anwendung mit Electron (Windows, macOS, Linux)

## 🛠 Technologien

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- **Excel-Verarbeitung**: [SheetJS (xlsx)](https://sheetjs.com/) - Loaded from CDN
- **Desktop**: [Electron](https://www.electronjs.org/) - Für eigenständige Desktop-Anwendung
- **Server (Dev/Local)**: Jeder lokale Webserver (XAMPP, Python http.server, Node http-server, etc.)
- **Speicherung**: Browser `localStorage`

## 📦 Installation & Setup

Da die Anwendung client-seitig läuft, wird lediglich ein lokaler Webserver benötigt, um ES6 Module und CORS-Richtlinien korrekt zu behandeln.

### Voraussetzungen
- Ein lokaler Webserver (siehe Optionen unten)
- Ein moderner Webbrowser (Chrome, Firefox, Edge, Safari)
- Excel-Templates (`protokoll.xlsx` und `abrechnung.xlsx`)

### Option 1: XAMPP (empfohlen für Windows)

1. **XAMPP installieren**:
   - Download: [https://www.apachefriends.org/de/index.html](https://www.apachefriends.org/de/index.html)
   - Installiere XAMPP

2. **Repository klonen**:
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/agtMorpheus/cautious-potato.git abrechnung-app
   cd abrechnung-app
   ```

3. **Templates hinzufügen**:
   - Kopiere deine `protokoll.xlsx` und `abrechnung.xlsx` Templates in den `templates/` Ordner
   - Siehe `templates/README.md` für die erforderliche Template-Struktur

4. **Server starten**:
   - Öffne das **XAMPP Control Panel**
   - Starte das Modul **Apache**

5. **Anwendung öffnen**:
   - Navigiere im Browser zu: `http://localhost/abrechnung-app/`

### Option 2: Python (plattformübergreifend)

```bash
# Repository klonen
git clone https://github.com/agtMorpheus/cautious-potato.git abrechnung-app
cd abrechnung-app

# Templates hinzufügen (siehe templates/README.md)

# Server starten
python -m http.server 8000
# oder für Python 2:
# python -m SimpleHTTPServer 8000

# Im Browser öffnen: http://localhost:8000
```

### Option 3: Node.js http-server

```bash
# Repository klonen
git clone https://github.com/agtMorpheus/cautious-potato.git abrechnung-app
cd abrechnung-app

# Templates hinzufügen (siehe templates/README.md)

# http-server installieren (falls nicht vorhanden)
npm install -g http-server

# Server starten
http-server -p 8000

# Im Browser öffnen: http://localhost:8000
```

### Option 4: Desktop-Anwendung (Electron)

```bash
# Repository klonen
git clone https://github.com/agtMorpheus/cautious-potato.git abrechnung-app
cd abrechnung-app

# Abhängigkeiten installieren
npm install

# Templates hinzufügen (siehe templates/README.md)

# Desktop-Anwendung starten
npm run electron

# Oder im Entwicklungsmodus (mit DevTools)
npm run electron:dev
```

**Installationspakete erstellen:**
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

Die erstellten Installationspakete befinden sich im `dist/` Ordner.

Für detaillierte Informationen zur Desktop-Anwendung siehe [Desktop Application Guide](docs/DESKTOP.md).

### Dateistruktur

Nach dem Setup sollte die Struktur wie folgt aussehen:
```
/abrechnung-app
├── assets/
│   ├── icon.svg          (Anwendungs-Icon)
│   └── README.md
├── css/
│   └── styles.css
├── electron/
│   ├── main.js           (Electron Hauptprozess)
│   └── preload.js        (Sicherheits-Bridge)
├── js/
│   ├── state.js
│   ├── utils.js
│   ├── handlers.js
│   └── main.js
├── templates/
│   ├── protokoll.xlsx    (von Ihnen bereitzustellen)
│   ├── abrechnung.xlsx   (von Ihnen bereitzustellen)
│   └── README.md
├── index.html
├── README.md
├── .gitignore
└── (weitere Dokumentationsdateien)
```

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
