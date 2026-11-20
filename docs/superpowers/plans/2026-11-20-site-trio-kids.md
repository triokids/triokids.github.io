# Site Trio Kids — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site estático da Trio Kids (catálogo, peça, carrinho que finaliza no WhatsApp da Anne) lendo a Google Planilha, mais o formulário Apps Script de fotos.

**Architecture:** HTML/CSS/JS puros com módulos ES nativos, sem build, servidos pelo GitHub Pages. A lógica fica em módulos puros testados com `node --test` (dados, carrinho, mensagem, HTML de componentes como strings). As páginas só ligam esses módulos ao DOM. O Apps Script tem a lógica pura em `Logica.gs`, testada no Node via `vm`, e a integração (planilha, GitHub, gatilho) em `Codigo.gs`.

**Tech Stack:** HTML5, CSS, JavaScript ES2022 (módulos nativos), Node 24 (`node --test`, só para testes), Python 3 + PyMuPDF (`fitz`, só para a carga inicial), Google Apps Script (V8), GitHub REST/Git Data API.

**Spec:** `docs/superpowers/specs/2026-11-20-site-trio-kids-design.md` e `docs/ams/adr/ADR-001-usar-planilha-google-como-painel-e-apps-script-para-fotos.md` — o implementador lê os dois.

## Global Constraints

- Sem etapa de build; nenhuma dependência npm em produção. `package.json` existe só para `"type": "module"` e o script `test`.
- Bibliotecas externas: nenhuma. Fontes por Google Fonts: Comfortaa (700), EB Garamond (400, 400 itálico), Lato (400, 700).
- Todos os caminhos do site são **relativos** (funcionar em `/` e em `/<repo>/`).
- Nunca gravar senha do formulário nem token do GitHub em arquivo do repositório. Eles só existem nas Script Properties (`SENHA_FORMULARIO`, `GITHUB_TOKEN`).
- Cores: fundo `#fbf6ef`, cartão `#fffefb`, texto `#674638`, títulos `#7a4e2e`, secundário `#604431`, acentos coral `#d9795b`, verde `#719779`, mostarda `#c4932c`, azul `#6e9aa7`, rosa `#c8728c`, selo `#52745d`, rótulo `#b65b43`. Nunca preto puro.
- Tamanhos e ordem: `P, M, G, 1, 2, 3, 4, 6`.
- WhatsApp: `5562993379366`; vendedora: `Anne`; Instagram: `triokid_s`; desconto padrão da campanha: `10`.
- Preço em tela: `R$ 139,90` (formato pt-BR, duas casas).
- Textos do site em português do Brasil.
- Mensagem do WhatsApp exatamente no formato da seção 5.5 da spec, com a linha de campanha da seção 5.8.
- Testes: `npm test` (= `node --test tests/`). Cada task termina com todos os testes passando.
- Commits por caminho explícito (`git add <arquivos>`), nunca `git add .`.

## Review Focus

- **Linha da planilha incompleta** (código vazio, preço em branco, estoque com texto "dois"): a linha é ignorada ou o tamanho tratado como ausente; o resto do catálogo aparece. Teste em Task 2.
- **Texto da planilha com `<`, `&`, aspas ou emoji no nome/descrição**: aparece literal na tela (escapado) e correto na mensagem do WhatsApp (codificada). Testes em Task 6 e Task 8.
- **Carrinho salvo de visita anterior** com peça removida, inativa, tamanho esgotado, estoque menor que a quantidade ou preço mudado: cada item é marcado e a quantidade limitada; nada quebra. Teste em Task 5.
- **Planilha devolve 200 com HTML** (página de login/erro do Google) ou CSV vazio: tratado como falha e cai na reserva. Teste em Task 3.
- **Quantidade acima do estoque ou tamanho inexistente** ao adicionar: limitado ao estoque; tamanho inexistente rejeitado. Teste em Task 5.

---

## Estrutura de arquivos

```
config.js                    configuração pública (CSV, WhatsApp, Instagram, desconto)
index.html catalogo.html peca.html campanha.html tamanhos.html sobre.html
css/estilo.css               tokens, tipografia, componentes
js/dados/csv.js              parseCsv, parsePreco, formatarPreco
js/dados/catalogo.js         montarCatalogo
js/dados/carregar.js         carregarCatalogo (planilha → cache → reserva)
js/loja/campanha.js          precoComCampanha
js/loja/filtros.js           filtrarPecas, ordenarPecas, tamanhosDisponiveis
js/loja/carrinho.js          criarCarrinho, revalidarItens
js/loja/whatsapp.js          montarMensagem, linkWhatsApp
js/ui/html.js                esc, htmlTituloColorido, htmlCartao, htmlItemCarrinho...
js/ui/layout.js              monta cabeçalho, rodapé, gaveta, botão flutuante, faixa de reserva
js/paginas/*.js              um módulo por página
img/logo.png  fotos/<codigo>-N.jpg  catalogo.json
dados-iniciais/pecas.csv config.csv campanha.csv
ferramentas/carga_inicial.py
apps-script/Logica.gs Codigo.gs Formulario.html appsscript.json
tests/*.test.js
docs/guia-do-dono.md
```

