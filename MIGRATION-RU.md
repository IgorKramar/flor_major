# План миграции «ФлорМажор» в РФ-инфраструктуру (152-ФЗ)

## 0. Контекст и цели

**Текущая инфраструктура:**
- **Хостинг приложения:** Onreza (PaaS, конфиг в `onreza.toml`, фреймворк Next.js 16)
- **БД / Auth / Storage / Realtime:** Supabase Cloud
- **Уведомления:** Telegram Bot API (внешняя зависимость, остаётся)
- **DNS:** `flormajor-omsk.ru` (см. `lib/site-config.ts`)
- **Внешний CDN/host для placeholder-изображений:** images.unsplash.com (в коде, см. AUDIT.md A5)

**Какие персональные данные собираются (важно для 152-ФЗ):**
- Лиды (`leads`): имя, телефон, текст сообщения, IP, user-agent, источник, timestamp
- Аккаунты админов (`admin_users` + Supabase Auth): email, хэш пароля, JWT-сессии
- Аудит-журнал (`audit_log`)
- Rate-limits по IP-хэшу (`rate_limits`)

**Цели миграции:**
1. Все ПД граждан РФ хранятся и первично обрабатываются на серверах в РФ (152-ФЗ ст. 18 ч. 5).
2. Уйти с Supabase Cloud (US-инфра по умолчанию) и Onreza, если они не имеют дата-центров в РФ для нашего тарифа.
3. Развернуть полный аналог стека: PostgreSQL + Auth + Storage (S3) + Realtime + PaaS-runner для Next.js.
4. Соблюсти процедурные требования РКН: реестр операторов, политика, согласие, журналы, бэкапы.
5. Минимизировать downtime и риск потери данных.

---

## 1. Выбор стека (РФ)

### 1.1. Инфраструктурные провайдеры (опции)

| Слой | Кандидат | Плюсы | Минусы |
|---|---|---|---|
| **PaaS (Next.js runner)** | **Amvera** | Push-to-deploy, Docker, аналог Heroku, есть РФ-ДЦ | Молодой, ограниченные регионы |
| | **Yandex Cloud Serverless Containers** + **API Gateway** | Зрелый, автоскейл до нуля, аккредитован ФСБ/ФСТЭК | Сложнее настройка, дороже на больших RPS |
| | **VK Cloud Apps** (бывший Mail.ru) | Vercel-like, есть | Меньше документации |
| | **Selectel** + **Cloud Server** + **Coolify/Dokku** | Дёшево, гибко | Сами поддерживаем PaaS-слой |
| **Postgres** | **Yandex Managed PostgreSQL** | HA, бэкапы, PITR, метрики | Цена за HA-кластер |
| | **VK Cloud DBaaS Postgres** | Аналогично | Менее зрелый |
| | **Selectel Managed PG** или Postgres на Cloud Server | Дёшево | Нужно самим следить за HA |
| **S3** | **Yandex Object Storage** | S3-совместимый, версионирование, ACL | Тарификация по запросам |
| | **VK Cloud Hotbox/Icebox** | S3-совместимый | — |
| | **Selectel Object Storage** | S3-совместимый, дешёвый | — |
| **Supabase services**<br>(Auth/Realtime/Storage/PostgREST) | **Self-host Supabase** в Docker Compose / Kubernetes на VM выбранного провайдера | Полный контроль, миграция кода почти 1-в-1 | Нужно поддерживать стек |

**Рекомендуемая базовая комбинация (минимизация миграционных правок кода):**

- **Selectel** (или Yandex Cloud) — VM-хост в РФ-ДЦ.
- **Self-hosted Supabase** (Docker Compose, официальный stack) на отдельной VM: Postgres + GoTrue + Realtime + PostgREST + Storage API + Studio.
- **S3 — Selectel Object Storage** или **Yandex Object Storage** — Storage API будет проксировать туда (или сразу настроить Storage с external S3 backend).
- **Next.js приложение** — Docker-контейнер на Amvera или Yandex Serverless Containers (deploy с Git push).
- **Бэкапы Postgres** — `pg_basebackup` + WAL-G в тот же S3, либо встроенные снимки managed-БД.

### 1.2. Альтернатива: managed без self-host Supabase

Если не хочется поддерживать Supabase-стек:
- **Postgres** → managed (Yandex/VK/Selectel).
- **Auth** → переписать на NextAuth.js (Auth.js v5) с Postgres-адаптером. Удалить зависимости от GoTrue.
- **Storage** → прямой S3-клиент (`@aws-sdk/client-s3`) вместо `supabase.storage`.
- **Realtime** → либо переписать на свой WebSocket-сервер (Pusher-like), либо отказаться (страница админки `leads` будет polling каждые N секунд).
- **PostgREST** → не нужен (мы и так используем supabase-js, можно перейти на прямой `pg` или `drizzle`).

