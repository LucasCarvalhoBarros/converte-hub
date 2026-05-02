const KEY = "converteai_session";

export interface Session {
  email: string;
  name: string;
  loggedAt: number;
}

export const auth = {
  login(email: string): Session {
    const session: Session = {
      email,
      name: email.split("@")[0].replace(/[._-]/g, " ") || "Usuário",
      loggedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  },
  logout() {
    localStorage.removeItem(KEY);
  },
  get(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
};
