---
name: whatsapp-safe-send
description: Use when drafting, pasting, attaching, or sending WhatsApp messages through GUI automation, Computer Use, WhatsApp Desktop/Web, AppleScript, Playwright, Selenium, pyautogui, or any fragile text-entry surface where typos, accents, focus errors, newlines, or formatting drift could affect a real recipient.
---

# WhatsApp Safe Send

Use this skill before any real WhatsApp send performed through GUI automation.

## Core Rule

Do not use character-by-character typing for final outbound message content.

Compose outside WhatsApp, paste via clipboard, verify the target and field content, then send. If the surface cannot be verified, stop before sending.

## Workflow

1. **Confirm authority and target**
   - Read the lead CRM/handoff for channel, recipient, approval state, and no-send boundaries.
   - Verify the active WhatsApp header or audience chip matches the intended recipient before composing or attaching.
   - If approval is missing or the target is ambiguous, stop.

2. **Prepare the payload outside WhatsApp**
   - Draft the exact message in local text first.
   - Keep outbound WhatsApp text short and mostly single-paragraph unless line breaks are essential.
   - Avoid markdown-like decorations unless the user explicitly requested WhatsApp formatting.
   - For media, decide whether the text is a separate message or a caption before opening the send preview.

3. **Paste, do not type**
   - Put the full text on the clipboard and paste once into the focused composer/caption field.
   - Do not use `type_text`, `send_keys`, `keystroke`, or pyautogui-style typing for the final body.
   - If pasting a file, paste/attach the file first, then verify the media preview and audience chip.

4. **Pre-send verification gate**
   - Confirm all of these before clicking send:
     - correct conversation/header/audience;
     - composer or caption field contains the intended text, not the search field;
     - accents, punctuation, line breaks, and spacing are acceptable;
     - no unintended prefix, autocomplete token, contact name, or stale clipboard content;
     - media preview is the intended file.
   - If the accessibility tree truncates content, use the visible preview plus field `Value`; if still uncertain, cancel.

5. **Send and verify**
   - Click send only after the pre-send gate.
   - After sending, re-read the WhatsApp state and confirm the message/media appears in the intended conversation with sent/delivered status when visible.
   - Record the exact action, timestamp, attachment, and any correction in the CRM/handoff.

## Failure Handling

- Text landed in the search field: clear it; do not send; refocus composer by coordinate or element; retry with clipboard.
- Wrong conversation or audience: cancel/back out before sending and reopen the intended chat.
- Newline sent early or message split: stop, assess visible state, and correct only if the correction reduces confusion.
- Typo already sent: send one concise correction via clipboard, then update CRM with the incident.
- Repeated focus/formatting failures: stop after two failed attempts and switch to a safer route, such as manual user confirmation or an approved API path.

## Safer Alternatives

- Prefer official/provider WhatsApp Business APIs for repeatable business messaging when account, template, opt-in, and policy requirements are satisfied.
- For GUI-only one-off sends, prefer clipboard paste plus verification over browser/desktop keystroke automation.

## Research

For source-backed rationale, read `references/research.md` only when updating this skill or choosing a new automation route.
