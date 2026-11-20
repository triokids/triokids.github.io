// Monta a mensagem do pedido e o link do WhatsApp.
import { formatarPreco } from '../dados/csv.js';
import { precoComCampanha } from './campanha.js';

const VALIDAS = ['ok', 'reduzido', 'preco-mudou'];
const validos = (itens) => itens.filter((i) => VALIDAS.includes(i.situacao));
const centavos = (n) => Math.round(n * 100);

export function montarMensagem({ vendedora, itens, nome, cidade, querCampanha, descontoCampanha }) {
  const lista = validos(itens);
  const linhas = lista.map((i) => {
    const cor = i.variante.cor ? ` (${i.variante.cor})` : '';
    const sub = i.quantidade > 1 ? ` (${formatarPreco((centavos(i.precoUnit) * i.quantidade) / 100)})` : '';
    return `• ${i.peca.nome}${cor} – Tam ${i.tamanho} – ${i.quantidade}x – ${formatarPreco(i.precoUnit)}${sub}`;
  });
  const total = lista.reduce((s, i) => s + centavos(i.precoUnit) * i.quantidade, 0) / 100;

  const partes = [`Olá, ${vendedora}! Quero fazer este pedido:`, '', ...linhas, '', `Total: ${formatarPreco(total)}`];
  if (querCampanha) {
    const comCampanha = lista.reduce((s, i) => {
      const unit = i.variante.campanha ? centavos(precoComCampanha(i.precoUnit, descontoCampanha)) : centavos(i.precoUnit);
      return s + unit * i.quantidade;
    }, 0) / 100;
    partes.push(
      'Quero participar da Trio Kids Abraça (doação de peça).',
      `Total com a campanha, se a doação for confirmada: ${formatarPreco(comCampanha)}`,
    );
  }
  partes.push('', `Nome: ${String(nome).trim()}`, `Cidade/bairro: ${String(cidade).trim()}`);
  return partes.join('\n');
}

export function linkWhatsApp(numero, mensagem) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function podeFinalizar({ itens, nome, cidade }) {
  return validos(itens).length > 0 && String(nome ?? '').trim() !== '' && String(cidade ?? '').trim() !== '';
}
