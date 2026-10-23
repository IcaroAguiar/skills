# Brief comum — canvas de aprovação da área <ÁREA>

Você vai redesenhar telas da área <ÁREA> num **canvas de aprovação estático** (protótipo React, sem API). O responsável de produto vai aprovar cada tela visualmente. Objetivo: UI no padrão <RECEITA> — limpa, útil, agradável, com menos molduras e selos.

## Onde trabalhar
- Canvas: `<CAMINHO DO CANVAS>`
- Leia primeiro: `src/kit.tsx` (primitivas: Page, Stack, Section, List, Toolbar, Status, RowAction, Empty, Field, Pick, Facts, Mono, useCanvas → go/detail/toast/state), `src/data.ts` (dados fictícios), `src/main.tsx` (shell, NAV ids, registro) e a tela de referência `<ARQUIVO DE REFERÊNCIA>` — siga esse nível de acabamento e estilo de código.
- Componentes reais vêm de `<PACOTE UI>` = `<UI_ROOT>/<UI_SRC>` (só leia; não altere).
- Código de produção para conteúdo e rótulos: `<CAMINHO DO APP>`. Referência do padrão já implementado: `<TELAS DE REFERÊNCIA>`.

## Edite SOMENTE os arquivos atribuídos a você. Não altere kit.tsx, main.tsx, data.ts, canvas.css nem arquivos de outras telas. Se precisar de uma primitiva extra ou dados extras, crie localmente no seu arquivo. Não faça commit, não rode suítes completas na raiz, não toque no pacote de UI.

## Registro de telas
Seu arquivo exporta `export const screens: Screen[] = [...]` (tipo em kit.tsx): `{ id, label, nav, shell: 'app'|'auth'|'onboarding', states?: { chave: 'Rótulo' }, render }`. Estados são lidos com `useCanvas().state` (string vazia = padrão). `go('P4')` ou `go('P4~rascunho')` navega. NAV ids válidos: <LISTA>.

## Receita (obrigatória — ajuste ao design system do projeto)
1. Anatomia: `Page` (voltar opcional acima, kicker curto só quando dá contexto real, título, UMA frase de descrição, ações à direita). Sem faixas de métricas em cartões no topo; metadados vão na prop `meta` como texto.
2. Seções: toda seção de conteúdo é `Section` (ProjectFlowGroup h2) com ícone Phosphor, título e contagem em coleções (`Título · 3`). Nada de Card/PagePanel/caixas aninhadas. Uma seção nunca repete o título da aba/página.
3. Coleções: a forma vem da expressão da tela (seção "Forma de cada tela" abaixo). `List` (tabela emoldurada, mesma em todas as larguras, colunas secundárias via `mobileMeta`) é a forma certa só quando o trabalho é comparar registros. Em qualquer forma, cada item mostra identidade, situação e no máximo uma linha de apoio; o resto vai para o Sheet via `detail({...})`. A mesma ideia vale no celular, adaptada, sem um desenho alternativo de cartões.
4. Situação: `Status` com texto (tom de StatusBadge). No máximo UM selo por linha. Omita o selo quando a seção já diz a situação (ex.: seção "Convites pendentes" não precisa de selo "Pendente"). Status em sentence case ("Data proposta", não "Data Proposta").
5. Vazios: `Empty` (uma frase + próximo passo). Erros/sucessos transitórios: `toast` (sonner) — nunca alertas inline vermelhos. Bloqueios persistentes: uma `Section` com frase clara e a ação que resolve.
6. Ações: rótulos verbais e canônicos, um primário por tela. Ações de linha com `RowAction` (ícone + rótulo; no celular só ícone). Ações destrutivas/irreversíveis confirmam em `Dialog`.
7. Detalhes em `Sheet` à direita (via `detail`), seções planas. Leitura longa em `Dialog variant="reading"`.
8. Formulários: campos agrupados por assunto com `Field`/`ProjectFlowField`; controles só de <PACOTE UI> (Input, Textarea, Select via Pick, Checkbox, DatePicker, ChoiceCards, Switch, SearchableSelect...). Nunca `<input>`/`<select>` nativos visíveis.
9. Fidelidade: nunca restilize um componente do pacote de UI (borda, divisória, fonte, caixa do texto, espaçamento, cor) no seu arquivo, em `kit.tsx` ou em `canvas.css`. Se a tela precisa de uma aparência que o pacote não tem, use o componente como está e reporte o item como "Mudança no pacote de UI". `node check-fidelity.mjs` precisa passar.
10. Tokens: nada de hex; use classes semânticas (text-muted-foreground, bg-muted/20, border-border...). JetBrains Mono (`Mono`) só para protocolo/código/hash/versão. Ícones só Phosphor. Status nunca só por cor.
11. Copy no idioma do produto, correto, curto, concreto, voz ativa. Corrija termos obscuros das telas atuais (explique ou renomeie).
12. Celular (390 px): sem rolagem horizontal da página; ações empilham; nada cortado.
13. Interações devem funcionar no canvas (filtros, abas, abrir Sheet/Dialog, toasts, navegação go()) com estado em memória.

## Forma de cada tela (obrigatória)
O orquestrador passa, para cada tela sua: trabalho, composição, metáfora, três precedentes, elemento de assinatura e o que o produto já tem e deve ser mantido. Antes de codar, confirme ou ajuste essas seis linhas no seu relatório. Comece pelo que já é criativo no produto atual. A tela tem **um** elemento memorável nascido do domínio, e o resto fica quieto. Ao revisar as capturas, pergunte: "isto parece uma tabela genérica ou um template?". Se parecer, refaça.

## Validar (obrigatório, use seus valores únicos de OUT/PORT/SHOTS abaixo)
```
cd <CAMINHO DO CANVAS>
UI_ROOT=<UI_ROOT> WEB_APP=<APP> OUT=<OUT> node $UI_ROOT/$WEB_APP/node_modules/vite/bin/vite.js build -c vite.config.mjs
UI_ROOT=<UI_ROOT> WEB_APP=<APP> OUT=<OUT> PORT=<PORT> SHOTS=<SHOTS> node shoot.mjs <IDs separados por vírgula>
```
(Use o wrapper de comandos pesados do projeto, se houver.)
O build compila todos os arquivos; se outro agente deixar um arquivo quebrado momentaneamente, espere e tente de novo (não edite o arquivo dele). Abra (Read) TODAS as suas capturas PNG em 1440 e 390 e corrija o que estiver feio, desalinhado, cortado, denso, vazio ou inconsistente com a tela de referência. Itere até ficar com qualidade de produto. O shoot reporta erros JS e overflow — devem ser zero.

## Relatório final (curto)
- Telas e estados entregues (id · rótulo) e as principais decisões de redesenho por tela (o que mudou em relação ao produto atual e por quê), em bullets.
- Resultado do último build e do shoot (contagem, problemas).
- Qualquer ponto em aberto para o responsável de produto.
