# Busca no cabeçalho — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campo de busca centralizado no cabeçalho, com sugestões ao digitar, e filtro `busca` no catálogo.

**Architecture:** Lógica pura em `js/loja/busca.js` sobre o catálogo que `montarLayout` já carrega. HTML puro em `js/ui/html.js`. Comportamento (eventos, teclado) em `js/ui/busca.js`, chamado por `montarLayout`. O catálogo lê `busca` da URL como mais um filtro.

**Tech Stack:** HTML + JS módulos ES sem build, CSS puro, testes `node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-20-busca-no-cabecalho-design.md`

## Global Constraints

- Placeholder e `aria-label` do campo: `O que você está buscando?`
- Sugestões a partir de 2 caracteres (após `trim`), no máximo 5.
- Link final das sugestões: `Ver todos os resultados`; destino `catalogo.html?busca=<termo>` (via `URLSearchParams`).
- Busca ignora acento e maiúscula; campos: nome, categoria, coleção, cor de cada variante; todas as palavras do termo precisam aparecer (em qualquer campo).
- Peça esgotada aparece nas sugestões com o selo `esgotado`.
- Sem dependências novas. Só cores/fontes dos tokens em `css/estilo.css`. Todo texto vindo do catálogo passa por `esc`.
- Alvos de toque ≥ 44px. Foco visível já é global (`:focus-visible`).

## Review Focus

- Termo com espaços extras ou só espaços (`"  "`) → nenhuma sugestão, e `filtrarPecas` ignora a busca. Teste na Task 1.
- Termo com caractere especial de HTML/URL (`<b>`, `&`, `#`) → aparece escapado no campo e na URL é codificado. Teste nas Tasks 1 e 2.
- Busca sem resultado no catálogo → "Nenhuma peça com esses filtros" + "Limpar filtros", que limpa também a busca e o campo do cabeçalho. Teste na Task 3 (a página tem teste de página existente).
- Catálogo indisponível (`montarLayout` cai no `catch`) → o campo existe e o Enter ainda leva ao catálogo, sem erro no console. Coberto na Task 2 (ligar a busca só depois do catálogo; o `<form>` funciona sem JS).
- Peça sem foto → sugestão usa `img/logo.png`, como `htmlCartao`. Teste na Task 2.

---

### Task 1: Lógica da busca e filtro `busca`

**Files:**
- Create: `js/loja/busca.js`
- Modify: `js/loja/filtros.js` (`filtrarPecas`), `js/loja/filtros-url.js` (`lerFiltrosDaUrl`, `filtrosParaUrl`)
- Test: `tests/busca.test.js` (novo), `tests/filtros.test.js`

**Interfaces:**
- Produces:
  - `normalizar(texto: string) -> string` — minúsculas, sem acento (`normalize('NFD')` e remove `\p{M}`), espaços colapsados, `trim`.
  - `casaBusca(peca, termo: string) -> boolean` — `true` se termo normalizado vazio; senão cada palavra está em algum dos campos normalizados.
  - `sugerir(pecas, termo: string, limite = 5) -> peca[]` — `[]` se termo normalizado tiver < 2 caracteres; senão as que casam, disponíveis antes das esgotadas (use `esgotadasNoFim`), cortadas em `limite`.
  - `filtrarPecas(pecas, { ..., busca })` passa a aplicar `casaBusca`.
  - `lerFiltrosDaUrl` lê `busca` (com `trim`, omitido se vazio); `filtrosParaUrl` grava `busca` primeiro.

- [ ] **Step 1: Testes que falham** em `tests/busca.test.js`, com as peças de `tests/filtros.test.js` como modelo:
  - `normalizar('  Vestido   Maria JÚLIA ')` → `'vestido maria julia'`.
  - `casaBusca(clara, 'safira')` → `true` (cor de variante); `casaBusca(clara, 'vestidos clara')` → `true`; `casaBusca(clara, 'vestidos jeans')` → `false`; `casaBusca(clara, '   ')` → `true`.
  - `sugerir(todas, 'v')` → `[]`; `sugerir(todas, '  ')` → `[]`; `sugerir(todas, 'vest')` → `[clara, velha]` (esgotada no fim); `sugerir(sete_vestidos, 'vest').length` → `5`.
  - Em `tests/filtros.test.js`: `filtrarPecas(todas, { busca: 'jardin' })` → `[jardineira]`; `filtrarPecas(todas, { busca: ' ' })` → `todas`.
  - `lerFiltrosDaUrl('?busca=%20bata%20')` → `{ busca: 'bata', ordem: 'novidades' }`; `lerFiltrosDaUrl('?busca=')` sem chave `busca`; `filtrosParaUrl({ busca: 'a&b #', ordem: 'novidades' })` → `'?busca=a%26b+%23'`.
- [ ] **Step 2:** `npm test` → falham os novos (módulo não existe / asserções).
- [ ] **Step 3:** Implementar as interfaces acima.
- [ ] **Step 4:** `npm test` → tudo passa.
- [ ] **Step 5: Commit** `feat(busca): lógica de busca e filtro busca no catálogo`

