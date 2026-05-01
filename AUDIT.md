# Аудит проекта «ФлорМажор»: баги, производительность, безопасность

## Контекст

Проект — Next.js 16 (App Router, Server Components) + React 19 + Supabase + Tailwind 4. Лендинг и CMS-админка флористического магазина «ФлорМажор» (Омск).

Цель — обзорный аудит без правок: найти баги, узкие места по производительности, проблемы безопасности/UX, описать с указанием файлов и строк, чтобы дальше можно было фиксить адресно.

Аудит выполнен тремя параллельными Explore-агентами: «Баги», «Производительность», «Безопасность/UX».

---

## A. Баги (функциональные)

### A1. Эффекты, гидрация, DOM
- **`components/ui/use-mobile.tsx:6`** — `useState<boolean | undefined>(undefined)`, `!!isMobile` даёт SSR=false, CSR=true → hydration mismatch на компонентах, использующих хук. **Серьёзно.**
- **`components/header.tsx:28-36`** — при unmount компонента с открытым меню `document.body.style.overflow` остаётся `hidden` → залипает скролл. Нужен cleanup.
- **`lib/auth-context.tsx:30,36`** — `useMemo<BrowserSupabase>` без deps + `useEffect` без `supabase` в deps; маловероятный, но реальный риск устаревшего клиента.
- **`components/catalog-browser.tsx:103-115`** — `window.history.replaceState` без дебаунса при изменении фильтров; при быстрых нажатиях URL и состояние могут рассинхронизироваться.

### A2. Server Actions / формы
- **`app/actions/submit-lead.ts:51-145`** — нет защиты от двойной отправки (idempotency-key/одноразовый токен). Rate limit только по IP.
- **`app/actions/submit-lead.ts:87-88`** — небезопасный разбор `x-forwarded-for`: пустые значения тихо превращаются в `null`.
- **`app/actions/submit-lead.ts:40-48`** — `notifyTelegram` без timeout/retry; внешний вызов может зависать на 30+ сек.

### A3. Кэш / инвалидация
- **`app/admin/products/page.tsx:295-296`** — после правки товара не вызывается `revalidateSiteCache('/catalog/${slug}')`, страница карточки висит в кэше до 5 минут.
- **`proxy.ts:8-29`** — `fetchFlags` (maintenance) с `revalidate: 30`; для аварийного флага лучше `cache: 'no-store'`.
- **`app/api/revalidate/route.ts:27-28`** — `revalidateTag/Path` без try/catch, всегда возвращает `{ ok: true }`, ошибки скрыты.

### A4. Типы / null-safety
- **`app/admin/leads/page.tsx:59,65,69`** — `payload.new as Lead` без рантайм-валидации Realtime payload.
- **`components/product-gallery.tsx:23-25`** — fake `ProductImage` с `product_id: -1` как fallback; путаница, если где-то проверяется `product_id > 0`.

### A5. Изображения
- **`components/catalog-browser.tsx:29-30`**, `components/product-carousel.tsx:20-21`, `app/catalog/[slug]/page.tsx:30-31` — `PLACEHOLDER_IMAGE` указывает на внешний Unsplash; точка отказа на проде, риск блокировок, дублируется в трёх местах.
- **`components/admin/image-upload.tsx:124`** — нет валидации URL при ручной вставке; можно сохранить `javascript:` или `data:` URI.

### A6. Контроль доступа
- **`app/admin/*` (несколько страниц)** — пользователь не проверяется явно, RLS отбрасывает запросы; нет UI-feedback при неавторизованном входе. Минимум — явный редирект на `/admin/login` (есть в middleware, но дублирующая клиентская проверка отсутствует).

---

## B. Производительность

