# Área da Anne — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o formulário de fotos por uma área de administração no celular (entrar, minhas peças, editar peça, nova peça) que grava tudo na aba Peças da planilha.

**Architecture:** Mesmo projeto Apps Script. Lógica pura nova em `apps-script/Logica.gs` (testada no Node com `vm`, como hoje). Funções de servidor em `apps-script/Codigo.gs`, testadas no Node com dublês dos serviços Google. Página única `apps-script/Area.html` (HTML + CSS + JS sem dependências) no lugar de `Formulario.html`.

**Tech Stack:** Google Apps Script V8, HtmlService, `google.script.run`, Node `node:test` + `node:vm`.

**Spec:** `docs/superpowers/specs/2026-11-20-area-da-anne-design.md` · ADR: `docs/ams/adr/ADR-002-usar-area-da-anne-no-apps-script-com-planilha-como-banco.md` (leia os dois e o ADR-001).

## Global Constraints

- Custo zero; nenhuma dependência nova (nem no Apps Script, nem no Node).
- Site público (`*.html` da raiz, `js/`, `css/`) **não muda**.
- Senha só em `SENHA_FORMULARIO` (Script Properties). Nada de senha, token ou e-mail no repositório.
- Senha pedida **toda vez** que a página abre; passe só em variável JS, **nunca** em `localStorage`/`sessionStorage`/cookie. Validade do passe: 8 horas (`28800000` ms).
- 5 senhas erradas = bloqueio de 1 hora (já existe: `MAX_ERROS_SENHA`, `CHAVE_ERROS_SENHA`, CacheService 3600 s).
- Grava só colunas conhecidas da aba `Peças`, linha achada pelo `codigo`, sob `LockService.getScriptLock()`. Peça nova na última linha. Nunca muda `codigo` existente. Não apaga peça.
- Colunas da aba Peças: `codigo,nome,cor,categoria,colecao,preco,ativo,destaque,campanha,fotos,descricao,P,M,G,1,2,3,4,6`. Cabeçalho comparado sem acento e em minúsculas (`normalizar_`), então `P` → `p`.
- Booleanos gravados como `sim` / `nao`. Preço gravado como número. Estoque: inteiro ≥ 0 ou vazio (= não tem o tamanho).
- Texto que começa com `=`, `+`, `-` ou `@` gravado com `'` na frente.
- Código: minúsculas, sem acento, palavras com hífen, de `nome` + `cor`; repetido ganha `-2`, `-3`…; máximo 60 caracteres.
- Identidade visual: cores e fontes de `apps-script/Formulario.html` atual (`--fundo #fbf6ef`, `--cartao #fffefb`, `--texto #674638`, `--titulo #7a4e2e`, `--coral #d9795b`, `--verde #719779`, `--selo #52745d`, `--rotulo #b65b43`; Comfortaa/EB Garamond/Lato).
- Português do Brasil em toda mensagem; preço exibido `R$ 139,90`.
- Testes: `npm test` (= `node --test`). Cada task termina com todos passando.

## Review Focus

- Duas gravações quase juntas, ou o dono inserindo linha na planilha enquanto a Anne edita → a linha é achada pelo `codigo` dentro da trava, nunca por índice guardado no navegador (teste na Task 2).
- Anne digita nome/descrição começando com `=` ou `-` → vira texto, não fórmula (teste na Task 1).
- Preço digitado `R$ 139,90`, `139,9`, `139.90` ou ` 139,90 ` → aceito como 139.9; `abc`, `0`, `-5` → recusado com mensagem (teste na Task 1).
- Página aberta há mais de 8 horas, ou passe adulterado → servidor recusa com `sair: true` e a página volta para a tela de senha (testes nas Tasks 1 e 2).
- Peça que o dono apagou da planilha enquanto a Anne edita → mensagem "Não achei essa peça. Atualize a lista.", nada gravado (teste na Task 2).

---

### Task 1: Lógica pura da Área em `Logica.gs`

