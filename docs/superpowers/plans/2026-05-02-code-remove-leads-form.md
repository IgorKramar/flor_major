# План B: код-изменения для миграции CHEAP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить ветку `migrate-cheap-stack`, в которой удалены публичная форма обратной связи и страница `/thanks`, написаны SQL-миграции `0027` и `0028`, дашборд админки переработан под Сценарий B, закрыты пункты B1.2 и B1.3 из аудита (`generateStaticParams` + `unstable_cache`).

**Architecture:** Точечное удаление кода и связанных типов/тестов; переработка `app/admin/page.tsx` под новый набор данных (товары вместо лидов); добавление двух новых SQL-миграций; обёртывание hot-path функций `lib/site-data.ts` в `unstable_cache` с тегом `site-data`. Никакого нового кода, кроме `unstable_cache`-обёрток и нового виджета «Последние обновлённые товары».

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Supabase JS, Zod, Tailwind v4, Vitest, ESLint.

**Базовый spec:** [`../specs/2026-05-02-cheap-migration-design.md`](../specs/2026-05-02-cheap-migration-design.md).

---

## Контекст для исполнителя (читать первым)

Эта ветка — **только код**. Серверная сторона (поднятие self-hosted Supabase, перенос данных, cutover) — отдельные планы C и A. Эта ветка должна:

1. Собираться (`pnpm build`) с **существующими** env-переменными, указывающими на Supabase Cloud.
2. Проходить `pnpm lint`, `pnpm typecheck`, `pnpm test` без правок `lib/database.types.ts`. Тип `leads` и `thanks_page_settings` в этом файле останутся — мы их не используем в коде, и они уйдут сами при регенерации после переезда на новую БД (часть плана C).
3. На локальном `pnpm dev` главная страница должна рендериться без формы и без секции «Последние заявки» в админке.

**Важно:** миграции `0027` и `0028` **не применяются к Supabase Cloud в этой ветке.** Они применяются на новой self-hosted БД в плане C (cutover). В коде они нужны просто как файлы — чтобы при поднятии новой БД миграционная история была полной.

**Ветка:** `migrate-cheap-stack` уже существует, отрезана от `main` (`d5b7167`), working tree чистый.

---

## File Structure

**Удаляются целиком:**

| Файл | Назначение |
|---|---|
| `components/contact-form.tsx` | Публичная форма обратной связи |
| `app/actions/submit-lead.ts` | Server Action отправки лида |
| `app/admin/leads/page.tsx` | Раздел «Заявки» в админке |
| `app/admin/leads/` | Папка целиком |
| `app/thanks/page.tsx` | Публичная страница «Спасибо» |
| `app/thanks/` | Папка целиком (только `page.tsx`) |
| `app/admin/thanks/page.tsx` | Раздел настроек страницы «Спасибо» в админке |
| `app/admin/thanks/` | Папка целиком |

**Создаются:**

| Файл | Назначение |
|---|---|
| `supabase/migrations/0027_remove_leads.sql` | DROP таблиц `leads` и `rate_limits`, снятие `leads` с realtime publication |
| `supabase/migrations/0028_remove_thanks_page.sql` | DROP таблицы `thanks_page_settings`, удаление seed'ов типографики `scope='thanks_page'` |

**Модифицируются:**

| Файл | Что меняется |
|---|---|
| `app/page.tsx` | Убрать prop `thanksActive` у `<ContactSection>` |
| `app/admin/page.tsx` | Полный рефакторинг дашборда (новые stat-карточки, новый виджет «Последние обновлённые товары» вместо «Последних заявок», без Realtime) |
| `components/contact-section.tsx` | Убрать `<ContactForm>`, перестроить grid в одну колонку, убрать prop `thanksActive` |
| `components/admin/sidebar.tsx` | Удалить пункты «Заявки» и «Страница «Спасибо»» |
| `lib/site-data.ts` | Удалить `getThanksPageSettings`, `THANKS_PAGE_DEFAULTS`, поле `thanksPage` в `SiteData`. Обернуть hot-path функции в `unstable_cache` (B1.3). Удалить импорт `ThanksPageSettings` |
| `lib/supabase.ts` | Удалить экспорты `Lead` и `ThanksPageSettings` |
| `lib/validation/schemas.ts` | Удалить `leadSchema`, `LeadInput`, `thanksPageSettingsSchema`, `ThanksPageSettingsInput` |
| `tests/validation.test.ts` | Удалить блок `describe('leadSchema', ...)` |
| `app/catalog/[slug]/page.tsx` | Добавить `generateStaticParams` (B1.2) |

---

## Phase 0 — Baseline

### Task 1: Зафиксировать baseline до правок

**Files:**
- Read-only: весь репо

- [ ] **Step 1: Проверить, что мы на правильной ветке и working tree чист**

Run:
```bash
git rev-parse --abbrev-ref HEAD
git status --porcelain
```
Expected:
```
migrate-cheap-stack
(пусто)
```

