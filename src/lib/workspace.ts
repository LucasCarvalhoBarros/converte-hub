import { createContext, useContext } from "react";

export interface Workspace {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
}

export const WORKSPACES: Workspace[] = [
  { id: "ws-1", name: "Converte-ai • Matriz", phone: "+55 11 4002-8922", avatarColor: "from-primary to-primary-glow" },
  { id: "ws-2", name: "Clínica Vida+", phone: "+55 11 99876-5432", avatarColor: "from-status-cliente to-success" },
  { id: "ws-3", name: "Imobiliária Prime", phone: "+55 21 98765-1234", avatarColor: "from-status-quente to-status-interessado" },
  { id: "ws-4", name: "Auto Center Turbo", phone: "+55 31 99654-3210", avatarColor: "from-info to-status-novo" },
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
