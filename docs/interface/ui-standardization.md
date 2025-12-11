# UI Standardization Guide for Booking Backend Application

## Executive Summary
This document identifies all interface elements that must be standardized across the Abrechnung application and its modules (HR Management, Protokoll, Contracts, etc.) to ensure consistency, accessibility, and maintainability.

---

## 1. TYPOGRAPHY STANDARDS

### Font Families
```css
--font-family-base: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica Neue, Arial, sans-serif;
--font-family-mono: 'Courier New', Courier, monospace;
```

### Font Sizes (Hierarchical)
- **H1**: 2.5rem / 40px - Page titles
- **H2**: 1.5rem / 24px - Section headings
- **H3**: 1.25rem / 20px - Subsection headings
- **H4**: 1.1rem / 18px - Minor headings
- **Base**: 1rem / 16px - Body text
- **Small**: 0.95rem / 15px - Labels, helper text
- **Tiny**: 0.85rem / 13px - Hints, captions

### Font Weights
- **Normal**: 400 - Body text
- **Medium**: 500 - Labels, smaller emphasis
- **Semibold**: 600 - Headings
- **Bold**: 700 - Strong emphasis (use sparingly)

### Line Heights
- **Headings**: 1.2 (tight)
- **Body**: 1.5 (comfortable reading)
- **Form fields**: 1.5 (input text)

### Letter Spacing
- **Normal**: 0 - Default text
- **Tight**: -0.01em - Headings for cohesion
- **Relaxed**: 0.02em - For small caps or special emphasis

---

## 2. COLOR SYSTEM (CSS Variables)

### Primitive Colors
```css
:root {
  /* Backgrounds */
  --color-white: #ffffff;
  --color-cream-50: #fcfcf9;
  --color-cream-100: #fffffe;
  --color-gray-200: #f5f5f5;
  --color-gray-300: #a7a9a9;
  --color-gray-400: #777c7c;
  
  /* Text */
  --color-slate-500: #626c71;
  --color-slate-900: #133452;
  --color-charcoal-700: #1f2121;
  --color-charcoal-800: #262828;
  
  /* Semantic */
  --color-teal-300: #32b8c6;
  --color-teal-400: #2da6b2;
  --color-teal-500: #21808d;
  --color-teal-600: #1d7480;
  
  --color-red-400: #ff5459;
  --color-red-500: #c0152f;
  --color-orange-400: #e68161;
  --color-orange-500: #a84b2f;
}
```

### Semantic Color Tokens (Light Mode - Default)
```css
--color-background: #fcfcf9;      /* Page background */
--color-surface: #fffffe;         /* Card/panel background */
--color-text: #133452;            /* Primary text */
--color-text-secondary: #626c71;  /* Muted text */
--color-primary: #21808d;         /* Primary action */
--color-primary-hover: #1d7480;   /* Hover state */
--color-primary-active: #1a6c73;  /* Active/pressed state */
--color-secondary: rgba(94, 82, 64, 0.12);     /* Secondary action background */
--color-secondary-hover: rgba(94, 82, 64, 0.2);
--color-border: rgba(94, 82, 64, 0.2);        /* Borders */
--color-error: #c0152f;           /* Error state */
--color-success: #21808d;         /* Success state */
--color-warning: #a84b2f;         /* Warning state */
--color-info: #626c71;            /* Info state */
--color-focus-ring: rgba(33, 128, 141, 0.4);  /* Focus indicator */
```

### Dark Mode Overrides
```css
[data-color-scheme="dark"] {
  --color-background: #1f2121;
  --color-surface: #262828;
  --color-text: #f5f5f5;
  --color-text-secondary: rgba(167, 169, 169, 0.7);
  --color-primary: #32b8c6;
  --color-error: #ff5459;
  --color-success: #32b8c6;
  /* ... other overrides ... */
}
```

---

## 3. SPACING SYSTEM (CSS Variables)

### Uniform Spacing Scale (Based on 4px unit)
```css
--space-0: 0;
--space-1: 1px;
--space-2: 2px;
--space-4: 4px;
--space-6: 6px;
--space-8: 8px;
--space-10: 10px;
--space-12: 12px;
--space-16: 16px;
--space-20: 20px;
--space-24: 24px;
--space-32: 32px;
--space-40: 40px;
```

