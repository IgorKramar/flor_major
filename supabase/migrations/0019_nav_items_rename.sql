-- 0019_nav_items_rename
-- UI-переименование: "Букеты" → "Товары", якоря #bouquets/#catalog → #products/#categories.
-- Только для nav_items, если такие записи присутствуют.

update public.nav_items
set label = 'Товары'
where label = 'Букеты';

update public.nav_items
set href = replace(href, '#bouquets', '#products')
where href like '%#bouquets%';

update public.nav_items
set href = replace(href, '#catalog', '#categories')
where href like '%#catalog%' and href not like '%/catalog%';
