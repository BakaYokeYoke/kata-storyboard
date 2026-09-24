/* Panneau « View settings » : Property visibility, Filter, Sort, Group, Sub-group. */

/* ============================================================
   Panneau « View settings » (comme Notion)
   ============================================================ */
let panelPage = null;   // 'root' | 'props' | 'filter' | 'sort' | 'group' | 'subgroup'

function openPanel(page) { panelPage = page; $('#btnSettings')?.classList.add('on'); renderPanel(); }
function closePanel() {
  if (!panelPage) return;
  panelPage = null;
  $('#viewPanel')?.remove();
  $('#btnSettings')?.classList.remove('on');
}

function renderPanel() {
  let el = $('#viewPanel');
  if (!el) {
    el = document.createElement('div');
    el.id = 'viewPanel';
    el.className = 'vp';
    document.body.appendChild(el);
  }
  const bar = $('.n-bar').getBoundingClientRect();
  const newBtn = $('.n-new').getBoundingClientRect();
  el.style.top = Math.max(8, bar.bottom + 2) + 'px';
  el.style.right = Math.max(0, innerWidth - newBtn.right) + 'px';

  const view = loadView();
  const head = (title, back) => `
    <div class="vp-head">
      ${back ? `<button class="vp-back" data-vp-go="root" title="Retour">${icon('back')}</button>` : ''}
      <span class="vp-title ${back ? 'strong' : ''}">${title}</span>
      <button class="vp-x" data-vp-close title="Fermer">${icon('x')}</button>
    </div>`;
  const row = (ic, label, value, go, attrs = '') => `
    <div class="vp-row ${go ? '' : 'static'}" ${go ? `data-vp-go="${go}"` : ''} ${attrs}>
      ${ic ? `<span class="ic">${icon(ic)}</span>` : ''}<span class="lbl">${label}</span>
      <span class="val">${value ?? ''}</span>${go ? `<span class="chev">${icon('chevRight')}</span>` : ''}
    </div>`;
  const toggle = (label, key) => `
    <div class="vp-row" data-switch="${key}"><span class="lbl">${label}</span><span class="n-switch ${view[key] ? 'on' : ''}"></span></div>`;
  const check = on => on ? `<span class="check">${icon('check')}</span>` : '';
  const eyeBtn = (on, attr) => `<button class="eye" ${attr} title="${on ? 'Masquer' : 'Afficher'}">${icon(on ? 'eye' : 'eyeOff')}</button>`;
  const nFilters = countFilters(view);

  const pages = {
    root: () => `
      ${head('View settings')}
      ${row('board', 'Layout', 'Board')}
      ${row('eye', 'Property visibility', view.props.length, 'props')}
      ${row('filter', 'Filter', nFilters || '', 'filter')}
      ${row('sort', 'Sort', view.sort !== 'manual' ? 1 : '', 'sort')}
      ${row('board', 'Group', 'Status', 'group')}
      ${row('subgroup', 'Sub-group', view.subgroups ? 'Pro/Perso' : 'None', 'subgroup')}
      <div class="vp-sep"></div>
      ${row('bolt', 'Automations', [view.autoTomorrow, view.autoSuccess, view.autoRecur].filter(Boolean).length || 'Off', 'automations')}`,

    automations: () => `
      ${head('Automations', true)}
      <div class="vp-label">Chaque matin, au premier affichage de la journée</div>
      ${toggle('Tomorrow → Daily Goal', 'autoTomorrow')}
      ${toggle('Daily Success → Incoming', 'autoSuccess')}
      ${toggle('Runs récurrents : Daily Goal le jour J, Tomorrow la veille', 'autoRecur')}
      <div class="vp-sep"></div>
      <div class="vp-row" data-act="runAuto"><span class="ic">${icon('bolt')}</span><span class="lbl">Lancer maintenant</span></div>
      <div class="vp-label">Dernier passage : ${esc(localStorage.getItem('kata-daily-run') || 'jamais')}. Un bilan s'affiche, avec « Annuler ».</div>`,

    props: () => {
      const hidden = allProps().filter(p => !view.props.includes(p.key));
      return `
        ${head('Property visibility', true)}
        <input class="vp-search" id="vpSearch" placeholder="Search for a property…" autocomplete="off">
        <div class="vp-sec"><span>Shown in board</span>${view.props.length ? '<button class="vp-link" data-act="hideAllProps">Hide all</button>' : ''}</div>
        <div class="vp-item fixed" data-label="name"><span class="grip none">${icon('grip')}</span><span class="ic">Aa</span><span class="lbl">Name</span>${eyeBtn(true, 'disabled')}</div>
        ${view.props.map(k => `
          <div class="vp-item" draggable="true" data-key="${k}" data-label="${esc(propDef(k).label.toLowerCase())}">
            <span class="grip">${icon('grip')}</span><span class="ic">${icon(propDef(k).icon)}</span><span class="lbl">${esc(propDef(k).label)}</span>${eyeBtn(true, `data-prop="${k}"`)}
          </div>`).join('')}
        ${hidden.length ? `
          <div class="vp-sec"><span>Hidden in board</span><button class="vp-link" data-act="showAllProps">Show all</button></div>
          ${hidden.map(p => `
            <div class="vp-item off" data-label="${esc(p.label.toLowerCase())}">
              <span class="grip none">${icon('grip')}</span><span class="ic">${icon(p.icon)}</span><span class="lbl">${esc(p.label)}</span>${eyeBtn(false, `data-prop="${p.key}"`)}
            </div>`).join('')}` : ''}`;
    },

    filter: () => {
      const f = activeFilters(view);
      return `
        ${head('Filter', true)}
        ${nFilters ? `<div class="vp-row danger" data-act="clearFilters"><span class="ic">${icon('trash')}</span><span class="lbl">Retirer les filtres (${nFilters})</span></div><div class="vp-sep"></div>` : ''}
        ${allProps().map(p => `
          <div class="vp-label vp-flabel">${icon(p.icon)} ${esc(p.label)}</div>
          ${filterChoices(p.key).map(c => `<div class="vp-row" data-cf="${p.key}" data-cv="${esc(c.id)}"><span class="lbl">${c.html}</span>${check((f[p.key] || []).includes(c.id))}</div>`).join('')}`).join('')}`;
    },

    sort: () => `
      ${head('Sort', true)}
      ${[['manual', 'Manuel', null], ['title', 'Name', 'text'], ...allProps().map(p => [p.key, p.label, p.icon])].map(([k, l, ic]) => `
        <div class="vp-row" data-sort="${k}">${ic ? `<span class="ic">${icon(ic)}</span>` : ''}<span class="lbl">${esc(l)}</span>${check(view.sort === k)}</div>`).join('')}
      ${view.sort !== 'manual' ? `<div class="vp-sep"></div>${row(null, 'Ordre', view.sortDir === 'asc' ? 'Ascending' : 'Descending', null, 'data-act="sortDir" style="cursor:pointer"')}` : ''}`,

    group: () => {
      const all = orderedStatuses(view);
      return `
        ${head('Group', true)}
        ${row(null, 'Group by', 'Status')}
        ${toggle('Hide empty groups', 'hideEmptyCols')}
        ${toggle('Color columns', 'colorCols')}
        <div class="vp-sep"></div>
        <div class="vp-sec"><span>Groups</span>${view.hidden.length === all.length
          ? '<button class="vp-link" data-act="showAllCols">Show all</button>'
          : '<button class="vp-link" data-act="hideAllCols">Hide all</button>'}</div>
        ${all.map(st => {
          const on = !view.hidden.includes(st.key);
          return `<div class="vp-item ${on ? '' : 'off'}" draggable="true" data-key="${st.key}">
            <span class="grip">${icon('grip')}</span><span class="lbl">${pill(st)}</span>${eyeBtn(on, `data-col="${st.key}"`)}
          </div>`;
        }).join('')}`;
    },

    subgroup: () => `
      ${head('Sub-group', true)}
      ${row(null, 'Sub-group by', view.subgroups ? 'Pro/Perso' : 'None', null, 'data-act="subBy" style="cursor:pointer"')}
      ${view.subgroups ? `
        ${row(null, 'Sort', 'Manual')}
        ${toggle('Hide empty groups', 'hideEmptySub')}
        <div class="vp-sep"></div>
        <div class="vp-sec"><span>Groups</span>${view.hiddenSub.length === GROUPS.length
          ? '<button class="vp-link" data-act="showAllSub">Show all</button>'
          : '<button class="vp-link" data-act="hideAllSub">Hide all</button>'}</div>
        ${GROUPS.map(g => {
          const on = !view.hiddenSub.includes(g.key);
          return `<div class="vp-item ${on ? '' : 'off'}"><span class="grip none">${icon('grip')}</span>
            <span class="lbl"><span class="n-pill c-${g.color}" style="border-radius:4px">${g.label}</span></span>${eyeBtn(on, `data-sub="${g.key}"`)}</div>`;
        }).join('')}
        <div class="vp-sep"></div>
        <div class="vp-row danger" data-act="removeSub"><span class="ic">${icon('trash')}</span><span class="lbl">Remove grouping</span></div>` : ''}`,
  };
  el.innerHTML = pages[panelPage]();

  const commit = () => { saveView(view); renderKanban(); };
  const toggleIn = (arr, k) => arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k];

  el.onclick = e => {
    e.stopPropagation();
    closePop();
    const t = e.target.closest('[data-vp-go],[data-vp-close],[data-act],[data-prop],[data-col],[data-sub],[data-switch],[data-cf],[data-sort]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if ('vpClose' in d) return closePanel();
    if (d.vpGo) { panelPage = d.vpGo; return renderPanel(); }
    if (d.prop) view.props = toggleIn(view.props, d.prop);
    if (d.col) view.hidden = toggleIn(view.hidden, d.col);
    if (d.sub) view.hiddenSub = toggleIn(view.hiddenSub, d.sub);
    if (d.switch) view[d.switch] = !view[d.switch];
    if (d.cf) {
      if (d.cf === 'group') view.groups = toggleIn(view.groups, d.cv);
      else if (d.cf === 'status') view.statuses = toggleIn(view.statuses, d.cv);
      else { view.cf[d.cf] = toggleIn(view.cf[d.cf] || [], d.cv); if (!view.cf[d.cf].length) delete view.cf[d.cf]; }
    }
    if (d.sort) view.sort = d.sort;
    if (d.act === 'hideAllProps') view.props = [];
    if (d.act === 'showAllProps') view.props = [...view.props, ...allProps().map(p => p.key).filter(k => !view.props.includes(k))];
    if (d.act === 'clearFilters') { view.groups = []; view.statuses = []; view.cf = {}; }
    if (d.act === 'sortDir') view.sortDir = view.sortDir === 'asc' ? 'desc' : 'asc';
    if (d.act === 'hideAllCols') view.hidden = STATUSES.map(st => st.key);
    if (d.act === 'showAllCols') view.hidden = [];
    if (d.act === 'hideAllSub') view.hiddenSub = GROUPS.map(g => g.key);
    if (d.act === 'showAllSub') view.hiddenSub = [];
    if (d.act === 'removeSub') view.subgroups = false;
    if (d.act === 'runAuto') { closePanel(); runDailyAutomation(true); return renderKanban(); }
    if (d.act === 'subBy') {
      return openPop(t, [
        { label: 'None', checked: !view.subgroups, onClick: () => { view.subgroups = false; commit(); } },
        { label: 'Pro/Perso', checked: view.subgroups, onClick: () => { view.subgroups = true; commit(); } },
      ]);
    }
    commit();
  };

  // Recherche de propriété
  const search = $('#vpSearch');
  if (search) search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    el.querySelectorAll('.vp-item[data-label]').forEach(it => it.hidden = !!q && !it.dataset.label.includes(q));
  };

  // Réordonner par glisser-déposer (propriétés visibles, colonnes)
  let dragKey = null;
  el.querySelectorAll('.vp-item[draggable=true]').forEach(it => {
    it.ondragstart = e => { dragKey = it.dataset.key; e.dataTransfer.setData('text/plain', dragKey); };
    it.ondragover = e => { e.preventDefault(); it.classList.add('drop-before'); };
    it.ondragleave = () => it.classList.remove('drop-before');
    it.ondrop = e => {
      e.preventDefault();
      const target = it.dataset.key;
      if (!dragKey || dragKey === target) return renderPanel();
      const key = panelPage === 'props' ? 'props' : 'order';
      const list = key === 'order' ? orderedStatuses(view).map(st => st.key) : [...view.props];
      list.splice(list.indexOf(dragKey), 1);
      list.splice(list.indexOf(target), 0, dragKey);
      view[key] = list;
      commit();
    };
  });
}
