#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const presetRequiredText = {
  plan: ["objetivo", "plano", "riscos"],
  implementation: ["mudancas", "evidencias", "decisoes"],
  review: ["findings", "resolucao", "testes"],
  "operation-smoke": ["ambiente", "fluxo", "evidencias"],
  incident: ["impacto", "timeline", "causa-raiz"],
  "product-rules": ["regras", "exemplos", "excecoes"],
};

function fail(message, errors) {
  errors.push(message);
}

function getMeta(html, name) {
  const match = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']\\s*\\/?>`, "i"));
  return match?.[1] || "";
}

function extractIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\sid=["']([^"']+)["']/g)) ids.add(match[1]);
  return ids;
}

function extractLocalImages(html) {
  const images = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] || "";
    const alt = tag.match(/\salt=["']([^"']*)["']/i)?.[1] ?? null;
    images.push({ src, alt, remoteOrInlineCandidates: remoteOrInlineMediaCandidates(tag, src) });
  }
  return images;
}

function extractScriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
}

function isRemoteOrInlineMedia(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:");
}

function srcsetUrls(srcset) {
  return String(srcset || "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function remoteOrInlineMediaCandidates(tag, src = "") {
  const candidates = [];
  if (src && isRemoteOrInlineMedia(src)) candidates.push(src);
  const srcset = tag.match(/\ssrcset=["']([^"']+)["']/i)?.[1] || "";
  for (const candidate of srcsetUrls(srcset)) {
    if (isRemoteOrInlineMedia(candidate)) candidates.push(candidate);
  }
  return candidates;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node validate-report.mjs docs/ai/reports/<slug>/index.html");
    process.exit(2);
  }
  const reportPath = resolve(file);
  const reportDir = dirname(reportPath);
  const html = readFileSync(reportPath, "utf8");
  const errors = [];

  if (!/^<!doctype html>/i.test(html.trim())) fail("Missing <!doctype html>.", errors);
  if (!/<html\b[^>]*\slang=["'][^"']+["']/i.test(html)) fail("Missing html lang.", errors);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail("Missing title.", errors);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) fail("Missing viewport meta.", errors);
  if (!/<main\b/i.test(html)) fail("Missing main landmark.", errors);
  if (!getMeta(html, "report-kit-version")) fail("Missing report-kit-version meta.", errors);
  const preset = getMeta(html, "report-preset");
  if (!preset) fail("Missing report-preset meta.", errors);
  if (!getMeta(html, "report-updated-at")) fail("Missing report-updated-at meta.", errors);
  if (!/--report-bg:/i.test(html) || !/--report-paper:/i.test(html) || !/--report-ink:/i.test(html)) {
    fail("Missing core CSS tokens.", errors);
  }

  const forbidden = [
    /<script\b[^>]+\bsrc=/i,
    /<link\b[^>]+\brel=["']stylesheet["']/i,
    /https?:\/\/[^"']*(cdn|fonts|googleapis|gstatic)[^"']*/i,
    /<iframe\b/i,
    /\son[a-z][\w:-]*\s*=/i,
    /javascript:/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(html)) fail(`Forbidden external/runtime pattern found: ${pattern}.`, errors);
  }

  const scriptTags = extractScriptTags(html);
  if (scriptTags.length !== 1 || !scriptTags[0]?.includes("data-report-kit-script")) {
    fail("Unexpected script tag count or origin; only the bundled report kit script is allowed.", errors);
  }

  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = match[0];
    for (const candidate of remoteOrInlineMediaCandidates(tag)) {
      fail(`Remote or inline media is not allowed by default: ${candidate}.`, errors);
    }
  }

  const placeholders = [/\bTODO\b/i, /\blorem\b/i, /\bxxx\b/i, /exemplo pendente/i];
  for (const pattern of placeholders) {
    if (pattern.test(html)) fail(`Unresolved placeholder found: ${pattern}.`, errors);
  }

  for (const image of extractLocalImages(html)) {
    if (image.alt === null || image.alt.trim() === "") fail(`Image missing alt: ${image.src || "inline/remote"}.`, errors);
    for (const candidate of image.remoteOrInlineCandidates) {
      fail(`Remote or inline image is not allowed by default: ${candidate}.`, errors);
    }
    if (image.src) {
      const path = resolve(reportDir, image.src);
      if (!isRemoteOrInlineMedia(image.src) && !existsSync(path)) fail(`Missing local image: ${image.src}.`, errors);
    }
  }

  const ids = extractIds(html);
  for (const match of html.matchAll(/href=["']#([^"']+)["']/g)) {
    if (!ids.has(match[1])) fail(`Broken internal anchor: #${match[1]}.`, errors);
  }

  const required = presetRequiredText[preset] || [];
  const normalizedHtml = html
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  for (const section of required) {
    if (!normalizedHtml.includes(section)) fail(`Missing required preset section text: ${section}.`, errors);
  }

  if (errors.length) {
    console.error(`Report validation failed for ${reportPath}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Report validation passed for ${reportPath}`);
}

main();
