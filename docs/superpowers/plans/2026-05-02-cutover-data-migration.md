# План C: cutover — перенос данных и переключение ФлорМажора на self-hosted Supabase

> **⚠️ СТАТУС НА 2026-05-02: Phases 0–5 ВЫПОЛНЕНЫ. Phase 6 и 7 заменены планом D.**
>
> При выполнении выяснилось:
> - Бесплатный тариф Onreza исчерпан (20 мин build/мес), владелица не может публиковать обновления.
> - Бюджет 1182 ₽/мес не позволяет переход на платный Onreza.
> - Решение: Next.js приложение тоже переезжает на Timeweb VM (single-VM архитектура).
> - Phases 6 (cutover env в Onreza) и 7 (post-cutover) этого плана **заменены планом D** (`2026-05-XX-app-migration-to-vm.md`).
> - Реальный cutover публичного сайта будет через DNS swap apex `flormajor-omsk.ru` (с Onreza IP на Timeweb 77.232.129.172) после деплоя приложения на VM.
>
> Также при выполнении было добавлено:
> - `supabase/migrations/0000_init_legacy_tables.sql` — минимальный DDL для `products`/`hero_settings`/`leads`/`site_config`, без него миграции 0004-0006 падают.
> - `supabase/migrations/0029_grant_data_api.sql` — гранты для `anon`/`authenticated` (Cloud делает это через UI, self-host надо явно).
> - Перенос Storage media — через REST API upload, а не rclone copy (Storage хранит как `path/<version-uuid>`, не как файл напрямую). См. memory `feedback_supabase_storage_file_layout.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести схему `public`, данные (без `leads`/`rate_limits`/`thanks_page_settings`) и storage-медиа с Supabase Cloud на self-hosted Supabase (`db.flormajor-omsk.ru`), создать нового admin-пользователя, переключить env в Onreza, выполнить cutover публичного сайта с минимальным даунтаймом.

**Architecture:** Pre-flight большую часть работы делаем без даунтайма: дамп-restore схемы и данных, копирование медиа, smoke-тест в локальном dev. Cutover-окно (~10–20 мин) — финальный delta-sync + замена env в Onreza + проверка. Откат полностью обратим в течение 7 дней (старый Cloud и старые env сохраняются read-only).

**Tech Stack:** `pg_dump`/`pg_restore`/`psql` (через `apt install postgresql-client` на сервере), `rclone` (уже установлен на сервере для бэкапов), Supabase Storage REST API (для копирования media), Onreza CLI / web-кабинет (для замены env), SQL через `docker compose exec db psql`.

**Базовый spec:** [`../specs/2026-05-02-cheap-migration-design.md`](../specs/2026-05-02-cheap-migration-design.md), разделы 3.5 + 3.9.

**Pre-requisites (выполнено в планах A и B):**
- ✅ Self-hosted Supabase запущен, 7 healthy сервисов, БД пустая (`public` schema без таблиц).
- ✅ Caddy + TLS на `db.flormajor-omsk.ru`.
- ✅ Бэкапы каждые 6 часов в Timeweb S3.
- ✅ Helper-скрипты `flor-studio-up`/`flor-db-tunnel`/`flor-backup-pull` в `scripts/dev/`.
- ✅ Ветка `migrate-cheap-stack` смержена: код приложения готов работать без формы лидов и без `/thanks`.

---

## Контекст для исполнителя

**Состояние Cloud (на момент написания плана):**
- URL: `https://gaojqaqpreuvcwxmngqp.supabase.co` (см. `.env.local`)
- Postgres host: `db.gaojqaqpreuvcwxmngqp.supabase.co`
- Объём: 2 products, 3 product_images, 7 categories, 6 leads (не переносим), 1 admin_user, ~14 контентных таблиц.
- Storage bucket `media` с подкаталогами: `categories`, `hero`, `products`, `thanks` (последний не нужен, форма удалена).

**Цели cutover:**
1. Не потерять контент (товары, категории, тексты, медиа, настройки).
2. **Не переносить:** `leads`, `rate_limits`, `thanks_page_settings`, `auth.users` (там 1 владелец, пересоздадим).
3. Минимизировать даунтайм публичного сайта.
4. Сохранить откат на 7 дней.

**Креды (вне git):**
- Cloud DB: `DATABASE_URL` в `.env.local` (формат `postgresql://postgres:PASSWORD@host:5432/postgres`).
- Cloud Service Role: `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`.
- Self-hosted DB password: `POSTGRES_PASSWORD` в `~/.flormajor/secrets.env`.
- Self-hosted ANON/SERVICE_ROLE: те же, в `~/.flormajor/secrets.env`.

**Принципы:**
- Все pre-flight шаги (Phases 1–4) **обратимы** — можно повторить, если что-то пошло не так. БД на сервере просто wipe'ается через `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`.
- Cutover (Phase 5) — единственная необратимая часть. После замены env в Onreza публичный сайт работает на новой БД.
- Откат в течение 7 дней: вернуть env в Onreza на Cloud → деплой. Старая БД и старые ключи живы.

