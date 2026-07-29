# Prompt: Final Quality Control

## Objetivo
Executar a checagem final de qualidade editorial, evidencial e de risco antes de entregar o texto refinado.

## Entradas
- `INTAKE_BRIEF`.
- `CLAIM_LEDGER`.
- `EVIDENCE_MAP`.
- `REFINED_TEXT` e `REFINEMENT_LOG`.
- `DETECTOR_AUDIT_REPORT`.
- Rubrica em `academic-style-rubrics.md`.

## Procedimento
1. Validar integridade factual:
   - toda claim principal possui entrada em `EVIDENCE_MAP`;
   - nenhum trecho factual sem rastreabilidade aceitável (se houver, marcar `fail`).
2. Validar consistência editorial:
   - progressão da tese,
   - alinhamento entre objetivo, método e conclusão,
   - transições e coerência entre seções.
3. Aplicar rubrica rápida (1–5) nos seis critérios:
   - estrutura/argumento, rigor metodológico, evidência/citação,
   - precisão linguística, ética/transparência, coerência editorial.
4. Consolidar riscos:
   - claims com fonte limitada,
   - trechos com baixa confiança,
   - alertas de detector com risco de falso positivo.
5. Emitir decisão:
   - `APROVAR` com ressalvas,
   - `APROVAR_COM_RETRABALHO`,
   - `RETRABALHO` obrigatório.
6. Montar pacote de entrega:
   - texto final validado,
   - matriz de evidência resumida,
   - trilha de mudanças,
   - recomendações de revisão adicional.

## Saída esperada
- `FINAL_QC_REPORT` estruturado com:
  - `scores` por critério e score médio ponderado,
  - `evidence_compliance` (`cumpre`/`parcial`/`insuficiente`),
  - `decisão`,
  - `itens_bloqueantes`,
  - `recomendacoes_finais`.

## Guardrails
- Não aprovar texto com claims não verificáveis sem reclassificar sua força para condicional.
- Manter qualquer limitação metodológica explícita no corpo do texto final.
- Não confundir melhoria de linguagem com correção de evidência.
- Exigir rastreabilidade completa de citações e evitar "citação placeholder".
- Se houver risco não resolvido, incluir risco residual com ação concreta e dono da decisão.
