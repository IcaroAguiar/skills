// Capturas do canvas: todas as telas e estados em 1440 e 390 px, tema claro;
// telas listadas em DARK também no escuro. Serve só out/ num preview temporário.
// Uso: node shoot.mjs [ids separados por vírgula]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
if (!process.env.UI_ROOT) throw new Error('Set UI_ROOT.');
const root = `${process.env.UI_ROOT.replace(/\/$/, '')}/`;
const require = createRequire(`${root}${process.env.WEB_APP ?? 'apps/web'}/package.json`);
const { chromium } = require('@playwright/test');
const output = process.env.SHOTS ?? '/tmp/canvas-shots';
const only = process.argv[2]?.split(',');
const DARK = (process.env.DARK ?? '').split(',').filter(Boolean);
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
  const jobs = [];
  for (const s of all) {
    if (only && !only.includes(s.id)) continue;
    for (const state of ['', ...s.states]) {
      jobs.push({ id: s.id, state, dark: false });
      if (!state && DARK.includes(s.id)) jobs.push({ id: s.id, state, dark: true });
    }
  }
  for (const job of jobs) {
    for (const width of [1440, 390]) {
      const name = `${job.id}${job.state ? `-${job.state}` : ''}${job.dark ? '-escuro' : ''}-${width}`;
      errors.length = 0;
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${url}?tema=${job.dark ? 'escuro' : 'claro'}&c=${name}#${job.id}${job.state ? `~${job.state}` : ''}`, { waitUntil: 'networkidle' });
      await page.locator('h1').first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => errors.push('sem h1'));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => (document.documentElement.scrollWidth > innerWidth + 1 ? [`Página ${document.documentElement.scrollWidth}px > ${innerWidth}px`] : []));
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      report.push({ name, errors: [...errors], overflow });
      console.log(`${name}${errors.length ? ` ERROS: ${errors.join(' | ')}` : ''}${overflow.length ? ` OVERFLOW: ${overflow}` : ''}`);
    }
  }
  await writeFile(`${output}/verificacao.json`, JSON.stringify(report, null, 2));
  const bad = report.filter((r) => r.errors.length || r.overflow.length);
  console.log(`\n${report.length} capturas · ${bad.length} com problema · ${output}`);
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