---

## File Structure

**Создаётся в репо:**

| Файл | Назначение |
|---|---|
| `scripts/cutover/dump-cloud-schema.sh` | На сервере: `pg_dump --schema-only` со старой Cloud → файл |
| `scripts/cutover/dump-cloud-data.sh` | На сервере: `pg_dump --data-only` (без leads/rate_limits/thanks_page_settings) |
| `scripts/cutover/restore-into-self-hosted.sh` | Восстановление дампа в новую БД через `docker compose exec db psql` |
| `scripts/cutover/copy-storage.sh` | `rclone copy` media с Cloud в `/opt/supabase/docker/volumes/storage/media/` |
| `scripts/cutover/create-admin.sh` | Создать админа в новой БД через прямой SQL |
| `scripts/cutover/README.md` | Описание flow и переменных окружения |

**Обновляется в репо (после Phase 4):**
- `lib/database.types.ts` — регенерация через `supabase gen types typescript` против новой БД.

**Создаётся вне git (на сервере):**
- `/opt/cutover/` — staging-каталог для дампов и временных файлов.
- `~/.config/rclone/rclone.conf` — добавить remote `supabase-cloud` для копирования media (на сервере).

**Меняется в Onreza (web-кабинет):**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — на значения новой БД.

---

## Phase 0 — Локальная подготовка

### Task 0.1: Установить `postgresql-client` на сервере

**Files:** server packages

> Серверу нужны `pg_dump`/`psql`/`pg_restore` для подключения к Cloud (host извне). У нас стандартный Ubuntu 24.04, ставим `postgresql-client-16` из дефолт-репо (этого хватит для дампа Postgres 15/17).

- [ ] **Step 1: Установить пакет**

Run:
```bash
ssh flor-server 'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-client 2>&1 | tail -3 && pg_dump --version && psql --version'
```
Expected: `pg_dump (PostgreSQL) 16.X` или новее.

> **Если Cloud на Postgres 17, а на сервере pg_dump 16** — старая версия может не суметь сдампить новую. Если упадёт с `aborting because of server version mismatch` — поставим pg_dump 17 из официального репо PostgreSQL APT.

- [ ] **Step 2: Сохранить креды Cloud в файле на сервере (только для cutover, потом удалить)**

Локально:
```bash
source .env.local
ssh flor-server "mkdir -p /opt/cutover && chmod 700 /opt/cutover && cat > /opt/cutover/cloud.env" <<EOF
CLOUD_DATABASE_URL=${DATABASE_URL}
CLOUD_URL=${NEXT_PUBLIC_SUPABASE_URL}
CLOUD_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
CLOUD_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
EOF
ssh flor-server 'chmod 600 /opt/cutover/cloud.env && ls -la /opt/cutover/'
```

> **Чувствительность:** этот файл содержит пароль Postgres Cloud. Удалится в Task 6.4 после cutover.

- [ ] **Step 3: Тест подключения к Cloud с сервера**

Run:
```bash
ssh flor-server 'source /opt/cutover/cloud.env && psql "$CLOUD_DATABASE_URL" -c "select count(*) from public.products;" 2>&1 | tail -5'
```
Expected:
```
 count
-------
     2
(1 row)
```

Если timeout — Cloud-host не доступен с сервера (проверить firewall Cloud, IP allowlist Supabase).

---

### Task 0.2: Настроить rclone remote для Cloud Storage на сервере

**Files:** server `~/.config/rclone/rclone.conf`

> Нам нужен `supabase-cloud` remote, чтобы `rclone copy supabase-cloud:media → /opt/supabase/docker/volumes/storage/media/`.

- [ ] **Step 1: Получить S3-credentials Cloud Storage**

Supabase Cloud Storage S3-protocol endpoint:
- URL: `https://<project-ref>.storage.supabase.co/storage/v1/s3` (или см. в Cloud Studio → Settings → Storage → "S3 Connection")
- Region: `eu-central-1` (стандартный для Supabase)
- Access Key ID и Secret Access Key — нужно создать в Cloud Studio (Settings → Storage → "S3 Access Keys" → "New access key").

> **Это делает владелец вручную через Cloud Studio.** Передать креды в `/tmp/tw_cr/cloud_s3.md` локально.

Формат:
```
S3_ENDPOINT: https://gaojqaqpreuvcwxmngqp.storage.supabase.co/storage/v1/s3
S3_REGION: eu-central-1
S3_ACCESS_KEY: ...
S3_SECRET_KEY: ...
```

- [ ] **Step 2: Добавить remote в серверный rclone.conf**

