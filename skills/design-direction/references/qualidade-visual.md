# Qualidade visual

Avaliar a composição inteira, não apenas componentes isolados. O alvo é uma interface específica, proporcional e silenciosa o bastante para que conteúdo e ação conduzam a atenção.

## Moldura mínima

Toda combinação de fundo, borda, raio, sombra e espaçamento interno cria uma **moldura**. Cada moldura precisa comunicar pelo menos uma destas funções:

- independência;
- camada real;
- seleção;
- estado;
- ação como unidade;
- comparação entre pares.

Quando a função for apenas agrupar conteúdo contínuo, usar seção, alinhamento, proximidade, divisor ou mudança tonal do próprio plano.

### Critério

Inventariar as molduras renderizadas por região. Para cada uma, registrar função e alternativa mais leve. A região passa quando nenhuma moldura existe apenas para “terminar” o layout.

## Escala proporcional

Tamanho, vazio, elevação e contraste devem acompanhar importância, frequência e quantidade de conteúdo.

Sinais de desproporção:

- superfície ocupa quase toda a coluna ou altura útil sem ser uma unidade independente;
- espaçamento interno amplo e raio grande ampliam conteúdo simples;
- controles desktop usam altura de destaque sem necessidade ergonômica;
- campo de texto longo, área de upload ou painel recebe espaço muito maior que a tarefa exige;
- fundo, borda e sombra isolam uma área que já está separada pelo grid;
- ação rotineira recebe o maior contraste da página enquanto contexto crítico fica discreto.

Uma área extensa pode ser legítima em canvas, editor, diálogo modal, objeto arrastável ou espaço de trabalho independente. A exceção deve explicar a camada ou tarefa.

## Antipadrão: megacard

Um **megacard** é uma grande superfície arredondada e elevada usada como embalagem da página, coluna ou formulário. Ele pode existir sem cards aninhados e ainda tornar a interface pesada.

### Sinais

- envolve várias seções de uma tarefa contínua;
- repete a separação já criada pelo fundo da página;
- combina borda, raio e sombra sem semântica de camada;
- domina a composição mais que o conteúdo;
- cria “uma folha dentro da folha”;
- força outro megacard para equilibrar a coluna lateral.
- transforma um formulário contínuo em “objeto” apenas por possuir muitos campos;
- transforma a lateral do mesmo fluxo em card apenas por ocupar outra coluna.

Formulário, coluna e painel de contexto não são entidades independentes por definição. Quando pertencem à mesma tarefa da página, tratá-los como regiões do layout. Retirar somente a sombra não descaracteriza o megacard: fundo, borda e raio ainda formam embalagem.

### Alternativas

- formulário diretamente no plano da página;
- área de trabalho delimitada pelo grid e por títulos;
- uma linha de contorno discreta sem elevação, quando o limite for necessário;
- painel lateral contínuo definido por divisor vertical ou fundo tonal;
- seções com ritmo e separadores locais.

### Critério

Remover mentalmente fundo, raio e sombra. Se estrutura e tarefa permanecerem iguais, a superfície era embalagem. O resultado só passa quando a embalagem foi removida ou sua função independente foi demonstrada.

## Antipadrão: título como container

Também chamado de **card-as-heading** ou **bannerized section header**: um título simples vira uma grande superfície horizontal com fundo, borda, raio, sombra ou espaço interno desproporcional.

> Títulos introduzem conteúdo. Não são containers.

### Sinais

- card largo contendo apenas título, descrição, status ou ação breve;
- cabeçalho com superfície própria que repete a separação já criada pelo fluxo da página;
- borda, fundo, raio ou sombra usados somente para dar importância ao título;
- vazio vertical que faz o cabeçalho competir com a tarefa principal;
- estado vazio simples apresentado dentro de uma superfície maior que o conteúdo que representa;
- seção visualmente tratada como entidade independente sem identidade, interação ou comportamento próprio.

### Alternativas

- título diretamente no fluxo da página;
- label contextual ou *eyebrow* acima do título quando acrescentar informação;
- descrição curta abaixo do título;
- ação ou status alinhado ao cabeçalho;
- espaço vertical ou um divisor inferior opcional;
- estado vazio compacto no corpo da seção;
- fundo tonal somente quando o conjunto comunicar um estado relevante.

