/* Time block Lire → Run → Kata et section Run (Routine / Flux). */

/* ============================================================
   Time block : Lire → Run → Kata
   Le Kata (cycle de coaching) n'est accessible qu'après le Run.
   ============================================================ */
const STEPS = [
  { key: 'read', label: 'Lire' },
  { key: 'run',  label: 'Run' },
  { key: 'kata', label: 'Kata' },
];
let tbInterval = null;
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

function reminderHTML() {
  const cur = currentExperiment();
  if (!cur) return 'Aucune expérience en cours : définissez-la à l\'étape Kata.';
  return `<b>Expérience #${cur.n}</b> ${esc(cur.x.step || '(étape non renseignée)')}<span class="sep">·</span><b>Prédiction</b> ${esc(cur.x.expect || '—')}`;
}
function updateReminder() {
  const el = $('#tbReminder');
  el.innerHTML = reminderHTML();
  el.classList.toggle('empty', !currentExperiment());
}

function renderTimeblock() {
  clearInterval(tbInterval);
  if (isTplDoc()) { renderStage(); return; }
  const s = board.session;
  const idx = STEPS.findIndex(st => st.key === s.step);

  const actions = {
    read: `<button class="tb-btn primary" data-tb="start">Commencer le run</button>`,
    run:  `<button class="tb-btn primary" data-tb="validate">✔ Valider le run</button>
           <button class="tb-btn danger" data-tb="impossible">Run impossible</button>`,
    kata: `<button class="tb-btn primary" data-tb="save">Enregistrer le cycle</button>`,
  }[s.step];

  $('#tb').innerHTML = `
    <div class="tb-row">
      <div class="stepper" aria-label="Étapes du time block">
        ${STEPS.map((st, i) => {
          const state = i < idx ? 'done' : i === idx ? 'active' : 'locked';
          const mark = state === 'done' ? '✓' : state === 'active' ? '●' : '🔒';
          return `${i ? `<span class="link ${i <= idx ? 'done' : ''}"></span>` : ''}
            <span class="st ${state}" ${state === 'locked' ? 'aria-disabled="true" title="Verrouillé"' : ''}><span class="mark">${mark}</span>${i + 1}. ${st.label}</span>`;
        }).join('')}
      </div>
      <span class="tb-spacer"></span>
      <span class="timer" id="timer"></span>
      <span class="tb-actions">${actions}</span>
    </div>
    <div class="tb-reminder ${currentExperiment() ? '' : 'empty'}" id="tbReminder">${reminderHTML()}</div>
    <div class="tb-impossible" id="tbImpossible" hidden>
      <textarea id="impossibleText" placeholder="Qu'est-ce qui a empêché le run ? Ce texte devient un obstacle dans le Parking Lot."></textarea>
      <div class="row">
        <button class="tb-btn primary" data-tb="impossibleConfirm">Créer l'obstacle et passer au Kata</button>
        <button class="tb-btn" data-tb="impossibleCancel">Annuler</button>
      </div>
    </div>`;

  $('#tb').querySelectorAll('[data-tb]').forEach(btn => btn.onclick = () => tbAction(btn.dataset.tb));
  renderTimer();
  if (s.startedAt) tbInterval = setInterval(renderTimer, 1000);
  renderStage();
}

