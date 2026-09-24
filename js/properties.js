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
};

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
  `<i class="${c.done ? 'on' : ''} ${c.current ? 'cur' : ''}" ${clickable ? `data-streak-cell="${c.key}"` : ''} title="${new Date(c.start).toLocaleDateString('fr-FR')}${c.done ? ' · réussi' : ''}"></i>`).join('')}</span>`;
const DEFAULT_OPTIONS = {
  status: () => [{ id: uid(), label: 'Not started', color: 'gray' }, { id: uid(), label: 'In progress', color: 'blue' }, { id: uid(), label: 'Done', color: 'green' }],
  person: () => [{ id: uid(), label: 'Moi', color: 'gray' }],
};
const ME = 'Moi';

const CUSTOM_KEY = 'kata-props';
function loadCustomProps() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; } catch (e) { return []; } }
let CUSTOM_PROPS = loadCustomProps();
function saveCustomProps() { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(CUSTOM_PROPS)); } catch (e) {} }
const customDef = k => CUSTOM_PROPS.find(p => p.key === k);
const allProps = () => [...BUILTIN_PROPS, ...CUSTOM_PROPS.map(p => ({ key: p.key, label: p.name, icon: PROP_TYPES[p.type].icon, kind: 'custom' }))];
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

const isEmptyVal = v => v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'number' && isNaN(v));
const fmtDay = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = d => d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  }
  const cp = customDef(key);
  if (!cp) return null;
  const v = b.props?.[key];
  switch (cp.type) {
    case 'number': return v === '' || v === undefined || v === null ? null : Number(v);
    case 'select': case 'status': return optOf(cp, v)?.label || '';
    case 'multi': case 'person': return (v || []).map(id => optOf(cp, id)?.label).filter(Boolean);
    case 'date': return toDate(v);
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

// HTML d'une valeur ('' si vide). ctx : 'card' (pastilles du Kanban) ou 'page' (page ouverte)
function valueHTML(b, key, ctx = 'card') {
  const chip = (t, cls = '') => ctx === 'card' ? `<span class="n-chip ${cls}">${t}</span>` : t;
  const fmt = v => v instanceof Error ? `<span class="err">Erreur : ${esc(v.message)}</span>`
    : v instanceof Date ? esc(fmtDay(v)) : typeof v === 'boolean' ? (v ? '☑' : '☐')
    : Array.isArray(v) ? esc(v.join(', ')) : typeof v === 'number' ? esc(v.toLocaleString('fr-FR')) : esc(v ?? '');
  switch (key) {
    case 'status': return pill(statusDef(statusOf(b))).replace('n-pill', ctx === 'card' ? 'n-pill small' : 'n-pill');
    case 'group': { const g = groupDef(groupOf(b)); return `<span class="n-pill ${ctx === 'card' ? 'small' : ''} c-${g.color}" style="border-radius:4px">${esc(g.label)}</span>`; }
    case 'challenge': case 'focus': { const v = rawValue(b, key); return v ? esc(v) : ''; }
    case 'due': { const d = rawValue(b, key); return d ? chip(`🎯 ${esc(fmtDay(d))}`) : ''; }
    case 'obstacle': { const v = rawValue(b, key); return v ? chip(`➜ ${esc(v)}`, 'obs') : ''; }
    case 'experiments': { const n = rawValue(b, key); return n ? chip(`${n} exp.`) : ''; }
    case 'step': { const v = rawValue(b, key); return v ? chip(v === 'Kata' ? '● Kata' : '▶ Run en cours') : ''; }
  }
  const cp = customDef(key);
  if (!cp) return '';
  const v = b.props?.[key];
  switch (cp.type) {
    case 'select': case 'status': return optPillHTML(optOf(cp, v));
    case 'multi': case 'person': return (v || []).map(id => optPillHTML(optOf(cp, id))).join('');
    case 'checkbox': return v ? (ctx === 'card' ? chip(`☑ ${esc(cp.name)}`) : '☑') : '';
    case 'date': return v ? chip(esc(fmtDay(toDate(v)))) : '';
    case 'url': return v ? chip(`<a href="${esc(/^https?:/.test(v) ? v : 'https://' + v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, ''))}</a>`) : '';
    case 'email': return v ? chip(`<a href="mailto:${esc(v)}">${esc(v)}</a>`) : '';
    case 'phone': return v ? chip(`<a href="tel:${esc(v)}">${esc(v)}</a>`) : '';
    case 'files': return (v || []).map(f => chip(f.fileId
      ? `📎 <a href="#" data-file-id="${esc(f.fileId)}">${esc(f.name)}</a>`
      : `📎 <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>`)).join(ctx === 'card' ? '' : ' ');
    case 'relation': return (v || []).map(id => Store.get(id)).filter(Boolean).map(c => chip(`↗ ${esc(c.title || 'Sans titre')}`)).join(ctx === 'card' ? '' : ' ');
    case 'created_time': case 'edited_time': { const d = rawValue(b, key); return d ? chip(esc(fmtDateTime(d))) : ''; }
    case 'created_by': case 'edited_by': return chip(ME);
    case 'id': return b.seq != null ? chip(`${esc(cp.prefix || '')}${b.seq}`) : '';
    case 'streak': { const sd = streakData(b, cp); return ctx === 'card' ? `<span class="n-chip streak-chip" title="${esc(cp.name)} : ${sd.hits}/${sd.n} · série en cours ${sd.current}">${streakHTML(sd)}</span>` : streakHTML(sd); }
    case 'formula': case 'rollup': case 'number': { const r = rawValue(b, key); return isEmptyVal(r) && !(r instanceof Error) ? '' : chip(fmt(r)); }
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
  const r2 = x => (Math.round(x * 100) / 100).toLocaleString('fr-FR');
  const short = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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

