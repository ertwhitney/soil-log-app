// Soil Log app: tablet field entry -> Form F (SS1) + Ch. 241 Profile/Condition PDF.
import * as V from './vocab.js';
import * as M from './model.js';
import { load, save, exportProject, readProjectFile, download } from './store.js';
import { buildPages } from './formf.js';
import { toSvg } from './svg.js';
import { buildPdf } from './pdf.js';

const S = load();
const ui = { openHz: null, showPreview: window.innerWidth >= 1100 };
const app = document.getElementById('app');

// ---------------------------------------------------------------- helpers
const e = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const route = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
const go = h => { location.hash = h; };
const proj = () => { const r = route(); return r[0] === 'p' ? S.projects.find(p => p.id === r[1]) : null; };
const pit = () => { const r = route(); const p = proj(); return p && r[2] === 't' ? p.pits.find(t => t.id === r[3]) : null; };
const touch = () => { const p = proj(); if (p) p.updated = Date.now(); save(S); };
const imgs = () => ({ signature: S.settings.signature?.url, seal: S.settings.seal?.url });

function target(path) {
  const parts = path.split('.');
  if (parts[0] === 'proj') return [proj(), parts[1]];
  if (parts[0] === 'pit') return [pit(), parts[1]];
  if (parts[0] === 'set') return [S.settings, parts[1]];
  if (parts[0] === 'hz') return [pit()?.horizons.find(h => h.id === parts[1]), parts[2]];
  return [null, null];
}

