# Troubleshooting Guide - Abrechnung Application

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

- [ ] Browser console shows no red errors (F12 → Console)
- [ ] All files are loading correctly (F12 → Network tab)
- [ ] JavaScript is enabled in browser
- [ ] File is valid .xlsx format (not .xls or .csv)
- [ ] XAMPP Apache server is running
- [ ] Application is accessed via `http://localhost/abrechnung-app`

---

## Common Issues & Solutions

### 🚫 Import Issues

#### Issue: "Import failed: Invalid file type"

**Symptom:** Cannot import .xlsx file, error says "only .xlsx files are supported"

**Root Causes:**
- File is not a valid Excel file (.xls, .csv, .txt, etc.)
- File MIME type is not recognized by browser
- File is corrupted or incomplete
- Browser security settings blocking file access

**Solutions:**
1. **Verify file format:**
   - Check file extension is exactly `.xlsx` (not `.xls` or `.csv`)
   - Right-click file → Properties to confirm file type
   
2. **Re-save in correct format:**
   - Open file in Excel
   - File → Save As → Excel Workbook (.xlsx)
   - Ensure "Excel Workbook" is selected, not "Excel 97-2003"
   
3. **Try different browser:**
   - Test in Chrome, Firefox, or Edge
   - Disable browser extensions temporarily
   
4. **Check file integrity:**
   - Try opening file in Excel first
   - If Excel can't open it, file is corrupted

**Prevention:** Always use the official protokoll.xlsx template

---

#### Issue: "Metadata fields are missing"

**Symptom:** Import fails with error about missing Auftrags-Nr., Protokoll-Nr., etc.

**Root Causes:**
- Using wrong protokoll template version
- Required cells were deleted or moved
- Data not entered in correct cells
- Template structure was modified

**Solutions:**
1. **Verify template usage:**
   - Use only the official `protokoll.xlsx` template
   - Don't modify template structure
   - Only fill in data, don't add/remove rows/columns
   
2. **Check required cells:**
   - Protokoll-Nr. → Cell U3
   - Auftrags-Nr. → Cell N5  
   - Anlage → Cell A10
   - Einsatzort → Cell T10
   - Firma → Cell T7
   
3. **Verify data entry:**
   - Cells must contain text/numbers, not formulas
   - No empty required fields
   - No special characters that might cause parsing issues

**Debug Steps:**
```
1. Open protokoll.xlsx in Excel
2. Click on cell U3 - should show Protokoll-Nr.
3. Click on cell N5 - should show Auftrags-Nr.
4. If cells are empty or contain different data, re-enter correctly
```

---

#### Issue: "No positions extracted" or "0 positions found"

**Symptom:** Import succeeds but shows 0 positions extracted

**Root Causes:**
- Position data is in wrong columns
- Data is outside the expected row range (30-325)
- Position numbers are empty or invalid format
- Quantities are not numeric

**Solutions:**
1. **Verify position data location:**
   - Position numbers must be in Column A (rows 30-325)
   - Quantities must be in Column B (rows 30-325)
   - Data outside this range is ignored
   
2. **Check position number format:**
   - Must follow pattern: `XX.XX.XXXX` (e.g., `01.01.0010`)
   - All digits, no letters or special characters
   - Leading zeros are required
   
3. **Verify quantities:**
   - Must be numbers, not text
   - Can be integers or decimals
   - Cannot be empty or contain formulas

**Debug Steps:**
```
1. Open protokoll.xlsx in Excel
2. Go to row 30, column A - should contain first position number
3. Go to row 30, column B - should contain first quantity
4. Scroll down to verify more positions exist
5. Check that position numbers follow XX.XX.XXXX format
```

---

### 🔧 Generation Issues

#### Issue: "Failed to load template" during generation

**Symptom:** Generate button fails with template loading error

**Root Causes:**
- `templates/abrechnung.xlsx` file is missing
- File permissions prevent reading template
- XAMPP server not serving static files correctly
- Network connectivity issues

