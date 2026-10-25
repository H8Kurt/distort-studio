import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const audiomassDir = join(root, "vendor", "AudioMass", "src");
const outDir = join(root, "web", "public", "audiomass");

if (!existsSync(audiomassDir)) {
  console.error(`AudioMass sources not found at ${audiomassDir}`);
  process.exit(1);
}

// Не копируем серверные/альтернативные файлы и маркетинговую страницу about.
// AudioMass — статическое приложение, отдельная сборка ему не нужна.
const SKIP_FILES = new Set([
  "audiomass-server.go",
  "audiomass-server.py",
  "index-cache.html",
  "index-final.html",
  "audiomass.appcache",
  "about.html",
]);
const SKIP_DIRS = new Set(["about"]);

function shouldCopy(src) {
  const rel = src.slice(audiomassDir.length + 1);
  if (!rel) return true;
  const parts = rel.split(/[\\/]/);
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  const name = parts[parts.length - 1];
  if (SKIP_FILES.has(name)) return false;
  if (name.endsWith(".br")) return false;
  return true;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(audiomassDir, outDir, { recursive: true, filter: shouldCopy });

// Выкидываем внешний apple-touch-icon из index.html, чтобы приложение работало
// полностью офлайн и не тянуло ресурсы с audiomass.co.
const indexPath = join(outDir, "index.html");
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  const patched = html.replace(
    /\s*<link rel="apple-touch-icon"[^>]*>\s*\n?/g,
    "\n"
  );
  if (patched !== html) writeFileSync(indexPath, patched);
}

console.log(`\n✔ AudioMass copied to ${outDir}`);
