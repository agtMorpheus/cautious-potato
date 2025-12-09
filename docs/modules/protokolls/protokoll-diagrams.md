# Protokoll Module - Visual Architecture & Workflow Diagrams

## 1. High-Level Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROTOKOLL MODULE                           │
│                   (New Component - Phase X)                      │
└─────────────────────────────────────────────────────────────────┘

                              ▲
                              │ User Input
                              │
                    ┌─────────▼──────────┐
                    │  Protokoll UI      │
                    │  (HTML Form)       │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
    Event Flow          Render Updates          State Updates
        │                     │                      │
        ▼                     ▼                      ▼
  ┌──────────────┐    ┌─────────────────┐  ┌──────────────────┐
  │  Handlers    │    │   Renderer      │  │  State Manager   │
  │              │    │                 │  │                  │
  │ • Input      │    │ • Form UI       │  │ • Metadata       │
  │ • Events     │    │ • Fields        │  │ • Positions      │
  │ • Validation │    │ • Tables        │  │ • Results        │
  │ • Export     │    │ • Messages      │  │ • Form State     │
  └──────────────┘    └────────┬────────┘  └────────┬─────────┘
                               │                    │
                               │                    ▼
                               │            ┌───────────────┐
                               │            │  localStorage │
                               │            │  (Persistence)│
                               │            └───────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
  ┌──────────────┐                            ┌─────────────────┐
  │  Validator   │                            │  Exporter       │
  │              │                            │                 │
  │ • Field      │                            │ • Load Template │
  │ • Position   │                            │ • Fill Template │
  │ • Form       │                            │ • Generate File │
  │ • Rules      │                            │ • Download      │
  └──────────────┘                            └─────────────────┘
```

---

## 2. Module Interaction Flow

```
User Opens App
    │
    ▼
┌─────────────────────────┐
│  main.js initializes    │
│  Protokoll Module       │
└────────────┬────────────┘
             │
             ▼
    ┌────────────────┐
    │ Render Step 1: │         ┌──────────────────────────┐
    │ Metadata Form  ├────────▶│ protokoll-renderer.js    │
    └────────┬───────┘         │ renderMetadataForm()     │
             │                 └──────────────────────────┘
             │
    User fills form
             │
             ▼
    ┌────────────────┐         ┌──────────────────────────┐
    │ On Field Change│────────▶│ protokoll-handlers.js    │
    │ Event          │         │ handleMetadataChange()   │
    └────────┬───────┘         └────────────┬─────────────┘
             │                              │
             │                              ▼
             │                   ┌──────────────────────────┐
             │                   │ protokoll-validator.js   │
             │                   │ validateField()          │
             │                   └────────────┬─────────────┘
             │                                │
             │              ┌─────────────────┴──────────────┐
             │              │ Valid?                        │
             │              │                               │
             │         Yes  │ No                      Yes    │
             │              ▼                         ▼      │
             │        ┌────────────┐         ┌──────────────┐
             │        │ Update UI  │         │ Display Error│
             │        │ (Success)  │         │ (Red Field)  │
             │        └────────────┘         └──────────────┘
             │              │                        │
             └──────────────┴────────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ Update State in  │
                   │ protokoll-state  │
                   └────────────┬─────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │ Save to localStorage     │
                   │ (Auto-save every 30s)    │
                   └──────────────────────────┘
                                │
                         User continues...
                                │
                                ▼
                   ┌──────────────────────────┐
                   │ Progress indicator shows │
                   │ current step + completion│
                   └────────────┬─────────────┘
                                │
                                ▼
                        ┌────────────────┐
                        │ User clicks    │
                        │ "Next Step"    │
                        └────────┬───────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Validate entire│
                        │ form step      │
                        └────────┬───────┘
                                 │
                    ┌────────────┴────────────┐
                    │                        │
              Valid │ Invalid               │
                    ▼                        ▼
         ┌─────────────────┐     ┌──────────────────┐
         │ Show next step  │     │ Show validation  │
         │ (Step 2, 3, 4)  │     │ errors, block    │
         └─────────────────┘     └──────────────────┘