**Минус варианта 1.2:** значительные правки кода (Auth, Storage, Realtime — это почти весь админский функционал). Для текущих сроков рекомендуется self-host Supabase.

---

## 2. Дорожная карта миграции

### Фаза 0. Юридика и регистрация (1–2 недели, можно параллельно с тех. фазами)
- [ ] **Назначить ответственного за обработку ПД** (приказ).
- [ ] **Уведомление в РКН** об обработке ПД (форма на pd.rkn.gov.ru, **ст. 22 152-ФЗ**). Срок рассмотрения — 30 дней, поэтому начать первым.
- [ ] **Подготовить документы:**
  - Политика обработки ПД (опубликовать на сайте, добавить в футер).
  - Согласие на обработку ПД (чекбокс в форме лида + текст согласия).
  - Положение об обработке и защите ПД (внутренний документ).
  - Перечень ПД и целей обработки.
  - Перечень лиц, имеющих доступ.
  - Модель угроз (по приказу ФСТЭК № 21) — упрощённо для УЗ-4.
- [ ] **Договоры с провайдерами** должны содержать пункты о трансграничной передаче и обработке ПД на территории РФ. Проверить, что выбранные хостеры подписывают такой договор (Yandex Cloud, Selectel, VK Cloud — да).
- [ ] **При прекращении использования Supabase Cloud / Onreza** — удалить все ПД, получить подтверждение (если предоставляют).

### Фаза 1. Подготовка инфраструктуры РФ (1–2 недели)
- [ ] Создать аккаунт в выбранном облаке (Selectel/Yandex/VK), оформить договор как ЮЛ/ИП (для юр. чистоты обязательно).
- [ ] **VM для Supabase-стека:** 4 vCPU / 8 GB RAM / 80 GB SSD (старт). ОС: Ubuntu 22.04 LTS.
- [ ] Установить Docker, Docker Compose. Применить базовый hardening: ufw, fail2ban, ssh only by key, отключить root-логин.
- [ ] **Развернуть self-hosted Supabase** по инструкции <https://supabase.com/docs/guides/self-hosting/docker>:
  - Сгенерировать собственные `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`.
  - Настроить SMTP (для писем на восстановление пароля админов): Yandex 360 для бизнеса / Mail.ru для бизнеса (российские SMTP).
  - Сменить порты, закрыть Studio за VPN/Cloudflare Access (или Tunnel-like от Yandex).
- [ ] **Object Storage:** создать бакет `flor-media` в Yandex/Selectel S3. Настроить Storage API в self-host Supabase на работу с external S3 (`STORAGE_BACKEND=s3`, `GLOBAL_S3_BUCKET=...`, endpoint).
- [ ] **DNS:** создать поддомены `db.flormajor-omsk.ru` (или внутренний), `cdn.flormajor-omsk.ru` (для S3). Сертификаты Let's Encrypt через Caddy/Traefik.
- [ ] **Бэкапы Postgres:** настроить WAL-G или `pg_dump` по cron в тот же S3-бакет (отдельный префикс), retention 30 дней.
- [ ] **Мониторинг:** Prometheus + Grafana на отдельной VM или внешний сервис с РФ-ДЦ (например, OkMeter).

### Фаза 2. PaaS для Next.js (3–5 дней)
- [ ] Выбрать **Amvera** (проще всего) или **Yandex Serverless Containers**:
  - **Amvera**: создать проект, подключить GitHub-репо, указать ветку `main`. Конфиг в `amvera.yml`. Push-to-deploy.
  - **Yandex SC**: написать `Dockerfile` (multi-stage build: install → build → run), регистрация образа в Container Registry, создание контейнера, привязка к API Gateway.
- [ ] Завести env-переменные в выбранном PaaS:
  - `NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru` (новый self-hosted)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<новый>`
  - `SUPABASE_SERVICE_ROLE_KEY=<новый>` (как secret)
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — перенести.
  - `RATE_LIMIT_SALT` — перенести (или сгенерировать новый).
  - `NEXT_PUBLIC_SITE_URL=https://flormajor-omsk.ru`.
- [ ] Проверить, что `next.config.mjs` подхватывает новый домен Supabase для `images.remotePatterns` (он строится из URL автоматически — ок).
- [ ] Настроить health check (`GET /api/health` — добавить роут).