## Tipos compartilhados (referência para todas as tasks)

```js
// Tabelas cruas (vindas de CSV ou de catalogo.json): string[][] com cabeçalho na linha 0.
// Tabelas = { pecas: string[][], config: string[][], campanha: string[][] }

// Variante = uma linha da aba Peças
// { codigo, cor, preco: number, campanha: boolean, fotos: number,
//   estoque: { [tamanho: string]: number } }   // chave ausente = não tem o tamanho

// Peca = variantes agrupadas por nome
// { id: string /* codigo da 1ª variante */, nome, categoria, colecao, descricao,
//   destaque: boolean, ordem: number /* índice da 1ª linha */, variantes: Variante[] }

// Catalogo = { pecas: Peca[] /* só ativas */, config: { whatsapp, descontoCampanha, avisoTopo },
//              campanha: string[] /* parágrafos */ }

// ItemCarrinho = { codigo, tamanho, quantidade }
```

---

### Task 1: Base do projeto, CSV e preço

**Files:**
- Create: `.gitignore`, `package.json`, `config.js`, `js/dados/csv.js`
- Test: `tests/csv.test.js`

**Interfaces:**
- Produces: `parseCsv(texto: string) -> string[][]`; `parsePreco(valor: string) -> number | null`; `formatarPreco(n: number) -> string`; `export const CONFIG` em `config.js` com `{ csv: { pecas, config, campanha }, reserva: 'catalogo.json', whatsapp: '5562993379366', vendedora: 'Anne', instagram: 'triokid_s', descontoCampanha: 10, chaveCache: 'triokids:catalogo', chaveCarrinho: 'triokids:carrinho' }` (URLs de CSV como string vazia com comentário "preencher após publicar a planilha").

- [ ] **Step 1:** `git init` na raiz `loja-roupa-infantil/`; `.gitignore` com `node_modules/`, `_rodadas/`, `*.local.*`; `package.json` com `{"name":"trio-kids","private":true,"type":"module","scripts":{"test":"node --test tests/"}}`.
- [ ] **Step 2: Testes que falham** em `tests/csv.test.js`:

```js
assert.deepEqual(parseCsv('a,b\n1,2'), [['a','b'],['1','2']]);
assert.deepEqual(parseCsv('n\n"Vestido, azul"'), [['n'],['Vestido, azul']]);
assert.deepEqual(parseCsv('n\n"diz ""oi"""'), [['n'],['diz "oi"']]);
assert.deepEqual(parseCsv('n\n"linha1\nlinha2"'), [['n'],['linha1\nlinha2']]);
assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [['a','b'],['1','2']]);   // CRLF e linha final vazia
assert.deepEqual(parseCsv('﻿a\n1'), [['a'],['1']]);               // BOM
assert.equal(parsePreco('139,90'), 139.9);
assert.equal(parsePreco('139.90'), 139.9);
assert.equal(parsePreco('R$ 1.139,90'), 1139.9);
assert.equal(parsePreco(''), null);
assert.equal(parsePreco('abc'), null);
assert.equal(formatarPreco(125.91), 'R$ 125,91');
assert.equal(formatarPreco(1139.9), 'R$ 1.139,90');
```

- [ ] **Step 3:** Rodar `npm test` → FAIL (módulo inexistente).
- [ ] **Step 4:** Implementar `js/dados/csv.js` (parser de estados por caractere, RFC 4180) e `config.js`.
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Step 6:** Commit `chore: base do projeto e parser de CSV`.

### Task 2: Montar o catálogo a partir das tabelas

**Files:**
- Create: `js/dados/catalogo.js`
- Test: `tests/catalogo.test.js`

**Interfaces:**
- Consumes: `parsePreco` (Task 1); `CONFIG` (Task 1).
- Produces: `TAMANHOS = ['P','M','G','1','2','3','4','6']`; `montarCatalogo(tabelas: Tabelas, padrao: { whatsapp, descontoCampanha }) -> Catalogo`.

Regras: cabeçalho da aba Peças lido por nome (ordem das colunas livre, nomes sem diferenciar maiúscula/acento); `ativo` e `campanha` e `destaque` aceitam `sim/não/s/n/true/false/x` (campanha vazio = sim; ativo vazio = sim; destaque vazio = não); estoque: célula vazia → tamanho ausente, inteiro ≥ 0 → valor, qualquer outra coisa → ausente; linha sem `codigo`, sem `nome` ou com preço inválido → ignorada; `codigo` repetido → só a primeira; agrupamento por `nome` (comparação sem espaços extras), ordem das variantes = ordem das linhas; peça só entra se alguma variante ativa. Aba Config: chave|valor → sobrepõe `descontoCampanha` (`desconto_campanha`) e `avisoTopo` (`aviso_topo`); `whatsapp` vem sempre do padrão se a célula estiver vazia. Aba Campanha: cada linha não vazia da 1ª coluna (sem cabeçalho) vira um parágrafo.

