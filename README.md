# ФлорМажор — лендинг и CMS

Next.js 16 + Supabase: публичный лендинг цветочного магазина **«ФлорМажор»** (Омск) с полноценной админкой, каталогом товаров без корзины (лиды), типографикой и оформлением секций из базы. Контент и тема отдаются с сервера (ISR), доступ к данным через RLS.

**История изменений:** [CHANGELOG.md](CHANGELOG.md).

**Права на код:** проприетарная лицензия, см. [LICENSE.md](LICENSE.md).

## Стек

- **Next.js 16** (App Router, Server Components)
- **React 19**, **TypeScript** (strict)
- **Supabase** — Postgres, Auth, Storage, Realtime, Row-Level Security
- **Zod** — валидация форм и Server Actions
- **Tailwind CSS v4** + CSS-переменные (тема из `theme_settings`, секции — из `landing_section_styles`)
- **Radix UI**, **lucide-react**, **@phosphor-icons/react** (SSR), **sonner**
- **Vitest** — тесты валидации
- **ESLint** + **typescript-eslint**

## Публичный сайт

| Маршрут | Описание |
| ------- | -------- |
| `/` | Главная: hero, избранные товары, категории, преимущества, контакты, форма лида |
| `/catalog` | Каталог: фильтр по категории, поиск с подсветкой, сортировка по цене |
| `/catalog/[slug]` | Карточка товара: галерея, описание, настройки из БД |
| `/thanks` | Страница благодарности после отправки формы (если включена в админке) |
| `/sitemap.xml` | Карта сайта, включая товары и каталог |

## Админка (`/admin`)

Основные разделы (после входа Supabase Auth и записи в `admin_users`):

- **Обзор**, **Товары**, **Категории**, **Заявки** (в т.ч. удаление), **Hero**, **Преимущества**, **Навигация**
- **Футер** — тексты, цвета, порядок блоков, соцсети (CRUD)
- **Контакты** — данные для сайта + **оформление секции** «Контакты» на главной
- **Страница каталога**, **Страница товара**, **Страница «Спасибо»** — тексты, флаги, типографика
- **SEO**, **Брендинг** (глобальные цвета, шрифты, CSS), **Настройки**, **Аудит**, **Пользователи**

В разделах **Hero**, **Товары**, **Категории**, **Преимущества**, **Контакты** есть блок **«Как выглядит блок на главной»**: фон (как в теме / цвет / градиент / картинка) и цвета секции через color picker — без ручного ввода HEX для обычных пользователей.

Типографика по текстовым блокам настраивается **внутри соответствующих страниц** админки (не отдельным глобальным разделом).

## Структура проекта (кратко)

```
app/
  admin/           CMS: hero, products, categories, leads, footer, contacts,
                   catalog-page, product-page, thanks, appearance, …
  catalog/         Список и карточка товара
  thanks/          Публичная страница «Спасибо»
  actions/         Server Actions (лиды)
  api/revalidate/  Инвалидация кэша по тегу
components/
  admin/           Sidebar, ImageUpload, IconPicker, TypographyPanel,
                   SectionSurfaceEditor, ColorPickerField, …
lib/
  site-data.ts     Загрузка данных для SSR / ISR
  landing-section-theme.ts  Сборка стилей секций главной
  validation/      Zod-схемы
  database.types.ts        Типы таблиц Supabase (в т.ч. вручную для новых таблиц)
supabase/migrations/       SQL-миграции (применять по порядку в Supabase SQL Editor или CLI)
```

## База данных и миграции

Файлы в `supabase/migrations/` нумеруются по порядку. Ранние миграции (`0001`–`0012`): админы, настройки сайта, контент, товары, лиды, RLS, аудит, Storage и т.д.

Дополнительно (среди прочего):

| Файл (префикс) | Назначение (кратко) |
| -------------- | ------------------- |
| `0013`–`0014` | Первичный ключ аудита, Realtime для заявок |
| `0015`–`0016` | Несколько фото у товара, текстовая цена |
| `0017`–`0018` | Типографика в БД, realtime для связанных сущностей |
| `0019` | Правки `nav_items` |
| `0020` | Изображение и оверлей у категорий |
| `0021` | Настройки страниц `/catalog` и `/catalog/[slug]` |
| `0022` | Настройки `/thanks` |
| `0023` | Футер: видимость и порядок блоков |
| `0024` | Seed типографики для thanks |
| `0025`–`0026` | Стили секций главной (`landing_section_styles`) |

Точные имена файлов смотрите в каталоге `supabase/migrations/`.

## Роли и доступ

Таблица `admin_users (user_id, role)` с ролями `owner | admin | editor`. Проверка в SQL: `public.is_admin()`, `public.is_owner()`. Страница `/admin/users` — для владельцев.

## Лиды

Server Action отправки формы: валидация, rate limit, вставка в `leads`, опционально Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`). При активной странице «Спасибо» — редирект на `/thanks`.

## Инвалидация кэша

Данные для публичных страниц собираются через `lib/site-data.ts` (тег `site-data`, revalidate порядка нескольких минут). После сохранения в админке вызывается `POST /api/revalidate` (см. `lib/revalidate.ts`).

## Переменные окружения

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=              # для scripts/generate-types.ts
TELEGRAM_BOT_TOKEN=                # опционально
TELEGRAM_CHAT_ID=                  # опционально
REVALIDATE_SECRET=                 # опционально, усиление /api/revalidate
```

## Скрипты

```bash
pnpm dev             # разработка
pnpm build           # production-сборка
pnpm start           # запуск production
pnpm lint
pnpm typecheck       # tsc --noEmit
pnpm test            # Vitest
pnpm types:generate  # обновление lib/database.types.ts из Supabase
```

## Первый админ

1. Зарегистрируйтесь через `/admin/login`.
2. В Supabase SQL Editor:

   ```sql
   insert into public.admin_users (user_id, role)
   values ('<uuid из auth.users>', 'owner');
   ```

3. Выйдите и войдите снова.

## Деплой

1. Применить миграции к проекту Supabase (по порядку).
2. Задать переменные окружения на хосте (например Vercel).
3. `pnpm build` и деплой артефакта.

---

Права на исходный код проекта: [LICENSE.md](LICENSE.md). История изменений: [CHANGELOG.md](CHANGELOG.md).
