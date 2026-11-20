import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarCatalogo, TAMANHOS } from '../js/dados/catalogo.js';

const cab = ['codigo','nome','cor','categoria','colecao','preco','ativo','destaque','campanha','fotos','descricao','P','M','G','1','2','3','4','6'];
function linha(o) {
  return cab.map((c) => (o[c] ?? ''));
}
const pecas = [
  cab,
  linha({ codigo: 'vestido-clara-cru', nome: 'Vestido Clara', cor: 'Cru', categoria: 'Vestidos', colecao: 'Verão', preco: 'R$ 139,90', ativo: 'sim', destaque: 'x', campanha: 'não', fotos: '2', descricao: 'Lindo', 1: '1', 2: '1', 6: '1' }),
  linha({ codigo: 'vestido-clara-safira', nome: ' Vestido  Clara ', cor: 'Safira', preco: '139,90', 2: '1', 4: '1', 6: '0' }),
  linha({ codigo: 'conjunto-joab', nome: 'Conjunto Joab', cor: 'Mostarda', preco: '89,90', ativo: 'S', 1: '3' }),
  [''],
  linha({ nome: 'Sem Codigo', preco: '10' }),
  linha({ codigo: 'sem-nome', preco: '10' }),
  linha({ codigo: 'sem-preco', nome: 'Sem Preco', preco: '' }),
  linha({ codigo: 'inativa-1', nome: 'Inativa', preco: '50', ativo: 'não' }),
  linha({ codigo: 'dois-1', nome: 'Camisa Dois', preco: '40', 4: 'dois', 3: '-1', 2: '5' }),
  linha({ codigo: 'conjunto-joab', nome: 'Conjunto Joab', cor: 'Repetido', preco: '1' }),
];
const tabelas = {
  pecas,
  config: [['chave', 'valor'], ['desconto_campanha', '15'], ['aviso_topo', 'Frete grátis'], ['whatsapp', '']],
  campanha: [['Doe uma peça'], [''], ['Vale para...']],
};
const padrao = { whatsapp: '5562993379366', descontoCampanha: 10 };

test('tamanhos na ordem', () => {
  assert.deepEqual(TAMANHOS, ['P', 'M', 'G', '1', '2', '3', '4', '6']);
});

test('agrupa, filtra e converte', () => {
  const cat = montarCatalogo(tabelas, padrao);
  assert.equal(cat.pecas.length, 3);
  const v = cat.pecas.find((p) => p.nome === 'Vestido Clara');
  assert.equal(v.variantes.length, 2);
  assert.equal(v.id, 'vestido-clara-cru');
  assert.equal(v.destaque, true);
  assert.equal(v.ordem, 1);
  assert.equal(v.variantes[0].campanha, false);
  assert.equal(v.variantes[0].fotos, 2);
  assert.equal(v.variantes[1].campanha, true);
  assert.deepEqual(v.variantes[0].estoque, { '1': 1, '2': 1, '6': 1 });
  assert.deepEqual(v.variantes[1].estoque, { '2': 1, '4': 1, '6': 0 });
  const c = cat.pecas.find((p) => p.nome === 'Conjunto Joab');
  assert.equal(c.variantes.length, 1);
  assert.equal(c.variantes[0].preco, 89.9);
  assert.equal(c.destaque, false);
  const d = cat.pecas.find((p) => p.nome === 'Camisa Dois');
  assert.deepEqual(d.variantes[0].estoque, { '2': 5 });
  assert.ok(!('4' in d.variantes[0].estoque));
  assert.ok(!('3' in d.variantes[0].estoque));
  for (const nome of ['Inativa', 'Sem Preco', 'Sem Codigo']) {
    assert.equal(cat.pecas.some((p) => p.nome === nome), false);
  }
});

test('config e campanha', () => {
  const cat = montarCatalogo(tabelas, padrao);
  assert.equal(cat.config.descontoCampanha, 15);
  assert.equal(cat.config.whatsapp, '5562993379366');
  assert.equal(cat.config.avisoTopo, 'Frete grátis');
  assert.deepEqual(cat.campanha, ['Doe uma peça', 'Vale para...']);
});

test('colunas em outra ordem, cabeçalho com maiúscula/acento', () => {
  const t = { pecas: [['PREÇO', 'Nome', 'Código', 'p'], ['9,5', 'X', 'x1', '2']], config: [], campanha: [] };
  const cat = montarCatalogo(t, padrao);
  assert.equal(cat.pecas[0].variantes[0].preco, 9.5);
  assert.deepEqual(cat.pecas[0].variantes[0].estoque, { P: 2 });
  assert.equal(cat.config.descontoCampanha, 10);
  assert.deepEqual(cat.campanha, []);
});

test('tabelas ausentes não quebram', () => {
  const cat = montarCatalogo({}, padrao);
  assert.deepEqual(cat.pecas, []);
});
