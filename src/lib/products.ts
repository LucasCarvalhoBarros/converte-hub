import { supabase } from "@/integrations/supabase/client";
import { getStoredWorkspaceId } from "./workspace";

export interface Product {
  id: number;
  workspace_id: number;
  sku: string;
  name: string;
  category: string | null;
  cost: number;
  price: number;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductInput = {
  sku: string;
  name: string;
  category?: string | null;
  cost?: number;
  price?: number;
  stock?: number;
  min_stock?: number;
  active?: boolean;
};

function ws(): number {
  return Number(getStoredWorkspaceId() || 1);
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", ws())
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const initialStock = input.stock ?? 0;
  const payload = {
    workspace_id: ws(),
    sku: input.sku,
    name: input.name,
    category: input.category ?? null,
    cost: input.cost ?? 0,
    price: input.price ?? 0,
    stock: 0, // start at 0; movement below sets it
    min_stock: input.min_stock ?? 0,
    active: input.active ?? true,
  };
  const { data, error } = await supabase.from("products").insert(payload).select("*").single();
  if (error) throw error;
  const product = data as Product;
  if (initialStock > 0) {
    await supabase.from("stock_movements").insert({
      workspace_id: ws(),
      product_id: product.id,
      type: "in",
      quantity: initialStock,
      reason: "estoque inicial",
    });
  }
  return product;
}

export async function updateProduct(id: number, patch: Partial<ProductInput>): Promise<void> {
  const { error } = await supabase.from("products").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: number): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
