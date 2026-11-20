# Guia do dono: como colocar o site da Trio Kids no ar

Este guia é para quem não mexe com tecnologia. Cada passo diz o que abrir e onde clicar. Faça na ordem. Se um nome de botão estiver um pouco diferente na sua tela (o Google e o GitHub mudam os textos de vez em quando), procure o que tem o mesmo sentido.

**O que você vai usar:**

- Uma conta no **GitHub**, onde o site fica guardado e publicado.
- Uma **Planilha Google**, onde a Anne cuida das peças, preços e estoque.
- Um **Apps Script**, que é o formulário de fotos da Anne (ela envia a foto pelo celular e ela aparece no site).

**Dados fixos da loja:**

| Item | Valor |
| --- | --- |
| Conta do GitHub | `triokids` |
| Repositório | `triokids.github.io` |
| Endereço do site | https://triokids.github.io/ |
| Vendedora | Anne |

A planilha e o Apps Script ficam na **conta Google da loja**. Use sempre essa conta nos passos 2, 3, 4 e 6.

> **Cuidado com segredos.** O repositório do GitHub é público: qualquer pessoa vê o que está lá. Por isso **nunca** escreva em arquivo do site a senha do formulário, o token do GitHub nem o e-mail da loja. Esses três só entram nas "Propriedades do script" (passo 6).

---

## 1. GitHub: criar a conta, o repositório e publicar o site

### 1.1 Criar a conta

1. Abra https://github.com/signup.
2. Use o e-mail da loja. Em **Username**, escreva `triokids`.
3. Crie uma senha forte para a conta, anote em lugar seguro e conclua a verificação que o GitHub pedir (ele manda um código para o e-mail).

### 1.2 Criar o repositório

1. Já logado, clique no **+** no canto superior direito e em **New repository**.
2. Em **Repository name**, escreva exatamente `triokids.github.io`.
3. Marque **Public**.
4. Não marque nenhuma das opções de README, .gitignore ou licença.
5. Clique em **Create repository**.

### 1.3 Enviar os arquivos do site

Escolha **uma** das duas formas.

**Forma A: GitHub Desktop (a mais simples e sem limite de arquivos)**

1. Baixe e instale o GitHub Desktop em https://desktop.github.com/ e entre com a conta `triokids`.
2. Clique em **File → Add local repository** e escolha a pasta do site no seu computador. Se ele disser que a pasta ainda não é um repositório, clique em **create a repository**.
3. Confirme que o nome é `triokids.github.io` e que a branch se chama `main`.
4. Escreva "Site inicial" na caixa **Summary** e clique em **Commit to main**.
5. Clique em **Publish repository** (ou **Push origin**). Desmarque "Keep this code private" se aparecer.

O GitHub Desktop respeita o arquivo `.gitignore`, então as pastas de trabalho privadas não sobem. Se você editar o `config.js` pelo site do GitHub (passo 3), clique em **Fetch origin** e depois **Pull** no GitHub Desktop antes de fazer um novo commit pelo computador; senão ele acusa que está desatualizado.

**Forma B: pelo site do GitHub (arrastando arquivos)**

1. Na página do repositório, clique em **uploading an existing file** (ou **Add file → Upload files**).
2. Abra a pasta do site no computador e arraste **somente** estes itens para a janela do navegador: `index.html`, `catalogo.html`, `peca.html`, `campanha.html`, `tamanhos.html`, `sobre.html`, `config.js`, `catalogo.json`, `.nojekyll`, e as pastas `css`, `js`, `img` e `fotos`. (A pasta `docs` com este guia é opcional.)
3. **Não envie** `.superpowers`, `_rodadas`, `.git` nem `node_modules`: o upload pelo navegador não respeita o `.gitignore` e essas pastas têm anotações de trabalho que não devem ficar públicas. As pastas `tests`, `ferramentas`, `apps-script` e `dados-iniciais` também não são necessárias para o site funcionar (o `apps-script` você cola no Google, passo 6). O arquivo `.nojekyll` (vazio, começa com ponto) diz ao GitHub Pages para publicar os arquivos como estão, sem processá-los.
4. O GitHub aceita até 100 arquivos por vez. Se a pasta tiver mais, envie em duas ou três levas (por exemplo, primeiro as páginas `.html`, `css`, `js` e `img`; depois `fotos`, `catalogo.json` e o resto).
5. Em cada leva, role até o fim, deixe marcado **Commit directly to the main branch** e clique em **Commit changes**.