**Files:**
- Modify: `apps-script/Logica.gs`
- Test: `tests/apps-script-logica.test.js` (acrescentar; manter os testes existentes passando, ajustando só os de `validarEnvio`)

**Interfaces:**
- Consumes: nada novo.
- Produces (funções globais, ES5, compatíveis com Apps Script V8 — sem `import`/`export`):
  - `var TAMANHOS_PLANILHA = ['P','M','G','1','2','3','4','6'];`
  - `var VALIDADE_PASSE_MS = 28800000;`
  - `slug(texto: string) -> string`
  - `gerarCodigo(nome: string, cor: string, existentes: string[]) -> string`
  - `textoSeguro(valor: any) -> string`
  - `lerPreco(texto: string|number) -> number|null` (aceita `R$`, espaços, vírgula ou ponto decimal, 1–2 casas; recusa ≤ 0)
  - `validarCamposPeca(campos: object, nova: boolean) -> {ok: true, valores: object} | {ok: false, mensagem: string}`
  - `linhaNovaPeca(cabecalhoNormalizado: string[], valores: object) -> any[]`
  - `pecasParaArea(tabela: string[][]) -> object[]`
  - `criarPasse(agoraMs: number, assinar: (texto) => string) -> string`
  - `passeValido(passe: string, agoraMs: number, assinar: (texto) => string) -> boolean`
  - `planoApagarFoto(codigo: string, total: number, n: number) -> {mover: {de, para}[], apagar: string} | null`
  - `validarEnvio(e)`: troca `senhaInformada`/`senhaCerta` por `autorizado: boolean`; erro `'senha'` quando `!e.autorizado`. Resto igual.

Formato de `campos` (vindo da página): `{ nome, cor, categoria, colecao, descricao, preco, ativo, destaque, campanha, estoque: { P: '' | número, M, G, '1','2','3','4','6' } }`.
Formato de `valores` (saída de `validarCamposPeca`): chaves = cabeçalho normalizado (`nome, cor, categoria, colecao, descricao, preco, ativo, destaque, campanha, p, m, g, 1, 2, 3, 4, 6`); `preco` número; booleanos `'sim'`/`'nao'`; estoque `''` ou inteiro; textos já passados por `textoSeguro`. Com `nova = false`, `nome` e `cor` são ignorados (não entram em `valores`). Com `nova = true`, `nome` obrigatório.
Regras de `validarCamposPeca`: `nome` 1–80 caracteres; `cor`, `categoria`, `colecao` até 60; `categoria` obrigatória; `descricao` até 1000; estoque inteiro 0–999 ou vazio; mensagens: `'Escreva o nome da peça.'`, `'Escolha ou escreva a categoria.'`, `'Preço inválido. Use só números, ex.: 139,90.'`, `'Estoque do tamanho X precisa ser um número de 0 a 999.'`, `'Texto grande demais em <campo>.'`.
Formato de cada item de `pecasParaArea` (tabela = `getDisplayValues()` com cabeçalho na linha 0; pula linha sem código): `{ codigo, nome, cor, categoria, colecao, descricao, preco: number|null, ativo: bool (vazio = true), destaque: bool (vazio = false), campanha: bool (vazio = true), fotos: int (inválido = 0), estoque: { P: ''|int, ... } }`. `sim/s/true/x` = true, `nao/não/n/false` = false.
Passe: `validade + '.' + assinar(String(validade))`, com `validade = agoraMs + VALIDADE_PASSE_MS`. `passeValido` recusa passe vazio, mal formado, vencido (`validade <= agoraMs`) ou de assinatura diferente (comparar sem curto-circuito, caractere a caractere).

- [ ] **Step 1: Escrever os testes que falham** em `tests/apps-script-logica.test.js` (desestruturar as novas funções de `ctx`):

