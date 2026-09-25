/* Page ouverte : pièces jointes, éditeurs de propriétés, tiroir (side peek) et fenêtre centrée. */

/* ---------- Fichiers joints (stockés dans IndexedDB) ---------- */
function openAttachment(f) {
  if (!f.fileId) return window.open(f.url, '_blank', 'noopener');
  const w = window.open('', '_blank');   // ouvert tout de suite pour ne pas être bloqué comme pop-up
  IDB.get('files', f.fileId).then(rec => {
    if (!rec) { w?.close(); return toast('Fichier introuvable'); }
    const url = URL.createObjectURL(rec.blob);
    if (w) w.location = url; else window.open(url, '_blank');
  });
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-file-id]');
  if (!a) return;
  e.preventDefault(); e.stopPropagation();
  openAttachment({ fileId: a.dataset.fileId });
}, true);
// Anciennes pièces jointes (data: URL dans le stockage principal) → IndexedDB
let filesMigrated = false;
async function migrateFilesToIDB() {
  if (filesMigrated) return;
  filesMigrated = true;
  for (const St of [Store, Templates]) {
    for (const doc of St.list()) {
      let changed = false;
      const props = { ...(doc.props || {}) };
      for (const [k, v] of Object.entries(props)) {
        if (!Array.isArray(v) || !v.some(f => f?.url?.startsWith?.('data:'))) continue;
        props[k] = await Promise.all(v.map(async f => {
          if (!f?.url?.startsWith?.('data:')) return f;
          const fileId = 'f-' + uid() + uid();
          const blob = await dataURLToBlob(f.url);
          await IDB.put('files', { name: f.name, type: blob.type, blob }, fileId);
          return { name: f.name, fileId, type: blob.type, size: blob.size };
        }));
        changed = true;
      }
      if (changed) St.patch(doc.id, { props });
    }
  }
}

/* ---------- Sélecteur d'options (comme Notion) ----------
   cfg : state() → { options: [{ id, label, color }], selected: [ids] }, many, onSelect(id), onRemove(id),
         onCreate(label) → id (création si fourni), onEdit(id, { label | color | delete }), onReorder(ids) */
function closeOptionPicker() { $('#optPicker')?.remove(); }
function openOptionPicker(anchor, cfg) {
  closePop(); closeOptionPicker();
  const el = document.createElement('div');
  el.className = 'op'; el.id = 'optPicker';
  el.setAttribute('role', 'listbox');
  document.body.appendChild(el);
  const r = (anchor.closest('.val, .pv-wrap') || anchor).getBoundingClientRect();
  const width = Math.max(320, Math.min(520, r.width + 40));
  el.style.width = width + 'px';
  el.style.left = Math.max(8, Math.min(r.left - 8, innerWidth - width - 8)) + 'px';
  el.style.top = Math.max(8, r.top - 6) + 'px';
  let query = '';
  const pillOf = o => o.dot ? `<span class="n-pill c-${o.color}"><span class="dot"></span>${esc(o.label)}</span>` : `<span class="n-pill c-${o.color}" style="border-radius:4px">${esc(o.label)}</span>`;
  const render = () => {
    const { options, selected } = cfg.state();
    const q = query.trim().toLowerCase();
    const list = options.filter(o => !q || o.label.toLowerCase().includes(q));
    const exact = options.some(o => o.label.toLowerCase() === q);
    el.innerHTML = `
      <div class="op-top">
        ${selected.map(sid => options.find(o => o.id === sid)).filter(Boolean).map(o => `<span class="op-sel">${pillOf(o).replace('</span>', '')}${cfg.onRemove ? `<button class="op-x" data-rm="${esc(o.id)}" title="Retirer">${icon('x')}</button>` : ''}</span></span>`).join('')}
        <input class="op-input" value="${esc(query)}" autocomplete="off" aria-label="Rechercher une option">
      </div>
      <div class="op-label">${cfg.onCreate ? 'Sélectionnez une option ou créez-en une' : 'Sélectionnez une option'}</div>
      <div class="op-list">
        ${list.map(o => `
          <div class="op-row ${selected.includes(o.id) ? 'on' : ''}" data-opt="${esc(o.id)}" role="option" aria-selected="${selected.includes(o.id)}" tabindex="-1" ${cfg.onReorder && !q ? 'draggable="true"' : ''}>
            ${cfg.onReorder ? `<span class="grip">${icon('grip')}</span>` : ''}${pillOf(o)}<span class="spacer"></span>
            ${cfg.onEdit ? `<button class="op-more" data-more="${esc(o.id)}" title="Modifier l'option">${icon('dots')}</button>` : ''}
          </div>`).join('')}
        ${cfg.onCreate && q && !exact ? `<div class="op-row op-create" data-create role="option" tabindex="-1"><span class="op-create-lbl">Créer</span> <span class="n-pill c-gray" style="border-radius:4px">${esc(query.trim())}</span></div>` : ''}
      </div>`;
    const inp = el.querySelector('.op-input');
    inp.focus(); inp.setSelectionRange(query.length, query.length);
    inp.oninput = () => { query = inp.value; render(); };
    inp.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const t = query.trim();
        const hit = options.find(o => o.label.toLowerCase() === t.toLowerCase()) || (t ? list[0] : null);
        if (hit && (hit.label.toLowerCase() === t.toLowerCase() || !cfg.onCreate)) cfg.onSelect(hit.id);
        else if (t && cfg.onCreate) cfg.onCreate(t);
        query = '';
        if (!cfg.many) return closeOptionPicker();
        return render();
      }
      if (e.key === 'Backspace' && !query && selected.length && cfg.onRemove) { cfg.onRemove(selected.at(-1)); render(); }
      if (e.key === 'Escape') { e.stopPropagation(); closeOptionPicker(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); el.querySelector('.op-row')?.focus(); }
    };
    // Glisser pour réordonner
    let drag = null;
    el.querySelectorAll('.op-row[draggable]').forEach(row => {
      row.ondragstart = () => { drag = row.dataset.opt; };
      row.ondragover = e => { e.preventDefault(); row.classList.add('drop-before'); };
      row.ondragleave = () => row.classList.remove('drop-before');
      row.ondrop = e => {
        e.preventDefault();
        const ids = cfg.state().options.map(o => o.id).filter(x => x !== drag);
        ids.splice(ids.indexOf(row.dataset.opt), 0, drag);
        cfg.onReorder(ids); render();
      };
    });
  };
  el.onclick = e => {
    e.stopPropagation();
    const rm = e.target.closest('[data-rm]'), more = e.target.closest('[data-more]'), row = e.target.closest('[data-opt], [data-create]');
    if (rm) { cfg.onRemove(rm.dataset.rm); return render(); }
    if (more) {
      const o = cfg.state().options.find(x => x.id === more.dataset.more);
      openPop(more, [
        { keepOpen: true, html: `<input class="pop-input" id="optRename" value="${esc(o.label)}" autocomplete="off" aria-label="Nom de l'option">` },
        { icon: 'trash', label: 'Supprimer', danger: true, onClick: () => { cfg.onEdit(o.id, { delete: true }); render(); } },
        { sep: true }, { header: 'Couleurs' },
        ...['default', ...GROUP_COLORS].map(c => ({ html: `<span class="sw c-${c}"></span><span class="name">${{ default: 'Par défaut', gray: 'Gris', brown: 'Marron', orange: 'Orange', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', purple: 'Violet', pink: 'Rose', red: 'Rouge' }[c]}</span>`, checked: (o.color || 'default') === c, onClick: () => { cfg.onEdit(o.id, { color: c }); render(); } })),
      ]);
      const ri = $('#optRename');
      ri.focus(); ri.select();
      ri.onkeydown = ev => { if (ev.key === 'Enter') { if (ri.value.trim()) cfg.onEdit(o.id, { label: ri.value.trim() }); closePop(); render(); } };
      ri.onchange = () => { if (ri.value.trim()) { cfg.onEdit(o.id, { label: ri.value.trim() }); render(); } };
      return;
    }
    if (row?.dataset.create !== undefined && cfg.onCreate) { cfg.onCreate(query.trim()); query = ''; if (!cfg.many) return closeOptionPicker(); return render(); }
    if (row?.dataset.opt) { cfg.onSelect(row.dataset.opt); if (!cfg.many) return closeOptionPicker(); render(); }
  };
  el.onkeydown = e => {
    const row = e.target.closest?.('.op-row');
    if (!row) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); (row.nextElementSibling || row).focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); row.previousElementSibling ? row.previousElementSibling.focus() : el.querySelector('.op-input').focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeOptionPicker(); }
  };
  render();
}
document.addEventListener('click', e => { if (!e.target.closest('#optPicker, #nPop')) closeOptionPicker(); });

