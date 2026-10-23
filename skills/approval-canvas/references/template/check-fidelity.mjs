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

function selectorsOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  let depth = 0;
  let buffer = '';
  for (const char of text) {
    if (char === '{') {
      const head = buffer.trim();
      if (!head.startsWith('@')) {
        for (const selector of head.split(',')) found.push(selector.trim().replace(/\s+/g, ' '));
      }
      depth += 1;
      buffer = '';
    } else if (char === '}') {
      depth -= 1;
      buffer = '';
    } else if (char === ';' && depth === 0) {
      buffer = '';
    } else {
      buffer += char;
    }
  }
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
for (const selector of selectorsOf(css)) {
  if (!FRAME_SELECTORS.has(selector)) {
    problems.push(`src/canvas.css: "${selector}" muda a aparência fora da moldura do canvas`);
  }
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