```bash
S3_ENDPOINT=$(grep '^S3_ENDPOINT:' /tmp/tw_cr/cloud_s3.md | awk '{print $2}')
S3_REGION=$(grep '^S3_REGION:' /tmp/tw_cr/cloud_s3.md | awk '{print $2}')
S3_ACCESS_KEY=$(grep '^S3_ACCESS_KEY:' /tmp/tw_cr/cloud_s3.md | awk '{print $2}')
S3_SECRET_KEY=$(grep '^S3_SECRET_KEY:' /tmp/tw_cr/cloud_s3.md | awk '{print $2}')

ssh flor-server "cat >> ~/.config/rclone/rclone.conf" <<EOF

[supabase-cloud]
type = s3
provider = Other
access_key_id = ${S3_ACCESS_KEY}
secret_access_key = ${S3_SECRET_KEY}
endpoint = ${S3_ENDPOINT}
region = ${S3_REGION}
acl = private
EOF
```

- [ ] **Step 3: Проверить доступ**

Run:
```bash
ssh flor-server 'rclone lsd supabase-cloud: 2>&1 | head -5'
```
Expected: видим `media` бакет. Если ошибка SignatureMismatch — проверить креды.

---

## Phase 1 — Перенос схемы (без даунтайма)

### Task 1.1: Создать `scripts/cutover/dump-cloud-schema.sh`

**Files:**
- Create: `scripts/cutover/dump-cloud-schema.sh`

- [ ] **Step 1: Создать директорию и скрипт**

```bash
mkdir -p scripts/cutover
cat > scripts/cutover/dump-cloud-schema.sh <<'EOF'
#!/usr/bin/env bash
# Дамп схемы public со старой Supabase Cloud в /opt/cutover/cloud-schema.sql
# Запускать на сервере: bash /opt/cutover/dump-cloud-schema.sh
# (или через ssh flor-server bash -s < scripts/cutover/dump-cloud-schema.sh)

set -euo pipefail

source /opt/cutover/cloud.env

OUT=/opt/cutover/cloud-schema.sql

echo "[$(date)] Dumping public schema from Cloud..."
pg_dump "$CLOUD_DATABASE_URL" \
  --schema-only \
  --schema=public \
  --no-owner \
  --no-privileges \
  --no-acl \
  --exclude-table=public.leads \
  --exclude-table=public.rate_limits \
  --exclude-table=public.thanks_page_settings \
  > "$OUT"

echo "[$(date)] Done. Size:"
wc -l "$OUT"
ls -lh "$OUT"
EOF
chmod +x scripts/cutover/dump-cloud-schema.sh
```

- [ ] **Step 2: Залить скрипт на сервер и прогнать**

Run:
```bash
scp scripts/cutover/dump-cloud-schema.sh flor-server:/opt/cutover/
ssh flor-server 'bash /opt/cutover/dump-cloud-schema.sh'
```
Expected: `cloud-schema.sql` создан, ~50–200 КБ. Видим список `CREATE TABLE products`, `CREATE TABLE product_images` и т.д.

- [ ] **Step 3: Просмотр содержимого**

```bash
ssh flor-server 'grep -E "^CREATE TABLE" /opt/cutover/cloud-schema.sql'
```
Expected: список всех таблиц `public.*` КРОМЕ `leads`, `rate_limits`, `thanks_page_settings`.

---

### Task 1.2: Применить схему на новую БД

**Files:** server `/opt/cutover/cloud-schema.sql` → новая Postgres

- [ ] **Step 1: Стартовое состояние новой БД должно быть пустым**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c "\dt public.*"'
```
Expected: `Did not find any relation named "public.*"`. Если есть таблицы — wipe `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (см. план A, Task 6.X).

- [ ] **Step 2: Применить схему**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /opt/cutover/cloud-schema.sql 2>&1 | tail -20'
```
Expected: серия `CREATE TABLE`, `CREATE INDEX`, `CREATE TRIGGER`. Без `ERROR`.

> **Возможные warnings:** `extension "X" does not exist` — некоторые extensions Cloud (`pgsodium`, `vault`, `pg_graphql`) могут быть не активны в self-host. Если они нужны — `CREATE EXTENSION IF NOT EXISTS X;`. На наших данных они не используются, но для совместимости полезно проверить.

- [ ] **Step 3: Проверить таблицы**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c "\dt public.*"'
```
Expected: список всех таблиц включая `products`, `product_images`. Без `leads`, `rate_limits`, `thanks_page_settings`.

---

### Task 1.3: Применить наши миграции `0027` и `0028`

**Files:** server, через scp

> Хотя мы исключили `leads`/`rate_limits`/`thanks_page_settings` из дампа, миграции `0027`/`0028` идемпотентны (`IF EXISTS`). Применяем для согласованности.

- [ ] **Step 1: Залить миграции на сервер**

Run:
```bash
scp supabase/migrations/0027_remove_leads.sql supabase/migrations/0028_remove_thanks_page.sql flor-server:/tmp/
```

- [ ] **Step 2: Применить**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && for f in /tmp/0027_remove_leads.sql /tmp/0028_remove_thanks_page.sql; do
  echo "=== $(basename $f) ==="
  docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=0 < "$f" 2>&1 | tail -5
