/* ISOLATED world: preserve every native form control and binding in place. */
(() => {
  const matches = url => /^#\/Invoice\/Email\/\d+\/?(?:\?.*)?$/i.test(url.hash);
  window.__ST_BEAUTIFY__?.register({
    id: 'invoice-email',
    matches,
    retainUntilRemoved: true,
    findRoot: () => document.querySelector('input[name="NewEmailAddress"]')?.closest('form') || null,
    mount(form) {
      const input = form.querySelector('input[name="NewEmailAddress"]');
      const abort = new AbortController();
      const options = { signal: abort.signal };
      const generated = [];
      const annotated = new Set();
      let timer, disposed = false, signature = '', ready = false, open = false, active = -1, choices = [];
      const annotate = (el, value) => { if (el) { el.setAttribute('data-st-email-section', value); annotated.add(el); } };
      const make = (tag, className, text) => {
        const el = document.createElement(tag); el.className = className;
        el.setAttribute('data-st-email-generated', '');
        if (text) el.textContent = text;
        generated.push(el); return el;
      };
      form.setAttribute('data-st-email-ui', '');
      const heading = form.querySelector(':scope > h3');
      const intro = make('p', 'st-email-intro', 'Choose your recipients, review your message, and send your invoice.');
      heading?.after(intro);
      const groups = [...form.querySelectorAll(':scope > .control-group')];
      const labels = { 'Invoice Template': 'template', From: 'from', To: 'to', Subject: 'subject', Body: 'body', Attachments: 'attachments', Forms: 'forms' };
      for (const group of groups) {
        const name = group.querySelector(':scope > .control-label')?.textContent.trim();
        if (labels[name]) annotate(group, labels[name]);
      }
      annotate(input.closest('.control-group'), 'new-recipient');
      const recipientGroup = form.querySelector('[data-st-email-section="to"]');
      const controls = recipientGroup?.querySelector('.controls');
      const picker = make('div', 'st-email-picker');
      const search = make('input', 'st-email-search');
      search.type = 'text'; search.placeholder = 'Search contacts or enter an email';
      search.setAttribute('aria-label', 'Add email recipients');
      search.setAttribute('role', 'combobox'); search.setAttribute('aria-autocomplete', 'list');
      search.setAttribute('autocomplete', 'off'); search.setAttribute('spellcheck', 'false');
      const dropdown = make('div', 'st-email-dropdown');
      dropdown.id = `st-email-options-${crypto.randomUUID()}`;
      dropdown.setAttribute('role', 'listbox'); dropdown.setAttribute('aria-label', 'Email recipients');
      search.setAttribute('aria-controls', dropdown.id);
      const selection = make('div', 'st-email-selection');
      const chips = make('div', 'st-email-chips');
      const status = make('p', 'st-email-status');
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      status.id = `st-email-status-${crypto.randomUUID()}`;
      search.setAttribute('aria-describedby', status.id);
      picker.append(search, dropdown); selection.append(chips);
      controls?.prepend(picker, selection, status);
      function setOpen(value) {
        open = value && ready;
        dropdown.hidden = !open;
        search.setAttribute('aria-expanded', String(open));
        if (!open) { active = -1; search.removeAttribute('aria-activedescendant'); }
      }
      function activate(index) {
        active = index;
        [...dropdown.querySelectorAll('[role="option"]')].forEach((el, i) => {
          el.toggleAttribute('data-active', i === index);
          if (i === index) { search.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
        });
      }
      function renderOptions(selected) {
        const query = search.value.trim().toLowerCase();
        const selectedKeys = new Set(selected.map(v => v.toLowerCase()));
        const seen = new Set();
        choices = [...controls.querySelectorAll('label.checkbox input[type="checkbox"]')].flatMap(el => {
          const key = el.value.toLowerCase();
          if (seen.has(key)) return [];
          seen.add(key);
          const label = el.closest('label').textContent.trim() || el.value;
          return !query || `${label} ${el.value}`.toLowerCase().includes(query)
            ? [{ address: el.value, label, selected: selectedKeys.has(key) }] : [];
        });
        const typed = search.value.split(/[,;\n\r]+/).map(v => v.trim()).filter(Boolean);
        const valid = typed.length && typed.every(v => v.length <= 254 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v));
        if (valid && !choices.some(c => c.address.toLowerCase() === query)) {
          choices.push({ address: search.value.trim(), label: typed.length > 1 ? `Add ${typed.length} email addresses` : search.value.trim(), isNew: true });
        }
        dropdown.replaceChildren(...choices.map((choice, index) => {
          const option = document.createElement('div');
          option.id = `${dropdown.id}-${index}`; option.className = 'st-email-option';
          option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(!!choice.selected));
          const label = document.createElement('span'); label.textContent = choice.label;
          const hint = document.createElement('span'); hint.className = 'st-email-option-hint';
          hint.textContent = choice.selected ? 'Selected ✓' : choice.isNew ? 'Add email' : '';
          option.append(label, hint);
          option.addEventListener('pointerdown', e => e.preventDefault(), options);
          option.addEventListener('click', () => choose(choice), options);
          return option;
        }));
        if (!choices.length) {
          const empty = document.createElement('p'); empty.className = 'st-email-option-empty';
          empty.textContent = query ? 'Enter a complete email address to add a new recipient.' : 'No saved email addresses. Type an email to add one.';
          dropdown.append(empty);
        }
        active = -1; search.removeAttribute('aria-activedescendant');
      }
      function choose(choice) {
        if (choice.selected) { search.value = ''; update(); setOpen(false); return; }
        const answer = command('add', choice.address);
        if (answer.ok) search.value = '';
        message(answer.ok ? '' : answer.message, !answer.ok);
        update(); search.focus(); setOpen(!answer.ok);
      }
      function command(op, address) {
        let result;
        const response = event => { try { result = JSON.parse(event.detail); } catch {} };
        form.addEventListener('st-invoice-email-result', response);
        form.dispatchEvent(new CustomEvent('st-invoice-email-command', { bubbles: true, detail: JSON.stringify({ op, address }) }));
        form.removeEventListener('st-invoice-email-result', response);
        return result || { ok: false, message: 'Additional recipient controls are unavailable. Use the original address field and contact checkboxes.' };
      }
      function message(text, error = false) {
        status.textContent = text;
        status.toggleAttribute('data-error', error);
      }
      function update() {
        timer = undefined;
        // During route teardown the bridge no longer accepts email commands.
        // Preserve the last rendered picker instead of exposing native controls.
        if (disposed || !matches(location)) return;
        const result = command('state');
        ready = result.ok; search.disabled = !ready;
        form.toggleAttribute('data-st-email-picker-ready', ready);
        if (!result.ok) { setOpen(false); message(result.message, true); return; }
        if (input.value.trim()) form.setAttribute('data-st-email-native-open', '');
        renderOptions(result.selected);
        const next = JSON.stringify(result.selected);
        if (signature !== next) {
          signature = next;
          chips.replaceChildren(...result.selected.map(address => {
            const chip = document.createElement('span'); chip.className = 'st-email-chip';
            const text = document.createElement('span'); text.textContent = address;
            const remove = document.createElement('button'); remove.type = 'button';
            remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${address}`);
            remove.addEventListener('click', () => {
              const answer = command('remove', address);
              message(answer.ok ? '' : answer.message, !answer.ok);
              update(); search.focus(); setOpen(false);
            }, options);
            chip.append(text, remove); return chip;
          }));
        }
      }
      function schedule() { if (!disposed && timer === undefined) timer = setTimeout(update, 60); }
      search.addEventListener('focus', () => { update(); setOpen(true); }, options);
      search.addEventListener('click', () => { update(); setOpen(true); }, options);
      search.addEventListener('input', () => { message(''); update(); setOpen(true); }, options);
      search.addEventListener('keydown', event => {
        if (event.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); setOpen(true);
          if (choices.length) activate(event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
            : active < 0 ? (event.key === 'ArrowUp' ? choices.length - 1 : 0)
            : (active + (event.key === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length);
        } else if (event.key === 'Enter') {
          event.preventDefault(); event.stopPropagation();
          if (open && active >= 0) choose(choices[active]);
          else if (search.value.trim()) choose({ address: search.value.trim() });
        } else if (event.key === 'Tab') setOpen(false);
      }, options);
      document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) setOpen(false); }, options);
      form.addEventListener('focusin', event => { if (!picker.contains(event.target)) setOpen(false); }, options);
      form.addEventListener('submit', event => {
        if (!ready) return;
        const unconfirmed = !!search.value.trim();
        const state = command('state');
        const empty = state.ok && !state.selected.length && !input.value.trim();
        if (!unconfirmed && !empty) return;
        event.preventDefault(); event.stopImmediatePropagation();
        message(empty && !unconfirmed ? 'Choose at least one recipient before sending.' : 'Choose an address from the dropdown or press Enter before sending.', true);
        search.focus(); setOpen(true);
      }, { capture: true, signal: abort.signal });
      form.addEventListener('change', schedule, options);
      const observer = new MutationObserver(records => {
        if (records.some(r => !(r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest('[data-st-email-generated]'))) schedule();
      });
      observer.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'disabled', 'checked'] });
      update(); setOpen(false);
      return () => {
        disposed = true; clearTimeout(timer); observer.disconnect(); abort.abort();
        generated.forEach(el => el.remove()); annotated.forEach(el => el.removeAttribute('data-st-email-section'));
        form.removeAttribute('data-st-email-ui');
        form.removeAttribute('data-st-email-picker-ready');
        form.removeAttribute('data-st-email-native-open');
      };
    }
  });
})();
