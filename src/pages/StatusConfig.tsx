import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, GripVertical, Save, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fetchMoments,
  createMoment,
  updateMoment,
  deleteMoment,
  reorderMoments,
  deriveCode,
  Moment,
} from "@/lib/moments";
import { onWorkspaceChange } from "@/lib/workspace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { label: "Azul", value: "#3498db" },
  { label: "Roxo", value: "#9b59b6" },
  { label: "Âmbar", value: "#f1c40f" },
  { label: "Vermelho", value: "#e74c3c" },
  { label: "Verde", value: "#2ecc71" },
  { label: "Cinza", value: "#95a5a6" },
];

export default function StatusConfig() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [original, setOriginal] = useState<Moment[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0].value);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchMoments();
      setMoments(list);
      setOriginal(list);
      setDirtyIds(new Set());
    } catch (err: any) {
      toast.error(err?.message || "Falha ao carregar status do funil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const off = onWorkspaceChange(() => load());
    return off;
  }, []);

  const orderChanged = useMemo(() => {
    if (moments.length !== original.length) return false;
    return moments.some((m, i) => original[i]?.id !== m.id);
  }, [moments, original]);

  const markDirty = (id: number) =>
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Informe um nome para o status");
      return;
    }
    const code = deriveCode(label) || `STATUS_${Date.now()}`;
    setCreating(true);
    try {
      const created = await createMoment({
        code,
        label,
        color: newColor,
        order: moments.length + 1,
      });
      const next = [...moments, created];
      setMoments(next);
      setOriginal(next);
      setNewLabel("");
      toast.success("Status criado");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar status");
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remover este status?")) return;
    try {
      await deleteMoment(id);
      const next = moments.filter((m) => m.id !== id).map((m, i) => ({ ...m, order: i + 1 }));
      setMoments(next);
      setOriginal(next);
      setDirtyIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      toast.success("Status removido");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao remover status");
    }
  };

  const handleRename = (id: number, label: string) => {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, label } : m)));
    markDirty(id);
  };

  const handleColor = (id: number, color: string) => {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, color } : m)));
    markDirty(id);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...moments];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setMoments(next.map((m, i) => ({ ...m, order: i + 1 })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patches = moments
        .filter((m) => dirtyIds.has(m.id))
        .map((m) => updateMoment(m.id, { label: m.label, color: m.color }));
      if (patches.length) await Promise.all(patches);

      if (orderChanged) {
        await reorderMoments(moments.map((m, i) => ({ id: m.id, order: i + 1 })));
      }

      setOriginal(moments);
      setDirtyIds(new Set());
      toast.success("Alterações salvas");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = dirtyIds.size > 0 || orderChanged;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Configurar status do funil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina os <strong>status do funil</strong> que um lead pode estar (ex: Fez contato, Orçamento, Comprou). Eles aparecem no detalhamento do lead.
          </p>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold">Adicionar novo status</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nome do status (ex: Negociação)"
              maxLength={40}
              className="flex-1"
              disabled={creating}
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={creating}
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <Button onClick={handleAdd} className="gap-2" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">
              Status cadastrados ({moments.length})
            </h2>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-gradient-primary hover:opacity-95 shadow-glow gap-2"
              disabled={!hasChanges || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>

          {loading && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          )}

          {!loading && moments.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum status cadastrado.
            </div>
          )}

          <div className="space-y-2">
            {moments.map((m, idx) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: m.color }}
                />
                <Input
                  value={m.label}
                  onChange={(e) => handleRename(m.id, e.target.value)}
                  className="flex-1 h-9"
                  maxLength={40}
                />
                <select
                  value={m.color}
                  onChange={(e) => handleColor(m.id, e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs hidden sm:block"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                  {!COLOR_OPTIONS.some((c) => c.value === m.color) && (
                    <option value={m.color}>Customizado</option>
                  )}
                </select>
                <div className="flex items-center">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className={cn(
                      "p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                      idx === 0 && "opacity-30 cursor-not-allowed"
                    )}
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === moments.length - 1}
                    className={cn(
                      "p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                      idx === moments.length - 1 && "opacity-30 cursor-not-allowed"
                    )}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => handleRemove(m.id)}
                  className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
