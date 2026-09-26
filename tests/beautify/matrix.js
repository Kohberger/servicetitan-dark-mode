/* Browser fixture only. No extension storage or production data. */
(() => {
  const controls = document.createElement('div');
  controls.className = 'fixture-matrix-controls';
  const dark = document.createElement('button'); dark.textContent = 'Toggle dark mode simulation';
  const flag = document.createElement('button'); flag.textContent = 'Toggle Beautify';
  const run = document.createElement('button'); run.textContent = 'Check theme matrix';
  const output = document.createElement('pre'); output.id = 'matrix-results';
  controls.append(dark, flag, run, output); document.body.prepend(controls);
  const html = document.documentElement;
  const toggle = attr => html.getAttribute(attr) === 'on' ? html.removeAttribute(attr) : html.setAttribute(attr, 'on');
  dark.onclick = () => toggle('data-st-dark');
  flag.onclick = () => toggle('data-st-beautify');
  const wait = () => new Promise(resolve => setTimeout(resolve, 350));
  run.onclick = async () => {
    const results = [];
    const check = (name, ok) => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`); output.textContent = results.join('\n'); };
    const root = document.querySelector('.invoice-job-view, .job-history-tab-content');
    const nativeControl = [...root.querySelectorAll('textarea, button')].find(el => !el.closest('[data-st-invoice-generated]'));
    for (const theme of [false, true]) for (const on of [false, true]) {
      theme ? html.setAttribute('data-st-dark', 'on') : html.removeAttribute('data-st-dark');
      on ? html.setAttribute('data-st-beautify', 'on') : html.removeAttribute('data-st-beautify');
      await wait();
      const active = root.matches('[data-st-invoice-ui]') || !!root.querySelector('[data-st-audit-ui]');
      const generated = root.querySelector('[data-st-invoice-generated], .st-audit-toolbar');
      check(`Dark ${theme ? 'on' : 'off'}, Beautify ${on ? 'on' : 'off'}: lifecycle and native control`, active === on && !!generated === on && root.contains(nativeControl));
      if (!on) check('Disable restores original structure and annotations', !root.querySelector('[data-st-invoice-pricing],[data-st-audit-folded],[data-st-invoice-header]') && !root.hasAttribute('data-st-invoice-header'));
    }
    const before = nativeControl;
    window.dispatchEvent(new Event('beforeprint'));
    check('Print removes all enhanced presentation', !root.hasAttribute('data-st-invoice-ui') && !root.querySelector('[data-st-audit-ui], .st-audit-toolbar, [data-st-invoice-pricing]'));
    window.dispatchEvent(new Event('afterprint')); await wait();
    check('Print return restores enhancement and control identity', root.contains(before) && (root.hasAttribute('data-st-invoice-ui') || !!root.querySelector('[data-st-audit-ui]')));
    const marker = document.createComment('fixture modal location');
    root.before(marker);
    const dialog = document.createElement('dialog'); document.body.append(dialog); dialog.append(root); dialog.showModal();
    await wait();
    check('Enhancement survives native modal containment', root.contains(before) && (root.hasAttribute('data-st-invoice-ui') || !!root.querySelector('[data-st-audit-ui]')));
    dialog.close(); marker.replaceWith(root); dialog.remove();
    if (window === window.top) {
      const frame = document.createElement('iframe'); frame.title = 'Beautify frame fixture';
      frame.style.cssText = 'width:100%;height:500px';
      const loaded = new Promise(resolve => { frame.onload = () => resolve(true); setTimeout(() => resolve(false), 5000); });
      frame.src = location.pathname + '?frame=1'; document.body.append(frame);
      const didLoad = await loaded; await wait();
      const doc = frame.contentDocument;
      check('Frame independently mounts enhancement', didLoad && !!doc?.querySelector('[data-st-invoice-ui], [data-st-audit-ui]'));
      doc?.documentElement.removeAttribute('data-st-beautify'); await wait();
      check('Frame independently cleans up on disable', !!doc && !doc.querySelector('[data-st-invoice-ui], [data-st-audit-ui], .st-audit-toolbar'));
      frame.remove();
    }
    html.removeAttribute('data-st-dark');
    output.textContent += `\n${results.filter(x => x.startsWith('PASS')).length}/${results.length} matrix checks passed`;
  };
})();
