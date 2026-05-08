# Plano: CRUD de Plataformas (origens de anúncio)

Vou criar uma nova tela `/config/plataformas` para gerenciar as plataformas (Meta, Google, TikTok, etc.) e plugar o dropdown da tela de Anúncios para consumir esse cadastro vindo da sua API, em vez do array fixo `PLATFORMS`.

## APIs que você precisa criar

Mesmo padrão das APIs de Ads (com query string `?workspace=`), só que não precisa de workspace se a tabela for global. **Me confirme**: a tabela de plataformas é **global** (compartilhada entre todos workspaces) ou **por workspace**? Vou assumir **global** abaixo — se for por workspace, basta acrescentar `?workspace={id}` em todas, igual ao Ads.

Base URL sugerida: `https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod`

### 1. `GET /platforms`
Lista todas as plataformas.
**Resposta 200:**
```json
[
  { "id": 1, "code": "meta",   "name": "Meta Ads",   "active": true },
  { "id": 2, "code": "google", "name": "Google Ads", "active": true },
  { "id": 3, "code": "tiktok", "name": "TikTok Ads", "active": false }
]
```

### 2. `POST /platforms`
**Body:**
```json
{ "code": "tiktok", "name": "TikTok Ads", "active": true }
```
**Resposta 201:** `{ "id": 3 }` (ou o objeto completo)
**Erros:** 400 se `code` duplicado → `{ "error": "code já existe" }`

### 3. `PATCH /platforms/{id}`
**Body** (campos opcionais):
```json
{ "name": "Meta", "code": "meta", "active": false }
```
**Resposta 200:** `{ "ok": true }`

### 4. `DELETE /platforms/{id}`
**Resposta 200:** `{ "ok": true }`
**Cuidado:** se houver anúncios usando essa plataforma, retornar 409 → `{ "error": "Existem anúncios vinculados" }` (a UI vai exibir o toast).

## O que vou implementar no front

1. **`src/lib/platforms.ts`** (novo) — espelho de `src/lib/ads.ts`:
   - Tipo `Platform { id, code, name, active }`
   - `fetchPlatforms()`, `getPlatforms()`, `getActivePlatforms()`, `getPlatformById(id)`
   - `createPlatform()`, `updatePlatform()`, `deletePlatform()`
   - Cache em memória + evento `platforms:changed` (mesmo padrão do `onAdsChange`)

2. **`src/pages/PlatformsConfig.tsx`** (novo) — tela CRUD igual à de Anúncios:
   - Form de cadastro: nome, código (slug), ativo
   - Listagem com edição inline, switch de ativo, remover
   - Filtro todos/ativos/inativos

3. **`src/App.tsx`** — registrar rota `/config/plataformas`.

4. **`src/components/AppShell.tsx`** — adicionar item "Plataformas" no menu de Configurações (ao lado de Status e Anúncios).

5. **`src/lib/ads.ts`** — remover o array fixo `PLATFORMS` e:
   - Carregar plataformas do backend ao iniciar (`fetchPlatforms()`)
   - `platformById` / `platformByName` consultam o cache de plataformas
   - Os anúncios continuam guardando apenas `platformId`; o nome/código vem do cache

6. **`src/pages/AdsConfig.tsx`** — o `<Select>` de plataforma passa a iterar `getActivePlatforms()` (assinando `onPlatformsChange` para re-render). Loading enquanto a lista chega.

## Comportamento de borda

- Se a API de plataformas falhar, o dropdown fica vazio com mensagem "Cadastre uma plataforma em Configurações → Plataformas".
- Anúncios já criados com `platformId` que não existe mais aparecem como "Plataforma removida" no badge.
- Validação no front: `code` é normalizado para lowercase + underscore, igual ao código do anúncio.

## Confirmações que preciso de você

1. A tabela de plataformas é **global** ou **por workspace**?
2. Confirma os 4 endpoints acima (`GET/POST /platforms`, `PATCH/DELETE /platforms/{id}`) ou prefere outra convenção de URL?

Pode aprovar o plano e me responder essas duas perguntas em seguida — assim que estiver tudo certo, eu implemento.
