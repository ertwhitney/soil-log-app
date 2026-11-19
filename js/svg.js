// Render a draw list (see pdf.js) to an SVG string for on-screen preview.
import { measure } from './pdf.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const g = v => { const n = Math.round((v ?? 0) * 255); return `rgb(${n},${n},${n})`; };

export function toSvg(page, images = {}) {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" class="sheet" font-family="Helvetica, Arial, sans-serif">`,
    `<rect x="0" y="0" width="${page.width}" height="${page.height}" fill="#fff"/>`];
  for (const c of page.cmds) {
    if (c.t === 'line') {
      out.push(`<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="${g(c.gray)}" stroke-width="${c.w ?? 0.5}"${c.dash ? ` stroke-dasharray="${c.dash.join(' ')}"` : ''}/>`);
    } else if (c.t === 'rect') {
      const fill = c.fill !== undefined && c.fill !== null ? g(c.fill) : 'none';
      const stroke = c.stroke === false ? 'none' : '#000';
      out.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${fill}" stroke="${stroke}" stroke-width="${c.lw ?? 0.5}"${c.dash ? ` stroke-dasharray="${c.dash.join(' ')}"` : ''}/>`);
    } else if (c.t === 'text') {
      if (c.s === '' || c.s == null) continue;
      // Use our Helvetica metrics for alignment so preview matches the PDF.
      const w = measure(c.s, c.size, c.font);
      const shift = c.align === 'center' ? -w / 2 : c.align === 'right' ? -w : 0;
      const weight = c.font === 'B' ? ' font-weight="bold"' : '';
      const style = c.font === 'I' ? ' font-style="italic"' : '';
      const tr = c.rot === 90 ? ` transform="rotate(-90 ${c.x} ${c.y})"` : '';
      out.push(`<text x="${c.x + shift}" y="${c.y}" font-size="${c.size}"${weight}${style} fill="${g(c.gray)}" textLength="${w.toFixed(2)}" lengthAdjust="spacingAndGlyphs"${tr}>${esc(c.s)}</text>`);
    } else if (c.t === 'img' && images[c.key]) {
      out.push(`<image href="${images[c.key]}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" preserveAspectRatio="none"/>`);
    }
  }
  out.push('</svg>');
  return out.join('');
}