done'
```
Expected: для `0027` — NOTICE про `leads does not exist, skipping`. Для `0028` — то же про `thanks_page_settings`. Никаких ERROR.

- [ ] **Step 3: Cleanup**

```bash
ssh flor-server 'rm -f /tmp/0027_remove_leads.sql /tmp/0028_remove_thanks_page.sql'
```

---

## Phase 2 — Перенос данных

### Task 2.1: Создать `scripts/cutover/dump-cloud-data.sh`

**Files:**
- Create: `scripts/cutover/dump-cloud-data.sh`

- [ ] **Step 1: Создать скрипт**

```bash
cat > scripts/cutover/dump-cloud-data.sh <<'EOF'
#!/usr/bin/env bash
# Дамп данных public со старой Supabase Cloud (без leads/rate_limits/thanks_page_settings)
# Запускать на сервере: bash /opt/cutover/dump-cloud-data.sh

set -euo pipefail

source /opt/cutover/cloud.env

OUT=/opt/cutover/cloud-data.sql

echo "[$(date)] Dumping public data from Cloud (excluding leads/rate_limits/thanks_page_settings)..."
pg_dump "$CLOUD_DATABASE_URL" \
  --data-only \
  --schema=public \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  --exclude-table=public.leads \
  --exclude-table=public.rate_limits \
  --exclude-table=public.thanks_page_settings \
  --exclude-table=public.audit_log \
  > "$OUT"

echo "[$(date)] Done. Size:"
ls -lh "$OUT"
EOF
chmod +x scripts/cutover/dump-cloud-data.sh
```

> **`--disable-triggers`**: данные восстанавливаются с временно отключёнными триггерами (audit_log, set_updated_at). Иначе `set_updated_at` перезапишет даты обновления, и audit_log получит лишние записи.
> **`--exclude-table=audit_log`**: не переносим историю аудита со старой БД (она привязана к Cloud-пользователям, которых мы пересоздаём).

- [ ] **Step 2: Залить и прогнать**

```bash
scp scripts/cutover/dump-cloud-data.sh flor-server:/opt/cutover/
ssh flor-server 'bash /opt/cutover/dump-cloud-data.sh'
```
Expected: `cloud-data.sql` ~5–50 КБ.

- [ ] **Step 3: Просмотр**

```bash
ssh flor-server 'head -30 /opt/cutover/cloud-data.sql && echo "..." && grep -c "^COPY" /opt/cutover/cloud-data.sql'
```
Expected: видим `COPY public.products FROM stdin;`, `COPY public.categories FROM stdin;`. Считаем число `COPY` блоков (~14 таблиц).

---

### Task 2.2: Восстановить данные в новую БД

- [ ] **Step 1: Применить дамп**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /opt/cutover/cloud-data.sql 2>&1 | tail -20'
```
Expected: `COPY 2`, `COPY 3`, `COPY 7` и т.д. — числа должны совпадать с разведкой Cloud.

- [ ] **Step 2: Проверить количества**

Run:
```bash
ssh flor-server "cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c \"
SELECT 'products' as t, count(*) FROM public.products
UNION ALL SELECT 'product_images', count(*) FROM public.product_images
UNION ALL SELECT 'categories', count(*) FROM public.categories
UNION ALL SELECT 'admin_users', count(*) FROM public.admin_users
UNION ALL SELECT 'site_settings', count(*) FROM public.site_settings
UNION ALL SELECT 'theme_settings', count(*) FROM public.theme_settings;
\""
```
Expected:
```
       t        | count
----------------+-------
 products       |     2
 product_images |     3
 categories     |     7
 admin_users    |     1
 site_settings  |     1
 theme_settings |     1
```

Если расхождение — посмотреть `cloud-data.sql`, разобраться какие таблицы упали.

> **`admin_users` count = 1**, но `auth.users` пустая (мы её не переносили). Это означает: запись в `admin_users` ссылается на несуществующий UUID. Это исправляется в Task 4.1 (создание нового админа с заменой UUID).

---

## Phase 3 — Перенос Storage media

### Task 3.1: Создать `scripts/cutover/copy-storage.sh`

**Files:**
- Create: `scripts/cutover/copy-storage.sh`

- [ ] **Step 1: Создать скрипт**

```bash
cat > scripts/cutover/copy-storage.sh <<'EOF'
#!/usr/bin/env bash
# Скопировать содержимое bucket media с Cloud в локальный file storage новой Supabase
# Запускать на сервере: bash /opt/cutover/copy-storage.sh

set -euo pipefail

LOCAL_STORAGE=/opt/supabase/docker/volumes/storage

echo "[$(date)] Source: supabase-cloud:media"
echo "[$(date)] Target: ${LOCAL_STORAGE}"

# Создать целевую директорию (storage volume — должен существовать)
sudo mkdir -p "${LOCAL_STORAGE}"
sudo chown -R 1000:1000 "${LOCAL_STORAGE}" 2>/dev/null || true

# rclone требует уникальный путь — Storage API ищет файлы в storage/{bucket}/{object_path}
# Поэтому сюда копируем в подпапку `media/`
rclone copy supabase-cloud:media "${LOCAL_STORAGE}/media" --progress 2>&1 | tail -10

echo "[$(date)] Done. Size:"
du -sh "${LOCAL_STORAGE}/media"
echo "Files:"
find "${LOCAL_STORAGE}/media" -type f | wc -l
EOF
chmod +x scripts/cutover/copy-storage.sh
```

