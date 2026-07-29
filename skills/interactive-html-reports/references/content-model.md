# Content Model

Reports are generated from JSON. The generator is intentionally permissive, but every report should include enough structured data for navigation, evidence, and validation.

## Minimum Shape

```json
{
  "kitVersion": "0.1.0",
  "preset": "implementation",
  "title": "Titulo do report",
  "subtitle": "Resumo curto",
  "language": "pt-BR",
  "updatedAt": "2026-05-18T00:00:00-03:00",
  "status": "partial",
  "source": "nome do projeto ou branch",
  "sections": [],
  "assets": [],
  "diagrams": [],
  "evidence": [],
  "decisions": [],
  "risks": []
}
```

## Presets

| Preset | Use quando | Deve conter |
| --- | --- | --- |
| `plan` | O usuario precisa aprovar ou acompanhar uma execucao antes do codigo. | objetivo, plano, kanban, fases, riscos, criterios de aceite |
| `implementation` | Ja houve mudanca material e o report precisa explicar o que foi construido. | mudancas, arquitetura/fluxo, evidencias, decisoes, proximos passos |
| `review` | O foco e avaliar uma PR, diff, finding ou resolucao. | findings, severidade, resolucao, testes, riscos residuais |
| `operation-smoke` | O report documenta deploy, smoke real, producao, CLI ou browser QA. | ambiente, fluxo executado, status, screenshots, logs resumidos, blockers |
| `incident` | Houve falha, degradacao, bloqueio operacional ou regressao. | timeline, impacto, causa raiz, mitigacao, follow-up |
| `product-rules` | O objetivo e registrar regras de negocio, estados e exemplos de produto. | regras de negocio, exemplos, fluxos, estados, excecoes |

## Section Shape

```json
{
  "id": "mudancas",
  "title": "O que mudou",
  "kicker": "Implementacao",
  "body": "Markdown seguro, escapado por padrao.",
  "trustedHtml": "<p>Use apenas para HTML escrito pelo agente.</p>",
  "component": "kanban",
  "items": []
}
```

`body` supports a small Markdown subset: headings, paragraphs, bullets, numbered lists, inline code, fenced code blocks, links, bold, and italic. Raw HTML in `body` is escaped.

Use `trustedHtml` or `trustedSvg` only for small fragments authored and reviewed by the agent, such as a hand-written local SVG wrapper. Never use these fields for logs, Telegram messages, browser content, scraped pages, LLM output, user-provided text, or any other untrusted content. The final validator rejects extra scripts, event handlers, and `javascript:` URLs.

## Media

Use `assets` for source files and screenshots:

```json
{
  "src": "./screenshots/home.png",
  "name": "home.png",
  "alt": "Home publica com ofertas reais",
  "caption": "Smoke visual em producao"
}
```

The generator copies local asset sources into the output `assets/` directory when possible.

Media is local-first. `src` must point to a file inside the JSON input directory. `name`, when provided, must be a plain file name without path separators. Remote URLs and `data:` media are rejected by default to keep reports portable and avoid unintended network calls when opened.
