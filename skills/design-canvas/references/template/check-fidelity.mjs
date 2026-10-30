// Garante que toda diferença entre o canvas e o pacote de UI é declarada.
// A proposta é livre: visual, variante ou componente novo podem existir, desde que
// fiquem em src/proposed.css (blocos marcados com /* proposta: Nome */) ou em
// src/proposed/, e que cada nome apareça no README em "Mudanças no pacote de UI".
// Proibido é a diferença escondida: retoque no canvas.css ou <style> embutido.
// Uso: node check-fidelity.mjs   (sai com 1 e lista o que falta declarar)
import { access, readdir, readFile } from 'node:fs/promises';
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
      problems.push(`src/canvas.css: "${selector}" muda a aparência fora da moldura; mova para src/proposed.css sob /* proposta: Nome */`);
    }
  }
} catch (error) {
  problems.push(`src/canvas.css: ${error.message}`);
}

for (const file of await sourceFiles(`${here}src`)) {
  const source = await readFile(file, 'utf8');
  if (/<style[\s>]/.test(source)) {
    problems.push(`${file.slice(here.length)}: <style> embutido é diferença escondida; mova para src/proposed.css`);
  }
}

const exists = (path) => access(path).then(() => true, () => false);
const proposals = [];

// src/proposed.css: visuais novos, cada bloco sob um marcador /* proposta: Nome */.
// A proposta pode usar qualquer CSS válido (@keyframes, @supports, @font-face…);
// aqui só se confere a estrutura e que nada fique fora de um marcador ou escondido
// num @import.
function proposalStructure(source) {
  // Pré-processamento do CSS: CRLF, CR e FF viram uma única quebra de linha.
  const text = source.replace(/\r\n|\r|\f/g, '\n');
  let depth = 0;
  let outside = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) throw new Error('comentário não terminado');
      i = end + 1;
    } else if (char === '\\') {
      // Escape de CSS: \7b (hex, com um espaço opcional) ou \{ (caractere literal).
      // Vale como caractere comum: nunca abre bloco e entra decodificado na checagem.
      const hex = text.slice(i + 1).match(/^[0-9a-fA-F]{1,6}/);
      let decoded;
      if (hex) {
        decoded = String.fromCodePoint(Number.parseInt(hex[0], 16));
        i += hex[0].length;
        if (/\s/.test(text[i + 1] ?? '')) i += 1;
      } else {
        if (i + 1 >= text.length) throw new Error('escape no fim do arquivo');
        decoded = text[++i];
      }
      if (depth === 0) outside += decoded;
    } else if (char === '"' || char === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== char) j += text[j] === '\\' ? 2 : 1;
      if (j >= text.length) throw new Error('string não terminada');
      i = j;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      if (--depth < 0) throw new Error('chave fechada sem abertura');
    } else if (depth === 0) {
      outside += char;
    }
  }
  if (depth !== 0) throw new Error('bloco não terminado');
  return outside;
}

const proposedCss = `${here}src/proposed.css`;
if (await exists(proposedCss)) {
  const text = await readFile(proposedCss, 'utf8');
  const markers = [...text.matchAll(/\/\*\s*proposta:\s*([^*]+?)\s*\*\//g)];
  try {
    proposalStructure(text);
    if (/@import\b/i.test(proposalStructure(text))) {
      problems.push('src/proposed.css: @import esconde estilos sem declarar; escreva a proposta aqui, sob o marcador');
    }
    const beforeFirst = markers.length ? text.slice(0, markers[0].index) : text;
    if (proposalStructure(beforeFirst).trim()) {
      problems.push('src/proposed.css: regra antes do primeiro /* proposta: Nome */; marque cada bloco com o nome da proposta');
    }
  } catch (error) {
    problems.push(`src/proposed.css: CSS inválido: ${error.message}`);
  }
  proposals.push(...markers.map((marker) => marker[1].trim()));
}

// src/proposed/: componentes e variantes novos; o nome do arquivo é o nome da proposta.
const proposedDir = `${here}src/proposed`;
if (await exists(proposedDir)) {
  for (const entry of await readdir(proposedDir)) {
    const match = entry.match(/^(.+)\.(tsx|ts)$/);
    if (match) proposals.push(match[1]);
  }
}

if (proposals.length) {
  const readmePath = `${here}README.md`;
  const readme = (await exists(readmePath)) ? await readFile(readmePath, 'utf8') : '';
  // Só a primeira coluna da tabela sob o título exato conta, com o nome inteiro.
  const heading = readme.match(/^## Mudanças no pacote de UI[ \t]*$/m);
  const section = heading ? readme.slice(heading.index + heading[0].length).split(/^## /m)[0] : '';
  const rows = section.split('\n').filter((line) => line.trim().startsWith('|'));
  const listed = new Set(
    rows
      .slice(2)
      .map((line) => line.trim().replace(/^\|/, '').split('|')[0].trim()),
  );
  for (const name of proposals) {
    if (!listed.has(name)) {
      problems.push(`proposta "${name}" não está no README em "Mudanças no pacote de UI"`);
    }
  }
}

if (problems.length) {
  console.error('O canvas tem diferenças em relação ao pacote de UI que não estão declaradas.');
  console.error('Proponha à vontade, mas em src/proposed.css ou src/proposed/, e liste cada');
  console.error('proposta no README em "Mudanças no pacote de UI" para o usuário aprovar:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(
  proposals.length
    ? `Fidelidade: ${proposals.length} proposta(s) declarada(s) (${proposals.join(', ')}); o resto usa o pacote de UI.`
    : 'Fidelidade: o canvas usa só a aparência do pacote de UI.',
);
