# <Área> — canvas de aprovação

Protótipo estático para aprovar o redesenho de <área> antes da implementação. Usa os componentes reais de `<pacote UI>`. Dados, pessoas e textos são fictícios. Não há API, autenticação nem persistência: os estados ficam em memória.

## Base

- UI de `<branch padrão>` em `<commit>`. `UI_ROOT` aponta para um checkout atualizado e com dependências instaladas. Se o checkout local estiver atrás ou for servido, use um snapshot:
  ```sh
  git archive origin/<branch> | tar -x -C /tmp/<nome>-snapshot
  cd /tmp/<nome>-snapshot && <instalar dependências do app e do pacote UI>
  ```
- Receita: `<docs do design system / área de referência>`, codificada em `src/kit.tsx`.

## Execução

```sh
UI_ROOT=<...> WEB_APP=<app> node $UI_ROOT/$WEB_APP/node_modules/vite/bin/vite.js build -c vite.config.mjs
UI_ROOT=<...> WEB_APP=<app> node shoot.mjs            # ou: node shoot.mjs A1,A2
UI_ROOT=<...> WEB_APP=<app> node $UI_ROOT/$WEB_APP/node_modules/vite/bin/vite.js preview -c vite.config.mjs --host 127.0.0.1 --port <porta>
```

A tela e o estado vêm do hash: `#P4`, `#P4~rascunho`. Use `?tema=escuro` para o tema escuro.

## Telas

| ID | Tela | Estados | O que muda |
|---|---|---|---|
| A1 | … | … | … |

## Rodada 1 — decisões (<data>)

| Tela | Decisão |
|---|---|
| A1 | Aprovada / Reprovada, mantém a atual / Só melhorias reais / Aprovada com ajuste: … |

## Decisões transversais

1. …

## Mudanças no pacote de UI

Propostas do canvas que o pacote de UI ainda não tem: visuais em `src/proposed.css` e componentes em `src/proposed/`. O nome na primeira coluna é o mesmo do marcador `/* proposta: Nome */` ou do arquivo, e o `check-fidelity.mjs` confere. O usuário aprova a lista junto com as telas; cada item aprovado é implementado no próprio pacote e vale para todos os consumidores.

| Proposta | Hoje no pacote | Proposto | Telas afetadas |
| --- | --- | --- | --- |
| … | … | … | … |

## Desvios aprovados

Diferenças entre o canvas aprovado e o produto implementado que o usuário aceitou depois do portão de paridade. Sem aprovação, a diferença é defeito.

| Tela | Diferença | Motivo | Aprovado em |
| --- | --- | --- | --- |
| … | … | … | … |

## Pontos em aberto

- …

## Limites

O canvas prova composição, textos e aparência (com os componentes reais, sem retoques locais), não persistência, permissão, auditoria ou transações. Diálogos e painéis laterais funcionam, mas não aparecem nas capturas automáticas. As capturas ficam em `/tmp/<area>-canvas-shots/`, fora do Git.