### Common Spacing Patterns
- **Padding inside elements**: space-12, space-16, space-20
- **Margins between elements**: space-16, space-20, space-24
- **Gap in flex containers**: space-8, space-12, space-16
- **Section spacing**: space-32

---

## 4. BUTTONS

### Button States & Styling
```css
/* Sizes */
.btn          { padding: 0.5rem 1rem; font-size: 0.95rem; }
.btn--sm      { padding: 0.25rem 0.75rem; font-size: 0.85rem; }
.btn--lg      { padding: 0.75rem 1.5rem; font-size: 1.1rem; }

/* Variants */
.btn--primary      { background: var(--color-primary); color: white; }
.btn--secondary    { background: var(--color-secondary); color: var(--color-text); }
.btn--outline      { background: transparent; border: 1px solid var(--color-border); }
.btn--danger       { background: var(--color-error); color: white; }

/* States */
.btn:hover:not(:disabled)    { filter: brightness(0.95); }
.btn:active:not(:disabled)   { filter: brightness(0.9); }
.btn:disabled                 { opacity: 0.5; cursor: not-allowed; }
.btn:focus-visible            { outline: 2px solid var(--color-focus-ring); }

/* Special */
.btn--full-width  { width: 100%; }
.btn--icon        { padding: 0.5rem; border-radius: 50%; }
```

### HTML Standards
```html
<!-- Always include descriptive text -->
<button class="btn btn--primary" type="button">Action Label</button>

<!-- For icon-only buttons, include aria-label -->
<button class="btn btn--icon" aria-label="Close dialog">×</button>

<!-- Always disable appropriately -->
<button class="btn btn--primary" type="button" disabled>Generate</button>
```

---

## 5. FORM ELEMENTS

### Input Fields
```css
.form-control {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-base);
  transition: border-color 150ms, box-shadow 150ms;
}

.form-control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.form-control:disabled {
  background: var(--color-gray-200);
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.8;
}
```

### Form Groups
```css
.form-group {
  margin-bottom: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-label {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.form-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.form-error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
}
```

### HTML Standards
```html
<div class="form-group">
  <label for="email" class="form-label">Email Address</label>
  <input 
    id="email" 
    type="email" 
    class="form-control" 
    aria-describedby="email-hint"
  />
  <p id="email-hint" class="form-hint">We'll never share your email</p>
</div>
```

---

## 6. MODALS & DIALOGS

### Structure
```html
<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal__content">
    <div class="modal__header">
      <h2 id="modal-title" class="modal__title">Dialog Title</h2>
      <button class="modal__close" aria-label="Close">×</button>
    </div>
    
    <div class="modal__body">
      <!-- Content -->
    </div>
    
    <div class="modal__footer">
      <button class="btn btn--secondary">Cancel</button>
      <button class="btn btn--primary">Confirm</button>
    </div>
  </div>
</div>
```

### Styling
```css
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  place-items: center;
}

.modal.is-open {
  display: grid;
}

.modal__content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 300ms var(--ease-standard);
}

.modal__header {
  padding: var(--space-20);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal__body {
  padding: var(--space-20);
}

.modal__footer {
  padding: var(--space-16) var(--space-20);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-12);
  justify-content: flex-end;
}
```

---

## 7. STATUS INDICATORS & ALERTS

### Status Dots (Progress/States)
```css
.status-indicator {
  display: inline-flex;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

.status--idle     { color: var(--color-text-secondary); animation: none; }
.status--pending  { color: var(--color-warning); }
.status--success  { color: var(--color-success); }
.status--error    { color: var(--color-error); animation: none; }
```

### Alert Messages
```css
.alert {
  padding: var(--space-12) var(--space-16);
  border-radius: var(--radius-base);
  border-left: 4px solid currentColor;
  display: flex;
  gap: var(--space-12);
  align-items: flex-start;
}

.alert--success { background: rgba(33, 128, 141, 0.1); color: var(--color-success); }
.alert--error   { background: rgba(192, 21, 47, 0.1); color: var(--color-error); }
.alert--warning { background: rgba(168, 75, 47, 0.1); color: var(--color-warning); }
.alert--info    { background: rgba(98, 108, 113, 0.1); color: var(--color-info); }
```