> Quem está montando o site para você também pode enviar tudo para o GitHub, desde que você autorize. Se preferir assim, só crie a conta e o repositório (1.1 e 1.2) e avise.

### 1.4 Ativar o GitHub Pages

1. No repositório, clique em **Settings** (Configurações).
2. No menu da esquerda, clique em **Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
5. Espere de 1 a 5 minutos e abra https://triokids.github.io/. O site deve aparecer. Enquanto a planilha não estiver ligada (passo 3), ele mostra as peças da reserva (`catalogo.json`). Isso é normal.

---

## 2. Planilha Google: criar e preencher

### 2.1 Criar a planilha e as abas

1. Entre no Google com a **conta Google da loja** e abra https://sheets.google.com.
2. Clique em **Planilha em branco**. Nomeie como **Trio Kids** (clique no título no alto, à esquerda).
3. A planilha já vem com uma aba chamada "Página1". Clique nela com o botão direito, escolha **Renomear** e escreva `Peças`.
4. Clique no **+** no canto inferior esquerdo para criar mais três abas e dê estes nomes, com essa grafia: `Config`, `Campanha`, `LEIA-ME`.

### 2.2 Ajustar a região da planilha e importar os dados iniciais

**Antes de importar**, ajuste a região: menu **Arquivo → Configurações**, aba **Geral**, em **Localidade** escolha **Brasil** e clique em **Salvar configurações**. Sem isso, o preço `139,90` vira texto em vez de número, e a validação "É um número" do passo 2.4 recusa os preços.

Os arquivos estão na pasta `dados-iniciais` do site: `pecas.csv`, `config.csv` e `campanha.csv`.

Faça isto **uma vez por aba** (Peças, Config e Campanha):

1. Clique na aba (por exemplo, `Peças`).
2. Menu **Arquivo → Importar → Upload**. Arraste o arquivo certo (`pecas.csv` para Peças, `config.csv` para Config, `campanha.csv` para Campanha).
3. Em **Local de importação**, escolha **Substituir planilha atual**.
4. Em **Tipo de separador**, deixe **Detectar automaticamente** (os arquivos usam vírgula).
5. Deixe **Converter texto em números, datas e fórmulas** marcado. Clique em **Importar dados**.

Confira: na aba Peças, a primeira linha tem os títulos `codigo, nome, cor, categoria, colecao, preco, ativo, destaque, campanha, fotos, descricao, P, M, G, 1, 2, 3, 4, 6`. O preço deve aparecer como número (por exemplo, `139,90`).

### 2.3 Aba LEIA-ME

Abra o arquivo `dados-iniciais/LEIA-ME.txt`, copie todo o texto e cole na célula **A1** da aba `LEIA-ME`. É o lembrete de regras que a Anne vai ler.

### 2.4 Validações (evitam erro de digitação)

Na aba **Peças**:

1. **Preço**: selecione a coluna `preco` inteira (clique na letra no topo) e use o menu **Dados → Validação de dados → Adicionar regra**. Em **Critérios**, escolha **É um número** e depois **maior ou igual a** `0`. Em "Se os dados forem inválidos", escolha **Rejeitar a entrada**. Clique em **Concluído**.
2. **Estoque**: selecione as colunas de tamanho (`P` até `6`). Adicione a regra **É um número** **maior ou igual a** `0`, rejeitando a entrada. Células vazias continuam permitidas (vazio quer dizer "não tem o tamanho"). Só escreva números inteiros.
3. **ativo, destaque e campanha**: selecione cada uma dessas colunas e adicione a regra **Menu suspenso** com dois itens: `sim` e `nao`. Escreva `nao` sem acento, igual aos dados que já estão na planilha.

> Se algum valor já preenchido for diferente da lista, a planilha marca a célula: corrija para `sim` ou `nao`.

### 2.5 Congelar e proteger