Если ветка другая — `git checkout migrate-cheap-stack`. Если working tree грязный — остановиться, разобраться вручную.

- [ ] **Step 2: Прогнать lint, чтобы зафиксировать baseline**

Run: `pnpm lint`
Expected: pass без ошибок (могут быть warnings — это OK, фиксировать как baseline).

Если lint фейлится — остановиться, починить или явно проигнорировать в `eslint.config.mjs` (но скорее всего main чистый).

- [ ] **Step 3: Прогнать typecheck**

Run: `pnpm typecheck`
Expected: pass без ошибок.

- [ ] **Step 4: Прогнать тесты**

Run: `pnpm test`
Expected: pass, в т.ч. блок `describe('leadSchema')` (мы его удалим в Task 16).

- [ ] **Step 5: Прогнать сборку**

Run: `pnpm build`
Expected: success, без рантайм-ошибок при пререндере (требует, чтобы env-переменные Supabase Cloud были выставлены).

> **Если build не работает локально из-за отсутствия `.env`** — это известная блокирующая ситуация. Остановиться, запросить у владельца файл `.env.local` с переменными Supabase Cloud (read-only вариант) или временно исключить страницы, требующие БД, из пререндера. Не продолжать без passing build.

---

## Phase 1 — SQL-миграции

### Task 2: Создать миграцию `0027_remove_leads.sql`

**Files:**
- Create: `supabase/migrations/0027_remove_leads.sql`

- [ ] **Step 1: Проверить, что номер свободен**

Run: `ls supabase/migrations/ | grep '^0027'`
Expected: пусто.

- [ ] **Step 2: Создать файл с миграцией**

Создать `supabase/migrations/0027_remove_leads.sql`:

```sql
-- 0027_remove_leads
-- Удаление формы обратной связи (Сценарий B миграции в РФ-инфраструктуру).
-- См. docs/superpowers/specs/2026-05-02-cheap-migration-design.md § 3.7.

-- Снять таблицу с Realtime-публикации (если опубликована).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'leads'
     )
  then
    alter publication supabase_realtime drop table public.leads;
  end if;
end$$;

-- Удалить таблицы. CASCADE снимает RLS-политики и триггеры автоматически.
drop table if exists public.leads cascade;
drop table if exists public.rate_limits cascade;
```

> Use `do $$ ... $$` блок вместо прямого `alter publication` — потому что в новой БД (где миграция применяется впервые) таблица `leads` ещё не создана к моменту `0027`, нет, погоди — она создаётся в `0001` или раньше, а realtime-добавление в `0014`. Поэтому к моменту `0027` и таблица, и publication существуют. Но безопаснее проверить через `pg_publication_tables`, чтобы миграция была идемпотентной.

- [ ] **Step 3: Проверить SQL на синтаксис локально (опционально, требует psql)**

Если есть локальный postgres:
```bash
psql -d postgres -f supabase/migrations/0027_remove_leads.sql --single-transaction --set ON_ERROR_STOP=on -c "rollback;"
```
Expected: парсинг без ошибок (откатываем транзакцией, ничего не меняем).

Если psql нет — пропустить, проверим в плане C при реальном применении.

- [ ] **Step 4: Закоммитить**

```bash
git add supabase/migrations/0027_remove_leads.sql
git commit -m "feat(db): миграция 0027 — удаление таблиц leads и rate_limits"
```

---

### Task 3: Создать миграцию `0028_remove_thanks_page.sql`

**Files:**
- Create: `supabase/migrations/0028_remove_thanks_page.sql`

- [ ] **Step 1: Проверить номер**

Run: `ls supabase/migrations/ | grep '^0028'`
Expected: пусто.

- [ ] **Step 2: Создать файл**

`supabase/migrations/0028_remove_thanks_page.sql`:

```sql
-- 0028_remove_thanks_page
-- Удаление страницы «Спасибо» — она существовала только для редиректа после
-- формы обратной связи, которая удаляется в 0027.
-- См. docs/superpowers/specs/2026-05-02-cheap-migration-design.md § 3.7.

-- Удалить таблицу настроек. CASCADE снимает RLS-политики и триггеры.
drop table if exists public.thanks_page_settings cascade;

-- Удалить seed'ы типографики для scope 'thanks_page' (см. 0024_typography_seed_extensions).
delete from public.typography_settings where scope = 'thanks_page';
```

- [ ] **Step 3: Закоммитить**

```bash
git add supabase/migrations/0028_remove_thanks_page.sql
git commit -m "feat(db): миграция 0028 — удаление таблицы thanks_page_settings"
```

---

## Phase 2 — Удаление публичной формы и страницы /thanks

### Task 4: Удалить файлы формы и Server Action

**Files:**
- Delete: `components/contact-form.tsx`
- Delete: `app/actions/submit-lead.ts`

- [ ] **Step 1: Удалить файлы**

