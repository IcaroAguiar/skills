# Workflows

## Gerar

1. Identificar objetivo, usuário, tarefa principal e restrições.
2. Inferir o perfil contextual.
3. Mapear conteúdo, ações, estados, escopos, coleções e prioridades.
4. Definir arquitetura de informação, dependências e fluxo; em formulários, decidir entre continuidade, seções progressivas e etapas obrigatórias.
5. Construir hierarquia por conteúdo, tipo, espaço e alinhamento.
6. Escolher molduras e componentes pela função.
7. Planejar acessibilidade, responsividade e estados.
8. Produzir estrutura textual e wireframe quando ele esclarecer relações.
9. Executar os critérios funcional, visual e de evidência.

Marcar placeholders e premissas; conteúdo de negócio não pode ser inventado.

**Concluído quando:** todos os critérios aplicáveis passam, itens sem evidência estão `N/V` e nenhuma escolha visual existe apenas por convenção.

## Revisar

1. Registrar o artefato e a evidência disponível.
2. Inspecionar imagens em resolução legível e extrair texto, regiões e superfícies observáveis.
3. Inferir contexto, objetivo e tarefa principal.
4. Aplicar o critério de [acessibilidade-e-usabilidade.md](acessibilidade-e-usabilidade.md).
5. Avaliar arquitetura, fluxo, consistência e a hierarquia de estados com [estados-e-feedback.md](estados-e-feedback.md).
6. Em formulários extensos, avaliar agrupamento, prioridade, progressão, revisão e necessidade real de ordem.
7. Em coleções, aplicar [colecoes-operacionais.md](colecoes-operacionais.md) a ações, continuidade, ciclo de vida e densidade.
8. Inventariar molduras, escala, densidade, títulos como containers, avisos e clichês com [qualidade-visual.md](qualidade-visual.md).
9. Identificar a contribuição específica do domínio.
10. Preservar padrões positivos.
11. Priorizar achados por impacto no usuário.
12. Emitir nota, veredito e risco residual.

Cada achado informa região, evidência, impacto, recomendação e prioridade.

**Concluído quando:** propriedades estáticas legíveis foram avaliadas, comportamento ausente está `N/V`, o veredito respeita os limitadores e cada achado oferece uma alternativa.

Se o artefato principal não puder ser inspecionado, interromper a pontuação e emitir `Sem veredito — evidência bloqueada`.

## Redesenhar

1. Congelar requisitos, conteúdo, ações e estados.
2. Definir o problema de composição ou interação.
3. Remover moldura, escala, títulos-container e decoração sem função.
4. Reagrupar por tarefa, relação e sequência.
5. Restabelecer hierarquia e ação principal.
6. Descrever comportamento responsivo e estados.
7. Produzir estrutura textual completa.
8. Produzir wireframe somente quando ele esclarecer layout ou fluxo.
9. Mapear cada mudança ao achado que resolve.
10. Declarar trade-offs e exceções.

Um redesign preserva funcionalidade; limpeza visual não autoriza apagar comportamento.

**Concluído quando:** cada mudança resolve um achado, nenhuma função desaparece e o redesign passa pelos mesmos critérios usados na revisão.

## Revisar e implementar

Quando houver autorização para editar código:

1. Concluir o diagnóstico.
2. Inspecionar stack, design system, componentes compartilhados e mudanças do usuário.
3. Fazer a menor alteração coerente com o redesign.
4. Preservar comportamento, conteúdo e estados.
5. Executar verificações aplicáveis.
6. Validar a interface em execução.
7. Capturar evidência visual.
8. Validar teclado, foco, estados e breakpoints aplicáveis.
9. Produzir inventário final de molduras e cabeçalhos com elemento, combinação visual e função.
10. Relatar observado, alterado, testado e não testado.

O núcleo permanece independente de tecnologia; a implementação segue o projeto.

**Concluído quando:** verificações passam, a interface em execução confirma composição e métodos de entrada relevantes, nenhuma moldura do inventário existe só como embalagem e toda limitação residual está explícita.

## Critério da interface em execução

Na interface em execução:

1. listar elementos que combinam fundo, borda, raio ou sombra;
2. medir proporção, área útil, transbordamento e hierarquia nas larguras relevantes;
3. confirmar a função de cada moldura;
4. inspecionar títulos-container, hierarquia de estados, coleções, avisos, foco, erro, carregamento e vazio;
5. operar ação principal, continuidade da coleção, transições, teclado e controles customizados;
6. comparar screenshots e estilos computados.

Uma mudança cosmética de nome não satisfaz o critério. A experiência renderizada precisa mudar.
