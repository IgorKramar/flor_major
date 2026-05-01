# План миграции «ФлорМажор» в РФ-инфраструктуру (152-ФЗ)

> **Сценарий B:** полная админка-конструктор сохраняется, **публичная форма обратной связи убирается**. Контакт с клиентами — через указанный на сайте телефон/мессенджеры (без сбора ПД на нашей стороне).

## 0. Контекст и потоки ПД

**Текущая инфраструктура:**
- **Хостинг приложения:** Onreza (PaaS, конфиг в `onreza.toml`, фреймворк Next.js 16)
- **БД / Auth / Storage / Realtime:** Supabase Cloud
- **Уведомления:** Telegram Bot API (для лидов) — уходит вместе с формой
- **Домен:** `flormajor-omsk.ru`

**Что меняется по сравнению с текущим состоянием:**

| Источник ПД | Сейчас | После миграции |
|---|---|---|
| Форма обратной связи (имя, телефон, сообщение, IP, UA) | таблица `leads`, Realtime, Telegram | **удаляется полностью** |
| Rate-limits по хэшу IP | `rate_limits` | **удаляется** |
| Email/пароль администраторов | `auth.users` (Supabase Cloud, US) | **`auth.users` self-host в РФ** |
| Аудит действий админов | `audit_log` | остаётся (без записей по `leads`) |
| Логи веб-сервера (IP, UA) | стандартные логи Onreza | retention ≤ 7 дней, на серверах в РФ |
| Cookies сессии Supabase, `next-themes` | пишутся через `@supabase/ssr` | без изменений (функциональные cookies, не требуют согласия) |

**После миграции на сайте собирается ПД только в одной точке:** аутентификация админов (внутреннее использование). Для публичных посетителей сбор ПД отсутствует.

**Юридический эффект сценария B:**
- ❌ **Уведомление РКН** — не требуется (есть основания для исключения по ст. 22 ч. 2: ПД сотрудников в рамках трудовых отношений, без сбора через сайт у внешних субъектов).
- ❌ **Согласие на обработку ПД** на сайте — нечему согласовывать.
- ❌ **Договор оператор/обработчик с хостером** в части посетительских ПД — не нужен.
- ❌ **Аттестация ФСТЭК / модель угроз УЗ-4** — не нужна.
- ✅ **Политика обработки ПД** на сайте (по ст. 18.1 ч. 2) — обязательна, потому что есть cookies и логи. Делается публикацией одной страницы.
- ✅ **Хранение ПД админов на серверах в РФ** (ст. 18 ч. 5) — обязательно. Поэтому self-host Supabase в РФ-ДЦ.
- ✅ **Retention логов веб-сервера** ≤ 7 дней с правовым основанием «техническая поддержка и безопасность» (ст. 6 ч. 1 п. 5).

---

## 1. Целевой стек

Подробное сравнение провайдеров — в приложении (раздел 7). Базовая рекомендация под сценарий B:

| Слой | Рекомендация |
|---|---|
| **PaaS для Next.js** | **Amvera** (push-to-deploy, проще всего) или **Yandex Serverless Containers** |
| **Postgres + GoTrue + Realtime + Storage API + PostgREST** | **Self-hosted Supabase** в Docker Compose на VM (Selectel или Yandex Cloud) |
| **S3** | **Selectel Object Storage** или **Yandex Object Storage** (Storage API проксирует туда) |
| **SMTP (восстановление паролей админов)** | **Yandex 360 для бизнеса** или **Mail.ru для бизнеса** |
| **Бэкапы Postgres** | WAL-G в тот же S3, retention 30 дней |
| **Мониторинг** | Prometheus + Grafana или OkMeter |

Self-host Supabase выбран потому, что админка-конструктор (~7000 строк) использует PostgREST, GoTrue, Realtime и Storage по их штатным контрактам. При self-host **код приложения почти не меняется** — только `NEXT_PUBLIC_SUPABASE_URL` + ключи в env.

---

## 2. Дорожная карта миграции

### Фаза 0. Юридика (3–5 дней — параллельно с тех. фазами)
- [ ] **Политика обработки ПД** — публикуется на `/privacy`, типовой шаблон, упоминает: cookies (функциональные), логи веб-сервера (retention 7 дней), email админов (трудовые отношения).
- [ ] **Положение об обработке и защите ПД** — внутренний документ, описывает доступ к админке.
- [ ] **Приказ о назначении ответственного за ПД** (если у вас ИП/ЮЛ).
- [ ] **Договор с хостером РФ-ДЦ** как ЮЛ/ИП — стандартный, без специфики ПД.

### Фаза 1. Инфра РФ (5–7 дней)
- [ ] Создать аккаунт в выбранном облаке (Selectel/Yandex), оформить договор.
- [ ] **VM для Supabase-стека:** 4 vCPU / 8 GB RAM / 80 GB SSD. Ubuntu 22.04 LTS. Базовый hardening (ufw, fail2ban, ssh by key, no root login).
- [ ] **Развернуть self-hosted Supabase** по <https://supabase.com/docs/guides/self-hosting/docker>:
  - Сгенерировать собственные `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`.
  - Настроить SMTP (российский) для восстановления паролей админов.
  - Studio закрыть за VPN/whitelist IP.
