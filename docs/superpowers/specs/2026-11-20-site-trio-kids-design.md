# Site da Trio Kids — documento de design

Data: 20/11/2026 · Decisão de arquitetura do painel: `docs/ams/adr/ADR-001-usar-planilha-google-como-painel-e-apps-script-para-fotos.md` (ler antes; este documento não a repete por inteiro).

## 1. Intenção e porquê

A Trio Kids é uma loja de roupa infantil ("Três histórias, um amor que veste infância"; Instagram **@triokid_s**). Hoje vende com um catálogo em PDF (`0 - Projetos/Catalogo_Trio_Kids_Linha_Petit_Tabela_Divertida.pdf`) e fecha a venda no WhatsApp. O site existe para a cliente ver as peças com estoque e tamanho atualizados, montar um carrinho e mandar o pedido pronto para o WhatsApp da vendedora — sem a vendedora precisar responder "tem no 4?" peça por peça.

Quem usa:
- **Cliente** (mãe, pai, avó, quem presenteia), quase sempre no celular, vindo do Instagram.
- **Vendedora**, leiga, que cadastra peças, fotos, preço e estoque pelo celular.
- **Dono do projeto**, leigo em infraestrutura, que configura uma vez e mantém o token.

## 2. Objetivos, não-objetivos, anti-objetivos

Objetivos
- Catálogo com estoque por tamanho fiel à planilha (atraso de até ~10 min aceito).
- Carrinho que gera a mensagem do pedido e abre o WhatsApp da vendedora.
- Vendedora cadastra peça nova com fotos sozinha, pelo celular.
- Visual reconhecível como Trio Kids (identidade do PDF).
- Custo zero de hospedagem e serviços.

Não-objetivos (agora)
- Pagamento no site, cálculo de frete, login de cliente, conta de cliente, cupons.
- Baixa automática de estoque (a vendedora ajusta à mão após a venda).
- Cálculo do desconto da campanha no carrinho.
- Painel de administração próprio além da planilha e do formulário de fotos.

Anti-objetivos (falha mesmo que funcione)
- Cliente vê peça/tamanho disponível que já acabou há dias, ou catálogo vazio.
- Imagem que não é da loja aparecer na vitrine (loja infantil).
- Segredo (senha do formulário, token do GitHub) aparecer no repositório público.
- Vendedora precisar do dono para cadastrar peça nova.
- Site que parece genérico, sem a cara da marca.

## 3. Restrições

- Hospedagem: GitHub Pages gratuito → repositório **público**, site estático, limite brando de 10 builds/hora, 1 GB.
- Sem etapa de build: HTML, CSS e JavaScript puros servidos como estão.
- Dados vêm do CSV publicado da Google Planilha (cache ~5–10 min) com reserva `catalogo.json` (ver ADR-001).
- Fotos em `fotos/<codigo>-N.jpg` no repositório, enviadas pelo formulário Apps Script (ADR-001).
- Senha do formulário e token do GitHub ficam **só** nas Script Properties do Apps Script.
- Primeiro para celular (largura 360–430 px); deve funcionar bem no desktop.
- Português do Brasil; preços em R$ com vírgula.

## 4. Abordagens consideradas

| Abordagem | Troca | Escolha |
|---|---|---|
| **HTML/CSS/JS puro, sem build** | Sem ferramenta para quebrar; commit de foto publica direto; menos conforto de componentes | **Escolhida** (decisão do Claude; o dono entregou o "como") |
| Astro/Vite com build por GitHub Actions | Componentes e otimização de imagem; mas cada envio de foto dispara build, mais peças móveis para um leigo | Descartada |
| Tema de loja pronto (Jekyll etc.) | Rápido; rígido para seguir a identidade e para ler CSV no navegador | Descartada |

## 5. O que foi decidido

### 5.1 Identidade visual (tirada do PDF)

- **Fundo** creme `#fbf6ef`; cartões brancos `#fffefb`, cantos bem arredondados, sombra leve.
- **Texto** marrom: principal `#674638`, títulos/ênfase `#7a4e2e`, secundário `#604431`. Nunca preto puro.
- **Cores de acento** (os cinco pontinhos e as letras dos títulos): coral `#d9795b`, verde `#719779`, mostarda `#c4932c`, azul `#6e9aa7`, rosa `#c8728c`. Verde escuro `#52745d` para o selo da campanha; terracota `#b65b43` para rótulos ("PREÇO", "TAMANHOS DISPONÍVEIS").
- **Bloco de preço** em pêssego claro (como no PDF, pág. 2); **bloco "com a campanha"** em verde-menta claro.
- **Fontes** (Google Fonts): títulos em **Comfortaa** Bold, com letras alternando as cinco cores de acento (como "Vestido Maria Júlia" no PDF); frase de marca e subtítulos em **EB Garamond** (regular/itálico); texto corrido e interface em **Lato**.
- **Elementos**: os cinco pontinhos coloridos; faixa de cores no rodapé (barra fina dividida nas cinco cores); logo do cabide com as três crianças e "LINHA PETIT"/"TRIO KIDS" (extrair do PDF, pág. 1).
- Contraste: texto marrom sobre creme deve passar WCAG AA; títulos multicoloridos só em tamanho grande.

