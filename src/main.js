import { GRAMMAR_REGISTRY } from './registry.js';

let segments = [];
let selectedIndices = new Set();
let lastClickedIndex = null;
let isDragging = false;
let dragStartIndex = null;
let statusTimeout = null;
let undoStack = [];
let lastCanvas = null;

const appWindow = window.__TAURI__?.window.getCurrentWindow();
const invoke = window.__TAURI__?.core.invoke;

// Built-in tags plus whatever the user's registry.toml adds
let registry = [...GRAMMAR_REGISTRY];

const els = {
  sourceText: document.getElementById('source-text'),
  btnParse: document.getElementById('btn-parse'),
  registryContainer: document.getElementById('registry-container'),
  registrySearch: document.getElementById('registry-search'),
  segmentsContainer: document.getElementById('segments-container'),
  previewImage: document.getElementById('preview-image'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
  textOutputArea: document.getElementById('text-output-area'),
  btnModeImg: document.getElementById('btn-mode-img'),
  btnModeMd: document.getElementById('btn-mode-md'),
  btnModeRuby: document.getElementById('btn-mode-ruby'),
  statusMsg: document.getElementById('status-msg'),
  statSeg: document.getElementById('stat-seg'),
  statTagged: document.getElementById('stat-tagged'),
  statSel: document.getElementById('stat-sel'),
  aboutDialog: document.getElementById('about-dialog'),
  shortcutsDialog: document.getElementById('shortcuts-dialog'),
  customDialog: document.getElementById('custom-dialog'),
  customPath: document.getElementById('custom-path'),
  customStatus: document.getElementById('custom-status')
};

async function loadCustomTags(notify = false) {
  if (!invoke) {
    els.customStatus.textContent = 'Available in the desktop app only.';
    return;
  }
  try {
    const { path, tags } = await invoke('load_custom_registry');
    els.customPath.textContent = path;
    const fresh = tags
      .filter(t => !GRAMMAR_REGISTRY.some(g => g.id === t.id))
      .map(t => ({ ...t, category: t.category || 'Custom' }));
    registry = [...GRAMMAR_REGISTRY, ...fresh];
    els.customStatus.textContent = `${fresh.length} custom tag${fresh.length === 1 ? '' : 's'} loaded.`;
    els.registrySearch.value = '';
    buildRegistryUI(registry);
    if (notify) setStatus(`CUSTOM TAGS ▸ ${fresh.length} LOADED`);
  } catch (err) {
    els.customStatus.textContent = `Could not load: ${err}`;
    setStatus('CUSTOM TAGS ERROR — SEE FILE ▸ CUSTOM TAGS');
  }
}

function openExternal(url) {
  const open = window.__TAURI__?.opener?.openUrl ?? (u => window.open(u, '_blank'));
  open(url);
}

// OSRS-style wiki lookup: open the Wikipedia article for a grammar term.
// Bare label so Wikipedia's exact-title redirect fires; "(...)" and "/..."
// variants in labels would break that. Cases get " case" ("genitive case").
function wikiLookup(grammar) {
  const base = grammar.label.replace(/\(.*?\)/g, '').split('/')[0].trim();
  const query = grammar.category === 'Grammatical Case' ? `${base} case` : base;
  openExternal(`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`);
  setStatus(`WIKI ▸ ${base.toUpperCase()}`);
}

// Dictionary lookup for the selected word or compound term.
function wiktionaryLookup(term) {
  openExternal(`https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(term)}`);
  setStatus(`WIKTIONARY ▸ ${term.toUpperCase()}`);
}

function selectedTerm() {
  return Array.from(selectedIndices).sort((a, b) => a - b).map(i => segments[i].text).join(' ');
}

// ponytail: whole-state snapshots, capped at 50 — plenty for a one-sentence app
function pushUndo() {
  undoStack.push(JSON.stringify({ text: els.sourceText.value, segments }));
  if (undoStack.length > 50) undoStack.shift();
}

function undo() {
  if (undoStack.length === 0) { setStatus('NOTHING TO UNDO'); return; }
  const snap = JSON.parse(undoStack.pop());
  els.sourceText.value = snap.text;
  segments = snap.segments;
  selectedIndices.clear();
  lastClickedIndex = null;
  renderSegmentsUI();
  updateRegistryState();
  showOutputView('placeholder');
  triggerRender();
  setStatus('UNDONE');
}

function saveState() {
  localStorage.setItem('sentence-miner', JSON.stringify({ text: els.sourceText.value, segments }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('sentence-miner'));
    if (!saved?.segments?.length) return false;
    els.sourceText.value = saved.text ?? '';
    segments = saved.segments;
    renderSegmentsUI();
    updateRegistryState();
    triggerRender();
    return true;
  } catch { return false; }
}

const actions = {
  'parse': handleParse,
  'undo': undo,
  'clear-source': () => {
    pushUndo();
    els.sourceText.value = '';
    segments = [];
    selectedIndices.clear();
    lastClickedIndex = null;
    renderSegmentsUI();
    updateRegistryState();
    showOutputView('placeholder');
    setStatus('SOURCE CLEARED');
  },
  'exit': () => appWindow?.close(),
  'select-all': () => {
    segments.forEach((seg, i) => { if (!seg.isPunctuation) selectedIndices.add(i); });
    renderSegmentsUI();
    updateRegistryState();
  },
  'clear-selection': () => {
    selectedIndices.clear();
    lastClickedIndex = null;
    renderSegmentsUI();
    updateRegistryState();
  },
  'clear-tags': () => {
    pushUndo();
    segments.forEach(seg => seg.tag = null);
    renderSegmentsUI();
    updateRegistryState();
    showOutputView('placeholder');
    setStatus('ALL TAGS CLEARED');
  },
  'render-image': () => { showOutputView('image'); triggerRender(); },
  'copy-md': () => exportText(seg => `**${seg.text}**[${seg.tag}]`, 'markdown', 'COPIED ▸ MARKDOWN'),
  'copy-ruby': () => exportText(seg => `<ruby>${seg.text}<rt style="color: #e8c547;">${seg.tag}</rt></ruby>`, 'ruby', 'COPIED ▸ RUBY HTML'),
  'save-png': () => {
    if (segments.length === 0) { setStatus('NOTHING TO SAVE'); return; }
    showOutputView('image');
    triggerRender().then(() => {
      if (!lastCanvas) return;
      lastCanvas.toBlob(async (blob) => {
        try {
          if (invoke) {
            const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
            const path = await invoke('save_png', { data: bytes });
            setStatus(`SAVED ▸ ${path}`);
          } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'sentence-diagram.png';
            a.click();
            URL.revokeObjectURL(a.href);
            setStatus('SAVED ▸ DOWNLOAD');
          }
        } catch (err) { setStatus(`SAVE FAILED — ${err}`); }
      }, 'image/png');
    });
  },
  'custom-tags': () => els.customDialog.showModal(),
  'reload-custom': () => loadCustomTags(true),
  'about': () => els.aboutDialog.showModal(),
  'shortcuts': () => els.shortcutsDialog.showModal(),
  'close-dialog': (btn) => btn.closest('dialog').close()
};