// Nom du Kanban : modifiable, repris dans le fil d'Ariane et l'onglet du navigateur.
const TITLE_KEY = 'kata-board-title';
const boardTitle = () => { try { return localStorage.getItem(TITLE_KEY) || 'Visions'; } catch (e) { return 'Visions'; } };

function renderKanban() {
  document.title = boardTitle();
  document.body.classList.add('kanban-page');
  if (!Store.list().length && !localStorage.getItem('kata-demo-seeded')) seedDemo();
  if (!Templates.list().length) seedTemplates();
  runRecurringTemplates();
  migrateVisions();

  const view = loadView();
  const visions = sortedVisions(view);
  const inCell = (st, g) => visions.filter(b => statusOf(b) === st && (!g || groupOf(b) === g));
  let cols = orderedStatuses(view).filter(s => !view.hidden.includes(s.key));
  if (view.hideEmptyCols) cols = cols.filter(s => inCell(s.key).length);
  const hiddenCols = orderedStatuses(view).filter(s => view.hidden.includes(s.key));
  let rows = view.subgroups ? GROUPS.filter(g => !view.hiddenSub.includes(g.key)) : [null];
  if (view.subgroups && view.hideEmptySub) rows = rows.filter(g => visions.some(b => groupOf(b) === g.key));
  const nCols = Math.max(1, cols.length + (hiddenCols.length ? 1 : 0));


  // Une case = une colonne × un sous-groupe (g = null : toute la colonne, sans séparation).
  // Contrôle discret « réel / standard » : WIP (nombre de cartes) et Aging (jours dans la colonne)
  const checker = (st, cards) => {
    const std = view.std[st.key] || {};
    if (!std.wip && !std.aging) return '';
    const age = cards.length ? Math.max(...cards.map(ageDays)) : 0;
    const wipOver = std.wip && cards.length > std.wip, ageOver = std.aging && age > std.aging;
    return `<div class="n-check ${wipOver || ageOver ? 'over' : ''}" title="Réel / standard">
      ${std.wip ? `<span class="${wipOver ? 'bad' : ''}">WIP ${cards.length}/${std.wip}</span>` : ''}
      ${std.aging ? `<span class="${ageOver ? 'bad' : ''}">Aging ${age} j/${std.aging} j</span>` : ''}
    </div>`;
  };
  const cell = (st, g, style) => `
    <div class="n-cell c-${st.color}" style="${style}" data-status="${st.key}" data-group="${g ? g.key : ''}">
      ${checker(st, inCell(st.key, g?.key))}
      ${inCell(st.key, g?.key).map(b => visionCard(b, view.props, view.std[st.key]?.aging)).join('')}
      ${view.noCreate.includes(st.key) ? '' : `<button class="n-add" data-new="${st.key}" data-group="${g ? g.key : GROUPS[0].key}">${icon('plus')} New page</button>`}
    </div>`;
  const unsplit = st => view.subgroups && view.unsplit.includes(st.key);

  // Placement explicite : ligne 1 = en-têtes, puis (titre de sous-groupe + cases) par groupe.
  // Les colonnes non séparées forment une seule case qui traverse tous les sous-groupes.
  let rowNo = 2, groupsHTML = '';
  rows.forEach(g => {
    if (!g) {
      groupsHTML += cols.map((st, i) => cell(st, null, `grid-row:${rowNo};grid-column:${i + 1}`)).join('');
      rowNo++;
      return;
    }
    const collapsed = view.collapsed.includes(g.key);
    const n = visions.filter(b => groupOf(b) === g.key).length;
    groupsHTML += `
      <div class="n-group ${collapsed ? 'collapsed' : ''}" style="grid-row:${rowNo}">
        <button class="toggle" data-toggle="${g.key}" title="${collapsed ? 'Déplier' : 'Replier'}">${icon('tri')}</button>
        <span class="n-pill c-${g.color}" data-group-rename="${g.key}" title="Double-clic pour renommer">${esc(g.label)}</span>${view.subAgg ? `<span class="n-count">${n}</span>` : ''}
        <span class="n-group-tools">
          <button class="n-icon-btn" data-group-more="${g.key}" title="Options du groupe">${icon('dots')}</button>
          <button class="n-icon-btn" data-group-add="${g.key}" title="Nouvelle page">${icon('plus')}</button>
        </span>
      </div>`;
    rowNo++;
    if (!collapsed) {
      groupsHTML += cols.map((st, i) => unsplit(st) ? '' : cell(st, g, `grid-row:${rowNo};grid-column:${i + 1}`)).join('');
      rowNo++;
    }
  });
  if (view.subgroups && rows.length) {
    const from = 3, to = Math.max(rowNo, from + 1);   // de la 1re ligne de cases jusqu'à la dernière
    groupsHTML += cols.map((st, i) => unsplit(st) ? cell(st, null, `grid-row:${from} / ${to};grid-column:${i + 1}`) : '').join('');
  }

  const nFilters = countFilters(view);
  $('#app').innerHTML = `
    <header class="n-topbar">
      <span class="n-crumb">${icon('doc')}<span id="crumbTitle">${esc(boardTitle() || 'Sans titre')}</span></span>
      <span class="spacer"></span>
      <button class="n-icon-btn" id="pageMore" title="Plus d'actions">${icon('dots')}</button>
    </header>
    <div class="n-page">
      <div class="backup-banner" id="backupBanner" hidden></div>
      <h1 class="n-title" id="boardTitle" contenteditable="true" spellcheck="false" data-placeholder="Sans titre">${esc(boardTitle())}</h1>
      <div class="n-bar">
        <span class="spacer"></span>
        <button class="n-icon-btn ${nFilters ? 'active' : ''}" id="btnFilter" title="Filtrer">${icon('filter')}</button>
        <button class="n-icon-btn ${view.sort !== 'manual' ? 'active' : ''}" id="btnSort" title="Trier">${icon('sort')}</button>
        <span class="n-search" id="search"><button class="n-icon-btn" id="btnSearch" title="Rechercher">${icon('search')}</button><input id="searchInput" placeholder="Rechercher…"></span>
        <button class="n-icon-btn ${panelPage ? 'on' : ''}" id="btnSettings" title="Paramètres de la vue">${icon('sliders')}</button>
        <div class="n-new">
          <button class="main" id="newMain" title="Nouvelle Vision (template par défaut)">New</button>
          <button class="caret" id="newCaret" title="Choisir un template">${icon('chevron')}</button>
          <div class="n-menu" id="tplMenu" hidden></div>
        </div>
      </div>
      <div class="n-board-wrap">
        <div class="n-board ${view.colorCols ? '' : 'nocolor'}" style="grid-template-columns: repeat(${nCols}, 276px)">
          ${cols.map(st => `
            <div class="n-head c-${st.color}">
              ${pill(st)}<button class="n-count n-agg" data-agg="${st.key}" title="${esc(aggLabel(view.agg[st.key]))}">${esc(computeAgg(inCell(st.key), view.agg[st.key]))}</button>
              <span class="n-head-tools">
                <button class="n-icon-btn" data-col-more="${st.key}" title="Options du groupe">${icon('dots')}</button>
                ${view.noCreate.includes(st.key) ? '' : `<button class="n-icon-btn" data-col-add="${st.key}" title="Nouvelle page">${icon('plus')}</button>`}
              </span>
            </div>`).join('')}
          ${hiddenCols.length ? `
            <div class="n-head hidden-groups">
              <div class="n-hidden-label">Groupes masqués</div>
              ${hiddenCols.map(st => `<div class="n-hidden-row c-${st.color}" data-unhide="${st.key}" title="Afficher">${pill(st)}<span class="n-count">${inCell(st.key).length}</span></div>`).join('')}
            </div>` : ''}
          ${groupsHTML}
          ${view.subgroups ? `<div class="n-newgroup" id="newGroup" style="grid-row:${rowNo}">${icon('plus')} New group</div>` : ''}
        </div>
      </div>
    </div>
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" aria-hidden="true">
      <div class="peek-top">
        <button class="n-icon-btn" id="drawerClose" title="Fermer (Échap)">${icon('close')}</button>
        <button class="n-icon-btn" id="peekExpand" title="Agrandir" hidden>${icon('expand')}</button>
        <span class="spacer"></span>
        <button class="n-icon-btn" id="peekMore" title="Plus d'actions">${icon('dots')}</button>
      </div>
      <div class="peek-banner" id="peekBanner" hidden></div>
      <div class="peek-head">
        <button class="peek-icon" id="peekIcon" title="Changer l'icône"></button>
        <input class="peek-title" id="peekTitle" placeholder="Sans titre" autocomplete="off">
        <div class="peek-props" id="peekProps"></div>
      </div>
      <div class="sb-root" id="sbRoot"></div>
    </aside>`;

  const app = $('#app');

  const titleEl = $('#boardTitle');
  titleEl.oninput = () => {
    const t = titleEl.textContent.trim();
    try { localStorage.setItem(TITLE_KEY, t); } catch (e) {}
    document.title = t || 'Sans titre';
    $('#crumbTitle').textContent = t || 'Sans titre';
  };
  titleEl.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } };
  titleEl.onblur = () => { if (!titleEl.textContent.trim()) { titleEl.textContent = ''; } };

  // Cartes : ouverture, boutons ✎ / ⋯, glisser-déposer
  app.querySelectorAll('.n-card').forEach(card => {
    const id = card.dataset.id;
    card.onclick = e => { if (!e.target.closest('.n-card-tools, input, [data-card-icon]')) openPeek('vision', id); };
    const ico = card.querySelector('[data-card-icon]');
    if (ico) ico.onclick = e => {
      e.stopPropagation();
      closePop();
      openIconPicker(ico, val => { Store.patch(id, { icon: val }); renderKanban(); });
    };
    card.ondragstart = e => { e.dataTransfer.setData('text/plain', id); card.classList.add('dragging'); };
    card.ondragend = () => { card.classList.remove('dragging'); document.querySelectorAll('.n-drop-line').forEach(l => l.remove()); document.querySelectorAll('.n-cell.drop').forEach(c => c.classList.remove('drop')); };
    card.querySelector('[data-card="rename"]').onclick = e => { e.stopPropagation(); renameInline(card); };
    card.querySelector('[data-card="more"]').onclick = e => {
      e.stopPropagation();
      const b = Store.get(id);
      openPop(e.currentTarget, [
        { icon: 'peek', label: 'Ouvrir en aperçu', onClick: () => openPeek('vision', id) },
        { icon: 'pencil', label: 'Renommer', onClick: () => renameInline(card) },
        { icon: 'copy', label: 'Dupliquer', onClick: () => { duplicateVision(id); renderKanban(); } },
        { sep: true }, { header: 'Déplacer vers' },
        ...STATUSES.map(st => ({ html: pill(st), checked: statusOf(b) === st.key, onClick: () => { setStatus(Store, id, st.key); renderKanban(); } })),
        { sep: true },
        { icon: 'trash', label: 'Supprimer', danger: true, onClick: () => { moveToTrash('vision', id); renderKanban(); } },
      ]);
      card.querySelector('.n-card-tools').classList.add('open');
    };
  });
  // Position d'insertion : avant la première carte dont le milieu est sous le pointeur
  const dropIndex = (cell, y) => {
    const cards = [...cell.querySelectorAll('.n-card:not(.dragging)')];
    const i = cards.findIndex(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return { cards, index: i < 0 ? cards.length : i };
  };
  const clearLine = () => document.querySelectorAll('.n-drop-line').forEach(l => l.remove());
  app.querySelectorAll('.n-cell[data-status]').forEach(cell => {
    cell.ondragover = e => {
      e.preventDefault();
      cell.classList.add('drop');
      const { cards, index } = dropIndex(cell, e.clientY);
      const line = document.querySelector('.n-drop-line') || Object.assign(document.createElement('div'), { className: 'n-drop-line' });
      const before = cards[index] || cell.querySelector('.n-add');
      if (before) cell.insertBefore(line, before); else cell.appendChild(line);
    };
    cell.ondragleave = e => { if (!cell.contains(e.relatedTarget)) { cell.classList.remove('drop'); clearLine(); } };
    cell.ondrop = e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const { cards, index } = dropIndex(cell, e.clientY);
      clearLine();
      setStatus(Store, id, cell.dataset.status, cell.dataset.group ? { group: cell.dataset.group } : {});
      if (view.sort === 'manual') {
        const prev = cards[index - 1] && Store.get(cards[index - 1].dataset.id);
        const next = cards[index] && Store.get(cards[index].dataset.id);
        const rank = prev && next ? (rankOf(prev) + rankOf(next)) / 2
          : prev ? rankOf(prev) + 1000 : next ? rankOf(next) - 1000 : Date.now();
        Store.patch(id, { rank });
      } else if (cards.length) {
        toast('Un tri est actif : retirez-le (Sort → Manuel) pour réordonner à la main');
      }
      renderKanban();
    };
  });
  app.querySelectorAll('[data-new]').forEach(btn => btn.onclick = () => createVision(defaultTemplate(), btn.dataset.new, btn.dataset.group));

  // En-têtes de colonne : ⋯ et +
  app.querySelectorAll('[data-col-add]').forEach(btn => btn.onclick = () => createVision(defaultTemplate(), btn.dataset.colAdd));
  app.querySelectorAll('[data-col-more]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const key = btn.dataset.colMore;
    openPop(btn, [
      // La bascule garde le menu ouvert ; il se ferme en cliquant ailleurs.
      { icon: 'plus', label: 'Création de cartes', switch: !view.noCreate.includes(key), keepOpen: true, onClick: row => {
        const v = loadView();
        const on = v.noCreate.includes(key);
        v.noCreate = on ? v.noCreate.filter(k => k !== key) : [...v.noCreate, key];
        saveView(v); renderKanban();
        row.querySelector('.n-switch').classList.toggle('on', on);
      } },
      ...(view.subgroups ? [{ icon: 'subgroup', label: 'Séparer par sous-groupe', switch: !view.unsplit.includes(key), keepOpen: true, onClick: row => {
        const v = loadView();
        const merged = v.unsplit.includes(key);
        v.unsplit = merged ? v.unsplit.filter(k => k !== key) : [...v.unsplit, key];
        saveView(v); renderKanban();
        row.querySelector('.n-switch').classList.toggle('on', merged);
      } }] : []),
      { header: 'Standards (réel / standard)' },
      { icon: 'stack', label: 'WIP maximum', value: String(view.std[key]?.wip || '—'), onClick: () => {
        const n = prompt('Nombre maximum de cartes dans la colonne (vide = aucun)', view.std[key]?.wip || '');
        if (n === null) return;
        const v = loadView(); v.std[key] = { ...(v.std[key] || {}), wip: parseInt(n, 10) > 0 ? parseInt(n, 10) : undefined }; saveView(v); renderKanban();
      } },
      { icon: 'clockUI', label: 'Aging maximum (jours)', value: String(view.std[key]?.aging || '—'), onClick: () => {
        const n = prompt('Nombre maximum de jours dans la colonne (vide = aucun)', view.std[key]?.aging || '');
        if (n === null) return;
        const v = loadView(); v.std[key] = { ...(v.std[key] || {}), aging: parseInt(n, 10) > 0 ? parseInt(n, 10) : undefined }; saveView(v); renderKanban();
      } },
      { sep: true },
      { icon: 'hide', label: 'Masquer le groupe', onClick: () => { view.hidden.push(key); saveView(view); renderKanban(); } },
    ]);
  });
  app.querySelectorAll('[data-unhide]').forEach(row => row.onclick = () => {
    view.hidden = view.hidden.filter(k => k !== row.dataset.unhide); saveView(view); renderKanban();
  });
  app.querySelectorAll('[data-toggle]').forEach(btn => btn.onclick = () => {
    const k = btn.dataset.toggle;
    view.collapsed = view.collapsed.includes(k) ? view.collapsed.filter(x => x !== k) : [...view.collapsed, k];
    saveView(view); renderKanban();
  });

  // Calcul de colonne : Count / Percent / More options / Date
  app.querySelectorAll('[data-agg]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const col = btn.dataset.agg;
    const setAgg = agg => { const v = loadView(); v.agg[col] = agg; saveView(v); renderKanban(); };
    const cur = view.agg[col] || { fn: 'count_all' };
    const propsFor = kind => [
      ...(kind === true ? [{ key: '__title', label: 'Name', icon: 'text' }] : []),
      ...allProps().filter(p => kind === true || propKind(p.key) === kind || propKind(p.key) === 'any'),
    ];
    const fnMenu = (row, fn) => {
      const def = AGG_FNS[fn];
      if (!def.prop) return setAgg({ fn });
      const list = propsFor(def.prop);
      if (!list.length) return toast(def.prop === 'number' ? 'Aucune propriété numérique' : 'Aucune propriété de date');
      openPop(row, [{ header: def.label + ' — propriété' }, ...list.map(p => ({ icon: p.icon, label: p.label, checked: cur.fn === fn && cur.prop === p.key, onClick: () => setAgg({ fn, prop: p.key }) }))]);
    };
    const groupMenu = (row, group) => openPop(row, Object.entries(AGG_FNS).filter(([, d]) => d.group === group).map(([fn, d]) => ({
      label: d.label, checked: cur.fn === fn, value: d.prop ? '▸' : '', keepOpen: !!d.prop, onClick: r => fnMenu(r || row, fn),
    })));
    openPop(btn, ['Count', 'Percent', 'More options', 'Date'].map(g => ({ label: g, value: '▸', keepOpen: true, onClick: row => groupMenu(row, g) })));
  });

  // Sous-groupes : ⋯, + et « New group »
  app.querySelectorAll('[data-group-add]').forEach(btn => btn.onclick = () => createVision(defaultTemplate(), cols.find(c => !view.noCreate.includes(c.key))?.key || 'incoming', btn.dataset.groupAdd));
  app.querySelectorAll('[data-group-more]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    const g = groupDef(btn.dataset.groupMore);
    const COLOR_NAMES = { default: 'Default', gray: 'Gray', brown: 'Brown', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink', red: 'Red' };
    openPop(btn, [
      { icon: 'subgroup', label: 'Edit groups', onClick: () => openPanel('subgroup') },
      { icon: 'eye', label: view.subAgg ? 'Hide aggregation' : 'Show aggregation', onClick: () => { view.subAgg = !view.subAgg; saveView(view); renderKanban(); } },
      { icon: 'eyeOff', label: 'Hide group', onClick: () => { view.hiddenSub.push(g.key); saveView(view); renderKanban(); } },
      { icon: 'trash', label: 'Move to Trash', onClick: () => {
        if (GROUPS.length === 1) return toast('Il faut garder au moins un groupe');
        const n = Store.list().filter(b => groupOf(b) === g.key).length;
        if (!confirm(`Supprimer le groupe « ${g.label} » ?${n ? ` Ses ${n} carte(s) passeront dans « ${GROUPS.find(x => x !== g).label} ».` : ''}`)) return;
        GROUPS = GROUPS.filter(x => x !== g); saveGroups();
        Store.list().filter(b => b.group === g.key).forEach(b => Store.patch(b.id, { group: GROUPS[0].key }));
        renderKanban();
      } },
      { sep: true },
      { header: 'Colors' },
      ...Object.entries(COLOR_NAMES).map(([c, l]) => ({ html: `<span class="sw c-${c}"></span><span class="name">${l}</span>`, checked: (g.color || 'default') === c, onClick: () => { g.color = c; saveGroups(); renderKanban(); } })),
    ]);
  });
  app.querySelectorAll('[data-group-rename]').forEach(pl => pl.ondblclick = () => {
    const g = groupDef(pl.dataset.groupRename);
    const name = prompt('Nom du groupe', g.label);
    if (name && name.trim()) { g.label = name.trim(); saveGroups(); renderKanban(); }
  });
  const newGroup = $('#newGroup');
  if (newGroup) newGroup.onclick = e => {
    e.stopPropagation();
    if (newGroup.querySelector('input')) return;
    newGroup.innerHTML = `${icon('plus')}<input placeholder="Nom du groupe" autocomplete="off">`;
    const input = newGroup.querySelector('input');
    input.focus();
    let done = false;
    const commit = save => {
      if (done) return; done = true;
      const label = input.value.trim();
      if (save && label) {
        const used = GROUPS.map(g => g.color);
        GROUPS.push({ key: 'g-' + uid(), label, color: GROUP_COLORS.find(c => !used.includes(c)) || 'gray' });
        saveGroups();
      }
      renderKanban();
    };
    input.onkeydown = ev => { if (ev.key === 'Enter') commit(true); if (ev.key === 'Escape') { ev.stopPropagation(); commit(false); } };
    input.onblur = () => commit(true);
  };

  // Barre d'outils : filtre, tri et réglages ouvrent le panneau « View settings »
  const togglePanel = page => e => { e.stopPropagation(); closePop(); panelPage === page ? closePanel() : openPanel(page); };
  $('#btnFilter').onclick = togglePanel('filter');
  $('#btnSort').onclick = togglePanel('sort');
  $('#btnSettings').onclick = togglePanel('root');
  $('#btnSearch').onclick = e => {
    e.stopPropagation();
    $('#search').classList.add('open');
    $('#searchInput').focus();
  };
  $('#searchInput').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    app.querySelectorAll('.n-card').forEach(c => c.classList.toggle('hidden-by-search', !!q && !c.innerText.toLowerCase().includes(q)));
  };
  $('#searchInput').onblur = e => { if (!e.target.value) $('#search').classList.remove('open'); };
  $('#pageMore').onclick = e => {
    e.stopPropagation();
    const anchor = e.currentTarget;
    const nTrash = Trash.list().length;
    openPop(anchor, [
      { icon: 'reset', label: 'Annuler', value: '⌘Z', onClick: undo },
      { icon: 'repeat', label: 'Rétablir', value: '⇧⌘Z', onClick: redo },
      { sep: true },
      { icon: 'trash', label: 'Corbeille', value: nTrash ? String(nTrash) : '', keepOpen: true, onClick: () => openTrashMenu(anchor) },
      { icon: 'clockUI', label: 'Sauvegardes internes…', keepOpen: true, onClick: () => openBackupsMenu(anchor) },
      ...(window.showSaveFilePicker ? [fileBackupState === 'on'
        ? { icon: 'db', label: 'Sauvegarde automatique : activée', value: 'Arrêter', onClick: stopFileBackup }
        : { icon: 'db', label: 'Sauvegarde automatique dans un fichier…', onClick: setupFileBackup }] : []),
      { icon: 'download', label: 'Exporter (JSON)', onClick: exportAll },
      { icon: 'clip', label: 'Importer (JSON)…', onClick: importData },
      { sep: true },
      { icon: 'reset', label: 'Réinitialiser la démo', danger: true, onClick: resetDemo },
    ]);
  };

  $('#newMain').onclick = () => createVision(defaultTemplate());
  $('#newCaret').onclick = e => { e.stopPropagation(); closePop(); closePanel(); toggleTemplateMenu(); };

  $('#scrim').onclick = closePeek;
  $('#drawerClose').onclick = closePeek;
  document.onclick = () => { $('#tplMenu').hidden = true; closeIconPicker(); closePop(); closePanel(); };
  document.onkeydown = e => {
    if (e.key !== 'Escape') return;
    if ($('#nPop') || !$('#tplMenu').hidden || $('#iconPicker')) { closePop(); $('#tplMenu').hidden = true; closeIconPicker(); return; }
    if (panelPage) return closePanel();
    closePeek();
  };

  if (panelPage) renderPanel();
  recordSnapshot();
  renderBackupBanner();
  if (!renderKanban.started) {
    renderKanban.started = true;
    purgeTrash();
    dailyBackup();
    migrateFilesToIDB();
    IDB.get('meta', 'backupHandle').then(h => { if (h) writeFileBackup(false); }).catch(() => {});
  }
}
