const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

// Expose the production reader inside its closure without mounting the UI.
const source = readFileSync(path.join(__dirname, '../features/beautify/job-contacts.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source.replace('  window.__ST_BEAUTIFY__?.register({', '  window.readContacts = readContacts;\n  window.__ST_BEAUTIFY__?.register({'), context);
function row(scope, label, href) {
  const anchor = { textContent: href, getAttribute: () => href };
  return {
    anchor,
    querySelector: selector => selector === '.Tag__body' ? { textContent: label } : anchor,
    closest: () => ({ querySelector: () => scope === 'location' ? {} : null })
  };
}
const read = rows => context.window.readContacts({ querySelectorAll: () => rows });

test('identical location and billing contacts appear once and retain native links', () => {
  const rows = [row('location', 'Alex Example : Manager', 'tel:5550100'), row('location', 'Alex Example : Manager', 'mailto:alex@example.com'), row('billing', 'Alex Example : Manager', 'mailto:alex@example.com'), row('billing', 'Alex Example : Manager', 'tel:5550100')];
  const result = read(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Alex Example');
  assert.equal(result[0].title, 'Manager');
  assert.equal(result[0].channels.length, 2);
  assert.equal(result[0].channels[0].source, rows[0].anchor);
});

test('shared names, shared endpoints, and partial matches do not collapse different contacts', () => {
  for (const billing of [
    [row('billing', 'Alex Example', 'tel:5550101')],
    [row('billing', 'Other Person', 'tel:5550100')],
    [row('billing', 'Alex Example : Manager', 'tel:5550100')],
    [row('billing', 'Alex Example', 'tel:5550100'), row('billing', 'Alex Example', 'mailto:alex@example.com')]
  ]) assert.equal(read([row('location', 'Alex Example', 'tel:5550100'), ...billing]).length, 2);
});

test('unnamed contacts deduplicate only when their endpoints match', () => {
  const result = read([row('location', '', 'tel:5550100'), row('billing', '', 'tel:5550100'), row('billing', '', 'tel:5550101')]);
  assert.equal(result.length, 2);
});
