// Parcours principaux de l'application.
const { test, expect } = require('@playwright/test');

const card = (page, id) => page.locator(`.n-card[data-id="${id}"]`);
const store = (page, id) => page.evaluate(i => Store.get(i), id);

test.beforeEach(async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('.n-card').first()).toBeVisible();
});

test('le Kanban affiche les colonnes, les sous-groupes et la démo', async ({ page }) => {
  await expect(page.locator('.n-head .n-pill')).toHaveText(['⏯️ Incoming', '⏭️ Tomorrow', '🌞 Daily Goal', '✋ Ongoing WIP', '✅ Daily Success']);
  await expect(page.locator('.n-group .n-pill')).toHaveText(['Perso', 'Pro']);
  await expect(page.locator('.n-card')).toHaveCount(5);
});

test('une nouvelle page sans titre n\'est pas créée, avec un titre elle l\'est', async ({ page }) => {
  await page.click('#newMain');
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  await page.click('#scrim', { position: { x: 20, y: 400 } });
  await expect(page.locator('.n-card')).toHaveCount(5);

  await page.click('#newMain');
  await page.fill('#peekTitle', 'Apprendre le japonais');
  await page.click('#drawerClose');
  await expect(page.locator('.n-card .tt', { hasText: 'Apprendre le japonais' })).toBeVisible();
});

test('glisser-déposer : changer de colonne et réordonner', async ({ page }) => {
  const target = page.locator('.n-cell[data-status="success"][data-group="perso"]');
  await card(page, 'demo-piano').dragTo(target.locator('.n-card').first(), { targetPosition: { x: 40, y: 4 } });
  await expect(target.locator('.n-card .tt').first()).toHaveText(/piano/);
  expect((await store(page, 'demo-piano')).status).toBe('success');
  await page.reload();
  await expect(page.locator('.n-cell[data-status="success"][data-group="perso"] .n-card .tt').first()).toHaveText(/piano/);
});

test('time block : Lire → Run → Kata, storyboard verrouillé puis éditable', async ({ page }) => {
  await card(page, 'demo-marathon').click();
  await expect(page.locator('#sbFrame')).toHaveClass(/readonly/);
  await page.click('[data-tb="start"]');
  await page.locator('.routine input[type=checkbox]').first().check();
  await page.click('[data-tb="validate"]');
  await expect(page.locator('#sbFrame')).not.toHaveClass(/readonly/);
  await expect(page.locator('.stepper .st.active')).toHaveText(/Kata/);
  await page.click('[data-tb="save"]');
  await expect(page.locator('.stepper .st.active')).toHaveText(/Lire/);
  await page.click('#drawerClose');
  const b = await store(page, 'demo-marathon');
  expect(b.timeblocks).toHaveLength(1);
  expect(b.timeblocks[0].runStatus).toBe('done');
});

test('run impossible : crée un obstacle et déverrouille le Kata', async ({ page }) => {
  await card(page, 'demo-marathon').click();
  await page.click('[data-tb="start"]');
  await page.click('[data-tb="impossible"]');
  await page.fill('#impossibleText', 'Piste fermée');
  await page.click('[data-tb="impossibleConfirm"]');
  await expect(page.locator('.stepper .st.active')).toHaveText(/Kata/);
  await page.click('#drawerClose');
  expect((await store(page, 'demo-marathon')).obstacles.map(o => o.text)).toContain('Piste fermée');
});

test('propriétés : ajout Number + Formula, valeur calculée et affichée sur la carte', async ({ page }) => {
  await card(page, 'demo-marathon').click();
  const add = async (name, type) => {
    if (!(await page.locator('#addProp').count())) await page.click('#moreProps');
    await page.click('#addProp');
    await page.fill('#newPropName', name);
    await page.locator('#nPop .row').filter({ has: page.locator('.name', { hasText: new RegExp(`^${type}$`) }) }).click();
  };
  await add('Points', 'Nombre');
  page.once('dialog', d => d.accept('prop("Points") * 2'));
  await add('Double', 'Formule');
  const row = name => page.locator('#peekProps [data-prop-menu]', { hasText: name }).locator('xpath=following-sibling::*[1]');
  await row('Points').locator('input').fill('8');
  await row('Points').locator('input').press('Tab');
  await expect(row('Double')).toHaveText('16');
  await page.click('#drawerClose');
  await page.evaluate(() => { const v = loadView(); v.props.push(CUSTOM_PROPS.find(p => p.name === 'Double').key); saveView(v); renderKanban(); });
  await expect(card(page, 'demo-marathon')).toContainText('16');
});

