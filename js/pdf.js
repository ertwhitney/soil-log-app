// Minimal vector PDF writer (no dependencies, works offline).
// Draw commands use points, origin top-left, y down (page 612 x 792 = US Letter).
//   {t:'line', x1,y1,x2,y2, w, gray, dash:[on,off]}
//   {t:'rect', x,y,w,h, lw, fill:gray|null, stroke:true|false, dash}
//   {t:'text', x,y, s, size, font:'R'|'B'|'I', align:'left'|'center'|'right', rot:0|90, gray}
//   {t:'img',  x,y,w,h, key}
// Fonts are the PDF standard Helvetica family (no embedding needed).

const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

export function measure(str, size, font = 'R') {
  const tbl = font === 'B' ? W_BOLD : W_REG;
  let w = 0;
  for (const ch of String(str)) {
    const c = ch.charCodeAt(0);
    w += (c >= 32 && c <= 126) ? tbl[c - 32] : 556;
  }
  return w * size / 1000;
}

export function wrap(str, width, size, font = 'R') {
  const out = [];
  for (const para of String(str ?? '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (!line || measure(t, size, font) <= width) line = t;
      else { out.push(line); line = w; }
    }
    if (line) out.push(line);
  }
  return out;
}

const SUBS = { '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '″': '"', '′': "'", '≥': '>=', '≤': '<=' };
function pdfStr(s) {
  let out = '';
  for (const ch of String(s)) {
    let c = SUBS[ch] ?? ch;
    for (const cc of c) {
      const code = cc.charCodeAt(0);
      if (cc === '(' || cc === ')' || cc === '\\') out += '\\' + cc;
      else if (code < 32) out += ' ';
      else if (code < 128 || (code >= 160 && code < 256)) out += cc;
      else out += '?';
    }
  }
  return '(' + out + ')';
}
const f = n => (Math.round(n * 100) / 100).toString();

function contentStream(cmds, H, imgNames) {
  const o = [];
  for (const c of cmds) {
    if (c.t === 'line') {
      o.push(`q ${f(c.gray ?? 0)} G ${f(c.w ?? 0.5)} w ${c.dash ? `[${c.dash.join(' ')}] 0 d` : ''} ${f(c.x1)} ${f(H - c.y1)} m ${f(c.x2)} ${f(H - c.y2)} l S Q`);
    } else if (c.t === 'rect') {
      const y = H - c.y - c.h;
      if (c.fill !== undefined && c.fill !== null) o.push(`q ${f(c.fill)} g ${f(c.x)} ${f(y)} ${f(c.w)} ${f(c.h)} re f Q`);
      if (c.stroke !== false) o.push(`q 0 G ${f(c.lw ?? 0.5)} w ${c.dash ? `[${c.dash.join(' ')}] 0 d` : ''} ${f(c.x)} ${f(y)} ${f(c.w)} ${f(c.h)} re S Q`);
    } else if (c.t === 'text') {
      if (c.s === '' || c.s === null || c.s === undefined) continue;
      const font = { R: 'F1', B: 'F2', I: 'F3' }[c.font || 'R'];
      const w = measure(c.s, c.size, c.font);
      const shift = c.align === 'center' ? -w / 2 : c.align === 'right' ? -w : 0;
      let tm;
      if (c.rot === 90) tm = `0 1 -1 0 ${f(c.x)} ${f(H - c.y + shift)} Tm`;
      else tm = `1 0 0 1 ${f(c.x + shift)} ${f(H - c.y)} Tm`;
      o.push(`BT /${font} ${f(c.size)} Tf ${f(c.gray ?? 0)} g ${tm} ${pdfStr(c.s)} Tj ET`);
    } else if (c.t === 'img') {
      const name = imgNames[c.key];
      if (name) o.push(`q ${f(c.w)} 0 0 ${f(c.h)} ${f(c.x)} ${f(H - c.y - c.h)} cm /${name} Do Q`);
    }
  }
  return o.join('\n');
}

const latin1 = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };

async function deflate(bytes) {
  const cs = new CompressionStream('deflate');
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Decode an image data URL to raw RGB + alpha (keeps PNG transparency for signatures/seals).
async function decodeImage(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
  const n = cv.width * cv.height;
  const rgb = new Uint8Array(n * 3), a = new Uint8Array(n);
  for (let i = 0; i < n; i++) { rgb[i * 3] = data[i * 4]; rgb[i * 3 + 1] = data[i * 4 + 1]; rgb[i * 3 + 2] = data[i * 4 + 2]; a[i] = data[i * 4 + 3]; }
  return { w: cv.width, h: cv.height, rgb: await deflate(rgb), alpha: await deflate(a) };
}

// pages: [{cmds, width, height}], images: {key: dataUrl}
export async function buildPdf(pages, images = {}, meta = {}) {
  const objs = []; // index = obj number - 1; each is array of Uint8Array/strings
  const alloc = () => { objs.push(null); return objs.length; };
  const set = (n, ...parts) => { objs[n - 1] = parts; };

  const catalog = alloc(), pagesObj = alloc(), f1 = alloc(), f2 = alloc(), f3 = alloc(), info = alloc();
  set(f1, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  set(f2, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  set(f3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
  set(info, `<< /Title ${pdfStr(meta.title || 'Soil Logs')} /Producer (Soil Log App) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}) >>`);

  // Images (only the ones actually used)
  const used = new Set(); pages.forEach(p => p.cmds.forEach(c => c.t === 'img' && used.add(c.key)));
  const imgNames = {}; let xobjDict = '';
  let i = 0;
  for (const key of used) {
    if (!images[key]) continue;
    try {
      const im = await decodeImage(images[key]);
      const smask = alloc(), obj = alloc();
      set(smask, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${im.alpha.length} >>\nstream\n`, im.alpha, '\nendstream');
      set(obj, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${smask} 0 R /Length ${im.rgb.length} >>\nstream\n`, im.rgb, '\nendstream');
      const name = 'Im' + (++i);
      imgNames[key] = name; xobjDict += `/${name} ${obj} 0 R `;
    } catch (e) { console.warn('image failed', key, e); }
  }

  const kids = [];
  for (const p of pages) {
    const W = p.width || 612, H = p.height || 792;
    const body = await deflate(latin1(contentStream(p.cmds, H, imgNames)));
    const content = alloc(), page = alloc();
    set(content, `<< /Length ${body.length} /Filter /FlateDecode >>\nstream\n`, body, '\nendstream');
    set(page, `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${content} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> ${xobjDict ? `/XObject << ${xobjDict}>>` : ''} >> >>`);
    kids.push(page);
  }
  set(pagesObj, `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
  set(catalog, `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  // Serialize
  const chunks = []; let offset = 0; const offsets = [];
  const push = part => { const b = typeof part === 'string' ? latin1(part) : part; chunks.push(b); offset += b.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objs.forEach((parts, idx) => {
    offsets[idx] = offset;
    push(`${idx + 1} 0 obj\n`); parts.forEach(push); push('\nendobj\n');
  });
  const xref = offset;
  let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { x += String(o).padStart(10, '0') + ' 00000 n \n'; });
  push(x);
  push(`trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(offset); let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
