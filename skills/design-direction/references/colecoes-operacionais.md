# Coleções operacionais, ações e tabelas

Projetar páginas que permitam localizar, comparar, compreender e manipular registros com rapidez. Em interfaces operacionais:

> Dados dominam a composição. Estados explicam o fluxo. Ações recebem destaque proporcional à decisão.

Priorizar:

1. compreensão do estado atual;
2. identificação dos registros relevantes;
3. comparação entre itens;
4. execução segura das ações;
5. acesso progressivo aos detalhes.

## Parede de ações

Também chamada de **action wall**: botões de alto destaque se repetem em todas as linhas ou cards.

### Evitar

- botão preenchido em cada registro;
- ações secundárias com aparência de ação principal;
- ações destrutivas permanentemente visíveis;
- múltiplos CTAs concorrendo na mesma região;
- controles que ocupam mais espaço ou contraste que os dados.

### Preferir

- uma ação primária evidente por contexto;
- menus contextuais para ações secundárias;
- ações após seleção do registro;
- painel de detalhes com ações relacionadas;
- operações em lote;
- confirmação proporcional ao risco para ações destrutivas;
- controles discretos para operações frequentes, mas não prioritárias.

### Critério

A ênfase de uma ação acompanha importância, frequência, urgência e risco. A coleção passa quando os dados podem ser varridos antes que os controles dominem a atenção.

## Overflow oculto

Também chamado de **hidden collection overflow**: existem mais itens que os visíveis, mas a continuidade e o acesso não são claros.

### Evitar

- overflow oculto como único mecanismo;
- carrossel em fila operacional extensa;
- coleção cortada sem affordance de continuidade;
- contagem total maior que a amostra sem explicação;
- gesto horizontal invisível como único acesso.

### Preferir

- lista ou tabela em coleções extensas;
- paginação explícita ou botão “Ver todos”;
- controles visíveis de navegação;
- indicação como “4 de 12”;
- item parcialmente visível somente quando comunicar continuidade;
- busca e filtros quando a extensão exigir.

### Critério

O usuário sabe que existem mais itens e entende imediatamente como acessá-los. A quantidade exibida não contradiz a quantidade comunicada.

## Ambiguidade no ciclo de vida

Também chamada de **lifecycle semantic ambiguity**: títulos, filtros, estados e ações usam modelos mentais incompatíveis.

### Evitar

- mesmo termo usado como estado, categoria e ação com significados diferentes;
- ação que não indica resultado;
- status interno exposto sem tradução;
- título que contradiz os estados mostrados;
- transição dependente de conhecimento técnico prévio.

### Preferir

- terminologia consistente;
- ação nomeada pelo resultado;
- relação explícita entre estado atual, ação e próximo estado;
- explicação para termos técnicos inevitáveis;
- distinção entre estado, categoria, permissão e pendência.

Modelo:

```text
Estado atual → ação → próximo estado

Aprovado → Iniciar execução → Em execução
Em execução → Suspender → Execução suspensa
Execução suspensa → Retomar → Em execução
```

Todo controle de transição permite responder:

1. Qual é o estado atual?
2. O que a ação fará?
3. Qual será o próximo estado?
4. A transição pode ser revertida?
5. Existem consequências adicionais?

## Tabela inflada

Também chamada de **bloated data table** ou **row obesity**: linhas se tornam pequenos cards, acumulando metadados, badges, texto repetido e ações dominantes.

### Sinais

- duas ou mais linhas de texto na maioria das células;
- textos auxiliares repetidos;
- badge em quase todo registro;
- botão grande em toda linha;
- identificador extenso dominando a leitura;
- poucos registros visíveis;
- conteúdo principal truncado para preservar detalhes secundários.

### Evitar

- linha como card horizontal;
- informação idêntica repetida em todos os registros;
- ação preenchida em cada linha;
- conceitos diferentes combinados sem necessidade;
- detalhes raros sempre expostos;
- metadados preservados enquanto o dado principal é truncado.

### Preferir

- um conceito principal por coluna;
- linhas compactas e legíveis;
- colunas comparáveis;
- detalhes sob demanda em painel, expansão ou página;
- menus contextuais para ações menos frequentes;
- seleção e operações em lote;
- espaço maior para os dados que diferenciam registros.

### Critério

Tabelas otimizam varredura, comparação e seleção. Detalhes e ações aparecem conforme importância e frequência, sem apagar contexto.

## Escolher a representação

### Usar cards quando

- houver poucos itens;
- cada item possuir identidade própria;
- a tarefa envolver descoberta ou escolha;
- o conteúdo for heterogêneo;
- comparação visual importar mais que comparação tabular.

### Usar lista ou tabela quando

- houver muitos registros;
- atributos precisarem ser comparados;
- existir ordenação ou filtragem;
- a tarefa for operacional;
- ações forem recorrentes;
- registros compartilharem estrutura.

Representações diferentes para a mesma entidade exigem diferença real entre as tarefas.

## Hierarquia recomendada

```text
Título e contexto

Busca e filtros

Fila ou resumo prioritário
└── somente quando for uma tarefa distinta

Coleção principal
├── dados comparáveis
├── estado
├── atualização
└── ações contextuais

Seleção do registro
└── detalhes e ações adicionais
```

## Checklist

### Ações

- Existe uma ação primária evidente por contexto?
- Ações repetitivas podem ocorrer em lote?
- Ações destrutivas têm destaque proporcional ao risco?
- Dados possuem mais protagonismo que controles?

### Coleções

- Quantidade exibida corresponde à comunicada?
- Acesso aos itens restantes está evidente?
- Coleção funciona com teclado, toque e ponteiro?
- Lista ou tabela seria mais eficiente que carrossel?

### Ciclo de vida

- Estado atual está claro?
- Nome da ação indica consequência?
- Próximo estado pode ser previsto?
- Títulos, filtros, estados e ações usam a mesma terminologia?

### Tabelas

- Várias linhas podem ser comparadas sem rolagem excessiva?
- Colunas representam conceitos claros?
- Informações repetidas foram removidas?
- Conteúdo principal não foi truncado por metadados?
- Ações secundárias permanecem discretas?
- Detalhes estão disponíveis sob demanda?
