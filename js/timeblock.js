/* Time block (maquette 3a « Page complète avec ligne de vie ») :
   barre du minuteur, ligne de vie Lire → Run → Kata → Terminer, historique de Kata. */

/* ============================================================
   Time block : Lire → Run → Kata → Terminé
   Le storyboard n'est éditable qu'à l'étape Kata (et après l'enregistrement du cycle).
   ============================================================ */
const TB_ORDER = ['read', 'run', 'kata', 'done'];
let tbInterval = null;
let tbHistOpen = false;   // « Historique de Kata » replié par défaut
let tbDrag = null;        // index de l'étape de routine en cours de déplacement
const isTplDoc = () => DocStore === Templates;

function newSession(cardId, durationMin = 60) {
  return { id: uid(), cardId, step: 'read', startedAt: null, durationMin, runStatus: null };
}

// Expérience en cours = dernière entrée du record de l'obstacle actif (sinon du record global).
function currentExperiment() {
  const active = board.obstacles.find(o => o.focus && !o.done);
  const list = active ? board.experiments.filter(x => x.obstacleId === active.id) : board.experiments;
  return list.length ? { x: list[list.length - 1], n: list.length, obstacle: active } : null;
}
function updateReminder() {}   // ancien rappel d'expérience : remplacé par la section Lire

/* ---------- État dérivé ---------- */
const TB_DONE_COL = 'done';
function flowColumns() {
  return [
    { id: 'todo', label: 'À faire', kind: 'todo' },
    ...board.current.asIs.map(b => ({
      id: b.id, label: b.name || 'Étape sans nom', kind: b.isObstacle ? 'warn' : 'step',
      meta: [b.value, typeof b.waitAfter === 'string' && b.waitAfter ? `attente ${b.waitAfter}` : ''].filter(Boolean).join(' · '),
    })),
    { id: TB_DONE_COL, label: 'Fait', kind: 'done' },
  ];
}
function runProgress() {
  const R = board.run.routine, items = board.run.flow ? board.run.items : [];
  const known = new Set(flowColumns().map(c => c.id));
  const colOf = it => known.has(it.column) ? it.column : 'todo';
  const rDone = R.filter(r => r.done).length, fDone = items.filter(it => colOf(it) === TB_DONE_COL).length;
  return { rDone, rN: R.length, fDone, fN: items.length, colOf, allDone: rDone === R.length && fDone === items.length };
}

/* ---------- Rendu d'ensemble ---------- */
function renderTimeblock() {
  clearInterval(tbInterval);
  if (isTplDoc()) { renderStage(); return; }
  renderBar();
  renderStage();
}

// Barre collante : Time block · phase · ▶ Lancer · minuteur / durée · Run impossible
function renderBar() {
  const s = board.session, i = TB_ORDER.indexOf(s.step);
  $('#tb').innerHTML = `
    <div class="tb-row">
      <span class="tb-label">Time block</span>
      <span class="tb-phase">${['1 · Lire', '2 · Run', '3 · Kata', 'Terminé'][i]}</span>
      <span class="tb-spacer"></span>
      ${!s.startedAt && s.step !== 'done' ? '<button class="tb-btn" data-tb="launch">▶ Lancer</button>' : ''}
      <span class="tb-timer" id="timer"></span>
      <span class="tb-dur">/ ${s.startedAt || s.step === 'done'
        ? s.durationMin
        : `<input type="number" id="tbDuration" min="5" max="480" step="5" value="${s.durationMin}" aria-label="Durée du time block (min)">`} min</span>
      ${s.step === 'run' ? '<button class="tb-btn danger" data-tb="impossible">Run impossible</button>' : ''}
    </div>
    <div class="tb-impossible" id="tbImpossible" hidden>
      <textarea id="impossibleText" placeholder="Qu'est-ce qui a empêché le run ? Ce texte devient un obstacle dans le Parking Lot."></textarea>
      <div class="row">
        <button class="tb-btn primary" data-tb="impossibleConfirm">Créer l'obstacle et passer au Kata</button>
        <button class="tb-btn" data-tb="impossibleCancel">Annuler</button>
      </div>
    </div>`;
  $('#tb').querySelectorAll('[data-tb]').forEach(btn => btn.onclick = () => tbAction(btn.dataset.tb));
  const dur = $('#tbDuration');
  if (dur) dur.onchange = () => {
    s.durationMin = Math.max(5, Math.min(480, parseInt(dur.value, 10) || 60));
    dur.value = s.durationMin;
    scheduleSave(); renderTimer();
  };
  renderTimer();
  if (s.startedAt && s.step !== 'done') tbInterval = setInterval(renderTimer, 1000);
}

