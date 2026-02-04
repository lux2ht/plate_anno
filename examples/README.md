# Example CSV Files

This folder contains example CSV files for importing into the Plate Annotation Tool.

## CSV Format

The import function expects a **long-format CSV** with three required columns:

| Column | Description | Example |
|--------|-------------|---------|
| `Well` | Well ID (row letter + column number) | A1, B3, H12, AF48 |
| `AnnotationKey` | The annotation key/name | Treatment, Concentration |
| `AnnotationValue` | The annotation value | DMSO, 10 uM |

### Format Rules

- Column headers are **case-insensitive** (`well`, `Well`, `WELL` all work)
- Columns can be in **any order**
- Additional columns are ignored (e.g., `Row`, `Column` from exports)
- Multiple rows with the **same Well ID** add multiple annotations to that well
- Use **quotes** for values containing commas: `"Value, with comma"`
- The plate format is **auto-detected** based on the wells in the file

### Example

```csv
Well,AnnotationKey,AnnotationValue
A1,Treatment,DMSO
A1,Replicate,1
A2,Treatment,Drug X
A2,Concentration,10 uM
A2,Replicate,1
B1,Treatment,DMSO
B1,Replicate,2
```

This creates:
- Well A1 with 2 annotations: Treatment=DMSO, Replicate=1
- Well A2 with 3 annotations: Treatment=Drug X, Concentration=10 uM, Replicate=1
- Well B1 with 2 annotations: Treatment=DMSO, Replicate=2

## Example Files

| File | Plate Format | Description |
|------|--------------|-------------|
| `6-well-example.csv` | 6-well | Cell line comparison with drug treatment |
| `12-well-example.csv` | 12-well | Dose response with triplicates |
| `24-well-example.csv` | 24-well | Compound screening with controls |
| `48-well-example.csv` | 48-well | Patient samples with timepoints and standards |
| `96-well-example.csv` | 96-well | 8-point dose response for 8 NSAID compounds |
| `384-well-example.csv` | 384-well | HTS library screening with edge controls |
| `1536-well-example.csv` | 1536-well | Ultra-HTS primary screen layout |

## Usage

1. Open the Plate Annotation Tool (`index.html`)
2. Click **Import CSV**
3. Select one of these example files
4. The plate format will auto-adjust to fit the data
5. Use **Color by** dropdown to visualize different annotation keys
