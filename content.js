/**
 * content.js — the whole in-page UI (ES module, loaded by bootstrap.js).
 *
 * Everything lives inside a closed shadow root on a single fixed host element,
 * so the page's CSS can't reach in and our CSS can't leak out. The page DOM
 * gains exactly one node (the host); nothing here reflows the page.
 *
 * Exported `toggle()` flips the tool on and off — bootstrap.js calls it on
 * every toolbar click, and the module stays cached between clicks.
 */

import { buildCssSelector, buildXPath } from "./selectors.js";
import { inspect } from "./inspect.js";
import { toCssRule } from "./cssrule.js";

const HOST_ID = "quick-inspector-host";
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

/** @type {null | { host: HTMLElement, root: ShadowRoot, picking: boolean,
 *   selected: Element|null, hover: Element|null, popover: HTMLElement|null,
 *   nodes: Record<string, HTMLElement>, listeners: Array<[EventTarget, string, Function, any]> }} */
let S = null;

export function toggle() {
  if (S) teardown();
  else activate();
}

// --- lifecycle --------------------------------------------------------------

async function activate() {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "all: initial; position: fixed; inset: 0; margin: 0; padding: 0;" +
    "border: 0; pointer-events: none; z-index: 2147483647;";
  const root = host.attachShadow({ mode: "closed" });
  document.documentElement.appendChild(host);

  S = { host, root, picking: false, selected: null, hover: null, popover: null, moveRaf: 0, nodes: {}, listeners: [] };

  await injectStyles(root);
  buildOverlay(root);
  buildBar(root);
  bindGlobalListeners();
  startPicking();
}

function teardown() {
  if (!S) return;
  if (S.moveRaf) cancelAnimationFrame(S.moveRaf);
  for (const [target, type, fn, opts] of S.listeners) {
    target.removeEventListener(type, fn, opts);
  }
  S.host.remove();
  S = null;
}

async function injectStyles(root) {
  const style = document.createElement("style");
  try {
    const res = await fetch(chrome.runtime.getURL("content.css"));
    style.textContent = await res.text();
  } catch {
    style.textContent = ":host{all:initial}"; // page still usable if fetch fails
  }
  root.appendChild(style);
}

// --- overlay + bar ---------------------------------------------------------

function buildOverlay(root) {
  const highlight = h("div", { class: "qi-highlight" });
  const label = h("div", { class: "qi-label" });
  root.append(highlight, label);
  S.nodes.highlight = highlight;
  S.nodes.label = label;
}

function buildBar(root) {
  const pick = h("button", { class: "qi-btn qi-btn--primary", onclick: onPickButton });
  const collapse = h("button", { class: "qi-btn qi-btn--collapse", title: t("barCollapse"), onclick: onCollapse, text: "–" });
  const close = h("button", { class: "qi-btn", title: t("barClose"), onclick: teardown, text: "✕" });

  const bar = h(
    "div",
    { class: "qi-bar" },
    h("span", { class: "qi-bar__grip", onpointerdown: startBarDrag }),
    pick,
    collapse,
    close,
  );
  root.append(bar);
  S.nodes.bar = bar;
  S.nodes.pickBtn = pick;
  S.nodes.collapseBtn = collapse;
  syncPickButton();
}

function onCollapse() {
  const collapsed = S.nodes.bar.classList.toggle("qi-bar--collapsed");
  S.nodes.collapseBtn.textContent = collapsed ? "+" : "–";
}

// --- picking --------------------------------------------------------------

function startPicking() {
  S.picking = true;
  syncPickButton();
}

function stopPicking() {
  S.picking = false;
  S.hover = null;
  hideHighlight();
  syncPickButton();
}

function onPickButton() {
  if (S.picking) stopPicking();
  else {
    closePopover();
    startPicking();
  }
}

function syncPickButton() {
  const b = S.nodes.pickBtn;
  b.textContent = S.picking ? t("barPickStop") : t("barPick");
  b.classList.toggle("qi-btn--active", S.picking);
}

function onMove(e) {
  if (!S.picking) return;
  // Throttle the hit-test + layout reads to one per frame.
  if (S.moveRaf) return;
  const { clientX: x, clientY: y } = e;
  S.moveRaf = requestAnimationFrame(() => {
    S.moveRaf = 0;
    if (!S || !S.picking) return;
    const el = elementUnder(x, y);
    if (!el) {
      S.hover = null;
      hideHighlight();
      return;
    }
    S.hover = el;
    positionHighlight(el);
    positionLabel(el, x, y);
  });
}