function chips(path, opts, current, { toggle = true, cls = '', title } = {}) {
  return `<div class="chips ${cls}">${opts.map(o => {
    const [val, label, tip] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" class="chip${String(current) === String(val) ? ' on' : ''}" data-act="set" data-path="${path}" data-val="${e(val)}"${toggle ? ' data-toggle="1"' : ''}${tip || title ? ` title="${e(tip || title)}"` : ''}>${e(label)}</button>`;
  }).join('')}</div>`;
}
// <div>, not <label>: a label would forward taps on empty space to its first chip button.
const field = (label, inner, cls = '') => `<div class="field ${cls}"><span>${label}</span>${inner}</div>`;
const input = (path, val, attrs = '') => `<input data-bind="${path}" value="${e(val)}" ${attrs}>`;
const numIn = (path, val, attrs = '') => input(path, val, `inputmode="decimal" autocomplete="off" ${attrs}`);

// ---------------------------------------------------------------- views
function render() {
  const r = route();
  const y = window.scrollY;
  if (r[0] === 'settings') app.innerHTML = viewSettings();
  else if (r[0] === 'p' && proj()) {
    if (r[2] === 't' && pit()) app.innerHTML = viewPit();
    else if (r[2] === 'preview') app.innerHTML = viewPreview();
    else app.innerHTML = viewProject();
  } else app.innerHTML = viewHome();
  window.scrollTo(0, y);
  refreshDerived();
}

function topbar(title, left = '', right = '') {
  return `<header class="bar"><div class="bar-l">${left}</div><h1>${title}</h1><div class="bar-r">${right}</div></header>`;
}

function viewHome() {
  const list = [...S.projects].sort((a, b) => b.updated - a.updated).map(p => `
    <div class="card row">
      <div class="grow" data-act="nav" data-href="#/p/${p.id}">
        <b>${e(p.name || '(untitled project)')}</b><div class="muted">${e(p.location)} · ${p.pits.length} pit${p.pits.length === 1 ? '' : 's'} · ${e(p.date)}</div>
      </div>
      <button class="btn" data-act="projExport" data-id="${p.id}">Save file</button>
      <button class="btn danger" data-act="projDel" data-id="${p.id}">Delete</button>
    </div>`).join('');
  return topbar('Soil Logs', '', `<button class="btn" data-act="nav" data-href="#/settings">Settings</button>`) + `
  <main>
    <div class="actions">
      <button class="btn primary big" data-act="projNew">+ New project</button>
      <label class="btn big">Open project file<input type="file" accept=".json,application/json" data-act="projImport" hidden></label>
    </div>
    ${list || '<p class="muted center">No projects yet.</p>'}
    ${!S.settings.name ? '<p class="note">Tip: add your name and license number in Settings so they print on every page.</p>' : ''}
  </main>`;
}

function viewProject() {
  const p = proj();
  const last = p.pits[p.pits.length - 1];
  const nErr = p.pits.reduce((n, t) => n + M.checkPit(t, p).filter(c => c.level === 'err').length, 0);
  const pits = p.pits.map((t, i) => {
    const c = M.checkPit(t, p);
    const err = c.filter(x => x.level === 'err').length, warn = c.length - err;
    const lf = t.lfType ? `${V.LIMITING.find(l => l[0] === t.lfType)[1]} ${t.lfDepth}"` : 'no LF';
    return `<div class="card row pitrow">
      <div class="grow" data-act="nav" data-href="#/p/${p.id}/t/${t.id}">
        <b>${e(t.label)}</b> <span class="muted">${e(t.series)}</span>
        <div class="muted">${M.pitDepth(t) ?? '?'}" deep · ${lf} · Profile ${e(t.profile || '?')} / Cond. ${e(M.conditionOf(t) || '?')}</div>
      </div>
      ${err ? `<span class="badge err">${err}</span>` : ''}${warn ? `<span class="badge warn">${warn}</span>` : ''}
      <button class="btn icon" data-act="pitUp" data-id="${t.id}" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
      <button class="btn icon" data-act="pitDown" data-id="${t.id}" ${i === p.pits.length - 1 ? 'disabled' : ''}>&darr;</button>
    </div>`;
  }).join('');
  const lib = S.library.length ? `<select data-act="pitFromLib" class="btn big"><option value="">+ From saved profile…</option>${S.library.map(l => `<option value="${l.id}">${e(l.name)}</option>`).join('')}</select>` : '';
  return topbar(e(p.name || 'Project'), `<button class="btn" data-act="nav" data-href="#/">&larr; Projects</button>`,
    `<button class="btn" data-act="projExport" data-id="${p.id}">Save file</button><button class="btn primary" data-act="nav" data-href="#/p/${p.id}/preview">Preview / PDF</button>`) + `
  <main>
    <section class="card">
      <h2>Project</h2>
      <div class="grid">
        ${field('Project name', input('proj.name', p.name))}
        ${field('Applicant name', input('proj.applicant', p.applicant))}
        ${field('Municipality', input('proj.location', p.location))}
        ${field('Date', input('proj.date', p.date, 'type="date"'))}
        ${field('Job #', input('proj.jobNo', p.jobNo))}
      </div>
    </section>
    <section>
      <h2>Explorations (${p.pits.length})${nErr ? ` <span class="badge err">${nErr} to fix</span>` : ''}</h2>
      ${pits || '<p class="muted">No explorations yet. Start with a blank pit; after that, copy it for the next one.</p>'}
      <div class="actions">
        ${last ? `<button class="btn primary big" data-act="pitNext">+ ${e(M.nextLabel(last.label))} (copy of ${e(last.label)})</button>` : ''}
        <button class="btn big" data-act="pitBlank">+ Blank pit</button>
        ${lib}
      </div>
    </section>
  </main>`;
}

