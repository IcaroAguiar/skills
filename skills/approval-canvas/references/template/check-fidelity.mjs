// Garante que o canvas não restiliza o pacote de UI: o que o usuário aprova
// precisa ser o que o produto consegue mostrar com os componentes reais.
// Uso: node check-fidelity.mjs   (sai com 1 e lista o que precisa ir para o pacote de UI)
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

// Seletores da moldura do canvas. Acrescente um só quando ele não muda a
// aparência de nenhum componente real (barra do canvas, altura da casca).
const FRAME_SELECTORS = new Set([
  'body',
  '.canvas-toolbar',
  '.canvas-shell',
  '.canvas-shell main',
  '.canvas-shell > [data-sidebar="inset"]',
]);

// Split only outside strings, comments, escapes, parentheses and attributes.
function splitCss(css, delimiters, grouped = true) {
  const parts = [];
  const groups = [];
  let text = '';
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) throw new Error('CSS inválido: comentário não terminado');
      text += ' ';
      i = end + 1;
    } else if (char === '\\') {
      if (i + 1 === css.length) throw new Error('CSS inválido: escape não terminado');
      text += char + css[++i];
    } else if (char === '"' || char === "'") {
      const quote = char;
      text += char;
      while (++i < css.length && css[i] !== quote) {
        text += css[i];
        if (css[i] === '\\') text += css[++i] ?? '';
      }
      if (i === css.length) throw new Error('CSS inválido: string não terminada');
      text += quote;
    } else if (char === '(' || char === '[') {
      groups.push(char === '(' ? ')' : ']');
      text += char;
    } else if (char === ')' || char === ']') {
      if (groups.pop() !== char) throw new Error('CSS inválido: agrupamento sem abertura');
      text += char;
    } else if ((!grouped || !groups.length) && delimiters.includes(char)) {
      parts.push({ text, delimiter: char });
      text = '';
    } else {
      text += char;
    }
  }
  if (groups.length) throw new Error('CSS inválido: agrupamento não terminado');
  parts.push({ text, delimiter: '' });
  return parts;
}

function selectorsOf(css) {
  const parts = splitCss(css, '{};');
  const found = [];
  let index = 0;
  const unsupported = (head) => { throw new Error(`Sintaxe CSS não suportada: ${head}`); };
  function statement(head, parents) {
    if (!head) return;
    if (head.startsWith('@')) {
      if (!parents && /^@(import|source)\s+/.test(head)) return;
      unsupported(head);
    }
    if (!parents || !/^[\w-]+\s*:/.test(head)) throw new Error(`CSS inválido: ${head}`);
  }
  function resolveSelector(selector, parents) {
    // Each unquoted & refers to the enclosing selector list.
    const nesting = splitCss(selector, '&', false);
    if (nesting.length === 1) return parents ? parents.map((parent) => `${parent} ${selector}`) : [selector];
    if (!parents) throw new Error('CSS inválido: & sem seletor pai');
    let resolved = [''];
    for (const { text, delimiter } of nesting) {
      resolved = resolved.map((prefix) => prefix + text);
      if (delimiter) resolved = resolved.flatMap((prefix) => parents.map((parent) => prefix + parent));
    }
    return resolved;
  }
  function block(parents, nested = false) {
    while (index < parts.length) {
      const { text, delimiter } = parts[index++];
      const head = text.trim();
      if (delimiter === '{') {
        if (/^@media\s+/.test(head)) {
          block(parents, true);
        } else {
          if (head.startsWith('@') || /^--[\w-]+\s*:/.test(head)) unsupported(head);
          const selectors = splitCss(head, ',').flatMap(({ text }) => {
            text = text.trim();
            if (!text) throw new Error('CSS inválido: seletor vazio');
            return resolveSelector(text, parents);
          });
          found.push(...selectors.map((selector) => selector.replace(/\s+/g, ' ').trim()));
          block(selectors, true);
        }
      } else {
        statement(head, parents);
        if (delimiter === '}') {
          if (!nested) throw new Error('CSS inválido: bloco sem abertura');
          return;
        }
      }
    }
    if (nested) throw new Error('CSS inválido: bloco não terminado');
  }
  block(null);
  return found;
}

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
}

const problems = [];
const css = await readFile(`${here}src/canvas.css`, 'utf8');
try {
  for (const selector of selectorsOf(css)) {
    if (!FRAME_SELECTORS.has(selector)) {
      problems.push(`src/canvas.css: "${selector}" muda a aparência fora da moldura do canvas`);
    }
  }
} catch (error) {
  problems.push(`src/canvas.css: ${error.message}`);
}

for (const file of await sourceFiles(`${here}src`)) {
  const source = await readFile(file, 'utf8');
  if (/<style[\s>]/.test(source)) {
    problems.push(`${file.slice(here.length)}: <style> embutido restiliza componentes`);
  }
}

if (problems.length) {
  console.error('O canvas restiliza o pacote de UI. Leve cada item ao pacote de UI ou liste-o');
  console.error('no README em "Mudanças no pacote de UI" e mostre ao usuário antes da aprovação:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log('Fidelidade: o canvas só usa a aparência do pacote de UI.');
