# Troubleshooting Guide

## Common Issues

### Issue: "Import failed: Invalid file type"

**Symptom**: Cannot import .xlsx file, error says "Ungültiges Dateiformat"

**Causes**:
- File is not a valid Excel file (.xls, .csv, etc.)
- File MIME type is not recognized by browser
- File is corrupted

**Solutions**:
1. Verify file extension is `.xlsx` (not `.xls` or `.csv`)
2. Re-save file in Excel as `.xlsx` format (Excel 2007+)
3. Copy content to a fresh Excel workbook and save as `.xlsx`
4. Try from a different browser (Chrome, Firefox, Edge)

---

### Issue: "Metadata fields are missing"

**Symptom**: Import fails with error about missing metadata (Auftrags-Nr., Protokoll-Nr., etc.)

**Causes**:
- Using wrong protokoll template version
- Template cells were deleted or moved
- Data not entered in correct cells

**Solutions**:
1. Use official `protokoll.xlsx` template, not a modified version
2. Verify data is in the correct cells:
   - Protokoll-Nr. → Cell U3
   - Auftrags-Nr. → Cell N5
   - Anlage → Cell A10
   - Einsatzort → Cell T10
   - Firma → Cell T7
   - Auftraggeber → Cell A5
3. Ensure cells are not empty
4. If cells were moved, contact template maintainer for updated version

---

### Issue: No positions are extracted

**Symptom**: Import succeeds, but shows 0 positions extracted

**Causes**:
- Position data is in wrong columns/rows
- Rows outside the 30-325 range
- Position numbers or quantities are empty
- Quantity column is not X, B, or C

**Solutions**:
1. Verify position data starts at row 30
2. Verify position numbers (Pos.Nr.) are in Column A
3. Check that quantities (Menge) are in Column X, B, or C
4. Ensure position numbers follow format: DD.DD.DDDD (e.g., 01.01.0010)
5. Ensure quantities are numeric values, not text
6. If data is in different columns, contact support for template customization

---

### Issue: "Failed to load template" during generation

**Symptom**: Generate fails with error about template loading

**Causes**:
- `templates/abrechnung.xlsx` is missing from server
- File permissions prevent reading template
- Server returned 404 error
- Network error

**Solutions**:
1. Verify `templates/abrechnung.xlsx` exists on server
2. Check file permissions (should be readable by web server)
3. Check server is running (XAMPP Apache, Python HTTP server, etc.)
4. Try accessing template directly: `http://localhost:8000/templates/abrechnung.xlsx`
5. Check browser console (F12) for detailed error message
6. If using XAMPP, check logs: `xampp/apache/logs/error.log`

---

### Issue: Export button doesn't work or nothing downloads

**Symptom**: Click export, nothing happens, no file downloads

**Causes**:
- Browser security policy prevents downloads
- SheetJS library not loaded
- No workbook in memory (generation failed)
- Browser popup blocker

**Solutions**:
1. Check browser console (F12) for errors
2. Verify SheetJS loaded: type `XLSX` in console, should return object
3. Try different browser (Chrome, Firefox, Edge)
4. Clear browser cache and reload page (Ctrl+Shift+R)
5. Check browser popup/download settings (allow downloads)
6. Disable popup blocker for this site
7. Ensure you clicked "Generate" before "Export"

---

### Issue: Browser console errors

**Symptom**: Page loads but console (F12) shows red errors

**Common Errors**:

**"Cannot find module / Unexpected token"**
- **Problem**: JavaScript syntax error or missing import
- **Solution**: Refresh page, clear cache. If persists, contact developer

**"localStorage is not defined"**
- **Problem**: Browser localStorage disabled or in private mode
- **Solution**: Disable private browsing, enable localStorage in browser settings

**"XLSX is not defined"**
- **Problem**: SheetJS library didn't load from CDN
- **Solution**: Check internet connection, refresh page, check network tab in DevTools

**"Failed to fetch"**
- **Problem**: Server not running or template file not accessible
- **Solution**: Verify server is running, check file paths

---

### Issue: Data persists after reset

**Symptom**: After clicking "Anwendung zurücksetzen", data reappears after page reload

**Causes**:
- localStorage not cleared properly
- Browser cache interference
- localStorage disabled

**Solutions**:
1. Manually clear localStorage:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Find `abrechnungAppState_v1` and delete it
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private browsing to rule out cache issues
4. Hard reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

### Issue: Performance - application is slow

**Symptom**: Import/generation takes > 5 seconds

**Causes**:
- Very large protokoll file (> 1000 positions)
- Slow computer or browser
- Browser extensions interfering
- Lots of other tabs open
- Large amounts of data in localStorage

**Solutions**:
1. Check file size - are there really 1000+ positions?
2. Close other browser tabs and disable extensions
3. Try in a different browser
4. Try on a different computer
5. Check computer performance (Task Manager/Activity Monitor)
6. Clear localStorage if very large

