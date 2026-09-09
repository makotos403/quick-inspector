/**
 * content.js — the in-page UI (ES module, loaded by bootstrap.js).
 *
 * A draggable panel lives inside a closed shadow root on a single fixed host
 * element. It can be promoted to a Document Picture-in-Picture window (📌),
 * which floats on top of every window and does not cover the page at all; the
 * picker keeps running in the page and results render into the PiP document.
 * The page DOM gains exactly one node (the host) and nothing here reflows it.
 *
 * Exported `toggle()` flips the tool on and off — bootstrap.js calls it on
 * every toolbar click, and the module stays cached between clicks.
 */

import { buildCssSelector, buildXPath } from "./selectors.js";
import { inspect } from "./inspect.js";
import { toCssRule } from "./cssrule.js";
import { renderModel, renderMessage } from "./render.js";

const HOST_ID = "quick-inspector-host";
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

/** hyperscript helper bound to a specific document (page or PiP). */
const mk =
  (doc) =>
  (tag, props = {}, ...kids) => {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v != null) el.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) el.append(kid);
    return el;
  };
const h = mk(document);

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
    moved: false,
    moveRaf: 0,
    pip: null,
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
  if (S.pip) {
    S.pip.removeEventListener("pagehide", demoteFromPip);
    try {
      S.pip.close();
    } catch {}
  }
  for (const [target, type, fn, opts] of S.listeners) {
    target.removeEventListener(type, fn, opts);
  }
  S.host.remove();
  S = null;
}

async function injectStyles(root) {
  const style = document.createElement("style");
  style.textContent = await loadCss("content.css", "sections.css");
  root.appendChild(style);
}

async function loadCss(...files) {
  const parts = await Promise.all(
    files.map((f) =>
      fetch(chrome.runtime.getURL(f))
        .then((r) => r.text())
        .catch(() => ""),
    ),
  );
  return parts.join("\n");
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
  const pipBtn = h("button", {
    class: "qi-btn qi-btn--ghost qi-head-btn qi-pip-btn",
    text: "📌",
    onclick: promoteToPip,
  });
  if (pipSupported()) {
    pipBtn.title = t("pipOpen");
  } else {
    pipBtn.disabled = true;
    pipBtn.title = t("pipUnavailable");
  }
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

  const brandName = h("span", { class: "qi-brand__name", text: t("barInspect") });
  const head = h(
    "div",
    { class: "qi-panel__head", onpointerdown: onHeadPointerDown },
    h("span", { class: "qi-brand" }, h("span", { class: "qi-brand__mark", text: "🔍" }), brandName),
    inspectBtn,
    h("span", { class: "qi-spacer" }),
    pipBtn,
    collapseBtn,
    closeBtn,
  );
  const body = h("div", { class: "qi-panel__body" });
  const panel = h("div", { class: "qi-panel" }, head, body);
  root.append(panel);

  S.nodes.panel = panel;
  S.nodes.body = body;
  S.nodes.inspectBtn = inspectBtn;
  S.nodes.brandName = brandName;

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
    clampPanel();
  }
}

// The panel is always right-anchored (like the toolbar popup it came from), so
// collapsing shrinks it toward the top-right. This only nudges it back on
// screen if expanding from a dragged handle position would clip it.
function clampPanel() {
  if (!S.moved) return;
  const p = S.nodes.panel;
  requestAnimationFrame(() => {
    if (!S) return;
    const r = p.getBoundingClientRect();
    let right = parseFloat(p.style.right) || 0;
    if (r.left < 8) right = Math.max(0, right - (8 - r.left));
    p.style.right = `${right}px`;
    const maxTop = window.innerHeight - r.height - 8;
    if (r.top > maxTop) p.style.top = `${Math.max(8, maxTop)}px`;
  });
}

const ACTIONS = { copy, open: openUrl, download: downloadUrl };

function renderBody() {
  const target = S.pip ? S.nodes.pipBody : S.expanded ? S.nodes.body : null;
  if (!target) return;
  if (S.selected && S.model) {
    renderModel(target, S.model, ACTIONS);
  } else {
    renderMessage(target, S.picking ? t("hintPicking") : t("hintIdle"));
  }
}

function openUrl(url) {
  if (url) window.open(url, "_blank", "noopener");
}

function downloadUrl(url, filename) {
  if (!url) return;
  Promise.resolve(chrome.runtime.sendMessage({ type: "qi:download", url, filename })).catch(
    () => {},
  );
  toast(t("mediaSaving"));
}

