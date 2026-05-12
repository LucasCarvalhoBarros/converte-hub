## Renomeação de rótulos no app

Apenas mudanças de UI/textos — sem alterar lógica, endpoints ou nomes de campos no backend.

### Mapeamento

- "Momento do lead" / "Momento" → **Status do funil**
- "Status" (a característica fixa: novo lead, em atendimento, interessado, quente, cliente, perdido) → **Característica do lead**

A rota `/config/status` continua sendo a tela de configuração do **Status do funil** (já é).

### Alterações por arquivo

**`src/pages/Leads.tsx`**
- Linha 79: toast `Momento atualizado…` → `Status do funil atualizado para {label}`
- Linha 136 (export PDF): cabeçalho `["Nome","Telefone","Status","Momento",…]` → `["Nome","Telefone","Característica","Status do funil",…]`
- Linha 234 e 240 (toasts de status fixo): `Status atualizado…` → `Característica atualizada para {label}`
- Linha 808: label `Status` no painel de detalhes → `Característica do lead`
- Linha 831: label `Momento do lead` → `Status do funil`
- Filtros / chips na linha ~554 que mostram "Todos / Novo lead / …": manter labels dos status, mas o título/legenda do filtro (se houver "Status") passa a ser "Característica".
- Comentário linha 24: já diz "Status do funil" — manter.

**`src/pages/StatusConfig.tsx`**
- Texto auxiliar linha 164: substituir "momentos" por "status do funil" para ficar coerente.
- Restante já usa "status do funil".

**`src/components/AppShell.tsx`**
- Item de menu "Status do funil" já está correto — manter.

**`src/lib/types.ts`**
- Sem mudança nos identificadores (`LeadStatus`, `STATUS_META`). Apenas comentário opcional indicando que esse enum representa a "Característica do lead".

### Fora de escopo
- Renomear tipos/variáveis no código (`LeadStatus`, `moments`, `updateLeadStatus`) — manter para não quebrar nada.
- Endpoints e payloads do backend.
