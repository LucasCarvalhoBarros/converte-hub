import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Phone, Search, Send, Paperclip, Smile, MoreVertical, ArrowLeft, CheckCheck, List, Columns3, MessageCircle, Eye, Calendar as CalendarIcon, X, Download, Megaphone, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Lead, LeadStatus, Message, STATUS_LIST, STATUS_META } from "@/lib/types";
import { getLeads, getMessages, sendMessage, updateLeadStatus } from "@/lib/api";
import { onWorkspaceChange } from "@/lib/workspace";
import { fetchMoments, onMomentsChange, Moment } from "@/lib/moments";
import { getAds, fetchAds, getLeadAd, setLeadAd, onAdsChange, Ad } from "@/lib/ads";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

// Kanban columns are dynamic — derived from "Status do funil" (moments).

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function Leads() {
  const [params, setParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [filter, setFilter] = useState<LeadStatus | "todos">("todos");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<"lista" | "kanban">("kanban");
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("todas");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<KanbanCol | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [leadMoments, setLeadMoments] = useState<Record<string, string>>({});
  const [ads, setAds] = useState<Ad[]>([]);
  const [leadAds, setLeadAds] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6); // últimos 7 dias (incluindo hoje)
    from.setHours(0, 0, 0, 0);
    return { from, to };
  });

  useEffect(() => {
    fetchMoments().then((m) => setMoments(m)).catch(() => {});
    setAds(getAds());
    fetchAds().then((a) => setAds(a)).catch(() => {});
    const offM = onMomentsChange(() => {
      fetchMoments().then((m) => setMoments(m)).catch(() => {});
    });
    const offA = onAdsChange(() => setAds(getAds()));
    return () => { offM(); offA(); };
  }, []);

  const updateLeadMoment = (leadId: string, momentId: string) => {
    setLeadMoments((prev) => ({ ...prev, [leadId]: momentId }));
    const m = moments.find((x) => String(x.id) === momentId);
    if (m) toast.success(`Momento atualizado para ${m.label}`);
  };

  const updateLeadAd = (leadId: string, adId: string) => {
    setLeadAd(leadId, adId);
    setLeadAds((prev) => ({ ...prev, [leadId]: adId }));
    const a = ads.find((x) => x.id === adId);
    if (a) toast.success(`Anúncio vinculado: ${a.name}`);
  };

  const adOf = (leadId: string): Ad | null => {
    const id = leadAds[leadId] ?? getLeadAd(leadId);
    return id ? ads.find((a) => a.id === id) ?? null : null;
  };

  const clearFilters = () => {
    setFilter("todos");
    setSourceFilter("todas");
    setSearch("");
    setDateRange(undefined);
    toast.success("Filtros limpos");
  };

  const hasActiveFilters =
    filter !== "todos" ||
    sourceFilter !== "todas" ||
    search.trim() !== "" ||
    !!dateRange?.from;

  const downloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const rows = view === "kanban" ? kanbanFiltered : filtered;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const now = new Date();

    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text("Converte-ai — Relatório de Leads", 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const periodTxt =
      dateRange?.from && dateRange?.to
        ? `Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} a ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
        : "Período: Todos";
    const statusTxt = filter === "todos" ? "Todos" : STATUS_META[filter].label;
    const sourceTxt = sourceFilter === "todas" ? "Todas" : sourceFilter;
    doc.text(
      `Gerado em ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}  •  ${periodTxt}  •  Status: ${statusTxt}  •  Origem: ${sourceTxt}  •  Total: ${rows.length}`,
      40,
      58
    );

    autoTable(doc, {
      startY: 78,
      head: [["Nome", "Telefone", "Status", "Momento", "Origem", "Anúncio", "Última msg"]],
      body: rows.map((l) => {
        const momentId = leadMoments[l.id];
        const moment = moments.find((m) => String(m.id) === momentId);
        const ad = adOf(l.id);
        return [
          l.name,
          l.phone,
          STATUS_META[l.status].label,
          moment?.label ?? "—",
          l.source,
          ad ? `${ad.name} (${ad.platform})` : "—",
          l.lastMessageAt
            ? format(new Date(l.lastMessageAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
            : "—",
        ];
      }),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 40, right: 40 },
    });

    const filename = `leads_${format(now, "yyyy-MM-dd_HHmm")}.pdf`;
    doc.save(filename);
    toast.success(`Relatório gerado (${rows.length} leads)`);
  };

  const loadLeads = () => {
    return getLeads().then((d) => {
      setLeads(d);
      setSelectedId((prev) => (prev && d.some((l) => l.id === prev) ? prev : d[0]?.id ?? null));
    });
  };

  useEffect(() => {
    loadLeads().then(() => setDetailId(null));
    return onWorkspaceChange(() => { loadLeads().then(() => setDetailId(null)); });
  }, []);

  useEffect(() => {
    if (selectedId) {
      setParams({ id: selectedId }, { replace: true });
      getMessages(selectedId).then(setMessages);
    }
  }, [selectedId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadLeads(),
        selectedId ? getMessages(selectedId).then(setMessages) : Promise.resolve(),
      ]);
      toast.success("Conversas e leads atualizados");
    } catch {
      toast.error("Falha ao atualizar");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const inDateRange = (iso?: string) => {
    if (!dateRange?.from && !dateRange?.to) return true;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (dateRange?.from) {
      const f = new Date(dateRange.from);
      f.setHours(0, 0, 0, 0);
      if (t < f.getTime()) return false;
    }
    if (dateRange?.to) {
      const e = new Date(dateRange.to);
      e.setHours(23, 59, 59, 999);
      if (t > e.getTime()) return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filter !== "todos" && l.status !== filter) return false;
      if (search && !`${l.name} ${l.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (!inDateRange(l.lastMessageAt)) return false;
      return true;
    });
  }, [leads, filter, search, dateRange]);

  const handleStatusChange = async (status: LeadStatus) => {
    if (!selected) return;
    setLeads((prev) => prev.map((l) => (l.id === selected.id ? { ...l, status } : l)));
    await updateLeadStatus(selected.id, status);
    toast.success(`Status atualizado para ${STATUS_META[status].label}`);
  };

  const updateStatusFor = async (leadId: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    await updateLeadStatus(leadId, status);
    toast.success(`Status atualizado para ${STATUS_META[status].label}`);
  };

  const handleSend = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    const msg = await sendMessage(selected.id, text);
    setMessages((prev) => [...prev, msg]);
    setSending(false);
  };

  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source))), [leads]);
  const kanbanFiltered = useMemo(
    () =>
      leads.filter((l) => {
        if (sourceFilter !== "todas" && l.source !== sourceFilter) return false;
        if (search && !`${l.name} ${l.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (!inDateRange(l.lastMessageAt)) return false;
        return true;
      }),
    [leads, sourceFilter, search, dateRange]
  );
  const detail = leads.find((l) => l.id === detailId) ?? null;

  return (
    <AppShell>
      {/* View toggle bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 lg:px-6 py-3">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            onClick={() => setView("lista")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "lista" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "kanban" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Columns3 className="h-3.5 w-3.5" /> Colunas
            <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">Novidade</span>
          </button>
        </div>

        {view === "kanban" && (
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou telefone"
                className="pl-9 bg-muted/40 border-transparent h-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Todas as Origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Origens</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Date range filter (visible in both views) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2 font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} –{" "}
                    {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                )
              ) : (
                <span>Selecionar período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col sm:flex-row">
              <div className="flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-border p-2 min-w-[140px]">
                {[
                  { label: "Hoje", days: 0 },
                  { label: "Últimos 7 dias", days: 6 },
                  { label: "Últimos 14 dias", days: 13 },
                  { label: "Últimos 30 dias", days: 29 },
                  { label: "Últimos 90 dias", days: 89 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(to.getDate() - p.days);
                      from.setHours(0, 0, 0, 0);
                      setDateRange({ from, to });
                    }}
                    className="rounded-md px-3 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setDateRange(undefined)}
                  className="rounded-md px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Limpar
                </button>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            className="h-9 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Baixar PDF
          </Button>
          <span className="text-xs text-muted-foreground">
            {(view === "kanban" ? kanbanFiltered.length : filtered.length)} leads
          </span>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="h-[calc(100%-57px)] overflow-x-auto bg-muted/20 p-4 lg:p-6">
          <div className="grid h-full grid-cols-1 md:grid-cols-3 gap-4 min-w-[720px]">
            {KANBAN_COLS.map((col) => {
              const items = kanbanFiltered.filter((l) => col.statuses.includes(l.status));
              const isOver = dragOver === col.key;
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
                  onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
                  onDrop={() => {
                    if (dragId) {
                      const lead = leads.find((l) => l.id === dragId);
                      if (lead && !col.statuses.includes(lead.status)) {
                        updateStatusFor(dragId, col.primaryStatus);
                      }
                    }
                    setDragId(null);
                    setDragOver(null);
                  }}
                  className={cn(
                    "flex flex-col rounded-xl border border-border bg-card transition-colors",
                    isOver && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", col.bar)} />
                      <h3 className="font-display text-sm font-semibold">{col.label}</h3>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-3">
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                        Arraste leads para cá
                      </div>
                    )}
                    {items.map((l) => {
                      const meta = STATUS_META[l.status];
                      return (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={() => setDragId(l.id)}
                          onDragEnd={() => { setDragId(null); setDragOver(null); }}
                          onClick={() => setDetailId(l.id)}
                          className={cn(
                            "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5",
                            dragId === l.id && "opacity-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{l.name}</div>
                              <div className="truncate text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {l.phone}
                              </div>
                            </div>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {l.lastMessageAt ? new Date(l.lastMessageAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                            <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", meta.color)}>
                              {meta.label}
                            </span>
                          </div>
                          {adOf(l.id) && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              <Megaphone className="h-2.5 w-2.5" /> {adOf(l.id)!.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <div className="flex h-[calc(100%-57px)] flex-col lg:flex-row">
        {/* Lead list */}
        <aside className={cn(
          "flex w-full lg:w-[360px] shrink-0 flex-col border-r border-border bg-card",
          selected && "hidden lg:flex"
        )}>
          <div className="border-b border-border p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Leads</h2>
              <span className="text-xs font-medium text-muted-foreground">{filtered.length} de {leads.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9 bg-muted/50 border-transparent" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1">
              {(["todos", ...STATUS_LIST] as const).map((s) => {
                const active = filter === s;
                const label = s === "todos" ? "Todos" : STATUS_META[s].label;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lead encontrado.</div>
            )}
            {filtered.map((l) => {
              const meta = STATUS_META[l.status];
              const active = l.id === selectedId;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/60 p-4 text-left transition-colors hover:bg-muted/40",
                    active && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                      {l.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    {l.unread ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-card">
                        {l.unread}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{l.name}</span>
                      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{formatTime(l.lastMessageAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="truncate">{l.phone}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">• {l.source}</span>
                      {adOf(l.id) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Megaphone className="h-2.5 w-2.5" /> {adOf(l.id)!.name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Conversation */}
        <section className={cn("flex flex-1 flex-col bg-muted/30", !selected && "hidden lg:flex")}>
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-center text-muted-foreground p-8">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <Send className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Selecione um lead</h3>
                <p className="text-sm">Escolha uma conversa à esquerda para começar.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
                <button onClick={() => setSelectedId(null)} className="lg:hidden -ml-1 p-1 rounded-md hover:bg-muted">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                  {selected.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-base font-semibold">{selected.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <Phone className="h-3 w-3" /> {selected.phone}
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>Origem: {selected.source}</span>
                    {adOf(selected.id) && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Megaphone className="h-3 w-3" /> {adOf(selected.id)!.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Select value={selected.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
                  <SelectTrigger className="w-[180px] h-9 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_META[selected.status].dot)} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                          {STATUS_META[s].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto scrollbar-thin px-4 lg:px-8 py-6 space-y-3"
                style={{
                  backgroundImage:
                    "radial-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              >
                {messages.map((m) => {
                  const isAgent = m.from === "agent";
                  return (
                    <div key={m.id} className={cn("flex animate-fade-in", isAgent ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                          isAgent
                            ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                            : "bg-card text-foreground rounded-bl-sm border border-border"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", isAgent ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {isAgent && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-border bg-card p-3 lg:p-4">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0"><Paperclip className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="shrink-0"><Smile className="h-4 w-4" /></Button>
                  <div className="flex-1">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Escreva uma mensagem..."
                      className="bg-muted/50 border-transparent"
                    />
                  </div>
                  <Button onClick={handleSend} disabled={!draft.trim() || sending} className="bg-gradient-primary hover:opacity-95 shadow-glow shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      )}

      {/* Lead detail dialog (kanban) */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {detail.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <DialogTitle className="font-display">{detail.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1.5 text-xs">
                      <Phone className="h-3 w-3" /> {detail.phone}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-muted-foreground">Origem</div>
                  <div className="mt-0.5 font-semibold text-foreground">{detail.source}</div>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-muted-foreground">Última msg</div>
                  <div className="mt-0.5 font-semibold text-foreground">{formatTime(detail.lastMessageAt)}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Anúncio de origem</label>
                  <Link to="/config/anuncios" className="text-[10px] font-medium text-primary hover:underline">
                    Gerenciar
                  </Link>
                </div>
                {ads.filter((a) => a.active).length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    Nenhum anúncio ativo.{" "}
                    <Link to="/config/anuncios" className="text-primary hover:underline">Cadastrar agora</Link>
                  </div>
                ) : (
                  <Select
                    value={leadAds[detail.id] ?? getLeadAd(detail.id) ?? ""}
                    onValueChange={(v) => updateLeadAd(detail.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um anúncio" />
                    </SelectTrigger>
                    <SelectContent>
                      {ads.filter((a) => a.active).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-3 w-3 text-primary" />
                            <span>{a.name}</span>
                            <span className="text-muted-foreground text-[10px]">• {a.platform}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={detail.status} onValueChange={(v) => updateStatusFor(detail.id, v as LeadStatus)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_META[detail.status].dot)} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                          {STATUS_META[s].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Momento do lead</label>
                  <Link to="/config/status" className="text-[10px] font-medium text-primary hover:underline">
                    Configurar
                  </Link>
                </div>
                {moments.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    Nenhum momento cadastrado.{" "}
                    <Link to="/config/status" className="text-primary hover:underline">Cadastrar agora</Link>
                  </div>
                ) : (
                  <Select
                    value={leadMoments[detail.id] ?? ""}
                    onValueChange={(v) => updateLeadMoment(detail.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um momento" />
                    </SelectTrigger>
                    <SelectContent>
                      {moments.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                            {m.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => { setSelectedId(detail.id); setView("lista"); setDetailId(null); }}
                >
                  <Eye className="h-4 w-4" /> Ver conversa
                </Button>
                <Button className="flex-1 bg-gradient-primary hover:opacity-95 shadow-glow gap-2" onClick={() => setDetailId(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