### 5.2 Páginas e comportamento

- **Início**: logo + frase "Pequenos looks, grandes histórias."; banner da coleção (Linha Petit); faixa da campanha Trio Kids Abraça com link; atalhos por categoria (vestidos, conjuntos, camisas, shorts, jardineiras…) e por tamanho; destaques.
- **Catálogo**: filtros por categoria, tamanho e faixa de preço; ordenação (novidades, menor/maior preço); cartão com foto, nome, preço, preço com campanha, tamanhos disponíveis em pílulas; peça sem estoque em nenhum tamanho aparece como "esgotado" (não some). Peça com `ativo = não` não aparece.
- **Página da peça**: galeria deslizável (todas as fotos da peça); seletor de cor quando a peça tiver variações (ver 5.3); botões de tamanho com tamanho esgotado riscado e "última unidade" quando estoque = 1; quantidade limitada ao estoque; link "qual tamanho escolher?" para o guia; adicionar ao carrinho; "combina com" (outras peças da mesma categoria ou coleção). Endereço próprio por peça (link compartilhável no Instagram/WhatsApp).
- **Carrinho**: gaveta lateral, sem sair da página; editar quantidade e remover; total; campos **nome** e **cidade/bairro**; caixa "Quero participar da Trio Kids Abraça" (não calcula desconto; só acrescenta a linha na mensagem); botão **Finalizar pelo WhatsApp**. Carrinho persiste no `localStorage`. Ao abrir, revalida contra o catálogo atual (item esgotado ou com preço mudado é sinalizado).
- **Trio Kids Abraça**: página com as regras da campanha (conteúdo vem da planilha, ver 5.3).
- **Guia de tamanhos**: tabela de medidas do PDF (pág. 19) com a dica "Compare a estatura da criança com a tabela".

  | Tamanho | Idade | Estatura | Tórax | Cintura | Quadril |
  |---|---|---|---|---|---|
  | P | 2–4 meses | até 62 cm | 42–44 | 30–41 | 42–44 |
  | M | 3–6 meses | até 68 cm | 44–46 | 41–43 | 44–46 |
  | G | 6–9 meses | até 73 cm | 46–48 | 43–44 | 46–48 |
  | 01 | 9–12 meses | até 80 cm | 48–50 | 45–48 | 48–50 |
  | 02 | 12–24 meses | até 90 cm | 50–53 | 48–52 | 50–54 |
  | 04 | 3–4 anos | até 103 cm | 54–57 | 52–56 | 55–61 |
  | 06 | 5–6 anos | até 116 cm | 58–61 | 56–58 | 61–65 |

- **Sobre**: "Três histórias, um amor que veste infância."
- **Em todas as páginas**: botão flutuante do WhatsApp (conversa sem pedido); link para o Instagram @triokid_s; faixa de reserva "catálogo pode estar desatualizado, confirme no WhatsApp" quando o site estiver usando cópia de reserva.

### 5.3 Dados (planilha)

Aba **Peças** — uma linha por peça **e cor**:
`codigo | nome | cor | categoria | colecao | preco | ativo | destaque | descricao | P | M | G | 1 | 2 | 3 | 4 | 6`
- Tamanho vazio = a peça não tem; `0` = esgotado; número = estoque.
- `codigo` único por linha (é o nome das fotos). Linhas com o mesmo `nome` e `cor` diferente viram uma peça com seletor de cor (ex.: Vestido Clara: Cru e Safira).
- Validações, cabeçalho protegido, aba LEIA-ME (ADR-001).

Aba **Config** (chave | valor): `whatsapp` (número da vendedora com DDI), `desconto_campanha` (10), `aviso_topo` (opcional).

Aba **Campanha**: texto das regras da Trio Kids Abraça, editável pela vendedora (cada linha = um parágrafo ou item).

Abas publicadas em CSV: só Peças, Config e Campanha. Nada de custo/fornecedor nelas.

**Carga inicial**: preencher a aba Peças com as 14 peças da Linha Petit do PDF (15 linhas, porque o Vestido Clara tem duas cores; págs. 2–17: nomes, preços, tamanhos e unidades) e as fotos extraídas do PDF como fotos iniciais.

### 5.4 Preço com a campanha

Mostrado em cartão e na peça como `preco × (1 − desconto_campanha/100)`, arredondado a centavos (R$ 139,90 → R$ 125,91, como no PDF). Rótulo: "com a Trio Kids Abraça".

### 5.5 Mensagem do WhatsApp

Abre `https://wa.me/<whatsapp>?text=<mensagem codificada>`:

```
Olá, Anne! Quero fazer este pedido:

• Vestido Maria Júlia – Tam 4 – 1x – R$ 139,90
• Vestido Clara (Safira) – Tam 2 – 2x – R$ 129,90 (R$ 259,80)

Total: R$ 399,70
Quero participar da Trio Kids Abraça (doação de peça). ← só se marcado

Nome: <nome>
Cidade/bairro: <cidade>
```

