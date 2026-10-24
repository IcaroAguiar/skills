// Vitest reporter: where suite time goes, per test file — import vs setup vs tests.
// Needs Vitest >= 3.2 (TestModule.diagnostic()).
//
//   VITEST_PROFILE_OUT=/abs/profile.json \
//     vitest run <same args as CI> --reporter=default --reporter=/abs/vitest-import-profile.mjs
//
// Prints the import share and the slowest files; writes every file's numbers to
// VITEST_PROFILE_OUT. Times are worker CPU, so they add up to more than wall time.
import { writeFileSync } from 'node:fs';

export default class ImportProfileReporter {
  onTestRunEnd(testModules) {
    const rows = [];
    for (const module of testModules) {
      const diagnostic = module.diagnostic();
      let tests = 0;
      for (const _ of module.children.allTests()) tests++;
      const imports = Object.entries(diagnostic.importDurations ?? {})
        .map(([id, d]) => ({ id, self: Math.round(d.selfTime), total: Math.round(d.totalTime) }))
        .sort((a, b) => b.self - a.self)
        .slice(0, 10);
      rows.push({
        file: module.moduleId,
        state: module.state(),
        tests,
        importMs: Math.round(diagnostic.collectDuration),
        setupMs: Math.round(diagnostic.setupDuration + diagnostic.environmentSetupDuration),
        testsMs: Math.round(diagnostic.duration),
        heaviestImports: imports,
      });
    }
    const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
    const [importMs, setupMs, testsMs] = [sum('importMs'), sum('setupMs'), sum('testsMs')];
    const total = importMs + setupMs + testsMs || 1;
    const pct = (value) => `${Math.round((100 * value) / total)}%`;
    const lines = [
      '',
      `[import-profile] ${rows.length} files: import ${(importMs / 1000).toFixed(0)} s (${pct(importMs)}), setup ${(setupMs / 1000).toFixed(0)} s (${pct(setupMs)}), tests ${(testsMs / 1000).toFixed(0)} s (${pct(testsMs)})`,
      '[import-profile] slowest files (import + setup + tests):',
      ...rows
        .map((row) => ({ ...row, all: row.importMs + row.setupMs + row.testsMs }))
        .sort((a, b) => b.all - a.all)
        .slice(0, 15)
        .map((row) => `  ${(row.all / 1000).toFixed(1).padStart(6)} s  import ${(row.importMs / 1000).toFixed(1)} s  tests ${(row.testsMs / 1000).toFixed(1)} s  ${row.tests} tests  ${row.file.replace(process.cwd() + '/', '')}`),
    ];
    process.stderr.write(`${lines.join('\n')}\n`);
    if (process.env.VITEST_PROFILE_OUT) {
      writeFileSync(process.env.VITEST_PROFILE_OUT, JSON.stringify({ importMs, setupMs, testsMs, files: rows }, null, 1));
    }
  }
}