function viewPit() {
  const p = proj(), t = pit();
  const idx = p.pits.indexOf(t);
  const prev = p.pits[idx - 1], next = p.pits[idx + 1];
  const tp = M.tops(t);
  const auto = M.computeCondition(t);
  const hz = t.horizons.map((h, i) => hzCard(h, i, tp[i])).join('');
  const series = M.seriesNames(S.projects).concat(S.library.map(l => l.pit.series)).filter(Boolean);
  return topbar(`${e(t.label)} <span class="muted small">${idx + 1} of ${p.pits.length}</span>`,
    `<button class="btn" data-act="nav" data-href="#/p/${p.id}">&larr; ${e(p.name || 'Project')}</button>`,
    `<button class="btn icon" data-act="nav" data-href="#/p/${p.id}/t/${prev?.id}" ${prev ? '' : 'disabled'}>&lsaquo;</button>
     <button class="btn icon" data-act="nav" data-href="#/p/${p.id}/t/${next?.id}" ${next ? '' : 'disabled'}>&rsaquo;</button>
     <button class="btn primary" data-act="pitDup">Copy &rarr; ${e(M.nextLabel(t.label))}</button>
     <button class="btn" data-act="togglePreview">${ui.showPreview ? 'Hide' : 'Show'} page</button>`) + `
  <main class="${ui.showPreview ? 'split' : ''}">
   <div class="editor">
    <section class="card">
      <h2>Exploration</h2>
      <div class="grid">
        ${field('Exploration symbol #', input('pit.label', t.label))}
        ${field('Type', chips('pit.type', [['tp', 'Test Pit'], ['boring', 'Boring'], ['probe', 'Probe']], t.type, { toggle: false }), 'wide')}
        ${field('Organic horizon (in.)', numIn('pit.organic', t.organic))}
        ${field('Ground surface elev.', numIn('pit.elev', t.elev))}
        ${field('Depth (in.)', numIn('pit.depth', t.depth, `placeholder="auto: ${M.pitDepth({ ...t, depth: '' }) ?? ''}"`))}
        ${field('Depth is', chips('pit.depthKind', [['exploration', 'of exploration'], ['refusal', 'to refusal']], t.depthKind, { toggle: false }), 'wide')}
        ${field('GPS', `<div class="row"><button class="btn" data-act="gps">Get location</button><span class="muted small">${t.gps ? `${t.gps.lat.toFixed(6)}, ${t.gps.lon.toFixed(6)} ±${Math.round(t.gps.acc)} m` : 'not recorded'}</span></div>`, 'wide')}
      </div>
    </section>

    <section class="card">
      <h2>Horizons <span class="muted small">depths from mineral soil surface</span></h2>
      ${hz || '<p class="muted">No horizons yet.</p>'}
      <div class="actions"><button class="btn primary" data-act="hzAdd">+ Add horizon</button>
      <label class="check"><input type="checkbox" data-bind="set.shiftBelow" ${S.settings.shiftBelow ? 'checked' : ''}> Changing a bottom depth shifts the horizons below it</label></div>
    </section>

    <section class="card">
      <h2>Soil details</h2>
      <div class="grid">
        ${field('Soil series / phase', input('pit.series', t.series, 'list="serieslist" autocomplete="off"') + `<datalist id="serieslist">${[...new Set(series)].map(s => `<option value="${e(s)}">`).join('')}</datalist>`, 'wide')}
        ${field('Drainage class', chips('pit.drainage', V.DRAINAGE.map(d => [d[0], d[0], d[1]]), t.drainage), 'wide')}
        ${field('Slope (%)', input('pit.slope', t.slope, 'placeholder="e.g. 5 or 3 to 8"'))}
        ${field('Hydric soil', chips('pit.hydric', [['no', 'No'], ['yes', 'Yes']], t.hydric))}
        ${field('Hydrologic soil group', chips('pit.hsg', V.HSG, t.hsg))}
      </div>
    </section>

    <section class="card">
      <h2>Septic (Ch. 241)</h2>
      <div class="grid">
        ${field('Limiting factor depth (in.)', numIn('pit.lfDepth', t.lfDepth))}
        ${field('Limiting factor', chips('pit.lfType', V.LIMITING, t.lfType), 'wide')}
        ${field('Soil profile (Table 5D)', chips('pit.profile', V.PROFILES.map(pr => [pr[0], pr[0], pr[1]]), t.profile) + `<div class="muted small">${e(V.PROFILES.find(pr => pr[0] === t.profile)?.[1] || 'Tap a number; long-press or hover for the description.')}</div>`, 'wide')}
        ${field('Soil condition (Table 5E)', `<div id="cond" class="cond"></div>` + chips('pit.condition', [['', 'Auto'], 'AI', 'AII', 'AIII', 'B', 'C', 'D', 'E'], t.condition, { toggle: false }), 'wide')}
      </div>
    </section>

    <section class="card">
      <h2>Field notes <span class="muted small">(not printed)</span></h2>
      <textarea data-bind="pit.notes" rows="3">${e(t.notes)}</textarea>
    </section>

    <section class="card"><h2>Checks</h2><div id="checks"></div></section>

    <div class="actions">
      <button class="btn" data-act="pitSaveLib">Save as typical profile…</button>
      <button class="btn danger" data-act="pitDel">Delete ${e(t.label)}</button>
    </div>
   </div>
   ${ui.showPreview ? '<aside class="preview"><div id="pv"></div></aside>' : ''}
  </main>`;
}

