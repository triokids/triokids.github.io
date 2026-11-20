import { montarLayout } from '../ui/layout.js';
import { encontrarVariante } from '../loja/carrinho.js';
import { esgotada } from '../loja/filtros.js';
import { esc, htmlCartao, htmlGaleria, htmlSeletorTamanho, htmlSeletorCor, htmlBlocoPreco, urlFoto, altFoto } from '../ui/html.js';
import { mensagemCarrinho } from '../loja/compra-rapida.js';
import { ligarCartoes } from '../ui/cartoes.js';

try {
  const { catalogo, carrinho, abrirGaveta } = await montarLayout({ pagina: 'catalogo' });
  const principal = document.getElementById('conteudo');
  const desconto = catalogo.config.descontoCampanha;
  const codigoInicial = new URLSearchParams(location.search).get('c') || '';
  const achado = encontrarVariante(catalogo, codigoInicial);

  if (!achado) {
    document.title = 'Peça não encontrada | Trio Kids';
    principal.innerHTML = `<div class="vazio"><h1 class="titulo-pagina">Peça não encontrada</h1>
<p>Essa peça não existe ou saiu do catálogo.</p><a class="botao" href="catalogo.html">Ver o catálogo</a></div>`;
  } else {
    const { peca } = achado;
    let variante = achado.variante;
    let tamanho = '';
    let quantidade = 1;
    let mensagem = '';
    let fotoAtual = 1;
    document.title = `${peca.nome} | Trio Kids`;

    const combina = catalogo.pecas
      .filter((p) => p.id !== peca.id && p.colecao === peca.colecao && !esgotada(p))
      .slice(0, 4);

    const estoqueEscolhido = () => (tamanho ? variante.estoque[tamanho] || 0 : 0);

    // Troca a foto grande sem redesenhar a página (mantém o foco onde a cliente está).
    function mostrarFoto(n) {
      const total = variante.fotos;
      const foto = document.getElementById('galeria-foto');
      if (!foto || !(total > 1)) return;
      fotoAtual = ((n - 1 + total) % total) + 1;
      foto.src = urlFoto(variante.codigo, fotoAtual);
      foto.alt = altFoto(variante, peca.nome, fotoAtual);
      principal.querySelectorAll('.galeria-mini').forEach((b) => {
        if (Number(b.dataset.foto) === fotoAtual) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
      const indicador = document.getElementById('galeria-indicador');
      if (indicador) indicador.textContent = `${fotoAtual} / ${total}`;
    }

    // Deslizar o dedo na foto grande (celular) passa para a anterior/próxima.
    function ligarDeslize() {
      const area = principal.querySelector('.galeria-com-miniaturas .galeria-principal');
      if (!area) return;
      let inicioX = null;
      let inicioY = null;
      area.addEventListener('touchstart', (e) => {
        inicioX = e.touches[0].clientX;
        inicioY = e.touches[0].clientY;
      }, { passive: true });
      area.addEventListener('touchend', (e) => {
        if (inicioX === null) return;
        const dx = e.changedTouches[0].clientX - inicioX;
        const dy = e.changedTouches[0].clientY - inicioY;
        inicioX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) mostrarFoto(fotoAtual + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }

    // seletorFoco: seletor CSS do controle que deve receber o foco depois de redesenhar.
    // manterGaleria: true quando a variante não mudou (mantém a foto que a cliente estava vendo).
    function desenhar(seletorFoco, manterGaleria) {
      if (!manterGaleria) fotoAtual = 1;
      const max = estoqueEscolhido();
      principal.innerHTML = `<nav class="migalha" aria-label="Caminho"><a href="catalogo.html">&larr; Catálogo</a></nav>
<div class="peca">
  <div class="peca-fotos">${htmlGaleria(variante, peca.nome, fotoAtual)}</div>
  <div class="peca-info">
    <h1 class="peca-nome">${esc(peca.nome)}</h1>
    ${variante.cor && peca.variantes.length < 2 ? `<p class="peca-cor">${esc(variante.cor)}</p>` : ''}
    ${htmlSeletorCor(peca, variante.codigo)}
    ${htmlBlocoPreco(variante, desconto)}
    <h2 class="peca-sub">Tamanho</h2>
    ${htmlSeletorTamanho(variante, tamanho)}
    <p><a href="tamanhos.html">Qual tamanho escolher?</a></p>
    <div class="qtd" role="group" aria-label="Quantidade">
      <button type="button" id="qtd-menos" aria-label="Diminuir quantidade"${quantidade <= 1 ? ' disabled' : ''}>−</button>
      <output id="qtd-valor" aria-live="polite">${quantidade}</output>
      <button type="button" id="qtd-mais" aria-label="Aumentar quantidade"${!tamanho || quantidade >= max ? ' disabled' : ''}>+</button>
    </div>
    <button type="button" class="botao botao-adicionar" id="adicionar"${tamanho ? '' : ' disabled'}>Adicionar ao carrinho</button>
    <p class="peca-aviso" id="peca-aviso" role="status">${esc(mensagem || (tamanho ? '' : 'Escolha um tamanho'))}</p>
    ${peca.descricao ? `<p class="peca-descricao">${esc(peca.descricao)}</p>` : ''}
  </div>
</div>
${combina.length ? `<section class="bloco"><h2 class="titulo-secao">Combina com</h2><div class="grade">${combina.map((p) => htmlCartao(p, desconto)).join('')}</div></section>` : ''}`;

      ligarDeslize();
      if (seletorFoco) {
        const el = principal.querySelector(seletorFoco);
        if (el && !el.disabled) el.focus();
      }
    }

    principal.addEventListener('keydown', (e) => {
      if (!e.target.closest('.galeria-com-miniaturas')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const mini = e.target.closest('.galeria-mini');
        const base = mini ? Number(mini.dataset.foto) : fotoAtual;
        mostrarFoto(base + (e.key === 'ArrowRight' ? 1 : -1));
        if (mini) principal.querySelector(`.galeria-mini[data-foto="${fotoAtual}"]`)?.focus();
      }
    });

    principal.addEventListener('click', (e) => {
      const mini = e.target.closest('.galeria-mini');
      if (mini) { mostrarFoto(Number(mini.dataset.foto)); return; }
      if (e.target.closest('.galeria-anterior')) { mostrarFoto(fotoAtual - 1); return; }
      if (e.target.closest('.galeria-proxima')) { mostrarFoto(fotoAtual + 1); return; }
      const cor = e.target.closest('.cor');
      if (cor) {
        const destino = peca.variantes.find((v) => v.codigo === cor.dataset.codigo);
        if (!destino || destino === variante) return;
        variante = destino;
        if (tamanho && !(estoqueEscolhido() > 0)) { tamanho = ''; quantidade = 1; }
        quantidade = Math.min(quantidade, Math.max(1, estoqueEscolhido()));
        mensagem = '';
        history.replaceState(null, '', `${location.pathname}?c=${encodeURIComponent(variante.codigo)}`);
        desenhar(`.cor[data-codigo="${CSS.escape(variante.codigo)}"]`);
        return;
      }
      const tam = e.target.closest('.tam');
      if (tam && !tam.disabled) {
        tamanho = tam.dataset.tamanho;
        quantidade = Math.min(quantidade, Math.max(1, estoqueEscolhido()));
        mensagem = '';
        desenhar(`.tam[data-tamanho="${CSS.escape(tamanho)}"]`, true);
        return;
      }
      if (e.target.closest('#qtd-menos') && quantidade > 1) {
        quantidade -= 1;
        mensagem = '';
        desenhar('#qtd-menos', true);
        return;
      }
      if (e.target.closest('#qtd-mais') && quantidade < estoqueEscolhido()) {
        quantidade += 1;
        mensagem = '';
        desenhar('#qtd-mais', true);
        return;
      }
      if (e.target.closest('#adicionar') && tamanho) {
        const r = carrinho.adicionar(variante.codigo, tamanho, quantidade, catalogo);
        if (r.ok) {
          mensagem = '';
          desenhar('#adicionar', true);
          abrirGaveta();
          return;
        }
        mensagem = mensagemCarrinho(r, variante, tamanho);
        document.getElementById('peca-aviso').textContent = mensagem;
      }
    });

    ligarCartoes(principal, { catalogo, carrinho, abrirGaveta });
    desenhar();
  }
} catch {
  // montarLayout já mostrou a mensagem de erro e o botão do WhatsApp.
}
