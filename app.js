// ============================================================
// Plate Annotation Tool — app.js
// ============================================================

// ---- Constants ----
const PLATE_FORMATS = {
  6:    { rows: 2,  cols: 3  },
  12:   { rows: 3,  cols: 4  },
  24:   { rows: 4,  cols: 6  },
  48:   { rows: 6,  cols: 8  },
  96:   { rows: 8,  cols: 12 },
  384:  { rows: 16, cols: 24 },
  1536: { rows: 32, cols: 48 },
};

// Row labels: A-P for 384 and below, extended to AF for 1536
const ROW_LETTERS = (() => {
  const letters = [];
  for (let i = 0; i < 26; i++) letters.push(String.fromCharCode(65 + i));
  for (let i = 0; i < 6; i++) letters.push('A' + String.fromCharCode(65 + i));
  return letters;
})();

const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#10b981',
  '#d946ef', '#64748b', '#eab308', '#78716c', '#dc2626',
];

// Chart color themes
const CHART_COLOR_THEMES = {
  default: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16', '#e11d48'],
  colorblind: ['#0077BB', '#33BBEE', '#009988', '#EE7733', '#CC3311', '#EE3377', '#BBBBBB', '#AA4499', '#44AA99', '#882255', '#332288', '#999933'],
  pastel: ['#B4D4FF', '#FFD4B4', '#D4FFB4', '#FFB4D4', '#D4B4FF', '#B4FFE8', '#FFE8B4', '#E8B4FF', '#B4E8FF', '#FFB4B4', '#B4FFB4', '#D4D4FF'],
  nature: ['#2E7D32', '#558B2F', '#7CB342', '#8BC34A', '#AED581', '#C5E1A5', '#1B5E20', '#388E3C', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7'],
  corporate: ['#1E3A5F', '#3D5A80', '#5C7A9B', '#98C1D9', '#E0FBFC', '#293241', '#445E74', '#6A839C', '#A3C4D9', '#D1E8F0', '#1C4966', '#3E6B8A'],
  viridis: ['#440154', '#482878', '#3E4A89', '#31688E', '#26828E', '#1F9E89', '#35B779', '#6DCD59', '#B4DE2C', '#FDE725', '#21918C', '#5DC863']
};

const STORAGE_KEY = 'plateAnno_state';

// Common annotation key presets for biology experiments
const PRESET_KEYS = [
  'Treatment', 'Concentration', 'Cell Line', 'Replicate',
  'Compound', 'Dose', 'Time Point', 'Condition',
  'Control', 'Sample ID', 'Passage', 'Media',
  'Inhibitor', 'Antibody', 'siRNA', 'MOI',
];

// ---- State ----
let plateFormat = 96;
let annotations = {}; // { "A1": [{ key: "", value: "" }, ...], ... }
let selectedWells = new Set(); // multi-selection
let lastClickedWell = null; // for shift-click range
let clipboard = null; // copied annotations
let colorByKey = ''; // annotation key to color-code by
let searchQuery = '';

// Undo/redo stacks
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 50;

// Drag selection state
let isDragging = false;
let dragStartPos = null;
let dragRect = null;

// ---- DOM refs ----
const formatSelect = document.getElementById('plate-format');
const colorBySelect = document.getElementById('color-by');
const searchInput = document.getElementById('search-input');
const selectionInfo = document.getElementById('selection-info');
const plateContainer = document.getElementById('plate-container');
const annoPanel = document.getElementById('anno-panel');
const csvPreview = document.getElementById('csv-preview');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnCopy = document.getElementById('btn-copy');
const btnPaste = document.getElementById('btn-paste');
const btnClear = document.getElementById('btn-clear');
const fileImport = document.getElementById('file-import');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const fileLoad = document.getElementById('file-load');
const templateSelect = document.getElementById('template-select');
const contextMenu = document.getElementById('context-menu');
const statsBar = document.getElementById('stats-bar');
const rangeInput = document.getElementById('range-input');
const btnDarkMode = document.getElementById('btn-dark-mode');
const btnHelp = document.getElementById('btn-help');
const helpModal = document.getElementById('help-modal');
const helpClose = document.getElementById('help-close');
const hoverTooltip = document.getElementById('hover-tooltip');
const plateNameInput = document.getElementById('plate-name');
const toastContainer = document.getElementById('toast-container');
const btnViewCSV = document.getElementById('btn-view-csv');
const btnViewWide = document.getElementById('btn-view-wide');
const btnViewTable = document.getElementById('btn-view-table');
const btnExportWide = document.getElementById('btn-export-wide');
const tableView = document.getElementById('table-view');
const btnRotate = document.getElementById('btn-rotate');
const btnMirrorH = document.getElementById('btn-mirror-h');
const btnMirrorV = document.getElementById('btn-mirror-v');
const includeEmptyCheckbox = document.getElementById('include-empty');
const btnViewChart = document.getElementById('btn-view-chart');
const chartView = document.getElementById('chart-view');
const chartContainer = document.getElementById('chart-container');
const chartTypeSelect = document.getElementById('chart-type');
const chartXAxisSelect = document.getElementById('chart-x-axis');
const chartYAxisSelect = document.getElementById('chart-y-axis');
const chartGroup1Select = document.getElementById('chart-group1');
const chartGroup2Select = document.getElementById('chart-group2');
const chartGroup3Select = document.getElementById('chart-group3');
const chartAggregationSelect = document.getElementById('chart-aggregation');
const chartThemeSelect = document.getElementById('chart-theme');
const chartErrorBarsSelect = document.getElementById('chart-error-bars');
const btnEditColors = document.getElementById('btn-edit-colors');
const customColorsModal = document.getElementById('custom-colors-modal');
const customColorsClose = document.getElementById('custom-colors-close');
const customColorsList = document.getElementById('custom-colors-list');
const btnAddCustomColor = document.getElementById('btn-add-custom-color');
const btnResetCustomColors = document.getElementById('btn-reset-custom-colors');
const btnApplyCustomColors = document.getElementById('btn-apply-custom-colors');

// Context menu state
let contextWell = null;
let currentView = 'table'; // 'table', 'csv', 'wide', or 'chart'

// Chart state
let chartType = 'bar';
let chartXAxis = '';
let chartYAxis = '_count';
let chartGroup1 = '';
let chartGroup2 = '';
let chartGroup3 = '';
let chartAggregation = 'count';
let chartTheme = 'default';
let chartErrorBars = 'none';
let chartDataSource = 'all';
let customChartColors = [...CHART_COLOR_THEMES.default]; // Default custom colors

// ---- Init ----
loadState();
formatSelect.addEventListener('change', onFormatChange);
colorBySelect.addEventListener('change', onColorByChange);
searchInput.addEventListener('input', onSearchInput);
templateSelect.addEventListener('change', onTemplateSelect);
btnExport.addEventListener('click', exportCSV);
btnImport.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', importCSV);
btnSave.addEventListener('click', saveProject);
btnLoad.addEventListener('click', () => fileLoad.click());
fileLoad.addEventListener('change', loadProject);
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);
btnCopy.addEventListener('click', copyWells);
btnPaste.addEventListener('click', pasteWells);
btnClear.addEventListener('click', clearAll);
btnDarkMode.addEventListener('click', toggleDarkMode);
btnHelp.addEventListener('click', () => { helpModal.style.display = ''; });
helpClose.addEventListener('click', () => { helpModal.style.display = 'none'; });
helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; });
rangeInput.addEventListener('keydown', onRangeInputKey);
plateNameInput.addEventListener('input', saveState);
btnViewCSV.addEventListener('click', () => switchView('csv'));
btnViewWide.addEventListener('click', () => switchView('wide'));
btnViewTable.addEventListener('click', () => switchView('table'));
btnExportWide.addEventListener('click', exportWideCSV);
includeEmptyCheckbox.addEventListener('change', () => { refreshCSVPreview(); });
btnRotate.addEventListener('click', rotatePlate90);
btnMirrorH.addEventListener('click', mirrorPlateH);
btnMirrorV.addEventListener('click', mirrorPlateV);
btnViewChart.addEventListener('click', () => switchView('chart'));
chartTypeSelect.addEventListener('change', onChartControlChange);
chartXAxisSelect.addEventListener('change', onChartControlChange);
chartYAxisSelect.addEventListener('change', onChartControlChange);
chartGroup1Select.addEventListener('change', onChartControlChange);
chartGroup2Select.addEventListener('change', onChartControlChange);
chartGroup3Select.addEventListener('change', onChartControlChange);
chartAggregationSelect.addEventListener('change', onChartControlChange);
chartErrorBarsSelect.addEventListener('change', onChartControlChange);
document.querySelectorAll('input[name="chart-source"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    chartDataSource = e.target.value;
    if (currentView === 'chart') renderChart();
  });
});
btnEditColors.addEventListener('click', openCustomColorsModal);
customColorsClose.addEventListener('click', closeCustomColorsModal);
customColorsModal.addEventListener('click', (e) => { if (e.target === customColorsModal) closeCustomColorsModal(); });
btnAddCustomColor.addEventListener('click', addCustomColorRow);
btnResetCustomColors.addEventListener('click', resetCustomColors);
btnApplyCustomColors.addEventListener('click', applyCustomColors);
chartThemeSelect.addEventListener('change', onThemeChange);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Don't intercept when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copyWells(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteWells(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    selectAllWells();
  }
  if (e.key === '?') {
    helpModal.style.display = helpModal.style.display === 'none' ? '' : 'none';
  }
  if (e.key === 'Escape') {
    selectedWells.clear();
    lastClickedWell = null;
    renderPlate();
    renderAnnoPanel();
    updateSelectionInfo();
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedWells.size > 0) {
      pushUndo();
      for (const wid of selectedWells) delete annotations[wid];
      renderPlate();
      renderAnnoPanel();
      refreshCSVPreview();
      saveState();
    }
  }
  // Tab navigation between wells (next/prev in reading order)
  if (e.key === 'Tab' && selectedWells.size > 0) {
    e.preventDefault();
    const current = lastClickedWell || [...selectedWells][0];
    const pc = parseWellId(current);
    const rIdx = ROW_LETTERS.indexOf(pc.row);
    const cIdx = parseInt(pc.col, 10);
    const { rows, cols } = PLATE_FORMATS[plateFormat];
    let nr = rIdx, nc = cIdx;
    if (e.shiftKey) {
      nc--; if (nc < 1) { nc = cols; nr--; }
      if (nr < 0) { nr = rows - 1; nc = cols; }
    } else {
      nc++; if (nc > cols) { nc = 1; nr++; }
      if (nr >= rows) { nr = 0; nc = 1; }
    }
    const newWell = ROW_LETTERS[nr] + nc;
    selectedWells.clear();
    selectedWells.add(newWell);
    lastClickedWell = newWell;
    renderPlate();
    renderAnnoPanel();
  }
  // Arrow key navigation
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedWells.size > 0) {
    e.preventDefault();
    const current = lastClickedWell || [...selectedWells][0];
    const pc = parseWellId(current);
    const rIdx = ROW_LETTERS.indexOf(pc.row);
    const cIdx = parseInt(pc.col, 10);
    const { rows, cols } = PLATE_FORMATS[plateFormat];
    let nr = rIdx, nc = cIdx;
    if (e.key === 'ArrowUp') nr = Math.max(0, rIdx - 1);
    if (e.key === 'ArrowDown') nr = Math.min(rows - 1, rIdx + 1);
    if (e.key === 'ArrowLeft') nc = Math.max(1, cIdx - 1);
    if (e.key === 'ArrowRight') nc = Math.min(cols, cIdx + 1);
    const newWell = ROW_LETTERS[nr] + nc;
    if (e.shiftKey) {
      selectedWells.add(newWell);
    } else {
      selectedWells.clear();
      selectedWells.add(newWell);
    }
    lastClickedWell = newWell;
    renderPlate();
    renderAnnoPanel();
  }
});

