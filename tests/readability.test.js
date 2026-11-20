// Readability rules from docs/BUILD_BRIEF.md section 5.4, checked against the real stylesheet:
// every text and background pair at least 4.5:1, nothing under 14 px, controls at least 56 px tall,
// and no colour anywhere outside the token block (so the first check really covers every pair).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = fileURLToPath(new URL('../next/', import.meta.url));
const css = readFileSync(join(NEXT, 'app/ui/styles.css'), 'utf8');
const rootBlock = css.match(/:root\s*\{([^}]*)\}/)[1];
const tokens = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const cssOutsideRoot = css.replace(/:root\s*\{[^}]*\}/, '').replace(/\/\*[\s\S]*?\*\//g, '');

function filesUnder(dir, extensions) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path, extensions));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) found.push(path);
  }
  return found;
}

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['bg', 'card', 'soft', 'row', 'fill', 'warn', 'danger-soft'];
const TEXT = ['ink', 'sub', 'accent', 'danger'];

test('colour tokens exist and are plain six-digit hex', () => {
  for (const name of [...SURFACES, ...TEXT, 'on-accent', 'line', 'edge']) {
    assert.match(tokens[name] || '', /^#[0-9a-f]{6}$/, `--${name}`);
  }
});

test('every text colour reaches 4.5:1 on every light surface', () => {
  for (const text of TEXT) {
    for (const surface of SURFACES) {
      const ratio = contrast(tokens[text], tokens[surface]);
      assert.ok(ratio >= 4.5, `--${text} on --${surface} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('text on the accent colour reaches 4.5:1', () => {
  const ratio = contrast(tokens['on-accent'], tokens.accent);
  assert.ok(ratio >= 4.5, `--on-accent on --accent is ${ratio.toFixed(2)}:1`);
});

test('control outlines reach 3:1 on the surfaces they sit on', () => {
  for (const surface of ['bg', 'card', 'soft']) {
    const ratio = contrast(tokens.edge, tokens[surface]);
    assert.ok(ratio >= 3, `--edge on --${surface} is ${ratio.toFixed(2)}:1`);
  }
});

test('the old failing pairs are gone', () => {
  assert.ok(contrast('#a89a85', '#f4ede2') < 4.5, 'sanity check: the old fine print really failed');
  assert.ok(!Object.values(tokens).includes('#a89a85'));
  assert.ok(!Object.values(tokens).includes('#b25e2e'));
});

test('the stylesheet uses no raw colour outside the token block', () => {
  assert.doesNotMatch(cssOutsideRoot, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(cssOutsideRoot, /\b(rgb|rgba|hsl|hsla)\(/);
  assert.doesNotMatch(cssOutsideRoot, /\bopacity\s*:/, 'no opacity: it would lower contrast without the test seeing it');
});

test('scripts and pages set no colours of their own', () => {
  for (const file of filesUnder(NEXT, ['.js'])) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /#[0-9a-fA-F]{6}\b/, file);
    assert.doesNotMatch(text, /\b(rgb|rgba|hsl|hsla)\(/, file);
  }
  for (const file of filesUnder(NEXT, ['.html'])) {
    const text = readFileSync(file, 'utf8');
    const colours = text.match(/#[0-9a-fA-F]{6}\b/g) || [];
    for (const colour of colours) assert.equal(colour, tokens.bg, `${file}: only the theme colour may appear, and it must be --bg`);
    assert.match(text, new RegExp(`<meta name="theme-color" content="${tokens.bg}">`), file);
    assert.doesNotMatch(text, /\sstyle=/, `${file}: no inline styles`);
  }
});

test('the manifest colours match the page background', () => {
  const manifest = JSON.parse(readFileSync(join(NEXT, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.background_color, tokens.bg);
  assert.equal(manifest.theme_color, tokens.bg);
});

test('no text under 14 px, and body text is at least 16 px', () => {
  const declarations = [...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(declarations.length > 20);
  for (const value of declarations) {
    assert.match(value, /^(\d+px|clamp\(\d+px, \d+vw, \d+px\))$/, `font-size "${value}" must be in px so it can be checked`);
    for (const px of value.match(/\d+(?=px)/g)) assert.ok(Number(px) >= 14, `font-size ${value} is under 14 px`);
  }
  const body = css.match(/\nbody\s*\{([^}]*)\}/)[1];
  assert.ok(Number(body.match(/font-size:\s*(\d+)px/)[1]) >= 16);
  assert.doesNotMatch(css, /\bfont:\s*\d/, 'no font shorthand with a size');
});

test('the elapsed time is at least 64 px and the current target at least 40 px', () => {
  const size = (selector) => {
    const body = css.match(new RegExp(`\\n${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`))[1];
    return Math.min(...body.match(/font-size:\s*([^;]+);/)[1].match(/\d+(?=px)/g).map(Number));
  };
  assert.ok(size('.clock') >= 64, `.clock is ${size('.clock')} px`);
  assert.ok(size('.now-target') >= 40, `.now-target is ${size('.now-target')} px`);
  assert.ok(size('.now-target.words') >= 40);
});

test('controls are at least 56 px tall', () => {
  assert.ok(Number(tokens.tap.replace('px', '')) >= 56, '--tap');
  for (const selector of ['.btn', '.icon-btn', '.step-btn', '.seg button', '.link', '.input', '.sound-bar', 'details.card > summary', '.help-entry > summary']) {
    const escaped = selector.replace(/[.>]/g, '\\$&');
    const rule = css.match(new RegExp(`\\n${escaped}\\s*\\{([^}]*)\\}`));
    assert.ok(rule, `rule for ${selector}`);
    assert.match(rule[1], /min-height:\s*var\(--tap\)/, `${selector} must have min-height: var(--tap)`);
  }
});