### Фаза 3. Миграция данных (1 день, в окно)
- [ ] **Schema:** все 26 миграций уже в `supabase/migrations/`. Применить на новой Postgres через `supabase db push` или вручную через `psql` в правильном порядке.
- [ ] **Данные:** дамп с Supabase Cloud:
  ```bash
  pg_dump --data-only --no-owner --no-privileges \
    -h <supabase-cloud-host> -U postgres \
    --exclude-schema=auth --exclude-schema=storage \
    -Fc -f data.dump
  ```
  Auth и storage схемы переносить отдельно (см. ниже).
- [ ] **Auth users:**
  - Экспорт из `auth.users` в Supabase Cloud (только админы, обычных пользователей нет в проекте — у нас только админ-доступ).
  - Импорт в `auth.users` нового self-host через SQL (с переносом `encrypted_password`, `id`, `email`).
  - Альтернативно — пересоздать админов вручную (их единицы) и сбросить пароли через email.
- [ ] **Storage:** скопировать содержимое бакета `media` Supabase Cloud → новый S3:
  ```bash
  rclone copy supabase-cloud:media yandex-s3:flor-media --progress
  ```
  Проверить доступность через подписанные URL и публичные пути.
- [ ] **Проверки:** счётчики строк в `products`, `leads`, `categories` совпадают; ссылки на картинки открываются.
- [ ] **Realtime:** убедиться, что репликация на нужные таблицы (`leads`, `products`, `product_images`, `typography_settings`) включена (см. миграции `0014`, `0018`).

### Фаза 4. Cutover (1–2 часа, выбрать ночное окно)
- [ ] **Включить maintenance** в текущем сайте (`site_settings.maintenance_mode = true` через старую админку). Это уже есть в `proxy.ts`.
- [ ] Финальный дамп-импорт `leads` и `audit_log` (то, что могло прийти за время подготовки).
- [ ] Переключить DNS `flormajor-omsk.ru` на новый PaaS (TTL заранее снизить до 60s).
- [ ] Дождаться распространения, прогнать смок-тесты:
  - Главная открывается, контент с новой БД.
  - Каталог, карточка товара.
  - Форма лида: отправка → запись в новой БД + Telegram.
  - Админка: вход, правка товара, инвалидация кэша, загрузка картинки.
  - Realtime: открыть `/admin/leads` в одной вкладке, отправить лид с другой — должен прилететь без перезагрузки.
- [ ] **Выключить maintenance.**
- [ ] Старые Supabase Cloud / Onreza — оставить read-only ещё 7 дней, потом удалить ПД.

### Фаза 5. После миграции (1–2 недели)
- [ ] Опубликовать политику обработки ПД на сайте, добавить чекбокс согласия в `components/contact-form.tsx`. Тексты — у юриста.
- [ ] Включить логирование доступа (минимум — `audit_log` уже есть; добавить логи nginx/Caddy в S3 с retention).
- [ ] Прогнать DAST/sca: dependency check, проверить CSP-заголовки (см. AUDIT.md C1.2).
- [ ] Провести внутреннюю аттестацию по приказу ФСТЭК № 21 (УЗ-4 для нашего объёма ПД достаточно — это документальная процедура, не инструментальная).
- [ ] Запросить у Supabase / Onreza подтверждение удаления данных.

---

## 3. Изменения в коде (минимальные при self-host Supabase)

При self-host Supabase кода почти не меняется — только env-переменные. Что точно поправить:

### 3.1. Обязательно
- **`next.config.mjs`** — `remotePatterns` уже строится из `NEXT_PUBLIC_SUPABASE_URL`. Если S3 будет на отдельном домене (`cdn.flormajor-omsk.ru`), добавить его в whitelist.
- **`components/contact-form.tsx`** — добавить чекбокс «Согласие на обработку ПД» с ссылкой на политику. Без чекбокса — `submitLead` не должен принимать форму. Валидация в `lib/validation/schemas.ts` (`leadFormSchema`) — добавить `consent: z.literal(true)`.
- **`app/layout.tsx`** или **`components/footer.tsx`** — ссылка на `/privacy` (политика обработки ПД).
- **`app/privacy/page.tsx`** — создать публичную страницу с текстом политики.
- **`app/actions/submit-lead.ts`** — логировать в `leads` факт согласия (поле `consent_at` или `consent_text_version`). Добавить миграцию `0027_lead_consent.sql`.

