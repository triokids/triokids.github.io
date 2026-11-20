import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parsePreco, formatarPreco } from '../js/dados/csv.js';

test('parseCsv: casos básicos e RFC 4180', () => {
  assert.deepEqual(parseCsv('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCsv('n\n"Vestido, azul"'), [['n'], ['Vestido, azul']]);
  assert.deepEqual(parseCsv('n\n"diz ""oi"""'), [['n'], ['diz "oi"']]);
  assert.deepEqual(parseCsv('n\n"linha1\nlinha2"'), [['n'], ['linha1\nlinha2']]);
  assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCsv('\uFEFFa\n1'), [['a'], ['1']]);
});

test('parsePreco', () => {
  assert.equal(parsePreco('139,90'), 139.9);
  assert.equal(parsePreco('139.90'), 139.9);
  assert.equal(parsePreco('R$ 1.139,90'), 1139.9);
  assert.equal(parsePreco(''), null);
  assert.equal(parsePreco('abc'), null);
});

test('formatarPreco', () => {
  assert.equal(formatarPreco(125.91), 'R$ 125,91');
  assert.equal(formatarPreco(1139.9), 'R$ 1.139,90');
  assert.ok(!formatarPreco(1).includes('\u00a0'));
});
