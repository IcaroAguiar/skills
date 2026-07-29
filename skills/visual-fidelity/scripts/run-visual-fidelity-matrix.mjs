#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cwd = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function readFlag(name) {
  return args.includes(name);
}

function loadJson(filePath) {
  const absolutePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing file: ${absolutePath}`);
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

async function loadPlaywright() {
  const requireFromCwd = createRequire(join(cwd, "package.json"));
  try {
    return requireFromCwd("playwright");
  } catch {
    try {
      return requireFromCwd("@playwright/test");
    } catch {
      throw new Error(
        "The v3 viewport/scroll-stop matrix requires Playwright in the target project. Install/use repo Playwright or generate a repo-local visual test.",
      );
    }
  }
}

const configPath = readArg("--config", ".visual-fidelity/config.json");
const baseUrl = readArg("--base-url", process.env.VISUAL_FIDELITY_BASE_URL);
const appMarker = readArg("--app-marker", process.env.VISUAL_FIDELITY_APP_MARKER);
const chrome =
  readArg("--chrome", process.env.CHROME_BIN) ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const maxDiffRatio = Number(readArg("--max-diff-ratio", process.env.VISUAL_FIDELITY_MAX_DIFF_RATIO ?? "0.03"));
const outDir = resolve(cwd, readArg("--out-dir", ".visual-fidelity/runs/matrix"));
const compareScript = join(skillRoot, "scripts", "compare-images.mjs");
const config = loadJson(configPath);
const marker = appMarker ?? config.appMarker;
const referenceIntegrityPath = readArg("--reference-integrity", config.referenceIntegrity ?? ".visual-fidelity/contracts/reference-integrity.json");

if (!baseUrl) {
  throw new Error("Missing --base-url or VISUAL_FIDELITY_BASE_URL.");
}

ensureDir(outDir);

function assertReferenceIntegrityIfNeeded() {
  const hasReference =
    (config.pixelReferences || []).length > 0 ||
    Boolean(config.references) ||
    (config.scrollStops || []).some?.((stop) => typeof stop === "object" && stop.reference);
  if (!hasReference) return null;
  if (!existsSync(resolve(cwd, referenceIntegrityPath))) {
    throw new Error(`Reference integrity file is required before screenshot comparison: ${referenceIntegrityPath}`);
  }
  const integrity = loadJson(referenceIntegrityPath);
  if (integrity.valid !== true) {
    throw new Error(`Reference integrity is invalid: ${(integrity.blockers || []).join("; ")}`);
  }
  return referenceIntegrityPath;
}

async function assertTargetApp() {
  if (!marker) return;
  const response = await fetch(baseUrl);
  const html = await response.text();
  if (!html.includes(marker)) {
    throw new Error(
      `Base URL does not match expected app marker "${marker}": ${baseUrl}. Start the intended app and pass the exact URL.`,
    );
  }
}

function captureWithChrome({ name, route, viewport }) {
  const [width, height] = viewport;
  const screenshot = join(outDir, `${name}.png`);
  const userDataDir = join("/private/tmp", `visual-fidelity-${name}-${Date.now()}`);

  try {
    execFileSync(
      chrome,
      [
        "--headless",
        "--disable-gpu",
        "--disable-background-networking",
        "--disable-component-update",
        "--hide-scrollbars",
        "--no-first-run",
        `--user-data-dir=${userDataDir}`,
        `--window-size=${width},${height}`,
        `--screenshot=${screenshot}`,
        `${baseUrl}${route}`,
      ],
      { cwd, stdio: readFlag("--verbose") ? "inherit" : "pipe", timeout: 20000 },
    );
  } catch (error) {
    if (error.code !== "ETIMEDOUT" || !existsSync(screenshot)) {
      throw error;
    }
  }

  return screenshot;
}

function compareImages({ reference, actual, diff, report }) {
  const integrity = assertReferenceIntegrityIfNeeded();
  try {
    execFileSync(
      "node",
      [
        compareScript,
        "--ref",
        resolve(cwd, reference),
        "--actual",
        actual,
        "--out",
        diff,
        "--json",
        report,
        "--maxDiffRatio",
        String(maxDiffRatio),
        ...(integrity ? ["--reference-integrity", integrity] : []),
      ],
      { cwd, stdio: "pipe" },
    );
  } catch {
    // compare-images writes the report on mismatch.
  }

  return existsSync(report) ? loadJson(report) : null;
}

function legacyCases() {
  const pixelCases = config.pixelReferences ?? [];
  const responsiveCases = config.responsiveSmokes ?? [];
  return { pixelCases, responsiveCases };
}

function normalizeViewport(viewport) {
  if (Array.isArray(viewport)) {
    return { name: `${viewport[0]}x${viewport[1]}`, width: viewport[0], height: viewport[1], deviceScaleFactor: 1 };
  }
  return {
    name: viewport.name ?? `${viewport.width}x${viewport.height}`,
    width: Number(viewport.width),
    height: Number(viewport.height),
    deviceScaleFactor: Number(viewport.deviceScaleFactor ?? 1)
  };
}

function normalizeScrollStop(stop, index) {
  if (typeof stop === "number") {
    return { id: `scroll-${index}`, y: stop };
  }
  return { id: stop.id ?? `scroll-${index}`, y: stop.y ?? 0, reference: stop.reference };
}

async function waitForStablePage(page, stabilization) {
  if (stabilization?.disableAnimations) {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          transition-duration: 0.001s !important;
          scroll-behavior: auto !important;
          caret-color: transparent !important;
        }
      `
    });
  }
  if (stabilization?.stylePath && existsSync(resolve(cwd, stabilization.stylePath))) {
    await page.addStyleTag({ path: resolve(cwd, stabilization.stylePath) });
  }
  if (stabilization?.waitForFonts !== false) {
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
  }
  if (stabilization?.waitForImages !== false) {
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolveImage) => {
          img.addEventListener("load", resolveImage, { once: true });
          img.addEventListener("error", resolveImage, { once: true });
        });
      }));
    });
  }
}