- [ ] **Step 2: Залить и прогнать**

```bash
scp scripts/cutover/copy-storage.sh flor-server:/opt/cutover/
ssh flor-server 'bash /opt/cutover/copy-storage.sh'
```
Expected: видим `Transferred: N / N, 100%`, потом `du -sh` — общий размер (вероятно несколько МБ), `find ... | wc -l` — число файлов.

- [ ] **Step 3: Проверить, что Storage API видит файлы**

Run:
```bash
source ~/.flormajor/secrets.env
curl -s -X POST "https://db.flormajor-omsk.ru/storage/v1/object/list/media" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"products","limit":5}' | python3 -m json.tool 2>&1 | head -20
```
Expected: JSON-массив с файлами, у каждого `metadata.size` (не null).

> **Если Storage API возвращает пустой массив, но файлы на диске есть** — Storage хранит метаданные в БД (`storage.objects` таблица), а сами файлы — на диске. Перенос файлов на диск без записей в `storage.objects` не даст доступа через API. См. Task 3.2.

---

### Task 3.2: Перенести метаданные `storage.objects` и `storage.buckets`

**Files:** server, дамп `storage` schema с Cloud

> Storage API использует `storage.objects` для метаданных каждого файла (path, mime, size, owner). Без этих записей файлы недоступны через API.

- [ ] **Step 1: Дамп `storage` schema с Cloud (только данные таблиц `objects` и `buckets`)**

Run:
```bash
ssh flor-server "source /opt/cutover/cloud.env && pg_dump \"\$CLOUD_DATABASE_URL\" \
  --data-only \
  --schema=storage \
  --table=storage.objects \
  --table=storage.buckets \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  > /opt/cutover/cloud-storage.sql"
ssh flor-server 'wc -l /opt/cutover/cloud-storage.sql && head -20 /opt/cutover/cloud-storage.sql'
```

- [ ] **Step 2: Очистить дефолтный bucket в новой БД (Storage API создаёт пустые при старте)**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c "TRUNCATE storage.objects CASCADE; DELETE FROM storage.buckets;"'
```

- [ ] **Step 3: Залить storage метаданные**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /opt/cutover/cloud-storage.sql 2>&1 | tail -10'
```
Expected: `COPY <N>` для objects и buckets.

- [ ] **Step 4: Проверить через REST**

Run:
```bash
source ~/.flormajor/secrets.env
curl -s -X POST "https://db.flormajor-omsk.ru/storage/v1/object/list/media" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"products","limit":5}' | python3 -m json.tool | head -30
```
Expected: массив с не-null `metadata.size`.

- [ ] **Step 5: Проверить, что картинка реально отдаётся**

Возьмём произвольный файл из storage:
```bash
ssh flor-server 'find /opt/supabase/docker/volumes/storage/media -type f | head -1'
```
Получим путь типа `/opt/supabase/docker/volumes/storage/media/products/abc.jpg`. Проверим публичный URL:
```bash
curl -sI "https://db.flormajor-omsk.ru/storage/v1/object/public/media/products/abc.jpg"
```
Expected: 200 OK + `Content-Type: image/jpeg`.

---

## Phase 4 — Создание админа и регенерация типов

### Task 4.1: Создать нового админа в новой БД

**Files:**
- Create: `scripts/cutover/create-admin.sh`
- Update: server `auth.users` + `public.admin_users`

- [ ] **Step 1: Сгенерировать креды нового админа**

```bash
NEW_ADMIN_EMAIL="owner@flormajor-omsk.ru"
NEW_ADMIN_PASS=$(openssl rand -base64 18 | tr -d "=+/" | cut -c1-18)

cat >> ~/.flormajor/secrets.env <<EOF
NEW_ADMIN_EMAIL=${NEW_ADMIN_EMAIL}
NEW_ADMIN_PASS=${NEW_ADMIN_PASS}
EOF
chmod 600 ~/.flormajor/secrets.env

echo "ADMIN: ${NEW_ADMIN_EMAIL}"
echo "PASS:  ${NEW_ADMIN_PASS}"
echo "(saved to ~/.flormajor/secrets.env)"
```

> **Передать владельцу через защищённый канал** (Telegram secret chat, Bitwarden share, голосом по телефону). НЕ через обычный мессенджер.

- [ ] **Step 2: Удалить старую запись `admin_users` (orphan от перенесённой Cloud-схемы)**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c "DELETE FROM public.admin_users;"'
```

- [ ] **Step 3: Создать нового пользователя в `auth.users`**

Run:
```bash
source ~/.flormajor/secrets.env

