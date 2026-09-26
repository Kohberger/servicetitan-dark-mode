/* Synthetic DOM contract checks; no ServiceTitan stores or network activity. */
(() => {
  const fixture = document.querySelector('.history');
  let list = fixture.querySelector('ul');
  const note = fixture.querySelector('textarea');
  const save = fixture.querySelector('[type=submit]');
  let nativeClicks = 0;
  let nativeSaves = 0;
  note.addEventListener('input', () => {
    fixture.querySelector('.form-actions').style.display = note.value ? 'block' : 'none';
    save.disabled = !note.value;
  });
  fixture.querySelector('form').addEventListener('submit', event => { event.preventDefault(); nativeSaves++; });
  function row(author, text, stamp, react = false) {
    const li = document.createElement('li');
    li.innerHTML = '<img class="avatar" alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%23d9e8e5%22/%3E%3C/svg%3E"><div class="description"><p><span data-bind="text: CreatedBy"></span> <span class="body"></span></p><div class="timestamp"></div></div>';
    li.querySelector('[data-bind]').textContent = author;
    li.querySelector('.body').textContent = text;
    li.querySelector('.timestamp').textContent = stamp;
    if (react) { const wrapper = document.createElement('div'); while (li.firstChild) wrapper.append(li.firstChild); li.append(wrapper); }
    return li;
  }
  const rows = [
    row('Taylor Reed', 'emailed invoice. Status: Opened', '9/25/2026 10:33 AM'),
    row('Morgan Lane', 'edited the invoice summary', '9/24/2026 8:08 PM'),
    row('Morgan Lane', 'added TEST-1 to the invoice for $0.00', '9/24/2026 8:08 PM'),
    row('Alex Kim', 'attached a file: photo-1.jpg', '9/24/2026 8:07 PM'),
    row('Alex Kim', 'attached a file: photo-2.jpg', '9/24/2026 8:07 PM', true),
    row('Alex Kim', 'attached a file: photo-3.jpg', '9/24/2026 8:07 PM'),
    row('Morgan Lane', 'said: Equipment tested and operating correctly. Follow up with the contractor on the remaining scope. Photos attached for reference.', '9/24/2026 6:34 PM'),
    row('Taylor Reed', 'completed the job', '9/24/2026 6:30 PM', true)
  ];
  const link = document.createElement('a'); link.href = '#'; link.textContent = ' View file'; link.addEventListener('click', event => { event.preventDefault(); nativeClicks++; }); rows[3].querySelector('p').append(link);
  const startComment = document.createComment('ko foreach: VisibleEntries');
  const endComment = document.createComment('/ko');
  list.append(startComment, ...rows, endComment);
  fixture.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    fixture.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
    for (const r of rows) r.style.display = button.dataset.filter === 'all' || (button.dataset.filter === 'notes' ? r.textContent.includes('said:') : r.textContent.includes('attached a file')) ? '' : 'none';
  }));
  location.hash = '#/Job/Index/123';
  const settle = () => new Promise(resolve => setTimeout(resolve, 300));
  const assert = (condition, text) => { if (!condition) throw new Error(text); return 'PASS ' + text; };
  document.querySelector('#run').addEventListener('click', async () => {
    const output = document.querySelector('#results'); const result = [];
    try {
      await settle();
      result.push(assert(fixture.getAttribute('data-st-audit-ui') === 'digest', 'Job route mounts digest'));
      result.push(assert(!document.querySelector('#st-audit-design-preview'), 'No comparison overlay'));
      result.push(assert(Math.abs(note.getBoundingClientRect().width - fixture.querySelector('form').clientWidth) < 3, 'Composer fills form width despite late legacy CSS'));
      result.push(assert(getComputedStyle(note, '::placeholder').fontFamily === getComputedStyle(note).fontFamily, 'Placeholder uses composer font'));
      result.push(assert(getComputedStyle(save.parentElement).display === 'flex' && save.disabled, 'Native submit is visible and disabled for empty note'));
      result.push(assert(getComputedStyle(fixture.querySelector('.native-cancel')).display === 'none', 'Native Cancel visibility preserved'));
      result.push(assert(getComputedStyle(fixture.querySelector('.upload-info-button')).display === 'none', 'Upload info icon removed'));
      result.push(assert(getComputedStyle(fixture.querySelector('.st-audit-search')).height === '38px', 'Search overrides legacy input height'));

      result.push(assert(list.querySelectorAll('.st-audit-group').length === 2, 'Invoice edits and uploads form separate groups'));
      result.push(assert(rows.every(r => r.parentNode === list) && startComment.parentNode === list && endComment.parentNode === list, 'Native rows and Knockout boundary comments stay in original parent'));
      result.push(assert(list.querySelectorAll('[data-st-audit-folded]').length === 5, 'Repetitive activity folded by default'));
      [...list.querySelectorAll('.st-audit-group')].find(b => b.textContent.includes('files attached')).click();
      link.click();
      result.push(assert(nativeClicks === 1 && !rows[3].hasAttribute('data-st-audit-folded'), 'Expansion keeps original file link handler'));
      result.push(assert(fixture.querySelector('textarea') === note && fixture.querySelector('[type=submit]') === save, 'Original composer controls preserved'));
      note.value = 'Synthetic fixture note'; note.dispatchEvent(new Event('input', { bubbles: true })); save.click();
      result.push(assert(nativeSaves === 1, 'Native submit handler still runs (fixture only)'));
      note.value = ''; note.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.querySelector('[data-filter=notes]').click(); await settle();
      result.push(assert(list.querySelectorAll('.st-audit-group').length === 0 && getComputedStyle(rows[6]).display !== 'none', 'Native Notes filter remains functional'));
      fixture.querySelector('[data-filter=all]').click(); await settle();
      const search = fixture.querySelector('.st-audit-search'); search.value = 'Equipment'; search.dispatchEvent(new Event('input')); await settle();
      result.push(assert(!rows[6].hasAttribute('data-st-audit-search-hidden') && rows[0].hasAttribute('data-st-audit-search-hidden'), 'Search filters current loaded rows'));
      search.value = ''; search.dispatchEvent(new Event('input')); await settle();
      rows[6].querySelector('.body').textContent += ' Updated'; await settle();
      result.push(assert(list.querySelectorAll('.st-audit-group').length === 2, 'Native content update rebuilds groups without duplicates'));
      location.hash = '#/Invoice/123'; await settle();
      result.push(assert(!fixture.hasAttribute('data-st-audit-ui') && !list.querySelector('.st-audit-group') && !list.querySelector('[data-st-audit-folded]') && !note.hasAttribute('aria-label'), 'Route cleanup restores rows and owned accessibility attributes'));
      location.hash = '#/Job/Index/123'; await settle();
      const replacement = document.createElement('ul'); replacement.className = 'unstyled';
      // Simulate application replacing the root without copying extension nodes.
      replacement.append(row('Test Author', 'said: Replacement list note', '9/26/2026 9:00 AM'));
      list.replaceWith(replacement); list = replacement; await settle();
      result.push(assert(document.querySelectorAll('.st-audit-toolbar').length === 1 && list.hasAttribute('data-st-audit-list'), 'Root replacement cleans old module and mounts once'));
      output.textContent = result.join('\n') + '\nAll checks passed.';
    } catch (error) { output.textContent = result.join('\n') + '\nFAIL ' + error.message; }
  });
})();
