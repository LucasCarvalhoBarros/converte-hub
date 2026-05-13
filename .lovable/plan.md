# Conectar app à API de Workspaces

A tela `Clientes` (`/config/clientes`) já consome `GET/POST/PATCH/DELETE /workspaces` via `src/lib/clients.ts`. Falta plugar o restante do app, que ainda usa a lista fixa em `src/lib/workspace.ts`.

## Mudanças

### 1. `src/lib/workspace.ts`
- Remover o array fixo `WORKSPACES`.
- Reaproveitar o cache de `src/lib/clients.ts` (`fetchClients`, `getClients`, `onClientsChange`) como fonte única.
- Manter as funções `getStoredWorkspaceId` / `setStoredWorkspaceId` / `onWorkspaceChange` (id continua em `localStorage`, agora como `string` numérico).
- Expor helpers derivados: `getCurrentWorkspace()` e `listWorkspaces()` que mapeiam `Client` → `Workspace` (id, name, phone, avatarColor gerado por hash do id para manter visual consistente).
- Se ainda não houver cliente carregado, disparar `ensureClientsLoaded()`.

### 2. `src/components/WorkspaceSwitcher.tsx`
- Trocar import de `WORKSPACES` por estado local alimentado por `ensureClientsLoaded()` + `onClientsChange()`.
- Mostrar estado de loading (skeleton no botão) enquanto carrega.
- Se a lista vier vazia, mostrar CTA "Cadastrar cliente" linkando para `/config/clientes`.
- Ao trocar, validar se o id atual ainda existe; se não, cair no primeiro disponível.
- Filtrar somente clientes `active === true` na lista do popover.

### 3. `src/lib/api.ts`
- Trocar `wsParam()` (hoje hardcoded em `"1"`) por `getStoredWorkspaceId()` para que todas as chamadas (`/conversas/leads...`) usem o workspace selecionado.
- Adicionar listener: ao trocar workspace (`onWorkspaceChange`), invalidar caches que dependam do workspace (se houver). Caso contrário, basta a próxima request usar o novo id.

### 4. Inicialização (`src/App.tsx` ou `AppShell`)
- Chamar `ensureClientsLoaded()` no boot para popular o switcher antes do primeiro render do header.

## Detalhes técnicos

- `Workspace.id` passa a ser `string(Number)` para compatibilidade com chamadas existentes.
- `avatarColor` derivado: paleta fixa `["from-primary to-primary-glow", "from-status-cliente to-success", "from-status-qualificado to-primary", ...]` indexada por `id % paleta.length`.
- Sem mudanças de UI fora do switcher; o popover mantém o visual atual.
- Sem mudanças de schema ou backend — apenas consumo do endpoint já publicado.

## Fora de escopo

- Multi-tenant real (RBAC, permissões por workspace) — continua client-side.
- Refresh automático periódico da lista de workspaces.
