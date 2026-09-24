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

/* ---------- Propriétés dans la page ouverte ---------- */
function propEditorHTML(d, p) {
  const empty = '<span class="empty">Empty</span>';
  if (p.key === 'status') return `<button class="val" data-edit="status">${pill(statusDef(statusOf(d)))}</button>`;
  if (p.key === 'group') { const g = groupDef(groupOf(d)); return `<button class="val" data-edit="group"><span class="n-pill c-${g.color}" style="border-radius:4px">${esc(g.label)}</span></button>`; }
  if (p.kind === 'story') return `<span class="v ro" title="Vient du storyboard (lecture seule)">${valueHTML(d, p.key, 'page') || empty}</span>`;
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

  // Status / Pro/Perso
  root.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    if (btn.dataset.edit === 'status') openPop(btn, STATUSES.map(st => ({ html: pill(st), checked: statusOf(S.get(id)) === st.key, onClick: () => { setStatus(S, id, st.key); rerender(); } })));
    else openPop(btn, GROUPS.map(gr => ({ html: `<span class="n-pill c-${gr.color}" style="border-radius:4px">${esc(gr.label)}</span>`, checked: groupOf(S.get(id)) === gr.key, onClick: () => { S.patch(id, { group: gr.key }); rerender(); } })));
  });

  // Select / Multi-select / Status / Person
  root.querySelectorAll('[data-pv-select]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const cp = customDef(btn.dataset.pvSelect), many = PROP_TYPES[cp.type].many;
    const openList = () => {
      const cur = getVal(cp.key);
      const has = oid => many ? (cur || []).includes(oid) : cur === oid;
      openPop(btn, [
        { html: '<input class="pop-input" id="optInput" placeholder="Rechercher ou créer une option…" autocomplete="off">', keepOpen: true },
        ...(cp.options.length ? [{ header: many ? 'Sélectionnez une ou plusieurs options' : 'Sélectionnez une option' }] : []),
        ...cp.options.map(o => ({ html: optPillHTML(o), checked: has(o.id), keepOpen: many, onClick: () => {
          if (many) { const list = getVal(cp.key) || []; setVal(cp.key, has(o.id) ? list.filter(x => x !== o.id) : [...list, o.id]); rerender(); openList(); }
          else { setVal(cp.key, has(o.id) ? null : o.id); rerender(); }
        } })),
      ]);
      const inp = $('#optInput');
      inp.focus();
      inp.oninput = () => {
        const q = inp.value.trim().toLowerCase();
        document.querySelectorAll('#nPop .row').forEach(r => { if (r.querySelector('.n-pill')) r.style.display = !q || r.innerText.toLowerCase().includes(q) ? '' : 'none'; });
      };
      inp.onkeydown = ev => {
        if (ev.key !== 'Enter' || !inp.value.trim()) return;
        const label = inp.value.trim();
        let o = cp.options.find(x => x.label.toLowerCase() === label.toLowerCase());
        if (!o) { o = { id: uid(), label, color: GROUP_COLORS[cp.options.length % GROUP_COLORS.length] }; cp.options.push(o); saveCustomProps(); }
        const list = getVal(cp.key) || [];
        setVal(cp.key, many ? [...new Set([...list, o.id])] : o.id);
        rerender();
        if (many) openList(); else closePop();
      };
    };
    openList();
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

  // Menu d'une propriété
  root.querySelectorAll('[data-prop-menu]').forEach(k => k.onclick = e => {
    e.stopPropagation();
    const key = k.dataset.propMenu, p = propDef(key), cp = customDef(key);
    const vis = pageVisOf(key);
    const visItems = [{ header: 'Dans la page' },
      ...[['show', 'Toujours afficher'], ['empty', 'Masquer si vide'], ['hide', 'Toujours masquer']].map(([v, l]) => ({ icon: v === 'hide' ? 'eyeOff' : 'eye', label: l, checked: vis === v, onClick: () => { setPageVis(key, v); rerender(); } }))];
    if (!cp) {
      return openPop(k, [{ header: p.label + (p.kind === 'story' ? ' · depuis le storyboard' : '') }, ...visItems]);
    }
    openPop(k, [
      { html: `<input class="pop-input" id="propNameInput" value="${esc(cp.name)}" autocomplete="off">`, keepOpen: true },
      { icon: PROP_TYPES[cp.type].icon, label: 'Type', value: `${PROP_TYPES[cp.type].label} ▸`, keepOpen: true, onClick: row => openPop(row, [
        { header: 'Changer le type' },
        ...Object.entries(PROP_TYPES).map(([t, def]) => ({ icon: def.icon, label: def.label, checked: cp.type === t, onClick: () => {
          if (t !== cp.type && !confirm(`Passer « ${cp.name} » en ${def.label} ? Les valeurs incompatibles seront effacées.`)) return;
          changePropType(cp, t); rerender();
          if (t === 'formula' && !cp.formula) editFormula(cp, S.get(id)), rerender();
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
      ...(PROP_TYPES[cp.type].options ? [{ header: 'Options' }, ...cp.options.map(o => ({ html: optPillHTML(o), value: '▸', keepOpen: true, onClick: row => openPop(row, [
        { icon: 'pencil', label: 'Renommer', onClick: () => { const l = prompt('Nom de l\'option', o.label); if (l && l.trim()) { o.label = l.trim(); saveCustomProps(); rerender(); } } },
        { header: 'Couleur' },
        ...GROUP_COLORS.map(c => ({ html: `<span class="n-pill c-${c}" style="border-radius:4px">${esc(o.label)}</span>`, checked: o.color === c, onClick: () => { o.color = c; saveCustomProps(); rerender(); } })),
        { sep: true },
        { icon: 'trash', label: 'Supprimer l\'option', danger: true, onClick: () => { cp.options = cp.options.filter(x => x !== o); saveCustomProps(); rerender(); } },
      ]) }))] : []),
      ...visItems,
      { sep: true },
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
    ]);
    const ni = $('#propNameInput');
    ni.oninput = () => { if (ni.value.trim()) { cp.name = ni.value.trim(); saveCustomProps(); k.querySelector('.kname').textContent = cp.name; } };
    ni.onkeydown = ev => { if (ev.key === 'Enter') { closePop(); rerender(); } };
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
      <span class="k custom" data-prop-menu="${p.key}" title="Options de la propriété">${icon(p.icon)}<span class="kname">${esc(p.label)}</span></span>
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
