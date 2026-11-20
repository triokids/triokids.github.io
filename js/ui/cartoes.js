// Controlador dos botões Comprar e Espiar dos cartões de produto e do diálogo Espiar.
import { htmlEspiar } from './html.js';
import { FOCAVEIS } from './layout.js';
import { modoComprar, varianteParaComprar, mensagemCarrinho } from '../loja/compra-rapida.js';

const MARKUP_ESPIAR = '<div class="fundo-espiar" id="fundo-espiar" hidden></div>'
  + '<div class="espiar" id="espiar" role="dialog" aria-modal="true" aria-labelledby="espiar-nome" hidden>'
  + '<div class="espiar-caixa" id="espiar-caixa"></div></div>';

let espiarPronto = null;

// Cria o diálogo no body uma única vez; chamadas seguintes reaproveitam o mesmo controlador.
function garantirEspiar() {
  if (espiarPronto) return espiarPronto;
  if (!document.getElementById('espiar')) document.body.insertAdjacentHTML('beforeend', MARKUP_ESPIAR);
  const dialogo = document.getElementById('espiar');
  const fundo = document.getElementById('fundo-espiar');
  const caixa = document.getElementById('espiar-caixa');
  let estado = null; // { peca, variante, tamanho, quantidade, mensagem }
  let contexto = null; // { catalogo, carrinho, abrirGaveta }
  let acionador = null;
  let aberto = false;

  const estoqueEscolhido = () => (estado.tamanho ? estado.variante.estoque[estado.tamanho] || 0 : 0);

  function desenhar(seletorFoco, manterGaleria) {
    const faixaAntes = manterGaleria ? document.getElementById('espiar-galeria-faixa') : null;
    const posicao = faixaAntes ? faixaAntes.scrollLeft : 0;
    caixa.innerHTML = htmlEspiar(estado.peca, estado.variante, {
      desconto: contexto.catalogo.config.descontoCampanha,
      tamanho: estado.tamanho,
      quantidade: estado.quantidade,
      mensagem: estado.mensagem,
    });
    const faixa = document.getElementById('espiar-galeria-faixa');
    if (faixa && posicao > 0) {
      faixa.scrollLeft = posicao;
      const indicador = document.getElementById('espiar-galeria-indicador');
      const total = faixa.querySelectorAll('img').length;
      if (indicador && faixa.clientWidth) {
        indicador.textContent = `${Math.min(total, Math.round(posicao / faixa.clientWidth) + 1)} / ${total}`;
      }
    }
    if (seletorFoco) {
      let el = caixa.querySelector(seletorFoco);
      if (el && el.disabled) {
        // Controle desabilitado não recebe foco: usa o botão irmão ou, na falta, o Adicionar.
        const irmao = { 'espiar-menos': 'espiar-mais', 'espiar-mais': 'espiar-menos' }[el.id];
        const alt = irmao && document.getElementById(irmao);
        el = alt && !alt.disabled ? alt : document.getElementById('espiar-adicionar');
      }
      if (el && !el.disabled) el.focus();
    }
  }

  function abrir(peca, variante, ctx, origem) {
    contexto = ctx;
    estado = { peca, variante, tamanho: '', quantidade: 1, mensagem: '' };
    acionador = origem;
    desenhar();
    dialogo.hidden = false;
    fundo.hidden = false;
    aberto = true;
    document.body.classList.add('gaveta-aberta');
    caixa.querySelector('[data-acao="fechar-espiar"]').focus();
  }

  function fechar() {
    if (!aberto) return;
    dialogo.hidden = true;
    fundo.hidden = true;
    aberto = false;
    document.body.classList.remove('gaveta-aberta');
    if (acionador && acionador.isConnected && typeof acionador.focus === 'function') acionador.focus();
  }

  dialogo.addEventListener('click', (e) => {
    if (!aberto) return;
    if (e.target === dialogo || e.target.closest('[data-acao="fechar-espiar"]')) { fechar(); return; }
    const cor = e.target.closest('.cor');
    if (cor) {
      const destino = estado.peca.variantes.find((v) => v.codigo === cor.dataset.codigo);
      if (!destino || destino === estado.variante) return;
      estado.variante = destino;
      if (estado.tamanho && !(estoqueEscolhido() > 0)) { estado.tamanho = ''; estado.quantidade = 1; }
      estado.quantidade = Math.min(estado.quantidade, Math.max(1, estoqueEscolhido()));
      estado.mensagem = '';
      desenhar(`.cor[data-codigo="${CSS.escape(destino.codigo)}"]`);
      return;
    }
    const tam = e.target.closest('.tam');
    if (tam && !tam.disabled) {
      estado.tamanho = tam.dataset.tamanho;
      estado.quantidade = Math.min(estado.quantidade, Math.max(1, estoqueEscolhido()));
      estado.mensagem = '';
      desenhar(`.tam[data-tamanho="${CSS.escape(estado.tamanho)}"]`, true);
      return;
    }
    if (e.target.closest('#espiar-menos') && estado.quantidade > 1) {
      estado.quantidade -= 1;
      estado.mensagem = '';
      desenhar('#espiar-menos', true);
      return;
    }
    if (e.target.closest('#espiar-mais') && estado.quantidade < estoqueEscolhido()) {
      estado.quantidade += 1;
      estado.mensagem = '';
      desenhar('#espiar-mais', true);
      return;
    }
    if (e.target.closest('#espiar-adicionar') && estado.tamanho) {
      const { variante, tamanho, quantidade } = estado;
      const r = contexto.carrinho.adicionar(variante.codigo, tamanho, quantidade, contexto.catalogo);
      if (r.ok) {
        // Primeiro fecha (devolve o foco e solta a rolagem), depois abre a gaveta.
        fechar();
        contexto.abrirGaveta();
        return;
      }
      estado.mensagem = mensagemCarrinho(r, variante, tamanho);
      document.getElementById('espiar-aviso').textContent = estado.mensagem;
    }
  });

  fundo.addEventListener('click', fechar);

  dialogo.addEventListener('scroll', (e) => {
    const faixa = e.target;
    if (!faixa || faixa.id !== 'espiar-galeria-faixa') return;
    const indicador = document.getElementById('espiar-galeria-indicador');
    if (!indicador) return;
    const total = faixa.querySelectorAll('img').length;
    if (!faixa.clientWidth) return;
    const i = Math.min(total, Math.round(faixa.scrollLeft / faixa.clientWidth) + 1);
    indicador.textContent = `${i} / ${total}`;
  }, { capture: true, passive: true });

  document.addEventListener('keydown', (e) => {
    if (!aberto) return;
    if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
    if (e.key !== 'Tab') return;
    const foco = [...dialogo.querySelectorAll(FOCAVEIS)].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!foco.length) return;
    const primeiro = foco[0];
    const ultimo = foco[foco.length - 1];
    if (e.shiftKey && (document.activeElement === primeiro || !dialogo.contains(document.activeElement))) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && (document.activeElement === ultimo || !dialogo.contains(document.activeElement))) {
      e.preventDefault(); primeiro.focus();
    }
  });

  espiarPronto = { abrir };
  return espiarPronto;
}

