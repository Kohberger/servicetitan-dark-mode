/* MAIN world: narrowly scoped access to the email form's native checked array.
   Never calls Send, saves a contact, changes permissions, or makes a request. */
(() => {
  const COMMAND = 'st-invoice-email-command';
  const RESULT = 'st-invoice-email-result';
  const normalize = value => value.trim().toLowerCase();
  function parse(value) {
    const addresses = value.split(/[,;\n\r]+/).map(v => v.trim()).filter(Boolean);
    if (!addresses.length) throw Error('Enter an email address first.');
    if (addresses.some(v => v.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v))) {
      throw Error('Check the email addresses. Separate addresses with commas or semicolons.');
    }
    const seen = new Set();
    return addresses.filter(value => {
      const key = normalize(value);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  document.addEventListener(COMMAND, event => {
    const form = event.target;
    if (!/^#\/Invoice\/Email\/\d+\/?(?:\?.*)?$/i.test(location.hash) ||
        document.documentElement.getAttribute('data-st-beautify') !== 'on' ||
        !form.matches?.('form[data-st-email-ui]') || !form.isConnected) return;
    let command;
    const reply = result => form.dispatchEvent(new CustomEvent(RESULT, { detail: JSON.stringify(result) }));
    try {
      command = JSON.parse(event.detail);
      if (!['state', 'add', 'remove'].includes(command.op)) return;
      const ko = window.ko;
      const input = form.querySelector('input[name="NewEmailAddress"]');
      const vm = ko?.dataFor(input);
      if (!vm || !ko.isWriteableObservable(vm.SelectedEmails) || !Array.isArray(vm.SelectedEmails()) ||
          !ko.isWriteableObservable(vm.NewEmailAddress) || !ko.applyBindingsToNode) {
        throw Error('Use the original address field and contact checkboxes. Additional recipient controls are unavailable on this form.');
      }
      const selected = vm.SelectedEmails();
      if (!selected.every(v => typeof v === 'string')) throw Error('This recipient format is not supported. Use the original address field.');
      if (command.op === 'add') {
        const fromPicker = typeof command.address === 'string';
        // Keep the native contact/autocomplete association and save-to-record
        // workflow intact. That address must continue through native Send.
        if (!fromPicker && (ko.unwrap(vm.SelectedContactId) || ko.unwrap(vm.SaveCustomerEmailAddress) || ko.unwrap(vm.SaveLocationEmailAddress))) {
          throw Error('This address is linked to a contact or marked to save to a record. Leave it in the field for Send, or clear those options to add email-only recipients.');
        }
        const addresses = parse(fromPicker ? command.address : input.value);
        const nativeChoice = form.querySelector('input[type="checkbox"][data-bind*="SelectedEmails"]');
        const controls = nativeChoice?.closest('.controls') ||
          [...form.querySelectorAll('.control-group')].find(group => group.querySelector(':scope > .control-label')?.textContent.trim() === 'To')?.querySelector('.controls');
        if (!controls) throw Error('Recipient list is unavailable. Your address is still in the original field.');
        const created = [];
        const draft = vm.NewEmailAddress();
        try {
          for (const address of addresses) {
            const exists = [...controls.querySelectorAll('input[type="checkbox"]')].some(el => normalize(el.value) === normalize(address));
            if (exists) continue;
            // These additional native-bound choices survive Beautify disable:
            // recipients must stay visible and editable until navigation/Send.
            // Append outside the native foreach comment boundaries.
            const label = document.createElement('label');
            label.className = 'checkbox';
            label.setAttribute('data-st-email-recipient-choice', '');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = address;
            checkbox.setAttribute('data-bind', 'checked: SelectedEmails');
            const text = document.createElement('span'); text.textContent = address;
            label.append(checkbox, text); controls.append(label); created.push(label);
            ko.applyBindingsToNode(checkbox, { checked: vm.SelectedEmails }, vm);
          }
          const next = [...selected];
          for (const address of addresses) {
            // Use the exact native choice value so its checked binding matches.
            const choice = [...controls.querySelectorAll('input[type="checkbox"]')].find(el => normalize(el.value) === normalize(address));
            const value = choice?.value || address;
            if (!next.some(v => normalize(v) === normalize(value))) next.push(value);
          }
          vm.SelectedEmails(next);
          if (!fromPicker) { vm.NewEmailAddress(''); input.value = ''; }
        } catch (error) {
          vm.SelectedEmails(selected); vm.NewEmailAddress(draft);
          for (const label of created) { ko.cleanNode(label); label.remove(); }
          throw error;
        }
      } else if (command.op === 'remove' && typeof command.address === 'string') {
        vm.SelectedEmails(selected.filter(v => v !== command.address));
      }
      reply({ ok: true, selected: [...vm.SelectedEmails()] });
    } catch (error) {
      reply({ ok: false, message: error.message || 'Could not update recipients. Your address has been kept.' });
    }
  });
})();
