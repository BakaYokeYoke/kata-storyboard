/* Données de démo (Visions et templates). */

/* ============================================================
   Données de démo
   ============================================================ */
function seedTemplates() {
  const blk = (name, value) => ({ id: uid(), name, value, isObstacle: false });
  const base = (id, fields) => ({ ...newBoard(id, ''), status: 'incoming', group: GROUPS[0].key, ...fields });
  Templates.save(base('tpl-projection', { name: 'Devenir {Projection}', icon: 'icon:routine:gray', isDefault: true, order: 1, createdAt: 1 }));
  Templates.save(base('tpl-habitude', {
    name: 'Habitude : {…}', icon: 'icon:leaf:green', isDefault: false, order: 2, createdAt: 2,
    focusProcess: 'Routine quotidienne',
    target:  { outcome: '', process: 'Routine réalisée X jours / 7', pattern: '', toBe: [] },
    current: { outcome: '', process: 'Routine réalisée … jours / 7', pattern: '', asIs: [blk('Déclencheur', ''), blk('Routine', ''), blk('Récompense', '')] },
  }));
  Templates.save(base('tpl-process', {
    name: 'Process : {…}', icon: 'icon:factory:brown', group: GROUPS[1]?.key || GROUPS[0].key, isDefault: false, order: 3, createdAt: 3,
    target:  { outcome: 'Lead time : …', process: '', pattern: '', toBe: [] },
    current: { outcome: 'Lead time : …', process: '', pattern: '', asIs: [blk('Entrée', ''), blk('Traitement', ''), blk('Contrôle', ''), blk('Sortie', '')] },
  }));
}

