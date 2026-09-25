/* Propriétés (comme une base Notion) : types, valeurs, formules, rollups, streak, calculs, tri, filtres. */

/* ============================================================
   Propriétés (comme une base Notion)
   Une seule liste, partagée par la page ouverte, les cartes, Property visibility, Filter et Sort.
   ============================================================ */
// Intégrées : Status et Pro/Perso sont éditables ; les autres viennent du storyboard (lecture seule).
const BUILTIN_PROPS = [
  { key: 'status',      label: 'Status',              icon: 'status',   kind: 'status' },
  { key: 'group',       label: 'Pro/Perso',           icon: 'select',   kind: 'group' },
  { key: 'challenge',   label: 'Challenge',           icon: 'text',     kind: 'story' },
  { key: 'focus',       label: 'Focus Process',       icon: 'text',     kind: 'story' },
  { key: 'due',         label: 'Échéance (Target)',   icon: 'calendar', kind: 'story' },
  { key: 'obstacle',    label: 'Obstacle en cours',   icon: 'text',     kind: 'story' },
  { key: 'experiments', label: 'Expériences',         icon: 'hash',     kind: 'story' },
  { key: 'step',        label: 'Étape du time block', icon: 'timer',    kind: 'story' },
  { key: 'runEvery',    label: 'Every x days (Run)',  icon: 'repeat',   kind: 'recur' },
  { key: 'runDue',      label: 'Due Date (Run)',      icon: 'calendar', kind: 'recur' },
];
const PROP_TYPES = {
  text:         { label: 'Text',             icon: 'text' },
  number:       { label: 'Number',           icon: 'hash' },
  select:       { label: 'Select',           icon: 'select',   options: true },
  multi:        { label: 'Multi-select',     icon: 'multi',    options: true, many: true },
  status:       { label: 'Status',           icon: 'status',   options: true },
  date:         { label: 'Date',             icon: 'calendar' },
  person:       { label: 'Person',           icon: 'people',   options: true, many: true },
  files:        { label: 'Files & media',    icon: 'clip' },
  checkbox:     { label: 'Checkbox',         icon: 'checkbox' },
  url:          { label: 'URL',              icon: 'link' },
  email:        { label: 'Email',            icon: 'at' },
  phone:        { label: 'Phone',            icon: 'phone' },
  formula:      { label: 'Formula',          icon: 'sigma',    readOnly: true },
  relation:     { label: 'Relation',         icon: 'arrowUR' },
  rollup:       { label: 'Rollup',           icon: 'search',   readOnly: true },
  created_time: { label: 'Created time',     icon: 'clockUI',  readOnly: true },
  created_by:   { label: 'Created by',       icon: 'userUI',   readOnly: true },
  edited_time:  { label: 'Last edited time', icon: 'clockUI',  readOnly: true },
  edited_by:    { label: 'Last edited by',   icon: 'userUI',   readOnly: true },
  id:           { label: 'ID',               icon: 'idUI',     readOnly: true },
  streak:       { label: 'Streak',           icon: 'streakUI' },
  button:       { label: 'Button',           icon: 'cursor' },
};

// Dates locales (le jour change à minuit chez vous, pas à minuit UTC)
const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return localISO(d); };
function relDay(iso) {
  const diff = Math.round((new Date(iso + 'T00:00') - new Date(localISO() + 'T00:00')) / 86400000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  if (diff === -1) return 'hier';
  if (diff > 1 && diff < 7) return `dans ${diff} j`;
  if (diff < -1) return `il y a ${-diff} j`;
  return new Date(iso + 'T00:00').toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' });
}

/* ---------- Runs récurrents et bouton « Set as Done » ---------- */
// Valide le run du jour : alimente le Streak, passe la carte en Daily Success, replanifie la prochaine date.
function markRunDone(St, id) {
  if (typeof peek !== 'undefined' && peek?.id === id) flushBoardSave();
  const d = St.get(id);
  if (!d) return;
  const now = Date.now();
  const timeblocks = [...(d.timeblocks || []), { id: uid(), cardId: id, step: 'kata', startedAt: now, durationMin: 0, runStatus: 'done', endedAt: now, quick: true }];
  const recur = d.recur?.every ? { ...d.recur, due: addDaysISO(localISO(), d.recur.every) } : d.recur;
  St.patch(id, { timeblocks, recur, ...(statusOf(d) !== 'success' ? { status: 'success', statusSince: now } : {}) });
  if (typeof board !== 'undefined' && board?.id === id) board.timeblocks = timeblocks;
  toast(recur?.due ? `Run validé · prochain ${relDay(recur.due)}` : 'Run validé');
}
function executeButton(St, id, cp) {
  const a = cp.action || { type: 'run_done' };
  if (a.type === 'status' && a.status) { setStatus(St, id, a.status); toast(`Déplacé vers ${statusDef(a.status).label}`); }
  else markRunDone(St, id);
}

// Streak : réussite (run validé, ou correction manuelle) sur chacune des N dernières occurrences.
// Chaque carte définit sa fréquence : une occurrence tous les « every » jours.
const DAY = 86400000;
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function streakData(b, cp) {
  const v = b.props?.[cp.key] || {};
  const every = Math.max(1, parseInt(v.every, 10) || 1);
  const n = Math.max(1, cp.streakLength || 7);
  const done = (b.timeblocks || []).filter(t => t.runStatus === 'done' && t.endedAt).map(t => t.endedAt);
  const end0 = dayStart(Date.now()) + DAY;
  const cells = [];
  for (let k = n - 1; k >= 0; k--) {
    const end = end0 - k * every * DAY, start = end - every * DAY;
    const key = new Date(start).toISOString().slice(0, 10);
    const auto = done.some(t => t >= start && t < end);
    const manual = v.manual?.[key];
    cells.push({ key, start, end, done: manual ?? auto, current: k === 0 });
  }
  let current = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].done) current++;
    else if (cells[i].current) continue;   // l'occurrence en cours peut encore être réussie
    else break;
  }
  return { cells, every, n, hits: cells.filter(c => c.done).length, current };
}
const streakHTML = (data, clickable = false) => `<span class="streak">${data.cells.map(c =>
  `<i class="${c.done ? 'on' : ''} ${c.current ? 'cur' : ''}" ${clickable ? `data-streak-cell="${c.key}"` : ''} title="${new Date(c.start).toLocaleDateString(LOCALE())}${c.done ? ' · réussi' : ''}"></i>`).join('')}</span>`;
