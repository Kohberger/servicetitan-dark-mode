/* Compact header using native controls in place, with secondary-link delegates.
   Never move nodes across Knockout's virtual binding/comment boundaries. */
(() => {
  // Header fields moved out of the header strip into the details panel, in panel order.
  const PANEL_FIELDS = ['invoice date', 'post date', 'batch', 'batch info', 'review status', 'period status', 'export status'];
  const HIDE = new Set(PANEL_FIELDS);
  const clean = text => text.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();

  // Colour hint for a status value. Negative wording is checked first so
  // "Not Exported" never reads as done.
  function tone(value) {
    const v = value.toLowerCase();
    if (!v) return 'none';
    if (/error|fail|reject|void/.test(v)) return 'danger';
    if (/^not\b|\bnot\s|pending|needs|unreviewed|required|hold|draft/.test(v)) return 'warning';
    if (/^(exported|posted|reviewed|approved|complete(d)?|closed|synced)$/.test(v)) return 'success';
    if (/^open$/.test(v)) return 'info';
    return 'neutral';
  }

  // Label, value and (optional) link of a native header field, read without
  // touching its bound nodes.
  // Knockout hides the alternative value with display:none (e.g. Batch shows
  // "Unbatched" and hides a "#0 - null" link), so skip hidden children.
  const shown = n => n.nodeType !== 1 || !(n.hidden || n.style.display === 'none');
  function readField(li) {
    const label = clean(li.querySelector(':scope > label')?.textContent || '');
    const value = clean([...li.childNodes]
      .filter(n => shown(n) && !(n.nodeType === 1 && (n.matches('label') || n.matches('i:first-child'))))
      .map(n => n.textContent).join(' '));
    const link = [...li.querySelectorAll('a')].find(shown) || null;
    let href = '';
    if (link?.hasAttribute('href')) {
      try {
        const url = new URL(link.getAttribute('href'), location.href);
        if (/^https?:$/.test(url.protocol)) href = url.href;
      } catch {}
    }
    return { label, key: label.toLowerCase(), value, link, href };
  }

  const mountControls = root => {
    const titleRow = root.querySelector(':scope > div > .row.m-b-1');
    const slot = titleRow?.querySelector(':scope > .span7');
    const panel = slot?.querySelector(':scope > .dropdown');
    const primary = root.querySelector(':scope > div > .pull-right.btn-group');
    if (!slot || !panel || !primary) return null;
    // Clean abandoned generated markup if a host framework cloned this subtree.
    root.querySelectorAll('.st-invoice-actions-toggle,.st-invoice-secondary-links,.st-invoice-details-panel').forEach(el => el.remove());
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

    // Details panel: the fields hidden from the header strip, shown as a panel at
    // the top of the main column (beside the action sidebar, above Job Summary).
    // Values are copied as text; links
    // are re-created (http/https only) or delegated to the native link.
    const meta = root.querySelector(':scope > div > .attributes');
    const detailsView = root.querySelector('.invoice-details-view');
    const details = document.createElement('section');
    details.className = 'st-invoice-details-panel';
    details.setAttribute('data-st-invoice-generated', '');
    details.setAttribute('aria-labelledby', `${panelId}-details-title`);
    const detailsHeading = document.createElement('div');
    detailsHeading.className = 'st-invoice-details-heading';
    const detailsTitle = document.createElement('h2');
    detailsTitle.id = `${panelId}-details-title`;
    detailsTitle.textContent = 'Posting & Status';
    detailsHeading.append(detailsTitle);
    const detailsList = document.createElement('dl');
    detailsList.className = 'st-invoice-details-list';
    details.append(detailsHeading, detailsList);
    let detailsSignature = '';

    function nativeLink(key) {
      for (const li of meta?.querySelectorAll(':scope > li') || []) {
        if (readField(li).key === key) return readField(li).link;
      }
      return null;
    }
    function renderItem(field) {
      const kind = /date$/.test(field.key) ? 'date' : /status$/.test(field.key) ? 'status' : 'text';
      const item = document.createElement('div');
      item.className = 'st-invoice-details-item';
      item.setAttribute('data-kind', kind);
      const dt = document.createElement('dt');
      dt.textContent = field.label;
      const dd = document.createElement('dd');
      if (!field.value) {
        dd.setAttribute('data-empty', '');
        dd.textContent = '—';
      } else if (kind === 'status') {
        const badge = document.createElement('span');
        badge.className = 'st-invoice-badge';
        badge.setAttribute('data-tone', tone(field.value));
        badge.textContent = field.value;
        dd.append(badge);
      } else if (field.href) {
        const a = document.createElement('a');
        a.href = field.href;
        a.textContent = field.value;
        dd.append(a);
      } else if (field.link) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'st-invoice-details-link';
        button.textContent = field.value;
        button.addEventListener('click', () => nativeLink(field.key)?.click(), options);
        dd.append(button);
      } else {
        dd.textContent = field.value;
      }
      item.append(dt, dd);
      return item;
    }
    function renderDetails() {
      const fields = [];
      for (const li of meta?.querySelectorAll(':scope > li') || []) {
        const field = readField(li);
        if (!HIDE.has(field.key) || li.hidden || li.style.display === 'none') continue;
        fields.push(field);
      }
      fields.sort((a, b) => PANEL_FIELDS.indexOf(a.key) - PANEL_FIELDS.indexOf(b.key));
      const signature = JSON.stringify(fields.map(f => [f.label, f.value, f.href, !!f.link]));
      if (signature !== detailsSignature) {
        detailsSignature = signature;
        detailsList.replaceChildren(...fields.map(renderItem));
      }
      if (!fields.length) details.remove();
      else if (detailsView && details.parentElement !== detailsView) {
        // Inherit ServiceTitan's `visible: !Editing()` behavior. The main
        // column also hosts the edit form and stays visible while editing.
        detailsView.prepend(details);
      }
    }

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
      renderDetails();
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
    if (meta) observer.observe(meta, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'hidden', 'href'] });
    update();
    const dispose = () => {
      disposed = true; clearTimeout(timer); observer.disconnect(); abort.abort();
      toggle.remove(); links.remove(); details.remove();
      if (!originalId && panel.id === panelId) panel.removeAttribute('id');
      for (const el of [root, panel, ...primary.children, ...root.querySelectorAll('[data-st-invoice-meta-hidden]')]) {
        for (const attr of ['data-st-invoice-header','data-st-invoice-actions-open','data-st-invoice-actions-panel','data-st-invoice-primary','data-st-invoice-secondary','data-st-invoice-meta-hidden']) el.removeAttribute(attr);
      }
    };
    dispose.isCurrent = () =>
      root.querySelector(':scope > div > .row.m-b-1 > .span7') === slot &&
      slot.querySelector(':scope > .dropdown') === panel &&
      root.querySelector(':scope > div > .pull-right.btn-group') === primary &&
      root.querySelector(':scope > div > .attributes') === meta &&
      root.querySelector('.invoice-details-view') === detailsView &&
      toggle.parentElement === slot && links.parentElement === panel;
    return dispose;
  };
  // Knockout can rebuild the header while keeping the invoice root and URL.
  // Observe that stable root, and rebind only when our actual controls change.
  const mountHeader = root => {
    let dispose, timer, disposed = false;
    function reconcile() {
      timer = undefined;
      if (disposed || dispose?.isCurrent()) return;
      dispose?.();
      dispose = mountControls(root);
    }
    const observer = new MutationObserver(() => {
      if (!disposed && timer === undefined) timer = setTimeout(reconcile, 50);
    });
    observer.observe(root, { childList: true, subtree: true });
    reconcile();
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      dispose?.();
    };
  };
  mountHeader.tone = tone; // exposed for tests/beautify.test.js
  window.__ST_BEAUTIFY_INVOICE_HEADER__ = mountHeader;
})();
