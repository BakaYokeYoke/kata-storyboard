/* Templates (menu New ▾), duplication récurrente, création et copie des pages. */

/* ---------- Templates (menu New ▾, comme Notion) ---------- */
const REPEATS = { off: 'Off', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const tplOrder = () => Templates.list().sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
// Template par défaut ; null = « Empty » (page vide)
const defaultTemplate = () => Templates.list().find(t => t.isDefault) || null;
const setDefaultTemplate = id => Templates.list().forEach(t => Templates.patch(t.id, { isDefault: t.id === id }));

function repeatMenu(anchor, id, after) {
  const t = Templates.get(id);
  openPop(anchor, Object.entries(REPEATS).map(([k, l]) => ({
    label: l, checked: (t.repeat || 'off') === k,
    onClick: () => { Templates.patch(id, { repeat: k, lastRepeat: todayISO() }); after?.(); },
  })));
}

function templateMore(anchor, id) {
  if (id === 'empty') {
    return openPop(anchor, [
      { icon: 'flag', label: 'Set as default', checked: !defaultTemplate(), onClick: () => { setDefaultTemplate(null); reopenTemplateMenu(); } },
    ]);
  }
  const t = Templates.get(id);
  openPop(anchor, [
    { icon: 'repeat', label: 'Duplicate every…', value: `${REPEATS[t.repeat || 'off']} ▾`, keepOpen: true, onClick: () => repeatMenu(anchor, id, reopenTemplateMenu) },
    { icon: 'flag', label: 'Set as default', checked: !!t.isDefault, onClick: () => { setDefaultTemplate(id); reopenTemplateMenu(); } },
    { icon: 'edit', label: 'Edit', onClick: () => { $('#tplMenu').hidden = true; openPeek('template', id); } },
    { icon: 'copy', label: 'Duplicate', onClick: () => {
      const src = Templates.get(id);
      Templates.save({ ...JSON.parse(JSON.stringify(src)), id: 'tpl-' + uid() + uid(), isDefault: false, repeat: 'off', order: (src.order ?? 0) + 0.5, createdAt: Date.now() });
      renumberTemplates(); reopenTemplateMenu();
    } },
    { icon: 'trash', label: 'Delete', onClick: () => { moveToTrash('template', id); reopenTemplateMenu(); } },
  ]);
}

function renumberTemplates() { tplOrder().forEach((t, i) => Templates.patch(t.id, { order: i + 1 })); }
function reopenTemplateMenu() { const m = $('#tplMenu'); m.hidden = true; toggleTemplateMenu(); }

function toggleTemplateMenu() {
  const menu = $('#tplMenu');
  if (!menu.hidden) { menu.hidden = true; return; }
  const tpls = tplOrder();
  const noDefault = !defaultTemplate();
  menu.classList.add('tm');
  menu.innerHTML = `
    <div class="tm-head"><span>Templates for ${esc(boardTitle() || 'Untitled')}</span>
      <button class="tm-help" title="Un template pré-remplit les nouvelles pages : icône, titre, propriétés et storyboard.">?</button></div>
    ${tpls.map(t => `
      <div class="tm-row" draggable="true" data-tpl="${esc(t.id)}">
        <span class="grip">${icon('grip')}</span>
        <span class="tm-ico">${iconHTML(t.icon) || iconHTML('icon:doc:gray')}</span>
        <span class="name">${esc(t.name || 'Untitled')}</span>
        ${t.repeat && t.repeat !== 'off' ? `<span class="default" title="Duplicate every…">${icon('repeat')}</span>` : ''}
        ${t.isDefault ? '<span class="default">Default</span>' : ''}
        <button class="more" data-more="${esc(t.id)}" title="Options">${icon('dots')}</button>
      </div>`).join('')}
    <div class="tm-row" data-tpl="empty">
      <span class="grip none">${icon('grip')}</span>
      <span class="tm-ico">${iconHTML('icon:doc:gray')}</span>
      <span class="name">Empty</span>
      ${noDefault ? '<span class="default">Default</span>' : ''}
      <button class="more" data-more="empty" title="Options">${icon('dots')}</button>
    </div>
    <div class="tm-sep"></div>
    <div class="tm-row new-tpl" id="tplAdd">${icon('plus')} New template</div>`;
  menu.hidden = false;
  menu.onclick = e => e.stopPropagation();

  menu.querySelectorAll('[data-tpl]').forEach(row => {
    const id = row.dataset.tpl;
    row.onclick = e => {
      const more = e.target.closest('[data-more]');
      if (more) { e.stopPropagation(); return templateMore(more, id); }
      menu.hidden = true;
      closePop();
      createVision(id === 'empty' ? null : Templates.get(id));
    };
    if (id === 'empty') return;
    row.ondragstart = e => e.dataTransfer.setData('text/plain', id);
    row.ondragover = e => { e.preventDefault(); row.classList.add('drop-before'); };
    row.ondragleave = () => row.classList.remove('drop-before');
    row.ondrop = e => {
      e.preventDefault();
      const src = e.dataTransfer.getData('text/plain');
      const ids = tplOrder().map(t => t.id).filter(x => x !== src);
      ids.splice(ids.indexOf(id), 0, src);
      ids.forEach((x, i) => Templates.patch(x, { order: i + 1 }));
      reopenTemplateMenu();
    };
  });
  $('#tplAdd').onclick = () => {
    menu.hidden = true;
    const id = 'tpl-' + uid() + uid();
    Templates.save({ ...newBoard(id, ''), name: '', icon: null, isDefault: false, status: 'incoming', group: GROUPS[0].key, order: tpls.length + 1 });
    openPeek('template', id);
    setTimeout(() => $('#peekTitle').focus(), 250);
  };
}

const todayISO = () => localISO();

// « Duplicate every… » : crée la page du jour / de la semaine / du mois à l'ouverture du Kanban.
let recurringChecked = false;
function runRecurringTemplates() {
  if (recurringChecked) return;
  recurringChecked = true;
  const today = todayISO();
  Templates.list().forEach(t => {
    if (!t.repeat || t.repeat === 'off') return;
    const last = t.lastRepeat || today;
    const days = (new Date(today) - new Date(last)) / 86400000;
    const due = t.repeat === 'daily' ? days >= 1
      : t.repeat === 'weekly' ? days >= 7
      : today.slice(0, 7) !== last.slice(0, 7);
    if (!due) { if (!t.lastRepeat) Templates.patch(t.id, { lastRepeat: today }); return; }
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    cloneDoc(t, { title: `${t.name || 'Untitled'} – ${date}`, status: t.status || 'incoming', group: t.group || GROUPS[0].key });
    Templates.patch(t.id, { lastRepeat: today });
  });
}

// Copie profonde d'une Vision ou d'un template, avec de nouveaux identifiants.
function cloneDoc(src, fields) {
  const b = JSON.parse(JSON.stringify(src || newBoard('')));
  const idMap = {};
  ['name', 'isDefault', 'repeat', 'lastRepeat', 'order'].forEach(k => delete b[k]);
  Object.assign(b, { id: 'v-' + uid() + uid(), createdAt: Date.now(), seq: nextSeq() }, fields);
  b.obstacles = (b.obstacles || []).map(o => { const id = uid(); idMap[o.id] = id; return { ...o, id }; });
  b.experiments = (b.experiments || []).map(x => ({ ...x, id: uid(), obstacleId: idMap[x.obstacleId] ?? null }));
  // Nouvelle carte = nouveau cycle : pas de session en cours, checklist décochée.
  delete b.session; b.timeblocks = [];
  if (b.run) b.run = { ...b.run, items: [], routine: (b.run.routine || []).map(r => ({ ...r, id: uid(), done: false })) };
  ['target', 'current'].forEach(side => {
    const key = side === 'target' ? 'toBe' : 'asIs';
    if (b[side]?.[key]) b[side][key] = b[side][key].map(k => ({ ...k, id: uid() }));
  });
  Store.save(b);
  return b;
}

function duplicateVision(id) {
  const src = Store.get(id);
  return cloneDoc(src, { title: src.title ? `${src.title} (copie)` : '' });
}

// Crée une page à partir d'un template (null = Empty) : l'icône, les propriétés et le storyboard
// viennent du template, le titre reste vide. Une colonne ou un groupe ciblés priment.
function createVision(tpl, status, group) {
  const b = cloneDoc(tpl, {
    title: '',
    status: status || tpl?.status || 'incoming',
    group: group || tpl?.group || GROUPS[0].key,
  });
  renderKanban();
  openPeek('vision', b.id, { isNew: true });
  setTimeout(() => $('#peekTitle').focus(), 280);
}
