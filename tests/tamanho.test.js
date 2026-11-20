import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRADE, IDADES, recomendarTamanho, tamanhosNoCatalogo } from '../js/loja/tamanho.js';

test('grade segue a tabela da página', () => {
  assert.deepEqual(GRADE.map((g) => [g.tamanho, g.ate]), [
    ['P', 62], ['M', 68], ['G', 73], ['01', 80], ['02', 90], ['03/04', 103], ['06', 116],
  ]);
});

test('estatura escolhe o menor tamanho que comporta a criança', () => {
  const r = recomendarTamanho({ estatura: 74 });
  assert.equal(r.tipo, 'ok');
  assert.equal(r.tamanho, '01');
  assert.equal(r.ate, 80);
  assert.equal(r.folga, 6);
  assert.equal(r.proximo, undefined);
});

test('no limite exato ainda é o mesmo tamanho', () => {
  assert.equal(recomendarTamanho({ estatura: 62 }).tamanho, 'P');
  assert.equal(recomendarTamanho({ estatura: 62.5 }).tamanho, 'M');
});

test('perto do limite (até 2 cm) sugere o próximo tamanho', () => {
  const r = recomendarTamanho({ estatura: 90 });
  assert.equal(r.tamanho, '02');
  assert.equal(r.folga, 0);
  assert.equal(r.proximo, '03/04');
  assert.equal(recomendarTamanho({ estatura: 87 }).proximo, undefined);
});

test('último tamanho no limite não sugere próximo', () => {
  const r = recomendarTamanho({ estatura: 116 });
  assert.equal(r.tamanho, '06');
  assert.equal(r.proximo, undefined);
});

test('acima da grade', () => {
  const r = recomendarTamanho({ estatura: 120 });
  assert.equal(r.tipo, 'acima');
  assert.equal(r.tamanho, '06+');
});

test('idade só avisa quando discorda da estatura', () => {
  assert.equal(recomendarTamanho({ estatura: 74, idade: '6-9m' }).pelaIdade, 'G');
  assert.equal(recomendarTamanho({ estatura: 74, idade: '2a' }).pelaIdade, '02');
  assert.equal(recomendarTamanho({ estatura: 86, idade: '1a' }).pelaIdade, undefined);
  assert.equal(recomendarTamanho({ estatura: 74 }).pelaIdade, undefined);
});

test('toda idade da lista tem tamanho de referência', () => {
  for (const i of IDADES) assert.ok(i.tamanho, i.valor);
});

test('estatura inválida devolve erro', () => {
  for (const e of [undefined, '', 'abc', 0, 39, 151]) {
    assert.equal(recomendarTamanho({ estatura: e }).tipo, 'erro', String(e));
  }
  assert.equal(recomendarTamanho({ estatura: '74,5' }).tamanho, '01');
});

test('tamanho 3 tem a mesma medida do 4', () => {
  assert.equal(recomendarTamanho({ estatura: 95 }).tamanho, '03/04');
  assert.equal(recomendarTamanho({ estatura: 95, idade: '3a' }).pelaIdade, undefined);
  assert.equal(recomendarTamanho({ estatura: 95, idade: '4a' }).pelaIdade, undefined);
});

test('tamanho da tabela vira o filtro do catálogo', () => {
  assert.deepEqual(tamanhosNoCatalogo('01'), ['1']);
  assert.deepEqual(tamanhosNoCatalogo('06'), ['6']);
  assert.deepEqual(tamanhosNoCatalogo('P'), ['P']);
  assert.deepEqual(tamanhosNoCatalogo('03/04'), ['3', '4']);
});
