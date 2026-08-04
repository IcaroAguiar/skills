import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function read(relativePath) {
  return readFile(join(repositoryRoot, relativePath), "utf8");
}

async function collectMarkdown(relativeRoot) {
  const absoluteRoot = join(repositoryRoot, relativeRoot);
  const files = [];

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
    }
  }

  await visit(absoluteRoot);
  return files;
}

function requireText(source, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `${label}: missing ${JSON.stringify(fragment)}`);
  }
}

async function assertLocalLinks(skillRoot) {
  for (const file of await collectMarkdown(skillRoot)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#", 1)[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      const resolved = resolve(dirname(file), decodeURIComponent(target));
      await access(resolved).catch(() => {
        throw new Error(`${relative(repositoryRoot, file)}: broken local link ${target}`);
      });
    }
  }
}

const design = await read("skills/design-direction/SKILL.md");
const designWorkflows = await read("skills/design-direction/references/workflows.md");
const designPortability = await read("skills/design-direction/references/portability.md");
const antiPatterns = await read("skills/design-direction/references/antipattern-index.md");

requireText(
  design,
  [
    "**Create**",
    "**Review**",
    "**Redesign**",
    "**Implement**",
    "**Capture preference**",
    "Enter\n`Implement` only when",
    "request authorization before editing",
    "before/after pair",
    "same state, viewport, theme, data condition",
  ],
  "design-direction routing",
);
requireText(
  designWorkflows,
  [
    "## Review",
    "## Redesign",
    "## Implement",
    "ask whether to accept, refine, or revert",
    "Do not mutate the skill before explicit approval",
  ],
  "design-direction workflows",
);
requireText(
  antiPatterns,
  ["Context dependency:", "Positive target:", "Exception considered:", "Authoritative criterion:"],
  "anti-pattern evidence contract",
);
requireText(designPortability, ["## Codex", "## Claude Code", "## Cursor", "## Generic agent", "## Parity test"], "design portability");

const art = await read("skills/art-direction/SKILL.md");
const explore = await read("skills/art-direction/workflows/explore.md");
const refine = await read("skills/art-direction/workflows/refine.md");
const execute = await read("skills/art-direction/workflows/execute.md");
const translate = await read("skills/art-direction/workflows/translate-reference.md");
const authorship = await read("skills/art-direction/references/authorship-evaluation.md");
const artPortability = await read("skills/art-direction/references/portability.md");
const decision = await read("skills/art-direction/templates/direction-decision.md");

requireText(
  art,
  [
    "**explore**",
    "**refine**",
    "**translate-reference**",
    "**execute**",
    "**audit**",
    "passing context lock from `design-direction`",
    "before/after pair",
    "ask the user to accept, refine, or reject",
  ],
  "art-direction routing",
);
requireText(
  explore,
  [
    "Ask at most four high-impact questions",
    "Use the exact surface that would change",
    "Produce at most two directions",
    "Stop before production changes",
    "data and state values",
    "viewport, device, platform, theme, and locale",
  ],
  "exploration boundary",
);
requireText(
  refine,
  [
    "governing thesis is already approved",
    "smallest coherent set",
    "same evidence conditions",
    "accept, refine, or\n   revert",
  ],
  "refinement boundary",
);
requireText(
  execute,
  [
    "already explicit or approved",
    "Record or load the [direction decision]",
    "equivalent before/after evidence",
    "revalidation passes or names exact blockers",
  ],
  "execution boundary",
);
requireText(
  translate,
  [
    "not a costume to copy",
    "What must not be copied:",
    "route to `explore`",
    "next mode and approval status",
  ],
  "reference translation boundary",
);
requireText(
  authorship,
  [
    "Score only observable evidence",
    "Do not calculate an approving average",
    "non-equivalent exploration prototypes",
    "explicit user approval",
  ],
  "authorship limiters",
);
assert.equal((authorship.match(/^\d+\. /gm) ?? []).length, 10, "authorship evaluation must keep ten axes");
requireText(
  decision,
  [
    "Status: awaiting approval | approved | user-authorized execution | rejected | refine",
    "Comparison conditions:",
    "Approved:",
    "Rejected:",
    "Unresolved:",
    "Approval evidence:",
  ],
  "direction decision artifact",
);
requireText(artPortability, ["**Codex:**", "**Claude Code:**", "**Cursor:**", "**Generic agent:**", "## Parity test"], "art portability");

const allSources = `${design}\n${designWorkflows}\n${antiPatterns}\n${art}\n${explore}\n${refine}\n${execute}\n${translate}\n${authorship}`;
for (const forbidden of [/round-\d+/i, /seed-\d+/i, /candidate-knowledge/i, /controlled-runs/i, /blind-three-stage/i]) {
  assert.ok(!forbidden.test(allSources), `laboratory mechanic leaked into published contracts: ${forbidden}`);
}

await assertLocalLinks("skills/design-direction");
await assertLocalLinks("skills/art-direction");

console.log("Validated design-direction and art-direction routing, approval, comparison, scoring, portability, and local-link contracts.");