test('formules : pas d\'exécution de code', async ({ page }) => {
  const res = await page.evaluate(() => {
    const b = Store.get('demo-marathon');
    const run = f => { try { return evalFormula(b, f); } catch (e) { return 'ERR'; } };
    return [run('1 + 2 * 3'), run('constructor.constructor("return 1")()'), run('eval("1")'), run('this')];
  });
  expect(res).toEqual([7, 'ERR', 'ERR', 'ERR']);
});

test('corbeille et annulation', async ({ page }) => {
  await card(page, 'demo-piano').hover();
  await card(page, 'demo-piano').locator('[data-card="more"]').click();
  await page.locator('#nPop .row', { hasText: 'Supprimer' }).click();
  await expect(page.locator('.n-card')).toHaveCount(4);
  await page.click('.toast-act');
  await expect(page.locator('.n-card')).toHaveCount(5);

  await card(page, 'demo-piano').hover();
  await card(page, 'demo-piano').locator('[data-card="more"]').click();
  await page.locator('#nPop .row', { hasText: 'Supprimer' }).click();
  await page.keyboard.press('Meta+z');
  await expect(page.locator('.n-card')).toHaveCount(5);
  await page.keyboard.press('Meta+Shift+z');
  await expect(page.locator('.n-card')).toHaveCount(4);
});

test('export puis import : les données reviennent à l\'identique', async ({ page }) => {
  const exported = await page.evaluate(() => buildExport());
  expect(exported.version).toBe(2);
  await page.evaluate(() => { Store.remove('demo-usine'); renderKanban(); });
  await expect(page.locator('.n-card')).toHaveCount(4);
  await page.evaluate(state => { restoreState(state); renderKanban(); }, exported.state);
  await expect(page.locator('.n-card')).toHaveCount(5);
});

test('storyboard seul (?board=…) : verrouillé à l\'étape Lire, saisie enregistrée au Kata', async ({ page }) => {
  await page.goto('index.html?board=demo-piano');
  await expect(page.locator('#sbFrame')).toHaveClass(/readonly/);
  await page.click('[data-tb="start"]');
  await page.click('[data-tb="validate"]');
  await page.fill('#focusProcess', 'Séance du soir');
  await page.waitForTimeout(500);
  expect((await store(page, 'demo-piano')).focusProcess).toBe('Séance du soir');
});

test('templates : édition dans la fenêtre centrée et création depuis le template', async ({ page }) => {
  await page.click('#newCaret');
  await page.locator('[data-more="tpl-habitude"]').click();
  await page.locator('#nPop .row', { hasText: 'Modifier' }).click();
  await expect(page.locator('#drawer')).toHaveClass(/center/);
  await expect(page.locator('#peekBanner')).toContainText('Vous modifiez un template');
  await page.fill('#focusProcess', 'Routine du matin');
  await page.click('#drawerClose');
  await page.click('#newCaret');
  await page.locator('[data-tpl="tpl-habitude"] .name').click();
  await expect(page.locator('#focusProcess')).toHaveValue('Routine du matin');
  await expect(page.locator('#peekTitle')).toHaveValue('');
});

test('run récurrent : « Set as Done » valide, passe en Daily Success et replanifie', async ({ page }) => {
  await card(page, 'demo-marathon').locator('[data-btn-prop]').click();
  const b = await store(page, 'demo-marathon');
  expect(b.status).toBe('success');
  expect(b.timeblocks.at(-1).runStatus).toBe('done');
  const expected = await page.evaluate(() => addDaysISO(localISO(), 2));
  expect(b.recur.due).toBe(expected);
});

