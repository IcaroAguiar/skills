// Approval canvas: renders the proposal with the REAL design-system components.
// Required env: UI_ROOT = checkout of the up-to-date main with dependencies installed.
// Optional env: WEB_APP (app whose node_modules provide vite/react/tailwind; default apps/web),
//               OUT (build dir; default out).
// Adjust UI_PKG / UI_SRC / CONTRACTS to the repository's package names.
// Build: node $UI_ROOT/$WEB_APP/node_modules/vite/bin/vite.js build -c vite.config.mjs
import { fileURLToPath } from 'node:url';

const UI_PKG = '@acme/ui'; // design-system package name
const UI_SRC = 'packages/ui/src'; // its source folder (index.ts + styles.css)
const CONTRACTS = { pkg: '@acme/contracts', src: 'packages/contracts/src/index.ts' }; // set to null if unused

if (!process.env.UI_ROOT) throw new Error('Set UI_ROOT to an up-to-date checkout with dependencies installed.');
const here = fileURLToPath(new URL('.', import.meta.url));
const root = `${process.env.UI_ROOT.replace(/\/$/, '')}/`;
const web = `${root}${process.env.WEB_APP ?? 'apps/web'}/node_modules/`;
const esc = (s) => s.replace(/[/@.]/g, (c) => `\\${c}`);

const { default: react } = await import(`${web}@vitejs/plugin-react/dist/index.js`);
const { default: tailwindcss } = await import(`${web}@tailwindcss/vite/dist/index.mjs`);

export default {
  root: here,
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: new RegExp(`^${esc(UI_PKG)}/styles\\.css$`), replacement: `${root}${UI_SRC}/styles.css` },
      { find: new RegExp(`^${esc(UI_PKG)}$`), replacement: `${root}${UI_SRC}/index.ts` },
      ...(CONTRACTS ? [{ find: new RegExp(`^${esc(CONTRACTS.pkg)}$`), replacement: `${root}${CONTRACTS.src}` }] : []),
      { find: /^@phosphor-icons\/react$/, replacement: `${web}@phosphor-icons/react` },
      { find: /^react$/, replacement: `${web}react` },
      { find: /^react-dom$/, replacement: `${web}react-dom` },
      { find: /^react-dom\/client$/, replacement: `${web}react-dom/client.js` },
      { find: /^react\/jsx-runtime$/, replacement: `${web}react/jsx-runtime.js` },
      { find: /^react\/jsx-dev-runtime$/, replacement: `${web}react/jsx-dev-runtime.js` },
      { find: /^sonner$/, replacement: `${web}sonner` },
    ],
    dedupe: ['react', 'react-dom'],
  },
  build: { outDir: process.env.OUT ?? 'out', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
};
