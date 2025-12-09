# Contract Manager User Guide

**Version:** 1.0  
**Last Updated:** December 2025

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Importing Contracts](#2-importing-contracts)
3. [Reviewing & Correcting Mappings](#3-reviewing--correcting-mappings)
4. [Preview & Error Handling](#4-preview--error-handling)
5. [Working with Contracts](#5-working-with-contracts)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Getting Started

### 1.1 System Requirements

- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
- **File Format:** Microsoft Excel files (.xlsx or .xls only)
- **File Size:** Maximum 10 MB per file

### 1.2 Accessing Contract Manager

1. Open the Abrechnung application in your web browser
2. Navigate to the **Verträge** (Contracts) section from the main menu
3. The Contract Manager interface displays:
   - Import panel (top)
   - Contract statistics (sidebar)
   - Contract list (main area)

### 1.3 Overview of Steps

The contract import process follows these steps:

1. **Import** → Select an Excel file
2. **Select Sheet** → Choose which worksheet to import
3. **Mapping** → Verify or adjust column mappings
4. **Preview** → Review extracted contracts and errors
5. **Save** → Confirm and save contracts to the database
6. **View/Edit** → Work with imported contracts

---

## 2. Importing Contracts

### 2.1 Selecting a File

1. Click the **Datei auswählen** (Choose File) button
2. Select an Excel file (.xlsx or .xls) from your computer
3. The system will automatically analyze the file

**Supported File Types:**
- `.xlsx` (Excel 2007+)
- `.xls` (Legacy Excel)

**File Size Limit:** 10 MB maximum

### 2.2 Automatic Sheet Discovery

After selecting a file, the system:
- Discovers all worksheets in the file
- Displays sheet names with row counts
- Automatically suggests column mappings

### 2.3 Selecting a Worksheet

1. Use the **Arbeitsblatt** (Worksheet) dropdown
2. Select the sheet containing your contract data
3. The row count is displayed next to each sheet name

**Example:**
```
Fertige Aufträge Komplett 1406 (2909 Zeilen)
```

---

## 3. Reviewing & Correcting Mappings

### 3.1 Understanding Column Mappings

The system automatically maps Excel columns to contract fields:

| Contract Field | Description | Required |
|----------------|-------------|----------|
| Auftrag (Contract ID) | Unique contract identifier | ✓ |
| Auftragskopftitel (Title) | Contract title/name | ✓ |
| Status | Current contract status | ✓ |
| Standort (Location) | Work location | - |
| Anlagennummer (Equipment ID) | Equipment identifier | - |
| Sollstart (Planned Start) | Planned start date | - |
| Aufgabe (Task ID) | Task number | - |
| Anlagenbeschreibung | Equipment description | - |

### 3.2 Adjusting Mappings

If the automatic mapping is incorrect:

1. Locate the field in the mapping table
2. Click the dropdown next to the field
3. Select the correct Excel column (e.g., "A: Auftrag")
4. Repeat for any other incorrect mappings

**Mapping Tips:**
- Required fields are marked with a red asterisk (*)
- Detected headers are shown as hints
- Columns can only be mapped to one field

### 3.3 Confidence Scores

The system displays a confidence level:

- **High (>80%)**: Auto-mapping is likely correct
- **Medium (50-80%)**: Review recommended
- **Low (<50%)**: Manual review required

---

## 4. Preview & Error Handling

### 4.1 Generating a Preview

1. After verifying mappings, click **Vorschau generieren** (Generate Preview)
2. Wait for the system to process the data
3. The preview displays:
   - Summary statistics
   - Sample contract data (up to 100 rows)
   - List of errors and warnings

### 4.2 Reading the Preview Table

The preview table shows:
- **#**: Row number in preview
- **Auftrag**: Contract ID
- **Titel**: Contract title
- **Standort**: Location
- **Säule/Raum**: Room/Area
- **Anlage**: Equipment ID
- **Status**: Contract status (color-coded)
- **Sollstart**: Planned start date

### 4.3 Understanding Status Colors

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | fertig | Completed |
| 🟡 Yellow | inbearb | In progress |
| ⚪ Gray | offen | Open |

### 4.4 Interpreting Error Messages

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| Fehlende Pflichtfelder | Required field is empty | Check mapping or source data |
| Ungültiges Datumsformat | Date cannot be parsed | Check date format in Excel |
| Doppelter Datensatz | Duplicate contract detected | Remove duplicate from Excel |

### 4.5 Clicking Errors to Highlight Rows

1. In the error list, click on an error message
2. The corresponding row in the preview table is highlighted
3. Use this to identify and fix issues in your source file

---

## 5. Working with Contracts

### 5.1 Viewing All Imported Contracts

After saving, contracts appear in the main list:
- View up to 100 contracts per page
- Use scrolling to navigate the list

### 5.2 Filtering Contracts

**By Status:**
1. Use the **Status** dropdown filter
2. Select: Alle (All), fertig, inbearb, or offen

**By Search Text:**
1. Enter text in the **Suche** (Search) field
2. Search works across: Contract ID, Title, Location, Equipment ID

**By Date Range:**
1. Select a **From** date
2. Select a **To** date
3. Only contracts within the range are shown

**Clearing Filters:**
Click **Filter zurücksetzen** to clear all filters

### 5.3 Sorting by Any Column

1. Click on a column header to sort
2. Click again to toggle ascending/descending
3. An arrow (▲/▼) indicates sort direction

**Sortable Columns:**
- Auftrag (Contract ID)
- Titel (Title)
- Standort (Location)
- Säule/Raum (Room)
- Anlage (Equipment)
- Status
- Sollstart (Date)

### 5.4 Editing a Contract

1. Find the contract in the list
2. Click the **Bearbeiten** (Edit) button
3. Enter the new status value
4. Click OK to save changes

**Editable Fields (Current Version):**
- Status only

### 5.5 Statistics Overview

The statistics panel shows:
- **Total Contracts**: Number of imported contracts
- **Unique IDs**: Number of unique contract IDs
- **Imported Files**: Number of Excel files imported
- **By Status**: Breakdown by status

---

## 6. Troubleshooting

### 6.1 "Datei ist zu groß" (File is too large)

**Problem:** File exceeds 10 MB limit

**Solutions:**
- Split your Excel file into multiple smaller files
- Remove unnecessary columns or sheets
- Save as .xlsx instead of .xls (better compression)

### 6.2 "Pflichtfeld nicht gefunden" (Required field not found)

**Problem:** The system cannot locate a required field

**Solutions:**
- Check that your Excel file has the required columns
- Manually adjust the column mapping
- Verify header row is in row 1

### 6.3 "Verträge werden nicht gespeichert" (Contracts not saving)

**Problem:** Browser storage limit reached

**Solutions:**
- Clear old data using the **Reset** function
- Check browser privacy settings
- Ensure browser allows localStorage

### 6.4 "Import dauert zu lange" (Import takes too long)

**Problem:** Large file is slow to process

**Solutions:**
- Use files with <5000 rows per sheet
- Split large imports into multiple files
- Close other browser tabs

### 6.5 "Spalten werden falsch zugeordnet" (Wrong column mapping)

**Problem:** Auto-mapping selected wrong columns

**Solutions:**
- Check that header names match expected patterns
- Manually correct mappings before import
- Ensure header row is in row 1 (not merged cells)

### 6.6 "Datumswerte werden nicht erkannt" (Dates not recognized)

**Problem:** Date fields show as numbers or incorrect dates

**Solutions:**
- Format dates in Excel as dates (not text)
- Use ISO format: YYYY-MM-DD
- Use German format: DD.MM.YYYY or DD/MM/YYYY

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Tab | Navigate between fields |
| Enter | Confirm selection |
| Escape | Close dialog/cancel |

---

## Best Practices

1. **Before Import:**
   - Verify Excel file has headers in row 1
   - Check that required columns exist
   - Remove empty rows at the end

2. **During Import:**
   - Review suggested mappings carefully
   - Check preview for errors before saving
   - Note any warnings for follow-up

3. **After Import:**
   - Verify contract count matches expectations
   - Use filters to spot-check data quality
   - Save a backup of your original Excel file

---

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages (F12)
2. Note the exact error message
3. Contact your system administrator

---

**Document Version:** 1.0  
**Created:** December 2025  
**Author:** Contract Manager Development Team
