# Friction ruler

In the gate, the form probe (`probe()` in a scene) counts the per-form block from the screen; workers fill only the per-flow block. In a sweep, fill one block per form and per flow you cross. Count; do not rate. A count lets the orchestrator compare before and after and tells a fix from an opinion.

## Per form

```
Form: <screen and form name>            Viewport: <width>
Fields shown: <n>      Required: <n>
Fields the system already knows or could derive: <n> — <which: e.g. city from CEP, name from the account>
Free-text fields with a closed set of answers: <n> — <which, and the set: e.g. "UF" typed, 27 options>
Fields with a fixed format and no mask or example: <n> — <which: CPF, phone, date, money>
Fields with no sensible default where one exists: <n> — <which>
Wrong keyboard on the phone (text keyboard for a number, e-mail, phone): <n> — <which>
Errors shown only after submit: <n>      Errors that do not say how to fix: <n> — <quote each>
Typed data lost after an error, reload or back: yes | no
```

## Per flow

```
Flow: <what the person came to do>
Screens crossed: <n>      Clicks or taps: <n>      Fields typed: <n>
Decisions asked that have an obvious answer: <n> — <which>
Confirmations asked for a reversible action: <n>
Times you did not know what to do next: <n> — <where, and what you were looking for>
Times you had to go back: <n> — <why>
Dead ends (no way forward, no way back, or silent failure): <n> — <where>
Same thing under different names (menu, title, button): <n> — <the names>
```

## What makes a line a finding

- Any count above zero in a line that names a cause (a derivable field, a closed set typed freely, an error with no way out) is a `UX` finding. Report it with the screen, a screenshot and the smallest change that would remove it.
- `Fields shown`, `Screens crossed`, `Clicks` and `Fields typed` are the baseline. They become findings when you can name a step or field the task does not need.
