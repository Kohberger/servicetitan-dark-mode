// features/deuglify/deuglify.js — ISOLATED world, every frame.
// Mirrors the De-uglify switch (chrome.storage.sync "st_feature_deuglify",
// toggled from the floating button's right-click menu) onto
// <html data-st-deuglify="on">. All De-uglify styling should be scoped under
// that attribute so turning it off leaves ServiceTitan exactly as shipped.
(function () {
  if (!/servicetitan/i.test(location.hostname)) return;

  const KEY = "st_feature_deuglify";
  const ATTR = "data-st-deuglify";

  // Same print-page gate as engine.js: printed invoices/estimates stay untouched.
  const p = location.pathname + location.search;
  if (/\/app\/api\/.*\/print\//i.test(p) ||
      /\/Invoice\/Print\//i.test(p) ||
      /\/Estimate\/Print\//i.test(p) ||
      /[?&]print=true/i.test(p)) return;

  const apply = (on) => {
    const el = document.documentElement;
    if (!el) return;
    if (on) el.setAttribute(ATTR, "on");
    else el.removeAttribute(ATTR);
  };

  try {
    chrome.storage.sync.get(KEY, (res) => apply(res?.[KEY] === true));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && KEY in changes) apply(changes[KEY].newValue === true);
    });
  } catch {}
})();
