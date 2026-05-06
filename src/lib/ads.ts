// Manages "Anúncios" (origin ads) for leads.
// Persisted in localStorage; per-lead ad assignment also persisted locally.

export type Ad = {
  id: string;
  name: string;
  platform: string; // e.g. "Instagram Ads", "Google Ads"
  campaign?: string;
  url?: string;
  active: boolean;
  createdAt: string;
};

const STORAGE_KEY = "converte_ai:ads";
const LEAD_AD_KEY = "converte_ai:lead_ads";

const DEFAULT_ADS: Ad[] = [
  { id: "ad_promo_verao", name: "Promo Verão 2026", platform: "Instagram Ads", campaign: "Verao-2026", active: true, createdAt: new Date().toISOString() },
  { id: "ad_black_friday", name: "Black Friday Antecipada", platform: "Facebook Ads", campaign: "BF-Early", active: true, createdAt: new Date().toISOString() },
  { id: "ad_search_marca", name: "Search Marca", platform: "Google Ads", campaign: "Marca-BR", active: true, createdAt: new Date().toISOString() },
];

export function getAds(): Ad[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADS;
    return JSON.parse(raw) as Ad[];
  } catch {
    return DEFAULT_ADS;
  }
}

export function getActiveAds(): Ad[] {
  return getAds().filter((a) => a.active);
}

export function saveAds(ads: Ad[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
  window.dispatchEvent(new CustomEvent("ads:changed"));
}

export function onAdsChange(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("ads:changed", handler);
  return () => window.removeEventListener("ads:changed", handler);
}

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

export function getAdById(id: string | null | undefined): Ad | null {
  if (!id) return null;
  return getAds().find((a) => a.id === id) ?? null;
}
