/* Vue Kanban : colonnes, sous-groupes, cartes, glisser-déposer, barre d'outils. */

/* ============================================================
   Vue Kanban — chaque carte est une Vision, qui porte un storyboard
   ============================================================ */
const STATUSES = [
  { key: 'incoming', label: 'Incoming',      emoji: '⏯️', color: 'gray' },
  { key: 'tomorrow', label: 'Tomorrow',      emoji: '⏭️', color: 'gray' },
  { key: 'goal',     label: 'Daily Goal',    emoji: '🌞', color: 'purple' },
  { key: 'wip',      label: 'Ongoing WIP',   emoji: '✋', color: 'yellow' },
  { key: 'success',  label: 'Daily Success', emoji: '✅', color: 'green' },
];
// Sous-groupes (Pro/Perso) : modifiables, comme les options d'une propriété Notion.
const GROUPS_KEY = 'kata-groups';
const GROUP_COLORS = ['gray', 'blue', 'purple', 'green', 'yellow', 'orange', 'pink', 'red', 'brown'];
function loadGroups() {
  try { const g = JSON.parse(localStorage.getItem(GROUPS_KEY)); if (Array.isArray(g) && g.length) return g; } catch (e) {}
  return [{ key: 'perso', label: 'Perso', color: 'gray' }, { key: 'pro', label: 'Pro', color: 'blue' }];
}
let GROUPS = loadGroups();
function saveGroups() { try { localStorage.setItem(GROUPS_KEY, JSON.stringify(GROUPS)); } catch (e) {} }
// Statuts de la version précédente → nouvelles colonnes
const OLD_STATUS = { todo: 'incoming', doing: 'wip', paused: 'tomorrow', done: 'success' };

const statusOf = b => STATUSES.some(s => s.key === b.status) ? b.status : (OLD_STATUS[b.status] || 'incoming');
const groupOf = b => GROUPS.some(g => g.key === b.group) ? b.group : GROUPS[0].key;
const statusDef = key => STATUSES.find(s => s.key === key);
const groupDef = key => GROUPS.find(g => g.key === key);
const pill = def => `<span class="n-pill c-${def.color}"><span class="dot"></span>${def.emoji ? def.emoji + ' ' : ''}${esc(def.label)}</span>`;

