---
name: task-closeout
description: >-
  Close a task with a reviewable delivery and its leftovers accounted for: before handing off code work or machine changes (installs, home config, skills, secrets), when asked to close or clean up, or on a dirty checkout before editing or creating a worktree.
---

# Fechamento de tarefas

## Entrada: checkout sujo se investiga

Checkout sujo é um estado a classificar antes de criar outra worktree. Separe staged, unstaged e untracked e classifique cada arquivo: tarefa atual, trabalho já integrado, pendência de outra tarefa, temporário, origem desconhecida. Com um único escritor, reconcilie e trabalhe no checkout principal; outra worktree só por concorrência real, checkout ocupado ou isolamento necessário, com a razão registrada.

```bash
python3 <skill-dir>/scripts/inspect_checkout.py /caminho/repo [/outro-repo] [--base-ref <ref>] [--limit <n>]
```

Somente leitura, sem fetch: não prova integração nem autoriza remoção. `omitted_paths` significa ampliar `--limit` ou inspecionar esses caminhos antes de agir.

Pendência herdada: leia [o protocolo de recuperação](references/inherited-work.md) antes de mover ou restaurar.

## Worktrees e branches

```bash
python3 <skill-dir>/scripts/delivered_leftovers.py <repo> [--apply]
```

Prova a entrega por ancestralidade com a branch padrão do remoto ou por PR mergeada nela que contém a ponta; exige status vazio e aceita só ignorados regeneráveis. Worktrees sem commit desde a criação e pastas sumidas ficam. `--apply` faz um bundle e remove só as linhas `remove`. Explique cada `keep` da tarefa.

- Squash merge exige evidência da PR ou do diff; ancestralidade ou igualdade com a própria branch remota não provam entrega.
- `prunable`, clean ou antiga não provam abandono; remova worktree a worktree com `git worktree remove`, sem prune global.
- Arquivos ignorados (`.env`, bancos locais, capturas) existem sob status clean: confira e preserve os de valor antes de remover.
- O histórico de um harness não cobre os outros (Claude Code, Codex, T3 Code): cruze os três antes de julgar uma worktree sem uso.
- Pastas de QA e worktrees ficam fora da raiz da home. Worktrees manuais ficam num diretório de desenvolvimento dedicado; o gerenciamento nativo do harness continua valendo.

## Runtime

- **Simulador e emulador:** `device_close` no que a tarefa abriu; `xcrun simctl shutdown <id>` ou `adb emu kill` só se continuar ligado e nenhuma outra tarefa o usar. Um iOS Simulator ligado ocupa cerca de 1,5 GB.
- **Docker:** remova os containers que a tarefa criou. Para o resto, mostre candidatos e `docker system df` e pergunte: `docker builder prune -a`, `docker image prune -a` e `docker update --restart=no` só com aprovação. Volumes nomeados guardam dados de projeto.
- Processos temporários próprios são encerrados; nenhuma dependência fica apontando para diretório temporário removido.

## Fora de repositório

Sem Git, nada registra o estado anterior:

- **Configuração não versionada** (`~/.config`, skills, arquivos de ferramentas): copie antes da primeira edição e informe o caminho; essa cópia é o único rollback.
- **Instalações:** pacote, versão, local e como desinstalar; remova o que ficou sem uso.
- **Segredos:** apague arquivos temporários com segredos e exports em texto puro; informe o que não dá para apagar, como transcripts.
- **Subagentes:** o brief pede que listem o que criaram (clones, servidores, navegadores); confira antes de fechar.

## Resposta

Entrega e links; estado dos checkouts; o que foi removido ou mantido, com motivo; configurações alteradas fora do repo, com o caminho do rollback; pendência real e como recuperá-la.