- [ ] **Object Storage:** бакет `flor-media`, Storage API настроить с external S3 (`STORAGE_BACKEND=s3`, `GLOBAL_S3_BUCKET=...`, endpoint).
- [ ] **DNS:** `db.flormajor-omsk.ru` (или внутренний поддомен), `cdn.flormajor-omsk.ru` (для S3). Сертификаты Let's Encrypt через Caddy/Traefik.
- [ ] **Бэкапы Postgres** — WAL-G в S3, retention 30 дней. Проверить восстановление.
- [ ] Включить `Realtime` репликацию на нужные таблицы (см. миграции `0014` без `leads`, `0018` с `product_images`/`typography_settings`).

### Фаза 2. PaaS для Next.js (2–3 дня)
- [ ] Подключить репозиторий к **Amvera** (или собрать `Dockerfile` для Yandex SC).
- [ ] Завести env:
  - `NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<новый>`
  - `SUPABASE_SERVICE_ROLE_KEY=<новый, как secret>`
  - `NEXT_PUBLIC_SITE_URL=https://flormajor-omsk.ru`
  - `RATE_LIMIT_SALT`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — **не нужны** (форма удалена).
- [ ] Health check (`GET /api/health` — добавить роут).

### Фаза 3. Изменения в коде (2–4 дня)

См. подробно в разделе **3** ниже. Главное — удалить форму и связанные сущности, остальное — env-переменные.

### Фаза 4. Миграция данных (полдня, в окно)
- [ ] Применить миграции `supabase/migrations/0001..0026` на новой Postgres + новую миграцию `0027_remove_leads.sql` (см. ниже).
- [ ] Дамп данных с Supabase Cloud (без `auth.*`, `storage.*`):
  ```bash
  pg_dump --data-only --no-owner --no-privileges \
    -h <supabase-cloud-host> -U postgres \
    --exclude-schema=auth --exclude-schema=storage \
    --exclude-table=public.leads \
    --exclude-table=public.rate_limits \
    -Fc -f data.dump
  ```
- [ ] Импорт в self-host Postgres.
- [ ] **Auth users:** админы — несколько штук, **проще пересоздать** в self-host и сбросить пароли через email (так чище, чем переносить хэши + риск несовпадения схемы `auth.users` между версиями).
- [ ] **Storage:** `rclone copy supabase-cloud:media yandex-s3:flor-media --progress`. Проверить ссылки.

### Фаза 5. Cutover (1–2 часа, ночное окно)
- [ ] Включить `site_settings.maintenance_mode = true` в текущей админке (механизм в `proxy.ts` уже есть).
- [ ] Снизить TTL DNS заранее до 60 с.
- [ ] Финального дампа `leads` нет (форма уже удалена в Фазе 3 — см. ниже).
- [ ] Переключить DNS `flormajor-omsk.ru` на новый PaaS.
- [ ] Смок-тест:
  - Главная и каталог отдают контент с новой БД.
  - Карточка товара, картинки.
  - Админка: вход (с новым паролем), правка товара, инвалидация кэша, загрузка картинки.
  - Realtime в `/admin/products` (если используется).
  - На страницах **нет** формы обратной связи и `/api/submit-lead`.
- [ ] Выключить maintenance.
- [ ] Старые Supabase Cloud / Onreza — read-only 7 дней, потом удалить.

### Фаза 6. После миграции (3–5 дней)
- [ ] Опубликовать политику обработки ПД на `/privacy`, ссылка в футере.
- [ ] Настроить retention логов nginx/Caddy (≤ 7 дней).
- [ ] Включить заголовки безопасности (CSP, HSTS) — см. `AUDIT.md` C1.
- [ ] Проверить, что Studio Supabase / SSH доступны только по VPN/whitelist.
- [ ] Запросить у Supabase / Onreza подтверждение удаления данных.

---

## 3. Изменения в коде

### 3.1. Удаление формы лидов

**Удаляется:**
- `components/contact-form.tsx` — компонент формы
- `app/actions/submit-lead.ts` — Server Action
- `app/thanks/` (если страница только для редиректа после формы)
- Подключение формы в `components/contact-section.tsx` — заменяется на статический блок с телефоном/мессенджерами
- Раздел «Заявки» в админке: `app/admin/leads/`
- Виджет недавних заявок и Realtime-канал на `leads` в `app/admin/page.tsx`
- Telegram-зависимости: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` из env, ссылки на Telegram API в коде
- Поля валидации лидов: соответствующие схемы в `lib/validation/schemas.ts`
- Тесты на лиды (если есть)

**Новая миграция БД** `supabase/migrations/0027_remove_leads.sql`:
```sql
-- Удалить публикации Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.leads;

