---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Before asking the first user-facing question, check whether Codex exposes the `request_user_input` tool in the current runtime/mode. If it is not available, do not continue the grilling session in normal chat. Tell the user that this skill requires Codex user-input tooling and ask them to switch to a mode/runtime where `request_user_input` is available, then stop.

Ask the questions one at a time using `request_user_input`, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

User-input rules:

- Ask exactly one decision question per `request_user_input` call.
- Provide 2-3 mutually exclusive options.
- Put the recommended answer first and mark its label with `(Recommended)`.
- Keep option labels short; put the trade-off in each option description.
- Let the tool's free-form `Other` path handle answers outside the listed options.
- Do not ask a fallback plain-chat question unless the user explicitly asks to continue without the tool after being told the tool is unavailable.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.
