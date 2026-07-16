import { GRAMMAR_REGISTRY } from './registry.js';

let segments = [];
let queue = [];        // remaining sentences of a multi-sentence source
let queueIndex = 0;
let library = [];      // saved sentences, persisted to library.json in the config dir
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
  queueBar: document.getElementById('queue-bar'),
  queuePos: document.getElementById('queue-pos'),
  queuePrev: document.getElementById('queue-prev'),
  queueNext: document.getElementById('queue-next'),
  libraryDialog: document.getElementById('library-dialog'),
  libraryList: document.getElementById('library-list'),
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
  customStatus: document.getElementById('custom-status'),
  aiDialog: document.getElementById('ai-dialog'),
  aiLoading: document.getElementById('ai-loading'),
  aiStatus: document.getElementById('ai-status'),
  pluginsDialog: document.getElementById('plugins-dialog'),
  pluginsPath: document.getElementById('plugins-path'),
  pluginsList: document.getElementById('plugins-list'),
  pluginsLoading: document.getElementById('plugins-loading'),
  pluginsStatus: document.getElementById('plugins-status'),
  aiResults: document.getElementById('ai-results'),
  fontFamily: document.getElementById('font-family'),
  fontSize: document.getElementById('font-size')
};

// Fill the font picker with every family installed on the system.
// The static datalist in index.html stays as the browser-mode fallback.
async function loadSystemFonts() {
  if (!invoke) return;
  try {
    const fonts = await invoke('list_fonts');
    const list = document.getElementById('font-list');
    const frag = document.createDocumentFragment();
    for (const name of ['VT323', 'Press Start 2P', ...fonts]) {
      const opt = document.createElement('option');
      opt.value = name;
      frag.appendChild(opt);
    }
    list.replaceChildren(frag);
  } catch { /* keep the static fallback list */ }
}

// ---- Diagram style (colors + background mode, persisted, live re-render) ----

const DEFAULT_STYLE = {
  mode: 'solid',        // solid | gradient | transparent
  bg1: '#050510',
  bg2: '#2a1a4a',       // gradient end — deep space purple
  text: '#d8d8e8',
  line: '#e8c547',
  tag: '#7df9ff'
};
let diagramStyle = { ...DEFAULT_STYLE };

function loadDiagramStyle() {
  try { diagramStyle = { ...DEFAULT_STYLE, ...JSON.parse(localStorage.getItem('diagram-style')) }; } catch {}
}

// Whole-style presets; each chip in the dialog previews its own palette
const STYLE_PRESETS = {
  'Abyss': { ...DEFAULT_STYLE },
  'Deep Space': { mode: 'gradient', bg1: '#050510', bg2: '#2a1a4a', text: '#d8d8e8', line: '#e8c547', tag: '#7df9ff' },
  'Sunset': { mode: 'gradient', bg1: '#2d1b4e', bg2: '#7a2048', text: '#ffe9d6', line: '#ff9e3d', tag: '#ffd166' },
  'Phosphor': { mode: 'solid', bg1: '#000000', bg2: '#001100', text: '#33ff66', line: '#1f9944', tag: '#ffb000' },
  'Blueprint': { mode: 'solid', bg1: '#0a3055', bg2: '#0a3055', text: '#eaf3ff', line: '#ffffff', tag: '#9fd0ff' },
  'Manuscript': { mode: 'solid', bg1: '#f4ecd8', bg2: '#f4ecd8', text: '#2b2419', line: '#8b2500', tag: '#1d5a8a' },
  'Ink (transparent)': { mode: 'transparent', bg1: '#ffffff', bg2: '#ffffff', text: '#1a1a1a', line: '#b8860b', tag: '#0a6a8a' }
};

