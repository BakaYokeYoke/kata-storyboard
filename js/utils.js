/* Utilitaires communs et routage (?board=…, ?template=…, Kanban). */

/* ============================================================
   Utilitaires
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8);
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const baseUrl = () => location.href.split('?')[0].split('#')[0];
const boardUrl = id => `${baseUrl()}?board=${encodeURIComponent(id)}`;
const fmtDate = ts => ts ? new Date(ts).toLocaleString(LOCALE(), { dateStyle: 'short', timeStyle: 'short' }) : '—';

function toast(msg, { action, onAction, ms } = {}) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (action ? ` <button class="toast-act">${esc(action)}</button>` : '');
  if (action) t.querySelector('.toast-act').onclick = e => { e.stopPropagation(); t.classList.remove('show'); onAction?.(); };
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms || (action ? 6000 : 1800));
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('URL copiée'); }
  catch (e) { prompt('Copiez cette URL :', text); }
}

function newBoard(id, title) {
  return {
    id, title: title || id,
    focusProcess: '', challengeBy: '', challengeResult: '', challengeVision: '',
    targetDate: '',
    target: emptyCondition(), current: emptyCondition(),
    experiments: [], obstacles: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

// Target et Current ont la même structure : c'est ce qui rend l'écart lisible.
const CONDITION_FIELDS = [
  { key: 'outcome', label: 'Outcome metric',    target: 'Résultat visé, chiffré…',                 current: 'Résultat mesuré aujourd\'hui…' },
  { key: 'process', label: 'Process metric',    target: 'Indicateur de process visé…',            current: 'Indicateur de process aujourd\'hui…' },
  { key: 'pattern', label: 'Operating pattern', target: 'Comment le processus doit fonctionner…', current: 'Comment le processus fonctionne aujourd\'hui…' },
];
function emptyCondition() { return { outcome: '', process: '', pattern: '' }; }

// Remet à niveau un storyboard créé avec une version précédente.
function migrate(b) {
  if (b.challenge && !b.challengeResult) b.challengeResult = b.challenge;
  delete b.challenge;
  for (const side of ['target', 'current']) {
    if (typeof b[side] !== 'object' || !b[side]) b[side] = { ...emptyCondition(), pattern: b[side] || '' };
  }
  b.target.toBe ||= [];
  b.run ||= { mode: 'routine', routine: [], items: [] };
  b.run.routine ||= []; b.run.items ||= [];
  b.session ||= newSession(b.id);
  b.timeblocks ||= [];
  b.metrics ||= {};
  b.current.asIs ||= [];
  const active = b.obstacles.find(o => o.focus && !o.done);
  b.experiments.forEach(x => {
    if (x.obstacleId === undefined) x.obstacleId = active ? active.id : null;
  });
  return b;
}

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

// Élargit un trou de la phrase Challenge à la taille de son texte (ou du placeholder).
const measureCtx = document.createElement('canvas').getContext('2d');
function fitWidth(el) {
  const cs = getComputedStyle(el);
  measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  el.style.width = Math.ceil(measureCtx.measureText(el.value || el.placeholder).width) + 1 + 'px';
}

/* ============================================================
   Routage : ?board=<id> → storyboard, sinon → liste
   ============================================================ */
const params = new URLSearchParams(location.search);
// Le storyboard peut être affiché seul (?board=…) ou dans le tiroir du Kanban (même page).
let inDrawer = params.has('drawer');
let SB_ROOT = null;   // conteneur où le storyboard est dessiné
// L'éditeur de storyboard sert aux Visions comme aux templates : seul le stockage change.
let DocStore = Store;

function route() {
  if (params.get('template')) { DocStore = Templates; renderBoard(params.get('template')); }
  else if (params.get('board')) renderBoard(params.get('board'));
  else renderKanban();
}
