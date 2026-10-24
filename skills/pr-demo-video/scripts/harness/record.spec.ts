import path from 'node:path';
import { test, expect } from '@playwright/test';
import type { Scene } from './harness';
import { runScenes } from './harness';
import { profile } from './project';

const runDir = process.env.DEMO_RUN_DIR ?? process.cwd();

// DEMO_SCENE=<id> runs one scene alone (prepare + play, no video).
// Without it, every scene plays in order and the run is recorded.
test('record', async ({ browser }) => {
  if (process.env.DEMO_STEP === 'login') test.skip();
  const only = process.env.DEMO_SCENE || undefined;
  // Playwright’s require hook transpiles runtime-selected TypeScript files.
  const scenes: Scene[] = only
    ? [require(path.join(runDir, 'scenes', `${only}.ts`)).scene]
    : require('./scenes').scenes;
  const report = await runScenes({
    browser,
    fast: process.env.DEMO_FAST === '1',
    only,
    project: profile,
    runDir,
    scenes,
  });
  expect(report.error, 'Run setup/cleanup failed; see current report').toBeUndefined();
  expect(report.scenes.every(scene => scene.status === 'ok'), 'Scene failed; see current report').toBe(true);
});