```js
test('gerarCodigo tira acento, junta cor e evita repetido', () => {
  assert.equal(gerarCodigo('Vestido Lua', 'Rosa', []), 'vestido-lua-rosa');
  assert.equal(gerarCodigo('Vestido Maria Júlia', '', []), 'vestido-maria-julia');
  assert.equal(gerarCodigo('Vestido Lua', 'Rosa', ['vestido-lua-rosa', 'vestido-lua-rosa-2']), 'vestido-lua-rosa-3');
  assert.equal(gerarCodigo('  ***  ', '', []), 'peca');
  assert.ok(gerarCodigo('x'.repeat(100), '', []).length <= 60);
});
test('textoSeguro impede fórmula', () => {
  assert.equal(textoSeguro('=SOMA(A1)'), "'=SOMA(A1)");
  assert.equal(textoSeguro('-promo'), "'-promo");
  assert.equal(textoSeguro('Vestido'), 'Vestido');
  assert.equal(textoSeguro('  oi  '), 'oi');
});
test('lerPreco aceita formatos comuns e recusa inválidos', () => {
  for (const t of ['139,90', '139,9', '139.90', 'R$ 139,90', ' 139,90 ', 139.9]) assert.equal(lerPreco(t), 139.9);
  for (const t of ['abc', '0', '-5', '', '1,999']) assert.equal(lerPreco(t), null);
});
test('validarCamposPeca monta valores da planilha', () => {
  const r = validarCamposPeca({ nome: 'Vestido Lua', cor: 'Rosa', categoria: 'Vestido', colecao: 'Linha Petit',
    descricao: '=x', preco: '129,90', ativo: true, destaque: false, campanha: true,
    estoque: { P: '', M: '', G: '', 1: 2, 2: 0, 3: '', 4: '1', 6: '' } }, true);
  assert.equal(r.ok, true);
  assert.equal(r.valores.preco, 129.9);
  assert.equal(r.valores.ativo, 'sim');
  assert.equal(r.valores.destaque, 'nao');
  assert.equal(r.valores.descricao, "'=x");
  assert.equal(r.valores['1'], 2);
  assert.equal(r.valores['2'], 0);
  assert.equal(r.valores['4'], 1);
  assert.equal(r.valores.p, '');
});
test('validarCamposPeca recusa com mensagem', () => {
  const ok = { categoria: 'Vestido', preco: '10', estoque: {} };
  assert.equal(validarCamposPeca({ ...ok, preco: 'abc' }, false).mensagem, 'Preço inválido. Use só números, ex.: 139,90.');
  assert.equal(validarCamposPeca({ ...ok, categoria: ' ' }, false).mensagem, 'Escolha ou escreva a categoria.');
  assert.equal(validarCamposPeca({ ...ok }, true).mensagem, 'Escreva o nome da peça.');
  assert.equal(validarCamposPeca({ ...ok, estoque: { 4: -1 } }, false).mensagem, 'Estoque do tamanho 4 precisa ser um número de 0 a 999.');
  assert.equal('nome' in validarCamposPeca({ ...ok, nome: 'X' }, false).valores, false);
});
test('linhaNovaPeca segue a ordem do cabeçalho e deixa o resto vazio', () => {
  const cab = ['codigo', 'nome', 'preco', 'fotos', 'p', 'outra'];
  assert.deepEqual([...linhaNovaPeca(cab, { codigo: 'a', nome: 'A', preco: 10, fotos: 0, p: 3 })], ['a', 'A', 10, 0, 3, '']);
});
test('pecasParaArea lê a tabela de exibição', () => {
  const t = [['codigo', 'nome', 'cor', 'categoria', 'preco', 'ativo', 'destaque', 'campanha', 'fotos', 'P', '4'],
             ['vl', 'Vestido Lua', 'Rosa', 'Vestido', '129,90', 'nao', '', '', '2', '', '0'],
             ['', 'sem código', '', '', '', '', '', '', '', '', '']];
  const [p, ...resto] = pecasParaArea(t);
  assert.equal(resto.length, 0);
  assert.equal(p.preco, 129.9);
  assert.equal(p.ativo, false);
  assert.equal(p.destaque, false);
  assert.equal(p.campanha, true);
  assert.equal(p.fotos, 2);
  assert.equal(p.estoque.P, '');
  assert.equal(p.estoque['4'], 0);
});
test('passe vale 8 horas e não aceita adulteração', () => {
  const assinar = (t) => 'sig' + t;
  const passe = criarPasse(1000, assinar);
  assert.equal(passeValido(passe, 1000, assinar), true);
  assert.equal(passeValido(passe, 1000 + 28800000, assinar), false);
  assert.equal(passeValido(passe.replace(/\d$/, '9'), 1000, assinar), false);
  assert.equal(passeValido('', 1000, assinar), false);
  assert.equal(passeValido('abc', 1000, assinar), false);
});
test('planoApagarFoto renumera as seguintes', () => {
  const f = (n) => `fotos/x-${n}.jpg`;
  assert.deepEqual(JSON.parse(JSON.stringify(planoApagarFoto('x', 4, 2))),
    { mover: [{ de: f(3), para: f(2) }, { de: f(4), para: f(3) }], apagar: f(4) });
  assert.deepEqual(JSON.parse(JSON.stringify(planoApagarFoto('x', 3, 3))), { mover: [], apagar: f(3) });
  assert.equal(planoApagarFoto('x', 3, 0), null);
  assert.equal(planoApagarFoto('x', 3, 4), null);
});
```

