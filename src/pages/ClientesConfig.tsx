import { useEffect, useState } from "react";
import { Plus, Trash2, Building2, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Client,
  fetchClients,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  onClientsChange,
} from "@/lib/clients";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ClientesConfig() {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchClients();
      setItems(data);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const off = onClientsChange(() => setItems(getClients()));
    return () => off();
  }, []);

  const handleAdd = async () => {
    const n = name.trim();
    if (!n) { toast.error("Informe o nome do cliente"); return; }
    setSaving(true);
    try {
      await createClient({
        name: n,
        document: doc.trim(),
        email: email.trim(),
        phone: phone.trim(),
        active: true,
      });
      setName(""); setDoc(""); setEmail(""); setPhone("");
      toast.success("Cliente cadastrado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    setBusyId(id);
    try {
      await deleteClient(id);
      toast.success("Cliente removido");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    } finally {
      setBusyId(null);
    }
  };

  const handleField = async (id: number, patch: Partial<Client>) => {
    setBusyId(id);
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      await updateClient(id, patch);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const visible = items.filter((c) =>
    filter === "todos" ? true : filter === "ativos" ? c.active : !c.active
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os workspaces (clientes) da plataforma.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold">Cadastrar novo cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" maxLength={120} />
            <Input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Documento (CNPJ/CPF)" maxLength={32} />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email" maxLength={160} />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" maxLength={32} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={saving} className="gap-2 bg-gradient-primary hover:opacity-95 shadow-glow">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar cliente
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-sm font-semibold">
              Clientes ({visible.length}/{items.length})
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
              Nenhum cliente encontrado.
            </div>
          )}

          <div className="space-y-2">
            {visible.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-colors",
                  c.active ? "border-border" : "border-border/50 opacity-70"
                )}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] items-center gap-2">
                  <Input
                    defaultValue={c.name}
                    onBlur={(e) => e.target.value !== c.name && handleField(c.id, { name: e.target.value })}
                    className="h-8 font-semibold"
                    placeholder="Nome"
                  />
                  <Input
                    defaultValue={c.document}
                    onBlur={(e) => e.target.value !== c.document && handleField(c.id, { document: e.target.value })}
                    className="h-8 font-mono text-xs"
                    placeholder="Documento"
                  />
                  <Input
                    defaultValue={c.email}
                    onBlur={(e) => e.target.value !== c.email && handleField(c.id, { email: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="E-mail"
                  />
                  <Input
                    defaultValue={c.phone}
                    onBlur={(e) => e.target.value !== c.phone && handleField(c.id, { phone: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Telefone"
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Ativo</span>
                    <Switch
                      checked={c.active}
                      disabled={busyId === c.id}
                      onCheckedChange={(v) => handleField(c.id, { active: v })}
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={busyId === c.id}
                    className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 justify-self-end disabled:opacity-50"
                    aria-label="Remover"
                  >
                    {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
