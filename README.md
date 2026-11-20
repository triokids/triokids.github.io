# Trio Kids — site da loja e Área Adm

Loja de roupa infantil da Trio Kids. A cliente vê as peças com estoque e tamanho atualizados, monta o carrinho e manda o pedido pronto para o WhatsApp da vendedora. A vendedora cuida das peças, preços, estoque e fotos pela **Área Adm**, no celular ou no computador, sem depender de programador.

Custo: zero. Tudo roda em contas gratuitas do GitHub e do Google.

---

## Como as partes se ligam

```
          CLIENTE                                     VENDEDORA / DONO
             │                                               │
             ▼                                               ▼
  Site da loja (GitHub Pages)                 Área Adm (Google Apps Script)
  https://triokids.github.io/                 https://triokids.github.io/adm.html
             │ lê (CSV publicado)                            │ lê e grava
             ▼                                               ▼
        ┌──────────────── Planilha Google "Trio Kids - Catálogo" ────────────────┐
        │  abas Peças · Config · Campanha · LEIA-ME                              │
        └────────────────────────────────────────────────────────────────────────┘
                                                             │ fotos e catalogo.json
                                                             ▼
                                         Repositório GitHub triokids/triokids.github.io
```

| Peça | Onde fica | Conta |
|---|---|---|
| Site da loja | repositório `triokids/triokids.github.io`, publicado pelo GitHub Pages | GitHub `triokids` |
| Banco de dados | Planilha Google **Trio Kids - Catálogo** | Google da loja |
| Área Adm | projeto Apps Script **Area Adm Trio Kids** (cópia do código na pasta `apps-script/`) | Google da loja |
| Fotos | pasta `fotos/` do repositório, com o nome `<codigo>-N.jpg` | gravadas pela Área Adm |
| Cópia de reserva | `catalogo.json` no repositório | gravada pela Área Adm |

Por que assim: veja `docs/ams/adr/ADR-001-usar-planilha-google-como-painel-e-apps-script-para-fotos.md` (planilha como painel) e `docs/ams/adr/ADR-002-usar-area-da-anne-no-apps-script-com-planilha-como-banco.md` (Área Adm com a planilha como banco).

---

## A página da loja (o que a cliente usa)

Site estático: HTML, CSS e JavaScript puros, sem etapa de build. O GitHub Pages publica os arquivos como estão.

**Páginas**

| Arquivo | O que mostra |
|---|---|
| `index.html` | Início: logo, coleção, faixa da campanha, atalhos por categoria e tamanho, destaques |
| `catalogo.html` | Todas as peças, com filtros (categoria, tamanho, preço) e ordenação |
| `peca.html?c=<codigo>` | Uma peça: galeria de fotos, cores, tamanhos, quantidade, "combina com" |
| `campanha.html` | Regras da campanha Trio Kids Abraça (texto vem da aba Campanha) |
| `tamanhos.html` | Guia de medidas e calculadora de tamanho |
| `sobre.html` | Sobre a loja: missão, visão e valores |
| `adm.html` | Atalho para a Área Adm (só redireciona; não aparece no Google) |

Em todas as páginas há busca no cabeçalho, carrinho em gaveta lateral, botão flutuante do WhatsApp e link do Instagram.

**De onde vêm os dados**

1. O navegador da cliente baixa as abas **Peças**, **Config** e **Campanha** publicadas em CSV (endereços no `config.js`).
2. Se a planilha não responder em 6 segundos, usa o último catálogo guardado no aparelho e, se não houver, o `catalogo.json` do repositório. Nesse caso aparece o aviso "catálogo pode estar desatualizado".
3. O Google atualiza o CSV publicado em até ~10 minutos depois de uma mudança na planilha.

**Regras do catálogo** (detalhes em `dados-iniciais/LEIA-ME.txt`)

- Uma linha da aba Peças = uma peça ou uma cor da peça. Linhas com o mesmo `nome` viram uma peça com seletor de cor.
- Estoque por tamanho (`P, M, G, 1, 2, 3, 4, 6`): vazio = não tem o tamanho, `0` = esgotado, número = unidades.
- `ativo = nao` esconde a peça; peça sem estoque aparece como "esgotada".
- Preço "com a Trio Kids Abraça" = preço × (1 − `desconto_campanha`/100), para peças com `campanha = sim`.

**Carrinho e pedido**

- O carrinho fica guardado no navegador da cliente e é conferido contra o catálogo ao abrir (item esgotado ou com preço mudado é sinalizado).
- "Finalizar pelo WhatsApp" abre `wa.me/<número>` com a mensagem do pedido pronta (itens, total, nome, cidade/bairro e, se marcado, participação na campanha).
- Não há pagamento, frete nem login no site. A venda fecha no WhatsApp.
- O número do WhatsApp está no `config.js` (campo `whatsapp`), não na planilha.

**Código**

| Pasta | Responsabilidade |
|---|---|
| `js/dados/` | baixar e ler o CSV, montar o catálogo, reserva |
| `js/loja/` | regras puras: carrinho, filtros, busca, tamanho, campanha, mensagem do WhatsApp, compra rápida |
| `js/ui/` | HTML dos cartões, layout comum (cabeçalho, gaveta, rodapé), busca |
| `js/paginas/` | uma entrada por página |
| `css/estilo.css` | identidade visual (cores, fontes Comfortaa / EB Garamond / Lato) |
| `config.js` | configuração pública: endereços CSV, WhatsApp, Instagram, `urlAdm` |