const DEFAULT_OPTIONS = {
  status: () => [{ id: uid(), label: 'Pas commencé', color: 'gray', group: 'todo' }, { id: uid(), label: 'En cours', color: 'blue', group: 'doing' }, { id: uid(), label: 'Terminé', color: 'green', group: 'done' }],
  person: () => [{ id: uid(), label: 'Moi', color: 'gray' }],
};
const ME = 'Moi';

const CUSTOM_KEY = 'kata-props';
function loadCustomProps() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; } catch (e) { return []; } }
let CUSTOM_PROPS = loadCustomProps();
function saveCustomProps() { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(CUSTOM_PROPS)); } catch (e) {} }
const customDef = k => CUSTOM_PROPS.find(p => p.key === k);
// Les propriétés intégrées peuvent être renommées (le nouveau nom est gardé à part)
const PROP_NAMES_KEY = 'kata-prop-names';
const propNameOverrides = () => { try { return JSON.parse(localStorage.getItem(PROP_NAMES_KEY) || '{}'); } catch (e) { return {}; } };
const allProps = () => {
  const o = propNameOverrides();
  return [...BUILTIN_PROPS.map(p => o[p.key] ? { ...p, label: o[p.key], renamed: true } : p),
    ...CUSTOM_PROPS.map(p => ({ key: p.key, label: p.name, icon: PROP_TYPES[p.type].icon, kind: 'custom' }))];
};
function renameProp(key, name) {
  const cp = customDef(key);
  if (cp) { cp.name = name; return saveCustomProps(); }
  const o = propNameOverrides();
  o[key] = name;
  try { localStorage.setItem(PROP_NAMES_KEY, JSON.stringify(o)); } catch (e) {}
}
const propDef = k => allProps().find(p => p.key === k);
const PROPS = BUILTIN_PROPS;   // compatibilité

// Affichage dans la page ouverte : 'show' (toujours), 'empty' (masquée si vide), 'hide' (toujours masquée)
const PAGE_VIS_KEY = 'kata-page-vis';
function pageVisOf(key) {
  const cp = customDef(key);
  if (cp) return cp.pageVis || 'show';
  let m = {}; try { m = JSON.parse(localStorage.getItem(PAGE_VIS_KEY) || '{}'); } catch (e) {}
  return m[key] || (key === 'status' || key === 'group' ? 'show' : 'empty');
}
function setPageVis(key, vis) {
  const cp = customDef(key);
  if (cp) { cp.pageVis = vis; return saveCustomProps(); }
  let m = {}; try { m = JSON.parse(localStorage.getItem(PAGE_VIS_KEY) || '{}'); } catch (e) {}
  m[key] = vis; try { localStorage.setItem(PAGE_VIS_KEY, JSON.stringify(m)); } catch (e) {}
}

