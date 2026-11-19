// Form F (SS1) style page layout, 4 explorations per page, with Ch. 241
// Profile / Condition added to the Soil Details box.
// Produces a device-independent draw list (see pdf.js) used for both the
// on-screen SVG preview and the PDF. All geometry lives in LAYOUT so it can be
// made draggable/editable later (Phase 2) without touching the drawing code.
import { wrap, measure } from './pdf.js';
import { tops, num, pitDepth, fmtTexture, fmtStructure, fmtConsistence, fmtRedox, conditionOf, buildLegend } from './model.js';

export const LAYOUT = {
  page: { w: 612, h: 792, left: 36, right: 576, top: 28 },
  grid: { top: 92, bottom: 700, gap: 6 },
  // pit box internals (relative to the box)
  pit: {
    tableTop: 50, detailsH: 48, scaleX: 24, padR: 4,
    cols: [['Horizon', 28], ['Color', 40], ['Texture', 38], ['Structure', 46], ['Consistence', 44], ['Redox', 43]],
    fontMax: 6.5, fontMin: 4.4, minScale: 60,
  },
  details: { row1: [['series', 100], ['profile', 27], ['condition', 32], ['lf', 80]], row2: [['drainage', 100], ['slope', 27], ['hydric', 32], ['hsg', 80]] },
  sig: { top: 704, bottom: 784 },
};

const fmtDate = iso => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
};

export function buildPages(project, settings, imageInfo = {}) {
  const L = LAYOUT;
  const abbr = !!settings.abbreviations;
  const slots = project.pits.map(p => ({ kind: 'pit', pit: p }));
  const legend = abbr ? buildLegend(project) : [];
  if (legend.length) slots.push({ kind: 'legend', legend });
  const nPages = Math.max(1, Math.ceil(slots.length / 4));
  const pages = [];
  for (let pg = 0; pg < nPages; pg++) {
    const cmds = [];
    header(cmds, project, settings, pg + 1, nPages);
    const gw = (L.page.right - L.page.left - L.grid.gap) / 2;
    const gh = (L.grid.bottom - L.grid.top - L.grid.gap) / 2;
    for (let k = 0; k < 4; k++) {
      const x = L.page.left + (k % 2) * (gw + L.grid.gap);
      const y = L.grid.top + Math.floor(k / 2) * (gh + L.grid.gap);
      const slot = slots[pg * 4 + k];
      if (slot && slot.kind === 'legend') legendBox(cmds, x, y, gw, gh, slot.legend);
      else pitBox(cmds, x, y, gw, gh, slot ? slot.pit : null, abbr);
    }
    signature(cmds, project, settings, imageInfo);
    pages.push({ width: L.page.w, height: L.page.h, cmds });
  }
  return pages;
}

// ---------------------------------------------------------------------------
function T(cmds, x, y, s, size, font = 'R', align = 'left', extra = {}) {
  cmds.push({ t: 'text', x, y, s: s ?? '', size, font, align, ...extra });
}
const line = (cmds, x1, y1, x2, y2, w = 0.5, extra = {}) => cmds.push({ t: 'line', x1, y1, x2, y2, w, ...extra });
const rect = (cmds, x, y, w, h, extra = {}) => cmds.push({ t: 'rect', x, y, w, h, ...extra });
function box(cmds, x, y, s, checked) {
  rect(cmds, x, y, s, s, { lw: 0.5 });
  if (checked) { line(cmds, x + 0.8, y + 0.8, x + s - 0.8, y + s - 0.8, 0.8); line(cmds, x + s - 0.8, y + 0.8, x + 0.8, y + s - 0.8, 0.8); }
}
function checkLabel(cmds, x, baseline, label, checked, size = 7) {
  const s = size * 0.95;
  box(cmds, x, baseline - s + 0.6, s, checked);
  T(cmds, x + s + 2, baseline, label, size);
  return x + s + 2 + measure(label, size) + 6;
}

