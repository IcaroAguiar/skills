# Project QA profile

The gate needs these facts once per repository. Look first for a `QA` section in the repository's `AGENTS.md`. Otherwise keep the profile in `references/projects/<repo>.md` in this skill, which stays on this machine and out of the repository. `pr-demo-video/references/projects/` may already hold some of them for the same repository; reuse what is still true.

Write only what you confirmed by running it, with the date. Key names and paths only, never a secret value.

```markdown
# <repo> QA profile

Confirmed on <YYYY-MM-DD>.

## Stack
- Build and start: <commands, or the Portly servers to start>. URL: <base URL>.
- Database and other dependencies: <what must be running, how to bring it back, what must never be created or reset>.
- Playwright: `--cwd <dir> --playwright "<command that runs the project's playwright>"`.

## Accounts
- <persona>: keys `<USER_KEY>` and `<PASSWORD_KEY>` in `<credential file>`. One line per persona, including the one with no permission.
- Personal accounts that must never be used: <key names>.

## Data
- Where the features become visible: <organization or record that already has the data>.
- What the crew may write, the label to use, and how to remove it. What cannot be deleted once created.

## Look
- Theme, locale, extra masks for personal data.

## Known traps
- <what cost time on an earlier run>
```