**Advanced Profiling**:
- Open DevTools Performance tab (F12)
- Click Record button
- Perform the slow operation
- Stop recording
- Look for long red bars (long tasks > 50ms)
- Take screenshot and contact developer with recording

---

### Issue: Duplicate position numbers

**Symptom**: Warning message about duplicate position numbers

**Causes**:
- Same position number appears multiple times in protokoll
- This is expected behavior if same position appears in multiple rows

**Solutions**:
1. **This is not an error** - the application will automatically sum the quantities
2. Review the protokoll to verify duplicates are intentional
3. Check the generated summary to verify totals are correct
4. If duplicates are unintentional, correct the protokoll and re-import

---

### Issue: Incorrect quantities in export

**Symptom**: Generated abrechnung has wrong quantities

**Causes**:
- Position numbers don't match between protokoll and template
- Quantities in wrong column
- Formula errors in template

**Solutions**:
1. Verify position numbers in protokoll match template exactly
2. Check that quantities are being read from correct column (X, B, or C)
3. Open generated abrechnung.xlsx and check formulas in Column F
4. Compare protokoll and abrechnung side by side
5. Check for data type issues (text vs numbers)

---

### Issue: Missing positions in export

**Symptom**: Some positions from protokoll don't appear in export

**Causes**:
- Position numbers in protokoll don't exist in template
- Template only has predefined positions

**Solutions**:
1. Check which positions are missing
2. Verify template contains those position numbers
3. Template must be updated to include new positions
4. Contact template maintainer to add missing positions

---

## XAMPP Issues

### "Cannot start Apache"

**Causes**:
- Port 80 already in use (Skype, IIS, another web server)
- Another Apache instance running
- Permission issues

**Solutions**:
1. Check if port 80 is in use (Windows):
   ```
   netstat -ano | find ":80"
   ```
2. Stop conflicting service or change Apache port:
   - Edit `apache/conf/httpd.conf`
   - Change `Listen 80` to `Listen 8080`
   - Access as `http://localhost:8080/abrechnung-app`
3. Run XAMPP as Administrator (Windows)
4. Check XAMPP error logs in `xampp/apache/logs/error.log`

---

### "File not found (404)"

**Causes**:
- Application not in correct directory
- Incorrect URL
- File path issues

**Solutions**:
1. Verify app is in `htdocs` folder: `xampp/htdocs/abrechnung-app/`
2. Check file names match exactly (case-sensitive on Linux)
3. Verify `index.html` is in root of project
4. Try accessing: `http://localhost/abrechnung-app/index.html`
5. Restart Apache in XAMPP Control Panel

---

### "Permission denied"

**Causes**:
- File permissions incorrect
- Antivirus blocking access
- User permissions

**Solutions**:
1. Check file permissions (should be readable by web server)
2. On Windows, disable antivirus scanner temporarily
3. Run XAMPP as Administrator
4. On Linux/Mac, set permissions:
   ```bash
   chmod -R 755 /path/to/xampp/htdocs/abrechnung-app
   ```

---

## Browser-Specific Issues

### Chrome

- **Issue**: Downloads blocked
- **Solution**: Check Settings → Privacy → Downloads → Allow downloads

### Firefox

- **Issue**: CORS errors with file:// protocol
- **Solution**: Must use a web server (XAMPP, Python http.server)

### Safari

- **Issue**: localStorage disabled in private mode
- **Solution**: Exit private browsing mode

### Edge

- **Issue**: Old cached version
- **Solution**: Hard reload with Ctrl+Shift+R or clear cache

---

## Reporting Issues

When reporting a problem, please include:

1. **Operating System**: Windows 10, macOS 14, Ubuntu 22.04, etc.
2. **Browser**: Chrome 120, Firefox 121, Safari 17, Edge 120, etc.
3. **Error Message**: Exact text from alert or console
4. **Steps to Reproduce**: What were you doing when it happened?
5. **Screenshot**: Of the error or unexpected behavior
6. **Console Errors**: 
   - Press F12
   - Go to Console tab
   - Copy all red errors
7. **Sample File**: If possible, attach the protokoll.xlsx file (sanitize sensitive data)
8. **Expected vs Actual**: What you expected to happen vs what actually happened

---

## Getting Help

1. Check this troubleshooting guide first
2. Check browser console (F12 → Console tab) for errors
3. Try in a different browser
4. Try with a fresh, clean protokoll.xlsx file
5. Check DevTools Network tab to see if files are loading
6. Check ARCHITECTURE.md and API.md for technical details
7. Contact developer with detailed information from "Reporting Issues" above

---

## Prevention Tips

1. **Always use official templates** - Don't modify template structure
2. **Test with small files first** - Before processing large protokolls
3. **Keep browser updated** - Use latest version of Chrome, Firefox, or Edge
4. **Regular backups** - Export important data before making changes
5. **Clear cache periodically** - Prevents stale data issues
6. **Use stable network** - Especially when loading templates
7. **Monitor console** - Check F12 console regularly for warnings

---

**Troubleshooting Guide Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Complete
