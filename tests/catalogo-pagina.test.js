import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerFiltrosDaUrl, filtrosParaUrl, esgotadasNoFim, filtrosDoFormulario } from '../js/loja/filtros-url.js';
import { htmlFiltros, htmlTituloCatalogo } from '../js/ui/html.js';

const peca = (id, estoque) => ({ id, nome: id, variantes: [{ codigo: id, preco: 10, estoque }] });

test('esgotadasNoFim mantém a ordem e põe as esgotadas no fim', () => {
  const a = peca('a', { 3: 1 });
  const b = peca('b', {});
  const c = peca('c', { P: 2 });
  const d = peca('d', { M: 0 });
  assert.deepEqual(esgotadasNoFim([a, b, c, d]).map((p) => p.id), ['a', 'c', 'b', 'd']);
});

test('lerFiltrosDaUrl lê categoria e tamanho e usa ordem padrão', () => {
  assert.deepEqual(lerFiltrosDaUrl('?categoria=Vestido&tamanho=4'), { categoria: 'Vestido', tamanho: '4', ordem: 'novidades' });
});

test('lerFiltrosDaUrl ignora parâmetro desconhecido, preço inválido, tamanho e ordem inexistentes', () => {
  assert.deepEqual(lerFiltrosDaUrl('?foo=1&precoMin=abc&precoMax=&tamanho=99&ordem=xyz'), { ordem: 'novidades' });
  assert.deepEqual(lerFiltrosDaUrl(''), { ordem: 'novidades' });
});

test('lerFiltrosDaUrl lê preços, inclusive com vírgula', () => {
  assert.deepEqual(lerFiltrosDaUrl('?precoMin=50&precoMax=99,9&ordem=menor-preco'), { precoMin: 50, precoMax: 99.9, ordem: 'menor-preco' });
});

test('ida e volta preserva os filtros', () => {
  const f = { categoria: 'Conjunto & Cia', tamanho: 'P', precoMin: 50, precoMax: 120.5, ordem: 'maior-preco' };
  assert.deepEqual(lerFiltrosDaUrl(filtrosParaUrl(f)), f);
  assert.equal(filtrosParaUrl({ ordem: 'novidades' }), '');
  assert.equal(filtrosParaUrl({ tamanho: '3', ordem: 'novidades' }), '?tamanho=3');
});

test('htmlFiltros: categorias escapadas, valores marcados, botão Filtrar', () => {
  const h = htmlFiltros(['Vestido', 'A<b>'], { categoria: 'Vestido', tamanho: '3', precoMin: 40, ordem: 'menor-preco' });
  assert.match(h, /<option value="Vestido" selected>/);
  assert.match(h, /A&lt;b&gt;/);
  assert.doesNotMatch(h, /<b>/);
  assert.match(h, /<option value="3" selected>/);
  assert.match(h, /name="precoMin"[^>]*value="40"/);
  assert.match(h, /<option value="menor-preco" selected>/);
  assert.match(h, /aria-controls="painel-filtros"/);
  assert.match(h, />Filtrar</);
});

test('htmlTituloCatalogo: sem termo é Catálogo; com termo mostra Resultados para “termo” escapado', () => {
  assert.equal(htmlTituloCatalogo(undefined), 'Catálogo');
  assert.equal(htmlTituloCatalogo(''), 'Catálogo');
  assert.equal(htmlTituloCatalogo('bata'), 'Resultados para “bata”');
  assert.equal(htmlTituloCatalogo('<b>x'), 'Resultados para “&lt;b&gt;x”');
});

test('filtrosDoFormulario mantém a busca da URL ao mudar outro filtro', () => {
  const f = filtrosDoFormulario([['categoria', 'Vestido'], ['tamanho', '4'], ['ordem', 'novidades']], 'bata');
  assert.deepEqual(f, { busca: 'bata', categoria: 'Vestido', tamanho: '4', ordem: 'novidades' });
  assert.deepEqual(filtrosDoFormulario([['tamanho', '4']], undefined), { tamanho: '4', ordem: 'novidades' });
});
