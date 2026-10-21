import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('private vault locks immediately on backgrounding or pagehide', async () => {
  const app = await read('app.js');
  assert.match(app, /document\.hidden\)\{AUSFIG_HIDDEN_AT=Date\.now\(\);if\(!s0\)tx\(\)/);
  assert.match(app, /pagehide",\(\)=>\{AUSFIG_HIDDEN_AT=Date\.now\(\);if\(!s0\)tx\(\)/);
});

test('public quick-message state is cleared when switching views or hiding decrypted content', async () => {
  const app = await read('public-app-fast-v5.js');
  assert.match(app, /function clearPublicSensitive\(\)/);
  assert.match(app, /function contactsView\(\)\{\s*clearPublicSensitive\(\)/);
  assert.match(app, /if\(document\.hidden&&\(mode==='decrypt'/);
  assert.match(app, /if\(op!==operationId\)return/);
});

test('both public and private scripts are precached for offline use', async () => {
  const sw = await read('sw.js');
  const html = await read('index.html');
  for (const asset of ['./public-app-fast-v5.js?v=10', './app.js?v=10', './private-contacts-v5.js?v=10'])
    assert.ok(sw.includes("'" + asset + "'"), 'Missing offline resource: ' + asset);
  assert.match(html, /public-app-fast-v5\.js\?v=10/);
});
