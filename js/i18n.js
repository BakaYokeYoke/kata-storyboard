/* Langue de l'interface (français / anglais) : un dictionnaire appliqué à tout ce que l'app affiche
   (textes, champs vides, infobulles). Le contenu saisi par l'utilisateur n'est jamais traduit. */

const LANG_KEY = 'kata-lang', KATA_EN_KEY = 'kata-kata-en';
const LANG = (() => { try { return localStorage.getItem(LANG_KEY) || 'fr'; } catch (e) { return 'fr'; } })();
const KATA_EN = (() => { try { return localStorage.getItem(KATA_EN_KEY) !== '0'; } catch (e) { return true; } })();
const LOCALE = () => LANG === 'en' ? 'en-US' : 'fr-FR';
document.documentElement.lang = LANG;

// [français, anglais]
const I18N = [
  // Kanban, barre d'outils, menus de page
  ['Nouvelle page', 'New page'], ['Nouveau', 'New'], ['Filtrer', 'Filter'], ['Trier', 'Sort'], ['Rechercher', 'Search'], ['Rechercher…', 'Search…'],
  ['Paramètres de la vue', 'View settings'], ['Automatisations', 'Automations'], ['Plus d\'actions', 'More actions'], ['Réglages', 'Settings'],
  ['Nouvelle Vision (template par défaut)', 'New Vision (default template)'], ['Choisir un template', 'Choose a template'],
  ['Nouveau groupe', 'New group'], ['Options du groupe', 'Group options'], ['Renommer', 'Rename'], ['Dupliquer', 'Duplicate'], ['Supprimer', 'Delete'],
  ['Ouvrir en aperçu', 'Open in side peek'], ['Déplacer vers', 'Move to'], ['Changer l\'icône', 'Change icon'], ['Sans titre', 'Untitled'],
  ['Masquer le groupe', 'Hide group'], ['Création de cartes', 'Card creation'], ['Séparer par sous-groupe', 'Split by sub-group'],
  ['Standards (réel / standard)', 'Standards (actual / standard)'], ['WIP maximum', 'Max WIP'], ['Aging maximum (jours)', 'Max aging (days)'],
  ['Groupes masqués', 'Hidden groups'], ['Afficher', 'Show'], ['Masquer', 'Hide'], ['Réel / standard', 'Actual / standard'],
  ['Modifier les groupes', 'Edit groups'], ['Afficher le calcul', 'Show aggregation'], ['Masquer le calcul', 'Hide aggregation'], ['Masquer ce groupe', 'Hide group'],
  ['Mettre à la corbeille', 'Move to Trash'], ['Couleurs', 'Colors'], ['Par défaut', 'Default'], ['Gris', 'Gray'], ['Marron', 'Brown'], ['Orange', 'Orange'],
  ['Jaune', 'Yellow'], ['Vert', 'Green'], ['Bleu', 'Blue'], ['Violet', 'Purple'], ['Rose', 'Pink'], ['Rouge', 'Red'],
  ['Double-clic pour renommer', 'Double-click to rename'], ['Nom du groupe', 'Group name'], ['Il faut garder au moins un groupe', 'At least one group is required'],
  ['Annuler', 'Undo'], ['Rétablir', 'Redo'], ['Corbeille', 'Trash'], ['Sauvegardes internes…', 'Internal backups…'], ['Exporter (JSON)', 'Export (JSON)'],
  ['Importer (JSON)…', 'Import (JSON)…'], ['Réinitialiser la démo', 'Reset demo'], ['Exporter', 'Export'], ['Réactiver', 'Resume'],
  ['Sauvegarde automatique…', 'Automatic backup…'], ['Sauvegarde automatique dans un fichier…', 'Automatic backup to a file…'],
  ['Sauvegarde automatique : activée', 'Automatic backup: on'], ['Arrêter', 'Stop'], ['Aucune sauvegarde de vos données hors du navigateur.', 'Your data is not backed up outside this browser.'],
  ['Sauvegarde automatique en pause.', 'Automatic backup paused.'], ['Sauvegarde automatique activée', 'Automatic backup enabled'], ['Sauvegarde automatique désactivée', 'Automatic backup disabled'],
  ['Sauvegardes internes (14 dernières)', 'Internal backups (last 14)'], ['Aucune sauvegarde pour le moment', 'No backup yet'], ['Sauvegarde restaurée', 'Backup restored'],
  ['La corbeille est vide', 'Trash is empty'], ['Restaurer', 'Restore'], ['Supprimer définitivement', 'Delete forever'], ['Vider la corbeille', 'Empty trash'], ['Restauré', 'Restored'],
  ['Page déplacée dans la corbeille', 'Page moved to Trash'], ['Template déplacé dans la corbeille', 'Template moved to Trash'], ['Action annulée', 'Undone'], ['Action rétablie', 'Redone'],
  ['Rien à annuler', 'Nothing to undo'], ['Rien à rétablir', 'Nothing to redo'], ['Fermez la page ouverte pour annuler', 'Close the open page to undo'],
  ['Fichier illisible', 'Unreadable file'], ['Format non reconnu', 'Unrecognized format'], ['Disponible dans Chrome ou Edge. Sinon, utilisez « Exporter ».', 'Available in Chrome or Edge. Otherwise use “Export”.'],
  ['Un tri est actif : retirez-le (Sort → Manuel) pour réordonner à la main', 'A sort is active: set Sort to Manual to reorder by hand'],
  ['Aucune carte à déplacer', 'No card to move'], ['URL copiée', 'URL copied'], ['Langue', 'Language'],
  ['Termes Kata en anglais (Target Condition…)', 'Kata terms in English (Target Condition…)'],
  // Templates
  ['Nouveau template', 'New template'], ['Définir par défaut', 'Set as default'], ['Modifier', 'Edit'], ['Vide', 'Empty'], ['Dupliquer tous les…', 'Duplicate every…'],
  ['Désactivé', 'Off'], ['Chaque jour', 'Daily'], ['Chaque semaine', 'Weekly'], ['Chaque mois', 'Monthly'], ['Options', 'Options'], ['Template', 'Template'],
  ['Un template pré-remplit les nouvelles pages : icône, titre, propriétés et storyboard.', 'A template pre-fills new pages: icon, properties and storyboard.'],
  ['Chaque nouvelle page créée avec ce template reprend son icône, son titre, ses propriétés et son storyboard.', 'Each new page created from this template gets its icon, properties and storyboard.'],
  ['Agrandir', 'Expand'], ['Fermer', 'Close'], ['Fermer (Échap)', 'Close (Esc)'], ['Ajouter une icône', 'Add icon'],
  // Sélecteur d'icône
  ['Emoji', 'Emoji'], ['Icônes', 'Icons'], ['Importer', 'Upload'], ['Retirer', 'Remove'], ['Filtrer…', 'Filter…'], ['Aléatoire', 'Random'], ['Couleur', 'Color'], ['Récents', 'Recent'],
  ['Choisir une image', 'Choose an image'], ['L\'image est réduite à 128 px et stockée avec la page.', 'The image is resized to 128 px and stored with the page.'],
  // Panneau View settings
  ['Disposition', 'Layout'], ['Tableau', 'Board'], ['Visibilité des propriétés', 'Property visibility'], ['Filtre', 'Filter'], ['Tri', 'Sort'], ['Groupe', 'Group'],
  ['Sous-groupe', 'Sub-group'], ['Aucun', 'None'], ['Rechercher une propriété…', 'Search for a property…'], ['Visibles sur le tableau', 'Shown in board'],
  ['Masquées sur le tableau', 'Hidden in board'], ['Tout masquer', 'Hide all'], ['Tout afficher', 'Show all'], ['Nom', 'Name'], ['Grouper par', 'Group by'],
  ['Masquer les groupes vides', 'Hide empty groups'], ['Colonnes colorées', 'Color columns'], ['Groupes', 'Groups'], ['Sous-grouper par', 'Sub-group by'],
  ['Manuel', 'Manual'], ['Croissant', 'Ascending'], ['Décroissant', 'Descending'], ['Ordre', 'Order'], ['Retirer le regroupement', 'Remove grouping'],
  ['Chaque matin, au premier affichage de la journée', 'Every morning, on the first visit of the day'], ['Lancer maintenant', 'Run now'],
  ['Runs récurrents : Daily Goal le jour J, Tomorrow la veille', 'Recurring runs: Daily Goal on the day, Tomorrow the day before'],
  // Calculs de colonne
  ['Compter', 'Count'], ['Pourcentage', 'Percent'], ['Plus d\'options', 'More options'], ['Tout compter', 'Count all'], ['Compter les valeurs', 'Count values'],
  ['Compter les valeurs uniques', 'Count unique values'], ['Compter les vides', 'Count empty'], ['Compter les non-vides', 'Count not empty'],
  ['Pourcentage de vides', 'Percent empty'], ['Pourcentage de non-vides', 'Percent not empty'], ['Somme', 'Sum'], ['Moyenne', 'Average'], ['Médiane', 'Median'],
  ['Plage', 'Range'], ['Date la plus ancienne', 'Earliest date'], ['Date la plus récente', 'Latest date'], ['Plage de dates', 'Date range'],
  ['Aucune propriété numérique', 'No numeric property'], ['Aucune propriété de date', 'No date property'],
  // Page ouverte, propriétés
  ['Ajouter une propriété', 'Add a property'], ['Nom de la propriété', 'Property name'], ['Type', 'Type'], ['Changer le type', 'Change type'],
  ['Options de la propriété', 'Property options'], ['Valeur synchronisée avec le storyboard', 'Value synced with the storyboard'], ['Créer une section ici', 'Create a section here'], ['Déplacer vers la section', 'Move to section'], ['Sans section', 'No section'], ['Renommer la section', 'Rename section'], ['Replier la section', 'Collapse section'], ['Déplier la section', 'Expand section'], ['Supprimer la section', 'Delete section'], ['Glisser une propriété ici', 'Drag a property here'], ['Glisser pour déplacer', 'Drag to move'], ['Nom de la section', 'Section name'], ['Dans la page', 'In the page'], ['Toujours afficher', 'Always show'], ['Masquer si vide', 'Hide when empty'],
  ['Toujours masquer', 'Always hide'], ['Dupliquer la propriété', 'Duplicate property'], ['Supprimer la propriété', 'Delete property'], ['Propriétés supprimées', 'Deleted properties'], ['Restaurer', 'Restore'], ['Modifier la formule', 'Edit formula'],
  ['Configurer le rollup', 'Configure rollup'], ['Occurrences affichées', 'Occurrences shown'], ['Préfixe', 'Prefix'], ['Action du bouton', 'Button action'],
  ['Valider le run (Set as Done)', 'Complete the run (Set as Done)'], ['Passer en', 'Move to'], ['Supprimer l\'option', 'Delete option'],
  ['Rechercher ou créer une option…', 'Search or create an option…'], ['Sélectionnez une option', 'Select an option'], ['Sélectionnez une ou plusieurs options', 'Select one or more options'],
  ['Rechercher une page…', 'Search for a page…'], ['Pages liées', 'Linked pages'], ['Téléverser un fichier…', 'Upload a file…'], ['Ajouter un lien…', 'Add a link…'],
  ['Relation', 'Relation'], ['Propriété à agréger', 'Property to roll up'], ['Calcul', 'Calculate'], ['Vient du storyboard (lecture seule)', 'From the storyboard (read-only)'],
  ['Ouvrir', 'Open'], ['Fichier introuvable', 'File not found'], ['Fichier trop lourd (25 Mo max) : ajoutez plutôt un lien', 'File too large (25 MB max): add a link instead'],
  ['Moi', 'Me'], ['jours', 'days'], ['Coché', 'Checked'], ['Non coché', 'Unchecked'], ['Non vide', 'Not empty'], ['Vide', 'Empty'],
  ['Afficher les valeurs', 'Show original'], ['Nombre de pages', 'Count pages'], ['Nombre de valeurs', 'Count values'], ['Minimum', 'Min'], ['Maximum', 'Max'],
  ['Nombre cochées', 'Checked'], ['% cochées', 'Percent checked'], ['Valider le run du jour', 'Complete today\'s run'],
  ['Texte', 'Text'], ['Nombre', 'Number'], ['Sélection', 'Select'], ['Sélection multiple', 'Multi-select'], ['Statut', 'Status'], ['Personne', 'Person'],
  ['Fichiers et médias', 'Files & media'], ['Case à cocher', 'Checkbox'], ['E-mail', 'Email'], ['Téléphone', 'Phone'], ['Formule', 'Formula'], ['Agrégation', 'Rollup'],
  ['Date de création', 'Created time'], ['Créé par', 'Created by'], ['Date de modification', 'Last edited time'], ['Modifié par', 'Last edited by'], ['Série', 'Streak'], ['Bouton', 'Button'],
  ['Obstacle en cours', 'Current obstacle'], ['Échéance (Target)', 'Due (Target)'], ['Expériences', 'Experiments'], ['Étape du time block', 'Time block step'],
  ['Tous les x jours (Run)', 'Every x days (Run)'], ['Date du Run', 'Due Date (Run)'], ['Pas commencé', 'Not started'], ['En cours', 'In progress'], ['Terminé', 'Done'],
  // Time block et Run
  ['Commencer le run', 'Start the run'], ['✔ Valider le run', '✔ Complete the run'], ['Run impossible', 'Run not possible'], ['Enregistrer le cycle', 'Save the cycle'],
  ['Lire', 'Read'], ['1. Lire', '1. Read'], ['2. Run', '2. Run'], ['3. Kata', '3. Kata'], ['Verrouillé', 'Locked'], ['Durée du time block', 'Time block duration'], ['Étapes du time block', 'Time block steps'],
  ['Créer l\'obstacle et passer au Kata', 'Create the obstacle and go to Kata'], ['Décrivez ce qui a bloqué le run', 'Describe what blocked the run'],
  ['Qu\'est-ce qui a empêché le run ? Ce texte devient un obstacle dans le Parking Lot.', 'What prevented the run? This text becomes an obstacle in the Parking Lot.'],
  ['1. Lire — l\'expérience du jour', '1. Read — today\'s experiment'], ['3. Kata — cycle de coaching', '3. Kata — coaching cycle'], ['Prédiction', 'Prediction'],
  ['Aucune expérience définie. Lancez quand même le run, ou passez par le Kata pour en définir une.', 'No experiment defined. Run anyway, or define one in the Kata step.'],
  ['Relisez le storyboard ci-dessous (Challenge, Target / Current Condition), préparez le run, puis cliquez sur « Commencer le run ».', 'Read the storyboard below (Challenge, Target / Current Condition), prepare the run, then click “Start the run”.'],
  ['Quelle est la Target Condition ?', 'What is the Target Condition?'], ['Quelle est la condition actuelle ?', 'What is the actual condition now?'],
  ['Qu\'aviez-vous prévu ? Que s\'est-il passé ? Qu\'avez-vous appris ?', 'What was your last step? What did you expect? What actually happened? What did you learn?'],
  ['Quels obstacles vous empêchent d\'atteindre la Target Condition ? Lequel traitez-vous maintenant ?', 'What obstacles are preventing you from reaching the Target Condition? Which one are you addressing now?'],
  ['Quelle est votre prochaine étape ? Qu\'en attendez-vous ?', 'What is your next step? What do you expect?'], ['Quand pourrons-nous voir ce que vous avez appris ?', 'How quickly can we see what we have learned from taking that step?'],
  ['Aucune expérience en cours : définissez-la à l\'étape Kata.', 'No current experiment: define one in the Kata step.'], ['Cycle enregistré', 'Cycle saved'],
  ['Obstacle ajouté au Parking Lot', 'Obstacle added to the Parking Lot'], ['Run validé', 'Run completed'], ['Mode du run', 'Run mode'], ['Flux', 'Flow'],
  ['Préparation : ajustez le standard avant de commencer.', 'Preparation: adjust the standard before starting.'], ['Cochez chaque étape réalisée.', 'Tick each step once done.'],
  ['Faites avancer les items d\'une colonne à l\'autre.', 'Move items from one column to the next.'], ['Configuration reprise par chaque nouvelle Vision.', 'Settings copied to each new Vision.'],
  ['+ Étape du standard', '+ Standard step'], ['Étape du standard de travail', 'Standard work step'], ['Se coche pendant le run', 'Ticked during the run'], ['Fait', 'Done'], ['À faire', 'To do'],
  ['+ Item (Entrée)', '+ Item (Enter)'], ['Mode Flux : les colonnes reprendront les blocs du diagramme As Is de chaque Vision.', 'Flow mode: columns follow the As Is diagram blocks of each Vision.'],
  ['Ajoutez des blocs au diagramme As Is (Current Condition) pour créer les colonnes intermédiaires.', 'Add blocks to the As Is diagram (Current Condition) to create the middle columns.'],
  ['🔒 Storyboard en lecture seule — éditable à l’étape Kata', '🔒 Read-only storyboard — editable at the Kata step'],
  // Storyboard (hors termes Kata)
  ['Règles d\'un bon Challenge', 'Rules for a good Challenge'], ['4 règles pour valider la phrase', '4 rules to check the sentence'], ['Règle', 'Rule'], ['Bon', 'Good'], ['Mauvais', 'Bad'],
  ['Décrire un état, pas une action', 'Describe a state, not an action'], ['Mesurable sans interprétation', 'Measurable without interpretation'], ['Sans solution dedans', 'No solution inside'],
  ['Au-delà de ta capacité actuelle', 'Beyond your current capability'], ['Tu ne sais pas encore comment y arriver', 'You don\'t know yet how to get there'], ['Tu sais déjà exactement quoi faire', 'You already know exactly what to do'],
  ['La dernière règle est la plus importante :', 'The last rule matters most:'], ['si le chemin est connu, ce n\'est pas un Challenge Kata, c\'est un plan à exécuter.', 'if the path is known, it is not a Kata Challenge, it is a plan to execute.'],
  ['D\'ici', 'By'], [', afin de', ', in order to'], ['avril 2027', 'April 2027'], ['résultat mesurable', 'measurable result'], ['lien avec la Vision', 'link to the Vision'],
  ['Résultat visé, chiffré…', 'Target result, quantified…'], ['Résultat mesuré aujourd\'hui…', 'Result measured today…'], ['Indicateur de process visé…', 'Target process indicator…'],
  ['Indicateur de process aujourd\'hui…', 'Process indicator today…'], ['Comment le processus doit fonctionner…', 'How the process should work…'], ['Comment le processus fonctionne aujourd\'hui…', 'How the process works today…'],
  ['Obstacle :', 'Obstacle:'], ['— choisir dans le Parking Lot —', '— pick from the Parking Lot —'], ['✓ Obstacle levé', '✓ Obstacle cleared'],
  ['Archive ce record et libère le Record pour l\'obstacle suivant', 'Archive this record and free the Record for the next obstacle'],
  ['Sélectionnez l\'obstacle travaillé pour ouvrir son record.', 'Select the obstacle you work on to open its record.'], ['Ajoutez un obstacle dans le Parking Lot pour commencer.', 'Add an obstacle to the Parking Lot to start.'],
  ['+ Nouvelle expérience', '+ New experiment'], ['Étape / ce que je vais tester', 'Step / what I will test'], ['Qu\'est-ce que j\'attends ?', 'What do I expect?'],
  ['Que s\'est-il passé ?', 'What happened?'], ['Qu\'avons-nous appris ?', 'What did we learn?'], ['Supprimer cette expérience ?', 'Delete this experiment?'], ['Expériences non rattachées', 'Unassigned experiments'],
  ['levé', 'cleared'], ['en pause', 'paused'], ['(étape non renseignée)', '(no step entered)'], ['Travailler cet obstacle', 'Work on this obstacle'], ['Levé', 'Cleared'], ['Obstacle…', 'Obstacle…'],
  ['Record archivé — choisissez le prochain obstacle', 'Record archived — choose the next obstacle'], ['Initialiser depuis As Is', 'Initialize from As Is'],
  ['Rother : la Target Condition se construit en copiant la Current Condition', 'Rother: the Target Condition is built by copying the Current Condition'],
  ['Le diagramme As Is est vide', 'The As Is diagram is empty'], ['Étape', 'Step'], ['valeur', 'value'], ['Marquer comme obstacle', 'Mark as obstacle'], ['Monter', 'Move up'], ['Descendre', 'Move down'],
  ['+ attente', '+ wait'], ['Attente', 'Wait'], ['durée', 'duration'], ['Retirer l\'attente', 'Remove wait'], ['+ Bloc', '+ Block'], ['+ Obstacle', '+ Obstacle'],
  ['Modifier la propriété', 'Edit property'], ['Visibilité de la propriété', 'Property visibility'], ['Afficher sur le tableau', 'Show in board'],
  ['Sélectionnez une option ou créez-en une', 'Select an option or create one'], ['Créer', 'Create'], ['Modifier l\'option', 'Edit option'], ['Modifier les options', 'Edit options'],
  ['Rechercher une option', 'Search options'], ['Nom de l\'option', 'Option name'], ['Aller à l\'Experimenting Record', 'Go to the Experimenting Record'], ['Aller au time block', 'Go to the time block'],
  ["D'ici", 'By'], ['Obstacle sans titre', 'Untitled obstacle'],
  ['Format', 'Format'], ['Décimales', 'Decimal places'], ['Afficher comme', 'Show as'], ['Barre', 'Bar'], ['Anneau', 'Ring'], ['Diviser par', 'Divide by'],
  ['Afficher le nombre', 'Show number'], ['Nombre avec séparateurs', 'Number with commas'], ['Pourcentage', 'Percent'], ['Euro', 'Euro'], ['Dollar', 'Dollar'],
  ['Livre sterling', 'Pound'], ['Yen', 'Yen'], ['Tri', 'Sort'], ['Alphabétique', 'Alphabetical'], ['Alphabétique inverse', 'Reverse alphabetical'],
  ['+ Ajouter une option', '+ Add an option'], ['Ajouter une option', 'Add an option'], ['Limite', 'Limit'], ['Illimité', 'No limit'], ['1 personne', '1 person'],
  ['Personnes', 'People'], ['À faire', 'To-do'], ['Format de date', 'Date format'], ['Format horaire', 'Time format'], ['Masqué', 'Hidden'], ['24 heures', '24 hour'],
  ['12 heures', '12 hour'], ['Date de fin', 'End date'], ['Complet', 'Full date'], ['Jour/Mois/Année', 'Day/Month/Year'], ['Mois/Jour/Année', 'Month/Day/Year'],
  ['Année/Mois/Jour', 'Year/Month/Day'], ['Relatif', 'Relative'], ['1 fichier', '1 file'], ['Afficher l\'URL complète', 'Show full URL'],
  ['Formule', 'Formula'], ['Fonctions disponibles', 'Available functions'], ['Base liée', 'Related database'], ['1 page', '1 page'],
  ['Afficher sur la page liée', 'Show on related page'], ['Action', 'Action'], ['Occurrences affichées', 'Occurrences shown'],
  ['Les options de Pro/Perso sont les sous-groupes du tableau.', 'Pro/Perso options are the board sub-groups.'], ['Modifier les options…', 'Edit options…'],
  ['Les options de Status sont les colonnes du tableau.', 'Status options are the board columns.'], ['Modifier les colonnes…', 'Edit columns…'],
  ['Propriété intégrée des Runs récurrents.', 'Built-in property for recurring runs.'], ['Intégrée', 'Built-in'],
  ['Cette propriété vient du storyboard : sa valeur se modifie dans la page ou dans le storyboard.', 'This property comes from the storyboard: edit its value in the page or in the storyboard.'],
  ['Ajoutez d\'abord une propriété de type Relation.', 'Add a Relation property first.'],
  ['Une occurrence est réussie quand un run est validé dans sa période. La fréquence se règle sur chaque page.', 'An occurrence succeeds when a run is completed in its period. Frequency is set on each page.'],
  // Suivi des indicateurs
  ['Suivi des indicateurs', 'Metric tracking'], ['Cible', 'Target'], ['Unité', 'Unit'], ['Sens d\'amélioration', 'Direction of improvement'], ['↓ plus bas = mieux', '↓ lower is better'],
  ['↑ plus haut = mieux', '↑ higher is better'], ['Valeur', 'Value'], ['Note', 'Note'], ['Note (facultatif)', 'Note (optional)'], ['Ajouter la mesure', 'Add measurement'],
  ['Supprimer la mesure', 'Delete measurement'], ['Aucune mesure : ajoutez-en une ci-dessous pour voir la courbe.', 'No measurement yet: add one below to see the chart.'],
  ['Décrivez la cible dans la Target Condition', 'Describe the target in the Target Condition'], ['min, %, …', 'min, %, …'],
];
// Termes du storyboard de Mike Rother (traduits seulement si l'option « termes Kata en anglais » est coupée)
const KATA_TERMS = [
  ['Condition cible', 'Target Condition'], ['Condition actuelle', 'Current Condition'], ['Journal des expérimentations', 'Experimenting Record'], ['Parking des obstacles', 'Obstacles Parking Lot'],
  ['Processus ciblé :', 'Focus Process:'], ['Challenge :', 'Challenge:'], ['À atteindre le :', 'Achieve by:'], ['Étape', 'Step'], ['Attendu', 'Expect'], ['Constaté', 'Happened'], ['Appris', 'Learned'],
  ['Indicateur de résultat', 'Outcome metric'], ['Indicateur de process', 'Process metric'], ['Mode de fonctionnement', 'Operating pattern'], ['Visé', 'To Be'], ['Actuel', 'As Is'],
  ['Condition\ncible', 'Target\nCondition'], ['Journal des\nexpérimentations', 'Experimenting\nRecord'], ['Condition\nactuelle', 'Current\nCondition'],
];

