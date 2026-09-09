/**
 * inspect.js — turn a DOM element into the data shown in the popover.
 *
 * Pure: reads the element and its computed style, returns a plain object.
 * No `chrome.*`, no DOM mutation. Unit-tested in dev/inspect.test.mjs
 * (the parts that don't need a live layout engine: countStructure, rgbToHex,
 * collapseBox, findMedia, youTubeThumb, bgImageUrl).
 */

const KEY_STYLE_ORDER = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "box-sizing",
  "width",
  "height",
  "margin",
  "padding",
  "border",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "color",
  "background-color",
  "background-image",
  "z-index",
  "opacity",
  "overflow",
];

/**
 * @param {Element} el
 * @param {Window} [win]
 */
export function inspect(el, win = el.ownerDocument.defaultView) {
  const cs = win.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  return {
    header: {
      tag: el.localName,
      id: el.id || "",
      classes: Array.from(el.classList),
      text: shortText(el),
    },
    dims: { width: Math.round(rect.width), height: Math.round(rect.height) },
    boxModel: boxModel(cs, rect),
    keyStyles: keyStyles(el, cs, win),
    colors: {
      color: colorInfo(cs.color),
      backgroundColor: colorInfo(cs.backgroundColor),
      borderColor: colorInfo(cs.borderTopColor),
    },
    counts: countStructure(el),
    media: findMedia(el, win),
  };
}

/**
 * A downloadable image on or under the element: an <img>, a <video poster>, a
 * CSS background-image, or a YouTube embed's thumbnail. Returns
 * { kind, url, filename, fallback? } or null. Pure.
 * @param {Element} el
 * @param {Window} [win]
 */
export function findMedia(el, win = el.ownerDocument && el.ownerDocument.defaultView) {
  const doc = el.ownerDocument;
  const tag = el.localName;

  if (tag === "img") {
    const url = pickImgSrc(el);
    if (url) return media("img", url, doc);
  }
  if (tag === "video") {
    const poster = attr(el, "poster");
    if (poster) return media("poster", poster, doc);
  }
  if (tag === "iframe") {
    const yt = youTubeThumb(attr(el, "src"));
    if (yt) return yt;
  }

  if (win) {
    try {
      const bg = bgImageUrl(win.getComputedStyle(el).backgroundImage);
      if (bg) return media("background", bg, doc);
    } catch {}
  }

  for (const f of all(el, "iframe")) {
    const yt = youTubeThumb(attr(f, "src"));
    if (yt) return yt;
  }
  for (const v of all(el, "video")) {
    const poster = attr(v, "poster");
    if (poster) return media("poster", poster, doc);
  }
  const imgs = all(el, "img");
  if (
    imgs.length &&
    (imgs.length === 1 || ["figure", "picture", "a"].includes(tag))
  ) {
    const url = pickImgSrc(imgs[0]);
    if (url) return media("img", url, doc);
  }
  return null;
}

/** Largest source for an <img>: currentSrc, else the widest srcset entry, else src. */
export function pickImgSrc(img) {
  if (img.currentSrc) return img.currentSrc;
  const srcset = attr(img, "srcset");
  if (srcset) {
    const best = srcset
      .split(",")
      .map((s) => s.trim())
      .map((s) => {
        const [u, d] = s.split(/\s+/);
        return { u, n: d ? parseFloat(d) : 1 };
      })
      .filter((e) => e.u)
      .sort((a, b) => b.n - a.n)[0];
    if (best) return best.u;
  }
  return attr(img, "src") || img.src || "";
}

/** YouTube watch/embed/short URL → its thumbnail image, or null. */
export function youTubeThumb(url) {
  if (!url) return null;
  const res = [
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|v\/)([\w-]{11})/,
  ];
  let id = null;
  for (const re of res) {
    const m = re.exec(url);
    if (m) {
      id = m[1];
      break;
    }
  }
  if (!id) return null;
  return {
    kind: "youtube",
    url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    fallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    filename: `${id}.jpg`,
  };
}

/** First url(...) inside a computed background-image value, or null. */
export function bgImageUrl(value) {
  if (!value || value === "none") return null;
  const m = /url\((['"]?)([^'")]+)\1\)/.exec(value);
  return m ? m[2] : null;
}

function media(kind, url, doc) {
  let abs = url;
  try {
    abs = new URL(url, (doc && doc.baseURI) || undefined).href;
  } catch {}
  return { kind, url: abs, filename: filenameFromUrl(abs) };
}

function filenameFromUrl(url, fallback = "image.jpg") {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean).pop();
    return seg && /\.[a-z0-9]{2,5}$/i.test(seg) ? seg : fallback;
  } catch {
    return fallback;
  }
}

function attr(el, name) {
  return el.getAttribute ? el.getAttribute(name) : el[name];
}

function all(el, tag) {
  return el.querySelectorAll ? Array.from(el.querySelectorAll(tag)) : [];
}

/**
 * Structure summary. Only the relevant fields are populated.
 * @param {Element} el
 */
export function countStructure(el) {
  const out = { kind: "", depth: depthOf(el) };

  if (el.localName === "table") {
    const rows = el.querySelectorAll("tr");
    let cols = 0;
    for (const tr of rows) {
      cols = Math.max(cols, tr.querySelectorAll("td, th").length);
    }
    out.kind = "table";
    out.rows = rows.length;
    out.cols = cols;
    return out;
  }

  if (el.localName === "ul" || el.localName === "ol") {
    out.kind = "list";
    out.items = Array.from(el.children).filter(
      (c) => c.localName === "li",
    ).length;
    return out;
  }

  const kids = Array.from(el.children);
  if (kids.length >= 3) {
    const tally = new Map();
    for (const c of kids) tally.set(c.localName, (tally.get(c.localName) || 0) + 1);
    const [tag, count] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count >= 3) {
      out.kind = "repeat";
      out.repeat = { tag, count };
    }
  }
  return out;
}