### Task 2: Campo e sugestões no cabeçalho

**Files:**
- Modify: `js/ui/html.js` (novas funções), `js/ui/layout.js` (`htmlCabecalho`, `montarLayout`), `css/estilo.css` (bloco `/* Cabeçalho */`)
- Create: `js/ui/busca.js`
- Test: `tests/html.test.js`

**Interfaces:**
- Consumes: `sugerir` (Task 1); `urlFoto`, `esc`, `formatarPreco`, `menorPreco`, `esgotada`.
- Produces:
  - `htmlCampoBusca(termo = '') -> string` em `html.js`: `<form class="busca" role="search" action="catalogo.html" method="get">` com `<input id="busca-campo" name="busca" type="search" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="busca-sugestoes" aria-autocomplete="list" placeholder="O que você está buscando?" aria-label="O que você está buscando?" value="<termo escapado>">`, botão submit com ícone de lupa (`aria-label="Buscar"`) e `<ul id="busca-sugestoes" class="busca-sugestoes" role="listbox" hidden>`.
  - `htmlSugestoes(pecas, termo) -> string`: um `<li role="option" id="sug-<i>">` por peça com link `peca.html?c=<id>`, miniatura (foto 1 ou `img/logo.png`), nome, `formatarPreco(menorPreco)` e selo `esgotado` se esgotada; último `<li role="option" id="sug-todos">` com link `catalogo.html?busca=<termo codificado>` e texto `Ver todos os resultados`. Lista vazia → `''`.
  - `ligarBusca({ getCatalogo })` em `js/ui/busca.js`: no `input`, desenha `htmlSugestoes(sugerir(...))`, mostra/oculta a lista e atualiza `aria-expanded`; ↓/↑ movem a opção ativa (classe `ativa` + `aria-activedescendant`), Enter com opção ativa segue o link dela, Enter sem opção ativa envia o form; Esc e clique fora fecham.
  - `htmlCabecalho(pagina, termo)`: linha `marca | busca | ações`. `montarLayout` passa `lerFiltrosDaUrl(location.search).busca` quando `pagina === 'catalogo'` e chama `ligarBusca` só após o catálogo carregar.
- CSS: `.cabecalho-linha` vira grid `auto 1fr auto` com `.busca` em `max-width: 520px; justify-self: center; width: 100%`; abaixo de 768px a `.busca` ocupa linha própria (`grid-column: 1 / -1`). `.busca-sugestoes` absoluta sob o campo, `var(--cartao)`, `var(--sombra)`, `var(--raio)`, `z-index` acima do cabeçalho; `li.ativa` e `:hover` com `var(--peche)`.

- [ ] **Step 1: Testes que falham** em `tests/html.test.js`:
  - `htmlCampoBusca('<b>')` contém `value="&lt;b&gt;"`, `role="combobox"`, `action="catalogo.html"` e `name="busca"`.
  - `htmlSugestoes([peca()], 've')` contém `peca.html?c=x-1`, `Vestido Teste`, `R$` e `href="catalogo.html?busca=ve"` com `Ver todos os resultados`.
  - `htmlSugestoes([peca({}, { 4: 0 })], 've')` contém `esgotado`; peça com `fotos: 0` usa `img/logo.png`.
  - `htmlSugestoes([], 've')` → `''`; `htmlSugestoes([peca()], 'a&b')` contém `busca=a%26b`.
- [ ] **Step 2:** `npm test` → novos falham.
- [ ] **Step 3:** Implementar HTML, `ligarBusca`, mudanças no layout e CSS.
- [ ] **Step 4:** `npm test` → tudo passa. Abrir `index.html` por servidor local (`npx serve` ou `python -m http.server`) e conferir em 1280px e 375px: logo à esquerda, campo centralizado, sugestões ao digitar "ve", setas/Enter/Esc.
- [ ] **Step 5: Commit** `feat(busca): campo de busca centralizado no cabeçalho com sugestões`

### Task 3: Catálogo respeita a busca

**Files:**
- Modify: `js/paginas/catalogo.js`
- Test: `tests/catalogo-pagina.test.js`

**Interfaces:**
- Consumes: `filtros.busca` (Task 1); campo `#busca-campo` (Task 2).

- [ ] **Step 1: Teste que falha** (seguindo o estilo de `tests/catalogo-pagina.test.js`): com URL `?busca=bata`, o título fica `Resultados para “bata”` e só peças que casam aparecem; `lerFormulario` preserva `busca` ao mudar outro filtro; "Limpar filtros" remove `busca` da URL e esvazia `#busca-campo`. Se esse arquivo de teste não monta DOM, testar só a parte pura e conferir o resto no navegador (anotar no relatório).
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar: título condicional; `lerFormulario` mantém o `busca` atual da URL; `limpar` zera `busca` e o campo; `redesenhar` (popstate) sincroniza o campo.
- [ ] **Step 4:** `npm test` → tudo passa; conferir no navegador `catalogo.html?busca=vestido` + filtro de tamanho.
- [ ] **Step 5: Commit** `feat(busca): catálogo filtra e mostra o termo buscado`
