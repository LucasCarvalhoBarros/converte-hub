import { useEffect, useState } from "react";
import { Plus, Trash2, GripVertical, Save, ArrowUp, ArrowDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMoments, saveMoments, Moment } from "@/lib/moments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { label: "Azul", value: "hsl(var(--status-novo))" },
  { label: "Roxo", value: "hsl(var(--status-atendimento))" },
  { label: "Âmbar", value: "hsl(var(--status-interessado))" },
  { label: "Vermelho", value: "hsl(var(--status-quente))" },
  { label: "Verde", value: "hsl(var(--status-cliente))" },
  { label: "Cinza", value: "hsl(var(--status-perdido))" },
];

export default function StatusConfig() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0].value);

  useEffect(() => {
    setMoments(getMoments());
  }, []);

  const persist = (next: Moment[]) => {
    const reordered = next.map((m, i) => ({ ...m, order: i + 1 }));
    setMoments(reordered);
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Informe um nome para o status");
      return;
    }
    const id = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now().toString(36);
    persist([...moments, { id, label, color: newColor, order: moments.length + 1 }]);
    setNewLabel("");
  };

  const handleRemove = (id: string) => {
    persist(moments.filter((m) => m.id !== id));
  };

  const handleRename = (id: string, label: string) => {
    persist(moments.map((m) => (m.id === id ? { ...m, label } : m)));
  };

  const handleColor = (id: string, color: string) => {
    persist(moments.map((m) => (m.id === id ? { ...m, color } : m)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...moments];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  };

  const handleSave = () => {
    saveMoments(moments);
    toast.success("Status do funil salvos com sucesso");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Configurar status do funil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina os <strong>momentos</strong> que um lead pode estar (ex: Fez contato, Orçamento, Comprou). Eles aparecem no detalhamento do lead.
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
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Status cadastrados ({moments.length})</h2>
            <Button onClick={handleSave} size="sm" className="bg-gradient-primary hover:opacity-95 shadow-glow gap-2">
              <Save className="h-4 w-4" /> Salvar alterações
            </Button>
          </div>

          {moments.length === 0 && (
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
