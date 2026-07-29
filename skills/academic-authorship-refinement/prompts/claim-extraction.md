# Prompt: Claim Extraction

## Objetivo
Extrair todas as assertivas passíveis de verificação do texto-base e transformá-las em um inventário rastreável para revisão por evidência.

## Entradas
- Texto-base segmentado (manuscrito, abstract, seção metodológica, discussão).
- Contexto do intake (`INTAKE_BRIEF`).
- Indicadores de áreas sensíveis (estatística, metodologia, causalidade, regulação).
- Lista opcional de trechos com feedback anterior.

## Procedimento
1. Faça varredura frase a frase e identifique assertivas de:
   - fato empírico,
   - método/desenho experimental,
   - causalidade/inferência,
   - definição técnica,
   - escopo normativo/regulatório.
2. Para cada assertiva, registre em tabela:
   - `id_claim`, texto literal do trecho,
   - tipo de claim,
   - peso de risco (baixo/médio/alto),
   - força atual (firme, moderada, especulativa),
   - fonte necessária (primária, metadado de publicação, institucional, secundária),
   - contexto de preservação (evitar reescrita semântica).
3. Preserve distinções entre:
   - o que o autor afirma,
   - o que é inferência do redator,
   - o que é condição limitante ("sugere", "possível", "em estudo").
4. Remova duplicatas sem perder nuances (mesmo claim com diferentes números/âncoras deve ficar em linhas separadas, se a prova divergir).
5. Marque claims com red flags:
   - números sem unidade/escala,
   - método não explicitado,
   - causalidade sem desenho adequado,
   - termos não operacionais.

## Saída esperada
- `CLAIM_LEDGER` com seções:
  - `claims_fatuais[]`,
  - `claims_metodo[]`,
  - `claims_normativos[]`,
  - `claims_especulativos[]`.
- Cada item no formato:
  - `id`, `texto_original`, `tipo`, `risco`, `evidencia_necessaria`, `status_verificacao`.

## Guardrails
- Não alterar o sentido factual dos claims ao padronizar linguagem.
- Não fundir claims diferentes apenas por semelhança lexical se o suporte de prova variar.
- Se o texto tiver frases vagas sem conteúdo verificável, registrar como `claim_suspeita` com evidência baixa.
- Não sugerir evidência ainda; limitar-se ao inventário analítico.
- Sinalizar explícita e separadamente conflitos ou contradições internas.
