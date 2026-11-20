// Monta a mensagem do pedido e o link do WhatsApp.
import { formatarPreco } from '../dados/csv.js';
import { precoComCampanha } from './campanha.js';

const VALIDAS = ['ok', 'reduzido', 'preco-mudou'];
const validos = (itens) => itens.filter((i) => VALIDAS.includes(i.situacao));
const centavos = (n) => Math.round(n * 100);

export function montarMensagem({ vendedora, itens, nome, cidade, querCampanha, descontoCampanha }) {
  const lista = validos(itens);
  const linhas = lista.flatMap((i, n) => {
    const cor = i.variante.cor ? ` (${i.variante.cor})` : '';
    const preco = formatarPreco(i.precoUnit);
    const valor = i.quantidade > 1
      ? `${i.quantidade} × ${preco} = ${formatarPreco((centavos(i.precoUnit) * i.quantidade) / 100)}`
      : `1 un. · ${preco}`;
    return [`${n + 1}. ${i.peca.nome}${cor} — cód. ${i.codigo}`, `   Tam ${i.tamanho} · ${valor}`];
  });
  const pecas = lista.reduce((s, i) => s + i.quantidade, 0);
  const total = lista.reduce((s, i) => s + centavos(i.precoUnit) * i.quantidade, 0) / 100;

  const partes = [
    `Olá, ${vendedora}! Vim pelo site e quero fazer este pedido:`, '',
    `*Itens (${pecas} ${pecas === 1 ? 'peça' : 'peças'})*`, ...linhas, '',
    `*Total: ${formatarPreco(total)}*`,
  ];
  if (querCampanha) {
    const comCampanha = lista.reduce((s, i) => {
      const unit = i.variante.campanha ? centavos(precoComCampanha(i.precoUnit, descontoCampanha)) : centavos(i.precoUnit);
      return s + unit * i.quantidade;
    }, 0) / 100;
    partes.push(
      '',
      'Quero participar da *Trio Kids Abraça* (doação de peça).',
      `Se a doação for confirmada, o total fica *${formatarPreco(comCampanha)}*.`,
    );
  }
  partes.push('', '*Meus dados*', `Nome: ${String(nome).trim()}`, `Cidade/bairro: ${String(cidade).trim()}`);
  return partes.join('\n');
}

export function linkWhatsApp(numero, mensagem) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function podeFinalizar({ itens, nome, cidade }) {
  return validos(itens).length > 0 && String(nome ?? '').trim() !== '' && String(cidade ?? '').trim() !== '';
}
