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
    await page.click('#addProp');
    await page.fill('#newPropName', name);
    await page.locator('#nPop .row').filter({ has: page.locator('.name', { hasText: new RegExp(`^${type}$`) }) }).click();
  };
  await add('Points', 'Number');
  page.once('dialog', d => d.accept('prop("Points") * 2'));
  await add('Double', 'Formula');
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
  await page.locator('#nPop .row', { hasText: 'Edit' }).click();
  await expect(page.locator('#drawer')).toHaveClass(/center/);
  await expect(page.locator('#peekBanner')).toContainText('editing a template');
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