// Ordre et sections des propriétés dans la page (communs à toutes les pages, comme Notion).
// [{ id, name, collapsed, keys: [...] }] ; la première section peut être sans nom (pas d'en-tête).
const PAGE_LAYOUT_KEY = 'kata-page-layout';
function pageLayout() {
  let L = null; try { L = JSON.parse(localStorage.getItem(PAGE_LAYOUT_KEY)); } catch (e) {}
  if (!Array.isArray(L) || !L.length) L = [{ id: 'main', name: '', keys: [] }];
  const all = allProps().map(p => p.key), seen = new Set();
  L.forEach(sec => { sec.keys = (sec.keys || []).filter(k => all.includes(k) && !seen.has(k) && seen.add(k)); });
  all.filter(k => !seen.has(k)).forEach(k => L[L.length - 1].keys.push(k));   // nouvelles propriétés : à la fin
  return L;
}
function savePageLayout(L) { try { localStorage.setItem(PAGE_LAYOUT_KEY, JSON.stringify(L)); } catch (e) {} }
function movePropTo(key, secId, index) {
  const L = pageLayout(), from = L.find(x => x.keys.includes(key)), to = L.find(x => x.id === secId);
  if (!from || !to) return;
  const old = from.keys.indexOf(key);
  from.keys.splice(old, 1);
  if (from === to && old < index) index--;
  to.keys.splice(Math.max(0, Math.min(index, to.keys.length)), 0, key);
  savePageLayout(L);
}
// Nouvelle section qui commence à cette propriété (elle et les suivantes y passent)
function splitSectionAt(key) {
  const L = pageLayout(), i = L.findIndex(x => x.keys.includes(key)), sec = L[i], at = sec.keys.indexOf(key);
  if (at === 0 && !sec.name) { sec.name = 'Nouvelle section'; savePageLayout(L); return sec.id; }
  const nsec = { id: 's-' + uid(), name: 'Nouvelle section', keys: sec.keys.splice(at) };
  L.splice(i + 1, 0, nsec); savePageLayout(L);
  return nsec.id;
}
function deleteSection(secId) {
  const L = pageLayout(), i = L.findIndex(x => x.id === secId);
  if (i < 0) return;
  if (L.length === 1) { L[0].name = ''; L[0].collapsed = false; }
  else { const into = L[i > 0 ? i - 1 : 1]; into.keys = i > 0 ? [...into.keys, ...L[i].keys] : [...L[i].keys, ...into.keys]; L.splice(i, 1); }
  savePageLayout(L);
}

