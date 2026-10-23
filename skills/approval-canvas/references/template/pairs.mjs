// Portão de paridade: junta cada captura do canvas aprovado com a captura do app
// de mesmo nome, lado a lado, para comparar no mesmo tema, casca e largura.
// Uso: CANVAS=<pasta> APP=<pasta> PAIRS=<pasta> UI_ROOT=<repo> node pairs.mjs
// Os nomes precisam bater (ex.: A1-1440.png nas duas pastas). Gera um PNG por par
// e pairs.html com todos; nomes sem par são listados e fazem o script sair com 1.
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

for (const key of ['CANVAS', 'APP', 'PAIRS', 'UI_ROOT']) {
  if (!process.env[key]) throw new Error(`Set ${key}.`);
}
const root = `${process.env.UI_ROOT.replace(/\/$/, '')}/`;
const require = createRequire(`${root}${process.env.WEB_APP ?? 'apps/web'}/package.json`);
const { chromium } = require('@playwright/test');
const canvasDir = path.resolve(process.env.CANVAS);
const appDir = path.resolve(process.env.APP);
const pairsDir = path.resolve(process.env.PAIRS);
await mkdir(pairsDir, { recursive: true });

const pngs = async (dir) => (await readdir(dir)).filter((name) => name.endsWith('.png'));
const canvas = new Set(await pngs(canvasDir));
const app = new Set(await pngs(appDir));
const names = [...canvas].filter((name) => app.has(name)).sort();
const missing = [...canvas, ...app].filter((name) => !(canvas.has(name) && app.has(name)));

const figure = (label, file) =>
  `<figure><figcaption>${label}</figcaption><img src="${pathToFileURL(file).href}"></figure>`;
const pairHtml = (name) =>
  `<section><h2>${name}</h2><div class="pair">${figure('Canvas aprovado', path.join(canvasDir, name))}${figure('App', path.join(appDir, name))}</div></section>`;
const style = `<style>
  body { margin: 16px; font: 13px system-ui, sans-serif; background: #fff; color: #111; }
  h2 { font-size: 14px; margin: 0 0 8px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  figure { margin: 0; } figcaption { margin-bottom: 4px; color: #555; }
  img { width: 100%; border: 1px solid #ccc; }
  section { margin-bottom: 32px; }
</style>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  for (const name of names) {
    await page.setContent(`${style}${pairHtml(name)}`, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(pairsDir, name), fullPage: true });
  }
} finally {
  await browser.close();
}
await writeFile(path.join(pairsDir, 'pairs.html'), `<!doctype html><meta charset="utf-8">${style}${names.map(pairHtml).join('')}`);

console.log(`${names.length} pares em ${pairsDir}`);
if (missing.length) {
  console.error(`Sem par (capture com o mesmo nome nas duas pastas): ${missing.join(', ')}`);
  process.exit(1);
}
