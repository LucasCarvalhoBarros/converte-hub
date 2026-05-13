import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, Download, Filter, LinkIcon, Unlink, TrendingUp, DollarSign, ShoppingCart, Percent, Megaphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getLeads } from "@/lib/api";
import { fetchAds, getAds, onAdsChange } from "@/lib/ads";
import { onWorkspaceChange } from "@/lib/workspace";
import type { Lead } from "@/lib/types";
import { fetchMoments, onMomentsChange, type Moment } from "@/lib/moments";

// ---------- Mock data ----------
const ORIGIN_COLORS = {
  meta: "hsl(217 90% 58%)",
  google: "hsl(152 68% 42%)",
  outras: "hsl(220 12% 45%)",
  nao: "hsl(38 95% 55%)",
};

const dailyOrigin = [
  { day: "15 Abr", meta: 44, google: 7, outras: 0, nao: 4 },
  { day: "16 Abr", meta: 48, google: 11, outras: 0, nao: 6 },
  { day: "17 Abr", meta: 42, google: 12, outras: 1, nao: 7 },
  { day: "18 Abr", meta: 39, google: 7, outras: 0, nao: 5 },
  { day: "19 Abr", meta: 49, google: 15, outras: 0, nao: 4 },
  { day: "20 Abr", meta: 46, google: 16, outras: 0, nao: 4 },
  { day: "21 Abr", meta: 42, google: 32, outras: 0, nao: 11 },
  { day: "22 Abr", meta: 58, google: 9, outras: 1, nao: 12 },
  { day: "23 Abr", meta: 46, google: 32, outras: 0, nao: 4 },
  { day: "24 Abr", meta: 43, google: 34, outras: 0, nao: 13 },
  { day: "25 Abr", meta: 50, google: 18, outras: 0, nao: 8 },
  { day: "26 Abr", meta: 48, google: 6, outras: 0, nao: 4 },
  { day: "27 Abr", meta: 46, google: 8, outras: 0, nao: 6 },
  { day: "28 Abr", meta: 42, google: 7, outras: 1, nao: 13 },
  { day: "29 Abr", meta: 55, google: 5, outras: 1, nao: 9 },
  { day: "30 Abr", meta: 34, google: 7, outras: 0, nao: 12 },
  { day: "01 Mai", meta: 36, google: 5, outras: 0, nao: 10 },
  { day: "02 Mai", meta: 21, google: 8, outras: 1, nao: 5 },
  { day: "03 Mai", meta: 27, google: 5, outras: 1, nao: 3 },
];

const totals = dailyOrigin.reduce(
  (acc, d) => ({
    meta: acc.meta + d.meta,
    google: acc.google + d.google,
    outras: acc.outras + d.outras,
    nao: acc.nao + d.nao,
  }),
  { meta: 0, google: 0, outras: 0, nao: 0 }
);

const totalConversas = totals.meta + totals.google + totals.outras + totals.nao;
const rastreadas = totals.meta + totals.google + totals.outras;
const naoRastreadas = totals.nao;

const overviewPie = [
  { name: "Rastreadas", value: rastreadas, color: "hsl(152 68% 42%)" },
  { name: "Não rastreadas", value: naoRastreadas, color: "hsl(38 95% 55%)" },
];

const funnel = [
  { stage: "Fez contato", value: totalConversas, pct: 100 },
  { stage: "Cotação de valores", value: Math.round(totalConversas * 0.28), pct: 28 },
  { stage: "Comprou", value: 27, pct: Math.round((27 / totalConversas) * 100 * 100) / 100 },
];