- [ ] **Step 1: Testes que falham** — tabela de exemplo com Vestido Clara (cru, safira), Conjunto Joab e linhas ruins:

```js
const cab = ['codigo','nome','cor','categoria','colecao','preco','ativo','destaque','campanha','fotos','descricao','P','M','G','1','2','3','4','6'];
// vestido-clara-cru: 1:'1',2:'1',6:'1'; vestido-clara-safira: 2:'1',4:'1',6:'0'; conjunto-joab preço '89,90'
// linha sem codigo; linha com preco ''; linha ativo 'não'; linha com '4':'dois'
const cat = montarCatalogo({pecas, config:[['chave','valor'],['desconto_campanha','15']], campanha:[['Doe uma peça'],[''],['Vale para...']]}, {whatsapp:'5562993379366', descontoCampanha:10});
assert.equal(cat.pecas.find(p=>p.nome==='Vestido Clara').variantes.length, 2);
assert.deepEqual(cat.pecas.find(p=>p.nome==='Vestido Clara').variantes[1].estoque, {'2':1,'4':1,'6':0});
assert.equal(cat.pecas.find(p=>p.nome==='Conjunto Joab').variantes[0].preco, 89.9);
assert.ok(!('4' in varianteComDois.estoque));          // 'dois' → ausente
assert.equal(cat.pecas.some(p=>p.nome==='Inativa'), false);
assert.equal(cat.config.descontoCampanha, 15);
assert.equal(cat.config.whatsapp, '5562993379366');
assert.deepEqual(cat.campanha, ['Doe uma peça','Vale para...']);
// linhas sem código e sem preço não aparecem; total de peças esperado = 3
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `montarCatalogo`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: montagem do catálogo a partir da planilha`.

### Task 3: Carregar com reserva

**Files:**
- Create: `js/dados/carregar.js`
- Test: `tests/carregar.test.js`

**Interfaces:**
- Consumes: `parseCsv` (Task 1), `montarCatalogo` (Task 2), `CONFIG`.
- Produces: `carregarCatalogo(config, { buscar = fetch, armazenamento = localStorage } = {}) -> Promise<{ catalogo: Catalogo, origem: 'planilha' | 'cache' | 'reserva' }>`.

Regras: busca as três abas em paralelo; resposta é inválida se `!ok`, se o texto começa (após espaços) com `<`, ou se a aba Peças tem menos de 2 linhas ou não tem coluna `codigo`. Válida → monta, grava `{tabelas, salvoEm}` em `chaveCache` (try/catch) e retorna `planilha`. Inválida ou exceção → lê cache (try/catch) → `cache`; sem cache → busca `config.reserva` (JSON `{ geradoEm, pecas, config, campanha }`) → `reserva`. Tudo falhou → lança `Error('catalogo-indisponivel')`. URLs de CSV vazias contam como falha.

- [ ] **Step 1: Testes que falham** com `buscar` e `armazenamento` falsos:
  - planilha ok → `origem === 'planilha'` e cache gravado;
  - planilha devolve `'<!DOCTYPE html>…'` com status 200 e há cache → `origem === 'cache'`;
  - planilha CSV vazio, sem cache, reserva ok → `origem === 'reserva'`;
  - `armazenamento.getItem` lança → ainda chega à reserva;
  - tudo falha → rejeita com `catalogo-indisponivel`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: carregamento do catálogo com cache e reserva`.

### Task 4: Campanha, filtros e ordenação

**Files:**
- Create: `js/loja/campanha.js`, `js/loja/filtros.js`
- Test: `tests/filtros.test.js`

**Interfaces:**
- Consumes: `Peca`, `TAMANHOS` (Task 2).
- Produces: `precoComCampanha(preco: number, pct: number) -> number` (arredonda a centavos); `menorPreco(peca) -> number`; `tamanhosDisponiveis(peca) -> string[]` (tamanhos com estoque > 0 em qualquer variante, na ordem de `TAMANHOS`); `esgotada(peca) -> boolean`; `filtrarPecas(pecas, { categoria?, tamanho?, precoMin?, precoMax? }) -> Peca[]`; `ordenarPecas(pecas, 'novidades' | 'menor-preco' | 'maior-preco') -> Peca[]` (novidades = `ordem` decrescente); `destaques(pecas) -> Peca[]` (até 8 com `destaque`, na ordem da planilha; se nenhuma, as 8 mais novas).

- [ ] **Step 1: Testes que falham:**

```js
assert.equal(precoComCampanha(139.9, 10), 125.91);
assert.equal(precoComCampanha(45.5, 10), 40.95);
assert.equal(precoComCampanha(129.9, 10), 116.91);
assert.deepEqual(tamanhosDisponiveis(clara), ['1','2','4','6']);  // 6 vem da cor Cru
// filtro tamanho '3' devolve só a Jardineira; esgotada() true quando todo estoque é 0
// ordenarPecas 'novidades' devolve a última linha primeiro; destaques sem marcadas devolve até 8 mais novas
```

- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat: campanha, filtros e ordenação`.

