# Cartão com Comprar e Espiar — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botões "Comprar" e "Espiar" sobre a foto do cartão de produto (no hover no desktop, sempre visíveis no celular), com compra rápida por tamanho no cartão e uma janela de visualização rápida.

**Architecture:** Regras puras novas em `js/loja/compra-rapida.js`; HTML como string em `js/ui/html.js` (funções puras, testadas com `node --test`); um único controlador de DOM novo em `js/ui/cartoes.js` (delegação de eventos + diálogo Espiar) ligado pelas três páginas que mostram cartões. O carrinho continua só em `js/loja/carrinho.js`.

**Tech Stack:** HTML5, CSS, JavaScript ES2022 (módulos nativos, sem build), Node 24 `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-20-cartao-comprar-espiar-design.md` — o implementador lê.

## Global Constraints

- Sem build, sem dependência nova. `npm test` (= `node --test`) passa ao fim de cada task.
- Todo texto vindo da planilha passa por `esc()` antes de entrar em HTML (inclusive em `aria-label`).
- Cores só pelas variáveis de `css/estilo.css` (`--titulo`, `--cartao`, `--peche`, `--rotulo`, etc.). Nunca preto puro.
- Alvos de toque/clique com no mínimo 44px; foco visível (o `:focus-visible` global já existe).
- Animações curtas; `prefers-reduced-motion` já zera transições globalmente (`css/estilo.css:215`).
- Textos em português do Brasil. Rótulos visíveis: `Comprar`, `Espiar`, `Escolha o tamanho`, `Ver detalhes`, `Adicionar ao carrinho`.
- Commits por caminho explícito (`git add <arquivos>`), nunca `git add .`. Mensagem termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Peça com várias cores e só uma com estoque**: o Comprar mostra direto os tamanhos dessa cor (não abre o Espiar). Teste em Task 1 (`modoComprar`) e Task 2 (`htmlCartao`).
- **Nome com `<`, `&`, aspas**: aparece escapado no cartão, nos `aria-label` dos botões e no Espiar. Teste em Task 2.
- **Espiar aberto na página da peça**: os ids da galeria do Espiar não colidem com os da galeria da página (`galeria-faixa`). Teste em Task 2 (`htmlGaleria` com `idBase`).
- **Tamanho esgota entre o desenho e o clique** (carrinho devolve `esgotado` ou `limite`): mostra a mesma mensagem da página da peça no cartão/Espiar, sem abrir a gaveta. Teste em Task 1 (`mensagemCarrinho`).
- **Só teclado**: Tab chega aos botões mesmo com o mouse fora (aparecem com `:focus-within`), Esc fecha a lista de tamanhos e o Espiar, e o foco volta ao botão que abriu. Verificação manual em Task 3.

---

## Estrutura de arquivos

- Create `js/loja/compra-rapida.js` — `modoComprar`, `varianteParaComprar`, `mensagemCarrinho` (puras).
- Create `tests/compra-rapida.test.js`.
- Modify `js/ui/html.js` — `htmlCartao` (nova estrutura), `htmlGaleria` (param `idBase`), novas `htmlBlocoPreco`, `htmlTamanhosRapidos`, `htmlEspiar`.
- Modify `tests/html.test.js`, `tests/peca-pagina.test.js`.
- Create `js/ui/cartoes.js` — `ligarCartoes` (DOM).
- Modify `js/ui/layout.js` — exporta `FOCAVEIS`.
- Modify `js/paginas/catalogo.js`, `js/paginas/inicio.js`, `js/paginas/peca.js` — ligam `ligarCartoes`; `peca.js` passa a usar `htmlBlocoPreco` e `mensagemCarrinho`.
- Modify `css/estilo.css` — seção "Grade e cartão" e nova seção "Espiar".

---

### Task 1: Regras da compra rápida

**Files:**
- Create: `js/loja/compra-rapida.js`
- Create: `tests/compra-rapida.test.js`
- Modify: `js/paginas/peca.js` (troca `MOTIVOS` local por `mensagemCarrinho`)

