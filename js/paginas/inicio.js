import { montarLayout } from '../ui/layout.js';
import { TAMANHOS } from '../dados/catalogo.js';
import { destaques } from '../loja/filtros.js';
import { esc, htmlCartao, htmlTituloColorido, htmlPontinhos } from '../ui/html.js';

function htmlInicio(catalogo) {
  const categorias = [...new Set(catalogo.pecas.map((p) => p.categoria).filter(Boolean))];
  const atalhosCategoria = categorias.map((c) =>
    `<a class="atalho" href="catalogo.html?categoria=${encodeURIComponent(c)}">${esc(c)}</a>`).join('');
  const atalhosTamanho = TAMANHOS.map((t) =>
    `<a class="atalho atalho-tam" href="catalogo.html?tamanho=${encodeURIComponent(t)}" aria-label="Tamanho ${esc(t)}">${esc(t)}</a>`).join('');
  const cartoes = destaques(catalogo.pecas).map((p) => htmlCartao(p, catalogo.config.descontoCampanha)).join('');

  return `<section class="heroi">
  <img src="img/logo.png" alt="Trio Kids: cabide com as três crianças" width="160" height="160">
  <h1>${htmlTituloColorido('Pequenos looks, grandes histórias.')}</h1>
  ${htmlPontinhos()}
</section>
<section class="banner-colecao">
  <p class="rotulo">Coleção</p>
  <h2>Linha Petit</h2>
  <p class="subtitulo">Do minimalista ao divertido</p>
  <a class="botao" href="catalogo.html">Ver o catálogo</a>
</section>
<a class="faixa-abraca" href="campanha.html">
  <strong>Trio Kids Abraça</strong>
  <span>Doe uma peça e ganhe desconto na sua compra. Saiba como participar.</span>
</a>
<section class="bloco" aria-labelledby="t-cat">
  <h2 id="t-cat" class="titulo-secao">Compre por categoria</h2>
  <div class="atalhos">${atalhosCategoria}</div>
</section>
<section class="bloco" aria-labelledby="t-tam">
  <h2 id="t-tam" class="titulo-secao">Compre por tamanho</h2>
  <div class="atalhos">${atalhosTamanho}</div>
</section>
<section class="bloco" aria-labelledby="t-dest">
  <h2 id="t-dest" class="titulo-secao">Destaques</h2>
  <div class="grade">${cartoes}</div>
</section>`;
}

try {
  const { catalogo } = await montarLayout({ pagina: 'inicio' });
  document.getElementById('conteudo').innerHTML = htmlInicio(catalogo);
} catch {
  // montarLayout já mostrou a mensagem de erro e o botão do WhatsApp.
}
