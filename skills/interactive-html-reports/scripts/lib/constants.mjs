export const defaultKitVersion = "0.1.0";

export const presetLabels = {
  plan: "Plano",
  implementation: "Implementação",
  review: "Review",
  "operation-smoke": "Operação/Smoke",
  incident: "Incidente",
  "product-rules": "Produto/Regras",
};

export const presetRequiredSections = {
  plan: ["objetivo", "plano", "riscos"],
  implementation: ["mudancas", "evidencias", "decisoes"],
  review: ["findings", "resolucao", "testes"],
  "operation-smoke": ["ambiente", "fluxo", "evidencias"],
  incident: ["impacto", "timeline", "causa-raiz"],
  "product-rules": ["regras", "exemplos", "excecoes"],
};

export const statusLabels = {
  done: "feito",
  partial: "parcial",
  blocked: "bloqueado",
  draft: "rascunho",
  pending: "pendente",
  info: "info",
};

export const statusClassAliases = {
  done: "status-done",
  ok: "status-done",
  pass: "status-done",
  passed: "status-done",
  feito: "status-done",
  blocked: "status-blocked",
  fail: "status-blocked",
  failed: "status-blocked",
  erro: "status-blocked",
  partial: "status-partial",
  draft: "status-partial",
  pending: "status-partial",
  warning: "status-partial",
};