// Pro/Perso : les options sont les sous-groupes du Kanban (créer, renommer, colorer, réordonner, supprimer)
function groupPickerConfig(getSelected, select, after) {
  return {
    state: () => ({ options: GROUPS.map(g => ({ id: g.key, label: g.label, color: g.color })), selected: getSelected() }),
    onSelect: select,
    onCreate: label => {
      const used = GROUPS.map(g => g.color);
      const g = { key: 'g-' + uid(), label, color: GROUP_COLORS.find(c => !used.includes(c)) || 'gray' };
      GROUPS.push(g); saveGroups(); select(g.key); return g.key;
    },
    onEdit: (key, change) => {
      const g = groupDef(key);
      if (change.delete) {
        if (GROUPS.length === 1) return toast('Il faut garder au moins un groupe');
        if (!confirm(`Supprimer le groupe « ${g.label} » ? Ses cartes passeront dans « ${GROUPS.find(x => x !== g).label} ».`)) return;
        GROUPS = GROUPS.filter(x => x !== g); saveGroups();
        Store.list().filter(b => b.group === key).forEach(b => Store.patch(b.id, { group: GROUPS[0].key }));
      } else { Object.assign(g, change.label ? { label: change.label } : {}, change.color ? { color: change.color } : {}); saveGroups(); }
      after?.();
    },
    onReorder: keys => { GROUPS = keys.map(k => groupDef(k)).filter(Boolean); saveGroups(); after?.(); },
  };
}

// Renommer une propriété directement sur place
function inlineRenameProp(k, key, rerender) {
  const span = k.querySelector('.kname');
  const input = document.createElement('input');
  input.className = 'k-rename';
  input.value = propDef(key)?.label || '';
  input.setAttribute('aria-label', 'Nom de la propriété');
  span.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const commit = save => {
    if (done) return; done = true;
    if (save && input.value.trim()) renameProp(key, input.value.trim());
    rerender();
  };
  input.onclick = e => e.stopPropagation();
  input.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); };
  input.onblur = () => commit(true);
}

