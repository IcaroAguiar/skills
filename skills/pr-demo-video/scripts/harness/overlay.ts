import type { Locator, Page } from '@playwright/test';

/**
 * Runs in the page before any app script: masks e-mail addresses (text and
 * accessible names) and adds the caption element the scenes write to.
 * `extraMasks` are regex sources for other personal data (CPF, phone…).
 */
export function overlayInitScript(extraMasks: string[]) {
  const patterns = [
    /[^\s<>"'()]+@[^\s<>"'()]+\.[a-z]{2,}/gi,
    ...extraMasks.map((source) => new RegExp(source, 'g')),
  ];
  const mask = (value: string) =>
    patterns.reduce((text, re) => text.replace(re, '•••••'), value);
  const maskNode = (node: Node) => {
    const text = node.textContent ?? '';
    const masked = mask(text);
    // Conditional writes keep the observer from triggering itself forever.
    if (masked !== text) node.textContent = masked;
  };
  const maskText = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) maskNode(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) maskNode(node);
  };
  const maskElement = (el: Element) => {
    for (const name of ['aria-label', 'title', 'placeholder']) {
      const value = el.getAttribute(name);
      if (!value) continue;
      const masked = mask(value);
      if (masked !== value) el.setAttribute(name, masked);
    }
    if (el instanceof HTMLInputElement &&
        (el.type === 'email' || el.autocomplete === 'email' || el.name === 'email')) {
      if (el.style.getPropertyValue('-webkit-text-security') !== 'disc') {
        el.style.setProperty('-webkit-text-security', 'disc');
      }
    }
  };
  const maskAttributes = (root: Node) => {
    if (root instanceof Element) maskElement(root);
    if (root instanceof Element || root instanceof Document) {
      for (const el of root.querySelectorAll('[aria-label],[title],[placeholder],input')) maskElement(el);
    }
  };
  const start = () => {
    maskText(document.body);
    maskAttributes(document);
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') maskText(m.target);
        if (m.type === 'attributes') maskAttributes(m.target);
        for (const node of m.addedNodes) {
          maskText(node);
          maskAttributes(node);
        }
      }
    }).observe(document.body, {
      characterData: true, childList: true, subtree: true, attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder', 'value', 'type', 'autocomplete', 'name'],
    });
    const cap = document.createElement('div');
    cap.id = '__demo_caption';
    cap.setAttribute('aria-hidden', 'true');
    cap.style.cssText =
      'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:rgba(16,24,29,.94);color:#fff;font:600 19px Inter,system-ui,sans-serif;padding:12px 22px;border-radius:12px;z-index:2147483647;pointer-events:none;max-width:86vw;text-align:center;line-height:1.35;box-shadow:0 6px 24px rgba(0,0,0,.25);display:none';
    document.body.appendChild(cap);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
}

export async function setCaption(page: Page, text: string) {
  await page
    .evaluate((value) => {
      const el = document.getElementById('__demo_caption');
      if (!el) return;
      el.textContent = value;
      el.style.display = value ? 'block' : 'none';
    }, text)
    .catch(() => undefined);
}

export async function outline(target: Locator, ms: number) {
  await target
    .first()
    .evaluate((el, duration) => {
      const h = el as HTMLElement;
      const previous = [h.style.outline, h.style.outlineOffset];
      h.style.outline = '3px solid #10967f';
      h.style.outlineOffset = '4px';
      setTimeout(() => {
        [h.style.outline, h.style.outlineOffset] = previous;
      }, duration);
    }, ms)
    .catch(() => undefined);
}
