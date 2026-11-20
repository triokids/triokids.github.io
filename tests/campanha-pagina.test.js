import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlCampanha } from '../js/ui/html.js';

test('htmlCampanha: selo com desconto, parágrafo, lista escapada e chamada ao catálogo', () => {
  const h = htmlCampanha(['Doe uma peça', '- item <a>'], 10);
  assert.match(h, /10% de desconto/);
  assert.match(h, /<p>Doe uma peça<\/p>/);
  assert.match(h, /<ul[^>]*><li>item &lt;a&gt;<\/li><\/ul>/);
  assert.ok(!h.includes('<a>'));
  assert.match(h, /DOE • CUIDE • COMPARTILHE/);
  assert.match(h, /href="catalogo\.html"/);
});

test('htmlCampanha: itens consecutivos formam uma só lista', () => {
  const h = htmlCampanha(['- um', '- dois', 'meio', '- três'], 10);
  assert.equal((h.match(/<ul/g) || []).length, 2);
  assert.match(h, /<li>um<\/li><li>dois<\/li>/);
});

test('htmlCampanha: sem parágrafos mostra mensagem de atualização', () => {
  for (const vazio of [[], undefined]) {
    const h = htmlCampanha(vazio, 10);
    assert.match(h, /As regras da campanha estão sendo atualizadas\. Fale com a Anne no WhatsApp\./);
    assert.ok(!h.includes('<ul'));
  }
});

test('htmlCampanha: linha "## " vira subtítulo escapado e fecha a lista anterior', () => {
  const h = htmlCampanha(['- um', '## O que <aceitamos>', '- dois'], 10);
  assert.match(h, /<h2 class="campanha-subtitulo">O que &lt;aceitamos&gt;<\/h2>/);
  assert.equal((h.match(/<ul/g) || []).length, 2);
});

test('htmlCampanha: texto provisório aparece como está', () => {
  assert.match(htmlCampanha(['[texto provisório: a Anne troca na planilha]'], 10), /\[texto provisório: a Anne troca na planilha\]/);
});
