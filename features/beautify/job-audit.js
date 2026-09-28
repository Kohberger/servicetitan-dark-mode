/* Activity digest: decorate native audit rows without moving binding-owned nodes. */
(() => {
  const suite = window.__ST_BEAUTIFY__;
  if (!suite) return;

  suite.register({
    id: 'job-audit-digest',
    name: 'Job activity digest',
    description: 'Readable notes, native filters, and expandable activity groups.',
    retainUntilRemoved: true,
    // Job pages, plus the job tab beside a Chat Center thread (#/ChatCenter/<number>?jobid=…).
    matches: url => /^#\/Job\/Index\/\d+\/?(?:\?.*)?$/i.test(url.hash) || /^#\/ChatCenter\/[^/?#]+/i.test(url.hash),
    // ServiceTitan only adds .job-history-tab-content when the tenant has the
    // InternalCommunicationEnabled feature on; other tenants render the same
    // history list inside the classic job detail view.
    findRoot: () => /^#\/ChatCenter\//i.test(location.hash)
      ? document.querySelector('#cht-job-details-container .job-detail-view .history > ul.unstyled')
      : document.querySelector('.job-history-tab-content .history > ul.unstyled, .job-detail-view .history > ul.unstyled'),
    mount(list) {
      const history = list.parentElement;
      const owned = new Map();
      const generated = new Set();
      const ordered = new Set();
      const expanded = new WeakMap();
      let groups = [];
      let timer;
      let disposed = false;
      const own = (node, name, value) => {
        let attrs = owned.get(node);
        if (!attrs) owned.set(node, attrs = new Map());
        if (!attrs.has(name)) attrs.set(name, { before: node.getAttribute(name), value });
        else attrs.get(name).value = value;
        if (node.getAttribute(name) !== value) node.setAttribute(name, value);
      };
      const restore = (node, name) => {
        const attrs = owned.get(node);
        const state = attrs?.get(name);
        if (!state) return;
        if (node.getAttribute(name) === state.value) {
          if (state.before === null) node.removeAttribute(name);
          else node.setAttribute(name, state.before);
        }
        attrs.delete(name);
        if (!attrs.size) owned.delete(node);
      };
      const make = (tag, className, text) => {
        const node = document.createElement(tag);
        node.className = className;
        if (text != null) node.textContent = text;
        return node;
      };
      own(history, 'data-st-audit-ui', 'digest');
      own(list, 'data-st-audit-list', '');
      const creationHeading = make('div', 'st-audit-create-heading', 'Add to job');
      const form = history.querySelector('form.add-note-view');
      if (form) form.before(creationHeading);
      const toolbar = make('div', 'st-audit-toolbar');
      const heading = make('div', 'st-audit-heading', 'Activity digest');
      const controls = make('div', 'st-audit-controls');
      const search = make('input', 'st-audit-search');
      search.type = 'search';
      search.placeholder = 'Search activity…';
      search.setAttribute('aria-label', 'Search loaded audit trail activity');
      const expand = make('button', 'st-audit-action', 'Expand groups');
      const collapse = make('button', 'st-audit-action', 'Collapse groups');
      expand.type = collapse.type = 'button';
      controls.append(search, expand, collapse);
      toolbar.append(heading, controls);
      list.before(toolbar);
      const empty = make('li', 'st-audit-empty', 'No matching activity');
      empty.setAttribute('role', 'status');

      // Only clearly identified repetitive rows are folded. Unknown entries,
      // notes, correspondence, warnings and milestones remain fully visible.
      function describe(row) {
        const p = row.querySelector('.description > p');
        const text = p?.innerText.trim() || '';
        const author = row.querySelector('[data-bind="text: CreatedBy"]')?.textContent.trim() || '';
        const stamp = row.querySelector('.timestamp')?.textContent.trim() || '';
        const action = author && text.startsWith(author) ? text.slice(author.length).trim() : text;
        const kind = /^attached a file\b/i.test(action) ? 'uploads'
          : /^deleted attachment\b/i.test(action) ? 'deletions'
          : /^(?:changed the Invoice Date|edited the invoice summary|added\b.*\bto the invoice\b)/i.test(action.replace(/\s+/g, ' ')) ? 'invoice'
          : null;
        return { row, text, author, stamp, kind, day: stamp.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)?.[0] || '' };
      }
      const parseStamp = stamp => {
        const m = stamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
        if (!m) return NaN;
        const hour = (+m[4] % 12) + (/p/i.test(m[6]) ? 12 : 0);
        return new Date(+m[3], m[1] - 1, +m[2], hour, +m[5]).getTime();
      };
      const setOrder = (node, value) => {
        node.style.order = String(value);
        ordered.add(node);
      };
      const setGroup = (group, open) => {
        expanded.set(group.first, open);
        group.button.setAttribute('aria-expanded', String(open));
        for (const row of group.rows) {
          if (open || search.value.trim()) restore(row, 'data-st-audit-folded');
          else own(row, 'data-st-audit-folded', '');
        }
      };
      const onClick = event => {
        const button = event.target.closest('[data-st-audit-group]');
        const group = groups.find(g => g.button === button);
        if (group) setGroup(group, button.getAttribute('aria-expanded') !== 'true');
      };
      const expandAll = () => groups.forEach(g => setGroup(g, true));
      const collapseAll = () => groups.forEach(g => setGroup(g, false));
      list.addEventListener('click', onClick);
      expand.addEventListener('click', expandAll);
      collapse.addEventListener('click', collapseAll);
      search.addEventListener('input', schedule);

      function observe() {
        observer.observe(history, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      }
      function schedule() {
        if (!disposed && timer === undefined) timer = setTimeout(update, 50);
      }
      function update() {
        timer = undefined;
        if (disposed) return;
        observer.disconnect();
        try {
          for (const node of generated) node.remove();
          generated.clear();
          empty.remove();
          // Restore only our annotations before reading native visibility.
          for (const [node, attrs] of [...owned]) {
            for (const name of [...attrs.keys()]) {
              if (name !== 'data-st-audit-ui' && name !== 'data-st-audit-list') restore(node, name);
            }
          }
          const note = history.querySelector('form.add-note-view textarea');
          if (note) {
            own(note, 'placeholder', 'Write a note for this job…');
            if (!creationHeading.isConnected) note.closest('form').before(creationHeading);
          }
          if (note && !note.hasAttribute('aria-label') && !note.hasAttribute('aria-labelledby') && !note.labels?.length) {
            own(note, 'aria-label', 'Add a job note');
          }
          const upload = history.querySelector('#job-upload-attachment-btn');
          if (upload) own(upload, 'aria-label', 'Upload files to this job');
          const filters = history.querySelector('[data-cy="history-section-selector"]');
          filters?.querySelectorAll('button').forEach(button => {
            if (!button.hasAttribute('aria-pressed')) own(button, 'aria-pressed', String(button.classList.contains('active')));
          });
          const rows = [...list.children].filter(row => row.tagName === 'LI' && !row.hidden && getComputedStyle(row).display !== 'none');
          const query = search.value.trim().toLocaleLowerCase();
          // ServiceTitan inserts some entries (e.g. chat logs) out of sequence.
          // Show newest first with flex `order` instead of moving the nodes, so
          // Knockout keeps ownership of the list's DOM sequence. Undated rows
          // stay beside their neighbour; the "load all" row stays last.
          let lastTime = Infinity;
          const records = rows.map(describe).map(record => {
            const time = parseStamp(record.stamp);
            record.time = record.row.querySelector('a[data-bind*="loadAllEntries"]') ? -Infinity
              : Number.isNaN(time) ? lastTime : (lastTime = time);
            return record;
          }).sort((a, b) => (b.time - a.time) || 0);
          for (const node of ordered) if (!node.isConnected) ordered.delete(node);
          // Leave two slots before each row for a date header and group header.
          records.forEach((record, i) => setOrder(record.row, i * 3 + 2));
          const runs = [];
          let previous;
          for (const record of records) {
            const matches = !query || (record.text + ' ' + record.stamp).toLocaleLowerCase().includes(query);
            if (!matches) { own(record.row, 'data-st-audit-search-hidden', ''); previous = null; continue; }
            const canGroup = record.kind && record.author && record.stamp;
            if (canGroup && previous && previous.kind === record.kind && previous.author === record.author && previous.stamp === record.stamp) {
              runs[runs.length - 1].push(record);
            } else runs.push([record]);
            previous = record;
          }
          groups = [];
          let lastDay = '';
          for (const run of runs) {
            const first = run[0];
            if (first.day && first.day !== lastDay) {
              lastDay = first.day;
              const date = make('li', 'st-audit-date', first.day);
              date.setAttribute('aria-label', 'Activity on ' + first.day);
              list.insertBefore(date, first.row);
              setOrder(date, +first.row.style.order - 2);
              generated.add(date);
            }
            if (run.length < 2) continue;
            const header = make('li', 'st-audit-group-header');
            const button = make('button', 'st-audit-group');
            button.type = 'button';
            button.setAttribute('data-st-audit-group', '');
            const icon = make('span', 'st-audit-group-icon', first.kind === 'uploads' ? '↗' : first.kind === 'deletions' ? '−' : '≡');
            icon.setAttribute('aria-hidden', 'true');
            const copy = make('span', 'st-audit-group-copy');
            const label = first.kind === 'uploads' ? 'files attached' : first.kind === 'deletions' ? 'attachments deleted' : 'invoice updates';
            copy.append(make('span', 'st-audit-group-title', run.length + ' ' + label), make('span', 'st-audit-group-meta', first.author + ' · ' + first.stamp));
            const chevron = make('span', 'st-audit-chevron', '⌄');
            chevron.setAttribute('aria-hidden', 'true');
            button.append(icon, copy, chevron);
            header.append(button);
            list.insertBefore(header, first.row);
            setOrder(header, +first.row.style.order - 1);
            generated.add(header);
            const group = { first: first.row, rows: run.map(r => r.row), button };
            groups.push(group);
            for (const row of group.rows) own(row, 'data-st-audit-group-row', '');
            own(group.rows[group.rows.length - 1], 'data-st-audit-group-end', '');
            setGroup(group, !!query || expanded.get(first.row) === true);
          }
          expand.disabled = collapse.disabled = groups.length === 0;
          if (!runs.length && query) { list.append(empty); setOrder(empty, records.length * 3 + 2); }
        } finally { if (!disposed) observe(); }
      }
      const observer = new MutationObserver(schedule);
      update();
      return () => {
        disposed = true;
        clearTimeout(timer);
        observer.disconnect();
        list.removeEventListener('click', onClick);
        expand.removeEventListener('click', expandAll);
        collapse.removeEventListener('click', collapseAll);
        search.removeEventListener('input', schedule);
        toolbar.remove();
        creationHeading.remove();
        empty.remove();
        for (const node of generated) node.remove();
        for (const node of ordered) node.style.removeProperty('order');
        for (const [node, attrs] of [...owned]) for (const name of [...attrs.keys()]) restore(node, name);
      };
    }
  });
})();
