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

// « Modifier la propriété » (comme Notion) : nom, type et réglages propres à chaque type
const STATUS_GROUPS = [['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Terminé']];
function closePropertyEditor() { $('#propEditor')?.remove(); }
function openPropertyEditor(anchor, key, S, id, rerender) {
  closePop(); closeOptionPicker(); closePropertyEditor();
  const cp = customDef(key), p = propDef(key);
  const el = document.createElement('div');
  el.className = 'pe'; el.id = 'propEditor';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Modifier la propriété');
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - 330)) + 'px';
  el.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - 200)) + 'px';
  const save = () => { saveCustomProps(); rerender(); };
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
  const sel = (field, pairs, cur, label) => `<label class="pe-row"><span class="pe-lbl">${label}</span><select data-set="${field}">${pairs.map(([v, l]) => opt(v, l, cur)).join('')}</select></label>`;
  const sw = (field, on, label) => `<div class="pe-row" data-toggle="${field}" role="switch" aria-checked="${!!on}" tabindex="0"><span class="pe-lbl">${label}</span><span class="n-switch ${on ? 'on' : ''}"></span></div>`;
  const optionRows = (list, groupKey) => list.map(o => `
    <div class="pe-opt" draggable="true" data-opt="${esc(o.id)}"${groupKey ? ` data-group="${groupKey}"` : ''}>
      <span class="grip">${icon('grip')}</span><span class="n-pill c-${o.color}" style="border-radius:4px">${esc(o.label)}</span>
      <span class="spacer"></span><button class="op-more" data-opt-more="${esc(o.id)}" title="Modifier l'option">${icon('dots')}</button>
    </div>`).join('');
  const addOpt = groupKey => `<input class="pe-add" data-add-opt${groupKey ? `="${groupKey}"` : ''} placeholder="+ Ajouter une option" aria-label="Ajouter une option">`;

  const specific = () => {
    if (!cp) {
      if (key === 'group') return `<div class="pe-note">Les options de Pro/Perso sont les sous-groupes du tableau.</div><button class="pe-link" data-act="groups">Modifier les options…</button>`;
      if (key === 'status') return `<div class="pe-note">Les options de Status sont les colonnes du tableau.</div><button class="pe-link" data-act="columns">Modifier les colonnes…</button>`;
      return `<div class="pe-note">${p.kind === 'story' ? 'Cette propriété vient du storyboard : sa valeur se modifie dans la page ou dans le storyboard.' : 'Propriété intégrée des Runs récurrents.'}</div>`;
    }
    switch (cp.type) {
      case 'number': return `
        ${sel('numberFormat', Object.entries(NUMBER_FORMATS), cp.numberFormat || 'number', 'Format')}
        ${sel('decimals', [['', 'Par défaut'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']], cp.decimals ?? '', 'Décimales')}
        ${sel('showAs', [['number', 'Nombre'], ['bar', 'Barre'], ['ring', 'Anneau']], cp.showAs || 'number', 'Afficher comme')}
        ${cp.showAs && cp.showAs !== 'number' ? `
          ${sel('barColor', Object.keys(ICON_COLORS).map(c => [c, { gray: 'Gris', brown: 'Marron', orange: 'Orange', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', purple: 'Violet', pink: 'Rose', red: 'Rouge' }[c]]), cp.barColor || 'green', 'Couleur')}
          <label class="pe-row"><span class="pe-lbl">Diviser par</span><input type="number" data-set="divideBy" value="${esc(cp.divideBy ?? 100)}"></label>
          ${sw('hideNumber', !cp.hideNumber, 'Afficher le nombre')}` : ''}`;
      case 'select': case 'multi': return `
        ${sel('optionSort', [['manual', 'Manuel'], ['asc', 'Alphabétique'], ['desc', 'Alphabétique inverse']], cp.optionSort || 'manual', 'Tri')}
        <div class="pe-sec">Options</div>${addOpt()}<div class="pe-opts">${optionRows(cp.options)}</div>`;
      case 'person': return `
        ${sel('limit', [['', 'Illimité'], ['1', '1 personne']], cp.limit || '', 'Limite')}
        <div class="pe-sec">Personnes</div>${addOpt()}<div class="pe-opts">${optionRows(cp.options)}</div>`;
      case 'status': return STATUS_GROUPS.map(([g, l]) => `
        <div class="pe-sec">${l}</div><div class="pe-opts" data-group-zone="${g}">${optionRows(cp.options.filter(o => (o.group || 'todo') === g), g)}</div>${addOpt(g)}`).join('');
      case 'date': return `
        ${sel('dateFormat', Object.entries(DATE_FORMATS), cp.dateFormat || 'full', 'Format de date')}
        ${sel('timeFormat', [['hidden', 'Masqué'], ['24', '24 heures'], ['12', '12 heures']], cp.timeFormat || 'hidden', 'Format horaire')}
        ${sw('endDate', cp.endDate, 'Date de fin')}`;
      case 'created_time': case 'edited_time': return `
        ${sel('dateFormat', Object.entries(DATE_FORMATS), cp.dateFormat || 'full', 'Format de date')}
        ${sel('timeFormat', [['hidden', 'Masqué'], ['24', '24 heures'], ['12', '12 heures']], cp.timeFormat || '24', 'Format horaire')}`;
      case 'files': return sel('limit', [['', 'Illimité'], ['1', '1 fichier']], cp.limit || '', 'Limite');
      case 'url': return sw('fullUrl', cp.fullUrl, 'Afficher l\'URL complète');
      case 'formula': {
        const doc = S.get(id), res = doc ? rawValue(doc, cp.key) : null;
        const show = res instanceof Error ? `<span class="err">${esc(res.message)}</span>` : esc(res instanceof Date ? fmtDay(res) : Array.isArray(res) ? res.join(', ') : res ?? '—');
        return `<div class="pe-sec">Formule</div>
          <textarea class="pe-formula" data-formula spellcheck="false" aria-label="Formule">${esc(cp.formula || '')}</textarea>
          <div class="pe-result">Résultat sur cette page : <b>${show}</b></div>
          <details class="pe-help"><summary>Fonctions disponibles</summary>
            <code>prop("Nom")</code> <code>if(c, a, b)</code> <code>c ? a : b</code> <code>and</code> <code>or</code> <code>not</code> <code>+ - * / % ^</code>
            <code>concat()</code> <code>join()</code> <code>length()</code> <code>round(x, n)</code> <code>sum()</code> <code>mean()</code> <code>min()</code> <code>max()</code>
            <code>now()</code> <code>today()</code> <code>dateBetween(a, b, "days")</code> <code>dateAdd(d, n, "days")</code> <code>formatDate(d)</code> <code>empty(x)</code> <code>contains(a, x)</code>
          </details>`;
      }
      case 'relation': return `
        <div class="pe-row static"><span class="pe-lbl">Base liée</span><span class="pe-val">${esc(boardTitle())}</span></div>
        ${sel('limit', [['', 'Illimité'], ['1', '1 page']], cp.limit || '', 'Limite')}
        ${sw('twoWay', !!cp.twoWay, 'Afficher sur la page liée')}
        ${cp.twoWay ? `<div class="pe-note">Propriété réciproque : « ${esc(customDef(cp.twoWay)?.name || '')} »</div>` : ''}`;
      case 'rollup': {
        const rels = CUSTOM_PROPS.filter(x => x.type === 'relation');
        const rr = cp.rollup || {};
        return `
          ${sel('rollup.relation', [['', '—'], ...rels.map(x => [x.key, x.name])], rr.relation || '', 'Relation')}
          ${sel('rollup.target', [['', '—'], ['__title', 'Name'], ...allProps().filter(x => x.key !== cp.key).map(x => [x.key, x.label])], rr.target || '', 'Propriété')}
          ${sel('rollup.calc', Object.entries(ROLLUP_CALCS), rr.calc || 'count', 'Calcul')}
          ${!rels.length ? '<div class="pe-note">Ajoutez d\'abord une propriété de type Relation.</div>' : ''}`;
      }
      case 'id': return `<label class="pe-row"><span class="pe-lbl">Préfixe</span><input data-set="prefix" value="${esc(cp.prefix || '')}" placeholder="VIS-"></label>`;
      case 'button': return sel('action', [['run_done', 'Valider le run (Set as Done)'], ...STATUSES.map(st => [`status:${st.key}`, `Passer en ${st.label}`])],
        cp.action?.type === 'status' ? `status:${cp.action.status}` : 'run_done', 'Action');
      case 'streak': return `<label class="pe-row"><span class="pe-lbl">Occurrences affichées</span><input type="number" min="1" max="60" data-set="streakLength" value="${esc(cp.streakLength || 7)}"></label>
        <div class="pe-note">Une occurrence est réussie quand un run est validé dans sa période. La fréquence se règle sur chaque page.</div>`;
      default: return '';
    }
  };

  const draw = () => {
    el.innerHTML = `
      <div class="pe-head"><span>Modifier la propriété</span><button class="vp-x" data-act="close" title="Fermer">${icon('x')}</button></div>
      <div class="pe-name">${icon(p.icon)}<input data-name value="${esc(p.label)}" aria-label="Nom de la propriété"></div>
      ${cp ? `<div class="pe-row" data-act="type" role="button" tabindex="0"><span class="pe-lbl">Type</span><span class="pe-val">${icon(PROP_TYPES[cp.type].icon)} ${PROP_TYPES[cp.type].label}</span><span class="chev">${icon('chevRight')}</span></div>` : `<div class="pe-row static"><span class="pe-lbl">Type</span><span class="pe-val">${key === 'status' ? 'Status' : key === 'group' ? 'Select' : 'Intégrée'}</span></div>`}
      <div class="pe-sep"></div>
      ${specific()}
      ${cp ? `<div class="pe-sep"></div>
        <div class="pe-row" data-act="dup" role="button" tabindex="0">${icon('copy')}<span class="pe-lbl">Dupliquer la propriété</span></div>
        <div class="pe-row danger" data-act="del" role="button" tabindex="0">${icon('trash')}<span class="pe-lbl">Supprimer la propriété</span></div>` : ''}`;
    bind();
  };

  const bind = () => {
    const name = el.querySelector('[data-name]');
    name.onchange = () => { if (name.value.trim()) { renameProp(key, name.value.trim()); rerender(); } };
    name.onkeydown = e => { if (e.key === 'Enter') name.blur(); };
    el.querySelectorAll('[data-set]').forEach(inp => inp.onchange = () => {
      const f = inp.dataset.set, v = inp.value;
      if (f.startsWith('rollup.')) { cp.rollup ||= {}; cp.rollup[f.slice(7)] = v || undefined; }
      else if (f === 'action') cp.action = v === 'run_done' ? { type: 'run_done' } : { type: 'status', status: v.slice(7) };
      else if (['divideBy', 'streakLength'].includes(f)) cp[f] = Number(v) || undefined;
      else cp[f] = v === '' ? undefined : v;
      if (f === 'limit' && v === '1') enforceLimit(cp);
      save(); draw();
    });
    el.querySelectorAll('[data-toggle]').forEach(t => t.onclick = () => {
      const f = t.dataset.toggle;
      if (f === 'twoWay') toggleTwoWay(cp);
      else if (f === 'hideNumber') cp.hideNumber = !cp.hideNumber;
      else if (f === 'endDate') { cp.endDate = !cp.endDate; convertDateValues(cp); }
      else cp[f] = !cp[f];
      save(); draw();
    });
    const formula = el.querySelector('[data-formula]');
    if (formula) {
      let timer;
      formula.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { cp.formula = formula.value; save(); const pos = formula.selectionStart; draw(); const f2 = el.querySelector('[data-formula]'); f2.focus(); f2.setSelectionRange(pos, pos); }, 400); };
    }
    // Options : ajouter, ⋯ (renommer / couleur / supprimer), glisser pour réordonner (et changer de groupe pour Status)
    el.querySelectorAll('[data-add-opt]').forEach(inp => inp.onkeydown = e => {
      if (e.key !== 'Enter' || !inp.value.trim()) return;
      cp.options.push({ id: uid(), label: inp.value.trim(), color: GROUP_COLORS[cp.options.length % GROUP_COLORS.length], ...(inp.dataset.addOpt ? { group: inp.dataset.addOpt } : {}) });
      save(); draw();
      el.querySelector(`[data-add-opt${inp.dataset.addOpt ? `="${inp.dataset.addOpt}"` : ''}]`)?.focus();
    });
    el.querySelectorAll('[data-opt-more]').forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      const o = optOf(cp, btn.dataset.optMore);
      openPop(btn, [
        { keepOpen: true, html: `<input class="pop-input" id="peOptName" value="${esc(o.label)}" aria-label="Nom de l'option">` },
        { icon: 'trash', label: 'Supprimer', danger: true, onClick: () => { cp.options = cp.options.filter(x => x !== o); save(); draw(); } },
        { sep: true }, { header: 'Couleurs' },
        ...['default', ...GROUP_COLORS].map(c => ({ html: `<span class="sw c-${c}"></span><span class="name">${{ default: 'Par défaut', gray: 'Gris', brown: 'Marron', orange: 'Orange', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', purple: 'Violet', pink: 'Rose', red: 'Rouge' }[c]}</span>`, checked: (o.color || 'default') === c, onClick: () => { o.color = c; save(); draw(); } })),
      ]);
      const ni = $('#peOptName');
      ni.focus(); ni.select();
      const commit = () => { if (ni.value.trim() && ni.value.trim() !== o.label) { o.label = ni.value.trim(); save(); draw(); } };
      ni.onkeydown = ev => { if (ev.key === 'Enter') { commit(); closePop(); } };
      ni.onchange = commit;
    });
    let drag = null;
    el.querySelectorAll('.pe-opt').forEach(row => {
      row.ondragstart = () => { drag = row.dataset.opt; };
      row.ondragover = e => { e.preventDefault(); row.classList.add('drop-before'); };
      row.ondragleave = () => row.classList.remove('drop-before');
      row.ondrop = e => {
        e.preventDefault();
        const moved = optOf(cp, drag);
        if (!moved || drag === row.dataset.opt) return draw();
        if (row.dataset.group) moved.group = row.dataset.group;
        const rest = cp.options.filter(o => o !== moved);
        rest.splice(rest.findIndex(o => o.id === row.dataset.opt), 0, moved);
        cp.options = rest; cp.optionSort = cp.type === 'status' ? cp.optionSort : 'manual';
        save(); draw();
      };
    });
    el.querySelectorAll('[data-group-zone]').forEach(z => {
      z.ondragover = e => e.preventDefault();
      z.ondrop = e => { if (e.target.closest('.pe-opt')) return; e.preventDefault(); const o = optOf(cp, drag); if (o) { o.group = z.dataset.groupZone; save(); draw(); } };
    });
    el.onclick = e => {
      e.stopPropagation();
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      if (act === 'close') return closePropertyEditor();
      if (act === 'groups') { closePropertyEditor(); return openOptionPicker(anchor.nextElementSibling, groupPickerConfig(() => [groupOf(S.get(id))], g => { S.patch(id, { group: g }); rerender(); }, rerender)); }
      if (act === 'columns') { closePropertyEditor(); return openPanel('group'); }
      if (act === 'type') return openPop(e.target.closest('[data-act]'), [
        { header: 'Changer le type' },
        ...Object.entries(PROP_TYPES).map(([t, def]) => ({ icon: def.icon, label: def.label, checked: cp.type === t, onClick: () => {
          if (t !== cp.type && !confirm(`Passer « ${cp.name} » en ${def.label} ? Les valeurs incompatibles seront effacées.`)) return;
          changePropType(cp, t); rerender(); draw();
        } })),
      ]);
      if (act === 'dup') {
        const copy = { ...JSON.parse(JSON.stringify(cp)), key: 'p-' + uid() + uid(), name: cp.name + ' (copie)', twoWay: undefined };
        CUSTOM_PROPS.splice(CUSTOM_PROPS.indexOf(cp) + 1, 0, copy); saveCustomProps();
        [Store, Templates].forEach(St => St.list().forEach(doc => { if (doc.props && cp.key in doc.props) St.patch(doc.id, { props: { ...doc.props, [copy.key]: JSON.parse(JSON.stringify(doc.props[cp.key])) } }); }));
        closePropertyEditor(); return rerender();
      }
      if (act === 'del') {
        if (!confirm(`Supprimer la propriété « ${cp.name} » de toutes les pages ?`)) return;
        if (cp.twoWay) { const rev = customDef(cp.twoWay); if (rev) rev.twoWay = undefined; }
        CUSTOM_PROPS = CUSTOM_PROPS.filter(x => x !== cp); saveCustomProps();
        closePropertyEditor(); return rerender();
      }
    };
  };
  draw();
  el.querySelector('[data-name]').focus();
}
document.addEventListener('click', e => { if (!e.target.closest('#propEditor, #nPop')) closePropertyEditor(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#propEditor') && !$('#nPop')) { e.stopPropagation(); closePropertyEditor(); } }, true);

// Limite à 1 élément : on ne garde que le premier sur toutes les pages
function enforceLimit(cp) {
  [Store, Templates].forEach(St => St.list().forEach(doc => {
    const v = doc.props?.[cp.key];
    if (Array.isArray(v) && v.length > 1) St.patch(doc.id, { props: { ...doc.props, [cp.key]: v.slice(0, 1) } });
  }));
}
// Date de fin activée / désactivée : conversion des valeurs existantes
function convertDateValues(cp) {
  [Store, Templates].forEach(St => St.list().forEach(doc => {
    const v = doc.props?.[cp.key];
    if (!v) return;
    const nv = cp.endDate ? (typeof v === 'object' ? v : { start: v, end: '' }) : (typeof v === 'object' ? v.start : v);
    St.patch(doc.id, { props: { ...doc.props, [cp.key]: nv } });
  }));
}
// Relation réciproque : une propriété jumelle sur les pages liées, tenue à jour dans les deux sens
function toggleTwoWay(cp) {
  if (cp.twoWay) {
    const rev = cp.twoWay;
    CUSTOM_PROPS = CUSTOM_PROPS.filter(x => x.key !== rev);
    cp.twoWay = undefined;
    return;
  }
  const rev = { key: 'p-' + uid() + uid(), name: `${cp.name} (lié)`, type: 'relation', options: [], pageVis: 'show', twoWay: cp.key };
  cp.twoWay = rev.key;
  CUSTOM_PROPS.push(rev);
  saveCustomProps();
  Store.list().forEach(doc => (doc.props?.[cp.key] || []).forEach(tid => linkRelation(rev.key, tid, doc.id, true)));
}
function linkRelation(key, fromId, toId, add) {
  const d = Store.get(fromId);
  if (!d) return;
  const list = d.props?.[key] || [];
  const next = add ? [...new Set([...list, toId])] : list.filter(x => x !== toId);
  if (next.length !== list.length || next.some((x, i) => x !== list[i])) Store.patch(fromId, { props: { ...(d.props || {}), [key]: next } });
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
  if (t === 'date') {
    const val = v && typeof v === 'object' ? v : { start: v || '', end: '' };
    const withTime = cp.timeFormat && cp.timeFormat !== 'hidden';
    const fmt = x => !x ? '' : withTime ? (x.length > 10 ? x.slice(0, 16) : x + 'T09:00') : x.slice(0, 10);
    const type = withTime ? 'datetime-local' : 'date';
    return `<span class="pv-wrap"><input class="pv pv-date" type="${type}" data-date="start" data-key="${cp.key}" value="${esc(fmt(val.start))}" aria-label="${esc(cp.name)}">${cp.endDate ? `<span class="pv-unit">→</span><input class="pv pv-date" type="${type}" data-date="end" data-key="${cp.key}" value="${esc(fmt(val.end))}" aria-label="${esc(cp.name)} (fin)">` : ''}</span>`;
  }
  // Nombre mis en forme (format, barre, anneau) : affiché, puis champ de saisie au clic
  if (t === 'number' && (cp.numberFormat && cp.numberFormat !== 'number' || cp.showAs && cp.showAs !== 'number' || cp.decimals !== undefined)) {
    return `<button class="val" data-num="${cp.key}"><span class="pills">${v === null || v === undefined || v === '' ? empty : numberHTML(Number(v), cp, 'page')}</span></button>`;
  }
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

function bindPropEditors(S, id, d, rerender) {
  const root = $('#peekProps');
  const setVal = (key, value) => { const cur = S.get(id); S.patch(id, { props: { ...(cur.props || {}), [key]: value } }); };
  const getVal = key => (S.get(id).props || {})[key];

  root.querySelectorAll('[data-num]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const key = btn.dataset.num;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any'; inp.className = 'pv';
    inp.value = getVal(key) ?? '';
    inp.setAttribute('aria-label', customDef(key).name);
    btn.replaceWith(inp);
    inp.focus();
    let done = false;
    const commit = () => { if (done) return; done = true; setVal(key, inp.value === '' ? null : Number(inp.value)); rerender(); };
    inp.onblur = commit;
    inp.onkeydown = ev => { if (ev.key === 'Enter') commit(); if (ev.key === 'Escape') { done = true; rerender(); } };
  });
  root.querySelectorAll('input[data-date]').forEach(inp => inp.onchange = () => {
    const cp = customDef(inp.dataset.key);
    const wrap = inp.closest('.pv-wrap');
    const start = wrap.querySelector('[data-date="start"]')?.value || '', end = wrap.querySelector('[data-date="end"]')?.value || '';
    setVal(cp.key, cp.endDate ? (start || end ? { start, end } : null) : (start || null));
    rerender();
  });
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
  // Texte, URL, e-mail, téléphone : zone d'édition flottante au-dessus de la cellule (comme Notion)
  root.querySelectorAll('input.pv:not([type]), input.pv[type=text], input.pv[type=url], input.pv[type=email], input.pv[type=tel]').forEach(inp => {
    inp.onfocus = () => { if (inp._skipFocus) { inp._skipFocus = false; return; } openTextPopover(inp); };
  });
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
    const cp = customDef(btn.dataset.pvSelect), many = PROP_TYPES[cp.type].many && cp.limit !== '1';
    const cur = () => { const v = getVal(cp.key); return PROP_TYPES[cp.type].many ? (v || []) : (v ? [v] : []); };
    const store = list => PROP_TYPES[cp.type].many ? list : (list[0] ?? null);
    openOptionPicker(btn, {
      many,
      state: () => ({ options: cp.options, selected: cur() }),
      onSelect: oid => { const list = cur(); setVal(cp.key, store(many ? (list.includes(oid) ? list.filter(x => x !== oid) : [...list, oid]) : (list[0] === oid ? [] : [oid]))); rerender(); },
      onRemove: oid => { setVal(cp.key, store(cur().filter(x => x !== oid))); rerender(); },
      onCreate: label => { const o = { id: uid(), label, color: GROUP_COLORS[cp.options.length % GROUP_COLORS.length] }; cp.options.push(o); saveCustomProps(); onSel(o.id); return o.id; },
      onEdit: (oid, change) => {
        const o = optOf(cp, oid);
        if (change.delete) cp.options = cp.options.filter(x => x !== o); else Object.assign(o, change);
        saveCustomProps(); rerender();
      },
      onReorder: ids => { cp.options = ids.map(i => optOf(cp, i)).filter(Boolean); saveCustomProps(); rerender(); },
    });
    function onSel(oid) { const list = cur(); setVal(cp.key, store(many ? [...new Set([...list, oid])] : [oid])); rerender(); }
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
            const one = customDef(key).limit === '1';
            setVal(key, [...(one ? [] : getVal(key) || []), { name: f.name, fileId, type: f.type, size: f.size }]); rerender();
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
          const rcp = customDef(key), list = getVal(key) || [];
          const next = list.includes(x.id) ? list.filter(z => z !== x.id) : rcp.limit === '1' ? [x.id] : [...list, x.id];
          setVal(key, next);
          // Relation réciproque : la page liée pointe en retour vers celle-ci
          if (rcp.twoWay && S === Store) {
            list.filter(z => !next.includes(z)).forEach(z => linkRelation(rcp.twoWay, z, id, false));
            next.filter(z => !list.includes(z)).forEach(z => linkRelation(rcp.twoWay, z, id, true));
          }
          rerender(); openList();
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
    const propLabelBefore = propDef(key)?.label || '';
    const vis = pageVisOf(key);
    const view = loadView();
    const onBoard = view.props.includes(key);
    const canEdit = true;
    openPop(k, [
      { icon: 'edit', label: 'Renommer', onClick: () => inlineRenameProp(k, key, rerender) },
      ...(canEdit ? [{ icon: 'sliders', label: 'Modifier la propriété', onClick: () => openPropertyEditor(k, key, S, id, rerender) }] : []),
      { sep: true },
      { icon: 'eyeOff', label: 'Visibilité de la propriété', value: '▸', keepOpen: true, onClick: row => openPop(row, [
        { header: 'Dans la page' },
        ...[['show', 'Toujours afficher'], ['empty', 'Masquer si vide'], ['hide', 'Toujours masquer']].map(([v, l]) => ({ icon: v === 'hide' ? 'eyeOff' : 'eye', label: l, checked: vis === v, onClick: () => { setPageVis(key, v); rerender(); } })),
        { sep: true },
        { icon: 'board', label: 'Afficher sur le tableau', switch: onBoard, onClick: () => { const v = loadView(); v.props = onBoard ? v.props.filter(x => x !== key) : [...v.props, key]; saveView(v); } },
      ]) },
      // Sections (comme Notion) : en créer une à partir de cette propriété, ou y déplacer la propriété
      { icon: 'group', label: 'Créer une section ici', onClick: () => { const sid = splitSectionAt(key); rerender(); renameSectionInline(sid, rerender); } },
      ...(pageLayout().some(x => x.name) ? [{ icon: 'move', label: 'Déplacer vers la section', value: '▸', keepOpen: true, onClick: row => openPop(row,
        pageLayout().map(x => ({ label: x.name || 'Sans section', checked: x.keys.includes(key), onClick: () => { movePropTo(key, x.id, x.keys.length); rerender(); } }))) }] : []),
      ...(cp ? [
        { icon: 'copy', label: 'Dupliquer la propriété', onClick: () => {
          const copy = { ...JSON.parse(JSON.stringify(cp)), key: 'p-' + uid() + uid(), name: cp.name + ' (copie)' };
          CUSTOM_PROPS.splice(CUSTOM_PROPS.indexOf(cp) + 1, 0, copy); saveCustomProps();
          [Store, Templates].forEach(St => St.list().forEach(doc => { if (doc.props && cp.key in doc.props) St.patch(doc.id, { props: { ...doc.props, [copy.key]: JSON.parse(JSON.stringify(doc.props[cp.key])) } }); }));
          rerender();
        } },
      ] : []),
      ...(UNDELETABLE_PROPS.includes(key) ? [] : [
        { sep: true },
        { icon: 'trash', label: 'Supprimer la propriété', danger: true, onClick: () => {
          deleteProp(key); rerender();
          toast(`Propriété « ${propLabelBefore} » supprimée`, { action: 'Annuler', onAction: () => { restoreProp(key); rerender(); } });
        } },
      ]),
    ]);
  });

  // Ajouter une propriété : nom + type (liste complète, comme Notion)
  const addProp = $('#addProp');
  if (addProp) addProp.onclick = e => {
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
      ...(deletedProps().length ? [{ sep: true }, { header: 'Propriétés supprimées' },
        ...deletedProps().map(item => ({ icon: 'reset', label: deletedLabel(item), value: 'Restaurer', onClick: () => { restoreProp(item.key); rerender(); } }))] : []),
    ]);
    const inp = $('#newPropName');
    inp.focus();
    inp.oninput = () => { typed = inp.value; };
    inp.onkeydown = ev => { if (ev.key === 'Enter') { closePop(); create('text'); } };
  };
}

