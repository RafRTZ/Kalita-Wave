// Small DOM helpers. Everything on screen is built with h(), which sets text as text, so nothing typed by a
// user (a grinder name, a note) is ever read as HTML.

const SVG_NS = 'http://www.w3.org/2000/svg';

const PROPERTIES = new Set(['value', 'checked', 'disabled', 'hidden', 'open']);

function append(node, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false || kid === true) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
}

/** Replace everything inside a node. Unlike replaceChildren, null and false children are skipped. */
export function mount(node, ...kids) {
  node.replaceChildren();
  append(node, kids);
}

/** h('button', { class: 'btn', onclick: fn }, 'Start') */
export function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (PROPERTIES.has(key)) node[key] = value;
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  append(node, kids);
  return node;
}

// Line icons, drawn with the current text colour. The markup below is fixed, never user text.
const ICONS = {
  settings:
    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' +
    '<circle cx="9" cy="6" r="2.4" fill="currentColor"/><circle cx="15" cy="12" r="2.4" fill="currentColor"/><circle cx="8" cy="18" r="2.4" fill="currentColor"/>',
};

export function icon(name, size = 26) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] || '';
  return svg;
}

/** A two-or-more-way switch. options: [{ value, label }]. */
export function segmented({ options, value, onChange, label, extraClass = '' }) {
  return h(
    'div',
    { class: `seg ${extraClass}`.trim(), role: 'group', 'aria-label': label },
    options.map((option) =>
      h(
        'button',
        {
          type: 'button',
          'aria-pressed': String(option.value === value),
          onclick: () => {
            if (option.value !== value) onChange(option.value);
          },
        },
        option.label,
      ),
    ),
  );
}

/** A full-screen sheet with a title and a close button. */
export function sheetFrame({ title, closeLabel = 'Close', onClose }, ...body) {
  return h(
    'section',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h(
      'header',
      { class: 'sheet-head' },
      h('h2', { tabindex: '-1' }, title),
      onClose ? h('button', { class: 'btn', type: 'button', onclick: onClose }, closeLabel) : null,
    ),
    body,
  );
}

/** Set text only when it changed, so a 60-times-a-second update touches the page as little as possible. */
export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

export function setAttr(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

export function toggleClass(node, name, on) {
  if (node.classList.contains(name) !== on) node.classList.toggle(name, on);
}
