/**
 * content.js — the in-page UI (ES module, loaded by bootstrap.js).
 *
 * One draggable panel lives inside a closed shadow root on a single fixed host
 * element. Collapsed it is a small handle; expanded it shows the Inspect toggle
 * and the inspection result. The page DOM gains exactly one node (the host) and
 * nothing here reflows the page.
 *
 * Exported `toggle()` flips the tool on and off — bootstrap.js calls it on
 * every toolbar click, and the module stays cached between clicks.
 */

import { buildCssSelector, buildXPath } from "./selectors.js";
import { inspect } from "./inspect.js";
import { toCssRule } from "./cssrule.js";
import { h, renderModel, renderMessage } from "./render.js";

const HOST_ID = "quick-inspector-host";
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

let S = null;

export function toggle() {
  if (S) teardown();
  else activate();
}

// --- lifecycle -----------------------------------------------------------

async function activate() {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText =
    "all: initial; position: fixed; inset: 0; margin: 0; padding: 0;" +
    "border: 0; pointer-events: none; z-index: 2147483647;";
  const root = host.attachShadow({ mode: "closed" });
  document.documentElement.appendChild(host);

  S = {
    host,
    root,
    expanded: true,
    picking: false,
    selected: null,
    model: null,
    hover: null,
    moveRaf: 0,
    nodes: {},
    listeners: [],
  };

  await injectStyles(root);
  buildOverlay(root);
  buildPanel(root);
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
    style.textContent = ":host{all:initial}";
  }
  root.appendChild(style);
}

// --- panel + overlay ---------------------------------------------------

function buildOverlay(root) {
  const highlight = h("div", { class: "qi-highlight" });
  const label = h("div", { class: "qi-label" });
  root.append(highlight, label);
  S.nodes.highlight = highlight;
  S.nodes.label = label;
}

function buildPanel(root) {
  const inspectBtn = h("button", {
    class: "qi-btn qi-btn--primary qi-inspect",
    onclick: onInspectToggle,
  });
  const collapseBtn = h("button", {
    class: "qi-btn qi-btn--ghost qi-head-btn",
    title: t("panelCollapse"),
    text: "–",
    onclick: () => setExpanded(false),
  });
  const closeBtn = h("button", {
    class: "qi-btn qi-btn--ghost qi-head-btn",
    title: t("panelClose"),
    text: "✕",
    onclick: teardown,
  });

  const head = h(
    "div",
    { class: "qi-panel__head", onpointerdown: onHeadPointerDown },
    h(
      "span",
      { class: "qi-brand" },
      h("span", { class: "qi-brand__mark", text: "🔍" }),
      h("span", { class: "qi-brand__name", text: t("barInspect") }),
    ),
    inspectBtn,
    h("span", { class: "qi-spacer" }),
    collapseBtn,
    closeBtn,
  );
  const body = h("div", { class: "qi-panel__body" });
  const panel = h("div", { class: "qi-panel" }, head, body);
  root.append(panel);

  S.nodes.panel = panel;
  S.nodes.body = body;
  S.nodes.inspectBtn = inspectBtn;

  setExpanded(true);
  syncInspectBtn();
}

function setExpanded(on) {
  S.expanded = on;
  S.nodes.panel.classList.toggle("qi-panel--collapsed", !on);
  if (!on) {
    stopPicking();
  } else {
    renderBody();
  }
}

function renderBody() {
  if (!S.expanded) return;
  if (S.selected && S.model) {
    renderModel(S.nodes.body, S.model, copy);
  } else {
    renderMessage(S.nodes.body, S.picking ? t("hintPicking") : t("hintIdle"));
  }
}

// --- picking ---------------------------------------------------------

function onInspectToggle() {
  if (S.picking) stopPicking();
  else startPicking();
}

function startPicking() {
  S.picking = true;
  S.selected = null;
  S.model = null;
  syncInspectBtn();
  renderBody();
}

function stopPicking() {
  S.picking = false;
  S.hover = null;
  hideHighlight();
  syncInspectBtn();
  renderBody();
}

function syncInspectBtn() {
  const b = S.nodes.inspectBtn;
  b.textContent = S.picking ? t("barStop") : t("barInspect");
  b.classList.toggle("qi-btn--active", S.picking);
}

function select(el) {
  S.selected = el;
  S.model = buildModel(el);
  S.picking = false;
  S.hover = null;
  syncInspectBtn();
  positionHighlight(el);
  S.nodes.label.classList.remove("qi-label--on");
  if (!S.expanded) setExpanded(true);
  else renderBody();
}

function buildModel(el) {
  const data = inspect(el, window);
  const css = buildCssSelector(el, document);
  return {
    header: data.header,
    dims: data.dims,
    boxModel: data.boxModel,
    keyStyles: data.keyStyles,
    colors: data.colors,
    counts: data.counts,
    selectors: { css, xpath: buildXPath(el, document) },
    cssRule: toCssRule(css, data.keyStyles),
  };
}

// --- events --------------------------------------------------------

function bindGlobalListeners() {
  add(document, "mousemove", onMove, true);
  add(document, "click", onClick, true);
  add(window, "keydown", onKey, true);
  add(window, "scroll", onScrollOrResize, true);
  add(window, "resize", onScrollOrResize, true);
}

function onMove(e) {
  if (!S.picking || S.moveRaf) return;
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
  if (e.composedPath().includes(S.host)) return; // our own controls
  e.preventDefault();
  e.stopPropagation();
  const el = elementUnder(e.clientX, e.clientY) || e.target;
  if (el) select(el);
}

function onKey(e) {
  if (e.key !== "Escape") return;
  e.stopPropagation();
  if (S.picking) {
    stopPicking();
  } else if (S.selected) {
    S.selected = null;
    S.model = null;
    hideHighlight();
    renderBody();
  } else {
    teardown();
  }
}

function onScrollOrResize() {
  const el = S.selected || S.hover;
  if (el) positionHighlight(el);
}

// --- highlight -----------------------------------------------------

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
  const cls = el.classList.length
    ? "." + Array.from(el.classList).slice(0, 2).join(".")
    : "";
  const id = el.id ? `#${el.id}` : "";
  const r = el.getBoundingClientRect();
  label.textContent = `${el.localName}${id}${cls}  ${Math.round(r.width)}×${Math.round(r.height)}`;
  label.classList.add("qi-label--on");
  label.style.left = `${Math.min(x + 12, window.innerWidth - label.offsetWidth - 8)}px`;
  label.style.top = `${Math.max(y - 28, 4)}px`;
}

// --- dragging -----------------------------------------------------

function onHeadPointerDown(e) {
  if (e.target.closest("button")) return;
  if (!S.expanded) {
    setExpanded(true);
    return;
  }
  const node = S.nodes.panel;
  const rect = node.getBoundingClientRect();
  const dx = e.clientX - rect.left;
  const dy = e.clientY - rect.top;
  // Pin to left/top at the current spot (no jump) before switching off `right`.
  node.style.left = `${rect.left}px`;
  node.style.top = `${rect.top}px`;
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

// --- helpers ----------------------------------------------------

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