Run:
```bash
git rm components/contact-form.tsx app/actions/submit-lead.ts
```

- [ ] **Step 2: Проверить, что нет других импортов этих файлов**

Run:
```bash
grep -rn "from.*contact-form\|from.*submit-lead" app components lib --include="*.ts" --include="*.tsx"
```
Expected: только `components/contact-section.tsx:3` (`import { ContactForm } from "./contact-form"`) — он уйдёт в Task 5.

Если других импортов нет — продолжать. Если есть — добавить их в этот таск (показать grep-вывод и удалить ссылки).

- [ ] **Step 3: Закоммитить (этот шаг сделаем после Task 5, когда уберём последний импорт)**

Не коммитим сейчас — продолжаем сразу к Task 5.

---

### Task 5: Перестроить `components/contact-section.tsx` в одну колонку

**Files:**
- Modify: `components/contact-section.tsx`

- [ ] **Step 1: Применить правки**

Полное содержимое `components/contact-section.tsx` после правки:

```tsx
import type { CSSProperties } from "react"
import { MapPin, Phone, Mail } from "lucide-react"
import type { ContactInfo } from "@/lib/supabase"
import { typoStyle, type TypoMap } from "@/lib/typography"

function telHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "")
  return `tel:${digits}`
}

interface ContactSectionProps {
  contact: ContactInfo
  heading?: string
  subheading?: string
  typography?: TypoMap
  themeStyle?: CSSProperties
}

export function ContactSection({
  contact,
  heading = "Свяжитесь с нами",
  subheading = "Поможем подобрать идеальный букет или подарок по случаю.",
  typography,
  themeStyle,
}: ContactSectionProps) {
  const headingStyle = typoStyle(typography, 'contact', 'heading')
  const subheadingStyle = typoStyle(typography, 'contact', 'subheading')
  const labelStyle = typoStyle(typography, 'contact', 'label')
  const valueStyle = typoStyle(typography, 'contact', 'value')
  return (
    <section
      id="contact"
      className="py-20 sm:py-24 md:py-28"
      style={{
        background:
          "linear-gradient(140deg, var(--accent) 0%, var(--background) 100%)",
        ...themeStyle,
      }}
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <div>
          <h2
            id="contact-heading"
            className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4 text-center"
            style={headingStyle}
          >
            {heading}
          </h2>
          <p
            className="text-muted-foreground text-base sm:text-lg mb-8 sm:mb-10 text-center"
            style={subheadingStyle}
          >
            {subheading}
          </p>

          <div className="space-y-5 sm:space-y-6">
            {contact.address && (
              <address className="not-italic">
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    <MapPin className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium mb-1" style={labelStyle}>
                      Адрес
                    </h3>
                    <p
                      className="text-muted-foreground text-sm sm:text-base break-words"
                      style={valueStyle}
                    >
                      {contact.address}
                      {contact.working_hours && (
                        <>
                          <br />
                          {contact.working_hours}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </address>
            )}

            {contact.phone_primary && (
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                  <Phone className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium mb-1" style={labelStyle}>
                    Телефон
                  </h3>
                  <p
                    className="text-muted-foreground text-sm sm:text-base break-words"
                    style={valueStyle}
                  >
                    <a
                      href={telHref(contact.phone_primary)}
                      className="hover:text-primary transition-colors"
                    >
                      {contact.phone_primary}
                    </a>
                    {contact.phone_secondary && (
                      <>
                        <br />
                        <a
                          href={telHref(contact.phone_secondary)}
                          className="hover:text-primary transition-colors"
                        >
                          {contact.phone_secondary}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {(contact.email || contact.whatsapp || contact.telegram) && (
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium mb-1" style={labelStyle}>
                    Email & Мессенджеры
                  </h3>
                  <p
                    className="text-muted-foreground text-sm sm:text-base break-words"
                    style={valueStyle}
                  >
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:text-primary transition-colors break-all"
                      >
                        {contact.email}
                      </a>
                    )}
                    {(contact.whatsapp || contact.telegram) && (
                      <>
                        {contact.email && <br />}
                        {contact.whatsapp && (
                          <a
                            href={contact.whatsapp}
                            target="_blank"
                            rel="noopener"
                            className="hover:text-primary transition-colors"
                          >
                            WhatsApp
                          </a>
                        )}
                        {contact.whatsapp && contact.telegram && " / "}
                        {contact.telegram && (
                          <a
                            href={contact.telegram}
                            target="_blank"
                            rel="noopener"
                            className="hover:text-primary transition-colors"
                          >
                            Telegram
                          </a>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
```

Изменения относительно прежней версии:
- Удалён импорт `ContactForm`.
- Удалён prop `thanksActive` из `ContactSectionProps` и параметров.
- Внешний `div` больше не использует grid `lg:grid-cols-[1fr_1.1fr]` — теперь одна колонка с `max-w-3xl` для центрирования.
- Заголовок и subheading получили `text-center`.
- Удалена правая колонка целиком (`<div><ContactForm /></div>`).

