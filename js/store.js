// Persistence: everything lives in this browser's localStorage on the tablet,
// plus explicit project-file export/import (JSON) for backup and the office PC.

const KEY = 'soillog.v1';

const defaults = () => ({
  projects: [],
  library: [],   // [{id, name, pit}]  saved typical profiles
  settings: {
    name: '', license: '', licenseLabel: 'SS License No.',
    abbreviations: true, formLabel: 'FORM F (SS1) Rev. 7/21',
    signature: '', seal: '', shiftBelow: true,
  },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  } catch (e) {
    console.warn('load failed', e);
    return defaults();
  }
}

let timer = null;
export function save(state, immediate = false) {
  const write = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { alert('Could not save on this device (storage full?). Export a project file now.\n' + e.message); }
  };
  clearTimeout(timer);
  if (immediate) write(); else timer = setTimeout(write, 300);
}

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportProject(project) {
  const data = { kind: 'soil-log-project', version: 1, exported: new Date().toISOString(), project };
  const name = (project.jobNo ? project.jobNo + '_' : '') + (project.name || 'project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_');
  download(name + '.soillog.json', new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
}

export function readProjectFile(file) {
  return file.text().then(t => {
    const d = JSON.parse(t);
    if (d.kind !== 'soil-log-project' || !d.project) throw new Error('Not a soil log project file');
    return d.project;
  });
}
