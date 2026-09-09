/**
 * minidom.mjs — a tiny DOM good enough to unit-test selectors.js / inspect.js
 * without pulling in jsdom (CONVENTIONS.md §4: tests use node:assert only).
 *
 * Supports: element tree, id / classList / localName, matches() for compound
 * selectors (tag, .class, #id, :nth-of-type(n)), and querySelectorAll with
 * descendant (" ") and child (" > ") combinators. Plus a stub `evaluate` that
 * only understands `//*[@id="…"]`.
 */

class ClassList extends Array {
  contains(c) {
    return this.includes(c);
  }
}

export class El {
  constructor(tag) {
    this.localName = tag;
    this.nodeType = 1;
    this.id = "";
    this.classList = new ClassList();
    this.children = [];
    this.parentElement = null;
    this.ownerDocument = null;
    this._attrs = {};
  }
  get className() {
    return this.classList.join(" ");
  }
  getAttribute(name) {
    return name in this._attrs ? this._attrs[name] : null;
  }
  setAttribute(name, value) {
    this._attrs[name] = String(value);
  }
  get classNameList() {
    return this.classList;
  }
  append(...kids) {
    for (const k of kids) {
      k.parentElement = this;
      k.ownerDocument = this.ownerDocument;
      this.children.push(k);
      propagateDoc(k, this.ownerDocument);
    }
    return this;
  }
  matches(selector) {
    return matchCompound(this, selector.trim());
  }
  querySelectorAll(selector) {
    const compounds = selector.split(",").map((s) => s.trim());
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (compounds.some((sel) => matchCompound(c, sel))) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  get textContent() {
    return this.children.map((c) => c.textContent).join("");
  }
}

function propagateDoc(node, doc) {
  node.ownerDocument = doc;
  for (const c of node.children) propagateDoc(c, doc);
}

export class Doc {
  constructor(root) {
    this.documentElement = root;
    root.ownerDocument = this;
    propagateDoc(root, this);
    this.defaultView = { getComputedStyle: () => ({}) };
  }
  _all() {
    const out = [];
    const walk = (n) => {
      out.push(n);
      n.children.forEach(walk);
    };
    walk(this.documentElement);
    return out;
  }
  querySelectorAll(selector) {
    const groups = selector.split(">").map((s) => s.trim());
    // Only the simple cases the code emits: "a > b > c" (all child) or "a b c".
    const isChild = selector.includes(">");
    const parts = isChild
      ? groups
      : selector.trim().split(/\s+/).filter(Boolean);
    let candidates = this._all().filter((n) => matchCompound(n, parts[parts.length - 1]));
    return candidates.filter((n) => matchesChain(n, parts, isChild));
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  evaluate(expr) {
    const m = /^\/\/\*\[@id="([^"]+)"\]$/.exec(expr);
    const hits = m
      ? this._all().filter((n) => n.id === m[1])
      : [];
    return {
      snapshotLength: hits.length,
      snapshotItem: (i) => hits[i] || null,
    };
  }
}

function matchesChain(node, parts, isChild) {
  let i = parts.length - 1;
  let cur = node;
  if (!matchCompound(cur, parts[i])) return false;
  i--;
  cur = cur.parentElement;
  while (i >= 0) {
    if (isChild) {
      if (!cur || !matchCompound(cur, parts[i])) return false;
      cur = cur.parentElement;
      i--;
    } else {
      // descendant: walk up until a match
      let found = false;
      while (cur) {
        if (matchCompound(cur, parts[i])) {
          found = true;
          cur = cur.parentElement;
          break;
        }
        cur = cur.parentElement;
      }
      if (!found) return false;
      i--;
    }
  }
  return true;
}

function matchCompound(node, compound) {
  const nth = /:nth-of-type\((\d+)\)/.exec(compound);
  const bare = compound.replace(/:nth-of-type\(\d+\)/, "");
  const tokens = bare.match(/[#.]?[\w-]+/g) || [];
  for (const tok of tokens) {
    if (tok.startsWith("#")) {
      if (node.id !== tok.slice(1)) return false;
    } else if (tok.startsWith(".")) {
      if (!node.classList.contains(tok.slice(1))) return false;
    } else if (tok !== "*") {
      if (node.localName !== tok) return false;
    }
  }
  if (nth) {
    const parent = node.parentElement;
    if (!parent) return false;
    const sameTag = parent.children.filter((c) => c.localName === node.localName);
    if (sameTag.indexOf(node) + 1 !== Number(nth[1])) return false;
  }
  return true;
}

/** Build a tree from a compact spec: el("div", { id, class: "a b", src }, ...children) */
export function el(tag, props = {}, ...kids) {
  const node = new El(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "id") node.id = v;
    else if (k === "class") node.classList.push(...v.split(/\s+/));
    else node.setAttribute(k, v);
  }
  node.append(...kids);
  return node;
}