// Temps restant (au-delà de la durée : « +MM:SS » en rouge)
function renderTimer() {
  const s = board.session, el = $('#timer');
  if (!el) return;
  const elapsed = s.startedAt ? Math.floor(((s.endedAt || Date.now()) - s.startedAt) / 1000) : 0;
  const left = s.durationMin * 60 - elapsed, abs = Math.abs(left);
  el.textContent = `${left < 0 ? '+' : ''}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  el.classList.toggle('over', left < 0);
}

function tbAction(act) {
  const s = board.session;
  if (act === 'launch') s.startedAt = Date.now();
  if (act === 'read') {
    s.step = 'run';
    board.run.routine.forEach(r => r.done = false);   // nouveau run : checklist décochée
  }
  if (act === 'validate') Object.assign(s, { step: 'kata', runStatus: 'done' });
  if (act === 'impossible') { $('#tbImpossible').hidden = false; $('#impossibleText').focus(); return; }
  if (act === 'impossibleCancel') { $('#tbImpossible').hidden = true; return; }
  if (act === 'impossibleConfirm') {
    const text = $('#impossibleText').value.trim();
    if (!text) { $('#impossibleText').focus(); return toast('Décrivez ce qui a bloqué le run'); }
    board.obstacles.push({ id: uid(), text, done: false, focus: false });
    Object.assign(s, { step: 'kata', runStatus: 'impossible' });
    renderObstacles(); renderRecord();
    toast('Obstacle ajouté au Parking Lot');
  }
  if (act === 'save') {
    // Historique et récurrence : écrits directement dans le stockage (champs partagés avec la page)
    const stored = DocStore.get(board.id) || board;
    Object.assign(s, { step: 'done', endedAt: Date.now() });
    const timeblocks = [...(stored.timeblocks || []), { ...s }];
    const fields = { timeblocks };
    if (s.runStatus === 'done' && stored.recur?.every) fields.recur = { ...stored.recur, due: addDaysISO(localISO(), stored.recur.every) };
    if (s.runStatus === 'done' && ['goal', 'wip'].includes(statusOf(stored))) Object.assign(fields, { status: 'success', statusSince: Date.now() });
    DocStore.patch(board.id, fields);
    board.timeblocks = timeblocks;
    toast(fields.recur ? `Cycle enregistré · prochain run ${relDay(fields.recur.due)}` : 'Cycle enregistré');
  }
  scheduleSave();
  renderTimeblock();
  if (act === 'validate' || act === 'impossibleConfirm') setTimeout(() => $('#tlKata')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

/* ---------- Ligne de vie ---------- */
// Cercle : done (vert ✓), active (anneau + point bleu), ready (anneau bleu + halo, 🔒), open (anneau + halo), locked (gris 🔒)
function tlNode(state, { act, label } = {}) {
  const inner = { done: '✓', active: '<span class="dot"></span>', ready: '🔒', locked: '🔒', open: '' }[state];
  return act
    ? `<button class="tl-node ${state}" data-tb="${act}" title="${esc(label)}" aria-label="${esc(label)}">${inner}</button>`
    : `<span class="tl-node ${state}" aria-hidden="true">${inner}</span>`;
}

function renderStage() {
  const tpl = isTplDoc();
  const step = tpl ? 'template' : board.session.step;
  const i = TB_ORDER.indexOf(step);
  const readonly = step === 'read' || step === 'run';
  $('#sbFrame').inert = readonly;
  $('#sbFrame').classList.toggle('readonly', readonly);
  $('section.experiments').classList.toggle('spot', step === 'kata');
  $('#tl').classList.toggle('no-rail', tpl);

  if (tpl) {
    $('#stage').innerHTML = `<div class="tl-seg tl-run"><div class="tl-body">${routineHTML('template')}</div></div>
      <div class="tl-seg tl-flux"><div class="tl-body">${fluxHTML('template')}</div></div>`;
    $('#tlKata').innerHTML = ''; $('#tlEnd').innerHTML = ''; $('#kataHist').innerHTML = '';
    bindRun('template');
    return;
  }

  const P = runProgress(), isRun = step === 'run';
  const on = n => i > n ? ' on' : '';   // tronçon de ligne vert une fois l'étape franchie
  const cur = currentExperiment();
  const chal = board.challengeBy || board.challengeResult || board.challengeVision
    ? `D'ici <b data-user>${esc(board.challengeBy || '…')}</b>, <b data-user>${esc(board.challengeResult || '…')}</b>, afin de <b data-user>${esc(board.challengeVision || '…')}</b>.`
    : '<span class="tl-muted">Challenge non défini : complétez-le dans le storyboard à l\'étape Kata.</span>';
  const chip = (cls, k, v) => `<div class="tl-chip ${cls}"><span class="k">${k}</span><span class="v"${v ? ' data-user' : ''}>${v ? esc(v) : '<span class="tl-muted">—</span>'}</span></div>`;
  const arrow = '<div class="tl-arrow" aria-hidden="true">→</div>';
  const n3ready = isRun && P.allDone;

  $('#stage').innerHTML = `
    <div class="tl-seg tl-read${on(0)}">
      ${tlNode(i > 0 ? 'done' : 'active', i === 0 ? { act: 'read', label: 'Valider la lecture' } : {})}
      <div class="tl-body">
        <div class="tl-title"><span class="tl-kicker ${i > 0 ? 'g' : 'b'}">1 · LIRE</span><h3>Se rappeler l'objectif</h3></div>
        <div class="tl-challenge">${chal}</div>
        <div class="tl-chain">
          ${chip('', 'Target Condition', board.target.outcome)}${arrow}
          ${chip('c-obs', 'Obstacle', cur?.obstacle?.text || board.obstacles.find(o => o.focus && !o.done)?.text)}${arrow}
          ${chip('c-exp', `Expérience${cur ? ` #${cur.n}` : ''}`, cur?.x.step)}${arrow}
          ${chip('', 'Je prédis', cur?.x.expect)}
        </div>
      </div>
    </div>
    <div class="tl-seg tl-check${on(0)}"><div class="tl-body">
      ${i === 0 ? '<span class="tl-hint">Cliquez le cercle ● pour valider la lecture</span>' : '<span class="tl-hint g">Lu ✓</span>'}
    </div></div>
    <div class="tl-seg tl-run${on(1)}">
      ${tlNode(i > 1 ? 'done' : isRun ? 'active' : 'locked')}
      <div class="tl-body">
        <div class="tl-title"><span class="tl-kicker ${i > 1 ? 'g' : isRun ? 'b' : ''}">2 · RUN</span><h3>Dérouler le standard</h3><span class="tl-note">≈ 90 % du time block</span></div>
        ${routineHTML(step)}
      </div>
    </div>
    <div class="tl-seg tl-flux${on(1)}"><div class="tl-body">${fluxHTML(step)}</div></div>
    <div class="tl-seg tl-check tl-check2${on(1)}"><div class="tl-body">
      ${i > 1 ? `<span class="tl-hint g">${board.session.runStatus === 'impossible' ? 'Run impossible · obstacle ajouté au Parking Lot' : 'Run validé ✓'}</span>`
        : n3ready ? '<span class="tl-hint b">Run terminé · cliquez le cadenas 🔒 pour passer au Kata</span>'
        : `<span class="tl-hint">${i === 0 ? 'Le Kata s\'ouvre une fois le run terminé' : `Reste : routine ${P.rDone}/${P.rN}${board.run.flow ? ` · flux ${P.fDone}/${P.fN}` : ''}`}</span>`}
    </div></div>`;

  // 3 · Kata : en-tête et bandeau d'état, le storyboard (#sbFrame) suit dans le même tronçon
  $('#tlKataSeg').classList.toggle('on', i > 2);
  $('#tlKata').innerHTML = `
    ${tlNode(i > 2 ? 'done' : step === 'kata' ? 'active' : n3ready ? 'ready' : 'locked', n3ready ? { act: 'validate', label: 'Passer au Kata' } : {})}
    <div class="tl-title"><span class="tl-kicker ${i > 2 ? 'g' : step === 'kata' ? 'b' : ''}">3 · KATA</span><h3>Storyboard</h3><span class="tl-note">≈ 10 %</span></div>
    ${i < 2 ? `<div class="tl-banner locked"><span aria-hidden="true">🔒</span><span class="grow">Lecture seule. Le storyboard devient éditable une fois le run validé.</span><span class="tl-muted">Routine ${P.rDone}/${P.rN}${board.run.flow ? ` · Flux ${P.fDone}/${P.fN}` : ''}</span></div>`
      : step === 'kata' ? `<div class="tl-banner open"><span aria-hidden="true">✎</span><span class="grow">Éditable. ${cur ? `Complétez l'expérience #${cur.n} (Happened / Learned), puis définissez la suivante.` : 'Définissez la prochaine expérience.'}</span></div>` : ''}`;

  const every = DocStore.get(board.id)?.recur?.every;
  $('#tlEnd').innerHTML = `
    <div class="tl-seg tl-end${on(2)}">
      ${tlNode(i > 2 ? 'done' : step === 'kata' ? 'open' : 'locked', step === 'kata' ? { act: 'save', label: 'Terminer le time block' } : {})}
      <div class="tl-body">
        <span class="tl-end-label ${i > 2 ? 'g' : step === 'kata' ? '' : 'off'}">Terminer le time block</span>
        ${step === 'kata' ? `<span class="tl-hint b">cliquez le cercle pour enregistrer le cycle${every ? ` · prochain run dans ${every} j` : ''}</span>` : ''}
        ${i > 2 ? '<span class="tl-hint g">Cycle enregistré ✓</span>' : ''}
      </div>
    </div>`;

  $('#tl').querySelectorAll('[data-tb]').forEach(btn => btn.onclick = () => tbAction(btn.dataset.tb));
  bindRun(step);
  renderHistory();
}

