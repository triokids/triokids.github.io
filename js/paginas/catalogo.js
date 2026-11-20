import { montarLayout } from '../ui/layout.js';
import { filtrarPecas, ordenarPecas } from '../loja/filtros.js';
import { lerFiltrosDaUrl, filtrosParaUrl, esgotadasNoFim } from '../loja/filtros-url.js';
import { htmlCartao, htmlFiltros } from '../ui/html.js';

try {
  const { catalogo } = await montarLayout({ pagina: 'catalogo' });
  const principal = document.getElementById('conteudo');
  const categorias = [...new Set(catalogo.pecas.map((p) => p.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  principal.innerHTML = `<h1 class="titulo-pagina">Catálogo</h1>
<div class="filtros-caixa" id="filtros-caixa"></div>
<p class="contador-pecas" id="contador-pecas" role="status" aria-live="polite"></p>
<div id="resultado"></div>`;
  const caixa = document.getElementById('filtros-caixa');

  function desenharFiltros(filtros) {
    caixa.innerHTML = htmlFiltros(categorias, filtros);
  }

  function desenharResultado(filtros) {
    const lista = esgotadasNoFim(ordenarPecas(filtrarPecas(catalogo.pecas, filtros), filtros.ordem));
    document.getElementById('contador-pecas').textContent = `${lista.length} ${lista.length === 1 ? 'peça' : 'peças'}`;
    document.getElementById('resultado').innerHTML = lista.length
      ? `<div class="grade">${lista.map((p) => htmlCartao(p, catalogo.config.descontoCampanha)).join('')}</div>`
      : `<div class="vazio"><p>Nenhuma peça com esses filtros</p><button type="button" class="botao" id="limpar-filtros">Limpar filtros</button></div>`;
  }

  function lerFormulario() {
    const f = new FormData(document.getElementById('painel-filtros'));
    const q = new URLSearchParams();
    for (const [k, v] of f.entries()) q.set(k, String(v));
    return lerFiltrosDaUrl(`?${q}`);
  }

  function aplicar(filtros) {
    history.pushState(null, '', `${location.pathname}${filtrosParaUrl(filtros)}`);
    desenharResultado(filtros);
  }

  caixa.addEventListener('click', (e) => {
    if (e.target.closest('#abrir-filtros')) {
      const aberto = caixa.classList.toggle('aberto');
      document.getElementById('abrir-filtros').setAttribute('aria-expanded', String(aberto));
    } else if (e.target.closest('.limpar')) {
      e.preventDefault();
      limpar();
    }
  });
  caixa.addEventListener('submit', (e) => {
    e.preventDefault();
    aplicar(lerFormulario());
    caixa.classList.remove('aberto');
    document.getElementById('abrir-filtros').setAttribute('aria-expanded', 'false');
  });
  caixa.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT') aplicar(lerFormulario());
  });
  document.getElementById('resultado').addEventListener('click', (e) => {
    if (e.target.closest('#limpar-filtros')) limpar();
  });

  function limpar() {
    const vazio = { ordem: 'novidades' };
    desenharFiltros(vazio);
    aplicar(vazio);
  }

  function redesenhar() {
    const filtros = lerFiltrosDaUrl(location.search);
    const aberto = caixa.classList.contains('aberto');
    desenharFiltros(filtros);
    caixa.classList.toggle('aberto', aberto);
    document.getElementById('abrir-filtros').setAttribute('aria-expanded', String(aberto));
    desenharResultado(filtros);
  }

  window.addEventListener('popstate', redesenhar);
  redesenhar();
} catch {
  // montarLayout já mostrou a mensagem de erro e o botão do WhatsApp.
}
