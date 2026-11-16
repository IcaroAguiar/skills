import type { Page } from '@playwright/test';

/**
 * Mechanical form check for qa-crew: counts what a form asks for and types
 * what people really type into every visible field, without submitting.
 * It works on whatever is on screen now, so a scene can open a dialog first.
 * Candidates only: the orchestrator reproduces before believing one.
 */
export type ProbeField = {
  label: string;
  tag: string;
  type: string;
  required: boolean;
  /** What the label says the field holds, when it has a fixed shape. */
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

/** Runs in the page: tags each visible field and describes it. */
function describeFields(mark: string): ProbeField[] {
  const shapes: [ProbeField['shape'], RegExp][] = [
    ['cpf', /\bcpf\b/i], ['cnpj', /\bcnpj\b/i], ['cep', /\bcep\b|zip|postal/i],
    ['phone', /telefone|celular|whats|phone|fone\b/i], ['email', /e-?mail/i],
    ['date', /\bdata\b|nascimento|vencimento|\bdate\b/i],
    ['money', /valor|pre[cç]o|sal[aá]rio|custo|price|amount|r\$/i],
    ['number', /quantidade|qtd|n[uú]mero|prioridade|idade|peso|altura|percentual|%|\bordem\b|number|count/i],
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

/** Runs in the page: the value a field kept and any error it shows. */
function readField(selector: string): { value: string; invalid: boolean; error: string } {
  const node = document.querySelector<HTMLInputElement>(selector);
  if (!node) return { value: '', invalid: false, error: '' };
  const ids = `${node.getAttribute('aria-describedby') || ''} ${node.getAttribute('aria-errormessage') || ''}`.split(/\s+/).filter(Boolean);
  const described = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
  const group = node.closest('[data-slot="form-item"], .form-item, .field, fieldset, label, div');
  const alert = group?.querySelector('[role="alert"], [aria-live], [data-slot="form-message"], .error, .invalid-feedback')?.textContent ?? '';
  return {
    value: node.isContentEditable ? node.textContent ?? '' : node.value ?? '',
    invalid: node.getAttribute('aria-invalid') === 'true' || (typeof node.checkValidity === 'function' && !node.checkValidity()),
    error: `${described} ${alert}`.replace(/\s+/g, ' ').trim().slice(0, 160),
  };
}

const NUMERIC = new Set(['number', 'cpf', 'cnpj', 'cep', 'phone', 'money']);
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
  const typable = (field: ProbeField) => field.tag !== 'select' && !['date', 'datetime-local', 'time', 'month', 'week'].includes(field.type);

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
        const said = after.invalid || after.error.length > 0;
        const kept = after.value;
        const short = (text: string) => (text.length > 40 ? `${text.slice(0, 37)}…(${text.length})` : text);
        const add = (kind: string, detail: string) => findings.push({ field: field.label, kind, typed: short(typed), kept: short(kept), detail });
        if (field.shape && NUMERIC.has(field.shape) && /[a-z]/i.test(kept) && !said) {
          add('aceita letras', 'O campo guarda letras e não avisa.');
        } else if (kept === '' && typed.trim() !== '' && !said && !lettersOnly) {
          add('apaga sem avisar', 'O que foi digitado some e nenhuma mensagem explica por quê.');
        } else if (kept !== typed && kept !== typed.trim() && kept.replace(/\D/g, '') !== typed.replace(/\D/g, '') && !said) {
          add('muda o valor em silêncio', 'O valor guardado é outro número ou texto, sem aviso.');
        } else if (said && after.error.length === 0) {
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
      // Leave the screen as it was, so the scene can go on.
      await target.fill(before.value, { timeout: 2000 }).catch(() => undefined);
      await target.blur({ timeout: 2000 }).catch(() => undefined);
    }
  }

  const formatted = (field: ProbeField) => field.shape !== null && !['number', 'email'].includes(field.shape);
  const numericKeyboard = (field: ProbeField) => ['number', 'tel'].includes(field.type) || /numeric|decimal|tel/.test(field.inputMode);
  const freeText = (field: ProbeField) => field.shape === null && field.tag !== 'select';
  const count = (test: (field: ProbeField) => boolean) => fields.filter(test).length;
  const ruler = {
    fieldsShown: fields.length,
    required: count((field) => field.required),
    withoutLabel: count((field) => field.label.startsWith('(sem rótulo)')),
    fixedFormatWithoutMaskOrExample: count((field) => formatted(field) && !field.hasExample && typable(field)),
    wrongKeyboard: count((field) => field.shape !== null && NUMERIC.has(field.shape) && !numericKeyboard(field))
      + count((field) => field.shape === 'email' && field.type !== 'email' && field.inputMode !== 'email'),
    freeTextWithoutLimit: count((field) => freeText(field) && field.maxLength === null),
    personalDataWithoutAutocomplete: count((field) => PERSONAL.test(field.label) && !field.autocomplete),
  };
  await page.evaluate((mark) => document.querySelectorAll(`[${mark}]`).forEach((node) => node.removeAttribute(mark)), MARK);
  return { url: page.url().split('?')[0], ruler, fields, findings };
}