/* ---------- 2 · Run : Routine ---------- */
function routineHTML(step) {
  const R = board.run.routine, isRun = step === 'run';
  const cur = isRun ? R.findIndex(r => !r.done) : -1;
  const done = R.filter(r => r.done).length;
  return `
    <div class="rt" id="rtSec">
      <div class="rt-head"><span class="rt-h">Routine</span><span class="grow"></span>
        <span class="rt-count">${done} / ${R.length}</span>
        <div class="rt-bar" aria-hidden="true"><div style="width:${R.length ? Math.round(done / R.length * 100) : 0}%"></div></div>
      </div>
      <div class="rt-list ${step === 'read' ? 'dim' : ''}">
        ${R.map((r, k) => `
          <div class="rt-row ${r.done ? 'done' : ''} ${k === cur ? 'cur' : ''}" data-k="${k}">
            <span class="rt-grip" draggable="true" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</span>
            <button class="rt-box" role="checkbox" aria-checked="${r.done}" ${isRun ? '' : 'aria-disabled="true"'} title="${isRun ? 'Fait' : 'Se coche pendant le run'}" aria-label="${esc(r.label || 'Étape du standard')}">${r.done ? '✓' : ''}</button>
            <input class="rt-lbl" data-rid="${r.id}" value="${esc(r.label)}" placeholder="Étape du standard" aria-label="Étape du standard">
            ${k === cur ? '<span class="rt-tag">en cours</span>' : ''}
          </div>`).join('')}
        <button class="rt-add" id="addRoutine">+ Étape du standard</button>
      </div>
    </div>`;
}

