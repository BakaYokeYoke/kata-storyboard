/* Suivi des indicateurs : mesures datées de l'Outcome metric et de la Process metric,
   graphique (courbe + ligne de la Target Condition), tableau des mesures. */

const METRICS = [
  { key: 'outcome', label: 'Outcome metric' },
  { key: 'process', label: 'Process metric' },
];
const emptyMetric = () => ({ target: null, unit: '', better: 'up', points: [] });

function renderMetrics() {
  const root = $('#metrics');
  if (!root || !board) return;
  board.metrics ||= {};
  METRICS.forEach(m => { board.metrics[m.key] ||= emptyMetric(); });
  root.innerHTML = `
    <h2 class="mt-title">Suivi des indicateurs</h2>
    <div class="mt-grid">
      ${METRICS.map(m => {
        const d = board.metrics[m.key];
        return `
          <section class="mt-card" data-metric="${m.key}">
            <header class="mt-head">
              <div>
                <h3>${m.label}</h3>
                <div class="mt-sub">${esc(board.target?.[m.key] ? `Cible : ${board.target[m.key]}` : 'Décrivez la cible dans la Target Condition')}</div>
              </div>
              <div class="mt-cfg">
                <label>Cible <input type="number" step="any" data-mk="target" value="${esc(d.target ?? '')}" placeholder="—"></label>
                <label>Unité <input data-mk="unit" value="${esc(d.unit || '')}" placeholder="min, %, …"></label>
                <button class="mt-better" data-mk-better title="Sens d'amélioration">${d.better === 'down' ? '↓ plus bas = mieux' : '↑ plus haut = mieux'}</button>
              </div>
            </header>
            <div class="mt-chart" data-chart="${m.key}"></div>
            <details class="mt-table" ${d.points.length ? '' : 'open'}>
              <summary>Mesures (${d.points.length})</summary>
              <table>
                <thead><tr><th>Date</th><th>Valeur${d.unit ? ` (${esc(d.unit)})` : ''}</th><th>Note</th><th></th></tr></thead>
                <tbody>
                  ${[...d.points].sort((a, z) => z.date.localeCompare(a.date)).map(p => `
                    <tr data-pt="${p.id}">
                      <td><input type="date" data-pk="date" value="${esc(p.date)}"></td>
                      <td><input type="number" step="any" data-pk="value" value="${esc(p.value)}"></td>
                      <td><input data-pk="note" value="${esc(p.note || '')}" placeholder="—"></td>
                      <td><button class="icon del" title="Supprimer la mesure">✕</button></td>
                    </tr>`).join('')}
                  <tr class="mt-new">
                    <td><input type="date" data-new="date" value="${localISO()}"></td>
                    <td><input type="number" step="any" data-new="value" placeholder="Valeur"></td>
                    <td><input data-new="note" placeholder="Note (facultatif)"></td>
                    <td><button class="mt-add" title="Ajouter la mesure">＋</button></td>
                  </tr>
                </tbody>
              </table>
            </details>
          </section>`;
      }).join('')}
    </div>`;

  root.querySelectorAll('[data-metric]').forEach(sec => {
    const key = sec.dataset.metric, d = board.metrics[key];
    const redraw = () => { scheduleSave(); drawMetricChart(sec.querySelector('.mt-chart'), d, METRICS.find(m => m.key === key).label); };
    sec.querySelectorAll('[data-mk]').forEach(inp => inp.oninput = () => {
      d[inp.dataset.mk] = inp.dataset.mk === 'target' ? (inp.value === '' ? null : Number(inp.value)) : inp.value;
      redraw();
    });
    sec.querySelector('[data-mk-better]').onclick = () => { d.better = d.better === 'down' ? 'up' : 'down'; scheduleSave(); renderMetrics(); };
    sec.querySelectorAll('[data-pt]').forEach(tr => {
      const p = d.points.find(x => x.id === tr.dataset.pt);
      tr.querySelectorAll('[data-pk]').forEach(inp => inp.oninput = () => { p[inp.dataset.pk] = inp.dataset.pk === 'value' ? Number(inp.value) : inp.value; redraw(); });
      tr.querySelector('.del').onclick = () => { d.points = d.points.filter(x => x !== p); scheduleSave(); renderMetrics(); };
    });
    const add = () => {
      const date = sec.querySelector('[data-new="date"]').value, value = sec.querySelector('[data-new="value"]').value;
      if (!date || value === '') return sec.querySelector('[data-new="value"]').focus();
      d.points.push({ id: uid(), date, value: Number(value), note: sec.querySelector('[data-new="note"]').value });
      scheduleSave(); renderMetrics();
      $(`[data-metric="${key}"] [data-new="value"]`)?.focus();
    };
    sec.querySelector('.mt-add').onclick = add;
    sec.querySelectorAll('[data-new]').forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') add(); });
    drawMetricChart(sec.querySelector('.mt-chart'), d, METRICS.find(m => m.key === key).label);
  });
}

