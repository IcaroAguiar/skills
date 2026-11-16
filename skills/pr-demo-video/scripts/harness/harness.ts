import fs from 'node:fs';
import path from 'node:path';
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { sanitize, diagnosticURL } from './diagnostics.cjs';
import { badgeInitScript, outline, overlayInitScript, setCaption } from './overlay';
import { probeForms, type ProbeResult } from './probe';
import { replay, seen, type AccessRow, type Seen } from './access';

/**
 * One scene = one improvement shown on screen. `play` is what the video
 * shows; it starts from the end state of the previous scene. `prepare`
 * reaches that start state from a fresh, logged-in page so a worker can
 * test the scene alone; it never runs in the final recording.
 */
export type Scene = {
  id: string;
  title: string;
  /** Whose stored session the scene uses when it runs alone; the main account when absent. */
  persona?: string;
  prepare?: (s: SceneCtx) => Promise<void>;
  play: (s: SceneCtx) => Promise<void>;
};

export type SceneCtx = {
  page: Page;
  fast: boolean;
  /** Shows a caption and waits long enough to read it (scaled in fast mode). */
  caption(text: string, holdMs?: number): Promise<void>;
  /** Scrolls the target into view, outlines it and waits. */
  show(target: Locator, holdMs?: number): Promise<void>;
  hold(ms: number): Promise<void>;
  /** Records a fact for the orchestrator (what the screen said, a count…). Never log personal data. */
  note(message: string): void;
  /** A still of the screen as it is now, caption and badge included: shots/<scene>-<n>.png. */
  shot(): Promise<void>;
  /** Writes probe/<scene>-<n>.json. */
  probe(): Promise<ProbeResult>;
  /** Asks again, as each persona and as nobody, for what the scene fetched: access/<scene>-<n>.json. Reads only, unless `writes`. */
  access(personas: string[], options?: { writes?: boolean }): Promise<AccessRow[]>;
};

export type ProjectProfile = {
  baseURL: string;
  viewport: { width: number; height: number };
  locale?: string;
  timezoneId?: string;
  /** Regex sources masked in addition to e-mails. */
  extraMasks?: string[];
  /** True when the stored session still opens the app; `demo.sh login` then keeps it. */
  signedIn?: (page: Page) => Promise<boolean>;
  /** Runs inside the recorded page before scene 1, e.g. switching to the light theme. */
  beforeScenes?: (page: Page) => Promise<void>;
};

type SceneReport = {
  id: string;
  title: string;
  status: 'ok' | 'failed' | 'skipped';
  startMs: number;
  endMs: number;
  error?: string;
  notes: string[];
  consoleErrors: string[];
  failedRequests: string[];
};

export type RunOptions = {
  browser: Browser;
  runDir: string;
  project: ProjectProfile;
  scenes: Scene[];
  /** Scene id to run alone (worker test) or undefined for the full recording. */
  only?: string;
  fast?: boolean;
  record?: boolean;
};

/** A kit keeps sessions between runs (DEMO_AUTH_DIR); otherwise they live in the run. */
export function sessionFile(runDir: string, persona?: string) {
  if (persona && !/^[a-z0-9-]+$/.test(persona)) throw new Error('Persona names use a-z, 0-9 and "-".');
  return path.join(process.env.DEMO_AUTH_DIR || runDir, persona ? `.auth-${persona}.json` : '.auth.json');
}

/** Reads storageState written by login.spec.ts; never prints it. */
function authState(runDir: string, persona?: string) {
  const file = sessionFile(runDir, persona);
  if (!fs.existsSync(file)) throw new Error(`Missing ${path.basename(file)}: run the login step first.`);
  return file;
}