// --- Document Picture-in-Picture --------------------------------------

function pipSupported() {
  return "documentPictureInPicture" in window && window.isSecureContext;
}

async function promoteToPip() {
  if (S.pip || !pipSupported()) return;
  let pip;
  try {
    pip = await window.documentPictureInPicture.requestWindow({ width: 380, height: 560 });
  } catch {
    return; // NotAllowedError (no gesture), NotSupportedError (disabled), …
  }
  S.pip = pip;

  const style = pip.document.createElement("style");
  style.textContent = await loadCss("sections.css", "pip.css");
  (pip.document.head || pip.document.documentElement).append(style);
  pip.document.title = t("appName");
  pip.document.documentElement.lang = chrome.i18n.getUILanguage();

  const ph = mk(pip.document);
  const pipInspectBtn = ph("button", {
    class: "qi-btn qi-btn--primary qi-inspect",
    onclick: onInspectToggle,
  });
  const pipBody = ph("div", { class: "qi-pip__body" });
  pip.document.body.append(
    ph(
      "div",
      { class: "qi-pip" },
      ph(
        "div",
        { class: "qi-pip__head" },
        ph("span", { class: "qi-brand" }, ph("span", { class: "qi-brand__mark", text: "🔍" }), ph("span", { class: "qi-brand__name", text: t("appName") })),
        pipInspectBtn,
        ph("span", { class: "qi-spacer" }),
      ),
      pipBody,
    ),
  );

  S.nodes.pipBody = pipBody;
  S.nodes.pipInspectBtn = pipInspectBtn;

  // Dock the in-page panel to a handle; clicking it re-focuses the PiP window.
  S.nodes.panel.classList.add("qi-panel--docked");
  S.nodes.brandName.textContent = t("pipDocked");
  S.expanded = false;

  syncInspectBtn();
  renderBody();

  pip.addEventListener("pagehide", demoteFromPip, { once: true });
}

function demoteFromPip() {
  if (!S) return;
  S.pip = null;
  S.nodes.pipBody = null;
  S.nodes.pipInspectBtn = null;
  S.nodes.panel.classList.remove("qi-panel--docked");
  S.nodes.brandName.textContent = t("barInspect");
  setExpanded(true);
  syncInspectBtn();
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
  for (const b of [S.nodes.inspectBtn, S.nodes.pipInspectBtn]) {
    if (!b) continue;
    b.textContent = S.picking ? t("barStop") : t("barInspect");
    b.classList.toggle("qi-btn--active", S.picking);
  }
}

function select(el) {
  S.selected = el;
  S.model = buildModel(el);
  S.picking = false;
  S.hover = null;
  syncInspectBtn();
  positionHighlight(el);
  S.nodes.label.classList.remove("qi-label--on");
  if (!S.pip && !S.expanded) setExpanded(true);
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

const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag

function onHeadPointerDown(e) {
  if (e.target.closest("button")) return;
  e.preventDefault();

  const node = S.nodes.panel;
  const startX = e.clientX;
  const startY = e.clientY;
  const rect = node.getBoundingClientRect();
  const offX = rect.right - startX; // cursor → panel right edge
  const dy = startY - rect.top;
  let dragging = false;

  const move = (ev) => {
    if (!dragging) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
      dragging = true;
      S.moved = true;
      // Keep right-anchored (no jump) so collapsing still shrinks toward the right.
      node.style.left = "auto";
      node.style.top = `${rect.top}px`;
      node.style.right = `${window.innerWidth - rect.right}px`;
    }
    const right = window.innerWidth - (ev.clientX + offX);
    node.style.right = `${Math.max(0, right)}px`;
    node.style.top = `${Math.max(0, ev.clientY - dy)}px`;
  };
  const up = () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    if (dragging) return;
    // A press without a drag: focus the PiP window, or expand the handle.
    if (S.pip) S.pip.focus();
    else if (!S.expanded) setExpanded(true);
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

function toast(message = t("copied")) {
  const container = S.pip ? S.pip.document.body : S.root;
  let el = container.querySelector(".qi-toast");
  if (!el) {
    el = (S.pip ? mk(S.pip.document) : h)("div", { class: "qi-toast" });
    container.append(el);
  }
  el.textContent = message;
  el.classList.add("qi-toast--on");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("qi-toast--on"), 1200);
}
