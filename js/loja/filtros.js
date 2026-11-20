import { TAMANHOS } from '../dados/catalogo.js';

export function menorPreco(peca) {
  return Math.min(...peca.variantes.map(v => v.preco));
}

export function tamanhosDisponiveis(peca) {
  return TAMANHOS.filter(t => peca.variantes.some(v => (v.estoque[t] || 0) > 0));
}

export function esgotada(peca) {
  return tamanhosDisponiveis(peca).length === 0;
}

export function filtrarPecas(pecas, { categoria, tamanho, precoMin, precoMax } = {}) {
  return pecas.filter(p => {
    if (categoria && p.categoria !== categoria) return false;
    if (tamanho && !tamanhosDisponiveis(p).includes(tamanho)) return false;
    const preco = menorPreco(p);
    if (precoMin != null && preco < precoMin) return false;
    if (precoMax != null && preco > precoMax) return false;
    return true;
  });
}

export function ordenarPecas(pecas, criterio) {
  const copia = [...pecas];
  if (criterio === 'menor-preco') return copia.sort((a, b) => menorPreco(a) - menorPreco(b));
  if (criterio === 'maior-preco') return copia.sort((a, b) => menorPreco(b) - menorPreco(a));
  return copia.sort((a, b) => b.ordem - a.ordem);
}

export function destaques(pecas) {
  const marcadas = pecas.filter(p => p.destaque);
  if (marcadas.length) return marcadas.slice(0, 8);
  return ordenarPecas(pecas, 'novidades').slice(0, 8);
}
