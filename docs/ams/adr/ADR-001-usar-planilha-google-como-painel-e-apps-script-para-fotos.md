# ADR-001 - Usar planilha Google como painel e Apps Script para fotos

**Status:** Aceito
**Data:** 20/11/2026

## Contexto
A loja precisa de um painel gratuito para gerenciar peças, preço, fotos e estoque por tamanho, operado por pessoa leiga pelo celular, num site estático no GitHub Pages.

- dono sem conhecimento de infraestrutura; vendedora pode cadastrar sem saber programar
- venda fecha no WhatsApp (wa.me), sem pagamento nem login no site

---

## Decisao
O painel é uma Google Planilha publicada em CSV; fotos entram por formulário Google Apps Script.

- planilha da conta do dono, uma linha por peça, colunas `codigo | nome | preco | ativo | <tamanhos>`; vazio = não tem o tamanho, 0 = esgotado
- acesso à planilha por conta Google: vendedora convidada como editora; site lê só a versão publicada
- quem cadastra peças e fotos é a vendedora; formulário entra na primeira entrega
- site lê o CSV no navegador; se falhar, usa o último catálogo do localStorage e, depois, `catalogo.json` do repositório, com aviso de catálogo desatualizado
- formulário de fotos confere senha e código, reduz a foto no navegador (~1600 px) e grava `fotos/<codigo>-N.jpg` no repositório com token fine-grained restrito ao repositório (só Contents)
- senha do formulário guardada só nas Script Properties, nunca no repositório (público)
- um envio = um commit, por causa do limite de 10 builds/hora do Pages
- o mesmo script gera `catalogo.json` após cada envio e uma vez por dia, e avisa o dono por e-mail se falhar
- endereço da foto montado numa única função do site
- teste de 2 horas no celular real antes de construir o resto

---

## Consequencias
- custo zero, só contas Google e GitHub do dono
- vendedora cadastra sem conta GitHub e sem acesso ao token
- acesso da vendedora à planilha pode ser retirado a qualquer momento pelo dono
- mudanças aparecem no site em até ~10 minutos (cache do CSV)
- catálogo não some para visitante novo se o CSV falhar
- token do GitHub pode precisar de renovação anual
- comportamento do envio no celular só é confirmado no teste

---

## Alternativas consideradas
- Dono subir fotos pelo GitHub - vira gargalo manual com falhas silenciosas
- Cloudinary com upload sem assinatura - preset público permite estranhos subirem imagens na vitrine de loja infantil
- Fotos no Google Drive - link direto em `<img>` dá 403 desde 2024
- Decap CMS - login no GitHub Pages exige serviço OAuth externo
- Supabase ou Firebase com painel próprio - custo de construir e manter alto para uma loja pequena
- JSON editado no GitHub - fácil de quebrar por leigo no celular
- Nuvemshop - troca o carrinho wa.me pelo checkout da plataforma

---

## Referencias
- `_rodadas/2026-11-20-0826/analises/sintese.md` e `contra.md`
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://developers.google.com/apps-script/guides/services/quotas
- Convencao de nome: `ADR-NNN` — tres digitos, minusculas e tracos, sem prefixo; a serie `ADR-LOCAL-*` foi aposentada (ADR-009). Ver `docs/ams/adr/README_ADR.md`.
