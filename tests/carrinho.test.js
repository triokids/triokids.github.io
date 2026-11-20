import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarCarrinho, revalidarItens, totalDosItens, encontrarVariante,
} from '../js/loja/carrinho.js';

const v = (codigo, cor, preco, estoque) => ({ codigo, cor, preco, campanha: false, fotos: 1, estoque });
const peca = (id, nome, variantes) =>
  ({ id, nome, categoria: 'Vestidos', colecao: '', descricao: '', destaque: false, ordem: 0, variantes });
const catalogo = (estoqueC1 = { '2': 2, '4': 3, '6': 0 }, precoC1 = 139.9) => ({
  pecas: [peca('C1', 'Clara', [v('C1', 'Cru', precoC1, estoqueC1), v('C2', 'Safira', 129.9, { '2': 1 })])],
  config: { whatsapp: '5562993379366', descontoCampanha: 10, avisoTopo: '' },
  campanha: [],
});

function memoria(inicial) {
  const dados = new Map(inicial === undefined ? [] : [['k', inicial]]);
  return { getItem: (c) => (dados.has(c) ? dados.get(c) : null), setItem: (c, x) => dados.set(c, x), dados };
}

test('encontrarVariante devolve peca e variante, ou null', () => {
  const r = encontrarVariante(catalogo(), 'C2');
  assert.equal(r.peca.id, 'C1');
  assert.equal(r.variante.codigo, 'C2');
  assert.equal(encontrarVariante(catalogo(), 'XX'), null);
});

test('adicionar soma, limita ao estoque e valida tamanho', () => {
  const c = criarCarrinho(memoria(), 'k');
  const cat = catalogo();
  assert.deepEqual(c.adicionar('C1', '4', 1, cat), { ok: true });
  assert.deepEqual(c.adicionar('C1', '4', 1, cat), { ok: true });
  assert.equal(c.itens()[0].quantidade, 2);
  assert.equal(c.itens()[0].precoVisto, 139.9);
  assert.deepEqual(c.adicionar('C1', '4', 5, cat), { ok: false, motivo: 'limite' });
  assert.equal(c.itens()[0].quantidade, 3);
  assert.deepEqual(c.adicionar('C1', '3', 1, cat), { ok: false, motivo: 'sem-tamanho' });
  assert.deepEqual(c.adicionar('XX', '4', 1, cat), { ok: false, motivo: 'sem-tamanho' });
  assert.deepEqual(c.adicionar('C1', '6', 1, cat), { ok: false, motivo: 'esgotado' });
  assert.equal(c.itens().length, 1);
});

test('adicionar ao mesmo item atualiza precoVisto para o preço atual', () => {
  const c = criarCarrinho(memoria(), 'k');
  c.adicionar('C1', '2', 1, catalogo());
  c.adicionar('C1', '2', 1, catalogo({ '2': 5 }, 120));
  assert.equal(c.itens()[0].precoVisto, 120);
  assert.equal(c.itens()[0].quantidade, 2);
});

test('alterar, remover, limpar e aoMudar', () => {
  const c = criarCarrinho(memoria(), 'k');
  const cat = catalogo();
  let chamadas = 0;
  c.aoMudar(() => { chamadas += 1; });
  c.adicionar('C1', '4', 1, cat);
  c.adicionar('C2', '2', 1, cat);
  assert.equal(chamadas, 2);
  c.alterar('C1', '4', 99, cat);
  assert.equal(c.itens().find((i) => i.codigo === 'C1').quantidade, 3);
  c.alterar('C1', '4', 2, cat);
  assert.equal(c.itens().find((i) => i.codigo === 'C1').quantidade, 2);
  c.alterar('C1', '4', 0, cat);
  assert.equal(c.itens().length, 1);
  c.remover('C2', '2');
  assert.equal(c.itens().length, 0);
  c.adicionar('C2', '2', 1, cat);
  c.limpar();
  assert.equal(c.itens().length, 0);
  assert.equal(chamadas, 8);
});

test('persiste no armazenamento e recarrega', () => {
  const mem = memoria();
  criarCarrinho(mem, 'k').adicionar('C1', '4', 2, catalogo());
  assert.deepEqual(JSON.parse(mem.dados.get('k')), [{ codigo: 'C1', tamanho: '4', quantidade: 2, precoVisto: 139.9 }]);
  assert.equal(criarCarrinho(mem, 'k').itens()[0].quantidade, 2);
});

test('JSON corrompido ou armazenamento que lança: carrinho vazio, sem exceção', () => {
  assert.deepEqual(criarCarrinho(memoria('{nao eh json'), 'k').itens(), []);
  assert.deepEqual(criarCarrinho(memoria('{"a":1}'), 'k').itens(), []);
  const quebrado = { getItem() { throw new Error('x'); }, setItem() { throw new Error('y'); } };
  const c = criarCarrinho(quebrado, 'k');
  assert.deepEqual(c.itens(), []);
  assert.deepEqual(c.adicionar('C1', '4', 1, catalogo()), { ok: true });
  assert.equal(c.itens().length, 1);
});

test('sem armazenamento funciona em memória', () => {
  const c = criarCarrinho(null, 'k');
  c.adicionar('C1', '4', 1, catalogo());
  assert.equal(c.itens().length, 1);
});

test('revalidarItens marca cada situação e usa sempre o preço atual', () => {
  const item = (codigo, tamanho, quantidade, precoVisto = 139.9) => ({ codigo, tamanho, quantidade, precoVisto });
  const cat = catalogo({ '2': 1, '4': 3, '6': 0 });
  const itens = [
    item('SUMIU', '2', 1),
    item('C1', '3', 1),
    item('C1', '6', 1),
    item('C1', '2', 2),
    item('C1', '4', 1),
    item('C2', '2', 1, 139.9),
  ];
  const r = revalidarItens(itens, cat);
  assert.deepEqual(r.map((i) => i.situacao), ['removida', 'removida', 'esgotado', 'reduzido', 'ok', 'preco-mudou']);
  assert.equal(r[3].quantidade, 1);
  assert.equal(r[3].precoUnit, 139.9);
  assert.equal(r[5].precoUnit, 129.9);
  assert.equal(r[5].variante.codigo, 'C2');
  assert.equal(r[5].peca.id, 'C1');
  assert.equal(itens[3].quantidade, 2, 'não muta a entrada');
});

test('reduzido prevalece sobre preco-mudou, com preço atual', () => {
  const r = revalidarItens([{ codigo: 'C1', tamanho: '2', quantidade: 5, precoVisto: 100 }], catalogo({ '2': 2 }));
  assert.equal(r[0].situacao, 'reduzido');
  assert.equal(r[0].quantidade, 2);
  assert.equal(r[0].precoUnit, 139.9);
});

test('totalDosItens ignora removida e esgotado', () => {
  const cat = catalogo({ '2': 1, '4': 3, '6': 0 });
  const r = revalidarItens([
    { codigo: 'SUMIU', tamanho: '2', quantidade: 1, precoVisto: 10 },
    { codigo: 'C1', tamanho: '6', quantidade: 1, precoVisto: 139.9 },
    { codigo: 'C1', tamanho: '2', quantidade: 2, precoVisto: 139.9 },
    { codigo: 'C2', tamanho: '2', quantidade: 1, precoVisto: 139.9 },
  ], cat);
  assert.equal(totalDosItens(r), 269.8);
});
