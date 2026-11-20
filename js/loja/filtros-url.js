// Filtros do catálogo <-> query string. Puro, sem DOM.
import { TAMANHOS } from '../dados/catalogo.js';
import { esgotada } from './filtros.js';

export const ORDENS = ['novidades', 'menor-preco', 'maior-preco'];

function lerPreco(valor) {
  if (valor == null) return undefined;
  const t = valor.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
}

export function lerFiltrosDaUrl(search) {
  const q = new URLSearchParams(search);
  const filtros = {};
  const busca = (q.get('busca') || '').trim();
  if (busca) filtros.busca = busca;
  const categoria = (q.get('categoria') || '').trim();
  if (categoria) filtros.categoria = categoria;
  const tamanho = q.get('tamanho');
  if (TAMANHOS.includes(tamanho)) filtros.tamanho = tamanho;
  const min = lerPreco(q.get('precoMin'));
  if (min !== undefined) filtros.precoMin = min;
  const max = lerPreco(q.get('precoMax'));
  if (max !== undefined) filtros.precoMax = max;
  const ordem = q.get('ordem');
  filtros.ordem = ORDENS.includes(ordem) ? ordem : 'novidades';
  return filtros;
}

export function filtrosParaUrl(filtros) {
  const q = new URLSearchParams();
  if (filtros.busca) q.set('busca', filtros.busca);
  if (filtros.categoria) q.set('categoria', filtros.categoria);
  if (filtros.tamanho) q.set('tamanho', filtros.tamanho);
  if (filtros.precoMin != null) q.set('precoMin', String(filtros.precoMin));
  if (filtros.precoMax != null) q.set('precoMax', String(filtros.precoMax));
  if (filtros.ordem && filtros.ordem !== 'novidades') q.set('ordem', filtros.ordem);
  const s = q.toString();
  return s ? `?${s}` : '';
}

// Estável: mantém a ordem relativa dentro de cada grupo.
export function esgotadasNoFim(pecas) {
  return [...pecas.filter((p) => !esgotada(p)), ...pecas.filter((p) => esgotada(p))];
}
