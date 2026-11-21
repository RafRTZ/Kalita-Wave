// The lower part of the brew screen and of the timer (the pour plan with the link to the brewer's tips, and
// the buttons) must not move when Start is tapped, and sits on a ground of its own, so that only the upper
// part of the screen is seen to be replaced (owner, 2026-11-21). A test here cannot measure a screen, so it
// checks the things that make the two screens agree: both get the lower part from one place, one set of
// style rules covers it, none of those rules is written for one screen alone, and the brew screen hands
// the height of its pour plan to the timer. The measuring itself is done in a browser and recorded in
// docs/DECISIONS.md.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../next/app/ui/${path}`, import.meta.url)), 'utf8');
const css = read('styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
const brew = read('brew.js');
const timer = read('timer.js');
const parts = read('parts.js');

/** Every rule in the stylesheet as { selectors, body }, with the rules inside media blocks included. */
const RULES = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => !m[1].trim().startsWith('@'))
  .map((m) => ({ selectors: m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: m[2] }));

/** The bodies of every rule that carries exactly this selector, joined. */
function bodyOf(selector) {
  return RULES.filter((rule) => rule.selectors.includes(selector))
    .map((rule) => rule.body)
    .join('\n');
}

const SHARED = /\.lower\b|\.plan\b|\.steps\b|\.step-row\b|\.bottom-bar\b/;

test('the stylesheet was read as rules', () => {
  assert.ok(RULES.length > 150, `${RULES.length} rules`);
  assert.ok(bodyOf('.step-row').includes('grid-template-columns'), 'the rule for a row of the pour plan');
});

