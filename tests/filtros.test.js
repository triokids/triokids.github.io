import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precoComCampanha } from '../js/loja/campanha.js';
import {
  menorPreco, tamanhosDisponiveis, esgotada, filtrarPecas, ordenarPecas, destaques,
} from '../js/loja/filtros.js';

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

test('precoComCampanha arredonda a centavos', () => {
  assert.equal(precoComCampanha(139.9, 10), 125.91);
  assert.equal(precoComCampanha(45.5, 10), 40.95);
  assert.equal(precoComCampanha(129.9, 10), 116.91);
});

test('menorPreco e tamanhosDisponiveis', () => {
  assert.equal(menorPreco(clara), 129.9);
  assert.deepEqual(tamanhosDisponiveis(clara), ['1', '2', '4', '6']);
});

test('esgotada', () => {
  assert.equal(esgotada(velha), true);
  assert.equal(esgotada(clara), false);
});

test('filtrarPecas', () => {
  assert.deepEqual(filtrarPecas(todas, { tamanho: '3' }).map(p => p.id), ['J1']);
  assert.deepEqual(filtrarPecas(todas, { categoria: 'Vestidos' }).map(p => p.id), ['C1', 'E1']);
  assert.deepEqual(filtrarPecas(todas, { precoMin: 50, precoMax: 100 }).map(p => p.id), ['E1']);
  assert.deepEqual(filtrarPecas(todas, { precoMax: 45.5 }).map(p => p.id), ['J1']);
  assert.equal(filtrarPecas(todas, {}).length, 3);
});

test('ordenarPecas não muta e ordena', () => {
  const copia = [...todas];
  assert.deepEqual(ordenarPecas(todas, 'novidades').map(p => p.id), ['E1', 'J1', 'C1']);
  assert.deepEqual(ordenarPecas(todas, 'menor-preco').map(p => p.id), ['J1', 'E1', 'C1']);
  assert.deepEqual(ordenarPecas(todas, 'maior-preco').map(p => p.id), ['C1', 'E1', 'J1']);
  assert.deepEqual(todas, copia);
});

test('destaques', () => {
  const marcadas = [clara, { ...jardineira, destaque: true }, velha];
  assert.deepEqual(destaques(marcadas).map(p => p.id), ['J1']);
  const muitas = Array.from({ length: 10 }, (_, i) => peca('X' + i, 'n' + i, 'c', i, []));
  assert.deepEqual(destaques(muitas).map(p => p.id), ['X9', 'X8', 'X7', 'X6', 'X5', 'X4', 'X3', 'X2']);
  const marc = muitas.map(p => ({ ...p, destaque: true }));
  assert.deepEqual(destaques(marc).map(p => p.id), ['X0', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7']);
});