### B1. Данные / кэш (наибольший выигрыш)
- **`app/catalog/[slug]/page.tsx:52-78,99`** — `getProductBySlug` вызывается дважды (в `generateMetadata` и в компоненте) + `getAllProducts` для похожих → 2-3 лишних round-trip. Нужен `unstable_cache` или React `cache()`. **Высокий эффект.**
- **`app/catalog/[slug]/page.tsx`** — нет `generateStaticParams`; каждый товар → On-Demand ISR на первом хите. **Высокий эффект.**
- **`lib/site-data.ts:38-448`** — функции (`getSiteSettings`, `getThemeSettings`, `getNavItems`, и др.) не обёрнуты в `unstable_cache`; каждый рендер главной = 5-10 запросов в Supabase. **Высокий эффект.**

### B2. Bundle / Client Components
- **`app/admin/products/page.tsx`** — 697 строк, целиком `"use client"`, без `next/dynamic` для тяжёлых блоков (`ProductImagesEditor`, `TypographyPanel`, `SectionSurfaceEditor`). Можно вынести в lazy. **Средний эффект.**
- **`components/header.tsx:1`** — `"use client"` на всём компоненте; навигацию можно оставить серверной, в клиент уйдёт только тогглер мобильного меню. **Низкий эффект.**

### B3. БД-индексы
- **`supabase/migrations/0015_product_images.sql`** — нет индекса на `(product_id, is_primary)` или partial `WHERE is_primary`. При росте каталога выборка primary-картинки замедлится. **Средний эффект.**

### B4. Изображения / разметка
- **`components/product-gallery.tsx:167-171`** — `sizes="120px"` хардкодом для thumbnail; на мобильных лучше `(max-width: 640px) 80px, 120px`.
- **`components/hero-section.tsx:100-108`** — смешение `width/height` и `fill` с `aspect-[4/5]`; risk CLS.
- **`components/catalog-browser.tsx:250-256`** — `sizes` для карточки каталога завышены; на мобиле грузится 100vw.

### B5. SEO / метаданные
- **`app/catalog/[slug]/page.tsx`** — нет полноценной `generateMetadata` (OG-тэги, картинка товара). **Важно для SEO.**
- **`app/catalog/page.tsx:26-36`** — нет `openGraph`/`twitter` в метаданных каталога.
- **`app/sitemap.ts`** — sitemap не инвалидируется по тегу `products` после изменений.

### B6. Дублирование кода (косметика, но важно для поддержки)
- `formatPrice()` определена 4 раза идентично: `app/catalog/[slug]/page.tsx:33`, `components/product-carousel.tsx:23`, `components/catalog-browser.tsx:32`, `app/admin/products/page.tsx:56` → вынести в `lib/formatting.ts`.
- `primaryImage()` — 3 идентичных копии (те же файлы) → вынести туда же.

---

## C. Безопасность / UX / A11y

### C1. Безопасность
- **`app/layout.tsx:213`** — `theme.custom_css` пишется напрямую в `<style>` через `dangerouslySetInnerHTML` без whitelist свойств. Админ может вписать `@import url(...)` или `background:url(...)` для фишинга. **Важно.**
- **Нет CSP заголовков** в `next.config.mjs`. С учётом `custom_css` стоит добавить хотя бы базовый CSP. **Важно.**
- **`app/actions/submit-lead.ts:28-29`** — `TELEGRAM_BOT_TOKEN` в URL запроса; при логировании ошибки fetch с URL токен может попасть в логи. Логировать без URL.
- **`components/admin/image-upload.tsx:114-128`** — нет whitelist доменов / проверки HTTPS для ручного URL.

### C2. UX / Accessibility
- **`app/not-found.tsx`** — отсутствует кастомная 404; используется дефолтная Next.js. **Косметика, но видна.**
- **`app/admin/leads/page.tsx:397-493`** — модалка деталей заявки без focus-trap; невидим скринридер-пользователям.
- **`app/admin/products/page.tsx:306-317`** — `confirm()` для удаления; UX-минус, лучше кастомный диалог (Radix AlertDialog уже в зависимостях).
- **`app/admin/page.tsx:130-136`**, **`app/admin/leads/page.tsx:153-159`** — спиннеры вместо скелетонов в таблицах.
- **Иконки/аватары без `aria-label`** в админке (`components/admin/admin-shell.tsx`, etc.).

