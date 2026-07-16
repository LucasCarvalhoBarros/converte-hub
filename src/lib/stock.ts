import { supabase } from "@/integrations/supabase/client";
import { getStoredWorkspaceId } from "./workspace";

export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement {
  id: number;
  workspace_id: number;
  product_id: number;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  reference_id: number | null;
  created_at: string;
  product?: { name: string; sku: string } | null;
}

function ws(): number {
  return Number(getStoredWorkspaceId() || 1);
}

export async function listMovements(filter?: {
  productId?: number | null;
  from?: string;
  to?: string;
}): Promise<StockMovement[]> {
  let q = supabase
    .from("stock_movements")
    .select("*, product:products(name, sku)")
    .eq("workspace_id", ws())
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter?.productId) q = q.eq("product_id", filter.productId);
  if (filter?.from) q = q.gte("created_at", filter.from);
  if (filter?.to) q = q.lte("created_at", filter.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as StockMovement[];
}

export async function createMovement(input: {
  product_id: number;
  type: StockMovementType;
  quantity: number;
  reason?: string;
}): Promise<void> {
  const { error } = await supabase.from("stock_movements").insert({
    workspace_id: ws(),
    product_id: input.product_id,
    type: input.type,
    quantity: input.quantity,
    reason: input.reason ?? null,
  });
  if (error) throw error;
}