-- Удалить таблицы
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Удалить связанные RLS-политики автоматически с DROP TABLE
```

### 3.2. Контактная секция → статика
В `components/contact-section.tsx` (или соответствующем компоненте) убрать `<ContactForm />`, оставить только информационный блок: телефон (`tel:`-ссылка), WhatsApp, Telegram, адрес, режим работы. Данные уже есть в `contact_info`.

### 3.3. Compliance-косметика
- **`/privacy/page.tsx`** — статическая страница с текстом политики обработки ПД (минимальная: cookies, логи, email админов).
- **`components/footer.tsx`** — ссылка на `/privacy`.
- **`next.config.mjs`** — заголовки безопасности:
  ```js
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://db.flormajor-omsk.ru;" },
      ],
    }]
  },
  ```
  CSP подкрутить под Я.Метрику, если будет добавлена.

### 3.4. Прочее (заодно с миграцией)
- Хорошее время закрыть P0/P1 пункты из `AUDIT.md`: hydration в `use-mobile`, `body.overflow` cleanup в header, `unstable_cache` в `lib/site-data.ts`, `generateStaticParams` для `/catalog/[slug]`. Эти правки не блокируют миграцию, но логично сделать одним заходом.

---

## 4. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|---|---|---|---|
| Self-hosted Supabase упадёт | Средняя | Высокое | Мониторинг, systemd autostart, бэкапы каждый час, runbook восстановления |
| Конфликт версий `auth.users` при переносе | Низкая | Среднее | Не переносим — пересоздаём админов с reset пароля |
| Сломанные ссылки на старые Storage URL | Низкая | Среднее | DNS-CNAME `cdn.flormajor-omsk.ru` → новый S3 + проверка путей |
| Привязка к одному провайдеру | Средняя | Среднее | Стек воспроизводимый через Docker Compose, переезд между Selectel/Yandex/VK за 1–2 дня |
| Клиенты не найдут способ связаться без формы | Средняя | Высокое (бизнес) | Чёткое отображение телефона/мессенджеров на главной и в шапке, `tel:`/`https://wa.me/`/`https://t.me/`-ссылки |

---

## 5. Сроки и стоимость

**Сроки:** 1.5–2 недели одним разработчиком (вместо 3–4 в варианте A с формой).

**Стоимость инфраструктуры (₽/мес):**

| Компонент | Selectel | Yandex Cloud |
|---|---|---|
| VM для Supabase (4 vCPU / 8 GB / 80 GB) | ~3 500 | ~5 000 |
| PaaS для Next.js | Amvera ~500–1 500 | ~2 000–4 000 |
| S3 (10 GB + traffic) | ~200 | ~300 |
| Бэкапы | ~100 | ~150 |
| **Итого** | **~4 500–5 500** | **~7 500–9 500** |

---

## 6. Чек-лист готовности к публикации

- [ ] Форма лидов и связанные таблицы удалены из кода и БД.
- [ ] Контактная секция содержит рабочие `tel:`/мессенджеры.
- [ ] Политика обработки ПД на `/privacy`, ссылка из футера.
- [ ] Email админов — в self-host Postgres в РФ-ДЦ.
- [ ] Storage в РФ-ДЦ, ссылки работают.
- [ ] Бэкапы настроены и проверены.
- [ ] CSP/HSTS/X-Frame-Options проставлены.
- [ ] Retention логов веб-сервера ≤ 7 дней.
- [ ] Доступ к Studio/SSH — только VPN/whitelist.
- [ ] Старые Supabase Cloud / Onreza — данные удалены, есть подтверждение.

---

## 7. Приложение: сравнение провайдеров

| Слой | Кандидат | Плюсы | Минусы |
|---|---|---|---|
| **PaaS** | **Amvera** | Push-to-deploy, Docker, аналог Heroku, есть РФ-ДЦ | Молодой, ограниченные регионы |
| | **Yandex Serverless Containers** | Зрелый, автоскейл до нуля, аккредитован ФСБ/ФСТЭК | Сложнее настройка |
| | **VK Cloud Apps** | Vercel-like | Меньше документации |
| | **Selectel + Coolify/Dokku** | Дёшево, гибко | Сами поддерживаем PaaS-слой |
| **Postgres** | **Yandex Managed PostgreSQL** | HA, бэкапы, PITR | Цена за HA |
| | **Self-host на VM** | Полный контроль, дёшево | Сами следим |
| **S3** | **Yandex Object Storage** | S3-совместимый, версионирование | Тарификация по запросам |
| | **Selectel Object Storage** | Дешевле | — |
| | **VK Cloud Hotbox** | S3-совместимый | — |

---

## 8. Дальнейшие шаги

1. Согласовать выбор провайдеров (Selectel vs Yandex Cloud, Amvera vs SC).
2. Запустить Фазу 0 (политика, шаблоны) и Фазу 1 (PoC self-host Supabase) параллельно.
3. После проверки PoC — Фаза 3 (правки кода: удаление формы) + Фаза 4 (данные) + Фаза 5 (cutover) одним спринтом.
