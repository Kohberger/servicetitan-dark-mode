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
  for (const filename of ['beautify.css', 'invoice-email.css', 'customer-summary.css', 'chat-center.css']) {
    const css = source(filename).replace(/\/\*[\s\S]*?\*\//g, '');
    let rules = 0;
    for (const match of css.matchAll(/(?:^|(?<=[{}]))\s*([^{}]+)\{/g)) {
      const prelude = match[1].trim();
      if (prelude.startsWith('@')) continue;
      for (const selector of prelude.split(',\n')) assert.ok(/^html\[data-st-beautify="on"\](?:\s|:has\(form\[data-st-email-ui\]\)\s*$)/.test(selector.trim()), selector);
      rules++;
    }
    assert.ok(rules > (filename === 'beautify.css' ? 150 : filename === 'customer-summary.css' ? 20 : filename === 'chat-center.css' ? 10 : 30));
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

test('job modules retain outgoing styles during invoice loading and still clean up on removal, disable, and print', () => {
  for (const file of ['job-contacts.js', 'job-audit.js']) {
    let module;
    vm.runInNewContext(source(file), { window: { __ST_BEAUTIFY__: { register: value => { module = value; } } } });
    const h = harness(true);
    let root = { isConnected: true }, mounts = 0, cleans = 0;
    h.route('#/Job/Index/1');
    h.api.register({ ...module, findRoot: () => root, mount: () => { mounts++; return () => cleans++; } });
    h.flush();
    assert.equal(mounts, 1, file);
    h.route('#/EditInvoice/2'); h.dom();
    assert.equal(cleans, 0, `${file}: outgoing job must remain styled`);
    root.isConnected = false; h.dom();
    assert.equal(cleans, 1, `${file}: detached view must clean up`);
    root = { isConnected: true }; h.route('#/Job/Index/3');
    h.route('#/EditInvoice/4'); h.flag(false);
    assert.equal(cleans, 2, `${file}: disabling overrides retention`);
    h.route('#/Job/Index/5'); h.flag(true);
    h.route('#/EditInvoice/6'); h.listeners.beforeprint();
    assert.equal(cleans, 3, `${file}: printing overrides retention`);
  }
});

test('job modules also run on the job tab beside a Chat Center thread, and only inside its job panel', () => {
  for (const file of ['job-contacts.js', 'job-audit.js']) {
    let module;
    const panelRoot = { closest: () => panelRoot };
    const panel = { querySelector: () => panelRoot };
    const location = { hash: '#/ChatCenter/8013769592?jobid=82125826' };
    const queried = [];
    const document = { querySelector: s => { queried.push(s); return s.startsWith('#cht-job-details-container') ? (s.endsWith('.job-detail-view') ? panel : panelRoot) : null; } };
    vm.runInNewContext(source(file), { location, document, window: { __ST_BEAUTIFY__: { register: value => { module = value; } } } });
    assert.equal(module.matches({ hash: '#/Job/Index/82125826' }), true, file);
    assert.equal(module.matches({ hash: '#/ChatCenter/8013769592?jobid=82125826' }), true, `${file}: chat split view`);
    assert.equal(module.matches({ hash: '#/ChatCenter' }), false, `${file}: thread list has no job panel`);
    assert.equal(module.findRoot(), panelRoot, file);
    assert.ok(queried.every(s => s.startsWith('#cht-job-details-container')), `${file}: never matches the Book a Job form`);
  }
});

test('chat rows ending in an automated send are marked replied only while Beautify is on in Chat Center', () => {
  const obs = v => () => v;
  const msg = (o = {}) => ({ IsNotification: obs(false), IsOutbound: obs(true), HasNotBeenDelivered: obs(false), ...o });
  const thread = (last, o = {}) => ({ IsReplied: obs(false), IsUnread: obs(false), LastMessage: obs(last), ...o });
  const row = vmodel => {
    const attrs = new Set();
    return { vmodel, hasAttribute: a => attrs.has(a), toggleAttribute: (a, on) => { on ? attrs.add(a) : attrs.delete(a); } };
  };
  const rows = [
    row(thread(msg({ IsNotification: obs(true) }))),                                  // reminder: marked
    row(thread(msg({ IsInbound: obs(true), IsOutbound: obs(false) }))),               // customer: not marked
    row(thread(msg({ IsNotification: obs(true), HasNotBeenDelivered: obs(true) }))),  // failed reminder: not marked
    row(thread(msg({ IsNotification: obs(true) }), { IsReplied: obs(true) })),        // already native replied
    row(thread(msg())),                                                                // agent reply without IsReplied: not marked
  ];
  let flag = 'on', timer, observer;
  const location = { hash: '#/ChatCenter' };
  const window = { ko: { dataFor: r => r.vmodel } };
  vm.runInNewContext(source('chat-automated.js'), {
    window, location, addEventListener() {},
    document: { documentElement: { getAttribute: () => flag }, querySelectorAll: () => rows },
    setTimeout: fn => { timer = fn; return 1; }, setInterval: () => 2, clearInterval() {},
    MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() {} },
  });
  const flush = () => { observer([]); timer(); };
  const marked = () => rows.map(r => r.hasAttribute('data-st-chat-automated'));
  flush(); assert.deepEqual(marked(), [true, false, false, false, false]);
  flag = null; flush(); assert.deepEqual(marked(), [false, false, false, false, false], 'disable restores native rows');
  flag = 'on'; location.hash = '#/Job/Index/5'; flush(); assert.deepEqual(marked(), [false, false, false, false, false], 'inactive outside Chat Center');
  assert.equal(window.__ST_CHAT_AUTOMATED__.isAutomated(null), false);
});

test('chat bulk actions follow the in-thread menu rules and only run on the Open list with Beautify and write access', () => {
  const obs = v => () => v;
  let flag = 'on', write = true, tab = 0;
  const location = { hash: '#/ChatCenter' };
  const window = {
    ko: {},
    AppUser: { HasPermission: p => p === 'write' ? write : false },
    App: { Permissions: { ChatCenterWrite: 'write', EditPhone: 'phone' }, Enums: { ChatThreadViewStatus: { Open: 0 } }, Chat: { Instance: () => ({ ActiveTab: () => tab }) } },
  };
  vm.runInNewContext(source('chat-bulk-actions.js'), {
    window, location, addEventListener() {},
    document: { documentElement: { getAttribute: () => flag }, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} },
    setTimeout: () => 1, setInterval: () => 2, clearInterval() {},
    MutationObserver: class { observe() {} disconnect() {} },
  });
  const { canUnread, canClose, canBlock, active } = window.__ST_CHAT_BULK__;
  const fn = () => {};
  const thread = o => ({ IsUnread: obs(false), IsReplied: obs(false), IsClosed: obs(false), VisibleTypingUsers: obs([]),
    clickUnreadThread: fn, closeThread: fn, blockThread: fn, ...o });
  assert.equal(canUnread(thread()), true);
  assert.equal(canUnread(thread({ IsUnread: obs(true) })), false, 'already unread');
  assert.equal(canUnread(thread({ IsReplied: obs(true) })), true, 'replied threads can be marked unread as a reminder');
  assert.equal(canClose(thread()), true);
  assert.equal(canClose(thread({ IsClosed: obs(true) })), false);
  assert.equal(canClose(thread({ VisibleTypingUsers: obs([{}]) })), false, 'another agent is replying');
  assert.equal(canBlock(thread({ blockThread: undefined })), false, 'missing method fails quietly');
  assert.equal(active(), true);
  flag = null; assert.equal(active(), false, 'Beautify off');
  flag = 'on'; tab = 10; assert.equal(active(), false, 'Closed tab');
  tab = 0; write = false; assert.equal(active(), false, 'no Chat Center write permission');
  write = true; location.hash = '#/ChatCenter/8015121360'; assert.equal(active(), false, 'inside a thread');
});

test('chat reply box sends on Cmd/Ctrl+Enter through the native Send button only when it could send', () => {
  let module;
  const node = () => { const attrs = {}; return { attrs, children: [], setAttribute(k, v) { attrs[k] = v; }, getAttribute: k => attrs[k] ?? null,
    hasAttribute: k => k in attrs, removeAttribute(k) { delete attrs[k]; }, append(...n) { this.children.push(...n); }, remove() { this.removed = true; } }; };
  const window = { __ST_BEAUTIFY__: { register: m => { module = m; } } };
  vm.runInNewContext(source('chat-composer.js'), {
    window, navigator: { platform: 'MacIntel' }, Event: class { constructor(type) { this.type = type; } },
    document: { createElement: node, createTextNode: t => ({ t }) },
  });
  assert.equal(module.id, 'chat-composer');
  assert.equal(module.matches({ hash: '#/ChatCenter/8013769592?jobid=1' }), true);
  assert.equal(module.matches({ hash: '#/ChatCenter' }), false, 'thread list has no reply box');
  const key = o => ({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, isComposing: false, ...o });
  assert.equal(module.isSendShortcut(key({ metaKey: true })), true);
  assert.equal(module.isSendShortcut(key({ ctrlKey: true })), true);
  assert.equal(module.isSendShortcut(key({})), false, 'plain Enter still makes a new line');
  assert.equal(module.isSendShortcut(key({ metaKey: true, shiftKey: true })), false);
  assert.equal(module.isSendShortcut(key({ metaKey: true, isComposing: true })), false, 'IME composition is not a send');

  let clicks = 0, changes = 0, handler;
  const input = { ...node(), value: '', disabled: false, dispatchEvent: e => { if (e.type === 'change') changes++; } };
  const send = { ...node(), disabled: false, classList: { contains: () => false }, click: () => clicks++ };
  const root = { ...node(), querySelector: s => s.startsWith('textarea') ? input : send,
    addEventListener: (t, fn) => { handler = fn; }, removeEventListener: () => { handler = null; } };
  const dispose = module.mount(root);
  const hint = root.children[0];
  assert.ok(hint.hasAttribute('data-st-chat-hint'));
  assert.equal(send.getAttribute('title'), 'Send (⌘Enter)');
  let prevented = 0;
  const press = o => handler({ target: input, preventDefault: () => prevented++, stopPropagation() {}, ...key({ metaKey: true, ...o }) });
  press(); assert.equal(clicks, 0, 'empty box does not send');
  input.value = '   '; press(); assert.equal(clicks, 0, 'whitespace does not send');
  input.value = 'On our way'; input.disabled = true; press(); assert.equal(clicks, 0, 'disabled while sending or without permission');
  input.disabled = false; press(); assert.equal(clicks, 1); assert.equal(changes, 1, 'syncs Knockout before sending');
  assert.equal(prevented, 4, 'the shortcut never inserts a newline');
  dispose();
  assert.equal(hint.removed, true); assert.equal(send.hasAttribute('title'), false); assert.equal(handler, null);
});
