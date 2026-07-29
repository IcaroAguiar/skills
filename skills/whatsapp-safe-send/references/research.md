# Research Notes - WhatsApp Safe Send

Use these notes to maintain the skill; do not load them for routine sending unless debugging or changing the workflow.

## Findings

- AppleScript/System Events keystroke automation is fragile for international characters and timing. MacScripter discussions recommend preparing text first and pasting once via clipboard instead of detecting/typing each accented character. They also note delays or batching can avoid repeated/ordered text glitches.
- pyautogui-style typing has similar Unicode limitations. Developers commonly work around this by copying Unicode text with a clipboard library and pasting instead of using `typewrite`.
- WhatsApp Web/Desktop message boxes are often `contenteditable`-style fields. Developer reports show automation tools can fail to enter text reliably in these editable divs, or `send_keys` may only type part of the message.
- WhatsApp line-break behavior differs by surface. GUI paste, Enter-to-send settings, captions, and APIs can treat newlines differently. Keep messages short and verify before sending.
- Playwright and Selenium can interact with contenteditable fields, but reliability depends on locators, focus, and browser clipboard permissions. Prefer locator-based actionability checks and explicit assertions before sending.
- Official/provider WhatsApp Business APIs are more deterministic for repeatable outbound messaging, but they introduce policy constraints: templates, opt-in, customer-care windows, message types, and delivery-status handling.

## Source Links

- MacScripter, System Events and accented characters: https://www.macscripter.net/t/system-events-and-accented-characters/31609
- MacScripter, accented vowels with AppleScript: https://www.macscripter.net/t/typing-text-with-accented-vowels-using-applescript/74343
- Stack Overflow, pyautogui Unicode input workaround: https://stackoverflow.com/questions/33151865/input-unicode-string-with-pyautogui
- Stack Overflow, Selenium `send_keys` issue in WhatsApp Web: https://stackoverflow.com/questions/73255953/python-selenium-send-keys-writes-only-one-character-in-whatsaapp-webs-message-b
- Automa GitHub issue about editable divs and WhatsApp Web: https://github.com/AutomaApp/automa/issues/1158
- Playwright input docs: https://playwright.dev/docs/input
- Playwright best practices: https://playwright.dev/docs/best-practices
- Meta-hosted WhatsApp Node.js SDK text message docs: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/text/
- Meta-hosted WhatsApp Node.js SDK TextObject docs: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/types/TextObject/
- Vonage WhatsApp Messages API formatting notes: https://developer.vonage.com/en/messages/code-snippets/whatsapp/send-text/curl
