// Funções puras que devolvem HTML (string). Sem DOM, sem acesso a js/paginas.
import { formatarPreco } from '../dados/csv.js';
import { precoComCampanha } from '../loja/campanha.js';
import { TAMANHOS } from '../dados/catalogo.js';
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
  return `fotos/${encodeURIComponent(codigo)}-${n}.jpg`;
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

const ORDENS_ROTULO = [['novidades', 'Novidades'], ['menor-preco', 'Menor preço'], ['maior-preco', 'Maior preço']];

function opcoes(lista, atual) {
  return lista.map(([valor, rotulo]) => `<option value="${esc(valor)}"${valor === atual ? ' selected' : ''}>${esc(rotulo)}</option>`).join('');
}

export function htmlFiltros(categorias, filtros = {}) {
  const valor = (n) => (n == null ? '' : ` value="${esc(n)}"`);
  return `<button type="button" class="botao botao-filtrar" id="abrir-filtros" aria-expanded="false" aria-controls="painel-filtros">Filtrar</button>
<form class="filtros" id="painel-filtros" method="get" action="catalogo.html">
  <div class="campo">
    <label for="f-categoria">Categoria</label>
    <select id="f-categoria" name="categoria"><option value="">Todas</option>${opcoes(categorias.map((c) => [c, c]), filtros.categoria)}</select>
  </div>
  <div class="campo">
    <label for="f-tamanho">Tamanho</label>
    <select id="f-tamanho" name="tamanho"><option value="">Todos</option>${opcoes(TAMANHOS.map((t) => [t, t]), filtros.tamanho)}</select>
  </div>
  <div class="campo campo-preco">
    <label for="f-min">Preço (R$)</label>
    <div class="par">
      <input id="f-min" name="precoMin" type="text" inputmode="decimal" placeholder="mín"${valor(filtros.precoMin)} aria-label="Preço mínimo">
      <input id="f-max" name="precoMax" type="text" inputmode="decimal" placeholder="máx"${valor(filtros.precoMax)} aria-label="Preço máximo">
    </div>
  </div>
  <div class="campo">
    <label for="f-ordem">Ordenar por</label>
    <select id="f-ordem" name="ordem">${opcoes(ORDENS_ROTULO, filtros.ordem || 'novidades')}</select>
  </div>
  <div class="filtros-acoes">
    <button type="submit" class="botao">Aplicar</button>
    <a class="limpar" href="catalogo.html">Limpar filtros</a>
  </div>
</form>`;
}

// --- Página da peça ---

export function altFoto(variante, nome, n) {
  const cor = variante.cor ? ` — ${variante.cor}` : '';
  return `${nome}${cor} — foto ${n}`;
}

// Foto grande + coluna de miniaturas (à esquerda no computador, embaixo no celular).
// atual: número da foto aberta (1..fotos); fora do intervalo vira 1.
export function htmlGaleria(variante, nome, atual = 1) {
  if (!variante || !(variante.fotos > 0)) {
    return '<div class="galeria"><div class="sem-foto galeria-vazia"><img src="img/logo.png" alt="" width="96" height="96"></div></div>';
  }
  const total = variante.fotos;
  const n = Number.isInteger(atual) && atual >= 1 && atual <= total ? atual : 1;
  const principal = `<img id="galeria-foto" src="${esc(urlFoto(variante.codigo, n))}" alt="${esc(altFoto(variante, nome, n))}" width="600" height="800">`;
  if (total < 2) {
    return `<div class="galeria"><div class="galeria-principal">${principal}</div></div>`;
  }
  const minis = Array.from({ length: total }, (_, i) => {
    const k = i + 1;
    return `<button type="button" class="galeria-mini" data-foto="${k}"${k === n ? ' aria-current="true"' : ''} aria-label="Ver foto ${k} de ${total}"><img src="${esc(urlFoto(variante.codigo, k))}" alt="" loading="lazy" width="120" height="160"></button>`;
  }).join('');
  return `<div class="galeria galeria-com-miniaturas" data-total="${total}">
<div class="galeria-principal">${principal}
<button type="button" class="galeria-seta galeria-anterior" aria-label="Foto anterior">&lsaquo;</button>
<button type="button" class="galeria-seta galeria-proxima" aria-label="Próxima foto">&rsaquo;</button>
<p class="galeria-indicador" id="galeria-indicador" aria-live="polite">${n} / ${total}</p></div>
<div class="galeria-miniaturas" role="group" aria-label="Fotos de ${esc(nome)}">${minis}</div></div>`;
}

export function htmlSeletorTamanho(variante) {
  const botoes = TAMANHOS.filter((t) => Object.hasOwn(variante.estoque, t)).map((t) => {
    const n = variante.estoque[t];
    if (!(n > 0)) {
      return `<button type="button" class="tam tam-esgotado" data-tamanho="${esc(t)}" disabled aria-label="Tamanho ${esc(t)}, esgotado">${esc(t)}</button>`;
    }
    const ultima = n === 1 ? '<small class="tam-ultima">última unidade</small>' : '';
    return `<button type="button" class="tam" data-tamanho="${esc(t)}" aria-pressed="false">${esc(t)}${ultima}</button>`;
  });
  return `<div class="tamanhos-opcoes" role="group" aria-label="Tamanho">${botoes.join('')}</div>`;
}

export function htmlSeletorCor(peca, codigoAtual) {
  if (!peca || peca.variantes.length < 2) return '';
  const botoes = peca.variantes.map((v) => {
    const atual = v.codigo === codigoAtual;
    return `<button type="button" class="cor" data-codigo="${esc(v.codigo)}" aria-pressed="${atual}">${esc(v.cor || v.codigo)}</button>`;
  }).join('');
  return `<div class="cores-opcoes" role="group" aria-label="Cor">${botoes}</div>`;
}

// Página Trio Kids Abraça. Parágrafos "- " consecutivos formam uma só lista.
export function htmlCampanha(paragrafos, desconto) {
  const linhas = (Array.isArray(paragrafos) ? paragrafos : []).map((p) => String(p ?? '').trim()).filter(Boolean);
  const blocos = [];
  let itens = null;
  for (const linha of linhas) {
    if (linha.startsWith('- ')) {
      if (!itens) { itens = []; blocos.push(itens); }
      itens.push(linha.slice(2).trim());
    } else if (linha.startsWith('## ')) {
      itens = null;
      blocos.push({ subtitulo: linha.slice(3).trim() });
    } else {
      itens = null;
      blocos.push(linha);
    }
  }
  const texto = blocos.length
    ? blocos.map((b) => {
      if (Array.isArray(b)) return `<ul class="campanha-lista">${b.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
      if (typeof b === 'object') return `<h2 class="campanha-subtitulo">${esc(b.subtitulo)}</h2>`;
      return `<p>${esc(b)}</p>`;
    }).join('\n')
    : '<p>As regras da campanha estão sendo atualizadas. Fale com a Anne no WhatsApp.</p>';
  return `<section class="campanha">
  <h1 class="titulo-pagina">${htmlTituloColorido('Trio Kids Abraça')}</h1>
  <p class="campanha-lema">DOE • CUIDE • COMPARTILHE</p>
  <p class="campanha-selo">${esc(desconto)}% de desconto</p>
  <div class="campanha-texto">
${texto}
  </div>
  <a class="botao" href="catalogo.html">Ver o catálogo</a>
</section>`;
}
