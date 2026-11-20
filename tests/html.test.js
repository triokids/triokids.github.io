import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, urlFoto, htmlTituloColorido, htmlPontinhos, htmlCartao, htmlItemCarrinho, htmlFaixaReserva } from '../js/ui/html.js';

const peca = (extra = {}, estoque = { 4: 1 }, campanha = true) => ({
  id: 'x-1', nome: 'Vestido Teste', categoria: 'Vestido', colecao: 'Linha Petit', descricao: '', destaque: false, ordem: 1,
  variantes: [{ codigo: 'x-1', cor: '', preco: 139.9, campanha, fotos: 2, estoque }],
  ...extra,
});

test('esc escapa & < > " \'', () => {
  assert.equal(esc('<b>"&\''), '&lt;b&gt;&quot;&amp;&#39;');
});

test('urlFoto monta caminho relativo', () => {
  assert.equal(urlFoto('conjunto-joab', 2), 'fotos/conjunto-joab-2.jpg');
});

test('htmlTituloColorido: um span por letra, espaço preservado, aria-label', () => {
  const h = htmlTituloColorido('Ab c');
  assert.equal((h.match(/<span/g) || []).length, 3);
  assert.match(h, /class="c1"/);
  assert.match(h, /class="c3"/);
  assert.match(h, /aria-label="Ab c"/);
  assert.ok(h.includes(' '));
});

test('htmlTituloColorido escapa o texto', () => {
  assert.ok(!htmlTituloColorido('<i>').includes('<i>'));
});

test('htmlPontinhos tem cinco pontos', () => {
  assert.equal((htmlPontinhos().match(/<i /g) || []).length, 5);
});

test('htmlCartao escapa o nome e liga para peca.html?c=', () => {
  const h = htmlCartao(peca({ nome: 'Body <script>' }), 10);
  assert.ok(!h.includes('<script>'));
  assert.match(h, /href="peca\.html\?c=x-1"/);
  assert.match(h, /fotos\/x-1-1\.jpg/);
});

test('htmlCartao de peça esgotada mostra esgotado', () => {
  assert.match(htmlCartao(peca({}, { 4: 0 }), 10), /esgotado/);
});

test('htmlCartao com campanha mostra R$ 125,91 para 139,90', () => {
  const h = htmlCartao(peca(), 10);
  assert.match(h, /R\$ 139,90/);
  assert.match(h, /R\$ 125,91/);
});

test('htmlCartao sem campanha não mostra preço de campanha e sem foto usa marcador', () => {
  const p = peca({}, { 4: 1 }, false);
  p.variantes[0].fotos = 0;
  const h = htmlCartao(p, 10);
  assert.ok(!h.includes('125,91'));
  assert.match(h, /img\/logo\.png/);
  assert.ok(!h.includes('fotos/x-1-1.jpg'));
});

test('htmlCartao com preços diferentes mostra "a partir de"', () => {
  const p = peca();
  p.variantes.push({ codigo: 'x-2', cor: 'Azul', preco: 150, campanha: true, fotos: 1, estoque: { 4: 1 } });
  assert.match(htmlCartao(p, 10), /a partir de/i);
});

test('htmlCartao lista pílulas de tamanhos disponíveis', () => {
  const h = htmlCartao(peca({}, { 2: 1, 4: 1, 6: 0 }), 10);
  assert.match(h, />2</);
  assert.match(h, />4</);
  assert.ok(!h.includes('>6<'));
});

test('htmlItemCarrinho escapa nome e cor e mostra aviso da situação', () => {
  const item = {
    codigo: 'x-1', tamanho: '4', quantidade: 2, precoVisto: 139.9, precoUnit: 139.9, situacao: 'reduzido',
    peca: { nome: '<b>Oi</b>' }, variante: { cor: '"c"', fotos: 1 },
  };
  const h = htmlItemCarrinho(item);
  assert.ok(!h.includes('<b>'));
  assert.ok(h.includes('&lt;b&gt;'));
  assert.match(h, /data-codigo="x-1"/);
  assert.match(h, /R\$ 279,80/);
  assert.match(h, /quantidade foi reduzida|reduzid/i);
});

test('htmlItemCarrinho de item removida não quebra', () => {
  const h = htmlItemCarrinho({ codigo: 'z', tamanho: 'P', quantidade: 1, precoVisto: 10, situacao: 'removida' });
  assert.match(h, /não está mais disponível/i);
});

test('htmlFaixaReserva avisa para confirmar no WhatsApp', () => {
  assert.match(htmlFaixaReserva(), /WhatsApp/);
});