// Drag selection
document.addEventListener('mousedown', onDragStart);
document.addEventListener('mousemove', onDragMove);
document.addEventListener('mouseup', onDragEnd);

// Context menu
document.addEventListener('click', hideContextMenu);
contextMenu.querySelectorAll('.ctx-item').forEach(item => {
  item.addEventListener('click', (e) => {
    onContextAction(e.target.dataset.action);
    hideContextMenu();
  });
});

// Restore dark mode preference
if (localStorage.getItem('plateAnno_dark') === '1') document.body.classList.add('dark');

renderPlate();
renderAnnoPanel();
refreshCSVPreview();
updateButtonStates();
updateColorByOptions();
updateStats();

// ============================================================
// Plate rendering
// ============================================================
function renderPlate() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  const grid = document.createElement('div');
  grid.className = 'plate-grid fmt-' + plateFormat;
  grid.style.gridTemplateColumns = `auto repeat(${cols}, 1fr)`;

  // Color map for color-by feature
  const colorMap = buildColorMap();

  // Corner cell
  const corner = document.createElement('div');
  corner.className = 'corner';
  grid.appendChild(corner);

  // Column labels (clickable to select entire column)
  for (let c = 1; c <= cols; c++) {
    const lbl = document.createElement('div');
    lbl.className = 'col-label';
    lbl.textContent = c;
    lbl.addEventListener('click', (e) => selectColumn(c, e));
    grid.appendChild(lbl);
  }

  // Search matching wells
  const searchMatches = getSearchMatches();

  // Rows
  for (let r = 0; r < rows; r++) {
    const rowLetter = ROW_LETTERS[r];

    // Row label (clickable to select entire row)
    const rowLabel = document.createElement('div');
    rowLabel.className = 'row-label';
    rowLabel.textContent = rowLetter;
    rowLabel.addEventListener('click', (e) => selectRow(rowLetter, e));
    grid.appendChild(rowLabel);

    for (let c = 1; c <= cols; c++) {
      const wellId = rowLetter + c;
      const well = document.createElement('div');
      well.className = 'well';
      well.dataset.well = wellId;

      const annos = annotations[wellId];
      if (annos && annos.length > 0) {
        well.classList.add('has-anno');
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = annos.length;
        well.appendChild(badge);
      }

      // Show well name inside for small plates
      if (plateFormat <= 96) {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'well-name';
        nameSpan.textContent = wellId;
        well.appendChild(nameSpan);
      }

      // Annotation preview inside well for small plates
      if (plateFormat <= 48 && annos && annos.length > 0) {
        const preview = document.createElement('span');
        preview.className = 'anno-preview';
        preview.textContent = annos.map(a => a.value || a.key).filter(Boolean).join(', ');
        well.appendChild(preview);
      }

      if (selectedWells.has(wellId)) well.classList.add('selected');

      // Color fill
      if (colorMap && colorMap[wellId]) {
        const fill = document.createElement('div');
        fill.className = 'color-fill';
        fill.style.background = colorMap[wellId];
        well.appendChild(fill);
      }

      // Search highlighting
      if (searchQuery) {
        if (searchMatches.has(wellId)) {
          well.classList.add('search-match');
        } else {
          well.classList.add('search-dim');
        }
      }

      well.addEventListener('click', (e) => onWellClick(wellId, e));
      well.addEventListener('contextmenu', (e) => onWellContextMenu(wellId, e));
      well.addEventListener('mouseenter', (e) => showHoverTooltip(wellId, e));
      well.addEventListener('mouseleave', hideHoverTooltip);
      well.addEventListener('dblclick', (e) => onWellDoubleClick(wellId, e));

      grid.appendChild(well);
    }
  }

  plateContainer.innerHTML = '';
  plateContainer.appendChild(grid);

  // Color legend
  if (colorMap) renderColorLegend(colorMap);

  updateSelectionInfo();
  updateButtonStates();
  updateStats();
}

// ============================================================
// Well selection
// ============================================================
function onWellClick(wellId, e) {
  if (e.ctrlKey || e.metaKey) {
    // Toggle individual well
    if (selectedWells.has(wellId)) {
      selectedWells.delete(wellId);
    } else {
      selectedWells.add(wellId);
    }
    lastClickedWell = wellId;
  } else if (e.shiftKey && lastClickedWell) {
    // Range select
    const range = getWellRange(lastClickedWell, wellId);
    for (const wid of range) selectedWells.add(wid);
  } else {
    // Single select
    selectedWells.clear();
    selectedWells.add(wellId);
    lastClickedWell = wellId;
  }

  renderPlate();
  renderAnnoPanel();
}

function selectRow(rowLetter, e) {
  const { cols } = PLATE_FORMATS[plateFormat];
  if (!e.ctrlKey && !e.metaKey) selectedWells.clear();
  for (let c = 1; c <= cols; c++) {
    selectedWells.add(rowLetter + c);
  }
  renderPlate();
  renderAnnoPanel();
}

function selectColumn(colNum, e) {
  const { rows } = PLATE_FORMATS[plateFormat];
  if (!e.ctrlKey && !e.metaKey) selectedWells.clear();
  for (let r = 0; r < rows; r++) {
    selectedWells.add(ROW_LETTERS[r] + colNum);
  }
  renderPlate();
  renderAnnoPanel();
}

function selectAllWells() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  selectedWells.clear();
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      selectedWells.add(ROW_LETTERS[r] + c);
    }
  }
  renderPlate();
  renderAnnoPanel();
}

function invertSelection() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  const newSel = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wid = ROW_LETTERS[r] + c;
      if (!selectedWells.has(wid)) newSel.add(wid);
    }
  }
  selectedWells = newSel;
  renderPlate();
  renderAnnoPanel();
}

function selectByAnnotationState(hasAnnotations) {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  selectedWells.clear();
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wid = ROW_LETTERS[r] + c;
      const has = annotations[wid] && annotations[wid].length > 0;
      if (has === hasAnnotations) selectedWells.add(wid);
    }
  }
  renderPlate();
  renderAnnoPanel();
  showToast(`${selectedWells.size} wells selected`, 'info');
}

function getWellRange(fromId, toId) {
  const pf = parseWellId(fromId), pt = parseWellId(toId);
  const r1 = ROW_LETTERS.indexOf(pf.row);
  const c1 = parseInt(pf.col, 10);
  const r2 = ROW_LETTERS.indexOf(pt.row);
  const c2 = parseInt(pt.col, 10);
  const rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
  const cMin = Math.min(c1, c2), cMax = Math.max(c1, c2);
  const wells = [];
  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      wells.push(ROW_LETTERS[r] + c);
    }
  }
  return wells;
}

// ============================================================
// Drag selection
// ============================================================
function onDragStart(e) {
  // Only start drag from the plate container area, not from wells directly (wells handle click)
  if (e.target.closest('.well') || e.target.closest('.col-label') || e.target.closest('.row-label')) return;
  if (!e.target.closest('.plate-container')) return;
  isDragging = true;
  dragStartPos = { x: e.clientX, y: e.clientY };
  dragRect = document.createElement('div');
  dragRect.className = 'drag-rect';
  document.body.appendChild(dragRect);
}

function onDragMove(e) {
  if (!isDragging || !dragRect) return;
  const x = Math.min(dragStartPos.x, e.clientX);
  const y = Math.min(dragStartPos.y, e.clientY);
  const w = Math.abs(e.clientX - dragStartPos.x);
  const h = Math.abs(e.clientY - dragStartPos.y);
  dragRect.style.left = x + 'px';
  dragRect.style.top = y + 'px';
  dragRect.style.width = w + 'px';
  dragRect.style.height = h + 'px';
}

function onDragEnd(e) {
  if (!isDragging) return;
  isDragging = false;
  if (dragRect) {
    const rect = {
      left: parseInt(dragRect.style.left),
      top: parseInt(dragRect.style.top),
      right: parseInt(dragRect.style.left) + parseInt(dragRect.style.width),
      bottom: parseInt(dragRect.style.top) + parseInt(dragRect.style.height),
    };
    dragRect.remove();
    dragRect = null;

    // Find wells within drag rectangle
    if (rect.right - rect.left > 5 || rect.bottom - rect.top > 5) {
      if (!e.ctrlKey && !e.metaKey) selectedWells.clear();
      const wells = plateContainer.querySelectorAll('.well');
      wells.forEach(well => {
        const wr = well.getBoundingClientRect();
        const cx = wr.left + wr.width / 2;
        const cy = wr.top + wr.height / 2;
        if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
          selectedWells.add(well.dataset.well);
        }
      });
      renderPlate();
      renderAnnoPanel();
    }
  }
}

