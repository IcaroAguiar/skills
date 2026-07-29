# Prompt: Refinement Pass

## Objetivo
Refinar o texto mantendo fidelidade científica e autoria acadêmica, incorporando evidências validadas e corrigindo estrutura, clareza e coerência.

## Entradas
- `INTAKE_BRIEF`.
- Texto original por seção.
- `CLAIM_LEDGER` e `EVIDENCE_MAP`.
- Regras de estilo (idioma, norma de citação, densidade de formalidade).
- Eventuais restrições de voz autoral (1ª pessoa, passiva ativa, tom comparativo).

## Procedimento
1. Reescreva por seção preservando:
   - tese,
   - hipóteses/objetivos,
   - resultados e conclusões já sustentáveis.
2. Para cada seção:
   - substitua ambiguidades por formulações precisas,
   - alinhe conectores lógicos,
   - elimine redundâncias e saltos argumentativos,
   - mantenha numerais, unidades, datas e nomes técnicos corretos.
3. Incorpore fontes conforme `EVIDENCE_MAP`:
   - inserir marcação de citação apenas onde houver suporte suficiente,
   - remover ou suavizar afirmações com evidência limitada.
4. Aplique microajustes de legibilidade sem reduzir precisão metodológica:
   - frases longas para estrutura bipartida (assertiva + evidência),
   - evitar palavras vagas sem valor técnico.
5. Gere uma versão anotada com rastreabilidade:
 - linhas alteradas e justificativa curta,
 - claims que mudaram de peso (firmez baixa/alta).

## Saída esperada
- `REFINED_TEXT` com estrutura final do texto já passível de validação de qualidade.
- `REFINEMENT_LOG` (itens):
  - `claim_id` impactado,
  - `mudanca` (refrase, corte, reforço, clarificação),
  - `motivo` (coerência, rigor, evidência, estilo),
  - `risco_residual`.

## Guardrails
- Não inventar resultados, dados, métricas, tabelas ou referências bibliográficas.
- Não simplificar termos técnicos a ponto de reduzir precisão.
- Não remover limitações metodológicas; se necessário, fortaleça a transparência.
- Evitar alteração de autoria sem pedido explícito do usuário (voz/hábito de escrita).
- Manter alinhamento com o `Source Policy`: evidência baixa exige tom condicional.
