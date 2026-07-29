# Prompt: Evidence Synthesis

## Objetivo
Conectar cada claim extraído a fontes verificáveis, normalizar metadados e produzir o mapa de evidência que sustentará as revisões posteriores.

## Entradas
- `CLAIM_LEDGER` da etapa anterior.
- Texto-base revisável ou seções correspondentes.
- Fontes sugeridas pelo autor (DOI/URL/autores/títulos/PMID/etc.).
- `references/source-policy.md` e `references/citation-integrity.md`.
- `references/venue-profiles.md`.

## Procedimento
1. Para cada claim, selecione potencial fonte mínima e tente recuperar metadados essenciais:
   - título, autores, ano, veículo, identificador (DOI/PMID/ISBN/handle), tipo de publicação.
2. Classifique a fonte seguindo a hierarquia:
   - primária > metadados indexadores > institucional > secundária contextual.
3. Valide consistência de claim vs fonte:
   - título/escopo do texto,
   - autoria e ano,
   - local de publicação e tipo de revisão (quando aplicável),
   - escopo temporal e geográfico.
4. Atribua confiança em três níveis:
   - `alta`: fonte primária conferente e completa,
   - `média`: metadado forte + texto parcial,
   - `baixa`: apenas secundária ou claim não totalmente coberta.
5. Gere anotações de exceção quando houver:
   - mismatch de título/autoria,
   - conflito entre claim e fonte,
   - falta de acesso por paywall/embargo.
6. Prepare mapeamento para citação:
   - quais trechos requerem nota obrigatória,
   - quais podem ficar sem fonte por serem de natureza processual/oracional.

## Saída esperada
- `EVIDENCE_MAP` contendo:
  - `claim_id`,
  - `source_id`,
  - `source_tier`,
  - `supports` (total/parcial/sem suporte),
  - `confidence`,
  - `gaps` (pendências de validação),
  - `justificativa` curta de inclusão/exclusão.
- Seção `unverified_claims` com plano de ação:
  - buscar fonte alternativa,
  - reduzir força da inferência,
  - remover/hiperqualificar claim.

## Guardrails
- Não cite fontes não rastreáveis nem invente campos bibliográficos.
- Não use preprint como prova de revisão por pares sem marcação explícita de `preprint`.
- Exigir resolução de conflito entre claim e fonte antes de avançar para reescrita.
- Se metadados críticos não puderem ser confirmados, classificar como `suporte_limitado` e não "aprovar".
- Não substituir fonte fraca por outra igualmentes fraca para manter o claim.
