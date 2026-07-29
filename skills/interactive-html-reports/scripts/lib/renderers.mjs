import { defaultKitVersion, presetLabels, statusClassAliases, statusLabels } from "./constants.mjs";
import { escapeAttr, escapeHtml, uniqueId } from "./html.mjs";
import { renderMarkdown } from "./markdown.mjs";
import { renderMermaid } from "./mermaid.mjs";

function statusClass(status = "info") {
  return statusClassAliases[String(status).toLowerCase()] || "status-info";
}

function statusLabel(status = "info") {
  return statusLabels[String(status).toLowerCase()] || String(status);
}

function renderStatus(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(statusLabel(status))}</span>`;
}

function renderMetrics(items = []) {
  if (!items.length) return "";
  return `<div class="metric-grid">${items
    .map(
      (item) =>
        `<article class="metric-card" data-search-item data-status="${escapeAttr(item.status || "info")}"><strong>${escapeHtml(
          item.value ?? item.title ?? "",
        )}</strong><span>${escapeHtml(item.label ?? item.description ?? "")}</span></article>`,
    )
    .join("")}</div>`;
}

function renderKanban(columns = []) {
  if (!columns.length) return "";
  return `<div class="kanban">${columns
    .map((column) => {
      const cards = column.cards || column.items || [];
      return `<section class="kanban-column" data-search-item>
        <header><span>${escapeHtml(column.title || column.status || "Coluna")}</span><span>${cards.length}</span></header>
        <div class="kanban-cards">${cards
          .map(
            (card) =>
              `<article class="report-card" data-search-item data-status="${escapeAttr(card.status || column.status || "info")}">
                <h4>${escapeHtml(card.title || "")}</h4>
                ${card.body || card.description ? `<p>${escapeHtml(card.body || card.description)}</p>` : ""}
                <div class="chip-row">${[card.tag, card.type, card.date]
                  .filter(Boolean)
                  .map((value) => `<span class="chip">${escapeHtml(value)}</span>`)
                  .join("")}</div>
              </article>`,
          )
          .join("")}</div>
      </section>`;
    })
    .join("")}</div>`;
}

function renderTimeline(items = []) {
  if (!items.length) return "";
  return `<div class="timeline">${items
    .map(
      (item) =>
        `<article class="timeline-item" data-search-item data-status="${escapeAttr(item.status || "info")}">
          <div>
            <p class="card-meta">${escapeHtml(item.date || item.time || item.label || "")}</p>
            ${item.status ? renderStatus(item.status) : ""}
          </div>
          <div>
            <h4>${escapeHtml(item.title || "")}</h4>
            ${item.body || item.description ? `<p>${escapeHtml(item.body || item.description)}</p>` : ""}
          </div>
        </article>`,
    )
    .join("")}</div>`;
}

function renderEvidenceTable(items = []) {
  if (!items.length) return "";
  return `<div class="table-wrap"><table>
    <thead><tr><th>Evidência</th><th>Comando/Origem</th><th>Resultado</th><th>Status</th></tr></thead>
    <tbody>${items
      .map(
        (item) =>
          `<tr data-search-item data-status="${escapeAttr(item.status || "info")}">
            <td data-label="Evidência">${escapeHtml(item.title || item.name || "")}</td>
            <td data-label="Comando/Origem">${item.href ? `<a href="${escapeAttr(item.href)}">${escapeHtml(item.source || item.href)}</a>` : escapeHtml(item.source || item.command || "")}</td>
            <td data-label="Resultado">${escapeHtml(item.result || item.summary || "")}</td>
            <td data-label="Status">${renderStatus(item.status || "info")}</td>
          </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function renderScreenshots(items = []) {
  if (!items.length) return "";
  return `<div class="screenshot-grid">${items
    .map(
      (item) =>
        `<figure class="screenshot-card" data-search-item>
          <img src="${escapeAttr(item.outputSrc || item.src)}" alt="${escapeAttr(item.alt || item.caption || item.title || "Captura de tela")}" />
          <figcaption>${escapeHtml(item.caption || item.title || "")}</figcaption>
        </figure>`,
    )
    .join("")}</div>`;
}

function renderCards(items = [], className = "card-grid") {
  if (!items.length) return "";
  return `<div class="${className}">${items
    .map(
      (item) =>
        `<article class="report-card" data-search-item data-status="${escapeAttr(item.status || "info")}">
          <div class="chip-row">${item.status ? renderStatus(item.status) : ""}${item.type ? `<span class="chip">${escapeHtml(item.type)}</span>` : ""}</div>
          <h4>${escapeHtml(item.title || item.rule || item.decision || item.risk || "")}</h4>
          ${item.body || item.description || item.reason ? `<p>${escapeHtml(item.body || item.description || item.reason)}</p>` : ""}
          ${item.example ? `<p class="card-meta">${escapeHtml(item.example)}</p>` : ""}
        </article>`,
    )
    .join("")}</div>`;
}

function renderCodeCompare(item = {}) {
  return `<div class="code-compare">
    <div class="compare-pane">
      <h4>${escapeHtml(item.beforeTitle || "Antes")}</h4>
      <pre><code>${escapeHtml(item.before ?? "")}</code></pre>
    </div>
    <div class="compare-pane">
      <h4>${escapeHtml(item.afterTitle || "Depois")}</h4>
      <pre><code>${escapeHtml(item.after ?? "")}</code></pre>
    </div>
  </div>`;
}

function renderNativeFlow(diagram = {}) {
  const nodes = diagram.nodes || [];
  const edges = diagram.edges || [];
  const width = Math.max(620, nodes.length * 170 + 80);
  const positions = new Map(nodes.map((node, index) => [node.id, { x: 50 + index * 170, y: 78 }]));
  const edgeSvg = edges
    .map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return "";
      const x1 = from.x + 130;
      const y1 = from.y + 28;
      const x2 = to.x;
      const y2 = to.y + 28;
      const labelX = (x1 + x2) / 2;
      return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#8a8173" stroke-width="1.5" fill="none" marker-end="url(#arrow)" />
        ${edge.label ? `<text x="${labelX}" y="${y1 - 10}" text-anchor="middle" font-size="11" fill="#6f716a">${escapeHtml(edge.label)}</text>` : ""}`;
    })
    .join("");
  const nodeSvg = nodes
    .map((node) => {
      const pos = positions.get(node.id);
      const tone = node.tone || "blue";
      return `<g>
        <rect x="${pos.x}" y="${pos.y}" width="130" height="56" rx="8" class="tone-${escapeAttr(tone)}" stroke="#ded8cc" />
        <text x="${pos.x + 65}" y="${pos.y + 32}" text-anchor="middle" font-size="13" font-family="ui-monospace, monospace" fill="currentColor">${escapeHtml(node.label || node.id)}</text>
      </g>`;
    })
    .join("");
  return `<svg class="native-flow" viewBox="0 0 ${width} 210" role="img" aria-label="${escapeAttr(diagram.title || "Diagrama")}">
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8a8173" /></marker></defs>
    ${edgeSvg}
    ${nodeSvg}
  </svg>`;
}