const isEmptyVal = v => v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'number' && isNaN(v));
const fmtDay = d => d.toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = d => d.toLocaleString(LOCALE(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const toDate = s => s ? new Date(s.length === 10 ? s + 'T00:00' : s) : null;
const optOf = (cp, oid) => cp.options?.find(o => o.id === oid);
const optPillHTML = o => o ? `<span class="n-pill small c-${o.color}" style="border-radius:4px">${esc(o.label)}</span>` : '';

// Valeur « brute » d'une propriété pour une carte (utilisée par l'affichage, les formules, le tri et les filtres)
function rawValue(b, key, depth = 0) {
  switch (key) {
    case 'status': return statusDef(statusOf(b)).label;
    case 'group': return groupDef(groupOf(b)).label;
    case 'challenge': return challengeText(b);
    case 'focus': return b.focusProcess || '';
    case 'due': return toDate(b.targetDate);
    case 'obstacle': return (b.obstacles || []).find(o => o.focus && !o.done)?.text || '';
    case 'experiments': return (b.experiments || []).length;
    case 'step': return { run: 'Run en cours', kata: 'Kata' }[b.session?.step] || '';
    case 'runEvery': return b.recur?.every ?? null;
    case 'runDue': return toDate(b.recur?.due);
  }
  const cp = customDef(key);
  if (!cp) return null;
  const v = b.props?.[key];
  switch (cp.type) {
    case 'number': return v === '' || v === undefined || v === null ? null : Number(v);
    case 'select': case 'status': return optOf(cp, v)?.label || '';
    case 'multi': case 'person': return (v || []).map(id => optOf(cp, id)?.label).filter(Boolean);
    case 'date': return toDate(v?.start ?? v);
    case 'checkbox': return !!v;
    case 'files': return (v || []).map(f => f.name);
    case 'relation': return (v || []).map(id => Store.get(id)).filter(Boolean).map(c => c.title || 'Sans titre');
    case 'formula': try { return evalFormula(b, cp.formula, depth); } catch (e) { return new Error(e.message); }
    case 'rollup': return computeRollup(b, cp, depth);
    case 'created_time': return b.createdAt ? new Date(b.createdAt) : null;
    case 'edited_time': return b.updatedAt ? new Date(b.updatedAt) : null;
    case 'created_by': case 'edited_by': return ME;
    case 'id': return b.seq ?? null;
    case 'streak': return streakData(b, cp).hits;
    case 'button': return null;
    default: return v ?? '';
  }
}

// Formules : prop("Nom"), if(), and/or, maths, dates, textes
function evalFormula(b, expr, depth = 0) {
  if (!expr || !expr.trim()) return null;
  if (depth > 6) throw new Error('Référence circulaire');
  const unit = u => ({ days: 86400000, day: 86400000, jours: 86400000, hours: 3600000, heures: 3600000, minutes: 60000, weeks: 604800000, semaines: 604800000 })[u || 'days'] || 86400000;
  const H = {
    prop: name => {
      const d = allProps().find(p => p.label.toLowerCase() === String(name).toLowerCase());
      if (String(name).toLowerCase() === 'name' || String(name).toLowerCase() === 'titre') return b.title || '';
      if (!d) throw new Error(`Propriété inconnue : ${name}`);
      const v = rawValue(b, d.key, depth + 1);
      if (v instanceof Error) throw v;
      return v;
    },
    now: () => new Date(),
    today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
    if_: (c, a, z) => c ? a : z,
    concat: (...a) => a.flat().map(x => x instanceof Date ? fmtDay(x) : x ?? '').join(''),
    join: (arr, sep = ', ') => (arr || []).join(sep),
    length: x => x == null ? 0 : Array.isArray(x) ? x.length : String(x).length,
    round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
    floor: Math.floor, ceil: Math.ceil, abs: Math.abs, sqrt: Math.sqrt, pow: Math.pow,
    min: (...a) => Math.min(...a.flat()), max: (...a) => Math.max(...a.flat()),
    sum: (...a) => a.flat().reduce((t, x) => t + (+x || 0), 0),
    mean: (...a) => { const l = a.flat(); return l.length ? l.reduce((t, x) => t + (+x || 0), 0) / l.length : 0; },
    empty: x => isEmptyVal(x), not: x => !x,
    contains: (a, x) => Array.isArray(a) ? a.includes(x) : String(a ?? '').includes(x),
    lower: x => String(x ?? '').toLowerCase(), upper: x => String(x ?? '').toUpperCase(),
    toNumber: x => Number(x), format: x => x instanceof Date ? fmtDay(x) : String(x ?? ''),
    dateBetween: (a, z, u) => a && z ? Math.floor((new Date(a) - new Date(z)) / unit(u)) : null,
    dateAdd: (d, n, u) => d ? new Date(new Date(d).getTime() + n * unit(u)) : null,
    formatDate: d => d ? fmtDay(new Date(d)) : '',
  };
  H.if = H.if_;
  return evalAst(parseFormula(expr), H);
}

// Interpréteur de formules sûr : analyse puis calcule, sans jamais exécuter de code.
function parseFormula(src) {
  const toks = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_À-ÿ][\wÀ-ÿ]*)|(===|!==|==|!=|<=|>=|&&|\|\||[-+*/%^()<>!?:,]))/y;
  let m, pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m) throw new Error(`Caractère inattendu : « ${src.slice(pos).trim()[0]} »`);
    pos = re.lastIndex;
    if (m[1]) toks.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2]) toks.push({ t: 'str', v: m[2].slice(1, -1).replace(/\\(.)/g, '$1') });
    else if (m[3]) {
      const w = m[3];
      if (w === 'and') toks.push({ t: 'op', v: '&&' });
      else if (w === 'or') toks.push({ t: 'op', v: '||' });
      else if (w === 'not') toks.push({ t: 'op', v: '!' });
      else toks.push({ t: 'id', v: w });
    } else toks.push({ t: 'op', v: m[4] });
  }
  let i = 0;
  const peek = () => toks[i], isOp = v => toks[i]?.t === 'op' && toks[i].v === v;
  const expect = v => { if (!isOp(v)) throw new Error(`« ${v} » attendu`); i++; };
  const bin = (next, ops) => () => {
    let left = next();
    while (toks[i]?.t === 'op' && ops.includes(toks[i].v)) { const op = toks[i++].v; left = { k: 'bin', op, a: left, b: next() }; }
    return left;
  };
  const primary = () => {
    const tk = toks[i++];
    if (!tk) throw new Error('Formule incomplète');
    if (tk.t === 'num' || tk.t === 'str') return { k: 'lit', v: tk.v };
    if (tk.t === 'op' && tk.v === '(') { const e = ternary(); expect(')'); return e; }
    if (tk.t === 'id') {
      if (tk.v === 'true' || tk.v === 'false') return { k: 'lit', v: tk.v === 'true' };
      if (tk.v === 'null') return { k: 'lit', v: null };
      if (isOp('(')) {
        i++;
        const args = [];
        if (!isOp(')')) { do { args.push(ternary()); } while (isOp(',') && ++i); }
        expect(')');
        return { k: 'call', name: tk.v, args };
      }
      throw new Error(`« ${tk.v} » inconnu (utilisez prop("${tk.v}") pour une propriété)`);
    }
    throw new Error(`« ${tk.v} » inattendu`);
  };
  const unary = () => {
    if (isOp('-') || isOp('!')) { const op = toks[i++].v; return { k: 'un', op, a: unary() }; }
    return primary();
  };
  const power = () => { const a = unary(); if (isOp('^')) { i++; return { k: 'bin', op: '^', a, b: power() }; } return a; };
  const mul = bin(power, ['*', '/', '%']);
  const add = bin(mul, ['+', '-']);
  const cmp = bin(add, ['<', '<=', '>', '>=']);
  const eq = bin(cmp, ['==', '!=', '===', '!==']);
  const and = bin(eq, ['&&']);
  const or = bin(and, ['||']);
  const ternary = () => {
    const c = or();
    if (isOp('?')) { i++; const a = ternary(); expect(':'); return { k: 'if', c, a, b: ternary() }; }
    return c;
  };
  const ast = ternary();
  if (i < toks.length) throw new Error(`« ${toks[i].v} » inattendu`);
  return ast;
}