function init() {
  buildRegistryUI(registry);
  initChrome();
  loadCustomTags();
  els.btnParse.addEventListener('click', handleParse);
  els.registrySearch.addEventListener('input', handleSearch);
  els.btnModeImg.addEventListener('click', actions['render-image']);
  els.btnModeMd.addEventListener('click', actions['copy-md']);
  els.btnModeRuby.addEventListener('click', actions['copy-ruby']);

  // Global listener to stop dragging if mouse is released anywhere
  window.addEventListener('mouseup', () => { isDragging = false; });

  // Click the negative space (or punctuation) to deselect
  els.segmentsContainer.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target === els.segmentsContainer || e.target.closest('.segment-punct')) {
      actions['clear-selection']();
    }
  });

  els.sourceText.addEventListener('input', saveState);

  // Enter in search applies the top hit to the selection
  els.registrySearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.registryContainer.querySelector('.registry-item:not(:disabled)')?.click();
  });

  if (!loadState()) handleParse();
}

function initChrome() {
  // Titlebar window controls
  document.getElementById('tb-min').addEventListener('click', () => appWindow?.minimize());
  document.getElementById('tb-max').addEventListener('click', () => appWindow?.toggleMaximize());
  document.getElementById('tb-close').addEventListener('click', () => appWindow?.close());

  // Menubar: click opens, hover switches while one is open, click-away closes
  const menus = [...document.querySelectorAll('#menubar .menu')];
  const closeMenus = () => menus.forEach(m => m.classList.remove('open'));
  menus.forEach(menu => {
    const btn = menu.querySelector('.menu-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = menu.classList.contains('open');
      closeMenus();
      if (!wasOpen) menu.classList.add('open');
    });
    btn.addEventListener('mouseenter', () => {
      if (menus.some(m => m.classList.contains('open'))) {
        closeMenus();
        menu.classList.add('open');
      }
    });
  });
  window.addEventListener('click', () => { closeMenus(); hideContextMenu(); }); // menu item clicks bubble here too
  window.addEventListener('contextmenu', hideContextMenu);
  window.addEventListener('blur', hideContextMenu);

  // Menu + dialog actions
  document.querySelectorAll('[data-action]').forEach(btn =>
    btn.addEventListener('click', () => actions[btn.dataset.action](btn))
  );

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const typing = /^(TEXTAREA|INPUT)$/.test(document.activeElement?.tagName);
    if (e.key === 'Escape') {
      if (document.querySelector('dialog[open]')) return; // dialog closes itself; keep the selection
      closeMenus(); hideContextMenu(); actions['clear-selection']();
    }
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleParse(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'a' && !typing) { e.preventDefault(); actions['select-all'](); }
    if (e.key === 'F1') { e.preventDefault(); els.shortcutsDialog.showModal(); }
  });
}