function buildStylePresets() {
  const wrap = document.getElementById('style-presets');
  for (const [name, preset] of Object.entries(STYLE_PRESETS)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.title = `Apply the ${name} theme`;
    b.style.background = preset.mode === 'transparent'
      ? 'repeating-conic-gradient(#555 0% 25%, #999 0% 50%) 0 0 / 12px 12px'
      : preset.mode === 'gradient'
        ? `linear-gradient(180deg, ${preset.bg1}, ${preset.bg2})`
        : preset.bg1;
    b.style.color = preset.text;
    b.style.border = `1px solid ${preset.line}`;
    b.addEventListener('click', () => {
      diagramStyle = { ...preset };
      localStorage.setItem('diagram-style', JSON.stringify(diagramStyle));
      syncStyleControls();
      triggerRender();
      setStatus(`STYLE ▸ ${name.toUpperCase()}`);
    });
    wrap.appendChild(b);
  }
}

function styleInputs() {
  return {
    mode: document.getElementById('style-bg-mode'),
    bg1: document.getElementById('style-bg1'),
    bg2: document.getElementById('style-bg2'),
    text: document.getElementById('style-text'),
    line: document.getElementById('style-line'),
    tag: document.getElementById('style-tag')
  };
}

function syncStyleControls() {
  const ins = styleInputs();
  for (const [key, el] of Object.entries(ins)) el.value = diagramStyle[key];
  // bg color rows only make sense for their modes
  document.querySelectorAll('[data-style-row="bg1"]').forEach(el =>
    el.style.display = diagramStyle.mode === 'transparent' ? 'none' : '');
  document.querySelectorAll('[data-style-row="bg2"]').forEach(el =>
    el.style.display = diagramStyle.mode === 'gradient' ? '' : 'none');
}

function bindStyleControls() {
  for (const [key, el] of Object.entries(styleInputs())) {
    el.addEventListener('input', () => {
      diagramStyle[key] = el.value;
      localStorage.setItem('diagram-style', JSON.stringify(diagramStyle));
      syncStyleControls();
      triggerRender();
    });
  }
}

