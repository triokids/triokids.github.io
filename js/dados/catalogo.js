// Monta o catálogo (peças, config, campanha) a partir das tabelas cruas da planilha.
import { parsePreco } from './csv.js';

export const TAMANHOS = ['P', 'M', 'G', '1', '2', '3', '4', '6'];

const norm = (s) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const limpo = (s) => String(s ?? '').trim();
const espacos = (s) => limpo(s).replace(/\s+/g, ' ');

const SIM = ['sim', 's', 'true', 'x'];
const NAO = ['nao', 'n', 'false'];

function booleano(valor, padrao) {
  const v = norm(valor);
  if (SIM.includes(v)) return true;
  if (NAO.includes(v)) return false;
  return padrao;
}

function estoqueDe(valor) {
  const v = limpo(valor);
  if (!/^\d+$/.test(v)) return null;
  return Number(v);
}

function montarPecas(tabela) {
  if (!Array.isArray(tabela) || tabela.length === 0) return [];
  const indice = {};
  tabela[0].forEach((nome, i) => {
    const k = norm(nome);
    if (!(k in indice)) indice[k] = i;
  });
  const col = (linha, nome) => (nome in indice ? limpo(linha[indice[nome]]) : '');

  const vistos = new Set();
  const grupos = new Map();
  for (let i = 1; i < tabela.length; i++) {
    const linha = tabela[i];
    const codigo = col(linha, 'codigo');
    const nome = espacos(col(linha, 'nome'));
    if (!codigo || !nome) continue;
    const preco = parsePreco(col(linha, 'preco'));
    if (preco === null) continue;
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);
    if (!booleano(col(linha, 'ativo'), true)) continue;

    const estoque = {};
    for (const t of TAMANHOS) {
      const n = estoqueDe(col(linha, norm(t)));
      if (n !== null) estoque[t] = n;
    }
    const fotos = /^\d+$/.test(col(linha, 'fotos')) ? Number(col(linha, 'fotos')) : 0;
    const variante = {
      codigo,
      cor: col(linha, 'cor'),
      preco,
      campanha: booleano(col(linha, 'campanha'), true),
      fotos,
      estoque,
    };
    let peca = grupos.get(nome);
    if (!peca) {
      peca = {
        id: codigo,
        nome,
        categoria: col(linha, 'categoria'),
        colecao: col(linha, 'colecao'),
        descricao: col(linha, 'descricao'),
        destaque: booleano(col(linha, 'destaque'), false),
        ordem: i,
        variantes: [],
      };
      grupos.set(nome, peca);
    }
    peca.variantes.push(variante);
  }
  return [...grupos.values()];
}

function montarConfig(tabela, padrao) {
  const config = {
    whatsapp: padrao.whatsapp,
    descontoCampanha: padrao.descontoCampanha,
    avisoTopo: '',
  };
  for (const linha of Array.isArray(tabela) ? tabela : []) {
    const chave = norm(linha[0]);
    const valor = limpo(linha[1]);
    if (chave === 'desconto_campanha') {
      const n = parsePreco(valor);
      if (n !== null) config.descontoCampanha = n;
    } else if (chave === 'aviso_topo') {
      config.avisoTopo = valor;
    } else if (chave === 'whatsapp' && valor) {
      config.whatsapp = valor;
    }
  }
  return config;
}

export function montarCatalogo(tabelas, padrao) {
  const t = tabelas ?? {};
  return {
    pecas: montarPecas(t.pecas),
    config: montarConfig(t.config, padrao),
    campanha: (Array.isArray(t.campanha) ? t.campanha : [])
      .map((l) => limpo(l[0]))
      .filter(Boolean),
  };
}
