// CRUD for "Clientes" (workspaces).
// Backed by REST API — same gateway used by other resources.

const API_URL = "https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod";

export type Client = {
  id: number;
  name: string;
  document: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

let _cache: Client[] = [];
let _loaded = false;
let _loading: Promise<Client[]> | null = null;
const EVENT = "clients:changed";

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onClientsChange(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function normalize(raw: any): Client {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    document: String(raw.document ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    active: Boolean(raw.active),
    createdAt: raw.created_at ?? raw.createdAt ?? undefined,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? undefined,
  };
}

export function getClients(): Client[] {
  return _cache;
}
export function getClientById(id: number | string | null | undefined): Client | null {
  if (id === null || id === undefined) return null;
  const n = Number(id);
  return _cache.find((c) => c.id === n) ?? null;
}
export function isClientsLoaded() {
  return _loaded;
}

export async function fetchClients(): Promise<Client[]> {
  if (_loading) return _loading;
  _loading = (async () => {
    const res = await fetch(`${API_URL}/workspaces`);
    if (!res.ok) throw new Error(`Falha ao listar clientes (HTTP ${res.status})`);
    const data = (await res.json()) as any[];
    _cache = data.map(normalize);
    _loaded = true;
    emit();
    return _cache;
  })();
  try {
    return await _loading;
  } finally {
    _loading = null;
  }
}

export async function ensureClientsLoaded(): Promise<Client[]> {
  if (_loaded) return _cache;
  return fetchClients();
}

export async function createClient(input: {
  name: string;
  document: string;
  email: string;
  phone: string;
  active?: boolean;
}): Promise<Client> {
  const body = { ...input, active: input.active ?? true };
  const res = await fetch(`${API_URL}/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Falha ao criar cliente (HTTP ${res.status})`);
  await fetchClients();
  return getClientById(json.id) ?? normalize({ ...body, id: json.id });
}

export async function updateClient(
  id: number | string,
  patch: Partial<Pick<Client, "name" | "document" | "email" | "phone" | "active">>
): Promise<void> {
  const body: Record<string, unknown> = {};
  for (const k of ["name", "document", "email", "phone", "active"] as const) {
    if (patch[k] !== undefined) body[k] = patch[k];
  }
  const res = await fetch(`${API_URL}/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao atualizar cliente (HTTP ${res.status})`);
  }
  await fetchClients();
}

export async function deleteClient(id: number | string): Promise<void> {
  const res = await fetch(`${API_URL}/workspaces/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao remover cliente (HTTP ${res.status})`);
  }
  await fetchClients();
}
