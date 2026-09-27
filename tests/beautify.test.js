const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const source = name => readFileSync(path.join(__dirname, '../features/beautify/', name), 'utf8');

function harness(initialFlag = false) {
  let on = initialFlag;
  const timers = new Map(), intervals = new Map(), observers = [], listeners = {};
  let id = 0;
  const html = { getAttribute: () => on ? 'on' : null };
  const location = { href: 'https://go.servicetitan.com/#/Invoice/1', pathname: '/', search: '', hash: '#/Invoice/1' };
  const window = {};
  vm.runInNewContext(source('runtime.js'), {
    window, location, document: { documentElement: html },
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key),
    setInterval: fn => { intervals.set(++id, fn); return id; }, clearInterval: key => intervals.delete(key),
    addEventListener: (type, fn) => { listeners[type] = fn; },
    MutationObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe(target, options) { this.options = options; } disconnect() {} }
  });
  const flush = () => { for (const [key, fn] of [...timers]) { timers.delete(key); fn(); } };
  return { api: window.__ST_BEAUTIFY__, location, intervals, listeners, flush,
    flag(value) { on = value; observers.find(o => o.options?.attributeFilter)?.fn(); flush(); },
    dom() { observers.find(o => o.options?.childList)?.fn([{ addedNodes: [{ nodeType: 1 }], removedNodes: [] }]); flush(); },
    route(hash) { location.hash = hash; location.href = 'https://go.servicetitan.com/' + hash; for (const fn of intervals.values()) fn(); flush(); }
  };
}

test('opt-in lifecycle, URL changes across worlds, root replacement, printing and quiet failure isolation', () => {
  const h = harness(); let root = {}, mounts = 0, cleans = 0;
  h.api.register({ id: 'broken', matches: () => true, findRoot: () => root, mount() { throw Error('fixture'); } });
  h.api.register({ id: 'healthy', matches: url => url.hash.startsWith('#/Invoice/'), findRoot: () => root, mount() { mounts++; return () => cleans++; } });
  h.flush(); assert.equal(mounts, 0); assert.equal(h.intervals.size, 0);
  h.flag(true); assert.equal(mounts, 1); assert.equal(h.api.status()[0].status, 'error');
  h.dom(); assert.equal(mounts, 1);
  root = {}; h.dom(); assert.equal(mounts, 2); assert.equal(cleans, 1);
  h.route('#/Job/1'); assert.equal(cleans, 2);
  h.route('#/Invoice/2'); assert.equal(mounts, 3);
  h.listeners.beforeprint(); assert.equal(cleans, 3);
  h.listeners.afterprint(); assert.equal(mounts, 4);
  h.route('#/Invoice/2?print=true'); assert.equal(cleans, 4);
  h.route('#/Invoice/2'); assert.equal(mounts, 5);
  h.flag(false); assert.equal(cleans, 5); assert.equal(h.intervals.size, 0);
  h.dom(); assert.equal(mounts, 5);
  h.flag(true); assert.equal(mounts, 6);
  h.api.register({ id: 'healthy', mount() { throw Error('duplicate'); } }); h.flush(); assert.equal(mounts, 6);
});

test('outgoing email presentation survives navigation until removal, but disable and print clean up', () => {
  const h = harness(true); let root = { isConnected: true }, cleans = 0;
  h.api.register({ id: 'email', matches: url => url.hash.startsWith('#/Invoice/'), retainUntilRemoved: true,
    findRoot: () => root, mount: () => () => cleans++ });
  h.flush();
  h.route('#/Job/1'); h.dom(); assert.equal(cleans, 0);
  root.isConnected = false; h.dom(); assert.equal(cleans, 1);
  root = { isConnected: true }; h.dom(); assert.equal(h.api.status()[0].status, 'inactive');
  h.route('#/Invoice/2'); h.route('#/Job/2'); h.flag(false); assert.equal(cleans, 2);
  h.route('#/Invoice/3'); h.flag(true); h.route('#/Job/3');
  h.listeners.beforeprint(); assert.equal(cleans, 3);
});

