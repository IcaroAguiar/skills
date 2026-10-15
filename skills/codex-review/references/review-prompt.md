# Review prompt template

One prompt per PR. Fill every `{{…}}`. Write in the user's language. Keep secrets out: point to files, never paste values. Drop the "Teste interativo" section for a code-only review.

```markdown
Você é o revisor independente do {{PROJETO}}. Use $code-review nesta revisão. Responda em {{IDIOMA}}.

## Regras
- Não edite arquivos, não faça commit, push nem publique nada.
- Revise só o diff fixo abaixo; leia código adjacente apenas para responder dúvidas concretas levantadas pelo diff.
- Não rode suítes de teste neste sandbox (o cache do Jest falha com EPERM): use a evidência do autor e leia os testes. Verificações sem escrita são permitidas (`git diff --check`, `tsc --noEmit --incremental false`).
- Não consulte serviços externos (bases de conhecimento, GitHub); o que você precisa está aqui ou no repositório.

## Alvo
PR: {{URL}} (branch {{BRANCH}})
Diff fixo: `git diff {{BASE_SHA}}...{{HEAD_SHA}}` ({{N}} commits)

## Spec
{{O que a mudança precisa fazer, a decisão de produto que a sustenta, o que está fora do escopo.}}

## T0 (determinístico, já executado)
{{Resumo do review-t0: PASS, checks executados e warnings.}} Não reporte de novo o que o T0 ou o tooling do repositório já cobre. Confirme ou descarte cada warning do T0 com um motivo.

## T1 (pré-revisão rápida, já executada)
{{Achados do review-t1 que o autor descartou, cada um com o motivo; os aceitos já estão corrigidos neste diff. Se o T1 não rodou, diga por quê (rota do T0 ou nenhum modelo respondeu).}} Reabra qualquer descarte de que discorde, com evidência.

## Contexto verificado pelo autor
{{Fatos do código fora do diff que o revisor precisaria descobrir (guards, transações, contratos com outros serviços), com arquivo:linha.}}

## Evidência do autor
{{Testes RED→GREEN, suítes com números, tsc/lint; falhas preexistentes fora do diff.}}

## Teste interativo (só quando pedido)
- App: {{URL}}; login: {{como}}; credenciais no arquivo `{{CAMINHO}}` ({{chaves}}). Nunca imprima segredos.
- Dados: use o marcador `{{MARCADOR}}` e, ao terminar, {{limpeza exigida}}.
- Scripts em `{{DIR}}`, executados a partir de `{{DIR_COM_DEPENDÊNCIAS}}`; localizadores por papel e rótulo; capturas em {{VIEWPORTS}}.

## Resposta
Achados separados em Standards e Spec, cada um com severidade, local, impacto, evidência no diff, menor correção e como validar; separe "confirmado por execução" de "suspeita por leitura". Termine com a linha de gate e o veredito da skill.
```

## Delta prompt

```markdown
Revisão de delta ($code-review), mesma revisão de antes. Um corretor aplicou {{quais achados}}. Novo head: {{NEW_HEAD}} (local ou publicado); T0 do novo head: {{PASS + warnings}}. Revise `git diff {{OLD_HEAD}}..{{NEW_HEAD}}` mais chamadores e testes afetados, preservando a cobertura do diff completo anterior. {{Se a correção toca auth, tenancy, credenciais, migrations ou contratos públicos: "Se julgar necessário, faça a revisão completa de `{{BASE}}...{{NEW_HEAD}}`."}} Evidência do autor: {{…}}. Mesmas regras: sem edição, sem suítes neste sandbox, sem serviços externos. Termine com a linha de gate e o veredito da skill.
```