// ============================================================
// Annotation panel
// ============================================================
function renderAnnoPanel() {
  if (selectedWells.size === 0) {
    annoPanel.innerHTML = `<p class="placeholder">Click a well to annotate.<br><br>
      <strong>Tips:</strong><br>
      Ctrl+Click to select multiple wells<br>
      Shift+Click to select a range<br>
      Click row/column headers to select entire rows/columns<br>
      Drag to select a rectangle<br>
      Ctrl+A to select all wells<br>
      Delete key to clear selected wells</p>`;
    return;
  }

  if (selectedWells.size === 1) {
    renderSingleWellPanel([...selectedWells][0]);
  } else {
    renderMultiWellPanel();
  }
}

function renderSingleWellPanel(wellId) {
  if (!annotations[wellId]) annotations[wellId] = [];
  const annos = annotations[wellId];
  let html = `<div class="well-header">Well ${wellId}</div>`;

  annos.forEach((a, i) => {
    html += buildAnnoRowHTML(a, i);
  });

  html += `<button id="btn-add-anno">+ Add annotation</button>`;
  annoPanel.innerHTML = html;
  wireAnnoEvents();
}

function renderMultiWellPanel() {
  const wells = [...selectedWells].sort(sortWellIds);
  let html = `<div class="multi-header">${wells.length} wells selected</div>`;
  html += `<div class="multi-note">${wells.join(', ')}</div>`;
  html += `<div class="multi-note">Add annotations below to apply to all selected wells:</div>`;

  // Show shared annotation rows for batch editing
  // Start with empty row for adding
  html += `<div id="batch-rows"></div>`;
  html += `<button id="btn-add-anno">+ Add annotation to all</button>`;
  annoPanel.innerHTML = html;

  document.getElementById('btn-add-anno').addEventListener('click', () => {
    const batchRows = document.getElementById('batch-rows');
    const idx = batchRows.children.length;
    const row = document.createElement('div');
    row.className = 'anno-row';
    row.innerHTML = `
      <div class="autocomplete-wrapper">
        <input type="text" placeholder="Key" data-batch-idx="${idx}" data-field="key">
      </div>
      <input type="text" placeholder="Value" data-batch-idx="${idx}" data-field="value">
      <button data-batch-idx="${idx}" class="btn-apply-batch">Apply</button>`;
    batchRows.appendChild(row);

    // Wire autocomplete on key input
    const keyInput = row.querySelector('[data-field="key"]');
    setupAutocomplete(keyInput);

    // Wire apply button
    row.querySelector('.btn-apply-batch').addEventListener('click', () => {
      const key = row.querySelector('[data-field="key"]').value.trim();
      const value = row.querySelector('[data-field="value"]').value.trim();
      if (!key) return;
      pushUndo();
      for (const wid of selectedWells) {
        if (!annotations[wid]) annotations[wid] = [];
        annotations[wid].push({ key, value });
      }
      row.remove();
      renderPlate();
      refreshCSVPreview();
      saveState();
      updateColorByOptions();
    });
  });
}

function buildAnnoRowHTML(a, i) {
  return `
    <div class="anno-row">
      <div class="autocomplete-wrapper">
        <input type="text" placeholder="Key" value="${escapeAttr(a.key)}" data-idx="${i}" data-field="key">
      </div>
      <div class="autocomplete-wrapper">
        <input type="text" placeholder="Value" value="${escapeAttr(a.value)}" data-idx="${i}" data-field="value">
      </div>
      <button data-idx="${i}" class="btn-del-anno">&times;</button>
    </div>`;
}

function wireAnnoEvents() {
  // Key inputs with autocomplete
  annoPanel.querySelectorAll('.autocomplete-wrapper input[data-field="key"]').forEach(inp => {
    inp.addEventListener('input', onAnnoInput);
    setupAutocomplete(inp);
  });
  // Value inputs with value autocomplete
  annoPanel.querySelectorAll('.autocomplete-wrapper input[data-field="value"]').forEach(inp => {
    inp.addEventListener('input', onAnnoInput);
    setupValueAutocomplete(inp);
  });
  annoPanel.querySelectorAll('.btn-del-anno').forEach(btn => {
    btn.addEventListener('click', onDeleteAnno);
  });
  const addBtn = document.getElementById('btn-add-anno');
  if (addBtn) addBtn.addEventListener('click', onAddAnno);
}

function onAnnoInput(e) {
  const wellId = [...selectedWells][0];
  const idx = parseInt(e.target.dataset.idx, 10);
  const field = e.target.dataset.field;
  if (!annotations[wellId] || !annotations[wellId][idx]) return;

  // Debounced undo push
  if (!onAnnoInput._timer) {
    pushUndo();
  }
  clearTimeout(onAnnoInput._timer);
  onAnnoInput._timer = setTimeout(() => { onAnnoInput._timer = null; }, 1000);

  annotations[wellId][idx][field] = e.target.value;
  refreshCSVPreview();
  updateWellVisual(wellId);
  saveState();
  if (field === 'key') updateColorByOptions();
}

function onDeleteAnno(e) {
  const wellId = [...selectedWells][0];
  const idx = parseInt(e.target.dataset.idx, 10);
  pushUndo();
  annotations[wellId].splice(idx, 1);
  if (annotations[wellId].length === 0) delete annotations[wellId];
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
}

function onAddAnno() {
  const wellId = [...selectedWells][0];
  if (!annotations[wellId]) annotations[wellId] = [];
  pushUndo();
  annotations[wellId].push({ key: '', value: '' });
  renderAnnoPanel();
  saveState();
  // Focus the new key input
  const inputs = annoPanel.querySelectorAll('.autocomplete-wrapper input[data-field="key"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

// Update a single well's badge/tooltip without full re-render
function updateWellVisual(wellId) {
  const el = plateContainer.querySelector(`[data-well="${wellId}"]`);
  if (!el) return;
  const annos = annotations[wellId];
  if (annos && annos.length > 0) {
    el.classList.add('has-anno');
    let badge = el.querySelector('.badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'badge';
      el.appendChild(badge);
    }
    badge.textContent = annos.length;
    el.title = wellId + '\n' + annos.map(a => (a.key || '?') + ' = ' + (a.value || '?')).join('\n');
  } else {
    el.classList.remove('has-anno');
    const badge = el.querySelector('.badge');
    if (badge) badge.remove();
    el.title = wellId;
  }
}

// ============================================================
// Autocomplete for annotation keys
// ============================================================
function getAllUsedKeys() {
  const keys = new Set(PRESET_KEYS);
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.key.trim()) keys.add(a.key.trim());
    }
  }
  return [...keys].sort();
}

function getAllUsedValues(forKey) {
  const vals = new Set();
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.value.trim() && (!forKey || a.key === forKey)) {
        vals.add(a.value.trim());
      }
    }
  }
  return [...vals].sort();
}

function setupAutocomplete(input) {
  let listEl = null;
  let activeIdx = -1;

  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('blur', () => setTimeout(hide, 150));
  input.addEventListener('keydown', (e) => {
    if (!listEl) return;
    const items = listEl.querySelectorAll('div');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      updateActive(items);
    } else if (e.key === 'Enter' && activeIdx >= 0 && items[activeIdx]) {
      e.preventDefault();
      input.value = items[activeIdx].textContent;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      hide();
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  function show() {
    hide();
    const val = input.value.trim().toLowerCase();
    const keys = getAllUsedKeys().filter(k => k.toLowerCase().includes(val) && k !== input.value.trim());
    if (keys.length === 0) return;
    listEl = document.createElement('div');
    listEl.className = 'autocomplete-list';
    activeIdx = -1;
    for (const k of keys) {
      const div = document.createElement('div');
      div.textContent = k;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = k;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        hide();
      });
      listEl.appendChild(div);
    }
    input.parentElement.appendChild(listEl);
  }

  function hide() {
    if (listEl) { listEl.remove(); listEl = null; }
  }

  function updateActive(items) {
    items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  }
}

function setupValueAutocomplete(input) {
  let listEl = null;
  let activeIdx = -1;

  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('blur', () => setTimeout(hide, 150));
  input.addEventListener('keydown', (e) => {
    if (!listEl) return;
    const items = listEl.querySelectorAll('div');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      updateActive(items);
    } else if (e.key === 'Enter' && activeIdx >= 0 && items[activeIdx]) {
      e.preventDefault();
      input.value = items[activeIdx].textContent;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      hide();
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  function show() {
    hide();
    const val = input.value.trim().toLowerCase();
    // Get the corresponding key for this value input
    const idx = parseInt(input.dataset.idx, 10);
    const wellId = selectedWells.size === 1 ? [...selectedWells][0] : null;
    const annoKey = wellId && annotations[wellId] && annotations[wellId][idx] ? annotations[wellId][idx].key : '';
    const values = getAllUsedValues(annoKey).filter(v => v.toLowerCase().includes(val) && v !== input.value.trim());
    if (values.length === 0) return;
    listEl = document.createElement('div');
    listEl.className = 'autocomplete-list';
    activeIdx = -1;
    for (const v of values) {
      const div = document.createElement('div');
      div.textContent = v;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = v;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        hide();
      });
      listEl.appendChild(div);
    }
    input.parentElement.appendChild(listEl);
  }

  function hide() {
    if (listEl) { listEl.remove(); listEl = null; }
  }

  function updateActive(items) {
    items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  }
}

// ============================================================
// Color-by feature
// ============================================================
function updateColorByOptions() {
  const keys = getAllUsedKeys();
  const current = colorBySelect.value;
  colorBySelect.innerHTML = '<option value="">None</option>';
  for (const k of keys) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === current) opt.selected = true;
    colorBySelect.appendChild(opt);
  }
  colorByKey = colorBySelect.value;
}

function onColorByChange() {
  colorByKey = colorBySelect.value;
  renderPlate();
}

