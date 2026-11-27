#!/usr/bin/env node
/**
 * Comprehensive DOM & visual craft auditor for UI QA (exploratory-qa).
 *
 * Goes beyond page scrollWidth to catch fine-grained UI defects automatically:
 *   1. Geometry & borders: page-overflow, container-overflow, padding-breach, sibling-overlap
 *   2. Wrapping & clipping: button/badge unintended wrap, silent horizontal text clipping
 *   3. Contrast (WCAG AA): real foreground vs effective background luminance ratio
 *   4. Mobile ergonomics: <=430px inputs <16px font (iOS zoom) or <44px height
 *   5. 1:1 zoom crops: optional --crop-dir saves full-res crops of key regions & violations
 *
 * Usage (run from a directory where `playwright` is resolvable):
 *   node ui_audit.mjs --url http://localhost:3000/orders \
 *     --viewports 2560x1080,1920x1080,1440x900,1024x800,390x844 \
 *     --action-file /tmp/setup.mjs \
 *     --crop-dir /tmp/ui-crops
 */

import { createRequire } from "node:module"
import { mkdirSync } from "node:fs"
import { pathToFileURL } from "node:url"
import path from "node:path"

function parseArgs(argv) {
  const args = {
    url: "",
    viewports: "2560x1080,1920x1080,1440x900,1024x800,390x844",
    actionFile: "",
    cropDir: "",
    paddingTolerancePx: 2,
    checkContrast: true,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = argv[i + 1]
    if (flag === "--url" && next) {
      args.url = next
      i += 1
    } else if (flag === "--viewports" && next) {
      args.viewports = next
      i += 1
    } else if (flag === "--action-file" && next) {
      args.actionFile = next
      i += 1
    } else if ((flag === "--crop-dir" || flag === "--screenshot-dir") && next) {
      args.cropDir = next
      i += 1
    } else if (flag === "--padding-tolerance" && next) {
      args.paddingTolerancePx = Number(next)
      i += 1
    } else if (flag === "--no-contrast") {
      args.checkContrast = false
    }
  }
  if (!args.url) {
    console.error(
      "Usage: ui_audit.mjs --url <url> [--viewports 2560x1080,1920x1080,1440x900,1024x800,390x844] [--action-file <file>] [--crop-dir <dir>]",
    )
    process.exit(2)
  }
  return args
}

function loadPlaywright() {
  const req = createRequire(path.join(process.cwd(), "package.json"))
  try {
    return req("playwright")
  } catch {
    // Repositories that only install the test runner still ship the same `chromium` export.
    return req("@playwright/test")
  }
}

