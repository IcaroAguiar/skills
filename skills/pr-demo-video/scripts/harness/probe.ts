import type { Page } from '@playwright/test';

// qa-crew form check on whatever is on screen now. It never submits; findings are candidates to reproduce.
export type ProbeField = {
  label: string;
  tag: string;
  type: string;
  required: boolean;
  shape: 'number' | 'cpf' | 'cnpj' | 'cep' | 'phone' | 'email' | 'date' | 'money' | null;
  inputMode: string;
  maxLength: number | null;
  hasExample: boolean;
  autocomplete: string;
};

export type ProbeFinding = { field: string; kind: string; typed?: string; kept?: string; detail: string };

export type ProbeResult = {
  url: string;
  ruler: {
    fieldsShown: number;
    required: number;
    withoutLabel: number;
    fixedFormatWithoutMaskOrExample: number;
    wrongKeyboard: number;
    freeTextWithoutLimit: number;
    personalDataWithoutAutocomplete: number;
  };
  fields: ProbeField[];
  findings: ProbeFinding[];
};

const MARK = 'data-qa-probe';

function describeFields(mark: string): ProbeField[] {
  const word = (terms: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms})(?![\\p{L}\\p{N}])`, 'iu');
  const shapes: [ProbeField['shape'], RegExp][] = [
    ['cpf', word('cpf')], ['cnpj', word('cnpj')], ['cep', word('cep|zip|postal code')],
    ['phone', word('telefone|celular|whatsapp|phone|fone')], ['email', word('e-?mail')],
    ['date', word('data|nascimento|vencimento|date')],
    ['money', word('valor|pre[cç]o|sal[aá]rio|custo|price|amount')],
    ['number', word('quantidade|qtd|n[uú]mero|prioridade|idade|peso|altura|percentual|ordem|number|count')],
  ];
  const skip = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio', 'file', 'range', 'color', 'password']);
  const out: ProbeField[] = [];
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('input, textarea, select, [contenteditable="true"]'));
  for (const node of nodes) {
    const input = node as HTMLInputElement;
    const type = (node.getAttribute('type') || (node.tagName === 'INPUT' ? 'text' : '')).toLowerCase();
    if (node.tagName === 'INPUT' && skip.has(type)) continue;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    if (box.width < 2 || box.height < 2 || style.visibility === 'hidden' || style.display === 'none') continue;
    if (input.disabled || input.readOnly || node.closest('[aria-hidden="true"], [inert]')) continue;
    const byId = node.id ? document.querySelector(`label[for="${CSS.escape(node.id)}"]`) : null;
    const labelledBy = (node.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    const real = (node.getAttribute('aria-label') || labelledBy || byId?.textContent || node.closest('label')?.textContent || '')
      .replace(/\s+/g, ' ').trim();
    const placeholder = node.getAttribute('placeholder') || '';
    const hint = `${real} ${placeholder} ${node.getAttribute('name') || ''}`;
    const describedBy = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    node.setAttribute(mark, String(out.length));
    out.push({
      label: (real || `(sem rótulo) ${placeholder || node.getAttribute('name') || node.tagName.toLowerCase()}`).slice(0, 80),
      tag: node.tagName.toLowerCase(),
      type,
      required: input.required || node.getAttribute('aria-required') === 'true',
      shape: type === 'number' ? 'number' : shapes.find(([, pattern]) => pattern.test(hint))?.[0] ?? null,
      inputMode: node.getAttribute('inputmode') || '',
      maxLength: input.maxLength > 0 ? input.maxLength : null,
      hasExample: /\d/.test(`${placeholder} ${describedBy}`) || /_|dd\/|mm\//i.test(placeholder),
      autocomplete: node.getAttribute('autocomplete') || '',
    });
  }
  return out;
}

function readField(selector: string): { value: string; invalid: boolean; alert: string; described: string } {
  const node = document.querySelector<HTMLInputElement>(selector);
  if (!node) return { value: '', invalid: false, alert: '', described: '' };
  const text = (attribute: string) => (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim();
  const group = node.closest('[data-slot="form-item"], .form-item, .field, fieldset, label, div');
  const alert = group?.querySelector('[role="alert"], [aria-live], [data-slot="form-message"], .error, .invalid-feedback')?.textContent ?? '';
  return {
    value: node.value ?? '',
    invalid: node.getAttribute('aria-invalid') === 'true' || (typeof node.checkValidity === 'function' && !node.checkValidity()),
    alert: `${text('aria-errormessage')} ${alert}`.replace(/\s+/g, ' ').trim().slice(0, 160),
    described: text('aria-describedby').slice(0, 160),
  };
}

const NUMERIC = new Set(['number', 'cpf', 'cnpj', 'cep', 'phone', 'money']);
const IDENTIFIER = new Set(['cpf', 'cnpj', 'cep', 'phone']);

/** "1.234,56", "1,5" and "1.5" as numbers; NaN when the text is not one. */
function amount(text: string): number {
  const plain = text.replace(/[\sR$]/g, '');
  if (!/^-?[\d.,]+$/.test(plain) || plain.replace(/\D/g, '').length > 15) return NaN;
  const decimal = Math.max(plain.lastIndexOf(','), plain.lastIndexOf('.'));
  const whole = decimal < 0 ? plain : plain.slice(0, decimal).replace(/[.,]/g, '');
  return Number(decimal < 0 ? whole : `${whole}.${plain.slice(decimal + 1)}`);
}
const PERSONAL = /nome|name|e-?mail|telefone|celular|phone|endere[cç]o|address|cep|cidade|city/i;

function samples(field: ProbeField): string[] {
  const long = 'a'.repeat(300);
  switch (field.shape) {
    case 'number': return ['abc', '1,5', '1.5', '-1', '99999999999999999999'];
    case 'money': return ['abc', '1.234,56', '1,5', '-10'];
    case 'cpf': return ['123.456.789-09', '12345678909', 'abc'];
    case 'cnpj': return ['12.345.678/0001-95', 'abc'];
    case 'cep': return ['69060-001', '69060001', 'abc'];
    case 'phone': return ['(92) 99999-0000', '+55 92 99999 0000', 'abc'];
    case 'email': return ['nome@exemplo', ' nome@exemplo.com ', 'NOME@EXEMPLO.COM'];
    case 'date': return ['31/02/2025', '1/1/25', 'abc'];
    default: return ['   ', "João D'Ávila 😀", long];
  }
}

export async function probeForms(page: Page): Promise<ProbeResult> {
  const fields = await page.evaluate(describeFields, MARK);
  const findings: ProbeFinding[] = [];
  const typable = (field: ProbeField) => ['input', 'textarea'].includes(field.tag) && !['date', 'datetime-local', 'time', 'month', 'week'].includes(field.type);

  for (const [index, field] of fields.entries()) {
    if (!typable(field)) continue;
    const selector = `[${MARK}="${index}"]`;
    const target = page.locator(selector);
    const before = await page.evaluate(readField, selector);
    try {
      for (const typed of samples(field)) {
        // A numbers-only field that drops letters is doing its job, not hiding anything.
        const lettersOnly = field.shape !== null && NUMERIC.has(field.shape) && !/\d/.test(typed);
        await target.fill('', { timeout: 2000 }).catch(() => target.press('ControlOrMeta+a', { timeout: 2000 }));
        await target.pressSequentially(typed, { timeout: 5000 });
        await target.blur({ timeout: 2000 });
        const after = await page.evaluate(readField, selector);
        // Help text is there before any typing; only what appears or changes is feedback.
        const message = after.alert || (after.described !== before.described ? after.described : '');
        const said = after.invalid || message.length > 0;
        const kept = after.value;
        const cutAtLimit = field.shape === null && field.maxLength !== null && kept === typed.slice(0, field.maxLength);
        const short = (text: string) => (text.length > 40 ? `${text.slice(0, 37)}…(${text.length})` : text);
        const add = (kind: string, detail: string) => findings.push({ field: field.label, kind, typed: short(typed), kept: short(kept), detail });
        if (field.shape && NUMERIC.has(field.shape) && /[a-z]/i.test(kept) && !said) {
          add('aceita letras', 'O campo guarda letras e não avisa.');
        } else if (kept === '' && typed.trim() !== '' && !said && !lettersOnly) {
          add('apaga sem avisar', 'O que foi digitado some e nenhuma mensagem explica por quê.');
        } else if (kept !== typed && kept !== typed.trim() && !said && !lettersOnly && !cutAtLimit && !(
          field.shape && IDENTIFIER.has(field.shape) ? kept.replace(/\D/g, '') === typed.replace(/\D/g, '')
            : field.shape && NUMERIC.has(field.shape) && amount(kept) === amount(typed))) {
          add('muda o valor em silêncio', 'O valor guardado é outro número ou texto, sem aviso.');
        } else if (said && message.length === 0) {
          add('erro sem mensagem', 'O campo fica marcado como inválido e não diz como corrigir.');
        } else if (typed.length >= 300 && kept.length >= 300 && field.maxLength === null) {
          add('sem limite', 'Aceita 300 caracteres sem limite nem contador.');
        } else if (typed.trim() === '' && field.required && !said) {
          add('obrigatório aceita só espaços', 'Campo obrigatório preenchido só com espaços não é recusado ao sair dele.');
        }
      }
    } catch (error) {
      findings.push({ field: field.label, kind: 'não testado', detail: `O campo não aceitou digitação automática: ${String(error).split('\n')[0].slice(0, 120)}` });
    } finally {
      await target.fill(before.value, { timeout: 2000 }).catch(() => undefined);
      await target.blur({ timeout: 2000 }).catch(() => undefined);
    }
  }

  const formatted = (field: ProbeField) => field.shape !== null && !['number', 'email'].includes(field.shape);
  const numericKeyboard = (field: ProbeField) => ['number', 'tel'].includes(field.type) || /numeric|decimal|tel/.test(field.inputMode);
  const freeText = (field: ProbeField) => field.shape === null && typable(field);
  const count = (test: (field: ProbeField) => boolean) => fields.filter(test).length;
  const ruler = {
    fieldsShown: fields.length,
    required: count((field) => field.required),
    withoutLabel: count((field) => field.label.startsWith('(sem rótulo)')),
    fixedFormatWithoutMaskOrExample: count((field) => formatted(field) && !field.hasExample && typable(field)),
    wrongKeyboard: count((field) => typable(field) && field.shape !== null && NUMERIC.has(field.shape) && !numericKeyboard(field))
      + count((field) => typable(field) && field.shape === 'email' && field.type !== 'email' && field.inputMode !== 'email'),
    freeTextWithoutLimit: count((field) => freeText(field) && field.maxLength === null),
    personalDataWithoutAutocomplete: count((field) => PERSONAL.test(field.label) && !field.autocomplete),
  };
  await page.evaluate((mark) => document.querySelectorAll(`[${mark}]`).forEach((node) => node.removeAttribute(mark)), MARK);
  return { url: page.url().split('?')[0], ruler, fields, findings };
}