function extractNumeric(str) {
  const m = str.match(/^[\s]*([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function heatmapColor(t) {
  // Blue (0) -> White (0.5) -> Red (1)
  let r, g, b;
  if (t <= 0.5) {
    const s = t * 2;
    r = Math.round(59 + s * (255 - 59));
    g = Math.round(130 + s * (255 - 130));
    b = Math.round(246 + s * (255 - 246));
  } else {
    const s = (t - 0.5) * 2;
    r = Math.round(255);
    g = Math.round(255 - s * (255 - 68));
    b = Math.round(255 - s * (255 - 68));
  }
  return `rgb(${r},${g},${b})`;
}

function buildColorMap() {
  if (!colorByKey) return null;

  // Collect all values for the key
  const wellValues = {};
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.key === colorByKey && a.value.trim()) {
        wellValues[wid] = a.value.trim();
      }
    }
  }

  // Check if values are numeric for heatmap
  const numericVals = {};
  let allNumeric = true;
  for (const [wid, val] of Object.entries(wellValues)) {
    const n = extractNumeric(val);
    if (n !== null) {
      numericVals[wid] = n;
    } else {
      allNumeric = false;
      break;
    }
  }

  const map = {};

  if (allNumeric && Object.keys(numericVals).length > 0) {
    // Heatmap mode
    const nums = Object.values(numericVals);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    const legend = {};
    for (const [wid, n] of Object.entries(numericVals)) {
      const t = (n - min) / range;
      map[wid] = heatmapColor(t);
    }
    // Create legend with min/mid/max
    legend[`${min} (min)`] = heatmapColor(0);
    if (range > 0) {
      legend[`${parseFloat(((min + max) / 2).toPrecision(4))} (mid)`] = heatmapColor(0.5);
      legend[`${max} (max)`] = heatmapColor(1);
    }
    map._legend = legend;
  } else {
    // Categorical mode
    const valueToColor = {};
    let colorIdx = 0;
    for (const [wid, val] of Object.entries(wellValues)) {
      if (!(val in valueToColor)) {
        valueToColor[val] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
        colorIdx++;
      }
      map[wid] = valueToColor[val];
    }
    map._legend = valueToColor;
  }

  return map;
}

function renderColorLegend(colorMap) {
  const legend = colorMap._legend;
  if (!legend || Object.keys(legend).length === 0) return;
  // Count wells per value
  const counts = {};
  for (const [wid, color] of Object.entries(colorMap)) {
    if (wid === '_legend') continue;
    for (const [val, c] of Object.entries(legend)) {
      if (c === color) { counts[val] = (counts[val] || 0) + 1; break; }
    }
  }
  const div = document.createElement('div');
  div.className = 'color-legend';
  for (const [val, color] of Object.entries(legend)) {
    const item = document.createElement('span');
    item.className = 'color-legend-item';
    const count = counts[val] || 0;
    item.innerHTML = `<span class="color-legend-swatch" style="background:${color}"></span>${escapeHTML(val)} <span class="legend-count">(${count})</span>`;
    div.appendChild(item);
  }
  plateContainer.appendChild(div);
}

// ============================================================
// Search / filter
// ============================================================
function onSearchInput() {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderPlate();
}

function getSearchMatches() {
  if (!searchQuery) return new Set();
  const matches = new Set();
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      if (wellId.toLowerCase().includes(searchQuery)) {
        matches.add(wellId);
        continue;
      }
      const annos = annotations[wellId];
      if (annos) {
        for (const a of annos) {
          if (a.key.toLowerCase().includes(searchQuery) || a.value.toLowerCase().includes(searchQuery)) {
            matches.add(wellId);
            break;
          }
        }
      }
    }
  }
  return matches;
}

// ============================================================
// Selection info
// ============================================================
function updateSelectionInfo() {
  if (selectedWells.size === 0) {
    selectionInfo.textContent = '';
  } else if (selectedWells.size === 1) {
    selectionInfo.textContent = `Selected: ${[...selectedWells][0]}`;
  } else {
    selectionInfo.textContent = `Selected: ${selectedWells.size} wells`;
  }
}

// ============================================================
// Copy / Paste
// ============================================================
function copyWells() {
  if (selectedWells.size === 0) return;
  clipboard = {};
  for (const wid of selectedWells) {
    if (annotations[wid] && annotations[wid].length > 0) {
      clipboard[wid] = JSON.parse(JSON.stringify(annotations[wid]));
    }
  }
  updateButtonStates();
  showToast(`Copied ${Object.keys(clipboard).length} well(s)`, 'info');
}

function pasteWells() {
  if (!clipboard || selectedWells.size === 0) return;
  pushUndo();
  const copiedAnnos = Object.values(clipboard);
  if (copiedAnnos.length === 0) return;

  if (copiedAnnos.length === 1) {
    // Paste same annotations to all selected wells
    const annos = copiedAnnos[0];
    for (const wid of selectedWells) {
      if (!annotations[wid]) annotations[wid] = [];
      annotations[wid].push(...JSON.parse(JSON.stringify(annos)));
    }
  } else {
    // Paste positionally: map copied well positions to selected well positions
    const copiedWells = Object.keys(clipboard).sort(sortWellIds);
    const targetWells = [...selectedWells].sort(sortWellIds);
    for (let i = 0; i < Math.min(copiedWells.length, targetWells.length); i++) {
      const annos = clipboard[copiedWells[i]];
      const target = targetWells[i];
      if (!annotations[target]) annotations[target] = [];
      annotations[target].push(...JSON.parse(JSON.stringify(annos)));
    }
  }

  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
  showToast(`Pasted to ${selectedWells.size} well(s)`, 'success');
}

// ============================================================
// Undo / Redo
// ============================================================
function pushUndo() {
  undoStack.push(JSON.stringify(annotations));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  updateButtonStates();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(annotations));
  annotations = JSON.parse(undoStack.pop());
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateButtonStates();
  updateColorByOptions();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(annotations));
  annotations = JSON.parse(redoStack.pop());
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateButtonStates();
  updateColorByOptions();
}

// ============================================================
// Format change
// ============================================================
function onFormatChange() {
  const hasData = Object.keys(annotations).length > 0;
  if (hasData && !confirm('Changing plate format will clear all annotations. Continue?')) {
    formatSelect.value = plateFormat;
    return;
  }
  pushUndo();
  plateFormat = parseInt(formatSelect.value, 10);
  annotations = {};
  selectedWells.clear();
  lastClickedWell = null;
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
}

// ============================================================
// CSV build / export / import
// ============================================================
function getAllPlateWellIds() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  const ids = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      ids.push(ROW_LETTERS[r] + c);
    }
  }
  return ids;
}

function buildCSV() {
  const lines = ['Well,Row,Column,AnnotationKey,AnnotationValue'];
  const includeEmpty = includeEmptyCheckbox.checked;
  const wellIds = includeEmpty ? getAllPlateWellIds() : Object.keys(annotations).sort(sortWellIds);
  for (const wellId of wellIds) {
    const annos = annotations[wellId] || [];
    const { row, col } = parseWellId(wellId);
    if (annos.length === 0 && includeEmpty) {
      lines.push([wellId, row, col, '', ''].join(','));
    } else {
      for (const anno of annos) {
        lines.push([wellId, row, col, csvEscape(anno.key), csvEscape(anno.value)].join(','));
      }
    }
  }
  return lines.join('\n');
}

function refreshCSVPreview() {
  const hasData = Object.keys(annotations).some(k => annotations[k].length > 0) || includeEmptyCheckbox.checked;
  if (currentView === 'wide') {
    csvPreview.textContent = hasData ? buildWideCSV() : 'No annotations yet.';
  } else if (currentView === 'csv') {
    csvPreview.textContent = hasData ? buildCSV() : 'No annotations yet.';
  }
  if (currentView === 'table') renderTableView();
  if (currentView === 'chart') {
    updateChartControls();
    renderChart();
  }
}

function buildWideCSV() {
  const annotatedIds = Object.keys(annotations).sort(sortWellIds);
  const includeEmpty = includeEmptyCheckbox.checked;
  // Collect all unique annotation keys
  const allKeys = new Set();
  for (const wid of annotatedIds) {
    for (const anno of annotations[wid]) {
      if (anno.key) allKeys.add(anno.key);
    }
  }
  const keyList = [...allKeys].sort();
  const header = ['Well', 'Row', 'Column', ...keyList.map(k => csvEscape(k))];
  const lines = [header.join(',')];
  const wellIds = includeEmpty ? getAllPlateWellIds() : annotatedIds;
  for (const wellId of wellIds) {
    const annos = annotations[wellId] || [];
    if (!includeEmpty && !annos.length) continue;
    const { row, col } = parseWellId(wellId);
    const valMap = {};
    for (const anno of annos) {
      if (anno.key) valMap[anno.key] = anno.value;
    }
    const vals = keyList.map(k => csvEscape(valMap[k] || ''));
    lines.push([wellId, row, col, ...vals].join(','));
  }
  return lines.join('\n');
}

function exportCSV() {
  const csv = buildCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = plateNameInput.value.trim() || `plate_${plateFormat}`;
  a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_annotations.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported', 'success');
}

function exportWideCSV() {
  const csv = buildWideCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = plateNameInput.value.trim() || `plate_${plateFormat}`;
  a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_wide.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Wide CSV exported', 'success');
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const text = ev.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) { alert('CSV file is empty or has no data rows.'); return; }

      const header = parseCSVLine(lines[0]);
      const wellIdx = header.findIndex(h => h.toLowerCase() === 'well');
      const keyIdx = header.findIndex(h => h.toLowerCase() === 'annotationkey');
      const valIdx = header.findIndex(h => h.toLowerCase() === 'annotationvalue');

      if (wellIdx === -1 || keyIdx === -1 || valIdx === -1) {
        alert('CSV must have columns: Well, AnnotationKey, AnnotationValue');
        return;
      }

      pushUndo();
      // Merge imported annotations with existing
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const well = cols[wellIdx];
        const key = cols[keyIdx] || '';
        const value = cols[valIdx] || '';
        if (!well) continue;
        if (!annotations[well]) annotations[well] = [];
        annotations[well].push({ key, value });
      }

      // Auto-detect plate format from wells
      autoDetectFormat();

      renderPlate();
      renderAnnoPanel();
      refreshCSVPreview();
      saveState();
      updateColorByOptions();
    } catch (err) {
      alert('Error parsing CSV: ' + err.message);
    }
  };
  reader.readAsText(file);
  fileImport.value = ''; // reset so same file can be re-imported
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function autoDetectFormat() {
  let maxRow = 0, maxCol = 0;
  for (const wid of Object.keys(annotations)) {
    const p = parseWellId(wid);
    const r = ROW_LETTERS.indexOf(p.row);
    const c = parseInt(p.col, 10);
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }
  // Find smallest format that fits
  for (const [fmt, spec] of Object.entries(PLATE_FORMATS)) {
    if (spec.rows > maxRow && spec.cols >= maxCol) {
      plateFormat = parseInt(fmt, 10);
      formatSelect.value = plateFormat;
      return;
    }
  }
  // Default to 384 if nothing fits
  plateFormat = 384;
  formatSelect.value = 384;
}

// ============================================================
// Clear all
// ============================================================
function clearAll() {
  if (Object.keys(annotations).length === 0) return;
  if (!confirm('Clear all annotations?')) return;
  pushUndo();
  annotations = {};
  selectedWells.clear();
  lastClickedWell = null;
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
}