async function auditViewport(page, viewport, options) {
  return page.evaluate(
    ({ width, tolerance, checkContrast }) => {
      const violations = []

      const describe = (el) => {
        const tag = el.tagName.toLowerCase()
        const slot = el.getAttribute("data-slot")
        const aria = el.getAttribute("aria-label")
        const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48)
        return `${tag}${slot ? `[data-slot="${slot}"]` : ""}${aria ? `(${aria})` : text ? ` "${text}"` : ""}`
      }

      const isVisible = (el) => {
        const style = getComputedStyle(el)
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
          return false
        }
        const rect = el.getBoundingClientRect()
        return rect.width > 0.5 && rect.height > 0.5
      }

      const parseRgba = (raw) => {
        const m = raw.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/)
        if (!m) return null
        return {
          r: Number(m[1]),
          g: Number(m[2]),
          b: Number(m[3]),
          a: m[4] === undefined ? 1 : Number(m[4]),
        }
      }

      const blend = (fg, bg) => {
        const a = fg.a
        return {
          r: fg.r * a + bg.r * (1 - a),
          g: fg.g * a + bg.g * (1 - a),
          b: fg.b * a + bg.b * (1 - a),
          a: 1,
        }
      }

      const effectiveBg = (el) => {
        const chain = []
        let cur = el
        while (cur && cur !== document.documentElement) {
          const parsed = parseRgba(getComputedStyle(cur).backgroundColor)
          if (parsed && parsed.a > 0) chain.push(parsed)
          if (parsed && parsed.a >= 0.99) break
          cur = cur.parentElement
        }
        let acc = { r: 255, g: 255, b: 255, a: 1 }
        for (let i = chain.length - 1; i >= 0; i -= 1) {
          acc = blend(chain[i], acc)
        }
        return acc
      }

      const relLum = ({ r, g, b }) => {
        const lin = [r, g, b].map((c) => {
          const s = c / 255
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
      }

      const contrastRatio = (c1, c2) => {
        const l1 = relLum(c1)
        const l2 = relLum(c2)
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      }

      // 1. Page horizontal overflow
      if (document.documentElement.scrollWidth > window.innerWidth + 1) {
        violations.push({
          kind: "page-overflow",
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        })
      }

      // 1a. Wide-screen dead space: on large screens the page content must not sit in a narrow
      // column leaving the right side empty while neighbouring screens fill the width
      // (for example, pages capped at 1200 px left half of a 1920 px screen empty).
      if (width >= 1600) {
        const main = document.querySelector("main, [role=main]") || document.body
        const mr = main.getBoundingClientRect()
        let left = Infinity
        let right = -Infinity
        for (const el of main.querySelectorAll("*")) {
          const r = el.getBoundingClientRect()
          if (r.width < 1 || r.height < 1 || r.top > window.innerHeight * 2) continue
          const cs = getComputedStyle(el)
          if (cs.visibility === "hidden" || cs.position === "fixed") continue
          // Site chrome (footer) and full-width rules are not content: a footer border spanning
          // the column hid a 720 px form on a 1920 px screen (a real case).
          if (el.closest("footer, [role=contentinfo]")) continue
          const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
          if (!hasText && r.width >= 0.9 * (document.documentElement.clientWidth - mr.left)) continue
          const paints =
            (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) ||
            ["IMG", "SVG", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "VIDEO", "CANVAS"].includes(el.tagName.toUpperCase()) ||
            (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && r.width < mr.width - 2) ||
            cs.borderTopWidth !== "0px"
          if (!paints) continue
          left = Math.min(left, r.left)
          right = Math.max(right, r.right)
        }
        if (right > left) {
          // A capped <main> is itself narrow, so measure the right gap against the viewport edge.
          const leftGap = left - mr.left
          const rightGap = document.documentElement.clientWidth - right
          const columnWidth = document.documentElement.clientWidth - mr.left
          if (rightGap > leftGap + Math.max(160, 0.15 * columnWidth)) {
            violations.push({
              kind: "wide-dead-space",
              columnWidth: Math.round(columnWidth),
              contentLeftGap: Math.round(leftGap),
              contentRightGap: Math.round(rightGap),
              hint: "content sits in a narrow column; compare with a neighbouring screen at this width",
            })
          }
        }
      }

      // 1b. Table cell vertical balance: content must sit centred in its row, not glued to the top
      // (for example, rows showed text at the top with a large gap below).
      const contentBox = (cell) => {
        let top = Infinity
        let bottom = -Infinity
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
        let node = walker.nextNode()
        while (node) {
          let r = null
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
            const range = document.createRange()
            range.selectNodeContents(node)
            r = range.getBoundingClientRect()
          } else if (node.nodeType === Node.ELEMENT_NODE && /^(SVG|IMG|INPUT|BUTTON|CANVAS)$/i.test(node.tagName)) {
            r = node.getBoundingClientRect()
          }
          if (r && r.height > 0) {
            top = Math.min(top, r.top)
            bottom = Math.max(bottom, r.bottom)
          }
          node = walker.nextNode()
        }
        return top === Infinity ? null : { top, bottom }
      }
      const reportedColumns = new Set()
      const rows = [...document.querySelectorAll('tbody tr, [role="row"]')].filter(isVisible).slice(0, 4)
      for (const row of rows) {
        const cells = [...row.querySelectorAll(':scope > td, :scope > [role="cell"], :scope > [role="gridcell"]')]
        cells.forEach((cell, index) => {
          if (reportedColumns.has(index) || !isVisible(cell)) return
          const cellRect = cell.getBoundingClientRect()
          const box = contentBox(cell)
          if (!box || cellRect.height < 28) return
          const gapTop = box.top - cellRect.top
          const gapBottom = cellRect.bottom - box.bottom
          if (Math.abs(gapTop - gapBottom) > Math.max(6, cellRect.height * 0.2)) {
            reportedColumns.add(index)
            violations.push({
              kind: "table-cell-valign",
              element: describe(cell),
              column: index,
              gapTop: Math.round(gapTop),
              gapBottom: Math.round(gapBottom),
            })
          }
        })
      }

      const targets = [
        ...document.querySelectorAll(
          'button, a, input, select, textarea, [data-slot="badge"], [role="status"], [role="alert"]',
        ),
      ].filter(isVisible)

      for (const el of targets) {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)

        // 4. Mobile input typography & touch height
        if (
          width <= 430 &&
          (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")
        ) {
          const fontSize = parseFloat(style.fontSize)
          if (fontSize < 16) {
            violations.push({
              kind: "mobile-input-font",
              element: describe(el),
              fontSize,
              minRequired: 16,
            })
          }
          if (rect.height < 44 - 0.5) {
            violations.push({
              kind: "mobile-touch-height",
              element: describe(el),
              height: Math.round(rect.height * 10) / 10,
              minRequired: 44,
            })
          }
        }

        // 2a. Unintended multi-line wrap inside badges or compact single-line header buttons/links
        const isBadge = el.getAttribute("data-slot") === "badge"
        if (isBadge) {
          const lh = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
          const padV = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
          if (rect.height - padV > lh * 1.8) {
            violations.push({
              kind: "badge-wrap",
              element: describe(el),
              height: Math.round(rect.height * 10) / 10,
            })
          }
        }
        if (
          el.closest("header") &&
          (el.tagName === "BUTTON" || el.tagName === "A") &&
          style.flexDirection !== "column" &&
          rect.height > 4
        ) {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          const lineTops = new Set()
          let textNode = walker.nextNode()
          while (textNode) {
            if (textNode.nodeValue && textNode.nodeValue.trim()) {
              const range = document.createRange()
              range.selectNodeContents(textNode)
              for (const r of range.getClientRects()) {
                if (r.width > 1 && r.height > 1) lineTops.add(Math.round(r.top / 6))
              }
            }
            textNode = walker.nextNode()
          }
          if (lineTops.size > 1) {
            violations.push({
              kind: "button-text-wrap",
              element: describe(el),
              lines: lineTops.size,
              height: Math.round(rect.height * 10) / 10,
            })
          }
        }

        // 2b. Silent horizontal clipping on non-ellipsis interactive controls/badges
        if (
          el.tagName !== "INPUT" &&
          el.tagName !== "TEXTAREA" &&
          el.scrollWidth > el.clientWidth + 2 &&
          style.textOverflow !== "ellipsis" &&
          (style.overflowX === "hidden" || style.overflowX === "clip")
        ) {
          violations.push({
            kind: "text-clipped",
            element: describe(el),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          })
        }

        // 3. Real WCAG AA contrast check on badges, buttons and alerts with visible text
        if (
          checkContrast &&
          (el.tagName === "BUTTON" || isBadge || el.getAttribute("role") === "alert") &&
          (el.textContent || "").trim().length > 0 &&
          !el.hasAttribute("disabled")
        ) {
          const fg = parseRgba(style.color)
          if (fg) {
            const bg = effectiveBg(el)
            const blendedFg = blend(fg, bg)
            const ratio = contrastRatio(blendedFg, bg)
            const fontSize = parseFloat(style.fontSize) || 14
            const fontWeight = Number(style.fontWeight) || 400
            const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)
            const minRatio = isLarge ? 3.0 : 4.5
            if (ratio < minRatio - 0.1) {
              violations.push({
                kind: "low-contrast",
                element: describe(el),
                ratio: Math.round(ratio * 100) / 100,
                minRequired: minRatio,
              })
            }
          }
        }

        // 1b & 1c. Container overflow and inner padding breach
        let ancestor = el.parentElement
        let depth = 0
        while (ancestor && ancestor !== document.body && depth < 8) {
          const aStyle = getComputedStyle(ancestor)
          const aRect = ancestor.getBoundingClientRect()
          const clips =
            aStyle.overflowX === "hidden" ||
            aStyle.overflowX === "clip" ||
            aStyle.overflow === "hidden" ||
            aStyle.overflow === "clip"
          const borderRight = parseFloat(aStyle.borderRightWidth) || 0
          const borderLeft = parseFloat(aStyle.borderLeftWidth) || 0
          const padRight = parseFloat(aStyle.paddingRight) || 0
          const hasBorder = borderRight > 0 || borderLeft > 0

          if (aRect.width > 0 && (clips || hasBorder)) {
            if (rect.right > aRect.right - borderRight + 1) {
              violations.push({
                kind: "container-overflow",
                side: "right",
                element: describe(el),
                container: describe(ancestor),
                overflowPx: Math.round((rect.right - (aRect.right - borderRight)) * 10) / 10,
              })
              break
            }
            if (rect.left < aRect.left + borderLeft - 1) {
              violations.push({
                kind: "container-overflow",
                side: "left",
                element: describe(el),
                container: describe(ancestor),
                overflowPx: Math.round((aRect.left + borderLeft - rect.left) * 10) / 10,
              })
              break
            }
          }

          if (
            aRect.width > 0 &&
            padRight >= 8 &&
            rect.right > aRect.right - borderRight - padRight + tolerance
          ) {
            const remainingEdgePx = Math.round((aRect.right - borderRight - rect.right) * 10) / 10
            violations.push({
              kind: "padding-breach",
              side: "right",
              element: describe(el),
              container: describe(ancestor),
              paddingPx: padRight,
              remainingEdgePx,
            })
            break
          }

          ancestor = ancestor.parentElement
          depth += 1
        }
      }

      // 1d. Direct sibling overlap among visible interactive/badge elements
      const byParent = new Map()
      for (const el of targets) {
        if (!el.parentElement) continue
        const list = byParent.get(el.parentElement) ?? []
        list.push(el)
        byParent.set(el.parentElement, list)
      }
      for (const [parent, siblings] of byParent.entries()) {
        for (let i = 0; i < siblings.length; i += 1) {
          const a = siblings[i].getBoundingClientRect()
          for (let j = i + 1; j < siblings.length; j += 1) {
            const b = siblings[j].getBoundingClientRect()
            const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left)
            const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
            if (overlapW > 2 && overlapH > 2) {
              violations.push({
                kind: "sibling-overlap",
                container: describe(parent),
                first: describe(siblings[i]),
                second: describe(siblings[j]),
                overlapPx: {
                  w: Math.round(overlapW * 10) / 10,
                  h: Math.round(overlapH * 10) / 10,
                },
              })
            }
          }
        }
      }

      // 1e & 1f. Header action row wrapping and action overload
      const maxHeaderActions = width <= 640 ? 2 : 3
      const headers = [...document.querySelectorAll("header")].filter(isVisible)
      for (const header of headers) {
        const actions = [...header.querySelectorAll("button, a")].filter((el) => {
          if (!isVisible(el)) return false
          if (el.closest('nav, [role="tablist"], [role="radiogroup"], [data-slot="toggle-group"]')) return false
          const elStyle = getComputedStyle(el)
          if (elStyle.flexDirection === "column") return false
          const cls = typeof el.className === "string" ? el.className : ""
          if (cls.includes("sr-only")) return false
          const label = (el.getAttribute("aria-label") || el.textContent || "").trim()
          if (/^(voltar|back)\b/i.test(label) && header.firstElementChild?.contains(el)) return false
          if (
            (el.tagName === "A" || (el.tagName === "BUTTON" && cls.includes("truncate"))) &&
            el.getAttribute("data-slot") !== "button" &&
            parseFloat(elStyle.paddingLeft) <= 1 &&
            parseFloat(elStyle.paddingRight) <= 1 &&
            (elStyle.backgroundColor === "rgba(0, 0, 0, 0)" || elStyle.backgroundColor === "transparent") &&
            (parseFloat(elStyle.borderTopWidth) || 0) === 0
          ) {
            return false
          }
          return true
        })
        if (actions.length === 0) continue

        const rowCenters = []
        for (const act of actions) {
          const r = act.getBoundingClientRect()
          const cy = r.top + r.height / 2
          if (!rowCenters.some((c) => Math.abs(c - cy) <= 12)) rowCenters.push(cy)
        }
        if (rowCenters.length > 1) {
          violations.push({
            kind: "header-action-wrap",
            header: describe(header),
            rowCount: rowCenters.length,
            actions: actions.map((a) => describe(a)),
          })
        }
        if (actions.length > maxHeaderActions) {
          violations.push({
            kind: "header-action-overload",
            header: describe(header),
            count: actions.length,
            maxAllowed: maxHeaderActions,
            actions: actions.map((a) => describe(a)),
          })
        }
        const isVisibleCssColor = (raw) => {
          if (!raw || raw === "transparent" || raw === "rgba(0, 0, 0, 0)") return false
          const slash = raw.match(/\/\s*([\d.]+%?)\s*\)$/)
          if (slash) {
            const val = slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1])
            if (val <= 0.05) return false
          }
          const rgba = parseRgba(raw)
          if (rgba && rgba.a <= 0.05) return false
          return true
        }
        const isSolidOrBordered = (el) => {
          const s = getComputedStyle(el)
          const hasBg = isVisibleCssColor(s.backgroundColor)
          const hasBorder =
            (parseFloat(s.borderTopWidth) || 0) > 0 &&
            s.borderTopStyle !== "none" &&
            isVisibleCssColor(s.borderTopColor)
          return hasBg || hasBorder
        }
        const solidOrBorderedButtons = actions.filter(
          (el) => isSolidOrBordered(el) && (el.textContent || "").trim().length > 0,
        )
        const ghostTextButtons = actions.filter((el) => {
          const txt = (el.textContent || "").trim()
          return !isSolidOrBordered(el) && txt.length > 0 && !/^voltar\b/i.test(txt)
        })
        if (solidOrBorderedButtons.length > 0 && ghostTextButtons.length > 0) {
          violations.push({
            kind: "header-mixed-ghost-text",
            header: describe(header),
            ghostButtons: ghostTextButtons.map((a) => describe(a)),
            solidOrBorderedButtons: solidOrBorderedButtons.map((a) => describe(a)),
          })
        }
      }

      // Controls side by side in one row must share one height (a reviewer complained
      // repeatedly about "Adicionar imagens" taller than "Ordenar · Medidas · Mais", then about a
      // 36 px measurement field next to a 32 px button). Fields count as controls; checkboxes,
      // radios and switches do not.
      const rowButtons = [
        ...document.querySelectorAll(
          'button:not([role=switch]):not([role=checkbox]), a[role=button], select, [role=combobox], input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range])',
        ),
      ].filter((el) => {
        const r = el.getBoundingClientRect()
        if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight) return false
        const s = getComputedStyle(el)
        return s.visibility !== "hidden" && s.display !== "none"
      })
      const seen = new Set()
      for (const a of rowButtons) {
        if (seen.has(a)) continue
        const ra = a.getBoundingClientRect()
        const row = [a]
        for (const b of rowButtons) {
          if (b === a || seen.has(b)) continue
          const rb = b.getBoundingClientRect()
          const sameRow = Math.abs(ra.top + ra.height / 2 - (rb.top + rb.height / 2)) <= 4
          const near = row.some((x) => {
            const rx = x.getBoundingClientRect()
            return Math.min(Math.abs(rb.left - rx.right), Math.abs(rx.left - rb.right)) <= 24
          })
          if (sameRow && near) row.push(b)
        }
        if (row.length < 2) continue
        row.forEach((x) => seen.add(x))
        const heights = row.map((x) => Math.round(x.getBoundingClientRect().height))
        if (Math.max(...heights) - Math.min(...heights) > 2)
          violations.push({
            kind: "control-row-mixed-height",
            heights,
            buttons: row.map((x) => describe(x)),
          })
      }

      // Action buttons stacked one above the other, left-aligned, at different widths read as loose
      // leftovers (for example, a short "Sign" button over a much wider "Use another identity").
      // Put them side by side at one size, or make them full width.
      for (const parent of new Set(rowButtons.map((b) => b.parentElement?.parentElement))) {
        if (!parent) continue
        const stacked = rowButtons.filter((b) => parent.contains(b) && b.tagName === "BUTTON")
        for (let i = 0; i < stacked.length; i++) {
          for (let j = i + 1; j < stacked.length; j++) {
            const ra = stacked[i].getBoundingClientRect()
            const rb = stacked[j].getBoundingClientRect()
            const column = Math.abs(ra.left - rb.left) <= 2 && Math.abs(ra.top - rb.top) > ra.height / 2
            const near = Math.abs(rb.top - ra.bottom) <= 24 || Math.abs(ra.top - rb.bottom) <= 24
            const parentWidth = parent.getBoundingClientRect().width
            const full = (r) => r.width >= parentWidth - 2
            if (column && near && Math.abs(ra.width - rb.width) > 8 && !full(ra) && !full(rb))
              violations.push({
                kind: "stacked-actions-mixed-width",
                widths: [Math.round(ra.width), Math.round(rb.width)],
                buttons: [describe(stacked[i]), describe(stacked[j])],
              })
          }
        }
      }

      return violations
    },
    {
      width: viewport.width,
      tolerance: options.paddingTolerancePx,
      checkContrast: options.checkContrast,
    },
  )
}