/* ---------- 2 · Run : Flux (optionnel selon la carte) ---------- */
function fluxHTML(step) {
  const run = board.run, isRun = step === 'run', P = runProgress();
  const head = `<div class="fx-head"><span class="rt-h">Flux</span><span class="fx-tag">optionnel</span>
    <span class="tl-note">${run.flow ? 'cliquez une carte pour l\'avancer' : 'non utilisé sur cette carte'}</span><span class="grow"></span>
    ${run.flow ? `<span class="rt-count">${P.fDone} / ${P.fN} fait</span>` : ''}
    <button class="tb-btn" id="fluxCfg">⚙ Personnaliser</button></div>`;
  if (!run.flow) return head;
  const cols = flowColumns();
  return head + `
    <div class="fx-grid ${step === 'read' ? 'dim' : ''}" style="grid-template-columns:repeat(${cols.length},minmax(0,1fr))">
      ${cols.map((c, ci) => {
        const items = run.items.filter(it => P.colOf(it) === c.id);
        const movable = isRun && c.id !== TB_DONE_COL;
        return `<div class="fx-col ${c.kind}">
          <div class="fx-col-h"><span class="fx-pill" title="${esc(c.label)}"${c.kind === 'step' || c.kind === 'warn' ? ' data-user' : ''}>${c.kind === 'warn' ? '⚠ ' : ''}${esc(c.label)}</span><span class="fx-n">${items.length}</span></div>
          ${c.meta ? `<div class="fx-meta" data-user>${esc(c.meta)}</div>` : ''}
          ${items.map(it => `<div class="fx-card ${movable ? 'movable' : ''}" data-id="${it.id}" data-ci="${ci}" ${movable ? `role="button" tabindex="0" title="Avancer d'une colonne"` : ''}>
            <span data-user>${esc(it.title)}</span><button class="fx-del" title="Supprimer" aria-label="Supprimer ${esc(it.title)}">✕</button></div>`).join('')}
          ${c.id === 'todo' ? `<input class="fx-new" id="newItem" placeholder="+ Carte (Entrée)" aria-label="Nouvelle carte du flux">` : ''}
        </div>`;
      }).join('')}
    </div>
    ${!board.current.asIs.length ? '<p class="tl-muted fx-hint">Ajoutez des étapes au diagramme As Is (Current Condition) pour créer les colonnes intermédiaires.</p>' : ''}`;
}

