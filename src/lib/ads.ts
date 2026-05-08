// Manages "Anúncios" (origin ads/campaigns) for leads.
// Ads are persisted on the backend API; per-lead ad assignment is local.

import { getStoredWorkspaceId } from "./workspace";
import { ensurePlatformsLoaded, getPlatformById as _getPlatformById, getPlatforms } from "./platforms";

const API_URL = "https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod";

export type Ad = {
  id: string;            // backend numeric id, kept as string for the UI
  code: string;          // unique slug used by backend
  name: string;
  platformId: number;
  platform: string;      // human-readable platform name (alias of platformName)
  platformName?: string;
  platformCode?: string;
  campaign?: string;     // optional, kept for UI compatibility
  url?: string;
  active: boolean;
  createdAt?: string;
};

// Re-export of platforms helpers for backward compatibility with consumers
// that previously imported PLATFORMS / platformById from this module.
export function platformById(id: number) {
  return _getPlatformById(id);
}
export function platformByName(name: string) {
  return getPlatforms().find((p) => p.name === name) ?? null;
}

// Convert workspace id "ws-1" -> 1 (numeric, expected by backend)
function wsParam(): string {
  const raw = getStoredWorkspaceId();
  const m = /(\d+)/.exec(raw);
  return m ? m[1] : "1";
}

function normalize(raw: any): Ad {
  const platformId = Number(raw.platformId ?? 0);
  const meta = _getPlatformById(platformId);
  return {
    id: String(raw.id),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    platformId,
    platform: raw.platformName ?? meta?.name ?? "—",
    platformName: raw.platformName ?? meta?.name,
    platformCode: raw.platformCode ?? meta?.code,
    url: raw.url ?? undefined,
    campaign: raw.campaign ?? undefined,
    active: Boolean(raw.active),
    createdAt: raw.createdAt,
  };
}

// ---------- Cache + change events ----------
let _cache: Ad[] = [];
let _cacheWs = "";
const EVENT = "ads:changed";

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onAdsChange(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// Synchronous accessor (returns last fetched cache)
export function getAds(): Ad[] {
  return _cache;
}
export function getActiveAds(): Ad[] {
  return _cache.filter((a) => a.active);
}
export function getAdById(id: string | null | undefined): Ad | null {
  if (!id) return null;
  return _cache.find((a) => a.id === String(id)) ?? null;
}

// ---------- API calls ----------
export async function fetchAds(): Promise<Ad[]> {
  const ws = wsParam();
  const res = await fetch(`${API_URL}/ads?workspace=${ws}`);
  if (!res.ok) throw new Error(`Falha ao listar anúncios (HTTP ${res.status})`);
  const data = (await res.json()) as any[];
  _cache = data.map(normalize);
  _cacheWs = ws;
  emit();
  return _cache;
}

export async function createAd(input: {
  code: string;
  name: string;
  platformId: number;
  url?: string;
  active?: boolean;
}): Promise<Ad> {
  const ws = wsParam();
  const body = {
    code: input.code,
    name: input.name,
    platformId: input.platformId,
    url: input.url || null,
    active: input.active ?? true,
  };
  const res = await fetch(`${API_URL}/ads?workspace=${ws}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Falha ao criar anúncio (HTTP ${res.status})`);
  await fetchAds();
  return getAdById(String(json.id)) ?? normalize({ ...body, id: json.id });
}

export async function updateAd(id: string, patch: Partial<Ad> & { platformId?: number }): Promise<void> {
  const ws = wsParam();
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.code !== undefined) body.code = patch.code;
  if (patch.url !== undefined) body.url = patch.url || null;
  if (patch.active !== undefined) body.active = patch.active;
  if (patch.platformId !== undefined) body.platformId = patch.platformId;
  const res = await fetch(`${API_URL}/ads/${id}?workspace=${ws}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao atualizar anúncio (HTTP ${res.status})`);
  }
  await fetchAds();
}

export async function deleteAd(id: string): Promise<void> {
  const ws = wsParam();
  const res = await fetch(`${API_URL}/ads/${id}?workspace=${ws}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao remover anúncio (HTTP ${res.status})`);
  }
  await fetchAds();
}

// ---------- Lead <-> Ad mapping (local only — no backend endpoint yet) ----------
const LEAD_AD_KEY = "converte_ai:lead_ads";

export function getLeadAd(leadId: string): string | null {
  try {
    const raw = localStorage.getItem(LEAD_AD_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[leadId] ?? null;
  } catch {
    return null;
  }
}

export function setLeadAd(leadId: string, adId: string) {
  try {
    const raw = localStorage.getItem(LEAD_AD_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[leadId] = adId;
    localStorage.setItem(LEAD_AD_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
