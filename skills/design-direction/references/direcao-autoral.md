# Direção autoral

## Regra central

> Usar superfícies para representar independência funcional. Usar seções para representar organização.
>
> Títulos introduzem conteúdo. Não são containers.

Construir hierarquia nesta ordem:

1. conteúdo e linguagem;
2. tipografia;
3. espaçamento e proximidade;
4. alinhamento e grid;
5. divisores;
6. mudança tonal;
7. borda;
8. elevação quando comunicar camada, foco ou interação.

## Princípios

### Conteúdo conduz

Fazer a estrutura surgir das tarefas e relações entre informações. Escolher componentes depois de entender sequência, frequência, risco e decisão.

### Moldura mínima

Cada limite visual consome atenção. Usar o menor número de superfícies capaz de explicar independência, camada, estado ou ação.

### Ritmo proporcional

Usar proximidade para mostrar relação e espaço para marcar mudança de assunto. Dimensionar controles, vazios e destaques conforme tarefa, frequência e risco.

### Complexidade progressiva

Não apresentar a complexidade inteira de uma tarefa quando o usuário precisa lidar com apenas uma parte por vez. Estruturar complexidade por objetivo, prioridade, dependência e momento de uso; não a reduzir apenas escondendo campos.

### Ênfase proporcional

Reservar contraste, cor, tamanho e movimento mais fortes para decisões e estados mais importantes. Um foco principal deve permanecer evidente.

### Estado contextual

Comunicar cada estado no nível e junto ao objeto a que pertence. Usar destaque conforme urgência e necessidade de ação; metadados e confirmações positivas não devem competir com pendências.

### Dados operacionais conduzem

Em coleções operacionais, fazer dados dominarem a composição, estados explicarem o fluxo e ações receberem ênfase proporcional à decisão. Otimizar localização, comparação, seleção e transição segura antes de decorar registros.

### Especificidade

Construir identidade com linguagem do domínio, conteúdo, tipografia, ritmo e composição. Uma interface não deve parecer intercambiável com qualquer SaaS.

## Padrões preferidos

- layouts baseados em seções;
- agrupamento por proximidade;
- cabeçalhos de seção informativos;
- listas estruturadas para metadados;
- listas e tabelas para coleções homogêneas e comparáveis;
- painéis laterais contínuos;
- uma ação principal clara;
- fundos tonais para estados reais;
- revelação progressiva para detalhes raros;
- seções progressivas com resumo e estado em formulários extensos não lineares;
- estados vazios com significado e próxima ação;
- identidade construída pelo domínio.

## Heurísticas

- Antes de adicionar uma moldura, testar se alinhamento, proximidade ou divisor resolvem.
- Antes de colocar um título em uma superfície própria, confirmar que o bloco possui identidade, interação, estado ou comportamento independente.
- Antes de aumentar um elemento, nomear a prioridade que justifica a escala.
- Antes de expor todos os campos, verificar quais são necessários agora, quais dependem de respostas anteriores e quais precisam permanecer comparáveis.
- Antes de criar um aviso em destaque, definir severidade, público, duração e próxima ação.
- Antes de adicionar um indicador de estado, nomear objeto, alcance, necessidade de ação e duração.
- Antes de repetir um padrão visual, confirmar que ele comunica o mesmo papel.
- Antes de repetir uma ação em cada registro, avaliar seleção, lote, menu contextual ou painel de detalhes.
- Antes de usar cards em uma coleção, verificar se a tarefa é descoberta ou comparação operacional.
- Antes de suavizar contraste, verificar percepção e leitura.
- Antes de aprovar uma estética familiar, procurar a contribuição específica do domínio.

Os sinais, exceções e critérios de cardificação excessiva, megacards, avisos, geometria e clichês estão em [qualidade-visual.md](qualidade-visual.md). A hierarquia e a redundância dos estados estão em [estados-e-feedback.md](estados-e-feedback.md). Coleções, ações, transições e tabelas estão em [colecoes-operacionais.md](colecoes-operacionais.md).

## Formato de exceção

Registrar:

- regra afetada;
- contexto;
- justificativa funcional;
- impacto;
- limite da exceção;
- prova de que a exceção não se espalhou.
