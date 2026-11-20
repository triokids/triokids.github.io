// Funções puras que devolvem HTML (string). Sem DOM, sem acesso a js/paginas.
import { formatarPreco } from '../dados/csv.js';
import { precoComCampanha } from '../loja/campanha.js';
import { menorPreco, tamanhosDisponiveis, esgotada } from '../loja/filtros.js';

export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Única função que monta caminho de foto (ADR-001).
export function urlFoto(codigo, n) {
  return `fotos/${codigo}-${n}.jpg`;
}

export function htmlTituloColorido(texto) {
  const t = String(texto ?? '');
  let i = 0;
  const letras = [...t].map((ch) => {
    if (/\s/.test(ch)) return ch;
    const c = (i++ % 5) + 1;
    return `<span class="c${c}">${esc(ch)}</span>`;
  }).join('');
  return `<b class="titulo-colorido" role="img" aria-label="${esc(t)}">${letras}</b>`;
}

export function htmlPontinhos() {
  const pontos = [1, 2, 3, 4, 5].map((n) => `<i class="ponto p${n}"></i>`).join('');
  return `<span class="pontinhos" aria-hidden="true">${pontos}</span>`;
}

export function htmlCartao(peca, descontoCampanha) {
  const primeira = peca.variantes[0];
  const foto = primeira && primeira.fotos > 0
    ? `<img src="${esc(urlFoto(primeira.codigo, 1))}" alt="${esc(peca.nome)}" loading="lazy" width="600" height="800">`
    : `<div class="sem-foto"><img src="img/logo.png" alt="" width="96" height="96"></div>`;

  const precos = peca.variantes.map((v) => v.preco);
  const menor = menorPreco(peca);
  const variavel = precos.some((p) => p !== precos[0]);
  const participantes = peca.variantes.filter((v) => v.campanha);
  const blocoCampanha = participantes.length
    ? `<p class="preco-campanha">Com a Trio Kids Abraça <strong>${formatarPreco(precoComCampanha(Math.min(...participantes.map((v) => v.preco)), descontoCampanha))}</strong></p>`
    : '';

  const fim = esgotada(peca);
  const pilulas = fim
    ? '<span class="selo-esgotado">esgotado</span>'
    : `<ul class="pilulas" aria-label="Tamanhos disponíveis">${tamanhosDisponiveis(peca).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

  return `<a class="cartao${fim ? ' cartao-esgotado' : ''}" href="peca.html?c=${encodeURIComponent(peca.id)}">
  <div class="cartao-foto">${foto}${fim ? '<span class="selo-esgotado selo-canto">esgotado</span>' : ''}</div>
  <div class="cartao-corpo">
    <h3 class="cartao-nome">${esc(peca.nome)}</h3>
    <p class="preco">${variavel ? '<span class="a-partir">a partir de</span> ' : ''}${formatarPreco(menor)}</p>
    ${blocoCampanha}
    ${pilulas}
  </div>
</a>`;
}

const AVISOS = {
  removida: 'Esta peça não está mais disponível.',
  esgotado: 'Tamanho esgotado. Este item não entra no pedido.',
  reduzido: 'A quantidade foi reduzida para o que temos em estoque.',
  'preco-mudou': 'O preço mudou desde que você adicionou.',
};

export function htmlItemCarrinho(item) {
  const aviso = AVISOS[item.situacao] ? `<p class="item-aviso" role="status">${AVISOS[item.situacao]}</p>` : '';
  const dados = `data-codigo="${esc(item.codigo)}" data-tamanho="${esc(item.tamanho)}"`;
  if (item.situacao === 'removida') {
    return `<li class="item item-problema" ${dados}>
  <div class="item-info"><p class="item-nome">Peça ${esc(item.codigo)}</p>${aviso}</div>
  <button type="button" class="item-remover" data-acao="remover" aria-label="Remover item do carrinho">Remover</button>
</li>`;
  }
  const cor = item.variante.cor ? ` (${esc(item.variante.cor)})` : '';
  const nome = `${esc(item.peca.nome)}${cor}`;
  const foto = item.variante.fotos > 0
    ? `<img src="${esc(urlFoto(item.codigo, 1))}" alt="" width="64" height="85">`
    : '<img src="img/logo.png" alt="" width="64" height="64">';
  const subtotal = formatarPreco((Math.round(item.precoUnit * 100) * item.quantidade) / 100);
  const bloqueado = item.situacao === 'esgotado';
  return `<li class="item${item.situacao === 'ok' ? '' : ' item-problema'}" ${dados}>
  <div class="item-foto">${foto}</div>
  <div class="item-info">
    <p class="item-nome">${nome}</p>
    <p class="item-detalhe">Tam ${esc(item.tamanho)} · ${formatarPreco(item.precoUnit)}</p>
    ${aviso}
    <div class="item-qtd">
      ${bloqueado ? '' : `<button type="button" data-acao="menos" aria-label="Diminuir quantidade de ${nome}">−</button>
      <span>${item.quantidade}</span>
      <button type="button" data-acao="mais" aria-label="Aumentar quantidade de ${nome}">+</button>`}
      <button type="button" class="item-remover" data-acao="remover" aria-label="Remover ${nome} do carrinho">Remover</button>
    </div>
  </div>
  <p class="item-subtotal">${bloqueado ? '' : subtotal}</p>
</li>`;
}

export function htmlFaixaReserva() {
  return '<div class="faixa-reserva" role="status">O catálogo pode estar desatualizado. Confirme disponibilidade e preços no WhatsApp.</div>';
}
