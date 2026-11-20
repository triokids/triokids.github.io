import { montarLayout } from '../ui/layout.js';
import { encontrarVariante } from '../loja/carrinho.js';
import { precoComCampanha } from '../loja/campanha.js';
import { esgotada } from '../loja/filtros.js';
import { formatarPreco } from '../dados/csv.js';
import { esc, htmlCartao, htmlGaleria, htmlSeletorTamanho, htmlSeletorCor } from '../ui/html.js';

const MOTIVOS = {
  'sem-tamanho': 'Esse tamanho não está disponível.',
  esgotado: 'Esse tamanho esgotou.',
};

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
    document.title = `${peca.nome} | Trio Kids`;

    const combina = catalogo.pecas
      .filter((p) => p.id !== peca.id && p.colecao === peca.colecao && !esgotada(p))
      .slice(0, 4);

    const estoqueEscolhido = () => (tamanho ? variante.estoque[tamanho] || 0 : 0);

    function htmlBlocoPreco() {
      const campanha = variante.campanha
        ? `<p class="preco-campanha">Com a <a href="campanha.html">Trio Kids Abraça</a> <strong>${formatarPreco(precoComCampanha(variante.preco, desconto))}</strong></p>`
        : '';
      return `<p class="preco preco-grande">${formatarPreco(variante.preco)}</p>${campanha}`;
    }

    function ligarGaleria() {
      const faixa = document.getElementById('galeria-faixa');
      const indicador = document.getElementById('galeria-indicador');
      if (!faixa || !indicador) return;
      const total = faixa.querySelectorAll('img').length;
      faixa.addEventListener('scroll', () => {
        const i = Math.min(total, Math.round(faixa.scrollLeft / faixa.clientWidth) + 1);
        indicador.textContent = `${i} / ${total}`;
      }, { passive: true });
    }

    // seletorFoco: seletor CSS do controle que deve receber o foco depois de redesenhar.
    // manterGaleria: true quando a variante não mudou (mantém a foto que a cliente estava vendo).
    function desenhar(seletorFoco, manterGaleria) {
      const faixaAntes = manterGaleria ? document.getElementById('galeria-faixa') : null;
      const posicao = faixaAntes ? faixaAntes.scrollLeft : 0;
      const max = estoqueEscolhido();
      principal.innerHTML = `<nav class="migalha" aria-label="Caminho"><a href="catalogo.html">&larr; Catálogo</a></nav>
<div class="peca">
  <div class="peca-fotos">${htmlGaleria(variante, peca.nome)}</div>
  <div class="peca-info">
    <h1 class="peca-nome">${esc(peca.nome)}</h1>
    ${variante.cor && peca.variantes.length < 2 ? `<p class="peca-cor">${esc(variante.cor)}</p>` : ''}
    ${htmlSeletorCor(peca, variante.codigo)}
    ${htmlBlocoPreco()}
    <h2 class="peca-sub">Tamanho</h2>
    ${htmlSeletorTamanho(variante)}
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

      if (tamanho) {
        const b = principal.querySelector(`.tam[data-tamanho="${CSS.escape(tamanho)}"]`);
        if (b) {
          b.setAttribute('aria-pressed', 'true');
          b.classList.add('tam-escolhido');
        }
      }
      ligarGaleria();
      const faixaNova = document.getElementById('galeria-faixa');
      if (faixaNova && posicao > 0) {
        faixaNova.scrollLeft = posicao;
        const indicador = document.getElementById('galeria-indicador');
        const total = faixaNova.querySelectorAll('img').length;
        if (indicador && faixaNova.clientWidth) {
          indicador.textContent = `${Math.min(total, Math.round(posicao / faixaNova.clientWidth) + 1)} / ${total}`;
        }
      }
      if (seletorFoco) {
        const el = principal.querySelector(seletorFoco);
        if (el && !el.disabled) el.focus();
      }
    }

    principal.addEventListener('click', (e) => {
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
        mensagem = r.motivo === 'limite'
          ? `Só temos ${variante.estoque[tamanho]} no tamanho ${tamanho}`
          : (MOTIVOS[r.motivo] || 'Não foi possível adicionar.');
        document.getElementById('peca-aviso').textContent = mensagem;
      }
    });

    desenhar();
  }
} catch {
  // montarLayout já mostrou a mensagem de erro e o botão do WhatsApp.
}