```

---

## 3. Step-by-Step Form Navigation

```
┌─────────────────────────────────────────────────────────┐
│                    PROTOKOLL FORM FLOW                  │
└─────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   START (Step 0) │
                    │  Progress: 0%    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  STEP 1: METADATA│
                    │  Progress: 25%   │
                    ├──────────────────┤
                    │✓ Protocol Number │
                    │✓ Facility Name   │
                    │✓ Inspector Name  │
                    │✓ Network Info    │
                    └────────┬─────────┘
                             │
                      User fills & clicks Next
                             │
                             ▼
                    ┌──────────────────┐      Validation
                    │  STEP 2: POSITIONS│ ◀──── Errors?
                    │  Progress: 50%   │      Show & block
                    ├──────────────────┤
                    │+ Add Position    │
                    │• Circuit Table   │
                    │  [Row 1]         │
                    │  [Row 2]         │
                    │  ...             │
                    └────────┬─────────┘
                             │
                      User adds positions, clicks Next
                             │
                             ▼
                    ┌──────────────────┐      Validation
                    │  STEP 3: RESULTS │ ◀──── Errors?
                    │  Progress: 75%   │      Show & block
                    ├──────────────────┤
                    │ Defects Found?   │
                    │ - Yes / No       │
                    │ Cert Placed?     │
                    │ - Yes / No       │
                    │ RE Value:        │
                    │ [       ] Ω      │
                    │ Next Inspection: │
                    │ [date picker]    │
                    └────────┬─────────┘
                             │
                      User fills & clicks Next
                             │
                             ▼
                    ┌──────────────────┐      Final
                    │  STEP 4: REVIEW  │ ◀──── Validation
                    │  Progress: 100%  │
                    ├──────────────────┤
                    │ Summary of all   │
                    │ entered data     │
                    │                  │
                    │ [EXPORT BUTTONS] │
                    │ • Protokoll only │
                    │ • Abrechnung only│
                    │ • Both files     │
                    └────────┬─────────┘
                             │
                      User clicks Export
                             │
                             ▼
                    ┌──────────────────┐
                    │  FINAL VALIDATION│
                    │  All fields OK?  │
                    └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              Valid │                 │ Invalid
                    │                 │
                    ▼                 ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Generate Files   │  │ Show Errors      │
        │ • protokoll.xlsx │  │ Block Export     │
        │ • abrechnung.xlsx│  │ Return to step   │
        └────────┬─────────┘  └──────────────────┘
                 │
        Generating... (Progress spinner)
                 │
                 ▼
        ┌──────────────────┐
        │ Files Generated  │
        │ Ready to download│
        └────────┬─────────┘
                 │
        Browser download triggered
                 │
                 ▼
        ┌──────────────────┐
        │ SUCCESS MESSAGE  │
        │ Files exported   │
        │ at 2025-12-09... │
        └──────────────────┘
```

---

## 4. Form Data State Tree

```
protokollState (Root)
│
├── metadata (Object)
│   ├── protokollNumber: "EDB101120250925"
│   ├── datum: "2025-12-09T19:21:00Z"
│   ├── auftraggeber: "Volkswagen AG"
│   ├── auftraggaberAdresse: "Berliner Ring 2, 38436 Wolfsburg"
│   ├── auftragnummer: "A5937814"
│   ├── kundennummer: "1406"
│   ├── auftragnehmer: "EAW Wolfsburg"
│   ├── auftragnehmerAdresse: "Dieselstraße 27, 38446 Wolfsburg"
│   │
│   ├── facility (Object)
│   │   ├── name: "LV-UM-Mb-55"
│   │   ├── address: "..."
│   │   ├── anlage: "Halle 3, Feld Mb55"
│   │   ├── location: "..."
│   │   ├── inventory: "E03150AP17000000226"
│   │   ├── prüfArt: ["Wiederholungsprüfung"]
│   │   ├── netzspannung: "230/400"
│   │   ├── netzform: "TN-S"
│   │   └── netzbetreiber: ""
│   │
│   └── prüfer (Object)
│       ├── name: "M. Hildermann"
│       ├── titel: "Dipl. Ing."
│       └── unterschrift: "[signature]"
│
├── positions (Array)
│   ├── [0] (Object)
│   │   ├── posNr: "01.01.0010"
│   │   ├── stromkreisNr: "F5"
│   │   ├── zielbezeichnung: "Einspeisung AN L1"
│   │   ├── leitung (Object)
│   │   │   ├── typ: "NYM-J"
│   │   │   ├── anzahl: "5"
│   │   │   └── querschnitt: "16"
│   │   ├── spannung (Object)
│   │   │   ├── un: "227"
│   │   │   └── fn: "50"
│   │   ├── überstromschutz (Object)
│   │   │   ├── art: "gG D02"
│   │   │   ├── inNennstrom: "63"
│   │   │   ├── zs: "0.33"
│   │   │   ├── zn: "0.42"
│   │   │   └── ik: "0.691"
│   │   ├── messwerte (Object)
│   │   │   ├── riso: ">999"
│   │   │   ├── schutzleiterWiderstand: ""
│   │   │   ├── rcd: ""
│   │   │   ├── differenzstrom: ""
│   │   │   └── auslösezeit: ""
│   │   └── prüfergebnis (Object)
│   │       ├── status: "ok"
│   │       ├── mängel: []
│   │       └── bemerkung: ""
│   │
│   ├── [1] (Object)
│   │   └── ... (similar structure)
│   │
│   └── [...] (more positions)
│
├── prüfungsergebnis (Object)
│   ├── mängelFestgestellt: false
│   ├── plakette: "ja"
│   ├── nächsterPrüfungstermin: "2028-02-01T00:00:00Z"
│   └── bemerkung: ""
│
└── formState (Object)
    ├── currentStep: "metadata" | "positions" | "results" | "review"
    ├── positionCount: 42
    ├── unsavedChanges: true
    ├── validationErrors: {}
    │   ├── "metadata.auftraggeber": "Field required"
    │   └── ...
    └── isDirty: true