async function extractDomLandmarks(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    };
    const boxFor = (el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    };
    const textOf = (el) => (el.textContent || "").trim().replace(/\s+/g, " ");
    const styleFor = (el) => {
      const style = getComputedStyle(el);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor
      };
    };

    return {
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      texts: Array.from(document.querySelectorAll("body *")).filter(visible).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: textOf(el).slice(0, 300),
        box: boxFor(el),
        style: styleFor(el)
      })).filter((item) => item.text),
      links: Array.from(document.querySelectorAll("a")).filter(visible).map((el) => ({ text: textOf(el), href: el.href, box: boxFor(el) })),
      buttons: Array.from(document.querySelectorAll("button,[role='button']")).filter(visible).map((el) => ({ text: textOf(el), ariaLabel: el.getAttribute("aria-label"), box: boxFor(el) })),
      controls: Array.from(document.querySelectorAll("input,select,textarea")).filter(visible).map((el) => ({ tag: el.tagName.toLowerCase(), name: el.name, type: el.type, ariaLabel: el.getAttribute("aria-label"), box: boxFor(el) })),
      images: Array.from(document.images).filter(visible).map((el) => ({ src: el.currentSrc || el.src, alt: el.alt, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, box: boxFor(el) })),
      regions: Array.from(document.querySelectorAll("header,nav,main,section,footer")).filter(visible).map((el) => ({ tag: el.tagName.toLowerCase(), id: el.id, className: String(el.getAttribute("class") || ""), box: boxFor(el), style: styleFor(el) })),
      overflow: { horizontal: document.documentElement.scrollWidth > innerWidth, vertical: document.documentElement.scrollHeight > innerHeight }
    };
  });
}