Ajustar os testes existentes de `validarEnvio`: `base()` passa a ter `autorizado: true` no lugar de `senhaInformada`/`senhaCerta`; o teste de senha errada usa `autorizado: false` e espera `erro: 'senha'`.

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → falha com `gerarCodigo is not a function` (ou equivalente).
- [ ] **Step 3: Implementar as funções** em `apps-script/Logica.gs` com as assinaturas e regras acima. `slug`: `normalize('NFD')`, remove `[̀-ͯ]`, minúsculas, troca tudo fora de `[a-z0-9]` por `-`, junta hífens, tira das pontas, corta em 60 (sem hífen final). `gerarCodigo`: `slug(nome + ' ' + cor) || 'peca'`; se repetido, sufixo `-2`, `-3`… garantindo o total ≤ 60.
- [ ] **Step 4: Rodar** — `npm test` → todos passam.
- [ ] **Step 5: Commit**

```bash
git add apps-script/Logica.gs tests/apps-script-logica.test.js
git commit -m "feat(area): lógica pura da Área da Anne"
```

---

### Task 2: Funções de servidor em `Codigo.gs`

**Files:**
- Modify: `apps-script/Codigo.gs`
- Create: `tests/apps-script-codigo.test.js`, `tests/dubles-google.js` (dublês dos serviços Google, só para teste)

**Interfaces:**
- Consumes (Task 1): `gerarCodigo`, `validarCamposPeca`, `linhaNovaPeca`, `pecasParaArea`, `criarPasse`, `passeValido`, `planoApagarFoto`, `validarEnvio({autorizado, ...})`, `VALIDADE_PASSE_MS`, `MAX_ERROS_SENHA`.
- Produces (chamadas por `google.script.run` na Task 3; todas devolvem objeto simples, nunca lançam para a página):
  - `doGet()` → serve o template `Area` (título `Trio Kids - Área da loja`), com `urlLogo`, `urlSite` e `faltando` como hoje.
  - `entrar(senha: string) -> {ok: true, passe} | {ok: false, mensagem}` — usa a contagem de erros e o bloqueio existentes (`'Senha incorreta.'`, mensagem de bloqueio atual).
  - `listarPecasArea(passe) -> {ok: true, pecas: object[], categorias: string[], colecoes: string[]} | {ok: false, sair?: true, mensagem}` — `pecas` = `pecasParaArea` na ordem da planilha; `categorias`/`colecoes` = valores distintos não vazios, em ordem alfabética.
  - `salvarPeca(passe, codigo, campos) -> {ok: true, mensagem: 'Salvo! Aparece no site em até 10 min.', peca} | {ok: false, sair?, mensagem}`
  - `criarPeca(passe, campos) -> {ok: true, codigo, mensagem: 'Peça cadastrada! Agora envie as fotos.', peca} | {ok: false, sair?, mensagem}` — `fotos` = 0, `colecao` vazia vira `Linha Petit`.
  - `enviarFotos({passe, codigo, trocar, arquivos}) -> {ok, mensagem, fotos?}` — igual ao atual, mas autorizado pelo passe (sem contar erro de senha); devolve `fotos` = total novo.
  - `apagarFoto(passe, codigo, n) -> {ok, mensagem, fotos?}` — um commit `Fotos: <codigo> (apaga N)` que move/apaga segundo `planoApagarFoto` reaproveitando o `sha` dos blobs da árvore atual, grava `fotos = total - 1` na planilha (desfaz se o commit falhar, como `enviarComTrava_`) e inclui `catalogo.json`.
  - Remove `listarPecas` antiga.