---

## A página de administração (Área Adm)

Aplicativo web do Google Apps Script, publicado na conta Google da loja. Abre por https://triokids.github.io/adm.html (que redireciona para o endereço do Google guardado em `urlAdm` no `config.js`).

**Telas**

1. **Entrar:** senha pedida toda vez que a página abre. Nada fica salvo no aparelho. Cinco senhas erradas seguidas bloqueiam por 1 hora.
2. **Minhas peças:** lista com foto, preço e estoque por tamanho; busca e filtros "No site", "Escondidas", "Esgotadas".
3. **Editar peça:** preço, categoria, coleção, descrição, estoque com − / + (ou "não tem"), "aparece no site", "destaque", "campanha", fotos (acrescentar, apagar uma, trocar todas) e "nova cor desta peça".
4. **Nova peça:** nome, cor, preço, categoria, coleção, tamanhos que terá e fotos. O código é gerado sozinho (minúsculas, sem acento, com hífen) e nunca muda depois.

No celular é uma coluna; a partir de 900 px de largura vira grade de cartões e edição em duas colunas.

**O que acontece ao salvar**

- **Peça (preço, estoque, textos, chaves):** grava só os campos alterados, direto na linha da peça na aba Peças, achada pelo código. Categoria, coleção, descrição e destaque valem para todas as cores de mesmo nome. Aparece no site em até ~10 minutos.
- **Fotos:** o navegador reduz a foto (1600 px, JPEG), o script grava `fotos/<codigo>-N.jpg` no GitHub num único commit (com a mensagem "Fotos: <codigo>"), atualiza a coluna `fotos` e regrava o `catalogo.json`. Aparece em alguns minutos.
- **Nunca apaga peça:** para tirar do site, desligue "aparece no site".
- Texto que começa com `=`, `+`, `-` ou `@` é gravado como texto, nunca como fórmula.

**Configuração (Apps Script → Configurações do projeto → Propriedades do script)**

| Propriedade | Para quê |
|---|---|
| `SENHA_FORMULARIO` | senha da Área Adm (dono e vendedora) |
| `GITHUB_TOKEN` | token fine-grained, só este repositório, permissão Contents: Read and write (vence em um ano) |
| `GITHUB_DONO`, `GITHUB_REPO`, `GITHUB_BRANCH` | `triokids`, `triokids.github.io`, `main` |
| `PLANILHA_ID` | ID da planilha Trio Kids - Catálogo |
| `EMAIL_DONO` | recebe e-mail se algo falhar |

Senha, token e e-mail ficam **só** ali. Nunca no repositório, que é público.

**Rotina automática:** o gatilho diário `gerarReserva` (por volta das 6h) confere a planilha e atualiza o `catalogo.json` se algo mudou.

**Código**

| Arquivo | Responsabilidade |
|---|---|
| `apps-script/Codigo.gs` | funções chamadas pela página (`entrar`, `listarPecasArea`, `salvarPeca`, `criarPeca`, `enviarFotos`, `apagarFoto`), planilha, GitHub, e-mail |
| `apps-script/Logica.gs` | regras puras (código da peça, validação, passe de entrada, renumerar fotos), testadas no Node |
| `apps-script/Area.html` | a página da Área Adm (HTML, CSS e JS sem dependências) |
| `apps-script/appsscript.json` | manifesto: fuso, permissões, app da Web "Executar como: eu / Qualquer pessoa" |

---

## Como mudar o código

**Site:** edite os arquivos, rode os testes e envie ao `main`. O GitHub Pages publica em ~1 minuto.

**Área Adm:** a pasta `apps-script/` é a fonte, mas quem roda é o projeto no Google. Depois de mudar:

1. Copie o conteúdo de cada arquivo alterado para o arquivo de mesmo nome no projeto **Area Adm Trio Kids**.
2. **Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar.** O endereço continua o mesmo.

**Testes:** `npm test` (Node 18+, sem dependências). Cobrem a lógica do site e a do Apps Script (com dublês dos serviços Google em `tests/dubles-google.js`).

---

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Área Adm mostra "Não foi possível abrir o arquivo" (Google Drive) no computador | Chrome com várias contas Google; o Google usa a conta principal | Abra numa janela anônima ou num perfil só com a conta da loja. No celular não acontece |
| `adm.html` diz "Área Adm ainda não foi configurada" | `urlAdm` vazio ou errado no `config.js` | Cole o endereço `/exec` da implantação |
| Mudança não aparece no site | cache do CSV publicado | Espere até 10 minutos e atualize a página |
| Site mostra "catálogo pode estar desatualizado" | planilha não respondeu | Confira se as abas continuam publicadas (Arquivo → Compartilhar → Publicar na Web) |
| Foto não sobe / e-mail de erro do script | token do GitHub vencido ou sem permissão | Gere um token novo e troque `GITHUB_TOKEN` |

---

## Documentos

- `docs/guia-do-dono.md` — passo a passo completo de configuração, para quem não é de tecnologia
- `dados-iniciais/LEIA-ME.txt` — regras da planilha para a vendedora (também na aba LEIA-ME)
- `docs/ams/adr/` — decisões de arquitetura
- `docs/superpowers/specs/` e `docs/superpowers/plans/` — desenhos e planos de cada funcionalidade
