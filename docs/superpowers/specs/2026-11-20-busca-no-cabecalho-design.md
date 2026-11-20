# Busca no cabeçalho (design curto)

Aprovado pelo dono em 2026-11-20.

## Intenção

Deixar a cliente achar uma peça digitando, como faz a loja de referência
(clarabellastore.com.br): um campo no cabeçalho com sugestões enquanto digita.
A logo continua à esquerda e o campo fica centralizado.

## Objetivos

- Campo "O que você está buscando?" no cabeçalho de todas as páginas.
- Sugestões a partir de 2 letras, no máximo 5, com foto, nome e preço; peça esgotada marcada "esgotado".
- Último item "Ver todos os resultados"; Enter faz o mesmo: abre `catalogo.html?busca=<termo>`.
- O catálogo lê `busca` da URL e filtra junto com categoria, tamanho e preço; o contador e "Limpar filtros" consideram a busca.
- A busca ignora acento e maiúscula e compara nome, categoria, cor (das variantes) e coleção. Todas as palavras do termo precisam aparecer.
- Teclado: setas ↑/↓ percorrem as sugestões, Enter abre a sugestão escolhida, Esc fecha. Padrão combobox (ARIA 1.2) com `aria-activedescendant`.

## Fora do escopo

- Busca no servidor, histórico de buscas, correção de erro de digitação.
- Copiar visual ou código da loja de referência.

## Abordagens

1. **Busca no catálogo já carregado (escolhida):** `montarLayout` já tem o catálogo; a busca é uma função pura sobre ele. Não precisa de servidor e respeita o ADR-001 (planilha como fonte).
2. Índice de busca pré-gerado em JSON pelo script de carga: mais rápido com milhares de peças, mas o catálogo tem dezenas; complica a carga sem ganho.
3. Página `busca.html` separada: duplica o catálogo; o filtro `busca` no próprio catálogo reaproveita grade e filtros.

## Layout

- Computador (>= 768px): uma linha `[logo] [campo centralizado, até 520px] [instagram][carrinho]`, menu embaixo.
- Celular: linha da logo e ícones; campo em linha própria, largura total; menu embaixo.
- Lista de sugestões fica sob o campo, sobre o conteúdo, com as cores e fontes da Trio Kids.

## Para o implementador

- Lógica pura e testável em `js/loja/busca.js` (normalizar, casar, sugerir).
- `lerFiltrosDaUrl`/`filtrosParaUrl` e `filtrarPecas` ganham `busca`.
- Montagem do campo e das sugestões em `js/ui/layout.js` (ou módulo `js/ui/busca.js` chamado por ele).
- No catálogo, o campo do cabeçalho vem preenchido com o termo atual.
