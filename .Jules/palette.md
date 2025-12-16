# Palette's Journal

## 2025-02-18 - File Upload Accessibility Pattern
**Learning:** Hidden file inputs (`opacity: 0`) remove native keyboard accessibility. Containers serving as custom drop zones must explicitly handle `tabindex="0"`, `role="button"`, and `keydown` (Enter/Space) events to restore accessibility.
**Action:** Use the `setupClickAndKeyboard` helper from `js/handlers.js` for any new file upload areas.

## 2025-02-18 - Drag and Drop Visual Feedback
**Learning:** Users rely on visual cues (e.g., border highlighting) during drag operations. Standard `dragover` events must call `preventDefault()` to enable dropping, but also trigger the visual state change (e.g., adding `.drag-over` class).
**Action:** Use `setupDragAndDrop` helper which manages both event prevention and `.drag-over` class toggling.

## 2025-05-20 - Drop Zone State Feedback
**Learning:** Users lack immediate visual confirmation when a file is selected in a drag-and-drop zone if only a separate status message updates.
**Action:** Update the drop zone's internal content (icon, text) to reflect the "filled" state, while ensuring the original empty state can be restored.

## 2025-05-21 - Production vs Test Environment Drift
**Learning:** Unit tests were mocking a DOM element (`#alert-container`) that did not exist in the production `index.html`. This allowed tests to pass while the feature was broken in production (falling back to `window.alert()`).
**Action:** Always verify the existence of critical DOM elements in the actual HTML or ensure the JS can recover gracefully (e.g., by creating the element dynamically).
