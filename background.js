/**
 * background.js — service worker (classic script).
 *
 * Two jobs:
 *   1. On toolbar click, inject `bootstrap.js` into the active tab, which loads
 *      `content.js` as an ES module (it builds the UI, or tears it down).
 *   2. Run `chrome.downloads.download` on behalf of `content.js` (the API is
 *      not exposed to content scripts) when the user saves a thumbnail.
 *
 * Permissions: "activeTab" + "scripting" (the pair is required — "activeTab"
 * alone does not allow `scripting.executeScript`) and "downloads". No host
 * permission: injection only touches the tab the user acted on.
 *
 * No state is kept here (MV3 workers are short-lived; see CONVENTIONS.md §7).
 */

const INJECTABLE = /^(https?|file):/i;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !INJECTABLE.test(tab.url || "")) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["bootstrap.js"],
    });
  } catch (err) {
    console.error("[Quick Inspector] injection failed:", err);
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "qi:download" && /^(https?|data|blob):/i.test(msg.url || "")) {
    chrome.downloads.download({ url: msg.url, filename: msg.filename || undefined });
  }
});