// ============================================================
// LocalStorage persistence
// ============================================================
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      plateFormat,
      annotations,
      plateName: plateNameInput.value,
    }));
  } catch (e) { /* storage full or unavailable */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.plateFormat && PLATE_FORMATS[state.plateFormat]) {
      plateFormat = state.plateFormat;
      formatSelect.value = plateFormat;
    }
    if (state.annotations) {
      annotations = state.annotations;
    }
    if (state.plateName) {
      plateNameInput.value = state.plateName;
    }
  } catch (e) { /* corrupted state, ignore */ }
}

// ============================================================
// Button state management
// ============================================================
function updateButtonStates() {
  btnUndo.disabled = undoStack.length === 0;
  btnRedo.disabled = redoStack.length === 0;
  btnCopy.disabled = selectedWells.size === 0;
  btnPaste.disabled = !clipboard || selectedWells.size === 0;
}

// ============================================================
// Helpers
// ============================================================
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function csvEscape(s) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseWellId(wellId) {
  const match = wellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: wellId[0], col: wellId.slice(1) };
  return { row: match[1], col: match[2] };
}

function sortWellIds(a, b) {
  const pa = parseWellId(a), pb = parseWellId(b);
  const ra = ROW_LETTERS.indexOf(pa.row), rb = ROW_LETTERS.indexOf(pb.row);
  const ca = parseInt(pa.col, 10), cb = parseInt(pb.col, 10);
  if (ra !== rb) return ra - rb;
  return ca - cb;
}

// ============================================================
// Context menu
// ============================================================
function onWellContextMenu(wellId, e) {
  e.preventDefault();
  contextWell = wellId;
  if (!selectedWells.has(wellId)) {
    selectedWells.clear();
    selectedWells.add(wellId);
    renderPlate();
    renderAnnoPanel();
  }
  contextMenu.style.display = 'block';
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  // Keep menu in viewport
  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) contextMenu.style.left = (e.clientX - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) contextMenu.style.top = (e.clientY - rect.height) + 'px';
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
}

function onContextAction(action) {
  switch (action) {
    case 'annotate':
      renderAnnoPanel();
      break;
    case 'copy':
      copyWells();
      break;
    case 'paste':
      pasteWells();
      break;
    case 'fill-right':
      fillRight();
      break;
    case 'fill-down':
      fillDown();
      break;
    case 'dilution-series':
      showDilutionModal();
      break;
    case 'assign-replicates':
      assignReplicates();
      break;
    case 'select-row':
      if (contextWell) { const p = parseWellId(contextWell); selectRow(p.row, { ctrlKey: false, metaKey: false }); }
      break;
    case 'select-col':
      if (contextWell) { const p = parseWellId(contextWell); selectColumn(parseInt(p.col, 10), { ctrlKey: false, metaKey: false }); }
      break;
    case 'select-all':
      selectAllWells();
      break;
    case 'invert-selection':
      invertSelection();
      break;
    case 'select-same':
      selectSameAnnotations();
      break;
    case 'select-empty':
      selectByAnnotationState(false);
      break;
    case 'select-annotated':
      selectByAnnotationState(true);
      break;
    case 'clear-selected':
      if (selectedWells.size > 0) {
        pushUndo();
        for (const wid of selectedWells) delete annotations[wid];
        renderPlate();
        renderAnnoPanel();
        refreshCSVPreview();
        saveState();
      }
      break;
  }
}

// ============================================================
// Fill right / Fill down
// ============================================================
function fillRight() {
  if (selectedWells.size === 0) return;
  const wells = [...selectedWells].sort(sortWellIds);
  // Use the leftmost well's annotations as the source
  const source = wells[0];
  if (!annotations[source] || annotations[source].length === 0) return;

  pushUndo();
  const sp = parseWellId(source);
  const sourceRowIdx = ROW_LETTERS.indexOf(sp.row);
  const sourceCol = parseInt(sp.col, 10);
  const { cols } = PLATE_FORMATS[plateFormat];

  for (let c = sourceCol + 1; c <= cols; c++) {
    const targetId = ROW_LETTERS[sourceRowIdx] + c;
    if (!annotations[targetId]) annotations[targetId] = [];
    for (const a of annotations[source]) {
      annotations[targetId].push({ key: a.key, value: a.value });
    }
  }

  renderPlate();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
}

function fillDown() {
  if (selectedWells.size === 0) return;
  const wells = [...selectedWells].sort(sortWellIds);
  const source = wells[0];
  if (!annotations[source] || annotations[source].length === 0) return;

  pushUndo();
  const spd = parseWellId(source);
  const sourceRowIdx = ROW_LETTERS.indexOf(spd.row);
  const sourceCol = parseInt(spd.col, 10);
  const { rows } = PLATE_FORMATS[plateFormat];

  for (let r = sourceRowIdx + 1; r < rows; r++) {
    const targetId = ROW_LETTERS[r] + sourceCol;
    if (!annotations[targetId]) annotations[targetId] = [];
    for (const a of annotations[source]) {
      annotations[targetId].push({ key: a.key, value: a.value });
    }
  }

  renderPlate();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
}

// ============================================================
// Statistics
// ============================================================
function updateStats() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  const totalWells = rows * cols;
  const annotatedWells = Object.keys(annotations).filter(k => annotations[k].length > 0).length;
  const totalAnnotations = Object.values(annotations).reduce((sum, a) => sum + a.length, 0);
  // Only show keys actually used in annotations (not presets)
  const usedKeys = new Set();
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.key.trim()) usedKeys.add(a.key.trim());
    }
  }
  const keyList = [...usedKeys].sort();

  let html = `
    <span class="stat"><span class="stat-label">Wells:</span> ${annotatedWells}/${totalWells}</span>
    <span class="stat"><span class="stat-label">Annotations:</span> ${totalAnnotations}</span>`;
  if (selectedWells.size > 0) {
    html += `<span class="stat"><span class="stat-label">Selected:</span> ${selectedWells.size}</span>`;
  }
  html += `<span class="stat"><span class="stat-label">Keys:</span> ${keyList.length}`;
  if (keyList.length > 0 && keyList.length <= 8) {
    html += ` (${keyList.join(', ')})`;
  }
  html += '</span>';
  statsBar.innerHTML = html;
}