function escapeYaml(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function ariaSnapshotFromDom(landmarks) {
  const lines = ["- document:"];
  const regions = landmarks.regions || [];
  const hasHeader = regions.some((item) => item.tag === "header");
  const hasNav = regions.some((item) => item.tag === "nav");
  const hasMain = regions.some((item) => item.tag === "main");
  const hasFooter = regions.some((item) => item.tag === "footer");
  if (hasHeader) lines.push("  - banner");
  if (hasNav) lines.push("  - navigation");
  lines.push(`  - main${hasMain ? "" : " # inferred"}:`);
  for (const text of (landmarks.texts || []).slice(0, 20)) {
    const tag = text.tag === "h1" ? "heading[level=1]" : text.tag === "h2" ? "heading[level=2]" : "text";
    lines.push(`    - ${tag} "${escapeYaml(text.text).slice(0, 120)}"`);
  }
  for (const link of (landmarks.links || []).slice(0, 12)) {
    lines.push(`    - link "${escapeYaml(link.text).slice(0, 120)}"`);
  }
  for (const button of (landmarks.buttons || []).slice(0, 12)) {
    lines.push(`    - button "${escapeYaml(button.ariaLabel || button.text).slice(0, 120)}"`);
  }
  for (const control of (landmarks.controls || []).slice(0, 12)) {
    lines.push(`    - ${control.tag} "${escapeYaml(control.ariaLabel || control.name).slice(0, 120)}"`);
  }
  if (hasFooter) lines.push("  - contentinfo");
  return `${lines.join("\n")}\n`;
}

async function runV3Matrix() {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const route = config.route ?? "/";
  const viewports = (config.viewports ?? [{ name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 }]).map(normalizeViewport);
  const scrollStops = (config.scrollStops ?? [{ id: "hero", y: 0 }]).map(normalizeScrollStop);
  const thresholds = config.thresholds ?? {};
  const results = [];

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const waitUntil = config.stabilization?.networkIdle === false ? "load" : "networkidle";
      await page.goto(`${baseUrl}${route}`, { waitUntil });
      await waitForStablePage(page, config.stabilization ?? {});

      for (const [index, stop] of scrollStops.entries()) {
        const y = stop.y === "bottom"
          ? await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight))
          : Number(stop.y ?? 0);
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(100);

        const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${viewport.name}-${stop.id}`;
        const runDir = join(outDir, runId);
        ensureDir(runDir);
        const actual = join(runDir, "actual.png");
        const domLandmarks = join(runDir, "dom-landmarks.json");
        const ariaSnapshot = join(runDir, "aria-snapshot.yml");
        const runJson = join(runDir, "run.json");
        const diff = join(runDir, "diff.png");
        const report = join(runDir, "image-report.json");
        const reference = stop.reference ?? config.references?.[viewport.name]?.[stop.id];

        await page.screenshot({ path: actual, fullPage: false, animations: "disabled" });
        const landmarks = await extractDomLandmarks(page);
        writeFileSync(domLandmarks, `${JSON.stringify(landmarks, null, 2)}\n`);
        writeFileSync(ariaSnapshot, ariaSnapshotFromDom(landmarks));

        const comparison = reference ? compareImages({ reference, actual, diff, report }) : null;
        const horizontalOverflow = Boolean(landmarks.overflow?.horizontal);
        const blockingDivergences = [];
        if (horizontalOverflow) blockingDivergences.push("horizontal overflow");
        if (comparison && comparison.diffRatio > (thresholds.maxDiffRatio ?? maxDiffRatio)) {
          blockingDivergences.push(`diff ratio ${comparison.diffRatio} exceeds threshold`);
        }

        const run = {
          runId,
          iteration: Number(config.iteration ?? 0),
          route,
          viewport: viewport.name,
          scrollStop: stop.id,
          reference: reference ?? null,
          actual,
          diff: comparison ? diff : null,
          domLandmarks,
          ariaSnapshot,
          rubricReport: null,
          diffRatio: comparison?.diffRatio ?? null,
          rubricScore: null,
          criticalCapsTriggered: [],
          blockingDivergences,
          nextPriorityAdjustment: blockingDivergences[0] ?? "audit visual landmarks against visual-ir.json"
        };
        writeFileSync(runJson, `${JSON.stringify(run, null, 2)}\n`);
        results.push(run);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const summary = {
    mode: "v3-viewport-scrollstop",
    baseUrl,
    configPath,
    outDir,
    thresholds,
    passed: results.every((run) => run.blockingDivergences.length === 0),
    results
  };
  writeFileSync(join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

async function runLegacyMatrix() {
  const { pixelCases, responsiveCases } = legacyCases();
  const results = [];

  for (const testCase of pixelCases) {
    const actual = captureWithChrome(testCase);
    const report = join(outDir, `${testCase.name}.report.json`);
    const diff = join(outDir, `${testCase.name}.diff.png`);
    const comparison = compareImages({ reference: testCase.reference, actual, diff, report });
    results.push({
      ...testCase,
      actual,
      diffRatio: comparison?.diffRatio ?? null,
      passed: Boolean(comparison?.passed),
      mode: "pixel-reference",
    });
  }

  for (const testCase of responsiveCases) {
    const actual = captureWithChrome(testCase);
    results.push({
      ...testCase,
      actual,
      diffRatio: null,
      passed: true,
      mode: "responsive-smoke-no-reference",
    });
  }

  const summary = {
    mode: "legacy",
    baseUrl,
    configPath,
    maxDiffRatio,
    pixelPerfect: results
      .filter((item) => item.mode === "pixel-reference")
      .every((item) => item.passed),
    results,
  };

  writeFileSync(join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

await assertTargetApp();
assertReferenceIntegrityIfNeeded();

if (config.viewports || config.scrollStops) {
  await runV3Matrix();
} else {
  await runLegacyMatrix();
}