ssh flor-server "cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres" <<SQL
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  '${NEW_ADMIN_EMAIL}',
  crypt('${NEW_ADMIN_PASS}', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
);
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'owner' FROM auth.users WHERE email = '${NEW_ADMIN_EMAIL}';
SELECT u.email, au.role FROM auth.users u JOIN public.admin_users au ON u.id = au.user_id;
SQL
```
Expected: одна строка `owner@flormajor-omsk.ru | owner`.

- [ ] **Step 4: Проверить логин через GoTrue API**

Run:
```bash
source ~/.flormajor/secrets.env
curl -s "https://db.flormajor-omsk.ru/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${NEW_ADMIN_EMAIL}\",\"password\":\"${NEW_ADMIN_PASS}\"}" | python3 -m json.tool | head -10
```
Expected: JSON с `access_token`, `refresh_token`, `user.id`.

---

### Task 4.2: Регенерировать `lib/database.types.ts` с новой БД

**Files:**
- Modify: `lib/database.types.ts`

- [ ] **Step 1: Запустить SSH-туннель для Postgres**

В отдельном терминале:
```bash
./scripts/dev/flor-db-tunnel
```
Туннель открыт на `localhost:5432`. Не закрывать до конца Task 4.2.

- [ ] **Step 2: Проверить подключение через туннель**

> Локально psql нет, но `supabase gen types` использует HTTP-API postgres-meta, не прямой psql. Поэтому туннель не обязателен для генерации типов — но REST-метод `supabase gen types --db-url` использует postgres напрямую, что требует туннеля либо external connection.

Альтернатива — использовать Supabase Studio API (postgres-meta), который доступен через kong на `https://db.flormajor-omsk.ru/pg-meta/`. Не уверен что это endpoint Supabase предоставляет публично.

**Самый простой путь:** запустить `supabase gen types` на сервере через docker exec и вытянуть результат:

```bash
source ~/.flormajor/secrets.env
ssh flor-server "cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c '\\dt public.*' > /dev/null && echo 'db reachable from local docker exec'"

# Установить supabase CLI в контейнер не имеет смысла — просто запустим CLI на ноуте
# с DATABASE_URL через туннель или с встроенным PG_URL.

# Альтернатива: использовать встроенный postgres-meta REST (через kong)
mise exec -- npx supabase@latest gen types typescript \
  --db-url "postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres" \
  > lib/database.types.ts.new

ls -la lib/database.types.ts.new
```

> **`mise exec -- npx supabase@latest`** — `supabase` CLI имеет команду `gen types`. Требует Postgres connection string. Через туннель `localhost:5432` он подключится к новой БД.

- [ ] **Step 3: Сравнить с текущим**

```bash
diff lib/database.types.ts lib/database.types.ts.new | head -40
```
Expected: видим удаление `leads`, `rate_limits`, `thanks_page_settings` типов.

- [ ] **Step 4: Заменить файл**

```bash
mv lib/database.types.ts.new lib/database.types.ts
mise exec -- pnpm typecheck 2>&1 | tail -5
```
Expected: typecheck pass.

- [ ] **Step 5: Закрыть туннель** (Ctrl+C в окне `flor-db-tunnel`).

- [ ] **Step 6: Закоммитить (если есть изменения)**

```bash
git add lib/database.types.ts
git commit -m "chore: регенерировать database.types.ts против новой self-hosted БД"
```

---

## Phase 5 — Локальный smoke-тест с новой БД

### Task 5.1: Прогон `pnpm dev` на новых env

**Files:** локально `.env.local` (временная подмена)

- [ ] **Step 1: Сделать backup текущего `.env.local`**

```bash
cp .env.local .env.local.cloud-backup
```

- [ ] **Step 2: Создать `.env.local` с self-hosted значениями**

```bash
source ~/.flormajor/secrets.env
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
EOF
```

- [ ] **Step 3: Запустить dev и проверить**

```bash
mise exec -- pnpm dev &
DEV_PID=$!
sleep 15

# Проверки
curl -sI http://localhost:3000/ | head -3
curl -sI http://localhost:3000/catalog | head -3

# Открыть в браузере http://localhost:3000 руками — посмотреть, что:
# - Главная рендерится
# - Карусель товаров загружается с новой БД (2 товара)
# - Каталог работает
# - Картинки открываются (через https://db.flormajor-omsk.ru/storage/v1/object/public/media/...)

kill $DEV_PID
```

- [ ] **Step 4: Проверить админку**

Открыть `http://localhost:3000/admin/login`, войти под `owner@flormajor-omsk.ru` + пароль.
- Дашборд: видны 2 товара.
- Раздел «Товары»: показываются товары.
- Раздел «Контакты»: показываются контакты.
- Открытие `/admin/leads`: 404.
- Открытие `/admin/thanks`: 404.

- [ ] **Step 5: Если всё работает — оставить новый `.env.local`**

Не возвращать backup — он понадобится в Task 6.5 как fallback при rollback.

---

## Phase 6 — Cutover (10–20 мин даунтайма)

### Task 6.1: Pre-flight checklist перед окном

- [ ] **Step 1: Подтвердить готовность**

- [ ] Phases 1–5 пройдены без ошибок.
- [ ] Локальный smoke-тест с новой БД проходит.
- [ ] Backup `.env.local.cloud-backup` существует.
- [ ] Новый админ умеет логиниться.
- [ ] Storage отдаёт картинки.