// Textes dynamiques : [motif français, motif anglais, gabarit]
const I18N_PATTERNS = [
  [/^(\d+) autres? propriétés?$/, /^(\d+) more propert(?:y|ies)$/, n => ({ fr: `${n} autre${n > 1 ? 's' : ''} propriété${n > 1 ? 's' : ''}`, en: `${n} more propert${n > 1 ? 'ies' : 'y'}` })],
  [/^Propriété « (.+) » supprimée$/, /^Property “(.+)” deleted$/, n => ({ fr: `Propriété « ${n} » supprimée`, en: `Property “${n}” deleted` })],
  [/^Masquer (\d+) propriétés?$/, /^Hide (\d+) propert(?:y|ies)$/, n => ({ fr: `Masquer ${n} propriété${n > 1 ? 's' : ''}`, en: `Hide ${n} propert${n > 1 ? 'ies' : 'y'}` })],
  [/^Templates pour (.+)$/, /^Templates for (.+)$/, t => ({ fr: `Templates pour ${t}`, en: `Templates for ${t}` })],
  [/^Vous modifiez un template dans$/, /^You're editing a template in$/, () => ({ fr: 'Vous modifiez un template dans', en: 'You\'re editing a template in' })],
  [/^Retirer les filtres \((\d+)\)$/, /^Clear filters \((\d+)\)$/, n => ({ fr: `Retirer les filtres (${n})`, en: `Clear filters (${n})` })],
  [/^Mesures \((\d+)\)$/, /^Measurements \((\d+)\)$/, n => ({ fr: `Mesures (${n})`, en: `Measurements (${n})` })],
  [/^Archives · (\d+) records?$/, /^Archive · (\d+) records?$/, n => ({ fr: `Archives · ${n} record${n > 1 ? 's' : ''}`, en: `Archive · ${n} record${n > 1 ? 's' : ''}` })],
  [/^Expérience #(\d+)$/, /^Experiment #(\d+)$/, n => ({ fr: `Expérience #${n}`, en: `Experiment #${n}` })],
  [/^Aging (\d+) j\/(\d+) j$/, /^Aging (\d+) d\/(\d+) d$/, (a, b) => ({ fr: `Aging ${a} j/${b} j`, en: `Aging ${a} d/${b} d` })],
  [/^⏳ (\d+) j$/, /^⏳ (\d+) d$/, n => ({ fr: `⏳ ${n} j`, en: `⏳ ${n} d` })],
  [/^↻ tous les (\d+) j$/, /^↻ every (\d+) d$/, n => ({ fr: `↻ tous les ${n} j`, en: `↻ every ${n} d` })],
  [/^(\d+) j$/, /^(\d+) d$/, n => ({ fr: `${n} j`, en: `${n} d` })],
  [/^Corbeille · effacée après (\d+) jours$/, /^Trash · emptied after (\d+) days$/, n => ({ fr: `Corbeille · effacée après ${n} jours`, en: `Trash · emptied after ${n} days` })],
  [/^Dernière sauvegarde il y a (\d+) jours\.$/, /^Last backup (\d+) days ago\.$/, n => ({ fr: `Dernière sauvegarde il y a ${n} jours.`, en: `Last backup ${n} days ago.` })],
];
const RELDAY = [["aujourd'hui", 'today'], ['demain', 'tomorrow'], ['hier', 'yesterday']];

