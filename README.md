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

### Chart Panel (powered by Plotly.js)
Interactive data visualization with publication-quality export:
- **Chart Types**: Bar, Line, Scatter, Box Plot, Violin Plot, Heatmap, Pie
- **Multi-level Grouping**: Up to 2 grouping levels for complex experiments
- **Grouped Axes**: Bar charts render a secondary group level as nested x-axis tiers (GraphPad-style) with automatic annotations instead of extra colors
- **Aggregation**: Count, Sum, Mean, Median, Min, Max
- **Error Bars**: Standard Deviation (SD) or Standard Error of Mean (SEM)
- **Color Themes**: Default, Colorblind-safe, Pastel, Nature, Corporate, Viridis, or Custom
- **Plot Themes & Formatting**: GraphPad-inspired presets plus controls for titles, axis labels, tick fonts/colors, gridlines, and legend placement
- **Axis Controls**: Toggle linear/log scales, pin Y-axis min/max, and set manual tick spacing for bar plots
- **Custom Colors**: Define your own color palette with a color picker
- **Data Source**: Visualize all wells or only selected wells
- **Export**: PNG, SVG, WebP via Plotly toolbar (perfect for presentations)

### User Experience
- Dark mode toggle
- Undo/Redo with 50-step history (Ctrl+Z/Y)
- Auto-save to localStorage
- Right-click context menu
- Drag-to-resize panels (plate vs annotations vs data view)
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
├── examples/     # Sample CSV files for testing
│   ├── plate_6well.csv
│   ├── plate_12well.csv
│   ├── plate_24well.csv
│   ├── plate_48well.csv
│   ├── plate_96well.csv
│   ├── plate_384well.csv
│   ├── plate_1536well.csv
│   └── chart_test_96well.csv  # Sample data for chart testing
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

## CSV Import Format

The import function expects a long-format CSV with three required columns:

```csv
Well,AnnotationKey,AnnotationValue
A1,Treatment,DMSO
A1,Replicate,1
A2,Treatment,Drug X
A2,Concentration,10 uM
```

- Column headers are case-insensitive
- Multiple rows with the same Well ID add multiple annotations
- Plate format is auto-detected from the data

See the [`examples/`](examples/) folder for sample CSV files for each plate format.

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No Internet Explorer support.

## License

MIT
