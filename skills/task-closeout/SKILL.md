---
name: task-closeout
description: "Finalize tasks with a reviewable delivery and accounted-for workspace artifacts. Use before the final handoff of code work or of a task that changed the machine outside a repository (installs, home config, skills, secrets), when asked to close a task or clean its leftovers, and when encountering a dirty checkout before editing or creating a worktree."
---

# Fechamento de tarefas

Cuide da continuidade do checkout e do destino dos recursos da tarefa. Os fluxos existentes continuam responsáveis por implementação, revisão e deploy. Use o idioma do usuário.

## Entrada: analisar antes de isolar

**Checkout sujo é um estado a investigar, não motivo suficiente para criar outra worktree.**

1. Identifique repo, branch, HEAD, base pretendida e worktrees. Separe alterações staged, unstaged e untracked. Confira tarefas e servidores que possam estar usando esse checkout, quando houver ferramentas para isso.
2. Classifique os arquivos relevantes: trabalho da tarefa atual; trabalho anterior já integrado; trabalho pendente de outra tarefa; artefato temporário; origem desconhecida. Compare o diff e o histórico com a base. Atualize a referência remota quando a decisão depender do estado atual; sem acesso, sinalize a referência local como possivelmente desatualizada.
3. Decida a partir dessa análise. Prefira reconciliar e trabalhar no checkout principal quando houver um único escritor e isso preservar o trabalho existente. Outra worktree se justifica por concorrência real, checkout ocupado ou isolamento necessário para a execução. Registre a razão concreta antes de criá-la e reutilize uma worktree adequada quando possível.

Para reunir os sinais em uma chamada, use o diagnóstico somente leitura:

```bash
python3 <skill-dir>/scripts/inspect_checkout.py /caminho/repo [/caminho/outro-repo]
```

Ele mostra identidade, mudanças e comparações de conteúdo com uma referência local. Não faz fetch, não prova que uma PR foi integrada, não identifica o autor e não autoriza remoção. `omitted_paths` exige ampliar `--limit` ou inspecionar os caminhos relevantes antes de agir. `--base-ref` permite indicar a base correta.

## Durante a tarefa: manter a separação barata

- Capture o estado anterior dos arquivos que serão editados, especialmente se já estiverem modificados. Preserve index e working tree separadamente quando divergirem. Não dependa de reconstruir a autoria no final.
- Mantenha o diff da tarefa separado de trabalho anterior. Não inclua um arquivo inteiro em commit/PR só porque a tarefa alterou um trecho dele. Use a base capturada para separar os trechos com segurança.
- Reutilize o ambiente previsto pelo projeto. Registre a finalidade e o destino de worktrees, branches, processos, fixtures e arquivos temporários criados. Uma nota curta basta quando houver vários recursos; tarefas pequenas não precisam de relatório próprio.
- Use um único diretório temporário por tarefa quando precisar de vários arquivos. Não crie sucessivas cópias de repos, caches ou relatórios para contornar uma dificuldade de diagnóstico.
- Não crie pastas de QA ou worktrees diretamente na raiz da home. Use o diretório de artefatos da tarefa ou o local de worktrees previsto pelo projeto/ferramenta. Quando ~/dev aponta para outro disco, prefira caminhos sob ~/dev para worktrees manuais; preserve o gerenciamento nativo de worktrees do harness (Codex, Claude Code, T3).

## Fechamento: entrega e workspace

Siga somente as etapas que pertencem ao pedido e à autorização existente:

| Ponto de parada | Confirmação necessária |
| --- | --- |
| Código pronto | Commit focado da tarefa e verificações relevantes; se o pedido exigir manter um diff sem commit, deixe esse estado explícito. Se houve code review, `review-ledger untriaged --repo <repo>` (skill `code-review`) não lista nenhuma chamada. |
| PR solicitada | Commit publicado, base/head corretos e PR aberta verificada. |
| Merge solicitado | Revisão e checks aplicáveis, head conferido e merge confirmado remotamente. |
| Deploy previsto | Gatilho conhecido, resultado do pipeline, versão no ambiente e fronteira afetada verificados. |

Concluir código não autoriza merge ou produção por si só. Se um merge autorizado disparar deploy, acompanhe o resultado esperado; CI ou merge não substituem produção. Para migrations que introduzem invariantes sobre dados existentes, confira compatibilidade e dados no alvo quando acessível e autorizado. Se falhar, reporte o ambiente real e só recupere a disponibilidade com compatibilidade e autorização estabelecidas; não corrija cadastros de negócio por suposição.

