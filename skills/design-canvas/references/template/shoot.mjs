// Capturas do canvas: todas as telas e estados em 1440 e 390 px.
// THEMES=claro,escuro (primeiro = padrão do produto; default: claro).
// DARK=IDs segue aceito sem THEMES e inclui todos os estados dessas telas.
// Serve só out/ num preview temporário.
// Uso: node shoot.mjs [ids separados por vírgula]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { captureJobs } from './capture-jobs.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
if (!process.env.UI_ROOT) throw new Error('Set UI_ROOT.');
const root = `${process.env.UI_ROOT.replace(/\/$/, '')}/`;
const require = createRequire(`${root}${process.env.WEB_APP ?? 'apps/web'}/package.json`);
const { chromium } = require('@playwright/test');
const output = process.env.SHOTS ?? '/tmp/canvas-shots';
const only = process.argv[2]?.split(',');
await mkdir(output, { recursive: true });
const port = Number(process.env.PORT ?? 4183);
const preview = spawn(process.execPath, [`${root}${process.env.WEB_APP ?? 'apps/web'}/node_modules/vite/bin/vite.js`, 'preview', '-c', `${here}vite.config.mjs`, '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', process.env.OUT ?? 'out'], { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
preview.stdout.on('data', (d) => { log += d; });
preview.stderr.on('data', (d) => { log += d; });
const url = `http://127.0.0.1:${port}/`;
let browser;
const report = [];
try {
  for (let i = 0; i < 80; i++) {
    if (preview.exitCode !== null) throw new Error(`Preview encerrou: ${log}`);
    try { if ((await fetch(url)).ok) break; } catch {}
    await delay(250);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  const all = await page.evaluate(() => window.__canvasScreens);
  const jobs = captureJobs(all, { only, themes: process.env.THEMES, dark: process.env.DARK });
  for (const job of jobs) {
    const { name, width } = job;
    errors.length = 0;
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${url}?tema=${job.theme}&c=${name}#${job.id}${job.state ? `~${job.state}` : ''}`, { waitUntil: 'networkidle' });
    await page.locator('h1').first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => errors.push('sem h1'));
    await page.evaluate(() => document.fonts.ready);
    // Espera a página parar de mexer: animações de layout (ex.: sidebar abrindo) distorcem a captura.
    const settle = () => page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)));
      let last = '';
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 50));
        const now = [...document.querySelectorAll('[data-sidebar="sidebar"], main, h1')].map((el) => { const r = el.getBoundingClientRect(); return `${r.left},${r.width}`; }).join(';');
        if (now === last) return;
        last = now;
      }
    });
    await settle();
    // fullPage estica a janela no meio da captura e reanima a casca; estique antes e espere de novo.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height > 900) {
      await page.setViewportSize({ width, height });
      await settle();
    }
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => (document.documentElement.scrollWidth > innerWidth + 1 ? [`Página ${document.documentElement.scrollWidth}px > ${innerWidth}px`] : []));
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    report.push({ name, errors: [...errors], overflow });
    console.log(`${name}${errors.length ? ` ERROS: ${errors.join(' | ')}` : ''}${overflow.length ? ` OVERFLOW: ${overflow}` : ''}`);
  }
  await writeFile(`${output}/verificacao.json`, JSON.stringify(report, null, 2));
  const bad = report.filter((r) => r.errors.length || r.overflow.length);
  console.log(`\n${report.length} capturas · ${bad.length} com problema · ${output}`);
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
