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
  image_url: string | null;
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
  image_url?: string | null;
};

const BUCKET = "product-images";

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${ws()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return data.signedUrl;
}

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
    image_url: input.image_url ?? null,
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
