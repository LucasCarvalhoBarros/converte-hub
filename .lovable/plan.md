# Integração com Amazon Cognito (AWS Amplify)

Mantém o layout atual de `src/pages/Login.tsx` e troca a autenticação mockada por Cognito real, usando `USER_PASSWORD_AUTH` em um App Client público (sem secret).

## O que muda

### 1. Dependências
- Instalar `aws-amplify` (v6).

### 2. Configuração do Amplify
Novo arquivo `src/lib/amplify.ts`:
- Chama `Amplify.configure({...})` com:
  - `userPoolId: us-east-1_gjnrnWUeM`
  - `userPoolClientId: 461g5kj87m78cevjqgon7cnk8c`
  - `region: us-east-1`
  - `loginWith.username: true` (email vai no campo username)
- Importado uma vez em `src/main.tsx` antes do render.

### 3. Camada de auth (`src/lib/auth.ts`)
Reescrita para usar Amplify mantendo a mesma API consumida pelo app (`auth.get()`, `auth.login()`, `auth.logout()`):
- `auth.login(email, password)` → `signIn({ username: email, password, options: { authFlowType: "USER_PASSWORD_AUTH" } })`, depois `fetchUserAttributes()` para popular `name`/`email`, e persiste a sessão em `localStorage` (chave atual `converteai_session`).
- `auth.logout()` → `signOut()` + limpa o storage.
- `auth.get()` → continua síncrono (lê do localStorage) para não quebrar `AppShell` e `Login`.
- Novo `auth.bootstrap()` (assíncrono) chamado no `main.tsx`/`App.tsx`: tenta `getCurrentUser()`/`fetchAuthSession()`; se válido, repõe o `localStorage`; se inválido, limpa.
- Novos helpers para reset: `auth.forgotPassword(email)` → `resetPassword`, `auth.confirmForgotPassword(email, code, newPassword)` → `confirmResetPassword`.
- Novo helper `auth.getIdToken()` para o `api.ts` enviar `Authorization: Bearer <idToken>` quando necessário (não altero rotas existentes nesse plano, só deixo disponível).

### 4. Tela de login (`src/pages/Login.tsx`)
- Layout, copy e estilos preservados.
- `submit` passa a ser `async`, chama `auth.login(email, password)`, trata erros do Cognito (`NotAuthorizedException`, `UserNotConfirmedException`, `PasswordResetRequiredException`) com `toast.error` em PT-BR.
- Remove os valores demo pré-preenchidos (`demo@converte-ai.com` / `demo1234`) e o texto "Use qualquer email e senha — esta é uma demonstração."
- Botão "Esqueceu?" passa a navegar para `/forgot-password`.

### 5. Fluxo "esqueci minha senha" (novo)
Duas telas seguindo o mesmo design da Login (split-screen, gradient hero à esquerda):
- `src/pages/ForgotPassword.tsx` (`/forgot-password`): campo email → `auth.forgotPassword` → redireciona para `/reset-password?email=...`.
- `src/pages/ResetPassword.tsx` (`/reset-password`): campos código + nova senha + confirmação → `auth.confirmForgotPassword` → toast de sucesso e redirect para `/login`.
- Rotas adicionadas em `src/App.tsx`.

### 6. Cleanup
- `Login` redireciona para `/` se já houver sessão (mantido).
- `AppShell` continua usando `auth.get()` (sem mudanças visuais).

## Pré-requisitos no Cognito (do seu lado)
- App Client `461g5kj87m78cevjqgon7cnk8c` precisa ter **ALLOW_USER_PASSWORD_AUTH** habilitado em "Authentication flows".
- Confirmar que o client é **público** (sem secret) — necessário para SPA.
- User Pool com pelo menos um usuário criado e confirmado para conseguir testar.

## Observação sobre os scopes / response type
Os parâmetros `scopes: openid email phone` e `response type: token` que você passou são da **Hosted UI / OAuth flow**, que você decidiu não usar. No fluxo direto via Amplify (`USER_PASSWORD_AUTH`) eles não se aplicam — o Cognito devolve `idToken` + `accessToken` + `refreshToken` automaticamente. Se mais tarde quiser chamar APIs com escopos OAuth específicos, aí sim teríamos que reativar o domínio Hosted UI.

## Fora do escopo
- Não vou conectar o `idToken` às chamadas atuais de `src/lib/api.ts` (a API `execute-api` hoje aceita sem auth). Deixo `auth.getIdToken()` pronto para quando você quiser proteger.
- Não vou criar tela de signup nem MFA.