// « Modifier la propriété » : type, formule, rollup, streak, bouton, ID, options
function openPropertyEditor(anchor, cp, S, id, rerender) {
  openPop(anchor, [
    { header: cp.name },
    { icon: PROP_TYPES[cp.type].icon, label: 'Type', value: `${PROP_TYPES[cp.type].label} ▸`, keepOpen: true, onClick: row => openPop(row, [
      { header: 'Changer le type' },
      ...Object.entries(PROP_TYPES).map(([t, def]) => ({ icon: def.icon, label: def.label, checked: cp.type === t, onClick: () => {
        if (t !== cp.type && !confirm(`Passer « ${cp.name} » en ${def.label} ? Les valeurs incompatibles seront effacées.`)) return;
        changePropType(cp, t); rerender();
        if (t === 'formula' && !cp.formula) { editFormula(cp, S.get(id)); rerender(); }
        if (t === 'rollup') configureRollup(cp, rerender);
      } })),
    ]) },
    ...(cp.type === 'formula' ? [{ icon: 'sigma', label: 'Modifier la formule', onClick: () => { editFormula(cp, S.get(id)); rerender(); } }] : []),
    ...(cp.type === 'rollup' ? [{ icon: 'search', label: 'Configurer le rollup', keepOpen: true, onClick: () => configureRollup(cp, rerender) }] : []),
    ...(cp.type === 'streak' ? [{ icon: 'streakUI', label: 'Occurrences affichées', value: String(cp.streakLength || 7), onClick: () => {
      const n = parseInt(prompt('Nombre d\'occurrences affichées', cp.streakLength || 7), 10);
      if (n > 0) { cp.streakLength = Math.min(60, n); saveCustomProps(); rerender(); }
    } }] : []),
    ...(cp.type === 'button' ? [{ header: 'Action du bouton' },
      { icon: 'check', label: 'Valider le run (Set as Done)', checked: (cp.action?.type || 'run_done') === 'run_done', onClick: () => { cp.action = { type: 'run_done' }; saveCustomProps(); rerender(); } },
      ...STATUSES.map(st => ({ html: `<span class="name">Passer en</span> ${pill(st)}`, checked: cp.action?.type === 'status' && cp.action.status === st.key, onClick: () => { cp.action = { type: 'status', status: st.key }; saveCustomProps(); rerender(); } })),
    ] : []),
    ...(cp.type === 'id' ? [{ icon: 'idUI', label: 'Préfixe', value: cp.prefix || '—', onClick: () => {
      const pr = prompt('Préfixe de l\'ID (ex. : VIS-)', cp.prefix || '');
      if (pr !== null) { cp.prefix = pr; saveCustomProps(); rerender(); }
    } }] : []),
    ...(PROP_TYPES[cp.type].options ? [{ icon: 'select', label: 'Modifier les options', keepOpen: true, onClick: () => {
      closePop();
      const btn = anchor.nextElementSibling?.querySelector('[data-pv-select]') || anchor.nextElementSibling;
      btn?.click();
    } }] : []),
  ]);
}

/* ---------- Propriétés dans la page ouverte ---------- */
function propEditorHTML(d, p) {
  const empty = '<span class="empty">Empty</span>';
  if (p.key === 'status') return `<button class="val" data-edit="status">${pill(statusDef(statusOf(d)))}</button>`;
  if (p.key === 'group') { const g = groupDef(groupOf(d)); return `<button class="val" data-edit="group"><span class="n-pill c-${g.color}" style="border-radius:4px">${esc(g.label)}</span></button>`; }
  if (p.key === 'challenge') return `<button class="val" data-story="challenge"><span class="pills">${valueHTML(d, 'challenge', 'page') || empty}</span></button>`;
  if (p.key === 'focus') return `<span class="pv-wrap"><input class="pv" data-story-field="focusProcess" value="${esc(d.focusProcess || '')}" placeholder="Empty"></span>`;
  if (p.key === 'due') return `<span class="pv-wrap"><input class="pv" type="date" data-story-field="targetDate" value="${esc(d.targetDate || '')}"></span>`;
  if (p.key === 'obstacle') return `<button class="val" data-story="obstacle"><span class="pills">${valueHTML(d, 'obstacle', 'page') || empty}</span></button>`;
  if (p.key === 'experiments') return `<button class="val" data-story="goto-record" title="Aller à l'Experimenting Record"><span class="pills">${valueHTML(d, 'experiments', 'page') || empty}</span></button>`;
  if (p.key === 'step') return `<button class="val" data-story="goto-step" title="Aller au time block"><span class="pills">${valueHTML(d, 'step', 'page') || empty}</span></button>`;
  if (p.key === 'runEvery') return `<span class="pv-wrap"><input class="pv" type="number" min="1" data-recur="every" value="${esc(d.recur?.every ?? '')}" placeholder="Empty">${d.recur?.every ? '<span class="pv-unit">jours</span>' : ''}</span>`;
  if (p.key === 'runDue') return `<span class="pv-wrap"><input class="pv" type="date" data-recur="due" value="${esc(d.recur?.due ?? '')}">${d.recur?.due ? `<span class="pv-unit">${esc(relDay(d.recur.due))}</span>` : ''}</span>`;
  const cp = customDef(p.key), v = d.props?.[p.key], t = cp.type;
  if (t === 'checkbox') return `<label class="pv-check"><input type="checkbox" data-pv="${cp.key}" ${v ? 'checked' : ''}></label>`;
  if (PROP_TYPES[t].options) return `<button class="val" data-pv-select="${cp.key}"><span class="pills">${valueHTML(d, cp.key, 'page') || empty}</span></button>`;
  if (t === 'files') return `<button class="val" data-pv-files="${cp.key}"><span class="pills">${valueHTML(d, cp.key, 'page') || empty}</span></button>`;
  if (t === 'relation') return `<button class="val" data-pv-rel="${cp.key}"><span class="pills">${valueHTML(d, cp.key, 'page') || empty}</span></button>`;
  if (t === 'button') return `<span class="v">${valueHTML(d, cp.key, 'page')}</span>`;
  if (t === 'streak') {
    const sd = streakData(d, cp);
    return `<span class="streak-edit">${streakHTML(sd, true)}
      <span class="every">tous les <input type="number" min="1" data-streak-every="${cp.key}" value="${sd.every}"> j · ${sd.hits}/${sd.n} · série ${sd.current}</span></span>`;
  }
  if (PROP_TYPES[t].readOnly) return `<span class="v ro">${valueHTML(d, cp.key, 'page') || empty}</span>`;
  const type = { number: 'number', date: 'date', url: 'url', email: 'email', phone: 'tel' }[t] || 'text';
  const href = t === 'url' && v ? (/^https?:/.test(v) ? v : 'https://' + v) : t === 'email' && v ? 'mailto:' + v : t === 'phone' && v ? 'tel:' + v : '';
  return `<span class="pv-wrap"><input class="pv" type="${type}" data-pv="${cp.key}" value="${esc(v ?? '')}" placeholder="Empty">${href ? `<a class="pv-open" href="${esc(href)}" target="_blank" rel="noopener" title="Ouvrir">${icon('arrowUR')}</a>` : ''}</span>`;
}