test('automatisation du matin : déplace les cartes et « Annuler » revient en arrière', async ({ page }) => {
  const before = await page.evaluate(() => Store.list().map(b => b.status).join());
  await page.evaluate(() => { localStorage.setItem('kata-daily-run', addDaysISO(localISO(), -1)); runDailyAutomation(); renderKanban(); });
  await expect(page.locator('#toast')).toContainText('Nouvelle journée');
  expect((await store(page, 'demo-usine')).status).toBe('goal');   // Tomorrow → Daily Goal
  await page.click('.toast-act');
  expect(await page.evaluate(() => Store.list().map(b => b.status).join())).toBe(before);
});

test('suivi des indicateurs : ajouter une mesure met à jour la courbe', async ({ page }) => {
  await card(page, 'demo-marathon').click();
  const outcome = page.locator('[data-metric="outcome"]');
  await expect(outcome.locator('.mt-dot')).toHaveCount(6);
  await outcome.locator('summary').click();
  await outcome.locator('[data-new="value"]').fill('94');
  await outcome.locator('.mt-add').click();
  await expect(page.locator('[data-metric="outcome"] .mt-dot')).toHaveCount(7);
  await expect(page.locator('[data-metric="outcome"] .mt-last')).toContainText('94 ✓');
  await page.click('#drawerClose');
  expect((await store(page, 'demo-marathon')).metrics.outcome.points).toHaveLength(7);
});

