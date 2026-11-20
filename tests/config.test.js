import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';

test('WhatsApp da vendedora no config.js', () => {
  assert.equal(CONFIG.whatsapp, '5562992339674');
  assert.equal(CONFIG.vendedora, 'Anne');
});
