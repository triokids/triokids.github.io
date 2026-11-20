// Layout comum: cabeçalho, menu, rodapé, botão do WhatsApp, faixa de reserva e gaveta do carrinho.
import { CONFIG } from '../../config.js';
import { carregarCatalogo } from '../dados/carregar.js';
import { formatarPreco } from '../dados/csv.js';
import { criarCarrinho, revalidarItens, totalDosItens } from '../loja/carrinho.js';
import { montarMensagem, linkWhatsApp, podeFinalizar } from '../loja/whatsapp.js';
import { esc, htmlTituloColorido, htmlItemCarrinho, htmlFaixaReserva } from './html.js';

const MENU = [
  ['inicio', 'index.html', 'Início'],
  ['catalogo', 'catalogo.html', 'Catálogo'],
  ['abraca', 'campanha.html', 'Trio Kids Abraça'],
  ['tamanhos', 'tamanhos.html', 'Guia de tamanhos'],
  ['sobre', 'sobre.html', 'Sobre'],
];

const ICONE_CARRINHO = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.4" fill="currentColor"/><circle cx="17" cy="19.5" r="1.4" fill="currentColor"/></svg>';
const ICONE_WHATSAPP = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6L3 21z"/><path fill="currentColor" d="M9 7.8c.3-.4.7-.4 1 .1l.7 1.5c.1.3 0 .5-.2.8l-.4.5c.8 1.4 1.700 2.200 3.200 2.900l.6-.6c.2-.3.500-.3.800-.1l1.500.7c.4.2.4.600.2 1-.5 1-1.400 1.400-2.400 1.100-2.700-.8-5-3-5.600-5.600-.2-.9 0-1.600.6-2.200z"/></svg>';
const ICONE_INSTAGRAM = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg>';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
const instagramUrl = `https://www.instagram.com/${CONFIG.instagram}/`;

function htmlCabecalho(pagina) {
  const links = MENU.map(([id, href, rotulo]) =>
    `<a href="${href}"${id === pagina ? ' aria-current="page"' : ''}>${rotulo}</a>`).join('');
  return `<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="cabecalho">
  <div class="cabecalho-linha">
    <a class="marca" href="index.html" aria-label="Trio Kids, página inicial">
      <img src="img/logo.png" alt="" width="48" height="48">
      <span class="marca-nome">${htmlTituloColorido('TRIO KIDS')}</span>
    </a>
    <div class="cabecalho-acoes">
      <a class="botao-icone" href="${instagramUrl}" target="_blank" rel="noopener" aria-label="Instagram @${esc(CONFIG.instagram)}">${ICONE_INSTAGRAM}</a>
      <button type="button" class="botao-icone botao-carrinho" id="abrir-carrinho" aria-label="Abrir carrinho, 0 itens" aria-haspopup="dialog">
        ${ICONE_CARRINHO}<span class="contador" id="contador-carrinho" hidden>0</span>
      </button>
    </div>
  </div>
  <nav class="menu" aria-label="Menu principal">${links}</nav>
</header>
<div id="faixas"></div>`;
}

function htmlRodape() {
  return `<footer class="rodape">
  <p class="rodape-frase">Três histórias, um amor que veste infância.</p>
  <p><a class="rodape-insta" href="${instagramUrl}" target="_blank" rel="noopener">${ICONE_INSTAGRAM}<span>@${esc(CONFIG.instagram)}</span></a></p>
  <div class="faixa-cores" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
</footer>`;
}

function htmlGaveta() {
  return `<div class="fundo-gaveta" id="fundo-gaveta" hidden></div>
<aside class="gaveta" id="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo" hidden>
  <div class="gaveta-topo">
    <h2 id="gaveta-titulo">Seu carrinho</h2>
    <button type="button" class="botao-icone" id="fechar-gaveta" aria-label="Fechar carrinho">&times;</button>
  </div>
  <div class="gaveta-corpo">
    <p class="gaveta-vazio" id="gaveta-vazio">Seu carrinho está vazio.</p>
    <ul class="itens" id="gaveta-itens"></ul>
    <p class="gaveta-total" id="gaveta-total" hidden></p>
    <form class="gaveta-form" id="gaveta-form" novalidate>
      <label for="campo-nome">Seu nome</label>
      <input id="campo-nome" name="nome" type="text" autocomplete="name" required>
      <label for="campo-cidade">Cidade ou bairro</label>
      <input id="campo-cidade" name="cidade" type="text" autocomplete="address-level2" required>
      <div class="caixa-campanha">
        <label class="campo-check"><input type="checkbox" id="campo-campanha"><span>Quero participar da Trio Kids Abraça</span></label>
        <p><a href="campanha.html">Saiba como funciona a campanha</a></p>
      </div>
      <button type="submit" class="botao botao-whats" id="finalizar" disabled>Finalizar pelo WhatsApp</button>
    </form>
  </div>
</aside>`;
}

function botaoWhats(numero) {
  return `<a class="whats-flutuante" href="https://wa.me/${esc(numero)}" target="_blank" rel="noopener" aria-label="Conversar com a ${esc(CONFIG.vendedora)} no WhatsApp">${ICONE_WHATSAPP}</a>`;
}

