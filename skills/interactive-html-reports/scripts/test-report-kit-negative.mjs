#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tempRoot = join(tmpdir(), "interactive-html-reports-negative");

function runExpectFail(label, command, args, expectedText) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.status === 0) {
    console.error(`${label}: expected failure, got success.`);
    process.exit(1);
  }
  if (!output.includes(expectedText)) {
    console.error(`${label}: expected output to include "${expectedText}".`);
    console.error(output);
    process.exit(1);
  }
  console.log(`${label}: failed as expected`);
}

function validHtml(extraBody = "", extraHead = "") {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Negative validation fixture</title>
  <meta name="report-kit-version" content="0.1.0" />
  <meta name="report-preset" content="implementation" />
  <meta name="report-updated-at" content="2026-05-18T00:00:00-03:00" />
  <style>:root{--report-bg:#fff;--report-paper:#fff;--report-ink:#111}</style>
  ${extraHead}
</head>
  <body>
  <main>
    <section id="mudancas">mudancas evidencias decisoes</section>
    ${extraBody}
  </main>
  <script data-report-kit-script></script>
</body>
</html>`;
}

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });

const inputDir = join(tempRoot, "input");
mkdirSync(inputDir, { recursive: true });
writeFileSync(join(tempRoot, "outside.png"), "not a real image", "utf8");
const assetEscapeReport = join(inputDir, "asset-escape.json");
writeFileSync(
  assetEscapeReport,
  JSON.stringify(
    {
      title: "Asset escape",
      preset: "implementation",
      sections: [
        { id: "mudancas", title: "Mudancas", body: "ok" },
        { id: "evidencias", title: "Evidencias", body: "ok" },
        { id: "decisoes", title: "Decisoes", body: "ok" },
      ],
      assets: [{ src: "../outside.png", alt: "fora do diretorio" }],
    },
    null,
    2,
  ),
  "utf8",
);

runExpectFail(
  "asset path escape",
  process.execPath,
  [join(__dirname, "generate-report.mjs"), "--input", assetEscapeReport, "--output", join(tempRoot, "out", "index.html")],
  "Asset source must stay inside the report input directory",
);

writeFileSync(join(inputDir, "sample.png"), "not a real image", "utf8");
const outputEscapeReport = join(inputDir, "asset-output-escape.json");
writeFileSync(
  outputEscapeReport,
  JSON.stringify(
    {
      title: "Asset output escape",
      preset: "implementation",
      sections: [
        { id: "mudancas", title: "Mudancas", body: "ok" },
        { id: "evidencias", title: "Evidencias", body: "ok" },
        { id: "decisoes", title: "Decisoes", body: "ok" },
      ],
      assets: [{ src: "./sample.png", name: "../escape.png", alt: "saida fora do diretorio" }],
    },
    null,
    2,
  ),
  "utf8",
);

runExpectFail(
  "asset output name escape",
  process.execPath,
  [join(__dirname, "generate-report.mjs"), "--input", outputEscapeReport, "--output", join(tempRoot, "out", "index.html")],
  "Asset output name must be a plain file name",
);

const missingAltHtml = join(tempRoot, "missing-alt.html");
writeFileSync(missingAltHtml, validHtml('<img src="./missing.png" />'), "utf8");
runExpectFail("image alt validation", process.execPath, [join(__dirname, "validate-report.mjs"), missingAltHtml], "Image missing alt");

const remoteImageHtml = join(tempRoot, "remote-image.html");
writeFileSync(remoteImageHtml, validHtml('<img src="https://example.com/image.png" alt="remote" />'), "utf8");
runExpectFail(
  "remote image validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), remoteImageHtml],
  "Remote or inline image is not allowed by default",
);

const upperDataImageHtml = join(tempRoot, "upper-data-image.html");
writeFileSync(upperDataImageHtml, validHtml('<img src="DATA:,abc" alt="inline" />'), "utf8");
runExpectFail(
  "uppercase data image validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), upperDataImageHtml],
  "Remote or inline image is not allowed by default",
);

writeFileSync(join(tempRoot, "local.png"), "not a real image", "utf8");
const srcsetImageHtml = join(tempRoot, "srcset-image.html");
writeFileSync(
  srcsetImageHtml,
  validHtml('<img src="./local.png" srcset="./local.png 1x, https://example.com/remote.png 2x" alt="srcset remoto" />'),
  "utf8",
);
runExpectFail(
  "remote srcset validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), srcsetImageHtml],
  "Remote or inline image is not allowed by default",
);

const sourceSrcsetHtml = join(tempRoot, "source-srcset.html");
writeFileSync(sourceSrcsetHtml, validHtml('<picture><source srcset="//example.com/remote.webp"><img src="./local.png" alt="source remoto" /></picture>'), "utf8");
runExpectFail(
  "remote source srcset validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), sourceSrcsetHtml],
  "Remote or inline media is not allowed by default",
);

const brokenAnchorHtml = join(tempRoot, "broken-anchor.html");
writeFileSync(brokenAnchorHtml, validHtml('<a href="#ancora-inexistente">quebrado</a>'), "utf8");
runExpectFail(
  "internal anchor validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), brokenAnchorHtml],
  "Broken internal anchor",
);

const remoteScriptHtml = join(tempRoot, "remote-script.html");
writeFileSync(remoteScriptHtml, validHtml("", '<script src="https://cdn.example.com/widget.js"></script>'), "utf8");
runExpectFail(
  "external script validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), remoteScriptHtml],
  "Forbidden external/runtime pattern found",
);

const inlineScriptHtml = join(tempRoot, "inline-script.html");
writeFileSync(inlineScriptHtml, validHtml("<script>alert(1)</script>"), "utf8");
runExpectFail(
  "inline script validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), inlineScriptHtml],
  "Unexpected script tag count or origin",
);

const eventHandlerHtml = join(tempRoot, "event-handler.html");
writeFileSync(eventHandlerHtml, validHtml('<svg onload="alert(1)"></svg>'), "utf8");
runExpectFail(
  "event handler validation",
  process.execPath,
  [join(__dirname, "validate-report.mjs"), eventHandlerHtml],
  "Forbidden external/runtime pattern found",
);

const placeholderHtml = join(tempRoot, "placeholder.html");
writeFileSync(placeholderHtml, validHtml("<p>TODO revisar depois</p>"), "utf8");
runExpectFail("placeholder validation", process.execPath, [join(__dirname, "validate-report.mjs"), placeholderHtml], "Unresolved placeholder");

console.log(`Negative tests passed in ${resolve(tempRoot)}`);
