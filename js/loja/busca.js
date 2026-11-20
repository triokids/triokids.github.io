// Lógica pura da busca no cabeçalho. Sem DOM.
import { esgotadasNoFim } from './filtros-url.js';

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function camposDaPeca(peca) {
  const campos = [peca.nome, peca.categoria, peca.colecao];
  for (const v of peca.variantes || []) campos.push(v.cor);
  return campos.map(normalizar).filter(Boolean);
}

export function casaBusca(peca, termo) {
  const t = normalizar(termo);
  if (!t) return true;
  const campos = camposDaPeca(peca);
  return t.split(' ').every(palavra => campos.some(c => c.includes(palavra)));
}

export function sugerir(pecas, termo, limite = 5) {
  if (normalizar(termo).length < 2) return [];
  return esgotadasNoFim(pecas.filter(p => casaBusca(p, termo))).slice(0, limite);
}
