import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, ShoppingCart, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHANNEL_LABEL, SaleChannel, SalesOrder, createSale, deleteSale, listSales } from "@/lib/sales";
import { Product, listProducts } from "@/lib/products";
import { onWorkspaceChange } from "@/lib/workspace";

const channels: SaleChannel[] = ["mercado_livre", "magalu", "propria", "outros"];

type ItemRow = { product_id: string; quantity: number; unit_price: number };

export default function SalesPage() {
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [channel, setChannel] = useState<SaleChannel>("mercado_livre");
  const [soldAt, setSoldAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [customer, setCustomer] = useState("");
  const [orderId, setOrderId] = useState("");
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ product_id: "", quantity: 1, unit_price: 0 }]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        listSales({ channel: channelFilter !== "all" ? (channelFilter as SaleChannel) : null }),
        listProducts(),
      ]);
      setRows(s);
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
  }, [channelFilter]);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const total = Math.max(0, subtotal + shipping - discount);

  const resetForm = () => {
    setChannel("mercado_livre");
    setSoldAt(new Date().toISOString().slice(0, 16));
    setCustomer(""); setOrderId(""); setShipping(0); setDiscount(0); setNotes("");
    setItems([{ product_id: "", quantity: 1, unit_price: 0 }]);
  };

  const submit = async () => {
    const cleanItems = items.filter((it) => it.product_id && it.quantity > 0);
    if (cleanItems.length === 0) { toast.error("Adicione ao menos um produto"); return; }
    // stock validation
    for (const it of cleanItems) {
      const p = productMap.get(Number(it.product_id));
      if (p && it.quantity > p.stock) {
        toast.error(`Estoque insuficiente para ${p.name} (disp. ${p.stock})`);
        return;
      }
    }
    setBusy(true);
    try {
      await createSale({
        channel,
        sold_at: new Date(soldAt).toISOString(),
        customer_name: customer || null,
        marketplace_order_id: orderId || null,
        shipping,
        discount,
        notes: notes || null,
        items: cleanItems.map((it) => ({
          product_id: Number(it.product_id),
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      });
      toast.success("Venda registrada");
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar venda");
    } finally {
      setBusy(false);
    }
  };

  const removeSale = async (s: SalesOrder) => {
    if (!confirm(`Excluir venda #${s.id}? O estoque será devolvido.`)) return;
    try {
      await deleteSale(s.id);
      toast.success("Venda excluída");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  const updateItem = (idx: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const selectProduct = (idx: number, pid: string) => {
    const p = productMap.get(Number(pid));
    updateItem(idx, { product_id: pid, unit_price: p ? Number(p.price) : items[idx].unit_price });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" /> Vendas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Registre vendas de todos os canais e dê baixa automática no estoque.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2 bg-gradient-primary shadow-glow">
              <Plus className="h-4 w-4" /> Registrar venda
            </Button>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <Label className="text-xs">Canal:</Label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                {channels.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>)}
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
              Nenhuma venda registrada.
            </div>
          )}

          <div className="space-y-2">
            {rows.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-xs font-semibold rounded px-2 py-0.5 border",
                        s.channel === "mercado_livre" && "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
                        s.channel === "magalu" && "bg-blue-500/15 text-blue-700 border-blue-500/30",
                        s.channel === "propria" && "bg-primary/15 text-primary border-primary/30",
                        s.channel === "outros" && "bg-muted text-muted-foreground border-border"
                      )}>
                        {CHANNEL_LABEL[s.channel]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.sold_at).toLocaleString("pt-BR")}
                      </span>
                      {s.marketplace_order_id && (
                        <span className="text-xs text-muted-foreground">· pedido {s.marketplace_order_id}</span>
                      )}
                    </div>
                    {s.customer_name && <div className="text-sm mt-1">{s.customer_name}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">R$ {Number(s.total).toFixed(2)}</div>
                    <button
                      onClick={() => removeSale(s)}
                      className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> excluir
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {(s.items ?? []).map((it) => (
                    <div key={it.id}>
                      {it.quantity}× {it.product?.name ?? `#${it.product_id}`} — R$ {Number(it.unit_price).toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as SaleChannel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data da venda</Label>
                <Input type="datetime-local" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cliente (opcional)</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Pedido no marketplace</Label>
                <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ex.: 2000012345" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Itens</Label>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-start">
                  <Select value={it.product_id} onValueChange={(v) => selectProduct(idx, v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} (est. {p.stock})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} placeholder="Qtd" />
                  <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} placeholder="R$" />
                  <button
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-9 w-9 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-md"
                    disabled={items.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { product_id: "", quantity: 1, unit_price: 0 }])} className="gap-2">
                <Plus className="h-3 w-3" /> Adicionar item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Frete (R$)</Label>
                <Input type="number" step="0.01" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Desconto (R$)</Label>
                <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>+ Frete</span><span>R$ {shipping.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>- Desconto</span><span>R$ {discount.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-border"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy} className="gap-2 bg-gradient-primary">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