/* Icônes (tracé fin, façon Notion) */
const ICONS = {
  board:  '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6 3v10M10 3v10"/>',
  filter: '<path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/>',
  sort:   '<path d="M5 3v10M5 13l-2.5-2.5M5 13l2.5-2.5M11 13V3M11 3L8.5 5.5M11 3l2.5 2.5"/>',
  search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
  sliders:'<path d="M2 5h7M12 5h2M2 11h2M7 11h7"/><circle cx="10.5" cy="5" r="1.5"/><circle cx="5.5" cy="11" r="1.5"/>',
  dots:   '<circle cx="3.5" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="12.5" cy="8" r=".9" fill="currentColor"/>',
  plus:   '<path d="M8 3v10M3 8h10"/>',
  pencil: '<path d="M10.5 2.5l3 3L6 13H3v-3z"/>',
  chevron:'<path d="M4.5 6.5L8 10l3.5-3.5"/>',
  tri:    '<path d="M4 6h8l-4 5z" fill="currentColor" stroke="none"/>',
  trash:  '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/>',
  peek:   '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M9.5 3v10"/>',
  close:  '<path d="M4 4l4 4-4 4M8.5 4l4 4-4 4"/>',
  copy:   '<rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4a1 1 0 0 1 1-1h6.5"/>',
  move:   '<path d="M3 8h10M9 4l4 4-4 4"/>',
  hide:   '<path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z"/><circle cx="8" cy="8" r="1.8"/><path d="M2.5 2.5l11 11"/>',
  status: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
  group:  '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
  star:   '<path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1l-3.4 1.8.7-3.8L2.5 6.5l3.8-.5z"/>',
  check:  '<path d="M3.5 8.5l3 3 6-7"/>',
  download:'<path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10"/>',
  reset:  '<path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5V5h2.5"/>',
  doc:    '<path d="M4 2.5h5l3 3v8H4z"/><path d="M9 2.5v3h3"/>',
  eye:    '<path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
  eyeOff: '<path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/><path d="M2.5 2.5l11 11"/>',
  back:   '<path d="M13 8H3M7 4L3 8l4 4"/>',
  x:      '<path d="M4 4l8 8M12 4l-8 8"/>',
  chevRight: '<path d="M6 3.5L10.5 8 6 12.5"/>',
  grip:   '<circle cx="6" cy="4" r=".9" fill="currentColor"/><circle cx="10" cy="4" r=".9" fill="currentColor"/><circle cx="6" cy="8" r=".9" fill="currentColor"/><circle cx="10" cy="8" r=".9" fill="currentColor"/><circle cx="6" cy="12" r=".9" fill="currentColor"/><circle cx="10" cy="12" r=".9" fill="currentColor"/>',
  text:   '<path d="M2.5 4h11M2.5 8h11M2.5 12h7"/>',
  calendar:'<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>',
  hash:   '<path d="M6 2.5l-1.5 11M11.5 2.5L10 13.5M3 6h10.5M2.5 10H13"/>',
  select: '<circle cx="8" cy="8" r="5.5"/><path d="M5.8 7L8 9.2 10.2 7"/>',
  subgroup:'<rect x="2.5" y="2.5" width="3" height="3" rx=".5"/><rect x="6.5" y="2.5" width="3" height="3" rx=".5"/><rect x="10.5" y="2.5" width="3" height="3" rx=".5"/><rect x="2.5" y="10.5" width="3" height="3" rx=".5"/><rect x="6.5" y="10.5" width="3" height="3" rx=".5"/><rect x="10.5" y="10.5" width="3" height="3" rx=".5"/><path d="M2.5 8h11"/>',
  timer:  '<circle cx="8" cy="9" r="5"/><path d="M8 9V6.5M6.5 2h3"/>',
  flag:   '<path d="M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8"/>',
  edit:   '<path d="M13 9v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H7"/><path d="M11 2l3 3-5.5 5.5H5.5v-3z"/>',
  repeat: '<path d="M2.5 7V6a2 2 0 0 1 2-2h9M11 1.5L13.5 4 11 6.5M13.5 9v1a2 2 0 0 1-2 2h-9M5 14.5L2.5 12 5 9.5"/>',
  expand: '<path d="M9.5 2.5h4v4M13.5 2.5L9 7M6.5 13.5h-4v-4M2.5 13.5L7 9"/>',
  shuffle:'<path d="M2 4.5h2.5c3 0 4 7 7 7H14M12 9.5l2 2-2 2M2 11.5h2.5c1 0 1.8-.8 2.4-1.8M9.1 6.3c.6-1 1.4-1.8 2.4-1.8H14M12 2.5l2 2-2 2"/>',
  smile:  '<circle cx="8" cy="8" r="6"/><path d="M5.5 9.5c.6 1 1.4 1.5 2.5 1.5s1.9-.5 2.5-1.5"/><circle cx="6" cy="6.5" r=".6" fill="currentColor"/><circle cx="10" cy="6.5" r=".6" fill="currentColor"/>',
  checkbox:'<rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M5.3 8.2l1.9 1.9 3.5-4"/>',
  link:   '<path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1"/>',
  multi:  '<path d="M6 4.5h7.5M6 8h7.5M6 11.5h7.5"/><circle cx="3" cy="4.5" r=".9" fill="currentColor"/><circle cx="3" cy="8" r=".9" fill="currentColor"/><circle cx="3" cy="11.5" r=".9" fill="currentColor"/>',
  people: '<circle cx="6" cy="5.5" r="2.3"/><path d="M1.8 13c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4"/><circle cx="11.5" cy="6" r="1.8"/><path d="M11 9.2c2 0 3.5 1.3 3.5 3.3"/>',
  clip:   '<path d="M13 7.5l-5.3 5.3a3 3 0 0 1-4.3-4.3l5.6-5.6a2 2 0 0 1 2.9 2.9L6.4 11.3a1 1 0 0 1-1.4-1.4L10 4.9"/>',
  at:     '<circle cx="8" cy="8" r="2.6"/><path d="M10.6 8v1a1.9 1.9 0 0 0 3.8 0V8A6.4 6.4 0 1 0 12 13"/>',
  phone:  '<path d="M4.5 2h2l1 3-1.5 1a8 8 0 0 0 4 4l1-1.5 3 1v2a1.5 1.5 0 0 1-1.6 1.5A11.5 11.5 0 0 1 3 3.6 1.5 1.5 0 0 1 4.5 2z"/>',
  sigma:  '<path d="M12.5 3h-9l5 5-5 5h9"/>',
  arrowUR:'<path d="M4.5 11.5l7-7M5.5 4.5h6v6"/>',
  clockUI:'<circle cx="8" cy="8" r="5.8"/><path d="M8 4.8V8l2.2 1.4"/>',
  userUI: '<circle cx="8" cy="8" r="5.8"/><circle cx="8" cy="6.8" r="2"/><path d="M4.3 12.3c.8-1.4 2.1-2.1 3.7-2.1s2.9.7 3.7 2.1"/>',
  idUI:   '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M5 6.5v3M7.5 6.5h1.3a1.5 1.5 0 0 1 0 3H7.5z"/>',
  streakUI:'<rect x="1.5" y="6" width="3" height="3" rx=".6" fill="currentColor"/><rect x="6.5" y="6" width="3" height="3" rx=".6" fill="currentColor"/><rect x="11.5" y="6" width="3" height="3" rx=".6"/>',
  db:     '<ellipse cx="8" cy="4" rx="5" ry="2"/><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2"/>',
};
const icon = name => `<svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* État de la vue (filtre, tri, groupes repliés…) : préférence locale */
const VIEW_KEY = 'kata-view';
function loadView() {
  const base = {
    hidden: [], collapsed: [], sort: 'manual', sortDir: 'asc', groups: [], statuses: [], subgroups: true,
    props: ['challenge', 'obstacle', 'due', 'experiments'],   // propriétés visibles, dans l'ordre
    order: STATUSES.map(st => st.key),                        // ordre des colonnes
    hideEmptyCols: false, colorCols: true, hideEmptySub: false, hiddenSub: [],
    noCreate: [],                                             // colonnes où l'on ne crée pas de carte
    cf: {},                                                   // filtres sur les autres propriétés { clé: [valeurs] }
    agg: {},                                                  // calcul affiché par colonne { colonne: { fn, prop } }
    subAgg: true,                                             // nombre affiché à côté des sous-groupes
    std: { goal: { wip: 1 }, wip: { wip: 1 } },               // standards par colonne : { wip, aging (jours) }
    unsplit: ['wip'],                                         // colonnes non séparées par sous-groupe
  };
  let v;
  try { v = { ...base, ...JSON.parse(localStorage.getItem(VIEW_KEY) || '{}') }; } catch (e) { v = base; }
  v.props = v.props.filter(k => allProps().some(p => p.key === k));
  v.cf = Object.fromEntries(Object.entries(v.cf || {}).filter(([k, a]) => propDef(k) && a?.length));
  if (v.sort !== 'manual' && v.sort !== 'title' && !propDef(v.sort)) v.sort = 'manual';
  return v;
}
function saveView(v) { try { localStorage.setItem(VIEW_KEY, JSON.stringify(v)); } catch (e) {} }

/* Menu contextuel générique (popover Notion) */
function openPop(anchor, items) {
  closePop();
  const pop = document.createElement('div');
  pop.className = 'n-pop';
  pop.id = 'nPop';
  pop.innerHTML = items.map((it, i) => {
    if (it.sep) return '<hr>';
    if (it.header) return `<div class="label">${esc(it.header)}</div>`;
    return `<div class="row ${it.danger ? 'danger' : ''}" data-i="${i}">
      ${it.icon ? `<span class="ic">${icon(it.icon)}</span>` : ''}
      ${it.html || `<span class="name">${esc(it.label)}</span>`}
      ${it.value ? `<span class="val">${esc(it.value)}</span>` : ''}
      ${it.switch !== undefined ? `<span class="n-switch ${it.switch ? 'on' : ''}"></span>` : ''}
      ${it.checked ? `<span class="check">${icon('check')}</span>` : ''}
    </div>`;
  }).join('');
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  pop.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  pop.onclick = e => {
    e.stopPropagation();
    const row = e.target.closest('[data-i]');
    if (!row) return;
    const it = items[+row.dataset.i];
    if (!it.keepOpen) closePop();
    it.onClick?.(row);
  };
}
function closePop() {
  $('#nPop')?.remove();
  document.querySelectorAll('.n-card-tools.open').forEach(t => t.classList.remove('open'));
}

function migrateVisions() {
  let seq = Math.max(0, ...Store.list().map(b => b.seq || 0));
  Store.list().forEach(b => {
    const fix = {};
    if (statusOf(b) !== b.status || groupOf(b) !== b.group) Object.assign(fix, { status: statusOf(b), group: groupOf(b) });
    if (b.seq == null) fix.seq = ++seq;
    if (!b.createdAt || b.createdAt < 1e11) fix.createdAt = (b.updatedAt || Date.now()) - (1000 - (b.createdAt || 0)) * 60000;   // anciennes démos : numéro d'ordre
    if (!b.statusSince) fix.statusSince = b.updatedAt || Date.now();
    if (Object.keys(fix).length) { const d = Store.get(b.id); Object.assign(d, fix); localStorage.setItem(Store.prefix + d.id, JSON.stringify(d)); }
  });
}
const nextSeq = () => Math.max(0, ...Store.list().map(b => b.seq || 0)) + 1;
// Changement de colonne : on note la date d'entrée (sert à l'Aging)
function setStatus(St, id, status, extra = {}) {
  const d = St.get(id);
  if (!d) return;
  St.patch(id, statusOf(d) === status ? extra : { ...extra, status, statusSince: Date.now() });
}
const ageDays = b => Math.floor((Date.now() - (b.statusSince || b.updatedAt || Date.now())) / DAY);

function challengeText(b) {
  if (!b.challengeResult) return '';
  return `D'ici ${b.challengeBy || '…'}, ${b.challengeResult}.`;
}