/* ---------- Zone d'édition flottante des propriétés texte (comme Notion) ---------- */
// Posée sur la cellule, même largeur ; le texte y revient à la ligne et la zone grandit avec lui.
// Entrée, Échap, Tab ou un clic ailleurs valident. L'input d'origine reste la source des événements de sauvegarde.
function openTextPopover(inp) {
  if ($('#pvPop')) return;
  const cell = inp.closest('.pv-wrap') || inp, r = cell.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.id = 'pvPop'; pop.className = 'pv-pop';
  const ta = document.createElement('textarea');
  ta.rows = 1; ta.value = inp.value; ta.placeholder = inp.placeholder || '';
  ta.setAttribute('aria-label', inp.getAttribute('aria-label') || inp.closest('.prow')?.querySelector('.kname')?.textContent || '');
  pop.appendChild(ta);
  document.body.appendChild(pop);
  pop.style.left = r.left + 'px';
  pop.style.top = r.top + 'px';
  pop.style.width = Math.min(r.width, innerWidth - r.left - 8) + 'px';
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  fit();
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  let done = false;
  const close = refocus => {
    if (done) return; done = true;
    document.removeEventListener('pointerdown', outside, true);
    $('#drawer')?.removeEventListener('scroll', onScroll);
    pop.remove();
    inp.value = ta.value;
    inp.dispatchEvent(new Event('change'));
    if (refocus && inp.isConnected) { inp._skipFocus = true; inp.focus({ preventScroll: true }); }
  };
  const outside = e => { if (!pop.contains(e.target)) close(false); };
  const onScroll = () => close(false);
  document.addEventListener('pointerdown', outside, true);
  $('#drawer')?.addEventListener('scroll', onScroll);
  ta.oninput = () => {
    ta.value = ta.value.replace(/\n/g, ' ');   // une seule ligne logique : le retour à la ligne est visuel
    fit(); inp.value = ta.value; inp.dispatchEvent(new Event('input'));
  };
  ta.onkeydown = e => {
    e.stopPropagation();   // Échap ne doit pas fermer le tiroir
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); close(true); }
  };
  ta.onblur = () => close(false);
}

