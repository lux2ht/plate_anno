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

// ---- State ----
let plateFormat = 96;
let annotations = {}; // { "A1": [{ key: "", value: "" }, ...], ... }
let selectedWell = null;

// ---- DOM refs ----
const formatSelect = document.getElementById('plate-format');
const plateContainer = document.getElementById('plate-container');
const annoPanel = document.getElementById('anno-panel');
const csvPreview = document.getElementById('csv-preview');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');

// ---- Init ----
formatSelect.addEventListener('change', onFormatChange);
btnExport.addEventListener('click', exportCSV);
btnClear.addEventListener('click', clearAll);
renderPlate();
refreshCSVPreview();

// ---- Plate rendering ----
function renderPlate() {
  const { rows, cols } = PLATE_FORMATS[plateFormat];
  const grid = document.createElement('div');
  grid.className = 'plate-grid' + (plateFormat === 384 ? ' fmt-384' : '');
  grid.style.gridTemplateColumns = `auto repeat(${cols}, 1fr)`;

  // Corner cell
  const corner = document.createElement('div');
  corner.className = 'corner';
  grid.appendChild(corner);

  // Column labels
  for (let c = 1; c <= cols; c++) {
    const lbl = document.createElement('div');
    lbl.className = 'col-label';
    lbl.textContent = c;
    grid.appendChild(lbl);
  }

  // Rows
  for (let r = 0; r < rows; r++) {
    const rowLetter = ROW_LETTERS[r];
    const rowLabel = document.createElement('div');
    rowLabel.className = 'row-label';
    rowLabel.textContent = rowLetter;
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

      if (wellId === selectedWell) well.classList.add('selected');

      well.addEventListener('click', () => selectWell(wellId));

      // Tooltip
      if (annos && annos.length > 0) {
        well.title = annos
          .map(a => (a.key || '?') + ' = ' + (a.value || '?'))
          .join('\n');
      }

      grid.appendChild(well);
    }
  }

  plateContainer.innerHTML = '';
  plateContainer.appendChild(grid);
}

// ---- Well selection & annotation panel ----
function selectWell(wellId) {
  selectedWell = wellId;
  if (!annotations[wellId]) annotations[wellId] = [];
  renderPlate();
  renderAnnoPanel();
}

function renderAnnoPanel() {
  if (!selectedWell) {
    annoPanel.innerHTML = '<p class="placeholder">Click a well to annotate.</p>';
    return;
  }

  const annos = annotations[selectedWell];
  let html = `<div class="well-header">Well ${selectedWell}</div>`;

  annos.forEach((a, i) => {
    html += `
      <div class="anno-row">
        <input type="text" placeholder="Key" value="${escapeAttr(a.key)}" data-idx="${i}" data-field="key">
        <input type="text" placeholder="Value" value="${escapeAttr(a.value)}" data-idx="${i}" data-field="value">
        <button data-idx="${i}" class="btn-del-anno">&times;</button>
      </div>`;
  });

  html += `<button id="btn-add-anno">+ Add annotation</button>`;
  annoPanel.innerHTML = html;

  // Wire events
  annoPanel.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', onAnnoInput);
  });
  annoPanel.querySelectorAll('.btn-del-anno').forEach(btn => {
    btn.addEventListener('click', onDeleteAnno);
  });
  document.getElementById('btn-add-anno').addEventListener('click', onAddAnno);
}

function onAnnoInput(e) {
  const idx = parseInt(e.target.dataset.idx, 10);
  const field = e.target.dataset.field;
  annotations[selectedWell][idx][field] = e.target.value;
  refreshCSVPreview();
  // Update badge & tooltip without losing focus
  updateWellVisual(selectedWell);
}

function onDeleteAnno(e) {
  const idx = parseInt(e.target.dataset.idx, 10);
  annotations[selectedWell].splice(idx, 1);
  if (annotations[selectedWell].length === 0) delete annotations[selectedWell];
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
}

function onAddAnno() {
  if (!annotations[selectedWell]) annotations[selectedWell] = [];
  annotations[selectedWell].push({ key: '', value: '' });
  renderAnnoPanel();
  // Focus the new key input
  const inputs = annoPanel.querySelectorAll('input[data-field="key"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

// Update a single well's badge/tooltip without full re-render (avoids losing input focus)
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
    el.title = annos.map(a => (a.key || '?') + ' = ' + (a.value || '?')).join('\n');
  } else {
    el.classList.remove('has-anno');
    const badge = el.querySelector('.badge');
    if (badge) badge.remove();
    el.title = '';
  }
}

// ---- Format change ----
function onFormatChange() {
  const hasData = Object.keys(annotations).length > 0;
  if (hasData && !confirm('Changing plate format will clear all annotations. Continue?')) {
    formatSelect.value = plateFormat;
    return;
  }
  plateFormat = parseInt(formatSelect.value, 10);
  annotations = {};
  selectedWell = null;
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
}

// ---- CSV ----
function buildCSV() {
  const lines = ['Well,Row,Column,AnnotationKey,AnnotationValue'];
  // Sort wells in plate order
  const wellIds = Object.keys(annotations).sort((a, b) => {
    const ra = a[0], rb = b[0];
    const ca = parseInt(a.slice(1), 10), cb = parseInt(b.slice(1), 10);
    if (ra !== rb) return ra < rb ? -1 : 1;
    return ca - cb;
  });
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

function clearAll() {
  if (Object.keys(annotations).length === 0) return;
  if (!confirm('Clear all annotations?')) return;
  annotations = {};
  selectedWell = null;
  renderPlate();
  renderAnnoPanel();
  refreshCSVPreview();
}

// ---- Helpers ----
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function csvEscape(s) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