Nome e cidade obrigatórios antes de habilitar o botão.

### 5.6 Formulário de fotos e catalogo.json

Como no ADR-001: Apps Script como aplicativo da web; código + fotos + senha; redução no navegador (~1600 px, JPEG ~0,8); um envio = um commit; gera `catalogo.json` após envio e diariamente; e-mail ao dono em falha. Visual do formulário com a mesma identidade.

### 5.7 Entrega e teste

Primeiro o teste de 2 horas no celular da vendedora (ADR-001, item 5). Depois o site. Guia passo a passo para o dono: criar repositório e Pages, criar a planilha, publicar abas, criar o token fine-grained, colar senha e token nas Script Properties, compartilhar a planilha com a vendedora, instalar o atalho do formulário no celular dela.

## 5.8 Decisões tomadas na revisão do construtor (decisão do Claude; o dono pode corrigir)

- **Fotos por cor**: a galeria mostra as fotos do `codigo` da cor selecionada; o cartão usa a primeira foto da primeira cor. A aba Peças ganha a coluna `fotos` (quantidade), preenchida pelo script a cada envio; o site nunca adivinha fotos por tentativa e erro. Peça sem foto mostra um marcador com o logo.
- **Envio de fotos**: a vendedora escolhe a peça numa lista lida da planilha (não digita o código). Padrão é **acrescentar** fotos; opção "trocar todas as fotos desta peça" apaga as antigas no mesmo commit. Senha única compartilhada; 5 erros seguidos bloqueiam o envio por 1 hora (CacheService).
- **Se o teste de 2 horas falhar**: o plano para ali e volta ao dono com o resultado; contingência do ADR-001 (dono sobe fotos pelo GitHub) segue disponível.
- **Endereço da peça**: `peca.html?c=<codigo>`. Ao trocar de cor, o endereço muda para o código da cor.
- **Tamanhos**: colunas e rótulos `P, M, G, 1, 2, 3, 4, 6`, nessa ordem em filtros e pílulas. O guia usa os rótulos do PDF (01, 02, 04, 06), que equivalem a 1, 2, 4, 6; o tamanho 3 não tem linha no guia.
- **Campanha**: coluna `campanha` (sim/não, padrão sim) para excluir peças. O preço "com a Trio Kids Abraça" aparece sempre nas peças participantes, como no PDF. A mensagem lista os preços cheios e o total cheio; se a caixa estiver marcada, acrescenta "Total com a campanha, se a doação for confirmada: R$ X" (só itens participantes).
- **Preços diferentes entre cores**: cada linha tem o seu preço; o cartão mostra "a partir de" o menor.
- **Novidades e destaques**: "novidades" = ordem inversa das linhas (a última cadastrada aparece primeiro; regra no LEIA-ME). Destaques = linhas com `destaque = sim`, até 8, na ordem da planilha; sem nenhum marcado, mostra as 8 mais novas.
- **Preço no CSV**: o site aceita `139,90` e `139.90`.
- **Configuração**: `config.js` no repositório guarda o endereço dos CSVs e o número do WhatsApp (o número já é público da loja), para o botão funcionar mesmo sem planilha. A aba Config pode sobrepor `desconto_campanha` e `aviso_topo`. O `catalogo.json` traz Peças, Config e Campanha.
- **Prévia de link (Open Graph)**: genérica, com logo e nome da loja, em todas as páginas (escolha do dono). Prévia com foto por peça fica para depois, se fizer falta.
- **WhatsApp da vendedora (Anne)**: `5562999212827` (decisão do dono; trocado em 20/11/2026, antes era `5562993379366`). Mensagem começa com "Olá, Anne!".
- **Conta do GitHub**: será uma conta própria da loja, ainda sendo criada pelo dono. Usuário e nome do repositório entram como parâmetros (`config.js` e Script Properties); todos os caminhos do site são relativos, para funcionar em `/` (`<usuario>.github.io`) ou em `/<repo>/`.
- **Carga inicial**: o PDF tem texto extraível; nomes, preços e estoque vêm dele. Categoria derivada do nome (Vestido, Conjunto, Bata, Camisa, Shorts, Jardineira); coleção "Linha Petit"; cores só no Vestido Clara (Cru, Safira). As fotos do PDF são da própria marca e entram como iniciais; o dono pode trocar.

## 6. Fica a cargo de quem constrói

- Organização de arquivos e JS (módulos ES nativos, sem dependências pesadas).
- Parser de CSV (pode ser biblioteca pequena por CDN com versão fixa, ou próprio).
- Tamanho das fotos no cartão (`loading="lazy"`, `srcset` não disponível sem build — usar a foto reduzida).
- Detalhes de animação e microinterações, desde que leves.
- Ordem exata de seções da página inicial.
- Testes automatizados da lógica pura (parser, agrupamento por cor, montagem da mensagem, cálculo da campanha, revalidação do carrinho).
