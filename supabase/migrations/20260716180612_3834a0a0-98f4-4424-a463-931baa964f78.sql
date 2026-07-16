
-- Enum for sale channels
CREATE TYPE public.sale_channel AS ENUM ('mercado_livre', 'magalu', 'propria', 'outros');
CREATE TYPE public.stock_movement_type AS ENUM ('in', 'out', 'adjust');

-- Products
CREATE TABLE public.products (
  id BIGSERIAL PRIMARY KEY,
  workspace_id INT NOT NULL DEFAULT 1,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sku)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.products_id_seq TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products all" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX products_workspace_idx ON public.products(workspace_id);
CREATE INDEX products_sku_idx ON public.products(sku);

-- Stock movements
CREATE TABLE public.stock_movements (
  id BIGSERIAL PRIMARY KEY,
  workspace_id INT NOT NULL DEFAULT 1,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.stock_movement_type NOT NULL,
  quantity INT NOT NULL,
  reason TEXT,
  reference_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.stock_movements_id_seq TO anon, authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements all" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX stock_movements_product_idx ON public.stock_movements(product_id);
CREATE INDEX stock_movements_workspace_idx ON public.stock_movements(workspace_id);

-- Sales
CREATE TABLE public.sales_orders (
  id BIGSERIAL PRIMARY KEY,
  workspace_id INT NOT NULL DEFAULT 1,
  channel public.sale_channel NOT NULL,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT,
  marketplace_order_id TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sales_orders_id_seq TO anon, authenticated;
GRANT ALL ON public.sales_orders TO service_role;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_orders all" ON public.sales_orders FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX sales_orders_workspace_idx ON public.sales_orders(workspace_id);
CREATE INDEX sales_orders_sold_at_idx ON public.sales_orders(sold_at);
CREATE INDEX sales_orders_channel_idx ON public.sales_orders(channel);

-- Sale items
CREATE TABLE public.sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sale_items_id_seq TO anon, authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items all" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX sale_items_sale_idx ON public.sale_items(sale_id);
CREATE INDEX sale_items_product_idx ON public.sale_items(product_id);

-- updated_at trigger for products
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: after stock_movement insert, adjust product stock
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE public.products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.type = 'out' THEN
    UPDATE public.products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.type = 'adjust' THEN
    UPDATE public.products SET stock = NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER stock_movements_apply
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- Trigger: on sale_item insert generate stock_movement 'out'
CREATE OR REPLACE FUNCTION public.sale_item_stock_out()
RETURNS TRIGGER AS $$
DECLARE
  ws INT;
BEGIN
  SELECT workspace_id INTO ws FROM public.sales_orders WHERE id = NEW.sale_id;
  INSERT INTO public.stock_movements (workspace_id, product_id, type, quantity, reason, reference_id)
  VALUES (COALESCE(ws, 1), NEW.product_id, 'out', NEW.quantity, 'venda', NEW.sale_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sale_items_stock_out
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.sale_item_stock_out();

-- Trigger: on sale_item delete, generate stock_movement 'in' (estorno)
CREATE OR REPLACE FUNCTION public.sale_item_stock_return()
RETURNS TRIGGER AS $$
DECLARE
  ws INT;
BEGIN
  SELECT workspace_id INTO ws FROM public.sales_orders WHERE id = OLD.sale_id;
  INSERT INTO public.stock_movements (workspace_id, product_id, type, quantity, reason, reference_id)
  VALUES (COALESCE(ws, 1), OLD.product_id, 'in', OLD.quantity, 'estorno_venda', OLD.sale_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sale_items_stock_return
AFTER DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.sale_item_stock_return();