Depois da entrega, dê destino aos recursos da tarefa:

- **Código e branches:** preserve trabalho não integrado. Remova a branch da tarefa só após confirmar sua entrega ou um abandono autorizado. Squash merge exige evidência da PR/diff; ancestralidade ou igualdade com a própria branch remota não bastam.
- **Worktrees:** confirme dono, uso ativo, commits e mudanças pendentes; então remova as dispensáveis com `git worktree remove`. Diretório antigo, estado clean ou marca `prunable` não provam abandono. Não faça prune global por conveniência. Inspecione também arquivos ignorados: .env, bancos locais, capturas e evidências podem existir mesmo com status clean. Preserve os que têm valor antes da remoção. Cruze tarefas fixadas/em andamento nos perfis envolvidos e referências de processos; o histórico de um harness não cobre tarefas de outro (Claude, Codex, T3). Se a worktree pertencer à tarefa encerrada, estiver integrada, sem pendências e sem uso, conclua sua remoção dentro da autorização existente. Caso contrário, informe caminho e motivo concreto para mantê-la.
- **Principal:** sincronize com a base adequada sem sobrescrever pendências. Prefira fast-forward; reconcilie divergências. Termine limpo quando esse for o destino combinado. Nunca force limpeza enquanto outro escritor usar o checkout.
- **Artefatos e fixtures:** guarde apenas evidência útil e entregáveis no destino esperado. Remova temporários que a tarefa comprovadamente criou e que não estejam em uso. Para dados ou recursos compartilhados, siga o escopo autorizado, não o nome ou a idade.
- **Runtime:** encerre processos temporários próprios; mantenha o ambiente principal reutilizável conforme as regras do repo e seu gerenciador. Não deixe dependências apontando para diretórios temporários que serão removidos.
- **Docker:** sempre que a tarefa usou Docker, otimize antes de fechar. Pare containers sem conexão ativa (`lsof -iTCP -sTCP:ESTABLISHED` nas portas publicadas) que não pertencem ao trabalho em andamento e tire o início automático (`docker update --restart=no`). Remova containers parados, cache de build (`docker builder prune -a -f`), imagens sem container (`docker image prune -a -f`) e volumes anônimos (hash de 64 caracteres) que nenhum container referencia. Volumes nomeados guardam dados de projeto: liste-os, mas só apague com autorização explícita. Informe o espaço liberado com `docker system df`.

Se houver pendências anteriores, leia o protocolo abaixo. Se não houver, não crie backup, stash, inventário persistente ou nova pasta apenas para comprovar limpeza.

## Mudanças fora de repositório

Sem Git, nada registra o estado anterior nem o que a tarefa criou. Feche estes itens quando existirem:

- **Instalações:** informe pacote, versão, local e como desinstalar. Remova o que a tarefa instalou e acabou não usando, ou diga que ficou.
- **Configuração não versionada** (`~/.config`, skills, arquivos de ferramentas): faça uma cópia antes da primeira edição e informe o caminho dela; essa cópia é o único rollback.
- **Material secreto:** apague arquivos temporários com segredos (mesmo falsos) e exports em texto puro dentro da autorização. O que não dá para apagar, como transcripts de sessão, informe.
- **Recursos de subagentes:** clones em `/tmp`, servidores, navegadores e sessões aninhadas também são da tarefa. Peça no brief que o subagente liste o que criou e confira antes de fechar.

## Quando houver trabalho anterior

Antes de mover ou restaurar pendências herdadas, leia [o protocolo de recuperação](references/inherited-work.md). Classifique primeiro; use uma única cópia verificada quando necessária e deixe a pendência identificada. Backup não equivale a trabalho entregue.

## Verificação final e resposta

Confira novamente status/HEAD dos repos envolvidos, worktrees da tarefa, recursos encerrados ou mantidos e verificações afetadas pela limpeza. Compare pendências preservadas com a captura inicial. Não reexecute suítes já válidas sem mudança ou dúvida que justifique.

Responda com: entrega e links; estado dos checkouts; instalações e configurações alteradas fora do repo, com o caminho de rollback; o que foi removido ou mantido; pendência real e caminho de recuperação, se houver. Informe os resultados distintos de código, merge e deploy que se aplicarem. Não diga apenas “feito” enquanto a tarefa deixa resíduos sem destino.
