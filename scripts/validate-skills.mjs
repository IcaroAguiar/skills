import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const skillsRoot = new URL("../skills/", import.meta.url);
const entries = await readdir(skillsRoot, { withFileTypes: true });
const seen = new Set();
let failures = 0;

for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const skillPath = new URL(`${entry.name}/SKILL.md`, skillsRoot);
  let source;
  try {
    source = await readFile(skillPath, "utf8");
  } catch {
    console.error(`${entry.name}: missing SKILL.md`);
    failures += 1;
    continue;
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const name = match?.[1].match(/^name:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
  const description = match?.[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();

  if (!name || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) {
    console.error(`${entry.name}: invalid or missing frontmatter name`);
    failures += 1;
  }
  if (!description) {
    console.error(`${entry.name}: missing frontmatter description`);
    failures += 1;
  }
  if (name && seen.has(name)) {
    console.error(`${entry.name}: duplicate skill name ${name}`);
    failures += 1;
  }
  if (name) seen.add(name);
}

if (failures) process.exit(1);
console.log(`Validated ${seen.size} skills.`);
