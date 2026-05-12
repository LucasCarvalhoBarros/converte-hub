## Objetivo

Substituir o `src/lib/moments.ts` (hoje em localStorage) por chamadas HTTP aos endpoints `/funil/status` já prontos no backend, mantendo o comportamento da tela `StatusConfig` (criar, editar, excluir, reordenar com "Salvar alterações") e ajustando o consumo em `Leads.tsx`.

## O que vai mudar

1. **`src/lib/moments.ts` — reescrita completa**
   - Remover toda persistência em localStorage (inclusive `LEAD_MOMENT_KEY` e os defaults).
   - Novo tipo:
     ```ts
     type Moment = {
       id: number;          // vem do backend
       code: string;        // identificador lógico
       label: string;
       color: string;       // hex (#rrggbb)
       order: number;
       active?: boolean;
     }
     ```
   - Novas funções (todas usando `workspace` via `getStoredWorkspaceId()` em `?workspace={id}`):
     - `fetchMoments(): Promise<Moment[]>` → `GET /funil/status`
     - `createMoment({ code, label, color, order }): Promise<Moment>` → `POST`
     - `updateMoment(id, patch): Promise<void>` → `PATCH /funil/status/{id}`
     - `deleteMoment(id): Promise<void>` → `DELETE /funil/status/{id}`
     - `reorderMoments(items: {id:number; order:number}[]): Promise<void>` → `PUT /funil/status/reorder`
   - Manter `onMomentsChange` (event bus simples) para o `Leads.tsx` recarregar quando algo mudar.
   - Remover `getLeadMoment` / `setLeadMoment` (associação lead↔momento). Não há endpoint para isso ainda; o `Leads.tsx` deixará de exibir/salvar o "Momento do lead" até existir backend (ver item 3).

2. **`src/pages/StatusConfig.tsx` — integrar à API**
   - Carregar lista no `useEffect` via `fetchMoments()` (com loading + tratamento de erro via `toast`).
   - Recarregar ao trocar de workspace (`onWorkspaceChange`).
   - **Criar:** chamar `createMoment` e dar push no resultado retornado (com `id` do backend). Gerar `code` a partir do label (UPPER_SNAKE, sem acento) já que o backend exige.
   - **Renomear/cor:** marcar item como "dirty" no estado local; ao clicar **Salvar alterações**, disparar `PATCH` apenas para itens alterados, em paralelo (`Promise.all`).
   - **Excluir:** chamar `deleteMoment` imediatamente (com confirmação) e remover do estado.
   - **Reordenar:** apenas local (setas ↑/↓). Ao clicar **Salvar alterações**, enviar `PUT /funil/status/reorder` com `[{id, order}]` baseado na ordem atual.
   - O botão **Salvar alterações** passa a fazer: PATCHs pendentes + reorder, em sequência, com toast de sucesso/erro.
   - Trocar `COLOR_OPTIONS` para usar valores **hex** (compatíveis com o backend). Sugestão de paleta equivalente aos tokens atuais:
     - Azul `#3498db`, Roxo `#9b59b6`, Âmbar `#f1c40f`, Vermelho `#e74c3c`, Verde `#2ecc71`, Cinza `#95a5a6`.
   - O "dot" passa a usar `style={{ background: m.color }}` direto (já é hex).

3. **`src/pages/Leads.tsx` — ajustes mínimos**
   - Substituir `getMoments` por `fetchMoments` no `useEffect` inicial e no `onMomentsChange`.
   - Trocar tipos: `id` agora é `number`; ajustar comparações (`moments.find(x => String(x.id) === momentId)`).
   - Como não há mais persistência de "momento do lead", remover do PDF e do painel de detalhes a seção "Momento do lead" **OU** manter apenas em memória (estado `leadMoments` em memória, sem `localStorage`). 
     - **Recomendação:** manter em memória apenas durante a sessão (mais simples, mantém UI atual; some ao recarregar). Confirmar preferência abaixo.

4. **Workspace**
   - Todas as chamadas leem `getStoredWorkspaceId()` na hora da requisição (suporta troca de workspace sem reload).

## Detalhes técnicos

- Helper `tryFetch` similar ao de `src/lib/api.ts`, mas que **lança** erro (para o toast informar a falha) em vez de engolir.
- `code` no `createMoment` derivado do label: `label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_')`.
- Estado em `StatusConfig` ganha `dirtyIds: Set<number>` para PATCH seletivo, e `originalOrder` para detectar se o reorder mudou.
- Limpar a chave `converte_ai:moments` e `converte_ai:lead_moments` do localStorage no boot do app (one-shot) para não deixar lixo.

## Pergunta antes de implementar

Sobre o "Momento do lead" exibido no detalhe do lead em `Leads.tsx`: como o backend novo só cobre o **catálogo** de status (não a associação lead↔status), prefere:
- (a) manter o seletor funcionando só em memória da sessão (some ao recarregar), **ou**
- (b) ocultar o seletor por enquanto até existir endpoint de associação?