function hzCard(h, i, top) {
  const open = ui.openHz === h.id;
  const sum = `<div class="hzsum" data-act="hzOpen" data-id="${h.id}"><b>${e(h.name || '?')}</b> <span>${top}–${h.bottom ?? '?'}"</span> <span class="muted" data-hzsum="${h.id}"></span><span class="chev">${open ? '▾' : '▸'}</span></div>`;
  if (!open) return `<div class="hz">${sum}</div>`;
  const P = `hz.${h.id}`;
  const cm = /^(\S+)\s+([\d.]+)\/(\S+)$/.exec(h.color || '') || [];
  const gley = (cm[1] || '').startsWith('GLEY');
  return `<div class="hz open">${sum}
   <div class="hzbody">
    ${field('Designation', chips(`${P}.name`, V.HORIZONS, h.name) + input(`${P}.name`, h.name, 'class="short"'), 'wide')}
    <div class="row depthrow">
      <span class="muted">Top ${top}"</span>
      <span>Bottom</span>
      <button class="btn icon" data-act="hzStep" data-id="${h.id}" data-d="-1">−</button>
      <input class="short" data-bottom="${h.id}" data-orig="${e(h.bottom ?? '')}" inputmode="decimal" value="${e(h.bottom ?? '')}">
      <button class="btn icon" data-act="hzStep" data-id="${h.id}" data-d="1">+</button>
      <span class="muted">in.</span>
    </div>
    ${field('Color (Munsell)', input(`${P}.color`, h.color, 'class="short"') +
      `<div class="sub">Hue</div>` + colorChips(h.id, 'hue', V.HUES, cm[1]) +
      `<div class="sub">Value</div>` + colorChips(h.id, 'value', V.VALUES, cm[2]) +
      `<div class="sub">${gley ? 'Gley hue' : 'Chroma'}</div>` + colorChips(h.id, 'chroma', gley ? V.GLEY_CHIPS : V.CHROMAS, cm[3]), 'wide')}
    ${field('Texture', chips(`${P}.textureMod`, V.TEXTURE_MODS.map(m => [m[0], m[1], m[2]]), h.textureMod, { cls: 'minor' }) + chips(`${P}.texture`, V.TEXTURES.map(m => [m[0], m[1], m[2]]), h.texture) + custom(`${P}.texText`, h.texText), 'wide')}
    ${field('Structure', chips(`${P}.grade`, V.STRUCT_GRADES.map(m => [m[0], m[2], m[2]]), h.grade) + chips(`${P}.size`, V.STRUCT_SIZES.map(m => [m[0], m[2], m[2]]), h.size, { cls: 'minor' }) + chips(`${P}.stype`, V.STRUCT_TYPES.map(m => [m[0], m[2], m[2]]), h.stype) + custom(`${P}.structText`, h.structText), 'wide')}
    ${field('Consistence (moist)', chips(`${P}.consistence`, V.CONSISTENCE.map(m => [m[0], m[2], m[2]]), h.consistence) + custom(`${P}.consText`, h.consText), 'wide')}
    ${field('Redox features', `<div class="chips"><button type="button" class="chip${M.hasRedox(h) ? '' : ' on'}" data-act="redoxNone" data-id="${h.id}">None</button></div>` +
      chips(`${P}.rAbund`, V.REDOX_ABUNDANCE.map(m => [m[0], m[2]]), h.rAbund) + chips(`${P}.rSize`, V.REDOX_SIZE.map(m => [m[0], m[2]]), h.rSize, { cls: 'minor' }) +
      chips(`${P}.rContrast`, V.REDOX_CONTRAST.map(m => [m[0], m[2]]), h.rContrast) + chips(`${P}.rKind`, V.REDOX_KIND.map(m => [m[0], m[2]]), h.rKind, { cls: 'minor' }) + custom(`${P}.redoxText`, h.redoxText), 'wide')}
    ${field('Horizon notes (not printed)', input(`${P}.notes`, h.notes), 'wide')}
    <div class="actions">
      <button class="btn" data-act="hzAdd" data-id="${h.id}">+ Add below</button>
      <button class="btn" data-act="hzDupl" data-id="${h.id}">Duplicate</button>
      <button class="btn icon" data-act="hzUp" data-id="${h.id}" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
      <button class="btn icon" data-act="hzDown" data-id="${h.id}">&darr;</button>
      <button class="btn danger" data-act="hzDel" data-id="${h.id}">Delete</button>
    </div>
   </div></div>`;
}
const custom = (path, val) => `<input class="customtxt" data-bind="${path}" value="${e(val)}" placeholder="custom text (overrides the selections above)">`;
const colorChips = (id, part, opts, cur) => `<div class="chips">${opts.map(o => `<button type="button" class="chip${cur === o ? ' on' : ''}" data-act="color" data-id="${id}" data-part="${part}" data-val="${o}">${o}</button>`).join('')}</div>`;

