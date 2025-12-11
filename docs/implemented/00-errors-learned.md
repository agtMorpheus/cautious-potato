# Errors Learned

This file tracks common errors and their solutions to prevent future issues.

## File Input Loop Issues

- **File input inside drop zone causes infinite loop**: When a file input element is nested inside a clickable drop zone, interactions with the file input can trigger the drop zone's click handler, which calls `fileInput.click()` again, creating an infinite loop. Solution: Move file input outside the drop zone using absolute positioning off-screen.

- **Label `for` attribute triggers file input unexpectedly**: When a label has `for="file-input"`, clicking anywhere within the label's visual area (which may extend beyond expected boundaries due to CSS) triggers the associated file input. This caused the import button to open the file dialog instead of processing the file. Solution: Remove the `for` attribute when using programmatic file input triggering via drop zone clicks.
- CORS wildcard (*) cannot be used with credentials: 'include' - use specific origins
- Session timeout should include client-side warning system for better UX
- 401 responses should include error type flags for proper client handling
- Database session validation prevents session hijacking and provides audit trail
- **Protocol text inputs not responding**: Event handlers only listening for 'change' events instead of 'input' events made text fields appear non-functional. Users expect real-time feedback when typing. Solution: Handle both 'input' events (for real-time updates) and 'change' events (for final validation) in form event delegation.
- **Automated CSS replacements need validation**: Regex patterns can create malformed CSS like `2var(--radius-sm)` instead of proper values. Solution: Always run validation scripts after automated fixes and create correction scripts for edge cases.