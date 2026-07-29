#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const DEFAULT_DIRS = ["app", "src", "components", "pages"];
const EXTENSIONS = /\.(tsx|jsx|ts|js|css|scss)$/;

const SUSPICIOUS_PATTERNS = [
  { label: "shadow utility", regex: /\bshadow(?:-[a-z0-9]+)?\b/g },
  { label: "border utility", regex: /\bborder(?:-[a-z0-9/[\]#:.]+)?\b/g },
  { label: "large radius", regex: /\brounded-(?:xl|2xl|3xl|full)\b/g },
  { label: "white surface", regex: /\bbg-white\b/g },
  { label: "card component", regex: /\b(Card|CardContent|CardHeader|CardFooter)\b/g },
  { label: "panel/surface naming", regex: /\b(Panel|Surface|Elevated|ContainerCard)\b/g }
];

const ALLOWED_CONTEXT_HINTS = [
  "input",
  "textarea",
  "select",
  "button",
  "dialog",
  "modal",
  "popover",
  "dropdown",
  "tooltip",
  "toast",
  "table"
];

function getChangedFiles() {
  try {
    const output = execSync("git diff --name-only --cached && git diff --name-only", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return [...new Set(output.split("\n").map((x) => x.trim()).filter(Boolean))]
      .filter((file) => EXTENSIONS.test(file))
      .filter((file) => fs.existsSync(path.join(ROOT, file)));
  } catch {
    return [];
  }
}

function walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];

  const entries = fs.readdirSync(abs, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const full = path.join(abs, entry.name);
    const rel = path.relative(ROOT, full);

    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "build", ".git"].includes(entry.name)) return [];
      return walk(rel);
    }

    if (!EXTENSIONS.test(entry.name)) return [];
    return [rel];
  });
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

const changedFiles = getChangedFiles();
const files = changedFiles.length ? changedFiles : DEFAULT_DIRS.flatMap(walk);
const findings = [];

for (const file of files) {
  const abs = path.join(ROOT, file);
  const content = fs.readFileSync(abs, "utf8");
  const lower = content.toLowerCase();
  const likelyAllowedContext = ALLOWED_CONTEXT_HINTS.some((hint) => lower.includes(hint));

  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = [...content.matchAll(pattern.regex)];

    for (const match of matches) {
      const line = lineNumberForIndex(content, match.index ?? 0);
      findings.push({
        file,
        line,
        label: pattern.label,
        value: match[0],
        likelyAllowedContext
      });
    }
  }
}

const risky = findings.filter((item) => !item.likelyAllowedContext);

if (!findings.length) {
  console.log("Surface audit passed: no suspicious card/border/shadow patterns found.");
  process.exit(0);
}

console.log("\nSurface audit findings:\n");

for (const item of findings) {
  const marker = item.likelyAllowedContext ? "review" : "risky";
  console.log(`${marker} ${item.file}:${item.line} - ${item.label}: ${item.value}`);
}

console.log(`
Rules:
- Cards, borders, large radius, shadows, and white surfaces are not neutral.
- Each finding must be visibly present in the reference, required by the design system, necessary for input/form affordance, or explicitly justified.
- Remove unjustified surfaces before completion.
`);

if (risky.length > 0) {
  process.exit(1);
}