### Task 5: Carrinho

**Files:**
- Create: `js/loja/carrinho.js`
- Test: `tests/carrinho.test.js`

**Interfaces:**
- Consumes: `Catalogo`, `Variante`.
- Produces:
  - `criarCarrinho(armazenamento, chave) -> { itens(): ItemCarrinho[], adicionar(codigo, tamanho, qtd, catalogo) -> {ok:boolean, motivo?: 'sem-tamanho'|'esgotado'|'limite'}, alterar(codigo, tamanho, qtd, catalogo), remover(codigo, tamanho), limpar(), aoMudar(fn) }` — persiste em JSON a cada mudança (try/catch; sem armazenamento funciona só em memória).
  - `revalidarItens(itens, catalogo) -> Array<ItemCarrinho & { variante?, peca?, situacao: 'ok'|'removida'|'esgotado'|'reduzido', precoUnit?: number }>` — `reduzido` limita a quantidade ao estoque.
  - `encontrarVariante(catalogo, codigo) -> { peca, variante } | null`.

- [ ] **Step 1: Testes que falham:**
  - adicionar 1x tamanho 4 → `ok`; adicionar o mesmo de novo soma; passar do estoque → `{ok:false, motivo:'limite'}` e quantidade fica no estoque;
  - tamanho inexistente → `sem-tamanho`; tamanho com 0 → `esgotado`;
  - carrinho salvo com código que sumiu → `removida`; estoque caiu de 2 para 1 com qtd 2 → `reduzido` e quantidade 1; estoque 0 → `esgotado`; preço vem sempre do catálogo atual;
  - JSON corrompido no armazenamento → carrinho vazio, sem exceção.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat: carrinho com persistência e revalidação`.

### Task 6: Mensagem do WhatsApp

**Files:**
- Create: `js/loja/whatsapp.js`
- Test: `tests/whatsapp.test.js`

**Interfaces:**
- Consumes: `revalidarItens` (Task 5), `formatarPreco` (Task 1), `precoComCampanha` (Task 4).
- Produces: `montarMensagem({ vendedora, itens /* revalidados, só situacao ok|reduzido */, nome, cidade, querCampanha, descontoCampanha }) -> string`; `linkWhatsApp(numero: string, mensagem: string) -> string` (`https://wa.me/<numero>?text=<encodeURIComponent>`); `podeFinalizar({ itens, nome, cidade }) -> boolean` (nome e cidade com texto após trim, ao menos um item válido).

Formato exato (cor entre parênteses só quando a variante tem cor; subtotal entre parênteses só quando qtd > 1):

```
Olá, Anne! Quero fazer este pedido:

• Vestido Maria Júlia – Tam 4 – 1x – R$ 139,90
• Vestido Clara (Safira) – Tam 2 – 2x – R$ 129,90 (R$ 259,80)

Total: R$ 399,70
Quero participar da Trio Kids Abraça (doação de peça).
Total com a campanha, se a doação for confirmada: R$ 359,73

Nome: Maria
Cidade/bairro: Goiânia – Setor Bueno
```

As duas linhas de campanha só aparecem com `querCampanha`; o total com campanha soma `precoComCampanha` só dos itens com `variante.campanha`, mais o preço cheio dos demais.

