import path from 'node:path';
import { defineConfig } from '@playwright/test';

const runDir = process.env.DEMO_RUN_DIR ?? process.cwd();

export default defineConfig({
  expect: { timeout: 10_000 },
  outputDir: path.join(runDir, 'results'),
  reporter: 'line',
  testDir: runDir,
  testMatch: ['login.spec.ts', 'record.spec.ts'],
  timeout: 900_000,
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  workers: 1,
});
