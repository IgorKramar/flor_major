-- 0016_product_price_display
-- Строковая подпись цены ("от 2 000 ₽", "по запросу" и т. п.).
-- Числовое price_amount остаётся обязательным для сортировки/JSON-LD.

alter table public.products
  add column if not exists price_display text;

alter table public.products
  drop constraint if exists products_price_display_length_chk;
alter table public.products
  add constraint products_price_display_length_chk
  check (price_display is null or char_length(price_display) <= 120);
