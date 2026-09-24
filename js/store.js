/* Stockage : Visions, templates, corbeille, IndexedDB, annulation, sauvegardes, import / export. */

/* ============================================================
   Stockage — tout passe par ces 4 fonctions.
   Pour passer à un stockage partagé plus tard, seul ce bloc change.
   ============================================================ */
function makeStore(prefix) {
  return {
    prefix,
    list() {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(prefix)) {
          try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) {}
        }
      }
      return out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    },
    get(id) {
      try { return JSON.parse(localStorage.getItem(prefix + id)); } catch (e) { return null; }
    },
    save(doc) {
      doc.updatedAt = Date.now();
      localStorage.setItem(prefix + doc.id, JSON.stringify(doc));
    },
    remove(id) { localStorage.removeItem(prefix + id); },
    // Modifie quelques champs à partir de la version stockée (évite d'écraser le reste).
    patch(id, fields) {
      const doc = this.get(id);
      if (doc) { Object.assign(doc, fields); this.save(doc); }
      return doc;
    },
  };
}
const Store = makeStore('kata-sb:');        // Visions (cartes du Kanban)
const Templates = makeStore('kata-tpl:');   // Templates de Vision
const Trash = makeStore('kata-trash:');      // Corbeille : { id, kind, doc, deletedAt }

/* ---------- IndexedDB : fichiers joints, sauvegardes internes, réglages ---------- */
const IDB = (() => {
  let dbp;
  const open = () => dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('kata', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('files');
      db.createObjectStore('backups', { keyPath: 'id' });
      db.createObjectStore('meta');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const run = (store, mode, fn) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  }));
  return {
    get: (store, key) => run(store, 'readonly', s => s.get(key)),
    put: (store, val, key) => run(store, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key)),
    del: (store, key) => run(store, 'readwrite', s => s.delete(key)),
    all: store => run(store, 'readonly', s => s.getAll()),
    keys: store => run(store, 'readonly', s => s.getAllKeys()),
  };
})();
const blobToDataURL = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
const dataURLToBlob = url => fetch(url).then(r => r.blob());

/* ---------- État complet (toutes les clés de l'app) : annulation, sauvegardes, export ---------- */
const UNTRACKED = ['kata-recent-icons', 'kata-last-export', 'kata-daily-run'];
const isTracked = k => k.startsWith('kata-') && !UNTRACKED.includes(k);
function snapshotState() {
  const o = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (isTracked(k)) o[k] = localStorage.getItem(k); }
  return o;
}
function restoreState(snap, { merge = false } = {}) {
  if (!merge) Object.keys(snapshotState()).forEach(k => localStorage.removeItem(k));
  Object.entries(snap).forEach(([k, v]) => localStorage.setItem(k, v));
  GROUPS = loadGroups();
  CUSTOM_PROPS = loadCustomProps();
}

/* ---------- Annuler / rétablir (⌘Z / ⇧⌘Z) ---------- */
const UNDO = { stack: [], index: -1, applying: false };
function recordSnapshot() {
  if (UNDO.applying) return;
  const snap = snapshotState(), str = JSON.stringify(snap);
  if (UNDO.stack[UNDO.index]?.str === str) return;
  UNDO.stack = UNDO.stack.slice(0, UNDO.index + 1);
  UNDO.stack.push({ snap, str });
  if (UNDO.stack.length > 50) UNDO.stack.shift();
  UNDO.index = UNDO.stack.length - 1;
  if (UNDO.stack.length > 1) scheduleFileBackup();
}
function undo() {
  if (typeof peek !== 'undefined' && peek) return toast('Fermez la page ouverte pour annuler');
  if (UNDO.index <= 0) return toast('Rien à annuler');
  UNDO.index--;
  UNDO.applying = true; restoreState(UNDO.stack[UNDO.index].snap); renderKanban(); UNDO.applying = false;
  toast('Action annulée', { action: 'Rétablir', onAction: redo });
}
function redo() {
  if (typeof peek !== 'undefined' && peek) return;
  if (UNDO.index >= UNDO.stack.length - 1) return toast('Rien à rétablir');
  UNDO.index++;
  UNDO.applying = true; restoreState(UNDO.stack[UNDO.index].snap); renderKanban(); UNDO.applying = false;
  toast('Action rétablie');
}
document.addEventListener('keydown', e => {
  if (!document.body.classList.contains('kanban-page')) return;
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || !['z', 'y'].includes(e.key.toLowerCase())) return;
  const t = e.target;
  if (t.closest?.('input, textarea, [contenteditable="true"], .drawer.open')) return;   // annulation native dans les champs
  e.preventDefault();
  if (e.key.toLowerCase() === 'y' || e.shiftKey) redo(); else undo();
});

