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
  bolt:   '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/>',
  gear:   '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  cursor: '<path d="M3.5 2.5l9 4-4 1.3-1.3 4z"/><path d="M8.5 7.8l3.5 3.5"/>',
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
    autoTomorrow: true, autoSuccess: true, autoRecur: true,  // automatisations du matin
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
let popReturnFocus = null;   // élément qui retrouve le focus à la fermeture du menu
function openPop(anchor, items) {
  const returnTo = $('#nPop')?.contains(document.activeElement) ? popReturnFocus : document.activeElement;
  closePop(false);
  popReturnFocus = returnTo;
  const pop = document.createElement('div');
  pop.className = 'n-pop';
  pop.id = 'nPop';
  pop.setAttribute('role', 'menu');
  pop.innerHTML = items.map((it, i) => {
    if (it.sep) return '<hr>';
    if (it.header) return `<div class="label">${esc(it.header)}</div>`;
    return `<div class="row ${it.danger ? 'danger' : ''}" data-i="${i}" role="${it.switch !== undefined ? 'menuitemcheckbox' : it.checked !== undefined ? 'menuitemradio' : 'menuitem'}" tabindex="-1"${it.switch !== undefined ? ` aria-checked="${!!it.switch}"` : it.checked !== undefined ? ` aria-checked="${!!it.checked}"` : ''}>
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
  // Clavier : le premier élément actif reçoit le focus (sauf si le menu contient un champ de saisie)
  if (!pop.querySelector('input')) (pop.querySelector('.row[role^="menuitem"]'))?.focus({ preventScroll: true });
}
function closePop(restore = true) {
  const pop = $('#nPop');
  const hadFocus = pop?.contains(document.activeElement);
  pop?.remove();
  document.querySelectorAll('.n-card-tools.open').forEach(t => t.classList.remove('open'));
  if (restore && hadFocus && popReturnFocus?.isConnected) popReturnFocus.focus({ preventScroll: true });
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
  return `${LANG === 'en' ? 'By' : "D'ici"} ${b.challengeBy || '…'}, ${b.challengeResult}.`;
}

// Nom du Kanban : modifiable, repris dans le fil d'Ariane et l'onglet du navigateur.
const TITLE_KEY = 'kata-board-title';
const boardTitle = () => { try { return localStorage.getItem(TITLE_KEY) || 'Visions'; } catch (e) { return 'Visions'; } };

function renderKanban() {
  document.title = boardTitle();
  document.body.classList.add('kanban-page');
  if (!Store.list().length && !localStorage.getItem('kata-demo-seeded')) seedDemo();
  if (!Templates.list().length) seedTemplates();
  runRecurringTemplates();
  runDailyAutomation();
  migrateVisions();

  const view = loadView();
  const visions = sortedVisions(view);
  const inCell = (st, g) => visions.filter(b => statusOf(b) === st && (!g || groupOf(b) === g));
  let cols = orderedStatuses(view).filter(s => !view.hidden.includes(s.key));
  if (view.hideEmptyCols) cols = cols.filter(s => inCell(s.key).length);
  const hiddenCols = orderedStatuses(view).filter(s => view.hidden.includes(s.key));
  let rows = view.subgroups ? GROUPS.filter(g => !view.hiddenSub.includes(g.key)) : [null];
  if (view.subgroups && view.hideEmptySub) rows = rows.filter(g => visions.some(b => groupOf(b) === g.key));
  const nCols = Math.max(1, cols.length + (hiddenCols.length ? 1 : 0));


  // Une case = une colonne × un sous-groupe (g = null : toute la colonne, sans séparation).
  // Contrôle discret « réel / standard » : WIP (nombre de cartes) et Aging (jours dans la colonne)
  const checker = (st, cards) => {
    const std = view.std[st.key] || {};
    if (!std.wip && !std.aging) return '';
    const age = cards.length ? Math.max(...cards.map(ageDays)) : 0;
    const wipOver = std.wip && cards.length > std.wip, ageOver = std.aging && age > std.aging;
    return `<div class="n-check ${wipOver || ageOver ? 'over' : ''}" title="Réel / standard">
      ${std.wip ? `<span class="${wipOver ? 'bad' : ''}">WIP ${cards.length}/${std.wip}</span>` : ''}
      ${std.aging ? `<span class="${ageOver ? 'bad' : ''}">Aging ${age} j/${std.aging} j</span>` : ''}
    </div>`;
  };
  const cell = (st, g, style) => `
    <div class="n-cell c-${st.color}" style="${style}" data-status="${st.key}" data-group="${g ? g.key : ''}">
      ${checker(st, inCell(st.key, g?.key))}
      ${inCell(st.key, g?.key).map(b => visionCard(b, view.props, view.std[st.key]?.aging)).join('')}
      ${view.noCreate.includes(st.key) ? '' : `<button class="n-add" data-new="${st.key}" data-group="${g ? g.key : GROUPS[0].key}">${icon('plus')} New page</button>`}
    </div>`;
  const unsplit = st => view.subgroups && view.unsplit.includes(st.key);

  // Placement explicite : ligne 1 = en-têtes, puis (titre de sous-groupe + cases) par groupe.
  // Les colonnes non séparées forment une seule case qui traverse tous les sous-groupes.
  let rowNo = 2, groupsHTML = '';
  rows.forEach(g => {
    if (!g) {
      groupsHTML += cols.map((st, i) => cell(st, null, `grid-row:${rowNo};grid-column:${i + 1}`)).join('');
      rowNo++;
      return;
    }
    const collapsed = view.collapsed.includes(g.key);
    const n = visions.filter(b => groupOf(b) === g.key).length;
    groupsHTML += `
      <div class="n-group ${collapsed ? 'collapsed' : ''}" style="grid-row:${rowNo}">
        <button class="toggle" data-toggle="${g.key}" title="${collapsed ? 'Déplier' : 'Replier'}">${icon('tri')}</button>
        <span class="n-pill c-${g.color}" data-group-rename="${g.key}" title="Double-clic pour renommer">${esc(g.label)}</span>${view.subAgg ? `<span class="n-count">${n}</span>` : ''}
        <span class="n-group-tools">
          <button class="n-icon-btn" data-group-more="${g.key}" title="Options du groupe">${icon('dots')}</button>
          <button class="n-icon-btn" data-group-add="${g.key}" title="Nouvelle page">${icon('plus')}</button>
        </span>
      </div>`;
    rowNo++;
    if (!collapsed) {
      groupsHTML += cols.map((st, i) => unsplit(st) ? '' : cell(st, g, `grid-row:${rowNo};grid-column:${i + 1}`)).join('');
      rowNo++;
    }
  });
  if (view.subgroups && rows.length) {
    const from = 3, to = Math.max(rowNo, from + 1);   // de la 1re ligne de cases jusqu'à la dernière
    groupsHTML += cols.map((st, i) => unsplit(st) ? cell(st, null, `grid-row:${from} / ${to};grid-column:${i + 1}`) : '').join('');
  }

  const nFilters = countFilters(view);
  $('#app').innerHTML = `
    <header class="n-topbar">
      <span class="n-crumb">${icon('doc')}<span id="crumbTitle">${esc(boardTitle() || 'Sans titre')}</span></span>
      <span class="spacer"></span>
      <button class="n-icon-btn" id="pageSettings" title="Réglages" aria-label="Réglages">${icon('gear')}</button>
      <button class="n-icon-btn" id="pageMore" title="Plus d'actions">${icon('dots')}</button>
    </header>
    <main class="n-page" aria-label="Tableau">
      <h1 class="n-title" id="boardTitle" contenteditable="true" spellcheck="false" data-placeholder="Sans titre">${esc(boardTitle())}</h1>
      <div class="n-bar">
        <span class="spacer"></span>
        <button class="n-icon-btn ${nFilters ? 'active' : ''}" id="btnFilter" title="Filtrer">${icon('filter')}</button>
        <button class="n-icon-btn ${view.sort !== 'manual' ? 'active' : ''}" id="btnSort" title="Trier">${icon('sort')}</button>
        <button class="n-icon-btn ${view.autoTomorrow || view.autoSuccess || view.autoRecur ? 'active' : ''}" id="btnAuto" title="Automations">${icon('bolt')}</button>
        <span class="n-search" id="search"><button class="n-icon-btn" id="btnSearch" title="Rechercher">${icon('search')}</button><input id="searchInput" placeholder="Rechercher…"></span>
        <button class="n-icon-btn ${panelPage ? 'on' : ''}" id="btnSettings" title="Paramètres de la vue">${icon('sliders')}</button>
        <div class="n-new">
          <button class="main" id="newMain" title="Nouvelle Vision (template par défaut)">New</button>
          <button class="caret" id="newCaret" title="Choisir un template">${icon('chevron')}</button>
          <div class="n-menu" id="tplMenu" hidden></div>
        </div>
      </div>
      <div class="n-board-wrap">
        <div class="n-board ${view.colorCols ? '' : 'nocolor'}" style="grid-template-columns: repeat(${nCols}, 276px)">
          ${cols.map(st => `
            <div class="n-head c-${st.color}">
              ${pill(st)}<button class="n-count n-agg" data-agg="${st.key}" title="${esc(aggLabel(view.agg[st.key]))}">${esc(computeAgg(inCell(st.key), view.agg[st.key]))}</button>
              <span class="n-head-tools">
                <button class="n-icon-btn" data-col-more="${st.key}" title="Options du groupe">${icon('dots')}</button>
                ${view.noCreate.includes(st.key) ? '' : `<button class="n-icon-btn" data-col-add="${st.key}" title="Nouvelle page">${icon('plus')}</button>`}
              </span>
            </div>`).join('')}
          ${hiddenCols.length ? `
            <div class="n-head hidden-groups">
              <div class="n-hidden-label">Groupes masqués</div>
              ${hiddenCols.map(st => `<div class="n-hidden-row c-${st.color}" data-unhide="${st.key}" title="Afficher">${pill(st)}<span class="n-count">${inCell(st.key).length}</span></div>`).join('')}
            </div>` : ''}
          ${groupsHTML}
          ${view.subgroups ? `<div class="n-newgroup" id="newGroup" style="grid-row:${rowNo}">${icon('plus')} New group</div>` : ''}
        </div>
      </div>
    </main>
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" aria-hidden="true" inert role="dialog" aria-modal="true" aria-labelledby="peekTitle">
      <div class="peek-top">
        <button class="n-icon-btn" id="drawerClose" title="Fermer (Échap)">${icon('close')}</button>
        <button class="n-icon-btn" id="peekExpand" title="Agrandir" hidden>${icon('expand')}</button>
        <span class="spacer"></span>
        <button class="n-icon-btn" id="peekMore" title="Plus d'actions">${icon('dots')}</button>
      </div>
      <div class="peek-banner" id="peekBanner" hidden></div>
      <div class="peek-head">
        <button class="peek-icon" id="peekIcon" title="Changer l'icône"></button>
        <input class="peek-title" id="peekTitle" placeholder="Sans titre" autocomplete="off">
        <div class="peek-props" id="peekProps"></div>
      </div>
      <div class="sb-root" id="sbRoot"></div>
    </aside>`;

  const app = $('#app');

  const titleEl = $('#boardTitle');
  titleEl.oninput = () => {
    const t = titleEl.textContent.trim();
    try { localStorage.setItem(TITLE_KEY, t); } catch (e) {}
    document.title = t || 'Sans titre';
    $('#crumbTitle').textContent = t || 'Sans titre';
  };
  titleEl.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } };
  titleEl.onblur = () => { if (!titleEl.textContent.trim()) { titleEl.textContent = ''; } };

  // Cartes : ouverture, boutons ✎ / ⋯, glisser-déposer
  app.querySelectorAll('.n-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelectorAll('[data-btn-prop]').forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      executeButton(Store, id, customDef(btn.dataset.btnProp)); renderKanban();
    });
    card.onclick = e => { if (!card.dataset.justDragged && !e.target.closest('.n-card-tools, input, [data-card-icon]')) openPeek('vision', id); };
    const ico = card.querySelector('[data-card-icon]');
    if (ico) ico.onclick = e => {
      e.stopPropagation();
      closePop();
      openIconPicker(ico, val => { Store.patch(id, { icon: val }); renderKanban(); });
    };
    card.ondragstart = e => { e.dataTransfer.setData('text/plain', id); card.classList.add('dragging'); };
    card.ondragend = () => { card.classList.remove('dragging'); document.querySelectorAll('.n-drop-line').forEach(l => l.remove()); document.querySelectorAll('.n-cell.drop').forEach(c => c.classList.remove('drop')); };
    card.querySelector('[data-card="rename"]').onclick = e => { e.stopPropagation(); renameInline(card); };
    card.querySelector('[data-card="more"]').onclick = e => {
      e.stopPropagation();
      openPop(e.currentTarget, [
        { icon: 'peek', label: 'Ouvrir en aperçu', onClick: () => openPeek('vision', id) },
        { icon: 'pencil', label: 'Renommer', onClick: () => renameInline(card) },
        { icon: 'copy', label: 'Dupliquer', onClick: () => { duplicateVision(id); renderKanban(); } },
        { sep: true },
        { icon: 'trash', label: 'Supprimer', danger: true, onClick: () => { moveToTrash('vision', id); renderKanban(); } },
      ]);
      card.querySelector('.n-card-tools').classList.add('open');
    };
  });
  app.querySelectorAll('.n-cell[data-status]').forEach(cell => {
    cell.ondragover = e => { e.preventDefault(); showDropLine(cell, e.clientY); };
    cell.ondragleave = e => { if (!cell.contains(e.relatedTarget)) clearDropLine(); };
    cell.ondrop = e => { e.preventDefault(); dropCardInto(cell, e.dataTransfer.getData('text/plain'), e.clientY); };
  });
  enableTouchDrag(app);
  app.querySelectorAll('[data-new]').forEach(btn => btn.onclick = () => createVision(defaultTemplate(), btn.dataset.new, btn.dataset.group));

  // En-têtes de colonne : ⋯ et +
  app.querySelectorAll('[data-col-add]').forEach(btn => btn.onclick = () => createVision(defaultTemplate(), btn.dataset.colAdd));
  app.querySelectorAll('[data-col-more]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const key = btn.dataset.colMore;
    openPop(btn, [
      // La bascule garde le menu ouvert ; il se ferme en cliquant ailleurs.
      { icon: 'plus', label: 'Création de cartes', switch: !view.noCreate.includes(key), keepOpen: true, onClick: row => {
        const v = loadView();
        const on = v.noCreate.includes(key);
        v.noCreate = on ? v.noCreate.filter(k => k !== key) : [...v.noCreate, key];
        saveView(v); renderKanban();
        row.querySelector('.n-switch').classList.toggle('on', on);
      } },
      ...(view.subgroups ? [{ icon: 'subgroup', label: 'Séparer par sous-groupe', switch: !view.unsplit.includes(key), keepOpen: true, onClick: row => {
        const v = loadView();
        const merged = v.unsplit.includes(key);
        v.unsplit = merged ? v.unsplit.filter(k => k !== key) : [...v.unsplit, key];
        saveView(v); renderKanban();
        row.querySelector('.n-switch').classList.toggle('on', merged);
      } }] : []),
      { header: 'Standards (réel / standard)' },
      { icon: 'stack', label: 'WIP maximum', value: String(view.std[key]?.wip || '—'), onClick: () => {
        const n = prompt('Nombre maximum de cartes dans la colonne (vide = aucun)', view.std[key]?.wip || '');
        if (n === null) return;
        const v = loadView(); v.std[key] = { ...(v.std[key] || {}), wip: parseInt(n, 10) > 0 ? parseInt(n, 10) : undefined }; saveView(v); renderKanban();
      } },
      { icon: 'clockUI', label: 'Aging maximum (jours)', value: String(view.std[key]?.aging || '—'), onClick: () => {
        const n = prompt('Nombre maximum de jours dans la colonne (vide = aucun)', view.std[key]?.aging || '');
        if (n === null) return;
        const v = loadView(); v.std[key] = { ...(v.std[key] || {}), aging: parseInt(n, 10) > 0 ? parseInt(n, 10) : undefined }; saveView(v); renderKanban();
      } },
      { sep: true },
      { icon: 'hide', label: 'Masquer le groupe', onClick: () => { view.hidden.push(key); saveView(view); renderKanban(); } },
    ]);
  });
  app.querySelectorAll('[data-unhide]').forEach(row => row.onclick = () => {
    view.hidden = view.hidden.filter(k => k !== row.dataset.unhide); saveView(view); renderKanban();
  });
  app.querySelectorAll('[data-toggle]').forEach(btn => btn.onclick = () => {
    const k = btn.dataset.toggle;
    view.collapsed = view.collapsed.includes(k) ? view.collapsed.filter(x => x !== k) : [...view.collapsed, k];
    saveView(view); renderKanban();
  });

  // Calcul de colonne : Count / Percent / More options / Date
  app.querySelectorAll('[data-agg]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const col = btn.dataset.agg;
    const setAgg = agg => { const v = loadView(); v.agg[col] = agg; saveView(v); renderKanban(); };
    const cur = view.agg[col] || { fn: 'count_all' };
    const propsFor = kind => [
      ...(kind === true ? [{ key: '__title', label: 'Name', icon: 'text' }] : []),
      ...allProps().filter(p => kind === true || propKind(p.key) === kind || propKind(p.key) === 'any'),
    ];
    const fnMenu = (row, fn) => {
      const def = AGG_FNS[fn];
      if (!def.prop) return setAgg({ fn });
      const list = propsFor(def.prop);
      if (!list.length) return toast(def.prop === 'number' ? 'Aucune propriété numérique' : 'Aucune propriété de date');
      openPop(row, [{ header: def.label + ' — propriété' }, ...list.map(p => ({ icon: p.icon, label: p.label, checked: cur.fn === fn && cur.prop === p.key, onClick: () => setAgg({ fn, prop: p.key }) }))]);
    };
    const groupMenu = (row, group) => openPop(row, Object.entries(AGG_FNS).filter(([, d]) => d.group === group).map(([fn, d]) => ({
      label: d.label, checked: cur.fn === fn, value: d.prop ? '▸' : '', keepOpen: !!d.prop, onClick: r => fnMenu(r || row, fn),
    })));
    openPop(btn, ['Count', 'Percent', 'More options', 'Date'].map(g => ({ label: g, value: '▸', keepOpen: true, onClick: row => groupMenu(row, g) })));
  });

  // Sous-groupes : ⋯, + et « New group »
  app.querySelectorAll('[data-group-add]').forEach(btn => btn.onclick = () => createVision(defaultTemplate(), cols.find(c => !view.noCreate.includes(c.key))?.key || 'incoming', btn.dataset.groupAdd));
  app.querySelectorAll('[data-group-more]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const g = groupDef(btn.dataset.groupMore);
    const COLOR_NAMES = { default: 'Default', gray: 'Gray', brown: 'Brown', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink', red: 'Red' };
    openPop(btn, [
      { icon: 'subgroup', label: 'Edit groups', onClick: () => openPanel('subgroup') },
      { icon: 'eye', label: view.subAgg ? 'Hide aggregation' : 'Show aggregation', onClick: () => { view.subAgg = !view.subAgg; saveView(view); renderKanban(); } },
      { icon: 'eyeOff', label: 'Hide group', onClick: () => { view.hiddenSub.push(g.key); saveView(view); renderKanban(); } },
      { icon: 'trash', label: 'Move to Trash', onClick: () => {
        if (GROUPS.length === 1) return toast('Il faut garder au moins un groupe');
        const n = Store.list().filter(b => groupOf(b) === g.key).length;
        if (!confirm(`Supprimer le groupe « ${g.label} » ?${n ? ` Ses ${n} carte(s) passeront dans « ${GROUPS.find(x => x !== g).label} ».` : ''}`)) return;
        GROUPS = GROUPS.filter(x => x !== g); saveGroups();
        Store.list().filter(b => b.group === g.key).forEach(b => Store.patch(b.id, { group: GROUPS[0].key }));
        renderKanban();
      } },
      { sep: true },
      { header: 'Colors' },
      ...Object.entries(COLOR_NAMES).map(([c, l]) => ({ html: `<span class="sw c-${c}"></span><span class="name">${l}</span>`, checked: (g.color || 'default') === c, onClick: () => { g.color = c; saveGroups(); renderKanban(); } })),
    ]);
  });
  app.querySelectorAll('[data-group-rename]').forEach(pl => pl.ondblclick = () => {
    const g = groupDef(pl.dataset.groupRename);
    const name = prompt('Nom du groupe', g.label);
    if (name && name.trim()) { g.label = name.trim(); saveGroups(); renderKanban(); }
  });
  const newGroup = $('#newGroup');
  if (newGroup) newGroup.onclick = e => {
    e.stopPropagation();
    if (newGroup.querySelector('input')) return;
    newGroup.innerHTML = `${icon('plus')}<input placeholder="Nom du groupe" autocomplete="off">`;
    const input = newGroup.querySelector('input');
    input.focus();
    let done = false;
    const commit = save => {
      if (done) return; done = true;
      const label = input.value.trim();
      if (save && label) {
        const used = GROUPS.map(g => g.color);
        GROUPS.push({ key: 'g-' + uid(), label, color: GROUP_COLORS.find(c => !used.includes(c)) || 'gray' });
        saveGroups();
      }
      renderKanban();
    };
    input.onkeydown = ev => { if (ev.key === 'Enter') commit(true); if (ev.key === 'Escape') { ev.stopPropagation(); commit(false); } };
    input.onblur = () => commit(true);
  };

  // Barre d'outils : filtre, tri et réglages ouvrent le panneau « View settings »
  const togglePanel = page => e => { e.stopPropagation(); closePop(); panelPage === page ? closePanel() : openPanel(page); };
  $('#btnFilter').onclick = togglePanel('filter');
  $('#btnSort').onclick = togglePanel('sort');
  $('#btnAuto').onclick = togglePanel('automations');
  $('#btnSettings').onclick = togglePanel('root');
  $('#btnSearch').onclick = e => {
    e.stopPropagation();
    $('#search').classList.add('open');
    $('#searchInput').focus();
  };
  $('#searchInput').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    app.querySelectorAll('.n-card').forEach(c => c.classList.toggle('hidden-by-search', !!q && !c.innerText.toLowerCase().includes(q)));
  };
  $('#searchInput').onblur = e => { if (!e.target.value) $('#search').classList.remove('open'); };
  $('#pageSettings').onclick = e => { e.stopPropagation(); openSettingsMenu(e.currentTarget); };
  $('#pageMore').onclick = e => {
    e.stopPropagation();
    const anchor = e.currentTarget;
    const nTrash = Trash.list().length;
    openPop(anchor, [
      { icon: 'reset', label: 'Annuler', value: '⌘Z', onClick: undo },
      { icon: 'repeat', label: 'Rétablir', value: '⇧⌘Z', onClick: redo },
      { sep: true },
      { icon: 'trash', label: 'Corbeille', value: nTrash ? String(nTrash) : '', keepOpen: true, onClick: () => openTrashMenu(anchor) },
      { icon: 'clockUI', label: 'Sauvegardes internes…', keepOpen: true, onClick: () => openBackupsMenu(anchor) },
      ...(window.showSaveFilePicker ? [fileBackupState === 'on'
        ? { icon: 'db', label: 'Sauvegarde automatique : activée', value: 'Arrêter', onClick: stopFileBackup }
        : { icon: 'db', label: 'Sauvegarde automatique dans un fichier…', onClick: setupFileBackup }] : []),
      { icon: 'download', label: 'Exporter (JSON)', onClick: exportAll },
      { icon: 'clip', label: 'Importer (JSON)…', onClick: importData },
      { sep: true },
      { icon: 'reset', label: 'Réinitialiser la démo', danger: true, onClick: resetDemo },
    ]);
  };

  $('#newMain').onclick = () => createVision(defaultTemplate());
  $('#newCaret').onclick = e => { e.stopPropagation(); closePop(); closePanel(); toggleTemplateMenu(); };

  $('#scrim').onclick = closePeek;
  $('#drawerClose').onclick = closePeek;
  document.onclick = () => { $('#tplMenu').hidden = true; closeIconPicker(); closePop(); closePanel(); };
  document.onkeydown = e => {
    if (e.key !== 'Escape') return;
    if ($('#nPop') || !$('#tplMenu').hidden || $('#iconPicker')) { closePop(); $('#tplMenu').hidden = true; closeIconPicker(); return; }
    if (panelPage) return closePanel();
    closePeek();
  };

  if (panelPage) renderPanel();
  recordSnapshot();
  renderBackupBanner();
  if (!renderKanban.started) {
    renderKanban.started = true;
    purgeTrash();
    dailyBackup();
    migrateFilesToIDB();
    IDB.get('meta', 'backupHandle').then(h => { if (h) writeFileBackup(false); }).catch(() => {});
  }
}

/* Carte : titre + propriétés visibles, dans l'ordre choisi */
function visionCard(b, props = [], agingStd) {
  const parts = [];
  let chips = [];
  const flush = () => { if (chips.length) { parts.push(`<div class="chips">${chips.join('')}</div>`); chips = []; } };
  props.forEach(k => {
    const html = valueHTML(b, k, 'card');
    if (!html) return;
    if (isBlockProp(k)) { flush(); parts.push(`<div class="prop">${html}</div>`); }
    else chips.push(html);
  });
  if (agingStd && ageDays(b) > agingStd) chips.push(`<span class="n-chip aging" title="Dans cette colonne depuis ${ageDays(b)} j (standard ${agingStd} j)">⏳ ${ageDays(b)} j</span>`);
  flush();
  return `
    <div class="n-card" draggable="true" data-id="${esc(b.id)}" tabindex="0" aria-label="${esc(b.title || 'Sans titre')}">
      <div class="n-card-tools">
        <button data-card="rename" title="Renommer">${icon('pencil')}</button>
        <button data-card="more" title="Plus d'actions">${icon('dots')}</button>
      </div>
      <div class="t"><span class="ico" data-card-icon title="Changer l'icône">${iconHTML(b.icon) || DEFAULT_PAGE_ICON}</span>${b.title ? `<span class="tt">${esc(b.title)}</span>` : '<span class="tt untitled">Sans titre</span>'}</div>
      ${parts.join('')}
    </div>`;
}

// Renommage directement sur la carte (bouton ✎), comme dans Notion.
function renameInline(card) {
  const id = card.dataset.id;
  const span = card.querySelector('.tt');
  const input = document.createElement('input');
  input.value = Store.get(id).title || '';
  input.placeholder = 'Sans titre';
  span.replaceWith(input);
  card.draggable = false;
  input.focus(); input.select();
  let done = false;
  const commit = save => {
    if (done) return; done = true;
    if (save) Store.patch(id, { title: input.value.trim() });
    renderKanban();
  };
  input.onkeydown = e => { if (e.key === 'Enter') commit(true); if (e.key === 'Escape') { e.stopPropagation(); commit(false); } };
  input.onblur = () => commit(true);
}

async function resetDemo() {
  if (!confirm('Remplacer toutes les Visions et tous les templates par les données de démo ? (⌘Z annule)')) return;
  await backupNow('demo');
  Store.list().forEach(b => Store.remove(b.id));
  Templates.list().forEach(t => Templates.remove(t.id));
  seedDemo(); seedTemplates(); renderKanban();
}

/* ---------- Glisser-déposer des cartes (souris et tactile) ---------- */
// Position d'insertion : avant la première carte dont le milieu est sous le pointeur
function dropIndex(cell, y) {
  const cards = [...cell.querySelectorAll('.n-card:not(.dragging)')];
  const i = cards.findIndex(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
  return { cards, index: i < 0 ? cards.length : i };
}
function clearDropLine() {
  document.querySelectorAll('.n-drop-line').forEach(l => l.remove());
  document.querySelectorAll('.n-cell.drop').forEach(c => c.classList.remove('drop'));
}
function showDropLine(cell, y) {
  document.querySelectorAll('.n-cell.drop').forEach(c => c !== cell && c.classList.remove('drop'));
  cell.classList.add('drop');
  const { cards, index } = dropIndex(cell, y);
  const line = document.querySelector('.n-drop-line') || Object.assign(document.createElement('div'), { className: 'n-drop-line' });
  const before = cards[index] || cell.querySelector('.n-add');
  if (before) cell.insertBefore(line, before); else cell.appendChild(line);
}
// Dépose une carte dans une case : colonne / groupe, et rang entre ses voisines (ordre manuel)
function dropCardInto(cell, id, y) {
  const view = loadView();
  const { cards, index } = dropIndex(cell, y);
  clearDropLine();
  setStatus(Store, id, cell.dataset.status, cell.dataset.group ? { group: cell.dataset.group } : {});
  if (view.sort === 'manual') {
    const prev = cards[index - 1] && Store.get(cards[index - 1].dataset.id);
    const next = cards[index] && Store.get(cards[index].dataset.id);
    const rank = prev && next ? (rankOf(prev) + rankOf(next)) / 2
      : prev ? rankOf(prev) + 1000 : next ? rankOf(next) - 1000 : Date.now();
    Store.patch(id, { rank });
  } else if (cards.length) {
    toast('Un tri est actif : retirez-le (Sort → Manuel) pour réordonner à la main');
  }
  renderKanban();
}

// Tactile : appui long (0,35 s) pour soulever la carte, puis glisser au doigt.
function enableTouchDrag(root) {
  root.querySelectorAll('.n-card').forEach(card => {
    let timer = null, drag = null, sx = 0, sy = 0;
    const cancel = () => { clearTimeout(timer); timer = null; };
    card.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || e.target.closest('.n-card-tools, [data-card-icon], input')) return;
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      timer = setTimeout(() => {
        timer = null;
        const r = card.getBoundingClientRect();
        const ghost = card.cloneNode(true);
        Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', zIndex: 60, pointerEvents: 'none', opacity: '.9', transform: 'rotate(2deg)', boxShadow: '0 10px 30px rgba(15,15,15,.25)' });
        ghost.classList.add('n-ghost');
        document.body.appendChild(ghost);
        card.classList.add('dragging');
        drag = { ghost, dx: sx - r.left, dy: sy - r.top };
        navigator.vibrate?.(15);
      }, 350);
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      const t = e.touches[0];
      if (!drag) { if (Math.hypot(t.clientX - sx, t.clientY - sy) > 8) cancel(); return; }   // défilement normal
      e.preventDefault();
      drag.ghost.style.left = (t.clientX - drag.dx) + 'px';
      drag.ghost.style.top = (t.clientY - drag.dy) + 'px';
      const cell = document.elementFromPoint(t.clientX, t.clientY)?.closest('.n-cell[data-status]');
      if (cell) showDropLine(cell, t.clientY); else clearDropLine();
      // Défilement automatique près des bords
      const wrap = document.querySelector('.n-board-wrap');
      if (wrap) { if (t.clientX > innerWidth - 40) wrap.scrollLeft += 12; else if (t.clientX < 40) wrap.scrollLeft -= 12; }
      if (t.clientY > innerHeight - 50) scrollBy(0, 12); else if (t.clientY < 50) scrollBy(0, -12);
    }, { passive: false });
    const end = e => {
      cancel();
      if (!drag) return;
      const t = e.changedTouches[0];
      drag.ghost.remove();
      card.classList.remove('dragging');
      const cell = document.elementFromPoint(t.clientX, t.clientY)?.closest('.n-cell[data-status]');
      drag = null;
      card.dataset.justDragged = '1';   // évite d'ouvrir la carte au relâchement
      setTimeout(() => delete card.dataset.justDragged, 400);
      if (cell) dropCardInto(cell, card.dataset.id, t.clientY); else clearDropLine();
    };
    card.addEventListener('touchend', end);
    card.addEventListener('touchcancel', end);
    card.addEventListener('contextmenu', e => { if (drag || timer) e.preventDefault(); });
  });
}

/* ---------- Automatisations du matin (au premier affichage de la journée) ---------- */
const DAILY_KEY = 'kata-daily-run';
function runDailyAutomation(force = false) {
  const today = localISO(), tomorrow = addDaysISO(today, 1);
  const last = localStorage.getItem(DAILY_KEY);
  if (!force && last === today) return;
  localStorage.setItem(DAILY_KEY, today);
  if (!last && !force) return;   // tout premier lancement : on ne déplace rien
  const v = loadView();
  const cards = Store.list();
  const nSuccess = cards.filter(b => statusOf(b) === 'success').length;
  const nLeft = cards.filter(b => statusOf(b) === 'goal').length;
  const moves = [];
  cards.forEach(b => {
    const st = statusOf(b), due = b.recur?.due;
    let to = null;
    if (v.autoRecur && due) {
      if (due <= today && !['goal', 'wip'].includes(st)) to = 'goal';
      else if (due === tomorrow && ['incoming', 'success'].includes(st)) to = 'tomorrow';
    }
    if (!to && v.autoTomorrow && st === 'tomorrow') to = 'goal';
    if (!to && v.autoSuccess && st === 'success') to = 'incoming';
    if (to && to !== st) moves.push([b.id, to]);
  });
  if (!moves.length) return force && toast('Aucune carte à déplacer');
  recordSnapshot();   // état d'avant : « Annuler » y revient
  backupNow('daily');
  moves.forEach(([id, to]) => setStatus(Store, id, to));
  setTimeout(() => toast(`Nouvelle journée : ${moves.length} carte${moves.length > 1 ? 's' : ''} déplacée${moves.length > 1 ? 's' : ''} · hier ${nSuccess} succès, ${nLeft} objectif${nLeft > 1 ? 's' : ''} restant${nLeft > 1 ? 's' : ''}`,
    { action: 'Annuler', onAction: undo, ms: 10000 }), 300);
}
// Passage de minuit pendant que l'app est ouverte
setInterval(() => {
  if (!document.body.classList.contains('kanban-page') || localStorage.getItem(DAILY_KEY) === localISO()) return;
  if (typeof peek !== 'undefined' && peek) return;
  runDailyAutomation(); renderKanban();
}, 60000);
