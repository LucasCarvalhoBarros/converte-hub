ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS avg_selling_price numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_complement ON public.products USING gin (to_tsvector('portuguese', COALESCE(complement, '')));

COMMENT ON COLUMN public.products.complement IS 'Informações complementares sobre a peça';
COMMENT ON COLUMN public.products.avg_selling_price IS 'Preço médio de venda praticado no mercado';
