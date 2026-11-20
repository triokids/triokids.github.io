import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarMensagem, linkWhatsApp, podeFinalizar } from '../js/loja/whatsapp.js';

function item(nome, cor, tamanho, quantidade, preco, campanha = true, situacao = 'ok', codigo = 'X') {
  return {
    codigo, tamanho, quantidade, precoVisto: preco, situacao, precoUnit: preco,
    peca: { nome }, variante: { cor, preco, campanha },
  };
}

const itens = [
  item('Vestido Maria Júlia', '', '4', 1, 139.9, true, 'ok', 'VMJ01'),
  item('Vestido Clara', 'Safira', '2', 2, 129.9, true, 'ok', 'VCL02'),
];
const base = { vendedora: 'Anne', itens, nome: 'Maria', cidade: 'Goiânia – Setor Bueno', querCampanha: true, descontoCampanha: 10 };

const ESPERADO = `Olá, Anne! Vim pelo site e quero fazer este pedido:

*Itens (3 peças)*
1. Vestido Maria Júlia — cód. VMJ01
   Tam 4 · 1 un. · R$ 139,90
2. Vestido Clara (Safira) — cód. VCL02
   Tam 2 · 2 × R$ 129,90 = R$ 259,80

*Total: R$ 399,70*

Quero participar da *Trio Kids Abraça* (doação de peça).
Se a doação for confirmada, o total fica *R$ 359,73*.

*Meus dados*
Nome: Maria
Cidade/bairro: Goiânia – Setor Bueno`;

test('mensagem com campanha igual ao formato exato', () => {
  assert.equal(montarMensagem(base), ESPERADO);
});

test('sem campanha não tem o bloco da campanha', () => {
  const m = montarMensagem({ ...base, querCampanha: false });
  assert.ok(!m.includes('Abraça'));
  assert.ok(!m.includes('Se a doação for confirmada'));
  assert.ok(m.includes('*Total: R$ 399,70*\n\n*Meus dados*\nNome: Maria'));
});

test('uma peça só usa singular', () => {
  const m = montarMensagem({ ...base, itens: [itens[0]], querCampanha: false });
  assert.ok(m.includes('*Itens (1 peça)*'));
});

test('campanha só desconta itens com variante.campanha', () => {
  const mista = [item('A', '', 'M', 1, 100, true), item('B', '', 'M', 1, 50, false)];
  const m = montarMensagem({ ...base, itens: mista });
  assert.ok(m.includes('Se a doação for confirmada, o total fica *R$ 140,00*.'));
});

test('ignora itens removida e esgotado', () => {
  const lista = [...itens, item('Fora', '', 'P', 1, 10, true, 'removida'), item('Acabou', '', 'P', 1, 10, true, 'esgotado')];
  assert.equal(montarMensagem({ ...base, itens: lista }), ESPERADO);
});

test('nome e cidade com trim', () => {
  const m = montarMensagem({ ...base, nome: '  Maria ', cidade: ' Goiânia – Setor Bueno  ' });
  assert.equal(m, ESPERADO);
});

test('nome com caracteres especiais vai literal e o link decodifica igual', () => {
  const nome = 'Body "Ursinho" & cia <3';
  const m = montarMensagem({ ...base, itens: [item(nome, '', 'P', 1, 50)], querCampanha: false });
  assert.ok(m.includes(`1. ${nome} — cód. X\n   Tam P`));
  const link = linkWhatsApp('5562993379366', m);
  assert.ok(link.startsWith('https://wa.me/5562993379366?text='));
  assert.equal(decodeURIComponent(new URL(link).searchParams.get('text')), m);
});

test('podeFinalizar', () => {
  assert.equal(podeFinalizar({ itens, nome: 'Maria', cidade: 'Goiânia' }), true);
  assert.equal(podeFinalizar({ itens, nome: '   ', cidade: 'Goiânia' }), false);
  assert.equal(podeFinalizar({ itens, nome: 'Maria', cidade: ' ' }), false);
  assert.equal(podeFinalizar({ itens: [], nome: 'Maria', cidade: 'Goiânia' }), false);
  assert.equal(podeFinalizar({ itens: [item('A', '', 'P', 1, 10, true, 'removida')], nome: 'Maria', cidade: 'G' }), false);
});