export function ligarCartoes(raiz, { catalogo, carrinho, abrirGaveta }) {
  const ctx = { catalogo, carrinho, abrirGaveta };

  function fecharLista(cartao, devolverFoco = true) {
    const lista = cartao.querySelector('.cartao-tamanhos');
    const comprar = cartao.querySelector('[data-acao="comprar"]');
    if (lista) {
      lista.hidden = true;
      const aviso = lista.querySelector('.cartao-aviso');
      if (aviso) aviso.textContent = '';
    }
    if (comprar) {
      comprar.setAttribute('aria-expanded', 'false');
      if (devolverFoco) comprar.focus();
    }
  }

  function fecharOutras(cartao) {
    raiz.querySelectorAll('.cartao-tamanhos:not([hidden])').forEach((l) => {
      const outro = l.closest('.cartao');
      if (outro && outro !== cartao) fecharLista(outro, false);
    });
  }

  function abrirEspiar(peca, origem) {
    const variante = varianteParaComprar(peca)
      || peca.variantes.find((v) => Object.values(v.estoque).some((n) => n > 0))
      || peca.variantes[0];
    if (!variante) return;
    garantirEspiar().abrir(peca, variante, ctx, origem);
  }

  raiz.addEventListener('click', (e) => {
    const botao = e.target.closest('button[data-acao]');
    if (!botao || !raiz.contains(botao)) return;
    const cartao = botao.closest('[data-peca]');
    if (!cartao) return;
    const peca = catalogo.pecas.find((p) => p.id === cartao.dataset.peca);
    if (!peca) return;
    const acao = botao.dataset.acao;

    if (acao === 'comprar') {
      const modo = modoComprar(peca);
      if (modo === 'espiar') { abrirEspiar(peca, botao); return; }
      if (modo !== 'tamanhos') return;
      const lista = cartao.querySelector('.cartao-tamanhos');
      if (!lista) return;
      if (!lista.hidden) { fecharLista(cartao); return; }
      fecharOutras(cartao);
      lista.hidden = false;
      botao.setAttribute('aria-expanded', 'true');
      const primeiro = lista.querySelector('.cartao-tam');
      if (primeiro) primeiro.focus();
    } else if (acao === 'tamanho') {
      const r = carrinho.adicionar(botao.dataset.codigo, botao.dataset.tamanho, 1, catalogo);
      if (r.ok) {
        // Primeiro fecha a lista (foco volta ao Comprar), depois abre a gaveta.
        fecharLista(cartao);
        abrirGaveta();
        return;
      }
      const variante = peca.variantes.find((v) => v.codigo === botao.dataset.codigo);
      const aviso = cartao.querySelector('.cartao-aviso');
      if (aviso) aviso.textContent = mensagemCarrinho(r, variante, botao.dataset.tamanho);
    } else if (acao === 'fechar-tamanhos') {
      fecharLista(cartao);
    } else if (acao === 'espiar') {
      abrirEspiar(peca, botao);
    }
  });

  raiz.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const lista = e.target.closest && e.target.closest('.cartao-tamanhos');
    if (!lista || lista.hidden) return;
    e.preventDefault();
    fecharLista(lista.closest('.cartao'));
  });
}
