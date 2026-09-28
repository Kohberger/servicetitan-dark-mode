/* Isolated-world lifecycle. Never patch the application's history or globals. */
(() => {
  if (window.__ST_BEAUTIFY__) return;
  const modules = new Map();
  let timer, navigationTimer, printing = false;
  let lastURL = location.href;
  const enabled = () => !printing && document.documentElement?.getAttribute('data-st-beautify') === 'on' &&
    !/\/app\/api\/.*\/print\/|\/(?:Invoice|Estimate)\/Print\/|[?&]print=true\b/i.test(location.pathname + location.search + location.hash);

  function sync() {
    clearTimeout(timer);
    timer = undefined;
    for (const state of modules.values()) {
      try {
        // Some routes change before their outgoing view is removed. Keep an
        // opted-in view styled through that gap, but never through disable/print.
        const root = !enabled() ? null : state.module.matches(location) ? state.module.findRoot()
          : state.module.retainUntilRemoved && state.root?.isConnected ? state.root : null;
        if (root === state.root) continue;
        const dispose = state.dispose;
        state.dispose = null;
        state.root = root;
        try { dispose?.(); } catch {}
        state.status = root ? 'mounting' : 'inactive';
        if (root) state.dispose = state.module.mount(root);
        state.status = root ? 'active' : 'inactive';
      } catch { state.status = 'error'; }
    }
  }
  function schedule() {
    if (timer === undefined) timer = setTimeout(sync, 40);
  }
  function flagChanged() {
    clearInterval(navigationTimer);
    navigationTimer = undefined;
    // pushState in MAIN world is not observable by patching isolated history.
    // Compare only the URL while enabled; DOM scans occur only on changes.
    if (document.documentElement?.getAttribute('data-st-beautify') === 'on') {
      lastURL = location.href;
      navigationTimer = setInterval(() => {
        if (lastURL !== location.href) { lastURL = location.href; sync(); }
      }, 100);
    }
    sync();
  }
  window.__ST_BEAUTIFY__ = {
    register(module) {
      if (modules.has(module.id)) return;
      modules.set(module.id, { module, root: null, dispose: null, status: 'inactive' });
      schedule();
    },
    status: () => [...modules.values()].map(({ module, status }) => ({ id: module.id, status }))
  };
  addEventListener('popstate', sync);
  addEventListener('hashchange', sync);
  addEventListener('beforeprint', () => { printing = true; sync(); });
  addEventListener('afterprint', () => { printing = false; sync(); });
  let html;
  const flagObserver = new MutationObserver(flagChanged);
  function watchFlag() {
    if (!document.documentElement || html === document.documentElement) return;
    html = document.documentElement;
    flagObserver.disconnect();
    flagObserver.observe(html, { attributes: true, attributeFilter: ['data-st-beautify'] });
    flagChanged();
  }
  new MutationObserver(records => {
    watchFlag();
    if (enabled() && records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1))) schedule();
  }).observe(document, { childList: true, subtree: true });
  watchFlag();
})();