function renderTimer() {
  const s = board.session;
  const el = $('#timer');
  if (!el) return;
  if (!s.startedAt) {
    el.className = 'timer';
    el.innerHTML = `⏱ <input type="number" id="tbDuration" min="5" max="480" step="5" value="${s.durationMin}" title="Durée du time block"> min`;
    $('#tbDuration').onchange = e => {
      s.durationMin = Math.max(5, Math.min(480, parseInt(e.target.value, 10) || 60));
      e.target.value = s.durationMin;
      scheduleSave();
    };
    return;
  }
  const left = Math.round((s.startedAt + s.durationMin * 60000 - Date.now()) / 1000);
  const abs = Math.abs(left);
  const mmss = `${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  el.className = `timer running ${left < 0 ? 'over' : ''}`;
  el.innerHTML = `⏱ <strong>${left < 0 ? '+' : ''}${mmss}</strong> <span style="color:var(--muted)">/ ${s.durationMin} min</span>`;
}

function tbAction(act) {
  const s = board.session;
  if (act === 'start') {
    board.session = { ...newSession(board.id, s.durationMin), step: 'run', startedAt: Date.now() };
    board.run.routine.forEach(r => r.done = false);   // nouveau time block : checklist décochée
  }
  if (act === 'validate') Object.assign(s, { step: 'kata', runStatus: 'done' });
  if (act === 'impossible') {
    $('#tbImpossible').hidden = false;
    $('#impossibleText').focus();
    return;
  }
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
    const timeblocks = [...(stored.timeblocks || []), { ...s, endedAt: Date.now() }];
    const fields = { timeblocks };
    if (s.runStatus === 'done' && stored.recur?.every) fields.recur = { ...stored.recur, due: addDaysISO(localISO(), stored.recur.every) };
    if (s.runStatus === 'done' && ['goal', 'wip'].includes(statusOf(stored))) Object.assign(fields, { status: 'success', statusSince: Date.now() });
    DocStore.patch(board.id, fields);
    board.timeblocks = timeblocks;
    board.session = newSession(board.id, s.durationMin);
    toast(fields.recur ? `Cycle enregistré · prochain run ${relDay(fields.recur.due)}` : 'Cycle enregistré');
  }
  scheduleSave();
  renderTimeblock();
  if (board.session.step === 'kata') setTimeout(() => $('section.experiments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  else if (inDrawer && SB_ROOT?.closest('.drawer')) {
    const drawer = SB_ROOT.closest('.drawer');
    const top = drawer.querySelector('.peek-top')?.offsetHeight || 0;
    if (drawer.scrollTop > SB_ROOT.offsetTop - top) drawer.scrollTo({ top: SB_ROOT.offsetTop - top, behavior: 'smooth' });
  }
  else scrollTo({ top: 0, behavior: 'smooth' });
}

/* Premier plan selon l'étape + verrouillage du storyboard */
function renderStage() {
  const step = isTplDoc() ? 'template' : board.session.step;
  const readonly = step === 'read' || step === 'run';
  $('#sbFrame').inert = readonly;
  $('#sbFrame').classList.toggle('readonly', readonly);
  $('section.experiments').classList.toggle('spot', step === 'kata');

  const cur = currentExperiment();
  let html = '';
  if (step === 'read') {
    html = `
      <div class="stage-card">
        <h3>1. Lire — l'expérience du jour</h3>
        ${cur ? `<dl class="focus-exp">
          ${cur.obstacle ? `<dt>Obstacle</dt><dd>${esc(cur.obstacle.text)}</dd>` : ''}
          <dt>Expérience #${cur.n}</dt><dd>${esc(cur.x.step || '(étape non renseignée)')}</dd>
          <dt>Prédiction</dt><dd>${esc(cur.x.expect || '—')}</dd>
        </dl>` : `<p class="muted">Aucune expérience définie. Lancez quand même le run, ou passez par le Kata pour en définir une.</p>`}
        <div class="muted">Relisez le storyboard ci-dessous (Challenge, Target / Current Condition), préparez le run, puis cliquez sur « Commencer le run ».</div>
      </div>
      ${runSectionHTML('prep')}`;
  } else if (step === 'run') {
    html = runSectionHTML('run');
  } else if (step === 'kata') {
    html = `
      <div class="stage-card">
        <h3>3. Kata — cycle de coaching</h3>
        <div class="muted">Run ${board.session.runStatus === 'impossible' ? 'impossible : l\'obstacle a été ajouté au Parking Lot' : 'validé'}. Le storyboard est éditable : complétez l'Experimenting Record (Happened / Learned), puis définissez la prochaine expérience.</div>
        <ol>
          <li>Quelle est la Target Condition ?</li>
          <li>Quelle est la condition actuelle ?</li>
          <li>Qu'aviez-vous prévu ? Que s'est-il passé ? Qu'avez-vous appris ?</li>
          <li>Quels obstacles vous empêchent d'atteindre la Target Condition ? Lequel traitez-vous maintenant ?</li>
          <li>Quelle est votre prochaine étape ? Qu'en attendez-vous ?</li>
          <li>Quand pourrons-nous voir ce que vous avez appris ?</li>
        </ol>
      </div>`;
  } else {
    html = runSectionHTML('template');
  }
  $('#stage').innerHTML = html;
  bindRunSection(step === 'run' ? 'run' : step === 'read' ? 'prep' : 'template');
}

/* ---------- Section Run ---------- */
// ctx : 'prep' (préparation, étape Lire), 'run' (exécution), 'template' (configuration)
function flowColumns() {
  return [
    { id: 'todo', label: 'À faire', edge: true },
    ...board.current.asIs.map(b => ({ id: b.id, label: b.name || 'Étape sans nom' })),
    { id: 'done', label: 'Fait', edge: true },
  ];
}

function runSectionHTML(ctx) {
  const run = board.run;
  const canCheck = ctx === 'run';
  const hint = {
    prep: 'Préparation : ajustez le standard avant de commencer.',
    run: run.mode === 'routine' ? 'Cochez chaque étape réalisée.' : 'Faites avancer les items d\'une colonne à l\'autre.',
    template: 'Configuration reprise par chaque nouvelle Vision.',
  }[ctx];

  let body;
  if (run.mode === 'routine') {
    const done = run.routine.filter(r => r.done).length;
    body = `
      <ul class="routine">
        ${run.routine.map(r => `
          <li class="${r.done ? 'done' : ''}" data-id="${r.id}">
            <input type="checkbox" ${r.done ? 'checked' : ''} ${canCheck ? '' : 'disabled'} title="${canCheck ? 'Fait' : 'Se coche pendant le run'}">
            <input class="lbl" value="${esc(r.label)}" placeholder="Étape du standard de travail">
            <button class="icon del" title="Supprimer">✕</button>
          </li>`).join('')}
      </ul>
      <button class="add" id="addRoutine">+ Étape du standard</button>
      ${run.routine.length && ctx === 'run' ? `<div class="routine-progress" style="margin-top:6px">${done} / ${run.routine.length} étapes faites</div>` : ''}`;
  } else if (ctx === 'template') {
    body = `<p class="hint">Mode Flux : les colonnes reprendront les blocs du diagramme As Is de chaque Vision.</p>`;
  } else {
    const cols = flowColumns();
    const known = new Set(cols.map(c => c.id));
    body = `<div class="flow">
      ${cols.map(c => {
        const items = run.items.filter(it => (known.has(it.column) ? it.column : 'todo') === c.id);
        return `<div class="fcol ${c.edge ? 'edge' : ''}" data-col="${c.id}">
          <div class="fcol-h"><span title="${esc(c.label)}">${esc(c.label)}</span><span>${items.length}</span></div>
          ${items.map(it => `<div class="fitem" draggable="${canCheck}" data-id="${it.id}"><span>${esc(it.title)}</span><button class="icon del" title="Supprimer">✕</button></div>`).join('')}
          ${c.id === 'todo' ? `<input class="new-item" id="newItem" placeholder="+ Item (Entrée)">` : ''}
        </div>`;
      }).join('')}
    </div>
    ${!board.current.asIs.length ? '<p class="hint">Ajoutez des blocs au diagramme As Is (Current Condition) pour créer les colonnes intermédiaires.</p>' : ''}`;
  }

  return `
    <section class="run" id="runSec">
      <div class="run-head">
        <h3>${ctx === 'run' ? '2. Run' : 'Run'}</h3>
        <div class="seg" role="group" aria-label="Mode du run">
          <button data-mode="routine" class="${run.mode === 'routine' ? 'on' : ''}">Routine</button>
          <button data-mode="flow" class="${run.mode === 'flow' ? 'on' : ''}">Flux</button>
        </div>
        <span class="hint-inline">${hint}</span>
      </div>
      ${body}
    </section>`;
}

function bindRunSection(ctx) {
  const sec = $('#runSec');
  if (!sec) return;
  const run = board.run;
  const rerender = () => { $('#stage').querySelector('#runSec').outerHTML = runSectionHTML(ctx); bindRunSection(ctx); };

  sec.querySelectorAll('[data-mode]').forEach(btn => btn.onclick = () => { run.mode = btn.dataset.mode; scheduleSave(); rerender(); });

  // Routine
  sec.querySelectorAll('.routine li').forEach(li => {
    const r = run.routine.find(x => x.id === li.dataset.id);
    li.querySelector('input[type=checkbox]').onchange = e => { r.done = e.target.checked; scheduleSave(); rerender(); };
    const lbl = li.querySelector('input.lbl');
    lbl.oninput = () => { r.label = lbl.value; scheduleSave(); };
    lbl.onkeydown = e => { if (e.key === 'Enter') $('#addRoutine').click(); };
    li.querySelector('.del').onclick = () => { run.routine = run.routine.filter(x => x !== r); scheduleSave(); rerender(); };
  });
  const addR = $('#addRoutine');
  if (addR) addR.onclick = () => {
    run.routine.push({ id: uid(), label: '', done: false });
    scheduleSave(); rerender();
    const lbls = $('#runSec').querySelectorAll('input.lbl');
    lbls[lbls.length - 1]?.focus();
  };

  // Flux
  const newItem = $('#newItem');
  if (newItem) newItem.onkeydown = e => {
    if (e.key !== 'Enter' || !newItem.value.trim()) return;
    run.items.push({ id: uid(), title: newItem.value.trim(), column: 'todo' });
    scheduleSave(); rerender();
    $('#newItem')?.focus();
  };
  sec.querySelectorAll('.fitem').forEach(el => {
    const it = run.items.find(x => x.id === el.dataset.id);
    el.querySelector('.del').onclick = () => { run.items = run.items.filter(x => x !== it); scheduleSave(); rerender(); };
    el.ondragstart = e => e.dataTransfer.setData('text/plain', it.id);
  });
  if (ctx === 'run') sec.querySelectorAll('.fcol').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('drop'); };
    col.ondragleave = () => col.classList.remove('drop');
    col.ondrop = e => {
      e.preventDefault();
      const it = run.items.find(x => x.id === e.dataTransfer.getData('text/plain'));
      if (it) { it.column = col.dataset.col; scheduleSave(); }
      rerender();
    };
  });
}

function conditionFields(side) {
  return CONDITION_FIELDS.map(f => `
    <label class="metric ${f.key}">
      <span>${f.label}</span>
      <textarea rows="1" data-field="${side}.${f.key}" placeholder="${esc(f[side])}"></textarea>
    </label>`).join('');
}
