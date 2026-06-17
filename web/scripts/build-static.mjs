import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(scriptDir, "..");
const apps = ["homepage", "replayer"];
const dist = join(root, "dist");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function ensureDependencies(app) {
  const appDir = join(root, app);
  run("npm", ["ci"], { cwd: appDir });
}

for (const app of apps) {
  ensureDependencies(app);
  run("npm", ["run", "build"], { cwd: join(root, app) });
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "replayer"), { recursive: true });

cpSync(join(root, "homepage", "dist"), dist, { recursive: true });
cpSync(join(root, "replayer", "dist"), join(dist, "replayer"), {
  recursive: true,
});
