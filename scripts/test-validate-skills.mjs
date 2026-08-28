#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "skills-catalog-validator-"));
const retired = ["code", "review"].join("-");

function run(expected, diagnostic) {
  const result = spawnSync(process.execPath, [join(fixtureRoot, "scripts", "validate-skills.mjs")], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`);
  if (diagnostic) assert.match(`${result.stdout}\n${result.stderr}`, diagnostic);
}

try {
  cpSync(join(sourceRoot, "scripts"), join(fixtureRoot, "scripts"), { recursive: true });
  cpSync(join(sourceRoot, ".github"), join(fixtureRoot, ".github"), { recursive: true });
  mkdirSync(join(fixtureRoot, "skills"));
  for (const name of ["antigravity-executor", "art-direction", "design-direction", "record-real-dev-e2e", "summarize"]) {
    cpSync(join(sourceRoot, "skills", name), join(fixtureRoot, "skills", name), { recursive: true });
  }
  for (const name of ["README.md", "GLOSSARY.md", "AGENTS.md"]) {
    cpSync(join(sourceRoot, name), join(fixtureRoot, name));
  }

  run(0);

  const retiredDir = join(fixtureRoot, "skills", retired);
  mkdirSync(retiredDir);
  writeFileSync(join(retiredDir, "SKILL.md"), `---\nname: ${retired}\ndescription: retired fixture\n---\n`);
  run(1, new RegExp(`${retired}: retired skill directory must not exist`));
  rmSync(retiredDir, { recursive: true });

  const readme = join(fixtureRoot, "README.md");
  const originalReadme = readFileSync(readme, "utf8");
  writeFileSync(readme, `${originalReadme}\n$${retired}\n`);
  run(1, new RegExp(`README.md: contains retired skill identifier ${retired}`));
  writeFileSync(readme, originalReadme);

  rmSync(join(fixtureRoot, "skills", "summarize"), { recursive: true });
  run(1, /summarize: required replacement skill is missing/);

  console.log("PASS catalogue validator negative contracts");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
