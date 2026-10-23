import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = join(repositoryRoot, "skills/approval-canvas");
const template = join(skill, "references/template");

function requireText(source, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `${label}: missing ${JSON.stringify(fragment)}`);
  }
}

function checkFidelity(directory) {
  return spawnSync(process.execPath, [join(directory, "check-fidelity.mjs")], { encoding: "utf8" });
}

// The shipped template shows only what the UI package renders.
const clean = checkFidelity(template);
assert.equal(clean.status, 0, `template must pass check-fidelity:\n${clean.stderr}`);

// A canvas-only restyle of a real component is caught, and so is an inline <style>.
const scratch = await mkdtemp(join(tmpdir(), "approval-canvas-fidelity-"));
try {
  await cp(template, scratch, { recursive: true });
  const css = await readFile(join(scratch, "src/canvas.css"), "utf8");
  await writeFile(
    join(scratch, "src/canvas.css"),
    `${css}\n.essential-table tbody tr:last-child { border-bottom: 0; }\n@media (max-width: 767px) { .canvas-shell [data-sidebar="sidebar"] { padding-top: 0; } }\n`,
  );
  const dirty = checkFidelity(scratch);
  assert.equal(dirty.status, 1, "a restyled component must fail check-fidelity");
  requireText(dirty.stderr, [".essential-table tbody tr:last-child", '.canvas-shell [data-sidebar="sidebar"]'], "check-fidelity report");

  await writeFile(join(scratch, "src/canvas.css"), css);
  await writeFile(join(scratch, "src/screens/inline.tsx"), "export const X = () => <style>{'td{border:0}'}</style>;\n");
  const inline = checkFidelity(scratch);
  assert.equal(inline.status, 1, "an inline <style> must fail check-fidelity");
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// The workflow keeps the fidelity rules and the parity gate.
const skillText = await readFile(join(skill, "SKILL.md"), "utf8");
requireText(
  skillText,
  ["The canvas starts from the product's baseline", "font links", "Propose freely, declare every difference", "Fidelity constrains the implementation, not the proposal", "src/proposed.css", "check-fidelity.mjs", "product's default theme", "THEMES=claro,escuro", "an embedded `<style>`", "Parity gate before the PR", "pairs.mjs", "references/handoff-brief.md"],
  "approval-canvas SKILL.md",
);
const handoff = await readFile(join(skill, "references/handoff-brief.md"), "utf8");
requireText(handoff, ["Deviations need the user", "Parity gate", "same theme"], "handoff-brief.md");
const implementer = await readFile(join(skill, "references/implementer-brief.md"), "utf8");
requireText(implementer, ["THEMES=claro,escuro", "DARK", "todos os estados"], "implementer-brief.md");
const readme = await readFile(join(skill, "references/rounds-readme-template.md"), "utf8");
requireText(readme, ["## Mudanças no pacote de UI", "## Desvios aprovados"], "rounds-readme-template.md");

console.log("Validated approval-canvas fidelity check, parity gate, and hand-off contracts.");

for (const { name, css, status, diagnostic } of [
  { name: "B: explicit and implicit frame nesting", css: ".canvas-shell { & main { overflow: visible; } > [data-sidebar=\"inset\"] { overflow: visible; } }", status: 0 },
  { name: "B: declarations before nested blocks", css: ".canvas-shell { min-height: calc(100svh - 68px); overflow: visible; & main { overflow: visible; } }", status: 0 },
  { name: "B: nested component restyling is rejected", css: ".canvas-shell { & main { & button { border: 0; } } }", status: 1, diagnostic: '.canvas-shell main button' },
  { name: "B: comments and quoted delimiters", css: '/* { misleading, selector } */ .canvas-shell/* frame */ { content: "/* literal */;{},"; /* nested */ & main { overflow: visible; } }', status: 0 },
  { name: "B: commas inside functions remain in the selector", css: ".canvas-shell { &:is(main, aside), & main { overflow: visible; } }", status: 1, diagnostic: '.canvas-shell:is(main, aside)' },
  { name: "B: commas inside quoted attributes remain in the selector", css: '[data-label="one,two"] { color: red; }', status: 1, diagnostic: '[data-label="one,two"]' },
  { name: "B: nested media preserves the parent selector", css: "@media (min-width: 390px) { .canvas-shell { height: auto; @media (max-width: 1440px) { & main { overflow: visible; } } } }", status: 0 },
  { name: "B: unsupported block at-rules are diagnosed", css: "@layer frame { .canvas-shell { height: auto; } }", status: 1, diagnostic: "Sintaxe CSS não suportada: @layer" },
  { name: "B: unclosed blocks are diagnosed", css: ".canvas-shell { & main { overflow: visible; }", status: 1, diagnostic: "CSS inválido" },
]) {
  test(name, async () => {
    const directory = await mkdtemp(join(tmpdir(), "approval-canvas-css-"));
    try {
      await cp(template, directory, { recursive: true });
      await writeFile(join(directory, "src/canvas.css"), css);
      const result = checkFidelity(directory);
      assert.equal(result.status, status, result.stderr);
      if (diagnostic) assert.ok(result.stderr.includes(diagnostic), result.stderr);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

async function withProposals({ proposedCss, components = [], readme }, run) {
  const directory = await mkdtemp(join(tmpdir(), "approval-canvas-proposals-"));
  try {
    await cp(template, directory, { recursive: true });
    if (proposedCss !== undefined) await writeFile(join(directory, "src/proposed.css"), proposedCss);
    if (components.length) {
      await mkdir(join(directory, "src/proposed"), { recursive: true });
      for (const name of components) {
        await writeFile(join(directory, "src/proposed", `${name}.tsx`), `export function ${name}() { return null; }\n`);
      }
    }
    if (readme !== undefined) await writeFile(join(directory, "README.md"), readme);
    await run(checkFidelity(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const listed = (...names) =>
  `# Área\n\n## Mudanças no pacote de UI\n\n| Proposta |\n| --- |\n${names.map((name) => `| ${name} |`).join("\n")}\n\n## Desvios aprovados\n`;

test("proposals: a declared and listed new look passes", async () => {
  await withProposals(
    { proposedCss: "/* proposta: Divisória leve */\n.lista tr { border-color: red; }\n", components: ["CartaoPassaporte"], readme: listed("Divisória leve", "CartaoPassaporte") },
    (result) => {
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /2 proposta\(s\) declarada\(s\)/);
    },
  );
});

test("proposals: a rule without a proposta marker fails", async () => {
  await withProposals({ proposedCss: ".lista tr { border-color: red; }\n", readme: listed() }, (result) => {
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("regra antes do primeiro"), result.stderr);
  });
});

test("proposals: a proposal missing from the README fails", async () => {
  await withProposals(
    { proposedCss: "/* proposta: Divisória leve */\n.lista tr { border-color: red; }\n", readme: listed("Outra coisa") },
    (result) => {
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes('proposta "Divisória leve" não está no README'), result.stderr);
    },
  );
});

test("proposals: a new component missing from the README fails, even without a README", async () => {
  await withProposals({ components: ["CartaoPassaporte"] }, (result) => {
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('proposta "CartaoPassaporte"'), result.stderr);
  });
});

test("proposals: listing a name outside the UI-changes section does not count", async () => {
  await withProposals(
    { proposedCss: "/* proposta: Divisória leve */\n.x { color: red; }\n", readme: "# Área\n\n## Desvios aprovados\n\nDivisória leve\n\n## Mudanças no pacote de UI\n\n| Proposta |\n" },
    (result) => assert.equal(result.status, 1, "the name must be in the UI-changes section"),
  );
});

test("D: capture jobs cover each requested state, theme and width with stable names", async () => {
  const { captureJobs } = await import(pathToFileURL(join(template, "capture-jobs.mjs")));
  const screens = [{ id: "A1", states: ["vazio"] }, { id: "B1", states: [] }];
  const names = (options) => captureJobs(screens, options).map((job) => job.name);
  assert.deepEqual(names({ only: ["A1"], themes: "escuro,claro" }), [
    "A1-escuro-1440", "A1-escuro-390", "A1-1440", "A1-390",
    "A1-vazio-escuro-1440", "A1-vazio-escuro-390", "A1-vazio-1440", "A1-vazio-390",
  ]);
  assert.deepEqual(names({}), [
    "A1-1440", "A1-390", "A1-vazio-1440", "A1-vazio-390", "B1-1440", "B1-390",
  ]);
  assert.deepEqual(names({ dark: "A1" }), [
    "A1-1440", "A1-390", "A1-escuro-1440", "A1-escuro-390",
    "A1-vazio-1440", "A1-vazio-390", "A1-vazio-escuro-1440", "A1-vazio-escuro-390", "B1-1440", "B1-390",
  ]);
  const jobs = captureJobs([{ id: "A1", states: ["erro"] }], { themes: "escuro", dark: "A1" });
  assert.equal(jobs.length, 4, "explicit THEMES takes precedence over legacy DARK");
  assert.deepEqual(jobs[2], { id: "A1", state: "erro", theme: "escuro", width: 1440, name: "A1-erro-escuro-1440" });
  assert.throws(() => captureJobs(screens, { themes: "sepia" }), /THEMES/);
});

test("C: empty folders fail before resolving or launching Playwright", async () => {
  const directory = await mkdtemp(join(tmpdir(), "approval-canvas-empty-"));
  try {
    const canvas = join(directory, "canvas");
    const app = join(directory, "app");
    await mkdir(canvas);
    await mkdir(app);
    const result = spawnSync(process.execPath, [join(template, "pairs.mjs")], {
      env: { ...process.env, UI_ROOT: process.env.UI_ROOT ?? directory, CANVAS: canvas, APP: app, PAIRS: join(directory, "pairs") },
      encoding: "utf8",
    });
    assert.equal(result.status, 1, "empty folders must not produce a successful gallery");
    assert.ok(result.stderr.includes("Nenhum par PNG"), result.stderr);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("A: pairs render both PNG colors and the saved gallery loads its images", {
  skip: !process.env.UI_ROOT && "Set UI_ROOT (and WEB_APP if needed) to run the real Playwright test.",
}, async () => {
  const root = resolve(process.env.UI_ROOT);
  const require = createRequire(join(root, process.env.WEB_APP ?? "apps/web", "package.json"));
  const { chromium } = require("@playwright/test");
  const directory = await mkdtemp(join(tmpdir(), "approval-canvas-pairs-"));
  let browser;
  try {
    const canvas = join(directory, "canvas");
    const app = join(directory, "app");
    const pairs = join(directory, "pairs");
    await mkdir(canvas);
    await mkdir(app);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 32, height: 32 } });
    // Literal colors make blank/broken image boxes fail independently of layout.
    for (const [folder, color] of [[canvas, "rgb(255, 0, 0)"], [app, "rgb(0, 0, 255)"]]) {
      await page.setContent(`<body style="margin:0;background:${color}"></body>`);
      await page.screenshot({ path: join(folder, "A1-1440.png") });
    }
    const result = spawnSync(process.execPath, [join(template, "pairs.mjs")], {
      env: { ...process.env, CANVAS: canvas, APP: app, PAIRS: pairs }, encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    await page.goto(pathToFileURL(join(pairs, "A1-1440.png")).href);
    const colors = await page.evaluate(async () => {
      const image = document.querySelector("img");
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let red = 0;
      let blue = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 0) red++;
        if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 255) blue++;
      }
      return { red, blue };
    });
    assert.ok(colors.red > 100 && colors.blue > 100, `pair must contain red and blue pixels: ${JSON.stringify(colors)}`);
    await page.goto(pathToFileURL(join(pairs, "pairs.html")).href);
    assert.deepEqual(await page.locator("img").evaluateAll((images) => images.map((img) => img.complete && img.naturalWidth > 0)), [true, true]);
    // Optional artifact export for visual inspection; fixtures are always removed.
    if (process.env.PAIRS_TEST_OUTPUT) await cp(pairs, resolve(process.env.PAIRS_TEST_OUTPUT), { recursive: true });
    await writeFile(join(app, "A1-1440.png"), "invalid PNG");
    const invalid = spawnSync(process.execPath, [join(template, "pairs.mjs")], {
      env: { ...process.env, CANVAS: canvas, APP: app, PAIRS: pairs }, encoding: "utf8",
    });
    assert.equal(invalid.status, 1, "an invalid PNG must fail pairs.mjs");
    requireText(invalid.stderr, ["App", "A1-1440.png"], "broken image diagnostic");
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
