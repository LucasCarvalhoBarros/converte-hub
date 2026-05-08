import type { Lead, LeadStatus, Message } from "./types";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod";

// Workspace fixo em 1 por enquanto
function wsParam(): string {
  return "1";
}

// ---------- Normalization ----------
function normalizeLead(raw: any): Lead {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.nome ?? "—"),
    phone: String(raw.phone ?? raw.telefone ?? ""),
    status: (raw.status ?? "novo_lead") as LeadStatus,
    source: String(raw.source ?? raw.origem ?? "—"),
    avatarUrl: raw.avatarUrl ?? undefined,
    lastMessageAt: raw.lastMessageAt ?? raw.updatedAt ?? raw.createdAt ?? undefined,
    unread: typeof raw.unread === "number" ? raw.unread : undefined,
  };
}

function normalizeMessage(raw: any, leadId: string): Message {
  return {
    id: String(raw.id ?? `${leadId}-${raw.createdAt ?? Date.now()}`),
    leadId: String(raw.leadId ?? leadId),
    from: (raw.from ?? "lead") === "agent" ? "agent" : "lead",
    text: String(raw.text ?? raw.message ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[api] request failed ${path}:`, err);
    return null;
  }
}

// ---------- Leads ----------
export async function getLeads(): Promise<Lead[]> {
  const ws = wsParam();
  const data = await tryFetch<any[]>(`/conversas/leads?workspace=${ws}`);
  if (!data) return [];
  return data.map(normalizeLead);
}

// GET /conversas/leads/{id}/messages returns the lead messages
export async function getMessages(leadId: string): Promise<Message[]> {
  const ws = wsParam();
  const data = await tryFetch<any>(`/conversas/leads/${leadId}/messages?workspace=${ws}`);
  if (!data) return [];
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data.messages)
    ? data.messages
    : Array.isArray(data.mensagens)
    ? data.mensagens
    : [];
  return list.map((m) => normalizeMessage(m, leadId));
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead | null> {
  const data = await tryFetch<any>(`/conversas/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data ? normalizeLead(data) : null;
}

// POST /conversas/leads/{id} sends an agent message to the lead
export async function sendMessage(leadId: string, text: string): Promise<Message> {
  const payload = { from: "agent" as const, text };
  const data = await tryFetch<any>(`/conversas/leads/${leadId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data) return normalizeMessage(data, leadId);
  // Optimistic local fallback so the UI keeps working if the call fails.
  return {
    id: `${leadId}-${Date.now()}`,
    leadId,
    from: "agent",
    text,
    createdAt: new Date().toISOString(),
  };
}
