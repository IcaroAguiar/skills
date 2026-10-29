import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { git, reviewable } from "./repo.mjs";

// Comment lines among the added source lines, outside tests. Agents document every
// declaration by habit. Past COMMENT_BLOCK the author trims before any reviewer
// runs; between the two the reviewer judges each one (references/review-standards.md).
const COMMENT_SYNTAX = [
  [/\.[cm]?[jt]sx?$|\.(go|rs|java|kts?|swift|c|cc|cpp|h|hpp|cs|scala|dart|php)$/, /^(\/\/|\/\*|\*(\s|\/|$))/],
  [/\.(py|rb|sh|bash|zsh|ex|exs|pl)$/, /^#(?!!)/],
];
const COMMENT_DIRECTIVE = /\b(eslint|oxlint|biome-ignore|prettier-ignore|istanbul|c8 ignore|nosemgrep|noqa|type: *ignore|pragma)\b|@ts-|^(\/\/|#) *(ok|ruleid|todoruleid):/i;
const TEST_FILE = /(^|\/)(__tests__|__mocks__|tests?|spec|e2e|fixtures?)\/|\.(test|spec|e2e)\.[^/]+$|(^|\/)test[-_][^/]+$|_test\.[^/]+$/;
const COMMENT_FLAG = { lines: 10, share: 0.03 };
const COMMENT_BLOCK = { lines: 10, share: 0.05 };
const MAX_COMMENT_SCAN_BYTES = 2 * 1024 * 1024;

export function commentShare(root, base, added, changed) {
  let source = 0;
  const byFile = [];
  for (const [file, lines] of added) {
    const syntax = commentSyntax(file);
    const path = join(root, file);
    if (!syntax || !existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).size > MAX_COMMENT_SCAN_BYTES) continue;
    const text = readFileSync(path, "utf8").split("\n");
    let comments = 0;
    for (const number of lines === "all" ? text.map((_, index) => index + 1) : lines) {
      const line = (text[number - 1] ?? "").trim();
      const comment = syntax.test(line);
      if (!line || (comment && COMMENT_DIRECTIVE.test(line))) continue;
      source += 1;
      if (comment) comments += 1;
    }
    if (comments) byFile.push({ file, lines: comments });
  }
  const lines = byFile.reduce((sum, entry) => sum + entry.lines, 0);
  return { lines, removed: removedComments(root, base, changed), sourceLines: source, top: byFile.sort((a, b) => b.lines - a.lines).slice(0, 3) };
}

const commentSyntax = (file) => (reviewable(file) && !TEST_FILE.test(file) ? COMMENT_SYNTAX.find(([pattern]) => pattern.test(file))?.[1] : undefined);

// Comment lines the diff deleted from any source file, deleted files included, so
// a refactor that moves commented code into a new module adds none on net. One
// diff per file, so no path is parsed back from a header. A failing diff leaves
// the count unknown (null), and the limit then applies to the added lines alone.
function removedComments(root, base, changed) {
  try {
    let removed = 0;
    for (const file of changed) {
      const syntax = commentSyntax(file);
      if (!syntax) continue;
      let inHunk = false;
      for (const line of git(root, ["diff", "-U0", "--no-color", "--no-ext-diff", base, "--", file]).split("\n")) {
        if (line.startsWith("@@")) inHunk = true;
        else if (inHunk && line.startsWith("-")) {
          const text = line.slice(1).trim();
          if (text && syntax.test(text) && !COMMENT_DIRECTIVE.test(text)) removed += 1;
        }
      }
    }
    return removed;
  } catch {
    return null;
  }
}

// "block", "advise" or null, from the comment lines the diff adds on net.
export function commentLevel(comments) {
  const net = comments ? comments.lines - (comments.removed ?? 0) : 0;
  if (net <= 0 || !comments.sourceLines) return null;
  const over = ({ lines, share }) => net >= lines && net >= comments.sourceLines * share;
  return over(COMMENT_BLOCK) ? "block" : over(COMMENT_FLAG) ? "advise" : null;
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
