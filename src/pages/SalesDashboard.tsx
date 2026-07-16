import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, RefreshCw, TrendingUp, DollarSign, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { CHANNEL_LABEL, SaleChannel, SalesOrder, listSales } from "@/lib/sales";
import { onWorkspaceChange } from "@/lib/workspace";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#94a3b8"];

function firstDayOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function today() { return new Date().toISOString().slice(0, 10); }

export default function SalesDashboardPage() {
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());

  const load = async () => {
    setLoading(true);
    try {
      const data = await listSales({ from: new Date(from).toISOString(), to: new Date(to + "T23:59:59").toISOString() });
      setRows(data);
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
  }, [from, to]);

  const metrics = useMemo(() => {
    const totalRevenue = rows.reduce((s, r) => s + Number(r.total), 0);
    const count = rows.length;
    const avg = count ? totalRevenue / count : 0;

    const byChannel: Record<SaleChannel, number> = { mercado_livre: 0, magalu: 0, propria: 0, outros: 0 };
    rows.forEach((r) => { byChannel[r.channel] += Number(r.total); });

    const byDay = new Map<string, number>();
    rows.forEach((r) => {
      const d = new Date(r.sold_at).toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + Number(r.total));
    });
    const daily = Array.from(byDay.entries()).sort().map(([date, revenue]) => ({ date: date.slice(5), revenue: Number(revenue.toFixed(2)) }));

    const productTotals = new Map<string, { name: string; qty: number; revenue: number }>();
    rows.forEach((r) => (r.items ?? []).forEach((it) => {
      const key = String(it.product_id);
      const cur = productTotals.get(key) ?? { name: it.product?.name ?? `#${it.product_id}`, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.subtotal);
      productTotals.set(key, cur);
    }));
    const topProducts = Array.from(productTotals.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const channelData = (Object.keys(byChannel) as SaleChannel[])
      .filter((c) => byChannel[c] > 0)
      .map((c) => ({ name: CHANNEL_LABEL[c], value: Number(byChannel[c].toFixed(2)) }));

    return { totalRevenue, count, avg, daily, topProducts, channelData };
  }, [rows]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" /> Dashboard de vendas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visão consolidada das vendas em todos os canais.</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Faturamento</div>
              <div className="text-xl font-semibold">R$ {metrics.totalRevenue.toFixed(2)}</div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Vendas</div>
              <div className="text-xl font-semibold">{metrics.count}</div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-status-quente/15 text-status-quente flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Ticket médio</div>
              <div className="text-xl font-semibold">R$ {metrics.avg.toFixed(2)}</div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="font-display text-sm font-semibold mb-3">Faturamento diário</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.daily}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-display text-sm font-semibold mb-3">Vendas por canal</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.channelData} dataKey="value" nameKey="name" outerRadius={80} label={(e: any) => `R$ ${Number(e.value).toFixed(0)}`}>
                    {metrics.channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="font-display text-sm font-semibold mb-3">Top produtos</div>
          {metrics.topProducts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Sem vendas no período.</div>
          ) : (
            <div className="space-y-2">
              {metrics.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/50 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{i + 1}</div>
                    <div className="font-medium">{p.name}</div>
                  </div>
                  <div className="text-sm text-right">
                    <div className="font-semibold">R$ {p.revenue.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{p.qty} un.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