```

---

## 5. Event Handling Flow

```
USER ACTION
    │
    ▼
Browser captures event
(change, input, click, etc.)
    │
    ▼
EVENT BUBBLES UP TO FORM
    │
    ▼
handlers.js detects event
    │
    ├─ Identifies event type
    ├─ Extracts field name & value
    └─ Calls appropriate handler
         │
         ▼
    protokoll-handlers.js
    handleMetadataChange()
         │
         ├─ Extract: field = "auftraggeber"
         ├─ Extract: value = "Volkswagen AG"
         │
         ▼
    validator.validateField()
         │
         ├─ Check: required? Yes ✓
         ├─ Check: minLength? Yes ✓
         ├─ Check: pattern? Yes ✓
         │
         ▼
    Results: { isValid: true }
         │
         ├─ Valid: Proceed
         └─ Invalid: Return error
                │
                ▼
           Display error in UI
           (Red border, error message)
                │
                STOP (Don't update state)
         
    Valid flow continues:
         │
         ▼
    state.setMetadata({
      ...currentMetadata,
      auftraggeber: "Volkswagen AG"
    })
         │
         ├─ Update in-memory state
         ├─ Mark unsavedChanges = true
         ├─ Emit 'metadataChanged' event
         │
         ▼
    localStorage autosave (queued)
         │
         ▼
    renderer.updateField()
         │
         ├─ Update UI value
         ├─ Clear error message
         ├─ Show confirmation (green check)
         │
         ▼
    UI reflects change
    User sees field updated
```

---

## 6. Export Process Flow

```
USER CLICKS "Export Both Files"
    │
    ▼
handlers.handleExportBoth()
    │
    ├─ Disable export buttons (prevent double-click)
    ├─ Show "Generating..." spinner
    │
    ▼
validator.validateForm()
    │
    ├─ All required fields filled?
    ├─ All positions valid?
    ├─ Results section complete?
    │
    ├─ Validation FAILS
    │   ├─ Show validation error messages
    │   ├─ Highlight problem fields
    │   ├─ Hide spinner
    │   └─ Enable buttons again
    │   │
    │   STOP - User must fix errors
    │
    └─ Validation PASSES ✓
         │
         ▼
exporter.exportProtokoll() + exportAbrechnung()
         │
    ┌────┴────┐
    │          │
    ▼          ▼
Task 1:    Task 2:
Protokoll  Abrechnung
    │          │
    ├─▶ Load template from /templates/protokoll.xlsx
    ├─▶ Parse with XLSX.read()
    │          │
    ▼          ▼
fillProtokollTemplate(wb, data)  fillAbrechnungTemplate(wb, data)
    │          │
    ├─ Fill Metadata
    │  ├─ Cell U3: protokollNumber
    │  ├─ Cell N5: facility name
    │  └─ ... (other cells)
    │
    ├─ Fill Positions
    │  ├─ Row 30+: Position data
    │  ├─ Calculate totals
    │  └─ Format cells
    │
    ├─ Fill Results
    │  ├─ Inspection results
    │  ├─ Signatures
    │  └─ Dates
    │
    ▼
Format & Validate Workbook
    ├─ Check sheet integrity
    ├─ Verify formulas
    └─ Validate data ranges
         │
         ├─ Issues found
         │  └─ Log errors, but continue
         │
         ▼
Generate Filename
    ├─ protokoll_EDB101120250925_2025-12-09.xlsx
    ├─ abrechnung_EDB101120250925_2025-12-09.xlsx
         │
         ▼
Create downloadable Blob
    ├─ XLSX.write(wb, { type: 'array' })
    ├─ Create Blob from array
    └─ Create Object URL
         │
         ▼
Trigger Browser Download
    ├─ Create <a> element
    ├─ Set href to Blob URL
    ├─ Set download attribute
    ├─ Simulate click
    ├─ Revoke Blob URL
         │
    Wait for both files...
         │
         ▼
Both Downloads Complete
    ├─ Hide spinner
    ├─ Enable export buttons
    ├─ Show success message:
    │  "Files exported successfully!
    │   Downloaded at 2025-12-09 19:45:32
    │   • protokoll_EDB101120250925_2025-12-09.xlsx
    │   • abrechnung_EDB101120250925_2025-12-09.xlsx"
    │
    ├─ Add to export history
    ├─ Save to localStorage
    │
    ▼
SUCCESS!
User can find files in Downloads folder
```

---

## 7. Validation Rules Hierarchy

```
FORM VALIDATION
    │
    ├─ Step 1: METADATA
    │   ├─ protokollNumber (REQUIRED)
    │   │   ├─ Not empty
    │   │   ├─ Pattern: /^[A-Z0-9]{3,20}$/
    │   │   └─ No duplicates in current session
    │   │
    │   ├─ auftraggeber (REQUIRED)
    │   │   ├─ Not empty
    │   │   ├─ minLength: 3
    │   │   └─ maxLength: 100
    │   │
    │   ├─ facility.name (REQUIRED)
    │   ├─ facility.netzform (REQUIRED)
    │   │   └─ Enum: [TN-C, TN-S, TN-C-S, TT, IT]
    │   └─ prüfer.name (REQUIRED)
    │
    ├─ Step 2: POSITIONS
    │   ├─ At least 1 position (REQUIRED)
    │   │
    │   └─ Each Position:
    │       ├─ stromkreisNr (REQUIRED)
    │       │   └─ Pattern: /^[F0-9]{1,3}$/
    │       │
    │       ├─ zielbezeichnung (REQUIRED)
    │       │   └─ minLength: 3
    │       │
    │       ├─ spannung.un (REQUIRED)
    │       │   ├─ Type: number
    │       │   └─ Range: 0-1000V
    │       │
    │       ├─ spannung.fn (REQUIRED)
    │       │   └─ Enum: [50, 60]
    │       │
    │       └─ messwerte.riso (REQUIRED)
    │           ├─ Type: number
    │           └─ min: 0
    │
    ├─ Step 3: RESULTS
    │   ├─ prüfungsergebnis.status (REQUIRED)
    │   ├─ prüfungsergebnis.plakette (REQUIRED)
    │   └─ prüfungsergebnis.nächsterPrüfungstermin (REQUIRED)
    │
    └─ Step 4: REVIEW
        └─ Read-only (no validation needed)
```

---

## 8. Component Interaction Matrix

```
                 State  Handlers Renderer Validator Exporter
┌──────────────────────────────────────────────────────────┐
│Metadata Input  │  ✓  │   ✓    │   ✓   │    ✓   │        │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│Position Add    │  ✓  │   ✓    │   ✓   │    ✓   │        │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│Form Navigation │  ✓  │   ✓    │   ✓   │    ✓   │        │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│Validation      │     │   ✓    │       │    ✓   │        │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│Export          │  ✓  │   ✓    │   ✓   │    ✓   │   ✓    │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│localStorage    │  ✓  │        │       │        │        │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│UI Update       │     │        │   ✓   │        │        │
├────────────────┼──────┼────────┼───────┼────────┼────────┤
│Error Display   │     │   ✓    │   ✓   │    ✓   │   ✓    │
└──────────────────────────────────────────────────────────┘

Legend:
✓ = Direct interaction
- = No interaction
(blank) = No interaction
```

---

## 9. Error Handling Strategy

```
ERROR TYPES
│
├─ USER INPUT ERRORS (Validation)
│  │
│  ├─ Type: Validation Error
│  ├─ Location: protokoll-validator.js
│  ├─ Handling:
│  │  ├─ Display field-level error in red
│  │  ├─ Show error message below field
│  │  ├─ Block form submission
│  │  └─ Highlight field border
│  │
│  └─ Recovery: User corrects input
│
├─ TEMPLATE ERRORS (File System)
│  │
│  ├─ Type: Missing/Corrupted template
│  ├─ Location: protokoll-exporter.js
│  ├─ Handling:
│  │  ├─ Catch file read error
│  │  ├─ Log to console
│  │  ├─ Show user-friendly message
│  │  │  "Failed to load template. Please refresh."
│  │  └─ Disable export button
│  │
│  └─ Recovery: User refreshes page
│
├─ EXCEL GENERATION ERRORS
│  │
│  ├─ Type: SheetJS error
│  ├─ Location: protokoll-exporter.js
│  ├─ Handling:
│  │  ├─ Try/catch around XLSX operations
│  │  ├─ Log full error to console
│  │  ├─ Show generic error message
│  │  │  "File generation failed. Please try again."
│  │  └─ Provide "Retry" button
│  │
│  └─ Recovery: User clicks Retry
│
├─ DOWNLOAD ERRORS
│  │
│  ├─ Type: Browser download failure
│  ├─ Location: protokoll-exporter.js
│  ├─ Handling:
│  │  ├─ Set timeout on download
│  │  ├─ If download doesn't start, show fallback
│  │  ├─ Offer manual file size check
│  │  └─ Suggest trying different browser
│  │
│  └─ Recovery: User retries or uses different browser
│
└─ localStorage ERRORS
   │
   ├─ Type: Storage quota exceeded
   ├─ Location: protokoll-state.js
   ├─ Handling:
   │  ├─ Catch quota exceeded error
   │  ├─ Delete oldest autosave
   │  ├─ Retry save
   │  ├─ If still fails, warn user
   │  └─ Disable autosave until space freed
   │
   └─ Recovery: User clears browser cache or history
```

---

## 10. Mobile Responsiveness Layout

```
DESKTOP (≥1024px)
┌──────────────────────────────────┐
│        Form Container            │
├─────────────────────────────────┤
│  Progress Bar (Horizontal)       │
│  ████████░░░░░░░░░░░░░░░  50%   │
├─────────────────────────────────┤
│  Metadata Form (Column 1)        │
│  ┌─────────────┬─────────────┐   │
│  │Field 1 │Field 2 │           │
│  │Field 3 │Field 4 │           │
│  └─────────────┴─────────────┘   │
├─────────────────────────────────┤
│  Navigation Buttons (Flex)       │
│  [Previous]              [Next]  │
└─────────────────────────────────┘

TABLET (768px - 1023px)
┌──────────────────────────────────┐
│        Form Container            │
├─────────────────────────────────┤
│  Progress Bar (Vertical list)    │
│  ✓ Step 1                        │
│  → Step 2                        │
│  ○ Step 3                        │
│  ○ Step 4                        │
├─────────────────────────────────┤
│  Metadata Form (Single Column)   │
│  ┌─────────────────────────────┐ │
│  │Field 1                      │ │
│  │Field 2                      │ │
│  │Field 3                      │ │
│  └─────────────────────────────┘ │
├─────────────────────────────────┤
│  Navigation Buttons (Stacked)   │
│  [Previous]                      │
│  [Next]                          │
└─────────────────────────────────┘

MOBILE (<768px)
┌──────────────────────────────┐
│  Form Container              │
├──────────────────────────────┤
│ Progress: Step 2 of 4 (50%) │
├──────────────────────────────┤
│ Form Fields (Full Width)     │
│ ┌──────────────────────────┐ │
│ │Field 1                   │ │
│ ├──────────────────────────┤ │
│ │Field 2                   │ │
│ ├──────────────────────────┤ │
│ │Field 3                   │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [Previous] [Next] (Stacked)  │
│ (Full width buttons)          │
└──────────────────────────────┘
```

---

## Summary of Key Interactions

| Flow | Components | Key Methods |
|------|-----------|------------|
| **Form Input** | Handlers → Validator → State → Renderer | `handleChange()` → `validateField()` → `setState()` → `renderField()` |
| **Navigation** | Handlers → Validator → State → Renderer | `handleNextStep()` → `validateStep()` → `setFormStep()` → `renderStep()` |
| **Export** | Handlers → Validator → Exporter | `handleExport()` → `validateForm()` → `exportFile()` |
| **Persistence** | State | `setState()` → `saveToLocalStorage()` |
| **Error Display** | Validator → Renderer | `validate()` → `displayError()` |

This architecture ensures clean separation of concerns, testability, and maintainability while providing a smooth user experience.
