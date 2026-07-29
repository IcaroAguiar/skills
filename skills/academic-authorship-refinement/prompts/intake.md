# Intake Prompt — academic-authorship-refinement

## Objetivo
Estruturar o pedido inicial em um briefing técnico-acadêmico executável para o fluxo de refinamento, preservando intenção autoral e requisitos de evidência.

## Entradas
- Pedido do usuário (texto bruto, idioma, objetivo, público-alvo).
- Documento-base (se houver): rascunho, notas, trechos de revisão, versão anterior.
- Restrições de formato: norma citacional, limite de tamanho, tom, idioma final.
- Perfis de venue/arena (quando informado): periódicos, conferência, disciplina, estilo esperado.
- Restrições extras: idioma, prazo, tom crítico/reviewer-like, nível de formalidade.

## Procedimento
1. Extraia: objetivo do texto, gênero (artigo, revisão, resumo, resposta acadêmica), audiência e idioma-alvo.
2. Classifique nível de ambição:
   - `alta`: produção com forte exigência de evidência e rigor metodológico;
   - `média`: refinamento de clareza e consistência já com base documental;
   - `baixa`: texto curto com ajuste editorial e estrutura básica.
3. Liste lacunas obrigatórias para continuidade:
   - se faltar fonte mínima, avisar imediatamente;
   - se faltar meta de citações/formatos, inferir padrão ABNT/APA apenas se confirmado pelo usuário ou contexto explícito;
   - se houver conflito entre objetivo e material fornecido, registrar inconsistência e pedir decisão.
4. Gere um briefing normalizado com:
   - tema e tese central;
   - hipóteses/afirmativas principais;
   - público e tom;
   - constraints legais/éticas/antiplágio/autorais;
   - prioridade de fontes (primárias > metadados > institucionais > secundárias).
5. Proponha perguntas curtas apenas quando faltar dado essencial.

## Saída esperada
- Bloco único chamado `INTAKE_BRIEF` contendo campos:
  - `objetivo`, `genero`, `idioma`, `audiencia`,
  - `escopo_tematico`, `fonte_solicitada` (se houver),
  - `norma_citacao`, `limites` (comprimento/prazo/formato),
  - `gaps` (faltas críticas),
  - `proxima_acao` (seguir para extração de claims ou solicitar esclarecimento).

## Guardrails
- Não gere conteúdo técnico ou conclusivo ainda; esta etapa é só estruturação.
- Não invente fontes, dados ou vínculos bibliográficos.
- Nunca promova "atalhos anti-plágio" ou "otimização para passar em detector"; o alvo é qualidade acadêmica verificável.
- Marcar como risco qualquer texto com evidência insuficiente ou dependente de agregador não primário.
- Manter o texto autoral sem alterar ainda o conteúdo factual.