async function captureCrops(page, cropDir, label) {
  mkdirSync(cropDir, { recursive: true })
  const saved = []
  const full = path.join(cropDir, `full-${label}.png`)
  await page.screenshot({ path: full, fullPage: false })
  saved.push(full)

  const regions = [
    { name: "header", selector: "header" },
    { name: "first-row", selector: "main li" },
  ]
  for (const region of regions) {
    const loc = page.locator(region.selector).first()
    if ((await loc.count()) > 0 && (await loc.isVisible())) {
      const target = path.join(cropDir, `crop-${region.name}-${label}.png`)
      await loc.screenshot({ path: target })
      saved.push(target)
    }
  }
  return saved
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { chromium } = loadPlaywright()
  const viewports = args.viewports.split(",").map((spec) => {
    const [w, h] = spec.trim().split("x").map(Number)
    return { width: w, height: h, label: `${w}x${h}` }
  })

  let actionFn = null
  if (args.actionFile) {
    const mod = await import(pathToFileURL(path.resolve(args.actionFile)).href)
    actionFn = mod.default ?? mod.setup ?? null
  }

  // Bundled Chromium is often not installed on this machine; fall back to the system Chrome.
  const browser = await chromium.launch().catch(() =>
    chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" }),
  )
  const report = { url: args.url, ok: true, results: [] }

  try {
    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await ctx.newPage()
      await page.goto(args.url, { waitUntil: "networkidle" })
      if (actionFn) await actionFn(page, vp)
      const violations = await auditViewport(page, vp, args)
      if (violations.length > 0) report.ok = false
      const crops = args.cropDir ? await captureCrops(page, args.cropDir, vp.label) : []
      report.results.push({ viewport: vp.label, ok: violations.length === 0, violations, crops })
      await ctx.close()
    }
  } finally {
    await browser.close()
  }

  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