1. **Congelar**: clique em qualquer célula da aba Peças, menu **Ver → Congelar → 1 linha** e também **Ver → Congelar → 1 coluna**. Assim o título e o `codigo` ficam sempre à vista.
2. **Proteger o cabeçalho** (linha 1): selecione a linha 1, clique com o botão direito, escolha **Ver mais ações da linha → Proteger intervalo**. Dê o nome "Cabeçalho", clique em **Definir permissões**, escolha **Restringir quem pode editar este intervalo → Somente você** e **Concluído**.
**Não proteja a coluna `codigo`**: a Anne precisa escrever o código das peças novas. O aviso para nunca mudar o código de uma peça que já existe está na aba `LEIA-ME`.

---

## 3. Publicar cada aba como CSV e ligar ao site

O site lê a planilha por três endereços públicos (um por aba). Eles só mostram os dados; ninguém consegue editar por eles.

Faça **três vezes** (Peças, Config, Campanha):

1. Menu **Arquivo → Compartilhar → Publicar na Web**.
2. Na primeira caixa, troque **Documento inteiro** pela aba (por exemplo, `Peças`).
3. Na segunda caixa, troque **Página da Web** por **Valores separados por vírgula (.csv)**.
4. Clique em **Publicar** e confirme. Copie o endereço que aparece e cole num bloco de notas, anotando de qual aba é.
5. Para a próxima aba, volte ao mesmo menu e escolha a aba seguinte.

O número do WhatsApp da loja **não** fica na planilha: ele está no `config.js` (campo `whatsapp`, com 55 e DDD, só números). Para trocar o número, edite esse arquivo como abaixo. Agora cole os três endereços no `config.js`:

1. No GitHub, abra o repositório e clique no arquivo `config.js`.
2. Clique no lápis (**Edit this file**).
3. Entre as aspas de `pecas: ''`, `config: ''` e `campanha: ''`, cole o endereço de cada aba. O formato fica assim: `pecas: 'https://docs.google.com/spreadsheets/d/e/....../pub?gid=0&single=true&output=csv'`.
4. Clique em **Commit changes** e confirme.
5. Espere alguns minutos e atualize https://triokids.github.io/. As peças agora vêm da planilha.

> Mudanças na planilha podem levar **até 10 minutos** para aparecer no site. Isso vem do Google, não é defeito.

---

## 4. Dar acesso à Anne

1. Na planilha, clique em **Compartilhar** (canto superior direito).
2. Escreva o e-mail da conta Google da Anne.
3. Ao lado, escolha o papel **Editor**.
4. Deixe marcada a opção de avisar por e-mail e clique em **Enviar**.

A Anne edita a planilha pelo navegador ou pelo aplicativo Planilhas do celular, usando a conta dela. Mande para ela o texto da aba `LEIA-ME`.

---

## 5. Criar o token do GitHub (a "chave" do formulário de fotos)

O formulário da Anne precisa de permissão para colocar fotos no repositório. Essa permissão é o **token**. Ele deve valer só para este repositório.

1. No GitHub, clique na sua foto (canto superior direito) e em **Settings**.
2. No menu da esquerda, no fim, clique em **Developer settings**.
3. Clique em **Personal access tokens → Fine-grained tokens → Generate new token**.
4. **Token name**: `formulario-fotos`.
5. **Expiration**: escolha **No expiration** (sem expiração) se a opção existir. Se a conta não permitir, escolha 1 ano e **crie agora um lembrete na sua agenda para daqui a 11 meses**: "renovar o token do GitHub da Trio Kids". Quando o token vence, o formulário para de enviar fotos até você trocar.
6. **Repository access**: marque **Only select repositories** e escolha `triokids/triokids.github.io`.
7. Em **Permissions → Repository permissions**, procure **Contents** e escolha **Read and write** (leitura e escrita). Não marque mais nada.
8. Clique em **Generate token**.
9. **Copie o token agora**: ele só aparece uma vez. Deixe a aba aberta até colar no passo 6.

Não envie esse token por WhatsApp ou e-mail, e nunca o cole em arquivo do site.

---

## 6. Apps Script: o formulário de fotos

