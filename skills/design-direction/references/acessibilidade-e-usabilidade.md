# Acessibilidade e usabilidade

Qualidade visual não compensa fricção funcional. Verificar o que o artefato permite e marcar o restante como `N/V`.

## Percepção e leitura

- Texto comum mantém contraste suficiente; conteúdo essencial não depende de cinzas excessivamente suaves.
- Controles, foco, seleção e estados possuem contraste não textual perceptível.
- Significado não depende apenas de cor, posição, forma, hover ou animação.
- Zoom e aumento de texto preservam leitura, ordem e ações essenciais.
- Ícones relevantes têm rótulo ou alternativa textual.

## Teclado, foco e ponteiro

- Todo controle operável por ponteiro também é alcançável e acionável por teclado quando a plataforma exigir.
- Ordem de foco segue leitura e tarefa.
- Foco visível aparece no elemento percebido como interativo.
- Controles ocultos visualmente transferem foco para o alvo visível com mecanismo equivalente a `:focus-within`.
- Alvos respeitam o método de entrada; ampliar área de toque não exige inflar visualmente todo controle desktop.
- Hover complementa, nunca substitui, nome, estado ou ação.

## Formulários

- Cada campo possui rótulo persistente e vínculo programático.
- Obrigatoriedade, formato, unidade e restrições aparecem antes do erro quando forem relevantes.
- Tipo de entrada, teclado virtual e preenchimento automático correspondem ao dado.
- Mensagens de erro identificam o campo, explicam a correção e preservam valores já inseridos.
- Envio inválido conduz ao primeiro erro ou a um resumo navegável.
- Campos longos recebem área proporcional ao conteúdo esperado, não altura decorativa.
- Ação principal permanece próxima ao contexto e informa sucesso, falha ou estado pendente.

## Formulários extensos

Reduzir carga cognitiva e esforço de preenchimento sem remover requisitos necessários.

### Evitar

- formulário monolítico com todos os campos expostos e peso semelhante;
- sequência longa de inputs visualmente equivalentes;
- dimensões idênticas para campos com importância e conteúdo esperado diferentes;
- campos opcionais competindo com campos essenciais;
- repetição de instruções óbvias que cria ruído;
- stepper quando a tarefa permite ordem variável;
- esconder campos essenciais apenas para encurtar visualmente a página.

### Preferir

- agrupamento por objetivo, etapa mental ou decisão;
- revelação progressiva e campos condicionais;
- seções expansíveis com resumo, progresso e pendências;
- valores padrão e preenchimento assistido quando forem seguros;
- distinção clara entre essencial e opcional;
- persistência automática ou salvamento explícito comunicado;
- navegação direta entre seções;
- seções visuais contínuas quando o formulário não justificar recolhimento.

Seções progressivas não formam um wizard por definição. Em fluxos clínicos, investigativos ou especialistas, permitir acesso direto e ordem flexível; recolher uma seção não pode ocultar erro, pendência ou informação necessária para decidir.

Controles de expandir e recolher devem possuir nome, estado e foco perceptíveis, funcionar pelos métodos de entrada relevantes e não deslocar o usuário para longe do ponto de trabalho.

### Critério

Um formulário extenso passa quando:

1. a próxima ação é identificável sem examinar todos os campos;
2. campos relacionados estão agrupados por objetivo, não apenas por tipo;
3. essenciais e opcionais possuem peso e instrução distinguíveis;
4. preenchido, pendente, incompleto e erro estão claros;
5. o usuário revisa informações sem reabrir todo o formulário;
6. seções recolhidas exibem resumo útil e preservam acesso direto;
7. stepper existe somente quando há ordem obrigatória ou dependência real.

Formulários curtos podem permanecer contínuos. Workflows lineares, regulatórios ou com dependências irreversíveis podem usar etapas bloqueantes quando a ordem for necessária e explicada.

## Upload

- O controle possui nome acessível, foco visível e acionamento por teclado.
- Formatos, limite e tamanho aceitos aparecem antes da seleção quando relevantes.
- Arquivos anexados ficam listados com estado, erro e remoção.
- A área visual é proporcional à frequência e complexidade da tarefa; upload simples não exige uma dropzone dominante.
- Instruções anunciam somente gestos implementados; texto de arrastar exige suporte real a drag-and-drop.

## Estados e feedback

- Carregamento informa o que está acontecendo sem apagar contexto útil.
- Vazio explica significado e próxima ação.
- Sucesso confirma o que foi preservado.
- Erro oferece recuperação.
- Desabilitado não substitui explicação.
- Feedback assíncrono é anunciado por mecanismo apropriado quando necessário.
- Alertas aparecem perto da decisão ou ação afetada.

Aplicar também a hierarquia, o escopo e as exceções de redundância de [estados-e-feedback.md](estados-e-feedback.md).

## Coleções operacionais

- Quantidade total e quantidade exibida permanecem compreensíveis.
- Itens restantes possuem acesso visível e operável por teclado, toque e ponteiro.
- Seleção, ordenação, filtros, paginação e menus contextuais possuem nome, estado e foco perceptíveis.
- Ações destrutivas não dependem de gesto oculto e exigem confirmação proporcional ao risco.
- Tabelas mantêm cabeçalhos e relações compreensíveis; detalhes sob demanda não removem o contexto da linha.

Aplicar a escolha de representação e os critérios de [colecoes-operacionais.md](colecoes-operacionais.md).

## Prevenção de erro

- Ações destrutivas ou irreversíveis distinguem impacto e reversibilidade.
- Confirmação é reservada para risco real.
- Rascunho, autosave e saída com alterações deixam seu estado compreensível.
- A interface não cria urgência visual artificial para ações rotineiras.

## Responsividade e ergonomia

- Larguras de referência reorganizam prioridade, não apenas empilham o desktop.
- Ação principal, contexto e erros continuam encontráveis.
- Não há rolagem horizontal acidental no zoom e largura relevantes.
- Teclado virtual, áreas seguras e conteúdo longo não cobrem controles essenciais.
- Densidade muda conforme frequência, risco e método de entrada.

## Critério funcional

Para cada item aplicável, registrar `PASSA`, `FALHA` ou `N/V`. A interface:

1. pode ser percebida e compreendida;
2. pode ser operada pelos métodos de entrada relevantes;
3. previne e recupera erros;
4. comunica estados sem depender de decoração;
5. preserva tarefa e contexto nos tamanhos relevantes.

Falha que impede tarefa essencial é crítica. `N/V` limita o veredito; não vale como aprovação.
