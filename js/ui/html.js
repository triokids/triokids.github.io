// Funções puras que devolvem HTML (string). Sem DOM, sem acesso a js/paginas.
import { formatarPreco } from '../dados/csv.js';
import { precoComCampanha } from '../loja/campanha.js';
import { TAMANHOS } from '../dados/catalogo.js';
import { menorPreco, esgotada } from '../loja/filtros.js';
import { modoComprar, varianteParaComprar } from '../loja/compra-rapida.js';

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

// Ícones em linha (decorativos: o texto ou o aria-label do botão dá o nome).
const SVG_ATRIBUTOS = 'viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
const TRACO = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export function htmlIconeCarrinho(tamanho = 24, classe = '') {
  const cls = classe ? ` class="${classe}"` : '';
  return `<svg${cls} ${SVG_ATRIBUTOS} width="${tamanho}" height="${tamanho}"><path ${TRACO} d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.4" fill="currentColor"/><circle cx="17" cy="19.5" r="1.4" fill="currentColor"/></svg>`;
}

function htmlIconeOlho(tamanho = 18) {
  return `<svg class="icone-olho" ${SVG_ATRIBUTOS} width="${tamanho}" height="${tamanho}"><path ${TRACO} d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle ${TRACO} cx="12" cy="12" r="3"/></svg>`;
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

  const modo = modoComprar(peca);
  const nome = esc(peca.nome);
  const botaoComprar = modo === 'nenhum' ? '' : `<button type="button" class="cartao-botao" data-acao="comprar"${modo === 'tamanhos' ? ` aria-expanded="false" aria-controls="tam-${esc(peca.id)}"` : ' aria-haspopup="dialog"'} aria-label="Comprar ${nome}">${htmlIconeCarrinho(18, 'icone-carrinho')}<span>Comprar</span></button>`;
  const tamanhos = modo === 'tamanhos' ? htmlTamanhosRapidos(varianteParaComprar(peca), peca.id) : '';

  return `<article class="cartao${fim ? ' cartao-esgotado' : ''}" data-peca="${esc(peca.id)}">
  <div class="cartao-foto">${foto}${fim ? '<span class="selo-esgotado selo-canto">esgotado</span>' : ''}
    <div class="cartao-acoes">${botaoComprar}<button type="button" class="cartao-botao cartao-botao-claro" data-acao="espiar" aria-haspopup="dialog" aria-label="Espiar ${nome}">${htmlIconeOlho()}<span>Espiar</span></button></div>
    ${tamanhos}
  </div>
  <div class="cartao-corpo">
    <h3 class="cartao-nome"><a class="cartao-link" href="peca.html?c=${encodeURIComponent(peca.id)}">${nome}</a></h3>
    <p class="preco">${variavel ? '<span class="a-partir">a partir de</span> ' : ''}${formatarPreco(menor)}</p>
    ${blocoCampanha}
  </div>
</article>`;
}

