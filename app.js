// ============================================================
// Plate Annotation Tool — app.js
// ============================================================

// ---- Constants ----
const PLATE_FORMATS = {
  6:   { rows: 2,  cols: 3  },
  12:  { rows: 3,  cols: 4  },
  24:  { rows: 4,  cols: 6  },
  48:  { rows: 6,  cols: 8  },
  96:  { rows: 8,  cols: 12 },
  384: { rows: 16, cols: 24 },
};

const ROW_LETTERS = 'ABCDEFGHIJKLMNOP';

const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#10b981',
  '#d946ef', '#64748b', '#eab308', '#78716c', '#dc2626',
];

const STORAGE_KEY = 'plateAnno_state';

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

// ---- Init ----
loadState();
formatSelect.addEventListener('change', onFormatChange);
colorBySelect.addEventListener('change', onColorByChange);
searchInput.addEventListener('input', onSearchInput);
btnExport.addEventListener('click', exportCSV);
btnImport.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', importCSV);
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);
btnCopy.addEventListener('click', copyWells);
btnPaste.addEventListener('click', pasteWells);
btnClear.addEventListener('click', clearAll);

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
});

// Drag selection
document.addEventListener('mousedown', onDragStart);
document.addEventListener('mousemove', onDragMove);
document.addEventListener('mouseup', onDragEnd);

renderPlate();
renderAnnoPanel();
refreshCSVPreview();
updateButtonStates();
updateColorByOptions();

// ============================================================
// Plate rendering
// ============================================================
function renderPlate() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  const grid = document.createElement('div');
  grid.className = 'plate-grid' + (plateFormat === 384 ? ' fmt-384' : '');
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

      // Tooltip
      if (annos && annos.length > 0) {
        well.title = wellId + '\n' + annos
          .map(a => (a.key || '?') + ' = ' + (a.value || '?'))
          .join('\n');
      } else {
        well.title = wellId;
      }

      grid.appendChild(well);
    }
  }

  plateContainer.innerHTML = '';
  plateContainer.appendChild(grid);

  // Color legend
  if (colorMap) renderColorLegend(colorMap);

  updateSelectionInfo();
  updateButtonStates();
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

function getWellRange(fromId, toId) {
  const r1 = ROW_LETTERS.indexOf(fromId[0]);
  const c1 = parseInt(fromId.slice(1), 10);
  const r2 = ROW_LETTERS.indexOf(toId[0]);
  const c2 = parseInt(toId.slice(1), 10);
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
      <input type="text" placeholder="Value" value="${escapeAttr(a.value)}" data-idx="${i}" data-field="value">
      <button data-idx="${i}" class="btn-del-anno">&times;</button>
    </div>`;
}

function wireAnnoEvents() {
  // Key inputs with autocomplete
  annoPanel.querySelectorAll('.autocomplete-wrapper input').forEach(inp => {
    inp.addEventListener('input', onAnnoInput);
    setupAutocomplete(inp);
  });
  // Value inputs
  annoPanel.querySelectorAll('.anno-row > input[data-field="value"]').forEach(inp => {
    inp.addEventListener('input', onAnnoInput);
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
  const keys = new Set();
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.key.trim()) keys.add(a.key.trim());
    }
  }
  return [...keys].sort();
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

function buildColorMap() {
  if (!colorByKey) return null;
  const valueToColor = {};
  let colorIdx = 0;
  const map = {};
  for (const wid of Object.keys(annotations)) {
    for (const a of annotations[wid]) {
      if (a.key === colorByKey && a.value.trim()) {
        const val = a.value.trim();
        if (!(val in valueToColor)) {
          valueToColor[val] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
          colorIdx++;
        }
        map[wid] = valueToColor[val];
      }
    }
  }
  map._legend = valueToColor;
  return map;
}

function renderColorLegend(colorMap) {
  const legend = colorMap._legend;
  if (!legend || Object.keys(legend).length === 0) return;
  const div = document.createElement('div');
  div.className = 'color-legend';
  for (const [val, color] of Object.entries(legend)) {
    const item = document.createElement('span');
    item.className = 'color-legend-item';
    item.innerHTML = `<span class="color-legend-swatch" style="background:${color}"></span>${escapeHTML(val)}`;
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
function buildCSV() {
  const lines = ['Well,Row,Column,AnnotationKey,AnnotationValue'];
  const wellIds = Object.keys(annotations).sort(sortWellIds);
  for (const wellId of wellIds) {
    const row = wellId[0];
    const col = wellId.slice(1);
    for (const anno of annotations[wellId]) {
      lines.push([wellId, row, col, csvEscape(anno.key), csvEscape(anno.value)].join(','));
    }
  }
  return lines.join('\n');
}

function refreshCSVPreview() {
  const hasData = Object.keys(annotations).some(k => annotations[k].length > 0);
  csvPreview.textContent = hasData ? buildCSV() : 'No annotations yet.';
}

function exportCSV() {
  const csv = buildCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plate_${plateFormat}_annotations.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
    const r = ROW_LETTERS.indexOf(wid[0]);
    const c = parseInt(wid.slice(1), 10);
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

function sortWellIds(a, b) {
  const ra = a[0], rb = b[0];
  const ca = parseInt(a.slice(1), 10), cb = parseInt(b.slice(1), 10);
  if (ra !== rb) return ra < rb ? -1 : 1;
  return ca - cb;
}
