import { useEffect, useRef, useState } from "react";
import { Package, Plus, Trash2, Loader2, AlertTriangle, RefreshCw, Search, ImagePlus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Product, ProductInput, listProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from "@/lib/products";
import { onWorkspaceChange } from "@/lib/workspace";

const empty: ProductInput = { sku: "", name: "", category: "", complement: "", cost: 0, price: 0, avg_selling_price: 0, stock: 0, min_stock: 0, active: true, image_url: null };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listProducts());
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return onWorkspaceChange(load);
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, category: p.category ?? "", complement: p.complement ?? "",
      cost: p.cost, price: p.price, avg_selling_price: p.avg_selling_price, stock: p.stock, min_stock: p.min_stock, active: p.active,
      image_url: p.image_url,
    });
    setDialogOpen(true);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Imagem enviada");
    } catch (err: any) {
      toast.error(err.message ?? "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error("Informe SKU e nome");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateProduct(editing.id, form);
        toast.success("Produto atualizado");
      } else {
        await createProduct(form);
        toast.success("Produto cadastrado");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Remover "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      toast.success("Removido");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    }
  };

  const visible = items.filter((p) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.category ?? "").toLowerCase().includes(s);
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" /> Produtos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Catálogo com estoque único compartilhado entre todos os canais.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button size="sm" onClick={openNew} className="gap-2 bg-gradient-primary hover:opacity-95 shadow-glow">
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum produto cadastrado.
            </div>
          )}

          <div className="space-y-2">
            {visible.map((p) => {
              const low = p.stock <= p.min_stock;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border bg-card p-3 hover:shadow-soft transition-all cursor-pointer",
                    p.active ? "border-border" : "border-border/50 opacity-60"
                  )}
                  onClick={() => openEdit(p)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3">
                    <div className="h-12 w-12 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        SKU <span className="font-mono">{p.sku}</span>
                        {p.category ? ` · ${p.category}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-right">
                      <div className="text-muted-foreground">Custo</div>
                      <div className="font-semibold">R$ {Number(p.cost).toFixed(2)}</div>
                    </div>
                    <div className="text-xs text-right">
                      <div className="text-muted-foreground">Preço</div>
                      <div className="font-semibold">R$ {Number(p.price).toFixed(2)}</div>
                    </div>
                    <div className={cn("text-xs text-right flex items-center gap-1 justify-end", low && "text-destructive")}>
                      {low && <AlertTriangle className="h-3.5 w-3.5" />}
                      <div>
                        <div className="text-muted-foreground">Estoque</div>
                        <div className="font-semibold">{p.stock} / min {p.min_stock}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(p); }}
                      className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 justify-self-end"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border">
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {form.image_url ? "Trocar imagem" : "Enviar imagem"}
                </Button>
                {form.image_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: null })} className="gap-2 text-destructive">
                    <X className="h-4 w-4" /> Remover
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Custo (R$)</Label>
                <Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Preço venda (R$)</Label>
                <Input type="number" step="0.01" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {!editing && (
                <div className="space-y-1">
                  <Label>Estoque inicial</Label>
                  <Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Estoque mínimo</Label>
                <Input type="number" value={form.min_stock ?? 0} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy} className="gap-2 bg-gradient-primary">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
