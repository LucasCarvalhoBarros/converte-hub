import { createContext, useContext } from "react";

export interface Workspace {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
}

export const WORKSPACES: Workspace[] = [
  { id: "1", name: "NUMERO TESTE", phone: "019983592739", avatarColor: "from-primary to-primary-glow" },
];

const STORAGE_KEY = "converte-ai:workspace";
const EVENT = "workspace:changed";

export function getStoredWorkspaceId(): string {
  if (typeof window === "undefined") return WORKSPACES[0].id;
  return localStorage.getItem(STORAGE_KEY) || WORKSPACES[0].id;
}

export function setStoredWorkspaceId(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

export function onWorkspaceChange(cb: (id: string) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export const WorkspaceContext = createContext<Workspace>(WORKSPACES[0]);
export const useWorkspace = () => useContext(WorkspaceContext);