### 6.1 Criar o projeto

1. Na planilha **Trio Kids**, use o menu **Extensões → Apps Script**. Abre uma nova aba.
2. Clique no título "Projeto sem título" e renomeie para `Formulario Trio Kids`.
3. Vamos usar quatro arquivos:
   - `Codigo.gs`: apague o conteúdo do arquivo que já existe, abra `apps-script/Codigo.gs` do site no seu computador, copie tudo e cole.
   - `Logica.gs`: clique em **+** ao lado de "Arquivos" → **Script**, nomeie `Logica` e cole o conteúdo de `apps-script/Logica.gs`.
   - `Formulario.html`: clique em **+** → **HTML**, nomeie `Formulario` e cole o conteúdo de `apps-script/Formulario.html`.
   - `appsscript.json`: clique na engrenagem (**Configurações do projeto**) e marque **Mostrar arquivo de manifesto "appsscript.json" no editor**. Volte ao editor, abra `appsscript.json`, apague o conteúdo e cole o de `apps-script/appsscript.json`.
4. Clique em **Salvar projeto** (ícone de disquete).

### 6.2 Preencher as Propriedades do script

1. Na engrenagem (**Configurações do projeto**), role até **Propriedades do script** e clique em **Adicionar propriedade do script**.
2. Crie uma linha para cada nome abaixo (o nome com letras maiúsculas, exatamente assim):

| Nome | O que colocar |
| --- | --- |
| `SENHA_FORMULARIO` | A senha que a Anne vai digitar para enviar fotos. Invente uma e combine só com ela. **Digite aqui e em nenhum outro lugar.** |
| `GITHUB_TOKEN` | O token do passo 5 |
| `GITHUB_DONO` | `triokids` |
| `GITHUB_REPO` | `triokids.github.io` |
| `GITHUB_BRANCH` | `main` |
| `PLANILHA_ID` | O trecho do endereço da planilha entre `/d/` e `/edit`. Em `https://docs.google.com/spreadsheets/d/ESTE_TRECHO/edit`, copie `ESTE_TRECHO` |
| `EMAIL_DONO` | O e-mail da loja, para receber aviso de falha |

3. Clique em **Salvar propriedades do script**.

### 6.3 Ligar a conferência diária

1. No editor, na barra de cima, escolha a função `instalarGatilhoDiario` na lista e clique em **Executar**.
2. O Google vai pedir autorização: clique em **Revisar permissões**, escolha a conta da loja, depois **Avançado → Acessar ... (não seguro)** (é normal, o script é seu) e **Permitir**.
3. Rode **uma vez só**. Ela cria um gatilho que, todo dia por volta das 6h, confere a planilha e atualiza a reserva (`catalogo.json`) no GitHub se algo mudou.

### 6.4 Publicar o formulário

1. Clique em **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. **Executar como**: **Eu**. **Quem tem acesso**: **Qualquer pessoa**.
4. Clique em **Implantar** e autorize se pedir.
5. Copie o **URL do app da Web**. É o endereço do formulário. A senha protege o envio.

Se mudar o código do Apps Script no futuro, use **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão**. O endereço continua o mesmo.

---

## 7. Atalho do formulário no celular da Anne

No celular da Anne:

1. Abra o endereço do formulário (passo 6.4) no Chrome (Android) ou no Safari (iPhone).
2. **Android (Chrome)**: toque nos três pontinhos e em **Adicionar à tela inicial**.
3. **iPhone (Safari)**: toque no botão de compartilhar e em **Adicionar à Tela de Início**.
4. Dê o nome "Fotos Trio Kids" e confirme.

Como usar: abrir o atalho, escolher a peça, escolher as fotos (ou tirar na hora), digitar a senha e tocar em enviar. Quando aparecer "Enviado!", a foto surge no site em poucos minutos. Para trocar as fotos antigas pelas novas, marque "trocar todas".

---

## 8. Roteiro do teste de 2 horas

Faça depois que os passos 1 a 7 estiverem prontos. Tenha um cronômetro e um papel para anotar horários. O teste inteiro deve caber em 2 horas.

