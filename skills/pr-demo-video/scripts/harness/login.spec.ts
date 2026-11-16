import fs from 'node:fs';
import { test } from '@playwright/test';
import { sessionFile } from './harness';
import { login, profile } from './project';

const runDir = process.env.DEMO_RUN_DIR ?? process.cwd();

// Logs in once per persona, off camera, and stores the session for every scene run.
test('login', async ({ browser }) => {
  if (process.env.DEMO_STEP !== 'login') test.skip();
  const persona = process.env.DEMO_PERSONA || undefined;
  const file = sessionFile(runDir, persona);
  const options = { baseURL: profile.baseURL, viewport: profile.viewport };
  if (fs.existsSync(file) && profile.signedIn) {
    const stored = await browser.newContext({ ...options, storageState: file });
    const alive = await profile.signedIn(await stored.newPage()).catch(() => false);
    await stored.close();
    if (alive) return;
  }
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await login(page, persona);
  await context.storageState({ path: file });
  fs.chmodSync(file, 0o600);
  await context.close();
});
