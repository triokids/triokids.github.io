import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarCatalogo } from '../js/dados/carregar.js';

const CSV_PECAS = 'codigo,nome,cor,categoria,colecao,preco,ativo,destaque,campanha,fotos,descricao,P,M,G,1,2,3,4,6\nvestido-1,Vestido,Cru,Vestidos,Verao,"139,90",sim,,,1,Lindo,,,,1,1,,,\n';
const CSV_CONFIG = 'chave,valor\nwhatsapp,5562993379366\n';
const CSV_CAMPANHA = 'texto\nOla\n';

const config = {
  csv: { pecas: 'u/pecas', config: 'u/config', campanha: 'u/campanha' },
  reserva: 'catalogo.json',
  chaveCache: 'triokids:catalogo',
  whatsapp: '5562993379366',
  descontoCampanha: 10,
};

const resp = (texto, ok = true) => ({ ok, text: async () => texto, json: async () => JSON.parse(texto) });

const tabelasReserva = {
  geradoEm: '2026-01-01',
  pecas: [
    ['codigo', 'nome', 'preco', 'ativo', '1'],
    ['res-1', 'Reserva', '50', 'sim', '2'],
  ],
  config: [['chave', 'valor']],
  campanha: [['texto']],
};

function armazenamentoFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
  };
}

function buscarPlanilhaOk(url) {
  if (url === 'u/pecas') return Promise.resolve(resp(CSV_PECAS));
  if (url === 'u/config') return Promise.resolve(resp(CSV_CONFIG));
  if (url === 'u/campanha') return Promise.resolve(resp(CSV_CAMPANHA));
  if (url === 'catalogo.json') return Promise.resolve(resp(JSON.stringify(tabelasReserva)));
  return Promise.reject(new Error('url inesperada ' + url));
}

test('planilha ok: origem planilha e cache gravado', async () => {
  const arm = armazenamentoFalso();
  const r = await carregarCatalogo(config, { buscar: buscarPlanilhaOk, armazenamento: arm });
  assert.equal(r.origem, 'planilha');
  assert.equal(r.catalogo.pecas.length, 1);
  const salvo = JSON.parse(arm.dados[config.chaveCache]);
  assert.ok(salvo.salvoEm);
  assert.equal(salvo.tabelas.pecas[1][0], 'vestido-1');
});

test('planilha devolve HTML com status 200 e ha cache: origem cache', async () => {
  const arm = armazenamentoFalso();
  await carregarCatalogo(config, { buscar: buscarPlanilhaOk, armazenamento: arm });
  const buscarHtml = (url) =>
    url.startsWith('u/') ? Promise.resolve(resp('  <!DOCTYPE html><html>login</html>')) : buscarPlanilhaOk(url);
  const r = await carregarCatalogo(config, { buscar: buscarHtml, armazenamento: arm });
  assert.equal(r.origem, 'cache');
  assert.equal(r.catalogo.pecas[0].nome, 'Vestido');
});

test('planilha CSV vazio, sem cache, reserva ok: origem reserva', async () => {
  const buscar = (url) => (url.startsWith('u/') ? Promise.resolve(resp('')) : buscarPlanilhaOk(url));
  const r = await carregarCatalogo(config, { buscar, armazenamento: armazenamentoFalso() });
  assert.equal(r.origem, 'reserva');
  assert.equal(r.catalogo.pecas[0].nome, 'Reserva');
});

test('aba Pecas sem coluna codigo e invalida', async () => {
  const buscar = (url) => (url === 'u/pecas' ? Promise.resolve(resp('nome,preco\nA,1\n')) : buscarPlanilhaOk(url));
  const r = await carregarCatalogo(config, { buscar, armazenamento: armazenamentoFalso() });
  assert.equal(r.origem, 'reserva');
});

test('cabecalho codigo aceito sem diferenciar maiuscula e espacos', async () => {
  const buscar = (url) =>
    url === 'u/pecas' ? Promise.resolve(resp(CSV_PECAS.replace('codigo,', ' CODIGO ,'))) : buscarPlanilhaOk(url);
  const r = await carregarCatalogo(config, { buscar, armazenamento: armazenamentoFalso() });
  assert.equal(r.origem, 'planilha');
});

test('resposta !ok e invalida', async () => {
  const buscar = (url) => (url === 'u/config' ? Promise.resolve(resp(CSV_CONFIG, false)) : buscarPlanilhaOk(url));
  const r = await carregarCatalogo(config, { buscar, armazenamento: armazenamentoFalso() });
  assert.equal(r.origem, 'reserva');
});

test('getItem lanca: ainda chega a reserva', async () => {
  const arm = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  const buscar = (url) => (url.startsWith('u/') ? Promise.reject(new Error('rede')) : buscarPlanilhaOk(url));
  const r = await carregarCatalogo(config, { buscar, armazenamento: arm });
  assert.equal(r.origem, 'reserva');
});

test('URLs de CSV vazias contam como falha', async () => {
  const cfg = { ...config, csv: { pecas: '', config: '', campanha: '' } };
  const r = await carregarCatalogo(cfg, { buscar: buscarPlanilhaOk, armazenamento: armazenamentoFalso() });
  assert.equal(r.origem, 'reserva');
});

test('tudo falha: rejeita com catalogo-indisponivel', async () => {
  const buscar = () => Promise.reject(new Error('rede'));
  await assert.rejects(
    carregarCatalogo(config, { buscar, armazenamento: armazenamentoFalso() }),
    /catalogo-indisponivel/,
  );
});

test('sem armazenamento disponivel segue sem cache', async () => {
  const r = await carregarCatalogo(config, { buscar: buscarPlanilhaOk, armazenamento: null });
  assert.equal(r.origem, 'planilha');
});