- [ ] **Step 2: Снизить TTL DNS заранее (если домен `flormajor-omsk.ru` мигрирует тоже)**

Если в будущем планируется менять DNS публичного сайта — TTL до 60 с. Сейчас публичный домен в Onreza, DNS не меняется. **Пропустить.**

---

### Task 6.2: Включить maintenance в Cloud

- [ ] **Step 1: Включить maintenance flag**

В Cloud Studio (`https://supabase.com/dashboard/project/gaojqaqpreuvcwxmngqp/editor`):
SQL Editor:
```sql
UPDATE public.site_settings SET maintenance_mode = true WHERE id = 1;
```

`proxy.ts` приложения сразу подхватит (revalidate 30 с в кэше) и публичный сайт начнёт показывать `/maintenance`.

> **Альтернатива через REST** (если Cloud Studio неудобно):
> ```bash
> source .env.local.cloud-backup
> curl -X PATCH "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_settings?id=eq.1" \
>   -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
>   -H "Content-Type: application/json" \
>   -H "Prefer: return=minimal" \
>   -d '{"maintenance_mode": true}'
> ```

- [ ] **Step 2: Проверить, что публичный сайт показывает /maintenance**

Открыть `https://flormajor-omsk.ru/` — должна быть страница maintenance.

- [ ] **Step 3: Засечь время**

Это **t+0**. С этой точки даунтайм считается.

---

### Task 6.3: Финальный delta-sync данных (опционально)

> **Цель:** взять последние изменения, которые могли быть внесены в Cloud между Phase 2 (первичный дамп) и Phase 6 (cutover). Если между ними никто не редактировал админку — пропустить.

- [ ] **Step 1: Wipe public data на новой БД**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c "
TRUNCATE public.products, public.product_images, public.categories,
         public.contact_info, public.site_settings, public.theme_settings,
         public.hero_settings, public.nav_items, public.features,
         public.social_links, public.footer_config, public.typography_settings,
         public.catalog_page_settings, public.product_page_settings,
         public.landing_section_styles RESTART IDENTITY CASCADE;
"'
```

> **Не TRUNCATE `auth.users` или `admin_users`** — там уже наш новый админ.

- [ ] **Step 2: Прогнать `dump-cloud-data.sh` ещё раз**

Run:
```bash
ssh flor-server 'bash /opt/cutover/dump-cloud-data.sh && cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /opt/cutover/cloud-data.sql 2>&1 | tail -10'
```

- [ ] **Step 3: Аналогично прогнать copy-storage.sh для дельты**

Run:
```bash
ssh flor-server 'bash /opt/cutover/copy-storage.sh && bash <(cat <<EOF
ssh flor-server "cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1" < /opt/cutover/cloud-storage.sql
EOF
)'
```

> Если объём данных тривиальный (наш случай) — Phases 6.3 можно пропустить и положиться на Phase 2 (была за 5 минут до cutover).

---

### Task 6.4: Замена env в Onreza и деплой

**Files:** Onreza web-кабинет / CLI

- [ ] **Step 1: Открыть проект `flor-major` в Onreza**

URL: `https://onreza.ru/dashboard/projects/<id>/env` (или через CLI `nrz env list`).

- [ ] **Step 2: Заменить переменные**

Старые (Cloud) → новые (self-hosted):
```
NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=<значение ANON_KEY из ~/.flormajor/secrets.env>
SUPABASE_SERVICE_ROLE_KEY=<значение SERVICE_ROLE_KEY из ~/.flormajor/secrets.env>
```

> Если в Onreza есть `SUPABASE_PROJECT_REF` (для `pnpm types:generate`) — оставить пустым, он не используется в рантайме.

- [ ] **Step 3: Триггер деплой**

Onreza автоматически передеплоит при изменении env. Если нет — кнопка «Deploy».

- [ ] **Step 4: Дождаться завершения деплоя**

Проверить статус в Onreza-кабинете (~1–3 минуты).

---

### Task 6.5: Smoke-тест публичного сайта

- [ ] **Step 1: Главная**

```bash
curl -sI https://flormajor-omsk.ru/ | head -5
```
Expected: 200 OK (страница maintenance уже снята, потому что новая БД работает с другим maintenance_mode flag — он был дефолтным `false`).

> **Подождите!** У нас в новой БД `site_settings.maintenance_mode` сейчас `false` (изначальное значение из Cloud-дампа). Старый Cloud имеет `true`. После замены env приложение читает новую БД → maintenance off, сайт сразу live. Это правильное поведение.

- [ ] **Step 2: Проверить ключевые страницы**

Открыть в браузере:
- [ ] `https://flormajor-omsk.ru/` — Hero, карусель, контактная секция (без формы).
- [ ] `https://flormajor-omsk.ru/catalog` — оба товара.
- [ ] `https://flormajor-omsk.ru/catalog/<slug>` — карточка товара, картинки.
- [ ] `https://flormajor-omsk.ru/admin/login` — вход новым паролем.
- [ ] Админка: правка товара → сохранение → видно на публичной странице.
- [ ] Загрузка нового изображения через админку.

