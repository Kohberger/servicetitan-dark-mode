/* MAIN world: marks Chat Center threads whose last message was an automated
   send (appointment reminder, dispatch notification) so chat-center.css can
   show them as replied. Read-only: it never writes to the view models and
   only toggles its own data attribute on the row. */
(() => {
  const ATTR = 'data-st-chat-automated';
  const unwrap = value => typeof value === 'function' ? value() : value;
  // Automated sends are notifications; a failed one has not reached the customer.
  const isAutomated = message => !!message && unwrap(message.IsNotification) === true &&
    unwrap(message.IsOutbound) === true && unwrap(message.HasNotBeenDelivered) !== true;
  window.__ST_CHAT_AUTOMATED__ = { isAutomated };

  const active = () => document.documentElement?.getAttribute('data-st-beautify') === 'on' &&
    /^#\/ChatCenter\/?$/i.test(location.hash);
  let timer, marked = false;
  function sync() {
    timer = undefined;
    const on = active();
    if (!on && !marked) { watch(); return; }
    marked = false;
    for (const row of document.querySelectorAll('.cht-contacts .cht-contact')) {
      let automated = false;
      if (on) {
        try {
          const thread = window.ko?.dataFor(row);
          automated = !!thread && !unwrap(thread.IsReplied) && !unwrap(thread.IsUnread) && isAutomated(unwrap(thread.LastMessage));
        } catch {}
      }
      if (automated !== row.hasAttribute(ATTR)) row.toggleAttribute(ATTR, automated);
      marked ||= automated;
    }
    watch();
  }
  const schedule = () => { if (timer === undefined) timer = setTimeout(sync, 50); };
  // Watch every DOM change only on Chat Center with Beautify on, or while rows
  // are still marked. Elsewhere this listens only for the Beautify flag and URL
  // changes, so busy pages like the dispatch board don't wake it on every update.
  let pageObserver, watching = false, poll, lastURL;
  function watch() {
    if (!pageObserver) return;
    const flag = document.documentElement?.getAttribute('data-st-beautify') === 'on';
    // Some ServiceTitan navigation doesn't fire hashchange, so compare the URL
    // a few times a second while Beautify is on.
    if (flag && poll === undefined) poll = setInterval(() => { if (location.href !== lastURL) { lastURL = location.href; schedule(); } }, 250);
    else if (!flag && poll !== undefined) { clearInterval(poll); poll = undefined; }
    const want = marked || (flag && /^#\/ChatCenter/i.test(location.hash));
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
    schedule();
  } catch {}
})();
