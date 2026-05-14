import type { Lead, LeadStatus, Message } from "./types";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod";

import { getStoredWorkspaceId } from "./workspace";

function wsParam(): string {
  return getStoredWorkspaceId() || "1";
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
    adId: raw.adId != null ? String(raw.adId) : null,
    funnelStatusId: raw.funnelStatusId != null ? String(raw.funnelStatusId) : null,
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
  const ws = wsParam();
  const data = await tryFetch<any>(`/conversas/leads/${leadId}?workspace=${ws}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data ? normalizeLead(data) : null;
}

export async function updateLeadFunnelStatus(leadId: string, funnelStatusId: string | null): Promise<Lead | null> {
  const ws = wsParam();
  const data = await tryFetch<any>(`/conversas/leads/${leadId}/funnel-status?workspace=${ws}`, {
    method: "PATCH",
    body: JSON.stringify({ funnelStatusId: funnelStatusId != null ? Number(funnelStatusId) : null }),
  });
  return data ? normalizeLead(data) : null;
}

export async function updateLeadAd(leadId: string, adId: string | null): Promise<Lead | null> {
  const ws = wsParam();
  const data = await tryFetch<any>(`/conversas/leads/${leadId}/ad?workspace=${ws}`, {
    method: "PATCH",
    body: JSON.stringify({ adId: adId != null ? Number(adId) : null }),
  });
  return data ? normalizeLead(data) : null;
}

// ---------- Relatórios ----------
export interface OriginsReport {
  total: number;
  tracked: number;
  untracked: number;
  byOrigin: { origin: string; count: number }[];
  daily: { date: string; metaAds: number; googleAds: number; other: number; untracked: number }[];
}

export interface SalesReport {
  totalSales: number;
  totalRevenue: number;
  conversionRate: number;
  daily: { date: string; quantity: number; revenue: number }[];
}

export async function getOriginsReport(startDate?: string, endDate?: string): Promise<OriginsReport | null> {
  const ws = wsParam();
  const qs = new URLSearchParams({ workspace: ws });
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  return await tryFetch<OriginsReport>(`/relatorios/origins?${qs.toString()}`);
}

export async function getSalesReport(startDate?: string, endDate?: string): Promise<SalesReport | null> {
  const ws = wsParam();
  const qs = new URLSearchParams({ workspace: ws });
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  return await tryFetch<SalesReport>(`/relatorios/sales?${qs.toString()}`);
}

export interface CreateSaleInput {
  workspaceId: number;
  leadId: number;
  amount: number;
  soldAt: string; // ISO without timezone, e.g. "2026-05-14T10:30:00"
}

export async function createSale(input: CreateSaleInput): Promise<{ ok: boolean; data: any | null }> {
  try {
    const res = await fetch(`${API_URL}/relatorios/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => null);
    return { ok: true, data };
  } catch (err) {
    console.warn("[api] createSale failed:", err);
    return { ok: false, data: null };
  }
}

// POST /conversas/leads/{id}/messages sends an agent message to the lead
export async function sendMessage(leadId: string, text: string): Promise<Message> {
  const ws = wsParam();
  const payload = { from: "agent" as const, text };
  const data = await tryFetch<any>(`/conversas/leads/${leadId}/messages?workspace=${ws}`, {
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
