# ФлорМажор — Enterprise Landing

Next.js 16 + Supabase лендинг для цветочного магазина «ФлорМажор» с полноценной CMS-админкой, нормализованной БД, RLS, Supabase Storage, Realtime и серверной отдачей контента.

## Стек

- **Next.js 16** (App Router, Server Components, Turbopack)
- **React 19**
- **TypeScript 5.7** (strict, генерация типов из Supabase)
- **Supabase** — Postgres, Auth, Storage, Realtime, Row-Level Security
- **Zod** — валидация на клиенте и сервере
- **Tailwind CSS v4** + CSS-переменные (темизация из БД)
- **Radix UI**, `lucide-react`, `sonner`
- **Vitest** — юнит-тесты для валидации
- **ESLint** (flat config) + `typescript-eslint`

## Структура проекта

```
app/
  admin/            — CMS-админка (hero, products, categories, leads,
                      seo, appearance, footer, audit, users и т.д.)
  api/revalidate/   — защищённый route handler для инвалидации кэша
  actions/          — Server Actions (submit-lead)
  layout.tsx        — SSR: meta, JSON-LD, динамические CSS-переменные
  page.tsx          — SSR главной, собирается из БД
  sitemap.ts        — sitemap из site_settings + nav_items
components/
  admin/            — AdminShell, Sidebar, ImageUpload, IconPicker
  (секции)          — Header, HeroSection, ProductCarousel, …
lib/
  supabase/         — браузерный, серверный и сервисный клиенты,
                      middleware-хелпер
  validation/       — Zod-схемы для всех сущностей
  database.types.ts — сгенерированные типы Supabase
  site-data.ts      — агрегатор данных для SSR
  icons.ts          — маппинг Lucide-иконок
proxy.ts            — Next.js proxy (auth, admin guard, maintenance)
supabase/
  migrations/       — 0001…0012 миграции (см. ниже)
tests/              — Vitest
```

## База данных

Миграции лежат в `supabase/migrations/` и применяются последовательно:

| №    | Миграция                               | Что делает                                            |
| ---- | -------------------------------------- | ----------------------------------------------------- |
| 0001 | `admin_users_and_helpers`              | `admin_users`, `is_admin()`, `is_owner()`, `audit_log`, триггеры |
| 0002 | `site_settings_and_theme`              | Singleton-таблицы: `site_settings`, `contact_info`, `theme_settings`, `footer_config` |
| 0003 | `content_tables`                        | `categories`, `nav_items`, `features`, `social_links` |
| 0004 | `hero_expansion`                        | Расширение `hero_settings` (accent, secondary CTA, overlay) |
| 0005 | `products_normalization`                | `products.price_amount`, `slug`, `sort_order`, FK на категории |
| 0006 | `leads_expansion_and_rate_limits`       | `leads.source/ip_hash/…`, `rate_limits`               |
| 0007 | `rls_policies`                          | RLS для всех customisable-таблиц                       |
| 0008 | `audit_triggers`                        | Аудит всех INSERT/UPDATE/DELETE по CMS-таблицам       |
| 0009 | `seed_initial_content`                  | Посев стартового контента                             |
| 0010 | `fix_function_search_path`              | Security hardening для функций                        |
| 0011 | `rls_perf_cleanup`                      | Перф-оптимизация RLS (`(select auth.uid())`), индексы |
| 0012 | `storage_media_bucket`                  | Public-bucket `media` + RLS для Supabase Storage      |

RLS-политика общая:

- `SELECT` — публичный, только `is_active = true` (где применимо).
- `INSERT/UPDATE/DELETE` — только `public.is_admin()`.
- `leads.INSERT` — публичный (через Server Action с rate limit).

## Роли и доступ

Таблица `admin_users (user_id, role)` с ролями `owner | admin | editor`. Проверка через SQL-функции `public.is_admin()`, `public.is_owner()`. Страница `/admin/users` позволяет owner-ам управлять ролями.

## CMS-админка

Полный набор разделов:

- **Dashboard** — статистика + Realtime по новым лидам
- **Hero** — заголовок, акцент, фон (через Supabase Storage), CTA
- **Products** — каталог (цена numeric, валюта, slug, категория, featured)
- **Categories / Navigation / Features / Social** — CRUD + иконки
- **Contacts** — телефон, email, адрес, координаты, рабочие часы
- **Appearance** — цвета, типографика, border-radius, custom CSS
- **SEO** — site name, description, keywords, OG image, canonical, theme-color, rating/reviews
- **Footer** — бренд, tagline, copyright, цвета
- **Settings** — analytics, maintenance mode
- **Leads** — таблица + модалка, смена статуса, Realtime уведомления
- **Audit** — журнал изменений
- **Users** — управление админами

## Валидация

Все формы (и админка, и лид с лендинга) проходят через Zod-схемы из `lib/validation/schemas.ts`. Схемы покрыты Vitest-тестами в `tests/validation.test.ts`.

## Лиды

Server Action `app/actions/submit-lead.ts`:

1. Валидирует вход (`leadSchema`).
2. Делает rate limit по SHA-256 хэшу IP (`rate_limits`).
3. Вставляет в `leads` через сервисный клиент.
4. Отправляет уведомление в Telegram (если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`).

## Инвалидация кэша

- Секции SSR тянут данные через `lib/site-data.ts` с общим тегом `site-data` (revalidate 5 мин).
- Админка после записи вызывает `lib/revalidate.ts` → `POST /api/revalidate` (требует JWT с `is_admin()`).

## Переменные окружения

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # для Server Actions / admin client
SUPABASE_PROJECT_REF=               # для scripts/generate-types.ts
TELEGRAM_BOT_TOKEN=                 # опционально
TELEGRAM_CHAT_ID=                   # опционально
REVALIDATE_SECRET=                  # дополнительная защита /api/revalidate (опционально)
```

## Скрипты

```bash
pnpm dev            # Next.js dev
pnpm build          # Production build (Turbopack)
pnpm start          # Production start
pnpm lint           # ESLint flat config
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest (валидация)
pnpm types:generate # Регенерация lib/database.types.ts из Supabase
```

## Создание первого админа

1. Зарегистрируйтесь через `/admin/login`.
2. В Supabase SQL Editor:

   ```sql
   insert into public.admin_users (user_id, role)
   values ('<uuid-из-auth.users>', 'owner');
   ```

3. Перелогиньтесь — доступна вся админка.

## Деплой

1. Залить миграции: `supabase db push` или через MCP.
2. Задать переменные окружения в Vercel / хосте.
3. `pnpm build && pnpm start` или Vercel.
