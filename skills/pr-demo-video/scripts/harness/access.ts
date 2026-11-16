import crypto from 'node:crypto';
import type { Browser, Response } from '@playwright/test';

// qa-crew access check: what the scene's account fetched, asked again as someone else. Rows are candidates to triage.
export type Seen = { method: string; url: string; data: string | null; headers: Record<string, string>; bound: string | null; body: Promise<string | null> };
export type Verdict = 'enforced' | 'same' | 'differs' | 'redirected' | 'error';
export type AccessRow = { method: string; url: string; unasked?: string; as: Record<string, { status: number; verdict: Verdict; error?: string }> };

function within<T>(ms: number, work: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

const digest = (body: Buffer) => crypto.createHash('sha256').update(body).digest('hex');
const LIMIT = 60;
// Sent with another session, a header like these is refused for the wrong reason, and the refusal would read as enforced.
const SESSION_BOUND = /^authorization$|csrf|xsrf|token|session|api-?key/i;
// The session is what changes between askers; everything else the page sent goes again, or a scoped call is not the same call.
const NOT_REPLAYED = /^(:|cookie$|authorization$|host$|content-length$|connection$|accept-encoding$|origin$|referer$|sec-)/i;
// A stream or a long poll never finishes; its body is then unknown, not awaited forever.
const BODY_WAIT_MS = 5000;

export function seen(response: Response): Seen | null {
  const request = response.request();
  if (!['xhr', 'fetch'].includes(request.resourceType()) || !/^https?:/.test(response.url()) || response.status() >= 400) return null;
  return {
    method: request.method(),
    url: response.url(),
    data: request.postData(),
    headers: Object.fromEntries(Object.entries(request.headers()).filter(([name]) => !NOT_REPLAYED.test(name))),
    bound: Object.keys(request.headers()).find((name) => SESSION_BOUND.test(name)) ?? null,
    body: within(BODY_WAIT_MS, response.body().then(digest, () => null)),
  };
}

const ask = (call: Seen) => ({
  method: call.method, data: call.data ?? undefined, headers: call.headers, maxRedirects: 0, failOnStatusCode: false,
});

/** `control` is the scene's own session: a call it cannot repeat proves nothing about anyone else. */
export async function replay(
  browser: Browser, calls: Seen[], control: string, sessions: Record<string, string | undefined>, writes = false,
): Promise<{ rows: AccessRow[]; dropped: number }> {
  const bound = calls.find((call) => call.bound)?.bound;
  if (bound) {
    throw new Error(`access(): this app sends the header ${bound}, which belongs to one session and cannot be asked again as someone else. Use the wrong-person worker.`);
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
      const original = await call.body;
      const again = await own.request.fetch(call.url, ask(call)).then(async (answer) => answer.ok() && digest(await answer.body()), () => false);
      repeatable.push(original !== null && again === original);
      if (!repeatable[index]) rows[index].unasked = 'the scene\'s own stored session did not get the first answer again';
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
          const answer = await context.request.fetch(call.url, ask(call));
          status = answer.status();
          // The body decides before the status does: a 403 that still carries the data is a leak.
          if (digest(await answer.body()) === original) verdict = 'same';
          else if ([401, 403, 404].includes(status)) verdict = 'enforced';
          else if (status >= 300 && status < 400) verdict = 'redirected';
          else if (status < 300) verdict = 'differs';
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
  return { rows, dropped: unique.size - kept.length };
}