/* ---------- Corbeille (30 jours) ---------- */
const TRASH_DAYS = 30;
function moveToTrash(kind, id) {
  const S = kind === 'template' ? Templates : Store;
  const doc = S.get(id);
  if (!doc) return;
  Trash.save({ id, kind, doc, deletedAt: Date.now(), createdAt: Date.now() });
  S.remove(id);
  toast(`${kind === 'template' ? 'Template' : 'Page'} déplacé${kind === 'template' ? '' : 'e'} dans la corbeille`, { action: 'Annuler', onAction: () => { restoreFromTrash(id); renderKanban(); } });
}
function restoreFromTrash(id) {
  const t = Trash.get(id);
  if (!t) return;
  (t.kind === 'template' ? Templates : Store).save(t.doc);
  Trash.remove(id);
}
function purgeTrash() {
  Trash.list().forEach(t => { if (Date.now() - t.deletedAt > TRASH_DAYS * 86400000) Trash.remove(t.id); });
}
function openTrashMenu(anchor) {
  const items = Trash.list().sort((a, b) => b.deletedAt - a.deletedAt);
  const ago = t => { const d = Math.floor((Date.now() - t.deletedAt) / 86400000); return d ? `il y a ${d} j` : "aujourd'hui"; };
  openPop(anchor, [
    { header: `Corbeille · effacée après ${TRASH_DAYS} jours` },
    ...(items.length ? items.map(t => ({
      html: `<span class="tm-ico">${iconHTML(t.doc.icon) || DEFAULT_PAGE_ICON}</span><span class="name">${esc((t.kind === 'template' ? t.doc.name : t.doc.title) || 'Sans titre')}${t.kind === 'template' ? ' <span class="default">Template</span>' : ''}</span>`,
      value: ago(t), keepOpen: true,
      onClick: row => openPop(row, [
        { icon: 'reset', label: 'Restaurer', onClick: () => { restoreFromTrash(t.id); renderKanban(); toast('Restauré'); } },
        { icon: 'trash', label: 'Supprimer définitivement', danger: true, onClick: () => { Trash.remove(t.id); renderKanban(); } },
      ]),
    })) : [{ label: 'La corbeille est vide' }]),
    ...(items.length ? [{ sep: true }, { icon: 'trash', label: 'Vider la corbeille', danger: true, onClick: () => {
      if (!confirm(`Supprimer définitivement ${items.length} élément(s) ?`)) return;
      items.forEach(t => Trash.remove(t.id)); renderKanban();
    } }] : []),
  ]);
}

/* ---------- Sauvegardes internes (une par jour, 14 conservées) ---------- */
async function backupNow(reason = 'auto') {
  try {
    await IDB.put('backups', { id: Date.now(), date: new Date().toISOString(), reason, data: snapshotState() });
    const all = (await IDB.all('backups')).sort((a, b) => b.id - a.id);
    for (const old of all.slice(14)) await IDB.del('backups', old.id);
  } catch (e) {}
}
let dailyBackupDone = false;
async function dailyBackup() {
  if (dailyBackupDone) return;
  dailyBackupDone = true;
  try {
    const all = await IDB.all('backups');
    const today = new Date().toISOString().slice(0, 10);
    if (!all.some(b => b.date.slice(0, 10) === today && b.reason === 'auto')) await backupNow('auto');
  } catch (e) {}
}
async function openBackupsMenu(anchor) {
  const all = (await IDB.all('backups')).sort((a, b) => b.id - a.id);
  const label = b => ({ auto: 'quotidienne', import: 'avant import', restore: 'avant restauration', demo: 'avant démo' })[b.reason] || b.reason;
  openPop(anchor, [
    { header: 'Sauvegardes internes (14 dernières)' },
    ...(all.length ? all.map(b => ({
      icon: 'clockUI', label: new Date(b.id).toLocaleString(LOCALE(), { dateStyle: 'medium', timeStyle: 'short' }),
      value: `${Object.keys(b.data).filter(k => k.startsWith(Store.prefix)).length} pages · ${label(b)}`,
      onClick: async () => {
        if (!confirm('Restaurer cette sauvegarde ? L\'état actuel est d\'abord sauvegardé, et ⌘Z annule.')) return;
        await backupNow('restore');
        restoreState(b.data); renderKanban(); toast('Sauvegarde restaurée');
      },
    })) : [{ label: 'Aucune sauvegarde pour le moment' }]),
  ]);
}

