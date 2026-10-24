# How real people break software

Give each worker the sections that fit its journey. Each line is an action to try, not something to read.

## Interrupted and out-of-order flows
- Leave a form halfway: back button, reload, close the tab, come back later. Is the draft kept, lost silently, or duplicated?
- Close a dialog that has unsaved changes. Is there a warning? Does reopening it show stale values?
- Open step 3 or a detail page from a pasted URL without passing through the earlier steps.
- Start an action, switch the role or journey in the session selector, then finish the action.
- Let the session expire mid-form (wait, or clear the cookie in a second context), then submit.

## Repetition and timing
- Double-click every submit and confirm button. Press Enter twice.
- Fire an action, then immediately cancel or navigate away.
- Use a slow network (`page.route` with a delay, or CDP throttling) and go offline during a submit. Then retry. Does a duplicate appear?

## Two tabs, two people
- Edit the same record in two tabs. Save in A, then act in B with stale data.
- Two personas on the same item: one assigns while the other claims; one archives while the other edits.
- Check whether the list refreshes, or keeps offering an action the server now refuses.

## Inputs a person really types
- Empty, only spaces, a leading or trailing space, a very long value (500 or more characters), emoji, accents, pasted text with line breaks or formatting.
- Numbers with commas versus dots, leading zeros, negative values, values above the limit.
- Dates: 29/02, 31/04, past and future, today at 23:59, the start date after the end date, typed instead of picked.
- Masked fields (CPF, phone, CEP) pasted with or without punctuation.
- Search: partial word, wrong accent, upper case, a term with no results, clearing the search.

## Files
- Wrong type, an extension renamed to `.pdf`, zero bytes, a file over the limit, a scanned image-only PDF, a password-protected PDF, an upload cancelled midway, the same file twice.

## Permissions as a person sees them
- For each control, decide whether it is hidden, disabled with a reason, or shown and then refused by the server. The last one is a defect.
- Paste the URL of a resource from another organization or role. Change the ID in the URL.
- Check that the list and the detail agree: an item the list shows must open, and an item the detail hides must not be listed.
- Check whether an expired or revoked grant still shows controls.

## Devices and accessibility
- Widths 390, 768, 900, 1280 and 1440. Rotate. Zoom to 200%.
- Keyboard only: Tab order, focus after opening or closing dialogs, Escape, and whether the focus is visible.
- Check that only one `main` landmark exists, buttons have names, and no status is shown by color alone. Try dark and light themes.

## Design and usability (always report)
- **Clutter:** too many frames, repeated sentences, long explanatory text, everything expanded at once.
- **Competing actions:** more than one primary action, or a decision that has to be taken in two places.
- **Navigation:** the person can't tell where they are, how to go back, or where a feature lives. The same thing has different names in the menu, the title and the button.
- **Handling:** small or crowded targets, horizontal scroll, dialogs taller than the screen, sticky bars that cover content, tables unreadable on the phone.
- **Feedback:** no loading state, success that is silent, errors that don't say how to fix them, messages that contradict each other, a disabled control with no reason.
- **Language:** jargon, internal codes or enums, English mixed into a Portuguese interface.

## State and data extremes
- Empty states, exactly one item, many items with pagination, very long titles, rare statuses (expired, suspended, under appeal, archived).
- Check whether history survives after edits, re-submission or a new version, and whether the person can see it.
