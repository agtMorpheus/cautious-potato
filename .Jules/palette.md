# Palette's Journal

## 2025-02-18 - File Upload Accessibility Pattern
**Learning:** Hidden file inputs (`opacity: 0`) remove native keyboard accessibility. Containers serving as custom drop zones must explicitly handle `tabindex="0"`, `role="button"`, and `keydown` (Enter/Space) events to restore accessibility.
**Action:** Use the `setupClickAndKeyboard` helper from `js/handlers.js` for any new file upload areas.

## 2025-02-18 - Drag and Drop Visual Feedback
**Learning:** Users rely on visual cues (e.g., border highlighting) during drag operations. Standard `dragover` events must call `preventDefault()` to enable dropping, but also trigger the visual state change (e.g., adding `.drag-over` class).
**Action:** Use `setupDragAndDrop` helper which manages both event prevention and `.drag-over` class toggling.
