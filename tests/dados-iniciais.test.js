import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { montarCatalogo } from '../js/dados/catalogo.js';
import { destaques } from '../js/loja/filtros.js';

const raiz = new URL('../', import.meta.url);
const bruto = JSON.parse(readFileSync(new URL('catalogo.json', raiz), 'utf8'));
const padrao = { whatsapp: '5562993379366', descontoCampanha: 0 };
const cat = montarCatalogo(bruto, padrao);

test('catalogo.json tem o formato esperado', () => {
  assert.deepEqual(Object.keys(bruto).sort(), ['campanha', 'config', 'geradoEm', 'pecas']);
});

// O catalogo.json é regerado pela Área Adm a partir da planilha: peças, estoque,
// destaques e fotos mudam com o uso. Estes testes conferem a estrutura, nunca
// quantidades ou valores de uma peça específica.

test('catálogo tem peças, cada uma com nome e ao menos uma variante com preço', () => {
  assert.ok(cat.pecas.length > 0);
  for (const p of cat.pecas) {
    assert.ok(p.nome, `peça ${p.id} sem nome`);
    assert.ok(p.variantes.length >= 1, `peça ${p.id} sem variante`);
    for (const v of p.variantes) assert.ok(v.preco > 0, `${v.codigo} sem preço`);
  }
});

test('códigos de variante não se repetem', () => {
  const codigos = cat.pecas.flatMap((p) => p.variantes.map((v) => v.codigo));
  assert.equal(new Set(codigos).size, codigos.length);
});

test('no máximo 8 peças aparecem em destaque na página inicial', () => {
  assert.ok(destaques(cat.pecas).length <= 8);
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

test('o logo existe (é o substituto de peça sem foto)', () => {
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
