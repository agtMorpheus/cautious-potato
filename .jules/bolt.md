## 2025-05-24 - SheetJS Read Performance
**Learning:** `XLSX.read` with `cellStyles: true` adds ~30-40% overhead. For data extraction tasks where styles are irrelevant (like reading the input protokoll), disabling this option yields significant speedups.
**Action:** Always check if `cellStyles: true` is necessary when using `XLSX.read`. Default to `false` (or omitting it) for data processing tasks.
