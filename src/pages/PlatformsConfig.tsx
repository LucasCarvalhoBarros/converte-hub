import { useEffect, useState } from "react";
import { Plus, Trash2, Layers, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Platform,
  fetchPlatforms,
  getPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  onPlatformsChange,
} from "@/lib/platforms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PlatformsConfig() {
  const [items, setItems] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPlatforms();
      setItems(data);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar plataformas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const off = onPlatformsChange(() => setItems(getPlatforms()));
    return () => off();
  }, []);

  const handleAdd = async () => {
    const n = name.trim();
    const c = code.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!n) { toast.error("Informe o nome da plataforma"); return; }
    if (!c) { toast.error("Informe o código (slug)"); return; }
    setSaving(true);
    try {
      await createPlatform({ code: c, name: n, active: true });
      setCode(""); setName("");
      toast.success("Plataforma cadastrada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar plataforma");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    setBusyId(id);
    try {
      await deletePlatform(id);
      toast.success("Plataforma removida");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    } finally {
      setBusyId(null);
    }
  };

  const handleField = async (id: number, patch: Partial<Platform>) => {
    setBusyId(id);
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      await updatePlatform(id, patch);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const visible = items.filter((p) =>
    filter === "todos" ? true : filter === "ativos" ? p.active : !p.active
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" /> Plataformas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Origens de anúncios disponíveis (Meta, Google, etc.).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold">Cadastrar nova plataforma</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex: TikTok Ads)"
              maxLength={80}
            />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código único (ex: tiktok)"
              maxLength={60}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={saving} className="gap-2 bg-gradient-primary hover:opacity-95 shadow-glow">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar plataforma
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-sm font-semibold">
              Plataformas ({visible.length}/{items.length})
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
              Nenhuma plataforma encontrada.
            </div>
          )}

          <div className="space-y-2">
            {visible.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  p.active ? "border-border" : "border-border/50 opacity-70"
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                    <Input
                      defaultValue={p.name}
                      onBlur={(e) => e.target.value !== p.name && handleField(p.id, { name: e.target.value })}
                      className="h-8 font-semibold"
                    />
                  </div>
                  <Input
                    defaultValue={p.code}
                    onBlur={(e) => {
                      const c = e.target.value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                      if (c && c !== p.code) handleField(p.id, { code: c });
                    }}
                    className="h-8 w-40 font-mono text-xs"
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ativo</span>
                    <Switch
                      checked={p.active}
                      disabled={busyId === p.id}
                      onCheckedChange={(v) => handleField(p.id, { active: v })}
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={busyId === p.id}
                    className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 justify-self-end disabled:opacity-50"
                    aria-label="Remover"
                  >
                    {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