const I18N_MAP = new Map();
if (LANG === 'en') {
  I18N.forEach(([fr, en]) => fr !== en && I18N_MAP.set(fr, en));
  if (!KATA_EN) KATA_TERMS.forEach(([fr, en]) => I18N_MAP.set(fr, en));
} else {
  I18N.forEach(([fr, en]) => fr !== en && !I18N_MAP.has(en) && I18N_MAP.set(en, fr));
  if (!KATA_EN) KATA_TERMS.forEach(([fr, en]) => I18N_MAP.set(en, fr));
  else KATA_TERMS.forEach(([, en]) => I18N_MAP.delete(en));   // termes Kata gardés en anglais
  // Colonnes, statuts et groupes sont des noms choisis par l'utilisateur : jamais traduits
  ['Incoming', 'Tomorrow', 'Daily Goal', 'Ongoing WIP', 'Daily Success', 'Perso', 'Pro', 'Pro/Perso', 'Run', 'Kata', 'Streak', 'Status', 'Challenge', 'Record'].forEach(k => I18N_MAP.delete(k));
}

function tr(text) {
  if (!text || !/[A-Za-zÀ-ÿ]/.test(text)) return null;
  const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim();
  const hit = I18N_MAP.get(core);
  if (hit !== undefined) return lead + hit + trail;
  for (const [reFr, reEn, fn] of I18N_PATTERNS) {
    const m = core.match(LANG === 'en' ? reFr : reEn);
    if (m) return lead + fn(...m.slice(1).map(x => isNaN(x) ? x : Number(x)))[LANG] + trail;
  }
  if (LANG === 'en') {
    const r = core.match(/^(↻ )?(aujourd'hui|demain|hier|dans (\d+) j|il y a (\d+) j)$/);
    if (r) {
      const w = r[3] ? `in ${r[3]} d` : r[4] ? `${r[4]} d ago` : RELDAY.find(x => x[0] === r[2])[1];
      return lead + (r[1] || '') + w + trail;
    }
  }
  return null;
}

// Zones de contenu saisi par l'utilisateur : jamais traduites
const I18N_SKIP = '.tt:not(.untitled), .prop, .n-title, .n-crumb, .n-pill, [data-user], textarea, [contenteditable="true"], .arch-group, script, style';
const I18N_ATTRS = ['placeholder', 'title', 'aria-label', 'data-placeholder'];
function translateTree(root) {
  if (LANG === 'fr' && KATA_EN && !I18N_MAP.size) return;
  if (root.nodeType === 3) return translateText(root);
  if (root.nodeType !== 1) return;
  if (root.closest?.(I18N_SKIP)) { if (root.matches('textarea')) translateAttrs(root); return; }
  translateAttrs(root);
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: n => {
      if (n.nodeType !== 1 || !n.matches(I18N_SKIP)) return NodeFilter.FILTER_ACCEPT;
      if (n.matches('textarea')) translateAttrs(n);   // texte d'aide traduit, contenu jamais
      return NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) n.nodeType === 3 ? translateText(n) : translateAttrs(n);
}
function translateText(node) {
  if (node.parentElement?.closest(I18N_SKIP)) return;
  const t = tr(node.nodeValue);
  if (t !== null && t !== node.nodeValue) node.nodeValue = t;
}
function translateAttrs(el) {
  for (const a of I18N_ATTRS) {
    const v = el.getAttribute?.(a);
    if (!v) continue;
    const t = tr(v);
    if (t !== null && t !== v) el.setAttribute(a, t);
  }
}
if (LANG === 'en' || !KATA_EN) {
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(translateTree);
      else if (m.type === 'characterData') translateText(m.target);
      else if (m.type === 'attributes') translateAttrs(m.target);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
} else {
  // En français, seuls les textes d'interface hérités de Notion (en anglais) sont traduits
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(translateTree);
      else if (m.type === 'attributes') translateAttrs(m.target);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: I18N_ATTRS });
}
// Fenêtres natives (confirmation, saisie) : même dictionnaire
const nativeConfirm = window.confirm.bind(window), nativePrompt = window.prompt.bind(window);
window.confirm = msg => nativeConfirm(tr(msg) ?? msg);
window.prompt = (msg, def) => nativePrompt(tr(msg) ?? msg, def);

function setLanguage(lang, kataEn = KATA_EN) {
  try { localStorage.setItem(LANG_KEY, lang); localStorage.setItem(KATA_EN_KEY, kataEn ? '1' : '0'); } catch (e) {}
  location.reload();
}
function openSettingsMenu(anchor) {
  openPop(anchor, [
    { header: LANG === 'en' ? 'Language' : 'Langue' },
    { label: 'Français', checked: LANG === 'fr', onClick: () => LANG !== 'fr' && setLanguage('fr') },
    { label: 'English', checked: LANG === 'en', onClick: () => LANG !== 'en' && setLanguage('en') },
    { sep: true },
    { label: LANG === 'en' ? 'Kata terms in English (Target Condition…)' : 'Termes Kata en anglais (Target Condition…)', switch: KATA_EN, onClick: () => setLanguage(LANG, !KATA_EN) },
  ]);
}