**Interfaces:**
- Consumes: `esgotada(peca)` de `js/loja/filtros.js`; resultado de `carrinho.adicionar` = `{ ok: true } | { ok: false, motivo: 'sem-tamanho' | 'esgotado' | 'limite' }`.
- Produces:
  - `varianteParaComprar(peca) -> variante | null` — a única variante com algum estoque > 0; `null` se zero ou mais de uma tem estoque.
  - `modoComprar(peca) -> 'nenhum' | 'tamanhos' | 'espiar'` — `'nenhum'` se `esgotada(peca)`; `'tamanhos'` se `varianteParaComprar(peca)` não é null; senão `'espiar'`.
  - `mensagemCarrinho(resultado, variante, tamanho) -> string` — `''` se `ok`; `limite` → `Só temos ${variante.estoque[tamanho]} no tamanho ${tamanho}`; `sem-tamanho` → `Esse tamanho não está disponível.`; `esgotado` → `Esse tamanho esgotou.`; outro → `Não foi possível adicionar.`

- [ ] **Step 1: Escrever os testes que falham** em `tests/compra-rapida.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoComprar, varianteParaComprar, mensagemCarrinho } from '../js/loja/compra-rapida.js';

const v = (codigo, estoque) => ({ codigo, cor: codigo, preco: 10, campanha: false, fotos: 1, estoque });
const peca = (...variantes) => ({ id: 'p', nome: 'P', variantes });

test('modoComprar: esgotada → nenhum', () => {
  assert.equal(modoComprar(peca(v('a', { 4: 0 }))), 'nenhum');
});
test('modoComprar: uma variante com estoque → tamanhos', () => {
  assert.equal(modoComprar(peca(v('a', { 4: 2 }))), 'tamanhos');
});
test('modoComprar: duas cores, só uma com estoque → tamanhos com a que tem', () => {
  const p = peca(v('a', { 4: 0 }), v('b', { 2: 1 }));
  assert.equal(modoComprar(p), 'tamanhos');
  assert.equal(varianteParaComprar(p).codigo, 'b');
});
test('modoComprar: duas cores com estoque → espiar', () => {
  const p = peca(v('a', { 4: 1 }), v('b', { 2: 1 }));
  assert.equal(modoComprar(p), 'espiar');
  assert.equal(varianteParaComprar(p), null);
});
test('mensagemCarrinho cobre ok, limite, esgotado, sem-tamanho e desconhecido', () => {
  const x = v('a', { 4: 2 });
  assert.equal(mensagemCarrinho({ ok: true }, x, '4'), '');
  assert.equal(mensagemCarrinho({ ok: false, motivo: 'limite' }, x, '4'), 'Só temos 2 no tamanho 4');
  assert.equal(mensagemCarrinho({ ok: false, motivo: 'esgotado' }, x, '4'), 'Esse tamanho esgotou.');
  assert.equal(mensagemCarrinho({ ok: false, motivo: 'sem-tamanho' }, x, '4'), 'Esse tamanho não está disponível.');
  assert.equal(mensagemCarrinho({ ok: false, motivo: '?' }, x, '4'), 'Não foi possível adicionar.');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/compra-rapida.test.js` → FAIL (módulo não existe).
- [ ] **Step 3: Implementar** `js/loja/compra-rapida.js` com as três funções do bloco Interfaces.
- [ ] **Step 4: Trocar em `js/paginas/peca.js`** o objeto `MOTIVOS` e a montagem da mensagem no clique de `#adicionar` por `mensagem = mensagemCarrinho(r, variante, tamanho)`. Comportamento idêntico.
- [ ] **Step 5: Rodar tudo** — `npm test` → todos passam.
- [ ] **Step 6: Commit**

```bash
git add js/loja/compra-rapida.js tests/compra-rapida.test.js js/paginas/peca.js
git commit -m "feat: regras da compra rápida no cartão"
```

---

### Task 2: HTML do cartão, dos tamanhos rápidos e do Espiar

**Files:**
- Modify: `js/ui/html.js` (`htmlCartao`, `htmlGaleria`; novas `htmlBlocoPreco`, `htmlTamanhosRapidos`, `htmlEspiar`)
- Modify: `js/paginas/peca.js` (usa `htmlBlocoPreco`; apaga a função local de mesmo nome)
- Modify: `css/estilo.css` (seção "Grade e cartão")
- Test: `tests/html.test.js`, `tests/peca-pagina.test.js`