function bindRun(step) {
  const run = board.run, isRun = step === 'run';
  const rerender = focusId => {
    renderStage();
    if (focusId) { const el = $(`#tl input[data-rid="${focusId}"]`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  };
  const R = () => run.routine;

  // Routine : cocher (pendant le run), éditer, Entrée / Retour arrière / ↑ ↓, glisser ⋮⋮
  $('#tl').querySelectorAll('.rt-row').forEach(row => {
    const k = +row.dataset.k, r = R()[k];
    row.querySelector('.rt-box').onclick = () => { if (!isRun) return; r.done = !r.done; scheduleSave(); rerender(); };
    const lbl = row.querySelector('.rt-lbl');
    lbl.oninput = () => { r.label = lbl.value; scheduleSave(); };
    lbl.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); const nid = uid(); R().splice(k + 1, 0, { id: nid, label: '', done: false }); scheduleSave(); rerender(nid); }
      if (e.key === 'Backspace' && !lbl.value && R().length > 1) { e.preventDefault(); const to = (R()[k - 1] || R()[k + 1]).id; R().splice(k, 1); scheduleSave(); rerender(to); }
      if (e.key === 'ArrowUp' && k > 0) { e.preventDefault(); rerender(R()[k - 1].id); }
      if (e.key === 'ArrowDown' && k < R().length - 1) { e.preventDefault(); rerender(R()[k + 1].id); }
    };
    const grip = row.querySelector('.rt-grip');
    grip.ondragstart = e => { tbDrag = k; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(k)); };
    grip.ondragend = () => { tbDrag = null; $('#tl').querySelectorAll('.rt-row.over').forEach(x => x.classList.remove('over')); };
    row.ondragover = e => { if (tbDrag == null) return; e.preventDefault(); row.classList.add('over'); };
    row.ondragleave = () => row.classList.remove('over');
    row.ondrop = e => {
      e.preventDefault();
      const from = tbDrag; tbDrag = null;
      if (from == null || from === k) return rerender();
      const [m] = R().splice(from, 1); R().splice(k, 0, m);
      scheduleSave(); rerender();
    };
  });
  const addR = $('#addRoutine');
  if (addR) addR.onclick = () => { const nid = uid(); R().push({ id: nid, label: '', done: false }); scheduleSave(); rerender(nid); };

  // Flux : Personnaliser (activer sur cette carte, colonnes = As Is), ajouter, avancer d'une colonne, supprimer
  const cfg = $('#fluxCfg');
  if (cfg) cfg.onclick = e => {
    e.stopPropagation();
    openPop(cfg, [
      { icon: 'board', label: 'Utiliser le flux sur cette carte', switch: !!run.flow, onClick: () => { run.flow = !run.flow; scheduleSave(); rerender(); } },
      { sep: true },
      { icon: 'edit', label: 'Colonnes : étapes du diagramme As Is', onClick: () => $('#diag-current')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) },
    ]);
  };
  const newItem = $('#newItem');
  if (newItem) newItem.onkeydown = e => {
    if (e.key !== 'Enter' || !newItem.value.trim()) return;
    run.items.push({ id: uid(), title: newItem.value.trim(), column: 'todo' });
    scheduleSave(); rerender();
    $('#newItem')?.focus();
  };
  const cols = flowColumns();
  $('#tl').querySelectorAll('.fx-card').forEach(el => {
    const it = run.items.find(x => x.id === el.dataset.id);
    el.querySelector('.fx-del').onclick = e => { e.stopPropagation(); run.items = run.items.filter(x => x !== it); scheduleSave(); rerender(); };
    if (!el.classList.contains('movable')) return;
    const advance = () => { it.column = cols[+el.dataset.ci + 1].id; scheduleSave(); rerender(); };
    el.onclick = advance;
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } };
  });
}