### HTML Standards
```html
<div class="alert alert--success" role="status" aria-live="polite">
  <span class="alert__icon">✓</span>
  <div>
    <strong class="alert__title">Success</strong>
    <p class="alert__message">File imported successfully.</p>
  </div>
  <button class="alert__close" aria-label="Dismiss">×</button>
</div>
```

---

## 8. CARDS & PANELS

### Structure
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 150ms var(--ease-standard);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card__header {
  padding: var(--space-16);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-gray-200);
}

.card__body {
  padding: var(--space-16);
}

.card__footer {
  padding: var(--space-12) var(--space-16);
  border-top: 1px solid var(--color-border);
  background: var(--color-gray-200);
  display: flex;
  gap: var(--space-12);
}
```

### Panels (Section containers)
```css
.panel {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: var(--space-20);
  margin-bottom: var(--space-20);
}

.panel__header {
  margin-bottom: var(--space-16);
  padding-bottom: var(--space-16);
  border-bottom: 2px solid var(--color-border);
}

.panel__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}
```

---

## 9. TABLES

### Styling Standards
```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.table__head {
  background: var(--color-gray-200);
  border-bottom: 2px solid var(--color-border);
}

.table__th {
  padding: var(--space-12);
  text-align: left;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.table__td {
  padding: var(--space-12);
  border-bottom: 1px solid var(--color-border);
}

.table__tr:hover {
  background: var(--color-gray-200);
}

.table__tr:last-child .table__td {
  border-bottom: none;
}
```

### HTML Standards
```html
<table class="table">
  <thead class="table__head">
    <tr>
      <th class="table__th">Column 1</th>
      <th class="table__th">Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr class="table__tr">
      <td class="table__td">Data 1</td>
      <td class="table__td">Data 2</td>
    </tr>
  </tbody>
</table>
```

---

## 10. LISTS & NAVIGATION

### Ordered Lists
```css
ol, ul {
  margin: var(--space-16) 0;
  padding-left: var(--space-24);
  line-height: 1.7;
}

li {
  margin-bottom: var(--space-8);
}
```

### Definition Lists
```css
dl {
  margin: var(--space-16) 0;
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: var(--space-12);
}

dt {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

dd {
  margin: 0;
  color: var(--color-text-secondary);
}
```

### Navigation (Tabs)
```css
.nav-tabs {
  display: flex;
  gap: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-tabs__item {
  margin-bottom: -2px;
}

.nav-tabs__link {
  display: block;
  padding: var(--space-12) var(--space-16);
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 150ms;
}

.nav-tabs__link:hover {
  color: var(--color-text);
  border-bottom-color: var(--color-primary);
}

.nav-tabs__link.is-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

---

## 11. BORDERS & DIVIDERS

### Border Styles
```css
:root {
  --border-width-1: 1px;
  --border-style-solid: solid;
  --border-color-light: var(--color-border);
}

.border {
  border: var(--border-width-1) var(--border-style-solid) var(--border-color-light);
}

.border-top    { border-top: var(--border-width-1) var(--border-style-solid) var(--border-color-light); }
.border-bottom { border-bottom: var(--border-width-1) var(--border-style-solid) var(--border-color-light); }
.border-left   { border-left: var(--border-width-1) var(--border-style-solid) var(--border-color-light); }
.border-right  { border-right: var(--border-width-1) var(--border-style-solid) var(--border-color-light); }
```

### Dividers
```css
.divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-16) 0;
}
```

---

## 12. BORDER RADIUS

### Radius Scale
```css
:root {
  --radius-sm: 4px;      /* Small elements, inputs */
  --radius-base: 6px;    /* Default (buttons, cards) */
  --radius-md: 8px;      /* Medium (panels) */
  --radius-lg: 12px;     /* Large (modals, large cards) */
  --radius-full: 9999px; /* Pill buttons, avatars */
}
```

---

## 13. SHADOWS

### Shadow System
```css
:root {
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  --shadow-inner: inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.03);
}
```

### Usage
- **xs**: Subtle hover effects
- **sm**: Default card/button elevation
- **md**: Cards on hover
- **lg**: Modals, dropdowns
- **xl**: Modal overlay, drawer
- **inner**: Inset borders on buttons

---

## 14. ANIMATIONS & TRANSITIONS

### Standard Durations
```css
:root {
  --duration-fast: 150ms;     /* Micro interactions */
  --duration-normal: 250ms;   /* Standard transitions */
  --duration-slow: 400ms;     /* Longer animations */
}
```

### Easing Functions
```css
:root {
  --ease-linear: linear;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);        /* Material standard */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Common Animations
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 15. ACCESSIBILITY STANDARDS

### Focus Indicators
```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Alternative for high contrast */
@media (prefers-contrast: more) {
  :focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 3px;
  }
}
```

### ARIA Attributes (HTML)
```html
<!-- Buttons -->
<button aria-label="Close">×</button>

<!-- Form fields with errors -->
<input aria-invalid="true" aria-describedby="error-msg" />
<span id="error-msg" role="alert">This field is required</span>

<!-- Live regions -->
<div aria-live="polite" aria-atomic="true" id="messages"></div>

<!-- Disabled fields -->
<input disabled aria-disabled="true" />

<!-- Expandable sections -->
<button aria-expanded="false" aria-controls="section-1">Menu</button>
<div id="section-1" role="region">Content</div>
```

### Screen Reader Text
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Color Contrast (Minimum WCAG AA)
- Normal text: 4.5:1 ratio
- Large text (18pt+): 3:1 ratio
- UI components: 3:1 ratio

---

## 16. RESPONSIVE DESIGN BREAKPOINTS

### Mobile-First Approach
```css
/* Default: Mobile (320px - 640px) */

/* Tablet (641px - 1024px) */
@media (min-width: 641px) {
  /* Tablet styles */
}

/* Desktop (1025px+) */
@media (min-width: 1025px) {
  /* Desktop styles */
}

/* Large Desktop (1281px+) */
@media (min-width: 1281px) {
  /* Large desktop styles */
}
```

### Responsive Utilities
```css
/* Hide on mobile */
.hide-mobile { display: none; }
@media (min-width: 641px) {
  .hide-mobile { display: block; }
}

/* Show only on mobile */
.show-mobile { display: block; }
@media (min-width: 641px) {
  .show-mobile { display: none; }
}

/* Container widths */
.container {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 var(--space-16);
}

@media (min-width: 1025px) {
  .container {
    padding: 0;
  }
}
```

---

## 17. LAYOUT GRIDS & FLEXBOX

### Flex Utilities
```css
.flex               { display: flex; }
.flex-col           { flex-direction: column; }
.flex-row           { flex-direction: row; }
.flex-wrap          { flex-wrap: wrap; }
.flex-nowrap        { flex-wrap: nowrap; }

.items-start        { align-items: flex-start; }
.items-center       { align-items: center; }
.items-end          { align-items: flex-end; }
.items-stretch      { align-items: stretch; }

.justify-start      { justify-content: flex-start; }
.justify-center     { justify-content: center; }
.justify-end        { justify-content: flex-end; }
.justify-between    { justify-content: space-between; }
.justify-around     { justify-content: space-around; }
.justify-evenly     { justify-content: space-evenly; }

.gap-4              { gap: var(--space-4); }
.gap-8              { gap: var(--space-8); }
.gap-12             { gap: var(--space-12); }
.gap-16             { gap: var(--space-16); }
```

### Grid Utilities
```css
.grid              { display: grid; }
.grid-cols-1       { grid-template-columns: 1fr; }
.grid-cols-2       { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3       { grid-template-columns: repeat(3, 1fr); }
.grid-gap-16       { gap: var(--space-16); }
```

---

## 18. ICON STANDARDS

### Icon Usage Guidelines
```css
/* Inline icons (within text) */
.icon-inline {
  display: inline-block;
  vertical-align: -0.125em;
  width: 1em;
  height: 1em;
}

/* Icon buttons */
.icon-button {
  padding: var(--space-8);
  border-radius: var(--radius-full);
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  background: var(--color-secondary);
}

/* Icon sizes */
.icon-sm   { width: 16px; height: 16px; }
.icon-md   { width: 24px; height: 24px; }
.icon-lg   { width: 32px; height: 32px; }
.icon-xl   { width: 48px; height: 48px; }
```

### HTML Standards
```html
<!-- SVG icon -->
<svg class="icon-md" aria-hidden="true" viewBox="0 0 24 24">
  <path d="..." fill="currentColor" />
</svg>

<!-- Icon with label -->
<span class="icon-with-label">
  <svg class="icon-md" aria-hidden="true">...</svg>
  <span>Label</span>
</span>
```

---

## 19. LOADING & SKELETON STATES

### Loading Indicators
```css
.loader {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin var(--duration-slow) linear infinite;
}
```

### Skeleton Screens
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-200) 0%,
    var(--color-gray-300) 50%,
    var(--color-gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text { height: 12px; border-radius: var(--radius-sm); }
.skeleton-heading { height: 24px; border-radius: var(--radius-sm); }
.skeleton-button { height: 40px; border-radius: var(--radius-base); }
```

---

## 20. MODULES COMPONENT CHECKLIST

### Components to Standardize per Module

#### Abrechnung Module
- [ ] Import section panel
- [ ] File input with drag-drop
- [ ] Status indicators (idle/pending/success/error)
- [ ] Summary display box
- [ ] Generate button states
- [ ] Export button with download feedback
- [ ] Reset button (secondary)
- [ ] Global message container

#### HR Module
- [ ] Dashboard tabs
- [ ] Employee table/grid
- [ ] Modal forms (add/edit employee, attendance, schedule)
- [ ] Calendar widget (vacations/schedule)
- [ ] Status badges (approved/pending/rejected)
- [ ] Attendance grid
- [ ] Filter/search controls
- [ ] Notification toasts

#### Protokoll Module
- [ ] Multi-step form (1. Metadata, 2. Positions, 3. Results, 4. Review)
- [ ] Form validation indicators
- [ ] Position table with CRUD operations
- [ ] Progress indicator bar
- [ ] Field validation messages
- [ ] Export button
- [ ] Mobile-responsive form layout

#### Contracts Module
- [ ] Excel import section
- [ ] Column mapping UI
- [ ] Contract table/list
- [ ] Contract detail view (modal/panel)
- [ ] Validation feedback
- [ ] Status badges for contract state
- [ ] Export options

---

## 21. TESTING STANDARDS

### Component Testing Checklist
Every UI component should verify:
- [ ] Renders without errors
- [ ] All interactive states work (hover, focus, active, disabled)
- [ ] Responsive on mobile/tablet/desktop
- [ ] **Phase 4 Accessibility**: WCAG 2.1 AA compliance
- [ ] **Enhanced Focus**: Visible focus indicators with high contrast support
- [ ] **Keyboard Navigation**: Full functionality via keyboard only
- [ ] **Screen Reader**: Proper ARIA attributes and announcements
- [ ] **Dark Mode**: All three theme modes (light, dark, auto)
- [ ] **Motion Preferences**: Respects prefers-reduced-motion
- [ ] Error states display correctly with accessibility announcements
- [ ] Loading states display correctly with ARIA busy states
- [ ] Animations smooth (60fps) and accessible

---

## PHASE 4: ADVANCED ACCESSIBILITY & DARK MODE FEATURES ✅ COMPLETE

### Enhanced Accessibility Manager

**JavaScript API** (`js/phase4-accessibility.js`):
```javascript
// Screen reader announcements
AccessibilityManager.announce('Operation completed', 'polite');

// Button loading states
AccessibilityManager.updateButtonLoadingState(button, true, 'Loading...');

// Progress indicators
const progressId = AccessibilityManager.showProgress('File upload', 0);
AccessibilityManager.updateProgress(progressId, 50);
AccessibilityManager.hideProgress(progressId);
```

**Key Features**:
- **Screen Reader Announcements**: Dynamic content announcements with priority levels
- **Focus Management**: Automatic focus trapping in modals with keyboard navigation
- **Skip Links**: Alt+M (main content), Alt+N (navigation), Escape (close modals)
- **Form Enhancement**: Automatic ARIA attributes and validation announcements
- **Status Monitoring**: Real-time status change announcements

### Enhanced Dark Mode System

**Three-Mode Theme System**:
```javascript
// Theme management
EnhancedDarkModeManager.applyTheme('light');   // Light mode
EnhancedDarkModeManager.applyTheme('dark');    // Dark mode  
EnhancedDarkModeManager.applyTheme('auto');    // System preference

// Get current theme info
const info = EnhancedDarkModeManager.getThemeInfo();
// Returns: { userPreference, effectiveTheme, systemPreference, isAuto }
```

**Features**:
- **System Integration**: Automatically follows OS dark/light mode preferences
- **Persistent Preferences**: User choices saved across browser sessions
- **High Contrast Support**: Enhanced visibility for accessibility needs
- **Accessibility Announcements**: Screen reader feedback for theme changes

### Enhanced UI Renderers

**Accessibility-Enhanced Components** (`js/phase4-ui-renderers.js`):
- **Automatic ARIA Management**: Dynamic ARIA attributes for status changes
- **Progress Announcements**: Milestone announcements (25%, 50%, 75%, 100%)
- **Error Handling**: Accessible error messages with recovery suggestions
- **Form Validation**: Real-time validation with screen reader announcements

### WCAG 2.1 AA Compliance Features

**Color Contrast**:
- Normal text: 4.5:1 minimum ratio
- Large text (18pt+): 3:1 minimum ratio
- UI components: 3:1 minimum ratio

**Keyboard Navigation**:
- All functionality accessible via keyboard
- Visible focus indicators on all interactive elements
- Logical tab order throughout the application

**Screen Reader Support**:
- Comprehensive ARIA attributes (roles, properties, states)
- Live regions for dynamic content announcements
- Proper heading hierarchy and landmark navigation

**Touch Accessibility**:
- Minimum 44px touch targets for all interactive elements
- Enhanced spacing on touch devices
- Gesture-friendly interactions

### CSS Classes for Accessibility

```css
/* Screen reader only content */
.sr-only { /* Hidden from visual users, available to screen readers */ }

/* Skip links for keyboard navigation */
.skip-link { /* Keyboard navigation shortcuts */ }

/* Enhanced focus indicators */
:focus-visible { /* Visible focus with high contrast support */ }

/* Status announcements */
[role="status"] { /* Polite announcements */ }
[role="alert"] { /* Assertive announcements */ }

/* Progress indicators */
.progress[role="progressbar"] { /* Accessible progress bars */ }
```

### Integration with Existing Architecture

**Backward Compatibility**:
- Graceful fallback to original renderers if Phase 4 unavailable
- Progressive enhancement without breaking existing functionality
- Module independence allows selective loading

**Agent Integration**:
- Seamlessly works with existing state management
- Extends existing event handlers without conflicts
- Maintains separation of concerns per agents.md architecture

---

## Implementation Priorities

### Phase 1 (Foundation)
1. **CSS Variables** - Colors, spacing, typography (IMMEDIATE)
2. **Buttons** - All variants and states
3. **Form Elements** - Inputs, labels, validation
4. **Alerts** - Success, error, warning, info messages

### Phase 2 (Core Components)
5. **Cards & Panels** - Container elements
6. **Modals** - Dialog boxes
7. **Tables** - Data display
8. **Status Indicators** - Progress, states

### Phase 3 (Advanced)
9. **Navigation** - Tabs, breadcrumbs
10. **Loading States** - Skeletons, spinners
11. **Animations** - Transitions, effects
12. **Responsive Utilities** - Breakpoint helpers

### Phase 4 (Advanced Accessibility & Dark Mode) ✅ COMPLETE
13. **Enhanced Dark Mode** - Three-mode system (Light/Dark/Auto) with system preference detection
14. **Advanced Accessibility** - Comprehensive WCAG 2.1 AA compliance with screen reader support
15. **Focus Management** - Enhanced focus indicators and keyboard navigation
16. **ARIA Enhancements** - Complete ARIA attribute management and live regions

---

## Maintenance & Evolution

### Regular Reviews
- Quarterly audit of component consistency
- Monthly accessibility review (WCAG AA+)
- Performance monitoring of animations
- User feedback collection and iteration

### Adding New Components
1. Follow existing naming conventions (BEM for classes)
2. Use CSS variables for all colors, spacing
3. Test all interactive states
4. Document in component library
5. Add to accessibility checklist
6. Update this guide

---

## Reference Files & Implementation

### Core CSS Files
- `css/variables.css` - Design tokens and CSS custom properties
- `css/buttons.css` - Button components and variants
- `css/forms.css` - Form elements and validation states
- `css/cards.css` - Card and panel components
- `css/modals.css` - Modal dialogs and overlays
- `css/tables.css` - Table styling and interactions
- `css/alerts.css` - Alert messages and status indicators
- `css/status.css` - Status indicators and progress elements

### Advanced Components (Phase 2)
- `css/phase2-components.css` - Advanced UI components
- `js/phase2-components.js` - Interactive functionality for Phase 2

### Advanced Components (Phase 3)
- `css/phase3-advanced.css` - Navigation, loading states, animations, responsive utilities
- `js/phase3-advanced.js` - Interactive functionality for Phase 3

### Advanced Accessibility & Dark Mode (Phase 4) ✅ COMPLETE
- `css/phase4-accessibility.css` - Advanced accessibility styles and enhanced dark mode
- `js/phase4-accessibility.js` - Accessibility manager and enhanced dark mode functionality
- `js/phase4-ui-renderers.js` - Enhanced UI renderers with accessibility features

### Demo & Examples
- `examples/ui-components-demo.html` - Basic components showcase
- `examples/phase3-advanced-demo.html` - Advanced components demonstration
- `examples/phase4-accessibility-demo.html` - Advanced accessibility and dark mode features
- `examples/phase4-integration-test.html` - Phase 4 integration testing suite
- `test-editable-stromkreise.html` - Editable table implementation
- `test-protocol-input-fix.html` - Form validation examples
- `test-protocol-module.html` - Protocol module UI patterns

### Documentation
- `docs/interface/ui-standardization.md` - This standardization guide
- `docs/implemented/1_1-css-variables-buttons.md` - Phase 1 implementation summary
- `docs/implemented/3_1-phase3-advanced-components.md` - Phase 3 implementation summary
- `docs/implemented/4_1-phase4-accessibility-dark-mode.md` - Phase 4 implementation summary
- `docs/examples/custom-cell-mapping.md` - Custom component examples
- `docs/RENDER_QUICKSTART.md` - Quick start guide for rendering

### JavaScript Modules
- `js/main.js` - Application bootstrap and initialization
- `js/handlers.js` - Event handlers and user interactions
- `js/utils.js` - Utility functions and data processing
- `js/state.js` - State management and persistence

### Configuration & Build
- `package.json` - Dependencies and build scripts
- `jest.config.js` - Testing configuration
- `.babelrc` - JavaScript transpilation settings

### Related Module Documents
- **Phase 1**: roadmap_phase1.md (UI Skeleton)
- **Phase 5**: roadmap_phase5.md (Integration & Styling)
- **Phase 6**: roadmap_phase6.md (Accessibility Audit)
- **HR Module**: README_hr_module.md (CSS dark/light mode example)
- **Protokoll Module**: protokoll-complete.md (Form standardization)
- **Asset Module**: asset-module.md (Table standards)
- **Agents Architecture**: agents.md (Module architecture and patterns)

### Implementation Status
- ✅ **Phase 1 Complete**: CSS Variables, Buttons, Forms, Basic Components
- ✅ **Phase 2 Complete**: Cards, Modals, Tables, Status Indicators, Interactive Components
- ✅ **Phase 3 Complete**: Navigation, Loading States, Animations, Responsive Utilities
- ✅ **Phase 4 Complete**: Advanced Accessibility & Enhanced Dark Mode
- ⏳ **Phase 5 Planned**: Integration Testing, Performance Optimization
- ⏳ **Phase 6 Planned**: Comprehensive Accessibility Audit

---

**Last Updated**: December 11, 2025  
**Version**: 2.1 - Phase 4 Complete  
**Owner**: Design System Team  
**Review Cycle**: Quarterly

**Phase 4 Completion**: Advanced Accessibility & Enhanced Dark Mode features fully implemented with WCAG 2.1 AA compliance, comprehensive screen reader support, enhanced keyboard navigation, and three-mode theme system (Light/Dark/Auto).
