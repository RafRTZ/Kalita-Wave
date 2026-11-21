// The pour plan and the buttons under it must not move when Start is tapped (owner, 2026-11-21): only the
// upper part of the screen is seen to change. A test here cannot measure a screen, so it checks the things
// that make the two screens agree: both build the plan in one place, one set of style rules covers it and
// the buttons, none of those rules is written for one screen alone, and the brew screen hands the height
// of its plan to the timer. The measuring itself is done in a browser and recorded in docs/DECISIONS.md.

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

const SHARED = /\.plan\b|\.steps\b|\.step-row\b|\.bottom-bar\b/;

test('the stylesheet was read as rules', () => {
  assert.ok(RULES.length > 150, `${RULES.length} rules`);
  assert.ok(bodyOf('.step-row').includes('grid-template-columns'), 'the rule for a row of the pour plan');
});

test('both screens build the pour plan in one place', () => {
  assert.match(parts, /export function planCard\(/, 'parts.js builds the pour plan');
  assert.doesNotMatch(parts, /export function (stepRow|finishRow)\b/, 'its rows are not handed out one by one');
  for (const [name, source] of [['brew.js', brew], ['timer.js', timer]]) {
    assert.match(source, /planCard\(/, `${name} uses the shared pour plan`);
    assert.doesNotMatch(source, /step-row|class: 'steps'|class: 'card plan'/, `${name} builds no pour plan of its own`);
  }
});

test('both screens are an upper part, then the pour plan, then the row of buttons', () => {
  assert.match(brew, /class: 'upper'[\s\S]*\n\s*plan\.node,[\s\S]*class: 'bottom-bar'/, 'brew.js');
  assert.match(timer, /class: 'upper'[\s\S]*\n\s*r\.plan,[\s\S]*class: 'bottom-bar'/, 'timer.js');
});

test('no style rule for the pour plan or the buttons is written for one screen alone', () => {
  const twin = (selector) =>
    selector.replace(/\.screen\.(brew|timer)\b/g, (whole, screen) => `.screen.${screen === 'brew' ? 'timer' : 'brew'}`);
  let checked = 0;
  for (const rule of RULES) {
    for (const selector of rule.selectors) {
      if (!SHARED.test(selector)) continue;
      checked += 1;
      assert.doesNotMatch(selector, /\.brew-group|\.timer-steps|\.held\b|\.done-body/, `"${selector}" ties the pour plan to one screen`);
      if (/\.screen\.(brew|timer)\b/.test(selector)) {
        assert.ok(rule.selectors.includes(twin(selector)), `"${selector}" needs "${twin(selector)}" in the same rule`);
      }
    }
  }
  assert.ok(checked >= 15, `${checked} selectors checked`);
  assert.doesNotMatch(css, /\.timer-steps/, 'the timer has no step list of its own any more');
});

test('the pour plan gives up height on both screens, and takes the height noted on the brew screen', () => {
  const plan = bodyOf('.screen.brew > .plan');
  assert.equal(plan, bodyOf('.screen.timer > .plan'), 'one rule for both screens');
  assert.match(plan, /flex:\s*0 1 var\(--plan-h, auto\)/, 'as tall as its rows like, or as tall as it was on the brew screen');
  assert.match(plan, /min-height:\s*calc\(var\(--rows/, 'a floor from the number of rows');
});

test('the upper part takes all the spare room, so none lands between the pour plan and the buttons', () => {
  assert.match(bodyOf('.screen > .upper'), /flex:\s*1 0 auto/);
  assert.match(bodyOf('.screen > .upper'), /justify-content:\s*space-between/);
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
});

test('the brew screen notes the height of its pour plan at Start, and the timer takes it', () => {
  assert.match(parts, /export function notePlanHeight\(/);
  assert.match(parts, /export function usePlanHeight\(/);
  assert.match(brew, /notePlanHeight\(plan\.node\);\s*app\.start\(\);/, 'noted before the screen changes');
  assert.match(timer, /usePlanHeight\(refs\.plan\)/, 'the timer gives its pour plan that height');
  assert.match(timer, /classList\.toggle\('held', held\)/, 'and marks the screen while it holds');
  assert.match(bodyOf('.screen.timer.held > .upper'), /gap:\s*2px/, 'the upper part of the timer may pack tighter to make room');
});
