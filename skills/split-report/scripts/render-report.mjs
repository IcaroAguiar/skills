#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function fail(message) {
  process.stderr.write(`split-report: ${message}\n`);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) positional.push(argv[i]);
    else {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) flags[key] = true;
      else {
        flags[key] = value;
        i += 1;
      }
    }
  }
  return { positional, flags };
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`cannot read ledger ${file}: ${error.message}`);
  }
}

function mimeFor(file, declared) {
  if (declared) return declared;
  const extension = path.extname(file).toLowerCase();
  return ({
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain",
    ".log": "text/plain", ".json": "application/json",
  })[extension] ?? "application/octet-stream";
}

function materializeArtifacts(ledger, ledgerPath) {
  const base = ledger.runDir ? path.resolve(ledger.runDir) : path.dirname(path.resolve(ledgerPath));
  return (ledger.artifacts ?? []).map((artifact) => {
    const file = path.isAbsolute(artifact.path) ? artifact.path : path.resolve(base, artifact.path);
    if (!fs.existsSync(file)) {
      if (artifact.required) fail(`required artifact is unavailable: ${artifact.id} (${file})`);
      return { ...artifact, available: false, resolvedPath: file };
    }
    if (artifact.redacted !== true) fail(`artifact is not confirmed redacted: ${artifact.id}`);
    const stats = fs.statSync(file);
    if (!stats.isFile()) fail(`artifact is not a file: ${artifact.id} (${file})`);
    const mime = mimeFor(file, artifact.mime);
    const bytes = fs.readFileSync(file);
    const textLike = artifact.kind === "log" || artifact.kind === "text";
    return {
      ...artifact,
      available: true,
      resolvedPath: file,
      mime,
      size: bytes.length,
      embedded: textLike ? bytes.toString("utf8").slice(0, 30000) : `data:${mime};base64,${bytes.toString("base64")}`,
    };
  });
}

