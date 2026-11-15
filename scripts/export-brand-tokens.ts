/**
 * Writes brand/brand.tokens.json, brand/brand.tokens.css and brand/fonts.manifest.json from src/brandTokens.ts.
 * Run: npm run brand:export. Verify without writing: npm run brand:check (exits 1 when a file is out of date).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokenFile, canonicalJson, renderCss, outOfDate, renderFontsManifest } from '../src/brandExport';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'brand');
const check = process.argv.includes('--check');

const file = buildTokenFile();
const outputs: Record<string, string> = {
  'brand.tokens.json': canonicalJson(file),
  'brand.tokens.css': renderCss(file),
  'fonts.manifest.json': renderFontsManifest(),
};

const say = (s: string): void => {
  process.stdout.write(`${s}\n`);
};

if (check) {
  const differing = Object.entries(outputs)
    .filter(([name, content]) => {
      const p = join(outDir, name);
      return outOfDate(existsSync(p) ? readFileSync(p, 'utf8') : undefined, content);
    })
    .map(([name]) => name);
  if (differing.length > 0) {
    for (const name of differing) say(`differs: brand/${name}`);
    say('Brand tokens are out of date. Run: npm run brand:export');
    process.exit(1);
  }
  say('Brand tokens are up to date.');
} else {
  mkdirSync(outDir, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    writeFileSync(join(outDir, name), content, { encoding: 'utf8' });
    say(`wrote brand/${name}`);
  }
}
