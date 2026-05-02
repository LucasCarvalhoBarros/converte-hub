import type { Lead, LeadStatus, Message } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "";

// ---------- Mock fallback (used when API isn't reachable) ----------
const MOCK_LEADS: Lead[] = [
  { id: "1", name: "Mariana Souza", phone: "+55 11 98765-4321", status: "quente", source: "Instagram Ads", lastMessageAt: new Date(Date.now() - 5 * 60_000).toISOString(), unread: 2 },
  { id: "2", name: "Carlos Pereira", phone: "+55 21 99123-4567", status: "novo_lead", source: "Site", lastMessageAt: new Date(Date.now() - 25 * 60_000).toISOString(), unread: 1 },
  { id: "3", name: "Beatriz Lima", phone: "+55 31 98888-1122", status: "em_atendimento", source: "WhatsApp Link", lastMessageAt: new Date(Date.now() - 60 * 60_000).toISOString() },
  { id: "4", name: "João Almeida", phone: "+55 41 97777-3344", status: "interessado", source: "Indicação", lastMessageAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
  { id: "5", name: "Renata Castro", phone: "+55 51 96666-5566", status: "cliente", source: "Google Ads", lastMessageAt: new Date(Date.now() - 24 * 3600_000).toISOString() },
  { id: "6", name: "Felipe Rocha", phone: "+55 11 95555-7788", status: "perdido", source: "Facebook Ads", lastMessageAt: new Date(Date.now() - 4 * 86400_000).toISOString() },
  { id: "7", name: "Patrícia Mendes", phone: "+55 11 94444-9911", status: "novo_lead", source: "Site", lastMessageAt: new Date(Date.now() - 10 * 60_000).toISOString(), unread: 3 },
  { id: "8", name: "Lucas Martins", phone: "+55 11 93333-2233", status: "interessado", source: "Instagram Ads", lastMessageAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
];

const MOCK_MESSAGES: Record<string, Message[]> = {};
function seedMessages(leadId: string): Message[] {
  if (MOCK_MESSAGES[leadId]) return MOCK_MESSAGES[leadId];
  const base = Date.now() - 60 * 60_000;
  MOCK_MESSAGES[leadId] = [
    { id: `${leadId}-1`, leadId, from: "lead", text: "Oi! Vi o anúncio de vocês 👋", createdAt: new Date(base).toISOString() },
    { id: `${leadId}-2`, leadId, from: "agent", text: "Olá! Tudo bem? Como posso te ajudar hoje?", createdAt: new Date(base + 2 * 60_000).toISOString() },
    { id: `${leadId}-3`, leadId, from: "lead", text: "Quero saber mais sobre os planos.", createdAt: new Date(base + 5 * 60_000).toISOString() },
    { id: `${leadId}-4`, leadId, from: "agent", text: "Claro! Temos 3 planos: Starter, Pro e Enterprise. Qual o tamanho do seu time?", createdAt: new Date(base + 7 * 60_000).toISOString() },
    { id: `${leadId}-5`, leadId, from: "lead", text: "Somos 8 pessoas no comercial.", createdAt: new Date(base + 12 * 60_000).toISOString() },
  ];
  return MOCK_MESSAGES[leadId];
}

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[api] fallback for ${path}:`, err);
    return null;
  }
}

export async function getLeads(): Promise<Lead[]> {
  const data = await tryFetch<Lead[]>("/leads");
  return data ?? MOCK_LEADS;
}

export async function getMessages(leadId: string): Promise<Message[]> {
  const data = await tryFetch<Message[]>(`/leads/${leadId}/messages`);
  return data ?? seedMessages(leadId);
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead | null> {
  const data = await tryFetch<Lead>(`/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!data) {
    const lead = MOCK_LEADS.find((l) => l.id === leadId);
    if (lead) lead.status = status;
    return lead ?? null;
  }
  return data;
}

export async function sendMessage(leadId: string, text: string): Promise<Message> {
  const payload = { from: "agent" as const, text };
  const data = await tryFetch<Message>(`/leads/${leadId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data) return data;
  const msg: Message = {
    id: `${leadId}-${Date.now()}`,
    leadId,
    from: "agent",
    text,
    createdAt: new Date().toISOString(),
  };
  seedMessages(leadId).push(msg);
  return msg;
}