function header(cmds, project, settings, pg, n) {
  const { left, right, top } = LAYOUT.page;
  T(cmds, left, top + 9, `PAGE  ${pg}  OF  ${n}`, 8.5, 'B');
  T(cmds, right, top + 9, settings.formLabel || '', 8.5, 'B', 'right');
  const y = top + 14, h = 22;
  const split = left + 0.6 * (right - left);
  rect(cmds, left, y, split - left, h, { fill: 0, stroke: false });
  T(cmds, (left + split) / 2, y + 15, 'SOIL PROFILE / CLASSIFICATION INFORMATION', 11.5, 'B', 'center', { gray: 1 });
  rect(cmds, split, y, right - split, h, { lw: 0.8 });
  T(cmds, (split + right) / 2, y + 9, 'SOIL SCIENTIST DESCRIPTION', 7.5, 'B', 'center');
  T(cmds, (split + right) / 2, y + 18, 'OF SOIL CONDITIONS AT PROJECT SITES', 7.5, 'B', 'center');
  const py = y + h, ph = 24;
  rect(cmds, left, py, right - left, ph, { lw: 0.8 });
  const c1 = left + 0.36 * (right - left), c2 = left + 0.66 * (right - left);
  line(cmds, c1, py, c1, py + ph, 0.5); line(cmds, c2, py, c2, py + ph, 0.5);
  T(cmds, left + 3, py + 7, 'Project Name:', 6.5);
  T(cmds, c1 + 3, py + 7, 'Applicant Name:', 6.5);
  T(cmds, c2 + 3, py + 7, 'Project Location (municipality):', 6.5);
  fitText(cmds, left + 4, py + 19, project.name, c1 - left - 8, 10);
  fitText(cmds, c1 + 4, py + 19, project.applicant, c2 - c1 - 8, 10);
  fitText(cmds, c2 + 4, py + 19, project.location, right - c2 - 8, 10);
}

function fitText(cmds, x, y, s, width, size, font = 'R', align = 'left') {
  if (!s) return;
  let sz = size;
  while (sz > 5 && measure(s, sz, font) > width) sz -= 0.25;
  T(cmds, x, y, s, sz, font, align);
}

function underline(cmds, x1, x2, y, value, size = 8.5, font = 'B') {
  line(cmds, x1, y + 1.5, x2, y + 1.5, 0.5);
  if (value !== undefined && value !== null && value !== '') fitText(cmds, (x1 + x2) / 2, y, String(value), x2 - x1 - 2, size, font, 'center');
}

