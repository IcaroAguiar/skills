# Storyboard template

Copy to `<run>/storyboard.md`. The orchestrator writes it; each worker gets only its own scene plus the shared header.

```markdown
# Demo: <change name> (<PRs>)

## Shared
- App: <base URL>, code at <branch/commit>
- Account: test account, session at <run>/.auth.json (never open or print it)
- Data: <org/records chosen and why they make the features visible>
- Writes allowed: <none | labeled test data "<marker>" in <env> only>
- Never on camera: publish, delete, generate permanent versions, <project-specific>
- Language of captions: <pt-BR>

## Scenes (in order)

### 01-<slug>: <promise in one line>
- Start state: <route, what is on screen, data present>
- Actions: <numbered, concrete: "open X", "type Y in field Z", "pick the first option of W">
- Captions (verbatim, in order):
  1. "<what to notice>"
  2. "<…>"
- End state: <exact screen; this is the next scene's start state>
- Notes for the worker: <labels you already know, files to read, pitfalls>

### 02-<slug>: …
```

## Caption rules

- One idea per caption, ≤ 90 characters, the user's language, no jargon or enum names.
- Say what the viewer should **notice**, not what the cursor does: "A soma aparece enquanto você digita" instead of "Digitando 25 no campo".
- Show before you tell: the caption appears just before or with the change, and stays about 2.5 s plus 1 s per extra line.
- The first caption names the place ("Administração › Fomento › Editais internos"). The last one is short ("Fim da demonstração").

## Choosing data that shows the feature

- A "copy from previous" control needs a previous item. Pick the org or account that has one.
- A validation message needs an invalid state. Create it on camera from a valid one, then fix it, so the viewer sees both.
- A recovery feature needs something to recover. Type, reload, recover.
- A list improvement needs several rows. Pick a populated scope.
