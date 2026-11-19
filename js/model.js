// Data model: projects, pits, horizons; formatting, Ch. 241 condition, field checks.
import { term, DRAINAGE } from './vocab.js';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function newHorizon(name = '', bottom = null) {
  return {
    id: uid(), name, bottom, color: '',
    textureMod: '', texture: '', texText: '',
    grade: '', size: '', stype: '', structText: '',
    consistence: '', consText: '',
    rAbund: '', rSize: '', rContrast: '', rKind: '', redoxText: '',
    notes: '',
  };
}

export function newPit(label = 'TP-1') {
  return {
    id: uid(), label, type: 'tp', organic: '', elev: '', depth: '', depthKind: 'exploration',
    horizons: [], series: '', drainage: '', slope: '', hydric: '', hsg: '',
    lfDepth: '', lfType: '', profile: '', condition: '', gps: null, notes: '',
  };
}

export function newProject() {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    id: uid(), name: '', applicant: '', location: '', date: iso, jobNo: '',
    pits: [], created: Date.now(), updated: Date.now(),
  };
}

export const clone = o => JSON.parse(JSON.stringify(o));

export function nextLabel(label) {
  const m = /^(.*?)(\d+)([^\d]*)$/.exec(label || '');
  if (!m) return (label || 'TP') + '-1';
  const n = String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
  return m[1] + n + m[3];
}

// Copy a pit as the starting point for the next one: keeps the profile and
// interpretation, gives it the next label, clears what is always site-specific.
export function copyPit(src, label) {
  const p = clone(src);
  p.id = uid();
  p.label = label || nextLabel(src.label);
  p.elev = '';
  p.gps = null;
  p.horizons.forEach(h => { h.id = uid(); });
  return p;
}

export function fromTemplate(tpl, label) {
  const p = Object.assign(newPit(label), clone(tpl.pit));
  p.id = uid(); p.label = label; p.elev = ''; p.gps = null;
  p.horizons.forEach(h => { h.id = uid(); });
  return p;
}

// Horizon depth helpers -------------------------------------------------
export function tops(pit) {
  const out = []; let prev = 0;
  for (const h of pit.horizons) { out.push(prev); prev = num(h.bottom) ?? prev; }
  return out;
}
export const num = v => (v === '' || v === null || v === undefined || isNaN(+v)) ? null : +v;

export function pitDepth(pit) {
  const d = num(pit.depth);
  if (d !== null) return d;
  const last = pit.horizons[pit.horizons.length - 1];
  return last ? num(last.bottom) : null;
}

// Change one horizon's bottom; optionally move every boundary below by the same amount.
export function setBottom(pit, idx, value, shiftBelow) {
  const h = pit.horizons[idx];
  const old = num(h.bottom);
  const nv = num(value);
  h.bottom = nv;
  if (shiftBelow && old !== null && nv !== null) {
    const delta = nv - old;
    for (let i = idx + 1; i < pit.horizons.length; i++) {
      const b = num(pit.horizons[i].bottom);
      if (b !== null) pit.horizons[i].bottom = b + delta;
    }
    const d = num(pit.depth);
    if (d !== null) pit.depth = String(d + delta);
  }
}

// Formatting --------------------------------------------------------------
const tc = s => s.replace(/\b([a-z])/g, c => c.toUpperCase());

export function fmtTexture(h, abbr) {
  if (h.texText) return h.texText;
  const m = term('textureMod', h.textureMod), t = term('texture', h.texture);
  if (abbr) return [m?.abbr, t?.abbr].filter(Boolean).join(' ');
  return tc([m?.full, t?.full].filter(Boolean).join(' ').toLowerCase());
}

export function fmtStructure(h, abbr) {
  if (h.structText) return h.structText;
  const g = term('grade', h.grade), s = term('size', h.size), t = term('stype', h.stype);
  if (abbr) return [g?.abbr, s?.abbr, t?.abbr].filter(Boolean).join(' ');
  return tc([g?.full, s?.full, t?.full].filter(Boolean).join(' ').toLowerCase());
}

export function fmtConsistence(h, abbr) {
  if (h.consText) return h.consText;
  const c = term('consistence', h.consistence);
  return c ? (abbr ? c.abbr : c.full) : '';
}