test('print endpoints never mount even with a previously enabled flag', () => {
  for (const pathname of ['/app/api/invoice/print/1', '/Invoice/Print/1', '/Estimate/Print/1']) {
    const h = harness(true); h.location.pathname = pathname;
    let mounted = false;
    h.api.register({ id: 'sample', matches: () => true, findRoot: () => ({}), mount() { mounted = true; } });
    h.flush(); assert.equal(mounted, false);
  }
});

test('storage changes win over stale initialization and missing document root is handled', () => {
  let callback, changed, ready, attr = null;
  const document = { documentElement: null };
  vm.runInNewContext(source('beautify.js'), {
    location: { hostname: 'go.servicetitan.com', pathname: '/', search: '', hash: '' }, document,
    chrome: { storage: { sync: { get: (_, fn) => callback = fn }, onChanged: { addListener: fn => changed = fn } } },
    MutationObserver: class { constructor(fn) { ready = fn; } observe() {} disconnect() {} }
  });
  changed({ st_feature_beautify: { newValue: true } }, 'sync');
  callback({ st_feature_beautify: false });
  document.documentElement = { setAttribute: (_, val) => attr = val, removeAttribute: () => attr = null };
  ready(); assert.equal(attr, 'on');
  changed({ st_feature_beautify: { newValue: false } }, 'sync'); assert.equal(attr, null);
});

test('manifest keeps isolated all-frame feature scripts and no added permissions', () => {
  const manifest = JSON.parse(readFileSync(path.join(__dirname, '../manifest.json')));
  const entry = manifest.content_scripts.find(e => e.js.includes('features/beautify/runtime.js'));
  assert.equal(entry.all_frames, true); assert.equal(entry.run_at, 'document_start');
  assert.notEqual(entry.world, 'MAIN');
  for (const file of entry.js) assert.doesNotThrow(() => new vm.Script(readFileSync(path.join(__dirname, '..', file), 'utf8')));
  assert.deepEqual(manifest.permissions, ['storage', 'scripting', 'activeTab']);
  assert.match(manifest.version, /^\d+(\.\d+){1,3}$/);
});

test('every stylesheet selector is explicitly gated, including nested media rules', () => {
  for (const filename of ['beautify.css', 'invoice-email.css']) {
    const css = source(filename).replace(/\/\*[\s\S]*?\*\//g, '');
    let rules = 0;
    for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
      const prelude = match[1].trim();
      if (prelude.startsWith('@')) continue;
      for (const selector of prelude.split(',\n')) assert.ok(/^html\[data-st-beautify="on"\](?:\s|:has\(form\[data-st-email-ui\]\)\s*$)/.test(selector.trim()), selector);
      rules++;
    }
    assert.ok(rules > (filename === 'beautify.css' ? 150 : 30));
    assert.ok(css.trim().startsWith('@media screen {'));
  }
});

test('details panel status colours: negative wording wins, unknown stays neutral', () => {
  const window = {};
  vm.runInNewContext(source('invoice-header.js'), { window });
  const tone = window.__ST_BEAUTIFY_INVOICE_HEADER__.tone;
  const cases = {
    '': 'none',
    'Pending': 'warning', 'Needs Review': 'warning', 'Not Exported': 'warning', 'Not Reviewed': 'warning',
    'Unreviewed': 'warning', 'On Hold': 'warning', 'Draft': 'warning',
    'Exported': 'success', 'Posted': 'success', 'Reviewed': 'success', 'Approved': 'success', 'Closed': 'success', 'Completed': 'success',
    'Open': 'info',
    'Export Failed': 'danger', 'Error': 'danger', 'Rejected': 'danger', 'Voided': 'danger',
    'Partially Exported': 'neutral', 'Something new': 'neutral',
  };
  for (const [value, expected] of Object.entries(cases)) assert.equal(tone(value), expected, JSON.stringify(value));
});

test('details panel lists every field hidden from the header strip', () => {
  const header = source('invoice-header.js');
  const fields = JSON.parse(header.match(/const PANEL_FIELDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  assert.deepEqual(fields, ['invoice date', 'post date', 'batch', 'batch info', 'review status', 'period status', 'export status']);
  assert.match(header, /const HIDE = new Set\(PANEL_FIELDS\)/);
});