**Interfaces:**
- Consumes: `modoComprar`, `varianteParaComprar` (Task 1); `precoComCampanha`, `formatarPreco`, `TAMANHOS`, `htmlSeletorTamanho`, `htmlSeletorCor`.
- Produces:
  - `htmlCartao(peca, descontoCampanha) -> string` — mesma assinatura. Raiz `<article class="cartao[ cartao-esgotado]" data-peca="${esc(peca.id)}">`. Link para `peca.html?c=${encodeURIComponent(peca.id)}` no nome (`<h3 class="cartao-nome"><a class="cartao-link" href=...>`), esticado para cobrir o cartão via `.cartao-link::after` (o cartão inteiro continua clicável). Dentro de `.cartao-foto`, um `<div class="cartao-acoes">` com:
    - se `modoComprar(peca) !== 'nenhum'`: `<button type="button" class="cartao-botao" data-acao="comprar" aria-label="Comprar ${nome}">Comprar</button>`; com `aria-expanded="false" aria-controls="tam-${id}"` quando o modo é `'tamanhos'`, com `aria-haspopup="dialog"` quando é `'espiar'`;
    - sempre: `<button type="button" class="cartao-botao cartao-botao-claro" data-acao="espiar" aria-haspopup="dialog" aria-label="Espiar ${nome}">Espiar</button>`.
    - Quando o modo é `'tamanhos'`, também `htmlTamanhosRapidos(varianteParaComprar(peca), peca.id)` dentro de `.cartao-foto`.
    - Mantém preço, bloco de campanha, pílulas e selo de esgotado como hoje.
  - `htmlTamanhosRapidos(variante, idPeca) -> string` — `<div class="cartao-tamanhos" id="tam-${esc(idPeca)}" hidden>` com `<p>Escolha o tamanho</p>`, um `<button type="button" class="cartao-tam" data-acao="tamanho" data-codigo="${codigo}" data-tamanho="${t}">` por tamanho com estoque > 0 na ordem de `TAMANHOS`, um `<button type="button" class="cartao-tam-fechar" data-acao="fechar-tamanhos" aria-label="Fechar tamanhos">&times;</button>` e `<p class="cartao-aviso" role="status"></p>`.
  - `htmlSeletorTamanho(variante, escolhido = '') -> string` — novo 2º parâmetro: o botão do tamanho `escolhido` (se com estoque) sai com `class="tam tam-escolhido"` e `aria-pressed="true"`. Sem o parâmetro, saída idêntica à atual. Em `peca.js`, passe `tamanho` e apague o trecho que marca o botão depois de desenhar.
  - `htmlBlocoPreco(variante, desconto) -> string` — exatamente o HTML que `peca.js` monta hoje em `htmlBlocoPreco()` (preço grande + linha da campanha com link).
  - `htmlGaleria(variante, nome, idBase = 'galeria') -> string` — ids passam a ser `${idBase}-faixa` e `${idBase}-indicador`; com o padrão, saída idêntica à atual.
  - `htmlEspiar(peca, variante, { desconto, tamanho = '', quantidade = 1, mensagem = '' }) -> string` — conteúdo do diálogo: botão fechar `<button type="button" class="botao-icone espiar-fechar" data-acao="fechar-espiar" aria-label="Fechar">&times;</button>`, `htmlGaleria(variante, peca.nome, 'espiar-galeria')`, `<h2 id="espiar-nome">`, `htmlSeletorCor`, `htmlBlocoPreco`, `htmlSeletorTamanho(variante, tamanho)`, controle de quantidade com ids `espiar-menos` / `espiar-valor` / `espiar-mais` (mesmas regras de desabilitar da página da peça), `<button type="button" class="botao botao-adicionar" id="espiar-adicionar">Adicionar ao carrinho</button>` (desabilitado sem tamanho), `<p class="peca-aviso" id="espiar-aviso" role="status">` com `mensagem` ou `Escolha um tamanho`, e `<a href="peca.html?c=${encodeURIComponent(variante.codigo)}">Ver detalhes</a>` (valor também passa por `esc`).

- [ ] **Step 1: Escrever os testes que falham.** Em `tests/html.test.js` (os testes existentes de `htmlCartao` continuam valendo):

