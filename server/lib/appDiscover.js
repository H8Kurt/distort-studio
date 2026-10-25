const fs = require('fs');
const os = require('os');
const path = require('path');

const HOME = os.homedir();

const DESKTOP_DIRS = [
  '/usr/share/applications',
  '/usr/local/share/applications',
  '/var/lib/flatpak/exports/share/applications',
  '/var/lib/snapd/desktop/applications',
  path.join(HOME, '.local/share/applications'),
  path.join(HOME, '.local/share/flatpak/exports/share/applications'),
];

const BIN_DIRS = [
  '/usr/bin',
  '/usr/local/bin',
  '/usr/sbin',
  '/snap/bin',
  '/var/lib/flatpak/exports/bin',
  path.join(HOME, '.local/bin'),
  path.join(HOME, '.local/share/flatpak/exports/bin'),
];

const KNOWN_BINARIES = {
  krita: 'Krita',
  blender: 'Blender',
  reaper: 'REAPER',
  reaper5: 'REAPER',
  gimp: 'GIMP',
  'gimp-3': 'GIMP 3',
  inkscape: 'Inkscape',
  obs: 'OBS Studio',
  audacity: 'Audacity',
  ardour: 'Ardour',
  ardour7: 'Ardour 7',
  mixxx: 'Mixxx',
  lmms: 'LMMS',
  hydrogen: 'Hydrogen',
  zrythm: 'Zrythm',
  carla: 'Carla',
  qtractor: 'Qtractor',
  musescore: 'MuseScore',
  musescore3: 'MuseScore 3',
  musescore4: 'MuseScore 4',
  darktable: 'darktable',
  rawtherapee: 'RawTherapee',
  shotcut: 'Shotcut',
  kdenlive: 'Kdenlive',
  'openshot-qt': 'OpenShot',
};

function isExecutable(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function realKey(filePath) {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return filePath;
  }
}

function searchDirs() {
  const extra = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const dirs = [...BIN_DIRS, ...extra];
  return [...new Set(dirs)];
}

function resolveBinary(bin) {
  if (bin.startsWith('/')) return isExecutable(bin) ? bin : null;
  for (const dir of searchDirs()) {
    const candidate = path.join(dir, bin);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function tokenize(str) {
  const out = [];
  const re = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+)/g;
  let m = re.exec(str);
  while (m) {
    out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
    m = re.exec(str);
  }
  return out;
}

function parseExec(execStr) {
  let tokens = tokenize(execStr);
  if (!tokens.length) return null;

  let i = 0;
  if (tokens[i] === 'env') {
    i += 1;
    while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i += 1;
  }
  if (i >= tokens.length) return null;

  const resolved = resolveBinary(tokens[i]);
  if (!resolved) return null;

  const args = tokens
    .slice(i + 1)
    .filter((t) => !t.startsWith('%') && !t.startsWith('@@') && t !== '@@');

  return { path: resolved, args };
}

function parseDesktopFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const entry = {};
  let inEntry = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      inEntry = line === '[Desktop Entry]';
      continue;
    }
    if (!inEntry) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (entry[key] === undefined) entry[key] = value;
  }

  if (!entry.Exec) return null;
  if (entry.Type && entry.Type !== 'Application') return null;
  if (entry.NoDisplay === 'true' || entry.Hidden === 'true') return null;

  const parsed = parseExec(entry.Exec);
  if (!parsed) return null;

  const name = entry['Name[ru]'] || entry.Name;
  if (!name) return null;

  return {
    name,
    path: parsed.path,
    args: parsed.args,
    icon: entry.Icon || null,
    categories: entry.Categories || null,
    source: 'desktop',
  };
}

function listDesktopFiles() {
  const files = [];
  for (const dir of DESKTOP_DIRS) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name.endsWith('.desktop')) files.push(path.join(dir, name));
    }
  }
  return files;
}

function nameScore(name) {
  let score = name.length;
  if (name.includes('(')) score += 100;
  return score;
}

function scanDesktopApps() {
  const byPath = new Map();
  for (const file of listDesktopFiles()) {
    const app = parseDesktopFile(file);
    if (!app) continue;
    const key = realKey(app.path);
    const existing = byPath.get(key);
    if (!existing || nameScore(app.name) < nameScore(existing.name)) {
      byPath.set(key, app);
    }
  }
  return byPath;
}

function scanKnownBinaries(found) {
  for (const dir of searchDirs()) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const present = new Set(entries);
    for (const [bin, pretty] of Object.entries(KNOWN_BINARIES)) {
      if (!present.has(bin)) continue;
      const full = path.join(dir, bin);
      if (!isExecutable(full)) continue;
      const key = realKey(full);
      if (found.has(key)) continue;
      found.set(key, {
        name: pretty,
        path: full,
        args: [],
        icon: null,
        categories: null,
        source: 'binary',
      });
    }
  }
}

function discoverApps() {
  const found = scanDesktopApps();
  scanKnownBinaries(found);

  const byName = new Map();
  for (const app of found.values()) {
    const existing = byName.get(app.name);
    if (!existing || nameScore(app.name) < nameScore(existing.name)) {
      byName.set(app.name, app);
    }
  }

  return [...byName.values()]
    .map((app) => ({ ...app, args: app.args.length ? app.args.join(' ') : null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

module.exports = { discoverApps };
