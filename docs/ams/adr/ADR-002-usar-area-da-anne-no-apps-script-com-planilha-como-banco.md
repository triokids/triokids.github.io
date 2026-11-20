# ADR-002 - Usar Área da Anne no Apps Script com planilha como banco

**Status:** Aceito
**Data:** 20/11/2026

## Contexto
A vendedora precisa atualizar peças, preço, estoque e fotos sem depender do desenvolvedor, pelo celular e sem custo. Editar a planilha no celular é difícil (19 colunas) e o código da peça nova feito à mão quebra foto e carrinho se sair errado.

- ADR-001 deixava painel próprio fora do escopo; fotos e cadastro ficavam em lugares diferentes

---

## Decisao
O formulário de fotos vira a Área da Anne: aplicativo web no mesmo Apps Script, com a Planilha Google como banco.

- telas: entrar, minhas peças (busca e filtros), editar peça, nova peça
- edita preço, categoria, coleção, descrição, estoque por tamanho, ativo, destaque, campanha e fotos (acrescentar, apagar uma, trocar todas)
- grava só as colunas conhecidas da aba Peças, linha achada pelo código, sob LockService; peça nova entra na última linha
- código gerado de nome + cor (minúsculas, sem acento, hífen, sufixo -2, -3 se repetir); nunca muda depois de criado
- texto iniciado por `=`, `+`, `-` ou `@` é gravado com apóstrofo, para não virar fórmula
- uma senha só (`SENHA_FORMULARIO`), pedida toda vez que entrar; passe HMAC de 8 horas só na memória da página; 5 erros bloqueiam por 1 hora
- sem apagar peça: esconder com "aparece no site"
- Config e Campanha continuam editadas na planilha; site público não muda

---

## Consequencias
- vendedora cadastra e atualiza peças sozinha, numa tela só, pelo celular
- custo continua zero (Apps Script, Planilha, GitHub Pages)
- planilha segue como visão do dono e como reserva
- cada gravação leva 1 a 2 segundos e aparece no site em até ~10 minutos
- uma senha compartilhada: tirar o acesso da vendedora exige trocar a senha
- mais código no Apps Script para manter; mudança exige nova versão da implantação

---

## Alternativas consideradas
- Planilha mais segura (validações e código por gatilho) - vendedora continua editando planilha no celular
- Banco próprio (Firebase ou Supabase) - login, regras e manutenção; Supabase grátis pausa sem uso
- Excel no OneDrive - não integra com Apps Script e complica a publicação
- Senha por pessoa - mais trabalho para uma loja de duas pessoas
- Sessão de 30 dias no celular - dono pediu senha a cada entrada

---

## Referencias
- `ADR-001-usar-planilha-google-como-painel-e-apps-script-para-fotos.md`
- `docs/superpowers/specs/2026-11-20-area-da-anne-design.md`
- Convencao de nome: `ADR-NNN` — tres digitos, minusculas e tracos, sem prefixo; a serie `ADR-LOCAL-*` foi aposentada (ADR-009). Ver `docs/ams/adr/README_ADR.md`.
