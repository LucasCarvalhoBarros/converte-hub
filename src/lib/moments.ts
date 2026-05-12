// Status do funil ("momentos do lead") — backed by REST API.
// Endpoints:
//   GET    /funil/status?workspace={ws}
//   POST   /funil/status?workspace={ws}
//   PATCH  /funil/status/{id}?workspace={ws}
//   DELETE /funil/status/{id}?workspace={ws}
//   PUT    /funil/status/reorder?workspace={ws}

import { getStoredWorkspaceId } from "./workspace";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod";

export type Moment = {
  id: number;
  code: string;
  label: string;
  color: string; // hex (#rrggbb)
  order: number;
  active?: boolean;
};

const EVENT = "moments:changed";

export function onMomentsChange(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

function ws() {
  return getStoredWorkspaceId();
}

function normalize(raw: any): Moment {
  return {
    id: Number(raw.id),
    code: String(raw.code ?? ""),
    label: String(raw.label ?? ""),
    color: String(raw.color ?? "#3498db"),
    order: Number(raw.order ?? 0),
    active: raw.active === undefined ? true : Boolean(raw.active),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as any)?.error || `HTTP ${res.status}`);
  }
  return json as T;
}

export async function fetchMoments(): Promise<Moment[]> {
  const data = await request<any[]>(`/funil/status?workspace=${ws()}`);
  const list = Array.isArray(data) ? data.map(normalize) : [];
  return list.sort((a, b) => a.order - b.order);
}

export async function createMoment(input: {
  code: string;
  label: string;
  color: string;
  order: number;
}): Promise<Moment> {
  const json = await request<{ id: number }>(
    `/funil/status?workspace=${ws()}`,
    { method: "POST", body: JSON.stringify(input) }
  );
  emit();
  return { id: Number(json.id), ...input, active: true };
}

export async function updateMoment(
  id: number,
  patch: Partial<Pick<Moment, "label" | "color" | "code" | "order" | "active">>
): Promise<void> {
  await request(`/funil/status/${id}?workspace=${ws()}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  emit();
}

export async function deleteMoment(id: number): Promise<void> {
  await request(`/funil/status/${id}?workspace=${ws()}`, { method: "DELETE" });
  emit();
}

export async function reorderMoments(
  items: { id: number; order: number }[]
): Promise<void> {
  await request(`/funil/status/reorder?workspace=${ws()}`, {
    method: "PUT",
    body: JSON.stringify(items),
  });
  emit();
}

// Helper to derive a backend-friendly code from a label.
export function deriveCode(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// One-shot cleanup of legacy localStorage keys (no-op if already gone).
try {
  localStorage.removeItem("converte_ai:moments");
  localStorage.removeItem("converte_ai:lead_moments");
} catch {
  // ignore
}
