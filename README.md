# Soil Log App (Phase 1)

Field soil test pit logging on an Android tablet → Form F (SS1)-style PDF with
Ch. 241 Profile / Condition added to each Soil Details box.

Works offline after the first load. All data stays on the device (browser storage)
until you **Save file** (a `.soillog.json` project file you can put in the project folder
on OneDrive and reopen on any device with **Open project file**).

## Daily use

1. **New project** → fill project name, applicant, municipality, date, job #.
2. **+ Blank pit** for the first pit → describe each horizon with the tap chips
   (designation, bottom depth, Munsell hue/value/chroma, texture, structure,
   consistence, redox). Fill Soil Details and the Septic (Ch. 241) section.
3. Every pit after that: **+ TP-n (copy of last)** on the project page, or
   **Copy → TP-n** on a pit page. Only change what differs.
   - With "Changing a bottom depth shifts the horizons below it" ticked, the
     − / + buttons move every lower boundary by the same amount.
   - Elevation and GPS are cleared on copy; everything else carries over.
4. **Save as typical profile…** stores a pit (e.g. "Telos typical") in the library.
   Start new pits from it with **+ From saved profile** (works across projects).
5. **Checks** on each pit flag missing Ch. 241 5(B)(2) items (texture, color,
   consistence), depth gaps, redox shallower than the limiting factor, drainage vs.
   redox and hydric mismatches, refusal vs. limiting factor, duplicate labels, and a
   Condition override that disagrees with Table 5E.
6. **Preview / PDF** → choose abbreviations (adds an auto-generated legend in the next
   free slot) or full words → **Download PDF**. Tick **Signature & seal** to print the
   images uploaded in Settings (off by default so drafts never go out stamped).

Soil condition is computed from Table 5E (limiting factor type + depth from the mineral
soil surface; with no limiting factor recorded, a pit deeper than 48" is B). You can
override it per pit; the override is flagged if it disagrees.

## Putting it on the tablet (one-time)

The app is plain static files: no build step, no server code, no external libraries.

**Live app:** https://ertwhitney.github.io/soil-log-app/
(GitHub repo: https://github.com/ertwhitney/soil-log-app, public, published by GitHub Pages
from the `main` branch.)

On the tablet: open the link in Chrome → ⋮ menu → **Add to Home screen / Install app**.
After the first load it runs offline. GPS and offline install need https (Pages provides it).

Only the app code is public. Your projects stay on the tablet and in the project files
you save. `.gitignore` keeps `.soillog.json` project files, PDFs and `.claude/` out of the repo.

**Updating:** after changing any file, bump `VERSION` in `sw.js`, then from this folder:

```powershell
git add -A; git commit -m "describe the change"; git push
```

Pages rebuilds in a minute or two. The tablet picks up the new version on the
second launch after that. (GitHub CLI is installed at
`%LOCALAPPDATA%\gh-cli\bin\gh.exe` if you need it.)

## Testing on this PC

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Then open http://localhost:8765. Use **Open project file** with
`sample/demo.soillog.json` to load demo data.

## Data safety

- Browser storage can be cleared by Android or by clearing Chrome's site data.
  **Save file** at the end of each field day (and copy it to the project folder).
- Use one browser tab at a time. Two open tabs can overwrite each other's changes.

## Files

| File | Purpose |
|---|---|
| `js/vocab.js` | Pick lists: horizons, Munsell, textures, structure, consistence, redox, drainage, HSG, Ch. 241 profiles |
| `js/model.js` | Data model, copy/shift logic, formatting, Table 5E condition, field checks, legend |
| `js/formf.js` | Page layout (all geometry in `LAYOUT`) → draw list |
| `js/pdf.js` | Dependency-free vector PDF writer (Helvetica, embedded PNG signature/seal) |
| `js/svg.js` | Same draw list → on-screen preview |
| `js/app.js` | Tablet UI |
| `js/store.js` | Device storage + project file import/export |
| `sw.js`, `manifest.webmanifest` | Offline + installable app |

## Roadmap

- **Phase 2:** drag-to-adjust layout editor (text boxes, horizon boundary lines,
  column widths) with per-pit overrides that survive data edits; combined
  Soil Survey + septic page variants.
- **Phase 3:** DXF export for BricsCAD (from the same draw list), photos, hand-off
  to the SeptiCAD HHE-200 soil-log workflow.