export function fmtRedox(h, abbr) {
  if (h.redoxText) return h.redoxText;
  if (h.rKind === 'rm' && !h.rAbund) return abbr ? 'RM' : 'Reduced Matrix';
  const parts = [term('rAbund', h.rAbund), term('rSize', h.rSize), term('rContrast', h.rContrast)].filter(Boolean);
  if (!parts.length) return h.rKind === 'rm' ? (abbr ? 'RM' : 'Reduced Matrix') : '';
  return abbr ? parts.map(p => p.abbr).join(',') : parts.map(p => p.full).join(' ');
}

export function hasRedox(h) {
  return !!(h.redoxText || h.rAbund || h.rKind);
}

// Legend of abbreviations actually used in a project (for abbreviation mode).
export function buildLegend(project) {
  const sec = { TEXTURE: new Map(), STRUCTURE: new Map(), CONSISTENCE: new Map(), 'DRAINAGE CLASS': new Map(), 'REDOX FEATURES': new Map() };
  for (const p of project.pits) {
    for (const h of p.horizons) {
      if (!h.texText) {
        const m = term('textureMod', h.textureMod); if (m) sec.TEXTURE.set(m.abbr, m.full);
        const t = term('texture', h.texture); if (t) sec.TEXTURE.set(t.abbr, t.full);
      }
      if (!h.structText) {
        for (const [tb, k] of [['grade', 'grade'], ['size', 'size'], ['stype', 'stype']]) {
          const t = term(tb, h[k]); if (t && t.abbr) sec.STRUCTURE.set(t.abbr, t.full);
        }
      }
      if (!h.consText) { const c = term('consistence', h.consistence); if (c) sec.CONSISTENCE.set(c.abbr, c.full); }
      if (!h.redoxText && hasRedox(h)) {
        const a = fmtRedox(h, true);
        const kind = term('rKind', h.rKind);
        let full = fmtRedox(h, false);
        if (kind && kind.code !== 'rm') full = (full + ' ' + kind.full.toLowerCase()).trim();
        full = full.charAt(0).toUpperCase() + full.slice(1).toLowerCase();
        const prev = sec['REDOX FEATURES'].get(a);
        sec['REDOX FEATURES'].set(a, prev && prev !== full ? mergeKinds(prev, full) : full);
      }
    }
    if (p.drainage) {
      const d = DRAINAGE.find(r => r[0] === p.drainage);
      if (d) sec['DRAINAGE CLASS'].set(d[0], d[1]);
    }
  }
  return Object.entries(sec).filter(([, m]) => m.size).map(([title, m]) => ({ title, items: [...m.entries()] }));
}
function mergeKinds(a, b) {
  const base = a.replace(/ (concentrations|depletions)$/, '');
  return base + ' concentrations/depletions';
}

// Ch. 241 Table 5E soil condition ------------------------------------------
// Returns {value, note}. Depth is from the mineral soil surface.
export function computeCondition(pit) {
  let d = num(pit.lfDepth);
  let type = pit.lfType;
  if (d === null) {
    const pd = pitDepth(pit);
    if (pd === null) return { value: '', note: 'Need limiting factor depth or pit depth' };
    if (pd <= 48) return { value: '', note: `No limiting factor recorded; pit only ${pd}" deep (need >48" to call B/AIII)` };
    d = pd + 0.001; type = type || 'gw';
  }
  if (type === 'br') {
    if (d > 48) return { value: 'AIII', note: 'Bedrock >48"' };
    if (d >= 15) return { value: 'AII', note: 'Bedrock 15-48"' };
    if (d >= 9) return { value: 'AI', note: 'Bedrock 9-<15"' };
    return { value: '', note: 'Bedrock <9" - no condition in Table 5E' };
  }
  if (d > 48) return { value: 'B', note: 'Limiting factor >48"' };
  if (d >= 15) return { value: 'C', note: 'Limiting factor 15-48"' };
  if (d >= 9) return { value: 'D', note: 'Limiting factor 9-<15"' };
  return { value: 'E', note: 'Limiting factor <9"' };
}
export const conditionOf = pit => pit.condition || computeCondition(pit).value;

