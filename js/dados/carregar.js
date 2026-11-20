// Carrega o catálogo: planilha publicada -> cache local -> catalogo.json (reserva).
import { parseCsv } from './csv.js';
import { montarCatalogo } from './catalogo.js';

function armazenamentoPadrao() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const TIMEOUT_PADRAO_MS = 6000;

function semAcento(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function tabelaPecasValida(pecas) {
  if (!Array.isArray(pecas) || pecas.length < 2) return false;
  return (pecas[0] || []).some((c) => semAcento(c) === 'codigo');
}

// Busca com limite de tempo: estourou, vale como falha (segue para cache e reserva).
async function buscarComTempo(buscar, url, timeoutMs) {
  const controlador = new AbortController();
  let relogio;
  const estouro = new Promise((_, rejeitar) => {
    relogio = setTimeout(() => {
      controlador.abort();
      rejeitar(new Error('tempo-esgotado'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([buscar(url, { signal: controlador.signal }), estouro]);
  } finally {
    clearTimeout(relogio);
  }
}

async function buscarAba(buscar, url, timeoutMs) {
  if (!url) throw new Error('url-vazia');
  const resposta = await buscarComTempo(buscar, url, timeoutMs);
  if (!resposta || !resposta.ok) throw new Error('resposta-invalida');
  const texto = await resposta.text();
  if (String(texto).trimStart().startsWith('<')) throw new Error('resposta-html');
  return parseCsv(texto);
}

async function daPlanilha(config, buscar, timeoutMs) {
  const [pecas, cfg, campanha] = await Promise.all([
    buscarAba(buscar, config.csv?.pecas, timeoutMs),
    buscarAba(buscar, config.csv?.config, timeoutMs),
    buscarAba(buscar, config.csv?.campanha, timeoutMs),
  ]);
  if (!tabelaPecasValida(pecas)) throw new Error('pecas-invalida');
  return { pecas, config: cfg, campanha };
}

function doCache(config, armazenamento) {
  try {
    const bruto = armazenamento.getItem(config.chaveCache);
    if (!bruto) return null;
    const { tabelas } = JSON.parse(bruto);
    return tabelas && tabelaPecasValida(tabelas.pecas) ? tabelas : null;
  } catch {
    return null;
  }
}

async function daReserva(config, buscar) {
  const resposta = await buscar(config.reserva);
  if (!resposta || !resposta.ok) throw new Error('reserva-invalida');
  const dados = JSON.parse(await resposta.text());
  const tabelas = { pecas: dados.pecas, config: dados.config, campanha: dados.campanha };
  if (!tabelaPecasValida(tabelas.pecas)) throw new Error('reserva-invalida');
  return tabelas;
}

export async function carregarCatalogo(config, opcoes = {}) {
  const buscar = opcoes.buscar ?? ((...a) => fetch(...a));
  const armazenamento = 'armazenamento' in opcoes ? opcoes.armazenamento : armazenamentoPadrao();
  const padrao = { whatsapp: config.whatsapp, descontoCampanha: config.descontoCampanha };
  const montar = (tabelas, origem) => ({ catalogo: montarCatalogo(tabelas, padrao), origem });

  try {
    const tabelas = await daPlanilha(config, buscar, opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS);
    const resultado = montar(tabelas, 'planilha');
    try {
      armazenamento.setItem(config.chaveCache, JSON.stringify({ tabelas, salvoEm: new Date().toISOString() }));
    } catch { /* sem cache */ }
    return resultado;
  } catch { /* cai para o cache */ }

  if (armazenamento) {
    const tabelas = doCache(config, armazenamento);
    if (tabelas) {
      try { return montar(tabelas, 'cache'); } catch { /* cache corrompido */ }
    }
  }

  try {
    return montar(await daReserva(config, buscar), 'reserva');
  } catch {
    throw new Error('catalogo-indisponivel');
  }
}