**Solutions:**
1. **Verify template file exists:**
   ```
   Check: xampp/htdocs/abrechnung-app/templates/abrechnung.xlsx
   File should be present and readable
   ```
   
2. **Check file permissions:**
   - On Windows: Right-click → Properties → Security
   - Ensure "Everyone" or "Users" has Read permissions
   - On macOS/Linux: `chmod 644 templates/abrechnung.xlsx`
   
3. **Restart XAMPP:**
   - Stop Apache in XAMPP Control Panel
   - Wait 5 seconds
   - Start Apache again
   - Test access: `http://localhost/abrechnung-app/templates/abrechnung.xlsx`
   
4. **Check XAMPP logs:**
   ```
   Location: xampp/apache/logs/error.log
   Look for: 404 errors, permission denied, file not found
   ```

**Verification:**
- Open browser: `http://localhost/abrechnung-app/templates/abrechnung.xlsx`
- Should download the template file
- If 404 error, file is missing or path is wrong

---

#### Issue: "Generation failed: Invalid data"

**Symptom:** Generate fails even though import was successful

**Root Causes:**
- Imported data was corrupted during processing
- State management issues
- Memory constraints with large datasets

**Solutions:**
1. **Check browser console:**
   - Press F12 → Console tab
   - Look for red error messages
   - Note exact error text for debugging
   
2. **Verify imported data:**
   - Check that positions were actually imported
   - Verify metadata is complete
   - Look for data corruption indicators
   
3. **Try smaller dataset:**
   - Test with protokoll containing fewer positions
   - If works with small data, may be memory issue
   
4. **Clear browser cache:**
   - Ctrl+Shift+Delete → Clear cache
   - Reload page and try again

---

### 📤 Export Issues

#### Issue: Export button doesn't work or nothing downloads

**Symptom:** Click export, nothing happens, no file downloads

**Root Causes:**
- Browser security policy prevents downloads
- SheetJS library not loaded properly
- No workbook generated in memory
- Browser popup blocker interfering

**Solutions:**
1. **Check browser console:**
   - Press F12 → Console tab
   - Look for JavaScript errors
   - Verify SheetJS loaded: type `XLSX` in console, should return object
   
2. **Browser settings:**
   - Check popup blocker settings
   - Allow downloads from localhost
   - Try different browser (Chrome, Firefox, Edge)
   
3. **Clear browser data:**
   - Clear cache and cookies
   - Disable browser extensions
   - Try incognito/private browsing mode
   
4. **Verify generation completed:**
   - Ensure "Generate" step completed successfully
   - Check that generation status shows "success"
   - Try generating again before export

**Debug Steps:**
```
1. Open browser console (F12)
2. Type: window._currentWorkbook
3. Should return an object, not undefined
4. If undefined, generation didn't complete properly
```

---

### 🔄 Reset & State Issues

#### Issue: Data persists after reset

**Symptom:** After clicking "Anwendung zurücksetzen", data reappears after page reload

**Root Causes:**
- localStorage not cleared properly
- Browser cache interference
- Multiple browser tabs with same app
- localStorage disabled in browser

**Solutions:**
1. **Manual localStorage clear:**
   ```
   1. Open DevTools (F12)
   2. Go to Application → Local Storage
   3. Find 'abrechnungAppState_v1' and delete it
   4. Reload page
   ```
   
2. **Clear browser cache:**
   - Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Select "All time" and check all boxes
   - Clear data and reload page
   
3. **Check other browser tabs:**
   - Close all other tabs with the application
   - Only keep one tab open
   - Try reset again
   
4. **Try incognito mode:**
   - Open application in private/incognito window
   - Test if reset works there
   - If yes, main browser has cache issues

---

### ⚡ Performance Issues

#### Issue: Application is slow or unresponsive

**Symptom:** Import/generation takes > 5 seconds, browser becomes unresponsive

**Root Causes:**
- Very large protokoll file (> 1000 positions)
- Insufficient computer memory
- Browser extensions interfering
- Too many browser tabs open

**Solutions:**
1. **Check file size:**
   - How many positions does protokoll contain?
   - Files with > 5000 positions may be slow
   - Consider splitting large files
   
