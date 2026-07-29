# Fundamentos obrigatórios

## Princípio de precedência

Qualidade funcional prevalece sobre gosto. Preservar a intenção autoral somente dentro dos limites de segurança, acessibilidade, usabilidade e clareza.

## Segurança

- Evitar padrões enganosos, confirmações ambíguas e ações destrutivas fáceis de acionar.
- Explicitar impacto e reversibilidade em operações sensíveis.
- Não usar aparência para disfarçar publicidade, consentimento ou mudança de estado.

## Acessibilidade

- Garantir contraste, legibilidade e escala de texto adequados.
- Manter ordem de leitura e foco coerentes.
- Não depender apenas de cor, posição, hover, gesto ou animação.
- Oferecer nomes, rótulos, instruções e mensagens de erro compreensíveis.
- Dimensionar alvos e espaçamento para o método de entrada.
- Respeitar preferências de movimento e evitar animação que bloqueie compreensão.

Uma falha que impeça uma tarefa essencial é crítica mesmo que a tela pareça refinada.

## Usabilidade e clareza

- Tornar a ação principal identificável sem leitura exaustiva.
- Aproximar controles de seus efeitos e feedback.
- Preservar linguagem do domínio e expectativas da plataforma.
- Expor informação suficiente para decidir; aplicar progressive disclosure ao restante.
- Evitar controles visualmente iguais com comportamentos diferentes.

## Consistência de interação

- Manter semântica, posição e feedback previsíveis para ações equivalentes.
- Diferenciar navegação, ação, seleção e estado.
- Não usar variação visual como substituto de uma regra de interação.

## Responsividade e ergonomia

- Reorganizar a hierarquia, não apenas comprimir o desktop.
- Preservar tarefa, contexto e ação principal em cada breakpoint.
- Planejar teclado, toque, ponteiro, zoom, áreas seguras e conteúdo longo conforme o produto.
- Evitar densidade uniforme: adaptar agrupamento e ritmo à frequência e ao risco das tarefas.

## Estados e feedback

Projetar quando aplicável:

- inicial;
- carregando;
- vazio;
- parcial;
- sucesso;
- erro recuperável;
- erro bloqueante;
- indisponível;
- selecionado;
- foco;
- hover;
- pressionado;
- offline ou sincronizando.

Feedback deve explicar o que aconteceu, o que permanece preservado e qual é a próxima ação.

## Evidência mínima

Avaliar somente o que o artefato permite observar.

### Imagem estática

Uma imagem legível pode provar:

- texto e rótulos visíveis;
- hierarquia estática;
- proporção, densidade e ritmo;
- bordas, raios, sombras e fundos;
- molduras, megacards e avisos;
- contraste aparente e dependência visual de cor;
- especificidade ou constelação de clichês.

Antes de pontuar, abrir a imagem na resolução original, ampliar regiões necessárias, transcrever rótulos relevantes e inventariar superfícies. Se o arquivo não puder ser lido, registrar a falha técnica; não substituir inspeção por análise de pixels ou suposição.

Uma imagem estática não prova teclado, ordem de foco, zoom, responsividade, semântica programática ou estados assíncronos.

### Implementação

Código sem interface em execução não prova composição final, escala, quebra de linha ou comportamento. Registrar `N/V` somente para o que a evidência realmente não alcança.

**Concluído quando:** propriedades estáticas observáveis foram avaliadas e comportamento ausente ficou `N/V`.
