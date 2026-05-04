# Changelog

Все заметные изменения проекта документируются в этом файле. Формат ориентирован на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

## [Unreleased]

Планируемые изменения фиксируйте здесь до релиза.

---

## [2026-05-03]

> Переезд Next.js приложения с Onreza на ту же Timeweb VM, где живёт self-hosted Supabase (План D). Триггер — на Onreza исчерпан бесплатный лимит 20 минут сборки в месяц, платный тариф не вписывается в бюджет 1 182 ₽/мес. Cutover apex DNS завершён 2026-05-03 ~13:51 MSK+6, production-трафик идёт на собственный VM.

### Добавлено

- **Standalone build** — в `next.config.mjs` добавлен `output: 'standalone'`. При `next build` создаётся `.next/standalone/` с минимальным `server.js` + tree-shaken `node_modules` (~50–100 МБ артефакта вместо ~600 МБ полного `node_modules`). Снимает риск OOM-сборки на 4 ГБ VM, где параллельно живёт Supabase (~1.2 ГБ).
- **Health endpoint** `app/api/health/route.ts` — простой `GET /api/health` → `{ ok: true, ts: Date.now() }` для smoke-чеков, Caddy/PM2 health-проб. `dynamic = 'force-dynamic'` — без кэша.
- **PM2 ecosystem-config** `ecosystem.config.cjs` — `fork` mode, 1 instance, `max_memory_restart: 512M`, `HOSTNAME: '127.0.0.1'` (наружу только через Caddy), логи в `/opt/flormajor/shared/logs/`.
- **Remote deploy-скрипт** `scripts/deploy/remote-deploy.sh` — atomic swap через симлинк `current → releases/<TS>/`, `pm2 reload` ecosystem-конфига, 30-секундный health-чек по `127.0.0.1:3000/api/health`, cleanup релизов старше 5.
- **GitHub Action push-to-main** `.github/workflows/deploy.yml` — на push в `main` и `workflow_dispatch`. Build standalone в Ubuntu runner (Node 24, pnpm@10), pack `bundle.tar.gz` (standalone + public + .next/static), scp на VM, ssh `remote-deploy.sh`. `concurrency.cancel-in-progress: false` — два деплоя выстраиваются в очередь.

### Изменено

- **Node 24 LTS закреплён** — `mise.toml`: `node = "24"` (было `"latest"`, что резолвилось в Node 25 Current, не LTS). `package.json`: добавлен `"engines": { "node": ">=24" }`. На VM и в GitHub Action — Node 24.15.0 через NodeSource `setup_24.x` / `actions/setup-node@v4 with node-version: '24'`.
- **ESLint ignore для `.cjs`** — в `eslint.config.mjs` маска `*.config.{js,mjs,ts}` расширена до `*.config.{js,mjs,cjs,ts}`. Иначе `ecosystem.config.cjs` падал в lint с `'module' is not defined`.

### Исправлено

- **`pm2 reload <name>` на пустом процессе** — первый деплой через GH Action упал с `Process or Namespace flormajor not found`, потому что `pm2 reload <name>` требует уже существующий процесс. В `remote-deploy.sh` заменено на `pm2 reload /opt/flormajor/shared/ecosystem.config.cjs --update-env` — startOrReload-семантика (start если нет, reload если есть). Конфиг живёт в `/opt/flormajor/shared/`, не в bundle (он привязан к серверу — абсолютные пути).

### Серверная инфраструктура

- **Node 24.15.0 + npm 11.12.1** установлены на VM через NodeSource `setup_24.x`.
- **PM2 7.0.1** глобально (`/usr/bin/pm2`).
- **Пользователь `deploy`** (UID 1001), без sudo, только SSH-ключ `~/.ssh/id_flormajor_deploy` (ed25519). Владеет `/opt/flormajor/`. Используется только GitHub Action; основной non-root пользователь VM (`supa`) для админских задач не пересекается с deploy.
- **Структура `/opt/flormajor/`**:
  - `releases/<TS>/` — N последних релизов (TS = `<run_number>-<sha>`), оставляем 5.
  - `current → releases/<TS>/` — симлинк на активный релиз, atomic swap.
  - `shared/.env` — runtime-секреты (chmod 600 deploy:deploy): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Симлинком связан с каждым релизом (`releases/<TS>/.env → shared/.env`), Next.js standalone подхватывает на старте.
  - `shared/ecosystem.config.cjs` — PM2-конфиг (положен вручную, не в bundle).
  - `shared/logs/{error,out}.log` — PM2 stdout/stderr.