// items: {label, fn} entries, or 'hr' for a separator
function showContextMenu(x, y, items) {
  const menu = document.getElementById('context-menu');
  menu.innerHTML = '';
  items.forEach(item => {
    if (item === 'hr') { menu.appendChild(document.createElement('hr')); return; }
    const btn = document.createElement('button');
    btn.textContent = item.label;
    btn.addEventListener('click', item.fn);
    menu.appendChild(btn);
  });
  menu.classList.add('open');
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
}

function hideContextMenu() {
  document.getElementById('context-menu').classList.remove('open');
}

function openSegmentMenu(x, y, index) {
  const seg = segments[index];
  const term = selectedTerm();
  const shortTerm = term.length > 26 ? `${term.slice(0, 26)}…` : term;

  const items = [{ label: `Wiktionary ▸ “${shortTerm}”`, fn: () => wiktionaryLookup(term) }];
  if (seg.tag) {
    const grammar = registry.find(g => g.id === seg.tag);
    if (grammar) items.push({ label: `Grammar wiki ▸ ${grammar.label}`, fn: () => wikiLookup(grammar) });
    items.push({ label: 'Clear tag', fn: () => {
      pushUndo();
      seg.tag = null;
      renderSegmentsUI();
      updateRegistryState();
      triggerRender();
    } });
  }
  items.push('hr',
    { label: 'Select all', fn: actions['select-all'] },
    { label: 'Clear selection', fn: actions['clear-selection'] }
  );
  showContextMenu(x, y, items);
}

function setStatus(msg) {
  els.statusMsg.textContent = msg;
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => { els.statusMsg.textContent = 'READY'; }, 3000);
}

function updateStatusBar() {
  els.statSeg.textContent = segments.length;
  els.statTagged.textContent = segments.filter(s => s.tag).length;
  els.statSel.textContent = selectedIndices.size;
}

function buildRegistryUI(registryData, isSearching = false) {
  els.registryContainer.innerHTML = '';

  const grouped = {};
  for (const g of registryData) (grouped[g.category || 'Uncategorized'] ??= []).push(g);

  for (const [category, items] of Object.entries(grouped)) {
    const details = document.createElement('details');
    details.open = isSearching; // Auto-open if searching

    const summary = document.createElement('summary');
    summary.textContent = category;
    details.appendChild(summary);

    items.forEach(grammar => {
      const row = document.createElement('div');
      row.className = 'reg-row';

      const btn = document.createElement('button');
      btn.className = 'registry-item';
      btn.disabled = selectedIndices.size === 0;
      btn.append(makeSpan('reg-label', grammar.label), makeSpan('reg-def', grammar.def));
      btn.addEventListener('click', () => assignTag(grammar.id));
      row.appendChild(btn);

      const wiki = document.createElement('button');
      wiki.className = 'reg-wiki';
      wiki.textContent = 'W';
      wiki.title = `Wiki lookup: ${grammar.label}`;
      wiki.addEventListener('click', () => wikiLookup(grammar));
      row.appendChild(wiki);

      details.appendChild(row);
    });

    els.registryContainer.appendChild(details);
  }
}