// ---------------------------------------------------------------------------
function pitBox(cmds, x0, y0, w, h, pit, abbr) {
  const P = LAYOUT.pit;
  rect(cmds, x0, y0, w, h, { lw: 0.9 });
  const p = pit || {};
  // Row 1
  T(cmds, x0 + 6, y0 + 11, 'Exploration Symbol #', 7);
  underline(cmds, x0 + 76, x0 + 132, y0 + 11, p.label, 9);
  let cx = x0 + 140;
  cx = checkLabel(cmds, cx, y0 + 11, 'Test Pit', p.type === 'tp');
  cx = checkLabel(cmds, cx, y0 + 11, 'Boring', p.type === 'boring');
  checkLabel(cmds, cx, y0 + 11, 'Probe', p.type === 'probe');
  // Row 2
  underline(cmds, x0 + 6, x0 + 30, y0 + 23, p.organic);
  T(cmds, x0 + 31, y0 + 23, '" Organic horizon thickness', 7);
  T(cmds, x0 + 140, y0 + 23, 'Ground surface elev.', 7);
  underline(cmds, x0 + 210, x0 + w - 6, y0 + 23, p.elev);
  // Row 3
  const depth = pit ? (num(p.depth) ?? pitDepth(p)) : '';
  underline(cmds, x0 + 26, x0 + 54, y0 + 35, depth);
  T(cmds, x0 + 55, y0 + 35, '" Depth:', 7);
  cx = checkLabel(cmds, x0 + 86, y0 + 35, 'of exploration, or', pit && p.depthKind !== 'refusal');
  checkLabel(cmds, cx, y0 + 35, 'to refusal', pit && p.depthKind === 'refusal');

  // Table
  const tx = x0 + P.scaleX, tr = x0 + w - P.padR;
  const tTop = y0 + P.tableTop, tBot = y0 + h - P.detailsH - 4;
  const pd = pit ? pitDepth(p) : null;
  const S = Math.max(P.minScale, Math.ceil(((pd ?? 0) + 0.01) / 10) * 10);
  const yOf = d => tTop + (d / S) * (tBot - tTop);
  // column headers
  let colX = [tx];
  P.cols.forEach(([, cw]) => colX.push(colX[colX.length - 1] + cw));
  const scaleW = (tr - tx) / (colX[colX.length - 1] - tx);
  colX = colX.map(v => tx + (v - tx) * scaleW);
  P.cols.forEach(([name], i) => T(cmds, (colX[i] + colX[i + 1]) / 2, tTop - 3, name, 6.5, 'R', 'center'));
  // faint 2" lines, 10" ticks
  for (let d = 2; d < S; d += 2) {
    if (d % 10) line(cmds, tx, yOf(d), tr, yOf(d), 0.25, { gray: 0.7, dash: [1, 1] });
    else line(cmds, tx, yOf(d), tr, yOf(d), 0.35, { gray: 0.45 });
  }
  line(cmds, tx, tTop, tr, tTop, 0.8);
  // horizon boundaries & text
  const bounds = [];
  if (pit) {
    const t = tops(p);
    p.horizons.forEach((hz, i) => {
      const top = t[i], bot = num(hz.bottom);
      if (bot === null || bot <= top) return;
      bounds.push(bot);
      line(cmds, tx, yOf(bot), tr, yOf(bot), 0.9);
      const vals = [hz.name, hz.color, fmtTexture(hz, abbr), fmtStructure(hz, abbr), fmtConsistence(hz, abbr), fmtRedox(hz, abbr)];
      horizonText(cmds, vals, colX, yOf(top), yOf(bot));
    });
  }
  // depth scale labels
  for (let d = 0; d <= S; d += 10) {
    line(cmds, tx - 3, yOf(d), tx, yOf(d), 0.6);
    const near = bounds.some(b => Math.abs(b - d) < 2.6);
    if (!near) T(cmds, tx - 4, yOf(d) + 2.2, String(d), 6.5, 'R', 'right');
  }
  bounds.forEach(b => T(cmds, tx - 4, yOf(b) + 2.2, String(b), 6.5, 'B', 'right'));
  // vertical lines
  colX.forEach((cxv, i) => line(cmds, cxv, tTop - 10, cxv, tBot, i === 0 || i === colX.length - 1 ? 0.6 : 0.35));
  line(cmds, tx, tBot, tr, tBot, 0.6);
  T(cmds, x0 + 8, (tTop + tBot) / 2, 'Depth below mineral soil horizon (inches)', 6.5, 'I', 'center', { rot: 90 });

  details(cmds, x0, tx, tr, y0 + h - P.detailsH, P.detailsH - 3, pit ? p : null);
}

function horizonText(cmds, vals, colX, yTop, yBot) {
  const P = LAYOUT.pit;
  const avail = yBot - yTop - 1.5;
  let fs = P.fontMax, wrapped;
  for (; ; fs -= 0.25) {
    const lead = fs * 1.12;
    wrapped = vals.map((v, i) => wrap(v || '', colX[i + 1] - colX[i] - 3, fs));
    const maxLines = Math.max(1, ...wrapped.map(l => l.length));
    if (maxLines * lead <= avail || fs <= P.fontMin) break;
  }
  const lead = fs * 1.12;
  const mid = (yTop + yBot) / 2;
  wrapped.forEach((lines, i) => {
    const cx = (colX[i] + colX[i + 1]) / 2;
    const y1 = mid - (lines.length * lead) / 2 + fs * 0.82;
    lines.forEach((ln, k) => {
      // white knockout so grid lines never run through the text
      const tw = measure(ln, fs, i === 0 ? 'B' : 'R');
      rect(cmds, cx - tw / 2 - 0.8, y1 + k * lead - fs * 0.8, tw + 1.6, fs * 0.98, { fill: 1, stroke: false });
      T(cmds, cx, y1 + k * lead, ln, fs, i === 0 ? 'B' : 'R', 'center');
    });
  });
}

