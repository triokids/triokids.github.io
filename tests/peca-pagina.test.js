import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlGaleria, htmlSeletorTamanho, htmlSeletorCor, urlFoto } from '../js/ui/html.js';

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

test('galeria mostra a foto grande (sem lazy) e uma miniatura por foto', () => {
  const h = htmlGaleria(safira, 'Vestido Clara');
  const principal = h.match(/<img[^>]*id="galeria-foto"[^>]*>/)[0];
  assert.ok(principal.includes(`src="${urlFoto(safira.codigo, 1)}"`));
  assert.ok(!/loading="lazy"/.test(principal));
  assert.match(principal, /alt="Vestido Clara — Safira — foto 1"/);
  const minis = [...h.matchAll(/<button[^>]*class="galeria-mini"[^>]*>/g)].map((m) => m[0]);
  assert.equal(minis.length, 3);
  assert.deepEqual(minis.map((b) => b.match(/data-foto="(\d+)"/)[1]), ['1', '2', '3']);
  assert.match(minis[0], /aria-current="true"/);
  assert.ok(!/aria-current/.test(minis[1]));
  for (const n of [1, 2, 3]) assert.ok(h.includes(`src="${urlFoto(safira.codigo, n)}"`));
  assert.match(h, /aria-label="Ver foto 2 de 3"/);
  assert.match(h, /1 \/ 3/);
  assert.ok(!/galeria-faixa|scroll-snap/.test(h));
});

test('galeria abre na foto pedida e tem setas anterior/próxima', () => {
  const h = htmlGaleria(safira, 'Vestido Clara', 2);
  assert.ok(h.match(/<img[^>]*id="galeria-foto"[^>]*>/)[0].includes(`src="${urlFoto(safira.codigo, 2)}"`));
  assert.match(h, /data-foto="2"[^>]*aria-current="true"/);
  assert.match(h, /2 \/ 3/);
  assert.match(h, /class="galeria-seta galeria-anterior"/);
  assert.match(h, /class="galeria-seta galeria-proxima"/);
});

test('galeria com foto fora do intervalo volta para a primeira', () => {
  const h = htmlGaleria(safira, 'Vestido Clara', 9);
  assert.match(h, /data-foto="1"[^>]*aria-current="true"/);
});

test('galeria com uma foto só não mostra miniaturas, setas nem indicador', () => {
  const h = htmlGaleria(cru, 'Vestido Clara');
  assert.match(h, /id="galeria-foto"/);
  assert.ok(!/galeria-mini|galeria-seta|galeria-indicador/.test(h));
});
