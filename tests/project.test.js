// Project rules from docs/BUILD_BRIEF.md section 3, checked mechanically where that is possible.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const NEXT = join(ROOT, 'next');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const short = (file) => relative(ROOT, file);

function filesUnder(dir, extensions) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path, extensions));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) found.push(path);
  }
  return found;
}

const nextCode = filesUnder(NEXT, ['.js', '.html', '.css', '.webmanifest']);
const nextScripts = filesUnder(join(NEXT, 'app'), ['.js']);

test('rule 1: classic.html is byte-identical to the original index.html', () => {
  const hash = createHash('sha256').update(readFileSync(join(ROOT, 'classic.html'))).digest('hex');
  assert.equal(hash, 'bdce8113a263defba5a1ed24e995cb76949eda282aa690f3b777c7fad9409e66');
});

test('rule 5: no runtime CDN, no framework: nothing is loaded from another site', () => {
  for (const file of nextCode) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /<script[^>]+src=["']https?:/i, short(file));
    assert.doesNotMatch(text, /<link[^>]+href=["']https?:/i, short(file));
    assert.doesNotMatch(text, /\bfrom\s+['"]https?:/, short(file));
    assert.doesNotMatch(text, /\bimport\(\s*['"]https?:/, short(file));
    assert.doesNotMatch(text, /url\(\s*['"]?https?:/i, short(file));
    assert.doesNotMatch(text, /@import/, short(file));
  }
});

test('rule 5: every import points at a file that exists, inside next/', () => {
  const sources = [...nextScripts, join(NEXT, 'audio-test.html')];
  let count = 0;
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const target = match[1];
      assert.match(target, /^\.\.?\//, `${short(file)} imports "${target}": only relative imports are allowed`);
      const resolved = resolve(dirname(file), target);
      assert.ok(resolved.startsWith(NEXT), `${short(file)} imports outside next/`);
      assert.ok(existsSync(resolved), `${short(file)} imports "${target}", which does not exist`);
      count++;
    }
  }
  assert.ok(count > 30);
});

test('rule 6: the engine is pure: no DOM, storage, network, or clock of its own', () => {
  const engine = filesUnder(join(NEXT, 'app/engine'), ['.js']);
  assert.ok(engine.length >= 7);
  for (const file of engine) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(code, /\b(document|window|globalThis|localStorage|sessionStorage|indexedDB|navigator|fetch|XMLHttpRequest|WebSocket)\b/, short(file));
    assert.doesNotMatch(code, /\bDate\.now\(|\bnew Date\(|\bperformance\.|\bsetTimeout\(|\bsetInterval\(|\bMath\.random\(/, `${short(file)} must take time as an argument`);
    for (const match of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.match(match[1], /^\.\/[\w-]+\.js$/, `${short(file)} may only import from the engine folder`);
    }
  }
});

test('rule 6: coffee constants live in constants.js: other engine files declare no numeric constants', () => {
  for (const file of filesUnder(join(NEXT, 'app/engine'), ['.js'])) {
    if (file.endsWith('constants.js')) continue;
    const code = readFileSync(file, 'utf8');
    const declared = [...code.matchAll(/^(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*([^;]+);/gm)]
      .filter((m) => /^-?[\d.]/.test(m[2].trim()))
      .map((m) => m[1]);
    // EPSILON is floating-point housekeeping and CUE_TOLERANCE_S is scheduling slack, not coffee.
    assert.deepEqual(declared.filter((name) => !['EPSILON', 'CUE_TOLERANCE_S'].includes(name)), [], short(file));
  }
});

test('storage: only platform/storage.js touches localStorage, so every key is namespaced', () => {
  for (const file of [...nextScripts, ...filesUnder(NEXT, ['.html'])]) {
    if (file.endsWith(join('platform', 'storage.js'))) continue;
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\b(localStorage|sessionStorage|indexedDB)\b/, short(file));
  }
});

test('no service worker, no analytics', () => {
  for (const file of nextCode) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /serviceWorker/, short(file));
    assert.doesNotMatch(text, /gtag|google-analytics|googletagmanager|plausible|segment\.com|sendBeacon/i, short(file));
  }
});

test('no hidden-video wake lock hack', () => {
  for (const file of nextCode) assert.doesNotMatch(readFileSync(file, 'utf8'), /<video|createElement\(['"]video/i, short(file));
});

test('the page, the manifest, and the icons are wired together with relative paths', () => {
  const html = read('next/index.html');
  for (const match of html.matchAll(/\b(?:href|src)="([^"#]+)"/g)) {
    const target = match[1];
    assert.doesNotMatch(target, /^(\/|https?:)/, `index.html: "${target}" must be relative so the page works at / and at /next/`);
    if (target === 'classic.html') continue; // lives at the repo root; the page fixes the path when under next/
    assert.ok(existsSync(join(NEXT, target)), `index.html points at "${target}", which does not exist`);
  }
  assert.match(html, /<script type="module" src="app\/main\.js"><\/script>/);
  const manifest = JSON.parse(read('next/manifest.webmanifest'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) assert.ok(existsSync(join(NEXT, icon.src)), `manifest icon ${icon.src}`);
  assert.ok(existsSync(join(NEXT, 'assets/icon-180.png')), 'apple-touch-icon');
});

test('icons are real PNG files of the stated size', () => {
  for (const size of [180, 192, 512]) {
    const png = readFileSync(join(NEXT, `assets/icon-${size}.png`));
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('writing style: no en dashes, em dashes, or emojis in anything written for this project', () => {
  const files = [
    ...filesUnder(NEXT, ['.js', '.html', '.css', '.webmanifest', '.md']),
    ...filesUnder(join(ROOT, 'tests'), ['.js']),
    ...filesUnder(join(ROOT, 'scripts'), ['.mjs', '.sh']),
    join(ROOT, 'CLAUDE.md'),
    ...filesUnder(join(ROOT, 'docs'), ['.md']).filter((file) => !file.endsWith('BUILD_BRIEF.md')),
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'), `${short(file)} has an en or em dash`);
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${short(file)} has an emoji`);
  }
});

test('CLAUDE.md stays within 60 lines', () => {
  assert.ok(read('CLAUDE.md').trimEnd().split('\n').length <= 60);
});

test('no secrets or private files are tracked-in-waiting: .gitignore covers them', () => {
  const ignore = read('.gitignore');
  for (const line of ['.env', '.env.*', 'tests/fixtures/private/']) assert.ok(ignore.split('\n').includes(line), line);
});