- [ ] **Step 3: Если всё хорошо — засечь время cutover**

Записать `t+N мин` — фактический даунтайм.

---

### Task 6.6: Cleanup

- [ ] **Step 1: Удалить cloud.env с сервера**

```bash
ssh flor-server 'shred -u /opt/cutover/cloud.env && ls /opt/cutover/'
```

- [ ] **Step 2: Удалить supabase-cloud remote из rclone (на сервере)**

```bash
ssh flor-server 'sed -i "/^\[supabase-cloud\]/,/^$/d" ~/.config/rclone/rclone.conf'
```

- [ ] **Step 3: Удалить дампы**

```bash
ssh flor-server 'rm -f /opt/cutover/cloud-schema.sql /opt/cutover/cloud-data.sql /opt/cutover/cloud-storage.sql'
```

- [ ] **Step 4: Backup `.env.local.cloud-backup` сохранить локально (нужен для rollback в течение 7 дней)**

---

## Phase 7 — Post-cutover

### Task 7.1: Сохранить `cloud-backup` папку у владельца

- [ ] **Step 1: Перенести `.env.local.cloud-backup` в долговременное хранение**

Например:
```bash
mkdir -p ~/.flormajor/rollback-2026-05-02
mv .env.local.cloud-backup ~/.flormajor/rollback-2026-05-02/.env.local
echo "Rollback период: до 2026-05-09 (7 дней)" > ~/.flormajor/rollback-2026-05-02/README.txt
```

### Task 7.2: 7-дневный мониторинг

- [ ] **Каждый день первую неделю:**
  - [ ] Проверить, что бэкап в Timeweb S3 за последние 6 ч есть: `ssh flor-server 'rclone ls timeweb-s3:flor-backups | tail -5'`.
  - [ ] Проверить что сервисы живы: `ssh flor-server 'cd /opt/supabase/docker && docker compose ps'`.
  - [ ] Проверить, что публичный сайт открывается: `curl -sI https://flormajor-omsk.ru/ | head -3`.
  - [ ] Проверить логи fail2ban на бан-всплески: `ssh flor-server 'sudo fail2ban-client status sshd | grep "Total banned"'`.

### Task 7.3: На 8-й день — окончательное удаление старого Cloud

- [ ] **Step 1: Подтвердить отсутствие необходимости отката**

Если за 7 дней не было желания откатиться — продолжаем.

- [ ] **Step 2: Удалить проект Supabase Cloud**

В кабинете `https://supabase.com/dashboard/project/gaojqaqpreuvcwxmngqp` → Settings → General → Pause project (на пару дней) → потом Delete project.

> Альтернатива: оставить paused (без оплаты) на полгода — на крайний случай.

- [ ] **Step 3: Удалить локальные backup-креды**

```bash
shred -u ~/.flormajor/rollback-2026-05-02/.env.local
rmdir ~/.flormajor/rollback-2026-05-02
```

- [ ] **Step 4: Проверить, что в Onreza не осталось старых TELEGRAM/RATE_LIMIT env**

Эти переменные были помечены к удалению в плане B § 13.1, но если ещё лежат — удалить.

---

## Definition of Done

- [ ] `https://flormajor-omsk.ru/` отдаёт контент с новой БД (Cloud env заменён).
- [ ] Публичный сайт работает без формы лидов и без `/thanks` (404).
- [ ] Админка доступна, новый владелец логинится по новой паре email/password.
- [ ] Все 7 healthy сервисов на сервере, ~1.2 ГБ RAM used.
- [ ] Бэкапы каждые 6 ч продолжают работать.
- [ ] Старый Cloud в paused state (или удалён, если прошло 7 дней).
- [ ] `lib/database.types.ts` регенерирован против новой БД (без `leads`/`thanks_page_settings` типов).
- [ ] Креды Cloud удалены с сервера.

---

## Откат (если что-то пошло не так в течение 7 дней)

1. В Onreza вернуть env из `~/.flormajor/rollback-2026-05-02/.env.local`.
2. Триггер деплой.
3. В Cloud Studio: `UPDATE site_settings SET maintenance_mode = false;`.
4. Готово — сайт снова работает на Cloud, задержка ~5 минут.

После отката — разобраться что не так в self-hosted, исправить, повторить cutover (Phase 6) когда готово.

---

## Что НЕ делается в этом плане

- Юр-документы (политика ПД на `/privacy`, приказ, положение) — отдельным треком после cutover (см. spec § 6).
- Self-hosted шрифты (см. memory `followup_self_hosted_fonts.md`) — отдельный PR.
- Сжатие картинок (см. memory `followup_image_compression.md`) — отдельный PR.
- 4 оставшихся P0-бага из аудита (A1.1, A1.2, A3.1, A3.3) — отдельным PR.
- Offsite-зеркало бэкапов в Selectel — через 2–3 месяца если будет ощущение «один провайдер мало» (см. spec § 6).