function viewPreview() {
  const p = proj();
  return topbar('Preview', `<button class="btn" data-act="nav" data-href="#/p/${p.id}">&larr; ${e(p.name || 'Project')}</button>`,
    `<label class="check"><input type="checkbox" data-bind="set.abbreviations" ${S.settings.abbreviations ? 'checked' : ''}> Abbreviations + legend</label>
     <label class="check"><input type="checkbox" data-bind="proj.signed" ${p.signed ? 'checked' : ''} ${S.settings.signature || S.settings.seal ? '' : 'disabled'}> Signature &amp; seal</label>
     <button class="btn primary" data-act="pdf">Download PDF</button>`) + `
  <main><div id="pages" class="pages"></div></main>`;
}

function viewSettings() {
  const st = S.settings;
  const lib = S.library.map(l => `<div class="card row"><div class="grow"><b>${e(l.name)}</b><div class="muted">${e(l.pit.series)} · ${l.pit.horizons.map(h => e(h.name)).join(' / ')}</div></div>
     <button class="btn" data-act="libRename" data-id="${l.id}">Rename</button><button class="btn danger" data-act="libDel" data-id="${l.id}">Delete</button></div>`).join('');
  const img = (k, label) => `<div class="field wide"><span>${label}</span><div class="row">
      ${st[k] ? `<img src="${st[k].url}" class="thumb" alt="">` : '<span class="muted">none</span>'}
      <label class="btn">Upload image<input type="file" accept="image/*" data-act="imgUpload" data-key="${k}" hidden></label>
      ${st[k] ? `<button class="btn danger" data-act="imgClear" data-key="${k}">Remove</button>` : ''}</div></div>`;
  return topbar('Settings', `<button class="btn" data-act="nav" data-href="#/">&larr; Projects</button>`) + `
  <main>
    <section class="card"><h2>Soil scientist</h2><div class="grid">
      ${field('Name printed', input('set.name', st.name))}
      ${field('License no.', input('set.license', st.license))}
      ${field('License label', input('set.licenseLabel', st.licenseLabel))}
      ${field('Form label (top right)', input('set.formLabel', st.formLabel))}
      ${img('signature', 'Signature image (PNG with transparent background works best)')}
      ${img('seal', 'Seal image')}
    </div><p class="muted small">Signature and seal only print when you tick "Signature &amp; seal" on a project's preview.</p></section>
    <section><h2>Typical profiles (${S.library.length})</h2>${lib || '<p class="muted">Save one from any pit with "Save as typical profile…".</p>'}</section>
  </main>`;
}