- Passe inválido ou vencido → `{ok: false, sair: true, mensagem: 'Sua entrada venceu. Digite a senha de novo.'}`. Assinatura: hex de `Utilities.computeHmacSha256Signature(texto, props.SENHA_FORMULARIO)` (bytes com sinal → `(b + 256) % 256`, dois dígitos).
- `salvarPeca`/`criarPeca`: dentro de `LockService.getScriptLock().waitLock(30000)`, relê a aba `Peças`, acha a coluna por cabeçalho normalizado e grava **só** as colunas de `valores` que existem no cabeçalho (uma `setValue` por célula ou `setValues` no intervalo da linha só com essas colunas — nunca reescreve a linha inteira). Código não encontrado → `{ok: false, mensagem: 'Não achei essa peça. Atualize a lista.'}`. `criarPeca` usa `gerarCodigo(nome, cor, códigos existentes)` e `appendRow(linhaNovaPeca(...))`. Erro inesperado → `avisarDono_` + `MENSAGEM_FALHA`.
- `dubles-google.js` exporta `criarAmbiente({ props, abaPecas: string[][], github? })` que devolve um objeto de contexto para `vm` com `PropertiesService`, `CacheService`, `LockService`, `SpreadsheetApp` (planilha em memória com `getSheetByName`, `getDataRange().getDisplayValues()/getValues()`, `getRange(l, c).setValue/getValue`, `getRange(l, c, 1, n).setValues`, `appendRow`, `SpreadsheetApp.flush`), `Utilities` (HMAC real via `node:crypto`, devolvendo array de bytes com sinal), `MailApp` (registra envios), `UrlFetchApp` (registra chamadas; respostas configuráveis), `HtmlService` mínimo; e acesso à planilha em memória para as asserções.

- [ ] **Step 1: Escrever os testes que falham** em `tests/apps-script-codigo.test.js` (carrega `Logica.gs` e `Codigo.gs` no mesmo contexto `vm`):

```js
test('entrar com senha certa devolve passe aceito por listarPecasArea', ...);
  // r = entrar('certa'); r.ok === true; listarPecasArea(r.passe).ok === true; pecas.length === linhas com código
test('entrar com senha errada 5 vezes bloqueia', ...);
  // 4 × 'Senha incorreta.'; 5ª → mensagem de bloqueio; entrar('certa') logo depois → ainda bloqueado
test('passe vencido ou forjado pede para entrar de novo', ...);
  // listarPecasArea('1.abc') → { ok:false, sair:true }; passe com validade passada → sair:true
test('salvarPeca grava só as colunas editadas, achando a linha pelo código', ...);
  // abaPecas com 3 peças; o teste insere uma linha nova no topo da tabela em memória antes de salvar;
  // salvarPeca(passe, 'vestido-lua', {preco:'99,90', categoria:'Vestido', estoque:{4:3}, ativo:false, destaque:true, campanha:true})
  // → linha certa com preco 99.9, coluna '4' = 3, ativo 'nao'; coluna nome e fotos intactas
test('salvarPeca de código que sumiu não grava nada', ...);
  // → { ok:false, mensagem:'Não achei essa peça. Atualize a lista.' }; planilha idêntica
test('salvarPeca com preço inválido devolve a mensagem da validação', ...);
test('criarPeca acrescenta na última linha com código gerado e fotos 0', ...);
  // criarPeca(passe, {nome:'Vestido Lua', cor:'Rosa', ...}) com 'vestido-lua-rosa' já existente → codigo 'vestido-lua-rosa-2', última linha, fotos 0, colecao 'Linha Petit'
test('criarPeca com nome "=HACK" grava texto com apóstrofo', ...);
test('apagarFoto monta um commit que move as seguintes e grava fotos - 1', ...);
  // dublê do GitHub: árvore com fotos/x-1..3.jpg (shas s1,s2,s3); apagarFoto(passe,'x',1)
  // → POST git/trees com entradas {path:'fotos/x-1.jpg', sha:'s2'}, {path:'fotos/x-2.jpg', sha:'s3'}, {path:'fotos/x-3.jpg', sha:null} e catalogo.json; coluna fotos = 2
test('enviarFotos sem passe válido devolve sair:true e não chama o GitHub', ...);
```

