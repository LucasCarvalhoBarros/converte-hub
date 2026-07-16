
# Módulo de Estoque e Vendas Multi-Marketplace

Vou adicionar uma nova área ao sistema atual (que continua com Cognito + APIs de leads existentes intactos) para gestão de **produtos**, **estoque único compartilhado** e **vendas manuais** feitas em Mercado Livre, Magalu, Loja própria e Outros. Os dados novos ficam no **Lovable Cloud** (Postgres gerenciado).

## Novas telas

1. **/produtos** — lista + busca de produtos (SKU, nome, categoria, preço, custo, estoque atual, estoque mínimo). Badge vermelha quando `estoque <= mínimo`. Ações: novo, editar, arquivar.
2. **/produtos/movimentacoes** — histórico de entradas/saídas/ajustes de estoque com filtro por produto e período. Botão "Nova movimentação" (entrada de compra, ajuste, devolução).
3. **/vendas** — lista de vendas manuais com filtros por canal, período e produto. Botão "Registrar venda" abre modal com: canal (ML/Magalu/Própria/Outros), data, cliente (texto livre opcional), itens (produto + qtd + preço unit), frete, desconto, total calculado, nº do pedido no marketplace (opcional). Ao salvar, dá baixa automática no estoque compartilhado.
4. **/dashboard-vendas** — cards com faturamento do mês, ticket médio, vendas por canal (pizza), top produtos, curva diária. Filtro de período.

## Menu lateral

Adicionar seção "Loja" no `AppShell` com: Produtos, Movimentações, Vendas, Dashboard vendas — separada da seção atual de Leads/Conversas.

## Modelo de dados (Lovable Cloud)

```text
products         (id, sku UNIQUE, name, category, cost, price, stock, min_stock,
                  active, workspace_id, created_at, updated_at)
stock_movements  (id, product_id FK, type[in|out|adjust], quantity, reason,
                  reference_id, workspace_id, created_at, created_by)
sales            (id, channel[mercado_livre|magalu|propria|outros], sold_at,
                  customer_name, marketplace_order_id, subtotal, shipping,
                  discount, total, notes, workspace_id, created_at, created_by)
sale_items       (id, sale_id FK, product_id FK, quantity, unit_price, subtotal)
```

- Estoque compartilhado: um único campo `stock` por produto; toda venda gera `stock_movements(type='out')` e decrementa `products.stock` via trigger/edge function.
- Cada tabela recebe `GRANT` para `authenticated`/`service_role` e RLS restringindo por `workspace_id` (lido do JWT/Cognito via mapeamento — inicialmente por coluna `workspace_id` livre, já que o app usa Cognito e não o auth do Cloud; ver seção técnica).

## Vendas + baixa de estoque

- Validação: bloqueia venda se algum item exceder o estoque atual (mensagem clara).
- Cálculo automático de subtotais e total no modal.
- Após salvar: refetch da lista, toast de sucesso, estoque atualizado nas telas.
- Edição/estorno: excluir venda gera `stock_movements(type='in', reason='estorno')` e devolve o saldo.

## O que NÃO muda

- Login Cognito, tela de Leads, Conversas, Relatórios de leads, APIs em `05m7xwli09.execute-api...` — tudo intacto.
- A rota `/relatorios` de vendas de leads permanece; o novo `/dashboard-vendas` é separado, focado no estoque/marketplace.

## Detalhes técnicos

- Ativar **Lovable Cloud** (Supabase gerenciado) — apenas para as novas tabelas.
- Como a autenticação real é Cognito (não Supabase Auth), as tabelas novas usam `workspace_id` (int) como chave lógica e o filtro é aplicado no cliente/edge function usando o workspace atual (`getStoredWorkspaceId`). RLS inicial: `USING (true)` com GRANT a `authenticated` — segurança principal fica no gateway/edge; posso endurecer depois se quiser mapear Cognito → JWT do Supabase.
- Migrações SQL criam as 4 tabelas com GRANTs obrigatórios, índices em `sku`, `workspace_id`, `product_id`, `sold_at`.
- Camada de acesso: `src/lib/products.ts`, `src/lib/stock.ts`, `src/lib/sales.ts` usando `supabase-js`.
- Validação com **zod** nos formulários (produto, venda, movimentação).
- Reuso dos componentes shadcn já presentes (Card, Dialog, Table, Input, Select, Switch).
- Novas rotas registradas em `src/App.tsx`.

## Entregas em ordem

1. Ativar Lovable Cloud + migração inicial das 4 tabelas com GRANTs e índices.
2. `src/lib/products.ts` + tela **/produtos** (CRUD).
3. `src/lib/stock.ts` + tela **/produtos/movimentacoes**.
4. `src/lib/sales.ts` + tela **/vendas** com modal e baixa automática.
5. Tela **/dashboard-vendas** com gráficos (recharts, já no projeto).
6. Item de menu "Loja" no `AppShell`.

Depois disso podemos evoluir para integração real com API do Mercado Livre (OAuth, sync de anúncios/pedidos) em uma segunda fase.