/* ---------- Export / import complets ---------- */
async function buildExport() {
  const files = {};
  try {
    for (const k of await IDB.keys('files')) {
      const f = await IDB.get('files', k);
      if (f?.blob) files[k] = { name: f.name, type: f.type, data: await blobToDataURL(f.blob) };
    }
  } catch (e) {}
  return { app: 'kata-visions', version: 2, exportedAt: new Date().toISOString(), state: snapshotState(), files };
}
async function exportAll() {
  const data = await buildExport();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = `visions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  try { localStorage.setItem('kata-last-export', String(Date.now())); } catch (e) {}
  renderBackupBanner();
}
function importData() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (e) { return toast('Fichier illisible'); }
    let state, merge = false;
    if (data?.version === 2 && data.state) state = data.state;
    else if (Array.isArray(data)) { state = Object.fromEntries(data.filter(b => b?.id).map(b => [Store.prefix + b.id, JSON.stringify(b)])); merge = true; }
    else if (data?.visions) {
      state = Object.fromEntries([...(data.visions || []).map(b => [Store.prefix + b.id, JSON.stringify(b)]), ...(data.templates || []).map(t => [Templates.prefix + t.id, JSON.stringify(t)])]);
      merge = true;
    } else return toast('Format non reconnu');
    const n = Object.keys(state).filter(k => k.startsWith(Store.prefix)).length;
    if (!confirm(merge ? `Ajouter ${n} page(s) aux données actuelles ?` : `Remplacer toutes les données par ce fichier (${n} pages) ? Une sauvegarde est faite avant, et ⌘Z annule.`)) return;
    await backupNow('import');
    restoreState(state, { merge });
    for (const [k, file] of Object.entries(data.files || {})) {
      try { await IDB.put('files', { name: file.name, type: file.type, blob: await dataURLToBlob(file.data) }, k); } catch (e) {}
    }
    renderKanban();
    toast(`Import terminé : ${n} page(s)`);
  };
  inp.click();
}

/* ---------- Sauvegarde automatique dans un fichier (Chrome / Edge) ---------- */
let fileBackupTimer, fileBackupState = 'none';   // 'none' | 'on' | 'paused'
async function setupFileBackup() {
  if (!window.showSaveFilePicker) return toast('Disponible dans Chrome ou Edge. Sinon, utilisez « Exporter ».');
  try {
    const h = await showSaveFilePicker({ suggestedName: 'visions-sauvegarde.json', types: [{ description: 'Sauvegarde', accept: { 'application/json': ['.json'] } }] });
    await IDB.put('meta', h, 'backupHandle');
    await writeFileBackup(true);
    toast('Sauvegarde automatique activée');
  } catch (e) { if (e.name !== 'AbortError') toast('Impossible d\'activer la sauvegarde : ' + e.message); }
}
async function writeFileBackup(interactive = false) {
  try {
    const h = await IDB.get('meta', 'backupHandle');
    if (!h) { fileBackupState = 'none'; return renderBackupBanner(); }
    let perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted' && interactive) perm = await h.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { fileBackupState = 'paused'; return renderBackupBanner(); }
    const w = await h.createWritable();
    await w.write(JSON.stringify(await buildExport()));
    await w.close();
    fileBackupState = 'on';
    localStorage.setItem('kata-last-export', String(Date.now()));
    renderBackupBanner();
  } catch (e) { fileBackupState = 'paused'; renderBackupBanner(); }
}
function scheduleFileBackup() { clearTimeout(fileBackupTimer); fileBackupTimer = setTimeout(() => writeFileBackup(false), 4000); }
async function stopFileBackup() { await IDB.del('meta', 'backupHandle'); fileBackupState = 'none'; renderBackupBanner(); toast('Sauvegarde automatique désactivée'); }

// Bandeau discret : sauvegarde en pause, ou dernière sauvegarde trop ancienne
function renderBackupBanner() {
  const el = $('#backupBanner');
  if (!el) return;
  const last = +localStorage.getItem('kata-last-export') || 0;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  let html = '';
  if (fileBackupState === 'paused') html = `Sauvegarde automatique en pause. <button data-bk="resume">Réactiver</button>`;
  else if (fileBackupState !== 'on' && (days === null || days >= 7)) {
    html = `${days === null ? 'Aucune sauvegarde de vos données hors du navigateur.' : `Dernière sauvegarde il y a ${days} jours.`}
      <button data-bk="export">Exporter</button>${window.showSaveFilePicker ? '<button data-bk="auto">Sauvegarde automatique…</button>' : ''}`;
  }
  el.innerHTML = html;
  el.hidden = !html;
  el.onclick = e => {
    const b = e.target.closest('[data-bk]');
    if (!b) return;
    e.stopPropagation();
    ({ resume: () => writeFileBackup(true), export: exportAll, auto: setupFileBackup })[b.dataset.bk]();
  };
}

// Demande au navigateur de ne pas effacer les données (réduit le risque d'éviction, Safari compris)
try { navigator.storage?.persist?.(); } catch (e) {}