const sales = [
  { day: "15 Abr", qty: 2 }, { day: "16 Abr", qty: 0 }, { day: "17 Abr", qty: 2 },
  { day: "18 Abr", qty: 1 }, { day: "19 Abr", qty: 0 }, { day: "20 Abr", qty: 1 },
  { day: "21 Abr", qty: 0 }, { day: "22 Abr", qty: 3 }, { day: "23 Abr", qty: 4 },
  { day: "24 Abr", qty: 1 }, { day: "25 Abr", qty: 0 }, { day: "26 Abr", qty: 2 },
  { day: "27 Abr", qty: 2 }, { day: "28 Abr", qty: 3 }, { day: "29 Abr", qty: 2 },
  { day: "30 Abr", qty: 2 }, { day: "01 Mai", qty: 1 }, { day: "02 Mai", qty: 1 },
  { day: "03 Mai", qty: 0 },
];

const totalVendas = sales.reduce((s, d) => s + d.qty, 0);
const faturamento = 15799.9;
const conversao = (totalVendas / totalConversas) * 100;

// ---------- Component ----------
export default function Relatorios() {
  const [origem, setOrigem] = useState("todas");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ads, setAds] = useState(getAds());
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    const load = () => {
      getLeads().then(setLeads).catch(() => setLeads([]));
      fetchAds().catch(() => {});
      fetchMoments().then(setMoments).catch(() => setMoments([]));
    };
    load();
    const offWs = onWorkspaceChange(load);
    const offAds = onAdsChange(() => setAds(getAds()));
    const offMoments = onMomentsChange(() => fetchMoments().then(setMoments).catch(() => {}));
    return () => { offWs(); offAds(); offMoments(); };
  }, []);

  const funnelData = useMemo(() => {
    const total = leads.length;
    const ordered = [...moments].sort((a, b) => a.order - b.order);
    return ordered.map((m) => {
      const count = leads.filter((l) => String(l.funnelStatusId) === String(m.id)).length;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return { id: m.id, label: m.label, color: m.color, value: count, pct };
    });
  }, [leads, moments]);

  const adChartData = useMemo(() => {
    const counts = new Map<string, number>();
    let semAnuncio = 0;
    for (const l of leads) {
      if (!l.adId) { semAnuncio++; continue; }
      counts.set(l.adId, (counts.get(l.adId) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([adId, qty]) => {
      const ad = ads.find((a) => a.id === adId);
      return {
        name: ad?.name ?? `Anúncio #${adId}`,
        platform: ad?.platform ?? "—",
        qty,
      };
    });
    rows.sort((a, b) => b.qty - a.qty);
    if (semAnuncio > 0) rows.push({ name: "Sem anúncio", platform: "—", qty: semAnuncio });
    return rows;
  }, [leads, ads]);

  const totalLeadsAds = adChartData.reduce((s, r) => s + r.qty, 0);
  const adsAtivos = adChartData.filter((r) => r.name !== "Sem anúncio").length;

  const originSummary = useMemo(
    () => [
      { key: "meta", label: "Meta Ads", value: totals.meta, color: ORIGIN_COLORS.meta },
      { key: "google", label: "Google Ads", value: totals.google, color: ORIGIN_COLORS.google },
      { key: "outras", label: "Outras Origens", value: totals.outras, color: ORIGIN_COLORS.outras },
      { key: "nao", label: "Não Rastreada", value: totals.nao, color: ORIGIN_COLORS.nao },
    ],
    []
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Insights</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe origens, funil de vendas e performance comercial.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> 14/04/2024 — 03/05/2024
            </Button>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as origens</SelectItem>
                <SelectItem value="meta">Meta Ads</SelectItem>
                <SelectItem value="google">Google Ads</SelectItem>
                <SelectItem value="nao">Não rastreada</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-gradient-primary hover:opacity-95 shadow-glow gap-2">
              <Download className="h-4 w-4" /> Baixar Relatório
            </Button>
          </div>
        </div>

        {/* Row 1: Overview + Origin */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Visão geral */}
          <Card className="p-6 shadow-soft lg:col-span-1">
            <h3 className="font-display text-lg font-semibold mb-1">Visão Geral das Conversas</h3>
            <p className="text-xs text-muted-foreground mb-5">Mapeadas vs não mapeadas no período</p>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-soft text-info">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Total de Conversas Novas Ativas</div>
                  <div className="font-display text-2xl font-bold mt-0.5">{totalConversas.toLocaleString("pt-BR")}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-xs font-semibold">
                  <TrendingUp className="h-3 w-3" /> 197,84%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5 text-success" /> Rastreadas
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-semibold">{rastreadas}</span>
                  <span className="text-xs text-muted-foreground">{((rastreadas / totalConversas) * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Unlink className="h-3.5 w-3.5 text-warning" /> Não rastreadas
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-semibold">{naoRastreadas}</span>
                  <span className="text-xs text-muted-foreground">{((naoRastreadas / totalConversas) * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <div className="relative h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overviewPie}
                    dataKey="value"
                    cx="50%"
                    cy="90%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {overviewPie.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-2 text-center">
                <div className="font-display text-2xl font-bold">{totalConversas.toLocaleString("pt-BR")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>{((rastreadas / totalConversas) * 100).toFixed(2)}% Rastreadas</span>
              <span>{((naoRastreadas / totalConversas) * 100).toFixed(2)}% Não rastreadas</span>
            </div>
          </Card>

          {/* Leads por Anúncio */}
          <Card className="p-6 shadow-soft lg:col-span-2">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-display text-lg font-semibold">Leads por Anúncio</h3>
                <p className="text-xs text-muted-foreground">Quantos leads vieram de cada anúncio de origem</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
              <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/15 text-info">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Anúncios com leads</div>
                  <div className="font-display text-xl font-bold">{adsAtivos}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total de leads</div>
                  <div className="font-display text-xl font-bold">{totalLeadsAds}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
                  <Unlink className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sem anúncio</div>
                  <div className="font-display text-xl font-bold">
                    {adChartData.find((r) => r.name === "Sem anúncio")?.qty ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[320px]">
              {adChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Nenhum lead encontrado no período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={adChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value} leads`, "Quantidade"]}
                      labelFormatter={(label, payload) => {
                        const p = payload?.[0]?.payload as { platform?: string } | undefined;
                        return p?.platform ? `${label} • ${p.platform}` : String(label);
                      }}
                    />
                    <Bar dataKey="qty" name="Leads" fill="hsl(217 90% 58%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Row 2: Funil + Vendas */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Funil */}
          <Card className="p-6 shadow-soft lg:col-span-1">
            <h3 className="font-display text-lg font-semibold mb-1">Funil da Jornada de Compra</h3>
            <p className="text-xs text-muted-foreground mb-6">Conversão entre etapas no período</p>

            <div className="space-y-4">
              {funnel.map((f, i) => {
                const widths = [100, 75, 50];
                const colors = ["hsl(217 90% 80%)", "hsl(217 90% 65%)", "hsl(217 90% 50%)"];
                return (
                  <div key={f.stage} className="flex flex-col items-center">
                    <div
                      className="rounded-lg py-3 text-center transition-all"
                      style={{ width: `${widths[i]}%`, background: colors[i] }}
                    >
                      <div className="text-xs font-medium text-white/95">{f.stage}</div>
                      <div className="text-sm font-bold text-white">
                        {f.pct.toLocaleString("pt-BR")}% ({f.value.toLocaleString("pt-BR")})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground">
              <strong className="text-foreground">Insight:</strong> {((27 / funnel[1].value) * 100).toFixed(1)}% das cotações se converteram em compra.
            </div>
          </Card>

          {/* Vendas */}
          <Card className="p-6 shadow-soft lg:col-span-2">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-display text-lg font-semibold">Vendas</h3>
                <p className="text-xs text-muted-foreground">Quantidade diária e indicadores comerciais</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/15 text-info">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total de Vendas</div>
                  <div className="font-display text-xl font-bold">{totalVendas}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Conversão</div>
                  <div className="font-display text-xl font-bold">{conversao.toFixed(2)}%</div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Faturamento Total</div>
                  <div className="font-display text-xl font-bold">
                    R$ {faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="qty" name="Vendas" fill="hsl(217 90% 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
