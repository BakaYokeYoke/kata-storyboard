/* Storyboard (format Mike Rother) : rendu et sauvegarde. */

/* ============================================================
   Vue storyboard
   ============================================================ */
let board, saveTimer;
// Champs édités par le Kanban / le tiroir, jamais par l'éditeur de storyboard.
const SHELL_FIELDS = ['title', 'icon', 'status', 'statusSince', 'group', 'props', 'recur', 'timeblocks', 'name', 'isDefault', 'repeat', 'lastRepeat', 'order'];

function saveBoardNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!board) return;
  const stored = DocStore.get(board.id);
  if (stored) SHELL_FIELDS.forEach(k => { if (k in stored) board[k] = stored[k]; else delete board[k]; });
  DocStore.save(board);
  if ($('#status')) $('#status').textContent = 'Enregistré';
  // Dans le tiroir, les propriétés calculées depuis le storyboard se mettent à jour
  if (typeof peek !== 'undefined' && peek?.render && peek.id === board.id) peek.render();
}
function scheduleSave() {
  if ($('#status')) $('#status').textContent = '…';
  if ($('#tbReminder')) updateReminder();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveBoardNow, 300);
}
const flushBoardSave = () => { if (saveTimer) saveBoardNow(); };
const cancelBoardSave = () => { clearTimeout(saveTimer); saveTimer = null; };

function renderBoard(id, root = $('#app')) {
  // Un id inconnu crée le storyboard : dupliquer un embed et changer l'id suffit.
  SB_ROOT = root;
  board = migrate(DocStore.get(id) || newBoard(id));
  if (!inDrawer) document.title = board.title || 'Kata Storyboard';

  const showToolbar = isTplDoc() || !inDrawer;
  SB_ROOT.innerHTML = `
    ${showToolbar ? `<div class="toolbar">
      ${inDrawer ? '' : `
        <a href="${esc(baseUrl())}">☰ Kanban</a>
        <span>·</span>
        <strong style="color:var(--ink)">${esc(board.title)}</strong>`}
      <span class="spacer"></span>
      <span class="status" id="status"></span>
    </div>` : ''}
    ${isTplDoc() ? '' : '<div class="tb" id="tb"></div>'}
    <div id="stage"></div>
    <div class="frame" id="sbFrame">
      <div class="sheet">
        <div class="head">
          <div><label for="focusProcess">Focus Process:</label><textarea class="focus-input" id="focusProcess" data-field="focusProcess" rows="1"></textarea></div>
          <div class="challenge">
            <label for="challengeBy">Challenge:</label>
            <div class="sentence">
              D'ici <input class="blank" id="challengeBy" data-field="challengeBy" placeholder="avril 2027">, <input class="blank" data-field="challengeResult" placeholder="résultat mesurable">, afin de <input class="blank" data-field="challengeVision" placeholder="lien avec la Vision">.
            </div>
            <button class="help-btn" id="helpBtn" title="Règles d'un bon Challenge">i</button>
            <div class="rules" id="rules" hidden>
              <strong>4 règles pour valider la phrase</strong>
              <table>
                <tr><th>Règle</th><th>Bon</th><th>Mauvais</th></tr>
                <tr><td>Décrire un état, pas une action</td><td class="good">« Finir en &lt; 3h »</td><td class="bad">« M'entraîner plus »</td></tr>
                <tr><td>Mesurable sans interprétation</td><td class="good">« 66 bpm sans arrêt »</td><td class="bad">« Bien jouer »</td></tr>
                <tr><td>Sans solution dedans</td><td class="good">« Signer chez Bain »</td><td class="bad">« Faire 50 cases pour signer chez Bain »</td></tr>
                <tr><td>Au-delà de ta capacité actuelle</td><td class="good">Tu ne sais pas encore comment y arriver</td><td class="bad">Tu sais déjà exactement quoi faire</td></tr>
              </table>
              <p><strong>La dernière règle est la plus importante :</strong> si le chemin est connu, ce n'est pas un Challenge Kata, c'est un plan à exécuter.</p>
              <p style="color:var(--muted)">Ex. : D'ici avril 2027, finir un marathon en moins de 3h00 (aujourd'hui : 10 km en 46 min), afin de …</p>
            </div>
          </div>
        </div>
        <div class="body">
          <div class="col cond">
            <div>
              <h2>Target Condition</h2>
              <div class="achieve">Achieve by: <input type="date" data-field="targetDate"></div>
            </div>
            ${conditionFields('target')}
            <div class="diagram" id="diag-target"></div>
          </div>
          <div class="col cond">
            <div><h2>Current<br>Condition</h2></div>
            ${conditionFields('current')}
            <div class="diagram" id="diag-current"></div>
          </div>
          <div class="col right">
            <section class="experiments">
              <h2>Experimenting<br>Record</h2>
              <div id="record"></div>
            </section>
            <section class="obstacles">
              <h2>Obstacles Parking Lot</h2>
              <div class="list" id="obsList"></div>
              <button class="add" id="addObs">+ Obstacle</button>
            </section>
          </div>
        </div>
      </div>
    </div>`;

  // Champs simples (data-field accepte un chemin : "target.outcome")
  SB_ROOT.querySelectorAll('[data-field]').forEach(el => {
    el.value = getPath(board, el.dataset.field) || '';
    el.oninput = () => {
      setPath(board, el.dataset.field, el.value);
      if (el.classList.contains('blank')) fitWidth(el);
      if (el.tagName === 'TEXTAREA') autoGrow(el);
      scheduleSave();
    };
  });
  SB_ROOT.querySelectorAll('input.blank').forEach(fitWidth);
  SB_ROOT.querySelectorAll('.head textarea, .metric textarea').forEach(autoGrow);

  const rules = $('#rules');
  $('#helpBtn').onclick = e => { e.stopPropagation(); rules.hidden = !rules.hidden; };
  rules.onclick = e => e.stopPropagation();

  $('#addObs').onclick = () => {
    board.obstacles.push({ id: uid(), text: '', done: false, focus: false });
    renderObstacles(); scheduleSave();
    const inputs = $('#obsList').querySelectorAll('input[type=text]');
    inputs[inputs.length - 1]?.focus();
  };

  renderDiagram('target');
  renderDiagram('current');
  renderRecord();
  renderObstacles();
  renderTimeblock();

  // Premier affichage d'un nouvel id : on l'enregistre pour qu'il apparaisse dans la liste.
  if (!DocStore.get(id)) DocStore.save(board);
}

// Ferme l'aide du Challenge au clic ailleurs (sans écraser les autres gestionnaires de la page)
document.addEventListener('click', () => { const r = $('#rules'); if (r) r.hidden = true; });