test('both screens get the lower part from one place', () => {
  assert.match(parts, /export function lowerPart\(/, 'parts.js builds the lower part');
  assert.doesNotMatch(parts, /export function (stepRow|finishRow|planCard)\b/, 'its pieces are not handed out one by one');
  assert.match(parts, /class: 'lower'[\s\S]*class: 'group-head'[\s\S]*\n\s*card,[\s\S]*class: 'bottom-bar'/, 'the name and tips link, the plan, the buttons');
  for (const [name, source] of [['brew.js', brew], ['timer.js', timer]]) {
    assert.match(source, /lowerPart\(app, \{/, `${name} uses the shared lower part`);
    assert.doesNotMatch(source, /step-row|class: 'steps'|class: 'card plan'|class: 'lower'/, `${name} builds no pour plan of its own`);
  }
});

test('the link to the brewer tips is in the lower part, so both screens have it', () => {
  assert.match(parts, /openSheet\('technique'\)/, 'parts.js opens the tips');
  assert.doesNotMatch(brew, /openSheet\('technique'\)/, 'the brew screen has no tips link of its own');
  assert.doesNotMatch(timer, /openSheet\('technique'\)/, 'nor has the timer');
});

test('both screens are an upper part and then the lower part, and the timer keeps its Done screen apart', () => {
  assert.match(brew, /class: 'upper'[\s\S]*\n\s*lower\.node,\n/, 'brew.js');
  assert.match(timer, /class: 'upper'[\s\S]*\n\s*lower\.node,\n/, 'timer.js');
  // The buttons are the one piece each screen brings to the lower part. The only row of buttons a screen
  // builds by itself is the one on the Done screen, which has no lower part.
  assert.doesNotMatch(brew, /class: 'bottom-bar'/, 'brew.js hands its buttons to the lower part');
  assert.equal((timer.match(/class: 'bottom-bar'/g) || []).length, 1, 'timer.js builds one row of buttons, for the Done screen');
});

test('no style rule for the lower part is written for one screen alone', () => {
  const twin = (selector) =>
    selector.replace(/\.screen\.(brew|timer)\b/g, (whole, screen) => `.screen.${screen === 'brew' ? 'timer' : 'brew'}`);
  let checked = 0;
  for (const rule of RULES) {
    for (const selector of rule.selectors) {
      if (!SHARED.test(selector)) continue;
      checked += 1;
      assert.doesNotMatch(selector, /\.brew-group|\.timer-steps|\.held\b|\.done-body/, `"${selector}" ties the lower part to one screen`);
      if (/\.screen\.(brew|timer)\b/.test(selector)) {
        assert.ok(rule.selectors.includes(twin(selector)), `"${selector}" needs "${twin(selector)}" in the same rule`);
      }
    }
  }
  assert.ok(checked >= 20, `${checked} selectors checked`);
  assert.doesNotMatch(css, /\.timer-steps/, 'the timer has no step list of its own any more');
});

test('the lower part gives up height on both screens, down to a floor from the number of rows', () => {
  const lower = bodyOf('.screen > .lower');
  assert.match(lower, /flex:\s*0 1 auto/, 'it may shrink');
  assert.match(lower, /min-height:\s*calc\(var\(--rows/, 'a floor from the number of rows');
  // The floor names every other piece of the part, so that it is the true smallest size.
  for (const piece of ['--lower-top', '--lower-head', '--gap', '--bar', '--pad-b']) {
    assert.ok(lower.match(/min-height:[^;]*/)[0].includes(`var(${piece})`), `the floor counts ${piece}`);
  }
  assert.match(bodyOf('.lower > .group-head'), /height:\s*var\(--lower-head\)/, 'the name row is the height the floor counts');
});

test('the pour plan takes the height noted on the brew screen', () => {
  const plan = bodyOf('.lower > .plan');
  assert.match(plan, /flex:\s*0 1 var\(--plan-h, auto\)/, 'as tall as its rows like, or as tall as it was on the brew screen');
  assert.match(plan, /min-height:\s*calc\(var\(--rows/, 'a floor from the number of rows');
});

test('the lower part has a ground of its own, out to the edges of the screen', () => {
  const lower = bodyOf('.screen > .lower');
  const ground = lower.match(/background:\s*var\(--([\w-]+)\)/);
  assert.ok(ground, 'a background from a colour token');
  assert.notEqual(ground[1], 'bg', 'a shade apart from the page');
  assert.notEqual(ground[1], 'card', 'and apart from the cards that sit on it');
  assert.match(lower, /margin:\s*calc\(-1 \* var\(--gap\)\) -16px calc\(-1 \* var\(--pad-b\)\)/, 'out to the left, right, and bottom edges');
});

test('the upper part takes all the spare room, so none lands in the lower part', () => {
  assert.match(bodyOf('.screen > .upper'), /flex:\s*1 0 auto/);
  assert.match(bodyOf('.screen > .upper'), /justify-content:\s*space-between/);
  assert.match(bodyOf('.screen > .upper::after'), /content:\s*''/, 'an empty last piece shares the spare room above the lower part too');
});

test('the row of buttons is one height wherever it appears', () => {
  const root = css.match(/:root\s*\{([^}]*)\}/)[1];
  const px = (name) => Number(root.match(new RegExp(`--${name}:\\s*(\\d+)px`))[1]);
  assert.ok(px('bar') >= px('tap'), '--bar is at least a full tap area');
  assert.match(bodyOf('.bottom-bar'), /min-height:\s*var\(--bar\)/, 'the row');
  assert.match(bodyOf('.bottom-bar .btn'), /min-height:\s*var\(--bar\)/, 'the buttons in it');
  // Start is drawn with larger words. It must not bring a height of its own.
  assert.doesNotMatch(bodyOf('.btn.big'), /height/, '.btn.big sets no height');
  assert.doesNotMatch(bodyOf('.hold'), /height/, 'Reset sets no height');
  // A short screen may make the row smaller, for both screens at once and never under a full tap area.
  for (const [, selectors, value] of css.matchAll(/([^{}]+)\{[^{}]*--bar:\s*([^;]+);/g)) {
    if (selectors.includes(':root')) continue;
    assert.equal(value.trim(), 'var(--tap)', 'a smaller --bar is exactly a tap area');
    assert.match(selectors, /\.screen\.brew,\s*\.screen\.timer/, 'and is set for both screens together');
  }
});

test('the brew screen notes the height of its pour plan at Start, and the timer takes it', () => {
  assert.match(parts, /export function notePlanHeight\(/);
  assert.match(parts, /export function usePlanHeight\(/);
  assert.match(brew, /notePlanHeight\(lower\.plan\);\s*app\.start\(\);/, 'noted before the screen changes');
  assert.match(timer, /usePlanHeight\(refs\.plan\)/, 'the timer gives its pour plan that height');
  assert.match(timer, /classList\.toggle\('held', held\)/, 'and marks the screen while it holds');
  assert.match(bodyOf('.screen.timer.held > .upper'), /gap:\s*2px/, 'the upper part of the timer may pack tighter to make room');
});