2. **Optimize browser:**
   - Close other browser tabs
   - Disable browser extensions
   - Close other applications to free memory
   
3. **Try different browser:**
   - Chrome generally performs best
   - Firefox and Edge are good alternatives
   - Avoid Internet Explorer
   
4. **Check computer performance:**
   - Open Task Manager (Windows) or Activity Monitor (Mac)
   - Check CPU and memory usage
   - Close unnecessary applications

**Performance Profiling:**
```
1. Open DevTools (F12) → Performance tab
2. Click Record
3. Perform slow operation (import/generate)
4. Stop recording
5. Look for long red bars (slow operations)
6. Share screenshot with developer if needed
```

---

### 🌐 Browser & Network Issues

#### Issue: "SheetJS is not defined" or library errors

**Symptom:** Console shows "XLSX is not defined" or similar library errors

**Root Causes:**
- SheetJS library failed to load
- Network connectivity issues
- XAMPP not serving JavaScript files
- Browser cache corruption

**Solutions:**
1. **Verify library loading:**
   - Open DevTools → Network tab
   - Reload page
   - Look for `xlsx.min.js` - should show 200 status
   - If 404, file is missing or path wrong
   
2. **Check file exists:**
   ```
   Verify: xampp/htdocs/abrechnung-app/js/libs/xlsx.min.js
   File should be present and not empty
   ```
   
3. **Test direct access:**
   - Open: `http://localhost/abrechnung-app/js/libs/xlsx.min.js`
   - Should show JavaScript code, not 404 error
   
4. **Clear cache and reload:**
   - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Clear browser cache completely
   - Restart browser

---

#### Issue: "Cannot connect to localhost"

**Symptom:** Browser shows "This site can't be reached" or connection refused

**Root Causes:**
- XAMPP Apache server not running
- Wrong URL or port
- Firewall blocking connections
- Another application using port 80

**Solutions:**
1. **Check XAMPP status:**
   - Open XAMPP Control Panel
   - Apache should show "Running" in green
   - If not, click "Start" next to Apache
   
2. **Verify URL:**
   - Use: `http://localhost/abrechnung-app/`
   - NOT: `file:///` or `https://`
   - Check spelling and path
   
3. **Check port conflicts:**
   ```
   Windows: netstat -ano | find ":80"
   Mac/Linux: lsof -i :80
   
   If port 80 is used by another app:
   - Change Apache port in httpd.conf
   - Or stop the conflicting application
   ```
   
4. **Firewall settings:**
   - Temporarily disable firewall/antivirus
   - Add XAMPP to firewall exceptions
   - Allow Apache through Windows Defender

---

## XAMPP-Specific Issues

### Apache Won't Start

**Error Messages:**
- "Port 80 in use by another application"
- "Apache shutdown unexpectedly"
- "Permission denied"

**Solutions:**

1. **Port Conflict (Most Common):**
   ```
   1. Open XAMPP Control Panel
   2. Click "Config" next to Apache
   3. Select "Apache (httpd.conf)"
   4. Find line: Listen 80
   5. Change to: Listen 8080
   6. Save file and restart Apache
   7. Access app: http://localhost:8080/abrechnung-app
   ```

2. **Permission Issues:**
   - Run XAMPP Control Panel as Administrator (Windows)
   - On Mac: `sudo /Applications/XAMPP/xamppfiles/xampp start`
   - Check antivirus isn't blocking XAMPP

3. **Skype Conflict (Windows):**
   - Skype often uses port 80
   - Close Skype or change its port settings
   - Restart Apache

### File Not Found (404 Errors)

**Symptoms:**
- "404 Not Found" when accessing application
- Template files not loading
- JavaScript files not loading

**Solutions:**

1. **Verify file location:**
   ```
   Correct path: xampp/htdocs/abrechnung-app/
   Files should be directly in this folder:
   - index.html
   - js/ folder
   - css/ folder
   - templates/ folder
   ```

