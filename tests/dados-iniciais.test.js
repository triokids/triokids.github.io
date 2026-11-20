import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { montarCatalogo } from '../js/dados/catalogo.js';

const raiz = new URL('../', import.meta.url);
const bruto = JSON.parse(readFileSync(new URL('catalogo.json', raiz), 'utf8'));
const padrao = { whatsapp: '5562993379366', descontoCampanha: 0 };
const cat = montarCatalogo(bruto, padrao);

test('catalogo.json tem o formato esperado', () => {
  assert.deepEqual(Object.keys(bruto).sort(), ['campanha', 'config', 'geradoEm', 'pecas']);
});

test('carga inicial: 14 peças agrupadas por nome', () => {
  assert.equal(cat.pecas.length, 14);
});

test('Vestido Clara tem 2 variantes', () => {
  const clara = cat.pecas.find((p) => p.nome === 'Vestido Clara');
  assert.equal(clara.variantes.length, 2);
  assert.deepEqual(clara.variantes.map((v) => v.cor), ['Cru', 'Safira']);
});

test('Jardineira Antonella tem estoque 2:2 e 3:1', () => {
  const j = cat.pecas.find((p) => p.nome === 'Jardineira Antonella');
  assert.deepEqual(j.variantes[0].estoque, { 2: 2, 3: 1 });
  assert.equal(j.variantes[0].preco, 119.9);
});

test('8 peças em destaque, todas com campanha ativa', () => {
  assert.equal(cat.pecas.filter((p) => p.destaque).length, 8);
  assert.ok(cat.pecas.every((p) => p.variantes.every((v) => v.campanha)));
});

test('toda foto declarada existe em disco', () => {
  for (const p of cat.pecas) {
    for (const v of p.variantes) {
      for (let n = 1; n <= v.fotos; n++) {
        assert.ok(existsSync(new URL(`fotos/${v.codigo}-${n}.jpg`, raiz)), `${v.codigo}-${n}.jpg`);
      }
    }
  }
});

test('toda variante tem foto, exceto a Safira (sem foto própria), e o logo existe', () => {
  for (const p of cat.pecas) for (const v of p.variantes) {
    if (v.codigo !== 'vestido-clara-safira') assert.ok(v.fotos >= 1, v.codigo);
  }
  const safira = cat.pecas.flatMap((p) => p.variantes).find((v) => v.codigo === 'vestido-clara-safira');
  assert.equal(safira.fotos, 0);
  assert.equal(existsSync(new URL('fotos/vestido-clara-safira-1.jpg', raiz)), false);
  assert.ok(existsSync(new URL('img/logo.png', raiz)));
});

test('logo tem canal alfa (PNG RGBA), sem fundo opaco', () => {
  const png = readFileSync(new URL('img/logo.png', raiz));
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.equal(png[25], 6, 'tipo de cor 6 = RGBA');
});

test('config e campanha', () => {
  assert.equal(cat.config.whatsapp, '5562993379366');
  assert.equal(cat.config.descontoCampanha, 10);
  assert.ok(!cat.campanha.some((t) => t.includes('provisório')));
  for (const titulo of ['## Nosso propósito', '## Como funciona', '## O que aceitamos', '## Não receberemos']) {
    assert.ok(cat.campanha.includes(titulo), titulo);
  }
  assert.ok(cat.campanha.includes('- Roupa íntima usada'));
});