function handleSearch(e) {
  const term = e.target.value.toLowerCase();

  if (term === '') {
    buildRegistryUI(registry, false);
    return;
  }

  // Rank: exact label, then label prefix, then label substring, then definition
  const rank = g => {
    const label = g.label.toLowerCase();
    return label === term ? 0 : label.startsWith(term) ? 1 : label.includes(term) ? 2 : 3;
  };
  const filtered = registry
    .filter(g => g.label.toLowerCase().includes(term) || g.def.toLowerCase().includes(term))
    .sort((a, b) => rank(a) - rank(b));

  buildRegistryUI(filtered, true);
}

function updateRegistryState() {
  const buttons = els.registryContainer.querySelectorAll('.registry-item');
  buttons.forEach(btn => btn.disabled = selectedIndices.size === 0);
}

function makeSpan(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

function renderSegmentsUI() {
  els.segmentsContainer.innerHTML = '';
  segments.forEach((seg, index) => {
    const box = document.createElement('div');

    if (seg.isPunctuation) {
      box.className = 'segment-punct';
      box.appendChild(makeSpan('segment-text', seg.text));
    } else {
      box.className = `segment-box ${selectedIndices.has(index) ? 'active' : ''}`;
      box.appendChild(makeSpan('segment-text', seg.text));
      if (seg.tag) box.appendChild(makeSpan('segment-tag', seg.tag.replace(/_/g, ' ')));

      // Mousedown: Starts drag, handles Shift-Click or standard Click
      box.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;

        // Ctrl+Click: toggle one segment in or out, file-manager style
        if (e.ctrlKey || e.metaKey) {
          if (selectedIndices.has(index)) selectedIndices.delete(index);
          else selectedIndices.add(index);
          lastClickedIndex = index;
          renderSegmentsUI();
          updateRegistryState();
          return;
        }

        isDragging = true;
        dragStartIndex = index;

        if (e.shiftKey && lastClickedIndex !== null) {
          selectRange(lastClickedIndex, index);
        } else {
          selectedIndices.clear();
          selectedIndices.add(index);
        }

        lastClickedIndex = index;
        renderSegmentsUI();
        updateRegistryState();
      });

      // Right-click: segment context menu (selects the segment first if needed)
      box.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedIndices.has(index)) {
          selectedIndices.clear();
          selectedIndices.add(index);
          lastClickedIndex = index;
          renderSegmentsUI();
          updateRegistryState();
        }
        openSegmentMenu(e.clientX, e.clientY, index);
      });

      // Mouseenter: Highlights range as you swipe (only while the button is truly down)
      box.addEventListener('mouseenter', (e) => {
        if (isDragging && e.buttons === 1) {
          selectRange(dragStartIndex, index);
          renderSegmentsUI();
          updateRegistryState();
        }
      });
    }
    els.segmentsContainer.appendChild(box);
  });
  updateStatusBar();
  saveState();
}

function selectRange(a, b) {
  selectedIndices.clear();
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
    if (!segments[i].isPunctuation) selectedIndices.add(i);
  }
}

