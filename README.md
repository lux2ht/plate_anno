# Plate Annotation Tool

A browser-based tool for annotating microplate wells with custom key-value metadata. Designed for researchers working with multi-well plates (6 to 1536 wells).

**Zero dependencies. No build step. Just open `index.html` in your browser.**

## Features

### Plate Formats
- 6-well, 12-well, 24-well, 48-well, 96-well, 384-well, and 1536-well plates
- Automatic well sizing based on plate format
- Row (A-AF) and column (1-48) headers

### Selection Tools
- Click to select a single well
- Ctrl+Click to toggle individual wells
- Shift+Click to select a range
- Drag to select a rectangle
- Click row/column headers to select entire rows/columns
- Range input field (e.g., `A1:C6`, `A1,B2,C3`, `A1:C6,D1:D12`)
- Arrow key navigation with Shift to extend selection

### Annotations
- Add multiple key-value annotation pairs per well
- Batch annotate multiple selected wells at once
- Autocomplete for annotation keys (includes preset biology keys like Treatment, Concentration, Cell Line, Replicate, etc.)
- Autocomplete for annotation values based on existing data
- Copy/paste annotations between wells (Ctrl+C/V)
- Fill Right and Fill Down from context menu
- Double-click a well to quick-add an annotation

### Templates
Pre-built annotation templates for common experimental layouts:
- Serial Dilution
- Dose Response
- Controls on Border
- Quadrant Layout
- Checkerboard

### Plate Transforms
- Rotate 90° clockwise
- Mirror horizontally
- Mirror vertically

### Export & Import
- **CSV (Long format)**: One row per annotation per well
- **CSV (Wide format)**: One row per well, annotation keys as columns
- **JSON project**: Save and load complete projects
- Import CSV files with auto-detection of plate format
- Option to include empty wells in exports

### Visualization
- Color wells by any annotation key
- Heatmap coloring for numeric values
- Categorical coloring with legend
- Search/filter wells by annotation content
- Hover tooltips with full annotation details
- Statistics bar showing well counts and annotation keys

### User Experience
- Dark mode toggle
- Undo/Redo with 50-step history (Ctrl+Z/Y)
- Auto-save to localStorage
- Right-click context menu
- Toast notifications
- Responsive layout

## Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern browser
3. Select your plate format from the dropdown
4. Click wells to select and annotate them

No installation, no build process, no server required.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy selected wells |
| `Ctrl+V` | Paste to selected wells |
| `Ctrl+A` | Select all wells |
| `Escape` | Deselect all |
| `Delete` | Clear selected wells |
| `Arrow keys` | Navigate wells |
| `Shift+Arrow` | Extend selection |
| `Tab` | Next well |
| `Shift+Tab` | Previous well |
| `?` | Show help modal |

## Project Structure

```
plate_anno/
├── index.html    # Main HTML file
├── style.css     # Styles (including dark mode)
├── app.js        # Application logic
├── CLAUDE.md     # AI assistant instructions
├── PLAN.md       # Implementation plan
└── README.md     # This file
```

## Data Format

Annotations are stored as key-value pairs per well:

```json
{
  "A1": [
    { "key": "Treatment", "value": "DMSO" },
    { "key": "Concentration", "value": "10 uM" }
  ],
  "B3": [
    { "key": "Treatment", "value": "Drug_X" }
  ]
}
```

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No Internet Explorer support.

## License

MIT