function details(cmds, x0, dx, dr, dy, dh, p) {
  T(cmds, x0 + 12, dy + 13, 'Soil', 6, 'R', 'center');
  T(cmds, x0 + 12, dy + 20, 'Details', 6, 'R', 'center');
  T(cmds, x0 + 12, dy + 32, '>>', 8, 'B', 'center');
  rect(cmds, dx, dy, dr - dx, dh, { lw: 0.8 });
  const rh = dh / 2;
  const scale = (dr - dx) / 239;
  const cells = (row, y) => { let x = dx; return LAYOUT.details[row].map(([k, cw]) => { const c = { k, x, y, w: cw * scale, h: rh }; x += cw * scale; return c; }); };
  const r1 = cells('row1', dy), r2 = cells('row2', dy + rh);
  line(cmds, dx, dy + rh, dr, dy + rh, 0.4);
  [...r1.slice(1), ...r2.slice(1)].forEach(c => line(cmds, c.x, c.y, c.x, c.y + rh, 0.4));
  const v = p || {};
  for (const c of [...r1, ...r2]) {
    const cxm = c.x + c.w / 2;
    switch (c.k) {
      case 'series':
        T(cmds, c.x + 2, c.y + 6, 'Soil Series/Phase Name:', 5.3);
        fitText(cmds, c.x + 3, c.y + 17.5, v.series, c.w - 6, 9.5);
        break;
      case 'profile':
        T(cmds, cxm, c.y + 6, 'Profile', 5.3, 'R', 'center');
        T(cmds, cxm, c.y + 17.5, v.profile || '', 10, 'B', 'center');
        break;
      case 'condition':
        T(cmds, cxm, c.y + 6, 'Condition', 5.3, 'R', 'center');
        T(cmds, cxm, c.y + 17.5, p ? conditionOf(v) : '', 10, 'B', 'center');
        break;
      case 'lf': {
        const lx = c.x + 2, lr = c.x + c.w * 0.44;
        T(cmds, lx, c.y + 6, 'Limiting Factor', 4.9);
        line(cmds, lx + 2, c.y + 15.5, lr - 3, c.y + 15.5, 0.4);
        if (v.lfDepth !== '' && v.lfDepth !== undefined) T(cmds, (lx + lr) / 2, c.y + 14.5, v.lfDepth + '"', 8.5, 'B', 'center');
        T(cmds, (lx + lr) / 2, c.y + 20.5, 'Depth', 4.8, 'R', 'center');
        const bx = c.x + c.w * 0.46;
        [['gw', 'Groundwater'], ['rl', 'Restrictive Layer'], ['br', 'Bedrock']].forEach(([k, lbl], i) => {
          const by = c.y + 6.8 + i * 6.6;
          box(cmds, bx, by - 4.2, 4.4, v.lfType === k);
          T(cmds, bx + 5.6, by, lbl, 4.6);
        });
        break;
      }
      case 'drainage': {
        T(cmds, c.x + 2, c.y + 6, 'Drainage Class', 5.3);
        let x = c.x + 6;
        ['ED', 'SED', 'WD', 'MWD'].forEach(k => { x = checkLabel(cmds, x, c.y + 13.5, k, v.drainage === k, 5.4) - 2; });
        x = c.x + 18;
        ['SPD', 'PD', 'VPD'].forEach(k => { x = checkLabel(cmds, x, c.y + 20.8, k, v.drainage === k, 5.4) - 2; });
        break;
      }
      case 'slope':
        T(cmds, cxm, c.y + 6, 'Slope', 5.3, 'R', 'center');
        fitText(cmds, cxm, c.y + 15, v.slope, c.w - 4, 8.5, 'B', 'center');
        line(cmds, c.x + 3, c.y + 16.5, c.x + c.w - 3, c.y + 16.5, 0.4);
        T(cmds, cxm, c.y + 21.5, 'Percent', 4.8, 'R', 'center');
        break;
      case 'hydric':
        T(cmds, cxm, c.y + 6, 'Hydric Soil', 5.3, 'R', 'center');
        checkLabel(cmds, c.x + 7, c.y + 13.5, 'No', v.hydric === 'no', 5.4);
        checkLabel(cmds, c.x + 7, c.y + 20.8, 'Yes', v.hydric === 'yes', 5.4);
        break;
      case 'hsg':
        T(cmds, cxm, c.y + 6, 'Hydrologic', 5.3, 'R', 'center');
        T(cmds, cxm, c.y + 15, v.hsg || '', 9, 'B', 'center');
        line(cmds, c.x + 8, c.y + 16.5, c.x + c.w - 8, c.y + 16.5, 0.4);
        T(cmds, cxm, c.y + 21.5, 'Soil Group', 4.8, 'R', 'center');
        break;
    }
  }
}