(Os comentários dizem as asserções exatas; escreva cada uma como `assert`.)

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → falha (`entrar is not a function` ou dublê ausente).
- [ ] **Step 3: Implementar** os dublês e as funções em `Codigo.gs` conforme as Interfaces. Reaproveitar `abrirPlanilha_`, `indiceColuna_`, `normalizar_`, `github_`, `gravarTotalFotos_`/`desfazerTotalFotos_`, `jsonReserva_`, `avisarDono_`. Trocar `caminhosDaArvore_` por uma versão que devolva `{path, sha}` (ajustando `enviarComTrava_`). Não aninhar `waitLock` (uma trava por chamada).
- [ ] **Step 4: Rodar** — `npm test` → todos passam.
- [ ] **Step 5: Commit**

```bash
git add apps-script/Codigo.gs tests/apps-script-codigo.test.js tests/dubles-google.js
git commit -m "feat(area): funções de servidor da Área da Anne"
```

---

### Task 3: Página `Area.html`, remoção do formulário antigo e guias

**Files:**
- Create: `apps-script/Area.html`
- Delete: `apps-script/Formulario.html`
- Modify: `docs/guia-do-dono.md` (seções 6.1, 6.2, 6.4, 7 e roteiro do teste), `dados-iniciais/LEIA-ME.txt` (seção FOTOS e nota no topo de ABA PEÇAS)
- Test: `tests/apps-script-area.test.js`

**Interfaces:**
- Consumes (Task 2): `entrar`, `listarPecasArea`, `salvarPeca`, `criarPeca`, `enviarFotos`, `apagarFoto`; variáveis de template `urlLogo`, `urlSite`, `faltando`.
- Produces: a página.

Telas (seguir o esboço aprovado: logo, cartões brancos arredondados, pílulas de estoque, botão coral, `max-width` ~520 px, alvos de toque ≥ 44 px):
1. **Entrar**: logo, "Área da loja", frase "Pequenos looks, grandes histórias.", campo senha, botão Entrar. Se `faltando`, mostra só a mensagem.
2. **Minhas peças**: barra com logo, título e "Sair" (apaga o passe da memória e volta à tela 1); busca por nome/cor/código; filtros `Todas (N)`, `No site`, `Escondidas`, `Esgotadas` (esgotada = tem algum tamanho e todos são 0); cartão com miniatura `urlSite + 'fotos/' + encodeURIComponent(codigo) + '-1.jpg'` (sem foto ou erro de carga → logo), nome (`nome — cor`), `R$ 139,90`, pílulas `tam ·qtd` (0 riscado), selos "Esgotada"/"Escondida"; botão flutuante "+ Nova peça".
3. **Editar peça**: voltar; miniaturas das fotos 1..`fotos` com "apagar" (confirmação na própria tela, sem `confirm()`), "+" para acrescentar e opção "trocar todas"; preço; categoria e coleção (lista das existentes + escrever nova, via `<input list>` + `<datalist>`); descrição; estoque por tamanho com − / + e "não tem" (− em 0 vira "não tem"; + em "não tem" vira 0); chaves Aparece no site / Destaque / Trio Kids Abraça; botão "Nova cor desta peça" (abre tela 4 com nome, categoria, coleção, preço e tamanhos preenchidos); "Salvar alterações" com aviso de sucesso/erro.
4. **Nova peça**: nome, cor, preço, categoria, coleção, tamanhos que terá (pílulas liga/desliga → 0 ou vazio), prévia do código (mesma regra de `slug`, só ilustrativa — o servidor decide), fotos opcionais; "Cadastrar peça" → `criarPeca`; se houver fotos, em seguida `enviarFotos` com o código devolvido; ao final abre a tela 3 da peça nova.