function renderDiagram(diagram = {}) {
  const content =
    diagram.type === "mermaid"
      ? renderMermaid(diagram.source || "", diagram.title)
      : diagram.svg
        ? diagram.trustedSvg
          ? diagram.svg
          : escapeHtml(diagram.svg)
        : renderNativeFlow(diagram);
  return `<figure class="diagram-frame" data-search-item>
    ${diagram.title ? `<figcaption class="eyebrow">${escapeHtml(diagram.title)}</figcaption>` : ""}
    ${content}
    ${diagram.caption ? `<p class="card-meta">${escapeHtml(diagram.caption)}</p>` : ""}
  </figure>`;
}

function renderComponent(component, items, section) {
  const renderers = {
    metrics: () => renderMetrics(items),
    kanban: () => renderKanban(items),
    timeline: () => renderTimeline(items),
    changelog: () => renderTimeline(items),
    "evidence-table": () => renderEvidenceTable(items),
    screenshots: () => renderScreenshots(items),
    diagram: () => (items.length ? items : [section]).map(renderDiagram).join(""),
    "decision-log": () => renderCards(items, "card-grid"),
    "business-rules": () => renderCards(items, "rule-grid"),
    "code-compare": () => renderCodeCompare(section),
    risks: () => renderCards(items, "risk-grid"),
  };
  return renderers[component]?.() || "";
}

