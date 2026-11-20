# Área da Anne (administração de peças) — design

Data: 20/11/2026 · Emenda o ADR-001 por meio do ADR-002 (`docs/ams/adr/ADR-002-usar-area-da-anne-no-apps-script-com-planilha-como-banco.md`). Esboço aprovado pelo dono: `.superpowers/brainstorm/1450-1795190412/content/telas-area-anne.html` (pasta privada, não vai ao repositório).

## Intenção e porquê

A vendedora (Anne) precisa atualizar os produtos do site (peças, preço, estoque por tamanho e fotos) sem depender do desenvolvedor, pelo celular, numa tela bonita e fácil, com custo zero. Hoje ela já poderia editar a planilha, mas no celular são 19 colunas, o código da peça nova é feito à mão (erro quebra foto e carrinho) e foto e cadastro ficam em lugares diferentes.

## Objetivos, não-objetivos, anti-objetivos

Objetivos
- Entrar com senha, pedida toda vez que abrir a Área.
- Ver todas as peças (foto, preço, estoque por tamanho, se está no site, se está esgotada), com busca e filtros "No site / Escondidas / Esgotadas".
- Editar preço, categoria, coleção, descrição, estoque por tamanho (− / +, "não tem"), "aparece no site", "destaque" e "campanha".
- Fotos dentro da edição: acrescentar, apagar uma, trocar todas.
- Cadastrar peça nova (nome, cor, preço, categoria, tamanhos que terá, fotos) com o código gerado sozinho; atalho "nova cor desta peça".
- Tudo grava na aba Peças da planilha. O site público não muda.

Não-objetivos
- Apagar peça (esconder com "aparece no site" basta e não quebra carrinhos nem links).
- Editar as abas Config e Campanha pela Área (continua na planilha).
- Senha por pessoa, histórico de quem mudou o quê.
- Baixa automática de estoque.

Anti-objetivos
- Senha ou token no repositório público.
- A Área gravar fórmula na planilha a partir de texto digitado (ex.: nome começando com `=`).
- Código repetido ou mudança de código de peça existente.
- Peça aparecer no site com dado inválido (preço vazio, estoque negativo).

## Restrições

- Mesmo projeto Apps Script do formulário de fotos (ADR-001): Planilha Google como banco, GitHub para fotos, `catalogo.json` de reserva, custo zero.
- Script Properties como hoje; a senha continua em `SENHA_FORMULARIO`.
- Site sem build; nenhuma mudança no site público.

## Abordagens

| Abordagem | Troca | Escolha |
|---|---|---|
| A. Planilha mais segura (validações, código gerado por gatilho) | Barata; ela continua editando planilha no celular | Descartada |
| **B. Área da Anne no Apps Script, planilha como banco** | Custo zero, tela própria; amplia o código do script | **Escolhida pelo dono** |
| C. Banco próprio (Firebase/Supabase) | Login e regras próprias, manutenção; Supabase grátis pausa | Descartada (ADR-001 já recusou) |

## Decidido

- **Login**: uma senha só (`SENHA_FORMULARIO`), compartilhada por dono e Anne (recomendação do Claude; o dono respondeu "pode implementar" sem escolher). Mantém a trava de 5 erros = 1 hora bloqueado.
- **Senha toda vez que entrar** (pedido do dono, 20/11/2026): nada fica salvo no celular. Ao acertar a senha, o servidor devolve um passe `validade.assinatura` (HMAC-SHA256 de `validade` com a chave `SENHA_FORMULARIO`, validade de 8 horas) que fica só na memória da página. Toda chamada ao servidor leva o passe e é recusada se vencido ou com assinatura errada. Fechar ou recarregar a página, ou tocar em "Sair", pede a senha de novo. Trocar a senha derruba todos os passes.
- **Telas**: as quatro do esboço (Entrar, Minhas peças, Editar peça, Nova peça), mesma identidade do site e do formulário atual.
- **Gravação**: cada "Salvar" altera só as colunas conhecidas da linha da peça, achada pelo `codigo`, sob `LockService`. Peça nova vai para a última linha (vira novidade). Preço gravado como número; estoque como inteiro ≥ 0 ou vazio ("não tem"). Texto que começa com `=`, `+`, `-` ou `@` é gravado com apóstrofo na frente (não vira fórmula).
- **Código**: gerado de `nome` + `cor` em minúsculas, sem acento, com hífen; se já existir, acrescenta `-2`, `-3`… Nunca muda depois de criado.
- **Fotos**: reaproveitam o envio atual (um envio = um commit, gera `catalogo.json`). "Apagar uma foto" apaga a N e renumera as seguintes no mesmo commit (reaproveitando o conteúdo já no GitHub). Miniaturas lidas do site publicado (`<URL_SITE>/fotos/<codigo>-N.jpg`); foto nova pode levar alguns minutos para aparecer.
- **Arquivo**: `apps-script/Formulario.html` dá lugar a `apps-script/Area.html`; o formulário de fotos antigo deixa de existir (tudo está na Área). O endereço da implantação continua o mesmo.
- **Lógica pura** (código, validação, montagem da linha, passe) fica em `Logica.gs`, testada no Node como hoje.

## Fica a cargo de quem constrói

Estrutura interna do HTML/JS da página, mensagens de erro, animações leves, ordem dos campos dentro do que o esboço mostra.
