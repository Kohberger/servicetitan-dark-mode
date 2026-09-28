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
    if (!on && !marked) return;
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
  }
  const schedule = () => { if (timer === undefined) timer = setTimeout(sync, 50); };
  try {
    // New messages rewrite the row's preview text, so text changes cover
    // LastMessage updates as well as rows being added or reused. Elsewhere in
    // the app this returns immediately unless rows still need unmarking.
    new MutationObserver(() => {
      if (marked || /^#\/ChatCenter/i.test(location.hash)) schedule();
    }).observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-st-beautify'] });
    addEventListener('hashchange', schedule);
    schedule();
  } catch {}
})();
