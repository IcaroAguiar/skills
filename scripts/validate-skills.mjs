import { readdir, readFile } from "node:fs/promises";
import { extname, relative } from "node:path";

const skillsRoot = new URL("../skills/", import.meta.url);
const repositoryRoot = new URL("../", import.meta.url);
const publicCorpusRoots = [
  new URL("../.github/", import.meta.url),
  new URL("../scripts/", import.meta.url),
  skillsRoot,
];
const entries = await readdir(skillsRoot, { withFileTypes: true });
const seen = new Set();
const skillSources = new Map();
const retiredSkillNames = new Set([
  ["split", "review"].join("-"),
  ["hardening", "agentic", "code"].join("-"),
  ["review", "loop"].join("-"),
]);
const requiredSkillNames = new Set(["code-review"]);
const publicTextExtensions = new Set([".json", ".md", ".mjs", ".py", ".toml", ".ts", ".yaml", ".yml"]);
let failures = 0;

async function publicTextFiles(directoryUrl) {
  const files = [];
  for (const directoryEntry of await readdir(directoryUrl, { withFileTypes: true })) {
    if (directoryEntry.name === ".git" || directoryEntry.name === "node_modules") continue;
    const entryUrl = new URL(`${directoryEntry.name}${directoryEntry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (directoryEntry.isDirectory()) {
      files.push(...await publicTextFiles(entryUrl));
    } else if (publicTextExtensions.has(extname(directoryEntry.name))) {
      files.push(entryUrl);
    }
  }
  return files;
}

for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  if (retiredSkillNames.has(entry.name)) {
    console.error(`${entry.name}: retired skill directory must not exist`);
    failures += 1;
    continue;
  }
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
  if (name) {
    seen.add(name);
    skillSources.set(name, source);
  }

  for (const retiredName of retiredSkillNames) {
    if (source.includes(`$${retiredName}`) || source.includes(`skills/${retiredName}`)) {
      console.error(`${entry.name}: references retired skill ${retiredName}`);
      failures += 1;
    }
  }
}

for (const requiredName of requiredSkillNames) {
  if (!seen.has(requiredName)) {
    console.error(`${requiredName}: required replacement skill is missing`);
    failures += 1;
  }
}

const codeReview = skillSources.get("code-review") ?? "";
for (const phrase of ["Stable review gate", "dispatch exactly one fresh", "git diff <base>...<head>", "Delta review"]) {
  if (!codeReview.includes(phrase)) {
    console.error(`code-review: missing required contract ${phrase}`);
    failures += 1;
  }
}
const reviewStandards = await readFile(new URL("../skills/code-review/references/review-standards.md", import.meta.url), "utf8");
for (const gate of ["CORRECTNESS", "SIMPLIFICATION", "SEMANTICS", "DOCUMENTATION", "VERIFICATION"]) {
  if (!reviewStandards.includes(`\`${gate}\``)) {
    console.error(`code-review: missing ${gate} standard`);
    failures += 1;
  }
}
if (!reviewStandards.includes("Tautological tests considered harmful")) {
  console.error("code-review: missing tautological-test standard");
  failures += 1;
}

const rootPublicFiles = (await readdir(repositoryRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && publicTextExtensions.has(extname(entry.name)))
  .map((entry) => new URL(entry.name, repositoryRoot));
const publicFiles = [
  ...rootPublicFiles,
  ...(await Promise.all(publicCorpusRoots.map((root) => publicTextFiles(root)))).flat(),
];

for (const fileUrl of publicFiles) {
  const source = await readFile(fileUrl, "utf8");
  const filePath = relative(new URL(".", repositoryRoot).pathname, fileUrl.pathname);
  for (const retiredName of retiredSkillNames) {
    const escapedName = retiredName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const retiredReference = new RegExp(`(^|[^a-z0-9-])${escapedName}([^a-z0-9-]|$)`, "i");
    if (retiredReference.test(source)) {
      console.error(`${filePath}: contains retired skill identifier ${retiredName}`);
      failures += 1;
    }
  }
}

if (failures) process.exit(1);
console.log(`Validated ${seen.size} skills.`);
