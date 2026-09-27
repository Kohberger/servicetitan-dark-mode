/* Tiny binding-contract fixture, not a replacement for live Knockout checks.
   Send is intercepted locally and cannot send mail or contact a server. */
history.replaceState(null, '', '#/Invoice/Email/10001');
(() => {
  function observable(value) {
    const listeners = new Set();
    function obs(next) {
      if (!arguments.length) return value;
      value = next; listeners.forEach(fn => fn(value));
    }
    obs.subscribe = fn => { listeners.add(fn); return { dispose: () => listeners.delete(fn) }; };
    return obs;
  }
  const model = {
    SelectedEmails: observable([]), NewEmailAddress: observable(''), SelectedContactId: observable(null),
    SaveCustomerEmailAddress: observable(false), SaveLocationEmailAddress: observable(false)
  };
  const subscriptions = new WeakMap();
  window.ko = {
    dataFor: () => model, isWriteableObservable: v => typeof v === 'function' && !!v.subscribe,
    unwrap: v => typeof v === 'function' ? v() : v,
    applyBindingsToNode(input, bindings) {
      const selected = bindings.checked;
      input.checked = selected().includes(input.value);
      const subscription = selected.subscribe(values => { input.checked = values.includes(input.value); });
      subscriptions.set(input, subscription);
      input.addEventListener('change', () => selected(input.checked ? [...new Set([...selected(), input.value])] : selected().filter(v => v !== input.value)));
    },
    cleanNode(el) { el.querySelectorAll('input').forEach(input => subscriptions.get(input)?.dispose()); }
  };
  const form = document.querySelector('form');
  window.ko.applyBindingsToNode(form.querySelector('[data-bind*="SelectedEmails"]'), { checked: model.SelectedEmails });
  const input = form.elements.NewEmailAddress;
  input.addEventListener('input', () => model.NewEmailAddress(input.value));
  model.NewEmailAddress.subscribe(value => { input.value = value; });
  for (const name of ['SaveCustomerEmailAddress', 'SaveLocationEmailAddress']) {
    form.elements[name].addEventListener('change', e => model[name](e.target.checked));
  }
  const sent = [];
  form.addEventListener('submit', e => { e.preventDefault(); sent.push({ selected: [...model.SelectedEmails()], draft: model.NewEmailAddress(), body: form.elements.Body.value }); });
  document.querySelector('#dark').onclick = () => {
    const html = document.documentElement;
    html.getAttribute('data-st-dark') === 'on' ? html.removeAttribute('data-st-dark') : html.setAttribute('data-st-dark', 'on');
  };
  document.querySelector('#flag').onclick = () => {
    const html = document.documentElement;
    html.getAttribute('data-st-beautify') === 'on' ? html.removeAttribute('data-st-beautify') : html.setAttribute('data-st-beautify', 'on');
  };
  window.emailFixture = { model, sent };
})();
