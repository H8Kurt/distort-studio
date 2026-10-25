import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const klecksDir = join(root, "vendor", "klecks");
const outDir = join(root, "web", "public", "klecks");

function run(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(" ")}  (${cwd})`);
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

if (!existsSync(klecksDir)) {
  console.error(`Klecks sources not found at ${klecksDir}`);
  process.exit(1);
}

if (!existsSync(join(klecksDir, "node_modules"))) {
  run("npm", ["ci"], klecksDir);
}

run("npm", ["run", "icon:build"], klecksDir);
run("npm", ["run", "lang:build"], klecksDir);
run("npm", ["run", "build:embed"], klecksDir);

const dist = join(klecksDir, "dist");
if (!existsSync(dist)) {
  console.error(`Klecks build produced no dist at ${dist}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(dist)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
  cpSync(join(dist, entry), join(outDir, entry), { recursive: true });
}

console.log(`\n✔ Klecks embed copied to ${outDir}`);