1. Anote a hora de início. Com o celular da Anne, tire na hora uma foto de uma peça (de 3 a 5 MB, tamanho normal de foto de celular).
2. Abra o atalho, escolha a peça, digite a senha e envie.
3. Anote a hora em que apareceu "Enviado!".
4. Recarregue a página dessa peça no site e anote quanto tempo levou até a foto aparecer.
5. No GitHub, aba **Commits**: confira que existe **um só** commit chamado `Fotos: <código da peça>` para esse envio, com a foto na pasta `fotos` e o `catalogo.json` alterado.
6. No Apps Script, execute `gerarReserva` manualmente. Se nada mudou na planilha, **não** pode aparecer commit novo.
7. No celular, mude o estoque de 3 peças na planilha e anote o tempo até o site mostrar os 3 valores novos (pode levar até 10 minutos).
8. Digite a senha errada 5 vezes no formulário. Ele deve bloquear por 1 hora. Anote o resultado.
9. Registre todos os tempos. Se algo passou muito do esperado, veja o passo 9 abaixo.

---

## 9. Se algo der errado

**Chegou um e-mail de falha** (avisando que o formulário ou a reserva falhou): o e-mail diz qual função falhou e o motivo. Os casos mais comuns:

- *Bad credentials, 401 ou 403*: o token venceu ou foi apagado. Gere um novo (passo 5) e troque o valor de `GITHUB_TOKEN` nas Propriedades do script.
- *Not Found ou 404*: confira `GITHUB_DONO`, `GITHUB_REPO` e `GITHUB_BRANCH` (devem ser `triokids`, `triokids.github.io` e `main`).
- *Falta configurar: ...*: alguma propriedade do passo 6.2 está vazia. O nome aparece na mensagem.
- Erro sobre a planilha: confira `PLANILHA_ID` e se a aba Peças tem as colunas `nome`, `cor`, `codigo` e `fotos` com esses nomes.

**O formulário diz "Senha incorreta" ou bloqueou**: o bloqueio dura 1 hora. Se a Anne esqueceu a senha, mude `SENHA_FORMULARIO` nas Propriedades do script e avise a ela.

**A planilha mudou e o site não**: espere até 10 minutos e atualize a página. Se continuar igual, confira se o endereço colado no `config.js` ainda está certo (passo 3) e se a aba continua publicada (**Arquivo → Compartilhar → Publicar na Web**).

**O site mostra uma faixa avisando que está usando a reserva**: o site não conseguiu ler a planilha e mostra a última cópia (`catalogo.json`). As peças aparecem, mas podem estar um pouco desatualizadas. Veja o item anterior.

**Contingência: subir a foto direto pelo GitHub** (se o formulário estiver fora do ar):

1. No repositório, abra a pasta `fotos`.
2. Clique em **Add file → Upload files** e arraste a foto.
3. O nome do arquivo deve ser `<codigo>-N.jpg`, onde `<codigo>` é o código da peça na planilha e `N` é o número da foto (1, 2, 3...). Exemplo: `vestido-ester-2.jpg`.
4. Clique em **Commit changes**.
5. Na planilha, na coluna `fotos` dessa peça, escreva quantas fotos ela tem agora (por exemplo, `3`).

---

## Regras da campanha

A aba **Campanha** já vem com o texto das artes da loja: Nosso propósito, Como funciona, O que aceitamos e Não receberemos. Cada linha vira um parágrafo; linha que começa com `## ` vira subtítulo e linha que começa com `- ` vira item de lista. Confira a linha "Combine a entrega da doação com a Anne pelo WhatsApp." e ajuste se a entrega for de outro jeito. O desconto padrão é de 10% e está na aba `Config` (linha `desconto_campanha`); se mudar, ajuste também o texto de "Como funciona". Quem decide quais peças participam é a coluna `campanha` (`sim` ou `nao`) na aba Peças.

## Fotos iniciais

A cor **Safira** do **Vestido Clara** está temporariamente **sem foto própria**: a foto que veio do PDF é da cor **Cru**. A Anne deve enviar a foto da Safira pelo formulário (passo 7), escolhendo a peça `Vestido Clara - Safira`. Depois de enviada, o site passa a mostrar a foto correta.