// Lista de tamanhos com estoque que cobre a foto do cartão (compra rápida de uma cor só).
export function htmlTamanhosRapidos(variante, idPeca) {
  const botoes = TAMANHOS.filter((t) => variante.estoque[t] > 0)
    .map((t) => `<button type="button" class="cartao-tam" data-acao="tamanho" data-codigo="${esc(variante.codigo)}" data-tamanho="${esc(t)}">${esc(t)}</button>`)
    .join('');
  return `<div class="cartao-tamanhos" id="tam-${esc(idPeca)}" hidden>
    <p>Escolha o tamanho</p>
    <div class="cartao-tam-lista">${botoes}</div>
    <button type="button" class="cartao-tam-fechar" data-acao="fechar-tamanhos" aria-label="Fechar tamanhos">&times;</button>
    <p class="cartao-aviso" role="status"></p>
  </div>`;
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

export function htmlTituloCatalogo(busca) {
  return busca ? `Resultados para “${esc(busca)}”` : 'Catálogo';
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
// idBase: prefixo dos ids (o Espiar usa outro para não colidir com a página da peça).
export function htmlGaleria(variante, nome, atual = 1, idBase = 'galeria') {
  if (!variante || !(variante.fotos > 0)) {
    return '<div class="galeria"><div class="sem-foto galeria-vazia"><img src="img/logo.png" alt="" width="96" height="96"></div></div>';
  }
  const total = variante.fotos;
  const n = Number.isInteger(atual) && atual >= 1 && atual <= total ? atual : 1;
  const principal = `<img id="${esc(idBase)}-foto" src="${esc(urlFoto(variante.codigo, n))}" alt="${esc(altFoto(variante, nome, n))}" width="600" height="800">`;
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
<p class="galeria-indicador" id="${esc(idBase)}-indicador" aria-live="polite">${n} / ${total}</p></div>
<div class="galeria-miniaturas" role="group" aria-label="Fotos de ${esc(nome)}">${minis}</div></div>`;
}

export function htmlSeletorTamanho(variante, escolhido = '') {
  const botoes = TAMANHOS.filter((t) => Object.hasOwn(variante.estoque, t)).map((t) => {
    const n = variante.estoque[t];
    if (!(n > 0)) {
      return `<button type="button" class="tam tam-esgotado" data-tamanho="${esc(t)}" disabled aria-label="Tamanho ${esc(t)}, esgotado">${esc(t)}</button>`;
    }
    const ultima = n === 1 ? '<small class="tam-ultima">última unidade</small>' : '';
    const marcado = escolhido !== '' && t === escolhido;
    return `<button type="button" class="${marcado ? 'tam tam-escolhido' : 'tam'}" data-tamanho="${esc(t)}" aria-pressed="${marcado}">${esc(t)}${ultima}</button>`;
  });
  return `<div class="tamanhos-opcoes" role="group" aria-label="Tamanho">${botoes.join('')}</div>`;
}

export function htmlBlocoPreco(variante, desconto) {
  const campanha = variante.campanha
    ? `<p class="preco-campanha">Com a <a href="campanha.html">Trio Kids Abraça</a> <strong>${formatarPreco(precoComCampanha(variante.preco, desconto))}</strong></p>`
    : '';
  return `<p class="preco preco-grande">${formatarPreco(variante.preco)}</p>${campanha}`;
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

// Conteúdo do diálogo Espiar: a peça numa cor, com tamanho, quantidade e adicionar ao carrinho.
export function htmlEspiar(peca, variante, { desconto, tamanho = '', quantidade = 1, mensagem = '', foto = 1 }) {
  const max = tamanho ? variante.estoque[tamanho] || 0 : 0;
  return `<button type="button" class="botao-icone espiar-fechar" data-acao="fechar-espiar" aria-label="Fechar">&times;</button>
<div class="espiar-fotos">${htmlGaleria(variante, peca.nome, foto, 'espiar-galeria')}</div>
<div class="espiar-info">
  <h2 id="espiar-nome">${esc(peca.nome)}</h2>
  ${htmlSeletorCor(peca, variante.codigo)}
  ${htmlBlocoPreco(variante, desconto)}
  ${htmlSeletorTamanho(variante, tamanho)}
  <div class="qtd" role="group" aria-label="Quantidade">
    <button type="button" id="espiar-menos" aria-label="Diminuir quantidade"${quantidade <= 1 ? ' disabled' : ''}>−</button>
    <output id="espiar-valor" aria-live="polite">${quantidade}</output>
    <button type="button" id="espiar-mais" aria-label="Aumentar quantidade"${!tamanho || quantidade >= max ? ' disabled' : ''}>+</button>
  </div>
  <button type="button" class="botao botao-adicionar" id="espiar-adicionar"${tamanho ? '' : ' disabled'}>Adicionar ao carrinho</button>
  <p class="peca-aviso" id="espiar-aviso" role="status">${esc(mensagem || (tamanho ? '' : 'Escolha um tamanho'))}</p>
  <a href="peca.html?c=${esc(encodeURIComponent(variante.codigo))}">Ver detalhes</a>
</div>`;
}

// --- Busca no cabeçalho ---

function htmlIconeLupa(tamanho = 20) {
  return `<svg ${SVG_ATRIBUTOS} width="${tamanho}" height="${tamanho}"><circle ${TRACO} cx="11" cy="11" r="7"/><path ${TRACO} d="M20 20l-4-4"/></svg>`;
}

// Funciona sem JS: envio GET comum para o catálogo.
export function htmlCampoBusca(termo = '') {
  return `<form class="busca" role="search" action="catalogo.html" method="get">
  <input id="busca-campo" name="busca" type="search" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="busca-sugestoes" aria-autocomplete="list" placeholder="O que você está buscando?" aria-label="O que você está buscando?" value="${esc(termo)}">
  <button type="submit" class="busca-botao" aria-label="Buscar">${htmlIconeLupa()}</button>
  <ul id="busca-sugestoes" class="busca-sugestoes" role="listbox" aria-label="Sugestões" hidden></ul>
</form>`;
}

export function htmlSugestoes(pecas, termo) {
  if (!pecas.length) return '';
  const itens = pecas.map((p, i) => {
    const primeira = p.variantes[0];
    const foto = primeira && primeira.fotos > 0
      ? `<img src="${esc(urlFoto(primeira.codigo, 1))}" alt="" loading="lazy" width="48" height="64">`
      : '<img src="img/logo.png" alt="" width="48" height="48">';
    const selo = esgotada(p) ? ' <span class="selo-esgotado">esgotado</span>' : '';
    return `<li role="option" id="sug-${i}"><a class="sugestao" href="peca.html?c=${esc(encodeURIComponent(p.id))}">${foto}<span class="sugestao-texto"><span class="sugestao-nome">${esc(p.nome)}</span><span class="sugestao-preco">${formatarPreco(menorPreco(p))}${selo}</span></span></a></li>`;
  }).join('');
  const params = new URLSearchParams({ busca: termo });
  return `${itens}<li role="option" id="sug-todos"><a class="sugestao sugestao-todos" href="catalogo.html?${esc(params.toString())}">Ver todos os resultados</a></li>`;
}
