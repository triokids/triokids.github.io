// Regras do botão de compra rápida no cartão: comprar direto com tamanhos ou espiar a peça.
import { esgotada } from './filtros.js';

const temEstoque = (variante) => Object.values(variante.estoque).some((q) => q > 0);

// A única variante com estoque, ou null se nenhuma ou mais de uma tem.
export function varianteParaComprar(peca) {
  const com = peca.variantes.filter(temEstoque);
  return com.length === 1 ? com[0] : null;
}

export function modoComprar(peca) {
  if (esgotada(peca)) return 'nenhum';
  if (varianteParaComprar(peca)) return 'tamanhos';
  return 'espiar';
}

export function mensagemCarrinho(resultado, variante, tamanho) {
  if (resultado.ok) return '';
  if (resultado.motivo === 'limite') return `Só temos ${variante.estoque[tamanho]} no tamanho ${tamanho}`;
  if (resultado.motivo === 'sem-tamanho') return 'Esse tamanho não está disponível.';
  if (resultado.motivo === 'esgotado') return 'Esse tamanho esgotou.';
  return 'Não foi possível adicionar.';
}
