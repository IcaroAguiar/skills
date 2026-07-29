#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyAssets } from "./lib/assets.mjs";
import { defaultKitVersion, presetRequiredSections } from "./lib/constants.mjs";
import { escapeHtml } from "./lib/html.mjs";
import { buildSections, renderBody } from "./lib/renderers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, "..");
const kitRoot = join(skillRoot, "assets", "report-kit");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      args[token.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function usage() {
  return "Usage: node generate-report.mjs --input report.json --output docs/ai/reports/<slug>/index.html";
}

function normalizeReport(rawReport) {
  const report = {
    kitVersion: defaultKitVersion,
    language: "pt-BR",
    updatedAt: new Date().toISOString(),
    preset: "implementation",
    status: "draft",
    sections: [],
    ...rawReport,
  };

  const required = presetRequiredSections[report.preset] || [];
  for (const id of required) {
    if (!report.sections.some((section) => section.id === id)) {
      report.sections.push({
        id,
        title: id.replaceAll("-", " "),
        status: "draft",
        body: "Seção obrigatória adicionada automaticamente. Preencha antes de publicar o report.",
      });
    }
  }

  return report;
}

function renderDocument(report, bodyHtml, css, js) {
  return `<!doctype html>
<html lang="${escapeHtml(report.language || "pt-BR")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(report.title || "Report")}</title>
  <meta name="generator" content="interactive-html-reports ${escapeHtml(report.kitVersion || defaultKitVersion)}" />
  <meta name="report-kit-version" content="${escapeHtml(report.kitVersion || defaultKitVersion)}" />
  <meta name="report-preset" content="${escapeHtml(report.preset || "implementation")}" />
  <meta name="report-updated-at" content="${escapeHtml(report.updatedAt || "")}" />
  <style>${css}</style>
</head>
<body>
${bodyHtml}
<script data-report-kit-script>${js}</script>
</body>
</html>
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error(usage());
    process.exit(1);
  }

  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  const inputDir = dirname(inputPath);
  const outputDir = dirname(outputPath);

  const rawReport = JSON.parse(readFileSync(inputPath, "utf8"));
  const report = normalizeReport(rawReport);

  mkdirSync(outputDir, { recursive: true });
  copyAssets(report, inputDir, outputDir);

  const sections = buildSections(report);
  const css = readFileSync(join(kitRoot, "report.css"), "utf8");
  const js = readFileSync(join(kitRoot, "report.js"), "utf8");
  const bodyHtml = renderBody(report, sections);
  const html = renderDocument(report, bodyHtml, css, js);

  writeFileSync(outputPath, html, "utf8");
  console.log(`Report generated: ${outputPath}`);
}

main();
