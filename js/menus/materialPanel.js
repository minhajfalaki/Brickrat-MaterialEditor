import { loadLibrary, saveMaterial, deleteMaterial } from '../interaction/materialLibrary.js';
import { applyMaterial, undoMaterial, canUndo, exportGLB } from '../interaction/materialEditor.js';

let _panel, _surfaceEl, _gridEl, _btnUndo, _addModal;

export function initPanel() {
  _panel      = document.getElementById('materialPanel');
  _surfaceEl  = document.getElementById('mpSurface');
  _gridEl     = document.getElementById('mpGrid');
  _btnUndo    = document.getElementById('mpBtnUndo');
  _addModal   = document.getElementById('mpAddModal');

  document.getElementById('mpClose').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('materialEditorClose'));
  });

  document.getElementById('mpBtnAdd').addEventListener('click', () => {
    _addModal.classList.add('open');
  });

  document.getElementById('mpBtnUndo').addEventListener('click', () => {
    undoMaterial();
    _refreshUndoBtn();
  });

  document.getElementById('mpBtnExport').addEventListener('click', () => {
    exportGLB();
  });

  document.getElementById('mpAddCancel').addEventListener('click', () => {
    _addModal.classList.remove('open');
  });

  document.getElementById('mpAddSave').addEventListener('click', _onSaveMaterial);

  _loadGrid();
}

export function showPanel() { _panel.classList.add('open'); }
export function hidePanel() { _panel.classList.remove('open'); }

export function updateSurfaceInfo(info) {
  if (!info) {
    _surfaceEl.innerHTML = '<span>Click a surface to select</span>';
  } else {
    const colorStyle = info.color ? `background:${info.color}` : 'background:#888';
    const texBadge = info.hasTexture
      ? '<span style="margin-left:6px;font-size:10px;opacity:.55;">[tex]</span>'
      : '';
    _surfaceEl.innerHTML = `
      <div class="mp-surface-row">
        <div class="mp-swatch-color" style="${colorStyle}"></div>
        <span>${info.name}${texBadge}</span>
      </div>`;
  }
  _refreshUndoBtn();
}

async function _loadGrid() {
  const mats = await loadLibrary();
  _gridEl.innerHTML = '';
  for (const m of mats) _gridEl.appendChild(_makeTile(m));
}

function _makeTile(m) {
  const tile = document.createElement('div');
  tile.className = 'mp-tile';
  tile.title = m.name;

  const preview = document.createElement('div');
  preview.className = 'mp-tile-preview';
  if (m.thumbnailDataURL) {
    preview.style.backgroundImage = `url(${m.thumbnailDataURL})`;
  } else {
    preview.style.background = m.color;
  }

  const name = document.createElement('div');
  name.className = 'mp-tile-name';
  name.textContent = m.name;

  const del = document.createElement('button');
  del.className = 'mp-tile-delete';
  del.textContent = '×';
  del.title = 'Delete';
  del.addEventListener('click', async e => {
    e.stopPropagation();
    await deleteMaterial(m.id);
    _loadGrid();
  });

  tile.appendChild(preview);
  tile.appendChild(name);
  tile.appendChild(del);
  tile.addEventListener('click', () => {
    applyMaterial(m);
    _refreshUndoBtn();
  });

  return tile;
}

function _refreshUndoBtn() {
  if (_btnUndo) _btnUndo.disabled = !canUndo();
}

async function _onSaveMaterial() {
  const nameEl    = document.getElementById('mpAddName');
  const colorEl   = document.getElementById('mpAddColor');
  const opacityEl = document.getElementById('mpAddOpacity');
  const fileEl    = document.getElementById('mpAddTexture');

  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }

  let textureBlob = null;
  let thumbnailDataURL = null;

  if (fileEl.files[0]) {
    textureBlob = fileEl.files[0];
    thumbnailDataURL = await _makeThumbnail(fileEl.files[0]);
  }

  await saveMaterial({
    id: crypto.randomUUID(),
    name,
    color: colorEl.value,
    opacity: parseFloat(opacityEl.value),
    textureBlob,
    thumbnailDataURL,
    createdAt: Date.now(),
  });

  _addModal.classList.remove('open');
  nameEl.value = '';
  fileEl.value = '';
  opacityEl.value = '1';
  _loadGrid();
}

function _makeThumbnail(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Center-crop to square
      const aspect = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (aspect > 1) { sw = img.height; sx = (img.width - sw) / 2; }
      else            { sh = img.width;  sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = url;
  });
}
