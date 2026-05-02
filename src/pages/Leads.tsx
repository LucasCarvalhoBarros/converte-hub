import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Phone, Search, Send, Paperclip, Smile, MoreVertical, ArrowLeft, CheckCheck, List, Columns3, MessageCircle, Eye, Calendar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lead, LeadStatus, Message, STATUS_LIST, STATUS_META } from "@/lib/types";
import { getLeads, getMessages, sendMessage, updateLeadStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Kanban columns map to existing LeadStatus values
type KanbanCol = "fez_contato" | "orcamento" | "comprou";
const KANBAN_COLS: { key: KanbanCol; label: string; statuses: LeadStatus[]; primaryStatus: LeadStatus; accent: string; bar: string }[] = [
  { key: "fez_contato", label: "Fez Contato", statuses: ["novo_lead", "em_atendimento"], primaryStatus: "novo_lead", accent: "bg-status-novo/10", bar: "bg-status-novo" },
  { key: "orcamento", label: "Orçamento", statuses: ["interessado", "quente"], primaryStatus: "interessado", accent: "bg-status-interessado/10", bar: "bg-status-interessado" },
  { key: "comprou", label: "Comprou", statuses: ["cliente"], primaryStatus: "cliente", accent: "bg-status-cliente/10", bar: "bg-status-cliente" },
];
function colOfStatus(s: LeadStatus): KanbanCol | null {
  for (const c of KANBAN_COLS) if (c.statuses.includes(s)) return c.key;
  return null;
}

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

  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [sourceFilter, setSourceFilter] = useState<string>("todas");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<KanbanCol | null>(null);

  useEffect(() => {
    getLeads().then((d) => {
      setLeads(d);
      if (!selectedId && d.length) {
        setSelectedId(d[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      setParams({ id: selectedId }, { replace: true });
      getMessages(selectedId).then(setMessages);
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filter !== "todos" && l.status !== filter) return false;
      if (search && !`${l.name} ${l.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, filter, search]);

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
        return true;
      }),
    [leads, sourceFilter, search]
  );
  const detail = leads.find((l) => l.id === detailId) ?? null;

  return (
    <AppShell>
      <div className="flex h-full flex-col lg:flex-row">
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
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">• {l.source}</span>
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {selected.phone}
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    <span>Origem: {selected.source}</span>
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
    </AppShell>
  );
}