/* ---------- Ordre et sections des propriétés (glisser-déposer, comme Notion) ---------- */
function renameSectionInline(secId, rerender) {
  const btn = document.querySelector(`[data-sec-menu="${secId}"]`);
  if (!btn) return;
  const input = document.createElement('input');
  input.className = 'psec-rename';
  input.value = pageLayout().find(x => x.id === secId)?.name || '';
  input.setAttribute('aria-label', 'Nom de la section');
  btn.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const commit = save => {
    if (done) return; done = true;
    const L = pageLayout(), sec = L.find(x => x.id === secId);
    if (save && sec && input.value.trim()) { sec.name = input.value.trim(); savePageLayout(L); }
    rerender();
  };
  input.onclick = e => e.stopPropagation();
  input.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); };
  input.onblur = () => commit(true);
}

function bindPropLayout(root, rerender, showMore) {
  root.querySelectorAll('[data-more-sec]').forEach(b => b.onclick = e => {
    e.stopPropagation(); showMore[b.dataset.moreSec] = !showMore[b.dataset.moreSec]; rerender();
  });
  root.querySelectorAll('[data-sec-toggle]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const L = pageLayout(), sec = L.find(x => x.id === b.dataset.secToggle);
    sec.collapsed = !sec.collapsed; savePageLayout(L); rerender();
  });
  root.querySelectorAll('[data-sec-menu]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const secId = b.dataset.secMenu, sec = pageLayout().find(x => x.id === secId);
    openPop(b, [
      { icon: 'edit', label: 'Renommer la section', onClick: () => renameSectionInline(secId, rerender) },
      { icon: sec.collapsed ? 'chevron' : 'chevRight', label: sec.collapsed ? 'Déplier la section' : 'Replier la section', onClick: () => {
        const L = pageLayout(); L.find(x => x.id === secId).collapsed = !sec.collapsed; savePageLayout(L); rerender();
      } },
      { sep: true },
      { icon: 'trash', label: 'Supprimer la section', danger: true, onClick: () => { deleteSection(secId); rerender(); } },
    ]);
  });

  // Clavier : ↑ / ↓ sur la poignée déplacent la propriété (en passant d'une section à l'autre)
  root.querySelectorAll('[data-grip]').forEach(grip => grip.onkeydown = e => {
    if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const key = grip.closest('.prow').dataset.key, L = pageLayout();
    const si = L.findIndex(x => x.keys.includes(key)), i = L[si].keys.indexOf(key);
    if (e.key === 'ArrowUp') {
      if (i > 0) movePropTo(key, L[si].id, i - 1);
      else if (si > 0) movePropTo(key, L[si - 1].id, L[si - 1].keys.length);
    } else if (i < L[si].keys.length - 1) movePropTo(key, L[si].id, i + 2);
    else if (si < L.length - 1) movePropTo(key, L[si + 1].id, 0);
    rerender();
    root.querySelector(`.prow[data-key="${key}"] [data-grip]`)?.focus();
  });

  // Glisser-déposer à la souris ou au doigt, par la poignée ⋮⋮ (un simple clic ouvre le menu de la propriété)
  root.querySelectorAll('[data-grip]').forEach(grip => grip.onpointerdown = e => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const row = grip.closest('.prow'), key = row.dataset.key, x0 = e.clientX, y0 = e.clientY;
    let dragging = false, target = null, line = null;
    // Points d'insertion : avant chaque ligne, après la dernière ligne de chaque section, sous l'en-tête d'une section vide ou repliée
    const points = () => {
      const L = pageLayout(), top = root.getBoundingClientRect().top, pts = [];
      root.querySelectorAll('.psec').forEach(el => {
        const sec = L.find(x => x.id === el.dataset.sec);
        if (!sec) return;
        const rows = [...el.querySelectorAll('.prow')];
        rows.forEach(r => pts.push({ sec: sec.id, index: sec.keys.indexOf(r.dataset.key), y: r.getBoundingClientRect().top }));
        if (rows.length) {
          const lr = rows[rows.length - 1];
          pts.push({ sec: sec.id, index: sec.keys.indexOf(lr.dataset.key) + 1, y: lr.getBoundingClientRect().bottom });
        } else {
          const h = el.querySelector('.psec-head');
          pts.push({ sec: sec.id, index: sec.keys.length, y: h ? h.getBoundingClientRect().bottom : el.getBoundingClientRect().top || top });
        }
      });
      return pts;
    };
    let pts = null;
    const move = ev => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
        dragging = true; pts = points();
        row.classList.add('dragging'); document.body.classList.add('prop-dragging');
        line = document.createElement('div'); line.className = 'p-drop-line'; root.appendChild(line);
      }
      target = pts.reduce((best, p) => Math.abs(p.y - ev.clientY) < Math.abs(best.y - ev.clientY) ? p : best, pts[0]);
      line.style.top = (target.y - root.getBoundingClientRect().top - 2) + 'px';
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      document.body.classList.remove('prop-dragging');
      if (!dragging) { row.querySelector('[data-prop-menu]')?.click(); return; }
      line?.remove(); row.classList.remove('dragging');
      if (target) { movePropTo(key, target.sec, target.index); rerender(); }
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
}