2. **Check file names:**
   - Case sensitive on Linux/Mac
   - No spaces in file names
   - Use forward slashes in URLs

3. **Restart Apache:**
   - Stop Apache in XAMPP
   - Wait 5 seconds
   - Start Apache again

---

## Browser-Specific Issues

### Chrome Issues

**File Upload Problems:**
- Chrome may block file uploads from localhost
- Solution: Use `--allow-file-access-from-files` flag
- Or use different browser for testing

**Download Blocking:**
- Chrome may block automatic downloads
- Check download settings in Chrome
- Allow downloads from localhost

### Firefox Issues

**CORS Errors:**
- Firefox strict CORS policy
- Ensure all files served from same origin
- Use XAMPP, don't open files directly

### Safari Issues

**File API Limitations:**
- Safari has stricter file API
- May not support all Excel features
- Recommend Chrome or Firefox for best experience

---

## Advanced Debugging

### Browser Developer Tools

**Console Tab (F12):**
```javascript
// Check if libraries loaded
typeof XLSX !== 'undefined'  // Should return true

// Check application state
getState()  // Should return state object

// Check for errors
console.clear()  // Clear console, then try operation
```

**Network Tab:**
- Shows all file loading requests
- Red entries indicate failed loads
- Check status codes (200 = success, 404 = not found)

**Application Tab:**
- Local Storage → Check saved state
- Can manually clear stored data

### Performance Debugging

**Memory Usage:**
```javascript
// Check memory usage (Chrome only)
console.log(performance.memory);

// Monitor during operations
setInterval(() => {
  console.log('Memory:', Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB');
}, 1000);
```

**Timing Operations:**
```javascript
// Time import operation
console.time('import');
// ... perform import ...
console.timeEnd('import');
```

---

## Getting Help

### Information to Collect

When reporting issues, please provide:

1. **System Information:**
   - Operating System (Windows 10, macOS Big Sur, etc.)
   - Browser and version (Chrome 120, Firefox 121, etc.)
   - XAMPP version

2. **Error Details:**
   - Exact error message from alert or console
   - Screenshot of error
   - Steps that led to the error

3. **Console Output:**
   - Press F12 → Console tab
   - Copy all red error messages
   - Include any warnings (yellow messages)

4. **Network Information:**
   - F12 → Network tab
   - Look for failed requests (red entries)
   - Note status codes and error messages

5. **File Information:**
   - File size of protokoll.xlsx
   - Number of positions in file
   - Any modifications made to template

### Sample Files

If possible, provide a sanitized sample file:
- Remove sensitive company data
- Keep structure and position format
- Replace real data with test data

### Contact Information

**Priority Levels:**
- **Critical:** Application completely broken, cannot import any files
- **High:** Major feature not working, blocking normal workflow
- **Medium:** Minor issues, workarounds available
- **Low:** Enhancement requests, cosmetic issues

---

## Prevention Tips

### Best Practices

1. **File Management:**
   - Always use official templates
   - Don't modify template structure
   - Keep backup copies of important files
   - Use descriptive filenames

2. **Browser Maintenance:**
   - Keep browser updated
   - Clear cache regularly
   - Disable unnecessary extensions
   - Use supported browsers (Chrome, Firefox, Edge)

3. **XAMPP Maintenance:**
   - Keep XAMPP updated
   - Regular restart of Apache
   - Monitor log files for issues
   - Backup application files

4. **Data Validation:**
   - Verify data before import
   - Check position number formats
   - Ensure quantities are numeric
   - Review metadata completeness

### Regular Maintenance

**Weekly:**
- Clear browser cache
- Restart XAMPP Apache
- Check for application updates

**Monthly:**
- Update browser to latest version
- Review XAMPP logs for errors
- Backup application and templates

**As Needed:**
- Update XAMPP when new version available
- Replace templates when updated versions provided
- Clear localStorage if experiencing state issues

---

**Last Updated:** December 11, 2025  
**Version:** 2.0 - Phase 6 Comprehensive Troubleshooting  
**Coverage:** All common issues with step-by-step solutions