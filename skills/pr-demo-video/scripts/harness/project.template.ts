import fs from 'node:fs';
import type { Page } from '@playwright/test';
import type { ProjectProfile } from './harness';

// Filled by the orchestrator per project. Copy to project.ts.
export const profile: ProjectProfile = {
  baseURL: 'http://localhost:3000',
  viewport: { width: 1280, height: 800 },
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  extraMasks: [],
  async beforeScenes(page) {
    // e.g. open the start route and switch to the light theme.
    await page.goto('/');
  },
};

/** Reads only the named keys from the credential file. Never print them. */
function credentials(file: string, keys: [string, string]) {
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq < 0 || line.trim().startsWith('#')) continue;
    const key = line.slice(0, eq).trim();
    if (keys.includes(key)) values[key] = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  const [user, secret] = keys.map((key) => values[key]);
  if (!user || !secret) throw new Error('Missing test credentials.');
  return { secret, user };
}

export async function login(page: Page) {
  const { user, secret } = credentials(process.env.DEMO_CREDENTIALS_FILE ?? '<path to the project test-account env file>', [
    '<TEST_ACCOUNT_EMAIL_KEY>',
    '<TEST_ACCOUNT_PASSWORD_KEY>',
  ]);
  await page.goto('/login');
  await page.getByLabel('Email').fill(user);
  await page.locator('input[type="password"]').first().fill(secret);
  await page.getByRole('button', { name: /entrar|continuar/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