export async function runScenes(options: RunOptions) {
  const { browser, runDir, project, scenes } = options;
  const fast = options.fast ?? false;
  const record = options.record ?? !options.only;
  const selected = options.only ? scenes.filter((scene) => scene.id === options.only) : scenes;

  const clean = (value: unknown) => sanitize(value, project.extraMasks ?? []);
  const message = (error: unknown) => clean(error instanceof Error ? error.message : error);
  const report: { fast: boolean; only: string | null; scenes: SceneReport[]; video: string | null; error?: string } = {
    fast,
    only: options.only ?? null,
    scenes: selected.map((scene): SceneReport => ({
      id: clean(scene.id), title: clean(scene.title), status: 'skipped',
      startMs: 0, endMs: 0, notes: [], consoleErrors: [], failedRequests: [],
    })),
    video: null,
  };
  let context: BrowserContext | undefined;
  let video: ReturnType<Page['video']> = null;
  let current: SceneReport | undefined;
  let persona: string | undefined;
  const videoDir = path.join(runDir, 'video');
  let t0 = Date.now();
  try {
    if (selected.length === 0) throw new Error('No scenes selected');
    persona = (options.only ? selected[0].persona : undefined) ?? (process.env.DEMO_PERSONA || undefined);
    if (record) fs.rmSync(videoDir, { force: true, recursive: true });
    context = await browser.newContext({
      baseURL: project.baseURL,
      colorScheme: 'light',
      locale: project.locale ?? 'pt-BR',
      storageState: authState(runDir, persona),
      timezoneId: project.timezoneId ?? 'America/Sao_Paulo',
      viewport: project.viewport,
      ...(record ? { recordVideo: { dir: videoDir, size: project.viewport } } : {}),
    });
    await context.addInitScript(overlayInitScript, project.extraMasks ?? []);
    // DEMO_BADGE labels a whole recording (qa-crew: "Antes" / "Depois").
    if (process.env.DEMO_BADGE) await context.addInitScript(badgeInitScript, process.env.DEMO_BADGE);
    const page = await context.newPage();
    video = page.video();
    t0 = Date.now();
    const diagnostics = () => current ?? report.scenes[0];
    page.on('console', (entry) => {
      if (entry.type() === 'error') diagnostics()?.consoleErrors.push(clean(entry.text()).slice(0, 300));
    });
    page.on('pageerror', (error) => diagnostics()?.consoleErrors.push(clean(`pageerror: ${error.message}`).slice(0, 300)));
    let calls: Seen[] = [];
    page.on('response', (response) => {
      const call = seen(response);
      if (call && calls.length < 300) calls.push(call);
      if (response.status() >= 400) {
        diagnostics()?.failedRequests.push(clean(`${response.status()} ${response.request().method()} ${diagnosticURL(response.url())}`));
      }
    });
    page.on('requestfailed', (request) => {
      diagnostics()?.failedRequests.push(clean(`${request.method()} ${diagnosticURL(request.url())} ${request.failure()?.errorText ?? ''}`));
    });
    const hold = (ms: number) => page.waitForTimeout(Math.round(ms * (fast ? 0.15 : 1)));
    const shots = path.join(runDir, 'shots');
    fs.mkdirSync(shots, { recursive: true });
    if (project.beforeScenes) await project.beforeScenes(page);
    for (const [index, scene] of selected.entries()) {
      current = report.scenes[index];
      current.startMs = Date.now() - t0;
      current.status = 'ok';
      let probes = 0;
      let stills = 0;
      let checks = 0;
      calls = [];
      const ctx: SceneCtx = {
        caption: async (text, holdMs = 2600) => {
          await setCaption(page, text);
          await hold(holdMs);
        },
        fast, hold, page,
        note: (text) => current?.notes.push(clean(text)),
        shot: async () => {
          stills += 1;
          await page.screenshot({ path: path.join(shots, `${scene.id}-${stills}.png`) });
        },
        probe: async () => {
          const result = await probeForms(page);
          const folder = path.join(runDir, 'probe');
          fs.mkdirSync(folder, { recursive: true });
          probes += 1;
          const safe = JSON.stringify(result, (_key, value) => (typeof value === 'string' ? clean(value) : value), 2);
          fs.writeFileSync(path.join(folder, `${scene.id}-${probes}.json`), safe);
          current?.notes.push(`probe: ${result.ruler.fieldsShown} field(s), ${result.findings.length} candidate(s)`);
          return result;
        },
        access: async (personas, accessOptions = {}) => {
          const sessions: Record<string, string | undefined> = { nobody: undefined };
          for (const persona of personas) sessions[persona] = authState(runDir, persona);
          const rows = await replay(browser, calls, authState(runDir, persona), sessions, accessOptions.writes ?? false);
          const safe = rows.map((row) => ({
            ...row, url: clean(diagnosticURL(row.url)),
            as: Object.fromEntries(Object.entries(row.as).map(([who, answer]) => [who, answer.error ? { ...answer, error: clean(answer.error) } : answer])),
          }));
          const open = safe.filter((row) => Object.values(row.as).some((answer) => answer.verdict === 'same'));
          const unverified = safe.filter((row) => row.unasked || Object.values(row.as).some((answer) => answer.verdict === 'error'));
          const folder = path.join(runDir, 'access');
          fs.mkdirSync(folder, { recursive: true });
          checks += 1;
          fs.writeFileSync(path.join(folder, `${scene.id}-${checks}.json`), JSON.stringify({ asked: Object.keys(sessions), candidates: open, unverified, rows: safe }, null, 2));
          current?.notes.push(`access: ${safe.length} call(s) asked again, ${open.length} answered the same to someone else, ${unverified.length} unverified`);
          return rows;
        },
        show: async (target, holdMs = 2200) => {
          await target.first().scrollIntoViewIfNeeded().catch(() => undefined);
          await outline(target, Math.max(800, holdMs - 200));
          await hold(holdMs);
        },
      };
      try {
        if (options.only && scene.prepare) {
          await setCaption(page, '');
          await scene.prepare({ ...ctx, hold: () => Promise.resolve() });
        }
        await scene.play(ctx);
        await setCaption(page, '');
        await page.screenshot({ path: path.join(shots, `${scene.id}-end.png`) });
      } catch (error) {
        current.status = 'failed';
        current.error = message(error).split('\n').slice(0, 3).join(' | ');
      } finally {
        current.endMs = Date.now() - t0;
      }
      if (current.status === 'failed') break;
    }
  } catch (error) {
    report.error = message(error);
  } finally {
    try {
      await context?.close();
      report.video = video ? await video.path() : null;
    } catch (error) {
      report.error = [report.error, message(error)].filter(Boolean).join(' | ');
    } finally {
      fs.writeFileSync(path.join(runDir, options.only ? `report-${options.only}.json` : 'report.json'), JSON.stringify(report, null, 2));
    }
  }
  return report;
}