- **`pm2-deploy.service`** — systemd unit для PM2 startup пользователя `deploy`, `enabled` (запустится на boot), сохраняет dump процессов через `pm2 save`.
- **Caddy расширён** (`/etc/caddy/Caddyfile`) — три новых блока поверх существующего `db.flormajor-omsk.ru`:
  - `flormajor-omsk.ru, staging.flormajor-omsk.ru { reverse_proxy 127.0.0.1:3000 ... }` — apex и staging-subdomain в одном блоке (SAN-сертификат). Security headers (HSTS 2 года + preload, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, `-Server`). JSON access-log в `/var/log/caddy/app.log` (roll 10mb / 5 / 168h).
  - `www.flormajor-omsk.ru { redir https://flormajor-omsk.ru{uri} permanent }` — 301 на apex.
- **DNS-зона `flormajor-omsk.ru`** в reg.ru:
  - `staging A → 77.232.129.172` (создана 2026-05-02 для предварительного smoke).
  - **Cutover** 2026-05-03: apex `@ A` переключён с `185.251.89.220` (Onreza) на `77.232.129.172` (Timeweb VM). `www` CNAME изменён с `cname.onreza.app.` на `flormajor-omsk.ru.`. TTL 3600 (минимум reg.ru).
- **GitHub Secrets** для деплоя: `DEPLOY_HOST`, `DEPLOY_USER` (`deploy`), `DEPLOY_SSH_KEY` (приватный ed25519), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` **не** в GH Secrets — только в `/opt/flormajor/shared/.env` на VM.
- **Caddy ACME backoff после DNS swap (фикс 2026-05-03)** — после переключения apex DNS Caddy не выдал production-сертификат для `flormajor-omsk.ru` и `www.*`: до cutover ACME-challenges (`tls-alpn-01`, `http-01`) уходили на старый IP Onreza и проваливались с `185.251.89.220: Invalid response: 404`. После 24+ неудач certmagic 0.25.2 автоматически переключился на `acme-staging-v02.api.letsencrypt.org` (фолбэк при подозрении на rate-limit) и сел в 6-часовой backoff. На диске остались lock-файлы `/var/lib/caddy/.local/share/caddy/locks/issue_cert_{flormajor-omsk.ru,www.flormajor-omsk.ru}.lock`. Reload конфига не помог бы (in-memory backoff таймер сохраняется через reload). Решение: `rm` обоих lock'ов + `systemctl restart caddy` (полный рестарт обнуляет state). Через 9 секунд оба сертификата получены от production CA `acme-v02.api.letsencrypt.org` (E7), действуют до 2026-08-01.

### Документация

- **Spec плана D** (`docs/superpowers/specs/2026-05-02-app-vm-migration-design.md`) — single-VM архитектура, маршрутизация Caddy, build-стратегия, ecosystem.config, deploy pipeline, smoke-checklist, rollback procedure.
- **Implementation plan плана D** (`docs/superpowers/plans/2026-05-02-app-vm-migration.md`) — 28 tasks в 11 фазах: код-изменения, серверная подготовка, Caddy + DNS, GH Secrets, первый деплой, 24h наблюдение, cutover, мониторинг, decommission Onreza.

---

## [2026-05-02]

> Подготовка к миграции в РФ-инфраструктуру (152-ФЗ), Сценарий B: без публичной формы обратной связи. После этого PR — переезд на self-hosted Supabase (планы A и C).

### Удалено

- **Публичная форма обратной связи** на главной (`components/contact-form.tsx`, `app/actions/submit-lead.ts`, лидовские схемы валидации, тип `Lead`, тесты на `leadSchema`).
- **Раздел «Заявки» в админке** (`app/admin/leads/`) и связанный пункт sidebar.
- **Страница `/thanks`** (`app/thanks/page.tsx`) и её админ-раздел (`app/admin/thanks/`), `thanksPageSettingsSchema`, `getThanksPageSettings`, тип `ThanksPageSettings`, registry-запись типографики `scope='thanks_page'`.
- Зависимости от Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) и rate-limit'а (`RATE_LIMIT_SALT`).

### Изменено

- **Контактная секция** (`components/contact-section.tsx`): вместо узкой одноколоночной вёрстки рядом с формой — три центрированные карточки на десктопе (адрес / телефон / email-мессенджеры) с увеличенными иконками и текстом. На мобильном — одна колонка по центру.
- **Дашборд админки** (`app/admin/page.tsx`): вместо «Заявок» теперь виджет «Последние обновлённые товары» (5 шт. по `products.updated_at desc`); три stat-карточки на основе товаров (Всего букетов / Избранных / Последнее обновление); удалён Realtime-канал `dashboard-leads`.

### Производительность

- **`generateStaticParams` для `/catalog/[slug]`** — все товары пререндерятся при сборке, нет On-Demand ISR на первом хите (AUDIT B1.2).
- **`unstable_cache` на 16 hot-path функций `lib/site-data.ts`** — главная и каталог при кэш-хите не дёргают Supabase 5–10 раз за рендер; общий тег `site-data`, revalidate 300 с (AUDIT B1.3).

### Документация

- **План миграции в РФ-инфраструктуру** (152-ФЗ): четыре сценария разной зрелости в `docs/migration/`:
  - `cheap.md` — текущий принятый: Timeweb VM + self-host Supabase в Docker Compose, ~1 100 ₽/мес.
  - `overview.md` — общая логика Сценария B (без формы лидов).
  - `platform-future.md` — на будущее: K3s-PaaS под несколько проектов.
  - `homelab-future.md` — на будущее: гибрид с дачным K3s.
  - `README.md` — индекс документов.
- **Аудит кодовой базы** (`docs/audit/2026-05-audit.md`): обзорный аудит багов, перфоманса и безопасности. Используется как источник P0/P1 пунктов для следующих PR.
- **Spec миграции** (`docs/superpowers/specs/2026-05-02-cheap-migration-design.md`): принятый дизайн миграции с уточнениями к `cheap.md` (shrink Supabase под 4 ГБ, Studio on-demand через SSH-туннель, бэкапы 6 ч/14 д в Timeweb S3 + локальный pull, scope ветки `migrate-cheap-stack`, работа без SMTP).
- **Implementation plan** (`docs/superpowers/plans/2026-05-02-code-remove-leads-form.md`): пошаговый план для ветки `migrate-cheap-stack`.
- В корневой `README.md` добавлен раздел «Документация» со ссылками.

### Серверная инфраструктура

- **Self-hosted Supabase поднят** на Timeweb VM MSK-50 (Ubuntu 24.04 LTS, 2 vCPU / 4 ГБ / 50 ГБ NVMe, IP `77.232.129.172`). 7 сервисов в Docker Compose: `db`, `kong`, `auth`, `rest`, `storage`, `meta`, `imgproxy`. Используется ~1.2 ГБ из 3.8 ГБ RAM.
- **Hardening:** non-root пользователь `supa` с sudo NOPASSWD, отключены root-login и парольная аутентификация SSH (только ключи), ufw (22/80/443), fail2ban, unattended-upgrades с автоперезагрузкой 04:30 МСК, swap-файл 2 ГБ.
- **Shrink-конфиг под 4 ГБ** в `/opt/supabase/docker/docker-compose.override.yml`: memory limits на каждый сервис, Postgres tuning (shared_buffers=512MB, work_mem=8MB, max_connections=50), Studio в `profile: manual` (поднимается on-demand), `realtime`/`functions`/`analytics`/`vector`/`supavisor` в `profile: disabled`.
- **Caddy 2.11.2** перед Kong на `db.flormajor-omsk.ru` с авто-TLS Let's Encrypt и security-хедерами (HSTS, X-Content-Type-Options, Referrer-Policy).
- **Бэкапы каждые 6 часов** (`/opt/backup/backup.sh` + cron) → Timeweb Cloud Storage `flor-backups`, retention 14 дней. Дамп Postgres + tarball стораджа.
- **Helper-скрипты** в `scripts/dev/`: `flor-studio-up`/`flor-studio-down` (Studio on-demand через SSH-туннель), `flor-db-tunnel` (Postgres-туннель через socat-relay), `flor-backup-pull` (offsite-копия бэкапов на ноут).
- **Implementation plan A** (`docs/superpowers/plans/2026-05-02-server-supabase-setup.md`) — пошаговый план настройки сервера, 8 фаз. При выполнении выяснилось: миграции `0001..0028` предполагают существующую таблицу `public.products` — её создание перенесено в план C через `pg_dump --schema-only` с Supabase Cloud.

### Прочая инфраструктура

- Добавлен `mise.toml` с `node = "latest"` (нужно для совместимости с vitest 4.x под Node ≥ 25).

### Миграции (SQL)

- `0027_remove_leads.sql` — снимает `public.leads` с realtime-публикации, DROP `leads` и `rate_limits` CASCADE.
- `0028_remove_thanks_page.sql` — DROP `thanks_page_settings` CASCADE, DELETE seed'ов типографики `scope='thanks_page'`.
- **Не применяются** к Supabase Cloud — лежат в репо для применения на новой self-hosted БД в плане C (cutover).

---

## [2026-04-18]

### Добавлено

- Публичные страницы **`/catalog`**, **`/catalog/[slug]`** и **`/thanks`**; настройки в админке (каталог, карточка товара, страница «Спасибо»).
- Таблицы и миграции для настроек страниц, благодарности, блоков футера, изображений категорий, **оформления секций главной** (`landing_section_styles`).
- Встроенная **типографика по разделам** админки (`TypographyPanel` / `TypographySection`), без отдельного пункта «Типографика».
- **Оформление секций главной** в соответствующих разделах админки: фон (тема / цвет / градиент / картинка), цвета через color picker (`SectionSurfaceEditor`, `ColorPickerField`).
- **Phosphor Icons** как второй набор иконок; расширенный выбор в админке с превью.
- Удаление заявок в разделе «Заявки»; соцсети перенесены в настройки футера (отдельный раздел «Соцсети» убран).

### Изменено

- «Стиль» в админке переименован в **«Брендинг»**; цвета брендинга — только через color picker (без ручного ввода HEX).
- Футер на сайте: порядок и видимость блоков (бренд / контакты / соцсети) из БД.
- Карточки категорий на главной: опциональное фото, выравнивание текста, оверлей.
- Галерея товара: кнопки, свайп, клавиатура; карусель на главной — только избранные товары; цена текстом (`price_display`).
- Редирект на `/thanks` после успешной отправки формы (если страница активна в настройках).

### Исправлено

- Сборка при SSR с иконками Phosphor (импорт SSR-совместимый).
- Валидация категорий: опциональный `image_url` в схеме.

### Инфраструктура

- Игнорирование **`*.tsbuildinfo`** в Git; файл `tsconfig.tsbuildinfo` снят с учёта в репозитории.

### Миграции (SQL)

- `0020`–`0026`: категории (картинка), настройки страниц каталога/товара, thanks, блоки футера, seed типографики thanks, стили секций главной, доработка колонок фона.

---

## [2026-04-17]

### Добавлено

- Мобильная навигация админки: лист **«Ещё»** со всеми пунктами меню.
- Каталог на сайте, несколько фото у товара, динамическая типографика из БД, доработки виртуальной клавиатуры на мобилке.

### Изменено

- Админка и публичный сайт: правки вёрстки под мобильные устройства.

---

## [2026-04-16]

### Добавлено

- Расширенная админ-панель на Next.js + Supabase, кастомизация контента.

### Изменено

- Контактные номера и ссылка на WhatsApp.

---

## Ранние коммиты

- **2026-04-16** — первый README, мелкие правки контактов.
- **2026-04-16** — merge PR «админка Флор Мажор».
- **2026-04-17** — merge PR ветки v0, обновления pnpm и админки.

Подробности по строкам истории: `git log --oneline`.