function handleParse() {
  const text = els.sourceText.value.trim();
  if (!text) return;
  if (segments.length) pushUndo();

  const tokens = text.match(/[\w'-]+|[^\w\s]/g) || [];

  segments = tokens.map(token => ({
    text: token,
    tag: null,
    isPunctuation: /^[^\w\s]+$/.test(token)
  }));

  selectedIndices.clear();
  lastClickedIndex = null;
  renderSegmentsUI();
  updateRegistryState();
  showOutputView('placeholder');
  setStatus(`MINED ${segments.length} SEGMENTS`);
}

function assignTag(tagId) {
  if (selectedIndices.size === 0) return;
  pushUndo();

  const indices = Array.from(selectedIndices).sort((a, b) => a - b);
  const minIdx = indices[0];
  const maxIdx = indices[indices.length - 1];

  let contiguous = true;
  for (let i = minIdx; i <= maxIdx; i++) {
    if (!segments[i].isPunctuation && !selectedIndices.has(i)) { contiguous = false; break; }
  }

  if (!contiguous) {
    // Gapped Ctrl+Click selection: tag each selected segment on its own
    indices.forEach(i => { segments[i].tag = tagId; });
  } else if (minIdx !== maxIdx) {
    // Merge multiple words into a single block
    let mergedText = "";
    for (let i = minIdx; i <= maxIdx; i++) {
      if (i > minIdx && !segments[i].isPunctuation) {
        mergedText += " ";
      }
      mergedText += segments[i].text;
    }

    segments.splice(minIdx, (maxIdx - minIdx + 1), {
      text: mergedText,
      tag: tagId,
      isPunctuation: false
    });
  } else {
    // Single word toggle
    segments[minIdx].tag = segments[minIdx].tag === tagId ? null : tagId;
  }

  selectedIndices.clear();
  lastClickedIndex = null;

  renderSegmentsUI();
  updateRegistryState();
  setStatus(`TAGGED ▸ ${tagId.toUpperCase()}`);
  triggerRender();
}

function showOutputView(view) {
  const isText = view === 'markdown' || view === 'ruby';
  els.previewPlaceholder.style.display = view === 'placeholder' ? 'block' : 'none';
  els.previewImage.style.display = view === 'image' ? 'block' : 'none';
  els.textOutputArea.style.display = isText ? 'block' : 'none';
  els.btnModeImg.classList.toggle('btn-primary', view === 'image' || view === 'placeholder');
  els.btnModeMd.classList.toggle('btn-primary', view === 'markdown');
  els.btnModeRuby.classList.toggle('btn-primary', view === 'ruby');
}

function exportText(formatTagged, view, statusLabel) {
  let output = '';
  segments.forEach((seg, i) => {
    const word = seg.tag ? formatTagged(seg) : seg.text;
    output += (seg.isPunctuation || i === 0) ? word : ` ${word}`;
  });
  els.textOutputArea.value = output;
  showOutputView(view);
  navigator.clipboard.writeText(output)
    .then(() => setStatus(statusLabel))
    .catch(() => setStatus('CLIPBOARD BLOCKED — TEXT SHOWN BELOW'));
}

// Draws the diagram with the Canvas 2D API — silver text, gold underline,
// cyan tag label on the abyss background, all in the app's VT323 face.
async function triggerRender() {
  if (segments.length === 0 || els.textOutputArea.style.display === 'block') return;

  const fontSize = 38, tagSize = 20, padX = 40, padY = 40, spacing = 15;
  const maxLineWidth = 1200; // wrap long sentences instead of one endless strip
  const rowHeight = fontSize + 9 + tagSize + 5 + 30;
  const font = `${fontSize}px 'VT323'`;
  const tagFont = `${tagSize}px 'VT323'`;
  await document.fonts.load(font); // measure with the real font, not the fallback

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let cursorX = padX, row = 0, maxX = 0;
  const layout = segments.map(seg => {
    ctx.font = font;
    const w = ctx.measureText(seg.text).width;
    ctx.font = tagFont;
    const tagW = seg.tag ? ctx.measureText(seg.tag.replace(/_/g, ' ')).width : 0;
    const slot = Math.max(w, tagW);
    if (seg.isPunctuation && cursorX > padX) cursorX -= spacing; // punctuation hugs the previous word, never wraps alone
    else if (cursorX > padX && cursorX + slot > maxLineWidth) { row++; cursorX = padX; }
    const pos = { x: cursorX, row, slot, w, tagW, seg };
    cursorX += slot + spacing;
    maxX = Math.max(maxX, cursorX);
    return pos;
  });

  canvas.width = Math.ceil(maxX - spacing + padX); // resizing resets ctx state
  canvas.height = padY + fontSize + row * rowHeight + 9 + tagSize + 5 + padY;
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const { x, row: r, slot, w, tagW, seg } of layout) {
    const baseY = padY + fontSize + r * rowHeight;
    const lineY = baseY + 9;
    const tagY = lineY + tagSize + 5;

    ctx.font = font;
    ctx.fillStyle = '#d8d8e8';
    ctx.fillText(seg.text, x + (slot - w) / 2, baseY);

    if (seg.tag) {
      ctx.strokeStyle = '#e8c547';
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + slot, lineY);
      ctx.stroke();
      ctx.font = tagFont;
      ctx.fillStyle = '#7df9ff';
      ctx.fillText(seg.tag.replace(/_/g, ' '), x + (slot - tagW) / 2, tagY);
    }
  }

  els.previewImage.src = canvas.toDataURL('image/png');
  lastCanvas = canvas;
  showOutputView('image');
}

init();