```js
test('htmlCartao: article com link para a peça e botões Comprar e Espiar com nome escapado', () => {
  const h = htmlCartao(peca({ nome: 'A<b> & "c"' }), 10);
  assert.match(h, /^<article class="cartao" data-peca="x-1">/);
  assert.match(h, /<a class="cartao-link" href="peca\.html\?c=x-1">/);
  assert.match(h, /data-acao="comprar"[^>]*aria-label="Comprar A&lt;b&gt; &amp; &quot;c&quot;"/);
  assert.match(h, /data-acao="espiar"[^>]*aria-label="Espiar A&lt;b&gt;/);
  assert.doesNotMatch(h, /<a[\s>][^>]*>(?:(?!<\/a>)[\s\S])*<button/); // nenhum botão dentro de link (<a , não <article)
});
test('htmlCartao esgotada: só Espiar, sem tamanhos rápidos', () => {
  const h = htmlCartao(peca({}, { 4: 0 }), 10);
  assert.doesNotMatch(h, /data-acao="comprar"/);
  assert.match(h, /data-acao="espiar"/);
  assert.doesNotMatch(h, /cartao-tamanhos/);
});
test('htmlCartao com uma cor: Comprar controla a lista de tamanhos com estoque', () => {
  const h = htmlCartao(peca({}, { 2: 1, 4: 0, 6: 3 }), 10);
  assert.match(h, /data-acao="comprar"[^>]*aria-expanded="false"[^>]*aria-controls="tam-x-1"/);
  const tams = [...h.matchAll(/class="cartao-tam" data-acao="tamanho" data-codigo="x-1" data-tamanho="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tams, ['2', '6']);
});
test('htmlCartao com duas cores com estoque: Comprar abre diálogo e não há lista no cartão', () => {
  const p = peca();
  p.variantes.push({ codigo: 'x-2', cor: 'Rosa', preco: 139.9, campanha: false, fotos: 1, estoque: { 2: 1 } });
  const h = htmlCartao(p, 10);
  assert.match(h, /data-acao="comprar"[^>]*aria-haspopup="dialog"/);
  assert.doesNotMatch(h, /cartao-tamanhos/);
});
test('htmlCartao com duas cores e só uma com estoque: lista de tamanhos da cor com estoque', () => {
  const p = peca({}, { 4: 0 });
  p.variantes.push({ codigo: 'x-2', cor: 'Rosa', preco: 139.9, campanha: false, fotos: 1, estoque: { 2: 1 } });
  const h = htmlCartao(p, 10);
  assert.match(h, /data-acao="comprar"[^>]*aria-expanded="false"/);
  assert.match(h, /class="cartao-tam" data-acao="tamanho" data-codigo="x-2" data-tamanho="2"/);
});
```

Em `tests/peca-pagina.test.js`:

```js
test('htmlGaleria com idBase usa ids próprios; sem idBase mantém galeria-faixa', () => {
  assert.match(htmlGaleria(safira, 'V', 'espiar-galeria'), /id="espiar-galeria-faixa"[\s\S]*id="espiar-galeria-indicador"/);
  assert.match(htmlGaleria(safira, 'V'), /id="galeria-faixa"/);
});
test('htmlSeletorTamanho com escolhido marca só ele; sem escolhido nada marcado', () => {
  const h = htmlSeletorTamanho(safira, '2');
  assert.match(h, /class="tam tam-escolhido" data-tamanho="2" aria-pressed="true"/);
  assert.match(h, /data-tamanho="4" aria-pressed="false"/);
  assert.doesNotMatch(htmlSeletorTamanho(safira), /aria-pressed="true"/);
});
test('htmlBlocoPreco: preço e campanha com link', () => {
  const h = htmlBlocoPreco(safira, 10);
  assert.match(h, /R\$ 129,90/);
  assert.match(h, /href="campanha\.html"/);
  assert.match(h, /R\$ 116,91/);
});
test('htmlEspiar: nome escapado, tamanho marcado, adicionar habilitado, link Ver detalhes', () => {
  const p = { id: 'vestido-clara', nome: 'Clara <3', variantes: [safira, cru] };
  const h = htmlEspiar(p, safira, { desconto: 10, tamanho: '2', quantidade: 1 });
  assert.match(h, /<h2 id="espiar-nome">Clara &lt;3<\/h2>/);
  assert.match(h, /data-tamanho="2"[^>]*aria-pressed="true"/);
  assert.match(h, /id="espiar-adicionar"(?![^>]*disabled)/);
  assert.match(h, /href="peca\.html\?c=vestido-clara-safira"[^>]*>Ver detalhes/);
  assert.match(h, /data-codigo="vestido-clara-cru"/); // seletor de cor presente
});
test('htmlEspiar sem tamanho: adicionar desabilitado e aviso "Escolha um tamanho"', () => {
  const h = htmlEspiar({ id: 'c', nome: 'C', variantes: [cru] }, cru, { desconto: 10 });
  assert.match(h, /id="espiar-adicionar"[^>]*disabled/);
  assert.match(h, /Escolha um tamanho/);
});
```

