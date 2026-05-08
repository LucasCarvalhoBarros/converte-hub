import { useEffect, useState } from "react";
import { Plus, Trash2, Megaphone, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ad, fetchAds, getAds, createAd, updateAd, deleteAd, onAdsChange } from "@/lib/ads";
import { fetchPlatforms, getActivePlatforms, getPlatforms, onPlatformsChange, type Platform } from "@/lib/platforms";
import { onWorkspaceChange } from "@/lib/workspace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdsConfig() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [platformId, setPlatformId] = useState<number>(PLATFORMS[0].id);
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAds();
      setAds(data);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar anúncios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const off = onAdsChange(() => setAds(getAds()));
    const offWs = onWorkspaceChange(() => load());
    return () => { off(); offWs(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const n = name.trim();
    const c = code.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!n) { toast.error("Informe o nome do anúncio"); return; }
    if (!c) { toast.error("Informe o código (slug) do anúncio"); return; }
    setSaving(true);
    try {
      await createAd({ code: c, name: n, platformId, url: url.trim() || undefined, active: true });
      setCode(""); setName(""); setUrl("");
      toast.success("Anúncio cadastrado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar anúncio");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusyId(id);
    try {
      await deleteAd(id);
      toast.success("Anúncio removido");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    } finally {
      setBusyId(null);
    }
  };

  const handleField = async (id: string, patch: Partial<Ad> & { platformId?: number }) => {
    setBusyId(id);
    // optimistic
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } as Ad : a)));
    try {
      await updateAd(id, patch);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const visible = ads.filter((a) =>
    filter === "todos" ? true : filter === "ativos" ? a.active : !a.active
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" /> Anúncios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre e gerencie os anúncios que originam seus leads.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold">Cadastrar novo anúncio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do anúncio (ex: Campanha Furadeira)"
              maxLength={80}
            />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código único (ex: furadeira_bosch)"
              maxLength={60}
            />
            <Select value={String(platformId)} onValueChange={(v) => setPlatformId(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL de destino (opcional)"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={saving} className="gap-2 bg-gradient-primary hover:opacity-95 shadow-glow">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar anúncio
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-sm font-semibold">
              Anúncios ({visible.length}/{ads.length})
            </h2>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(["todos", "ativos", "inativos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    filter === f ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum anúncio encontrado.
            </div>
          )}

          <div className="space-y-2">
            {visible.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  a.active ? "border-border" : "border-border/50 opacity-70"
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <Input
                        defaultValue={a.name}
                        onBlur={(e) => e.target.value !== a.name && handleField(a.id, { name: e.target.value })}
                        className="h-8 font-semibold"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Select
                        value={String(a.platformId)}
                        onValueChange={(v) => handleField(a.id, { platformId: Number(v) })}
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 px-2 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono">{a.code}</span>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> link
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ativo</span>
                    <Switch
                      checked={a.active}
                      disabled={busyId === a.id}
                      onCheckedChange={(v) => handleField(a.id, { active: v })}
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={busyId === a.id}
                    className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 justify-self-end disabled:opacity-50"
                    aria-label="Remover"
                  >
                    {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
