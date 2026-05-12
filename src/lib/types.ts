export type LeadStatus =
  | "novo_lead"
  | "em_atendimento"
  | "interessado"
  | "quente"
  | "cliente"
  | "perdido";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  source: string;
  avatarUrl?: string;
  lastMessageAt?: string;
  unread?: number;
  adId?: string | null;
  funnelStatusId?: string | null;
}

export interface Message {
  id: string;
  leadId: string;
  from: "lead" | "agent";
  text: string;
  createdAt: string;
}

export const STATUS_META: Record<LeadStatus, { label: string; color: string; dot: string }> = {
  novo_lead: { label: "Novo lead", color: "bg-status-novo/15 text-status-novo border-status-novo/30", dot: "bg-status-novo" },
  em_atendimento: { label: "Em atendimento", color: "bg-status-atendimento/15 text-status-atendimento border-status-atendimento/30", dot: "bg-status-atendimento" },
  interessado: { label: "Interessado", color: "bg-status-interessado/15 text-status-interessado border-status-interessado/30", dot: "bg-status-interessado" },
  quente: { label: "Quente 🔥", color: "bg-status-quente/15 text-status-quente border-status-quente/30", dot: "bg-status-quente" },
  cliente: { label: "Cliente", color: "bg-status-cliente/15 text-status-cliente border-status-cliente/30", dot: "bg-status-cliente" },
  perdido: { label: "Perdido", color: "bg-status-perdido/15 text-status-perdido border-status-perdido/30", dot: "bg-status-perdido" },
};

export const STATUS_LIST: LeadStatus[] = [
  "novo_lead",
  "em_atendimento",
  "interessado",
  "quente",
  "cliente",
  "perdido",
];
