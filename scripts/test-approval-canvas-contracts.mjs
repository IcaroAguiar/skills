import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = join(repositoryRoot, "skills/approval-canvas");
const template = join(skill, "references/template");

function requireText(source, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `${label}: missing ${JSON.stringify(fragment)}`);
  }
}

function checkFidelity(directory) {
  return spawnSync(process.execPath, [join(directory, "check-fidelity.mjs")], { encoding: "utf8" });
}

// The shipped template shows only what the UI package renders.
const clean = checkFidelity(template);
assert.equal(clean.status, 0, `template must pass check-fidelity:\n${clean.stderr}`);

// A canvas-only restyle of a real component is caught, and so is an inline <style>.
const scratch = await mkdtemp(join(tmpdir(), "approval-canvas-fidelity-"));
try {
  await cp(template, scratch, { recursive: true });
  const css = await readFile(join(scratch, "src/canvas.css"), "utf8");
  await writeFile(
    join(scratch, "src/canvas.css"),
    `${css}\n.essential-table tbody tr:last-child { border-bottom: 0; }\n@media (max-width: 767px) { .canvas-shell [data-sidebar="sidebar"] { padding-top: 0; } }\n`,
  );
  const dirty = checkFidelity(scratch);
  assert.equal(dirty.status, 1, "a restyled component must fail check-fidelity");
  requireText(dirty.stderr, [".essential-table tbody tr:last-child", '.canvas-shell [data-sidebar="sidebar"]'], "check-fidelity report");

  await writeFile(join(scratch, "src/canvas.css"), css);
  await writeFile(join(scratch, "src/screens/inline.tsx"), "export const X = () => <style>{'td{border:0}'}</style>;\n");
  const inline = checkFidelity(scratch);
  assert.equal(inline.status, 1, "an inline <style> must fail check-fidelity");
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// The workflow keeps the fidelity rules and the parity gate.
const skillText = await readFile(join(skill, "SKILL.md"), "utf8");
requireText(
  skillText,
  ["The canvas never restyles the UI package", "check-fidelity.mjs", "product's default theme", "Parity gate before the PR", "pairs.mjs", "references/handoff-brief.md"],
  "approval-canvas SKILL.md",
);
const handoff = await readFile(join(skill, "references/handoff-brief.md"), "utf8");
requireText(handoff, ["Deviations need the user", "Parity gate", "same theme"], "handoff-brief.md");
const readme = await readFile(join(skill, "references/rounds-readme-template.md"), "utf8");
requireText(readme, ["## Mudanças no pacote de UI", "## Desvios aprovados"], "rounds-readme-template.md");

console.log("Validated approval-canvas fidelity check, parity gate, and hand-off contracts.");
