import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor');
fs.mkdirSync(vendor, { recursive: true });

await build({
  stdin: {
    contents: "import { createClient } from '@supabase/supabase-js'; globalThis.supabase = { createClient };",
    resolveDir: root,
    sourcefile: 'supabase-browser-entry.js',
  },
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: path.join(vendor, 'supabase-browser.js'),
  legalComments: 'inline',
});

await build({
  stdin: {
    contents: "export { EditorView, basicSetup } from 'codemirror'; export { python } from '@codemirror/lang-python'; export { oneDark } from '@codemirror/theme-one-dark';",
    resolveDir: root,
    sourcefile: 'codemirror-entry.js',
  },
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  outfile: path.join(root, 'Chemistry/codemirror.bundle.js'),
  legalComments: 'inline',
});

fs.copyFileSync(path.join(root, 'node_modules/blockly/blockly.min.js'), path.join(vendor, 'blockly.min.js'));
const tailwind = spawnSync(process.execPath, [
  path.join(root, 'node_modules/@tailwindcss/cli/dist/index.mjs'),
  '-i', path.join(root, 'css/tailwind-input.css'),
  '-o', path.join(vendor, 'submarine-tailwind.css'),
  '--minify',
], { cwd: root, stdio: 'inherit' });
if (tailwind.status !== 0) throw new Error('Tailwind CSS build failed.');
