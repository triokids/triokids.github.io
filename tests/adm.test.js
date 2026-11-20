import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { destinoAdm } from '../js/paginas/adm.js';
import { CONFIG } from '../config.js';

test('destinoAdm aceita só endereço do Apps Script', () => {
  const ok = 'https://script.google.com/macros/s/AKfy123/exec';
  assert.equal(destinoAdm(ok), ok);
  assert.equal(destinoAdm('  ' + ok + '  '), ok);
  assert.equal(destinoAdm(''), null);
  assert.equal(destinoAdm(undefined), null);
  assert.equal(destinoAdm('http://script.google.com/macros/s/x/exec'), null);
  assert.equal(destinoAdm('https://script.google.com.evil.com/macros/s/x/exec'), null);
  assert.equal(destinoAdm('https://exemplo.com/'), null);
  assert.equal(destinoAdm('javascript:alert(1)'), null);
});

test('config.js tem o campo urlAdm', () => {
  assert.equal(typeof CONFIG.urlAdm, 'string');
});

test('adm.html não é indexada e usa o script da página', () => {
  const html = fs.readFileSync(new URL('../adm.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /js\/paginas\/adm\.js/);
});
