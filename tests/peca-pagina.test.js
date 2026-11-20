import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlGaleria, htmlSeletorTamanho, htmlSeletorCor, htmlBlocoPreco, htmlEspiar, urlFoto } from '../js/ui/html.js';

const safira = { codigo: 'vestido-clara-safira', cor: 'Safira', preco: 129.9, campanha: true, fotos: 3, estoque: { 6: 0, 2: 3, 4: 1 } };
const cru = { codigo: 'vestido-clara-cru', cor: 'Cru', preco: 129.9, campanha: true, fotos: 1, estoque: { 1: 1 } };

test('seletor de tamanho: botões 2, 4, 6 na ordem de TAMANHOS, 6 desabilitado e riscado', () => {
  const h = htmlSeletorTamanho(safira);
  const botoes = [...h.matchAll(/<button[^>]*data-tamanho="([^"]+)"[^>]*>/g)];
  assert.deepEqual(botoes.map((m) => m[1]), ['2', '4', '6']);
  assert.ok(!/data-tamanho="2"[^>]*disabled/.test(h));
  assert.match(botoes[2][0], /disabled/);
  assert.match(botoes[2][0], /tam-esgotado/);
});

test('seletor de tamanho: estoque 1 mostra "última unidade"; estoque 3 não', () => {
  const h = htmlSeletorTamanho(safira);
  assert.equal((h.match(/última unidade/g) || []).length, 1);
  assert.match(h, /data-tamanho="4"[\s\S]*última unidade/);
});

test('seletor de cor: peça com 1 variante devolve string vazia', () => {
  assert.equal(htmlSeletorCor({ variantes: [safira] }, safira.codigo), '');
});

test('seletor de cor: marca a cor atual e escapa texto', () => {
  const h = htmlSeletorCor({ variantes: [cru, { ...safira, cor: 'A<b>' }] }, cru.codigo);
  assert.match(h, /data-codigo="vestido-clara-cru"[^>]*aria-pressed="true"/);
  assert.match(h, /data-codigo="vestido-clara-safira"[^>]*aria-pressed="false"/);
  assert.ok(!h.includes('A<b>'));
});

test('galeria sem fotos mostra o marcador com logo', () => {
  const h = htmlGaleria({ ...safira, fotos: 0 }, 'Vestido Clara');
  assert.match(h, /sem-foto/);
  assert.match(h, /img\/logo\.png/);
});

test('galeria usa urlFoto, alt com nome e cor, lazy só a partir da segunda', () => {
  const h = htmlGaleria(safira, 'Vestido Clara');
  for (const n of [1, 2, 3]) assert.ok(h.includes(`src="${urlFoto(safira.codigo, n)}"`));
  assert.match(h, /alt="Vestido Clara — Safira — foto 2"/);
  const imgs = [...h.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
  assert.ok(!/loading="lazy"/.test(imgs[0]));
  assert.match(imgs[1], /loading="lazy"/);
  assert.match(h, /scroll-snap|galeria-faixa/);
  assert.match(h, /1 \/ 3/);
});

test('htmlGaleria com idBase usa ids próprios; sem idBase mantém galeria-faixa', () => {
  assert.match(htmlGaleria(safira, 'V', 'espiar-galeria'), /id="espiar-galeria-faixa"[\s\S]*id="espiar-galeria-indicador"/);
  assert.match(htmlGaleria(safira, 'V'), /id="galeria-faixa"/);
});
test('htmlSeletorTamanho com escolhido marca só ele; sem escolhido nada marcado', () => {
  const h = htmlSeletorTamanho(safira, '2');
  assert.match(h, /class="tam tam-escolhido" data-tamanho="2" aria-pressed="true"/);
  assert.match(h, /data-tamanho="4" aria-pressed="false"/);
  assert.doesNotMatch(htmlSeletorTamanho(safira), /aria-pressed="true"/);
});
test('htmlBlocoPreco: preço e campanha com link', () => {
  const h = htmlBlocoPreco(safira, 10);
  assert.match(h, /R\$ 129,90/);
  assert.match(h, /href="campanha\.html"/);
  assert.match(h, /R\$ 116,91/);
});
test('htmlEspiar: nome escapado, tamanho marcado, adicionar habilitado, link Ver detalhes', () => {
  const p = { id: 'vestido-clara', nome: 'Clara <3', variantes: [safira, cru] };
  const h = htmlEspiar(p, safira, { desconto: 10, tamanho: '2', quantidade: 1 });
  assert.match(h, /<h2 id="espiar-nome">Clara &lt;3<\/h2>/);
  assert.match(h, /data-tamanho="2"[^>]*aria-pressed="true"/);
  assert.match(h, /id="espiar-adicionar"(?![^>]*disabled)/);
  assert.match(h, /href="peca\.html\?c=vestido-clara-safira"[^>]*>Ver detalhes/);
  assert.match(h, /data-codigo="vestido-clara-cru"/); // seletor de cor presente
});
test('htmlEspiar sem tamanho: adicionar desabilitado e aviso "Escolha um tamanho"', () => {
  const h = htmlEspiar({ id: 'c', nome: 'C', variantes: [cru] }, cru, { desconto: 10 });
  assert.match(h, /id="espiar-adicionar"[^>]*disabled/);
  assert.match(h, /Escolha um tamanho/);
});
