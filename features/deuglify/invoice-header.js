/* Compact header using native controls in place, with secondary-link delegates.
   Never move nodes across Knockout's virtual binding/comment boundaries. */
(() => {
  const HIDE = new Set(['batch', 'batch info', 'review status', 'period status', 'export status', 'post date', 'invoice date']);
  const clean = text => text.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();

  window.__ST_DEUGLIFY_INVOICE_HEADER__ = root => {
    const titleRow = root.querySelector(':scope > div > .row.m-b-1');
    const slot = titleRow?.querySelector(':scope > .span7');
    const panel = slot?.querySelector(':scope > .dropdown');
    const primary = root.querySelector(':scope > div > .pull-right.btn-group');
    if (!slot || !panel || !primary) return () => {};
    // Clean abandoned generated markup if a host framework cloned this subtree.
    root.querySelectorAll('[data-st-invoice-generated]').forEach(el => el.remove());
    const abort = new AbortController();
    const options = { signal: abort.signal };
    const proxies = new Map();
    const originalId = panel.getAttribute('id');
    const panelId = originalId || `st-invoice-actions-${crypto.randomUUID()}`;
    if (!originalId) panel.id = panelId;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'st-invoice-actions-toggle';
    toggle.setAttribute('data-st-invoice-generated', '');
    toggle.setAttribute('aria-controls', panelId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Actions';
    const caret = document.createElement('span');
    caret.setAttribute('aria-hidden', 'true');
    caret.className = 'st-invoice-actions-chevron';
    toggle.append(caret);
    slot.prepend(toggle);
    const links = document.createElement('div');
    links.setAttribute('data-st-invoice-generated', '');
    links.className = 'st-invoice-secondary-links';
    panel.append(links);
    panel.setAttribute('data-st-invoice-actions-panel', '');
    root.setAttribute('data-st-invoice-header', '');
    root.removeAttribute('data-st-invoice-actions-open');
    let disposed = false;
    let timer;

    function setOpen(open, focusToggle = false) {
      root.toggleAttribute('data-st-invoice-actions-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (focusToggle) toggle.focus();
    }
    function focusable() {
      return [...panel.querySelectorAll('button,a[href],a[tabindex],input,select,textarea')]
        .filter(el => !el.disabled && !el.matches('.disabled,[aria-disabled="true"]') && el.getClientRects().length);
    }
    toggle.addEventListener('click', () => setOpen(!root.hasAttribute('data-st-invoice-actions-open')), options);
    toggle.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      setOpen(true);
      const items = focusable();
      (event.key === 'ArrowUp' ? items.at(-1) : items[0])?.focus();
    }, options);
    slot.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false, true); }
      if (event.target.matches('input,select,textarea')) return;
      if (panel.contains(event.target) && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = focusable();
        const index = items.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        event.preventDefault(); items[next]?.focus();
      }
    }, options);
    document.addEventListener('pointerdown', event => { if (!slot.contains(event.target)) setOpen(false); }, options);
    document.addEventListener('focusin', event => { if (!slot.contains(event.target)) setOpen(false); }, options);
    // Capture catches native handlers that stop bubbling. Wait until those handlers
    // have run; leave native inline submenus/forms open instead of swallowing them.
    panel.addEventListener('click', event => {
      if (!event.target.closest('button,a') || event.target.closest('.dropdown-menu')) return;
      setTimeout(() => {
        if (disposed) return;
        const submenu = [...panel.querySelectorAll('.dropdown-menu')].some(el => el.getClientRects().length);
        if (!submenu) setOpen(false);
      }, 0);
    }, { capture: true, signal: abort.signal });

    function update() {
      timer = undefined;
      if (disposed) return;
      for (const li of root.querySelectorAll(':scope > div > .attributes > li')) {
        const label = clean(li.querySelector('label')?.textContent || '').toLowerCase();
        li.toggleAttribute('data-st-invoice-meta-hidden', HIDE.has(label));
      }
      const sources = [...primary.children];
      for (const [source, proxy] of proxies) {
        if (!sources.includes(source)) { proxy.remove(); proxies.delete(source); }
      }
      for (const source of sources) {
        const label = clean(source.textContent);
        const binding = source.getAttribute('data-bind') || '';
        const kind = /CanEmail|\/Invoice\/Email\//.test(binding) || /^Email$/i.test(label) ? 'email'
          : /SendSmsText/.test(binding) || /^SMS$/i.test(label) ? 'sms'
          : /AccPrintTemplatePicker|CanPrint|PrintInvoice/.test(binding) || /^Print(?:\s|$)/i.test(label) ? 'print' : '';
        if (kind) {
          source.setAttribute('data-st-invoice-primary', kind);
          source.removeAttribute('data-st-invoice-secondary');
          proxies.get(source)?.remove(); proxies.delete(source);
          continue;
        }
        source.removeAttribute('data-st-invoice-primary');
        source.setAttribute('data-st-invoice-secondary', '');
        // Visibility here must use native state, not the CSS hiding this source.
        const nativeHidden = source.hidden || source.style.display === 'none';
        let proxy = proxies.get(source);
        if (!proxy) {
          proxy = document.createElement('button');
          proxy.type = 'button';
          proxy.className = 'st-invoice-secondary-action';
          proxy.addEventListener('click', () => {
            if (proxy.disabled || !source.isConnected) return;
            source.click(); // Invoke its existing bound behavior; no API or copied data.
          }, options);
          proxies.set(source, proxy); links.append(proxy);
        }
        if (proxy.textContent !== label) proxy.textContent = label;
        if (proxy.hidden !== nativeHidden) proxy.hidden = nativeHidden;
        const disabled = source.matches(':disabled,.disabled,[aria-disabled="true"]') || !!source.querySelector('.btn.disabled');
        if (proxy.disabled !== disabled) proxy.disabled = disabled;
      }
    }
    function schedule() { if (!disposed && timer === undefined) timer = setTimeout(update, 50); }
    const observer = new MutationObserver(records => {
      // Ignore our generated proxy text/attributes so updates settle in one pass.
      if (records.some(r => !r.target.closest?.('[data-st-invoice-generated]'))) schedule();
    });
    observer.observe(primary, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'disabled', 'aria-disabled', 'hidden'] });
    const meta = root.querySelector(':scope > div > .attributes');
    if (meta) observer.observe(meta, { childList: true, subtree: true, characterData: true });
    update();
    return () => {
      disposed = true; clearTimeout(timer); observer.disconnect(); abort.abort();
      toggle.remove(); links.remove();
      if (!originalId && panel.id === panelId) panel.removeAttribute('id');
      for (const el of [root, panel, ...primary.children, ...root.querySelectorAll('[data-st-invoice-meta-hidden]')]) {
        for (const attr of ['data-st-invoice-header','data-st-invoice-actions-open','data-st-invoice-actions-panel','data-st-invoice-primary','data-st-invoice-secondary','data-st-invoice-meta-hidden']) el.removeAttribute(attr);
      }
    };
  };
})();
