import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCw, Sliders } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StockMovement, StockMovementType, createMovement, listMovements } from "@/lib/stock";
import { Product, listProducts } from "@/lib/products";
import { onWorkspaceChange } from "@/lib/workspace";

const typeLabel: Record<StockMovementType, string> = { in: "Entrada", out: "Saída", adjust: "Ajuste" };

export default function StockMovementsPage() {
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [fProduct, setFProduct] = useState<string>("");
  const [fType, setFType] = useState<StockMovementType>("in");
  const [fQty, setFQty] = useState<number>(1);
  const [fReason, setFReason] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([
        listMovements({ productId: productFilter !== "all" ? Number(productFilter) : null }),
        listProducts(),
      ]);
      setRows(m);
      setProducts(p);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return onWorkspaceChange(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const submit = async () => {
    if (!fProduct) { toast.error("Selecione um produto"); return; }
    if (!fQty || fQty < 0) { toast.error("Quantidade inválida"); return; }
    setBusy(true);
    try {
      await createMovement({ product_id: Number(fProduct), type: fType, quantity: fQty, reason: fReason });
      toast.success("Movimentação registrada");
      setDialogOpen(false);
      setFProduct(""); setFQty(1); setFReason(""); setFType("in");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Sliders className="h-6 w-6 text-primary" /> Movimentações de estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Entradas, saídas e ajustes do estoque compartilhado.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2 bg-gradient-primary shadow-glow">
              <Plus className="h-4 w-4" /> Nova movimentação
            </Button>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <div className="flex gap-2 items-center">
            <Label className="text-xs">Filtrar por produto:</Label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-64 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Sem movimentações.
            </div>
          )}

          <div className="space-y-2">
            {rows.map((m) => {
              const prod = m.product ?? productMap.get(m.product_id);
              const isIn = m.type === "in";
              const isOut = m.type === "out";
              return (
                <div key={m.id} className="rounded-lg border border-border bg-card p-3 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto] gap-3 items-center">
                  <div className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center",
                    isIn && "bg-success/15 text-success",
                    isOut && "bg-destructive/15 text-destructive",
                    m.type === "adjust" && "bg-primary/15 text-primary"
                  )}>
                    {isIn ? <ArrowDown className="h-4 w-4" /> : isOut ? <ArrowUp className="h-4 w-4" /> : <Sliders className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{prod?.name ?? `Produto #${m.product_id}`}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {typeLabel[m.type]}{m.reason ? ` · ${m.reason}` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {m.type === "adjust" ? `= ${m.quantity}` : `${isIn ? "+" : "-"}${m.quantity}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Produto</Label>
              <Select value={fProduct} onValueChange={setFProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} (estoque {p.stock})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={fType} onValueChange={(v) => setFType(v as StockMovementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada (compra, devolução)</SelectItem>
                  <SelectItem value="out">Saída (perda, uso interno)</SelectItem>
                  <SelectItem value="adjust">Ajuste (definir saldo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input type="number" min={0} value={fQty} onChange={(e) => setFQty(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Motivo (opcional)</Label>
              <Input value={fReason} onChange={(e) => setFReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy} className="gap-2 bg-gradient-primary">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