- [ ] **Step 1: Testes que falham:** igualdade exata com o exemplo acima; sem campanha não tem as duas linhas; peça com nome `Body "Ursinho" & cia <3` aparece literal na mensagem e `linkWhatsApp` decodifica de volta igual (`decodeURIComponent(new URL(link).searchParams.get('text'))`); `podeFinalizar` false com nome só de espaços.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat: mensagem do pedido para o WhatsApp`.

### Task 7: Carga inicial a partir do PDF

**Files:**
- Create: `ferramentas/carga_inicial.py`, `dados-iniciais/pecas.csv`, `dados-iniciais/config.csv`, `dados-iniciais/campanha.csv`, `catalogo.json`, `img/logo.png`, `fotos/*.jpg`
- Test: `tests/dados-iniciais.test.js`

**Interfaces:**
- Consumes: formato de colunas da Task 2; formato de `catalogo.json` da Task 3.
- Produces: arquivos acima. `catalogo.json` = `{ geradoEm, pecas, config, campanha }` com as mesmas tabelas dos CSVs.

Fonte: `../Catalogo_Trio_Kids_Linha_Petit_Tabela_Divertida.pdf` (caminho passado como argumento). Dados fixos (não reextrair texto; o script escreve esta tabela):

| codigo | nome | cor | categoria | preco | estoque | páginas de foto |
|---|---|---|---|---|---|---|
| vestido-maria-julia | Vestido Maria Júlia | | Vestido | 139,90 | 2:1 4:1 6:1 | 2 |
| bata-anthony | Bata Anthony | | Bata | 59,90 | 2:1 4:1 | 3 |
| vestido-ester | Vestido Ester | | Vestido | 139,90 | 2:1 4:1 6:1 | 4 |
| conjunto-joab | Conjunto Joab | | Conjunto | 89,90 | 2:1 4:1 6:1 | 5 |
| vestido-clara-cru | Vestido Clara | Cru | Vestido | 129,90 | 1:1 2:1 6:1 | 6 |
| vestido-clara-safira | Vestido Clara | Safira | Vestido | 129,90 | 2:1 4:1 6:1 | 6 |
| conjunto-joao-gabriel | Conjunto João Gabriel | | Conjunto | 75,90 | 2:2 6:2 | 7 |
| conjunto-flor | Conjunto Flor | | Conjunto | 88,90 | 1:1 4:1 6:1 | 8 |
| conjunto-happy-arthur | Conjunto Happy Arthur | | Conjunto | 95,90 | 2:1 4:1 6:2 | 9, 10 |
| conjunto-helena | Conjunto Helena | | Conjunto | 88,90 | 2:1 4:1 6:1 | 11 |
| conjunto-doguinho | Conjunto Doguinho | | Conjunto | 109,90 | 2:1 4:2 6:2 | 12 |
| jardineira-antonella | Jardineira Antonella | | Jardineira | 119,90 | 2:2 3:1 | 13, 14 |
| shorts-linho-castanho | Shorts Linho Castanho | | Shorts | 45,90 | 6:2 | 15 |
| camisa-arthur | Camisa Arthur | | Camisa | 49,90 | 2:2 4:2 6:2 | 16 |
| short-moletinho | Short Moletinho | | Shorts | 45,50 | 2:2 4:2 | 17 |

Todas: coleção `Linha Petit`, ativo `sim`, campanha `sim`, destaque `sim` nas 8 primeiras, descrição vazia. Tamanhos não listados ficam vazios. Fotos: imagens embutidas das páginas indicadas com lado maior ≥ 500 px, em ordem de aparição, salvas como `fotos/<codigo>-N.jpg` reduzidas a 1600 px no lado maior, JPEG qualidade 80; a página 6 alimenta as duas cores do Vestido Clara; coluna `fotos` = quantidade salva. Logo: a imagem da página 1 que contém o cabide (a que fica no topo; menor que 500 px de largura), salva em `img/logo.png` — conferir visualmente. Config: `whatsapp,5562993379366`; `desconto_campanha,10`; `aviso_topo,` vazio. Campanha: 3 parágrafos provisórios marcados "[texto provisório — a Anne substitui na planilha]" descrevendo: doe uma peça infantil em bom estado; ganha 10% nas peças participantes; a entrega da doação é combinada pelo WhatsApp.

- [ ] **Step 1: Teste que falha** em `tests/dados-iniciais.test.js`: lê `catalogo.json`, passa por `montarCatalogo` e confere 14 peças, Vestido Clara com 2 variantes, Jardineira com `{'2':2,'3':1}`, todo `fotos/<codigo>-1.jpg` de variante com `fotos ≥ 1` existe em disco, `whatsapp === '5562993379366'`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Escrever `ferramentas/carga_inicial.py` (argumentos: caminho do PDF; saída na raiz do projeto) e rodar `python ferramentas/carga_inicial.py "../Catalogo_Trio_Kids_Linha_Petit_Tabela_Divertida.pdf"`.
- [ ] **Step 4:** `npm test` → PASS; abrir 3 fotos e o logo e confirmar que são as peças certas.
- [ ] **Step 5:** Commit dos arquivos gerados e do script `feat: carga inicial da Linha Petit`.

### Task 8: Identidade visual, layout comum e página inicial

**Files:**
- Create: `css/estilo.css`, `js/ui/html.js`, `js/ui/layout.js`, `js/paginas/inicio.js`, `index.html`
- Test: `tests/html.test.js`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces (em `js/ui/html.js`, todas puras, retornam string):
  - `esc(texto) -> string` (escapa `& < > " '`);
  - `htmlTituloColorido(texto) -> string` (cada letra não-espaço num `<span>` com classe `c1`…`c5` em ciclo; espaços preservados; `aria-label` com o texto inteiro);
  - `htmlPontinhos() -> string`;
  - `htmlCartao(peca, descontoCampanha) -> string` (link `peca.html?c=<id>`, primeira foto da primeira variante ou marcador com logo, nome, preço ou "a partir de", preço com a campanha quando alguma variante participa, pílulas de `tamanhosDisponiveis`, selo "esgotado");
  - `htmlItemCarrinho(itemRevalidado) -> string`;
  - `htmlFaixaReserva() -> string`.
- Produces (em `js/ui/layout.js`): `montarLayout({ pagina: string }) -> Promise<{ catalogo, carrinho, origem }>` — injeta cabeçalho (logo, nome, link Instagram, ícone do carrinho com contador), menu (Início, Catálogo, Trio Kids Abraça, Guia de tamanhos, Sobre), rodapé (frase de marca, Instagram, faixa de 5 cores), botão flutuante do WhatsApp (sem texto pré-preenchido), faixa de reserva quando `origem !== 'planilha'`, `aviso_topo` quando houver, e a gaveta do carrinho (lista revalidada, campos nome e cidade, caixa da campanha com link para `campanha.html`, botão "Finalizar pelo WhatsApp" desabilitado até `podeFinalizar`). Se `carregarCatalogo` rejeitar, mostra "Não conseguimos carregar o catálogo agora. Fale com a Anne no WhatsApp." com o botão.

CSS: tokens em `:root` com as cores das Global Constraints; cartões `border-radius: 18px`; bloco de preço pêssego `#fde3d6`; bloco campanha menta `#e1efe5`; pílulas de tamanho; tamanho esgotado riscado; layout primeiro para celular (grade de 2 colunas em ≤ 600 px, 3 até 960 px, 4 acima); foco visível; contraste AA para texto corrido; `<meta property="og:*">` genéricos com logo e nome da loja em todas as páginas.

Início (`index.html` + `inicio.js`): logo e "Pequenos looks, grandes histórias."; banner Linha Petit ("Do minimalista ao divertido"); faixa Trio Kids Abraça com link; atalhos de categoria (`catalogo.html?categoria=Vestido`…) e de tamanho (`catalogo.html?tamanho=4`); grade de `destaques`.

- [ ] **Step 1: Testes que falham:** `esc('<b>"&\'')` → `'&lt;b&gt;&quot;&amp;&#39;'`; `htmlCartao` de peça com nome `Body <script>` não contém `<script>`; `htmlCartao` de peça esgotada contém `esgotado`; cartão de peça com campanha contém `R$ 125,91` para 139,90; `htmlTituloColorido('Ab c')` tem 3 spans e um espaço.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Verificação manual: `python -m http.server 8080` na raiz, abrir `http://localhost:8080/` em largura 390 px e 1280 px; com URLs de CSV vazias a página deve mostrar a faixa de reserva e os destaques do `catalogo.json`. Tirar print das duas larguras e anexar ao relatório.
- [ ] **Step 6:** Commit `feat: identidade visual, layout comum e página inicial`.

### Task 9: Página de catálogo

**Files:**
- Create: `catalogo.html`, `js/paginas/catalogo.js`; Modify: `js/ui/html.js` (função `htmlFiltros`)
- Test: `tests/catalogo-pagina.test.js`

**Interfaces:**
- Consumes: `montarLayout` (Task 8), `filtrarPecas`, `ordenarPecas` (Task 4), `htmlCartao` (Task 8).
- Produces: `lerFiltrosDaUrl(search: string) -> { categoria?, tamanho?, precoMin?, precoMax?, ordem }` e `filtrosParaUrl(filtros) -> string` em `js/paginas/catalogo.js` (exportadas para teste); `htmlFiltros(categorias, filtros) -> string`.

Comportamento: filtros (categoria, tamanho, faixa de preço) e ordenação refletidos na URL (link compartilhável, voltar do navegador funciona); contador "N peças"; estado vazio "Nenhuma peça com esses filtros" com botão limpar; peças esgotadas vão para o fim da lista.

- [ ] **Step 1: Testes que falham:** `lerFiltrosDaUrl('?categoria=Vestido&tamanho=4')` → `{categoria:'Vestido', tamanho:'4', ordem:'novidades'}`; ida e volta `lerFiltrosDaUrl(filtrosParaUrl(f))` preserva `f`; parâmetro desconhecido ignorado; `precoMin=abc` ignorado.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Verificação manual em 390 px: filtrar por tamanho 3 mostra só a Jardineira Antonella.
- [ ] **Step 6:** Commit `feat: página de catálogo com filtros`.

### Task 10: Página da peça

**Files:**
- Create: `peca.html`, `js/paginas/peca.js`; Modify: `js/ui/html.js` (funções `htmlGaleria`, `htmlSeletorTamanho`, `htmlSeletorCor`)
- Test: `tests/peca-pagina.test.js`

**Interfaces:**
- Consumes: `montarLayout`, `encontrarVariante`, `carrinho.adicionar`, `precoComCampanha`, `htmlCartao`.
- Produces: `htmlSeletorTamanho(variante) -> string` (botão por tamanho existente na ordem de `TAMANHOS`; estoque 0 → `disabled` + classe riscado; estoque 1 → "última unidade"); `htmlSeletorCor(peca, codigoAtual) -> string` (só se > 1 variante); `htmlGaleria(variante, nome) -> string` (fotos `fotos/<codigo>-1..N.jpg`, rolagem horizontal com `scroll-snap`, indicador de posição, `alt` com nome e cor; sem fotos → marcador com logo).

Comportamento: lê `?c=<codigo>`; código inexistente → mensagem "Peça não encontrada" com link ao catálogo; troca de cor faz `history.replaceState` para o código da cor e redesenha galeria e tamanhos; quantidade de 1 até o estoque do tamanho; "Adicionar ao carrinho" desabilitado sem tamanho escolhido; ao adicionar, abre a gaveta; mostra motivo de recusa (`limite`: "Só temos N no tamanho X"); bloco de preço pêssego e bloco "com a Trio Kids Abraça" (link para `campanha.html`) quando a variante participa; link "Qual tamanho escolher?" para `tamanhos.html`; "Combina com": até 4 outras peças da mesma coleção, não esgotadas.

- [ ] **Step 1: Testes que falham:** seletor de tamanho da variante safira tem botões 2, 4, 6 nessa ordem, 6 `disabled`; variante com estoque 1 mostra "última unidade"; `htmlSeletorCor` de peça com 1 variante devolve `''`; galeria com `fotos: 0` contém o marcador.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Verificação manual: Vestido Clara, trocar para Safira, escolher 2, adicionar, finalizar com nome e cidade; conferir que o link aberto tem a mensagem do formato da Task 6.
- [ ] **Step 6:** Commit `feat: página da peça`.

### Task 11: Páginas Trio Kids Abraça, Guia de tamanhos e Sobre

**Files:**
- Create: `campanha.html`, `tamanhos.html`, `sobre.html`, `js/paginas/campanha.js`, `js/paginas/estatica.js`
- Test: `tests/campanha-pagina.test.js`

**Interfaces:**
- Consumes: `montarLayout`, `Catalogo.campanha`, `Catalogo.config.descontoCampanha`, `esc`.
- Produces: `htmlCampanha(paragrafos: string[], desconto: number) -> string`.

Campanha: título colorido "Trio Kids Abraça", "DOE • CUIDE • COMPARTILHE", selo "{desconto}% de desconto", parágrafos da aba Campanha (escapados; linha começando com `- ` vira item de lista), chamada para o catálogo. Sem parágrafos → "As regras da campanha estão sendo atualizadas. Fale com a Anne no WhatsApp." Guia: tabela da seção 5.2 da spec, com rolagem horizontal no celular, e "Dica com carinho: compare a estatura da criança com a tabela." Sobre: "Três histórias, um amor que veste infância." + texto curto "Moda infantil com delicadeza, conforto e personalidade." (do PDF, pág. 18) + Instagram.

- [ ] **Step 1: Testes que falham:** `htmlCampanha(['Doe uma peça','- item <a>'], 10)` contém `10% de desconto`, `<li>item &lt;a&gt;</li>`; lista vazia → mensagem de atualização.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Verificação manual das três páginas em 390 px (tabela do guia rola sem quebrar a página).
- [ ] **Step 6:** Commit `feat: páginas da campanha, guia de tamanhos e sobre`.

### Task 12: Apps Script — lógica pura

**Files:**
- Create: `apps-script/Logica.gs`
- Test: `tests/apps-script-logica.test.js` (carrega o `.gs` com `vm.runInNewContext` e lê as funções do contexto)

**Interfaces:**
- Produces (funções globais, sem `import`/`export`, compatíveis com Apps Script V8):
  - `proximosNomesFotos(codigo, fotosAtuais, quantidade, trocar) -> { criar: string[], apagar: string[] }` — acrescentar: `fotos/<codigo>-(atual+1..)`; trocar: cria de `-1` e apaga os excedentes `-(n+1)..-(atual)`;
  - `validarEnvio({ senhaInformada, senhaCerta, codigo, codigosValidos, arquivos: [{ tipo, base64 }] }) -> { ok, erro?: 'senha' | 'codigo' | 'sem-arquivo' | 'tipo' | 'grande' }` — tipo deve começar com `image/jpeg`; base64 > 2.000.000 caracteres → `grande`; no máximo 8 arquivos;
  - `registrarErroSenha(contagem: number) -> { contagem, bloqueado: boolean }` — bloqueia em 5;
  - `tabelasParaReserva(pecas, config, campanha, agoraIso) -> string` (JSON do `catalogo.json`, chaves `geradoEm, pecas, config, campanha`);
  - `mesmoConteudoReserva(jsonA, jsonB) -> boolean` (ignora `geradoEm`).

- [ ] **Step 1: Testes que falham:** `proximosNomesFotos('conjunto-joab', 2, 3, false).criar` → `['fotos/conjunto-joab-3.jpg','fotos/conjunto-joab-4.jpg','fotos/conjunto-joab-5.jpg']`; trocar com atual 4 e 2 novas → criar `-1,-2`, apagar `-3,-4`; senha errada → `senha`; código fora da lista → `codigo`; `image/png` → `tipo`; quarta tentativa errada não bloqueia, quinta bloqueia; `mesmoConteudoReserva` true quando só `geradoEm` difere.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat: lógica pura do formulário de fotos`.

### Task 13: Apps Script — formulário, GitHub e reserva

**Files:**
- Create: `apps-script/Codigo.gs`, `apps-script/Formulario.html`, `apps-script/appsscript.json`
- Test: verificação manual descrita abaixo (integração com Google e GitHub não roda no Node).

**Interfaces:**
- Consumes: funções da Task 12.
- Produces (globais): `doGet()`; `listarPecas() -> [{ codigo, rotulo /* nome + cor */ }]`; `enviarFotos({ senha, codigo, trocar, arquivos }) -> { ok, mensagem }`; `gerarReserva()`; `instalarGatilhoDiario()`.

Regras: Script Properties obrigatórias `SENHA_FORMULARIO`, `GITHUB_TOKEN`, `GITHUB_DONO`, `GITHUB_REPO`, `GITHUB_BRANCH` (padrão `main`), `PLANILHA_ID`, `EMAIL_DONO`; ausente → mensagem clara na tela e nada é enviado. Contagem de erros de senha no `CacheService` por 1 hora. Commit único por envio pela Git Data API (ref → commit base → blobs → tree com criações e `sha: null` para apagar → commit "Fotos: <codigo>" → atualizar ref). Depois do commit: atualizar a coluna `fotos` da linha do código na planilha e chamar `gerarReserva()`. `gerarReserva()` lê as abas Peças, Config e Campanha, monta com `tabelasParaReserva` e só grava `catalogo.json` se `!mesmoConteudoReserva` com o atual (PUT na Contents API). Gatilho diário 6h chama `gerarReserva`; qualquer exceção em `enviarFotos` ou `gerarReserva` envia e-mail para `EMAIL_DONO` com o erro e devolve `{ ok:false, mensagem:'Não consegui enviar. Avise o dono.' }`. `Formulario.html`: identidade da loja (fontes, cores, logo por URL do site), seleção da peça numa lista vinda de `listarPecas`, campo de fotos (`accept="image/*"`, `multiple`, câmera ou galeria), caixa "trocar todas as fotos desta peça", senha, botão enviar; reduz cada foto em canvas para no máximo 1600 px no lado maior, JPEG 0,8, antes de enviar; mostra progresso e o resultado ("Enviado! Aparece no site em alguns minutos."). `appsscript.json`: `timeZone` `America/Sao_Paulo`, `runtimeVersion` `V8`, `webapp` `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`, escopos de planilha, `script.external_request`, `script.send_mail`, `script.scriptapp`.

- [ ] **Step 1:** Implementar os três arquivos.
- [ ] **Step 2:** Verificação estática: `node --check` não se aplica a `.gs`; rodar `node -e "new Function(require('fs').readFileSync('apps-script/Codigo.gs','utf8'))"` para garantir sintaxe válida, e `npm test` (Task 12 continua passando).
- [ ] **Step 3:** Escrever no relatório o roteiro do **teste de 2 horas** (ADR-001, item 5) para o dono executar quando a conta do GitHub existir: publicar, enviar uma foto de 3–5 MB tirada na hora pelo celular da Anne, medir o tempo até aparecer, conferir commit único, `catalogo.json` atualizado, e cronometrar a mudança de estoque de 3 peças na planilha pelo celular.
- [ ] **Step 4:** Commit `feat: formulário de fotos em Apps Script`.

### Task 14: Guia do dono e modelo da planilha

**Files:**
- Create: `docs/guia-do-dono.md`, `dados-iniciais/LEIA-ME.txt`

Conteúdo do guia (passo a passo para leigo, com o que clicar): (1) criar a conta do GitHub da loja e o repositório; enviar os arquivos; ativar o Pages (branch `main`, pasta raiz); (2) criar a Google Planilha na conta do dono com as abas Peças, Config, Campanha e LEIA-ME, importar os três CSVs de `dados-iniciais/`; validações (preço número, estoque inteiro ≥ 0, `ativo`/`destaque`/`campanha` lista sim/não), congelar `codigo`, proteger cabeçalho; (3) publicar cada aba como CSV (Arquivo → Compartilhar → Publicar na Web) e colar os três endereços em `config.js`; (4) compartilhar a planilha com a conta Google da Anne como editora; (5) criar o token fine-grained (só este repositório, só Contents: leitura e escrita; sem expiração se a conta permitir, senão lembrete na agenda para 1 ano); (6) criar o projeto Apps Script, colar os três arquivos, preencher as Script Properties (a senha do formulário é digitada **só** ali), implantar como aplicativo da web, rodar `instalarGatilhoDiario` uma vez; (7) colocar o atalho do formulário na tela inicial do celular da Anne; (8) roteiro do teste de 2 horas; (9) o que fazer se der erro (e-mail de falha, contingência de subir foto pelo GitHub). `LEIA-ME.txt`: as regras da planilha para a Anne (vazio = não tem o tamanho, 0 = esgotado, a última linha é a novidade, não apagar a coluna `codigo`, tempo de até 10 min para aparecer).

- [ ] **Step 1:** Escrever os dois arquivos.
- [ ] **Step 2:** Conferir que nenhum arquivo do repositório contém a senha do formulário: `git grep -n -i "senha" -- . ':!docs/' ':!apps-script/' ':!tests/'` não deve trazer valor literal de senha.
- [ ] **Step 3:** Commit `docs: guia do dono e LEIA-ME da planilha`.