// Les modifications faites dans le storyboard (iframe) mettent à jour les propriétés affichées.

/* ---------- Tiroir (side peek) / fenêtre centrée pour les templates ---------- */
let peek = null;   // { kind: 'vision' | 'template', id }

function openPeek(kind, id, { isNew = false } = {}) {
  const S = kind === 'template' ? Templates : Store;
  const doc = S.get(id);
  if (!doc) return;
  // Une autre carte était ouverte (clic sur une carte du Kanban, comme Notion) : on l'enregistre,
  // ou on l'abandonne si c'était une nouvelle page restée sans titre.
  if (peek && !(peek.kind === kind && peek.id === id)) {
    if (peek.isNew && peek.kind === 'vision' && !(Store.get(peek.id)?.title || '').trim()) { cancelBoardSave(); Store.remove(peek.id); }
    else flushBoardSave();
  }
  peek = { kind, id, isNew };   // isNew : carte tout juste créée, abandonnée si le titre reste vide
  const isTpl = kind === 'template';

  // Les templates s'ouvrent au centre, avec le bandeau « You're editing a template »
  $('#drawer').classList.toggle('center', isTpl);
  $('#drawer').classList.remove('full');
  $('#scrim').classList.toggle('center', isTpl);
  $('#drawer').setAttribute('aria-modal', isTpl ? 'true' : 'false');   // side peek : le Kanban reste utilisable
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

  const showMore = {};   // section id → propriétés masquées dépliées
  const renderProps = () => {
    const d = S.get(id);
    if (!d) return;
    const byKey = Object.fromEntries(allProps().map(p => [p.key, p]));
    const isHidden = p => {
      const vis = pageVisOf(p.key);
      const v = p.key === 'status' || p.key === 'group' ? 1 : rawValue(d, p.key);
      const empty = isEmptyVal(v) && !(v instanceof Error) && !['streak', 'button'].includes(customDef(p.key)?.type);
      return vis === 'hide' || (vis === 'empty' && empty);
    };
    const rowHTML = (p, sec) => `<div class="prow" data-key="${p.key}" data-sec="${sec.id}">
      <span class="p-grip" data-grip tabindex="0" role="button" title="Glisser pour déplacer" aria-label="Déplacer ${esc(p.label)}">${icon('grip')}</span>
      <span class="k custom" data-prop-menu="${p.key}" title="Options de la propriété">${icon(p.icon)}<span class="kname"${p.kind === 'custom' || p.renamed ? ' data-user' : ''}>${esc(p.label)}</span>${p.kind === 'story' ? `<span class="k-synced" title="Valeur synchronisée avec le storyboard">${icon('synced')}</span>` : ''}</span>
      ${propEditorHTML(d, p)}</div>`;
    // Comme Notion, par section : replié, « ˅ N autres propriétés » suit les propriétés visibles ;
    // déplié, les propriétés masquées puis « ˄ Masquer N propriétés ». « + Ajouter une propriété » termine la dernière section.
    const addBtn = `<button class="add-prop" id="addProp">${icon('plus')} Add a property</button>`;
    const L = pageLayout();
    $('#peekProps').innerHTML = L.map((sec, i) => {
      const last = i === L.length - 1;
      const props = sec.keys.map(k => byKey[k]).filter(Boolean);
      const shown = props.filter(p => !isHidden(p)), more = props.filter(isHidden);
      const n = more.length, s = n > 1 ? 's' : '', open = showMore[sec.id];
      const head = sec.name ? `<div class="psec-head" data-sec-head="${sec.id}">
          <button class="psec-name" data-sec-menu="${sec.id}" data-user>${esc(sec.name)}</button>
          <button class="psec-toggle" data-sec-toggle="${sec.id}" aria-expanded="${!sec.collapsed}" aria-label="Replier la section">${icon(sec.collapsed ? 'chevRight' : 'chevron')}</button>
        </div>` : '';
      if (sec.collapsed) return `<div class="psec" data-sec="${sec.id}">${head}</div>`;
      const moreBtn = (label, ic) => `<button class="more-props"${last ? ' id="moreProps"' : ''} data-more-sec="${sec.id}">${icon(ic)} ${label}</button>`;
      return `<div class="psec" data-sec="${sec.id}">${head}`
        + shown.map(p => rowHTML(p, sec)).join('')
        + (!props.length && sec.name ? '<div class="psec-empty">Glisser une propriété ici</div>' : '')
        + (!n ? (last ? addBtn : '')
          : open ? more.map(p => rowHTML(p, sec)).join('') + (last ? addBtn : '') + moreBtn(`Masquer ${n} propriété${s}`, 'chevUp')
          : moreBtn(`${n} autre${s} propriété${s}`, 'chevron'))
        + '</div>';
    }).join('');
    bindPropEditors(S, id, d, renderProps);
    bindPropLayout($('#peekProps'), renderProps, showMore);
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