### Critério

Antes de criar uma superfície para um título, perguntar: **este bloco possui identidade, interação, estado ou comportamento próprio?**

Se a resposta for não, usar uma seção comum. O cabeçalho passa quando:

1. continua compreensível sem fundo, borda e sombra;
2. título, descrição, ação e status cabem em uma composição compacta;
3. não compete visualmente com o conteúdo principal;
4. um estado vazio simples não produz uma superfície maior que sua mensagem;
5. usa, por padrão, no máximo um divisor ou uma mudança tonal sutil — não ambos.

### Exceções

Uma superfície horizontal é legítima quando funciona como alerta crítico, resumo acionável, etapa de processo, item selecionável ou entidade que pode ser expandida, movida ou aberta. Nesses casos, o container comunica uma função independente; registrar qual.

## Antipadrão: aviso ornamental

O padrão recorrente “retângulo pastel + raio + faixa colorida lateral + título em negrito + frase” costuma simular importância sem melhorar decisão. A faixa lateral é especialmente ruidosa quando não codifica categoria, progressão ou severidade de modo consistente.

### Escolher pelo significado

- **Validação de campo:** mensagem junto ao campo e vínculo programático.
- **Pendência da seção:** texto curto próximo à ação que resolve.
- **Status persistente:** linha ou grupo de metadados.
- **Aviso relevante:** superfície tonal contida, ícone ou rótulo semântico e ação quando houver.
- **Erro bloqueante:** mensagem clara, foco apropriado e caminho de recuperação.

Cor, faixa ou fundo nunca carregam o significado sozinhos. A intensidade visual deve acompanhar impacto e urgência.

### Exceções

Faixa lateral pode funcionar em citações, diffs, timelines, taxonomias ou sistemas de severidade estabelecidos. A codificação deve ser consistente, compreensível sem cor e útil em mais de um estado real.

## Constelação de clichês

“AI slop” não é um componente isolado; é a **constelação** de escolhas padrão sem relação com o domínio. Procurar o conjunto:

- sobretítulo em caixa alta sobre título grande;
- fundo cinza azulado genérico;
- botão azul flutuando no cabeçalho;
- megacards brancos com sombra macia;
- gradiente de fundo sem papel narrativo ou semântico;
- blur translúcido aplicado como acabamento genérico;
- pílula para status rotineiro que caberia em metadado textual;
- raio semelhante em botão, superfície, alerta e controle;
- aviso pastel com faixa lateral;
- área de upload grande com borda tracejada para uma ação simples;
- espaços amplos que reduzem densidade sem criar hierarquia;
- textos e rótulos genéricos que poderiam pertencer a qualquer SaaS.

Um sinal isolado pode ser adequado. Quando vários aparecem sem justificativa de produto, reconstruir a composição a partir da tarefa, linguagem do domínio, frequência e risco.

## Ritmo e densidade

- Agrupar pelo que é lido ou operado junto.
- Marcar mudança de assunto com espaço ou divisor, não com nova caixa.
- Dimensionar campos pela natureza do dado esperado.
- Reservar grandes intervalos para mudanças reais de nível.
- Em sistemas internos, favorecer varredura, teclado e área útil.
- Em mobile, preservar toque confortável sem transformar todo bloco em cartão.

## Geometria semântica

Raio, borda e sombra devem distinguir papéis:

- controles;
- superfícies;
- sobreposições;
- seleção;
- feedback.

Quando tudo compartilha a mesma geometria, nada comunica papel. Reduzir variações decorativas e manter diferenças que expliquem comportamento.

## Critério visual final

Uma interface passa quando:

1. conteúdo e ações explicam a hierarquia sem depender de caixas;
2. molduras restantes têm função nomeável;
3. títulos introduzem seções sem virar superfícies decorativas;
4. escala e densidade correspondem à tarefa;
5. alertas e avisos em destaque comunicam significado e próxima ação;
6. a composição não depende de uma constelação de clichês;
7. identidade surge do domínio, não de decoração genérica.

Remover um único sinal não basta quando a constelação permanece.

Ao avaliar badges, alertas e metadados, aplicar também [estados-e-feedback.md](estados-e-feedback.md).
