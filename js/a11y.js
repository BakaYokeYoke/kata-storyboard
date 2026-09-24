/* Accessibilité : rôles et noms pour les lecteurs d'écran, navigation au clavier
   (menus, cartes, éléments cliquables), alternative clavier au glisser-déposer. */

// Rôles, focus et noms ajoutés au fil de l'affichage
const A11Y_RULES = [
  ['.n-menu', el => el.setAttribute('role', 'menu')],
  ['.tm-row', el => { el.setAttribute('role', 'menuitem'); el.tabIndex = -1; }],
  ['.vp-row:not(.static), .n-hidden-row, .n-newgroup, [data-streak-cell], .peek-props .k.custom', el => { el.setAttribute('role', 'button'); el.tabIndex = 0; }],
  ['.n-card', el => {
    el.tabIndex = 0;
    el.setAttribute('aria-roledescription', LANG === 'en' ? 'card' : 'carte');
    el.setAttribute('aria-label', el.querySelector('.tt')?.textContent || '');
    el.setAttribute('aria-keyshortcuts', 'Enter Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown');
  }],
  ['button[title], [role="button"][title]', el => {
    if (!el.hasAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', el.getAttribute('title'));
  }],
  ['[data-streak-cell]', el => el.setAttribute('aria-label', el.getAttribute('title') || '')],
  // Champs de saisie : un nom lisible par les lecteurs d'écran
  ['input:not([type="hidden"]):not([type="file"]), textarea, select', el => {
    if (el.getAttribute('aria-label') || el.labels?.length || el.getAttribute('aria-labelledby')) return;
    const propName = el.closest('.peek-props') && el.closest('.pv-wrap, .pv-check, .val, .streak-edit')?.previousElementSibling?.querySelector('.kname')?.textContent;
    const col = el.closest('td') && el.closest('table')?.querySelectorAll('th')[el.closest('td').cellIndex]?.textContent;
    const name = propName || col || el.getAttribute('placeholder') || el.getAttribute('title') || el.dataset.field || el.dataset.k;
    if (name) el.setAttribute('aria-label', name.trim());
  }],
];
function applyA11y(root) {
  if (root.nodeType !== 1) return;
  A11Y_RULES.forEach(([sel, fn]) => {
    if (root.matches(sel)) fn(root);
    root.querySelectorAll(sel).forEach(fn);
  });
}
new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(applyA11y)))
  .observe(document.documentElement, { childList: true, subtree: true });

// Clavier
document.addEventListener('keydown', e => {
  const el = e.target;
  if (!(el instanceof Element) || el.matches('input, textarea, select, [contenteditable="true"]')) return;

  // Entrée / Espace sur un élément cliquable qui n'est pas un vrai bouton
  if ((e.key === 'Enter' || e.key === ' ') && el.matches('[role="button"]:not(button), [role^="menuitem"], .n-card')) {
    e.preventDefault();
    el.click();
    return;
  }

  // Flèches dans un menu ou un panneau
  const menu = el.closest('#nPop, .n-menu, #viewPanel, #iconPicker');
  if (menu && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
    const items = [...menu.querySelectorAll('[role^="menuitem"], [role="button"], button, .ip-grid button')].filter(x => x.offsetParent !== null);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(el);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next].focus();
    return;
  }

  // Carte : Maj + flèches = déplacer (alternative au glisser-déposer)
  if (el.matches('.n-card') && e.shiftKey && e.key.startsWith('Arrow')) {
    e.preventDefault();
    moveCardByKeyboard(el, e.key);
  }
});

function moveCardByKeyboard(cardEl, key) {
  const id = cardEl.dataset.id;
  const cell = cardEl.closest('.n-cell[data-status]');
  if (!cell) return;
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const view = loadView();
    const cols = orderedStatuses(view).filter(s => !view.hidden.includes(s.key)).map(s => s.key);
    const i = cols.indexOf(cell.dataset.status) + (key === 'ArrowRight' ? 1 : -1);
    if (i < 0 || i >= cols.length) return;
    setStatus(Store, id, cols[i]);
    toast(`${LANG === 'en' ? 'Moved to' : 'Déplacée vers'} ${statusDef(cols[i]).label}`);
  } else {
    if (loadView().sort !== 'manual') return toast('Un tri est actif : retirez-le (Sort → Manuel) pour réordonner à la main');
    const cards = [...cell.querySelectorAll('.n-card')].map(c => Store.get(c.dataset.id));
    const i = cards.findIndex(c => c.id === id), j = i + (key === 'ArrowDown' ? 1 : -1);
    if (j < 0 || j >= cards.length) return;
    // Échange des rangs avec la voisine
    const ri = rankOf(cards[i]), rj = rankOf(cards[j]);
    Store.patch(cards[i].id, { rank: rj === ri ? rj + (j > i ? 1 : -1) : rj });
    Store.patch(cards[j].id, { rank: ri });
  }
  renderKanban();
  document.querySelector(`.n-card[data-id="${CSS.escape(id)}"]`)?.focus();
}
