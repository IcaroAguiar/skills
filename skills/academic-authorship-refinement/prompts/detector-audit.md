# Prompt: Detector Audit

## Objetivo
Usar sinais de detecção de escrita automática como insumo de qualidade, sem tratá-los como prova de autoria, aplicando ajustes que melhorem clareza e naturalidade científica.

## Entradas
- `REFINED_TEXT`.
- Saídas de detector (quando houver): indicador global e por seção.
- Notas de risco detectado em `detector-limitations.md`.
- Feedback anterior de revisão de linguagem.

## Procedimento
1. Receba os sinais de risco e agrupe por padrão:
   - repetição de moldes sintáticos,
   - alta uniformidade de estrutura frasal,
   - segmentação excessivamente homogênea.
2. Mapeie cada risco ao trecho e ao tipo de claim:
   - método,
   - revisão de literatura,
   - justificativa estatística,
   - conclusões.
3. Classifique risco de falso positivo provável:
   - alta quando há conteúdo técnico denso, fórmulas, linguagem institucional padrão.
4. Proponha remediações focadas em clareza:
   - variar estratégias de fraseamento sem perder precisão,
   - inserir contraste argumentativo real,
   - reduzir redundância de conectores em sequência.
5. Não force "normalização para parecer humano"; preserve intenção metodológica.

## Saída esperada
- `DETECTOR_AUDIT_REPORT`:
  - `scores`/sinais recebidos,
  - `trechos_criticos[]` com `id_claim`/`id_paragrafo`,
  - `acoes_recomendadas` (semântica/variação textual/justificativa/citacional),
  - `resposta_estimada` (redução de ruído de padrão, sem perda de rigor).

## Guardrails
- Tratar detector como evidência auxiliar, não como decisão final de legitimidade.
- Não remover referências, termos técnicos ou estrutura metodológica só para reduzir flag.
- Não afirmar que o texto se tornou "mais humano"; relatar apenas mudanças de legibilidade e coesão.
- Documentar causalidade explícita de mudança: "ajustado por clareza + precisão", não por manipulação de scoring.
- Se houver conflito entre necessidade de evidência e ajuste de estilo, priorizar evidência.