function graphLevels(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cache = new Map();
  function level(id, stack = new Set()) {
    if (cache.has(id)) return cache.get(id);
    if (stack.has(id)) return 0;
    stack.add(id);
    const node = byId.get(id);
    const result = node?.dependencies?.length
      ? 1 + Math.max(...node.dependencies.map((dependency) => level(dependency, new Set(stack))))
      : 0;
    cache.set(id, result);
    return result;
  }
  const groups = new Map();
  for (const node of nodes) {
    const value = level(node.id);
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(node);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}

function badge(state) {
  return `<span class="badge state-${escapeHtml(state)}">${escapeHtml(state)}</span>`;
}

function list(values, empty = "None") {
  if (!values?.length) return `<span class="muted">${escapeHtml(empty)}</span>`;
  return `<ul>${values.map((value) => `<li>${escapeHtml(typeof value === "string" ? value : JSON.stringify(value))}</li>`).join("")}</ul>`;
}

function renderNode(node, evidence) {
  const receipts = evidence.filter((item) => item.nodeId === node.id);
  const search = [node.id, node.title, node.kind, node.state, ...(node.ownership ?? [])].join(" ").toLowerCase();
  return `<article class="node-card" data-kind="${escapeHtml(node.kind)}" data-state="${escapeHtml(node.state)}" data-search="${escapeHtml(search)}">
    <div class="node-head"><div><span class="eyebrow">${escapeHtml(node.kind)} · ${escapeHtml(node.id)}</span><h3>${escapeHtml(node.title)}</h3></div>${badge(node.state)}</div>
    <div class="node-meta"><span>Reasoning ${escapeHtml(node.reasoning)}</span><span>Attempts ${node.attempts}/${node.maxAttempts}</span><span>Graph v${escapeHtml(node.graphVersion ?? "current")}</span></div>
    <div class="node-grid">
      <section><h4>Acceptance</h4>${list(node.acceptanceCriteria)}</section>
      <section><h4>Ownership</h4>${list(node.ownership)}</section>
      <section><h4>Dependencies</h4>${list(node.dependencies)}</section>
      <section><h4>Residual risk</h4>${list(node.residualRisk)}</section>
    </div>
    ${node.summary ? `<p class="summary">${escapeHtml(node.summary)}</p>` : ""}
    <details><summary>Receipts (${receipts.length})</summary>${receipts.length ? receipts.map((item) => `<div class="receipt"><strong>${escapeHtml(item.id)}</strong>${badge(item.current === false ? "STALE" : item.result)}<p>${escapeHtml(item.procedure)}</p><p class="muted">${escapeHtml(item.source)} · ${escapeHtml(item.environment)}</p></div>`).join("") : `<p class="muted">No admitted receipts.</p>`}</details>
    ${node.thread?.threadId ? `<p class="thread">Thread ${escapeHtml(node.thread.threadId)}${node.thread.hostId ? ` · ${escapeHtml(node.thread.hostId)}` : ""}</p>` : ""}
  </article>`;
}

function renderArtifact(artifact) {
  if (!artifact.available) return `<article class="artifact missing"><h3>${escapeHtml(artifact.label ?? artifact.id)}</h3>${badge("MISSING")}<p>${escapeHtml(artifact.summary)}</p></article>`;
  let media = "";
  if (artifact.kind === "image") media = `<img src="${artifact.embedded}" alt="${escapeHtml(artifact.label ?? artifact.id)}">`;
  else if (artifact.kind === "video") media = `<video controls preload="metadata" src="${artifact.embedded}"></video>`;
  else media = `<pre>${escapeHtml(artifact.embedded)}</pre>`;
  return `<article class="artifact"><div class="artifact-media">${media}</div><div class="artifact-copy"><span class="eyebrow">${escapeHtml(artifact.kind)} · ${escapeHtml(artifact.nodeId ?? "run")}</span><h3>${escapeHtml(artifact.label ?? artifact.id)}</h3><p>${escapeHtml(artifact.summary)}</p><p class="muted">${Math.ceil((artifact.size ?? 0) / 1024)} KB · redacted</p></div></article>`;
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [ledgerPath, reportPath] = positional;
if (!ledgerPath || !reportPath) fail("usage: render-report.mjs <ledger.json> <report.html> [--max-bytes 52428800]");
const maxBytes = Number(flags["max-bytes"] ?? 52428800);
if (!Number.isFinite(maxBytes) || maxBytes < 1024) fail("--max-bytes must be at least 1024");

const ledger = loadJson(ledgerPath);
for (const key of ["runId", "title", "state", "graphVersion", "nodes", "evidence", "artifacts", "plan", "report"]) {
  if (!(key in ledger)) fail(`ledger is missing ${key}`);
}
const artifacts = materializeArtifacts(ledger, ledgerPath);
const nodes = ledger.nodes ?? [];
const levels = graphLevels(nodes);
const counts = nodes.reduce((result, node) => ({ ...result, [node.state]: (result[node.state] ?? 0) + 1 }), {});
const active = nodes.filter((node) => !["PASSED", "INVALIDATED"].includes(node.state)).length;
const passed = counts.PASSED ?? 0;
const progress = nodes.length ? Math.round((passed / nodes.length) * 100) : 0;
const embeddedLedger = { ...ledger, report: { ...ledger.report, path: path.resolve(reportPath), lastRenderedAt: ledger.updatedAt ?? ledger.createdAt }, artifacts: ledger.artifacts };
const safeLedger = JSON.stringify(embeddedLedger).replaceAll("<", "\\u003c");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23181c22'/%3E%3Cpath d='M8 10h16M8 16h10M8 22h13' stroke='%2376a8ff' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E">
<title>${escapeHtml(ledger.title)} · Split Engineering</title>
<style>
:root{color-scheme:dark;--bg:#0b0d10;--surface:#12151a;--surface2:#181c22;--line:#2a3038;--text:#f2f4f7;--muted:#929ba8;--blue:#76a8ff;--green:#63d7a0;--amber:#f2be63;--red:#ff7f86;--purple:#b39aff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% -10%,#1d2b45 0,transparent 32%),var(--bg);color:var(--text);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--blue)}.shell{max-width:1500px;margin:auto;padding:34px}.hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:28px}.eyebrow{display:block;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.hero h1{font-size:clamp(34px,5vw,68px);line-height:1;margin:.16em 0}.hero p{max-width:760px;color:#c3cad4;font-size:16px}.hero-state{text-align:right}.hero-state .badge{font-size:13px}.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--line);margin:26px 0;border:1px solid var(--line);border-radius:14px;overflow:hidden}.stat{background:rgba(18,21,26,.94);padding:18px}.stat strong{display:block;font-size:28px}.stat span{color:var(--muted)}.progress{height:4px;background:#232932;border-radius:99px;overflow:hidden;margin-top:12px}.progress i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--green));width:${progress}%}.toolbar{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;padding:12px 0;background:rgba(11,13,16,.9);backdrop-filter:blur(16px)}input,select{background:var(--surface);border:1px solid var(--line);border-radius:10px;color:var(--text);padding:10px 12px}input{min-width:280px}.section{margin-top:42px}.section-title{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:18px}.section h2{font-size:22px;margin:0}.muted{color:var(--muted)}.badge{display:inline-flex;align-items:center;border:1px solid #3a424e;border-radius:999px;padding:3px 8px;color:#c7ced8;font-size:10px;font-weight:800;letter-spacing:.08em}.state-PASSED,.state-PASS,.state-COMPLETE{color:var(--green);border-color:#285e49}.state-FAILED,.state-FAIL,.state-BLOCKED,.state-MISSING{color:var(--red);border-color:#6e3438}.state-RUNNING,.state-EXECUTING,.state-TESTING,.state-INTEGRATING{color:var(--blue);border-color:#365884}.state-EVIDENCE_PENDING,.state-PLAN_PENDING_USER,.state-AWAITING_REVIEW_DECISION,.state-PASS_WITH_RISK{color:var(--amber);border-color:#755d35}.state-INVALIDATED,.state-STALE{color:var(--purple);border-color:#564778}.graph{display:flex;gap:18px;overflow-x:auto;padding:2px 2px 18px}.level{min-width:320px;display:flex;flex-direction:column;gap:12px}.level-label{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.1em}.node-card{background:linear-gradient(145deg,rgba(24,28,34,.96),rgba(16,19,24,.96));border:1px solid var(--line);border-radius:14px;padding:17px;box-shadow:0 12px 36px rgba(0,0,0,.16)}.node-card.hidden{display:none}.node-head{display:flex;justify-content:space-between;gap:16px}.node-card h3{margin:5px 0 0;font-size:17px}.node-meta{display:flex;flex-wrap:wrap;gap:12px;color:var(--muted);font-size:12px;padding:12px 0;border-bottom:1px solid var(--line)}.node-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}.node-grid h4{margin:12px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}ul{margin:0;padding-left:18px}.summary{border-left:2px solid var(--blue);padding-left:10px}details{border-top:1px solid var(--line);margin-top:14px;padding-top:10px}summary{cursor:pointer}.receipt{margin-top:10px;padding:10px;background:#0d1014;border-radius:9px}.receipt .badge{float:right}.thread{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);font-size:11px}.plan-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:18px}.panel{background:rgba(18,21,26,.72);border:1px solid var(--line);border-radius:14px;padding:18px}.panel h3{margin-top:0}.timeline{border-left:1px solid var(--line);padding-left:18px}.event{position:relative;margin:0 0 18px}.event:before{content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:var(--blue);left:-22px;top:7px}.artifacts{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:16px}.artifact{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}.artifact-media{background:#050607;max-height:420px;overflow:auto}.artifact img,.artifact video{display:block;width:100%;max-height:420px;object-fit:contain}.artifact pre{max-height:360px;overflow:auto;white-space:pre-wrap;padding:16px;margin:0;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.artifact-copy{padding:16px}.artifact-copy h3{margin:5px 0}.missing{padding:18px}.ledger{max-height:300px;overflow:auto;background:#07090b;padding:16px;border-radius:12px;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}footer{margin-top:50px;border-top:1px solid var(--line);padding:22px 0;color:var(--muted)}@media(max-width:800px){.shell{padding:20px}.hero{grid-template-columns:1fr}.hero-state{text-align:left}.stats{grid-template-columns:1fr 1fr}.plan-grid{grid-template-columns:1fr}.node-grid{grid-template-columns:1fr}input{min-width:0;width:100%}.toolbar{flex-wrap:wrap}}
@media(max-width:800px){.stat:last-child:nth-child(odd){grid-column:1/-1}}
</style></head><body><main class="shell">
<header class="hero"><div><span class="eyebrow">Split Engineering · Run ${escapeHtml(ledger.runId)} · Graph v${escapeHtml(ledger.graphVersion)}</span><h1>${escapeHtml(ledger.title)}</h1><p>${escapeHtml(ledger.plan.objective || "Objective pending")}</p></div><div class="hero-state">${badge(ledger.state)}<p class="muted">Updated ${escapeHtml(ledger.updatedAt ?? ledger.createdAt)}</p></div></header>
<section class="stats"><div class="stat"><strong>${progress}%</strong><span>graph passed</span><div class="progress"><i></i></div></div><div class="stat"><strong>${nodes.length}</strong><span>nodes</span></div><div class="stat"><strong>${passed}</strong><span>passed</span></div><div class="stat"><strong>${active}</strong><span>active / pending</span></div><div class="stat"><strong>${ledger.evidence.length}</strong><span>receipts</span></div></section>
<section class="plan-grid"><article class="panel"><span class="eyebrow">Outcome contract</span><h3>Objective</h3><p>${escapeHtml(ledger.plan.objective || "Pending")}</p></article><article class="panel"><span class="eyebrow">Boundaries</span><h3>Non-goals</h3>${list(ledger.plan.nonGoals)}</article><article class="panel"><span class="eyebrow">Constraints</span><h3>Guardrails</h3>${list(ledger.plan.constraints)}</article></section>
<div class="toolbar"><input id="search" type="search" placeholder="Filter nodes"><select id="kind"><option value="">All kinds</option>${[...new Set(nodes.map((node) => node.kind))].map((kind) => `<option>${escapeHtml(kind)}</option>`).join("")}</select><select id="state"><option value="">All states</option>${[...new Set(nodes.map((node) => node.state))].map((state) => `<option>${escapeHtml(state)}</option>`).join("")}</select></div>
<section class="section"><div class="section-title"><div><span class="eyebrow">Dependency canvas</span><h2>Engineering graph</h2></div><span class="muted">Columns follow dependency depth</span></div><div class="graph">${levels.map(([level, group]) => `<div class="level"><span class="level-label">Stage ${level + 1}</span>${group.map((node) => renderNode(node, ledger.evidence)).join("")}</div>`).join("")}</div></section>
<section class="section"><div class="section-title"><div><span class="eyebrow">Proof over claims</span><h2>Materialized evidence</h2></div><span class="muted">${artifacts.filter((item) => item.available).length}/${artifacts.length} available</span></div><div class="artifacts">${artifacts.length ? artifacts.map(renderArtifact).join("") : `<p class="muted">No artifacts admitted yet.</p>`}</div></section>
<section class="section"><div class="section-title"><div><span class="eyebrow">Audit trail</span><h2>Run transitions</h2></div></div><div class="timeline">${[...(ledger.stateHistory ?? [])].reverse().map((event) => `<div class="event"><strong>${escapeHtml(event.from)} → ${escapeHtml(event.to)}</strong><p>${escapeHtml(event.reason)}</p><span class="muted">${escapeHtml(event.at)} · ${escapeHtml(event.actor)}</span></div>`).join("") || `<p class="muted">No transitions recorded.</p>`}</div></section>
<section class="section"><div class="section-title"><div><span class="eyebrow">Embedded source</span><h2>Final ledger</h2></div></div><details><summary>Open structured JSON</summary><pre class="ledger">${escapeHtml(JSON.stringify(embeddedLedger, null, 2))}</pre></details></section>
<footer>Self-contained Split Engineering report · mandatory artifacts are embedded · generated from ledger state ${escapeHtml(ledger.updatedAt ?? ledger.createdAt)}</footer>
<script type="application/json" id="split-ledger">${safeLedger}</script><script>
const cards=[...document.querySelectorAll('.node-card')];const search=document.querySelector('#search');const kind=document.querySelector('#kind');const state=document.querySelector('#state');function filter(){const q=search.value.trim().toLowerCase();for(const card of cards){const show=(!q||card.dataset.search.includes(q))&&(!kind.value||card.dataset.kind===kind.value)&&(!state.value||card.dataset.state===state.value);card.classList.toggle('hidden',!show)}}search.addEventListener('input',filter);kind.addEventListener('change',filter);state.addEventListener('change',filter);
</script></main></body></html>`;

const size = Buffer.byteLength(html);
if (size > maxBytes) fail(`report is ${size} bytes, above the ${maxBytes}-byte limit; curate artifacts before retrying`);
const output = path.resolve(reportPath);
fs.mkdirSync(path.dirname(output), { recursive: true });
const temp = `${output}.tmp-${process.pid}`;
fs.writeFileSync(temp, html, { mode: 0o600 });
fs.renameSync(temp, output);
process.stdout.write(`RENDERED ${output} ${size} bytes ${artifacts.length} artifacts\n`);