/* ---------- Historique de Kata ---------- */
const fmtShort = iso => iso ? new Date(iso + 'T00:00').toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' }) : '…';
function renderHistory() {
  const el = $('#kataHist');
  if (!el) return;
  const start = board.tcStartedAt || localISO(new Date(board.createdAt || Date.now()));
  const past = board.tcHistory || [];
  const hasCurrent = !!(board.target.outcome || board.target.process || board.targetDate);
  const nExp = board.experiments.filter(x => !x.date || x.date >= start).length;
  const n = past.length + (hasCurrent ? 1 : 0);
  el.innerHTML = `
    <div class="kh-head">
      <button class="kh-toggle" id="khToggle" aria-expanded="${tbHistOpen}"><span class="kh-arrow" aria-hidden="true">${tbHistOpen ? '▼' : '▶'}</span><span class="kh-title">Historique de Kata</span></button>
      <span class="tl-note">${n} Target Condition${n > 1 ? 's' : ''}</span>
      <span class="grow"></span>
      ${hasCurrent ? '<button class="tb-btn" id="closeTc">Clore la Target Condition</button>' : ''}
    </div>
    ${tbHistOpen ? `
      <div class="kh-row kh-th"><span></span><span>Target Condition</span><span>Période</span><span>Expériences</span></div>
      ${hasCurrent ? `<div class="kh-row"><span class="b">●</span><span class="cur"><span${board.target.outcome ? ' data-user' : ''}>${esc(board.target.outcome || 'Target Condition sans résultat')}</span> <span class="tl-muted">· en cours</span></span><span class="tl-muted">${fmtShort(start)} → ${fmtShort(board.targetDate)}</span><span class="tl-muted">${nExp}</span></div>` : ''}
      ${[...past].reverse().map(h => `<div class="kh-row"><span class="g">✓</span><span${h.outcome ? ' data-user' : ''}>${esc(h.outcome || 'Target Condition sans résultat')}</span><span class="tl-muted">${fmtShort(h.from)} → ${fmtShort(h.to)}</span><span class="tl-muted">${h.experiments}</span></div>`).join('')}
      ${!n ? '<div class="tl-muted kh-empty">Aucune Target Condition pour l\'instant.</div>' : ''}` : ''}`;
  $('#khToggle').onclick = () => { tbHistOpen = !tbHistOpen; renderHistory(); };
  const close = $('#closeTc');
  if (close) close.onclick = closeTargetCondition;
}

// Archive la Target Condition en cours et en ouvre une vierge (Current Condition, obstacles et record sont conservés)
function closeTargetCondition() {
  if (!confirm('Clore la Target Condition en cours ? Elle passe dans l\'historique et une nouvelle Target Condition vierge la remplace.')) return;
  const start = board.tcStartedAt || localISO(new Date(board.createdAt || Date.now()));
  board.tcHistory = [...(board.tcHistory || []), {
    id: uid(), outcome: board.target.outcome, process: board.target.process, pattern: board.target.pattern,
    targetDate: board.targetDate, from: start, to: localISO(),
    experiments: board.experiments.filter(x => !x.date || x.date >= start).length,
  }];
  board.target = { ...emptyCondition(), toBe: [] };
  board.targetDate = '';
  board.tcStartedAt = localISO();
  tbHistOpen = true;
  saveBoardNow();
  renderBoard(board.id, SB_ROOT);
  toast('Target Condition close · définissez la suivante dans le storyboard');
}

function conditionFields(side) {
  return CONDITION_FIELDS.map(f => `
    <label class="metric ${f.key}">
      <span>${f.label}</span>
      <textarea rows="1" data-field="${side}.${f.key}" placeholder="${esc(f[side])}"></textarea>
    </label>`).join('');
}