function montarGaveta({ carrinho, getCatalogo, numero }) {
  const $ = (id) => document.getElementById(id);
  const gaveta = $('gaveta');
  const fundo = $('fundo-gaveta');
  const lista = $('gaveta-itens');
  let aberta = false;
  let acionador = null;

  const revalidados = () => revalidarItens(carrinho.itens(), getCatalogo());

  function atualizarBotao() {
    $('finalizar').disabled = !podeFinalizar({
      itens: revalidados(), nome: $('campo-nome').value, cidade: $('campo-cidade').value,
    });
  }

  function renderizar() {
    const itens = revalidados();
    const qtd = itens.reduce((s, i) => s + (i.situacao === 'removida' || i.situacao === 'esgotado' ? 0 : i.quantidade), 0);
    const contador = $('contador-carrinho');
    contador.textContent = String(qtd);
    contador.hidden = qtd === 0;
    $('abrir-carrinho').setAttribute('aria-label', `Abrir carrinho, ${qtd} ${qtd === 1 ? 'item' : 'itens'}`);
    lista.innerHTML = itens.map(htmlItemCarrinho).join('');
    $('gaveta-vazio').hidden = itens.length > 0;
    const total = $('gaveta-total');
    total.hidden = itens.length === 0;
    total.innerHTML = `Total <strong>${formatarPreco(totalDosItens(itens))}</strong>`;
    atualizarBotao();
  }

  function abrir() {
    acionador = document.activeElement;
    renderizar();
    gaveta.hidden = false;
    fundo.hidden = false;
    aberta = true;
    document.body.classList.add('gaveta-aberta');
    $('fechar-gaveta').focus();
  }

  function fechar() {
    gaveta.hidden = true;
    fundo.hidden = true;
    aberta = false;
    document.body.classList.remove('gaveta-aberta');
    if (acionador && typeof acionador.focus === 'function') acionador.focus();
  }

  $('abrir-carrinho').addEventListener('click', abrir);
  $('fechar-gaveta').addEventListener('click', fechar);
  fundo.addEventListener('click', fechar);

  document.addEventListener('keydown', (e) => {
    if (!aberta) return;
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
    if (e.key !== 'Tab') return;
    const foco = [...gaveta.querySelectorAll(FOCAVEIS)].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!foco.length) return;
    const primeiro = foco[0];
    const ultimo = foco[foco.length - 1];
    if (e.shiftKey && (document.activeElement === primeiro || !gaveta.contains(document.activeElement))) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro.focus();
    }
  });

  lista.addEventListener('click', (e) => {
    const botao = e.target.closest('button[data-acao]');
    if (!botao) return;
    const { codigo, tamanho } = botao.closest('li[data-codigo]').dataset;
    const atual = carrinho.itens().find((i) => i.codigo === codigo && i.tamanho === tamanho);
    if (!atual) return;
    const catalogo = getCatalogo();
    if (botao.dataset.acao === 'remover') carrinho.remover(codigo, tamanho);
    else if (botao.dataset.acao === 'mais') carrinho.alterar(codigo, tamanho, atual.quantidade + 1, catalogo);
    else if (botao.dataset.acao === 'menos') carrinho.alterar(codigo, tamanho, atual.quantidade - 1, catalogo);
  });

  $('gaveta-form').addEventListener('input', atualizarBotao);
  $('gaveta-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const itens = revalidados();
    const nome = $('campo-nome').value;
    const cidade = $('campo-cidade').value;
    if (!podeFinalizar({ itens, nome, cidade })) return;
    const mensagem = montarMensagem({
      vendedora: CONFIG.vendedora,
      itens,
      nome,
      cidade,
      querCampanha: $('campo-campanha').checked,
      descontoCampanha: getCatalogo().config.descontoCampanha,
    });
    window.open(linkWhatsApp(numero, mensagem), '_blank', 'noopener');
  });

  carrinho.aoMudar(renderizar);
  renderizar();
  return abrir;
}

export async function montarLayout({ pagina }) {
  document.body.insertAdjacentHTML('afterbegin', htmlCabecalho(pagina));
  document.body.insertAdjacentHTML('beforeend', htmlRodape());
  const principal = document.getElementById('conteudo');
  const carrinho = criarCarrinho(undefined, CONFIG.chaveCarrinho);

  let resultado;
  try {
    resultado = await carregarCatalogo(CONFIG);
  } catch {
    if (principal) {
      principal.innerHTML = '<p class="erro-catalogo" role="alert">Não conseguimos carregar o catálogo agora. Fale com a Anne no WhatsApp.</p>';
    }
    document.body.insertAdjacentHTML('beforeend', botaoWhats(CONFIG.whatsapp));
    throw new Error('catalogo-indisponivel');
  }

  const { catalogo, origem } = resultado;
  const numero = catalogo.config.whatsapp || CONFIG.whatsapp;
  const faixas = document.getElementById('faixas');
  if (origem !== 'planilha') faixas.insertAdjacentHTML('beforeend', htmlFaixaReserva());
  if (catalogo.config.avisoTopo) {
    faixas.insertAdjacentHTML('beforeend', `<div class="aviso-topo" role="status">${esc(catalogo.config.avisoTopo)}</div>`);
  }
  document.body.insertAdjacentHTML('beforeend', htmlGaveta() + botaoWhats(numero));
  const abrirGaveta = montarGaveta({ carrinho, getCatalogo: () => catalogo, numero });
  return { catalogo, carrinho, origem, abrirGaveta };
}
