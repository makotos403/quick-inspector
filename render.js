/**
 * render.js — build the panel body from a plain, serializable model.
 *
 * Deliberately has no logic dependencies (no selectors.js / inspect.js /
 * cssrule.js): everything it needs is precomputed into `model` by whoever calls
 * it. That keeps it usable both in the page's shadow root and in the
 * Document Picture-in-Picture window, whose `document` differs — every element
 * is created via `container.ownerDocument`, tracked in `_doc`.
 *
 * model = {
 *   header:  { tag, id, classes: string[], text },
 *   dims:    { width, height },
 *   selectors: { css, xpath },
 *   boxModel:  { margin, border, padding: {top,right,bottom,left}, content: {width,height} },
 *   keyStyles: { prop, value }[],
 *   colors:  { color, backgroundColor, borderColor: { value, hex, transparent } },
 *   counts:  { kind, rows?, cols?, items?, repeat?: {tag,count}, depth },
 *   cssRule: string,
 *   media:   { kind, url, filename, fallback? } | null,
 * }
 *
 * `actions` = { copy(text), open(url), download(url, filename) }.
 */

const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

// The document new elements belong to — set from the container on every render,
// so the same code works in the page and in the PiP window. Rendering is
// synchronous, so a module-level value is safe.
let _doc = typeof document !== "undefined" ? document : null;

function h(tag, props = {}, ...kids) {
  const el = _doc.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v != null) el.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
}

/** Replace `container`'s content with a single centered message. */
export function renderMessage(container, text) {
  _doc = container.ownerDocument;
  container.replaceChildren(h("div", { class: "qi-hint", text }));
}

/**
 * Replace `container`'s content with the full inspection view.
 * @param {Element} container
 * @param {object} model
 * @param {{copy: Function, open: Function, download: Function}} actions
 */
export function renderModel(container, model, actions) {
  _doc = container.ownerDocument;
  const kids = [
    titleRow(model),
    section(t("secSelector"), [
      copyRow(t("labelCss"), model.selectors.css, actions.copy),
      copyRow(t("labelXpath"), model.selectors.xpath, actions.copy),
    ]),
  ];
  if (model.media) kids.push(section(t("secMedia"), [mediaView(model.media, actions)]));
  kids.push(
    section(t("secBox"), [boxModelView(model.boxModel)]),
    section(t("secStyles"), [stylesView(model, actions.copy)]),
    section(t("secColors"), [colorsView(model.colors, actions.copy)]),
    section(t("secStructure"), [structureView(model.counts)]),
  );
  container.replaceChildren(...kids);
}

// --- pieces ----------------------------------------------------------------

function titleRow(model) {
  const { tag, id, classes } = model.header;
  const cls = classes.length ? "." + classes.slice(0, 3).join(".") : "";
  return h(
    "div",
    { class: "qi-title" },
    h("code", { class: "qi-title__sel", text: `${tag}${id ? "#" + id : ""}${cls}` }),
    h("span", { class: "qi-title__dim", text: `${model.dims.width} × ${model.dims.height}` }),
  );
}

function section(name, children) {
  return h("div", { class: "qi-sec" }, h("div", { class: "qi-sec__h", text: name }), ...children);
}

function copyRow(label, value, onCopy) {
  return h(
    "div",
    { class: "qi-row qi-row--copy", title: value || "", onclick: () => value && onCopy(value) },
    h("span", { class: "qi-row__k", text: label }),
    h("code", { class: "qi-row__v", text: value || "—" }),
    h("span", { class: "qi-row__copy", text: "⧉" }),
  );
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
  const content = h("div", {
    class: "qi-box qi-box--content",
    text: `${bm.content.width}×${bm.content.height}`,
  });
  return layer("margin", bm.margin, layer("border", bm.border, layer("padding", bm.padding, content)));
}

function stylesView(model, onCopy) {
  const table = h(
    "div",
    { class: "qi-styles" },
    ...model.keyStyles.map(({ prop, value }) =>
      h(
        "div",
        { class: "qi-row" },
        h("span", { class: "qi-row__k", text: prop }),
        h("code", { class: "qi-row__v", text: value }),
      ),
    ),
  );
  const btn = h("button", {
    class: "qi-btn qi-btn--wide",
    text: t("copyRule"),
    onclick: () => onCopy(model.cssRule),
  });
  return h("div", {}, table, btn);
}

function colorsView(colors, onCopy) {
  const chip = (name, info) => {
    if (info.transparent && !info.hex) {
      return h(
        "div",
        { class: "qi-chip qi-chip--empty" },
        h("span", { class: "qi-chip__sw" }),
        h("span", { class: "qi-chip__k", text: name }),
        h("code", { class: "qi-chip__v", text: info.value }),
      );
    }
    const sw = h("span", { class: "qi-chip__sw" });
    sw.style.background = info.value;
    const out = info.hex || info.value;
    return h(
      "div",
      { class: "qi-chip", title: out, onclick: () => onCopy(out) },
      sw,
      h("span", { class: "qi-chip__k", text: name }),
      h("code", { class: "qi-chip__v", text: out }),
    );
  };
  return h(
    "div",
    { class: "qi-chips" },
    chip("color", colors.color),
    chip("background", colors.backgroundColor),
    chip("border", colors.borderColor),
  );
}

const MEDIA_KIND = {
  img: "labelImg",
  poster: "labelPoster",
  background: "labelBackground",
  youtube: "labelYouTube",
};

function mediaView(m, actions) {
  const preview = h("img", { class: "qi-media__img", src: m.url, alt: "", loading: "lazy" });
  if (m.fallback) {
    let swapped = false;
    preview.addEventListener("error", () => {
      if (!swapped) {
        swapped = true;
        preview.src = m.fallback;
      }
    });
  }
  return h(
    "div",
    { class: "qi-media" },
    preview,
    h(
      "div",
      { class: "qi-media__meta" },
      h("span", { class: "qi-media__kind", text: t(MEDIA_KIND[m.kind] || "labelImg") }),
      h("code", { class: "qi-media__url", title: m.url, text: m.url }),
    ),
    h(
      "div",
      { class: "qi-media__actions" },
      h("button", { class: "qi-btn", text: t("mediaOpen"), onclick: () => actions.open(m.url) }),
      h("button", { class: "qi-btn", text: t("mediaSave"), onclick: () => actions.download(m.url, m.filename) }),
      h("button", { class: "qi-btn", text: t("mediaCopy"), onclick: () => actions.copy(m.url) }),
    ),
  );
}

function structureView(c) {
  const parts = [];
  if (c.kind === "table") parts.push(t("structTable", [String(c.rows), String(c.cols)]));
  else if (c.kind === "list") parts.push(t("structItems", [String(c.items)]));
  else if (c.kind === "repeat")
    parts.push(t("structRepeat", [String(c.repeat.count), c.repeat.tag]));
  parts.push(t("structDepth", [String(c.depth)]));
  return h("div", { class: "qi-struct", text: parts.join("  ·  ") });
}