// Graduations « rondes » (1, 2, 5 × 10^n)
function niceTicks(lo, hi, count = 4) {
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map(s => s * mag).find(s => raw <= s) || mag * 10;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

// Courbe d'un indicateur : trait 2 px, points 8 px, ligne de cible pointillée, dernière valeur étiquetée, infobulle
function drawMetricChart(el, d, label) {
  if (!el) return;
  const pts = d.points.filter(p => p.date && isFinite(p.value)).map(p => ({ ...p, t: new Date(p.date + 'T00:00').getTime() })).sort((a, z) => a.t - z.t);
  if (!pts.length) { el.innerHTML = `<div class="mt-empty">Aucune mesure : ajoutez-en une ci-dessous pour voir la courbe.</div>`; return; }
  const W = Math.max(280, el.clientWidth || 560), H = 190, L = 40, R = 70, T = 22, B = 26;
  let x0 = pts[0].t, x1 = pts.at(-1).t;
  if (x0 === x1) { x0 -= 3 * DAY; x1 += 3 * DAY; }
  const hasTarget = d.target !== null && d.target !== '' && isFinite(d.target);
  const vals = pts.map(p => p.value).concat(hasTarget ? [Number(d.target)] : []);
  let y0 = Math.min(...vals), y1 = Math.max(...vals);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.15; y0 -= pad; y1 += pad;
  const X = t => L + (t - x0) / (x1 - x0) * (W - L - R);
  const Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const fmtV = v => `${Number(v).toLocaleString(LOCALE(), { maximumFractionDigits: 2 })}${d.unit ? ' ' + d.unit : ''}`;
  const fmtD = t => new Date(t).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' });
  const fmtN = v => Number(v).toLocaleString(LOCALE(), { maximumFractionDigits: 2 });
  const ticks = niceTicks(y0, y1);
  const xTicks = pts.length > 2 ? [pts[0].t, pts[Math.floor(pts.length / 2)].t, pts.at(-1).t] : pts.map(p => p.t);
  const last = pts.at(-1);
  const reached = hasTarget && (d.better === 'down' ? last.value <= d.target : last.value >= d.target);
  // Étiquettes de droite : on écarte « dernière valeur » et « cible » si elles se chevauchent
  let yLast = Y(last.value) - 8, yTarget = hasTarget ? Y(d.target) + 4 : null;
  if (hasTarget && Math.abs(yLast - yTarget) < 14) { if (Y(last.value) <= Y(d.target)) { yLast = Y(d.target) - 10; yTarget = Y(d.target) + 14; } else { yLast = Y(d.target) + 18; yTarget = Y(d.target) - 6; } }
  el.innerHTML = `
    <svg width="${W}" height="${H}" role="img" aria-label="${esc(label)} : ${pts.length} mesures, dernière ${esc(fmtV(last.value))}${hasTarget ? `, cible ${esc(fmtV(d.target))}` : ''}">
      ${d.unit ? `<text x="${L - 6}" y="10" class="mt-axis" text-anchor="start">${esc(d.unit)}</text>` : ''}
      ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="mt-grid-line"/><text x="${L - 6}" y="${Y(v) + 4}" class="mt-axis" text-anchor="end">${v.toLocaleString(LOCALE())}</text>`).join('')}
      ${[...new Set(xTicks)].map(t => `<text x="${X(t)}" y="${H - 6}" class="mt-axis" text-anchor="middle">${fmtD(t)}</text>`).join('')}
      ${hasTarget ? `<line x1="${L}" x2="${W - R}" y1="${Y(d.target)}" y2="${Y(d.target)}" class="mt-target"/>
        <text x="${W - R + 6}" y="${yTarget}" class="mt-target-label">Cible ${esc(fmtN(d.target))}</text>` : ''}
      <path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ')}" class="mt-line"/>
      ${pts.map(p => `<circle cx="${X(p.t)}" cy="${Y(p.value)}" r="4" class="mt-dot"/>`).join('')}
      <text x="${X(last.t) + 8}" y="${yLast}" class="mt-last">${esc(fmtN(last.value))}${reached ? ' ✓' : ''}</text>
      <line class="mt-cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
      <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" class="mt-hit"/>
    </svg>
    <div class="mt-tip" hidden></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.mt-tip'), cross = el.querySelector('.mt-cross');
  el.querySelector('.mt-hit').onmousemove = e => {
    const x = e.clientX - svg.getBoundingClientRect().left;
    const p = pts.reduce((a, z) => Math.abs(X(z.t) - x) < Math.abs(X(a.t) - x) ? z : a);
    cross.setAttribute('x1', X(p.t)); cross.setAttribute('x2', X(p.t)); cross.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${esc(fmtV(p.value))}</b><span>${esc(new Date(p.t).toLocaleDateString(LOCALE(), { dateStyle: 'medium' }))}</span>${p.note ? `<span>${esc(p.note)}</span>` : ''}${hasTarget ? `<span>Écart à la cible : ${esc(fmtV(Math.round((p.value - d.target) * 100) / 100))}</span>` : ''}`;
    tip.style.left = Math.min(X(p.t) + 10, W - 170) + 'px';
    tip.style.top = Math.max(0, Y(p.value) - 20) + 'px';
  };
  el.querySelector('.mt-hit').onmouseleave = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); };
}
// Redessine les courbes à la bonne largeur quand la page change de taille
addEventListener('resize', () => { if (board && $('#metrics')) METRICS.forEach(m => drawMetricChart($(`[data-chart="${m.key}"]`), board.metrics[m.key], m.label)); });
