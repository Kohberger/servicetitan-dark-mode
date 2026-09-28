// ISOLATED world: Chat Center reply box. Cmd+Enter (Mac) or Ctrl+Enter sends
// by clicking ServiceTitan's own Send button, and a hint beside the button
// shows the shortcut. Sizing lives in chat-center.css so it applies on first paint.
(() => {
  const HINT = 'data-st-chat-hint';
  const mac = /Mac|iPhone|iPad/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  const isSendShortcut = e => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && !e.isComposing;

  window.__ST_BEAUTIFY__?.register({
    id: 'chat-composer',
    isSendShortcut,
    matches: url => /^#\/ChatCenter\/[^/?#]+/i.test(url.hash),
    findRoot: () => document.querySelector('.cht-conversation-control form .cht-response-container'),
    mount(root) {
      const input = root.querySelector('textarea.cht-response-input');
      const send = root.querySelector('button[type="submit"]');
      if (!input || !send) return () => {};
      const hint = document.createElement('span');
      hint.setAttribute(HINT, '');
      hint.setAttribute('aria-hidden', 'true');
      const key = label => { const k = document.createElement('kbd'); k.textContent = label; return k; };
      hint.append(key(mac ? '⌘' : 'Ctrl'), key('Enter'), document.createTextNode(' to send'));
      root.append(hint);
      const shortcut = mac ? '⌘Enter' : 'Ctrl+Enter';
      const hadTitle = send.hasAttribute('title'), oldTitle = send.getAttribute('title');
      send.setAttribute('title', `Send (${shortcut})`);
      input.setAttribute('aria-keyshortcuts', mac ? 'Meta+Enter' : 'Control+Enter');

      const onKey = event => {
        if (event.target !== input || !isSendShortcut(event)) return;
        event.preventDefault();
        event.stopPropagation();
        // Same guards as the Send button: nothing to send, sending, or no permission.
        if (input.disabled || !input.value.trim()) return;
        // Make sure Knockout has the latest text before the form submits.
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (send.disabled || send.classList.contains('disabled')) return;
        send.click();
      };
      root.addEventListener('keydown', onKey, true);
      return () => {
        root.removeEventListener('keydown', onKey, true);
        hint.remove();
        input.removeAttribute('aria-keyshortcuts');
        if (hadTitle) send.setAttribute('title', oldTitle); else send.removeAttribute('title');
      };
    }
  });
})();