// ============================================================
// JSON save / load project
// ============================================================
function saveProject() {
  const project = {
    version: 1,
    plateFormat,
    annotations,
    plateName: plateNameInput.value,
    timestamp: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const pname = plateNameInput.value.trim() || `plate_${plateFormat}`;
  a.download = `${pname.replace(/[^a-zA-Z0-9_-]/g, '_')}_project.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Project saved', 'success');
}

function loadProject(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const project = JSON.parse(ev.target.result);
      if (!project.annotations) { alert('Invalid project file.'); return; }
      pushUndo();
      if (project.plateFormat && PLATE_FORMATS[project.plateFormat]) {
        plateFormat = project.plateFormat;
        formatSelect.value = plateFormat;
      }
      annotations = project.annotations;
      if (project.plateName) plateNameInput.value = project.plateName;
      selectedWells.clear();
      lastClickedWell = null;
      renderPlate();
      renderAnnoPanel();
      refreshCSVPreview();
      saveState();
      updateColorByOptions();
      showToast('Project loaded', 'success');
    } catch (err) {
      showToast('Error loading project: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  fileLoad.value = '';
}

// ============================================================
// Plate templates
// ============================================================
function onTemplateSelect() {
  const tmpl = templateSelect.value;
  if (!tmpl) return;
  const hasData = Object.keys(annotations).length > 0;
  if (hasData && !confirm('Loading a template will clear current annotations. Continue?')) {
    templateSelect.value = '';
    return;
  }
  pushUndo();
  annotations = {};
  selectedWells.clear();

  const { rows, cols } = PLATE_FORMATS[plateFormat];

  switch (tmpl) {
    case 'serial-dilution':
      templateSerialDilution(rows, cols);
      break;
    case 'dose-response':
      templateDoseResponse(rows, cols);
      break;
    case 'controls-border':
      templateControlsBorder(rows, cols);
      break;
    case 'quadrant':
      templateQuadrant(rows, cols);
      break;
    case 'checkerboard':
      templateCheckerboard(rows, cols);
      break;
  }

  templateSelect.value = '';
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
}

function templateSerialDilution(rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      annotations[wellId] = [
        { key: 'Sample', value: 'Sample_' + ROW_LETTERS[r] },
        { key: 'Dilution', value: '1:' + Math.pow(2, c - 1) },
      ];
    }
  }
}

function templateDoseResponse(rows, cols) {
  const doses = [];
  for (let c = 0; c < cols; c++) {
    doses.push((100 / Math.pow(3, c)).toFixed(2));
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      annotations[wellId] = [
        { key: 'Compound', value: 'Compound_' + ROW_LETTERS[r] },
        { key: 'Concentration_uM', value: doses[c - 1] },
      ];
    }
  }
}

function templateControlsBorder(rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      const isBorder = r === 0 || r === rows - 1 || c === 1 || c === cols;
      annotations[wellId] = [
        { key: 'Type', value: isBorder ? 'Control' : 'Sample' },
      ];
      if (isBorder) {
        annotations[wellId].push({ key: 'Control_Type', value: (c <= cols / 2) ? 'Positive' : 'Negative' });
      }
    }
  }
}

function templateQuadrant(rows, cols) {
  const midR = Math.floor(rows / 2);
  const midC = Math.floor(cols / 2);
  const quadrants = ['Q1_TopLeft', 'Q2_TopRight', 'Q3_BottomLeft', 'Q4_BottomRight'];
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      const qi = (r < midR ? 0 : 2) + (c <= midC ? 0 : 1);
      annotations[wellId] = [
        { key: 'Quadrant', value: quadrants[qi] },
      ];
    }
  }
}

function templateCheckerboard(rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      const isEven = (r + c) % 2 === 0;
      annotations[wellId] = [
        { key: 'Group', value: isEven ? 'Group_A' : 'Group_B' },
      ];
    }
  }
}

// ============================================================
// Dilution series
// ============================================================
const dilutionModal = document.getElementById('dilution-modal');
const dilClose = document.getElementById('dilution-close');
const dilKey = document.getElementById('dil-key');
const dilStart = document.getElementById('dil-start');
const dilFactor = document.getElementById('dil-factor');
const dilUnit = document.getElementById('dil-unit');
const dilDirection = document.getElementById('dil-direction');
const dilPreview = document.getElementById('dil-preview');
const dilApply = document.getElementById('dil-apply');

dilClose.addEventListener('click', () => { dilutionModal.style.display = 'none'; });
dilutionModal.addEventListener('click', (e) => { if (e.target === dilutionModal) dilutionModal.style.display = 'none'; });
[dilStart, dilFactor, dilUnit].forEach(el => el.addEventListener('input', updateDilPreview));
dilApply.addEventListener('click', applyDilutionSeries);

function showDilutionModal() {
  if (selectedWells.size < 2) {
    showToast('Select at least 2 wells for a dilution series', 'error');
    return;
  }
  dilutionModal.style.display = '';
  updateDilPreview();
}

function updateDilPreview() {
  const start = parseFloat(dilStart.value) || 0;
  const factor = parseFloat(dilFactor.value) || 2;
  const unit = dilUnit.value.trim();
  const count = Math.min(selectedWells.size, 8);
  const vals = [];
  for (let i = 0; i < count; i++) {
    const v = start / Math.pow(factor, i);
    vals.push(Number.isInteger(v) ? v : v.toPrecision(4));
  }
  dilPreview.textContent = `Preview: ${vals.join(', ')}${selectedWells.size > 8 ? '...' : ''}${unit ? ' ' + unit : ''}`;
}

function applyDilutionSeries() {
  const key = dilKey.value.trim() || 'Concentration';
  const start = parseFloat(dilStart.value) || 100;
  const factor = parseFloat(dilFactor.value) || 2;
  const unit = dilUnit.value.trim();
  const dir = dilDirection.value;

  // Sort wells by direction
  const wells = [...selectedWells].sort((a, b) => {
    const pa = parseWellId(a), pb = parseWellId(b);
    if (dir === 'right') {
      const rd = ROW_LETTERS.indexOf(pa.row) - ROW_LETTERS.indexOf(pb.row);
      return rd !== 0 ? rd : parseInt(pa.col) - parseInt(pb.col);
    } else {
      const cd = parseInt(pa.col) - parseInt(pb.col);
      return cd !== 0 ? cd : ROW_LETTERS.indexOf(pa.row) - ROW_LETTERS.indexOf(pb.row);
    }
  });

  pushUndo();
  for (let i = 0; i < wells.length; i++) {
    const val = start / Math.pow(factor, i);
    const formatted = (Number.isInteger(val) ? val : parseFloat(val.toPrecision(4))) + (unit ? ' ' + unit : '');
    if (!annotations[wells[i]]) annotations[wells[i]] = [];
    // Remove existing annotation with same key
    annotations[wells[i]] = annotations[wells[i]].filter(a => a.key !== key);
    annotations[wells[i]].push({ key, value: formatted });
  }

  dilutionModal.style.display = 'none';
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
  showToast(`Dilution series applied to ${wells.length} wells`, 'success');
}

// ============================================================
// Assign replicates
// ============================================================
function assignReplicates() {
  if (selectedWells.size === 0) {
    showToast('Select wells first', 'error');
    return;
  }
  const wells = [...selectedWells].sort(sortWellIds);
  pushUndo();
  for (let i = 0; i < wells.length; i++) {
    if (!annotations[wells[i]]) annotations[wells[i]] = [];
    annotations[wells[i]] = annotations[wells[i]].filter(a => a.key !== 'Replicate');
    annotations[wells[i]].push({ key: 'Replicate', value: String(i + 1) });
  }
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  updateColorByOptions();
  showToast(`Replicates 1-${wells.length} assigned`, 'success');
}

// ============================================================
// Plate transforms (rotate / mirror)
// ============================================================
function rotatePlate90() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  if (rows !== cols && rows !== cols) {
    // Rotation maps (r,c) -> (c, rows-1-r) but well IDs stay within same plate dimensions
  }
  pushUndo();
  const newAnnos = {};
  for (const wid of Object.keys(annotations)) {
    if (!annotations[wid].length) continue;
    const { row, col } = parseWellId(wid);
    const rIdx = ROW_LETTERS.indexOf(row);
    const cIdx = parseInt(col, 10) - 1;
    // 90° clockwise: new position = (cIdx, rows-1-rIdx)
    const newR = cIdx;
    const newC = (rows - 1 - rIdx);
    if (newR < rows && newC < cols) {
      const newWell = ROW_LETTERS[newR] + (newC + 1);
      newAnnos[newWell] = JSON.parse(JSON.stringify(annotations[wid]));
    }
  }
  annotations = newAnnos;
  selectedWells.clear();
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  showToast('Rotated 90° clockwise', 'success');
}

function mirrorPlateH() {
  const { cols } = PLATE_FORMATS[plateFormat];
  pushUndo();
  const newAnnos = {};
  for (const wid of Object.keys(annotations)) {
    if (!annotations[wid].length) continue;
    const { row, col } = parseWellId(wid);
    const cIdx = parseInt(col, 10);
    const newC = cols + 1 - cIdx;
    const newWell = row + newC;
    newAnnos[newWell] = JSON.parse(JSON.stringify(annotations[wid]));
  }
  annotations = newAnnos;
  selectedWells.clear();
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  showToast('Mirrored horizontally', 'success');
}

function mirrorPlateV() {
  const { rows } = PLATE_FORMATS[plateFormat];
  pushUndo();
  const newAnnos = {};
  for (const wid of Object.keys(annotations)) {
    if (!annotations[wid].length) continue;
    const { row, col } = parseWellId(wid);
    const rIdx = ROW_LETTERS.indexOf(row);
    const newR = rows - 1 - rIdx;
    const newWell = ROW_LETTERS[newR] + col;
    newAnnos[newWell] = JSON.parse(JSON.stringify(annotations[wid]));
  }
  annotations = newAnnos;
  selectedWells.clear();
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
  saveState();
  showToast('Mirrored vertically', 'success');
}

// ============================================================
// Dark mode
// ============================================================
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('plateAnno_dark', isDark ? '1' : '0');
  showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

// ============================================================
// Toast notifications
// ============================================================
function showToast(message, type = 'info', duration = 2500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// Table view
// ============================================================
function switchView(view) {
  currentView = view;
  btnViewCSV.classList.toggle('active', view === 'csv');
  btnViewWide.classList.toggle('active', view === 'wide');
  btnViewTable.classList.toggle('active', view === 'table');
  btnViewChart.classList.toggle('active', view === 'chart');
  csvPreview.style.display = (view === 'csv' || view === 'wide') ? '' : 'none';
  tableView.style.display = view === 'table' ? '' : 'none';
  chartView.style.display = view === 'chart' ? '' : 'none';
  if (view === 'table') renderTableView();
  if (view === 'chart') {
    updateChartControls();
    renderChart();
  }
  refreshCSVPreview();
}

function renderTableView() {
  const wellIds = Object.keys(annotations).sort(sortWellIds);
  if (wellIds.length === 0 || !wellIds.some(k => annotations[k].length > 0)) {
    tableView.innerHTML = '<p style="color:#999;font-style:italic;font-size:0.85rem">No annotations yet.</p>';
    return;
  }

  let html = '<table><thead><tr><th>Well</th><th>Row</th><th>Column</th><th>Key</th><th>Value</th></tr></thead><tbody>';
  for (const wellId of wellIds) {
    const { row, col } = parseWellId(wellId);
    for (const anno of annotations[wellId]) {
      html += `<tr><td>${escapeHTML(wellId)}</td><td>${escapeHTML(row)}</td><td>${col}</td><td>${escapeHTML(anno.key)}</td><td>${escapeHTML(anno.value)}</td></tr>`;
    }
  }
  html += '</tbody></table>';
  tableView.innerHTML = html;
}

// ============================================================
// Range input (e.g. "A1:C6", "A1,B2,C3", "A1:C6,D1:D12")
// ============================================================
function onRangeInputKey(e) {
  if (e.key !== 'Enter') return;
  const input = rangeInput.value.trim().toUpperCase();
  if (!input) return;

  selectedWells.clear();
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes(':')) {
      const [from, to] = part.split(':').map(s => s.trim());
      if (from && to) {
        const range = getWellRange(from, to);
        for (const w of range) selectedWells.add(w);
      }
    } else {
      selectedWells.add(part);
    }
  }

  if (selectedWells.size > 0) {
    lastClickedWell = [...selectedWells][0];
    showToast(`Selected ${selectedWells.size} well(s)`, 'info');
  }
  rangeInput.value = '';
  renderPlate();
  renderAnnoPanel();
}

// ============================================================
// Double-click to quick-annotate
// ============================================================
function onWellDoubleClick(wellId, e) {
  e.preventDefault();
  selectedWells.clear();
  selectedWells.add(wellId);
  lastClickedWell = wellId;
  if (!annotations[wellId]) annotations[wellId] = [];
  if (annotations[wellId].length === 0) {
    pushUndo();
    annotations[wellId].push({ key: '', value: '' });
  }
  renderPlate();
  renderAnnoPanel();
  // Focus the first empty key input
  setTimeout(() => {
    const inputs = annoPanel.querySelectorAll('.autocomplete-wrapper input[data-field="key"]');
    for (const inp of inputs) {
      if (!inp.value) { inp.focus(); return; }
    }
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 50);
}

// ============================================================
// Select wells with same annotations
// ============================================================
function selectSameAnnotations() {
  if (!contextWell || !annotations[contextWell] || annotations[contextWell].length === 0) return;
  const sourceAnnos = annotations[contextWell];
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  selectedWells.clear();

  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const wellId = ROW_LETTERS[r] + c;
      const annos = annotations[wellId];
      if (!annos) continue;
      // Check if this well has all the same key-value pairs
      const matches = sourceAnnos.every(sa =>
        annos.some(a => a.key === sa.key && a.value === sa.value)
      );
      if (matches) selectedWells.add(wellId);
    }
  }

  showToast(`Selected ${selectedWells.size} well(s) with matching annotations`, 'info');
  renderPlate();
  renderAnnoPanel();
}

// ============================================================
// Hover tooltip
// ============================================================
function showHoverTooltip(wellId, e) {
  const annos = annotations[wellId];
  let html = `<div class="tt-well">${escapeHTML(wellId)}</div>`;
  if (annos && annos.length > 0) {
    for (const a of annos) {
      html += `<div class="tt-anno"><span class="tt-key">${escapeHTML(a.key || '?')}</span> = ${escapeHTML(a.value || '?')}</div>`;
    }
  } else {
    html += '<div class="tt-anno" style="opacity:0.5">No annotations</div>';
  }
  hoverTooltip.innerHTML = html;
  hoverTooltip.style.display = 'block';
  positionTooltip(e);
}

function positionTooltip(e) {
  const x = e.clientX + 12;
  const y = e.clientY + 12;
  hoverTooltip.style.left = x + 'px';
  hoverTooltip.style.top = y + 'px';
  // Adjust if offscreen
  const rect = hoverTooltip.getBoundingClientRect();
  if (rect.right > window.innerWidth) hoverTooltip.style.left = (e.clientX - rect.width - 8) + 'px';
  if (rect.bottom > window.innerHeight) hoverTooltip.style.top = (e.clientY - rect.height - 8) + 'px';
}

function hideHoverTooltip() {
  hoverTooltip.style.display = 'none';
}

// ============================================================
// Chart functions
// ============================================================

function onChartControlChange() {
  chartType = chartTypeSelect.value;
  chartXAxis = chartXAxisSelect.value;
  chartYAxis = chartYAxisSelect.value;
  chartGroup1 = chartGroup1Select.value;
  chartGroup2 = chartGroup2Select.value;
  chartGroup3 = chartGroup3Select.value;
  chartAggregation = chartAggregationSelect.value;
  chartTheme = chartThemeSelect.value;
  chartErrorBars = chartErrorBarsSelect.value;
  if (currentView === 'chart') renderChart();
}

function updateChartControls() {
  const keys = getAllUsedKeys().filter(k => !PRESET_KEYS.includes(k) || Object.values(annotations).some(annos => annos.some(a => a.key === k)));
  const actualKeys = [];
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.key.trim() && !actualKeys.includes(a.key.trim())) {
        actualKeys.push(a.key.trim());
      }
    }
  }
  actualKeys.sort();

  // Update X-axis select
  const currentX = chartXAxisSelect.value;
  chartXAxisSelect.innerHTML = '<option value="">(Select key)</option>';
  for (const k of actualKeys) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === currentX) opt.selected = true;
    chartXAxisSelect.appendChild(opt);
  }

  // Update Y-axis select (count + numeric keys)
  const currentY = chartYAxisSelect.value;
  chartYAxisSelect.innerHTML = '<option value="_count">Count</option>';
  for (const k of actualKeys) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === currentY) opt.selected = true;
    chartYAxisSelect.appendChild(opt);
  }

  // Update group selects
  [chartGroup1Select, chartGroup2Select, chartGroup3Select].forEach((sel, idx) => {
    const current = sel.value;
    sel.innerHTML = '<option value="">(none)</option>';
    for (const k of actualKeys) {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      if (k === current) opt.selected = true;
      sel.appendChild(opt);
    }
  });

  // Sync state from selects
  chartXAxis = chartXAxisSelect.value;
  chartYAxis = chartYAxisSelect.value;
  chartGroup1 = chartGroup1Select.value;
  chartGroup2 = chartGroup2Select.value;
  chartGroup3 = chartGroup3Select.value;
}

function getChartData(source) {
  const wellIds = source === 'selection' && selectedWells.size > 0
    ? [...selectedWells]
    : Object.keys(annotations);

  return wellIds.flatMap(wellId => {
    if (!annotations[wellId]?.length) return [];
    const row = { well: wellId };
    for (const { key, value } of annotations[wellId]) {
      if (key) row[key] = value;
    }
    return [row];
  });
}

function extractNumericForChart(str) {
  if (str === undefined || str === null || str === '') return null;
  const s = String(str);
  const m = s.match(/^[\s]*([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function aggregate(values, method) {
  if (values.length === 0) return 0;
  switch (method) {
    case 'count': return values.length;
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'mean': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return values.length;
  }
}

function groupData(data, xKey, groupKeys, valueKey, aggregation) {
  if (!xKey) return [];

  const groups = {};
  for (const row of data) {
    const xVal = row[xKey] || 'N/A';
    const groupVals = groupKeys.filter(Boolean).map(k => row[k] || 'N/A');
    const groupKey = groupVals.length > 0 ? groupVals.join('|') : '_all';
    const fullKey = `${xVal}|||${groupKey}`;

    if (!groups[fullKey]) {
      groups[fullKey] = {
        x: xVal,
        groupLabels: groupVals,
        groupKey,
        values: []
      };
    }

    if (valueKey === '_count') {
      groups[fullKey].values.push(1);
    } else {
      const num = extractNumericForChart(row[valueKey]);
      if (num !== null) groups[fullKey].values.push(num);
    }
  }

  return Object.values(groups).map(g => {
    const values = g.values;
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const variance = values.length > 1
      ? values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1)
      : 0;
    const sd = Math.sqrt(variance);
    const sem = values.length > 0 ? sd / Math.sqrt(values.length) : 0;

    return {
      x: g.x,
      groupLabels: g.groupLabels,
      groupKey: g.groupKey,
      value: aggregate(values, aggregation),
      rawValues: values,
      mean,
      sd,
      sem,
      n: values.length
    };
  });
}

function getThemeColors(count) {
  const palette = chartTheme === 'custom'
    ? customChartColors
    : (CHART_COLOR_THEMES[chartTheme] || CHART_COLOR_THEMES.default);
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
}

function renderChart() {
  if (typeof Plotly === 'undefined') {
    chartContainer.innerHTML = '<div class="chart-empty-message">Plotly.js is loading...</div>';
    return;
  }

  const data = getChartData(chartDataSource);

  if (data.length === 0) {
    chartContainer.innerHTML = '<div class="chart-empty-message">No data to visualize. Add annotations to wells first.</div>';
    return;
  }

  if (!chartXAxis) {
    chartContainer.innerHTML = '<div class="chart-empty-message">Select an X-Axis key to create a chart.</div>';
    return;
  }

  const groupKeys = [chartGroup1, chartGroup2, chartGroup3].filter(Boolean);
  const grouped = groupData(data, chartXAxis, groupKeys, chartYAxis, chartAggregation);

  if (grouped.length === 0) {
    chartContainer.innerHTML = '<div class="chart-empty-message">No data matches the current configuration.</div>';
    return;
  }

  const isDark = document.body.classList.contains('dark');

  // Calculate legend position based on number of groups
  const uniqueGroups = [...new Set(grouped.map(g => g.groupKey))];
  const hasLegend = groupKeys.length > 0 || chartType === 'pie';
  const manyLegendItems = uniqueGroups.length > 4;

  const layout = {
    title: '',
    paper_bgcolor: isDark ? '#1e293b' : '#fff',
    plot_bgcolor: isDark ? '#1e293b' : '#fff',
    font: { color: isDark ? '#e0e0e0' : '#333', size: 12 },
    margin: { t: 30, r: manyLegendItems ? 120 : 30, b: hasLegend && !manyLegendItems ? 80 : 20, l: 20 },
    autosize: true,
    showlegend: hasLegend,
    legend: manyLegendItems ? {
      orientation: 'v',
      x: 1.02,
      xanchor: 'left',
      y: 1,
      yanchor: 'top',
      bgcolor: 'rgba(0,0,0,0)',
      font: { size: 11 }
    } : {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.35,
      yanchor: 'top',
      bgcolor: 'rgba(0,0,0,0)',
      font: { size: 11 }
    },
    xaxis: {
      title: { text: chartXAxis, standoff: 15 },
      tickangle: -45,
      automargin: true,
      gridcolor: isDark ? '#334155' : '#e5e7eb',
      linecolor: isDark ? '#475569' : '#ccc'
    },
    yaxis: {
      title: { text: chartYAxis === '_count' ? 'Count' : `${chartYAxis} (${chartAggregation})`, standoff: 10 },
      automargin: true,
      gridcolor: isDark ? '#334155' : '#e5e7eb',
      linecolor: isDark ? '#475569' : '#ccc'
    }
  };

  let traces = [];

  switch (chartType) {
    case 'bar':
    case 'line':
      traces = buildBarOrLineTraces(grouped, groupKeys, chartType);
      if (chartType === 'bar') {
        layout.barmode = groupKeys.length > 0 ? 'group' : 'relative';
      }
      break;
    case 'scatter':
      traces = buildScatterTrace(data);
      break;
    case 'box':
      traces = buildBoxTraces(data, groupKeys);
      break;
    case 'violin':
      traces = buildViolinTraces(data, groupKeys);
      break;
    case 'heatmap':
      traces = buildHeatmapTrace(grouped);
      break;
    case 'pie':
      traces = buildPieTrace(grouped);
      layout.showlegend = true;
      // Pie charts always need legend on the right for clarity
      layout.legend = {
        orientation: 'v',
        x: 1.02,
        xanchor: 'left',
        y: 0.5,
        yanchor: 'middle',
        bgcolor: 'rgba(0,0,0,0)',
        font: { size: 11 }
      };
      layout.margin.r = 120;
      break;
  }

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'svg',
      filename: 'plate_chart',
      height: 600,
      width: 800,
      scale: 2
    }
  };

  Plotly.newPlot(chartContainer, traces, layout, config);
}

function buildBarOrLineTraces(grouped, groupKeys, type) {
  const traces = [];

  if (groupKeys.length === 0) {
    // Simple bar/line chart
    const xVals = [...new Set(grouped.map(g => g.x))];
    const yVals = xVals.map(x => {
      const match = grouped.find(g => g.x === x);
      return match ? match.value : 0;
    });
    const colors = getThemeColors(xVals.length);

    const trace = {
      x: xVals,
      y: yVals,
      type: type === 'line' ? 'scatter' : 'bar',
      mode: type === 'line' ? 'lines+markers' : undefined,
      marker: { color: type === 'bar' ? colors : colors[0] },
      line: type === 'line' ? { color: colors[0] } : undefined,
      name: ''
    };

    // Add error bars
    if (chartErrorBars !== 'none' && chartAggregation === 'mean') {
      const errors = xVals.map(x => {
        const match = grouped.find(g => g.x === x);
        return match ? (chartErrorBars === 'sd' ? match.sd : match.sem) : 0;
      });
      trace.error_y = {
        type: 'data',
        array: errors,
        visible: true
      };
    }

    traces.push(trace);
  } else {
    // Grouped bar/line chart
    const uniqueGroups = [...new Set(grouped.map(g => g.groupKey))];
    const xVals = [...new Set(grouped.map(g => g.x))];
    const colors = getThemeColors(uniqueGroups.length);

    uniqueGroups.forEach((groupKey, idx) => {
      const groupData = grouped.filter(g => g.groupKey === groupKey);
      const yVals = xVals.map(x => {
        const match = groupData.find(g => g.x === x);
        return match ? match.value : 0;
      });

      const trace = {
        x: xVals,
        y: yVals,
        type: type === 'line' ? 'scatter' : 'bar',
        mode: type === 'line' ? 'lines+markers' : undefined,
        name: groupKey.replace(/\|/g, ', '),
        marker: { color: colors[idx] },
        line: type === 'line' ? { color: colors[idx] } : undefined
      };

      // Add error bars
      if (chartErrorBars !== 'none' && chartAggregation === 'mean') {
        const errors = xVals.map(x => {
          const match = groupData.find(g => g.x === x);
          return match ? (chartErrorBars === 'sd' ? match.sd : match.sem) : 0;
        });
        trace.error_y = {
          type: 'data',
          array: errors,
          visible: true
        };
      }

      traces.push(trace);
    });
  }

  return traces;
}

function buildScatterTrace(data) {
  if (!chartXAxis || !chartYAxis || chartYAxis === '_count') {
    return [{
      x: [],
      y: [],
      mode: 'markers',
      type: 'scatter',
      text: []
    }];
  }

  const points = data.map(row => ({
    x: extractNumericForChart(row[chartXAxis]),
    y: extractNumericForChart(row[chartYAxis]),
    well: row.well,
    group: chartGroup1 ? row[chartGroup1] : null
  })).filter(p => p.x !== null && p.y !== null);

  if (chartGroup1) {
    const groups = [...new Set(points.map(p => p.group || 'N/A'))];
    const colors = getThemeColors(groups.length);

    return groups.map((group, idx) => ({
      x: points.filter(p => (p.group || 'N/A') === group).map(p => p.x),
      y: points.filter(p => (p.group || 'N/A') === group).map(p => p.y),
      mode: 'markers',
      type: 'scatter',
      name: group,
      marker: { color: colors[idx], size: 8 },
      text: points.filter(p => (p.group || 'N/A') === group).map(p => p.well)
    }));
  }

  const colors = getThemeColors(1);
  return [{
    x: points.map(p => p.x),
    y: points.map(p => p.y),
    mode: 'markers',
    type: 'scatter',
    marker: { color: colors[0], size: 8 },
    text: points.map(p => p.well)
  }];
}

function buildBoxTraces(data, groupKeys) {
  if (!chartXAxis) return [];

  const xVals = [...new Set(data.map(row => row[chartXAxis] || 'N/A'))];

  if (groupKeys.length === 0) {
    const colors = getThemeColors(xVals.length);
    return xVals.map((xVal, idx) => {
      const yVals = data
        .filter(row => (row[chartXAxis] || 'N/A') === xVal)
        .map(row => chartYAxis === '_count' ? 1 : extractNumericForChart(row[chartYAxis]))
        .filter(v => v !== null);

      return {
        y: yVals,
        type: 'box',
        name: xVal,
        marker: { color: colors[idx] },
        boxpoints: 'outliers'
      };
    });
  }

  const uniqueGroups = [...new Set(data.map(row => {
    return groupKeys.map(k => row[k] || 'N/A').join('|');
  }))];
  const colors = getThemeColors(uniqueGroups.length);

  return uniqueGroups.map((group, idx) => {
    const groupData = data.filter(row => {
      const rowGroup = groupKeys.map(k => row[k] || 'N/A').join('|');
      return rowGroup === group;
    });

    return {
      x: groupData.map(row => row[chartXAxis] || 'N/A'),
      y: groupData.map(row => chartYAxis === '_count' ? 1 : extractNumericForChart(row[chartYAxis])).filter(v => v !== null),
      type: 'box',
      name: group.replace(/\|/g, ', '),
      marker: { color: colors[idx] },
      boxpoints: 'outliers'
    };
  });
}

function buildViolinTraces(data, groupKeys) {
  if (!chartXAxis) return [];

  const xVals = [...new Set(data.map(row => row[chartXAxis] || 'N/A'))];

  if (groupKeys.length === 0) {
    const colors = getThemeColors(xVals.length);
    return xVals.map((xVal, idx) => {
      const yVals = data
        .filter(row => (row[chartXAxis] || 'N/A') === xVal)
        .map(row => chartYAxis === '_count' ? 1 : extractNumericForChart(row[chartYAxis]))
        .filter(v => v !== null);

      return {
        y: yVals,
        type: 'violin',
        name: xVal,
        marker: { color: colors[idx] },
        box: { visible: true },
        meanline: { visible: true }
      };
    });
  }

  const uniqueGroups = [...new Set(data.map(row => {
    return groupKeys.map(k => row[k] || 'N/A').join('|');
  }))];
  const colors = getThemeColors(uniqueGroups.length);

  return uniqueGroups.map((group, idx) => {
    const groupData = data.filter(row => {
      const rowGroup = groupKeys.map(k => row[k] || 'N/A').join('|');
      return rowGroup === group;
    });

    return {
      x: groupData.map(row => row[chartXAxis] || 'N/A'),
      y: groupData.map(row => chartYAxis === '_count' ? 1 : extractNumericForChart(row[chartYAxis])).filter(v => v !== null),
      type: 'violin',
      name: group.replace(/\|/g, ', '),
      marker: { color: colors[idx] },
      box: { visible: true },
      meanline: { visible: true }
    };
  });
}

function buildHeatmapTrace(grouped) {
  const xVals = [...new Set(grouped.map(g => g.x))].sort();
  const yVals = [...new Set(grouped.map(g => g.groupKey))].filter(g => g !== '_all').sort();

  if (yVals.length === 0) {
    // Single row heatmap
    const zVals = [xVals.map(x => {
      const match = grouped.find(g => g.x === x);
      return match ? match.value : 0;
    })];

    return [{
      z: zVals,
      x: xVals,
      y: ['All'],
      type: 'heatmap',
      colorscale: chartTheme === 'viridis' ? 'Viridis' : 'RdBu',
      reversescale: true
    }];
  }

  const zVals = yVals.map(y => {
    return xVals.map(x => {
      const match = grouped.find(g => g.x === x && g.groupKey === y);
      return match ? match.value : 0;
    });
  });

  return [{
    z: zVals,
    x: xVals,
    y: yVals.map(y => y.replace(/\|/g, ', ')),
    type: 'heatmap',
    colorscale: chartTheme === 'viridis' ? 'Viridis' : 'RdBu',
    reversescale: true
  }];
}

function buildPieTrace(grouped) {
  const labels = grouped.map(g => g.x);
  const values = grouped.map(g => g.value);
  const colors = getThemeColors(labels.length);

  return [{
    labels,
    values,
    type: 'pie',
    marker: { colors },
    textinfo: 'label+percent',
    hoverinfo: 'label+value+percent'
  }];
}

// ============================================================
// Custom colors functions
// ============================================================

function onThemeChange() {
  chartTheme = chartThemeSelect.value;
  btnEditColors.style.display = chartTheme === 'custom' ? '' : 'none';
  saveChartTheme();
  if (chartTheme === 'custom') {
    openCustomColorsModal();
  }
  if (currentView === 'chart') renderChart();
}

function openCustomColorsModal() {
  customColorsModal.style.display = '';
  renderCustomColorsList();
}

function closeCustomColorsModal() {
  customColorsModal.style.display = 'none';
}

function renderCustomColorsList() {
  customColorsList.innerHTML = '';
  customChartColors.forEach((color, idx) => {
    const row = document.createElement('div');
    row.className = 'custom-color-row';
    row.innerHTML = `
      <span class="color-index">${idx + 1}.</span>
      <input type="color" value="${color}" data-idx="${idx}">
      <input type="text" value="${color}" data-idx="${idx}" placeholder="#000000">
      <div class="color-preview" style="background:${color}"></div>
      <button class="btn-remove-color" data-idx="${idx}" ${customChartColors.length <= 1 ? 'disabled' : ''}>&times;</button>
    `;
    customColorsList.appendChild(row);

    // Wire events
    const colorInput = row.querySelector('input[type="color"]');
    const textInput = row.querySelector('input[type="text"]');
    const preview = row.querySelector('.color-preview');
    const removeBtn = row.querySelector('.btn-remove-color');

    colorInput.addEventListener('input', (e) => {
      const newColor = e.target.value;
      textInput.value = newColor;
      preview.style.background = newColor;
      customChartColors[idx] = newColor;
    });

    textInput.addEventListener('input', (e) => {
      const newColor = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
        colorInput.value = newColor;
        preview.style.background = newColor;
        customChartColors[idx] = newColor;
      }
    });

    removeBtn.addEventListener('click', () => {
      if (customChartColors.length > 1) {
        customChartColors.splice(idx, 1);
        renderCustomColorsList();
      }
    });
  });
}

function addCustomColorRow() {
  if (customChartColors.length >= 12) {
    showToast('Maximum 12 colors allowed', 'error');
    return;
  }
  // Add a new color (cycling through default palette)
  const defaultPalette = CHART_COLOR_THEMES.default;
  const newColor = defaultPalette[customChartColors.length % defaultPalette.length];
  customChartColors.push(newColor);
  renderCustomColorsList();
}

function resetCustomColors() {
  customChartColors = [...CHART_COLOR_THEMES.default];
  renderCustomColorsList();
}

function applyCustomColors() {
  saveCustomColors();
  closeCustomColorsModal();
  if (currentView === 'chart') renderChart();
  showToast('Custom colors applied', 'success');
}

function saveCustomColors() {
  try {
    localStorage.setItem('plateAnno_customColors', JSON.stringify(customChartColors));
  } catch (e) { /* storage unavailable */ }
}

function loadCustomColors() {
  try {
    const saved = localStorage.getItem('plateAnno_customColors');
    if (saved) {
      customChartColors = JSON.parse(saved);
    }
    const savedTheme = localStorage.getItem('plateAnno_chartTheme');
    if (savedTheme) {
      chartTheme = savedTheme;
      chartThemeSelect.value = savedTheme;
      btnEditColors.style.display = savedTheme === 'custom' ? '' : 'none';
    }
  } catch (e) { /* corrupted, use default */ }
}

function saveChartTheme() {
  try {
    localStorage.setItem('plateAnno_chartTheme', chartTheme);
  } catch (e) { /* storage unavailable */ }
}

// Load custom colors on init
loadCustomColors();
