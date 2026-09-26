/* Invoice batching (Accounting > Invoicing > Unbatched and batch views):
   summary tiles, section cards and readable tables.
   Only annotates native nodes with data-st-batch-* attributes and appends two
   small labels after the last stat tile (outside Knockout's foreach range).
   Never moves bound nodes and never calls ServiceTitan code. */
(() => {
  const suite = window.__ST_BEAUTIFY__;
  if (!suite) return;
  const PREFIX = 'data-st-batch-';
  const ZERO = /^-?\$0\.00$/;
  const LABELS = [['totals', 'Totals'], ['methods', 'By payment method']];

  // Badge colour for a status value. Pending is the norm on this screen, so it
  // stays neutral; only states that need attention or are finished stand out.
  function tone(text) {
    const v = text.trim().toLowerCase();
    if (!v) return 'none';
    if (/error|fail|reject|void|declin/.test(v)) return 'danger';
    if (/hold|needs|review|partial/.test(v)) return 'warning';
    if (/^(exported|posted|paid|complete(d)?|closed|synced|settled)$/.test(v)) return 'success';
    return 'neutral';
  }

  suite.register({
    id: 'invoice-batching',
    name: 'Invoice batching',
    description: 'Summary tiles, section cards and readable tables on Accounting > Invoicing.',
    matches: url => /^#\/new\/accounting\/invoicing(?:[/?]|$)/i.test(url.hash),
    findRoot: () => document.querySelector('#InvoiceView'),
    mount(root) {
      let timer;
      let disposed = false;
      root.setAttribute(`${PREFIX}ui`, '');

      function annotate() {
        timer = undefined;
        if (disposed) return;
        const stats = root.querySelector('span.stat')?.parentElement;
        if (stats) {
          stats.setAttribute(`${PREFIX}stats`, '');
          stats.closest('.row')?.setAttribute(`${PREFIX}overview`, '');
          for (const stat of stats.querySelectorAll(':scope > span.stat')) {
            const bind = stat.querySelector('.value')?.getAttribute('data-bind') || '';
            const key = (bind.match(/Summary\(\)\.Total(\w+)\(\)/) || [])[1];
            stat.setAttribute(`${PREFIX}stat`, key ? 'total' : 'method');
            if (key) stat.setAttribute(`${PREFIX}total`, key.toLowerCase());
            else stat.removeAttribute(`${PREFIX}total`);
          }
          for (const [kind, text] of LABELS) {
            if (stats.querySelector(`:scope > [${PREFIX}label="${kind}"]`)) continue;
            const label = document.createElement('div');
            label.className = 'st-batch-stats-label';
            label.setAttribute(`${PREFIX}label`, kind);
            label.setAttribute('aria-hidden', 'true');
            label.textContent = text;
            stats.append(label);
          }
        }
        // Paging/bulk-link bars whose links are all hidden collapse to nothing.
        for (const controls of root.querySelectorAll('.invoicing-table-controls')) {
          const busy = [...controls.querySelectorAll('*')].some(el => !el.children.length && el.textContent.trim() && el.getClientRects().length);
          controls.toggleAttribute(`${PREFIX}idle`, !busy);
        }
        for (const cell of root.querySelectorAll('table.tablesorter > tbody > tr > td')) {
          const text = cell.textContent.trim();
          if (cell.classList.contains('status')) cell.setAttribute(`${PREFIX}tone`, tone(text));
          cell.toggleAttribute(`${PREFIX}zero`, cell.classList.contains('format-currency') && ZERO.test(text));
          cell.toggleAttribute(`${PREFIX}empty`, text === 'N/A');
        }
      }
      function schedule() {
        if (!disposed && timer === undefined) timer = setTimeout(annotate, 60);
      }
      // Attribute changes are not observed, so our own annotations never re-trigger it.
      const observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      annotate();
      return () => {
        disposed = true;
        clearTimeout(timer);
        observer.disconnect();
        root.querySelectorAll('.st-batch-stats-label').forEach(el => el.remove());
        for (const el of [root, ...root.querySelectorAll('*')]) {
          for (const attr of [...el.attributes]) if (attr.name.startsWith(PREFIX)) el.removeAttribute(attr.name);
        }
      };
    }
  });
})();
