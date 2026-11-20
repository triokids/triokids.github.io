import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, urlFoto, htmlTituloColorido, htmlPontinhos, htmlCartao, htmlItemCarrinho, htmlFaixaReserva, htmlCampoBusca, htmlSugestoes } from '../js/ui/html.js';

const peca = (extra = {}, estoque = { 4: 1 }, campanha = true) => ({
  id: 'x-1', nome: 'Vestido Teste', categoria: 'Vestido', colecao: 'Linha Petit', descricao: '', destaque: false, ordem: 1,
  variantes: [{ codigo: 'x-1', cor: '', preco: 139.9, campanha, fotos: 2, estoque }],
  ...extra,
});

test('esc escapa & < > " \'', () => {
  assert.equal(esc('<b>"&\''), '&lt;b&gt;&quot;&amp;&#39;');
});

test('urlFoto codifica o código (#, ? e % não quebram a imagem)', () => {
  assert.equal(urlFoto('a#b?c%d', 1), 'fotos/a%23b%3Fc%25d-1.jpg');
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

test('htmlCartao: Comprar com ícone de carrinho e Espiar com ícone de olho, ícones ocultos do leitor', () => {
  const h = htmlCartao(peca(), 10);
  assert.match(h, /data-acao="comprar"[^>]*>\s*<svg[^>]*class="icone-carrinho"[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*<span>Comprar<\/span><\/button>/);
  assert.match(h, /data-acao="espiar"[^>]*>\s*<svg[^>]*class="icone-olho"[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*<span>Espiar<\/span><\/button>/);
});

test('htmlCartao não mostra pílulas de tamanho no corpo do cartão', () => {
  const h = htmlCartao(peca({}, { 2: 1, 4: 1, 6: 0 }), 10);
  assert.doesNotMatch(h, /class="pilulas"/);
  const corpo = h.slice(h.indexOf('cartao-corpo'));
  assert.doesNotMatch(corpo, /<li>/);
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

test('htmlCartao: article com link para a peça e botões Comprar e Espiar com nome escapado', () => {
  const h = htmlCartao(peca({ nome: 'A<b> & "c"' }), 10);
  assert.match(h, /^<article class="cartao" data-peca="x-1">/);
  assert.match(h, /<a class="cartao-link" href="peca\.html\?c=x-1">/);
  assert.match(h, /data-acao="comprar"[^>]*aria-label="Comprar A&lt;b&gt; &amp; &quot;c&quot;"/);
  assert.match(h, /data-acao="espiar"[^>]*aria-label="Espiar A&lt;b&gt;/);
  assert.doesNotMatch(h, /<a[\s>][^>]*>(?:(?!<\/a>)[\s\S])*<button/); // nenhum botão dentro de link (<a , não <article)
});
test('htmlCartao esgotada: só Espiar, sem tamanhos rápidos', () => {
  const h = htmlCartao(peca({}, { 4: 0 }), 10);
  assert.doesNotMatch(h, /data-acao="comprar"/);
  assert.match(h, /data-acao="espiar"/);
  assert.doesNotMatch(h, /cartao-tamanhos/);
});
test('htmlCartao com uma cor: Comprar controla a lista de tamanhos com estoque', () => {
  const h = htmlCartao(peca({}, { 2: 1, 4: 0, 6: 3 }), 10);
  assert.match(h, /data-acao="comprar"[^>]*aria-expanded="false"[^>]*aria-controls="tam-x-1"/);
  const tams = [...h.matchAll(/class="cartao-tam" data-acao="tamanho" data-codigo="x-1" data-tamanho="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tams, ['2', '6']);
});
test('htmlCartao com duas cores com estoque: Comprar abre diálogo e não há lista no cartão', () => {
  const p = peca();
  p.variantes.push({ codigo: 'x-2', cor: 'Rosa', preco: 139.9, campanha: false, fotos: 1, estoque: { 2: 1 } });
  const h = htmlCartao(p, 10);
  assert.match(h, /data-acao="comprar"[^>]*aria-haspopup="dialog"/);
  assert.doesNotMatch(h, /cartao-tamanhos/);
});
test('htmlCartao com duas cores e só uma com estoque: lista de tamanhos da cor com estoque', () => {
  const p = peca({}, { 4: 0 });
  p.variantes.push({ codigo: 'x-2', cor: 'Rosa', preco: 139.9, campanha: false, fotos: 1, estoque: { 2: 1 } });
  const h = htmlCartao(p, 10);
  assert.match(h, /data-acao="comprar"[^>]*aria-expanded="false"/);
  assert.match(h, /class="cartao-tam" data-acao="tamanho" data-codigo="x-2" data-tamanho="2"/);
});

// --- Busca no cabeçalho ---

test('htmlCampoBusca: escapa o termo e tem combobox, action e name', () => {
  const h = htmlCampoBusca('<b>');
  assert.ok(h.includes('value="&lt;b&gt;"'));
  assert.ok(h.includes('role="combobox"'));
  assert.ok(h.includes('action="catalogo.html"'));
  assert.ok(h.includes('name="busca"'));
  assert.ok(h.includes('placeholder="O que você está buscando?"'));
  assert.ok(h.includes('id="busca-sugestoes"'));
});

test('htmlSugestoes: link da peça, nome, preço e "Ver todos os resultados"', () => {
  const h = htmlSugestoes([peca()], 've');
  assert.ok(h.includes('peca.html?c=x-1'));
  assert.ok(h.includes('Vestido Teste'));
  assert.ok(h.includes('R$'));
  assert.ok(h.includes('href="catalogo.html?busca=ve"'));
  assert.ok(h.includes('Ver todos os resultados'));
  assert.ok(h.includes('id="sug-0"') && h.includes('id="sug-todos"'));
});

test('htmlSugestoes: esgotada tem selo e peça sem foto usa o logo', () => {
  assert.ok(htmlSugestoes([peca({}, { 4: 0 })], 've').includes('esgotado'));
  const semFoto = peca();
  semFoto.variantes[0].fotos = 0;
  assert.ok(htmlSugestoes([semFoto], 've').includes('img/logo.png'));
});

test('htmlSugestoes: lista vazia dá "" e o termo é codificado', () => {
  assert.equal(htmlSugestoes([], 've'), '');
  assert.ok(htmlSugestoes([peca()], 'a&b').includes('busca=a%26b'));
});