// Change le type d'une propriété et convertit les valeurs de toutes les pages et templates
function changePropType(cp, to) {
  const from = cp.type;
  if (from === to) return;
  const optsFrom = PROP_TYPES[from].options, optsTo = PROP_TYPES[to].options;
  cp.options ||= [];
  const labelFor = v => Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]);
  const convert = v => {
    if (v === undefined || v === null) return v;
    if (optsFrom && optsTo) return PROP_TYPES[to].many ? labelFor(v) : labelFor(v)[0] ?? null;
    if (!optsFrom && optsTo && ['text', 'number', 'url', 'email', 'phone'].includes(from) && String(v).trim()) {
      let o = cp.options.find(x => x.label === String(v).trim());
      if (!o) { o = { id: uid(), label: String(v).trim(), color: GROUP_COLORS[cp.options.length % GROUP_COLORS.length] }; cp.options.push(o); }
      return PROP_TYPES[to].many ? [o.id] : o.id;
    }
    if (optsFrom && ['text', 'url', 'email', 'phone'].includes(to)) return labelFor(v).map(id => optOf(cp, id)?.label).filter(Boolean).join(', ');
    if (to === 'checkbox') return !!v && v !== 'false';
    if (to === 'number') { const n = parseFloat(v); return isNaN(n) ? null : n; }
    if (to === 'date') return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null;
    if (['text', 'url', 'email', 'phone'].includes(to) && ['text', 'number', 'url', 'email', 'phone', 'date'].includes(from)) return String(v);
    return null;
  };
  [Store, Templates].forEach(St => St.list().forEach(doc => {
    if (doc.props && cp.key in doc.props) { const nv = convert(doc.props[cp.key]); St.patch(doc.id, { props: { ...doc.props, [cp.key]: nv } }); }
  }));
  cp.type = to;
  if (optsTo && !cp.options.length && DEFAULT_OPTIONS[to]) cp.options = DEFAULT_OPTIONS[to]();
  if (to === 'streak') cp.streakLength ||= 7;
  saveCustomProps();
}

function editFormula(cp, doc) {
  const f = prompt('Formule — ex. : prop("Points") * 2 · if(prop("Engagé"), "Oui", "Non") · dateBetween(prop("Échéance (Target)"), now(), "days") · concat(prop("Status"), " – ", prop("Pro/Perso"))', cp.formula || '');
  if (f === null) return;
  cp.formula = f; saveCustomProps();
  if (doc) { const r = rawValue(doc, cp.key); if (r instanceof Error) toast('Formule invalide : ' + r.message); }
}

function configureRollup(cp, after) {
  const rels = CUSTOM_PROPS.filter(x => x.type === 'relation');
  if (!rels.length) return toast('Ajoutez d\'abord une propriété de type Relation');
  const anchor = document.querySelector(`[data-prop-menu="${cp.key}"]`) || $('#peekProps');
  const step3 = () => openPop(anchor, [{ header: 'Calcul' }, ...Object.entries(ROLLUP_CALCS).map(([k, l]) => ({ label: l, checked: (cp.rollup.calc || 'count') === k, onClick: () => { cp.rollup.calc = k; saveCustomProps(); after?.(); } }))]);
  const step2 = () => openPop(anchor, [{ header: 'Propriété à agréger' },
    { label: 'Name', checked: cp.rollup.target === '__title', keepOpen: true, onClick: () => { cp.rollup.target = '__title'; step3(); } },
    ...allProps().filter(x => x.key !== cp.key).map(x => ({ icon: x.icon, label: x.label, checked: cp.rollup.target === x.key, keepOpen: true, onClick: () => { cp.rollup.target = x.key; step3(); } }))]);
  cp.rollup ||= {};
  openPop(anchor, [{ header: 'Relation' }, ...rels.map(r => ({ icon: 'arrowUR', label: r.name, checked: cp.rollup.relation === r.key, keepOpen: true, onClick: () => { cp.rollup.relation = r.key; step2(); } }))]);
}