/** rgb()/rgba() → "#rrggbb" or "#rrggbbaa". Returns "" if not parseable. */
export function rgbToHex(str) {
  const m = /rgba?\(([^)]+)\)/.exec(str || "");
  if (!m) return "";
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return "";
  const [r, g, b] = parts.slice(0, 3).map((n) => clampByte(parseFloat(n)));
  let hex = "#" + [r, g, b].map(hex2).join("");
  if (parts.length >= 4) {
    const a = Math.round(clamp01(parseFloat(parts[3])) * 255);
    if (a !== 255) hex += hex2(a);
  }
  return hex;
}

/** Collapse "10px 10px 10px 10px" → "10px"; "1px 2px 1px 2px" → "1px 2px". */
export function collapseBox(t, r, b, l) {
  if (t === r && r === b && b === l) return t;
  if (t === b && l === r) return `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

// --- internals ---------------------------------------------------------------

function boxModel(cs, rect) {
  const side = (prop) => ({
    top: px(cs.getPropertyValue(`${prop}-top${prop === "border" ? "-width" : ""}`)),
    right: px(cs.getPropertyValue(`${prop}-right${prop === "border" ? "-width" : ""}`)),
    bottom: px(cs.getPropertyValue(`${prop}-bottom${prop === "border" ? "-width" : ""}`)),
    left: px(cs.getPropertyValue(`${prop}-left${prop === "border" ? "-width" : ""}`)),
  });
  return {
    margin: side("margin"),
    border: side("border"),
    padding: side("padding"),
    content: { width: Math.round(rect.width), height: Math.round(rect.height) },
  };
}

function keyStyles(el, cs, win) {
  const rows = [];
  const positioned = cs.position !== "static";
  const parentDisplay = el.parentElement
    ? win.getComputedStyle(el.parentElement).display
    : "";
  const inFlexGrid = /flex|grid/.test(parentDisplay);

  for (const prop of KEY_STYLE_ORDER) {
    if (["top", "right", "bottom", "left"].includes(prop)) {
      if (!positioned) continue;
      const v = cs.getPropertyValue(prop);
      if (v === "auto") continue;
      rows.push({ prop, value: v });
      continue;
    }
    if (prop === "margin" || prop === "padding") {
      rows.push({
        prop,
        value: collapseBox(
          cs.getPropertyValue(`${prop}-top`),
          cs.getPropertyValue(`${prop}-right`),
          cs.getPropertyValue(`${prop}-bottom`),
          cs.getPropertyValue(`${prop}-left`),
        ),
      });
      continue;
    }
    if (prop === "border") {
      const w = cs.borderTopWidth;
      if (parseFloat(w) > 0) {
        rows.push({ prop, value: `${w} ${cs.borderTopStyle} ${cs.borderTopColor}` });
      }
      continue;
    }
    if (prop === "background-image") {
      const v = cs.backgroundImage;
      if (v && v !== "none") rows.push({ prop, value: v });
      continue;
    }
    if (prop === "z-index") {
      if (cs.zIndex !== "auto") rows.push({ prop, value: cs.zIndex });
      continue;
    }
    if (prop === "opacity") {
      if (cs.opacity !== "1") rows.push({ prop, value: cs.opacity });
      continue;
    }
    rows.push({ prop, value: cs.getPropertyValue(prop) });
  }

  if (inFlexGrid) {
    rows.push({ prop: "flex", value: cs.flex });
  }
  return rows;
}

function colorInfo(value) {
  const transparent =
    value === "transparent" ||
    value === "rgba(0, 0, 0, 0)" ||
    /,\s*0\)$/.test(value);
  return { value, hex: rgbToHex(value), transparent };
}

function depthOf(el, cap = 50) {
  let max = 0;
  const walk = (node, d) => {
    if (d > max) max = d;
    if (d >= cap) return;
    for (const c of node.children) walk(c, d + 1);
  };
  walk(el, 0);
  return max;
}

function shortText(el) {
  const t = (el.textContent || "").trim().replace(/\s+/g, " ");
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

function px(v) {
  return Math.round(parseFloat(v) || 0);
}
function hex2(n) {
  return n.toString(16).padStart(2, "0");
}
function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n || 0)));
}
function clamp01(n) {
  return Math.max(0, Math.min(1, isNaN(n) ? 1 : n));
}
