import "./amplify";
import {
  signIn,
  signOut,
  confirmSignIn,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  resetPassword,
  confirmResetPassword,
} from "aws-amplify/auth";

export class NewPasswordRequiredError extends Error {
  email: string;
  constructor(email: string) {
    super("NEW_PASSWORD_REQUIRED");
    this.name = "NewPasswordRequiredError";
    this.email = email;
  }
}

const KEY = "converteai_session";

export interface Session {
  email: string;
  name: string;
  loggedAt: number;
}

function persist(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

function clear() {
  localStorage.removeItem(KEY);
}

function deriveName(attrs: Record<string, string | undefined>, email: string): string {
  return (
    attrs.name ||
    [attrs.given_name, attrs.family_name].filter(Boolean).join(" ").trim() ||
    email.split("@")[0].replace(/[._-]/g, " ") ||
    "Usuário"
  );
}

export const auth = {
  async login(email: string, password: string): Promise<Session> {
    // Garante que não há sessão ativa antes de tentar logar.
    try {
      await signOut();
    } catch {
      /* noop */
    }

    const result = await signIn({
      username: email,
      password,
      options: { authFlowType: "USER_PASSWORD_AUTH" },
    });

    if (!result.isSignedIn) {
      const step = result.nextStep?.signInStep;
      if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        throw new NewPasswordRequiredError(email);
      }
      throw new Error(
        step ? `Etapa adicional necessária: ${step}` : "Não foi possível concluir o login."
      );
    }

    let name = email.split("@")[0];
    let resolvedEmail = email;
    try {
      const attrs = await fetchUserAttributes();
      resolvedEmail = attrs.email || email;
      name = deriveName(attrs as Record<string, string | undefined>, resolvedEmail);
    } catch {
      /* mantém fallback */
    }

    const session: Session = { email: resolvedEmail, name, loggedAt: Date.now() };
    persist(session);
    return session;
  },

  async logout() {
    try {
      await signOut();
    } catch {
      /* noop */
    }
    clear();
  },

  get(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },

  async bootstrap(): Promise<Session | null> {
    try {
      await getCurrentUser();
      const attrs = await fetchUserAttributes();
      const email = attrs.email || auth.get()?.email || "";
      const name = deriveName(attrs as Record<string, string | undefined>, email);
      const session: Session = {
        email,
        name,
        loggedAt: auth.get()?.loggedAt ?? Date.now(),
      };
      persist(session);
      return session;
    } catch {
      clear();
      return null;
    }
  },

  async getIdToken(): Promise<string | null> {
    try {
      const s = await fetchAuthSession();
      return s.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  },

  async forgotPassword(email: string) {
    return resetPassword({ username: email });
  },

  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    return confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  },
};
