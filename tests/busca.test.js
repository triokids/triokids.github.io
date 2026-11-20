import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, casaBusca, sugerir } from '../js/loja/busca.js';
import { lerFiltrosDaUrl, filtrosParaUrl } from '../js/loja/filtros-url.js';

const v = (codigo, cor, preco, estoque) => ({ codigo, cor, preco, campanha: false, fotos: 1, estoque });
const peca = (id, nome, categoria, ordem, variantes, destaque = false) =>
  ({ id, nome, categoria, colecao: '', descricao: '', destaque, ordem, variantes });

const clara = peca('C1', 'Clara', 'Vestidos', 0, [
  v('C1', 'Cru', 139.9, { '1': 1, '2': 1, '6': 1 }),
  v('C2', 'Safira', 129.9, { '2': 1, '4': 1, '6': 0 }),
]);
const jardineira = peca('J1', 'Jardineira', 'Conjuntos', 1, [v('J1', 'Jeans', 45.5, { '2': 2, '3': 1 })]);
const velha = peca('E1', 'Esgotada', 'Vestidos', 2, [v('E1', 'Rosa', 80, { '2': 0, '3': 0 })]);
const todas = [clara, jardineira, velha];

test('normalizar', () => {
  assert.equal(normalizar('  Vestido   Maria JÚLIA '), 'vestido maria julia');
});

test('casaBusca', () => {
  assert.equal(casaBusca(clara, 'safira'), true);
  assert.equal(casaBusca(clara, 'vestidos clara'), true);
  assert.equal(casaBusca(clara, 'vestidos jeans'), false);
  assert.equal(casaBusca(clara, '   '), true);
});

test('sugerir', () => {
  assert.deepEqual(sugerir(todas, 'v'), []);
  assert.deepEqual(sugerir(todas, '  '), []);
  assert.deepEqual(sugerir([velha, clara], 'vest').map(p => p.id), ['C1', 'E1']);
  const sete = Array.from({ length: 7 }, (_, i) => peca('V' + i, 'Vestido ' + i, 'Vestidos', i, [v('V' + i, 'Cru', 10, { '2': 1 })]));
  assert.equal(sugerir(sete, 'vest').length, 5);
});

test('url: busca', () => {
  assert.deepEqual(lerFiltrosDaUrl('?busca=%20bata%20'), { busca: 'bata', ordem: 'novidades' });
  assert.equal('busca' in lerFiltrosDaUrl('?busca='), false);
  assert.equal(filtrosParaUrl({ busca: 'a&b #', ordem: 'novidades' }), '?busca=a%26b+%23');
});

test('casaBusca só olha nome, categoria, coleção e cor', () => {
  const p = { ...peca('ZZ9', 'Bata', 'Blusas', 0, [v('QQ7', 'Rosa', 10, { '2': 1 })]), descricao: 'lindo vestido de festa' };
  assert.equal(casaBusca(p, 'vestido'), false);
  assert.equal(casaBusca(p, 'zz9'), false);
  assert.equal(casaBusca(p, 'qq7'), false);
  const c = { ...p, colecao: 'Verão' };
  assert.equal(casaBusca(c, 'verao'), true);
  assert.equal(casaBusca(c, 'rosa'), true);
});

test('casaBusca ignora acento nos dois sentidos', () => {
  const sem = peca('A1', 'Julia', 'Vestidos', 0, [v('A1', 'Cru', 10, { '2': 1 })]);
  const com = peca('A2', 'Júlia', 'Vestidos', 0, [v('A2', 'Cru', 10, { '2': 1 })]);
  assert.equal(casaBusca(sem, 'júlia'), true);
  assert.equal(casaBusca(com, 'julia'), true);
});