(Atualize os `import` dos dois arquivos com as funções novas.)

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → os testes novos falham.
- [ ] **Step 3: Implementar** as funções do bloco Interfaces em `js/ui/html.js`. Em `js/paginas/peca.js`, troque a função local `htmlBlocoPreco()` por `htmlBlocoPreco(variante, desconto)` importada (ajuste a chamada e remova imports que ficarem sem uso, como `precoComCampanha` e `formatarPreco`), e passe `tamanho` a `htmlSeletorTamanho`.
- [ ] **Step 4: CSS do cartão** em `css/estilo.css`, seção "Grade e cartão":
  - `.cartao { position: relative; }`; `.cartao-link { color: inherit; text-decoration: none; }` e `.cartao-link::after { content: ''; position: absolute; inset: 0; z-index: 1; }`.
  - `.cartao-acoes` no rodapé da foto (`position: absolute; left/right/bottom: 8px; z-index: 2; display: grid; gap: 6px`). `.cartao-botao` min-height 44px, largura total, raio 22px, fundo `var(--titulo)` texto `#fff`; `.cartao-botao-claro` fundo `var(--cartao)` texto `var(--titulo)`.
  - Desktop: `@media (hover: hover) { .cartao-acoes { opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; } .cartao:hover .cartao-acoes, .cartao:focus-within .cartao-acoes { opacity: 1; transform: none; } }`. Sem hover (celular): sempre visíveis (estado padrão).
  - `.cartao-tamanhos` cobre a foto (`position: absolute; inset: 0; z-index: 3; background: rgba(255,254,251,.96)`), grade de `.cartao-tam` (min 44×44, estilo de `.tam`), `.cartao-tam-fechar` no canto superior direito, `.cartao-aviso` em `var(--rotulo)`.
  - `.cartao-esgotado .cartao-foto img` continua com `opacity: .55`.
- [ ] **Step 5: Rodar tudo** — `npm test` → todos passam.
- [ ] **Step 6: Commit**

```bash
git add js/ui/html.js js/paginas/peca.js css/estilo.css tests/html.test.js tests/peca-pagina.test.js
git commit -m "feat: cartão com botões Comprar e Espiar e HTML do Espiar"
```

---

### Task 3: Controlador dos cartões e do Espiar, ligado nas páginas

**Files:**
- Create: `js/ui/cartoes.js`
- Modify: `js/paginas/catalogo.js`, `js/paginas/inicio.js`, `js/paginas/peca.js`
- Modify: `js/ui/layout.js` (só `export` de `FOCAVEIS`)
- Modify: `css/estilo.css` (nova seção "Espiar")

**Interfaces:**
- Consumes: `htmlEspiar`, `esc` (Task 2); `modoComprar`, `varianteParaComprar`, `mensagemCarrinho` (Task 1); `carrinho.adicionar(codigo, tamanho, qtd, catalogo)`, `abrirGaveta()` e `catalogo` devolvidos por `montarLayout`.
- Produces: `ligarCartoes(raiz: Element, { catalogo, carrinho, abrirGaveta }) -> void`.

