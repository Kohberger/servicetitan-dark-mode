// ISOLATED world, every frame. Global, opt-in Beautify preference.
(() => {
  if (!/servicetitan/i.test(location.hostname)) return;
  const KEY = 'st_feature_beautify';
  const ATTR = 'data-st-beautify';
  if (/\/app\/api\/.*\/print\/|\/(?:Invoice|Estimate)\/Print\/|[?&]print=true\b/i.test(location.pathname + location.search + location.hash)) return;
  let on = false, revision = 0;
  const apply = () => {
    const el = document.documentElement;
    if (!el) return;
    if (on) el.setAttribute(ATTR, 'on');
    else el.removeAttribute(ATTR);
  };
  // document_start can precede the root element.
  const ready = new MutationObserver(() => {
    if (document.documentElement) { apply(); ready.disconnect(); }
  });
  if (!document.documentElement) ready.observe(document, { childList: true, subtree: true });
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && KEY in changes) {
        revision++;
        on = changes[KEY].newValue === true;
        apply();
      }
    });
    const initialRevision = revision;
    chrome.storage.sync.get(KEY, result => {
      if (revision !== initialRevision) return;
      on = result?.[KEY] === true;
      apply();
    });
  } catch {}
})();
