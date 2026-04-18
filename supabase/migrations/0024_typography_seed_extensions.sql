-- 0024_typography_seed_extensions
-- Сидинг типографики для scope thanks_page.

insert into public.typography_settings (scope, element_key, font_family, font_size, font_weight, line_height, letter_spacing, text_transform, text_align, color) values
  ('thanks_page', 'heading',    'Cormorant Garamond', '3rem',     '600', '1.1', 'normal', 'none',      'center', null),
  ('thanks_page', 'subheading', 'Montserrat',         '1.25rem',  '500', '1.5', 'normal', 'none',      'center', null),
  ('thanks_page', 'body',       'Montserrat',         '1rem',     '400', '1.7', 'normal', 'none',      'center', null),
  ('thanks_page', 'phone',      'Cormorant Garamond', '1.5rem',   '600', '1.2', 'normal', 'none',      'center', null),
  ('thanks_page', 'button',     'Montserrat',         '0.875rem', '600', '1.2', '0.05em', 'uppercase', 'center', null)
on conflict (scope, element_key) do nothing;