function bindPropEditors(S, id, d, rerender, { toggleMore }) {
  const root = $('#peekProps');
  const setVal = (key, value) => { const cur = S.get(id); S.patch(id, { props: { ...(cur.props || {}), [key]: value } }); };
  const getVal = key => (S.get(id).props || {})[key];

  root.querySelectorAll('input[data-pv]').forEach(inp => {
    if (inp.type === 'checkbox') inp.onchange = () => { setVal(inp.dataset.pv, inp.checked); };
    else {
      inp.oninput = () => setVal(inp.dataset.pv, customDef(inp.dataset.pv).type === 'number' ? (inp.value === '' ? null : Number(inp.value)) : inp.value);
      inp.onchange = rerender;   // met à jour le lien ↗ et les propriétés calculées
    }
  });

  // Runs récurrents : fréquence et prochaine date
  root.querySelectorAll('[data-recur]').forEach(inp => inp.onchange = () => {
    const recur = { ...(S.get(id).recur || {}) };
    if (inp.dataset.recur === 'every') {
      const n = parseInt(inp.value, 10);
      recur.every = n > 0 ? n : undefined;
      if (recur.every && !recur.due) recur.due = localISO();   // planifié dès aujourd'hui
    } else recur.due = inp.value || undefined;
    S.patch(id, { recur }); rerender();
  });
  // Bouton (Set as Done…)
  root.querySelectorAll('[data-btn-prop]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    executeButton(S, id, customDef(btn.dataset.btnProp)); rerender();
  });

  // Propriétés du storyboard : modifiées ici, écrites dans le storyboard ouvert
  const editBoard = fn => {
    if (board && board.id === id) {
      fn(board);
      saveBoardNow();
      const drawer = $('#drawer'), y = drawer.scrollTop;
      renderBoard(board.id, SB_ROOT);
      drawer.scrollTop = y;
    } else { const doc = S.get(id); fn(doc); S.save(doc); }
    rerender();
  };
  root.querySelectorAll('[data-story-field]').forEach(inp => inp.onchange = () => editBoard(b => { b[inp.dataset.storyField] = inp.value; }));
  root.querySelectorAll('[data-story]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const what = btn.dataset.story;
    if (what === 'goto-record') return $('section.experiments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (what === 'goto-step') return $('#drawer').scrollTo({ top: SB_ROOT.offsetTop - 42, behavior: 'smooth' });
    if (what === 'challenge') {
      const b = board?.id === id ? board : S.get(id);
      openPop(btn, [{ keepOpen: true, html: `<div class="ch-edit">
        <label>D'ici <input data-ch="challengeBy" value="${esc(b.challengeBy || '')}" placeholder="avril 2027"></label>
        <label><input data-ch="challengeResult" value="${esc(b.challengeResult || '')}" placeholder="résultat mesurable"></label>
        <label>, afin de <input data-ch="challengeVision" value="${esc(b.challengeVision || '')}" placeholder="lien avec la Vision"></label></div>` }]);
      $('#nPop').querySelectorAll('[data-ch]').forEach(inp => {
        inp.onchange = () => editBoard(bb => { bb[inp.dataset.ch] = inp.value; });
        inp.onkeydown = ev => { if (ev.key === 'Enter') { inp.blur(); closePop(); } };
      });
      $('#nPop [data-ch]').focus();
      return;
    }
    if (what === 'obstacle') {
      const b = () => board?.id === id ? board : S.get(id);
      openOptionPicker(btn, {
        state: () => ({ options: b().obstacles.filter(o => !o.done).map(o => ({ id: o.id, label: o.text || 'Obstacle sans titre', color: 'yellow' })), selected: b().obstacles.filter(o => o.focus && !o.done).map(o => o.id) }),
        onSelect: oid => editBoard(bb => bb.obstacles.forEach(o => { o.focus = o.id === oid && !o.focus; })),
        onRemove: () => editBoard(bb => bb.obstacles.forEach(o => { o.focus = false; })),
        onCreate: label => { const nid = uid(); editBoard(bb => { bb.obstacles.forEach(o => { o.focus = false; }); bb.obstacles.push({ id: nid, text: label, done: false, focus: true }); }); return nid; },
      });
    }
  });

  // Status / Pro/Perso : sélecteur d'options (comme Notion)
  root.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    if (btn.dataset.edit === 'status') {
      return openOptionPicker(btn, {
        state: () => ({ options: STATUSES.map(st => ({ id: st.key, label: `${st.emoji} ${st.label}`, color: st.color, dot: true })), selected: [statusOf(S.get(id))] }),
        onSelect: k => { setStatus(S, id, k); rerender(); },
      });
    }
    openOptionPicker(btn, groupPickerConfig(() => [groupOf(S.get(id))], k => { S.patch(id, { group: k }); rerender(); }, rerender));
  });

  // Select / Multi-select / Status / Person : sélecteur d'options (comme Notion)
  root.querySelectorAll('[data-pv-select]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const cp = customDef(btn.dataset.pvSelect), many = PROP_TYPES[cp.type].many;
    const cur = () => { const v = getVal(cp.key); return many ? (v || []) : (v ? [v] : []); };
    openOptionPicker(btn, {
      many,
      state: () => ({ options: cp.options, selected: cur() }),
      onSelect: oid => { const list = cur(); setVal(cp.key, many ? (list.includes(oid) ? list.filter(x => x !== oid) : [...list, oid]) : (list[0] === oid ? null : oid)); rerender(); },
      onRemove: oid => { setVal(cp.key, many ? cur().filter(x => x !== oid) : null); rerender(); },
      onCreate: label => { const o = { id: uid(), label, color: GROUP_COLORS[cp.options.length % GROUP_COLORS.length] }; cp.options.push(o); saveCustomProps(); onSel(o.id); return o.id; },
      onEdit: (oid, change) => {
        const o = optOf(cp, oid);
        if (change.delete) cp.options = cp.options.filter(x => x !== o); else Object.assign(o, change);
        saveCustomProps(); rerender();
      },
      onReorder: ids => { cp.options = ids.map(i => optOf(cp, i)).filter(Boolean); saveCustomProps(); rerender(); },
    });
    function onSel(oid) { const list = cur(); setVal(cp.key, many ? [...new Set([...list, oid])] : oid); rerender(); }
  });

  // Files & media
  root.querySelectorAll('[data-pv-files]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const key = btn.dataset.pvFiles;
    const files = getVal(key) || [];
    openPop(btn, [
      ...files.map((f, i) => ({ icon: 'clip', label: f.name, onClick: () => openAttachment(f) })),
      ...files.map((f, i) => ({ icon: 'trash', label: `Retirer « ${f.name} »`, danger: true, onClick: () => { setVal(key, files.filter((_, j) => j !== i)); rerender(); } })),
      ...(files.length ? [{ sep: true }] : []),
      { icon: 'download', label: 'Téléverser un fichier…', onClick: () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.onchange = () => {
          const f = inp.files[0];
          if (!f) return;
          if (f.size > 25 * 1024 * 1024) return toast('Fichier trop lourd (25 Mo max) : ajoutez plutôt un lien');
          const fileId = 'f-' + uid() + uid();
          IDB.put('files', { name: f.name, type: f.type, blob: f }, fileId).then(() => {
            setVal(key, [...(getVal(key) || []), { name: f.name, fileId, type: f.type, size: f.size }]); rerender();
          }).catch(() => toast('Impossible d\'enregistrer le fichier'));
        };
        inp.click();
      } },
      { icon: 'link', label: 'Ajouter un lien…', onClick: () => {
        const url = prompt('Adresse du fichier ou du média');
        if (!url) return;
        const name = decodeURIComponent(url.split('/').pop().split('?')[0]) || url;
        setVal(key, [...(getVal(key) || []), { name, url: /^https?:|^data:/.test(url) ? url : 'https://' + url }]); rerender();
      } },
    ]);
  });

  // Relation (vers d'autres cartes)
  root.querySelectorAll('[data-pv-rel]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const key = btn.dataset.pvRel;
    const openList = () => {
      const cur = getVal(key) || [];
      const pages = Store.list().filter(x => x.id !== id);
      openPop(btn, [
        { html: '<input class="pop-input" id="relInput" placeholder="Rechercher une page…" autocomplete="off">', keepOpen: true },
        { header: 'Pages liées' },
        ...pages.map(x => ({ html: `<span class="tm-ico">${iconHTML(x.icon) || DEFAULT_PAGE_ICON}</span><span class="name">${esc(x.title || 'Sans titre')}</span>`, checked: cur.includes(x.id), keepOpen: true, onClick: () => {
          const list = getVal(key) || [];
          setVal(key, list.includes(x.id) ? list.filter(z => z !== x.id) : [...list, x.id]); rerender(); openList();
        } })),
      ]);
      const inp = $('#relInput');
      inp.focus();
      inp.oninput = () => {
        const q = inp.value.trim().toLowerCase();
        document.querySelectorAll('#nPop .row').forEach((r, i) => { if (i > 0) r.style.display = !q || r.innerText.toLowerCase().includes(q) ? '' : 'none'; });
      };
    };
    openList();
  });

  // Streak : clic sur une case = corriger la réussite ; fréquence par carte
  root.querySelectorAll('[data-streak-cell]').forEach(cell => cell.onclick = e => {
    e.stopPropagation();
    const key = cell.closest('.streak-edit').querySelector('[data-streak-every]').dataset.streakEvery;
    const cp = customDef(key);
    const sd = streakData(S.get(id), cp);
    const c = sd.cells.find(x => x.key === cell.dataset.streakCell);
    const v = { ...(getVal(key) || {}) };
    v.manual = { ...(v.manual || {}), [c.key]: !c.done };
    setVal(key, v); rerender();
  });
  root.querySelectorAll('[data-streak-every]').forEach(inp => inp.onchange = () => {
    const key = inp.dataset.streakEvery;
    setVal(key, { ...(getVal(key) || {}), every: Math.max(1, parseInt(inp.value, 10) || 1) }); rerender();
  });

  // Menu du nom d'une propriété (comme Notion) : Renommer, Modifier la propriété, Visibilité, Dupliquer, Supprimer
  root.querySelectorAll('[data-prop-menu]').forEach(k => k.onclick = e => {
    e.stopPropagation();
    const key = k.dataset.propMenu, cp = customDef(key);
    const vis = pageVisOf(key);
    const view = loadView();
    const onBoard = view.props.includes(key);
    const canEdit = !!cp || key === 'group' || key === 'status';
    openPop(k, [
      { icon: 'edit', label: 'Renommer', onClick: () => inlineRenameProp(k, key, rerender) },
      ...(canEdit ? [{ icon: 'sliders', label: 'Modifier la propriété', keepOpen: true, onClick: () => {
        if (key === 'status') { closePop(); return openPanel('group'); }
        if (key === 'group') { closePop(); return openOptionPicker(k.nextElementSibling, groupPickerConfig(() => [groupOf(S.get(id))], g => { S.patch(id, { group: g }); rerender(); }, rerender)); }
        openPropertyEditor(k, cp, S, id, rerender);
      } }] : []),
      { sep: true },
      { icon: 'eyeOff', label: 'Visibilité de la propriété', value: '▸', keepOpen: true, onClick: row => openPop(row, [
        { header: 'Dans la page' },
        ...[['show', 'Toujours afficher'], ['empty', 'Masquer si vide'], ['hide', 'Toujours masquer']].map(([v, l]) => ({ icon: v === 'hide' ? 'eyeOff' : 'eye', label: l, checked: vis === v, onClick: () => { setPageVis(key, v); rerender(); } })),
        { sep: true },
        { icon: 'board', label: 'Afficher sur le tableau', switch: onBoard, onClick: () => { const v = loadView(); v.props = onBoard ? v.props.filter(x => x !== key) : [...v.props, key]; saveView(v); } },
      ]) },
      ...(cp ? [
        { icon: 'copy', label: 'Dupliquer la propriété', onClick: () => {
          const copy = { ...JSON.parse(JSON.stringify(cp)), key: 'p-' + uid() + uid(), name: cp.name + ' (copie)' };
          CUSTOM_PROPS.splice(CUSTOM_PROPS.indexOf(cp) + 1, 0, copy); saveCustomProps();
          [Store, Templates].forEach(St => St.list().forEach(doc => { if (doc.props && cp.key in doc.props) St.patch(doc.id, { props: { ...doc.props, [copy.key]: JSON.parse(JSON.stringify(doc.props[cp.key])) } }); }));
          rerender();
        } },
        { icon: 'trash', label: 'Supprimer la propriété', danger: true, onClick: () => {
          if (!confirm(`Supprimer la propriété « ${cp.name} » de toutes les pages ?`)) return;
          CUSTOM_PROPS = CUSTOM_PROPS.filter(x => x !== cp); saveCustomProps(); rerender();
        } },
      ] : []),
    ]);
  });

  $('#moreProps')?.addEventListener('click', e => { e.stopPropagation(); toggleMore(); });

  // Ajouter une propriété : nom + type (liste complète, comme Notion)
  $('#addProp').onclick = e => {
    e.stopPropagation();
    let typed = '';   // le menu se ferme avant l'appel : on garde la saisie au fil de la frappe
    const create = type => {
      const cp = { key: 'p-' + uid() + uid(), name: typed.trim() || PROP_TYPES[type].label, type, options: DEFAULT_OPTIONS[type] ? DEFAULT_OPTIONS[type]() : [], pageVis: 'show' };
      if (type === 'streak') cp.streakLength = 7;
      if (type === 'button') { cp.action = { type: 'run_done' }; if (!typed.trim()) cp.name = 'Set as Done'; }
      CUSTOM_PROPS.push(cp); saveCustomProps(); rerender();
      if (type === 'formula') { editFormula(cp, S.get(id)); rerender(); }
      if (type === 'rollup') configureRollup(cp, rerender);
    };
    openPop(e.currentTarget, [
      { html: '<input class="pop-input" id="newPropName" placeholder="Property name" autocomplete="off">', keepOpen: true },
      { header: 'Type' },
      ...Object.entries(PROP_TYPES).map(([k, t]) => ({ icon: t.icon, label: t.label, onClick: () => create(k) })),
    ]);
    const inp = $('#newPropName');
    inp.focus();
    inp.oninput = () => { typed = inp.value; };
    inp.onkeydown = ev => { if (ev.key === 'Enter') { closePop(); create('text'); } };
  };
}

