#!/usr/bin/env node

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

const args = parseArgs(process.argv);
const route = args.route || "/";
const out = args.out || "e2e/visual-fidelity.spec.ts";
const width = Number(args.width || 1440);
const height = Number(args.height || 900);

const content = `import { test, expect } from '@playwright/test';

test.describe('visual fidelity harness', () => {
  test('captures deterministic screenshots and DOM landmarks', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: ${width}, height: ${height} });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('${route}', { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await Promise.all(Array.from(document.images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
    });

    const runDir = testInfo.outputPath('visual-fidelity');
    await page.screenshot({ path: testInfo.outputPath('visual-fidelity', 'actual.png'), fullPage: true, animations: 'disabled' });

    const landmarks = await page.evaluate(() => {
      const visible = (el: Element) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
      };
      const boxFor = (el: Element) => {
        const rect = el.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      };
      return {
        url: location.href,
        viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
        texts: Array.from(document.querySelectorAll('body *')).filter(visible).map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 300),
          box: boxFor(el),
          fontSize: getComputedStyle(el).fontSize,
          fontWeight: getComputedStyle(el).fontWeight,
          lineHeight: getComputedStyle(el).lineHeight,
          color: getComputedStyle(el).color
        })).filter((item) => item.text),
        links: Array.from(document.querySelectorAll('a')).filter(visible).map((el) => ({ text: (el.textContent || '').trim(), href: (el as HTMLAnchorElement).href, box: boxFor(el) })),
        buttons: Array.from(document.querySelectorAll('button,[role="button"]')).filter(visible).map((el) => ({ text: (el.textContent || '').trim(), ariaLabel: el.getAttribute('aria-label'), box: boxFor(el) })),
        controls: Array.from(document.querySelectorAll('input,select,textarea')).filter(visible).map((el) => ({ tag: el.tagName.toLowerCase(), name: (el as HTMLInputElement).name, type: (el as HTMLInputElement).type, ariaLabel: el.getAttribute('aria-label'), box: boxFor(el) })),
        images: Array.from(document.images).filter(visible).map((el) => ({ src: el.currentSrc || el.src, alt: el.alt, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, box: boxFor(el) })),
        regions: Array.from(document.querySelectorAll('header,nav,main,section,footer')).filter(visible).map((el) => ({ tag: el.tagName.toLowerCase(), id: el.id, className: String(el.getAttribute('class') || ''), box: boxFor(el), backgroundColor: getComputedStyle(el).backgroundColor })),
        overflow: { horizontal: document.documentElement.scrollWidth > innerWidth, vertical: document.documentElement.scrollHeight > innerHeight }
      };
    });

    await testInfo.attach('dom-landmarks', { body: JSON.stringify(landmarks, null, 2), contentType: 'application/json' });
    expect(landmarks.overflow.horizontal).toBe(false);
  });
});
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, content);
console.log(JSON.stringify({ out: path.resolve(out), route, viewport: { width, height } }, null, 2));