// ---------------------------------------------------------------- derived refresh (no focus loss)
let derivedTimer = null;
function refreshDerived() {
  clearTimeout(derivedTimer);
  derivedTimer = setTimeout(() => {
    const p = proj(), t = pit();
    if (t) {
      const abbr = true;
      t.horizons.forEach(h => {
        const el = app.querySelector(`[data-hzsum="${h.id}"]`);
        if (el) el.textContent = [h.color, M.fmtTexture(h, abbr), M.fmtStructure(h, abbr), M.fmtConsistence(h, abbr), M.fmtRedox(h, abbr)].filter(Boolean).join('  ');
      });
      const c = M.checkPit(t, p);
      const ck = app.querySelector('#checks');
      if (ck) ck.innerHTML = c.length ? `<ul class="checks">${c.map(x => `<li class="${x.level}">${e(x.msg)}</li>`).join('')}</ul>` : '<p class="ok">No issues found.</p>';
      const auto = M.computeCondition(t);
      const cd = app.querySelector('#cond');
      if (cd) cd.innerHTML = `Table 5E: <b>${e(auto.value || '—')}</b> <span class="muted">(${e(auto.note)})</span>${t.condition ? ` · <b>override: ${e(t.condition)}</b>` : ''}`;
      const pv = app.querySelector('#pv');
      if (pv) {
        const pages = buildPages(p, S.settings, {});
        const pg = Math.floor(p.pits.indexOf(t) / 4);
        pv.innerHTML = toSvg(pages[pg] || pages[0]);
      }
    }
    const pagesEl = app.querySelector('#pages');
    if (pagesEl && p) {
      const info = p.signed ? imgInfo() : {};
      pagesEl.innerHTML = buildPages(p, S.settings, info).map(pg => toSvg(pg, imgs())).join('');
    }
  }, 120);
}
const imgInfo = () => {
  const o = {};
  ['signature', 'seal'].forEach(k => { if (S.settings[k]) o[k] = { w: S.settings[k].w, h: S.settings[k].h }; });
  return o;
};

// ---------------------------------------------------------------- events
app.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.bind) {
    const [obj, key] = target(el.dataset.bind);
    if (!obj) return;
    obj[key] = el.type === 'checkbox' ? el.checked : el.value;
    touch(); save(S);
    if (el.type === 'checkbox') render(); else refreshDerived();
  }
});

app.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.bottom) return commitBottom(el);
  const act = el.dataset.act;
  if (act === 'projImport' && el.files[0]) {
    readProjectFile(el.files[0]).then(p => {
      const existing = S.projects.findIndex(x => x.id === p.id);
      if (existing >= 0) {
        if (!confirm(`"${p.name}" is already on this device. Replace it with the file version?`)) { p.id = M.uid(); S.projects.push(p); }
        else S.projects[existing] = p;
      } else S.projects.push(p);
      save(S, true); go(`#/p/${p.id}`);
    }).catch(err => alert('Could not open file: ' + err.message));
  }
  if (act === 'pitFromLib' && el.value) {
    const p = proj(), tpl = S.library.find(l => l.id === el.value);
    const last = p.pits[p.pits.length - 1];
    const t = M.fromTemplate(tpl, last ? M.nextLabel(last.label) : 'TP-1');
    p.pits.push(t); touch(); go(`#/p/${p.id}/t/${t.id}`);
  }
  if (act === 'imgUpload' && el.files[0]) loadImage(el.files[0], el.dataset.key);
});