### 3.2. Желательно (улучшит compliance + надёжность)
- **`proxy.ts`** + **`next.config.mjs`** — добавить заголовки безопасности (CSP, HSTS, X-Frame-Options), см. AUDIT C1.2. Без CSP self-hosted домен Supabase должен быть в `connect-src`.
- **`app/actions/submit-lead.ts`** — timeout/retry для Telegram, не логировать токен (см. AUDIT C1.3).
- **`lib/supabase/admin.ts`** — service role key должен быть только в env PaaS, не попадать в клиентский бандл (проверить, что нигде не используется в `"use client"` компонентах).
- **Хранение IP/UA в `leads`** — рассмотреть хэширование IP и сокращение хранения UA для минимизации ПД.

### 3.3. Если уходим **без** self-host Supabase (вариант с NextAuth и прямым S3)
Сильно больше работы:
- Заменить `@supabase/ssr` и `@supabase/supabase-js` на прямой `pg`/`drizzle` + `@aws-sdk/client-s3` + `next-auth`.
- Перенести RLS-политики в код приложения (или оставить в БД и подключаться от имени роли).
- Реализовать свой Realtime (логические уведомления — например, через `LISTEN/NOTIFY` Postgres + WebSocket-сервер, или просто polling в админке).
- Адаптировать `components/admin/image-upload.tsx`.
- Все 26 миграций оставить как есть, но удалить специфичные для Supabase схемы (`auth.*`, `storage.*` — они не нужны, заменим своим).

---

## 4. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|---|---|---|---|
| Self-hosted Supabase упадёт под нагрузкой | Средняя | Высокое | Мониторинг, автостарт через systemd, бэкапы каждый час, runbook восстановления |
| Потеря лидов в окно cutover | Низкая | Высокое | Maintenance mode + финальный дамп; держать старую БД read-only 7 дней |
| РКН отклонит уведомление | Низкая | Среднее | Подготовить документы заранее, при необходимости — юрист |
| Telegram-нотификации заблокированы из РФ | Средняя | Низкое | Уже работают через REST API; при блокировке — VK Teams / собственный бот через российский relay, либо email |
| S3 в РФ-провайдере дороже на исходящий | Низкая | Низкое | Кэшировать через CDN (Cloudflare заменить на VK CDN/Yandex CDN/Selectel CDN) |
| Подвязка к одному провайдеру | Средняя | Среднее | Образ Docker воспроизводимый, Terraform-описание (опционально) — переезд между Selectel/Yandex/VK при необходимости за 1-2 дня |

---

## 5. Приблизительные сроки и стоимость

**Сроки (один разработчик + юрист на ~10 ч):**
- Юр. фаза (РКН, документы): 2 недели (можно вести параллельно).
- Технический разворот + миграция данных: 1.5–2 недели.
- Стабилизация после cutover: 1 неделя.
- **Итого: 3–4 недели.**

**Стоимость инфраструктуры (порядок цифр, ₽/мес):**

| Компонент | Selectel | Yandex Cloud |
|---|---|---|
| VM для Supabase (4 vCPU / 8 GB / 80 GB) | ~3 500 | ~5 000 |
| VM/Serverless для Next.js | ~2 000 (мелкая) или Amvera ~500–1 500 | ~2 000–4 000 |
| S3 (10 GB + traffic) | ~200 | ~300 |
| Бэкапы (10 GB снапшоты) | ~100 | ~150 |
| DNS, сертификаты | 0 (LE) | 0 |
| **Итого** | **~6 000–7 000** | **~7 500–9 500** |

(Для сравнения: Supabase Pro ~$25 ≈ 2 500 ₽ + Onreza, итого было дешевле, но не соответствовало 152-ФЗ.)

---

## 6. Чек-лист готовности к публикации

- [ ] Уведомление в РКН отправлено и подтверждено.
- [ ] Политика обработки ПД опубликована на `/privacy`, ссылка из футера.
- [ ] Чекбокс согласия в форме лида, валидация на сервере.
- [ ] Все ПД (leads, admin auth) — в Postgres на VM в РФ-ДЦ.
- [ ] S3 в РФ-ДЦ.
- [ ] Бэкапы настроены и проверены восстановлением.
- [ ] Доступ к Studio Supabase / SSH — только по VPN или whitelist IP.
- [ ] Логи доступа хранятся минимум 6 месяцев.
- [ ] CSP, HSTS, X-Frame-Options проставлены.
- [ ] Старые Supabase Cloud / Onreza — данные удалены, есть подтверждение.

---

## 7. Дальнейшие шаги

После согласования стека (Selectel vs Yandex vs VK Cloud, Amvera vs SC, self-host vs NextAuth) — оформить отдельные тикеты по фазам 1–5, начать с Фазы 0 (юр.) и Фазы 1 (инфра-PoC) параллельно.
