/**
 * selectors.js — build a CSS selector and an XPath for a DOM element.
 *
 * Pure functions: they only read from the passed element / document, never
 * touch `chrome.*`, and are unit-tested in dev/selectors.test.mjs.
 *
 * The CSS builder is a self-contained shortest-unique-path algorithm (id →
 * stable classes → :nth-of-type), with a full-path fallback if the short form
 * fails to resolve to exactly one node. Swapping in @medv/finder later is a
 * drop-in replacement for `buildCssSelector`.
 */

const CSS_IDENT = /^-?[_a-zA-Z][\w-]*$/;

// Classes that are almost certainly build-generated and unstable across
// deploys — skip them when composing a selector.
const UNSTABLE_CLASS = [
  /^css-[a-z0-9]+$/i, // emotion / styled-components
  /^[a-z]+[_-]{1,2}[a-z0-9]+[_-]{1,2}[a-z0-9]{4,}$/i, // CSS Modules: Btn_root__a1b2
  /^[a-z0-9]*\d[a-z0-9]*$/i, // hashy token containing a digit, e.g. "x7f3q2"
  /--/, // BEM-ish state modifiers change often
];

const MAX_CLASSES_PER_SEGMENT = 2;

/**
 * @param {Element} el
 * @param {Document} [doc]
 * @returns {string}
 */
export function buildCssSelector(el, doc = el.ownerDocument) {
  if (!el || el.nodeType !== 1) return "";

  if (el.id && CSS_IDENT.test(el.id) && isUnique(doc, `#${el.id}`, el)) {
    return `#${el.id}`;
  }

  const segments = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== doc.documentElement.parentNode) {
    segments.unshift(segmentFor(node, doc));
    const path = segments.join(" > ");
    if (isUnique(doc, path, el)) return path;
    node = node.parentElement;
  }

  // Fallback: absolute nth-of-type path from the root.
  const full = absoluteCssPath(el, doc);
  return isUnique(doc, full, el) ? full : segments.join(" > ");
}

/**
 * @param {Element} el
 * @param {Document} [doc]
 * @returns {string}
 */
export function buildXPath(el, doc = el.ownerDocument) {
  if (!el || el.nodeType !== 1) return "";

  if (el.id && !el.id.includes('"') && isUniqueXPath(doc, `//*[@id="${el.id}"]`, el)) {
    return `//*[@id="${el.id}"]`;
  }

  const steps = [];
  let node = el;
  while (node && node.nodeType === 1) {
    const tag = node.localName;
    const index = sameTagIndex(node);
    steps.unshift(index ? `${tag}[${index}]` : tag);
    if (node === doc.documentElement) break;
    node = node.parentElement;
  }
  return "/" + steps.join("/");
}

// --- internals ---------------------------------------------------------------

function segmentFor(node, doc) {
  const tag = node.localName;

  if (node.id && CSS_IDENT.test(node.id) && isUnique(doc, `#${node.id}`, node)) {
    return `#${node.id}`;
  }

  const classes = stableClasses(node).slice(0, MAX_CLASSES_PER_SEGMENT);
  let base = tag + classes.map((c) => `.${cssEscape(c)}`).join("");

  const parent = node.parentElement;
  if (!parent) return base;

  // Is `base` already unique among siblings? If not, pin it with nth-of-type.
  const matches = Array.from(parent.children).filter((c) => c.matches(base));
  if (matches.length > 1) {
    base += `:nth-of-type(${sameTagIndex(node)})`;
  }
  return base;
}

function stableClasses(node) {
  return Array.from(node.classList).filter(
    (c) => CSS_IDENT.test(c) && !UNSTABLE_CLASS.some((re) => re.test(c)),
  );
}

function sameTagIndex(node) {
  const parent = node.parentElement;
  if (!parent) return 0;
  const siblings = Array.from(parent.children).filter(
    (c) => c.localName === node.localName,
  );
  return siblings.length > 1 ? siblings.indexOf(node) + 1 : 0;
}

function absoluteCssPath(el, doc) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== doc.documentElement.parentNode) {
    const i = sameTagIndex(node);
    parts.unshift(i ? `${node.localName}:nth-of-type(${i})` : node.localName);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function isUnique(doc, selector, el) {
  try {
    const found = doc.querySelectorAll(selector);
    return found.length === 1 && found[0] === el;
  } catch {
    return false;
  }
}

function isUniqueXPath(doc, expr, el) {
  try {
    const r = doc.evaluate(
      expr,
      doc,
      null,
      /* ORDERED_NODE_SNAPSHOT_TYPE */ 7,
      null,
    );
    return r.snapshotLength === 1 && r.snapshotItem(0) === el;
  } catch {
    return false;
  }
}

// Minimal CSS.escape shim for class tokens (identifiers only reach here).
function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/([^\w-])/g, "\\$1");
}