// Field checks -------------------------------------------------------------
// level: 'err' (missing required / impossible) or 'warn' (worth a second look).
export function checkPit(pit, project) {
  const out = [];
  const add = (level, msg) => out.push({ level, msg });
  if (!pit.label) add('err', 'Exploration symbol is blank');
  else if (project && project.pits.some(o => o !== pit && o.label === pit.label)) add('err', `Another exploration is also labeled ${pit.label}`);
  if (pit.organic === '' || pit.organic == null) add('warn', 'Organic horizon thickness blank');
  if (!pit.elev) add('warn', 'Ground surface elevation blank');
  if (!pit.horizons.length) add('err', 'No horizons described');
  const t = tops(pit);
  let prevBottom = 0;
  pit.horizons.forEach((h, i) => {
    const tag = h.name || `Horizon ${i + 1}`;
    const b = num(h.bottom);
    if (b === null) add('err', `${tag}: bottom depth missing`);
    else if (b <= t[i]) add('err', `${tag}: bottom (${b}") is not below top (${t[i]}")`);
    if (!h.name) add('warn', `Horizon ${i + 1}: designation blank`);
    if (!h.color) add('err', `${tag}: color missing (Ch. 241 5(B)(2))`);
    if (!fmtTexture(h, true)) add('err', `${tag}: texture missing (Ch. 241 5(B)(2))`);
    if (!fmtConsistence(h, true)) add('err', `${tag}: consistence missing (Ch. 241 5(B)(2))`);
    if (!fmtStructure(h, true)) add('warn', `${tag}: structure blank`);
    if (b !== null) prevBottom = b;
  });
  const d = num(pit.depth);
  if (d !== null && pit.horizons.length && d !== prevBottom) add('warn', `Depth (${d}") differs from last horizon bottom (${prevBottom}")`);
  if (!pit.series) add('warn', 'Soil series/phase name blank');
  if (!pit.drainage) add('warn', 'Drainage class not checked');
  if (!pit.slope) add('warn', 'Slope blank');
  if (!pit.hydric) add('warn', 'Hydric soil not checked');
  if (!pit.hsg) add('warn', 'Hydrologic soil group blank');
  if (!pit.profile) add('err', 'Ch. 241 soil profile not selected');

  const lf = num(pit.lfDepth);
  if (lf !== null && !pit.lfType) add('err', 'Limiting factor depth given but no type checked');
  if (pit.lfType && lf === null) add('err', 'Limiting factor type checked but depth blank');

  // Redox vs. groundwater limiting factor
  const firstRedox = pit.horizons.findIndex(hasRedox);
  if (firstRedox >= 0) {
    const rTop = t[firstRedox];
    if (lf === null) add('warn', `Redox features begin at ${rTop}" but no limiting factor recorded`);
    else if (lf > rTop + 0.5) add('warn', `Redox features begin at ${rTop}" - shallower than limiting factor (${lf}")`);
  } else if (pit.lfType === 'gw' && lf !== null) {
    add('warn', 'Groundwater limiting factor with no redox features recorded');
  }

  // Drainage / hydric consistency (soft)
  if (['SPD', 'PD', 'VPD'].includes(pit.drainage) && firstRedox < 0) add('warn', `${pit.drainage} with no redox features recorded`);
  if (pit.hydric === 'yes' && ['ED', 'SED', 'WD', 'MWD'].includes(pit.drainage)) add('warn', `Hydric soil marked yes but drainage is ${pit.drainage}`);
  if (pit.hydric === 'no' && pit.drainage === 'VPD') add('warn', 'VPD but hydric soil marked no');

  // Refusal vs limiting factor
  if (pit.depthKind === 'refusal' && !['br', 'rl'].includes(pit.lfType)) add('warn', 'Refusal checked but limiting factor is not bedrock/restrictive');

  // Condition override vs Table 5E
  const auto = computeCondition(pit);
  if (pit.condition && auto.value && pit.condition !== auto.value) add('warn', `Condition ${pit.condition} differs from Table 5E (${auto.value}: ${auto.note})`);
  if (!pit.condition && !auto.value) add('warn', `Condition: ${auto.note}`);
  return out;
}

// Series names used across a project (for consistency / autocomplete).
export function seriesNames(projects) {
  const s = new Set();
  projects.forEach(pr => pr.pits.forEach(p => p.series && s.add(p.series)));
  return [...s].sort();
}
