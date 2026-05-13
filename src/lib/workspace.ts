import { createContext, useContext } from "react";
import { Client, getClients, ensureClientsLoaded, onClientsChange } from "./clients";

export interface Workspace {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
}

const PALETTE = [
  "from-primary to-primary-glow",
  "from-status-cliente to-success",
  "from-status-qualificado to-primary",
  "from-status-perdido to-destructive",
  "from-status-novo to-primary-glow",
];

function colorFor(id: number): string {
  const i = Math.abs(id) % PALETTE.length;
  return PALETTE[i];
}

export function clientToWorkspace(c: Client): Workspace {
  return {
    id: String(c.id),
    name: c.name || "Sem nome",
    phone: c.phone || "",
    avatarColor: colorFor(c.id),
  };
}

export function listWorkspaces(): Workspace[] {
  return getClients().filter((c) => c.active).map(clientToWorkspace);
}

const STORAGE_KEY = "converte-ai:workspace";
const EVENT = "workspace:changed";

export function getStoredWorkspaceId(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const first = listWorkspaces()[0];
  return first?.id ?? "";
}

export function setStoredWorkspaceId(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

export function getCurrentWorkspace(): Workspace | null {
  const id = getStoredWorkspaceId();
  const list = listWorkspaces();
  return list.find((w) => w.id === id) ?? list[0] ?? null;
}

export function onWorkspaceChange(cb: (id: string) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// Re-export for convenience
export { ensureClientsLoaded, onClientsChange };

// Kick off loading once on import (browser only)
if (typeof window !== "undefined") {
  ensureClientsLoaded().catch(() => {});
}

// Legacy context (kept for compatibility — defaults to null)
export const WorkspaceContext = createContext<Workspace | null>(null);
export const useWorkspace = () => useContext(WorkspaceContext);
