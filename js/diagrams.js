/* Block diagrams As Is / To Be, Experimenting Record et Obstacles Parking Lot. */

/* ============================================================
   Block diagrams : To Be (Target) / As Is (Current)
   ============================================================ */
const MAX_BLOCKS = 6;
const DIAGRAMS = {
  target:  { key: 'toBe', title: 'To Be', canFlag: false },
  current: { key: 'asIs', title: 'As Is', canFlag: true },
};
const blocksOf = side => board[side][DIAGRAMS[side].key];

function renderDiagram(side) {
  const { title, canFlag } = DIAGRAMS[side];
  const blocks = blocksOf(side);
  const el = $('#diag-' + side);

  el.innerHTML = `
    <div class="diagram-head">
      <span>${title}</span>
      ${side === 'target' ? `<button data-act="init" title="Rother : la Target Condition se construit en copiant la Current Condition">Initialiser depuis As Is</button>` : ''}
    </div>
    ${blocks.map((b, i) => `
      <div class="blk ${canFlag && b.isObstacle ? 'obstacle' : ''}" data-i="${i}">
        ${canFlag && b.isObstacle ? '<span class="warn" title="Obstacle">⚠</span>' : ''}
        <input class="blk-name" data-k="name" value="${esc(b.name)}" placeholder="Étape">
        <input class="blk-val" data-k="value" value="${esc(b.value)}" placeholder="valeur">
        <div class="blk-tools">
          ${canFlag ? `<button data-act="flag" class="${b.isObstacle ? 'on' : ''}" title="Marquer comme obstacle">⚠</button>` : ''}
          <button data-act="up" title="Monter" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button data-act="down" title="Descendre" ${i === blocks.length - 1 ? 'disabled' : ''}>↓</button>
          <button data-act="del" title="Supprimer">✕</button>
        </div>
      </div>
      ${i < blocks.length - 1 ? `
        <div class="conn" data-i="${i}">
          <span></span>
          <span class="down">↓</span>
          <span class="side">${typeof b.waitAfter === 'string'
            ? `<span class="tri" title="Attente">▲</span><input data-k="waitAfter" value="${esc(b.waitAfter)}" placeholder="durée"><button data-act="nowait" title="Retirer l'attente">✕</button>`
            : `<button class="add-wait" data-act="wait">+ attente</button>`}</span>
        </div>` : ''}`).join('')}
    <button class="add" data-act="add" ${blocks.length >= MAX_BLOCKS ? 'disabled' : ''}>
      ${blocks.length >= MAX_BLOCKS ? `Maximum ${MAX_BLOCKS} blocs` : '+ Bloc'}
    </button>`;

  // Édition inline : on met à jour le modèle sans re-rendre (le focus est conservé).
  el.querySelectorAll('input[data-k]').forEach(input => {
    const i = +input.closest('[data-i]').dataset.i;
    input.oninput = () => { blocks[i][input.dataset.k] = input.value; scheduleSave(); };
  });

  el.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => {
    const i = +btn.closest('[data-i]')?.dataset.i;
    const act = btn.dataset.act;
    if (act === 'add') blocks.push({ id: uid(), name: '', value: '', isObstacle: false });
    if (act === 'del') blocks.splice(i, 1);
    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? i - 1 : i + 1;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    }
    if (act === 'flag') blocks[i].isObstacle = !blocks[i].isObstacle;
    if (act === 'wait') blocks[i].waitAfter = '';
    if (act === 'nowait') delete blocks[i].waitAfter;
    if (act === 'init') {
      const src = blocksOf('current');
      if (!src.length) return toast('Le diagramme As Is est vide');
      if (blocks.length && !confirm(`Remplacer les ${blocks.length} bloc(s) du To Be par une copie de l'As Is ?`)) return;
      board.target.toBe = src.map(b => ({ ...b, id: uid(), isObstacle: false }));
    }
    renderDiagram(side); scheduleSave();
    if (act === 'add') el.querySelectorAll('.blk-name')[blocksOf(side).length - 1]?.focus();
    if (act === 'wait') el.querySelector(`.conn[data-i="${i}"] input`)?.focus();
  });
}

const activeObstacle = () => board.obstacles.find(o => o.focus && !o.done);
const obstacleLabel = o => o.text.trim() || 'Obstacle sans titre';
const shortDate = d => d ? new Date(d + 'T00:00').toLocaleDateString(LOCALE(), { day: '2-digit', month: '2-digit' }) : '';

function setActiveObstacle(id) {
  board.obstacles.forEach(o => o.focus = o.id === id);   // un seul obstacle travaillé à la fois
  renderRecord(); renderObstacles(); scheduleSave();
}

/* Experimenting Record : un bloc par obstacle.
   Seul le bloc de l'obstacle en cours est éditable ; les autres sont archivés en dessous. */
