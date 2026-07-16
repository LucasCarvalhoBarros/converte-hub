import { supabase } from "@/integrations/supabase/client";
import { getStoredWorkspaceId } from "./workspace";

export type SaleChannel = "mercado_livre" | "magalu" | "propria" | "outros";

export const CHANNEL_LABEL: Record<SaleChannel, string> = {
  mercado_livre: "Mercado Livre",
  magalu: "Magalu",
  propria: "Loja própria",
  outros: "Outros",
};

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: { name: string; sku: string } | null;
}

export interface SalesOrder {
  id: number;
  workspace_id: number;
  channel: SaleChannel;
  sold_at: string;
  customer_name: string | null;
  marketplace_order_id: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  items?: SaleItem[];
}

function ws(): number {
  return Number(getStoredWorkspaceId() || 1);
}

export async function listSales(filter?: {
  channel?: SaleChannel | null;
  from?: string;
  to?: string;
}): Promise<SalesOrder[]> {
  let q = supabase
    .from("sales_orders")
    .select("*, items:sale_items(*, product:products(name, sku))")
    .eq("workspace_id", ws())
    .order("sold_at", { ascending: false })
    .limit(500);
  if (filter?.channel) q = q.eq("channel", filter.channel);
  if (filter?.from) q = q.gte("sold_at", filter.from);
  if (filter?.to) q = q.lte("sold_at", filter.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as SalesOrder[];
}

export interface CreateSaleInput {
  channel: SaleChannel;
  sold_at: string; // ISO
  customer_name?: string | null;
  marketplace_order_id?: string | null;
  shipping?: number;
  discount?: number;
  notes?: string | null;
  items: { product_id: number; quantity: number; unit_price: number }[];
}

export async function createSale(input: CreateSaleInput): Promise<SalesOrder> {
  const subtotal = input.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const shipping = input.shipping ?? 0;
  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const { data: order, error } = await supabase
    .from("sales_orders")
    .insert({
      workspace_id: ws(),
      channel: input.channel,
      sold_at: input.sold_at,
      customer_name: input.customer_name ?? null,
      marketplace_order_id: input.marketplace_order_id ?? null,
      subtotal,
      shipping,
      discount,
      total,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const rows = input.items.map((it) => ({
    sale_id: order.id,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    subtotal: it.quantity * it.unit_price,
  }));
  const { error: itemsErr } = await supabase.from("sale_items").insert(rows);
  if (itemsErr) {
    await supabase.from("sales_orders").delete().eq("id", order.id);
    throw itemsErr;
  }
  return order as SalesOrder;
}

export async function deleteSale(id: number): Promise<void> {
  const { error } = await supabase.from("sales_orders").delete().eq("id", id);
  if (error) throw error;
}