Comportamento:
- Passe em variável JS do escopo da página; **proibido** `localStorage`, `sessionStorage`, `document.cookie`.
- Toda resposta com `sair: true` → limpa o passe e volta à tela 1 com a mensagem.
- Botão desabilitado e texto "Salvando..." enquanto espera; falha de rede → `'Não consegui salvar. Confira a internet e tente de novo.'`.
- Redução das fotos igual à de hoje (`LADO_MAX 1600`, `QUALIDADE 0.8`, `MAX_FOTOS 8`, JPEG).
- Texto da peça inserido no DOM só com `textContent`/`value` (nunca `innerHTML` com dado da planilha).
- Foto nova: aviso "As fotos novas aparecem em alguns minutos."

- [ ] **Step 1: Escrever os testes que falham** em `tests/apps-script-area.test.js`:

```js
test('Formulario.html foi removido e doGet serve Area', () => {
  assert.equal(fs.existsSync(new URL('../apps-script/Formulario.html', import.meta.url)), false);
  assert.match(fs.readFileSync(new URL('../apps-script/Codigo.gs', import.meta.url), 'utf8'), /createTemplateFromFile\('Area'\)/);
});
test('Area.html não guarda o passe no aparelho', () => {
  const html = fs.readFileSync(new URL('../apps-script/Area.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /localStorage|sessionStorage|document\.cookie/);
});
test('Area.html chama só funções que existem no servidor', () => {
  // extrai os nomes após `.withFailureHandler(...)` / `google.script.run...` chamados como `.nome(`
  // e confere que cada um é function no contexto vm de Logica.gs + Codigo.gs:
  // entrar, listarPecasArea, salvarPeca, criarPeca, enviarFotos, apagarFoto
});
test('Area.html não usa innerHTML com dados e nem confirm/alert', () => {
  const html = fs.readFileSync(new URL('../apps-script/Area.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /\b(confirm|alert|prompt)\(/);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test`.
- [ ] **Step 3: Implementar `Area.html`** conforme as telas e o comportamento acima; apagar `Formulario.html` (`git rm`).
- [ ] **Step 4: Atualizar guias**: em `docs/guia-do-dono.md`, o projeto passa a ter `Area.html` (não `Formulario.html`); a senha `SENHA_FORMULARIO` é a da Área (dono e Anne); 6.4 "Publicar a Área da Anne"; seção 7 vira "Atalho da Área da Anne" (nome do atalho "Trio Kids Loja") com o passo a passo de uso (entrar, editar, nova peça, fotos) e o aviso de que a senha é pedida toda vez; se já existe implantação do formulário antigo, atualizar com **Gerenciar implantações → Nova versão** (o endereço continua). Em `dados-iniciais/LEIA-ME.txt`: no topo de ABA PEÇAS, "O jeito mais fácil é usar a Área da loja no celular (atalho Trio Kids Loja). A planilha continua valendo."; seção FOTOS aponta para a Área.
- [ ] **Step 5: Rodar** — `npm test` → todos passam.
- [ ] **Step 6: Commit**

```bash
git add apps-script/Area.html tests/apps-script-area.test.js docs/guia-do-dono.md dados-iniciais/LEIA-ME.txt
git rm apps-script/Formulario.html
git commit -m "feat(area): página da Área da Anne e guias"
```