function evalAst(n, H) {
  const txt = v => v instanceof Date ? fmtDay(v) : Array.isArray(v) ? v.join(', ') : v ?? '';
  switch (n.k) {
    case 'lit': return n.v;
    case 'if': return evalAst(n.c, H) ? evalAst(n.a, H) : evalAst(n.b, H);
    case 'un': { const v = evalAst(n.a, H); return n.op === '-' ? -v : !v; }
    case 'call': {
      const fn = Object.prototype.hasOwnProperty.call(H, n.name) ? H[n.name] : null;
      if (typeof fn !== 'function') throw new Error(`Fonction inconnue : ${n.name}()`);
      return fn(...n.args.map(a => evalAst(a, H)));
    }
    case 'bin': {
      if (n.op === '&&') return evalAst(n.a, H) && evalAst(n.b, H);
      if (n.op === '||') return evalAst(n.a, H) || evalAst(n.b, H);
      let a = evalAst(n.a, H), b = evalAst(n.b, H);
      const num = v => v instanceof Date ? v.getTime() : v;
      switch (n.op) {
        case '+': return typeof a === 'string' || typeof b === 'string' || a instanceof Date || b instanceof Date ? `${txt(a)}${txt(b)}` : a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? null : a / b;
        case '%': return a % b;
        case '^': return a ** b;
        case '<': return num(a) < num(b);
        case '<=': return num(a) <= num(b);
        case '>': return num(a) > num(b);
        case '>=': return num(a) >= num(b);
        case '==': case '===': return num(a) === num(b) || (Array.isArray(a) && Array.isArray(b) && a.join() === b.join());
        case '!=': case '!==': return num(a) !== num(b);
      }
    }
  }
  throw new Error('Formule invalide');
}

const ROLLUP_CALCS = {
  show: 'Afficher les valeurs', count: 'Nombre de pages', count_values: 'Nombre de valeurs', sum: 'Somme', avg: 'Moyenne',
  min: 'Minimum', max: 'Maximum', checked: 'Nombre cochées', percent_checked: '% cochées',
};
function computeRollup(b, cp, depth = 0) {
  const r = cp.rollup || {};
  if (!r.relation) return null;
  const pages = (b.props?.[r.relation] || []).map(id => Store.get(id)).filter(Boolean);
  const vals = r.target ? pages.map(p => r.target === '__title' ? p.title : rawValue(p, r.target, depth + 1)) : [];
  const nums = vals.flat().map(Number).filter(x => !isNaN(x));
  switch (r.calc || 'count') {
    case 'count': return pages.length;
    case 'count_values': return vals.flat().filter(v => !isEmptyVal(v)).length;
    case 'sum': return nums.reduce((t, x) => t + x, 0);
    case 'avg': return nums.length ? Math.round(nums.reduce((t, x) => t + x, 0) / nums.length * 100) / 100 : null;
    case 'min': return nums.length ? Math.min(...nums) : null;
    case 'max': return nums.length ? Math.max(...nums) : null;
    case 'checked': return vals.filter(Boolean).length;
    case 'percent_checked': return pages.length ? Math.round(vals.filter(Boolean).length / pages.length * 100) + ' %' : null;
    default: return vals.flat().filter(v => !isEmptyVal(v)).map(v => v instanceof Date ? fmtDay(v) : v).join(', ');
  }
}