function onClick(e) {
  if (!S.picking) return;
  if (e.composedPath().includes(S.host)) return; // let our own buttons work
  e.preventDefault();
  e.stopPropagation();
  const el = elementUnder(e.clientX, e.clientY) || e.target;
  if (el) select(el);
}

function onKey(e) {
  if (e.key !== "Escape") return;
  e.stopPropagation();
  if (S.popover) {
    closePopover();
    startPicking();
  } else if (S.picking) {
    stopPicking();
  } else {
    teardown();
  }
}

function onScrollOrResize() {
  const el = S.selected || S.hover;
  if (el) positionHighlight(el);
}

function select(el) {
  S.selected = el;
  stopPicking();
  positionHighlight(el);
  S.nodes.label.classList.remove("qi-label--on");
  openPopover(el);
}

// --- highlight ----------------------------------------------------------

function positionHighlight(el) {
  const r = el.getBoundingClientRect();
  Object.assign(S.nodes.highlight.style, {
    display: "block",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
}

function hideHighlight() {
  S.nodes.highlight.style.display = "none";
  S.nodes.label.classList.remove("qi-label--on");
}

function positionLabel(el, x, y) {
  const label = S.nodes.label;
  const cls = el.classList.length ? "." + Array.from(el.classList).slice(0, 2).join(".") : "";
  const id = el.id ? `#${el.id}` : "";
  const r = el.getBoundingClientRect();
  label.textContent = `${el.localName}${id}${cls}  ${Math.round(r.width)}×${Math.round(r.height)}`;
  label.classList.add("qi-label--on");
  label.style.left = `${Math.min(x + 12, window.innerWidth - label.offsetWidth - 8)}px`;
  label.style.top = `${Math.max(y - 28, 4)}px`;
}

// --- popover ----------------------------------------------------------

function openPopover(el) {
  closePopover();
  const data = inspect(el, window);
  const css = buildCssSelector(el, document);
  const xpath = buildXPath(el, document);

  const pop = h(
    "div",
    { class: "qi-pop" },
    h(
      "div",
      { class: "qi-pop__head", onpointerdown: startPopDrag },
      h("span", { class: "qi-pop__title", text: titleFor(data.header) }),
      h("span", { class: "qi-pop__dim", text: `${data.dims.width} × ${data.dims.height}` }),
      h("button", { class: "qi-btn qi-btn--ghost", text: "✕", onclick: () => { closePopover(); startPicking(); } }),
    ),
    section(t("secSelector"), selectorRows(css, xpath)),
    section(t("secBox"), [boxModelView(data.boxModel)]),
    section(t("secStyles"), [stylesView(css, data.keyStyles)]),
    section(t("secColors"), [colorsView(data.colors)]),
    section(t("secStructure"), [structureView(data.counts)]),
  );

  S.root.append(pop);
  S.popover = pop;
  placePopover(pop, el);
}

function closePopover() {
  if (S.popover) {
    S.popover.remove();
    S.popover = null;
  }
}

function placePopover(pop, el) {
  const r = el.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  let left = r.right + 12;
  if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - 12);
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  let top = r.top;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
  pop.style.left = `${Math.max(8, left)}px`;
  pop.style.top = `${Math.max(8, top)}px`;
}

// --- popover sections -------------------------------------------------

function section(name, children) {
  return h("div", { class: "qi-sec" }, h("div", { class: "qi-sec__h", text: name }), ...children);
}

function selectorRows(css, xpath) {
  return [
    copyRow(t("labelCss"), css),
    copyRow(t("labelXpath"), xpath),
  ];
}

function copyRow(label, value) {
  const row = h(
    "div",
    { class: "qi-row qi-row--copy", title: value, onclick: () => copy(value) },
    h("span", { class: "qi-row__k", text: label }),
    h("code", { class: "qi-row__v", text: value || "—" }),
    h("span", { class: "qi-row__copy", text: "⧉" }),
  );
  return row;
}

function boxModelView(bm) {
  const q = (n) => (n === 0 ? "0" : String(n));
  const layer = (cls, box, inner) =>
    h(
      "div",
      { class: `qi-box qi-box--${cls}` },
      h("span", { class: "qi-box__t", text: q(box.top) }),
      h("span", { class: "qi-box__r", text: q(box.right) }),
      h("span", { class: "qi-box__b", text: q(box.bottom) }),
      h("span", { class: "qi-box__l", text: q(box.left) }),
      inner,
    );
  const content = h("div", { class: "qi-box qi-box--content", text: `${bm.content.width}×${bm.content.height}` });
  return layer("margin", bm.margin, layer("border", bm.border, layer("padding", bm.padding, content)));
}

function stylesView(css, keyStyles) {
  const table = h(
    "div",
    { class: "qi-styles" },
    ...keyStyles.map(({ prop, value }) =>
      h("div", { class: "qi-row" },
        h("span", { class: "qi-row__k", text: prop }),
        h("code", { class: "qi-row__v", text: value }),
      ),
    ),
  );
  const btn = h("button", {
    class: "qi-btn qi-btn--wide",
    text: t("copyRule"),
    onclick: () => copy(toCssRule(css, keyStyles)),
  });
  return h("div", {}, table, btn);
}

function colorsView(colors) {
  const chip = (name, info) => {
    if (info.transparent && !info.hex) {
      return h("div", { class: "qi-chip qi-chip--empty" },
        h("span", { class: "qi-chip__sw" }),
        h("span", { class: "qi-chip__k", text: name }),
        h("code", { class: "qi-chip__v", text: info.value }),
      );
    }
    const sw = h("span", { class: "qi-chip__sw" });
    sw.style.background = info.value;
    return h(
      "div",
      { class: "qi-chip", title: info.hex || info.value, onclick: () => copy(info.hex || info.value) },
      sw,
      h("span", { class: "qi-chip__k", text: name }),
      h("code", { class: "qi-chip__v", text: info.hex || info.value }),
    );
  };
  return h("div", { class: "qi-chips" },
    chip("color", colors.color),
    chip("background", colors.backgroundColor),
    chip("border", colors.borderColor),
  );
}

function structureView(c) {
  const parts = [];
  if (c.kind === "table") parts.push(t("structTable", [String(c.rows), String(c.cols)]));
  else if (c.kind === "list") parts.push(t("structItems", [String(c.items)]));
  else if (c.kind === "repeat") parts.push(t("structRepeat", [String(c.repeat.count), c.repeat.tag]));
  parts.push(t("structDepth", [String(c.depth)]));
  return h("div", { class: "qi-struct", text: parts.join("  ·  ") });
}

function titleFor(header) {
  const cls = header.classes.length ? "." + header.classes.slice(0, 3).join(".") : "";
  return `${header.tag}${header.id ? "#" + header.id : ""}${cls}`;
}

// --- dragging -----------------------------------------------------------

function startBarDrag(e) {
  dragElement(e, S.nodes.bar);
}
function startPopDrag(e) {
  if (e.target.closest(".qi-btn")) return;
  dragElement(e, S.popover);
}
function dragElement(e, node) {
  e.preventDefault();
  const rect = node.getBoundingClientRect();
  const dx = e.clientX - rect.left;
  const dy = e.clientY - rect.top;
  node.style.right = "auto";
  const move = (ev) => {
    node.style.left = `${Math.max(0, ev.clientX - dx)}px`;
    node.style.top = `${Math.max(0, ev.clientY - dy)}px`;
  };
  const up = () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
}

// --- helpers ----------------------------------------------------------

function bindGlobalListeners() {
  add(document, "mousemove", onMove, true);
  add(document, "click", onClick, true);
  add(window, "keydown", onKey, true);
  add(window, "scroll", onScrollOrResize, true);
  add(window, "resize", onScrollOrResize, true);
}

function add(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  S.listeners.push([target, type, fn, opts]);
}

function elementUnder(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el || el === S.host || el === document.documentElement) return null;
  return el;
}

async function copy(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast();
}

function toast() {
  let el = S.nodes.toast;
  if (!el) {
    el = h("div", { class: "qi-toast" });
    S.root.append(el);
    S.nodes.toast = el;
  }
  el.textContent = t("copied");
  el.classList.add("qi-toast--on");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("qi-toast--on"), 1200);
}

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v != null) el.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
}
