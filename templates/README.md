# Excel Templates

This folder should contain the following Excel template files:

## protokoll.xlsx
- **Purpose**: Reference template for inspection protocols
- **Sheet Name**: "Vorlage"
- **Required Cells**:
  - U3: Protokoll-Nr.
  - N5: Auftrags-Nr.
  - A10: Anlage
  - T10: Einsatzort
  - T7: Firma
  - A5: Auftraggeber
  - Rows 30-325: Position data in columns A (Pos.Nr.) and quantity in columns X, B, or C (checked in that order)

## abrechnung.xlsx
- **Purpose**: Template for generated billing documents
- **Sheet Name**: "EAW"
- **Header Cells** (to be filled by app):
  - B1: Datum
  - B2: Auftrags-Nr.
  - B3: Anlage
  - B4: Einsatzort
- **Data Area** (rows 9+):
  - Column A: Position numbers
  - Column B: Quantities (to be filled by app)
  - Column C: Description
  - Column D: Unit
  - Column E: Price per unit
  - Column F: Total (formula =B*E)

## Setup Instructions

1. Place your `protokoll.xlsx` template file in this folder
2. Place your `abrechnung.xlsx` template file in this folder
3. Ensure the sheet names and cell positions match the specifications above
4. The application will read these templates when generating billing documents

## Note

The actual Excel files are not included in version control. You must provide your own templates matching the structure described above.