// ---------- Réglages d'affichage par type (comme « Edit property » dans Notion) ----------
const NUMBER_FORMATS = {
  number: 'Nombre', commas: 'Nombre avec séparateurs', percent: 'Pourcentage', euro: 'Euro', dollar: 'Dollar', pound: 'Livre sterling', yen: 'Yen',
};
function formatNumber(v, cp) {
  const f = cp.numberFormat || 'number';
  const dec = cp.decimals === undefined || cp.decimals === null || cp.decimals === '' ? undefined : Number(cp.decimals);
  const opts = { minimumFractionDigits: dec, maximumFractionDigits: dec ?? 6 };
  if (f === 'number') return dec === undefined ? String(v) : v.toFixed(dec);
  if (f === 'commas') return v.toLocaleString(LOCALE(), opts);
  if (f === 'percent') return (v * 100).toLocaleString(LOCALE(), { ...opts, maximumFractionDigits: dec ?? 2 }) + ' %';
  const cur = { euro: 'EUR', dollar: 'USD', pound: 'GBP', yen: 'JPY' }[f];
  return v.toLocaleString(LOCALE(), { style: 'currency', currency: cur, minimumFractionDigits: dec, maximumFractionDigits: dec ?? 2 });
}
// Nombre affiché en texte, barre ou anneau (avec « diviser par »)
function numberHTML(v, cp, ctx) {
  const txt = esc(formatNumber(v, cp));
  if (!cp.showAs || cp.showAs === 'number') return ctx === 'card' ? `<span class="n-chip">${txt}</span>` : txt;
  const ratio = Math.max(0, Math.min(1, v / (Number(cp.divideBy) || 100)));
  const color = ICON_COLORS[cp.barColor || 'green'] || ICON_COLORS.green;
  const vis = cp.showAs === 'ring'
    ? `<svg class="num-ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="rgba(55,53,47,.12)" stroke-width="3"/><circle cx="10" cy="10" r="7.5" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(ratio * 47.1).toFixed(1)} 47.1" transform="rotate(-90 10 10)"/></svg>`
    : `<span class="num-bar"><span style="width:${(ratio * 100).toFixed(1)}%;background:${color}"></span></span>`;
  return `<span class="num-vis ${ctx === 'card' ? 'n-chip' : ''}">${cp.hideNumber ? '' : `<span>${txt}</span>`}${vis}</span>`;
}
const DATE_FORMATS = { full: 'Complet', dmy: 'Jour/Mois/Année', mdy: 'Mois/Jour/Année', ymd: 'Année/Mois/Jour', relative: 'Relatif' };
function formatDateOnly(d, fmt = 'full') {
  const p = n => String(n).padStart(2, '0');
  if (fmt === 'dmy') return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (fmt === 'mdy') return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
  if (fmt === 'ymd') return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
  if (fmt === 'relative') return relDay(localISO(d));
  return d.toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateValue(v, cfg = {}) {
  const part = s => {
    if (!s) return '';
    const d = toDate(s);
    if (!d || isNaN(d)) return '';
    let out = formatDateOnly(d, cfg.dateFormat);
    const withTime = cfg.includeTime ?? (cfg.timeFormat && cfg.timeFormat !== 'hidden');
    if (withTime && String(s).length > 10 && cfg.timeFormat !== 'hidden') {
      out += ' ' + d.toLocaleTimeString(cfg.timeFormat === '12' ? 'en-US' : LOCALE(), { hour: '2-digit', minute: '2-digit', hour12: cfg.timeFormat === '12' });
    }
    return out;
  };
  if (v && typeof v === 'object' && !(v instanceof Date)) return [part(v.start), part(v.end)].filter(Boolean).join(' → ');
  return part(v);
}
// Options triées selon le réglage de la propriété (manuel, alphabétique, inverse)
function sortedOptionIds(cp, ids) {
  if (!cp.optionSort || cp.optionSort === 'manual') return ids;
  const lbl = id => optOf(cp, id)?.label || '';
  const out = [...ids].sort((a, z) => lbl(a).localeCompare(lbl(z), LOCALE()));
  return cp.optionSort === 'desc' ? out.reverse() : out;
}
// Liens : seulement http(s), mailto et tel
function safeUrl(v) {
  const s = String(v || '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '#';
  return 'https://' + s;
}

// HTML d'une valeur ('' si vide). ctx : 'card' (pastilles du Kanban) ou 'page' (page ouverte)
function valueHTML(b, key, ctx = 'card') {
  const chip = (t, cls = '') => ctx === 'card' ? `<span class="n-chip ${cls}">${t}</span>` : t;
  const fmt = v => v instanceof Error ? `<span class="err">Erreur : ${esc(v.message)}</span>`
    : v instanceof Date ? esc(fmtDay(v)) : typeof v === 'boolean' ? (v ? '☑' : '☐')
    : Array.isArray(v) ? esc(v.join(', ')) : typeof v === 'number' ? esc(v.toLocaleString(LOCALE())) : esc(v ?? '');
  switch (key) {
    case 'status': return pill(statusDef(statusOf(b))).replace('n-pill', ctx === 'card' ? 'n-pill small' : 'n-pill');
    case 'group': { const g = groupDef(groupOf(b)); return `<span class="n-pill ${ctx === 'card' ? 'small' : ''} c-${g.color}" style="border-radius:4px">${esc(g.label)}</span>`; }
    case 'challenge': case 'focus': { const v = rawValue(b, key); return v ? esc(v) : ''; }
    case 'due': { const d = rawValue(b, key); return d ? chip(`🎯 ${esc(fmtDay(d))}`) : ''; }
    case 'obstacle': { const v = rawValue(b, key); return v ? chip(`➜ ${esc(v)}`, 'obs') : ''; }
    case 'experiments': { const n = rawValue(b, key); return n ? chip(`${n} exp.`) : ''; }
    case 'step': { const v = rawValue(b, key); return v ? chip(v === 'Kata' ? '● Kata' : '▶ Run en cours') : ''; }
    case 'runEvery': return b.recur?.every ? chip(`↻ tous les ${b.recur.every} j`) : '';
    case 'runDue': { const due = b.recur?.due; if (!due) return ''; return chip(`↻ ${esc(relDay(due))}`, due < localISO() ? 'late' : due === localISO() ? 'today' : ''); }
  }
  const cp = customDef(key);
  if (!cp) return '';
  const v = b.props?.[key];
  switch (cp.type) {
    case 'select': return optPillHTML(optOf(cp, v));
    case 'status': { const o = optOf(cp, v); return o ? `<span class="n-pill ${ctx === 'card' ? 'small' : ''} c-${o.color}"><span class="dot"></span>${esc(o.label)}</span>` : ''; }
    case 'multi': case 'person': return sortedOptionIds(cp, v || []).map(id => optPillHTML(optOf(cp, id))).join('');
    case 'checkbox': return v ? (ctx === 'card' ? chip(`☑ ${esc(cp.name)}`) : '☑') : '';
    case 'date': return v ? chip(esc(formatDateValue(v, cp))) : '';
    case 'url': return v ? chip(`<a href="${esc(safeUrl(v))}" target="_blank" rel="noopener">${esc(cp.fullUrl ? v : v.replace(/^https?:\/\//, '').replace(/^www\./, ''))}</a>`) : '';
    case 'email': return v ? chip(`<a href="mailto:${esc(v)}">${esc(v)}</a>`) : '';
    case 'phone': return v ? chip(`<a href="tel:${esc(v)}">${esc(v)}</a>`) : '';
    case 'files': return (v || []).map(f => chip(f.fileId
      ? `📎 <a href="#" data-file-id="${esc(f.fileId)}">${esc(f.name)}</a>`
      : `📎 <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>`)).join(ctx === 'card' ? '' : ' ');
    case 'relation': return (v || []).map(id => Store.get(id)).filter(Boolean).map(c => chip(`↗ ${esc(c.title || 'Sans titre')}`)).join(ctx === 'card' ? '' : ' ');
    case 'created_time': case 'edited_time': { const d = rawValue(b, key); return d ? chip(esc(formatDateValue(d.toISOString(), { dateFormat: cp.dateFormat, timeFormat: cp.timeFormat || '24', includeTime: cp.timeFormat !== 'hidden' }))) : ''; }
    case 'created_by': case 'edited_by': return chip(ME);
    case 'id': return b.seq != null ? chip(`${esc(cp.prefix || '')}${b.seq}`) : '';
    case 'button': return `<button class="n-btn-prop" data-btn-prop="${cp.key}" data-btn-card="${esc(b.id)}" title="${esc(cp.action?.type === 'status' ? `Passer en ${statusDef(cp.action.status)?.label}` : 'Valider le run du jour')}">${esc(cp.name)}</button>`;
    case 'streak': { const sd = streakData(b, cp); return ctx === 'card' ? `<span class="n-chip streak-chip" title="${esc(cp.name)} : ${sd.hits}/${sd.n} · série en cours ${sd.current}">${streakHTML(sd)}</span>` : streakHTML(sd); }
    case 'number': { const r = rawValue(b, key); return r === null || isNaN(r) ? '' : numberHTML(r, cp, ctx); }
    case 'formula': case 'rollup': { const r = rawValue(b, key); return isEmptyVal(r) && !(r instanceof Error) ? '' : chip(typeof r === 'number' && cp.numberFormat ? esc(formatNumber(r, cp)) : fmt(r)); }
    default: return v ? (ctx === 'card' ? esc(v) : esc(v)) : '';
  }
}
// Sur une carte, les textes longs forment une ligne, le reste des pastilles
const isBlockProp = key => ['challenge', 'focus'].includes(key) || customDef(key)?.type === 'text';

// ---------- Calculs de colonne (comme le pied de colonne Notion) ----------
const AGG_FNS = {
  count_all:       { group: 'Count',        label: 'Count all' },
  count_values:    { group: 'Count',        label: 'Count values',        prop: true },
  count_unique:    { group: 'Count',        label: 'Count unique values', prop: true },
  count_empty:     { group: 'Count',        label: 'Count empty',         prop: true },
  count_not_empty: { group: 'Count',        label: 'Count not empty',     prop: true },
  percent_empty:   { group: 'Percent',      label: 'Percent empty',       prop: true },
  percent_not_empty: { group: 'Percent',    label: 'Percent not empty',   prop: true },
  sum:             { group: 'More options', label: 'Sum',     prop: 'number' },
  avg:             { group: 'More options', label: 'Average', prop: 'number' },
  median:          { group: 'More options', label: 'Median',  prop: 'number' },
  min:             { group: 'More options', label: 'Min',     prop: 'number' },
  max:             { group: 'More options', label: 'Max',     prop: 'number' },
  range:           { group: 'More options', label: 'Range',   prop: 'number' },
  earliest:        { group: 'Date',         label: 'Earliest date', prop: 'date' },
  latest:          { group: 'Date',         label: 'Latest date',   prop: 'date' },
  date_range:      { group: 'Date',         label: 'Date range',    prop: 'date' },
};
const NUMERIC_TYPES = ['number', 'formula', 'rollup', 'id', 'streak'];
const DATE_TYPES = ['date', 'created_time', 'edited_time', 'formula'];
const propKind = key => {
  if (key === 'experiments') return 'number';
  if (key === 'due') return 'date';
  const cp = customDef(key);
  if (!cp) return 'other';
  if (['number', 'id', 'streak', 'rollup'].includes(cp.type)) return 'number';
  if (['date', 'created_time', 'edited_time'].includes(cp.type)) return 'date';
  if (cp.type === 'formula') return 'any';
  return 'other';
};
function computeAgg(cards, agg) {
  const def = AGG_FNS[agg?.fn] || AGG_FNS.count_all;
  if (!agg || agg.fn === 'count_all' || !agg.prop) return String(cards.length);
  const vals = cards.map(b => agg.prop === '__title' ? b.title : rawValue(b, agg.prop));
  const filled = vals.filter(v => !isEmptyVal(v) && !(v instanceof Error));
  const nums = filled.map(v => typeof v === 'number' ? v : Number(v)).filter(x => !isNaN(x));
  const dates = filled.filter(v => v instanceof Date).map(d => d.getTime());
  const pct = n => cards.length ? Math.round(n / cards.length * 100) + ' %' : '—';
  const r2 = x => (Math.round(x * 100) / 100).toLocaleString(LOCALE());
  const short = t => new Date(t).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' });
  switch (agg.fn) {
    case 'count_values': return String(filled.reduce((n, v) => n + (Array.isArray(v) ? v.length : 1), 0));
    case 'count_unique': return String(new Set(filled.flat().map(v => v instanceof Date ? v.getTime() : String(v))).size);
    case 'count_empty': return String(cards.length - filled.length);
    case 'count_not_empty': return String(filled.length);
    case 'percent_empty': return pct(cards.length - filled.length);
    case 'percent_not_empty': return pct(filled.length);
    case 'sum': return r2(nums.reduce((t, x) => t + x, 0));
    case 'avg': return nums.length ? r2(nums.reduce((t, x) => t + x, 0) / nums.length) : '—';
    case 'median': { if (!nums.length) return '—'; const o = [...nums].sort((a, z) => a - z), m = o.length >> 1; return r2(o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2); }
    case 'min': return nums.length ? r2(Math.min(...nums)) : '—';
    case 'max': return nums.length ? r2(Math.max(...nums)) : '—';
    case 'range': return nums.length ? r2(Math.max(...nums) - Math.min(...nums)) : '—';
    case 'earliest': return dates.length ? short(Math.min(...dates)) : '—';
    case 'latest': return dates.length ? short(Math.max(...dates)) : '—';
    case 'date_range': return dates.length ? `${Math.round((Math.max(...dates) - Math.min(...dates)) / DAY)} j` : '—';
  }
  return String(cards.length);
}
const aggLabel = agg => {
  if (!agg || agg.fn === 'count_all') return 'Count all';
  const p = agg.prop === '__title' ? 'Name' : propDef(agg.prop)?.label || '?';
  return `${AGG_FNS[agg.fn].label} · ${p}`;
};

// ---------- Tri et filtres sur n'importe quelle propriété ----------
function sortValue(b, key) {
  if (key === 'title') return (b.title || '').toLowerCase();
  if (key === 'status') return STATUSES.findIndex(st => st.key === statusOf(b));
  if (key === 'group') return GROUPS.findIndex(g => g.key === groupOf(b));
  const cp = customDef(key);
  if (cp && ['select', 'status'].includes(cp.type)) { const i = cp.options.findIndex(o => o.id === b.props?.[key]); return i < 0 ? Infinity : i; }
  const v = rawValue(b, key);
  if (v instanceof Date) return v.getTime();
  if (Array.isArray(v)) return v.join(', ').toLowerCase();
  if (typeof v === 'boolean') return v ? 0 : 1;
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || v === '' || v instanceof Error) return Infinity;
  return String(v).toLowerCase();
}
const filterChoices = key => {
  if (key === 'group') return GROUPS.map(g => ({ id: g.key, html: `<span class="n-pill c-${g.color}" style="border-radius:4px">${esc(g.label)}</span>` }));
  if (key === 'status') return STATUSES.map(st => ({ id: st.key, html: pill(st) }));
  const cp = customDef(key);
  if (cp && PROP_TYPES[cp.type].options) return cp.options.map(o => ({ id: o.id, html: optPillHTML(o) }));
  if (cp && cp.type === 'checkbox') return [{ id: 'checked', html: 'Coché' }, { id: 'unchecked', html: 'Non coché' }];
  return [{ id: 'notempty', html: 'Non vide' }, { id: 'empty', html: 'Vide' }];
};
function matchFilter(b, key, sel) {
  if (!sel?.length) return true;
  if (key === 'group') return sel.includes(groupOf(b));
  if (key === 'status') return sel.includes(statusOf(b));
  const cp = customDef(key);
  if (cp && PROP_TYPES[cp.type].options) { const v = b.props?.[key]; const ids = Array.isArray(v) ? v : [v]; return sel.some(x => ids.includes(x)); }
  if (cp && cp.type === 'checkbox') return sel.includes(b.props?.[key] ? 'checked' : 'unchecked');
  const v = rawValue(b, key);
  return sel.includes(isEmptyVal(v) || v instanceof Error ? 'empty' : 'notempty');
}
const activeFilters = view => ({ ...view.cf, ...(view.groups.length ? { group: view.groups } : {}), ...(view.statuses.length ? { status: view.statuses } : {}) });
const countFilters = view => Object.values(activeFilters(view)).reduce((n, a) => n + (a?.length || 0), 0);

function orderedStatuses(view) {
  const known = view.order.map(statusDef).filter(Boolean);
  return [...known, ...STATUSES.filter(st => !view.order.includes(st.key))];
}

// Rang manuel d'une carte dans sa colonne (glisser-déposer) ; à défaut, sa date de création
const rankOf = b => b.rank ?? b.createdAt ?? 0;

function sortedVisions(view) {
  const filters = activeFilters(view);
  let list = Store.list().filter(b => Object.entries(filters).every(([k, sel]) => matchFilter(b, k, sel)));
  if (view.sort === 'manual') list.sort((a, z) => rankOf(a) - rankOf(z));
  else if (view.sort === 'title' || propDef(view.sort)) {
    list.sort((a, z) => {
      const x = sortValue(a, view.sort), y = sortValue(z, view.sort);
      if (x === y) return 0;
      if (x === Infinity) return 1;
      if (y === Infinity) return -1;
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fr');
    });
    if (view.sortDir === 'desc') list.reverse();
  }
  return list;
}