- [ ] **Step 2: Закоммитить вместе с удалениями из Task 4**

```bash
git add components/contact-form.tsx app/actions/submit-lead.ts components/contact-section.tsx
git commit -m "feat: удалить публичную форму обратной связи (Сценарий B)"
```

---

### Task 6: Обновить `app/page.tsx` — убрать `thanksActive`

**Files:**
- Modify: `app/page.tsx:42-46`

- [ ] **Step 1: Применить правку**

В `app/page.tsx` найти блок:

```tsx
        <ContactSection
          contact={data.contact}
          typography={typography}
          thanksActive={data.thanksPage.is_active}
          themeStyle={buildSectionThemeStyle(data.landingSections.contact ?? null)}
        />
```

Заменить на:

```tsx
        <ContactSection
          contact={data.contact}
          typography={typography}
          themeStyle={buildSectionThemeStyle(data.landingSections.contact ?? null)}
        />
```

То есть удалить строку `thanksActive={data.thanksPage.is_active}`.

- [ ] **Step 2: Проверить, что typecheck ещё не падает (поле `thanksPage` пока в `SiteData`, оно уйдёт в Task 11)**

Run: `pnpm typecheck`
Expected: pass.

- [ ] **Step 3: Закоммитить**

```bash
git add app/page.tsx
git commit -m "refactor: убрать prop thanksActive из ContactSection на главной"
```

---

### Task 7: Удалить `app/admin/leads/` и `app/thanks/` и `app/admin/thanks/`

**Files:**
- Delete: `app/admin/leads/page.tsx` (вся папка)
- Delete: `app/thanks/page.tsx` (вся папка)
- Delete: `app/admin/thanks/page.tsx` (вся папка)

- [ ] **Step 1: Удалить файлы и папки**

Run:
```bash
git rm -r app/admin/leads app/thanks app/admin/thanks
```

- [ ] **Step 2: Проверить grep на дополнительные импорты**

Run:
```bash
grep -rn "from.*admin/leads\|from.*admin/thanks\|/thanks\|/admin/leads\|/admin/thanks" app components lib --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Expected (после следующих тасков останется ноль; сейчас ожидается):
- `components/admin/sidebar.tsx` — две строки (уйдут в Task 8)
- `lib/site-data.ts` — упоминания `thanks` (уйдут в Task 11)

Если есть другие — обработать.

- [ ] **Step 3: Закоммитить (после Task 8)**

Не коммитим — Task 8 сразу за этим.

---

### Task 8: Обновить `components/admin/sidebar.tsx` — убрать пункты «Заявки» и «Спасибо»

**Files:**
- Modify: `components/admin/sidebar.tsx:36`, `:44`

- [ ] **Step 1: Прочитать файл целиком, чтобы понять структуру массива пунктов**

Run: `head -60 components/admin/sidebar.tsx`

- [ ] **Step 2: Удалить две строки**

Найти и удалить из массива пунктов:
```tsx
  { name: 'Заявки', href: '/admin/leads', icon: Users },
```
и:
```tsx
  { name: 'Страница «Спасибо»', href: '/admin/thanks', icon: Heart },