Comportamento de `ligarCartoes` (sem teste automático: não há DOM no `node --test`; verificação no navegador no Step 4):
- Um ouvinte de `click` em `raiz` (delegação; sobrevive ao `innerHTML` das páginas). Acha a peça por `closest('[data-peca]').dataset.peca` em `catalogo.pecas`.
- `data-acao="comprar"`: se a lista já está aberta, fecha (alterna); modo `'tamanhos'` → mostra `#tam-<id>` (`hidden = false`), `aria-expanded="true"`, foco no primeiro `.cartao-tam`; modo `'espiar'` → abre o Espiar.
- `data-acao="tamanho"`: `carrinho.adicionar(codigo, tamanho, 1, catalogo)`; ok → primeiro fecha a lista (foco volta ao Comprar), depois chama `abrirGaveta()`; falha → texto de `mensagemCarrinho` em `.cartao-aviso` daquele cartão.
- `data-acao="fechar-tamanhos"` e `Esc` com foco dentro da lista → fecha, `aria-expanded="false"`, foco volta ao Comprar.
- `data-acao="espiar"` → abre o Espiar com `varianteParaComprar(peca) || peca.variantes[0]`.
- Espiar: o markup do diálogo é inserido uma vez no `body` (se `#espiar` já existe, reaproveita — `peca.js` pode chamar `ligarCartoes` e o diálogo não duplica): `<div class="fundo-espiar" id="fundo-espiar" hidden></div><div class="espiar" id="espiar" role="dialog" aria-modal="true" aria-labelledby="espiar-nome" hidden><div class="espiar-caixa" id="espiar-caixa"></div></div>`. Estado local `{ peca, variante, tamanho, quantidade, mensagem }`; cada mudança redesenha `#espiar-caixa` com `htmlEspiar` e devolve o foco ao controle clicado (mesmo padrão de `desenhar(seletorFoco)` em `peca.js`). Cor/tamanho/quantidade seguem as mesmas regras da página da peça. `#espiar-adicionar` → `carrinho.adicionar(variante.codigo, tamanho, quantidade, catalogo)`; ok → **primeiro** fecha o Espiar (remove `gaveta-aberta`, devolve o foco ao botão que abriu), **depois** chama `abrirGaveta()` — nessa ordem, senão a gaveta guarda um elemento oculto como acionador (`js/ui/layout.js:136`) e a rolagem destrava ao fechar; falha → `mensagemCarrinho`.
- O diálogo fica no `body`, fora de `raiz`: ele tem **ouvintes próprios** (`click` em `#espiar` e no fundo; `scroll` da galeria), registrados uma única vez junto com a criação do markup.
- Galeria do Espiar: indicador `#espiar-galeria-indicador` atualiza no `scroll` de `#espiar-galeria-faixa` (`i / N`, mesma conta de `peca.js`); ao redesenhar sem trocar de cor, preserva `scrollLeft` e o indicador, como `desenhar(_, true)` em `peca.js`.
- Abrir: guarda o elemento que tinha o foco, mostra fundo + diálogo, `document.body.classList.add('gaveta-aberta')` (já trava a rolagem), foco no botão fechar. Fechar (×, clique no fundo, `Esc`): esconde, remove a classe, devolve o foco. `Tab` preso dentro do diálogo (mesmo algoritmo da gaveta em `js/ui/layout.js`; exporte `FOCAVEIS` de `layout.js` e importe, sem duplicar).
- Páginas: `catalogo.js` liga em `document.getElementById('resultado')`; `inicio.js` liga em `document.getElementById('conteudo')` (depois de preencher); `peca.js` liga em `principal` (cobre o "Combina com"). Cada uma pega `carrinho` e `abrirGaveta` de `montarLayout`.
- CSS "Espiar": `.fundo-espiar` igual a `.fundo-gaveta` (z-index 40); `.espiar` fixo e centrado, z-index 41, `max-width: 880px`, `max-height: calc(100vh - 32px)`, `overflow-y: auto`, fundo `var(--cartao)`, raio `var(--raio)`; conteúdo em 2 colunas a partir de 761px (galeria | info), 1 coluna abaixo; no celular ocupa a tela inteira (`inset: 0; border-radius: 0`). `.espiar-fechar` no canto superior direito.

- [ ] **Step 1: Implementar `js/ui/cartoes.js`** conforme acima.
- [ ] **Step 2: Ligar nas três páginas** e escrever o CSS "Espiar".
- [ ] **Step 3: Rodar** — `npm test` → todos passam.
- [ ] **Step 4: Verificar no navegador** (servidor estático na raiz, ex.: `npx --yes http-server -p 8080 -c-1` ou `python -m http.server 8080`; abrir `catalogo.html`):
  - largura ≥ 961px: botões aparecem só no hover; Tab num cartão os mostra;
  - Comprar em peça de uma cor → lista de tamanhos sobre a foto; clicar num tamanho → gaveta abre com o item;
  - Comprar em peça com várias cores → abre o Espiar; trocar cor, tamanho, quantidade; Adicionar → fecha e abre a gaveta;
  - Esc fecha lista e Espiar; foco volta ao botão;
  - peça esgotada → só Espiar;
  - largura 390px: botões sempre visíveis; Espiar em tela cheia;
  - `index.html` e `peca.html?c=<código>` ("Combina com"): mesmos botões funcionando; galeria da página da peça continua com o indicador certo com o Espiar aberto;
  - console sem erros.
- [ ] **Step 5: Commit**

```bash
git add js/ui/cartoes.js js/ui/layout.js js/paginas/catalogo.js js/paginas/inicio.js js/paginas/peca.js css/estilo.css
git commit -m "feat: Comprar e Espiar funcionando nos cartões"
```
