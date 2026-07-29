# Avaliação

## Escala

Pontuar cada categoria de 0 a 5:

- **0**: ausente, inviável ou criticamente danoso;
- **1**: falhas severas e recorrentes;
- **2**: abaixo do aceitável;
- **3**: funcional, com problemas moderados;
- **4**: sólido, com refinamentos pontuais;
- **5**: excelente e justificado no contexto.

Usar `N/V` quando a evidência não permitir verificar. `N/V` não vira nota.

## Categorias

- Segurança e prevenção de erro
- Acessibilidade
- Usabilidade
- Conclusão de formulários e carga cognitiva
- Clareza estrutural
- Hierarquia visual
- Proporção, densidade e ritmo
- Moldura e superfícies
- Especificidade e clichês visuais
- Consistência de interação
- Hierarquia de estados e feedback
- Coleções, ações e ciclo de vida
- Tabelas e densidade operacional
- Responsividade e ergonomia
- Adequação ao contexto
- Direção autoral

## Prioridade dos achados

1. **Crítica** — bloqueia tarefa, causa dano, engana ou exclui acesso essencial.
2. **Alta** — provoca erro frequente ou perda relevante de compreensão.
3. **Média** — aumenta esforço ou fragmenta a experiência.
4. **Baixa** — inconsistência localizada.
5. **Refinamento** — melhora estética ou fluidez sem resolver falha relevante.

## Veredito

### Sem veredito — evidência bloqueada

O artefato principal não pôde ser aberto, lido ou inspecionado. Informar o bloqueio técnico e a evidência necessária; não pontuar o produto nem converter ausência de prova em aprovação.

### Aprovado

Nenhuma falha crítica, alta ou critério fundamental aberto; interface coerente e pronta para seguir.

### Aprovado com ressalvas

Nenhum bloqueio crítico; problemas moderados ou evidência incompleta impedem considerar a interface final.

### Reprovado

Falha crítica, combinação de falhas altas, estrutura que impede compreensão ou desvio severo dos fundamentos.

## Regras de composição

- O veredito não é uma média.
- Categoria fundamental pode limitar a aprovação.
- Toda nota precisa de evidência observável.
- Defeito, risco, preferência e oportunidade são classes diferentes.
- O relatório preserva explicitamente o que já funciona.
- Superfícies são avaliadas pela combinação renderizada; renomear classe não muda a experiência.
- A composição inteira é avaliada; ausência de cards aninhados não aprova escala, moldura ou linguagem visual.
- Títulos em cards ou banners são avaliados pela função do bloco, não pelo nome do componente.
- Formulários longos são avaliados por tarefa, progressão, revisão e dependência; quantidade de campos isolada não constitui defeito.
- Indicadores de estado são avaliados por objeto, alcance, ação e duração; quantidade isolada não constitui defeito.
- Coleções são avaliadas por localização, continuidade, comparação, seleção e segurança das ações.
- Tabelas são avaliadas pela quantidade de registros comparáveis, não pela compactação mecânica.
- Comportamento inacessível fica `N/V` quando a evidência é apenas uma imagem.

## Severidade de moldura excessiva

- **0**: molduras necessárias e proporcionais.
- **1**: caixa isolada que poderia ser seção.
- **2**: megacard ou várias superfícies concorrentes.
- **3**: cards aninhados, molduras repetidas ou escala excessiva.
- **4**: fragmentação severa ou composição dominada pela moldura visual.
- **5**: hierarquia dependente quase inteiramente de caixas e decoração.

Converter severidade em score de forma contextual, não mecânica.

## Limitadores de veredito

- Artefato principal ilegível ou inacessível: `Sem veredito — evidência bloqueada`.
- Falha crítica de acesso ou operação: `Reprovado`.
- Tarefa essencial não verificável na interface em execução: no máximo `Aprovado com ressalvas`.
- Formulário extenso sem hierarquia, progresso ou distinção entre essencial e opcional: usabilidade no máximo `2/5`.
- Estados simultâneos sem escopo claro ou aparentemente contraditórios: clareza e estados no máximo `2/5`.
- Coleção que oculta itens sem acesso evidente ou transição cujo resultado não pode ser previsto: usabilidade no máximo `2/5`.
- Tabela dominada por ações e metadados, sem comparação eficiente: densidade operacional no máximo `2/5`.
- Megacard, título como container, aviso ornamental ou constelação de clichês sem correção: direção visual no máximo `2/5`.
- Evidência de uma única largura: responsividade `N/V`.
- Interface correta, mas genérica ou desproporcional: não recebe `Aprovado`.