function legendBox(cmds, x0, y0, w, h, legend) {
  rect(cmds, x0, y0, w, h, { lw: 0.9 });
  T(cmds, x0 + w / 2, y0 + 16, 'ABBREVIATION LEGEND', 9, 'B', 'center');
  const lead = 8.2;
  const rows = [];
  legend.forEach(sec => { rows.push({ title: sec.title }); sec.items.forEach(([a, f]) => rows.push({ a, f })); });
  const perCol = Math.floor((h - 34) / lead);
  const cols = rows.length > perCol ? 2 : 1;
  const colW = (w - 16) / cols;
  rows.forEach((r, i) => {
    const col = Math.floor(i / perCol);
    if (col >= cols) return;
    const x = x0 + 8 + col * colW, y = y0 + 32 + (i % perCol) * lead;
    if (r.title) {
      T(cmds, x, y, r.title, 6.5, 'B');
      line(cmds, x, y + 1.5, x + colW - 8, y + 1.5, 0.4);
    } else {
      T(cmds, x + 2, y, r.a, 6.3, 'B');
      fitText(cmds, x + (cols === 2 ? 28 : 40), y, r.f, colW - (cols === 2 ? 36 : 48), 6.3);
    }
  });
}

function signature(cmds, project, settings, imageInfo) {
  const { left } = LAYOUT.page;
  const { top, bottom } = LAYOUT.sig;
  rect(cmds, left + 8, top, 432, 11, { fill: 0, stroke: false });
  T(cmds, left + 8 + 216, top + 8.3, 'SOIL SCIENTIST INFORMATION AND SIGNATURE', 8, 'B', 'center', { gray: 1 });
  const lx1 = left + 20, lx2 = left + 300, dx1 = left + 320, dx2 = left + 440;
  const y1 = top + 42, y2 = top + 70;
  line(cmds, lx1, y1, lx2, y1, 0.5); T(cmds, (lx1 + lx2) / 2, y1 + 7, 'Signature', 6.5, 'R', 'center');
  line(cmds, dx1, y1, dx2, y1, 0.5); T(cmds, (dx1 + dx2) / 2, y1 + 7, 'Date', 6.5, 'R', 'center');
  line(cmds, lx1, y2, lx2, y2, 0.5); T(cmds, (lx1 + lx2) / 2, y2 + 7, 'Name Printed', 6.5, 'R', 'center');
  line(cmds, dx1, y2, dx2, y2, 0.5); T(cmds, (dx1 + dx2) / 2, y2 + 7, settings.licenseLabel || 'SS License No.', 6.5, 'R', 'center');
  T(cmds, (dx1 + dx2) / 2, y1 - 3, fmtDate(project.date), 10, 'R', 'center');
  T(cmds, (lx1 + lx2) / 2, y2 - 3, settings.name || '', 10, 'R', 'center');
  T(cmds, (dx1 + dx2) / 2, y2 - 3, settings.license || '', 10, 'R', 'center');
  // seal box
  const sx = left + 452, sw = 88, sy = top - 2, sh = bottom - top + 2;
  rect(cmds, sx, sy, sw, sh, { lw: 0.5, dash: [1.5, 1.5] });
  T(cmds, sx + sw / 2, sy + sh - 3, 'affix professional seal', 6, 'I', 'center', { gray: 0.35 });
  if (imageInfo.seal) fitImage(cmds, 'seal', imageInfo.seal, sx + 3, sy + 3, sw - 6, sh - 12);
  if (imageInfo.signature) fitImage(cmds, 'signature', imageInfo.signature, lx1 + 60, top + 13, 160, 32);
}

function fitImage(cmds, key, info, x, y, w, h) {
  const r = Math.min(w / info.w, h / info.h);
  const iw = info.w * r, ih = info.h * r;
  cmds.push({ t: 'img', key, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}