function commitBottom(el) {
  const t = pit(); const i = t.horizons.findIndex(h => h.id === el.dataset.bottom);
  const h = t.horizons[i];
  h.bottom = M.num(el.dataset.orig);
  M.setBottom(t, i, el.value, S.settings.shiftBelow);
  touch(); render();
}

app.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'file')) return;
  const act = el.dataset.act, id = el.dataset.id;
  const p = proj(), t = pit();
  const H = id && t ? t.horizons.findIndex(h => h.id === id) : -1;
  switch (act) {
    case 'nav': if (el.dataset.href && !el.dataset.href.endsWith('undefined')) go(el.dataset.href); return;
    case 'set': {
      const [obj, key] = target(el.dataset.path);
      if (!obj) return;
      const v = el.dataset.val;
      obj[key] = el.dataset.toggle && String(obj[key]) === v ? '' : v;
      if (key === 'grade' && v === '0' && !['sg', 'ma'].includes(obj.stype)) obj.stype = '';
      break;
    }
    case 'color': {
      const h = t.horizons[H];
      const cm = /^(\S+)\s+([\d.]+)\/(\S+)$/.exec(h.color || '') || [];
      let [hue, val, chr] = [cm[1] || '', cm[2] || '', cm[3] || ''];
      if (el.dataset.part === 'hue') { if (hue.startsWith('GLEY') !== el.dataset.val.startsWith('GLEY')) chr = ''; hue = el.dataset.val; }
      if (el.dataset.part === 'value') val = el.dataset.val;
      if (el.dataset.part === 'chroma') chr = el.dataset.val;
      h.color = `${hue || '?'} ${val || '?'}/${chr || '?'}`;
      break;
    }
    case 'redoxNone': Object.assign(t.horizons[H], { rAbund: '', rSize: '', rContrast: '', rKind: '', redoxText: '' }); break;
    case 'hzOpen': ui.openHz = ui.openHz === id ? null : id; break;
    case 'hzAdd': {
      const nh = M.newHorizon();
      const at = H >= 0 ? H + 1 : t.horizons.length;
      t.horizons.splice(at, 0, nh); ui.openHz = nh.id; break;
    }
    case 'hzDupl': { const c = M.clone(t.horizons[H]); c.id = M.uid(); t.horizons.splice(H + 1, 0, c); ui.openHz = c.id; break; }
    case 'hzDel': if (!confirm(`Delete horizon ${t.horizons[H].name || H + 1}?`)) return; t.horizons.splice(H, 1); break;
    case 'hzUp': if (H > 0) [t.horizons[H - 1], t.horizons[H]] = [t.horizons[H], t.horizons[H - 1]]; break;
    case 'hzDown': if (H < t.horizons.length - 1) [t.horizons[H + 1], t.horizons[H]] = [t.horizons[H], t.horizons[H + 1]]; break;
    case 'hzStep': {
      const h = t.horizons[H]; const cur = M.num(h.bottom) ?? M.tops(t)[H];
      M.setBottom(t, H, Math.max(0, cur + +el.dataset.d), S.settings.shiftBelow); break;
    }
    case 'projNew': { const np = M.newProject(); S.projects.push(np); save(S, true); go(`#/p/${np.id}`); return; }
    case 'projDel': {
      const x = S.projects.find(q => q.id === id);
      if (!confirm(`Delete "${x.name || 'untitled'}" and its ${x.pits.length} pits from this device?\nThis cannot be undone. Save a project file first if you need it.`)) return;
      S.projects = S.projects.filter(q => q.id !== id); break;
    }
    case 'projExport': exportProject(S.projects.find(q => q.id === id)); return;
    case 'pitNext': { const last = p.pits[p.pits.length - 1]; const nt = M.copyPit(last); p.pits.push(nt); touch(); go(`#/p/${p.id}/t/${nt.id}`); return; }
    case 'pitBlank': {
      const last = p.pits[p.pits.length - 1];
      const nt = M.newPit(last ? M.nextLabel(last.label) : 'TP-1'); nt.horizons.push(M.newHorizon());
      ui.openHz = nt.horizons[0].id; p.pits.push(nt); touch(); go(`#/p/${p.id}/t/${nt.id}`); return;
    }
    case 'pitDup': {
      const nt = M.copyPit(t); const i = p.pits.indexOf(t);
      let label = M.nextLabel(t.label); while (p.pits.some(x => x.label === label)) label = M.nextLabel(label);
      nt.label = label; p.pits.splice(i + 1, 0, nt); touch(); go(`#/p/${p.id}/t/${nt.id}`); return;
    }
    case 'pitDel': {
      if (!confirm(`Delete ${t.label}? This cannot be undone.`)) return;
      p.pits = p.pits.filter(x => x !== t); touch(); go(`#/p/${p.id}`); return;
    }
    case 'pitUp': case 'pitDown': {
      const i = p.pits.findIndex(x => x.id === id), j = act === 'pitUp' ? i - 1 : i + 1;
      if (j >= 0 && j < p.pits.length) [p.pits[i], p.pits[j]] = [p.pits[j], p.pits[i]]; break;
    }
    case 'pitSaveLib': {
      const name = prompt('Name for this typical profile (e.g. "Telos typical"):', t.series ? `${t.series} typical` : t.label);
      if (!name) return;
      const tpl = M.clone(t); delete tpl.id; tpl.label = ''; tpl.elev = ''; tpl.gps = null; tpl.notes = '';
      S.library.push({ id: M.uid(), name, pit: tpl }); save(S, true); alert(`Saved "${name}". Use it from the project page: "+ From saved profile".`); return;
    }
    case 'libDel': if (!confirm('Delete this saved profile?')) return; S.library = S.library.filter(l => l.id !== id); break;
    case 'libRename': { const l = S.library.find(x => x.id === id); const n = prompt('New name:', l.name); if (!n) return; l.name = n; break; }
    case 'imgClear': S.settings[el.dataset.key] = ''; break;
    case 'togglePreview': ui.showPreview = !ui.showPreview; break;
    case 'gps':
      if (!navigator.geolocation) return alert('Location not available on this device/browser.');
      el.textContent = 'Locating…';
      navigator.geolocation.getCurrentPosition(pos => {
        t.gps = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() }; touch(); render();
      }, err => { alert('Could not get location: ' + err.message); render(); }, { enableHighAccuracy: true, timeout: 30000 });
      return;
    case 'pdf': makePdf(el); return;
    default: return;
  }
  touch(); render();
});

async function makePdf(btn) {
  const p = proj();
  btn.disabled = true; btn.textContent = 'Building…';
  try {
    const info = p.signed ? imgInfo() : {};
    const pages = buildPages(p, S.settings, info);
    const bytes = await buildPdf(pages, p.signed ? imgs() : {}, { title: `${p.name} Soil Logs` });
    const name = [p.jobNo, (p.name || 'project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_'), 'Soil_Logs'].filter(Boolean).join('_');
    download(name + '.pdf', new Blob([bytes], { type: 'application/pdf' }));
  } catch (err) { alert('PDF failed: ' + err.message); console.error(err); }
  btn.disabled = false; btn.textContent = 'Download PDF';
}

function loadImage(file, key) {
  const fr = new FileReader();
  fr.onload = async () => {
    const img = new Image(); img.src = fr.result; await img.decode();
    const max = 900, r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * r); cv.height = Math.round(img.naturalHeight * r);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    S.settings[key] = { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
    save(S, true); render();
  };
  fr.readAsDataURL(file);
}

window.addEventListener('hashchange', () => { if (!pit()) ui.openHz = null; window.scrollTo(0, 0); render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) save(S, true); });
window.addEventListener('pagehide', () => save(S, true));
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW', err));
}
render();
