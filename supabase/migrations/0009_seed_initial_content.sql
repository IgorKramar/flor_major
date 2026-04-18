-- Seed hardcoded content from components

-- site_settings (update the singleton row)
update public.site_settings set
  site_name = 'ФЛОРМАЖОР',
  site_description = 'Свежие букеты и цветочные композиции в Омске. ФЛОРМАЖОР: ул. Карла Маркса, 50. Круглосуточно. Доставка по городу. Розы, хризантемы, авторские букеты на заказ.',
  meta_keywords = array[
    'цветы омск', 'доставка цветов омск', 'букеты омск',
    'роза эквадор омск', 'роза кения омск',
    'цветочный магазин омск', 'флор мажор',
    'горшечные растения омск', 'шарики омск',
    'сувениры омск', 'хризантема омск',
    'букет на заказ', 'купить цветы омск',
    'свадебный букет омск', 'цветы на день рождения омск'
  ],
  og_image_url = '/og-image.jpg',
  canonical_url = 'https://flormajor-omsk.ru',
  theme_color = '#c89f9f',
  rating_value = 4.9,
  review_count = 128
where id = 1;

-- contact_info
update public.contact_info set
  phone_primary = '+7 (933) 303-39-42',
  phone_secondary = '+7 (913) 975-76-12',
  email = 'info@flormajor.ru',
  address = 'г. Омск, ул. Карла Маркса, 50',
  working_hours = 'Круглосуточно',
  whatsapp = 'https://wa.me/79333033942',
  telegram = 'https://t.me/flormajor',
  geo_lat = 54.9833,
  geo_lng = 73.3675,
  postal_code = '644000',
  address_region = 'Омская область',
  address_locality = 'Омск',
  address_country = 'RU'
where id = 1;

-- footer_config
update public.footer_config set
  brand_display = 'ФЛОРМАЖОР',
  tagline = 'Цветы с душой в Омске',
  copyright_template = '© {year} ФЛОРМАЖОР. Все права защищены.'
where id = 1;

-- hero_settings
insert into public.hero_settings (id, title, subtitle, cta_text, cta_link, background_image, is_active, secondary_cta_text, secondary_cta_link, alt_text, overlay_opacity)
values (
  1,
  'Цветы, которые говорят за вас',
  'Свежие букеты и авторские композиции в Омске. Доставка круглосуточно.',
  'Смотреть букеты',
  '#bouquets',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&q=80',
  true,
  'Связаться',
  '#contact',
  'Букет цветов ФЛОРМАЖОР',
  0.4
) on conflict (id) do update set
  secondary_cta_text = excluded.secondary_cta_text,
  secondary_cta_link = excluded.secondary_cta_link,
  alt_text = excluded.alt_text;

-- nav_items (matches original header.tsx)
insert into public.nav_items (label, href, sort_order, is_active) values
  ('Главная', '#home', 10, true),
  ('Букеты', '#bouquets', 20, true),
  ('Каталог', '#catalog', 30, true),
  ('Контакты', '#contact', 40, true)
on conflict do nothing;

-- categories (matches catalog-section.tsx)
insert into public.categories (slug, name, description, icon_name, sort_order, show_on_home, is_active) values
  ('bouquets', 'Букеты роз', 'Классические и авторские букеты из свежих роз', 'Flower2', 10, true, true),
  ('plants', 'Горшечные растения', 'Привнесите живые цветы в дом или офис', 'Leaf', 20, true, true),
  ('balloons', 'Шары и сувениры', 'Праздничные аксессуары и подарки', 'Gift', 30, true, true),
  ('custom', 'Авторские композиции', 'Уникальные букеты по вашему вкусу', 'Sparkles', 40, true, true)
on conflict (slug) do nothing;

-- features (matches features-section.tsx)
insert into public.features (icon_name, title, description, sort_order, is_active) values
  ('Truck', 'Доставка по Омску', 'Круглосуточная доставка букетов по всему городу', 10, true),
  ('Heart', 'С душой', 'Каждый букет собирается мастерами с заботой о деталях', 20, true),
  ('Sparkles', 'Только свежее', 'Работаем напрямую с плантациями Эквадора и Кении', 30, true)
on conflict do nothing;

-- social_links (matches footer.tsx)
insert into public.social_links (platform, url, icon_name, sort_order, is_active) values
  ('Instagram', 'https://instagram.com/flormajor', 'Instagram', 10, true),
  ('WhatsApp', 'https://wa.me/79333033942', 'MessageCircle', 20, true),
  ('Telegram', 'https://t.me/flormajor', 'Send', 30, true)
on conflict do nothing;
;
