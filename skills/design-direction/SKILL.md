---
name: design-direction
description: Projete, revise e redesenhe interfaces web e mobile com direção autoral e qualidade funcional. Use ao criar ou auditar páginas, fluxos e componentes; detectar cardificação excessiva, megacards, excesso de moldura, clichês de interface gerada por IA (AI slop), hierarquia genérica, estados fragmentados, formulários extensos, coleções com ações dominantes ou overflow oculto, ciclos de vida ambíguos, tabelas infladas, problemas de acessibilidade ou usabilidade; propor um redesign; ou converter uma referência em preferência candidata.
---

# Design Direction

Produzir interfaces específicas para a tarefa e o produto. Aplicar os mesmos critérios ao gerar e revisar: uma solução só está pronta quando estrutura, linguagem visual e comportamento passam pelos fundamentos.

## 1. Escolher o ramo

Selecionar um ramo principal:

- **Gerar** — criar uma interface, fluxo ou componente.
- **Revisar** — avaliar um artefato e emitir veredito.
- **Redesenhar** — diagnosticar e propor uma solução completa.
- **Capturar preferência** — transformar uma referência ou comentário em regra candidata.

Combinar revisão e redesign quando o pedido for melhorar, refatorar ou corrigir. Implementar apenas quando o pedido também autorizar edição; a stack do projeto orienta o código, não os princípios.

**Concluído quando:** o ramo, o artefato avaliado e o resultado esperado estão explícitos.

## 2. Carregar a base certa

Em geração, revisão ou redesign, ler:

- [fundamentos.md](references/fundamentos.md) — precedência e mínimos obrigatórios;
- [direcao-autoral.md](references/direcao-autoral.md) — princípios autorais;
- [qualidade-visual.md](references/qualidade-visual.md) — escala, moldura, megacards, avisos em destaque e clichês;
- [acessibilidade-e-usabilidade.md](references/acessibilidade-e-usabilidade.md) — critérios funcionais;
- [estados-e-feedback.md](references/estados-e-feedback.md) — escopo, hierarquia, redundância e metadados;
- [colecoes-operacionais.md](references/colecoes-operacionais.md) — ações, continuidade, ciclo de vida e tabelas;
- [workflows.md](references/workflows.md) — passos e critérios de conclusão.

Em captura de preferência, ler:

- [captura-de-preferencias.md](references/captura-de-preferencias.md);
- [fundamentos.md](references/fundamentos.md);
- [direcao-autoral.md](references/direcao-autoral.md);
- [contextos.md](references/contextos.md);
- a referência que receberia a mudança.

Acrescentar conforme o ramo:

- [contextos.md](references/contextos.md) ao inferir o perfil do produto;
- [avaliacao.md](references/avaliacao.md) em toda revisão ou autoavaliação;
- [templates-de-saida.md](references/templates-de-saida.md) antes de redigir a entrega;
- [referencias-visuais.md](references/referencias-visuais.md) ao analisar referências ou buscar precedentes;
- [portabilidade.md](references/portabilidade.md) ao adaptar o núcleo para outro agente.

**Concluído quando:** toda referência obrigatória do ramo foi lida por inteiro.

## 3. Aplicar a precedência

Resolver conflitos nesta ordem:

1. segurança;
2. acessibilidade;
3. usabilidade;
4. clareza;
5. consistência de interação;
6. adequação ao contexto;
7. hierarquia visual;
8. direção autoral;
9. preferência estética local.

Uma decisão inferior nunca compensa uma falha superior. Registrar exceções com contexto, justificativa, limite e prova.

## 4. Fixar contexto e evidência

Escolher um perfil principal e, quando útil, no máximo duas influências secundárias. Declarar perfil, sinais observados, premissas e ambiguidades materiais.

Perfis: SaaS, dashboard analítico, sistema interno, landing page, site institucional, aplicação mobile e componente isolado.

- Distinguir observação, inferência, preferência e requisito.
- Não inventar requisitos, estados, conteúdo, marca ou prova comercial.
- Em revisão visual, ancorar cada finding em uma região ou estado identificável.
- Um screenshot não prova teclado, foco, zoom, responsividade ou estados assíncronos.
- Código sem interface em execução não prova composição, escala ou superfícies renderizadas.
- Usar referências para extrair princípios, não para copiar identidade ou composição.

**Concluído quando:** cada afirmação está marcada como observada, inferida ou não verificada.

## 5. Executar e provar

Seguir o ramo em [workflows.md](references/workflows.md). Em revisão completa, entregar:

1. perfil, evidência e veredito;
2. diagnóstico e notas justificadas;
3. achados priorizados por impacto;
4. padrões positivos a preservar;
5. recomendações; redesign quando solicitado;
6. wireframe ASCII quando esclarecer relações;
7. não verificado, exceções e risco residual.

O veredito não é uma média. Falhas críticas de acesso, uso ou clareza limitam a aprovação.

## Critério de conclusão

Marcar cada item aplicável como `PASSA`, `FALHA` ou `N/V`:

- tarefa principal e ação prioritária permanecem claras;
- proporção, densidade e ritmo correspondem ao contexto;
- cada moldura ou superfície possui função verificável;
- nenhum megacard atua apenas como embalagem da página;
- nenhum título de seção atua como card ou banner sem função independente;
- avisos em destaque comunicam severidade ou ação, não decoração;
- a composição evita uma constelação de clichês genéricos;
- formulários extensos estruturam complexidade, progresso e revisão sem esconder requisitos essenciais;
- indicadores distinguem estado global, estado local, feedback transitório e metadados sem contradição aparente;
- coleções revelam todos os registros, priorizam dados e usam ações proporcionais;
- transições permitem prever estado atual, ação, próximo estado e reversibilidade;
- tabelas preservam varredura, comparação e seleção;
- acessibilidade e usabilidade aplicáveis foram verificadas;
- desktop, mobile e métodos de entrada relevantes foram cobertos;
- conteúdo, ações e estados necessários foram preservados;
- a interface em execução confirma a experiência quando está disponível.

**Concluído quando:** não há `FALHA` aberta nos fundamentos; `N/V` está declarado e limita o veredito.
