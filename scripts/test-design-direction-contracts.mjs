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

const root = "skills/design-direction";
const design = await read(`${root}/SKILL.md`);
const designWorkflows = await read(`${root}/references/workflows.md`);
const designPortability = await read(`${root}/references/portability.md`);
const antiPatterns = await read(`${root}/references/antipattern-index.md`);
const taste = await read(`${root}/references/taste-profile.md`);
const compositions = await read(`${root}/references/composition-models.md`);
const explore = await read(`${root}/workflows/explore.md`);
const refine = await read(`${root}/workflows/refine.md`);
const execute = await read(`${root}/workflows/execute.md`);
const translate = await read(`${root}/workflows/translate-reference.md`);
const authorship = await read(`${root}/references/authorship-evaluation.md`);
const decision = await read(`${root}/templates/direction-decision.md`);

requireText(
  design,
  [
    "**Create**",
    "**Redesign**",
    "**Review**",
    "**Implement**",
    "**Refine**",
    "**Explore**",
    "**Translate reference**",
    "**Capture preference**",
    "Enter Implement only when",
    "request authorization before editing",
    "before/after pair",
    "same state, viewport, theme, and data",
    "taste-profile.md",
    "## 4. Choose the expression",
    "Signature element:",
    "## 7. Pass the anti-generic gate",
  ],
  "design-direction routing",
);
requireText(
  designWorkflows,
  [
    "## Review",
    "## Redesign",
    "## Implement",
    "Choose the expression (SKILL.md step 4)",
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
requireText(taste, ["## Discipline", "## Expression", "## Verdict log", "One primary action per screen"], "taste profile");
requireText(compositions, ["## Collections have more than one shape", "framed table is the generic fallback"], "collection shapes");
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

const allSources = `${design}\n${designWorkflows}\n${antiPatterns}\n${taste}\n${explore}\n${refine}\n${execute}\n${translate}\n${authorship}`;
for (const forbidden of [/round-\d+/i, /seed-\d+/i, /candidate-knowledge/i, /controlled-runs/i, /blind-three-stage/i]) {
  assert.ok(!forbidden.test(allSources), `laboratory mechanic leaked into published contracts: ${forbidden}`);
}

await assertLocalLinks(root);

console.log("Validated design-direction routing, expression, taste profile, approval, comparison, scoring, portability, and local-link contracts.");