function seedDemo() {
  // Propriété « Set as Done (Run) » et affichage des runs sur les cartes
  if (!customDef('p-done')) { CUSTOM_PROPS.push({ key: 'p-done', name: 'Set as Done (Run)', type: 'button', action: { type: 'run_done' }, options: [], pageVis: 'show' }); saveCustomProps(); }
  const v = loadView();
  ['runDue', 'p-done'].forEach(k => { if (!v.props.includes(k)) v.props.push(k); });
  saveView(v);
  localStorage.setItem('kata-demo-seeded', '1');
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const blk = (name, value, extra = {}) => ({ id: uid(), name, value, isObstacle: false, ...extra });
  const exp = (obstacleId, date, step, expect, happened, learned) => ({ id: uid(), obstacleId, date: d(date), step, expect, happened, learned });
  let order = 0;
  const vision = v => { ++order; Store.save({ ...newBoard(v.id, v.title), experiments: [], obstacles: [], createdAt: Date.now() - (20 - order) * 3 * DAY, statusSince: Date.now() - order * 1.5 * DAY, ...v }); };

  vision({
    id: 'demo-marathon', icon: '🏃', title: 'Vivre en athlète d\'endurance', status: 'wip', group: 'perso',
    recur: { every: 2, due: localISO() },
    run: { mode: 'routine', items: [], routine: [
      { id: uid(), label: 'Échauffement 15 min', done: false },
      { id: uid(), label: '8 × 400 m à 4:20 / km, récup 1 min 30', done: false },
      { id: uid(), label: 'Retour au calme 10 min', done: false },
      { id: uid(), label: 'Noter les temps de chaque répétition', done: false },
    ] },
    focusProcess: 'Plan d\'entraînement hebdomadaire',
    challengeBy: 'avril 2027', challengeResult: 'finir un marathon en moins de 3h00', challengeVision: 'vivre en athlète d\'endurance',
    targetDate: d(28),
    target:  { outcome: 'Semi-marathon en 1h35', process: '4 sorties / semaine tenues 4 semaines de suite', pattern: 'Sortie longue le dimanche, fractionné le mardi, 2 footings lents.',
      toBe: [blk('Échauffement', '15 min'), blk('Fractionné', '8 × 400 m'), blk('Retour au calme', '10 min')] },
    current: { outcome: '10 km en 46 min', process: '2 sorties / semaine en moyenne', pattern: 'Sorties au feeling, souvent annulées le soir.',
      asIs: [blk('Décision de sortir', 'le soir', { isObstacle: true, waitAfter: '1 h' }), blk('Footing', '45 min'), blk('Étirements', '0 min', { isObstacle: true })] },
    obstacles: [
      { id: 'o-m-1', text: 'Sorties du soir annulées après le travail', done: true, focus: false },
      { id: 'o-m-2', text: 'Pas d\'allure cible pour le fractionné', done: false, focus: true },
      { id: 'o-m-3', text: 'Douleur au mollet après 15 km', done: false, focus: false },
    ],
    experiments: [
      exp('o-m-1', -14, 'Sortir à 7 h avant le travail', '3 sorties cette semaine', '3 sorties', 'Le matin tient, le soir non'),
      exp('o-m-2', -3, 'Fractionné à 4:10 / km', 'Tenir les 8 répétitions', '6 répétitions', 'Allure trop ambitieuse, viser 4:20'),
      exp('o-m-2', -1, 'Fractionné à 4:20 / km', 'Tenir les 8 répétitions', '', ''),
    ],
  });
  vision({
    id: 'demo-piano', icon: '🎹', title: 'Jouer du piano pour le plaisir, sans partition', status: 'goal', group: 'perso',
    recur: { every: 1, due: addDaysISO(localISO(), 1) },
    run: { mode: 'routine', items: [], routine: [
      { id: uid(), label: 'Gammes 5 min', done: false },
      { id: uid(), label: 'Mesures 7–8 en boucle × 10 à 40 bpm', done: false },
      { id: uid(), label: 'Enchaîner les 16 mesures une fois', done: false },
    ] },
    focusProcess: 'Séance de pratique quotidienne',
    challengeBy: 'juin 2027', challengeResult: 'jouer la Gymnopédie n°1 en entier sans arrêt à 66 bpm', challengeVision: 'jouer pour le plaisir, sans partition',
    targetDate: d(21),
    target:  { outcome: '16 mesures à 50 bpm sans arrêt', process: '20 min de pratique / jour, 6 jours / 7', pattern: 'Main gauche seule avant d\'assembler.', toBe: [] },
    current: { outcome: '8 mesures à 40 bpm', process: '3 séances / semaine', pattern: 'Je rejoue depuis le début à chaque erreur.', asIs: [] },
    obstacles: [{ id: 'o-p-1', text: 'Je recommence depuis le début à chaque erreur', done: false, focus: true }],
    experiments: [exp('o-p-1', -2, 'Boucler 2 mesures difficiles × 10', 'Les enchaîner sans arrêt', 'Oui à 40 bpm', 'Le problème est le changement de main gauche mesure 7')],
  });
  vision({
    id: 'demo-conseil', icon: '💼', title: 'Devenir un conseiller stratégique de référence', status: 'incoming', group: 'pro',
    challengeBy: 'septembre 2027', challengeResult: 'avoir signé une offre chez Bain ou BCG', challengeVision: 'peser sur les décisions qui comptent',
  });
  vision({
    id: 'demo-usine', icon: '🏭', title: 'Une usine qui produit au rythme du client', status: 'tomorrow', group: 'pro',
    run: { mode: 'flow', routine: [], items: [
      { id: uid(), title: 'Série A-120 → B-340', column: 'todo' },
      { id: uid(), title: 'Série B-340 → C-015', column: 'todo' },
      { id: uid(), title: 'Série C-015 → A-120', column: 'todo' },
    ] },
    focusProcess: 'Changement de série presse P12',
    challengeBy: 'juin 2027', challengeResult: 'changer de série en moins de 10 min', challengeVision: 'produire en petits lots au rythme du client',
    targetDate: d(35),
    target:  { outcome: '≤ 25 min sur 9 changements / 10', process: '100 % des outils prêts avant l\'arrêt', pattern: 'Préparation en temps masqué par le régleur.', toBe: [] },
    current: { outcome: 'Moyenne 48 min (35–70 min)', process: 'Outils prêts avant l\'arrêt : 3 fois / 10', pattern: 'Le régleur arrête la presse puis va chercher outils et fiches.',
      asIs: [blk('Arrêt presse', '0 min'), blk('Recherche outils', '14 min', { isObstacle: true, waitAfter: '5 min' }), blk('Démontage', '9 min'), blk('Montage', '11 min'), blk('Réglages / essais', '14 min', { isObstacle: true })] },
    obstacles: [{ id: 'o-u-1', text: 'Pas de standard de réglage', done: false, focus: false }],
  });
  vision({
    id: 'demo-matins', icon: '☀️', title: 'Des matins maîtrisés', status: 'success', group: 'perso',
    focusProcess: 'Routine du soir et du réveil',
    challengeBy: 'janvier 2027', challengeResult: 'me lever avant 7 h, 6 jours sur 7', challengeVision: 'commencer chaque journée par ce qui compte',
    targetDate: d(-10),
    target:  { outcome: 'Lever ≤ 7 h, 6 j / 7', process: 'Coucher ≤ 23 h', pattern: 'Téléphone hors de la chambre.', toBe: [] },
    current: { outcome: 'Lever ≤ 7 h, 6 j / 7', process: 'Coucher ≤ 23 h, 5 j / 7', pattern: 'Atteint 3 semaines de suite.', asIs: [] },
    obstacles: [{ id: 'o-w-1', text: 'Téléphone au lit', done: true, focus: false }],
    experiments: [exp('o-w-1', -30, 'Chargeur dans l\'entrée', 'Coucher ≤ 23 h', '5 soirs / 7', 'Ça marche, à garder')],
  });
}
