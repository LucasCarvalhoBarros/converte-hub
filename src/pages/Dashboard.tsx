import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Flame, CheckCircle2, ArrowUpRight, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lead, STATUS_META } from "@/lib/types";
import { getLeads } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: number;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getLeads().then((d) => { setLeads(d); setLoading(false); });
  }, []);

  const stats: Stat[] = useMemo(() => {
    const total = leads.length;
    const novos = leads.filter((l) => l.status === "novo_lead").length;
    const interessados = leads.filter((l) => ["interessado", "quente"].includes(l.status)).length;
    const clientes = leads.filter((l) => l.status === "cliente").length;
    return [
      { label: "Total de leads", value: total, delta: "+12% este mês", icon: Users, tint: "from-info/20 to-info/0 text-info" },
      { label: "Novos", value: novos, delta: "+5 hoje", icon: UserPlus, tint: "from-status-novo/20 to-status-novo/0 text-status-novo" },
      { label: "Interessados", value: interessados, delta: "+18% semana", icon: Flame, tint: "from-status-quente/20 to-status-quente/0 text-status-quente" },
      { label: "Clientes", value: clientes, delta: "Conversão 14%", icon: CheckCircle2, tint: "from-status-cliente/20 to-status-cliente/0 text-status-cliente" },
    ];
  }, [leads]);

  const recent = leads.slice(0, 5);

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Visão geral</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">Bom te ver de novo 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui está o resumo do seu pipeline de WhatsApp hoje.
            </p>
          </div>
          <Button onClick={() => navigate("/leads")} variant="outline" className="gap-2">
            Ver pipeline completo <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="relative overflow-hidden border-border/60 bg-gradient-card p-5 shadow-soft hover:shadow-elegant transition-shadow animate-fade-in">
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", s.tint)} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-soft", s.tint.split(" ").pop())}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 font-display text-3xl font-bold">
                    {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-muted" /> : s.value}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
                    <TrendingUp className="h-3 w-3" /> {s.delta}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Pipeline + recent */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg font-semibold">Pipeline por status</h3>
                <p className="text-xs text-muted-foreground">Distribuição atual dos seus leads</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const count = leads.filter((l) => l.status === key).length;
                const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                        <span className="font-medium">{meta.label}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{count} • {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all", meta.dot)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold mb-1">Últimos leads</h3>
            <p className="text-xs text-muted-foreground mb-4">Atualizados há instantes</p>
            <div className="space-y-2">
              {recent.map((l) => {
                const meta = STATUS_META[l.status];
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/leads?id=${l.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                      {l.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.source}</div>
                    </div>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.color)}>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
