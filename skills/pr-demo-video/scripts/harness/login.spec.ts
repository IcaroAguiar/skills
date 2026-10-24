import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { login, profile } from './project';

const runDir = process.env.DEMO_RUN_DIR ?? process.cwd();

// Logs in once, off camera, and stores the session for every scene run.
test('login', async ({ browser }) => {
  if (process.env.DEMO_STEP !== 'login') test.skip();
  const context = await browser.newContext({ baseURL: profile.baseURL, viewport: profile.viewport });
  const page = await context.newPage();
  await login(page);
  const file = path.join(runDir, '.auth.json');
  await context.storageState({ path: file });
  fs.chmodSync(file, 0o600);
  await context.close();
});
