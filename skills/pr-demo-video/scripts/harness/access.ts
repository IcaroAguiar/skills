import crypto from 'node:crypto';
import type { Browser, Response } from '@playwright/test';

// qa-crew access check: what the scene's account fetched, asked again as someone else. Rows are candidates to triage.
export type Seen = { method: string; url: string; data: string | null; bearer: boolean; body: Promise<string | null> };
export type Verdict = 'enforced' | 'same' | 'differs' | 'error';
export type AccessRow = { method: string; url: string; unasked?: string; as: Record<string, { status: number; verdict: Verdict; error?: string }> };

function within<T>(ms: number, work: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

const digest = (body: Buffer) => crypto.createHash('sha256').update(body).digest('hex');
const LIMIT = 60;
// A stream or a long poll never finishes; its body is then unknown, not awaited forever.
const BODY_WAIT_MS = 5000;

export function seen(response: Response): Seen | null {
  const request = response.request();
  if (!['xhr', 'fetch'].includes(request.resourceType()) || !/^https?:/.test(response.url()) || response.status() >= 400) return null;
  return {
    method: request.method(),
    url: response.url(),
    data: request.postData(),
    bearer: 'authorization' in request.headers(),
    body: within(BODY_WAIT_MS, response.body().then(digest, () => null)),
  };
}

/** `control` is the scene's own session: a call it cannot repeat proves nothing about anyone else. */
export async function replay(
  browser: Browser, calls: Seen[], control: string, sessions: Record<string, string | undefined>, writes = false,
): Promise<AccessRow[]> {
  if (calls.some((call) => call.bearer)) {
    throw new Error('access(): this app sends an Authorization header, which a stored session cannot replace. Use the wrong-person worker.');
  }
  const unique = new Map<string, Seen>();
  for (const call of calls) {
    if (writes || ['GET', 'HEAD'].includes(call.method)) unique.set(`${call.method} ${call.url}`, call);
  }
  const rows: AccessRow[] = [...unique.values()].slice(0, LIMIT).map((call) => ({ method: call.method, url: call.url, as: {} }));
  const kept = [...unique.values()].slice(0, LIMIT);
  const own = await browser.newContext({ storageState: control });
  const repeatable: boolean[] = [];
  try {
    for (const [index, call] of kept.entries()) {
      const again = await own.request
        .fetch(call.url, { method: call.method, data: call.data ?? undefined, maxRedirects: 0, failOnStatusCode: false })
        .then((answer) => answer.status(), () => 0);
      repeatable.push(again >= 200 && again < 300 && (await call.body) !== null);
      if (!repeatable[index]) rows[index].unasked = `the scene's own stored session got ${again || 'no answer'} or the first answer could not be read`;
    }
  } finally {
    await own.close();
  }
  if (kept.length > 0 && !repeatable.some(Boolean)) {
    throw new Error('access(): the stored session repeats none of these calls, so it cannot stand in for the account. Use the wrong-person worker.');
  }
  for (const [persona, storageState] of Object.entries(sessions)) {
    const context = await browser.newContext(storageState ? { storageState } : {});
    try {
      for (const [index, call] of kept.entries()) {
        if (!repeatable[index]) continue;
        const original = await call.body;
        let status = 0;
        let verdict: Verdict = 'error';
        try {
          const answer = await context.request.fetch(call.url, {
            method: call.method, data: call.data ?? undefined, maxRedirects: 0, failOnStatusCode: false,
          });
          status = answer.status();
          if ([401, 403, 404].includes(status) || (status >= 300 && status < 400)) verdict = 'enforced';
          else if (status < 300) verdict = digest(await answer.body()) === original ? 'same' : 'differs';
        } catch (error) {
          rows[index].as[persona] = { status, verdict, error: String(error).split('\n')[0].slice(0, 120) };
          continue;
        }
        rows[index].as[persona] = { status, verdict };
      }
    } finally {
      await context.close();
    }
  }
  return rows;
}
