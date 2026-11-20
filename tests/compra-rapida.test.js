import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoComprar, varianteParaComprar, mensagemCarrinho } from '../js/loja/compra-rapida.js';

const v = (codigo, estoque) => ({ codigo, cor: codigo, preco: 10, campanha: false, fotos: 1, estoque });
const peca = (...variantes) => ({ id: 'p', nome: 'P', variantes });

test('modoComprar: esgotada → nenhum', () => {
  assert.equal(modoComprar(peca(v('a', { 4: 0 }))), 'nenhum');
});
test('modoComprar: uma variante com estoque → tamanhos', () => {
  assert.equal(modoComprar(peca(v('a', { 4: 2 }))), 'tamanhos');
});
test('modoComprar: duas cores, só uma com estoque → tamanhos com a que tem', () => {
  const p = peca(v('a', { 4: 0 }), v('b', { 2: 1 }));
  assert.equal(modoComprar(p), 'tamanhos');
  assert.equal(varianteParaComprar(p).codigo, 'b');
});
test('modoComprar: duas cores com estoque → espiar', () => {
  const p = peca(v('a', { 4: 1 }), v('b', { 2: 1 }));
  assert.equal(modoComprar(p), 'espiar');
  assert.equal(varianteParaComprar(p), null);
});
test('mensagemCarrinho cobre ok, limite, esgotado, sem-tamanho e desconhecido', () => {
  const x = v('a', { 4: 2 });
  assert.equal(mensagemCarrinho({ ok: true }, x, '4'), '');
  assert.equal(mensagemCarrinho({ ok: false, motivo: 'limite' }, x, '4'), 'Só temos 2 no tamanho 4');
  assert.equal(mensagemCarrinho({ ok: false, motivo: 'esgotado' }, x, '4'), 'Esse tamanho esgotou.');
  assert.equal(mensagemCarrinho({ ok: false, motivo: 'sem-tamanho' }, x, '4'), 'Esse tamanho não está disponível.');
  assert.equal(mensagemCarrinho({ ok: false, motivo: '?' }, x, '4'), 'Não foi possível adicionar.');
});
