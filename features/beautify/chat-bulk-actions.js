/* MAIN world: bulk actions for the Chat Center thread list, Beautify only.
   Adds a checkbox to each thread card and a floating bar that marks the
   selected threads unread, closes them, or blocks them as spam. Each action
   calls the same thread method as ServiceTitan's own in-thread menu; close and
   block ask for confirmation first. All added nodes are removed on disable. */
(() => {
  const ROW = '.cht-contacts .cht-contact:not(.cht-contact_loader)';
  const CHECK = 'data-st-chat-check';
  const SELECTED = 'data-st-chat-selected';
  const SELECTING = 'data-st-chat-selecting';
  const BAR = 'data-st-chat-bulk';
  const DIALOG = 'data-st-chat-dialog';
  const READONLY = 'data-st-chat-readonly';
  const unwrap = value => typeof value === 'function' ? value() : value;

  // Same rules as ServiceTitan's in-thread options menu, except Mark unread also
  // allows replied threads: the menu hides it there, but the server accepts it,
  // and it's a useful "come back to this" reminder.
  const canUnread = t => !unwrap(t.IsUnread) && typeof t.clickUnreadThread === 'function';
  const canClose = t => !unwrap(t.IsClosed) && !(unwrap(t.VisibleTypingUsers)?.length) && typeof t.closeThread === 'function';
  const canBlock = t => typeof t.blockThread === 'function';
  const permitted = name => {
    try { return window.AppUser.HasPermission(window.App.Permissions[name]) === true; } catch { return false; }
  };
  const onOpenTab = () => {
    try { return window.App.Chat.Instance().ActiveTab() === window.App.Enums.ChatThreadViewStatus.Open; } catch { return false; }
  };
  const active = () => document.documentElement?.getAttribute('data-st-beautify') === 'on' &&
    /^#\/ChatCenter\/?$/i.test(location.hash) && !!window.ko && onOpenTab() && permitted('ChatCenterWrite');
  window.__ST_CHAT_BULK__ = { canUnread, canClose, canBlock, active };

  const selected = new Set(); // ThreadIds, so selection survives Knockout re-rendering rows
  let anchor = null, timer, mounted = false;

  const threadOf = row => {
    try { const t = window.ko.dataFor(row); return t && unwrap(t.ThreadId) != null ? t : null; } catch { return null; }
  };
  const loadedRows = () => [...document.querySelectorAll(ROW)].map(row => ({ row, thread: threadOf(row) })).filter(r => r.thread);
  const selectedThreads = () => loadedRows().filter(r => selected.has(unwrap(r.thread.ThreadId))).map(r => r.thread);

  const ICONS = {
    unread: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
    close: 'M22 5.18 10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.25l1.44-1.44A9.9 9.9 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39l-1.61 1.61z',
    block: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8z'
  };
  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  }
  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('fill', 'currentColor');
    const path = document.createElementNS(ns, 'path'); path.setAttribute('d', ICONS[name]);
    svg.append(path);
    return svg;
  }

  function makeCheck() {
    const box = el('span', { [CHECK]: '' });
    const input = el('input', { type: 'checkbox' });
    // Stop the row's own click binding from opening the thread.
    input.addEventListener('click', event => {
      event.stopPropagation();
      const row = input.closest('.cht-contact'), thread = row && threadOf(row);
      if (!thread) return;
      const id = unwrap(thread.ThreadId), on = input.checked;
      const ids = loadedRows().map(r => unwrap(r.thread.ThreadId));
      const from = ids.indexOf(anchor), to = ids.indexOf(id);
      const range = event.shiftKey && from >= 0 && to >= 0 ? ids.slice(Math.min(from, to), Math.max(from, to) + 1) : [id];
      for (const r of range) on ? selected.add(r) : selected.delete(r);
      anchor = id;
      sync();
    });
    box.append(input);
    return box;
  }

  function buildBar() {
    const bar = el('div', { [BAR]: '', role: 'toolbar', 'aria-label': 'Selected chat threads' });
    const top = el('div', { class: 'stcb-top' });
    const clear = el('button', { type: 'button', class: 'stcb-link' }, 'Clear');
    clear.addEventListener('click', clearSelection);
    top.append(el('span', { class: 'stcb-count' }), clear);
    const acts = el('div', { class: 'stcb-acts' });
    for (const [op, label, title] of [['unread', 'Unread', 'Mark as unread'], ['close', 'Close', 'Close threads'], ['block', 'Block', 'Block spam and close']]) {
      const button = el('button', { type: 'button', class: 'stcb-act' + (op === 'block' ? ' stcb-danger' : ''), 'data-op': op, title });
      button.append(icon(op), el('span', {}, label));
      button.addEventListener('click', () => run(op));
      acts.append(button);
    }
    bar.append(top, acts);
    return bar;
  }

  function renderBar(list) {
    const container = list?.parentElement;
    let bar = document.querySelector(`[${BAR}]`);
    if (!selected.size || !container) {
      bar?.remove();
      list?.removeAttribute(SELECTING);
      return;
    }
    if (!list.hasAttribute(SELECTING)) list.setAttribute(SELECTING, '');
    if (!bar || bar.parentElement !== container) { bar?.remove(); bar = buildBar(); container.append(bar); }
    const threads = selectedThreads(), n = threads.length;
    const counts = { unread: threads.filter(canUnread).length, close: threads.filter(canClose).length, block: threads.filter(canBlock).length };
    // Write text only when it changes: every write is a mutation that would reschedule sync.
    const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    setText(bar.querySelector('.stcb-count'), `${n} selected`);
    for (const button of bar.querySelectorAll('.stcb-act')) {
      const op = button.dataset.op, c = counts[op];
      button.hidden = op === 'block' && !permitted('EditPhone');
      button.disabled = c === 0;
    }
  }

  function clearSelection() { selected.clear(); anchor = null; sync(); }

  function run(op) {
    const threads = selectedThreads();
    if (op === 'unread') {
      for (const t of threads.filter(canUnread)) { try { t.clickUnreadThread(); } catch {} }
      clearSelection();
      return;
    }
    if (op === 'block' && !permitted('EditPhone')) return;
    const targets = threads.filter(op === 'close' ? canClose : canBlock);
    if (!targets.length) return;
    confirmDialog(op, targets, threads.length - targets.length, () => {
      for (const t of targets) { try { op === 'close' ? t.closeThread() : t.blockThread(); } catch {} }
      clearSelection();
    });
  }

  function confirmDialog(op, targets, skipped, onConfirm) {
    document.querySelector(`[${DIALOG}]`)?.remove();
    const n = targets.length, one = n === 1;
    const scrim = el('div', { [DIALOG]: '' });
    const modal = el('div', { class: 'stcb-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'stcb-title' });
    const title = op === 'close' ? (one ? 'Close this chat thread?' : `Close ${n} chat threads?`)
      : (one ? 'Block this number?' : `Block ${n} numbers?`);
    const head = el('div', { class: 'stcb-head' });
    const x = el('button', { type: 'button', 'aria-label': 'Cancel' }, '×');
    head.append(el('span', { id: 'stcb-title' }, title), x);
    const body = el('div', { class: 'stcb-body' });
    body.append(el('p', {}, op === 'close' ? (one ? 'It moves to the Closed tab.' : 'They move to the Closed tab.')
      : (one ? 'The number is added to the blocked list and its thread is closed permanently.'
        : 'The numbers are added to the blocked list and their threads are closed permanently.')));
    const names = el('ul');
    for (const t of targets.slice(0, 5)) names.append(el('li', {}, unwrap(t.ContactName) || 'Unknown'));
    if (n > 5) names.append(el('li', {}, `and ${n - 5} more`));
    body.append(names);
    if (skipped) body.append(el('p', { class: 'stcb-note' }, `${skipped} selected ${skipped === 1 ? 'thread is' : 'threads are'} skipped because another agent is replying or ${skipped === 1 ? 'it is' : 'they are'} already closed.`));
    const foot = el('div', { class: 'stcb-foot' });
    const cancel = el('button', { type: 'button', class: 'stcb-cancel' }, 'Cancel');
    const ok = el('button', { type: 'button', class: 'stcb-primary' + (op === 'block' ? ' stcb-danger' : '') },
      op === 'close' ? (one ? 'Close' : `Close ${n}`) : (one ? 'Block SPAM' : `Block ${n}`));
    foot.append(cancel, ok);
    modal.append(head, body, foot);
    scrim.append(modal);
    const done = () => { scrim.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = event => { if (event.key === 'Escape') { event.stopPropagation(); done(); } };
    x.addEventListener('click', done);
    cancel.addEventListener('click', done);
    scrim.addEventListener('click', event => { if (event.target === scrim) done(); });
    ok.addEventListener('click', () => { done(); onConfirm(); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(scrim);
    ok.focus();
  }

  function unmount() {
    mounted = false; selected.clear(); anchor = null;
    for (const node of document.querySelectorAll(`[${CHECK}], [${BAR}], [${DIALOG}]`)) node.remove();
    for (const node of document.querySelectorAll(`[${SELECTED}], [${SELECTING}]`)) { node.removeAttribute(SELECTED); node.removeAttribute(SELECTING); }
  }

  // Tell the CSS not to reserve checkbox space for users who can't act on threads.
  // Only a definite "no" counts; before ServiceTitan's user data loads we keep the space.
  function markReadonly() {
    let readonly = false;
    try { readonly = window.AppUser.HasPermission(window.App.Permissions.ChatCenterWrite) === false; } catch {}
    const body = document.body;
    if (body && readonly !== body.hasAttribute(READONLY)) body.toggleAttribute(READONLY, readonly);
  }

  function sync() {
    timer = undefined;
    if (document.documentElement?.getAttribute('data-st-beautify') === 'on') markReadonly();
    else document.body?.removeAttribute(READONLY);
    if (!active()) { if (mounted) unmount(); watch(); return; }
    mounted = true;
    const present = new Set();
    for (const { row, thread } of loadedRows()) {
      const id = unwrap(thread.ThreadId);
      present.add(id);
      let box = row.querySelector(`:scope > [${CHECK}]`);
      if (!box) { box = makeCheck(); row.append(box); }
      const input = box.firstChild, on = selected.has(id);
      if (input.checked !== on) input.checked = on;
      const label = `Select ${unwrap(thread.ContactName) || 'thread'}`;
      if (input.getAttribute('aria-label') !== label) input.setAttribute('aria-label', label);
      if (on !== row.hasAttribute(SELECTED)) row.toggleAttribute(SELECTED, on);
    }
    // Threads that were closed, blocked or filtered out by search drop out of the selection.
    for (const id of [...selected]) if (!present.has(id)) selected.delete(id);
    renderBar(document.querySelector('.cht-contacts'));
    watch();
  }

  const schedule = () => { if (timer === undefined) timer = setTimeout(sync, 50); };
  // Watch every DOM change only on Chat Center with Beautify on, or while our
  // checkboxes are still mounted. Elsewhere this listens only for the Beautify
  // flag and URL changes, so busy pages like the dispatch board don't wake it.
  let pageObserver, watching = false, poll, lastURL;
  function watch() {
    if (!pageObserver) return;
    const flag = document.documentElement?.getAttribute('data-st-beautify') === 'on';
    // Some ServiceTitan navigation doesn't fire hashchange, so compare the URL
    // a few times a second while Beautify is on.
    if (flag && poll === undefined) poll = setInterval(() => { if (location.href !== lastURL) { lastURL = location.href; schedule(); } }, 250);
    else if (!flag && poll !== undefined) { clearInterval(poll); poll = undefined; }
    const want = mounted || (flag && /^#\/ChatCenter/i.test(location.hash));
    if (want === watching) return;
    watching = want;
    if (want) pageObserver.observe(document, { childList: true, subtree: true, characterData: true });
    else pageObserver.disconnect();
  }
  try {
    pageObserver = new MutationObserver(schedule);
    new MutationObserver(schedule).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-st-beautify'] });
    addEventListener('hashchange', schedule);
    addEventListener('popstate', schedule);
    // Escape clears the selection, the same way it closes most ServiceTitan popups.
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mounted && selected.size && !document.querySelector(`[${DIALOG}]`)) clearSelection();
    });
    schedule();
  } catch {}
})();