test('langue : bascule en anglais depuis les réglages, contenu saisi inchangé', async ({ page }) => {
  await expect(page.locator('.n-add').first()).toHaveText(/Nouvelle page/);
  await page.click('#pageSettings');
  await page.locator('#nPop .row', { hasText: 'English' }).click();
  await expect(page.locator('.n-add').first()).toHaveText(/New page/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(card(page, 'demo-marathon').locator('.tt')).toHaveText("Vivre en athlète d'endurance");   // titre saisi : jamais traduit
  await card(page, 'demo-marathon').click();
  await expect(page.locator('[data-tb="start"]')).toHaveText('Start the run');
  await expect(page.locator('[data-field="target.outcome"]')).toHaveAttribute('placeholder', 'Target result, quantified…');
});

test('clavier : ouvrir une carte, fermer avec Échap, déplacer avec Maj + flèches', async ({ page }) => {
  const c = card(page, 'demo-conseil');
  await c.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#drawer')).not.toHaveClass(/open/);
  await expect(card(page, 'demo-conseil')).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  expect((await store(page, 'demo-conseil')).status).toBe('tomorrow');
  await expect(card(page, 'demo-conseil')).toBeFocused();
  // Menu : flèches puis Entrée
  await card(page, 'demo-conseil').locator('[data-card="more"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#nPop .row').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#nPop')).toHaveCount(0);
});

test('accessibilité : aucune violation grave (axe) sur le Kanban et la page ouverte', async ({ page }) => {
  const AxeBuilder = require('@axe-core/playwright').default;
  const serious = r => r.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id} (${v.nodes.length})`);
  // Les couleurs de colonnes reprennent exactement celles de Notion : contraste hors périmètre de ce test
  const kanban = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(serious(kanban)).toEqual([]);
  await card(page, 'demo-marathon').click();
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  const peekScan = await new AxeBuilder({ page }).include('#drawer').disableRules(['color-contrast']).analyze();
  expect(serious(peekScan)).toEqual([]);
});

test('page : propriétés du storyboard modifiables, sélecteur d\'options, renommage', async ({ page }) => {
  await card(page, 'demo-usine').click();
  const value = name => page.locator('#peekProps [data-prop-menu]', { hasText: name }).locator('xpath=following-sibling::*[1]');
  // Pro/Perso : créer une option depuis le sélecteur
  await value('Pro/Perso').click();
  await page.locator('.op-input').fill('Famille');
  await page.keyboard.press('Enter');
  await expect(value('Pro/Perso')).toContainText('Famille');
  // Focus Process : modifié depuis la page, reporté dans le storyboard
  await value('Focus Process').locator('input').fill('Presse P12');
  await value('Focus Process').locator('input').press('Tab');
  await expect(page.locator('#focusProcess')).toHaveValue('Presse P12');
  // Renommer la propriété sur place
  await page.locator('#peekProps [data-prop-menu]', { hasText: 'Focus Process' }).click();
  await page.locator('#nPop .row', { hasText: 'Renommer' }).click();
  await page.locator('.k-rename').fill('Processus');
  await page.keyboard.press('Enter');
  await expect(page.locator('#peekProps .kname', { hasText: 'Processus' })).toBeVisible();
});

test('« Modifier la propriété » : réglages par type appliqués (nombre en euros, relation réciproque)', async ({ page }) => {
  await card(page, 'demo-marathon').click();
  const add = async (name, type) => {
    if (!(await page.locator('#addProp').count())) await page.click('#moreProps');
    await page.click('#addProp');
    await page.fill('#newPropName', name);
    await page.locator('#nPop .row').filter({ has: page.locator('.name', { hasText: new RegExp(`^${type}$`) }) }).click();
  };
  const menu = name => page.locator('#peekProps [data-prop-menu]').filter({ has: page.locator('.kname', { hasText: new RegExp(`^${name}$`) }) });
  const value = name => menu(name).locator('xpath=following-sibling::*[1]');
  await add('Budget', 'Nombre');
  await value('Budget').locator('input').fill('42.5');
  await value('Budget').locator('input').press('Tab');
  await menu('Budget').click();
  await page.locator('#nPop .row', { hasText: 'Modifier la propriété' }).click();
  await page.locator('#propEditor [data-set="numberFormat"]').selectOption('euro');
  await page.locator('#propEditor [data-set="decimals"]').selectOption('2');
  await page.locator('#propEditor [data-act="close"]').click();
  await expect(value('Budget')).toContainText('42,50 €');
  // Relation réciproque
  await add('Liée à', 'Relation');
  await menu('Liée à').click();
  await page.locator('#nPop .row', { hasText: 'Modifier la propriété' }).click();
  await page.locator('#propEditor [data-toggle="twoWay"]').click();
  await page.locator('#propEditor [data-act="close"]').click();
  await value('Liée à').click();
  await page.locator('#nPop .row', { hasText: 'piano' }).click();
  const reverse = await page.evaluate(() => { const k = CUSTOM_PROPS.find(p => p.name === 'Liée à').twoWay; return Store.get('demo-piano').props[k]; });
  expect(reverse).toEqual(['demo-marathon']);
});

test('page : réordonner les propriétés par glisser-déposer et les grouper en sections', async ({ page }) => {
  await card(page, 'demo-usine').click();
  const names = () => page.locator('#peekProps .prow .kname').allInnerTexts();
  const row = name => page.locator('#peekProps .prow').filter({ has: page.locator('.kname', { hasText: new RegExp(`^${name}$`) }) });
  // Glisser « Status » sous « Challenge »
  const grip = row('Status').locator('[data-grip]');
  await row('Status').hover();
  const from = await grip.boundingBox(), to = await row('Challenge').boundingBox();
  await page.mouse.move(from.x + 5, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(from.x + 5, to.y + to.height - 2, { steps: 8 });
  await page.mouse.up();
  const after = await names();
  expect(after.indexOf('Status')).toBe(after.indexOf('Challenge') + 1);
  // Clavier : ↑ remonte d'un cran
  await row('Status').locator('[data-grip]').focus();
  await page.keyboard.press('ArrowUp');
  expect((await names()).indexOf('Status')).toBe((await names()).indexOf('Challenge') - 1);
  // Créer une section à partir de « Focus Process », la renommer, la replier
  await row('Focus Process').locator('[data-prop-menu]').click();
  await page.locator('#nPop .row', { hasText: 'Créer une section ici' }).click();
  await page.locator('.psec-rename').fill('Storyboard');
  await page.keyboard.press('Enter');
  await expect(page.locator('.psec-name', { hasText: 'Storyboard' })).toBeVisible();
  await expect(page.locator('.psec').nth(1).locator('.kname').first()).toHaveText('Focus Process');
  await page.click('[data-sec-toggle]');
  await expect(row('Focus Process')).toHaveCount(0);
  // L'ordre et les sections sont conservés après rechargement
  await page.reload();
  await card(page, 'demo-usine').click();
  await expect(page.locator('.psec-name', { hasText: 'Storyboard' })).toBeVisible();
  await expect(row('Focus Process')).toHaveCount(0);
});