function outputFontPrefs() {
  const family = els.fontFamily.value.trim().replace(/["']/g, '') || 'VT323';
  const size = Math.min(96, Math.max(16, parseInt(els.fontSize.value, 10) || 38));
  return { family, size };
}

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
  localStorage.setItem('sentence-miner', JSON.stringify({ text: els.sourceText.value, segments, queue, queueIndex }));
  syncState();
}

// ---- Sentence library (persisted next to registry.toml, served at GET /library) ----

async function loadLibrary() {
  if (!invoke) return;
  try { library = JSON.parse(await invoke('library_load')) || []; } catch { library = []; }
}

function persistLibrary() {
  invoke?.('library_save', { json: JSON.stringify(library) });
}

function saveToLibrary(quiet = false) {
  if (segments.length === 0) { setStatus('NOTHING TO SAVE'); return; }
  const text = els.sourceText.value.trim();
  const entry = { text, segments: structuredClone(segments), savedAt: Date.now() };
  const existing = library.findIndex(e => e.text === text);
  if (existing > -1) library[existing] = entry; else library.push(entry);
  persistLibrary();
  if (!quiet) setStatus(existing > -1 ? 'LIBRARY ▸ UPDATED' : `LIBRARY ▸ SAVED (${library.length} TOTAL)`);
}

function loadLibraryEntry(entry) {
  pushUndo();
  els.sourceText.value = entry.text;
  segments = structuredClone(entry.segments);
  selectedIndices.clear();
  lastClickedIndex = null;
  renderSegmentsUI();
  updateRegistryState();
  showOutputView('placeholder');
  triggerRender();
  setStatus('LIBRARY ▸ LOADED');
}

function buildLibraryUI() {
  els.libraryList.innerHTML = '';
  if (library.length === 0) {
    els.libraryList.textContent = 'Nothing saved yet — use FILE ▸ Save to library.';
    return;
  }
  [...library].sort((a, b) => b.savedAt - a.savedAt).forEach(entry => {
    const row = document.createElement('div');
    row.className = 'ai-row';

    const info = document.createElement('div');
    info.className = 'ai-info';
    info.appendChild(makeSpan('ai-text', entry.text.length > 70 ? `${entry.text.slice(0, 70)}…` : entry.text));
    const tagged = entry.segments.filter(s => s.tag).length;
    info.appendChild(makeSpan('ai-reason', `${tagged} tagged · ${new Date(entry.savedAt).toLocaleString()}`));

    const load = document.createElement('button');
    load.textContent = 'LOAD';
    load.addEventListener('click', () => { loadLibraryEntry(entry); els.libraryDialog.close(); });

    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Delete from library';
    del.addEventListener('click', () => {
      library = library.filter(e => e !== entry);
      persistLibrary();
      buildLibraryUI();
    });

    row.append(info, load, del);
    els.libraryList.appendChild(row);
  });
}

// Mirror state to the Rust side so the localhost connector API can serve it.
function syncState() {
  invoke?.('sync_state', { json: JSON.stringify({
    text: els.sourceText.value,
    segments,
    registry: registry.map(({ id, label, def }) => ({ id, label, def }))
  }) });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('sentence-miner'));
    if (!saved?.segments?.length) return false;
    els.sourceText.value = saved.text ?? '';
    segments = saved.segments;
    queue = saved.queue ?? [];
    queueIndex = saved.queueIndex ?? 0;
    renderSegmentsUI();
    updateRegistryState();
    updateQueueUI();
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
  'diagram-style': () => {
    syncStyleControls();
    showOutputView('image');
    triggerRender();
    document.getElementById('style-dialog').showModal();
  },
  'style-reset': () => {
    diagramStyle = { ...DEFAULT_STYLE };
    localStorage.setItem('diagram-style', JSON.stringify(diagramStyle));
    syncStyleControls();
    triggerRender();
    setStatus('STYLE ▸ RESET');
  },
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
            const path = await pickSavePath('sentence-diagram.png', 'PNG image', 'png');
            if (!path && window.__TAURI__?.dialog) { setStatus('SAVE CANCELLED'); return; }
            const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
            const saved = await invoke('save_png', { data: bytes, path });
            setStatus(`SAVED ▸ ${saved}`);
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
  'save-svg': async () => {
    if (segments.length === 0) { setStatus('NOTHING TO SAVE'); return; }
    try {
      const svg = diagramSvg(await computeDiagram());
      await saveTextAs('sentence-diagram.svg', 'SVG image', 'svg', 'image/svg+xml', svg);
    } catch (err) { setStatus(`SAVE FAILED — ${err}`); }
  },
  'copy-image': () => {
    if (segments.length === 0) { setStatus('NOTHING TO COPY'); return; }
    showOutputView('image');
    triggerRender().then(() => {
      if (!lastCanvas) return;
      lastCanvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setStatus('COPIED ▸ IMAGE');
        } catch {
          setStatus('CLIPBOARD IMAGES UNSUPPORTED HERE — USE SAVE PNG');
        }
      }, 'image/png');
    });
  },
  'copy-cloze': () => {
    let i = 0;
    exportText(seg => `{{c${++i}::${seg.text}::${seg.tag.replace(/_/g, ' ')}}}`, 'cloze', 'COPIED ▸ CLOZE');
  },
  'export-csv': async () => {
    const csv = libraryCsv();
    if (!csv.includes('\r\n')) { setStatus('NOTHING TO EXPORT — TAG SOMETHING FIRST'); return; }
    try {
      await saveTextAs('sentence-miner.csv', 'CSV', 'csv', 'text/csv', csv);
    } catch (err) { setStatus(`SAVE FAILED — ${err}`); }
  },
  'ai-open': () => els.aiDialog.showModal(),
  'ai-apply-all': () => {
    if (!lastSuggestions.some(s => findSegmentRange(s.text))) {
      els.aiStatus.textContent = 'Nothing applicable to apply.';
      return;
    }
    pushUndo(); // the whole batch is one undo step
    let applied = 0;
    for (const s of lastSuggestions) {
      // re-anchor each time — applying a suggestion merges segments and shifts ranges
      const range = findSegmentRange(s.text);
      if (!range) continue;
      selectRange(range[0], range[1]);
      applyTagToSelection(s.tag);
      applied++;
    }
    renderSegmentsUI();
    updateRegistryState();
    triggerRender();
    renderAiSuggestions(lastSuggestions); // refresh rows so stale APPLY buttons disable
    els.aiStatus.textContent = `Applied ${applied} of ${lastSuggestions.length} suggestions.`;
    setStatus(`AI ▸ APPLIED ${applied}`);
  },
  'plugins': () => { loadPlugins(); els.pluginsDialog.showModal(); },
  'reload-plugins': () => loadPlugins(true),
  'save-library': () => saveToLibrary(),
  'library': () => { buildLibraryUI(); els.libraryDialog.showModal(); },
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
  loadSystemFonts();
  loadLibrary();
  loadDiagramStyle();
  bindStyleControls();
  buildStylePresets();
  els.btnParse.addEventListener('click', handleParse);
  els.queuePrev.addEventListener('click', () => queueStep(-1));
  els.queueNext.addEventListener('click', () => queueStep(1));
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

  // Output font prefs: restore, then re-render live on change
  let savedFont = {};
  try { savedFont = JSON.parse(localStorage.getItem('output-font')) || {}; } catch {}
  if (savedFont.family) els.fontFamily.value = savedFont.family;
  if (savedFont.size) els.fontSize.value = savedFont.size;
  [els.fontFamily, els.fontSize].forEach(el => el.addEventListener('change', () => {
    localStorage.setItem('output-font', JSON.stringify(outputFontPrefs()));
    triggerRender();
  }));

  // Enter in search applies the top hit to the selection
  els.registrySearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.registryContainer.querySelector('.registry-item:not(:disabled)')?.click();
  });

  // Remote commands from the localhost connector API (see src-tauri start_api)
  window.__TAURI__?.event.listen('remote-mine', ({ payload }) => {
    els.sourceText.value = payload;
    handleParse();
    setStatus('REMOTE ▸ SENTENCE MINED');
  });
  window.__TAURI__?.event.listen('remote-suggest', ({ payload }) => {
    try {
      const { suggestions } = JSON.parse(payload);
      const shown = renderAiSuggestions(suggestions || []);
      els.aiStatus.textContent = shown
        ? `${shown} suggestions — review and apply.`
        : 'No valid suggestions received.';
      if (!els.aiDialog.open) els.aiDialog.showModal();
      setStatus(`AI SUGGEST ▸ ${shown} RECEIVED`);
    } catch { setStatus('AI SUGGEST ▸ BAD PAYLOAD'); }
  });
  window.__TAURI__?.event.listen('remote-tag', ({ payload }) => {
    try {
      const { text, tag } = JSON.parse(payload);
      if (!registry.some(g => g.id === tag)) { setStatus(`REMOTE TAG ▸ UNKNOWN "${tag}"`); return; }
      const range = findSegmentRange(text);
      if (!range) { setStatus('REMOTE TAG ▸ WORDS NOT FOUND'); return; }
      selectRange(range[0], range[1]);
      assignTag(tag);
    } catch { setStatus('REMOTE TAG ▸ BAD PAYLOAD'); }
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

// ---- Plugin manager (external programs registered in plugins.toml) ----

// Loading bar stays on while any plugin run is in flight (they can overlap)
let pluginRunsActive = 0;

function pluginRunStarted(name) {
  pluginRunsActive++;
  const label = `▸ RUNNING ${name.toUpperCase()}…`;
  for (const bar of [els.pluginsLoading, els.aiLoading]) {
    bar.dataset.label = label; // suggest plugins land in the AI dialog — show progress in both
    bar.classList.add('on');
  }
}

function pluginRunFinished() {
  pluginRunsActive = Math.max(0, pluginRunsActive - 1);
  if (pluginRunsActive === 0) {
    els.pluginsLoading.classList.remove('on');
    els.aiLoading.classList.remove('on');
  }
}

async function loadPlugins(notify = false) {
  if (!invoke) {
    els.pluginsList.textContent = 'Available in the desktop app only.';
    return;
  }
  try {
    const { path, plugins } = await invoke('load_plugins');
    els.pluginsPath.textContent = path;
    els.pluginsList.innerHTML = '';
    if (plugins.length === 0) {
      els.pluginsList.textContent = 'No plugins registered — add entries to the file above, then RELOAD.';
    }
    plugins.forEach(p => {
      const row = document.createElement('div');
      row.className = 'ai-row';
      const info = document.createElement('div');
      info.className = 'ai-info';
      info.appendChild(makeSpan('ai-text', p.name));
      if (p.description) info.appendChild(makeSpan('ai-reason', p.description));
      const run = document.createElement('button');
      run.textContent = 'RUN';
      run.addEventListener('click', async () => {
        run.disabled = true;
        run.textContent = 'WORKING';
        pluginRunStarted(p.name);
        els.pluginsStatus.textContent = `Running ${p.name}…`;
        try {
          els.pluginsStatus.textContent = await invoke('run_plugin', { command: p.command });
        } catch (err) {
          els.pluginsStatus.textContent = `Failed: ${err}`;
        }
        pluginRunFinished();
        run.textContent = 'RUN';
        run.disabled = false;
      });
      row.append(info, run);
      els.pluginsList.appendChild(row);
    });
    if (notify) setStatus(`PLUGINS ▸ ${plugins.length} LOADED`);
  } catch (err) {
    els.pluginsStatus.textContent = `Could not load: ${err}`;
  }
}

// ---- AI tag suggestions (pushed in by external plugins via the connector API) ----

// Anchor suggestions to their words, not indices — applying one suggestion
// merges segments and would shift every index-based reference.
function findSegmentRange(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const idx = segments.map((s, i) => ({ s, i })).filter(x => !x.s.isPunctuation);
  for (let a = 0; a <= idx.length - words.length; a++) {
    let ok = true;
    for (let k = 0; k < words.length; k++) {
      if (idx[a + k].s.text.toLowerCase() !== words[k]) { ok = false; break; }
    }
    if (ok) return [idx[a].i, idx[a + words.length - 1].i];
  }
  return null;
}

let lastSuggestions = [];

function renderAiSuggestions(suggestions) {
  els.aiResults.innerHTML = '';
  const valid = suggestions.filter(s => registry.some(g => g.id === s.tag));
  lastSuggestions = valid;
  valid.forEach(s => {
    const row = document.createElement('div');
    row.className = 'ai-row';

    const info = document.createElement('div');
    info.className = 'ai-info';
    info.appendChild(makeSpan('ai-text', s.text));
    info.appendChild(makeSpan('ai-tag', registry.find(g => g.id === s.tag).label));
    if (s.reason) info.appendChild(makeSpan('ai-reason', s.reason));

    const btn = document.createElement('button');
    btn.textContent = 'APPLY';
    btn.disabled = !findSegmentRange(s.text);
    btn.addEventListener('click', () => {
      const range = findSegmentRange(s.text);
      if (!range) { btn.disabled = true; setStatus('SEGMENTS CHANGED — RE-SUGGEST'); return; }
      selectRange(range[0], range[1]);
      assignTag(s.tag);
      btn.disabled = true;
    });

    row.append(info, btn);
    els.aiResults.appendChild(row);
  });
  return valid.length;
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

function splitSentences(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('en', { granularity: 'sentence' });
    return [...seg.segment(text)].map(s => s.segment.trim()).filter(Boolean);
  }
  // ponytail: naive fallback — breaks on "Mr. Smith"; Intl.Segmenter is the real path
  return text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
}

function updateQueueUI() {
  if (queue.length < 2) { els.queueBar.style.display = 'none'; return; }
  els.queueBar.style.display = 'flex';
  els.queuePos.textContent = `${queueIndex + 1} / ${queue.length}`;
  els.queuePrev.disabled = queueIndex === 0;
  els.queueNext.disabled = queueIndex === queue.length - 1;
}

// Step through a multi-sentence source; tagged work is kept in the library
function queueStep(dir) {
  const next = queueIndex + dir;
  if (next < 0 || next >= queue.length) return;
  if (segments.some(s => s.tag)) saveToLibrary(true);
  queueIndex = next;
  els.sourceText.value = queue[queueIndex];
  mineCurrent();
}

// Mine the source box. Multi-sentence sources become a queue; re-mining the
// sentence already in the box keeps the queue position.
function handleParse() {
  const text = els.sourceText.value.trim();
  if (!text) return;
  if (!(queue.length && text === queue[queueIndex])) {
    const sentences = splitSentences(text);
    queue = sentences.length > 1 ? sentences : [];
    queueIndex = 0;
    if (queue.length) els.sourceText.value = queue[0];
  }
  mineCurrent();
}

function mineCurrent() {
  const raw = els.sourceText.value.trim();
  if (!raw) return;
  if (segments.length) pushUndo();

  // **word**[tag_id] markdown (our own export format) round-trips into tags
  const imported = [];
  const clean = raw.replace(/\*\*(.+?)\*\*\[([\w-]+)\]/g, (_, text, tag) => {
    imported.push({ text, tag });
    return text;
  });
  if (imported.length) els.sourceText.value = clean;

  const tokens = clean.match(/[\w'-]+|[^\w\s]/g) || [];

  segments = tokens.map(token => ({
    text: token,
    tag: null,
    isPunctuation: /^[^\w\s]+$/.test(token)
  }));

  selectedIndices.clear();
  lastClickedIndex = null;

  let applied = 0;
  for (const { text, tag } of imported) {
    if (!registry.some(g => g.id === tag)) continue;
    const range = findSegmentRange(text);
    if (!range) continue;
    selectRange(range[0], range[1]);
    applyTagToSelection(tag);
    applied++;
  }

  renderSegmentsUI();
  updateRegistryState();
  updateQueueUI();
  showOutputView('placeholder');
  if (applied) triggerRender();
  setStatus(applied
    ? `MINED ${segments.length} SEGMENTS · ${applied} TAGS IMPORTED`
    : `MINED ${segments.length} SEGMENTS`);
}

function assignTag(tagId) {
  if (selectedIndices.size === 0) return;
  pushUndo();
  applyTagToSelection(tagId);
  renderSegmentsUI();
  updateRegistryState();
  setStatus(`TAGGED ▸ ${tagId.toUpperCase()}`);
  triggerRender();
}

// State change only — caller owns undo, render, and status.
function applyTagToSelection(tagId) {
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
}

function showOutputView(view) {
  const isText = view === 'markdown' || view === 'ruby' || view === 'cloze';
  els.previewPlaceholder.style.display = view === 'placeholder' ? 'block' : 'none';
  els.previewImage.style.display = view === 'image' ? 'block' : 'none';
  els.textOutputArea.style.display = isText ? 'block' : 'none';
  els.btnModeImg.classList.toggle('btn-primary', view === 'image' || view === 'placeholder');
  els.btnModeMd.classList.toggle('btn-primary', view === 'markdown');
  els.btnModeRuby.classList.toggle('btn-primary', view === 'ruby');
}

// Native save-as dialog; null means unavailable (browser) or cancelled.
async function pickSavePath(defaultName, filterName, ext) {
  const dialog = window.__TAURI__?.dialog;
  if (!dialog) return null;
  return dialog.save({ defaultPath: defaultName, filters: [{ name: filterName, extensions: [ext] }] });
}

// Save text through the dialog in the app, or a download in the browser.
async function saveTextAs(defaultName, filterName, ext, mime, text) {
  if (invoke && window.__TAURI__?.dialog) {
    const path = await pickSavePath(defaultName, filterName, ext);
    if (!path) { setStatus('SAVE CANCELLED'); return; }
    await invoke('save_text_file', { path, text });
    setStatus(`SAVED ▸ ${path}`);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('SAVED ▸ DOWNLOAD');
  }
}

// One CSV row per tagged segment across the whole library (Anki-importable);
// falls back to the current sentence when the library is empty.
function libraryCsv() {
  const byId = Object.fromEntries(registry.map(g => [g.id, g]));
  const entries = library.length
    ? library
    : (segments.some(s => s.tag) ? [{ text: els.sourceText.value.trim(), segments }] : []);
  const rows = [['term', 'tag', 'tag label', 'definition', 'sentence']];
  for (const e of entries) {
    for (const s of e.segments) {
      if (!s.tag) continue;
      const g = byId[s.tag];
      rows.push([s.text, s.tag, g?.label ?? s.tag.replace(/_/g, ' '), g?.def ?? '', e.text]);
    }
  }
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
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

// Measures and lays out the diagram — silver text, gold underline, cyan tag
// label on the abyss background. Shared by the canvas (PNG) and SVG renderers.
async function computeDiagram() {
  const { family, size } = outputFontPrefs();
  const fontSize = size, tagSize = Math.max(12, Math.round(size * 0.53)), padX = 40, padY = 40, spacing = 15;
  const maxLineWidth = 1200; // wrap long sentences instead of one endless strip
  const rowHeight = fontSize + 9 + tagSize + 5 + 30;
  const font = `${fontSize}px '${family}'`;
  const tagFont = `${tagSize}px '${family}'`;
  await document.fonts.load(font); // measure with the real font, not the fallback
  if (!document.fonts.check(font)) setStatus(`FONT "${family.toUpperCase()}" NOT FOUND — USING FALLBACK`);

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

  return {
    canvas, ctx, layout, family, font, tagFont, fontSize, tagSize, padY, rowHeight,
    width: Math.ceil(maxX - spacing + padX),
    height: padY + fontSize + row * rowHeight + 9 + tagSize + 5 + padY
  };
}

async function triggerRender() {
  if (segments.length === 0 || els.textOutputArea.style.display === 'block') return;
  const d = await computeDiagram();
  const { canvas, ctx } = d;

  canvas.width = d.width; // resizing resets ctx state
  canvas.height = d.height;
  if (diagramStyle.mode !== 'transparent') {
    if (diagramStyle.mode === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, diagramStyle.bg1);
      g.addColorStop(1, diagramStyle.bg2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = diagramStyle.bg1;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const { x, row: r, slot, w, tagW, seg } of d.layout) {
    const baseY = d.padY + d.fontSize + r * d.rowHeight;
    const lineY = baseY + 9;
    const tagY = lineY + d.tagSize + 5;

    ctx.font = d.font;
    ctx.fillStyle = diagramStyle.text;
    ctx.fillText(seg.text, x + (slot - w) / 2, baseY);

    if (seg.tag) {
      ctx.strokeStyle = diagramStyle.line;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + slot, lineY);
      ctx.stroke();
      ctx.font = d.tagFont;
      ctx.fillStyle = diagramStyle.tag;
      ctx.fillText(seg.tag.replace(/_/g, ' '), x + (slot - tagW) / 2, tagY);
    }
  }

  els.previewImage.src = canvas.toDataURL('image/png');
  lastCanvas = canvas;
  // Mirror the PNG to the Rust side so plugins can GET /render
  invoke?.('sync_render', { pngBase64: els.previewImage.src.split(',')[1] });
  showOutputView('image');
}

// Same layout as the canvas renderer, as a standalone SVG. SVG text baselines
// match canvas fillText, so coordinates carry over 1:1.
function diagramSvg(d) {
  const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fam = `${escXml(d.family)}, monospace`;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}">`
  ];
  if (diagramStyle.mode === 'gradient') {
    parts.push(
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${diagramStyle.bg1}"/><stop offset="1" stop-color="${diagramStyle.bg2}"/></linearGradient></defs>`,
      '<rect width="100%" height="100%" fill="url(#bg)"/>'
    );
  } else if (diagramStyle.mode !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${diagramStyle.bg1}"/>`);
  }
  for (const { x, row: r, slot, w, tagW, seg } of d.layout) {
    const baseY = d.padY + d.fontSize + r * d.rowHeight;
    const lineY = baseY + 9;
    const tagY = lineY + d.tagSize + 5;
    parts.push(`<text x="${(x + (slot - w) / 2).toFixed(1)}" y="${baseY}" font-family="${fam}" font-size="${d.fontSize}" fill="${diagramStyle.text}">${escXml(seg.text)}</text>`);
    if (seg.tag) {
      parts.push(`<line x1="${x.toFixed(1)}" y1="${lineY}" x2="${(x + slot).toFixed(1)}" y2="${lineY}" stroke="${diagramStyle.line}"/>`);
      parts.push(`<text x="${(x + (slot - tagW) / 2).toFixed(1)}" y="${tagY}" font-family="${fam}" font-size="${d.tagSize}" fill="${diagramStyle.tag}">${escXml(seg.tag.replace(/_/g, ' '))}</text>`);
    }
  }
  parts.push('</svg>');
  return parts.join('\n');
}

init();
