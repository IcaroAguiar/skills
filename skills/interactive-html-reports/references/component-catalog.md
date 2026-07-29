# Component Catalog

Supported component names for `sections[].component`:

- `metrics`: compact metric cards.
- `kanban`: columns with status cards.
- `timeline`: chronological events.
- `evidence-table`: command/link/result evidence.
- `screenshots`: local screenshot gallery.
- `diagram`: native SVG, pre-rendered SVG, or Mermaid-rendered SVG.
- `decision-log`: decision records.
- `business-rules`: rule cards with examples and exceptions.
- `code-compare`: before/after code or text blocks.
- `risks`: risk cards.
- `changelog`: dated changes.

Top-level `evidence`, `decisions`, `risks`, `diagrams`, and `screenshots` are also rendered automatically when present.

## Native Diagram Shape

```json
{
  "type": "native-flow",
  "title": "Fluxo",
  "nodes": [
    { "id": "input", "label": "JSON", "tone": "blue" },
    { "id": "html", "label": "HTML", "tone": "green" }
  ],
  "edges": [
    { "from": "input", "to": "html", "label": "gera" }
  ]
}
```

## Mermaid Shape

```json
{
  "type": "mermaid",
  "title": "Fluxo Mermaid",
  "source": "flowchart LR\nA[JSON] --> B[HTML]"
}
```

Mermaid is rendered through `mmdc` if available. The final HTML receives inline SVG, not a CDN dependency.
