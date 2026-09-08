/**
 * cssrule.js — render inspect()'s keyStyles as a copy-pasteable CSS rule.
 *
 * Pure. Drops declarations that carry no visual information (initial-ish
 * values, fully transparent colors, zero box metrics) so the output is the
 * short list a person would actually paste. Unit-tested in dev/cssrule.test.mjs.
 */

const NOISE_VALUES = new Set([
  "none",
  "auto",
  "normal",
  "0px",
  "0",
  "transparent",
  "rgba(0, 0, 0, 0)",
]);

// Values that are the property's own default — no information when pasted.
const NOISE_BY_PROP = {
  position: "static",
  "box-sizing": "content-box",
  overflow: "visible",
  "font-weight": "400",
};

/**
 * @param {string} selector
 * @param {{prop: string, value: string}[]} keyStyles
 * @returns {string}
 */
export function toCssRule(selector, keyStyles) {
  const decls = [];
  for (const { prop, value } of keyStyles) {
    const v = (value || "").trim();
    if (!v || NOISE_VALUES.has(v) || NOISE_BY_PROP[prop] === v) continue;
    if ((prop === "margin" || prop === "padding") && /^0(px)?( 0(px)?)*$/.test(v)) {
      continue;
    }
    decls.push(`  ${prop}: ${v};`);
  }
  const sel = selector || "*";
  return decls.length ? `${sel} {\n${decls.join("\n")}\n}` : `${sel} {\n}`;
}
