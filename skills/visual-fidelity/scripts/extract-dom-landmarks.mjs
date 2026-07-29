#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key.startsWith("--")) {
      args[key.slice(2)] = value && !value.startsWith("--") ? value : true;
      if (value && !value.startsWith("--")) i++;
    }
  }
  return args;
}

async function loadPlaywright() {
  const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
  try {
    return requireFromCwd("playwright");
  } catch {
    try {
      return requireFromCwd("@playwright/test");
    } catch {
      throw new Error("Missing Playwright in the target project. Install/use the repo Playwright dependency or run this from a project that provides it.");
    }
  }
}

const args = parseArgs(process.argv);
const url = args.url || process.env.VISUAL_FIDELITY_URL;
const out = args.out || ".visual-fidelity/runs/dom-landmarks.json";
const width = Number(args.width || 1440);
const height = Number(args.height || 900);

if (!url) {
  console.error("Usage: node extract-dom-landmarks.mjs --url http://127.0.0.1:3000/ --out .visual-fidelity/runs/run/dom-landmarks.json");
  process.exit(2);
}

const playwright = await loadPlaywright();
const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(args.deviceScaleFactor || 1) });

try {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await Promise.all(Array.from(document.images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  });

  const landmarks = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    };
    const boxFor = (el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    };
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
    const textOf = (el) => (el.textContent || "").trim().replace(/\s+/g, " ");

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

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(landmarks, null, 2)}\n`);
  console.log(JSON.stringify({ out: path.resolve(out), counts: {
    texts: landmarks.texts.length,
    links: landmarks.links.length,
    buttons: landmarks.buttons.length,
    controls: landmarks.controls.length,
    images: landmarks.images.length,
    regions: landmarks.regions.length
  } }, null, 2));
} finally {
  await browser.close();
}

