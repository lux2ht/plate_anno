# Plate Annotation Tool — Implementation Plan

## Technology Choice

**Framework:** Single-page app using vanilla HTML + CSS + JavaScript (no build step).
This keeps the project simple, zero-dependency, and easy to host on GitHub Pages or any static server. If complexity grows, we can migrate to a framework later.

**Key files:**
```
plate_anno/
├── CLAUDE.md
├── PLAN.md
├── index.html          # Entry point, layout shell
├── style.css           # All styles
├── app.js              # Application logic
└── README.md           # (optional, only if requested)
```

---

## Data Model

```js
// State shape
{
  plateFormat: "96",          // "6" | "12" | "24" | "48" | "96" | "384"
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

---

## Implementation Steps

### Step 1 — Plate selector & grid rendering
- Dropdown to pick plate format (6, 12, 24, 48, 96, 384).
- Render a grid of wells as a CSS grid with row/column labels (A-P, 1-24).
- Wells are clickable; clicking opens the annotation panel.
- Changing plate format clears annotations (with confirmation if data exists).

### Step 2 — Well selection & annotation panel
- Clicking a well highlights it and opens a side/bottom panel.
- Panel shows the well ID (e.g. "B3") and a list of existing annotations for that well.
- Each annotation is a key-value pair (e.g. key="Treatment", value="DMSO").
- "Add annotation" button appends a new empty key-value row.
- Each row has a delete button to remove that annotation.
- Edits are saved to state immediately on input change.

### Step 3 — Visual feedback on the plate
- Wells with annotations show a colored dot or fill to indicate data exists.
- Hovering a well shows a tooltip with its annotations.
- The number of annotations can be shown as a small badge on the well.

### Step 4 — Multi-well selection (stretch / nice-to-have)
- Shift+click or drag to select multiple wells.
- Apply the same annotation to all selected wells at once.

### Step 5 — CSV export
- "Export CSV" button generates a CSV in **long format**:
  ```
  Well,Row,Column,AnnotationKey,AnnotationValue
  A1,A,1,Treatment,DMSO
  A1,A,1,Concentration,10uM
  B3,B,3,Treatment,Drug_X
  ```
- One row per annotation per well.
- Wells with no annotations are omitted (or optionally included as empty rows).
- CSV is downloaded as a file via `Blob` + `URL.createObjectURL`.

### Step 6 — Polish & UX
- Responsive layout so the plate grid scales on smaller screens.
- Clear all annotations button (with confirmation).
- Keyboard accessibility for the annotation panel.

---

## Out of Scope (for now)
- Backend / database persistence (all client-side, in-memory).
- User accounts or sharing.
- Import CSV to pre-fill annotations.
- Undo/redo.

These can be added incrementally if needed.
