# Cartão de produto com Comprar e Espiar — design curto

Aprovado pelo Kaique em 2026-11-20 ("pode fazer"). Referência: https://clarabellastore.com.br/produtos/

## Intenção

Na listagem de produtos, ao passar o mouse sobre um cartão, aparecem dois botões sobre a foto:
**Comprar** e **Espiar**. A cliente compra ou olha a peça sem sair da tela onde está.

## Decisões

- **Onde:** em todo lugar que usa `htmlCartao` (catálogo, início, "Combina com" da página da peça).
- **Estrutura do cartão:** hoje é um `<a>` inteiro. Passa a ser um `<article class="cartao">` com
  a foto e o nome como links para `peca.html?c=...` e os botões por cima da foto (botão dentro de link é HTML inválido).
- **Desktop (mouse):** botões aparecem no hover e no foco do teclado (`:hover`, `:focus-within`).
- **Celular / sem hover (`@media (hover: none)`):** botões sempre visíveis.
- **Comprar:**
  - peça com uma variante → abre no próprio cartão a lista de tamanhos com estoque; clicar num
    tamanho adiciona 1 unidade ao carrinho e abre a gaveta do carrinho. Botão "voltar"/Esc fecha a lista.
  - peça com mais de uma variante (cores) → abre o Espiar (precisa escolher a cor).
- **Espiar:** janela (diálogo modal) sobre a página com galeria, nome, seletor de cor, preço (com campanha),
  tamanhos, quantidade, "Adicionar ao carrinho" e link "Ver detalhes" para a página da peça.
  Reaproveita `htmlGaleria`, `htmlSeletorTamanho`, `htmlSeletorCor`. Fecha com ×, Esc e clique no fundo;
  prende o foco e devolve o foco ao botão que abriu. Ao adicionar, fecha e abre a gaveta do carrinho.
- **Peça esgotada:** só Espiar.
- **Mensagens de erro do carrinho** (limite de estoque, esgotou): mesmas da página da peça.

## Abordagens consideradas

1. **Comprar escolhe tamanho no cartão + Espiar em janela (escolhida).** A cliente não sai do catálogo.
2. Comprar leva à página da peça: mais simples, mas tira a cliente da listagem; descartada.
3. Comprar e Espiar abrem a mesma janela: duplica função, o botão Comprar perde sentido; descartada.

## Não-objetivos

- Troca de foto no hover (segunda foto) — fica fora.
- Mudar o carrinho, a gaveta ou a mensagem do WhatsApp.

## Restrições

- Sem build, sem dependência; HTML como string em `js/ui/html.js` (funções puras testadas com `node --test`).
- Toda lógica do carrinho continua em `js/loja/carrinho.js`; os componentes não gravam nada direto.
- Acessibilidade no nível atual do site: alvos de 44–48px, `aria-*`, foco visível, `prefers-reduced-motion`.
- Cores só da paleta em `css/estilo.css`.

## Deixado para o implementador

- Animação de entrada dos botões (curta, respeitando `prefers-reduced-motion`).
- Texto exato dos rótulos acessíveis (ex.: "Comprar Vestido X", "Espiar Vestido X").
