# Plate Annotation Tool — Implementation Plan

## Technology Choice

**Framework:** Single-page app using vanilla HTML + CSS + JavaScript (no build step).
This keeps the project simple, zero-dependency, and easy to host on GitHub Pages or any static server.

**Key files:**
```
plate_anno/
├── CLAUDE.md
├── PLAN.md
├── index.html          # Entry point, layout shell
├── style.css           # All styles
├── app.js              # Application logic (~1750 lines)
└── README.md           # (optional, only if requested)
```

---

## Data Model

```js
// State shape
{
  plateFormat: "96",          // "6" | "12" | "24" | "48" | "96" | "384" | "1536"
  annotations: {
    // key = well ID, value = array of annotation objects
    "A1": [
      { key: "Treatment", value: "DMSO" },
      { key: "Concentration", value: "10uM" }
    ],
    "B3": [
      { key: "Treatment", value: "Drug_X" }
    ]
  }
}
```

---

## Plate Formats

| Format | Rows | Cols |
|--------|------|------|
| 6-well | 2 | 3 |
| 12-well | 3 | 4 |
| 24-well | 4 | 6 |
| 48-well | 6 | 8 |
| 96-well | 8 | 12 |
| 384-well | 16 | 24 |
| 1536-well | 32 | 48 |

---

## Implemented Features

### Core
- Plate format selector (6 to 1536 wells)
- Interactive well grid with row/column headers
- Click to select well and open annotation panel
- Key-value annotation pairs per well
- Add/remove annotations with immediate state save
- Annotation badge count on wells
- Color fill for annotated wells

### Selection
- Multi-well selection (Ctrl+Click)
- Shift+Click range selection
- Drag rectangle selection
- Row/column header click to select entire row/column
- Select All (Ctrl+A)
- Range input (e.g. "A1:C6", "A1,B2,C3")
- Arrow key navigation
- Tab/Shift+Tab navigation (reading order)
- Select Same Annotations (context menu)

### Annotation Tools
- Batch annotation for multiple selected wells
- Copy/Paste wells (Ctrl+C/V) with positional mapping
- Fill Right / Fill Down (context menu)
- Double-click quick annotate
- Autocomplete for annotation keys (includes preset biology keys)
- Autocomplete for annotation values
- Preset keys: Treatment, Concentration, Cell Line, Replicate, Compound, Dose, Time Point, Condition, etc.

### Plate Templates
- Serial Dilution
- Dose Response
- Controls on Border
- Quadrant Layout
- Checkerboard

### Plate Transforms
- Rotate 90° clockwise
- Mirror Horizontal
- Mirror Vertical

### Export / Import
- CSV export (long format — one row per annotation per well)
- CSV export (wide format — one row per well, keys as columns)
- Include empty wells option
- CSV import with auto-detection of plate format
- JSON project save/load
- Plate name included in export filenames

### Data Views (bottom panel)
- CSV (Long) preview
- CSV (Wide) preview
- Table view

### Visual
- Color-by annotation key with color legend and well counts
- Search/filter wells by annotation content
- Hover tooltip with full annotation details
- Annotation preview inside wells (for smaller plates)
- Well names displayed in small plate formats (6/12/24/48)
- Plate border styling
- Dark mode toggle
- Print-friendly CSS

### UX
- Undo/Redo (Ctrl+Z/Y) with 50-step history
- localStorage auto-persistence
- Right-click context menu
- Toast notifications
- Help modal with keyboard shortcuts (? key)
- Plate name field
- Statistics bar (annotated wells count, unique keys, unique values)
- Responsive layout
- Format-specific well sizing (80px for 6-well down to 12px for 1536-well)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy selected wells |
| Ctrl+V | Paste to selected wells |
| Ctrl+A | Select all wells |
| Escape | Deselect all |
| Delete | Clear selected wells |
| Arrow keys | Navigate wells |
| Shift+Arrow | Extend selection |
| Tab | Next well |
| Shift+Tab | Previous well |
| ? | Show help |
