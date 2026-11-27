---
name: design-canvas
description: >-
  Show a screen for approval before it is built: "canvas de aprovação", "mockup para eu aprovar", "me mostra opções antes de implementar", "onde essa tela deve ficar", "redesign da área X", "está sem vida". The approved option becomes the PR. Direct UI edits: impeccable.
---

# Design canvas

The concept is built on the real product, the options arrive as images in the chat, and the approved one stays on its branch and becomes the PR, so nothing is built twice.

Rules that hold at every step:

- **Real product, real content.** The product's own shell, components, brand and tenant, with realistic content in its language. A placeholder ("Lorem", "Texto de teste") or a generic shell is a defect.
- **Images in the chat are the delivery.** Options side by side, shown with the harness's image display. When the user cannot open an artifact, render its artboards locally and send the images.
- **Show the layout responding.** For the recommended option, show the same screen at 1440, 1024 and 390 px in one strip, with one line on what changes at each width (what collapses, what stacks, where the main action goes). The phone capture runs the full page, scrolled to the end, and includes the state a phone user depends on: the menu open, the main action reachable, a long title wrapping.
- **Look before the user does.** Fix native unstyled controls, mixed control heights, truncation, a placeholder logo, anything the product does not have.
- **Stop rule.** Two rejections of the same thing send you back one step: reread the request and the references, and ask for the user's own references and reasons before drawing again.

## 1. Faithful concept (the default)

For a screen of an existing product, and for every decision about where it lives or whether it ships.

1. Read the product's design and the user's taste as `design-direction` sets out.
2. On a branch, mount the screen in its real route and layout, with fixtures at the app's data boundary. Start from the app's current code, never from an earlier mock.
3. When there is a choice, build up to three versions of the **same** screen, changing only what is being decided, with the same content in all of them. Include the current screen when one exists.
4. Capture every version at 1440 and 390 px (the recommended one also in the strip above), fully loaded, in the states the decision depends on (populated, empty, form open).
5. Send the images in the chat with one line per option saying what differs, then ask with the question tool.
6. The approved version continues on the same branch: remove the fixtures and the unchosen versions, wire the real data, and follow the normal delivery. The PR shows the approved image beside the built screen.

**Complete when:** the user chose from the images, and the branch holds only the chosen version.

## 2. Exploration (only when asked, or with no precedent)

For a look the user asked to rethink ("sem vida", "genérico", "redesenha"), or a product with no similar screen yet.

1. Capture the current screens and name their defects yourself. Bring references of real products that solved the same work. Open with the screen's purpose: who uses it, when, and which question it answers.
2. Draw two or three directions of the same screen that a person tells apart at a glance; variants of one idea are one direction. An existing screen starts from the real front running locally (mocked API, real shell, real content), even in exploration. For a screen with no precedent, a Design artifact may hold them in a Claude session; in Codex or Antigravity, build them in the front. Stitch (`stitch` MCP, bound to the product's `DESIGN.md` when the repository names one) is available when the user asks for it: it draws a look, invents features, and never the real navigation, so name what it invented.
3. Deliver as in step 1: images in the chat, one line per direction, one question.
4. The chosen direction goes through the faithful concept before any code.

**Complete when:** the user chose a direction and it has a faithful version on a branch.

## The approved design is the spec

Other skills call this the approved-artboards rule. Once the user approved an image, the build matches it: open both at the same viewport, state and theme, and compare composition, control widths and heights, borders, type and badges. Every difference is fixed, or named to the user as a deliberate change. A review finding that would remove an approved element goes to the user, and the element stays until they answer.

## After a verdict

Record it as `design-direction` describes.