// Les modifications faites dans le storyboard (iframe) mettent à jour les propriétés affichées.

/* ---------- Tiroir (side peek) / fenêtre centrée pour les templates ---------- */
let peek = null;   // { kind: 'vision' | 'template', id }

function openPeek(kind, id, { isNew = false } = {}) {
  const S = kind === 'template' ? Templates : Store;
  const doc = S.get(id);
  if (!doc) return;
  peek = { kind, id, isNew };   // isNew : carte tout juste créée, abandonnée si le titre reste vide
  const isTpl = kind === 'template';

  // Les templates s'ouvrent au centre, avec le bandeau « You're editing a template »
  $('#drawer').classList.toggle('center', isTpl);
  $('#drawer').classList.remove('full');
  $('#scrim').classList.toggle('center', isTpl);
  $('#peekExpand').hidden = !isTpl;
  $('#peekExpand').onclick = () => $('#drawer').classList.toggle('full');
  const banner = $('#peekBanner');
  banner.hidden = !isTpl;
  const renderBanner = () => {
    const t = Templates.get(id);
    banner.innerHTML = `You're editing a template in <b>${icon('db')} ${esc(boardTitle() || 'Untitled')}</b>
      <span class="tm-help" title="Chaque nouvelle page créée avec ce template reprend son icône, son titre, ses propriétés et son storyboard." style="display:inline-block;border-color:rgba(203,145,47,.6);color:rgb(203,145,47)">?</span>
      <button class="repeat-btn" id="repeatBtn">${t.repeat && t.repeat !== 'off' ? `Duplicate ${REPEATS[t.repeat].toLowerCase()}` : 'Duplicate every…'} ${icon('chevron')}</button>`;
    $('#repeatBtn').onclick = e => { e.stopPropagation(); repeatMenu(e.currentTarget, id, renderBanner); };
  };
  if (isTpl) renderBanner();

  const renderIcon = () => {
    const d = S.get(id);
    $('#peekIcon').innerHTML = iconHTML(d.icon) || `<span class="add-icon">${icon('smile')} Add icon</span>`;
  };
  renderIcon();
  const titleKey = isTpl ? 'name' : 'title';
  $('#peekTitle').value = doc[titleKey] || '';
  $('#peekTitle').placeholder = 'Untitled';
  $('#peekTitle').oninput = e => { S.patch(id, { [titleKey]: e.target.value }); };

  let showMore = false;
  const renderProps = () => {
    const d = S.get(id);
    if (!d) return;
    const rowsAll = allProps().map(p => {
      const vis = pageVisOf(p.key);
      const v = p.key === 'status' || p.key === 'group' ? 1 : rawValue(d, p.key);
      const empty = isEmptyVal(v) && !(v instanceof Error) && !['streak', 'button'].includes(customDef(p.key)?.type);
      return { p, hidden: vis === 'hide' || (vis === 'empty' && empty) };
    });
    const shown = rowsAll.filter(r => !r.hidden), more = rowsAll.filter(r => r.hidden);
    const rowHTML = ({ p }) => `
      <span class="k custom" data-prop-menu="${p.key}" title="Options de la propriété">${icon(p.icon)}<span class="kname"${p.kind === 'custom' || p.renamed ? ' data-user' : ''}>${esc(p.label)}</span></span>
      ${propEditorHTML(d, p)}`;
    $('#peekProps').innerHTML = shown.map(rowHTML).join('')
      + (more.length ? `<button class="more-props" id="moreProps">${icon(showMore ? 'chevron' : 'chevRight')} ${showMore ? `Masquer ${more.length} propriété${more.length > 1 ? 's' : ''}` : `${more.length} more propert${more.length > 1 ? 'ies' : 'y'}`}</button>${showMore ? more.map(rowHTML).join('') : ''}` : '')
      + `<button class="add-prop" id="addProp">${icon('plus')} Add a property</button>`;
    bindPropEditors(S, id, d, renderProps, { toggleMore: () => { showMore = !showMore; renderProps(); } });
  };
  peek.render = renderProps;
  renderProps();

  $('#peekIcon').onclick = e => {
    e.stopPropagation();
    closePop();
    openIconPicker(e.currentTarget, val => { S.patch(id, { icon: val }); renderIcon(); });
  };

  const remove = () => {
    cancelBoardSave();   // pas de sauvegarde en attente sur une page supprimée
    moveToTrash(isTpl ? 'template' : 'vision', id);
    closePeek();
  };
  $('#peekMore').onclick = e => {
    e.stopPropagation();
    openPop(e.currentTarget, isTpl ? [
      { icon: 'flag', label: 'Set as default', checked: !!S.get(id).isDefault, onClick: () => setDefaultTemplate(id) },
      { icon: 'trash', label: 'Delete', danger: true, onClick: remove },
    ] : [
      { icon: 'copy', label: 'Dupliquer', onClick: () => { const c = duplicateVision(id); closePeek(); setTimeout(() => openPeek('vision', c.id), 400); } },
      { icon: 'trash', label: 'Supprimer', danger: true, onClick: remove },
    ]);
  };

  // Le storyboard est dessiné directement dans le tiroir (un seul défilement,
  // bandeau Lire → Run → Kata collé sous la barre du haut).
  const drawer = $('#drawer');
  drawer.scrollTop = 0;
  inDrawer = true;
  DocStore = isTpl ? Templates : Store;
  renderBoard(id, $('#sbRoot'));
  // Le tiroir peut venir d'être recréé (nouvelle carte) : on laisse le navigateur peindre
  // l'état fermé avant d'ouvrir, pour que l'animation se joue toujours.
  void drawer.offsetWidth;
  requestAnimationFrame(() => {
    $('#scrim').classList.add('open');
    drawer.classList.add('open');
  });
  drawer.setAttribute('aria-hidden', 'false');
  drawer.inert = false;
  peek.returnFocus = document.activeElement;
  if (!isNew) setTimeout(() => $('#drawerClose')?.focus({ preventScroll: true }), 60);
}

function closePeek() {
  if (!peek) return;
  const { kind, id, isNew } = peek;
  peek = null;
  const focusWasInside = $('#drawer').contains(document.activeElement);
  $('#drawer').inert = true;   // fermé : plus aucun élément focusable à l'intérieur
  closeIconPicker();
  $('#scrim').classList.remove('open');
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  clearInterval(tbInterval);
  // Comme dans Notion : une nouvelle carte sans titre n'est pas créée.
  if (isNew && kind === 'vision' && !(Store.get(id)?.title || '').trim()) {
    cancelBoardSave();
    Store.remove(id);
  } else {
    flushBoardSave();
  }
  board = null;
  // Après l'animation de fermeture : on vide le tiroir et on rafraîchit les cartes.
  setTimeout(() => {
    if (peek) return;
    SB_ROOT = null;
    renderKanban();
    // Le focus revient sur la carte d'origine (recréée par le rendu)
    const back = document.querySelector(`.n-card[data-id="${CSS.escape(id)}"]`);
    if (back && (focusWasInside || document.activeElement === document.body)) back.focus({ preventScroll: true });
  }, 300);
}