```

- [ ] **Step 3: Подчистить неиспользуемые импорты иконок**

После удаления проверить, остались ли `Users` и `Heart` в других местах файла. Если нет — убрать из импорта `lucide-react` в шапке.

Run: `grep -nE "\\b(Users|Heart)\\b" components/admin/sidebar.tsx`

Если результат пуст после редактирования массива — удалить из импорта. Если `Users` или `Heart` ещё используется (например, для другого пункта меню) — оставить.

- [ ] **Step 4: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: pass.

- [ ] **Step 5: Закоммитить (вместе с Task 7)**

```bash
git add app/admin/leads app/thanks app/admin/thanks components/admin/sidebar.tsx
git commit -m "feat: удалить разделы /admin/leads, /thanks, /admin/thanks"
```

---

### Task 9: Удалить лидовские и thanks-схемы из `lib/validation/schemas.ts`

**Files:**
- Modify: `lib/validation/schemas.ts:17-29`, `:214-225`

- [ ] **Step 1: Удалить блок `leadSchema` и тип `LeadInput`**

Найти и удалить:
```ts
export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя').max(120),
  phone: z
    .string()
    .trim()
    .min(6, 'Введите телефон')
    .max(32)
    .regex(/^[\d+()\-\s]+$/, 'Телефон содержит недопустимые символы'),
  interest: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
})
export type LeadInput = z.infer<typeof leadSchema>
```

- [ ] **Step 2: Удалить блок `thanksPageSettingsSchema` и тип `ThanksPageSettingsInput`**

Найти и удалить:
```ts
export const thanksPageSettingsSchema = z.object({
  // ... всё содержимое схемы ...
})
export type ThanksPageSettingsInput = z.infer<typeof thanksPageSettingsSchema>
```

(Конкретное содержимое — строки `lib/validation/schemas.ts:214-225` плюс тело схемы между ними. Найти полные границы блока.)

- [ ] **Step 3: Проверить grep на другие упоминания**

Run:
```bash
grep -rn "leadSchema\|LeadInput\|thanksPageSettingsSchema\|ThanksPageSettingsInput" app components lib tests --include="*.ts" --include="*.tsx"
```
Expected: останутся только импорты в:
- `tests/validation.test.ts` (уйдёт в Task 12)
- `app/admin/thanks/page.tsx` — но эта папка уже удалена в Task 7, файла быть не должно. Если grep находит — что-то пошло не так.

Если grep чистый, кроме теста — продолжать.

- [ ] **Step 4: Запустить typecheck**

Run: `pnpm typecheck`
Expected: возможны ошибки в `tests/validation.test.ts` про отсутствующий `leadSchema`. Это OK — починим в Task 12 в этом же блоке коммитов.

- [ ] **Step 5: Не коммитить пока — продолжить к Task 10**

---

### Task 10: Удалить `getThanksPageSettings`, `THANKS_PAGE_DEFAULTS`, поле `thanksPage` из `lib/site-data.ts`

**Files:**
- Modify: `lib/site-data.ts`

- [ ] **Step 1: Удалить `THANKS_PAGE_DEFAULTS` (строки ~298-312)**

Найти блок:
```ts
const THANKS_PAGE_DEFAULTS: ThanksPageSettings = {
  id: 1,
  is_active: true,
  // ... все поля ...
  updated_at: new Date().toISOString(),
}
```
Удалить целиком.

- [ ] **Step 2: Удалить функцию `getThanksPageSettings` (строки ~337-347)**

Найти и удалить:
```ts
export async function getThanksPageSettings(): Promise<ThanksPageSettings> {
  const supabase = createAnonSupabase()
  return safe<ThanksPageSettings>(
    supabase
      .from('thanks_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: ThanksPageSettings | null; error: unknown }>,
    THANKS_PAGE_DEFAULTS
  )
}
```

- [ ] **Step 3: Удалить поле `thanksPage` из типа `SiteData`**

Найти:
```ts
export type SiteData = {
  // ...
  thanksPage: ThanksPageSettings
  landingSections: ...
}
```
Убрать строку `thanksPage: ThanksPageSettings`.

- [ ] **Step 4: Удалить `getThanksPageSettings()` из массива `Promise.all` в `getAllSiteData`**

Найти в `getAllSiteData`:
```ts
  const [
    settings,
    contact,
    // ...
    thanksPage,        // ← удалить эту строку
    landingSections,
  ] = await Promise.all([
    // ...
    getThanksPageSettings(),  // ← удалить эту строку
    getLandingSectionStyles(),
  ])
```
И из объекта возврата:
```ts
  return {
    // ...
    thanksPage,        // ← удалить эту строку
    landingSections,
  }
```

- [ ] **Step 5: Удалить импорт `ThanksPageSettings` из шапки**

Найти в импортах типов из `@/lib/supabase`:
```ts
  ThanksPageSettings,
```
Удалить.

- [ ] **Step 6: typecheck**

Run: `pnpm typecheck`
Expected: pass.

- [ ] **Step 7: Не коммитить пока — продолжить к Task 11**

---

### Task 11: Удалить экспорты `Lead` и `ThanksPageSettings` из `lib/supabase.ts`

**Files:**
- Modify: `lib/supabase.ts:33`, `:46`

- [ ] **Step 1: Удалить строки экспорта**

Удалить из `lib/supabase.ts`:
```ts
export type Lead = import('./database.types').Tables<'leads'>
```
и:
```ts
export type ThanksPageSettings = import('./database.types').Tables<'thanks_page_settings'>
```

- [ ] **Step 2: Проверить grep на упоминания этих типов**

Run:
```bash
grep -rn "\\bLead\\b\|ThanksPageSettings" app components lib --include="*.ts" --include="*.tsx"
```
Expected: пусто (все потребители удалены/обновлены в предыдущих тасках).

Если находит — это пропущенный потребитель, разобраться.

- [ ] **Step 3: typecheck**

Run: `pnpm typecheck`
Expected: pass.

- [ ] **Step 4: Не коммитить — Task 12 сразу следом**

---

### Task 12: Удалить тесты на `leadSchema` из `tests/validation.test.ts`

**Files:**
- Modify: `tests/validation.test.ts`

- [ ] **Step 1: Удалить блок `describe('leadSchema', ...)`**

Найти и удалить весь блок целиком, начиная с `describe('leadSchema', () => {` и заканчивая соответствующей закрывающей `})`.

- [ ] **Step 2: Удалить `leadSchema` из импорта в шапке файла**

В строке 3 файла найти:
```ts
import {
  leadSchema,
  // другие схемы...
} from '@/lib/validation/schemas'
```
Удалить `leadSchema,` из списка.

- [ ] **Step 3: Прогнать тесты**

Run: `pnpm test`
Expected: pass, без блока `leadSchema`. Должны остаться тесты на остальные схемы.

- [ ] **Step 4: Закоммитить (вместе с Tasks 9-12)**

```bash
git add lib/validation/schemas.ts lib/site-data.ts lib/supabase.ts tests/validation.test.ts
git commit -m "refactor: удалить схемы, типы и функции для leads/thanks_page"
```

---

### Task 13: Финальная проверка остатков

**Files:** read-only

- [ ] **Step 1: Grep по всем потенциальным остаткам**

Run:
```bash
grep -rnE "\\bleads\\b|submit-lead|TELEGRAM|RATE_LIMIT|thanks_page|/thanks\\b" app components lib tests proxy.ts next.config.mjs --include="*.ts" --include="*.tsx" --include="*.mjs" 2>/dev/null
```

Ожидаемые остатки (это OK):
- `lib/database.types.ts` — автогенерация, оставляем как есть. Уйдёт при регенерации в плане C.
- В CHANGELOG / README — историческая информация, не трогать.

Не-OK:
- Любые упоминания в `app/`, `components/`, `lib/` (кроме `database.types.ts`), `tests/`, `proxy.ts`, `next.config.mjs`.

Если что-то найдено — это пропущенное место. Разобраться.

- [ ] **Step 2: Прогнать lint, typecheck, tests, build**

Run:
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
Expected: всё pass.

- [ ] **Step 3: Если что-то fail — починить и закоммитить отдельным fixup-коммитом**

```bash
git add <fixed files>
git commit -m "fix: подчистить остатки leads/thanks после рефакторинга"
```

---

## Phase 3 — Рефакторинг дашборда

### Task 14: Переписать `app/admin/page.tsx` под Сценарий B

**Files:**
- Modify: `app/admin/page.tsx` (полная замена содержимого)

- [ ] **Step 1: Заменить файл целиком**

Полное новое содержимое `app/admin/page.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, Eye, Star, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface DashboardStats {
  totalProducts: number
  featuredProducts: number
  lastUpdatedAt: string | null
}

interface RecentProduct {
  id: number
  title: string
  slug: string
  updated_at: string
}

export default function AdminDashboard() {
  const { supabase } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    featuredProducts: 0,
    lastUpdatedAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])

  const loadDashboardData = useCallback(async () => {
    try {
      const [
        { count: productsCount },
        { count: featuredCount },
        { data: recent },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_featured', true),
        supabase
          .from('products')
          .select('id, title, slug, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5),
      ])

      const recentList = (recent ?? []) as RecentProduct[]
      setStats({
        totalProducts: productsCount ?? 0,
        featuredProducts: featuredCount ?? 0,
        lastUpdatedAt: recentList[0]?.updated_at ?? null,
      })
      setRecentProducts(recentList)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const statCards = [
    {
      name: 'Всего букетов',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/products',
    },
    {
      name: 'Избранных товаров',
      value: stats.featuredProducts,
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/products',
    },
    {
      name: 'Последнее обновление',
      value: stats.lastUpdatedAt
        ? new Date(stats.lastUpdatedAt).toLocaleDateString('ru-RU')
        : '—',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/admin/products',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Обзор</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Добро пожаловать в панель управления ФЛОРМАЖОР
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Последние обновлённые товары
          </h2>
          {recentProducts.length === 0 ? (
            <p className="text-gray-500 text-sm">Товаров пока нет</p>
          ) : (
            <div className="space-y-3">
              {recentProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products?id=${p.id}`}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-sm text-gray-600 truncate">/catalog/{p.slug}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                    {new Date(p.updated_at).toLocaleDateString('ru-RU')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Быстрые действия
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/products?action=new"
              className="block p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="font-medium text-primary-dark">
                Добавить новый букет
              </span>
              <p className="text-sm text-gray-600 mt-1">Создать карточку товара</p>
            </Link>
            <Link
              href="/admin/hero"
              className="block p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="font-medium text-primary-dark">
                Настроить Hero
              </span>
              <p className="text-sm text-gray-600 mt-1">
                Изменить баннер и призыв к действию
              </p>
            </Link>
            <Link
              href="/admin/contacts"
              className="block p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="font-medium text-primary-dark">
                Обновить контакты
              </span>
              <p className="text-sm text-gray-600 mt-1">Телефон, адрес, email</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Изменения относительно прежней версии:
- Удалены тип `Lead`, импорт `Tables`, `toast`, `Users`, `TrendingUp`.
- Импорты `lucide-react`: вместо `Users, TrendingUp` теперь `Star, Calendar`.
- `DashboardStats` без `totalLeads`/`newLeadsToday`, добавлено `lastUpdatedAt`.
- Новый тип `RecentProduct`.
- В `Promise.all` три запроса к `products` (count, featured count, recent 5), без обращений к `leads`.
- Удалён весь Realtime-канал `dashboard-leads`. `useEffect` теперь только вызывает `loadDashboardData()`.
- `statCards`: 3 карточки вместо 4 (всего букетов, избранных, последнее обновление).
- Grid stat-карточек: `sm:grid-cols-3` вместо `sm:grid-cols-2 lg:grid-cols-4`.
- Секция «Последние заявки» заменена на «Последние обновлённые товары» с тем же визуальным паттерном.
- Ссылки на `/admin/leads` убраны.

- [ ] **Step 2: typecheck + lint + test + build**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: всё pass.

- [ ] **Step 3: Закоммитить**

```bash
git add app/admin/page.tsx
git commit -m "feat(admin): переработать дашборд под Сценарий B"
```

---

## Phase 4 — Performance (AUDIT B1.2, B1.3)

### Task 15: Обернуть hot-path функции `lib/site-data.ts` в `unstable_cache` (B1.3)

**Files:**
- Modify: `lib/site-data.ts`

- [ ] **Step 1: Добавить импорт `unstable_cache`**

В шапку файла добавить:
```ts
import { unstable_cache } from 'next/cache'
```

- [ ] **Step 2: Обернуть `getSiteSettings`**

Заменить:
```ts
export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = createAnonSupabase()
  return safe<SiteSettings>(
    // ...
  )
}
```

на:
```ts
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const supabase = createAnonSupabase()
    return safe<SiteSettings>(
      // ... (вся существующая реализация)
    )
  },
  ['site-settings'],
  { revalidate: SITE_REVALIDATE_SECONDS, tags: [SITE_CACHE_TAG] }
)
```

- [ ] **Step 3: Обернуть остальные функции, используемые в `getAllSiteData`**

То же самое с разными первыми ключами:

| Функция | Ключ кэша |
|---|---|
| `getContactInfo` | `'contact-info'` |
| `getThemeSettings` | `'theme-settings'` |
| `getHeroSettings` | `'hero-settings'` |
| `getNavItems` | `'nav-items'` |
| `getFeaturedProducts` | `'featured-products'` |
| `getHomeCategories` | `'home-categories'` |
| `getFeatures` | `'features'` |
| `getSocialLinks` | `'social-links'` |
| `getFooterConfig` | `'footer-config'` |
| `getTypography` | `'typography'` |
| `getCatalogPageSettings` | `'catalog-page-settings'` |
| `getProductPageSettings` | `'product-page-settings'` |
| `getLandingSectionStyles` | `'landing-section-styles'` |

Для каждой — та же конструкция:
```ts
export const NAME = unstable_cache(
  async (...args): Promise<TYPE> => {
    // ... оригинальное тело функции ...
  },
  ['cache-key'],
  { revalidate: SITE_REVALIDATE_SECONDS, tags: [SITE_CACHE_TAG] }
)
```

> **Важно про функции с аргументами:** `getFeaturedProducts(limit = 12)` принимает `limit`. `unstable_cache` будет ключевать по аргументам. Это безопасно — разные `limit` дают разные кэш-ключи.

- [ ] **Step 4: Также обернуть функции каталога (используются в `app/catalog/[slug]/page.tsx`)**

| Функция | Ключ кэша |
|---|---|
| `getAllProducts` | `'all-products'` |
| `getAllCategories` | `'all-categories'` |
| `getProductBySlug` | `'product-by-slug'` |

- [ ] **Step 5: НЕ оборачивать**

Эти функции **не оборачиваем** (не на hot path или динамические):
- `safe<T>` — internal helper.

- [ ] **Step 6: typecheck**

Run: `pnpm typecheck`
Expected: pass.

> Если возникает ошибка типа «Type 'Promise<X>' is not assignable to type 'X'» — это значит, что вызывающая сторона ожидала функцию, а получает обёрнутый объект. Проверить, что мы оставили `export const NAME` (а не `export function`), и что вызовы используют `await NAME()`.

- [ ] **Step 7: Прогнать тесты и сборку**

Run: `pnpm test && pnpm build`
Expected: pass.

- [ ] **Step 8: Закоммитить**

```bash
git add lib/site-data.ts
git commit -m "perf: обернуть hot-path функции site-data в unstable_cache (AUDIT B1.3)"
```

---

### Task 16: Добавить `generateStaticParams` в `app/catalog/[slug]/page.tsx` (B1.2)

**Files:**
- Modify: `app/catalog/[slug]/page.tsx`

- [ ] **Step 1: Добавить функцию**

После `interface ProductPageProps { ... }` (рядом с другими экспортами на верхнем уровне модуля), добавить:

```tsx
export async function generateStaticParams() {
  const products = await getAllProducts()
  return products.map((product) => ({ slug: product.slug }))
}
```

`getAllProducts` уже импортируется в этом файле — проверить импорт в шапке.

- [ ] **Step 2: typecheck**

Run: `pnpm typecheck`
Expected: pass.

- [ ] **Step 3: Сборка — проверить, что страницы пререндерятся**

Run: `pnpm build`
Expected: в выводе сборки видим что-то вроде:
```
○ /catalog/[slug]   ← теперь будет пересоздано как ● (SSG) с количеством путей
```
Конкретно — в логе сборки должна быть строка про `/catalog/[slug]` со списком из N путей (N = число товаров в Supabase Cloud на момент сборки).

- [ ] **Step 4: Закоммитить**

```bash
git add app/catalog/[slug]/page.tsx
git commit -m "perf: добавить generateStaticParams для /catalog/[slug] (AUDIT B1.2)"
```

---

## Phase 5 — Final verification

### Task 17: Полный прогон проверок и dev-смок-тест

**Files:** read-only / dev server

- [ ] **Step 1: Чистый прогон всех проверок**

Run:
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
Expected: всё pass.

- [ ] **Step 2: Запустить dev-сервер**

Run: `pnpm dev` (в фоне или в отдельной сессии).

- [ ] **Step 3: Открыть в браузере и проверить главную (`http://localhost:3000`)**

Чек-лист на главной:
- [ ] Hero-секция рендерится.
- [ ] Карусель товаров рендерится.
- [ ] Секция категорий рендерится.
- [ ] Features-секция рендерится.
- [ ] **Контактная секция рендерится без формы**, в одну колонку, по центру: видны адрес, телефон, email/мессенджеры.
- [ ] Footer рендерится.
- [ ] В консоли браузера нет ошибок про отсутствующие компоненты или 404 на `/api/submit-lead`.

- [ ] **Step 4: Проверить, что страница `/thanks` возвращает 404**

Открыть `http://localhost:3000/thanks`.
Expected: Next.js дефолтная 404 (страница больше не существует).

- [ ] **Step 5: Проверить админку (`http://localhost:3000/admin`)**

Войти под админ-учёткой Supabase Cloud (та же что используется обычно).

Чек-лист в админке:
- [ ] **Дашборд:** видны 3 stat-карточки (Всего букетов / Избранных / Последнее обновление). Не «Заявки», не «Сегодня».
- [ ] **Дашборд:** виджет «Последние обновлённые товары» показывает до 5 товаров с датами.
- [ ] **Sidebar:** **нет** пунктов «Заявки» и «Страница «Спасибо»». Остальные пункты на месте.
- [ ] Открытие `/admin/leads` напрямую — 404.
- [ ] Открытие `/admin/thanks` напрямую — 404.

- [ ] **Step 6: Прогнать ESLint ещё раз с warnings-as-errors локально (опционально)**

Run: `pnpm lint --max-warnings=0`
Expected: нет warnings.

- [ ] **Step 7: Финальный grep — никаких упоминаний `leads`/`/thanks` в `.tsx`/`.ts` (кроме `database.types.ts` и docs)**

Run:
```bash
grep -rnE "\\bleads\\b|/thanks\\b|submit-lead|TELEGRAM|RATE_LIMIT|thanks_page" app components lib tests proxy.ts next.config.mjs --include="*.ts" --include="*.tsx" --include="*.mjs"
```
Expected: пусто.

- [ ] **Step 8: Если всё прошло — пуш и подготовка PR**

```bash
git push -u origin migrate-cheap-stack
```

PR в main создаём вручную через `gh pr create` отдельной операцией (не часть этого плана) — он требует description, обзора owner-ом, и привязки к плану C для согласования cutover-окна.

---

## Definition of Done (для всего плана B)

- [ ] Ветка `migrate-cheap-stack` запушена в origin.
- [ ] Все 17 задач отмечены completed.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — pass.
- [ ] Dev-сервер: главная без формы, `/thanks` отдаёт 404, админка без разделов «Заявки» и «Страница «Спасибо»», новый дашборд работает.
- [ ] Миграции `supabase/migrations/0027_remove_leads.sql` и `0028_remove_thanks_page.sql` существуют в репо (но не применены к Supabase Cloud).
- [ ] `lib/database.types.ts` НЕ изменён — типы `leads` и `thanks_page_settings` останутся в нём, но не используются в коде. Файл регенерируется в плане C.

---

## Что НЕ делается в этом плане (важно)

- **НЕ применяются миграции** к Supabase Cloud или к новой БД. Это часть плана C (cutover).
- **НЕ меняется `lib/database.types.ts`.** Регенерация типов — часть плана C после применения миграций к новой БД.
- **НЕ удаляются env-переменные** в Onreza. Их выпиливание — часть плана C.
- **НЕ трогаются 4 оставшихся P0-бага** из аудита (A1.1, A1.2, A3.1, A3.3). Они идут отдельным PR после cutover (см. Task #7 в session backlog).
- **НЕ настраивается imgproxy.** Он часть плана A (server setup).
- **НЕ пишутся юр-документы.** После cutover.
