// CRUD for "Plataformas" (ad origins: Meta, Google, TikTok, etc.)
// Backed by REST API — same gateway used by /ads.

const API_URL = "https://05m7xwli09.execute-api.us-east-1.amazonaws.com/prod";

export type Platform = {
  id: number;
  code: string;
  name: string;
  active: boolean;
};

let _cache: Platform[] = [];
let _loaded = false;
let _loading: Promise<Platform[]> | null = null;
const EVENT = "platforms:changed";

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onPlatformsChange(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function normalize(raw: any): Platform {
  return {
    id: Number(raw.id),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    active: Boolean(raw.active),
  };
}

export function getPlatforms(): Platform[] {
  return _cache;
}
export function getActivePlatforms(): Platform[] {
  return _cache.filter((p) => p.active);
}
export function getPlatformById(id: number | string | null | undefined): Platform | null {
  if (id === null || id === undefined) return null;
  const n = Number(id);
  return _cache.find((p) => p.id === n) ?? null;
}
export function isPlatformsLoaded() {
  return _loaded;
}

export async function fetchPlatforms(): Promise<Platform[]> {
  if (_loading) return _loading;
  _loading = (async () => {
    const res = await fetch(`${API_URL}/platforms`);
    if (!res.ok) throw new Error(`Falha ao listar plataformas (HTTP ${res.status})`);
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

// Ensure the cache is populated at least once (safe to call from anywhere).
export async function ensurePlatformsLoaded(): Promise<Platform[]> {
  if (_loaded) return _cache;
  return fetchPlatforms();
}

export async function createPlatform(input: { code: string; name: string; active?: boolean }): Promise<Platform> {
  const body = { code: input.code, name: input.name, active: input.active ?? true };
  const res = await fetch(`${API_URL}/platforms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Falha ao criar plataforma (HTTP ${res.status})`);
  await fetchPlatforms();
  return getPlatformById(json.id) ?? normalize({ ...body, id: json.id });
}

export async function updatePlatform(
  id: number | string,
  patch: Partial<Pick<Platform, "code" | "name" | "active">>
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.code !== undefined) body.code = patch.code;
  if (patch.active !== undefined) body.active = patch.active;
  const res = await fetch(`${API_URL}/platforms/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao atualizar plataforma (HTTP ${res.status})`);
  }
  await fetchPlatforms();
}

export async function deletePlatform(id: number | string): Promise<void> {
  const res = await fetch(`${API_URL}/platforms/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Falha ao remover plataforma (HTTP ${res.status})`);
  }
  await fetchPlatforms();
}
