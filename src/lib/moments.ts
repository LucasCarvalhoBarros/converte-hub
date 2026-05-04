// Manages "Momento do Lead" (funnel stages): Fez contato, Orçamento, Comprou
// Persisted in localStorage; per-lead value also persisted locally.

export type Moment = {
  id: string;
  label: string;
  color: string; // hsl token reference for dot
  order: number;
};

const STORAGE_KEY = "converte_ai:moments";
const LEAD_MOMENT_KEY = "converte_ai:lead_moments";

const DEFAULT_MOMENTS: Moment[] = [
  { id: "fez_contato", label: "Fez contato", color: "hsl(var(--status-novo))", order: 1 },
  { id: "orcamento", label: "Orçamento", color: "hsl(var(--status-interessado))", order: 2 },
  { id: "comprou", label: "Comprou", color: "hsl(var(--status-cliente))", order: 3 },
];

export function getMoments(): Moment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MOMENTS;
    const arr = JSON.parse(raw) as Moment[];
    return arr.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_MOMENTS;
  }
}

export function saveMoments(moments: Moment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(moments));
  window.dispatchEvent(new CustomEvent("moments:changed"));
}

export function onMomentsChange(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("moments:changed", handler);
  return () => window.removeEventListener("moments:changed", handler);
}

export function getLeadMoment(leadId: string): string | null {
  try {
    const raw = localStorage.getItem(LEAD_MOMENT_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[leadId] ?? null;
  } catch {
    return null;
  }
}

export function setLeadMoment(leadId: string, momentId: string) {
  try {
    const raw = localStorage.getItem(LEAD_MOMENT_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[leadId] = momentId;
    localStorage.setItem(LEAD_MOMENT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
