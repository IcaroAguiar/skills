#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, "..");
const examplesDir = join(skillRoot, "assets", "report-kit", "examples");
const outRoot = join(tmpdir(), "interactive-html-reports-smoke");

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

const examples = readdirSync(examplesDir)
  .filter((file) => file.endsWith("-report.json"))
  .sort();

if (examples.length !== 6) {
  console.error(`Expected 6 example reports, found ${examples.length}.`);
  process.exit(1);
}

for (const example of examples) {
  const slug = example.replace(/-report\.json$/, "");
  const input = join(examplesDir, example);
  const output = join(outRoot, slug, "index.html");
  const generate = spawnSync(process.execPath, [join(__dirname, "generate-report.mjs"), "--input", input, "--output", output], {
    stdio: "inherit",
  });
  if (generate.status !== 0) process.exit(generate.status ?? 1);
  if (!existsSync(output)) {
    console.error(`Expected generated file missing: ${output}`);
    process.exit(1);
  }
  const validate = spawnSync(process.execPath, [join(__dirname, "validate-report.mjs"), output], { stdio: "inherit" });
  if (validate.status !== 0) process.exit(validate.status ?? 1);
}

console.log(`Smoke passed for ${examples.length} example reports in ${outRoot}`);
