/* Job contacts: compact addresses and an expandable contact list.
   Native controls stay in place, including their application event handlers. */
(() => {
  const ROW = '.qa-contact-mobilephone,.qa-contact-phone,.qa-contact-email';
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const button = (text, action) => {
    const b = el('button', 'stjc-button', text); b.type = 'button';
    b.addEventListener('click', action); return b;
  };
  function readContacts(root) {
    const groups = new Map();
    for (const row of root.querySelectorAll(ROW)) {
      const a = row.querySelector('a[href^="tel:"],a[href^="mailto:"]');
      if (!a) continue;
      const column = row.closest('.GridColumn');
      const scope = column?.querySelector('.qa-location-name') ? 'Service location' : 'Bill to';
      const memo = row.querySelector('.Tag__body')?.textContent.trim().replace(/\s+/g, ' ') || '';
      // Equal memo labels are grouped for presentation only, within their source.
      // Unnamed endpoints remain separate; do not infer a primary contact or role.
      const label = /[\p{L}\p{N}]/u.test(memo) ? memo : 'Unlabeled contact';
      // The native label exposes titles as "Name : Title", including a
      // trailing separator when Title is empty. Never display that separator.
      const parts = label.match(/^([^:]+?)\s*:\s*(.*)$/);
      const name = parts ? parts[1].trim() : label;
      const title = parts ? parts[2].trim() : '';
      const key = scope + ':' + (label === 'Unlabeled contact' ? a.getAttribute('href') : label);
      if (!groups.has(key)) groups.set(key, { name, title, scope, channels: [] });
      groups.get(key).channels.push({ source: a, href: a.getAttribute('href'), value: a.textContent.trim(), type: a.getAttribute('href').startsWith('tel:') ? 'Phone' : 'Email' });
    }
    // ServiceTitan can repeat the same contact in both address columns. Only
    // collapse complete matches: a shared name or phone alone is not identity.
    const seen = new Set();
    return [...groups.values()].filter(contact => {
      const endpoints = [...new Set(contact.channels.map(ch => ch.href))].sort();
      const key = JSON.stringify([contact.name, contact.title, endpoints]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function avatar(contact) {
    const initials = contact.name === 'Unlabeled contact' ? '—' : contact.name.split(/\s+/).slice(0, 2).map(s => s[0]).join('');
    const a = el('span', 'stjc-avatar', initials); a.setAttribute('aria-hidden', 'true'); return a;
  }
  function identity(c) {
    const wrap = el('div', 'stjc-identity'); const text = el('div');
    text.append(el('strong', '', c.name));
    if (c.title) text.append(el('span', 'stjc-muted stjc-title', c.title));
    wrap.append(avatar(c), text); return wrap;
  }
  function channelIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('stjc-channel-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', type === 'Phone'
      ? 'M6 3H3v3c0 8.3 6.7 15 15 15h3v-6l-5-1-2 2a12 12 0 0 1-6-6l2-2-1-5H6Z'
      : 'M3 5h18v14H3V5Zm0 1 9 7 9-7');
    svg.append(path); return svg;
  }
  function channels(c) {
    const wrap = el('div', 'stjc-channels');
    for (const ch of c.channels) {
      const a = el('a', 'stjc-channel'); a.href = ch.href;
      a.append(channelIcon(ch.type), el('span', '', ch.value));
      a.setAttribute('aria-label', `${ch.type}: ${ch.value}`);
      a.addEventListener('click', event => {
        // React's delegated handler belongs to the original link. A fresh tel:
        // link bypasses its call confirmation; activate the native link instead.
        event.preventDefault();
        event.stopPropagation();
        if (ch.source.isConnected) ch.source.click();
      });
      wrap.append(a);
    }
    return wrap;
  }
  function person(c) {
    const row = el('div', 'stjc-person'); row.append(identity(c), channels(c)); return row;
  }
  function build(contacts, state) {
    const host = el('section', 'stjc-contacts');
    const header = el('div', 'stjc-heading');
    header.append(el('h2', '', 'Contacts'), el('span', 'stjc-muted', String(contacts.length)));
    const list = el('div', 'stjc-list');
    host.append(header, list);
    const items = contacts.map(person);
    items.forEach((item, i) => { item.hidden = !state.expanded && i >= 3; list.append(item); });
    if (contacts.length > 3) {
      const toggle = button('', () => {
        state.expanded = !state.expanded;
        items.forEach((item, i) => { item.hidden = !state.expanded && i >= 3; });
        update();
      });
      function update() {
        toggle.textContent = state.expanded ? 'Show fewer contacts' : `Show all ${contacts.length} contacts`;
        toggle.setAttribute('aria-expanded', String(state.expanded));
      }
      toggle.classList.add('stjc-more'); update(); host.append(toggle);
    }
    return host;
  }
  window.__ST_BEAUTIFY__?.register({
    id: 'job-contacts',
    retainUntilRemoved: true,
    // Job pages, plus the job tab beside a Chat Center thread (#/ChatCenter/<number>?jobid=…).
    matches: url => /^#\/Job\/Index\/\d+/i.test(url.hash) || /^#\/ChatCenter\/[^/?#]+/i.test(url.hash),
    findRoot: () => (/^#\/ChatCenter\//i.test(location.hash) ? document.querySelector('#cht-job-details-container .job-detail-view') : document)
      ?.querySelector('.qa-customer-name')?.closest('.CardSection') || null,
    mount(root) {
      let host, signature, timer, sources = [];
      const state = { expanded: false };
      function render() {
        const contacts = readContacts(root);
        const next = JSON.stringify(contacts, (key, value) => key === 'source' ? undefined : value);
        const nextSources = contacts.flatMap(c => c.channels.map(ch => ch.source));
        if (next === signature && host?.isConnected && nextSources.every((a, i) => a === sources[i])) return;
        sources = nextSources;
        signature = next; host?.remove();
        root.removeAttribute('data-st-job-contacts');
        if (!contacts.length) return;
        host = build(contacts, state); root.append(host); root.setAttribute('data-st-job-contacts', '');
      }
      render();
      const observer = new MutationObserver(records => {
        if (records.every(r => host?.contains(r.target) || (r.target === root && [...r.addedNodes, ...r.removedNodes].every(n => n === host)))) return;
        clearTimeout(timer); timer = setTimeout(render, 100);
      });
      observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'title'] });
      return () => { clearTimeout(timer); observer.disconnect(); host?.remove(); root.removeAttribute('data-st-job-contacts'); };
    }
  });
})();