### C3. Формы (UX)
- **`components/contact-form.tsx`** — есть `useActionState`, но в админских формах (`app/admin/products/page.tsx`) этого нет; ошибки приходят только от сервера, без real-time подсветки.
- **`lib/validation/schemas.ts:136-137`** — координаты валидируются строго, но в UI нет понятного сообщения «диапазон -90..90».

---

## D. Приоритезация

| Уровень | Что делать | Пункты |
|---|---|---|
| **P0 — критично, низкая стоимость** | hydration mismatch, `body.overflow` cleanup, защита от двойной отправки лида, инвалидация `/catalog/[slug]`, `unstable_cache` для site-data, `generateStaticParams` для товара | A1.1, A1.2, A2.1, A3.1, B1.2, B1.3 |
| **P1 — заметный эффект** | timeout/retry Telegram, валидация Realtime payload, замена внешнего placeholder локальным SVG, OG-метаданные товара, индекс `product_images`, lazy admin/products, whitelist для `custom_css` + базовый CSP | A2.3, A4.1, A5.1, B5.1, B3, B2.1, C1.1, C1.2 |
| **P2 — техдолг и полировка** | вынос `formatPrice/primaryImage` в `lib/formatting.ts`, кастомная 404, focus-trap в модалке заявок, замена `confirm()` на AlertDialog, скелетоны вместо спиннеров, валидация URL в ImageUpload | B6, C2.1-C2.5, A5.2 |

**Итог:** ~12-16 часов на P0+P1, ещё ~6-8 часов на P2.

---

## E. Ключевые файлы для возможных правок

```
app/
  layout.tsx                       # custom_css санитайзер, CSP
  actions/submit-lead.ts           # idempotency, timeout Telegram, IP-парсинг
  admin/products/page.tsx          # инвалидация slug, lazy-импорты, AlertDialog
  admin/leads/page.tsx             # Zod-валидация Realtime, focus-trap
  catalog/[slug]/page.tsx          # generateStaticParams, generateMetadata, кэш
  api/revalidate/route.ts          # try/catch
  not-found.tsx                    # создать
components/
  ui/use-mobile.tsx                # инициализация без undefined
  header.tsx                       # cleanup overflow, разделить SC/CC
  catalog-browser.tsx              # дебаунс URL, sizes, placeholder
  product-gallery.tsx              # sizes, fallback без fake id
  product-carousel.tsx             # placeholder, sizes
  hero-section.tsx                 # выбрать fill ИЛИ width/height
  admin/image-upload.tsx           # whitelist URL/доменов
lib/
  site-data.ts                     # unstable_cache на горячие функции
  formatting.ts                    # создать: formatPrice, getPrimaryImageUrl
  auth-context.tsx                 # useEffect deps
proxy.ts                           # cache no-store для maintenance flag
supabase/migrations/00XX_*.sql     # новый индекс product_images(product_id, is_primary)
next.config.mjs                    # CSP headers
```

---

## F. План валидации (после возможных правок)

1. **Локально**: `pnpm typecheck`, `pnpm lint`, `pnpm test` — должны проходить.
2. **Смок-тест публичной части**: главная → каталог → карточка товара → форма лида (с JS и без), проверить редирект на `/thanks`, повторную отправку, мобильное меню (открыть → unmount → скролл должен работать).
3. **Админка**: вход, правка товара → проверить, что `/catalog/[slug]` обновляется, удаление через диалог, загрузка картинки через URL (попробовать `javascript:` — должно отвергаться).
4. **Перформанс**: Lighthouse на главной до/после; проверить, что карточка товара отдаётся как HTML без JS-генерации (через `generateStaticParams`).
5. **Безопасность**: проверить заголовки CSP через DevTools, попытаться вписать `@import` в `custom_css` — должно блокироваться валидацией.