function renderRecord() {
  const active = activeObstacle();
  const open = board.obstacles.filter(o => !o.done);
  const current = active ? board.experiments.filter(x => x.obstacleId === active.id) : [];

  const others = board.obstacles
    .filter(o => o !== active)
    .map(o => ({ o, exps: board.experiments.filter(x => x.obstacleId === o.id) }))
    .filter(g => g.exps.length);
  const knownIds = new Set(board.obstacles.map(o => o.id));
  const orphans = board.experiments.filter(x => !x.obstacleId || !knownIds.has(x.obstacleId));
  if (orphans.length) others.push({ o: null, exps: orphans });

  $('#record').innerHTML = `
    <div class="rec-obs ${active ? '' : 'none'}">
      <strong>Obstacle :</strong>
      <select id="obsSelect">
        <option value="">— choisir dans le Parking Lot —</option>
        ${open.map(o => `<option value="${o.id}" ${o === active ? 'selected' : ''}>${esc(obstacleLabel(o).slice(0, 60))}</option>`).join('')}
      </select>
      ${active ? `<button id="liftObs" title="Archive ce record et libère le Record pour l'obstacle suivant">✓ Obstacle levé</button>` : ''}
    </div>
    ${active ? `
      <div id="expList">${current.map((x, i) => experimentCard(x, i)).join('')}</div>
      <button class="add" id="addExp">+ Nouvelle expérience</button>`
    : `<p class="hint">${open.length ? 'Sélectionnez l\'obstacle travaillé pour ouvrir son record.' : 'Ajoutez un obstacle dans le Parking Lot pour commencer.'}</p>`}
    ${others.length ? `
      <details class="archive">
        <summary>Archives · ${others.length} record${others.length > 1 ? 's' : ''}</summary>
        ${others.map(({ o, exps }) => `
          <div class="arch-group">
            <div class="arch-title">${o ? esc(obstacleLabel(o)) : 'Expériences non rattachées'}
              ${o ? `<span class="badge ${o.done ? 'lifted' : ''}">${o.done ? 'levé' : 'en pause'}</span>` : ''}
            </div>
            <ol>${exps.map(x => `
              <li>${esc(shortDate(x.date))} — ${esc(x.step || '(étape non renseignée)')}
                ${x.learned ? `<div class="learned">→ ${esc(x.learned)}</div>` : ''}</li>`).join('')}
            </ol>
          </div>`).join('')}
      </details>` : ''}`;

  $('#obsSelect').onchange = e => setActiveObstacle(e.target.value || null);
  if (!active) return;

  $('#liftObs').onclick = () => {
    active.done = true; active.focus = false;
    renderRecord(); renderObstacles(); scheduleSave();
    toast('Record archivé — choisissez le prochain obstacle');
  };
  $('#addExp').onclick = () => {
    board.experiments.push({ id: uid(), obstacleId: active.id, date: new Date().toISOString().slice(0, 10), step: '', expect: '', happened: '', learned: '' });
    renderRecord(); scheduleSave();
    const steps = $('#expList').querySelectorAll('[data-k=step]');
    steps[steps.length - 1]?.focus();
  };

  $('#expList').querySelectorAll('.exp').forEach(row => {
    const x = board.experiments.find(e => e.id === row.dataset.id);
    row.querySelectorAll('[data-k]').forEach(el => {
      if (el.tagName === 'TEXTAREA') autoGrow(el);
      el.oninput = () => { x[el.dataset.k] = el.value; if (el.tagName === 'TEXTAREA') autoGrow(el); scheduleSave(); };
    });
    row.querySelector('.del').onclick = () => {
      if (!confirm('Supprimer cette expérience ?')) return;
      board.experiments = board.experiments.filter(e => e !== x);
      renderRecord(); scheduleSave();
    };
  });
}

function experimentCard(x, i) {
  return `
    <div class="exp" data-id="${x.id}">
      <div class="exp-head">
        <span class="num">#${i + 1}</span>
        <input type="date" data-k="date" value="${esc(x.date)}">
        <span class="spacer"></span>
        <button class="icon del" title="Supprimer">✕</button>
      </div>
      <div class="exp-grid">
        <label class="exp-field"><span>Step</span><textarea rows="1" data-k="step" placeholder="Étape / ce que je vais tester">${esc(x.step)}</textarea></label>
        <label class="exp-field"><span>Expect</span><textarea rows="1" data-k="expect" placeholder="Qu'est-ce que j'attends ?">${esc(x.expect)}</textarea></label>
        <label class="exp-field"><span>Happened</span><textarea rows="1" data-k="happened" placeholder="Que s'est-il passé ?">${esc(x.happened)}</textarea></label>
        <label class="exp-field"><span>Learned</span><textarea rows="1" data-k="learned" placeholder="Qu'avons-nous appris ?">${esc(x.learned)}</textarea></label>
      </div>
    </div>`;
}

function renderObstacles() {
  const list = $('#obsList');
  list.innerHTML = board.obstacles.map(o => `
    <div class="obs ${o.done ? 'done' : ''} ${o.focus && !o.done ? 'focus' : ''}" data-id="${o.id}">
      <button class="icon arrow" title="Travailler cet obstacle" ${o.done ? 'disabled' : ''}>➜</button>
      <input type="checkbox" ${o.done ? 'checked' : ''} title="Levé">
      <input type="text" value="${esc(o.text)}" placeholder="Obstacle…">
      <button class="icon del" title="Supprimer">✕</button>
    </div>`).join('');

  list.querySelectorAll('.obs').forEach(row => {
    const o = board.obstacles.find(x => x.id === row.dataset.id);
    const text = row.querySelector('input[type=text]');
    text.oninput = () => { o.text = text.value; scheduleSave(); };
    text.onchange = () => renderRecord();   // met à jour le libellé dans le sélecteur
    text.onkeydown = e => { if (e.key === 'Enter') $('#addObs').click(); };
    row.querySelector('input[type=checkbox]').onchange = e => {
      o.done = e.target.checked;
      if (o.done) o.focus = false;
      renderRecord(); renderObstacles(); scheduleSave();
    };
    row.querySelector('.arrow').onclick = () => setActiveObstacle(o.focus ? null : o.id);
    row.querySelector('.del').onclick = () => {
      const n = board.experiments.filter(x => x.obstacleId === o.id).length;
      if (n && !confirm(`Cet obstacle a ${n} expérience(s). Elles passeront en « non rattachées ». Supprimer ?`)) return;
      board.obstacles = board.obstacles.filter(x => x !== o);
      renderRecord(); renderObstacles(); scheduleSave();
    };
  });
}
