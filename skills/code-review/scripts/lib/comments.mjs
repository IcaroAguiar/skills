import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { git, reviewable } from "./repo.mjs";

// Past COMMENT_BLOCK no reviewer runs; above COMMENT_FLAG the reviewer judges each comment (references/review-standards.md).
const C_LIKE = /\.[cm]?[jt]sx?$|\.(go|rs|java|kts?|swift|c|cc|cpp|h|hpp|cs|scala|dart|php)$/;
const HASH = /\.(py|rb|sh|bash|zsh|ex|exs|pl)$/;
const COMMENT_DIRECTIVE = /\b(eslint|oxlint|biome-ignore|prettier-ignore|istanbul|c8 ignore|nosemgrep|noqa|type: *ignore|pragma)\b|@ts-|^(\/\/|#) *(ok|ruleid|todoruleid):/i;
const TEST_FILE = /(^|\/)(__tests__|__mocks__|tests?|spec|e2e|fixtures?)\/|\.(test|spec|e2e)\.[^/]+$|(^|\/)test[-_][^/]+$|_test\.[^/]+$/;
const COMMENT_FLAG = { lines: 10, share: 0.03 };
const COMMENT_BLOCK = { lines: 10, share: 0.05 };
const MAX_COMMENT_SCAN_BYTES = 2 * 1024 * 1024;

const syntaxOf = (file) => (!reviewable(file) || TEST_FILE.test(file) ? null : C_LIKE.test(file) ? "c" : HASH.test(file) ? "hash" : null);

// Tracks quotes, template literals and block comments; regex literals are not tracked.
function classify(text, syntax) {
  const lines = text.split("\n");
  const kind = (line, comment) => (!line ? "blank" : comment ? (COMMENT_DIRECTIVE.test(line) ? "directive" : "comment") : "code");
  if (syntax === "hash") return lines.map((raw) => kind(raw.trim(), /^#(?!!)/.test(raw.trim())));
  let state = "code";
  let depth = 0;
  const templates = [];
  return lines.map((raw) => {
    const line = raw.trim();
    const result = kind(line, state === "block" || (state === "code" && /^\/[/*]/.test(line)));
    for (let index = 0; index < raw.length; index += 1) {
      const char = raw[index];
      const pair = raw.slice(index, index + 2);
      if (state === "block") {
        if (pair === "*/") [state, index] = ["code", index + 1];
      } else if (state === "'" || state === '"') {
        if (char === "\\") index += 1;
        else if (char === state) state = "code";
      } else if (state === "`") {
        if (char === "\\") index += 1;
        else if (char === "`") state = "code";
        else if (pair === "${") {
          templates.push(depth);
          [state, depth, index] = ["code", 0, index + 1];
        }
      } else if (pair === "//") break;
      else if (pair === "/*") [state, index] = ["block", index + 1];
      else if (char === "'" || char === '"' || char === "`") state = char;
      else if (char === "{") depth += 1;
      else if (char === "}" && depth === 0 && templates.length) [state, depth] = ["`", templates.pop()];
      else if (char === "}") depth -= 1;
    }
    if (state === "'" || state === '"') state = "code";
    return result;
  });
}

function readText(root, file, head) {
  if (head) {
    const text = git(root, ["show", `${head}:${file}`], { allowFailure: true });
    return text !== null && Buffer.byteLength(text) <= MAX_COMMENT_SCAN_BYTES ? text : null;
  }
  const path = join(root, file);
  return existsSync(path) && lstatSync(path).isFile() && lstatSync(path).size <= MAX_COMMENT_SCAN_BYTES ? readFileSync(path, "utf8") : null;
}

export function commentShare(root, base, { added, changed, renamed }, { head = null } = {}) {
  let source = 0;
  const byFile = [];
  for (const [file, lines] of added) {
    const syntax = syntaxOf(file);
    const text = syntax && readText(root, file, head);
    if (!text) continue;
    const kinds = classify(text, syntax);
    let comments = 0;
    for (const number of lines === "all" ? kinds.map((_, index) => index + 1) : lines) {
      const kind = kinds[number - 1];
      if (kind === "code" || kind === "comment") source += 1;
      if (kind === "comment") comments += 1;
    }
    if (comments) byFile.push({ file, lines: comments });
  }
  const lines = byFile.reduce((sum, entry) => sum + entry.lines, 0);
  return { lines, removed: removedComments(root, base, head, changed, renamed), sourceLines: source, top: byFile.sort((a, b) => b.lines - a.lines).slice(0, 3) };
}

// Deleted files and renames (through the old path) count, so moving commented code adds none on net.
// null when a diff fails: the count may then advise, never block.
function removedComments(root, base, head, changed, renamed) {
  try {
    let removed = 0;
    for (const file of changed) {
      const syntax = syntaxOf(file);
      if (!syntax) continue;
      const from = renamed.get(file) ?? file;
      const patch = git(root, ["diff", "-U0", "-M", "--no-color", "--no-ext-diff", base, ...(head ? [head] : []), "--", ...(from === file ? [] : [from]), file]);
      const ranges = [...patch.matchAll(/^@@ -(\d+)(?:,(\d+))? /gm)].map(([, start, count]) => [Number(start), count === undefined ? 1 : Number(count)]).filter(([, count]) => count);
      if (!ranges.length) continue;
      const kinds = classify(git(root, ["show", `${base}:${from}`]), syntax);
      for (const [start, count] of ranges) for (let number = start; number < start + count; number += 1) if (kinds[number - 1] === "comment") removed += 1;
    }
    return removed;
  } catch {
    return null;
  }
}

export function commentLevel(comments) {
  const net = comments ? comments.lines - (comments.removed ?? 0) : 0;
  if (net <= 0 || !comments.sourceLines) return null;
  const over = ({ lines, share }) => net >= lines && net >= comments.sourceLines * share;
  return over(COMMENT_BLOCK) && comments.removed !== null ? "block" : over(COMMENT_FLAG) ? "advise" : null;
}

export function formatComments(comments) {
  const level = commentLevel(comments);
  if (!level) return null;
  const net = comments.lines - (comments.removed ?? 0);
  const share = Math.round((100 * net) / comments.sourceLines);
  const where = comments.top.map(({ file, lines }) => `${file} ${lines}`).join(", ");
  const counted = `COMMENTS ${net} new comment lines in ${comments.sourceLines} added source lines (${share}%; ${comments.lines} added, ${comments.removed ?? "?"} removed; most in ${where})`;
  return level === "block"
    ? `${counted}: over the ${100 * COMMENT_BLOCK.share}% limit. Delete the ones that restate the code, keep only what it cannot say, and rerun (references/review-standards.md, Comments)`
    : `${counted}. Keep only what the code cannot say; the reviewer reports the rest (references/review-standards.md, Comments)`;
}