export function buildSections(report) {
  const used = new Set();
  const sections = (report.sections || []).map((section) => ({ ...section, id: uniqueId(section.id || section.title, used) }));
  const automatic = [
    ["diagrams", "Diagramas", "Fluxos", "diagram", report.diagrams],
    ["evidence", "Evidências", "Validação", "evidence-table", report.evidence],
    ["screenshots", "Capturas de tela", "Visual", "screenshots", report.screenshots],
    ["decisions", "Decisões", "Racional", "decision-log", report.decisions],
    ["risks", "Riscos e pendências", "Controle", "risks", report.risks],
  ];
  for (const [idBase, title, kicker, component, items] of automatic) {
    if (items?.length && !sections.some((section) => section.component === component || section.id === idBase)) {
      sections.push({ id: uniqueId(idBase, used), title, kicker, component, items });
    }
  }
  return sections;
}

function renderSection(section) {
  const body = [
    section.body ? renderMarkdown(section.body) : "",
    section.trustedHtml || "",
    section.component ? renderComponent(section.component, section.items || [], section) : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `<section class="report-section" id="${escapeAttr(section.id)}" data-search-item data-status="${escapeAttr(section.status || "info")}">
    <header class="section-heading">
      <div>
        ${section.kicker ? `<p class="eyebrow">${escapeHtml(section.kicker)}</p>` : ""}
        <h2>${escapeHtml(section.title || section.id)}</h2>
      </div>
      ${section.status ? renderStatus(section.status) : ""}
    </header>
    <div class="section-body">${body || "<p>Sem conteúdo registrado.</p>"}</div>
  </section>`;
}

export function renderBody(report, sections) {
  const preset = report.preset || "implementation";
  const metrics = report.metrics || [];
  const filters = ["all", "done", "partial", "blocked", "draft", "info"];
  return `<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <header class="report-topbar">
    <div class="breadcrumbs">
      <span class="crumb">reports</span>
      <span class="crumb">·</span>
      <span class="crumb">${escapeHtml(presetLabels[preset] || preset)}</span>
      ${report.source ? `<span class="crumb">·</span><span class="crumb">${escapeHtml(report.source)}</span>` : ""}
    </div>
    <div class="topbar-actions">
      <input type="search" name="report_search" autocomplete="off" data-report-search placeholder="buscar no report…" aria-label="Buscar no report" />
      ${filters.map((filter) => `<button type="button" data-filter="${filter}" aria-pressed="${filter === "all"}">${filter === "all" ? "todos" : filter}</button>`).join("")}
    </div>
  </header>
  <main class="report-shell" id="conteudo">
    <section class="report-hero">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(report.eyebrow || "Report interativo")}</p>
        <h1>${escapeHtml(report.title || "Report")}</h1>
        ${report.subtitle ? `<p class="lede">${escapeHtml(report.subtitle)}</p>` : ""}
      </div>
      <aside class="hero-panel" aria-label="Metadata do report">
        <dl class="metadata-list">
          <div class="metadata-row"><dt>Status</dt><dd>${renderStatus(report.status || "draft")}</dd></div>
          <div class="metadata-row"><dt>Preset</dt><dd>${escapeHtml(presetLabels[preset] || preset)}</dd></div>
          <div class="metadata-row"><dt>Atualizado</dt><dd>${escapeHtml(report.updatedAt || new Date().toISOString())}</dd></div>
          <div class="metadata-row"><dt>Kit</dt><dd>${escapeHtml(report.kitVersion || defaultKitVersion)}</dd></div>
        </dl>
      </aside>
    </section>
    ${metrics.length ? `<section class="report-section" id="metricas" data-search-item><div class="section-body">${renderMetrics(metrics)}</div></section>` : ""}
    <div class="report-layout">
      <nav class="toc" aria-label="Indice do report">
        <p class="toc-title">Conteúdo</p>
        ${metrics.length ? `<a href="#metricas">Métricas</a>` : ""}
        ${sections.map((section) => `<a href="#${escapeAttr(section.id)}">${escapeHtml(section.title || section.id)}</a>`).join("")}
      </nav>
      <div class="report-content">${sections.map(renderSection).join("\n")}</div>
    </div>
    <footer class="report-footer">Gerado com interactive-html-reports ${escapeHtml(report.kitVersion || defaultKitVersion)}.</footer>
  </main>`;
}
