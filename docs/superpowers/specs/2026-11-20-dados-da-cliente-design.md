# Dados da cliente no carrinho e aba Pedidos — design curto

Data: 20/11/2026 · Aprovado pelo dono ("pode seguir"). Precisa de ADR-003 (a loja passa a guardar dados de clientes) antes de implementar. Projeto separado, depois da Área Adm (ADR-002).

## Intenção e porquê
Clientes reclamam de digitar o endereço toda vez. O dono também quer os dados na planilha, com o telefone como identificação da cliente.

## Decidido
- Carrinho pede: nome, telefone (WhatsApp), endereço completo — rua, número, complemento, bairro, cidade, CEP. O endereço completo com CEP vai na mensagem do WhatsApp.
- Caixa "Lembrar meus dados neste aparelho" (marcada por padrão) guarda esses campos no `localStorage` do aparelho e preenche sozinho na próxima visita; desmarcar ou "esquecer meus dados" apaga.
- Ao "Finalizar pelo WhatsApp", o site também envia o pedido ao Apps Script, que grava uma linha na aba nova **Pedidos** (data, telefone, nome, endereço, CEP, itens, total, campanha). Só escrita: o servidor nunca devolve dados de cliente ao site.
- **Sem login e sem preencher endereço a partir do telefone** (qualquer um que soubesse o número veria o endereço de outra pessoa). Telefone é a chave da cliente só para a loja, na planilha.
- Aviso no carrinho: "Seus dados são usados só para a entrega e ficam com a Trio Kids."
- Falha ao gravar o pedido na planilha não impede abrir o WhatsApp.
- Custo zero (mesmo Apps Script e planilha).

## Não-objetivos
Login, senha, conta, recuperar dados em outro aparelho, histórico visível para a cliente.

## Fica para o design completo / ADR-003
Proteção contra envio em massa (limite por CacheService, validação), aba Pedidos fora da publicação em CSV, prazo de guarda e pedido de exclusão (LGPD), busca de CEP (ViaCEP) opcional.
